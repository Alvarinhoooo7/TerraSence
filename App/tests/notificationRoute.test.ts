import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NotificationUnavailableError, isDeviceNotificationEvent, isOfflineError, notificationCopy, notificationDestination,
  parseNotificationPayload, resolvePendingAlert, shouldPresentNotification,
} from '../src/utils/notificationRoute';

const base = { active: true, deviceId: 'device-1', deviceVisible: true, authorized: true,
  role: 'admin', onboardingComplete: true };

test('solicitudes sólo abren administración con acceso vigente', () => {
  assert.equal(notificationDestination({ ...base, event: 'access_request' }), 'administration');
  assert.equal(notificationDestination({ ...base, event: 'access_request', role: 'member' }), 'unavailable');
  assert.equal(notificationDestination({ ...base, event: 'access_request', active: false }), 'unavailable');
  assert.equal(notificationDestination({ ...base, event: 'access_request', deviceVisible: false }), 'unavailable');
});

test('aprobación reabre onboarding cuando falta completarlo y el rechazo sigue legible', () => {
  assert.equal(notificationDestination({ ...base, event: 'access_approved', role: 'member', onboardingComplete: false }), 'onboarding');
  assert.equal(notificationDestination({ ...base, event: 'access_approved', role: 'member' }), 'devices');
  assert.equal(notificationDestination({ ...base, event: 'access_rejected', deviceVisible: false, authorized: false }), 'stay');
});

test('transferencia sigue disponible para antiguo administrador autorizado', () => {
  assert.equal(notificationDestination({ ...base, event: 'admin_transferred', role: 'member' }), 'devices');
  assert.equal(notificationDestination({ ...base, event: 'admin_transferred', authorized: false }), 'unavailable');
});

test('cada evento tiene texto en español e inglés', () => {
  for (const event of ['access_request', 'access_approved', 'access_rejected', 'admin_transferred'] as const) {
    const spanish = notificationCopy(event, 'es');
    const english = notificationCopy(event, 'en');
    assert.ok(spanish.title && spanish.body && english.title && english.body);
    assert.notEqual(spanish.title, english.title);
  }
});

test('aprobación y solicitud con un equipo que la cuenta ya no ve no navegan', () => {
  assert.equal(notificationDestination({ ...base, event: 'access_approved', role: 'member', deviceVisible: false }), 'unavailable');
  assert.equal(notificationDestination({ ...base, event: 'access_approved', role: 'member', authorized: false }), 'unavailable');
  assert.equal(notificationDestination({ ...base, event: 'access_approved', role: 'member', deviceId: null }), 'unavailable');
  assert.equal(notificationDestination({ ...base, event: 'admin_transferred', deviceVisible: false }), 'unavailable');
});

test('aviso cancelado o vencido es visible pero jamás navega, sea cual sea el evento', () => {
  for (const event of ['access_request', 'access_approved', 'access_rejected', 'admin_transferred'] as const)
    assert.equal(notificationDestination({ ...base, event, active: false }), 'unavailable');
});

const alert = '12345678-1234-4234-8234-123456789abc';
const device = '87654321-4321-4321-8321-cba987654321';

test('el payload de la push sólo se acepta con categoría device, evento conocido y alert_id UUID', () => {
  assert.deepEqual(parseNotificationPayload({ alert_id: alert, event_type: 'access_request', category: 'device', device_id: device }),
    { alertId: alert, event: 'access_request', deviceId: device });
  assert.deepEqual(parseNotificationPayload({ alert_id: alert, event_type: 'admin_transferred', category: 'device' }),
    { alertId: alert, event: 'admin_transferred', deviceId: null });
  assert.equal(parseNotificationPayload({ alert_id: alert, event_type: 'access_request', category: 'device', device_id: 'no-uuid' })?.deviceId, null);
  const rejected: unknown[] = [
    null, undefined, 'texto', 42, [],
    { alert_id: alert, event_type: 'access_request' },
    { alert_id: alert, event_type: 'access_request', category: 'agronomic' },
    { alert_id: alert, event_type: 'critical_soil', category: 'device' },
    { alert_id: alert, event_type: 'weather', category: 'weather' },
    { alert_id: alert, event_type: 'sync', category: 'sync' },
    { alert_id: 'no-es-uuid', event_type: 'access_request', category: 'device' },
    { alert_id: 12, event_type: 'access_request', category: 'device' },
    { event_type: 'access_request', category: 'device' },
  ];
  for (const payload of rejected) assert.equal(parseNotificationPayload(payload), null, JSON.stringify(payload));
});

test('las categorías retiradas no se reconocen como eventos de equipo', () => {
  for (const legacy of ['critical_soil', 'weather_risk', 'remeasure_reminder', 'sync_problem', 'low_battery', ''])
    assert.equal(isDeviceNotificationEvent(legacy), false);
  assert.equal(isDeviceNotificationEvent('access_rejected'), true);
});

test('la push en primer plano exige sesión, preferencia activada y payload válido', () => {
  const data = { alert_id: alert, event_type: 'access_approved', category: 'device' };
  assert.equal(shouldPresentNotification(data, { signedIn: true, deviceEnabled: true }), true);
  assert.equal(shouldPresentNotification(data, { signedIn: false, deviceEnabled: true }), false);
  assert.equal(shouldPresentNotification(data, { signedIn: true, deviceEnabled: false }), false);
  assert.equal(shouldPresentNotification({ ...data, category: 'weather' }, { signedIn: true, deviceEnabled: true }), false);
});

test('los errores de red se distinguen de los demás para mostrar el estado sin conexión', () => {
  assert.equal(isOfflineError(new TypeError('Network request failed')), true);
  assert.equal(isOfflineError({ message: 'TypeError: Failed to fetch' }), true);
  assert.equal(isOfflineError(new Error('Sin respuesta del servidor')), true);
  assert.equal(isOfflineError({ message: 'permission denied', code: '42501' }), false);
  assert.equal(isOfflineError(null), false);
  assert.equal(new NotificationUnavailableError() instanceof Error, true);
});

test('la push de otra cuenta, sin conexión o con la sesión cambiada no abre la bandeja por error', async () => {
  const same = () => true;
  assert.equal(await resolvePendingAlert(async () => ({ id: alert }), same), 'open');
  assert.equal(await resolvePendingAlert(async () => null, same), 'discard', 'el servidor no devuelve avisos de otra cuenta');
  assert.equal(await resolvePendingAlert(async () => { throw new Error('Network request failed'); }, same), 'error');
  let current = true;
  const late = resolvePendingAlert(async () => { current = false; return { id: alert }; }, () => current);
  assert.equal(await late, 'stale', 'cambió la cuenta mientras se comprobaba');
  assert.equal(await resolvePendingAlert(async () => { current = false; throw new Error('x'); }, () => current), 'stale');
});
