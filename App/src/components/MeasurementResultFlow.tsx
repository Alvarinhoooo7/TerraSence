import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, View, useWindowDimensions } from 'react-native';
import { Text } from './AppText';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, SlideInLeft, SlideInRight, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { GuideTouchable } from './guide/GuideControls';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BatteryBar } from './result/BatteryBar';
import { useResetGuide } from './guide/GuideContext';
import { EntryButton } from './entry/EntryUI';
import { ScreenCard, ScreenLabel, ScreenLayout, ScreenOption, ScreenText, StepProgress } from './screen/ScreenUI';
import { MeasurementForecast, type ForecastProps } from './MeasurementForecast';
import { MEASUREMENT_GROUPS } from './measurementResultData';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PHENOLOGICAL_STAGES } from '../types/app';
import { parameterLabel, presentationSpeciesName, type MeasurementPresentation, type ParameterPresentation } from '../engine/measurementPresentation';
import { AppIcon } from './AppIcon';
import { formatEngineMetric } from '../utils/units';
import { MetricBadge, MetricScale, StatusRing } from './result/ResultVisuals';
import { StageArt } from './StageCards';
import { EnvironmentReadingArt, NutrientReadingArt, SoilReadingArt } from './result/ReadingArt';
import { MotionEasing, enterDown } from '../constants/motion';
import type { Recommendation, RecommendationKind, RecommendationTiming } from '../engine/contextualAdvice';

const NUTRIENTS = ['nitrogen', 'phosphorus', 'potassium'];
type Step = 'summary' | 'soil' | 'nutrients' | 'environment' | 'forecast' | 'advice';
// El plan de recomendaciones cierra el recorrido: se lee después de ver lecturas y clima.
const STEPS: Step[] = ['summary', 'soil', 'nutrients', 'environment', 'forecast', 'advice'];
const GROUP_OF: Partial<Record<Step, number>> = { soil: 0, nutrients: 1, environment: 2 };

const RAIN = '#3B8FD9';
/** Ícono de cada tema del plan, en un cuadro de 24. */
const KIND_ICON: Record<RecommendationKind, string> = {
  soil: 'M2 14C6 12 9 12 12 14S18 16 22 14M2 19H22M12 3V10M9 7H15',
  evidence: 'M11 18A7 7 0 1 1 11 4a7 7 0 0 1 0 14ZM16 16 21 21',
  weather: 'M7 16a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5 3.5 3.5 0 0 1 17.5 16ZM9 19l-1 2M13 19l-1 2M17 19l-1 2',
  irrigation: 'M12 3C12 3 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 3 12 3Z',
  monitoring: 'M3 10A9 9 0 0 1 19 6L21 9M21 3V9H15M21 14A9 9 0 0 1 5 18L3 15M3 21V15H9',
};

/**
 * Resultado de una medición, una pantalla por paso (plan de diseño §10.2):
 * resumen, las tres familias de lecturas, clima con los datos de la captura y,
 * al final, el plan de recomendaciones. Cada variable abre su propio detalle. Lo usan la
 * medición nueva (con Guardar, siempre a mano en la barra superior, sin
 * esperar el pronóstico) y el detalle del historial (sin Guardar).
 */
export function MeasurementResultFlow({ presentation: p, forecast, notices, meta, onExit, exitLabel, save }: {
  presentation: MeasurementPresentation;
  forecast: ForecastProps;
  notices?: React.ReactNode;
  meta?: string;
  onExit: () => void;
  exitLabel?: string;
  save?: { onSave: () => void; busy: boolean };
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
  // Hacia dónde entra la próxima pantalla: 1 desde la derecha (avanzar), -1 desde la izquierda.
  const direction = useRef<1 | -1 | 0>(0);
  const openDetail = (index: number) => {
    direction.current = detail === null || index > detail ? 1 : -1;
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

  const canNext = !plan && (detail !== null ? detail < p.parameters.length - 1 : step < STEPS.length - 1);
  const canPrev = plan || detail !== null || step > 0;
  const forward = () => {
    if (!canNext) return;
    if (detail !== null) { openDetail(detail + 1); return; }
    direction.current = 1;
    setStep(step + 1);
  };
  const back = () => {
    direction.current = -1;
    if (plan) setPlan(false);
    else if (detail !== null) setDetail(null);
    else if (step > 0) setStep(step - 1);
    else onExit();
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!save?.busy) back(); return true; });
    return () => listener.remove();
  });

  // Carrusel: la página sigue al dedo y, pasado el umbral, sale hacia el lado mientras la
  // siguiente entra desde el otro; si no, vuelve a su lugar sin rebote. En los extremos ofrece
  // resistencia. El botón de abajo y el atrás del teléfono usan la misma entrada lateral.
  // Sólo cuenta un gesto horizontal, para no competir con el desplazamiento vertical.
  const screenKey = plan ? 'plan' : detail !== null ? `detalle-${detail}` : current;
  const offset = useSharedValue(0);
  useLayoutEffect(() => { offset.value = 0; }, [screenKey, offset]);
  const busy = !!save?.busy;
  const swipe = Gesture.Pan().activeOffsetX([-16, 16]).failOffsetY([-14, 14])
    .onUpdate(event => {
      const blocked = busy || (event.translationX < 0 ? !canNext : !canPrev);
      offset.value = blocked ? event.translationX * .25 : event.translationX;
    })
    .onEnd(event => {
      const dir = event.translationX < 0 ? 1 : -1;
      const far = Math.abs(event.translationX) > width * .28 || Math.abs(event.velocityX) > 700;
      if (far && !busy && (dir > 0 ? canNext : canPrev)) {
        offset.value = withTiming(-dir * width, { duration: 170, easing: Easing.in(Easing.quad) }, finished => {
          if (finished) runOnJS(dir > 0 ? forward : back)();
        });
        return;
      }
      offset.value = withTiming(0, { duration: 220, easing: MotionEasing });
      // En la primera página, deslizar hacia la derecha equivale a salir (con su confirmación).
      if (far && !busy && dir < 0) runOnJS(onExit)();
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const entering = direction.current > 0 ? SlideInRight.duration(260).easing(MotionEasing)
    : direction.current < 0 ? SlideInLeft.duration(260).easing(MotionEasing) : undefined;
  const swipeable = (screen: React.ReactNode) => <GestureDetector gesture={swipe}>
    <Animated.View collapsable={false} style={[{ flex: 1 }, dragStyle]}>
      <Animated.View key={screenKey} entering={entering} style={{ flex: 1 }}>{screen}</Animated.View>
    </Animated.View>
  </GestureDetector>;
  const battery = <BatteryBar percent={forecast.battery} />;

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
        <ScreenText muted={false}>{p.coverage
          ? t('Coincidencias parciales por temperatura y pH. La conductividad no se compara sin método compatible:', 'Partial temperature and pH matches. Conductivity is not compared without a compatible method:')
          : t('Posibilidades registradas al medir:', 'Possibilities recorded at capture:')}</ScreenText>
        {p.suggestedCrops.map(crop => <ScreenText key={crop} muted={false}>{crop}</ScreenText>)}
        <ScreenText>{t('Son posibilidades para evaluar, no una garantía de aptitud. Confirma humedad, textura, drenaje, temporada y clima local antes de sembrar.', 'These are possibilities to assess, not a guarantee of suitability. Confirm moisture, texture, drainage, season and local climate before planting.')}</ScreenText>
      </> : <ScreenText>{t('No hay coincidencias disponibles con los criterios evaluables de esta captura. Esto no significa que ningún cultivo pueda crecer aquí; revisa los datos y sus limitaciones.', 'No matches are available under the assessable criteria for this capture. This does not mean no crop can grow here; review the data and its limitations.')}</ScreenText>}
  </ScreenCard> : null;

  // --- Plan global: diagnóstico de conjunto con el texto completo ---
  if (plan) {
    return swipeable(<ScreenLayout key="plan" onBack={back} backLabel={t('Recomendaciones', 'Recommendations')}
      eyebrow={t(`PLAN GLOBAL · ${stage.toUpperCase()}`, `OVERALL PLAN · ${stage.toUpperCase()}`)} title={p.title} description={p.context}>
      <ScreenCard accent={colors.primary}><ScreenText muted={false}>{p.summary}</ScreenText></ScreenCard>
      {possibleCropsCard}
      {!!p.actions.length && <><ScreenLabel>{t('Qué hacer', 'What to do')}</ScreenLabel>{timeline}</>}
      {weatherCard}
    </ScreenLayout>);
  }

  // --- Detalle de una variable ---
  if (detail !== null) {
    const m = p.parameters[detail];
    const group = MEASUREMENT_GROUPS.findIndex(keys => keys.includes(m.key));
    const groupName = [t('Suelo', 'Soil'), t('Nutrientes', 'Nutrients'), t('Ambiente', 'Environment')][group] ?? t('Lecturas', 'Readings');
    return swipeable(<ScreenLayout key={`detalle-${detail}`} onBack={back} backLabel={groupName}
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
    </ScreenLayout>);
  }

  const last = step === STEPS.length - 1;
  const footer = <>
    <StepProgress index={step} total={STEPS.length} />
    {last
      ? (save ? <EntryButton label={t('Guardar resultado', 'Save result')} busy={save.busy} onPress={save.onSave} />
        : <EntryButton label={exitLabel ?? t('Cerrar', 'Close')} onPress={onExit} />)
      : <EntryButton label={t('Continuar', 'Continue')} onPress={forward} />}
  </>;
  // Cada pantalla lleva `key`: al cambiar de paso parte desde arriba, sin heredar el desplazamiento.
  const common = { leading: battery, footer };

  // --- Resumen ---
  if (current === 'summary') {
    const essentials = p.parameters.filter(m => MEASUREMENT_GROUPS[0].includes(m.key));
    return swipeable(<ScreenLayout key={current} {...common} eyebrow={t(`RESULTADO · ${stage.toUpperCase()}`, `RESULT · ${stage.toUpperCase()}`)} title={p.title} description={p.context}>
      {notices}
      {/* Portada: cuántas variables quedaron bien y la etapa ilustrada. */}
      <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 }}>
          {p.evaluationState === 'insufficient_data'
            ? <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '700', maxWidth: 140 }}>{t('Evaluación insuficiente', 'Insufficient assessment')}</Text>
            : <StatusRing counts={counts} />}
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
        {/* Especie indicada al medir (presentación v3). Pre-siembra no la pregunta. */}
        {p.version === 3 && p.stage !== 'pre_siembra' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#1F4636' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#17392C', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="leaf" color={p.species ? '#C6DFB4' : '#6E8A78'} size={20} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: '#6EE7B7', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>{t('ESPECIE', 'SPECIES')}</Text>
            {p.species ? <>
              <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{presentationSpeciesName(p.species, language)}</Text>
              <Text numberOfLines={1} style={{ color: '#C4D4C9', fontSize: 13, fontStyle: 'italic' }}>{p.species.scientific}</Text>
            </> : <Text style={{ color: '#C4D4C9', fontSize: 15 }}>{t('Sin especie indicada', 'No species selected')}</Text>}
          </View>
        </View>}
      </View>
      <ScreenCard accent={colors.primary}><ScreenText muted={false}>{p.summary}</ScreenText></ScreenCard>
      {possibleCropsCard}
      <ScreenLabel>{t('Datos esenciales', 'Key readings')}</ScreenLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {essentials.map(m => tile(m, p.parameters.indexOf(m)))}
      </View>
    </ScreenLayout>);
  }

  // --- Lecturas por familia: qué se mide, una ilustración y las tarjetas abajo ---
  const group = GROUP_OF[current];
  if (group !== undefined) {
    const family = [
      { title: t('Suelo', 'Soil'), art: <SoilReadingArt label={t('Sonda enterrada midiendo el suelo', 'Probe in the ground measuring the soil')} />,
        description: t('La sonda mide el suelo a la profundidad de sus electrodos: humedad (cuánta agua tiene), temperatura, pH (qué tan ácido o alcalino es) y conductividad eléctrica (sales disueltas).',
          'The probe measures the soil at the depth of its electrodes: moisture (how much water it holds), temperature, pH (how acidic or alkaline it is) and electrical conductivity (dissolved salts).') },
      { title: t('Nutrientes', 'Nutrients'), art: <NutrientReadingArt label={t('Nitrógeno, fósforo y potasio en el suelo', 'Nitrogen, phosphorus and potassium in the soil')} />,
        description: t('Nitrógeno (N), fósforo (P) y potasio (K) estimados por la sonda, en mg/kg. Sirven para comparar lecturas entre sí, pero no tienen validación química: no se usan para calcular dosis. Antes de fertilizar, confírmalos con un análisis de laboratorio.',
          'Nitrogen (N), phosphorus (P) and potassium (K) estimated by the probe, in mg/kg. They help compare readings, but have no chemical validation: they are not used to calculate doses. Confirm them with a laboratory analysis before fertilizing.') },
      { title: t('Ambiente', 'Environment'), art: <EnvironmentReadingArt label={t('Sensor del equipo midiendo el aire', 'Device sensor measuring the air')} />,
        description: t('El sensor del equipo mide el aire junto a la sonda en el momento de la captura: temperatura, humedad relativa y presión atmosférica. Es un dato local e instantáneo; el pronóstico está en la página siguiente.',
          'The device sensor measures the air next to the probe at capture time: temperature, relative humidity and atmospheric pressure. It is a local, instant value; the forecast is on the next page.') },
    ][group];
    // `fill`: la ilustración toma el alto libre y deja las tarjetas al pie, sin desplazar.
    return swipeable(<ScreenLayout key={current} {...common} fill eyebrow={t('LECTURAS', 'READINGS')} title={family.title} description={family.description}>
      {/* Base cero: la ilustración sólo toma el alto que sobra, con un mínimo visible. */}
      <Animated.View entering={enterDown(80)} style={{ flexGrow: 1, flexBasis: 0, minHeight: 72, maxHeight: 190 }}>{family.art}</Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {p.parameters.map((m, i) => MEASUREMENT_GROUPS[group].includes(m.key) && tile(m, i))}
      </View>
    </ScreenLayout>);
  }

  // --- Clima y captura ---
  if (current === 'forecast') {
    return swipeable(<ScreenLayout key={current} {...common} eyebrow={t('CLIMA DEL PUNTO MEDIDO', 'WEATHER AT THE MEASURED POINT')}
      title={forecast.historical ? t('Clima registrado', 'Recorded weather') : t('Clima', 'Weather')}
      description={forecast.historical ? t('Cómo estaba el tiempo al medir y el pronóstico de ese momento.', 'The weather at capture time and the forecast back then.')
        : t('Cómo está el tiempo donde mediste y qué se espera para los próximos días.', 'The weather where you measured and what to expect over the next days.')}>
      <MeasurementForecast {...forecast} />
    </ScreenLayout>);
  }

  // --- Plan de recomendaciones: la última página y la más importante ---
  const kindMeta = (kind: RecommendationKind) => ({
    soil: { label: t('Suelo', 'Soil'), color: colors.primary },
    evidence: { label: t('Lectura', 'Reading'), color: colors.textSecondary },
    weather: { label: t('Clima', 'Weather'), color: RAIN },
    irrigation: { label: t('Riego', 'Irrigation'), color: RAIN },
    monitoring: { label: t('Seguimiento', 'Follow-up'), color: colors.primary },
  }[kind]);
  const whenLabel = (when: RecommendationTiming) => ({
    now: t('Ahora', 'Now'), today: t('Hoy', 'Today'), next_days: t('Próximos días', 'Next days'), next_reading: t('Próxima medición', 'Next reading'),
  }[when]);
  const chips = (r: Recommendation) => {
    const color = kindMeta(r.kind).color;
    return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d={KIND_ICON[r.kind]} /></Svg>
        <Text style={{ color, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>{kindMeta(r.kind).label.toUpperCase()}</Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: r.priority === 'high' ? `${colors.warning}22` : `${colors.textSecondary}18` }}>
        <Text style={{ color: r.priority === 'high' ? colors.warning : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{whenLabel(r.when)}</Text>
      </View>
    </View>;
  };
  const recs = p.recommendations;
  const speciesName = p.species ? presentationSpeciesName(p.species, language) : null;
  const first = recs?.[0];
  const recommendationList = first ? <>
    {/* La primera va destacada: es por donde conviene empezar. */}
    <Animated.View entering={enterDown(60)} style={{ borderRadius: 22, borderWidth: 2, borderColor: first.priority === 'high' ? colors.warning : colors.primary,
      backgroundColor: colors.card, padding: 18, gap: 10 }}>
      <Text style={{ color: first.priority === 'high' ? colors.warning : colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>{t('PARA EMPEZAR', 'START HERE')}</Text>
      {chips(first)}
      <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 }}>{first.title}</Text>
      <ScreenText muted={false}>{first.body}</ScreenText>
    </Animated.View>
    {recs.length > 1 && <ScreenLabel>{t('Después', 'Then')}</ScreenLabel>}
    {recs.slice(1).map((r, i) => <Animated.View key={`${r.kind}-${i}`} entering={enterDown(140 + i * 70)} style={{ flexDirection: 'row', gap: 14, borderRadius: 18, borderWidth: 1,
      borderColor: colors.border, backgroundColor: colors.card, padding: 16 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${kindMeta(r.kind).color}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: kindMeta(r.kind).color, fontSize: 14, fontWeight: '800' }}>{i + 2}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {chips(r)}
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{r.title}</Text>
        <ScreenText>{r.body}</ScreenText>
      </View>
    </Animated.View>)}
  </> : p.actions.length ? timeline : <ScreenCard><ScreenText>{t('No hay recomendaciones para esta lectura.', 'No recommendations for this reading.')}</ScreenText></ScreenCard>;
  return swipeable(<ScreenLayout key={current} {...common} eyebrow={t(`PLAN DE RECOMENDACIONES · ${stage.toUpperCase()}`, `RECOMMENDATION PLAN · ${stage.toUpperCase()}`)}
    title={t('Lo que te recomendamos', 'What we recommend')}
    description={speciesName
      ? t(`Según la lectura, la etapa ${stage.toLowerCase()}, la especie (${speciesName}) y el clima. Son sugerencias: tú decides qué aplicar en tu campo.`,
        `Based on the reading, the ${stage.toLowerCase()} stage, the species (${speciesName}) and the weather. These are suggestions: you decide what to apply in your field.`)
      : t(`Según la lectura, la etapa ${stage.toLowerCase()} y el clima. Son sugerencias: tú decides qué aplicar en tu campo.`,
        `Based on the reading, the ${stage.toLowerCase()} stage and the weather. These are suggestions: you decide what to apply in your field.`)}>
    {recommendationList}
    {possibleCropsCard}
    <ScreenCard>
      <ScreenText>{t('Las recomendaciones usan reglas orientativas y los datos de esta captura. Confírmalas con lo que ves en terreno y, si tienes dudas, con tu asesor agrícola.',
        'Recommendations use indicative rules and the data from this capture. Check them against what you see in the field and, if in doubt, with your agricultural advisor.')}</ScreenText>
    </ScreenCard>
    <ScreenOption title={t('Ver plan global', 'View overall plan')} subtitle={t('Suelo, etapa y pronóstico juntos, con el texto completo.', 'Soil, stage and forecast together, with the full text.')} onPress={() => { direction.current = 1; setPlan(true); }} />
  </ScreenLayout>);
}
