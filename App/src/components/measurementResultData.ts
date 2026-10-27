import type { ParameterKey } from '../engine/measurementPresentation';
import type { ForecastDay, RemainingTodaySummary } from '../services/weatherService';

export const MEASUREMENT_GROUPS: readonly (readonly ParameterKey[])[] = [
  ['vwc', 'temp', 'ph', 'ec'],
  ['nitrogen', 'phosphorus', 'potassium'],
  ['airTemp', 'airHumidity', 'airPressure'],
];

/** Lee sólo el pronóstico conservado, sin consultar ni reinterpretar el histórico. */
export function savedForecast(diagnosis: unknown): ForecastDay[] {
  if (!diagnosis || typeof diagnosis !== 'object') return [];
  const weather = (diagnosis as { weather?: unknown }).weather;
  if (!weather || typeof weather !== 'object') return [];
  const forecast = (weather as { forecast?: unknown }).forecast;
  if (!Array.isArray(forecast)) return [];
  const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
  return forecast.filter((day): day is Record<string, unknown> => !!day && typeof day === 'object' && typeof day.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date)).slice(0, 5).map(day => ({
    date: day.date as string,
    minimumTemperatureC: number(day.minimumTemperatureC), maximumTemperatureC: number(day.maximumTemperatureC),
    precipitationMm: number(day.precipitationMm), rainProbabilityPct: number(day.rainProbabilityPct),
    weatherCode: number(day.weatherCode),
  }));
}

/** Clima de la consulta: lo que pasaba al medir y el resumen de ese día. */
export interface WeatherNow {
  temperatureC: number | null;
  precipitationMm: number | null;
  /** Minutos que abarca `precipitationMm`, si el proveedor informó el intervalo. */
  precipitationMinutes: number | null;
  weatherCode: number | null;
  today: { minimumTemperatureC: number | null; maximumTemperatureC: number | null; precipitationMm: number | null; rainProbabilityPct: number | null; weatherCode: number | null };
  remainingToday?: RemainingTodaySummary;
}

/**
 * Lee el clima actual de una consulta nueva o del diagnóstico guardado (`diagnosis.weather`),
 * sin consultar de nuevo. Los diagnósticos antiguos no traen el código del tiempo: queda nulo.
 */
/** Procedencia de un pronóstico guardado reutilizado sin red; `null` si se descargó para esa medición. */
export function savedReuse(diagnosis: unknown): { fetchedAt: string; distanceM: number } | null {
  const weather = diagnosis && typeof diagnosis === 'object' ? (diagnosis as { weather?: unknown }).weather : null;
  if (!weather || typeof weather !== 'object') return null;
  const { reuse, fetchedAt } = weather as { reuse?: { distanceM?: unknown }; fetchedAt?: unknown };
  return reuse && typeof reuse.distanceM === 'number' && Number.isFinite(reuse.distanceM) && typeof fetchedAt === 'string'
    ? { fetchedAt, distanceM: reuse.distanceM } : null;
}

export function weatherNow(weather: unknown): WeatherNow | null {
  if (!weather || typeof weather !== 'object') return null;
  const w = weather as Record<string, unknown>;
  const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
  const today = w.today && typeof w.today === 'object' ? w.today as Record<string, unknown> : null;
  const rem = w.remainingToday && typeof w.remainingToday === 'object' ? w.remainingToday as Record<string, unknown> : null;
  const remainingToday: RemainingTodaySummary | undefined = rem
    && typeof rem.date === 'string'
    && typeof rem.fromHour === 'string'
    && typeof rem.toHour === 'string'
    && typeof rem.slotCount === 'number'
    ? {
        date: rem.date,
        fromHour: rem.fromHour,
        toHour: rem.toHour,
        slotCount: rem.slotCount,
        minimumTemperatureC: number(rem.minimumTemperatureC),
        maximumTemperatureC: number(rem.maximumTemperatureC),
        precipitationMm: number(rem.precipitationMm),
        rainProbabilityPct: number(rem.rainProbabilityPct),
        maxWindKmh: number(rem.maxWindKmh),
      }
    : undefined;
  const rain = ((w.inputQuality as { current?: { precipitationMm?: { validFrom?: unknown; validTo?: unknown } } } | undefined)?.current?.precipitationMm);
  const span = typeof rain?.validFrom === 'string' && typeof rain?.validTo === 'string' ? (Date.parse(rain.validTo) - Date.parse(rain.validFrom)) / 60000 : NaN;
  const result: WeatherNow = {
    temperatureC: number(w.temperatureC), precipitationMm: number(w.precipitationMm), weatherCode: number(w.weatherCode),
    precipitationMinutes: Number.isFinite(span) && span > 0 ? Math.round(span) : null,
    today: {
      minimumTemperatureC: number(today ? today.minimumTemperatureC : w.minimumTemperatureC),
      maximumTemperatureC: number(today ? today.maximumTemperatureC : w.maximumTemperatureC),
      precipitationMm: number(today ? today.precipitationMm : w.dailyPrecipitationMm),
      rainProbabilityPct: number(today ? today.rainProbabilityPct : w.rainProbabilityPct),
      weatherCode: number(today?.weatherCode),
    },
    ...(remainingToday ? { remainingToday } : {}),
  };
  const values = [result.temperatureC, result.precipitationMm, result.weatherCode, ...Object.values(result.today)];
  return values.some(v => v !== null) ? result : null;
}
