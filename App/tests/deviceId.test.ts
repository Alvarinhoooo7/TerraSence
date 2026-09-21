import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeviceQrPayload,
  formatDeviceId,
  isValidDeviceId,
  normalizeDeviceId,
  parseDeviceQrPayload,
  parseDeviceInvite,
} from '../src/utils/deviceCode';

const CODE = '482139057416628';
const TOKEN = 'a54aadab-0505-4bda-8c8c-b606072ac342';

test('invitación manual acepta el token del QR y rechaza el número permanente', () => {
  assert.equal(parseDeviceInvite(` ${TOKEN.toUpperCase()} `), TOKEN);
  assert.equal(parseDeviceInvite(buildDeviceQrPayload(TOKEN)), TOKEN);
  for (const value of [CODE, formatDeviceId(CODE), '', TOKEN.slice(1), `https://example.com/?token=${TOKEN}`]) {
    assert.equal(parseDeviceInvite(value), null);
  }
});

test('normaliza y presenta el Device ID canónico', () => {
  assert.equal(normalizeDeviceId('48213-90574-16628'), CODE);
  assert.equal(formatDeviceId(CODE), '48213-90574-16628');
  assert.equal(isValidDeviceId(CODE), true);
  assert.equal(isValidDeviceId(`0${CODE.slice(1)}`), false);
  assert.equal(isValidDeviceId('123'), false);
});

test('el QR canónico hace round-trip', () => {
  const payload = buildDeviceQrPayload(TOKEN);
  assert.equal(payload, `terrasense://join?token=${TOKEN}`);
  assert.equal(parseDeviceQrPayload(payload), TOKEN);
});

test('rechaza IDs permanentes que permitirían saltar el QR temporal', () => {
  assert.equal(parseDeviceQrPayload(CODE), null);
  assert.equal(parseDeviceQrPayload('48213-90574-16628'), null);
  assert.equal(parseDeviceQrPayload(`terrasense://join?code=${CODE}`), null);
  assert.equal(parseDeviceQrPayload(`terrasense://join?token=${CODE}`), null);
});

test('rechaza URLs ajenas aunque contengan un código válido', () => {
  assert.equal(parseDeviceQrPayload(`https://example.com/?code=${CODE}`), null);
  assert.equal(parseDeviceQrPayload(`otherapp://join?code=${CODE}`), null);
  assert.equal(parseDeviceQrPayload(`terrasense://other?code=${CODE}`), null);
  assert.equal(parseDeviceQrPayload(`https://example.com/?token=${TOKEN}`), null);
  assert.equal(parseDeviceQrPayload(`terrasense://join?token=${TOKEN.slice(1)}`), null);
});

test('rechaza códigos ambiguos, truncados o con dígito inicial cero', () => {
  assert.equal(parseDeviceQrPayload(`terrasense://join?code=${CODE}9`), null);
  assert.equal(parseDeviceQrPayload('48213-90574-1662'), null);
  assert.equal(parseDeviceQrPayload('08213-90574-16628'), null);
  assert.equal(parseDeviceQrPayload(''), null);
});
