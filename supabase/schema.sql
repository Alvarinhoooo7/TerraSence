


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_approve_device_member"("p_device_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.admin_set_member_authorized(p_device_id, p_user_id, TRUE);
$$;


ALTER FUNCTION "public"."admin_approve_device_member"("p_device_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_factory_reset_device"("p_device_id" "uuid", "p_confirm_device_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_actor         UUID := auth.uid();
    v_device        public.devices;
    v_members_count INTEGER;
    v_meas_count    INTEGER;
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

    SELECT COUNT(*) INTO v_members_count FROM public.device_members    WHERE device_id = p_device_id;
    SELECT COUNT(*) INTO v_meas_count    FROM public.soil_measurements WHERE device_id = p_device_id;
    SELECT COUNT(*) INTO v_alert_count   FROM public.push_alerts       WHERE device_id = p_device_id;

    INSERT INTO public.device_data_resets(user_id, device_id, generation)
      SELECT user_id, device_id, v_device.data_generation + 1 FROM public.device_members WHERE device_id = p_device_id
      ON CONFLICT (user_id, device_id) DO UPDATE SET generation = EXCLUDED.generation;
    DELETE FROM public.device_members    WHERE device_id = p_device_id;
    DELETE FROM public.soil_measurements WHERE device_id = p_device_id;
    DELETE FROM public.push_alerts       WHERE device_id = p_device_id;

    -- Conserva la identidad y las versiones reales del hardware.
    UPDATE public.devices
       SET data_generation = data_generation + 1,
           name = 'Sonda TerraSense',
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
        'alerts_deleted', v_alert_count
    );
END;
$$;


ALTER FUNCTION "public"."admin_factory_reset_device"("p_device_id" "uuid", "p_confirm_device_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_factory_reset_device"("p_device_id" "uuid", "p_confirm_device_code" "text") IS 'Desvincula a todos los miembros y borra el historial privado (mediciones, cuadrantes, alertas) de un equipo para que quede listo para vincularse con otra persona desde cero. Irreversible. Exige repetir el device_code como confirmación.';



CREATE OR REPLACE FUNCTION "public"."admin_get_device_detail"("p_device_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_device public.devices;
    v_latest RECORD;
    v_status TEXT;
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
     ORDER BY public.semver_parts(f.version) DESC NULLS LAST
     LIMIT 1;

    v_status := CASE
        WHEN v_latest.id IS NULL THEN 'sin_catalogo'
        WHEN public.semver_parts(v_device.firmware_version) IS NULL THEN 'version_ilegible'
        WHEN public.semver_parts(v_latest.version) > public.semver_parts(v_device.firmware_version)
            THEN 'desactualizado'
        ELSE 'al_dia'
    END;

    RETURN jsonb_build_object(
        'device', to_jsonb(v_device),
        'latest_published_firmware', CASE WHEN v_latest.id IS NULL THEN NULL ELSE
            jsonb_build_object('id', v_latest.id, 'version', v_latest.version,
                               'hardware_target', v_latest.hardware_target,
                               'is_mandatory', v_latest.is_mandatory)
        END,
        'firmware_status', v_status,
        -- Se conserva por compatibilidad con clientes que ya la leen; a partir
        -- de aquí lo informativo es `firmware_status`.
        'is_up_to_date', (v_status <> 'desactualizado'),
        'last_location', (
            SELECT jsonb_build_object('latitude', m.latitude, 'longitude', m.longitude,
                                      'gps_accuracy_m', m.gps_accuracy_m,
                                      'field_name', m.field_name, 'measured_at', m.measured_at)
              FROM public.soil_measurements m
             WHERE m.device_id = p_device_id
               AND m.latitude IS NOT NULL
               AND m.longitude IS NOT NULL
             ORDER BY m.measured_at DESC LIMIT 1
        ),
        'members', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'user_id', dm.user_id,
                'email', p.email,
                'full_name', NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
                'role', dm.role,
                'is_authorized', dm.is_authorized,
                'has_push_token', (p.push_token IS NOT NULL),
                'created_at', dm.created_at
            ) ORDER BY CASE dm.role WHEN 'admin' THEN 0 ELSE 1 END, p.email), '[]'::jsonb)
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
                'crop_id', m.crop_id,
                'phenological_stage', m.phenological_stage, 'verdict', m.verdict,
                'verdict_title', m.verdict_title, 'vwc_percent', m.vwc_percent,
                'soil_temp_c', m.soil_temp_c, 'ec_us_cm', m.ec_us_cm, 'ph', m.ph,
                'canopy_temp_c', m.canopy_temp_c, 'canopy_humidity_pct', m.canopy_humidity_pct,
                'air_pressure_hpa', m.air_pressure_hpa, 'diagnosis', m.diagnosis,
                'battery_percent', m.battery_percent,
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


ALTER FUNCTION "public"."admin_get_device_detail"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_fleet"() RETURNS TABLE("device_id" "uuid", "device_code" "text", "name" "text", "alias" "text", "is_active" boolean, "battery_level" integer, "firmware_version" "text", "hardware_version" "text", "last_seen_at" timestamp with time zone, "last_measurement_at" timestamp with time zone, "created_at" timestamp with time zone, "member_count" integer, "pending_count" integer, "measurement_count" integer, "latest_version" "text", "firmware_status" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT d.id,
           d.device_code::TEXT,
           d.name::TEXT,
           d.alias::TEXT,
           d.is_active,
           d.battery_level::INTEGER,
           d.firmware_version::TEXT,
           d.hardware_version::TEXT,
           d.last_seen_at,
           d.last_measurement_at,
           d.created_at,
           COALESCE(mem.total, 0)::INTEGER,
           COALESCE(mem.pending, 0)::INTEGER,
           COALESCE(mea.total, 0)::INTEGER,
           latest.version,
           CASE
               WHEN latest.version IS NULL THEN 'sin_catalogo'
               WHEN public.semver_parts(d.firmware_version) IS NULL THEN 'version_ilegible'
               WHEN public.semver_parts(latest.version) > public.semver_parts(d.firmware_version)
                   THEN 'desactualizado'
               ELSE 'al_dia'
           END
      FROM public.devices d
      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE NOT dm.is_authorized) AS pending
            FROM public.device_members dm
           WHERE dm.device_id = d.id
      ) mem ON TRUE
      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS total
            FROM public.soil_measurements m
           WHERE m.device_id = d.id
      ) mea ON TRUE
      LEFT JOIN LATERAL (
          SELECT f.version
            FROM public.firmware_releases f
           WHERE f.is_published
             AND f.hardware_target = COALESCE(d.hardware_version, 'ESP32-WROOM-32')
           ORDER BY public.semver_parts(f.version) DESC NULLS LAST
           LIMIT 1
      ) latest ON TRUE
     ORDER BY d.last_seen_at DESC NULLS LAST, d.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."admin_list_fleet"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_list_fleet"() IS 'Inventario completo de sondas para el backoffice. RLS acota `devices` a los equipos donde la sesión es miembro, y una cuenta de soporte no lo es de ninguno: el perímetro aquí es is_support_staff(), igual que el resto del panel.';



CREATE OR REPLACE FUNCTION "public"."admin_list_recent_measurements"("p_limit" integer DEFAULT 200) RETURNS TABLE("id" "uuid", "device_id" "uuid", "device_code" "text", "device_label" "text", "measured_at" timestamp with time zone, "field_name" "text", "crop_id" "text", "phenological_stage" "text", "verdict" "text", "verdict_title" "text", "vwc_percent" numeric, "soil_temp_c" numeric, "ec_us_cm" integer, "ph" numeric, "nitrogen" integer, "phosphorus" integer, "potassium" integer, "canopy_temp_c" numeric, "canopy_humidity_pct" numeric, "air_pressure_hpa" numeric, "battery_percent" smallint, "latitude" numeric, "longitude" numeric, "diagnosis" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT m.id,
           m.device_id,
           d.device_code::TEXT,
           COALESCE(NULLIF(d.alias, ''), d.name)::TEXT,
           m.measured_at,
           m.field_name::TEXT,
           m.crop_id::TEXT,
           m.phenological_stage,
           m.verdict::TEXT,
           m.verdict_title,
           m.vwc_percent,
           m.soil_temp_c,
           m.ec_us_cm,
           m.ph,
           m.nitrogen,
           m.phosphorus,
           m.potassium,
           m.canopy_temp_c,
           m.canopy_humidity_pct,
           m.air_pressure_hpa,
           m.battery_percent,
           m.latitude,
           m.longitude,
           m.diagnosis
      FROM public.soil_measurements m
      JOIN public.devices d ON d.id = m.device_id
     ORDER BY m.measured_at DESC
     LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);
END;
$$;


ALTER FUNCTION "public"."admin_list_recent_measurements"("p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_list_recent_measurements"("p_limit" integer) IS 'Últimas mediciones de toda la flota para el backoffice, con el equipo ya resuelto. Tope de 500 filas: es una pantalla de diagnóstico, no un export.';



CREATE OR REPLACE FUNCTION "public"."admin_push_firmware_update"("p_device_id" "uuid", "p_firmware_release_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

    RETURN jsonb_build_object(
        'success', true,
        'message', 'La versión publicada está disponible en Ajustes > Actualizaciones. No se envió un aviso push.',
        'firmware_version', v_fw.version
    );
END;
$$;


ALTER FUNCTION "public"."admin_push_firmware_update"("p_device_id" "uuid", "p_firmware_release_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_rotate_invite_code"("p_new_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
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


ALTER FUNCTION "public"."admin_rotate_invite_code"("p_new_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_search"("p_query" "text") RETURNS TABLE("device_id" "uuid", "device_code" "text", "name" "text", "alias" "text", "is_active" boolean, "battery_level" integer, "last_seen_at" timestamp with time zone, "matched_member_email" "text", "match_reason" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_search"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_member_authorized"("p_device_id" "uuid", "p_user_id" "uuid", "p_authorized" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_support_staff() THEN RAISE EXCEPTION 'No tienes acceso al backoffice.' USING ERRCODE = '42501'; END IF;
  IF p_authorized IS NOT TRUE THEN RAISE EXCEPTION 'Para quitar acceso elimina la vinculación.' USING ERRCODE = '22023'; END IF;
  PERFORM public.change_device_membership(p_device_id, p_user_id, 'authorize');
  RETURN jsonb_build_object('success', TRUE);
END $$;


ALTER FUNCTION "public"."admin_set_member_authorized"("p_device_id" "uuid", "p_user_id" "uuid", "p_authorized" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_member_role"("p_device_id" "uuid", "p_user_id" "uuid", "p_role" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_support_staff() THEN RAISE EXCEPTION 'No tienes acceso al backoffice.' USING ERRCODE = '42501'; END IF;
  IF p_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Sólo se permite delegar la administración.' USING ERRCODE = '22023'; END IF;
  PERFORM public.change_device_membership(p_device_id, p_user_id, 'transfer_owner');
  RETURN jsonb_build_object('success', TRUE);
END $$;


ALTER FUNCTION "public"."admin_set_member_role"("p_device_id" "uuid", "p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_staff_active"("p_user_id" "uuid", "p_active" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_set_staff_active"("p_user_id" "uuid", "p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_toggle_user_status"("p_user_id" "uuid", "p_new_status" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."admin_toggle_user_status"("p_user_id" "uuid", "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_unbind_user_device"("p_device_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_support_staff() THEN RAISE EXCEPTION 'No tienes acceso al backoffice.' USING ERRCODE = '42501'; END IF;
  PERFORM public.change_device_membership(p_device_id, p_user_id, 'remove');
  RETURN jsonb_build_object('success', TRUE);
END $$;


ALTER FUNCTION "public"."admin_unbind_user_device"("p_device_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_device_membership"("p_device_id" "uuid", "p_user_id" "uuid", "p_action" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."change_device_membership"("p_device_id" "uuid", "p_user_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_device_administrator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."check_device_administrator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_firmware_update"("p_device_id" "uuid") RETURNS TABLE("version" "text", "binary_url" "text", "sha256" "text", "size_bytes" integer, "release_notes" "text", "is_mandatory" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_current INT[];
    v_target  TEXT;
BEGIN
    IF NOT public.has_device_access(p_device_id) THEN
        RAISE EXCEPTION 'Sin acceso a este equipo.' USING ERRCODE = '42501';
    END IF;

    SELECT public.semver_parts(d.firmware_version), d.hardware_version
      INTO v_current, v_target
      FROM public.devices d
     WHERE d.id = p_device_id;

    -- Sin versión legible no se puede afirmar que exista una más reciente.
    IF v_current IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT f.version, f.binary_url, f.sha256, f.size_bytes, f.release_notes, f.is_mandatory
      FROM public.firmware_releases f
     WHERE f.is_published
       AND f.hardware_target = COALESCE(v_target, 'ESP32-WROOM-32')
       AND public.semver_parts(f.version) > v_current
     ORDER BY public.semver_parts(f.version) DESC
     LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."check_firmware_update"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_measurement_generation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_generation INTEGER;
BEGIN
  SELECT data_generation INTO v_generation FROM public.devices WHERE id = NEW.device_id FOR SHARE;
  IF NEW.data_generation IS DISTINCT FROM v_generation THEN
    RAISE EXCEPTION 'La medición pertenece a una configuración anterior del equipo.' USING ERRCODE = 'TS001';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."check_measurement_generation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_my_onboarding"("p_method" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."complete_my_onboarding"("p_method" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_my_onboarding"("p_method" "text") IS 'Finaliza el onboarding de la cuenta autenticada sólo si ya posee una membresía autorizada. Pairing exige rol admin; QR acepta cualquier rol.';



CREATE OR REPLACE FUNCTION "public"."generate_device_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
    candidate TEXT;
    attempts  INTEGER := 0;
BEGIN
    LOOP
        candidate := (1 + FLOOR(RANDOM() * 9))::TEXT;   -- primer dígito 1-9
        FOR i IN 2..15 LOOP
            candidate := candidate || FLOOR(RANDOM() * 10)::TEXT;
        END LOOP;

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM public.devices d WHERE d.device_code = candidate
        );

        attempts := attempts + 1;
        IF attempts > 50 THEN
            RAISE EXCEPTION 'No se pudo generar un device_code único tras 50 intentos';
        END IF;
    END LOOP;
    RETURN candidate;
END; $$;


ALTER FUNCTION "public"."generate_device_code"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_device_code"() IS 'Genera un código de dispositivo de 15 dígitos aleatorios, con reintento ante colisión. Debe mantenerse coherente con App/src/utils/deviceId.ts.';



CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_full_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."get_admin_dashboard_full_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_device_access_qr"("p_device_id" "uuid") RETURNS TABLE("token" "uuid", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_expiry TIMESTAMPTZ;
BEGIN
  PERFORM 1 FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT public.has_device_access(p_device_id) THEN
    RAISE EXCEPTION 'Debes ser un miembro aprobado del equipo.' USING ERRCODE = '42501';
  END IF;
  v_expiry := to_timestamp((floor(extract(epoch FROM clock_timestamp()) / 900) + 1) * 900);
  INSERT INTO public.device_access_invites AS invitation(device_id, expires_at) VALUES(p_device_id, v_expiry)
    ON CONFLICT (device_id) DO UPDATE SET token = gen_random_uuid(), expires_at = EXCLUDED.expires_at
    WHERE invitation.expires_at <= clock_timestamp();
  RETURN QUERY SELECT i.token, i.expires_at FROM public.device_access_invites i WHERE i.device_id = p_device_id;
END $$;


ALTER FUNCTION "public"."get_device_access_qr"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_age INTEGER;
    v_phone TEXT;
BEGIN
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1));
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2));
    IF v_last_name IS NULL OR v_last_name = '' THEN
        v_last_name := 'Usuario';
    END IF;
    
    v_age := COALESCE((NEW.raw_user_meta_data->>'age')::INTEGER, 35);
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '+56 9 1234 5678');

    INSERT INTO public.profiles (
        id, first_name, last_name, age, email, phone, role, status
    ) VALUES (
        NEW.id,
        v_first_name,
        v_last_name,
        v_age,
        LOWER(TRIM(NEW.email)),
        v_phone,
        'agronomist',
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_device_access"("p_device_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.device_members
    WHERE device_id = p_device_id AND user_id = auth.uid() AND is_authorized IS TRUE);
$$;


ALTER FUNCTION "public"."has_device_access"("p_device_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_device_access"("p_device_id" "uuid") IS 'Indica si el usuario autenticado tiene acceso autorizado a un dispositivo. Usada por las políticas RLS para evitar recursión.';



CREATE OR REPLACE FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.device_members
    WHERE device_id = p_device_id AND user_id = auth.uid() AND role = 'admin' AND is_authorized IS TRUE);
$$;


ALTER FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invalidate_empty_device_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.device_members WHERE device_id = OLD.device_id) THEN
    DELETE FROM public.device_access_invites WHERE device_id = OLD.device_id;
  END IF;
  RETURN OLD;
END $$;


ALTER FUNCTION "public"."invalidate_empty_device_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_support_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_support_users WHERE user_id = auth.uid() AND is_active IS TRUE);
$$;


ALTER FUNCTION "public"."is_support_staff"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_support_staff"() IS 'Puerta de entrada de TODO el panel de soporte: true sólo si auth.uid() tiene una fila activa en admin_support_users. SECURITY DEFINER a propósito, mismo patrón que has_device_access().';



CREATE OR REPLACE FUNCTION "public"."join_device_by_code"("p_code" "text") RETURNS TABLE("device_id" "uuid", "device_name" "text", "is_authorized" boolean, "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
END $_$;


ALTER FUNCTION "public"."join_device_by_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_device_by_invite"("p_token" "uuid") RETURNS TABLE("device_id" "uuid", "device_name" "text", "is_authorized" boolean, "role" "text", "alert_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_device public.devices; v_new BOOLEAN; v_alert UUID; v_admin UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501'; END IF;
  SELECT d.* INTO v_device FROM public.devices d JOIN public.device_access_invites i ON i.device_id = d.id
    WHERE i.token = p_token FOR UPDATE OF d;
  -- Se revisa la vigencia después de tomar el bloqueo; reset y rotación pueden
  -- haber invalidado la invitación mientras esta petición estaba esperando.
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.device_access_invites i
      WHERE i.device_id = v_device.id AND i.token = p_token AND i.expires_at > clock_timestamp()) THEN
    RAISE EXCEPTION 'El QR venció o dejó de ser válido. Pide que te muestren el QR actual.' USING ERRCODE = '22023';
  END IF;
  SELECT dm.user_id INTO v_admin FROM public.device_members dm
    WHERE dm.device_id = v_device.id AND dm.role = 'admin' AND dm.is_authorized;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Este equipo debe vincularse primero por Bluetooth.' USING ERRCODE = '22023'; END IF;
  v_new := NOT EXISTS(SELECT 1 FROM public.device_members dm WHERE dm.device_id = v_device.id AND dm.user_id = auth.uid());
  INSERT INTO public.device_members(device_id, user_id, role, is_authorized)
    VALUES(v_device.id, auth.uid(), 'user', FALSE) ON CONFLICT DO NOTHING;
  IF v_new THEN
    INSERT INTO public.push_alerts(device_id, user_id, title, body, category, severity, event_type, requester_user_id)
      VALUES(v_device.id, v_admin, 'Solicitud de acceso al equipo',
        'Un usuario espera tu aprobación. Abre Ajustes > Administración para revisar la solicitud.', 'device', 'warning', 'access_request', auth.uid())
      RETURNING id INTO v_alert;
  END IF;
  RETURN QUERY SELECT v_device.id, v_device.name::TEXT, dm.is_authorized, dm.role::TEXT, v_alert
    FROM public.device_members dm WHERE dm.device_id = v_device.id AND dm.user_id = auth.uid();
END $$;


ALTER FUNCTION "public"."join_device_by_invite"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_device_creator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;   -- alta desde el rol de servicio: no hay usuario que vincular
    END IF;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (NEW.id, auth.uid(), 'owner', TRUE)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END; $$;


ALTER FUNCTION "public"."link_device_creator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_device_members"("p_device_id" "uuid") RETURNS TABLE("user_id" "uuid", "full_name" "text", "email" "text", "role" "text", "is_authorized" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
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


ALTER FUNCTION "public"."list_device_members"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_my_pending_device_requests"() RETURNS TABLE("device_id" "uuid", "administrator_name" "text", "administrator_email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT pending.device_id,
    COALESCE((SELECT string_agg(left(part, 1) || 'xxxxx', ' ' ORDER BY ordinal)
      FROM regexp_split_to_table(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '\s+')
        WITH ORDINALITY AS words(part, ordinal) WHERE part <> ''), 'Administrador'),
    CASE WHEN u.email IS NULL THEN '' ELSE left(split_part(u.email, '@', 1), 1) || 'xxxxxxxx@' ||
      left(split_part(u.email, '@', 2), 1) || 'xxxxxxxx' END
  FROM public.device_members pending
    JOIN public.device_members administrator ON administrator.device_id = pending.device_id
      AND administrator.role = 'admin' AND administrator.is_authorized
    LEFT JOIN public.profiles p ON p.id = administrator.user_id
    LEFT JOIN auth.users u ON u.id = administrator.user_id
  WHERE pending.user_id = auth.uid() AND pending.is_authorized IS FALSE;
$$;


ALTER FUNCTION "public"."list_my_pending_device_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_device_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_device_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM 1 FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT public.has_device_admin_access(p_device_id) THEN
    RAISE EXCEPTION 'No tienes permisos para administrar este equipo.' USING ERRCODE = '42501';
  END IF;
  PERFORM public.change_device_membership(p_device_id, p_target_user_id, p_action);
END $$;


ALTER FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_onboarding_from_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.is_authorized IS TRUE THEN
    UPDATE public.profiles SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
      onboarding_method = COALESCE(onboarding_method, CASE WHEN NEW.role = 'admin' THEN 'pairing' ELSE 'qr' END)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."mark_onboarding_from_membership"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_onboarding_from_membership"() IS 'Persiste el onboarding dentro de la misma transacción que autoriza una membresía: owner equivale a pairing y el resto a QR.';



CREATE OR REPLACE FUNCTION "public"."normalize_device_versions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
BEGIN
    IF NEW.hardware_version IS NULL OR NEW.hardware_version = 'v2.0-nRF52840' THEN
        NEW.hardware_version := 'ESP32-WROOM-32';
    END IF;

    -- Si no hay tres números que extraer se deja tal cual: es preferible un
    -- valor raro visible en la ficha a perder lo que informó el equipo.
    IF NEW.firmware_version IS NOT NULL AND NEW.firmware_version !~ '^\d+\.\d+\.\d+$' THEN
        NEW.firmware_version := COALESCE(
            (regexp_match(NEW.firmware_version, '(\d+\.\d+\.\d+)'))[1],
            NEW.firmware_version
        );
    END IF;

    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."normalize_device_versions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_device_versions"() IS 'Deja hardware_version y firmware_version en la nomenclatura del catálogo. Hace falta porque la Edge Function device-checkin escribe lo que reporte el equipo, sin validar el formato.';



CREATE OR REPLACE FUNCTION "public"."prepare_device_for_owner"("p_device_id" "uuid", "p_confirm_device_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_device public.devices; v_recent_password BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_device FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT FOUND OR NOT public.has_device_admin_access(p_device_id) THEN
    RAISE EXCEPTION 'Sólo el administrador de este equipo puede prepararlo.' USING ERRCODE = '42501';
  END IF;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(auth.jwt()->'amr', '[]'::jsonb)) a
    WHERE a->>'method' = 'password' AND (a->>'timestamp')::numeric >= extract(epoch FROM now() - interval '5 minutes')) INTO v_recent_password;
  IF NOT v_recent_password THEN RAISE EXCEPTION 'Confirma nuevamente tu contraseña.' USING ERRCODE = '42501'; END IF;
  IF v_device.device_code IS DISTINCT FROM regexp_replace(COALESCE(p_confirm_device_code, ''), '\D', '', 'g') THEN
    RAISE EXCEPTION 'El código de confirmación no coincide.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.device_data_resets(user_id, device_id, generation)
    SELECT user_id, device_id, v_device.data_generation + 1 FROM public.device_members WHERE device_id = p_device_id
    ON CONFLICT (user_id, device_id) DO UPDATE SET generation = EXCLUDED.generation;
  DELETE FROM public.soil_measurements WHERE device_id = p_device_id;
  DELETE FROM public.push_alerts WHERE device_id = p_device_id;
  DELETE FROM public.device_access_invites WHERE device_id = p_device_id;
  DELETE FROM public.device_status_log WHERE device_id = p_device_id;
  DELETE FROM public.device_members WHERE device_id = p_device_id;
  UPDATE public.devices SET name = 'Sonda TerraSense', alias = NULL,
    pairing_mode_active = FALSE, transmission_interval_seconds = 300,
    last_seen_at = NULL, last_measurement_at = NULL, data_generation = data_generation + 1
    WHERE id = p_device_id;
  INSERT INTO public.device_member_audit(device_id, actor_user_id, action) VALUES(p_device_id, auth.uid(), 'factory_reset');
  RETURN jsonb_build_object('success', true, 'generation', v_device.data_generation + 1, 'physical_reset', false);
END $$;


ALTER FUNCTION "public"."prepare_device_for_owner"("p_device_id" "uuid", "p_confirm_device_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_device_generation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NEW.data_generation IS DISTINCT FROM OLD.data_generation THEN
    RAISE EXCEPTION 'Operación no permitida.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."protect_device_generation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_onboarding_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon')
       AND (
           NEW.onboarding_completed_at IS DISTINCT FROM OLD.onboarding_completed_at
           OR NEW.onboarding_method IS DISTINCT FROM OLD.onboarding_method
       ) THEN
        RAISE EXCEPTION 'El onboarding sólo puede finalizarse mediante la función validada.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_onboarding_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_expired_operational_data"() RETURNS TABLE("join_attempts_deleted" bigint, "audit_rows_deleted" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_join BIGINT; v_audit BIGINT;
BEGIN
    DELETE FROM public.device_join_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_join = ROW_COUNT;
    DELETE FROM public.device_member_audit WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS v_audit = ROW_COUNT;
    RETURN QUERY SELECT v_join, v_audit;
END; $$;


ALTER FUNCTION "public"."purge_expired_operational_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_and_pair_device"("p_device_code" "text", "p_user_id" "uuid", "p_device_name" "text" DEFAULT 'TerraSense Sonda Pro'::"text", "p_alias" "text" DEFAULT 'Lote Principal'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_clean_code VARCHAR(20);
    v_device_id UUID;
    v_profile_status TEXT;
BEGIN
    SELECT status INTO v_profile_status FROM public.profiles WHERE id = p_user_id;
    IF v_profile_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado');
    END IF;
    IF v_profile_status = 'disabled' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tu cuenta se encuentra deshabilitada por el administrador.');
    END IF;

    v_clean_code := regexp_replace(TRIM(p_device_code), '[^0-9]', '', 'g');
    IF length(v_clean_code) != 20 THEN
        v_clean_code := rpad('8954' || v_clean_code, 20, '0');
    END IF;

    SELECT id INTO v_device_id FROM public.devices WHERE device_code = v_clean_code;
    IF v_device_id IS NULL THEN
        INSERT INTO public.devices (
            device_code, name, alias, battery_level, is_active, last_seen_at
        ) VALUES (
            v_clean_code, p_device_name, p_alias, 98, TRUE, NOW()
        ) RETURNING id INTO v_device_id;
    ELSE
        UPDATE public.devices
        SET alias = p_alias, last_seen_at = NOW(), is_active = TRUE
        WHERE id = v_device_id;
    END IF;

    INSERT INTO public.device_members (device_id, user_id, role)
    VALUES (v_device_id, p_user_id, 'owner')
    ON CONFLICT (device_id, user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Dispositivo vinculado exitosamente.',
        'device_id', v_device_id,
        'device_code', v_clean_code,
        'name', p_device_name,
        'alias', p_alias
    );
END;
$$;


ALTER FUNCTION "public"."register_and_pair_device"("p_device_code" "text", "p_user_id" "uuid", "p_device_name" "text", "p_alias" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text" DEFAULT NULL::"text") RETURNS TABLE("device_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
    IF EXISTS (SELECT 1 FROM public.devices WHERE id = v_id AND data_generation > 0) THEN
      RAISE EXCEPTION 'Equipo preparado para otro propietario. Contacta a soporte para verificar la entrega y activar el nuevo acceso.' USING ERRCODE = '42501';
    END IF;
    UPDATE public.devices SET name = COALESCE(NULLIF(trim(p_name), ''), name) WHERE id = v_id;
    INSERT INTO public.device_members(device_id, user_id, role, is_authorized) VALUES(v_id, v_uid, 'admin', TRUE);
  ELSIF NOT public.has_device_access(v_id) THEN
    RAISE EXCEPTION 'El equipo ya tiene usuarios. Solicita acceso mediante su QR.' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY SELECT v_id;
END $_$;


ALTER FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") IS 'Registra de forma atómica una sonda físicamente provisionada y crea la membresía owner. El INSERT directo de devices permanece cerrado por RLS.';



CREATE OR REPLACE FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_clean_code VARCHAR(20);
    v_device_id UUID;
    v_device_name TEXT;
BEGIN
    v_clean_code := regexp_replace(TRIM(p_device_code), '[^0-9]', '', 'g');
    IF length(v_clean_code) != 20 THEN
        v_clean_code := rpad('8954' || v_clean_code, 20, '0');
    END IF;

    SELECT id, name INTO v_device_id, v_device_name FROM public.devices WHERE device_code = v_clean_code;
    IF v_device_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'El codigo de medidor no existe.');
    END IF;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (v_device_id, p_user_id, 'agronomist', false)
    ON CONFLICT (device_id, user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Solicitud de acceso enviada al Administrador.',
        'device_id', v_device_id,
        'device_code', v_clean_code,
        'device_name', v_device_name,
        'is_authorized', false
    );
END;
$$;


ALTER FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."semver_parts"("p_version" "text") RETURNS integer[]
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    SET "search_path" TO ''
    AS $$
    SELECT string_to_array((regexp_match(p_version, '(\d+\.\d+\.\d+)'))[1], '.')::INT[];
$$;


ALTER FUNCTION "public"."semver_parts"("p_version" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."semver_parts"("p_version" "text") IS 'Tres componentes numéricos de una cadena de versión, o NULL si no los tiene. Tolera prefijos y sufijos para que un firmware informado como v2.1.0-BLE siga siendo comparable con el catálogo, que exige 2.1.0.';



CREATE OR REPLACE FUNCTION "public"."set_device_member_authorization_default"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM 1 FROM public.devices WHERE id = NEW.device_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.device_members WHERE device_id = NEW.device_id) THEN
    NEW.role := 'admin'; NEW.is_authorized := TRUE;
  ELSE
    NEW.role := 'user'; NEW.is_authorized := FALSE;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."set_device_member_authorization_default"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."support_self_register"("p_full_name" "text", "p_invite_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
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


ALTER FUNCTION "public"."support_self_register"("p_full_name" "text", "p_invite_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."support_self_register"("p_full_name" "text", "p_invite_code" "text") IS 'Autoservicio de alta de personal de soporte. Exige sesión válida Y el código de admin_support_invite: la URL secreta no basta por sí sola porque auth.users se comparte con la app/consola de agricultores.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_support_invite" (
    "id" smallint DEFAULT 1 NOT NULL,
    "code_hash" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_support_invite_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."admin_support_invite" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_support_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."admin_support_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_access_invites" (
    "device_id" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."device_access_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_data_resets" (
    "user_id" "uuid" NOT NULL,
    "device_id" "uuid" NOT NULL,
    "generation" integer NOT NULL
);


ALTER TABLE "public"."device_data_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_join_attempts" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "succeeded" boolean NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."device_join_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."device_join_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."device_join_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."device_join_attempts_id_seq" OWNED BY "public"."device_join_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."device_member_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "target_user_id" "uuid",
    "action" "text" NOT NULL,
    "previous_role" "text",
    "new_role" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "device_member_audit_action_check" CHECK (("action" = ANY (ARRAY['authorize'::"text", 'revoke'::"text", 'set_role'::"text", 'transfer_owner'::"text", 'remove'::"text", 'factory_reset'::"text"])))
);


ALTER TABLE "public"."device_member_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'user'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_authorized" boolean DEFAULT true NOT NULL,
    CONSTRAINT "device_admin_authorized" CHECK (((("role")::"text" <> 'admin'::"text") OR ("is_authorized" IS TRUE))),
    CONSTRAINT "device_members_two_roles" CHECK ((("role")::"text" = ANY ((ARRAY['admin'::character varying, 'user'::character varying])::"text"[])))
);


ALTER TABLE "public"."device_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_status_log" (
    "id" bigint NOT NULL,
    "device_id" "uuid" NOT NULL,
    "battery_level" integer,
    "firmware_version" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."device_status_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."device_status_log" IS 'Histórico de batería/conexión por equipo, capturado por trigger sobre devices. No depende de ningún cliente concreto (app, edge function o este panel) para empezar a llenarse.';



CREATE SEQUENCE IF NOT EXISTS "public"."device_status_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."device_status_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."device_status_log_id_seq" OWNED BY "public"."device_status_log"."id";



CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_code" character varying(20) DEFAULT "public"."generate_device_code"() NOT NULL,
    "name" character varying(100) DEFAULT 'TerraSense Sonda Pro'::character varying NOT NULL,
    "alias" character varying(100) DEFAULT 'Lote Principal'::character varying,
    "hardware_version" character varying(20) DEFAULT 'ESP32-WROOM-32'::character varying NOT NULL,
    "firmware_version" character varying(20) DEFAULT '2.1.0'::character varying NOT NULL,
    "battery_level" smallint DEFAULT 96 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "pairing_mode_active" boolean DEFAULT false NOT NULL,
    "microclimate_sensor_type" character varying(50) DEFAULT 'SHT31_CANOPY'::character varying NOT NULL,
    "transmission_interval_seconds" integer DEFAULT 300 NOT NULL,
    "last_measurement_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data_generation" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "devices_battery_level_check" CHECK ((("battery_level" >= 0) AND ("battery_level" <= 100)))
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."firmware_releases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "hardware_target" "text" DEFAULT 'ESP32-WROOM-32'::"text" NOT NULL,
    "binary_url" "text",
    "sha256" "text",
    "size_bytes" integer,
    "release_notes" "text",
    "is_mandatory" boolean DEFAULT false NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "firmware_releases_sha256_check" CHECK ((("sha256" IS NULL) OR ("sha256" ~ '^[a-f0-9]{64}$'::"text"))),
    CONSTRAINT "firmware_releases_size_bytes_check" CHECK ((("size_bytes" IS NULL) OR ("size_bytes" > 0))),
    CONSTRAINT "firmware_releases_version_check" CHECK (("version" ~ '^\d+\.\d+\.\d+$'::"text"))
);


ALTER TABLE "public"."firmware_releases" OWNER TO "postgres";


COMMENT ON TABLE "public"."firmware_releases" IS 'Catálogo de versiones de firmware para OTA. Sólo las publicadas son visibles; la escritura está reservada al rol de servicio.';



CREATE TABLE IF NOT EXISTS "public"."lab_validation_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sample_code" character varying(50) NOT NULL,
    "lab_name" character varying(100) NOT NULL,
    "soil_series" character varying(100),
    "sample_date" "date" NOT NULL,
    "terrasense_ph" numeric(4,2) NOT NULL,
    "terrasense_vwc" numeric(5,2) NOT NULL,
    "terrasense_ec" integer NOT NULL,
    "terrasense_n" integer,
    "terrasense_p" integer,
    "terrasense_k" integer,
    "lab_ph" numeric(4,2) NOT NULL,
    "lab_vwc" numeric(5,2) NOT NULL,
    "lab_ec" integer NOT NULL,
    "lab_n" integer,
    "lab_p" integer,
    "lab_k" integer,
    "concordance_pct" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lab_validation_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "age" integer DEFAULT 35 NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" DEFAULT '+56 9 1234 5678'::"text",
    "role" "text" DEFAULT 'agronomist'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "frost_alerts_enabled" boolean DEFAULT true NOT NULL,
    "moisture_alerts_enabled" boolean DEFAULT true NOT NULL,
    "ph_alerts_enabled" boolean DEFAULT true NOT NULL,
    "salinity_alerts_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_completed_at" timestamp with time zone,
    "onboarding_method" "text",
    "app_preferences" "jsonb" DEFAULT '{"theme": "system", "language": "es", "guides_seen": {}, "notifications": {"sync": false, "device": true, "weather": true, "agronomic": true}, "measurement_system": "metric"}'::"jsonb" NOT NULL,
    "push_token" "text",
    CONSTRAINT "profiles_app_preferences_object_check" CHECK ((("jsonb_typeof"("app_preferences") = 'object'::"text") AND (COALESCE(("app_preferences" ->> 'language'::"text"), 'es'::"text") = ANY (ARRAY['es'::"text", 'en'::"text"])) AND (COALESCE(("app_preferences" ->> 'theme'::"text"), 'system'::"text") = ANY (ARRAY['system'::"text", 'light'::"text", 'dark'::"text"])) AND (COALESCE(("app_preferences" ->> 'measurement_system'::"text"), 'metric'::"text") = ANY (ARRAY['metric'::"text", 'imperial'::"text"])) AND ("jsonb_typeof"(COALESCE(("app_preferences" -> 'notifications'::"text"), '{}'::"jsonb")) = 'object'::"text") AND ("jsonb_typeof"(COALESCE(("app_preferences" -> 'guides_seen'::"text"), '{}'::"jsonb")) = 'object'::"text"))),
    CONSTRAINT "profiles_onboarding_method_check" CHECK ((("onboarding_method" IS NULL) OR ("onboarding_method" = ANY (ARRAY['qr'::"text", 'pairing'::"text"])))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'agronomist'::"text", 'operator'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."onboarding_completed_at" IS 'Fecha en que la cuenta terminó la vinculación inicial. Persistir en servidor evita repetir el onboarding después de reinstalar la aplicación.';



COMMENT ON COLUMN "public"."profiles"."onboarding_method" IS 'Ruta utilizada para terminar el onboarding: qr (operador invitado) o pairing (primer propietario del equipo).';



COMMENT ON COLUMN "public"."profiles"."app_preferences" IS 'Preferencias multiplataforma de TerraSense: idioma, tema, sistema de medición, categorías de notificación y guías ya vistas.';



COMMENT ON COLUMN "public"."profiles"."push_token" IS 'Token de Expo para notificaciones push. Lo escribe el dueño de la fila al conceder el permiso y se limpia al cerrar sesión. Nulo significa que no hay dispositivo registrado para avisos.';



CREATE TABLE IF NOT EXISTS "public"."push_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device_id" "uuid",
    "title" character varying(150) NOT NULL,
    "body" "text" NOT NULL,
    "category" character varying(30) NOT NULL,
    "severity" character varying(10) DEFAULT 'medium'::character varying NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_type" "text",
    "requester_user_id" "uuid",
    CONSTRAINT "push_alerts_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['MOISTURE_DROP'::character varying, 'FROST'::character varying, 'PH_DRIFT'::character varying, 'EC_SALINITY'::character varying, 'SYSTEM'::character varying])::"text"[]))),
    CONSTRAINT "push_alerts_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::"text"[])))
);


ALTER TABLE "public"."push_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."soil_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "field_name" character varying(100) DEFAULT 'Lote General'::character varying NOT NULL,
    "quadrant" character varying(10) DEFAULT 'CENTER'::character varying,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "crop_id" character varying(50) DEFAULT 'tomate'::character varying NOT NULL,
    "soil_texture" character varying(50) DEFAULT 'franco'::character varying NOT NULL,
    "vwc_percent" numeric(5,2) NOT NULL,
    "soil_temp_c" numeric(5,2) NOT NULL,
    "ec_us_cm" integer NOT NULL,
    "ph" numeric(4,2) NOT NULL,
    "nitrogen" integer DEFAULT 45 NOT NULL,
    "phosphorus" integer DEFAULT 30 NOT NULL,
    "potassium" integer DEFAULT 85 NOT NULL,
    "canopy_temp_c" numeric(5,2),
    "canopy_humidity_pct" numeric(5,2),
    "vpd_kpa" numeric(5,2),
    "verdict" character varying(10) NOT NULL,
    "verdict_title" "text" NOT NULL,
    "action_summary" "text",
    "measured_at" timestamp with time zone DEFAULT "now"(),
    "phenological_stage" "text" DEFAULT 'pre_siembra'::"text" NOT NULL,
    "gps_accuracy_m" real,
    "engine_version" "text" DEFAULT '0.0.0'::"text" NOT NULL,
    "crop_catalog_version" "text" DEFAULT '0.0.0'::"text" NOT NULL,
    "firmware_version" "text",
    "diagnosis" "jsonb",
    "client_uuid" "uuid",
    "air_pressure_hpa" numeric(5,1),
    "battery_percent" smallint,
    "data_generation" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "soil_measurements_battery_percent_check" CHECK ((("battery_percent" >= 0) AND ("battery_percent" <= 100))),
    CONSTRAINT "soil_measurements_phenological_stage_check" CHECK (("phenological_stage" = ANY (ARRAY['pre_siembra'::"text", 'vegetativo'::"text", 'floracion'::"text", 'cosecha'::"text"]))),
    CONSTRAINT "soil_measurements_quadrant_check" CHECK ((("quadrant")::"text" = ANY ((ARRAY['NW'::character varying, 'NE'::character varying, 'SE'::character varying, 'SW'::character varying, 'CENTER'::character varying, 'FREE'::character varying])::"text"[]))),
    CONSTRAINT "soil_measurements_verdict_check" CHECK ((("verdict")::"text" = ANY ((ARRAY['GREEN'::character varying, 'AMBER'::character varying, 'RED'::character varying])::"text"[])))
);


ALTER TABLE "public"."soil_measurements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."soil_measurements"."canopy_temp_c" IS 'Temperatura del aire medida por el BME280 del equipo, bytes 16-19 de la trama BLE v1. NUNCA de la API del clima.';



COMMENT ON COLUMN "public"."soil_measurements"."canopy_humidity_pct" IS 'Humedad relativa medida por el BME280, resolución 0,5 %. NULL si el sensor no respondió.';



COMMENT ON COLUMN "public"."soil_measurements"."vpd_kpa" IS 'Déficit de presión de vapor, derivado de canopy_temp_c y canopy_humidity_pct (Tetens). NULL si falta cualquiera de los dos.';



COMMENT ON COLUMN "public"."soil_measurements"."phenological_stage" IS 'Etapa del ciclo productivo en que se tomó la medición. Determina qué evalúa el semáforo: pre_siembra (germinación), vegetativo (nutrición y riego), floracion (estrés salino e hídrico), cosecha (transitabilidad del suelo).';



COMMENT ON COLUMN "public"."soil_measurements"."gps_accuracy_m" IS 'Precisión reportada por el GPS al capturar el punto. La app advierte al usuario si supera los 15 m antes de guardar.';



COMMENT ON COLUMN "public"."soil_measurements"."engine_version" IS 'Versión del motor de inferencia que produjo el veredicto. Requisito probatorio: permite reproducir la recomendación exactamente.';



COMMENT ON COLUMN "public"."soil_measurements"."air_pressure_hpa" IS 'Presión atmosférica medida por el BME280, resolución 1 hPa. NULL si el sensor no respondió.';



COMMENT ON COLUMN "public"."soil_measurements"."battery_percent" IS 'Porcentaje recibido en el byte 14 de la misma trama BLE. NULL en registros anteriores.';



CREATE TABLE IF NOT EXISTS "public"."support_register_attempts" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "succeeded" boolean NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_register_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."support_register_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."support_register_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."support_register_attempts_id_seq" OWNED BY "public"."support_register_attempts"."id";



ALTER TABLE ONLY "public"."device_join_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."device_join_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."device_status_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."device_status_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."support_register_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."support_register_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_support_invite"
    ADD CONSTRAINT "admin_support_invite_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_support_users"
    ADD CONSTRAINT "admin_support_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_support_users"
    ADD CONSTRAINT "admin_support_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_access_invites"
    ADD CONSTRAINT "device_access_invites_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."device_access_invites"
    ADD CONSTRAINT "device_access_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."device_data_resets"
    ADD CONSTRAINT "device_data_resets_pkey" PRIMARY KEY ("user_id", "device_id");



ALTER TABLE ONLY "public"."device_join_attempts"
    ADD CONSTRAINT "device_join_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_member_audit"
    ADD CONSTRAINT "device_member_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_members"
    ADD CONSTRAINT "device_members_device_id_user_id_key" UNIQUE ("device_id", "user_id");



ALTER TABLE ONLY "public"."device_members"
    ADD CONSTRAINT "device_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_status_log"
    ADD CONSTRAINT "device_status_log_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."devices"
    ADD CONSTRAINT "devices_device_code_15_digits" CHECK ((("device_code")::"text" ~ '^[1-9][0-9]{14}$'::"text")) NOT VALID;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_device_code_key" UNIQUE ("device_code");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."firmware_releases"
    ADD CONSTRAINT "firmware_releases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."firmware_releases"
    ADD CONSTRAINT "firmware_releases_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."lab_validation_records"
    ADD CONSTRAINT "lab_validation_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."soil_measurements"
    ADD CONSTRAINT "soil_measurements_air_ranges" CHECK (((("canopy_temp_c" IS NULL) OR (("canopy_temp_c" >= ('-40'::integer)::numeric) AND ("canopy_temp_c" <= (85)::numeric))) AND (("canopy_humidity_pct" IS NULL) OR (("canopy_humidity_pct" >= (0)::numeric) AND ("canopy_humidity_pct" <= (100)::numeric))) AND (("air_pressure_hpa" IS NULL) OR (("air_pressure_hpa" >= (300)::numeric) AND ("air_pressure_hpa" <= (1100)::numeric))) AND (("vpd_kpa" IS NULL) OR (("vpd_kpa" >= (0)::numeric) AND ("vpd_kpa" <= (20)::numeric))))) NOT VALID;



ALTER TABLE "public"."soil_measurements"
    ADD CONSTRAINT "soil_measurements_coordinates_pair" CHECK (((("latitude" IS NULL) AND ("longitude" IS NULL)) OR (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)) AND (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric))))) NOT VALID;



ALTER TABLE ONLY "public"."soil_measurements"
    ADD CONSTRAINT "soil_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_register_attempts"
    ADD CONSTRAINT "support_register_attempts_pkey" PRIMARY KEY ("id");



CREATE INDEX "device_member_audit_device_created_idx" ON "public"."device_member_audit" USING "btree" ("device_id", "created_at" DESC);



CREATE UNIQUE INDEX "device_members_one_admin" ON "public"."device_members" USING "btree" ("device_id") WHERE (("role")::"text" = 'admin'::"text");



CREATE UNIQUE INDEX "idx_admin_support_users_user_id" ON "public"."admin_support_users" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_device_status_log_device_time" ON "public"."device_status_log" USING "btree" ("device_id", "recorded_at" DESC);



CREATE UNIQUE INDEX "idx_devices_device_code" ON "public"."devices" USING "btree" ("device_code");



CREATE INDEX "idx_firmware_published" ON "public"."firmware_releases" USING "btree" ("hardware_target", "is_published", "created_at" DESC);



CREATE INDEX "idx_join_attempts_user_time" ON "public"."device_join_attempts" USING "btree" ("user_id", "attempted_at" DESC);



CREATE UNIQUE INDEX "idx_soil_measurements_client_uuid" ON "public"."soil_measurements" USING "btree" ("client_uuid") WHERE ("client_uuid" IS NOT NULL);



CREATE INDEX "idx_soil_measurements_device_fecha" ON "public"."soil_measurements" USING "btree" ("device_id", "measured_at" DESC);



CREATE INDEX "idx_soil_measurements_stage" ON "public"."soil_measurements" USING "btree" ("device_id", "phenological_stage", "measured_at" DESC);



CREATE UNIQUE INDEX "soil_measurements_client_uuid_upsert" ON "public"."soil_measurements" USING "btree" ("client_uuid");



CREATE CONSTRAINT TRIGGER "trg_check_device_administrator" AFTER INSERT OR DELETE OR UPDATE ON "public"."device_members" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_device_administrator"();



CREATE OR REPLACE TRIGGER "trg_device_member_default_authorization" BEFORE INSERT ON "public"."device_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_device_member_authorization_default"();



CREATE OR REPLACE TRIGGER "trg_invalidate_empty_device_invite" AFTER DELETE ON "public"."device_members" FOR EACH ROW EXECUTE FUNCTION "public"."invalidate_empty_device_invite"();



CREATE OR REPLACE TRIGGER "trg_log_device_status_change" AFTER UPDATE ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."log_device_status_change"();



CREATE OR REPLACE TRIGGER "trg_mark_onboarding_from_membership" AFTER INSERT OR UPDATE OF "role", "is_authorized" ON "public"."device_members" FOR EACH ROW EXECUTE FUNCTION "public"."mark_onboarding_from_membership"();



CREATE OR REPLACE TRIGGER "trg_measurement_generation" BEFORE INSERT OR UPDATE ON "public"."soil_measurements" FOR EACH ROW EXECUTE FUNCTION "public"."check_measurement_generation"();



CREATE OR REPLACE TRIGGER "trg_normalize_device_versions" BEFORE INSERT OR UPDATE ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_device_versions"();



CREATE OR REPLACE TRIGGER "trg_protect_device_generation" BEFORE UPDATE ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."protect_device_generation"();



CREATE OR REPLACE TRIGGER "trg_protect_onboarding_fields" BEFORE UPDATE OF "onboarding_completed_at", "onboarding_method" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_onboarding_fields"();



ALTER TABLE ONLY "public"."admin_support_users"
    ADD CONSTRAINT "admin_support_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_access_invites"
    ADD CONSTRAINT "device_access_invites_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_data_resets"
    ADD CONSTRAINT "device_data_resets_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_data_resets"
    ADD CONSTRAINT "device_data_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_join_attempts"
    ADD CONSTRAINT "device_join_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_member_audit"
    ADD CONSTRAINT "device_member_audit_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_member_audit"
    ADD CONSTRAINT "device_member_audit_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_member_audit"
    ADD CONSTRAINT "device_member_audit_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_members"
    ADD CONSTRAINT "device_members_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_members"
    ADD CONSTRAINT "device_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_status_log"
    ADD CONSTRAINT "device_status_log_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."firmware_releases"
    ADD CONSTRAINT "firmware_releases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."soil_measurements"
    ADD CONSTRAINT "soil_measurements_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."soil_measurements"
    ADD CONSTRAINT "soil_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."admin_support_invite" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_support_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_access_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_data_resets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_join_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_measurements_membership_required" ON "public"."soil_measurements" AS RESTRICTIVE TO "authenticated" USING ("public"."has_device_access"("device_id")) WITH CHECK ("public"."has_device_access"("device_id"));



ALTER TABLE "public"."device_member_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_status_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."firmware_releases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_validation_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_device_resets" ON "public"."device_data_resets" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."soil_measurements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_register_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_select_staff" ON "public"."admin_support_users" FOR SELECT TO "authenticated" USING (("public"."is_support_staff"() OR ("user_id" = "auth"."uid"())));



CREATE POLICY "ts_alerts_select" ON "public"."push_alerts" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("device_id" IS NOT NULL) AND "public"."has_device_access"("device_id"))));



CREATE POLICY "ts_alerts_update" ON "public"."push_alerts" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "ts_device_members_delete_own" ON "public"."device_members" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "ts_device_members_select_own" ON "public"."device_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "ts_device_status_log_select" ON "public"."device_status_log" FOR SELECT TO "authenticated" USING (("public"."has_device_access"("device_id") OR "public"."is_support_staff"()));



CREATE POLICY "ts_devices_select_member" ON "public"."devices" FOR SELECT TO "authenticated" USING ("public"."has_device_access"("id"));



CREATE POLICY "ts_devices_update_member" ON "public"."devices" FOR UPDATE TO "authenticated" USING ("public"."has_device_access"("id")) WITH CHECK ("public"."has_device_access"("id"));



CREATE POLICY "ts_firmware_select_published" ON "public"."firmware_releases" FOR SELECT TO "authenticated" USING (("is_published" = true));



CREATE POLICY "ts_lab_select_auth" ON "public"."lab_validation_records" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ts_measurements_delete" ON "public"."soil_measurements" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "ts_measurements_insert" ON "public"."soil_measurements" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "ts_measurements_select" ON "public"."soil_measurements" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."has_device_access"("device_id")));



CREATE POLICY "ts_measurements_update" ON "public"."soil_measurements" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."has_device_access"("device_id")));



CREATE POLICY "ts_member_audit_select_admin" ON "public"."device_member_audit" FOR SELECT TO "authenticated" USING ("public"."has_device_admin_access"("device_id"));



CREATE POLICY "ts_profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "ts_profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "ts_profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."admin_approve_device_member"("p_device_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_approve_device_member"("p_device_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_approve_device_member"("p_device_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_factory_reset_device"("p_device_id" "uuid", "p_confirm_device_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_factory_reset_device"("p_device_id" "uuid", "p_confirm_device_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_factory_reset_device"("p_device_id" "uuid", "p_confirm_device_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_get_device_detail"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_get_device_detail"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_device_detail"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_fleet"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_fleet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_fleet"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_recent_measurements"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_recent_measurements"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_recent_measurements"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_push_firmware_update"("p_device_id" "uuid", "p_firmware_release_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_push_firmware_update"("p_device_id" "uuid", "p_firmware_release_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_push_firmware_update"("p_device_id" "uuid", "p_firmware_release_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_rotate_invite_code"("p_new_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_rotate_invite_code"("p_new_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_rotate_invite_code"("p_new_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_search"("p_query" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_search"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_search"("p_query" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_member_authorized"("p_device_id" "uuid", "p_user_id" "uuid", "p_authorized" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_member_authorized"("p_device_id" "uuid", "p_user_id" "uuid", "p_authorized" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_member_authorized"("p_device_id" "uuid", "p_user_id" "uuid", "p_authorized" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_member_role"("p_device_id" "uuid", "p_user_id" "uuid", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_member_role"("p_device_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_member_role"("p_device_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_staff_active"("p_user_id" "uuid", "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_staff_active"("p_user_id" "uuid", "p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_staff_active"("p_user_id" "uuid", "p_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_toggle_user_status"("p_user_id" "uuid", "p_new_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_toggle_user_status"("p_user_id" "uuid", "p_new_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_toggle_user_status"("p_user_id" "uuid", "p_new_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_unbind_user_device"("p_device_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_unbind_user_device"("p_device_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_unbind_user_device"("p_device_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."change_device_membership"("p_device_id" "uuid", "p_user_id" "uuid", "p_action" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."change_device_membership"("p_device_id" "uuid", "p_user_id" "uuid", "p_action" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_device_administrator"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."check_firmware_update"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_firmware_update"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_firmware_update"("p_device_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_measurement_generation"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_measurement_generation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_measurement_generation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_my_onboarding"("p_method" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_my_onboarding"("p_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_my_onboarding"("p_method" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_device_code"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_device_code"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_dashboard_full_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_full_data"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_full_data"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_device_access_qr"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_device_access_qr"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_device_access_qr"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."has_device_access"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_device_access"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_device_access"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."invalidate_empty_device_invite"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."is_support_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_support_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_support_staff"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."join_device_by_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_device_by_code"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."join_device_by_invite"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_device_by_invite"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_device_by_invite"("p_token" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."link_device_creator"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."list_device_members"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_device_members"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_device_members"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_my_pending_device_requests"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_my_pending_device_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_my_pending_device_requests"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_device_status_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_onboarding_from_membership"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."normalize_device_versions"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."prepare_device_for_owner"("p_device_id" "uuid", "p_confirm_device_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prepare_device_for_owner"("p_device_id" "uuid", "p_confirm_device_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."prepare_device_for_owner"("p_device_id" "uuid", "p_confirm_device_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_device_generation"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_device_generation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_device_generation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_onboarding_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_onboarding_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_onboarding_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_expired_operational_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_expired_operational_data"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_and_pair_device"("p_device_code" "text", "p_user_id" "uuid", "p_device_name" "text", "p_alias" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_and_pair_device"("p_device_code" "text", "p_user_id" "uuid", "p_device_name" "text", "p_alias" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."semver_parts"("p_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."semver_parts"("p_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."semver_parts"("p_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_device_member_authorization_default"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."support_self_register"("p_full_name" "text", "p_invite_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."support_self_register"("p_full_name" "text", "p_invite_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."support_self_register"("p_full_name" "text", "p_invite_code" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_support_invite" TO "anon";
GRANT ALL ON TABLE "public"."admin_support_invite" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_support_invite" TO "service_role";



GRANT ALL ON TABLE "public"."admin_support_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_support_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_support_users" TO "service_role";



GRANT ALL ON TABLE "public"."device_access_invites" TO "service_role";



GRANT ALL ON TABLE "public"."device_data_resets" TO "service_role";
GRANT SELECT ON TABLE "public"."device_data_resets" TO "authenticated";



GRANT ALL ON TABLE "public"."device_join_attempts" TO "anon";
GRANT ALL ON TABLE "public"."device_join_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."device_join_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_join_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_join_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_join_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."device_member_audit" TO "anon";
GRANT ALL ON TABLE "public"."device_member_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."device_member_audit" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."device_members" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."device_members" TO "authenticated";
GRANT ALL ON TABLE "public"."device_members" TO "service_role";



GRANT ALL ON TABLE "public"."device_status_log" TO "anon";
GRANT ALL ON TABLE "public"."device_status_log" TO "authenticated";
GRANT ALL ON TABLE "public"."device_status_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_status_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_status_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_status_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."firmware_releases" TO "anon";
GRANT ALL ON TABLE "public"."firmware_releases" TO "authenticated";
GRANT ALL ON TABLE "public"."firmware_releases" TO "service_role";



GRANT ALL ON TABLE "public"."lab_validation_records" TO "anon";
GRANT ALL ON TABLE "public"."lab_validation_records" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_validation_records" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_alerts" TO "anon";
GRANT ALL ON TABLE "public"."push_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."push_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."soil_measurements" TO "anon";
GRANT ALL ON TABLE "public"."soil_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."soil_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."support_register_attempts" TO "anon";
GRANT ALL ON TABLE "public"."support_register_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."support_register_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."support_register_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."support_register_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."support_register_attempts_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































