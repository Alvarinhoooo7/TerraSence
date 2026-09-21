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
import { CheckCircle2, Smartphone } from 'lucide-react';
import { supabase } from '../services/supabase';
import { BrandLogo } from './BrandLogo';

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
    <div className="flex min-h-screen items-center justify-center bg-terra-bg p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <BrandLogo className="h-14 w-48" title="" />
        </div>

        <div className="panel flex flex-col items-center gap-4 p-7">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-verdict-green-soft text-verdict-green">
            <CheckCircle2 size={28} strokeWidth={1.75} aria-hidden="true" />
          </span>

          <div>
            <h1 className="text-lg font-semibold text-terra-text">Cuenta confirmada</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-terra-muted">
              Tu cuenta de TerraSense quedó activa. Ya puedes cerrar esta pestaña y volver a la
              aplicación para iniciar sesión.
            </p>
          </div>

          <p className="flex items-center gap-2 rounded-md border border-terra-border bg-terra-raised px-3.5 py-2.5 text-sm text-terra-muted">
            <Smartphone size={15} className="shrink-0" aria-hidden="true" />
            <span>Abre TerraSense en tu teléfono e inicia sesión con este correo.</span>
          </p>

          <p className="text-xs text-terra-faint" role="status">
            {signedOut
              ? 'Por seguridad, la sesión de este navegador se cerró.'
              : 'Cerrando la sesión de este navegador…'}
          </p>
        </div>
      </div>
    </div>
  );
}
