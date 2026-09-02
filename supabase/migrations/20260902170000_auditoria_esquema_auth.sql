-- Auditoría de columnas reales de auth.users / auth.identities antes de
-- insertar un usuario por SQL directo. Sólo lectura, sin datos sensibles.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
         WHERE table_schema = 'auth' AND table_name = 'users'
         ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'auth.users.% type=% nullable=% default=%',
            r.column_name, r.data_type, r.is_nullable, r.column_default;
    END LOOP;

    FOR r IN
        SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
         WHERE table_schema = 'auth' AND table_name = 'identities'
         ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'auth.identities.% type=% nullable=% default=%',
            r.column_name, r.data_type, r.is_nullable, r.column_default;
    END LOOP;
END $$;
