-- La migración anterior (20260902240000) ya quedó marcada como aplicada en
-- el remoto ANTES de que se le agregara el cast ::INTEGER a battery_level
-- (smallint en la tabla real) — el CLI decide qué aplicar por nombre de
-- archivo, no por contenido, así que editarla después de aplicada no tiene
-- ningún efecto. Se repite aquí el CREATE OR REPLACE con el cast que faltaba.
CREATE OR REPLACE FUNCTION public.admin_search(p_query TEXT)
RETURNS TABLE (
    device_id             UUID,
    device_code           TEXT,
    name                  TEXT,
    alias                 TEXT,
    is_active             BOOLEAN,
    battery_level         INTEGER,
    last_seen_at          TIMESTAMPTZ,
    matched_member_email  TEXT,
    match_reason          TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_clean TEXT := TRIM(COALESCE(p_query, ''));
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    IF length(v_clean) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT s.device_id, s.device_code, s.name, s.alias, s.is_active, s.battery_level,
           s.last_seen_at, s.matched_member_email, s.match_reason
      FROM (
        SELECT d.id AS device_id, d.device_code::TEXT, d.name::TEXT, d.alias::TEXT, d.is_active,
               d.battery_level::INTEGER, d.last_seen_at,
               NULL::TEXT AS matched_member_email, 'device'::TEXT AS match_reason
          FROM public.devices d
         WHERE d.device_code ILIKE '%' || v_clean || '%'
            OR d.name ILIKE '%' || v_clean || '%'
            OR COALESCE(d.alias, '') ILIKE '%' || v_clean || '%'

        UNION

        SELECT d.id, d.device_code::TEXT, d.name::TEXT, d.alias::TEXT, d.is_active,
               d.battery_level::INTEGER, d.last_seen_at,
               p.email::TEXT, 'member_email'::TEXT
          FROM public.device_members dm
          JOIN public.devices d ON d.id = dm.device_id
          JOIN public.profiles p ON p.id = dm.user_id
         WHERE p.email ILIKE '%' || v_clean || '%'
      ) s
     ORDER BY s.last_seen_at DESC NULLS LAST
     LIMIT 50;
END;
$$;

-- Verificación final con rol real 'authenticated' (equivalente a lo que hace
-- PostgREST), cambiado y revertido dentro del MISMO DO block para no
-- interferir con la contabilidad de migraciones del CLI al final del
-- archivo. Sólo lectura.
DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub":"df626477-9c4f-4c73-964a-86a4dc3fff33","role":"authenticated"}', true);
    PERFORM set_config('role', 'authenticated', true);

    FOR r IN SELECT * FROM public.admin_search('465719423880094') LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'por código -> device_id=% device_code=% name=% battery=%',
            r.device_id, r.device_code, r.name, r.battery_level;
    END LOOP;
    RAISE NOTICE 'admin_search por código: % filas', v_count;

    v_count := 0;
    FOR r IN SELECT * FROM public.admin_search('demo.agricultor@terrasense.cl') LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'por correo -> device_id=% device_code=% matched=%',
            r.device_id, r.device_code, r.matched_member_email;
    END LOOP;
    RAISE NOTICE 'admin_search por correo: % filas', v_count;

    -- De paso, confirma que admin_get_device_detail() también sobrevive con
    -- rol real (jsonb no tiene el problema de varchar/text, pero nunca se
    -- había probado con auth.uid() resuelto de verdad).
    -- Nota: aquí NO se puede hacer un SELECT suelto a public.devices para
    -- obtener el id -- a diferencia de las funciones SECURITY DEFINER, un
    -- SELECT plano dentro de este bloque corre con privilegios reales de
    -- 'authenticated' y la RLS se lo esconde (no es miembro de este equipo,
    -- correcto). El id sale de admin_search(), que sí es SECURITY DEFINER.
    PERFORM public.admin_get_device_detail('fd3668be-f527-4766-8d50-f6eb8f938d05'::UUID);
    RAISE NOTICE 'admin_get_device_detail: OK, no lanzó excepción.';

    -- Revierte el rol ANTES de que termine este DO block, para no romper el
    -- INSERT de contabilidad del CLI que corre justo después.
    PERFORM set_config('role', 'postgres', true);
END $$;
