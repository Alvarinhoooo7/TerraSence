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
import { decodeTelemetry, TERRASENSE_SERVICE_UUID, TERRASENSE_TELEMETRY_UUID } from './probeService';
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

/** Busca la primera sonda TerraSense al alcance. */
export async function scanForProbe(): Promise<Device> {
  const mgr = getManager();
  await waitForPoweredOn();

  return new Promise<Device>((resolve, reject) => {
    const timer = setTimeout(() => {
      mgr.stopDeviceScan();
      reject(
        new Error(
          'No se encontró ninguna sonda cerca. Comprueba que esté encendida y a menos de 30 metros.',
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
      if (device) {
        clearTimeout(timer);
        mgr.stopDeviceScan();
        resolve(device);
      }
    });
  });
}

/**
 * Conecta, lee una notificación de telemetría y desconecta.
 *
 * Se usa la característica en modo *notify* y no *read* porque la sonda tarda
 * en estabilizarse: el firmware notifica cuando el dato es válido, en lugar de
 * devolver una lectura prematura.
 */
export async function readTelemetryOverBle(deviceId?: string): Promise<SoilMeasurement> {
  const mgr = getManager();
  let connected: Device | null = null;

  try {
    const target = deviceId ? await mgr.connectToDevice(deviceId) : await (await scanForProbe()).connect();
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
