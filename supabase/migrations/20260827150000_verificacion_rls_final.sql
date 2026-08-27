-- Verificación posterior al cierre de RLS. Sólo lectura, no modifica nada.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, COUNT(*) AS n,
               COUNT(*) FILTER (WHERE 'public' = ANY(roles)) AS abiertas_a_public,
               COUNT(*) FILTER (WHERE qual = 'true' AND cmd = 'ALL') AS permisivas_totales
        FROM pg_policies WHERE schemaname='public'
        GROUP BY tablename ORDER BY tablename
    LOOP
        RAISE NOTICE '[%] politicas=% | a rol public=% | ALL USING(true)=%',
            r.tablename, r.n, r.abiertas_a_public, r.permisivas_totales;
    END LOOP;
END $$;
