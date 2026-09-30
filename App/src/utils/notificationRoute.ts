export const DEVICE_NOTIFICATION_EVENTS = ['access_request', 'access_approved', 'access_rejected', 'admin_transferred'] as const;
export type DeviceNotificationEvent = typeof DEVICE_NOTIFICATION_EVENTS[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDeviceNotificationEvent(value: unknown): value is DeviceNotificationEvent {
  return typeof value === 'string' && (DEVICE_NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

export type NotificationPayload = { alertId: string; event: DeviceNotificationEvent; deviceId: string | null };

/**
 * Valida el `data` de una push antes de usarlo. Sólo se aceptan las de categoría `device`
 * con un evento conocido y un `alert_id` UUID; cualquier otra cosa se descarta. El payload
 * no autoriza nada: el contenido y el acceso se comprueban después contra el servidor.
 */
export function parseNotificationPayload(data: unknown): NotificationPayload | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  if (value.category !== 'device' || !isDeviceNotificationEvent(value.event_type)) return null;
  if (typeof value.alert_id !== 'string' || !UUID.test(value.alert_id)) return null;
  const deviceId = typeof value.device_id === 'string' && UUID.test(value.device_id) ? value.device_id : null;
  return { alertId: value.alert_id, event: value.event_type, deviceId };
}

/** Una push recibida con la app abierta sólo se muestra con sesión y la categoría activada. */
export function shouldPresentNotification(data: unknown, context: { signedIn: boolean; deviceEnabled: boolean }): boolean {
  return context.signedIn && context.deviceEnabled && parseNotificationPayload(data) !== null;
}

export type PendingAlertResolution = 'open' | 'discard' | 'error' | 'stale';

/**
 * Decide qué hacer con el aviso de una push antes de mostrar nada. El servidor sólo devuelve la
 * fila si el aviso pertenece a la cuenta con sesión vigente y su acceso sigue activo:
 * - `open`: es de esta cuenta; se abre la bandeja.
 * - `discard`: es de otra cuenta o ya no existe; no se abre nada.
 * - `error`: no se pudo comprobar (sin red); la bandeja muestra el estado y permite reintentar.
 * - `stale`: la sesión cambió durante la consulta; el resultado se ignora.
 */
export async function resolvePendingAlert(
  fetchAlert: () => Promise<unknown | null>,
  isCurrentSession: () => boolean,
): Promise<PendingAlertResolution> {
  try {
    const row = await fetchAlert();
    if (!isCurrentSession()) return 'stale';
    return row ? 'open' : 'discard';
  } catch { return isCurrentSession() ? 'error' : 'stale'; }
}

/** El aviso ya no puede abrirse: cuenta distinta, acceso retirado, solicitud resuelta o vencida. */
export class NotificationUnavailableError extends Error {
  constructor() { super('Aviso no disponible.'); this.name = 'NotificationUnavailableError'; }
}

const OFFLINE = /network request failed|failed to fetch|fetch failed|network error|timed? ?out|sin respuesta|offline/i;
/** Distingue la falta de conexión de otros fallos para mostrar el estado correcto. */
export function isOfflineError(error: unknown): boolean {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message) : String(error ?? '');
  return OFFLINE.test(message);
}

export function notificationCopy(event: DeviceNotificationEvent, language: 'es' | 'en') {
  const copy = {
    access_request: ['Nueva solicitud de acceso', 'Alguien solicitó acceso a un equipo.', 'New access request', 'Someone requested access to a device.'],
    access_approved: ['Acceso aprobado', 'Ya puedes usar el equipo.', 'Access approved', 'You can now use the device.'],
    access_rejected: ['Solicitud rechazada', 'Tu solicitud de acceso fue rechazada.', 'Request rejected', 'Your access request was rejected.'],
    admin_transferred: ['Administración transferida', 'Cambió la administración de un equipo.', 'Administration transferred', 'A device administrator has changed.'],
  }[event];
  return language === 'en' ? { title: copy[2], body: copy[3] } : { title: copy[0], body: copy[1] };
}

export function notificationDestination(input: {
  event: DeviceNotificationEvent;
  active: boolean;
  deviceId: string | null;
  deviceVisible: boolean;
  authorized: boolean;
  role: string | null;
  onboardingComplete: boolean;
}): 'administration' | 'devices' | 'onboarding' | 'stay' | 'unavailable' {
  if (!input.active) return 'unavailable';
  if (input.event === 'access_rejected') return 'stay';
  if (!input.deviceId || !input.deviceVisible || !input.authorized) return 'unavailable';
  if (input.event === 'access_request')
    return input.role === 'admin' ? 'administration' : 'unavailable';
  if (input.event === 'admin_transferred') return input.role === 'admin' ? 'administration' : 'devices';
  if (input.event === 'access_approved') return input.onboardingComplete ? 'devices' : 'onboarding';
  return 'unavailable';
}
