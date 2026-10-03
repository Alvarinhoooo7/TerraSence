import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeTelemetry } from '../src/services/probeService';
import { computeVpdKpa } from '../src/engine/agronomyEngine';

/** Los 15 primeros bytes son idénticos en v0 y v1; sólo cambia el byte de versión. */
const suelo = () => [
  0x01, 0x5e, // 35.0 % VWC
  0x00, 0xf5, // 24.5 °C
  0x03, 0xe8, // 1000 µS/cm
  0x00, 0x41, // pH 6.5
  0x00, 0x2d, // N 45
  0x00, 0x1e, // P 30
  0x00, 0x50, // K 80
  87,         // batería
];

const sueloEsperado = {
  vwc: 35,
  temp: 24.5,
  ec: 1000,
  ph: 6.5,
  nitrogen: 45,
  phosphorus: 30,
  potassium: 80,
  lux: 0,
  battery: 87,
};

test('decodifica la trama BLE v0 de 16 bytes en big-endian', () => {
  const bytes = new Uint8Array([...suelo(), 0]);

  assert.deepEqual(decodeTelemetry(bytes), {
    ...sueloEsperado,
    // La v0 no transporta el BME280: null, nunca un valor por defecto.
    airTemp: null,
    airHumidity: null,
    airPressure: null,
  });
});

test('decodifica la trama BLE v1 de 20 bytes con el ambiente del BME280', () => {
  // 21,3 °C -> (213 + 400) = 613 = 0x265
  // 1004 hPa -> (1004 - 300) = 704 = 0x2C0
  // 62,5 %  -> 125 = 0x7D
  // Empaquetado: 0x26 | 0x5<<4 | 0x2 | 0xC0 | 0x7D
  const bytes = new Uint8Array([...suelo(), 1, 0x26, 0x52, 0xc0, 0x7d]);

  assert.deepEqual(decodeTelemetry(bytes), {
    ...sueloEsperado,
    airTemp: 21.3,
    airHumidity: 62.5,
    airPressure: 1004,
  });
});

test('decodifica temperatura del aire bajo cero en la trama v1', () => {
  // -3,5 °C -> (-35 + 400) = 365 = 0x16D. Presión 300 hPa (0) y humedad 0 %.
  const bytes = new Uint8Array([...suelo(), 1, 0x16, 0xd0, 0x00, 0x00]);
  const leido = decodeTelemetry(bytes);

  assert.equal(leido.airTemp, -3.5);
  assert.equal(leido.airPressure, 300);
  assert.equal(leido.airHumidity, 0);
});

test('un BME280 sin dato produce null y no un valor inventado', () => {
  // Centinela: todos los bits a uno en los cuatro bytes de ambiente.
  const bytes = new Uint8Array([...suelo(), 1, 0xff, 0xff, 0xff, 0xff]);
  const leido = decodeTelemetry(bytes);

  assert.equal(leido.airTemp, null);
  assert.equal(leido.airHumidity, null);
  assert.equal(leido.airPressure, null);
  // El suelo de la misma trama sigue siendo válido.
  assert.equal(leido.vwc, 35);
});

test('acepta que sólo falte una de las tres magnitudes del BME280', () => {
  // Temperatura ausente (0xFFF), presión 1004 hPa, humedad 62,5 %.
  const bytes = new Uint8Array([...suelo(), 1, 0xff, 0xf2, 0xc0, 0x7d]);
  const leido = decodeTelemetry(bytes);

  assert.equal(leido.airTemp, null);
  assert.equal(leido.airPressure, 1004);
  assert.equal(leido.airHumidity, 62.5);
});

test('rechaza una trama BLE incompleta', () => {
  assert.throws(() => decodeTelemetry(new Uint8Array(15)), /15 bytes de 16/);
});

test('decodifica temperatura de suelo negativa como entero Modbus con signo', () => {
  const bytes = new Uint8Array(16);
  // -5,5 °C = -55 décimas = 0xFFC9 en complemento a dos.
  bytes[2] = 0xff;
  bytes[3] = 0xc9;
  assert.equal(decodeTelemetry(bytes).temp, -5.5);
});

test('la longitud tiene que coincidir con la versión declarada', () => {
  // v0 con bytes de más.
  assert.throws(() => decodeTelemetry(new Uint8Array(19)), /versión 0 requiere exactamente 16/);

  // v1 declarada pero llegan sólo 16 bytes: el firmware anuncia ambiente que no manda.
  const corta = new Uint8Array([...suelo(), 1]);
  assert.throws(() => decodeTelemetry(corta), /versión 1 requiere exactamente 20/);

  // v1 completa con bytes de sobra.
  const larga = new Uint8Array([...suelo(), 1, 0, 0, 0, 0, 0]);
  assert.throws(() => decodeTelemetry(larga), /versión 1 requiere exactamente 20/);
});

test('rechaza versiones de trama que esta app no entiende', () => {
  const bytes = new Uint8Array(16);
  bytes[15] = 2;
  assert.throws(() => decodeTelemetry(bytes), /no compatible: 2/);
});

test('rechaza batería y ambiente fuera de rango', () => {
  const bateria = new Uint8Array(16);
  bateria[14] = 101;
  assert.throws(() => decodeTelemetry(bateria), /porcentaje/);

  // 85,1 °C: un décimo por encima del máximo del BME280. 1251 = 0x4E3.
  const calor = new Uint8Array([...suelo(), 1, 0x4e, 0x30, 0x00, 0x00]);
  assert.throws(() => decodeTelemetry(calor), /Temperatura del aire fuera del rango/);

  // 1101 hPa: 801 = 0x321, un hPa por encima del máximo.
  const presion = new Uint8Array([...suelo(), 1, 0x00, 0x03, 0x21, 0x00]);
  assert.throws(() => decodeTelemetry(presion), /Presión fuera del rango/);

  // 100,5 % de humedad: 201.
  const humedad = new Uint8Array([...suelo(), 1, 0x00, 0x00, 0x00, 201]);
  assert.throws(() => decodeTelemetry(humedad), /Humedad relativa BLE inválida/);
});

test('una trama sin lectura de suelo (bytes 0-14 en FF) se rechaza con su motivo real', () => {
  // Es exactamente lo que envía el firmware actual cuando la sonda no responde,
  // con el BME280 presente o ausente.
  const sinSuelo = new Uint8Array([...new Array(15).fill(0xff), 1, 0xff, 0xff, 0xff, 0xff]);
  assert.throws(() => decodeTelemetry(sinSuelo), /no entregó lectura de suelo/);

  const conAmbiente = new Uint8Array([...new Array(15).fill(0xff), 1, 0x26, 0x52, 0xc0, 0x7d]);
  assert.throws(() => decodeTelemetry(conAmbiente), /no entregó lectura de suelo/);

  // Un solo byte de suelo real ya no es el centinela: se decodifica o se
  // rechaza por su propio motivo (aquí, la batería en FF).
  const parcial = new Uint8Array([0x01, ...new Array(14).fill(0xff), 1, 0xff, 0xff, 0xff, 0xff]);
  assert.throws(() => decodeTelemetry(parcial), /Batería BLE inválida/);
});

test('rechaza humedad y pH de suelo fuera de rango en ambas versiones sin recortarlos', () => {
  for (const version of [0, 1]) {
    const frame = () => new Uint8Array([...suelo(), version, ...(version ? [0xff, 0xff, 0xff, 0xff] : [])]);
    for (const [offset, maximum, field] of [[0, 1000, /Humedad de suelo/], [6, 140, /pH de suelo/]] as const) {
      for (const value of [maximum + 1, 0xffff]) {
        const bytes = frame();
        new DataView(bytes.buffer).setUint16(offset, value, false);
        assert.throws(() => decodeTelemetry(bytes), field);
      }
    }
    for (const [humidity, ph] of [[0, 0], [1000, 140]]) {
      const bytes = frame();
      const view = new DataView(bytes.buffer);
      view.setUint16(0, humidity, false);
      view.setUint16(6, ph, false);
      const decoded = decodeTelemetry(bytes);
      assert.equal(decoded.vwc, humidity / 10);
      assert.equal(decoded.ph, ph / 10);
    }
  }
});

test('respeta el desplazamiento de una vista dentro de un buffer BLE', () => {
  const buffer = new Uint8Array(24);
  buffer[4] = 1; buffer[5] = 0x5e;
  assert.equal(decodeTelemetry(buffer.subarray(4, 20)).vwc, 35);
});

test('calcula el VPD desde temperatura y humedad, y null si falta cualquiera', () => {
  assert.equal(computeVpdKpa(21.3, 62.5), 0.95);
  assert.equal(computeVpdKpa(null, 62.5), null);
  assert.equal(computeVpdKpa(21.3, null), null);
  // Aire saturado: sin déficit.
  assert.equal(computeVpdKpa(20, 100), 0);
});
