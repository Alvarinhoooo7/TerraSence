import { listMyDevices } from '../services/deviceService';
import { useAuthStore } from '../store/useAuthStore';
import type { DeviceRow } from '../types/app';
import { ScrollView } from 'react-native';
import { GuideSectionList as SectionList } from '../components/guide/GuideSectionList';
import { GuideTouchable as TouchableOpacity } from '../components/guide/GuideControls';
// src/screens/HistoryScreen.tsx
//
// Mediciones en lista, agrupadas por día y filtrables por etapa.

import React, { useEffect, useMemo, useState } from 'react';
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

  const accountId = useAuthStore(s => s.session?.user.id);
  const [historyDevice, setHistoryDevice] = useState<{ accountId: string | undefined; id: string | null }>({ accountId, id: null });
  const historyDeviceId = historyDevice.accountId === accountId ? historyDevice.id : null;
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  useEffect(() => {
    let active = true;
    setDevices([]);
    void listMyDevices().then(rows => { if (active && useAuthStore.getState().session?.user.id === accountId) setDevices(rows); }).catch(() => undefined);
    return () => { active = false; };
  }, [accountId]);
  const { points, loading, offline, error, refresh } = useMeasurementHistory(historyDeviceId);
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

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Text style={{ color: colors.primary, ...Typography.bodyBold }}>‹ {t('Inicio', 'Home')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {t('Mediciones', 'Readings')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {devices.length > 0 && <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
        {[{ id: null, name: t('Todas las sondas', 'All probes') }, ...devices.map(d => ({ id: d.id, name: `${d.alias || d.name} · ${d.device_code.slice(-6)}` }))].map(d => <TouchableOpacity key={d.id ?? 'all'} accessibilityRole="radio" accessibilityState={{ selected: historyDeviceId === d.id }} onPress={() => setHistoryDevice({ accountId, id: d.id })} style={[styles.filterChip, { backgroundColor: historyDeviceId === d.id ? colors.primary : colors.card, borderColor: colors.border }]}><Text style={{ color: historyDeviceId === d.id ? '#FFFFFF' : colors.text }}>{d.name}</Text></TouchableOpacity>)}
      </ScrollView></View>}
      {/* Filtro por etapa */}
      <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
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
      </ScrollView></View>

<Text style={{ color: colors.textSecondary, paddingHorizontal: 24 }}>{t('Últimas lecturas disponibles · Etapa filtrada sobre este registro', 'Latest available readings · Stage filters this record')}</Text>
{(offline || error) && <Text accessibilityLiveRegion="polite" style={{ color: colors.warning, paddingHorizontal: 24 }}>{error ? t("No pudimos cargar el historial. Desliza para reintentar.", "Could not load history. Pull to retry.") : t("Mostrando el historial local.", "Showing local history.")}</Text>}
      <SectionList
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}

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
