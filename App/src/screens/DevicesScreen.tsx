// src/screens/DevicesScreen.tsx
//
// Alta y selección de equipos. Adaptado de DevicePairingScreen.tsx de Akura.
// El emparejamiento BLE real es la tarea C9 y requiere hardware.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { Colors, Spacing, Typography } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { listMyDevices, registerDevice, joinDeviceByCode } from '../services/deviceService';
import { formatDeviceId } from '../utils/deviceId';
import type { DeviceRow } from '../types/app';

interface Props {
  onClose: () => void;
}

export const DevicesScreen: React.FC<Props> = ({ onClose }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { device: selected, setDevice } = useAppStore();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDevices(await listMyDevices());
    } catch (e) {
      Alert.alert('No se pudieron cargar los equipos', String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRegister = useCallback(async () => {
    setBusy(true);
    try {
      const d = await registerDevice(newName);
      setNewName('');
      setDevice(d);
      await refresh();
      Alert.alert(
        'Equipo registrado',
        `Su código es ${formatDeviceId(d.device_code)}.\n\n` +
          'Compártelo con quien deba operar este equipo.',
      );
    } catch (e) {
      Alert.alert('No se pudo registrar', String(e));
    } finally {
      setBusy(false);
    }
  }, [newName, setDevice, refresh]);

  const handleJoin = useCallback(async () => {
    setBusy(true);
    try {
      const d = await joinDeviceByCode(joinCode);
      setJoinCode('');
      setDevice(d);
      await refresh();
    } catch (e) {
      Alert.alert('No se pudo vincular', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [joinCode, setDevice, refresh]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis equipos</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : devices.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Todavía no tienes equipos registrados. Registra uno abajo para empezar a medir.
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
                  Alert.alert('Código copiado', formatDeviceId(d.device_code));
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
                  Mantén pulsado para copiar el código
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={[styles.section, { color: colors.textMuted }]}>REGISTRAR EQUIPO NUEVO</Text>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Nombre del equipo (ej. Sonda Potrero Bajo)"
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
          accessibilityLabel="Nombre del equipo nuevo"
        />
        <TouchableOpacity
          onPress={handleRegister}
          disabled={busy}
          style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
        >
          <Text style={styles.ctaText}>Registrar equipo</Text>
        </TouchableOpacity>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          VINCULAR CON CÓDIGO DE 15 DÍGITOS
        </Text>
        <TextInput
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="48213-90574-16628"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={inputStyle}
          accessibilityLabel="Código del equipo"
        />
        <TouchableOpacity
          onPress={handleJoin}
          disabled={busy}
          style={[styles.ctaSecondary, { borderColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
        >
          <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>Vincular</Text>
        </TouchableOpacity>
      </ScrollView>
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
});
