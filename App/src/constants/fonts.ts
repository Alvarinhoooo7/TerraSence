import type { TextStyle } from 'react-native';

/**
 * Letra de títulos y cifras (Space Grotesk). En Android una letra propia no admite
 * `fontWeight`: cada peso es una familia distinta, así que el estilo lleva la familia y no el peso.
 * Mientras la letra no esté cargada (o si no cargó a tiempo) se devuelve la letra del sistema
 * con el peso equivalente: la app nunca depende de ella para iniciar.
 */
export const DISPLAY_FAMILIES = { medium: 'SpaceGrotesk_500Medium', bold: 'SpaceGrotesk_700Bold' } as const;
export type DisplayWeight = keyof typeof DISPLAY_FAMILIES;

const SYSTEM_WEIGHT: Record<DisplayWeight, TextStyle['fontWeight']> = { medium: '500', bold: '700' };

let loaded = false;
/** Lo llama `App.tsx` cuando la carga de la letra termina bien o deja de estar disponible. */
export function setDisplayFontsLoaded(value: boolean) { loaded = value; }
export function displayFontsLoaded() { return loaded; }

export function displayFont(weight: DisplayWeight): TextStyle {
  return loaded ? { fontFamily: DISPLAY_FAMILIES[weight] } : { fontWeight: SYSTEM_WEIGHT[weight] };
}
