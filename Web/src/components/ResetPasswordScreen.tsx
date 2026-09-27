// src/components/ResetPasswordScreen.tsx — elegir una contraseña nueva.
//
// Se muestra tras validar el código de recuperación (o un enlace antiguo).
// `passwordSaved` evita reescribir la contraseña si el cierre de sesión falla
// y el operador vuelve a pulsar: el cambio ya se aplicó, lo que falta es
// terminar de cerrar.

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '../services/supabase';
import { AuthLayout } from '../auth/AuthLayout';
import { PasswordChecklist, isPasswordAcceptable } from '../auth/PasswordChecklist';
import { errorText } from '../auth/authErrors';
import { Button } from '../ui/Button';
import { PasswordField } from '../ui/Form';
import { Alert } from '../ui/Feedback';

export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const locked = useRef(false);
  const passwordSaved = useRef(false);

  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked.current) return;
    setError(null);

    if (!passwordSaved.current) {
      if (!isPasswordAcceptable(password)) return setError('La contraseña no cumple los requisitos.');
      if (password !== confirm) return setError('Las contraseñas no coinciden.');
    }

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
      setError(errorText(e2));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Contraseña actualizada"
        description="Por seguridad se cerró la sesión de este navegador. Entra con la contraseña nueva."
      >
        <div className="flex flex-col items-center gap-5">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-verdict-green-soft text-verdict-green">
            <CheckCircle2 size={24} aria-hidden="true" />
          </span>
          <Button variant="primary" className="w-full" onClick={onDone}>
            Ir a iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Elige tu contraseña nueva" description="Tu correo ya fue verificado.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <PasswordField
            label="Contraseña nueva"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy || passwordSaved.current}
            autoComplete="new-password"
            autoFocus
            required
            show={show}
            onToggleShow={() => setShow((s) => !s)}
            toggleIcon={show ? <EyeOff size={16} /> : <Eye size={16} />}
          />
          <PasswordChecklist password={password} />
        </div>

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
          error={mismatch ? 'Las contraseñas no coinciden.' : undefined}
        />

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          icon={KeyRound}
          busy={busy}
          busyLabel="Guardando…"
          className="w-full"
        >
          {passwordSaved.current ? 'Finalizar recuperación' : 'Guardar contraseña nueva'}
        </Button>
      </form>
    </AuthLayout>
  );
}
