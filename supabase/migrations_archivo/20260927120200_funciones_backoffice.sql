-- =============================================================================
-- FUNCIONES DEL BACKOFFICE DE CUENTA ÚNICA
-- =============================================================================
-- El backoffice se reduce a Buscar y a la pantalla del equipo, con una función
-- por tarjeta para que cada Refrescar recargue sólo lo suyo:
--
--   admin_search               ID de equipo o correo -> filas equipo/cliente
--   admin_device_status        tarjeta Estado
--   admin_device_members       tarjeta Usuarios
--   admin_device_measurements  tarjeta Mediciones (últimas 5)
--   admin_make_admin           Hacer administrador (el anterior pasa a usuario)
--   admin_approve_member       Aceptar solicitud pendiente
--   admin_reject_member        Rechazar solicitud pendiente
--   admin_reset_device         Reset global
--
-- Se eliminan las funciones de la consola anterior (flota, mediciones de la
-- flota, ficha única, gestión de estado de perfiles): nadie las llama ya y
-- cada función SECURITY DEFINER de más es superficie que auditar.
-- =============================================================================

DROP FUNCTION IF EXISTS public.admin_search(TEXT);
DROP FUNCTION IF EXISTS public.admin_get_device_detail(UUID);
DROP FUNCTION IF EXISTS public.admin_list_fleet();
DROP FUNCTION IF EXISTS public.admin_list_recent_measurements(INTEGER);
DROP FUNCTION IF EXISTS public.admin_push_firmware_update(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_admin_dashboard_full_data();
DROP FUNCTION IF EXISTS public.admin_set_member_role(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_set_member_authorized(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_approve_device_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_unbind_user_device(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_factory_reset_device(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.assert_support_staff()
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'Operación no permitida.' USING ERRCODE = '42501';
    END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_support_staff() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Buscar
-- ---------------------------------------------------------------------------
-- Con «@» o letras busca por correo; con sólo dígitos, espacios y guiones,
-- por ID. Por ID devuelve una fila por cada usuario enlazado (y una sin
-- usuario si el equipo está libre); por correo, los equipos de ese cliente.
CREATE FUNCTION public.admin_search(p_query TEXT)
RETURNS TABLE (
    device_id     UUID,
    device_code   TEXT,
    user_id       UUID,
    first_name    TEXT,
    last_name     TEXT,
    email         TEXT,
    role          TEXT,
    is_authorized BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_q      TEXT := lower(trim(COALESCE(p_query, '')));
    v_digits TEXT := regexp_replace(COALESCE(p_query, ''), '\D', '', 'g');
BEGIN
    PERFORM public.assert_support_staff();
    IF length(v_q) < 3 THEN RETURN; END IF;

    IF v_q ~ '^[0-9\s-]+$' THEN
        IF length(v_digits) < 3 THEN RETURN; END IF;
        RETURN QUERY
        SELECT d.id, d.device_code::TEXT, u.id, p.first_name, p.last_name, u.email::TEXT,
               dm.role::TEXT, dm.is_authorized
          FROM public.devices d
          LEFT JOIN public.device_members dm ON dm.device_id = d.id
          LEFT JOIN auth.users u ON u.id = dm.user_id
          LEFT JOIN public.profiles p ON p.id = dm.user_id
         WHERE strpos(d.device_code, v_digits) > 0
         ORDER BY d.device_code, (dm.role = 'admin') DESC NULLS LAST, dm.is_authorized DESC NULLS LAST,
                  p.first_name, u.email
         LIMIT 100;
    ELSE
        RETURN QUERY
        SELECT d.id, d.device_code::TEXT, u.id, p.first_name, p.last_name, u.email::TEXT,
               dm.role::TEXT, dm.is_authorized
          FROM public.device_members dm
          JOIN public.devices d ON d.id = dm.device_id
          JOIN auth.users u ON u.id = dm.user_id
          LEFT JOIN public.profiles p ON p.id = dm.user_id
         WHERE strpos(lower(u.email), v_q) > 0
         ORDER BY u.email, d.device_code
         LIMIT 100;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Tarjetas del equipo
-- ---------------------------------------------------------------------------
-- «Online» lo decide el reloj del servidor: la app habló con la sonda hace
-- menos de 15 minutos.
CREATE FUNCTION public.admin_device_status(p_device_id UUID)
RETURNS TABLE (
    device_id        UUID,
    device_code      TEXT,
    battery_level    INTEGER,
    firmware_version TEXT,
    first_seen_at    TIMESTAMPTZ,
    last_seen_at     TIMESTAMPTZ,
    is_online        BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT d.id, d.device_code::TEXT, d.battery_level::INTEGER, d.firmware_version::TEXT,
           d.first_seen_at, d.last_seen_at,
           COALESCE(d.last_seen_at > now() - interval '15 minutes', FALSE)
      FROM public.devices d
     WHERE d.id = p_device_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;
END $$;

CREATE FUNCTION public.admin_device_members(p_device_id UUID)
RETURNS TABLE (
    user_id       UUID,
    first_name    TEXT,
    last_name     TEXT,
    email         TEXT,
    role          TEXT,
    is_authorized BOOLEAN,
    created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT dm.user_id, p.first_name, p.last_name, u.email::TEXT, dm.role::TEXT, dm.is_authorized, dm.created_at
      FROM public.device_members dm
      JOIN auth.users u ON u.id = dm.user_id
      LEFT JOIN public.profiles p ON p.id = dm.user_id
     WHERE dm.device_id = p_device_id
     ORDER BY (dm.role = 'admin') DESC, dm.is_authorized DESC, dm.created_at;
END $$;

-- El pronóstico y el consejo viajan dentro de `diagnosis`, tal como los
-- guardó la app al medir; aquí sólo se extraen.
CREATE FUNCTION public.admin_device_measurements(p_device_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    id                  UUID,
    measured_at         TIMESTAMPTZ,
    phenological_stage  TEXT,
    vwc_percent         NUMERIC,
    soil_temp_c         NUMERIC,
    ec_us_cm            INTEGER,
    ph                  NUMERIC,
    nitrogen            INTEGER,
    phosphorus          INTEGER,
    potassium           INTEGER,
    canopy_temp_c       NUMERIC,
    canopy_humidity_pct NUMERIC,
    air_pressure_hpa    NUMERIC,
    battery_percent     INTEGER,
    weather             JSONB,
    verdict             TEXT,
    verdict_title       TEXT,
    action_summary      TEXT,
    latitude            NUMERIC,
    longitude           NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT m.id, m.measured_at, m.phenological_stage, m.vwc_percent, m.soil_temp_c, m.ec_us_cm, m.ph,
           m.nitrogen, m.phosphorus, m.potassium, m.canopy_temp_c, m.canopy_humidity_pct,
           m.air_pressure_hpa, m.battery_percent::INTEGER,
           NULLIF(m.diagnosis -> 'weather', 'null'::jsonb),
           m.verdict::TEXT, m.verdict_title, m.action_summary, m.latitude, m.longitude
      FROM public.soil_measurements m
     WHERE m.device_id = p_device_id
     ORDER BY m.measured_at DESC NULLS LAST
     LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 50);
END $$;

-- ---------------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.admin_make_admin(p_device_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    PERFORM public.change_device_membership(p_device_id, p_user_id, 'transfer_owner');
END $$;

CREATE FUNCTION public.admin_approve_member(p_device_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    IF NOT EXISTS (SELECT 1 FROM public.device_members
                    WHERE device_id = p_device_id AND user_id = p_user_id AND is_authorized IS NOT TRUE) THEN
        RAISE EXCEPTION 'No hay una solicitud pendiente de ese usuario.' USING ERRCODE = '22023';
    END IF;
    PERFORM public.change_device_membership(p_device_id, p_user_id, 'authorize');
    UPDATE public.push_alerts SET is_read = TRUE
     WHERE device_id = p_device_id AND requester_user_id = p_user_id AND event_type = 'access_request';
END $$;

-- Rechazar elimina la solicitud: el usuario puede volver a pedir acceso.
CREATE FUNCTION public.admin_reject_member(p_device_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    IF NOT EXISTS (SELECT 1 FROM public.device_members
                    WHERE device_id = p_device_id AND user_id = p_user_id AND is_authorized IS NOT TRUE) THEN
        RAISE EXCEPTION 'No hay una solicitud pendiente de ese usuario.' USING ERRCODE = '22023';
    END IF;
    PERFORM public.change_device_membership(p_device_id, p_user_id, 'remove');
    DELETE FROM public.push_alerts
     WHERE device_id = p_device_id AND requester_user_id = p_user_id AND event_type = 'access_request';
END $$;

-- ---------------------------------------------------------------------------
-- Reset global
-- ---------------------------------------------------------------------------
-- Deja el equipo como de fábrica: sin usuarios, solicitudes, mediciones,
-- alertas, invitaciones ni historial, y sin conexiones registradas. Conserva
-- el ID (es el que lleva grabado la sonda) y la versión de hardware. La
-- generación de datos avanza para que la app borre también su copia local.
CREATE FUNCTION public.admin_reset_device(p_device_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_device  public.devices;
    v_members INTEGER;
    v_meas    INTEGER;
BEGIN
    PERFORM public.assert_support_staff();

    SELECT * INTO v_device FROM public.devices WHERE id = p_device_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;

    SELECT count(*) INTO v_members FROM public.device_members WHERE device_id = p_device_id;
    SELECT count(*) INTO v_meas FROM public.soil_measurements WHERE device_id = p_device_id;

    INSERT INTO public.device_data_resets (user_id, device_id, generation)
    SELECT user_id, device_id, v_device.data_generation + 1 FROM public.device_members WHERE device_id = p_device_id
    ON CONFLICT (user_id, device_id) DO UPDATE SET generation = EXCLUDED.generation;

    DELETE FROM public.device_members        WHERE device_id = p_device_id;
    DELETE FROM public.soil_measurements     WHERE device_id = p_device_id;
    DELETE FROM public.push_alerts           WHERE device_id = p_device_id;
    DELETE FROM public.device_access_invites WHERE device_id = p_device_id;

    UPDATE public.devices
       SET data_generation = data_generation + 1,
           name = 'Sonda TerraSense',
           alias = NULL,
           pairing_mode_active = FALSE,
           battery_level = NULL,
           first_seen_at = NULL,
           last_seen_at = NULL,
           last_measurement_at = NULL
     WHERE id = p_device_id;
    -- Después del UPDATE: también se va la fila que el trigger acaba de registrar.
    DELETE FROM public.device_status_log WHERE device_id = p_device_id;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, action)
    VALUES (p_device_id, auth.uid(), 'factory_reset');

    RETURN jsonb_build_object('members_removed', v_members, 'measurements_deleted', v_meas);
END $$;

-- ---------------------------------------------------------------------------
-- Permisos: sólo sesiones autenticadas; el filtro real es assert_support_staff.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    f TEXT;
BEGIN
    FOREACH f IN ARRAY ARRAY[
        'public.admin_search(TEXT)',
        'public.admin_device_status(UUID)',
        'public.admin_device_members(UUID)',
        'public.admin_device_measurements(UUID, INTEGER)',
        'public.admin_make_admin(UUID, UUID)',
        'public.admin_approve_member(UUID, UUID)',
        'public.admin_reject_member(UUID, UUID)',
        'public.admin_reset_device(UUID)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    END LOOP;
END $$;
