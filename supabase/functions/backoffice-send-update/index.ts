// supabase/functions/backoffice-send-update/index.ts
//
// Envía una versión de firmware a un equipo o a todos, desde el backoffice.
//
// La sesión de quien llama autoriza el envío: las RPC admin_send_update y
// admin_send_update_all comprueban que sea la cuenta de soporte y crean las
// asignaciones y sus avisos. La clave de servicio sólo se usa después, para
// despertar a send-push-alert, igual que request-device-access.
//
// Cuerpo: { release_id, device_id } para un equipo, { release_id, all: true }
// para todos. Un fallo del despacho no deshace el envío: los avisos quedan en
// la cola y la app los muestra al abrirse.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function dispatch(url: string, serviceKey: string, alertIds: string[]): Promise<number> {
  let failed = 0;
  // De a cinco en paralelo: send-push-alert agrupa en Expo por alerta.
  for (let i = 0; i < alertIds.length; i += 5) {
    const results = await Promise.allSettled(
      alertIds.slice(i, i + 5).map((id) =>
        fetch(`${url}/functions/v1/send-push-alert`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert_id: id }),
          signal: AbortSignal.timeout(8000),
        }),
      ),
    );
    failed += results.filter((r) => r.status === 'rejected' || !r.value.ok).length;
  }
  return failed;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ message: 'Método no permitido.' }, 405);
  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ message: 'Operación no permitida.' }, 401);

  let body: { release_id?: unknown; device_id?: unknown; all?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ message: 'Solicitud inválida.' }, 400);
  }
  const releaseId = String(body.release_id ?? '');
  const deviceId = String(body.device_id ?? '');
  const all = body.all === true;
  if (!UUID.test(releaseId) || (!all && !UUID.test(deviceId))) {
    return json({ message: 'Solicitud inválida.' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  let alertIds: string[];
  let skipped = 0;
  if (all) {
    const { data, error } = await caller.rpc('admin_send_update_all', { p_release_id: releaseId });
    if (error) return json({ code: error.code, message: error.message }, 400);
    alertIds = (data?.alert_ids ?? []) as string[];
    skipped = Number(data?.skipped ?? 0);
  } else {
    const { data, error } = await caller.rpc('admin_send_update', { p_device_id: deviceId, p_release_id: releaseId });
    if (error) return json({ code: error.code, message: error.message }, 400);
    alertIds = data ? [String(data)] : [];
  }

  const undelivered = await dispatch(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, alertIds);
  if (undelivered > 0) console.error(`backoffice-send-update: ${undelivered} avisos quedan en la cola`);

  return json({ sent: alertIds.length, skipped, queued: undelivered });
});
