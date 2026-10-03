import React from 'react';
import { Text, View } from 'react-native';
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
 * El nombre en dos colores del logotipo, como texto: «Terra» en el color del
 * texto y «Sense» en el verde de la marca (#16A34A, el de brandAsset). Es el
 * título de las pantallas de carga.
 */
export function BrandWordmark({ size = 44, onDark = false }: { size?: number; onDark?: boolean }) {
  const { colors } = useAppTheme();
  return <Text accessibilityRole="header" accessibilityLabel="TerraSense" allowFontScaling={false}
    style={{ color: onDark ? '#ECFDF5' : colors.text, fontSize: size, lineHeight: size * 1.15, fontWeight: '800', letterSpacing: -size * .03, textAlign: 'center' }}>
    Terra<Text style={{ color: onDark ? '#22C55E' : '#16A34A' }}>Sense</Text>
  </Text>;
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
