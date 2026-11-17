import assert from 'node:assert/strict';
import test from 'node:test';
import { PROBE_BODY, PROBE_PIN_COUNT, probePinOffsets, probePinsPath } from '../src/components/art/probeGeometry';

test('la sonda tiene cinco pines, simétricos y dentro del cuerpo', () => {
  const pins = probePinOffsets();
  assert.equal(PROBE_PIN_COUNT, 5);
  assert.deepEqual(pins, [-16, -8, 0, 8, 16]);
  assert.ok(Math.max(...pins) < PROBE_BODY.width / 2);
});

test('el trazo dibuja un pin por posición, con el largo pedido', () => {
  assert.equal(probePinsPath(52), 'M-16 58v52M-8 58v52M0 58v52M8 58v52M16 58v52');
});
