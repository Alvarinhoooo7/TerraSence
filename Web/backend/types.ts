// Web/backend/types.ts
//
// Tipos de dominio del backoffice, más precisos que los de `database.types.ts`:
// una función `RETURNS TABLE` no transmite la nulabilidad de sus columnas y
// `supabase gen types` las declara todas no nulables. Aquí, si la columna
// puede llegar nula, el tipo es nulable.

export type MemberRole = 'admin' | 'user';

export type PhenologicalStage = 'pre_siembra' | 'vegetativo' | 'floracion' | 'cosecha';

export type Verdict = 'GREEN' | 'AMBER' | 'RED';

/** Fila de `admin_search`: un par equipo–cliente. Sin cliente si el equipo está libre. */
export interface SearchRow {
  device_id: string;
  device_code: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: MemberRole | null;
  is_authorized: boolean | null;
}

/** `admin_device_status`. `is_online` lo decide el servidor (15 min). */
export interface DeviceStatus {
  device_id: string;
  device_code: string;
  battery_level: number | null;
  firmware_version: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_online: boolean;
}

export interface DeviceMember {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: MemberRole;
  is_authorized: boolean;
  created_at: string | null;
}

/** Un día del pronóstico de Open-Meteo, tal como lo guarda la app al medir. */
export interface ForecastDay {
  date: string;
  minimumTemperatureC?: number | null;
  maximumTemperatureC?: number | null;
  precipitationMm?: number | null;
  rainProbabilityPct?: number | null;
}

export interface MeasurementWeather {
  forecast?: ForecastDay[];
}

/** `admin_device_measurements`. Los `numeric` pueden llegar como cadena. */
export interface Measurement {
  id: string;
  measured_at: string;
  phenological_stage: PhenologicalStage | string;
  vwc_percent: number | string | null;
  soil_temp_c: number | string | null;
  ec_us_cm: number | null;
  ph: number | string | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  canopy_temp_c: number | string | null;
  canopy_humidity_pct: number | string | null;
  air_pressure_hpa: number | string | null;
  battery_percent: number | null;
  weather: MeasurementWeather | null;
  verdict: Verdict | string;
  verdict_title: string;
  action_summary: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  /** Especie indicada al medir (instantánea de la app); `null` si se midió sin especie o es anterior. */
  species?: MeasurementSpecies | null;
}

/** Copia de la especie que guarda la app en el diagnóstico de cada medición. */
export interface MeasurementSpecies {
  id: string;
  es: string;
  en: string;
  scientific: string;
  /**
   * Si al medir había criterios propios de la especie para esa etapa. Cuando es `false`,
   * el veredicto salió del análisis general del suelo: es lo que explica, en soporte, por
   * qué dos lecturas de la misma especie en etapas distintas no se evalúan igual.
   */
  hasStageCriteria?: boolean;
  /** Versión del catálogo de especies con que se midió. */
  catalogVersion?: string;
  /** Versión de los criterios por especie; ausente en lecturas anteriores a su registro. */
  rulesVersion?: string;
}

/** Una fila de `admin_device_species`: `species` nula son las lecturas guardadas sin especie. */
export interface DeviceSpecies {
  species: MeasurementSpecies | null;
  measurements: number;
  last_measured_at: string | null;
}

/** Lecturas que trae una consulta y tope que acepta `admin_device_measurements`. */
export const MEASUREMENTS_PAGE = 50;
export const MEASUREMENTS_MAX = 200;

/** Filtros que `admin_device_measurements` aplica en el servidor. */
export interface MeasurementFilters {
  stage?: PhenologicalStage | null;
  /** ID del catálogo; se ignora si `withoutSpecies` está activo. */
  speciesId?: string | null;
  /** Sólo las lecturas guardadas sin especie. */
  withoutSpecies?: boolean;
  limit?: number;
  offset?: number;
}

export interface ResetResult {
  members_removed: number;
  measurements_deleted: number;
}

export type UpdateStatus = 'sent' | 'postponed' | 'installing' | 'installed' | 'failed' | 'cancelled';

export const UPDATE_STATUS_LABEL: Record<UpdateStatus, string> = {
  sent: 'Asignada, sin respuesta',
  postponed: 'Pendiente (el administrador la postergó)',
  installing: 'Instalando',
  installed: 'Instalada',
  failed: 'Falló',
  cancelled: 'Cancelada',
};

/** `admin_list_releases`. */
export interface Release {
  id: string;
  version: string;
  release_notes: string | null;
  sha256: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  is_mandatory: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  pending: number;
  installing: number;
  installed: number;
  failed: number;
}

/** `admin_device_update`: la asignación más reciente del equipo. */
export interface DeviceUpdate {
  update_id: string;
  version: string;
  status: UpdateStatus;
  error: string | null;
  sent_at: string;
  updated_at: string;
}

/** `admin_release_devices`. */
export interface ReleaseDevice {
  device_id: string;
  device_code: string;
  status: UpdateStatus;
  error: string | null;
  updated_at: string;
}

export interface SendResult {
  sent: number;
  skipped: number;
  queued: number;
}
