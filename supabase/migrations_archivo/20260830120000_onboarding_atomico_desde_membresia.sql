-- =============================================================================
-- TERRASENSE — ONBOARDING ATÓMICO CON LA MEMBRESÍA
-- =============================================================================
-- La pertenencia autorizada es la evidencia definitiva de que una de las dos
-- rutas terminó. El sello del perfil se escribe en la misma transacción que la
-- membresía, eliminando la ventana entre join/register y una segunda RPC.

CREATE OR REPLACE FUNCTION public.mark_onboarding_from_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_method TEXT;
BEGIN
    IF NOT COALESCE(NEW.is_authorized, TRUE) THEN
        RETURN NEW;
    END IF;

    v_method := CASE WHEN NEW.role = 'owner' THEN 'pairing' ELSE 'qr' END;

    UPDATE public.profiles
       SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
           onboarding_method = COALESCE(onboarding_method, v_method)
     WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_onboarding_from_membership ON public.device_members;
CREATE TRIGGER trg_mark_onboarding_from_membership
    AFTER INSERT OR UPDATE OF role, is_authorized ON public.device_members
    FOR EACH ROW EXECUTE FUNCTION public.mark_onboarding_from_membership();

COMMENT ON FUNCTION public.mark_onboarding_from_membership() IS
    'Persiste el onboarding dentro de la misma transacción que autoriza una '
    'membresía: owner equivale a pairing y el resto a QR.';
