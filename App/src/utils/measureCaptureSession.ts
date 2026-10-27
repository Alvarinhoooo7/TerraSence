import { buildContextualAdvice, type ContextualAdvice } from '../engine/contextualAdvice';
import type { WeatherEvaluationContext } from '../engine/evaluationCoverage';
import { buildLocalInputQuality } from '../engine/inputQuality';
import { deriveLocalPhysics } from '../engine/localPhysics';
import { buildMeasurementPresentation, type MeasurementPresentation } from '../engine/measurementPresentation';
import { evaluateReadingForStage, type StageAwareEvaluation } from '../engine/stageEvaluator';
import type { CurrentWeather } from '../services/weatherService';
import type { LocalInputQuality, SoilMeasurement } from '../types/agronomy';
import type { PhenologicalStage } from '../types/app';
import type { AppLanguage } from '../types/preferences';

export interface CaptureEvaluationParams {
  raw: SoilMeasurement;
  stage: PhenologicalStage;
  language: AppLanguage;
  capturedAt: string;
  evaluatedAt?: string;
  simulated?: boolean;
  speciesId?: string | null;
  captureId: string;
  location?: { latitude: number; longitude: number; accuracy?: number | null } | null;
}

export interface CaptureEvaluationResult {
  evaluation: StageAwareEvaluation;
  advice: ContextualAdvice;
  weather: CurrentWeather | null;
}

/**
 * Incorpora un pronóstico recién recibido (o ausente) a la captura activa,
 * validando vigencia, distancia y vínculo con `captureId` (`WeatherEvaluationContext`).
 */
export function applyWeatherToCapture(
  params: CaptureEvaluationParams,
  forecast: CurrentWeather | null,
): CaptureEvaluationResult {
  const evaluatedAt = params.evaluatedAt ?? new Date().toISOString();
  const weatherContext: WeatherEvaluationContext = {
    captureId: params.captureId,
    location: params.location ?? null,
    evaluatedAt,
  };
  const evaluation = evaluateReadingForStage(params.raw, params.stage, params.language, {
    capturedAt: params.capturedAt,
    evaluatedAt,
    simulated: params.simulated,
  }, params.speciesId);
  const advice = buildContextualAdvice(
    params.stage,
    evaluation,
    params.raw,
    forecast,
    params.language,
    weatherContext,
    params.speciesId,
  );
  const weatherStatus = advice.weatherCoverage?.status ?? 'not_evaluated';
  return {
    evaluation,
    advice,
    weather: weatherStatus === 'not_evaluated' ? null : forecast,
  };
}

/**
 * Construye la instantánea compacta `diagnosis` que se persiste al guardar (E6):
 * excluye series horarias crudas (`hourly`) y conserva cobertura, razones, derivados y versiones.
 */
export function buildSavedDiagnosisSnapshot(params: {
  raw: SoilMeasurement;
  evaluation: StageAwareEvaluation;
  advice: ContextualAdvice;
  language: AppLanguage;
  capturedAt: string;
  simulated?: boolean;
  speciesId?: string | null;
  weather: CurrentWeather | null;
  inputQuality?: LocalInputQuality;
  presentation?: MeasurementPresentation;
}) {
  const inputQuality = params.inputQuality ?? buildLocalInputQuality(params.raw, params.capturedAt, Boolean(params.simulated));
  const presentation = params.presentation ?? buildMeasurementPresentation(
    params.raw,
    params.evaluation,
    params.advice,
    params.language,
    inputQuality,
    params.speciesId,
  );
  return {
    presentation,
    inputQuality,
    derived: deriveLocalPhysics(inputQuality),
    evaluationState: params.evaluation.state,
    coverage: params.evaluation.coverage,
    localSource: 'probe-bme280-v1' as const,
    capturedAt: params.capturedAt,
    connectionAtCapture: 'ble-response' as const,
    alerts: params.evaluation.alerts,
    drivers: params.evaluation.drivers,
    advice: params.advice,
    weather: params.weather ? { ...params.weather, hourly: undefined } : null,
  };
}

