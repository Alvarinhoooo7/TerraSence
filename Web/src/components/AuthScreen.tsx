import { useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

type Mode = 'login' | 'signup' | 'forgot';

const humanize = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.';
  if (m.includes('email not confirmed')) return 'Esta cuenta aún no está confirmada. Revisa tu correo.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.';
  if (m.includes('password') && (m.includes('least') || m.includes('weak') || m.includes('short')))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('invalid') && m.includes('email')) return 'Ese correo no es válido.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión con el servidor.';
  return message;
};

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
      <label className="block text-xs font-bold tracking-widest text-terra-muted uppercase mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full h-12 rounded-xl border border-terra-border bg-terra-surface/60 backdrop-blur-sm pl-4 pr-12 outline-none focus:border-terra-primary focus:ring-1 focus:ring-terra-primary/50 transition-all text-terra-text font-medium"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-terra-muted hover:text-terra-text transition-colors"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'error' | 'notice'; children: ReactNode }) {
  const cls = tone === 'error'
    ? 'bg-verdict-red/10 text-verdict-red border-verdict-red/30'
    : 'bg-terra-primary/10 text-terra-primary border-terra-primary/30';
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`text-sm rounded-xl p-4 mb-6 border font-medium ${cls}`}>
      {children}
    </motion.div>
  );
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-terra-bg relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-terra-primary rounded-full blur-[150px] opacity-[0.07] pointer-events-none transition-colors duration-500" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-terra-primary-hover rounded-full blur-[180px] opacity-[0.10] pointer-events-none transition-colors duration-500" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-terra-surface/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-2xl border border-terra-border transition-colors duration-500">

          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-terra-primary to-terra-primary-hover p-3 rounded-2xl shadow-lg mb-4">
              <Leaf size={32} className="text-terra-bg" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-terra-text mb-1 transition-colors duration-500">TerraSense</h1>
            <p className="text-terra-muted text-sm font-medium transition-colors duration-500">Plataforma de Servicio</p>
          </div>

          {mode !== 'forgot' && !signupSent && (
            <div className="flex p-1 mb-8 rounded-xl bg-terra-surface/50 border border-terra-border backdrop-blur-md transition-colors duration-500">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all duration-300 ${mode === 'login'
                    ? 'bg-terra-primary text-terra-bg shadow-[0_2px_10px_rgba(18,210,113,0.3)] border border-transparent'
                    : 'text-terra-muted hover:text-terra-text'
                  }`}
              >
                Acceder
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all duration-300 ${mode === 'signup'
                    ? 'bg-terra-primary text-terra-bg shadow-[0_2px_10px_rgba(18,210,113,0.3)] border border-transparent'
                    : 'text-terra-muted hover:text-terra-text'
                  }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {/* ── Iniciar sesión ─────────────────────────────────────────────── */}
          {mode === 'login' && !signupSent && (
            <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onSubmit={submitLogin}>
              <div className="mb-5">
                <label className="block text-xs font-bold tracking-widest text-terra-muted uppercase mb-1.5 transition-colors">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full h-12 rounded-xl border border-terra-border bg-terra-surface/60 backdrop-blur-sm px-4 outline-none focus:border-terra-primary focus:ring-1 focus:ring-terra-primary/50 transition-all text-terra-text font-medium"
                />
              </div>

              <PasswordField
                label="Contraseña"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />

              {error && <Banner tone="error">{error}</Banner>}
              {notice && <Banner tone="notice">{notice}</Banner>}

              <button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-terra-primary to-terra-primary-hover text-terra-bg font-extrabold text-[15px] shadow-[0_0_20px_rgba(18,210,113,0.4)] hover:shadow-[0_0_25px_rgba(18,210,113,0.6)] transition-all disabled:opacity-50 disabled:shadow-none mt-4"
              >
                {busy ? 'Verificando...' : 'Iniciar Sesión'}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm font-medium text-terra-muted hover:text-terra-primary transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </motion.form>
          )}

          {/* ── Crear cuenta ───────────────────────────────────────────────── */}
          {mode === 'signup' && (
            signupSent ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <div className="mx-auto w-16 h-16 bg-terra-primary/20 rounded-full flex items-center justify-center mb-6 text-3xl">
                  📩
                </div>
                <h2 className="text-2xl font-bold text-terra-text mb-3">Confirma tu correo</h2>
                <p className="text-terra-muted mb-8 leading-relaxed">
                  Te hemos enviado un enlace mágico a <strong className="text-terra-text">{email}</strong>.
                  Haz clic en él para activar tu cuenta agrícola.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSignupSent(false);
                    switchMode('login');
                  }}
                  className="w-full h-12 rounded-xl border border-terra-border bg-terra-surface hover:bg-terra-border text-terra-text font-semibold transition-colors"
                >
                  Volver al inicio
                </button>
              </motion.div>
            ) : (
              <motion.form key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={submitSignup}>
                <div className="mb-5">
                  <label className="block text-xs font-bold tracking-widest text-terra-muted uppercase mb-1.5 transition-colors">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="w-full h-12 rounded-xl border border-terra-border bg-terra-surface/60 backdrop-blur-sm px-4 outline-none focus:border-terra-primary focus:ring-1 focus:ring-terra-primary/50 transition-all text-terra-text font-medium"
                  />
                </div>

                <PasswordField
                  label="Contraseña"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />

                <PasswordField
                  label="Confirma tu contraseña"
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                />

                {error && <Banner tone="error">{error}</Banner>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-terra-primary to-terra-primary-hover text-terra-bg font-extrabold text-[15px] shadow-[0_0_20px_rgba(18,210,113,0.4)] hover:shadow-[0_0_25px_rgba(18,210,113,0.6)] transition-all disabled:opacity-50 disabled:shadow-none mt-4"
                >
                  {busy ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </motion.form>
            )
          )}

          {/* ── Olvidé mi contraseña ───────────────────────────────────────── */}
          {mode === 'forgot' && (
            forgotSent ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <div className="mx-auto w-16 h-16 bg-terra-primary/20 rounded-full flex items-center justify-center mb-6 text-3xl">
                  📨
                </div>
                <h2 className="text-2xl font-bold text-terra-text mb-3">Revisa tu bandeja</h2>
                <p className="text-terra-muted mb-8 leading-relaxed">
                  Si <strong>{email}</strong> está registrado, te hemos enviado instrucciones para recuperar el acceso a tu consola.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSent(false);
                    switchMode('login');
                  }}
                  className="w-full h-12 rounded-xl border border-terra-border bg-terra-surface hover:bg-terra-border text-terra-text font-semibold transition-colors"
                >
                  Volver al inicio
                </button>
              </motion.div>
            ) : (
              <motion.form key="forgot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={submitForgot}>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-terra-text mb-2">Recuperar Acceso</h2>
                  <p className="text-sm text-terra-muted">
                    Ingresa tu correo para recibir un enlace de recuperación seguro.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold tracking-widest text-terra-muted uppercase mb-1.5 transition-colors">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                    className="w-full h-12 rounded-xl border border-terra-border bg-terra-surface/60 backdrop-blur-sm px-4 outline-none focus:border-terra-primary focus:ring-1 focus:ring-terra-primary/50 transition-all text-terra-text font-medium"
                  />
                </div>

                {error && <Banner tone="error">{error}</Banner>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-terra-primary to-terra-primary-hover text-terra-bg font-extrabold text-[15px] shadow-[0_0_20px_rgba(18,210,113,0.4)] hover:shadow-[0_0_25px_rgba(18,210,113,0.6)] transition-all disabled:opacity-50 disabled:shadow-none mt-4"
                >
                  {busy ? 'Procesando...' : 'Enviar Enlace'}
                </button>

                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-sm font-medium text-terra-muted hover:text-terra-text transition-colors"
                  >
                    Cancelar y volver
                  </button>
                </div>
              </motion.form>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
