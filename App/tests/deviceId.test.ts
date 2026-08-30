import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeviceQrPayload,
  formatDeviceId,
  isValidDeviceId,
  normalizeDeviceId,
  parseDeviceQrPayload,
} from '../src/utils/deviceCode';

const CODE = '482139057416628';

test('normaliza y presenta el Device ID canónico', () => {
  assert.equal(normalizeDeviceId('48213-90574-16628'), CODE);
  assert.equal(formatDeviceId(CODE), '48213-90574-16628');
  assert.equal(isValidDeviceId(CODE), true);
  assert.equal(isValidDeviceId(`0${CODE.slice(1)}`), false);
  assert.equal(isValidDeviceId('123'), false);
});

test('el QR canónico hace round-trip', () => {
  const payload = buildDeviceQrPayload(CODE);
  assert.equal(payload, `terrasense://join?code=${CODE}`);
  assert.equal(parseDeviceQrPayload(payload), CODE);
});

test('acepta códigos legados crudos o con guiones', () => {
  assert.equal(parseDeviceQrPayload(CODE), CODE);
  assert.equal(parseDeviceQrPayload('48213-90574-16628'), CODE);
});

test('rechaza URLs ajenas aunque contengan un código válido', () => {
  assert.equal(parseDeviceQrPayload(`https://example.com/?code=${CODE}`), null);
  assert.equal(parseDeviceQrPayload(`otherapp://join?code=${CODE}`), null);
  assert.equal(parseDeviceQrPayload(`terrasense://other?code=${CODE}`), null);
});

test('rechaza códigos ambiguos, truncados o con dígito inicial cero', () => {
  assert.equal(parseDeviceQrPayload(`terrasense://join?code=${CODE}9`), null);
  assert.equal(parseDeviceQrPayload('48213-90574-1662'), null);
  assert.equal(parseDeviceQrPayload('08213-90574-16628'), null);
  assert.equal(parseDeviceQrPayload(''), null);
});
