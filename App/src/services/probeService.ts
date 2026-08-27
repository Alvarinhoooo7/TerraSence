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

export interface ProbeReading {
  data: SoilMeasurement;
  simulated: boolean;
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

  return {
    vwc: u16(0) / 10,        // 0x015E = 350 -> 35,0 %
    temp: u16(2) / 10,       // 0x00F5 = 245 -> 24,5 °C
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
 * Lee la sonda. Si no hay dispositivo emparejado devuelve datos simulados.
 *
 * La conexión BLE real se implementa en la tarea C9 del plan de migración,
 * portando DevicePairingScreen de Akura junto con react-native-ble-plx.
 */
export async function readSoilProbe(deviceId: string | null): Promise<ProbeReading> {
  if (!deviceId) {
    await new Promise((r) => setTimeout(r, PROBE_SETTLE_MS));
    return { data: simulate(), simulated: true };
  }

  // TODO(C9): abrir conexión BLE, suscribirse a TERRASENSE_TELEMETRY_UUID,
  // esperar la notificación y pasarla por decodeTelemetry().
  await new Promise((r) => setTimeout(r, PROBE_SETTLE_MS));
  return { data: simulate(), simulated: true };
}
