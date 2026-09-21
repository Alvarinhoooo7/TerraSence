// src/components/EmailCodeForm.tsx — verificación del código de seis dígitos.
//
// Sirve tanto para confirmar una cuenta nueva como para recuperar la
// contraseña. Los mensajes no distinguen «el correo no existe» de «el código
// no es válido»: decirlo permitiría enumerar cuentas registradas.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Form';
import { Alert } from '../ui/Feedback';

export interface EmailChallenge {
  email: string;
  purpose: 'signup' | 'recovery';
  sentAt: number;
}

const RESEND_COOLDOWN_MS = 60_000;
const SIX_DIGITS = /^\d{6}$/;

export function EmailCodeForm({
  email,
  purpose,
  sentAt,
  onBack,
}: EmailChallenge & { onBack: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [availableAt, setAvailableAt] = useState(sentAt + RESEND_COOLDOWN_MS);
  const [now, setNow] = useState(Date.now());
  const locked = useRef(false);

  const remaining = Math.max(0, Math.ceil((availableAt - now) / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const run = async (resend: boolean) => {
    if (locked.current) return;
    if (resend && Date.now() < availableAt) return;
    if (!resend && !SIX_DIGITS.test(code)) return;

    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (resend) {
        setAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
        const { error: err } =
          purpose === 'signup'
            ? await supabase.auth.resend({ type: 'signup', email })
            : await supabase.auth.resetPasswordForEmail(email);
        if (err) throw err;
        setCode('');
        setNotice('Si corresponde, recibirás un nuevo código. Revisa también la carpeta de spam.');
      } else {
        const { data, error: err } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: purpose === 'signup' ? 'email' : 'recovery',
        });
        if (err) throw err;
        if (!data.session) throw new Error('No se pudo iniciar la sesión.');
        // App.tsx recibe PASSWORD_RECOVERY antes de permitir navegar a la consola.
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(
        /expired|invalid|otp/i.test(message)
          ? 'El código no es válido o venció. Revisa el correo o solicita otro.'
          : /rate|too many|seconds|429/i.test(message)
            ? 'Espera un momento antes de volver a intentarlo.'
            : 'No pudimos completar la solicitud. Revisa tu conexión e inténtalo otra vez.',
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(false);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <h1 className="font-semibold text-terra-text">
          {purpose === 'signup' ? 'Confirma tu correo' : 'Recupera tu contraseña'}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-terra-muted">
          Si la solicitud corresponde a tu cuenta, recibirás un código en{' '}
          <strong className="text-terra-text">{email}</strong>. Vence a los 10 minutos de su envío.
        </p>
      </div>

      <TextField
        label="Código de verificación"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        autoFocus
        required
        disabled={busy}
        className="tabular h-12 text-center text-xl tracking-[0.4em]"
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}

      <Button
        type="submit"
        variant="primary"
        disabled={!SIX_DIGITS.test(code)}
        busy={busy}
        busyLabel="Procesando…"
        className="w-full"
      >
        Verificar código
      </Button>

      <div className="flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          disabled={busy || remaining > 0}
          onClick={() => void run(true)}
          className="text-terra-primary-ink underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-terra-muted disabled:no-underline"
        >
          {remaining > 0 ? `Reenviar en ${remaining} s` : 'Reenviar código'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="text-terra-muted underline-offset-2 hover:text-terra-text hover:underline"
        >
          Volver
        </button>
      </div>
    </form>
  );
}
