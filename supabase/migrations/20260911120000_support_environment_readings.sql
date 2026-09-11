-- Expone ambiente y diagnóstico conservando la autorización de soporte existente.
BEGIN;

ALTER TABLE public.soil_measurements
  ADD COLUMN battery_percent smallint CHECK (battery_percent BETWEEN 0 AND 100);
COMMENT ON COLUMN public.soil_measurements.battery_percent IS
  'Porcentaje recibido en el byte 14 de la misma trama BLE. NULL en registros anteriores.';

CREATE OR REPLACE FUNCTION public.admin_get_device_detail(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_device   public.devices;
    v_latest   RECORD;
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
     ORDER BY string_to_array(f.version, '.')::int[] DESC
     LIMIT 1;

    RETURN jsonb_build_object(
        'device', to_jsonb(v_device),
        'latest_published_firmware', CASE WHEN v_latest.id IS NULL THEN NULL ELSE
            jsonb_build_object('id', v_latest.id, 'version', v_latest.version,
                                'hardware_target', v_latest.hardware_target,
                                'is_mandatory', v_latest.is_mandatory)
        END,
        'is_up_to_date', (v_latest.id IS NULL OR v_latest.version = v_device.firmware_version),
        'last_location', (
            SELECT jsonb_build_object('latitude', m.latitude, 'longitude', m.longitude,
                                       'field_name', m.field_name, 'measured_at', m.measured_at)
              FROM public.soil_measurements m
             WHERE m.device_id = p_device_id
             ORDER BY m.measured_at DESC LIMIT 1
        ),
        'members', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'user_id', dm.user_id,
                'email', p.email,
                'full_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
                'role', dm.role,
                'is_authorized', dm.is_authorized,
                'created_at', dm.created_at
            ) ORDER BY CASE dm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END), '[]'::jsonb)
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

REVOKE ALL ON FUNCTION public.admin_get_device_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_device_detail(UUID) TO authenticated;

COMMIT;
