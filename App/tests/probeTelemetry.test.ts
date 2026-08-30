import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeTelemetry } from '../src/services/probeService';

test('decodifica la trama BLE de 16 bytes en big-endian', () => {
  const bytes = new Uint8Array([
    0x01, 0x5e, // 35.0 % VWC
    0x00, 0xf5, // 24.5 °C
    0x03, 0xe8, // 1000 µS/cm
    0x00, 0x41, // pH 6.5
    0x00, 0x2d, // N 45
    0x00, 0x1e, // P 30
    0x00, 0x50, // K 80
    87, 0,
  ]);

  assert.deepEqual(decodeTelemetry(bytes), {
    vwc: 35,
    temp: 24.5,
    ec: 1000,
    ph: 6.5,
    nitrogen: 45,
    phosphorus: 30,
    potassium: 80,
    lux: 0,
    battery: 87,
  });
});

test('rechaza una trama BLE incompleta', () => {
  assert.throws(() => decodeTelemetry(new Uint8Array(15)), /15 bytes de 16/);
});

test('decodifica temperatura negativa como entero Modbus con signo', () => {
  const bytes = new Uint8Array(16);
  // -5,5 °C = -55 décimas = 0xFFC9 en complemento a dos.
  bytes[2] = 0xff;
  bytes[3] = 0xc9;
  assert.equal(decodeTelemetry(bytes).temp, -5.5);
});
