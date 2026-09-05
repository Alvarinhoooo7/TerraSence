-- Cambio local pendiente de aplicar y probar en staging. No inventar coordenadas (0,0).
BEGIN;
ALTER TABLE public.soil_measurements ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.soil_measurements ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE public.soil_measurements ADD CONSTRAINT soil_measurements_coordinates_pair
  CHECK ((latitude IS NULL AND longitude IS NULL) OR
         (latitude IS NOT NULL AND longitude IS NOT NULL AND
          latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)) NOT VALID;
-- PostgREST ON CONFLICT(client_uuid) no puede inferir el índice parcial antiguo.
-- Un índice único normal permite varios NULL y sí soporta el upsert del cliente.
CREATE UNIQUE INDEX IF NOT EXISTS soil_measurements_client_uuid_upsert
  ON public.soil_measurements(client_uuid);
COMMIT;
-- Tras auditar registros históricos, validar la restricción por separado.
