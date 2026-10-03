import React from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { formatEngineMetric } from '../utils/units';
import type { ForecastDay } from '../services/weatherService';

export function MeasurementForecast({ days, loading = false, historical = false, latitude, longitude, accuracy, capturedAt, battery }: {
  days: ForecastDay[]; loading?: boolean; latitude?: number | null; longitude?: number | null;
  accuracy?: number | null; capturedAt: string | null; battery?: number | null; historical?: boolean;
}) {
  const { colors } = useAppTheme();
  const { t, locale } = useTranslation();
  const system = useAppStore(s => s.preferences.measurementSystem);
  const missing = t('Sin dato', 'No data');
  const temp = (v: number | null) => { if (v == null) return missing; const f = formatEngineMetric('temp', v, '°C', system); return `${f.value.toFixed(1)} ${f.unit}`; };
  return <View style={{ gap: 16 }}>
    <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{historical ? t('Pronóstico registrado', 'Recorded forecast') : t('Próximos cinco días', 'Next five days')}</Text>
    <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>{loading ? t('Consultando pronóstico. Ya puedes guardar.', 'Requesting forecast. You can save now.') : days.length ? t('Pronóstico de Open-Meteo registrado en la captura.', 'Open-Meteo forecast recorded at capture.') : t('Pronóstico no disponible. El diagnóstico local se conserva.', 'Forecast unavailable. The local diagnosis is kept.')}</Text>
    {days.map(day => <View key={day.date} style={{ padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{day.date}</Text>
      <Text style={{ color: colors.text }}>{temp(day.minimumTemperatureC)} / {temp(day.maximumTemperatureC)}</Text>
      <Text style={{ color: colors.textSecondary }}>{t('Lluvia', 'Rain')}: {day.precipitationMm == null ? missing : `${day.precipitationMm} mm`}</Text>
    </View>)}
    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{t('Datos de captura', 'Capture details')}</Text>
    <Text style={{ color: colors.textSecondary }}>{capturedAt ? new Date(capturedAt).toLocaleString(locale) : missing}</Text>
    <Text style={{ color: colors.textSecondary }}>{t('Batería', 'Battery')}: {battery == null ? missing : `${battery} %`}</Text>
    <Text selectable style={{ color: colors.textSecondary }}>{latitude != null && longitude != null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : t('Sin coordenadas', 'No coordinates')}</Text>
    <Text style={{ color: colors.textSecondary }}>{t('Precisión GPS', 'GPS accuracy')}: {accuracy == null ? missing : `±${Math.round(accuracy)} m`}</Text>
  </View>;
}
