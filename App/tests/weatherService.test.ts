import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchCurrentWeather } from '../src/services/weatherService';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { evaluateForStage } from '../src/engine/stageEvaluator';
import { decodeTelemetry } from '../src/services/probeService';

test('pronóstico usa cinco fechas posteriores locales, conserva ceros y ausencias', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /forecast_days=6&timezone=auto/);
    return new Response(JSON.stringify({
      timezone: 'America/Santiago',
      current: { time: '2026-09-30T23:45', temperature_2m: 0, wind_speed_10m: 2 },
      daily: {
        time: ['2026-09-30', '2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05'],
        temperature_2m_min: [-3, 0, null, 4, 5],
        temperature_2m_max: [12, 14, 16, 18, 20],
        precipitation_sum: [90, 0, null, 8, 1],
      },
    }));
  };
  try {
    const weather = await fetchCurrentWeather(-33, -70);
    assert.ok(weather);
    assert.deepEqual(weather.forecast.map(day => day.date), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
    assert.equal(weather.forecast[0].minimumTemperatureC, 0);
    assert.equal(weather.forecast[0].precipitationMm, 0);
    assert.equal(weather.forecast[1].maximumTemperatureC, null);
    assert.equal(weather.forecast[2].minimumTemperatureC, null);
    assert.equal(weather.forecast[3].precipitationMm, 8);
    assert.equal(weather.source, 'Open-Meteo');
    assert.match(weather.fetchedAt, /Z$/);
    const raw = decodeTelemetry(new Uint8Array([1, 94, 0, 245, 3, 232, 0, 65, 0, 45, 0, 30, 0, 80, 87, 0]));
    const evaluation = evaluateForStage(raw, 'pre_siembra');
    const advice = buildContextualAdvice('pre_siembra', evaluation, raw, weather);
    assert.match(advice.weatherNote, /2026-10-04 \(lluvia\)/);
    assert.match(advice.weatherNote, /2026-10-01 \(helada\)/);
    assert.doesNotMatch(advice.weatherNote, /2026-09-30/);
    const incomplete = { ...weather, forecast: weather.forecast.map(day => ({ ...day, minimumTemperatureC: null, precipitationMm: null })) };
    assert.match(buildContextualAdvice('pre_siembra', evaluation, raw, incomplete).weatherNote, /incompleto/);
  } finally { globalThis.fetch = original; }
});

test('sin red o respuesta inválida devuelve null', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await fetchCurrentWeather(0, 0), null);
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    assert.equal(await fetchCurrentWeather(0, 0), null);
    globalThis.fetch = async () => new Response('{}');
    assert.equal(await fetchCurrentWeather(0, 0), null);
  } finally { globalThis.fetch = original; }
});
