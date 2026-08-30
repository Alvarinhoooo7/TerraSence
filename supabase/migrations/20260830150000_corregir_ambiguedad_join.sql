-- Corrige la colisión entre la columna device_members.device_id y el parámetro
-- de salida homónimo de la función RETURNS TABLE.

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

    UPDATE public.device_members AS dm
       SET role = 'operator',
           is_authorized = TRUE
     WHERE dm.device_id = v_device.id
       AND dm.user_id = v_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se pudo crear la membresía del equipo.' USING ERRCODE = 'P0001';
    END IF;

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

REVOKE ALL ON FUNCTION public.join_device_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_device_by_code(TEXT) TO authenticated;
