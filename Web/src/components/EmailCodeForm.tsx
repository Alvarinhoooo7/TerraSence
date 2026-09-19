import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';

export interface EmailChallenge { email: string; purpose: 'signup' | 'recovery'; sentAt: number }

export function EmailCodeForm({ email, purpose, sentAt, onBack }: EmailChallenge & { onBack: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [availableAt, setAvailableAt] = useState(sentAt + 60_000);
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil((availableAt - now) / 1000));
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const run = async (resend: boolean) => {
    if (locked.current || (resend && Date.now() < availableAt) || (!resend && !/^\d{6}$/.test(code))) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (resend) {
        setAvailableAt(Date.now() + 60_000);
        const { error } = purpose === 'signup'
          ? await supabase.auth.resend({ type: 'signup', email })
          : await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setCode(''); setNotice('Si corresponde, recibirás un nuevo código. Revisa también spam.');
      } else {
        const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: purpose === 'signup' ? 'email' : 'recovery' });
        if (error) throw error;
        if (!data.session) throw new Error('No se pudo iniciar la sesión.');
        // App recibe PASSWORD_RECOVERY antes de permitir la navegación a la consola.
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(/expired|invalid|otp/i.test(message) ? 'El código no es válido o venció. Revisa el correo o solicita otro.'
        : /rate|too many|seconds|429/i.test(message) ? 'Espera un momento antes de volver a intentarlo.'
          : 'No pudimos completar la solicitud. Revisa tu conexión e inténtalo otra vez.');
    } finally { locked.current = false; setBusy(false); }
  };

  return <form onSubmit={e => { e.preventDefault(); void run(false); }} className="space-y-5">
    <h2 className="text-xl font-bold text-terra-text">{purpose === 'signup' ? 'Confirma tu correo' : 'Recupera tu contraseña'}</h2>
    <p className="text-terra-muted">Si la solicitud corresponde a tu cuenta, recibirás un código en <strong>{email}</strong>.</p>
    <p className="text-terra-muted">Ingresa los seis dígitos. El código vence a los 10 minutos de su envío.</p>
    <label htmlFor="email-code" className="block text-terra-text">Código de verificación</label>
    <input id="email-code" value={code} onChange={e => setCode(e.target.value.replace(/\s/g, ''))}
      type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" autoFocus required disabled={busy}
      className="w-full h-14 rounded-xl border border-terra-border bg-terra-bg text-terra-text text-center text-2xl tracking-[0.4em]" />
    {error && <p role="alert" className="text-verdict-red">{error}</p>}
    {notice && <p role="status" className="text-terra-muted">{notice}</p>}
    <button type="submit" disabled={busy || !/^\d{6}$/.test(code)} className="w-full h-12 rounded-lg bg-terra-primary text-terra-bg font-bold disabled:opacity-50">
      {busy ? 'Procesando…' : 'Verificar código'}
    </button>
    <button type="button" disabled={busy || remaining > 0} onClick={() => { void run(true); }} className="w-full min-h-12 text-terra-primary disabled:opacity-50">
      {remaining > 0 ? `Reenviar en ${remaining} s` : 'Reenviar código'}
    </button>
    <button type="button" disabled={busy} onClick={onBack} className="w-full min-h-12 text-terra-muted">Volver al formulario</button>
  </form>;
}
