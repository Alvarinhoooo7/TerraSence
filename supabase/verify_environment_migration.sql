-- Verificación repetible y sin escrituras después del despliegue.
DO $$
DECLARE
  definition text := pg_get_functiondef('public.admin_get_device_detail(uuid)'::regprocedure);
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'soil_measurements'
      AND column_name IN ('vwc_percent', 'soil_temp_c', 'ec_us_cm', 'ph', 'nitrogen',
                          'phosphorus', 'potassium', 'canopy_temp_c', 'canopy_humidity_pct',
                          'air_pressure_hpa', 'battery_percent')) <> 11 THEN
    RAISE EXCEPTION 'Faltan parámetros de telemetría';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'soil_measurements'
      AND column_name IN ('canopy_temp_c', 'canopy_humidity_pct', 'air_pressure_hpa', 'battery_percent')
      AND (column_default IS NOT NULL OR is_nullable <> 'YES')) THEN
    RAISE EXCEPTION 'Ambiente y batería deben admitir ausencia sin valores predeterminados';
  END IF;
  IF has_function_privilege('anon', 'public.admin_get_device_detail(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.admin_get_device_detail(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Permisos RPC incorrectos';
  END IF;
  IF position('is_support_staff()' in definition) = 0 OR
     position('m.air_pressure_hpa' in definition) = 0 OR
     position('m.battery_percent' in definition) = 0 OR
     position('m.diagnosis' in definition) = 0 THEN
    RAISE EXCEPTION 'Contrato de soporte incompleto';
  END IF;
END $$;
SELECT 'Diez parámetros, batería, ausencias y permisos verificados' AS result;
