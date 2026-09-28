import React from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BrandLogo } from './BrandLogo';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Verde de arranque. Es el mismo color que `expo-splash-screen` pinta en la pantalla
 * nativa: cuando la app monta, el fondo no cambia y no aparece el destello claro
 * entre el arranque del sistema y el primer render.
 */
export const SPLASH_BACKGROUND = '#12281F';
/** Verde claro de la ruedita: el mismo que toman los estratos del logotipo. */
const SPINNER = '#6EE7B7';

/** Pantalla de carga con la marca: se muestra mientras se resuelve la ruta de entrada. */
export function LoadingScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(240, width - 48);
  const logoHeight = logoWidth * 235 / 590;
  return (
    <View style={styles.screen} accessibilityLabel={t('Cargando TerraSense', 'Loading TerraSense')}
      accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <View style={[styles.logo, { transform: [{ translateY: -logoHeight / 2 }] }]}>
        <BrandLogo width={logoWidth} onDark />
      </View>
      <ActivityIndicator size="large" color={SPINNER} style={[styles.spinner, { marginTop: logoHeight / 2 + 32 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SPLASH_BACKGROUND, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { position: 'absolute', top: '50%', alignItems: 'center' },
  spinner: { position: 'absolute', top: '50%' },
});
