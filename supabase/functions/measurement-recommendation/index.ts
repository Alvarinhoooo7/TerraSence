import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

/** Contrato listo para proveedor. No envía datos a terceros mientras no se implemente el adaptador. */
Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method !== 'POST') return json({ message: 'Método no permitido.' }, 405);
  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ message: 'Autenticación requerida.' }, 401);
  let measurementId: string;
  try {
    const input = await req.json();
    if (input.version !== 1 || typeof input.measurementId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.measurementId)) throw new Error();
    measurementId = input.measurementId;
  } catch { return json({ message: 'Solicitud inválida.' }, 400); }
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: identity, error: authError } = await client.auth.getUser();
  if (authError || !identity.user) return json({ message: 'Sesión no válida.' }, 401);
  // RLS con la sesión del usuario; nunca utilizar service_role para esta consulta.
  const { data: measurement, error } = await client.from('soil_measurements')
    .select('id, phenological_stage, crop_id, soil_texture, diagnosis').eq('id', measurementId).maybeSingle();
  if (error) return json({ message: 'No se pudo consultar la lectura.' }, 503);
  if (!measurement) return json({ message: 'Lectura no disponible.' }, 404);
  // Futuro adaptador: tomar sólo el contexto persistido, validar respuesta y devolver
  // { version: 1, measurementId, presentation, source, generatedAt }.
  // Las claves del proveedor deben configurarse como secretos del servidor.
  return json({ version: 1, measurementId, code: 'PROVIDER_NOT_CONFIGURED', message: 'Se conserva el diagnóstico local.' }, 503);
});
