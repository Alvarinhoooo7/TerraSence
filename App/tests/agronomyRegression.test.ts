import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { evaluateSpeciesCriteria, evaluateSpeciesWeather } from '../src/engine/speciesRules';
import { evaluateForStage, evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice, maxConsecutiveHighHumidityHours } from '../src/engine/contextualAdvice';
import { isRainingNow } from '../src/engine/weatherOutlook';
import { PRE_PLANTING_PROFILES, evaluatePrePlantingOptions, packCropOptions, unpackCropOptions } from '../src/engine/prePlanting';
import { buildSavedDiagnosisSnapshot, applyWeatherToCapture } from '../src/utils/measureCaptureSession';
import { presentationFromPoint } from '../src/engine/measurementPresentation';
import { normalizeWeather } from '../src/services/weatherService';
import { CHILE_OPEN_METEO_FIXTURE } from './fixtures/weatherUnits';

const raw = { vwc: 14, temp: 22, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 30, airHumidity: 30, airPressure: 1010 };
const clock = { capturedAt: '2026-11-18T18:00:00Z', evaluatedAt: '2026-11-18T18:01:00Z' };

test('la demanda atmosférica no prescribe riego sin contexto de suelo', () => {
  for (const vwc of [14, -1]) {
    const reading = { ...raw, vwc };
    const evaluation = evaluateReadingForStage(reading, 'vegetativo', 'es', clock);
    const advice = buildContextualAdvice('vegetativo', evaluation, reading, null);
    assert.ok(!advice.recommendations?.some(item => item.kind === 'irrigation'));
  }
});

test('pH sin límite superior no se presenta como aceptable', () => {
  const ph = evaluateSpeciesCriteria('sp.pimiento', 'vegetativo', { ...raw, ph: 8.8 }).find(item => item.param === 'ph');
  assert.match(ph!.action, /no se conoce el límite superior/);
});

test('noche cálida no indica protección contra el frío', () => {
  const day = { date: '2026-11-19', label: 'mañana', isToday: false, minimumTemperatureC: 26, maximumTemperatureC: 29, rainy: false, fog: false };
  const result = evaluateSpeciesWeather('sp.pimiento', 'floracion', { days: [day], rainingNow: false, fogNow: false });
  assert.match(result.findings[0].headline, /noche cálida/);
});

test('nieve y horas discontinuas no se convierten en lluvia ni racha continua', () => {
  assert.equal(isRainingNow({ weatherCode: 73, precipitationMm: 1 }), false);
  const time = Array.from({ length: 12 }, (_, i) => `2026-11-18T${String(i * 2).padStart(2, '0')}:00`);
  assert.equal(maxConsecutiveHighHumidityHours({ hourly: { time, relativeHumidityPct: time.map(() => 95) } } as any), 1);
});

test('pH con mal contacto no clasifica ni filtra opciones de pre-siembra', () => {
  const reading = { ...raw, vwc: 4, ph: 6.5 };
  const evaluation = evaluateReadingForStage(reading, 'vegetativo', 'es', clock, 'sp.pimiento');
  assert.ok(!evaluation.alerts.some(a => a.param === 'ph' && a.origin === 'species'));
  const options = evaluatePrePlantingOptions(reading);
  assert.ok(options.length > 0);
  assert.ok(options.every(o => o.limitationCodes.includes('ph_contact_unreliable') && o.classification === 'has_limitations'));
});

test('el bloque actual atrasado no se presenta como tiempo actual', () => {
  const weather = normalizeWeather(CHILE_OPEN_METEO_FIXTURE, '2026-10-14T21:30:00Z');
  assert.ok(weather);
  assert.equal(weather.today?.date, '2026-10-14');
  assert.equal(weather.precipitationMm, null);
  assert.equal(weather.weatherCode, null);
});

test('un acumulado horario incompleto no se presenta como total restante', () => {
  const weather = normalizeWeather(CHILE_OPEN_METEO_FIXTURE, '2026-10-12T21:30:00Z');
  assert.equal(weather?.remainingToday?.precipitationMm, null);
  assert.equal(weather?.remainingToday?.precipitationIncomplete, true);
});

test('cerca de un límite de pH se recomienda repetir', () => {
  const ph = evaluateSpeciesCriteria('sp.pimiento', 'vegetativo', { ...raw, ph: 6.0 }).find(a => a.param === 'ph');
  assert.match(ph!.title, /cerca de un límite/);
  assert.match(ph!.action, /Repite/);
});

test('cada helada conserva su fecha aunque después haya otra más intensa', () => {
  const days = [8, -0.5, -3].map((minimumTemperatureC, index) => ({
    date: `2026-11-${18 + index}`, label: `día ${index}`, isToday: index === 0,
    minimumTemperatureC, maximumTemperatureC: 20, rainy: false, fog: false,
  }));
  const findings = evaluateSpeciesWeather('sp.tomate', 'vegetativo', { days, rainingNow: false, fogNow: false }).findings;
  assert.ok(findings.some(item => item.dates?.includes('2026-11-19')));
  assert.ok(findings.some(item => item.dates?.includes('2026-11-20')));
  assert.ok(findings.every(item => item.ruleId && item.sources?.length));
});

test('lluvia y helada limitan la clasificación de establecimiento', () => {
  const weather = normalizeWeather(CHILE_OPEN_METEO_FIXTURE, '2026-10-12T21:30:00Z')!;
  weather.forecast[0] = { ...weather.forecast[0], minimumTemperatureC: -2, precipitationMm: 20 };
  const options = evaluatePrePlantingOptions({ ...raw, vwc: 20, temp: 25 }, 'es', undefined, weather);
  const affected = options.filter(o => o.limitationCodes.includes('upcoming_frost_risk'));
  assert.ok(affected.length);
  assert.ok(affected.every(o => o.classification === 'has_limitations'));
});

test('temperatura alta pide repetir dentro del intervalo de compensación', () => {
  const reading = { ...raw, temp: 55 };
  const evaluation = evaluateReadingForStage(reading, 'vegetativo', 'es', clock);
  const advice = buildContextualAdvice('vegetativo', evaluation, reading, null);
  const recommendation = advice.recommendations?.find(r => r.ruleId === 'plan:ec-temperature');
  assert.match(recommendation!.body, /0 a 50 °C/);
  assert.equal(recommendation!.trace?.ruleId, 'plan:ec-temperature');
});

test('pre-siembra conserva valores cercanos por ambos lados de cada límite', () => {
  const base = PRE_PLANTING_PROFILES.find(p => p.tempMax !== null)!;
  const profile = { ...base, tempMin: 10, tempMax: 30, tempOpt: { min: 15, max: 25 }, phMin: 5, phMax: 8, phOpt: { min: 6, max: 7 } };
  const reading = { ...raw, temp: 20, ph: 6.5, vwc: 20 };
  for (const patch of [{ temp: 9.6 }, { temp: 30.4 }, { ph: 4.8 }, { ph: 8.2 }]) {
    const [option] = evaluatePrePlantingOptions({ ...reading, ...patch }, 'es', [profile]);
    assert.ok(option, JSON.stringify(patch));
    assert.equal(option.classification, 'has_limitations');
    assert.ok(option.limitationCodes.includes('outside_reference_boundary'));
    assert.match(option.reasons.join(' '), /fuera de un límite/);
  }
  for (const patch of [{ temp: 9.4 }, { temp: 30.6 }, { ph: 4.6 }, { ph: 8.4 }]) {
    assert.deepEqual(evaluatePrePlantingOptions({ ...reading, ...patch }, 'es', [profile]), []);
  }
});

test('opciones compactadas preservan cada ficha en el historial', () => {
  const params = { raw: { ...raw, temp: 20, ph: 6.5, vwc: 22 }, stage: 'pre_siembra' as const, language: 'es' as const,
    capturedAt: clock.capturedAt, evaluatedAt: clock.evaluatedAt, captureId: 'pre', location: null };
  const { evaluation, advice } = applyWeatherToCapture(params, null);
  const original = advice.cropOptions!;
  assert.deepEqual(unpackCropOptions(JSON.parse(JSON.stringify(packCropOptions(original)))), original);
  const first = original[0];
  const v1Strings = [first.profileId, first.speciesId, first.label, first.establishment, first.scope, first.classification, ...first.reasons, ...first.limitationCodes, first.technicalSummary];
  const reasonStart = 6;
  const codeStart = reasonStart + first.reasons.length;
  const legacy = { version: 1, strings: v1Strings, rows: [[0, 1, -1, 2, 3, 4, 5, first.optimalDistance,
    first.reasons.map((_, i) => reasonStart + i), first.limitationCodes.map((_, i) => codeStart + i), v1Strings.length - 1]] };
  const { group: _group, ...firstWithoutGroup } = first;
  assert.deepEqual(unpackCropOptions(legacy), [firstWithoutGroup]);
  assert.equal(unpackCropOptions({ version: 1, strings: [], rows: [[999]] }), null);
  const snapshot = JSON.parse(JSON.stringify(buildSavedDiagnosisSnapshot({ ...params, evaluation, advice, weather: null })));
  const restored = presentationFromPoint({ stage: 'pre_siembra', verdict: evaluation.verdict, diagnosis: snapshot } as any);
  assert.deepEqual(restored.cropOptions, original);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot)) < 60 * 1024);
});

test('las recomendaciones generales conservan las fechas que activaron el aviso', () => {
  const forecast = normalizeWeather(CHILE_OPEN_METEO_FIXTURE, '2026-10-12T21:30:00Z')!;
  const location = { latitude: -33.668, longitude: -70.929 };
  forecast.request = { captureId: 'trace', ...location };
  forecast.today = { ...forecast.today!, precipitationMm: 0, rainProbabilityPct: 0, minimumTemperatureC: 8, maximumTemperatureC: 20 };
  forecast.forecast = forecast.forecast.map((day, index) => ({ ...day, minimumTemperatureC: index === 2 ? -1 : 8,
    maximumTemperatureC: 20, precipitationMm: index === 0 ? 8 : 0, rainProbabilityPct: 0 }));
  const context = { captureId: 'trace', location, evaluatedAt: '2026-10-12T21:30:00Z' };
  const localClock = { capturedAt: context.evaluatedAt, evaluatedAt: context.evaluatedAt };
  const reading = { ...raw, airTemp: 2, airHumidity: 50 };
  const evaluation = evaluateReadingForStage(reading, 'vegetativo', 'es', localClock);
  const advice = buildContextualAdvice('vegetativo', evaluation, reading, forecast, 'es', context);
  assert.deepEqual(advice.recommendations?.find(r => r.ruleId === 'plan:general-weather')?.trace?.dates, [forecast.forecast[0].date, forecast.forecast[2].date]);
  assert.deepEqual(advice.recommendations?.find(r => r.ruleId === 'plan:general-weather')?.trace?.weatherRisks,
    [{ date: forecast.forecast[0].date, risk: 'rain' }, { date: forecast.forecast[2].date, risk: 'frost' }]);
  assert.deepEqual(advice.recommendations?.find(r => r.ruleId === 'plan:dewpoint-frost-watch')?.trace?.dates, []);
});

test('lluvia actual y lluvia para riego registran sólo su fecha determinante', () => {
  const weather = normalizeWeather(CHILE_OPEN_METEO_FIXTURE, '2026-10-12T21:30:00Z')!;
  weather.weatherCode = 61;
  weather.today = { ...weather.today!, precipitationMm: 0 };
  weather.forecast[0] = { ...weather.forecast[0], precipitationMm: 8 };
  const reading = { ...raw, vwc: 18 };
  const evaluation = evaluateForStage(reading, 'pre_siembra', 'maiz', 'franco');
  const advice = buildContextualAdvice('pre_siembra', evaluation, reading, weather);
  assert.deepEqual(advice.recommendations?.find(r => r.ruleId === 'plan:rain-now')?.trace?.dates, [weather.today.date]);
  const irrigation = advice.recommendations?.find(r => r.ruleId === 'plan:rain-irrigation');
  assert.ok(irrigation);
  assert.deepEqual(irrigation.trace?.dates, [weather.forecast[0].date]);
  assert.equal(irrigation.trace?.inputs.precipitationMm, 8);
});

test('al fusionar una alerta general con especie, conserva sólo los riesgos y fechas coincidentes', () => {
  const weather = normalizeWeather(CHILE_OPEN_METEO_FIXTURE, '2026-10-12T21:30:00Z')!;
  const location = { latitude: -33.668, longitude: -70.929 };
  weather.request = { captureId: 'species-trace', ...location };
  weather.today = { ...weather.today!, minimumTemperatureC: 8, maximumTemperatureC: 20, precipitationMm: 0, rainProbabilityPct: 0 };
  weather.forecast = weather.forecast.map((day, index) => ({ ...day, minimumTemperatureC: index === 0 ? -1 : 8,
    maximumTemperatureC: 20, precipitationMm: index === 1 ? 10 : 0, rainProbabilityPct: 0 }));
  const capturedAt = '2026-10-12T21:30:00Z';
  const evaluation = evaluateReadingForStage(raw, 'vegetativo', 'es', { capturedAt, evaluatedAt: capturedAt }, 'sp.tomate');
  const advice = buildContextualAdvice('vegetativo', evaluation, raw, weather, 'es', { captureId: 'species-trace', location, evaluatedAt: capturedAt }, 'sp.tomate');
  const frost = advice.recommendations?.find(item => item.trace?.weatherRisks?.some(r => r.risk === 'frost'));
  assert.deepEqual(frost?.trace?.weatherRisks, [{ date: weather.forecast[0].date, risk: 'frost' }]);
  const rain = advice.recommendations?.find(item => item.ruleId === 'plan:general-weather');
  assert.deepEqual(rain?.trace?.weatherRisks, [{ date: weather.forecast[1].date, risk: 'rain' }]);
});

test('pre-siembra incluye exactamente la banda declarada y marca su origen provisional', () => {
  const base = PRE_PLANTING_PROFILES.find(p => p.tempMax !== null)!;
  const profile = { ...base, tempMin: 10, tempMax: 30, tempOpt: { min: 15, max: 25 }, phMin: 5, phMax: 8, phOpt: { min: 6, max: 7 } };
  const reading = { ...raw, temp: 20, ph: 6.5, vwc: 20 };
  for (const patch of [{ temp: 9.5 }, { temp: 30.5 }, { ph: 4.7 }, { ph: 8.3 }]) {
    const option = evaluatePrePlantingOptions({ ...reading, ...patch }, 'es', [profile])[0];
    assert.ok(option?.limitationCodes.includes('near_reference_boundary'), JSON.stringify(patch));
    assert.ok(option.limitationCodes.includes('outside_reference_boundary'));
    assert.match(option.reasons.join(' '), /exactitud declarada.*terreno/);
  }
});
