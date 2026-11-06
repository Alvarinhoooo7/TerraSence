import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import {
  buildMeasurementPresentation, isMeasurementPresentation, presentationFromPoint, presentationSpecies, savedSpecies,
} from '../src/engine/measurementPresentation';
import { NO_SPECIES_ID, SPECIES, SPECIES_CATALOG_VERSION } from '../src/engine/speciesCatalog';
import { SPECIES_RULES_VERSION } from '../src/engine/speciesRules';
import type { SoilMeasurement } from '../src/types/agronomy';
import type { MeasurementPoint, PhenologicalStage } from '../src/types/app';

const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 24, airHumidity: 55, airPressure: 1010 };
const clock = { capturedAt: '2026-10-11T15:30:00.000Z', evaluatedAt: '2026-10-11T15:31:00.000Z' };
const build = (stage: PhenologicalStage, speciesId?: string | null, language: 'es' | 'en' = 'es', reading = raw) => {
  const evaluation = evaluateReadingForStage(reading, stage, language, clock, speciesId);
  return buildMeasurementPresentation(reading, evaluation, buildContextualAdvice(stage, evaluation, reading, null, language), language, undefined, speciesId);
};

test('T45/T46: una especie sin criterios propios no cambia alertas, estados, acciones ni título', () => {
  for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) for (const reading of [raw, { ...raw, ph: 4.6, ec: 2400, temp: 3 }]) {
    const without = build(stage, null, 'es', reading);
    const withSpecies = build(stage, 'sp.no-existe', 'es', reading);
    assert.deepEqual(withSpecies.parameters, without.parameters);
    assert.deepEqual(withSpecies.actions, without.actions);
    assert.equal(withSpecies.title, without.title);
    assert.equal(withSpecies.summary, without.summary);
    assert.equal(withSpecies.evaluationState, without.evaluationState);
  }
});

test('ES6: una especie con criterios propios sólo cambia los parámetros que su criterio documenta (pH y tolerancia a sales)', () => {
  for (const [speciesId, ph] of [['sp.arandano', 4.8], ['sp.arandano', 5.6], ['sp.tomate', 6.2], ['sp.tomate', 5.5], ['sp.lechuga', 7.2]] as const) {
    const without = build('vegetativo', null, 'es', { ...raw, ph });
    const withSpecies = build('vegetativo', speciesId, 'es', { ...raw, ph });
    const byKey = (p: typeof without.parameters) => Object.fromEntries(p.map(x => [x.key, x]));
    const a = byKey(without.parameters), b = byKey(withSpecies.parameters);
    for (const key of ['temp', 'nitrogen', 'phosphorus', 'potassium'] as const) assert.deepEqual(b[key], a[key], key);
    if (speciesId === 'sp.lechuga') {
      assert.match(b.vwc.state, /^Crecimiento vegetativo:/);
      assert.equal(b.vwc.status, a.vwc.status);
    } else {
      assert.deepEqual(b.vwc, a.vwc, 'vwc');
    }
    // La conductividad sólo suma la tolerancia a sales de FAO como referencia: no cambia su estado.
    assert.match(b.ec.state, /^Este cultivo (es|tolera)/);
    assert.equal(b.ec.status, a.ec.status);
    assert.notDeepEqual(b.ph, a.ph);
    assert.ok(b.ph.state.includes('este cultivo'), `${speciesId}: el pH muestra el criterio de la especie`);
    assert.equal(withSpecies.species?.hasStageCriteria, true);
    assert.match(withSpecies.context, /criterios de esta especie para vegetativo/);
  }
  // Fuera del límite documentado, el pH se marca como advertencia; dentro, no.
  const pHStatus = (speciesId: string, ph: number) => build('vegetativo', speciesId, 'es', { ...raw, ph }).parameters.find(p => p.key === 'ph')!.status;
  assert.equal(pHStatus('sp.tomate', 5.5), 'WARNING');
  assert.notEqual(pHStatus('sp.tomate', 6.2), 'WARNING');
});

test('ES4/ES8: la presentación v3 guarda una copia de la especie y declara que usa sus criterios', () => {
  const p = build('floracion', 'sp.trigo');
  assert.equal(p.version, 3);
  assert.deepEqual(p.species, { id: 'sp.trigo', es: 'Trigo', en: 'Wheat', scientific: 'Triticum aestivum y Triticum durum', catalogVersion: SPECIES_CATALOG_VERSION, rulesVersion: SPECIES_RULES_VERSION, hasStageCriteria: true });
  assert.match(p.context, /criterios de esta especie para floración/);
  assert.match(build('cosecha', 'sp.trigo', 'en').context, /this species' harvest criteria/);
  assert.equal(isMeasurementPresentation(p), true);
  // ES8: con el catálogo completo, ninguna especie muestra el aviso de que faltan criterios.
  for (const entry of SPECIES) for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) {
    assert.equal(presentationSpecies(entry.id, stage)?.hasStageCriteria, true, `${entry.id}/${stage}`);
  }
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

test('ES6: una nota de especie dentro del óptimo va como seguimiento; cruzar un límite pide revisión hoy', () => {
  const plan = (ph: number) => {
    const reading = { ...raw, ph };
    const evaluation = evaluateReadingForStage(reading, 'vegetativo', 'es', clock, 'sp.tomate');
    return buildContextualAdvice('vegetativo', evaluation, reading, null, 'es').recommendations ?? [];
  };
  const within = plan(6.2);
  const note = within.find(r => /pH adecuado/.test(r.title));
  assert.equal(note?.kind, 'monitoring');
  assert.equal(note?.when, 'next_reading');
  assert.equal(within.some(r => r.kind === 'evidence'), true, 'la evaluación sigue siendo parcial');
  assert.ok(within.findIndex(r => r.kind === 'evidence') < within.indexOf(note!));
  const below = plan(5.5).find(r => /pH demasiado bajo/.test(r.title));
  assert.equal(below?.kind, 'soil');
  assert.equal(below?.when, 'today');
});
