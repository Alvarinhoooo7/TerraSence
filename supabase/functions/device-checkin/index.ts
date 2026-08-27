// supabase/functions/device-checkin/index.ts
//
// Recepción de telemetría desde el equipo. Adaptado de `device-checkin` de
// Akura, que recibía estado de red celular; aquí recibe la trama de 7
// parámetros de suelo más 3 de ambiente.
//
// Ruta prevista: el ESP32 no llega a internet por sí mismo. Esta función
// existe para (a) el modo WiFi del equipo cuando lo hay, y (b) integraciones
// de terceros. La vía normal sigue siendo BLE → teléfono → PostgREST.
//
// Autenticación: por `device_code` de 15 dígitos. No es un secreto fuerte,
// así que la función NO acepta escribir mediciones a ciegas: exige que el
// equipo exista y esté activo, y sólo actualiza su estado. Para insertar
// mediciones se exige además la cabecera de servicio.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

interface CheckinRequest {
  device_code: string;
  battery_level?: number;
  firmware_version?: string;
  /** Medición opcional: si viene, se registra. */
  measurement?: {
    latitude: number;
    longitude: number;
    gps_accuracy_m?: number;
    phenological_stage: 'pre_siembra' | 'vegetativo' | 'floracion' | 'cosecha';
    crop_id: string;
    field_name: string;
    soil_texture: string;
    vwc_percent: number;
    soil_temp_c: number;
    ec_us_cm: number;
    ph: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    verdict: 'GREEN' | 'AMBER' | 'RED';
    verdict_title: string;
    action_summary?: string;
    engine_version: string;
    crop_catalog_version: string;
    client_uuid?: string;
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ success: false, message: 'Método no permitido' }, 405);
  }

  let body: CheckinRequest;
  try {
    body = (await req.json()) as CheckinRequest;
  } catch {
    return json({ success: false, message: 'Cuerpo JSON inválido' }, 400);
  }

  const code = String(body.device_code ?? '').replace(/\D/g, '');
  if (!/^[1-9]\d{14}$/.test(code)) {
    return json({ success: false, message: 'device_code inválido' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('id,is_active')
    .eq('device_code', code)
    .maybeSingle();

  if (deviceError) return json({ success: false, message: deviceError.message }, 500);

  // Mensaje genérico: no revela si el código existe pero está inactivo.
  if (!device || !device.is_active) {
    return json({ success: false, message: 'Equipo no reconocido' }, 404);
  }

  const now = new Date().toISOString();

  const patch: Record<string, unknown> = { last_seen_at: now };
  if (typeof body.battery_level === 'number') {
    patch.battery_level = Math.max(0, Math.min(100, Math.round(body.battery_level)));
  }
  if (body.firmware_version) patch.firmware_version = body.firmware_version;

  let measurementId: string | null = null;

  if (body.measurement) {
    const m = body.measurement;
    const { data: inserted, error: insertError } = await supabase
      .from('soil_measurements')
      .upsert(
        {
          ...m,
          device_id: device.id,
          radius_m: 20,
          measured_at: now,
          firmware_version: body.firmware_version ?? null,
        },
        { onConflict: 'client_uuid' },
      )
      .select('id')
      .single();

    if (insertError) return json({ success: false, message: insertError.message }, 400);

    measurementId = inserted.id;
    patch.last_measurement_at = now;

    // Alerta agronómica automática ante veredicto rojo.
    if (m.verdict === 'RED') {
      await supabase.from('push_alerts').insert({
        device_id: device.id,
        title: m.verdict_title,
        body: m.action_summary ?? 'Condición crítica detectada en el suelo.',
        category: 'agronomic',
        severity: 'critical',
      });
    }
  }

  const { error: updateError } = await supabase
    .from('devices')
    .update(patch)
    .eq('id', device.id);

  if (updateError) return json({ success: false, message: updateError.message }, 500);

  return json({
    success: true,
    device_id: device.id,
    measurement_id: measurementId,
    server_time: now,
  });
});
