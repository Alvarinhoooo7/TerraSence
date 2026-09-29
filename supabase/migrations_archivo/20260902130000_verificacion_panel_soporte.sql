-- Verificación posterior (mismo espíritu que 20260827150000): confirma que
-- ya no queda ninguna función del panel de soporte ejecutable por `anon`.
-- Sólo lectura.

DO $$
DECLARE
    v_fn TEXT;
    v_anon BOOLEAN;
    v_auth BOOLEAN;
    v_any_leak BOOLEAN := FALSE;
BEGIN
    FOREACH v_fn IN ARRAY ARRAY[
        'public.admin_approve_device_member(uuid,uuid)',
        'public.admin_toggle_user_status(uuid,text)',
        'public.admin_unbind_user_device(uuid,uuid)',
        'public.get_admin_dashboard_full_data()',
        'public.admin_search(text)',
        'public.admin_get_device_detail(uuid)',
        'public.admin_set_member_authorized(uuid,uuid,boolean)',
        'public.admin_set_member_role(uuid,uuid,text)',
        'public.admin_push_firmware_update(uuid,uuid)',
        'public.admin_rotate_invite_code(text)',
        'public.admin_set_staff_active(uuid,boolean)',
        'public.support_self_register(text,text)',
        'public.is_support_staff()'
    ]
    LOOP
        v_anon := has_function_privilege('anon', v_fn::regprocedure, 'EXECUTE');
        v_auth := has_function_privilege('authenticated', v_fn::regprocedure, 'EXECUTE');
        IF v_anon THEN v_any_leak := TRUE; END IF;
        RAISE NOTICE '% -> anon=% authenticated=%', v_fn, v_anon, v_auth;
    END LOOP;

    IF v_any_leak THEN
        RAISE EXCEPTION 'Fuga: alguna función de soporte sigue ejecutable por anon.';
    ELSE
        RAISE NOTICE 'OK: ninguna función de soporte es ejecutable por anon.';
    END IF;
END $$;
