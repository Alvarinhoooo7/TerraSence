import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHealth } from './check-health.mjs';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_test' };
const noWait = async () => {};
const healthy = url => new Response(JSON.stringify(
  url.pathname.startsWith('/auth/') ? { version: 'test' } : [],
));

test('consulta Auth y una tabla con clave pública; acepta lectura vacía bajo RLS', async () => {
  const paths = [];
  await checkHealth(env, async (url, options) => {
    paths.push(url.pathname);
    assert.equal(options.headers.apikey, env.SUPABASE_ANON_KEY);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, 'error');
    if (url.pathname.startsWith('/rest/')) assert.equal(url.search, '?select=id&limit=1');
    return healthy(url);
  }, noWait);
  assert.deepEqual(paths, ['/auth/v1/health', '/rest/v1/firmware_releases']);
});

test('reintenta fallas transitorias de la base', async () => {
  let attempts = 0;
  await checkHealth(env, async url => {
    if (url.pathname.startsWith('/rest/') && ++attempts < 3) return new Response('', { status: 503 });
    return healthy(url);
  }, noWait);
  assert.equal(attempts, 3);
});

test('un fallo de Auth no impide comprobar la base y termina con error', async () => {
  let databaseChecked = false;
  await assert.rejects(checkHealth(env, async url => {
    if (url.pathname.startsWith('/auth/')) return new Response('', { status: 401 });
    databaseChecked = true;
    return healthy(url);
  }, noWait), /Auth: HTTP 401/);
  assert.ok(databaseChecked);
});

test('no acepta HTTP 200 con un cuerpo incorrecto como base saludable', async () => {
  await assert.rejects(checkHealth(env, async url => url.pathname.startsWith('/rest/')
    ? new Response('{"error":"unexpected"}') : healthy(url), noWait), /Base de datos: respuesta inesperada/);
});

test('rechaza configuración ausente y claves privilegiadas antes de enviar solicitudes', async () => {
  const unexpectedFetch = () => assert.fail('No debe enviar solicitudes');
  await assert.rejects(checkHealth({}, unexpectedFetch), /Faltan/);
  for (const key of ['sb_secret_test', `e30.${Buffer.from('{"role":"service_role"}').toString('base64url')}.test`]) {
    await assert.rejects(checkHealth({ ...env, SUPABASE_ANON_KEY: key }, unexpectedFetch), /clave pública/);
  }
});

test('admite la clave anon JWT con Authorization', async () => {
  const key = `e30.${Buffer.from('{"role":"anon"}').toString('base64url')}.test`;
  await checkHealth({ ...env, SUPABASE_ANON_KEY: key }, async (url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${key}`);
    return healthy(url);
  }, noWait);
});
