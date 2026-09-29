-- =============================================================================
-- ARREGLO — admin_search() nunca funcionó: varchar vs text en RETURN QUERY
-- =============================================================================
-- `devices.device_code`/`name`/`alias` (y probablemente `profiles.email`) son
-- `character varying`, pero la función los declaraba como `TEXT` en su
-- RETURNS TABLE. Dentro de un `RETURN QUERY`, Postgres exige coincidencia
-- exacta de tipo — a diferencia de un SELECT suelto, no hace el cast
-- implícito solo. El error quedó sin detectar hasta ahora porque sólo se
-- podía probar con una sesión autenticada real (auth.uid() no existe dentro
-- de una migración corriendo como postgres); se reprodujo simulando el JWT
-- de un usuario de soporte real.
--
-- Se corrige con ::TEXT explícito en cada columna de tipo texto. De paso se
-- blinda list_device_members() con el mismo casteo, por si su COALESCE no
-- resolvía a TEXT en algún caso límite.
-- =============================================================================

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

CREATE OR REPLACE FUNCTION public.list_device_members(p_device_id UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, role TEXT, is_authorized BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF NOT public.has_device_admin_access(p_device_id) THEN
        RAISE EXCEPTION 'No tienes permisos para administrar este equipo.' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT dm.user_id,
           TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))::TEXT,
           COALESCE(p.email, u.email::TEXT, '')::TEXT,
           dm.role::TEXT, COALESCE(dm.is_authorized, TRUE)
      FROM public.device_members dm
      LEFT JOIN public.profiles p ON p.id = dm.user_id
      LEFT JOIN auth.users u ON u.id = dm.user_id
     WHERE dm.device_id = p_device_id
     ORDER BY CASE dm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
              COALESCE(p.email, u.email, '');
END; $$;
