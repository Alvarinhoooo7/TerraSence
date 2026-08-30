// src/components/LoginScreen.tsx — Pantalla de acceso a la consola de administración TerraSense.

import { useState, type FormEvent } from 'react';
import { supabase } from '../services/supabase';

const humanize = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'El correo o la contraseña no coinciden.';
  if (m.includes('email not confirmed'))
    return 'Esta cuenta aún no está confirmada. Revisa tu correo.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Sin conexión con el servidor.';
  return message;
};

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err) setError(humanize(err.message));
    setBusy(false);
  };

  const recover = async () => {
    if (!email.includes('@')) {
      setError('Escribe tu correo para enviarte el enlace de recuperación.');
      return;
    }
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: window.location.origin },
    );
    if (err) setError(humanize(err.message));
    else setNotice('Te enviamos un enlace para elegir una contraseña nueva.');
  };

  return (
    <div className="min-h-full grid place-items-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[--color-terra-border] bg-[--color-terra-surface] p-8"
      >
        <div className="text-5xl text-center mb-2">🌱</div>
        <h1 className="text-2xl font-bold text-center text-[--color-terra-primary]">
          TerraSense
        </h1>
        <p className="text-sm text-center text-[--color-terra-muted] mb-6">
          Consola agronómica
        </p>

        <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
          CORREO
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] px-3 mb-4 outline-none focus:border-[--color-terra-primary]"
        />

        <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
          CONTRASEÑA
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] px-3 mb-4 outline-none focus:border-[--color-terra-primary]"
        />

        {error && (
          <p className="text-sm rounded-lg bg-[--color-verdict-red]/15 text-[--color-verdict-red] p-3 mb-3">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm rounded-lg bg-[--color-verdict-green]/15 text-[--color-verdict-green] p-3 mb-3">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        <button
          type="button"
          onClick={recover}
          className="w-full h-11 mt-2 text-sm text-[--color-terra-muted] hover:text-[--color-terra-text]"
        >
          Olvidé mi contraseña
        </button>
      </form>
    </div>
  );
}
