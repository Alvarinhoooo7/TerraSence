// src/screens/AuthScreen.tsx
//
// Registro, inicio de sesión y recuperación de contraseña.
// Adaptado de AuthScreen.tsx del proyecto Akura.
//
// Sin sesión activa las políticas RLS de Supabase bloquean toda lectura y
// escritura, así que esta pantalla es la puerta de entrada real de la app.

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { FadeIn } from '../components/FadeIn';
import { RegistrationConsentModal } from '../components/RegistrationConsentModal';
import { REGISTRATION_LEGAL_VERSION, RegistrationConsent } from '../utils/registrationConsent';
import { EmailCodeScreen } from './EmailCodeScreen';
import type { EmailOtpPurpose } from '../services/emailOtp';
import { isPasswordAcceptable, PASSWORD_MIN_LENGTH } from '../utils/passwordRules';

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
    cta: 'Enviar código',
    hint: 'Te enviaremos un código para elegir una contraseña nueva.',
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const requestInFlight = useRef(false);
  const [challenge, setChallenge] = useState<{ email: string; purpose: EmailOtpPurpose; sentAt: number } | null>(null);

  const { t } = useTranslation();
  const { preferences, setPreferences } = useAppStore();
  const spanishCopy = MODE_COPY[mode];
  const copy = mode === 'signin'
    ? { title: t(spanishCopy.title, 'Sign in to TerraSense'), cta: t(spanishCopy.cta, 'Sign in'), hint: t(spanishCopy.hint, 'Use the email associated with your device.') }
    : mode === 'signup'
      ? { title: t(spanishCopy.title, 'Create account'), cta: t(spanishCopy.cta, 'Create account'), hint: t(spanishCopy.hint, 'We will email you to confirm your account.') }
      : { title: t(spanishCopy.title, 'Reset password'), cta: t(spanishCopy.cta, 'Send code'), hint: t(spanishCopy.hint, 'We will send you a code to choose a new password.') };

  const switchMode = useCallback((next: Mode) => {
    if (requestInFlight.current) return;
    setShowConsent(false);
    setConfirmPassword('');
    setMode(next);
    setError(null);
    setNotice(null);
  }, []);

  const submit = useCallback(async (consent?: RegistrationConsent) => {
    if (requestInFlight.current) return;
    setError(null);
    setNotice(null);

    const mail = email.trim().toLowerCase();
    if (!mail.includes('@')) {
      setError(t('Escribe un correo válido.', 'Enter a valid email address.'));
      return;
    }
    if (mode === 'signin' && password.length === 0) {
      setError(t('Escribe tu contraseña.', 'Enter your password.'));
      return;
    }
    if (mode === 'signup') {
      if (!isPasswordAcceptable(password)) {
        setError(t(
          `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con una letra, un número y un carácter especial.`,
          `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a letter, a number and a special character.`,
        ));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('Las contraseñas no coinciden.', 'Passwords do not match.'));
        return;
      }
      if (!consent?.terms_accepted || !consent.privacy_accepted ||
          consent.terms_version !== REGISTRATION_LEGAL_VERSION ||
          consent.privacy_version !== REGISTRATION_LEGAL_VERSION) {
        Keyboard.dismiss();
        setShowConsent(true);
        return;
      }
    }

    requestInFlight.current = true;
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (e) {
          if (e.code === 'email_not_confirmed') {
            setChallenge({ email: mail, purpose: 'signup', sentAt: 0 });
            return;
          }
          throw e;
        }
        onAuthenticated();
        return;
      }

      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({
          email: mail,
          password,
          options: {
            // El trigger handle_new_user copia full_name a public.profiles.
            // Registro declarado por el cliente; user_metadata no es una auditoría inmutable.
            data: { full_name: fullName.trim(), registration_consent: consent },
          },
        });
        if (e) throw e;
        setShowConsent(false);
        setPassword('');
        setConfirmPassword('');
        if (data.session) onAuthenticated();
        else setChallenge({ email: mail, purpose: 'signup', sentAt: Date.now() });
        return;
      }

      const { error: e } = await supabase.auth.resetPasswordForEmail(mail);
      if (e) throw e;
      setChallenge({ email: mail, purpose: 'recovery', sentAt: Date.now() });
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err), preferences.language === 'en'));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }, [email, password, confirmPassword, fullName, mode, onAuthenticated, preferences.language, t]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];

  if (challenge) return <EmailCodeScreen {...challenge} onBack={() => {
    setChallenge(null); setPassword(''); setConfirmPassword(''); setError(null);
    setMode(challenge.purpose === 'signup' ? 'signin' : 'reset');
  }} />;

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
          <FadeIn style={{ gap: Spacing.sm }}>
            <Text style={styles.logo}>🌱</Text>
            <Text style={[styles.brand, { color: colors.primary }]}>TerraSense</Text>
            <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{copy.hint}</Text>
          </FadeIn>

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
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              accessibilityLabel={t('Contraseña', 'Password')}
            />
          )}

          {mode === 'signup' && (
            <>
              <TextInput
                style={[
                  ...inputStyle,
                  // Sólo se marca en rojo cuando ya hay algo escrito y no cuadra:
                  // avisar mientras se teclea la primera letra sería ruido.
                  confirmPassword.length > 0 && confirmPassword !== password
                    ? { borderColor: colors.danger }
                    : null,
                ]}
                placeholder={t('Repite la contraseña', 'Repeat password')}
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                textContentType="newPassword"
                accessibilityLabel={t('Repite la contraseña', 'Repeat password')}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <Text style={[styles.mismatch, { color: colors.danger }]}>
                  {t('Las contraseñas no coinciden.', 'Passwords do not match.')}
                </Text>
              )}
              <PasswordChecklist password={password} />
            </>
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
            onPress={() => { void submit(); }}
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
      {showConsent && (
        <RegistrationConsentModal
          busy={busy}
          error={error}
          onCancel={() => { if (!requestInFlight.current) { setShowConsent(false); setError(null); } }}
          onContinue={consent => { void submit(consent); }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mismatch: { ...Typography.caption, width: '100%', marginTop: -Spacing.xs, marginBottom: Spacing.sm },
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
