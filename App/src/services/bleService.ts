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
import type { SoilMeasurement } from '../types/agronomy';

const SCAN_TIMEOUT_MS = 12_000;
const NOTIFY_TIMEOUT_MS = 15_000;
let transactionSequence = 0;
const cancelled = () => new Error('Operación Bluetooth cancelada.');
const ensureActive = (signal?: AbortSignal) => { if (signal?.aborted) throw cancelled(); };

function gattOperation<T>(work: (id: string) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const id = `terrasense-${++transactionSequence}`;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let started = false;
    const finish = (error?: Error, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error); else resolve(value as T);
    };
    const stop = (error: Error) => {
      if (settled) return;
      if (started) void getManager().cancelTransaction(id).catch(() => undefined);
      finish(error);
    };
    const onAbort = () => stop(cancelled());
    const timer = setTimeout(() => stop(new Error('La sonda no respondió a tiempo. Acércala y vuelve a activar el modo PAIR.')), NOTIFY_TIMEOUT_MS);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) { onAbort(); return; }
    Promise.resolve().then(() => {
      if (settled || signal?.aborted) return;
      started = true;
      return work(id);
    }).then(value => { if (!settled) finish(undefined, value as T); }, error => finish(error instanceof Error ? error : new Error(String(error))));
  });
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
async function waitForPoweredOn(timeoutMs = 6000, signal?: AbortSignal): Promise<void> {
  ensureActive(signal);
  const mgr = getManager();
  const state = await mgr.state();
  ensureActive(signal);
  if (state === 'PoweredOn') return;

  await new Promise<void>((resolve, reject) => {
    let sub: Subscription | undefined;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub?.remove();
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error); else resolve();
    };
    const onAbort = () => finish(cancelled());
    const timer = setTimeout(() => {
      finish(new Error('El Bluetooth está apagado. Actívalo para leer la sonda.'));
    }, timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    sub = mgr.onStateChange((s) => {
      if (s === 'PoweredOn') {
        finish();
      } else if (s === 'Unauthorized' || s === 'Unsupported') {
        finish(new Error(s === 'Unauthorized' ? 'Activa el permiso de Bluetooth en Ajustes.' : 'Bluetooth no está disponible en este dispositivo.'));
      }
    }, true);
    if (settled) sub.remove();
    if (signal?.aborted) onAbort();
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
let activeScan: { cancel: () => void } | null = null;
// La API nativa comparte un solo escáner. Un stop anterior debe terminar antes del start siguiente.
let scanTransition: Promise<void> = Promise.resolve();
function enqueueScanTransition(action: () => Promise<void>): Promise<void> {
  const next = scanTransition.then(action, action);
  scanTransition = next.catch(() => undefined);
  return next;
}
export async function scanForProbe(expectedDeviceCode?: string, signal?: AbortSignal): Promise<Device> {
  ensureActive(signal);
  const mgr = getManager();
  await waitForPoweredOn(6000, signal);
  ensureActive(signal);
  const expected = expectedDeviceCode ? normalizeDeviceId(expectedDeviceCode) : null;

  return new Promise<Device>((resolve, reject) => {
    let settled = false;
    const scan = { cancel: () => finish(cancelled()) };
    const finish = (error: Error | null, device?: Device) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (activeScan === scan) {
        activeScan = null;
        void enqueueScanTransition(() => mgr.stopDeviceScan()).catch(() => undefined);
      }
      if (error) reject(error);
      else if (device) resolve(device);
    };
    const onAbort = () => finish(cancelled());
    const timer = setTimeout(() => {
      finish(
        new Error(
          expected
            ? 'No se encontró la sonda seleccionada. Comprueba que esté encendida y que su código coincida con el equipo activo.'
            : 'No se encontró ninguna sonda cerca. Comprueba que esté encendida y a menos de 30 metros.',
        ),
      );
    }, SCAN_TIMEOUT_MS);

    activeScan?.cancel();
    activeScan = scan;
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) { onAbort(); return; }
    void enqueueScanTransition(() => {
      if (settled || activeScan !== scan) return Promise.resolve();
      return mgr.startDeviceScan([TERRASENSE_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
        if (settled || activeScan !== scan) return;
        if (error) {
          finish(new Error(`Fallo al buscar la sonda: ${error.message}`));
          return;
        }
        if (device && (!expected || advertisedDeviceCode(device) === expected)) {
          finish(null, device);
        }
      });
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

async function readProbeStatus(device: Device, signal?: AbortSignal): Promise<ProbeStatus | null> {
  try {
    const characteristic = await gattOperation(id => device.readCharacteristicForService(
      TERRASENSE_SERVICE_UUID,
      TERRASENSE_STATUS_UUID,
      id,
    ), signal);
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
async function reportContact(device: Device, deviceCode: string | null, known?: ProbeStatus | null, signal?: AbortSignal): Promise<void> {
  if (!deviceCode) return;
  const status = known === undefined ? await readProbeStatus(device, signal) : known;
  ensureActive(signal);
  void recordProbeContact({
    deviceCode,
    battery: status?.battery ?? null,
    firmwareVersion: status?.firmwareVersion ?? null,
  }).catch(() => undefined);
}

/** El ID que la sonda deriva de su MAC. Un firmware anterior lo dejaba vacío. */
async function readDeviceCode(device: Device, signal?: AbortSignal): Promise<string> {
  const characteristic = await gattOperation(id => device.readCharacteristicForService(
    TERRASENSE_SERVICE_UUID,
    TERRASENSE_IDENTITY_UUID,
    id,
  ), signal);
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
export async function pairWithNearbyProbe(signal?: AbortSignal): Promise<PairedProbeIdentity> {
  const discovered = await scanForProbe(undefined, signal);
  ensureActive(signal);
  let connected: Device | null = null;

  try {
    connected = await discovered.connect({ timeout: SCAN_TIMEOUT_MS });
    ensureActive(signal);
    const target = connected;
    await gattOperation(id => target.discoverAllServicesAndCharacteristics(id), signal);
    ensureActive(signal);
    const deviceCode = await readDeviceCode(connected, signal);
    ensureActive(signal);
    const status = await readProbeStatus(connected, signal);
    ensureActive(signal);
    await reportContact(connected, deviceCode, status, signal);
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
export async function readTelemetryOverBle(deviceCode?: string, signal?: AbortSignal): Promise<SoilMeasurement> {
  const mgr = getManager();
  let connected: Device | null = null;

  try {
    const discovered = await scanForProbe(deviceCode, signal);
    ensureActive(signal);
    const target = await discovered.connect({ timeout: SCAN_TIMEOUT_MS });
    connected = target;
    ensureActive(signal);

    await gattOperation(id => target.discoverAllServicesAndCharacteristics(id), signal);
    ensureActive(signal);

    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      let settled = false;
      let subscription: Subscription | undefined;
      const finish = (error?: Error, value?: Uint8Array) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        subscription?.remove();
        signal?.removeEventListener('abort', onAbort);
        if (error) reject(error); else if (value) resolve(value);
      };
      const onAbort = () => finish(cancelled());
      const timer = setTimeout(() => {
        finish(new Error('La sonda no respondió a tiempo. Reinserta la sonda y reintenta.'));
      }, NOTIFY_TIMEOUT_MS);
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) { onAbort(); return; }
      subscription = target.monitorCharacteristicForService(
        TERRASENSE_SERVICE_UUID,
        TERRASENSE_TELEMETRY_UUID,
        (error, characteristic) => {
          if (settled) return;
          if (error) {
            finish(new Error(`Fallo de lectura BLE: ${error.message}`));
            return;
          }
          if (!characteristic?.value) return;

          // react-native-ble-plx entrega el valor en base64.
          const binary = globalThis.atob(characteristic.value);
          const out = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
          finish(undefined, out);
        },
      );
      if (settled) subscription.remove();
    });
    ensureActive(signal);

    // Antes de decodificar: una trama sin lectura de suelo se rechaza, pero la
    // sonda igual conversó con el teléfono.
    await reportContact(target, deviceCode ?? null, undefined, signal);
    ensureActive(signal);
    return decodeTelemetry(bytes);
  } finally {
    // Imprescindible: sin desconectar, la sonda no vuelve a sueño profundo.
    if (connected) {
      await connected.cancelConnection().catch(() => undefined);
    }
  }
}
