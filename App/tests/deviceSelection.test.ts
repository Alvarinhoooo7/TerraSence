import test from 'node:test';
import assert from 'node:assert/strict';
import { deviceSelectionKey, restoreDeviceSelection } from '../src/utils/deviceSelection';

test('sin selección previa sólo se elige automáticamente la única sonda', () => {
  const a = { id: 'a' }; const b = { id: 'b' };
  assert.equal(restoreDeviceSelection([], null), null);
  assert.equal(restoreDeviceSelection([a], null), a);
  assert.equal(restoreDeviceSelection([a, b], null), null);
});
test('restaurar respeta la elección y no cambia de sonda si se retiró el acceso', () => {
  const a = { id: 'a' }; const b = { id: 'b' };
  assert.equal(restoreDeviceSelection([b, a], 'a'), a);
  assert.equal(restoreDeviceSelection([b], 'a'), null);
});
test('la selección se guarda separada por cuenta', () => {
  assert.notEqual(deviceSelectionKey('uno'), deviceSelectionKey('dos'));
});
