-- Administración por equipo independiente del acceso al backoffice.
BEGIN;
LOCK TABLE public.devices, public.device_members IN SHARE ROW EXCLUSIVE MODE;

-- Los roles heredados se consolidan conservando al primer owner, o al primer
-- admin autorizado si no existe owner. Si un equipo heredado sólo tiene
-- pendientes, se recupera al primero como administrador para no dejarlo huérfano.
DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.device_members'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ~ '\mrole\M'
  LOOP EXECUTE format('ALTER TABLE public.device_members DROP CONSTRAINT %I', c.conname); END LOOP;
END $$;
CREATE TEMP TABLE elected_device_admin ON COMMIT DROP AS
SELECT DISTINCT ON (device_id) device_id, user_id
FROM public.device_members
ORDER BY device_id, CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         is_authorized DESC, created_at NULLS LAST, user_id;
UPDATE public.device_members SET role = 'user';
UPDATE public.device_members dm SET role = 'admin', is_authorized = TRUE
FROM elected_device_admin e WHERE e.device_id = dm.device_id AND e.user_id = dm.user_id;
ALTER TABLE public.device_members ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE public.device_members ADD CONSTRAINT device_members_two_roles CHECK (role IN ('admin', 'user'));
ALTER TABLE public.device_members ADD CONSTRAINT device_admin_authorized CHECK (role <> 'admin' OR is_authorized IS TRUE);
CREATE UNIQUE INDEX device_members_one_admin ON public.device_members(device_id) WHERE role = 'admin';

CREATE FUNCTION public.check_device_administrator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_device_id UUID; v_count BIGINT; v_admins BIGINT;
BEGIN
  v_device_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.device_id ELSE NEW.device_id END;
  SELECT count(*), count(*) FILTER (WHERE role = 'admin' AND is_authorized) INTO v_count, v_admins
    FROM public.device_members WHERE device_id = v_device_id;
  IF v_count > 0 AND v_admins <> 1 THEN
    RAISE EXCEPTION 'Todo equipo con miembros debe tener exactamente un administrador.' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_check_device_administrator
  AFTER INSERT OR UPDATE OR DELETE ON public.device_members DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_device_administrator();

CREATE OR REPLACE FUNCTION public.has_device_admin_access(p_device_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.device_members
    WHERE device_id = p_device_id AND user_id = auth.uid() AND role = 'admin' AND is_authorized IS TRUE);
$$;
CREATE OR REPLACE FUNCTION public.has_device_access(p_device_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.device_members
    WHERE device_id = p_device_id AND user_id = auth.uid() AND is_authorized IS TRUE);
$$;

-- Sólo RPCs pueden cambiar membresías; tampoco se permite borrar al último
-- administrador desde un DELETE directo o darse permisos mediante UPDATE.
REVOKE INSERT, UPDATE, DELETE ON public.device_members FROM anon, authenticated;
DROP POLICY IF EXISTS ts_devices_update_admin ON public.devices;
CREATE POLICY ts_devices_update_member ON public.devices FOR UPDATE TO authenticated
  USING (public.has_device_access(id)) WITH CHECK (public.has_device_access(id));
DROP TRIGGER IF EXISTS trg_link_device_creator ON public.devices;

-- El trigger heredado sólo autorizaba 'owner'; con dos roles impediría el
-- primer alta. Serializa la decisión por equipo, nunca por perfil global.
CREATE OR REPLACE FUNCTION public.set_device_member_authorization_default()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.devices WHERE id = NEW.device_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.device_members WHERE device_id = NEW.device_id) THEN
    NEW.role := 'admin'; NEW.is_authorized := TRUE;
  ELSE
    NEW.role := 'user'; NEW.is_authorized := FALSE;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_device_member_default_authorization ON public.device_members;
CREATE TRIGGER trg_device_member_default_authorization BEFORE INSERT ON public.device_members
  FOR EACH ROW EXECUTE FUNCTION public.set_device_member_authorization_default();

-- Entradas heredadas aceptaban el UUID de otra persona y códigos permanentes.
REVOKE ALL ON FUNCTION public.register_and_pair_device(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_device_access_qr(TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_onboarding_from_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_authorized IS TRUE THEN
    UPDATE public.profiles SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
      onboarding_method = COALESCE(onboarding_method, CASE WHEN NEW.role = 'admin' THEN 'pairing' ELSE 'qr' END)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.register_paired_device(p_code TEXT, p_name TEXT DEFAULT NULL)
RETURNS TABLE(device_id UUID) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_code TEXT; v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501'; END IF;
  v_code := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');
  IF v_code !~ '^[1-9][0-9]{14}$' THEN RAISE EXCEPTION 'Código inválido.' USING ERRCODE = '22023'; END IF;
  -- Serializa también las altas cuando todavía no existe la fila del equipo.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_code, 0));
  SELECT d.id INTO v_id FROM public.devices d WHERE d.device_code = v_code FOR UPDATE;
  IF v_id IS NULL THEN
    INSERT INTO public.devices(device_code, name, hardware_version, microclimate_sensor_type)
    VALUES(v_code, COALESCE(NULLIF(trim(p_name), ''), 'Sonda TerraSense'), 'ESP32-WROOM-32', 'BME280')
    RETURNING id INTO v_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.device_members dm WHERE dm.device_id = v_id) THEN
    UPDATE public.devices SET name = COALESCE(NULLIF(trim(p_name), ''), name) WHERE id = v_id;
    INSERT INTO public.device_members(device_id, user_id, role, is_authorized) VALUES(v_id, v_uid, 'admin', TRUE);
  ELSIF NOT public.has_device_access(v_id) THEN
    RAISE EXCEPTION 'El equipo ya tiene usuarios. Solicita acceso mediante su QR.' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY SELECT v_id;
END $$;

DROP FUNCTION public.join_device_by_code(TEXT);
CREATE FUNCTION public.join_device_by_code(p_code TEXT)
RETURNS TABLE(device_id UUID, device_name TEXT, is_authorized BOOLEAN, role TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_code TEXT; v_device public.devices; v_first BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501'; END IF;
  v_code := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');
  IF v_code !~ '^[1-9][0-9]{14}$' THEN RAISE EXCEPTION 'Código inválido.' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.device_join_attempts WHERE user_id = v_uid AND NOT succeeded
      AND attempted_at > NOW() - INTERVAL '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Demasiados intentos. Inténtalo en una hora.' USING ERRCODE = '54000';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_code, 0));
  SELECT * INTO v_device FROM public.devices d WHERE d.device_code = v_code FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.device_join_attempts(user_id, succeeded) VALUES(v_uid, FALSE);
    RETURN;
  END IF;
  v_first := NOT EXISTS(SELECT 1 FROM public.device_members dm WHERE dm.device_id = v_device.id);
  INSERT INTO public.device_members(device_id, user_id, role, is_authorized)
    VALUES(v_device.id, v_uid, CASE WHEN v_first THEN 'admin' ELSE 'user' END, v_first)
    ON CONFLICT DO NOTHING;
  -- Reescanear nunca aprueba una solicitud ni degrada al administrador.
  INSERT INTO public.device_join_attempts(user_id, succeeded) VALUES(v_uid, TRUE);
  RETURN QUERY SELECT v_device.id, v_device.name::TEXT, dm.is_authorized, dm.role::TEXT
    FROM public.device_members dm WHERE dm.device_id = v_device.id AND dm.user_id = v_uid;
END $$;
REVOKE ALL ON FUNCTION public.join_device_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_device_by_code(TEXT) TO authenticated;

-- Núcleo privado: ambas interfaces usan las mismas invariantes, cada una con
-- su autorización propia. El bloqueo del equipo serializa transferencias/reset.
CREATE FUNCTION public.change_device_membership(p_device_id UUID, p_user_id UUID, p_action TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target public.device_members;
BEGIN
  PERFORM 1 FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_target FROM public.device_members WHERE device_id = p_device_id AND user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no vinculado.' USING ERRCODE = 'P0002'; END IF;
  IF p_action = 'authorize' THEN
    UPDATE public.device_members SET is_authorized = TRUE WHERE device_id = p_device_id AND user_id = p_user_id;
  ELSIF p_action = 'transfer_owner' THEN
    IF v_target.is_authorized IS NOT TRUE OR v_target.role = 'admin' THEN
      RAISE EXCEPTION 'Selecciona otro usuario aprobado para delegar la administración.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.device_members SET role = 'user' WHERE device_id = p_device_id AND role = 'admin';
    UPDATE public.device_members SET role = 'admin' WHERE device_id = p_device_id AND user_id = p_user_id;
  ELSIF p_action = 'remove' THEN
    IF (SELECT count(*) FROM public.device_members WHERE device_id = p_device_id) <= 1 THEN
      RAISE EXCEPTION 'Debe quedar al menos un usuario. Para eliminar todos utiliza Reset.' USING ERRCODE = '22023';
    END IF;
    IF v_target.role = 'admin' THEN
      RAISE EXCEPTION 'Delega la administración antes de eliminar al administrador.' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.device_members WHERE device_id = p_device_id AND user_id = p_user_id;
  ELSE RAISE EXCEPTION 'Acción inválida.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.device_member_audit(device_id, actor_user_id, target_user_id, action, previous_role, new_role)
    VALUES(p_device_id, auth.uid(), p_user_id, p_action, v_target.role,
      CASE WHEN p_action = 'remove' THEN NULL WHEN p_action = 'transfer_owner' THEN 'admin' ELSE v_target.role END);
END $$;
REVOKE ALL ON FUNCTION public.change_device_membership(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.manage_device_member(p_device_id UUID, p_target_user_id UUID, p_action TEXT, p_role TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT public.has_device_admin_access(p_device_id) THEN
    RAISE EXCEPTION 'No tienes permisos para administrar este equipo.' USING ERRCODE = '42501';
  END IF;
  PERFORM public.change_device_membership(p_device_id, p_target_user_id, p_action);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_member_role(p_device_id UUID, p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_support_staff() THEN RAISE EXCEPTION 'No tienes acceso al backoffice.' USING ERRCODE = '42501'; END IF;
  IF p_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Sólo se permite delegar la administración.' USING ERRCODE = '22023'; END IF;
  PERFORM public.change_device_membership(p_device_id, p_user_id, 'transfer_owner');
  RETURN jsonb_build_object('success', TRUE);
END $$;
CREATE OR REPLACE FUNCTION public.admin_set_member_authorized(p_device_id UUID, p_user_id UUID, p_authorized BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_support_staff() THEN RAISE EXCEPTION 'No tienes acceso al backoffice.' USING ERRCODE = '42501'; END IF;
  IF p_authorized IS NOT TRUE THEN RAISE EXCEPTION 'Para quitar acceso elimina la vinculación.' USING ERRCODE = '22023'; END IF;
  PERFORM public.change_device_membership(p_device_id, p_user_id, 'authorize');
  RETURN jsonb_build_object('success', TRUE);
END $$;
CREATE OR REPLACE FUNCTION public.admin_unbind_user_device(p_device_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_support_staff() THEN RAISE EXCEPTION 'No tienes acceso al backoffice.' USING ERRCODE = '42501'; END IF;
  PERFORM public.change_device_membership(p_device_id, p_user_id, 'remove');
  RETURN jsonb_build_object('success', TRUE);
END $$;

-- is_support_staff consulta únicamente admin_support_users, nunca perfiles
-- de la app, correos coincidentes ni roles de device_members.
CREATE OR REPLACE FUNCTION public.is_support_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_support_users WHERE user_id = auth.uid() AND is_active IS TRUE);
$$;

CREATE OR REPLACE FUNCTION public.complete_my_onboarding(p_method TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid auth.users.id%TYPE := auth.uid();
    v_completed_at TIMESTAMPTZ := NOW();
    v_has_membership BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501';
    END IF;

    IF p_method NOT IN ('qr', 'pairing') THEN
        RAISE EXCEPTION 'Método de onboarding inválido.' USING ERRCODE = '22023';
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM public.device_members dm
         WHERE dm.user_id = v_uid
           AND COALESCE(dm.is_authorized, TRUE)
           AND (p_method <> 'pairing' OR dm.role = 'admin')
    ) INTO v_has_membership;

    IF NOT v_has_membership THEN
        RAISE EXCEPTION 'Vincula un equipo antes de terminar el onboarding.'
            USING ERRCODE = '23514';
    END IF;

    UPDATE public.profiles
       SET onboarding_completed_at = COALESCE(onboarding_completed_at, v_completed_at),
           onboarding_method = COALESCE(onboarding_method, p_method)
     WHERE id = v_uid
     RETURNING onboarding_completed_at INTO v_completed_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el perfil asociado a la cuenta.' USING ERRCODE = 'P0002';
    END IF;

    RETURN v_completed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_my_onboarding(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_my_onboarding(TEXT) TO authenticated;

COMMENT ON FUNCTION public.complete_my_onboarding(TEXT) IS
    'Finaliza el onboarding de la cuenta autenticada sólo si ya posee una '
    'membresía autorizada. Pairing exige rol admin; QR acepta cualquier rol.';

CREATE OR REPLACE FUNCTION public.admin_factory_reset_device(
    p_device_id UUID,
    p_confirm_device_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_actor         UUID := auth.uid();
    v_device        public.devices;
    v_members_count INTEGER;
    v_meas_count    INTEGER;
    v_quad_count    INTEGER;
    v_alert_count   INTEGER;
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_device FROM public.devices WHERE id = p_device_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;

    IF v_device.device_code IS DISTINCT FROM regexp_replace(COALESCE(p_confirm_device_code, ''), '\D', '', 'g') THEN
        RAISE EXCEPTION 'El código de confirmación no coincide con el del equipo.' USING ERRCODE = '22023';
    END IF;

    SELECT COUNT(*) INTO v_members_count FROM public.device_members WHERE device_id = p_device_id;
    SELECT COUNT(*) INTO v_meas_count FROM public.soil_measurements WHERE device_id = p_device_id;
    SELECT COUNT(*) INTO v_quad_count FROM public.predial_quadrants WHERE device_id = p_device_id;
    SELECT COUNT(*) INTO v_alert_count FROM public.push_alerts WHERE device_id = p_device_id;

    DELETE FROM public.device_members WHERE device_id = p_device_id;
    DELETE FROM public.soil_measurements WHERE device_id = p_device_id;
    DELETE FROM public.predial_quadrants WHERE device_id = p_device_id;
    DELETE FROM public.push_alerts WHERE device_id = p_device_id;


    -- Conserva la identidad y las versiones reales del hardware.
    UPDATE public.devices
       SET name = 'Sonda TerraSense',
           alias = NULL,
           pairing_mode_active = FALSE,
           transmission_interval_seconds = 300,
           microclimate_sensor_type = 'BME280',
           last_seen_at = NULL,
           last_measurement_at = NULL
     WHERE id = p_device_id;

    DELETE FROM public.device_status_log WHERE device_id = p_device_id;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, action)
    VALUES (p_device_id, v_actor, 'factory_reset');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Datos y configuración de la nube restablecidos. El borrado de memoria física requiere soporte del firmware.',
        'members_removed', v_members_count,
        'measurements_deleted', v_meas_count,
        'quadrants_deleted', v_quad_count,
        'alerts_deleted', v_alert_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_factory_reset_device(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_factory_reset_device(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_factory_reset_device(UUID, TEXT) IS
    'Desvincula a todos los miembros y borra el historial privado (mediciones, '
    'cuadrantes, alertas) de un equipo para que quede listo para vincularse '
    'con otra persona desde cero. Irreversible. Exige repetir el device_code '
    'como confirmación.';


CREATE OR REPLACE FUNCTION public.admin_approve_device_member(p_device_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.admin_set_member_authorized(p_device_id, p_user_id, TRUE);
$$;

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
         WHERE d.id::TEXT = v_clean OR d.device_code ILIKE '%' || v_clean || '%'
            OR d.name ILIKE '%' || v_clean || '%'
            OR COALESCE(d.alias, '') ILIKE '%' || v_clean || '%'

        UNION

        SELECT d.id, d.device_code::TEXT, d.name::TEXT, d.alias::TEXT, d.is_active,
               d.battery_level::INTEGER, d.last_seen_at,
               p.email::TEXT, 'member_email'::TEXT
          FROM public.device_members dm
          JOIN public.devices d ON d.id = dm.device_id
          JOIN auth.users p ON p.id = dm.user_id
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
     ORDER BY CASE dm.role WHEN 'admin' THEN 0 ELSE 1 END,
              COALESCE(p.email, u.email, '');
END; $$;

-- Un pendiente o un exmiembro tampoco puede escribir datos con el ID conocido.
CREATE POLICY device_measurements_membership_required ON public.soil_measurements
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_device_access(device_id))
  WITH CHECK (public.has_device_access(device_id));
CREATE POLICY device_quadrants_membership_required ON public.predial_quadrants
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (device_id IS NULL OR public.has_device_access(device_id))
  WITH CHECK (device_id IS NULL OR public.has_device_access(device_id));
COMMIT;
