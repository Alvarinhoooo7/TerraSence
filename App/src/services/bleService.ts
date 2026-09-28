// src/services/bleService.ts
//
// Enlace BLE con la sonda TerraSense mediante `react-native-ble-plx`.
//
// El ESP32 hace de puente: consulta la sonda por RS-485 Modbus RTU y publica
// el resultado ya decodificado en una característica GATT de 20 bytes, para no
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
import {
  decodeProbeStatus,
  decodeTelemetry,
  type ProbeStatus,
  TERRASENSE_IDENTITY_UUID,
  TERRASENSE_PROVISIONING_UUID,
  TERRASENSE_SERVICE_UUID,
  TERRASENSE_STATUS_UUID,
  TERRASENSE_TELEMETRY_UUID,
} from './probeService';
import { recordProbeContact } from './contactService';
import { isValidDeviceId, normalizeDeviceId } from '../utils/deviceId';
import { timedOperation } from '../utils/timedOperation';
import type { SoilMeasurement } from '../types/agronomy';

const SCAN_TIMEOUT_MS = 12_000;
const NOTIFY_TIMEOUT_MS = 15_000;
let transactionSequence = 0;

function gattOperation<T>(work: (id: string) => Promise<T>): Promise<T> {
  const id = `terrasense-${++transactionSequence}`;
  return timedOperation(work(id), NOTIFY_TIMEOUT_MS,
    () => { void getManager().cancelTransaction(id).catch(() => undefined); },
    'La sonda no respondió a tiempo. Acércala y vuelve a activar el modo PAIR.');
}

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

/** Espera a que la radio esté encendida antes de escanear. */
async function waitForPoweredOn(timeoutMs = 6000): Promise<void> {
  const mgr = getManager();
  const state = await mgr.state();
  if (state === 'PoweredOn') return;

  await new Promise<void>((resolve, reject) => {
    let sub: Subscription | undefined;
    let settled = false;
    const timer = setTimeout(() => {
      sub?.remove();
      reject(new Error('El Bluetooth está apagado. Actívalo para leer la sonda.'));
    }, timeoutMs);

    sub = mgr.onStateChange((s) => {
      if (s === 'PoweredOn') {
        settled = true;
        clearTimeout(timer);
        sub?.remove();
        resolve();
      } else if (s === 'Unauthorized' || s === 'Unsupported') {
        settled = true;
        clearTimeout(timer);
        sub?.remove();
        reject(new Error(s === 'Unauthorized' ? 'Activa el permiso de Bluetooth en Ajustes.' : 'Bluetooth no está disponible en este dispositivo.'));
      }
    }, true);
    if (settled) sub.remove();
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
  // El ID puede empezar con 0: se exige que no esté pegado a otros dígitos.
  const match = haystack.match(/(?:^|\D)(\d{15})(?!\d)/);
  return match?.[1] ?? null;
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
    let settled = false;
    const finish = (error: Error | null, device?: Device) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void mgr.stopDeviceScan().catch(() => undefined);
      if (error) reject(error);
      else if (device) resolve(device);
    };
    const timer = setTimeout(() => {
      finish(
        new Error(
          expected
            ? 'No se encontró la sonda seleccionada. Comprueba que esté encendida y que su código coincida con el equipo activo.'
            : 'No se encontró ninguna sonda cerca. Comprueba que esté encendida y a menos de 30 metros.',
        ),
      );
    }, SCAN_TIMEOUT_MS);

    void mgr.startDeviceScan([TERRASENSE_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
      if (error) {
        finish(new Error(`Fallo al buscar la sonda: ${error.message}`));
        return;
      }
      if (device && (!expected || advertisedDeviceCode(device) === expected)) {
        finish(null, device);
      }
    }).catch(error => finish(new Error(`No se pudo iniciar Bluetooth: ${String(error)}`)));
  });
}

export interface PairedProbeIdentity {
  /** Identificador que entrega el sistema operativo para esta radio. */
  bleId: string;
  name: string;
  /** ID de 15 dígitos que la sonda deriva de su MAC. Nunca cambia. */
  deviceCode: string;
  /** La ventana PAIR estaba abierta al leerla: prueba de que la tienen en la mano. */
  pairingOpen: boolean;
}

async function readProbeStatus(device: Device): Promise<ProbeStatus | null> {
  try {
    const characteristic = await gattOperation(id => device.readCharacteristicForService(
      TERRASENSE_SERVICE_UUID,
      TERRASENSE_STATUS_UUID,
      id,
    ));
    if (!characteristic.value) return null;
    const binary = globalThis.atob(characteristic.value);
    return decodeProbeStatus(Uint8Array.from(binary, c => c.charCodeAt(0)));
  } catch {
    return null;  // firmware sin característica de estado
  }
}

/**
 * Informa el contacto a Supabase con la batería y la versión de la
 * característica de estado. Nunca lanza ni retiene el flujo: sin estado, se
 * informa sólo la hora.
 */
async function reportContact(device: Device, deviceCode: string | null, known?: ProbeStatus | null): Promise<void> {
  if (!deviceCode) return;
  const status = known === undefined ? await readProbeStatus(device) : known;
  void recordProbeContact({
    deviceCode,
    battery: status?.battery ?? null,
    firmwareVersion: status?.firmwareVersion ?? null,
  }).catch(() => undefined);
}

/** El ID que la sonda deriva de su MAC. Un firmware anterior lo dejaba vacío. */
async function readDeviceCode(device: Device): Promise<string> {
  const characteristic = await gattOperation(id => device.readCharacteristicForService(
    TERRASENSE_SERVICE_UUID,
    TERRASENSE_IDENTITY_UUID,
    id,
  ));
  const code = characteristic.value ? decodeBase64Text(characteristic.value).trim() : '';
  if (!/^\d{15}$/.test(code)) {
    throw new Error('No se pudo verificar la identidad de la sonda. Si es un equipo anterior, actualiza su firmware.');
  }
  return code;
}

/**
 * Busca la sonda cercana, lee su ID y si la ventana PAIR está abierta.
 *
 * El ID no lo inventa la app: lo deriva el firmware de la MAC del ESP32, así
 * que siempre es el mismo para la misma sonda. Vincular exige la ventana PAIR
 * abierta (mantener el botón 3 s), que prueba que el usuario tiene la sonda en
 * la mano; quien llama debe comprobar `pairingOpen` antes de registrarla.
 */
export async function pairWithNearbyProbe(): Promise<PairedProbeIdentity> {
  const discovered = await scanForProbe();
  let connected: Device | null = null;

  try {
    connected = await discovered.connect({ timeout: SCAN_TIMEOUT_MS });
    const target = connected;
    await gattOperation(id => target.discoverAllServicesAndCharacteristics(id));
    const deviceCode = await readDeviceCode(connected);
    const status = await readProbeStatus(connected);
    await reportContact(connected, deviceCode, status);
    return {
      bleId: connected.id,
      name: connected.localName ?? connected.name ?? 'Sonda TerraSense',
      deviceCode,
      pairingOpen: status?.pairingOpen === true,
    };
  } finally {
    if (connected) await connected.cancelConnection().catch(() => undefined);
  }
}

/**
 * Confirma a la sonda que quedó registrada: escribe su ID en la
 * característica de confirmación. El firmware la acepta sólo con la ventana
 * PAIR abierta, la cierra y avisa con luz verde y buzzer. Es aviso, no
 * registro: el equipo ya quedó registrado en Supabase, así que un fallo aquí
 * no deshace nada y sólo se informa como `false`.
 */
export async function confirmPairing(bleId: string, rawCode: string): Promise<boolean> {
  const code = normalizeDeviceId(rawCode);
  if (!isValidDeviceId(code)) return false;
  const mgr = getManager();
  let connected: Device | null = null;
  try {
    connected = await mgr.connectToDevice(bleId, { timeout: SCAN_TIMEOUT_MS });
    const target = connected;
    await gattOperation(id => target.discoverAllServicesAndCharacteristics(id));
    await gattOperation(id => target.writeCharacteristicWithResponseForService(
      TERRASENSE_SERVICE_UUID,
      TERRASENSE_PROVISIONING_UUID,
      encodeBase64Text(code),
      id,
    ));
    const status = await readProbeStatus(target);
    return status?.pairingOpen === false;
  } catch {
    return false;
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
    const target = await (await scanForProbe(deviceCode)).connect({ timeout: SCAN_TIMEOUT_MS });
    connected = target;

    await gattOperation(id => target.discoverAllServicesAndCharacteristics(id));

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

    // Antes de decodificar: una trama sin lectura de suelo se rechaza, pero la
    // sonda igual conversó con el teléfono.
    await reportContact(target, deviceCode ?? null);
    return decodeTelemetry(bytes);
  } finally {
    // Imprescindible: sin desconectar, la sonda no vuelve a sueño profundo.
    if (connected) {
      await connected.cancelConnection().catch(() => undefined);
    }
  }
}
