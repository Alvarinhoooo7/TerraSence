-- =============================================================================
-- TERRASENSE — VINCULACIÓN AUDITABLE Y ROLES NO AUTOELEVABLES
-- =============================================================================
-- 1. Un RAISE dentro de join_device_by_code revertía también el INSERT del
--    intento fallido. Se devuelve cero filas en el fallo para que el intento
--    quede confirmado y el cliente produzca el mensaje genérico.
-- 2. Un operador podía modificar su propia fila de device_members y cambiar
--    `role` a owner. Las altas pasan exclusivamente por trigger/RPC.
-- 3. Sólo owner/admin puede modificar los metadatos globales del equipo.
-- 4. Las columnas de onboarding sólo se modifican mediante la RPC validada.

CREATE OR REPLACE FUNCTION public.has_device_admin_access(p_device_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.device_members dm
         WHERE dm.device_id = p_device_id
           AND dm.user_id = auth.uid()
           AND COALESCE(dm.is_authorized, TRUE)
           AND dm.role IN ('owner', 'admin')
    );
$$;

REVOKE ALL ON FUNCTION public.has_device_admin_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_device_admin_access(UUID) TO authenticated;

DROP POLICY IF EXISTS "ts_device_members_insert_own" ON public.device_members;
DROP POLICY IF EXISTS "ts_device_members_update_own" ON public.device_members;

DROP POLICY IF EXISTS "ts_devices_update_member" ON public.devices;
CREATE POLICY "ts_devices_update_admin" ON public.devices
    FOR UPDATE TO authenticated
    USING (public.has_device_admin_access(id))
    WITH CHECK (public.has_device_admin_access(id));

CREATE OR REPLACE FUNCTION public.protect_onboarding_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_protect_onboarding_fields ON public.profiles;
CREATE TRIGGER trg_protect_onboarding_fields
    BEFORE UPDATE OF onboarding_completed_at, onboarding_method ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_onboarding_fields();

CREATE OR REPLACE FUNCTION public.join_device_by_code(p_code TEXT)
RETURNS TABLE (device_id UUID, device_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid      UUID := auth.uid();
    v_clean    TEXT;
    v_device   RECORD;
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

    -- Evita crecimiento ilimitado sin borrar evidencia reciente útil.
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
        -- RETURN confirma el INSERT. Lanzar una excepción aquí lo revertiría.
        RETURN;
    END IF;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (v_device.id, v_uid, 'operator', TRUE)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.device_join_attempts (user_id, succeeded)
    VALUES (v_uid, TRUE);

    device_id := v_device.id;
    device_name := v_device.name;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.join_device_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_device_by_code(TEXT) TO authenticated;

COMMENT ON FUNCTION public.join_device_by_code(TEXT) IS
    'Vincula por código sin enumerar devices y conserva los intentos fallidos '
    'para aplicar el límite de diez por cuenta y hora.';
