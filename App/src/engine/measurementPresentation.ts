import type { SoilMeasurement } from '../types/agronomy';
import type { MeasurementPoint, PhenologicalStage } from '../types/app';
import type { StageAwareEvaluation } from './stageEvaluator';
import { STAGE_DRIVERS } from './stageEvaluator';
import type { ContextualAdvice } from './contextualAdvice';

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
const labels = ['Humedad del suelo', 'Temperatura del suelo', 'pH del suelo', 'Conductividad eléctrica', 'Nitrógeno', 'Fósforo', 'Potasio', 'Temperatura ambiente', 'Humedad ambiente', 'Presión atmosférica'];
const units = ['%', '°C', 'pH', 'µS/cm', 'mg/kg', 'mg/kg', 'mg/kg', '°C', '%', 'hPa'];

export function applicableAlerts(evaluation: StageAwareEvaluation) {
  const drivers = STAGE_DRIVERS[evaluation.stage] as readonly string[];
  return evaluation.alerts.filter(a => drivers.includes(a.param))
    .filter(a => evaluation.stage === 'pre_siembra' || !/sembr|siembra|germin|planting|seeds|germination/i.test(a.action))
    .sort((a, b) => ({ danger: 0, warning: 1, info: 2 }[a.type] - { danger: 0, warning: 1, info: 2 }[b.type]));
}

export function buildMeasurementPresentation(raw: SoilMeasurement, evaluation: StageAwareEvaluation, advice: ContextualAdvice): MeasurementPresentation {
  const alerts = applicableAlerts(evaluation);
  return {
    version: 1, stage: evaluation.stage,
    context: `${evaluation.crop.name} · ${evaluation.texture.name}`,
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
        key, label: labels[index], value, unit: units[index], status,
        state: value == null ? 'El equipo no entregó este dato.' : derived ? 'Registro derivado de conductividad, sin validación química.'
          : !relevant ? 'Dato de contexto. No determina el diagnóstico de esta fase.' : related.length ? related.map(a => a.title).join('\n') : metric?.msg ?? 'Lectura ambiental local del equipo.',
        recommendation: value == null ? 'Comprueba el sensor y repite la lectura si necesitas esta variable.'
          : derived ? 'No usar este registro para dosificar fertilizantes. Confirma nutrientes con un análisis de laboratorio.'
          : related.length ? [...new Set(related.map(a => a.action))].join('\n\n')
          : status === 'OPTIMAL' ? 'No se indica una corrección para este parámetro bajo las reglas actuales. Mantén seguimiento del cultivo.'
          : 'Interpreta este dato junto con el plan global. No hay una acción específica validada para esta condición y fase.',
        control: metric?.confidenceNote ?? (derived ? 'Contrasta con laboratorio antes de tomar decisiones sobre nutrición.' : 'Compara puntos representativos y repite la medición después de cambios de manejo. No se establece un plazo automático.'),
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

export function presentationFromPoint(point: MeasurementPoint): MeasurementPresentation {
  const diagnosis = point.diagnosis as { presentation?: unknown } | null;
  if (isMeasurementPresentation(diagnosis?.presentation) && diagnosis.presentation.stage === point.stage) return diagnosis.presentation;
  const values = [point.vwcPercent, point.soilTempC, point.ph, point.ecUsCm, point.nitrogen, point.phosphorus, point.potassium, point.airTemp, point.airHumidity, point.airPressure];
  return {
    version: 1, stage: point.stage, context: 'Lectura guardada', title: point.title,
    summary: point.action ?? 'Esta lectura no conserva una recomendación detallada.',
    actions: point.action ? [point.action] : [], weatherNote: 'Consulta el diagnóstico registrado; no se incorpora pronóstico actual a esta lectura.',
    parameters: PARAMETER_KEYS.map((key, i) => ({ key, label: labels[i], value: values[i] ?? null, unit: units[i], status: 'INFO',
      state: values[i] == null ? 'Sin dato registrado.' : 'Valor registrado. No se conserva una evaluación individual versionada.',
      recommendation: i >= 4 && i <= 6 ? 'Registro sin validación química. No usar para dosificar fertilizantes.' : 'Consulta la acción registrada en el plan global. No se recalcula con la configuración actual.',
      control: 'Para obtener un diagnóstico actualizado, realiza una nueva medición y selecciona su fase.',
    })),
  };
}
