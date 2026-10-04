import { legalSections } from '../utils/legalSections';
import React, { useEffect, useReducer, useRef } from 'react';
import { AccessibilityInfo, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './AppText';
import Animated from 'react-native-reanimated';
import { AuthButton } from './auth/AuthUI';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Spacing, Typography } from '../constants/theme';
import { backdropIn, sheetIn } from '../constants/motion';
import { maxScrollOffset, scrollTweenDuration, scrollTweenPosition } from '../utils/smoothScroll';
import {
  canAcceptRegistration, consentReducer, createRegistrationConsent, hasReachedLegalEnd,
  initialConsent, RegistrationConsent,
} from '../utils/registrationConsent';

interface Props {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onContinue: (consent: RegistrationConsent) => void;
}

// Montar al abrir y desmontar al cancelar: ninguna aceptación queda preseleccionada.
export function RegistrationConsentModal({ busy, error, onCancel, onContinue }: Props) {
  const { colors, isDark } = useAppTheme();
  const { t, language } = useTranslation();
  const [state, dispatch] = useReducer(consentReducer, initialConsent);
  const dimensions = useRef({ offset: 0, viewport: 0, content: 0 });
  const scroller = useRef<ScrollView>(null);
  const assist = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitted = useRef(false);
  const reducedMotion = useRef(false);
  const checkEnd = () => {
    const { offset, viewport, content } = dimensions.current;
    if (hasReachedLegalEnd(offset, viewport, content)) dispatch({ type: 'read' });
  };
  const stopAssist = () => { if (assist.current) { clearInterval(assist.current); assist.current = null; } };

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reducedMotion.current = value; }).catch(() => undefined);
    return stopAssist;
  }, []);

  // La acción antes de haber leído no deja el botón muerto: baja el texto hasta el
  // final a una velocidad legible. La aceptación sigue exigiendo llegar abajo y marcar
  // las dos casillas; esto sólo evita que el usuario quede sin saber qué hacer.
  const assistScroll = () => {
    const { offset, viewport, content } = dimensions.current;
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

  const enabled = canAcceptRegistration(state) && !busy;
  const assisting = !state.reachedEnd;
  // Fuentes legales: https://www.bcn.cl/leychile/Navegar?idNorma=141599
  // y https://www.bcn.cl/leychile/Navegar?idNorma=1209272
  const sections = legalSections(t);

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => { if (!busy) onCancel(); }}>
      <Animated.View entering={backdropIn()} style={styles.backdrop}>
        <Animated.View entering={sheetIn()} style={styles.sheetWrap}>
          <SafeAreaView edges={['top', 'bottom']} style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[Typography.titleMedium, styles.title, { color: colors.text }]}>
                {t('Antes de Crear tu Cuenta', 'Before Creating Your Account')}
              </Text>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
                <Text style={{ color: colors.primary }}>{t('Cancelar', 'Cancel')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={scroller}
              style={{ flex: 1 }} contentContainerStyle={styles.content} scrollEventThrottle={16}
              onLayout={event => { dimensions.current.viewport = event.nativeEvent.layout.height; checkEnd(); }}
              onContentSizeChange={(_, height) => { dimensions.current.content = height; checkEnd(); }}
              onScrollBeginDrag={stopAssist}
              onScroll={event => { dimensions.current.offset = event.nativeEvent.contentOffset.y; checkEnd(); }}
            >
              {sections.map(([title, body]) => (
                <View key={title} style={{ gap: Spacing.sm }}>
                  <Text accessibilityRole="header" style={[Typography.bodyBold, { color: colors.text }]}>{title}</Text>
                  <Text style={[Typography.bodyRegular, { color: colors.textSecondary }]}>{body}</Text>
                </View>
              ))}
              {([
                ['terms', state.termsAccepted, t('He leído y estoy de acuerdo con los términos y condiciones de TerraSense.', 'I have read and agree to the TerraSense terms and conditions.')],
                ['privacy', state.privacyAccepted, t('He leído el aviso de privacidad y autorizo el tratamiento de mis datos para las finalidades de servicio descritas.', 'I have read the privacy notice and authorize processing of my data for the service purposes described.')],
              ] as const).map(([type, checked, label]) => (
                <TouchableOpacity key={type} accessibilityRole="checkbox"
                  accessibilityLabel={label} accessibilityState={{ checked, disabled: !state.reachedEnd || busy }}
                  disabled={!state.reachedEnd || busy} onPress={() => dispatch({ type })}
                  style={[styles.checkboxRow, { opacity: state.reachedEnd ? 1 : 0.5 }]}>
                  <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: checked ? colors.primary : colors.card }]}>
                    <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 18 }}>{checked ? '✓' : ''}</Text>
                  </View>
                  <Text style={[Typography.bodyRegular, { color: colors.text, flex: 1 }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {state.reachedEnd && !enabled && !busy && <Text accessibilityLiveRegion="polite" style={[Typography.caption, styles.centeredText, { color: colors.textSecondary }]}>
                {t('Marca ambas casillas para continuar.', 'Select both checkboxes to continue.')}
              </Text>}
              {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
              <AuthButton label={assisting ? t('Leer hasta el final', 'Read to the end') : t('Aceptar y crear cuenta', 'Accept and create account')}
                busy={busy} disabled={!assisting && !enabled}
                hint={assisting ? t('Baja el texto hasta el final para poder aceptarlo.', 'Scrolls the text to the end so you can accept it.') : undefined}
                onPress={() => {
                  if (assisting) assistScroll();
                  else if (enabled && !submitted.current) { submitted.current = true; onContinue(createRegistrationConsent(state, language)); }
                }} />
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { height: '92%', width: '100%' },
  sheet: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  // «Cancelar» va absoluto para que el título quede centrado en la hoja y no en el
  // espacio que le deja el botón.
  header: { justifyContent: 'center', minHeight: 56, paddingHorizontal: Spacing.lg },
  title: { textAlign: 'center', paddingHorizontal: 64 },
  centeredText: { textAlign: 'center' },
  cancel: { position: 'absolute', right: Spacing.lg, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, minHeight: 48 },
  checkbox: { width: 26, height: 26, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1 },
});
