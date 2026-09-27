// src/auth/SignupPage.tsx — crear una cuenta de soporte.
//
// La web y la app comparten la base de usuarios de Supabase: un correo es una
// sola cuenta. Para que no se mezclen, el backoffice se usa con un correo
// propio, distinto al de la app, y la pantalla lo dice antes de enviar.
//
// Supabase no devuelve error al registrar un correo que ya tiene cuenta
// confirmada: responde un usuario sin identidades y no envía ningún código,
// para no revelar qué correos existen. Sin esta comprobación, quien usara el
// correo de su cuenta de la app se quedaría esperando un código que no llega.
//
// Crear la cuenta no da acceso: tras confirmar el correo, App.tsx pide el
// código de invitación del equipo.

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { supabase } from '../services/supabase';
import { EmailCodeForm } from '../components/EmailCodeForm';
import { Button } from '../ui/Button';
import { PasswordField, TextField } from '../ui/Form';
import { Alert } from '../ui/Feedback';
import { AuthLayout } from './AuthLayout';
import { PasswordChecklist, isPasswordAcceptable } from './PasswordChecklist';
import { errorText, looksLikeEmail } from './authErrors';
import { LOGIN_PATH } from './paths';

const linkClass = 'font-semibold text-terra-primary-ink underline-offset-2 hover:underline';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; at: number } | null>(null);
  const locked = useRef(false);

  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked.current) return;
    const mail = email.trim().toLowerCase();
    if (!looksLikeEmail(mail)) return setError('Escribe un correo válido.');
    if (!isPasswordAcceptable(password)) return setError('La contraseña no cumple los requisitos.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');

    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({ email: mail, password });
      if (err) throw err;
      if (data.user && data.user.identities?.length === 0) {
        setError(
          'Ya existe una cuenta con ese correo, puede que sea la de la app TerraSense. ' +
            'Para el backoffice usa un correo distinto, o inicia sesión si la cuenta es de soporte.',
        );
        return;
      }
      setPassword('');
      setConfirm('');
      // Con la confirmación de correo activa no hay sesión hasta validar el código.
      if (!data.session) setSent({ email: mail, at: Date.now() });
    } catch (e2) {
      setError(errorText(e2));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Confirma tu correo" description="Último paso para activar la cuenta.">
        <EmailCodeForm
          email={sent.email}
          purpose="signup"
          sentAt={sent.at}
          onBack={() => setSent(null)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crear cuenta de soporte"
      description="Después de confirmar el correo necesitarás el código de invitación que entrega el equipo."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to={LOGIN_PATH} className={linkClass}>
            Iniciar sesión
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
          hint="Usa un correo distinto al de tu cuenta de la app: cada correo es una sola cuenta."
        />

        <div className="flex flex-col gap-2">
          <PasswordField
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={busy}
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
          autoComplete="new-password"
          required
          disabled={busy}
          show={show}
          onToggleShow={() => setShow((s) => !s)}
          toggleIcon={show ? <EyeOff size={16} /> : <Eye size={16} />}
          error={mismatch ? 'Las contraseñas no coinciden.' : undefined}
        />

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          icon={UserPlus}
          busy={busy}
          busyLabel="Creando cuenta…"
          className="w-full"
        >
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
