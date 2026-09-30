// supabase/functions/backoffice-send-update/index.ts
//
// Envía una versión de firmware a un equipo o a todos, desde el backoffice.
//
// La sesión de quien llama autoriza el envío: las RPC comprueban que sea la
// cuenta de soporte y crean asignaciones. La instalación OTA aún no está
// habilitada en la app, por lo que no se generan invitaciones push.
//
// Cuerpo: { release_id, device_id } para un equipo, { release_id, all: true }
// para todos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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

  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  let assigned = 0;
  let skipped = 0;
  if (all) {
    const { data, error } = await caller.rpc('admin_send_update_all', { p_release_id: releaseId });
    if (error) return json({ code: error.code, message: error.message }, 400);
    assigned = Number(data?.sent ?? 0);
    skipped = Number(data?.skipped ?? 0);
  } else {
    const { data, error } = await caller.rpc('admin_send_update', { p_device_id: deviceId, p_release_id: releaseId });
    if (error) return json({ code: error.code, message: error.message }, 400);
    assigned = data ? 1 : 0;
  }
  return json({ sent: assigned, skipped, queued: 0 });
});
