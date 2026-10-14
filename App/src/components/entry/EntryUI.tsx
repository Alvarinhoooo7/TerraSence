import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, findNodeHandle, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { Text, LARGE_BODY_FACTOR, useLargeText } from '../AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';
import { enterDown } from '../../constants/motion';

/** `below`: espacio que debe quedar visible bajo el campo, sobre el teclado (p. ej. resultados de una búsqueda). */
const EntryFocus = createContext<(input: TextInput | null, below?: number) => void>(() => {});
export const useEntryFocus = () => useContext(EntryFocus);

export function useEntryMetrics() {
  const { width, height, fontScale: systemScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // La letra grande de la app se suma a la del teléfono al decidir si compactar.
  const fontScale = systemScale * (useLargeText() ? LARGE_BODY_FACTOR : 1);
  const usableHeight = height - insets.top - insets.bottom;
  const compact = usableHeight < 690 || fontScale > 1.15;
  const veryCompact = usableHeight < 570 || fontScale > 1.35;
  return { compact, veryCompact, usableHeight, width, contentMaxWidth: 520,
    artworkHeight: veryCompact ? 112 : compact ? 160 : Math.min(230, usableHeight * .3),
    spacing: veryCompact ? 12 : compact ? 18 : 24 };
}

/**
 * `align="top"` para listas y ajustes, que se leen desde arriba; la entrada
 * centra su contenido. `tabBar` cuando hay barra inferior debajo: ella ya
 * respeta el área segura inferior.
 */
export function EntryLayout({ header, children, footer, keyboardAware = false, align = 'center', tabBar = false, embedded = false }: React.PropsWithChildren<{
  header?: React.ReactNode; footer?: React.ReactNode; keyboardAware?: boolean; align?: 'center' | 'top'; tabBar?: boolean;
  /** Página dentro de un carrusel: el contenedor ya respeta el área segura. */
  embedded?: boolean;
}>) {
  const { colors } = useAppTheme();
  const metrics = useEntryMetrics();
  const scroll = useRef<ScrollView>(null);
  const focused = useRef<TextInput | null>(null);
  const focusedBelow = useRef(12);
  const revealFocus = useCallback(() => {
    const handle = focused.current && findNodeHandle(focused.current);
    if (handle) scroll.current?.scrollResponderScrollNativeHandleToKeyboard(handle, focusedBelow.current, true);
  }, []);
  const focus = useCallback((input: TextInput | null, below = 12) => {
    focused.current = input;
    focusedBelow.current = below;
    requestAnimationFrame(revealFocus);
  }, [revealFocus]);
  // Android de borde a borde no achica la ventana con el teclado: sin este relleno el
  // contenido no tiene hacia dónde desplazarse y el campo queda tapado.
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    if (!keyboardAware) return;
    const shown = Keyboard.addListener('keyboardDidShow', event => {
      if (Platform.OS === 'android') setKeyboardInset(event.endCoordinates.height);
      requestAnimationFrame(revealFocus);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardInset(0));
    return () => { shown.remove(); hidden.remove(); };
  }, [keyboardAware, revealFocus]);
  useEffect(() => { if (keyboardInset) requestAnimationFrame(revealFocus); }, [keyboardInset, revealFocus]);
  return <SafeAreaView edges={embedded ? [] : tabBar ? ['top', 'left', 'right'] : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
    <EntryFocus.Provider value={focus}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardAware && Platform.OS === 'ios' ? 'padding' : undefined}>
      {!!header && <View style={{ alignSelf: 'center', width: '100%', maxWidth: metrics.contentMaxWidth, paddingHorizontal: 24 }}>{header}</View>}
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, alignSelf: 'center', width: '100%', maxWidth: metrics.contentMaxWidth,
          paddingHorizontal: 24, paddingTop: metrics.compact ? 8 : 16, paddingBottom: (metrics.compact ? 8 : 16) + keyboardInset }}>
        <Animated.View entering={enterDown()} style={{ flexGrow: 1, justifyContent: align === 'top' ? 'flex-start' : 'center', minHeight: 0 }}>{children}</Animated.View>
      </ScrollView>
      {!!footer && <View style={{ alignSelf: 'center', width: '100%', maxWidth: metrics.contentMaxWidth, paddingHorizontal: 24, paddingBottom: 12 }}>{footer}</View>}
    </KeyboardAvoidingView>
    </EntryFocus.Provider>
  </SafeAreaView>;
}

export function EntryHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  const { colors } = useAppTheme();
  const { compact } = useEntryMetrics();
  return <View style={{ gap: compact ? 8 : 12 }}>
    {!!eyebrow && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>{eyebrow}</Text>}
    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: compact ? 32 : 38, lineHeight: compact ? 38 : 44, fontWeight: '700', letterSpacing: -1.3 }}>{title}</Text>
    {!!description && <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>{description}</Text>}
  </View>;
}

/** `danger`: acción destructiva (cerrar sesión, descartar), con borde y texto rojos. */
export function EntryButton({ label, onPress, disabled = false, busy = false, secondary = false, danger = false }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean; danger?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const outline = secondary || danger;
  const ink = danger ? colors.danger : secondary ? colors.primary : isDark ? colors.background : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); onPress(); }} style={({ pressed }) => ({ minHeight: 54, borderRadius: 16, borderWidth: 1,
      borderColor: danger ? colors.danger : outline ? colors.border : colors.primary, backgroundColor: outline ? colors.card : colors.primary,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12, opacity: disabled || busy ? .55 : pressed ? .8 : 1 })}>
    {busy ? <ActivityIndicator color={ink} /> :
      <Text style={{ color: ink, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{label}</Text>}
  </Pressable>;
}
