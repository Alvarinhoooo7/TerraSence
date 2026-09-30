import type { SoilMeasurement } from '../types/agronomy';
import type { MeasurementPoint, PhenologicalStage } from '../types/app';
import type { StageAwareEvaluation } from './stageEvaluator';
import { STAGE_DRIVERS } from './stageEvaluator';
import type { ContextualAdvice } from './contextualAdvice';
import type { AppLanguage } from '../types/preferences';
import { cropName, textureNameFromDefinition } from './catalogNames';

export const PARAMETER_KEYS = ['vwc', 'temp', 'ph', 'ec', 'nitrogen', 'phosphorus', 'potassium', 'airTemp', 'airHumidity', 'airPressure'] as const;
export type ParameterKey = typeof PARAMETER_KEYS[number];
export interface ParameterPresentation {
  key: ParameterKey;
  label: string;
  value: number | null;
  unit: string;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'INFO';
  state: string;
  recommendation: string;
  control: string;
}
export interface MeasurementPresentation {
  version: 1;
  stage: PhenologicalStage;
  context: string;
  title: string;
  summary: string;
  actions: string[];
  weatherNote: string;
  parameters: ParameterPresentation[];
}
const labelsEs = ['Humedad del suelo', 'Temperatura del suelo', 'pH del suelo', 'Conductividad eléctrica', 'Nitrógeno', 'Fósforo', 'Potasio', 'Temperatura ambiente', 'Humedad ambiente', 'Presión atmosférica'];
const labelsEn = ['Soil moisture', 'Soil temperature', 'Soil pH', 'Electrical conductivity', 'Nitrogen', 'Phosphorus', 'Potassium', 'Air temperature', 'Air humidity', 'Atmospheric pressure'];
/** Nombre del parámetro en el idioma actual; también sirve para lecturas guardadas en el otro idioma. */
export const parameterLabel = (key: ParameterKey, language: AppLanguage = 'es') => (language === 'en' ? labelsEn : labelsEs)[PARAMETER_KEYS.indexOf(key)];
const units = ['%', '°C', 'pH', 'µS/cm', 'mg/kg', 'mg/kg', 'mg/kg', '°C', '%', 'hPa'];

export function applicableAlerts(evaluation: StageAwareEvaluation) {
  const drivers = STAGE_DRIVERS[evaluation.stage] as readonly string[];
  return evaluation.alerts.filter(a => drivers.includes(a.param))
    .filter(a => evaluation.stage === 'pre_siembra' || !/sembr|siembra|germin|planting|seeds|germination/i.test(a.action))
    .sort((a, b) => ({ danger: 0, warning: 1, info: 2 }[a.type] - { danger: 0, warning: 1, info: 2 }[b.type]));
}

export function buildMeasurementPresentation(raw: SoilMeasurement, evaluation: StageAwareEvaluation, advice: ContextualAdvice, language: AppLanguage = 'es'): MeasurementPresentation {
  const en = language === 'en';
  const alerts = applicableAlerts(evaluation);
  return {
    version: 1, stage: evaluation.stage,
    context: `${cropName(evaluation.crop.id, language)} · ${textureNameFromDefinition(evaluation.texture, language)}`,
    title: evaluation.verdictTitle, summary: advice.summary,
    actions: advice.actions, weatherNote: advice.weatherNote,
    parameters: PARAMETER_KEYS.map((key, index) => {
      const metric = key in evaluation.metrics ? evaluation.metrics[key as keyof typeof evaluation.metrics] : undefined;
      const value = raw[key];
      const derived = ['nitrogen', 'phosphorus', 'potassium'].includes(key);
      const related = alerts.filter(a => a.param === key);
      const relevant = (STAGE_DRIVERS[evaluation.stage] as readonly string[]).includes(key);
      const status = value == null || derived || !relevant ? 'INFO'
        : related.some(a => a.type === 'danger') ? 'CRITICAL'
        : related.some(a => a.type === 'warning') ? 'WARNING' : metric?.status ?? 'INFO';
      return {
        key, label: parameterLabel(key, language), value, unit: units[index], status,
        state: value == null ? (en ? 'The device did not deliver this value.' : 'El equipo no entregó este dato.')
          : derived ? (en ? 'Value derived from conductivity, without chemical validation.' : 'Registro derivado de conductividad, sin validación química.')
          : !relevant ? (en ? 'Context data. It does not determine the diagnosis for this stage.' : 'Dato de contexto. No determina el diagnóstico de esta fase.')
          : related.length ? related.map(a => a.title).join('\n') : metric?.msg ?? (en ? 'Local ambient reading from the device.' : 'Lectura ambiental local del equipo.'),
        recommendation: value == null ? (en ? 'Check the sensor and repeat the reading if you need this variable.' : 'Comprueba el sensor y repite la lectura si necesitas esta variable.')
          : derived ? (en ? 'Do not use this value to dose fertilizers. Confirm nutrients with a laboratory analysis.' : 'No usar este registro para dosificar fertilizantes. Confirma nutrientes con un análisis de laboratorio.')
          : related.length ? [...new Set(related.map(a => a.action))].join('\n\n')
          : status === 'OPTIMAL' ? (en ? 'No correction is indicated for this parameter under the current rules. Keep monitoring the crop.' : 'No se indica una corrección para este parámetro bajo las reglas actuales. Mantén seguimiento del cultivo.')
          : (en ? 'Interpret this value together with the global plan. There is no validated specific action for this condition and stage.' : 'Interpreta este dato junto con el plan global. No hay una acción específica validada para esta condición y fase.'),
        control: metric?.confidenceNote ?? (derived
          ? (en ? 'Cross-check with a laboratory before making nutrition decisions.' : 'Contrasta con laboratorio antes de tomar decisiones sobre nutrición.')
          : (en ? 'Compare representative points and repeat the measurement after management changes. No automatic interval is set.' : 'Compara puntos representativos y repite la medición después de cambios de manejo. No se establece un plazo automático.')),
      };
    }),
  };
}

export function isMeasurementPresentation(value: unknown): value is MeasurementPresentation {
  if (!value || typeof value !== 'object') return false;
  const p = value as MeasurementPresentation;
  return p.version === 1 && ['pre_siembra', 'vegetativo', 'floracion', 'cosecha'].includes(p.stage)
    && ['context', 'title', 'summary', 'weatherNote'].every(k => typeof (p as unknown as Record<string, unknown>)[k] === 'string')
    && Array.isArray(p.actions) && p.actions.every(a => typeof a === 'string')
    && Array.isArray(p.parameters) && p.parameters.length === PARAMETER_KEYS.length
    && p.parameters.every((m, i) => m && m.key === PARAMETER_KEYS[i] && (m.value === null || (typeof m.value === 'number' && Number.isFinite(m.value)))
      && ['OPTIMAL', 'WARNING', 'CRITICAL', 'INFO'].includes(m.status)
      && ['label', 'unit', 'state', 'recommendation', 'control'].every(k => typeof (m as unknown as Record<string, unknown>)[k] === 'string'));
}

export function presentationFromPoint(point: MeasurementPoint, language: AppLanguage = 'es'): MeasurementPresentation {
  const diagnosis = point.diagnosis as { presentation?: unknown } | null;
  if (isMeasurementPresentation(diagnosis?.presentation) && diagnosis.presentation.stage === point.stage) return diagnosis.presentation;
  const en = language === 'en';
  const values = [point.vwcPercent, point.soilTempC, point.ph, point.ecUsCm, point.nitrogen, point.phosphorus, point.potassium, point.airTemp, point.airHumidity, point.airPressure];
  return {
    version: 1, stage: point.stage, context: en ? 'Saved reading' : 'Lectura guardada', title: point.title,
    summary: point.action ?? (en ? 'This reading does not keep a detailed recommendation.' : 'Esta lectura no conserva una recomendación detallada.'),
    actions: point.action ? [point.action] : [],
    weatherNote: en ? 'See the recorded diagnosis; the current forecast is not added to this reading.' : 'Consulta el diagnóstico registrado; no se incorpora pronóstico actual a esta lectura.',
    parameters: PARAMETER_KEYS.map((key, i) => ({ key, label: parameterLabel(key, language), value: values[i] ?? null, unit: units[i], status: 'INFO',
      state: values[i] == null ? (en ? 'No value recorded.' : 'Sin dato registrado.') : (en ? 'Recorded value. No individual versioned assessment is kept.' : 'Valor registrado. No se conserva una evaluación individual versionada.'),
      recommendation: i >= 4 && i <= 6
        ? (en ? 'Record without chemical validation. Do not use to dose fertilizers.' : 'Registro sin validación química. No usar para dosificar fertilizantes.')
        : (en ? 'See the action recorded in the global plan. It is not recalculated with the current settings.' : 'Consulta la acción registrada en el plan global. No se recalcula con la configuración actual.'),
      control: en ? 'For an updated diagnosis, take a new measurement and select its stage.' : 'Para obtener un diagnóstico actualizado, realiza una nueva medición y selecciona su fase.',
    })),
  };
}
