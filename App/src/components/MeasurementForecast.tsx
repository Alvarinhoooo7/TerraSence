import React from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { formatEngineMetric } from '../utils/units';
import type { ForecastDay } from '../services/weatherService';
import { ScreenCard, ScreenLabel, ScreenText } from './screen/ScreenUI';

export interface ForecastProps {
  days: ForecastDay[]; loading?: boolean; latitude?: number | null; longitude?: number | null;
  accuracy?: number | null; capturedAt: string | null; battery?: number | null; historical?: boolean;
}

/** Pronóstico y datos de la captura. El título lo pone la pantalla que lo contiene. */
export function MeasurementForecast({ days, loading = false, latitude, longitude, accuracy, capturedAt, battery }: ForecastProps) {
  const { colors } = useAppTheme();
  const { t, locale } = useTranslation();
  const system = useAppStore(s => s.preferences.measurementSystem);
  const missing = t('Sin dato', 'No data');
  const temp = (v: number | null) => { if (v == null) return missing; const f = formatEngineMetric('temp', v, '°C', system); return `${f.value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${f.unit}`; };
  const day = (iso: string) => {
    const date = new Date(`${iso}T12:00:00`);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
  };
  const row = (label: string, value: string, selectable = false) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, minHeight: 30, alignItems: 'baseline' }}>
    <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{label}</Text>
    <Text selectable={selectable} style={{ color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
  </View>;
  return <View style={{ gap: 12 }}>
    <ScreenText>{loading ? t('Consultando el pronóstico. Ya puedes guardar la lectura.', 'Requesting the forecast. You can already save the reading.')
      : days.length ? t('Pronóstico de Open-Meteo para el punto medido.', 'Open-Meteo forecast for the measured point.')
      : t('Pronóstico no disponible: hace falta incluir la ubicación y tener internet. El diagnóstico local se conserva.', 'Forecast unavailable: it needs the location and an internet connection. The local diagnosis is kept.')}</ScreenText>
    {days.map(d => <ScreenCard key={d.date}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }}>{day(d.date)}</Text>
      {row(t('Mínima / máxima', 'Low / high'), `${temp(d.minimumTemperatureC)} / ${temp(d.maximumTemperatureC)}`)}
      {row(t('Lluvia', 'Rain'), d.precipitationMm == null ? missing : `${d.precipitationMm} mm${d.rainProbabilityPct == null ? '' : ` · ${d.rainProbabilityPct} %`}`)}
    </ScreenCard>)}
    <ScreenLabel>{t('Datos de la captura', 'Capture details')}</ScreenLabel>
    <ScreenCard>
      {row(t('Fecha y hora', 'Date and time'), capturedAt ? new Date(capturedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : missing)}
      {row(t('Batería de la sonda', 'Probe battery'), battery == null ? missing : `${battery} %`)}
      {row(t('Coordenadas', 'Coordinates'), latitude != null && longitude != null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : t('Sin coordenadas', 'No coordinates'), true)}
      {row(t('Precisión GPS', 'GPS accuracy'), accuracy == null ? missing : `±${Math.round(accuracy)} m`)}
    </ScreenCard>
  </View>;
}
