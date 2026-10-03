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
import { EntryHeading, EntryButton } from '../components/entry/EntryUI';
import { ScreenCard, ScreenLabel, ScreenLayout, ScreenOption, ScreenText, ScreenTopBar, ScreenValue } from '../components/screen/ScreenUI';
import { BrandLoading } from '../components/LoadingScreen';
import { ProbeWait } from '../components/MeasurementLoading';
import { InviteArt, NewProbeArt, PairPrepareArt, ProbeFoundArt } from '../components/pairing/PairingArt';
import { formatDeviceId } from '../utils/deviceId';
import { AccessField } from '../components/auth/AccessField';
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
        const access = await requestDeviceAccess(code);
        if (!active()) return;
        if (access.device) await finish('qr', access.device);
        else {
          // El servicio identifica la sonda aunque la solicitud ya existiera o se apruebe
          // mientras tanto: la espera sigue a ese equipo y no a una diferencia de listas.
          setTargetDeviceId(access.deviceId);
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
      const access = await requestDeviceAccess(token);
      if (!active()) return;
      if (access.device) await finish('qr', access.device);
      else { setTargetDeviceId(access.deviceId); setPending(true); setStep('choice'); }
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
  if (checkingRequests) return <BrandLoading />;

  if (checkFailed) return <ScreenLayout align="center" eyebrow="TERRASENSE" title={t('No pudimos revisar tu cuenta.', 'Could not check your account.')}
    description={t('Revisa tu conexión e inténtalo otra vez.', 'Check your connection and try again.')}
    footer={<EntryButton label={t('Reintentar', 'Try again')} onPress={() => { setCheckingRequests(true); setCheckAttempt(value => value + 1); }} />} />;

  const eyebrowFlow = addingDevice ? t('VINCULAR OTRA SONDA', 'LINK ANOTHER PROBE') : t('VINCULA TU SONDA', 'LINK YOUR PROBE');
  // Opción ilustrada: la imagen arriba y el texto debajo, como las tarjetas de etapa.
  const artOption = (art: React.ReactNode, title: string, subtitle: string, onPress: () => void) => <TouchableOpacity accessibilityRole="button" guideTitle={title} guide={subtitle} onPress={onPress}
    style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 8, gap: 10 }}>
    {art}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingBottom: 8 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{subtitle}</Text>
      </View>
      <Text style={{ color: colors.primary, fontSize: 26 }}>›</Text>
    </View>
  </TouchableOpacity>;

  if (step === 'invite') return <ScreenLayout keyboardAware onBack={backToChoice} eyebrow={eyebrowFlow} title={t('Usa tu invitación', 'Use your invitation')}
    description={t('Un miembro del equipo te la muestra en Configuración › Equipos y datos › Compartir acceso. El administrador aprueba tu solicitud.', 'A team member shows it in Settings › Devices and data › Share access. The administrator approves your request.')}
    footer={<EntryButton label={t('Solicitar acceso', 'Request access')} busy={joining} disabled={!inviteCode.trim()} onPress={() => { void joinByCode(); }} />}>
    <InviteArt />
    <ScreenOption title={t('Escanear el QR', 'Scan the QR')} subtitle={t('Con la cámara del teléfono.', 'With the phone camera.')} disabled={joining} onPress={() => { void openQr(); }} />
    <ScreenLabel>{t('O escribe el código', 'Or type the code')}</ScreenLabel>
    <AccessField label={t('Código de invitación', 'Invitation code')} value={inviteCode} onChangeText={setInviteCode} editable={!joining} maxLength={100} autoCapitalize="none" autoCorrect={false} />
  </ScreenLayout>;

  if (step === 'qr') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <ScreenTopBar onBack={backToChoice} />
          <EntryHeading eyebrow={eyebrowFlow} title={t('Escanea el QR', 'Scan the QR')} />
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
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{t('Solicitando acceso…', 'Requesting access…')}</Text>
            </View>
          )}
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 24, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <ScreenText>{t('Un miembro aprobado abre Configuración › Equipos y datos › Compartir acceso y te muestra el QR. Al escanearlo, el administrador recibe tu solicitud.', 'An approved member opens Settings › Devices and data › Share access and shows you the QR. Scanning it sends your request to the administrator.')}</ScreenText>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'pairing') {
    if (pairingState === 'saving') return <BrandLoading title={t('Vinculando tu sonda', 'Linking your probe')} detail={t('Registrando el equipo en tu cuenta.', 'Registering the device to your account.')} />;
    if (pairingState === 'scanning') return <ProbeWait reading={false} eyebrow={eyebrowFlow} onCancel={backToChoice}
      title={t('Buscando tu sonda', 'Looking for your probe')}
      detail={t('Con la ventana PAIR abierta (LED azul parpadeando) y a menos de 2 metros del teléfono.', 'With the PAIR window open (blue LED blinking) and within 2 meters of the phone.')} />;
    return <ScreenLayout onBack={backToChoice} eyebrow={eyebrowFlow}
      title={probe ? t('La encontramos', 'Found it') : t('Prepara tu sonda', 'Get your probe ready')}
      description={probe ? t('Comprueba que el ID sea el de tu equipo y confirma.', 'Check that the ID matches your device and confirm.') : undefined}
      footer={<EntryButton label={probe ? t('Confirmar y vincular', 'Confirm and link') : t('Buscar mi sonda', 'Find my probe')} onPress={() => { void (probe ? savePairedProbe() : startPairing()); }} />}>
      {probe ? <>
        <ProbeFoundArt />
        <ScreenCard accent={colors.success}>
          <ScreenValue label={t('Sonda', 'Probe')} value={probe.name || t('Sonda TerraSense', 'TerraSense probe')} />
          <ScreenValue label="ID" value={formatDeviceId(probe.deviceCode)} selectable />
        </ScreenCard>
      </> : <>
        <PairPrepareArt />
        {/* Los mismos pasos numerados que antes de medir. */}
        {[[t('Enciende la sonda', 'Turn the probe on'), t('Con la batería cargada o conectada.', 'With the battery charged or plugged in.')],
          [t('Mantén PAIR 3 segundos', 'Hold PAIR for 3 seconds'), t('Suelta cuando el LED azul parpadee: la ventana queda abierta unos minutos.', 'Release when the blue LED blinks: the window stays open for a few minutes.')],
          [t('Acércala a menos de 2 metros', 'Bring it within 2 meters'), t('Y toca «Buscar mi sonda».', 'Then tap "Find my probe".')]].map(([title, body], i) => <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
            <ScreenText>{body}</ScreenText>
          </View>
        </View>)}
      </>}
      <ScreenText>{t('Si es un equipo nuevo, tu cuenta quedará como su administradora.', 'If this is a new device, your account will become its administrator.')}</ScreenText>
    </ScreenLayout>;
  }

  return <ScreenLayout
    onBack={onCancel ? () => { accountOperation.current.cancel(); scanGate.current.cancel(); onCancel(); } : undefined}
    eyebrow={addingDevice ? t('VINCULAR OTRA SONDA', 'LINK ANOTHER PROBE') : t('TU CUENTA ESTÁ LISTA', 'YOUR ACCOUNT IS READY')}
    title={addingDevice ? t('¿Cómo la vinculas?', 'How will you link it?') : t('Ahora, tu sonda.', 'Now, your probe.')}
    description={addingDevice ? t('Elige si es un equipo compartido o uno nuevo.', 'Choose whether it is a shared device or a new one.') : t('Vincula un equipo para comenzar. Elige cómo te vas a conectar.', 'Link a device to get started. Choose how you will connect.')}
    // Gesto sólo de desarrollo (sección 9): diez toques en el título entran a Inicio sin equipo.
    onHeadingPress={__DEV__ && onDevSkip ? () => { if (!operation.current) logoTap.current(); } : undefined}>
    {artOption(<NewProbeArt />, t('Configurar una sonda nueva', 'Set up a new probe'),
      t('Equipo nuevo: se vincula por Bluetooth con su botón PAIR y quedas como administrador.', 'New device: links over Bluetooth with its PAIR button and you become the administrator.'),
      () => { if (!operation.current) setStep('pairing'); })}
    {artOption(<InviteArt />, t('Tengo una invitación', 'I have an invitation'),
      t('Equipo compartido: QR o código temporal de un miembro. El administrador aprueba tu solicitud.', 'Shared device: a member’s QR or temporary code. The administrator approves your request.'),
      () => { if (!operation.current) setStep('invite'); })}
  </ScreenLayout>;
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
