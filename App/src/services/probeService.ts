// src/services/probeService.ts
//
// Lectura de la sonda de suelo 7-en-1 (SKU AliExpress 1005005697940574).
//
// El ESP32 hace de puente: consulta la sonda por RS-485 Modbus RTU y expone el
// resultado ya decodificado en una característica BLE de 16 bytes, para no
// obligar al teléfono a hablar Modbus.
//
// Trama Modbus que emite el firmware (documentada en README §5.5):
//   Consulta : 01 03 00 00 00 07 04 08     (8 bytes, CRC16 verificado)
//   Respuesta: 01 03 0E <14 bytes de datos> <CRC>   (19 bytes)
//
// Mientras no haya equipo emparejado, se devuelven datos SIMULADOS y se marca
// el resultado con `simulated: true`. La UI está obligada a mostrarlo: es
// preferible un banner incómodo a que alguien confunda una demo con una
// medición real de campo.

import type { SoilMeasurement } from '../types/agronomy';

/** Servicio y característica GATT de TerraSense (README §5.5). */
export const TERRASENSE_SERVICE_UUID = '00000001-5e4e-4c69-6d61-746572726101';
export const TERRASENSE_TELEMETRY_UUID = '00000002-5e4e-4c69-6d61-746572726102';
/** Código estable de 15 dígitos guardado por el ESP32 en NVS. */
export const TERRASENSE_IDENTITY_UUID = '00000003-5e4e-4c69-6d61-746572726103';
/** Escritura permitida únicamente durante la ventana física de pairing. */
export const TERRASENSE_PROVISIONING_UUID = '00000004-5e4e-4c69-6d61-746572726104';

export interface ProbeReading {
  data: SoilMeasurement;
  simulated: boolean;
}

export interface ProbeConnection {
  connected: boolean;
  simulated: boolean;
  message?: string;
}

/**
 * Verifica presencia de la sonda sin mostrar un selector BLE al usuario.
 * En desarrollo/Expo Go permite continuar en modo demo, siempre identificado.
 */
export async function verifySoilProbe(deviceCode: string | null): Promise<ProbeConnection> {
  if (!deviceCode) {
    return {
      connected: __DEV__,
      simulated: __DEV__,
      message: __DEV__ ? 'Modo demostración: no hay una sonda vinculada.' : 'No hay una sonda vinculada a esta cuenta.',
    };
  }
  try {
    const { requestBlePermissions, scanForProbe } = await import('./bleService');
    if (!(await requestBlePermissions())) {
      return { connected: false, simulated: false, message: 'Activa el permiso de Bluetooth para continuar.' };
    }
    await scanForProbe(deviceCode);
    return { connected: true, simulated: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nativeUnavailable = /native|module|Expo Go/i.test(message);
    if (__DEV__ && nativeUnavailable) {
      return { connected: true, simulated: true, message: 'Modo demostración: Bluetooth nativo no disponible.' };
    }
    return { connected: false, simulated: false, message };
  }
}

/**
 * Decodifica el paquete binario de 16 bytes que emite el ESP32.
 *
 * Los 7 primeros valores replican el orden de los registros Modbus de la sonda;
 * los factores de escala son los del fabricante.
 *
 * ⚠️ Pendiente de confirmar contra la ficha del vendedor (README §5.3.1): si el
 * mapa de registros difiere, hay que ajustar ESTA función y el driver del
 * firmware, no la UI.
 */
export function decodeTelemetry(bytes: Uint8Array): SoilMeasurement {
  if (bytes.length < 16) {
    throw new Error(`Paquete BLE incompleto: ${bytes.length} bytes de 16 esperados.`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, false); // big-endian, como Modbus
  const i16 = (offset: number) => view.getInt16(offset, false);

  return {
    vwc: u16(0) / 10,        // 0x015E = 350 -> 35,0 %
    temp: i16(2) / 10,       // signed: admite temperatura de suelo bajo 0 °C
    ec: u16(4),              // µS/cm directo
    ph: u16(6) / 10,         // 0x0041 = 65 -> 6,5 pH
    nitrogen: u16(8),        // mg/kg
    phosphorus: u16(10),     // mg/kg
    potassium: u16(12),      // mg/kg
    lux: 0,                  // no lo entrega esta sonda
    battery: bytes[14],      // porcentaje
  };
}

/** Valores plausibles para demostración, con algo de dispersión realista. */
function simulate(): SoilMeasurement {
  const jitter = (base: number, spread: number) =>
    Math.round((base + (Math.random() - 0.5) * spread) * 10) / 10;

  return {
    vwc: jitter(28, 14),
    temp: jitter(15, 9),
    ec: Math.round(jitter(950, 1400)),
    ph: jitter(6.2, 1.8),
    nitrogen: Math.round(jitter(58, 60)),
    phosphorus: Math.round(jitter(32, 40)),
    potassium: Math.round(jitter(120, 130)),
    lux: 0,
    battery: 94,
  };
}

/** Tiempo de estabilización de la sonda antes de que la lectura sea válida. */
const PROBE_SETTLE_MS = 1200;

/**
 * Lee la sonda por BLE.
 *
 * Si no hay equipo seleccionado, o si el módulo BLE no está disponible —caso
 * de Expo Go, que no incluye código nativo—, devuelve datos SIMULADOS marcados
 * como tales. La bandera se propaga hasta la interfaz, que está obligada a
 * mostrarla: una demostración no debe poder confundirse con una medición real
 * de campo.
 */
export async function readSoilProbe(deviceCode: string | null): Promise<ProbeReading> {
  if (!deviceCode) {
    if (!__DEV__) throw new Error('No hay una sonda vinculada para medir.');
    await new Promise((r) => setTimeout(r, PROBE_SETTLE_MS));
    return { data: simulate(), simulated: true };
  }

  try {
    // Importación diferida: cargar react-native-ble-plx en un entorno sin
    // módulo nativo revienta al arrancar la app, no al medir.
    const { readTelemetryOverBle, requestBlePermissions } = await import('./bleService');

    const allowed = await requestBlePermissions();
    if (!allowed) {
      throw new Error('Se necesita permiso de Bluetooth para leer la sonda.');
    }

    // El código estable identifica la sonda física seleccionada. Pasar el UUID
    // de la fila de Supabase aquí era incorrecto: no es una identidad BLE.
    const data = await readTelemetryOverBle(deviceCode);
    return { data, simulated: false };
  } catch (error) {
    // Un fallo de permisos o de conexión debe llegar al usuario como error,
    // no disfrazarse de medición simulada.
    const message = error instanceof Error ? error.message : String(error);
    if (!__DEV__ || !/native|module|Expo Go/i.test(message)) {
      throw error;
    }
    // El resto —típicamente ausencia de módulo nativo en Expo Go— degrada a
    // simulación declarada.
    await new Promise((r) => setTimeout(r, PROBE_SETTLE_MS));
    return { data: simulate(), simulated: true };
  }
}
