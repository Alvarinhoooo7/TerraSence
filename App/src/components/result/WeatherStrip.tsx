import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../AppText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { displayKindNow, displayKindOfDay, forecastOutlook } from '../../engine/weatherOutlook';
import type { ForecastProps } from '../MeasurementForecast';
import { WeatherGlyph } from './WeatherGlyph';

/** Texto de la franja: el titular que ya da `forecastOutlook` y, debajo, el resto del resumen. */
export function weatherStripText(forecast: ForecastProps, language: 'es' | 'en', t: (es: string, en: string) => string): { headline: string; detail: string | null } {
  const hasCoords = forecast.latitude != null && forecast.longitude != null;
  const outlook = forecastOutlook(forecast.days, language, forecast.historical);
  if (outlook) {
    // Primera oración como titular; el resto, como detalle.
    const cut = outlook.indexOf('. ');
    return cut < 0 ? { headline: outlook, detail: null } : { headline: outlook.slice(0, cut + 1), detail: outlook.slice(cut + 2) };
  }
  if (forecast.loading) return { headline: t('Consultando el pronóstico…', 'Getting the forecast…'), detail: null };
  if (!hasCoords) return { headline: t('Sin ubicación incluida', 'Location not included'), detail: t('Sin ubicación no hay pronóstico. Se activa en Preferencias.', 'Without location there is no forecast. Turn it on in Preferences.') };
  return {
    headline: forecast.historical ? t('Sin pronóstico guardado', 'No saved forecast') : t('Pronóstico no disponible', 'Forecast unavailable'),
    detail: forecast.historical ? null : t('La orientación usa sólo la lectura local.', 'The guidance uses only the local reading.'),
  };
}

/** Una fila con el titular del clima; abre la hoja con el pronóstico completo. */
export function WeatherStrip({ forecast, onPress }: { forecast: ForecastProps; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const { headline, detail } = weatherStripText(forecast, language === 'en' ? 'en' : 'es', t);
  const kind = forecast.now ? displayKindNow(forecast.now) ?? displayKindOfDay(forecast.now.today) : forecast.days[0] ? displayKindOfDay(forecast.days[0]) : null;
  return <Pressable accessibilityRole="button" accessibilityLabel={[headline, detail].filter(Boolean).join(' ')}
    accessibilityHint={t('Abre el pronóstico completo.', 'Opens the full forecast.')} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? .8 : 1 })}>
    <WeatherGlyph kind={kind ?? null} size={28} color={colors.textSecondary} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text numberOfLines={2} style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{headline}</Text>
      {!!detail && <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 13 }}>{detail}</Text>}
    </View>
    <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.primary, fontSize: 22 }}>›</Text>
  </Pressable>;
}
