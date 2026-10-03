import { listMyDevices } from '../services/deviceService';
import { useAuthStore } from '../store/useAuthStore';
import type { DeviceRow } from '../types/app';
import { ScrollView } from 'react-native';
import { GuideSectionList as SectionList } from '../components/guide/GuideSectionList';
import { GuideTouchable as TouchableOpacity } from '../components/guide/GuideControls';
// src/screens/HistoryScreen.tsx
//
// Mediciones en lista, agrupadas por día y filtrables por etapa.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VERDICT_META } from '../constants/theme';
import { EntryHeading } from '../components/entry/EntryUI';
import { ScreenCard, ScreenLabel, ScreenText } from '../components/screen/ScreenUI';
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
  const devicesRequest = useRef(0);
  // Sondas para el filtro. Si la consulta falla se reintenta junto con el historial
  // (al deslizar para actualizar); mientras tanto sólo se ve «todas las sondas».
  const loadDevices = useCallback(() => {
    const generation = ++devicesRequest.current;
    void listMyDevices().then(rows => {
      if (generation === devicesRequest.current && useAuthStore.getState().session?.user.id === accountId) setDevices(rows);
    }).catch(() => undefined);
  }, [accountId]);
  useEffect(() => { setDevices([]); loadDevices(); return () => { devicesRequest.current++; }; }, [loadDevices]);
  const { points, loading, offline, error, refresh: refreshPoints } = useMeasurementHistory(historyDeviceId);
  const refresh = () => { loadDevices(); void refreshPoints(); };
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

  // Píldora de filtro: el mismo verde y la misma tinta de los botones de la entrada.
  const chip = (key: string, label: string, selected: boolean, onPress: () => void, guide?: string) => <TouchableOpacity key={key}
    guideTitle={label} guide={guide ?? false} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}
    style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, justifyContent: 'center',
      backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border }}>
    <Text style={{ color: selected ? (isDark ? colors.background : '#FFFFFF') : colors.text, fontSize: 15, fontWeight: selected ? '700' : '500' }}>{label}</Text>
  </TouchableOpacity>;
  const stageName = (id: PhenologicalStage | 'all') => {
    if (id === 'all') return t('Todas las etapas', 'All stages');
    const stage = PHENOLOGICAL_STAGES.find(s => s.id === id);
    return stage ? (language === 'en' ? stage.labelEn : stage.label) : id;
  };

  const header = <View style={{ gap: 16, paddingTop: 8, paddingBottom: 8 }}>
    <EntryHeading eyebrow={t('HISTORIAL', 'HISTORY')} title={t('Mediciones', 'Readings')}
      description={t('Tus lecturas guardadas. Los filtros sólo cambian lo que ves aquí, no la sonda para medir.', 'Your saved readings. Filters only change what you see here, not the probe used to measure.')} />
    {devices.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {[{ id: null as string | null, name: t('Todas las sondas', 'All probes') }, ...devices.map(d => ({ id: d.id as string | null, name: d.alias || d.name }))]
        .map(d => chip(d.id ?? 'all', d.name, historyDeviceId === d.id, () => setHistoryDevice({ accountId, id: d.id })))}
    </ScrollView>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {(['all', ...PHENOLOGICAL_STAGES.map(s => s.id)] as const).map(id => chip(id, stageName(id as PhenologicalStage | 'all'), filter === id,
        () => setFilter(id as PhenologicalStage | 'all'),
        t('Filtra el historial por esta etapa. «Todas las etapas» vuelve a mostrar el registro completo.', 'Filters history by this stage. "All stages" shows the complete history again.')))}
    </ScrollView>
    {(offline || error) && <ScreenText danger={!!error}>{error ? t('No pudimos cargar el historial. Desliza hacia abajo para reintentar.', 'Could not load history. Pull down to retry.') : t('Sin conexión: mostrando el historial guardado en el teléfono.', 'Offline: showing the history saved on this phone.')}</ScreenText>}
  </View>;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <SectionList
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, width: '100%', maxWidth: 520, alignSelf: 'center' }}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /> :
          <ScreenCard><ScreenText>{points.length === 0
            ? t('Todavía no hay mediciones. Las que guardes aparecerán aquí, también sin conexión.', 'No readings yet. The ones you save will appear here, even offline.')
            : t('No hay mediciones en la etapa seleccionada.', 'There are no readings for the selected stage.')}</ScreenText></ScreenCard>}
        renderSectionHeader={({ section }) => <View style={{ paddingTop: 12, paddingBottom: 8 }}><ScreenLabel>{section.title}</ScreenLabel></View>}
        renderItem={({ item, index, section }) => {
          const meta = VERDICT_META[item.verdict];
          const stroke = isDark ? meta.strokeDark : meta.strokeLight;
          const stage = PHENOLOGICAL_STAGES.find((s) => s.id === item.stage);
          return (
            <TouchableOpacity
              guide={index === 0 && section === sections[0] ? t('Abre el detalle de esta lectura: valores, recomendación y respaldo. Las demás filas funcionan de la misma manera.', 'Opens this reading’s values, recommendation and backup status. Other rows work the same way.') : false}
              guideTitle={t('Detalle de una lectura', 'Reading details')}
              accessibilityRole="button"
              onPress={() => onOpenDetail(item)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.card, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12, minHeight: 72 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: stroke }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }} numberOfLines={1}>{item.title}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {hourLabel(item.measuredAt, locale)} · {stage ? (language === 'en' ? stage.labelEn : stage.label) : ''} · pH {item.ph.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} · {Math.round(item.vwcPercent)} %
                </Text>
                <Text style={{ color: item.isPending ? colors.warning : colors.primary, fontSize: 13, fontWeight: '600' }}>
                  {item.isPending ? t('Guardada en el teléfono · pendiente', 'Saved on phone · pending') : t('Respaldada en la nube', 'Backed up to cloud')}
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 26 }}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};
