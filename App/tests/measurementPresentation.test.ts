import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { buildMeasurementPresentation, isMeasurementPresentation, presentationFromPoint, PARAMETER_KEYS } from '../src/engine/measurementPresentation';
import type { SoilMeasurement } from '../src/types/agronomy';
import type { MeasurementPoint, PhenologicalStage } from '../src/types/app';

const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: null, airHumidity: null, airPressure: null };
const build = (stage: PhenologicalStage, reading = raw) => {
  const evaluation = evaluateForStage(reading, stage, 'maiz', 'franco');
  return buildMeasurementPresentation(reading, evaluation, buildContextualAdvice(stage, evaluation, reading, null));
};
test('Orden estable, ambiente ausente y nutrientes sin validar', () => {
  const p = build('pre_siembra');
  assert.deepEqual(p.parameters.map(m => m.key), PARAMETER_KEYS);
  assert.equal(p.parameters[7].value, null);
  assert.equal(p.parameters[4].status, 'INFO');
  assert.match(p.parameters[4].recommendation, /No usar/);
  assert.equal(isMeasurementPresentation(p), true);
});
test('Cosecha no recomienda sembrar aun con suelo frío', () => {
  const p = build('cosecha', { ...raw, temp: 4 });
  assert.equal(p.parameters[1].status, 'INFO');
  assert.doesNotMatch(p.actions.join(' '), /sembr|germin/i);
});
test('Floración presenta la alerta específica de salinidad aunque la base la tolere', () => {
  const p = build('floracion', { ...raw, ec: 1600 });
  const ec = p.parameters.find(m => m.key === 'ec')!;
  assert.notEqual(ec.status, 'OPTIMAL');
});
test('Validador rechaza datos no finitos y tarjetas duplicadas', () => {
  const p = build('vegetativo');
  assert.equal(isMeasurementPresentation({ ...p, parameters: [{ ...p.parameters[0], value: NaN }, ...p.parameters.slice(1)] }), false);
  assert.equal(isMeasurementPresentation({ ...p, parameters: p.parameters.map(() => p.parameters[0]) }), false);
});
test('Lectura guardada conserva diagnóstico y lectura antigua no se reevalúa', () => {
  const p = build('cosecha');
  const point = { stage: 'cosecha', title: 'Registro', action: null, diagnosis: { presentation: p } } as MeasurementPoint;
  assert.equal(presentationFromPoint(point), p);
  const legacy = presentationFromPoint({ ...point, diagnosis: null });
  assert.ok(legacy.parameters.every(m => m.status === 'INFO'));
  assert.equal(legacy.actions.length, 0);
});
