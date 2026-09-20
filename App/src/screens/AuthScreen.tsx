// src/screens/AuthScreen.tsx
//
// Registro, inicio de sesión y recuperación de contraseña.
// Adaptado de AuthScreen.tsx del proyecto Akura.
//
// Sin sesión activa las políticas RLS de Supabase bloquean toda lectura y
// escritura, así que esta pantalla es la puerta de entrada real de la app.

import React, { useCallback, useRef, useState } from 'react';
import { BackHandler, Keyboard, Pressable, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { supabase } from '../services/supabase';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { RegistrationConsentModal } from '../components/RegistrationConsentModal';
import { REGISTRATION_LEGAL_VERSION, RegistrationConsent } from '../utils/registrationConsent';
import { EmailCodeScreen } from './EmailCodeScreen';
import type { EmailOtpPurpose } from '../services/emailOtp';
import { isPasswordAcceptable, PASSWORD_MIN_LENGTH } from '../utils/passwordRules';
import { isEmailValid } from '../utils/authValidation';
import { AuthLayout, AuthHeading, AuthField, AuthButton, AuthMessage, SoilArtwork, authStyles } from '../components/auth/AuthUI';

type Mode = 'signin' | 'signup' | 'reset';

const MODE_COPY: Record<Mode, { title: string; cta: string; hint: string }> = {
  signin: {
    title: 'Entrar a TerraSense',
    cta: 'Entrar',
    hint: 'Ingresa a tu cuenta para continuar con tu campo.',
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
    return en ? `Use at least ${PASSWORD_MIN_LENGTH} characters, a letter, a number and a special character.` : `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres, una letra, un número y un carácter especial.`;
  }
  if (m.includes('network') || m.includes('fetch')) {
    return en ? 'No connection. Check your internet and try again.' : 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
  }
  if (/rate|too many|seconds|429/.test(m)) return en ? 'Please wait before trying again.' : 'Espera un momento antes de volver a intentarlo.';
  return en ? 'We could not complete the request. Please try again.' : 'No pudimos completar la solicitud. Inténtalo otra vez.';
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
  const [showConsent, setShowConsent] = useState(false);
  const requestInFlight = useRef(false);
  const [challenge, setChallenge] = useState<{ email: string; purpose: EmailOtpPurpose; sentAt: number } | null>(null);

  const { t } = useTranslation();
  const { preferences, setPreferences } = useAppStore();
  const spanishCopy = MODE_COPY[mode];
  const copy = mode === 'signin'
    ? { title: t(spanishCopy.title, 'Sign in to TerraSense'), cta: t(spanishCopy.cta, 'Sign in'), hint: t(spanishCopy.hint, 'Sign in to pick up where you left off in your field.') }
    : mode === 'signup'
      ? { title: t(spanishCopy.title, 'Create account'), cta: t(spanishCopy.cta, 'Create account'), hint: t(spanishCopy.hint, 'We will email you to confirm your account.') }
      : { title: t(spanishCopy.title, 'Reset password'), cta: t(spanishCopy.cta, 'Send code'), hint: t(spanishCopy.hint, 'We will send you a code to choose a new password.') };

  const switchMode = useCallback((next: Mode) => {
    if (requestInFlight.current) return;
    setShowConsent(false);
    setConfirmPassword('');
    setPassword('');
    setMode(next);
    setError(null);
  }, []);

  const submit = useCallback(async (consent?: RegistrationConsent) => {
    if (requestInFlight.current) return;
    setError(null);

    const mail = email.trim().toLowerCase();
    if (!isEmailValid(mail)) {
      setError(t('Escribe un correo válido.', 'Enter a valid email address.'));
      return;
    }
    if (mode === 'signin' && password.length === 0) {
      setError(t('Escribe tu contraseña.', 'Enter your password.'));
      return;
    }
    if (mode === 'signup') {
      if (!fullName.trim()) { setError(t('Escribe tu nombre.', 'Enter your name.')); return; }
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

    Keyboard.dismiss();
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

  React.useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (requestInFlight.current || challenge) return !!requestInFlight.current;
      if (mode !== 'signin') { switchMode('signin'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [mode, challenge, switchMode]);

  if (challenge) return <EmailCodeScreen {...challenge} onBack={() => {
    setChallenge(null); setPassword(''); setConfirmPassword(''); setError(null);
    setMode(challenge.purpose === 'signup' ? 'signin' : 'reset');
  }} />;

  return <>
    <AuthLayout toolbar={<View style={{ flexDirection: 'row' }}>
      {(['es', 'en'] as const).map(language => <Pressable key={language} disabled={busy}
        accessibilityRole="button" accessibilityLabel={language === 'es' ? 'Español' : 'English'}
        accessibilityState={{ selected: preferences.language === language, disabled: busy }}
        onPress={() => setPreferences({ ...preferences, language })}
        style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1,
          borderBottomWidth: preferences.language === language ? 2 : 0, borderColor: colors.primary })}>
        <Text style={[authStyles.label, { color: preferences.language === language ? colors.primary : colors.textSecondary }]}>{language.toUpperCase()}</Text>
      </Pressable>)}
    </View>}>
      {mode === 'signin' && <SoilArtwork compact />}
      <AuthHeading eyebrow={mode === 'signin' ? t('TU CAMPO, MÁS CLARO', 'A CLEARER VIEW OF YOUR FIELD') : mode === 'signup' ? t('COMIENZA AQUÍ', 'START HERE') : t('RECUPERA EL ACCESO', 'RESTORE ACCESS')}
        title={mode === 'signin' ? t('Qué bueno verte.', 'Welcome back.') : copy.title} description={copy.hint} />
      <Animated.View layout={LinearTransition.springify().damping(14)} style={authStyles.form}>
        {mode === 'signup' && <AuthField label={t('Tu nombre', 'Your name')} placeholder={t('Nombre y apellido', 'Full name')}
          value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" textContentType="name" editable={!busy} />}
        <AuthField label={t('Correo electrónico', 'Email address')} placeholder="nombre@ejemplo.cl" value={email}
          onChangeText={setEmail} keyboardType="email-address" inputMode="email" autoComplete="email" textContentType="emailAddress" editable={!busy} />
        {mode !== 'reset' && <AuthField key={mode} label={t('Contraseña', 'Password')} secret value={password} onChangeText={setPassword}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'}
          editable={!busy} returnKeyType="go" onSubmitEditing={() => { if (mode === 'signin') void submit(); }} />}
        {mode === 'signin' && <Pressable accessibilityRole="button" disabled={busy} onPress={() => switchMode('reset')} style={[authStyles.link, { alignSelf: 'flex-end', marginTop: -12 }]}>
          <Text style={[authStyles.label, { color: colors.primary }]}>{t('Olvidé mi contraseña', 'Forgot my password')}</Text>
        </Pressable>}
        {mode === 'signup' && <>
          <PasswordChecklist password={password} />
          <AuthField label={t('Confirmar contraseña', 'Confirm password')} secret value={confirmPassword} onChangeText={setConfirmPassword}
            autoComplete="new-password" textContentType="newPassword" editable={!busy} />
          {confirmPassword.length > 0 && confirmPassword !== password && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{t('Las contraseñas no coinciden.', 'Passwords do not match.')}</Text>}
        </>}
        {error && <AuthMessage error>{error}</AuthMessage>}
        <AuthButton label={copy.cta} busy={busy} onPress={() => { void submit(); }} />
      </Animated.View>
      <Animated.View layout={LinearTransition.springify().damping(14)} style={{ gap: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 24 }}>
        <Text style={[authStyles.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          {mode === 'signin' ? t('¿Primera vez en TerraSense?', 'New to TerraSense?') : t('¿Ya tienes una cuenta?', 'Already have an account?')}
        </Text>
        <AuthButton secondary disabled={busy} label={mode === 'signin' ? t('Crear mi cuenta', 'Create my account') : t('Volver a iniciar sesión', 'Back to sign in')}
          onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} />
      </Animated.View>
    </AuthLayout>
    {showConsent && <RegistrationConsentModal busy={busy} error={error}
      onCancel={() => { if (!requestInFlight.current) { setShowConsent(false); setError(null); } }}
      onContinue={consent => { void submit(consent); }} />}
  </>;
};
