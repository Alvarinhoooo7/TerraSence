import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { Typography, Spacing } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';
import LottieView from 'lottie-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CalibrationReminderModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: Spacing.sm }}>🧽</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('¡Limpieza de Sonda!', 'Probe Cleaning!')}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {t(
              'Para mantener la máxima precisión en tus lecturas de humedad y pH, recuerda limpiar la punta de la sonda con un paño antes de la siguiente medición.',
              'To maintain maximum accuracy in your moisture and pH readings, remember to wipe the probe tip before the next measurement.'
            )}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{t('¡Entendido!', 'Got it!')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: Spacing.borderRadius,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    ...Typography.titleMedium,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    ...Typography.bodyRegular,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.button,
    color: '#FFF',
  },
});
