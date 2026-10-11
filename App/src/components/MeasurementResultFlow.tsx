import React, { useEffect, useState } from 'react';
import { BackHandler, View, useWindowDimensions } from 'react-native';
import { Text } from './AppText';
import Svg, { Path } from 'react-native-svg';
import { GuideTouchable } from './guide/GuideControls';
import { useResetGuide } from './guide/GuideContext';
import { EntryButton } from './entry/EntryUI';
import { ScreenCard, ScreenLabel, ScreenLayout, ScreenOption, ScreenText, StepProgress } from './screen/ScreenUI';
import { MeasurementForecast, type ForecastProps } from './MeasurementForecast';
import { MEASUREMENT_GROUPS } from './measurementResultData';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PHENOLOGICAL_STAGES } from '../types/app';
import { parameterLabel, type MeasurementPresentation, type ParameterPresentation } from '../engine/measurementPresentation';
import { formatEngineMetric } from '../utils/units';
import { MetricBadge, MetricScale, StatusRing } from './result/ResultVisuals';
import { StageArt } from './StageCards';

const NUTRIENTS = ['nitrogen', 'phosphorus', 'potassium'];
type Step = 'summary' | 'soil' | 'nutrients' | 'environment' | 'advice' | 'forecast';
const STEPS: Step[] = ['summary', 'soil', 'nutrients', 'environment', 'advice', 'forecast'];
const GROUP_OF: Partial<Record<Step, number>> = { soil: 0, nutrients: 1, environment: 2 };

/**
 * Resultado de una medición, una pantalla por paso (plan de diseño §10.2):
 * resumen, las tres familias de lecturas, recomendaciones y pronóstico con los
 * datos de la captura. Cada variable abre su propio detalle. Lo usan la
 * medición nueva (con Guardar, siempre a mano en la barra superior, sin
 * esperar el pronóstico) y el detalle del historial (sin Guardar).
 */
export function MeasurementResultFlow({ presentation: p, forecast, notices, meta, onExit, exitLabel, save, onRestart }: {
  presentation: MeasurementPresentation;
  forecast: ForecastProps;
  notices?: React.ReactNode;
  meta?: string;
  onExit: () => void;
  exitLabel?: string;
  save?: { onSave: () => void; busy: boolean };
  onRestart?: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const { t, language, locale } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const system = useAppStore(s => s.preferences.measurementSystem);
  const [step, setStep] = useState(0);
  const [detail, setDetail] = useState<number | null>(null);
  const [plan, setPlan] = useState(false);
  const current = STEPS[step];
  useResetGuide(plan ? 'plan' : detail === null ? current : `detalle-${detail}`);
  // Abrir una variable también sitúa el paso en su familia: al recorrer con
  // anterior/siguiente, «Volver» lleva a la familia de la variable a la vista.
  const openDetail = (index: number) => {
    const family = MEASUREMENT_GROUPS.findIndex(keys => keys.includes(p.parameters[index].key));
    const familyStep = (Object.keys(GROUP_OF) as Step[]).find(key => GROUP_OF[key] === family);
    if (familyStep) setStep(STEPS.indexOf(familyStep));
    setDetail(index);
  };

  const stageItem = PHENOLOGICAL_STAGES.find(s => s.id === p.stage);
  const stage = (language === 'en' ? stageItem?.labelEn : stageItem?.label) ?? '';
  const statusLabel = (m: ParameterPresentation) => NUTRIENTS.includes(m.key) ? t('Sin validar', 'Not validated') : {
    OPTIMAL: t('Condición favorable', 'Favorable condition'), WARNING: t('Requiere atención', 'Needs attention'),
    CRITICAL: t('Condición limitante', 'Limiting condition'), INFO: t('Dato de contexto', 'Context data'),
  }[m.status];
  const tone = (m: ParameterPresentation) => NUTRIENTS.includes(m.key) ? colors.textSecondary
    : m.status === 'CRITICAL' ? colors.danger : m.status === 'WARNING' ? colors.warning : m.status === 'OPTIMAL' ? colors.success : colors.textSecondary;
  const value = (m: ParameterPresentation) => {
    if (m.value == null) return t('Sin dato', 'No data');
    const f = formatEngineMetric(m.key, m.value, m.unit, system);
    return `${f.value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${f.unit}`;
  };

  const back = () => {
    if (plan) setPlan(false);
    else if (detail !== null) setDetail(null);
    else if (step > 0) setStep(step - 1);
    else onExit();
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!save?.busy) back(); return true; });
    return () => listener.remove();
  });

  const saveAction = save ? <GuideTouchable accessibilityRole="button" disabled={save.busy} onPress={save.onSave}
    guide={t('Guarda la lectura ahora, sin esperar el pronóstico.', 'Saves the reading now, without waiting for the forecast.')}
    style={{ minHeight: 48, justifyContent: 'center', paddingLeft: 16, opacity: save.busy ? .5 : 1 }}>
    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>{save.busy ? t('Guardando…', 'Saving…') : t('Guardar', 'Save')}</Text>
  </GuideTouchable> : undefined;

  // --- Piezas compartidas ---
  const half = width >= 360 && fontScale <= 1.3;
  const scored = p.parameters.filter(m => !NUTRIENTS.includes(m.key) && m.status !== 'INFO');
  const counts = { ok: scored.filter(m => m.status === 'OPTIMAL').length, warn: scored.filter(m => m.status === 'WARNING').length, bad: scored.filter(m => m.status === 'CRITICAL').length };
  // Los datos de contexto y los nutrientes no tienen estado: su ícono lleva el verde de la marca.
  const badgeTone = (m: ParameterPresentation) => NUTRIENTS.includes(m.key) || m.status === 'INFO' ? colors.primary : tone(m);
  const statusPill = (m: ParameterPresentation) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: `${tone(m)}22` }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone(m) }} />
    <Text style={{ color: tone(m), fontSize: 13, fontWeight: '700' }}>{statusLabel(m)}</Text>
  </View>;
  const tile = (m: ParameterPresentation, i: number) => <GuideTouchable key={m.key} onPress={() => openDetail(i)}
    guideTitle={parameterLabel(m.key, language)} guide={t('Abre el estado, la recomendación y el control de esta variable.', 'Opens the status, recommendation and check for this variable.')}
    accessibilityLabel={`${parameterLabel(m.key, language)}, ${value(m)}, ${statusLabel(m)}. ${t('Abrir detalle.', 'Open detail.')}`}
    style={{ width: half ? '47.5%' : '100%', flexGrow: 1, minHeight: 150, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, padding: 14, gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <MetricBadge metric={m.key} tone={badgeTone(m)} size={38} />
      <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
    </View>
    <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 14 }}>{parameterLabel(m.key, language)}</Text>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{value(m)}</Text>
    <MetricScale metric={m.key} value={m.value} tone={tone(m)} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone(m) }} />
      <Text numberOfLines={2} style={{ color: tone(m), fontSize: 13, fontWeight: '700', flexShrink: 1 }}>{statusLabel(m)}</Text>
    </View>
  </GuideTouchable>;
  const section = (label: string, body: string, color: string) => <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 6 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: color }} />
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 }}>{label.toUpperCase()}</Text>
    </View>
    <ScreenText muted={false}>{body}</ScreenText>
  </View>;
  // Acciones como línea de tiempo numerada, igual que los pasos antes de medir.
  const timeline = <View>
    {p.actions.map((action, i) => <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{i + 1}</Text>
        </View>
        {i < p.actions.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: i < p.actions.length - 1 ? 18 : 0, paddingTop: 4 }}><ScreenText muted={false}>{action}</ScreenText></View>
    </View>)}
  </View>;
  const weatherCard = p.weatherNote ? <View style={{ flexDirection: 'row', gap: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 }}>
    <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#3B8FD922', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#3B8FD9" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M7 16a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5 3.5 3.5 0 0 1 17.5 16ZM9 19l-1 2M13 19l-1 2M17 19l-1 2" /></Svg>
    </View>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 }}>{t('CLIMA', 'WEATHER')}</Text>
      <ScreenText>{p.weatherNote}</ScreenText>
    </View>
  </View> : null;

  const possibleCropsCard = p.stage === 'pre_siembra' ? <ScreenCard accent={colors.primary}>
    <ScreenLabel>{t('Posibles cultivos', 'Possible crops')}</ScreenLabel>
    {p.suggestedCrops === undefined
      ? <ScreenText>{t('Esta lectura antigua no conserva sugerencias de cultivos.', 'This older reading does not keep crop suggestions.')}</ScreenText>
      : p.suggestedCrops.length ? <>
        <ScreenText muted={false}>{t('Con esta temperatura, pH y conductividad, podrías considerar:', 'With this temperature, pH and conductivity, you could consider:')}</ScreenText>
        {p.suggestedCrops.map(crop => <ScreenText key={crop} muted={false}>{crop}</ScreenText>)}
        <ScreenText>{t('Son posibilidades para evaluar, no una garantía de aptitud. Confirma humedad, textura, drenaje, temporada y clima local antes de sembrar.', 'These are possibilities to assess, not a guarantee of suitability. Confirm moisture, texture, drainage, season and local climate before planting.')}</ScreenText>
      </> : <ScreenText>{t('No encontramos coincidencias en el catálogo con esta temperatura, pH y conductividad. Esto no significa que ningún cultivo pueda crecer aquí; confirma las condiciones con asesoría agronómica.', 'No catalog crops match this temperature, pH and conductivity. This does not mean no crop can grow here; confirm conditions with agronomic advice.')}</ScreenText>}
  </ScreenCard> : null;

  // --- Plan global: diagnóstico de conjunto con el texto completo ---
  if (plan) {
    return <ScreenLayout onBack={back} backLabel={t('Recomendaciones', 'Recommendations')} action={saveAction}
      eyebrow={t(`PLAN GLOBAL · ${stage.toUpperCase()}`, `OVERALL PLAN · ${stage.toUpperCase()}`)} title={p.title} description={p.context}>
      <ScreenCard accent={colors.primary}><ScreenText muted={false}>{p.summary}</ScreenText></ScreenCard>
      {possibleCropsCard}
      {!!p.actions.length && <><ScreenLabel>{t('Qué hacer', 'What to do')}</ScreenLabel>{timeline}</>}
      {weatherCard}
    </ScreenLayout>;
  }

  // --- Detalle de una variable ---
  if (detail !== null) {
    const m = p.parameters[detail];
    const group = MEASUREMENT_GROUPS.findIndex(keys => keys.includes(m.key));
    const groupName = [t('Suelo', 'Soil'), t('Nutrientes', 'Nutrients'), t('Ambiente', 'Environment')][group] ?? t('Lecturas', 'Readings');
    return <ScreenLayout onBack={back} backLabel={groupName} action={saveAction}
      eyebrow={t(`VARIABLE ${detail + 1} DE ${p.parameters.length}`, `VARIABLE ${detail + 1} OF ${p.parameters.length}`)}
      title={parameterLabel(m.key, language)}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><EntryButton secondary disabled={detail === 0} label={t('‹ Anterior', '‹ Previous')} onPress={() => openDetail(detail - 1)} /></View>
        <View style={{ flex: 1 }}><EntryButton secondary disabled={detail === p.parameters.length - 1} label={t('Siguiente ›', 'Next ›')} onPress={() => openDetail(detail + 1)} /></View>
      </View>}>
      <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <MetricBadge metric={m.key} tone={badgeTone(m)} size={56} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>{value(m)}</Text>
            {statusPill(m)}
          </View>
        </View>
        <MetricScale metric={m.key} value={m.value} tone={tone(m)} labels />
      </View>
      {section(t('Estado', 'Status'), m.state, tone(m))}
      {section(t('Recomendación', 'Recommendation'), m.recommendation, colors.primary)}
      {section(t('Control', 'Check'), m.control, colors.textSecondary)}
    </ScreenLayout>;
  }

  const last = step === STEPS.length - 1;
  const footer = <>
    <StepProgress index={step} total={STEPS.length} />
    {last
      ? (save ? <EntryButton label={t('Guardar resultado', 'Save result')} busy={save.busy} onPress={save.onSave} />
        : <EntryButton label={exitLabel ?? t('Cerrar', 'Close')} onPress={onExit} />)
      : <EntryButton label={t('Continuar', 'Continue')} onPress={() => setStep(step + 1)} />}
  </>;
  const common = { onBack: back, backLabel: step === 0 ? (exitLabel ?? t('Salir', 'Exit')) : t('Atrás', 'Back'), action: saveAction, footer };

  // --- Resumen ---
  if (current === 'summary') {
    const essentials = p.parameters.filter(m => MEASUREMENT_GROUPS[0].includes(m.key));
    return <ScreenLayout {...common} eyebrow={t(`RESULTADO · ${stage.toUpperCase()}`, `RESULT · ${stage.toUpperCase()}`)} title={p.title} description={p.context}>
      {notices}
      {/* Portada: cuántas variables quedaron bien y la etapa ilustrada. */}
      <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 }}>
          <StatusRing counts={counts} />
          <View style={{ flex: 1, gap: 8 }}>
            {([[counts.ok, colors.success, t('Favorables', 'Favorable')], [counts.warn, colors.warning, t('Requieren atención', 'Need attention')], [counts.bad, colors.danger, t('Limitantes', 'Limiting')]] as const).map(([n, color, label]) =>
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: n ? 1 : .5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', minWidth: 16 }}>{n}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, flexShrink: 1 }}>{label}</Text>
              </View>)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#17392C' }}>
          <View style={{ width: 64, aspectRatio: 120 / 90, borderRadius: 10, overflow: 'hidden' }}><StageArt stage={p.stage} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: '#6EE7B7', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>{t('ETAPA', 'STAGE')}</Text>
            <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{stage}</Text>
            {!!meta && <Text numberOfLines={2} style={{ color: '#C4D4C9', fontSize: 13 }}>{meta}</Text>}
          </View>
        </View>
      </View>
      <ScreenCard accent={colors.primary}><ScreenText muted={false}>{p.summary}</ScreenText></ScreenCard>
      {possibleCropsCard}
      <ScreenLabel>{t('Datos esenciales', 'Key readings')}</ScreenLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {essentials.map(m => tile(m, p.parameters.indexOf(m)))}
      </View>
      {onRestart && <ScreenOption title={t('Cambiar etapa y medir de nuevo', 'Change stage and measure again')}
        subtitle={t('Descarta esta lectura.', 'Discards this reading.')} onPress={onRestart} />}
    </ScreenLayout>;
  }

  // --- Lecturas por familia ---
  const group = GROUP_OF[current];
  if (group !== undefined) {
    const titles = [
      [t('Suelo', 'Soil'), t('Humedad, temperatura, pH y conductividad del punto medido.', 'Moisture, temperature, pH and conductivity at the measured point.')],
      [t('Nutrientes', 'Nutrients'), t('Valores informativos que la sonda deriva de la conductividad. No son un análisis químico y no se usan para recomendar dosis.', 'Informative values the probe derives from conductivity. They are not a chemical analysis and are not used to recommend doses.')],
      [t('Ambiente', 'Environment'), t('Temperatura, humedad y presión del aire junto a la sonda.', 'Air temperature, humidity and pressure next to the probe.')],
    ][group];
    return <ScreenLayout {...common} eyebrow={t('LECTURAS', 'READINGS')} title={titles[0]} description={titles[1]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {p.parameters.map((m, i) => MEASUREMENT_GROUPS[group].includes(m.key) && tile(m, i))}
      </View>
    </ScreenLayout>;
  }

  // --- Recomendaciones ---
  if (current === 'advice') {
    return <ScreenLayout {...common} eyebrow={t('RECOMENDACIONES', 'RECOMMENDATIONS')} title={t('Qué hacer', 'What to do')}
      description={t(`Según la lectura y la etapa ${stage.toLowerCase()}.`, `Based on the reading and the ${stage.toLowerCase()} stage.`)}>
      {p.actions.length ? timeline : <ScreenCard><ScreenText>{t('No hay acciones para esta lectura.', 'No actions for this reading.')}</ScreenText></ScreenCard>}
      {possibleCropsCard}
      {weatherCard}
      <ScreenOption title={t('Ver plan global', 'View overall plan')} subtitle={t('Suelo, etapa y pronóstico juntos, con el texto completo.', 'Soil, stage and forecast together, with the full text.')} onPress={() => setPlan(true)} />
    </ScreenLayout>;
  }

  // --- Pronóstico y captura ---
  return <ScreenLayout {...common} eyebrow={t('PRONÓSTICO Y CAPTURA', 'FORECAST AND CAPTURE')}
    title={forecast.historical ? t('Pronóstico registrado', 'Recorded forecast') : t('Próximos cinco días', 'Next five days')}>
    <MeasurementForecast {...forecast} />
  </ScreenLayout>;
}
