import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateSpeciesCriteria, evaluateSpeciesWeather, longestRun, SPECIES_RULES, SPECIES_RULES_VERSION,
  type SpeciesWeatherDay, type SpeciesWeatherHour, type SpeciesWeatherInput,
} from '../src/engine/speciesRules';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { presentationSpecies, buildMeasurementPresentation } from '../src/engine/measurementPresentation';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { normalizeWeather } from '../src/services/weatherService';
import type { SoilMeasurement } from '../src/types/agronomy';
import { WEATHER_UNITS } from './fixtures/weatherUnits';

const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 24, airHumidity: 55, airPressure: 1010 };
const clock = { capturedAt: '2026-10-11T15:30:00.000Z', evaluatedAt: '2026-10-11T15:31:00.000Z' };
const day = (over: Partial<SpeciesWeatherDay> = {}, index = 1): SpeciesWeatherDay => ({
  date: `2026-10-1${index}`, label: index === 0 ? 'hoy' : `día ${index}`, isToday: index === 0,
  minimumTemperatureC: 8, maximumTemperatureC: 22, rainy: false, fog: false, ...over,
});
const forecast = (days: Partial<SpeciesWeatherDay>[], hours?: SpeciesWeatherHour[]): SpeciesWeatherInput =>
  ({ days: days.map((d, i) => day(d, i)), ...(hours ? { hours } : {}), rainingNow: false, fogNow: false });

/** Serie horaria desde `start` (hora local), una temperatura por hora. */
const hoursFrom = (start: string, temps: (number | null)[]): SpeciesWeatherHour[] => temps.map((temperatureC, i) => {
  const at = new Date(Date.parse(`${start}:00Z`) + i * 3_600_000).toISOString().slice(0, 16);
  return { time: at, temperatureC };
});

test('ES6: la salinidad de FAO se informa como referencia y nunca clasifica la lectura de la sonda', () => {
  const salinity = (id: string, ec: number) => evaluateSpeciesCriteria(id, 'vegetativo', { ...raw, ec }, 'es').filter(a => a.param === 'ec');
  const strawberry = salinity('sp.frutilla', 500);
  assert.equal(strawberry.length, 1);
  assert.equal(strawberry[0].type, 'info');
  // El agricultor lee la tolerancia en palabras simples; la cifra de FAO queda en el detalle.
  assert.equal(strawberry[0].title, 'Este cultivo es sensible a la sal');
  assert.match(strawberry[0].action, /análisis de salinidad/);
  assert.doesNotMatch(strawberry[0].action, /dS\/m|extracto/);
  assert.match(strawberry[0].detail!, /1 dS\/m de conductividad en extracto saturado/);
  assert.match(strawberry[0].detail!, /no se compara con este valor/);
  // La misma nota con conductividad baja o muy alta: no hay comparación (T13).
  assert.deepEqual(salinity('sp.frutilla', 50), strawberry);
  assert.deepEqual(salinity('sp.frutilla', 9000), strawberry);
  assert.equal(salinity('sp.esparrago', 500)[0].title, 'Este cultivo tolera la sal');
  assert.doesNotMatch(salinity('sp.esparrago', 500)[0].detail!, /dS\/m de conductividad/, 'sin umbral cuando la fuente sólo da la clase');
  // Toda especie del catálogo documenta su referencia de salinidad; un ID inexistente no inventa una tolerancia.
  for (const id of ['sp.arveja', 'sp.cebollin', 'sp.perejil', 'sp.puerro', 'sp.arandano']) assert.equal(salinity(id, 500).length, 1, id);
  assert.deepEqual(salinity('sp.no-existe', 500), []);
  // Sólo en vegetativo y floración; nunca cambia el estado de la evaluación.
  assert.deepEqual(evaluateSpeciesCriteria('sp.tomate', 'cosecha', raw, 'es').filter(a => a.param === 'ec'), []);
  assert.equal(evaluateReadingForStage(raw, 'vegetativo', 'es', clock, 'sp.tomate').state, evaluateReadingForStage(raw, 'vegetativo', 'es', clock, null).state);
  const en = evaluateSpeciesCriteria('sp.frutilla', 'vegetativo', raw, 'en').find(a => a.param === 'ec')!;
  assert.equal(en.title, 'This crop is sensitive to salt');
  assert.doesNotMatch(en.action + en.detail, /extracto|laboratorio/);
});

test('ES6: la sensibilidad al agua de FAO se informa sólo en la etapa crítica de cada especie', () => {
  const water = (id: string, stage: 'vegetativo' | 'floracion' | 'cosecha') =>
    evaluateSpeciesCriteria(id, stage, raw, 'es').filter(a => a.param === 'vwc');
  // Título y texto en lenguaje claro; el factor ky de FAO queda en el detalle técnico.
  assert.equal(water('sp.maiz', 'floracion')[0].title, 'Floración: que no le falte agua a este cultivo');
  assert.doesNotMatch(water('sp.maiz', 'floracion')[0].action, /ky/);
  assert.match(water('sp.maiz', 'floracion')[0].detail!, /ky de 1,5/);
  assert.match(water('sp.poroto', 'floracion')[0].detail!, /ky de 1,1/);
  assert.equal(water('sp.papa', 'vegetativo')[0].title, 'Crecimiento vegetativo: que no le falte agua a este cultivo');
  assert.match(water('sp.papa', 'vegetativo')[0].detail!, /ky de 0,8/);
  assert.deepEqual(water('sp.maiz', 'vegetativo'), []);
  assert.deepEqual(water('sp.papa', 'floracion'), []);
  assert.deepEqual(water('sp.maiz', 'cosecha'), []);
  assert.match(water('sp.tomate', 'floracion')[0].detail!, /no se compara con la lectura/);
  assert.doesNotMatch(water('sp.tomate', 'floracion')[0].detail!, /\s{2}/, 'sin espacios dobles');
});

test('ES6: INIA distingue hortalizas que se dañan cerca de la cosecha y el aborto floral de la arveja', () => {
  const findings = (id: string, stage: 'vegetativo' | 'floracion' | 'cosecha', min: number) =>
    evaluateSpeciesWeather(id, stage, forecast([{ minimumTemperatureC: min }]), 'es').findings;
  // Lechuga: en crecimiento tolera una helada leve; cerca de la cosecha cualquier helada es advertencia.
  assert.deepEqual(findings('sp.lechuga', 'vegetativo', -1).map(f => f.type), ['info']);
  assert.deepEqual(findings('sp.lechuga', 'cosecha', -1).map(f => f.type), ['warning']);
  assert.match(findings('sp.lechuga', 'cosecha', -1)[0].title, /cerca de la cosecha/);
  assert.deepEqual(findings('sp.lechuga', 'cosecha', 0), [], 'INIA define helada bajo 0 °C');
  // Zanahoria: INIA 2007 y 1998 discrepan; en cosecha se usa el criterio más cauto y se declara.
  assert.match(findings('sp.zanahoria', 'cosecha', -0.5)[0].detail, /1998/);
  // Arveja en floración: aborto floral con cualquier helada; sin aviso de tolerancia en esa etapa.
  assert.deepEqual(findings('sp.arveja', 'floracion', -0.5).map(f => f.title.split(' — ')[0]), ['Helada en floración: riesgo de aborto floral en arveja']);
  // Cebolla y puerro toleran; repollo tolera heladas débiles todo el ciclo.
  assert.deepEqual(findings('sp.cebolla', 'cosecha', -1).map(f => f.type), ['info']);
  assert.deepEqual(findings('sp.repollo', 'cosecha', -1).map(f => f.type), ['info']);
  // Papa: INIA confirma que no tolera heladas.
  assert.match(findings('sp.papa', 'vegetativo', -0.5)[0].detail, /INIA advierte/);
});

test('ES6: olivo en cosecha advierte helada sobre la aceituna en maduración', () => {
  const harvest = (min: number) => evaluateSpeciesWeather('sp.olivo', 'cosecha', forecast([{}, { minimumTemperatureC: min }]), 'es').findings;
  assert.deepEqual(harvest(0), []);
  assert.equal(harvest(-0.1)[0].type, 'warning');
  assert.match(harvest(-0.1)[0].title, /aceituna en maduración/);
  assert.match(harvest(-0.1)[0].body, /considera cosechar antes/);
  assert.match(harvest(-0.1)[0].detail, /INIA Intihuasi/);
});

test('ES6: calor en floración por especie y noches cálidas como episodio distinto de la helada', () => {
  const bloom = (id: string, over: Partial<SpeciesWeatherDay>) => evaluateSpeciesWeather(id, 'floracion', forecast([over]), 'es').findings.map(f => f.title);
  assert.match(bloom('sp.pimiento', { maximumTemperatureC: 35.1 })[0], /caída de flores/);
  assert.deepEqual(bloom('sp.pimiento', { maximumTemperatureC: 35 }), []);
  assert.match(bloom('sp.poroto', { minimumTemperatureC: 20.1 })[0], /Noches sobre 20 °C/);
  assert.match(bloom('sp.zapallo', { minimumTemperatureC: 24 })[0], /Noches sobre 23,9 °C/);
  assert.match(bloom('sp.maiz', { maximumTemperatureC: 36 })[0], /sedas del maíz/);
  // Sobre 100 °F sólo se informa el grado más extremo del mismo episodio de calor.
  assert.deepEqual(bloom('sp.maiz', { maximumTemperatureC: 38 }).map(t => t.split(' — ')[0]), ['Calor sobre 37,8 °C en floración: puede matar el polen del maíz']);
  // Melón, sandía y pepino no tienen una fuente de calor propia: no se infiere de los zapallos.
  for (const id of ['sp.melon', 'sp.sandia', 'sp.pepino']) assert.deepEqual(bloom(id, { maximumTemperatureC: 40 }), [], id);
});

test('E3/T22–T24: la duración horaria corta en huecos y cambios de hora, y no se inventa sin serie', () => {
  const freezing = (v: number) => v <= 0;
  // Noche del 13 al 14: de 22:00 a 07:00 bajo cero, interrumpida por un hueco a las 03:00.
  const night = hoursFrom('2026-10-13T20:00', [2, 1, -0.5, -1, -1.5, -2, -2, null, -1, -1, -0.5, -0.2, 1, 3]);
  assert.equal(longestRun(night, '2026-10-14', freezing), 5, 'de 22:00 a 02:00, la racha más larga que toca el 14');
  assert.equal(longestRun(undefined, '2026-10-14', freezing), null, 'sólo diario: sin duración (T22)');
  assert.equal(longestRun(night, '2026-10-20', freezing), null, 'la serie no cubre esa fecha');
  // Una hora repetida o saltada por el cambio de horario corta la racha (T24).
  const jump = [...hoursFrom('2026-10-14T00:00', [-1, -1]), ...hoursFrom('2026-10-14T03:00', [-1, -1])];
  assert.equal(longestRun(jump, '2026-10-14', freezing), 2);
  const finding = evaluateSpeciesWeather('sp.pimiento', 'vegetativo',
    forecast([{}, { date: '2026-10-14', minimumTemperatureC: -2 }], night), 'es').findings[0];
  assert.match(finding.body, /Se esperan unas 5 horas seguidas a 0 °C o menos el día 1\./);
  const daily = evaluateSpeciesWeather('sp.pimiento', 'vegetativo', forecast([{}, { minimumTemperatureC: -2 }]), 'es').findings[0];
  assert.doesNotMatch(daily.body, /horas seguidas/);
});

test('E3: el servicio normaliza la serie horaria y descarta horas repetidas, inválidas o sin unidad', () => {
  const now = '2026-10-12T16:30:00Z';
  const payload = (hourly: Record<string, unknown>, unit: unknown = '°C') => ({
    ...WEATHER_UNITS, hourly_units: { temperature_2m: unit }, timezone: 'America/Santiago',
    current: { time: '2026-10-12T13:30', temperature_2m: 14 },
    daily: { time: ['2026-10-12'], temperature_2m_max: [15], temperature_2m_min: [3] },
    hourly,
  });
  const weather = normalizeWeather(payload({
    time: ['2026-10-13T00:00', '2026-10-13T01:00', '2026-10-13T01:00', '2026-10-13T02:30', '2026-10-13T03:00'],
    temperature_2m: [1, 0.5, 0.4, 0, Number.NaN],
  }), now)!;
  assert.deepEqual(weather.hourly, { time: ['2026-10-13T00:00', '2026-10-13T03:00'], temperatureC: [1, null] });
  assert.equal(normalizeWeather(payload({ time: ['2026-10-13T00:00'], temperature_2m: [1] }, '°F'), now)!.hourly, undefined);
  assert.equal(normalizeWeather(payload({ time: ['2026-10-13T00:00'], temperature_2m: [1, 2] }), now)!.hourly, undefined);
});

test('ES6/T39: la instantánea guarda la versión de los criterios y el contexto menciona el pronóstico', () => {
  const species = presentationSpecies('sp.tomate', 'floracion')!;
  assert.equal(species.rulesVersion, SPECIES_RULES_VERSION);
  const evaluation = evaluateReadingForStage(raw, 'floracion', 'es', clock, 'sp.tomate');
  const advice = buildContextualAdvice('floracion', evaluation, raw, null, 'es', undefined, 'sp.tomate');
  const presentation = buildMeasurementPresentation(raw, evaluation, advice, 'es', undefined, 'sp.tomate');
  assert.match(presentation.context, /el pronóstico y los criterios de esta especie para floración/);
  assert.equal(presentation.species?.rulesVersion, SPECIES_RULES_VERSION);
  assert.ok(Object.values(SPECIES_RULES).length >= 69);
});
