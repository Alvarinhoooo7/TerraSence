-- Borrado por el administrador del equipo, separado del panel de soporte.
BEGIN;
ALTER TABLE public.devices ADD COLUMN data_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.soil_measurements ADD COLUMN data_generation INTEGER NOT NULL DEFAULT 0;

-- No almacenar mediciones antiguas después de un restablecimiento, aunque el
-- mismo usuario vuelva a vincularse. El bloqueo serializa envíos y borrado.
CREATE FUNCTION public.check_measurement_generation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_generation INTEGER;
BEGIN
  SELECT data_generation INTO v_generation FROM public.devices WHERE id = NEW.device_id FOR SHARE;
  IF NEW.data_generation IS DISTINCT FROM v_generation THEN
    RAISE EXCEPTION 'La medición pertenece a una configuración anterior del equipo.' USING ERRCODE = 'TS001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_measurement_generation BEFORE INSERT OR UPDATE ON public.soil_measurements
  FOR EACH ROW EXECUTE FUNCTION public.check_measurement_generation();

-- Las escrituras directas de clientes no pueden cambiar la generación.
CREATE FUNCTION public.protect_device_generation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NEW.data_generation IS DISTINCT FROM OLD.data_generation THEN
    RAISE EXCEPTION 'Operación no permitida.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_device_generation BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.protect_device_generation();

-- Aviso mínimo de invalidación para limpiar otros teléfonos al reconectar.
CREATE TABLE public.device_data_resets (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL,
  PRIMARY KEY (user_id, device_id)
);
ALTER TABLE public.device_data_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.device_data_resets FROM anon, authenticated;
GRANT SELECT ON public.device_data_resets TO authenticated;
CREATE POLICY own_device_resets ON public.device_data_resets FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.prepare_device_for_owner(p_device_id UUID, p_confirm_device_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  DELETE FROM public.predial_quadrants WHERE device_id = p_device_id;
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
REVOKE ALL ON FUNCTION public.prepare_device_for_owner(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_device_for_owner(UUID, TEXT) TO authenticated;
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

    RETURN jsonb_build_object(
        'success', true,
        'message', 'La versión publicada está disponible en Ajustes > Actualizaciones. No se envió un aviso push.',
        'firmware_version', v_fw.version
    );
END;
$$;


-- Evita despachar avisos heredados que aún estuvieran en cola.
UPDATE public.push_alerts SET is_read = TRUE WHERE title = 'Actualización de firmware disponible';
-- Sin atestación física del firmware, no aceptar un ID conocido como prueba de posesión.
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
    IF EXISTS (SELECT 1 FROM public.devices WHERE id = v_id AND data_generation > 0) THEN
      RAISE EXCEPTION 'Equipo preparado para otro propietario. Contacta a soporte para verificar la entrega y activar el nuevo acceso.' USING ERRCODE = '42501';
    END IF;
    UPDATE public.devices SET name = COALESCE(NULLIF(trim(p_name), ''), name) WHERE id = v_id;
    INSERT INTO public.device_members(device_id, user_id, role, is_authorized) VALUES(v_id, v_uid, 'admin', TRUE);
  ELSIF NOT public.has_device_access(v_id) THEN
    RAISE EXCEPTION 'El equipo ya tiene usuarios. Solicita acceso mediante su QR.' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY SELECT v_id;
END $$;


-- El reseteo de soporte debe invalidar también colas y reclamación por ID.
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

    INSERT INTO public.device_data_resets(user_id, device_id, generation)
      SELECT user_id, device_id, v_device.data_generation + 1 FROM public.device_members WHERE device_id = p_device_id
      ON CONFLICT (user_id, device_id) DO UPDATE SET generation = EXCLUDED.generation;
    DELETE FROM public.device_members WHERE device_id = p_device_id;
    DELETE FROM public.soil_measurements WHERE device_id = p_device_id;
    DELETE FROM public.predial_quadrants WHERE device_id = p_device_id;
    DELETE FROM public.push_alerts WHERE device_id = p_device_id;


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
        'quadrants_deleted', v_quad_count,
        'alerts_deleted', v_alert_count
    );
END;
$$;


COMMIT;
