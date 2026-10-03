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
          // Campo de contraseña también con la máscara a mano: así el teclado no
          // muestra lo escrito en su barra de sugerencias ni lo aprende. Lo que
          // se ve es la máscara de encima; el campo real queda invisible.
          secureTextEntry={secret && !visible}
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
          // Enmascarado a mano: el campo real queda invisible y encima se dibuja
          // la máscara. Un color «transparent» no basta: Android lo ignora en
          // algunos teclados y se veía el texto real bajo los asteriscos. Es el
          // mismo método del código por correo (EmailCodeScreen).
          placeholder={masked ? undefined : props.placeholder}
          style={[styles.input, { color: colors.text }, masked && styles.mono, props.style, masked && styles.hidden]} />
        {masked && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.overlay}>
          {value ? <Text numberOfLines={1} ellipsizeMode="head" style={[styles.overlayText, styles.mono, { color: colors.text }]}>
            {maskSecret(value, reveal)}
          </Text> : !!props.placeholder && !focused && <Text numberOfLines={1} style={[styles.overlayText, { color: colors.textSecondary }]}>{props.placeholder}</Text>}
          {focused && <View style={[styles.caret, { backgroundColor: colors.primary }]} />}
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
  hidden: { opacity: 0 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  overlayText: { fontSize: 16, flexShrink: 1 },
  caret: { width: 2, height: 20, marginLeft: 1, borderRadius: 1 },
  reveal: { minWidth: 54, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13, lineHeight: 18 },
});
