-- Diagnóstico: por qué el buscador no encuentra el equipo demo. Sólo
-- lectura, sin DDL. Corre la MISMA consulta que admin_search() pero sin la
-- comprobación is_support_staff() (auth.uid() no existe en una migración,
-- así que llamar a la función tal cual siempre daría 42501 aquí) — aísla si
-- el problema es el predicado/datos o la puerta de acceso.
DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
    v_staff RECORD;
BEGIN
    FOR r IN
        SELECT d.id AS device_id, d.device_code, d.name, d.alias, d.is_active
          FROM public.devices d
         WHERE d.device_code ILIKE '%465719423880094%'
            OR d.name ILIKE '%465719423880094%'
            OR COALESCE(d.alias, '') ILIKE '%465719423880094%'
        UNION
        SELECT d.id, d.device_code, d.name, d.alias, d.is_active
          FROM public.device_members dm
          JOIN public.devices d ON d.id = dm.device_id
          JOIN public.profiles p ON p.id = dm.user_id
         WHERE p.email ILIKE '%demo.agricultor@terrasense.cl%'
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'match: device_id=% code=% name=% alias=% active=%',
            r.device_id, r.device_code, r.name, r.alias, r.is_active;
    END LOOP;
    RAISE NOTICE 'total de filas que debería devolver admin_search: %', v_count;

    FOR v_staff IN SELECT user_id, email, is_active FROM public.admin_support_users LOOP
        RAISE NOTICE 'admin_support_users: user_id=% email=% is_active=%',
            v_staff.user_id, v_staff.email, v_staff.is_active;
    END LOOP;
END $$;
