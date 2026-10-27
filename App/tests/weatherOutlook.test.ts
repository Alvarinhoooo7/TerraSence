import test from 'node:test';
import assert from 'node:assert/strict';
import { compareForecastWindows, forecastOutlook, isRainingNow, weatherKind } from '../src/engine/weatherOutlook';
import { longestRun } from '../src/engine/speciesRules';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { buildMeasurementPresentation, isMeasurementPresentation } from '../src/engine/measurementPresentation';
import { normalizeWeather, type ForecastDay } from '../src/services/weatherService';
import { weatherNow } from '../src/components/measurementResultData';
import type { SoilMeasurement } from '../src/types/agronomy';
import { WEATHER_UNITS } from './fixtures/weatherUnits';

const now = '2026-10-12T16:30:00Z';
const clock = { capturedAt: now, evaluatedAt: now };
const raw: SoilMeasurement = { vwc: 27, temp: 15, ph: 6.2, ec: 490, nitrogen: 60, phosphorus: 20, potassium: 150,
  lux: 0, battery: 90, airTemp: 18, airHumidity: 55, airPressure: 1004 };
const location = { latitude: -33.46, longitude: -70.75 };
const context = { captureId: 'captura', location, evaluatedAt: now };
const units = {
  ...WEATHER_UNITS,
  current_units: { ...WEATHER_UNITS.current_units, weather_code: 'wmo code' },
  daily_units: { ...WEATHER_UNITS.daily_units, weather_code: 'wmo code' },
};

/** Respuesta con la forma real de Open-Meteo para un día de llovizna en Santiago. */
function rainyWeather(current: Record<string, unknown> = { precipitation: 0.2, weather_code: 53 }) {
  const result = normalizeWeather({ ...units, timezone: 'America/Santiago',
    current: { time: '2026-10-12T13:30', interval: 900, temperature_2m: 14.7, wind_speed_10m: 9.9, ...current },
    daily: {
      time: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
      temperature_2m_max: [14.8, 18.3, 20.2, 21.6, 21.5, 22.6], temperature_2m_min: [9.7, 6.8, 7.3, 10.2, 12.3, 12.4],
      precipitation_probability_max: [92, 100, 75, 37, 8, 24], precipitation_sum: [7.5, 4.3, 0.1, 0, 0, 0],
      weather_code: [61, 95, 51, 3, 2, 2],
    },
  }, now)!;
  return { ...result, request: { captureId: context.captureId, ...location } };
}

test('el código WMO se agrupa en un tiempo legible y un código desconocido no se interpreta', () => {
  assert.equal(weatherKind(53), 'drizzle');
  assert.equal(weatherKind(63), 'rain');
  assert.equal(weatherKind(81), 'showers');
  assert.equal(weatherKind(95), 'storm');
  assert.equal(weatherKind(0), 'clear');
  assert.equal(weatherKind(null), null);
  const weather = normalizeWeather({ ...units, timezone: 'America/Santiago',
    current: { time: '2026-10-12T13:30', temperature_2m: 10, weather_code: 42 },
    daily: { time: ['2026-10-12'], temperature_2m_max: [15], weather_code: [7] } }, now)!;
  assert.equal(weather.weatherCode, null);
  assert.equal(weather.today?.weatherCode, null);
});

test('hoy queda asociado por fecha con su código y la lluvia actual se detecta por agua o por código', () => {
  const weather = rainyWeather();
  assert.equal(weather.today?.date, '2026-10-12');
  assert.equal(weather.today?.precipitationMm, 7.5);
  assert.equal(weather.weatherCode, 53);
  assert.equal(weather.forecast[0].date, '2026-10-13');
  assert.equal(weather.forecast[0].weatherCode, 95);
  assert.equal(isRainingNow(weather), true);
  assert.equal(isRainingNow({ precipitationMm: 0, weatherCode: 61 }), true);
  assert.equal(isRainingNow({ precipitationMm: 0, weatherCode: 3 }), false);
  assert.equal(isRainingNow({ precipitationMm: null, weatherCode: undefined }), false);
});

test('el clima de hoy se lee igual de una consulta nueva y de un diagnóstico antiguo sin código', () => {
  const live = weatherNow(rainyWeather());
  assert.equal(live?.precipitationMinutes, 15);
  assert.equal(live?.today.precipitationMm, 7.5);
  assert.equal(live?.weatherCode, 53);
  const old = weatherNow({ temperatureC: 12, precipitationMm: 0, dailyPrecipitationMm: 3, rainProbabilityPct: 40, minimumTemperatureC: 5, maximumTemperatureC: 16 });
  assert.equal(old?.weatherCode, null);
  assert.equal(old?.today.precipitationMm, 3);
  assert.equal(old?.today.maximumTemperatureC, 16);
  assert.equal(weatherNow(null), null);
  assert.equal(weatherNow({ forecast: [] }), null);
});

test('el resumen de los próximos días nombra la lluvia, cuándo se seca y las máximas', () => {
  const text = forecastOutlook(rainyWeather().forecast, 'es');
  assert.equal(text, 'Se espera lluvia mañana (4,3 mm, 100 %) y el miércoles (0,1 mm, 75 %). Desde el jueves, días más secos. Máximas entre 18 y 23 °C. Sin heladas ni calor extremo previstos.');
  const english = forecastOutlook(rainyWeather().forecast, 'en');
  assert.match(english ?? '', /^Rain expected tomorrow \(4\.3 mm, 100 %\)/);
  const dry: ForecastDay[] = [{ date: '2026-07-01', minimumTemperatureC: -1, maximumTemperatureC: 12, precipitationMm: 0, rainProbabilityPct: 5 }];
  assert.equal(forecastOutlook(dry, 'es'), 'No se espera lluvia importante en los próximos días. Máximas entre 12 y 12 °C. Hay riesgo de helada.');
  assert.equal(forecastOutlook([], 'es'), null);
  assert.equal(forecastOutlook([{ date: '2026-07-01', minimumTemperatureC: null, maximumTemperatureC: null, precipitationMm: null, rainProbabilityPct: null }]), null);
});

test('el plan de recomendaciones pone primero la lluvia actual, incluye hoy y cierra con volver a medir', () => {
  const evaluation = evaluateReadingForStage(raw, 'vegetativo', 'es', clock);
  const advice = buildContextualAdvice('vegetativo', evaluation, raw, rainyWeather(), 'es', context);
  const plan = advice.recommendations!;
  assert.equal(plan[0].kind, 'weather');
  assert.equal(plan[0].when, 'now');
  assert.equal(plan[0].title, 'Está lloviendo ahora');
  assert.equal(plan[plan.length - 1].kind, 'monitoring');
  const labor = plan.find(item => item.title === 'Programa las labores según el clima');
  assert.equal(labor?.when, 'today');
  assert.match(labor?.body ?? '', /: hoy, mar 13 oct, mié 14 oct\./);
  assert.match(advice.weatherNote, /^Revisar la fecha de la labor: hoy \(lluvia\)/);
  // Las acciones heredadas siguen el plan, sin el cierre de seguimiento.
  assert.deepEqual(advice.actions, plan.filter(item => item.kind !== 'monitoring').sort((a, b) =>
    advice.actions.indexOf(a.body) - advice.actions.indexOf(b.body)).map(item => item.body));
  assert.ok(!advice.actions.some(action => /Vuelve a medir para comparar|tendencia dice más/.test(action)));
});

test('sin lluvia actual el plan no la inventa y el pronóstico no evaluado no aporta recomendaciones de clima', () => {
  const evaluation = evaluateReadingForStage(raw, 'vegetativo', 'es', clock);
  const dry = buildContextualAdvice('vegetativo', evaluation, raw, rainyWeather({ precipitation: 0, weather_code: 3 }), 'es', context);
  assert.ok(!dry.recommendations!.some(item => item.title === 'Está lloviendo ahora'));
  const unverified = buildContextualAdvice('vegetativo', evaluation, raw, rainyWeather(), 'es', { ...context, captureId: 'otra' });
  assert.ok(!unverified.recommendations!.some(item => item.kind === 'weather'));
  assert.equal(unverified.recommendations![0].kind, 'evidence');
});

test('la presentación guarda el plan y acepta lecturas anteriores sin él', () => {
  const evaluation = evaluateReadingForStage(raw, 'vegetativo', 'es', clock);
  const advice = buildContextualAdvice('vegetativo', evaluation, raw, rainyWeather(), 'es', context);
  const presentation = buildMeasurementPresentation(raw, evaluation, advice, 'es', undefined, 'sp.tomate');
  assert.deepEqual(presentation.recommendations, advice.recommendations);
  assert.ok(isMeasurementPresentation(JSON.parse(JSON.stringify(presentation))));
  const { recommendations: _omitted, ...older } = presentation;
  assert.ok(isMeasurementPresentation(older));
  assert.ok(!isMeasurementPresentation({ ...presentation, recommendations: [{ kind: 'dosis', priority: 'high', when: 'now', title: 'x', body: 'y' }] }));
});

test('CO01–CO05 y T28: compareForecastWindows contrasta días despejados con adversos y nunca premia días con lluvia null', () => {
  const days: ForecastDay[] = [
    { date: '2026-10-13', minimumTemperatureC: 8, maximumTemperatureC: 22, precipitationMm: 8, rainProbabilityPct: 80 },
    { date: '2026-10-14', minimumTemperatureC: 9, maximumTemperatureC: 23, precipitationMm: 0, rainProbabilityPct: 10 },
    { date: '2026-10-15', minimumTemperatureC: 9, maximumTemperatureC: 24, precipitationMm: null, rainProbabilityPct: 10 },
  ];
  const esText = compareForecastWindows(days, 'es')!;
  assert.match(esText, /Ventana más despejada para labores de campo el miércoles, frente a condiciones más adversas mañana\./);
  assert.match(esText, /No se consideran como ventana favorable el jueves por tener pronóstico incompleto\./);

  const enText = compareForecastWindows(days, 'en')!;
  assert.match(enText, /Clearer window for field work on Wednesday, compared with more adverse conditions tomorrow\./);
  assert.match(enText, /Not counted as a favorable window \(on Thursday\) due to incomplete forecast records\./);

  // CO05: cuando todos los días completos son despejados, destaca el de menor exigencia térmica relativa
  const stableDays: ForecastDay[] = [
    { date: '2026-10-13', minimumTemperatureC: 8, maximumTemperatureC: 24, precipitationMm: 0, rainProbabilityPct: 10 },
    { date: '2026-10-14', minimumTemperatureC: 7, maximumTemperatureC: 19, precipitationMm: 0, rainProbabilityPct: 5 },
  ];
  assert.match(compareForecastWindows(stableDays, 'es')!, /menor exigencia térmica relativa el miércoles \(máxima de 19 °C\)/);
  assert.match(compareForecastWindows(stableDays, 'en')!, /lower relative thermal demand on Wednesday \(19 °C high\)/);
});

test('T21–T27: separación de probabilidad y lámina de precipitación y continuidad horaria ante huecos o cambio de hora de Chile', () => {
  // T25–T27: probabilidad alta sin mm no suma lámina; rain/showers no se suman encima de precipitation_sum
  const weather = normalizeWeather({
    ...units,
    hourly_units: { time: 'iso8601', temperature_2m: '°C' },
    timezone: 'America/Santiago',
    current: { time: '2026-09-05T22:00', interval: 900, temperature_2m: 12, precipitation: 0, rain: 5, showers: 5, weather_code: 3 },
    daily: {
      time: ['2026-09-05', '2026-09-06'],
      temperature_2m_max: [18, 19],
      temperature_2m_min: [6, 7],
      precipitation_sum: [0, 2.5],
      precipitation_probability_max: [85, 20],
      weather_code: [3, 1],
    },
    hourly: {
      // Salto horario (de 22:00 a 01:00 = 3 h > 1 h): rompe la racha continua
      time: [
        '2026-09-05T18:00', '2026-09-05T19:00', '2026-09-05T20:00', '2026-09-05T21:00', '2026-09-05T22:00',
        '2026-09-06T01:00', '2026-09-06T02:00', '2026-09-06T03:00', '2026-09-06T04:00', '2026-09-06T05:00', '2026-09-06T06:00', '2026-09-06T07:00',
      ],
      temperature_2m: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    },
  }, '2026-09-05T22:00:00Z')!;

  assert.equal(weather.precipitationMm, 0);
  assert.equal(weather.dailyPrecipitationMm, 0);
  assert.equal(weather.rainProbabilityPct, 85);

  // Con el hueco horario entre 22:00 y 01:00, la racha continua máxima que toca 2026-09-06 es de 7 h (y no 12 h)
  const hours = weather.hourly!.time.map((time, i) => ({ time, temperatureC: weather.hourly!.temperatureC[i] }));
  assert.equal(longestRun(hours, '2026-09-06', v => v <= 0), 7);
});
