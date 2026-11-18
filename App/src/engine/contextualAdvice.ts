import { applicableAlerts, PARAMETER_KEYS, type ParameterKey } from './measurementPresentation';
import { personalizeHeadline } from './headlinePersonalization';
import { evaluatePrePlantingOptions, type PrePlantingOption } from './prePlanting';
import type { StageAwareEvaluation } from './stageEvaluator';
import type { PhenologicalStage } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import type { CurrentWeather } from '../services/weatherService';
import type { AppLanguage } from '../types/preferences';
import { GENERAL_WEATHER_RISK, generalRisksOfDay, isRainingNow, isRainyDay, weatherKind, type GeneralWeatherRisk } from './weatherOutlook';
import { coveredGeneralWeatherRisks, evaluateSpeciesWeather, hasLocalAirCriteria, SPECIES_RULES_VERSION, type SpeciesWeatherInput } from './speciesRules';
import { assessWeatherEvidence, evidenceFreshness, EVIDENCE_POLICY, type WeatherEvaluationContext, type WeatherCoverage } from './evaluationCoverage';
import { assessProbeMetrologicalContext, dewPointC } from './localPhysics';
import { LOCAL_VARIABLES } from './inputQuality';

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
  /** Titular corto en imperativo para la lista del plan; si falta se usa `title`. */
  headline?: string;
  body: string;
  detail?: string;
  /** Variables medidas que sostienen la recomendación; ausente si no sale de una variable. */
  evidence?: ParameterKey[];
  ruleId?: string;
  ruleVersion?: string;
  trace?: { ruleId: string; version: string; inputs: Record<string, number | null>; dates: string[]; sources: string[]; generalRisks?: GeneralWeatherRisk[]; weatherRisks?: { date: string; risk: GeneralWeatherRisk }[] };
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
  speciesWeatherCoverage?: { date: string; risk: string; available: boolean }[];
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
function highHumidityEpisode(weather: CurrentWeather | null | undefined, thresholdPct = 90, from?: string): { hours: number; start: string; end: string } | null {
  const rhSeries = weather?.hourly?.relativeHumidityPct;
  if (!Array.isArray(rhSeries) || rhSeries.length === 0) return null;
  let current = 0;
  let start = '';
  let best: { hours: number; start: string; end: string } | null = null;
  let previous = NaN;
  for (let i = 0; i < rhSeries.length; i++) {
    const rh = rhSeries[i];
    const slot = weather!.hourly!.time[i];
    const time = Date.parse(`${slot}:00Z`);
    if (!Number.isFinite(time) || time - previous !== 3600000) current = 0;
    if (Number.isFinite(time) && (!from || slot >= from) && finiteNumber(rh) && rh >= thresholdPct) {
      if (!current) start = slot;
      current += 1;
      if (!best || current > best.hours) best = { hours: current, start, end: slot };
    } else {
      current = 0;
    }
    previous = time;
  }
  return best;
}

export function maxConsecutiveHighHumidityHours(weather: CurrentWeather | null | undefined, thresholdPct = 90): number {
  return highHumidityEpisode(weather, thresholdPct)?.hours ?? 0;
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

/**
 * Variables medidas que sostienen una recomendación. N, P y K nunca van: son valores de
 * referencia y no gatillan ninguna acción.
 */
const NUTRIENT_KEYS: readonly string[] = ['nitrogen', 'phosphorus', 'potassium'];
const evidenceOf = (...keys: string[]): { evidence: ParameterKey[] } | Record<string, never> => {
  const evidence = keys.filter((key): key is ParameterKey => (PARAMETER_KEYS as readonly string[]).includes(key) && !NUTRIENT_KEYS.includes(key));
  return evidence.length ? { evidence } : {};
};

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
  if (weather && weatherContext && evidenceFreshness(weather.inputQuality?.current?.temperatureC?.validTo ?? weather.inputQuality?.current?.precipitationMm?.validTo ?? null, weatherContext.evaluatedAt, EVIDENCE_POLICY.weatherMaxAgeMs) !== 'fresh') {
    weather = { ...weather, temperatureC: null, precipitationMm: null, windKmh: null, weatherCode: null };
  }
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
    const detail = { ...(fusedDetail ? { detail: fusedDetail } : {}), ...(alert.headline ? { headline: alert.headline } : {}), ...(alert.ruleId ? { ruleId: alert.ruleId } : {}), ...(alert.ruleVersion ? { ruleVersion: alert.ruleVersion } : {}), ...evidenceOf(alert.param), ...(alert.sources ? { trace: { ruleId: alert.ruleId ?? 'legacy:unversioned', version: alert.ruleVersion ?? 'unknown', inputs: Object.fromEntries([alert.param].filter(key => finiteNumber(reading[key as keyof SoilMeasurement] as number)).map(key => [key, reading[key as keyof SoilMeasurement] as number])), dates: [], sources: alert.sources } } : {}) };
    if (alert.type === 'info') notes.push({ kind: 'monitoring', priority: 'normal', when: 'next_reading', title: alert.title, body: alert.action, ...detail });
    // El frío medido por el equipo en el aire es clima de este momento, no una condición del suelo.
    else if (alert.param === 'airTemp') plan.push({ kind: 'weather', priority: effectivePriority, when: 'now', title: alert.title, body: alert.action, ...detail });
    else plan.push({ kind: 'soil', priority: effectivePriority, when: 'today', title: alert.title, body: alert.action, ...detail });
  }
  if (!plan.length) plan.push(evaluation.state === 'insufficient_data'
    ? { kind: 'evidence', priority: 'normal', when: 'next_reading', ruleId: 'plan:insufficient-data',
      title: en ? 'Use this reading as a reference' : 'Toma esta lectura como referencia',
      headline: en ? 'Use this reading as a reference' : 'Usa esta lectura como referencia',
      body: en ? 'With this data we cannot give a complete diagnosis of the soil. Use it to compare with your next readings.'
        : 'Con estos datos no podemos darte un diagnóstico completo del suelo. Úsala para comparar con tus próximas mediciones.',
      detail: en ? 'Partial assessment: pH comparisons are indicative; probe conductivity cannot classify salinity without a compatible method; nutrient registers do not determine fertilization.'
        : 'Evaluación parcial: las comparaciones de pH son orientativas; la conductividad de la sonda no permite clasificar salinidad sin un método compatible; los valores de nutrientes no determinan fertilización.' }
    : evaluation.verdict === 'GREEN'
      ? { kind: 'monitoring', priority: 'normal', when: 'next_reading', ruleId: 'plan:observe',
        title: en ? 'Nothing to correct for now' : 'Nada que corregir por ahora',
        headline: en ? 'Keep watching the crop' : 'Sigue observando el cultivo',
        body: en ? 'We see nothing to correct with this data. Keep watching the crop and measure other spots to compare.'
          : 'Con estos datos no vemos nada que corregir. Sigue observando el cultivo y mide en otros puntos para comparar.' }
      : { kind: 'soil', priority: 'normal', when: 'today', ruleId: 'plan:review',
        title: en ? 'Check what is highlighted' : 'Revisa lo que aparece destacado',
        headline: en ? 'Check what is highlighted' : 'Revisa lo que aparece destacado',
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
    when: finding.when, title: finding.title, headline: finding.headline, body: finding.body, detail: finding.detail,
    trace: { ruleId: finding.ruleId ?? 'species:weather', version: SPECIES_RULES_VERSION, inputs: finding.inputs ?? {}, dates: finding.dates ?? [], sources: ['Open-Meteo', ...(finding.sources ?? [])], generalRisks: finding.generalRisks ?? [] } });
  // Revisado y sin episodios: se dice, para que la ausencia de avisos no parezca un criterio omitido.
  if (speciesWeather.evaluated && !speciesWeather.findings.length) plan.push({ kind: 'monitoring', priority: 'normal', when: 'next_days', ruleId: 'plan:species-weather-clear',
    trace: { ruleId: 'plan:species-weather-clear', version: 'plan-v2', inputs: {}, dates: [...new Set((speciesWeather.coverage ?? []).filter(item => item.available).map(item => item.date))], sources: ['Open-Meteo'] },
    title: en ? 'No alerts in available forecast data' : 'Sin alertas en los datos disponibles',
    headline: en ? 'Check the forecast again' : 'Revisa el pronóstico nuevamente',
    body: speciesWeather.coverage?.some(item => !item.available)
      ? (en ? 'Some crop weather criteria could not be checked for every date. Confirm the missing conditions.' : 'Faltan datos para revisar todos los criterios climáticos del cultivo en cada fecha. Confirma las condiciones faltantes.')
      : (en ? 'No alerts under the crop criteria checked. Confirm conditions in the field.' : 'No hay alertas en los criterios del cultivo revisados. Confirma las condiciones en terreno.') });
  // Sin pronóstico, el frío de este momento sí se revisó con el aire que midió el equipo
  // (speciesRules.ts, `localAirImplies`); los días siguientes, no.
  const localAirChecked = hasLocalAirCriteria(speciesId, stage) && typeof reading.airTemp === 'number' && Number.isFinite(reading.airTemp)
    && evaluation.coverage?.freshness === 'fresh';
  if (speciesWeather.applicable && !speciesWeather.evaluated) plan.push({ kind: 'evidence', priority: 'normal', when: 'next_reading', ruleId: 'plan:species-weather-missing',
    title: en ? 'We could not check the weather for this crop' : 'No pudimos revisar el clima para este cultivo',
    headline: en ? 'Measure again with internet access' : 'Vuelve a medir con internet',
    body: localAirChecked
      ? (en ? 'Without an up-to-date forecast we do not know whether frost, heat or rain is coming for this crop. We only checked the cold with the air temperature the device measures now. Measure again with an internet connection.'
        : 'Sin un pronóstico actualizado no sabemos si vienen heladas, calor o lluvia para este cultivo. Sólo revisamos el frío con la temperatura del aire que mide el equipo ahora. Vuelve a medir con conexión a internet.')
      : (en ? 'Without an up-to-date forecast we could not check frost, heat or rain for this crop. Measure again with an internet connection.'
        : 'Sin un pronóstico actualizado no revisamos heladas, calor ni lluvia para este cultivo. Vuelve a medir con conexión a internet.') });

  if (weather && isRainingNow(weather)) plan.push({ kind: 'weather', priority: 'high', when: 'now', ruleId: 'plan:rain-now',
    trace: { ruleId: 'plan:rain-now', version: 'plan-v2', inputs: { currentPrecipitationMm: weather.precipitationMm, currentWeatherCode: weather.weatherCode ?? null }, dates: today ? [today.date] : [], sources: ['Open-Meteo'] },
    title: en ? 'It is raining now' : 'Está lloviendo ahora',
    headline: en ? 'Wait for the rain to stop' : 'Espera a que pare la lluvia',
    body: en ? 'Soil moisture may change over the next hours. If you are deciding on irrigation or field work, measure again once the rain stops.'
      : 'La humedad del suelo puede cambiar en las próximas horas. Si vas a decidir riego o labores, vuelve a medir cuando pare la lluvia.' });
  if (weather && weatherKind(weather.weatherCode) === null && (weather.precipitationMm ?? 0) > 0) plan.push({ kind: 'weather', priority: 'normal', when: 'now', ruleId: 'plan:precipitation-now',
    trace: { ruleId: 'plan:precipitation-now', version: 'plan-v2', inputs: { currentPrecipitationMm: weather.precipitationMm, currentWeatherCode: weather.weatherCode ?? null }, dates: today ? [today.date] : [], sources: ['Open-Meteo'] },
    title: en ? 'Precipitation reported' : 'Se registra precipitación',
    headline: en ? 'Check conditions in the field' : 'Revisa las condiciones en terreno',
    body: en ? 'The model reports precipitation without identifying its type. Check conditions before field work.' : 'El modelo informa precipitación sin identificar su tipo. Revisa las condiciones antes de realizar labores.' });

  // La humedad bajo el umbral de riego pide regar, pero si llueve pronto ese riego sobra.
  const irrigationAdvised = evaluation.texture !== null && finiteNumber(reading.vwc) && reading.vwc >= 0 && reading.vwc <= 100 && alerts.some(alert => alert.param === 'vwc') && reading.vwc < evaluation.texture.ur;
  const rainSoon = irrigationAdvised
    ? upcoming.slice(0, 2).find(day => (day.precipitationMm ?? 0) >= RAIN_INSTEAD_OF_IRRIGATION_MM)
    : undefined;
  if (rainSoon) {
    const mm = Math.round(rainSoon.precipitationMm ?? 0);
    const isToday = today?.date === rainSoon.date;
    plan.push({ kind: 'irrigation', priority: 'high', when: isToday ? 'today' : 'next_days', ruleId: 'plan:rain-irrigation', ...evidenceOf('vwc'),
      trace: { ruleId: 'plan:rain-irrigation', version: 'plan-v2', inputs: { vwc: reading.vwc, precipitationMm: rainSoon.precipitationMm }, dates: [rainSoon.date], sources: ['probe-bme280-v1', 'Open-Meteo'] },
      title: en ? 'Wait for the rain before irrigating' : 'Espera la lluvia antes de regar',
      headline: en ? 'Wait for the rain before irrigating' : 'Espera la lluvia antes de regar',
      body: en
        ? `${mm} mm of rain is forecast for ${dayLabel(rainSoon.date)}. If you can, wait for it before irrigating and measure again afterwards.`
        : `Se pronostican ${mm} mm de lluvia para ${isToday ? 'hoy' : `el ${dayLabel(rainSoon.date)}`}. Si puedes, espérala antes de regar y vuelve a medir después.` });
  }

  // El DPV es un indicador físico. El umbral es una convención orientativa del producto,
  // no una dosis de riego ni una categoría validada por FAO o por ensayos de campo.
  const freshCapture = !evaluation.coverage || evaluation.coverage.freshness === 'fresh';
  const usableLocal = (key: 'vwc' | 'temp' | 'airTemp' | 'airHumidity' | 'airPressure') => {
    const value = reading[key];
    return freshCapture && finiteNumber(value) && value >= LOCAL_VARIABLES[key].min && value <= LOCAL_VARIABLES[key].max;
  };
  const metrology = assessProbeMetrologicalContext(reading);
  // Umbrales orientativos de producto, sin validación agronómica local.
  const vpdMonitoringThreshold = 2.5;
  const hasBarometry =
    finiteNumber(reading.airPressure) &&
    metrology.psychrometricConstantKpaPerC !== null &&
    metrology.barometricAltitudeM !== null;
  const baroDetailEn = hasBarometry
    ? ` Barometric pressure ${reading.airPressure} hPa (approx. ${Math.round(metrology.barometricAltitudeM!)} m elevation, psychrometric constant ${metrology.psychrometricConstantKpaPerC!.toFixed(4)} kPa/°C, FAO 56 eq. 8).`
    : '';
  const baroDetailEs = hasBarometry
    ? ` Presión barométrica ${reading.airPressure} hPa (aprox. ${Math.round(metrology.barometricAltitudeM!)} m s. n. m., constante psicrométrica ${metrology.psychrometricConstantKpaPerC!.toFixed(4).replace('.', ',')} kPa/°C, FAO 56 ec. 8).`
    : '';
  if ((stage === 'vegetativo' || stage === 'floracion') && usableLocal('airTemp') && usableLocal('airHumidity') && reading.airHumidity! <= 35) {
    const vpd = computeLocalVpdKpa(reading.airTemp, reading.airHumidity);
    if (vpd !== null && vpd >= vpdMonitoringThreshold) {
      const vpdStr = en ? `${vpd.toFixed(2)} kPa` : `${vpd.toFixed(2).replace('.', ',')} kPa`;
      {
        plan.push({
          kind: 'monitoring',
          ruleId: 'plan:vpd-monitoring',
          priority: 'normal',
          when: 'today',
          ...evidenceOf('airTemp', 'airHumidity'),
          title: en ? 'High atmospheric demand (VPD)' : 'Alta demanda evaporativa del aire (DPV)',
          headline: en ? 'Measure again after the heat' : 'Vuelve a medir tras el calor',
          body: en
            ? `The air is dry (VPD ${vpdStr}). Check moisture near the roots before deciding whether to irrigate.`
            : `El aire está seco (DPV ${vpdStr}). Revisa la humedad cerca de las raíces antes de decidir el riego.`,
          detail: en
            ? `VPD ${vpdStr} from local air (${reading.airTemp} °C, ${reading.airHumidity}% RH). FAO 56 supports the formula; the monitoring threshold is an unvalidated product convention.${baroDetailEn}`
            : `DPV ${vpdStr} con aire local (${reading.airTemp} °C, ${reading.airHumidity} % HR). FAO 56 respalda la fórmula; el umbral de vigilancia es una convención del producto sin validar.${baroDetailEs}`,
        });
      }
    }
  }

  // Reglas metrológicas físicas del transductor CWT-Soil-NPKPHCTH-S:
  // 1) Bajo 5 % VWC la película de agua es discontinua y degrada el puente iónico de pH y CE.
  if (freshCapture && metrology.flags.includes('low_moisture_electrolyte_contact')) {
    plan.push({
      kind: 'evidence',
      ruleId: 'plan:dry-probe-contact',
      priority: 'high',
      when: 'now',
      ...evidenceOf('vwc'),
      title: en
        ? 'Dry soil limits galvanic pH and bulk EC contact'
        : 'Suelo muy seco limita el contacto electrolítico de pH y CE',
      headline: en ? 'Wet the soil and measure again' : 'Humedece el suelo y vuelve a medir',
      body: en
        ? `Volumetric moisture is ${reading.vwc}% (< 5%). Dry soil can limit contact and affect pH or bulk EC. Repeat in moist soil before deciding on amendments.`
        : `La humedad volumétrica es ${reading.vwc} % (< 5 %). El suelo seco puede limitar el contacto y afectar el pH o la CE aparente. Repite en suelo húmedo antes de decidir enmiendas.`,
      detail: en
        ? `Metrological rule (CWT-Soil-NPKPHCTH-S): galvanic pH and bulk EC require >= 5% VWC for a continuous ionic bridge (measured: ${reading.vwc}%).`
        : `Regla metrológica (CWT-Soil-NPKPHCTH-S): el pH galvánico y la CE a granel requieren >= 5 % de humedad volumétrica para sostener el puente iónico (medido: ${reading.vwc} %).`,
    });
  }
  // 2) pH fuera de la ventana nominal de calibración 3,0–9,0 pH del electrodo metálico.
  if (freshCapture && metrology.flags.includes('ph_outside_electrode_nominal_range')) {
    plan.push({
      kind: 'evidence',
      ruleId: 'plan:ph-instrument-range',
      priority: 'normal',
      when: 'today',
      ...evidenceOf('ph'),
      title: en
        ? 'Soil pH outside probe nominal range (3.0 to 9.0)'
        : 'pH fuera del rango nominal del electrodo (3,0 a 9,0)',
      headline: en ? 'Confirm pH in a laboratory' : 'Confirma el pH en laboratorio',
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
      ruleId: 'plan:ec-temperature',
      priority: 'normal',
      when: 'today',
      ...evidenceOf('temp'),
      title: en
        ? 'Soil temperature outside EC thermal compensation window'
        : 'Temperatura del suelo fuera de la compensación térmica de CE',
      headline: en ? 'Repeat within 0 to 50 °C' : 'Repite la lectura entre 0 y 50 °C',
      body: en
        ? `Soil temperature (${reading.temp} °C) is outside the 0 to 50 °C compensation window. Repeat when the temperature returns to that range.`
        : `La temperatura del suelo (${reading.temp} °C) está fuera de la ventana de compensación de 0 a 50 °C. Repite cuando vuelva a ese intervalo.`,
      detail: en
        ? `Metrological rule (CWT-Soil-NPKPHCTH-S): automatic EC thermal compensation operates from 0 to 50 °C (measured: ${reading.temp} °C).`
        : `Regla metrológica (CWT-Soil-NPKPHCTH-S): la compensación térmica automática de CE opera entre 0 y 50 °C (medido: ${reading.temp} °C).`,
    });
  }

  // Vigilancia psicrométrica de enfriamiento radiativo: aire frío sobre cero (0 < T <= 4,0 °C)
  // con punto de rocío <= 0 °C (poca humedad absoluta para liberar calor latente al condensar).
  if (
    freshCapture &&
    usableLocal('airTemp') && finiteNumber(reading.airTemp) &&
    reading.airTemp > 0 &&
    reading.airTemp <= 4.0 &&
    usableLocal('airHumidity') && finiteNumber(reading.airHumidity) &&
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
        ruleId: 'plan:dewpoint-frost-watch',
        priority: 'high',
        when: 'today',
        ...evidenceOf('airTemp', 'airHumidity'),
        title: en
          ? 'Cold air with subzero dew point: radiative frost watch'
          : 'Aire frío con punto de rocío bajo cero: vigilancia de helada radiativa',
        headline: en ? 'Watch the low tonight' : 'Vigila la mínima de esta noche',
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
    usableLocal('temp') &&
    usableLocal('airTemp') && finiteNumber(reading.airTemp) &&
    reading.airTemp >= 24 &&
    reading.temp <= 12
  ) {
    const diff = Math.round((reading.temp - reading.airTemp) * 10) / 10;
    const diffStr = en ? `${diff.toFixed(1)} °C` : `${diff.toFixed(1).replace('.', ',')} °C`;
    plan.push({
      kind: 'monitoring',
      ruleId: 'plan:soil-air-temperature',
      priority: 'normal',
      when: 'today',
      ...evidenceOf('temp', 'airTemp'),
      title: en
        ? 'Cold root zone under warm air (thermal decoupling)'
        : 'Suelo frío bajo aire cálido (desacople térmico raíz-follaje)',
      headline: en ? 'Watch for wilting at midday' : 'Vigila el decaimiento al mediodía',
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
    const evaluationTime = weatherContext?.evaluatedAt ?? weather?.fetchedAt;
    let localFrom: string | undefined;
    if (evaluationTime && weather?.timezone) {
      try {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: weather.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(evaluationTime));
        const part = (type: string) => parts.find(p => p.type === type)?.value;
        localFrom = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
      } catch { localFrom = undefined; }
    }
    const episode = localFrom ? highHumidityEpisode(weather, 90, localFrom) : null;
    const highRhHours = episode?.hours ?? 0;
    if (highRhHours >= 12) {
      plan.push({
        kind: 'weather',
        ruleId: 'plan:humidity-episode',
        trace: { ruleId: 'plan:humidity-episode', version: 'plan-v2', inputs: { relativeHumidityThresholdPct: 90, hours: highRhHours }, dates: [...new Set(weather!.hourly!.time.filter(slot => slot >= episode!.start && slot <= episode!.end).map(slot => slot.slice(0, 10)))], sources: ['Open-Meteo'] },
        priority: 'normal',
        when: 'next_days',
        title: en ? 'Extended period of high air humidity forecast' : 'Periodo prolongado de alta humedad del aire previsto',
        headline: en ? 'Check the crop ventilation' : 'Revisa la ventilación del cultivo',
        body: en
          ? `The hourly forecast shows ${highRhHours} consecutive hours with relative humidity at or above 90%. Check canopy ventilation and inspect the crop in the field.`
          : `El pronóstico horario prevé ${highRhHours} horas seguidas con humedad relativa igual o superior a 90 %, entre ${episode!.start} y ${episode!.end}. Revisa la ventilación del follaje e inspecciona el cultivo en el campo.`,
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
      if (!item.trace?.ruleId.startsWith('species:')) continue;
      const weatherRisks = item.trace.dates.flatMap(date => (item.trace!.generalRisks ?? [])
        .filter(risk => coveredWeatherRisks.get(date)?.has(risk)
          && upcoming.some(day => day.date === date && generalRisksOfDay(day).includes(risk)))
        .map(risk => ({ date, risk })));
      if (!weatherRisks.length) continue;
      item.trace = { ...item.trace, weatherRisks };
      item.detail = item.detail ? `${item.detail} ${schedulingReason}` : schedulingReason;
    }
  }
  if (uncoveredRiskyDays.length) {
    const dates = uncoveredRiskyDays.map(day => dayLabel(day.date)).join(', ');
    plan.push({ kind: 'weather', priority: 'normal', when: uncoveredRiskyDays[0].date === today?.date ? 'today' : 'next_days', ruleId: 'plan:general-weather',
      trace: { ruleId: 'plan:general-weather', version: 'plan-v2', inputs: Object.fromEntries(uncoveredRiskyDays.flatMap(day => [[`${day.date}:minimumTemperatureC`, day.minimumTemperatureC], [`${day.date}:maximumTemperatureC`, day.maximumTemperatureC], [`${day.date}:precipitationMm`, day.precipitationMm], [`${day.date}:rainProbabilityPct`, day.rainProbabilityPct]])), dates: uncoveredRiskyDays.map(day => day.date), sources: ['Open-Meteo'], weatherRisks: uncoveredRiskyDays.flatMap(day => generalRisksOfDay(day).filter(risk => !coveredWeatherRisks.get(day.date)?.has(risk)).map(risk => ({ date: day.date, risk }))) },
      title: en ? 'Plan field work around the weather' : 'Programa las labores según el clima',
      headline: en ? 'Schedule field work around the weather' : 'Programa las labores según el clima',
      body: en
        ? `Review the date of the task because of forecast rain, frost or heat: ${dates}. Confirm conditions before entering the field.`
        : `Revisa la fecha de la labor por lluvia, helada o calor previstos: ${dates}. Confirma las condiciones antes de ingresar al campo.` });
  }
  const actions = plan.map(item => item.body);
  plan.push({ kind: 'monitoring', priority: 'normal', when: 'next_reading', ruleId: 'plan:repeat-reading',
    title: en ? 'Measure again to compare' : 'Vuelve a medir para comparar',
    headline: en ? 'Measure again to compare' : 'Vuelve a medir para comparar',
    body: en ? 'Measure representative points and repeat after each management change; the trend says more than a single reading.'
      : 'Mide puntos representativos y repite después de cada cambio de manejo: la tendencia dice más que una sola lectura.' });
  // Lo urgente primero y, dentro de cada prioridad, lo más próximo (§9.2); a igual urgencia y
  // momento se conserva el orden en que se armó. Nunca depende del orden del catálogo.
  const rank = (item: Recommendation) => (item.priority === 'high' ? 0 : 4) + TIMING_ORDER[item.when];
  const recommendations = plan.map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
    // El titular nombra la especie medida y sigue la etapa cuando el genérico habla de «el cultivo».
    .map(({ item }) => {
      const inputs: Record<string, number | null> = Object.fromEntries((item.evidence ?? []).map(key => [key, finiteNumber(reading[key]) ? reading[key] : null]));
      const ruleId = item.ruleId ?? 'legacy:unversioned';
      const sources = item.evidence?.length ? ['probe-bme280-v1'] : [];
      if (ruleId === 'plan:vpd-monitoring') sources.push('https://www.fao.org/4/x0490e/x0490e07.htm');
      return { ...item, ...(item.headline ? { headline: personalizeHeadline(item.headline, stage, speciesId, en ? 'en' : 'es') } : {}),
        trace: item.trace ?? { ruleId, version: item.ruleVersion ?? 'plan-v2', inputs, dates: [], sources } };
    });

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
  // En pre-siembra no se pide especie: las etiquetas salen de las mismas fichas evaluadas.
  const suggestedCrops = cropOptions.map(option => option.label);

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
    ...(speciesWeather.coverage ? { speciesWeatherCoverage: speciesWeather.coverage } : {}),
  };
}
