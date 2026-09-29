-- =============================================================================
-- PANEL DE SOPORTE — backend (Web/backend)
-- =============================================================================
-- Consola interna para el equipo de TerraSense: buscar un equipo por código o
-- por el correo de un usuario enlazado, ver su ficha completa (última
-- conexión, batería y su histórico, últimas mediciones, última ubicación),
-- administrar sus miembros (aprobar, cambiar rol/admin, desvincular) y
-- notificar una actualización de firmware a los clientes enlazados.
--
-- ⚠️ HALLAZGO CRÍTICO CORREGIDO AQUÍ: `admin_approve_device_member`,
-- `admin_toggle_user_status`, `admin_unbind_user_device` y
-- `get_admin_dashboard_full_data` ya existían en el remoto (esquema base,
-- igual que `admin_support_users`) como SECURITY DEFINER sin NINGUNA
-- comprobación de quién las llama, y con EXECUTE concedido a `anon`: cualquiera,
-- sin sesión, podía volcar nombre/correo/teléfono de todos los usuarios y
-- todos los equipos, aprobar membresías, deshabilitar cuentas o desvincular a
-- cualquiera. No hay evidencia de que se haya explotado (profiles y
-- device_members están vacías hoy), pero se cierra de inmediato.
--
-- Todo lo nuevo exige `is_support_staff()`: pertenecer, activo, a
-- `admin_support_users`. Nada de esto es visible para `anon` ni para un
-- usuario autenticado normal (agricultor/operador) de la app o la consola.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 0. CIERRE INMEDIATO DEL HALLAZGO — antes de tocar nada más
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_approve_device_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_toggle_user_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_unbind_user_device(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_full_data() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. IDENTIDAD DE SOPORTE: admin_support_users ligada a auth.users
-- -----------------------------------------------------------------------------
-- La tabla ya existía (1 fila sembrada, admin@terrasense.cl) pero sin ninguna
-- columna que la ligara a una sesión real de Supabase Auth.

ALTER TABLE public.admin_support_users
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_support_users_user_id
    ON public.admin_support_users (user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_support_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_support_users
         WHERE user_id = auth.uid() AND is_active
    );
$$;

REVOKE ALL ON FUNCTION public.is_support_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_support_staff() TO authenticated;

COMMENT ON FUNCTION public.is_support_staff() IS
    'Puerta de entrada de TODO el panel de soporte: true sólo si auth.uid() '
    'tiene una fila activa en admin_support_users. SECURITY DEFINER a '
    'propósito, mismo patrón que has_device_access().';

ALTER TABLE public.admin_support_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_select_staff" ON public.admin_support_users;
CREATE POLICY "support_select_staff" ON public.admin_support_users
    FOR SELECT TO authenticated
    USING (public.is_support_staff() OR user_id = auth.uid());

-- Sin políticas de INSERT/UPDATE/DELETE: toda escritura pasa por las
-- funciones SECURITY DEFINER de abajo (mismo patrón que firmware_releases).

-- -----------------------------------------------------------------------------
-- 2. ALTA DE PERSONAL — autoservicio con código de invitación
-- -----------------------------------------------------------------------------
-- La URL del panel es secreta, pero PostgREST expone el nombre de cada RPC en
-- su esquema OpenAPI y auth.users se comparte con la app y la consola de
-- agricultores: sin un segundo secreto, cualquier cuenta ya autenticada ahí
-- podría llamar a esta función y auto-otorgarse acceso de soporte. El código
-- de invitación es ese segundo secreto, independiente de la URL.

CREATE TABLE IF NOT EXISTS public.admin_support_invite (
    id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    code_hash  TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_support_invite ENABLE ROW LEVEL SECURITY;
-- Sin políticas: nadie la lee ni escribe directamente, sólo las funciones de
-- abajo (SECURITY DEFINER).

-- Código inicial. Cámbialo con admin_rotate_invite_code() una vez dentro del
-- panel; no vuelve a imprimirse en texto plano en ninguna migración futura.
-- pgcrypto vive en el esquema `extensions` en este proyecto (convención de
-- Supabase), de ahí la calificación explícita de crypt()/gen_salt().
INSERT INTO public.admin_support_invite (id, code_hash)
VALUES (1, extensions.crypt('TS-CQP76-YS5TR-8KFYX', extensions.gen_salt('bf')))
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.support_register_attempts (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID NOT NULL,
    succeeded    BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.support_register_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.support_self_register(p_full_name TEXT, p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions
AS $$
DECLARE
    v_uid         UUID := auth.uid();
    v_email       TEXT;
    v_existing_id UUID;
    v_failures    INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Sesión no válida.' USING ERRCODE = '28000';
    END IF;

    IF EXISTS (SELECT 1 FROM public.admin_support_users WHERE user_id = v_uid) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Ya tienes acceso al panel.');
    END IF;

    DELETE FROM public.support_register_attempts
     WHERE user_id = v_uid AND attempted_at < NOW() - INTERVAL '24 hours';

    SELECT COUNT(*) INTO v_failures FROM public.support_register_attempts
     WHERE user_id = v_uid AND NOT succeeded AND attempted_at > NOW() - INTERVAL '1 hour';

    IF v_failures >= 5 THEN
        RAISE EXCEPTION 'Demasiados intentos. Vuelve a intentarlo en una hora.' USING ERRCODE = '54000';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.admin_support_invite
         WHERE id = 1 AND code_hash = extensions.crypt(COALESCE(p_invite_code, ''), code_hash)
    ) THEN
        INSERT INTO public.support_register_attempts (user_id, succeeded) VALUES (v_uid, FALSE);
        RAISE EXCEPTION 'Código de invitación inválido.' USING ERRCODE = '28000';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    SELECT id INTO v_existing_id FROM public.admin_support_users
     WHERE lower(email) = lower(v_email) AND user_id IS NULL
     LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.admin_support_users
           SET user_id = v_uid, is_active = TRUE,
               full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name)
         WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.admin_support_users (user_id, email, full_name, is_active)
        VALUES (v_uid, v_email, COALESCE(NULLIF(TRIM(p_full_name), ''), split_part(v_email, '@', 1)), TRUE);
    END IF;

    INSERT INTO public.support_register_attempts (user_id, succeeded) VALUES (v_uid, TRUE);

    RETURN jsonb_build_object('success', true, 'message', 'Acceso de soporte activado.');
END;
$$;

REVOKE ALL ON FUNCTION public.support_self_register(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.support_self_register(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.support_self_register(TEXT, TEXT) IS
    'Autoservicio de alta de personal de soporte. Exige sesión válida Y el '
    'código de admin_support_invite: la URL secreta no basta por sí sola '
    'porque auth.users se comparte con la app/consola de agricultores.';

CREATE OR REPLACE FUNCTION public.admin_rotate_invite_code(p_new_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;
    IF length(COALESCE(p_new_code, '')) < 8 THEN
        RAISE EXCEPTION 'El código debe tener al menos 8 caracteres.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.admin_support_invite
       SET code_hash = extensions.crypt(p_new_code, extensions.gen_salt('bf')), updated_at = NOW()
     WHERE id = 1;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_rotate_invite_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rotate_invite_code(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_staff_active(p_user_id UUID, p_active BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'No puedes desactivar tu propia cuenta de soporte.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.admin_support_users SET is_active = p_active WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No es parte del equipo de soporte.');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_staff_active(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_active(UUID, BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. HISTÓRICO DE BATERÍA/CONEXIÓN — automático, por trigger
-- -----------------------------------------------------------------------------
-- No depende de que la app o el edge function cambien: cualquier UPDATE sobre
-- devices que mueva battery_level o last_seen_at queda registrado solo.

CREATE TABLE IF NOT EXISTS public.device_status_log (
    id               BIGSERIAL PRIMARY KEY,
    device_id        UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    battery_level    INTEGER,
    firmware_version TEXT,
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_status_log_device_time
    ON public.device_status_log (device_id, recorded_at DESC);

ALTER TABLE public.device_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ts_device_status_log_select" ON public.device_status_log;
CREATE POLICY "ts_device_status_log_select" ON public.device_status_log
    FOR SELECT TO authenticated
    USING (public.has_device_access(device_id) OR public.is_support_staff());

CREATE OR REPLACE FUNCTION public.log_device_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.battery_level IS DISTINCT FROM OLD.battery_level
       OR NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at THEN
        INSERT INTO public.device_status_log (device_id, battery_level, firmware_version)
        VALUES (NEW.id, NEW.battery_level, NEW.firmware_version);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_device_status_change ON public.devices;
CREATE TRIGGER trg_log_device_status_change
    AFTER UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.log_device_status_change();

COMMENT ON TABLE public.device_status_log IS
    'Histórico de batería/conexión por equipo, capturado por trigger sobre '
    'devices. No depende de ningún cliente concreto (app, edge function o '
    'este panel) para empezar a llenarse.';

-- -----------------------------------------------------------------------------
-- 4. AUDITORÍA DE MIEMBROS — admite también "remove"
-- -----------------------------------------------------------------------------

DO $$ BEGIN
    ALTER TABLE public.device_member_audit DROP CONSTRAINT device_member_audit_action_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.device_member_audit
    ADD CONSTRAINT device_member_audit_action_check
    CHECK (action IN ('authorize', 'revoke', 'set_role', 'transfer_owner', 'remove'));

-- El actor de una acción de soporte no es miembro del equipo: relaja la FK
-- únicamente en el sentido de que target/actor siguen siendo auth.users
-- válidos (la FK ya lo exige), no se toca nada más aquí.

-- -----------------------------------------------------------------------------
-- 5. BÚSQUEDA GLOBAL
-- -----------------------------------------------------------------------------
-- Por código de equipo, alias/nombre, o correo de cualquier usuario enlazado
-- (dueño, admin u operador). Puede devolver más de un equipo.

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
        SELECT d.id AS device_id, d.device_code, d.name, d.alias, d.is_active,
               d.battery_level, d.last_seen_at,
               NULL::TEXT AS matched_member_email, 'device'::TEXT AS match_reason
          FROM public.devices d
         WHERE d.device_code ILIKE '%' || v_clean || '%'
            OR d.name ILIKE '%' || v_clean || '%'
            OR COALESCE(d.alias, '') ILIKE '%' || v_clean || '%'

        UNION

        SELECT d.id, d.device_code, d.name, d.alias, d.is_active,
               d.battery_level, d.last_seen_at,
               p.email, 'member_email'::TEXT
          FROM public.device_members dm
          JOIN public.devices d ON d.id = dm.device_id
          JOIN public.profiles p ON p.id = dm.user_id
         WHERE p.email ILIKE '%' || v_clean || '%'
      ) s
     ORDER BY s.last_seen_at DESC NULLS LAST
     LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. FICHA COMPLETA DE UN EQUIPO — una sola llamada para la pestaña de detalle
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_device_detail(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_device   public.devices;
    v_latest   RECORD;
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_device FROM public.devices WHERE id = p_device_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;

    SELECT f.id, f.version, f.hardware_target, f.is_mandatory
      INTO v_latest
      FROM public.firmware_releases f
     WHERE f.is_published
       AND f.hardware_target = COALESCE(v_device.hardware_version, 'ESP32-WROOM-32')
     ORDER BY string_to_array(f.version, '.')::int[] DESC
     LIMIT 1;

    RETURN jsonb_build_object(
        'device', to_jsonb(v_device),
        'latest_published_firmware', CASE WHEN v_latest.id IS NULL THEN NULL ELSE
            jsonb_build_object('id', v_latest.id, 'version', v_latest.version,
                                'hardware_target', v_latest.hardware_target,
                                'is_mandatory', v_latest.is_mandatory)
        END,
        'is_up_to_date', (v_latest.id IS NULL OR v_latest.version = v_device.firmware_version),
        'last_location', (
            SELECT jsonb_build_object('latitude', m.latitude, 'longitude', m.longitude,
                                       'field_name', m.field_name, 'measured_at', m.measured_at)
              FROM public.soil_measurements m
             WHERE m.device_id = p_device_id
             ORDER BY m.measured_at DESC LIMIT 1
        ),
        'members', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'user_id', dm.user_id,
                'email', p.email,
                'full_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
                'role', dm.role,
                'is_authorized', dm.is_authorized,
                'created_at', dm.created_at
            ) ORDER BY CASE dm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END), '[]'::jsonb)
              FROM public.device_members dm
              JOIN public.profiles p ON p.id = dm.user_id
             WHERE dm.device_id = p_device_id
        ),
        'battery_history', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'battery_level', l.battery_level, 'firmware_version', l.firmware_version,
                'recorded_at', l.recorded_at
            ) ORDER BY l.recorded_at DESC), '[]'::jsonb)
              FROM (SELECT * FROM public.device_status_log
                     WHERE device_id = p_device_id
                     ORDER BY recorded_at DESC LIMIT 100) l
        ),
        'measurements', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', m.id, 'measured_at', m.measured_at, 'field_name', m.field_name,
                'phenological_stage', m.phenological_stage, 'verdict', m.verdict,
                'verdict_title', m.verdict_title, 'vwc_percent', m.vwc_percent,
                'soil_temp_c', m.soil_temp_c, 'ec_us_cm', m.ec_us_cm, 'ph', m.ph,
                'nitrogen', m.nitrogen, 'phosphorus', m.phosphorus, 'potassium', m.potassium,
                'latitude', m.latitude, 'longitude', m.longitude
            ) ORDER BY m.measured_at DESC), '[]'::jsonb)
              FROM (SELECT * FROM public.soil_measurements
                     WHERE device_id = p_device_id
                     ORDER BY measured_at DESC LIMIT 50) m
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_device_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_device_detail(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. ADMINISTRACIÓN DE MIEMBROS DE UN EQUIPO (nivel soporte, no requiere ser
--    miembro del equipo — a diferencia de manage_device_member())
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_member_authorized(
    p_device_id UUID, p_user_id UUID, p_authorized BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor UUID := auth.uid();
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.device_members SET is_authorized = p_authorized
     WHERE device_id = p_device_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Membresía no encontrada.');
    END IF;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, target_user_id, action)
    VALUES (p_device_id, v_actor, p_user_id, CASE WHEN p_authorized THEN 'authorize' ELSE 'revoke' END);

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_member_authorized(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_member_authorized(UUID, UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_member_role(
    p_device_id UUID, p_user_id UUID, p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor UUID := auth.uid();
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;
    IF p_role NOT IN ('owner', 'admin', 'operator') THEN
        RAISE EXCEPTION 'Rol inválido.' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.device_members WHERE device_id = p_device_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'La membresía indicada no existe.' USING ERRCODE = 'P0002';
    END IF;

    -- Un solo owner por equipo: al nombrar uno nuevo, el anterior baja a admin.
    IF p_role = 'owner' THEN
        UPDATE public.device_members SET role = 'admin'
         WHERE device_id = p_device_id AND role = 'owner' AND user_id <> p_user_id;
    END IF;

    UPDATE public.device_members SET role = p_role
     WHERE device_id = p_device_id AND user_id = p_user_id;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, target_user_id, action, new_role)
    VALUES (p_device_id, v_actor, p_user_id, CASE WHEN p_role = 'owner' THEN 'transfer_owner' ELSE 'set_role' END, p_role);

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_member_role(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_member_role(UUID, UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. NOTIFICAR ACTUALIZACIÓN DE FIRMWARE A UN EQUIPO PUNTUAL
-- -----------------------------------------------------------------------------
-- Reutiliza push_alerts + send-push-alert, ya desplegada: category='device' es
-- una de las categorías que categoryFor() reconoce, así que se despacha con
-- la infraestructura existente sin tocar la app.

CREATE OR REPLACE FUNCTION public.admin_push_firmware_update(
    p_device_id UUID, p_firmware_release_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_device public.devices;
    v_fw     public.firmware_releases;
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_device FROM public.devices WHERE id = p_device_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_fw FROM public.firmware_releases
     WHERE id = p_firmware_release_id AND is_published;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La versión de firmware indicada no existe o no está publicada.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.push_alerts (device_id, title, body, category, severity)
    VALUES (
        p_device_id,
        'Actualización de firmware disponible',
        'La sonda "' || COALESCE(v_device.alias, v_device.name) || '" tiene la versión ' ||
            v_fw.version || ' disponible' ||
            CASE WHEN v_fw.is_mandatory THEN ' (obligatoria)' ELSE '' END || '.',
        'device',
        CASE WHEN v_fw.is_mandatory THEN 'critical' ELSE 'warning' END
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Notificación enviada a los usuarios enlazados a este equipo.',
        'firmware_version', v_fw.version
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_push_firmware_update(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_push_firmware_update(UUID, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. FUNCIONES PRE-EXISTENTES — se conservan, sólo se les añade la puerta de
--    soporte y (donde faltaba) el registro de auditoría. Firmas intactas.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_approve_device_member(p_device_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_actor UUID := auth.uid();
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.device_members SET is_authorized = true
     WHERE device_id = p_device_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solicitud no encontrada.');
    END IF;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, target_user_id, action)
    VALUES (p_device_id, v_actor, p_user_id, 'authorize');

    RETURN jsonb_build_object('success', true, 'message', 'Usuario aprobado y autorizado correctamente.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_device_member(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unbind_user_device(p_device_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
    v_actor UUID := auth.uid();
    v_role  TEXT;
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    SELECT role INTO v_role FROM public.device_members
     WHERE device_id = p_device_id AND user_id = p_user_id;

    DELETE FROM public.device_members WHERE device_id = p_device_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'El usuario no estaba vinculado a este equipo.');
    END IF;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, target_user_id, action, previous_role)
    VALUES (p_device_id, v_actor, p_user_id, 'remove', v_role);

    RETURN jsonb_build_object('success', true, 'message', 'Usuario desvinculado del equipo.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unbind_user_device(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(p_user_id UUID, p_new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;
    IF p_new_status NOT IN ('active', 'pending', 'disabled') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Estado invalido');
    END IF;

    UPDATE public.profiles SET status = p_new_status, updated_at = NOW() WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Estado de usuario actualizado a ' || p_new_status,
        'user_id', p_user_id,
        'status', p_new_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_full_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
    v_users   JSONB;
    v_devices JSONB;
    v_stats   JSONB;
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id, 'firstName', p.first_name, 'lastName', p.last_name,
            'age', p.age, 'email', p.email, 'phone', p.phone, 'role', p.role,
            'status', p.status, 'frostAlertsEnabled', p.frost_alerts_enabled,
            'moistureAlertsEnabled', p.moisture_alerts_enabled, 'createdAt', p.created_at,
            'pairedDevicesCount', (SELECT COUNT(*) FROM public.device_members dm WHERE dm.user_id = p.id)
        ) ORDER BY p.created_at DESC
    ), '[]'::jsonb) INTO v_users
    FROM public.profiles p;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', d.id, 'deviceCode', d.device_code, 'name', d.name, 'alias', d.alias,
            'batteryLevel', d.battery_level, 'isActive', d.is_active,
            'hardwareVersion', d.hardware_version, 'firmwareVersion', d.firmware_version,
            'lastSeenAt', d.last_seen_at,
            'members', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'userId', pr.id, 'name', pr.first_name || ' ' || pr.last_name,
                    'email', pr.email, 'role', dm.role
                )), '[]'::jsonb)
                FROM public.device_members dm
                JOIN public.profiles pr ON pr.id = dm.user_id
                WHERE dm.device_id = d.id
            )
        ) ORDER BY d.last_seen_at DESC
    ), '[]'::jsonb) INTO v_devices
    FROM public.devices d;

    SELECT jsonb_build_object(
        'totalUsers', (SELECT COUNT(*) FROM public.profiles),
        'activeUsers', (SELECT COUNT(*) FROM public.profiles WHERE status = 'active'),
        'disabledUsers', (SELECT COUNT(*) FROM public.profiles WHERE status = 'disabled'),
        'totalDevices', (SELECT COUNT(*) FROM public.devices),
        'onlineDevices', (SELECT COUNT(*) FROM public.devices WHERE is_active = TRUE)
    ) INTO v_stats;

    RETURN jsonb_build_object('success', true, 'stats', v_stats, 'users', v_users, 'devices', v_devices);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_full_data() TO authenticated;

-- Bug de esquema encontrado al auditar: profiles no tiene columna
-- `full_name` (tiene first_name/last_name); list_device_members() habría
-- fallado en tiempo de ejecución la primera vez que alguien la llamara.
CREATE OR REPLACE FUNCTION public.list_device_members(p_device_id UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, role TEXT, is_authorized BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF NOT public.has_device_admin_access(p_device_id) THEN
        RAISE EXCEPTION 'No tienes permisos para administrar este equipo.' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT dm.user_id, TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
           COALESCE(p.email, u.email::TEXT, ''),
           dm.role::TEXT, COALESCE(dm.is_authorized, TRUE)
      FROM public.device_members dm
      LEFT JOIN public.profiles p ON p.id = dm.user_id
      LEFT JOIN auth.users u ON u.id = dm.user_id
     WHERE dm.device_id = p_device_id
     ORDER BY CASE dm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
              COALESCE(p.email, u.email, '');
END; $$;
