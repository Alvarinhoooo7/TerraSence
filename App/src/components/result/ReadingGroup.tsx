import React from 'react';
import { Typography } from '../../constants/theme';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../AppText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { parameterLabel, type ParameterPresentation } from '../../engine/measurementPresentation';
import { MetricBadge, MetricScale } from './ResultVisuals';
import { groupSummary } from './resultModel';

const RAIN = '#3B8FD9';
const FAMILY_ICON = {
  soil: 'M2 12c4-2 7-2 10 0s6 2 10 0M2 18h20M2 22h20',
  air: 'M3 8h11a3 3 0 1 0-3-3M3 13h16a3 3 0 1 1-3 3M3 18h7',
} as const;

/** Cómo se dibuja el estado de una variable: color, fondo del ícono y glifo. Siempre con texto, nunca sólo color. */
export function statusLook(m: ParameterPresentation, colors: ReturnType<typeof useAppTheme>['colors'], t: (es: string, en: string) => string) {
  if (m.value == null) return { text: t('Sin dato', 'No data'), glyph: '–', ink: colors.textSecondary, tone: colors.textSecondary, tint: colors.bubbleInactive };
  switch (m.status) {
    case 'OPTIMAL': return { text: t('Condición favorable', 'Favorable condition'), glyph: '✓', ink: colors.success, tone: colors.success, tint: colors.tintSuccess };
    case 'WARNING': return { text: t('Requiere atención', 'Needs attention'), glyph: '!', ink: colors.onTintWarning, tone: colors.onTintWarning, tint: colors.tintWarning };
    case 'CRITICAL': return { text: t('Condición limitante', 'Limiting condition'), glyph: '✕', ink: colors.danger, tone: colors.danger, tint: colors.tintDanger };
    default: return { text: t('Dato de contexto', 'Context data'), glyph: '', ink: colors.textSecondary, tone: colors.textSecondary, tint: colors.bubbleInactive };
  }
}

/**
 * Una tarjeta por familia (Suelo, Aire): el encabezado resume su estado y cada fila muestra
 * ícono, nombre, valor, escala y estado con glifo y texto. Tocar una fila abre el detalle.
 */
export function ReadingGroup({ family, entries, formatValue, onOpen }: {
  family: 'soil' | 'air'; entries: { m: ParameterPresentation; index: number }[];
  formatValue: (m: ParameterPresentation) => string; onOpen: (index: number) => void;
}) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  if (!entries.length) return null;
  const summary = groupSummary(entries.map(e => e.m));
  const summaryText = summary.kind === 'bad' ? (summary.count === 1 ? t('1 limitante', '1 limiting') : t(`${summary.count} limitantes`, `${summary.count} limiting`))
    : summary.kind === 'warn' ? (summary.count === 1 ? t('1 requiere atención', '1 needs attention') : t(`${summary.count} requieren atención`, `${summary.count} need attention`))
    : summary.kind === 'ok' ? (summary.withoutData ? t(`${summary.count} favorables · ${summary.withoutData} sin dato`, `${summary.count} favorable · ${summary.withoutData} no data`) : t('Todo favorable', 'All favorable'))
    : summary.kind === 'no_data' ? t('Sin dato', 'No data') : t('Datos de contexto', 'Context data');
  const summaryInk = summary.kind === 'bad' ? colors.danger : summary.kind === 'warn' ? colors.onTintWarning : summary.kind === 'ok' && !summary.withoutData ? colors.success : colors.textSecondary;
  const title = family === 'soil' ? t('Suelo', 'Soil') : t('Aire', 'Air');
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={family === 'soil' ? colors.secondary : RAIN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d={FAMILY_ICON[family]} /></Svg>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: 1.4 }}>{title.toUpperCase()}</Text>
      </View>
      <Text style={{ color: summaryInk, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{summaryText}</Text>
    </View>
    <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
      {entries.map(({ m, index }, i) => {
        const look = statusLook(m, colors, t);
        const stateful = m.status !== 'INFO' && m.value != null;
        return <React.Fragment key={m.key}>
          {i > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />}
          <Pressable accessibilityRole="button"
            accessibilityLabel={`${parameterLabel(m.key, language)}, ${formatValue(m)}, ${look.text}. ${t('Abrir detalle.', 'Open detail.')}`}
            onPress={() => onOpen(index)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 64, opacity: pressed ? .8 : 1 })}>
            <MetricBadge metric={m.key} tone={look.tone} background={look.tint} size={40} />
            <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <Text numberOfLines={2} style={{ flex: 1, color: colors.textSecondary, fontSize: 14 }}>{parameterLabel(m.key, language)}</Text>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 21, ...Typography.numeric.bold, letterSpacing: -0.3 }}>{formatValue(m)}</Text>
              </View>
              {stateful && <MetricScale metric={m.key} value={m.value} />}
              <Text style={{ color: look.ink, fontSize: 13, fontWeight: '700' }}>{look.glyph ? `${look.glyph} ` : ''}{look.text}</Text>
            </View>
            <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.primary, fontSize: 20 }}>›</Text>
          </Pressable>
        </React.Fragment>;
      })}
    </View>
  </View>;
}
