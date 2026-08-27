// src/utils/verdict.ts
//
// Semáforo agronómico. Sustituye a `bioclimaticStatus.ts` de Akura,
// conservando el patrón umbral → color pero con criterio agronómico.
//
// Accesibilidad: cada veredicto expone además `icon` y `label`, porque el
// color no puede ser el único código de la información (WCAG 2.2 AA).

import type { Verdict } from '../types';

export const VERDICT_META: Record<
  Verdict,
  { icon: string; label: string; text: string; bg: string; border: string; dot: string }
> = {
  GREEN: {
    icon: '✓',
    label: 'Apto',
    text: 'text-[--color-verdict-green]',
    bg: 'bg-[--color-verdict-green]/10',
    border: 'border-[--color-verdict-green]/40',
    dot: 'bg-[--color-verdict-green]',
  },
  AMBER: {
    icon: '!',
    label: 'Precaución',
    text: 'text-[--color-verdict-amber]',
    bg: 'bg-[--color-verdict-amber]/10',
    border: 'border-[--color-verdict-amber]/40',
    dot: 'bg-[--color-verdict-amber]',
  },
  RED: {
    icon: '✕',
    label: 'No apto',
    text: 'text-[--color-verdict-red]',
    bg: 'bg-[--color-verdict-red]/10',
    border: 'border-[--color-verdict-red]/40',
    dot: 'bg-[--color-verdict-red]',
  },
};

/** Presenta el código de equipo en tres bloques: 48213-90574-16628 */
export const formatDeviceCode = (raw?: string): string => {
  const clean = (raw ?? '').replace(/\D/g, '').slice(0, 15);
  return clean.length === 15
    ? clean.replace(/(\d{5})(\d{5})(\d{5})/, '$1-$2-$3')
    : clean;
};

export const normalizeDeviceCode = (raw?: string): string =>
  (raw ?? '').replace(/\D/g, '').slice(0, 15);

export const relativeTime = (iso: string | null): string => {
  if (!iso) return 'nunca';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};

/**
 * Concordancia entre la lectura de TerraSense y la del laboratorio.
 *
 * Se calcula como error relativo respecto al valor de laboratorio, que es el
 * de referencia. Devuelve null cuando falta alguno de los dos, en vez de
 * inventar un 0 % que contaminaría la media.
 */
export const concordance = (lab: number | null, ts: number | null): number | null => {
  if (lab == null || ts == null || lab === 0) return null;
  return Math.max(0, 100 - Math.abs((ts - lab) / lab) * 100);
};
