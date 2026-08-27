// src/constants/theme.ts
//
// Sistema de diseño de TerraSense. Estructura de tokens heredada del proyecto
// Akura; paleta reemplazada por una agronómica.
//
// Criterio de accesibilidad (WCAG 2.2 AA): el usuario objetivo es un agricultor
// de edad avanzada leyendo bajo sol directo. Los colores del semáforo se eligen
// con contraste ≥ 4,5:1 sobre su fondo y NUNCA son el único código: cada estado
// lleva además icono y texto (ver VERDICT_META).

export const Colors = {
  light: {
    background: '#F2F5F1',   // Verde grisáceo muy claro, no blanco puro
    card: '#FFFFFF',
    primary: '#1F5B3F',      // Verde bosque profundo
    primaryLight: '#2E8B5A',
    primaryDark: '#12281F',
    secondary: '#8A6A3B',    // Tierra / húmus
    accent: '#C9762B',       // Ocre cálido para acciones
    success: '#2C7A4E',      // Semáforo verde
    warning: '#9E6612',      // Semáforo ámbar
    danger: '#A33528',       // Semáforo rojo
    error: '#A33528',
    text: '#14201B',
    textSecondary: '#48584F',
    textMuted: '#7B8A82',
    border: '#DCE4DD',
    bubbleActive: '#1F5B3F',
    bubbleInactive: '#E7ECE7',
    mapOverlay: 'rgba(255,255,255,0.94)',
  },
  dark: {
    background: '#0D1512',
    card: '#16211C',
    primary: '#4FB783',
    primaryLight: '#6FD3A0',
    primaryDark: '#12281F',
    secondary: '#B08A55',
    accent: '#E0913F',
    success: '#58B87C',
    warning: '#D6A044',
    danger: '#E07463',
    error: '#E07463',
    text: '#E4EAE6',
    textSecondary: '#9DACA6',
    textMuted: '#75847D',
    border: '#28352F',
    bubbleActive: '#4FB783',
    bubbleInactive: '#1B2722',
    mapOverlay: 'rgba(16,24,20,0.94)',
  },
};

export type ThemeMode = keyof typeof Colors;
export type ThemeColors = (typeof Colors)['light'];

/**
 * Metadatos del semáforo. El color va SIEMPRE acompañado de icono y etiqueta:
 * cerca del 8 % de los hombres tiene alguna deficiencia de visión al color.
 */
export const VERDICT_META = {
  GREEN: {
    key: 'GREEN' as const,
    icon: '✓',
    label: 'APTO',
    fillLight: 'rgba(44,122,78,0.25)',
    fillDark: 'rgba(88,184,124,0.28)',
    strokeLight: '#2C7A4E',
    strokeDark: '#58B87C',
  },
  AMBER: {
    key: 'AMBER' as const,
    icon: '!',
    label: 'PRECAUCIÓN',
    fillLight: 'rgba(158,102,18,0.25)',
    fillDark: 'rgba(214,160,68,0.28)',
    strokeLight: '#9E6612',
    strokeDark: '#D6A044',
  },
  RED: {
    key: 'RED' as const,
    icon: '✕',
    label: 'NO APTO',
    fillLight: 'rgba(163,53,40,0.25)',
    fillDark: 'rgba(224,116,99,0.28)',
    strokeLight: '#A33528',
    strokeDark: '#E07463',
  },
} as const;

export const Typography = {
  titleLarge: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  titleMedium: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3 },
  bodyRegular: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  label: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.2 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: '600' as const },
  badge: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  button: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.2 },
  // Mínimo 16 sp en texto de lectura: requisito de legibilidad en terreno.
  mono: { fontSize: 15, fontVariant: ['tabular-nums'] as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
  borderRadius: 16,
  cardRadius: 20,
  // Área táctil mínima operable con guantes de trabajo (Material: 48 dp).
  touchTarget: 48,
};
