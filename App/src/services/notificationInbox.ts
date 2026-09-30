import { supabase } from './supabase';
import { isDeviceNotificationEvent, type DeviceNotificationEvent } from '../utils/notificationRoute';

export type DeviceNotification = {
  id: string;
  event_type: DeviceNotificationEvent;
  title: string;
  body: string;
  device_id: string | null;
  created_at: string;
  read_at: string | null;
  status: 'active' | 'cancelled' | 'expired';
};
export type NotificationCursor = Pick<DeviceNotification, 'created_at' | 'id'>;
export const NOTIFICATION_PAGE_SIZE = 30;

/** Página siguiente, ordenada por (created_at, id) descendente; `before` es el último elemento ya cargado. */
export async function listMyNotifications(before: NotificationCursor | null = null): Promise<{ rows: DeviceNotification[]; hasMore: boolean }> {
  const { data, error } = await supabase.rpc('list_my_notifications', {
    p_limit: NOTIFICATION_PAGE_SIZE, p_before: before?.created_at ?? null, p_before_id: before?.id ?? null,
  });
  if (error) throw error;
  const received = (data ?? []) as DeviceNotification[];
  // `hasMore` se calcula antes de filtrar: un evento desconocido no debe cortar la paginación.
  return { rows: received.filter(row => isDeviceNotificationEvent(row.event_type)), hasMore: received.length >= NOTIFICATION_PAGE_SIZE };
}

/** El servidor devuelve la fila sólo si el aviso pertenece a la cuenta autenticada y su acceso sigue vigente. */
export async function getMyNotification(id: string): Promise<DeviceNotification | null> {
  const { data, error } = await supabase.rpc('get_my_notification', { p_alert_id: id });
  if (error) throw error;
  const row = ((data ?? []) as DeviceNotification[])[0];
  return row && isDeviceNotificationEvent(row.event_type) ? row : null;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', { p_alert_id: id });
  if (error) throw error;
}
