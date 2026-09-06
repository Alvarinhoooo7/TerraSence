// src/screens/DevicesScreen.tsx
//
// Alta y selección de equipos. Adaptado de DevicePairingScreen.tsx de Akura.
// El alta nueva exige presencia BLE y provisiona el mismo Device ID en la
// NVS de la sonda y en Supabase; un código existente sólo vincula operadores.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RotatingDeviceQr } from '../components/RotatingDeviceQr';
import { WaitingApprovalScreen } from './WaitingApprovalScreen';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { ScreenGuide } from '../components/ScreenGuide';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import {
  listMyDevices,
  registerDevice,
  requestDeviceAccess,
} from '../services/deviceService';
import { parseDeviceQrPayload, formatDeviceId, generateDeviceId } from '../utils/deviceId';
import type { DeviceRow } from '../types/app';

interface Props {
  onClose: () => void;
}

export const DevicesScreen: React.FC<Props> = ({ onClose }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const { device: selected, setDevice } = useAppStore();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [scanner, setScanner] = useState(false);
  const [pending, setPending] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [qrDevice, setQrDevice] = useState<DeviceRow | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDevices(await listMyDevices());
    } catch (e) {
      Alert.alert(t('No se pudieron cargar los equipos', 'Could not load devices'), String(e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRegister = useCallback(async () => {
    setBusy(true);
    try {
      const ble = await import('../services/bleService');
      const granted = await ble.requestBlePermissions();
      if (!granted) {
        throw new Error(t('Se necesita permiso de Bluetooth para registrar una sonda física.', 'Bluetooth permission is required to register a physical probe.'));
      }
      const probe = await ble.pairWithNearbyProbe();
      const code = probe.assignedCode ?? generateDeviceId();
      if (!probe.assignedCode) await ble.provisionProbe(probe.bleId, code);
      const d = await registerDevice(newName.trim() || probe.name, code);
      setNewName('');
      setDevice(d);
      await refresh();
      Alert.alert(
        t('Equipo registrado', 'Device registered'),
        t(
          `Su código es ${formatDeviceId(d.device_code)}.\n\nCompártelo con quien deba operar este equipo.`,
          `Its code is ${formatDeviceId(d.device_code)}.\n\nShare it with anyone who should operate this device.`,
        ),
      );
    } catch (e) {
      Alert.alert(t('No se pudo registrar', 'Could not register'), String(e));
    } finally {
      setBusy(false);
    }
  }, [newName, setDevice, refresh, t]);

  const handleJoin = async (payload: string) => {
    if (busy) return;
    const token = parseDeviceQrPayload(payload);
    setScanner(false);
    if (!token) { Alert.alert(t('QR no reconocido', 'Unrecognized QR')); return; }
    setBusy(true);
    try {
      const device = await requestDeviceAccess(token);
      if (device) { setDevice(device); await refresh(); }
      else setPending(true);
    } catch (e) { Alert.alert(t('No se pudo solicitar acceso', 'Could not request access'), e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  if (pending) return <WaitingApprovalScreen onApproved={device => { setDevice(device); setPending(false); void refresh(); }} onDismiss={() => setPending(false)} />;

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ {t('Volver', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Mis equipos', 'My devices')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
                  🔋 {d.battery_level}% · fw {d.firmware_version} · {d.hardware_version}
                </Text>
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {t('Mantén pulsado para copiar el código', 'Press and hold to copy the code')}
                </Text>
                {(
                  <View style={styles.adminActions}>
                    <TouchableOpacity onPress={() => setQrDevice(d)} style={[styles.qrButton, { borderColor: colors.primary }]}>
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
          {t('Enciende la sonda y mantén PAIR durante 3 segundos. El alta comprueba presencia física y guarda el mismo código en el ESP32 y en Supabase.', 'Turn on the probe and hold PAIR for 3 seconds. Registration verifies physical presence and stores the same code on the ESP32 and in Supabase.')}
        </Text>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder={t('Nombre del equipo (ej. Sonda Potrero Bajo)', 'Device name (e.g. Lower Field Probe)')}
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
          accessibilityLabel={t('Nombre del equipo nuevo', 'New device name')}
        />
        <TouchableOpacity
          onPress={handleRegister}
          disabled={busy}
          style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
        >
          <Text style={styles.ctaText}>{t('Registrar equipo', 'Register device')}</Text>
        </TouchableOpacity>

        <TouchableOpacity disabled={busy} style={[styles.ctaSecondary, { borderColor: colors.primary }]} onPress={async () => {
          const permission = cameraPermission?.granted || (await requestCameraPermission()).granted;
          if (permission) setScanner(true);
          else Alert.alert(t('Activa el permiso de camara en Ajustes.', 'Enable camera permission in Settings.'));
        }}>
          <Text style={{ color: colors.primary }}>{t('Escanear QR para solicitar acceso', 'Scan QR to request access')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={Boolean(qrDevice)}
        transparent
        animationType="fade"
        onRequestClose={() => setQrDevice(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.qrModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.qrTitle, { color: colors.text }]}>{t('QR de vinculación', 'Linking QR')}</Text>
            <Text style={[styles.qrHelp, { color: colors.textSecondary }]}>
              {t('Al escanearlo se solicita acceso al administrador de', 'Scanning requests administrator approval for')} {qrDevice?.alias || qrDevice?.name}.
            </Text>
            {qrDevice && <RotatingDeviceQr deviceId={qrDevice.id} />}
            <Text style={[styles.qrCode, { color: colors.primary }]}>
              {formatDeviceId(qrDevice?.device_code)}
            </Text>
            <TouchableOpacity
              onPress={() => setQrDevice(null)}
              style={[styles.cta, { backgroundColor: colors.primary, alignSelf: 'stretch' }]}
            >
              <Text style={styles.ctaText}>{t('Listo', 'Done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={scanner} onRequestClose={() => setScanner(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <TouchableOpacity onPress={() => setScanner(false)} style={{ padding: 20 }}><Text style={{ color: colors.primary }}>{t('Cerrar', 'Close')}</Text></TouchableOpacity>
          <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanner && !busy ? event => void handleJoin(event.data) : undefined} />
        </SafeAreaView>
      </Modal>
      <ScreenGuide guideId="devices" />
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
  qrModal: { width: '100%', maxWidth: 380, borderRadius: Spacing.cardRadius, padding: Spacing.lg, alignItems: 'center' },
  qrTitle: { ...Typography.titleLarge, textAlign: 'center' },
  qrHelp: { ...Typography.bodyRegular, textAlign: 'center', marginTop: Spacing.sm },
  qrCanvas: { padding: Spacing.sm, backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: Spacing.lg },
  qrCode: { fontSize: 15, fontWeight: '700', letterSpacing: 1, marginVertical: Spacing.md },
});
