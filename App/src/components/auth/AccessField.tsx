import React, { forwardRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useEntryFocus } from '../entry/EntryUI';

type Props = TextInputProps & { label: string; error?: string; secret?: boolean };

export const AccessField = forwardRef<TextInput, Props>(function AccessField({ label, error, secret, ...props }, ref) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  const revealFocus = useEntryFocus();
  return <View style={styles.group}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <View style={[styles.wrap, { borderColor: error ? colors.danger : focused ? colors.primary : colors.border, backgroundColor: colors.card }]}>
      <TextInput ref={node => { input.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }} {...props} accessibilityLabel={label} accessibilityHint={error} placeholderTextColor={colors.textSecondary}
        autoCorrect={props.autoCorrect ?? false} autoCapitalize={props.autoCapitalize ?? 'none'}
        secureTextEntry={secret && !visible} onFocus={event => { setFocused(true); revealFocus(input.current); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); revealFocus(null); props.onBlur?.(event); }}
        style={[styles.input, { color: colors.text }, props.style]} />
      {secret && <Pressable accessibilityRole="button" accessibilityLabel={visible ? t('Ocultar contraseña', 'Hide password') : t('Mostrar contraseña', 'Show password')}
        disabled={props.editable === false} onPress={() => setVisible(value => !value)} style={styles.reveal}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{visible ? t('Ocultar', 'Hide') : t('Ver', 'Show')}</Text>
      </Pressable>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text>}
  </View>;
});

const styles = StyleSheet.create({
  group: { gap: 5 },
  label: { fontSize: 14, fontWeight: '600' },
  wrap: { minHeight: 50, borderWidth: 1.5, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  reveal: { minWidth: 54, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13, lineHeight: 18 },
});
