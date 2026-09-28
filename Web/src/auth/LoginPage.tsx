// src/auth/LoginPage.tsx — iniciar sesión.
//
// Correo y contraseña correctos de una cuenta que no es la de soporte reciben
// el mismo error que una contraseña mala, y su sesión se cierra en el acto.

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { supabase } from '../services/supabase';
import { AuthLayout } from './AuthLayout';
import { INVALID_CREDENTIALS, loginErrorText, looksLikeEmail } from './authErrors';
import { useSession } from './session';
import { Button } from '../ui/Button';
import { PasswordField, TextField } from '../ui/Field';
import { Notice } from '../ui/Feedback';

export const LOGIN_PATH = '/ingresar';
export const RECOVER_PATH = '/recuperar-acceso';

export function LoginPage() {
  const { verify } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked.current) return;
    const mail = email.trim().toLowerCase();
    if (!looksLikeEmail(mail) || !password) {
      setError(INVALID_CREDENTIALS);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (signInError) throw signInError;
      if (!(await verify())) throw new Error('invalid login credentials');
      // Con acceso, App cambia sola al buscador.
    } catch (err) {
      setError(loginErrorText(err));
      setPassword('');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Iniciar sesión">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          disabled={busy}
        />
        <PasswordField
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={busy}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" icon={LogIn} busy={busy} className="mt-1 w-full">
          Entrar
        </Button>
        <Link
          to={RECOVER_PATH}
          className="self-center text-sm text-primary-ink underline-offset-4 hover:underline"
        >
          ¿Olvidaste o quieres cambiar tu contraseña?
        </Link>
      </form>
    </AuthLayout>
  );
}
