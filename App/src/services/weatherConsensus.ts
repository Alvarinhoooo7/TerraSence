// Consenso de lluvia entre modelos de pronóstico.
//
// Open-Meteo «best_match» elige un solo modelo por punto, y en Chile central suele anunciar
// llovizna de trazas (0,1 a 0,6 mm) cuando hay nubes sobre la cordillera, aunque en el valle
// no caiga agua. Para no tomar ese ruido como lluvia, la misma consulta pide la precipitación
// horaria de otros modelos globales y la app usa la MEDIANA entre todos: un modelo que se
// desvía no mueve la mediana. Es puro: no consulta la red ni el reloj.

import type { CurrentWeather } from './weatherService';

/** Modelos que se piden además de «best_match». Todos los publica Open-Meteo para cualquier punto. */
export const CONSENSUS_MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless', 'jma_seamless'] as const;

export const PRECIPITATION_CONSENSUS = {
  version: 'precip-consensus-v1',
  /** Modelos con dato que hacen falta para usar la mediana; con menos se conserva «best_match». */
  minModels: 3,
  /** Un modelo dice «llueve ahora» con esta lluvia o más en la hora en curso. */
  wetHourMm: 0.2,
} as const;

/** Lluvia en mm de cada modelo (`best_match` incluido); `null` si el modelo no entregó el período completo. */
export type ModelMm = Record<string, number | null>;

export interface PrecipitationConsensus {
  version: typeof PRECIPITATION_CONSENSUS.version;
  /** Modelos consultados, `best_match` primero. */
  models: string[];
  /** Hora en curso (intervalo horario que contiene la consulta). `null` en un pronóstico reutilizado sin red. */
  now: { slot: string; mm: ModelMm; wet: number; total: number } | null;
  /** Lo que queda del día, desde la hora en curso hasta la medianoche local. */
  remainingToday: { fromSlot: string; toSlot: string; mm: ModelMm; medianMm: number | null } | null;
  /** Por fecha local: lluvia de cada modelo, la que informó «best_match» y la mediana que usa la app. */
  days: Record<string, { mm: ModelMm; reportedMm: number | null; medianMm: number | null }>;
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const finiteNonNegative = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Mediana con al menos `minModels` valores; `null` con menos. */
export function medianMm(values: readonly (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (known.length < PRECIPITATION_CONSENSUS.minModels) return null;
  const mid = Math.floor(known.length / 2);
  return round1(known.length % 2 ? known[mid] : (known[mid - 1] + known[mid]) / 2);
}

/** Series horarias de lluvia por modelo, indexadas por hora local (`AAAA-MM-DDTHH:00`). */
function modelSeries(payload: unknown): Map<string, Map<string, number | null>> {
  const root = record(payload);
  const hourly = record(root.hourly);
  const units = record(root.hourly_units);
  const time = Array.isArray(hourly.time) ? hourly.time : [];
  const result = new Map<string, Map<string, number | null>>();
  for (const model of CONSENSUS_MODELS) {
    const key = `precipitation_${model}`;
    const values = hourly[key];
    if (units[key] !== 'mm' || !Array.isArray(values) || values.length !== time.length) continue;
    const series = new Map<string, number | null>();
    time.forEach((slot, i) => { if (typeof slot === 'string') series.set(slot, finiteNonNegative(values[i])); });
    // Un modelo sin ningún valor no aporta: no cuenta como «0 mm».
    if ([...series.values()].some(v => v !== null)) result.set(model, series);
  }
  return result;
}

/** Suma de las horas indicadas; `null` si falta cualquiera. */
function sumSlots(series: Map<string, number | null>, slots: readonly string[]): number | null {
  if (!slots.length) return null;
  let total = 0;
  for (const slot of slots) {
    const value = series.get(slot);
    if (value == null) return null;
    total += value;
  }
  return round1(total);
}

/**
 * Agrega el consenso de lluvia al pronóstico ya normalizado. La lluvia de cada día pasa a ser
 * la mediana entre modelos y su evidencia lo declara (`methodId`); `reportedValue` conserva
 * lo que informó «best_match». Sin bastantes modelos el día queda como llegó.
 * `includeNow` es falso al reutilizar un pronóstico guardado: el «ahora» de otra hora no vale.
 */
export function applyPrecipitationConsensus(weather: CurrentWeather, modelsPayload: unknown, includeNow = true): CurrentWeather {
  const models = modelSeries(modelsPayload);
  if (!models.size) return weather;
  const best = new Map<string, number | null>();
  weather.hourly?.time.forEach((slot, i) => best.set(slot, weather.hourly?.precipitationMm?.[i] ?? null));
  const all = (fn: (series: Map<string, number | null>) => number | null, bestValue: number | null): ModelMm =>
    Object.fromEntries([['best_match', bestValue], ...[...models].map(([name, series]) => [name, fn(series)] as const)]);

  const daySlots = (date: string) => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`);
  const days: PrecipitationConsensus['days'] = {};
  const adjust = <T extends { date: string; precipitationMm: number | null }>(day: T): T => {
    const mm = all(series => sumSlots(series, daySlots(day.date)), day.precipitationMm);
    const median = medianMm(Object.values(mm));
    days[day.date] = { mm, reportedMm: day.precipitationMm, medianMm: median };
    if (median === null) return day;
    const evidence = weather.inputQuality.daily[day.date]?.precipitationMm;
    if (evidence && evidence.value !== null) { evidence.value = median; evidence.methodId = PRECIPITATION_CONSENSUS.version; }
    return { ...day, precipitationMm: median };
  };
  const today = weather.today ? adjust(weather.today) : undefined;
  const forecast = weather.forecast.map(adjust);

  // Hora en curso y resto del día: los mismos intervalos que `remainingToday` (cada hora del
  // proveedor acumula la lluvia de la hora anterior, así que la primera es la que está pasando).
  const rem = weather.remainingToday;
  let remainingToday: PrecipitationConsensus['remainingToday'] = null;
  let now: PrecipitationConsensus['now'] = null;
  if (rem && weather.hourly) {
    const slots = weather.hourly.time.filter(slot => slot >= rem.fromHour && slot <= rem.toHour);
    const mm = all(series => sumSlots(series, slots), sumSlots(best, slots));
    remainingToday = { fromSlot: rem.fromHour, toSlot: rem.toHour, mm, medianMm: medianMm(Object.values(mm)) };
    if (includeNow) {
      const hour = all(series => series.get(rem.fromHour) ?? null, best.get(rem.fromHour) ?? null);
      const known = Object.values(hour).filter((v): v is number => v !== null);
      now = { slot: rem.fromHour, mm: hour, wet: known.filter(v => v >= PRECIPITATION_CONSENSUS.wetHourMm).length, total: known.length };
    }
  }

  return {
    ...weather,
    ...(today ? { today, dailyPrecipitationMm: today.precipitationMm } : {}),
    forecast,
    precipitationConsensus: { version: PRECIPITATION_CONSENSUS.version, models: ['best_match', ...models.keys()], now, remainingToday, days },
  };
}

/** Consulta de Open-Meteo con la lluvia horaria de los modelos del consenso, alineada con la principal. */
export function consensusQuery(latitude: number, longitude: number, forecastDays: number): string {
  return 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=precipitation&models=${CONSENSUS_MODELS.join(',')}` +
    `&forecast_days=${forecastDays}&timezone=auto&precipitation_unit=mm`;
}
