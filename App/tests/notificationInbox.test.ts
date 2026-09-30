import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';

type Rpc = { name: string; args: Record<string, unknown> };
const calls: Rpc[] = [];
let reply: { data: unknown; error: unknown } = { data: [], error: null };
const require = createRequire(import.meta.url);
const loader = Module as unknown as { _load: (id: string, ...args: unknown[]) => unknown };
const original = loader._load;
loader._load = (id, ...args) => {
  if (id === './supabase') return { supabase: { rpc: async (name: string, params: Record<string, unknown>) => { calls.push({ name, args: params }); return reply; } } };
  return original.call(Module, id, ...args);
};
let inbox: typeof import('../src/services/notificationInbox');
try { inbox = require('../src/services/notificationInbox'); } finally { loader._load = original; }

const row = (n: number, event = 'access_request', status = 'active') => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, event_type: event, title: 't', body: 'b', device_id: null,
  created_at: new Date(Date.UTC(2026, 8, 29, 12, 0, 60 - n)).toISOString(), read_at: null, status,
});

test('la primera página no envía cursor y pide el tamaño de página acordado', async () => {
  calls.length = 0;
  reply = { data: [row(1)], error: null };
  const page = await inbox.listMyNotifications();
  assert.deepEqual(calls[0], { name: 'list_my_notifications', args: { p_limit: 30, p_before: null, p_before_id: null } });
  assert.equal(page.rows.length, 1);
  assert.equal(page.hasMore, false);
});

test('la paginación usa el cursor (created_at, id) del último elemento', async () => {
  calls.length = 0;
  const full = Array.from({ length: 30 }, (_, index) => row(index + 1));
  reply = { data: full, error: null };
  const page = await inbox.listMyNotifications();
  assert.equal(page.hasMore, true);
  await inbox.listMyNotifications(page.rows[page.rows.length - 1]);
  assert.equal(calls[1].args.p_before, full[29].created_at);
  assert.equal(calls[1].args.p_before_id, full[29].id);
});

test('eventos desconocidos se descartan sin cortar la paginación', async () => {
  const mixed = Array.from({ length: 30 }, (_, index) => row(index + 1, index === 29 ? 'critical_soil' : 'access_approved'));
  reply = { data: mixed, error: null };
  const page = await inbox.listMyNotifications();
  assert.equal(page.rows.length, 29);
  assert.equal(page.hasMore, true);
});

test('errores del servidor se propagan y un aviso ajeno no devuelve fila', async () => {
  reply = { data: null, error: new Error('Network request failed') };
  await assert.rejects(inbox.listMyNotifications(), /Network request failed/);
  await assert.rejects(inbox.getMyNotification(row(1).id), /Network request failed/);
  reply = { data: [], error: null };
  assert.equal(await inbox.getMyNotification(row(1).id), null, 'otra cuenta: el servidor no devuelve la fila');
  reply = { data: [row(2, 'weather_risk')], error: null };
  assert.equal(await inbox.getMyNotification(row(2).id), null, 'un evento retirado no se abre');
  reply = { data: [row(3, 'access_approved', 'cancelled')], error: null };
  assert.equal((await inbox.getMyNotification(row(3).id))?.status, 'cancelled');
});

test('marcar como leído llama al servidor por aviso y propaga el rechazo', async () => {
  calls.length = 0;
  reply = { data: null, error: null };
  await inbox.markNotificationRead(row(1).id);
  assert.deepEqual(calls[0], { name: 'mark_notification_read', args: { p_alert_id: row(1).id } });
  reply = { data: null, error: Object.assign(new Error('Aviso no disponible.'), { code: '42501' }) };
  await assert.rejects(inbox.markNotificationRead(row(1).id), /no disponible/);
});
