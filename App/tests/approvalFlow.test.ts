import test from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalTracker, newPendingTarget } from '../src/utils/approvalFlow';
const pending = (id: string) => ({ device_id: id });
test('vincular otra sonda espera el objetivo y nunca devuelve un equipo existente o ajeno', () => {
  const tracker = createApprovalTracker('target');
  assert.equal(tracker.update([pending('target')], [{ id: 'old' }, { id: 'other' }]).approved, undefined);
  assert.equal(tracker.update([pending('target')], [{ id: 'target' }, { id: 'old' }]).approved, undefined);
  assert.equal(tracker.update([], [{ id: 'old' }, { id: 'other' }]).approved, undefined);
  assert.deepEqual(tracker.update([], [{ id: 'old' }, { id: 'target' }]).approved, { id: 'target' });
  assert.equal(tracker.update([], [{ id: 'target' }]).approved, undefined);
});
test('sin objetivo identificado, vincular otra sonda nunca aprueba automáticamente', () => {
  const tracker = createApprovalTracker();
  assert.equal(tracker.update([pending('unrelated')], [{ id: 'old' }]).approved, undefined);
  assert.equal(tracker.update([], [{ id: 'old' }, { id: 'unrelated' }]).approved, undefined);
});
test('la aprobación antes del primer sondeo exige el objetivo explícito', () => {
  assert.deepEqual(createApprovalTracker('target').update([], [{ id: 'old' }, { id: 'target' }]).approved, { id: 'target' });
});
test('la vinculación inicial aprende los objetivos pendientes, informa el retiro e ignora equipos ajenos', () => {
  const tracker = createApprovalTracker(undefined, true);
  tracker.update([pending('target')], []);
  const result = tracker.update([], [{ id: 'other' }]);
  assert.equal(result.approved, undefined); assert.equal(result.removed, true);
});
test('la inferencia del objetivo excluye solicitudes previas y rechaza la ambigüedad', () => {
  assert.equal(newPendingTarget([pending('old')], [pending('old'), pending('target')]), 'target');
  assert.equal(newPendingTarget([pending('old')], [pending('old')]), undefined);
  assert.equal(newPendingTarget([], [pending('one'), pending('two')]), undefined);
});

test('los datos de la solicitud sobreviven el filtrado para la interfaz', () => {
  const request = { device_id: 'target', administrator_name: 'Admin', administrator_email: 'admin@example.com' };
  const result = createApprovalTracker('target').update([request], []);
  assert.equal(result.requests[0].administrator_name, 'Admin');
  assert.equal(result.requests[0].administrator_email, 'admin@example.com');
});
