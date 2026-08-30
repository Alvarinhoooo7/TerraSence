// src/components/ResetPasswordScreen.tsx — Pantalla para elegir una contraseña nueva.
//
// Se muestra cuando Supabase entrega una sesión de tipo `PASSWORD_RECOVERY` (el usuario
// llegó desde el enlace del correo de recuperación). Sin esta pantalla, el enlace del correo
// dejaba al usuario directamente en el Dashboard sin haber cambiado nada — un enlace de
// "recuperar contraseña" que en realidad no permitía recuperar la contraseña.

import { useState, type FormEvent } from 'react';
import { supabase } from '../services/supabase';

const humanize = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('password') && m.includes('least'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Sin conexión con el servidor.';
  if (m.includes('same') || m.includes('different'))
    return 'La nueva contraseña debe ser distinta a la actual.';
  return message;
};

export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (err) {
      setError(humanize(err.message));
      return;
    }

    // Cierra la sesión de recuperación: el usuario debe volver a entrar con la
    // contraseña nueva, como corresponde tras un cambio de credenciales.
    setSuccess(true);
    await supabase.auth.signOut();
  };

  if (success) {
    return (
      <div className="min-h-full grid place-items-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-[--color-terra-border] bg-[--color-terra-surface] p-8 text-center">
          <div className="text-5xl mb-2">✅</div>
          <h1 className="text-xl font-bold text-[--color-terra-primary] mb-2">
            Contraseña actualizada
          </h1>
          <p className="text-sm text-[--color-terra-muted] mb-6">
            Tu contraseña se cambió correctamente. Inicia sesión con la nueva.
          </p>
          <button
            type="button"
            onClick={onDone}
            className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[--color-terra-border] bg-[--color-terra-surface] p-8"
      >
        <div className="text-5xl text-center mb-2">🔑</div>
        <h1 className="text-2xl font-bold text-center text-[--color-terra-primary]">
          Elige tu contraseña nueva
        </h1>
        <p className="text-sm text-center text-[--color-terra-muted] mb-6">
          Llegaste desde el enlace de recuperación de TerraSense.
        </p>

        <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
          CONTRASEÑA NUEVA
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] px-3 mb-4 outline-none focus:border-[--color-terra-primary]"
        />

        <label className="block text-xs font-semibold tracking-wide text-[--color-terra-muted] mb-1">
          CONFIRMA LA CONTRASEÑA
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="w-full h-12 rounded-lg border border-[--color-terra-border] bg-[--color-terra-bg] px-3 mb-4 outline-none focus:border-[--color-terra-primary]"
        />

        {error && (
          <p className="text-sm rounded-lg bg-[--color-verdict-red]/15 text-[--color-verdict-red] p-3 mb-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-lg bg-[--color-terra-primary] text-[#0d1512] font-semibold disabled:opacity-60"
        >
          {busy ? 'Guardando…' : 'Guardar contraseña nueva'}
        </button>
      </form>
    </div>
  );
}
