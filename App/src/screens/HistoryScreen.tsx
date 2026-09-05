// src/screens/HistoryScreen.tsx
//
// Vista alternativa al mapa: las mismas mediciones en lista, agrupadas por día
// y filtrables por etapa. Útil cuando el agricultor quiere revisar la evolución
// de un potrero en vez de su distribución espacial.

import React, { useEffect, useMemo, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography, VERDICT_META } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { ScreenGuide } from '../components/ScreenGuide';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PHENOLOGICAL_STAGES, type MapMeasurementPoint, type PhenologicalStage } from '../types/app';
import { fetchMeasurements, pendingMeasurementPoints } from '../services/measurementsService';

interface Props {
  onClose: () => void;
  onOpenDetail: (p: MapMeasurementPoint) => void;
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

  const { points, fieldName, device, setPoints } = useAppStore();
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoadError(false);
    void (async () => {
      const local = await pendingMeasurementPoints(fieldName, device?.id);
      let remote: MapMeasurementPoint[] = [];
      try { remote = await fetchMeasurements(fieldName, device?.id); }
      catch { if (active) setLoadError(true); }
      if (!active) return;
      const ids = new Set(remote.map(p => p.id));
      setPoints([...local.filter(p => !ids.has(p.id)).map(p => ({ ...p, isPending: true })), ...remote]
        .sort((a,b) => Date.parse(b.measuredAt)-Date.parse(a.measuredAt)));
    })().catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [fieldName, device?.id, setPoints]);
  const [filter, setFilter] = useState<PhenologicalStage | 'all'>('all');

  const sections = useMemo(() => {
    const filtered = filter === 'all' ? points : points.filter((p) => p.stage === filter);
    const groups = new Map<string, MapMeasurementPoint[]>();
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
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ {t('Mapa', 'Map')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {fieldName}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Resumen del predio de un vistazo */}
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

      <SectionList
        ListHeaderComponent={loadError ? <Text style={{ color: colors.warning }}>{t('Sin acceso al historial remoto; se muestran datos locales.', 'Remote history unavailable; showing local data.')}</Text> : null}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {points.length === 0
              ? t('Todavía no hay mediciones en este predio.', 'There are no readings in this field yet.')
              : t('No hay mediciones en la etapa seleccionada.', 'There are no readings for the selected stage.')}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.textMuted, backgroundColor: colors.background }]}>
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item }) => {
          const meta = VERDICT_META[item.verdict];
          const stroke = isDark ? meta.strokeDark : meta.strokeLight;
          const stage = PHENOLOGICAL_STAGES.find((s) => s.id === item.stage);
          return (
            <TouchableOpacity
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
      <ScreenGuide guideId="history" />
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
  summaryLabel: { ...Typography.badge },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    height: 38,
    justifyContent: 'center',
    borderRadius: 19,
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
    padding: Spacing.sm + 2,
    marginBottom: Spacing.xs,
    minHeight: Spacing.touchTarget + 12,
  },
  rowBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowBadgeText: { color: '#FFFFFF', fontWeight: '700' },
  rowTitle: { ...Typography.bodyBold },
  rowMeta: { ...Typography.caption, marginTop: 2 },
  empty: { ...Typography.bodyRegular, textAlign: 'center', marginTop: Spacing.xl },
});
