-- =============================================================================
-- CONTACTO REAL DE LA SONDA
-- =============================================================================
-- La sonda no tiene internet: sólo habla con el teléfono por BLE. Hasta ahora
-- nada escribía batería, versión ni última conexión en `devices` (la Edge
-- Function device-checkin espera que el ESP32 llame por HTTP, y no puede), así
-- que esas columnas mostraban sus valores por defecto: 96 % de batería, la
-- versión '2.1.0' y la hora de alta como «última conexión».
--
-- Desde aquí la app informa cada conversación con la sonda mediante
-- report_device_contact(), y las columnas quedan en NULL hasta el primer
-- contacto real en vez de inventar un valor.
-- =============================================================================

ALTER TABLE public.devices
    ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;

ALTER TABLE public.devices ALTER COLUMN battery_level DROP NOT NULL;
ALTER TABLE public.devices ALTER COLUMN battery_level DROP DEFAULT;
ALTER TABLE public.devices ALTER COLUMN firmware_version DROP NOT NULL;
ALTER TABLE public.devices ALTER COLUMN firmware_version DROP DEFAULT;
ALTER TABLE public.devices ALTER COLUMN last_seen_at DROP DEFAULT;
ALTER TABLE public.devices ALTER COLUMN last_measurement_at DROP DEFAULT;

-- Los valores actuales son todos de relleno: ninguno vino de una sonda. Se
-- borran sin pasar por el historial de batería, que registraría un cambio que
-- nunca ocurrió.
ALTER TABLE public.devices DISABLE TRIGGER trg_log_device_status_change;
UPDATE public.devices SET battery_level = NULL, firmware_version = NULL, last_seen_at = NULL;
ALTER TABLE public.devices ENABLE TRIGGER trg_log_device_status_change;

COMMENT ON COLUMN public.devices.first_seen_at IS
  'Primer contacto real de la sonda con un teléfono (report_device_contact). NULL hasta entonces y tras un reset.';
COMMENT ON COLUMN public.devices.last_seen_at IS
  'Último contacto real de la sonda con un teléfono. La sonda no tiene internet: «online» significa que un teléfono habló con ella hace poco.';

-- La app la llama tras cada conversación BLE (medir, vincular, leer
-- identidad) con el ID de 15 dígitos, que es lo que conoce de la sonda. Si
-- estaba sin red, la llama después con la hora real del contacto, así que:
--   · la última conexión nunca retrocede y la primera nunca avanza;
--   · batería y versión sólo se toman de un contacto más nuevo que el último;
--   · una hora futura se recorta a la del servidor.
-- Sólo un miembro aprobado del equipo puede informar.
CREATE OR REPLACE FUNCTION public.report_device_contact(
    p_device_code TEXT,
    p_battery INTEGER DEFAULT NULL,
    p_firmware_version TEXT DEFAULT NULL,
    p_contacted_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id      UUID;
    v_at      TIMESTAMPTZ := LEAST(COALESCE(p_contacted_at, now()), now());
    v_battery INTEGER := CASE WHEN p_battery BETWEEN 0 AND 100 THEN p_battery END;
    v_version TEXT := CASE WHEN p_firmware_version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN p_firmware_version END;
BEGIN
    SELECT id INTO v_id FROM public.devices
     WHERE device_code = regexp_replace(COALESCE(p_device_code, ''), '\D', '', 'g');
    IF v_id IS NULL OR NOT public.has_device_access(v_id) THEN
        RAISE EXCEPTION 'No tienes acceso a este equipo.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.devices d
       SET first_seen_at    = LEAST(COALESCE(d.first_seen_at, v_at), v_at),
           last_seen_at     = GREATEST(COALESCE(d.last_seen_at, v_at), v_at),
           battery_level    = CASE WHEN d.last_seen_at IS NULL OR v_at >= d.last_seen_at
                                   THEN COALESCE(v_battery, d.battery_level) ELSE d.battery_level END,
           firmware_version = CASE WHEN d.last_seen_at IS NULL OR v_at >= d.last_seen_at
                                   THEN COALESCE(v_version, d.firmware_version) ELSE d.firmware_version END
     WHERE d.id = v_id;
END $$;
REVOKE ALL ON FUNCTION public.report_device_contact(TEXT, INTEGER, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_device_contact(TEXT, INTEGER, TEXT, TIMESTAMPTZ) TO authenticated;
