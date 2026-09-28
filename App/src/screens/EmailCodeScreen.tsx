import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../services/supabase';
import {
  EMAIL_CODE_LENGTH, EmailOtpPurpose, emailCodeCells, isEmailCodeValid, normalizeEmailCode,
  OTP_RESEND_SECONDS, resendEmailCode, resendSecondsRemaining, sanitizeCodeInput, shouldAutoVerify, verifyEmailCode,
} from '../services/emailOtp';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { EntryLayout, EntryHeading, EntryButton, useEntryFocus } from '../components/entry/EntryUI';

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
  const revealFocus = useEntryFocus();
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
      onFocus={() => { setFocused(true); revealFocus(field.current); }} onBlur={() => { setFocused(false); revealFocus(null); }}
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

  return <EntryLayout keyboardAware footer={<View style={styles.footer}>
    <EntryButton label={t('Verificar código', 'Verify code')} busy={busy} disabled={!isEmailCodeValid(code)} onPress={() => { void run(false); }} />
    <Pressable accessibilityRole="button" disabled={busy || remaining > 0} onPress={() => { void run(true); }} style={styles.link}>
      <Text style={{ color: busy || remaining > 0 ? colors.textSecondary : colors.primary, fontWeight: '700' }}>
        {remaining > 0 ? t(`Reenviar en ${remaining} s`, `Resend in ${remaining}s`) : t('Reenviar código', 'Resend code')}
      </Text>
    </Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={styles.link}>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('Corregir correo', 'Edit email')}</Text>
    </Pressable>
  </View>}>
    <View style={styles.body}>
      <EntryHeading eyebrow={t('REVISA TU CORREO', 'CHECK YOUR EMAIL')}
        title={purpose === 'signup' ? t('Confirma tu correo', 'Confirm your email') : t('Verifica tu código', 'Verify your code')}
        description={purpose === 'recovery'
          ? t('Si el correo tiene una cuenta, recibirá un código:', 'If this email has an account, it will receive a code:')
          : t('Escribe los seis dígitos enviados a:', 'Enter the six digits sent to:')} />
      <Text selectable style={[styles.email, { color: colors.text }]}>{email}</Text>
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.text }]}>{t('Código de verificación', 'Verification code')}</Text>
        <CodeCells value={code} onChange={setCode} editable={!busy} label={t('Código de verificación de seis dígitos', 'Six-digit verification code')} />
      </View>
      {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
      {notice && <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{notice}</Text>}
      <Text style={[styles.help, { color: colors.textSecondary }]}>{t('Revisa spam si aún no llega.', 'Check spam if it has not arrived.')}</Text>
    </View>
  </EntryLayout>;
}

const styles = StyleSheet.create({
  body: { width: '100%', gap: 14 },
  footer: { width: '100%' },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  email: { fontSize: 16, textAlign: 'center', fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  help: { fontSize: 13, textAlign: 'center' },
  cells: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  cell: { flex: 1, maxWidth: 48, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  // El campo real cubre las casillas sin verse: conserva teclado y autorrelleno.
  hiddenField: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
});
