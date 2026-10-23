import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { assessWeatherEvidence, EVIDENCE_POLICY, WEATHER_CACHE_POLICY } from '../src/engine/evaluationCoverage';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { savedReuse } from '../src/components/measurementResultData';
import {
  distanceMeters, fetchCurrentWeather, rememberWeather, reuseCachedWeather, WEATHER_ADAPTER_VERSION, type WeatherCacheEntry,
} from '../src/services/weatherService';
import type { SoilMeasurement } from '../src/types/agronomy';
import { WEATHER_UNITS } from './fixtures/weatherUnits';

// Respuesta con la forma de Open-Meteo para Santiago, descargada a las 10:00 locales del 22 de octubre.
const payload = {
  ...WEATHER_UNITS, timezone: 'America/Santiago',
  current: { time: '2026-10-22T10:00', interval: 900, temperature_2m: 14, precipitation: 0, wind_speed_10m: 6 },
  daily: {
    time: ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'],
    temperature_2m_min: [3, -2, 4, 5, 6, 7], temperature_2m_max: [18, 15, 20, 22, 23, 24],
    precipitation_probability_max: [0, 0, 10, 0, 0, 0], precipitation_sum: [0, 0, 0, 0, 0, 0],
  },
};
const home = { latitude: -33.4600, longitude: -70.7500 };
const entry = (over: Partial<WeatherCacheEntry> = {}): WeatherCacheEntry => ({
  adapter: WEATHER_ADAPTER_VERSION, ...home, fetchedAt: '2026-10-22T13:00:00.000Z', payload, ...over,
});
// 500 m al norte del punto de descarga.
const nearby = { latitude: -33.4555, longitude: -70.7500 };
const raw: SoilMeasurement = { vwc: 22, temp: 15, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 12, airHumidity: 60, airPressure: 1010 };

test('distancia: haversine en metros', () => {
  assert.equal(Math.round(distanceMeters(home, home)), 0);
  const d = distanceMeters(home, nearby);
  assert.ok(d > 480 && d < 520, String(d));
});

test('caché: un pronóstico vigente y cercano se reutiliza sin el «ahora» y con su procedencia', () => {
  const weather = reuseCachedWeather([entry()], nearby.latitude, nearby.longitude, 'captura-sin-red', '2026-10-22T14:30:00.000Z')!;
  assert.ok(weather);
  assert.equal(weather.fetchedAt, '2026-10-22T13:00:00.000Z', 'conserva la hora de descarga, no la de reutilización');
  assert.deepEqual(weather.request, { captureId: null, ...home });
  assert.equal(weather.reuse?.captureId, 'captura-sin-red');
  assert.ok(weather.reuse!.distanceM > 480 && weather.reuse!.distanceM < 520);
  assert.equal(weather.reuse?.policyVersion, WEATHER_CACHE_POLICY.version);
  // El tiempo actual de hace hora y media no se presenta como el de esta captura.
  assert.equal(weather.temperatureC, null);
  assert.equal(weather.weatherCode, null);
  assert.ok(weather.inputQuality.current.temperatureC.limitationCodes.includes('cached_current_omitted'));
  assert.equal(weather.today?.date, '2026-10-22');
  assert.equal(weather.forecast[0].minimumTemperatureC, -2);
});

test('caché: vencida, lejana, futura o de otra consulta no se reutiliza', () => {
  const at = (now: string, e = entry()) => reuseCachedWeather([e], nearby.latitude, nearby.longitude, 'c', now);
  const limit = new Date(Date.parse('2026-10-22T13:00:00.000Z') + EVIDENCE_POLICY.weatherMaxAgeMs).toISOString();
  assert.ok(at(limit), 'el límite exacto todavía es vigente');
  assert.equal(at(new Date(Date.parse(limit) + 1).toISOString()), null);
  assert.equal(at('2026-10-22T12:00:00.000Z'), null, 'una descarga posterior al reloj no es evidencia');
  assert.equal(at('2026-10-22T14:00:00.000Z', entry({ adapter: 'open-meteo-forecast-v0' })), null);
  assert.equal(reuseCachedWeather([entry()], -33.47, -70.75, 'c', '2026-10-22T14:00:00.000Z'), null, 'a 1,1 km queda fuera del radio');
  assert.equal(reuseCachedWeather([{ basura: true }, null, 'x'], home.latitude, home.longitude, 'c', '2026-10-22T14:00:00.000Z'), null);
});

test('caché: después de medianoche el día pasado no vuelve a contar como hoy', () => {
  // Descarga a las 22:30 del 22 y medición a las 00:30 del 23, hora de Chile (UTC−3).
  const late = entry({ fetchedAt: '2026-10-23T01:30:00.000Z' });
  const weather = reuseCachedWeather([late], home.latitude, home.longitude, 'c', '2026-10-23T03:30:00.000Z')!;
  assert.equal(weather.today?.date, '2026-10-23');
  assert.equal(weather.today?.minimumTemperatureC, -2);
  assert.deepEqual(weather.forecast.map(d => d.date), ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28']);
  assert.equal(weather.forecast[4].minimumTemperatureC, null, 'lo que la caché no cubre queda como hueco');
});

test('caché: elige el más cercano y, a igual distancia, el más reciente', () => {
  const older = entry({ fetchedAt: '2026-10-22T12:00:00.000Z' });
  const far = entry({ latitude: -33.4530, fetchedAt: '2026-10-22T13:30:00.000Z' });
  const weather = reuseCachedWeather([older, far, entry()], home.latitude, home.longitude, 'c', '2026-10-22T14:00:00.000Z')!;
  assert.equal(weather.fetchedAt, '2026-10-22T13:00:00.000Z');
});

test('caché: guarda las más recientes, reemplaza el mismo punto y descarta vencidas', () => {
  const kept = rememberWeather([entry({ fetchedAt: '2026-10-22T09:00:00.000Z' }), entry({ latitude: -33.40 }), entry()],
    entry({ fetchedAt: '2026-10-22T13:30:00.000Z' }));
  assert.equal(kept.length, 2);
  assert.equal(kept[0].fetchedAt, '2026-10-22T13:30:00.000Z');
  assert.equal(kept[1].latitude, -33.40);
  const many = Array.from({ length: 6 }, (_, i) => entry({ latitude: -33 - i / 10 }));
  assert.equal(rememberWeather(many, entry({ fetchedAt: '2026-10-22T13:10:00.000Z' })).length, WEATHER_CACHE_POLICY.maxEntries);
});

test('cobertura: la reutilización vale para la captura que la pidió y queda declarada', () => {
  const weather = reuseCachedWeather([entry()], nearby.latitude, nearby.longitude, 'captura', '2026-10-22T14:00:00.000Z')!;
  const context = { captureId: 'captura', location: nearby, evaluatedAt: '2026-10-22T14:00:00.000Z' };
  const coverage = assessWeatherEvidence(weather, context);
  assert.notEqual(coverage.status, 'not_evaluated');
  assert.ok(coverage.limitationCodes.includes('weather_reused_offline'));
  // T29: otra captura u otro punto no hereda ese pronóstico.
  assert.ok(assessWeatherEvidence(weather, { ...context, captureId: 'otra' }).limitationCodes.includes('weather_capture_mismatch'));
  assert.ok(assessWeatherEvidence(weather, { ...context, location: home }).limitationCodes.includes('weather_location_mismatch'));
  const tooFar = { ...weather, reuse: { ...weather.reuse!, distanceM: WEATHER_CACHE_POLICY.maxDistanceM + 1 } };
  assert.equal(assessWeatherEvidence(tooFar, context).status, 'not_evaluated');
  // T31: pasada la vigencia, no se usa para programar labores.
  const stale = assessWeatherEvidence(weather, { ...context, evaluatedAt: '2026-10-22T16:30:00.000Z' });
  assert.equal(stale.status, 'not_evaluated');
  assert.ok(stale.limitationCodes.includes('weather_time_stale'));
});

test('plan: el pronóstico reutilizado se usa para la especie y dice que viene sin conexión', () => {
  const now = '2026-10-22T14:00:00.000Z';
  const weather = reuseCachedWeather([entry()], nearby.latitude, nearby.longitude, 'captura', now)!;
  const context = { captureId: 'captura', location: nearby, evaluatedAt: now };
  const evaluation = evaluateReadingForStage(raw, 'cosecha', 'es', { capturedAt: '2026-10-22T13:59:00.000Z', evaluatedAt: now }, 'sp.tomate');
  const advice = buildContextualAdvice('cosecha', evaluation, raw, weather, 'es', context, 'sp.tomate');
  assert.match(advice.weatherNote, /^Sin conexión: pronóstico guardado antes cerca de este punto\./);
  assert.ok(advice.recommendations!.some(r => r.kind === 'weather' && /-2 °C/.test(r.title)), 'la helada de mañana se avisa');
  assert.ok(!advice.recommendations!.some(r => r.title === 'No pudimos revisar el clima para este cultivo'));
  // El historial conserva la procedencia.
  assert.deepEqual(savedReuse({ weather }), { fetchedAt: weather.fetchedAt, distanceM: weather.reuse!.distanceM });
  assert.equal(savedReuse({ weather: { ...weather, reuse: undefined } }), null);
});

test('sin cuenta no se lee ni escribe caché: una descarga fallida devuelve null', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('Network request failed'); };
  try {
    assert.equal(await fetchCurrentWeather(home.latitude, home.longitude, 'c'), null);
  } finally { globalThis.fetch = original; }
});
