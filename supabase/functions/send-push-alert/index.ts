// supabase/functions/send-push-alert/index.ts
//
// Despacho de alertas agronómicas al teléfono vía Expo Push.
// Adaptado de `send-push-alert` de Akura.
//
// `device-checkin` GENERA la alerta en `push_alerts`; esta función la ENVÍA.
// Están separadas a propósito: el registro de la alerta no debe depender de
// que el envío funcione. Si Expo está caído, la alerta sigue existiendo y
// aparece en la app al abrirla.
//
// Invocación: por trigger de base de datos, por cron, o manualmente con el
// id de la alerta. Requiere el header `Authorization: Bearer <service_role key>`:
// no está pensada para clientes.
//
// AUDITORÍA 2026-08-30: el comentario ya prometía "requiere clave de
// servicio" pero el código nunca lo comprobaba — cualquiera con la clave
// `anon` pública podía invocar esta función y forzar el despacho inmediato
// de todas las alertas pendientes a discreción, sin límite. Corregido.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Payload {
  /** Si se omite, se despachan todas las alertas pendientes. */
  alert_id?: string;
  limit?: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high' | 'normal';
  data: Record<string, unknown>;
  channelId: 'agronomic' | 'device' | 'weather' | 'sync';
}

type NotificationCategory = 'agronomic' | 'device' | 'weather' | 'sync';

const categoryFor = (raw: unknown): NotificationCategory => {
  const category = String(raw ?? 'agronomic');
  return category === 'device' || category === 'weather' || category === 'sync'
    ? category
    : 'agronomic';
};

const preferenceAllows = (raw: unknown, category: NotificationCategory): boolean => {
  if (!raw || typeof raw !== 'object') return category !== 'sync';
  const notifications = (raw as { notifications?: unknown }).notifications;
  if (!notifications || typeof notifications !== 'object') return category !== 'sync';
  const value = (notifications as Record<string, unknown>)[category];
  return category === 'sync' ? value === true : value !== false;
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ success: false, message: 'Método no permitido' }, 405);
  }

  // El gateway acepta cualquier JWT válido (incluida la clave anon pública).
  // Esta función opera con service_role y puede leer perfiles/tokens de toda la
  // instalación, por lo que debe exigir explícitamente la clave de servicio.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('authorization');
  if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return json({ success: false, message: 'No autorizado' }, 401);
  }

  let payload: Payload = {};
  try {
    payload = (await req.json()) as Payload;
  } catch {
    // Cuerpo vacío es válido: significa "despacha lo pendiente".
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
  );

  // Sólo alertas no leídas: `is_read` hace de marca de despacho.
  let query = supabase
    .from('push_alerts')
    .select('id,title,body,severity,category,user_id,device_id')
    .eq('is_read', false)
    .order('created_at', { ascending: true })
    .limit(Math.min(payload.limit ?? 50, 100));

  if (payload.alert_id) query = query.eq('id', payload.alert_id);

  const { data: alerts, error } = await query;
  if (error) return json({ success: false, message: error.message }, 500);
  if (!alerts || alerts.length === 0) {
    return json({ success: true, sent: 0, message: 'No hay alertas pendientes' });
  }

  // Destinatarios: el usuario de la alerta, o todos los miembros del equipo.
  const messages: ExpoMessage[] = [];
  const dispatched: string[] = [];
  const skippedByPreference: string[] = [];

  for (const alert of alerts) {
    const userIds: string[] = [];

    if (alert.user_id) {
      userIds.push(alert.user_id);
    } else if (alert.device_id) {
      const { data: members } = await supabase
        .from('device_members')
        .select('user_id')
        .eq('device_id', alert.device_id)
        .eq('is_authorized', true);
      for (const m of members ?? []) userIds.push(m.user_id);
    }

    if (userIds.length === 0) continue;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,push_token,app_preferences')
      .in('id', userIds)
      .not('push_token', 'is', null);

    const category = categoryFor(alert.category);
    let eligible = 0;
    let considered = 0;
    let disabledByPreference = 0;
    for (const p of profiles ?? []) {
      if (!p.push_token) continue;
      considered += 1;
      if (!preferenceAllows(p.app_preferences, category)) {
        disabledByPreference += 1;
        continue;
      }
      eligible += 1;
      messages.push({
        to: p.push_token,
        title: alert.title,
        body: alert.body,
        sound: 'default',
        priority: alert.severity === 'critical' ? 'high' : 'normal',
        data: { alert_id: alert.id, category: alert.category, device_id: alert.device_id },
        channelId: category,
      });
    }
    if (eligible > 0) dispatched.push(alert.id);
    else if (considered > 0 && disabledByPreference === considered) {
      skippedByPreference.push(alert.id);
    }
  }

  if (messages.length === 0) {
    if (skippedByPreference.length > 0) {
      await supabase
        .from('push_alerts')
        .update({ is_read: true })
        .in('id', skippedByPreference);
    }
    return json({
      success: true,
      sent: 0,
      skipped_by_preference: skippedByPreference.length,
      message: 'Alertas sin destinatarios habilitados',
    });
  }

  // Expo acepta lotes de hasta 100 mensajes por petición.
  let sent = 0;
  const failures: string[] = [];

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
      else failures.push(`HTTP ${res.status}`);
    } catch (e) {
      failures.push(e instanceof Error ? e.message : String(e));
    }
  }

  // Sólo se marcan como despachadas si algo llegó a salir. Marcarlas siempre
  // haría que un fallo de Expo silenciara la alerta para siempre.
  if (sent > 0 && dispatched.length > 0) {
    await supabase.from('push_alerts').update({ is_read: true }).in('id', dispatched);
  }

  return json({
    success: failures.length === 0,
    sent,
    alerts: dispatched.length,
    failures: failures.length > 0 ? failures : undefined,
  });
});
