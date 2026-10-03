import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { formatEngineMetric } from '../utils/units';
import type { ForecastDay } from '../services/weatherService';
import { ScreenCard, ScreenLabel, ScreenText } from './screen/ScreenUI';

const RAIN = '#3B8FD9';

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
    {days.length ? <>
      <ScreenText>{t('Pronóstico de Open-Meteo para el punto medido.', 'Open-Meteo forecast for the measured point.')}</ScreenText>
      {/* Un día por fila: nombre, lluvia y mínima / máxima. */}
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16 }}>
        {days.map((d, i) => <View key={d.date} style={{ paddingVertical: 14, gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }}>{day(d.date)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={RAIN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 3C12 3 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 3 12 3Z" /></Svg>
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{d.precipitationMm == null ? missing : `${d.precipitationMm} mm${d.rainProbabilityPct == null ? '' : ` · ${d.rainProbabilityPct} %`}`}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{temp(d.minimumTemperatureC)} / {temp(d.maximumTemperatureC)}</Text>
          </View>
        </View>)}
      </View>
    </> : <View style={{ flexDirection: 'row', gap: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${RAIN}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={RAIN} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Path d={loading ? 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 11.5 3.5 3.5 0 0 1 17.5 18Z' : 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 11.5 3.5 3.5 0 0 1 17.5 18ZM4 4l16 16'} />
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{loading ? t('Consultando el pronóstico', 'Requesting the forecast') : t('Sin pronóstico', 'No forecast')}</Text>
        <ScreenText>{loading ? t('Ya puedes guardar la lectura; el pronóstico se agrega si llega a tiempo.', 'You can already save the reading; the forecast is added if it arrives in time.')
          : t('Hace falta incluir la ubicación y tener internet. El diagnóstico local se conserva.', 'It needs the location and an internet connection. The local diagnosis is kept.')}</ScreenText>
      </View>
    </View>}
    <ScreenLabel>{t('Datos de la captura', 'Capture details')}</ScreenLabel>
    <ScreenCard>
      {row(t('Fecha y hora', 'Date and time'), capturedAt ? new Date(capturedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : missing)}
      {row(t('Batería de la sonda', 'Probe battery'), battery == null ? missing : `${battery} %`)}
      {row(t('Coordenadas', 'Coordinates'), latitude != null && longitude != null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : t('Sin coordenadas', 'No coordinates'), true)}
      {row(t('Precisión GPS', 'GPS accuracy'), accuracy == null ? missing : `±${Math.round(accuracy)} m`)}
    </ScreenCard>
  </View>;
}
