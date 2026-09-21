import { PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { prepareNotificationChannels } from './notifications';
import { bluetoothState, PERMISSION_KINDS, toPermissionState, type PermissionKind, type PermissionSnapshot, type PermissionState } from '../utils/permissionState';

let iosBluetoothRequested = false;
let androidBluetoothBlocked = false;
let androidBluetoothDenied = false;
const unavailable: PermissionState = { status: 'unavailable', canAskAgain: false };

function androidBluetoothPermissions() {
  return Number(Platform.Version) >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

async function readBluetooth(): Promise<PermissionState> {
  if (Platform.OS === 'android') {
    const granted = (await Promise.all(androidBluetoothPermissions().map(permission => PermissionsAndroid.check(permission)))).every(Boolean);
    return { status: granted ? 'granted' : androidBluetoothDenied ? 'denied' : 'undetermined', canAskAgain: !androidBluetoothBlocked };
  }
  if (Platform.OS !== 'ios') return unavailable;
  // Crear CBCentralManager puede mostrar el diálogo: hacerlo sólo tras tocar Permitir.
  if (!iosBluetoothRequested) return { status: 'undetermined', canAskAgain: true };
  const { getManager } = await import('./bleService');
  return bluetoothState(await getManager().state());
}

function notificationState(response: Notifications.NotificationPermissionsStatus): PermissionState {
  const provisional = response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    response.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
  return toPermissionState({ ...response, granted: response.granted || provisional });
}

export async function readPermission(kind: PermissionKind): Promise<PermissionState> {
  try {
    if (kind === 'bluetooth') return await readBluetooth();
    if (kind === 'location') return toPermissionState(await Location.getForegroundPermissionsAsync());
    if (kind === 'camera') return toPermissionState(await Camera.getCameraPermissionsAsync());
    return notificationState(await Notifications.getPermissionsAsync());
  } catch { return { status: 'error', canAskAgain: true }; }
}

export async function readPermissions(): Promise<PermissionSnapshot> {
  const values = await Promise.all(PERMISSION_KINDS.map(readPermission));
  return { bluetooth: values[0], location: values[1], camera: values[2], notifications: values[3] };
}

async function requestBluetooth(): Promise<PermissionState> {
  if (Platform.OS === 'android') {
    const response = await PermissionsAndroid.requestMultiple(androidBluetoothPermissions());
    const results = Object.values(response);
    const granted = results.every(value => value === PermissionsAndroid.RESULTS.GRANTED);
    androidBluetoothDenied = !granted;
    androidBluetoothBlocked = results.some(value => value === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
    return { status: granted ? 'granted' : 'denied', canAskAgain: !androidBluetoothBlocked };
  }
  if (Platform.OS !== 'ios') return unavailable;
  const { getManager } = await import('./bleService');
  iosBluetoothRequested = true;
  const manager = getManager();
  const current = bluetoothState(await manager.state());
  if (current.status !== 'undetermined') return current;
  // Espera acotada al diálogo/estado de CoreBluetooth, sin escanear equipos.
  return new Promise(resolve => {
    let subscription: { remove: () => void } | undefined;
    let settled = false;
    const finish = (result: PermissionState) => {
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ status: 'undetermined', canAskAgain: true }), 20000);
    subscription = manager.onStateChange(state => {
      const result = bluetoothState(state);
      if (result.status === 'undetermined') return;
      finish(result);
    }, true);
    if (settled) subscription.remove();
  });
}

export async function requestPermission(kind: PermissionKind, language: 'es' | 'en'): Promise<PermissionState> {
  if (kind === 'bluetooth') return requestBluetooth();
  if (kind === 'location') return toPermissionState(await Location.requestForegroundPermissionsAsync());
  if (kind === 'camera') return toPermissionState(await Camera.requestCameraPermissionsAsync());
  await prepareNotificationChannels(language);
  return notificationState(await Notifications.requestPermissionsAsync());
}
