import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, FlatList, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import Svg, { Path } from 'react-native-svg';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { GuideTouchable } from './guide/GuideControls';
import { BatteryBar } from './result/BatteryBar';
import { useResetGuide } from './guide/GuideContext';
import { EntryButton } from './entry/EntryUI';
import { ScreenCard, ScreenLabel, ScreenLayout, ScreenText, ScreenTopBar, StepProgress } from './screen/ScreenUI';
import { MeasurementForecast, type ForecastProps } from './MeasurementForecast';
import { MEASUREMENT_GROUPS } from './measurementResultData';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PHENOLOGICAL_STAGES } from '../types/app';
import { distinctNotes, parameterLabel, presentationSpeciesName, type CoverageSummary, type MeasurementPresentation, type ParameterPresentation, type PresentationDerived } from '../engine/measurementPresentation';
import type { PrePlantingOption } from '../engine/prePlanting';
import { AppIcon } from './AppIcon';
import { formatEngineMetric, formatTemperature, formatTemperatureDifference } from '../utils/units';
import { MetricBadge, MetricScale, StatusRing } from './result/ResultVisuals';
import { buildParameterCopy, derivedMeaning } from './result/resultCopy';
import { StageArt } from './StageCards';
import { EnvironmentReadingArt, NutrientReadingArt, SoilReadingArt } from './result/ReadingArt';
import { enterDown } from '../constants/motion';
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
 * Carrusel de páginas, como el de la bienvenida: todas las páginas están una al lado de la
 * otra en una lista horizontal paginada, así que al deslizar se ve entrar la siguiente
 * mientras sale la actual, sin fondo vacío. La barra superior y el pie quedan fijos y sólo
 * se desliza el contenido. `index` lo controla quien lo usa: los botones lo cambian y el
 * carrusel se desplaza; al deslizar con el dedo, avisa la página en la que se detuvo.
 */
function ResultPager({ count, index, onIndexChange, renderPage, top, footer }: {
  count: number; index: number; onIndexChange: (page: number) => void;
  renderPage: (page: number) => React.ReactNode; top: React.ReactNode; footer: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const list = useRef<FlatList<number>>(null);
  const shown = useRef(index);
  const [height, setHeight] = useState(0);
  const pages = Array.from({ length: count }, (_, page) => page);
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    list.current?.scrollToIndex({ index, animated: !reduced });
  }, [index, reduced]);
  // Al girar el teléfono o cambiar el ancho, la página visible sigue siendo la misma.
  useEffect(() => { list.current?.scrollToOffset({ offset: shown.current * width, animated: false }); }, [width]);
  const settle = (x: number) => {
    const page = Math.max(0, Math.min(count - 1, Math.round(x / width)));
    if (page === shown.current) return;
    shown.current = page;
    onIndexChange(page);
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ alignSelf: 'center', width: '100%', maxWidth: 520, paddingHorizontal: 24 }}>{top}</View>
    <FlatList ref={list} data={pages} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
      keyExtractor={page => String(page)} initialScrollIndex={index} extraData={renderPage}
      getItemLayout={(_, page) => ({ length: width, offset: width * page, index: page })}
      onLayout={event => setHeight(event.nativeEvent.layout.height)}
      onMomentumScrollEnd={event => settle(event.nativeEvent.contentOffset.x)}
      renderItem={({ item }) => <View style={{ width, height }}>{height ? renderPage(item) : null}</View>} />
    <View style={{ alignSelf: 'center', width: '100%', maxWidth: 520, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 10 }}>{footer}</View>
  </SafeAreaView>;
}

/**
 * Cifras, fuente y limitaciones de una recomendación. Cerrado por defecto: el plan se lee
 * en lenguaje simple y el respaldo técnico queda a un toque para quien quiera revisarlo.
 */
function TechnicalDetail({ text }: { text: string }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 4 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}
      style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
        {open ? t('Ocultar detalle técnico ▴', 'Hide technical detail ▴') : t('Detalle técnico y fuente ▾', 'Technical detail and source ▾')}
      </Text>
    </Pressable>
    {open && <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{text}</Text>}
  </View>;
}

/**
 * Un elemento del plan como mosaico: cuándo hacerlo y el título a la vista; el porqué y el
 * respaldo técnico se abren en una hoja. Así el plan entero cabe en una pantalla.
 */
function PlanTile({ icon, color, label, title, onPress, strong = false }: {
  icon: string; color: string; label: string; title: string; onPress: () => void; strong?: boolean;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${title}`} accessibilityHint={t('Abre el porqué y el detalle.', 'Opens the reason and the detail.')}
    onPress={onPress} style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, minHeight: 76, borderRadius: 16, borderWidth: 1,
      borderColor: strong ? `${color}88` : colors.border, backgroundColor: colors.card, padding: 12, gap: 6, opacity: pressed ? .8 : 1 })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d={icon} /></Svg>
      <Text numberOfLines={1} style={{ flex: 1, color, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: colors.primary, fontSize: 16 }}>›</Text>
    </View>
    <Text numberOfLines={2} style={{ color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 19 }}>{title}</Text>
  </Pressable>;
}

/** Hoja inferior con el contenido completo de un elemento del plan, sobre la pantalla. */
function PlanSheet({ visible, onClose, eyebrow, title, children }: React.PropsWithChildren<{
  visible: boolean; onClose: () => void; eyebrow?: string; title: string;
}>) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  // La hoja se dibuja bajo la barra de navegación de Android: el cierre queda por encima de ella.
  const { bottom } = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Cerrar', 'Close')} onPress={onClose} style={{ flex: 1 }} />
      <View style={{ maxHeight: height * 0.85, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ alignSelf: 'center', width: '100%', maxWidth: 520, padding: 24, paddingBottom: 12, gap: 10 }}>
          {!!eyebrow && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>{eyebrow}</Text>}
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 }}>{title}</Text>
          {children}
        </ScrollView>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 520, paddingHorizontal: 24, paddingBottom: 16 + bottom, paddingTop: 4 }}>
          <EntryButton secondary label={t('Cerrar', 'Close')} onPress={onClose} />
        </View>
      </View>
    </View>
  </Modal>;
}

/**
 * Resultado de una medición, una pantalla por paso (plan de diseño §10.2):
 * resumen, las tres familias de lecturas, clima con los datos de la captura y,
 * al final, el plan de recomendaciones. Cada variable abre su propio detalle. Lo usan la
 * medición nueva (con Guardar, siempre a mano en la barra superior, sin
 * esperar el pronóstico) y el detalle del historial (sin Guardar).
 */
function CoverageSummaryBox({ summary }: { summary: CoverageSummary }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return <ScreenCard>
    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{summary.headline}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)}
      style={{ minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
        {open ? t('Ocultar cómo se evaluó ▴', 'Hide how it was assessed ▴') : t('Cómo se evaluó y limitaciones ▾', 'How it was assessed and limitations ▾')}
      </Text>
    </Pressable>
    {open && <View style={{ gap: 4 }}>
      {summary.details.map((line, i) => <Text key={i} style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>• {line}</Text>)}
    </View>}
  </ScreenCard>;
}

/**
 * Alternativa de pre-siembra expandible (§12.2, T35): muestra por qué aparece el cultivo,
 * su forma de establecimiento y limitaciones sin convertir la consulta en selección de especie.
 */
function CropOptionRow({ option }: { option: PrePlantingOption }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const badgeColor = option.classification === 'matches_evaluated_criteria' ? colors.success : colors.warning;
  const badgeText = option.classification === 'matches_evaluated_criteria'
    ? t('Compatible', 'Compatible')
    : t('Con limitaciones', 'With limitations');
  return <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 40 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{option.label}</Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: `${badgeColor}22` }}>
        <Text style={{ color: badgeColor, fontSize: 12, fontWeight: '700' }}>{badgeText}</Text>
      </View>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{open ? '▴' : '▾'}</Text>
    </Pressable>
    {open && <View style={{ gap: 4, paddingBottom: 4 }}>
      {option.reasons.map((r, i) => <Text key={i} style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>• {r}</Text>)}
      <TechnicalDetail text={option.technicalSummary} />
    </View>}
  </View>;
}

/** Filas visibles antes de pedir ver el resto: la tarjeta es de lectura, no un catálogo (§9.2). */
const CROP_OPTIONS_PREVIEW = 8;

/**
 * Lista de alternativas de pre-siembra acotada a las primeras `CROP_OPTIONS_PREVIEW`, con el resto
 * a un toque. Es un límite de presentación: la evaluación y la instantánea conservan todas.
 */
function CropOptionsList({ options }: { options: PrePlantingOption[] }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const hidden = options.length - CROP_OPTIONS_PREVIEW;
  return <>
    {(all ? options : options.slice(0, CROP_OPTIONS_PREVIEW)).map(opt => <CropOptionRow key={opt.profileId} option={opt} />)}
    {hidden > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: all }} onPress={() => setAll(v => !v)}
      style={{ minHeight: 40, justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
        {all
          ? t('Mostrar menos alternativas ▴', 'Show fewer options ▴')
          : t(`Ver las otras ${hidden} alternativas ▾`, `See the other ${hidden} options ▾`)}
      </Text>
    </Pressable>}
  </>;
}

export function MeasurementResultFlow({ presentation: p, forecast, notices, onExit, exitLabel, save }: {
  presentation: MeasurementPresentation;
  forecast: ForecastProps;
  notices?: React.ReactNode;
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
  // Hoja abierta del plan: una recomendación (por posición), el contexto o los cultivos posibles.
  const [sheet, setSheet] = useState<number | 'context' | 'crops' | null>(null);
  const current = STEPS[step];
  useResetGuide(detail === null ? current : `detalle-${detail}`);
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

  const derivedValue = (d: PresentationDerived) => {
    if (d.value == null) return t('No calculable', 'Not available');
    const f = d.kind === 'temperature' ? formatTemperature(d.value, system)
      : d.kind === 'difference' ? formatTemperatureDifference(d.value, system) : { value: d.value, unit: d.unit };
    const digits = d.kind === 'pressure' ? 2 : 1;
    return `${f.value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${f.unit}`;
  };

  const canNext = detail !== null ? detail < p.parameters.length - 1 : step < STEPS.length - 1;
  const forward = () => {
    if (!canNext) return;
    if (detail !== null) { openDetail(detail + 1); return; }
    setStep(step + 1);
  };
  const back = () => {
    if (detail !== null) setDetail(null);
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
    guideTitle={parameterLabel(m.key, language)} guide={t('Abre qué significa esta lectura en tu cultivo y qué hacer con ella.', 'Opens what this reading means for your crop and what to do with it.')}
    accessibilityLabel={`${parameterLabel(m.key, language)}, ${value(m)}, ${statusLabel(m)}. ${t('Abrir detalle.', 'Open detail.')}`}
    style={{ width: half ? '47.5%' : '100%', flexGrow: 1, minHeight: 150, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, padding: 14, gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <MetricBadge metric={m.key} tone={badgeTone(m)} size={38} />
      <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
    </View>
    <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 14 }}>{parameterLabel(m.key, language)}</Text>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{value(m)}</Text>
    <MetricScale metric={m.key} value={m.value} />
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
  // La nota general de clima es una línea al pie del plan: el riesgo por especie, si lo
  // hay, ya viene como recomendación propia.
  const weatherCard = p.weatherNote ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={RAIN} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d={KIND_ICON.weather} /></Svg>
    <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{p.weatherNote}</Text>
  </View> : null;

  // Cuántas alternativas trae la pre-siembra: la portada sólo cuenta y remite.
  const cultivosCompatibles = p.cropOptions?.length ?? p.suggestedCrops?.length ?? 0;
  const possibleCropsCard = p.stage === 'pre_siembra' ? <ScreenCard accent={colors.primary}>
    <ScreenLabel>{t('Posibles cultivos', 'Possible crops')}</ScreenLabel>
    {p.suggestedCrops === undefined
      ? <ScreenText>{t('Esta lectura antigua no conserva sugerencias de cultivos.', 'This older reading does not keep crop suggestions.')}</ScreenText>
      : p.suggestedCrops.length ? <>
        <ScreenText muted={false}>{p.coverage
          ? t('Coincidencias parciales por temperatura y pH. La conductividad no se compara sin método compatible:', 'Partial temperature and pH matches. Conductivity is not compared without a compatible method:')
          : t('Posibilidades registradas al medir:', 'Possibilities recorded at capture:')}</ScreenText>
        {p.cropOptions?.length
          ? <CropOptionsList options={p.cropOptions} />
          : p.suggestedCrops.map(crop => <ScreenText key={crop} muted={false}>{crop}</ScreenText>)}
        <ScreenText>{t('Son posibilidades para evaluar, no una garantía de aptitud. Confirma humedad, textura, drenaje, temporada y clima local antes de sembrar.', 'These are possibilities to assess, not a guarantee of suitability. Confirm moisture, texture, drainage, season and local climate before planting.')}</ScreenText>
      </> : <ScreenText>{t('No hay coincidencias disponibles con los criterios evaluables de esta captura. Esto no significa que ningún cultivo pueda crecer aquí; revisa los datos y sus limitaciones.', 'No matches are available under the assessable criteria for this capture. This does not mean no crop can grow here; review the data and its limitations.')}</ScreenText>}
  </ScreenCard> : null;

  // --- Detalle de una variable: carrusel entre las variables ---
  if (detail !== null) {
    const groupName = (index: number) => {
      const group = MEASUREMENT_GROUPS.findIndex(keys => keys.includes(p.parameters[index].key));
      return [t('Suelo', 'Soil'), t('Nutrientes', 'Nutrients'), t('Ambiente', 'Environment')][group] ?? t('Lecturas', 'Readings');
    };
    const detailPage = (index: number) => {
      const m = p.parameters[index];
      const copy = buildParameterCopy(m, p.stage, p.species ?? null, language);
      // Sin lectura válida manda el motor: explica por qué no hay dato y no se
      // interpreta nada. Con lectura, el motor aporta la alerta y el texto de
      // apoyo aporta el significado para la especie y la etapa.
      const sinLectura = m.value == null;
      const alerta = !sinLectura && (m.status === 'WARNING' || m.status === 'CRITICAL');
      const contexto = [sinLectura ? m.state : alerta ? m.state : null, sinLectura ? null : copy.reading]
        .filter(Boolean).join('\n\n');
      // Con la variable en condición favorable, la recomendación del motor es la
      // frase de relleno que decía que no hay corrección que indicar: ahí mandan
      // los consejos de manejo y no se escribe esa línea.
      const consejos = [...(alerta ? [m.recommendation] : []), ...(sinLectura ? [m.recommendation] : copy.tips)];
      // Una instantánea guardada puede traer la misma nota dos veces: se depura al dibujar.
      const notas = [distinctNotes((m.control ?? '').split('\n\n')).join('\n\n'), copy.limitation].filter(Boolean).join(' ');
      return <ScreenLayout embedded eyebrow={[
        t(`VARIABLE ${index + 1} DE ${p.parameters.length}`, `VARIABLE ${index + 1} OF ${p.parameters.length}`),
        p.species ? presentationSpeciesName(p.species, language).toUpperCase() : null,
        stage.toUpperCase(),
      ].filter(Boolean).join(' · ')}
        title={parameterLabel(m.key, language)}>
        <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <MetricBadge metric={m.key} tone={badgeTone(m)} size={56} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>{value(m)}</Text>
              {statusPill(m)}
            </View>
          </View>
          <MetricScale metric={m.key} value={m.value} labels />
        </View>
        {section(t('¿QUÉ PASA CON ESTA LECTURA?', 'WHAT THIS READING MEANS'), contexto, tone(m))}
        {!!consejos.length && <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: colors.primary }} />
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 }}>{t('TIPS Y RECOMENDACIÓN', 'TIPS AND ADVICE')}</Text>
          </View>
          {consejos.map((consejo, i) => <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '800', lineHeight: 22 }}>•</Text>
            <ScreenText>{consejo}</ScreenText>
          </View>)}
        </View>}
        {!!notas && <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{notas}</Text>}
        {!!m.derived?.length && <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: colors.textSecondary }} />
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 }}>{t('CALCULADO CON ESTA LECTURA', 'CALCULATED FROM THIS READING')}</Text>
          </View>
          {/* Fila compacta: nombre, valor y una línea de qué significa. La nota
              larga del cálculo sigue en el detalle técnico, no aquí. */}
          {m.derived.map(d => <View key={d.id} accessible accessibilityLabel={`${d.label}: ${derivedValue(d)}. ${derivedMeaning(d.id, language)}`} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 }}>{d.label}</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{derivedValue(d)}</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>{derivedMeaning(d.id, language)}</Text>
          </View>)}
        </View>}
      </ScreenLayout>;
    };
    return <ResultPager count={p.parameters.length} index={detail} onIndexChange={openDetail} renderPage={detailPage}
      top={<ScreenTopBar onBack={back} backLabel={groupName(detail)} />}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><EntryButton secondary disabled={detail === 0} label={t('‹ Anterior', '‹ Previous')} onPress={() => openDetail(detail - 1)} /></View>
        <View style={{ flex: 1 }}><EntryButton secondary disabled={detail === p.parameters.length - 1} label={t('Siguiente ›', 'Next ›')} onPress={() => openDetail(detail + 1)} /></View>
      </View>} />;
  }

  const last = step === STEPS.length - 1;
  const footer = <>
    <StepProgress index={step} total={STEPS.length} />
    {last
      ? (save ? <EntryButton label={t('Guardar resultado', 'Save result')} busy={save.busy} onPress={save.onSave} />
        : <EntryButton label={exitLabel ?? t('Cerrar', 'Close')} onPress={onExit} />)
      : <EntryButton label={t('Continuar', 'Continue')} onPress={forward} />}
  </>;
  // Cada paso es una página del carrusel: barra (batería) y pie quedan fijos fuera de ella.
  const common = { embedded: true } as const;
  const renderStep = (s: Step): React.ReactNode => {

  // --- Resumen ---
  if (s === 'summary') {
    // Una medición recién tomada se anuncia como tal; en el historial manda el veredicto.
    const recien = !!save;
    // La píldora toma el color de lo más grave que haya quedado, no del promedio.
    const veredicto = counts.bad ? colors.danger : counts.warn ? colors.warning : colors.success;
    return (<ScreenLayout {...common}
      eyebrow={recien ? t('MEDICIÓN COMPLETADA', 'MEASUREMENT COMPLETE') : t('REGISTRO GUARDADO', 'SAVED READING')}
      title={recien ? t('¡Medición realizada con éxito!', 'Measurement completed successfully!') : p.title}
      description={recien ? t('Resumen del estado de tu campo en este punto.', 'How your field stands at this point.') : p.context}>
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
            {/* Con el título ocupado por el aviso de éxito, el veredicto se lee aquí. */}
            {recien && <View style={{ alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, borderWidth: 1, borderColor: `${veredicto}55`, backgroundColor: `${veredicto}1A`, paddingVertical: 5, paddingHorizontal: 10 }}>
              <Text numberOfLines={2} style={{ color: veredicto, fontSize: 12, fontWeight: '800' }}>{p.title}</Text>
            </View>}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#17392C' }}>
          <View style={{ width: 64, aspectRatio: 120 / 90, borderRadius: 10, overflow: 'hidden' }}><StageArt stage={p.stage} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: '#6EE7B7', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>{t('ETAPA FENOLÓGICA', 'PHENOLOGICAL STAGE')}</Text>
            <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{stage}</Text>
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
            </> : <Text style={{ color: '#C4D4C9', fontSize: 15 }}>{t('Análisis general (sin especie indicada)', 'General analysis (no species selected)')}</Text>}
          </View>
        </View>}
      </View>
      {/* Pre-siembra: una fila que cuenta y remite, no el listado entero. El
          detalle de cada cultivo vive en el plan de acción. */}
      {p.stage === 'pre_siembra' && !!cultivosCompatibles && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 14 }}>
        <AppIcon name="leaf" color={colors.primary} size={18} />
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
          {t(`${cultivosCompatibles} cultivos compatibles detectados`, `${cultivosCompatibles} compatible crops found`)}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('en el plan ›', 'in the plan ›')}</Text>
      </View>}
      {/* Contexto de la captura: cuándo, dónde y con qué carga. Vivía en la pantalla
          del clima, donde obligaba a avanzar cuatro páginas para leer la hora. */}
      <ScreenCard>
        {([
          ['history', t('Fecha y hora', 'Date and time'),
            forecast.capturedAt ? new Date(forecast.capturedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : t('Sin dato', 'No data'), false],
          ['location', t('Ubicación', 'Location'),
            forecast.latitude != null && forecast.longitude != null
              ? `${forecast.latitude.toFixed(6)}, ${forecast.longitude.toFixed(6)}${forecast.accuracy != null ? ` · ±${Math.round(forecast.accuracy)} m` : ''}`
              : t('Sin ubicación incluida', 'Location not included'), true],
          ['probe', t('Batería de la sonda', 'Probe battery'),
            forecast.battery == null ? t('Sin dato', 'No data') : `${forecast.battery} %`, false],
        ] as const).map(([icono, label, valor, seleccionable]) =>
          <View key={label} style={{ flexDirection: 'row', gap: 10, minHeight: 30, alignItems: 'center' }}>
            <AppIcon name={icono} color={colors.textSecondary} size={16} />
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
            <Text selectable={seleccionable} style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' }}>{valor}</Text>
          </View>)}
      </ScreenCard>
    </ScreenLayout>);
  }

  // --- Lecturas por familia: qué se mide, una ilustración y las tarjetas abajo ---
  const group = GROUP_OF[s];
  if (group !== undefined) {
    const family = [
      { title: t('Suelo', 'Soil'), art: <SoilReadingArt label={t('Sonda enterrada midiendo el suelo', 'Probe in the ground measuring the soil')} />,
        description: t('Lectura directa a la profundidad de los electrodos. Toca una variable para ver qué significa en tu cultivo.',
          'Read directly at the depth of the electrodes. Tap a variable to see what it means for your crop.') },
      { title: t('Nutrientes', 'Nutrients'), art: <NutrientReadingArt label={t('Nitrógeno, fósforo y potasio en el suelo', 'Nitrogen, phosphorus and potassium in the soil')} />,
        description: t('Valores de referencia en mg/kg, para comparar entre mediciones. No reemplazan un análisis de laboratorio ni sirven para calcular dosis.',
          'Reference values in mg/kg, to compare between readings. They do not replace a laboratory analysis, nor serve to calculate doses.') },
      { title: t('Ambiente', 'Environment'), art: <EnvironmentReadingArt label={t('Sensor del equipo midiendo el aire', 'Device sensor measuring the air')} />,
        description: t('Condiciones del aire junto a la planta en el momento de medir. El pronóstico va en la página siguiente.',
          'Air conditions next to the plant at capture time. The forecast is on the next page.') },
    ][group];
    // `fill`: la ilustración toma el alto libre y deja las tarjetas al pie, sin desplazar.
    return (<ScreenLayout {...common} fill eyebrow={t('LECTURAS', 'READINGS')} title={family.title} description={family.description}>
      {/* Base cero: la ilustración sólo toma el alto que sobra, con un mínimo visible. */}
      <Animated.View entering={enterDown(80)} style={{ flexGrow: 1, flexBasis: 0, minHeight: 72, maxHeight: 190 }}>{family.art}</Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {p.parameters.map((m, i) => MEASUREMENT_GROUPS[group].includes(m.key) && tile(m, i))}
      </View>
    </ScreenLayout>);
  }

  // --- Clima y captura ---
  if (s === 'forecast') {
    return (<ScreenLayout {...common} eyebrow={t('CLIMA DEL PUNTO MEDIDO', 'WEATHER AT THE MEASURED POINT')}
      title={forecast.historical ? t('Clima registrado', 'Recorded weather') : t('Clima', 'Weather')}
      description={forecast.historical ? t('Cómo estaba el tiempo al medir y el pronóstico de ese momento.', 'The weather at capture time and the forecast back then.')
        : t('Cómo está el tiempo donde mediste y qué se espera para los próximos días.', 'The weather where you measured and what to expect over the next days.')}>
      <MeasurementForecast {...forecast} />
    </ScreenLayout>);
  }

  // --- Plan de recomendaciones: la última página y la más importante ---
  // Cabe en una pantalla: lo primero que conviene hacer en una tarjeta y el resto en mosaicos
  // de dos columnas. El porqué, el respaldo técnico, el clima y cómo se evaluó se abren en una hoja.
  const kindColor = (kind: RecommendationKind) => ({
    soil: colors.primary, evidence: colors.textSecondary, weather: RAIN, irrigation: RAIN, monitoring: colors.primary,
  }[kind]);
  const whenLabel = (when: RecommendationTiming) => ({
    now: t('Ahora', 'Now'), today: t('Hoy', 'Today'), next_days: t('Próximos días', 'Next days'), next_reading: t('Próxima medición', 'Next reading'),
  }[when]);
  const recs = p.recommendations;
  const speciesName = p.species ? presentationSpeciesName(p.species, language) : null;
  const first = recs?.[0];
  const disclaimer = t('Guía orientativa basada en esta captura. Confírmala en terreno y, si dudas, con tu asesor.',
    'Indicative guidance based on this capture. Confirm it in the field and, if in doubt, with your advisor.');
  // Evidencia: sólo los valores que piden atención, que son los que sostienen el plan.
  const evidencia = p.parameters.filter(m => MEASUREMENT_GROUPS[0].includes(m.key) && m.value != null
    && (m.status === 'WARNING' || m.status === 'CRITICAL'));
  const pills = !!evidencia.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {evidencia.map(m => <View key={m.key} accessible accessibilityLabel={`${parameterLabel(m.key, language)}: ${value(m)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 6, paddingHorizontal: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone(m) }} />
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{parameterLabel(m.key, language)}</Text>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{value(m)}</Text>
    </View>)}
  </View>;
  const eyebrow = [t('PLAN DE ACCIÓN', 'ACTION PLAN'), stage.toUpperCase(), speciesName?.toUpperCase()].filter(Boolean).join(' · ');

  // Mediciones antiguas sin recomendaciones estructuradas: la lista de acciones de entonces, desplazable.
  if (!first) return (<ScreenLayout {...common} eyebrow={eyebrow} title={t('Qué hacer con esta lectura', 'What to do with this reading')} description={p.summary}>
    {pills}
    {p.actions.length ? timeline : <ScreenCard><ScreenText>{t('No hay recomendaciones para esta lectura.', 'No recommendations for this reading.')}</ScreenText></ScreenCard>}
    {possibleCropsCard}
    {weatherCard}
    {p.coverageSummary && <CoverageSummaryBox summary={p.coverageSummary} />}
    <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{disclaimer}</Text>
  </ScreenLayout>);

  const firstColor = first.priority === 'high' ? colors.warning : colors.primary;
  const openRec = typeof sheet === 'number' ? recs[sheet] : undefined;
  return (<ScreenLayout {...common} eyebrow={eyebrow} title={t('Qué hacer', 'What to do')}>
    {/* El diagnóstico de conjunto, recortado: completo en el contexto. */}
    <Pressable accessibilityRole="button" accessibilityHint={t('Abre el diagnóstico completo.', 'Opens the full diagnosis.')} onPress={() => setSheet('context')}>
      <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 21 }}>{p.summary}</Text>
    </Pressable>
    {pills}
    <Animated.View entering={enterDown(60)}>
      <Pressable accessibilityRole="button" accessibilityHint={t('Abre el porqué y el detalle.', 'Opens the reason and the detail.')} onPress={() => setSheet(0)}
        style={({ pressed }) => ({ borderRadius: 20, borderWidth: 2, borderColor: firstColor, backgroundColor: colors.card, padding: 16, gap: 6, opacity: pressed ? .85 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: firstColor, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>
            {`${t('PRIMERO', 'FIRST')} · ${whenLabel(first.when).toUpperCase()}`}
          </Text>
          <Text style={{ color: colors.primary, fontSize: 18 }}>›</Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, lineHeight: 24 }}>{first.title}</Text>
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>{first.body}</Text>
      </Pressable>
    </Animated.View>
    <Animated.View entering={enterDown(140)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {recs.slice(1).map((r, i) => <PlanTile key={`${r.kind}-${i}`} icon={KIND_ICON[r.kind]} strong={r.priority === 'high'}
        color={r.priority === 'high' ? colors.warning : kindColor(r.kind)} label={whenLabel(r.when)} title={r.title} onPress={() => setSheet(i + 1)} />)}
      {!!possibleCropsCard && <PlanTile icon={KIND_ICON.soil} color={colors.primary} label={t('Pre-siembra', 'Pre-planting')}
        title={t(`Posibles cultivos (${cultivosCompatibles})`, `Possible crops (${cultivosCompatibles})`)} onPress={() => setSheet('crops')} />}
      <PlanTile icon={KIND_ICON.evidence} color={colors.textSecondary} label={t('Contexto', 'Context')}
        title={p.weatherNote ? t('Clima y cómo se evaluó', 'Weather and how it was assessed') : t('Cómo se evaluó', 'How it was assessed')} onPress={() => setSheet('context')} />
    </Animated.View>
    <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12 }}>{t('Guía orientativa: confírmala en terreno.', 'Indicative guidance: confirm it in the field.')}</Text>

    <PlanSheet visible={!!openRec} onClose={() => setSheet(null)} title={openRec?.title ?? ''}
      eyebrow={openRec ? `${sheet === 0 ? `${t('PRIMERO', 'FIRST')} · ` : ''}${whenLabel(openRec.when).toUpperCase()}` : undefined}>
      {!!openRec && <>
        <ScreenText muted={false}>{openRec.body}</ScreenText>
        {!!openRec.detail && <TechnicalDetail text={openRec.detail} />}
      </>}
    </PlanSheet>
    <PlanSheet visible={sheet === 'context'} onClose={() => setSheet(null)} eyebrow={eyebrow} title={t('Diagnóstico y contexto', 'Diagnosis and context')}>
      <ScreenText muted={false}>{p.summary}</ScreenText>
      {weatherCard}
      {p.coverageSummary && <CoverageSummaryBox summary={p.coverageSummary} />}
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{disclaimer}</Text>
    </PlanSheet>
    <PlanSheet visible={sheet === 'crops'} onClose={() => setSheet(null)} title={t('Posibles cultivos', 'Possible crops')}>
      {possibleCropsCard}
    </PlanSheet>
  </ScreenLayout>);
  };

  return <ResultPager count={STEPS.length} index={step} onIndexChange={setStep}
    renderPage={page => renderStep(STEPS[page])} top={<ScreenTopBar leading={battery} />} footer={footer} />;
}
