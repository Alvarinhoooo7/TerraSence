// Web/backend/types.ts
//
// Tipos de dominio del panel de soporte, más legibles que las filas crudas de
// `database.types.ts` (que sí conviene regenerar tal cual con
// `supabase gen types typescript --linked` cada vez que cambie el esquema).
// Reflejan exactamente lo que devuelven las funciones RPC de
// `20260902120000_panel_soporte_backend.sql`.

export type DeviceMemberRole = 'owner' | 'admin' | 'operator';

/** Fila de public.devices, tal cual la expone `admin_get_device_detail`. */
export interface AdminDeviceRow {
  id: string;
  device_code: string;
  name: string;
  alias: string | null;
  battery_level: number;
  firmware_version: string;
  hardware_version: string;
  microclimate_sensor_type: string;
  is_active: boolean;
  pairing_mode_active: boolean;
  transmission_interval_seconds: number;
  last_seen_at: string | null;
  last_measurement_at: string | null;
  created_at: string | null;
}

/** Un resultado de `admin_search` — puede haber más de uno para la misma búsqueda. */
export interface DeviceSearchResult {
  device_id: string;
  device_code: string;
  name: string;
  alias: string | null;
  is_active: boolean;
  battery_level: number | null;
  last_seen_at: string | null;
  /** Sólo viene relleno cuando el resultado coincidió por correo de un miembro. */
  matched_member_email: string | null;
  match_reason: 'device' | 'member_email';
}

export interface DeviceMemberInfo {
  user_id: string;
  email: string;
  full_name: string;
  role: DeviceMemberRole;
  is_authorized: boolean;
  created_at: string;
}

export interface BatteryLogEntry {
  battery_level: number | null;
  firmware_version: string | null;
  recorded_at: string;
}

export interface MeasurementSummary {
  id: string;
  measured_at: string;
  field_name: string;
  phenological_stage: string;
  verdict: 'GREEN' | 'AMBER' | 'RED';
  verdict_title: string;
  vwc_percent: number;
  soil_temp_c: number;
  ec_us_cm: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  latitude: number;
  longitude: number;
}

export interface LatestPublishedFirmware {
  id: string;
  version: string;
  hardware_target: string;
  is_mandatory: boolean;
}

export interface LastLocation {
  latitude: number;
  longitude: number;
  field_name: string;
  measured_at: string;
}

/** Devuelto íntegro por `admin_get_device_detail(device_id)`: una sola
 * llamada trae todo lo que necesita la pestaña de detalle de un equipo. */
export interface DeviceDetail {
  device: AdminDeviceRow;
  latest_published_firmware: LatestPublishedFirmware | null;
  is_up_to_date: boolean;
  last_location: LastLocation | null;
  members: DeviceMemberInfo[];
  battery_history: BatteryLogEntry[];
  measurements: MeasurementSummary[];
}

export interface SupportStaffRow {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string | null;
}

export interface FirmwareReleaseRow {
  id: string;
  version: string;
  hardware_target: string;
  is_mandatory: boolean;
  release_notes: string | null;
  published_at: string | null;
}

/** Envoltorio común de las respuestas `jsonb_build_object('success', ...)`. */
export interface RpcResult {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

/** Respuesta de `admin_factory_reset_device`: cuánto se borró, para confirmar en pantalla. */
export interface FactoryResetResult extends RpcResult {
  members_removed: number;
  measurements_deleted: number;
  quadrants_deleted: number;
  alerts_deleted: number;
}
