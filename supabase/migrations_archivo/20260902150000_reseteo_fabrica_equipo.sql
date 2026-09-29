-- =============================================================================
-- RESETEO DE FÁBRICA — dejar un equipo listo para vincularse con otra persona
-- =============================================================================
-- Caso de uso: el cliente vende o regala su sonda. Hay que desvincular a
-- todos sus miembros y borrar los datos privados que arrastra (mediciones,
-- cuadrantes, alertas pendientes) SIN tocar `device_code` (es lo que ya está
-- grabado en la NVS del ESP32 físico — cambiarlo lo desincroniza del
-- hardware) ni `firmware_version`/`hardware_version` (lo que de verdad tiene
-- instalado el equipo; resetearlos sería mentir sobre su estado real).
--
-- Se conservan a propósito, por ser historial del ACTIVO físico y no del
-- dueño anterior: `device_status_log` (batería/conexión) y
-- `device_member_audit` (a la que además se añade el propio reseteo).
--
-- Requiere reescribir el código del equipo como confirmación explícita — un
-- simple booleano es demasiado fácil de enviar por accidente para una
-- operación que borra historial de mediciones sin posibilidad de deshacer.
-- =============================================================================

DO $$ BEGIN
    ALTER TABLE public.device_member_audit DROP CONSTRAINT device_member_audit_action_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.device_member_audit
    ADD CONSTRAINT device_member_audit_action_check
    CHECK (action IN ('authorize', 'revoke', 'set_role', 'transfer_owner', 'remove', 'factory_reset'));

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

    SELECT * INTO v_device FROM public.devices WHERE id = p_device_id;
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

    -- Configuración de fábrica. NO toca device_code, firmware_version,
    -- hardware_version, battery_level, is_active ni las marcas de tiempo:
    -- eso describe el hardware real, no a quién pertenecía.
    UPDATE public.devices
       SET name = DEFAULT,
           alias = DEFAULT,
           pairing_mode_active = DEFAULT,
           transmission_interval_seconds = DEFAULT,
           microclimate_sensor_type = DEFAULT
     WHERE id = p_device_id;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, action)
    VALUES (p_device_id, v_actor, 'factory_reset');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Equipo restablecido a configuración de fábrica.',
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

-- -----------------------------------------------------------------------------
-- Cierra el otro extremo: hoy register_paired_device() rechaza CUALQUIER
-- equipo cuyo device_code ya exista si quien llama no es ya owner/admin —
-- así que un equipo reseteado (0 miembros) quedaba igual de atascado que uno
-- con dueño. Ya hay 2 equipos así en el remoto, de antes de este cambio.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_paired_device(
    p_code TEXT,
    p_name TEXT DEFAULT NULL
)
RETURNS TABLE (device_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_code TEXT;
    v_device_id UUID;
    v_existing_role TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Autenticación requerida.' USING ERRCODE = '42501';
    END IF;

    v_code := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');
    IF v_code !~ '^[1-9][0-9]{14}$' THEN
        RAISE EXCEPTION 'El código de la sonda debe tener 15 dígitos y no empezar por cero.'
            USING ERRCODE = '22023';
    END IF;

    SELECT d.id, dm.role
      INTO v_device_id, v_existing_role
      FROM public.devices d
      LEFT JOIN public.device_members dm
        ON dm.device_id = d.id
       AND dm.user_id = v_uid
       AND COALESCE(dm.is_authorized, TRUE)
     WHERE d.device_code = v_code
     LIMIT 1;

    IF v_device_id IS NOT NULL THEN
        IF v_existing_role IN ('owner', 'admin') THEN
            device_id := v_device_id;
            RETURN NEXT;
            RETURN;
        END IF;

        -- Equipo sin ningún miembro: recién reseteado de fábrica (o huérfano
        -- de antes de que existiera el reseteo). Queda libre para que quien
        -- lo empareja ahora se vuelva su nuevo propietario.
        IF NOT EXISTS (SELECT 1 FROM public.device_members WHERE device_id = v_device_id) THEN
            UPDATE public.devices
               SET name = COALESCE(NULLIF(BTRIM(p_name), ''), name)
             WHERE id = v_device_id;

            INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
            VALUES (v_device_id, v_uid, 'owner', TRUE);

            device_id := v_device_id;
            RETURN NEXT;
            RETURN;
        END IF;

        RAISE EXCEPTION 'Esta sonda ya está registrada. Solicita el QR al administrador.'
            USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.devices (
        device_code,
        name,
        hardware_version,
        microclimate_sensor_type
    ) VALUES (
        v_code,
        COALESCE(NULLIF(BTRIM(p_name), ''), 'Sonda TerraSense'),
        'ESP32-WROOM-32',
        'BME280'
    )
    RETURNING id INTO v_device_id;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (v_device_id, v_uid, 'owner', TRUE)
    ON CONFLICT DO NOTHING;

    device_id := v_device_id;
    RETURN NEXT;
END;
$$;
