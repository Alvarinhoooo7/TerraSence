import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLocalInputQuality, LOCAL_VARIABLES, localQualityNote } from '../src/engine/inputQuality';
import { decodeTelemetry } from '../src/services/probeService';
import { buildMeasurementPresentation, presentationFromPoint } from '../src/engine/measurementPresentation';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { mapRowToPoint, type SoilMeasurementRow } from '../src/types/app';
import type { LocalVariable, SoilMeasurement } from '../src/types/agronomy';

const capturedAt = '2026-10-11T15:30:00.000Z';
const raw = decodeTelemetry(new Uint8Array([1, 94, 0, 245, 3, 232, 0, 65, 0, 45, 0, 30, 0, 80, 87, 1, 0x26, 0x52, 0xc0, 0x7d]));

test('E1.2: conserva diez observaciones con fuente, unidades y tiempo, sin inventar calibración ni incluir lux', () => {
  const original = structuredClone(raw);
  const quality = buildLocalInputQuality(raw, capturedAt);
  assert.equal(Object.keys(quality.observations).length, 10);
  assert.equal('lux' in quality.observations, false);
  assert.equal('battery' in quality.observations, false);
  assert.deepEqual(quality.availabilityCounts, { available: 10, missing: 0, invalid: 0 });
  for (const key of Object.keys(quality.observations) as LocalVariable[]) {
    const datum = quality.observations[key];
    assert.equal(datum.value, raw[key]);
    assert.equal(datum.validFrom, capturedAt);
    assert.equal(datum.validTo, capturedAt);
    assert.equal(datum.temporalKind, 'instant');
    assert.equal(datum.measurementQuality, 'uncharacterized');
    assert.equal(datum.methodId, null);
    assert.ok(datum.limitationCodes.includes('calibration_unverified'));
  }
  assert.equal(quality.observations.airTemp.source, 'bme280');
  assert.equal(quality.observations.temp.source, 'soil_probe');
  assert.equal(quality.observations.ec.unit, 'µS/cm');
  assert.deepEqual(buildLocalInputQuality(raw, capturedAt), quality);
  assert.deepEqual(JSON.parse(JSON.stringify(quality)), quality);
  assert.deepEqual(raw, original);
});

test('T04/T05/T06: cada ausencia o valor inválido afecta sólo su variable, conserva cero y el suelo', () => {
  for (const key of ['airTemp', 'airHumidity', 'airPressure'] as const) {
    const quality = buildLocalInputQuality({ ...raw, [key]: null }, capturedAt);
    assert.equal(quality.observations[key].availability, 'missing');
    assert.equal(quality.observations.vwc.value, raw.vwc);
    assert.deepEqual(quality.availabilityCounts, { available: 9, missing: 1, invalid: 0 });
  }
  for (const invalid of [NaN, Infinity, -Infinity, '20', false, {}]) {
    const quality = buildLocalInputQuality({ ...raw, airTemp: invalid } as SoilMeasurement, capturedAt);
    assert.equal(quality.observations.airTemp.availability, 'invalid');
    assert.equal(quality.observations.airTemp.value, null);
    assert.deepEqual(JSON.parse(JSON.stringify(quality)), quality);
  }
  const zero = buildLocalInputQuality({ ...raw, airTemp: 0, airHumidity: 0, nitrogen: 0 }, capturedAt);
  assert.equal(zero.observations.airTemp.value, 0);
  assert.equal(zero.observations.airHumidity.value, 0);
  assert.equal(zero.observations.nitrogen.value, 0);
});

test('rangos de integridad rechazan extremos fuera del contrato sin recortarlos', () => {
  for (const key of Object.keys(LOCAL_VARIABLES) as LocalVariable[]) {
    const { min, max } = LOCAL_VARIABLES[key];
    for (const value of [min, max]) {
      assert.equal(buildLocalInputQuality({ ...raw, [key]: value }, capturedAt).observations[key].availability, 'available');
    }
    for (const value of [min - 1, max + 1]) {
      const datum = buildLocalInputQuality({ ...raw, [key]: value }, capturedAt).observations[key];
      assert.equal(datum.value, null);
      assert.equal(datum.reportedValue, value);
      assert.equal(datum.availability, 'invalid');
      assert.ok(datum.limitationCodes.includes('out_of_range'));
    }
  }
});

test('T11/T12: lux y nutrientes no contaminan calidad de otras variables', () => {
  const baseline = buildLocalInputQuality(raw, capturedAt);
  const other = buildLocalInputQuality({ ...raw, lux: 90000, nitrogen: 100, phosphorus: 100, potassium: 100 }, capturedAt);
  for (const key of ['temp', 'ec', 'ph', 'vwc', 'airTemp', 'airHumidity', 'airPressure'] as const) {
    assert.deepEqual(other.observations[key], baseline.observations[key]);
  }
  for (const key of ['nitrogen', 'phosphorus', 'potassium'] as const) {
    assert.equal(other.observations[key].interpretation, 'unvalidated');
    assert.ok(other.observations[key].limitationCodes.includes('chemical_validation_missing'));
  }
  assert.equal(other.observations.ec.interpretation, 'method_required');
  assert.ok(other.observations.ec.limitationCodes.includes('ec_method_unknown'));
  assert.ok(other.observations.ph.limitationCodes.includes('ph_method_unknown'));
});

test('reloj inválido y simulación quedan explícitos sin reemplazarlos por la hora actual', () => {
  for (const captured of ['sin fecha', '2026-10-11T15:30:00', '2026-02-30T15:30:00Z', '2026-10-11T25:00:00Z']) {
    const quality = buildLocalInputQuality(raw, captured, true);
    assert.equal(quality.simulated, true);
    assert.equal(quality.observations.temp.validFrom, null);
    assert.ok(quality.observations.temp.limitationCodes.includes('invalid_capture_time'));
    assert.ok(quality.observations.temp.limitationCodes.includes('simulated_reading'));
  }
});

test('captura, detalle e histórico mantienen las limitaciones originales en ambos idiomas', () => {
  const quality = buildLocalInputQuality(raw, capturedAt);
  for (const language of ['es', 'en'] as const) {
    const evaluation = evaluateReadingForStage(raw, 'pre_siembra', language);
    const advice = buildContextualAdvice('pre_siembra', evaluation, raw, null, language);
    const presentation = buildMeasurementPresentation(raw, evaluation, advice, language, quality);
    assert.match(presentation.parameters.find(p => p.key === 'ec')!.control, language === 'es' ? /Método de conductividad desconocido/ : /Unknown conductivity method/);
    assert.match(presentation.parameters.find(p => p.key === 'ph')!.control, language === 'es' ? /parciales/ : /partial/);
    const diagnosis = { presentation, inputQuality: quality };
    const saved = JSON.parse(JSON.stringify(diagnosis));
    const point = mapRowToPoint({ diagnosis: saved, phenological_stage: 'pre_siembra', verdict: evaluation.verdict,
      verdict_title: evaluation.verdictTitle } as SoilMeasurementRow);
    assert.deepEqual(presentationFromPoint(point, language), presentation);
    assert.deepEqual(saved.inputQuality, quality);
    quality.observations.ec.limitationCodes.push('new_rule_not_in_history');
    assert.equal(saved.inputQuality.observations.ec.limitationCodes.includes('new_rule_not_in_history'), false);
    quality.observations.ec.limitationCodes.pop();
    assert.doesNotMatch(localQualityNote(quality.observations.nitrogen, language), /derivado|derived/);
  }
});
