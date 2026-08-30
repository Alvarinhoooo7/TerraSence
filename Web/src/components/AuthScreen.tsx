// src/components/AuthScreen.tsx — Acceso a la consola TerraSense.
//
// Reemplaza a LoginScreen.tsx + SignUpScreen.tsx: un solo card con el selector de
// pestañas arriba (patrón de login empresarial: Stripe, Linear, Vercel) en vez de
// un enlace de texto al pie. "Olvidé mi contraseña" pasa a ser un tercer paso propio
// dentro del mismo card, con su propia confirmación, en vez de reutilizar el
// formulario de login con un botón suelto.
//
// Nota: esto pide el correo de recuperación / confirma el alta de la cuenta. El
// paso donde el usuario ELIGE la contraseña nueva tras volver del correo de
// recuperación sigue siendo ResetPasswordScreen.tsx (evento PASSWORD_RECOVERY),
// sin relación con este componente.

import { useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from '../services/supabase';

type Mode = 'login' | 'signup' | 'forgot';

const humanize = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'El correo o la contraseña no coinciden.';
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

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.7 18.7 0 0 1-2.35 3.42m-3.44 2.6A9.1 9.1 0 0 1 12 20c-7 0-11-8-11-8a18.7 18.7 0 0 1 4.22-5.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

/** Campo de contraseña con botón de mostrar/ocultar integrado. */
function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] pl-3 pr-11 outline-none focus:border-[--color-terra-primary]"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={show}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 w-11 grid place-items-center text-[--color-terra-muted] hover:text-[--color-terra-text]"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'error' | 'notice'; children: ReactNode }) {
  const cls =
    tone === 'error'
      ? 'bg-[--color-verdict-red]/15 text-[--color-verdict-red]'
      : 'bg-[--color-verdict-green]/15 text-[--color-verdict-green]';
  return <p className={`text-sm rounded-lg p-3 mb-4 ${cls}`}>{children}</p>;
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  /** Cambia de pestaña conservando el correo ya escrito, pero limpia contraseñas y avisos. */
  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    setConfirm('');
    setError(null);
    setNotice(null);
  };

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err) setError(humanize(err.message));
    setBusy(false);
  };

  const submitSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError('Escribe un correo válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);

    if (err) {
      setError(humanize(err.message));
      return;
    }
    // Supabase devuelve un "usuario" sin error incluso si el correo ya existía
    // (para no filtrar qué correos están registrados) — identity vacía es la señal.
    if (data.user && data.user.identities?.length === 0) {
      setError('Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.');
      return;
    }
    setSignupSent(true);
  };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Escribe tu correo para enviarte el enlace de recuperación.');
      return;
    }
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (err) setError(humanize(err.message));
    else setForgotSent(true);
  };

  return (
    <div className="min-h-full grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[--color-terra-border] bg-[--color-terra-surface] p-8">
        <div className="text-5xl text-center mb-2">🌱</div>
        <h1 className="text-2xl font-bold text-center text-[--color-terra-primary]">TerraSense</h1>
        <p className="text-sm text-center text-[--color-terra-muted] mb-6">Consola agronómica</p>

        {mode !== 'forgot' && (
          <div
            role="tablist"
            aria-label="Acceder o crear cuenta"
            className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-xl bg-[--color-terra-bg] border border-[--color-terra-border]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-[--color-terra-surface] text-[--color-terra-primary] shadow'
                  : 'text-[--color-terra-muted] hover:text-[--color-terra-text]'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => switchMode('signup')}
              className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'signup'
                  ? 'bg-[--color-terra-surface] text-[--color-terra-primary] shadow'
                  : 'text-[--color-terra-muted] hover:text-[--color-terra-text]'
              }`}
            >
              Crear cuenta
            </button>
          </div>
        )}

        {/* ── Iniciar sesión ─────────────────────────────────────────────── */}
        {mode === 'login' && (
          <form onSubmit={submitLogin}>
            <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
              CORREO
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] px-3 mb-4 outline-none focus:border-[--color-terra-primary]"
            />

            <PasswordField
              label="CONTRASEÑA"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />

            {error && <Banner tone="error">{error}</Banner>}
            {notice && <Banner tone="notice">{notice}</Banner>}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold disabled:opacity-60"
            >
              {busy ? 'Entrando…' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="w-full h-11 mt-2 text-sm text-[--color-terra-muted] hover:text-[--color-terra-text]"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* ── Crear cuenta ───────────────────────────────────────────────── */}
        {mode === 'signup' &&
          (signupSent ? (
            <div className="text-center">
              <div className="text-5xl mb-2">📩</div>
              <h2 className="text-lg font-bold text-[--color-terra-primary] mb-2">
                Confirma tu correo
              </h2>
              <p className="text-sm text-[--color-terra-muted] mb-6">
                Te enviamos un enlace de confirmación a <strong>{email}</strong>. Ábrelo para
                activar la cuenta y luego inicia sesión.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSignupSent(false);
                  switchMode('login');
                }}
                className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold"
              >
                Ir a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={submitSignup}>
              <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
                CORREO
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] px-3 mb-4 outline-none focus:border-[--color-terra-primary]"
              />

              <PasswordField
                label="CONTRASEÑA"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label="CONFIRMA LA CONTRASEÑA"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
              />

              {error && <Banner tone="error">{error}</Banner>}

              <button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold disabled:opacity-60"
              >
                {busy ? 'Creando…' : 'Crear cuenta'}
              </button>
            </form>
          ))}

        {/* ── Olvidé mi contraseña ───────────────────────────────────────── */}
        {mode === 'forgot' &&
          (forgotSent ? (
            <div className="text-center">
              <div className="text-5xl mb-2">📩</div>
              <h2 className="text-lg font-bold text-[--color-terra-primary] mb-2">
                Revisa tu correo
              </h2>
              <p className="text-sm text-[--color-terra-muted] mb-6">
                Si <strong>{email}</strong> tiene una cuenta, te enviamos un enlace para elegir una
                contraseña nueva.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotSent(false);
                  switchMode('login');
                }}
                className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold"
              >
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={submitForgot}>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex items-center gap-1 text-sm text-[--color-terra-muted] hover:text-[--color-terra-text] mb-4"
              >
                ← Volver a iniciar sesión
              </button>

              <h2 className="text-lg font-bold text-[--color-terra-primary] mb-1">
                Recuperar contraseña
              </h2>
              <p className="text-sm text-[--color-terra-muted] mb-4">
                Escribe el correo de tu cuenta y te enviamos un enlace para elegir una contraseña
                nueva.
              </p>

              <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
                CORREO
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
                className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] px-3 mb-4 outline-none focus:border-[--color-terra-primary]"
              />

              {error && <Banner tone="error">{error}</Banner>}

              <button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold disabled:opacity-60"
              >
                {busy ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          ))}
      </div>
    </div>
  );
}
