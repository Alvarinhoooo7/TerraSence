// src/auth/RecoverPage.tsx — recuperar o cambiar la contraseña.
//
// Correo → código de 6 dígitos → contraseña nueva → vuelta a iniciar sesión.
// Es también la vía del primer ingreso: la cuenta de soporte nace sin
// contraseña.
//
// El código lo envía la función `backoffice-recover`, sólo a la cuenta de
// soporte y con la misma respuesta para cualquier correo. Si aun así otra
// cuenta llegara a verificar un código aquí, su sesión se cierra y el paso
// responde como a un código inválido.

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleCheck, KeyRound, Mail } from 'lucide-react';
import { supabase } from '../services/supabase';
import { requestRecoveryCode } from '../../backend/adminApi';
import { AuthLayout } from './AuthLayout';
import { codeErrorText, looksLikeEmail, passwordErrorText } from './authErrors';
import { PasswordChecklist, isPasswordAcceptable } from './PasswordChecklist';
import { LOGIN_PATH } from './LoginPage';
import { useSession } from './session';
import { Button } from '../ui/Button';
import { PasswordField, TextField } from '../ui/Field';
import { Notice } from '../ui/Feedback';

type Step = 'email' | 'code' | 'password' | 'done';

const RESEND_MS = 60_000;

const backToLogin = (
  <Link to={LOGIN_PATH} className="inline-flex items-center gap-1.5 text-primary-ink underline-offset-4 hover:underline">
    <ArrowLeft size={15} aria-hidden="true" />
    Volver a iniciar sesión
  </Link>
);

export function RecoverPage() {
  const { recovering, setRecovering, verify, status } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(recovering ? 'password' : 'email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const locked = useRef(false);

  // Una recarga a mitad del flujo sin sesión válida vuelve al primer paso.
  useEffect(() => {
    if (step === 'password' && status === 'out') {
      setRecovering(false);
      setStep('email');
    }
  }, [status, step, setRecovering]);

  useEffect(() => {
    if (step !== 'code') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const run = async (task: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!looksLikeEmail(mail)) {
      setError('Escribe un correo válido.');
      return;
    }
    void run(async () => {
      try {
        await requestRecoveryCode(mail);
        setEmail(mail);
        setSentAt(Date.now());
        setNow(Date.now());
        setCode('');
        setNotice(step === 'code' ? 'Enviamos un código nuevo.' : null);
        setStep('code');
      } catch {
        setError('Sin conexión con el servidor. Revisa tu red y reintenta.');
      }
    });
  };

  const checkCode = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return;
    void run(async () => {
      setNotice(null);
      setRecovering(true);
      const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (otpError || !(await verify())) {
        setRecovering(false);
        setError(codeErrorText(otpError));
        return;
      }
      setStep('password');
    });
  };

  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    if (!isPasswordAcceptable(password)) {
      setError('La contraseña no cumple los requisitos.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    void run(async () => {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(passwordErrorText(updateError));
        return;
      }
      // Se entra de nuevo con la contraseña recién elegida. `recovering` sigue
      // activo hasta salir de esta pantalla para que no se desmonte.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setPassword('');
      setConfirm('');
      setStep('done');
    });
  };

  if (step === 'done') {
    return (
      <AuthLayout title="Contraseña actualizada" description="Ya puedes entrar con tu contraseña nueva.">
        <div className="flex flex-col items-center gap-5">
          <CircleCheck size={36} className="text-primary" aria-hidden="true" />
          <Button variant="primary" size="lg" className="w-full" onClick={() => {
              setRecovering(false);
              navigate(LOGIN_PATH);
            }}>
            Ir a iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'password') {
    return (
      <AuthLayout title="Elige tu contraseña" description="Código verificado. Define la contraseña con la que entrarás.">
        <form onSubmit={savePassword} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <PasswordField
              label="Contraseña nueva"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              disabled={busy}
            />
            <PasswordChecklist password={password} />
          </div>
          <PasswordField
            label="Repite la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={busy}
            error={confirm && confirm !== password ? 'Las contraseñas no coinciden.' : undefined}
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" variant="primary" size="lg" icon={KeyRound} busy={busy} className="mt-1 w-full">
            Guardar contraseña
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (step === 'code') {
    const wait = Math.max(0, Math.ceil((sentAt + RESEND_MS - now) / 1000));
    return (
      <AuthLayout
        title="Revisa tu correo"
        description={
          <>
            Si <strong className="font-medium break-all text-ink">{email}</strong> corresponde a la cuenta, te
            enviamos un código de 6 dígitos. Vence en 10 minutos.
          </>
        }
        footer={backToLogin}
      >
        <form onSubmit={checkCode} className="flex flex-col gap-4">
          <TextField
            label="Código"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={busy}
            className="tabular text-center font-mono text-2xl tracking-[0.5em]"
          />
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}
          <Button type="submit" variant="primary" size="lg" busy={busy} disabled={code.length !== 6} className="w-full">
            Verificar código
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError(null);
                setNotice(null);
              }}
              className="text-muted hover:text-ink"
            >
              Cambiar correo
            </button>
            <button
              type="button"
              disabled={busy || wait > 0}
              onClick={() => sendCode()}
              className="text-primary-ink underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
            >
              {wait > 0 ? `Reenviar en ${wait} s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar acceso"
      description="Te enviaremos un código para elegir una contraseña nueva."
      footer={backToLogin}
    >
      <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          disabled={busy}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" icon={Mail} busy={busy} className="mt-1 w-full">
          Enviar código
        </Button>
      </form>
    </AuthLayout>
  );
}
