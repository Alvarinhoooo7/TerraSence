import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { createDeveloperTap } from '../src/utils/developerTap';
import { timedOperation } from '../src/utils/timedOperation';

test('el logo exige diez pulsaciones y sólo activa el acceso una vez', () => {
  let entered = 0;
  const tap = createDeveloperTap(true, () => entered++);
  for (let i = 0; i < 9; i++) tap();
  assert.equal(entered, 0);
  tap();
  assert.equal(entered, 1);
  for (let i = 0; i < 20; i++) tap();
  assert.equal(entered, 1);
});

test('el gesto no habilita producción y una pantalla nueva reinicia el conteo', () => {
  let entered = 0;
  const disabled = createDeveloperTap(false, () => entered++);
  for (let i = 0; i < 30; i++) disabled();
  const first = createDeveloperTap(true, () => entered++);
  for (let i = 0; i < 9; i++) first();
  createDeveloperTap(true, () => entered++)();
  assert.equal(entered, 0);
});

test('una operación nativa bloqueada vence y se cancela', async () => {
  let cancelled = 0;
  await assert.rejects(timedOperation(new Promise(() => {}), 5, () => cancelled++, 'Sin respuesta'), /Sin respuesta/);
  assert.equal(cancelled, 1);
});

test('un éxito o error nativo limpia el temporizador sin cancelar después', async () => {
  let cancelled = 0;
  assert.equal(await timedOperation(Promise.resolve(42), 5, () => cancelled++, 'timeout'), 42);
  await assert.rejects(timedOperation(Promise.reject(new Error('desconectada')), 5, () => cancelled++, 'timeout'), /desconectada/);
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(cancelled, 0);
});

// Doble del límite nativo: se ejecuta bleService real sin requerir una radio en Node.
const require = createRequire(import.meta.url);
const loader = Module as unknown as { _load: (id: string, ...args: unknown[]) => unknown };
const original = loader._load;
let identity: string | null = '';
/** Característica de estado: batería, versión y banderas (bit 0 = ventana PAIR). */
let status: string | null = btoa(String.fromCharCode(80, 1, 0, 0, 1));
let readFails = false;
let writes = 0;
let disconnects = 0;
let radioState = 'PoweredOn';
let removedListeners = 0;
let scanFails = false;
const storage = new Map<string, string>();
const probe = {
  id: 'probe', name: 'TerraSense', localName: null,
  connect: async () => probe,
  discoverAllServicesAndCharacteristics: async () => probe,
  readCharacteristicForService: async (_service: string, characteristic: string) => {
    if (readFails) throw new Error('No se pudo leer');
    return { value: characteristic.startsWith('00000005') ? status : identity };
  },
  writeCharacteristicWithResponseForService: async () => {
    writes++;
    status = btoa(String.fromCharCode(80, 1, 0, 0, 0));  // el firmware cierra la ventana
  },
  cancelConnection: async () => { disconnects++; },
};
class MockManager {
  state = async () => radioState;
  onStateChange = (callback: (state: string) => void) => {
    callback('PoweredOn');
    return { remove: () => { removedListeners++; } };
  };
  startDeviceScan = async (_ids: unknown, _options: unknown, callback: (error: null, device: typeof probe) => void) => {
    if (scanFails) throw new Error('radio no disponible');
    callback(null, probe);
  };
  stopDeviceScan = async () => {};
  connectToDevice = async () => probe;
  cancelTransaction = async () => {};
}
loader._load = (id, ...args) => {
  if (id === 'react-native') return { Platform: { OS: 'ios' } };
  if (id === 'react-native-ble-plx') return { BleManager: MockManager };
  if (id === 'expo-crypto') return {};
  if (id === 'expo-location' || id === 'expo-camera' || id === 'expo-notifications') return {};
  if (id === './notifications') return {};
  // El informe de contactos habla con Supabase; aquí sólo importa el flujo BLE.
  if (id === './contactService') return { recordProbeContact: async () => {} };
  if (id === '@react-native-async-storage/async-storage') return {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { storage.set(key, value); },
    getAllKeys: async () => [...storage.keys()],
    multiRemove: async (keys: string[]) => { keys.forEach(key => storage.delete(key)); },
  };
  return original.call(Module, id, ...args);
};
let ble: typeof import('../src/services/bleService');
let permissions: typeof import('../src/services/permissionsService');
let devSkip: typeof import('../src/utils/devSkipOnboarding');
try {
  ble = require('../src/services/bleService');
  permissions = require('../src/services/permissionsService');
  devSkip = require('../src/utils/devSkipOnboarding');
} finally { loader._load = original; }

test('el permiso iOS tolera una respuesta inmediata del listener y lo libera', async () => {
  radioState = 'Unknown';
  const before = removedListeners;
  try {
    assert.equal((await permissions.requestPermission('bluetooth', 'es')).status, 'granted');
    assert.equal(removedListeners, before + 1);
  } finally { radioState = 'PoweredOn'; }
});

test('el atajo guardado se aísla por cuenta y queda inactivo en producción', async () => {
  const globals = globalThis as typeof globalThis & { __DEV__: boolean };
  globals.__DEV__ = true;
  storage.set('terrasense.dev.skipOnboarding', '1');
  assert.equal(await devSkip.isDevSkipEnabled('a'), false);
  await devSkip.enableDevSkip('a');
  assert.equal(await devSkip.isDevSkipEnabled('a'), true);
  assert.equal(await devSkip.isDevSkipEnabled('b'), false);
  globals.__DEV__ = false;
  assert.equal(await devSkip.isDevSkipEnabled('a'), false);
  await devSkip.enableDevSkip('b');
  globals.__DEV__ = true;
  assert.equal(await devSkip.isDevSkipEnabled('b'), false);
  await devSkip.clearDevSkip();
  assert.equal(await devSkip.isDevSkipEnabled('a'), false);
  assert.equal(storage.size, 0);
});

test('pairing lee el ID de la MAC y nunca inventa uno', async () => {
  readFails = true;
  const before = disconnects;
  await assert.rejects(ble.pairWithNearbyProbe(), /No se pudo leer/);
  assert.equal(disconnects, before + 1);
  readFails = false;
  // Un firmware anterior sin ID, o un valor corrupto, no se registra.
  for (const invalid of [null, '', btoa('datos inválidos'), btoa('123')]) {
    identity = invalid;
    await assert.rejects(ble.pairWithNearbyProbe(), /identidad/);
  }
  identity = btoa('008123456789012');
  const found = await ble.pairWithNearbyProbe();
  assert.equal(found.deviceCode, '008123456789012');
  assert.equal(found.pairingOpen, true);
});

test('sin la ventana PAIR abierta la sonda no queda lista para vincular', async () => {
  identity = btoa('482139057416628');
  status = btoa(String.fromCharCode(80, 1, 0, 0, 0));
  assert.equal((await ble.pairWithNearbyProbe()).pairingOpen, false);
  status = null;  // firmware sin característica de estado
  assert.equal((await ble.pairWithNearbyProbe()).pairingOpen, false);
  status = btoa(String.fromCharCode(80, 1, 0, 0, 1));
});

test('un fallo al iniciar el escaneo se propaga sin dejar esperando la pantalla', async () => {
  scanFails = true;
  try { await assert.rejects(ble.pairWithNearbyProbe(), /No se pudo iniciar Bluetooth/); }
  finally { scanFails = false; }
});

test('confirmar la vinculación escribe el ID una vez y no lanza', async () => {
  identity = btoa('482139057416628');
  status = btoa(String.fromCharCode(80, 1, 0, 0, 1));
  writes = 0;
  assert.equal(await ble.confirmPairing('probe', '48213-90574-16628'), true);
  assert.equal(writes, 1);
  // Un ID inválido no se escribe; un fallo de radio se informa como false.
  assert.equal(await ble.confirmPairing('probe', '123'), false);
  assert.equal(writes, 1);
  readFails = true;
  try { assert.equal(await ble.confirmPairing('probe', '482139057416628'), false); }
  finally { readFails = false; }
});
