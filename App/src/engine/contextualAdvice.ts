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

  const weatherNote = !weather
    ? 'No hubo conexión con el servicio climático. La recomendación usa sólo la lectura local.'
    : (weather.rainProbabilityPct ?? 0) >= 60 || (weather.dailyPrecipitationMm ?? 0) >= 5
      ? `Hay ${weather.rainProbabilityPct ?? 0} % de probabilidad de lluvia y ${(weather.dailyPrecipitationMm ?? 0).toFixed(1)} mm previstos: posterga labores que compacten el suelo y revisa el drenaje.`
      : weather.windKmh >= 35
        ? `Viento de ${weather.windKmh.toFixed(0)} km/h: evita aplicaciones foliares y labores expuestas.`
        : `Clima sin alerta inmediata: ${weather.temperatureC.toFixed(1)} °C, viento ${weather.windKmh.toFixed(0)} km/h.`;

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
