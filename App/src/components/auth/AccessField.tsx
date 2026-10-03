import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useEntryFocus } from '../entry/EntryUI';
import { maskSecret, revealedIndex, SECRET_REVEAL_MS } from '../../utils/secretReveal';

type Props = TextInputProps & { label: string; error?: string; secret?: boolean };

// Monoespaciada para que el texto enmascarado ocupe lo mismo que el real y el
// cursor del campo quede sobre el carácter que corresponde.
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

export const AccessField = forwardRef<TextInput, Props>(function AccessField({ label, error, secret, ...props }, ref) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(-1);
  const lastValue = useRef(props.value ?? '');
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearReveal = () => { if (revealTimer.current) clearTimeout(revealTimer.current); revealTimer.current = null; setReveal(-1); };
  const input = useRef<TextInput>(null);
  const revealFocus = useEntryFocus();

  // Una contraseña nueva se enmascara a mano, con el mismo retardo que el código
  // por correo: el ocultamiento nativo es demasiado rápido para comprobar lo escrito.
  const newPassword = props.autoComplete === 'new-password' || props.textContentType === 'newPassword';
  const masked = !!secret && !visible && newPassword;
  const value = props.value ?? '';

  useEffect(() => {
    if (lastValue.current !== value) { lastValue.current = value; clearReveal(); }
    if (!masked) clearReveal();
  }, [value, masked]);
  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

  return <View style={styles.group}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <View style={[styles.wrap, { borderColor: error ? colors.danger : focused ? colors.primary : colors.border, backgroundColor: colors.card }]}>
      <View style={styles.field}>
        <TextInput ref={node => { input.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }} {...props} accessibilityLabel={label} accessibilityHint={error} placeholderTextColor={colors.textSecondary}
          autoCorrect={props.autoCorrect ?? false} autoCapitalize={props.autoCapitalize ?? 'none'}
          secureTextEntry={secret && !visible && !masked}
          // Sin ocultamiento nativo, el teclado de Android no debe aprender ni sugerir la clave.
          keyboardType={masked && Platform.OS === 'android' ? 'visible-password' : props.keyboardType}
          spellCheck={masked ? false : props.spellCheck} contextMenuHidden={masked || props.contextMenuHidden}
          onChangeText={text => { clearReveal();
            if (masked && focused) {
              const index = revealedIndex(lastValue.current, text);
              setReveal(index);
              if (index >= 0) revealTimer.current = setTimeout(() => { revealTimer.current = null; setReveal(-1); }, SECRET_REVEAL_MS);
            }
            lastValue.current = text;
            props.onChangeText?.(text); }}
          onFocus={event => { setFocused(true); revealFocus(input.current); props.onFocus?.(event); }}
          onBlur={event => { setFocused(false); clearReveal(); revealFocus(null); props.onBlur?.(event); }}
          selectionColor={colors.primary}
          style={[styles.input, { color: masked && value ? 'transparent' : colors.text }, masked && styles.mono, props.style]} />
        {masked && !!value && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.overlay}>
          <Text numberOfLines={1} ellipsizeMode="head" style={[styles.overlayText, styles.mono, { color: colors.text }]}>
            {maskSecret(value, reveal)}
          </Text>
        </View>}
      </View>
      {secret && <Pressable accessibilityRole="button" accessibilityLabel={visible ? t('Ocultar contraseña', 'Hide password') : t('Mostrar contraseña', 'Show password')}
        disabled={props.editable === false} onPress={() => { clearReveal(); setVisible(current => !current); }} style={styles.reveal}>
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
  field: { flex: 1, minWidth: 0, justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  mono: { fontFamily: MONO },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: 14 },
  overlayText: { fontSize: 16 },
  reveal: { minWidth: 54, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13, lineHeight: 18 },
});
