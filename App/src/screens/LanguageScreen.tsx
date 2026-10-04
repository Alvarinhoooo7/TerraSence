import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { useAppTheme } from '../hooks/useAppTheme';
import { useEntryMetrics, EntryButton, EntryHeading, EntryLayout } from '../components/entry/EntryUI';
import type { AppLanguage } from '../types/preferences';

export function LanguageScreen({ initialLanguage, onContinue, onClose, busy = false, error = false }: {
  initialLanguage: AppLanguage; onContinue: (language: AppLanguage) => void; onClose?: () => void; busy?: boolean; error?: boolean;
}) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  const { colors } = useAppTheme();
  const { compact } = useEntryMetrics();
  return <EntryLayout header={onClose ? <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 16 }}>{language === 'en' ? 'Back' : 'Volver'}</Text></Pressable> : undefined}
    footer={<EntryButton label={language === 'en' ? 'Continue' : 'Continuar'} onPress={() => onContinue(language)} busy={busy} />}>
    <View style={{ gap: compact ? 20 : 28 }}>
      <EntryHeading eyebrow="TERRASENSE" title={'Elige tu idioma.\nChoose your language.'} description="Puedes cambiarlo más adelante. You can change it later." />
      <View style={{ gap: 12 }}>
        {(['es', 'en'] as const).map(option => <Pressable key={option} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: language === option, disabled: busy }}
          accessibilityLabel={option === 'es' ? 'Español' : 'English'} onPress={() => setLanguage(option)}
          style={{ minHeight: 72, paddingHorizontal: 18, borderRadius: 18, borderWidth: language === option ? 2 : 1,
            borderColor: language === option ? colors.primary : colors.border, backgroundColor: colors.card,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: language === option ? '700' : '500' }}>{option === 'es' ? 'Español' : 'English'}</Text>
          <Text accessibilityElementsHidden style={{ color: colors.primary, fontSize: 24 }}>{language === option ? '●' : '○'}</Text>
        </Pressable>)}
      </View>
      {error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 16 }}>
        {language === 'en' ? 'Could not save your language. Please try again.' : 'No pudimos guardar el idioma. Inténtalo otra vez.'}
      </Text>}
    </View>
  </EntryLayout>;
}
