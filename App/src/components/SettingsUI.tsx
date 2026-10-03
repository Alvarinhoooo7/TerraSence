import { GuideTouchable as TouchableOpacity, GuideInput as TextInput } from './guide/GuideControls';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { useResetGuide } from './guide/GuideContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { EntryLayout, useEntryMetrics } from './entry/EntryUI';

export function SettingsPage({ title, description, onBack, children, footer }: React.PropsWithChildren<{ title: string; description?: string; onBack: () => void; footer?: React.ReactNode }>) {
  useResetGuide(title);
  const { colors } = useAppTheme(); const { t } = useTranslation();
  const { compact } = useEntryMetrics();
  return <EntryLayout keyboardAware header={<View style={{ paddingBottom: 8 }}>
      <TouchableOpacity accessibilityRole="button" onPress={onBack} style={ui.back}><Text style={{ color: colors.primary, fontWeight: '600' }}>‹ {t('Volver', 'Back')}</Text></TouchableOpacity>
      <Text accessibilityRole="header" style={[ui.title, { color: colors.text, fontSize: compact ? 28 : 34 }]}>{title}</Text>
      {!!description && <SettingsText>{description}</SettingsText>}
    </View>} footer={footer}><View style={{ flex: 1, gap: 12 }}>{children}</View></EntryLayout>;
}
export function SettingsText({ children, danger = false }: React.PropsWithChildren<{ danger?: boolean }>) {
  const { colors } = useAppTheme();
  return <Text accessibilityLiveRegion="polite" style={{ color: danger ? colors.danger : colors.textSecondary, fontSize: 15, lineHeight: 23 }}>{children}</Text>;
}
export function SettingsCard({ children }: React.PropsWithChildren) {
  const { colors } = useAppTheme();
  return <View style={[ui.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}
export function SettingsRow({ title, subtitle, onPress, danger = false, disabled = false, selected }: { title: string; subtitle?: string; onPress: () => void; danger?: boolean; disabled?: boolean; selected?: boolean }) {
  const { colors } = useAppTheme();
  return <TouchableOpacity guideTitle={title} accessibilityRole={selected === undefined ? 'button' : 'radio'} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={[ui.row, { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.card, opacity: disabled ? 0.5 : 1 }]}>
    <View style={{ flex: 1, gap: 5 }}><Text style={{ color: danger ? colors.danger : colors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>{!!subtitle && <SettingsText>{subtitle}</SettingsText>}</View>
    <Text style={{ color: danger ? colors.danger : colors.primary, fontSize: 22 }}>{selected ? '✓' : '›'}</Text>
  </TouchableOpacity>;
}
export function SettingsButton({ title, onPress, busy = false, disabled = false, danger = false }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; danger?: boolean }) {
  const { colors } = useAppTheme();
  return <TouchableOpacity guideTitle={title} accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={[ui.button, { backgroundColor: danger ? colors.danger : colors.primary, opacity: disabled || busy ? 0.5 : 1 }]}>
    {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{title}</Text>}
  </TouchableOpacity>;
}
export function SettingsInput({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: '600' }}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.textMuted} style={[ui.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }, props.style]} /></View>;
}
const ui = StyleSheet.create({
  back: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 56 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.7, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 14 },
  row: { minHeight: 72, padding: 18, borderWidth: 1, borderRadius: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  button: { minHeight: 52, borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
});
