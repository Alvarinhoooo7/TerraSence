import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../AppText';
import { Colors } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import type { MeasurementPresentation, ParameterPresentation } from '../../engine/measurementPresentation';
import { verdictBar } from './resultModel';

// El panel usa siempre #17392C, como los de ilustración; sus colores de estado son los del tema
// oscuro, pensados para fondos oscuros, y cada estado lleva además ícono y texto.
const PANEL = '#17392C';
const PILL = '#1F4636';
const INK = '#E3F0D6';
const SOFT = '#C4D4C9';
const ON_PANEL = Colors.dark;

const ICON = {
  ok: <Path d="M5 12l5 5 9-10" />,
  warn: <Path d="M12 5v9M12 19h.01" />,
  bad: <Path d="M6 6l12 12M18 6L6 18" />,
  none: <Path d="M6 12h12" />,
} as const;

function Pill({ glyph, color, text }: { glyph: keyof typeof ICON; color: string; text: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: PILL }}>
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">{ICON[glyph]}</Svg>
    <Text style={{ color: INK, fontSize: 13, fontWeight: '600' }}>{text}</Text>
  </View>;
}

/**
 * Veredicto de la lectura sobre el panel verde: especie y etapa, el título que da el motor, una
 * barra con un segmento por variable con estado y lo capturado (fecha, coordenadas, precisión).
 * No calcula nada: cuenta el estado que ya trae cada variable. Con evaluación insuficiente, o
 * sin variables con estado, no hay barra: unos pocos conteos no deben parecer un diagnóstico.
 */
export function ResultHero({ presentation: p, stage, speciesName, capturedAt, latitude, longitude, accuracy }: {
  presentation: MeasurementPresentation; stage: string; speciesName: string | null; capturedAt: string | null;
  latitude?: number | null; longitude?: number | null; accuracy?: number | null;
}) {
  const { t, locale } = useTranslation();
  const bar = verdictBar(p);
  const segments = p.parameters.filter((m: ParameterPresentation) => m.value != null && m.status !== 'INFO' && !['nitrogen', 'phosphorus', 'potassium'].includes(m.key));
  const color = (m: ParameterPresentation) => m.status === 'CRITICAL' ? ON_PANEL.danger : m.status === 'WARNING' ? ON_PANEL.warning : ON_PANEL.success;
  const eyebrow = [speciesName, stage].filter(Boolean).join(' · ').toUpperCase();
  const when = capturedAt ? new Date(capturedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : t('Sin dato', 'No data');
  const where = latitude != null && longitude != null
    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${accuracy != null ? ` · ±${Math.round(accuracy)} m` : ''}`
    : t('Sin ubicación incluida', 'Location not included');
  const counts = bar?.counts;
  const summary = counts
    ? [t(`${counts.ok} de ${counts.total} variables en condición favorable`, `${counts.ok} of ${counts.total} variables in favorable condition`),
      counts.warn ? t(`${counts.warn} requiere atención`, `${counts.warn} need attention`) : null,
      counts.bad ? t(`${counts.bad} en condición limitante`, `${counts.bad} in limiting condition`) : null].filter(Boolean).join(', ')
    : undefined;
  return <View style={{ borderRadius: 26, backgroundColor: PANEL, padding: 22, gap: 14 }}>
    <Text style={{ color: '#C6DFB4', fontSize: 12, fontWeight: '700', letterSpacing: 1.4 }}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 }}>{p.title}</Text>
    {p.evaluationState === 'insufficient_data'
      ? <Text style={{ color: INK, fontSize: 16, fontWeight: '700' }}>{t('Evaluación insuficiente', 'Insufficient assessment')}</Text>
      : bar && counts && <>
        <View accessible accessibilityRole="image" accessibilityLabel={summary} style={{ flexDirection: 'row', gap: 5 }}>
          {segments.map(m => <View key={m.key} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: color(m) }} />)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {counts.ok > 0 && <Pill glyph="ok" color={ON_PANEL.success} text={counts.ok === 1 ? t('1 favorable', '1 favorable') : t(`${counts.ok} favorables`, `${counts.ok} favorable`)} />}
          {counts.warn > 0 && <Pill glyph="warn" color={ON_PANEL.warning} text={counts.warn === 1 ? t('1 requiere atención', '1 needs attention') : t(`${counts.warn} requieren atención`, `${counts.warn} need attention`)} />}
          {counts.bad > 0 && <Pill glyph="bad" color={ON_PANEL.danger} text={counts.bad === 1 ? t('1 limitante', '1 limiting') : t(`${counts.bad} limitantes`, `${counts.bad} limiting`)} />}
          {bar.withoutData > 0 && <Pill glyph="none" color={SOFT} text={t(`${bar.withoutData} sin dato`, `${bar.withoutData} no data`)} />}
        </View>
      </>}
    <Text selectable style={{ color: SOFT, fontSize: 13, lineHeight: 19 }}>{`${when} · ${where}`}</Text>
  </View>;
}
