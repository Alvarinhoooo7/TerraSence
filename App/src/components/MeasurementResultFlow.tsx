import React, { useEffect, useState } from 'react';
import { BackHandler, Text, View, useWindowDimensions } from 'react-native';
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
  const { colors } = useAppTheme();
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

  // --- Plan global: diagnóstico de conjunto con el texto completo ---
  if (plan) {
    return <ScreenLayout onBack={back} backLabel={t('Recomendaciones', 'Recommendations')} action={saveAction}
      eyebrow={t(`PLAN GLOBAL · ${stage.toUpperCase()}`, `OVERALL PLAN · ${stage.toUpperCase()}`)} title={p.title} description={p.context}>
      <ScreenCard><ScreenText muted={false}>{p.summary}</ScreenText></ScreenCard>
      {!!p.actions.length && <><ScreenLabel>{t('Qué hacer', 'What to do')}</ScreenLabel>
        {p.actions.map((action, i) => <ScreenCard key={i}><ScreenText muted={false}>{`${i + 1}. ${action}`}</ScreenText></ScreenCard>)}</>}
      {!!p.weatherNote && <><ScreenLabel>{t('Clima', 'Weather')}</ScreenLabel><ScreenCard><ScreenText>{p.weatherNote}</ScreenText></ScreenCard></>}
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
      <View style={{ gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 40, fontWeight: '700', letterSpacing: -1 }}>{value(m)}</Text>
        <Text style={{ color: tone(m), fontSize: 16, fontWeight: '700' }}>{statusLabel(m)}</Text>
      </View>
      <ScreenLabel>{t('Estado', 'Status')}</ScreenLabel>
      <ScreenCard accent={tone(m)}><ScreenText muted={false}>{m.state}</ScreenText></ScreenCard>
      <ScreenLabel>{t('Recomendación', 'Recommendation')}</ScreenLabel>
      <ScreenCard><ScreenText muted={false}>{m.recommendation}</ScreenText></ScreenCard>
      <ScreenLabel>{t('Control', 'Check')}</ScreenLabel>
      <ScreenCard><ScreenText muted={false}>{m.control}</ScreenText></ScreenCard>
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
      {!!meta && <ScreenText>{meta}</ScreenText>}
      <ScreenCard><ScreenText muted={false}>{p.summary}</ScreenText></ScreenCard>
      <ScreenLabel>{t('Datos esenciales', 'Key readings')}</ScreenLabel>
      <ScreenCard>
        {essentials.map(m => <View key={m.key} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, minHeight: 32 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 15, flexShrink: 1 }}>{parameterLabel(m.key, language)}</Text>
          <Text style={{ color: tone(m), fontSize: 17, fontWeight: '700' }}>{value(m)}</Text>
        </View>)}
      </ScreenCard>
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
    const half = width >= 360 && fontScale <= 1.3;
    return <ScreenLayout {...common} eyebrow={t('LECTURAS', 'READINGS')} title={titles[0]} description={titles[1]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {p.parameters.map((m, i) => MEASUREMENT_GROUPS[group].includes(m.key) && <GuideTouchable key={m.key} onPress={() => openDetail(i)}
          guideTitle={parameterLabel(m.key, language)} guide={t('Abre el estado, la recomendación y el control de esta variable.', 'Opens the status, recommendation and check for this variable.')}
          accessibilityLabel={`${parameterLabel(m.key, language)}, ${value(m)}, ${statusLabel(m)}. ${t('Abrir detalle.', 'Open detail.')}`}
          style={{ width: half ? '47.5%' : '100%', flexGrow: 1, minHeight: 132, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, padding: 16, gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{parameterLabel(m.key, language)}</Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{value(m)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: tone(m) }} />
            <Text style={{ color: tone(m), fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{statusLabel(m)}</Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 'auto' }}>{t('Ver detalle ›', 'View detail ›')}</Text>
        </GuideTouchable>)}
      </View>
    </ScreenLayout>;
  }

  // --- Recomendaciones ---
  if (current === 'advice') {
    return <ScreenLayout {...common} eyebrow={t('RECOMENDACIONES', 'RECOMMENDATIONS')} title={t('Qué hacer', 'What to do')}
      description={t(`Según la lectura y la etapa ${stage.toLowerCase()}.`, `Based on the reading and the ${stage.toLowerCase()} stage.`)}>
      {p.actions.length ? p.actions.map((action, i) => <ScreenCard key={i}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{t(`PASO ${i + 1}`, `STEP ${i + 1}`)}</Text>
        <ScreenText muted={false}>{action}</ScreenText>
      </ScreenCard>) : <ScreenCard><ScreenText>{t('No hay acciones para esta lectura.', 'No actions for this reading.')}</ScreenText></ScreenCard>}
      {!!p.weatherNote && <><ScreenLabel>{t('Clima', 'Weather')}</ScreenLabel><ScreenCard><ScreenText>{p.weatherNote}</ScreenText></ScreenCard></>}
      <ScreenOption title={t('Ver plan global', 'View overall plan')} subtitle={t('Suelo, etapa y pronóstico juntos, con el texto completo.', 'Soil, stage and forecast together, with the full text.')} onPress={() => setPlan(true)} />
    </ScreenLayout>;
  }

  // --- Pronóstico y captura ---
  return <ScreenLayout {...common} eyebrow={t('PRONÓSTICO Y CAPTURA', 'FORECAST AND CAPTURE')}
    title={forecast.historical ? t('Pronóstico registrado', 'Recorded forecast') : t('Próximos cinco días', 'Next five days')}>
    <MeasurementForecast {...forecast} />
  </ScreenLayout>;
}
