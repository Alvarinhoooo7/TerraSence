import { legalSections } from '../utils/legalSections';
import React, { useReducer, useRef } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthButton } from './auth/AuthUI';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Spacing, Typography } from '../constants/theme';
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
  const checkEnd = () => {
    const { offset, viewport, content } = dimensions.current;
    if (hasReachedLegalEnd(offset, viewport, content)) dispatch({ type: 'read' });
  };
  const enabled = canAcceptRegistration(state) && !busy;
  // Fuentes legales: https://www.bcn.cl/leychile/Navegar?idNorma=141599
  // y https://www.bcn.cl/leychile/Navegar?idNorma=1209272
  const sections = legalSections(t);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => { if (!busy) onCancel(); }}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['top', 'bottom']} style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[Typography.titleMedium, { color: colors.text, flex: 1 }]}>
              {t('Antes de crear tu cuenta', 'Before creating your account')}
            </Text>
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
              <Text style={{ color: colors.primary }}>{t('Cancelar', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }} contentContainerStyle={styles.content} scrollEventThrottle={16}
            onLayout={event => { dimensions.current.viewport = event.nativeEvent.layout.height; checkEnd(); }}
            onContentSizeChange={(_, height) => { dimensions.current.content = height; checkEnd(); }}
            onScroll={event => { dimensions.current.offset = event.nativeEvent.contentOffset.y; checkEnd(); }}
          >
            <Text style={[Typography.caption, { color: colors.warning }]}>
              {t('Versión preliminar: falta completar el responsable, el contacto para ejercer tus derechos y los plazos de conservación antes de publicar este aviso.',
                'Draft: the responsible party, rights contact and retention periods must be completed before this notice is published.')}
            </Text>
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
            <Text accessibilityLiveRegion="polite" style={[Typography.caption, { color: colors.textSecondary }]}>
              {state.reachedEnd
                ? t('Marca ambas casillas para continuar.', 'Select both checkboxes to continue.')
                : t('Desliza hasta el final para habilitar las casillas.', 'Scroll to the end to enable the checkboxes.')}
            </Text>
            {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
            <AuthButton label={t('Continuar', 'Continue')} busy={busy} disabled={!enabled}
              onPress={() => { if (enabled) onContinue(createRegistrationConsent(state, language)); }} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { height: '92%', width: '100%', maxWidth: 560, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  cancel: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, minHeight: 48 },
  checkbox: { width: 26, height: 26, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1 },
});
