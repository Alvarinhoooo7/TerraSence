// src/screens/AuthScreen.tsx
//
// Registro, inicio de sesión y recuperación de contraseña.
// Adaptado de AuthScreen.tsx del proyecto Akura.
//
// Sin sesión activa las políticas RLS de Supabase bloquean toda lectura y
// escritura, así que esta pantalla es la puerta de entrada real de la app.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { ScreenGuide } from '../components/ScreenGuide';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';

type Mode = 'signin' | 'signup' | 'reset';

const MODE_COPY: Record<Mode, { title: string; cta: string; hint: string }> = {
  signin: {
    title: 'Entrar a TerraSense',
    cta: 'Entrar',
    hint: 'Usa el correo con el que registraste tu equipo.',
  },
  signup: {
    title: 'Crear cuenta',
    cta: 'Crear cuenta',
    hint: 'Te enviaremos un correo para confirmar tu cuenta.',
  },
  reset: {
    title: 'Recuperar contraseña',
    cta: 'Enviar enlace',
    hint: 'Te enviaremos un enlace para elegir una contraseña nueva.',
  },
};

/** Mensajes de Supabase traducidos a algo accionable para el agricultor. */
const humanizeError = (message: string, en: boolean): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return en ? 'Email or password does not match. Check them and try again.' : 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.';
  }
  if (m.includes('email not confirmed')) {
    return en ? 'Your account is not confirmed yet. Find the confirmation email we sent you.' : 'Tu cuenta aún no está confirmada. Busca el correo de confirmación que te enviamos.';
  }
  if (m.includes('user already registered')) {
    return en ? 'An account already exists for this email. Sign in or reset your password.' : 'Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.';
  }
  if (m.includes('password should be at least')) {
    return en ? 'Password must be at least 6 characters long.' : 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return en ? 'No connection. Connect to the internet for your first sign-in.' : 'Sin conexión. Conéctate a internet para entrar la primera vez.';
  }
  return message;
};

interface Props {
  onAuthenticated: () => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const { colors } = useAppTheme();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { t } = useTranslation();
  const { preferences, setPreferences } = useAppStore();
  const spanishCopy = MODE_COPY[mode];
  const copy = mode === 'signin'
    ? { title: t(spanishCopy.title, 'Sign in to TerraSense'), cta: t(spanishCopy.cta, 'Sign in'), hint: t(spanishCopy.hint, 'Use the email associated with your device.') }
    : mode === 'signup'
      ? { title: t(spanishCopy.title, 'Create account'), cta: t(spanishCopy.cta, 'Create account'), hint: t(spanishCopy.hint, 'We will email you to confirm your account.') }
      : { title: t(spanishCopy.title, 'Reset password'), cta: t(spanishCopy.cta, 'Send link'), hint: t(spanishCopy.hint, 'We will send you a link to choose a new password.') };

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setNotice(null);

    const mail = email.trim().toLowerCase();
    if (!mail.includes('@')) {
      setError(t('Escribe un correo válido.', 'Enter a valid email address.'));
      return;
    }
    if (mode !== 'reset' && password.length < 6) {
      setError(t('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters long.'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (e) throw e;
        onAuthenticated();
        return;
      }

      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({
          email: mail,
          password,
          // El trigger handle_new_user copia full_name a public.profiles.
          options: { data: { full_name: fullName.trim() } },
        });
        if (e) throw e;
        setNotice(
          t('Cuenta creada. Revisa tu correo y confirma la cuenta antes de entrar.', 'Account created. Check your email and confirm it before signing in.'),
        );
        setMode('signin');
        return;
      }

      const { error: e } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: 'terrasense://reset-password',
      });
      if (e) throw e;
      setNotice(t('Te enviamos un enlace para elegir una contraseña nueva.', 'We sent you a link to choose a new password.'));
      setMode('signin');
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err), preferences.language === 'en'));
    } finally {
      setBusy(false);
    }
  }, [email, password, fullName, mode, onAuthenticated, preferences.language, t]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.languageRow}>
            {(['es', 'en'] as const).map((language) => (
              <TouchableOpacity
                key={language}
                onPress={() => setPreferences({ ...preferences, language })}
                style={[
                  styles.languageButton,
                  {
                    backgroundColor: preferences.language === language ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: preferences.language === language ? '#FFFFFF' : colors.textSecondary, ...Typography.badge }}>
                  {language.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.logo}>🌱</Text>
          <Text style={[styles.brand, { color: colors.primary }]}>TerraSense</Text>
          <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{copy.hint}</Text>

          {mode === 'signup' && (
            <TextInput
              style={inputStyle}
              placeholder={t('Tu nombre', 'Your name')}
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              accessibilityLabel={t('Nombre completo', 'Full name')}
            />
          )}

          <TextInput
            style={inputStyle}
            placeholder={t('Correo', 'Email')}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
            accessibilityLabel={t('Correo electrónico', 'Email address')}
          />

          {mode !== 'reset' && (
            <TextInput
              style={inputStyle}
              placeholder={t('Contraseña', 'Password')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel={t('Contraseña', 'Password')}
            />
          )}

          {error && (
            <View style={[styles.banner, { backgroundColor: colors.danger }]}>
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          )}
          {notice && (
            <View style={[styles.banner, { backgroundColor: colors.success }]}>
              <Text style={styles.bannerText}>{notice}</Text>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={submit}
            disabled={busy}
            style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>{copy.cta}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.links}>
            {mode !== 'signin' && (
              <TouchableOpacity onPress={() => switchMode('signin')} style={styles.link}>
                <Text style={[styles.linkText, { color: colors.primary }]}>{t('Ya tengo cuenta', 'I already have an account')}</Text>
              </TouchableOpacity>
            )}
            {mode !== 'signup' && (
              <TouchableOpacity onPress={() => switchMode('signup')} style={styles.link}>
                <Text style={[styles.linkText, { color: colors.primary }]}>{t('Crear cuenta', 'Create account')}</Text>
              </TouchableOpacity>
            )}
            {mode !== 'reset' && (
              <TouchableOpacity onPress={() => switchMode('reset')} style={styles.link}>
                <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                  {t('Olvidé mi contraseña', 'Forgot my password')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ScreenGuide guideId="auth" autoOpen={false} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.sm },
  languageRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.xs },
  languageButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  logo: { fontSize: 48, textAlign: 'center' },
  brand: { ...Typography.titleLarge, textAlign: 'center', marginBottom: Spacing.lg },
  title: { ...Typography.titleLarge, marginBottom: Spacing.xs },
  hint: { ...Typography.caption, marginBottom: Spacing.md },
  input: {
    height: 54,
    borderRadius: Spacing.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyRegular,
  },
  banner: {
    borderRadius: Spacing.borderRadius,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  bannerText: { ...Typography.caption, color: '#FFFFFF' },
  cta: {
    height: 56,
    borderRadius: Spacing.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  ctaText: { ...Typography.button, color: '#FFFFFF', fontSize: 17 },
  links: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  link: { minHeight: Spacing.touchTarget, justifyContent: 'center' },
  linkText: { ...Typography.bodyBold },
});
