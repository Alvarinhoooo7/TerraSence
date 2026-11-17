import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../AppText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { parameterLabel, type ParameterPresentation } from '../../engine/measurementPresentation';

/**
 * Nitrógeno, fósforo y potasio: tres casillas neutras con nombre, valor y unidad. Son valores de
 * referencia derivados de la conductividad: sin color de estado, sin semáforo y sin dosis.
 */
export function NutrientGroup({ entries, formatParts, onOpen }: {
  entries: { m: ParameterPresentation; index: number }[];
  formatParts: (m: ParameterPresentation) => { number: string; unit: string } | null;
  onOpen: (index: number) => void;
}) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  if (!entries.length) return null;
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 19C-1 5 12 3 21 3 21 15 17 23 5 19ZM5 19 15 9" /></Svg>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: 1.4 }}>{t('NUTRIENTES', 'NUTRIENTS')}</Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{t('Valores de referencia', 'Reference values')}</Text>
    </View>
    <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {entries.map(({ m, index }) => {
          const parts = formatParts(m);
          const name = parameterLabel(m.key, language);
          return <Pressable key={m.key} accessibilityRole="button"
            accessibilityLabel={`${name}, ${parts ? `${parts.number} ${parts.unit}` : t('Sin dato', 'No data')}, ${t('valor de referencia', 'reference value')}. ${t('Abrir detalle.', 'Open detail.')}`}
            onPress={() => onOpen(index)}
            style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 96, borderRadius: 16, backgroundColor: colors.background, paddingVertical: 12, paddingHorizontal: 10, gap: 4, opacity: pressed ? .8 : 1 })}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.textSecondary, fontSize: 13 }}>{name}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>{parts ? parts.number : t('Sin dato', 'No data')}</Text>
            {!!parts && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{parts.unit}</Text>}
          </Pressable>;
        })}
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
        {t('Sirven para comparar entre mediciones del mismo punto. El análisis de laboratorio fija el punto de referencia.',
          'They are useful to compare readings of the same point. A laboratory analysis sets the reference point.')}
      </Text>
    </View>
  </View>;
}
