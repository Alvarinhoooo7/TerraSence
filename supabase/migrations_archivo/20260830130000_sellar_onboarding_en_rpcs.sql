-- =============================================================================
-- TERRASENSE — SELLO EXPLÍCITO DENTRO DE CADA RPC DE ALTA
-- =============================================================================
-- Mantiene el trigger defensivo de la migración anterior y, además, deja el
-- UPDATE visible en las dos funciones críticas. Así la confirmación no depende
-- del orden de triggers de un esquema heredado de Akura.

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
            UPDATE public.profiles
               SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
                   onboarding_method = COALESCE(onboarding_method, 'pairing')
             WHERE id = v_uid;
            device_id := v_device_id;
            RETURN NEXT;
            RETURN;
        END IF;
        RAISE EXCEPTION 'Esta sonda ya está registrada. Solicita el QR al administrador.'
            USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.devices (
        device_code, name, hardware_version, microclimate_sensor_type
    ) VALUES (
        v_code,
        COALESCE(NULLIF(BTRIM(p_name), ''), 'Sonda TerraSense'),
        'ESP32-WROOM-32',
        'BME280'
    ) RETURNING id INTO v_device_id;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (v_device_id, v_uid, 'owner', TRUE)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
       SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
           onboarding_method = COALESCE(onboarding_method, 'pairing')
     WHERE id = v_uid;

    device_id := v_device_id;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_device_by_code(p_code TEXT)
RETURNS TABLE (device_id UUID, device_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_clean TEXT;
    v_device RECORD;
    v_failures INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Sesión no válida.' USING ERRCODE = '28000';
    END IF;

    v_clean := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');
    IF v_clean !~ '^[1-9][0-9]{14}$' THEN
        RAISE EXCEPTION 'El código debe tener 15 dígitos y no empezar por cero.'
            USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.device_join_attempts
     WHERE user_id = v_uid
       AND attempted_at < NOW() - INTERVAL '24 hours';

    SELECT COUNT(*) INTO v_failures
      FROM public.device_join_attempts
     WHERE user_id = v_uid
       AND NOT succeeded
       AND attempted_at > NOW() - INTERVAL '1 hour';

    IF v_failures >= 10 THEN
        RAISE EXCEPTION 'Demasiados intentos fallidos. Vuelve a intentarlo en una hora.'
            USING ERRCODE = '54000';
    END IF;

    SELECT d.id, d.name INTO v_device
      FROM public.devices d
     WHERE d.device_code = v_clean
     LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO public.device_join_attempts (user_id, succeeded)
        VALUES (v_uid, FALSE);
        RETURN;
    END IF;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (v_device.id, v_uid, 'operator', TRUE)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
       SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
           onboarding_method = COALESCE(onboarding_method, 'qr')
     WHERE id = v_uid;

    INSERT INTO public.device_join_attempts (user_id, succeeded)
    VALUES (v_uid, TRUE);

    device_id := v_device.id;
    device_name := v_device.name;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.register_paired_device(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_paired_device(TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.join_device_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_device_by_code(TEXT) TO authenticated;
