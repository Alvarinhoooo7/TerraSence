-- =============================================================================
-- EL ID DE LA SONDA SALE DE SU MAC
-- =============================================================================
-- El firmware deriva el ID de 15 dígitos de la MAC base del ESP32 (48 bits en
-- decimal, con ceros a la izquierda): ya no lo inventa la app ni se guarda en
-- la sonda. Las MAC de Espressif como 08:3A:F2:… dan números de 13 dígitos,
-- así que el ID puede empezar con 0. Hasta aquí la restricción de `devices` y
-- cada función que valida el código exigían un primer dígito de 1 a 9.
--
-- La restricción se reemplaza, y las funciones se reescriben a partir de su
-- propia definición vigente cambiando sólo el patrón: así no se copia a mano
-- ningún cuerpo que pudiera quedar desalineado. CREATE OR REPLACE conserva los
-- permisos de cada función.
-- =============================================================================

ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_device_code_15_digits;
ALTER TABLE public.devices ADD CONSTRAINT devices_device_code_15_digits CHECK (device_code ~ '^[0-9]{15}$');

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND p.prosrc LIKE '%[1-9][0-9]{14}%'
    LOOP
        EXECUTE replace(pg_get_functiondef(r.oid), '^[1-9][0-9]{14}$', '^[0-9]{15}$');
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_proc p
                WHERE p.pronamespace = 'public'::regnamespace
                  AND p.prosrc LIKE '%[1-9][0-9]{14}%') THEN
        RAISE EXCEPTION 'Quedó una función con el patrón antiguo del ID.';
    END IF;
END $$;

COMMENT ON COLUMN public.devices.device_code IS
  'ID de 15 dígitos derivado de la MAC del ESP32 (puede empezar con 0). Lo lee la app de la sonda al vincular; no cambia nunca.';
