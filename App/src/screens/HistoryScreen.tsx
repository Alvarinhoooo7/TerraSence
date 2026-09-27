import { GuideSectionList as SectionList } from '../components/guide/GuideSectionList';
import { GuideTouchable as TouchableOpacity } from '../components/guide/GuideControls';
// src/screens/HistoryScreen.tsx
//
// Mediciones en lista, agrupadas por día y filtrables por etapa.

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography, VERDICT_META } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { PHENOLOGICAL_STAGES, type MeasurementPoint, type PhenologicalStage } from '../types/app';
import { useMeasurementHistory } from '../hooks/useMeasurementHistory';

interface Props {
  onClose: () => void;
  onOpenDetail: (p: MeasurementPoint) => void;
}

const dayKey = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const hourLabel = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

export const HistoryScreen: React.FC<Props> = ({ onClose, onOpenDetail }) => {
  const { isDark, colors } = useAppTheme();
  const { language, locale, t } = useTranslation();

  const { points, loading, offline, error, refresh } = useMeasurementHistory();
  const [filter, setFilter] = useState<PhenologicalStage | 'all'>('all');

  const sections = useMemo(() => {
    const filtered = filter === 'all' ? points : points.filter((p) => p.stage === filter);
    const groups = new Map<string, MeasurementPoint[]>();
    for (const p of filtered) {
      const k = dayKey(p.measuredAt, locale);
      const arr = groups.get(k);
      if (arr) arr.push(p);
      else groups.set(k, [p]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [points, filter, locale]);

  const counts = useMemo(() => {
    const c = { GREEN: 0, AMBER: 0, RED: 0 };
    for (const p of points) c[p.verdict] += 1;
    return c;
  }, [points]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: colors.background }]}>
      <SectionList
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={<>      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ {t('Inicio', 'Home')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {t('Mediciones', 'Readings')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}><Text style={{ ...Typography.titleLarge, fontSize: 32, color: colors.text }}>{t('Historial', 'History')}</Text><Text style={{ ...Typography.bodyRegular, color: colors.textSecondary, marginTop: 6 }}>{t('Cada lectura cuenta la historia de tu suelo.', 'Every reading tells the story of your soil.')}</Text></View>
      {/* Resumen de las mediciones de un vistazo */}
      <View style={styles.summary}>
        {(['GREEN', 'AMBER', 'RED'] as const).map((v) => {
          const meta = VERDICT_META[v];
          const stroke = isDark ? meta.strokeDark : meta.strokeLight;
          return (
            <View
              key={v}
              style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.summaryIcon, { color: stroke }]}>{meta.icon}</Text>
              <Text style={[styles.summaryCount, { color: colors.text }]}>{counts[v]}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{meta.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Filtro por etapa */}
      <View style={styles.filters}>
        {(['all', ...PHENOLOGICAL_STAGES.map((s) => s.id)] as const).map((id) => {
          const active = filter === id;
          const label =
            id === 'all'
              ? t('Todas', 'All')
              : (() => {
                  const stage = PHENOLOGICAL_STAGES.find((s) => s.id === id);
                  return stage ? (language === 'en' ? stage.labelEn : stage.label) : id;
                })();
          return (
            <TouchableOpacity
              key={id}
              guideTitle={label}
              guide={t("Filtra el historial por esta etapa. Todas vuelve a mostrar el registro completo.", "Filters history by this stage. All shows the complete history again.")}
              onPress={() => setFilter(id as PhenologicalStage | 'all')}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

{(offline || error) && <Text style={{ color: colors.warning }}>{error ? t("No pudimos cargar el historial. Desliza para reintentar.", "Could not load history. Pull to retry.") : t("Mostrando el historial local.", "Showing local history.")}</Text>}</>}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /> :
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {points.length === 0
              ? t('Todavía no hay mediciones.', 'There are no readings yet.')
              : t('No hay mediciones en la etapa seleccionada.', 'There are no readings for the selected stage.')}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.textMuted, backgroundColor: colors.background }]}>
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item, index, section }) => {
          const meta = VERDICT_META[item.verdict];
          const stroke = isDark ? meta.strokeDark : meta.strokeLight;
          const stage = PHENOLOGICAL_STAGES.find((s) => s.id === item.stage);
          return (
            <TouchableOpacity
              guide={index === 0 && section === sections[0] ? t("Abre el detalle de esta lectura: valores, recomendación y respaldo. Las demás filas funcionan de la misma manera.", "Opens this reading’s values, recommendation and backup status. Other rows work the same way.") : false}
              guideTitle={t("Detalle de una lectura", "Reading details")}
              accessibilityRole="button"
              onPress={() => onOpenDetail(item)}
              style={[
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: stroke },
              ]}
            >
              <View style={[styles.rowBadge, { backgroundColor: stroke }]}>
                <Text style={styles.rowBadgeText}>{meta.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ ...Typography.captionBold, color: item.isPending ? colors.warning : colors.primary, marginTop: 4 }}>{item.isPending ? t('Guardada en el teléfono · Pendiente', 'Saved on phone · Pending') : t('Respaldada en la nube', 'Backed up to cloud')}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {hourLabel(item.measuredAt, locale)} · {stage?.emoji}{' '}
                  {stage ? (language === 'en' ? stage.labelEn : stage.label) : ''} · pH{' '}
                  {item.ph.toFixed(1)} · CE {Math.round(item.ecUsCm)} · {item.vwcPercent.toFixed(0)}%
                </Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
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
  headerTitle: { ...Typography.titleMedium, flex: 1, textAlign: 'center' },
  summary: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
  },
  summaryIcon: { fontSize: 18, fontWeight: '700' },
  summaryCount: { ...Typography.titleLarge },
  summaryLabel: { ...Typography.badge, textAlign: 'center', paddingHorizontal: 6 },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
  },
  filterText: { ...Typography.captionBold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  sectionHeader: { ...Typography.badge, paddingVertical: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: Spacing.touchTarget + 12,
  },
  rowBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowBadgeText: { color: '#FFFFFF', fontWeight: '700' },
  rowTitle: { ...Typography.bodyBold },
  rowMeta: { ...Typography.caption, marginTop: 2 },
  empty: { ...Typography.bodyRegular, textAlign: 'center', marginTop: Spacing.xl },
});
