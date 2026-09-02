import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { joinDeviceByCode, registerDevice } from '../services/deviceService';
import { completeOnboarding } from '../services/onboardingService';
import { useAppStore } from '../store/useAppStore';
import {
  formatDeviceId,
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
}

export const OnboardingScreen: React.FC<Props> = ({ onComplete }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const setDevice = useAppStore((state) => state.setDevice);

  const [step, setStep] = useState<Step>('choice');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [joining, setJoining] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [pairingState, setPairingState] = useState<PairingState>('idle');
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
      setDevice(device);
      try {
        await completeOnboarding(method, device);
      } catch (error) {
        // La membresía recién creada también es persistente y el router la usa
        // como respaldo. No dejamos al usuario atrapado por un perfil antiguo.
        console.warn('[TerraSense] No se pudo guardar el sello de onboarding:', error);
      }
      onComplete(device);
    },
    [onComplete, setDevice],
  );

  const openQr = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          t('La cámara está desactivada', 'Camera is disabled'),
          t('Activa el permiso de cámara en los ajustes del teléfono para escanear el QR del equipo.', 'Enable camera permission in phone settings to scan the device QR.'),
          [
            { text: t('Ahora no', 'Not now'), style: 'cancel' },
            { text: t('Abrir ajustes', 'Open settings'), onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
    }
    setScanned(false);
    setStep('qr');
  }, [cameraPermission?.granted, requestCameraPermission, t]);

  const handleBarcode = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanned || joining) return;
      setScanned(true);

      const code = parseDeviceQrPayload(data);
      if (!code) {
        Alert.alert(
          t('QR no reconocido', 'QR not recognized'),
          t('Este código no pertenece a un equipo TerraSense. Pide al administrador que abra “Mis equipos” y muestre el QR de la sonda.', 'This code does not belong to a TerraSense device. Ask the administrator to open “My devices” and show the probe QR.'),
          [{ text: t('Escanear otra vez', 'Scan again'), onPress: () => setScanned(false) }],
        );
        return;
      }

      setJoining(true);
      try {
        const device = await joinDeviceByCode(code);
        await finish('qr', device);
      } catch (error) {
        Alert.alert(t('No se pudo vincular', 'Could not link'), friendlyError(error), [
          { text: t('Reintentar', 'Try again'), onPress: () => setScanned(false) },
        ]);
      } finally {
        setJoining(false);
      }
    },
    [finish, friendlyError, joining, scanned, t],
  );

  const startPairing = useCallback(async () => {
    setPairingState('scanning');
    try {
      // Importación diferida: Expo Go no incluye el módulo nativo de BLE.
      const ble = await import('../services/bleService');
      const granted = await ble.requestBlePermissions();
      if (!granted) {
        throw new Error(t('Necesitamos permiso de Bluetooth para encontrar la sonda cercana.', 'Bluetooth permission is required to find the nearby probe.'));
      }
      const found = await ble.pairWithNearbyProbe();
      setProbe(found);
      setDeviceName(found.name);
      setPairingState('found');
    } catch (error) {
      setPairingState('idle');
      Alert.alert(t('No encontramos la sonda', 'Probe not found'), friendlyError(error));
    }
  }, [friendlyError, t]);

  const savePairedProbe = useCallback(async () => {
    if (!probe) return;
    setPairingState('saving');
    try {
      const code = probe.assignedCode ?? generateDeviceId();

      if (!probe.assignedCode) {
        const ble = await import('../services/bleService');
        await ble.provisionProbe(probe.bleId, code);
        // Conserva el código para que un fallo de red posterior sea reintentable
        // sin volver a provisionar ni crear otra identidad.
        setProbe((current) => (current ? { ...current, assignedCode: code } : current));
      }

      // El mismo código queda en NVS y en Supabase. El trigger convierte a
      // este usuario en owner y la restricción UNIQUE impide doble propiedad.
      const device = await registerDevice(deviceName, code);
      await finish('pairing', device);
    } catch (error) {
      setPairingState('found');
      Alert.alert(t('No se pudo registrar el equipo', 'Could not register device'), friendlyError(error));
    }
  }, [deviceName, finish, friendlyError, probe, t]);

  const backToChoice = useCallback(() => {
    if (joining || pairingState === 'saving') return;
    setStep('choice');
    setScanned(false);
    setPairingState('idle');
    setProbe(null);
  }, [joining, pairingState]);

  if (step === 'qr') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={backToChoice} style={styles.headerButton} hitSlop={12}>
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
            {t('La persona que administra la sonda debe abrir “Mis equipos” en su app y mostrarte el QR. Al escanearlo quedarás vinculado como operador.', 'The probe administrator must open “My devices” in their app and show you the QR. Scanning it links you as an operator.')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'pairing') {
    const waiting = pairingState === 'scanning' || pairingState === 'saving';
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={backToChoice} style={styles.headerButton} hitSlop={12}>
            <Text style={[Typography.bodyBold, { color: colors.primary }]}>‹ {t('Volver', 'Back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Configurar sonda', 'Set up probe')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.pairingContent}>
          <View style={[styles.pairIcon, { backgroundColor: colors.card }]}>
            <Text style={styles.pairIconText}>{probe ? '✓' : '◉'}</Text>
          </View>
          <Text style={[styles.pairingTitle, { color: colors.text }]}>{t('Eres el primer usuario', 'You are the first user')}</Text>
          <Text style={[styles.pairingText, { color: colors.textSecondary }]}>
            {t('Enciende la sonda y mantén presionado el botón PAIR durante 3 segundos. Acércala a menos de 2 metros del teléfono.', 'Turn on the probe and hold the PAIR button for 3 seconds. Keep it within 2 meters of the phone.')}
          </Text>

          {probe ? (
            <View style={[styles.foundCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Text style={[styles.foundLabel, { color: colors.primary }]}>{t('SONDA ENCONTRADA', 'PROBE FOUND')}</Text>
              <Text style={[styles.foundName, { color: colors.text }]}>{probe.name}</Text>
              <Text style={[styles.bleId, { color: colors.textMuted }]} numberOfLines={1}>
                Bluetooth: {probe.bleId}
              </Text>
              <TextInput
                value={deviceName}
                onChangeText={setDeviceName}
                placeholder={t('Nombre de la sonda', 'Probe name')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                accessibilityLabel={t('Nombre de la sonda', 'Probe name')}
              />
              <TouchableOpacity
                onPress={savePairedProbe}
                disabled={waiting}
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: waiting ? 0.65 : 1 }]}
              >
                {pairingState === 'saving' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('Terminar configuración', 'Finish setup')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={startPairing}
              disabled={waiting}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: waiting ? 0.65 : 1 }]}
            >
              {pairingState === 'scanning' ? (
                <View style={styles.inlineBusy}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>{t('Buscando sonda…', 'Searching for probe…')}</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>{t('Buscar mi sonda', 'Find my probe')}</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.choiceContent}>
        <Text style={styles.logo}>🌱</Text>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('BIENVENIDO A TERRASENSE', 'WELCOME TO TERRASENSE')}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t('Conecta tu primera sonda', 'Connect your first probe')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('Elige la opción que corresponda. Sólo tendrás que hacerlo una vez con esta cuenta.', 'Choose the option that applies. You only need to do this once for this account.')}
        </Text>

        <TouchableOpacity
          onPress={openQr}
          style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.primaryDark }]}>
            <Text style={styles.optionIconText}>▦</Text>
          </View>
          <View style={styles.optionCopy}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Escanear QR', 'Scan QR')}</Text>
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>
              {t('Ya existe un administrador del equipo. Pídele que te muestre su QR para entrar como operador.', 'The device already has an administrator. Ask them to show you the QR to join as an operator.')}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setStep('pairing')}
          style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.primaryDark }]}>
            <Text style={styles.optionIconText}>⌁</Text>
          </View>
          <View style={styles.optionCopy}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Configurar equipo nuevo', 'Set up new device')}</Text>
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>
              {t('Eres el primer usuario de la sonda. Conéctala por Bluetooth para quedar como propietario.', 'You are the probe’s first user. Connect it by Bluetooth to become its owner.')}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 60,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 82, minHeight: Spacing.touchTarget, justifyContent: 'center' },
  headerTitle: { ...Typography.titleMedium },
  choiceContent: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: Spacing.md },
  eyebrow: { ...Typography.badge, textAlign: 'center', letterSpacing: 1.4 },
  title: { ...Typography.titleLarge, fontSize: 30, textAlign: 'center', marginTop: Spacing.sm },
  subtitle: { ...Typography.bodyRegular, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  optionCard: {
    minHeight: 142,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  optionIconText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  optionCopy: { flex: 1, marginLeft: Spacing.md },
  optionTitle: { ...Typography.titleMedium, marginBottom: Spacing.xs },
  optionText: { ...Typography.caption },
  chevron: { fontSize: 34, marginLeft: Spacing.sm },
  cameraWrap: { flex: 1, margin: Spacing.md, borderRadius: Spacing.cardRadius, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  scannerFrame: { width: 242, height: 242, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 24 },
  cameraBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.62)', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  cameraBusyText: { ...Typography.bodyBold, color: '#FFFFFF' },
  explanation: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  explanationTitle: { ...Typography.titleMedium, marginBottom: Spacing.xs },
  explanationText: { ...Typography.bodyRegular },
  pairingContent: { padding: Spacing.lg, alignItems: 'stretch', paddingBottom: Spacing.xxl },
  pairIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: Spacing.lg },
  pairIconText: { fontSize: 44, color: '#2E8B5A', fontWeight: '700' },
  pairingTitle: { ...Typography.titleLarge, textAlign: 'center', marginTop: Spacing.lg },
  pairingText: { ...Typography.bodyRegular, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  primaryButton: { minHeight: 56, borderRadius: Spacing.borderRadius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  primaryButtonText: { ...Typography.button, color: '#FFFFFF' },
  inlineBusy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  foundCard: { borderWidth: 2, borderRadius: Spacing.cardRadius, padding: Spacing.md },
  foundLabel: { ...Typography.badge },
  foundName: { ...Typography.titleMedium, marginTop: Spacing.xs },
  bleId: { ...Typography.caption, marginTop: 2, marginBottom: Spacing.md },
  input: { height: 54, borderWidth: 1, borderRadius: Spacing.borderRadius, paddingHorizontal: Spacing.md, ...Typography.bodyRegular, marginBottom: Spacing.md },
  introContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  introTitle: { ...Typography.titleLarge, fontSize: 32, textAlign: 'center', marginBottom: Spacing.md },
  introBody: { ...Typography.bodyRegular, textAlign: 'center', marginBottom: Spacing.xxl },
  dotsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  dot: { width: 10, height: 10, borderRadius: 5 },
  introFooter: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
});
