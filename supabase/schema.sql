


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






CREATE OR REPLACE FUNCTION "public"."admin_approve_member"("p_device_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."admin_approve_member"("p_device_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_cancel_update"("p_device_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    PERFORM public.assert_support_staff();
    UPDATE public.device_firmware_updates SET status = 'cancelled', updated_at = now()
     WHERE device_id = p_device_id AND status IN ('sent', 'postponed');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay una actualización que se pueda cancelar (si se está instalando, espera a que termine).'
            USING ERRCODE = '22023';
    END IF;
    UPDATE public.push_alerts SET is_read = TRUE
     WHERE device_id = p_device_id AND event_type = 'firmware_update' AND is_read IS NOT TRUE;
END $$;


ALTER FUNCTION "public"."admin_cancel_update"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_release"("p_version" "text", "p_notes" "text", "p_sha256" "text", "p_size_bytes" integer, "p_storage_path" "text", "p_is_mandatory" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_id UUID;
BEGIN
    PERFORM public.assert_support_staff();
    IF p_version IS NULL OR p_version !~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN
        RAISE EXCEPTION 'La versión debe tener el formato X.Y.Z, por ejemplo 1.2.0.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.firmware_releases WHERE version = p_version) THEN
        RAISE EXCEPTION 'Ya existe la versión %.', p_version USING ERRCODE = '22023';
    END IF;
    IF p_sha256 IS NULL OR p_sha256 !~ '^[a-f0-9]{64}$' OR COALESCE(p_size_bytes, 0) <= 0
       OR p_storage_path IS NULL OR p_storage_path !~ '^releases/[0-9.]+\.bin$' THEN
        RAISE EXCEPTION 'El binario no se registró bien. Vuelve a cargarlo.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.firmware_releases
        (version, hardware_target, sha256, size_bytes, storage_path, release_notes, is_mandatory, created_by)
    VALUES (p_version, 'ESP32-WROOM-32', p_sha256, p_size_bytes, p_storage_path,
            NULLIF(trim(p_notes), ''), COALESCE(p_is_mandatory, FALSE), auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END $_$;


ALTER FUNCTION "public"."admin_create_release"("p_version" "text", "p_notes" "text", "p_sha256" "text", "p_size_bytes" integer, "p_storage_path" "text", "p_is_mandatory" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_release"("p_release_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_path TEXT;
BEGIN
    PERFORM public.assert_support_staff();
    DELETE FROM public.firmware_releases WHERE id = p_release_id AND is_published IS NOT TRUE
    RETURNING storage_path INTO v_path;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sólo se puede borrar una versión sin publicar.' USING ERRCODE = '22023';
    END IF;
    RETURN v_path;
END $$;


ALTER FUNCTION "public"."admin_delete_release"("p_release_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "measured_at" timestamp with time zone, "phenological_stage" "text", "vwc_percent" numeric, "soil_temp_c" numeric, "ec_us_cm" integer, "ph" numeric, "nitrogen" integer, "phosphorus" integer, "potassium" integer, "canopy_temp_c" numeric, "canopy_humidity_pct" numeric, "air_pressure_hpa" numeric, "battery_percent" integer, "weather" "jsonb", "verdict" "text", "verdict_title" "text", "action_summary" "text", "latitude" numeric, "longitude" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_device_members"("p_device_id" "uuid") RETURNS TABLE("user_id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "role" "text", "is_authorized" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."admin_device_members"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_device_status"("p_device_id" "uuid") RETURNS TABLE("device_id" "uuid", "device_code" "text", "battery_level" integer, "firmware_version" "text", "first_seen_at" timestamp with time zone, "last_seen_at" timestamp with time zone, "is_online" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."admin_device_status"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_device_update"("p_device_id" "uuid") RETURNS TABLE("update_id" "uuid", "version" "text", "status" "text", "error" "text", "sent_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT u.id, r.version, u.status, u.error, u.sent_at, u.updated_at
      FROM public.device_firmware_updates u
      JOIN public.firmware_releases r ON r.id = u.release_id
     WHERE u.device_id = p_device_id
     ORDER BY u.sent_at DESC
     LIMIT 1;
END $$;


ALTER FUNCTION "public"."admin_device_update"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_releases"() RETURNS TABLE("id" "uuid", "version" "text", "release_notes" "text", "sha256" "text", "size_bytes" integer, "storage_path" "text", "is_mandatory" boolean, "is_published" boolean, "published_at" timestamp with time zone, "created_at" timestamp with time zone, "pending" integer, "installing" integer, "installed" integer, "failed" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT r.id, r.version, r.release_notes, r.sha256, r.size_bytes, r.storage_path, r.is_mandatory,
           r.is_published, r.published_at, r.created_at,
           count(*) FILTER (WHERE u.status IN ('sent', 'postponed'))::INTEGER,
           count(*) FILTER (WHERE u.status = 'installing')::INTEGER,
           count(*) FILTER (WHERE u.status = 'installed')::INTEGER,
           count(*) FILTER (WHERE u.status = 'failed')::INTEGER
      FROM public.firmware_releases r
      LEFT JOIN public.device_firmware_updates u ON u.release_id = r.id
     GROUP BY r.id
     ORDER BY public.semver_parts(r.version) DESC NULLS LAST, r.created_at DESC;
END $$;


ALTER FUNCTION "public"."admin_list_releases"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_make_admin"("p_device_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    PERFORM public.assert_support_staff();
    PERFORM public.change_device_membership(p_device_id, p_user_id, 'transfer_owner');
END $$;


ALTER FUNCTION "public"."admin_make_admin"("p_device_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_publish_release"("p_release_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    PERFORM public.assert_support_staff();
    UPDATE public.firmware_releases SET is_published = TRUE, published_at = now()
     WHERE id = p_release_id AND is_published IS NOT TRUE AND storage_path IS NOT NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La versión no existe o ya está publicada.' USING ERRCODE = '22023';
    END IF;
END $$;


ALTER FUNCTION "public"."admin_publish_release"("p_release_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reject_member"("p_device_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."admin_reject_member"("p_device_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_release_devices"("p_release_id" "uuid") RETURNS TABLE("device_id" "uuid", "device_code" "text", "status" "text", "error" "text", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT u.device_id, d.device_code::TEXT, u.status, u.error, u.updated_at
      FROM public.device_firmware_updates u
      JOIN public.devices d ON d.id = u.device_id
     WHERE u.release_id = p_release_id AND u.status <> 'cancelled'
     ORDER BY CASE u.status WHEN 'failed' THEN 0 WHEN 'installing' THEN 1 WHEN 'postponed' THEN 2
                            WHEN 'sent' THEN 3 ELSE 4 END, u.updated_at DESC;
END $$;


ALTER FUNCTION "public"."admin_release_devices"("p_release_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reset_device"("p_device_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

    DELETE FROM public.device_members          WHERE device_id = p_device_id;
    DELETE FROM public.soil_measurements       WHERE device_id = p_device_id;
    DELETE FROM public.push_alerts             WHERE device_id = p_device_id;
    DELETE FROM public.device_access_invites   WHERE device_id = p_device_id;
    DELETE FROM public.device_firmware_updates WHERE device_id = p_device_id;

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


ALTER FUNCTION "public"."admin_reset_device"("p_device_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_search"("p_query" "text") RETURNS TABLE("device_id" "uuid", "device_code" "text", "user_id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "role" "text", "is_authorized" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
END $_$;


ALTER FUNCTION "public"."admin_search"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_send_update"("p_device_id" "uuid", "p_release_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_release public.firmware_releases;
    v_version TEXT;
    v_alert   UUID;
BEGIN
    PERFORM public.assert_support_staff();
    SELECT * INTO v_release FROM public.firmware_releases WHERE id = p_release_id AND is_published;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa versión no está publicada.' USING ERRCODE = '22023';
    END IF;
    SELECT firmware_version INTO v_version FROM public.devices WHERE id = p_device_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT public.firmware_is_newer(v_release.version, v_version) THEN
        RAISE EXCEPTION 'El equipo ya tiene la versión % o una más nueva.', v_release.version USING ERRCODE = '22023';
    END IF;
    v_alert := public.assign_firmware_update(p_device_id, v_release);
    IF v_alert IS NULL THEN
        RAISE EXCEPTION 'El equipo no tiene un administrador que pueda aceptar la actualización.' USING ERRCODE = '22023';
    END IF;
    RETURN v_alert;
END $$;


ALTER FUNCTION "public"."admin_send_update"("p_device_id" "uuid", "p_release_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_send_update_all"("p_release_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_release public.firmware_releases;
    v_device  RECORD;
    v_alert   UUID;
    v_alerts  UUID[] := '{}';
    v_skipped INTEGER := 0;
BEGIN
    PERFORM public.assert_support_staff();
    SELECT * INTO v_release FROM public.firmware_releases WHERE id = p_release_id AND is_published;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa versión no está publicada.' USING ERRCODE = '22023';
    END IF;

    FOR v_device IN
        SELECT d.id, d.firmware_version FROM public.devices d ORDER BY d.id FOR UPDATE
    LOOP
        IF NOT public.firmware_is_newer(v_release.version, v_device.firmware_version)
           OR EXISTS (SELECT 1 FROM public.device_firmware_updates u
                       WHERE u.device_id = v_device.id AND u.release_id = p_release_id
                         AND u.status IN ('sent', 'postponed', 'installing', 'installed')) THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;
        v_alert := public.assign_firmware_update(v_device.id, v_release);
        IF v_alert IS NULL THEN
            v_skipped := v_skipped + 1;
        ELSE
            v_alerts := v_alerts || v_alert;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('sent', cardinality(v_alerts), 'skipped', v_skipped, 'alert_ids', to_jsonb(v_alerts));
END $$;


ALTER FUNCTION "public"."admin_send_update_all"("p_release_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_support_staff"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'Operación no permitida.' USING ERRCODE = '42501';
    END IF;
END $$;


ALTER FUNCTION "public"."assert_support_staff"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    "storage_path" "text",
    CONSTRAINT "firmware_releases_sha256_check" CHECK ((("sha256" IS NULL) OR ("sha256" ~ '^[a-f0-9]{64}$'::"text"))),
    CONSTRAINT "firmware_releases_size_bytes_check" CHECK ((("size_bytes" IS NULL) OR ("size_bytes" > 0))),
    CONSTRAINT "firmware_releases_version_check" CHECK (("version" ~ '^\d+\.\d+\.\d+$'::"text"))
);


ALTER TABLE "public"."firmware_releases" OWNER TO "postgres";


COMMENT ON TABLE "public"."firmware_releases" IS 'Catálogo de versiones de firmware para OTA. Sólo las publicadas son visibles; la escritura está reservada al rol de servicio.';



COMMENT ON COLUMN "public"."firmware_releases"."storage_path" IS 'Ruta del binario en el bucket privado «firmware». La app lo descarga sólo mientras tenga una actualización activa de esa versión.';



CREATE OR REPLACE FUNCTION "public"."assign_firmware_update"("p_device_id" "uuid", "p_release" "public"."firmware_releases") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin UUID;
    v_code  TEXT;
    v_alert UUID;
BEGIN
    SELECT dm.user_id INTO v_admin FROM public.device_members dm
     WHERE dm.device_id = p_device_id AND dm.role = 'admin' AND dm.is_authorized IS TRUE;
    IF v_admin IS NULL THEN RETURN NULL; END IF;
    SELECT device_code INTO v_code FROM public.devices WHERE id = p_device_id;

    UPDATE public.device_firmware_updates
       SET status = 'cancelled', updated_at = now()
     WHERE device_id = p_device_id AND status IN ('sent', 'postponed', 'installing');

    INSERT INTO public.device_firmware_updates (device_id, release_id, sent_by)
    VALUES (p_device_id, p_release.id, auth.uid());

    INSERT INTO public.push_alerts (device_id, user_id, title, body, category, severity, event_type)
    VALUES (p_device_id, v_admin, 'Actualización disponible',
            format('La versión %s está lista para tu sonda %s. Abre TerraSense para instalarla.',
                   p_release.version, v_code),
            'device', 'medium', 'firmware_update')
    RETURNING id INTO v_alert;
    RETURN v_alert;
END $$;


ALTER FUNCTION "public"."assign_firmware_update"("p_device_id" "uuid", "p_release" "public"."firmware_releases") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."firmware_is_newer"("p_release" "text", "p_installed" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT p_installed IS NULL
      OR public.semver_parts(p_installed) IS NULL
      OR public.semver_parts(p_release) > public.semver_parts(p_installed);
$$;


ALTER FUNCTION "public"."firmware_is_newer"("p_release" "text", "p_installed" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."firmware_update_progress"("p_update_id" "uuid", "p_action" "text", "p_error" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_update public.device_firmware_updates;
    v_next   TEXT;
BEGIN
    SELECT * INTO v_update FROM public.device_firmware_updates WHERE id = p_update_id FOR UPDATE;
    IF NOT FOUND OR NOT public.has_device_admin_access(v_update.device_id) THEN
        RAISE EXCEPTION 'Actualización no encontrada.' USING ERRCODE = '42501';
    END IF;

    v_next := CASE
        WHEN p_action = 'postpone'  AND v_update.status IN ('sent', 'postponed')             THEN 'postponed'
        WHEN p_action = 'start'     AND v_update.status IN ('sent', 'postponed', 'failed')   THEN 'installing'
        WHEN p_action = 'installed' AND v_update.status = 'installing'                       THEN 'installed'
        WHEN p_action = 'failed'    AND v_update.status = 'installing'                       THEN 'failed'
    END;
    IF v_next IS NULL THEN
        RAISE EXCEPTION 'La actualización ya no admite ese paso.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.device_firmware_updates
       SET status = v_next,
           error = CASE WHEN v_next = 'failed' THEN left(COALESCE(p_error, 'Falló sin detalle.'), 300) END,
           updated_at = now()
     WHERE id = p_update_id;
    IF v_next IN ('installed', 'postponed') THEN
        UPDATE public.push_alerts SET is_read = TRUE
         WHERE device_id = v_update.device_id AND event_type = 'firmware_update' AND is_read IS NOT TRUE;
    END IF;
END $$;


ALTER FUNCTION "public"."firmware_update_progress"("p_update_id" "uuid", "p_action" "text", "p_error" "text") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."get_device_access_qr"("p_device_id" "uuid") RETURNS TABLE("token" "uuid", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM 1 FROM public.devices WHERE id = p_device_id FOR UPDATE;
  IF NOT public.has_device_access(p_device_id) THEN
    RAISE EXCEPTION 'Debes ser un miembro aprobado del equipo.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.device_access_invites AS invitation(device_id, expires_at)
    VALUES(p_device_id, clock_timestamp() + interval '5 minutes')
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


CREATE OR REPLACE FUNCTION "public"."is_backoffice_email"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.admin_support_users s
      JOIN auth.users u ON u.id = s.user_id
     WHERE s.is_active IS TRUE
       AND lower(u.email) = 'akurasoporte@gmail.com'
       AND lower(u.email) = lower(trim(COALESCE(p_email, '')))
  );
$$;


ALTER FUNCTION "public"."is_backoffice_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_support_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.admin_support_users s
      JOIN auth.users u ON u.id = s.user_id
     WHERE s.user_id = auth.uid()
       AND s.is_active IS TRUE
       AND lower(u.email) = 'akurasoporte@gmail.com'
       AND u.email_confirmed_at IS NOT NULL
  );
$$;


ALTER FUNCTION "public"."is_support_staff"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_support_staff"() IS 'Puerta de todo el backoffice: true sólo para la cuenta akurasoporte@gmail.com confirmada y activa en admin_support_users.';



CREATE OR REPLACE FUNCTION "public"."join_device_by_code"("p_code" "text") RETURNS TABLE("device_id" "uuid", "device_name" "text", "is_authorized" boolean, "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE v_uid UUID := auth.uid(); v_code TEXT; v_device public.devices; v_first BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501'; END IF;
  v_code := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');
  IF v_code !~ '^[0-9]{15}$' THEN RAISE EXCEPTION 'Código inválido.' USING ERRCODE = '22023'; END IF;
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



CREATE OR REPLACE FUNCTION "public"."my_firmware_updates"() RETURNS TABLE("update_id" "uuid", "device_id" "uuid", "device_code" "text", "device_name" "text", "status" "text", "version" "text", "release_notes" "text", "is_mandatory" boolean, "sha256" "text", "size_bytes" integer, "storage_path" "text", "sent_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT u.id, d.id, d.device_code::TEXT, COALESCE(d.alias, d.name)::TEXT, u.status, r.version,
           r.release_notes, r.is_mandatory, r.sha256, r.size_bytes, r.storage_path, u.sent_at
      FROM public.device_firmware_updates u
      JOIN public.devices d ON d.id = u.device_id
      JOIN public.firmware_releases r ON r.id = u.release_id
      JOIN public.device_members dm ON dm.device_id = u.device_id
     WHERE dm.user_id = auth.uid() AND dm.role = 'admin' AND dm.is_authorized IS TRUE
       AND u.status IN ('sent', 'postponed', 'installing')
     ORDER BY u.sent_at;
$$;


ALTER FUNCTION "public"."my_firmware_updates"() OWNER TO "postgres";


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
  IF v_code !~ '^[0-9]{15}$' THEN RAISE EXCEPTION 'Código inválido.' USING ERRCODE = '22023'; END IF;
  -- Serializa también las altas cuando todavía no existe la fila del equipo.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_code, 0));
  SELECT d.id INTO v_id FROM public.devices d WHERE d.device_code = v_code FOR UPDATE;
  IF v_id IS NULL THEN
    INSERT INTO public.devices(device_code, name, hardware_version, microclimate_sensor_type)
    VALUES(v_code, COALESCE(NULLIF(trim(p_name), ''), 'Sonda TerraSense'), 'ESP32-WROOM-32', 'BME280')
    RETURNING id INTO v_id;
  END IF;
  -- Sin miembros (sonda nueva o reseteada por el backoffice): quien la registra
  -- queda como administrador. La prueba física es la ventana PAIR, que exige la app.
  IF NOT EXISTS (SELECT 1 FROM public.device_members dm WHERE dm.device_id = v_id) THEN
    UPDATE public.devices SET name = COALESCE(NULLIF(trim(p_name), ''), name) WHERE id = v_id;
    INSERT INTO public.device_members(device_id, user_id, role, is_authorized) VALUES(v_id, v_uid, 'admin', TRUE);
  ELSIF NOT public.has_device_access(v_id) THEN
    RAISE EXCEPTION 'El equipo ya tiene usuarios. Solicita acceso mediante su QR.' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY SELECT v_id;
END $_$;


ALTER FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") IS 'Registra de forma atómica la sonda vinculada por BLE con la ventana PAIR abierta. Si el equipo no tiene miembros (nuevo o reseteado por el backoffice), quien lo registra queda como administrador. El INSERT directo de devices permanece cerrado por RLS.';



CREATE OR REPLACE FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer DEFAULT NULL::integer, "p_firmware_version" "text" DEFAULT NULL::"text", "p_contacted_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_id      UUID;
    v_at      TIMESTAMPTZ := LEAST(COALESCE(p_contacted_at, now()), now());
    v_battery INTEGER := CASE WHEN p_battery BETWEEN 0 AND 100 THEN p_battery END;
    v_version TEXT := CASE WHEN p_firmware_version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN p_firmware_version END;
BEGIN
    SELECT id INTO v_id FROM public.devices
     WHERE device_code = regexp_replace(COALESCE(p_device_code, ''), '\D', '', 'g');
    IF v_id IS NULL OR NOT public.has_device_access(v_id) THEN
        RAISE EXCEPTION 'No tienes acceso a este equipo.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.devices d
       SET first_seen_at    = LEAST(COALESCE(d.first_seen_at, v_at), v_at),
           last_seen_at     = GREATEST(COALESCE(d.last_seen_at, v_at), v_at),
           battery_level    = CASE WHEN d.last_seen_at IS NULL OR v_at >= d.last_seen_at
                                   THEN COALESCE(v_battery, d.battery_level) ELSE d.battery_level END,
           firmware_version = CASE WHEN d.last_seen_at IS NULL OR v_at >= d.last_seen_at
                                   THEN COALESCE(v_version, d.firmware_version) ELSE d.firmware_version END
     WHERE d.id = v_id;
END $_$;


ALTER FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer, "p_firmware_version" "text", "p_contacted_at" timestamp with time zone) OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."device_firmware_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "release_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "error" "text",
    "sent_by" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "device_firmware_updates_error_check" CHECK ((("error" IS NULL) OR ("length"("error") <= 300))),
    CONSTRAINT "device_firmware_updates_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'postponed'::"text", 'installing'::"text", 'installed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."device_firmware_updates" OWNER TO "postgres";


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
    "firmware_version" character varying(20),
    "battery_level" smallint,
    "is_active" boolean DEFAULT true NOT NULL,
    "pairing_mode_active" boolean DEFAULT false NOT NULL,
    "microclimate_sensor_type" character varying(50) DEFAULT 'SHT31_CANOPY'::character varying NOT NULL,
    "transmission_interval_seconds" integer DEFAULT 300 NOT NULL,
    "last_measurement_at" timestamp with time zone,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data_generation" integer DEFAULT 0 NOT NULL,
    "first_seen_at" timestamp with time zone,
    CONSTRAINT "devices_battery_level_check" CHECK ((("battery_level" >= 0) AND ("battery_level" <= 100))),
    CONSTRAINT "devices_device_code_15_digits" CHECK ((("device_code")::"text" ~ '^[0-9]{15}$'::"text"))
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."devices"."device_code" IS 'ID de 15 dígitos derivado de la MAC del ESP32 (puede empezar con 0). Lo lee la app de la sonda al vincular; no cambia nunca.';



COMMENT ON COLUMN "public"."devices"."last_seen_at" IS 'Último contacto real de la sonda con un teléfono. La sonda no tiene internet: «online» significa que un teléfono habló con ella hace poco.';



COMMENT ON COLUMN "public"."devices"."first_seen_at" IS 'Primer contacto real de la sonda con un teléfono (report_device_contact). NULL hasta entonces y tras un reset.';



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
    CONSTRAINT "push_alerts_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['MOISTURE_DROP'::character varying, 'FROST'::character varying, 'PH_DRIFT'::character varying, 'EC_SALINITY'::character varying, 'SYSTEM'::character varying, 'agronomic'::character varying, 'device'::character varying, 'weather'::character varying, 'sync'::character varying])::"text"[]))),
    CONSTRAINT "push_alerts_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'warning'::character varying])::"text"[])))
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



ALTER TABLE ONLY "public"."device_join_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."device_join_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."device_status_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."device_status_log_id_seq"'::"regclass");



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



ALTER TABLE ONLY "public"."device_firmware_updates"
    ADD CONSTRAINT "device_firmware_updates_pkey" PRIMARY KEY ("id");



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



CREATE UNIQUE INDEX "device_firmware_updates_one_active" ON "public"."device_firmware_updates" USING "btree" ("device_id") WHERE ("status" = ANY (ARRAY['sent'::"text", 'postponed'::"text", 'installing'::"text"]));



CREATE INDEX "device_firmware_updates_release" ON "public"."device_firmware_updates" USING "btree" ("release_id");



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



ALTER TABLE ONLY "public"."device_firmware_updates"
    ADD CONSTRAINT "device_firmware_updates_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_firmware_updates"
    ADD CONSTRAINT "device_firmware_updates_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "public"."firmware_releases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_firmware_updates"
    ADD CONSTRAINT "device_firmware_updates_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE "public"."admin_support_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_access_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_data_resets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_firmware_updates" ENABLE ROW LEVEL SECURITY;


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






















































































































































REVOKE ALL ON FUNCTION "public"."admin_approve_member"("p_device_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_approve_member"("p_device_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_approve_member"("p_device_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_cancel_update"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_cancel_update"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_cancel_update"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_create_release"("p_version" "text", "p_notes" "text", "p_sha256" "text", "p_size_bytes" integer, "p_storage_path" "text", "p_is_mandatory" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_create_release"("p_version" "text", "p_notes" "text", "p_sha256" "text", "p_size_bytes" integer, "p_storage_path" "text", "p_is_mandatory" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_release"("p_version" "text", "p_notes" "text", "p_sha256" "text", "p_size_bytes" integer, "p_storage_path" "text", "p_is_mandatory" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_delete_release"("p_release_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_delete_release"("p_release_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_release"("p_release_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_device_members"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_device_members"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_device_members"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_device_status"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_device_status"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_device_status"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_device_update"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_device_update"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_device_update"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_releases"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_releases"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_releases"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_make_admin"("p_device_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_make_admin"("p_device_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_make_admin"("p_device_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_publish_release"("p_release_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_publish_release"("p_release_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_publish_release"("p_release_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_reject_member"("p_device_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_reject_member"("p_device_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reject_member"("p_device_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_release_devices"("p_release_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_release_devices"("p_release_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_release_devices"("p_release_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_reset_device"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_reset_device"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reset_device"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_search"("p_query" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_search"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_search"("p_query" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_send_update"("p_device_id" "uuid", "p_release_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_send_update"("p_device_id" "uuid", "p_release_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_send_update"("p_device_id" "uuid", "p_release_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_send_update_all"("p_release_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_send_update_all"("p_release_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_send_update_all"("p_release_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assert_support_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_support_staff"() TO "service_role";



GRANT ALL ON TABLE "public"."firmware_releases" TO "anon";
GRANT ALL ON TABLE "public"."firmware_releases" TO "authenticated";
GRANT ALL ON TABLE "public"."firmware_releases" TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_firmware_update"("p_device_id" "uuid", "p_release" "public"."firmware_releases") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_firmware_update"("p_device_id" "uuid", "p_release" "public"."firmware_releases") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."firmware_is_newer"("p_release" "text", "p_installed" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."firmware_is_newer"("p_release" "text", "p_installed" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."firmware_is_newer"("p_release" "text", "p_installed" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."firmware_update_progress"("p_update_id" "uuid", "p_action" "text", "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."firmware_update_progress"("p_update_id" "uuid", "p_action" "text", "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."firmware_update_progress"("p_update_id" "uuid", "p_action" "text", "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_device_code"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_device_code"() TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."is_backoffice_email"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_backoffice_email"("p_email" "text") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."my_firmware_updates"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_firmware_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_firmware_updates"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."normalize_device_versions"() FROM PUBLIC;



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



REVOKE ALL ON FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer, "p_firmware_version" "text", "p_contacted_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer, "p_firmware_version" "text", "p_contacted_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer, "p_firmware_version" "text", "p_contacted_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."semver_parts"("p_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."semver_parts"("p_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."semver_parts"("p_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_device_member_authorization_default"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;


















GRANT ALL ON TABLE "public"."admin_support_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_support_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_support_users" TO "service_role";



GRANT ALL ON TABLE "public"."device_access_invites" TO "service_role";



GRANT ALL ON TABLE "public"."device_data_resets" TO "service_role";
GRANT SELECT ON TABLE "public"."device_data_resets" TO "authenticated";



GRANT ALL ON TABLE "public"."device_firmware_updates" TO "service_role";



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































