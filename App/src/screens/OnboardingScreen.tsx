import { useResetGuide } from '../components/guide/GuideContext';
import { GuideTouchable as TouchableOpacity, GuidePressable as Pressable, GuideScrollView as ScrollView } from '../components/guide/GuideControls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
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
import { requestDeviceAccess, registerDevice, listMyDevices, listMyDeviceMemberships } from '../services/deviceService';
import { WaitingApprovalScreen } from './WaitingApprovalScreen';
import { completeOnboarding } from '../services/onboardingService';
import { useAppStore } from '../store/useAppStore';
import {
  generateDeviceId,
  parseDeviceQrPayload,
} from '../utils/deviceId';
import type { DeviceRow, OnboardingMethod } from '../types/app';

type Step = 'choice' | 'qr' | 'pairing';
type PairingState = 'idle' | 'scanning' | 'found' | 'saving';

interface ProbeIdentity {
  bleId: string;
  name: string;
  assignedCode: string | null;
}

interface Props {
  onComplete: (device: DeviceRow) => void;
  /** Solo desarrollo: entra sin equipo, en modo demostracion. */
  onDevSkip?: () => void;
}

export const OnboardingScreen: React.FC<Props> = ({ onComplete, onDevSkip }) => {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const setDevice = useAppStore((state) => state.setDevice);

  const [checkingRequests, setCheckingRequests] = useState(true);
  const [step, setStep] = useState<Step>('choice');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [pending, setPending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scanLatch = useRef(false);
  const operation = useRef(false);
  const mounted = useRef(true);
  const finished = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
    try {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!mounted.current) return;
        if (!result.granted) {
          Alert.alert(
            t('La cámara está desactivada', 'Camera is disabled'),
            t('Activa el permiso de cámara en los ajustes del teléfono para escanear el QR del equipo.', 'Enable camera permission in phone settings to scan the device QR.'),
            [
              { text: t('Ahora no', 'Not now'), style: 'cancel' },
              { text: t('Abrir ajustes', 'Open settings'), onPress: () => void Linking.openSettings().catch(() => undefined) },
            ],
          );
          return;
        }
      }
      scanLatch.current = false;
      rejectedPayload.current = null;
      setScanned(false);
      setStep('qr');
    } catch {
      if (mounted.current) Alert.alert(t('No pudimos abrir la cámara', 'Could not open camera'), t('Revisa los permisos del teléfono e inténtalo otra vez.', 'Check phone permissions and try again.'));
    } finally { operation.current = false; }
  }, [cameraPermission?.granted, requestCameraPermission, t]);

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
          t('Este código no pertenece a un equipo TerraSense. Pide al administrador que abra “Mis equipos” y muestre el QR de la sonda.', 'This code does not belong to a TerraSense device. Ask the administrator to open “My devices” and show the probe QR.'),
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

  const startPairing = useCallback(async () => {
    if (operation.current) return;
    operation.current = true;
    setPairingState('scanning');
    try {
      const ble = await import('../services/bleService');
      const granted = await ble.requestBlePermissions();
      if (!mounted.current) return;
      if (!granted) {
        throw new Error(t('Necesitamos permiso de Bluetooth para encontrar la sonda cercana.', 'Bluetooth permission is required to find the nearby probe.'));
      }
      const found = await ble.pairWithNearbyProbe();
      if (!mounted.current) return;
      setProbe(found);
      setDeviceName(found.name);
      setPairingState('found');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      if (!mounted.current) return;
      setPairingState('idle');
      Alert.alert(t('No encontramos la sonda', 'Probe not found'), friendlyError(error));
    } finally { operation.current = false; }
  }, [friendlyError, t]);

  const savePairedProbe = useCallback(async () => {
    if (!probe || operation.current) return;
    if (!deviceName.trim()) {
      Alert.alert(t('Nombre de la sonda', 'Probe name'), t('Escribe un nombre para reconocer tu equipo.', 'Enter a name to identify your probe.'));
      return;
    }
    operation.current = true;
    setPairingState('saving');
    try {
      const code = probe.assignedCode ?? generateDeviceId();

      if (!probe.assignedCode) {
        const ble = await import('../services/bleService');
        await ble.provisionProbe(probe.bleId, code);
        if (!mounted.current) return;
        setProbe((current) => (current ? { ...current, assignedCode: code } : current));
      }

      const device = await registerDevice(deviceName.trim(), code);
      await finish('pairing', device);
    } catch (error) {
      if (!mounted.current) return;
      setPairingState('found');
      Alert.alert(t('No se pudo registrar el equipo', 'Could not register device'), friendlyError(error));
    } finally { operation.current = false; }
  }, [deviceName, finish, friendlyError, probe, t]);

  const backToChoice = useCallback(() => {
    if (joining || operation.current) return;
    setStep('choice');
    scanLatch.current = false;
    setScanned(false);
    setPairingState('idle');
    setProbe(null);
  }, [joining, pairingState]);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (operation.current || joining) return true;
      if (step !== 'choice') { backToChoice(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [step, joining, backToChoice]);

  if (pending) return <WaitingApprovalScreen onApproved={device => void finish('qr', device)} onDismiss={() => setPending(false)} />;
  if (checkingRequests) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></SafeAreaView>;

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
          <Text style={[styles.explanationTitle, { color: colors.text }]}>{t('Pídeselo al administrador', 'Ask the administrator')}</Text>
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
            {t('La persona que administra la sonda debe abrir “Mis equipos” en su app y mostrarte el QR. Al escanearlo solicitarás acceso al administrador.', 'The probe administrator must open “My devices” in their app and show you the QR. Scanning it requests administrator approval.')}
          </Text>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'pairing') {
    const waiting = pairingState === 'scanning' || pairingState === 'saving';
    return <AuthLayout toolbar={<TouchableOpacity accessibilityRole="button" disabled={waiting} onPress={backToChoice} style={authStyles.link}>
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

  return <AuthLayout>
    <AuthHeading eyebrow={t('TU CUENTA ESTÁ LISTA', 'YOUR ACCOUNT IS READY')} title={t('Ahora, tu sonda.', 'Now, your probe.')}
      description={t('Vincula un equipo para comenzar. Elige cómo te vas a conectar.', 'Link a device to get started. Choose how you will connect.')} />
    <SoilArtwork variant={1} compact />
    <Animated.View layout={layoutFlow()} style={{ gap: 16 }}>
      <Animated.View entering={enterDown(100)}>
        <Pressable guideTitle={t("Escanear invitación", "Scan invitation")} guide={t("Abre la cámara para solicitar acceso con el QR temporal de otro miembro del equipo.", "Opens the camera to request access using another member’s temporary QR.")} onPress={() => { void openQr(); }} accessibilityRole="button"
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
            <Text style={[authStyles.body, { color: colors.textSecondary }]}>{t('Escanea el QR de un miembro del equipo. El administrador revisará tu solicitud.', 'Scan a team member’s QR code. The administrator will review your request.')}</Text>
          </View>
        </Pressable>
      </Animated.View>
      <Animated.View entering={enterDown(200)}>
        <Pressable guideTitle={t("Configurar equipo nuevo", "Set up new device")} guide={t("Inicia la vinculación Bluetooth de una sonda nueva para registrarte como administrador.", "Starts Bluetooth pairing of a new probe to register you as administrator.")} onPress={() => { if (!operation.current) setStep('pairing'); }} accessibilityRole="button"
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
    {__DEV__ && onDevSkip && <AuthButton secondary label={t('Saltar vinculación · Desarrollo', 'Skip pairing · Development')} onPress={() => { void enableDevSkip().then(() => { if (mounted.current) onDevSkip(); }).catch(() => Alert.alert(t('No pudimos continuar', 'Could not continue'))); }} />}
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
