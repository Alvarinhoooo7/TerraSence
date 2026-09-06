// src/components/AccountConfirmed.tsx
//
// Aterrizaje del enlace de confirmación de cuenta que reciben los agricultores.
//
// Antes no existía: `signUp()` en la app móvil no fijaba `emailRedirectTo`, así que
// Supabase usaba el `site_url` del proyecto —esta consola— y el agricultor acababa
// en el backoffice de soporte. Con sesión válida y sin pertenecer a
// `admin_support_users`, lo que veía era `SupportOnboarding`: un formulario
// pidiéndole un código de invitación para darse de alta como personal de soporte.
// Confirmar la cuenta funcionaba, pero el destino no era el suyo.
//
// Esta pantalla se resuelve ANTES de comprobar la sesión, así que nunca cae en esa
// rama. Cierra además la sesión que el propio enlace abre en el navegador: la
// cuenta se usa desde la app, y no tiene sentido dejarla abierta en un equipo que
// puede no ser suyo.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Smartphone } from 'lucide-react';
import { supabase } from '../services/supabase';

export function AccountConfirmed() {
  // La sesión del enlace se cierra en segundo plano; el mensaje no depende de
  // que termine, porque el agricultor ya tiene la cuenta confirmada igualmente.
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth
      .signOut()
      .catch(() => undefined)
      .finally(() => {
        if (active) setSignedOut(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-terra-bg px-6 transition-colors duration-500">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 18 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-terra-primary/10"
        >
          <CheckCircle2 className="h-11 w-11 text-terra-primary" strokeWidth={1.75} />
        </motion.div>

        <h1 className="text-2xl font-bold text-terra-text mb-3">Cuenta confirmada</h1>

        <p className="text-terra-muted leading-relaxed mb-8">
          Tu cuenta de TerraSense quedó activa. Ya puedes cerrar esta pestaña y volver a la
          aplicación para iniciar sesión.
        </p>

        <div className="flex items-center justify-center gap-2 rounded-xl border border-terra-border bg-terra-card px-4 py-3 text-sm text-terra-muted">
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>Abre TerraSense en tu teléfono e inicia sesión con este correo.</span>
        </div>

        <p className="mt-6 text-xs text-terra-muted/70">
          {signedOut
            ? 'Por seguridad, la sesión de este navegador se cerró.'
            : 'Cerrando la sesión de este navegador…'}
        </p>
      </motion.div>
    </div>
  );
}
