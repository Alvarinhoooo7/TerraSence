import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { GuideTouchable } from '../guide/GuideControls';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { EntryHeading, EntryLayout, useEntryMetrics } from '../entry/EntryUI';

/**
 * Piezas de las pantallas posteriores al acceso, con el lenguaje visual de la
 * entrada (EntryUI): márgenes de 24, ancho máximo de 520, una etiqueta en
 * mayúsculas sobre un título grande, opciones como las del selector de idioma
 * y la acción principal abajo, fuera del desplazamiento.
 */
export function ScreenLayout({ eyebrow, title, description, onBack, backLabel, action, footer, children, align = 'top', tabBar = false, keyboardAware = false, onHeadingPress }: React.PropsWithChildren<{
  eyebrow?: string; title: string; description?: string; onBack?: () => void; backLabel?: string;
  action?: React.ReactNode; footer?: React.ReactNode; align?: 'center' | 'top'; tabBar?: boolean; keyboardAware?: boolean;
  /** Sólo para gestos de desarrollo; no es un control visible. */
  onHeadingPress?: () => void;
}>) {
  const { spacing } = useEntryMetrics();
  return <EntryLayout align={align} tabBar={tabBar} keyboardAware={keyboardAware}
    header={onBack || action ? <ScreenTopBar onBack={onBack} backLabel={backLabel} action={action} /> : undefined}
    footer={footer ? <View style={{ gap: 10, paddingTop: 8 }}>{footer}</View> : undefined}>
    <View style={{ gap: spacing, paddingTop: onBack || action ? 0 : 8 }}>
      {onHeadingPress
        ? <Pressable accessible={false} onPress={onHeadingPress}><EntryHeading eyebrow={eyebrow} title={title} description={description} /></Pressable>
        : <EntryHeading eyebrow={eyebrow} title={title} description={description} />}
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  </EntryLayout>;
}

/** Ancho que ocupa el botón «?» de la guía junto al borde derecho. */
export const GUIDE_BUTTON_SPACE = 48;

export function ScreenTopBar({ onBack, backLabel, action }: { onBack?: () => void; backLabel?: string; action?: React.ReactNode }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  // El botón «?» de la guía (ScreenGuide) flota arriba a la derecha: se le
  // reserva su lugar para que no tape la acción de la pantalla.
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54, paddingRight: GUIDE_BUTTON_SPACE }}>
    {onBack ? <GuideTouchable guide={false} accessibilityRole="button" onPress={onBack} style={{ minHeight: 48, justifyContent: 'center', paddingRight: 16 }}>
      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>‹ {backLabel ?? t('Volver', 'Back')}</Text>
    </GuideTouchable> : <View />}
    {action}
  </View>;
}

/** Fila elegible: el mismo formato de las opciones del selector de idioma. */
export function ScreenOption({ title, subtitle, onPress, selected, danger = false, disabled = false, trailing, guide }: {
  title: string; subtitle?: string; onPress: () => void; selected?: boolean; danger?: boolean; disabled?: boolean;
  trailing?: string; guide?: string;
}) {
  const { colors } = useAppTheme();
  const marked = selected === true;
  const ink = danger ? colors.danger : colors.text;
  return <GuideTouchable guideTitle={title} guide={guide} accessibilityRole={selected === undefined ? 'button' : 'radio'}
    accessibilityState={{ disabled, selected: marked }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 72, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, borderWidth: marked ? 2 : 1,
      borderColor: marked ? colors.primary : colors.border, backgroundColor: colors.card, opacity: disabled ? .5 : 1,
      flexDirection: 'row', alignItems: 'center', gap: 14 }}>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: ink, fontSize: 17, fontWeight: marked ? '700' : '600' }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{subtitle}</Text>}
    </View>
    <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: danger ? colors.danger : colors.primary, fontSize: selected === undefined ? 26 : 22 }}>
      {trailing ?? (selected === undefined ? '›' : marked ? '●' : '○')}
    </Text>
  </GuideTouchable>;
}

export function ScreenCard({ children, accent }: React.PropsWithChildren<{ accent?: string }>) {
  const { colors } = useAppTheme();
  return <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 18, gap: 10,
    borderLeftWidth: accent ? 5 : 1, borderLeftColor: accent ?? colors.border }}>{children}</View>;
}

/** Etiqueta de sección, en el mismo estilo que la etiqueta de los títulos. */
export function ScreenLabel({ children }: { children: string }) {
  const { colors } = useAppTheme();
  return <Text accessibilityRole="header" style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 8 }}>{children.toUpperCase()}</Text>;
}

export function ScreenText({ children, muted = true, danger = false }: React.PropsWithChildren<{ muted?: boolean; danger?: boolean }>) {
  const { colors } = useAppTheme();
  return <Text accessibilityLiveRegion={danger ? 'polite' : undefined}
    style={{ color: danger ? colors.danger : muted ? colors.textSecondary : colors.text, fontSize: 16, lineHeight: 24 }}>{children}</Text>;
}

/** Dato de una ficha: etiqueta a la izquierda y valor a la derecha, dentro de una ScreenCard. */
export function ScreenValue({ label, value, selectable = false }: { label: string; value: string; selectable?: boolean }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, minHeight: 30 }}>
    <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{label}</Text>
    <Text selectable={selectable} style={{ color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
  </View>;
}

/** Avance por pasos, igual al del carrusel de bienvenida. */
export function StepProgress({ index, total }: { index: number; total: number }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return <View accessible accessibilityLabel={t(`Paso ${index + 1} de ${total}`, `Step ${index + 1} of ${total}`)}
    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => <View key={i} style={{ width: i === index ? 28 : 9, height: 7, borderRadius: 4, backgroundColor: i === index ? colors.primary : colors.border }} />)}
    </View>
    <Text style={{ color: colors.textSecondary }}>{index + 1} / {total}</Text>
  </View>;
}
