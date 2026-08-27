-- =============================================================================
-- AUDITORÍA DE POLÍTICAS RLS — SOLO LECTURA, NO MODIFICA NADA
-- =============================================================================
-- No contiene DDL. Emite por NOTICE la definición de cada política del esquema
-- public para poder auditarlas desde el CLI sin acceso directo a psql.
-- Se conserva en el historial como constancia de la auditoría realizada.
-- =============================================================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname, cmd, permissive, roles::text AS roles,
               COALESCE(qual, '-') AS using_expr,
               COALESCE(with_check, '-') AS check_expr
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE '[%] % | cmd=% | roles=% | USING=% | CHECK=%',
            r.tablename, r.policyname, r.cmd, r.roles, r.using_expr, r.check_expr;
    END LOOP;
END $$;
