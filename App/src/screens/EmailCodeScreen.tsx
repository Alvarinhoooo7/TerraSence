import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { supabase } from '../services/supabase';
import { EmailOtpPurpose, isEmailCodeValid, normalizeEmailCode, OTP_RESEND_SECONDS, resendEmailCode, resendSecondsRemaining, verifyEmailCode } from '../services/emailOtp';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AuthLayout, AuthHeading, AuthField, AuthButton, AuthMessage, authStyles } from '../components/auth/AuthUI';
import { AppIcon } from '../components/AppIcon';

interface Props { email: string; purpose: EmailOtpPurpose; sentAt: number; onBack: () => void }

export function EmailCodeScreen({ email, purpose, sentAt, onBack }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [availableAt, setAvailableAt] = useState(sentAt + OTP_RESEND_SECONDS * 1000);
  const [now, setNow] = useState(Date.now());
  const remaining = resendSecondsRemaining(availableAt, now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!locked.current) onBack(); return true; });
    return () => listener.remove();
  }, [onBack]);

  const run = async (resend: boolean) => {
    if (locked.current || (resend && resendSecondsRemaining(availableAt) > 0)) return;
    if (!resend && !isEmailCodeValid(code)) return;
    locked.current = true;
    setBusy(true); setError(null); setNotice(null);
    try {
      if (resend) {
        setAvailableAt(Date.now() + OTP_RESEND_SECONDS * 1000);
        await resendEmailCode(supabase.auth, email, purpose);
        setCode('');
        setNotice(t('Si corresponde, recibirás un nuevo código. Revisa también spam.', 'If applicable, you will receive a new code. Also check spam.'));
      } else {
        // Supabase emite SIGNED_IN o PASSWORD_RECOVERY; App decide la pantalla siguiente.
        await verifyEmailCode(supabase.auth, email, code, purpose);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(/expired|invalid|otp/i.test(message)
        ? t('El código no es válido o venció. Revisa el correo o solicita otro.', 'The code is invalid or expired. Check your email or request another.')
        : /rate|too many|seconds|429/i.test(message)
          ? t('Espera un momento antes de volver a intentarlo.', 'Please wait before trying again.')
          : t('No pudimos completar la solicitud. Revisa tu conexión e inténtalo otra vez.', 'We could not complete the request. Check your connection and try again.'));
    } finally { locked.current = false; setBusy(false); }
  };

  return <AuthLayout>
    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
      <AppIcon name="arrow" color={colors.primary} size={28} />
    </View>
    <AuthHeading eyebrow={t('REVISA TU CORREO', 'CHECK YOUR EMAIL')}
      title={purpose === 'signup' ? t('Un paso más.\nTu cuenta está cerca.', 'One more step.\nYour account awaits.') : t('Volvamos a entrar.', 'Let’s get you back in.')}
      description={t('Si la solicitud corresponde a tu cuenta, recibirás un código en:', 'If the request applies to your account, you will receive a code at:')} />
    <Text selectable style={[authStyles.body, { fontWeight: '600', color: colors.text, marginTop: -12 }]}>{email}</Text>
    <Animated.View layout={LinearTransition.springify().damping(14)} style={authStyles.form}>
      <AuthField label={t('Código de verificación', 'Verification code')} value={code} onChangeText={value => setCode(normalizeEmailCode(value))}
        editable={!busy} keyboardType="number-pad" inputMode="numeric" textContentType="oneTimeCode" autoComplete="one-time-code"
        placeholder="000000" style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center', fontVariant: ['tabular-nums'] }}
        onSubmitEditing={() => { void run(false); }} />
      <Text style={[authStyles.body, { color: colors.textSecondary }]}>{t('Ingresa los seis dígitos del correo. Si el código venció, solicita uno nuevo.', 'Enter the six digits from your email. If the code expired, request a new one.')}</Text>
      {error && <AuthMessage error>{error}</AuthMessage>}
      {notice && <AuthMessage>{notice}</AuthMessage>}
      <AuthButton label={t('Verificar código', 'Verify code')} busy={busy} disabled={!isEmailCodeValid(code)} onPress={() => { void run(false); }} />
      <AuthButton secondary disabled={busy || remaining > 0} label={remaining > 0 ? t(`Reenviar en ${remaining} s`, `Resend in ${remaining}s`) : t('Reenviar código', 'Resend code')}
        onPress={() => { void run(true); }} />
    </Animated.View>
    <Text style={[authStyles.body, { color: colors.textSecondary }]}>{t('¿No lo encuentras? Revisa la carpeta de spam o comprueba el correo que escribiste.', 'Can’t find it? Check spam or make sure your email address is correct.')}</Text>
    <AuthButton secondary disabled={busy} label={t('Volver al formulario', 'Back to form')} onPress={onBack} />
  </AuthLayout>;
}
