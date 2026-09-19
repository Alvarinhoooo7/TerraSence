import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { EmailOtpPurpose, isEmailCodeValid, normalizeEmailCode, OTP_RESEND_SECONDS, resendEmailCode, resendSecondsRemaining, verifyEmailCode } from '../services/emailOtp';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Typography } from '../constants/theme';

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

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Text accessibilityRole="header" style={[Typography.titleLarge, { color: colors.text }]}>
          {purpose === 'signup' ? t('Confirma tu correo', 'Confirm your email') : t('Recupera tu contraseña', 'Recover your password')}
        </Text>
        <Text style={[Typography.bodyRegular, { color: colors.textSecondary }]}>
          {t('Si la solicitud corresponde a tu cuenta, recibirás un código en:', 'If the request applies to your account, you will receive a code at:')} {email}
        </Text>
        <Text style={[Typography.bodyRegular, { color: colors.textSecondary }]}>
          {t('Ingresa los seis dígitos. El código vence a los 10 minutos de su envío.', 'Enter the six digits. The code expires 10 minutes after it is sent.')}
        </Text>
        <TextInput value={code} onChangeText={value => setCode(normalizeEmailCode(value))} editable={!busy}
          keyboardType="number-pad" inputMode="numeric" textContentType="oneTimeCode" autoComplete="one-time-code"
          accessibilityLabel={t('Código de seis dígitos', 'Six-digit code')} autoFocus
          style={{ borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.card, borderRadius: 12, padding: 16, fontSize: 28, letterSpacing: 8, textAlign: 'center' }} />
        {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
        {notice && <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{notice}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={busy || !isEmailCodeValid(code)} onPress={() => { void run(false); }}
          style={{ minHeight: 56, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: busy || !isEmailCodeValid(code) ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[Typography.button, { color: '#FFFFFF' }]}>{t('Verificar código', 'Verify code')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" disabled={busy || remaining > 0} onPress={() => { void run(true); }} style={{ minHeight: 48, justifyContent: 'center', opacity: busy || remaining > 0 ? 0.5 : 1 }}>
          <Text style={{ color: colors.primary }}>{remaining > 0 ? t(`Reenviar en ${remaining} s`, `Resend in ${remaining}s`) : t('Reenviar código', 'Resend code')}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onBack} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('Volver al formulario', 'Back to form')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
