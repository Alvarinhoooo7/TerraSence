-- =============================================================================
-- TERRASENSE — ONBOARDING PERSISTENTE POR CUENTA
-- =============================================================================
-- El estado vive en `profiles`, no en AsyncStorage. De esta forma una persona
-- que reinstala la app o cambia de teléfono no vuelve a ver el onboarding.
--
-- La membresía de `device_members` se mantiene como segunda fuente de verdad:
-- la app considera migrado automáticamente a cualquier usuario que ya tenga
-- acceso a un equipo, aunque su perfil sea anterior a estas columnas.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS onboarding_method TEXT;

DO $$ BEGIN
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_onboarding_method_check
        CHECK (onboarding_method IS NULL OR onboarding_method IN ('qr', 'pairing'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
    'Fecha en que la cuenta terminó la vinculación inicial. Persistir en servidor '
    'evita repetir el onboarding después de reinstalar la aplicación.';

COMMENT ON COLUMN public.profiles.onboarding_method IS
    'Ruta utilizada para terminar el onboarding: qr (operador invitado) o '
    'pairing (primer propietario del equipo).';

-- Migra cuentas preexistentes que ya están vinculadas a por lo menos un equipo.
UPDATE public.profiles p
   SET onboarding_completed_at = COALESCE(p.onboarding_completed_at, NOW()),
       onboarding_method = COALESCE(p.onboarding_method,
           CASE
               WHEN EXISTS (
                   SELECT 1
                     FROM public.device_members dm
                    WHERE dm.user_id = p.id
                      AND dm.role = 'owner'
                      AND COALESCE(dm.is_authorized, TRUE)
               ) THEN 'pairing'
               ELSE 'qr'
           END)
 WHERE p.onboarding_completed_at IS NULL
   AND EXISTS (
       SELECT 1
         FROM public.device_members dm
        WHERE dm.user_id = p.id
          AND COALESCE(dm.is_authorized, TRUE)
   );
