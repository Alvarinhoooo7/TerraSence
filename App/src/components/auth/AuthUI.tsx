import { BrandLogo } from '../BrandLogo';
import { GuidePressable as Pressable, GuideScrollView as ScrollView, GuideInput as TextInput } from '../guide/GuideControls';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View, type TextInputProps } from 'react-native';
import { Text } from '../AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { enterDown, motionTiming } from '../../constants/motion';

/** Componentes exclusivos del acceso. No cambian los tokens de otras pantallas. */
export function AuthLayout({ children, toolbar, brand = true, onBrandPress }: React.PropsWithChildren<{ toolbar?: React.ReactNode; brand?: boolean; onBrandPress?: () => void }>) {
  const { colors } = useAppTheme();
  // `brand={false}` en la verificación del código: sin la marca el texto sube y la
  // pantalla queda en lo único que importa ahí, que son los seis dígitos.
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={authStyles.layout}>
        {(brand || toolbar) && <View style={authStyles.top}>
          {brand ? (onBrandPress ? <Pressable guide={false} onPress={onBrandPress} accessibilityRole="button" accessibilityLabel="TerraSense" style={{ minHeight: 48, justifyContent: 'center' }}><BrandLogo width={172} /></Pressable> : <BrandLogo width={172} />) : <View />}
          {toolbar}
        </View>}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function AuthHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const { colors } = useAppTheme();
  return <Animated.View entering={enterDown()} style={authStyles.heading}>
    <Text style={[authStyles.eyebrow, authStyles.centered, { color: colors.primary }]}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={[authStyles.title, authStyles.centered, { color: colors.text }]}>{title}</Text>
    <Text style={[authStyles.body, authStyles.centered, { color: colors.textSecondary }]}>{description}</Text>
  </Animated.View>;
}

export function AuthField({ label, secret = false, ...props }: TextInputProps & { label: string; secret?: boolean }) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const focusAnim = useSharedValue(0);
  useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: 200, easing: Easing.out(Easing.ease) });
  }, [focused]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(focusAnim.value, [0, 1], [colors.border, colors.primary]),
      shadowOpacity: interpolateColor(focusAnim.value, [0, 1], [0, isDark ? 0.3 : 0.1]),
      shadowRadius: interpolate(focusAnim.value, [0, 1], [0, 8]),
      shadowOffset: { width: 0, height: interpolate(focusAnim.value, [0, 1], [0, 4]) },
      elevation: interpolate(focusAnim.value, [0, 1], [0, 4]),
    };
  });

  return <Animated.View entering={enterDown(100)} style={authStyles.field}>
    <Text style={[authStyles.label, { color: colors.text }]}>{label}</Text>
    <Animated.View style={[authStyles.inputWrap, { backgroundColor: colors.card, opacity: props.editable === false ? 0.65 : 1 }, animatedBorderStyle]}>
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.textSecondary}
        secureTextEntry={secret && !visible} autoCorrect={props.autoCorrect ?? false} autoCapitalize={props.autoCapitalize ?? 'none'}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        style={[authStyles.input, { color: colors.text }, props.style]} />
      {secret && <Pressable accessibilityRole="button" accessibilityLabel={visible ? t('Ocultar contraseña', 'Hide password') : t('Mostrar contraseña', 'Show password')}
        accessibilityState={{ disabled: props.editable === false }} disabled={props.editable === false} onPress={() => { Haptics.selectionAsync().catch(() => {}); setVisible(value => !value); }}
        style={({ pressed }) => [authStyles.reveal, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[authStyles.label, { color: colors.primary }]}>{visible ? t('Ocultar', 'Hide') : t('Ver', 'Show')}</Text>
      </Pressable>}
    </Animated.View>
  </Animated.View>;
}

export function AuthButton({ label, hint, guide, guideTitle, onPress, busy = false, disabled = false, secondary = false }: {
  label: string; hint?: string; guide?: string; guideTitle?: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const ink = secondary ? colors.primary : isDark ? colors.background : '#FFFFFF';
  
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => { scale.value = motionTiming(0.97); };
  const handlePressOut = () => { scale.value = motionTiming(1); };
  const handlePress = () => {
    if (!disabled && !busy) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    }
  };

  return <Animated.View style={animatedStyle}>
    <Pressable guide={guide} guideTitle={guideTitle} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy} onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}
      style={({ pressed }) => [authStyles.button, { backgroundColor: secondary ? colors.card : colors.primary,
        borderColor: secondary ? colors.border : colors.primary, opacity: disabled || busy ? 0.55 : 1 },
        !secondary && { shadowColor: colors.primary, shadowOpacity: isDark ? 0.4 : 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }
      ]}>
      {busy ? <ActivityIndicator color={ink} /> : <Text style={[authStyles.buttonText, { color: ink }]}>{label}</Text>}
    </Pressable>
  </Animated.View>;
}

export function AuthMessage({ children, error = false }: React.PropsWithChildren<{ error?: boolean }>) {
  const { colors } = useAppTheme();
  return <Animated.View entering={enterDown()} style={[authStyles.message, { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.card }]}>
    <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[authStyles.body, { color: error ? colors.danger : colors.textSecondary }]}>{children}</Text>
  </Animated.View>;
}

/** Ilustración vectorial local: estratos del suelo, sonda y puntos de lectura. */
export function SoilArtwork({ variant = 0, compact = false }: { variant?: number; compact?: boolean }) {
  const { colors } = useAppTheme();
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatAnim.value, [0, 1], [0, -6]) }]
  }));

  return <Animated.View entering={enterDown()} style={animatedStyle}>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height: compact ? 120 : 248, backgroundColor: colors.primaryDark, borderRadius: 24, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 248" preserveAspectRatio="xMidYMid slice">
        <Circle cx="286" cy="53" r="94" fill="none" stroke="#42614E" strokeWidth="0.8" />
        <Circle cx="286" cy="53" r="65" fill="none" stroke="#42614E" strokeWidth="0.8" />
        <Path d="M-20 161Q70 113 181 159T385 140V260H-20Z" fill="#254734" />
        <Path d="M-20 191Q75 144 180 187T385 170V260H-20Z" fill="#42614E" />
        <Path d="M-20 222Q85 175 191 217T385 207V260H-20Z" fill="#8A6A3B" opacity="0.6" />
        {variant === 0 ? <>
          <Path d="M175 175V88M175 122C145 128 126 109 128 83 158 83 177 93 175 122ZM175 106C178 78 199 61 226 65 224 92 209 108 175 106Z" fill="#C5E8AF" stroke="#C5E8AF" strokeWidth="3" />
          <Path d="M175 172 154 199M175 172 195 202M175 181V219" stroke="#C5E8AF" strokeWidth="2" opacity="0.6" />
        </> : variant === 1 ? <>
          <Rect x="157" y="46" width="46" height="95" rx="12" fill="#C5E8AF" />
          <Rect x="167" y="61" width="26" height="31" rx="5" fill="#1F5B3F" />
          <Path d="M174 143V205M186 143V205M139 67Q118 92 139 116M221 67Q242 92 221 116" fill="none" stroke="#C5E8AF" strokeWidth="3" strokeLinecap="round" />
          <Circle cx="180" cy="115" r="4" fill="#1F5B3F" />
        </> : <>
          <Path d="M75 158 144 116 207 136 285 66" stroke="#C5E8AF" strokeWidth="3" fill="none" />
          {[{ x: 75, y: 158 }, { x: 144, y: 116 }, { x: 207, y: 136 }, { x: 285, y: 66 }].map(({ x, y }) => <Circle key={x} cx={x} cy={y} r="7" fill="#C5E8AF" stroke="#12281F" strokeWidth="3" />)}
        </>}
      </Svg>
    </View>
  </Animated.View>;
}

export const authStyles = StyleSheet.create({
  layout: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 24 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, gap: 8, flexWrap: "wrap", paddingRight: 44 },
  heading: { gap: 12 },
  centered: { textAlign: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1.2 },
  body: { fontSize: 16, lineHeight: 24 },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  inputWrap: { borderWidth: 1.5, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000' },
  input: { flex: 1, minWidth: 0, minHeight: 56, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  reveal: { minWidth: 56, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  button: { minHeight: 56, borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  buttonText: { fontSize: 16, lineHeight: 22, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  message: { borderLeftWidth: 3, borderRadius: 12, padding: 16 },
  link: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
});
