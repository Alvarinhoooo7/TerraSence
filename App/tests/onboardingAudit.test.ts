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
let holdScan = false;
let scanCallbacks: Array<(error: null, device: typeof probe) => void> = [];
let stoppedScans = 0;
let holdStop = false;
let resolveStop: (() => void) | null = null;
const scanEvents: string[] = [];
let holdDiscover = false;
let discoverCalls = 0;
let resolveDiscover: (() => void) | null = null;
let cancelledTransactions = 0;
let managersCreated = 0;
/** Autorización de CBManager según el módulo nativo; null simula un binario sin el módulo. */
let nativeAuthorization: string | null = 'undetermined';
let nativeReads = 0;
/** Gancho que se ejecuta en cada lectura nativa: permite cambiar el mundo «durante» la consulta. */
let onNativeRead: (() => void) | null = null;
/** Gancho que se ejecuta cuando el diálogo del sistema se abre: permite salir de la pantalla «durante» él. */
let onDialogOpen: (() => void) | null = null;
let dialogsOpened = 0;
let dialogMode: 'grant' | 'silent' = 'grant';
const alerts: string[] = [];
const storage = new Map<string, string>();
const probe = {
  id: 'probe', name: 'TerraSense', localName: null,
  connect: async () => probe,
  discoverAllServicesAndCharacteristics: async () => {
    discoverCalls++;
    if (holdDiscover) await new Promise<void>(resolve => { resolveDiscover = resolve; });
    return probe;
  },
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
  constructor() { managersCreated++; }
  destroy = () => {};
  state = async () => radioState;
  onStateChange = (callback: (state: string) => void) => {
    dialogsOpened++;
    onDialogOpen?.();
    // «grant»: la persona acepta al instante. «silent»: el diálogo sigue abierto sin decisión.
    if (dialogMode === 'grant') { nativeAuthorization = 'granted'; callback('PoweredOn'); }
    return { remove: () => { removedListeners++; } };
  };
  startDeviceScan = async (_ids: unknown, _options: unknown, callback: (error: null, device: typeof probe) => void) => {
    scanEvents.push('start');
    if (scanFails) throw new Error('radio no disponible');
    if (holdScan) { scanCallbacks.push(callback); return; }
    callback(null, probe);
  };
  stopDeviceScan = async () => {
    scanEvents.push('stop requested');
    if (holdStop) await new Promise<void>(resolve => { resolveStop = resolve; });
    stoppedScans++;
    scanEvents.push('stop done');
  };
  connectToDevice = async () => probe;
  cancelTransaction = async () => { cancelledTransactions++; };
}
loader._load = (id, ...args) => {
  if (id === 'react-native') return {
    Platform: { OS: 'ios' },
    Linking: { openSettings: async () => {} },
    // Cada aviso se registra y se cierra solo, como si la persona pulsara el último botón.
    Alert: { alert: (title: string, _message: string, buttons: { onPress?: () => void }[]) => { alerts.push(title); buttons.at(-1)?.onPress?.(); } },
  };
  if (id === 'expo') return {
    requireNativeModule: () => {
      if (nativeAuthorization === null) throw new Error('Cannot find native module IosBluetoothAuthorization');
      return { getAuthorization: () => { nativeReads++; onNativeRead?.(); return nativeAuthorization; } };
    },
  };
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
let prompt: typeof import('../src/components/permissionPrompt');
let devSkip: typeof import('../src/utils/devSkipOnboarding');
try {
  ble = require('../src/services/bleService');
  require('../src/services/iosBluetoothAuthorization');
  permissions = require('../src/services/permissionsService');
  prompt = require('../src/components/permissionPrompt');
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

const ASKED = '@terrasense/permission-asked-v1/bluetooth';
/** Ejecuta una lectura con un gestor recién destruido y devuelve cuántos gestores se crearon. */
async function readBluetoothIos() {
  ble.destroyManager();
  const before = managersCreated;
  const state = await permissions.readPermission('bluetooth');
  return { state, created: managersCreated - before };
}

test('iOS: la lectura sale de CBManager.authorization, no de la marca, y sin autorización no crea el gestor', async () => {
  try {
    // Privacidad restablecida con una marca vieja: el sistema manda, la marca no.
    storage.set(ASKED, 'asked');
    nativeAuthorization = 'undetermined';
    assert.deepEqual(await readBluetoothIos(), { state: { status: 'undetermined', canAskAgain: true }, created: 0 });
    // Rechazado sin marca (p. ej. tras reinstalar y conservar el permiso): sigue siendo rechazo.
    storage.delete(ASKED);
    nativeAuthorization = 'denied';
    assert.deepEqual(await readBluetoothIos(), { state: { status: 'denied', canAskAgain: false }, created: 0 });
    nativeAuthorization = 'restricted';
    assert.deepEqual(await readBluetoothIos(), { state: { status: 'restricted', canAskAgain: false }, created: 0 });
    nativeAuthorization = 'valor-nuevo-de-ios';
    assert.deepEqual(await readBluetoothIos(), { state: { status: 'error', canAskAgain: true }, created: 0 });
  } finally { nativeAuthorization = 'undetermined'; storage.delete(ASKED); }
});

test('iOS: con la autorización concedida se consulta la radio y se conserva «Bluetooth apagado»', async () => {
  nativeAuthorization = 'granted';
  try {
    radioState = 'PoweredOff';
    assert.deepEqual((await readBluetoothIos()).state, { status: 'granted', canAskAgain: false, poweredOff: true });
    radioState = 'PoweredOn';
    assert.deepEqual((await readBluetoothIos()).state, { status: 'granted', canAskAgain: false });
    radioState = 'Unsupported';
    assert.deepEqual((await readBluetoothIos()).state, { status: 'unavailable', canAskAgain: false });
    // Radio aún «desconocida»: la autorización concedida es lo consultado y no se degrada.
    radioState = 'Unknown';
    assert.deepEqual((await readBluetoothIos()).state, { status: 'granted', canAskAgain: false });
  } finally { radioState = 'PoweredOn'; nativeAuthorization = 'undetermined'; }
});

test('iOS: un permiso ya rechazado no abre el diálogo ni crea el gestor al solicitar', async () => {
  nativeAuthorization = 'denied';
  try {
    ble.destroyManager();
    const before = managersCreated;
    assert.deepEqual(await permissions.requestPermission('bluetooth', 'es'), { status: 'denied', canAskAgain: false });
    assert.equal(managersCreated, before);
  } finally { nativeAuthorization = 'undetermined'; }
});

test('iOS sin módulo nativo: respaldo por marca local, sin crear el gestor antes de la primera solicitud', async () => {
  nativeAuthorization = null;
  try {
    storage.delete(ASKED);
    assert.deepEqual(await readBluetoothIos(), { state: { status: 'undetermined', canAskAgain: true }, created: 0 });
    storage.set(ASKED, 'asked');
    radioState = 'PoweredOff';
    assert.deepEqual((await readBluetoothIos()).state, { status: 'granted', canAskAgain: false, poweredOff: true });
    // La solicitud completa también funciona con el respaldo (el mismo camino usa el sondeo).
    storage.delete(ASKED);
    radioState = 'PoweredOn';
    assert.equal((await permissions.requestPermission('bluetooth', 'es')).status, 'granted');
  } finally { radioState = 'PoweredOn'; nativeAuthorization = 'undetermined'; storage.delete(ASKED); }
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
  // Sólo cuentan las claves del atajo: la marca de permisos por instalación es otra cosa.
  assert.equal([...storage.keys()].filter(key => key.includes('skipOnboarding')).length, 0);
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

test('D07: desmontar cancela el escaneo y un callback tardío no completa la vinculación', async () => {
  holdScan = true;
  scanCallbacks = [];
  const controller = new AbortController();
  const before = stoppedScans;
  try {
    const pending = ble.pairWithNearbyProbe(controller.signal);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(scanCallbacks.length, 1);
    controller.abort();
    await assert.rejects(pending, /cancelada/);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(stoppedScans, before + 1);
    scanCallbacks[0](null, probe);
    assert.equal(stoppedScans, before + 1);
  } finally { holdScan = false; scanCallbacks = []; }
});

test('D07: un escaneo viejo no detiene la búsqueda nueva', async () => {
  holdScan = true;
  scanCallbacks = [];
  const firstController = new AbortController();
  const secondController = new AbortController();
  try {
    const first = ble.scanForProbe(undefined, firstController.signal);
    await new Promise(resolve => setImmediate(resolve));
    const second = ble.scanForProbe(undefined, secondController.signal);
    await assert.rejects(first, /cancelada/);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(scanCallbacks.length, 2);
    firstController.abort();
    scanCallbacks[0](null, probe);
    scanCallbacks[1](null, probe);
    assert.equal(await second, probe);
  } finally { holdScan = false; scanCallbacks = []; }
});

test('D07: espera el stop nativo antes de iniciar un escaneo nuevo', async () => {
  holdScan = true;
  holdStop = true;
  scanCallbacks = [];
  scanEvents.length = 0;
  const firstController = new AbortController();
  try {
    const first = ble.scanForProbe(undefined, firstController.signal);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(scanCallbacks.length, 1);
    firstController.abort();
    await assert.rejects(first, /cancelada/);
    const second = ble.scanForProbe();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(scanEvents, ['start', 'stop requested']);
    assert.equal(scanCallbacks.length, 1);
    holdStop = false;
    resolveStop?.();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(scanEvents.slice(0, 3), ['start', 'stop requested', 'stop done']);
    assert.equal(scanCallbacks.length, 2);
    scanCallbacks[1](null, probe);
    assert.equal(await second, probe);
  } finally { holdStop = false; resolveStop?.(); resolveStop = null; holdScan = false; scanCallbacks = []; }
});

test('D07: cancelar la espera de radio libera el listener', async () => {
  radioState = 'PoweredOff';
  dialogMode = 'silent';
  const controller = new AbortController();
  const before = removedListeners;
  try {
    const pending = ble.scanForProbe(undefined, controller.signal);
    await new Promise(resolve => setImmediate(resolve));
    controller.abort();
    await assert.rejects(pending, /cancelada/);
    assert.equal(removedListeners, before + 1);
  } finally { radioState = 'PoweredOn'; dialogMode = 'grant'; }
});

test('D07: la señal de una operación cancelada no afecta a la siguiente', async () => {
  const { createAccountOperation } = await import('../src/utils/accountOperation');
  let user = 'a';
  const operation = createAccountOperation('a', () => user);
  const first = operation.begin();
  operation.cancel();
  const second = operation.begin();
  assert.equal(first.signal.aborted, true);
  assert.equal(first(), false);
  assert.equal(second.signal.aborted, false);
  assert.equal(second(), true);
  user = 'b';
  operation.cancelIfAccountChanged();
  assert.equal(second.signal.aborted, true);
});

test('D07: cancelar durante GATT libera la conexión y descarta la respuesta tardía', async () => {
  holdDiscover = true;
  const controller = new AbortController();
  const beforeDisconnects = disconnects;
  const beforeTransactions = cancelledTransactions;
  try {
    const pending = ble.pairWithNearbyProbe(controller.signal);
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(resolveDiscover);
    controller.abort();
    await assert.rejects(pending, /cancelada/);
    assert.equal(disconnects, beforeDisconnects + 1);
    assert.equal(cancelledTransactions, beforeTransactions + 1);
    resolveDiscover?.();
  } finally { holdDiscover = false; resolveDiscover?.(); resolveDiscover = null; }
});

test('D07: abortar antes del microtask GATT no inicia trabajo nativo', async () => {
  const controller = new AbortController();
  const add = controller.signal.addEventListener.bind(controller.signal);
  let abortListeners = 0;
  controller.signal.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
    add(type, listener, options);
    if (type === 'abort' && ++abortListeners === 2) controller.abort();
  }) as typeof controller.signal.addEventListener;
  const beforeDiscover = discoverCalls;
  const beforeTransactions = cancelledTransactions;
  await assert.rejects(ble.pairWithNearbyProbe(controller.signal), /cancelada/);
  assert.equal(discoverCalls, beforeDiscover);
  assert.equal(cancelledTransactions, beforeTransactions);
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

// --- Coordinador de permisos (D07): dobles de CoreBluetooth y de las alertas del sistema ---

const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };
function resetPermissionWorld() {
  nativeAuthorization = 'undetermined'; dialogMode = 'grant'; radioState = 'Unknown'; onNativeRead = null;
  storage.delete(ASKED);
}
function restorePermissionWorld() {
  nativeAuthorization = 'undetermined'; dialogMode = 'grant'; radioState = 'PoweredOn'; onNativeRead = null; onDialogOpen = null;
}

test('D07: dos toques seguidos abren una sola solicitud nativa de Bluetooth', async () => {
  resetPermissionWorld();
  try {
    const before = dialogsOpened;
    const [first, second] = await Promise.all([permissions.requestPermission('bluetooth', 'es'), permissions.requestPermission('bluetooth', 'es')]);
    assert.equal(dialogsOpened - before, 1, 'la segunda solicitud vuelve a consultar y ya no pregunta');
    assert.equal(first.status, 'granted');
    assert.equal(second.status, 'granted');
  } finally { restorePermissionWorld(); }
});

test('D07: si la pantalla se cierra o cambia la cuenta durante la consulta, no se abre el diálogo', async () => {
  resetPermissionWorld();
  try {
    // Inactiva desde antes de empezar: ni siquiera se consulta.
    const reads = nativeReads; const opened = dialogsOpened;
    assert.deepEqual(await permissions.requestPermission('bluetooth', 'es', () => false), { status: 'undetermined', canAskAgain: true });
    assert.equal(nativeReads, reads);
    // Se vuelve inactiva justo mientras se lee el estado: se devuelve lo leído, sin solicitar.
    let active = true;
    onNativeRead = () => { active = false; };
    const result = await permissions.requestPermission('bluetooth', 'es', () => active);
    assert.equal(result.status, 'undetermined');
    assert.equal(dialogsOpened, opened, 'no se abrió ningún diálogo para una pantalla que ya no existe');
    // Sigue activa: la solicitud sí se hace, una sola vez.
    onNativeRead = null;
    assert.equal((await permissions.requestPermission('bluetooth', 'es', () => true)).status, 'granted');
    assert.equal(dialogsOpened, opened + 1);
  } finally { restorePermissionWorld(); }
});

test('D07: el aviso «Bluetooth apagado» no se muestra si la operación ya no está activa', async () => {
  nativeAuthorization = 'granted'; radioState = 'PoweredOff'; onNativeRead = null;
  try {
    const before = alerts.length;
    let active = true;
    onNativeRead = () => { active = false; };
    const cancelled = await prompt.askForAccess('bluetooth', 'es', () => active);
    assert.equal(cancelled.ok, false);
    assert.equal(alerts.length, before, 'sin aviso ni continuación para una pantalla cerrada');
    onNativeRead = null;
    const shown = await prompt.askForAccess('bluetooth', 'es', () => true);
    assert.equal(shown.ok, false, 'apagado no es utilizable, pero sí está autorizado');
    assert.equal(alerts.length, before + 1, 'con la pantalla activa se avisa una sola vez');
  } finally { restorePermissionWorld(); }
});

test('D07 iOS: al vencer el plazo devuelve «sin decidir» pero la cola sigue bloqueada mientras el diálogo esté abierto', async t => {
  resetPermissionWorld();
  dialogMode = 'silent';
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const opened = dialogsOpened;
    const first = permissions.requestPermission('bluetooth', 'es');
    await settle();
    assert.equal(dialogsOpened - opened, 1);
    t.mock.timers.tick(20000);
    assert.deepEqual(await first, { status: 'undetermined', canAskAgain: true }, 'vencer nunca equivale a una autorización');
    // Un nuevo toque mientras el diálogo del sistema sigue abierto no apila otra solicitud.
    const second = permissions.requestPermission('bluetooth', 'es');
    let secondDone = false;
    void second.then(() => { secondDone = true; });
    await settle();
    t.mock.timers.tick(3000);
    await settle();
    assert.equal(secondDone, false, 'la cola sigue bloqueada');
    assert.equal(dialogsOpened - opened, 1, 'no se abre un segundo diálogo');
    // La persona decide: el sondeo de CoreBluetooth lo detecta, libera la barrera y la cola avanza.
    nativeAuthorization = 'granted';
    t.mock.timers.tick(750);
    await settle();
    assert.equal((await second).status, 'granted');
    assert.equal(dialogsOpened - opened, 1, 'la segunda solicitud sólo lee el estado ya decidido');
  } finally { t.mock.timers.reset(); restorePermissionWorld(); }
});

test('D07: si la cuenta cambia mientras el diálogo está abierto, la respuesta tardía llega pero la pantalla ya no es válida', async () => {
  resetPermissionWorld();
  try {
    const { createAccountOperation } = await import('../src/utils/accountOperation');
    let user: string | undefined = 'a';
    const operation = createAccountOperation('a', () => user);
    const active = operation.begin();
    let continued = 0;
    onDialogOpen = () => { user = 'b'; };
    const opened = dialogsOpened;
    const access = await prompt.askForAccess('bluetooth', 'es', active);
    assert.equal(dialogsOpened - opened, 1, 'el diálogo se abrió una sola vez');
    assert.equal(access.state.status, 'granted', 'la decisión de la persona es del teléfono y no se pierde');
    // La continuación de las pantallas: sólo corre si la operación sigue vigente.
    if (active()) continued++;
    assert.equal(continued, 0, 'no se inicia BLE, escáner ni escritura para la cuenta anterior');
    // Una operación nueva de la cuenta vigente vuelve a consultar y no reabre el diálogo ya decidido.
    user = 'b';
    const next = createAccountOperation('b', () => user).begin();
    const again = await prompt.askForAccess('bluetooth', 'es', next);
    assert.equal(again.ok, true);
    assert.equal(dialogsOpened - opened, 1);
  } finally { restorePermissionWorld(); }
});

test('D07: dos continuaciones con una sola operación cancelada no duplican la solicitud ni la acción', async () => {
  resetPermissionWorld();
  try {
    const { createAccountOperation } = await import('../src/utils/accountOperation');
    const operation = createAccountOperation('a', () => 'a');
    const opened = dialogsOpened;
    const first = operation.begin();
    const pendingFirst = prompt.askForAccess('bluetooth', 'es', first);
    operation.cancel();   // la pantalla empezó otra operación antes de que respondiera la primera
    const second = operation.begin();
    const pendingSecond = prompt.askForAccess('bluetooth', 'es', second);
    const [a, b] = await Promise.all([pendingFirst, pendingSecond]);
    assert.equal(dialogsOpened - opened, 1, 'una sola solicitud nativa para las dos continuaciones');
    assert.equal(first(), false, 'la operación cancelada no continúa');
    assert.equal(second(), true, 'la vigente sí');
    assert.equal(a.state.status === 'granted' || a.state.status === 'undetermined', true);
    assert.equal(b.state.status, 'granted');
  } finally { restorePermissionWorld(); }
});
