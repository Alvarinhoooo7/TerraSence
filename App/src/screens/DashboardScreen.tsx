import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuideTouchable as Button, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import { GuideModal } from '../components/guide/GuideModal';
import { GUIDE_BUTTON_SPACE } from '../components/screen/ScreenUI';
import { EntryButton } from '../components/entry/EntryUI';
import { AppIcon } from '../components/AppIcon';
import { ProbeGlyph } from '../components/art/ProbeGlyph';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SPLASH_BACKGROUND } from '../components/LoadingScreen';
import { useAppTheme } from '../hooks/useAppTheme';
import { Typography, type ThemeColors } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';
import { useLinkedDevices } from '../hooks/useLinkedDevices';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { rememberSelectedDevice } from '../services/deviceSelectionService';
import { listMyDeviceMemberships } from '../services/deviceService';
import { timedOperation } from '../utils/timedOperation';
import { formatDeviceId } from '../utils/deviceId';
import type { DeviceRow } from '../types/app';

interface Props { onStartMeasurement: () => void; onLinkDevice: () => void }
const mint = '#C5E8AF';

/** Inicio en verde de marca con tema oscuro; con tema claro, sobre el fondo claro de la app. */
function dashboardPalette(isDark: boolean, colors: ThemeColors) {
  return isDark
    ? { background: SPLASH_BACKGROUND, bar: '#1C3528', line: '#3B5646', accent: mint, muted: '#B2C9BB', strong: '#FFFFFF', title: '#F2F5F1', hint: '#C4D4C9', button: mint, buttonInk: SPLASH_BACKGROUND, ring: '#3B5646', halo: mint }
    : { background: colors.background, bar: colors.card, line: colors.border, accent: colors.primary, muted: colors.textSecondary, strong: colors.text, title: colors.text, hint: colors.textSecondary, button: colors.primary, buttonInk: '#FFFFFF', ring: colors.border, halo: colors.primary };
}

/** Espera máxima para confirmar el acceso a la sonda antes de medir; sin respuesta se mide con la última autorización conocida. */
const ACCESS_CHECK_TIMEOUT_MS = 3000;

const DISC_BG = '#17392C';
/** Tiempo de cada halo del botón Medir (ms). */
const HALO_MS = 2600;

/**
 * Botón Medir: un círculo con la sonda sobre el suelo y, montada en su borde inferior, la píldora con
 * la palabra. Es un solo control (el padre lo envuelve en un Button). El halo se abre cada 2,6 s y con
 * «reducir movimiento» no aparece.
 */
function MeasureDisc({ size, palette, label }: { size: number; palette: ReturnType<typeof dashboardPalette>; label: string }) {
  const reduced = useReducedMotion();
  const halo = useSharedValue(0);
  useEffect(() => {
    if (reduced) { halo.value = 0; return; }
    halo.value = 0;
    halo.value = withRepeat(withTiming(1, { duration: HALO_MS, easing: Easing.out(Easing.quad) }), -1, false);
  }, [halo, reduced]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: .7 * (1 - halo.value), transform: [{ scale: .86 + .26 * halo.value }] }));
  const outer = size + 28;
  const u = size / 236;
  return <View style={{ alignItems: 'center' }}>
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      {!reduced && <Animated.View accessible={false} importantForAccessibility="no-hide-descendants"
        style={[{ position: 'absolute', width: outer, height: outer, borderRadius: outer / 2, borderWidth: 2, borderColor: palette.halo }, haloStyle]} />}
      <View accessible={false} importantForAccessibility="no-hide-descendants"
        style={{ width: size + 18, height: size + 18, borderRadius: (size + 18) / 2, borderWidth: 1, borderColor: palette.ring, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bar }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: DISC_BG }}>
          <Svg width={size} height={size} viewBox="0 0 236 236">
            <Circle cx="118" cy="92" r="96" stroke="#2C5440" strokeWidth="1" fill="none" />
            <Circle cx="118" cy="92" r="62" stroke="#2C5440" strokeWidth="1" fill="none" />
            <ProbeGlyph x={118} y={30} scale={1.45} pinLength={50} />
            <Path d="M0 150Q59 138 118 152T236 146V236H0Z" fill="#355B41" />
            <Path d="M0 162Q59 152 118 166T236 158V236H0Z" fill="#6B6A45" />
            <Path d="M0 204Q59 194 118 208T236 200V236H0Z" fill="#54472F" />
          </Svg>
        </View>
      </View>
    </View>
    <View style={{ marginTop: -36 * u, minHeight: 60, paddingHorizontal: 46, borderRadius: 30, backgroundColor: palette.button, alignItems: 'center', justifyContent: 'center',
      borderWidth: 5, borderColor: palette.background }}>
      <Text style={{ color: palette.buttonInk, fontSize: 26, letterSpacing: -0.4, ...Typography.display.bold }}>{label}</Text>
    </View>
  </View>;
}

export function DashboardScreen({ onStartMeasurement, onLinkDevice }: Props) {
  const { colors, isDark } = useAppTheme(); const { t } = useTranslation();
  const palette = dashboardPalette(isDark, colors);
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
      // Con señal débil o sin red la consulta puede tardar en fallar: a los 3 s se mide igual.
      const roles = await timedOperation(listMyDeviceMemberships(), ACCESS_CHECK_TIMEOUT_MS, () => undefined, 'La conexión tardó demasiado.');
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
  return <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: palette.background }]}>
    {/* Barra superior: la sonda para medir (el único lugar donde se elige), vincular otra
        y, a la derecha, el lugar del botón «?» de la guía, que flota encima. */}
    <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: palette.bar, borderBottomColor: palette.line }]}><View style={styles.topBarRow}>
      <Button accessibilityRole="button" accessibilityState={{ expanded: selector }} accessibilityLabel={t('Elegir sonda para medir', 'Choose a probe for measurement')}
        guide={t('Aquí eliges la sonda para medir. Vinculada no significa conectada por Bluetooth.', 'Choose the probe to measure with here. Linked does not mean connected over Bluetooth.')}
        onPress={openSelector} style={styles.selector}>
        <View accessible={false} style={styles.probeBadge}><AppIcon name="probe" color={mint} /></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={[styles.eyebrow, { color: palette.muted }]}>{t('TU SONDA', 'YOUR PROBE')}</Text>
          <Text numberOfLines={1} style={[styles.deviceName, { color: palette.strong }]}>{device?.alias || device?.name || t('Elige una sonda', 'Choose a probe')}</Text>
          {device && <Text style={[styles.identifier, { color: palette.muted }]}>{formatDeviceId(device.device_code)}{device.battery_level != null ? ` · ${t(`batería ${device.battery_level} %`, `battery ${device.battery_level}%`)}` : ''}</Text>}
        </View><Text style={{ color: palette.accent, fontSize: 18 }}>▾</Text>
      </Button>
      <Button accessibilityRole="button" accessibilityLabel={t('Vincular otra sonda', 'Link another probe')}
        guide={t('Vincula otra sonda con su botón PAIR o con una invitación.', 'Link another probe with its PAIR button or an invitation.')}
        onPress={onLinkDevice} style={[styles.add, { borderColor: palette.line }]}><Text style={{ color: palette.accent, fontSize: 30, lineHeight: 34 }}>+</Text></Button>
      <View style={{ width: GUIDE_BUTTON_SPACE }} />
    </View></View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.center, { gap: compact ? 18 : 28 }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.title, fontSize: compact ? 30 : 38, lineHeight: compact ? 34 : 42 }, Typography.display.bold]}>{t('Conoce tu suelo.', 'Know your soil.')}</Text>
      <Button accessibilityRole="button" accessibilityLabel={device ? t('Medir', 'Measure') : t('Elegir sonda para medir', 'Choose a probe to measure')} guide={t('Prepara una medición con la sonda indicada arriba.', 'Prepare a reading with the probe shown above.')}
        onPress={device ? () => void measure() : openSelector} disabled={checking} style={styles.measure}>
        <MeasureDisc size={compact ? 190 : 236} palette={palette} label={t('Medir', 'Measure')} />
      </Button>
      <Text style={[styles.hint, { color: palette.hint }]}>{device ? t('Acerca tu sonda para comenzar.', 'Bring your probe close to begin.') : t('Elige o vincula tu sonda para comenzar.', 'Choose or link your probe to begin.')}</Text>
      {!!notice && <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: palette.hint }]}>{notice}</Text>}
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
  probeBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: DISC_BG, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#B2C9BB', fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  deviceName: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  identifier: { color: '#B2C9BB', fontSize: 12, fontVariant: ['tabular-nums'] },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#F2F5F1', letterSpacing: -1, textAlign: 'center' },
  measure: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
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
