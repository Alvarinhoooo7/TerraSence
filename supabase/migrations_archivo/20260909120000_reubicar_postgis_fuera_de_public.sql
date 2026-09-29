-- =============================================================================
-- Reubicar PostGIS fuera del esquema `public`
-- =============================================================================
-- Supabase avisó de `rls_disabled_in_public` (nivel ERROR) sobre
-- `public.spatial_ref_sys`: la tabla de sistemas de referencia de PostGIS queda
-- expuesta por PostgREST y los roles `anon` y `authenticated` tienen sobre ella
-- privilegios completos (arwdDxtm), es decir, cualquiera con la clave anónima
-- puede leerla, modificarla o vaciarla.
--
-- No se puede corregir en el sitio: la tabla pertenece a `supabase_admin`, así
-- que desde el rol `postgres` ni `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
-- (must be owner of table spatial_ref_sys) ni `REVOKE` surten efecto. La única
-- solución real es sacar la extensión del esquema expuesto. PostGIS no es
-- reubicable (`ALTER EXTENSION ... SET SCHEMA` falla), de modo que hay que
-- recrearla en `extensions`, que PostgREST no publica.
--
-- Esto resuelve además el aviso `extension_in_public` sobre `postgis`.
--
-- Objetos que dependen de PostGIS y se rehacen aquí (no hay más: se comprobó
-- contra pg_depend que ninguna vista, función o RPC usa tipos geométricos):
--   - public.soil_measurements.geom   (generada desde longitude/latitude)
--   - public.predial_quadrants.geom   (generada desde longitude/latitude)
--   - public.field_perimeters.geom    (dato real) y area_ha (generada de geom)
--   - los tres índices GiST asociados
--
-- Reversión: volver a ejecutar este archivo cambiando `extensions` por `public`
-- en el CREATE EXTENSION y en las cualificaciones de tipo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Salvaguarda: `field_perimeters.geom` es el único geom con datos propios
-- -----------------------------------------------------------------------------
-- Al ejecutarse esta migración la tabla estaba vacía, por eso se puede soltar y
-- recrear la columna NOT NULL sin exportar nada. Si alguien ya cargó perímetros,
-- la migración se detiene en vez de perderlos.

DO $$
DECLARE
    filas BIGINT;
BEGIN
    SELECT COUNT(*) INTO filas FROM public.field_perimeters;
    IF filas > 0 THEN
        RAISE EXCEPTION
            'public.field_perimeters tiene % fila(s): exporta geom a WKT antes de reubicar PostGIS',
            filas;
    END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 1. Soltar lo que depende de la extensión
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_soil_measurements_geom_gist;
DROP INDEX IF EXISTS public.idx_predial_quadrants_geom_gist;
DROP INDEX IF EXISTS public.idx_field_perimeters_geom_gist;

ALTER TABLE public.soil_measurements DROP COLUMN IF EXISTS geom;
ALTER TABLE public.predial_quadrants DROP COLUMN IF EXISTS geom;
ALTER TABLE public.field_perimeters  DROP COLUMN IF EXISTS area_ha;
ALTER TABLE public.field_perimeters  DROP COLUMN IF EXISTS geom;

-- -----------------------------------------------------------------------------
-- 2. Recrear PostGIS en `extensions`
-- -----------------------------------------------------------------------------
-- Sin CASCADE a propósito: si quedara algún objeto dependiente que no se haya
-- previsto, la migración falla y lo señala en vez de borrarlo en silencio.

DROP EXTENSION IF EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION postgis WITH SCHEMA extensions;

-- `extensions` ya forma parte del search_path que PostgREST inyecta en cada
-- petición (config.toml: extra_search_path = ["public", "extensions"]), así que
-- el casting implícito de WKT a geometry que hace la app sigue funcionando.
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Rehacer las columnas geométricas cualificando el esquema
-- -----------------------------------------------------------------------------
-- Los tipos y funciones se escriben como `extensions.*` para no depender del
-- search_path de quien ejecute la migración.

ALTER TABLE public.soil_measurements
    ADD COLUMN geom extensions.GEOMETRY(Point, 4326)
    GENERATED ALWAYS AS (
        extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)
    ) STORED;

CREATE INDEX idx_soil_measurements_geom_gist
    ON public.soil_measurements USING GIST (geom);

ALTER TABLE public.predial_quadrants
    ADD COLUMN geom extensions.GEOMETRY(Point, 4326)
    GENERATED ALWAYS AS (
        extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)
    ) STORED;

CREATE INDEX idx_predial_quadrants_geom_gist
    ON public.predial_quadrants USING GIST (geom);

ALTER TABLE public.field_perimeters
    ADD COLUMN geom extensions.GEOMETRY(Polygon, 4326) NOT NULL;

ALTER TABLE public.field_perimeters
    ADD COLUMN area_ha NUMERIC(12,4) GENERATED ALWAYS AS (
        ROUND((extensions.ST_Area(geom::extensions.GEOGRAPHY) / 10000.0)::numeric, 4)
    ) STORED;

CREATE INDEX idx_field_perimeters_geom_gist
    ON public.field_perimeters USING GIST (geom);

-- -----------------------------------------------------------------------------
-- 4. Verificación
-- -----------------------------------------------------------------------------
-- Si la extensión quedó mal ubicada o `spatial_ref_sys` sigue en un esquema
-- publicado, se aborta antes de dar la migración por buena.

DO $$
DECLARE
    esquema_ext TEXT;
    expuesta    INT;
BEGIN
    SELECT n.nspname INTO esquema_ext
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
     WHERE e.extname = 'postgis';

    IF esquema_ext IS DISTINCT FROM 'extensions' THEN
        RAISE EXCEPTION 'PostGIS quedó en el esquema %, se esperaba extensions', esquema_ext;
    END IF;

    SELECT COUNT(*) INTO expuesta
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND NOT c.relrowsecurity;

    IF expuesta > 0 THEN
        RAISE EXCEPTION 'Quedan % tabla(s) en public sin RLS', expuesta;
    END IF;
END
$$;
