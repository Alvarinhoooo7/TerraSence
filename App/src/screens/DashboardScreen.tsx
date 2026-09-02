import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';

interface Props {
  onStartMeasurement: () => void;
  onOpenMap: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export const DashboardScreen: React.FC<Props> = ({
  onStartMeasurement,
  onOpenMap,
  onOpenHistory,
  onOpenSettings,
}) => {
  const { colors } = useAppTheme();
  const { fieldName, device, pendingCount } = useAppStore();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: colors.primary }]}>TerraSense</Text>
            <Text style={[styles.field, { color: colors.textSecondary }]}>{fieldName}</Text>
          </View>
          <TouchableOpacity onPress={onOpenSettings} style={[styles.settings, { borderColor: colors.border }]}>
            <Text style={[styles.settingsText, { color: colors.text }]}>⚙</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.primaryDark }]}>
          <Text style={styles.heroEyebrow}>NUEVA LECTURA</Text>
          <Text style={styles.heroTitle}>Conoce el estado actual de tu suelo</Text>
          <Text style={styles.heroBody}>
            Enciende TerraSense. La conexión se realizará automáticamente al comenzar.
          </Text>
          <TouchableOpacity onPress={onStartMeasurement} style={styles.measureButton}>
            <Text style={[styles.measureButtonText, { color: colors.primaryDark }]}>Iniciar medición</Text>
            <Text style={[styles.measureArrow, { color: colors.primaryDark }]}>→</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { color: colors.textMuted }]}>ESTADO</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statusValue, { color: colors.text }]}>{device ? 'Vinculado' : 'Sin equipo'}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Equipo</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statusValue, { color: colors.text }]}>{pendingCount}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Por sincronizar</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: colors.textMuted }]}>CONSULTAR</Text>
        <TouchableOpacity
          onPress={onOpenHistory}
          style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View>
            <Text style={[styles.linkTitle, { color: colors.text }]}>Historial de mediciones</Text>
            <Text style={[styles.linkBody, { color: colors.textSecondary }]}>Todas las fases y registros guardados</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenMap}
          style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View>
            <Text style={[styles.linkTitle, { color: colors.text }]}>Mapa de pre-siembra</Text>
            <Text style={[styles.linkBody, { color: colors.textSecondary }]}>Burbujas tonales de aptitud del suelo</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  brand: { ...Typography.titleLarge },
  field: { ...Typography.caption, marginTop: 2 },
  settings: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  settingsText: { fontSize: 21 },
  hero: { borderRadius: 28, padding: Spacing.lg, marginBottom: Spacing.xl },
  heroEyebrow: { ...Typography.badge, color: '#9EE2BD', marginBottom: Spacing.sm },
  heroTitle: { ...Typography.titleLarge, color: '#FFFFFF', fontSize: 29, lineHeight: 35 },
  heroBody: { ...Typography.bodyRegular, color: '#D7E7DE', marginTop: Spacing.sm },
  measureButton: {
    minHeight: 58,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  measureButtonText: { ...Typography.button, fontSize: 17 },
  measureArrow: { fontSize: 24 },
  section: { ...Typography.badge, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  statusRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statusCard: { flex: 1, borderRadius: Spacing.borderRadius, borderWidth: 1, padding: Spacing.md },
  statusValue: { ...Typography.titleMedium },
  statusLabel: { ...Typography.caption, marginTop: 3 },
  linkCard: {
    minHeight: 82,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkTitle: { ...Typography.bodyBold },
  linkBody: { ...Typography.caption, marginTop: 3 },
  chevron: { fontSize: 32 },
});
