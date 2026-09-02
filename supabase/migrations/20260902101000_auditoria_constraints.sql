-- Última pasada de auditoría antes de construir el backend del panel de
-- soporte: restricciones CHECK reales sobre las tablas que va a tocar, para
-- no adivinar valores permitidos (category/severity de push_alerts, role de
-- device_members, etc.). Sólo lectura.

DO $$
DECLARE
    v_row RECORD;
BEGIN
    FOR v_row IN
        SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS def
          FROM pg_constraint
         WHERE contype = 'c'
           AND conrelid::regclass::text IN (
             'public.push_alerts', 'public.device_members', 'public.devices',
             'public.profiles', 'public.firmware_releases'
           )
         ORDER BY conrelid::regclass::text, conname
    LOOP
        RAISE NOTICE '% % -> %', v_row.tbl, v_row.conname, v_row.def;
    END LOOP;

    FOR v_row IN SELECT DISTINCT hardware_target FROM public.firmware_releases LOOP
        RAISE NOTICE 'firmware_releases.hardware_target en uso: %', v_row.hardware_target;
    END LOOP;

    FOR v_row IN SELECT DISTINCT category, severity FROM public.push_alerts LOOP
        RAISE NOTICE 'push_alerts category=% severity=%', v_row.category, v_row.severity;
    END LOOP;
END $$;
