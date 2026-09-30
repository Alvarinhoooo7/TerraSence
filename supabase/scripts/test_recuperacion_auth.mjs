// Integración HTTP contra Auth/PostgREST LOCAL; crea y elimina sólo sus usuarios.
// Desde la raíz: node supabase/scripts/test_recuperacion_auth.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const cli = process.platform === 'win32' ? 'supabase.exe' : 'supabase';
const config = JSON.parse(execFileSync(cli, ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const url = new URL(config.API_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Esta prueba sólo admite Supabase local.');
const created = [];
async function api(path, { method = 'POST', token = config.SERVICE_ROLE_KEY, body, ok = true } = {}) {
  const response = await fetch(new URL(path, url), {
    method, headers: { apikey: config.ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (ok) assert.ok(response.ok, `${path}: HTTP ${response.status} (${data?.code ?? data?.error_code ?? 'sin código'})`);
  return { status: response.status, data };
}
async function user(password) {
  const email = `recuperacion-${randomUUID()}@example.com`;
  const { data } = await api('/auth/v1/admin/users', { body: { email, password, email_confirm: true } });
  created.push(data.id);
  return { id: data.id, email, password };
}
async function login(account, password = account.password) {
  return (await api('/auth/v1/token?grant_type=password', { token: config.ANON_KEY, body: { email: account.email, password } })).data;
}
async function register(session, installation = randomUUID(), ok = true) {
  return api('/rest/v1/rpc/register_push_installation', {
    token: session.access_token, ok, body: { p_installation_id: installation,
      p_installation_secret: installation.replaceAll('-', '').repeat(2),
      p_expo_push_token: `ExpoPushToken[test_${installation.replaceAll('-', '')}]`,
      p_platform: 'android', p_permission: 'granted' },
  });
}

try {
  const account = await user('ñáéíó123!');
  const other = await user(`Otra-${randomUUID()}!9`);
  const a = await login(account);
  const b = await login(account);
  const unrelated = await login(other);
  await register(a);
  await register(b);
  await register(unrelated);
  console.log('OK: Auth acepta contraseña con letras Unicode y dos sesiones con push.');

  await Promise.all([
    register(b, randomUUID(), false),
    api('/rest/v1/rpc/revoke_push_for_password_recovery', { token: a.access_token, body: {} }),
    register(b, randomUUID(), false),
  ]);
  const newPassword = 'ñáéíó١٢٣!🌱';
  await api('/auth/v1/user', { method: 'PUT', token: a.access_token, body: { password: newPassword } });
  const installations = (await api(`/rest/v1/push_installations?user_id=eq.${account.id}&select=revoked_at,expo_push_token`, { method: 'GET' })).data;
  assert.ok(installations.length >= 2);
  assert.ok(installations.every(row => row.revoked_at && !row.expo_push_token));
  assert.ok((await register(b, randomUUID(), false)).status >= 400, 'JWT anterior no debe registrar push.');
  await api('/auth/v1/logout?scope=global', { token: a.access_token });
  for (const session of [a, b]) {
    const refreshed = await api('/auth/v1/token?grant_type=refresh_token', {
      token: config.ANON_KEY, body: { refresh_token: session.refresh_token }, ok: false,
    });
    assert.ok(refreshed.status >= 400, 'No se debe renovar una sesión cerrada.');
    assert.ok((await register(session, randomUUID(), false)).status >= 400);
  }
  console.log('OK: cierre global revoca ambas sesiones y bloquea re-registro con sus JWT.');

  await register(unrelated);
  const renewed = await login(account, newPassword);
  await register(renewed);
  console.log('OK: otra cuenta conserva push y el nuevo inicio de sesión puede registrarlo.');

  const c = await login(account, newPassword);
  await api('/auth/v1/logout?scope=local', { token: c.access_token });
  await register(renewed);
  assert.ok((await register(c, randomUUID(), false)).status >= 400);
  console.log('OK: cierre local no revoca la otra sesión.');
} finally {
  let cleanupFailed = false;
  for (const id of created) {
    try { await api(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }); }
    catch { cleanupFailed = true; console.error('No se pudo eliminar un usuario temporal de la réplica local.'); }
  }
  if (cleanupFailed) process.exitCode = 1;
  else console.log('Limpieza: usuarios temporales eliminados.');
}
