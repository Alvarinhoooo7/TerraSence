import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateForStage, evaluateReadingForStage, localizedStageTitle } from '../src/engine/stageEvaluator';
import { buildContextualAdvice, forecastDayLabel } from '../src/engine/contextualAdvice';
import { buildMeasurementPresentation, isMeasurementPresentation, parameterLabel, presentationFromPoint, PARAMETER_KEYS } from '../src/engine/measurementPresentation';
import { localizeProbeError } from '../src/utils/probeErrors';
import { cropName, textureName } from '../src/engine/catalogNames';
import { CROPS_DB, SOIL_TEXTURES } from '../src/engine/agronomyEngine';
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

const SPANISH = /[áéíóúñ¿¡]|(el|la|los|las|del|sin|para|con|datos?|lectura|medición)/i;
test('D10: la presentación en inglés no contiene frases fijas en español', () => {
  for (const stage of ['pre_siembra', 'vegetativo', 'floracion', 'cosecha'] as const) {
    for (const reading of [raw, { ...raw, airTemp: 21, airHumidity: 55, airPressure: 1010 }]) {
      const evaluation = evaluateForStage(reading, stage, 'maiz', 'franco', 'en');
      const advice = buildContextualAdvice(stage, evaluation, reading, null, 'en');
      const p = buildMeasurementPresentation(reading, evaluation, advice, 'en');
      assert.equal(isMeasurementPresentation(p), true);
      assert.doesNotMatch([advice.title, advice.summary, advice.weatherNote, ...advice.actions].join(' '), SPANISH, `consejo ${stage}`);
      for (const m of p.parameters) {
        assert.doesNotMatch(m.label, SPANISH);
        assert.doesNotMatch(p.context, SPANISH);
        assert.doesNotMatch([m.state, m.recommendation, m.control].join(' '), SPANISH, `${stage}/${m.key}`);
      }
    }
  }
  assert.equal(parameterLabel('vwc', 'en'), 'Soil moisture');
  assert.equal(parameterLabel('vwc'), 'Humedad del suelo');
});
test('D10: ocho cultivos y cuatro texturas conservan claves y se muestran en ambos idiomas', () => {
  for (const id of Object.keys(CROPS_DB) as Array<keyof typeof CROPS_DB>) {
    assert.equal(cropName(id, 'es'), CROPS_DB[id].name);
    assert.notEqual(cropName(id, 'en'), CROPS_DB[id].name);
  }
  for (const id of Object.keys(SOIL_TEXTURES) as Array<keyof typeof SOIL_TEXTURES>) {
    assert.equal(textureName(id, 'es'), SOIL_TEXTURES[id].name);
    assert.notEqual(textureName(id, 'en'), SOIL_TEXTURES[id].name);
  }
  const evaluation = evaluateForStage(raw, 'pre_siembra', 'maiz', 'franco', 'en');
  const advice = buildContextualAdvice('pre_siembra', evaluation, raw, null, 'en');
  const presentation = buildMeasurementPresentation(raw, evaluation, advice, 'en');
  assert.equal(presentation.context, 'Based on the measured soil conditions.');
  assert.ok(advice.suggestedCrops.some(name => name.includes('Grain corn')));
  assert.equal(evaluation.crop?.id, 'maiz');
});
test('D10: el español se conserva tal cual y el pronóstico de riesgo también se traduce', () => {
  const es = build('vegetativo');
  assert.equal(es.parameters[0].label, 'Humedad del suelo');
  const evaluation = evaluateForStage(raw, 'vegetativo', 'maiz', 'franco', 'en');
  const weather = { timezone: 'UTC', fetchedAt: '2026-01-01T00:00:00Z', forecast: [
    { date: '2026-01-02', precipitationMm: 12, rainProbabilityPct: 80, minimumTemperatureC: -1, maximumTemperatureC: 36 },
  ] } as unknown as Parameters<typeof buildContextualAdvice>[3];
  const en = buildContextualAdvice('vegetativo', evaluation, raw, weather, 'en');
  assert.match(en.weatherNote, /rain, frost, heat/);
  assert.doesNotMatch([en.weatherNote, ...en.actions].join(' '), /lluvia|helada|calor|labor/i);
  const esAdvice = buildContextualAdvice('vegetativo', evaluation, raw, weather);
  assert.match(esAdvice.weatherNote, /lluvia, helada, calor/);
});
test('D10: lecturas guardadas sin diagnóstico se presentan en el idioma de la app', () => {
  const point = { stage: 'cosecha', title: 'Registro', action: null, diagnosis: null } as unknown as MeasurementPoint;
  assert.match(presentationFromPoint(point).context, /Lectura guardada/);
  const en = presentationFromPoint(point, 'en');
  assert.equal(en.context, 'Saved reading');
  assert.doesNotMatch([en.summary, en.weatherNote, ...en.parameters.flatMap(m => [m.label, m.state, m.recommendation, m.control])].join(' '), SPANISH);
});
test('D10: los errores de sonda y guardado se traducen o se reemplazan por un texto general, nunca en español', () => {
  const fallback = 'Could not read the probe.';
  assert.equal(localizeProbeError('El Bluetooth está apagado. Actívalo para leer la sonda.', 'es', fallback), 'El Bluetooth está apagado. Actívalo para leer la sonda.');
  assert.match(localizeProbeError('El Bluetooth está apagado. Actívalo para leer la sonda.', 'en', fallback), /Bluetooth is off/);
  assert.match(localizeProbeError('La sonda no entregó lectura de suelo. Revisa que…', 'en', fallback), /did not deliver a soil reading/);
  assert.match(localizeProbeError('Paquete BLE incompleto: 3 bytes de 16 esperados.', 'en', fallback), /could not be interpreted/);
  assert.match(localizeProbeError('Inicia sesión para guardar o sincronizar mediciones.', 'en', fallback), /Sign in/);
  assert.equal(localizeProbeError('Un mensaje desconocido del servidor', 'en', fallback), fallback);
  assert.equal(localizeProbeError(undefined, 'en', fallback), fallback);
});
test('D10: un barrido de lecturas extremas no deja mensajes del motor en español al usar inglés', () => {
  for (const vwc of [3, 12, 22, 35, 48, 60]) for (const temp of [2, 9, 14, 20]) for (const ph of [4.5, 5.6, 6.5, 8.2]) for (const ec of [200, 900, 1700, 3500]) {
    const reading = { ...raw, vwc, temp, ph, ec, nitrogen: 150, phosphorus: 90, potassium: 400, lux: 90000, airTemp: 20, airHumidity: 50, airPressure: 1000 };
    for (const stage of ['pre_siembra', 'vegetativo', 'floracion', 'cosecha'] as const) {
      const evaluation = evaluateForStage(reading, stage, 'tomate', 'arcilloso', 'en');
      const p = buildMeasurementPresentation(reading, evaluation, buildContextualAdvice(stage, evaluation, reading, null, 'en'), 'en');
      for (const m of p.parameters) {
        assert.doesNotMatch([m.state, m.recommendation, m.control].join(' '), SPANISH, `${stage} vwc=${vwc} t=${temp} ph=${ph} ec=${ec} ${m.key}`);
      }
    }
  }
});

test('la alerta del motor llega como acción concreta: se identifica por la clave de su métrica', () => {
  // Bajo el umbral de riego del suelo franco: el motor recomienda regar.
  const dry = { ...raw, vwc: 18 };
  const evaluation = evaluateForStage(dry, 'pre_siembra', 'maiz', 'franco');
  assert.equal(evaluation.verdict, 'AMBER');
  assert.ok(evaluation.alerts.every(alert => ['vwc', 'temp', 'ec', 'ph', 'npk'].includes(alert.param)));
  const advice = buildContextualAdvice('pre_siembra', evaluation, dry, null);
  assert.match(advice.actions[0], /Programar riego/);
  const presentation = buildMeasurementPresentation(dry, evaluation, advice);
  assert.match(presentation.parameters.find(m => m.key === 'vwc')!.recommendation, /Programar riego/);
});
test('con lluvia en los dos días siguientes se sugiere esperarla antes de regar', () => {
  const dry = { ...raw, vwc: 18 };
  const evaluation = evaluateForStage(dry, 'pre_siembra', 'maiz', 'franco');
  const weather = { timezone: 'UTC', fetchedAt: '2026-10-04T00:00:00Z', forecast: [
    { date: '2026-10-05', precipitationMm: 1, rainProbabilityPct: 30, minimumTemperatureC: 6, maximumTemperatureC: 18 },
    { date: '2026-10-06', precipitationMm: 12, rainProbabilityPct: 90, minimumTemperatureC: 8, maximumTemperatureC: 15 },
  ] } as unknown as Parameters<typeof buildContextualAdvice>[3];
  assert.ok(buildContextualAdvice('pre_siembra', evaluation, dry, weather).actions.some(a => /12 mm de lluvia para el mar 6 oct/.test(a)));
  assert.ok(buildContextualAdvice('pre_siembra', evaluation, dry, weather, 'en').actions.some(a => /12 mm of rain is forecast for Tue Oct 6/.test(a)));
  // Con humedad suficiente no hay riego que postergar.
  const moist = evaluateForStage(raw, 'pre_siembra', 'maiz', 'franco');
  assert.ok(!buildContextualAdvice('pre_siembra', moist, raw, weather).actions.some(a => /antes de regar/.test(a)));
});
test('fechas del pronóstico legibles e iguales en Node y en el teléfono', () => {
  assert.equal(forecastDayLabel('2026-10-04'), 'dom 4 oct');
  assert.equal(forecastDayLabel('2026-10-04', 'en'), 'Sun Oct 4');
  assert.equal(forecastDayLabel('sin fecha'), 'sin fecha');
});
test('el título de una lectura guardada se muestra en el idioma actual', () => {
  assert.equal(localizedStageTitle('pre_siembra', 'GREEN', 'Apto para sembrar', 'en'), 'Ready to plant');
  assert.equal(localizedStageTitle('pre_siembra', 'GREEN', 'Ready to plant', 'es'), 'Apto para sembrar');
  assert.equal(localizedStageTitle('pre_siembra', 'GREEN', 'Título de otra versión', 'en'), 'Título de otra versión');
});

const withoutProfile = (reading = raw, stage: PhenologicalStage = 'pre_siembra', language: 'es' | 'en' = 'es') => {
  const evaluation = evaluateReadingForStage(reading, stage, language, { capturedAt: '2026-10-11T12:00:00Z', evaluatedAt: '2026-10-11T12:00:00Z' });
  const advice = buildContextualAdvice(stage, evaluation, reading, null, language);
  return { evaluation, advice, presentation: buildMeasurementPresentation(reading, evaluation, advice, language) };
};

test('el flujo sin selección no asigna maíz ni franco y conserva todas las posibilidades de pre-siembra', () => {
  const { evaluation, presentation } = withoutProfile();
  assert.equal(evaluation.crop, null);
  assert.equal(evaluation.texture, null);
  assert.equal(evaluation.metrics.vwc.status, 'INFO');
  assert.doesNotMatch(presentation.context, /maíz|franco/i);
  assert.ok(presentation.suggestedCrops!.some(c => /Tomate/.test(c)));
  assert.ok(presentation.suggestedCrops!.length > 3);
  assert.doesNotMatch(presentation.title, /apto|ideal|garant/i);
  assert.ok(isMeasurementPresentation(presentation));
});

test('un suelo frío para maíz puede ofrecer trigo; pH ácido puede ofrecer arándano sin ordenar encalar', () => {
  const cold = withoutProfile({ ...raw, temp: 6 });
  assert.deepEqual(cold.presentation.suggestedCrops, ['🌾 Trigo / Cereales de Invierno']);
  assert.doesNotMatch(cold.presentation.actions.join(' '), /No sembrar|pudrir|días con sol/);
  const acidic = withoutProfile({ ...raw, ph: 4.5 });
  assert.deepEqual(acidic.presentation.suggestedCrops, ['🫐 Arándano (Berries)']);
  assert.doesNotMatch(acidic.presentation.actions.join(' '), /encalar|encalado|aplicar cal/);
});

test('sugerencias vacías explican los criterios evaluables; CE no excluye cultivos', () => {
  assert.deepEqual(withoutProfile({ ...raw, ec: 5000 }).presentation.suggestedCrops, withoutProfile().presentation.suggestedCrops);
  const noMatches = withoutProfile({ ...raw, temp: -10 });
  assert.deepEqual(noMatches.presentation.suggestedCrops, []);
  assert.equal(noMatches.evaluation.verdict, 'AMBER');
  assert.equal(noMatches.evaluation.metrics.ec.status, 'INFO');
  for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) {
    const { presentation } = withoutProfile(raw, stage);
    assert.deepEqual(presentation.suggestedCrops, []);
    assert.doesNotMatch(presentation.actions.join(' '), /sembrar|germinación|aborto floral/);
  }
});

test('sin textura no indica regar a las 24–48 horas ni autoriza maquinaria', () => {
  const dry = withoutProfile({ ...raw, vwc: 18 });
  assert.equal(dry.evaluation.metrics.vwc.status, 'INFO');
  assert.doesNotMatch(dry.presentation.actions.join(' '), /Programar riego|24.*48/);
  const extreme = withoutProfile({ ...raw, vwc: 2 });
  assert.equal(extreme.evaluation.metrics.vwc.status, 'WARNING');
  const harvest = withoutProfile(raw, 'cosecha');
  assert.doesNotMatch(harvest.presentation.title, /transitable/);
});

test('las sugerencias sobreviven al guardado; los históricos recuperan sólo sugerencias registradas', () => {
  const { presentation } = withoutProfile();
  const point = { stage: 'pre_siembra', verdict: 'GREEN', diagnosis: JSON.parse(JSON.stringify({ presentation })) } as MeasurementPoint;
  assert.deepEqual(presentationFromPoint(point).suggestedCrops, presentation.suggestedCrops);
  const old = { ...presentation, version: 1, context: 'Maíz Grano / Choclo · Franco', suggestedCrops: undefined };
  const historical = presentationFromPoint({ ...point, diagnosis: { presentation: old, advice: { suggestedCrops: ['Tomate guardado'] } } });
  assert.deepEqual(historical.suggestedCrops, ['Tomate guardado']);
  assert.doesNotMatch(historical.context, /Maíz|Franco/);
  assert.equal(presentationFromPoint({ ...point, diagnosis: { presentation: old } }).suggestedCrops, undefined);
  assert.equal(presentationFromPoint({ ...point, diagnosis: { presentation: old, advice: { suggestedCrops: [42] } } }).suggestedCrops, undefined);
  assert.equal(isMeasurementPresentation({ ...presentation, suggestedCrops: [42] }), false);
});

test('la lectura sin perfiles respeta idioma y no usa NPK ni ambiente para elegir cultivos', () => {
  const { presentation } = withoutProfile(raw, 'pre_siembra', 'en');
  assert.doesNotMatch([presentation.context, presentation.title, presentation.summary, ...presentation.actions, ...presentation.suggestedCrops!].join(' '), SPANISH);
  const changed = withoutProfile({ ...raw, nitrogen: 900, phosphorus: 900, potassium: 900, airTemp: 35 });
  assert.deepEqual(changed.presentation.suggestedCrops, withoutProfile().presentation.suggestedCrops);
});
