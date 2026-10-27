import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { buildMeasurementPresentation, isMeasurementPresentation, savedEvaluationState } from '../src/engine/measurementPresentation';
import { assessWeatherEvidence, evidenceFreshness, EVIDENCE_POLICY } from '../src/engine/evaluationCoverage';
import { normalizeWeather } from '../src/services/weatherService';
import { applyWeatherToCapture } from '../src/utils/measureCaptureSession';
import type { SoilMeasurement } from '../src/types/agronomy';
import { WEATHER_UNITS } from './fixtures/weatherUnits';

const now = '2026-10-11T12:00:00Z';
const clock = { capturedAt: now, evaluatedAt: now };
const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80,
  lux: 0, battery: 80, airTemp: 20, airHumidity: 50, airPressure: null };
const evaluate = (reading = raw, context = clock) => evaluateReadingForStage(reading, 'pre_siembra', 'es', context);
const advice = (reading = raw) => buildContextualAdvice('pre_siembra', evaluate(reading), reading, null);

test('E1.3: cobertura y gravedad separadas; ausencia de alertas no significa favorable', () => {
  const result = evaluate();
  assert.equal(result.state, 'insufficient_data');
  assert.equal(result.verdict, 'AMBER');
  assert.equal(result.coverage?.capabilities.ph_comparison.status, 'partial');
  assert.equal(result.coverage?.capabilities.salinity.status, 'not_evaluated');
  assert.equal(evaluate({ ...raw, vwc: 2 }).state, 'attention');
  assert.deepEqual(evaluate(), result);
});

test('T12/T13: CE y nutrientes no cambian coincidencias ni activan dosis o salinidad', () => {
  for (const ec of [0, 5000, 20000, NaN]) {
    const reading = { ...raw, ec, nitrogen: 1900, phosphorus: 1900, potassium: 1900 };
    const result = evaluate(reading);
    assert.equal(result.metrics.ec.status, 'INFO');
    assert.deepEqual(result.alerts, evaluate().alerts);
    assert.deepEqual(advice(reading).suggestedCrops, advice().suggestedCrops);
    assert.deepEqual(advice(reading).actions, advice().actions);
  }
});

test('T05/T06/T14: inválidos no producen alertas; pH parcial y cero real se conservan', () => {
  for (const value of [NaN, Infinity, -Infinity, null, 99]) {
    const reading = { ...raw, ph: value } as SoilMeasurement;
    const result = evaluate(reading);
    assert.equal(result.coverage?.capabilities.ph_comparison.status, 'not_evaluated');
    assert.equal(result.alerts.some(alert => alert.param === 'ph'), false);
    assert.deepEqual(advice(reading).suggestedCrops, []);
    assert.ok(isMeasurementPresentation(buildMeasurementPresentation(reading, result, advice(reading))));
  }
  const reading = { ...raw, temp: 0 };
  assert.equal(buildMeasurementPresentation(reading, evaluate(reading), advice(reading)).parameters[1].value, 0);
  assert.match(evaluate().metrics.ph.confidenceNote!, /parciales/);
});

test('E1.3: frontera temporal, captura futura y antigüedad explícitas', () => {
  assert.equal(evidenceFreshness(now, '2026-10-11T12:30:00Z', EVIDENCE_POLICY.localMaxAgeMs), 'fresh');
  const old = evaluate(raw, { ...clock, evaluatedAt: '2026-10-11T12:30:00.001Z' });
  assert.equal(old.coverage?.freshness, 'stale');
  assert.deepEqual(buildContextualAdvice('pre_siembra', old, raw, null).suggestedCrops, []);
  assert.equal(evaluate(raw, { ...clock, evaluatedAt: '2026-10-11T11:59:59Z' }).coverage?.freshness, 'unknown');
  assert.equal(evaluateReadingForStage(raw, 'pre_siembra').state, 'insufficient_data');
});

const location = { latitude: -33, longitude: -70 };
const context = { captureId: 'capture-a', location, evaluatedAt: now };
function weather() {
  const result = normalizeWeather({ ...WEATHER_UNITS, timezone: 'America/Santiago', utc_offset_seconds: -10800,
    soil_temperature_0cm: -30, current: { time: '2026-10-11T09:00', temperature_2m: 0 },
    daily: { time: ['2026-10-12'], temperature_2m_min: [-2], temperature_2m_max: [18], precipitation_sum: [10] },
  }, now)!;
  return { ...result, request: { captureId: context.captureId, ...location } };
}

test('T29/T31: ubicación, captura y frescura bloquean instrucciones climáticas', () => {
  for (const changed of [{ ...context, location: null }, { ...context, captureId: 'capture-b' },
    { ...context, location: { ...location, latitude: -34 } }, { ...context, evaluatedAt: '2026-10-11T15:00:00.001Z' }]) {
    const result = buildContextualAdvice('pre_siembra', evaluate(), raw, weather(), 'es', changed);
    assert.equal(result.weatherCoverage?.status, 'not_evaluated');
    assert.doesNotMatch(result.actions.join(' '), /previstos|pronostican/);
    assert.match(result.weatherNote, /no evaluado|antiguo/);
  }
  assert.equal(assessWeatherEvidence(weather(), { ...context, evaluatedAt: '2026-10-11T15:00:00Z' }).status, 'partial');
});

test('T30/T32: futuro parcial y suelo local sobreviven al clima modelado', () => {
  const before = structuredClone(raw);
  const result = buildContextualAdvice('pre_siembra', evaluate(), raw, weather(), 'es', context);
  assert.match(result.weatherNote, /helada/);
  assert.match(result.weatherNote, /incompleto/);
  assert.deepEqual(raw, before);
  assert.equal(evaluate().metrics.temp.val, 20);
  assert.equal(evaluate().coverage?.capabilities.soil_temperature.status, 'partial');
});

test('E1.3: instantánea conserva estado neutral, cobertura y traducciones', () => {
  for (const language of ['es', 'en'] as const) {
    const result = evaluateReadingForStage(raw, 'pre_siembra', language, clock);
    const plan = buildContextualAdvice('pre_siembra', result, raw, null, language);
    const presentation = buildMeasurementPresentation(raw, result, plan, language);
    const saved = JSON.parse(JSON.stringify({ presentation }));
    assert.equal(savedEvaluationState(saved), 'insufficient_data');
    assert.deepEqual(saved.presentation.coverage, result.coverage);
    // El resumen dice en palabras simples que la evaluación no es completa.
    assert.match(presentation.summary, language === 'es' ? /no podemos darte un diagnóstico completo/ : /cannot give you a complete diagnosis/);
    assert.match(presentation.parameters.find(p => p.key === 'ph')!.control, language === 'es' ? /parciales/ : /partial/);
  }
  assert.equal(savedEvaluationState(null), undefined);
});

test('E1.3 cierre completo (T04–T06, T10–T14, T29–T32): integración de física local y caché de pronóstico en cobertura', () => {
  const location = { latitude: -33.45, longitude: -70.66, accuracy: 8 };
  const baseForecast = normalizeWeather({
    ...WEATHER_UNITS,
    current: { time: '2026-10-11T11:30', interval: 900, temperature_2m: 19, weather_code: 1, precipitation: 0 },
    daily: {
      time: ['2026-10-11', '2026-10-12'],
      weather_code: [1, 2],
      precipitation_sum: [0, 0.5],
      precipitation_probability_max: [10, 20],
      temperature_2m_max: [23, 24],
      temperature_2m_min: [9, 10],
    },
  }, '2026-10-11T11:30:00Z')!;
  const freshCachedForecast = {
    ...baseForecast,
    request: { captureId: 'cap-orig', latitude: location.latitude, longitude: location.longitude },
    reuse: {
      policyVersion: 'weather-cache-v1' as const,
      captureId: 'cap-t29',
      latitude: location.latitude,
      longitude: location.longitude,
      distanceM: 120,
      reusedAt: now,
    },
  };

  // T29: caché fresca de punto cercano (< 3 h y <= 1 km) se integra con estado partial y weather_reused_offline
  const withFreshCache = applyWeatherToCapture({
    raw,
    stage: 'vegetativo',
    language: 'es',
    capturedAt: now,
    evaluatedAt: now,
    captureId: 'cap-t29',
    location,
    speciesId: 'sp.tomate',
  }, freshCachedForecast);
  assert.equal(withFreshCache.advice.weatherCoverage?.status, 'partial');
  assert.ok(withFreshCache.advice.weatherCoverage?.limitationCodes.includes('weather_reused_offline'));

  // T30/T31: caché vencida (> 3 h) o lejana (> 1 km) se descarta y weather queda null
  const expiredForecast = { ...freshCachedForecast, fetchedAt: '2026-10-11T03:00:00Z' };
  const withExpiredCache = applyWeatherToCapture({
    raw,
    stage: 'vegetativo',
    language: 'es',
    capturedAt: now,
    evaluatedAt: now,
    captureId: 'cap-t30',
    location,
    speciesId: 'sp.tomate',
  }, expiredForecast);
  assert.equal(withExpiredCache.advice.weatherCoverage?.status, 'not_evaluated');
  assert.equal(withExpiredCache.weather, null);

  // T04–T06, T10–T14: capacidades físicas (soil_moisture, soil_temperature, ambient_vpd, salinity, nutrition)
  const pres = buildMeasurementPresentation(raw, withFreshCache.evaluation, withFreshCache.advice, 'es', undefined, 'sp.tomate');
  assert.ok(pres.coverageSummary);
  assert.match(pres.coverageSummary.headline, /suelo, ambiente, pronóstico y umbrales específicos/);
  assert.equal(pres.coverage?.capabilities.soil_moisture.status, 'partial');
  assert.equal(pres.coverage?.capabilities.ambient_vpd.status, 'partial');
  assert.equal(pres.coverage?.capabilities.salinity.status, 'not_evaluated');
  assert.equal(pres.coverage?.capabilities.nutrition.status, 'not_evaluated');
});
