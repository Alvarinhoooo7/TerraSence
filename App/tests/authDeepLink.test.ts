import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRecoveryTokens } from '../src/services/authDeepLinkParser';

test('extrae tokens de un deep link de recuperación', () => {
  assert.deepEqual(
    parseRecoveryTokens('terrasense://reset-password#access_token=access&refresh_token=refresh&type=recovery'),
    { accessToken: 'access', refreshToken: 'refresh' },
  );
});

test('ignora enlaces ajenos o incompletos', () => {
  assert.equal(parseRecoveryTokens('terrasense://reset-password#type=signup&access_token=a&refresh_token=r'), null);
  assert.equal(parseRecoveryTokens('terrasense://reset-password#type=recovery&access_token=a'), null);
});

test('no acepta credenciales desde un esquema, host o ruta ajenos', () => {
  const tokens = '#type=recovery&access_token=a&refresh_token=r';
  for (const route of ['https://example.com/reset-password', 'terrasense://other', 'terrasense://reset-password/other', 'terrasense://user@reset-password', 'not a url']) {
    assert.equal(parseRecoveryTokens(route + tokens), null);
  }
  assert.deepEqual(parseRecoveryTokens('terrasense://reset-password?type=recovery&access_token=a&refresh_token=r'), { accessToken: 'a', refreshToken: 'r' });
});
