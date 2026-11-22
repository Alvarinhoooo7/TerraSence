import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { AppIcon } from './AppIcon';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Typography } from '../constants/theme';
import { formatAwakeCountdown, PROBE_AWAKE_GRACE_MS, PROBE_AWAKE_MARGIN_MS } from '../utils/probeWake';

/**
 * Cuánto le queda despierta a la sonda tras una medición: el contador, una barra que se vacía y
 * qué significa para el usuario. Al terminar la cuenta lo dice con palabras, no sólo con el cero.
 */
export function ProbeAwakeCard({ remainingMs, detail }: { remainingMs: number; detail: string }) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const asleep = remainingMs <= 0;
  const clock = formatAwakeCountdown(remainingMs);
  const fraction = Math.min(1, remainingMs / (PROBE_AWAKE_GRACE_MS - PROBE_AWAKE_MARGIN_MS));
  const ink = isDark ? colors.primaryLight : colors.primary;
  const label = asleep ? t('La sonda se durmió', 'The probe fell asleep') : t('Sonda despierta', 'Probe awake');
  const spoken = asleep ? label : t(`Sonda despierta: se dormirá en ${clock}`, `Probe awake: it will sleep in ${clock}`);
  return <View accessible accessibilityRole="timer" accessibilityLabel={`${spoken}. ${detail}`}
    style={{ borderRadius: 18, borderWidth: 1, borderColor: asleep ? colors.border : colors.scaleOk, backgroundColor: asleep ? colors.card : colors.tintSuccess, padding: 14, gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <AppIcon name={asleep ? 'probe' : 'check'} size={18} color={asleep ? colors.textSecondary : ink} />
        <Text style={{ color: asleep ? colors.text : ink, fontSize: 16, fontWeight: '700', flexShrink: 1 }}>{label}</Text>
      </View>
      {!asleep && <Text style={{ color: ink, fontSize: 20, ...Typography.numeric.bold }}>{clock}</Text>}
    </View>
    {!asleep && <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.card, overflow: 'hidden' }}>
      <View style={{ width: `${fraction * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
    </View>}
    <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>{detail}</Text>
  </View>;
}
