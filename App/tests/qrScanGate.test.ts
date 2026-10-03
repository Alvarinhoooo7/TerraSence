import test from 'node:test';
import assert from 'node:assert/strict';
import { createQrScanGate } from '../src/utils/qrScanGate';
import { parseDeviceQrPayload } from '../src/utils/deviceId';
test('pausa inicial, latch, inválidos repetidos y cancelación', () => {
  let time = 0;
  const gate = createQrScanGate(() => time);
  gate.arm(); assert.equal(gate.accept('ajeno'), false);
  time = 1000; assert.equal(gate.accept('ajeno'), true);
  assert.equal(gate.accept('otro'), false);
  assert.equal(parseDeviceQrPayload('ajeno'), null); gate.reject('ajeno');
  gate.arm(); time = 1999; assert.equal(gate.accept('otro'), false);
  time = 2000; assert.equal(gate.accept(' ajeno '), false);
  assert.equal(gate.accept('otro'), true);
  gate.cancel(); time = 9000; assert.equal(gate.accept('nuevo'), false);
});
test('invitación válida se puede reintentar explícitamente tras error de red', () => {
  let time = 0; const gate = createQrScanGate(() => time);
  const qr = 'terrasense://join?token=12345678-1234-4123-8123-123456789abc';
  gate.arm(); time = 1000; assert.equal(gate.accept(qr), true);
  assert.ok(parseDeviceQrPayload(qr)); gate.arm();
  time = 2000; assert.equal(gate.accept(qr), true);
});
