-- =============================================================================
-- AUDITORÍA — funciones de soporte/administración ya presentes en el remoto
-- =============================================================================
-- Sólo emite RAISE NOTICE (mismo patrón que 20260827130000): el gen types
-- reveló funciones `admin_*` y `get_admin_dashboard_full_data` que no tienen
-- migración en este repositorio (pertenecen al esquema base adoptado, igual
-- que `admin_support_users`). Antes de construir el panel de control hay que
-- saber qué hacen exactamente y si ya son seguras. No modifica nada.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.proname,
               pg_get_functiondef(p.oid) AS def
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN (
             'admin_approve_device_member',
             'admin_toggle_user_status',
             'admin_unbind_user_device',
             'get_admin_dashboard_full_data',
             'has_device_admin_access',
             'has_device_access'
           )
         ORDER BY p.proname
    LOOP
        RAISE NOTICE '=== % ===', r.proname;
        RAISE NOTICE '%', r.def;
    END LOOP;
END $$;

-- También interesa saber si admin_support_users tiene filas ya, y si RLS
-- está activo sobre ella (no aparecía en la auditoría original del 27-08).
-- El detalle de políticas queda en la migración siguiente (aquí se corrigió
-- un nombre de columna que hacía fallar toda la transacción).
DO $$
DECLARE
    v_count INTEGER;
    v_rls BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.admin_support_users;
    SELECT relrowsecurity INTO v_rls FROM pg_class
     WHERE relname = 'admin_support_users' AND relnamespace = 'public'::regnamespace;
    RAISE NOTICE 'admin_support_users: % filas, RLS activo = %', v_count, v_rls;
END $$;
