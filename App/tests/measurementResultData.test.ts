import assert from 'node:assert/strict';
import test from 'node:test';
import { MEASUREMENT_GROUPS, savedForecast } from '../src/components/measurementResultData';
import { PARAMETER_KEYS } from '../src/engine/measurementPresentation';
import { buildMeasurementPresentation, presentationFromPoint } from '../src/engine/measurementPresentation';
import { decodeTelemetry } from '../src/services/probeService';
import { fetchCurrentWeather } from '../src/services/weatherService';
import { evaluateForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { mapRowToPoint, type SoilMeasurementRow } from '../src/types/app';
import { WEATHER_UNITS } from './fixtures/weatherUnits';

test('los grupos permiten abrir las diez variables sin omitir ni duplicar nutrientes o ambiente', () => {
  assert.deepEqual(MEASUREMENT_GROUPS.flat(), [...PARAMETER_KEYS]);
  assert.equal(new Set(MEASUREMENT_GROUPS.flat()).size, 10);
});

test('históricos sin clima o malformados conservan ausencia explícita', () => {
  for (const value of [null, {}, { weather: null }, { weather: { forecast: 'invalid' } }]) assert.deepEqual(savedForecast(value), []);
});

test('el pronóstico guardado preserva cero y convierte ausencias o valores inválidos en sin dato', () => {
  const diagnosis = { weather: { forecast: [{ date: '2026-10-04', minimumTemperatureC: 0, maximumTemperatureC: 24, precipitationMm: NaN, rainProbabilityPct: '10' }, null, { date: 'invalid' }] } };
  assert.deepEqual(savedForecast(diagnosis), [{ date: '2026-10-04', minimumTemperatureC: 0, maximumTemperatureC: 24, precipitationMm: null, rainProbabilityPct: null, weatherCode: null }]);
  assert.equal(diagnosis.weather.forecast.length, 3);
});

test('el visor mantiene como máximo cinco fechas registradas', () => {
  const forecast = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${10 + i}`, precipitationMm: 0 }));
  assert.equal(savedForecast({ weather: { forecast } }).length, 5);
});

test('captura y visor histórico conservan presentación, detalles y pronóstico después de serializar la fila', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ...WEATHER_UNITS,
    timezone: 'America/Santiago', current: { time: '2026-10-03T12:00', temperature_2m: 19 },
    daily: { time: ['2026-10-04', '2026-10-05'], temperature_2m_min: [0, 12], temperature_2m_max: [21, 25], precipitation_sum: [0, 5] },
  }));
  try {
    const raw = decodeTelemetry(new Uint8Array([1, 94, 0, 245, 3, 232, 0, 65, 0, 45, 0, 30, 0, 80, 87, 1, 0x26, 0x52, 0xc0, 0x7d]));
    const weather = await fetchCurrentWeather(-33, -70);
    assert.ok(weather);
    const evaluation = evaluateForStage(raw, 'floracion', 'maiz', 'franco');
    const advice = buildContextualAdvice('floracion', evaluation, raw, weather);
    const presentation = buildMeasurementPresentation(raw, evaluation, advice);
    const row = {
      id: 'saved-id', client_uuid: 'capture-id', phenological_stage: 'floracion',
      measured_at: '2026-10-03T15:00:00Z', verdict: evaluation.verdict, verdict_title: evaluation.verdictTitle,
      action_summary: advice.summary, diagnosis: { presentation, weather },
      ph: raw.ph, ec_us_cm: raw.ec, vwc_percent: raw.vwc, soil_temp_c: raw.temp,
      nitrogen: raw.nitrogen, phosphorus: raw.phosphorus, potassium: raw.potassium,
      canopy_temp_c: raw.airTemp, canopy_humidity_pct: raw.airHumidity, air_pressure_hpa: raw.airPressure,
      battery_percent: raw.battery, latitude: -33, longitude: -70, gps_accuracy_m: 8,
    };
    const point = mapRowToPoint(JSON.parse(JSON.stringify(row)) as SoilMeasurementRow);
    const historical = presentationFromPoint(point);
    assert.deepEqual(historical, presentation);
    assert.deepEqual(historical.parameters.map(p => [p.value, p.state, p.recommendation, p.control]), presentation.parameters.map(p => [p.value, p.state, p.recommendation, p.control]));
    assert.deepEqual(savedForecast(point.diagnosis), weather.forecast);
    assert.deepEqual([point.latitude, point.longitude, point.gpsAccuracyM, point.batteryPercent], [-33, -70, 8, 87]);
  } finally { globalThis.fetch = originalFetch; }
});
