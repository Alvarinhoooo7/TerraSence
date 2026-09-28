// supabase/functions/backoffice-recover/index.ts
//
// «Recuperar acceso» del backoffice. Envía el código de recuperación SÓLO si
// el correo es la cuenta de soporte, y responde exactamente lo mismo en
// cualquier caso: así la web no le manda correos a nadie más ni revela qué
// cuenta sirve.
//
// La respuesta sale antes del envío (EdgeRuntime.waitUntil): si esperara al
// correo, la cuenta de soporte tardaría visiblemente más que cualquier otra y
// el tiempo de respuesta delataría cuál es.
//
// Pública a propósito (verify_jwt = false en config.toml): la llama alguien
// que no tiene sesión. La decisión la toma is_backoffice_email(), que sólo
// puede ejecutar la clave de servicio.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const reply = (status = 200) =>
  new Response(status === 200 ? JSON.stringify({ ok: true }) : null, {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function sendIfBackoffice(email: string): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data, error } = await service.rpc('is_backoffice_email', { p_email: email });
  if (error) {
    console.error('backoffice-recover: no se pudo verificar el correo:', error.code);
    return;
  }
  if (data !== true) return;

  // Con la clave pública, igual que la app: GoTrue aplica su límite por correo
  // y la plantilla de recuperación con el código de 6 dígitos.
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
  });
  const { error: sendError } = await anon.auth.resetPasswordForEmail(email);
  if (sendError) console.error('backoffice-recover: el envío falló:', sendError.status);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return reply(405);

  let email = '';
  try {
    email = String((await req.json())?.email ?? '').trim().toLowerCase();
  } catch {
    /* Cuerpo inválido: misma respuesta que un correo desconocido. */
  }

  if (email.length <= 254 && EMAIL.test(email)) {
    const task = sendIfBackoffice(email).catch(() =>
      console.error('backoffice-recover: error inesperado'),
    );
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
    else await task;
  }

  return reply();
});
