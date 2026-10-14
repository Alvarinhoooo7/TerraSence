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

test('ES6: las 32 especies con perfil tienen criterios en vegetativo, floración y cosecha; la única brecha es documentada', () => {
  const gaps = Object.keys(SPECIES_RULES).flatMap(id => STAGES.filter(stage => !hasEnabledCriteria(id, stage)).map(stage => `${id}/${stage}`));
  // Olivo: la fila de frutos del cuadro de INIA es ambigua y no hay otra fuente verificada para cosecha.
  assert.deepEqual(gaps, ['sp.olivo/cosecha']);
  assert.equal(Object.keys(SPECIES_RULES).length, 32);
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
    assert.ok(c.effect.trim() && c.effectEn.trim(), `${profile.speciesId}: efecto sin texto`);
    assert.doesNotMatch(c.effectEn + c.noteEn + c.limitationsEn, /[áéíóúñ¿¡]|\b(la|el|helada|lluvia)\b/i, `${profile.speciesId}: inglés con español`);
    if (c.kind === 'air_temperature') {
      assert.ok(c.extreme === 'minimum' ? /below/.test(c.comparison) : /above/.test(c.comparison), `${profile.speciesId}: extremo y comparación`);
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
    const beyond = Math.round((c.threshold.value + (c.extreme === 'minimum' ? -0.1 : 0.1)) * 10) / 10;
    const inside = Math.round((c.threshold.value + (c.extreme === 'minimum' ? 0.1 : -0.1)) * 10) / 10;
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
  assert.match(frost.findings[0].title, /^Helada prevista: esta especie no la tolera — mínima -0,4 °C el día 1$/);
  assert.match(frost.findings[0].body, /Días: día 1 y día 2\./);
  assert.match(frost.findings[0].body, /Nebraska Extension.*South Dakota State/);
  const tomato = weatherFor('sp.tomate', 'vegetativo', forecast({ minimumTemperatureC: -2 }));
  assert.deepEqual(tomato.findings.map(f => f.type), ['danger'], 'sólo el grado más extremo del mismo episodio (T44)');
  assert.match(tomato.findings[0].title, /congela la planta de tomate — mínima -2 °C hoy/);
  assert.equal(tomato.findings[0].when, 'today');
});

test('ES6: hortaliza tolerante informa la helada leve y advierte bajo lo que documentan todas las fuentes', () => {
  const at = (min: number) => weatherFor('sp.lechuga', 'vegetativo', forecast({ minimumTemperatureC: min })).findings;
  assert.deepEqual(at(0.1), []);
  assert.deepEqual(at(-1).map(f => f.type), ['info']);
  assert.deepEqual(at(-2.2).map(f => f.type), ['info'], '28 °F exacto todavía se tolera');
  assert.deepEqual(at(-2.3).map(f => f.type), ['warning']);
  assert.match(at(-2.3)[0].title, /bajo lo que tolera esta especie \(-2,2 °C\)/);
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
  assert.match(harvest.findings[0].body, /1 mm o más/);
  assert.match(weatherFor('sp.cerezo', 'vegetativo', forecast({ maximumTemperatureC: 37 })).findings[0].title, /limita el crecimiento/);
});

test('ES6: lluvia en curso cuenta para el arándano en cosecha y niebla en floración para el olivo', () => {
  const raining = weatherFor('sp.arandano', 'cosecha', { ...forecast({}), rainingNow: true });
  assert.equal(raining.findings[0].when, 'now');
  assert.match(raining.findings[0].title, /no cosechar fruta mojada — ahora$/);
  assert.match(raining.findings[0].body, /University of Georgia/);
  const fog = weatherFor('sp.olivo', 'floracion', forecast({}, { fog: true }));
  assert.match(fog.findings[0].title, /caída de flores/);
  assert.deepEqual(weatherFor('sp.olivo', 'floracion', forecast({})).findings, []);
});

test('ES6/T05: sin pronóstico, o sin el dato que el criterio necesita, el criterio queda sin evaluar y nunca favorable', () => {
  assert.deepEqual(weatherFor('sp.tomate', 'cosecha', null), { applicable: true, evaluated: false, findings: [] });
  const noMinimum = weatherFor('sp.tomate', 'cosecha', forecast({ minimumTemperatureC: null }, { minimumTemperatureC: null }));
  assert.equal(noMinimum.evaluated, false);
  const noRain = weatherFor('sp.cerezo', 'cosecha', forecast({ rainy: null }));
  assert.equal(noRain.evaluated, false);
  // Una especie sin criterios del pronóstico en la etapa no los informa como pendientes.
  assert.deepEqual(weatherFor('sp.palto', 'cosecha', null), { applicable: false, evaluated: false, findings: [] });
  assert.equal(hasWeatherCriteria('sp.olivo', 'cosecha'), false);
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
  assert.ok(titles.some(t => /daña las flores abiertas de frutilla — mínima -1,5 °C el mié 14 oct/.test(t)), titles.join(' | '));
  assert.ok(titles.some(t => /aborto floral — máxima 33 °C el vie 16 oct/.test(t)), titles.join(' | '));
  assert.ok(withSpecies.recommendations!.filter(r => r.kind === 'weather' && /frutilla|aborto/.test(r.title)).every(r => r.when === 'next_days'));
  // Sin especie, ninguna recomendación de especie aparece (T45).
  const without = buildContextualAdvice('floracion', general, raw, frostyWeather(), 'es', context, null);
  assert.ok(!without.recommendations!.some(r => /frutilla|aborto/.test(r.title)));
  assert.equal(without.weatherNote, withSpecies.weatherNote);
  // En inglés, el mismo hallazgo sin español.
  const en = buildContextualAdvice('floracion', evaluateReadingForStage(raw, 'floracion', 'en', { capturedAt: now, evaluatedAt: now }, 'sp.frutilla'),
    raw, frostyWeather(), 'en', context, 'sp.frutilla');
  const frostEn = en.recommendations!.find(r => /strawberry blossoms/.test(r.title))!;
  assert.match(frostEn.title, /low -1\.5 °C on Wed Oct 14/);
  assert.doesNotMatch(frostEn.title + frostEn.body, /mínima|Fuente|helada/);
});

test('ES6: sin pronóstico vigente el plan dice que los criterios climáticos de la especie no se evaluaron', () => {
  const evaluation = evaluateReadingForStage(raw, 'cosecha', 'es', { capturedAt: now, evaluatedAt: now }, 'sp.cerezo');
  const advice = buildContextualAdvice('cosecha', evaluation, raw, null, 'es', context, 'sp.cerezo');
  assert.ok(advice.recommendations!.some(r => r.title === 'Criterios climáticos de la especie sin evaluar'));
  // Un pronóstico de otra captura no se atribuye a este campo (T29): tampoco evalúa la especie.
  const other = buildContextualAdvice('cosecha', evaluation, raw, frostyWeather(), 'es', { ...context, captureId: 'otra' }, 'sp.cerezo');
  assert.ok(other.recommendations!.some(r => r.title === 'Criterios climáticos de la especie sin evaluar'));
  // Una especie sin criterios del pronóstico en la etapa no agrega el aviso.
  const olive = buildContextualAdvice('cosecha', evaluateReadingForStage(raw, 'cosecha', 'es', { capturedAt: now, evaluatedAt: now }, 'sp.olivo'),
    raw, null, 'es', context, 'sp.olivo');
  assert.ok(!olive.recommendations!.some(r => r.title === 'Criterios climáticos de la especie sin evaluar'));
});
