import { MeasurementExplorer } from './MeasurementExplorer';
import { presentationFromPoint } from '../engine/measurementPresentation';
import { GuideModal as Modal } from './guide/GuideModal';
import { GuideTouchable as TouchableOpacity, GuideScrollView as ScrollView } from './guide/GuideControls';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography, VERDICT_META } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { PHENOLOGICAL_STAGES, type MeasurementPoint } from '../types/app';

interface Props {
  point: MeasurementPoint | null;
  onClose: () => void;
}

export const MeasurementDetailModal: React.FC<Props> = ({ point, onClose }) => {
  const { isDark, colors } = useAppTheme();
  const { language, locale, t } = useTranslation();

  if (!point) return null;

  const meta = VERDICT_META[point.verdict];
  const accent = isDark ? meta.strokeDark : meta.strokeLight;
  const stage = PHENOLOGICAL_STAGES.find((item) => item.id === point.stage);
  const verdictLabel = point.verdict === 'GREEN'
    ? t('BIEN', 'HEALTHY')
    : point.verdict === 'AMBER'
      ? t('ATENCIÓN', 'ATTENTION')
      : t('CRÍTICO', 'CRITICAL');
  const missing = t('Sin dato', 'No data');

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>

      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ {t('Volver', 'Back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Detalle de medición', 'Reading details')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.verdict, { backgroundColor: accent }]}>
            <Text style={styles.verdictIcon}>{meta.icon}</Text>
            <Text style={styles.verdictLabel}>{verdictLabel}</Text>
            <Text style={styles.verdictTitle}>{point.title}</Text>
          </View>

          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {stage?.emoji} {stage ? (language === 'en' ? stage.labelEn : stage.label) : ''}
            {' · '}
            {new Date(point.measuredAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>

          {point.isPending && (
            <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.pendingBadgeText}>
                {t('Guardado localmente (Pendiente de sincronización)', 'Saved locally (Pending sync)')}
              </Text>
            </View>
          )}

          <Text style={[styles.section, { color: colors.textMuted }]}>{t('LECTURAS REGISTRADAS', 'RECORDED READINGS')}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{t('Suelo: sonda · Ambiente: registro local; las lecturas antiguas pueden carecer de origen verificado. N/P/K sin validación química.', 'Soil: probe · Environment: local record; older readings may lack verified provenance. N/P/K chemically unvalidated.')}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{t('Batería en captura', 'Battery at capture')}: {point.batteryPercent == null ? missing : `${point.batteryPercent} %`}</Text>
          <MeasurementExplorer key={point.id} presentation={presentationFromPoint(point, language)} />

          <Text style={[styles.section, { color: colors.textMuted }]}>{t('UBICACIÓN', 'LOCATION')}</Text>
          <View style={[styles.location, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.actionText, { color: colors.text }]}>{point.latitude != null && point.longitude != null ? `📍 ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}` : t('Medición guardada sin coordenadas.', 'Reading saved without coordinates.')}</Text>
            <Text style={[styles.locationMeta, { color: colors.textSecondary }]}>
              {t('Precisión GPS', 'GPS accuracy')}: {point.gpsAccuracyM == null ? t('sin dato', 'not available') : `±${Math.round(point.gpsAccuracyM)} m`}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 60, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 82, minHeight: Spacing.touchTarget, justifyContent: 'center' },
  headerTitle: { ...Typography.titleMedium },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  verdict: { borderRadius: Spacing.cardRadius, padding: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
  verdictIcon: { color: '#FFFFFF', fontSize: 38, fontWeight: '800' },
  verdictLabel: { ...Typography.badge, color: '#FFFFFF' },
  verdictTitle: { ...Typography.titleLarge, color: '#FFFFFF', textAlign: 'center' },
  meta: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.sm },
  section: { ...Typography.badge, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  metric: { width: '48%', flexGrow: 1, borderRadius: 10, borderWidth: 1, padding: Spacing.sm },
  metricLabel: { ...Typography.badge },
  metricValue: { ...Typography.bodyBold, marginTop: 2 },
  action: { borderWidth: 1, borderLeftWidth: 4, borderRadius: Spacing.borderRadius, padding: Spacing.md },
  actionText: { ...Typography.bodyRegular },
  location: { borderWidth: 1, borderRadius: Spacing.borderRadius, padding: Spacing.md },
  locationMeta: { ...Typography.caption, marginTop: 4 },
  pendingBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Spacing.borderRadius, alignSelf: 'center', marginTop: Spacing.md },
  pendingBadgeText: { ...Typography.badge, color: '#FFFFFF' },
});
