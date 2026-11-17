/** Geometría única de la sonda de 5 pines. Sin dependencias: se prueba en tests/probeGeometry.test.ts. */
export const PROBE_PIN_COUNT = 5;
export const PROBE_PIN_SPACING = 8;
export const PROBE_BODY = { width: 48, height: 60, radius: 13 } as const;
/** Los pines parten dentro del cuerpo para que no se vea la unión. */
const PIN_START_Y = PROBE_BODY.height - 2;

/** Posición horizontal de cada pin respecto del centro del cuerpo: [-16, -8, 0, 8, 16]. */
export function probePinOffsets(): number[] {
  const half = (PROBE_PIN_COUNT - 1) / 2;
  return Array.from({ length: PROBE_PIN_COUNT }, (_, i) => (i - half) * PROBE_PIN_SPACING);
}

/** Trazo SVG de los pines, desde la base del cuerpo hacia abajo. */
export function probePinsPath(length: number): string {
  return probePinOffsets().map(x => `M${x} ${PIN_START_Y}v${length}`).join('');
}
