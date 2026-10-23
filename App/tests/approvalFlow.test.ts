import test from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalTracker } from '../src/utils/approvalFlow';
const pending = (id: string) => ({ device_id: id });
test('las solicitudes conocidas al entrar sobreviven a una aprobación o rechazo antes del primer sondeo', () => {
  assert.deepEqual(createApprovalTracker(['target'], true).update([], [{ id: 'other' }, { id: 'target' }]).approved, { id: 'target' });
  assert.equal(createApprovalTracker(['target'], true).update([], []).removed, true);
  assert.equal(createApprovalTracker(['target'], true).update([], [{ id: 'other' }]).approved, undefined);
});

test('la espera inicial sin objetivos reconcilia el acceso actual y permite salir si no queda solicitud', () => {
  assert.deepEqual(createApprovalTracker(undefined, true).update([], [{ id: 'approved' }]).approved, { id: 'approved' });
  assert.equal(createApprovalTracker(undefined, true).update([], []).removed, true);
  assert.equal(createApprovalTracker().update([], [{ id: 'unrelated' }]).approved, undefined);
});
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
test('una solicitud que ya existía se sigue por el identificador del servicio, aunque se apruebe antes del primer sondeo', () => {
  // La lista de pendientes no cambia (ya estaba) y el equipo llega aprobado de inmediato:
  // con el identificador que entrega request-device-access, la espera termina igual.
  const tracker = createApprovalTracker('target');
  assert.deepEqual(tracker.update([pending('old')], [{ id: 'old' }, { id: 'target' }]).approved, { id: 'target' });
});

test('los datos de la solicitud sobreviven el filtrado para la interfaz', () => {
  const request = { device_id: 'target', administrator_name: 'Admin', administrator_email: 'admin@example.com' };
  const result = createApprovalTracker('target').update([request], []);
  assert.equal(result.requests[0].administrator_name, 'Admin');
  assert.equal(result.requests[0].administrator_email, 'admin@example.com');
});
