import type { SupabaseClient } from '@supabase/supabase-js';

export type EmailOtpPurpose = 'signup' | 'recovery';
export const OTP_RESEND_SECONDS = 60;
export const EMAIL_CODE_LENGTH = 6;
export const normalizeEmailCode = (value: string) => value.replace(/\s/g, '');
export const isEmailCodeValid = (value: string) => /^\d{6}$/.test(normalizeEmailCode(value));

/**
 * Lo que el campo acepta mientras se escribe: sólo dígitos y nunca más de seis.
 * Es distinto de `normalizeEmailCode`, que valida lo ya escrito y debe seguir
 * rechazando un código de siete dígitos en vez de recortarlo por su cuenta.
 */
export const sanitizeCodeInput = (value: string) =>
  value.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH);

/**
 * Lo que se dibuja en las seis casillas. El código va enmascarado, salvo el último
 * dígito tecleado mientras `revealIndex` lo señale: así un error se corrige viendo
 * lo que se escribió, sin dejar el código a la vista de quien mire la pantalla.
 */
export function emailCodeCells(value: string, revealIndex = -1): string[] {
  const digits = sanitizeCodeInput(value);
  return Array.from({ length: EMAIL_CODE_LENGTH }, (_, position) =>
    position >= digits.length ? '' : position === revealIndex ? digits[position] : '*');
}

/**
 * Verificación automática al completar el sexto dígito. No se dispara sobre un código
 * que ya se envió: si el servidor lo rechazó, reintentarlo solo gastaría intentos y
 * dejaría al usuario mirando el mismo error.
 */
export function shouldAutoVerify(value: string, lastAttempt: string | null, busy: boolean): boolean {
  if (busy || !isEmailCodeValid(value)) return false;
  return normalizeEmailCode(value) !== lastAttempt;
}
export const resendSecondsRemaining = (availableAt: number, now = Date.now()) =>
  Math.max(0, Math.ceil((availableAt - now) / 1000));

type OtpAuth = Pick<SupabaseClient['auth'], 'verifyOtp' | 'resend' | 'resetPasswordForEmail'>;

export async function verifyEmailCode(auth: OtpAuth, email: string, code: string, purpose: EmailOtpPurpose) {
  if (!isEmailCodeValid(code)) throw new Error('Ingresa los seis dígitos del código.');
  const { data, error } = await auth.verifyOtp({
    email: email.trim().toLowerCase(), token: normalizeEmailCode(code),
    type: purpose === 'signup' ? 'email' : 'recovery',
  });
  if (error) throw error;
  if (!data.session) throw new Error('No se pudo iniciar la sesión. Solicita otro código.');
  return data.session;
}

export async function resendEmailCode(auth: OtpAuth, email: string, purpose: EmailOtpPurpose) {
  const mail = email.trim().toLowerCase();
  const { error } = purpose === 'signup'
    ? await auth.resend({ type: 'signup', email: mail })
    : await auth.resetPasswordForEmail(mail);
  if (error) throw error;
}
