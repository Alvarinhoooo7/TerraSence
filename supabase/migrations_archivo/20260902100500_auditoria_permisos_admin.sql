-- Continuación de la auditoría anterior: la consulta de políticas falló por
-- una columna mal nombrada (roles -> polroles). Corrige eso y añade lo que
-- falta para diseñar el panel de soporte: quién puede ejecutar hoy las
-- funciones admin_*, y el contenido/columnas por defecto relevantes.
-- Sólo lectura, sin DDL.

DO $$
DECLARE
    v_pol RECORD;
    v_row RECORD;
    v_fn TEXT;
BEGIN
    FOR v_pol IN
        SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr,
               pg_get_expr(polwithcheck, polrelid) AS check_expr,
               (SELECT array_agg(rolname) FROM pg_roles WHERE oid = ANY(polroles)) AS role_names
          FROM pg_policy
         WHERE polrelid = 'public.admin_support_users'::regclass
    LOOP
        RAISE NOTICE 'admin_support_users policy % cmd=% using=% check=% roles=%',
            v_pol.polname, v_pol.polcmd, v_pol.using_expr, v_pol.check_expr, v_pol.role_names;
    END LOOP;

    FOR v_row IN SELECT id, email, full_name, is_active, created_at FROM public.admin_support_users LOOP
        RAISE NOTICE 'admin_support_users row: id=% email=% full_name=% is_active=% created_at=%',
            v_row.id, v_row.email, v_row.full_name, v_row.is_active, v_row.created_at;
    END LOOP;

    FOREACH v_fn IN ARRAY ARRAY[
        'public.admin_approve_device_member(uuid,uuid)',
        'public.admin_toggle_user_status(uuid,text)',
        'public.admin_unbind_user_device(uuid,uuid)',
        'public.get_admin_dashboard_full_data()'
    ]
    LOOP
        RAISE NOTICE 'EXECUTE % -> anon=% authenticated=% service_role=%',
            v_fn,
            has_function_privilege('anon', v_fn::regprocedure, 'EXECUTE'),
            has_function_privilege('authenticated', v_fn::regprocedure, 'EXECUTE'),
            has_function_privilege('service_role', v_fn::regprocedure, 'EXECUTE');
    END LOOP;

    RAISE NOTICE '--- profiles: id es FK real a auth.users? ---';
    FOR v_row IN
        SELECT conname, pg_get_constraintdef(oid) AS def
          FROM pg_constraint
         WHERE conrelid = 'public.profiles'::regclass AND contype = 'f'
    LOOP
        RAISE NOTICE 'profiles FK % -> %', v_row.conname, v_row.def;
    END LOOP;

    RAISE NOTICE '--- device_members: valores distintos de role hoy en uso ---';
    FOR v_row IN SELECT DISTINCT role FROM public.device_members LOOP
        RAISE NOTICE 'device_members.role en uso: %', v_row.role;
    END LOOP;

    RAISE NOTICE '--- profiles: valores distintos de status/role hoy en uso ---';
    FOR v_row IN SELECT DISTINCT status, role FROM public.profiles LOOP
        RAISE NOTICE 'profiles status=% role=%', v_row.status, v_row.role;
    END LOOP;
END $$;
