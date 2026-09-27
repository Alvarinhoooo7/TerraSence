// src/components/SupportOnboarding.tsx
//
// Alta autoservicio de personal de soporte. Envuelve `selfRegisterSupportStaff`
// (`support_self_register` en Postgres): un usuario recién confirmado que entra
// a la consola sin pertenecer al panel aterriza aquí, no en un inventario
// vacío por RLS.
//
// El código de invitación es el control real y lo valida el servidor contra un
// hash bcrypt; aquí no se compara nada. Cinco fallos en una hora bloquean el
// alta desde Postgres, no desde este formulario.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, LogOut, RotateCcw } from 'lucide-react';
import { selfRegisterSupportStaff } from '../../backend/adminApi';
import { supabase } from '../services/supabase';
import { AuthLayout } from '../auth/AuthLayout';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Form';
import { Alert } from '../ui/Feedback';

export function SupportOnboarding({
  email,
  onActivated,
}: {
  email: string;
  onActivated: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (inviteCode.trim().length === 0) {
      setError('Introduce el código de invitación que te entregó el equipo.');
      return;
    }
    setSubmitting(true);
    try {
      await selfRegisterSupportStaff(fullName.trim(), inviteCode.trim());
      onActivated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Activa tu acceso"
      description={
        <>
          Sesión iniciada como <strong className="break-all text-terra-text">{email}</strong>. La
          cuenta es válida, pero todavía no pertenece al equipo de soporte.
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onActivated}>
            Ya soy del equipo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={LogOut}
            onClick={() => void supabase.auth.signOut()}
          >
            Cerrar sesión
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Cómo aparecerás en el equipo"
          hint="Opcional. Si lo dejas vacío se usa la parte del correo antes de la @."
          autoComplete="name"
          autoFocus
          disabled={submitting}
        />

        <TextField
          label="Código de invitación"
          type="password"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Entregado por el equipo"
          autoComplete="off"
          className="font-mono"
          disabled={submitting}
          hint="Cinco intentos fallidos en una hora bloquean temporalmente el alta."
        />

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          icon={KeyRound}
          busy={submitting}
          busyLabel="Verificando…"
          className="w-full"
        >
          Activar acceso
        </Button>
      </form>
    </AuthLayout>
  );
}
