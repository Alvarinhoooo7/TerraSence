import { useResetGuide } from '../components/guide/GuideContext';
import { GuideTouchable as TouchableOpacity, GuidePressable as Pressable, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BarcodeScanningResult } from 'expo-camera';
import { GuideCamera as CameraView } from '../components/guide/GuideCamera';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { enterDown, layoutFlow } from '../constants/motion';
import * as Haptics from 'expo-haptics';

import { Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppIcon } from '../components/AppIcon';
import { SoilArtwork, authStyles } from '../components/auth/AuthUI';
import { EntryLayout, EntryHeading, EntryButton } from '../components/entry/EntryUI';
import { AccessField } from '../components/auth/AccessField';
import { newPendingTarget } from '../utils/approvalFlow';
import { createQrScanGate } from '../utils/qrScanGate';
import { enableDevSkip } from '../utils/devSkipOnboarding';
import { createDeveloperTap } from '../utils/developerTap';
import { askForAccess } from '../components/permissionPrompt';
import { createAccountOperation } from '../utils/accountOperation';
import { PERMISSION_COPY, pick } from '../utils/permissionCopy';
import { requestDeviceAccess, registerDevice, listMyDevices, listMyDeviceMemberships, listPendingDeviceRequests } from '../services/deviceService';
import { WaitingApprovalScreen } from './WaitingApprovalScreen';
import { completeOnboarding } from '../services/onboardingService';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  parseDeviceQrPayload,
  parseDeviceInvite,
} from '../utils/deviceId';
import type { DeviceRow, OnboardingMethod } from '../types/app';

type Step = 'choice' | 'invite' | 'qr' | 'pairing';
type PairingState = 'idle' | 'scanning' | 'found' | 'saving';

interface ProbeIdentity {
  bleId: string;
  name: string;
  deviceCode: string;
}

interface Props {
  onComplete: (device: DeviceRow) => void;
  /** Sólo desarrollo: entra a Dashboard sin equipo. */
  onDevSkip?: () => void;
  onCancel?: () => void;
  addingDevice?: boolean;
}

export const OnboardingScreen: React.FC<Props> = ({ onComplete, onDevSkip, onCancel, addingDevice = false }) => {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const setDevice = useAppStore((state) => state.setDevice);

  const [checkingRequests, setCheckingRequests] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [step, setStep] = useState<Step>('choice');
  const [pending, setPending] = useState(false);
  const [targetDeviceId, setTargetDeviceId] = useState<string | undefined>();
  const [joining, setJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const scanGate = useRef(createQrScanGate());
  const operation = useRef(false);
  const mounted = useRef(true);
  // Cuenta y generación de las operaciones que esperan un permiso: al desmontar o cambiar de cuenta
  // ninguna continuación abre la cámara, inicia BLE ni escribe estado.
  const accountOperation = useRef(createAccountOperation(useAuthStore.getState().session?.user.id, () => useAuthStore.getState().session?.user.id));
  const pairingRun = useRef(0);
  const finished = useRef(false);
  const skipFromLogo = async () => {
    if (!__DEV__ || !onDevSkip || operation.current || finished.current) return;
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) return;
    operation.current = true;
    finished.current = true;
    await enableDevSkip(userId);
    if (mounted.current) { setDevice(null); onDevSkip(); }
  };
  const logoTap = useRef(createDeveloperTap(__DEV__, () => { void skipFromLogo(); }));
  useEffect(() => { mounted.current = true; accountOperation.current.mount(); const unsubscribe = useAuthStore.subscribe(() => accountOperation.current.cancelIfAccountChanged()); return () => { mounted.current = false; unsubscribe(); scanGate.current.cancel(); accountOperation.current.unmount(); }; }, []);


  const rearmScanner = useCallback(() => {
    if (!mounted.current || !accountOperation.current.begin()()) return;
    scanGate.current.arm();
    setScanned(false);
  }, []);
  const [pairingState, setPairingState] = useState<PairingState>('idle');
  useResetGuide(`${step}:${pairingState}`);
  const [probe, setProbe] = useState<ProbeIdentity | null>(null);


  const friendlyError = useCallback((error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error);
    if (/native module|null|BleManager/i.test(message)) {
      return t(
        'El pairing Bluetooth requiere una compilación de desarrollo o la app instalada; no funciona dentro de Expo Go.',
        'Bluetooth pairing requires a development build or the installed app; it does not work inside Expo Go.',
      );
    }
    return message;
  }, [t]);

  const finish = useCallback(
    async (method: OnboardingMethod, device: DeviceRow) => {
      const active = accountOperation.current.begin();
      if (!active() || finished.current) return;
      finished.current = true;
      if (!addingDevice) setDevice(device);
      try {
        if (!addingDevice) await completeOnboarding(method, device);
      } catch (error) {
        console.warn('[TerraSense] No se pudo guardar el sello de onboarding:', error);
      }
      if (active()) onComplete(device);
    },
    [onComplete, setDevice, addingDevice],
  );

  useEffect(() => {
    const accountActive = accountOperation.current.begin();
    let active = true;
    let polling = false;
    const check = async () => {
      if (polling || operation.current || finished.current) return;
      polling = true;
      try {
        if (addingDevice) {
          await listMyDevices();
          if (!active || !accountActive()) return;
          setCheckFailed(false);
          return;
        }
        const memberships = await listMyDeviceMemberships();
        if (!active || !accountActive() || operation.current || finished.current) return;
        setPending(!memberships.some(m => m.is_authorized) && memberships.some(m => !m.is_authorized));
        if (memberships.some(m => m.is_authorized)) {
          const devices = await listMyDevices();
          if (active && accountActive() && !operation.current && devices[0]) await finish('qr', devices[0]);
        }
        setCheckFailed(false);
      } catch { if (active && accountActive()) setCheckFailed(true); }
      finally { polling = false; if (active) setCheckingRequests(false); }
    };
    void check();
    const timer = addingDevice ? undefined : setInterval(() => void check(), 10000);
    return () => { active = false; clearInterval(timer); };
  }, [finish, addingDevice, checkAttempt]);

  const openQr = useCallback(async () => {
    if (operation.current) return;
    operation.current = true;
    const active = accountOperation.current.begin();
    try {
      // Se pide al tocar «Escanear QR». Si no se concede, el código de invitación
      // de esta misma pantalla sigue disponible: no se envía a Ajustes.
      const access = await askForAccess('camera', language, active);
      if (!active()) return;
      if (!access.ok) {
        if (access.deniedNow) Alert.alert(pick(PERMISSION_COPY.camera.name, language), pick(PERMISSION_COPY.camera.denied, language));
        return;
      }
      scanGate.current.arm(true);
      setScanned(false);
      setStep('qr');
    } catch {
      if (active()) Alert.alert(t('No pudimos abrir la cámara', 'Could not open camera'), t('Revisa los permisos del teléfono e inténtalo otra vez.', 'Check phone permissions and try again.'));
    } finally { if (active()) operation.current = false; }
  }, [language, t]);

  const handleBarcode = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      const active = accountOperation.current.begin();
      if (!active() || operation.current || !scanGate.current.accept(data)) return;
      setScanned(true);
      const code = parseDeviceQrPayload(data);
      if (!code) {
        scanGate.current.reject(data);
        Alert.alert(
          t('QR no reconocido', 'QR not recognized'),
          t('Este código no pertenece a un equipo TerraSense. Pide a un miembro aprobado que abra “Configuración > Equipos y datos > Compartir acceso” y muestre el QR de la sonda.', 'This code does not belong to a TerraSense device. Ask an approved member to open “Settings > Devices and data > Share access” and show the probe QR.'),
          [{ text: t('Escanear otra vez', 'Scan again'), onPress: () => { if (active()) rearmScanner(); } }],
        );
        return;
      }

      operation.current = true;
      setJoining(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      try {
        const before = addingDevice ? await listPendingDeviceRequests() : [];
        if (!active()) return;
        const device = await requestDeviceAccess(code);
        if (!active()) return;
        if (device) await finish('qr', device);
        else {
          const after = await listPendingDeviceRequests();
          if (!active()) return;
          setTargetDeviceId(newPendingTarget(before, after));
          setPending(true); setStep('choice');
        }
      } catch (error) {
        if (!active()) return;
        Alert.alert(t('No se pudo vincular', 'Could not link'), friendlyError(error), [
          { text: t('Reintentar', 'Try again'), onPress: () => { if (active()) rearmScanner(); } },
        ]);
      } finally {
        if (active()) { operation.current = false; setJoining(false); }
      }
    },
    [finish, friendlyError, rearmScanner, t],
  );

  const joinByCode = async () => {
    if (operation.current || finished.current) return;
    const token = parseDeviceInvite(inviteCode);
    if (!token) {
      Alert.alert(t('Código de invitación inválido', 'Invalid invitation code'), t('Copia el código temporal que aparece junto al QR. El número de serie de la sonda no sirve para solicitar acceso.', 'Copy the temporary code displayed beside the QR. The probe serial number cannot request access.'));
      return;
    }
    const active = accountOperation.current.begin();
    operation.current = true;
    setJoining(true);
    try {
      const before = addingDevice ? await listPendingDeviceRequests() : [];
      if (!active()) return;
      const device = await requestDeviceAccess(token);
      if (!active()) return;
      if (device) await finish('qr', device);
      else {
          const after = await listPendingDeviceRequests();
          if (!active()) return;
          setTargetDeviceId(newPendingTarget(before, after));
          setPending(true); setStep('choice');
        }
    } catch (error) {
      if (active()) Alert.alert(t('No se pudo solicitar acceso', 'Could not request access'), friendlyError(error));
    } finally {
      if (active()) { operation.current = false; setJoining(false); }
    }
  };

  const startPairing = useCallback(async () => {
    if (operation.current) return;
    const run = ++pairingRun.current;
    operation.current = true;
    const active = accountOperation.current.begin();
    try {
      const access = await askForAccess('bluetooth', language, active);
      if (!active()) return;
      // Un estado que no se pudo consultar no es un rechazo: la búsqueda informa el error real.
      if (!access.ok && !access.unknown) {
        if (access.deniedNow) Alert.alert(pick(PERMISSION_COPY.bluetooth.name, language), pick(PERMISSION_COPY.bluetooth.denied, language));
        return;
      }
      setPairingState('scanning');
      const ble = await import('../services/bleService');
      if (!active()) { if (mounted.current && pairingRun.current === run) setPairingState('idle'); return; }
      const found = await ble.pairWithNearbyProbe(active.signal);
      if (!active()) { if (mounted.current && pairingRun.current === run) setPairingState('idle'); return; }
      if (!found.pairingOpen) {
        throw new Error(t('Mantén el botón PAIR de la sonda 3 segundos, hasta que la luz azul parpadee, y vuelve a buscar.', 'Hold the probe PAIR button for 3 seconds, until the blue light blinks, and search again.'));
      }
      setProbe(found);

      setPairingState('found');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      if (!active()) { if (mounted.current && pairingRun.current === run) setPairingState('idle'); return; }
      setPairingState('idle');
      Alert.alert(t('No encontramos la sonda', 'Probe not found'), friendlyError(error));
    } finally { if (pairingRun.current === run) operation.current = false; }
  }, [friendlyError, language, t]);

  const savePairedProbe = useCallback(async () => {
    if (!probe || operation.current) return;
    const active = accountOperation.current.begin();
    operation.current = true;
    setPairingState('saving');
    try {
      const device = await registerDevice(probe.name.trim() || t('Sonda TerraSense', 'TerraSense probe'), probe.deviceCode);
      if (!active()) return;
      // Aviso en la sonda (verde y buzzer); no retiene ni deshace el registro.
      void import('../services/bleService').then((ble) => ble.confirmPairing(probe.bleId, probe.deviceCode)).catch(() => {});
      await finish('pairing', device);
    } catch (error) {
      if (!active()) return;
      setPairingState('found');
      Alert.alert(t('No se pudo registrar el equipo', 'Could not register device'), friendlyError(error));
    } finally { if (active()) operation.current = false; }
  }, [finish, friendlyError, probe, t]);

  const backToChoice = useCallback(() => {
    if (pairingState === 'saving') return;
    pairingRun.current += 1;
    accountOperation.current.cancel();
    operation.current = false;
    setJoining(false);
    setStep('choice');
    scanGate.current.cancel();
    setScanned(false);
    setPairingState('idle');
    setProbe(null);
  }, [joining, pairingState]);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pairingState === 'saving') return true;
      if (step !== 'choice') { backToChoice(); return true; }
      if (onCancel) { accountOperation.current.cancel(); scanGate.current.cancel(); onCancel(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [step, joining, pairingState, backToChoice, onCancel]);

  if (pending) return <WaitingApprovalScreen onApproved={device => void finish('qr', device)} addingDevice={addingDevice} targetDeviceId={targetDeviceId} onCancel={onCancel} onDismiss={() => setPending(false)} />;
  if (checkingRequests) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></SafeAreaView>;

  if (checkFailed) return <EntryLayout footer={<EntryButton label={t('Reintentar', 'Try again')} onPress={() => { setCheckingRequests(true); setCheckAttempt(value => value + 1); }} />}><EntryHeading title={t('No pudimos revisar tu cuenta.', 'Could not check your account.')} description={t('Revisa tu conexión e inténtalo otra vez.', 'Check your connection and try again.')} /></EntryLayout>;

  if (step === 'invite') return <EntryLayout keyboardAware header={<EntryButton secondary label={t('Volver', 'Back')} onPress={backToChoice} />}
    footer={<EntryButton label={t('Solicitar acceso', 'Request access')} busy={joining} disabled={!inviteCode.trim()} onPress={() => { void joinByCode(); }} />}>
    <View style={{ gap: 18 }}>
      <EntryHeading eyebrow={t('EQUIPO COMPARTIDO', 'SHARED DEVICE')} title={t('Usa tu invitación.', 'Use your invitation.')}
        description={t('Pide el QR o código temporal en Configuración > Equipos y datos > Compartir acceso. El administrador debe aprobar tu solicitud.', 'Ask for the QR or temporary code in Settings > Devices and data > Share access. The administrator must approve your request.')} />
      <EntryButton secondary label={t('Escanear QR', 'Scan QR')} disabled={joining} onPress={() => { void openQr(); }} />
      <AccessField label={t('Código de invitación', 'Invitation code')} value={inviteCode} onChangeText={setInviteCode} editable={!joining} maxLength={100} autoCapitalize="none" autoCorrect={false} />
    </View>
  </EntryLayout>;

  if (step === 'qr') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" onPress={backToChoice} style={styles.headerButton} hitSlop={12}>
            <Text style={[Typography.bodyBold, { color: colors.primary }]}>‹ {t('Volver', 'Back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Escanear QR', 'Scan QR')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcode}
          />
          <View style={styles.scannerFrame} />
          {joining && (
            <View style={styles.cameraBusy}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.cameraBusyText}>{t('Solicitando acceso…', 'Requesting access…')}</Text>
            </View>
          )}
        </View>

        <View style={styles.explanation}>
          <Text style={[styles.explanationTitle, { color: colors.text }]}>{t('Pídeselo a un miembro del equipo', 'Ask a team member')}</Text>
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
            {t('Un miembro aprobado debe abrir “Configuración > Equipos y datos > Compartir acceso” en su app y mostrarte el QR. Al escanearlo solicitarás acceso al administrador.', 'An approved member must open “Settings > Devices and data > Share access” in their app and show you the QR. Scanning it requests administrator approval.')}
          </Text>
        </View>
        </ScrollView></View>
      </SafeAreaView>
    );
  }

  if (step === 'pairing') {
    const waiting = pairingState === 'scanning' || pairingState === 'saving';
    return <EntryLayout header={<EntryButton secondary label={t('Volver', 'Back')} disabled={pairingState === 'saving'} onPress={backToChoice} />}
      footer={<EntryButton label={probe ? t('Confirmar y vincular', 'Confirm and link') : t('Buscar mi sonda', 'Find my probe')} busy={waiting} onPress={() => { void (probe ? savePairedProbe() : startPairing()); }} />}>
      <View style={{ gap: 18 }}>
        <EntryHeading eyebrow={t('VINCULA TU SONDA', 'PAIR YOUR PROBE')} title={probe ? t('La encontramos.', 'There it is.') : t('Prepara tu sonda.', 'Prepare your probe.')}
          description={probe ? t('Comprueba su identidad y confirma la vinculación.', 'Check its identity and confirm pairing.') : t('Enciéndela, mantén PAIR por 3 segundos y acércala a menos de 2 metros del teléfono.', 'Turn it on, hold PAIR for 3 seconds and keep it within 2 meters of your phone.')} />
        {waiting ? <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
          <AppIcon name="probe" color={colors.primary} size={64} /><ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.text }}>{pairingState === 'saving' ? t('Vinculando…', 'Linking…') : t('Buscando sonda…', 'Searching for probe…')}</Text>
        </View> : <SoilArtwork variant={1} compact />}
        {probe && <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{probe.name || t('Sonda TerraSense', 'TerraSense probe')}</Text><Text selectable style={{ color: colors.textSecondary }}>ID: {probe.deviceCode}</Text></View>}
        <Text style={{ color: colors.textSecondary }}>{t('Si es un equipo nuevo, tu cuenta quedará como administradora.', 'If this is a new device, your account will become its administrator.')}</Text>
      </View>
    </EntryLayout>;
  }

  return <EntryLayout header={onCancel ? <EntryButton secondary label={t('Volver', 'Back')} onPress={() => { accountOperation.current.cancel(); scanGate.current.cancel(); onCancel(); }} /> : undefined}>
    <EntryHeading eyebrow={t('TU CUENTA ESTÁ LISTA', 'YOUR ACCOUNT IS READY')} title={t('Ahora, tu sonda.', 'Now, your probe.')}
      description={t('Vincula un equipo para comenzar. Elige cómo te vas a conectar.', 'Link a device to get started. Choose how you will connect.')} />
    {/* Gesto sólo de desarrollo (sección 9): diez toques entran a Dashboard sin equipo. */}
    {__DEV__ && onDevSkip
      ? <Pressable guide={false} accessibilityRole="button" accessibilityLabel="TerraSense" onPress={() => { if (!operation.current) logoTap.current(); }}><SoilArtwork variant={1} compact /></Pressable>
      : <SoilArtwork variant={1} compact />}
    <Animated.View layout={layoutFlow()} style={{ gap: 16 }}>
      <Animated.View entering={enterDown(100)}>
        <Pressable guideTitle={t("Usar invitación", "Use invitation")} guide={t("Solicita acceso con el QR o el código temporal de otro miembro del equipo.", "Requests access using another member’s temporary QR or code.")} onPress={() => { if (!operation.current) setStep('invite'); }} accessibilityRole="button"
          onPressIn={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: isDark ? colors.card : colors.background,
              borderColor: pressed ? colors.primary : colors.border,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            }
          ]}>
          <View style={{ gap: 16, flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[authStyles.eyebrow, { color: colors.primary }]}>{t('EQUIPO COMPARTIDO', 'SHARED DEVICE')}</Text>
              <AppIcon name="arrow" color={colors.primary} size={20} />
            </View>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Tengo una invitación', 'I have an invitation')}</Text>
            <Text style={[authStyles.body, { color: colors.textSecondary }]}>{t('Escanea el QR o escribe el código temporal de un miembro del equipo. El administrador revisará tu solicitud.', 'Scan a team member’s QR or enter their temporary code. The administrator will review your request.')}</Text>
          </View>
        </Pressable>
      </Animated.View>
      <Animated.View entering={enterDown(200)}>
        <Pressable guideTitle={t("Configurar equipo nuevo", "Set up new device")} guide={t("Inicia la vinculación Bluetooth de una sonda nueva para registrarte como administrador.", "Starts Bluetooth pairing of a new probe to register you as administrator.")} onPress={() => { if (!operation.current) setStep('pairing'); }} accessibilityRole="button"
          onPressIn={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: isDark ? colors.card : colors.background,
              borderColor: pressed ? colors.primary : colors.border,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            }
          ]}>
          <View style={{ gap: 16, flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[authStyles.eyebrow, { color: colors.primary }]}>{t('EQUIPO NUEVO', 'NEW DEVICE')}</Text>
              <AppIcon name="probe" color={colors.primary} size={20} />
            </View>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Configurar mi sonda', 'Set up my probe')}</Text>
            <Text style={[authStyles.body, { color: colors.textSecondary }]}>{t('Conéctala por Bluetooth para registrar el equipo y comenzar a usarlo.', 'Connect over Bluetooth to register the device and start using it.')}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  </EntryLayout>;

};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 72, minHeight: 48, justifyContent: 'center' },
  headerTitle: { ...Typography.titleMedium, flexShrink: 1 },
  optionCard: { minHeight: 120, borderRadius: 20, borderWidth: 1.5, padding: 16, flexDirection: 'row', alignItems: 'center' },
  optionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.5 },
  cameraWrap: { flex: 1, minHeight: 240, margin: 24, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  scannerFrame: { width: '75%', aspectRatio: 1, maxWidth: 260, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 24 },
  cameraBusy: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(18,40,31,.8)', alignItems: 'center', justifyContent: 'center', gap: 16 },
  cameraBusyText: { ...Typography.bodyBold, color: '#FFFFFF' },
  explanation: { paddingHorizontal: 24, paddingBottom: 32, maxWidth: 520, alignSelf: 'center' },
  explanationTitle: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  explanationText: { ...Typography.bodyRegular, lineHeight: 24 },
});
