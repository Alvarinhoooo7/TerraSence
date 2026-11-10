import { applicableAlerts } from './measurementPresentation';
import { evaluatePrePlantingOptions, suggestPrePlantingCrops, type PrePlantingOption } from './prePlanting';
// Trazabilidad de cultivos sugeridos en pre_siembra: `suggestPrePlantingCrops`.
import type { StageAwareEvaluation } from './stageEvaluator';
import type { PhenologicalStage } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import type { CurrentWeather } from '../services/weatherService';
import type { AppLanguage } from '../types/preferences';
import { GENERAL_WEATHER_RISK, generalRisksOfDay, isRainingNow, isRainyDay, weatherKind } from './weatherOutlook';
import { coveredGeneralWeatherRisks, evaluateSpeciesWeather, hasLocalAirCriteria, type SpeciesWeatherInput } from './speciesRules';
import { assessWeatherEvidence, type WeatherEvaluationContext, type WeatherCoverage } from './evaluationCoverage';
import { assessProbeMetrologicalContext, dewPointC } from './localPhysics';

export type RecommendationKind = 'soil' | 'evidence' | 'weather' | 'irrigation' | 'monitoring';
export type RecommendationTiming = 'now' | 'today' | 'next_days' | 'next_reading';

/**
 * Una recomendación del plan: tema, urgencia, cuándo aplica, título breve y explicación.
 * `body` va en lenguaje simple para el agricultor; `detail`, si existe, guarda las cifras,
 * la fuente y las limitaciones que respaldan la recomendación.
 */
export interface Recommendation {
  kind: RecommendationKind;
  priority: 'high' | 'normal';
  when: RecommendationTiming;
  title: string;
  body: string;
  detail?: string;
}

export interface ContextualAdvice {
  title: string;
  summary: string;
  actions: string[];
  /** Plan ordenado por urgencia. Ausente en diagnósticos guardados antes de existir. */
  recommendations?: Recommendation[];
  weatherNote: string;
  suggestedCrops: string[];
  /** Ficha de razones y limitaciones por alternativa en pre-siembra (§12.2); ausente en históricos antiguos. */
  cropOptions?: PrePlantingOption[];
  mapEligible: boolean;
  weatherCoverage?: WeatherCoverage;
}

// Formato propio y no `toLocaleDateString`: Hermes y Node no dan el mismo texto para «es-CL».
const WEEKDAYS = { es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const MONTHS = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Día del pronóstico (AAAA-MM-DD, fecha local del campo) para leer: «dom 4 oct» / «Sun Oct 4». */
export function forecastDayLabel(date: string, language: AppLanguage = 'es'): string {
  const day = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(day.getTime())) return date;
  const weekday = WEEKDAYS[language][day.getUTCDay()];
  const month = MONTHS[language][day.getUTCMonth()];
  return language === 'en' ? `${weekday} ${month} ${day.getUTCDate()}` : `${weekday} ${day.getUTCDate()} ${month}`;
}

const finiteNumber = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * Déficit de presión de vapor instantáneo (kPa) a partir de la temperatura y humedad relativa
 * medidas por el sensor ambiental del equipo (ecuación de Tetens / FAO 56 ec. 11, C01).
 */
export function computeLocalVpdKpa(airTempC: number | null | undefined, airHumidityPct: number | null | undefined): number | null {
  if (!finiteNumber(airTempC) || !finiteNumber(airHumidityPct)) return null;
  if (airTempC < -20 || airTempC > 60 || airHumidityPct < 0 || airHumidityPct > 100) return null;
  const es = 0.6108 * Math.exp((17.27 * airTempC) / (airTempC + 237.3));
  const ea = es * (airHumidityPct / 100);
  return Math.round(Math.max(0, es - ea) * 100) / 100;
}

/**
 * Mayor racha consecutiva de horas con humedad relativa >= `thresholdPct` en la serie horaria
 * del pronóstico (combinación C09 / VG05 / FL03; sin inferir mojadura foliar ni infección, T33).
 */
export function maxConsecutiveHighHumidityHours(weather: CurrentWeather | null | undefined, thresholdPct = 90): number {
  const rhSeries = weather?.hourly?.relativeHumidityPct;
  if (!Array.isArray(rhSeries) || rhSeries.length === 0) return 0;
  let current = 0;
  let maxStreak = 0;
  for (const rh of rhSeries) {
    if (finiteNumber(rh) && rh >= thresholdPct) {
      current += 1;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

/** Hoy y los días siguientes en la forma que comparan los criterios climáticos de la especie. */
function pickSpeciesWeather(weather: CurrentWeather, dayLabel: (date: string) => string): SpeciesWeatherInput {
  const days = [...(weather.today ? [weather.today] : []), ...weather.forecast];
  return {
    days: days.map(day => ({
      date: day.date,
      label: dayLabel(day.date),
      isToday: day === weather.today,
      minimumTemperatureC: finiteNumber(day.minimumTemperatureC) ? day.minimumTemperatureC : null,
      maximumTemperatureC: finiteNumber(day.maximumTemperatureC) ? day.maximumTemperatureC : null,
      rainy: finiteNumber(day.precipitationMm) || finiteNumber(day.rainProbabilityPct) ? isRainyDay(day) : null,
      fog: day.weatherCode == null ? null : weatherKind(day.weatherCode) === 'fog',
    })),
    ...(weather.hourly ? { hours: weather.hourly.time.map((time, index) => ({ time, temperatureC: weather.hourly!.temperatureC[index] ?? null })) } : {}),
    rainingNow: isRainingNow(weather),
    fogNow: weatherKind(weather.weatherCode) === 'fog',
  };
}

const TIMING_ORDER: Record<RecommendationTiming, number> = { now: 0, today: 1, next_days: 2, next_reading: 3 };

/** Lluvia que reemplaza un riego: 5 mm o más hoy o mañana. */
const RAIN_INSTEAD_OF_IRRIGATION_MM = 5;

export function buildContextualAdvice(
  stage: PhenologicalStage,
  evaluation: StageAwareEvaluation,
  reading: SoilMeasurement,
  weather: CurrentWeather | null,
  language: AppLanguage = 'es',
  weatherContext?: WeatherEvaluationContext,
  speciesId?: string | null,
): ContextualAdvice {
  const en = language === 'en';
  const weatherCoverage = evaluation.coverage ? assessWeatherEvidence(weather, weatherContext) : undefined;
  if (weatherCoverage && weatherCoverage.status === 'not_evaluated') weather = null;
  const alerts = applicableAlerts(evaluation);
  // Plan de recomendaciones: cada una dice de qué trata, cuándo aplica y por qué. Quien
  // decide es el agricultor; el texto sugiere y explica, no ordena.
  const plan: Recommendation[] = [];
  const seen = new Set<string>();
  const notes: Recommendation[] = [];
  // Fusión de alertas del mismo objetivo (§9.2): si una alerta general y una de especie
  // advierten sobre el mismo parámetro del suelo (p. ej. GEN-PH-01 y species:<id>:ph),
  // se emite una sola recomendación con el texto específico del cultivo y ambas razones en `detail`.
  const generalSoilByParam = new Map<string, typeof alerts[number]>();
  const actionableSpeciesParams = new Set(
    alerts.filter(a => a.origin === 'species' && a.type !== 'info' && a.param !== 'airTemp').map(a => a.param),
  );
  for (const alert of alerts) {
    if (!alert.origin && alert.type !== 'info' && alert.param !== 'airTemp' && actionableSpeciesParams.has(alert.param)) {
      generalSoilByParam.set(alert.param, alert);
    }
  }
  for (const alert of alerts) {
    if (!alert.origin && generalSoilByParam.has(alert.param)) continue;
    const fusedGeneral = alert.origin === 'species' && alert.type !== 'info' ? generalSoilByParam.get(alert.param) : undefined;
    // La razón general se rotula, para que no se lea como parte de la fuente de la especie,
    // que cierra su propio detalle con «(Fuente: …)».
    const fusedDetail = [
      alert.detail,
      fusedGeneral ? `${en ? 'General rule' : 'Regla general'}: ${fusedGeneral.title} ${fusedGeneral.action}` : undefined,
    ].filter(Boolean).join(' ');
    const effectivePriority = alert.type === 'danger' || fusedGeneral?.type === 'danger' ? 'high' : 'normal';
    if (seen.has(alert.action)) continue;
    seen.add(alert.action);
    // Una nota informativa (p. ej. pH dentro del óptimo de la especie) no pide actuar hoy:
    // va como seguimiento, después de lo que sí requiere revisión.
    const detail = fusedDetail ? { detail: fusedDetail } : {};
    if (alert.type === 'info') notes.push({ kind: 'monitoring', priority: 'normal', when: 'next_reading', title: alert.title, body: alert.action, ...detail });
    // El frío medido por el equipo en el aire es clima de este momento, no una condición del suelo.
    else if (alert.param === 'airTemp') plan.push({ kind: 'weather', priority: effectivePriority, when: 'now', title: alert.title, body: alert.action, ...detail });
    else plan.push({ kind: 'soil', priority: effectivePriority, when: 'today', title: alert.title, body: alert.action, ...detail });
  }
  if (!plan.length) plan.push(evaluation.state === 'insufficient_data'
    ? { kind: 'evidence', priority: 'normal', when: 'next_reading',
      title: en ? 'Use this reading as a reference' : 'Toma esta lectura como referencia',
      body: en ? 'With this data we cannot give a complete diagnosis of the soil. Use it to compare with your next readings.'
        : 'Con estos datos no podemos darte un diagnóstico completo del suelo. Úsala para comparar con tus próximas mediciones.',
      detail: en ? 'Partial assessment: pH comparisons are indicative; probe conductivity cannot classify salinity without a compatible method; nutrient registers do not determine fertilization.'
        : 'Evaluación parcial: las comparaciones de pH son orientativas; la conductividad de la sonda no permite clasificar salinidad sin un método compatible; los valores de nutrientes no determinan fertilización.' }
    : evaluation.verdict === 'GREEN'
      ? { kind: 'monitoring', priority: 'normal', when: 'next_reading',
        title: en ? 'Nothing to correct for now' : 'Nada que corregir por ahora',
        body: en ? 'We see nothing to correct with this data. Keep watching the crop and measure other spots to compare.'
          : 'Con estos datos no vemos nada que corregir. Sigue observando el cultivo y mide en otros puntos para comparar.' }
      : { kind: 'soil', priority: 'normal', when: 'today',
        title: en ? 'Check what is highlighted' : 'Revisa lo que aparece destacado',
        body: en ? 'Some conditions are worth checking. Before making changes, confirm them in the field or with your advisor.'
          : 'Hay condiciones que conviene revisar. Antes de hacer cambios, confírmalas en terreno o con tu asesor.' });
  plan.push(...notes);

  // Hoy cuenta como el primer día: si llueve hoy, también importa para regar o entrar al campo.
  const today = weather?.today ?? null;
  const upcoming = weather ? [...(today ? [today] : []), ...weather.forecast] : [];
  const dayLabel = (date: string) => today && date === today.date ? (en ? 'today' : 'hoy') : forecastDayLabel(date, language);

  // Criterios climáticos de la especie indicada (TASK ES6): helada, frío, calor, lluvia o
  // niebla que su fuente documenta para la etapa. Sin pronóstico vigente quedan sin evaluar
  // y así se dice; nunca se dan por favorables.
  const speciesWeatherInput = weather ? pickSpeciesWeather(weather, dayLabel) : null;
  const speciesWeather = evaluateSpeciesWeather(speciesId, stage, speciesWeatherInput, language);
  const coveredWeatherRisks = coveredGeneralWeatherRisks(speciesId, stage, speciesWeatherInput, GENERAL_WEATHER_RISK.frostAtOrBelowC);
  for (const finding of speciesWeather.findings) plan.push({ kind: 'weather', priority: finding.type === 'danger' ? 'high' : 'normal',
    when: finding.when, title: finding.title, body: finding.body, detail: finding.detail });
  // Revisado y sin episodios: se dice, para que la ausencia de avisos no parezca un criterio omitido.
  if (speciesWeather.evaluated && !speciesWeather.findings.length) plan.push({ kind: 'monitoring', priority: 'normal', when: 'next_days',
    title: en ? 'No weather risks for this crop' : 'Clima sin riesgos para este cultivo',
    body: en ? 'No frost, heat, rain or fog that could harm this crop at this stage is expected in the coming days. It is a forecast: still check the field.'
      : 'En los próximos días no se esperan heladas, calor, lluvia ni niebla que dañen a este cultivo en esta etapa. Es un pronóstico: igual revisa el campo.',
    detail: en ? 'The forecast was compared with the frost, heat, rain or fog that the sources document for this species at this stage.'
      : 'Se comparó el pronóstico con la helada, el calor, la lluvia o la niebla que las fuentes documentan para esta especie en esta etapa.' });
  // Sin pronóstico, el frío de este momento sí se revisó con el aire que midió el equipo
  // (speciesRules.ts, `localAirImplies`); los días siguientes, no.
  const localAirChecked = hasLocalAirCriteria(speciesId, stage) && typeof reading.airTemp === 'number' && Number.isFinite(reading.airTemp)
    && evaluation.coverage?.freshness === 'fresh';
  if (speciesWeather.applicable && !speciesWeather.evaluated) plan.push({ kind: 'evidence', priority: 'normal', when: 'next_reading',
    title: en ? 'We could not check the weather for this crop' : 'No pudimos revisar el clima para este cultivo',
    body: localAirChecked
      ? (en ? 'Without an up-to-date forecast we do not know whether frost, heat or rain is coming for this crop. We only checked the cold with the air temperature the device measures now. Measure again with an internet connection.'
        : 'Sin un pronóstico actualizado no sabemos si vienen heladas, calor o lluvia para este cultivo. Sólo revisamos el frío con la temperatura del aire que mide el equipo ahora. Vuelve a medir con conexión a internet.')
      : (en ? 'Without an up-to-date forecast we could not check frost, heat or rain for this crop. Measure again with an internet connection.'
        : 'Sin un pronóstico actualizado no revisamos heladas, calor ni lluvia para este cultivo. Vuelve a medir con conexión a internet.') });

  if (weather && isRainingNow(weather)) plan.push({ kind: 'weather', priority: 'high', when: 'now',
    title: en ? 'It is raining now' : 'Está lloviendo ahora',
    body: en ? 'Soil moisture may change over the next hours. If you are deciding on irrigation or field work, measure again once the rain stops.'
      : 'La humedad del suelo puede cambiar en las próximas horas. Si vas a decidir riego o labores, vuelve a medir cuando pare la lluvia.' });

  // La humedad bajo el umbral de riego pide regar, pero si llueve pronto ese riego sobra.
  const irrigationAdvised = evaluation.texture !== null && alerts.some(alert => alert.param === 'vwc') && reading.vwc < evaluation.texture.ur;
  const rainSoon = irrigationAdvised
    ? upcoming.slice(0, 2).find(day => (day.precipitationMm ?? 0) >= RAIN_INSTEAD_OF_IRRIGATION_MM)
    : undefined;
  if (rainSoon) {
    const mm = Math.round(rainSoon.precipitationMm ?? 0);
    const isToday = today?.date === rainSoon.date;
    plan.push({ kind: 'irrigation', priority: 'high', when: isToday ? 'today' : 'next_days',
      title: en ? 'Wait for the rain before irrigating' : 'Espera la lluvia antes de regar',
      body: en
        ? `${mm} mm of rain is forecast for ${dayLabel(rainSoon.date)}. If you can, wait for it before irrigating and measure again afterwards.`
        : `Se pronostican ${mm} mm de lluvia para ${isToday ? 'hoy' : `el ${dayLabel(rainSoon.date)}`}. Si puedes, espérala antes de regar y vuelve a medir después.` });
  }

  // Combinación física local C01 + C02 (§6.4): demanda evaporativa alta (DPV >= 2,2 kPa a presión
  // estándar, o >= 2,0 kPa en altitud con P <= 920 hPa donde la menor constante psicrométrica
  // γ = 0,000665·P incrementa la difusividad del vapor; FAO 56 ec. 8 y 11) cruzada con la humedad
  // volumétrica del suelo en vegetativo y floración. Emite a lo sumo una tarjeta combinada (T44).
  const freshCapture = !evaluation.coverage || evaluation.coverage.freshness === 'fresh';
  const metrology = assessProbeMetrologicalContext(reading);
  const highAltitudeBarometry =
    finiteNumber(reading.airPressure) &&
    reading.airPressure <= 920 &&
    metrology.psychrometricConstantKpaPerC !== null &&
    metrology.barometricAltitudeM !== null;
  const vpdIrrigationThreshold = highAltitudeBarometry ? 2.0 : 2.2;
  const vpdMonitoringThreshold = highAltitudeBarometry ? 2.3 : 2.5;
  const hasBarometry =
    finiteNumber(reading.airPressure) &&
    metrology.psychrometricConstantKpaPerC !== null &&
    metrology.barometricAltitudeM !== null;
  const baroDetailEn = hasBarometry
    ? ` Barometric pressure ${reading.airPressure} hPa (approx. ${Math.round(metrology.barometricAltitudeM!)} m elevation, psychrometric constant ${metrology.psychrometricConstantKpaPerC!.toFixed(4)} kPa/°C, FAO 56 eq. 8)${highAltitudeBarometry ? '; reduced atmospheric pressure increases vapor diffusivity' : ''}.`
    : '';
  const baroDetailEs = hasBarometry
    ? ` Presión barométrica ${reading.airPressure} hPa (aprox. ${Math.round(metrology.barometricAltitudeM!)} m s. n. m., constante psicrométrica ${metrology.psychrometricConstantKpaPerC!.toFixed(4).replace('.', ',')} kPa/°C, FAO 56 ec. 8)${highAltitudeBarometry ? '; la menor presión atmosférica incrementa la difusividad del vapor' : ''}.`
    : '';
  if ((stage === 'vegetativo' || stage === 'floracion') && freshCapture && finiteNumber(reading.airHumidity) && reading.airHumidity <= 35) {
    const vpd = computeLocalVpdKpa(reading.airTemp, reading.airHumidity);
    if (vpd !== null && vpd >= vpdIrrigationThreshold) {
      const vpdStr = en ? `${vpd.toFixed(2)} kPa` : `${vpd.toFixed(2).replace('.', ',')} kPa`;
      if (irrigationAdvised || (finiteNumber(reading.vwc) && reading.vwc < 15)) {
        plan.push({
          kind: 'irrigation',
          priority: 'high',
          when: 'now',
          title: en ? 'High evaporative demand with low soil moisture' : 'Alta demanda atmosférica con suelo seco',
          body: en
            ? `Instantaneous vapor pressure deficit is high (${vpdStr}) and root-zone moisture is low (${reading.vwc}%). Prioritize irrigation to avoid water stress.`
            : `El déficit de presión de vapor instantáneo es alto (${vpdStr}) y la humedad en zona radicular es baja (${reading.vwc} %). Prioriza el riego para evitar estrés hídrico.`,
          detail: en
            ? `Combined local rule C01 + C02 (FAO 56 eq. 11): VPD ${vpdStr} from local air (${reading.airTemp} °C, ${reading.airHumidity}% RH) + soil VWC ${reading.vwc}%.${baroDetailEn}`
            : `Combinación física local C01 + C02 (FAO 56 ec. 11): DPV ${vpdStr} con aire local (${reading.airTemp} °C, ${reading.airHumidity} % HR) + humedad volumétrica del suelo ${reading.vwc} %.${baroDetailEs}`,
        });
      } else if (vpd >= vpdMonitoringThreshold) {
        plan.push({
          kind: 'monitoring',
          priority: 'normal',
          when: 'today',
          title: en ? 'High atmospheric demand (VPD)' : 'Alta demanda evaporativa del aire (DPV)',
          body: en
            ? `The air around the crop is very dry (VPD ${vpdStr}), increasing transpiration even with adequate soil moisture. Recheck soil moisture after peak heat.`
            : `El aire en el cultivo está muy seco (DPV ${vpdStr}), lo que acelera la transpiración aunque el suelo tenga humedad. Vuelve a medir tras las horas de mayor calor.`,
          detail: en
            ? `Combined local rule C01 + C02 (FAO 56 eq. 11): VPD ${vpdStr} from local air (${reading.airTemp} °C, ${reading.airHumidity}% RH) with current soil VWC ${reading.vwc}%.${baroDetailEn}`
            : `Combinación física local C01 + C02 (FAO 56 ec. 11): DPV ${vpdStr} con aire local (${reading.airTemp} °C, ${reading.airHumidity} % HR) y humedad volumétrica actual de ${reading.vwc} %.${baroDetailEs}`,
        });
      }
    }
  }

  // Reglas metrológicas físicas del transductor CWT-Soil-NPKPHCTH-S:
  // 1) Bajo 5 % VWC la película de agua es discontinua y degrada el puente iónico de pH y CE.
  if (freshCapture && metrology.flags.includes('low_moisture_electrolyte_contact')) {
    plan.push({
      kind: 'evidence',
      priority: 'high',
      when: 'now',
      title: en
        ? 'Dry soil limits galvanic pH and bulk EC contact'
        : 'Suelo muy seco limita el contacto electrolítico de pH y CE',
      body: en
        ? `Volumetric moisture is ${reading.vwc}% (< 5%). Below 5% VWC, the water film between the probe prongs is discontinuous and pH or bulk EC readings may drift. Irrigate or measure in a moist root zone before correcting pH or salinity.`
        : `La humedad volumétrica es ${reading.vwc} % (< 5 %). Bajo 5 % de humedad volumétrica, la película de agua entre los vástagos de la sonda se vuelve discontinua y el pH o la CE aparente pueden desviarse. Riega o mide en zona húmeda antes de corregir pH o salinidad.`,
      detail: en
        ? `Metrological rule (CWT-Soil-NPKPHCTH-S): galvanic pH and bulk EC require >= 5% VWC for a continuous ionic bridge (measured: ${reading.vwc}%).`
        : `Regla metrológica (CWT-Soil-NPKPHCTH-S): el pH galvánico y la CE a granel requieren >= 5 % de humedad volumétrica para sostener el puente iónico (medido: ${reading.vwc} %).`,
    });
  }
  // 2) pH fuera de la ventana nominal de calibración 3,0–9,0 pH del electrodo metálico.
  if (freshCapture && metrology.flags.includes('ph_outside_electrode_nominal_range')) {
    plan.push({
      kind: 'evidence',
      priority: 'normal',
      when: 'today',
      title: en
        ? 'Soil pH outside probe nominal range (3.0 to 9.0)'
        : 'pH fuera del rango nominal del electrodo (3,0 a 9,0)',
      body: en
        ? `Measured pH (${reading.ph}) is outside the nominal 3.0 to 9.0 pH calibration window of the probe. Confirm with a laboratory paste or suspension pH test before applying amendments.`
        : `El pH medido (${reading.ph}) está fuera de la ventana nominal de calibración de la sonda (3,0 a 9,0 pH). Confirma con un análisis de pH en pasta o suspensión en laboratorio antes de aplicar enmiendas.`,
      detail: en
        ? `Metrological rule (CWT-Soil-NPKPHCTH-S): nominal pH range 3.0 to 9.0 pH (+/-0.3 pH); reading ${reading.ph} is at the extreme of the transducer.`
        : `Regla metrológica (CWT-Soil-NPKPHCTH-S): rango nominal de pH 3,0 a 9,0 pH (±0,3 pH); la lectura ${reading.ph} se encuentra en el extremo del transductor.`,
    });
  }
  // 3) Temperatura de suelo fuera de la ventana 0–50 °C de compensación térmica automática de CE.
  if (freshCapture && metrology.flags.includes('ec_outside_thermal_compensation_window')) {
    plan.push({
      kind: 'evidence',
      priority: 'normal',
      when: 'today',
      title: en
        ? 'Soil temperature outside EC thermal compensation window'
        : 'Temperatura del suelo fuera de la compensación térmica de CE',
      body: en
        ? `Soil temperature (${reading.temp} °C) is outside the 0 to 50 °C automatic thermal compensation window of the conductivity circuit. Repeat the reading when the soil is above 0 °C.`
        : `La temperatura del suelo (${reading.temp} °C) está fuera de la ventana de compensación térmica automática (0 a 50 °C) del circuito de conductividad. Repite la lectura cuando el suelo supere 0 °C.`,
      detail: en
        ? `Metrological rule (CWT-Soil-NPKPHCTH-S): automatic EC thermal compensation operates from 0 to 50 °C (measured: ${reading.temp} °C).`
        : `Regla metrológica (CWT-Soil-NPKPHCTH-S): la compensación térmica automática de CE opera entre 0 y 50 °C (medido: ${reading.temp} °C).`,
    });
  }

  // Vigilancia psicrométrica de enfriamiento radiativo: aire frío sobre cero (0 < T <= 4,0 °C)
  // con punto de rocío <= 0 °C (poca humedad absoluta para liberar calor latente al condensar).
  if (
    freshCapture &&
    finiteNumber(reading.airTemp) &&
    reading.airTemp > 0 &&
    reading.airTemp <= 4.0 &&
    finiteNumber(reading.airHumidity) &&
    reading.airHumidity > 0 &&
    reading.airHumidity <= 100
  ) {
    const dp = dewPointC(reading.airTemp, reading.airHumidity);
    if (dp !== null && dp <= 0) {
      const dpStr = en ? `${dp.toFixed(1)} °C` : `${dp.toFixed(1).replace('.', ',')} °C`;
      const spreadStr = en
        ? `${(reading.airTemp - dp).toFixed(1)} °C`
        : `${(reading.airTemp - dp).toFixed(1).replace('.', ',')} °C`;
      plan.push({
        kind: 'weather',
        priority: 'high',
        when: 'today',
        title: en
          ? 'Cold air with subzero dew point: radiative frost watch'
          : 'Aire frío con punto de rocío bajo cero: vigilancia de helada radiativa',
        body: en
          ? `Air temperature is ${reading.airTemp} °C and the approximate dew point is ${dpStr}. With little water vapor to release latent heat, clear-sky radiative cooling can drop temperatures below 0 °C rapidly. Monitor night temperatures closely.`
          : `La temperatura del aire es ${reading.airTemp} °C y el punto de rocío aproximado es ${dpStr}. Con poco vapor de agua para liberar calor latente al condensar, el enfriamiento nocturno puede bajar rápido de 0 °C. Vigila de cerca la mínima en el campo.`,
        detail: en
          ? `Local psychrometric rule (Magnus formula): air ${reading.airTemp} °C, ${reading.airHumidity}% RH, dew point ${dpStr} (spread ${spreadStr}).${baroDetailEn}`
          : `Regla psicrométrica local (fórmula de Magnus): aire ${reading.airTemp} °C, ${reading.airHumidity} % HR, punto de rocío ${dpStr} (distancia al rocío ${spreadStr}).${baroDetailEs}`,
      });
    }
  }

  // Desacople térmico raíz-follaje (`soil_air_difference`): suelo frío (<= 12 °C) bajo aire cálido
  // (>= 24 °C) en vegetativo o floración. Las dos cotas absolutas son la condición completa: con
  // aire sobre 24 °C y suelo bajo 12 °C el gradiente ya es de -12 °C o más, así que exigirlo aparte
  // no agrega nada. El gradiente se informa como medición, no como umbral.
  if (
    (stage === 'vegetativo' || stage === 'floracion') &&
    freshCapture &&
    finiteNumber(reading.temp) &&
    finiteNumber(reading.airTemp) &&
    reading.airTemp >= 24 &&
    reading.temp <= 12
  ) {
    const diff = Math.round((reading.temp - reading.airTemp) * 10) / 10;
    const diffStr = en ? `${diff.toFixed(1)} °C` : `${diff.toFixed(1).replace('.', ',')} °C`;
    plan.push({
      kind: 'monitoring',
      priority: 'normal',
      when: 'today',
      title: en
        ? 'Cold root zone under warm air (thermal decoupling)'
        : 'Suelo frío bajo aire cálido (desacople térmico raíz-follaje)',
      body: en
        ? `Soil temperature (${reading.temp} °C) is much colder than the air (${reading.airTemp} °C, difference ${diffStr}). Warm air drives canopy transpiration while cold roots absorb water and phosphorus slowly; avoid cold-water irrigation spikes and monitor wilting at midday.`
        : `La temperatura del suelo (${reading.temp} °C) es mucho más fría que la del aire (${reading.airTemp} °C, diferencia ${diffStr}). El aire cálido exige transpiración al follaje mientras la raíz fría absorbe agua y fósforo con lentitud; evita riegos bruscos con agua fría y vigila decaimiento al mediodía.`,
      detail: en
        ? `Local thermal difference rule (soil_air_difference): triggered by soil <= 12 °C with air >= 24 °C. Measured gradient: soil ${reading.temp} °C minus air ${reading.airTemp} °C = ${diffStr}.`
        : `Regla de gradiente térmico local (soil_air_difference): se activa con suelo <= 12 °C y aire >= 24 °C. Gradiente medido: suelo ${reading.temp} °C menos aire ${reading.airTemp} °C = ${diffStr}.`,
    });
  }

  // Combinación horaria C09 / VG05 / FL03 (§6.4): persistencia de humedad relativa >= 90 % en la
  // serie horaria del pronóstico (>= 12 h seguidas), sin afirmar mojadura foliar ni diagnosticar infección (T33).
  if (stage === 'vegetativo' || stage === 'floracion') {
    const highRhHours = maxConsecutiveHighHumidityHours(weather, 90);
    if (highRhHours >= 12) {
      plan.push({
        kind: 'weather',
        priority: 'normal',
        when: 'next_days',
        title: en ? 'Extended period of high air humidity forecast' : 'Periodo prolongado de alta humedad del aire previsto',
        body: en
          ? `The hourly forecast shows ${highRhHours} consecutive hours with relative humidity at or above 90%. Check canopy ventilation and inspect the crop in the field.`
          : `El pronóstico horario prevé ${highRhHours} horas seguidas con humedad relativa igual o superior a 90 %. Revisa la ventilación del follaje e inspecciona el cultivo en el campo.`,
        detail: en
          ? `Hourly weather rule C09 (${highRhHours} consecutive hours >= 90% RH). Relative humidity is an indirect atmospheric indicator and does not measure leaf wetness.`
          : `Regla climática horaria C09 (${highRhHours} h consecutivas con HR >= 90 %). La humedad relativa del aire es un indicador atmosférico indirecto y no mide mojadura foliar.`,
      });
    }
  }

  const riskyDays = upcoming.filter(day => generalRisksOfDay(day).length > 0);
  // Un día sólo se da por cubierto si un criterio de la especie advierte ese mismo día cada uno
  // de sus riesgos generales; si no, la tarjeta general se emite con su fecha (§9.2).
  const uncoveredRiskyDays = riskyDays.filter(day => {
    const covered = coveredWeatherRisks.get(day.date);
    return generalRisksOfDay(day).some(risk => !covered?.has(risk));
  });
  if (riskyDays.length > uncoveredRiskyDays.length) {
    const schedulingReason = en
      ? 'General weather rule: review task dates and confirm conditions before entering the field.'
      : 'Regla climática general: revisa la fecha de las labores y confirma las condiciones antes de ingresar al campo.';
    // La razón general se adjunta a los avisos de clima que la absorbieron; si ninguno trae
    // detalle, se le crea, para que la regla nunca desaparezca sin dejar rastro.
    for (const item of plan) {
      if (item.kind !== 'weather' || item.when === 'now') continue;
      item.detail = item.detail ? `${item.detail} ${schedulingReason}` : schedulingReason;
    }
  }
  if (uncoveredRiskyDays.length) {
    const dates = uncoveredRiskyDays.map(day => dayLabel(day.date)).join(', ');
    plan.push({ kind: 'weather', priority: 'normal', when: uncoveredRiskyDays[0].date === today?.date ? 'today' : 'next_days',
      title: en ? 'Plan field work around the weather' : 'Programa las labores según el clima',
      body: en
        ? `Review the date of the task because of forecast rain, frost or heat: ${dates}. Confirm conditions before entering the field.`
        : `Revisa la fecha de la labor por lluvia, helada o calor previstos: ${dates}. Confirma las condiciones antes de ingresar al campo.` });
  }
  const actions = plan.map(item => item.body);
  plan.push({ kind: 'monitoring', priority: 'normal', when: 'next_reading',
    title: en ? 'Measure again to compare' : 'Vuelve a medir para comparar',
    body: en ? 'Measure representative points and repeat after each management change; the trend says more than a single reading.'
      : 'Mide puntos representativos y repite después de cada cambio de manejo: la tendencia dice más que una sola lectura.' });
  // Lo urgente primero y, dentro de cada prioridad, lo más próximo (§9.2); a igual urgencia y
  // momento se conserva el orden en que se armó. Nunca depende del orden del catálogo.
  const rank = (item: Recommendation) => (item.priority === 'high' ? 0 : 4) + TIMING_ORDER[item.when];
  const recommendations = plan.map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map(({ item }) => item);

  const completeForecast = weather?.forecast.length === 5 && weather.forecast.every(day =>
    [day.precipitationMm, day.rainProbabilityPct, day.minimumTemperatureC, day.maximumTemperatureC]
      .every(value => typeof value === 'number' && Number.isFinite(value)));
  const incompleteNote = en
    ? 'Incomplete forecast: data is missing to evaluate all of the next five days.'
    : 'Pronóstico incompleto: faltan datos para evaluar todos los próximos cinco días.';
  const weatherNote = weatherCoverage?.limitationCodes.includes('weather_time_stale')
    ? (en ? 'Old forecast: it is not used to schedule tasks. Request updated weather.' : 'Pronóstico antiguo: no se usa para programar labores. Consulta clima actualizado.')
    : weatherCoverage?.status === 'not_evaluated' && weatherCoverage.limitationCodes.some(code => code !== 'weather_missing')
      ? (en ? 'Forecast not evaluated: its location, capture or time could not be verified.' : 'Pronóstico no evaluado: no se pudo verificar su ubicación, captura o vigencia.')
    : !weather
    ? (en ? 'Forecast unavailable. The recommendation uses only the local reading.' : 'Pronóstico no disponible. La recomendación usa sólo la lectura local.')
    : riskyDays.length
      ? `${en ? 'Review the date of the task: ' : 'Revisar la fecha de la labor: '}${riskyDays.map(day => {
          const risks = [
            (day.precipitationMm ?? 0) >= 5 || (day.rainProbabilityPct ?? 0) >= 60 ? (en ? 'rain' : 'lluvia') : null,
            day.minimumTemperatureC != null && day.minimumTemperatureC <= 0 ? (en ? 'frost' : 'helada') : null,
            day.maximumTemperatureC != null && day.maximumTemperatureC >= 35 ? (en ? 'heat' : 'calor') : null,
          ].filter(Boolean);
          return `${dayLabel(day.date)} (${risks.join(', ')})`;
        }).join('; ')}. ${en ? 'Indicative thresholds; confirm conditions in the field.' : 'Umbrales orientativos; confirmar las condiciones en terreno.'}${completeForecast ? '' : ` ${incompleteNote}`}`
      : completeForecast
        ? (en ? 'No rain, frost or heat alerts under these indicative rules for the next five days.' : 'Sin alertas de lluvia, helada o calor bajo estas reglas orientativas para los próximos cinco días.')
        : incompleteNote;

  // Un pronóstico reutilizado sin red lo dice primero: no es una descarga de este momento.
  const reusedNote = weather?.reuse
    ? (en ? 'Offline: forecast saved earlier near this point. ' : 'Sin conexión: pronóstico guardado antes cerca de este punto. ') : '';

  const cropOptions = stage === 'pre_siembra' && (!evaluation.coverage || evaluation.coverage.freshness === 'fresh')
    ? evaluatePrePlantingOptions(reading, language, undefined, weather)
    : [];
  const suggestedCrops = stage === 'pre_siembra' && (!evaluation.coverage || evaluation.coverage.freshness === 'fresh')
    ? suggestPrePlantingCrops(reading, language, weather)
    // En pre_siembra no se pide especie al agricultor: el motor recomienda cultivos compatibles.
    : [];

  const copyEs: Record<PhenologicalStage, { title: string; summary: string }> = {
    pre_siembra: {
      title: 'Prepara el suelo antes de sembrar',
      summary: 'La temperatura y el pH permiten explorar coincidencias parciales del catálogo. El método de pH limita su comparación y la conductividad queda fuera hasta acreditar un método compatible.',
    },
    vegetativo: {
      title: 'Protege el crecimiento activo',
      summary: 'Ajusta agua y nutrición sin sobrefertilizar. Observa la tendencia del cultivo y vuelve a medir después de cada corrección.',
    },
    floracion: {
      title: 'Reduce el estrés durante floración',
      summary: 'En esta fase la falta de agua y el exceso de sales tienen mayor impacto. Evita cambios bruscos de manejo.',
    },
    cosecha: {
      title: 'Planifica una cosecha segura',
      summary: 'Evalúa transitabilidad, humedad y riesgo de compactación antes de ingresar maquinaria.',
    },
  };
  const copyEn: Record<PhenologicalStage, { title: string; summary: string }> = {
    pre_siembra: {
      title: 'Prepare the soil before planting',
      summary: 'Temperature and pH allow partial catalog matches. The pH method limits comparison, and conductivity is excluded until a compatible method is established.',
    },
    vegetativo: {
      title: 'Protect active growth',
      summary: 'Adjust water and nutrition without over-fertilizing. Watch the crop trend and measure again after each correction.',
    },
    floracion: {
      title: 'Reduce stress during flowering',
      summary: 'At this stage water shortage and excess salts have the greatest impact. Avoid abrupt management changes.',
    },
    cosecha: {
      title: 'Plan a safe harvest',
      summary: 'Assess trafficability, moisture and compaction risk before bringing in machinery.',
    },
  };
  const copy = en ? copyEn : copyEs;

  return {
    ...copy[stage],
    ...(evaluation.coverage ? { summary: evaluation.verdictSummary } : {}),
    actions,
    recommendations,
    weatherNote: `${reusedNote}${weatherNote}`,
    suggestedCrops,
    ...(stage === 'pre_siembra' ? { cropOptions } : {}),
    mapEligible: stage === 'pre_siembra',
    ...(weatherCoverage ? { weatherCoverage } : {}),
  };
}
