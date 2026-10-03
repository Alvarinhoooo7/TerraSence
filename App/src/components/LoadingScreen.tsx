import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandWordmark, WORDMARK_BOX } from './BrandLogo';
import { EntryButton } from './entry/EntryUI';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Verde de arranque. Es el mismo color que `expo-splash-screen` pinta en la pantalla
 * nativa: cuando la app monta, el fondo no cambia y no aparece el destello claro
 * entre el arranque del sistema y el primer render.
 */
export const SPLASH_BACKGROUND = '#12281F';
/**
 * Ancho del nombre en dp: el que tiene en la pantalla nativa de arranque
 * (`imageWidth` 186 de expo-splash-screen en app.config.js, que Android 12+ dibuja a 240/288).
 */
export const SPLASH_WORDMARK_WIDTH = 155;
/** Verde claro de la ruedita: el mismo que toman los estratos del logotipo. */
const SPINNER = '#6EE7B7';

/**
 * Pantalla de carga de toda la app: el nombre TerraSense en dos colores, una rueda
 * debajo y, si corresponde, qué está pasando y una salida (Cancelar). Sin
 * porcentajes: el avance real no se conoce.
 */
export function BrandLoading({ title, detail, onCancel, cancelLabel }: { title?: string; detail?: string; onCancel?: () => void; cancelLabel?: string }) {
  const { t } = useTranslation();
  // Sin texto es la carga de arranque: el nombre queda en el centro exacto de la
  // pantalla, donde lo dibuja la pantalla nativa, y la rueda aparece debajo.
  if (!title && !onCancel) return <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel={t('Cargando TerraSense', 'Loading TerraSense')}
    style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND, alignItems: 'center', justifyContent: 'center' }}>
    <BrandWordmark onDark width={SPLASH_WORDMARK_WIDTH} />
    <View style={{ position: 'absolute', top: '50%', marginTop: SPLASH_WORDMARK_WIDTH * WORDMARK_BOX.height / WORDMARK_BOX.width / 2 + 28 }}>
      <ActivityIndicator size="large" color={SPINNER} />
    </View>
  </View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }}>
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel={title ?? t('Cargando TerraSense', 'Loading TerraSense')}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 28 }}>
      <BrandWordmark onDark width={SPLASH_WORDMARK_WIDTH} />
      <ActivityIndicator size="large" color={SPINNER} />
      {!!title && <View style={{ gap: 8, maxWidth: 360 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
        {!!detail && <Text style={{ color: '#C4D4C9', fontSize: 16, lineHeight: 24, textAlign: 'center' }}>{detail}</Text>}
      </View>}
    </View>
    {onCancel && <View style={{ paddingHorizontal: 24, paddingBottom: 16, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      <EntryButton secondary label={cancelLabel ?? t('Cancelar', 'Cancel')} onPress={onCancel} />
    </View>}
  </SafeAreaView>;
}

/** Pantalla de carga mientras se resuelve la ruta de entrada. */
export function LoadingScreen() {
  return <BrandLoading />;
}
