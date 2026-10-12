import React from 'react';
import { View } from 'react-native';
import { Text } from '../AppText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Batería de la sonda leída en esta captura. La sonda sólo informa su carga mientras está
 * conectada: el valor se renueva en cada medición o vinculación, no en segundo plano.
 */
export function BatteryBar({ percent }: { percent: number | null | undefined }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const known = typeof percent === 'number' && Number.isFinite(percent);
  const level = known ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
  const tone = !known ? colors.textSecondary : level <= 20 ? colors.danger : level <= 50 ? colors.warning : colors.success;
  return <View accessible accessibilityRole="text"
    accessibilityLabel={known ? t(`Batería de la sonda: ${level} %`, `Probe battery: ${level}%`) : t('Batería de la sonda sin dato', 'Probe battery unknown')}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 38, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: tone, padding: 2, justifyContent: 'center' }}>
        <View style={{ width: `${level}%`, height: '100%', borderRadius: 2.5, backgroundColor: tone }} />
      </View>
      <View style={{ width: 3, height: 7, marginLeft: 1.5, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: tone }} />
    </View>
    <Text style={{ color: known ? colors.text : colors.textSecondary, fontSize: 15, fontWeight: '700' }}>{known ? `${level} %` : '–'}</Text>
  </View>;
}
