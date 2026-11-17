import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, FlatList, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { useReducedMotion } from 'react-native-reanimated';
import { GuideScrollView } from './guide/GuideControls';
import { BatteryBar } from './result/BatteryBar';
import { useResetGuide } from './guide/GuideContext';
import { EntryButton } from './entry/EntryUI';
import { ScreenCard, ScreenLayout, ScreenText, ScreenTopBar } from './screen/ScreenUI';
import { MeasurementForecast, type ForecastProps } from './MeasurementForecast';
import { MEASUREMENT_GROUPS } from './measurementResultData';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PHENOLOGICAL_STAGES } from '../types/app';
import { distinctNotes, parameterLabel, presentationSpeciesName, speciesRulesOutdated, type MeasurementPresentation, type ParameterPresentation, type PresentationDerived } from '../engine/measurementPresentation';
import { formatEngineMetric, formatTemperature, formatTemperatureDifference } from '../utils/units';
import { MetricBadge, MetricScale } from './result/ResultVisuals';
import { buildParameterCopy, derivedMeaning } from './result/resultCopy';
import { BottomSheet, TechnicalDetail } from './result/BottomSheet';
import { ResultHero } from './result/ResultHero';
import { CoverageSummaryBox, CropOptionsList, PlanList, whenLabel } from './result/PlanList';
import { WeatherStrip } from './result/WeatherStrip';
import { ReadingGroup } from './result/ReadingGroup';
import { NutrientGroup } from './result/NutrientGroup';

const NUTRIENTS = ['nitrogen', 'phosphorus', 'potassium'];

/** Hoja abierta: una acción del plan (por posición), el contexto, los cultivos posibles o el clima. */
type Sheet = { kind: 'action'; index: number } | { kind: 'context' | 'crops' | 'weather' } | null;

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
    {/* `disableIntervalMomentum`: un gesto rápido avanza una página, no varias. */}
    <FlatList ref={list} data={pages} horizontal pagingEnabled disableIntervalMomentum showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
      keyExtractor={page => String(page)} initialScrollIndex={index} extraData={renderPage}
      getItemLayout={(_, page) => ({ length: width, offset: width * page, index: page })}
      onLayout={event => setHeight(event.nativeEvent.layout.height)}
      onMomentumScrollEnd={event => settle(event.nativeEvent.contentOffset.x)}
      renderItem={({ item }) => <View style={{ width, height }}>{height ? renderPage(item) : null}</View>} />
    <View style={{ alignSelf: 'center', width: '100%', maxWidth: 520, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 10 }}>{footer}</View>
  </SafeAreaView>;
}

/**
 * Resultado de una medición en una sola pantalla que se desplaza: el veredicto, «Qué hacer» (el
 * plan de acción primero), el clima, Suelo, Aire y Nutrientes. Cada variable abre su propio
 * detalle y lo demás —el porqué de una acción, el clima completo, cómo se evaluó— se abre en una
 * hoja. Lo usan la medición nueva (con Guardar) y el detalle del historial (sin Guardar).
 */
export function MeasurementResultFlow({ presentation: p, forecast, notices, onExit, exitLabel, save, onOpenPreferences }: {
  presentation: MeasurementPresentation;
  forecast: ForecastProps;
  notices?: React.ReactNode;
  onExit: () => void;
  exitLabel?: string;
  save?: { onSave: () => void; busy: boolean };
  /** Si la pantalla que lo contiene sabe abrir Preferencias, la hoja del clima sin ubicación lo ofrece. */
  onOpenPreferences?: () => void;
}) {
  const { colors } = useAppTheme();
  const { t, language, locale } = useTranslation();
  const system = useAppStore(s => s.preferences.measurementSystem);
  const [detail, setDetail] = useState<number | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [planExpanded, setPlanExpanded] = useState(false);
  // Al volver del detalle la pantalla se dibuja de nuevo: se conserva por dónde iba.
  const scrollY = useRef(0);
  useResetGuide(detail === null ? 'resultado' : `detalle-${detail}`);
  const openDetail = (index: number) => { setSheet(null); setDetail(index); };

  const desfasada = speciesRulesOutdated(p.species);
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
  const valueParts = (m: ParameterPresentation) => {
    if (m.value == null) return null;
    const f = formatEngineMetric(m.key, m.value, m.unit, system);
    return { number: f.value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 1 }), unit: f.unit };
  };

  const derivedValue = (d: PresentationDerived) => {
    if (d.value == null) return t('No calculable', 'Not available');
    const f = d.kind === 'temperature' ? formatTemperature(d.value, system)
      : d.kind === 'difference' ? formatTemperatureDifference(d.value, system) : { value: d.value, unit: d.unit };
    const digits = d.kind === 'pressure' ? 2 : 1;
    return `${f.value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${f.unit}`;
  };

  // Atrás: cierra la hoja abierta; si no hay, cierra el detalle; si no hay, sale (con la
  // confirmación de descarte que ya tiene quien lo contiene).
  const back = () => {
    if (sheet) setSheet(null);
    else if (detail !== null) setDetail(null);
    else onExit();
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!save?.busy) back(); return true; });
    return () => listener.remove();
  });

  const battery = <BatteryBar percent={forecast.battery} />;
  // Los datos de contexto y los nutrientes no tienen estado: su ícono lleva el verde de la marca.
  const badgeTone = (m: ParameterPresentation) => NUTRIENTS.includes(m.key) || m.status === 'INFO' ? colors.primary : tone(m);
  const statusPill = (m: ParameterPresentation) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: `${tone(m)}22` }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone(m) }} />
    <Text style={{ color: tone(m), fontSize: 13, fontWeight: '700' }}>{statusLabel(m)}</Text>
  </View>;
  const section = (label: string, body: string, color: string) => <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 6 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: color }} />
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 }}>{label.toUpperCase()}</Text>
    </View>
    <ScreenText muted={false}>{body}</ScreenText>
  </View>;

  // Cuántas alternativas trae la pre-siembra: el plan sólo cuenta y remite.
  const cultivosCompatibles = p.cropOptions?.length ?? p.suggestedCrops?.length ?? 0;
  const possibleCropsCard = p.stage === 'pre_siembra' ? <ScreenCard accent={colors.primary}>
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
    const detailPage = (index: number) => {
      const m = p.parameters[index];
      // Con criterios de otro día, la especie no se reinterpreta con los de hoy: contradiría el plan guardado.
      const copy = buildParameterCopy(m, p.stage, desfasada ? null : p.species ?? null, language);
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
      top={<ScreenTopBar onBack={() => setDetail(null)} backLabel={t('Resultado', 'Result')} />}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><EntryButton secondary disabled={detail === 0} label={t('‹ Anterior', '‹ Previous')} onPress={() => openDetail(detail - 1)} /></View>
        <View style={{ flex: 1 }}><EntryButton secondary disabled={detail === p.parameters.length - 1} label={t('Siguiente ›', 'Next ›')} onPress={() => openDetail(detail + 1)} /></View>
      </View>} />;
  }


  // --- Resultado: una pantalla que se desplaza ---
  const speciesName = p.species ? presentationSpeciesName(p.species, language)
    : p.version === 3 && p.stage !== 'pre_siembra' ? t('Sin especie indicada', 'No species selected') : null;
  const entries = (keys: readonly string[]) => p.parameters
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => keys.includes(m.key));
  const hasRecs = !!p.recommendations?.length;
  const openRec = sheet?.kind === 'action' && hasRecs ? p.recommendations![sheet.index] : undefined;
  const openLegacy = sheet?.kind === 'action' && !hasRecs ? p.actions[sheet.index] : undefined;
  const hasCoords = forecast.latitude != null && forecast.longitude != null;
  const rulesNote = t('Esta lectura se evaluó con los criterios de cultivo que tenía la app al medir. Desde entonces se actualizaron; el plan guardado no se recalcula. Para evaluar este punto con los criterios de hoy, vuelve a medir.',
    'This reading was assessed with the crop criteria the app had at capture time. They have been updated since; the saved plan is not recalculated. To assess this spot with the current criteria, measure again.');
  const disclaimer = t('Guía orientativa basada en esta captura. Confírmala en terreno y, si dudas, con tu asesor.',
    'Indicative guidance based on this capture. Confirm it in the field and, if in doubt, with your advisor.');
  const footer = save
    ? <EntryButton label={t('Guardar resultado', 'Save result')} busy={save.busy} onPress={save.onSave} />
    : <EntryButton label={t('Cerrar', 'Close')} onPress={onExit} />;
  const frame = { alignSelf: 'center', width: '100%', maxWidth: 520, paddingHorizontal: 24 } as const;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={frame}><ScreenTopBar onBack={() => { if (!save?.busy) onExit(); }} backLabel={exitLabel ?? t('Volver', 'Back')} action={battery} /></View>
    <GuideScrollView style={{ flex: 1 }} restoreY={scrollY.current} scrollEventThrottle={16} onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y; }}
      contentContainerStyle={{ ...frame, paddingTop: 8, paddingBottom: 20, gap: 20 }}>
      {notices}
      <ResultHero presentation={p} stage={stage} speciesName={speciesName} capturedAt={forecast.capturedAt}
        latitude={forecast.latitude} longitude={forecast.longitude} accuracy={forecast.accuracy} />
      <PlanList presentation={p} expanded={planExpanded} onToggleExpanded={() => setPlanExpanded(v => !v)} formatValue={value} cropCount={cultivosCompatibles}
        onOpenAction={index => setSheet({ kind: 'action', index })} onOpenContext={() => setSheet({ kind: 'context' })} onOpenCrops={() => setSheet({ kind: 'crops' })} />
      <WeatherStrip forecast={forecast} onPress={() => setSheet({ kind: 'weather' })} />
      <ReadingGroup family="soil" entries={entries(MEASUREMENT_GROUPS[0])} formatValue={value} onOpen={openDetail} />
      <ReadingGroup family="air" entries={entries(MEASUREMENT_GROUPS[2])} formatValue={value} onOpen={openDetail} />
      <NutrientGroup entries={entries(MEASUREMENT_GROUPS[1])} formatParts={valueParts} onOpen={openDetail} />
    </GuideScrollView>
    <View style={{ ...frame, paddingTop: 8, paddingBottom: 12 }}>{footer}</View>

    <BottomSheet visible={sheet?.kind === 'action'} onClose={() => setSheet(null)}
      title={openRec ? openRec.headline ?? openRec.title : openLegacy ?? ''}
      eyebrow={openRec ? whenLabel(openRec.when, t).toUpperCase() : undefined}>
      {!!openRec && <>
        {!!openRec.headline && openRec.headline !== openRec.title && <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' }}>{openRec.title}</Text>}
        <ScreenText muted={false}>{openRec.body}</ScreenText>
        {!!openRec.detail && <TechnicalDetail text={openRec.detail} />}
      </>}
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{disclaimer}</Text>
    </BottomSheet>
    <BottomSheet visible={sheet?.kind === 'context'} onClose={() => setSheet(null)} eyebrow={t('CÓMO SE EVALUÓ', 'HOW IT WAS ASSESSED')} title={t('Diagnóstico y contexto', 'Diagnosis and context')}>
      <ScreenText muted={false}>{p.summary}</ScreenText>
      {desfasada && <ScreenCard accent={colors.warning}><ScreenText>{rulesNote}</ScreenText></ScreenCard>}
      {p.coverageSummary && <CoverageSummaryBox summary={p.coverageSummary} />}
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{disclaimer}</Text>
    </BottomSheet>
    <BottomSheet visible={sheet?.kind === 'crops'} onClose={() => setSheet(null)} title={t('Posibles cultivos', 'Possible crops')}>
      {possibleCropsCard}
    </BottomSheet>
    <BottomSheet visible={sheet?.kind === 'weather'} onClose={() => setSheet(null)} eyebrow={t('CLIMA DEL PUNTO MEDIDO', 'WEATHER AT THE MEASURED POINT')}
      title={forecast.historical ? t('Clima registrado', 'Recorded weather') : t('Clima', 'Weather')}>
      {!hasCoords && !forecast.days.length
        ? <>
          <ScreenText muted={false}>{t('Esta lectura se guardó sin ubicación, así que no hay pronóstico. Puedes activar la ubicación en Configuración → Preferencias → Ubicación y pronóstico; las próximas lecturas la incluirán.',
            'This reading was saved without location, so there is no forecast. You can turn location on in Settings → Preferences → Location and forecast; your next readings will include it.')}</ScreenText>
          {!!onOpenPreferences && <EntryButton label={t('Abrir Preferencias', 'Open Preferences')} onPress={() => { setSheet(null); onOpenPreferences(); }} />}
        </>
        : <MeasurementForecast {...forecast} />}
      {!!p.weatherNote && <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{p.weatherNote}</Text>}
    </BottomSheet>
  </SafeAreaView>;
}
