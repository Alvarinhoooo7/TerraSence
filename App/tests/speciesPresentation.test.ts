import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import {
  buildMeasurementPresentation, isMeasurementPresentation, presentationFromPoint, presentationSpecies, savedSpecies,
} from '../src/engine/measurementPresentation';
import { NO_SPECIES_ID, SPECIES_CATALOG_VERSION } from '../src/engine/speciesCatalog';
import type { SoilMeasurement } from '../src/types/agronomy';
import type { MeasurementPoint, PhenologicalStage } from '../src/types/app';

const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 24, airHumidity: 55, airPressure: 1010 };
const clock = { capturedAt: '2026-10-11T15:30:00.000Z', evaluatedAt: '2026-10-11T15:31:00.000Z' };
const build = (stage: PhenologicalStage, speciesId?: string | null, language: 'es' | 'en' = 'es', reading = raw) => {
  const evaluation = evaluateReadingForStage(reading, stage, language, clock);
  return buildMeasurementPresentation(reading, evaluation, buildContextualAdvice(stage, evaluation, reading, null, language), language, undefined, speciesId);
};

test('T45: la especie no cambia alertas, estados, acciones ni título', () => {
  for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) for (const reading of [raw, { ...raw, ph: 4.6, ec: 2400, temp: 3 }]) {
    const without = build(stage, null, 'es', reading);
    const withSpecies = build(stage, 'sp.tomate', 'es', reading);
    assert.deepEqual(withSpecies.parameters, without.parameters);
    assert.deepEqual(withSpecies.actions, without.actions);
    assert.equal(withSpecies.title, without.title);
    assert.equal(withSpecies.summary, without.summary);
    assert.equal(withSpecies.evaluationState, without.evaluationState);
  }
});

test('ES4: la presentación v3 guarda una copia de la especie y avisa que aún no tiene criterios propios', () => {
  const p = build('floracion', 'sp.palto');
  assert.equal(p.version, 3);
  assert.deepEqual(p.species, { id: 'sp.palto', es: 'Palto', en: 'Avocado', scientific: 'Persea americana', catalogVersion: SPECIES_CATALOG_VERSION, hasStageCriteria: false });
  assert.match(p.context, /Todavía no hay criterios propios de esta especie para floración/);
  assert.match(build('cosecha', 'sp.palto', 'en').context, /no criteria specific to this species for harvest/);
  assert.equal(isMeasurementPresentation(p), true);
});

test('ES4: sin especie, en pre-siembra o con un ID desconocido, no hay especie', () => {
  assert.equal(build('vegetativo', null).species, null);
  assert.equal(build('pre_siembra', 'sp.tomate').species, null);
  assert.equal(presentationSpecies(NO_SPECIES_ID, 'cosecha'), null);
  assert.equal(presentationSpecies('tomate', 'cosecha'), null);
  assert.equal(build('vegetativo', null).context, 'Según las condiciones medidas del suelo.');
});

test('ES4: el validador exige una especie bien formada en v3 y ninguna antes', () => {
  const p = build('vegetativo', 'sp.lechuga');
  assert.equal(isMeasurementPresentation({ ...p, species: { ...p.species, hasStageCriteria: 'no' } }), false);
  assert.equal(isMeasurementPresentation({ ...p, species: undefined }), false);
  assert.equal(isMeasurementPresentation({ ...p, version: 2, species: undefined }), true);
  assert.equal(isMeasurementPresentation({ ...p, version: 2 }), false);
  assert.equal(isMeasurementPresentation({ ...p, version: 2, species: null }), true);
});

test('ES4: el historial lee la especie de la instantánea, no de crop_id', () => {
  const p = JSON.parse(JSON.stringify(build('cosecha', 'sp.trigo'))) as ReturnType<typeof build>;
  const point = { id: '1', latitude: null, longitude: null, verdict: 'GREEN', stage: 'cosecha', title: p.title, action: null, measuredAt: clock.capturedAt,
    ph: 6.5, ecUsCm: 500, vwcPercent: 22, soilTempC: 20, nitrogen: 50, phosphorus: 20, potassium: 80, gpsAccuracyM: null, diagnosis: { presentation: p } } as MeasurementPoint;
  assert.equal(savedSpecies(point.diagnosis)?.id, 'sp.trigo');
  assert.equal(presentationFromPoint(point).species?.es, 'Trigo');
  // Una medición antigua (v2) conserva un perfil del prototipo en crop_id, pero no tiene especie elegida.
  const legacy = { ...build('cosecha', null), version: 2 as const, species: undefined };
  assert.equal(savedSpecies({ presentation: legacy }), null);
  assert.equal(savedSpecies(null), null);
});
