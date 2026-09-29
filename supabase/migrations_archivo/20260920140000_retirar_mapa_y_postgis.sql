-- TERRASENSE — RETIRADA DEL MAPA
--
-- La aplicación móvil y la consola web dejan de tener mapa. La medición sigue
-- georreferenciándose: `latitude`, `longitude` y `gps_accuracy_m` se conservan
-- y se muestran como texto en el detalle de cada lectura. Lo que desaparece es
-- todo lo que existía únicamente para dibujar:
--
--   - `soil_measurements.radius_m`  -> radio del círculo de 20 m del mapa
--   - `soil_measurements.geom`      -> punto PostGIS y su índice GiST
--   - `public.predial_quadrants`    -> cuadrantes prediales
--   - `public.field_perimeters`     -> polígonos del campo y su superficie
--   - la extensión `postgis`        -> sin usuarios tras lo anterior
--
-- Las dos tablas nunca tuvieron lector ni escritor en la app ni en la consola:
-- se comprobó contra `App/src` y `Web/src` antes de escribir esta migración.
-- Las únicas referencias vivas eran los borrados en cascada de las dos RPC de
-- restablecimiento, que se rehacen aquí sin ellas.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 0. Aviso de contenido: estas tablas deberían estar vacías
-- ─────────────────────────────────────────────────────────────────────
-- No se aborta la migración. La retirada del mapa es una decisión tomada y
-- estos datos no son recuperables por ninguna pantalla vigente; el recuento
-- queda en el registro para que el borrado sea visible si alguna vez hubo
-- filas cargadas a mano.
DO $$
DECLARE
    v_quads      BIGINT := 0;
    v_perimeters BIGINT := 0;
BEGIN
    IF to_regclass('public.predial_quadrants') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.predial_quadrants' INTO v_quads;
    END IF;
    IF to_regclass('public.field_perimeters') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.field_perimeters' INTO v_perimeters;
    END IF;

    IF v_quads > 0 OR v_perimeters > 0 THEN
        RAISE WARNING 'Retirada del mapa: se eliminan % cuadrante(s) y % perímetro(s).',
            v_quads, v_perimeters;
    ELSE
        RAISE NOTICE 'Retirada del mapa: cuadrantes y perímetros estaban vacíos.';
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Rehacer las RPC que borraban cuadrantes
-- ─────────────────────────────────────────────────────────────────────
-- Idénticas a las de `20260920120000_preparar_equipo_propietario.sql` salvo
-- por la desaparición de `predial_quadrants`. `admin_factory_reset_device`
-- deja además de devolver `quadrants_deleted`.

CREATE OR REPLACE FUNCTION public.prepare_device_for_owner(p_device_id UUID, p_confirm_device_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
END $fn$;
REVOKE ALL ON FUNCTION public.prepare_device_for_owner(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_device_for_owner(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_factory_reset_device(
    p_device_id UUID,
    p_confirm_device_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
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
$fn$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Tablas y columnas que sólo existían para dibujar
-- ─────────────────────────────────────────────────────────────────────
-- DROP TABLE se lleva consigo políticas RLS, índices, triggers y comentarios.
DROP TABLE IF EXISTS public.predial_quadrants;
DROP TABLE IF EXISTS public.field_perimeters;

DROP INDEX IF EXISTS public.idx_soil_measurements_geom_gist;
ALTER TABLE public.soil_measurements DROP COLUMN IF EXISTS geom;
ALTER TABLE public.soil_measurements DROP COLUMN IF EXISTS radius_m;

-- ─────────────────────────────────────────────────────────────────────
-- 3. PostGIS queda sin usuarios
-- ─────────────────────────────────────────────────────────────────────
-- Sin CASCADE a propósito: si algo dependiera todavía de la extensión, la
-- migración debe fallar en voz alta en lugar de arrastrar objetos ajenos.
DROP EXTENSION IF EXISTS postgis;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Verificación
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_pendiente TEXT;
BEGIN
    IF to_regclass('public.predial_quadrants') IS NOT NULL
       OR to_regclass('public.field_perimeters') IS NOT NULL THEN
        RAISE EXCEPTION 'Quedaron tablas del mapa sin eliminar.';
    END IF;

    SELECT string_agg(column_name, ', ') INTO v_pendiente
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'soil_measurements'
       AND column_name IN ('geom', 'radius_m');
    IF v_pendiente IS NOT NULL THEN
        RAISE EXCEPTION 'soil_measurements conserva columnas del mapa: %', v_pendiente;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        RAISE EXCEPTION 'La extensión postgis sigue instalada.';
    END IF;

    RAISE NOTICE 'Mapa retirado: tablas, columnas geométricas y PostGIS eliminados.';
END $$;

COMMIT;
