import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { layoutFlow } from '../constants/motion';
import { supabase } from '../services/supabase';
import {
  EMAIL_CODE_LENGTH, EmailOtpPurpose, emailCodeCells, isEmailCodeValid, normalizeEmailCode,
  OTP_RESEND_SECONDS, resendEmailCode, resendSecondsRemaining, sanitizeCodeInput, shouldAutoVerify, verifyEmailCode,
} from '../services/emailOtp';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AuthLayout, AuthHeading, AuthButton, AuthMessage, authStyles } from '../components/auth/AuthUI';

/** Tiempo que el último dígito queda a la vista antes de enmascararse. */
const REVEAL_MS = 900;

/**
 * Seis casillas con el código enmascarado. El campo real va encima, transparente:
 * así se conserva el teclado numérico y el autorrelleno del código del sistema,
 * que un conjunto de seis campos separados suele romper.
 */
function CodeCells({ value, onChange, editable, label }: {
  value: string; onChange: (next: string) => void; editable: boolean; label: string;
}) {
  const { colors } = useAppTheme();
  const field = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(-1);

  useEffect(() => {
    if (reveal < 0) return;
    const timer = setTimeout(() => setReveal(-1), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [reveal, value]);

  const cells = emailCodeCells(value, reveal);
  const active = focused ? value.length : -1;

  return <Pressable accessible={false} disabled={!editable} onPress={() => field.current?.focus()}
    style={[styles.cells, { opacity: editable ? 1 : 0.65 }]}>
    {cells.map((character, position) => <View key={position} accessible={false} importantForAccessibility="no-hide-descendants"
      style={[styles.cell, {
        backgroundColor: colors.card,
        borderColor: position === active ? colors.primary : colors.border,
        borderWidth: position === active ? 2 : 1.5,
      }]}>
      <Text style={[styles.cellText, { color: colors.text }]}>{character}</Text>
    </View>)}
    <TextInput ref={field} value={value} editable={editable} accessibilityLabel={label}
      onChangeText={text => {
        const next = sanitizeCodeInput(text);
        setReveal(next.length > value.length ? next.length - 1 : -1);
        onChange(next);
      }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      autoFocus keyboardType="number-pad" inputMode="numeric" maxLength={EMAIL_CODE_LENGTH}
      textContentType="oneTimeCode" autoComplete="one-time-code" autoCorrect={false}
      style={styles.hiddenField} />
  </Pressable>;
}

interface Props { email: string; purpose: EmailOtpPurpose; sentAt: number; onBack: () => void }

export function EmailCodeScreen({ email, purpose, sentAt, onBack }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  // Último código ya enviado a verificar: evita que el disparo automático repita
  // un código que el servidor acaba de rechazar.
  const lastAttempt = useRef<string | null>(null);
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
        lastAttempt.current = null;
        setNotice(t('Si corresponde, recibirás un nuevo código. Revisa también spam.', 'If applicable, you will receive a new code. Also check spam.'));
      } else {
        lastAttempt.current = normalizeEmailCode(code);
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

  // Al completar el sexto dígito se verifica solo: el paso manual no aporta nada.
  useEffect(() => {
    if (shouldAutoVerify(code, lastAttempt.current, busy)) void run(false);
  }, [code, busy]);

  return <AuthLayout brand={false}>
    <AuthHeading eyebrow={t('REVISA TU CORREO', 'CHECK YOUR EMAIL')}
      title={purpose === 'signup' ? t('Un paso más.\nTu cuenta está cerca.', 'One more step.\nYour account awaits.') : t('Volvamos a entrar.', 'Let’s get you back in.')}
      description={t('Si la solicitud corresponde a tu cuenta, recibirás un código en:', 'If the request applies to your account, you will receive a code at:')} />
    <Text selectable style={[authStyles.body, authStyles.centered, { fontWeight: '600', color: colors.text, marginTop: -12 }]}>{email}</Text>
    <Animated.View layout={layoutFlow()} style={authStyles.form}>
      <View style={authStyles.field}>
        <Text style={[authStyles.label, authStyles.centered, { color: colors.text }]}>{t('Código de verificación', 'Verification code')}</Text>
        <CodeCells value={code} onChange={setCode} editable={!busy} label={t('Código de verificación de seis dígitos', 'Six-digit verification code')} />
      </View>
      <Text style={[authStyles.body, authStyles.centered, { color: colors.textSecondary }]}>{t('Ingresa los seis dígitos del correo. Si el código venció, solicita uno nuevo.', 'Enter the six digits from your email. If the code expired, request a new one.')}</Text>
      {error && <AuthMessage error>{error}</AuthMessage>}
      {notice && <AuthMessage>{notice}</AuthMessage>}
      <AuthButton label={t('Verificar código', 'Verify code')} busy={busy} disabled={!isEmailCodeValid(code)} onPress={() => { void run(false); }} />
      <AuthButton secondary disabled={busy || remaining > 0} label={remaining > 0 ? t(`Reenviar en ${remaining} s`, `Resend in ${remaining}s`) : t('Reenviar código', 'Resend code')}
        onPress={() => { void run(true); }} />
    </Animated.View>
    <Text style={[authStyles.body, authStyles.centered, { color: colors.textSecondary }]}>{t('¿No lo encuentras? Revisa la carpeta de spam o comprueba el correo que escribiste.', 'Can’t find it? Check spam or make sure your email address is correct.')}</Text>
    <AuthButton secondary disabled={busy} label={t('Volver', 'Back')} onPress={onBack} />
  </AuthLayout>;
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  cell: { flex: 1, maxWidth: 56, height: 62, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  // El campo real cubre las casillas sin verse: conserva teclado y autorrelleno.
  hiddenField: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
});
