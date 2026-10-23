import type { CapabilityId, EvaluationCoverage, LocalInputQuality, LocalVariable } from '../types/agronomy';
import type { CurrentWeather } from '../services/weatherService';

export interface WeatherEvaluationContext {
  captureId: string;
  location: { latitude: number; longitude: number } | null;
  evaluatedAt: string;
}
export interface WeatherCoverage {
  policyVersion: typeof EVIDENCE_POLICY.version;
  status: 'evaluated' | 'partial' | 'not_evaluated';
  evidence: 'modelled';
  evaluatedAt: string | null;
  limitationCodes: string[];
}

/** Política técnica de uso, no vida útil agronómica de una muestra. */
export const EVIDENCE_POLICY = { version: 'capture-evidence-v1', localMaxAgeMs: 30 * 60_000, weatherMaxAgeMs: 3 * 60 * 60_000 } as const;

/**
 * Reutilización sin red de un pronóstico descargado (MOTOR_AGRONOMICO.md §5.5). La vigencia es
 * la de cualquier pronóstico (`weatherMaxAgeMs`). El radio de 1 km queda muy por debajo de la
 * resolución de los modelos globales que combina Open-Meteo (del orden de 10 km o más), así que
 * dos puntos a esa distancia comparten, en la práctica, el mismo pronóstico; la distancia se
 * guarda y se muestra. Es por cuenta: la ubicación de una cuenta no se usa en otra.
 */
export const WEATHER_CACHE_POLICY = { version: 'weather-cache-v1', maxDistanceM: 1000, maxEntries: 3 } as const;

export function evidenceFreshness(observedAt: string | null, evaluatedAt: string | null, maxAgeMs: number): EvaluationCoverage['freshness'] {
  const parse = (value: string | null) => value && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  const age = parse(evaluatedAt) - parse(observedAt);
  if (!Number.isFinite(age) || age < 0) return 'unknown';
  return age <= maxAgeMs ? 'fresh' : 'stale';
}

export function buildEvaluationCoverage(quality: LocalInputQuality, evaluatedAt: string | null): EvaluationCoverage {
  const freshness = evidenceFreshness(quality.observations.temp.validFrom, evaluatedAt, EVIDENCE_POLICY.localMaxAgeMs);
  // `notes`: límites que no suspenden la capacidad. El DPV se calcula (localPhysics.ts) pero
  // es un indicador continuo: no hay umbral revisado que lo convierta en categoría (§6.1).
  const definitions: Record<CapabilityId, { inputs: LocalVariable[]; blocked?: string; notes?: string[] }> = {
    soil_temperature: { inputs: ['temp'] },
    soil_moisture: { inputs: ['vwc'] },
    ph_comparison: { inputs: ['ph'] },
    salinity: { inputs: ['ec'], blocked: 'compatible_ec_method_missing' },
    nutrition: { inputs: ['nitrogen', 'phosphorus', 'potassium'], blocked: 'chemical_validation_missing' },
    ambient_vpd: { inputs: ['airTemp', 'airHumidity'], notes: ['continuous_indicator_only'] },
  };
  const capabilities = {} as EvaluationCoverage['capabilities'];
  for (const [id, { inputs, blocked, notes = [] }] of Object.entries(definitions) as [CapabilityId, typeof definitions[CapabilityId]][]) {
    const missing = inputs.some(key => quality.observations[key].availability !== 'available');
    capabilities[id] = {
      status: missing || blocked || freshness !== 'fresh' ? 'not_evaluated' : 'partial',
      evidence: id === 'nutrition' ? 'unvalidated' : 'uncharacterized', inputs,
      limitationCodes: [...new Set([
        ...inputs.flatMap(key => quality.observations[key].limitationCodes),
        ...(blocked ? [blocked] : []), ...notes, ...(freshness === 'fresh' ? [] : [`local_time_${freshness}`]),
      ])],
    };
  }
  return { version: 1, policyVersion: EVIDENCE_POLICY.version, evaluatedAt, freshness, capabilities };
}

/** Una coordenada de celda modelada nunca sustituye la ubicación solicitada ni la sonda. */
export function assessWeatherEvidence(weather: CurrentWeather | null, context?: WeatherEvaluationContext): WeatherCoverage {
  const limitationCodes: string[] = [];
  if (!weather) limitationCodes.push('weather_missing');
  if (weather) {
    const location = context?.location;
    // Un pronóstico reutilizado sin red se asocia a la captura que lo reutiliza, dentro del radio de la caché.
    const target = weather.reuse ?? weather.request;
    if (!location || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 ||
      !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) limitationCodes.push('capture_location_missing');
    if (!context?.captureId || target?.captureId !== context.captureId) limitationCodes.push('weather_capture_mismatch');
    if (!location || target?.latitude !== location.latitude || target?.longitude !== location.longitude
      || (weather.reuse && !(weather.reuse.distanceM <= WEATHER_CACHE_POLICY.maxDistanceM))) limitationCodes.push('weather_location_mismatch');
    const freshness = evidenceFreshness(weather.fetchedAt, context?.evaluatedAt ?? null, EVIDENCE_POLICY.weatherMaxAgeMs);
    if (freshness !== 'fresh') limitationCodes.push(`weather_time_${freshness}`);
  }
  const blocked = limitationCodes.length > 0;
  const complete = weather?.forecast.length === 5 && weather.forecast.every(day =>
    [day.minimumTemperatureC, day.maximumTemperatureC, day.precipitationMm, day.rainProbabilityPct].every(value => typeof value === 'number' && Number.isFinite(value)));
  if (!blocked && !complete) limitationCodes.push('daily_coverage_incomplete');
  if (!blocked && weather?.reuse) limitationCodes.push('weather_reused_offline');
  return { policyVersion: EVIDENCE_POLICY.version, evidence: 'modelled', evaluatedAt: context?.evaluatedAt ?? null,
    status: blocked ? 'not_evaluated' : complete ? 'evaluated' : 'partial', limitationCodes };
}
