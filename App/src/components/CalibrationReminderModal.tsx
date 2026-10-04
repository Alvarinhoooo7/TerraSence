import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { GuideModal } from './guide/GuideModal';
import { EntryButton, EntryHeading, EntryLayout } from './entry/EntryUI';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';

export function CalibrationReminderModal({ visible, onClose, synced }: { visible: boolean; onClose: () => void; synced?: boolean }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return <GuideModal visible={visible} animationType="fade" onRequestClose={onClose}>
    <EntryLayout footer={<EntryButton label={t('Volver a Inicio', 'Back to Home')} onPress={onClose} />}>
      <View style={{ gap: 24 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>{synced === undefined ? t('Lectura guardada', 'Reading saved') : synced ? t('Lectura respaldada en la nube', 'Reading backed up to cloud') : t('Guardada en el teléfono · Pendiente de sincronización', 'Saved on phone · Pending sync')}</Text>
        <EntryHeading title={t('Lista para la próxima lectura', 'Ready for the next reading')} description={t('Limpia la punta de la sonda con un paño antes de volver a medir.', 'Wipe the probe tip with a cloth before measuring again.')} />
      </View>
    </EntryLayout>
  </GuideModal>;
}
