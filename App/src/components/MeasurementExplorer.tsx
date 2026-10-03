import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuideModal } from './guide/GuideModal';
import { GuideTouchable as Button } from './guide/GuideControls';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PHENOLOGICAL_STAGES } from '../types/app';
import { parameterLabel, type MeasurementPresentation, type ParameterPresentation } from '../engine/measurementPresentation';
import { MEASUREMENT_GROUPS } from './measurementResultData';
import { formatEngineMetric } from '../utils/units';

/** El gesto horizontal recorre información; los botones cambian de parámetro. */
function Pages({ titles, pages, page, onPage }: { titles: string[]; pages: string[]; page: number; onPage: (page: number) => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { scroll.current?.scrollTo({ x: page * width, animated: false }); }, [page, width]);
  return <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.row}>{titles.map((title, i) => <Button key={title} accessibilityRole="tab" accessibilityState={{ selected: page === i }} onPress={() => onPage(i)} style={[styles.tab, { borderBottomColor: page === i ? colors.primary : 'transparent' }]}><Text style={{ color: page === i ? colors.primary : colors.textSecondary, fontWeight: '600' }}>{title}</Text></Button>)}</View>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e => width > 0 && onPage(Math.max(0, Math.min(titles.length - 1, Math.round(e.nativeEvent.contentOffset.x / width))))}>
        {pages.map((body, i) => <View key={titles[i]} accessibilityElementsHidden={i !== page} importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'} style={{ width: width || 1, padding: 16 }}><Text style={[styles.body, { color: colors.text }]}>{body}</Text></View>)}
      </ScrollView>
    </View>
    <Text accessibilityLabel={`${page + 1} ${t('de', 'of')} ${titles.length}`} style={[styles.dots, { color: colors.primary }]}>{titles.map((_, i) => i === page ? '●' : '○').join('  ')}</Text>
  </View>;
}

export function MeasurementExplorer({ presentation: p, forecast }: { presentation: MeasurementPresentation; forecast?: React.ReactNode }) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const system = useAppStore(s => s.preferences.measurementSystem);
  const [index, setIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [section, setSection] = useState(0);
  const [groupIndex, setGroupIndex] = useState(0);
  const [plan, setPlan] = useState(false);
  const detailScroll = useRef<ScrollView>(null);
  const parameter = index === null ? null : p.parameters[index];
  const stageItem = PHENOLOGICAL_STAGES.find(s => s.id === p.stage);
  const stage = language === 'en' ? stageItem?.labelEn : stageItem?.label;
  const statusLabels = {
    OPTIMAL: t('Condición favorable', 'Favorable condition'), WARNING: t('Requiere atención', 'Needs attention'),
    CRITICAL: t('Condición limitante', 'Limiting condition'), INFO: t('Dato de contexto', 'Context data'),
  };
  const tone = (m: ParameterPresentation) => m.status === 'CRITICAL' ? colors.danger : m.status === 'WARNING' ? colors.warning : m.status === 'OPTIMAL' ? colors.success : colors.textSecondary;
  const value = (m: ParameterPresentation) => {
    if (m.value == null) return t('Sin dato', 'No data');
    const f = formatEngineMetric(m.key, m.value, m.unit, system);
    return `${f.value.toFixed(1)} ${f.unit}`;
  };
  const close = () => { if (plan) setPlan(false); else setIndex(null); };
  const move = (next: number) => { setIndex(next); setPage(0); detailScroll.current?.scrollTo({ y: 0, animated: false }); };
  const planBody = [p.summary, ...p.actions.map((a, i) => `${i + 1}. ${a}`), p.weatherNote].join('\n\n');
  return <View style={styles.container}>
    <Text style={[styles.context, { color: colors.textSecondary }]}>{stage} · {p.context}</Text>
    <Text style={[styles.title, { color: colors.text }]}>{p.title}</Text>
    <View style={styles.row}>{[t('Resumen', 'Summary'), t('Lecturas', 'Readings'), t('Consejos', 'Advice'), t('Pronóstico', 'Forecast')].map((label, i) => <Button key={label} accessibilityRole="tab" accessibilityState={{ selected: section === i }} onPress={() => setSection(i)} style={[styles.tab, { borderBottomColor: section === i ? colors.primary : 'transparent' }]}><Text style={{ color: section === i ? colors.primary : colors.textSecondary, textAlign: 'center' }}>{label}</Text></Button>)}</View>
    {section === 0 && <Text style={[styles.body, { color: colors.text }]}>{p.summary}</Text>}
    {section === 2 && <><Text style={[styles.title, { color: colors.text }]}>{t('Recomendaciones', 'Recommendations')}</Text><Text style={[styles.body, { color: colors.text }]}>{p.actions.join('\n\n') || t('Sin acciones registradas.', 'No actions recorded.')}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{p.weatherNote}</Text></>}
    {section === 3 && (forecast || <Text style={[styles.body, { color: colors.textSecondary }]}>{p.weatherNote}</Text>)}
    {(section === 0 || section === 2) && <>
    <Button onPress={() => setPlan(true)} style={styles.button}><Text style={{ color: colors.primary, fontWeight: '600' }}>{t('Ver plan global ›', 'View global plan ›')}</Text></Button>
    </>}
    {section === 1 && <View style={styles.row}>{[['Suelo', 'Soil'], ['Nutrientes', 'Nutrients'], ['Ambiente', 'Environment']].map(([es, en], i) => <Button key={es} accessibilityRole="tab" accessibilityState={{ selected: groupIndex === i }} onPress={() => setGroupIndex(i)} style={[styles.tab, { borderBottomColor: groupIndex === i ? colors.primary : 'transparent' }]}><Text style={{ color: groupIndex === i ? colors.primary : colors.textSecondary }}>{t(es, en)}</Text></Button>)}</View>}
    {section === 1 && [['Suelo', 'Soil'], ['Nutrientes', 'Nutrients'], ['Ambiente', 'Environment']].map(([es, en], group) => groupIndex === group && <View key={es}><Text style={[styles.title, { color: colors.text }]}>{t(es, en)}</Text><View style={styles.grid}>{p.parameters.map((m, i) => MEASUREMENT_GROUPS[group].includes(m.key) && <Button key={m.key} onPress={() => move(i)} accessibilityLabel={`${parameterLabel(m.key, language)}, ${value(m)}, ${group === 1 ? t('Sin validar', 'Not validated') : statusLabels[m.status]}. ${t('Abrir detalle.', 'Open detail.')}`} style={[styles.card, { width: width < 360 || fontScale > 1.3 ? '100%' : '48%', backgroundColor: colors.card, borderColor: colors.border, borderTopColor: tone(m) }]}>
      <Text style={{ color: colors.textSecondary }}>{parameterLabel(m.key, language)}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value(m)}</Text>
      <Text style={{ color: tone(m), marginTop: 8 }}>{m.key === 'nitrogen' || m.key === 'phosphorus' || m.key === 'potassium' ? t('Sin validar', 'Not validated') : statusLabels[m.status]}</Text>
      <Text style={{ color: colors.primary, marginTop: 8 }}>{t('Ver detalle ›', 'View detail ›')}</Text>
    </Button>)}</View></View>)}
    <GuideModal visible={index !== null || plan} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Button onPress={close} style={styles.back}><Text style={{ color: colors.primary, fontWeight: '600' }}>‹ {plan && parameter ? t('Volver al parámetro', 'Back to parameter') : t('Volver al resumen', 'Back to summary')}</Text></Button>
        <ScrollView ref={detailScroll} contentContainerStyle={styles.detail}>
          {plan ? <><Text style={[styles.title, { color: colors.text }]}>{t('Plan global', 'Global plan')}</Text><Text style={[styles.context, { color: colors.textSecondary }]}>{stage} · {p.context}</Text><Text style={[styles.body, { color: colors.text }]}>{planBody}</Text></> : parameter && <>
            <Text style={[styles.context, { color: colors.textSecondary }]}>{t('Parámetro', 'Parameter')} {index! + 1} {t('de', 'of')} {p.parameters.length} · {stage}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{parameterLabel(parameter.key, language)}</Text>
            <Text style={[styles.value, { color: colors.text }]}>{value(parameter)}</Text>
            <Text style={[styles.context, { color: tone(parameter) }]}>{['nitrogen', 'phosphorus', 'potassium'].includes(parameter.key) ? t('Sin validar', 'Not validated') : statusLabels[parameter.status]}</Text>
            <Pages key={parameter.key} titles={[t('Estado', 'Status'), t('Recomendación', 'Recommendation'), t('Control', 'Check')]} pages={[parameter.state, parameter.recommendation, parameter.control]} page={page} onPage={setPage} />
            <Button onPress={() => setPlan(true)} style={styles.button}><Text style={{ color: colors.primary }}>{t('Ver plan global ›', 'View global plan ›')}</Text></Button>
          </>}
        </ScrollView>
        {!plan && parameter && <View style={[styles.row, styles.footer, { borderColor: colors.border }]}>
          <Button disabled={index === 0} onPress={() => move(index! - 1)} style={[styles.nav, { opacity: index === 0 ? 0.35 : 1 }]}><Text style={{ color: colors.primary }}>{t('‹ Parámetro anterior', '‹ Previous parameter')}</Text></Button>
          <Button disabled={index === p.parameters.length - 1} onPress={() => move(index! + 1)} style={[styles.nav, { opacity: index === p.parameters.length - 1 ? 0.35 : 1 }]}><Text style={{ color: colors.primary }}>{t('Siguiente parámetro ›', 'Next parameter ›')}</Text></Button>
        </View>}
      </SafeAreaView>
    </GuideModal>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 12 }, context: { fontSize: 14, lineHeight: 21, marginVertical: 8 }, title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 25 }, value: { fontSize: 23, fontWeight: '600', marginTop: 10 }, row: { flexDirection: 'row' },
  panel: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' }, tab: { flex: 1, minHeight: 52, padding: 8, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3 },
  dots: { textAlign: 'center', paddingBottom: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { borderWidth: 1, borderTopWidth: 4, borderRadius: 16, padding: 14, minHeight: 150 }, button: { minHeight: 48, justifyContent: 'center' },
  back: { padding: 18, minHeight: 56 }, detail: { padding: 20, paddingBottom: 32 }, footer: { borderTopWidth: 1, padding: 12, gap: 12 }, nav: { flex: 1, minHeight: 52, justifyContent: 'center', alignItems: 'center' },
});
