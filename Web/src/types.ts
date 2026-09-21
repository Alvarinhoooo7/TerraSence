// Tipos de la consola web, alineados con el esquema desplegado en Supabase.
// Duplican deliberadamente los de la app móvil: son dos proyectos npm
// independientes y compartir código entre ellos exigiría un paquete común,
// que a esta escala cuesta más de lo que ahorra.
//
// Lo que la consola lee de tablas (no de RPC) vive aquí; lo que viene de las
// RPC del panel de soporte está en `Web/backend/types.ts`.

export type Verdict = 'GREEN' | 'AMBER' | 'RED';

export type PhenologicalStage = 'pre_siembra' | 'vegetativo' | 'floracion' | 'cosecha';

export const STAGE_LABEL: Record<PhenologicalStage, string> = {
  pre_siembra: 'Pre-siembra',
  vegetativo: 'Vegetativo',
  floracion: 'Floración',
  cosecha: 'Cosecha',
};

/**
 * Fila de `public.firmware_releases`.
 *
 * RLS (`ts_firmware_select_published`) sólo entrega las publicadas a una
 * sesión de navegador, así que en la práctica `is_published` siempre llega en
 * `true` y `published_at` relleno. Se tipan como vienen de la tabla, no como
 * los deja el filtro.
 */
export interface FirmwareRelease {
  id: string;
  version: string;
  hardware_target: string;
  binary_url: string | null;
  sha256: string | null;
  size_bytes: number | null;
  release_notes: string | null;
  is_mandatory: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

/**
 * Fila de `public.lab_validation_records`.
 *
 * Es la única tabla que la consola lee directamente y que un operador de
 * soporte sí puede ver entera: su política `ts_lab_select_auth` deja leer a
 * cualquier sesión autenticada, sin depender de membresías de equipo.
 *
 * Los `numeric` de Postgres llegan como cadena cuando exceden la precisión de
 * un double; por eso se admiten los dos tipos y la conversión se hace al
 * formatear.
 */
export interface LabValidationRecord {
  id: string;
  sample_code: string;
  sample_date: string;
  lab_name: string;
  soil_series: string | null;
  concordance_pct: number | string | null;
  lab_ph: number | string;
  terrasense_ph: number | string;
  lab_ec: number;
  terrasense_ec: number;
  lab_vwc: number | string;
  terrasense_vwc: number | string;
  lab_n: number | null;
  terrasense_n: number | null;
  lab_p: number | null;
  terrasense_p: number | null;
  lab_k: number | null;
  terrasense_k: number | null;
}
