import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuideTouchable as Button, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import { GuideModal } from '../components/guide/GuideModal';
import { GUIDE_BUTTON_SPACE } from '../components/screen/ScreenUI';
import { EntryButton } from '../components/entry/EntryUI';
import { AppIcon } from '../components/AppIcon';
import { SPLASH_BACKGROUND } from '../components/LoadingScreen';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useLinkedDevices } from '../hooks/useLinkedDevices';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { rememberSelectedDevice } from '../services/deviceSelectionService';
import { listMyDeviceMemberships } from '../services/deviceService';
import { formatDeviceId } from '../utils/deviceId';
import type { DeviceRow } from '../types/app';

interface Props { onStartMeasurement: () => void; onLinkDevice: () => void }
const mint = '#C5E8AF';

export function DashboardScreen({ onStartMeasurement, onLinkDevice }: Props) {
  const { colors } = useAppTheme(); const { t } = useTranslation();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 700 || fontScale > 1.2;
  const insets = useSafeAreaInsets();
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
  // Con Inicio a la vista, un acceso retirado se nota sin esperar a volver de otra pantalla.
  useEffect(() => { const timer = setInterval(() => void refresh(), 30000); return () => clearInterval(timer); }, [refresh]);
  // Antes de medir se confirma que el acceso a la sonda sigue vigente. Sin conexión se
  // mide igual con la última autorización conocida: la medición se guarda en el teléfono
  // y el servidor vuelve a validar el acceso al sincronizarla.
  const [checking, setChecking] = useState(false);
  const measure = async () => {
    if (!device || checking) return;
    setChecking(true);
    let allowed = true;
    try {
      const roles = await listMyDeviceMemberships();
      if (useAuthStore.getState().session?.user.id !== accountId) return;
      allowed = roles.some(m => m.device_id === device.id && m.is_authorized);
    } catch { /* sin conexión: se conserva la selección */ }
    finally { setChecking(false); }
    if (!allowed) {
      useAppStore.getState().setDevice(null);
      setNotice(t('Ya no tienes acceso a esta sonda. Elige otra para medir.', 'You no longer have access to this probe. Choose another to measure.'));
      void refresh();
      return;
    }
    onStartMeasurement();
  };
  return <SafeAreaView edges={['left', 'right']} style={styles.root}>
    {/* Barra superior: la sonda para medir (el único lugar donde se elige), vincular otra
        y, a la derecha, el lugar del botón «?» de la guía, que flota encima. */}
    <View style={[styles.topBar, { paddingTop: insets.top }]}><View style={styles.topBarRow}>
      <Button accessibilityRole="button" accessibilityState={{ expanded: selector }} accessibilityLabel={t('Elegir sonda para medir', 'Choose a probe for measurement')}
        guide={t('Aquí eliges la sonda para medir. Vinculada no significa conectada por Bluetooth.', 'Choose the probe to measure with here. Linked does not mean connected over Bluetooth.')}
        onPress={openSelector} style={styles.selector}>
        <AppIcon name="probe" color={mint} />
        <View style={{ flex: 1, gap: 2 }}><Text style={styles.eyebrow}>{t('TU SONDA', 'YOUR PROBE')}</Text>
          <Text numberOfLines={1} style={styles.deviceName}>{device?.alias || device?.name || t('Elige una sonda', 'Choose a probe')}</Text>
          {device && <Text style={styles.identifier}>{formatDeviceId(device.device_code)}</Text>}
        </View><Text style={{ color: mint, fontSize: 18 }}>▾</Text>
      </Button>
      <Button accessibilityRole="button" accessibilityLabel={t('Vincular otra sonda', 'Link another probe')}
        guide={t('Vincula otra sonda con su botón PAIR o con una invitación.', 'Link another probe with its PAIR button or an invitation.')}
        onPress={onLinkDevice} style={styles.add}><Text style={{ color: mint, fontSize: 30, lineHeight: 34 }}>+</Text></Button>
      <View style={{ width: GUIDE_BUTTON_SPACE }} />
    </View></View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.center, { gap: compact ? 18 : 28 }]}>
      <Text accessibilityRole="header" style={[styles.title, { fontSize: compact ? 28 : 34 }]}>{t('Conoce tu suelo.', 'Know your soil.')}</Text>
      <View style={[styles.orbit, { padding: compact ? 14 : 22 }]}>
        <Button accessibilityRole="button" accessibilityLabel={device ? t('Medir', 'Measure') : t('Elegir sonda para medir', 'Choose a probe to measure')} guide={t('Prepara una medición con la sonda indicada arriba.', 'Prepare a reading with the probe shown above.')}
          onPress={device ? () => void measure() : openSelector} disabled={checking} style={[styles.measure, { minWidth: compact ? 150 : 180, minHeight: compact ? 150 : 180 }]}>
          <AppIcon name="probe" color={SPLASH_BACKGROUND} size={compact ? 36 : 44} /><Text style={styles.measureText}>{t('Medir', 'Measure')}</Text>
        </Button>
      </View>
      <Text style={styles.hint}>{device ? t('Acerca tu sonda para comenzar.', 'Bring your probe close to begin.') : t('Elige o vincula tu sonda para comenzar.', 'Choose or link your probe to begin.')}</Text>
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.hint}>{notice}</Text>}
    </ScrollView>
    <GuideModal visible={selector} transparent animationType="slide" onRequestClose={() => setSelector(false)}>
      {/* Hoja inferior: tocar fuera la cierra. */}
      <View style={styles.backdrop}>
        <Button accessible={false} guide={false} onPress={() => setSelector(false)} style={{ flex: 1 }} />
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: 20 + insets.bottom }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{t('MEDIR CON', 'MEASURE WITH')}</Text>
              <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>{t('Elige tu sonda', 'Choose your probe')}</Text>
            </View>
            <Button accessibilityRole="button" onPress={() => setSelector(false)} style={styles.close}><Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('Cerrar', 'Close')}</Text></Button>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
            {loading && !devices.length && <ActivityIndicator color={colors.primary} accessibilityLabel={t('Cargando sondas', 'Loading probes')} />}
            {error && <View style={{ gap: 4 }}><Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>{t('No pudimos actualizar la lista. La última selección se conserva.', 'Could not update the list. Your last selection is retained.')}</Text><Button onPress={() => void refresh()} style={styles.close}><Text style={{ color: colors.primary, fontWeight: '600' }}>{t('Reintentar', 'Retry')}</Text></Button></View>}
            {!loading && !error && !devices.length && <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>{t('Aún no tienes sondas autorizadas. Vincula una para empezar a medir.', 'You have no authorized probes yet. Link one to start measuring.')}</Text>}
            {devices.map(d => { const marked = d.id === device?.id; return <Button key={d.id} accessibilityRole="radio" accessibilityState={{ selected: marked }} onPress={() => choose(d)}
              style={[styles.deviceRow, { borderColor: marked ? colors.primary : colors.border, borderWidth: marked ? 2 : 1, padding: marked ? 13 : 14, backgroundColor: colors.card }]}>
              <View style={styles.deviceBadge}><AppIcon name="probe" color={mint} size={26} /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: marked ? '700' : '600' }}>{d.alias || d.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] }}>{formatDeviceId(d.device_code)}</Text>
                {d.battery_level != null && <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t(`Batería ${d.battery_level} %`, `Battery ${d.battery_level}%`)}</Text>}
              </View>
              <View style={[styles.radio, { borderColor: marked ? colors.primary : colors.border, backgroundColor: marked ? colors.primary : 'transparent' }]}>
                {marked && <Text style={{ color: colors.background, fontSize: 14, fontWeight: '800' }}>✓</Text>}
              </View>
            </Button>; })}
          </ScrollView>
          <EntryButton secondary label={`+  ${t('Vincular otra sonda', 'Link another probe')}`} onPress={() => { setSelector(false); onLinkDevice(); }} />
        </View>
      </View>
    </GuideModal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SPLASH_BACKGROUND },
  topBar: { backgroundColor: '#1C3528', borderBottomWidth: 1, borderBottomColor: '#3B5646' },
  topBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 16, minHeight: 72, width: '100%', maxWidth: 560, alignSelf: 'center' },
  add: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: '#3B5646' },
  selector: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, minHeight: 56 },
  eyebrow: { color: '#B2C9BB', fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  deviceName: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  identifier: { color: '#B2C9BB', fontSize: 12, fontVariant: ['tabular-nums'] },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#F2F5F1', fontWeight: '700', letterSpacing: -1, textAlign: 'center' },
  orbit: { borderWidth: 1, borderColor: '#3B5646', borderRadius: 150 },
  measure: { borderRadius: 120, backgroundColor: mint, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 10 },
  measureText: { color: SPLASH_BACKGROUND, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  hint: { color: '#C4D4C9', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)' },
  sheet: { maxHeight: '85%', width: '100%', maxWidth: 560, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#17392C', alignItems: 'center', justifyContent: 'center' },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  close: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  deviceRow: { borderRadius: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
});
