import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppStore } from '../store/useAppStore';
import { savePreferences } from '../services/preferencesService';
import type { AppLanguage, GuideId } from '../types/preferences';

interface GuideCopy {
  title: string;
  intro: string;
  steps: string[];
}

const COPY: Record<AppLanguage, Record<GuideId, GuideCopy>> = {
  es: {
    auth: {
      title: 'Guía de acceso',
      intro: 'Tu cuenta conserva equipos, preferencias y progreso aunque reinstales la app.',
      steps: [
        'Crea una cuenta si es tu primera vez o inicia sesión con la cuenta existente.',
        'Usa “Olvidé mi contraseña” para recibir un enlace de recuperación.',
        'No compartas tu contraseña: para compartir una sonda se utiliza su QR de vinculación.',
      ],
    },
    onboarding: {
      title: 'Guía de conexión inicial',
      intro: 'Sólo necesitas elegir una de las dos rutas disponibles.',
      steps: [
        'Si el equipo ya tiene administrador, pídele el QR y escanéalo.',
        'Si eres la primera persona del equipo, enciende la sonda y usa “Configurar equipo nuevo”.',
        'La finalización queda guardada en tu cuenta y no reaparece al reinstalar.',
      ],
    },
    map: {
      title: 'Guía del mapa',
      intro: 'El mapa reúne posición, estado agronómico y evolución del predio.',
      steps: [
        'Elige predio y etapa fenológica antes de medir.',
        'Cada círculo es una medición; su icono y color indican el veredicto. Tócalo para ver datos.',
        'Usa “Medir ahora” para registrar un punto y la carpeta para abrir el historial.',
        'Sin señal, las mediciones quedan pendientes y se sincronizan al recuperar conexión.',
      ],
    },
    measure: {
      title: 'Guía de medición',
      intro: 'Una lectura estable comienza con una sonda bien instalada.',
      steps: [
        'Inserta completamente la sonda en suelo representativo, sin piedras ni bolsas de aire.',
        'Mantenla quieta mientras se leen sensores y GPS.',
        'Revisa veredicto, alertas y acción sugerida; luego guarda para agregar el punto al mapa.',
        'Si aparece “datos simulados”, el valor sirve para demostración y no para decisiones de campo.',
      ],
    },
    history: {
      title: 'Guía del historial',
      intro: 'Compara mediciones y detecta cambios a través del tiempo.',
      steps: [
        'El resumen muestra cuántas lecturas están bien, requieren atención o son críticas.',
        'Filtra por etapa fenológica para comparar condiciones equivalentes.',
        'Toca una fila para abrir el diagnóstico y la acción correctiva guardada.',
      ],
    },
    settings: {
      title: 'Guía de configuración',
      intro: 'Estas preferencias se guardan en tu cuenta.',
      steps: [
        'Elige tema, idioma y sistema de medición; el cambio se aplica inmediatamente.',
        'Activa sólo las categorías de notificaciones que quieras recibir.',
        'Cultivo y textura modifican los umbrales del motor agronómico: selecciónalos con cuidado.',
        'En “Mis equipos” puedes administrar sondas y compartir el QR si tienes permisos.',
      ],
    },
    devices: {
      title: 'Guía de equipos',
      intro: 'Cada sonda posee un código estable de 15 dígitos.',
      steps: [
        'El administrador comparte el QR o código con operadores autorizados.',
        'Vincular un código no cambia la identidad física de la sonda.',
        '“Registrar equipo” se usa al configurar una sonda nueva como primer propietario.',
      ],
    },
    perimeter: {
      title: 'Guía del perímetro',
      intro: 'Delimita el predio para dar contexto espacial a sus mediciones.',
      steps: [
        'Toca cada esquina visible en el mapa o camina el borde y pulsa “Estoy aquí”.',
        'Agrega al menos tres puntos; usa “Deshacer” si una esquina quedó mal.',
        'Guarda para calcular la superficie y mostrar el polígono en el mapa de pre-siembra.',
      ],
    },
  },
  en: {
    auth: {
      title: 'Access guide',
      intro: 'Your account keeps devices, preferences and progress even after reinstalling the app.',
      steps: [
        'Create an account the first time, or sign in with your existing account.',
        'Use “Forgot password” to receive a recovery link.',
        'Do not share passwords: use the device linking QR to share a probe.',
      ],
    },
    onboarding: {
      title: 'Initial connection guide',
      intro: 'You only need to choose one of the two available paths.',
      steps: [
        'If the device already has an administrator, ask them for the QR and scan it.',
        'If you are the first user, turn on the probe and choose “Set up new device”.',
        'Completion is saved to your account and will not reappear after reinstalling.',
      ],
    },
    map: {
      title: 'Map guide',
      intro: 'The map combines location, agronomic status and field evolution.',
      steps: [
        'Choose the field and crop stage before measuring.',
        'Each circle is a reading; its icon and color show the verdict. Tap it for details.',
        'Use “Measure now” to add a point and the folder button to open history.',
        'While offline, readings remain pending and sync when connectivity returns.',
      ],
    },
    measure: {
      title: 'Measurement guide',
      intro: 'A stable reading starts with a correctly installed probe.',
      steps: [
        'Insert the probe fully in representative soil, avoiding stones and air gaps.',
        'Keep it still while sensors and GPS are read.',
        'Review the verdict, alerts and suggested action, then save it to the map.',
        'If “simulated data” appears, use the reading only for demonstration.',
      ],
    },
    history: {
      title: 'History guide',
      intro: 'Compare readings and identify changes over time.',
      steps: [
        'The summary shows healthy, attention and critical reading counts.',
        'Filter by crop stage to compare equivalent conditions.',
        'Tap a row to open its saved diagnosis and corrective action.',
      ],
    },
    settings: {
      title: 'Settings guide',
      intro: 'These preferences are saved to your account.',
      steps: [
        'Choose theme, language and measurement system; changes apply immediately.',
        'Enable only the notification categories you want to receive.',
        'Crop and soil texture change agronomic thresholds, so select them carefully.',
        'Use “My devices” to manage probes and share their QR when authorized.',
      ],
    },
    devices: {
      title: 'Devices guide',
      intro: 'Each probe has a stable 15-digit code.',
      steps: [
        'The administrator shares the QR or code with authorized operators.',
        'Linking a code does not change the physical probe identity.',
        'Use “Register device” when setting up a new probe as its first owner.',
      ],
    },
    perimeter: {
      title: 'Perimeter guide',
      intro: 'Outline the field to give spatial context to its readings.',
      steps: [
        'Tap every visible corner, or walk the boundary and press “I am here”.',
        'Add at least three points; use “Undo” when a corner is misplaced.',
        'Save to calculate area and show the polygon on the main map.',
      ],
    },
  },
};

interface Props {
  guideId: GuideId;
  style?: ViewStyle;
  autoOpen?: boolean;
}

export const ScreenGuide: React.FC<Props> = ({ guideId, style, autoOpen = true }) => {
  const { colors } = useAppTheme();
  const { preferences, preferencesLoaded, setPreferences } = useAppStore();
  const [visible, setVisible] = useState(false);
  const copy = COPY[preferences.language][guideId];

  useEffect(() => {
    if (autoOpen && preferencesLoaded && !preferences.guidesSeen[guideId]) setVisible(true);
  }, [autoOpen, guideId, preferences.guidesSeen, preferencesLoaded]);

  const close = useCallback(() => {
    setVisible(false);
    if (!preferencesLoaded || preferences.guidesSeen[guideId]) return;
    const next = {
      ...preferences,
      guidesSeen: { ...preferences.guidesSeen, [guideId]: true },
    };
    setPreferences(next);
    void savePreferences(next);
  }, [guideId, preferences, preferencesLoaded, setPreferences]);

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={preferences.language === 'en' ? `Open ${copy.title}` : `Abrir ${copy.title}`}
        onPress={() => setVisible(true)}
        style={[
          styles.helpButton,
          { backgroundColor: colors.mapOverlay, borderColor: colors.primary },
          style,
        ]}
      >
        <Text style={[styles.helpText, { color: colors.primary }]}>?</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <SafeAreaView style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>TERRASENSE · GUIDE</Text>
            <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>{copy.intro}</Text>
            <ScrollView style={styles.steps} contentContainerStyle={{ gap: Spacing.sm }}>
              {copy.steps.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={close} style={[styles.closeButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.closeText}>{preferences.language === 'en' ? 'Got it' : 'Entendido'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  helpButton: {
    position: 'absolute',
    top: 58,
    right: Spacing.md,
    zIndex: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { fontSize: 20, fontWeight: '800' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.56)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modal: {
    maxHeight: '82%',
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  eyebrow: { ...Typography.badge, marginBottom: Spacing.xs },
  title: { ...Typography.titleLarge },
  intro: { ...Typography.bodyRegular, marginTop: Spacing.xs, marginBottom: Spacing.md },
  steps: { flexGrow: 0 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#FFFFFF', fontWeight: '800' },
  stepText: { ...Typography.bodyRegular, flex: 1 },
  closeButton: {
    minHeight: Spacing.touchTarget,
    marginTop: Spacing.lg,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { ...Typography.button, color: '#FFFFFF' },
});
