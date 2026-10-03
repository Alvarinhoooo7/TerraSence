import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { ParameterKey } from '../../engine/measurementPresentation';

/**
 * Piezas gráficas del resultado. Sólo dibujan lo que ya trae la medición: el
 * estado lo decide el motor agronómico y las escalas son las físicas de cada
 * variable (0–100 % de humedad, 0–14 de pH), no umbrales propios.
 */

const ICONS: Partial<Record<ParameterKey, string>> = {
  vwc: 'M12 3C12 3 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 3 12 3Z',
  temp: 'M10 4a2 2 0 0 1 4 0v10.5a4 4 0 1 1-4 0ZM12 17V9',
  airTemp: 'M10 4a2 2 0 0 1 4 0v10.5a4 4 0 1 1-4 0ZM12 17V9',
  ph: 'M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7.5 15h9',
  ec: 'M13 2 4 14h7l-1 8 9-12h-7Z',
  airHumidity: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 11.5 3.5 3.5 0 0 1 17.5 18Z',
  airPressure: 'M4 17a8 8 0 1 1 16 0M12 17l4-5',
};
const LETTERS: Partial<Record<ParameterKey, string>> = { nitrogen: 'N', phosphorus: 'P', potassium: 'K' };

/** Ícono de la variable sobre un fondo teñido con el color de su estado. */
export function MetricBadge({ metric, tone, size = 44 }: { metric: ParameterKey; tone: string; size?: number }) {
  const icon = ICONS[metric];
  return <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: `${tone}22`, alignItems: 'center', justifyContent: 'center' }}>
    {icon
      ? <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke={tone} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d={icon} /></Svg>
      : <Text style={{ color: tone, fontSize: size * 0.42, fontWeight: '800' }}>{LETTERS[metric] ?? '•'}</Text>}
  </View>;
}

/** Anillo con cuántas variables quedaron en cada estado. */
export function StatusRing({ counts, size = 116 }: { counts: { ok: number; warn: number; bad: number }; size?: number }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const total = counts.ok + counts.warn + counts.bad;
  const r = 44; const c = 2 * Math.PI * r; const gap = total > 1 ? 4 : 0;
  let offset = 0;
  const segments = ([[counts.ok, colors.success], [counts.warn, colors.warning], [counts.bad, colors.danger]] as const).filter(([n]) => n > 0).map(([n, color]) => {
    const length = (n / total) * c;
    const segment = { color, dash: `${Math.max(length - gap, 0.1)} ${c}`, offset: -offset };
    offset += length;
    return segment;
  });
  return <View accessible accessibilityLabel={t(`${counts.ok} de ${total} variables en condición favorable`, `${counts.ok} of ${total} variables in favorable condition`)}
    style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
      <Circle cx="50" cy="50" r={r} stroke={colors.border} strokeWidth="9" fill="none" />
      {segments.map((s, i) => <Circle key={i} cx="50" cy="50" r={r} stroke={s.color} strokeWidth="9" fill="none" strokeLinecap="round"
        strokeDasharray={s.dash} strokeDashoffset={s.offset} transform="rotate(-90 50 50)" />)}
    </Svg>
    <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{counts.ok}<Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600' }}>/{total}</Text></Text>
    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('favorables', 'favorable')}</Text>
  </View>;
}

/** Barra de 0 a 100 %, para la humedad. */
export function PercentBar({ value, tone, labels = false }: { value: number; tone: string; labels?: boolean }) {
  const { colors } = useAppTheme();
  const pct = Math.max(0, Math.min(100, value));
  return <View style={{ gap: 4 }}>
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: tone }} />
    </View>
    {labels && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>0 %</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>100 %</Text>
    </View>}
  </View>;
}

/** Escala de pH de 0 a 14, de ácido a alcalino, con la lectura marcada. */
export function PhScale({ value, labels = false }: { value: number; labels?: boolean }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const at = Math.max(0, Math.min(14, value)) / 14;
  return <View style={{ gap: 4 }}>
    <View style={{ height: 16, justifyContent: 'center' }}>
      <Svg width="100%" height={8} preserveAspectRatio="none" viewBox="0 0 100 8">
        <Defs><LinearGradient id="ph" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#D9534F" /><Stop offset="0.3" stopColor="#E8A23B" /><Stop offset="0.5" stopColor="#6BBF59" />
          <Stop offset="0.72" stopColor="#3B8FD9" /><Stop offset="1" stopColor="#6E4BC2" />
        </LinearGradient></Defs>
        <Rect x="0" y="0" width="100" height="8" rx="4" fill="url(#ph)" />
      </Svg>
      <View style={{ position: 'absolute', left: `${at * 100}%`, marginLeft: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.card, borderWidth: 3, borderColor: colors.text }} />
    </View>
    {labels && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('Ácido', 'Acidic')}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('Neutro', 'Neutral')}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('Alcalino', 'Alkaline')}</Text>
    </View>}
  </View>;
}

/** Escala propia de la variable, si tiene una física evidente. */
export function MetricScale({ metric, value, tone, labels }: { metric: ParameterKey; value: number | null; tone: string; labels?: boolean }) {
  if (value == null) return null;
  if (metric === 'vwc' || metric === 'airHumidity') return <PercentBar value={value} tone={tone} labels={labels} />;
  if (metric === 'ph') return <PhScale value={value} labels={labels} />;
  return null;
}
