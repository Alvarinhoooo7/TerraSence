import { numericEvidence } from '../engine/inputQuality';
import { EVIDENCE_POLICY, WEATHER_CACHE_POLICY } from '../engine/evaluationCoverage';
import type { EvidenceDatum } from '../types/agronomy';

export interface ForecastDay {
  date: string;
  minimumTemperatureC: number | null;
  maximumTemperatureC: number | null;
  precipitationMm: number | null;
  rainProbabilityPct: number | null;
  /** Código WMO del tiempo del día; ausente en diagnósticos guardados antes de pedirlo. */
  weatherCode?: number | null;
}

export interface CurrentWeather {
  /** Asociación de la solicitud; no es la coordenada de la celda del modelo. */
  request?: { captureId: string | null; latitude: number; longitude: number };
  /**
   * Pronóstico descargado antes y reutilizado sin red para esta captura (WEATHER_CACHE_POLICY).
   * `request` y `fetchedAt` siguen siendo los de la descarga original; el «ahora» no se reutiliza.
   */
  reuse?: { policyVersion: typeof WEATHER_CACHE_POLICY.version; captureId: string | null; latitude: number; longitude: number;
    distanceM: number; reusedAt: string };
  forecast: ForecastDay[];
  /** Resumen del día de la consulta (fecha local del proveedor); ausente en diagnósticos anteriores. */
  today?: ForecastDay;
  source: 'Open-Meteo';
  timezone: string;
  temperatureC: number | null;
  precipitationMm: number | null;
  windKmh: number | null;
  /** Código WMO del tiempo actual (llovizna, lluvia, chubasco…); ausente en diagnósticos anteriores. */
  weatherCode?: number | null;
  rainProbabilityPct: number | null;
  dailyPrecipitationMm: number | null;
  minimumTemperatureC: number | null;
  maximumTemperatureC: number | null;
  /**
   * Temperatura horaria del aire a 2 m, en hora local del proveedor (`AAAA-MM-DDTHH:mm`).
   * Sólo sirve para estimar cuántas horas dura un episodio; ausente en diagnósticos
   * anteriores y cuando la serie no llega o su unidad no es °C.
   */
  hourly?: { time: string[]; temperatureC: (number | null)[] };
  fetchedAt: string;
  inputQuality: {
    version: 1;
    /** Desplazamiento fijo que el proveedor usa para esta respuesta ISO. */
    providerUtcOffsetSeconds: number | null;
    current: Record<'temperatureC' | 'precipitationMm' | 'windKmh', EvidenceDatum>;
    daily: Record<string, Record<Exclude<keyof ForecastDay, 'date' | 'weatherCode'>, EvidenceDatum>>;
  };
}

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Códigos WMO que publica Open-Meteo. Otro valor no se interpreta. */
const WMO_CODES = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
const weatherCodeOf = (value: unknown): number | null =>
  typeof value === 'number' && WMO_CODES.has(value) ? value : null;

function validDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

/** Sin bloque actual, el día se obtiene del reloj recibido y la zona del proveedor. */
function localDate(fetchedAt: string, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(fetchedAt));
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    return validDate(`${part('year')}-${part('month')}-${part('day')}`);
  } catch { return null; }
}

/** Adaptador puro: no rellena ausencias ni depende del reloj global. */
export function normalizeWeather(payload: unknown, fetchedAt: string): CurrentWeather | null {
  const root = record(payload);
  const current = record(root.current);
  const daily = record(root.daily);
  const currentUnits = record(root.current_units);
  const dailyUnits = record(root.daily_units);
  const hourlyBlock = record(root.hourly);
  const hourlyUnits = record(root.hourly_units);
  const timezone = typeof root.timezone === 'string' ? root.timezone : 'auto';
  const currentTime = typeof current.time === 'string' && /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(current.time)
    ? current.time : null;
  const currentDate = validDate(currentTime?.slice(0, 10));
  const today = currentDate ?? localDate(fetchedAt, timezone);
  if (!today) return null;
  const suppliedOffset = finite(root.utc_offset_seconds);
  const offset = suppliedOffset !== null && Number.isInteger(suppliedOffset) && Math.abs(suppliedOffset) <= 86400 ? suppliedOffset : null;
  const utc = (local: string): string | null => offset !== null
    ? new Date(Date.parse(`${local}Z`) - offset * 1000).toISOString() : null;
  const invalidate = (datum: EvidenceDatum, reason: string) => {
    datum.value = null;
    if (datum.availability !== 'missing') datum.availability = 'invalid';
    datum.limitationCodes.push(reason);
  };
  const datum = (value: unknown, unit: string, reportedUnit: unknown, temporalKind: EvidenceDatum['temporalKind'],
    validFrom: string | null, validTo: string | null, range?: { min: number; max: number }): EvidenceDatum => {
    const result = numericEvidence(value, {
      unit, reportedUnit: typeof reportedUnit === 'string' ? reportedUnit : null,
      source: 'weather_model', temporalKind, validFrom, validTo, timezone: timezone === 'auto' ? null : timezone,
      methodId: null, measurementQuality: 'modelled', interpretation: 'physical_only',
      limitationCodes: [...(validFrom && validTo ? [] : ['time_interval_unknown'])],
    }, range);
    if (reportedUnit !== unit) invalidate(result, reportedUnit == null ? 'unit_missing' : 'unit_mismatch');
    return result;
  };
  const inputQuality: CurrentWeather['inputQuality'] = { version: 1, providerUtcOffsetSeconds: offset,
    current: {} as CurrentWeather['inputQuality']['current'], daily: {} };
  const dates = Array.isArray(daily.time) ? daily.time : [];
  const dayAt = (date: string): ForecastDay => {
    const index = dates.indexOf(date);
    // Una fecha duplicada no permite asociar inequívocamente los valores.
    const value = (key: string) => index >= 0 && dates.lastIndexOf(date) === index && Array.isArray(daily[key])
      ? daily[key][index] : undefined;
    const end = new Date(`${date}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const from = utc(`${date}T00:00:00`);
    const to = utc(`${end.toISOString().slice(0, 10)}T00:00:00`);
    const observations = {
      minimumTemperatureC: datum(value('temperature_2m_min'), '°C', dailyUnits.temperature_2m_min, 'minimum', from, to),
      maximumTemperatureC: datum(value('temperature_2m_max'), '°C', dailyUnits.temperature_2m_max, 'maximum', from, to),
      precipitationMm: datum(value('precipitation_sum'), 'mm', dailyUnits.precipitation_sum, 'sum', from, to, { min: 0, max: Infinity }),
      rainProbabilityPct: datum(value('precipitation_probability_max'), '%', dailyUnits.precipitation_probability_max, 'maximum', from, to, { min: 0, max: 100 }),
    };
    const { minimumTemperatureC, maximumTemperatureC } = observations;
    if (minimumTemperatureC.value !== null && maximumTemperatureC.value !== null && minimumTemperatureC.value > maximumTemperatureC.value) {
      invalidate(minimumTemperatureC, 'inconsistent_temperature_range');
      invalidate(maximumTemperatureC, 'inconsistent_temperature_range');
    }
    for (const key of Object.keys(observations) as (keyof typeof observations)[]) {
      const observation = observations[key];
      if (index >= 0 && dates.lastIndexOf(date) !== index) {
        invalidate(observation, 'duplicate_date');
        observation.availability = 'invalid';
      }
      const providerKey = { minimumTemperatureC: 'temperature_2m_min', maximumTemperatureC: 'temperature_2m_max',
        precipitationMm: 'precipitation_sum', rainProbabilityPct: 'precipitation_probability_max' }[key];
      if (providerKey && daily[providerKey] != null && !Array.isArray(daily[providerKey])) {
        observation.availability = 'invalid';
        observation.limitationCodes.push('invalid_series');
      }
    }
    inputQuality.daily[date] = observations;
    return {
      date, minimumTemperatureC: minimumTemperatureC.value, maximumTemperatureC: maximumTemperatureC.value,
      precipitationMm: observations.precipitationMm.value,
      rainProbabilityPct: observations.rainProbabilityPct.value,
      weatherCode: index >= 0 && dates.lastIndexOf(date) === index ? weatherCodeOf(value('weather_code')) : null,
    };
  };
  const forecast = Array.from({ length: 5 }, (_, offset) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset + 1);
    return dayAt(date.toISOString().slice(0, 10));
  });
  const day = dayAt(today);
  const currentInstant = currentDate && currentTime ? utc(`${currentTime}:00`) : null;
  const interval = finite(current.interval);
  const precipitationFrom = currentInstant && interval !== null && interval > 0 && interval <= 86400
    ? new Date(Date.parse(currentInstant) - interval * 1000).toISOString() : null;
  inputQuality.current = {
    temperatureC: datum(current.temperature_2m, '°C', currentUnits.temperature_2m, 'instant', currentInstant, currentInstant),
    precipitationMm: datum(current.precipitation, 'mm', currentUnits.precipitation, 'sum', precipitationFrom, currentInstant, { min: 0, max: Infinity }),
    windKmh: datum(current.wind_speed_10m, 'km/h', currentUnits.wind_speed_10m, 'instant', currentInstant, currentInstant, { min: 0, max: Infinity }),
  };
  if (!currentDate) for (const observation of Object.values(inputQuality.current)) invalidate(observation, 'invalid_current_time');
  const temperatureC = inputQuality.current.temperatureC.value;
  const precipitationMm = inputQuality.current.precipitationMm.value;
  const windKmh = inputQuality.current.windKmh.value;
  const hasDailyData = [day, ...forecast].some(item =>
    [item.minimumTemperatureC, item.maximumTemperatureC, item.precipitationMm, item.rainProbabilityPct].some(value => value !== null));
  if (!hasDailyData && temperatureC === null && precipitationMm === null && windKmh === null) return null;
  // Serie horaria: la hora inválida o repetida se descarta; un valor ausente queda null.
  const hourlyTimes = Array.isArray(hourlyBlock.time) ? hourlyBlock.time : [];
  const hourlyValues = Array.isArray(hourlyBlock.temperature_2m) ? hourlyBlock.temperature_2m : [];
  const hourly = hourlyUnits.temperature_2m === '°C' && hourlyTimes.length && hourlyTimes.length === hourlyValues.length
    ? hourlyTimes.flatMap((time, index) => typeof time === 'string' && /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):00$/.test(time)
      && hourlyTimes.indexOf(time) === hourlyTimes.lastIndexOf(time) ? [{ time, temperatureC: finite(hourlyValues[index]) }] : [])
    : [];
  return {
    forecast, today: day, source: 'Open-Meteo', timezone, temperatureC, precipitationMm, windKmh,
    weatherCode: currentDate ? weatherCodeOf(current.weather_code) : null,
    rainProbabilityPct: day.rainProbabilityPct,
    dailyPrecipitationMm: day.precipitationMm,
    minimumTemperatureC: day.minimumTemperatureC,
    maximumTemperatureC: day.maximumTemperatureC,
    ...(hourly.length ? { hourly: { time: hourly.map(h => h.time), temperatureC: hourly.map(h => h.temperatureC) } } : {}),
    fetchedAt, inputQuality,
  };
}

// --- Caché sin red ------------------------------------------------------------------------

/** Variables, unidades y horizonte de la consulta: una caché de otra consulta no se reutiliza. */
export const WEATHER_ADAPTER_VERSION = 'open-meteo-forecast-v1';

export interface WeatherCacheEntry {
  adapter: string;
  latitude: number;
  longitude: number;
  fetchedAt: string;
  /** Respuesta del proveedor tal como llegó: se vuelve a normalizar al reutilizarla. */
  payload: unknown;
}

/** Distancia sobre la esfera (haversine), en metros. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (deg: number) => deg * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const validEntry = (value: unknown): value is WeatherCacheEntry => {
  const e = value as WeatherCacheEntry;
  return !!e && typeof e === 'object' && typeof e.adapter === 'string' && typeof e.fetchedAt === 'string'
    && Number.isFinite(e.latitude) && Number.isFinite(e.longitude) && !!e.payload && typeof e.payload === 'object';
};

/**
 * Elige y reconstruye el pronóstico guardado más cercano que sigue vigente. Sin el bloque
 * actual: el tiempo «ahora» de otra hora no se presenta como el de esta captura. Los días se
 * recalculan desde el reloj recibido, así que un día ya pasado no vuelve a contar como hoy y
 * lo que la caché no cubre queda como hueco.
 */
export function reuseCachedWeather(
  entries: readonly unknown[], latitude: number, longitude: number, captureId: string | null, now: string,
): CurrentWeather | null {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const candidates = entries.filter(validEntry).flatMap(entry => {
    const age = nowMs - Date.parse(entry.fetchedAt);
    const distanceM = distanceMeters(entry, { latitude, longitude });
    return entry.adapter === WEATHER_ADAPTER_VERSION && Number.isFinite(age) && age >= 0 && age <= EVIDENCE_POLICY.weatherMaxAgeMs
      && distanceM <= WEATHER_CACHE_POLICY.maxDistanceM ? [{ entry, age, distanceM }] : [];
  }).sort((a, b) => a.distanceM - b.distanceM || a.age - b.age);
  const chosen = candidates[0];
  if (!chosen) return null;
  const { current: _current, ...payload } = chosen.entry.payload as Record<string, unknown>;
  const weather = normalizeWeather(payload, new Date(nowMs).toISOString());
  if (!weather) return null;
  for (const datum of Object.values(weather.inputQuality.current)) {
    datum.limitationCodes = [...datum.limitationCodes.filter(code => code !== 'invalid_current_time'), 'cached_current_omitted'];
  }
  return { ...weather, fetchedAt: new Date(Date.parse(chosen.entry.fetchedAt)).toISOString(),
    request: { captureId: null, latitude: chosen.entry.latitude, longitude: chosen.entry.longitude },
    reuse: { policyVersion: WEATHER_CACHE_POLICY.version, captureId, latitude, longitude,
      distanceM: Math.round(chosen.distanceM), reusedAt: new Date(nowMs).toISOString() } };
}

/** Agrega una descarga y descarta las vencidas o de otra consulta; conserva las más recientes. */
export function rememberWeather(entries: readonly unknown[], entry: WeatherCacheEntry): WeatherCacheEntry[] {
  const nowMs = Date.parse(entry.fetchedAt);
  const kept = entries.filter(validEntry).filter(e => e.adapter === WEATHER_ADAPTER_VERSION
    && nowMs - Date.parse(e.fetchedAt) <= EVIDENCE_POLICY.weatherMaxAgeMs && distanceMeters(e, entry) > 1);
  return [entry, ...kept].slice(0, WEATHER_CACHE_POLICY.maxEntries);
}

/**
 * Pronóstico para la captura. Con red, descarga y, si hay `cacheScope` (la cuenta), lo
 * guarda. Sin red o ante un error del proveedor, reutiliza una descarga vigente cercana de
 * esa misma cuenta; si no hay, devuelve `null` y el resultado se queda con la lectura local.
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  captureId: string | null = null,
  cacheScope: string | null = null,
): Promise<CurrentWeather | null> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const live = await downloadWeather(latitude, longitude, captureId, cacheScope);
  if (live || !cacheScope) return live;
  // Importación diferida: el almacenamiento del teléfono no se carga donde sólo se normaliza.
  const { readWeatherCache } = await import('./weatherCacheStore');
  return reuseCachedWeather(await readWeatherCache(cacheScope), latitude, longitude, captureId, new Date().toISOString());
}

async function downloadWeather(latitude: number, longitude: number, captureId: string | null, cacheScope: string | null): Promise<CurrentWeather | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${latitude}&longitude=${longitude}` +
      '&current=temperature_2m,precipitation,wind_speed_10m,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code' +
      '&hourly=temperature_2m' +
      '&forecast_days=6&timezone=auto' +
      '&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm';
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    const fetchedAt = new Date().toISOString();
    const weather = normalizeWeather(payload, fetchedAt);
    if (weather && cacheScope) void import('./weatherCacheStore')
      .then(({ storeWeather }) => storeWeather(cacheScope, { adapter: WEATHER_ADAPTER_VERSION, latitude, longitude, fetchedAt, payload }))
      .catch(() => undefined);
    return weather ? { ...weather, request: { captureId, latitude, longitude } } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
