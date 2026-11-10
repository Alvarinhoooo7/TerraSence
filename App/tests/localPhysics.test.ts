import assert from 'node:assert/strict';
import test from 'node:test';
import { computeVpdKpa } from '../src/engine/agronomyEngine';
import { buildContextualAdvice } from '../src/engine/contextualAdvice';
import { buildEvaluationCoverage } from '../src/engine/evaluationCoverage';
import { buildLocalInputQuality } from '../src/engine/inputQuality';
import {
  assessProbeMetrologicalContext,
  barometricAltitudeMeters,
  CWT_SOIL_NPKPHCTH_S_SPEC,
  dewPointC,
  deriveLocalPhysics,
  psychrometricConstantKpaPerC,
  saturationVaporPressureKpa,
  vaporPressureDeficitKpa,
} from '../src/engine/localPhysics';
import { buildMeasurementPresentation, isMeasurementPresentation } from '../src/engine/measurementPresentation';
import { evaluateSpeciesCriteria, hasLocalAirCriteria, localAirImplies, SPECIES_RULES } from '../src/engine/speciesRules';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { normalizeWeather } from '../src/services/weatherService';
import type { SoilMeasurement } from '../src/types/agronomy';
import { WEATHER_UNITS } from './fixtures/weatherUnits';

const capturedAt = '2026-10-22T13:00:00.000Z';
const evaluatedAt = '2026-10-22T13:01:00.000Z';
const raw: SoilMeasurement = { vwc: 22, temp: 15, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 20, airHumidity: 50, airPressure: 1010 };
const physicsOf = (reading: Partial<SoilMeasurement>) => deriveLocalPhysics(buildLocalInputQuality({ ...raw, ...reading }, capturedAt));
const near = (actual: number | null, expected: number, tolerance: number) => {
  assert.ok(actual !== null && Math.abs(actual - expected) <= tolerance, `${actual} no está a ±${tolerance} de ${expected}`);
};

test('T07: aire a 20 °C y 50 % da DPV de 1,17 kPa y rocío de 9,3 °C', () => {
  const { indicators } = physicsOf({});
  near(indicators.vpd.value, 1.17, 0.005);
  near(indicators.dew_point.value, 9.3, 0.05);
  near(indicators.dew_point_spread.value, 10.7, 0.05);
  assert.equal(indicators.vpd.availability, 'available');
  assert.equal(indicators.vpd.unit, 'kPa');
  assert.match(indicators.vpd.source, /FAO-56/);
  // FAO-56 ec. 11 a 20 °C: 2,338 kPa.
  near(saturationVaporPressureKpa(20), 2.338, 0.001);
});

test('T08: con HR de 100 % el DPV es cero y el rocío es la propia temperatura', () => {
  for (const airTemp of [-5, 0, 12.4, 30]) {
    assert.equal(vaporPressureDeficitKpa(airTemp, 100), 0);
    assert.equal(dewPointC(airTemp, 100), airTemp);
  }
  assert.equal(physicsOf({ airHumidity: 100 }).indicators.dew_point_spread.value, 0);
});

test('T09: con HR cero el DPV se calcula y el rocío no, sin forzar un mínimo de humedad', () => {
  const { indicators } = physicsOf({ airHumidity: 0 });
  near(indicators.vpd.value, saturationVaporPressureKpa(20)!, 1e-12);
  assert.equal(indicators.dew_point.value, null);
  assert.equal(indicators.dew_point.availability, 'not_computable');
  assert.ok(indicators.dew_point.limitationCodes.includes('relative_humidity_zero'));
  assert.ok(!indicators.dew_point.limitationCodes.includes('outside_formula_domain'));
  assert.equal(indicators.dew_point_spread.value, null);
});

test('T10: sin presión, el DPV y el rocío siguen disponibles', () => {
  const { indicators } = physicsOf({ airPressure: null });
  assert.equal(indicators.vpd.availability, 'available');
  assert.equal(indicators.dew_point.availability, 'available');
  assert.ok(indicators.vpd.inputs.every(key => key !== 'airPressure'));
});

test('T04: si falta una magnitud del BME280 sólo se suspenden sus derivados', () => {
  const noHumidity = physicsOf({ airHumidity: null }).indicators;
  assert.equal(noHumidity.vpd.value, null);
  assert.equal(noHumidity.dew_point.value, null);
  assert.ok(noHumidity.vpd.limitationCodes.includes('input_unavailable:airHumidity'));
  // La diferencia suelo–aire no usa la humedad.
  near(noHumidity.soil_air_difference.value, -5, 1e-9);
  const noAir = physicsOf({ airTemp: null }).indicators;
  assert.ok(Object.values(noAir).every(indicator => indicator.value === null));
  // Un dato fuera de rango es inválido, no un cero: no se calcula con él.
  assert.equal(physicsOf({ airHumidity: 140 }).indicators.vpd.value, null);
  assert.equal(physicsOf({ airTemp: Number.NaN }).indicators.dew_point.value, null);
});

test('T11: el lux heredado no participa en ningún derivado', () => {
  const dark = physicsOf({ lux: 0 });
  const bright = physicsOf({ lux: 100000 });
  assert.deepEqual(dark, bright);
  assert.ok(Object.values(dark.indicators).every(indicator => !indicator.inputs.includes('lux' as never)));
});

test('derivados: bajo 0 °C se declara la referencia sobre agua y se heredan las limitaciones', () => {
  const { indicators } = physicsOf({ airTemp: -2, airHumidity: 90 });
  assert.ok(indicators.dew_point.value! < -2);
  assert.ok(indicators.dew_point.limitationCodes.includes('water_reference_below_freezing'));
  assert.ok(indicators.vpd.limitationCodes.includes('exposure_and_stability_unverified'));
  assert.ok(indicators.vpd.limitationCodes.includes('not_leaf_to_air_deficit'));
  const simulated = deriveLocalPhysics(buildLocalInputQuality(raw, capturedAt, true));
  assert.ok(simulated.indicators.vpd.limitationCodes.includes('simulated_reading'));
});

test('columna vpd_kpa: redondea a centésimas y rechaza entradas fuera de dominio', () => {
  assert.equal(computeVpdKpa(20, 50), 1.17);
  assert.equal(computeVpdKpa(20, 140), null);
  assert.equal(computeVpdKpa(Number.NaN, 50), null);
  assert.equal(computeVpdKpa(20, -1), null);
});

test('cobertura: el DPV queda disponible como indicador continuo, sin bloqueo pendiente', () => {
  const coverage = buildEvaluationCoverage(buildLocalInputQuality(raw, capturedAt), evaluatedAt);
  assert.equal(coverage.capabilities.ambient_vpd.status, 'partial');
  assert.ok(coverage.capabilities.ambient_vpd.limitationCodes.includes('continuous_indicator_only'));
  assert.ok(!coverage.capabilities.ambient_vpd.limitationCodes.includes('derived_physics_pending'));
  const missing = buildEvaluationCoverage(buildLocalInputQuality({ ...raw, airHumidity: null }, capturedAt), evaluatedAt);
  assert.equal(missing.capabilities.ambient_vpd.status, 'not_evaluated');
});

test('presentación: los derivados van en el detalle del aire y se conservan al validar', () => {
  const evaluation = evaluateReadingForStage(raw, 'vegetativo', 'es', { capturedAt, evaluatedAt });
  const advice = buildContextualAdvice('vegetativo', evaluation, raw, null, 'es');
  const presentation = buildMeasurementPresentation(raw, evaluation, advice, 'es', buildLocalInputQuality(raw, capturedAt));
  const humidity = presentation.parameters.find(p => p.key === 'airHumidity')!;
  assert.deepEqual(humidity.derived?.map(d => d.id), ['vpd', 'dew_point', 'dew_point_spread']);
  near(humidity.derived![0].value, 1.17, 0.005);
  assert.equal(presentation.parameters.find(p => p.key === 'airTemp')!.derived?.[0].id, 'soil_air_difference');
  assert.equal(presentation.parameters.find(p => p.key === 'vwc')!.derived, undefined);
  assert.ok(isMeasurementPresentation(JSON.parse(JSON.stringify(presentation))));
  // Indicador continuo: ningún texto lo convierte en categoría ni acción.
  assert.ok(humidity.derived!.every(d => !/riega|regar|alerta|riesgo/i.test(d.note)));
  // Una presentación sin derivados (lecturas anteriores) se sigue leyendo.
  const older = { ...presentation, parameters: presentation.parameters.map(({ derived: _derived, ...p }) => p) };
  assert.ok(isMeasurementPresentation(older));
});

// --- Frío por especie con la temperatura del aire que mide el equipo -----------------------

const offline = (airTemp: number | null, speciesId = 'sp.tomate', stage: 'vegetativo' | 'floracion' | 'cosecha' = 'cosecha') => {
  const reading = { ...raw, airTemp };
  const evaluation = evaluateReadingForStage(reading, stage, 'es', { capturedAt, evaluatedAt }, speciesId);
  return { evaluation, advice: buildContextualAdvice(stage, evaluation, reading, null, 'es', undefined, speciesId) };
};

test('sin pronóstico, una helada medida por el equipo se avisa con el umbral más extremo que se cumple', () => {
  const { evaluation, advice } = offline(-2.5);
  const frost = evaluation.alerts.filter(a => a.param === 'airTemp');
  assert.equal(frost.length, 1, 'un solo aviso por familia (T44)');
  assert.equal(frost[0].type, 'danger');
  assert.match(frost[0].title, /congela la planta de tomate — el equipo mide -2,5 °C ahora/);
  assert.match(frost[0].detail!, /no descarta una helada más tarde/);
  assert.equal(evaluation.state, 'attention');
  const item = advice.recommendations!.find(r => r.title === frost[0].title)!;
  assert.equal(item.kind, 'weather');
  assert.equal(item.when, 'now');
  assert.equal(item.priority, 'high');
  // Sigue diciendo que no se revisaron los próximos días.
  const pending = advice.recommendations!.find(r => r.title === 'No pudimos revisar el clima para este cultivo')!;
  assert.match(pending.body, /Sólo revisamos el frío con la temperatura del aire que mide el equipo ahora/);
});

test('una lectura del aire sobre el umbral no da el clima por favorable', () => {
  const { evaluation, advice } = offline(14);
  assert.equal(evaluation.alerts.filter(a => a.param === 'airTemp').length, 0);
  assert.ok(!advice.recommendations!.some(r => r.title === 'Clima sin riesgos para este cultivo'));
  assert.ok(advice.recommendations!.some(r => r.title === 'No pudimos revisar el clima para este cultivo'));
});

test('el calor y las noches cálidas no se deducen de una lectura instantánea', () => {
  const heat = Object.values(SPECIES_RULES).flatMap(p => p.criteria).filter(c => c.kind === 'air_temperature' && !localAirImplies(c));
  assert.ok(heat.length > 0);
  assert.ok(heat.every(c => c.kind === 'air_temperature' && (c.extreme === 'maximum' || c.comparison === 'above' || c.comparison === 'at_or_above')));
  // Cerezo en floración: calor sobre 30 °C no se avisa con 38 °C medidos al sol.
  const { evaluation } = offline(38, 'sp.cerezo', 'floracion');
  assert.equal(evaluation.alerts.filter(a => a.param === 'airTemp').length, 0);
});

test('el aire local respeta la calidad: ausente, antiguo o sin especie no se compara', () => {
  assert.equal(offline(null).evaluation.alerts.filter(a => a.param === 'airTemp').length, 0);
  const stale = evaluateReadingForStage({ ...raw, airTemp: -3 }, 'cosecha', 'es', { capturedAt, evaluatedAt: '2026-10-22T14:00:00.000Z' }, 'sp.tomate');
  assert.equal(stale.alerts.filter(a => a.param === 'airTemp').length, 0);
  assert.equal(evaluateSpeciesCriteria(null, 'cosecha', { ...raw, airTemp: -3 }).length, 0);
  // Las alertas generales no cambian por la especie (T45).
  const general = (id: string | null) => evaluateReadingForStage({ ...raw, airTemp: -3 }, 'cosecha', 'es', { capturedAt, evaluatedAt }, id)
    .alerts.filter(a => a.origin !== 'species');
  assert.deepEqual(general('sp.tomate'), general(null));
});

test('con pronóstico y aire local se conservan ambas fuentes, sin corregir una con otra', () => {
  const context = { captureId: 'captura', location: { latitude: -33.46, longitude: -70.75 }, evaluatedAt };
  const weather = { ...normalizeWeather({ ...WEATHER_UNITS, timezone: 'America/Santiago',
    current: { time: '2026-10-22T10:00', interval: 900, temperature_2m: 3, wind_speed_10m: 5, precipitation: 0 },
    daily: {
      time: ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'],
      temperature_2m_max: [16, 15, 14, 18, 20, 22], temperature_2m_min: [2, -3, 1, 3, 6, 8],
      precipitation_probability_max: [0, 0, 0, 0, 0, 0], precipitation_sum: [0, 0, 0, 0, 0, 0],
    },
  }, '2026-10-22T13:00:30.000Z')!, request: { captureId: context.captureId, ...context.location } };
  const reading = { ...raw, airTemp: -1 };
  const evaluation = evaluateReadingForStage(reading, 'cosecha', 'es', { capturedAt, evaluatedAt }, 'sp.tomate');
  const plan = buildContextualAdvice('cosecha', evaluation, reading, weather, 'es', context, 'sp.tomate').recommendations!;
  // El equipo mide −1 °C ahora; el modelo prevé −3 °C mañana: se muestran los dos, cada uno con su origen.
  assert.ok(plan.some(r => r.when === 'now' && /el equipo mide -1 °C ahora/.test(r.title)));
  assert.ok(plan.some(r => r.kind === 'weather' && /mínima de -3 °C/.test(r.title) && /Pronóstico del modelo/.test(r.detail ?? '')));
  assert.ok(!plan.some(r => r.title === 'No pudimos revisar el clima para este cultivo'));
});

test('en todo el catálogo, el frío medido avisa una sola vez donde la especie tiene criterio de frío', () => {
  const stages = ['vegetativo', 'floracion', 'cosecha'] as const;
  for (const stage of stages) for (const id of Object.keys(SPECIES_RULES)) {
    const alerts = evaluateSpeciesCriteria(id, stage, { ...raw, airTemp: -40 }).filter(a => a.param === 'airTemp');
    assert.equal(alerts.length, hasLocalAirCriteria(id, stage) ? 1 : 0, `${id} en ${stage}`);
  }
  // En cosecha, donde antes ninguna especie tenía un criterio evaluable sin red, ahora la mayoría lo tiene.
  assert.ok(Object.keys(SPECIES_RULES).filter(id => hasLocalAirCriteria(id, 'cosecha')).length > Object.keys(SPECIES_RULES).length / 2);
});

test('metrología CWT-Soil-NPKPHCTH-S y psicrometría barométrica del BME280', () => {
  assert.equal(CWT_SOIL_NPKPHCTH_S_SPEC.bus.address, 1);
  assert.equal(CWT_SOIL_NPKPHCTH_S_SPEC.bus.registerCount, 7);
  assert.equal(CWT_SOIL_NPKPHCTH_S_SPEC.responseTimeS.firmwareBurstSamples, 10);
  assert.equal(CWT_SOIL_NPKPHCTH_S_SPEC.responseTimeS.firmwareTrimmedMeanCentralSamples, 6);
  assert.equal(CWT_SOIL_NPKPHCTH_S_SPEC.responseTimeS.bme280BurstSamples, 10);
  assert.deepEqual(CWT_SOIL_NPKPHCTH_S_SPEC.channels.ph.electrodeNominalRange, { min: 3, max: 9 });

  // Sonda en suelo húmedo normal y presión de banco (960 hPa ≈ 454 m s. n. m.).
  const normal = assessProbeMetrologicalContext({ vwc: 28, temp: 18, ec: 1200, ph: 6.4, airPressure: 960 });
  assert.equal(normal.vwcUncertaintyPct, 2.0);
  assert.equal(normal.soilTempUncertaintyC, 0.5);
  assert.equal(normal.ecUncertaintyUsCm, 36); // 3 % de 1200 µS/cm
  assert.equal(normal.ecThermalCompensationGuaranteed, true);
  assert.equal(normal.phUncertainty, 0.3);
  assert.equal(normal.phWithinElectrodeNominalRange, true);
  assert.equal(normal.electrolyteContactAdequate, true);
  assert.deepEqual(normal.flags, []);
  near(normal.psychrometricConstantKpaPerC, 0.06384, 0.0001);
  near(normal.barometricAltitudeM, 454, 5);

  // Sonda al aire o en suelo seco (ensayo F1: VWC 0 %, pH 8,6) y pH fuera de 3–9:
  const dryAndExtreme = assessProbeMetrologicalContext({ vwc: 0, temp: -2, ec: 15000, ph: 9.4, airPressure: null });
  assert.equal(dryAndExtreme.vwcUncertaintyPct, 2.0);
  assert.equal(dryAndExtreme.ecUncertaintyUsCm, 750); // 5 % sobre 10.000 µS/cm
  assert.equal(dryAndExtreme.ecThermalCompensationGuaranteed, false);
  assert.equal(dryAndExtreme.phWithinElectrodeNominalRange, false);
  assert.equal(dryAndExtreme.electrolyteContactAdequate, false);
  assert.equal(dryAndExtreme.psychrometricConstantKpaPerC, null);
  assert.equal(dryAndExtreme.barometricAltitudeM, null);
  assert.deepEqual(dryAndExtreme.flags, [
    'ph_outside_electrode_nominal_range',
    'low_moisture_electrolyte_contact',
    'ec_outside_thermal_compensation_window',
  ]);

  // Suelo muy húmedo (> 50 % VWC) pasa a ±3,0 % de incertidumbre nominal:
  const wet = assessProbeMetrologicalContext({ vwc: 65, temp: 20, ec: 500, ph: 6.5, airPressure: 1013.25 });
  assert.equal(wet.vwcUncertaintyPct, 3.0);
  near(wet.barometricAltitudeM, 0, 0.1);
  assert.equal(psychrometricConstantKpaPerC(250), null);
  assert.equal(barometricAltitudeMeters(1200), null);
});

test('integración activa de airPressure, metrología de sonda, punto de rocío bajo cero y desacople térmico en el motor', () => {
  // 1) A 25 °C y 34 % HR el DPV es 2,09 kPa: a 1013 hPa no activa C01+C02 (< 2,2 kPa), pero en
  // altitud (880 hPa, γ = 0,0585 kPa/°C, ~1176 m s. n. m.) el umbral baja a 2,0 kPa y sí avisa:
  const seaLevelReading = { ...raw, vwc: 12, airTemp: 25, airHumidity: 34, airPressure: 1013 };
  const seaEval = evaluateReadingForStage(seaLevelReading, 'vegetativo', 'es', { capturedAt, evaluatedAt }, 'sp.tomate');
  const seaAdvice = buildContextualAdvice('vegetativo', seaEval, seaLevelReading, null, 'es', undefined, 'sp.tomate');
  assert.ok(!seaAdvice.recommendations!.some(r => /C01 \+ C02/.test(r.detail ?? '')));

  const highAltReading = { ...raw, vwc: 12, airTemp: 25, airHumidity: 34, airPressure: 880 };
  const highAltEval = evaluateReadingForStage(highAltReading, 'vegetativo', 'es', { capturedAt, evaluatedAt }, 'sp.tomate');
  const highAltAdvice = buildContextualAdvice('vegetativo', highAltEval, highAltReading, null, 'es', undefined, 'sp.tomate');
  const vpdRec = highAltAdvice.recommendations!.find(r => /C01 \+ C02/.test(r.detail ?? ''))!;
  assert.ok(vpdRec, 'En altitud (880 hPa) debe activar C01+C02 con DPV 2,09 kPa');
  assert.match(vpdRec.detail!, /880 hPa/);
  assert.match(vpdRec.detail!, /0,0585 kPa\/°C/);

  // 2) En la presentación, airPressure informa altitud y γ, y los canales de suelo informan su incertidumbre nominal:
  const pres = buildMeasurementPresentation(highAltReading, highAltEval, highAltAdvice, 'es');
  const pressureCard = pres.parameters.find(p => p.key === 'airPressure')!;
  assert.match(pressureCard.control, /0,0585 kPa\/°C/);
  assert.match(pressureCard.control, /m s\. n\. m\./);
  assert.match(pres.parameters.find(p => p.key === 'vwc')!.control, /±2,0 %/);
  assert.match(pres.parameters.find(p => p.key === 'ph')!.control, /±0,3 pH/);

  // 3) Reglas metrológicas (VWC < 5 %, pH fuera de 3,0–9,0, T suelo < 0 °C):
  const metrologicalReading = { ...raw, vwc: 3.5, ph: 9.3, temp: -1 };
  const metEval = evaluateReadingForStage(metrologicalReading, 'vegetativo', 'es', { capturedAt, evaluatedAt }, 'sp.tomate');
  const metAdvice = buildContextualAdvice('vegetativo', metEval, metrologicalReading, null, 'es', undefined, 'sp.tomate');
  assert.ok(metAdvice.recommendations!.some(r => r.kind === 'evidence' && /contacto electrolítico de pH y CE/.test(r.title)));
  assert.ok(metAdvice.recommendations!.some(r => r.kind === 'evidence' && /rango nominal del electrodo/.test(r.title)));
  assert.ok(metAdvice.recommendations!.some(r => r.kind === 'evidence' && /compensación térmica de CE/.test(r.title)));

  // 4) Vigilancia psicrométrica de helada radiativa (aire 2,5 °C sobre cero pero punto de rocío bajo 0 °C):
  const frostWatchReading = { ...raw, airTemp: 2.5, airHumidity: 55, airPressure: 890 };
  const fwEval = evaluateReadingForStage(frostWatchReading, 'floracion', 'es', { capturedAt, evaluatedAt }, 'sp.cerezo');
  const fwAdvice = buildContextualAdvice('floracion', fwEval, frostWatchReading, null, 'es', undefined, 'sp.cerezo');
  const fwRec = fwAdvice.recommendations!.find(r => /helada radiativa/.test(r.title))!;
  assert.ok(fwRec, 'Debe emitir vigilancia psicrométrica cuando el punto de rocío es <= 0 °C con aire entre 0 y 4 °C');
  assert.match(fwRec.detail!, /890 hPa/);

  // 5) Desacople térmico raíz-follaje (suelo 10 °C <= 12 °C y aire 26 °C >= 24 °C, diferencia -16 °C <= -12 °C):
  const decouplingReading = { ...raw, temp: 10, airTemp: 26, airHumidity: 50 };
  const decEval = evaluateReadingForStage(decouplingReading, 'vegetativo', 'es', { capturedAt, evaluatedAt }, 'sp.tomate');
  const decAdvice = buildContextualAdvice('vegetativo', decEval, decouplingReading, null, 'es', undefined, 'sp.tomate');
  assert.ok(decAdvice.recommendations!.some(r => r.kind === 'monitoring' && /desacople térmico/.test(r.title)));
});


