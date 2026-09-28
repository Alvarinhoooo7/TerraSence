// src/screens/AuthScreen.tsx
//
// Registro, inicio de sesión y recuperación de contraseña.
// Adaptado de AuthScreen.tsx del proyecto Akura.
//
// Sin sesión activa las políticas RLS de Supabase bloquean toda lectura y
// escritura, así que esta pantalla es la puerta de entrada real de la app.

import React, { useCallback, useRef, useState } from 'react';
import { BackHandler, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { AccessField } from '../components/auth/AccessField';
import { EntryLayout, EntryButton, EntryHeading } from '../components/entry/EntryUI';
import { RegistrationConsentModal } from '../components/RegistrationConsentModal';
import { RegistrationConsent } from '../utils/registrationConsent';
import { EmailCodeScreen } from './EmailCodeScreen';
import type { EmailOtpPurpose } from '../services/emailOtp';
import { isPasswordAcceptable, PASSWORD_MIN_LENGTH } from '../utils/passwordRules';
import { isEmailValid, isExistingAccountSignUp } from '../utils/authValidation';
import { createSubmissionGate, registrationConsentValid, registrationIdentityValid, registrationNameMetadata, registrationPasswordValid, transitionRegistrationStep } from '../utils/accessRegistration';

type Mode = 'signin' | 'signup' | 'reset';

const MODE_COPY: Record<Mode, { title: string; cta: string; hint: string }> = {
  signin: {
    title: 'Entrar a TerraSense',
    cta: 'Entrar',
    hint: 'Ingresa a tu cuenta para continuar con tu campo.',
  },
  signup: {
    title: 'Crear cuenta',
    cta: 'Continuar',
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
  onChangeLanguage?: () => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuthenticated, onChangeLanguage }) => {
  const { colors } = useAppTheme();

  const [mode, setMode] = useState<Mode>('signin');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>>({});
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmInput = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  // La aceptación ya dada se conserva mientras dure este registro: si la creación
  // falla por red, reintentar no obliga a releer y remarcar los términos. Las
  // casillas nunca aparecen premarcadas; el panel se monta vacío cada vez.
  const acceptedConsent = useRef<RegistrationConsent | null>(null);
  const requestGate = useRef(createSubmissionGate()).current;
  const [challenge, setChallenge] = useState<{ email: string; purpose: EmailOtpPurpose; sentAt: number } | null>(null);

  const { t } = useTranslation();
  const { preferences } = useAppStore();
  const spanishCopy = MODE_COPY[mode];
  const copy = mode === 'signin'
    ? { title: t(spanishCopy.title, 'Sign in to TerraSense'), cta: t(spanishCopy.cta, 'Sign in'), hint: t(spanishCopy.hint, 'Sign in to pick up where you left off in your field.') }
    : mode === 'signup'
      ? { title: t(spanishCopy.title, 'Create account'), cta: t(spanishCopy.cta, 'Continue'), hint: t(spanishCopy.hint, 'We will email you to confirm your account.') }
      : { title: t(spanishCopy.title, 'Reset password'), cta: t(spanishCopy.cta, 'Send code'), hint: t(spanishCopy.hint, 'We will send you a code to choose a new password.') };

  const switchMode = useCallback((next: Mode) => {
    if (requestGate.active) return;
    setShowConsent(false);
    acceptedConsent.current = null;
    setConfirmPassword('');
    setPassword('');
    setMode(next);
    setSignupStep(1);
    setFieldErrors({});
    setError(null);
  }, []);

  const submit = useCallback(async (given?: RegistrationConsent) => {
    if (requestGate.active) return;
    setError(null);
    setFieldErrors({});
    const consent = given ?? acceptedConsent.current ?? undefined;

    const mail = email.trim().toLowerCase();
    if (!isEmailValid(mail)) {
      setFieldErrors({ email: t('Escribe un correo válido.', 'Enter a valid email address.') });
      return;
    }
    if (mode === 'signin' && password.length === 0) {
      setFieldErrors({ password: t('Escribe tu contraseña.', 'Enter your password.') });
      return;
    }
    if (mode === 'signup') {
      if (fullName.trim().split(/\s+/u).length < 2) { setSignupStep(1); setFieldErrors({ name: t('Escribe tu nombre y apellido.', 'Enter your full name.') }); return; }
      if (!isPasswordAcceptable(password)) {
        setFieldErrors({ password: t(
          `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con una letra, un número y un carácter especial.`,
          `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a letter, a number and a special character.`,
        ) });
        return;
      }
      if (!registrationPasswordValid(password, confirmPassword)) {
        setFieldErrors({ confirm: t('Las contraseñas no coinciden.', 'Passwords do not match.') });
        return;
      }
      if (!registrationConsentValid(consent)) {
        Keyboard.dismiss();
        setShowConsent(true);
        return;
      }
    }

    Keyboard.dismiss();
    if (!requestGate.enter()) return;
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (e) {
          if (e.code === 'email_not_confirmed') {
            setPassword(''); setConfirmPassword('');
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
            // El trigger usa nombre y apellidos explícitos para conservar nombres compuestos.
            // Registro declarado por el cliente; user_metadata no es una auditoría inmutable.
            data: { ...registrationNameMetadata(fullName), registration_consent: consent },
          },
        });
        if (e) throw e;
        acceptedConsent.current = null;
        setShowConsent(false);
        setPassword('');
        setConfirmPassword('');
        // Supabase no falla cuando el correo ya tiene cuenta: devuelve un usuario sin
        // identidades. Sin esto, el agricultor quedaba esperando un código que nunca
        // iba a llegar. Se le deja en el inicio de sesión con el correo ya escrito.
        if (isExistingAccountSignUp(data)) {
          setMode('signin');
          setError(t('Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.',
            'An account already exists for this email. Sign in or reset your password.'));
          return;
        }
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
      requestGate.leave();
      setBusy(false);
    }
  }, [email, password, confirmPassword, fullName, mode, onAuthenticated, preferences.language, t]);

  React.useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (requestGate.active || challenge) return requestGate.active;
      if (mode === 'signup' && signupStep === 2) { setSignupStep(transitionRegistrationStep(signupStep, 'back', true)); return true; }
      if (mode !== 'signin') { switchMode('signin'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [mode, signupStep, challenge, switchMode]);

  if (challenge) return <EmailCodeScreen {...challenge} onBack={() => {
    setChallenge(null); setPassword(''); setConfirmPassword(''); setError(null);
    setMode(challenge.purpose === 'signup' ? 'signin' : 'reset');
  }} />;

  const advanceRegistration = () => {
    const errors: typeof fieldErrors = {};
    if (fullName.trim().split(/\s+/u).length < 2) errors.name = t('Escribe tu nombre y apellido.', 'Enter your full name.');
    if (!isEmailValid(email)) errors.email = t('Escribe un correo válido.', 'Enter a valid email address.');
    setFieldErrors(errors);
    if (registrationIdentityValid(fullName, email)) { Keyboard.dismiss(); setSignupStep(transitionRegistrationStep(signupStep, 'next', true)); }
  };

  const footer = <View style={styles.footer}>
    <EntryButton label={mode === 'signup' && signupStep === 1 ? t('Continuar', 'Continue') : mode === 'signup' ? acceptedConsent.current ? t('Crear cuenta', 'Create account') : t('Revisar y crear cuenta', 'Review and create account') : copy.cta}
      busy={busy} onPress={() => mode === 'signup' && signupStep === 1 ? advanceRegistration() : void submit()} />
    <Pressable accessibilityRole="button" disabled={busy}
      onPress={() => mode === 'signup' && signupStep === 2 ? setSignupStep(transitionRegistrationStep(signupStep, 'back', true)) : switchMode(mode === 'signin' ? 'signup' : 'signin')}
      style={styles.footerLink}>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{mode === 'signup' && signupStep === 2 ? t('Volver a mis datos', 'Back to my details') : mode === 'signin' ? t('Crear cuenta', 'Create account') : t('Volver a iniciar sesión', 'Back to sign in')}</Text>
    </Pressable>
  </View>;

  return <>
    <EntryLayout keyboardAware header={<View style={styles.header}>
      <Text style={[styles.wordmark, { color: colors.primary }]}>TERRA<Text style={{ color: colors.text }}>SENSE</Text></Text>
      {!!onChangeLanguage && <Pressable accessibilityRole="button" accessibilityLabel={t('Cambiar idioma', 'Change language')}
        disabled={busy} onPress={onChangeLanguage} style={styles.language}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{preferences.language.toUpperCase()} ▾</Text>
      </Pressable>}
    </View>} footer={footer}>
      <View style={styles.body}>
        <EntryHeading eyebrow={mode === 'signup' ? `${signupStep} / 2` : undefined}
          title={mode === 'signin' ? t('Entra a tu cuenta', 'Sign in') : mode === 'signup' ? signupStep === 1 ? t('Crea tu cuenta', 'Create your account') : t('Protege tu cuenta', 'Secure your account') : t('Recupera tu acceso', 'Reset your password')}
          description={mode === 'signin' ? t('Continúa con tu campo.', 'Continue with your field.') : mode === 'signup' ? signupStep === 1 ? t('Comencemos con tus datos.', 'Start with your details.') : t('Elige una contraseña segura.', 'Choose a secure password.') : t('Te enviaremos un código a tu correo.', 'We will send a code to your email.')} />
        {mode === 'signup' && signupStep === 1 && <AccessField label={t('Nombre y apellido', 'Full name')} placeholder={t('Nombre y apellido', 'Full name')}
          error={fieldErrors.name} value={fullName} onChangeText={value => { setFullName(value); acceptedConsent.current = null; setFieldErrors(e => ({ ...e, name: undefined })); }}
          autoCapitalize="words" autoComplete="name" textContentType="name" editable={!busy} returnKeyType="next" onSubmitEditing={() => emailInput.current?.focus()} />}
        {(mode !== 'signup' || signupStep === 1) && <AccessField ref={emailInput} label={t('Correo electrónico', 'Email address')} placeholder="nombre@ejemplo.cl"
          error={fieldErrors.email} value={email} onChangeText={value => { setEmail(value); acceptedConsent.current = null; setFieldErrors(e => ({ ...e, email: undefined })); }}
          keyboardType="email-address" inputMode="email" autoComplete="email" textContentType="emailAddress" editable={!busy}
          returnKeyType={mode === 'signin' ? 'next' : 'done'} onSubmitEditing={() => mode === 'signin' ? passwordInput.current?.focus() : mode === 'signup' ? advanceRegistration() : void submit()} />}
        {(mode === 'signin' || mode === 'signup' && signupStep === 2) && <AccessField ref={passwordInput} key={mode} label={t('Contraseña', 'Password')}
          error={fieldErrors.password} secret value={password} onChangeText={value => { setPassword(value); setFieldErrors(e => ({ ...e, password: undefined })); }}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'}
          editable={!busy} returnKeyType={mode === 'signin' ? 'go' : 'next'} onSubmitEditing={() => mode === 'signin' ? void submit() : confirmInput.current?.focus()} />}
        {mode === 'signin' && <Pressable accessibilityRole="button" disabled={busy} onPress={() => switchMode('reset')} style={styles.forgot}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('Olvidé mi contraseña', 'Forgot password')}</Text>
        </Pressable>}
        {mode === 'signup' && signupStep === 2 && <>
          <PasswordChecklist password={password} compact />
          <AccessField ref={confirmInput} label={t('Confirmar contraseña', 'Confirm password')} secret value={confirmPassword}
            error={fieldErrors.confirm || (confirmPassword.length > 0 && confirmPassword !== password ? t('Las contraseñas no coinciden.', 'Passwords do not match.') : undefined)}
            onChangeText={value => { setConfirmPassword(value); setFieldErrors(e => ({ ...e, confirm: undefined })); }}
            autoComplete="new-password" textContentType="newPassword" editable={!busy} returnKeyType="go" onSubmitEditing={() => void submit()} />
        </>}
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
      </View>
    </EntryLayout>
    {showConsent && <RegistrationConsentModal busy={busy} error={error}
      onCancel={() => { if (!requestGate.active) { setShowConsent(false); setError(null); } }}
      onContinue={consent => {
        acceptedConsent.current = consent;
        setShowConsent(false);
        setError(null);
        void submit(consent);
      }} />}
  </>;
};

const styles = StyleSheet.create({
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 },
  wordmark: { fontSize: 17, fontWeight: '800', letterSpacing: 2 },
  language: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  body: { width: '100%', gap: 12 },
  forgot: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center' },
  footer: { width: '100%', paddingTop: 8, gap: 2 },
  footerLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
