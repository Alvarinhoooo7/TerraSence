import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from './AppText';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { formatEngineMetric } from '../utils/units';
import type { ForecastDay } from '../services/weatherService';
import { compareForecastWindows, forecastOutlook, isRainingNow, isRainyDay, weatherKind, weatherKindLabel } from '../engine/weatherOutlook';
import type { WeatherNow } from './measurementResultData';
import { WeatherGlyph } from './result/WeatherGlyph';
import { ScreenLabel, ScreenText } from './screen/ScreenUI';
import { enterDown } from '../constants/motion';

const RAIN = '#3B8FD9';
const SHORT_DAYS = { es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

export interface ForecastProps {
  days: ForecastDay[]; now?: WeatherNow | null; loading?: boolean; latitude?: number | null; longitude?: number | null;
  accuracy?: number | null; capturedAt: string | null; battery?: number | null; historical?: boolean;
  /** Pronóstico guardado reutilizado sin red: cuándo se descargó y a qué distancia del punto. */
  reuse?: ForecastReuse | null;
}
export interface ForecastReuse { fetchedAt: string; distanceM: number }

/**
 * Clima del punto medido, en dos bloques y nada más: cómo está ahora —o al medir,
 * en el historial— con la conclusión de los próximos días al pie de la misma
 * tarjeta, y la franja de cinco días. El título lo pone la pantalla que lo contiene.
 *
 * Fecha, hora, coordenadas y batería ya no viven aquí: son el contexto de la
 * captura y se muestran una sola vez, en la portada del resultado. Repetirlos
 * obligaba a recorrer dos pantallas para leer lo mismo.
 */
export function MeasurementForecast({ days, now, loading = false, capturedAt, historical = false, reuse = null }: ForecastProps) {
  const { colors } = useAppTheme();
  const { t, locale, language } = useTranslation();
  const lang = language === 'en' ? 'en' : 'es';
  const system = useAppStore(s => s.preferences.measurementSystem);
  const missing = t('Sin dato', 'No data');
  const degrees = (v: number | null, decimals = 1) => {
    if (v == null) return missing;
    const f = formatEngineMetric('temp', v, '°C', system);
    return `${f.value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${f.unit}`;
  };
  const shortDegrees = (v: number | null) => v == null ? '–' : `${Math.round(formatEngineMetric('temp', v, '°C', system).value)}°`;
  const mm = (v: number) => `${v.toLocaleString(locale, { maximumFractionDigits: 1 })} mm`;
  const row = (label: string, value: string, selectable = false) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, minHeight: 28, alignItems: 'baseline' }}>
    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
    <Text selectable={selectable} style={{ color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
  </View>;

  // Procedencia de un pronóstico guardado: antigüedad respecto de la medición y distancia al punto.
  const reuseText = (r: ForecastReuse) => {
    const minutes = capturedAt ? Math.max(0, Math.round((Date.parse(capturedAt) - Date.parse(r.fetchedAt)) / 60000)) : NaN;
    const age = !Number.isFinite(minutes) ? t('antes', 'earlier') : minutes < 60
      ? t(`${minutes} min antes de medir`, `${minutes} min before measuring`)
      : t(`${Math.floor(minutes / 60)} h ${minutes % 60} min antes de medir`, `${Math.floor(minutes / 60)} h ${minutes % 60} min before measuring`);
    const where = r.distanceM < 50 ? t('en este mismo punto', 'at this same point') : t(`a ${r.distanceM} m de este punto`, `${r.distanceM} m from this point`);
    return t(`Máxima, mínima y lluvia en mm. Sin conexión: es el pronóstico de Open-Meteo que se descargó ${age}, ${where}.`,
      `High, low and rain in mm. Offline: this is the Open-Meteo forecast downloaded ${age}, ${where}.`);
  };

  const nowKind = now ? weatherKind(now.weatherCode) ?? weatherKind(now.today.weatherCode) : null;
  // Sin tiempo actual (p. ej. un pronóstico guardado, que no reutiliza el «ahora») la tarjeta es
  // el resumen del día: no se rotula como «ahora» ni se dice «Sin dato».
  const hasCurrent = !!now && [now.temperatureC, now.weatherCode, now.precipitationMm].some(v => v != null);
  const raining = !!now && isRainingNow(now);
  // En un histórico el resumen se cuenta en pasado y nombra cada día, sin «mañana».
  const outlook = forecastOutlook(days, lang, historical);
  const windowComparison = compareForecastWindows(days, lang, historical);

  // --- Hoy · ahora: tiempo actual, lluvia reciente y el día completo ---
  const nowCard = now ? <Animated.View entering={enterDown(40)} style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: raining ? `${RAIN}88` : colors.border, backgroundColor: colors.card }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, backgroundColor: raining ? `${RAIN}1A` : 'transparent' }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: `${RAIN}22`, alignItems: 'center', justifyContent: 'center' }}>
        <WeatherGlyph kind={nowKind} size={44} color={colors.textSecondary} animate />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: raining ? RAIN : colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>
          {historical ? (hasCurrent ? t('AL MEDIR', 'AT CAPTURE') : t('ESE DÍA', 'THAT DAY'))
            : hasCurrent ? t('HOY · AHORA', 'TODAY · NOW') : t('HOY', 'TODAY')}
        </Text>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>
          {raining && !historical ? t('Está lloviendo', 'It is raining')
            : nowKind ? weatherKindLabel(nowKind, lang) : t('Tiempo actual', 'Current weather')}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
          {!hasCurrent ? t('Resumen del día, sin el tiempo de este momento', 'Day summary, without current conditions')
            : [now.temperatureC != null ? degrees(now.temperatureC) : null, raining && nowKind && !historical ? weatherKindLabel(nowKind, lang) : null].filter(Boolean).join(' · ') || missing}
        </Text>
      </View>
    </View>
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 18, paddingVertical: 12, gap: 4 }}>
      {now.precipitationMm != null && now.precipitationMm > 0 && row(
        now.precipitationMinutes ? t(`Lluvia últimos ${now.precipitationMinutes} min`, `Rain, last ${now.precipitationMinutes} min`) : t('Lluvia reciente', 'Recent rain'),
        mm(now.precipitationMm))}
      {row(historical ? t('Ese día', 'That day') : t('Hoy', 'Today'),
        [now.today.precipitationMm != null ? mm(now.today.precipitationMm) : null,
          now.today.rainProbabilityPct != null ? t(`${now.today.rainProbabilityPct} % de prob.`, `${now.today.rainProbabilityPct} % chance`) : null].filter(Boolean).join(' · ') || missing)}
      {row(t('Mínima / máxima', 'Low / high'), `${degrees(now.today.minimumTemperatureC)} / ${degrees(now.today.maximumTemperatureC)}`)}
    </View>
    {/* La conclusión cierra la misma tarjeta en vez de ocupar otra: es la lectura
        del pronóstico, no un dato aparte. */}
    {!!outlook && <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 18, paddingVertical: 12, gap: 4 }}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{outlook}</Text>
      {!!windowComparison && <ScreenText>{windowComparison}</ScreenText>}
    </View>}
  </Animated.View> : null;

  // --- Próximos días: una columna por día, sin tarjetas ---
  const strip = <View style={{ flexDirection: 'row', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 12 }}>
    {days.map((d, i) => {
      const date = new Date(`${d.date}T12:00:00Z`);
      const kind = weatherKind(d.weatherCode) ?? (isRainyDay(d) ? 'rain' : null);
      return <View key={d.date} accessible accessibilityLabel={`${date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}: ${kind ? weatherKindLabel(kind, lang) + ', ' : ''}${d.precipitationMm != null ? mm(d.precipitationMm) + ', ' : ''}${degrees(d.minimumTemperatureC)} / ${degrees(d.maximumTemperatureC)}`}
        style={{ flex: 1, alignItems: 'center', gap: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.border }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' }}>
          {Number.isNaN(date.getTime()) ? d.date : (i === 0 && !historical ? t('Mañana', 'Tmrw') : SHORT_DAYS[lang][date.getUTCDay()])}
        </Text>
        <WeatherGlyph kind={kind} size={26} color={colors.textSecondary} />
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{shortDegrees(d.maximumTemperatureC)}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{shortDegrees(d.minimumTemperatureC)}</Text>
        <Text style={{ color: (d.precipitationMm ?? 0) > 0 ? RAIN : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
          {d.precipitationMm == null ? '–' : `${d.precipitationMm.toLocaleString(locale, { maximumFractionDigits: 1 })}`}
        </Text>
      </View>;
    })}
  </View>;

  return <View style={{ gap: 12 }}>
    {nowCard}
    {days.length ? <>
      {/* Sin tiempo actual no hay tarjeta donde apoyar la conclusión: va suelta y breve. */}
      {!nowCard && !!outlook && <Animated.View entering={enterDown(120)}>
        <ScreenText muted={false}>{outlook}</ScreenText>
      </Animated.View>}
      <Animated.View entering={enterDown(200)} style={{ gap: 8 }}>
        <ScreenLabel>{t('Próximos cinco días', 'Next five days')}</ScreenLabel>
        {strip}
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{reuse ? reuseText(reuse) : t('Máxima, mínima y lluvia en mm. Pronóstico de Open-Meteo para el punto medido.', 'High, low and rain in mm. Open-Meteo forecast for the measured point.')}</Text>
      </Animated.View>
    </> : !now && <View style={{ flexDirection: 'row', gap: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 }}>
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
  </View>;
}
