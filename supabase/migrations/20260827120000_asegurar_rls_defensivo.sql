-- =============================================================================
-- ASEGURAMIENTO DEFENSIVO DE ROW LEVEL SECURITY
-- =============================================================================
-- Esta migración es IDEMPOTENTE y NO PISA políticas existentes.
--
-- Para cada tabla comprueba cuántas políticas hay definidas:
--   · Si ya existe al menos una  -> no toca nada y deja constancia con RAISE NOTICE.
--   · Si no existe ninguna       -> habilita RLS y crea el juego mínimo correcto.
--
-- Motivo: el esquema se adoptó ya desplegado y no había forma de auditar su
-- estado de RLS sin Docker. Los dos escenarios malos son simétricos y ambos
-- quedan cubiertos:
--   a) RLS activo sin políticas -> la app no puede ni leer ni escribir.
--   b) RLS inactivo             -> cualquier usuario autenticado ve los datos
--                                  de todos los demás (aislamiento roto).
-- =============================================================================

-- Función de apoyo: ¿el usuario actual está autorizado sobre este dispositivo?
-- SECURITY DEFINER evita la recursión entre políticas de devices y device_members.
CREATE OR REPLACE FUNCTION public.has_device_access(p_device_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.device_members dm
        WHERE dm.device_id = p_device_id
          AND dm.user_id = auth.uid()
          AND COALESCE(dm.is_authorized, TRUE)
    );
$$;

COMMENT ON FUNCTION public.has_device_access(UUID) IS
    'Indica si el usuario autenticado tiene acceso autorizado a un dispositivo. '
    'Usada por las políticas RLS para evitar recursión.';

DO $$
DECLARE
    n INTEGER;
BEGIN
    -- ── profiles ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles';

    IF n = 0 THEN
        RAISE NOTICE 'profiles: sin políticas. Habilitando RLS y creando juego mínimo.';
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "ts_profiles_select_own" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "ts_profiles_insert_own" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
        CREATE POLICY "ts_profiles_update_own" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
    ELSE
        RAISE NOTICE 'profiles: ya tiene % política(s). No se modifica.', n;
    END IF;

    -- ── device_members ────────────────────────────────────────────────────
    SELECT COUNT(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'device_members';

    IF n = 0 THEN
        RAISE NOTICE 'device_members: sin políticas. Habilitando RLS.';
        ALTER TABLE public.device_members ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "ts_device_members_select_own" ON public.device_members
            FOR SELECT USING (user_id = auth.uid());
        CREATE POLICY "ts_device_members_insert_own" ON public.device_members
            FOR INSERT WITH CHECK (user_id = auth.uid());
        CREATE POLICY "ts_device_members_update_own" ON public.device_members
            FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "ts_device_members_delete_own" ON public.device_members
            FOR DELETE USING (user_id = auth.uid());
    ELSE
        RAISE NOTICE 'device_members: ya tiene % política(s). No se modifica.', n;
    END IF;

    -- ── devices ───────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'devices';

    IF n = 0 THEN
        RAISE NOTICE 'devices: sin políticas. Habilitando RLS.';
        ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "ts_devices_select_member" ON public.devices
            FOR SELECT USING (public.has_device_access(id));
        -- El alta es abierta a usuarios autenticados: el trigger de vinculación
        -- convierte al creador en miembro inmediatamente después.
        CREATE POLICY "ts_devices_insert_auth" ON public.devices
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY "ts_devices_update_member" ON public.devices
            FOR UPDATE USING (public.has_device_access(id));
    ELSE
        RAISE NOTICE 'devices: ya tiene % política(s). No se modifica.', n;
    END IF;

    -- ── soil_measurements ─────────────────────────────────────────────────
    SELECT COUNT(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'soil_measurements';

    IF n = 0 THEN
        RAISE NOTICE 'soil_measurements: sin políticas. Habilitando RLS.';
        ALTER TABLE public.soil_measurements ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "ts_measurements_select" ON public.soil_measurements
            FOR SELECT USING (
                user_id = auth.uid() OR public.has_device_access(device_id)
            );
        CREATE POLICY "ts_measurements_insert" ON public.soil_measurements
            FOR INSERT WITH CHECK (
                auth.role() = 'authenticated'
                AND (user_id IS NULL OR user_id = auth.uid())
            );
        CREATE POLICY "ts_measurements_update" ON public.soil_measurements
            FOR UPDATE USING (
                user_id = auth.uid() OR public.has_device_access(device_id)
            );
        CREATE POLICY "ts_measurements_delete" ON public.soil_measurements
            FOR DELETE USING (user_id = auth.uid());
    ELSE
        RAISE NOTICE 'soil_measurements: ya tiene % política(s). No se modifica.', n;
    END IF;

    -- ── predial_quadrants ─────────────────────────────────────────────────
    SELECT COUNT(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'predial_quadrants';

    IF n = 0 THEN
        RAISE NOTICE 'predial_quadrants: sin políticas. Habilitando RLS.';
        ALTER TABLE public.predial_quadrants ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "ts_quadrants_select" ON public.predial_quadrants
            FOR SELECT USING (
                device_id IS NULL OR public.has_device_access(device_id)
            );
        CREATE POLICY "ts_quadrants_write" ON public.predial_quadrants
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY "ts_quadrants_update" ON public.predial_quadrants
            FOR UPDATE USING (
                device_id IS NULL OR public.has_device_access(device_id)
            );
    ELSE
        RAISE NOTICE 'predial_quadrants: ya tiene % política(s). No se modifica.', n;
    END IF;

    -- ── push_alerts ───────────────────────────────────────────────────────
    SELECT COUNT(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'push_alerts';

    IF n = 0 THEN
        RAISE NOTICE 'push_alerts: sin políticas. Habilitando RLS.';
        ALTER TABLE public.push_alerts ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "ts_alerts_select" ON public.push_alerts
            FOR SELECT USING (
                user_id = auth.uid()
                OR (device_id IS NOT NULL AND public.has_device_access(device_id))
            );
        CREATE POLICY "ts_alerts_update" ON public.push_alerts
            FOR UPDATE USING (user_id = auth.uid());
    ELSE
        RAISE NOTICE 'push_alerts: ya tiene % política(s). No se modifica.', n;
    END IF;

    -- ── lab_validation_records ────────────────────────────────────────────
    -- Corpus de validación metrológica: lectura para cualquier usuario
    -- autenticado, escritura reservada al rol de servicio.
    SELECT COUNT(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'lab_validation_records';

    IF n = 0 THEN
        RAISE NOTICE 'lab_validation_records: sin políticas. Habilitando RLS.';
        ALTER TABLE public.lab_validation_records ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "ts_lab_select_auth" ON public.lab_validation_records
            FOR SELECT USING (auth.role() = 'authenticated');
    ELSE
        RAISE NOTICE 'lab_validation_records: ya tiene % política(s). No se modifica.', n;
    END IF;
END $$;

-- Vinculación automática del creador de un dispositivo: sin esto el usuario da
-- de alta un equipo y la propia política SELECT se lo oculta acto seguido,
-- porque todavía no existe su fila en device_members.
CREATE OR REPLACE FUNCTION public.link_device_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;   -- alta desde el rol de servicio: no hay usuario que vincular
    END IF;

    INSERT INTO public.device_members (device_id, user_id, role, is_authorized)
    VALUES (NEW.id, auth.uid(), 'owner', TRUE)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_link_device_creator ON public.devices;
CREATE TRIGGER trg_link_device_creator
    AFTER INSERT ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.link_device_creator();
