import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loader = Module as unknown as { _load: (id: string, ...args: unknown[]) => unknown };
const servicePath = require.resolve('../src/services/bleService');
const frame = Uint8Array.from([1, 94, 0, 245, 3, 232, 0, 65, 0, 45, 0, 30, 0, 80, 87, 1, 38, 82, 192, 125]);
const encoded = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const code = '000000000000001';

function harness() {
  let receive: ((error: Error | null, characteristic: { value: string } | null) => void) | undefined;
  let subscribed!: () => void;
  const ready = new Promise<void>(resolve => { subscribed = resolve; });
  const calls = { disconnected: 0, removed: 0, contacts: 0 };
  const device = {
    name: `TerraSense-${code}`, localName: null, manufacturerData: null,
    connect: async () => device,
    discoverAllServicesAndCharacteristics: async () => device,
    cancelConnection: async () => { calls.disconnected++; },
    readCharacteristicForService: async () => ({ value: encoded(Uint8Array.from([87, 1, 0, 0, 0])) }),
    monitorCharacteristicForService: (_service: string, _characteristic: string, listener: typeof receive) => {
      receive = listener;
      subscribed();
      return { remove: () => { calls.removed++; } };
    },
  };
  class Manager {
    state = async () => 'PoweredOn';
    startDeviceScan = async (_services: unknown, _options: unknown, callback: (error: null, found: typeof device) => void) => { callback(null, device); };
    stopDeviceScan = async () => undefined;
    cancelTransaction = async () => undefined;
  }
  const original = loader._load;
  delete require.cache[servicePath];
  loader._load = (id, ...args) => {
    if (id === 'react-native-ble-plx') return { BleManager: Manager };
    if (id === './contactService') return { recordProbeContact: async () => { calls.contacts++; } };
    return original(id, ...args);
  };
  let service: typeof import('../src/services/bleService');
  try { service = require(servicePath); }
  finally { loader._load = original; }
  return { service, calls, ready, receive: (value: string) => receive!(null, { value }), fail: () => receive!(new Error('disconnected'), null) };
}

test('el transporte entrega la captura completa y libera la conexión', async () => {
  const h = harness();
  const reading = h.service.readTelemetryOverBle(code);
  await h.ready;
  h.receive(encoded(frame));
  const data = await reading;
  assert.equal(data.vwc, 35);
  assert.equal(data.airTemp, 21.3);
  assert.deepEqual(h.calls, { disconnected: 1, removed: 1, contacts: 1 });
});

test('cancelar durante la espera descarta una notificación tardía y no registra contacto', async () => {
  const h = harness();
  const controller = new AbortController();
  const reading = h.service.readTelemetryOverBle(code, controller.signal);
  const rejection = assert.rejects(reading, /cancelada/);
  await h.ready;
  controller.abort();
  h.receive(encoded(frame));
  await rejection;
  assert.deepEqual(h.calls, { disconnected: 1, removed: 1, contacts: 0 });
});

test('cancelar antes de buscar no inicia una lectura BLE', async () => {
  const h = harness();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(h.service.readTelemetryOverBle(code, controller.signal), /cancelada/);
  assert.deepEqual(h.calls, { disconnected: 0, removed: 0, contacts: 0 });
});

test('un error nativo libera la conexión y no devuelve una medición', async () => {
  const h = harness();
  const reading = h.service.readTelemetryOverBle(code);
  const rejection = assert.rejects(reading, /Fallo de lectura BLE/);
  await h.ready;
  h.fail();
  await rejection;
  assert.deepEqual(h.calls, { disconnected: 1, removed: 1, contacts: 0 });
});

test('suelo inválido informa contacto pero rechaza la captura y desconecta', async () => {
  const h = harness();
  const reading = h.service.readTelemetryOverBle(code);
  const rejection = assert.rejects(reading, /Humedad de suelo/);
  await h.ready;
  const invalid = frame.slice();
  invalid[0] = 0xff;
  h.receive(encoded(invalid));
  await rejection;
  assert.deepEqual(h.calls, { disconnected: 1, removed: 1, contacts: 1 });
});

test('Base64 inválido rechaza y limpia la suscripción sin lanzar desde el callback nativo', async () => {
  const h = harness();
  const reading = h.service.readTelemetryOverBle(code);
  const rejection = assert.rejects(reading, /Fallo de lectura BLE/);
  await h.ready;
  assert.doesNotThrow(() => h.receive('%%%'));
  await rejection;
  assert.deepEqual(h.calls, { disconnected: 1, removed: 1, contacts: 0 });
});
