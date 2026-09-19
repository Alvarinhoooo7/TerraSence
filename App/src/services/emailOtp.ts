import type { SupabaseClient } from '@supabase/supabase-js';

export type EmailOtpPurpose = 'signup' | 'recovery';
export const OTP_RESEND_SECONDS = 60;
export const normalizeEmailCode = (value: string) => value.replace(/\s/g, '');
export const isEmailCodeValid = (value: string) => /^\d{6}$/.test(normalizeEmailCode(value));
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
