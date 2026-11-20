import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPrecipitationConsensus, CONSENSUS_MODELS, medianMm, PRECIPITATION_CONSENSUS } from '../src/services/weatherConsensus';
import { normalizeWeather, reuseCachedWeather, WEATHER_ADAPTER_VERSION } from '../src/services/weatherService';
import { displayKindOfDay, isRainingNow, planningToday, rainNowSignal } from '../src/engine/weatherOutlook';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { weatherNow } from '../src/components/measurementResultData';
import type { SoilMeasurement } from '../src/types/agronomy';

// Caso real: medición de prueba en Pudahuel (Santiago) el 19-11-2026 a las 20:38. Open-Meteo
// «best_match» informó llovizna (código 51, 0,1 mm) y 1,7 mm en el día; la estación SCEL no
// registró lluvia en todo el día. Las series horarias son las de cada modelo para esos días.
const fetchedAt = '2026-11-19T23:38:17Z';
const hours = (date: string) => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`);
const time = [...hours('2026-11-19'), ...hours('2026-11-20')];
const zeros = (n: number) => Array.from({ length: n }, () => 0);
const SERIES: Record<string, number[]> = {
  best_match: [...zeros(13), 0.1, 0, 0.1, 0.2, 0, 0, 0.1, 0.9, 0.2, 0, 0, ...zeros(16), 0.1, 0.1, ...zeros(6)],
  ecmwf_ifs025: [...zeros(19), 0.2, 0.2, 0.2, 0, 0, ...zeros(24)],
  gfs_seamless: zeros(48),
  icon_seamless: zeros(48),
  jma_seamless: [...zeros(16), 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, ...zeros(20)],
};
const daily = ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'];
const MAIN = {
  timezone: 'America/Santiago', utc_offset_seconds: -10800,
  current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C', precipitation: 'mm', wind_speed_10m: 'km/h', weather_code: 'wmo code' },
  current: { time: '2026-11-19T20:30', interval: 900, temperature_2m: 18.2, precipitation: 0.1, wind_speed_10m: 9.3, weather_code: 51 },
  daily_units: { time: 'iso8601', temperature_2m_min: '°C', temperature_2m_max: '°C', precipitation_sum: 'mm', precipitation_probability_max: '%', weather_code: 'wmo code' },
  daily: { time: daily, temperature_2m_min: [13, 13.2, 14.5, 11.8, 13.4, 13.2], temperature_2m_max: [24.4, 25.5, 24.4, 26.2, 26.3, 29.5],
    precipitation_sum: [1.7, 0.1, 0, 0, 0, 0], precipitation_probability_max: [41, 6, 16, 0, 8, 4], weather_code: [53, 51, 3, 2, 2, 0] },
  hourly_units: { time: 'iso8601', temperature_2m: '°C', relative_humidity_2m: '%', precipitation: 'mm', precipitation_probability: '%', wind_speed_10m: 'km/h' },
  hourly: { time, temperature_2m: time.map(() => 17), relative_humidity_2m: time.map(() => 50), precipitation: SERIES.best_match,
    precipitation_probability: time.map((_, i) => i >= 20 && i <= 23 ? 31 : 5), wind_speed_10m: time.map(() => 9) },
};
const MODELS = {
  hourly_units: { time: 'iso8601', ...Object.fromEntries(CONSENSUS_MODELS.map(m => [`precipitation_${m}`, 'mm'])) },
  hourly: { time, ...Object.fromEntries(CONSENSUS_MODELS.map(m => [`precipitation_${m}`, SERIES[m]])) },
};
const santiago = () => applyPrecipitationConsensus(normalizeWeather(MAIN, fetchedAt)!, MODELS);

test('mediana: un modelo que se desvía no la mueve y con menos de tres modelos no hay mediana', () => {
  assert.equal(medianMm([1.7, 0.6, 0, 0, 0.8]), 0.6);
  assert.equal(medianMm([0.2, 0.4, null, 0, 0]), 0.1);
  assert.equal(medianMm([5, null, null]), null);
});

test('caso Pudahuel: la llovizna de trazas no se toma como lluvia ahora', () => {
  const weather = santiago();
  const now = weather.precipitationConsensus!.now!;
  assert.equal(now.slot, '2026-11-19T21:00');
  assert.equal(now.total, 5);
  assert.equal(now.wet, 2); // best_match y ECMWF con 0,2 mm; GFS, ICON y JMA por debajo
  assert.equal(rainNowSignal(weather), 'uncertain');
  assert.equal(isRainingNow(weather), false);
});

test('caso Pudahuel: la lluvia del día es la mediana entre modelos y conserva lo informado', () => {
  const weather = santiago();
  assert.equal(weather.today?.precipitationMm, 0.6);
  assert.equal(weather.dailyPrecipitationMm, 0.6);
  const evidence = weather.inputQuality.daily['2026-11-19'].precipitationMm;
  assert.equal(evidence.value, 0.6);
  assert.equal(evidence.reportedValue, 1.7);
  assert.equal(evidence.methodId, PRECIPITATION_CONSENSUS.version);
  assert.equal(weather.forecast[0].precipitationMm, 0);
  assert.equal(displayKindOfDay(weather.forecast[0]), 'cloudy');
  // Para planificar, hoy es lo que queda: 21:00 a medianoche.
  const today = planningToday(weather)!;
  assert.equal(today.precipitationMm, 0.2);
  assert.equal(today.rainProbabilityPct, 31);
});

test('caso Pudahuel: el plan no dice «está lloviendo» y avisa el desacuerdo con prioridad normal', () => {
  const clock = { capturedAt: fetchedAt, evaluatedAt: fetchedAt };
  const raw: SoilMeasurement = { vwc: 27, temp: 18, ph: 6.8, ec: 600, nitrogen: 60, phosphorus: 20, potassium: 150,
    lux: 0, battery: 90, airTemp: 19, airHumidity: 45, airPressure: 1016 };
  const location = { latitude: -33.4642466, longitude: -70.7494199 };
  const weather = { ...santiago(), request: { captureId: 'prueba', ...location } };
  const evaluation = evaluateReadingForStage(raw, 'vegetativo', 'es', clock);
  const advice = buildContextualAdvice('vegetativo', evaluation, raw, weather, 'es', { captureId: 'prueba', location, evaluatedAt: fetchedAt });
  const plan = advice.recommendations!;
  assert.ok(!plan.some(item => item.ruleId === 'plan:rain-now'));
  const note = plan.find(item => item.ruleId === 'plan:rain-now-uncertain');
  assert.equal(note?.priority, 'normal');
  assert.equal(note?.trace?.inputs.modelsWithRainNow, 2);
  assert.ok(!plan.some(item => item.ruleId === 'plan:rain-irrigation'));
});

test('con la mayoría de los modelos mojados sí se avisa la lluvia, como pregunta', () => {
  const wet = { ...MODELS, hourly: { ...MODELS.hourly, ...Object.fromEntries(CONSENSUS_MODELS.map(m => [`precipitation_${m}`, time.map(() => 1.5)])) } };
  const weather = applyPrecipitationConsensus(normalizeWeather(MAIN, fetchedAt)!, wet);
  assert.equal(rainNowSignal(weather), 'likely');
  const clock = { capturedAt: fetchedAt, evaluatedAt: fetchedAt };
  const raw: SoilMeasurement = { vwc: 27, temp: 18, ph: 6.8, ec: 600, nitrogen: 60, phosphorus: 20, potassium: 150,
    lux: 0, battery: 90, airTemp: 19, airHumidity: 45, airPressure: 1016 };
  const location = { latitude: -33.4642466, longitude: -70.7494199 };
  const advice = buildContextualAdvice('vegetativo', evaluateReadingForStage(raw, 'vegetativo', 'es', clock), raw,
    { ...weather, request: { captureId: 'prueba', ...location } }, 'es', { captureId: 'prueba', location, evaluatedAt: fetchedAt });
  const rain = advice.recommendations!.find(item => item.ruleId === 'plan:rain-now');
  assert.equal(rain?.title, '¿Está lloviendo en tu campo?');
  assert.equal(rain?.priority, 'high');
});

test('sin consenso, la llovizna necesita agua medible y la lluvia franca basta con su código', () => {
  assert.equal(isRainingNow({ weatherCode: 51, precipitationMm: 0.1 }), false);
  assert.equal(isRainingNow({ weatherCode: 51, precipitationMm: 0.2 }), true);
  assert.equal(isRainingNow({ weatherCode: 61, precipitationMm: 0 }), true);
  assert.equal(isRainingNow({ weatherCode: null, precipitationMm: 0.1 }), false);
  assert.equal(isRainingNow({ weatherCode: 73, precipitationMm: 2 }), false);
});

test('un modelo con unidades distintas o sin datos no cuenta, y con pocos modelos el día queda como llegó', () => {
  const few = { hourly_units: { time: 'iso8601', precipitation_ecmwf_ifs025: 'mm', precipitation_gfs_seamless: 'inch' },
    hourly: { time, precipitation_ecmwf_ifs025: SERIES.ecmwf_ifs025, precipitation_gfs_seamless: SERIES.gfs_seamless, precipitation_icon_seamless: time.map(() => null) } };
  const weather = applyPrecipitationConsensus(normalizeWeather(MAIN, fetchedAt)!, few);
  assert.deepEqual(weather.precipitationConsensus?.models, ['best_match', 'ecmwf_ifs025']);
  assert.equal(weather.today?.precipitationMm, 1.7);
  assert.equal(weather.precipitationConsensus?.now?.total, 2);
  // Con menos de tres modelos en la hora, decide la regla sin consenso: 0,1 mm de llovizna no basta.
  assert.equal(isRainingNow(weather), false);
  const untouched = normalizeWeather(MAIN, fetchedAt)!;
  assert.equal(applyPrecipitationConsensus(untouched, null), untouched);
});

test('sin red, el pronóstico guardado recupera el consenso de los días pero no el «ahora»', () => {
  const entry = { adapter: WEATHER_ADAPTER_VERSION, latitude: -33.4642, longitude: -70.7494, fetchedAt: '2026-11-19T20:00:00Z', payload: MAIN, modelsPayload: MODELS };
  const reused = reuseCachedWeather([entry], -33.4642, -70.7494, 'otra', '2026-11-19T22:10:00Z')!;
  assert.equal(reused.precipitationConsensus?.now, null);
  assert.equal(reused.today?.precipitationMm, 0.6);
  assert.equal(isRainingNow(reused), false);
});

test('una medición guardada con consenso muestra la misma lluvia actual que el plan', () => {
  const saved = JSON.parse(JSON.stringify(santiago()));
  assert.equal(isRainingNow(weatherNow(saved)!), false);
  assert.equal(weatherNow(saved)!.precipitationConsensus?.now?.wet, 2);
});
