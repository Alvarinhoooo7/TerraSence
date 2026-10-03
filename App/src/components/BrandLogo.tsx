import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useAppTheme } from '../hooks/useAppTheme';
import { brandSvg } from './brandAsset';

/**
 * Paleta del logotipo sobre el verde de arranque. Los estratos del dibujo son grises
 * pensados para fondo claro: sobre verde oscuro se apagan y ensucian la marca, así que
 * pasan a verdes. Si cambia aquí, cambiar también el bloque equivalente de
 * `scripts/generate-brand-assets.mjs`, que produce el PNG de la pantalla nativa.
 */
const ON_DARK: Record<string, string> = {
  '#0f2e22': '#ECFDF5',
  '#94A3B8': '#6EE7B7',
  '#CBD5E1': '#34D399',
  '#E2E8F0': '#A7F3D0',
};

/**
 * Sólo «TerraSense» del logotipo: las letras de la línea base, sin el isotipo ni
 * «SOIL TECHNOLOGIES». Son los mismos trazos que dibuja la pantalla nativa de
 * arranque (scripts/generate-brand-assets.mjs), así que el paso a la carga no se nota.
 */
const WORDMARK = [...brandSvg.matchAll(/<path fill="(#0f2e22|#16A34A)"(?: transform="translate\(([\d.]+) 0\)")? d="([^"]+)"\/>/g)]
  .map(([, fill, x, d]) => ({ terra: fill === '#0f2e22', x: Number(x ?? 0), d }));
/** Caja de las letras en unidades del logotipo: ancho y alto (de la línea de mayúsculas a la base). */
export const WORDMARK_BOX = { x: 0, y: -38, width: 268, height: 39.5 };

/**
 * El nombre en dos colores: «Terra» en el color del texto y «Sense» en el verde
 * de la marca. Es el título de las pantallas de carga.
 */
export function BrandWordmark({ width = 240, onDark = false }: { width?: number; onDark?: boolean }) {
  const { colors } = useAppTheme();
  const terra = onDark ? '#ECFDF5' : colors.text;
  const sense = onDark ? '#22C55E' : '#16A34A';
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK_BOX.x} ${WORDMARK_BOX.y} ${WORDMARK_BOX.width} ${WORDMARK_BOX.height}">${
    WORDMARK.map(g => `<path fill="${g.terra ? terra : sense}" transform="translate(${g.x} 0)" d="${g.d}"/>`).join('')}</svg>`;
  return <View accessible accessibilityRole="header" accessibilityLabel="TerraSense" style={{ width, height: width * WORDMARK_BOX.height / WORDMARK_BOX.width }}>
    <SvgXml xml={xml} width="100%" height="100%" />
  </View>;
}

/** `onDark` para fondos que no son los del tema, como la pantalla de carga. */
export function BrandLogo({ width = 180, onDark = false }: { width?: number; onDark?: boolean }) {
  const { colors } = useAppTheme();
  const xml = onDark
    ? Object.entries(ON_DARK).reduce((svg, [from, to]) => svg.replaceAll(from, to), brandSvg)
    : brandSvg.replaceAll('#0f2e22', colors.text);
  return <View accessible accessibilityRole="image" accessibilityLabel="TerraSense · Soil Technologies" style={{ width, maxWidth: '100%', height: width * 235 / 590 }}>
    <SvgXml xml={xml} width="100%" height="100%" />
  </View>;
}
