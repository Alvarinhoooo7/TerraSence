-- =============================================================================
-- TERRASENSE — MIGRACIÓN ADITIVA SOBRE EL ESQUEMA EXISTENTE
-- =============================================================================
-- Estrategia: ADOPTAR el esquema ya desplegado (inglés, snake_case) y AÑADIR
-- únicamente lo que falta. No se renombra ni se elimina nada, y no se pierde
-- ningún dato existente.
--
-- Añade:
--   1. Etapa fenológica  -> TerraSense cubre las 4 etapas, no sólo la siembra
--   2. Radio de representatividad (20 m) y precisión GPS  -> mapa principal
--   3. Columna geométrica PostGIS + índice GiST           -> consultas espaciales
--   4. Trazabilidad de versiones del motor                -> principio P4
--   5. Idempotencia de la cola offline (client_uuid)      -> store & forward
--   6. device_code de 15 dígitos                          -> ID de dispositivo
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ETAPA FENOLÓGICA
-- -----------------------------------------------------------------------------
-- Se usa TEXT + CHECK en lugar de ENUM para mantener la convención del esquema
-- existente (verdict, role y status ya son TEXT con restricción).
-- El mismo suelo produce veredictos distintos según la etapa activa.

ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS phenological_stage TEXT NOT NULL DEFAULT 'pre_siembra';

DO $$ BEGIN
    ALTER TABLE public.soil_measurements
        ADD CONSTRAINT soil_measurements_phenological_stage_check
        CHECK (phenological_stage IN ('pre_siembra','vegetativo','floracion','cosecha'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.soil_measurements.phenological_stage IS
    'Etapa del ciclo productivo en que se tomó la medición. Determina qué evalúa '
    'el semáforo: pre_siembra (germinación), vegetativo (nutrición y riego), '
    'floracion (estrés salino e hídrico), cosecha (transitabilidad del suelo).';

-- El predio también recuerda su etapa activa, para preseleccionarla en la app
ALTER TABLE public.predial_quadrants
    ADD COLUMN IF NOT EXISTS phenological_stage TEXT NOT NULL DEFAULT 'pre_siembra';

DO $$ BEGIN
    ALTER TABLE public.predial_quadrants
        ADD CONSTRAINT predial_quadrants_phenological_stage_check
        CHECK (phenological_stage IN ('pre_siembra','vegetativo','floracion','cosecha'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. RADIO DE REPRESENTATIVIDAD Y PRECISIÓN GPS
-- -----------------------------------------------------------------------------
-- El mapa principal dibuja un círculo por medición, coloreado según el veredicto.

ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS radius_m INTEGER NOT NULL DEFAULT 20;

DO $$ BEGIN
    ALTER TABLE public.soil_measurements
        ADD CONSTRAINT soil_measurements_radius_m_check
        CHECK (radius_m BETWEEN 1 AND 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS gps_accuracy_m REAL;

COMMENT ON COLUMN public.soil_measurements.radius_m IS
    'Radio en metros del círculo que representa el área de influencia de la '
    'medición en el mapa. Por defecto 20 m, ajustable de 1 a 500.';
COMMENT ON COLUMN public.soil_measurements.gps_accuracy_m IS
    'Precisión reportada por el GPS al capturar el punto. La app advierte al '
    'usuario si supera los 15 m antes de guardar.';

ALTER TABLE public.predial_quadrants
    ADD COLUMN IF NOT EXISTS radius_m INTEGER NOT NULL DEFAULT 20;

-- -----------------------------------------------------------------------------
-- 3. GEOMETRÍA POSTGIS E ÍNDICES ESPACIALES
-- -----------------------------------------------------------------------------
-- PostGIS ya está instalado en el proyecto. Se añade la columna generada para
-- poder consultar por proximidad e interpolar mapas de calor por IDW.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;

CREATE INDEX IF NOT EXISTS idx_soil_measurements_geom_gist
    ON public.soil_measurements USING GIST (geom);

ALTER TABLE public.predial_quadrants
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;

CREATE INDEX IF NOT EXISTS idx_predial_quadrants_geom_gist
    ON public.predial_quadrants USING GIST (geom);

-- Índices de consulta habituales del mapa y del histórico
CREATE INDEX IF NOT EXISTS idx_soil_measurements_device_fecha
    ON public.soil_measurements (device_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_soil_measurements_stage
    ON public.soil_measurements (device_id, phenological_stage, measured_at DESC);

-- -----------------------------------------------------------------------------
-- 4. TRAZABILIDAD DEL MOTOR AGRONÓMICO
-- -----------------------------------------------------------------------------
-- Principio P4: toda recomendación debe poder reproducirse íntegra dos
-- temporadas después. Sin esto no se puede demostrar qué regla la generó
-- ante un reclamo por una enmienda mal indicada.

ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS engine_version TEXT NOT NULL DEFAULT '0.0.0';
ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS crop_catalog_version TEXT NOT NULL DEFAULT '0.0.0';
ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS firmware_version TEXT;
ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS diagnosis JSONB;

COMMENT ON COLUMN public.soil_measurements.engine_version IS
    'Versión del motor de inferencia que produjo el veredicto. Requisito '
    'probatorio: permite reproducir la recomendación exactamente.';

-- -----------------------------------------------------------------------------
-- 5. IDEMPOTENCIA DE LA COLA OFFLINE (STORE & FORWARD)
-- -----------------------------------------------------------------------------
-- El UUID lo genera el teléfono antes de sincronizar. Si la app reintenta el
-- envío tras recuperar cobertura, la restricción UNIQUE evita duplicar la fila.

ALTER TABLE public.soil_measurements
    ADD COLUMN IF NOT EXISTS client_uuid UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_soil_measurements_client_uuid
    ON public.soil_measurements (client_uuid) WHERE client_uuid IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. DEVICE_CODE DE 15 DÍGITOS
-- -----------------------------------------------------------------------------
-- Generación aleatoria con reintento y unicidad garantizada por índice.
-- No se deriva por hash de UUID: 10 dígitos por hash colisionan por la
-- paradoja del cumpleaños a partir de unos pocos miles de registros.

CREATE OR REPLACE FUNCTION public.generate_device_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    candidate TEXT;
    attempts  INTEGER := 0;
BEGIN
    LOOP
        candidate := (1 + FLOOR(RANDOM() * 9))::TEXT;   -- primer dígito 1-9
        FOR i IN 2..15 LOOP
            candidate := candidate || FLOOR(RANDOM() * 10)::TEXT;
        END LOOP;

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM public.devices d WHERE d.device_code = candidate
        );

        attempts := attempts + 1;
        IF attempts > 50 THEN
            RAISE EXCEPTION 'No se pudo generar un device_code único tras 50 intentos';
        END IF;
    END LOOP;
    RETURN candidate;
END; $$;

COMMENT ON FUNCTION public.generate_device_code() IS
    'Genera un código de dispositivo de 15 dígitos aleatorios, con reintento '
    'ante colisión. Debe mantenerse coherente con App/src/utils/deviceId.ts.';

ALTER TABLE public.devices
    ALTER COLUMN device_code SET DEFAULT public.generate_device_code();

-- NOT VALID: los dispositivos ya registrados con un formato antiguo quedan
-- aceptados; la restricción sólo se aplica a filas nuevas y actualizadas.
-- Para exigirla sobre los existentes, primero migrar sus códigos y luego:
--   ALTER TABLE public.devices VALIDATE CONSTRAINT devices_device_code_15_digits;
DO $$ BEGIN
    ALTER TABLE public.devices
        ADD CONSTRAINT devices_device_code_15_digits
        CHECK (device_code ~ '^[1-9][0-9]{14}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_device_code
    ON public.devices (device_code);
