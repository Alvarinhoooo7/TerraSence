import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { buildMeasurementPresentation, isMeasurementPresentation, savedEvaluationState } from '../src/engine/measurementPresentation';
import { assessWeatherEvidence, evidenceFreshness, EVIDENCE_POLICY } from '../src/engine/evaluationCoverage';
import { normalizeWeather } from '../src/services/weatherService';
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
    assert.match(presentation.summary, language === 'es' ? /parcial/ : /Partial/);
    assert.match(presentation.parameters.find(p => p.key === 'ph')!.control, language === 'es' ? /parciales/ : /partial/);
  }
  assert.equal(savedEvaluationState(null), undefined);
});
