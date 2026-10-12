import { PHENOLOGICAL_STAGES, type MeasurementPoint, type PhenologicalStage } from '../types/app';
import type { AppLanguage } from '../types/preferences';
import { presentationSpeciesName, savedSpecies } from '../engine/measurementPresentation';

/** undefined mantiene compatibilidad; null consulta todas las sondas explícitamente. */
export function measurementHistoryScope(selectedDeviceId: string | undefined, historyDeviceId: string | null | undefined) {
  return historyDeviceId === undefined ? selectedDeviceId : historyDeviceId;
}

/** Une cachés antiguos sin convertir lecturas respaldadas en pendientes. */
export function mergeCachedHistories(histories: MeasurementPoint[][]): MeasurementPoint[] {
  const points = new Map<string, MeasurementPoint>();
  for (const history of histories) {
    for (const point of history) {
      const key = point.clientUuid ?? point.id;
      const previous = points.get(key);
      if (!previous || (previous.isPending && !point.isPending)) points.set(key, point);
    }
  }
  return [...points.values()].sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
}

/** Server confirmation wins over a pending copy, even when their row IDs differ. */
export function mergeMeasurementHistory(remote: MeasurementPoint[], pending: MeasurementPoint[]) {
  const confirmed = new Set(remote.flatMap(p => [p.id, p.clientUuid].filter((id): id is string => !!id)));
  return [...remote, ...pending.filter(p => !confirmed.has(p.clientUuid ?? p.id)).map(p => ({ ...p, isPending: true }))]
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
}

export type HistoryGrouping = 'date' | 'species' | 'stage';
/** Filtro de especie: todas, una especie por su ID o las lecturas guardadas sin especie. */
export type HistorySpeciesFilter = 'all' | 'none' | string;

/** Especie elegida al medir, leída de la instantánea guardada; `null` si se midió sin especie. */
export const historySpeciesId = (point: MeasurementPoint): string | null => savedSpecies(point.diagnosis)?.id ?? null;

/** Especies presentes en el historial, con su nombre guardado, ordenadas por nombre. */
export function historySpeciesOptions(points: MeasurementPoint[], language: AppLanguage = 'es') {
  const found = new Map<string, string>();
  let withoutSpecies = false;
  for (const point of points) {
    const species = savedSpecies(point.diagnosis);
    if (species) found.set(species.id, presentationSpeciesName(species, language));
    else withoutSpecies = true;
  }
  return {
    species: [...found.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, language)),
    withoutSpecies,
  };
}

const STAGE_ORDER = PHENOLOGICAL_STAGES.map(stage => stage.id);

/**
 * Filtra por etapa y especie y agrupa por día, especie o etapa. Dentro de cada grupo las
 * lecturas quedan de la más reciente a la más antigua; los grupos de especie se ordenan por
 * su lectura más reciente, con «sin especie» al final, y los de etapa siguen el ciclo.
 */
export function organizeHistory(points: MeasurementPoint[], options: {
  by: HistoryGrouping; stage: PhenologicalStage | 'all'; species: HistorySpeciesFilter;
  dayTitle: (iso: string) => string; speciesTitle: (id: string | null) => string; stageTitle: (stage: PhenologicalStage) => string;
}): { key: string; title: string; data: MeasurementPoint[] }[] {
  const sorted = [...points].sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
  const filtered = sorted.filter(point => (options.stage === 'all' || point.stage === options.stage)
    && (options.species === 'all' || (historySpeciesId(point) ?? 'none') === options.species));
  const groups = new Map<string, { key: string; title: string; data: MeasurementPoint[] }>();
  for (const point of filtered) {
    const species = historySpeciesId(point);
    const key = options.by === 'species' ? species ?? 'none' : options.by === 'stage' ? point.stage : options.dayTitle(point.measuredAt);
    const title = options.by === 'species' ? options.speciesTitle(species) : options.by === 'stage' ? options.stageTitle(point.stage) : key;
    const group = groups.get(key);
    if (group) group.data.push(point);
    else groups.set(key, { key, title, data: [point] });
  }
  const sections = [...groups.values()];
  if (options.by === 'species') return [...sections.filter(s => s.key !== 'none'), ...sections.filter(s => s.key === 'none')];
  if (options.by === 'stage') return sections.sort((a, b) => STAGE_ORDER.indexOf(a.key as PhenologicalStage) - STAGE_ORDER.indexOf(b.key as PhenologicalStage));
  return sections;
}
