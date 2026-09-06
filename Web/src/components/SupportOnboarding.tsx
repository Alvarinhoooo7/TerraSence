// src/components/SupportOnboarding.tsx
//
// Alta autoservicio de personal de soporte. Envuelve `selfRegisterSupportStaff`
// (`support_self_register` en Postgres), que hasta ahora no tenía pantalla: un
// usuario recién confirmado entraba a la consola y no veía forma de acceder al
// panel.
//
// El código de invitación es el control real y lo valida el servidor contra un
// hash bcrypt; aquí no se compara nada. Cinco fallos en una hora bloquean el
// alta desde Postgres, no desde este formulario.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ShieldAlert, LogOut, RotateCcw } from 'lucide-react';
import { selfRegisterSupportStaff } from '../../backend/adminApi';
import { supabase } from '../services/supabase';

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (inviteCode.trim().length === 0) {
      setError('Introduce el código de invitación que te entregó el equipo.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await selfRegisterSupportStaff(fullName.trim(), inviteCode.trim());
      if (res.success === false) {
        setError(res.message ?? 'No se pudo activar el acceso.');
        return;
      }
      onActivated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-terra-border/50 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-verdict-amber/10 text-verdict-amber">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Acceso al backoffice</h1>
            <p className="text-xs text-terra-muted">Sesión iniciada como {email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <p className="text-sm text-terra-muted">
            Tu cuenta es válida, pero todavía no pertenece al equipo de soporte. Introduce el código
            de invitación para activar el panel. Esta consola comparte usuarios con la app de
            agricultores, así que llegar a esta URL no otorga permisos por sí solo.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-terra-muted">
              Nombre completo
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Cómo aparecerás en el equipo"
              autoComplete="name"
              className="bg-terra-surface border border-terra-border rounded-lg px-3 py-2 outline-none focus:border-terra-primary text-terra-text text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-terra-muted">
              Código de invitación
            </span>
            <input
              type="password"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Entregado por el equipo"
              autoComplete="off"
              className="bg-terra-surface border border-terra-border rounded-lg px-3 py-2 outline-none focus:border-terra-primary text-terra-text font-mono text-sm"
            />
          </label>

          {error && (
            <div className="rounded-lg bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-terra-primary/15 text-terra-primary border border-terra-primary/30 hover:bg-terra-primary/25 font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <KeyRound size={18} />
            {submitting ? 'Verificando…' : 'Activar acceso'}
          </button>

          <p className="text-xs text-terra-muted">
            Cinco intentos fallidos en una hora bloquean temporalmente el alta.
          </p>

          <button
            type="button"
            onClick={onActivated}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium text-terra-muted hover:text-terra-text transition-colors"
          >
            <RotateCcw size={15} />
            Ya soy del equipo, volver a comprobar
          </button>

          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium text-terra-muted hover:text-terra-text transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </form>
      </motion.div>
    </div>
  );
}
