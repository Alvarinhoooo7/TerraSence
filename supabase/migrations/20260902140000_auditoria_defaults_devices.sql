-- Auditoría puntual antes de diseñar el reseteo de fábrica: valores DEFAULT
-- reales de public.devices y si existe algún registro con device_members
-- vacío hoy (para no romper nada al añadir la reclamación de equipos
-- desvinculados en register_paired_device). Sólo lectura.

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT column_name, column_default, is_nullable, data_type
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'devices'
         ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'devices.% default=% nullable=% type=%',
            r.column_name, r.column_default, r.is_nullable, r.data_type;
    END LOOP;

    FOR r IN
        SELECT conname, pg_get_constraintdef(oid) AS def
          FROM pg_constraint
         WHERE conrelid = 'public.devices'::regclass AND contype = 'c'
    LOOP
        RAISE NOTICE 'devices check %: %', r.conname, r.def;
    END LOOP;

    RAISE NOTICE 'devices sin ningún device_member hoy: %', (
        SELECT COUNT(*) FROM public.devices d
         WHERE NOT EXISTS (SELECT 1 FROM public.device_members dm WHERE dm.device_id = d.id)
    );
END $$;
