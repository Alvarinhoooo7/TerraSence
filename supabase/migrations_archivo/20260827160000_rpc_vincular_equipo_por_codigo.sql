-- =============================================================================
-- RPC: VINCULACIÓN DE UN SEGUNDO OPERADOR POR CÓDIGO DE 15 DÍGITOS
-- =============================================================================
-- Problema que resuelve:
--   Tras acotar RLS, la política SELECT de `devices` sólo deja ver los equipos
--   de los que ya se es miembro. Un operador que recibe el código de 15 dígitos
--   de un tercero no puede localizar el equipo desde el cliente — precisamente
--   la situación normal de una cuadrilla.
--
--   Relajar la política SELECT para permitir la búsqueda por código sería un
--   error: convertiría la tabla en enumerable y permitiría barrer el espacio de
--   códigos. La solución correcta es una función SECURITY DEFINER que valide el
--   código en el servidor y devuelva únicamente lo imprescindible.
--
-- Defensas incluidas:
--   · Formato estricto de 15 dígitos antes de tocar la tabla.
--   · Mensaje de error idéntico exista o no el equipo, para no filtrar qué
--     códigos son válidos.
--   · Límite de 10 intentos fallidos por usuario y hora, contra fuerza bruta.
--   · El solicitante entra como 'operator', nunca como propietario.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.device_join_attempts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    succeeded   BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_attempts_user_time
    ON public.device_join_attempts (user_id, attempted_at DESC);

ALTER TABLE public.device_join_attempts ENABLE ROW LEVEL SECURITY;

-- Sin políticas: sólo la función SECURITY DEFINER y el rol de servicio escriben
-- aquí. Un usuario no tiene por qué leer su propio historial de intentos.

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

    -- Sólo dígitos, para no depender de cómo el usuario copie el código.
    v_clean := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');

    IF v_clean !~ '^[1-9][0-9]{14}$' THEN
        RAISE EXCEPTION 'El código debe tener 15 dígitos y no empezar por cero.'
            USING ERRCODE = '22023';
    END IF;

    -- Freno de fuerza bruta: 10 fallos por usuario en la última hora.
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
        INSERT INTO public.device_join_attempts (user_id, succeeded) VALUES (v_uid, FALSE);
        -- Mensaje deliberadamente genérico: no revela si el código existe.
        RAISE EXCEPTION 'No se pudo vincular con ese código.' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (v_device.id, v_uid, 'operator', TRUE)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.device_join_attempts (user_id, succeeded) VALUES (v_uid, TRUE);

    device_id   := v_device.id;
    device_name := v_device.name;
    RETURN NEXT;
END; $$;

REVOKE ALL ON FUNCTION public.join_device_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_device_by_code(TEXT) TO authenticated;

COMMENT ON FUNCTION public.join_device_by_code(TEXT) IS
    'Vincula al usuario autenticado con un equipo a partir de su código de 15 '
    'dígitos, sin exponer la tabla devices a búsquedas. Rol asignado: operator.';
