// src/services/deviceService.ts
//
// Alta y vinculación de equipos.
//
// El alta de una sonda físicamente emparejada usa una RPC atómica que crea el
// equipo y la membresía owner. El código debe coincidir con el provisionado en
// NVS y su unicidad continúa respaldada por el índice UNIQUE de Postgres.

import { supabase } from './supabase';
import { normalizeDeviceId, isValidDeviceId } from '../utils/deviceId';
import type { DeviceMembershipRow, DeviceRow } from '../types/app';

const DEVICE_COLUMNS =
  'id,device_code,name,alias,battery_level,firmware_version,hardware_version,' +
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
  const { data, error } = await supabase
    .from('device_members')
    .select('device_id,role,is_authorized');

  if (error) throw error;
  return (data ?? []) as unknown as DeviceMembershipRow[];
}

/**
 * Registra un equipo nuevo.
 *
 * Fuera del pairing no se envía `device_code`: lo genera la base. Durante el
 * pairing se envía el mismo código criptográfico que la app acaba de grabar
 * en la NVS del ESP32; el índice UNIQUE sigue siendo la autoridad final.
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
        'Esta sonda ya tiene propietario. Pídele al administrador que te muestre su QR.',
      );
    }
    throw error;
  }

  const result = registered as { device_id: string }[] | null;
  if (!result?.[0]?.device_id) throw new Error('Supabase no confirmó el registro del equipo.');

  const { data, error: readError } = await supabase
    .from('devices')
    .select(DEVICE_COLUMNS)
    .eq('id', result[0].device_id)
    .single();
  if (readError) throw readError;
  return data as unknown as DeviceRow;
}

/**
 * Vincula al usuario con un equipo existente a partir de su código de 15
 * dígitos: el caso del operador que se suma a la cuadrilla de otro.
 *
 * Va por la RPC `join_device_by_code` en lugar de consultar `devices`
 * directamente. La política SELECT sólo deja ver los equipos de los que ya se
 * es miembro, y relajarla para permitir la búsqueda por código convertiría la
 * tabla en enumerable. La función valida el código en el servidor, limita los
 * intentos por fuerza bruta y devuelve sólo lo imprescindible.
 */
export async function joinDeviceByCode(rawCode: string): Promise<DeviceRow> {
  const code = normalizeDeviceId(rawCode);
  if (!isValidDeviceId(code)) {
    throw new Error('El código debe tener 15 dígitos y no empezar por cero.');
  }

  const { data: joined, error } = await supabase.rpc('join_device_by_code', { p_code: code });
  if (error) throw new Error(error.message);
  const result = joined as { device_id: string; device_name: string }[] | null;
  if (!result?.[0]?.device_id) {
    throw new Error('No se pudo vincular con ese código.');
  }

  // Tras la vinculación el equipo ya es visible para la política SELECT.
  const { data, error: readError } = await supabase
    .from('devices')
    .select(DEVICE_COLUMNS)
    .eq('id', result[0].device_id)
    .single();

  if (readError) throw readError;
  return data as unknown as DeviceRow;
}
