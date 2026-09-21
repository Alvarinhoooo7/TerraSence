// src/components/AuthScreen.tsx — acceso al backoffice.
//
// La consola comparte `auth.users` con la app de agricultores: tener cuenta
// aquí no concede permisos. Quien entre sin pertenecer a `admin_support_users`
// aterriza en `SupportOnboarding`, no en un inventario vacío.

import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '../services/supabase';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { EmailCodeForm } from './EmailCodeForm';
import type { EmailChallenge } from './EmailCodeForm';
import { Button } from '../ui/Button';
import { PasswordField, TextField } from '../ui/Form';
import { Alert } from '../ui/Feedback';

type Mode = 'login' | 'signup' | 'forgot';

const TABS: { id: Mode; label: string }[] = [
  { id: 'login', label: 'Acceder' },
  { id: 'signup', label: 'Crear cuenta' },
];

const humanize = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.';
  if (m.includes('email not confirmed'))
    return 'Esta cuenta aún no está confirmada. Revisa tu correo.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.';
  if (m.includes('password') && (m.includes('least') || m.includes('weak') || m.includes('short')))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('invalid') && m.includes('email')) return 'Ese correo no es válido.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión con el servidor.';
  return message;
};

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<EmailChallenge | null>(null);
  const locked = useRef(false);

  const switchMode = (next: Mode) => {
    if (locked.current) return;
    setMode(next);
    setPassword('');
    setConfirm('');
    setError(null);
  };

  const guard = async (run: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await run();
    } catch (e) {
      setError(humanize(e instanceof Error ? e.message : String(e)));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();

    if (mode === 'login') {
      void guard(async () => {
        const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (err?.code === 'email_not_confirmed') {
          setChallenge({ email: mail, purpose: 'signup', sentAt: 0 });
        } else if (err) {
          throw err;
        }
      });
      return;
    }

    if (mode === 'signup') {
      if (!mail.includes('@')) return setError('Escribe un correo válido.');
      if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
      if (password !== confirm) return setError('Las contraseñas no coinciden.');
      void guard(async () => {
        const { data, error: err } = await supabase.auth.signUp({ email: mail, password });
        if (err) throw err;
        setPassword('');
        setConfirm('');
        if (!data.session) setChallenge({ email: mail, purpose: 'signup', sentAt: Date.now() });
      });
      return;
    }

    if (!mail.includes('@')) {
      return setError('Escribe tu correo para enviarte el código de recuperación.');
    }
    void guard(async () => {
      const { error: err } = await supabase.auth.resetPasswordForEmail(mail);
      if (err) throw err;
      setChallenge({ email: mail, purpose: 'recovery', sentAt: Date.now() });
    });
  };

  const shell = (children: ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-terra-bg p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-1.5">
          <BrandLogo className="h-16 w-52" title="" />
          <p className="text-xs font-semibold tracking-widest text-terra-muted uppercase">
            Backoffice de soporte
          </p>
        </div>
        <div className="panel p-6">{children}</div>
      </div>
    </div>
  );

  if (challenge) {
    return shell(
      <EmailCodeForm
        {...challenge}
        onBack={() => {
          setChallenge(null);
          switchMode(challenge.purpose === 'signup' ? 'login' : 'forgot');
        }}
      />,
    );
  }

  return shell(
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode !== 'forgot' ? (
        <div
          role="tablist"
          aria-label="Acceder o crear cuenta"
          className="flex gap-1 rounded-md border border-terra-border bg-terra-raised p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => switchMode(t.id)}
              className={`h-8 flex-1 rounded-sm text-sm font-semibold transition-colors ${
                mode === t.id
                  ? 'bg-terra-surface text-terra-text shadow-card'
                  : 'text-terra-muted hover:text-terra-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <h1 className="font-semibold text-terra-text">Recuperar acceso</h1>
          <p className="mt-1 text-sm text-terra-muted">
            Te enviamos un código de seis dígitos para elegir una contraseña nueva.
          </p>
        </div>
      )}

      <TextField
        label="Correo electrónico"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        autoFocus={mode === 'forgot'}
      />

      {mode !== 'forgot' && (
        <PasswordField
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
          toggleIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        />
      )}

      {mode === 'signup' && (
        <PasswordField
          label="Confirma tu contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          show={showPassword}
          onToggleShow={() => setShowPassword((s) => !s)}
          toggleIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        />
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <Button
        type="submit"
        variant="primary"
        icon={LogIn}
        busy={busy}
        busyLabel="Procesando…"
        className="w-full"
      >
        {mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Enviar código'}
      </Button>

      <button
        type="button"
        onClick={() => switchMode(mode === 'forgot' ? 'login' : 'forgot')}
        className="text-sm text-terra-muted underline-offset-2 hover:text-terra-text hover:underline"
      >
        {mode === 'forgot' ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}
      </button>
    </form>,
  );
}
