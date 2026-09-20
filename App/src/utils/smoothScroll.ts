// Desplazamiento asistido del texto legal.
//
// Cuando alguien pulsa «Continuar» sin haber bajado, la app lleva el texto hasta el
// final en lugar de dejar el botón muerto. `ScrollView.scrollToEnd` salta de golpe y
// su velocidad no se puede regular, así que el recorrido se calcula aquí y la pantalla
// sólo va posicionando el contenido. Sin dependencias de React Native: así se prueba.

/** Curva de salida: avanza rápido y frena al llegar, sin rebotar. */
export const easeOutCubic = (progress: number): number => 1 - (1 - progress) ** 3;

/** Píxeles por milisegundo del recorrido asistido. */
const SPEED = 2.2;
const MIN_DURATION = 300;
const MAX_DURATION = 1100;

/**
 * Duración del recorrido según lo que falte por bajar: ni un salto en un texto corto
 * ni una eternidad en uno largo.
 */
export function scrollTweenDuration(distance: number): number {
  if (!Number.isFinite(distance)) return MIN_DURATION;
  const travel = Math.abs(distance);
  if (travel <= 0) return 0;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, travel / SPEED));
}

/** Posición del contenido en un instante del recorrido. */
export function scrollTweenPosition(from: number, to: number, elapsed: number, duration: number): number {
  if (![from, to, elapsed, duration].every(Number.isFinite) || duration <= 0) return to;
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  return from + (to - from) * easeOutCubic(progress);
}

/** Final del recorrido: hasta dónde puede bajar el contenido dentro de su ventana. */
export function maxScrollOffset(content: number, viewport: number): number {
  if (![content, viewport].every(Number.isFinite)) return 0;
  return Math.max(0, content - viewport);
}
