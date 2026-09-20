import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { bluetoothState, hasReviewedPermissions, markPermissionsReviewed, permissionsReviewKey, toPermissionState } from '../src/utils/permissionState';

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
