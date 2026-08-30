import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  // true cuando Supabase notifica un evento PASSWORD_RECOVERY: el usuario llegó desde
  // el enlace del correo de "olvidé mi contraseña" y debe elegir una nueva antes de
  // poder ver el resto de la consola, aunque ya exista una sesión activa.
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-full grid place-items-center text-[--color-terra-muted]">
        Cargando…
      </div>
    );
  }

  if (recovering) {
    return <ResetPasswordScreen onDone={() => setRecovering(false)} />;
  }

  return session ? <Dashboard email={session.user.email ?? ''} /> : <LoginScreen />;
}
