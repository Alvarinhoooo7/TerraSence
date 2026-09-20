import React, { useCallback, useContext, useRef } from 'react';
import { Pressable, ScrollView, Switch, TextInput, TouchableOpacity, View, type PressableProps, type ScrollViewProps, type SwitchProps, type TextInputProps, type TouchableOpacityProps } from 'react-native';
import { useTranslation } from '../../hooks/useTranslation';
import { GuideContext, GuideScrollContext, guideText, measure, useGuideTarget, type Measurable } from './GuideContext';
import { controlDescription } from './guideCopy';

export interface GuideProps { guide?: string | false; guideTitle?: string }
function useControlGuide(props: GuideProps & { accessibilityLabel?: string; accessibilityHint?: string; children?: React.ReactNode }, fallback: string) {
  const { language } = useTranslation();
  const title = props.guideTitle || props.accessibilityLabel || guideText(props.children);
  return useGuideTarget(title, props.guide || props.accessibilityHint || controlDescription(title, language) || fallback, props.guide !== false);
}
export function GuideTouchable({ guide, guideTitle, ...props }: TouchableOpacityProps & GuideProps) {
  const { t } = useTranslation();
  const ref = useControlGuide({ ...props, guide, guideTitle }, t('Abre esta opción. Puedes cerrar la guía para utilizarla.', 'Opens this option. Close the guide to use it.'));
  return <TouchableOpacity {...props} ref={ref} accessibilityRole={props.accessibilityRole ?? 'button'} />;
}
export function GuidePressable({ guide, guideTitle, ...props }: PressableProps & GuideProps) {
  const { t } = useTranslation();
  const ref = useControlGuide({ ...props, children: typeof props.children === 'function' ? undefined : props.children, guide, guideTitle }, t('Abre esta opción. Puedes cerrar la guía para utilizarla.', 'Opens this option. Close the guide to use it.'));
  return <Pressable {...props} ref={ref} />;
}
export function GuideInput({ guide, guideTitle, ...props }: TextInputProps & GuideProps) {
  const { t } = useTranslation();
  const ref = useControlGuide({ ...props, guide, guideTitle }, t('Escribe aquí el valor solicitado. Los cambios se confirman con el botón correspondiente.', 'Enter the requested value here. Confirm changes using the corresponding button.'));
  return <TextInput {...props} ref={ref as React.RefObject<TextInput>} />;
}
export function GuideSwitch({ guide, guideTitle, ...props }: SwitchProps & GuideProps) {
  const { t } = useTranslation();
  const ref = useControlGuide({ ...props, guide, guideTitle }, t('Activa o desactiva esta categoría de avisos. El permiso del teléfono se gestiona por separado.', 'Enable or disable this alert category. Phone permission is managed separately.'));
  return <View ref={ref} collapsable={false}><Switch {...props} /></View>;
}
export function GuideTarget({ title, description, children }: React.PropsWithChildren<{ title: string; description: string }>) {
  const ref = useGuideTarget(title, description);
  return <View ref={ref} collapsable={false}>{children}</View>;
}
export function GuideScrollView({ children, onScroll, ...props }: ScrollViewProps) {
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);
  const context = useContext(GuideContext);
  const reveal = useCallback(async (node: Measurable) => {
    const [target, viewport] = await Promise.all([measure(node), measure(ref.current?.getNativeScrollRef() ?? null)]);
    if (!target || !viewport) return;
    // Ubicar el control en el tercio superior deja espacio para explicar su función.
    const delta = target.y - viewport.y - Math.min(100, viewport.height / 4);
    if (target.y < viewport.y + 8 || target.y + target.height > viewport.y + viewport.height - 220) {
      ref.current?.scrollTo({ y: Math.max(0, offset.current + delta), animated: false });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);
  return <GuideScrollContext.Provider value={reveal}><ScrollView {...props} ref={ref}
    scrollEnabled={context?.active ? false : props.scrollEnabled} removeClippedSubviews={false}
    scrollEventThrottle={16} onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}>{children}</ScrollView></GuideScrollContext.Provider>;
}
