import { Linking, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { prepareNotificationChannels } from './notifications';
import {
  androidRequestState, androidRuntimeState, bluetoothState, locationState, notificationState, PERMISSION_KINDS,
  permissionAskedKey, toPermissionState, type PermissionKind, type PermissionSnapshot, type PermissionState,
} from '../utils/permissionState';

// Coordinador único de permisos del teléfono. Consultar nunca abre un diálogo del
// sistema; solicitar sólo ocurre por una acción de la persona y de a una por vez.
// El sistema es la fuente de verdad: aquí sólo se guarda, por instalación, que un
// permiso ya se pidió, porque Android no distingue «nunca pedido» de «bloqueado».

const unavailable: PermissionState = { status: 'unavailable', canAskAgain: false };
const failed: PermissionState = { status: 'error', canAskAgain: true };

export const isLegacyAndroidBluetooth = () => Platform.OS === 'android' && Number(Platform.Version) < 31;

function androidBluetoothPermissions() {
  return isLegacyAndroidBluetooth()
    ? [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
    : [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT];
}

async function wasAsked(kind: PermissionKind): Promise<boolean> {
  try { return (await AsyncStorage.getItem(permissionAskedKey(kind))) === 'asked'; } catch { return false; }
}

async function markAsked(kind: PermissionKind): Promise<void> {
  try { await AsyncStorage.setItem(permissionAskedKey(kind), 'asked'); } catch { /* sin marca: se consulta de nuevo */ }
}

/** `shouldShowRequestPermissionRationale` del módulo nativo; false si no está disponible. */
async function androidRationale(permission: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const native = require('react-native/Libraries/PermissionsAndroid/NativePermissionsAndroid').default;
    return native ? Boolean(await native.shouldShowRequestPermissionRationale(permission)) : false;
  } catch { return false; }
}

async function readAndroidBluetooth(): Promise<PermissionState> {
  const permissions = androidBluetoothPermissions();
  const granted = (await Promise.all(permissions.map(permission => PermissionsAndroid.check(permission)))).every(Boolean);
  if (granted) return { status: 'granted', canAskAgain: false };
  const rationale = (await Promise.all(permissions.map(androidRationale))).some(Boolean);
  return androidRuntimeState({ granted, rationale, asked: await wasAsked('bluetooth') });
}

async function readIosBluetooth(): Promise<PermissionState> {
  // Crear el gestor de CoreBluetooth muestra el diálogo si aún no se decidió: sólo
  // se consulta después de la primera solicitud, que deja la marca por instalación.
  if (!(await wasAsked('bluetooth'))) return { status: 'undetermined', canAskAgain: true };
  const { getManager } = await import('./bleService');
  return bluetoothState(await getManager().state());
}

function readNotificationResponse(response: Notifications.NotificationPermissionsStatus): PermissionState {
  const provisional = response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    response.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
  return notificationState(response, provisional);
}

export async function readPermission(kind: PermissionKind): Promise<PermissionState> {
  try {
    if (kind === 'bluetooth') {
      if (Platform.OS === 'android') return await readAndroidBluetooth();
      if (Platform.OS === 'ios') return await readIosBluetooth();
      return unavailable;
    }
    if (kind === 'location') return locationState(await Location.getForegroundPermissionsAsync());
    if (kind === 'camera') return toPermissionState(await Camera.getCameraPermissionsAsync());
    return readNotificationResponse(await Notifications.getPermissionsAsync());
  } catch { return failed; }
}

export async function readPermissions(): Promise<PermissionSnapshot> {
  const values = await Promise.all(PERMISSION_KINDS.map(readPermission));
  return { bluetooth: values[0], location: values[1], camera: values[2], notifications: values[3] };
}

async function requestIosBluetooth(): Promise<PermissionState> {
  await markAsked('bluetooth');
  const { getManager } = await import('./bleService');
  const manager = getManager();
  const current = bluetoothState(await manager.state());
  if (current.status !== 'undetermined') return current;
  // Espera acotada al diálogo o al estado de CoreBluetooth, sin escanear equipos.
  // Si vence, el resultado es «sin decidir», nunca una autorización.
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
      if (result.status !== 'undetermined') finish(result);
    }, true);
    if (settled) subscription.remove();
  });
}

async function nativeRequest(kind: PermissionKind, language: 'es' | 'en'): Promise<PermissionState> {
  if (kind === 'bluetooth') {
    if (Platform.OS === 'android') {
      await markAsked('bluetooth');
      const response = await PermissionsAndroid.requestMultiple(androidBluetoothPermissions());
      return androidRequestState(Object.values(response));
    }
    if (Platform.OS === 'ios') return requestIosBluetooth();
    return unavailable;
  }
  if (kind === 'location') return locationState(await Location.requestForegroundPermissionsAsync());
  if (kind === 'camera') return toPermissionState(await Camera.requestCameraPermissionsAsync());
  await prepareNotificationChannels(language);
  return readNotificationResponse(await Notifications.requestPermissionsAsync());
}

// Una sola solicitud nativa activa: dos toques seguidos o dos pantallas no apilan diálogos.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Solicita el permiso desde una acción explícita. Revalida antes de pedir: si ya está
 * concedido o el sistema no volverá a preguntar, devuelve el estado sin abrir diálogos.
 */
export function requestPermission(kind: PermissionKind, language: 'es' | 'en' = 'es'): Promise<PermissionState> {
  return exclusive(async () => {
    const current = await readPermission(kind);
    if (current.status === 'granted' || current.status === 'unavailable' || current.status === 'restricted' || !current.canAskAgain) {
      return current;
    }
    try { return await nativeRequest(kind, language); } catch { return failed; }
  });
}

/** Abre los ajustes de TerraSense en el teléfono. Sólo tras una acción de la persona. */
export function openPermissionSettings(): Promise<void> {
  return Linking.openSettings();
}
