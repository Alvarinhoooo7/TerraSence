// src/services/deviceService.ts
//
// Alta y vinculación de equipos.
//
// El código de 15 dígitos lo genera Postgres por DEFAULT
// (`public.generate_device_code()`), no el cliente: así la unicidad la
// garantiza el índice UNIQUE y no un acuerdo de buena fe entre plataformas.
// `generateDeviceId()` del cliente existe sólo para previsualización.

import { supabase } from './supabase';
import { normalizeDeviceId, isValidDeviceId } from '../utils/deviceId';
import type { DeviceRow } from '../types/app';

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

/**
 * Registra un equipo nuevo.
 *
 * No se envía `device_code`: lo genera la base. El trigger
 * `link_device_creator` inserta la membresía del creador justo después, de
 * modo que la política SELECT ya lo deja verlo al volver.
 */
export async function registerDevice(name: string): Promise<DeviceRow> {
  const { data, error } = await supabase
    .from('devices')
    .insert({
      name: name.trim() || 'Sonda TerraSense',
      hardware_version: 'ESP32-WROOM-32',
      microclimate_sensor_type: 'BME280',
    })
    .select(DEVICE_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as DeviceRow;
}

/**
 * Vincula al usuario con un equipo existente a partir de su código de 15
 * dígitos, para el caso de un operador que se suma a un equipo ajeno.
 *
 * Nota: con la política SELECT vigente, un usuario sin membresía no puede
 * localizar el equipo por código desde el cliente. La vinculación de un
 * segundo usuario debe resolverse con una función RPC en SECURITY DEFINER que
 * valide el código y cree la membresía en el servidor. Queda pendiente y se
 * indica con un mensaje explícito en vez de fallar de forma silenciosa.
 */
export async function joinDeviceByCode(rawCode: string): Promise<DeviceRow> {
  const code = normalizeDeviceId(rawCode);
  if (!isValidDeviceId(code)) {
    throw new Error('El código debe tener 15 dígitos y no empezar por cero.');
  }

  const { data, error } = await supabase
    .from('devices')
    .select(DEVICE_COLUMNS)
    .eq('device_code', code)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      'No se encontró un equipo con ese código, o todavía no tienes permiso para verlo. ' +
        'Pide al propietario que te agregue desde su app.',
    );
  }

  const device = data as unknown as DeviceRow;
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) throw new Error('Sesión no válida.');

  const { error: linkError } = await supabase
    .from('device_members')
    .insert({ device_id: device.id, user_id: uid, role: 'operator', is_authorized: true });

  if (linkError && !linkError.message.includes('duplicate')) throw linkError;
  return device;
}
