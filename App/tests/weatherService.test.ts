import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchCurrentWeather, measureWeatherResponse, normalizeWeather, WEATHER_RESPONSE_BUDGET, type CurrentWeather } from '../src/services/weatherService';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { decodeTelemetry } from '../src/services/probeService';
import { CHILE_OPEN_METEO_FIXTURE, WEATHER_UNITS } from './fixtures/weatherUnits';

test('pronóstico usa cinco fechas posteriores locales, conserva ceros y ausencias', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /forecast_days=6&timezone=auto/);
    return new Response(JSON.stringify({
      ...WEATHER_UNITS,
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
    const weather = await fetchCurrentWeather(-33, -70, 'capture-weather-test');
    assert.ok(weather);
    const context = { captureId: 'capture-weather-test', location: { latitude: -33, longitude: -70 }, evaluatedAt: weather.fetchedAt };
    assert.deepEqual(weather.request, { captureId: context.captureId, ...context.location });
    assert.deepEqual(weather.forecast.map(day => day.date), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
    assert.equal(weather.forecast[0].minimumTemperatureC, 0);
    assert.equal(weather.forecast[0].precipitationMm, 0);
    assert.equal(weather.forecast[1].maximumTemperatureC, null);
    assert.equal(weather.forecast[2].minimumTemperatureC, null);
    assert.equal(weather.forecast[3].precipitationMm, 8);
    assert.equal(weather.source, 'Open-Meteo');
    assert.equal(weather.precipitationMm, null);
    assert.equal(weather.temperatureC, 0);
    assert.match(weather.fetchedAt, /Z$/);
    const raw = decodeTelemetry(new Uint8Array([1, 94, 0, 245, 3, 232, 0, 65, 0, 45, 0, 30, 0, 80, 87, 0]));
    const evaluation = evaluateReadingForStage(raw, 'pre_siembra');
    const advice = buildContextualAdvice('pre_siembra', evaluation, raw, weather, 'es', context);
    assert.match(advice.weatherNote, /dom 4 oct \(lluvia\)/);
    assert.match(advice.weatherNote, /jue 1 oct \(helada\)/);
    assert.doesNotMatch(advice.weatherNote, /mié 30 sept/);
    const incomplete = { ...weather, forecast: weather.forecast.map(day => ({ ...day, minimumTemperatureC: null, precipitationMm: null })) };
    assert.match(buildContextualAdvice('pre_siembra', evaluation, raw, incomplete, 'es', context).weatherNote, /incompleto/);
  } finally { globalThis.fetch = original; }
});

const fetchedAt = '2026-10-01T01:30:00Z'; // Todavía es septiembre en Santiago.
const partialPayload = () => ({
  ...WEATHER_UNITS,
  timezone: 'America/Santiago',
  daily: {
    time: ['2026-10-01', '2026-09-30', '2026-10-03'],
    temperature_2m_min: [0, 5, 8],
    temperature_2m_max: [18, 19, 21],
    precipitation_sum: [null, 4, 0],
    precipitation_probability_max: [80, 25, 0],
  },
});

test('T30: sin bloque actual conserva futuro y asocia hoy por fecha local, no por índice', () => {
  const payload = partialPayload();
  const before = structuredClone(payload);
  const weather = normalizeWeather(payload, fetchedAt);
  assert.ok(weather);
  assert.equal(weather.temperatureC, null);
  assert.equal(weather.precipitationMm, null);
  assert.equal(weather.windKmh, null);
  assert.equal(weather.dailyPrecipitationMm, 4);
  assert.equal(weather.rainProbabilityPct, 25);
  assert.equal(weather.forecast[0].date, '2026-10-01');
  assert.equal(weather.forecast[0].minimumTemperatureC, 0);
  assert.equal(weather.forecast[1].maximumTemperatureC, null);
  assert.equal(weather.forecast[2].precipitationMm, 0);
  assert.deepEqual(payload, before);
  assert.deepEqual(normalizeWeather(payload, fetchedAt), weather);
});

test('T05/T06/T30: valida cada magnitud sin perder sus ceros ni el futuro', () => {
  for (const invalid of [null, undefined, NaN, Infinity, -Infinity, '15', {}, false]) {
    const weather = normalizeWeather({ ...partialPayload(), current: {
      time: '2026-09-30T22:30', temperature_2m: invalid, precipitation: 0, wind_speed_10m: 0,
    } }, fetchedAt);
    assert.ok(weather);
    assert.equal(weather.temperatureC, null);
    assert.equal(weather.precipitationMm, 0);
    assert.equal(weather.windKmh, 0);
    assert.equal(weather.forecast[0].minimumTemperatureC, 0);
  }
  const invalid = normalizeWeather({ ...partialPayload(), current: {
    time: '2026-09-30T22:30', temperature_2m: 0, precipitation: -1, wind_speed_10m: Infinity,
  } }, fetchedAt);
  assert.equal(invalid?.temperatureC, 0);
  assert.equal(invalid?.precipitationMm, null);
  assert.equal(invalid?.windKmh, null);
});

test('rechaza rangos diarios incoherentes y arreglos malformados sin perder otras magnitudes', () => {
  const weather = normalizeWeather({ ...WEATHER_UNITS, timezone: 'America/Santiago', daily: {
    time: ['2026-10-01', '2026-10-02', '2026-10-03'],
    temperature_2m_min: [22, NaN, 0], temperature_2m_max: [10, Infinity, 0],
    precipitation_sum: [-2, '0', 0], precipitation_probability_max: [101, -1, 0],
  } }, fetchedAt);
  assert.ok(weather);
  assert.deepEqual(weather.forecast[0], { date: '2026-10-01', minimumTemperatureC: null,
    maximumTemperatureC: null, precipitationMm: null, rainProbabilityPct: null, weatherCode: null });
  assert.deepEqual(weather.forecast[2], { date: '2026-10-03', minimumTemperatureC: 0,
    maximumTemperatureC: 0, precipitationMm: 0, rainProbabilityPct: 0, weatherCode: null });
  const malformed = normalizeWeather({ ...WEATHER_UNITS, timezone: 'America/Santiago', daily: {
    time: ['2026-10-01'], precipitation_sum: '123', temperature_2m_max: { 0: 25 },
    precipitation_probability_max: [60],
  } }, fetchedAt);
  assert.equal(malformed?.forecast[0].precipitationMm, null);
  assert.equal(malformed?.forecast[0].maximumTemperatureC, null);
  assert.equal(malformed?.forecast[0].rainProbabilityPct, 60);
});

test('sin fecha utilizable o sin magnitudes devuelve null; no usa la zona del teléfono', () => {
  for (const payload of [null, [], {}, { timezone: 'America/Santiago' },
    { current: { time: '2026-02-30T12:00', temperature_2m: 10 } },
    { ...partialPayload(), timezone: 'zona_inexistente' },
    { ...partialPayload(), timezone: undefined }]) {
    assert.equal(normalizeWeather(payload, fetchedAt), null);
  }
  const invalidTime = normalizeWeather({ ...partialPayload(), current: {
    time: '2026-09-30T99:99', temperature_2m: 10,
  } }, fetchedAt);
  assert.equal(invalidTime?.temperatureC, null);
  assert.equal(invalidTime?.forecast[0].rainProbabilityPct, 80);
});

test('fechas duplicadas se omiten y un cambio de hora mantiene cinco días distintos', () => {
  const weather = normalizeWeather({ ...WEATHER_UNITS, timezone: 'America/Santiago', daily: {
    time: ['2026-09-06', '2026-09-06', '2026-09-07'], precipitation_sum: [0, 8, 2],
  } }, '2026-09-06T03:30:00Z');
  assert.ok(weather);
  assert.deepEqual(weather.forecast.map(day => day.date),
    ['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10']);
  assert.equal(weather.forecast[0].precipitationMm, null);
  assert.equal(weather.forecast[1].precipitationMm, 2);
});

test('T27/T28: probabilidad sin milímetros conserva alerta y cobertura incompleta en ambos idiomas', () => {
  const weather = normalizeWeather(partialPayload(), fetchedAt);
  assert.ok(weather);
  const context = { captureId: 'capture-weather-test', location: { latitude: -33, longitude: -70 }, evaluatedAt: fetchedAt };
  weather.request = { captureId: context.captureId, ...context.location };
  const raw = decodeTelemetry(new Uint8Array([1, 94, 0, 245, 3, 232, 0, 65, 0, 45, 0, 30, 0, 80, 87, 0]));
  const evaluation = evaluateReadingForStage(raw, 'pre_siembra');
  for (const language of ['es', 'en'] as const) {
    const advice = buildContextualAdvice('pre_siembra', evaluation, raw, weather, language, context);
    assert.match(advice.weatherNote, language === 'es' ? /lluvia/ : /rain/);
    assert.match(advice.weatherNote, language === 'es' ? /incompleto/ : /Incomplete/);
    assert.ok(advice.actions.every(action => !/mm|antes de regar|before irrigating/.test(action)));
    for (const forecast of [[], weather.forecast.slice(2, 3)]) {
      const note = buildContextualAdvice('pre_siembra', evaluation, raw, { ...weather, forecast }, language, context).weatherNote;
      assert.match(note, language === 'es' ? /incompleto/ : /Incomplete/);
      assert.doesNotMatch(note, /Sin alertas|No rain/);
    }
  }
  const complete: CurrentWeather = { ...weather, forecast: weather.forecast.map(day => ({ ...day,
    minimumTemperatureC: 10, maximumTemperatureC: 20, precipitationMm: 0, rainProbabilityPct: 0,
  })) };
  assert.match(buildContextualAdvice('pre_siembra', evaluation, raw, complete, 'es', context).weatherNote, /Sin alertas/);
  complete.forecast[0].rainProbabilityPct = null;
  assert.match(buildContextualAdvice('pre_siembra', evaluation, raw, complete, 'es', context).weatherNote, /incompleto/);
});

test('coordenadas inválidas no consultan el proveedor', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests += 1; return new Response('{}'); };
  try {
    for (const [latitude, longitude] of [[NaN, -70], [-33, Infinity], [91, 0], [0, -181]]) {
      assert.equal(await fetchCurrentWeather(latitude, longitude), null);
    }
    assert.equal(requests, 0);
  } finally { globalThis.fetch = original; }
});

test('T30: la consulta entrega pronóstico parcial utilizable al consejo y al histórico', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ...partialPayload(),
    current: { time: '2026-09-30T22:30', temperature_2m: null },
  }));
  try {
    const weather = await fetchCurrentWeather(-33, -70);
    assert.ok(weather);
    assert.equal(weather.temperatureC, null);
    assert.equal(weather.forecast[0].rainProbabilityPct, 80);
    assert.deepEqual(JSON.parse(JSON.stringify(weather)), weather);
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

test('E1.2: unidades ausentes o incompatibles invalidan sólo su variable y conservan el valor informado', () => {
  const payload = { ...partialPayload(), current: { time: '2026-09-30T22:30', temperature_2m: 70, precipitation: 0, wind_speed_10m: 4 },
    current_units: { temperature_2m: '°F', precipitation: 'mm' },
    daily_units: { ...WEATHER_UNITS.daily_units, temperature_2m_min: '°F' },
  };
  const weather = normalizeWeather(payload, fetchedAt);
  assert.ok(weather);
  assert.equal(weather.temperatureC, null);
  assert.equal(weather.windKmh, null);
  assert.equal(weather.precipitationMm, 0);
  assert.equal(weather.forecast[0].minimumTemperatureC, null);
  assert.equal(weather.forecast[0].maximumTemperatureC, 18);
  const temperature = weather.inputQuality.current.temperatureC;
  assert.equal(temperature.availability, 'invalid');
  assert.equal(temperature.reportedValue, 70);
  assert.equal(temperature.reportedUnit, '°F');
  assert.ok(temperature.limitationCodes.includes('unit_mismatch'));
  assert.ok(weather.inputQuality.current.windKmh.limitationCodes.includes('unit_missing'));
  assert.equal(normalizeWeather({ ...partialPayload(), daily_units: undefined }, fetchedAt), null);
});

test('E1.2: distingue ausente, inválido y válido e identifica agregados y períodos del proveedor', () => {
  const weather = normalizeWeather({ ...partialPayload(), current: {
    time: '2026-09-30T22:30', interval: 900, temperature_2m: null, precipitation: 0, wind_speed_10m: NaN,
  } }, fetchedAt);
  assert.ok(weather);
  assert.equal(weather.inputQuality.current.temperatureC.availability, 'missing');
  assert.equal(weather.inputQuality.current.windKmh.availability, 'invalid');
  assert.equal(weather.inputQuality.current.precipitationMm.availability, 'available');
  assert.equal(weather.inputQuality.current.precipitationMm.source, 'weather_model');
  assert.equal(weather.inputQuality.current.precipitationMm.measurementQuality, 'modelled');
  assert.equal(weather.inputQuality.current.precipitationMm.temporalKind, 'sum');
  assert.equal(weather.inputQuality.current.precipitationMm.validFrom, '2026-10-01T01:15:00.000Z');
  assert.equal(weather.inputQuality.current.precipitationMm.validTo, '2026-10-01T01:30:00.000Z');
  const day = weather.inputQuality.daily['2026-10-01'];
  assert.equal(day.minimumTemperatureC.temporalKind, 'minimum');
  assert.equal(day.rainProbabilityPct.temporalKind, 'maximum');
  assert.equal(day.rainProbabilityPct.validFrom, '2026-10-01T03:00:00.000Z');
  assert.equal(day.rainProbabilityPct.validTo, '2026-10-02T03:00:00.000Z');
  assert.equal(day.precipitationMm.availability, 'missing');
  assert.deepEqual(JSON.parse(JSON.stringify(weather)), weather);
  const unknownTime = normalizeWeather({ ...partialPayload(), utc_offset_seconds: undefined }, fetchedAt);
  assert.equal(unknownTime?.inputQuality.daily['2026-10-01'].rainProbabilityPct.validFrom, null);
  assert.ok(unknownTime?.inputQuality.daily['2026-10-01'].rainProbabilityPct.limitationCodes.includes('time_interval_unknown'));
});

test('E3: fixture reproducible para Chile normaliza las 5 series horarias, calcula lo que queda del día sin usar daily y mide presupuesto', () => {
  const weather = normalizeWeather(CHILE_OPEN_METEO_FIXTURE, '2026-10-12T21:30:00Z');
  assert.ok(weather);
  assert.ok(weather.hourly);
  assert.equal(weather.hourly.time.length, 10);
  assert.equal(weather.hourly.relativeHumidityPct?.length, 10);
  assert.equal(weather.hourly.precipitationMm?.length, 10);
  assert.equal(weather.hourly.rainProbabilityPct?.length, 10);
  assert.equal(weather.hourly.windKmh?.length, 10);
  // Lo que queda del día toma desde las 18:00 (hora local de la consulta 18:30) hasta las 23:00 de hoy,
  // descartando las lluvias pasadas de 16:00 (5 mm) y 17:00 (4 mm) que sí suman en daily (12 mm).
  assert.deepEqual(weather.remainingToday, {
    date: '2026-10-12',
    fromHour: '2026-10-12T18:00',
    toHour: '2026-10-12T23:00',
    slotCount: 6,
    minimumTemperatureC: 8.8,
    maximumTemperatureC: 19.6,
    precipitationMm: 2.5,
    rainProbabilityPct: 55,
    maxWindKmh: 15,
  });
  // Sin serie horaria, nunca se deduce remainingToday desde daily.
  const withoutHourly = normalizeWeather(partialPayload(), fetchedAt);
  assert.equal(withoutHourly?.remainingToday, undefined);
  // Medición de respuesta y presupuesto E3.
  const metrics = measureWeatherResponse(CHILE_OPEN_METEO_FIXTURE, 420);
  assert.ok(metrics.payloadBytes > 200 && metrics.payloadBytes <= WEATHER_RESPONSE_BUDGET.maxPayloadBytes);
  assert.equal(metrics.hourlySlots, 10);
  assert.equal(metrics.dailySlots, 6);
  assert.equal(metrics.latencyMs, 420);
  assert.equal(metrics.withinBudget, true);
  assert.equal(measureWeatherResponse(CHILE_OPEN_METEO_FIXTURE, WEATHER_RESPONSE_BUDGET.maxLatencyMs + 1).withinBudget, false);
});
