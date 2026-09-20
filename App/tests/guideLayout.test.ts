import assert from 'node:assert/strict';
import test from 'node:test';
import { guideLayout } from '../src/utils/guideLayout';
import { controlDescription } from '../src/components/guide/guideCopy';

test('la explicación queda debajo de un control superior sin taparlo', () => {
  const result = guideLayout({ x: 240, y: 64, width: 48, height: 48 }, 320, 640, 240, 24, 24);
  assert.ok(result.panelTop >= result.hole.y + result.hole.height);
  assert.ok(result.panelLeft + result.panelWidth <= 320);
  assert.ok(result.panelTop + Math.min(240, result.panelMaxHeight) <= 616);
});
test('un botón inferior deja su explicación arriba y conserva la zona segura', () => {
  const result = guideLayout({ x: 16, y: 550, width: 288, height: 48 }, 320, 640, 240, 24, 24);
  assert.ok(result.panelTop >= 24);
  assert.ok(result.panelTop + Math.min(240, result.panelMaxHeight) < result.hole.y);
});
test('un texto grande limita el panel al espacio libre para permitir desplazamiento interno', () => {
  const result = guideLayout({ x: 12, y: 270, width: 296, height: 48 }, 320, 568, 500, 24, 16);
  assert.ok(result.panelMaxHeight < 500);
  assert.ok(result.panelTop >= 24);
  assert.ok(result.panelTop + result.panelMaxHeight <= 552);
});
test('el resaltado se recorta al área visible sin dimensiones negativas', () => {
  for (const target of [{ x: -20, y: -50, width: 380, height: 120 }, { x: 500, y: 900, width: 10, height: 10 }]) {
    const { hole } = guideLayout(target, 320, 568, 240, 24, 16);
    assert.ok(hole.x >= 0 && hole.y >= 24);
    assert.ok(hole.width >= 0 && hole.height >= 0);
    assert.ok(hole.x + hole.width <= 320 && hole.y + hole.height <= 552);
  }
});
test('guías de permisos, firmware y eliminación explican sus límites en ambos idiomas', () => {
  assert.match(controlDescription('Continuar', 'es')!, /No concede/);
  assert.match(controlDescription('Continue', 'en')!, /Does not automatically grant/);
  assert.match(controlDescription('Buscar actualizaciones', 'es')!, /no descarga ni instala/);
  assert.match(controlDescription('Delete data and release device', 'en')!, /irreversible/);
});
