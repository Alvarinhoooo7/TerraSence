import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuideModal } from './guide/GuideModal';
import { GuideTouchable as Button } from './guide/GuideControls';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { PHENOLOGICAL_STAGES } from '../types/app';
import type { MeasurementPresentation, ParameterPresentation } from '../engine/measurementPresentation';
import { formatEngineMetric } from '../utils/units';

/** El gesto horizontal recorre información; los botones cambian de parámetro. */
function Pages({ titles, pages, page, onPage }: { titles: string[]; pages: string[]; page: number; onPage: (page: number) => void }) {
  const { colors } = useAppTheme();
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
    <Text accessibilityLabel={`${page + 1} de ${titles.length}`} style={[styles.dots, { color: colors.primary }]}>{titles.map((_, i) => i === page ? '●' : '○').join('  ')}</Text>
  </View>;
}

export function MeasurementExplorer({ presentation: p }: { presentation: MeasurementPresentation }) {
  const { colors } = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const system = useAppStore(s => s.preferences.measurementSystem);
  const [index, setIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [summaryPage, setSummaryPage] = useState(0);
  const [plan, setPlan] = useState(false);
  const detailScroll = useRef<ScrollView>(null);
  const parameter = index === null ? null : p.parameters[index];
  const stage = PHENOLOGICAL_STAGES.find(s => s.id === p.stage)?.label;
  const statusLabels = { OPTIMAL: 'Condición favorable', WARNING: 'Requiere atención', CRITICAL: 'Condición limitante', INFO: 'Dato de contexto' };
  const tone = (m: ParameterPresentation) => m.status === 'CRITICAL' ? colors.danger : m.status === 'WARNING' ? colors.warning : m.status === 'OPTIMAL' ? colors.success : colors.textSecondary;
  const value = (m: ParameterPresentation) => {
    if (m.value == null) return 'Sin dato';
    const f = formatEngineMetric(m.key, m.value, m.unit, system);
    return `${f.value.toFixed(1)} ${f.unit}`;
  };
  const close = () => { if (plan) setPlan(false); else setIndex(null); };
  const move = (next: number) => { setIndex(next); setPage(0); detailScroll.current?.scrollTo({ y: 0, animated: false }); };
  const planBody = [p.summary, ...p.actions.map((a, i) => `${i + 1}. ${a}`), p.weatherNote].join('\n\n');
  return <View style={styles.container}>
    <Text style={[styles.context, { color: colors.textSecondary }]}>{stage} · {p.context}</Text>
    <Text style={[styles.title, { color: colors.text }]}>{p.title}</Text>
    <Pages titles={['Resumen', 'Qué hacer', 'Qué revisar']} pages={[p.summary, p.actions.join('\n\n') || 'Sin acciones registradas.', p.weatherNote]} page={summaryPage} onPage={setSummaryPage} />
    <Button onPress={() => setPlan(true)} style={styles.button}><Text style={{ color: colors.primary, fontWeight: '600' }}>Ver plan global ›</Text></Button>
    <View style={styles.grid}>{p.parameters.map((m, i) => <Button key={m.key} onPress={() => move(i)} accessibilityLabel={`${m.label}, ${value(m)}, ${statusLabels[m.status]}. Abrir detalle.`} style={[styles.card, { width: width < 360 || fontScale > 1.3 ? '100%' : '48%', backgroundColor: colors.card, borderColor: colors.border, borderTopColor: tone(m) }]}>
      <Text style={{ color: colors.textSecondary }}>{m.label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value(m)}</Text>
      <Text style={{ color: tone(m), marginTop: 8 }}>{m.key === 'nitrogen' || m.key === 'phosphorus' || m.key === 'potassium' ? 'Sin validar' : statusLabels[m.status]}</Text>
      <Text style={{ color: colors.primary, marginTop: 8 }}>Ver detalle ›</Text>
    </Button>)}</View>
    <GuideModal visible={index !== null || plan} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Button onPress={close} style={styles.back}><Text style={{ color: colors.primary, fontWeight: '600' }}>‹ {plan && parameter ? 'Volver al parámetro' : 'Volver al resumen'}</Text></Button>
        <ScrollView ref={detailScroll} contentContainerStyle={styles.detail}>
          {plan ? <><Text style={[styles.title, { color: colors.text }]}>Plan global</Text><Text style={[styles.context, { color: colors.textSecondary }]}>{stage} · {p.context}</Text><Text style={[styles.body, { color: colors.text }]}>{planBody}</Text></> : parameter && <>
            <Text style={[styles.context, { color: colors.textSecondary }]}>Parámetro {index! + 1} de {p.parameters.length} · {stage}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{parameter.label}</Text>
            <Text style={[styles.value, { color: colors.text }]}>{value(parameter)}</Text>
            <Text style={[styles.context, { color: tone(parameter) }]}>{statusLabels[parameter.status]}</Text>
            <Pages key={parameter.key} titles={['Estado', 'Recomendación', 'Control']} pages={[parameter.state, parameter.recommendation, parameter.control]} page={page} onPage={setPage} />
            <Button onPress={() => setPlan(true)} style={styles.button}><Text style={{ color: colors.primary }}>Ver plan global ›</Text></Button>
          </>}
        </ScrollView>
        {!plan && parameter && <View style={[styles.row, styles.footer, { borderColor: colors.border }]}>
          <Button disabled={index === 0} onPress={() => move(index! - 1)} style={[styles.nav, { opacity: index === 0 ? 0.35 : 1 }]}><Text style={{ color: colors.primary }}>‹ Parámetro anterior</Text></Button>
          <Button disabled={index === p.parameters.length - 1} onPress={() => move(index! + 1)} style={[styles.nav, { opacity: index === p.parameters.length - 1 ? 0.35 : 1 }]}><Text style={{ color: colors.primary }}>Siguiente parámetro ›</Text></Button>
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
