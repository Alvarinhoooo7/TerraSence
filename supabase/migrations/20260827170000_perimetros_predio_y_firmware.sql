-- =============================================================================
-- PERÍMETROS DE PREDIO Y VERSIONES DE FIRMWARE
-- =============================================================================
-- Dos tablas nuevas, ambas aditivas: no tocan nada existente.
--
--   1. field_perimeters   -> polígono del predio, para dibujarlo bajo las
--                            mediciones y calcular su superficie real.
--   2. firmware_releases  -> catálogo de versiones para la gestión OTA.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------------------------
-- 0. FUNCIÓN AUXILIAR
-- -----------------------------------------------------------------------------
-- El esquema adoptado no traía disparador de `updated_at`. Se define aquí
-- porque lo necesita `field_perimeters`, y queda disponible para el resto.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END; $$;

-- -----------------------------------------------------------------------------
-- 1. PERÍMETROS DE PREDIO
-- -----------------------------------------------------------------------------
-- El esquema no tiene tabla de predios: `field_name` es texto en
-- `soil_measurements`. En vez de introducir esa tabla ahora —lo que obligaría a
-- migrar filas y tocar la consola— el perímetro se asocia por (usuario, nombre).
-- Es la clave natural con la que ya trabajan la app y la web.

CREATE TABLE IF NOT EXISTS public.field_perimeters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_name  TEXT NOT NULL,
    geom        GEOMETRY(Polygon, 4326) NOT NULL,

    -- Superficie en hectáreas, calculada por Postgres y no por el cliente:
    -- así no depende de qué app la escribió ni de errores de redondeo.
    -- Se proyecta a geografía para medir en metros sobre el elipsoide.
    area_ha     NUMERIC(12,4) GENERATED ALWAYS AS
                    (ROUND((ST_Area(geom::geography) / 10000.0)::numeric, 4)) STORED,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_field_perimeters_geom_gist
    ON public.field_perimeters USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_field_perimeters_user
    ON public.field_perimeters (user_id, field_name);

DROP TRIGGER IF EXISTS trg_field_perimeters_updated ON public.field_perimeters;
CREATE TRIGGER trg_field_perimeters_updated
    BEFORE UPDATE ON public.field_perimeters
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.field_perimeters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ts_perimeters_select_own" ON public.field_perimeters
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ts_perimeters_insert_own" ON public.field_perimeters
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ts_perimeters_update_own" ON public.field_perimeters
    FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ts_perimeters_delete_own" ON public.field_perimeters
    FOR DELETE TO authenticated USING (user_id = auth.uid());

COMMENT ON TABLE public.field_perimeters IS
    'Polígono del predio, asociado por (usuario, nombre de predio). area_ha la '
    'calcula Postgres sobre el elipsoide, no el cliente.';

-- -----------------------------------------------------------------------------
-- 2. VERSIONES DE FIRMWARE (OTA)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.firmware_releases (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Versionado semántico estricto: sin esto no se puede comparar y el
    -- despliegue OTA acaba decidiéndose por orden alfabético, que da 1.10.0 < 1.9.0.
    version        TEXT NOT NULL UNIQUE
                     CHECK (version ~ '^\d+\.\d+\.\d+$'),
    hardware_target TEXT NOT NULL DEFAULT 'ESP32-WROOM-32',

    binary_url     TEXT,
    -- SHA-256 del binario: el equipo debe verificarlo ANTES de conmutar la
    -- partición. Un OTA sin verificación de integridad es un vector de ataque.
    sha256         TEXT CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
    size_bytes     INTEGER CHECK (size_bytes IS NULL OR size_bytes > 0),

    release_notes  TEXT,
    is_mandatory   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Un firmware se publica sólo cuando se ha probado en campo. Por defecto
    -- entra como borrador: nadie lo recibe hasta marcarlo explícitamente.
    is_published   BOOLEAN NOT NULL DEFAULT FALSE,
    published_at   TIMESTAMPTZ,

    created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_published
    ON public.firmware_releases (hardware_target, is_published, created_at DESC);

ALTER TABLE public.firmware_releases ENABLE ROW LEVEL SECURITY;

-- Lectura para cualquier autenticado, pero SÓLO de lo publicado: un borrador
-- no debe ser visible ni descargable.
CREATE POLICY "ts_firmware_select_published" ON public.firmware_releases
    FOR SELECT TO authenticated USING (is_published = TRUE);

-- La escritura queda reservada al rol de servicio, que no pasa por RLS.
-- Publicar firmware no es una operación de usuario final.

COMMENT ON TABLE public.firmware_releases IS
    'Catálogo de versiones de firmware para OTA. Sólo las publicadas son '
    'visibles; la escritura está reservada al rol de servicio.';

-- -----------------------------------------------------------------------------
-- 3. ¿HAY ACTUALIZACIÓN PARA ESTE EQUIPO?
-- -----------------------------------------------------------------------------
-- Compara por componentes numéricos, no como texto: '1.10.0' > '1.9.0' es falso
-- en orden alfabético y verdadero en versionado semántico.

CREATE OR REPLACE FUNCTION public.check_firmware_update(p_device_id UUID)
RETURNS TABLE (
    version TEXT,
    binary_url TEXT,
    sha256 TEXT,
    size_bytes INTEGER,
    release_notes TEXT,
    is_mandatory BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_current TEXT;
    v_target  TEXT;
BEGIN
    IF NOT public.has_device_access(p_device_id) THEN
        RAISE EXCEPTION 'Sin acceso a este equipo.' USING ERRCODE = '42501';
    END IF;

    SELECT d.firmware_version, d.hardware_version
      INTO v_current, v_target
      FROM public.devices d
     WHERE d.id = p_device_id;

    IF v_current IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT f.version, f.binary_url, f.sha256, f.size_bytes, f.release_notes, f.is_mandatory
      FROM public.firmware_releases f
     WHERE f.is_published
       AND f.hardware_target = COALESCE(v_target, 'ESP32-WROOM-32')
       AND string_to_array(f.version, '.')::int[] > string_to_array(v_current, '.')::int[]
     ORDER BY string_to_array(f.version, '.')::int[] DESC
     LIMIT 1;
END; $$;

REVOKE ALL ON FUNCTION public.check_firmware_update(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_firmware_update(UUID) TO authenticated;
