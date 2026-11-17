import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ARCHIVOS = ['components/ProbeInsertArt.tsx', 'components/result/ReadingArt.tsx', 'components/MeasurementLoading.tsx',
  'components/ReadingSavedArt.tsx', 'components/pairing/PairingArt.tsx', 'components/auth/AuthUI.tsx', 'screens/WelcomeCarouselScreen.tsx'];

for (const archivo of ARCHIVOS) test(`${archivo} dibuja la sonda con ProbeGlyph`, () => {
  const fuente = readFileSync(join(import.meta.dirname, '..', 'src', archivo), 'utf8');
  assert.match(fuente, /ProbeGlyph/);
  // Dos o más trazos verticales seguidos: una sonda hecha a mano.
  assert.doesNotMatch(fuente, /M\d+ \d+[Vv]\d+M\d+ \d+[Vv]\d+/);
});
