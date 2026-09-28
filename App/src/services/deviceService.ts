// src/services/deviceService.ts
//
// Alta y vinculación de equipos.
//
// El alta de una sonda físicamente emparejada usa una RPC atómica que crea el
// equipo y la membresía de administrador. El código es el que la sonda deriva
// de su MAC; su unicidad continúa respaldada por el índice UNIQUE de Postgres.

import { supabase } from './supabase';
import { flushProbeContacts } from './contactService';
import { normalizeDeviceId, isValidDeviceId } from '../utils/deviceId';
import type { DeviceMembershipRow, DeviceRow, ManagedDeviceMember } from '../types/app';

const DEVICE_COLUMNS =
  'id,data_generation,device_code,name,alias,battery_level,firmware_version,hardware_version,' +
  'microclimate_sensor_type,is_active,pairing_mode_active,' +
  'transmission_interval_seconds,last_seen_at,last_measurement_at';

/** Equipos a los que el usuario tiene acceso (lo acota la política RLS). */
export async function listMyDevices(): Promise<DeviceRow[]> {
  const { data, error } = await supabase
    .from('devices')
    .select(DEVICE_COLUMNS)
    .order('last_seen_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as DeviceRow[];
}

/** Roles del usuario actual, usados para mostrar acciones de administración. */
export async function listMyDeviceMemberships(): Promise<DeviceMembershipRow[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];
  const { data, error } = await supabase
    .from('device_members')
    .select('device_id,role,is_authorized')
    .eq('user_id', session.session.user.id);

  if (error) throw error;
  return (data ?? []) as unknown as DeviceMembershipRow[];
}

/**
 * Registra un equipo nuevo.
 *
 * Fuera del pairing no se envía `device_code`: lo genera la base. Durante el
 * pairing se envía el ID que la sonda deriva de su MAC y que la app acaba de
 * leer por BLE; el índice UNIQUE sigue siendo la autoridad final.
 * El trigger `link_device_creator` inserta la membresía del creador justo
 * después, de modo que la política SELECT ya lo deja verlo al volver.
 */
export async function registerDevice(name: string, pairedCode: string): Promise<DeviceRow> {
  const code = normalizeDeviceId(pairedCode);
  if (!isValidDeviceId(code)) {
    throw new Error('La sonda entregó un código de vinculación inválido.');
  }

  const { data: registered, error } = await supabase.rpc('register_paired_device', {
    p_code: code,
    p_name: name.trim() || 'Sonda TerraSense',
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Esta sonda ya tiene usuarios. Pide a un miembro aprobado que te muestre el QR temporal.',
      );
    }
    throw error;
  }

  const result = registered as { device_id: string }[] | null;
  if (!result?.[0]?.device_id) throw new Error('Supabase no confirmó el registro del equipo.');
  // El contacto de la vinculación quedó en cola porque el equipo aún no existía.
  void flushProbeContacts().catch(() => undefined);

  const { data, error: readError } = await supabase
    .from('devices')
    .select(DEVICE_COLUMNS)
    .eq('id', result[0].device_id)
    .single();
  if (readError) throw readError;
  return data as unknown as DeviceRow;
}

/** Solicita acceso con el token temporal del QR. null significa pendiente. */
export async function requestDeviceAccess(token: string): Promise<DeviceRow | null> {
  const { data, error } = await supabase.functions.invoke('request-device-access', { body: { token } });
  if (error) {
    const context = error.context as Response | undefined;
    const body = await context?.json().catch(() => null);
    throw new Error(body?.message ?? error.message);
  }
  const result = data as { device_id: string; is_authorized: boolean } | null;
  if (!result?.device_id) throw new Error('No se pudo solicitar acceso.');
  if (!result.is_authorized) return null;

  // Tras la vinculación el equipo ya es visible para la política SELECT.
  const { data: device, error: readError } = await supabase
    .from('devices')
    .select(DEVICE_COLUMNS)
    .eq('id', result.device_id)
    .single();

  if (readError) throw readError;
  return device as unknown as DeviceRow;
}

export interface DeviceAccessQr { token: string; expires_at: string }
export interface PendingDeviceRequest {
  device_id: string;
  administrator_name: string;
  administrator_email: string;
}
export async function getDeviceAccessQr(deviceId: string): Promise<DeviceAccessQr> {
  const { data, error } = await supabase.rpc('get_device_access_qr', { p_device_id: deviceId });
  if (error) throw error;
  if (!data?.[0]) throw new Error('No se pudo generar el QR.');
  return data[0] as DeviceAccessQr;
}
export async function listPendingDeviceRequests(): Promise<PendingDeviceRequest[]> {
  const { data, error } = await supabase.rpc('list_my_pending_device_requests');
  if (error) throw error;
  return (data ?? []) as PendingDeviceRequest[];
}

export async function listDeviceMembers(deviceId: string): Promise<ManagedDeviceMember[]> {
  const { data, error } = await supabase.rpc('list_device_members', { p_device_id: deviceId });
  if (error) throw error;
  return (data ?? []) as ManagedDeviceMember[];
}

export async function manageDeviceMember(
  deviceId: string,
  userId: string,
  action: 'authorize' | 'remove' | 'transfer_owner',
): Promise<void> {
  const { error } = await supabase.rpc('manage_device_member', {
    p_device_id: deviceId, p_target_user_id: userId, p_action: action, p_role: null,
  });
  if (error) throw error;
}

export async function prepareDeviceForOwner(deviceId: string, code: string): Promise<void> {
  const { data, error } = await supabase.rpc('prepare_device_for_owner', { p_device_id: deviceId, p_confirm_device_code: code });
  if (error) throw error;
  if (data?.success !== true) throw new Error('No se confirmó el restablecimiento.');
}
