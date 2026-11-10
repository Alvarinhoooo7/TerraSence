// src/types/app.ts
//
// Tipos del dominio, alineados 1:1 con el esquema desplegado en Supabase
// (proyecto terrasense). Los nombres de campo replican las columnas reales
// en inglés y snake_case: no traducir aquí o la sincronización rompe.

import type { Verdict } from './agronomy';

export type OnboardingMethod = 'qr' | 'pairing';

/** Las 4 etapas del ciclo productivo. TerraSense no es exclusivo de siembra. */
export type PhenologicalStage =
  | 'pre_siembra'
  | 'vegetativo'
  | 'floracion'
  | 'cosecha';

export const PHENOLOGICAL_STAGES: {
  id: PhenologicalStage;
  label: string;
  labelEn: string;
  emoji: string;
  /** Explicación de la etapa para ayudar a elegirla. */
  focus: string;
  focusEn: string;
}[] = [
  {
    id: 'pre_siembra',
    label: 'Pre-siembra',
    labelEn: 'Pre-planting',
    emoji: '🌱',
    focus: 'Antes de sembrar, cuando preparas el suelo para las semillas.',
    focusEn: 'Before planting, when you prepare the soil for seeds.',
  },
  {
    id: 'vegetativo',
    label: 'Vegetativo',
    labelEn: 'Vegetative',
    emoji: '🌿',
    focus: 'La planta está creciendo y formando hojas, tallos y raíces.',
    focusEn: 'The plant is growing and developing leaves, stems and roots.',
  },
  {
    id: 'floracion',
    label: 'Floración',
    labelEn: 'Flowering',
    emoji: '🌸',
    focus: 'Aparecen las flores que darán paso a frutos o semillas.',
    focusEn: 'Flowers appear and will develop into fruit or seeds.',
  },
  {
    id: 'cosecha',
    label: 'Cosecha',
    labelEn: 'Harvest',
    emoji: '🌾',
    focus: 'El cultivo está listo o próximo a estar listo para recogerlo.',
    focusEn: 'The crop is ready or nearly ready to be harvested.',
  },
];

/** Fila de `public.soil_measurements`. */
export interface SoilMeasurementRow {
  data_generation?: number;
  id: string;
  device_id: string;
  user_id: string | null;
  crop_id: string;
  field_name: string;
  quadrant: string | null;

  latitude: number | null;
  longitude: number | null;
  gps_accuracy_m: number | null;

  phenological_stage: PhenologicalStage;

  // 7 parámetros de suelo
  vwc_percent: number;
  soil_temp_c: number;
  ec_us_cm: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soil_texture: string;
  battery_percent?: number | null;

  // Ambiente (BME280). Nunca de la API del clima: esa complementa la recomendación,
  // no la medición. NULL cuando el sensor no entregó dato.
  canopy_temp_c: number | null;
  canopy_humidity_pct: number | null;
  air_pressure_hpa: number | null;
  vpd_kpa: number | null;

  verdict: Verdict;
  verdict_title: string;
  action_summary: string | null;
  diagnosis: unknown | null;

  // Trazabilidad (principio P4)
  engine_version: string;
  crop_catalog_version: string;
  firmware_version: string | null;

  client_uuid: string | null;
  measured_at: string;
}

/** Payload de inserción: omite lo que genera la base. */
export type SoilMeasurementInsert = Omit<SoilMeasurementRow, 'id' | 'measured_at'> & {
  measured_at?: string;
};

/** Fila de `public.devices`. */
export interface DeviceRow {
  data_generation?: number;
  id: string;
  device_code: string;          // 15 dígitos
  name: string;
  alias: string | null;
  /** NULL hasta que la app informa el primer contacto real con la sonda. */
  battery_level: number | null;
  firmware_version: string | null;
  hardware_version: string;
  microclimate_sensor_type: string;
  is_active: boolean;
  pairing_mode_active: boolean;
  transmission_interval_seconds: number;
  first_seen_at?: string | null;
  last_seen_at: string | null;
  last_measurement_at: string | null;
}

export interface DeviceMembershipRow {
  device_id: string;
  role: 'admin' | 'user';
  is_authorized: boolean;
}

export interface ManagedDeviceMember {
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'user';
  is_authorized: boolean;
}

/** Lectura resumida para historial y diagnóstico. Nombre heredado para compatibilidad. */
export interface MeasurementPoint {
  id: string;
  clientUuid?: string | null;
  deviceId?: string | null;
  latitude: number | null;
  longitude: number | null;
  verdict: Verdict;
  stage: PhenologicalStage;
  title: string;
  action: string | null;
  measuredAt: string;
  ph: number;
  ecUsCm: number;
  vwcPercent: number;
  soilTempC: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  airTemp?: number | null;
  batteryPercent?: number | null;
  airHumidity?: number | null;
  airPressure?: number | null;
  diagnosis?: unknown;
  gpsAccuracyM: number | null;
  isPending?: boolean;
}

export const mapRowToPoint = (r: SoilMeasurementRow): MeasurementPoint => ({
  id: r.id,
  clientUuid: r.client_uuid,
  ...(r.device_id ? { deviceId: r.device_id } : {}),
  latitude: r.latitude,
  longitude: r.longitude,
  verdict: r.verdict,
  stage: r.phenological_stage,
  title: r.verdict_title,
  action: r.action_summary,
  measuredAt: r.measured_at,
  ph: r.ph,
  ecUsCm: r.ec_us_cm,
  vwcPercent: r.vwc_percent,
  soilTempC: r.soil_temp_c,
  nitrogen: r.nitrogen,
  phosphorus: r.phosphorus,
  potassium: r.potassium,
  airTemp: r.canopy_temp_c ?? null,
  batteryPercent: r.battery_percent ?? null,
  airHumidity: r.canopy_humidity_pct ?? null,
  airPressure: r.air_pressure_hpa ?? null,
  diagnosis: r.diagnosis,
  gpsAccuracyM: r.gps_accuracy_m,
});
