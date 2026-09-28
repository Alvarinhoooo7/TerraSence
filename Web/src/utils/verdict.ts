// src/utils/verdict.ts — veredicto agronómico y etapa, en palabras.
//
// El color nunca va solo: cada veredicto lleva también su etiqueta (WCAG 1.4.1).

import type { PhenologicalStage, Verdict } from '../../backend/types';

export const STAGE_LABEL: Record<PhenologicalStage, string> = {
  pre_siembra: 'Pre-siembra',
  vegetativo: 'Vegetativo',
  floracion: 'Floración',
  cosecha: 'Cosecha',
};

export const stageLabel = (stage: string | null | undefined): string =>
  (stage && STAGE_LABEL[stage as PhenologicalStage]) || stage || '—';

const VERDICT: Record<Verdict, { label: string; tone: 'green' | 'amber' | 'red' }> = {
  GREEN: { label: 'Apto', tone: 'green' },
  AMBER: { label: 'Precaución', tone: 'amber' },
  RED: { label: 'No apto', tone: 'red' },
};

/** Un valor fuera del CHECK de la tabla no debe romper la fila. */
export const verdictMeta = (verdict: string | null | undefined) =>
  (verdict && VERDICT[verdict as Verdict]) || { label: 'Sin veredicto', tone: 'neutral' as const };
