-- Verificación puntual de la migración anterior. Sólo lectura.
DO $$
DECLARE v_anon BOOLEAN; v_auth BOOLEAN;
BEGIN
    v_anon := has_function_privilege('anon', 'public.admin_factory_reset_device(uuid,text)'::regprocedure, 'EXECUTE');
    v_auth := has_function_privilege('authenticated', 'public.admin_factory_reset_device(uuid,text)'::regprocedure, 'EXECUTE');
    RAISE NOTICE 'admin_factory_reset_device -> anon=% authenticated=%', v_anon, v_auth;
    IF v_anon THEN
        RAISE EXCEPTION 'Fuga: admin_factory_reset_device es ejecutable por anon.';
    END IF;
END $$;
