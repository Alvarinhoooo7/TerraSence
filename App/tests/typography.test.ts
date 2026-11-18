import assert from 'node:assert/strict';
import test from 'node:test';
import { DISPLAY_FAMILIES, displayFont, setDisplayFontsLoaded } from '../src/constants/fonts';
import { Typography } from '../src/constants/theme';

test('sin la letra cargada, títulos y cifras caen a la del sistema con su peso', () => {
  setDisplayFontsLoaded(false);
  assert.deepEqual(displayFont('bold'), { fontWeight: '700' });
  assert.deepEqual(Typography.display.medium, { fontWeight: '500' });
  assert.equal(Typography.numeric.bold.fontWeight, '700');
});

test('con la letra cargada se usa una familia por peso y ningún fontWeight (Android no lo admite)', () => {
  setDisplayFontsLoaded(true);
  assert.deepEqual(displayFont('medium'), { fontFamily: DISPLAY_FAMILIES.medium });
  assert.equal(Typography.display.bold.fontFamily, DISPLAY_FAMILIES.bold);
  assert.equal('fontWeight' in Typography.numeric.bold, false);
  assert.deepEqual(Typography.numeric.bold.fontVariant, ['tabular-nums']);
  setDisplayFontsLoaded(false);
});
