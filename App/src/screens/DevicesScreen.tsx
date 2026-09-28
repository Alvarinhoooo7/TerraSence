import { useResetGuide } from '../components/guide/GuideContext';
import { GuideModal as Modal } from '../components/guide/GuideModal';
import { GuideTouchable as TouchableOpacity, GuideScrollView as ScrollView, GuideInput as TextInput } from '../components/guide/GuideControls';
// src/screens/DevicesScreen.tsx
//
// Alta y selección de equipos. Adaptado de DevicePairingScreen.tsx de Akura.
// El alta nueva exige presencia BLE con la ventana PAIR abierta y registra
// en Supabase el ID que la sonda deriva de su MAC; un código existente sólo
// vincula operadores.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { GuideCamera as CameraView } from '../components/guide/GuideCamera';
import { RotatingDeviceQr } from '../components/RotatingDeviceQr';
import { WaitingApprovalScreen } from './WaitingApprovalScreen';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import {
  listMyDevices,
  listMyDeviceMemberships,
  registerDevice,
  requestDeviceAccess,
} from '../services/deviceService';
import { parseDeviceInvite, formatDeviceId } from '../utils/deviceId';
import { askForAccess } from '../components/permissionPrompt';
import { PERMISSION_COPY, pick } from '../utils/permissionCopy';
import type { DeviceMembershipRow, DeviceRow } from '../types/app';

interface Props {
  onClose: () => void;
}

export const DevicesScreen: React.FC<Props> = ({ onClose }) => {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();

  const { device: selected, setDevice } = useAppStore();
  const alive = useRef(true);
  const operation = useRef(false);
  const revision = useRef(0);
  const [memberships, setMemberships] = useState<DeviceMembershipRow[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [scanner, setScanner] = useState(false);
  const [pending, setPending] = useState(false);
  useResetGuide(String(pending));
  const [inviteCode, setInviteCode] = useState('');
  const [qrDevice, setQrDevice] = useState<DeviceRow | null>(null);
  const refresh = useCallback(async () => {
    const version = ++revision.current;
    setLoading(true); setLoadError(false);
    try {
      const [rows, roles] = await Promise.all([listMyDevices(), listMyDeviceMemberships()]);
      if (!alive.current || revision.current !== version) return;
      setDevices(rows); setMemberships(roles);
      const current = useAppStore.getState().device;
      if (current) setDevice(rows.find(d => d.id === current.id) ?? null);
    } catch (e) {
      if (alive.current) setLoadError(true);
    } finally {
      if (alive.current && revision.current === version) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    alive.current = true; void refresh();
    return () => { alive.current = false; revision.current++; };
  }, [refresh]);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => operation.current); return () => sub.remove(); }, []);

  const handleRegister = useCallback(async () => {
    if (operation.current) return; operation.current = true;
    setBusy(true);
    try {
      const access = await askForAccess('bluetooth', language);
      // Un estado que no se pudo consultar no es un rechazo: la búsqueda informa el error real.
      if (!access.ok && !access.unknown) {
        if (access.deniedNow) Alert.alert(pick(PERMISSION_COPY.bluetooth.name, language), pick(PERMISSION_COPY.bluetooth.denied, language));
        return;
      }
      const ble = await import('../services/bleService');
      const probe = await ble.pairWithNearbyProbe();
      if (!probe.pairingOpen) {
        throw new Error(t('Mantén el botón PAIR de la sonda 3 segundos, hasta que la luz azul parpadee, y vuelve a intentarlo.', 'Hold the probe PAIR button for 3 seconds, until the blue light blinks, and try again.'));
      }
      const d = await registerDevice(newName.trim() || probe.name, probe.deviceCode);
      // Aviso en la sonda (verde y buzzer); no retiene ni deshace el registro.
      void ble.confirmPairing(probe.bleId, probe.deviceCode);
      setNewName('');
      setDevice(d);
      await refresh();
      Alert.alert(
        t('Equipo registrado', 'Device registered'),
        t(
          `Su código es ${formatDeviceId(d.device_code)}.\n\nPara invitar a otra persona, muéstrale el QR temporal desde Mis dispositivos.`,
          `Its code is ${formatDeviceId(d.device_code)}.\n\nTo invite someone, show the temporary QR from My devices.`,
        ),
      );
    } catch (e) {
      Alert.alert(t('No se pudo registrar', 'Could not register'), String(e));
    } finally {
      operation.current = false; if (alive.current) setBusy(false);
    }
  }, [language, newName, setDevice, refresh, t]);

  // `onBarcodeScanned` dispara varias veces por segundo y `setState` es asíncrono,
  // así que un guard por estado deja pasar todas las lecturas ya encoladas antes
  // del re-render. Con un QR que no es de TerraSense eso encadenaba varias alertas
  // seguidas: el bucle de fallos. El pestillo es una ref porque hace falta que se
  // cierre en la misma vuelta del bucle de eventos.
  const scanLatch = useRef(false);
  // Un payload ya rechazado no vuelve a avisar mientras la cámara siga abierta,
  // para no repetir el mismo mensaje si el usuario deja el QR incorrecto encuadrado.
  const rejectedPayload = useRef<string | null>(null);

  const openScanner = () => {
    scanLatch.current = false;
    rejectedPayload.current = null;
    setScanner(true);
  };

  const closeScanner = () => {
    scanLatch.current = false;
    setScanner(false);
  };

  const handleScan = (payload: string) => {
    if (scanLatch.current) return;
    if (rejectedPayload.current === payload) return;
    scanLatch.current = true;
    void handleJoin(payload);
  };

  const handleJoin = async (payload: string) => {
    if (operation.current) return;
    // El QR y el código que aparece bajo él son la misma invitación temporal.
    const token = parseDeviceInvite(payload);
    setScanner(false);
    if (!token) {
      // Se recuerda para que reabrir la cámara sobre el mismo QR no repita el aviso.
      rejectedPayload.current = payload;
      Alert.alert(
        t('QR no reconocido', 'Unrecognized QR'),
        t('Ese código no es de un equipo TerraSense. Pide al administrador que te muestre el QR desde su app.',
          'That code is not from a TerraSense device. Ask the administrator to show you the QR from their app.'),
      );
      return;
    }
    operation.current = true; setBusy(true);
    try {
      const device = await requestDeviceAccess(token);
      setInviteCode('');
      if (device) { setDevice(device); await refresh(); }
      else setPending(true);
    } catch (e) { Alert.alert(t('No se pudo solicitar acceso', 'Could not request access'), e instanceof Error ? e.message : String(e)); }
    finally { operation.current = false; if (alive.current) setBusy(false); }
  };

  if (pending) return <WaitingApprovalScreen onApproved={device => { setDevice(device); setPending(false); void refresh(); }} onDismiss={() => setPending(false)} />;

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity disabled={busy} onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ {t('Volver', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Mis dispositivos', 'My devices')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.deviceName, { color: colors.text }]}>{t('Tus sondas, listas para el campo', 'Your probes, ready for the field')}</Text>
        <Text style={[styles.deviceMeta, { color: colors.textSecondary, marginBottom: Spacing.md }]}>{t('Selecciona el equipo que usarás. La conexión Bluetooth se comprueba al iniciar una medición; los datos de batería y última conexión corresponden al último registro disponible.', 'Select the device you will use. Bluetooth is checked when starting a measurement; battery and last connection reflect the latest available record.')}</Text>
        {loadError && <View style={{ gap: 12 }}><Text style={{ color: colors.danger }}>{t('No se pudieron cargar los equipos.', 'Could not load devices.')}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void refresh()} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.primary }}>{t('Reintentar', 'Retry')}</Text></TouchableOpacity></View>}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : devices.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {t('Todavía no tienes equipos registrados. Registra uno abajo para empezar a medir.', 'You have no registered devices yet. Register one below to start measuring.')}
          </Text>
        ) : (
          devices.map((d) => {
            const active = selected?.id === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                guideTitle={d.alias || d.name}
                guide={t("Selecciona esta sonda para medir. Mantener pulsado copia su código; no inicia una conexión Bluetooth.", "Selects this probe for measurement. Long press copies its code; does not start a Bluetooth connection.")}
                disabled={busy}
                onPress={() => setDevice(d)}
                onLongPress={() => {
                  void Clipboard.setStringAsync(d.device_code);
                  Alert.alert(t('Código copiado', 'Code copied'), formatDeviceId(d.device_code));
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              >
                <Text style={[styles.deviceName, { color: colors.text }]}>
                  {d.alias || d.name}
                  {active ? '  ✓' : ''}
                </Text>
                <Text style={[styles.deviceCode, { color: colors.primary }]}>
                  {formatDeviceId(d.device_code)}
                </Text>
                <Text style={[styles.deviceMeta, { color: colors.textSecondary }]}>
                  {t('Batería', 'Battery')}: {d.battery_level == null ? '—' : `${d.battery_level}%`} · Firmware {d.firmware_version || '—'}
                </Text>
                <Text style={[styles.deviceMeta, { color: colors.textSecondary }]}>
                  {memberships.find(m => m.device_id === d.id)?.role === 'admin' ? t('Administrador', 'Administrator') : t('Usuario', 'User')} · {d.hardware_version || t('Hardware no informado', 'Hardware not reported')}
                </Text>
                <Text style={[styles.deviceMeta, { color: colors.textSecondary }]}>
                  {t('Última conexión', 'Last seen')}: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : t('Sin registro', 'No record')}
                </Text>
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {t('Mantén pulsado para copiar el código', 'Press and hold to copy the code')}
                </Text>
                {(
                  <View style={styles.adminActions}>
                    <TouchableOpacity guideTitle={t("Mostrar QR", "Show QR")} disabled={busy} onPress={() => setQrDevice(d)} style={[styles.qrButton, { borderColor: colors.primary }]}>
                      <Text style={[styles.qrButtonText, { color: colors.primary }]}>▦ {t('Mostrar QR', 'Show QR')}</Text>
                    </TouchableOpacity>

                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <Text style={[styles.section, { color: colors.textMuted }]}>{t('REGISTRAR EQUIPO NUEVO', 'REGISTER NEW DEVICE')}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('Enciende la sonda y mantén PAIR durante 3 segundos. Mantén el teléfono cerca hasta terminar la vinculación.', 'Turn on the probe and hold PAIR for 3 seconds. Keep your phone nearby until pairing finishes.')}
        </Text>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder={t('Nombre del equipo (ej. Sonda Campo Norte)', 'Device name (e.g. Lower Field Probe)')}
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
          accessibilityLabel={t('Nombre del equipo nuevo', 'New device name')}
        />
        <TouchableOpacity
          onPress={handleRegister}
          disabled={busy}
          style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>{t('Registrar equipo', 'Register device')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity disabled={busy} style={[styles.ctaSecondary, { borderColor: colors.primary }]} onPress={async () => {
          // Se pide al tocar este botón. Sin cámara queda el código de invitación de abajo.
          const access = await askForAccess('camera', language);
          if (access.ok) openScanner();
          else if (access.deniedNow) Alert.alert(pick(PERMISSION_COPY.camera.name, language), pick(PERMISSION_COPY.camera.denied, language));
        }}>
          <Text style={{ color: colors.primary }}>{t('Escanear QR para solicitar acceso', 'Scan QR to request access')}</Text>
        </TouchableOpacity>
        <TextInput
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder={t('Código de invitación', 'Invitation code')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          editable={!busy}
          style={inputStyle}
          accessibilityLabel={t('Código de invitación que aparece bajo el QR', 'Invitation code shown below the QR')}
        />
        <TouchableOpacity disabled={busy || !inviteCode.trim()} style={[styles.ctaSecondary, { borderColor: colors.primary, opacity: busy || !inviteCode.trim() ? 0.5 : 1 }]}
          onPress={() => { void handleJoin(inviteCode.trim()); }}>
          <Text style={{ color: colors.primary }}>{t('Solicitar acceso con el código', 'Request access with the code')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={Boolean(qrDevice)}
        transparent
        animationType="fade"
        onRequestClose={() => setQrDevice(null)}
      >

        <View style={styles.modalBackdrop}>
          <ScrollView style={[styles.qrModal, { backgroundColor: colors.card }]} contentContainerStyle={{ padding: Spacing.lg, alignItems: 'center' }}>
            <Text style={[styles.qrTitle, { color: colors.text }]}>{t('QR de invitación', 'Invitation QR')}</Text>
            <Text style={[styles.qrHelp, { color: colors.textSecondary }]}>
              {t('Al escanearlo se solicita acceso al administrador de', 'Scanning requests administrator approval for')} {qrDevice?.alias || qrDevice?.name}.
            </Text>
            {qrDevice && <RotatingDeviceQr deviceId={qrDevice.id} />}
            <TouchableOpacity
              onPress={() => setQrDevice(null)}
              style={[styles.cta, { backgroundColor: colors.primary, alignSelf: 'stretch' }]}
            >
              <Text style={styles.ctaText}>{t('Listo', 'Done')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      
    </Modal>
      <Modal visible={scanner} onRequestClose={closeScanner}>

        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <TouchableOpacity onPress={closeScanner} style={{ padding: 20 }}><Text style={{ color: colors.primary }}>{t('Cerrar', 'Close')}</Text></TouchableOpacity>
          <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanner && !busy ? event => handleScan(event.data) : undefined} />
        </SafeAreaView>
      
    </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: Spacing.touchTarget + 8,
  },
  headerBtn: { minWidth: 80, minHeight: Spacing.touchTarget, justifyContent: 'center' },
  headerTitle: { ...Typography.titleMedium },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  empty: { ...Typography.bodyRegular, textAlign: 'center', marginVertical: Spacing.xl },
  card: { borderRadius: Spacing.borderRadius, padding: Spacing.md, marginBottom: Spacing.sm },
  deviceName: { ...Typography.bodyBold },
  deviceCode: { ...Typography.titleMedium, letterSpacing: 1, marginTop: 2 },
  deviceMeta: { ...Typography.caption, marginTop: 4 },
  hint: { ...Typography.badge, marginTop: 6 },
  section: { ...Typography.badge, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  input: {
    height: 54,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyRegular,
  },
  cta: {
    height: 52,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  ctaText: { ...Typography.button, color: '#FFFFFF' },
  ctaSecondary: {
    height: 52,
    borderRadius: Spacing.borderRadius,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  ctaSecondaryText: { ...Typography.button },
  qrButton: {
    minHeight: Spacing.touchTarget,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  qrButtonText: { ...Typography.button },
  adminActions: { gap: Spacing.xs },
  membersModal: { width: '100%', maxWidth: 480, maxHeight: '80%', borderRadius: Spacing.cardRadius, padding: Spacing.lg },
  memberRow: { borderBottomWidth: 1, paddingVertical: Spacing.md },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  qrModal: { width: '100%', maxWidth: 380, maxHeight: '90%', flexGrow: 0, borderRadius: Spacing.cardRadius },
  qrTitle: { ...Typography.titleLarge, textAlign: 'center' },
  qrHelp: { ...Typography.bodyRegular, textAlign: 'center', marginTop: Spacing.sm },
  qrCanvas: { padding: Spacing.sm, backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: Spacing.lg },
  qrCode: { fontSize: 15, fontWeight: '700', letterSpacing: 1, marginVertical: Spacing.md },
});
