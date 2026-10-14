import { applicableAlerts } from './measurementPresentation';
import { possibleCrops } from './agronomyEngine';
import { cropName } from './catalogNames';
import type { StageAwareEvaluation } from './stageEvaluator';
import type { PhenologicalStage } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import type { CurrentWeather } from '../services/weatherService';
import type { AppLanguage } from '../types/preferences';
import { isRainingNow, isRainyDay, weatherKind } from './weatherOutlook';
import { evaluateSpeciesWeather, type SpeciesWeatherInput } from './speciesRules';
import { assessWeatherEvidence, type WeatherEvaluationContext, type WeatherCoverage } from './evaluationCoverage';

export type RecommendationKind = 'soil' | 'evidence' | 'weather' | 'irrigation' | 'monitoring';
export type RecommendationTiming = 'now' | 'today' | 'next_days' | 'next_reading';

/** Una recomendación del plan: tema, urgencia, cuándo aplica, título breve y explicación. */
export interface Recommendation {
  kind: RecommendationKind;
  priority: 'high' | 'normal';
  when: RecommendationTiming;
  title: string;
  body: string;
}

export interface ContextualAdvice {
  title: string;
  summary: string;
  actions: string[];
  /** Plan ordenado por urgencia. Ausente en diagnósticos guardados antes de existir. */
  recommendations?: Recommendation[];
  weatherNote: string;
  suggestedCrops: string[];
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
    rainingNow: isRainingNow(weather),
    fogNow: weatherKind(weather.weatherCode) === 'fog',
  };
}

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
  for (const alert of alerts) {
    if (seen.has(alert.action)) continue;
    seen.add(alert.action);
    // Una nota informativa (p. ej. pH dentro del óptimo de la especie) no pide actuar hoy:
    // va como seguimiento, después de lo que sí requiere revisión.
    if (alert.type === 'info') notes.push({ kind: 'monitoring', priority: 'normal', when: 'next_reading', title: alert.title, body: alert.action });
    else plan.push({ kind: 'soil', priority: alert.type === 'danger' ? 'high' : 'normal', when: 'today', title: alert.title, body: alert.action });
  }
  if (!plan.length) plan.push(evaluation.state === 'insufficient_data'
    ? { kind: 'evidence', priority: 'normal', when: 'next_reading',
      title: en ? 'Use this reading as a reference' : 'Toma esta lectura como referencia', body: evaluation.actionSummary }
    : evaluation.verdict === 'GREEN'
      ? { kind: 'monitoring', priority: 'normal', when: 'next_reading',
        title: en ? 'No corrections under these rules' : 'Sin correcciones bajo estas reglas',
        body: en ? 'No corrective actions under these rules. Keep monitoring and compare representative points.' : 'Sin acciones correctivas bajo estas reglas. Mantén seguimiento y compara puntos representativos.' }
      : { kind: 'soil', priority: 'normal', when: 'today',
        title: en ? 'Review the highlighted conditions' : 'Revisa las condiciones destacadas',
        body: en ? 'Review the highlighted conditions with advice before intervening. There is no validated specific action for this stage.' : 'Revisa las condiciones destacadas con asesoría antes de intervenir. No hay una acción específica validada para esta fase.' });
  plan.push(...notes);

  // Hoy cuenta como el primer día: si llueve hoy, también importa para regar o entrar al campo.
  const today = weather?.today ?? null;
  const upcoming = weather ? [...(today ? [today] : []), ...weather.forecast] : [];
  const dayLabel = (date: string) => today && date === today.date ? (en ? 'today' : 'hoy') : forecastDayLabel(date, language);

  // Criterios climáticos de la especie indicada (TASK ES6): helada, frío, calor, lluvia o
  // niebla que su fuente documenta para la etapa. Sin pronóstico vigente quedan sin evaluar
  // y así se dice; nunca se dan por favorables.
  const speciesWeather = evaluateSpeciesWeather(speciesId, stage, weather && pickSpeciesWeather(weather, dayLabel), language);
  for (const finding of speciesWeather.findings) plan.push({ kind: 'weather', priority: finding.type === 'danger' ? 'high' : 'normal',
    when: finding.when, title: finding.title, body: finding.body });
  if (speciesWeather.applicable && !speciesWeather.evaluated) plan.push({ kind: 'evidence', priority: 'normal', when: 'next_reading',
    title: en ? 'Species weather criteria not evaluated' : 'Criterios climáticos de la especie sin evaluar',
    body: en ? 'Without a current forecast, the frost, heat or rain that the sources document for this species at this stage could not be checked. Measure again with a connection to review them.'
      : 'Sin un pronóstico vigente no se pudo revisar la helada, el calor o la lluvia que las fuentes documentan para esta especie en esta fase. Vuelve a medir con conexión para revisarlos.' });

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

  const riskyDays = upcoming.filter(day =>
    (day.precipitationMm != null && day.precipitationMm >= 5) ||
    (day.rainProbabilityPct != null && day.rainProbabilityPct >= 60) ||
    (day.minimumTemperatureC != null && day.minimumTemperatureC <= 0) ||
    (day.maximumTemperatureC != null && day.maximumTemperatureC >= 35),
  );
  if (riskyDays.length) {
    const dates = riskyDays.map(day => dayLabel(day.date)).join(', ');
    plan.push({ kind: 'weather', priority: 'normal', when: riskyDays[0].date === today?.date ? 'today' : 'next_days',
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
  // Lo urgente primero; dentro de cada prioridad se conserva el orden en que se armó.
  const recommendations = [...plan.filter(item => item.priority === 'high'), ...plan.filter(item => item.priority !== 'high')];

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

  const suggestedCrops = stage === 'pre_siembra' && (!evaluation.coverage || evaluation.coverage.freshness === 'fresh')
    ? possibleCrops(reading)
        .map((crop) => `${crop.emoji} ${cropName(crop.id, language)}`)
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
    weatherNote,
    suggestedCrops,
    mapEligible: stage === 'pre_siembra',
    ...(weatherCoverage ? { weatherCoverage } : {}),
  };
}
