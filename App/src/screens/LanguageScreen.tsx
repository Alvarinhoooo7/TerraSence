import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import Animated from 'react-native-reanimated';
import { useAppTheme } from '../hooks/useAppTheme';
import { useEntryMetrics, EntryButton, EntryHeading, EntryLayout } from '../components/entry/EntryUI';
import { checkPop } from '../constants/motion';
import type { AppLanguage } from '../types/preferences';

const BADGE: Record<AppLanguage, string> = { es: 'ES', en: 'EN' };
const NAME: Record<AppLanguage, string> = { es: 'Español', en: 'English' };

export function LanguageScreen({ initialLanguage, onContinue, busy = false, error = false }: {
  initialLanguage: AppLanguage; onContinue: (language: AppLanguage) => void; busy?: boolean; error?: boolean;
}) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  const { colors, isDark } = useAppTheme();
  const { compact } = useEntryMetrics();
  const badgeInk = isDark ? colors.background : '#FFFFFF';
  return <EntryLayout footer={<EntryButton label={language === 'en' ? 'Continue' : 'Continuar'} onPress={() => onContinue(language)} busy={busy} />}>
    <View style={{ gap: compact ? 20 : 28 }}>
      <EntryHeading eyebrow="TERRASENSE" title={'Elige tu idioma.\nChoose your language.'} description="Puedes cambiarlo más adelante. You can change it later." />
      <View style={{ gap: 12 }}>
        {(['es', 'en'] as const).map(option => {
          const selected = language === option;
          return <Pressable key={option} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: busy }}
            accessibilityLabel={NAME[option]} onPress={() => setLanguage(option)}
            style={{ minHeight: 76, paddingHorizontal: 20, borderRadius: 20, borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.card,
              flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: selected ? colors.primary : colors.background }}>
              <Text style={{ color: selected ? badgeInk : colors.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>{BADGE[option]}</Text>
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: selected ? '700' : '500' }}>{NAME[option]}</Text>
            <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
              {selected && <Animated.View entering={checkPop()} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: badgeInk, fontSize: 15, fontWeight: '700' }}>✓</Text>
              </Animated.View>}
            </View>
          </Pressable>;
        })}
      </View>
      {error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 16 }}>
        {language === 'en' ? 'Could not save your language. Please try again.' : 'No pudimos guardar el idioma. Inténtalo otra vez.'}
      </Text>}
    </View>
  </EntryLayout>;
}
