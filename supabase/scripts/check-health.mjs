import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export async function checkHealth(env = process.env, fetchImpl = fetch, wait = delay) {
  const url = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY.');

  const base = new URL(url);
  if (base.protocol !== 'https:' || base.username || base.password ||
      base.pathname !== '/' || base.search || base.hash) {
    throw new Error('SUPABASE_URL debe ser un origen HTTPS sin credenciales, ruta ni parámetros.');
  }
  // Solo clave pública: esta comprobación nunca necesita permisos de servicio.
  let role;
  try {
    role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role;
  } catch { /* Las claves publishable no son JWT. */ }
  if (!key.startsWith('sb_publishable_') && role !== 'anon') {
    throw new Error('Usa una clave pública anon o publishable, nunca service_role ni secret.');
  }

  const headers = { apikey: key, Accept: 'application/json' };
  if (role === 'anon') headers.Authorization = `Bearer ${key}`;

  const checks = [
    { name: 'Auth', path: '/auth/v1/health', valid: data =>
      data && typeof data === 'object' && typeof data.version === 'string' },
    // Una lectura real vía PostgREST. RLS sigue activo; [] es una respuesta válida.
    { name: 'Base de datos', path: '/rest/v1/firmware_releases?select=id&limit=1',
      valid: data => Array.isArray(data) && data.length <= 1 &&
        data.every(row => row && typeof row.id === 'string') },
  ];
  const failures = [];
  for (const check of checks) {
    let failure;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetchImpl(new URL(check.path, base), {
          headers, signal: AbortSignal.timeout(20_000), redirect: 'error',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!check.valid(await response.json())) throw new Error('respuesta inesperada');
        console.log(`${check.name}: OK`);
        failure = undefined;
        break;
      } catch (error) {
        // No registrar cuerpos ni cabeceras: pueden incluir información privada.
        failure = /^HTTP \d+$|^respuesta inesperada$/.test(error.message)
          ? error.message : 'error de conexión, tiempo de espera o JSON inválido';
        if (attempt < 3) await wait(5_000);
      }
    }
    if (failure) failures.push(`${check.name}: ${failure}`);
  }
  if (failures.length) throw new Error(failures.join('; '));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkHealth().catch(error => {
    console.error(`Comprobación fallida: ${error.message}`);
    process.exitCode = 1;
  });
}
