import { CROPS_DB } from './agronomyEngine';
import type { StageAwareEvaluation } from './stageEvaluator';
import type { PhenologicalStage } from '../types/app';
import type { SoilMeasurement } from '../types/agronomy';
import type { CurrentWeather } from '../services/weatherService';

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
): ContextualAdvice {
  const actions = evaluation.alerts.slice(0, 3).map((alert) => alert.action);
  if (actions.length === 0) actions.push('Mantén el manejo actual y repite la medición para observar la tendencia.');

  const riskyDays = weather?.forecast.filter(day =>
    (day.precipitationMm != null && day.precipitationMm >= 5) ||
    (day.rainProbabilityPct != null && day.rainProbabilityPct >= 60) ||
    (day.minimumTemperatureC != null && day.minimumTemperatureC <= 0) ||
    (day.maximumTemperatureC != null && day.maximumTemperatureC >= 35),
  ) ?? [];
  if (riskyDays.length) actions.push(`Revisa la fecha de la labor por lluvia, helada o calor previstos: ${riskyDays.map(day => day.date).join(', ')}. Confirma las condiciones antes de ingresar al predio.`);

  const completeForecast = weather?.forecast.every(day => day.precipitationMm != null && day.minimumTemperatureC != null && day.maximumTemperatureC != null);
  const weatherNote = !weather
    ? 'Pronóstico no disponible. La recomendación usa sólo la lectura local.'
    : riskyDays.length
      ? `Revisar la fecha de la labor: ${riskyDays.map(day => {
          const risks = [
            (day.precipitationMm ?? 0) >= 5 || (day.rainProbabilityPct ?? 0) >= 60 ? 'lluvia' : null,
            day.minimumTemperatureC != null && day.minimumTemperatureC <= 0 ? 'helada' : null,
            day.maximumTemperatureC != null && day.maximumTemperatureC >= 35 ? 'calor' : null,
          ].filter(Boolean);
          return `${day.date} (${risks.join(', ')})`;
        }).join('; ')}. Umbrales orientativos; confirmar las condiciones en terreno.`
      : completeForecast
        ? 'Sin alertas de lluvia, helada o calor bajo estas reglas orientativas para los próximos cinco días.'
        : 'Pronóstico incompleto: faltan datos para evaluar todos los próximos cinco días.';

  const suggestedCrops = stage === 'pre_siembra'
    ? Object.values(CROPS_DB)
        .filter((crop) =>
          reading.temp >= crop.tempMin &&
          reading.ph >= crop.phMin &&
          reading.ph <= crop.phMax &&
          reading.ec <= crop.ecMax,
        )
        .slice(0, 3)
        .map((crop) => `${crop.emoji} ${crop.name}`)
    : [];

  const copy: Record<PhenologicalStage, { title: string; summary: string }> = {
    pre_siembra: {
      title: 'Prepara el suelo antes de sembrar',
      summary: 'Prioriza las correcciones que condicionan germinación y establecimiento. Luego confirma que el clima permita entrar al predio.',
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

  return {
    ...copy[stage],
    actions,
    weatherNote,
    suggestedCrops,
    mapEligible: stage === 'pre_siembra',
  };
}
