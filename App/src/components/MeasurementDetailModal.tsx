import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { MeasurementResultFlow } from './MeasurementResultFlow';
import { savedForecast, weatherNow } from './measurementResultData';
import { ScreenCard, ScreenText } from './screen/ScreenUI';
import { presentationFromPoint } from '../engine/measurementPresentation';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { MeasurementPoint } from '../types/app';

/**
 * Detalle de una medición guardada: el mismo visor por pantallas del resultado
 * (MeasurementResultFlow), sin la acción de guardar. Es una capa a pantalla
 * completa y no un Modal, para que el botón Atrás de Android retroceda paso a
 * paso en vez de cerrar todo el detalle.
 */
export function MeasurementDetailModal({ point, onClose }: { point: MeasurementPoint | null; onClose: () => void }) {
  const { colors } = useAppTheme();
  const { t, language, locale } = useTranslation();
  if (!point) return null;
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
    <MeasurementResultFlow key={point.id} presentation={presentationFromPoint(point, language)}
      onExit={onClose} exitLabel={t('Mediciones', 'Readings')}
      meta={new Date(point.measuredAt).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' })}
      notices={point.isPending ? <ScreenCard accent={colors.warning}>
        <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>{t('PENDIENTE DE SINCRONIZAR', 'PENDING SYNC')}</Text>
        <ScreenText>{t('Guardada en este teléfono. Se enviará a la nube al recuperar la conexión.', 'Saved on this phone. It will be sent to the cloud when the connection returns.')}</ScreenText>
      </ScreenCard> : undefined}
      forecast={{ historical: true, days: savedForecast(point.diagnosis), now: weatherNow((point.diagnosis as { weather?: unknown } | null)?.weather), capturedAt: point.measuredAt, battery: point.batteryPercent,
        latitude: point.latitude, longitude: point.longitude, accuracy: point.gpsAccuracyM }} />
  </View>;
}
