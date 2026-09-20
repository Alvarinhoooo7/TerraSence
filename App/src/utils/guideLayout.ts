export interface GuideRect { x: number; y: number; width: number; height: number }

/** Coordenadas relativas al contenedor, no a la pantalla física. */
export function guideLayout(target: GuideRect, width: number, height: number, dialogHeight: number, top = 0, bottom = 0) {
  const gap = 12;
  const x = Math.max(0, Math.min(width, target.x - 4));
  const y = Math.max(top, Math.min(height - bottom, target.y - 4));
  const right = Math.max(x, Math.min(width, target.x + target.width + 4));
  const end = Math.max(y, Math.min(height - bottom, target.y + target.height + 4));
  const below = height - bottom - end - gap;
  const above = y - top - gap;
  const placeBelow = below >= dialogHeight || below >= above;
  const available = Math.max(0, placeBelow ? below : above);
  const panelHeight = Math.min(dialogHeight, available);
  return {
    hole: { x, y, width: right - x, height: end - y },
    panelTop: placeBelow ? end + gap : y - gap - panelHeight,
    panelMaxHeight: available,
    panelLeft: Math.max(gap, Math.min(x, width - Math.min(360, width - gap * 2) - gap)),
    panelWidth: Math.min(360, width - gap * 2),
  };
}
