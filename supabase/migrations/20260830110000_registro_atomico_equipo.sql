-- =============================================================================
-- TERRASENSE — REGISTRO ATÓMICO DE SONDA EMPAREJADA
-- =============================================================================
-- El INSERT directo dependía de que un trigger AFTER INSERT crease la membresía
-- antes de evaluar la visibilidad RLS del `INSERT ... RETURNING`. La RPC hace
-- explícitas y atómicas ambas operaciones y cierra el alta directa desde API.

DROP POLICY IF EXISTS "ts_devices_insert_auth" ON public.devices;

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

REVOKE ALL ON FUNCTION public.register_paired_device(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_paired_device(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.register_paired_device(TEXT, TEXT) IS
    'Registra de forma atómica una sonda físicamente provisionada y crea la '
    'membresía owner. El INSERT directo de devices permanece cerrado por RLS.';
