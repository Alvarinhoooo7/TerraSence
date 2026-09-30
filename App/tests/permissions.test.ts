import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import {
  androidRequestState, androidRuntimeState, bluetoothState, hasReviewedPermissions, iosBluetoothAuthorizationState, locationState, markPermissionsReviewed,
  notificationState, PERMISSION_KINDS, permissionAskedKey, permissionsReviewKey, toPermissionState,
} from '../src/utils/permissionState';
import { createAccountOperation } from '../src/utils/accountOperation';
import { createLatestOnly } from '../src/utils/latestOnly';
import { PERMISSION_ACTIONS, PERMISSION_COPY, permissionStatusLabel } from '../src/utils/permissionCopy';

test('permiso concedido, rechazo definitivo y solicitud pendiente mantienen estados distintos', () => {
  assert.deepEqual(toPermissionState({ status: 'granted', granted: true, canAskAgain: false }), { status: 'granted', canAskAgain: false });
  assert.deepEqual(toPermissionState({ status: 'denied', granted: false, canAskAgain: false }), { status: 'denied', canAskAgain: false });
  assert.deepEqual(toPermissionState({ status: 'undetermined', granted: false, canAskAgain: true }), { status: 'undetermined', canAskAgain: true });
});

test('Bluetooth apagado sigue autorizado; rechazo y hardware no disponible no se confunden', () => {
  assert.deepEqual(bluetoothState('PoweredOff'), { status: 'granted', poweredOff: true, canAskAgain: false });
  assert.equal(bluetoothState('PoweredOn').poweredOff, false);
  assert.equal(bluetoothState('Unauthorized').status, 'denied');
  assert.equal(bluetoothState('Unauthorized').canAskAgain, false);
  assert.equal(bluetoothState('Unsupported').status, 'unavailable');
  assert.equal(bluetoothState('Resetting').status, 'undetermined');
  assert.equal(bluetoothState('Unknown').status, 'undetermined');
});

test('la autorización Bluetooth de iOS distingue concedido, rechazado, restringido y sin decidir', () => {
  assert.deepEqual(iosBluetoothAuthorizationState('granted'), { status: 'granted', canAskAgain: false });
  assert.deepEqual(iosBluetoothAuthorizationState('denied'), { status: 'denied', canAskAgain: false });
  assert.deepEqual(iosBluetoothAuthorizationState('restricted'), { status: 'restricted', canAskAgain: false });
  assert.deepEqual(iosBluetoothAuthorizationState('undetermined'), { status: 'undetermined', canAskAgain: true });
  // Un valor que iOS agregue después no se confunde con «nunca pedido» ni con una concesión.
  for (const desconocido of ['unknown', '', 'allowedAlways']) {
    assert.deepEqual(iosBluetoothAuthorizationState(desconocido), { status: 'error', canAskAgain: true });
  }
});

test('una operación con permiso deja de ser válida al cancelar, desmontar o cambiar de cuenta', () => {
  let user: string | undefined = 'a';
  const operation = createAccountOperation('a', () => user);
  const active = operation.begin();
  assert.equal(active(), true);
  user = 'b';
  assert.equal(active(), false, 'otra cuenta: no se continúa para la anterior');
  user = 'a';
  assert.equal(active(), true);
  operation.cancel();
  assert.equal(active(), false, 'cancelar invalida lo que ya esperaba');
  const next = operation.begin();
  assert.equal(next(), true, 'una operación nueva vuelve a estar activa');
  operation.unmount();
  assert.equal(next(), false);
  assert.equal(operation.begin()(), false, 'desmontada, ninguna operación nueva arranca');
  operation.mount();
  assert.equal(operation.begin()(), true);
  // Sin cuenta no hay a quién atribuir la continuación.
  assert.equal(createAccountOperation(undefined, () => undefined).begin()(), false);
});

test('una consulta antigua no pisa una más nueva ni una acción en curso', async () => {
  const latest = createLatestOnly();
  const applied: string[] = [];
  let releaseSlow = () => {};
  const slow = new Promise<string>(resolve => { releaseSlow = () => resolve('antigua'); });
  const first = latest.run(() => slow, value => applied.push(value));
  const second = latest.run(async () => 'nueva', value => applied.push(value));
  await second;
  releaseSlow();
  await first;
  assert.deepEqual(applied, ['nueva'], 'la respuesta tardía se descarta');
  // Una acción del usuario (invalidar) también descarta lo que venía en vuelo.
  let releaseInFlight = () => {};
  const inFlight = new Promise<string>(resolve => { releaseInFlight = () => resolve('en vuelo'); });
  const pending = latest.run(() => inFlight, value => applied.push(value));
  latest.invalidate();
  releaseInFlight();
  await pending;
  assert.deepEqual(applied, ['nueva']);
});

test('continuar guarda sólo la revisión, aislada por cuenta y sin almacenar permisos reales', async () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
  };
  assert.equal(await hasReviewedPermissions(storage, 'a'), false);
  await markPermissionsReviewed(storage, 'a');
  assert.equal(await hasReviewedPermissions(storage, 'a'), true);
  assert.equal(await hasReviewedPermissions(storage, 'b'), false);
  assert.deepEqual([...data], [[permissionsReviewKey('a'), 'reviewed']]);
});

test('una marca corrupta no permite saltar la explicación', async () => {
  const storage = { getItem: async () => '{invalid', setItem: async () => undefined };
  assert.equal(await hasReviewedPermissions(storage, 'a'), false);
  assert.equal(await hasReviewedPermissions(storage, ''), false);
  await assert.rejects(markPermissionsReviewed(storage, ''));
});

test('los fallos de almacenamiento se propagan para mostrar reintento o continuación local', async () => {
  const storage = {
    getItem: async (): Promise<string | null> => { throw new Error('read failed'); },
    setItem: async (): Promise<void> => { throw new Error('write failed'); },
  };
  await assert.rejects(hasReviewedPermissions(storage, 'a'), /read failed/);
  await assert.rejects(markPermissionsReviewed(storage, 'a'), /write failed/);
});

const require = createRequire(import.meta.url);
const { applyStartupPermissions } = require('../plugins/withStartupPermissions.js');

test('el manifiesto permite Bluetooth sin ubicación y conserva ubicación para georreferenciar', () => {
  const manifest = { manifest: { 'uses-permission': [
    { $: { 'android:name': 'android.permission.BLUETOOTH_SCAN' } },
    { $: { 'android:name': 'android.permission.ACCESS_FINE_LOCATION' } },
  ] } };
  const result = applyStartupPermissions(manifest);
  assert.deepEqual(result.manifest['uses-permission'][0].$, {
    'android:name': 'android.permission.BLUETOOTH_SCAN', 'android:usesPermissionFlags': 'neverForLocation',
  });
  assert.deepEqual(result.manifest['uses-permission'][1].$, { 'android:name': 'android.permission.ACCESS_FINE_LOCATION' });
  applyStartupPermissions(manifest);
  assert.equal(result.manifest['uses-permission'].length, 2);
});

test('el plugin agrega la declaración de escaneo si todavía no existe', () => {
  const result = applyStartupPermissions({ manifest: {} });
  assert.equal(result.manifest['uses-permission'][0].$['android:usesPermissionFlags'], 'neverForLocation');
});

test('Bluetooth antiguo se limita a Android 11 y la ubicación no, porque también la usa el GPS', () => {
  const manifest = { manifest: { 'uses-permission': [
    { $: { 'android:name': 'android.permission.BLUETOOTH' } },
    { $: { 'android:name': 'android.permission.BLUETOOTH_ADMIN' } },
    { $: { 'android:name': 'android.permission.ACCESS_FINE_LOCATION' } },
  ] } };
  const permissions = applyStartupPermissions(manifest).manifest['uses-permission'];
  const byName = (name: string) => permissions.find((item: { $: Record<string, string> }) => item.$['android:name'] === name).$;
  assert.equal(byName('android.permission.BLUETOOTH')['android:maxSdkVersion'], '30');
  assert.equal(byName('android.permission.BLUETOOTH_ADMIN')['android:maxSdkVersion'], '30');
  assert.equal(byName('android.permission.ACCESS_FINE_LOCATION')['android:maxSdkVersion'], undefined);
});

test('Android separa «nunca pedido», rechazo que admite otra solicitud y bloqueo', () => {
  assert.deepEqual(androidRuntimeState({ granted: true, rationale: false, asked: true }), { status: 'granted', canAskAgain: false });
  assert.deepEqual(androidRuntimeState({ granted: false, rationale: false, asked: false }), { status: 'undetermined', canAskAgain: true });
  assert.deepEqual(androidRuntimeState({ granted: false, rationale: true, asked: true }), { status: 'denied', canAskAgain: true });
  assert.deepEqual(androidRuntimeState({ granted: false, rationale: false, asked: true }), { status: 'denied', canAskAgain: false });
});

test('una concesión parcial de SCAN y CONNECT no habilita Bluetooth', () => {
  assert.equal(androidRequestState(['granted', 'granted']).status, 'granted');
  assert.deepEqual(androidRequestState(['granted', 'denied']), { status: 'denied', canAskAgain: true });
  assert.deepEqual(androidRequestState(['granted', 'never_ask_again']), { status: 'denied', canAskAgain: false });
  assert.equal(androidRequestState([]).status, 'denied');
});

test('la ubicación aproximada es una autorización utilizable, no un rechazo', () => {
  const base = { granted: true, status: 'granted', canAskAgain: true };
  assert.deepEqual(locationState({ ...base, ios: { accuracy: 'reduced' } }), { status: 'granted', canAskAgain: true, approximate: true });
  assert.deepEqual(locationState({ ...base, android: { accuracy: 'coarse' } }), { status: 'granted', canAskAgain: true, approximate: true });
  assert.equal(locationState({ ...base, ios: { accuracy: 'full' } }).approximate, undefined);
  assert.equal(locationState({ granted: false, status: 'denied', canAskAgain: false }).status, 'denied');
});

test('los avisos provisionales cuentan como autorizados, pero silenciosos', () => {
  const pending = { granted: false, status: 'undetermined', canAskAgain: true };
  assert.deepEqual(notificationState(pending, true), { status: 'granted', canAskAgain: true, provisional: true });
  assert.equal(notificationState({ granted: true, status: 'granted', canAskAgain: false }, false).provisional, undefined);
});

test('la marca de solicitud es por instalación, no por cuenta', () => {
  assert.equal(permissionAskedKey('bluetooth'), '@terrasense/permission-asked-v1/bluetooth');
});

// Apple desaconseja «Permitir» y cualquier salida en la pantalla previa al diálogo; los
// textos propios tampoco postergan ni presionan. La acción que abre el diálogo es «Continuar».
const FORBIDDEN = /\b(permitir|allow|ahora no|not now|más tarde|mas tarde|later|omitir|skip|por ahora|for now)\b/i;

test('ningún botón propio imita al diálogo del sistema ni pospone', () => {
  assert.equal(PERMISSION_ACTIONS.continue.es, 'Continuar');
  assert.equal(PERMISSION_ACTIONS.continue.en, 'Continue');
  for (const action of Object.values(PERMISSION_ACTIONS)) {
    assert.doesNotMatch(action.es, FORBIDDEN);
    assert.doesNotMatch(action.en, FORBIDDEN);
  }
});

test('los estados no culpan ni posponen, y distinguen bloqueo, restricción y precisión', () => {
  const states = [
    undefined, { status: 'granted', canAskAgain: false }, { status: 'granted', canAskAgain: false, approximate: true },
    { status: 'granted', canAskAgain: false, poweredOff: true }, { status: 'granted', canAskAgain: true, provisional: true },
    { status: 'denied', canAskAgain: true }, { status: 'denied', canAskAgain: false }, { status: 'restricted', canAskAgain: false },
    { status: 'undetermined', canAskAgain: true }, { status: 'unavailable', canAskAgain: false }, { status: 'error', canAskAgain: true },
  ] as const;
  const labels = states.map(state => permissionStatusLabel(state, 'es'));
  for (const label of [...labels, ...states.map(state => permissionStatusLabel(state, 'en'))]) assert.doesNotMatch(label, FORBIDDEN);
  assert.equal(new Set(labels).size, labels.length, 'cada estado tiene su propio texto');
  assert.match(permissionStatusLabel({ status: 'denied', canAskAgain: false }, 'es'), /ajustes del teléfono/);
  assert.match(permissionStatusLabel({ status: 'granted', canAskAgain: false, approximate: true }, 'es'), /aproximada/);
});

test('cada permiso tiene nombre, resumen, explicación y efecto del rechazo en los dos idiomas', () => {
  for (const kind of PERMISSION_KINDS) {
    for (const field of ['name', 'summary', 'rationale', 'denied'] as const) {
      assert.ok(PERMISSION_COPY[kind][field].es.trim(), `${kind}.${field}.es`);
      assert.ok(PERMISSION_COPY[kind][field].en.trim(), `${kind}.${field}.en`);
      assert.doesNotMatch(PERMISSION_COPY[kind][field].es, FORBIDDEN);
      assert.doesNotMatch(PERMISSION_COPY[kind][field].en, FORBIDDEN);
    }
  }
});

test('la configuración nativa sólo declara lo que la app usa en primer plano', () => {
  const appConfig = require('../app.config.js');
  const { expo } = (appConfig.default ?? appConfig)();
  const plugin = (name: string) => expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === name)?.[1];
  assert.equal(plugin('react-native-ble-plx').modes, undefined, 'modes agrega bluetooth-central en segundo plano');
  assert.equal(plugin('react-native-ble-plx').isBackgroundEnabled, false);
  const location = plugin('expo-location');
  assert.equal(location.locationAlwaysPermission, false);
  assert.equal(location.locationAlwaysAndWhenInUsePermission, false);
  assert.equal(location.motionUsagePermission, false);
  assert.equal(location.isIosBackgroundLocationEnabled, false);
  assert.equal(location.isAndroidBackgroundLocationEnabled, false);
  assert.ok(!expo.android.permissions.includes('android.permission.ACCESS_BACKGROUND_LOCATION'));
  for (const blocked of ['SYSTEM_ALERT_WINDOW', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']) {
    assert.ok(expo.android.blockedPermissions.includes(`android.permission.${blocked}`), blocked);
  }
  for (const key of ['NSBluetoothAlwaysUsageDescription', 'NSLocationWhenInUseUsageDescription', 'NSCameraUsageDescription']) {
    assert.equal(expo.ios.infoPlist[key], undefined, `${key} vive sólo en el plugin y en locales`);
    for (const lang of ['es', 'en']) assert.match(expo.locales[lang].ios[key], /^TerraSense \S.*\.$/, `${lang}.${key}`);
  }
  assert.equal(plugin('react-native-ble-plx').bluetoothAlwaysPermission, expo.locales.es.ios.NSBluetoothAlwaysUsageDescription);
});
