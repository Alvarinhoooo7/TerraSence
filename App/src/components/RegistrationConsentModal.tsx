import React, { useReducer, useRef } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { colors } = useAppTheme();
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
  const sections = [
    [t('1. Términos de uso', '1. Terms of use'), t(
      'TerraSense permite vincular una sonda, consultar mediciones de suelo y ambiente y organizar información de tu campo. Sus recomendaciones son orientativas y dependen de la calidad de las lecturas y del contexto registrado. No sustituyen el análisis de laboratorio ni la evaluación de un profesional agronómico. Las lecturas de nitrógeno, fósforo y potasio son informativas y no deben usarse por sí solas para determinar dosis de fertilización.',
      'TerraSense lets you pair a probe, view soil and environmental measurements, and organize information about your field. Recommendations are guidance based on measurement quality and the recorded context. They do not replace laboratory analysis or professional agronomic assessment. Nitrogen, phosphorus and potassium readings are informational and must not be used alone to determine fertilizer doses.',
    )],
    [t('2. Tu cuenta y tus equipos', '2. Your account and devices'), t(
      'Debes proporcionar un correo que controles y proteger tu contraseña y tus códigos de verificación. Vincula y administra únicamente equipos y campos para los que tengas autorización. La confirmación del correo no te convierte en administrador de otros equipos. Puedes cancelar este registro si no aceptas estas condiciones; no se solicitará la creación de tu cuenta.',
      'Provide an email address you control and protect your password and verification codes. Only pair and manage devices and fields you are authorized to access. Confirming your email does not make you an administrator of other devices. You can cancel registration if you do not accept these terms; account creation will not be requested.',
    )],
    [t('3. Datos personales y finalidad', '3. Personal data and purpose'), t(
      'Para gestionar tu cuenta se utiliza tu nombre y correo electrónico. Al usar el servicio se procesan las asociaciones con equipos, los campos que registres, mediciones, fechas y diagnósticos para mostrar tu historial, sincronizar información y gestionar accesos y soporte. La aceptación de este registro se envía junto con la versión del texto y la fecha indicada por tu dispositivo. Esta autorización se refiere a estas finalidades de funcionamiento del servicio, no a publicidad.',
      'Your name and email address are used to manage your account. Device memberships, fields you register, measurements, dates and diagnoses are processed to display history, synchronize information, manage access and provide support. Your acceptance is sent with the text version and the date reported by your device. This authorization covers these service purposes, not advertising.',
    )],
    [t('4. Ubicación y proveedores', '4. Location and providers'), t(
      'Cuando autorizas la ubicación, se pueden asociar coordenadas a las mediciones y enviarlas a Open-Meteo para consultar el pronóstico. El permiso de ubicación se solicita por separado en tu teléfono; aceptar este aviso no lo concede. La información sincronizada se aloja en Supabase, en la región São Paulo, Brasil, lo que supone tratamiento fuera de Chile. La app también conserva información local para trabajar sin conexión. El acceso remoto depende de los permisos de cada usuario y del personal de soporte autorizado.',
      'When you allow location access, coordinates may be associated with measurements and sent to Open-Meteo for weather forecasts. Your phone requests location permission separately; accepting this notice does not grant it. Synchronized information is hosted by Supabase in São Paulo, Brazil, which involves processing outside Chile. The app also keeps local information for offline use. Remote access depends on user permissions and authorized support staff.',
    )],
    [t('5. Protección de datos en Chile', '5. Data protection in Chile'), t(
      'La Ley N° 19.628 regula actualmente la protección de datos personales. La Ley N° 21.719 modifica este marco y entra en vigor el 1 de diciembre de 2026. Puedes ejercer los derechos que correspondan conforme a la normativa aplicable, incluidos acceso, rectificación y eliminación, y revocar tu consentimiento en los casos previstos por la ley. Aceptar este aviso no implica renunciar a esos derechos.',
      'Law No. 19,628 currently regulates personal data protection in Chile. Law No. 21,719 amends this framework and takes effect on December 1, 2026. You may exercise applicable statutory rights, including access, correction and deletion, and withdraw consent as provided by law. Accepting this notice does not waive those rights.',
    )],
  ];

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
                  <Text style={{ color: '#FFFFFF', fontSize: 18 }}>{checked ? '✓' : ''}</Text>
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
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !enabled, busy }}
              disabled={!enabled} onPress={() => { if (enabled) onContinue(createRegistrationConsent(state, language)); }}
              style={[styles.continue, { backgroundColor: colors.primary, opacity: enabled ? 1 : 0.45 }]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[Typography.button, { color: '#FFFFFF' }]}>{t('Continuar', 'Continue')}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { height: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  cancel: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, minHeight: 48 },
  checkbox: { width: 26, height: 26, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1 },
  continue: { minHeight: 56, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});
