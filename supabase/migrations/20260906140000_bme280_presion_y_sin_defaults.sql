-- El BME280 pasa a alimentar de verdad las columnas de ambiente.
--
-- Hasta ahora `canopy_temp_c` se rellenaba con la temperatura de la API del clima, que es
-- pronóstico de días y no una medición del punto de lectura, y las otras dos viajaban en NULL.
-- Peor: las tres tenían DEFAULT con constantes inventadas (22.4 / 55.0 / 1.25), así que
-- cualquier INSERT que las omitiera guardaba esos valores como si fueran medidos.
BEGIN;

-- Falta la tercera magnitud del BME280: no existía columna donde guardarla.
ALTER TABLE public.soil_measurements
  ADD COLUMN IF NOT EXISTS air_pressure_hpa numeric(5,1);

-- Sin dato medido, NULL. Nunca una constante.
ALTER TABLE public.soil_measurements ALTER COLUMN canopy_temp_c       DROP DEFAULT;
ALTER TABLE public.soil_measurements ALTER COLUMN canopy_humidity_pct DROP DEFAULT;
ALTER TABLE public.soil_measurements ALTER COLUMN vpd_kpa             DROP DEFAULT;

-- Rangos del sensor (hoja de datos BME280). NOT VALID: no se escanean las filas previas,
-- que pueden arrastrar los valores por defecto inventados de antes de esta migración.
ALTER TABLE public.soil_measurements
  ADD CONSTRAINT soil_measurements_air_ranges
  CHECK ((canopy_temp_c       IS NULL OR canopy_temp_c       BETWEEN -40 AND 85) AND
         (canopy_humidity_pct IS NULL OR canopy_humidity_pct BETWEEN 0   AND 100) AND
         (air_pressure_hpa    IS NULL OR air_pressure_hpa    BETWEEN 300 AND 1100) AND
         (vpd_kpa             IS NULL OR vpd_kpa             BETWEEN 0   AND 20)) NOT VALID;

COMMENT ON COLUMN public.soil_measurements.canopy_temp_c IS
  'Temperatura del aire medida por el BME280 del equipo, bytes 16-19 de la trama BLE v1. NUNCA de la API del clima.';
COMMENT ON COLUMN public.soil_measurements.canopy_humidity_pct IS
  'Humedad relativa medida por el BME280, resolución 0,5 %. NULL si el sensor no respondió.';
COMMENT ON COLUMN public.soil_measurements.air_pressure_hpa IS
  'Presión atmosférica medida por el BME280, resolución 1 hPa. NULL si el sensor no respondió.';
COMMENT ON COLUMN public.soil_measurements.vpd_kpa IS
  'Déficit de presión de vapor, derivado de canopy_temp_c y canopy_humidity_pct (Tetens). NULL si falta cualquiera de los dos.';

COMMIT;
