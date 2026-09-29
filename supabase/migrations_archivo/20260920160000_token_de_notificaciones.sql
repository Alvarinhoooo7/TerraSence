-- Token de notificaciones push del agricultor.
--
-- `App/src/services/notifications.ts` escribe este valor al conceder el permiso y lo
-- borra al cerrar sesión; la Edge Function `send-push-alert` lo lee para saber a dónde
-- enviar cada aviso. La columna nunca se creó: ninguna migración la declara. La app
-- envuelve su escritura en un `catch` que devuelve `null`, así que el error de PostgREST
-- se perdía en silencio y la función se quedaba sin destinatarios. El circuito de
-- alertas nunca llegó a cerrarse.
--
-- Se detectó contrastando lo que los clientes consultan contra el esquema real, el
-- mismo tipo de desfase que dejó `data_generation` sin aplicar.
--
-- No hacen falta políticas nuevas: `ts_profiles_select_own` y `ts_profiles_update_own`
-- ya acotan la fila al dueño, y `protect_onboarding_fields` sólo vigila las columnas de
-- onboarding. La Edge Function usa `service_role` y no pasa por RLS.

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

COMMENT ON COLUMN public.profiles.push_token IS
    'Token de Expo para notificaciones push. Lo escribe el dueño de la fila al conceder '
    'el permiso y se limpia al cerrar sesión. Nulo significa que no hay dispositivo '
    'registrado para avisos.';

COMMIT;
