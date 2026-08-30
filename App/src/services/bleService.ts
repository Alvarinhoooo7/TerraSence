// src/services/bleService.ts
//
// Enlace BLE con la sonda TerraSense mediante `react-native-ble-plx`.
//
// El ESP32 hace de puente: consulta la sonda por RS-485 Modbus RTU y publica
// el resultado ya decodificado en una característica GATT de 16 bytes, para no
// obligar al teléfono a hablar Modbus.
//
// Decisiones de diseño:
//   · Un único BleManager para toda la app. Crear varios deja radios abiertas.
//   · Escaneo filtrado por UUID de servicio: no se enumeran dispositivos ajenos.
//   · Todo tiene tiempo límite. Una promesa BLE sin timeout deja la interfaz
//     colgada de forma indefinida, que es el fallo más común de estas apps.
//   · La conexión se cierra siempre en `finally`: si se deja abierta, la sonda
//     no vuelve a sueño profundo y se agota la batería en días.

import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  decodeTelemetry,
  TERRASENSE_IDENTITY_UUID,
  TERRASENSE_PROVISIONING_UUID,
  TERRASENSE_SERVICE_UUID,
  TERRASENSE_TELEMETRY_UUID,
} from './probeService';
import { isValidDeviceId, normalizeDeviceId } from '../utils/deviceId';
import type { SoilMeasurement } from '../types/agronomy';

const SCAN_TIMEOUT_MS = 12_000;
const NOTIFY_TIMEOUT_MS = 15_000;

let manager: BleManager | null = null;

/** Instancia única y perezosa: crearla al importar rompe las pruebas y Expo Go. */
export function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

export function destroyManager(): void {
  manager?.destroy();
  manager = null;
}

/**
 * Permisos de Android 12+.
 *
 * `BLUETOOTH_SCAN` se declara con `neverForLocation`, así que no hace falta
 * pedir ubicación para escanear. Se pide igualmente `ACCESS_FINE_LOCATION`
 * porque la medición sí necesita georreferenciarse, pero son cosas distintas
 * y conviene no confundirlas.
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  const permissions =
    api >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const granted = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(granted).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

/** Espera a que la radio esté encendida antes de escanear. */
async function waitForPoweredOn(timeoutMs = 6000): Promise<void> {
  const mgr = getManager();
  const state = await mgr.state();
  if (state === 'PoweredOn') return;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('El Bluetooth está apagado. Actívalo para leer la sonda.'));
    }, timeoutMs);

    const sub: Subscription = mgr.onStateChange((s) => {
      if (s === 'PoweredOn') {
        clearTimeout(timer);
        sub.remove();
        resolve();
      }
    }, true);
  });
}

const decodeBase64Text = (value?: string | null): string => {
  if (!value) return '';
  try {
    return globalThis.atob(value);
  } catch {
    return '';
  }
};

const encodeBase64Text = (value: string): string => globalThis.btoa(value);

/** Código anunciado por el firmware para distinguir sondas cercanas. */
function advertisedDeviceCode(device: Device): string | null {
  const haystack = [
    device.localName,
    device.name,
    decodeBase64Text(device.manufacturerData),
  ]
    .filter(Boolean)
    .join(' ');
  const match = haystack.match(/[1-9]\d{14}/);
  return match?.[0] ?? null;
}

/**
 * Busca una sonda TerraSense al alcance. Cuando se entrega un código sólo
 * acepta el anuncio de esa sonda; así una medición nunca termina asociada a
 * otro equipo cercano.
 */
export async function scanForProbe(expectedDeviceCode?: string): Promise<Device> {
  const mgr = getManager();
  await waitForPoweredOn();
  const expected = expectedDeviceCode ? normalizeDeviceId(expectedDeviceCode) : null;

  return new Promise<Device>((resolve, reject) => {
    const timer = setTimeout(() => {
      mgr.stopDeviceScan();
      reject(
        new Error(
          expected
            ? 'No se encontró la sonda seleccionada. Comprueba que esté encendida y que su código coincida con el equipo activo.'
            : 'No se encontró ninguna sonda cerca. Comprueba que esté encendida y a menos de 30 metros.',
        ),
      );
    }, SCAN_TIMEOUT_MS);

    mgr.startDeviceScan([TERRASENSE_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
      if (error) {
        clearTimeout(timer);
        mgr.stopDeviceScan();
        reject(new Error(`Fallo al buscar la sonda: ${error.message}`));
        return;
      }
      if (device && (!expected || advertisedDeviceCode(device) === expected)) {
        clearTimeout(timer);
        mgr.stopDeviceScan();
        resolve(device);
      }
    });
  });
}

export interface PairedProbeIdentity {
  /** Identificador que entrega el sistema operativo para esta radio. */
  bleId: string;
  name: string;
  /** Código ya provisionado, si el ESP32 conserva uno en NVS. */
  assignedCode: string | null;
}

async function readAssignedCode(device: Device): Promise<string | null> {
  try {
    const characteristic = await device.readCharacteristicForService(
      TERRASENSE_SERVICE_UUID,
      TERRASENSE_IDENTITY_UUID,
    );
    const code = normalizeDeviceId(decodeBase64Text(characteristic.value));
    return isValidDeviceId(code) ? code : null;
  } catch {
    return null;
  }
}

/**
 * Comprueba presencia física de una sonda en modo pairing.
 *
 * El usuario debe mantener pulsado PAIR durante 3 segundos: sólo entonces el
 * firmware anuncia el UUID de TerraSense. Conectar y descubrir los servicios
 * evita registrar por accidente un anuncio BLE incompleto o un dispositivo
 * que sólo suplante el nombre comercial.
 */
export async function pairWithNearbyProbe(): Promise<PairedProbeIdentity> {
  const discovered = await scanForProbe();
  let connected: Device | null = null;

  try {
    connected = await discovered.connect();
    await connected.discoverAllServicesAndCharacteristics();
    return {
      bleId: connected.id,
      name: connected.localName ?? connected.name ?? 'Sonda TerraSense',
      assignedCode: await readAssignedCode(connected),
    };
  } finally {
    if (connected) await connected.cancelConnection().catch(() => undefined);
  }
}

/**
 * Graba el Device ID de Supabase en la NVS del ESP32.
 *
 * El firmware sólo debe aceptar esta característica durante los 30 segundos
 * posteriores a mantener PAIR por 3 s. Después anuncia `TerraSense-<código>`
 * para que otros teléfonos puedan identificar la misma sonda sin depender de
 * la MAC/UUID que asigna cada sistema operativo.
 */
export async function provisionProbe(bleId: string, rawCode: string): Promise<void> {
  const code = normalizeDeviceId(rawCode);
  if (!isValidDeviceId(code)) throw new Error('El código de provisión no es válido.');

  const mgr = getManager();
  let connected: Device | null = null;
  try {
    connected = await mgr.connectToDevice(bleId);
    await connected.discoverAllServicesAndCharacteristics();
    await connected.writeCharacteristicWithResponseForService(
      TERRASENSE_SERVICE_UUID,
      TERRASENSE_PROVISIONING_UUID,
      encodeBase64Text(code),
    );

    const confirmed = await readAssignedCode(connected);
    if (confirmed !== code) {
      throw new Error('La sonda no confirmó el código. Mantén PAIR 3 segundos y reintenta.');
    }
  } finally {
    if (connected) await connected.cancelConnection().catch(() => undefined);
  }
}

/**
 * Conecta, lee una notificación de telemetría y desconecta.
 *
 * Se usa la característica en modo *notify* y no *read* porque la sonda tarda
 * en estabilizarse: el firmware notifica cuando el dato es válido, en lugar de
 * devolver una lectura prematura.
 */
export async function readTelemetryOverBle(deviceCode?: string): Promise<SoilMeasurement> {
  const mgr = getManager();
  let connected: Device | null = null;

  try {
    const target = await (await scanForProbe(deviceCode)).connect();
    connected = target;

    await target.discoverAllServicesAndCharacteristics();

    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        subscription?.remove();
        reject(new Error('La sonda no respondió a tiempo. Reinserta la sonda y reintenta.'));
      }, NOTIFY_TIMEOUT_MS);

      const subscription = target.monitorCharacteristicForService(
        TERRASENSE_SERVICE_UUID,
        TERRASENSE_TELEMETRY_UUID,
        (error, characteristic) => {
          if (error) {
            clearTimeout(timer);
            subscription?.remove();
            reject(new Error(`Fallo de lectura BLE: ${error.message}`));
            return;
          }
          if (!characteristic?.value) return;

          clearTimeout(timer);
          subscription?.remove();

          // react-native-ble-plx entrega el valor en base64.
          const binary = globalThis.atob(characteristic.value);
          const out = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
          resolve(out);
        },
      );
    });

    return decodeTelemetry(bytes);
  } finally {
    // Imprescindible: sin desconectar, la sonda no vuelve a sueño profundo.
    if (connected) {
      await connected.cancelConnection().catch(() => undefined);
    }
  }
}
