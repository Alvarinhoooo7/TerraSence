-- =============================================================================
-- Flota visible para soporte y versiones de firmware comparables
-- =============================================================================
-- Sale de auditar la consola web contra el esquema real. Tres desfases que no
-- se pueden arreglar en el cliente:
--
-- 1. `devices.hardware_version` venía por defecto como 'v2.0-nRF52840' mientras
--    que `firmware_releases.hardware_target` usa 'ESP32-WROOM-32'. Las dos
--    consultas que contrastan versión instalada contra versión publicada
--    (`check_firmware_update` y `admin_get_device_detail`) comparan ese par con
--    igualdad exacta, así que NUNCA encontraban candidata: la app decía siempre
--    "no hay una versión más reciente" y la ficha de soporte daba todo equipo
--    por actualizado. Además el nombre contradice la arquitectura del proyecto,
--    que es ESP32 (la sonda nRF52840 nunca existió fuera de ese valor por
--    defecto).
--
-- 2. `devices.firmware_version` venía por defecto como 'v2.1.0-BLE', pero
--    `firmware_releases.version` está restringido a `^\d+\.\d+\.\d+$`. Ambas
--    funciones hacen `string_to_array(v_current, '.')::int[]`, que sobre
--    'v2.1.0-BLE' produce {'v2','1','0-BLE'} y revienta con «invalid input
--    syntax for type integer». Hoy no estalla sólo porque el desfase del punto
--    1 descarta la fila antes; corregido el 1 sin corregir el 2, la pantalla de
--    actualizaciones de la app empezaría a devolver error.
--
-- 3. La consola es un backoffice, pero sus dos pantallas de flota leen
--    `devices` y `soil_measurements` directamente, y ambas están acotadas por
--    RLS a los equipos donde la sesión es MIEMBRO. Una cuenta de soporte no es
--    miembro de ningún equipo: las dos pantallas estaban condenadas a salir
--    vacías. Se resuelve con dos RPC SECURITY DEFINER que comprueban
--    `is_support_staff()`, igual que el resto del panel — no relajando RLS.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Lectura tolerante de una versión semántica
-- -----------------------------------------------------------------------------
-- Devuelve los tres componentes numéricos de una cadena de versión, ignorando
-- prefijos y sufijos ('v2.1.0-BLE' -> {2,1,0}), y NULL cuando no hay tres
-- números que extraer. Comparar int[] ordena por componente, no como texto:
-- '1.10.0' > '1.9.0', que es lo contrario de lo que daría la comparación
-- lexicográfica.
--
-- `search_path = ''` es seguro: `regexp_match` y `string_to_array` viven en
-- pg_catalog, que se resuelve siempre primero.

CREATE OR REPLACE FUNCTION public.semver_parts(p_version TEXT)
RETURNS INT[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = ''
AS $$
    SELECT string_to_array((regexp_match(p_version, '(\d+\.\d+\.\d+)'))[1], '.')::INT[];
$$;

COMMENT ON FUNCTION public.semver_parts(TEXT) IS
    'Tres componentes numéricos de una cadena de versión, o NULL si no los tiene. '
    'Tolera prefijos y sufijos para que un firmware informado como v2.1.0-BLE '
    'siga siendo comparable con el catálogo, que exige 2.1.0.';

-- -----------------------------------------------------------------------------
-- 2. Normalizar lo ya almacenado y lo que llegue
-- -----------------------------------------------------------------------------

ALTER TABLE public.devices ALTER COLUMN hardware_version SET DEFAULT 'ESP32-WROOM-32';
ALTER TABLE public.devices ALTER COLUMN firmware_version SET DEFAULT '2.1.0';

-- El trigger se instala antes del UPDATE para que las filas existentes pasen
-- por la misma normalización que las futuras y no queden dos criterios.
CREATE OR REPLACE FUNCTION public.normalize_device_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.hardware_version IS NULL OR NEW.hardware_version = 'v2.0-nRF52840' THEN
        NEW.hardware_version := 'ESP32-WROOM-32';
    END IF;

    -- Si no hay tres números que extraer se deja tal cual: es preferible un
    -- valor raro visible en la ficha a perder lo que informó el equipo.
    IF NEW.firmware_version IS NOT NULL AND NEW.firmware_version !~ '^\d+\.\d+\.\d+$' THEN
        NEW.firmware_version := COALESCE(
            (regexp_match(NEW.firmware_version, '(\d+\.\d+\.\d+)'))[1],
            NEW.firmware_version
        );
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.normalize_device_versions() IS
    'Deja hardware_version y firmware_version en la nomenclatura del catálogo. '
    'Hace falta porque la Edge Function device-checkin escribe lo que reporte el '
    'equipo, sin validar el formato.';

REVOKE EXECUTE ON FUNCTION public.normalize_device_versions() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_normalize_device_versions ON public.devices;
CREATE TRIGGER trg_normalize_device_versions
    BEFORE INSERT OR UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.normalize_device_versions();

-- Normalización de lo ya almacenado, fila a fila y tolerando el fallo.
--
-- Un `UPDATE` masivo aborta la migración entera, y hay una razón concreta por
-- la que puede hacerlo: `devices_device_code_15_digits` se añadió NOT VALID en
-- `20260827100000`, de modo que los equipos registrados con el formato antiguo
-- quedaron aceptados. NOT VALID exime a las filas existentes de la
-- comprobación inicial, pero **no** a las actualizaciones: cualquier UPDATE
-- sobre una de esas filas revalida la restricción y falla.
--
-- Eso convierte a esos equipos en filas congeladas —ni esta migración, ni la
-- Edge Function `device-checkin`, ni la app pueden escribir en ellas—, así que
-- se los deja como están y se avisa por nombre. Cambiarles el `device_code`
-- sería reescribir la identidad del hardware, que es justo lo que la
-- restricción protege, y no es una decisión que deba tomar una migración.
DO $$
DECLARE
    r            RECORD;
    v_bloqueados TEXT[] := '{}';
    v_ok         INTEGER := 0;
BEGIN
    FOR r IN
        SELECT id, device_code
          FROM public.devices
         WHERE hardware_version IS NULL
            OR hardware_version = 'v2.0-nRF52840'
            OR firmware_version !~ '^\d+\.\d+\.\d+$'
    LOOP
        BEGIN
            -- Asignación vacía: el trabajo real lo hace el trigger BEFORE.
            UPDATE public.devices SET hardware_version = hardware_version WHERE id = r.id;
            v_ok := v_ok + 1;
        EXCEPTION WHEN check_violation THEN
            v_bloqueados := v_bloqueados || r.device_code;
        END;
    END LOOP;

    RAISE NOTICE 'Versiones normalizadas en % equipo(s).', v_ok;

    IF array_length(v_bloqueados, 1) > 0 THEN
        RAISE WARNING
            'Sin normalizar, % equipo(s) con device_code fuera del formato de 15 dígitos: %. '
            'Ninguna escritura puede tocar esas filas mientras conserven ese código, así que su '
            'firmware seguirá sin poder compararse con el catálogo.',
            array_length(v_bloqueados, 1), array_to_string(v_bloqueados, ', ');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. `check_firmware_update` deja de poder reventar
-- -----------------------------------------------------------------------------
-- Idéntica a la vigente salvo por el uso de `semver_parts`, que evita el cast
-- directo a int[] sobre una cadena que puede no serlo, y por descartar los
-- equipos cuya versión instalada es ilegible en vez de abortar la consulta.

CREATE OR REPLACE FUNCTION public.check_firmware_update("p_device_id" UUID)
RETURNS TABLE("version" TEXT, "binary_url" TEXT, "sha256" TEXT, "size_bytes" INTEGER,
              "release_notes" TEXT, "is_mandatory" BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current INT[];
    v_target  TEXT;
BEGIN
    IF NOT public.has_device_access(p_device_id) THEN
        RAISE EXCEPTION 'Sin acceso a este equipo.' USING ERRCODE = '42501';
    END IF;

    SELECT public.semver_parts(d.firmware_version), d.hardware_version
      INTO v_current, v_target
      FROM public.devices d
     WHERE d.id = p_device_id;

    -- Sin versión legible no se puede afirmar que exista una más reciente.
    IF v_current IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT f.version, f.binary_url, f.sha256, f.size_bytes, f.release_notes, f.is_mandatory
      FROM public.firmware_releases f
     WHERE f.is_published
       AND f.hardware_target = COALESCE(v_target, 'ESP32-WROOM-32')
       AND public.semver_parts(f.version) > v_current
     ORDER BY public.semver_parts(f.version) DESC
     LIMIT 1;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. `admin_get_device_detail` distingue «al día» de «sin catálogo»
-- -----------------------------------------------------------------------------
-- Antes devolvía `is_up_to_date = true` tanto cuando el equipo estaba al día
-- como cuando no había ninguna versión publicada para su plataforma: dos
-- situaciones opuestas bajo la misma bandera, y la ficha sólo podía decir
-- «al día». Se añade `firmware_status`, que la consola sí puede explicar.
--
-- Cambian también dos cosas que la consola pedía a gritos:
--   * `last_location` ya no se devuelve cuando la última medición no trae GPS
--     (son nulables desde la idempotencia sin GPS); antes producía un enlace a
--     maps?q=null,null.
--   * los miembros incluyen `has_push_token`, para poder decir si ese usuario
--     recibiría un aviso. La columna existe desde 20260920160000 y la ficha
--     tenía una fila «Pushy token: No disponible» escrita a mano.

CREATE OR REPLACE FUNCTION public.admin_get_device_detail("p_device_id" UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_device public.devices;
    v_latest RECORD;
    v_status TEXT;
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_device FROM public.devices WHERE id = p_device_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;

    SELECT f.id, f.version, f.hardware_target, f.is_mandatory
      INTO v_latest
      FROM public.firmware_releases f
     WHERE f.is_published
       AND f.hardware_target = COALESCE(v_device.hardware_version, 'ESP32-WROOM-32')
     ORDER BY public.semver_parts(f.version) DESC NULLS LAST
     LIMIT 1;

    v_status := CASE
        WHEN v_latest.id IS NULL THEN 'sin_catalogo'
        WHEN public.semver_parts(v_device.firmware_version) IS NULL THEN 'version_ilegible'
        WHEN public.semver_parts(v_latest.version) > public.semver_parts(v_device.firmware_version)
            THEN 'desactualizado'
        ELSE 'al_dia'
    END;

    RETURN jsonb_build_object(
        'device', to_jsonb(v_device),
        'latest_published_firmware', CASE WHEN v_latest.id IS NULL THEN NULL ELSE
            jsonb_build_object('id', v_latest.id, 'version', v_latest.version,
                               'hardware_target', v_latest.hardware_target,
                               'is_mandatory', v_latest.is_mandatory)
        END,
        'firmware_status', v_status,
        -- Se conserva por compatibilidad con clientes que ya la leen; a partir
        -- de aquí lo informativo es `firmware_status`.
        'is_up_to_date', (v_status <> 'desactualizado'),
        'last_location', (
            SELECT jsonb_build_object('latitude', m.latitude, 'longitude', m.longitude,
                                      'gps_accuracy_m', m.gps_accuracy_m,
                                      'field_name', m.field_name, 'measured_at', m.measured_at)
              FROM public.soil_measurements m
             WHERE m.device_id = p_device_id
               AND m.latitude IS NOT NULL
               AND m.longitude IS NOT NULL
             ORDER BY m.measured_at DESC LIMIT 1
        ),
        'members', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'user_id', dm.user_id,
                'email', p.email,
                'full_name', NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
                'role', dm.role,
                'is_authorized', dm.is_authorized,
                'has_push_token', (p.push_token IS NOT NULL),
                'created_at', dm.created_at
            ) ORDER BY CASE dm.role WHEN 'admin' THEN 0 ELSE 1 END, p.email), '[]'::jsonb)
              FROM public.device_members dm
              JOIN public.profiles p ON p.id = dm.user_id
             WHERE dm.device_id = p_device_id
        ),
        'battery_history', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'battery_level', l.battery_level, 'firmware_version', l.firmware_version,
                'recorded_at', l.recorded_at
            ) ORDER BY l.recorded_at DESC), '[]'::jsonb)
              FROM (SELECT * FROM public.device_status_log
                     WHERE device_id = p_device_id
                     ORDER BY recorded_at DESC LIMIT 100) l
        ),
        'measurements', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', m.id, 'measured_at', m.measured_at, 'field_name', m.field_name,
                'crop_id', m.crop_id,
                'phenological_stage', m.phenological_stage, 'verdict', m.verdict,
                'verdict_title', m.verdict_title, 'vwc_percent', m.vwc_percent,
                'soil_temp_c', m.soil_temp_c, 'ec_us_cm', m.ec_us_cm, 'ph', m.ph,
                'canopy_temp_c', m.canopy_temp_c, 'canopy_humidity_pct', m.canopy_humidity_pct,
                'air_pressure_hpa', m.air_pressure_hpa, 'diagnosis', m.diagnosis,
                'battery_percent', m.battery_percent,
                'nitrogen', m.nitrogen, 'phosphorus', m.phosphorus, 'potassium', m.potassium,
                'latitude', m.latitude, 'longitude', m.longitude
            ) ORDER BY m.measured_at DESC), '[]'::jsonb)
              FROM (SELECT * FROM public.soil_measurements
                     WHERE device_id = p_device_id
                     ORDER BY measured_at DESC LIMIT 50) m
        )
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Inventario de flota para soporte
-- -----------------------------------------------------------------------------
-- Lo que `/devices` intentaba leer de la tabla `devices` y RLS le negaba.
-- Agrega de una vez lo que la pantalla tenía que deducir a mano o no podía
-- saber: cuántos miembros hay, cuántos esperan aprobación, cuántas mediciones
-- lleva el equipo y en qué estado está su firmware.

CREATE OR REPLACE FUNCTION public.admin_list_fleet()
RETURNS TABLE(
    device_id          UUID,
    device_code        TEXT,
    name               TEXT,
    alias              TEXT,
    is_active          BOOLEAN,
    battery_level      INTEGER,
    firmware_version   TEXT,
    hardware_version   TEXT,
    last_seen_at       TIMESTAMPTZ,
    last_measurement_at TIMESTAMPTZ,
    created_at         TIMESTAMPTZ,
    member_count       INTEGER,
    pending_count      INTEGER,
    measurement_count  INTEGER,
    latest_version     TEXT,
    firmware_status    TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT d.id,
           d.device_code::TEXT,
           d.name::TEXT,
           d.alias::TEXT,
           d.is_active,
           d.battery_level::INTEGER,
           d.firmware_version::TEXT,
           d.hardware_version::TEXT,
           d.last_seen_at,
           d.last_measurement_at,
           d.created_at,
           COALESCE(mem.total, 0)::INTEGER,
           COALESCE(mem.pending, 0)::INTEGER,
           COALESCE(mea.total, 0)::INTEGER,
           latest.version,
           CASE
               WHEN latest.version IS NULL THEN 'sin_catalogo'
               WHEN public.semver_parts(d.firmware_version) IS NULL THEN 'version_ilegible'
               WHEN public.semver_parts(latest.version) > public.semver_parts(d.firmware_version)
                   THEN 'desactualizado'
               ELSE 'al_dia'
           END
      FROM public.devices d
      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE NOT dm.is_authorized) AS pending
            FROM public.device_members dm
           WHERE dm.device_id = d.id
      ) mem ON TRUE
      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS total
            FROM public.soil_measurements m
           WHERE m.device_id = d.id
      ) mea ON TRUE
      LEFT JOIN LATERAL (
          SELECT f.version
            FROM public.firmware_releases f
           WHERE f.is_published
             AND f.hardware_target = COALESCE(d.hardware_version, 'ESP32-WROOM-32')
           ORDER BY public.semver_parts(f.version) DESC NULLS LAST
           LIMIT 1
      ) latest ON TRUE
     ORDER BY d.last_seen_at DESC NULLS LAST, d.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_list_fleet() IS
    'Inventario completo de sondas para el backoffice. RLS acota `devices` a los '
    'equipos donde la sesión es miembro, y una cuenta de soporte no lo es de '
    'ninguno: el perímetro aquí es is_support_staff(), igual que el resto del panel.';

-- -----------------------------------------------------------------------------
-- 6. Últimas mediciones de toda la flota
-- -----------------------------------------------------------------------------
-- Equivalente de `admin_list_fleet` para `/measurements`. Trae el equipo
-- resuelto en la misma fila para no obligar a la consola a cruzar dos listas.

CREATE OR REPLACE FUNCTION public.admin_list_recent_measurements(p_limit INTEGER DEFAULT 200)
RETURNS TABLE(
    id                   UUID,
    device_id            UUID,
    device_code          TEXT,
    device_label         TEXT,
    measured_at          TIMESTAMPTZ,
    field_name           TEXT,
    crop_id              TEXT,
    phenological_stage   TEXT,
    verdict              TEXT,
    verdict_title        TEXT,
    vwc_percent          NUMERIC,
    soil_temp_c          NUMERIC,
    ec_us_cm             INTEGER,
    ph                   NUMERIC,
    nitrogen             INTEGER,
    phosphorus           INTEGER,
    potassium            INTEGER,
    canopy_temp_c        NUMERIC,
    canopy_humidity_pct  NUMERIC,
    air_pressure_hpa     NUMERIC,
    battery_percent      SMALLINT,
    latitude             NUMERIC,
    longitude            NUMERIC,
    diagnosis            JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_support_staff() THEN
        RAISE EXCEPTION 'No tienes acceso al panel de soporte.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT m.id,
           m.device_id,
           d.device_code::TEXT,
           COALESCE(NULLIF(d.alias, ''), d.name)::TEXT,
           m.measured_at,
           m.field_name::TEXT,
           m.crop_id::TEXT,
           m.phenological_stage,
           m.verdict::TEXT,
           m.verdict_title,
           m.vwc_percent,
           m.soil_temp_c,
           m.ec_us_cm,
           m.ph,
           m.nitrogen,
           m.phosphorus,
           m.potassium,
           m.canopy_temp_c,
           m.canopy_humidity_pct,
           m.air_pressure_hpa,
           m.battery_percent,
           m.latitude,
           m.longitude,
           m.diagnosis
      FROM public.soil_measurements m
      JOIN public.devices d ON d.id = m.device_id
     ORDER BY m.measured_at DESC
     LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);
END;
$$;

COMMENT ON FUNCTION public.admin_list_recent_measurements(INTEGER) IS
    'Últimas mediciones de toda la flota para el backoffice, con el equipo ya '
    'resuelto. Tope de 500 filas: es una pantalla de diagnóstico, no un export.';

-- -----------------------------------------------------------------------------
-- 7. Permisos
-- -----------------------------------------------------------------------------
-- Postgres concede EXECUTE a PUBLIC en cada función nueva, y en Supabase PUBLIC
-- incluye a `anon`. El perímetro real de las tres RPC nuevas es
-- `is_support_staff()`, pero no hay razón para que figuren en la superficie
-- anónima de la API.

REVOKE EXECUTE ON FUNCTION public.admin_list_fleet()                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_recent_measurements(INTEGER)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.semver_parts(TEXT)                        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_fleet()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_recent_measurements(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.semver_parts(TEXT)                      TO authenticated, service_role;

COMMIT;
