import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

// La sesión del solicitante autoriza el RPC. La clave de servicio se utiliza
// únicamente para despertar el despachador una vez confirmada la solicitud.
Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  if (req.method !== 'POST') return json({ message: 'Método no permitido.' }, 405);
  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ message: 'Autenticación requerida.' }, 401);
  let token: string;
  try {
    token = (await req.json()).token;
    if (typeof token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) throw new Error();
  } catch { return json({ message: 'QR inválido.' }, 400); }
  const url = Deno.env.get('SUPABASE_URL')!;
  const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: identity, error: authError } = await client.auth.getUser();
  if (authError || !identity.user) return json({ message: 'Sesión no válida.' }, 401);
  const { data, error } = await client.rpc('join_device_by_invite', { p_token: token });
  if (error) return json({ message: error.message }, 400);
  const result = data?.[0];
  if (!result) return json({ message: 'No se pudo solicitar acceso.' }, 400);
  if (result.alert_id) {
    // Un fallo de Expo no deshace la solicitud: la alerta queda en la cola.
    try {
      const response = await fetch(`${url}/functions/v1/send-push-alert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: result.alert_id }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) console.error('No se pudo despachar la alerta de acceso:', response.status);
    } catch { console.error('La alerta de acceso queda pendiente de despacho.'); }
  }
  const { alert_id: _alert, ...membership } = result;
  return json(membership);
});
