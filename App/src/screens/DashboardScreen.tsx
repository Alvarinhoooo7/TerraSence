import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuideTouchable as Button, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import { GuideModal } from '../components/guide/GuideModal';
import { BrandLogo } from '../components/BrandLogo';
import { AppIcon } from '../components/AppIcon';
import { SPLASH_BACKGROUND } from '../components/LoadingScreen';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useLinkedDevices } from '../hooks/useLinkedDevices';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { rememberSelectedDevice } from '../services/deviceSelectionService';
import { formatDeviceId } from '../utils/deviceId';
import type { DeviceRow } from '../types/app';

interface Props { onStartMeasurement: () => void; onLinkDevice: () => void }
const mint = '#C5E8AF';

export function DashboardScreen({ onStartMeasurement, onLinkDevice }: Props) {
  const { colors } = useAppTheme(); const { t } = useTranslation();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 700 || fontScale > 1.2;
  const device = useAppStore(s => s.device);
  const accountId = useAuthStore(s => s.session?.user.id);
  const { devices, loading, error, refresh } = useLinkedDevices();
  const [selector, setSelector] = useState(false); const [notice, setNotice] = useState('');
  useEffect(() => {
    if (loading || error || !device) return;
    const fresh = devices.find(d => d.id === device.id);
    if (!fresh) {
      useAppStore.getState().setDevice(null);
      setNotice(t('Esta sonda ya no está disponible. Elige otra para medir.', 'This probe is no longer available. Choose another to measure.'));
    } else if (fresh !== device) useAppStore.getState().setDevice(fresh);
  }, [devices, loading, error]);
  const choose = (next: DeviceRow) => {
    if (!accountId || useAuthStore.getState().session?.user.id !== accountId) return;
    useAppStore.getState().setDevice(next); setSelector(false); setNotice('');
    void rememberSelectedDevice(accountId, next.id).catch(() => {
      if (useAuthStore.getState().session?.user.id === accountId) setNotice(t('Sonda seleccionada. No se pudo recordar para el próximo inicio.', 'Probe selected. Could not remember it for the next launch.'));
    });
  };
  const openSelector = () => { setSelector(true); void refresh(); };
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
    <View style={styles.header}>
      <BrandLogo width={compact ? 130 : 156} onDark />
      <Button accessibilityRole="button" accessibilityLabel={t('Vincular otra sonda', 'Link another probe')} onPress={onLinkDevice} style={styles.add}><Text style={{ color: mint, fontSize: 28 }}>+</Text></Button>
    </View>
    <View style={styles.selectorContainer}><Button accessibilityRole="button" accessibilityState={{ expanded: selector }} accessibilityLabel={t('Elegir sonda para medir', 'Choose a probe for measurement')}
      guide={t('Aquí eliges la sonda para medir. Vinculada no significa conectada por Bluetooth.', 'Choose the probe to measure with here. Linked does not mean connected over Bluetooth.')}
      onPress={openSelector} style={styles.selector}>
      <AppIcon name="probe" color={mint} />
      <View style={{ flex: 1, gap: 4 }}><Text style={styles.eyebrow}>{t('TU SONDA', 'YOUR PROBE')}</Text>
        <Text numberOfLines={1} style={styles.deviceName}>{device?.alias || device?.name || t('Elige una sonda', 'Choose a probe')}</Text>
        {device && <Text style={styles.identifier}>{formatDeviceId(device.device_code)}</Text>}
      </View><Text style={{ color: mint, fontSize: 22 }}>⌄</Text>
    </Button></View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.center, { gap: compact ? 18 : 28 }]}>
      <Text accessibilityRole="header" style={[styles.title, { fontSize: compact ? 28 : 34 }]}>{t('Conoce tu suelo.', 'Know your soil.')}</Text>
      <View style={[styles.orbit, { padding: compact ? 14 : 22 }]}>
        <Button accessibilityRole="button" accessibilityLabel={device ? t('Medir', 'Measure') : t('Elegir sonda para medir', 'Choose a probe to measure')} guide={t('Prepara una medición con la sonda indicada arriba.', 'Prepare a reading with the probe shown above.')}
          onPress={device ? onStartMeasurement : openSelector} style={[styles.measure, { minWidth: compact ? 150 : 180, minHeight: compact ? 150 : 180 }]}>
          <AppIcon name="probe" color={SPLASH_BACKGROUND} size={compact ? 36 : 44} /><Text style={styles.measureText}>{t('Medir', 'Measure')}</Text>
        </Button>
      </View>
      <Text style={styles.hint}>{device ? t('Acerca tu sonda para comenzar.', 'Bring your probe close to begin.') : t('Elige o vincula tu sonda para comenzar.', 'Choose or link your probe to begin.')}</Text>
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.hint}>{notice}</Text>}
    </ScrollView>
    <GuideModal visible={selector} transparent animationType="fade" onRequestClose={() => setSelector(false)}>
      <SafeAreaView style={styles.backdrop}><View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>{t('Elegir sonda', 'Choose probe')}</Text><Button accessibilityRole="button" onPress={() => setSelector(false)} style={styles.close}><Text style={{ color: colors.primary }}>{t('Cerrar', 'Close')}</Text></Button></View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
          {loading && <ActivityIndicator color={colors.primary} accessibilityLabel={t('Cargando sondas', 'Loading probes')} />}
          {error && <><Text style={{ color: colors.textSecondary }}>{t('No pudimos actualizar la lista. La última selección se conserva.', 'Could not update the list. Your last selection is retained.')}</Text><Button onPress={() => void refresh()} style={styles.close}><Text style={{ color: colors.primary }}>{t('Reintentar', 'Retry')}</Text></Button></>}
          {!loading && !error && !devices.length && <Text style={{ color: colors.textSecondary }}>{t('Aún no tienes sondas autorizadas.', 'You have no authorized probes yet.')}</Text>}
          {devices.map(d => <Button key={d.id} accessibilityRole="radio" accessibilityState={{ selected: d.id === device?.id }} onPress={() => choose(d)} style={[styles.deviceRow, { borderColor: d.id === device?.id ? colors.primary : colors.border, backgroundColor: colors.card }]}>
            <View style={{ flex: 1, gap: 6 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{d.alias || d.name}</Text><Text style={{ color: colors.textSecondary }}>{formatDeviceId(d.device_code)}</Text></View>{d.id === device?.id && <Text style={{ color: colors.primary }}>✓</Text>}
          </Button>)}
        </ScrollView>
        <Button onPress={() => { setSelector(false); onLinkDevice(); }} style={[styles.link, { backgroundColor: colors.primary }]}><Text style={{ color: colors.background, fontWeight: '700', fontSize: 16 }}>{t('Vincular otra sonda', 'Link another probe')}</Text></Button>
      </View></SafeAreaView>
    </GuideModal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SPLASH_BACKGROUND },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, minHeight: 64, width: '100%', maxWidth: 520, alignSelf: 'center' },
  add: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  selectorContainer: { width: '100%', maxWidth: 520, paddingHorizontal: 24, alignSelf: 'center' },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3B5646', backgroundColor: '#1C3528' },
  eyebrow: { color: '#B2C9BB', fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  deviceName: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  identifier: { color: '#B2C9BB', fontSize: 12, fontVariant: ['tabular-nums'] },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#F2F5F1', fontWeight: '700', letterSpacing: -1, textAlign: 'center' },
  orbit: { borderWidth: 1, borderColor: '#3B5646', borderRadius: 150 },
  measure: { borderRadius: 120, backgroundColor: mint, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 10 },
  measureText: { color: SPLASH_BACKGROUND, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  hint: { color: '#C4D4C9', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'center', padding: 24 },
  sheet: { maxHeight: '90%', width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sheetTitle: { fontSize: 24, fontWeight: '700', flex: 1 },
  close: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  deviceRow: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  link: { minHeight: 54, borderRadius: 16, padding: 12, justifyContent: 'center', alignItems: 'center' },
});
