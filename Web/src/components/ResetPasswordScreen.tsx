// src/components/ResetPasswordScreen.tsx — elegir una contraseña nueva.
//
// Se muestra tras validar el código de recuperación (o un enlace antiguo).
// `passwordSaved` evita reescribir la contraseña si el cierre de sesión falla
// y el operador vuelve a pulsar: el cambio ya se aplicó, lo que falta es
// terminar de cerrar.

import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '../services/supabase';
import { BrandLogo } from './BrandLogo';
import { Button } from '../ui/Button';
import { PasswordField } from '../ui/Form';
import { Alert } from '../ui/Feedback';

const humanize = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('password') && m.includes('least'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión con el servidor.';
  if (m.includes('same') || m.includes('different'))
    return 'La nueva contraseña debe ser distinta a la actual.';
  return message;
};

export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const locked = useRef(false);
  const passwordSaved = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked.current) return;
    setError(null);

    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');

    locked.current = true;
    setBusy(true);
    try {
      if (!passwordSaved.current) {
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw err;
        passwordSaved.current = true;
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) throw localError;
      }
      setSuccess(true);
    } catch (e2) {
      setError(humanize(e2 instanceof Error ? e2.message : String(e2)));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const shell = (children: ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-terra-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandLogo className="h-14 w-48" title="" />
        </div>
        <div className="panel p-6">{children}</div>
      </div>
    </div>
  );

  if (success) {
    return shell(
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-verdict-green-soft text-verdict-green">
          <CheckCircle2 size={24} aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-semibold text-terra-text">Contraseña actualizada</h1>
          <p className="mt-1 text-sm leading-relaxed text-terra-muted">
            Por seguridad se cerró la sesión de este navegador. Inicia sesión con la contraseña
            nueva.
          </p>
        </div>
        <Button variant="primary" className="w-full" onClick={onDone}>
          Ir a iniciar sesión
        </Button>
      </div>,
    );
  }

  return shell(
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-terra-primary-soft text-terra-primary-ink">
          <KeyRound size={18} aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-semibold text-terra-text">Elige tu contraseña nueva</h1>
          <p className="text-xs text-terra-muted">Tu correo ya fue verificado.</p>
        </div>
      </div>

      <PasswordField
        label="Contraseña nueva"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy || passwordSaved.current}
        autoComplete="new-password"
        required
        show={show}
        onToggleShow={() => setShow((s) => !s)}
        toggleIcon={show ? <EyeOff size={16} /> : <Eye size={16} />}
        hint="Mínimo 6 caracteres."
      />

      <PasswordField
        label="Confirma la contraseña"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={busy || passwordSaved.current}
        autoComplete="new-password"
        required
        show={show}
        onToggleShow={() => setShow((s) => !s)}
        toggleIcon={show ? <EyeOff size={16} /> : <Eye size={16} />}
      />

      {error && <Alert tone="error">{error}</Alert>}

      <Button
        type="submit"
        variant="primary"
        busy={busy}
        busyLabel="Guardando…"
        className="w-full"
      >
        {passwordSaved.current ? 'Finalizar recuperación' : 'Guardar contraseña nueva'}
      </Button>
    </form>,
  );
}
