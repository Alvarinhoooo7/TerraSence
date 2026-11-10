import assert from 'node:assert/strict';
import test from 'node:test';
import { CROPS_DB, SOIL_TEXTURES, PRE_PLANTING_PROFILES, evaluatePrePlantingOptions, suggestPrePlantingCrops } from '../src/engine/agronomyEngine';
import { buildContextualAdvice, computeLocalVpdKpa, maxConsecutiveHighHumidityHours } from '../src/engine/contextualAdvice';
import { normalizeWeather } from '../src/services/weatherService';
import { WEATHER_UNITS } from './fixtures/weatherUnits';
import { buildLocalInputQuality } from '../src/engine/inputQuality';
import { buildMeasurementPresentation } from '../src/engine/measurementPresentation';
import { SPECIES_RULES_VERSION } from '../src/engine/speciesRules';
import { evaluateReadingForStage, GENERAL_RULES, GENERAL_RULES_VERSION, getStageOutputRules, STAGE_OUTPUT_RULES } from '../src/engine/stageEvaluator';
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

test('E4/§9.2: GEN-PH-01 no contradice la especie elegida y las alertas del mismo objetivo se fusionan en el plan', () => {
  const acidicWithTomato = run({ ...raw, ph: 4.0 }, 'vegetativo', 'es', 'sp.tomate');
  // T45 se mantiene en evaluation.alerts, pero ningún texto afirma que no hay cultivo asignado.
  assert.equal(acidicWithTomato.evaluation.alerts.filter(a => a.param === 'ph').length, 2);
  for (const alert of acidicWithTomato.evaluation.alerts) {
    assert.doesNotMatch(alert.title + alert.action, /no tiene un cultivo asignado|no crop is assigned/i);
  }
  // En el plan (recommendations y actions), GEN-PH-01 y species:sp.tomate:ph se fusionan en una sola tarjeta de suelo.
  const soilRecs = acidicWithTomato.advice.recommendations!.filter(r => r.kind === 'soil');
  assert.equal(soilRecs.length, 1);
  assert.match(soilRecs[0].title, /pH demasiado bajo para este cultivo/);
  assert.match(soilRecs[0].detail ?? '', /Regla general: .*4,2 a 7,8/);
  assert.match(soilRecs[0].detail ?? '', /INIA/);
});

test('§9.2: un criterio de frío de la especie no oculta el aviso general de helada de otro día', () => {
  const location = { latitude: -33, longitude: -70 };
  const context = { captureId: 'capture-frio', location, evaluatedAt: clock.evaluatedAt };
  const forecast = (mins: number[]) => {
    const weather = normalizeWeather({ ...WEATHER_UNITS, timezone: 'America/Santiago', utc_offset_seconds: -10800,
      current: { time: '2026-10-11T09:00', temperature_2m: 15 },
      daily: { time: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'], temperature_2m_min: mins,
        temperature_2m_max: [18, 18, 18, 18], precipitation_sum: [0, 0, 0, 0], precipitation_probability_max: [0, 0, 0, 0] },
    }, clock.evaluatedAt)!;
    return { ...weather, request: { captureId: context.captureId, ...location } };
  };
  const weatherPlan = (speciesId: string, mins: number[]) => {
    const evaluation = evaluateReadingForStage(raw, 'vegetativo', 'es', clock, speciesId);
    return buildContextualAdvice('vegetativo', evaluation, raw, forecast(mins), 'es', context, speciesId)
      .recommendations!.filter(r => r.kind === 'weather');
  };
  // El arroz sólo tiene criterio de mínima bajo 9 °C: habla de frío, no de helada, así que la
  // tarjeta general conserva su fecha aunque el criterio se active el mismo día.
  const rice = weatherPlan('sp.arroz', [12, 12, 12, -1]);
  assert.ok(rice.some(r => /Programa las labores seg\u00fan el clima/.test(r.title) && /jue 15 oct/.test(r.body)));
  // Y un criterio que se activa un día templado tampoco cubre la helada de otro día.
  const riceMixed = weatherPlan('sp.arroz', [7, 12, 12, -1]);
  assert.ok(riceMixed.some(r => /Programa las labores seg\u00fan el clima/.test(r.title) && /jue 15 oct/.test(r.body)));
  // El tomate sí tiene umbral de helada: ahí la tarjeta general se fusiona y no se duplica.
  const tomato = weatherPlan('sp.tomate', [12, 12, 12, -1]);
  assert.ok(tomato.some(r => /Helada prevista/.test(r.title)));
  assert.ok(!tomato.some(r => /Programa las labores seg\u00fan el clima/.test(r.title)));
  // La regla general que se fusionó queda declarada en el detalle, nunca se pierde sin rastro.
  assert.ok(tomato.every(r => r.when === 'now' || /Regla clim\u00e1tica general/.test(r.detail ?? '')));
});

test('E5/T16/T17/T18/T42: pre-siembra sugiere cultivos con techo térmico, separa forma de establecimiento y distingue perennes', () => {
  assert.ok(PRE_PLANTING_PROFILES.length >= 25);
  // T16: suelo excesivamente cálido (42 °C) no sugiere cultivos aunque superen tempMin.
  assert.deepEqual(suggestPrePlantingCrops({ ...raw, temp: 42 }, 'es'), []);
  // A 33 °C, lechuga (máx 29,4 °C) y espinaca (máx 23,9 °C) quedan excluidas; maíz (máx 40,6 °C) sí entra.
  const warm = suggestPrePlantingCrops({ ...raw, temp: 33, ph: 6.5 }, 'es');
  assert.ok(warm.some(c => /Maíz/.test(c)));
  assert.ok(!warm.some(c => /Lechuga|Espinaca|Papa/.test(c)));
  // T17: tomate separa semilla directa (mín 10 °C) de trasplante (mín 15 °C).
  const at12 = evaluatePrePlantingOptions({ ...raw, temp: 12, ph: 6.5 }, 'es');
  assert.ok(at12.some(o => o.profileId === 'pre.tomate.semilla' && o.establishment === 'seed'));
  assert.ok(!at12.some(o => o.profileId === 'pre.tomate.trasplante'));
  // T18: apio (sin óptimo ni máximo numérico en S10) queda con has_limitations y nunca adelanta a perfiles completos.
  const at18 = evaluatePrePlantingOptions({ ...raw, temp: 18, ph: 6.5 }, 'es');
  const celery = at18.find(o => o.profileId === 'pre.apio.semilla')!;
  assert.equal(celery.classification, 'has_limitations');
  assert.ok(celery.limitationCodes.includes('thermal_optimum_and_maximum_undocumented'));
  const firstLimitedIndex = at18.findIndex(o => o.classification === 'has_limitations');
  const lastCompleteAnnualIndex = at18.map((o, i) => o.scope === 'short_term_establishment' && o.classification === 'matches_evaluated_criteria' ? i : -1).reduce((a, b) => Math.max(a, b), -1);
  assert.ok(firstLimitedIndex > lastCompleteAnnualIndex);
  // T42: perennes declaran partial_perennial_assessment y van después de los anuales de establecimiento directo.
  const firstPerennialIndex = at18.findIndex(o => o.scope === 'partial_perennial_assessment');
  assert.ok(firstPerennialIndex > lastCompleteAnnualIndex);
});

test('E5/\u00a77.5: toda cifra que la fuente citada no fija se declara y no da ventaja al perfil', () => {
  const options = evaluatePrePlantingOptions({ ...raw, temp: 18, ph: 6.5 }, 'es');
  // El techo de pH es una convenci\u00f3n del motor: la tabla B-1 s\u00f3lo da objetivo y pH de encalado.
  const broccoli = options.find(o => o.profileId === 'pre.brocoli.semilla')!;
  assert.ok(broccoli.limitationCodes.includes('values_not_in_cited_sources'));
  assert.match(broccoli.technicalSummary, /Fijado por el motor, sin respaldo en esas fuentes: techo de pH 7,5/);
  assert.ok(broccoli.reasons.some(r => /Valores fijados por el motor/.test(r)));
  // Restringir no penaliza: el br\u00f3coli sigue siendo coincidencia plena.
  assert.equal(broccoli.classification, 'matches_evaluated_criteria');
  // Inventar un \u00f3ptimo s\u00ed: la papa no tiene fuente t\u00e9rmica y nunca se presenta como coincidencia plena.
  const potato = evaluatePrePlantingOptions({ ...raw, temp: 18, ph: 6.0 }, 'es').find(o => o.profileId === 'pre.papa.tuberculo')!;
  assert.equal(potato.classification, 'has_limitations');
  assert.ok(potato.limitationCodes.includes('values_not_in_cited_sources'));
  // Cada perfil con convenci\u00f3n la declara en los dos idiomas.
  for (const profile of PRE_PLANTING_PROFILES) {
    if (!profile.convention) continue;
    assert.ok(profile.convention.es.length > 0 && profile.convention.en.length > 0, profile.id);
  }
  // Ning\u00fan perfil cita una fuente sin registrar: la vid s\u00f3lo afirma el \u00f3ptimo de pH de su fuente.
  const grape = PRE_PLANTING_PROFILES.find(p => p.id === 'pre.vid.plantacion')!;
  assert.doesNotMatch(grape.evidence[0].originalValue, /7\.8|10 \u00b0C/);
  assert.match(grape.convention!.es, /techo de pH 7,8/);
});

test('E4/§8.3–§8.6: registro auditable de VG01–VG05, FL01–FL05 y CO01–CO05 distingue reglas habilitadas y documentadas', () => {
  assert.deepEqual(
    STAGE_OUTPUT_RULES.map(r => r.id),
    ['VG01', 'VG02', 'VG03', 'VG04', 'VG05', 'FL01', 'FL02', 'FL03', 'FL04', 'FL05', 'CO01', 'CO02', 'CO03', 'CO04', 'CO05'],
  );
  assert.equal(getStageOutputRules('vegetativo').length, 5);
  assert.equal(getStageOutputRules('floracion').length, 5);
  assert.equal(getStageOutputRules('cosecha').length, 5);
  for (const rule of STAGE_OUTPUT_RULES) {
    assert.equal(rule.version, '1.0.0', rule.id);
    assert.ok(rule.inputs.length > 0 && rule.objective.length > 0 && rule.evidencePolicy.length > 0, rule.id);
    assert.ok(rule.prohibitedAssertions.length > 0, rule.id);
  }
  // §8.6: las reglas que exigirían un umbral de patógeno, polinizadores o maquinaria quedan en documented.
  assert.deepEqual(
    STAGE_OUTPUT_RULES.filter(r => r.state === 'documented').map(r => r.id),
    ['VG05', 'FL04', 'CO03'],
  );
  // FL05: en evaluateReadingForStage no corre la regla uniforme del 80 % de CE en floración.
  const floweringHighEc = evaluateReadingForStage({ ...raw, ec: 2200 }, 'floracion', 'es', clock, 'sp.tomate');
  assert.ok(!floweringHighEc.alerts.some(a => /80 %|80%/i.test(a.action)));
});

test('ES9 (pre-siembra v3.0.0): cultivos anuales con fuente térmica directa, ranking por optimalDistance y cruces de humedad, salinidad y clima', () => {
  const cool = evaluatePrePlantingOptions({ ...raw, temp: 15.5, ph: 6.5 }, 'es');
  for (const id of ['pre.raps.semilla']) {
    const opt = cool.find(o => o.profileId === id);
    assert.ok(opt, `Falta ${id} a 15,5 °C`);
    assert.equal(opt.classification, 'matches_evaluated_criteria', id);
    assert.ok(opt.group, `${id} debe informar group`);
  }
  // La avena y la cebada se suman: su referencia térmica mide trigo, no la propia especie.
  // El diente de ajo y los trasplantes siguen apareciendo y ordenándose, pero con la limitación
  // declarada: la tabla de UC ANR que los acompaña es de germinación de semilla, no de trasplante.
  for (const id of ['pre.ajo.bulbo', 'pre.apio.trasplante', 'pre.avena.semilla', 'pre.cebada.semilla']) {
    const opt = cool.find(o => o.profileId === id);
    assert.ok(opt, `Falta ${id} a 15,5 °C`);
    assert.equal(opt.classification, 'has_limitations', id);
    assert.ok(opt.group, `${id} debe informar group`);
  }
  const warm = evaluatePrePlantingOptions({ ...raw, temp: 24, ph: 6.5 }, 'es');
  for (const id of ['pre.soya.semilla', 'pre.arroz.semilla']) {
    const opt = warm.find(o => o.profileId === id);
    assert.ok(opt, `Falta ${id} a 24 °C`);
    assert.equal(opt.classification, 'matches_evaluated_criteria', id);
  }
  for (const id of ['pre.pimiento.trasplante', 'pre.aji.trasplante']) {
    const opt = warm.find(o => o.profileId === id);
    assert.ok(opt, `Falta ${id} a 24 °C`);
    assert.equal(opt.classification, 'has_limitations', id);
  }
  // Dentro de matches_evaluated_criteria, optimalDistance ordena de menor a mayor distancia al centro óptimo.
  const fullMatches = cool.filter(o => o.scope === 'short_term_establishment' && o.classification === 'matches_evaluated_criteria');
  for (let i = 1; i < fullMatches.length; i++) {
    assert.ok(fullMatches[i].optimalDistance >= fullMatches[i - 1].optimalDistance - 1e-6);
  }
  // Cruces con humedad extrema de cama de siembra, CE alta en especie sensible y clima (C04 y C06).
  const location = { latitude: -33, longitude: -70 };
  const weather = normalizeWeather({
    ...WEATHER_UNITS,
    hourly_units: { time: 'iso8601', temperature_2m: '°C', relative_humidity_2m: '%' },
    timezone: 'America/Santiago',
    utc_offset_seconds: -10800,
    current: { time: '2026-10-11T09:00', temperature_2m: 15 },
    daily: {
      time: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'],
      temperature_2m_min: [-1, 8, 8, 8],
      temperature_2m_max: [18, 18, 18, 18],
      precipitation_sum: [20, 0, 0, 0],
      precipitation_probability_max: [80, 0, 0, 0],
    },
  }, clock.evaluatedAt)!;
  const crossed = evaluatePrePlantingOptions({ ...raw, temp: 22, ph: 6.4, vwc: 4.5, ec: 1800 }, 'es', undefined, {
    ...weather,
    request: { captureId: 'cap-pre', ...location },
  });
  const bean = crossed.find(o => o.profileId === 'pre.poroto.semilla')!;
  assert.ok(bean.limitationCodes.includes('seedbed_moisture_limitation'));
  assert.ok(bean.limitationCodes.includes('salinity_sensitive_reference'));
  assert.ok(bean.limitationCodes.includes('upcoming_frost_risk'));
  assert.ok(bean.limitationCodes.includes('upcoming_heavy_rain'));
});

test('ES9 (L8: C01+C02 y C09): demanda evaporativa combinada con suelo seco y persistencia horaria de HR >= 90 % sin diagnosticar infección', () => {
  const vpd = computeLocalVpdKpa(32, 20);
  assert.ok(vpd !== null && vpd >= 3.5);
  const dryAirDrySoil = { ...raw, vwc: 10, airTemp: 32, airHumidity: 20 };
  const evalVeg = evaluateReadingForStage(dryAirDrySoil, 'vegetativo', 'es', clock, 'sp.tomate');
  const adviceVeg = buildContextualAdvice('vegetativo', evalVeg, dryAirDrySoil, null, 'es', undefined, 'sp.tomate');
  assert.ok(adviceVeg.recommendations!.some(r => r.kind === 'irrigation' && r.priority === 'high' && /C01 \+ C02/.test(r.detail ?? '')));

  const location = { latitude: -33, longitude: -70 };
  const context = { captureId: 'cap-rh', location, evaluatedAt: clock.evaluatedAt };
  const hours = Array.from({ length: 16 }, (_, i) => `2026-10-22T${String(i).padStart(2, '0')}:00`);
  const weather = normalizeWeather({
    ...WEATHER_UNITS,
    hourly_units: { time: 'iso8601', temperature_2m: '°C', relative_humidity_2m: '%' },
    timezone: 'America/Santiago',
    utc_offset_seconds: -10800,
    current: { time: '2026-10-22T09:00', temperature_2m: 15 },
    daily: {
      time: ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'],
      temperature_2m_min: [8, 8, 8, 8, 8],
      temperature_2m_max: [18, 18, 18, 18, 18],
      precipitation_sum: [0, 0, 0, 0, 0],
      precipitation_probability_max: [10, 10, 10, 10, 10],
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map(() => 14),
      relative_humidity_2m: hours.map((_, i) => (i < 13 ? 93 : 70)),
      dew_point_2m: hours.map(() => 13),
      precipitation_probability: hours.map(() => 10),
      precipitation: hours.map(() => 0),
    },
  }, clock.evaluatedAt)!;
  const taggedWeather = { ...weather, request: { captureId: context.captureId, ...location } };
  assert.equal(maxConsecutiveHighHumidityHours(taggedWeather, 90), 13);
  const adviceRh = buildContextualAdvice('floracion', evalVeg, raw, taggedWeather, 'es', context, 'sp.tomate');
  const rhRec = adviceRh.recommendations!.find(r => /C09/.test(r.detail ?? ''));
  assert.ok(rhRec, 'Debe emitir recomendación horaria C09 con 13 h >= 90 % HR');
  assert.doesNotMatch(`${rhRec.title} ${rhRec.body} ${rhRec.detail}`, /infecci[oó]n|infectad|fungicida|tiene hongos|est[aá] enfermo/i);
});

