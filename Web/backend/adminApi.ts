// Web/backend/adminApi.ts
//
// Capa de acceso a datos del panel de soporte. Cada función envuelve un RPC de
// `supabase/migrations/20260902120000_panel_soporte_backend.sql` o de
// `supabase/migrations/20260921120000_flota_soporte_y_versiones_normalizadas.sql`
// — no hay SQL ni nombres de columnas que el front necesite conocer.
//
// Todas exigen sesión autenticada Y pertenencia activa a
// `admin_support_users`; si cualquiera de las dos falta, el RPC responde con
// el error de Postgres `42501` ("No tienes acceso al panel de soporte."),
// que aquí se deja propagar como excepción de `supabase-js`
// (`error.message` trae ese texto). Captúralo para mostrar un mensaje o
// redirigir a login/onboarding.

import { supabaseAdmin as supabase } from './supabaseAdmin';
import type {
  DeviceSearchResult,
  DeviceDetail,
  DeviceMemberRole,
  FirmwareCheckResult,
  FirmwareReleaseRow,
  FleetDevice,
  FleetMeasurement,
  RpcResult,
  FactoryResetResult,
  SupportStaffRow,
} from './types';

/** Desempaqueta un `jsonb_build_object('success', …)` y convierte el fallo
 * declarado por el servidor en una excepción, para que quien llama trate el
 * error en un solo sitio. */
function unwrap<T extends RpcResult>(data: unknown): T {
  const result = data as T;
  if (result?.success === false) {
    throw new Error(result.message ?? 'No se pudo completar la operación.');
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sesión y alta de personal
// ---------------------------------------------------------------------------

/** true si la sesión actual pertenece a alguien de admin_support_users con is_active. */
export async function isSupportStaff(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_support_staff');
  if (error) throw error;
  return Boolean(data);
}

/**
 * Actívate como personal de soporte. Requiere estar logueado (email
 * confirmado) y el código de invitación — la URL secreta no es suficiente
 * por sí sola porque auth.users se comparte con la app de agricultores.
 * Lanza con un `message` legible ante código inválido o demasiados intentos
 * (5 fallidos por hora).
 */
export async function selfRegisterSupportStaff(
  fullName: string,
  inviteCode: string,
): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('support_self_register', {
    p_full_name: fullName,
    p_invite_code: inviteCode,
  });
  if (error) throw error;
  return unwrap<RpcResult>(data);
}

/**
 * Equipo de soporte completo. No necesita RPC: la política RLS
 * `support_select_staff` de `admin_support_users` ya deja leer la tabla a
 * quien pertenece al panel (y sólo su propia fila a quien no). Un usuario sin
 * acceso recibe una lista vacía o su fila, nunca la de los demás.
 */
export async function listSupportStaff(): Promise<SupportStaffRow[]> {
  const { data, error } = await supabase
    .from('admin_support_users')
    .select('id,user_id,email,full_name,is_active,created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SupportStaffRow[];
}

/** Cambia el código de invitación. Sólo para quien ya está dentro del panel. */
export async function rotateInviteCode(newCode: string): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('admin_rotate_invite_code', {
    p_new_code: newCode,
  });
  if (error) throw error;
  return unwrap<RpcResult>(data);
}

/** Activa/desactiva a otro miembro del equipo de soporte. No permite auto-desactivarse. */
export async function setStaffActive(userId: string, active: boolean): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('admin_set_staff_active', {
    p_user_id: userId,
    p_active: active,
  });
  if (error) throw error;
  return unwrap<RpcResult>(data);
}

// ---------------------------------------------------------------------------
// Flota
// ---------------------------------------------------------------------------

/**
 * Inventario completo de sondas.
 *
 * No se lee de la tabla `devices`: su política `ts_devices_select_member`
 * acota las filas a los equipos donde la sesión es MIEMBRO, y una cuenta de
 * soporte no es miembro de ninguno — leerla directamente devuelve siempre
 * cero filas. El perímetro de esta RPC es `is_support_staff()`, igual que el
 * resto del panel.
 */
export async function listFleet(): Promise<FleetDevice[]> {
  const { data, error } = await supabase.rpc('admin_list_fleet');
  if (error) throw error;
  return (data ?? []) as unknown as FleetDevice[];
}

/**
 * Últimas mediciones de toda la flota, con el equipo ya resuelto en la misma
 * fila. Mismo motivo que `listFleet`: `soil_measurements` también está acotada
 * por membresía. El servidor topa el límite en 500.
 */
export async function listRecentMeasurements(limit = 200): Promise<FleetMeasurement[]> {
  const { data, error } = await supabase.rpc('admin_list_recent_measurements', {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as unknown as FleetMeasurement[];
}

// ---------------------------------------------------------------------------
// Buscador
// ---------------------------------------------------------------------------

/**
 * Busca por código de equipo, nombre/alias, o correo de cualquier usuario
 * enlazado (dueño, admin u operador). Puede devolver varias filas del MISMO
 * equipo si coincide por más de un motivo, o equipos distintos. Ignora
 * búsquedas de menos de 2 caracteres (devuelve []).
 */
export async function searchDevices(query: string): Promise<DeviceSearchResult[]> {
  const { data, error } = await supabase.rpc('admin_search', { p_query: query });
  if (error) throw error;
  return (data ?? []) as unknown as DeviceSearchResult[];
}

// ---------------------------------------------------------------------------
// Ficha de equipo
// ---------------------------------------------------------------------------

/**
 * Todo lo que necesita la pestaña de detalle en una sola llamada: el equipo,
 * el estado de su firmware frente al catálogo, su última ubicación conocida
 * con GPS, sus miembros, hasta 100 lecturas de batería y hasta 50 mediciones,
 * ambas más recientes primero.
 */
export async function getDeviceDetail(deviceId: string): Promise<DeviceDetail> {
  const { data, error } = await supabase.rpc('admin_get_device_detail', {
    p_device_id: deviceId,
  });
  if (error) throw error;
  return data as unknown as DeviceDetail;
}

// ---------------------------------------------------------------------------
// Miembros del equipo (aprobar, revocar, cambiar rol/admin, desvincular)
// ---------------------------------------------------------------------------

/** Aprueba (true) o suspende sin desvincular (false) a un miembro pendiente/existente. */
export async function setMemberAuthorized(
  deviceId: string,
  userId: string,
  authorized: boolean,
): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('admin_set_member_authorized', {
    p_device_id: deviceId,
    p_user_id: userId,
    p_authorized: authorized,
  });
  if (error) throw error;
  return unwrap<RpcResult>(data);
}

/** Delega en otro usuario aprobado; el administrador anterior pasa a usuario. */
export async function setMemberRole(
  deviceId: string,
  userId: string,
  role: DeviceMemberRole,
): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('admin_set_member_role', {
    p_device_id: deviceId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
  return unwrap<RpcResult>(data);
}

/** Desvincula por completo a un usuario de un equipo (elimina la membresía, no la cuenta). */
export async function removeMember(deviceId: string, userId: string): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('admin_unbind_user_device', {
    p_device_id: deviceId,
    p_user_id: userId,
  });
  if (error) throw error;
  return unwrap<RpcResult>(data);
}

/**
 * Restablece un equipo a configuración de fábrica: desvincula a TODOS sus
 * miembros y borra su historial privado (mediciones, alertas pendientes,
 * invitaciones y el registro de batería), para que quede listo para vincularse
 * con otra persona desde cero — típicamente porque el dueño lo vendió o lo
 * regaló.
 *
 * NO toca `device_code`, `firmware_version` ni `hardware_version`: son el
 * hardware real, no datos del dueño anterior. Irreversible.
 *
 * `deviceCode` debe coincidir exactamente con el código de 15 dígitos del
 * equipo — pídeselo al operador de soporte como confirmación explícita
 * (p.ej. haciéndolo escribirlo de nuevo) antes de llamar a esta función; el
 * servidor también lo exige y rechaza cualquier otro valor.
 */
export async function factoryResetDevice(
  deviceId: string,
  deviceCode: string,
): Promise<FactoryResetResult> {
  const { data, error } = await supabase.rpc('admin_factory_reset_device', {
    p_device_id: deviceId,
    p_confirm_device_code: deviceCode,
  });
  if (error) throw error;
  return unwrap<FactoryResetResult>(data);
}

// ---------------------------------------------------------------------------
// Firmware
// ---------------------------------------------------------------------------

/** Catálogo publicado, para el selector de versión de la ficha. */
export async function listPublishedFirmware(
  hardwareTarget?: string,
): Promise<FirmwareReleaseRow[]> {
  let query = supabase
    .from('firmware_releases')
    .select('id,version,hardware_target,is_mandatory,release_notes,published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (hardwareTarget) query = query.eq('hardware_target', hardwareTarget);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as FirmwareReleaseRow[];
}

/**
 * Comprueba contra el servidor que una versión concreta del catálogo es
 * aplicable a un equipo.
 *
 * **No envía ningún aviso.** La RPC dejó de encolar alertas push en
 * `20260920120000_preparar_equipo_propietario.sql`: sin atestación física del
 * firmware, empujar «actualízate» a un agricultor desde el backoffice
 * anunciaba algo que la consola no puede garantizar. Lo que queda es la
 * verificación, y el propio `message` del servidor explica dónde encuentra el
 * agricultor la versión. La pantalla debe mostrar ese texto tal cual, no uno
 * propio: es la única forma de que no vuelva a desalinearse con el servidor.
 */
export async function checkFirmwareAvailability(
  deviceId: string,
  firmwareReleaseId: string,
): Promise<FirmwareCheckResult> {
  const { data, error } = await supabase.rpc('admin_push_firmware_update', {
    p_device_id: deviceId,
    p_firmware_release_id: firmwareReleaseId,
  });
  if (error) throw error;
  return unwrap<FirmwareCheckResult>(data);
}
