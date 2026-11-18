import React from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { Text } from './AppText';
import { GuideTouchable } from './guide/GuideControls';
import { ProbeGlyph } from './art/ProbeGlyph';
import { Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { isLowBattery } from '../utils/batteryWarning';

const PANEL = '#17392C';

/** Tarjeta de una sonda: panel verde con la sonda a la izquierda y, a la derecha, sus datos. La elegida para medir lleva «Para medir» y borde de 2. */
export function DeviceCard({ name, identifier, role, battery, lastSeen, forMeasuring, onPress }: {
  name: string; identifier: string; role: string; battery: number | null | undefined; lastSeen: string; forMeasuring: boolean; onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const known = typeof battery === 'number' && Number.isFinite(battery);
  const level = known ? Math.max(0, Math.min(100, Math.round(battery))) : 0;
  const low = known && isLowBattery(level);
  const tone = low ? colors.warning : colors.success;
  const batteryText = known ? `${level} %` : t('Sin dato', 'No data');
  const label = [name, identifier, role, `${t('Batería', 'Battery')}: ${batteryText}${low ? `, ${t('baja', 'low')}` : ''}`, lastSeen, forMeasuring ? t('Para medir', 'For measuring') : ''].filter(Boolean).join('. ');
  return <GuideTouchable guideTitle={name} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={{ flexDirection: 'row', borderRadius: 22, overflow: 'hidden', minHeight: 124, backgroundColor: colors.card,
      borderWidth: forMeasuring ? 2 : 1, borderColor: forMeasuring ? colors.primary : colors.border }}>
    <View accessible={false} style={{ width: 96, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={64} height={96} viewBox="0 0 64 96">
        <ProbeGlyph x={32} y={6} scale={0.7} pinLength={50} />
      </Svg>
    </View>
    <View style={{ flex: 1, padding: 14, gap: 4, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 17, ...Typography.display.bold }}>{name}</Text>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.primary, fontSize: 24 }}>›</Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13, ...Typography.numeric.medium }}>{identifier}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{role}</Text>
        {forMeasuring && <View style={{ paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999, backgroundColor: colors.tintSuccess }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('Para medir', 'For measuring')}</Text>
        </View>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
        {known && <View style={{ width: 64, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
          <View style={{ width: `${level}%`, height: '100%', backgroundColor: tone }} />
        </View>}
        <Text style={{ color: known ? (low ? colors.warning : colors.text) : colors.textSecondary, fontSize: 13, ...Typography.numeric.bold }}>
          {batteryText}{low ? ` · ${t('baja', 'low')}` : ''}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{lastSeen}</Text>
    </View>
  </GuideTouchable>;
}
