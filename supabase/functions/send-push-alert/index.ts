import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { dispatchPush } from './dispatch.mjs';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return json({ success: false, message: 'Método no permitido.' }, 405);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey || request.headers.get('authorization') !== `Bearer ${serviceKey}`) {
    return json({ success: false, message: 'No autorizado.' }, 401);
  }
  const client = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { persistSession: false },
  });
  let limit = 50;
  try {
    const payload = await request.json();
    if (Number.isInteger(payload?.limit)) limit = Math.min(Math.max(payload.limit, 1), 100);
  } catch { /* El cron envía un cuerpo vacío. */ }
  try {
    const result = await dispatchPush(client, fetch, {
      limit,
      expoAccessToken: Deno.env.get('EXPO_ACCESS_TOKEN') ?? undefined,
    });
    return json({ success: true, ...result });
  } catch (error) {
    console.error('Falló el despachador:', error);
    return json({ success: false, message: 'No se pudo despachar.' }, 500);
  }
});
