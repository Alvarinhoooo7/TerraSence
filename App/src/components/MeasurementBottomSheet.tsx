// src/components/MeasurementBottomSheet.tsx
//
// "Burbuja" de detalle que aparece al tocar un círculo del mapa.
// Adaptado de ElderBottomSheet.tsx del proyecto Akura.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PHENOLOGICAL_STAGES, type MapMeasurementPoint } from '../types/app';
import { Spacing, Typography, VERDICT_META, type ThemeColors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { formatTemperature } from '../utils/units';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  point: MapMeasurementPoint | null;
  colors: ThemeColors;
  isDark: boolean;
  onClose: () => void;
  onOpenDetail: (p: MapMeasurementPoint) => void;
}

/** Antigüedad en lenguaje natural: el agricultor piensa en "hace 2 h". */
const relativeAge = (iso: string, en: boolean): string => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return en ? 'just measured' : 'recién medido';
  if (min < 60) return en ? `${min} min ago` : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return en ? `${h} h ago` : `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? (en ? 'yesterday' : 'ayer') : en ? `${d} days ago` : `hace ${d} días`;
};

export const MeasurementBottomSheet: React.FC<Props> = ({
  point,
  colors,
  isDark,
  onClose,
  onOpenDetail,
}) => {
  const measurementSystem = useAppStore((state) => state.preferences.measurementSystem);
  const { language, t } = useTranslation();
  const en = language === 'en';
  if (!point) return null;

  const meta = VERDICT_META[point.verdict];
  const stroke = isDark ? meta.strokeDark : meta.strokeLight;
  const stage = PHENOLOGICAL_STAGES.find((s) => s.id === point.stage);

  const temperature = formatTemperature(point.soilTempC, measurementSystem);
  const metrics: { label: string; value: string }[] = [
    { label: 'pH', value: point.ph.toFixed(1) },
    { label: 'CE', value: `${Math.round(point.ecUsCm)} µS/cm` },
    { label: t('Humedad', 'Moisture'), value: `${point.vwcPercent.toFixed(0)} %` },
    { label: t('T° suelo', 'Soil temp.'), value: `${temperature.value.toFixed(1)} ${temperature.unit}` },
    { label: 'N', value: `${Math.round(point.nitrogen)} ppm` },
    { label: 'P', value: `${Math.round(point.phosphorus)} ppm` },
    { label: 'K', value: `${Math.round(point.potassium)} ppm` },
  ];

  return (
    <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.grabberRow}>
        <View style={[styles.grabber, { backgroundColor: colors.textMuted }]} />
      </View>

      {/* Encabezado: color + icono + texto, nunca sólo color (WCAG 2.2 AA) */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: stroke }]}>
          <Text style={styles.badgeIcon}>{meta.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.verdictLabel, { color: stroke }]}>{meta.label}</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {point.title}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('Cerrar detalle', 'Close details')}
          hitSlop={12}
          style={styles.close}
        >
          <Text style={{ color: colors.textMuted, fontSize: 22 }}>×</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {stage ? `${stage.emoji} ${en ? stage.labelEn : stage.label}` : ''} · {relativeAge(point.measuredAt, en)}
        {point.gpsAccuracyM != null ? ` · ±${Math.round(point.gpsAccuracyM)} m` : ''}
      </Text>

      <View style={styles.metricsGrid}>
        {metrics.map((m) => (
          <View
            key={m.label}
            style={[styles.metric, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{m.label}</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      {point.action ? (
        <View style={[styles.action, { backgroundColor: colors.background, borderLeftColor: stroke }]}>
          <Text style={[styles.actionText, { color: colors.text }]}>{point.action}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => onOpenDetail(point)}
        style={[styles.cta, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.ctaText}>{t('Ver detalle completo', 'View full details')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    bottom: 96,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  grabberRow: { alignItems: 'center', marginBottom: Spacing.sm },
  grabber: { width: 40, height: 4, borderRadius: 2, opacity: 0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badgeIcon: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  verdictLabel: { ...Typography.badge, marginBottom: 2 },
  title: { ...Typography.titleMedium },
  close: { padding: 4 },
  meta: { ...Typography.caption, marginTop: Spacing.xs, marginBottom: Spacing.md },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  metric: {
    minWidth: 88,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
  },
  metricLabel: { ...Typography.badge },
  metricValue: { ...Typography.bodyBold, marginTop: 2 },
  action: {
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: Spacing.sm + 2,
  },
  actionText: { ...Typography.caption },
  cta: {
    marginTop: Spacing.md,
    height: Spacing.touchTarget,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { ...Typography.button, color: '#FFFFFF' },
});
