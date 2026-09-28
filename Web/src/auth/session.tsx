// src/auth/session.tsx — quién está dentro del backoffice.
//
// Tres estados: `checking` (resolviendo), `out` (sin acceso) y `in` (la cuenta
// de soporte). Cualquier sesión que no sea la de soporte se cierra en cuanto
// aparece, sin mostrar nada: para cualquier otra cuenta, la web no existe.
//
// La decisión la toma la base (`is_support_staff()`), no este archivo: aquí no
// está escrito qué correo sirve.
//
// Durante «Recuperar acceso» la verificación del código abre una sesión antes
// de que exista la contraseña nueva. `recovering` impide que esa sesión salte
// al backoffice a mitad del flujo; se guarda en sessionStorage para que una
// recarga vuelva al paso de la contraseña y no al buscador.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { isSupportStaff } from '../../backend/adminApi';

type Status = 'checking' | 'out' | 'in';

interface SessionValue {
  status: Status;
  recovering: boolean;
  setRecovering: (value: boolean) => void;
  /** Confirma con la base que la sesión actual es la de soporte; si no, la cierra. */
  verify: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

const RECOVERY_KEY = 'ts-recovering';

const readRecovering = () => {
  try {
    return sessionStorage.getItem(RECOVERY_KEY) === '1';
  } catch {
    return false;
  }
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [recovering, setRecoveringState] = useState(readRecovering);

  const setRecovering = useCallback((value: boolean) => {
    setRecoveringState(value);
    try {
      if (value) sessionStorage.setItem(RECOVERY_KEY, '1');
      else sessionStorage.removeItem(RECOVERY_KEY);
    } catch {
      /* Almacenamiento no disponible: el flujo sigue en memoria. */
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    setStatus('out');
  }, []);

  const verify = useCallback(async () => {
    let ok = false;
    try {
      ok = await isSupportStaff();
    } catch {
      ok = false;
    }
    if (!ok) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setStatus('out');
      return false;
    }
    // Durante la recuperación App sigue mostrando ese flujo aunque la sesión
    // ya sea válida: `recovering` manda sobre `status`.
    setStatus('in');
    return true;
  }, []);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) void verify();
      else setStatus('out');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) setStatus('out');
      // TOKEN_REFRESHED y SIGNED_IN los resuelve quien inició la acción
      // (login o recuperación); aquí sólo se apaga lo que caduca.
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [verify]);

  const value = useMemo(
    () => ({ status, recovering, setRecovering, verify, signOut }),
    [status, recovering, setRecovering, verify, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession fuera de SessionProvider');
  return value;
}
