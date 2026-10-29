// src/utils/measurementHistory.ts — el historial de un equipo, dividido.
//
// La app divide el historial por etapa y por especie (`App/src/utils/measurementHistory.ts`).
// El backoffice hace lo mismo, con un reparto distinto del trabajo: filtrar y contar las
// especies es cosa del servidor (`admin_device_measurements`, `admin_device_species`),
// porque el historial de un cliente no cabe en una descarga y las opciones del filtro no
// pueden deducirse de unas filas ya filtradas. Aquí sólo queda agrupar lo que llegó.

import { MEASUREMENTS_MAX, MEASUREMENTS_PAGE } from '../../backend/types.ts';
import type {
  DeviceSpecies,
  Measurement,
  MeasurementFilters,
  PhenologicalStage,
} from '../../backend/types.ts';
import { exactDateTime } from './format.ts';
import { STAGES, stageLabel } from './verdict.ts';

export type HistoryGrouping = 'date' | 'species' | 'stage';

/** Filtro de especie: todas, una especie por su ID o las lecturas guardadas sin especie. */
export type SpeciesFilter = 'all' | 'none' | string;

export type StageFilter = PhenologicalStage | 'all';

export const GROUPING_LABEL: Record<HistoryGrouping, string> = {
  date: 'Fecha',
  species: 'Especie',
  stage: 'Etapa',
};

/** Clave del grupo «sin especie»; no es un ID del catálogo, que siempre va prefijado («sp.tomate»). */
const WITHOUT_SPECIES = 'none';

/** Especie indicada al medir; `null` si se midió sin especie o la lectura es anterior al catálogo. */
export const measurementSpeciesId = (m: Measurement): string | null => m.species?.id ?? null;

/** Día de la medición: 28-09-2026. Encabeza los grupos y es su clave. */
export const dayLabel = (iso: string | null | undefined): string => exactDateTime(iso).slice(0, 10);

export interface SpeciesOption {
  /** El ID del catálogo, o `none` para las lecturas sin especie. */
  value: SpeciesFilter;
  label: string;
  count: number;
}

/**
 * Opciones del filtro de especie a partir del inventario del equipo: sólo las especies que
 * alguna vez se midieron, ordenadas por nombre, y «Sin especie» al final si corresponde.
 */
export function speciesOptions(inventory: DeviceSpecies[] | null): SpeciesOption[] {
  if (!inventory) return [];
  const named = inventory
    .filter((row) => row.species)
    .map((row) => ({ value: row.species!.id, label: row.species!.es, count: row.measurements }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  const without = inventory.find((row) => !row.species);
  return without
    ? [...named, { value: WITHOUT_SPECIES, label: 'Sin especie', count: without.measurements }]
    : named;
}

/** Total de lecturas del equipo, de todas las etapas y especies. */
export const totalMeasurements = (inventory: DeviceSpecies[] | null): number =>
  (inventory ?? []).reduce((total, row) => total + row.measurements, 0);

export interface HistorySection {
  key: string;
  title: string;
  data: Measurement[];
}

/**
 * Agrupa por día, especie o etapa. Dentro de cada grupo las lecturas quedan de la más
 * reciente a la más antigua; los grupos de día y de especie se ordenan por su lectura más
 * reciente, con «sin especie» al final, y los de etapa siguen el ciclo productivo.
 */
export function organizeHistory(measurements: Measurement[], by: HistoryGrouping): HistorySection[] {
  const sorted = [...measurements].sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at));
  const groups = new Map<string, HistorySection>();
  for (const m of sorted) {
    const id = measurementSpeciesId(m);
    const key = by === 'species' ? id ?? WITHOUT_SPECIES : by === 'stage' ? m.phenological_stage : dayLabel(m.measured_at);
    const title =
      by === 'species' ? m.species?.es ?? 'Sin especie' : by === 'stage' ? stageLabel(m.phenological_stage) : key;
    const group = groups.get(key);
    if (group) group.data.push(m);
    else groups.set(key, { key, title, data: [m] });
  }
  const sections = [...groups.values()];
  if (by === 'species') {
    return [
      ...sections.filter((s) => s.key !== WITHOUT_SPECIES),
      ...sections.filter((s) => s.key === WITHOUT_SPECIES),
    ];
  }
  if (by === 'stage') {
    // Una etapa fuera del CHECK de la tabla no debe perder su grupo: va al final.
    const order = (key: string) => {
      const index = STAGES.indexOf(key as PhenologicalStage);
      return index < 0 ? STAGES.length : index;
    };
    return sections.sort((a, b) => order(a.key) - order(b.key));
  }
  return sections;
}

// ---------------------------------------------------------------------------
// La vista, en la URL
// ---------------------------------------------------------------------------
//
// Los filtros viven en la barra de direcciones para que un enlace reproduzca
// exactamente lo que el operador está mirando y se pueda pegar en un ticket. Sólo
// se escribe lo que no es el valor por omisión, así la URL de siempre queda limpia.

export interface HistoryView {
  stage: StageFilter;
  species: SpeciesFilter;
  grouping: HistoryGrouping;
  /** Lecturas por página; `MEASUREMENTS_MAX` es el tope de la función. */
  limit: number;
  /** Lecturas que la página se salta. El historial completo no cabe en una consulta. */
  offset: number;
}

export const DEFAULT_VIEW: HistoryView = {
  stage: 'all',
  species: 'all',
  grouping: 'date',
  limit: MEASUREMENTS_PAGE,
  offset: 0,
};

/** Nombres en la URL, en español como las rutas. */
const GROUPING_PARAM: Record<string, HistoryGrouping> = { fecha: 'date', especie: 'species', etapa: 'stage' };
const PARAM_GROUPING: Record<HistoryGrouping, string> = { date: 'fecha', species: 'especie', stage: 'etapa' };
const WITHOUT_SPECIES_PARAM = 'sin-especie';

/** Entero no negativo de la URL; cualquier otra cosa es 0. */
const wholeNumber = (value: string | null): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

/** Lee la vista de la URL. Un valor que no reconoce vuelve al de omisión, no rompe la página. */
export function historyViewFromParams(params: URLSearchParams): HistoryView {
  const stage = params.get('etapa');
  const species = params.get('especie');
  const limit = wholeNumber(params.get('lecturas'));
  return {
    stage: STAGES.includes(stage as PhenologicalStage) ? (stage as PhenologicalStage) : 'all',
    species: species === WITHOUT_SPECIES_PARAM ? WITHOUT_SPECIES : species || 'all',
    grouping: GROUPING_PARAM[params.get('agrupar') ?? ''] ?? 'date',
    limit: limit > MEASUREMENTS_PAGE ? Math.min(limit, MEASUREMENTS_MAX) : MEASUREMENTS_PAGE,
    offset: wholeNumber(params.get('desde')),
  };
}

/** La vista como parámetros de la URL; omite todo lo que esté en su valor por omisión. */
export function historyViewParams(view: HistoryView): Record<string, string> {
  const params: Record<string, string> = {};
  if (view.stage !== 'all') params.etapa = view.stage;
  if (view.species !== 'all') params.especie = view.species === WITHOUT_SPECIES ? WITHOUT_SPECIES_PARAM : view.species;
  if (view.grouping !== 'date') params.agrupar = PARAM_GROUPING[view.grouping];
  if (view.limit !== MEASUREMENTS_PAGE) params.lecturas = String(view.limit);
  if (view.offset !== 0) params.desde = String(view.offset);
  return params;
}

/**
 * Cambia la vista. Filtrar distinto, o cambiar el tamaño de la página, deja la ventana
 * anterior sin sentido: vuelve a la primera. Mover la ventana a mano no se toca.
 */
export function changeView(view: HistoryView, patch: Partial<HistoryView>): HistoryView {
  const next = { ...view, ...patch };
  const movedWindow =
    next.stage !== view.stage || next.species !== view.species || next.limit !== view.limit;
  return movedWindow && patch.offset === undefined ? { ...next, offset: 0 } : next;
}

/** Los filtros de la vista como los espera `admin_device_measurements`. */
export const filtersFor = (view: HistoryView): MeasurementFilters => ({
  stage: view.stage === 'all' ? null : view.stage,
  speciesId: view.species === 'all' || view.species === WITHOUT_SPECIES ? null : view.species,
  withoutSpecies: view.species === WITHOUT_SPECIES,
  limit: view.limit,
  offset: view.offset,
});

/**
 * Identifica una consulta. Agrupar no cambia lo que se pide al servidor, así que no entra:
 * cambiar de agrupación reordena lo que ya está en pantalla, sin ir a la red.
 */
export const queryKey = (view: HistoryView): string =>
  `${view.stage}|${view.species}|${view.limit}|${view.offset}`;
