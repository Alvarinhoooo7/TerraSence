import type { MeasurementSystem } from '../types/preferences';

export interface FormattedValue {
  value: number;
  unit: string;
}

export const formatTemperature = (
  celsius: number,
  system: MeasurementSystem,
): FormattedValue =>
  system === 'imperial'
    ? { value: (celsius * 9) / 5 + 32, unit: '°F' }
    : { value: celsius, unit: '°C' };

export const formatArea = (hectares: number, system: MeasurementSystem): string =>
  system === 'imperial'
    ? `${(hectares * 2.47105381).toFixed(2)} ac`
    : `${hectares.toFixed(2)} ha`;

/**
 * Convierte únicamente magnitudes cuya representación depende del sistema.
 * pH, CE, VWC y nutrientes conservan sus unidades agronómicas estándar.
 */
export const formatEngineMetric = (
  key: string,
  value: number,
  unit: string,
  system: MeasurementSystem,
): FormattedValue => {
  const normalizedKey = key.toLowerCase();
  const normalizedUnit = unit.toLowerCase().replace(/\s/g, '');
  if (
    normalizedKey.includes('temp') ||
    normalizedUnit === '°c' ||
    normalizedUnit === 'c'
  ) {
    return formatTemperature(value, system);
  }
  return { value, unit };
};
