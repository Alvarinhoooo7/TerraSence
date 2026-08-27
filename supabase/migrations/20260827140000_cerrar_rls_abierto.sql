-- =============================================================================
-- CIERRE DE RLS ABIERTO — CORRECCIÓN DE SEGURIDAD CRÍTICA
-- =============================================================================
-- HALLAZGO (auditado en la migración 20260827130000):
--   Las 7 tablas del esquema public tenían UNA sola política, idéntica en todas:
--       FOR ALL TO public USING (true)
--
--   Eso deja la base efectivamente abierta. La clave anónima de Supabase viaja
--   embebida en cada binario de la app y es pública por diseño, de modo que
--   cualquiera podía LEER, MODIFICAR y BORRAR todas las filas de todas las
--   tablas, incluida `profiles` con nombres, correos y teléfonos.
--
--   Contradice directamente la Sección 12.5 del README (Ley 21.719): sin
--   aislamiento entre titulares no hay principio de seguridad ni de
--   confidencialidad que sostener.
--
-- CONTEXTO QUE HACE SEGURO EL CAMBIO:
--   `device_members` estaba vacía y `profiles` no tenía filas: no hay usuarios
--   reales cuyo acceso se pueda romper. Las 2 filas de `devices` y las 4 de
--   `lab_validation_records` son datos de siembra sin propietario.
--
-- REVERSIÓN (si algo dependiera del acceso abierto):
--   DROP POLICY "ts_<tabla>_..." ON public.<tabla>;   -- las creadas aquí
--   CREATE POLICY "abierta" ON public.<tabla> FOR ALL TO public USING (true);
-- =============================================================================

-- Las políticas abiertas, por su nombre exacto tal como fueron auditadas.
DROP POLICY IF EXISTS "Miembros visibles por todos"                  ON public.device_members;
DROP POLICY IF EXISTS "Dispositivos visibles por todos"              ON public.devices;
DROP POLICY IF EXISTS "Lectura pública de registros de laboratorio"  ON public.lab_validation_records;
DROP POLICY IF EXISTS "Lectura pública de cuadrantes"                ON public.predial_quadrants;
DROP POLICY IF EXISTS "Perfiles visibles por todos"                  ON public.profiles;
DROP POLICY IF EXISTS "Alertas visibles por todos"                   ON public.push_alerts;
DROP POLICY IF EXISTS "Mediciones visibles por todos"                ON public.soil_measurements;

-- Garantizar RLS activo en todas ellas.
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_measurements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predial_quadrants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_validation_records ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "ts_profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "ts_profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "ts_profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ── device_members ───────────────────────────────────────────────────────────
CREATE POLICY "ts_device_members_select_own" ON public.device_members
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ts_device_members_insert_own" ON public.device_members
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ts_device_members_update_own" ON public.device_members
    FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ts_device_members_delete_own" ON public.device_members
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── devices ──────────────────────────────────────────────────────────────────
CREATE POLICY "ts_devices_select_member" ON public.devices
    FOR SELECT TO authenticated USING (public.has_device_access(id));
-- El alta queda abierta a autenticados; el trigger link_device_creator convierte
-- al creador en miembro inmediatamente después, y a partir de ahí sólo él lo ve.
CREATE POLICY "ts_devices_insert_auth" ON public.devices
    FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "ts_devices_update_member" ON public.devices
    FOR UPDATE TO authenticated USING (public.has_device_access(id));

-- ── soil_measurements ────────────────────────────────────────────────────────
CREATE POLICY "ts_measurements_select" ON public.soil_measurements
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_device_access(device_id));
CREATE POLICY "ts_measurements_insert" ON public.soil_measurements
    FOR INSERT TO authenticated
    WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "ts_measurements_update" ON public.soil_measurements
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.has_device_access(device_id));
CREATE POLICY "ts_measurements_delete" ON public.soil_measurements
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── predial_quadrants ────────────────────────────────────────────────────────
CREATE POLICY "ts_quadrants_select" ON public.predial_quadrants
    FOR SELECT TO authenticated
    USING (device_id IS NULL OR public.has_device_access(device_id));
CREATE POLICY "ts_quadrants_insert" ON public.predial_quadrants
    FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "ts_quadrants_update" ON public.predial_quadrants
    FOR UPDATE TO authenticated
    USING (device_id IS NULL OR public.has_device_access(device_id));

-- ── push_alerts ──────────────────────────────────────────────────────────────
CREATE POLICY "ts_alerts_select" ON public.push_alerts
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()
           OR (device_id IS NOT NULL AND public.has_device_access(device_id)));
CREATE POLICY "ts_alerts_update" ON public.push_alerts
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── lab_validation_records ───────────────────────────────────────────────────
-- Corpus de validación metrológica: es material de referencia del proyecto, no
-- dato personal. Lectura para cualquier usuario autenticado; la escritura queda
-- reservada al rol de servicio (que no pasa por RLS).
CREATE POLICY "ts_lab_select_auth" ON public.lab_validation_records
    FOR SELECT TO authenticated USING (true);
