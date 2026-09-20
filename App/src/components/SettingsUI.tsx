import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';

export function SettingsPage({ title, description, onBack, children }: React.PropsWithChildren<{ title: string; description?: string; onBack: () => void }>) {
  const { colors } = useAppTheme(); const { t } = useTranslation();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.page}>
      <TouchableOpacity accessibilityRole="button" onPress={onBack} style={ui.back}><Text style={{ color: colors.primary, fontWeight: '600' }}>‹ {t('Volver', 'Back')}</Text></TouchableOpacity>
      <Text accessibilityRole="header" style={[ui.title, { color: colors.text }]}>{title}</Text>
      {!!description && <SettingsText>{description}</SettingsText>}
      <View style={{ height: 8 }} />{children}
    </ScrollView>
  </SafeAreaView>;
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
  return <TouchableOpacity accessibilityRole={selected === undefined ? 'button' : 'radio'} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={[ui.row, { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.card, opacity: disabled ? 0.5 : 1 }]}>
    <View style={{ flex: 1, gap: 5 }}><Text style={{ color: danger ? colors.danger : colors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>{!!subtitle && <SettingsText>{subtitle}</SettingsText>}</View>
    <Text style={{ color: danger ? colors.danger : colors.primary, fontSize: 22 }}>{selected ? '✓' : '›'}</Text>
  </TouchableOpacity>;
}
export function SettingsButton({ title, onPress, busy = false, disabled = false, danger = false }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; danger?: boolean }) {
  const { colors } = useAppTheme();
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={[ui.button, { backgroundColor: danger ? colors.danger : colors.primary, opacity: disabled || busy ? 0.5 : 1 }]}>
    {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{title}</Text>}
  </TouchableOpacity>;
}
export function SettingsInput({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: '600' }}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.textMuted} style={[ui.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }, props.style]} /></View>;
}
const ui = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingBottom: 36, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  back: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 24 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.7, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 14 },
  row: { minHeight: 72, padding: 18, borderWidth: 1, borderRadius: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  button: { minHeight: 52, borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
});
