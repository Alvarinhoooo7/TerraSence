-- =============================================================================
-- TERRASENSE — FINALIZACIÓN ATÓMICA Y VALIDADA DEL ONBOARDING
-- =============================================================================
-- El cliente no debe poder marcar el onboarding como terminado antes de tener
-- una membresía real. La función también comprueba que la ruta `pairing`
-- corresponda a un propietario; un operador entra por QR.

CREATE OR REPLACE FUNCTION public.complete_my_onboarding(p_method TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
           AND (p_method <> 'pairing' OR dm.role = 'owner')
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

REVOKE ALL ON FUNCTION public.complete_my_onboarding(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_my_onboarding(TEXT) TO authenticated;

COMMENT ON FUNCTION public.complete_my_onboarding(TEXT) IS
    'Finaliza el onboarding de la cuenta autenticada sólo si ya posee una '
    'membresía autorizada. Pairing exige rol owner; QR acepta cualquier rol.';
