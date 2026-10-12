import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, findNodeHandle, Keyboard, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../AppText';
import type { Text as NativeText } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { GuideContext, measure, type GuideTarget } from './GuideContext';
import { guideLayout, type GuideRect } from '../../utils/guideLayout';

/** Recorrido manual: nunca ejecuta el control explicado ni concede permisos. */
export function ScreenGuide({ children, enabled = true, scope = '' }: React.PropsWithChildren<{ enabled?: boolean; scope?: string }>) {
  const { colors } = useAppTheme(); const { t } = useTranslation();
  const insets = useSafeAreaInsets(); const window = useWindowDimensions();
  const root = useRef<View>(null); const help = useRef<View>(null); const heading = useRef<NativeText>(null);
  const targets = useRef(new Map<string, GuideTarget>()); const revision = useRef(0);
  const [steps, setSteps] = useState<GuideTarget[]>([]); const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false); const [rect, setRect] = useState<GuideRect | null>(null);
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const [panelHeight, setPanelHeight] = useState(280);
  const register = useCallback((target: GuideTarget) => {
    targets.current.set(target.id, target);
    return () => { targets.current.delete(target.id); };
  }, []);
  const close = useCallback(() => {
    revision.current++; setActive(false); setRect(null);
    const handle = findNodeHandle(help.current); if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);
  useEffect(() => { revision.current++; setActive(false); setRect(null); }, [scope, enabled]);
  useEffect(() => () => { revision.current++; }, []);
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => subscription.remove();
  }, [active, close]);
  const open = async () => {
    Keyboard.dismiss(); const current = ++revision.current;
    const measured = await Promise.all([...targets.current.values()].map(async target => ({ target, rect: await measure(target.node.current) })));
    if (revision.current !== current) return;
    const ordered = measured.filter(item => item.rect).sort((a, b) => a.rect!.y - b.rect!.y || a.rect!.x - b.rect!.x).map(item => item.target);
    setSteps(ordered); setIndex(0); setRect(null); setActive(true);
  };
  useEffect(() => {
    if (!active) return;
    const current = ++revision.current; setRect(null);
    const locate = async () => {
      const step = steps[index]; const target = step && targets.current.get(step.id);
      if (target?.node.current) await target.reveal?.(target.node.current);
      const [position, origin] = await Promise.all([measure(target?.node.current ?? null), measure(root.current)]);
      if (current !== revision.current) return;
      if (position && origin) setRect({ ...position, x: position.x - origin.x, y: position.y - origin.y });
      const handle = findNodeHandle(heading.current); if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
      AccessibilityInfo.announceForAccessibility(target ? `${index + 1} / ${steps.length}. ${target.title}. ${target.description}` : t('No hay controles disponibles en este estado.', 'There are no controls available in this state.'));
    };
    void locate();
  }, [active, index, steps, size.width, size.height, window.fontScale, t]);
  const context = useMemo(() => ({ register, active, close }), [register, active, close]);
  const layout = rect ? guideLayout(rect, size.width, size.height, panelHeight, insets.top, insets.bottom) : null;
  const hole = layout?.hole; const step = steps[index];
  return <GuideContext.Provider value={enabled ? context : null}>
    <View ref={root} collapsable={false} style={{ flex: 1 }} onLayout={event => setSize(event.nativeEvent.layout)}>
      <View style={{ flex: 1 }} pointerEvents={active ? 'none' : 'auto'} accessibilityElementsHidden={active} importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}>{children}</View>
      {enabled && <Pressable ref={help} accessibilityRole="button" accessibilityLabel={t('Abrir guía de esta pantalla', 'Open this screen guide')} accessibilityElementsHidden={active} importantForAccessibility={active ? 'no-hide-descendants' : 'auto'} onPress={() => void open()}
        style={({ pressed }) => [styles.help, { opacity: active ? 0 : pressed ? .6 : 1, top: insets.top + 8 }]}>
        {/* Área táctil de 44; lo visible es un círculo discreto, sin borde. */}
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800' }}>?</Text>
        </View>
      </Pressable>}
      {enabled && active && <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} accessibilityViewIsModal importantForAccessibility="yes" onAccessibilityEscape={close}>
        {hole ? <>
          <View style={[styles.shade, { top: 0, left: 0, right: 0, height: hole.y }]} />
          <View style={[styles.shade, { top: hole.y + hole.height, bottom: 0, left: 0, right: 0 }]} />
          <View style={[styles.shade, { top: hole.y, height: hole.height, left: 0, width: hole.x }]} />
          <View style={[styles.shade, { top: hole.y, height: hole.height, left: hole.x + hole.width, right: 0 }]} />
          <View style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.width, height: hole.height, borderWidth: 2, borderColor: colors.primary, borderRadius: 10 }} />
        </> : <View style={[StyleSheet.absoluteFill, styles.shade]} />}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border,
          left: layout?.panelLeft ?? 12, top: layout?.panelTop ?? insets.top + 64,
          width: layout?.panelWidth ?? size.width - 24, maxHeight: layout?.panelMaxHeight ?? size.height - insets.top - insets.bottom - 80 }]}
          onLayout={event => { const h = event.nativeEvent.layout.height; if (h > panelHeight) setPanelHeight(h); }}>
          <View style={styles.row}><Text style={{ color: colors.textSecondary, flex: 1 }}>{t('GUÍA', 'GUIDE')} · {steps.length ? `${index + 1} / ${steps.length}` : '—'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Cerrar guía', 'Close guide')} onPress={close} style={styles.control}><Text style={{ fontSize: 24, color: colors.text }}>×</Text></Pressable></View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 8 }}>
            <Text ref={heading} accessible accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{step?.title || t('Ayuda de la pantalla', 'Screen help')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>{!step ? t('Esta pantalla se actualiza automáticamente. Cuando aparezcan controles, vuelve a abrir la guía.', 'This screen updates automatically. Reopen the guide when controls become available.') : rect ? step.description : t('Este control cambió o ya no está disponible. Avanza al siguiente paso o cierra la guía para revisar el estado actual.', 'This control changed or is no longer available. Move to the next step or close the guide to review the current state.')}</Text>
          </ScrollView>
          <View style={[styles.row, { marginTop: 12, gap: 12 }]}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: index === 0 }} disabled={index === 0} onPress={() => setIndex(value => value - 1)} style={[styles.nav, { borderColor: colors.border, opacity: index === 0 ? 0.4 : 1 }]}><Text style={{ color: colors.text }}>{t('Atrás', 'Back')}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => index + 1 < steps.length ? setIndex(value => value + 1) : close()} style={[styles.nav, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{index + 1 < steps.length ? t('Siguiente', 'Next') : t('Finalizar', 'Finish')}</Text></Pressable>
          </View>
        </View>
      </View>}
    </View>
  </GuideContext.Provider>;
}
const styles = StyleSheet.create({
  help: { position: 'absolute', right: 14, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  panel: { position: 'absolute', borderRadius: 18, padding: 16, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  control: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  nav: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 8 },
});
