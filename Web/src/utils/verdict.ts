// src/utils/verdict.ts
//
// Semáforo agronómico: etiquetas y colores.
//
// Accesibilidad: cada veredicto expone `icon` y `label` además del color,
// porque el color no puede ser el único código de la información (WCAG 2.2
// criterio 1.4.1). Eso ya era cierto antes de esta revisión; lo que no
// funcionaba es que las clases `verdict-*` no llegaban a generar CSS, de modo
// que los tres veredictos se pintaban idénticos.

import type { Verdict } from '../types';

export interface VerdictMeta {
  icon: string;
  label: string;
  /** Texto del veredicto sobre el fondo de la página. */
  text: string;
  /** Chip completo: fondo tenue, texto legible sobre él y borde. */
  chip: string;
  /** Relleno sólido, para el punto del semáforo. */
  dot: string;
}

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  GREEN: {
    icon: '✓',
    label: 'Apto',
    text: 'text-verdict-green',
    chip: 'bg-verdict-green-soft text-verdict-green border-verdict-green/30',
    dot: 'bg-verdict-green',
  },
  AMBER: {
    icon: '!',
    label: 'Precaución',
    text: 'text-verdict-amber',
    chip: 'bg-verdict-amber-soft text-verdict-amber border-verdict-amber/30',
    dot: 'bg-verdict-amber',
  },
  RED: {
    icon: '✕',
    label: 'No apto',
    text: 'text-verdict-red',
    chip: 'bg-verdict-red-soft text-verdict-red border-verdict-red/30',
    dot: 'bg-verdict-red',
  },
};

const DEFAULT_META: VerdictMeta = {
  icon: '?',
  label: 'Sin veredicto',
  text: 'text-terra-muted',
  chip: 'bg-terra-raised text-terra-muted border-terra-border',
  dot: 'bg-terra-border-strong',
};

/** El veredicto llega de la base como texto: una fila con un valor fuera de
 * los tres del CHECK no debe romper la tabla entera. */
export const verdictMeta = (verdict: string | null | undefined): VerdictMeta =>
  (verdict != null && verdict in VERDICT_META
    ? VERDICT_META[verdict as Verdict]
    : DEFAULT_META);

/**
 * Concordancia entre la lectura de TerraSense y la del laboratorio.
 *
 * Se calcula como error relativo respecto al valor de laboratorio, que es el
 * de referencia. Devuelve null cuando falta alguno de los dos, en vez de
 * inventar un 0 % que contaminaría la media.
 */
export const concordance = (
  lab: number | string | null | undefined,
  ts: number | string | null | undefined,
): number | null => {
  const l = typeof lab === 'string' ? Number(lab) : lab;
  const t = typeof ts === 'string' ? Number(ts) : ts;
  if (l == null || t == null || !Number.isFinite(l) || !Number.isFinite(t) || l === 0) {
    return null;
  }
  return Math.max(0, 100 - Math.abs((t - l) / l) * 100);
};
