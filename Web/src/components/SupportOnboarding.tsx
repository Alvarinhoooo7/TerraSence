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
import { KeyRound, LogOut, RotateCcw, ShieldAlert } from 'lucide-react';
import { selfRegisterSupportStaff } from '../../backend/adminApi';
import { supabase } from '../services/supabase';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
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
    <div className="flex min-h-screen items-center justify-center bg-terra-bg p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo className="h-14 w-48" title="" />
        </div>

        <div className="panel">
          <header className="panel-header">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-support-soft text-support">
              <ShieldAlert size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-semibold text-terra-text">Acceso al backoffice</h1>
              <p className="truncate text-xs text-terra-muted">Sesión iniciada como {email}</p>
            </div>
          </header>

          <form onSubmit={submit} className="flex flex-col gap-4 p-5">
            <p className="text-sm leading-relaxed text-terra-muted">
              Tu cuenta es válida, pero todavía no pertenece al equipo de soporte. Introduce el
              código de invitación para activar el panel. Esta consola comparte usuarios con la app
              de agricultores, así que llegar a esta URL no otorga permisos por sí solo.
            </p>

            <TextField
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Cómo aparecerás en el equipo"
              autoComplete="name"
            />

            <TextField
              label="Código de invitación"
              type="password"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Entregado por el equipo"
              autoComplete="off"
              className="font-mono"
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
          </form>
        </div>
      </div>
    </div>
  );
}
