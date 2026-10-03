import type { ParameterKey } from '../engine/measurementPresentation';
import type { ForecastDay } from '../services/weatherService';

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
  }));
}
