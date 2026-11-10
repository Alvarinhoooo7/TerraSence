import { PHENOLOGICAL_STAGES, type MeasurementPoint, type PhenologicalStage } from '../types/app';
import type { AppLanguage } from '../types/preferences';
import { presentationSpeciesName, savedSpecies } from '../engine/measurementPresentation';
import {
  airPressureAccuracyBandHpa,
  ecAccuracyBandUsCm,
  phAccuracyBand,
  soilTempAccuracyBandC,
  vwcAccuracyBandPct,
} from '../engine/localPhysics';
import { timedOperation } from './timedOperation';

/** Límite para consultar el historial remoto antes de mostrar la copia local (ES5: evita esperas de 10–15 s sin red). */
export const REMOTE_HISTORY_TIMEOUT_MS = 3_000;

/**
 * Ejecuta la consulta remota del historial con un presupuesto de tiempo único (`REMOTE_HISTORY_TIMEOUT_MS`),
 * cancelando el `AbortSignal` si la red no responde y cayendo de inmediato a la copia local (`fallback`).
 */
export async function runBoundedRemoteHistory<T>(
  remote: (signal: AbortSignal) => Promise<T>,
  fallback: () => Promise<T>,
  timeoutMs = REMOTE_HISTORY_TIMEOUT_MS,
): Promise<{ data: T; offline: boolean }> {
  const controller = new AbortController();
  try {
    const data = await timedOperation(
      Promise.resolve(remote(controller.signal)),
      timeoutMs,
      () => controller.abort(),
      'La consulta del historial tardó demasiado.',
    );
    return { data, offline: false };
  } catch {
    return { data: await fallback(), offline: true };
  }
}

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

/** Si la copia local de un historial (`[campo, equipo]`) debe incluir lecturas de ese equipo. */
export function historyScopeIncludes(scope: string, deviceId: string | null): boolean {
  try {
    const parsed = JSON.parse(scope) as unknown;
    return Array.isArray(parsed) && parsed.length === 2 && (parsed[1] === null || parsed[1] === deviceId);
  } catch { return false; }
}

/**
 * Copia local del historial con una lectura recién confirmada por el servidor. Sin esto, lo
 * que se sube con red no se ve sin red hasta la próxima descarga completa del historial.
 * `null` si la copia guardada no es una lista: no se reescribe lo que no se entiende.
 */
export function withConfirmedPoint(cached: unknown, point: MeasurementPoint): MeasurementPoint[] | null {
  const { isPending: _pending, ...confirmed } = point;
  return Array.isArray(cached) ? mergeCachedHistories([[confirmed], cached as MeasurementPoint[]]) : null;
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


// --- Comparación de lecturas sucesivas en el mismo sitio (MOTOR_AGRONOMICO.md §10.2, T41) ---

/** Radio máximo Haversine para considerar dos capturas dentro del mismo sitio operativo (§10.2). */
export const SAME_SITE_MAX_DISTANCE_M = 25;
/** Incertidumbre GPS máxima aceptada en cada captura para habilitar comparación espacial (§10.2). */
export const SAME_SITE_MAX_GPS_ACCURACY_M = 25;
/** Ventana temporal máxima entre dos lecturas comparables del mismo sitio (§10.2). */
export const SAME_SITE_MAX_WINDOW_DAYS = 30;

export type SameSiteIneligibilityReason =
  | 'simulated_capture'
  | 'missing_coordinates'
  | 'insufficient_gps_accuracy'
  | 'no_previous_candidate'
  | 'different_device'
  | 'outside_spatial_radius'
  | 'outside_time_window';

export interface SameSiteParameterDelta {
  parameter: 'vwc' | 'temp' | 'ec' | 'ph' | 'airPressure';
  previousValue: number;
  currentValue: number;
  delta: number;
  unit: string;
  /**
   * Cota de **exactitud** declarada por el manual de la sonda CWT-Soil-NPKPHCTH-S o del BME280
   * para ese canal (`localPhysics.ts`). No es una repetibilidad medida: incluye el error de
   * calibración, que al restar dos lecturas de la misma sonda se cancela en buena parte, de modo
   * que el umbral es conservador y puede declarar «dentro de la exactitud» una variación real.
   */
  instrumentalBand: number;
  /** `true` sólo cuando |delta| supera la cota de exactitud declarada para ese canal. */
  exceedsInstrumentalBand: boolean;
  direction: 'increase' | 'decrease' | 'within_noise';
  summary: string;
}

export interface SameSiteComparisonResult {
  comparable: boolean;
  reasonIfNotComparable: SameSiteIneligibilityReason | null;
  previousPointId: string | null;
  previousMeasuredAt: string | null;
  elapsedHours: number | null;
  distanceMeters: number | null;
  combinedGpsUncertaintyM: number | null;
  sameSpecies: boolean;
  sameStage: boolean;
  deltas: SameSiteParameterDelta[];
  summary: string;
  /** Salvaguardas explícitas de sonda portátil (MOTOR_AGRONOMICO.md §10.2, T41). */
  limitations: string[];
}

const EARTH_RADIUS_M = 6_371_000;

/** Distancia geodésica Haversine en metros entre dos coordenadas WGS84 válidas. */
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function isSimulatedPoint(point: MeasurementPoint): boolean {
  if (!point.diagnosis || typeof point.diagnosis !== 'object') return false;
  const diag = point.diagnosis as Record<string, unknown>;
  if (diag.simulated === true) return true;
  const snapshot = diag.engineSnapshot as Record<string, unknown> | undefined;
  const quality = (snapshot?.inputQuality ?? diag.inputQuality) as Record<string, unknown> | undefined;
  return quality?.captureSource === 'simulated';
}

function hasValidCoordinates(point: MeasurementPoint): point is MeasurementPoint & { latitude: number; longitude: number } {
  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function hasAcceptableGpsAccuracy(point: MeasurementPoint, maxAccuracyM: number): point is MeasurementPoint & { gpsAccuracyM: number } {
  return (
    typeof point.gpsAccuracyM === 'number' &&
    Number.isFinite(point.gpsAccuracyM) &&
    point.gpsAccuracyM >= 0 &&
    point.gpsAccuracyM <= maxAccuracyM
  );
}

const PORTABLE_PROBE_LIMITATIONS_ES = [
  'Sonda portátil de inserción puntual: dos capturas dentro de 25 m no garantizan idéntica profundidad de inserción, contacto con suelo ni posición respecto del bulbo húmedo.',
  'Las diferencias observadas no permiten deducir textura del suelo, capacidad de campo, punto de marchitez permanente, velocidad de drenaje ni la ocurrencia de un riego o fertilización no registrados (T41).',
  'El umbral que separa variación real de ruido es la exactitud declarada por el manual de la sonda, no una repetibilidad medida. Como el error de calibración se cancela al restar dos lecturas del mismo equipo, el umbral es conservador: puede dar por ruido un cambio que la sonda sí resuelve.',
];

const PORTABLE_PROBE_LIMITATIONS_EN = [
  'Portable point-insertion probe: two captures within 25 m do not guarantee identical insertion depth, soil contact, or position relative to the wetting bulb.',
  'Observed differences do not infer soil texture, field capacity, permanent wilting point, drainage rate, or an unrecorded irrigation or fertilization event (T41).',
  "The threshold separating real change from noise is the accuracy declared in the probe manual, not a measured repeatability. Because the calibration error cancels when subtracting two readings from the same unit, the threshold is conservative: it may report as noise a change the probe does resolve.",
];

function formatNumber(n: number, decimals: number, language: AppLanguage): string {
  const fixed = n.toFixed(decimals);
  return language === 'es' ? fixed.replace('.', ',') : fixed;
}

/**
 * Evalúa si la captura actual (`current`) puede compararse con una lectura previa del
 * historial (`candidates`) tomada en el mismo sitio operativo (§10.2, T41) y calcula las
 * variaciones frente a la banda de repetibilidad instrumental de la sonda CWT-Soil-NPKPHCTH-S.
 */
export function compareSameSiteReadings(
  current: MeasurementPoint,
  candidates: readonly MeasurementPoint[],
  language: AppLanguage = 'es',
  options?: {
    maxDistanceM?: number;
    maxGpsAccuracyM?: number;
    maxWindowDays?: number;
  },
): SameSiteComparisonResult {
  const en = language === 'en';
  const maxDistanceM = options?.maxDistanceM ?? SAME_SITE_MAX_DISTANCE_M;
  const maxGpsAccuracyM = options?.maxGpsAccuracyM ?? SAME_SITE_MAX_GPS_ACCURACY_M;
  const maxWindowDays = options?.maxWindowDays ?? SAME_SITE_MAX_WINDOW_DAYS;
  const baseLimitations = en ? [...PORTABLE_PROBE_LIMITATIONS_EN] : [...PORTABLE_PROBE_LIMITATIONS_ES];

  const ineligible = (reason: SameSiteIneligibilityReason, messageEs: string, messageEn: string): SameSiteComparisonResult => ({
    comparable: false,
    reasonIfNotComparable: reason,
    previousPointId: null,
    previousMeasuredAt: null,
    elapsedHours: null,
    distanceMeters: null,
    combinedGpsUncertaintyM: null,
    sameSpecies: false,
    sameStage: false,
    deltas: [],
    summary: en ? messageEn : messageEs,
    limitations: baseLimitations,
  });

  if (isSimulatedPoint(current)) {
    return ineligible(
      'simulated_capture',
      'No se compara con lecturas previas porque la captura actual proviene de simulación.',
      'Not compared with previous readings because the current capture is simulated.',
    );
  }
  if (!hasValidCoordinates(current)) {
    return ineligible(
      'missing_coordinates',
      'Sin coordenadas GPS válidas en la captura actual: no se puede confirmar que corresponda al mismo sitio.',
      'No valid GPS coordinates on the current capture: cannot confirm it belongs to the same site.',
    );
  }
  if (!hasAcceptableGpsAccuracy(current, maxGpsAccuracyM)) {
    return ineligible(
      'insufficient_gps_accuracy',
      `Precisión GPS insuficiente en la captura actual (se exige ≤ ${maxGpsAccuracyM} m para comparar en el mismo sitio).`,
      `Insufficient GPS accuracy on the current capture (≤ ${maxGpsAccuracyM} m required for same-site comparison).`,
    );
  }

  const currentMs = Date.parse(current.measuredAt);
  if (!Number.isFinite(currentMs)) {
    return ineligible(
      'no_previous_candidate',
      'La captura actual no tiene marca de tiempo válida para compararla con el historial.',
      'Current capture has no valid timestamp for historical comparison.',
    );
  }

  const others = candidates.filter(c => c.id !== current.id && (current.clientUuid == null || c.clientUuid !== current.clientUuid));
  if (others.length === 0) {
    return ineligible(
      'no_previous_candidate',
      'No hay lecturas previas registradas para contrastar este sitio.',
      'No previous readings recorded to compare this site.',
    );
  }

  let sawDifferentDevice = false;
  let sawOutsideRadius = false;
  let sawOutsideWindow = false;
  let sawBadGps = false;

  const validMatches: { point: MeasurementPoint; elapsedHours: number; distanceMeters: number }[] = [];

  for (const candidate of others) {
    if (isSimulatedPoint(candidate)) continue;
    if (current.deviceId !== undefined || candidate.deviceId !== undefined) {
      if (!current.deviceId || !candidate.deviceId || candidate.deviceId !== current.deviceId) {
        sawDifferentDevice = true;
        continue;
      }
    }
    if (!hasValidCoordinates(candidate) || !hasAcceptableGpsAccuracy(candidate, maxGpsAccuracyM)) {
      sawBadGps = true;
      continue;
    }
    const candidateMs = Date.parse(candidate.measuredAt);
    if (!Number.isFinite(candidateMs) || candidateMs >= currentMs) continue;
    const elapsedHours = (currentMs - candidateMs) / 3_600_000;
    if (elapsedHours > maxWindowDays * 24) {
      sawOutsideWindow = true;
      continue;
    }
    const distanceMeters = haversineDistanceMeters(
      current.latitude,
      current.longitude,
      candidate.latitude,
      candidate.longitude,
    );
    if (distanceMeters > maxDistanceM) {
      sawOutsideRadius = true;
      continue;
    }
    validMatches.push({ point: candidate, elapsedHours, distanceMeters });
  }

  if (validMatches.length === 0) {
    if (sawOutsideRadius) {
      return ineligible(
        'outside_spatial_radius',
        `Las lecturas previas están a más de ${maxDistanceM} m: no se comparan como mismo sitio.`,
        `Previous readings are more than ${maxDistanceM} m away: not compared as the same site.`,
      );
    }
    if (sawOutsideWindow) {
      return ineligible(
        'outside_time_window',
        `No hay lecturas previas en este sitio dentro de los últimos ${maxWindowDays} días.`,
        `No previous readings at this site within the last ${maxWindowDays} days.`,
      );
    }
    if (sawDifferentDevice) {
      return ineligible(
        'different_device',
        'Las lecturas cercanas provienen de otra sonda: no se mezclan sin calibración cruzada.',
        'Nearby readings come from another probe: not mixed without cross-calibration.',
      );
    }
    if (sawBadGps) {
      return ineligible(
        'insufficient_gps_accuracy',
        `Las lecturas previas no cumplen con coordenadas y precisión GPS ≤ ${maxGpsAccuracyM} m.`,
        `Previous readings do not meet coordinate and GPS accuracy ≤ ${maxGpsAccuracyM} m requirements.`,
      );
    }
    return ineligible(
      'no_previous_candidate',
      'No se encontró una lectura anterior elegible en el mismo sitio.',
      'No eligible prior reading found at the same site.',
    );
  }

  validMatches.sort((a, b) => a.elapsedHours - b.elapsedHours);
  const best = validMatches[0];
  const prev = best.point;
  const elapsedHours = Math.round(best.elapsedHours * 10) / 10;
  const distanceMeters = Math.round(best.distanceMeters * 10) / 10;
  const combinedGpsUncertaintyM = Math.round(Math.hypot(current.gpsAccuracyM, prev.gpsAccuracyM ?? 0) * 10) / 10;
  const sameSpecies = historySpeciesId(current) === historySpeciesId(prev);
  const sameStage = current.stage === prev.stage;

  const deltas: SameSiteParameterDelta[] = [];

  const pushDelta = (
    parameter: SameSiteParameterDelta['parameter'],
    prevVal: number | null | undefined,
    currVal: number | null | undefined,
    unit: string,
    band: number,
    decimals: number,
    labelEs: string,
    labelEn: string,
  ) => {
    if (typeof prevVal !== 'number' || !Number.isFinite(prevVal) || typeof currVal !== 'number' || !Number.isFinite(currVal)) return;
    const rawDelta = currVal - prevVal;
    const factor = 10 ** decimals;
    const delta = Math.round(rawDelta * factor) / factor;
    const exceeds = Math.abs(rawDelta) > band;
    const direction: SameSiteParameterDelta['direction'] = !exceeds
      ? 'within_noise'
      : rawDelta > 0
        ? 'increase'
        : 'decrease';
    const sign = delta > 0 ? '+' : '';
    const dStr = `${sign}${formatNumber(delta, decimals, language)}${unit ? ` ${unit}` : ''}`;
    const bStr = `±${formatNumber(band, decimals, language)}${unit ? ` ${unit}` : ''}`;
    const summary = exceeds
      ? en
        ? `${labelEn}: ${dStr} (exceeds the probe's declared accuracy ${bStr}).`
        : `${labelEs}: ${dStr} (supera la exactitud declarada de la sonda, ${bStr}).`
      : en
        ? `${labelEn}: ${dStr} (within the probe's declared accuracy ${bStr}).`
        : `${labelEs}: ${dStr} (dentro de la exactitud declarada de la sonda, ${bStr}).`;
    deltas.push({
      parameter,
      previousValue: prevVal,
      currentValue: currVal,
      delta,
      unit,
      instrumentalBand: band,
      exceedsInstrumentalBand: exceeds,
      direction,
      summary,
    });
  };

  // Las cotas salen de `localPhysics.ts`, que es donde vive la especificación de la sonda: la ficha
  // de cada parámetro y esta comparación no pueden declarar cifras distintas para el mismo canal.
  // Se evalúan sobre la mayor de las dos lecturas, que es la que da la cota más amplia.
  const vwcBand = vwcAccuracyBandPct(Math.max(current.vwcPercent, prev.vwcPercent));
  const ecBand = ecAccuracyBandUsCm(Math.max(current.ecUsCm, prev.ecUsCm));

  pushDelta('vwc', prev.vwcPercent, current.vwcPercent, '%', vwcBand, 1, 'Humedad del suelo', 'Soil moisture');
  pushDelta('temp', prev.soilTempC, current.soilTempC, '°C', soilTempAccuracyBandC(), 1, 'Temperatura del suelo', 'Soil temperature');
  pushDelta('ec', prev.ecUsCm, current.ecUsCm, 'µS/cm', ecBand, 0, 'Conductividad eléctrica', 'Electrical conductivity');
  pushDelta('ph', prev.ph, current.ph, '', phAccuracyBand(), 1, 'pH del suelo', 'Soil pH');
  pushDelta('airPressure', prev.airPressure, current.airPressure, 'hPa', airPressureAccuracyBandHpa(), 1, 'Presión barométrica', 'Barometric pressure');

  const significant = deltas.filter(d => d.exceedsInstrumentalBand);
  const summary =
    significant.length === 0
      ? en
        ? `Compared with the reading from ${formatNumber(elapsedHours, 1, 'en')} h ago (${formatNumber(distanceMeters, 1, 'en')} m away), all soil variables remain within the probe's instrumental repeatability margin.`
        : `Respecto de la lectura tomada hace ${formatNumber(elapsedHours, 1, 'es')} h (a ${formatNumber(distanceMeters, 1, 'es')} m), todas las variables de suelo se mantienen dentro del margen de repetibilidad instrumental de la sonda.`
      : en
        ? `Compared with the reading from ${formatNumber(elapsedHours, 1, 'en')} h ago (${formatNumber(distanceMeters, 1, 'en')} m away): ${significant.map(d => d.summary).join(' ')}`
        : `Respecto de la lectura tomada hace ${formatNumber(elapsedHours, 1, 'es')} h (a ${formatNumber(distanceMeters, 1, 'es')} m): ${significant.map(d => d.summary).join(' ')}`;

  return {
    comparable: true,
    reasonIfNotComparable: null,
    previousPointId: prev.id,
    previousMeasuredAt: prev.measuredAt,
    elapsedHours,
    distanceMeters,
    combinedGpsUncertaintyM,
    sameSpecies,
    sameStage,
    deltas,
    summary,
    limitations: baseLimitations,
  };
}
