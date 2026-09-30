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

/**
 * iOS: la autorización se lee de `CBManager.authorization` (módulo nativo propio), que no crea
 * ningún gestor ni abre el diálogo, y sobrevive a restablecer la privacidad del teléfono.
 * Con la autorización concedida, crear `BleManager` ya no muestra diálogo, así que se consulta
 * la radio para distinguir «Bluetooth apagado» de «permiso denegado».
 *
 * Respaldo: si el módulo nativo no existe (binario sin recompilar, Expo Go), `requireNativeModule`
 * lanza. Sólo en ese caso se vuelve al criterio anterior: sin la marca local de «ya se pidió» se
 * responde «sin decidir» sin crear `BleManager` (crearlo abriría el diálogo antes de la primera
 * solicitud); con la marca, se consulta el estado del gestor.
 */
async function readIosBluetooth(): Promise<PermissionState> {
  let authorization: PermissionState;
  try {
    const { readIosBluetoothAuthorization } = await import('./iosBluetoothAuthorization');
    authorization = readIosBluetoothAuthorization();
  } catch {
    if (!(await wasAsked('bluetooth'))) return { status: 'undetermined', canAskAgain: true };
    const { getManager } = await import('./bleService');
    return bluetoothState(await getManager().state());
  }
  if (authorization.status !== 'granted') return authorization;
  try {
    const { getManager } = await import('./bleService');
    const radio = bluetoothState(await getManager().state());
    if (radio.status === 'unavailable') return radio;
    if (radio.poweredOff) return { ...authorization, poweredOff: true };
  } catch { /* sin estado de la radio: se informa la autorización, que es lo consultado */ }
  return authorization;
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
    let dialogFinished = false;
    let releaseDialog: (() => void) | undefined;
    // El resultado puede vencer antes que el diálogo del sistema. La cola sigue
    // bloqueada hasta que CoreBluetooth indique una decisión.
    iosDialogBarrier = new Promise<void>(done => { releaseDialog = done; });
    const release = () => {
      if (dialogFinished) return;
      dialogFinished = true;
      clearInterval(poll);
      subscription?.remove();
      releaseDialog?.();
      iosDialogBarrier = null;
    };
    const finish = (result: PermissionState) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (result.status !== 'undetermined') release();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ status: 'undetermined', canAskAgain: true }), 20000);
    const poll = setInterval(() => {
      void readIosBluetooth().then(state => {
        if (state.status === 'undetermined' || state.status === 'error') return;
        finish(state);
        release();
      }).catch(() => undefined);
    }, 750);
    subscription = manager.onStateChange(state => {
      const result = bluetoothState(state);
      if (result.status !== 'undetermined') { finish(result); release(); }
    }, true);
    if (dialogFinished) subscription.remove();
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
let iosDialogBarrier: Promise<void> | null = null;
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    if (iosDialogBarrier) await iosDialogBarrier;
    return work();
  });
  queue = run.then(async () => { if (iosDialogBarrier) await iosDialogBarrier; }, async () => { if (iosDialogBarrier) await iosDialogBarrier; });
  return run;
}

/**
 * Solicita el permiso desde una acción explícita. Revalida antes de pedir: si ya está
 * concedido o el sistema no volverá a preguntar, devuelve el estado sin abrir diálogos.
 */
export function requestPermission(kind: PermissionKind, language: 'es' | 'en' = 'es', isActive: () => boolean = () => true): Promise<PermissionState> {
  return exclusive(async () => {
    if (!isActive()) return { status: 'undetermined', canAskAgain: true };
    const current = await readPermission(kind);
    if (!isActive()) return current;
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
