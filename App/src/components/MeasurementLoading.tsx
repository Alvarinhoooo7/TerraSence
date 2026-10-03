import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from './BrandLogo';
import { SPLASH_BACKGROUND } from './LoadingScreen';
import { GuideTouchable } from './guide/GuideControls';
import { useTranslation } from '../hooks/useTranslation';

export function MeasurementLoading({ reading, deviceName, onCancel }: { reading: boolean; deviceName: string; onCancel: () => void }) {
  const { t } = useTranslation();
  return <SafeAreaView style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 24 }}>
      <BrandLogo width={240} onDark />
      <ActivityIndicator size="large" color="#6EE7B7" />
      <Text accessibilityLiveRegion="polite" style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700', textAlign: 'center' }}>{reading ? t('Leyendo el suelo', 'Reading the soil') : t('Conectando con la sonda', 'Connecting to the probe')}</Text>
      <Text style={{ color: '#D8E8DF', fontSize: 16, textAlign: 'center' }}>{deviceName}</Text>
      <Text style={{ color: '#D8E8DF', fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 360 }}>{reading ? t('Mantén la sonda insertada y quieta.', 'Keep the probe inserted and still.') : t('Mantén el equipo encendido y cerca del teléfono.', 'Keep the device on and near your phone.')}</Text>
    </ScrollView>
    <View style={{ padding: 24 }}><GuideTouchable accessibilityRole="button" onPress={onCancel} style={{ minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#6EE7B7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{t('Cancelar', 'Cancel')}</Text></GuideTouchable></View>
  </SafeAreaView>;
}
