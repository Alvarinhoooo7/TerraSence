import assert from 'node:assert/strict';
import test from 'node:test';
import { CROPS_DB, SOIL_TEXTURES } from '../src/engine/agronomyEngine';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { buildLocalInputQuality } from '../src/engine/inputQuality';
import { buildMeasurementPresentation } from '../src/engine/measurementPresentation';
import { SPECIES_RULES_VERSION } from '../src/engine/speciesRules';
import { evaluateReadingForStage, GENERAL_RULES, GENERAL_RULES_VERSION } from '../src/engine/stageEvaluator';
import type { SoilMeasurement } from '../src/types/agronomy';
import type { PhenologicalStage } from '../src/types/app';

const STAGES: PhenologicalStage[] = ['pre_siembra', 'vegetativo', 'floracion', 'cosecha'];
const clock = { capturedAt: '2026-10-22T13:00:00.000Z', evaluatedAt: '2026-10-22T13:01:00.000Z' };
const raw: SoilMeasurement = { vwc: 22, temp: 15, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 18, airHumidity: 60, airPressure: 1010 };
// Lecturas en ambos lados de cada límite general.
const READINGS: SoilMeasurement[] = [raw,
  { ...raw, temp: 3.9, ph: 4.1, vwc: 5.9 }, { ...raw, temp: 4, ph: 4.2, vwc: 6 },
  { ...raw, ph: 7.8, vwc: 59.9 }, { ...raw, ph: 7.9, vwc: 60 }, { ...raw, ec: 4000, nitrogen: 1900, phosphorus: 1900, potassium: 1900 }];

const run = (reading: SoilMeasurement, stage: PhenologicalStage, language: 'es' | 'en' = 'es', speciesId: string | null = null) => {
  const evaluation = evaluateReadingForStage(reading, stage, language, clock, speciesId);
  const advice = buildContextualAdvice(stage, evaluation, reading, null, language, undefined, speciesId);
  const presentation = buildMeasurementPresentation(reading, evaluation, advice, language, buildLocalInputQuality(reading, clock.capturedAt), speciesId);
  return { evaluation, advice, presentation };
};
const generalAlerts = (reading: SoilMeasurement, stage: PhenologicalStage) =>
  evaluateReadingForStage(reading, stage, 'es', clock, null).alerts;

test('T01: misma entrada, reloj y versiones dan el mismo resultado', () => {
  for (const reading of READINGS) for (const stage of STAGES) {
    assert.deepEqual(run(reading, stage, 'es', 'sp.tomate'), run(reading, stage, 'es', 'sp.tomate'));
  }
});

test('T02/T03: agregar, quitar o reordenar perfiles del catálogo no cambia una alerta general', () => {
  const before = READINGS.map(reading => STAGES.map(stage => generalAlerts(reading, stage)));
  const crops = { ...CROPS_DB };
  const textures = { ...SOIL_TEXTURES };
  const db = CROPS_DB as Record<string, unknown>;
  const tx = SOIL_TEXTURES as Record<string, unknown>;
  try {
    db.extremo = { ...CROPS_DB.trigo, id: 'extremo', tempMin: -20, phMin: 2, phMax: 12 };
    tx.extrema = { ...SOIL_TEXTURES.arenoso, pmp: 0, sat: 99 };
    delete db.arandano;
    // Mismo contenido en orden inverso.
    for (const key of Object.keys(db).reverse()) { const value = db[key]; delete db[key]; db[key] = value; }
    const after = READINGS.map(reading => STAGES.map(stage => generalAlerts(reading, stage)));
    assert.deepEqual(after, before);
  } finally {
    for (const key of Object.keys(db)) delete db[key];
    Object.assign(db, crops);
    for (const key of Object.keys(tx)) delete tx[key];
    Object.assign(tx, textures);
  }
});

test('reglas generales: cada alerta declara su regla y versión, con fronteras definidas', () => {
  for (const reading of READINGS) for (const stage of STAGES) for (const alert of run(reading, stage, 'es', 'sp.tomate').evaluation.alerts) {
    assert.ok(alert.ruleId, `${stage}: ${alert.title}`);
    if (alert.origin === 'species') {
      assert.match(alert.ruleId!, /^species:sp\.tomate:/);
      assert.equal(alert.ruleVersion, SPECIES_RULES_VERSION);
    } else {
      assert.ok(alert.ruleId! in GENERAL_RULES);
      assert.equal(alert.ruleVersion, GENERAL_RULES_VERSION);
    }
  }
  const ids = (reading: SoilMeasurement, stage: PhenologicalStage) => generalAlerts(reading, stage).map(a => a.ruleId);
  // pH gobierna vegetativo; la humedad, todas las etapas fuera de pre-siembra.
  assert.deepEqual(ids({ ...raw, ph: 4.1 }, 'vegetativo'), ['GEN-PH-01']);
  assert.deepEqual(ids({ ...raw, ph: 4.2 }, 'vegetativo'), []);
  assert.deepEqual(ids({ ...raw, ph: 7.8 }, 'vegetativo'), []);
  assert.deepEqual(ids({ ...raw, ph: 7.9 }, 'vegetativo'), ['GEN-PH-01']);
  assert.deepEqual(ids({ ...raw, vwc: 5.9 }, 'cosecha'), ['GEN-VWC-01']);
  assert.deepEqual(ids({ ...raw, vwc: 6 }, 'cosecha'), []);
  assert.deepEqual(ids({ ...raw, vwc: 59.9 }, 'cosecha'), []);
  assert.deepEqual(ids({ ...raw, vwc: 60 }, 'cosecha'), ['GEN-VWC-01']);
  assert.deepEqual(ids({ ...raw, temp: 3.9 }, 'pre_siembra'), ['GEN-TEMP-01']);
  assert.deepEqual(ids({ ...raw, temp: 4 }, 'pre_siembra'), []);
});

test('T20: en una etapa distinta de pre-siembra sin especie no se asigna especie ni se propone otro cultivo', () => {
  for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) for (const reading of READINGS) {
    const { evaluation, advice, presentation } = run(reading, stage);
    assert.equal(evaluation.crop, null);
    assert.equal(presentation.species, null);
    assert.deepEqual(advice.suggestedCrops, []);
    assert.deepEqual(presentation.suggestedCrops, []);
    const text = JSON.stringify([advice.recommendations, advice.actions, advice.summary]);
    assert.doesNotMatch(text, /cambia(r)? de cultivo|siembra otro|planta otro|switch crops/i);
  }
});

test('T33: humedad ambiental alta no diagnostica infección', () => {
  for (const stage of STAGES) for (const speciesId of [null, 'sp.olivo', 'sp.vid', 'sp.tomate']) {
    const { evaluation, advice, presentation } = run({ ...raw, airHumidity: 100, airTemp: 12 }, stage, 'es', speciesId);
    const text = JSON.stringify([evaluation.alerts, advice, presentation.parameters]);
    assert.doesNotMatch(text, /infecci[oó]n|infectad|fungicida|tiene hongos|está enfermo/i);
  }
});

test('T34: en cosecha la humedad del suelo no autoriza maquinaria ni afirma madurez', () => {
  for (const vwc of [2, 22, 45, 70]) for (const language of ['es', 'en'] as const) {
    const { evaluation, advice, presentation } = run({ ...raw, vwc }, 'cosecha', language);
    const text = JSON.stringify([evaluation.verdictTitle, evaluation.alerts, advice.recommendations, advice.summary, presentation.title, presentation.parameters]);
    assert.doesNotMatch(text, /suelo transitable|puedes (entrar|ingresar)|listo para cosechar|est[aá] maduro|madurez alcanzada|soil is trafficable|you can enter|ready to harvest/i);
  }
});

test('T40: ambos idiomas dan la misma evaluación; sólo cambia el texto', () => {
  for (const reading of READINGS) for (const stage of STAGES) for (const speciesId of [null, 'sp.tomate', 'sp.cerezo']) {
    const es = run(reading, stage, 'es', speciesId);
    const en = run(reading, stage, 'en', speciesId);
    const shape = (r: ReturnType<typeof run>) => ({
      state: r.evaluation.state, verdict: r.evaluation.verdict, drivers: r.evaluation.drivers,
      alerts: r.evaluation.alerts.map(a => [a.type, a.param, a.ruleId, a.ruleVersion, a.origin]),
      plan: r.advice.recommendations!.map(x => [x.kind, x.priority, x.when]),
      parameters: r.presentation.parameters.map(p => [p.key, p.value, p.status, p.derived?.map(d => [d.id, d.value])]),
    });
    assert.deepEqual(shape(en), shape(es), `${stage}/${speciesId}`);
  }
});

test('T44: conductividad y registros NPK no se cuentan como señales independientes', () => {
  for (const stage of STAGES) {
    const salty = run({ ...raw, ec: 4000, nitrogen: 1900, phosphorus: 1900, potassium: 1900 }, stage);
    const plain = run(raw, stage);
    // La conductividad no se clasifica sin método y los nutrientes no son votos: no agregan alertas ni gravedad.
    assert.deepEqual(salty.evaluation.alerts, plain.evaluation.alerts, stage);
    assert.equal(salty.evaluation.state, plain.evaluation.state, stage);
    // Temperatura, humedad y DPV del aire no generan tres avisos de un mismo riesgo.
    const humid = run({ ...raw, airTemp: 35, airHumidity: 5 }, stage);
    assert.equal(humid.evaluation.alerts.filter(a => ['airTemp', 'airHumidity', 'vpd'].includes(a.param)).length, 0, stage);
  }
});

test('plan: lo urgente y lo más próximo primero, a igual momento en el orden en que se armó', () => {
  const order = { now: 0, today: 1, next_days: 2, next_reading: 3 } as const;
  for (const reading of [...READINGS, { ...raw, airTemp: -3 }]) for (const stage of STAGES) {
    const plan = run(reading, stage, 'es', 'sp.tomate').advice.recommendations!;
    const ranks = plan.map(item => (item.priority === 'high' ? 0 : 4) + order[item.when]);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), stage);
  }
  const frozen = run({ ...raw, airTemp: -3 }, 'cosecha', 'es', 'sp.tomate').advice.recommendations!;
  assert.equal(frozen[0].when, 'now');
  assert.equal(frozen[0].priority, 'high');
});
