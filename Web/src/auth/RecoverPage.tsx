// src/auth/RecoverPage.tsx — pedir el código para recuperar el acceso.
//
// Tres pasos: correo → código → contraseña nueva. Los dos primeros viven
// aquí. Al validar el código Supabase abre una sesión de recuperación y emite
// `PASSWORD_RECOVERY`; App.tsx lo captura y muestra `ResetPasswordScreen`
// antes que cualquier otra pantalla.
//
// La respuesta es la misma exista o no la cuenta, para no revelar correos.

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../services/supabase';
import { EmailCodeForm } from '../components/EmailCodeForm';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Form';
import { Alert } from '../ui/Feedback';
import { AuthLayout } from './AuthLayout';
import { errorText, looksLikeEmail } from './authErrors';
import { LOGIN_PATH } from './paths';

const linkClass = 'font-semibold text-terra-primary-ink underline-offset-2 hover:underline';

export function RecoverPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; at: number } | null>(null);
  const locked = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked.current) return;
    const mail = email.trim().toLowerCase();
    if (!looksLikeEmail(mail)) return setError('Escribe el correo de tu cuenta.');

    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(mail);
      if (err) throw err;
      setSent({ email: mail, at: Date.now() });
    } catch (e2) {
      setError(errorText(e2));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const footer = (
    <Link to={LOGIN_PATH} className={linkClass}>
      Volver a iniciar sesión
    </Link>
  );

  if (sent) {
    return (
      <AuthLayout title="Revisa tu correo" footer={footer}>
        <EmailCodeForm
          email={sent.email}
          purpose="recovery"
          sentAt={sent.at}
          onBack={() => setSent(null)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar acceso"
      description="Te enviaremos un código de seis dígitos para elegir una contraseña nueva."
      footer={footer}
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

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          icon={Mail}
          busy={busy}
          busyLabel="Enviando…"
          className="w-full"
        >
          Enviar código
        </Button>
      </form>
    </AuthLayout>
  );
}
