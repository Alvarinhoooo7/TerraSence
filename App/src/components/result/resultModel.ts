// Modelo del resultado en una pantalla: qué se cuenta, qué acciones se ven. Sin React Native,
// para poder probarlo. Ninguna cifra ni umbral se recalcula aquí: todo sale de la presentación
// que armó el motor agronómico.
import type { ParameterKey, MeasurementPresentation, ParameterPresentation } from '../../engine/measurementPresentation';
import type { RecommendationTiming } from '../../engine/contextualAdvice';

const NUTRIENTS: ParameterKey[] = ['nitrogen', 'phosphorus', 'potassium'];

export interface ScoreCounts { ok: number; warn: number; bad: number; total: number }

/** Variables con estado: excluye N, P y K y los datos de contexto (`INFO`). Una sin valor no suma. */
export function scoreCounts(parameters: ParameterPresentation[]): ScoreCounts {
  const scored = parameters.filter(m => !NUTRIENTS.includes(m.key) && m.status !== 'INFO' && m.value != null);
  return {
    ok: scored.filter(m => m.status === 'OPTIMAL').length,
    warn: scored.filter(m => m.status === 'WARNING').length,
    bad: scored.filter(m => m.status === 'CRITICAL').length,
    total: scored.length,
  };
}

/**
 * Datos de la barra de segmentos del veredicto. `null` cuando no hay nada que contar: con
 * evaluación insuficiente o sin ninguna variable con estado se muestra sólo «Evaluación
 * insuficiente», para que unos pocos conteos no parezcan un diagnóstico. `withoutData` son las
 * variables (fuera de N, P y K) que no trajeron valor; la pantalla lo declara en vez de contarlas
 * como favorables.
 */
export function verdictBar(p: MeasurementPresentation): { counts: ScoreCounts; withoutData: number } | null {
  if (p.evaluationState === 'insufficient_data') return null;
  const counts = scoreCounts(p.parameters);
  if (counts.total === 0) return null;
  return { counts, withoutData: p.parameters.filter(m => !NUTRIENTS.includes(m.key) && m.value == null).length };
}

export interface PlanAction {
  /** Posición en `p.recommendations`, o en `p.actions` si es una lectura antigua. */
  index: number;
  /** `null` en lecturas antiguas, que no guardaron el momento. */
  when: RecommendationTiming | null;
  /** `headline ?? title`. */
  title: string;
  priority: 'high' | 'normal';
  evidence: ParameterKey[];
}

export const PLAN_VISIBLE = 3;

/** Todas las acciones del plan, en el orden del motor. Una lectura antigua arma el plan con sus `actions`. */
export function allPlanActions(p: MeasurementPresentation): PlanAction[] {
  const recommendations = p.recommendations ?? [];
  return recommendations.length
    ? recommendations.map((r, index) => ({ index, when: r.when, title: r.headline ?? r.title, priority: r.priority, evidence: r.evidence ?? [] }))
    : (p.actions ?? []).map((title, index) => ({ index, when: null, title, priority: 'normal' as const, evidence: [] }));
}

/** Acciones a la vista y cuántas quedan tras «Ver N más». Las de prioridad alta se ven siempre; ninguna se descarta. */
export function planActions(p: MeasurementPresentation): { visible: PlanAction[]; hidden: number } {
  const all = allPlanActions(p);
  const visible = all.filter((a, i) => i < PLAN_VISIBLE || a.priority === 'high');
  return { visible, hidden: all.length - visible.length };
}

export type GroupSummary =
  | { kind: 'bad' | 'warn'; count: number }
  | { kind: 'ok'; count: number; withoutData: number }
  | { kind: 'no_data' }
  | { kind: 'context' };

/**
 * Resumen del encabezado de una familia (Suelo, Aire). Sólo cuenta variables con estado y valor:
 * si alguna no trajo dato, «Todo favorable» no se afirma sobre lo que no se midió.
 */
export function groupSummary(parameters: ParameterPresentation[]): GroupSummary {
  const counts = scoreCounts(parameters);
  const withoutData = parameters.filter(m => m.value == null).length;
  if (counts.bad) return { kind: 'bad', count: counts.bad };
  if (counts.warn) return { kind: 'warn', count: counts.warn };
  if (counts.ok) return { kind: 'ok', count: counts.ok, withoutData };
  return withoutData === parameters.length ? { kind: 'no_data' } : { kind: 'context' };
}
