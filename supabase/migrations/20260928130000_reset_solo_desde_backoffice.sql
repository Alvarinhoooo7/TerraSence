-- =============================================================================
-- EL ÚNICO RESET ES EL DEL BACKOFFICE, Y DEJA LA SONDA LIBRE
-- =============================================================================
-- Tras un reset, `register_paired_device` rechazaba cualquier equipo sin
-- miembros con `data_generation > 0` («Equipo preparado para otro propietario.
-- Contacta a soporte…»). Esa regla nació cuando bastaba conocer el ID para
-- reclamar una sonda, pero soporte nunca tuvo cómo habilitar al nuevo dueño:
-- una sonda reseteada no se podía volver a vincular.
--
-- Ahora vincular exige la ventana PAIR abierta (pulsador de 3 s), que la app
-- comprueba antes de registrar. Con eso, después del reset del backoffice
-- (`admin_reset_device`) la sonda la vincula quien la tenga en la mano y queda
-- como administrador. Sigue abierto el límite A4 de Firmware/TASK.md, aceptado:
-- la base no ve la ventana PAIR, así que una llamada directa a la API con el
-- ID de una sonda sin dueño puede registrarla.
--
-- `data_generation` y `device_data_resets` se conservan: los teléfonos de los
-- dueños anteriores siguen descartando sus colas y cachés de antes del reset.
--
-- Además se retira `prepare_device_for_owner`: el administrador ya no puede
-- resetear el equipo desde la app. El reset es solo del backoffice.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.register_paired_device(p_code text, p_name text DEFAULT NULL::text)
 RETURNS TABLE(device_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;

COMMENT ON FUNCTION public.register_paired_device(text, text) IS
  'Registra de forma atómica la sonda vinculada por BLE con la ventana PAIR abierta. Si el equipo no tiene miembros (nuevo o reseteado por el backoffice), quien lo registra queda como administrador. El INSERT directo de devices permanece cerrado por RLS.';

DROP FUNCTION IF EXISTS public.prepare_device_for_owner(uuid, text);

DO $$
BEGIN
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.register_paired_device(text,text)'::regprocedure)
     LIKE '%data_generation%' THEN
    RAISE EXCEPTION 'register_paired_device sigue bloqueando los equipos reseteados.';
  END IF;
  IF to_regprocedure('public.prepare_device_for_owner(uuid,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'prepare_device_for_owner sigue existiendo.';
  END IF;
  IF has_function_privilege('anon', 'public.register_paired_device(text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.register_paired_device(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Permisos de register_paired_device alterados.';
  END IF;
END $$;
