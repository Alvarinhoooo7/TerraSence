// src/services/probeService.ts
//
// Lectura de la sonda de suelo 7-en-1 (SKU AliExpress 1005005697940574).
//
// El ESP32 hace de puente: consulta la sonda por RS-485 Modbus RTU, lee su propio
// BME280 por I2C, y expone todo ya decodificado en una característica BLE, para no
// obligar al teléfono a hablar Modbus. La trama tiene versión en el byte 15:
// v0 son 16 bytes (sólo suelo y batería) y v1 son 20 (añade el ambiente del BME280).
// Contrato completo en docs/CONTRATO_BLE.md.
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

/**
 * Bluetooth autorizado, pedido por el coordinador de permisos (una solicitud a la vez,
 * sin repetir el diálogo si ya se concedió). Un `error` al consultarlo se deja pasar:
 * en Expo Go no existe el módulo BLE nativo y la lectura degrada después a simulación
 * declarada, sólo en desarrollo.
 */
async function bluetoothReady(): Promise<boolean> {
  const { requestPermission } = await import('./permissionsService');
  const state = await requestPermission('bluetooth');
  return state.status === 'granted' || state.status === 'error';
}

/** Servicio y característica GATT de TerraSense (README §5.5). */
export const TERRASENSE_SERVICE_UUID = '00000001-5e4e-4c69-6d61-746572726101';
export const TERRASENSE_TELEMETRY_UUID = '00000002-5e4e-4c69-6d61-746572726102';
/** ID de 15 dígitos que el ESP32 deriva de su MAC; nunca cambia. */
export const TERRASENSE_IDENTITY_UUID = '00000003-5e4e-4c69-6d61-746572726103';
/** Escritura permitida únicamente durante la ventana física de pairing. */
export const TERRASENSE_PROVISIONING_UUID = '00000004-5e4e-4c69-6d61-746572726104';
/** Lectura: batería (%) y versión del firmware, en cada contacto (docs/CONTRATO_BLE.md). */
export const TERRASENSE_STATUS_UUID = '00000005-5e4e-4c69-6d61-746572726105';

export interface ProbeStatus {
  /** 0–100, o null si la sonda no tiene dato (0xFF). */
  battery: number | null;
  /** «1.0.0», o null si la característica no trae los 3 bytes de versión. */
  firmwareVersion: string | null;
  /** Ventana PAIR abierta (byte 4, bit 0). Sin ese byte, false. */
  pairingOpen: boolean;
}

/**
 * Decodifica la característica de estado: byte 0 = batería en % (0xFF sin
 * dato), bytes 1–3 = versión mayor, menor y parche, byte 4 = banderas (bit 0,
 * ventana PAIR abierta). Un valor fuera de rango o incompleto se entrega como
 * null, nunca como un número inventado.
 */
export function decodeProbeStatus(bytes: Uint8Array): ProbeStatus {
  const raw = bytes.length >= 1 ? bytes[0]! : 0xff;
  return {
    battery: raw <= 100 ? raw : null,
    firmwareVersion: bytes.length >= 4 ? `${bytes[1]}.${bytes[2]}.${bytes[3]}` : null,
    pairingOpen: bytes.length >= 5 && (bytes[4]! & 0x01) === 0x01,
  };
}

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
    if (!(await bluetoothReady())) {
      return { connected: false, simulated: false, message: 'Sin acceso a Bluetooth no se puede buscar ni leer la sonda.' };
    }
    const { scanForProbe } = await import('./bleService');
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

/** Longitud de la trama v0: sólo suelo y batería. */
export const TELEMETRY_V0_BYTES = 16;
/** Longitud de la trama v1: v0 + las tres magnitudes del BME280 empaquetadas en 4 bytes. */
export const TELEMETRY_V1_BYTES = 20;

/**
 * Centinelas de "el sensor no entregó dato": todos los bits a uno.
 * Existen para que un BME280 que no responde produzca NULL en la base, y no un
 * valor plausible pero inventado.
 */
const AIR_TEMP_AUSENTE = 0xfff;
const AIR_PRESION_AUSENTE = 0xfff;
const AIR_HUMEDAD_AUSENTE = 0xff;

/** Máximos del BME280 según su hoja de datos, en unidades ya empaquetadas. */
const AIR_TEMP_MAX = 1250;   // +85,0 °C
const AIR_PRESION_MAX = 800; // 1100 hPa
const AIR_HUMEDAD_MAX = 200; // 100,0 %

interface AmbienteBme280 {
  airTemp: number | null;
  airHumidity: number | null;
  airPressure: number | null;
}

/**
 * Desempaqueta los bytes 16-19 de la trama v1.
 *
 * Los tres valores no caben en cuatro bytes alineados, así que van en bits. El MTU
 * por defecto de BLE deja 20 bytes de carga útil por notificación, y ése es el
 * techo que respeta este contrato: así no hace falta negociar MTU en Android ni
 * partir la lectura en dos notificaciones que luego habría que emparejar.
 *
 *   byte 16 : TTTT TTTT          8 bits altos de la temperatura
 *   byte 17 : TTTT PPPP          4 bits bajos de temperatura + 4 altos de presión
 *   byte 18 : PPPP PPPP          8 bits bajos de la presión
 *   byte 19 : HHHH HHHH          humedad relativa
 *
 * Temperatura: 12 bits, décimas de °C desplazadas +400 → -40,0 a +85,0 °C.
 * Presión: 12 bits, hPa enteros desplazados +300 → 300 a 1100 hPa.
 * Humedad: 8 bits, medios puntos porcentuales → 0 a 100,0 %.
 */
function decodeAmbiente(bytes: Uint8Array): AmbienteBme280 {
  const temp12 = (bytes[16] << 4) | (bytes[17] >> 4);
  const presion12 = ((bytes[17] & 0x0f) << 8) | bytes[18];
  const humedad8 = bytes[19];

  if (temp12 !== AIR_TEMP_AUSENTE && temp12 > AIR_TEMP_MAX) {
    throw new Error('Temperatura del aire fuera del rango del BME280 (-40 a 85 °C).');
  }
  if (presion12 !== AIR_PRESION_AUSENTE && presion12 > AIR_PRESION_MAX) {
    throw new Error('Presión fuera del rango del BME280 (300 a 1100 hPa).');
  }
  if (humedad8 !== AIR_HUMEDAD_AUSENTE && humedad8 > AIR_HUMEDAD_MAX) {
    throw new Error('Humedad relativa BLE inválida: debe ser un porcentaje de 0 a 100.');
  }

  return {
    airTemp: temp12 === AIR_TEMP_AUSENTE ? null : (temp12 - 400) / 10,
    airPressure: presion12 === AIR_PRESION_AUSENTE ? null : presion12 + 300,
    airHumidity: humedad8 === AIR_HUMEDAD_AUSENTE ? null : humedad8 / 2,
  };
}

/**
 * Decodifica el paquete binario que emite el ESP32.
 *
 * Contrato propio TerraSense, documentado en `docs/CONTRATO_BLE.md`. El firmware debe
 * convertir el mapa y las escalas reales del fabricante a este formato; no debe copiar
 * registros a ciegas.
 *
 * El byte 15 es la versión de trama y decide la longitud:
 *   v0 = 16 bytes, sólo suelo y batería. Los campos de aire quedan en null.
 *   v1 = 20 bytes, añade temperatura, humedad y presión del BME280.
 * Los bytes 0-14 son idénticos en ambas, así que un equipo con firmware antiguo
 * sigue siendo legible sin ramas especiales.
 *
 * ⚠️ Pendiente de confirmar contra la ficha del vendedor (README §5.3.1): si el
 * mapa de registros difiere, se ajusta la conversión en el driver Modbus del
 * firmware, conservando este contrato de la app.
 */
export function decodeTelemetry(bytes: Uint8Array): SoilMeasurement {
  if (bytes.length < TELEMETRY_V0_BYTES) {
    throw new Error(`Paquete BLE incompleto: ${bytes.length} bytes de 16 esperados.`);
  }

  const version = bytes[15];
  if (version !== 0 && version !== 1) {
    throw new Error(`Versión de trama BLE no compatible: ${version}. Esta app entiende 0 y 1.`);
  }

  const esperados = version === 0 ? TELEMETRY_V0_BYTES : TELEMETRY_V1_BYTES;
  if (bytes.length !== esperados) {
    throw new Error(
      `Trama BLE incompatible: ${bytes.length} bytes; la versión ${version} requiere exactamente ${esperados}.`,
    );
  }
  // Bytes 0-14 todos en 0xFF: la sonda de suelo no entregó lectura (sensor
  // desconectado, sin respuesta Modbus o CRC inválido). Es el centinela del
  // contrato; se comprueba antes que la batería para dar el motivo real y no
  // «batería inválida». Nunca se guarda como medición.
  if (bytes.subarray(0, 15).every(b => b === 0xff)) {
    throw new Error('La sonda no entregó lectura de suelo. Revisa que el sensor esté conectado y enterrado, y vuelve a medir.');
  }
  if (bytes[14] > 100) throw new Error('Batería BLE inválida: debe ser un porcentaje de 0 a 100.');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, false); // big-endian, como Modbus
  const i16 = (offset: number) => view.getInt16(offset, false);

  const ambiente: AmbienteBme280 =
    version === 1 ? decodeAmbiente(bytes) : { airTemp: null, airHumidity: null, airPressure: null };

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
    ...ambiente,
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
    airTemp: jitter(19, 10),
    airHumidity: Math.round(jitter(62, 30) * 2) / 2,
    airPressure: Math.round(jitter(1005, 20)),
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
    if (!(await bluetoothReady())) {
      throw new Error('Sin acceso a Bluetooth no se puede buscar ni leer la sonda.');
    }
    const { readTelemetryOverBle } = await import('./bleService');

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
