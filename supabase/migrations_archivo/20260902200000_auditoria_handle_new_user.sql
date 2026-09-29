-- Auditoría puntual: qué hace handle_new_user() con raw_user_meta_data, para
-- crear un usuario demo sin dejar profiles a medio llenar. Sólo lectura.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT pg_get_functiondef(p.oid) AS def
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    LOOP
        RAISE NOTICE '%', r.def;
    END LOOP;

    FOR r IN
        SELECT column_name, is_nullable, column_default
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'profiles'
         ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'profiles.% nullable=% default=%', r.column_name, r.is_nullable, r.column_default;
    END LOOP;
END $$;
