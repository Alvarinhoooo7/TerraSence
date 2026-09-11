import type { SoilMeasurement } from '../types';

/** El historial conserva todas las fases; sólo pre-siembra alimenta el mapa. */
export function isPlantingMapReading(
  reading: SoilMeasurement,
): reading is SoilMeasurement & { latitude: number; longitude: number } {
  return reading.phenological_stage === 'pre_siembra' &&
    typeof reading.latitude === 'number' && Number.isFinite(reading.latitude) &&
    typeof reading.longitude === 'number' && Number.isFinite(reading.longitude);
}
