// Tipos de la consola web, alineados con el esquema desplegado en Supabase.
// Duplican deliberadamente los de la app móvil: son dos proyectos npm
// independientes y compartir código entre ellos exigiría un paquete común,
// que a esta escala cuesta más de lo que ahorra.

export type Verdict = 'GREEN' | 'AMBER' | 'RED';

export type PhenologicalStage =
  | 'pre_siembra'
  | 'vegetativo'
  | 'floracion'
  | 'cosecha';

export const STAGE_LABEL: Record<PhenologicalStage, string> = {
  pre_siembra: 'Pre-siembra',
  vegetativo: 'Vegetativo',
  floracion: 'Floración',
  cosecha: 'Cosecha',
};

export interface SoilMeasurement {
  id: string;
  device_id: string;
  field_name: string;
  crop_id: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
  radius_m: number;
  phenological_stage: PhenologicalStage;
  vwc_percent: number;
  soil_temp_c: number;
  ec_us_cm: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  verdict: Verdict;
  verdict_title: string;
  action_summary: string | null;
  engine_version: string;
  crop_catalog_version: string;
  measured_at: string;
}

export interface Device {
  id: string;
  device_code: string;
  name: string;
  alias: string | null;
  battery_level: number;
  firmware_version: string;
  hardware_version: string;
  is_active: boolean;
  last_seen_at: string | null;
  last_measurement_at: string | null;
}

export interface LabValidationRecord {
  id: string;
  sample_code: string;
  sample_date: string;
  lab_name: string;
  soil_series: string | null;
  concordance_pct: number | null;
  lab_ph: number;
  terrasense_ph: number;
  lab_ec: number;
  terrasense_ec: number;
  lab_vwc: number;
  terrasense_vwc: number;
  lab_n: number | null;
  terrasense_n: number | null;
  lab_p: number | null;
  terrasense_p: number | null;
  lab_k: number | null;
  terrasense_k: number | null;
}
