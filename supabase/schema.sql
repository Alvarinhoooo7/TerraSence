


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."admin_approve_member"("p_device_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.assert_support_staff();
  if not exists (select 1 from public.device_members
                  where device_id = p_device_id and user_id = p_user_id and is_authorized is not true) then
    raise exception 'No hay una solicitud pendiente de ese usuario.' using errcode = '22023';
  end if;
  perform public.change_device_membership(p_device_id, p_user_id, 'authorize');
end $$;


ALTER FUNCTION "public"."admin_approve_member"("p_device_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_cancel_update"("p_device_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.assert_support_staff();
  update public.device_firmware_updates set status = 'cancelled', updated_at = now()
    where device_id = p_device_id and status in ('sent', 'postponed');
  if not found then
    raise exception 'No hay una actualización que se pueda cancelar (si se está instalando, espera a que termine).'
      using errcode = '22023';
  end if;
end $$;


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


CREATE OR REPLACE FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_stage" "text" DEFAULT NULL::"text", "p_species_id" "text" DEFAULT NULL::"text", "p_without_species" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "measured_at" timestamp with time zone, "phenological_stage" "text", "vwc_percent" numeric, "soil_temp_c" numeric, "ec_us_cm" integer, "ph" numeric, "nitrogen" integer, "phosphorus" integer, "potassium" integer, "canopy_temp_c" numeric, "canopy_humidity_pct" numeric, "air_pressure_hpa" numeric, "battery_percent" integer, "weather" "jsonb", "verdict" "text", "verdict_title" "text", "action_summary" "text", "latitude" numeric, "longitude" numeric, "species" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    perform public.assert_support_staff();
    return query
    select m.id, m.measured_at, m.phenological_stage, m.vwc_percent, m.soil_temp_c, m.ec_us_cm, m.ph,
           m.nitrogen, m.phosphorus, m.potassium, m.canopy_temp_c, m.canopy_humidity_pct,
           m.air_pressure_hpa, m.battery_percent::integer,
           nullif(m.diagnosis -> 'weather', 'null'::jsonb),
           m.verdict::text, m.verdict_title, m.action_summary, m.latitude, m.longitude,
           public.measurement_species(m.diagnosis)
      from public.soil_measurements m
     where m.device_id = p_device_id
       -- Cada filtro nulo deja pasar todo; una etapa fuera del CHECK simplemente no
       -- coincide con ninguna fila.
       and (p_stage is null or m.phenological_stage = p_stage)
       -- «Sin especie» es una opción del filtro, no la ausencia de filtro, así que viaja
       -- en su propio parámetro: un id de especie no puede expresarla.
       and (not coalesce(p_without_species, false) or public.measurement_species(m.diagnosis) is null)
       and (p_species_id is null or coalesce(p_without_species, false)
            or public.measurement_species(m.diagnosis) ->> 'id' = p_species_id)
     order by m.measured_at desc nulls last, m.id
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end $$;


ALTER FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer, "p_offset" integer, "p_stage" "text", "p_species_id" "text", "p_without_species" boolean) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."admin_device_species"("p_device_id" "uuid") RETURNS TABLE("species" "jsonb", "measurements" integer, "last_measured_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    perform public.assert_support_staff();
    return query
    select (array_agg(s.species order by m.measured_at desc nulls last))[1],
           count(*)::integer,
           max(m.measured_at)
      from public.soil_measurements m
      cross join lateral (select public.measurement_species(m.diagnosis) as species) s
     where m.device_id = p_device_id
     group by s.species ->> 'id'
     order by (s.species ->> 'id') is null, max(m.measured_at) desc nulls last;
end $$;


ALTER FUNCTION "public"."admin_device_species"("p_device_id" "uuid") OWNER TO "postgres";


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
    SET "search_path" TO ''
    AS $$
begin
  perform public.assert_support_staff();
  if not exists (select 1 from public.device_members
                  where device_id = p_device_id and user_id = p_user_id and is_authorized is not true) then
    raise exception 'No hay una solicitud pendiente de ese usuario.' using errcode = '22023';
  end if;
  perform public.change_device_membership(p_device_id, p_user_id, 'remove');
end $$;


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
    SET "search_path" TO ''
    AS $$
declare v_device public.devices; v_members integer; v_meas integer;
begin
  perform public.assert_support_staff();
  select * into v_device from public.devices where id = p_device_id for update;
  if not found then raise exception 'Equipo no encontrado.' using errcode = 'P0002'; end if;
  select count(*) into v_members from public.device_members where device_id = p_device_id;
  select count(*) into v_meas from public.soil_measurements where device_id = p_device_id;
  insert into public.device_data_resets(user_id, device_id, generation)
    select user_id, device_id, v_device.data_generation + 1 from public.device_members where device_id = p_device_id
    on conflict (user_id, device_id) do update set generation = excluded.generation;
  perform set_config('terrasense.factory_reset', 'on', true);
  delete from public.device_members where device_id = p_device_id;
  perform set_config('terrasense.factory_reset', 'off', true);
  delete from public.soil_measurements where device_id = p_device_id;
  delete from public.push_alerts where device_id = p_device_id;
  delete from public.device_access_invites where device_id = p_device_id;
  delete from public.device_firmware_updates where device_id = p_device_id;
  update public.devices set data_generation = data_generation + 1, name = 'Sonda TerraSense', alias = null,
      pairing_mode_active = false, battery_level = null, first_seen_at = null, last_seen_at = null,
      last_measurement_at = null
    where id = p_device_id;
  -- Después del UPDATE: también se va la fila que el disparador acaba de registrar.
  delete from public.device_status_log where device_id = p_device_id;
  insert into public.device_member_audit(device_id, actor_user_id, action) values (p_device_id, auth.uid(), 'factory_reset');
  return jsonb_build_object('members_removed', v_members, 'measurements_deleted', v_meas);
end $$;


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
    SET "search_path" TO ''
    AS $$
declare
  v_release public.firmware_releases;
  v_device record;
  v_update uuid;
  v_updates uuid[] := '{}';
  v_skipped integer := 0;
begin
  perform public.assert_support_staff();
  select * into v_release from public.firmware_releases where id = p_release_id and is_published;
  if not found then
    raise exception 'Esa versión no está publicada.' using errcode = '22023';
  end if;
  for v_device in
    select d.id, d.firmware_version from public.devices d order by d.id for update
  loop
    if not public.firmware_is_newer(v_release.version, v_device.firmware_version)
       or exists (select 1 from public.device_firmware_updates u
                   where u.device_id = v_device.id and u.release_id = p_release_id
                     and u.status in ('sent', 'postponed', 'installing', 'installed')) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_update := public.assign_firmware_update(v_device.id, v_release);
    if v_update is null then
      v_skipped := v_skipped + 1;
    else
      v_updates := v_updates || v_update;
    end if;
  end loop;
  return jsonb_build_object('sent', cardinality(v_updates), 'skipped', v_skipped, 'update_ids', to_jsonb(v_updates));
end $$;


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
    SET "search_path" TO ''
    AS $$
declare v_admin uuid; v_update uuid;
begin
  select dm.user_id into v_admin from public.device_members dm
    where dm.device_id = p_device_id and dm.role = 'admin' and dm.is_authorized;
  if v_admin is null then return null; end if;
  update public.device_firmware_updates set status = 'cancelled', updated_at = now()
    where device_id = p_device_id and status in ('sent', 'postponed', 'installing');
  insert into public.device_firmware_updates(device_id, release_id, sent_by)
    values (p_device_id, p_release.id, auth.uid()) returning id into v_update;
  return v_update;
end $$;


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



CREATE OR REPLACE FUNCTION "public"."create_device_event"("p_event" "text", "p_device_id" "uuid", "p_user_id" "uuid", "p_requester" "uuid" DEFAULT NULL::"uuid", "p_source_transaction" bigint DEFAULT NULL::bigint) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_alert uuid;
begin
  insert into public.push_alerts(device_id, user_id, title, body, category, severity, event_type,
      requester_user_id, source_transaction)
    select p_device_id, p_user_id, c.title, c.body, 'device', 'medium', p_event, p_requester, p_source_transaction
    from public.notification_copy(p_event, 'es') c
    returning id into v_alert;
  -- Para que el aviso salga sin esperar al cron (pg_net envía al confirmar).
  perform public.invoke_push_dispatch();
  return v_alert;
end $$;


ALTER FUNCTION "public"."create_device_event"("p_event" "text", "p_device_id" "uuid", "p_user_id" "uuid", "p_requester" "uuid", "p_source_transaction" bigint) OWNER TO "postgres";


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
    SET "search_path" TO ''
    AS $$
declare
  v_update public.device_firmware_updates;
  v_next text;
begin
  select * into v_update from public.device_firmware_updates where id = p_update_id for update;
  if not found or not public.has_device_admin_access(v_update.device_id) then
    raise exception 'Actualización no encontrada.' using errcode = '42501';
  end if;
  v_next := case
    when p_action = 'postpone'  and v_update.status in ('sent', 'postponed')            then 'postponed'
    when p_action = 'start'     and v_update.status in ('sent', 'postponed', 'failed')  then 'installing'
    when p_action = 'installed' and v_update.status = 'installing'                      then 'installed'
    when p_action = 'failed'    and v_update.status = 'installing'                      then 'failed'
  end;
  if v_next is null then
    raise exception 'La actualización ya no admite ese paso.' using errcode = '22023';
  end if;
  update public.device_firmware_updates
     set status = v_next,
         error = case when v_next = 'failed' then left(coalesce(p_error, 'Falló sin detalle.'), 300) end,
         updated_at = now()
   where id = p_update_id;
end $$;


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


CREATE OR REPLACE FUNCTION "public"."get_my_notification"("p_alert_id" "uuid") RETURNS TABLE("id" "uuid", "event_type" "text", "title" "text", "body" "text", "device_id" "uuid", "created_at" timestamp with time zone, "read_at" timestamp with time zone, "status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select a.id, a.event_type, a.title::text, a.body, a.device_id, a.created_at, r.read_at,
    case when a.expires_at <= now() then 'expired' else a.status end
  from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where auth.uid() is not null and a.id = p_alert_id and r.user_id = auth.uid()
    and r.cancelled_at is null
    and public.notification_access_allowed(a, auth.uid())
$$;


ALTER FUNCTION "public"."get_my_notification"("p_alert_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_push_alert_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.category <> 'device'
     or new.event_type is null
     or new.event_type not in ('access_request', 'access_approved', 'access_rejected', 'admin_transferred') then
    raise exception 'Sólo se admiten avisos de acceso a equipos.' using errcode = '23514';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."guard_push_alert_event"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."invoke_push_dispatch"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_url text; v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'push_dispatch_service_role_key';
  if v_url is null or v_key is null then return; end if;
  perform net.http_post(url => v_url,
    headers => jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body => '{}'::jsonb, timeout_milliseconds => 10000);
exception when others then
  raise warning 'No se pudo despertar el despachador de avisos: %', sqlerrm;
end $$;


ALTER FUNCTION "public"."invoke_push_dispatch"() OWNER TO "postgres";


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
    SET "search_path" TO ''
    AS $$
declare v_device public.devices; v_new boolean; v_alert uuid; v_admin uuid;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  select d.* into v_device from public.devices d join public.device_access_invites i on i.device_id = d.id
    where i.token = p_token for update of d;
  -- La vigencia se revisa tras tomar el bloqueo: un reset o la rotación del QR pueden
  -- haberlo invalidado mientras esta petición esperaba.
  if not found or not exists (select 1 from public.device_access_invites i
      where i.device_id = v_device.id and i.token = p_token and i.expires_at > clock_timestamp()) then
    raise exception 'El QR venció o dejó de ser válido. Pide que te muestren el QR actual.' using errcode = '22023';
  end if;
  select dm.user_id into v_admin from public.device_members dm
    where dm.device_id = v_device.id and dm.role = 'admin' and dm.is_authorized;
  if v_admin is null then
    raise exception 'Este equipo debe vincularse primero por Bluetooth.' using errcode = '22023';
  end if;
  v_new := not exists (select 1 from public.device_members dm
    where dm.device_id = v_device.id and dm.user_id = auth.uid());
  insert into public.device_members(device_id, user_id, role, is_authorized)
    values (v_device.id, auth.uid(), 'user', false) on conflict do nothing;
  if v_new then
    select a.id into v_alert from public.push_alerts a where a.device_id = v_device.id
      and a.requester_user_id = auth.uid() and a.event_type = 'access_request'
      order by a.created_at desc, a.id desc limit 1;
  end if;
  return query select v_device.id, v_device.name::text, dm.is_authorized, dm.role::text, v_alert
    from public.device_members dm where dm.device_id = v_device.id and dm.user_id = auth.uid();
end $$;


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


CREATE OR REPLACE FUNCTION "public"."list_my_notifications"("p_limit" integer DEFAULT 30, "p_before" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_before_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "event_type" "text", "title" "text", "body" "text", "device_id" "uuid", "created_at" timestamp with time zone, "read_at" timestamp with time zone, "status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select a.id, a.event_type, a.title::text, a.body, a.device_id, a.created_at, r.read_at,
    case when a.expires_at <= now() then 'expired' else a.status end
  from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where auth.uid() is not null and r.user_id = auth.uid()
    and r.cancelled_at is null
    and public.notification_access_allowed(a, auth.uid())
    and (p_before is null or (a.created_at, a.id) <
      (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
$$;


ALTER FUNCTION "public"."list_my_notifications"("p_limit" integer, "p_before" timestamp with time zone, "p_before_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_alert_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  update public.notification_recipients r set read_at = coalesce(r.read_at, now())
    from public.push_alerts a
    where r.alert_id = p_alert_id and a.id = r.alert_id and r.user_id = auth.uid()
      and r.cancelled_at is null and public.notification_access_allowed(a, auth.uid());
  if not found then raise exception 'Aviso no disponible.' using errcode = '42501'; end if;
end $$;


ALTER FUNCTION "public"."mark_notification_read"("p_alert_id" "uuid") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."measurement_species"("p_diagnosis" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select case when jsonb_typeof(p_diagnosis -> 'presentation' -> 'species') = 'object'
              then p_diagnosis -> 'presentation' -> 'species' end
$$;


ALTER FUNCTION "public"."measurement_species"("p_diagnosis" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."measurement_species"("p_diagnosis" "jsonb") IS 'Especie que el agricultor indicó al medir, leída de la instantánea del diagnóstico; null si midió sin especie.';



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
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "source_transaction" bigint,
    CONSTRAINT "push_alerts_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['MOISTURE_DROP'::character varying, 'FROST'::character varying, 'PH_DRIFT'::character varying, 'EC_SALINITY'::character varying, 'SYSTEM'::character varying, 'agronomic'::character varying, 'device'::character varying, 'weather'::character varying, 'sync'::character varying])::"text"[]))),
    CONSTRAINT "push_alerts_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'warning'::character varying])::"text"[]))),
    CONSTRAINT "push_alerts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."push_alerts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."push_alerts"."is_read" IS 'Obsoleta. La lectura vive en notification_recipients.read_at, por usuario.';



CREATE OR REPLACE FUNCTION "public"."notification_access_allowed"("p_alert" "public"."push_alerts", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when p_alert.event_type = 'access_rejected' then p_alert.user_id = p_user_id
    when p_alert.event_type = 'access_request' then exists (
      select 1 from public.device_members admin where admin.device_id = p_alert.device_id
        and admin.user_id = p_user_id and admin.role = 'admin' and admin.is_authorized)
    else exists (select 1 from public.device_members m where m.device_id = p_alert.device_id
      and m.user_id = p_user_id and m.is_authorized)
  end
$$;


ALTER FUNCTION "public"."notification_access_allowed"("p_alert" "public"."push_alerts", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_copy"("p_event" "text", "p_language" "text") RETURNS TABLE("title" "text", "body" "text")
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case when p_language = 'en' then t.en_title else t.es_title end,
         case when p_language = 'en' then t.en_body else t.es_body end
  from (values
    ('access_request', 'Device access request',
      'Someone is waiting for your approval. Open Administration to review the request.',
      'Solicitud de acceso al equipo',
      'Un usuario espera tu aprobación. Abre Administración para revisar la solicitud.'),
    ('access_approved', 'Access approved', 'Your device access request was approved.',
      'Acceso aprobado', 'Tu solicitud de acceso al equipo fue aprobada.'),
    ('access_rejected', 'Request rejected', 'Your device access request was rejected.',
      'Solicitud rechazada', 'Tu solicitud de acceso al equipo fue rechazada.'),
    ('admin_transferred', 'Administration transferred', 'The administrator of this device changed.',
      'Administración transferida', 'La administración de este equipo cambió.')
  ) as t(event_type, en_title, en_body, es_title, es_body)
  where t.event_type = p_event
$$;


ALTER FUNCTION "public"."notification_copy"("p_event" "text", "p_language" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_dispatch_allowed"("p_alert" "public"."push_alerts", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p_alert.status = 'active' and p_alert.expires_at > now()
    and public.notification_access_allowed(p_alert, p_user_id)
    and (p_alert.event_type <> 'access_request' or exists (
      select 1 from public.device_members m where m.device_id = p_alert.device_id
        and m.user_id = p_alert.requester_user_id and not m.is_authorized))
$$;


ALTER FUNCTION "public"."notification_dispatch_allowed"("p_alert" "public"."push_alerts", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_device_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_alert uuid; v_admin uuid; v_request uuid; v_moved boolean := false;
begin
  if tg_op = 'INSERT' then
    -- Alta pendiente, venga del QR o de cualquier otra vía.
    if not new.is_authorized then
      select m.user_id into v_admin from public.device_members m
        where m.device_id = new.device_id and m.role = 'admin' and m.is_authorized;
      if v_admin is not null then
        v_alert := public.create_device_event('access_request', new.device_id, v_admin, new.user_id);
        insert into public.notification_recipients(alert_id, user_id) values (v_alert, v_admin);
      end if;
    end if;
  elsif tg_op = 'UPDATE' and not old.is_authorized and new.is_authorized then
    -- Aprobación.
    perform public.resolve_access_requests(new.device_id, new.user_id);
    v_alert := public.create_device_event('access_approved', new.device_id, new.user_id);
    insert into public.notification_recipients(alert_id, user_id) values (v_alert, new.user_id);
  elsif tg_op = 'DELETE' and not old.is_authorized then
    -- Rechazo (o solicitud retirada por la propia persona, que no se avisa a sí misma).
    perform public.resolve_access_requests(old.device_id, old.user_id);
    if current_setting('terrasense.factory_reset', true) is distinct from 'on'
       and auth.uid() is not null and auth.uid() <> old.user_id
       and exists (select 1 from public.devices where id = old.device_id) then
      v_alert := public.create_device_event('access_rejected', old.device_id, old.user_id);
      insert into public.notification_recipients(alert_id, user_id) values (v_alert, old.user_id);
    end if;
  elsif tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' then
    perform public.record_admin_transfer(new.device_id, new.user_id);
  elsif tg_op = 'UPDATE' and old.role <> 'admin' and new.role = 'admin' and new.is_authorized then
    perform public.record_admin_transfer(new.device_id, new.user_id);
    -- Las solicitudes aún pendientes pasan al administrador nuevo.
    for v_request in select id from public.push_alerts where device_id = new.device_id
        and event_type = 'access_request' and status = 'active' loop
      update public.notification_recipients set cancelled_at = now()
        where alert_id = v_request and user_id <> new.user_id and cancelled_at is null;
      insert into public.notification_recipients(alert_id, user_id) values (v_request, new.user_id)
        on conflict (alert_id, user_id) do update set cancelled_at = null;
      update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
        where alert_id = v_request and user_id <> new.user_id and state in ('pending', 'leased');
      v_moved := true;
    end loop;
    if v_moved then perform public.invoke_push_dispatch(); end if;
  elsif tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.is_authorized and not new.is_authorized) then
    -- Acceso retirado: se conservan sólo los rechazos, que no dependen de la membresía.
    update public.notification_recipients r set cancelled_at = now()
      from public.push_alerts a
      where a.id = r.alert_id and r.user_id = old.user_id and a.device_id = old.device_id
        and a.event_type <> 'access_rejected' and r.cancelled_at is null;
    update public.push_deliveries d set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      from public.push_alerts a
      where a.id = d.alert_id and d.user_id = old.user_id and a.device_id = old.device_id
        and a.event_type <> 'access_rejected' and d.state in ('pending', 'leased');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;


ALTER FUNCTION "public"."notify_device_membership"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."purge_push_notifications"() RETURNS TABLE("alerts_deleted" bigint, "installations_deleted" bigint, "job_runs_deleted" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_alerts bigint; v_installations bigint; v_runs bigint;
begin
  delete from public.push_alerts where expires_at <= now();
  get diagnostics v_alerts = row_count;
  delete from public.push_installations
    where expo_push_token is null and updated_at < now() - interval '30 days';
  get diagnostics v_installations = row_count;
  delete from cron.job_run_details
    where start_time < now() - interval '7 days'
      and jobid in (select jobid from cron.job where jobname like 'terrasense-push-%');
  get diagnostics v_runs = row_count;
  return query select v_alerts, v_installations, v_runs;
end $$;


ALTER FUNCTION "public"."purge_push_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."push_dispatch_health"() RETURNS TABLE("queue_ready" bigint, "queue_oldest_age" interval, "leased" bigint, "leases_expired" bigint, "retrying" bigint, "failed_24h" bigint, "failures_by_error" "jsonb", "uncertain_24h" bigint, "awaiting_receipt" bigint, "receipts_overdue" bigint, "oldest_ticket_age" interval, "last_ticket_at" timestamp with time zone, "vault_configured" boolean, "dispatch_last_run" timestamp with time zone, "dispatch_last_status" "text", "retention_last_run" timestamp with time zone, "retention_last_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  return query
    select
      count(*) filter (where d.state = 'pending' and d.next_attempt_at <= now()),
      now() - min(d.next_attempt_at) filter (where d.state = 'pending' and d.next_attempt_at <= now()),
      count(*) filter (where d.state = 'leased'),
      count(*) filter (where d.state = 'leased' and d.leased_until < now()),
      count(*) filter (where d.state = 'pending' and d.attempts > 0),
      count(*) filter (where d.state = 'failed' and d.updated_at > now() - interval '24 hours'),
      coalesce((select jsonb_object_agg(f.error, f.n) from (
          select coalesce(x.last_error, 'sin_detalle') as error, count(*) as n
            from public.push_deliveries x
            where x.state = 'failed' and x.updated_at > now() - interval '24 hours'
            group by 1) f), '{}'::jsonb),
      count(*) filter (where d.last_error like 'uncertain:%' and d.updated_at > now() - interval '24 hours'),
      count(*) filter (where d.state in ('ticket_ok', 'receipt_leased')),
      count(*) filter (where d.state in ('ticket_ok', 'receipt_leased') and d.ticket_at < now() - interval '1 hour'),
      now() - min(d.ticket_at) filter (where d.state in ('ticket_ok', 'receipt_leased')),
      max(d.ticket_at),
      (select count(*) = 2 from vault.decrypted_secrets s
        where s.name in ('push_dispatch_url', 'push_dispatch_service_role_key')),
      (select r.start_time from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-dispatch' order by r.start_time desc limit 1),
      (select r.status from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-dispatch' order by r.start_time desc limit 1),
      (select r.start_time from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-retention' order by r.start_time desc limit 1),
      (select r.status from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-retention' order by r.start_time desc limit 1)
    from public.push_deliveries d;
end $$;


ALTER FUNCTION "public"."push_dispatch_health"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."push_error_class"("p_error" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case
    when p_error = 'DeviceNotRegistered' then 'invalid_token'
    when p_error like 'permanent:%' or p_error in ('MessageTooBig', 'InvalidCredentials', 'MismatchSenderId')
      then 'permanent'
    else 'transient'
  end
$$;


ALTER FUNCTION "public"."push_error_class"("p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."push_session_valid"("p_user_id" "uuid", "p_session_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p_user_id is not null and p_session_id is not null and exists (
    select 1 from auth.sessions s
    where s.id = p_session_id and s.user_id = p_user_id and s.created_at is not null
      and (s.not_after is null or s.not_after > clock_timestamp())
      and not exists (
        select 1 from public.push_recovery_cutoffs c
        where c.user_id = p_user_id and s.created_at <= c.blocked_through
      )
  );
$$;


ALTER FUNCTION "public"."push_session_valid"("p_user_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_admin_transfer"("p_device_id" "uuid", "p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_alert uuid;
begin
  select id into v_alert from public.push_alerts where device_id = p_device_id
    and event_type = 'admin_transferred' and source_transaction = txid_current();
  if v_alert is null then
    v_alert := public.create_device_event('admin_transferred', p_device_id, p_user_id, null, txid_current());
  end if;
  insert into public.notification_recipients(alert_id, user_id) values (v_alert, p_user_id)
    on conflict do nothing;
  return v_alert;
end $$;


ALTER FUNCTION "public"."record_admin_transfer"("p_device_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."register_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text", "p_expo_push_token" "text", "p_platform" "text", "p_permission" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
  v_hash text;
  v_old public.push_installations;
  v_fresh integer;
  v_changed boolean;
begin
  if v_uid is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  if coalesce(auth.jwt()->>'session_id', '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'Sesión requerida.' using errcode = '42501';
  end if;
  v_sid := (auth.jwt()->>'session_id')::uuid;
  perform 1 from auth.users where id = v_uid for update;
  if not public.push_session_valid(v_uid, v_sid) then
    raise exception 'Sesión revocada.' using errcode = '42501';
  end if;
  if p_installation_id is null or p_installation_secret is null
     or length(p_installation_secret) < 32 or length(p_installation_secret) > 512 then
    raise exception 'Identidad de instalación inválida.' using errcode = '22023';
  end if;
  if p_platform is null or p_permission is null
     or p_platform not in ('ios', 'android')
     or p_permission not in ('granted', 'provisional', 'denied', 'undetermined') then
    raise exception 'Plataforma o permiso inválido.' using errcode = '22023';
  end if;
  if p_expo_push_token is not null and p_expo_push_token !~ '^((Expo|Exponent)PushToken)\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Token Expo inválido.' using errcode = '22023';
  end if;
  if p_permission not in ('granted', 'provisional') and p_expo_push_token is not null then
    raise exception 'El permiso no autoriza un token.' using errcode = '22023';
  end if;
  v_hash := encode(extensions.digest(p_installation_secret, 'sha256'), 'hex');
  insert into public.push_installations(id, user_id, session_id, secret_hash, platform, permission)
    values (p_installation_id, v_uid, v_sid, v_hash, p_platform, 'undetermined')
    on conflict (id) do nothing;
  get diagnostics v_fresh = row_count;
  select * into v_old from public.push_installations where id = p_installation_id for update;
  if v_old.secret_hash <> v_hash then
    raise exception 'Instalación no autorizada.' using errcode = '42501';
  end if;
  v_changed := v_fresh = 0 and (v_old.user_id is distinct from v_uid
    or v_old.session_id is distinct from v_sid
    or v_old.expo_push_token is distinct from p_expo_push_token
    or v_old.revoked_at is not null);
  -- Un token pertenece a una sola instalación: si otra lo tenía (datos borrados,
  -- reinstalación), pierde el token y sus envíos abiertos.
  if p_expo_push_token is not null then
    update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      where state in ('pending', 'leased') and installation_id in (
        select id from public.push_installations
          where expo_push_token = p_expo_push_token and id <> p_installation_id);
    update public.push_installations set expo_push_token = null,
        token_generation = token_generation + 1, updated_at = now()
      where expo_push_token = p_expo_push_token and id <> p_installation_id;
  end if;
  if v_changed then
    update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      where installation_id = p_installation_id and state in ('pending', 'leased');
  end if;
  update public.push_installations set user_id = v_uid, session_id = v_sid,
      expo_push_token = p_expo_push_token,
      platform = p_platform, permission = p_permission, revoked_at = null, updated_at = now(),
      token_generation = token_generation + case when v_changed then 1 else 0 end
    where id = p_installation_id;
end $_$;


ALTER FUNCTION "public"."register_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text", "p_expo_push_token" "text", "p_platform" "text", "p_permission" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."report_push_receipt"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_status" "text", "p_error" "text" DEFAULT NULL::"text", "p_invalid_token" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_row public.push_deliveries;
  v_class text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('ok', 'error', 'retry') then
    raise exception 'Estado de receipt inválido.' using errcode = '22023';
  end if;
  select * into v_row from public.push_deliveries
    where id = p_delivery_id and lease_id = p_lease_id and state = 'receipt_leased' for update;
  if not found then return; end if;
  if p_status = 'ok' then
    update public.push_deliveries set state = 'delivered', receipt_checked_at = now(),
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
  elsif p_status = 'retry' then
    update public.push_deliveries set state = 'ticket_ok', lease_id = null, leased_until = null,
        next_attempt_at = now() + interval '15 minutes', updated_at = now()
      where id = p_delivery_id;
  else
    v_class := case when p_invalid_token then 'invalid_token' else public.push_error_class(p_error) end;
    if v_class = 'transient' and v_row.attempts < 5 then
      update public.push_deliveries set state = 'pending', ticket_id = null, ticket_at = null,
          receipt_checked_at = now(), last_error = left(coalesce(p_error, 'Error de receipt'), 500),
          lease_id = null, leased_until = null,
          next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, attempts - 1))::double precision),
          updated_at = now()
        where id = p_delivery_id;
    else
      update public.push_deliveries set state = 'failed',
          last_error = left(coalesce(p_error, 'Error de receipt'), 500),
          receipt_checked_at = now(), lease_id = null, leased_until = null, updated_at = now()
        where id = p_delivery_id;
      if v_class = 'invalid_token' then
        update public.push_installations set expo_push_token = null,
            token_generation = token_generation + 1, updated_at = now()
          where id = v_row.installation_id and user_id = v_row.user_id
            and token_generation = v_row.token_generation;
      end if;
    end if;
  end if;
end $$;


ALTER FUNCTION "public"."report_push_receipt"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_status" "text", "p_error" "text", "p_invalid_token" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."report_push_ticket"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_ticket_id" "text" DEFAULT NULL::"text", "p_error" "text" DEFAULT NULL::"text", "p_invalid_token" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_row public.push_deliveries;
  v_class text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  select * into v_row from public.push_deliveries
    where id = p_delivery_id and lease_id = p_lease_id and state = 'leased' for update;
  if not found then return; end if;
  if p_ticket_id is not null then
    update public.push_deliveries set state = 'ticket_ok', ticket_id = p_ticket_id, ticket_at = now(),
        last_error = null, lease_id = null, leased_until = null,
        next_attempt_at = now() + interval '15 minutes', updated_at = now()
      where id = p_delivery_id;
    return;
  end if;
  v_class := case when p_invalid_token then 'invalid_token' else public.push_error_class(p_error) end;
  if p_error = 'permanent:expired' then
    update public.push_deliveries set state = 'expired', last_error = 'permanent:expired',
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
  elsif v_class = 'invalid_token' then
    update public.push_deliveries set state = 'failed',
        last_error = left(coalesce(p_error, 'DeviceNotRegistered'), 500),
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
    update public.push_installations set expo_push_token = null,
        token_generation = token_generation + 1, updated_at = now()
      where id = v_row.installation_id and user_id = v_row.user_id
        and token_generation = v_row.token_generation;
  elsif v_class = 'permanent' then
    update public.push_deliveries set state = 'failed',
        last_error = left(coalesce(p_error, 'Error permanente de Expo'), 500),
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
  else
    update public.push_deliveries set state = case when attempts >= 5 then 'failed' else 'pending' end,
        last_error = left(coalesce(p_error, 'Error de Expo'), 500), lease_id = null, leased_until = null,
        next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, attempts - 1))::double precision),
        updated_at = now()
      where id = p_delivery_id;
  end if;
end $$;


ALTER FUNCTION "public"."report_push_ticket"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_ticket_id" "text", "p_error" "text", "p_invalid_token" boolean) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."reserve_push_deliveries"("p_limit" integer DEFAULT 50) RETURNS TABLE("delivery_id" "uuid", "lease_id" "uuid", "alert_id" "uuid", "event_type" "text", "title" "text", "body" "text", "device_id" "uuid", "expo_push_token" "text", "token_generation" bigint, "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  -- El mantenimiento es idempotente: si otra ejecución ya lo hace, se omite.
  if pg_try_advisory_xact_lock(hashtextextended('terrasense.push_deliveries', 0)) then
    update public.push_alerts set status = 'expired' where status = 'active' and expires_at <= now();
    -- Una push sólo sirve el día del evento; la bandeja conserva el aviso 30 días.
    update public.push_deliveries d set state = 'expired', lease_id = null, leased_until = null,
        last_error = coalesce(d.last_error, 'expired'), updated_at = now()
      from public.push_alerts a
      where a.id = d.alert_id and d.state in ('pending', 'leased')
        and (a.status = 'expired' or a.created_at < now() - interval '24 hours');
    -- Reserva vencida tras agotar los intentos: no se reintenta más.
    update public.push_deliveries set state = 'failed', lease_id = null, leased_until = null,
        last_error = coalesce(last_error, 'lease_expired'), updated_at = now()
      where state = 'leased' and leased_until < now() and attempts >= 5;
    -- Destinatario, instalación o preferencia que ya no corresponden.
    update public.push_deliveries d set state = 'cancelled', lease_id = null, leased_until = null,
        last_error = case when coalesce(p.app_preferences->'notifications'->>'device', 'true') = 'false'
          then 'preference_disabled' else d.last_error end,
        updated_at = now()
      from public.push_installations i, public.notification_recipients r, public.push_alerts a,
        public.profiles p
      where i.id = d.installation_id and r.alert_id = d.alert_id and r.user_id = d.user_id
        and a.id = d.alert_id and p.id = d.user_id
        and d.state in ('pending', 'leased')
        and (i.user_id <> d.user_id or i.token_generation <> d.token_generation
          or i.revoked_at is not null or i.expo_push_token is null
          or not public.push_session_valid(i.user_id, i.session_id)
          or i.permission not in ('granted', 'provisional')
          or r.cancelled_at is not null
          or not public.notification_dispatch_allowed(a, d.user_id)
          or coalesce(p.app_preferences->'notifications'->>'device', 'true') = 'false');
    -- Entregas nuevas: una por instalación de cada destinatario vigente. Las que ya existen no se
    -- tocan (ON CONFLICT DO NOTHING no bloquea filas): sólo se reabren, con su propio UPDATE, las
    -- canceladas o fallidas de una generación anterior del token. Así el mantenimiento no deja
    -- bloqueadas las entregas de otros trabajadores mientras dura su transacción.
    with eligible as (
      select a.id as alert_id, r.user_id, i.id as installation_id, i.token_generation
      from public.push_alerts a
        join public.notification_recipients r on r.alert_id = a.id
        join public.push_installations i on i.user_id = r.user_id
        join public.profiles p on p.id = r.user_id
      where a.status = 'active' and a.expires_at > now() and a.created_at >= now() - interval '24 hours'
        and r.cancelled_at is null
        and i.revoked_at is null and i.expo_push_token is not null
        and public.push_session_valid(i.user_id, i.session_id)
        and i.permission in ('granted', 'provisional')
        and coalesce(p.app_preferences->'notifications'->>'device', 'true') <> 'false'
        and public.notification_dispatch_allowed(a, r.user_id)
    ), created as (
      insert into public.push_deliveries(alert_id, user_id, installation_id, token_generation)
        select e.alert_id, e.user_id, e.installation_id, e.token_generation from eligible e
        on conflict (alert_id, installation_id) do nothing
    )
    update public.push_deliveries d
      set token_generation = e.token_generation, state = 'pending', attempts = 0,
        next_attempt_at = now(), last_error = null, lease_id = null, leased_until = null,
        updated_at = now()
      from eligible e
      where d.alert_id = e.alert_id and d.installation_id = e.installation_id and d.user_id = e.user_id
        and d.token_generation <> e.token_generation
        and d.state in ('cancelled', 'failed')
        and d.last_error is distinct from 'preference_disabled'
        and d.ticket_id is null;
  end if;
  return query
    with candidate as (
      select d.id from public.push_deliveries d
        join public.push_alerts a on a.id = d.alert_id
        join public.notification_recipients r on r.alert_id = d.alert_id and r.user_id = d.user_id
        join public.push_installations i on i.id = d.installation_id
        join public.profiles p on p.id = d.user_id
      where d.state in ('pending', 'leased') and d.next_attempt_at <= now()
        -- Un ticket aceptado nunca se reenvía: sólo un receipt con error explícito lo reabre.
        and d.ticket_id is null
        and (d.state = 'pending' or d.leased_until < now()) and d.attempts < 5
        and a.status = 'active' and a.expires_at > now() and a.created_at >= now() - interval '24 hours'
        and r.cancelled_at is null
        and public.notification_dispatch_allowed(a, d.user_id)
        and i.user_id = d.user_id and i.token_generation = d.token_generation
        and i.revoked_at is null and i.expo_push_token is not null
        and public.push_session_valid(i.user_id, i.session_id)
        and i.permission in ('granted', 'provisional')
        and coalesce(p.app_preferences->'notifications'->>'device', 'true') <> 'false'
      order by d.next_attempt_at, d.created_at
      for update of d skip locked limit v_limit
    ), reserved as (
      update public.push_deliveries d set state = 'leased', lease_id = gen_random_uuid(),
          leased_until = now() + interval '2 minutes', attempts = d.attempts + 1, updated_at = now()
        from candidate c where d.id = c.id
        returning d.*
    )
    select d.id, d.lease_id, a.id, a.event_type, c.title, c.body, a.device_id, i.expo_push_token, i.token_generation,
        least(a.expires_at, a.created_at + interval '24 hours')
      from reserved d
        join public.push_alerts a on a.id = d.alert_id
        join public.push_installations i on i.id = d.installation_id
        join public.profiles p on p.id = d.user_id
        cross join lateral public.notification_copy(a.event_type, p.app_preferences->>'language') c;
end $$;


ALTER FUNCTION "public"."reserve_push_deliveries"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_push_receipts"("p_limit" integer DEFAULT 50) RETURNS TABLE("delivery_id" "uuid", "lease_id" "uuid", "ticket_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  update public.push_deliveries set state = 'failed', last_error = 'receipt_unavailable',
      lease_id = null, leased_until = null, updated_at = now()
    where state in ('ticket_ok', 'receipt_leased') and ticket_at < now() - interval '24 hours';
  return query
    with candidate as (
      select d.id from public.push_deliveries d
      where d.ticket_id is not null and d.next_attempt_at <= now()
        and (d.state = 'ticket_ok' or (d.state = 'receipt_leased' and d.leased_until < now()))
      order by d.next_attempt_at, d.created_at
      for update of d skip locked limit least(greatest(coalesce(p_limit, 50), 1), 100)
    ), reserved as (
      update public.push_deliveries d set state = 'receipt_leased', lease_id = gen_random_uuid(),
          leased_until = now() + interval '2 minutes', updated_at = now()
        from candidate c where d.id = c.id
        returning d.*
    )
    select d.id, d.lease_id, d.ticket_id from reserved d;
end $$;


ALTER FUNCTION "public"."reserve_push_receipts"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_access_requests"("p_device_id" "uuid", "p_requester" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.push_alerts set status = 'cancelled'
    where device_id = p_device_id and requester_user_id = p_requester
      and event_type = 'access_request' and status = 'active';
  update public.push_deliveries d set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
    from public.push_alerts a
    where a.id = d.alert_id and a.device_id = p_device_id and a.requester_user_id = p_requester
      and a.event_type = 'access_request' and d.state in ('pending', 'leased');
end $$;


ALTER FUNCTION "public"."resolve_access_requests"("p_device_id" "uuid", "p_requester" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_push_for_password_recovery"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
begin
  if v_uid is null or coalesce(auth.jwt()->>'session_id', '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'Sesión requerida.' using errcode = '42501';
  end if;
  v_sid := (auth.jwt()->>'session_id')::uuid;
  -- El registro toma el mismo bloqueo antes de validar su sesión. Si llegó antes,
  -- esta transacción revoca su token; si llegó después, verá la barrera.
  perform 1 from auth.users where id = v_uid for update;
  if not exists (select 1 from auth.sessions where id = v_sid and user_id = v_uid) then
    raise exception 'Sesión revocada.' using errcode = '42501';
  end if;
  insert into public.push_recovery_cutoffs(user_id, blocked_through)
    values (v_uid, clock_timestamp())
    on conflict (user_id) do update
      set blocked_through = greatest(public.push_recovery_cutoffs.blocked_through, excluded.blocked_through);
  update public.push_installations set expo_push_token = null, permission = 'denied',
      revoked_at = now(), token_generation = token_generation + 1, updated_at = now()
    where user_id = v_uid;
  update public.push_deliveries set state = 'cancelled', lease_id = null,
      leased_until = null, updated_at = now()
    where user_id = v_uid and state in ('pending', 'leased');
end $_$;


ALTER FUNCTION "public"."revoke_push_for_password_recovery"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_row public.push_installations;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  if p_installation_id is null or p_installation_secret is null or length(p_installation_secret) < 32
    or length(p_installation_secret) > 512 then
    raise exception 'Identidad de instalación inválida.' using errcode = '22023';
  end if;
  select * into v_row from public.push_installations where id = p_installation_id for update;
  if not found then return; end if;
  if v_row.user_id <> auth.uid()
     or v_row.secret_hash <> encode(extensions.digest(p_installation_secret, 'sha256'), 'hex') then
    raise exception 'Instalación no autorizada.' using errcode = '42501';
  end if;
  update public.push_installations set expo_push_token = null, permission = 'denied', revoked_at = now(),
      updated_at = now(), token_generation = token_generation + 1
    where id = p_installation_id;
  update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
    where installation_id = p_installation_id and state in ('pending', 'leased');
end $$;


ALTER FUNCTION "public"."revoke_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_push_installation_by_secret"("p_installation_id" "uuid", "p_installation_secret" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_updated integer;
begin
  if p_installation_id is null or p_installation_secret is null or length(p_installation_secret) < 32
    or length(p_installation_secret) > 512 then
    raise exception 'Identidad de instalación inválida.' using errcode = '22023';
  end if;
  update public.push_installations set expo_push_token = null, permission = 'denied', revoked_at = now(),
      updated_at = now(), token_generation = token_generation + 1
    where id = p_installation_id
      and secret_hash = encode(extensions.digest(p_installation_secret, 'sha256'), 'hex');
  get diagnostics v_updated = row_count;
  if v_updated > 0 then
    update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      where installation_id = p_installation_id and state in ('pending', 'leased');
  end if;
end $$;


ALTER FUNCTION "public"."revoke_push_installation_by_secret"("p_installation_id" "uuid", "p_installation_secret" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."validate_push_lease"("p_delivery_id" "uuid", "p_lease_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_ok boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  select public.push_session_valid(i.user_id, i.session_id)
      and i.revoked_at is null and i.expo_push_token is not null
      and i.token_generation = d.token_generation and i.user_id = d.user_id
    into v_ok
    from public.push_deliveries d
    join public.push_installations i on i.id = d.installation_id
    where d.id = p_delivery_id and d.lease_id = p_lease_id and d.state = 'leased'
    for update of d;
  if not coalesce(v_ok, false) then
    update public.push_deliveries set state = 'cancelled', lease_id = null,
      leased_until = null, updated_at = now()
      where id = p_delivery_id and lease_id = p_lease_id and state = 'leased';
    return false;
  end if;
  return true;
end $$;


ALTER FUNCTION "public"."validate_push_lease"("p_delivery_id" "uuid", "p_lease_id" "uuid") OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."notification_recipients" (
    "alert_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."notification_recipients" OWNER TO "postgres";


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



COMMENT ON COLUMN "public"."profiles"."push_token" IS 'Obsoleto. Los tokens Expo se guardan por instalación en push_installations.';



CREATE TABLE IF NOT EXISTS "public"."push_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "installation_id" "uuid" NOT NULL,
    "token_generation" bigint NOT NULL,
    "state" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lease_id" "uuid",
    "leased_until" timestamp with time zone,
    "ticket_id" "text",
    "ticket_at" timestamp with time zone,
    "receipt_checked_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_deliveries_state_check" CHECK (("state" = ANY (ARRAY['pending'::"text", 'leased'::"text", 'ticket_ok'::"text", 'receipt_leased'::"text", 'delivered'::"text", 'failed'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."push_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_installations" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "secret_hash" "text" NOT NULL,
    "expo_push_token" "text",
    "platform" "text" NOT NULL,
    "permission" "text" NOT NULL,
    "token_generation" bigint DEFAULT 1 NOT NULL,
    "revoked_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid",
    CONSTRAINT "push_installations_permission_check" CHECK (("permission" = ANY (ARRAY['granted'::"text", 'provisional'::"text", 'denied'::"text", 'undetermined'::"text"]))),
    CONSTRAINT "push_installations_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"]))),
    CONSTRAINT "push_installations_token_check" CHECK ((("expo_push_token" IS NULL) OR ("expo_push_token" ~ '^((Expo|Exponent)PushToken)\[[A-Za-z0-9_-]+\]$'::"text")))
);


ALTER TABLE "public"."push_installations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_recovery_cutoffs" (
    "user_id" "uuid" NOT NULL,
    "blocked_through" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."push_recovery_cutoffs" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."notification_recipients"
    ADD CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("alert_id", "user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_deliveries"
    ADD CONSTRAINT "push_deliveries_alert_id_installation_id_key" UNIQUE ("alert_id", "installation_id");



ALTER TABLE ONLY "public"."push_deliveries"
    ADD CONSTRAINT "push_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_installations"
    ADD CONSTRAINT "push_installations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_recovery_cutoffs"
    ADD CONSTRAINT "push_recovery_cutoffs_pkey" PRIMARY KEY ("user_id");



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



CREATE INDEX "notification_recipients_user_idx" ON "public"."notification_recipients" USING "btree" ("user_id", "alert_id");



CREATE INDEX "push_alerts_active_idx" ON "public"."push_alerts" USING "btree" ("expires_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "push_alerts_request_idx" ON "public"."push_alerts" USING "btree" ("device_id", "requester_user_id") WHERE ("event_type" = 'access_request'::"text");



CREATE UNIQUE INDEX "push_alerts_transfer_transaction_idx" ON "public"."push_alerts" USING "btree" ("device_id", "source_transaction") WHERE (("event_type" = 'admin_transferred'::"text") AND ("source_transaction" IS NOT NULL));



CREATE INDEX "push_deliveries_installation_idx" ON "public"."push_deliveries" USING "btree" ("installation_id");



CREATE INDEX "push_deliveries_queue_idx" ON "public"."push_deliveries" USING "btree" ("state", "next_attempt_at");



CREATE INDEX "push_deliveries_user_idx" ON "public"."push_deliveries" USING "btree" ("user_id");



CREATE INDEX "push_installations_session_idx" ON "public"."push_installations" USING "btree" ("session_id");



CREATE UNIQUE INDEX "push_installations_token_idx" ON "public"."push_installations" USING "btree" ("expo_push_token") WHERE ("expo_push_token" IS NOT NULL);



CREATE INDEX "push_installations_user_idx" ON "public"."push_installations" USING "btree" ("user_id");



CREATE UNIQUE INDEX "soil_measurements_client_uuid_upsert" ON "public"."soil_measurements" USING "btree" ("client_uuid");



CREATE OR REPLACE TRIGGER "guard_push_alert_event" BEFORE INSERT ON "public"."push_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_push_alert_event"();



CREATE OR REPLACE TRIGGER "notify_device_membership" AFTER INSERT OR DELETE OR UPDATE ON "public"."device_members" FOR EACH ROW EXECUTE FUNCTION "public"."notify_device_membership"();



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



ALTER TABLE ONLY "public"."notification_recipients"
    ADD CONSTRAINT "notification_recipients_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."push_alerts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_recipients"
    ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_alerts"
    ADD CONSTRAINT "push_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_deliveries"
    ADD CONSTRAINT "push_deliveries_alert_id_user_id_fkey" FOREIGN KEY ("alert_id", "user_id") REFERENCES "public"."notification_recipients"("alert_id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_deliveries"
    ADD CONSTRAINT "push_deliveries_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "public"."push_installations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_installations"
    ADD CONSTRAINT "push_installations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_recovery_cutoffs"
    ADD CONSTRAINT "push_recovery_cutoffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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


ALTER TABLE "public"."notification_recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_device_resets" ON "public"."device_data_resets" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_installations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_recovery_cutoffs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."soil_measurements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_select_staff" ON "public"."admin_support_users" FOR SELECT TO "authenticated" USING (("public"."is_support_staff"() OR ("user_id" = "auth"."uid"())));



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



REVOKE ALL ON FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer, "p_offset" integer, "p_stage" "text", "p_species_id" "text", "p_without_species" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer, "p_offset" integer, "p_stage" "text", "p_species_id" "text", "p_without_species" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_device_measurements"("p_device_id" "uuid", "p_limit" integer, "p_offset" integer, "p_stage" "text", "p_species_id" "text", "p_without_species" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_device_members"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_device_members"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_device_members"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_device_species"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_device_species"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_device_species"("p_device_id" "uuid") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."create_device_event"("p_event" "text", "p_device_id" "uuid", "p_user_id" "uuid", "p_requester" "uuid", "p_source_transaction" bigint) FROM PUBLIC;



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



REVOKE ALL ON FUNCTION "public"."get_my_notification"("p_alert_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_notification"("p_alert_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."guard_push_alert_event"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."has_device_access"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_device_access"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_device_access"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_device_admin_access"("p_device_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."invalidate_empty_device_invite"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."invoke_push_dispatch"() FROM PUBLIC;



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



REVOKE ALL ON FUNCTION "public"."list_my_notifications"("p_limit" integer, "p_before" timestamp with time zone, "p_before_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_my_notifications"("p_limit" integer, "p_before" timestamp with time zone, "p_before_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_my_pending_device_requests"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_my_pending_device_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_my_pending_device_requests"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_device_status_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_device_member"("p_device_id" "uuid", "p_target_user_id" "uuid", "p_action" "text", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_notification_read"("p_alert_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_alert_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mark_onboarding_from_membership"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."measurement_species"("p_diagnosis" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."measurement_species"("p_diagnosis" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."measurement_species"("p_diagnosis" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_firmware_updates"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_firmware_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_firmware_updates"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."normalize_device_versions"() FROM PUBLIC;



GRANT ALL ON TABLE "public"."push_alerts" TO "service_role";



REVOKE ALL ON FUNCTION "public"."notification_access_allowed"("p_alert" "public"."push_alerts", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."notification_copy"("p_event" "text", "p_language" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."notification_dispatch_allowed"("p_alert" "public"."push_alerts", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."notify_device_membership"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."protect_device_generation"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_device_generation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_device_generation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_onboarding_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_onboarding_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_onboarding_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_expired_operational_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_expired_operational_data"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_push_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_push_notifications"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."push_dispatch_health"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."push_dispatch_health"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."push_error_class"("p_error" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."push_session_valid"("p_user_id" "uuid", "p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."push_session_valid"("p_user_id" "uuid", "p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_admin_transfer"("p_device_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."register_and_pair_device"("p_device_code" "text", "p_user_id" "uuid", "p_device_name" "text", "p_alias" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_and_pair_device"("p_device_code" "text", "p_user_id" "uuid", "p_device_name" "text", "p_alias" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_paired_device"("p_code" "text", "p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text", "p_expo_push_token" "text", "p_platform" "text", "p_permission" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text", "p_expo_push_token" "text", "p_platform" "text", "p_permission" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer, "p_firmware_version" "text", "p_contacted_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer, "p_firmware_version" "text", "p_contacted_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."report_device_contact"("p_device_code" "text", "p_battery" integer, "p_firmware_version" "text", "p_contacted_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."report_push_receipt"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_status" "text", "p_error" "text", "p_invalid_token" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."report_push_receipt"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_status" "text", "p_error" "text", "p_invalid_token" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."report_push_ticket"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_ticket_id" "text", "p_error" "text", "p_invalid_token" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."report_push_ticket"("p_delivery_id" "uuid", "p_lease_id" "uuid", "p_ticket_id" "text", "p_error" "text", "p_invalid_token" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_device_access_qr"("p_device_code" "text", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_push_deliveries"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_push_deliveries"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_push_receipts"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_push_receipts"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_access_requests"("p_device_id" "uuid", "p_requester" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."revoke_push_for_password_recovery"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_push_for_password_recovery"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_push_for_password_recovery"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_push_installation"("p_installation_id" "uuid", "p_installation_secret" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."revoke_push_installation_by_secret"("p_installation_id" "uuid", "p_installation_secret" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_push_installation_by_secret"("p_installation_id" "uuid", "p_installation_secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_push_installation_by_secret"("p_installation_id" "uuid", "p_installation_secret" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."semver_parts"("p_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."semver_parts"("p_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."semver_parts"("p_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_device_member_authorization_default"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."validate_push_lease"("p_delivery_id" "uuid", "p_lease_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_push_lease"("p_delivery_id" "uuid", "p_lease_id" "uuid") TO "service_role";



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



GRANT ALL ON TABLE "public"."notification_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."push_installations" TO "service_role";



GRANT ALL ON TABLE "public"."push_recovery_cutoffs" TO "service_role";



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







