import { GuideInput as TextInput } from './guide/GuideControls';
import React from 'react';
import { Text, View, type TextInputProps } from 'react-native';
import { useResetGuide } from './guide/GuideContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { EntryButton } from './entry/EntryUI';
import { ScreenCard, ScreenLayout, ScreenOption, ScreenText } from './screen/ScreenUI';

/**
 * Configuración y sus subpantallas, con las piezas compartidas de ScreenUI: el
 * mismo lenguaje visual de la entrada. Se conservan los nombres para no tocar
 * cada pantalla que los usa.
 */
export function SettingsPage({ title, eyebrow, description, onBack, children, footer, backLabel }: React.PropsWithChildren<{
  title: string; eyebrow?: string; description?: string; onBack?: () => void; footer?: React.ReactNode; backLabel?: string;
}>) {
  useResetGuide(title);
  const { t } = useTranslation();
  return <ScreenLayout tabBar keyboardAware eyebrow={eyebrow ?? t('CONFIGURACIÓN', 'SETTINGS')} title={title} description={description}
    onBack={onBack} backLabel={backLabel} footer={footer}>{children}</ScreenLayout>;
}
export function SettingsText({ children, danger = false }: React.PropsWithChildren<{ danger?: boolean }>) {
  return <ScreenText danger={danger}>{children}</ScreenText>;
}
export function SettingsCard({ children }: React.PropsWithChildren) {
  return <ScreenCard>{children}</ScreenCard>;
}
export function SettingsRow({ title, subtitle, onPress, danger = false, disabled = false, selected }: { title: string; subtitle?: string; onPress: () => void; danger?: boolean; disabled?: boolean; selected?: boolean }) {
  return <ScreenOption title={title} subtitle={subtitle} onPress={onPress} danger={danger} disabled={disabled} selected={selected} />;
}
export function SettingsButton({ title, onPress, busy = false, disabled = false, danger = false }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; danger?: boolean }) {
  return <EntryButton label={title} onPress={onPress} busy={busy} disabled={disabled} danger={danger} />;
}
export function SettingsInput({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 6 }}>
    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.textSecondary}
      style={[{ minHeight: 50, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
        color: colors.text, borderColor: colors.border, backgroundColor: colors.card }, props.style]} />
  </View>;
}
