import React, { useEffect, useReducer, useRef } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryButton, EntryHeading } from '../components/entry/EntryUI';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { legalSections } from '../utils/legalSections';
import { maxScrollOffset, scrollTweenDuration, scrollTweenPosition } from '../utils/smoothScroll';
import {
  canAcceptRegistration, consentReducer, createRegistrationConsent,
  hasReachedLegalEnd, initialConsent, type RegistrationConsent,
} from '../utils/registrationConsent';

interface Props {
  onBack: () => void;
  onContinue: (consent: RegistrationConsent) => void;
}

export function TermsScreen({ onBack, onContinue }: Props) {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const [state, dispatch] = useReducer(consentReducer, initialConsent);
  const scroller = useRef<ScrollView>(null);
  const dimensions = useRef({ offset: 0, viewport: 0, content: 0 });
  const assist = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useRef(false);
  const submitted = useRef(false);

  const stopAssist = () => { if (assist.current) clearInterval(assist.current); assist.current = null; };
  const checkEnd = () => {
    const { offset, viewport, content } = dimensions.current;
    if (hasReachedLegalEnd(offset, viewport, content)) dispatch({ type: 'read' });
  };
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) reducedMotion.current = value; }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => { mounted = false; listener.remove(); stopAssist(); };
  }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => listener.remove();
  }, [onBack]);

  const assistScroll = () => {
    const { offset, viewport, content } = dimensions.current;
    if (viewport <= 0 || content <= 0) return;
    const target = maxScrollOffset(content, viewport);
    const duration = reducedMotion.current ? 0 : scrollTweenDuration(target - offset);
    stopAssist();
    if (duration <= 0) {
      scroller.current?.scrollTo({ y: target, animated: false });
      dimensions.current.offset = target;
      checkEnd();
      return;
    }
    const from = offset;
    const started = Date.now();
    assist.current = setInterval(() => {
      const elapsed = Date.now() - started;
      scroller.current?.scrollTo({ y: scrollTweenPosition(from, target, elapsed, duration), animated: false });
      if (elapsed >= duration) stopAssist();
    }, 16);
  };

  const ready = canAcceptRegistration(state);
  const checkboxText = [
    ['terms', state.termsAccepted, t('He leído y acepto los términos y condiciones de TerraSense.', 'I have read and agree to TerraSense’s terms and conditions.')],
    ['privacy', state.privacyAccepted, t('He leído el aviso de privacidad y autorizo el tratamiento de mis datos para las finalidades de servicio descritas.', 'I have read the privacy notice and authorize processing of my data for the service purposes described.')],
  ] as const;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Volver', 'Back')} onPress={onBack}
        style={{ minWidth: 48, minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>‹ {t('Volver', 'Back')}</Text>
      </Pressable>
    </View>
    <ScrollView ref={scroller} style={{ flex: 1 }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 24 }}
      onLayout={event => { dimensions.current.viewport = event.nativeEvent.layout.height; checkEnd(); }}
      onContentSizeChange={(_, height) => { dimensions.current.content = height; checkEnd(); }}
      onScrollBeginDrag={stopAssist}
      onScroll={event => { dimensions.current.offset = event.nativeEvent.contentOffset.y; checkEnd(); }}>
      <EntryHeading eyebrow="TERRASENSE" title={t('Términos y privacidad', 'Terms and privacy')}
        description={t('Lee cómo funciona el servicio y cómo cuidamos tus datos antes de continuar.', 'Read how the service works and how we handle your data before continuing.')} />
      {legalSections(t).map(([title, body]) => <View key={title} style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 17, lineHeight: 25, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>{body}</Text>
      </View>)}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20, gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
          {t('Tu decisión', 'Your decision')}
        </Text>
        {checkboxText.map(([type, checked, label]) => <Pressable key={type} accessibilityRole="checkbox"
          accessibilityLabel={label} accessibilityState={{ checked, disabled: !state.reachedEnd }}
          disabled={!state.reachedEnd} onPress={() => dispatch({ type })}
          style={{ minHeight: 56, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, opacity: state.reachedEnd ? 1 : .55 }}>
          <View style={{ width: 28, height: 28, borderWidth: 2, borderRadius: 6, borderColor: colors.primary,
            backgroundColor: checked ? colors.primary : colors.background, alignItems: 'center', justifyContent: 'center' }}>
            {checked && <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 18, lineHeight: 23 }}>✓</Text>}
          </View>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, flex: 1 }}>{label}</Text>
        </Pressable>)}
      </View>
    </ScrollView>
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 24,
      paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
      {state.reachedEnd && !ready && <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14 }}>
        {t('Marca ambas casillas para continuar.', 'Select both checkboxes to continue.')}
      </Text>}
      <EntryButton label={state.reachedEnd ? t('Aceptar y continuar', 'Accept and continue') : t('Leer hasta el final', 'Read to the end')}
        disabled={state.reachedEnd && !ready} onPress={() => {
          if (!state.reachedEnd) { assistScroll(); return; }
          if (!ready || submitted.current) return;
          submitted.current = true;
          onContinue(createRegistrationConsent(state, language));
        }} />
    </View>
  </SafeAreaView>;
}
