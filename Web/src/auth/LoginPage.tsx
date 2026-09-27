// src/auth/LoginPage.tsx — iniciar sesión en el backoffice.
//
// Una sesión válida no concede acceso por sí sola: App.tsx comprueba después
// `is_support_staff()` y, si la cuenta aún no es del equipo, pide el código de
// invitación. Por eso aquí no se decide nada sobre permisos.

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '../services/supabase';
import { EmailCodeForm } from '../components/EmailCodeForm';
import { Button } from '../ui/Button';
import { PasswordField, TextField } from '../ui/Form';
import { Alert } from '../ui/Feedback';
import { AuthLayout } from './AuthLayout';
import { errorText, looksLikeEmail } from './authErrors';
import { RECOVER_PATH, SIGNUP_PATH } from './paths';

const linkClass = 'font-semibold text-terra-primary-ink underline-offset-2 hover:underline';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cuenta creada pero sin confirmar: se le ofrece el código en vez de un error.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const locked = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked.current) return;
    const mail = email.trim().toLowerCase();
    if (!looksLikeEmail(mail)) return setError('Escribe un correo válido.');
    if (!password) return setError('Escribe tu contraseña.');

    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (err?.code === 'email_not_confirmed') {
        setPendingEmail(mail);
      } else if (err) {
        throw err;
      }
      // Con éxito, `onAuthStateChange` en App.tsx cambia de pantalla.
    } catch (e2) {
      setError(errorText(e2));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  if (pendingEmail) {
    return (
      <AuthLayout
        title="Confirma tu correo"
        description="Tu cuenta existe, pero falta verificar el correo antes de entrar."
      >
        <EmailCodeForm
          email={pendingEmail}
          purpose="signup"
          sentAt={0}
          onBack={() => {
            setPendingEmail(null);
            setPassword('');
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Iniciar sesión"
      description="Entra con el correo de tu cuenta de soporte."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link to={SIGNUP_PATH} className={linkClass}>
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          required
          disabled={busy}
        />

        <div className="flex flex-col gap-1.5">
          <PasswordField
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={busy}
            show={show}
            onToggleShow={() => setShow((s) => !s)}
            toggleIcon={show ? <EyeOff size={16} /> : <Eye size={16} />}
          />
          <Link to={RECOVER_PATH} className={`self-end text-xs ${linkClass}`}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          icon={LogIn}
          busy={busy}
          busyLabel="Entrando…"
          className="w-full"
        >
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
