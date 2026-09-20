import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BrandLogo } from './BrandLogo';
import { enterDown } from '../constants/motion';
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
  return (
    <View style={styles.screen} accessibilityLabel={t('Cargando TerraSense', 'Loading TerraSense')}
      accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <Animated.View entering={enterDown()} style={styles.stack}>
        <BrandLogo width={240} onDark />
        <ActivityIndicator size="large" color={SPINNER} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SPLASH_BACKGROUND, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stack: { alignItems: 'center', gap: 40, maxWidth: 360, width: '100%' },
});
