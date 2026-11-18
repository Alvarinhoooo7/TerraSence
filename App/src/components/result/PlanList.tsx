import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../AppText';
import { AppIcon } from '../AppIcon';
import { ScreenCard } from '../screen/ScreenUI';
import { TechnicalDetail } from './BottomSheet';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { parameterLabel, type CoverageSummary, type MeasurementPresentation, type ParameterPresentation } from '../../engine/measurementPresentation';
import type { PrePlantingOption } from '../../engine/prePlanting';
import type { RecommendationTiming } from '../../engine/contextualAdvice';
import { allPlanActions, planActions, type PlanAction } from './resultModel';

/** Texto del momento en que conviene hacer cada acción. */
export function whenLabel(when: RecommendationTiming, t: (es: string, en: string) => string): string {
  return {
    now: t('Ahora', 'Now'), today: t('Hoy', 'Today'), next_days: t('Próximos días', 'Next days'), next_reading: t('Próxima medición', 'Next reading'),
  }[when];
}

/**
 * «Qué hacer»: lo primero que se lee después del veredicto. Cada fila trae número, cuándo, el
 * titular y las variables medidas que la sostienen; tocarla abre el porqué. Muestra tres y el
 * resto queda tras «Ver N más», pero las de prioridad alta se ven siempre y ninguna se descarta.
 */
export function PlanList({ presentation: p, expanded, onToggleExpanded, formatValue, cropCount, onOpenAction, onOpenContext, onOpenCrops }: {
  presentation: MeasurementPresentation; expanded: boolean; onToggleExpanded: () => void;
  formatValue: (m: ParameterPresentation) => string; cropCount: number;
  onOpenAction: (index: number) => void; onOpenContext: () => void; onOpenCrops: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const all = allPlanActions(p);
  const { visible, hidden } = planActions(p);
  const shown = expanded ? all : visible;
  const onNumber = isDark ? colors.background : '#FFFFFF';
  const separator = <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />;

  const evidenceOf = (action: PlanAction) => action.evidence
    .map(key => p.parameters.find(m => m.key === key))
    .filter((m): m is ParameterPresentation => !!m && m.value != null);

  const row = (action: PlanAction, position: number) => {
    const high = action.priority === 'high';
    const evidence = evidenceOf(action);
    const timing = action.when ? whenLabel(action.when, t) : null;
    return <Pressable key={`${action.index}-${position}`} accessibilityRole="button"
      accessibilityLabel={[`${position + 1}`, high ? t('Prioridad alta', 'High priority') : null, timing, action.title,
        ...evidence.map(m => `${parameterLabel(m.key, language)} ${formatValue(m)}`)].filter(Boolean).join('. ')}
      accessibilityHint={t('Abre el porqué y el detalle.', 'Opens the reason and the detail.')}
      onPress={() => onOpenAction(action.index)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, minHeight: 64, opacity: pressed ? .8 : 1 })}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: high ? colors.warning : colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: onNumber, fontSize: 15, fontWeight: '700' }}>{position + 1}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        {!!timing && <View style={{ alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: high ? colors.tintWarning : colors.bubbleInactive }}>
          <Text style={{ color: high ? colors.onTintWarning : colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{`${high ? '! ' : ''}${timing.toUpperCase()}`}</Text>
        </View>}
        <Text style={{ color: colors.text, fontSize: position === 0 ? 19 : 17, lineHeight: position === 0 ? 24 : 22, fontWeight: '700' }}>{action.title}</Text>
        {!!evidence.length && <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
          {evidence.map((m, i) => <Text key={m.key}>{i ? ' · ' : ''}{parameterLabel(m.key, language)} <Text style={{ color: colors.text, fontWeight: '700' }}>{formatValue(m)}</Text></Text>)}
        </Text>}
      </View>
      <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.primary, fontSize: 22, lineHeight: 30 }}>›</Text>
    </Pressable>;
  };

  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>{t('Qué hacer', 'What to do')}</Text>
      {!!all.length && <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{all.length === 1 ? t('1 acción', '1 action') : t(`${all.length} acciones`, `${all.length} actions`)}</Text>}
    </View>
    <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
      {shown.length
        ? shown.map((action, i) => <React.Fragment key={`${action.index}-${i}`}>{i > 0 && separator}{row(action, i)}</React.Fragment>)
        : <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24, padding: 16 }}>{t('No hay recomendaciones para esta lectura.', 'No recommendations for this reading.')}</Text>}
      {p.stage === 'pre_siembra' && <>
        {!!shown.length && separator}
        <Pressable accessibilityRole="button" accessibilityHint={t('Abre los cultivos posibles.', 'Opens the possible crops.')} onPress={onOpenCrops}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 64, opacity: pressed ? .8 : 1 })}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.tintSuccess, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="leaf" color={colors.success} size={18} />
          </View>
          <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' }}>{t(`Posibles cultivos (${cropCount})`, `Possible crops (${cropCount})`)}</Text>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: colors.primary, fontSize: 22 }}>›</Text>
        </Pressable>
      </>}
    </View>
    {hidden > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggleExpanded}
      style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>
        {expanded ? t('Ver menos ▴', 'Show less ▴') : t(`Ver ${hidden} más ▾`, `Show ${hidden} more ▾`)}
      </Text>
    </Pressable>}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>{t('Guía orientativa: confírmala en terreno.', 'Indicative guidance: confirm it in the field.')}</Text>
      <Pressable accessibilityRole="button" onPress={onOpenContext} style={{ minHeight: 48, justifyContent: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{t('Cómo se evaluó ›', 'How it was assessed ›')}</Text>
      </Pressable>
    </View>
  </View>;
}

/** Resumen de cobertura y limitaciones de la evaluación, con el detalle a un toque. */
export function CoverageSummaryBox({ summary }: { summary: CoverageSummary }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return <ScreenCard>
    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{summary.headline}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)}
      style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
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
  const badgeText = option.limitationCodes.includes('near_reference_boundary')
    ? t('Cerca del límite', 'Near a boundary')
    : option.classification === 'matches_evaluated_criteria'
    ? t('Compatible', 'Compatible')
    : t('Con limitaciones', 'With limitations');
  return <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 48 }}>
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
export function CropOptionsList({ options }: { options: PrePlantingOption[] }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const hidden = options.length - CROP_OPTIONS_PREVIEW;
  return <>
    {(all ? options : options.slice(0, CROP_OPTIONS_PREVIEW)).map(opt => <CropOptionRow key={opt.profileId} option={opt} />)}
    {hidden > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: all }} onPress={() => setAll(v => !v)}
      style={{ minHeight: 48, justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
        {all
          ? t('Mostrar menos alternativas ▴', 'Show fewer options ▴')
          : t(`Ver las otras ${hidden} alternativas ▾`, `See the other ${hidden} options ▾`)}
      </Text>
    </Pressable>}
  </>;
}
