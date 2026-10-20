import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateSpeciesCriteria, evaluateSpeciesWeather, fahrenheitToCelsius, hasEnabledCriteria, hasWeatherCriteria, meetsThreshold,
  SPECIES_RULES, type SpeciesCriterion, type SpeciesWeatherDay, type SpeciesWeatherInput,
} from '../src/engine/speciesRules';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { normalizeWeather } from '../src/services/weatherService';
import type { SoilMeasurement } from '../src/types/agronomy';
import type { PhenologicalStage } from '../src/types/app';
import { WEATHER_UNITS } from './fixtures/weatherUnits';

const STAGES = ['vegetativo', 'floracion', 'cosecha'] as const;
const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 24, airHumidity: 55, airPressure: 1010 };
const clock = { capturedAt: '2026-10-11T15:30:00.000Z', evaluatedAt: '2026-10-11T15:31:00.000Z' };

const day = (over: Partial<SpeciesWeatherDay> = {}, index = 1): SpeciesWeatherDay => ({
  date: `2026-10-1${index}`, label: index === 0 ? 'hoy' : `día ${index}`, isToday: index === 0,
  minimumTemperatureC: 8, maximumTemperatureC: 22, rainy: false, fog: false, ...over,
});
const forecast = (...days: Partial<SpeciesWeatherDay>[]): SpeciesWeatherInput =>
  ({ days: days.map((d, i) => day(d, i)), rainingNow: false, fogNow: false });
const weatherFor = (speciesId: string, stage: PhenologicalStage, input: SpeciesWeatherInput | null, language: 'es' | 'en' = 'es') =>
  evaluateSpeciesWeather(speciesId, stage, input, language);

/** La cifra aparece tal cual en el texto de la fuente: 6 o 6.0 o 6,0; -2,4 o -2.4. Nunca como parte de otra cifra. */
const citesNumber = (text: string, n: number) => {
  const [int, dec = '0'] = n.toFixed(1).split('.');
  const forms = dec === '0' ? [int, `${int}[.,]0`] : [`${int}[.,]\\s?${dec}`];
  return new RegExp(`(?<![\\d.,])(?:${forms.join('|')})(?!\\d|[.,]\\d)`).test(text);
};

const conditionCriteria = Object.values(SPECIES_RULES).flatMap(profile => profile.criteria
  .flatMap(c => c.kind === 'air_temperature' || c.kind === 'reading' ? [{ id: profile.speciesId, c }] : []));

const ORIGINAL_33_SPECIES = [
  'sp.apio', 'sp.arveja', 'sp.berenjena', 'sp.betarraga', 'sp.brocoli',
  'sp.camote', 'sp.cebolla', 'sp.cebollin', 'sp.coliflor', 'sp.espinaca',
  'sp.lechuga', 'sp.maiz', 'sp.melon', 'sp.pepino', 'sp.perejil',
  'sp.pimiento', 'sp.poroto', 'sp.puerro', 'sp.rabanito', 'sp.repollito-bruselas',
  'sp.repollo', 'sp.sandia', 'sp.zanahoria', 'sp.zapallo', 'sp.zapallo-italiano',
  'sp.esparrago', 'sp.papa', 'sp.tomate', 'sp.arandano', 'sp.frutilla',
  'sp.cerezo', 'sp.kiwi', 'sp.olivo',
];

test('ES6: las 33 especies originales tienen cobertura en las 3 etapas y el conjunto no baja de 69 perfiles', () => {
  const gaps = ORIGINAL_33_SPECIES.flatMap(id => STAGES.filter(stage => !hasEnabledCriteria(id, stage)).map(stage => `${id}/${stage}`));
  assert.deepEqual(gaps, []);
  assert.ok(Object.keys(SPECIES_RULES).length >= 69, 'ES7 suma perfiles; las especies retiradas no tenían perfil');
  for (const profile of Object.values(SPECIES_RULES)) {
    assert.ok(profile.criteria.length > 0, profile.speciesId);
    assert.equal(profile.establishment, profile.horizon === 'annual' ? 'not_specified' : 'established_plantation', profile.speciesId);
  }
});

test('ES6: cada umbral climático o de lectura figura en el valor original de su fuente, con la conversión de °F declarada', () => {
  for (const { id, c } of conditionCriteria) {
    const original = c.evidence.map(e => e.originalValue).join(' | ');
    const { threshold } = c;
    if (threshold.basis === 'frost_definition') {
      assert.equal(threshold.value, 0, `${id}: la definición de helada es 0 °C`);
      assert.equal(threshold.sourceValue, undefined, `${id}: sin cifra de la fuente`);
      continue;
    }
    if (threshold.sourceValue) {
      assert.equal(threshold.value, fahrenheitToCelsius(threshold.sourceValue.value), `${id}: conversión de ${threshold.sourceValue.value} °F`);
      assert.ok(citesNumber(original, threshold.sourceValue.value), `${id}: ${threshold.sourceValue.value} °F no figura en «${original}»`);
    } else {
      assert.ok(citesNumber(original, threshold.value), `${id}: ${threshold.value} no figura en «${original}»`);
    }
  }
});

test('ES6: cada criterio de condición es coherente y tiene sus textos en ambos idiomas', () => {
  for (const profile of Object.values(SPECIES_RULES)) for (const c of profile.criteria as readonly SpeciesCriterion[]) {
    if (c.kind === 'ph') continue;
    const effectEn = 'effectEn' in c ? c.effectEn : '';
    if ('effect' in c) assert.ok(c.effect.trim() && c.effectEn.trim(), `${profile.speciesId}: efecto sin texto`);
    assert.doesNotMatch(effectEn + c.noteEn + c.limitationsEn, /[áéíóúñ¿¡]|\b(la|el|helada|lluvia)\b/i, `${profile.speciesId}: inglés con español`);
    if ('advice' in c) {
      // El consejo lo lee el agricultor: lenguaje simple, sin citas, °F ni términos técnicos.
      assert.ok(c.advice.trim() && c.adviceEn.trim(), `${profile.speciesId}: consejo sin texto`);
      assert.doesNotMatch(c.advice + c.adviceEn, /INIA|FAO|Extension|University|Fuente|Source|°F|documenta|extracto|\bky\b/i, `${profile.speciesId}: consejo técnico`);
      assert.doesNotMatch(c.adviceEn, /[áéíóúñ¿¡]/, `${profile.speciesId}: consejo en inglés con español`);
    }
    if (c.kind === 'air_temperature') {
      // La máxima sólo se compara hacia arriba (calor); la mínima, hacia abajo (helada) o hacia arriba (noche cálida).
      if (c.extreme === 'maximum') assert.match(c.comparison, /above/, `${profile.speciesId}: máxima y comparación`);
      assert.ok(c.threshold.value >= -15 && c.threshold.value <= 45, `${profile.speciesId}: ${c.threshold.value} °C fuera de dominio`);
    }
  }
  assert.equal(fahrenheitToCelsius(32), 0);
  assert.equal(fahrenheitToCelsius(28), -2.2);
  assert.equal(fahrenheitToCelsius(30), -1.1);
  assert.equal(fahrenheitToCelsius(20), -6.7);
});

test('ES6/T15: cada umbral del pronóstico respeta su frontera, a ambos lados y sobre ella', () => {
  for (const profile of Object.values(SPECIES_RULES)) for (const c of profile.criteria) {
    if (c.kind !== 'air_temperature') continue;
    const inclusive = c.comparison === 'at_or_below' || c.comparison === 'at_or_above';
    const below = /below/.test(c.comparison);
    const beyond = Math.round((c.threshold.value + (below ? -0.1 : 0.1)) * 10) / 10;
    const inside = Math.round((c.threshold.value + (below ? 0.1 : -0.1)) * 10) / 10;
    const key = c.extreme === 'minimum' ? 'minimumTemperatureC' : 'maximumTemperatureC';
    const titles = (value: number) => weatherFor(profile.speciesId, c.stages[0], forecast({ [key]: value })).findings.map(f => f.title);
    const has = (value: number) => titles(value).some(t => t.startsWith(c.effect));
    assert.equal(has(beyond), true, `${profile.speciesId}: ${beyond} cruza ${c.threshold.value}`);
    assert.equal(has(c.threshold.value), inclusive, `${profile.speciesId}: en el umbral ${c.threshold.value}`);
    assert.equal(has(inside), false, `${profile.speciesId}: ${inside} no cruza ${c.threshold.value}`);
    assert.equal(meetsThreshold(c.comparison, c.threshold, c.threshold.value), inclusive);
  }
});

test('ES6: hortaliza sensible a helada advierte desde 0 °C; tomate se agrava a −2 °C según INIA', () => {
  assert.deepEqual(weatherFor('sp.pimiento', 'cosecha', forecast({ minimumTemperatureC: 0.5 })).findings, []);
  const frost = weatherFor('sp.pimiento', 'cosecha', forecast({ minimumTemperatureC: 3 }, { minimumTemperatureC: -0.4 }, { minimumTemperatureC: 0 }));
  assert.equal(frost.findings.length, 1);
  assert.equal(frost.findings[0].type, 'warning');
  assert.equal(frost.findings[0].when, 'next_days');
  assert.match(frost.findings[0].title, /^Helada prevista: esta especie no la tolera — mínima de -0,4 °C el día 1$/);
  // El texto dice qué hacer en palabras simples; las fuentes van al detalle técnico.
  assert.match(frost.findings[0].body, /^Una helada puede quemar o matar las plantas\./);
  assert.match(frost.findings[0].body, /Días con riesgo: día 1 y día 2\./);
  assert.doesNotMatch(frost.findings[0].body, /Nebraska|Fuente|°F/);
  assert.match(frost.findings[0].detail, /Nebraska Extension.*South Dakota State/);
  const tomato = weatherFor('sp.tomate', 'vegetativo', forecast({ minimumTemperatureC: -2 }));
  assert.deepEqual(tomato.findings.map(f => f.type), ['danger'], 'sólo el grado más extremo del mismo episodio (T44)');
  assert.match(tomato.findings[0].title, /congela la planta de tomate — mínima de -2 °C hoy/);
  assert.equal(tomato.findings[0].when, 'today');
});

test('ES6: hortaliza tolerante informa la helada leve y advierte bajo lo que documentan todas las fuentes', () => {
  const at = (min: number) => weatherFor('sp.lechuga', 'vegetativo', forecast({ minimumTemperatureC: min })).findings;
  assert.deepEqual(at(0.1), []);
  assert.deepEqual(at(-1).map(f => f.type), ['info']);
  assert.deepEqual(at(-2.2).map(f => f.type), ['info'], '28 °F exacto todavía se tolera');
  assert.deepEqual(at(-2.3).map(f => f.type), ['warning']);
  assert.match(at(-2.3)[0].title, /más fuerte de lo que este cultivo resiste \(-2,2 °C\)/);
  // Puerro: la fuente documenta protección bajo 20 °F.
  const leek = (min: number) => weatherFor('sp.puerro', 'cosecha', forecast({ minimumTemperatureC: min })).findings.map(f => f.type);
  assert.deepEqual(leek(-6.7), ['info']);
  assert.deepEqual(leek(-6.8), ['warning']);
});

test('ES6: cerezo distingue grados de helada en flor, calor en polinización y lluvia en floración y cosecha', () => {
  const bloom = (over: Partial<SpeciesWeatherDay>) => weatherFor('sp.cerezo', 'floracion', forecast(over)).findings;
  assert.deepEqual(bloom({ minimumTemperatureC: -1 }), []);
  assert.match(bloom({ minimumTemperatureC: -1.1 })[0].title, /flores y frutos recién cuajados/);
  assert.match(bloom({ minimumTemperatureC: -3 })[0].title, /al menos el 10 %/);
  assert.equal(bloom({ minimumTemperatureC: -4 })[0].type, 'danger');
  assert.match(bloom({ maximumTemperatureC: 31 })[0].title, /polinización/);
  assert.deepEqual(bloom({ maximumTemperatureC: 30 }), []);
  assert.match(bloom({ rainy: true })[0].title, /Lluvia en floración/);
  // Helada y calor el mismo período son episodios distintos: se informan ambos.
  assert.equal(bloom({ minimumTemperatureC: -2, maximumTemperatureC: 32 }).length, 2);
  const harvest = weatherFor('sp.cerezo', 'cosecha', forecast({}, { rainy: true }));
  assert.match(harvest.findings[0].title, /partidura de la cereza — día 1$/);
  assert.match(harvest.findings[0].detail, /1 mm o más/);
  assert.match(harvest.findings[0].body, /considera cosechar antes/);
  assert.match(weatherFor('sp.cerezo', 'vegetativo', forecast({ maximumTemperatureC: 37 })).findings[0].title, /limita el crecimiento/);
});

test('ES6: kiwi sigue la tabla de helada del Comité del Kiwi por etapa y el calor de verano sólo informa', () => {
  const at = (stage: PhenologicalStage, over: Partial<SpeciesWeatherDay>) => weatherFor('sp.kiwi', stage, forecast(over)).findings;
  // Flor abierta −0,5 °C; brotes tiernos −1,0 °C; fruto en maduración −2,0 °C.
  assert.deepEqual(at('floracion', { minimumTemperatureC: -0.4 }), []);
  assert.match(at('floracion', { minimumTemperatureC: -0.5 })[0].title, /daña la flor del kiwi/);
  assert.deepEqual(at('vegetativo', { minimumTemperatureC: -0.9 }), []);
  assert.equal(at('vegetativo', { minimumTemperatureC: -1 })[0].type, 'warning');
  assert.deepEqual(at('cosecha', { minimumTemperatureC: -1.9 }), []);
  assert.match(at('cosecha', { minimumTemperatureC: -2 })[0].title, /maduración/);
  // Sin fuente de lluvia en cosecha: la lluvia no genera aviso.
  assert.deepEqual(at('cosecha', { rainy: true }), []);
  const heat = at('vegetativo', { maximumTemperatureC: 32 });
  assert.deepEqual(heat.map(f => f.type), ['info'], 'el pronóstico no compara viento ni humedad');
  assert.match(heat[0].detail, /Comité del Kiwi/);
  // pH: rango deseado sin límites documentados, nunca advierte.
  const ph = (value: number) => evaluateSpeciesCriteria('sp.kiwi', 'vegetativo', { ...raw, ph: value }, 'es').filter(a => a.param === 'ph')[0];
  assert.equal(ph(6.5).title, 'pH adecuado para este cultivo');
  assert.equal(ph(5.2).type, 'info');
  assert.match(ph(5.2).detail!, /Wisconsin/);
});

test('ES6: lluvia en curso cuenta para el arándano en cosecha y niebla en floración para el olivo', () => {
  const raining = weatherFor('sp.arandano', 'cosecha', { ...forecast({}), rainingNow: true });
  assert.equal(raining.findings[0].when, 'now');
  assert.match(raining.findings[0].title, /no cosechar fruta mojada — ahora$/);
  assert.match(raining.findings[0].body, /Espera a que las plantas se sequen/);
  assert.match(raining.findings[0].detail, /University of Georgia/);
  const fog = weatherFor('sp.olivo', 'floracion', forecast({}, { fog: true }));
  assert.match(fog.findings[0].title, /caída de flores/);
  assert.deepEqual(weatherFor('sp.olivo', 'floracion', forecast({})).findings, []);
});

test('ES6/T05: sin pronóstico, o sin el dato que el criterio necesita, el criterio queda sin evaluar y nunca favorable', () => {
  assert.deepEqual(weatherFor('sp.tomate', 'cosecha', null), { applicable: true, evaluated: false, findings: [] });
  const noMinimum = weatherFor('sp.tomate', 'cosecha', forecast({ minimumTemperatureC: null, rainy: null }, { minimumTemperatureC: null, rainy: null }));
  assert.equal(noMinimum.evaluated, false);
  // Con datos de lluvia disponibles, el criterio propio de rajadura por lluvia sí se evalúa.
  assert.equal(weatherFor('sp.tomate', 'cosecha', forecast({ minimumTemperatureC: null, rainy: false })).evaluated, true);
  const noRain = weatherFor('sp.cerezo', 'cosecha', forecast({ rainy: null }));
  assert.equal(noRain.evaluated, false);
  // Una especie sin criterios del pronóstico en la etapa no los informa como pendientes.
  assert.deepEqual(weatherFor('sp.arandano', 'vegetativo', null), { applicable: false, evaluated: false, findings: [] });
  assert.deepEqual(weatherFor('sp.grosella', 'vegetativo', null), { applicable: false, evaluated: false, findings: [] });
  // ES7: el manzano ya tiene helada sobre la fruta en cosecha.
  assert.equal(hasWeatherCriteria('sp.manzano', 'cosecha'), true);
  assert.equal(hasWeatherCriteria('sp.arandano', 'vegetativo'), false);
  assert.equal(hasWeatherCriteria('sp.tomate', 'cosecha'), true);
});

test('ES6: los criterios de lectura comparan la temperatura del suelo y la humedad del aire medidas', () => {
  const strawberry = (temp: number) => evaluateSpeciesCriteria('sp.frutilla', 'vegetativo', { ...raw, temp }, 'es').filter(a => a.param === 'temp');
  assert.equal(strawberry(12)[0]?.type, 'info');
  assert.match(strawberry(12)[0].action, /Medido: 12 °C/);
  assert.deepEqual(strawberry(12.1), []);
  assert.deepEqual(evaluateSpeciesCriteria('sp.frutilla', 'vegetativo', { ...raw, temp: 8 }, 'es', key => key !== 'temp').filter(a => a.param === 'temp'), []);
  const olive = (airHumidity: number | null) => evaluateSpeciesCriteria('sp.olivo', 'floracion', { ...raw, airHumidity }, 'es').filter(a => a.param === 'airHumidity');
  assert.equal(olive(49.5)[0]?.type, 'info');
  assert.deepEqual(olive(50), []);
  assert.deepEqual(olive(null), []);
  // La alerta de la especie llega al resultado aunque la temperatura no gobierne vegetativo.
  const evaluation = evaluateReadingForStage({ ...raw, temp: 9 }, 'vegetativo', 'es', clock, 'sp.frutilla');
  assert.ok(evaluation.alerts.some(a => a.origin === 'species' && a.param === 'temp'));
  assert.equal(evaluation.state, evaluateReadingForStage({ ...raw, temp: 9 }, 'vegetativo', 'es', clock, null).state, 'una nota informativa no cambia el estado');
});

// --- Integración con el plan de recomendaciones ---------------------------------------------

const now = '2026-10-12T16:30:00Z';
const context = { captureId: 'captura', location: { latitude: -33.46, longitude: -70.75 }, evaluatedAt: now };
const units = {
  ...WEATHER_UNITS,
  current_units: { ...WEATHER_UNITS.current_units, weather_code: 'wmo code' },
  daily_units: { ...WEATHER_UNITS.daily_units, weather_code: 'wmo code' },
};
/** Pronóstico con helada el miércoles y calor el viernes, con la forma de Open-Meteo. */
function frostyWeather() {
  const result = normalizeWeather({ ...units, timezone: 'America/Santiago',
    current: { time: '2026-10-12T13:30', interval: 900, temperature_2m: 12, wind_speed_10m: 5, precipitation: 0, weather_code: 1 },
    daily: {
      time: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
      temperature_2m_max: [16, 15, 14, 24, 33, 22], temperature_2m_min: [4, 1, -1.5, 3, 9, 8],
      precipitation_probability_max: [0, 5, 0, 0, 10, 20], precipitation_sum: [0, 0, 0, 0, 0, 0],
      weather_code: [1, 2, 0, 1, 1, 3],
    },
  }, now)!;
  return { ...result, request: { captureId: context.captureId, ...context.location } };
}

test('ES6: el plan agrega los criterios climáticos de la especie y no cambia nada sin especie', () => {
  const evaluation = evaluateReadingForStage(raw, 'floracion', 'es', { capturedAt: now, evaluatedAt: now }, 'sp.frutilla');
  const general = evaluateReadingForStage(raw, 'floracion', 'es', { capturedAt: now, evaluatedAt: now }, null);
  const withSpecies = buildContextualAdvice('floracion', evaluation, raw, frostyWeather(), 'es', context, 'sp.frutilla');
  const titles = withSpecies.recommendations!.map(r => r.title);
  assert.ok(titles.some(t => /daña las flores abiertas de frutilla — mínima de -1,5 °C el mié 14 oct/.test(t)), titles.join(' | '));
  assert.ok(titles.some(t => /aborto floral — máxima de 33 °C el vie 16 oct/.test(t)), titles.join(' | '));
  // Cada hallazgo de la especie lleva su respaldo técnico aparte.
  assert.ok(withSpecies.recommendations!.filter(r => /frutilla|aborto/.test(r.title)).every(r => /Fuente:/.test(r.detail ?? '')));
  assert.ok(withSpecies.recommendations!.filter(r => r.kind === 'weather' && /frutilla|aborto/.test(r.title)).every(r => r.when === 'next_days'));
  // Sin especie, ninguna recomendación de especie aparece (T45).
  const without = buildContextualAdvice('floracion', general, raw, frostyWeather(), 'es', context, null);
  assert.ok(!without.recommendations!.some(r => /frutilla|aborto/.test(r.title)));
  assert.equal(without.weatherNote, withSpecies.weatherNote);
  // En inglés, el mismo hallazgo sin español.
  const en = buildContextualAdvice('floracion', evaluateReadingForStage(raw, 'floracion', 'en', { capturedAt: now, evaluatedAt: now }, 'sp.frutilla'),
    raw, frostyWeather(), 'en', context, 'sp.frutilla');
  const frostEn = en.recommendations!.find(r => /strawberry blossoms/.test(r.title))!;
  assert.match(frostEn.title, /low of -1\.5 °C on Wed Oct 14/);
  assert.doesNotMatch(frostEn.title + frostEn.body + frostEn.detail, /mínima|Fuente|helada/);
});

test('ES6: si el pronóstico no cumple ningún criterio de la especie, el plan lo dice en vez de callar', () => {
  // Cerezo en cosecha sólo tiene el criterio de lluvia, y este pronóstico es seco.
  const evaluation = evaluateReadingForStage(raw, 'cosecha', 'es', { capturedAt: now, evaluatedAt: now }, 'sp.cerezo');
  const advice = buildContextualAdvice('cosecha', evaluation, raw, frostyWeather(), 'es', context, 'sp.cerezo');
  const note = advice.recommendations!.find(r => r.title === 'Clima sin riesgos para este cultivo');
  assert.ok(note);
  assert.equal(note!.kind, 'monitoring');
  assert.ok(!advice.recommendations!.some(r => /partidura/.test(r.title)));
  // Con un hallazgo, la nota no aparece.
  const frost = buildContextualAdvice('cosecha', evaluateReadingForStage(raw, 'cosecha', 'es', { capturedAt: now, evaluatedAt: now }, 'sp.olivo'),
    raw, frostyWeather(), 'es', context, 'sp.olivo');
  assert.ok(frost.recommendations!.some(r => /aceituna/.test(r.title)));
  assert.ok(!frost.recommendations!.some(r => r.title === 'Clima sin riesgos para este cultivo'));
});

test('ES6: sin pronóstico vigente el plan dice que los criterios climáticos de la especie no se evaluaron', () => {
  const evaluation = evaluateReadingForStage(raw, 'cosecha', 'es', { capturedAt: now, evaluatedAt: now }, 'sp.cerezo');
  const advice = buildContextualAdvice('cosecha', evaluation, raw, null, 'es', context, 'sp.cerezo');
  assert.ok(advice.recommendations!.some(r => r.title === 'No pudimos revisar el clima para este cultivo'));
  // Un pronóstico de otra captura no se atribuye a este campo (T29): tampoco evalúa la especie.
  const other = buildContextualAdvice('cosecha', evaluation, raw, frostyWeather(), 'es', { ...context, captureId: 'otra' }, 'sp.cerezo');
  assert.ok(other.recommendations!.some(r => r.title === 'No pudimos revisar el clima para este cultivo'));
  // Una especie sin criterios del pronóstico en la etapa (arándano en vegetativo) no agrega el aviso.
  const olive = buildContextualAdvice('vegetativo', evaluateReadingForStage(raw, 'vegetativo', 'es', { capturedAt: now, evaluatedAt: now }, 'sp.arandano'),
    raw, null, 'es', context, 'sp.arandano');
  assert.ok(!olive.recommendations!.some(r => r.title === 'No pudimos revisar el clima para este cultivo'));
});

test('ES6: perfiles de frutales ola 2 (vid, manzano, palto, limonero) evalúan sus criterios climáticos propios', () => {
  // Vid: helada tras brotación en vegetativo (-1.2 °C), calor en floración (>35 °C), lluvia en cosecha
  const vineFrost = weatherFor('sp.vid', 'vegetativo', forecast({ minimumTemperatureC: -1.5 }));
  assert.equal(vineFrost.applicable, true);
  assert.equal(vineFrost.evaluated, true);
  assert.match(vineFrost.findings[0]?.title ?? '', /Helada tras la brotación/);

  const vineHeat = weatherFor('sp.vid', 'floracion', forecast({ maximumTemperatureC: 36 }));
  assert.equal(vineHeat.applicable, true);
  assert.equal(vineHeat.evaluated, true);
  assert.match(vineHeat.findings[0]?.title ?? '', /Calor sobre 35 °C en floración/);

  const vineRain = weatherFor('sp.vid', 'cosecha', forecast({ rainy: true }));
  assert.equal(vineRain.applicable, true);
  assert.equal(vineRain.evaluated, true);
  assert.match(vineRain.findings[0]?.title ?? '', /Lluvia en cosecha.*botritis/);

  // Palto: helada a -1.7 °C en vegetativo y floración
  const avocadoFrost = weatherFor('sp.palto', 'vegetativo', forecast({ minimumTemperatureC: -2.0 }));
  assert.equal(avocadoFrost.applicable, true);
  assert.equal(avocadoFrost.evaluated, true);
  assert.match(avocadoFrost.findings[0]?.title ?? '', /Helada bajo −1,7 °C/);

  // Manzano: helada a -2.2 °C en floración
  const appleFrost = weatherFor('sp.manzano', 'floracion', forecast({ minimumTemperatureC: -2.5 }));
  assert.equal(appleFrost.applicable, true);
  assert.match(appleFrost.findings[0]?.title ?? '', /Helada en floración/);

  // Limonero: helada a -1.7 °C en floración
  const lemonFrost = weatherFor('sp.limonero', 'floracion', forecast({ minimumTemperatureC: -2.0 }));
  assert.equal(lemonFrost.applicable, true);
  assert.match(lemonFrost.findings[0]?.title ?? '', /Helada en floración.*limonero/);
});
