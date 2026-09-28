-- =============================================================================
-- ACTUALIZACIONES DE FIRMWARE POR BLE
-- =============================================================================
-- Flujo: el backoffice carga un binario, lo publica y lo envía a un equipo o a
-- todos. Cada envío crea una asignación y un aviso push para el ADMINISTRADOR
-- del equipo. En la app, el administrador elige Actualizar o Cancelar; si
-- cancela, la asignación queda «pendiente» y se le vuelve a ofrecer. La app
-- descarga el binario, lo verifica y lo transfiere a la sonda por BLE
-- (Firmware/PLAN.md), e informa el resultado.
--
-- Estados de una asignación:
--   sent        enviada, el administrador aún no responde
--   postponed   el administrador eligió Cancelar: queda pendiente
--   installing  la app está transfiriendo el binario
--   installed   la sonda arrancó con la versión nueva
--   failed      la transferencia o la verificación falló (con motivo)
--   cancelled   el backoffice la retiró, o la reemplazó un envío más nuevo
--
-- Además corrige push_alerts: join_device_by_invite inserta la alerta de
-- solicitud de acceso con categoría 'device' y severidad 'warning', que la
-- restricción de la tabla no admitía. Cada solicitud de acceso por QR fallaba
-- entera, así que nunca llegaba a existir una solicitud pendiente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- push_alerts: categorías y severidades que el código ya usa
-- ---------------------------------------------------------------------------
ALTER TABLE public.push_alerts DROP CONSTRAINT IF EXISTS push_alerts_category_check;
ALTER TABLE public.push_alerts ADD CONSTRAINT push_alerts_category_check CHECK (category IN (
    'MOISTURE_DROP', 'FROST', 'PH_DRIFT', 'EC_SALINITY', 'SYSTEM',
    'agronomic', 'device', 'weather', 'sync'));
ALTER TABLE public.push_alerts DROP CONSTRAINT IF EXISTS push_alerts_severity_check;
ALTER TABLE public.push_alerts ADD CONSTRAINT push_alerts_severity_check CHECK (severity IN (
    'high', 'medium', 'low', 'warning'));

-- ---------------------------------------------------------------------------
-- Binarios
-- ---------------------------------------------------------------------------
ALTER TABLE public.firmware_releases ADD COLUMN IF NOT EXISTS storage_path TEXT;
COMMENT ON COLUMN public.firmware_releases.storage_path IS
  'Ruta del binario en el bucket privado «firmware». La app lo descarga sólo mientras tenga una actualización activa de esa versión.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('firmware', 'firmware', FALSE, 4194304, ARRAY['application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Asignaciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_firmware_updates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id   UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    release_id  UUID NOT NULL REFERENCES public.firmware_releases(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'sent'
                CHECK (status IN ('sent', 'postponed', 'installing', 'installed', 'failed', 'cancelled')),
    error       TEXT CHECK (error IS NULL OR length(error) <= 300),
    sent_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Una sola asignación activa por equipo.
CREATE UNIQUE INDEX IF NOT EXISTS device_firmware_updates_one_active
    ON public.device_firmware_updates (device_id)
    WHERE status IN ('sent', 'postponed', 'installing');
CREATE INDEX IF NOT EXISTS device_firmware_updates_release ON public.device_firmware_updates (release_id);

-- Sin políticas: sólo se lee y escribe mediante las funciones de abajo.
ALTER TABLE public.device_firmware_updates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.device_firmware_updates FROM anon, authenticated;

-- Descarga: soporte siempre; el administrador de un equipo sólo el binario
-- de su actualización activa.
DROP POLICY IF EXISTS firmware_support_all ON storage.objects;
CREATE POLICY firmware_support_all ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'firmware' AND public.is_support_staff())
    WITH CHECK (bucket_id = 'firmware' AND public.is_support_staff());

DROP POLICY IF EXISTS firmware_admin_download ON storage.objects;
CREATE POLICY firmware_admin_download ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'firmware'
        AND EXISTS (
            SELECT 1
              FROM public.device_firmware_updates u
              JOIN public.firmware_releases r ON r.id = u.release_id
              JOIN public.device_members dm ON dm.device_id = u.device_id
             WHERE r.storage_path = storage.objects.name
               AND u.status IN ('sent', 'postponed', 'installing')
               AND dm.user_id = auth.uid()
               AND dm.role = 'admin'
               AND dm.is_authorized IS TRUE
        )
    );

-- ---------------------------------------------------------------------------
-- Auxiliares
-- ---------------------------------------------------------------------------
-- ¿Necesita el equipo esta versión? Sin versión informada, sí: no se sabe
-- qué tiene.
CREATE OR REPLACE FUNCTION public.firmware_is_newer(p_release TEXT, p_installed TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT p_installed IS NULL
      OR public.semver_parts(p_installed) IS NULL
      OR public.semver_parts(p_release) > public.semver_parts(p_installed);
$$;

-- Crea la asignación y el aviso push para el administrador. Reemplaza la
-- asignación activa anterior, si la hay. Devuelve el id del aviso, o NULL si
-- el equipo no tiene administrador aprobado.
CREATE OR REPLACE FUNCTION public.assign_firmware_update(p_device_id UUID, p_release public.firmware_releases)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_admin UUID;
    v_code  TEXT;
    v_alert UUID;
BEGIN
    SELECT dm.user_id INTO v_admin FROM public.device_members dm
     WHERE dm.device_id = p_device_id AND dm.role = 'admin' AND dm.is_authorized IS TRUE;
    IF v_admin IS NULL THEN RETURN NULL; END IF;
    SELECT device_code INTO v_code FROM public.devices WHERE id = p_device_id;

    UPDATE public.device_firmware_updates
       SET status = 'cancelled', updated_at = now()
     WHERE device_id = p_device_id AND status IN ('sent', 'postponed', 'installing');

    INSERT INTO public.device_firmware_updates (device_id, release_id, sent_by)
    VALUES (p_device_id, p_release.id, auth.uid());

    INSERT INTO public.push_alerts (device_id, user_id, title, body, category, severity, event_type)
    VALUES (p_device_id, v_admin, 'Actualización disponible',
            format('La versión %s está lista para tu sonda %s. Abre TerraSense para instalarla.',
                   p_release.version, v_code),
            'device', 'medium', 'firmware_update')
    RETURNING id INTO v_alert;
    RETURN v_alert;
END $$;
REVOKE ALL ON FUNCTION public.firmware_is_newer(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_firmware_update(UUID, public.firmware_releases) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backoffice
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_releases()
RETURNS TABLE (
    id            UUID,
    version       TEXT,
    release_notes TEXT,
    sha256        TEXT,
    size_bytes    INTEGER,
    storage_path  TEXT,
    is_mandatory  BOOLEAN,
    is_published  BOOLEAN,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ,
    pending       INTEGER,
    installing    INTEGER,
    installed     INTEGER,
    failed        INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT r.id, r.version, r.release_notes, r.sha256, r.size_bytes, r.storage_path, r.is_mandatory,
           r.is_published, r.published_at, r.created_at,
           count(*) FILTER (WHERE u.status IN ('sent', 'postponed'))::INTEGER,
           count(*) FILTER (WHERE u.status = 'installing')::INTEGER,
           count(*) FILTER (WHERE u.status = 'installed')::INTEGER,
           count(*) FILTER (WHERE u.status = 'failed')::INTEGER
      FROM public.firmware_releases r
      LEFT JOIN public.device_firmware_updates u ON u.release_id = r.id
     GROUP BY r.id
     ORDER BY public.semver_parts(r.version) DESC NULLS LAST, r.created_at DESC;
END $$;

-- La web sube el binario a `releases/<versión>.bin` y calcula el SHA-256 en
-- el navegador; aquí se registra como borrador.
CREATE OR REPLACE FUNCTION public.admin_create_release(
    p_version TEXT, p_notes TEXT, p_sha256 TEXT, p_size_bytes INTEGER, p_storage_path TEXT,
    p_is_mandatory BOOLEAN DEFAULT FALSE
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id UUID;
BEGIN
    PERFORM public.assert_support_staff();
    IF p_version IS NULL OR p_version !~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN
        RAISE EXCEPTION 'La versión debe tener el formato X.Y.Z, por ejemplo 1.2.0.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.firmware_releases WHERE version = p_version) THEN
        RAISE EXCEPTION 'Ya existe la versión %.', p_version USING ERRCODE = '22023';
    END IF;
    IF p_sha256 IS NULL OR p_sha256 !~ '^[a-f0-9]{64}$' OR COALESCE(p_size_bytes, 0) <= 0
       OR p_storage_path IS NULL OR p_storage_path !~ '^releases/[0-9.]+\.bin$' THEN
        RAISE EXCEPTION 'El binario no se registró bien. Vuelve a cargarlo.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.firmware_releases
        (version, hardware_target, sha256, size_bytes, storage_path, release_notes, is_mandatory, created_by)
    VALUES (p_version, 'ESP32-WROOM-32', p_sha256, p_size_bytes, p_storage_path,
            NULLIF(trim(p_notes), ''), COALESCE(p_is_mandatory, FALSE), auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_publish_release(p_release_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    UPDATE public.firmware_releases SET is_published = TRUE, published_at = now()
     WHERE id = p_release_id AND is_published IS NOT TRUE AND storage_path IS NOT NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La versión no existe o ya está publicada.' USING ERRCODE = '22023';
    END IF;
END $$;

-- Sólo borradores: una versión publicada puede estar instalándose.
CREATE OR REPLACE FUNCTION public.admin_delete_release(p_release_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_path TEXT;
BEGIN
    PERFORM public.assert_support_staff();
    DELETE FROM public.firmware_releases WHERE id = p_release_id AND is_published IS NOT TRUE
    RETURNING storage_path INTO v_path;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sólo se puede borrar una versión sin publicar.' USING ERRCODE = '22023';
    END IF;
    RETURN v_path;
END $$;

CREATE OR REPLACE FUNCTION public.admin_send_update(p_device_id UUID, p_release_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_release public.firmware_releases;
    v_version TEXT;
    v_alert   UUID;
BEGIN
    PERFORM public.assert_support_staff();
    SELECT * INTO v_release FROM public.firmware_releases WHERE id = p_release_id AND is_published;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa versión no está publicada.' USING ERRCODE = '22023';
    END IF;
    SELECT firmware_version INTO v_version FROM public.devices WHERE id = p_device_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT public.firmware_is_newer(v_release.version, v_version) THEN
        RAISE EXCEPTION 'El equipo ya tiene la versión % o una más nueva.', v_release.version USING ERRCODE = '22023';
    END IF;
    v_alert := public.assign_firmware_update(p_device_id, v_release);
    IF v_alert IS NULL THEN
        RAISE EXCEPTION 'El equipo no tiene un administrador que pueda aceptar la actualización.' USING ERRCODE = '22023';
    END IF;
    RETURN v_alert;
END $$;

-- A todos los equipos con administrador que tengan una versión anterior (o
-- desconocida) y no estén ya en esta misma versión pendiente o instalándose.
CREATE OR REPLACE FUNCTION public.admin_send_update_all(p_release_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_release public.firmware_releases;
    v_device  RECORD;
    v_alert   UUID;
    v_alerts  UUID[] := '{}';
    v_skipped INTEGER := 0;
BEGIN
    PERFORM public.assert_support_staff();
    SELECT * INTO v_release FROM public.firmware_releases WHERE id = p_release_id AND is_published;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa versión no está publicada.' USING ERRCODE = '22023';
    END IF;

    FOR v_device IN
        SELECT d.id, d.firmware_version FROM public.devices d ORDER BY d.id FOR UPDATE
    LOOP
        IF NOT public.firmware_is_newer(v_release.version, v_device.firmware_version)
           OR EXISTS (SELECT 1 FROM public.device_firmware_updates u
                       WHERE u.device_id = v_device.id AND u.release_id = p_release_id
                         AND u.status IN ('sent', 'postponed', 'installing', 'installed')) THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;
        v_alert := public.assign_firmware_update(v_device.id, v_release);
        IF v_alert IS NULL THEN
            v_skipped := v_skipped + 1;
        ELSE
            v_alerts := v_alerts || v_alert;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('sent', cardinality(v_alerts), 'skipped', v_skipped, 'alert_ids', to_jsonb(v_alerts));
END $$;

CREATE OR REPLACE FUNCTION public.admin_cancel_update(p_device_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    UPDATE public.device_firmware_updates SET status = 'cancelled', updated_at = now()
     WHERE device_id = p_device_id AND status IN ('sent', 'postponed');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay una actualización que se pueda cancelar (si se está instalando, espera a que termine).'
            USING ERRCODE = '22023';
    END IF;
    UPDATE public.push_alerts SET is_read = TRUE
     WHERE device_id = p_device_id AND event_type = 'firmware_update' AND is_read IS NOT TRUE;
END $$;

-- Tarjeta Actualización: la asignación más reciente del equipo.
CREATE OR REPLACE FUNCTION public.admin_device_update(p_device_id UUID)
RETURNS TABLE (
    update_id  UUID,
    version    TEXT,
    status     TEXT,
    error      TEXT,
    sent_at    TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT u.id, r.version, u.status, u.error, u.sent_at, u.updated_at
      FROM public.device_firmware_updates u
      JOIN public.firmware_releases r ON r.id = u.release_id
     WHERE u.device_id = p_device_id
     ORDER BY u.sent_at DESC
     LIMIT 1;
END $$;

-- Seguimiento de una versión en la pantalla Update.
CREATE OR REPLACE FUNCTION public.admin_release_devices(p_release_id UUID)
RETURNS TABLE (
    device_id   UUID,
    device_code TEXT,
    status      TEXT,
    error       TEXT,
    updated_at  TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_support_staff();
    RETURN QUERY
    SELECT u.device_id, d.device_code::TEXT, u.status, u.error, u.updated_at
      FROM public.device_firmware_updates u
      JOIN public.devices d ON d.id = u.device_id
     WHERE u.release_id = p_release_id AND u.status <> 'cancelled'
     ORDER BY CASE u.status WHEN 'failed' THEN 0 WHEN 'installing' THEN 1 WHEN 'postponed' THEN 2
                            WHEN 'sent' THEN 3 ELSE 4 END, u.updated_at DESC;
END $$;

-- ---------------------------------------------------------------------------
-- App: administrador del equipo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_firmware_updates()
RETURNS TABLE (
    update_id     UUID,
    device_id     UUID,
    device_code   TEXT,
    device_name   TEXT,
    status        TEXT,
    version       TEXT,
    release_notes TEXT,
    is_mandatory  BOOLEAN,
    sha256        TEXT,
    size_bytes    INTEGER,
    storage_path  TEXT,
    sent_at       TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT u.id, d.id, d.device_code::TEXT, COALESCE(d.alias, d.name)::TEXT, u.status, r.version,
           r.release_notes, r.is_mandatory, r.sha256, r.size_bytes, r.storage_path, u.sent_at
      FROM public.device_firmware_updates u
      JOIN public.devices d ON d.id = u.device_id
      JOIN public.firmware_releases r ON r.id = u.release_id
      JOIN public.device_members dm ON dm.device_id = u.device_id
     WHERE dm.user_id = auth.uid() AND dm.role = 'admin' AND dm.is_authorized IS TRUE
       AND u.status IN ('sent', 'postponed', 'installing')
     ORDER BY u.sent_at;
$$;

-- p_action: 'postpone' (Cancelar en la ventana), 'start', 'installed', 'failed'.
CREATE OR REPLACE FUNCTION public.firmware_update_progress(p_update_id UUID, p_action TEXT, p_error TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_update public.device_firmware_updates;
    v_next   TEXT;
BEGIN
    SELECT * INTO v_update FROM public.device_firmware_updates WHERE id = p_update_id FOR UPDATE;
    IF NOT FOUND OR NOT public.has_device_admin_access(v_update.device_id) THEN
        RAISE EXCEPTION 'Actualización no encontrada.' USING ERRCODE = '42501';
    END IF;

    v_next := CASE
        WHEN p_action = 'postpone'  AND v_update.status IN ('sent', 'postponed')             THEN 'postponed'
        WHEN p_action = 'start'     AND v_update.status IN ('sent', 'postponed', 'failed')   THEN 'installing'
        WHEN p_action = 'installed' AND v_update.status = 'installing'                       THEN 'installed'
        WHEN p_action = 'failed'    AND v_update.status = 'installing'                       THEN 'failed'
    END;
    IF v_next IS NULL THEN
        RAISE EXCEPTION 'La actualización ya no admite ese paso.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.device_firmware_updates
       SET status = v_next,
           error = CASE WHEN v_next = 'failed' THEN left(COALESCE(p_error, 'Falló sin detalle.'), 300) END,
           updated_at = now()
     WHERE id = p_update_id;
    IF v_next IN ('installed', 'postponed') THEN
        UPDATE public.push_alerts SET is_read = TRUE
         WHERE device_id = v_update.device_id AND event_type = 'firmware_update' AND is_read IS NOT TRUE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    f TEXT;
BEGIN
    FOREACH f IN ARRAY ARRAY[
        'public.admin_list_releases()',
        'public.admin_create_release(TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN)',
        'public.admin_publish_release(UUID)',
        'public.admin_delete_release(UUID)',
        'public.admin_send_update(UUID, UUID)',
        'public.admin_send_update_all(UUID)',
        'public.admin_cancel_update(UUID)',
        'public.admin_device_update(UUID)',
        'public.admin_release_devices(UUID)',
        'public.my_firmware_updates()',
        'public.firmware_update_progress(UUID, TEXT, TEXT)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    END LOOP;
END $$;

-- El reset global también retira las actualizaciones del equipo.
CREATE OR REPLACE FUNCTION public.admin_reset_device(p_device_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_device  public.devices;
    v_members INTEGER;
    v_meas    INTEGER;
BEGIN
    PERFORM public.assert_support_staff();

    SELECT * INTO v_device FROM public.devices WHERE id = p_device_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo no encontrado.' USING ERRCODE = 'P0002';
    END IF;

    SELECT count(*) INTO v_members FROM public.device_members WHERE device_id = p_device_id;
    SELECT count(*) INTO v_meas FROM public.soil_measurements WHERE device_id = p_device_id;

    INSERT INTO public.device_data_resets (user_id, device_id, generation)
    SELECT user_id, device_id, v_device.data_generation + 1 FROM public.device_members WHERE device_id = p_device_id
    ON CONFLICT (user_id, device_id) DO UPDATE SET generation = EXCLUDED.generation;

    DELETE FROM public.device_members          WHERE device_id = p_device_id;
    DELETE FROM public.soil_measurements       WHERE device_id = p_device_id;
    DELETE FROM public.push_alerts             WHERE device_id = p_device_id;
    DELETE FROM public.device_access_invites   WHERE device_id = p_device_id;
    DELETE FROM public.device_firmware_updates WHERE device_id = p_device_id;

    UPDATE public.devices
       SET data_generation = data_generation + 1,
           name = 'Sonda TerraSense',
           alias = NULL,
           pairing_mode_active = FALSE,
           battery_level = NULL,
           first_seen_at = NULL,
           last_seen_at = NULL,
           last_measurement_at = NULL
     WHERE id = p_device_id;
    -- Después del UPDATE: también se va la fila que el trigger acaba de registrar.
    DELETE FROM public.device_status_log WHERE device_id = p_device_id;

    INSERT INTO public.device_member_audit (device_id, actor_user_id, action)
    VALUES (p_device_id, auth.uid(), 'factory_reset');

    RETURN jsonb_build_object('members_removed', v_members, 'measurements_deleted', v_meas);
END $$;
