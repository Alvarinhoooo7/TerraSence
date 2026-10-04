import React from 'react';
import { StyleSheet, Text as NativeText, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useAppStore } from '../store/useAppStore';

/**
 * «Letra grande» (Preferencias): agranda la lectura un 20 % y los títulos un 10 %, para que
 * los títulos de 30 a 40 sp no desborden la pantalla. Se suma al tamaño de letra del
 * teléfono, que React Native ya aplica por su cuenta.
 */
export const LARGE_BODY_FACTOR = 1.2;
const LARGE_TITLE_FACTOR = 1.1;
const TITLE_SIZE = 24;

export const largeTextFactor = (fontSize: number) => (fontSize >= TITLE_SIZE ? LARGE_TITLE_FACTOR : LARGE_BODY_FACTOR);

/** Escala `fontSize` y `lineHeight` de un estilo de texto. Sin `fontSize` lo deja igual: hereda del texto padre. */
export function scaleTextStyle(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style);
  if (!flat || typeof flat.fontSize !== 'number') return style;
  const factor = largeTextFactor(flat.fontSize);
  return [style, {
    fontSize: Math.round(flat.fontSize * factor),
    ...(typeof flat.lineHeight === 'number' ? { lineHeight: Math.round(flat.lineHeight * factor) } : {}),
  }];
}

export const useLargeText = () => useAppStore(state => state.preferences.textSize === 'large');

/** `Text` de la app: igual al de React Native, con la preferencia de letra grande aplicada. */
export function Text({ style, ...props }: TextProps & { ref?: React.Ref<NativeText> }) {
  const large = useLargeText();
  return <NativeText {...props} style={large ? scaleTextStyle(style) : style} />;
}
