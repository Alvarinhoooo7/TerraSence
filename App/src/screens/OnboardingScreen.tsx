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
import { AuthLayout, AuthHeading, AuthButton, AuthField, SoilArtwork, authStyles } from '../components/auth/AuthUI';
import { enableDevSkip } from '../utils/devSkipOnboarding';
import { createDeveloperTap } from '../utils/developerTap';
import { askForAccess } from '../components/permissionPrompt';
import { createAccountOperation } from '../utils/accountOperation';
import { PERMISSION_COPY, pick } from '../utils/permissionCopy';
import { requestDeviceAccess, registerDevice, listMyDevices, listMyDeviceMemberships } from '../services/deviceService';
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
}

export const OnboardingScreen: React.FC<Props> = ({ onComplete, onDevSkip }) => {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const setDevice = useAppStore((state) => state.setDevice);

  const [checkingRequests, setCheckingRequests] = useState(true);
  const [step, setStep] = useState<Step>('choice');
  const [pending, setPending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const scanLatch = useRef(false);
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
  useEffect(() => { mounted.current = true; accountOperation.current.mount(); const unsubscribe = useAuthStore.subscribe(() => accountOperation.current.cancelIfAccountChanged()); return () => { mounted.current = false; unsubscribe(); accountOperation.current.unmount(); }; }, []);
  const rejectedPayload = useRef<string | null>(null);

  const rearmScanner = useCallback(() => {
    scanLatch.current = false;
    setScanned(false);
  }, []);
  const [pairingState, setPairingState] = useState<PairingState>('idle');
  useResetGuide(`${step}:${pairingState}`);
  const [probe, setProbe] = useState<ProbeIdentity | null>(null);
  const [deviceName, setDeviceName] = useState(() => t('Mi sonda TerraSense', 'My TerraSense probe'));

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
      if (!mounted.current || finished.current) return;
      finished.current = true;
      setDevice(device);
      try {
        await completeOnboarding(method, device);
      } catch (error) {
        console.warn('[TerraSense] No se pudo guardar el sello de onboarding:', error);
      }
      if (mounted.current) onComplete(device);
    },
    [onComplete, setDevice],
  );

  useEffect(() => {
    let active = true;
    let polling = false;
    const check = async () => {
      if (polling || operation.current || finished.current) return;
      polling = true;
      try {
        const memberships = await listMyDeviceMemberships();
        if (!active || operation.current || finished.current) return;
        setPending(!memberships.some(m => m.is_authorized) && memberships.some(m => !m.is_authorized));
        if (memberships.some(m => m.is_authorized)) {
          const devices = await listMyDevices();
          if (active && !operation.current && devices[0]) await finish('qr', devices[0]);
        }
      } catch { }
      finally { polling = false; if (active) setCheckingRequests(false); }
    };
    void check();
    const timer = setInterval(() => void check(), 10000);
    return () => { active = false; clearInterval(timer); };
  }, [finish]);

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
      scanLatch.current = false;
      rejectedPayload.current = null;
      setScanned(false);
      setStep('qr');
    } catch {
      if (active()) Alert.alert(t('No pudimos abrir la cámara', 'Could not open camera'), t('Revisa los permisos del teléfono e inténtalo otra vez.', 'Check phone permissions and try again.'));
    } finally { operation.current = false; }
  }, [language, t]);

  const handleBarcode = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (!mounted.current || scanLatch.current || operation.current) return;
      if (rejectedPayload.current === data) return;
      scanLatch.current = true;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const code = parseDeviceQrPayload(data);
      if (!code) {
        rejectedPayload.current = data;
        Alert.alert(
          t('QR no reconocido', 'QR not recognized'),
          t('Este código no pertenece a un equipo TerraSense. Pide a un miembro aprobado que abra “Mis dispositivos” y muestre el QR de la sonda.', 'This code does not belong to a TerraSense device. Ask an approved member to open “My devices” and show the probe QR.'),
          [{ text: t('Escanear otra vez', 'Scan again'), onPress: rearmScanner }],
        );
        return;
      }

      operation.current = true;
      setJoining(true);
      try {
        const device = await requestDeviceAccess(code);
        if (!mounted.current) return;
        if (device) await finish('qr', device);
        else { setPending(true); setStep('choice'); }
      } catch (error) {
        if (!mounted.current) return;
        Alert.alert(t('No se pudo vincular', 'Could not link'), friendlyError(error), [
          { text: t('Reintentar', 'Try again'), onPress: rearmScanner },
        ]);
      } finally {
        operation.current = false;
        if (mounted.current) setJoining(false);
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
    operation.current = true;
    setJoining(true);
    try {
      const device = await requestDeviceAccess(token);
      if (!mounted.current) return;
      if (device) await finish('qr', device);
      else { setPending(true); setStep('choice'); }
    } catch (error) {
      if (mounted.current) Alert.alert(t('No se pudo solicitar acceso', 'Could not request access'), friendlyError(error));
    } finally {
      operation.current = false;
      if (mounted.current) setJoining(false);
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
      setDeviceName(found.name);
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
    if (!deviceName.trim()) {
      Alert.alert(t('Nombre de la sonda', 'Probe name'), t('Escribe un nombre para reconocer tu equipo.', 'Enter a name to identify your probe.'));
      return;
    }
    operation.current = true;
    setPairingState('saving');
    try {
      const device = await registerDevice(deviceName.trim(), probe.deviceCode);
      // Aviso en la sonda (verde y buzzer); no retiene ni deshace el registro.
      void import('../services/bleService').then((ble) => ble.confirmPairing(probe.bleId, probe.deviceCode));
      await finish('pairing', device);
    } catch (error) {
      if (!mounted.current) return;
      setPairingState('found');
      Alert.alert(t('No se pudo registrar el equipo', 'Could not register device'), friendlyError(error));
    } finally { operation.current = false; }
  }, [deviceName, finish, friendlyError, probe, t]);

  const backToChoice = useCallback(() => {
    if (joining || pairingState === 'saving') return;
    pairingRun.current += 1;
    accountOperation.current.cancel();
    operation.current = false;
    setStep('choice');
    scanLatch.current = false;
    setScanned(false);
    setPairingState('idle');
    setProbe(null);
  }, [joining, pairingState]);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (joining || pairingState === 'saving' || (operation.current && step !== 'pairing')) return true;
      if (step !== 'choice') { backToChoice(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [step, joining, pairingState, backToChoice]);

  if (pending) return <WaitingApprovalScreen onApproved={device => void finish('qr', device)} onDismiss={() => setPending(false)} />;
  if (checkingRequests) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></SafeAreaView>;

  if (step === 'invite') return <AuthLayout toolbar={<TouchableOpacity accessibilityRole="button" disabled={joining} onPress={backToChoice} style={authStyles.link}><Text style={{ color: colors.primary }}>{t('Volver', 'Back')}</Text></TouchableOpacity>}>
    <AuthHeading eyebrow={t('EQUIPO COMPARTIDO', 'SHARED DEVICE')} title={t('Usa tu invitación.', 'Use your invitation.')}
      description={t('Pide a un miembro aprobado que abra el QR en Mis dispositivos. Puedes escanearlo o escribir el código temporal de esa pantalla. El administrador deberá aprobar tu solicitud.', 'Ask an approved member to open the QR in My devices. Scan it or enter the temporary code from that screen. The administrator must approve your request.')} />
    <AuthButton secondary label={t('Escanear QR', 'Scan QR')} disabled={joining} onPress={() => { void openQr(); }} />
    <AuthField label={t('Código de invitación', 'Invitation code')} value={inviteCode} onChangeText={setInviteCode} editable={!joining} maxLength={100} autoCapitalize="none" autoCorrect={false} />
    <AuthButton label={t('Solicitar acceso', 'Request access')} busy={joining} disabled={!inviteCode.trim()} onPress={() => { void joinByCode(); }} />
  </AuthLayout>;

  if (step === 'qr') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" disabled={joining} onPress={backToChoice} style={styles.headerButton} hitSlop={12}>
            <Text style={[Typography.bodyBold, { color: colors.primary }]}>‹ {t('Volver', 'Back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Escanear QR', 'Scan QR')}</Text>
          <View style={styles.headerButton} />
        </View>

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
              <Text style={styles.cameraBusyText}>{t('Vinculando equipo…', 'Linking device…')}</Text>
            </View>
          )}
        </View>

        <View style={styles.explanation}>
          <Text style={[styles.explanationTitle, { color: colors.text }]}>{t('Pídeselo a un miembro del equipo', 'Ask a team member')}</Text>
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
            {t('Un miembro aprobado debe abrir “Mis dispositivos” en su app y mostrarte el QR. Al escanearlo solicitarás acceso al administrador.', 'An approved member must open “My devices” in their app and show you the QR. Scanning it requests administrator approval.')}
          </Text>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'pairing') {
    const waiting = pairingState === 'scanning' || pairingState === 'saving';
    return <AuthLayout toolbar={<TouchableOpacity accessibilityRole="button" disabled={pairingState === 'saving'} onPress={backToChoice} style={authStyles.link}>
      <Text style={{ color: colors.primary }}>{t('Volver', 'Back')}</Text>
    </TouchableOpacity>}>
      <AuthHeading eyebrow={t('VINCULA TU SONDA', 'PAIR YOUR PROBE')} title={probe ? t('La encontramos.', 'There it is.') : t('Acerca tu sonda.', 'Bring your probe closer.')}
        description={probe ? t('Dale un nombre para reconocerla cuando trabajes en el campo.', 'Give it a name you will recognize when working in the field.') : t('Enciéndela, mantén PAIR por 3 segundos y acércala a menos de 2 metros del teléfono.', 'Turn it on, hold PAIR for 3 seconds and keep it within 2 meters of your phone.')} />
      {pairingState === 'scanning' ? <Animated.View entering={enterDown()} layout={layoutFlow()} accessibilityLiveRegion="polite" style={{ alignItems: 'center', paddingVertical: 24 }}>
        <AppIcon name="probe" color={colors.primary} size={64} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      </Animated.View> : <SoilArtwork variant={1} />}
      {probe ? <Animated.View entering={enterDown()} layout={layoutFlow()} style={authStyles.form}>
        <View style={{ borderLeftWidth: 3, borderColor: colors.primary, paddingLeft: 16, gap: 8 }}>
          <Text style={[authStyles.eyebrow, { color: colors.primary }]}>{t('SONDA ENCONTRADA', 'PROBE FOUND')}</Text>
          <Text style={[authStyles.body, { color: colors.text }]}>{probe.name}</Text>
        </View>
        <AuthField label={t('Nombre de la sonda', 'Probe name')} value={deviceName} onChangeText={setDeviceName} editable={!waiting} autoCapitalize="sentences" maxLength={80} />
        <AuthButton label={t('Terminar configuración', 'Finish setup')} busy={waiting} onPress={() => { void savePairedProbe(); }} />
      </Animated.View> : <AuthButton label={pairingState === 'scanning' ? t('Buscando sonda…', 'Searching for probe…') : t('Buscar mi sonda', 'Find my probe')} busy={waiting} onPress={() => { void startPairing(); }} />}
      <Text style={[authStyles.body, { color: colors.textSecondary }]}>{t('Si es un equipo nuevo, tu cuenta quedará como administradora.', 'If this is a new device, your account will become its administrator.')}</Text>
    </AuthLayout>;
  }

  return <AuthLayout onBrandPress={__DEV__ && onDevSkip ? () => { if (!operation.current) logoTap.current(); } : undefined}>
    <AuthHeading eyebrow={t('TU CUENTA ESTÁ LISTA', 'YOUR ACCOUNT IS READY')} title={t('Ahora, tu sonda.', 'Now, your probe.')}
      description={t('Vincula un equipo para comenzar. Elige cómo te vas a conectar.', 'Link a device to get started. Choose how you will connect.')} />
    <SoilArtwork variant={1} compact />
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
  </AuthLayout>;

};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 72, minHeight: 48, justifyContent: 'center' },
  headerTitle: { ...Typography.titleMedium, flexShrink: 1 },
  optionCard: { minHeight: 160, borderRadius: 20, borderWidth: 1.5, padding: 24, flexDirection: 'row', alignItems: 'center' },
  optionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.5 },
  cameraWrap: { flex: 1, minHeight: 240, margin: 24, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  scannerFrame: { width: '75%', aspectRatio: 1, maxWidth: 260, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 24 },
  cameraBusy: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(18,40,31,.8)', alignItems: 'center', justifyContent: 'center', gap: 16 },
  cameraBusyText: { ...Typography.bodyBold, color: '#FFFFFF' },
  explanation: { paddingHorizontal: 24, paddingBottom: 32, maxWidth: 520, alignSelf: 'center' },
  explanationTitle: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  explanationText: { ...Typography.bodyRegular, lineHeight: 24 },
});
