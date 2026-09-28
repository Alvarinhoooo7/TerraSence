import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeProbeStatus } from '../src/services/probeService';
import { CONTACT_MAX_AGE_MS, mergeContact, type ProbeContact } from '../src/utils/contactQueue';

test('la característica de estado entrega batería y versión', () => {
  assert.deepEqual(decodeProbeStatus(new Uint8Array([87, 1, 2, 3])), { battery: 87, firmwareVersion: '1.2.3' });
});

test('0xFF o un valor fuera de rango es batería sin dato, no un número inventado', () => {
  assert.equal(decodeProbeStatus(new Uint8Array([0xff, 1, 0, 0])).battery, null);
  assert.equal(decodeProbeStatus(new Uint8Array([150, 1, 0, 0])).battery, null);
});

test('una característica incompleta no inventa la versión', () => {
  assert.deepEqual(decodeProbeStatus(new Uint8Array([40])), { battery: 40, firmwareVersion: null });
  assert.deepEqual(decodeProbeStatus(new Uint8Array([])), { battery: null, firmwareVersion: null });
});

const now = Date.parse('2026-09-28T12:00:00Z');
const contact = (deviceCode: string, hoursAgo: number, battery = 50): ProbeContact => ({
  deviceCode,
  battery,
  firmwareVersion: '1.0.0',
  at: new Date(now - hoursAgo * 3_600_000).toISOString(),
});

test('la cola guarda por equipo sólo el contacto más antiguo y el más reciente', () => {
  let queue: ProbeContact[] = [];
  for (const h of [30, 20, 10, 1]) queue = mergeContact(queue, contact('482139057416628', h, 100 - h), now);
  queue = mergeContact(queue, contact('482139057416629', 5), now);
  const a = queue.filter((c) => c.deviceCode === '482139057416628');
  assert.equal(a.length, 2);
  assert.equal(a[0]!.at, contact('x', 30).at);
  assert.equal(a[1]!.battery, 99);
  assert.equal(queue.filter((c) => c.deviceCode === '482139057416629').length, 1);
});

test('un contacto de hace más de una semana se descarta', () => {
  const old = { ...contact('482139057416628', 0), at: new Date(now - CONTACT_MAX_AGE_MS - 1000).toISOString() };
  assert.deepEqual(mergeContact([old], contact('482139057416628', 1), now).map((c) => c.at), [contact('x', 1).at]);
});
