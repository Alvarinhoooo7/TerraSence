import { applicableAlerts } from './measurementPresentation';
import { CROPS_DB } from './agronomyEngine';
import { cropName } from './catalogNames';
import type { StageAwareEvaluation } from './stageEvaluator';
import type { PhenologicalStage } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import type { CurrentWeather } from '../services/weatherService';
import type { AppLanguage } from '../types/preferences';

export interface ContextualAdvice {
  title: string;
  summary: string;
  actions: string[];
  weatherNote: string;
  suggestedCrops: string[];
  mapEligible: boolean;
}

export function buildContextualAdvice(
  stage: PhenologicalStage,
  evaluation: StageAwareEvaluation,
  reading: SoilMeasurement,
  weather: CurrentWeather | null,
  language: AppLanguage = 'es',
): ContextualAdvice {
  const en = language === 'en';
  const actions = [...new Set(applicableAlerts(evaluation).map((alert) => alert.action))];
  if (actions.length === 0) actions.push(evaluation.verdict === 'GREEN'
    ? (en ? 'No corrective actions under these rules. Keep monitoring and compare representative points.' : 'Sin acciones correctivas bajo estas reglas. Mantén seguimiento y compara puntos representativos.')
    : (en ? 'Review the highlighted conditions with advice before intervening. There is no validated specific action for this stage.' : 'Revisa las condiciones destacadas con asesoría antes de intervenir. No hay una acción específica validada para esta fase.'));

  const riskyDays = weather?.forecast.filter(day =>
    (day.precipitationMm != null && day.precipitationMm >= 5) ||
    (day.rainProbabilityPct != null && day.rainProbabilityPct >= 60) ||
    (day.minimumTemperatureC != null && day.minimumTemperatureC <= 0) ||
    (day.maximumTemperatureC != null && day.maximumTemperatureC >= 35),
  ) ?? [];
  if (riskyDays.length) {
    const dates = riskyDays.map(day => day.date).join(', ');
    actions.push(en
      ? `Review the date of the task because of forecast rain, frost or heat: ${dates}. Confirm conditions before entering the field.`
      : `Revisa la fecha de la labor por lluvia, helada o calor previstos: ${dates}. Confirma las condiciones antes de ingresar al campo.`);
  }

  const completeForecast = weather?.forecast.every(day => day.precipitationMm != null && day.minimumTemperatureC != null && day.maximumTemperatureC != null);
  const weatherNote = !weather
    ? (en ? 'Forecast unavailable. The recommendation uses only the local reading.' : 'Pronóstico no disponible. La recomendación usa sólo la lectura local.')
    : riskyDays.length
      ? `${en ? 'Review the date of the task: ' : 'Revisar la fecha de la labor: '}${riskyDays.map(day => {
          const risks = [
            (day.precipitationMm ?? 0) >= 5 || (day.rainProbabilityPct ?? 0) >= 60 ? (en ? 'rain' : 'lluvia') : null,
            day.minimumTemperatureC != null && day.minimumTemperatureC <= 0 ? (en ? 'frost' : 'helada') : null,
            day.maximumTemperatureC != null && day.maximumTemperatureC >= 35 ? (en ? 'heat' : 'calor') : null,
          ].filter(Boolean);
          return `${day.date} (${risks.join(', ')})`;
        }).join('; ')}. ${en ? 'Indicative thresholds; confirm conditions in the field.' : 'Umbrales orientativos; confirmar las condiciones en terreno.'}`
      : completeForecast
        ? (en ? 'No rain, frost or heat alerts under these indicative rules for the next five days.' : 'Sin alertas de lluvia, helada o calor bajo estas reglas orientativas para los próximos cinco días.')
        : (en ? 'Incomplete forecast: data is missing to evaluate all of the next five days.' : 'Pronóstico incompleto: faltan datos para evaluar todos los próximos cinco días.');

  const suggestedCrops = stage === 'pre_siembra'
    ? Object.values(CROPS_DB)
        .filter((crop) =>
          reading.temp >= crop.tempMin &&
          reading.ph >= crop.phMin &&
          reading.ph <= crop.phMax &&
          reading.ec <= crop.ecMax,
        )
        .slice(0, 3)
        .map((crop) => `${crop.emoji} ${cropName(crop.id, language)}`)
    : [];

  const copyEs: Record<PhenologicalStage, { title: string; summary: string }> = {
    pre_siembra: {
      title: 'Prepara el suelo antes de sembrar',
      summary: 'Prioriza las correcciones que condicionan germinación y establecimiento. Luego confirma que el clima permita entrar al campo.',
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
      summary: 'Prioritize the corrections that condition germination and establishment. Then confirm the weather allows entering the field.',
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
    actions,
    weatherNote,
    suggestedCrops,
    mapEligible: stage === 'pre_siembra',
  };
}
