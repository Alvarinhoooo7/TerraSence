-- =============================================================================
-- Endurecer permisos y search_path de funciones
-- =============================================================================
-- Continuación de la revisión de seguridad que abrió el aviso de Supabase sobre
-- `spatial_ref_sys`. Resuelve los avisos que quedaban de los advisors:
--
--   * anon_security_definer_function_executable (8)
--   * function_search_path_mutable (2)
--
-- Postgres concede EXECUTE a PUBLIC en cada función nueva, y en Supabase PUBLIC
-- incluye a `anon`: la clave anónima podía invocar funciones SECURITY DEFINER,
-- que corren con los privilegios del dueño y saltándose las políticas RLS.
--
-- Nota sobre los triggers: Postgres comprueba el EXECUTE de la función de
-- trigger al CREAR el trigger, no al dispararlo. Retirar el permiso a los roles
-- de cliente no afecta a los triggers ya instalados; `postgres`, que es el dueño
-- y quien aplica las migraciones, lo conserva.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. search_path fijo
-- -----------------------------------------------------------------------------
-- Sin `search_path` fijado, quien invoca la función decide desde qué esquema se
-- resuelven los nombres sin cualificar y puede anteponer objetos propios. Ambas
-- funciones ya cualifican todo lo que usan (`public.devices`) o solo llaman a
-- `pg_catalog` (NOW, RANDOM, FLOOR), que se busca siempre primero, así que la
-- lista vacía es segura y no cambia su comportamiento.

ALTER FUNCTION public.set_updated_at()       SET search_path = '';
ALTER FUNCTION public.generate_device_code() SET search_path = '';

-- -----------------------------------------------------------------------------
-- 2. Funciones de trigger: ningún cliente necesita invocarlas
-- -----------------------------------------------------------------------------
-- Las siete son SECURITY DEFINER y devuelven `trigger`, de modo que llamarlas
-- sueltas falla; aun así no hay razón para que figuren en la superficie de la
-- API. `set_updated_at` se incluye por coherencia.

REVOKE EXECUTE ON FUNCTION public.check_device_administrator()              FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                         FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.invalidate_empty_device_invite()          FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.link_device_creator()                     FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.log_device_status_change()                FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.mark_onboarding_from_membership()         FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_device_member_authorization_default() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()                          FROM PUBLIC, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. has_device_access: solo sesiones autenticadas
-- -----------------------------------------------------------------------------
-- Es la única de las ocho que devuelve un valor y se puede llamar por RPC. Se
-- usa dentro de las políticas RLS de push_alerts, device_status_log, devices,
-- soil_measurements y predial_quadrants, todas restringidas a `authenticated`,
-- que por tanto necesita conservar el EXECUTE para que esas políticas evalúen.
-- `anon` no aparece en ninguna de ellas y solo obtenía un oráculo con el que
-- sondear qué device_id existen.

REVOKE EXECUTE ON FUNCTION public.has_device_access(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_device_access(UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. generate_device_code: solo el servidor
-- -----------------------------------------------------------------------------
-- Es el DEFAULT de `devices.device_code`. No hay política INSERT sobre `devices`
-- para `authenticated` —el alta pasa siempre por RPCs SECURITY DEFINER que
-- corren como `postgres`—, así que ningún rol de cliente necesita ejecutarla.
-- Expuesta permitía sondear qué códigos de equipo ya están tomados.

REVOKE EXECUTE ON FUNCTION public.generate_device_code() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.generate_device_code() TO service_role;

-- -----------------------------------------------------------------------------
-- 5. Verificación
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    fugas TEXT;
BEGIN
    SELECT string_agg(p.proname, ', ')
      INTO fugas
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
           'check_device_administrator', 'handle_new_user', 'has_device_access',
           'invalidate_empty_device_invite', 'link_device_creator',
           'log_device_status_change', 'mark_onboarding_from_membership',
           'set_device_member_authorization_default', 'generate_device_code',
           'set_updated_at')
       AND has_function_privilege('anon', p.oid, 'EXECUTE');

    IF fugas IS NOT NULL THEN
        RAISE EXCEPTION 'anon todavía puede ejecutar: %', fugas;
    END IF;

    SELECT string_agg(p.proname, ', ')
      INTO fugas
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('set_updated_at', 'generate_device_code')
       AND p.proconfig IS NULL;

    IF fugas IS NOT NULL THEN
        RAISE EXCEPTION 'sin search_path fijo: %', fugas;
    END IF;

    IF NOT has_function_privilege('authenticated', 'public.has_device_access(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'authenticated perdió EXECUTE sobre has_device_access: rompería las politicas RLS';
    END IF;
END
$$;
