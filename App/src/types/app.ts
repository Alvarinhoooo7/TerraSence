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
  /** Qué evalúa prioritariamente la recomendación en esta fase. */
  focus: string;
  focusEn: string;
}[] = [
  {
    id: 'pre_siembra',
    label: 'Pre-siembra',
    labelEn: 'Pre-planting',
    emoji: '🌱',
    focus: 'Temperatura sobre el cero vegetativo, pH sin bloqueos y salinidad de germinación',
    focusEn: 'Temperature above the growth threshold, available pH and germination salinity',
  },
  {
    id: 'vegetativo',
    label: 'Vegetativo',
    labelEn: 'Vegetative',
    emoji: '🌿',
    focus: 'Nitrógeno disponible, humedad radicular y riesgo de asfixia',
    focusEn: 'Available nitrogen, root-zone moisture and waterlogging risk',
  },
  {
    id: 'floracion',
    label: 'Floración',
    labelEn: 'Flowering',
    emoji: '🌸',
    focus: 'Estrés salino e hídrico: un exceso de sales provoca aborto floral',
    focusEn: 'Salt and water stress: excessive salts can cause flower abortion',
  },
  {
    id: 'cosecha',
    label: 'Cosecha',
    labelEn: 'Harvest',
    emoji: '🌾',
    focus: 'Secado superficial para transitabilidad y agotamiento de nutrientes',
    focusEn: 'Surface drying for trafficability and nutrient depletion',
  },
];

/** Fila de `public.soil_measurements`. */
export interface SoilMeasurementRow {
  id: string;
  device_id: string;
  user_id: string | null;
  crop_id: string;
  field_name: string;
  quadrant: string | null;

  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
  radius_m: number;

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

  // Ambiente (BME280)
  canopy_temp_c: number | null;
  canopy_humidity_pct: number | null;
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
  id: string;
  device_code: string;          // 15 dígitos
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
}

export interface DeviceMembershipRow {
  device_id: string;
  role: 'owner' | 'admin' | 'operator' | string;
  is_authorized: boolean;
}

export interface ManagedDeviceMember {
  user_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'operator';
  is_authorized: boolean;
}

/** Fila de `public.predial_quadrants`. */
export interface PredialQuadrantRow {
  id: string;
  device_id: string | null;
  quadrant_code: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  phenological_stage: PhenologicalStage;
  ph: number;
  ec_us_cm: number;
  vwc_percent: number;
  soil_temp_c: number;
  verdict: Verdict;
  action_summary: string | null;
}

/** Punto tal como lo consume el mapa. */
export interface MapMeasurementPoint {
  id: string;
  latitude: number;
  longitude: number;
  radiusM: number;
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
  gpsAccuracyM: number | null;
  isPending?: boolean;
}

export const mapRowToPoint = (r: SoilMeasurementRow): MapMeasurementPoint => ({
  id: r.id,
  latitude: r.latitude,
  longitude: r.longitude,
  radiusM: r.radius_m ?? 20,
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
  gpsAccuracyM: r.gps_accuracy_m,
});
