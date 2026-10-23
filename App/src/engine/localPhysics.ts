// src/engine/localPhysics.ts
//
// Derivados físicos de una captura local (MOTOR_AGRONOMICO.md §6.1): déficit de presión de
// vapor, punto de rocío aproximado y diferencia suelo–aire. Son indicadores continuos de la
// captura, no umbrales de cultivo: ninguna función de este archivo clasifica ni recomienda.
// Se calculan con valores sin redondear; se redondea al presentar.

import type { LocalInputQuality, LocalVariable } from '../types/agronomy';

export const LOCAL_PHYSICS_VERSION = 'local-physics-v1';

/** FAO-56, capítulo 3: ecuación 11 (presión de saturación) y 19 (presión real desde la humedad relativa). */
const FAO56 = 'FAO-56 cap. 3, ec. 11 y 19';

export type DerivedIndicatorId = 'vpd' | 'dew_point' | 'dew_point_spread' | 'soil_air_difference';

export interface DerivedIndicator {
  id: DerivedIndicatorId;
  /** Sin redondear; `null` si no se puede calcular, con el motivo en `limitationCodes`. */
  value: number | null;
  unit: 'kPa' | '°C';
  availability: 'available' | 'not_computable';
  inputs: LocalVariable[];
  formula: string;
  source: string;
  limitationCodes: string[];
}

export interface LocalDerivedIndicators {
  version: typeof LOCAL_PHYSICS_VERSION;
  indicators: Record<DerivedIndicatorId, DerivedIndicator>;
}

/** Presión de vapor de saturación sobre agua, en kPa (FAO-56 ec. 11). `null` fuera de dominio. */
export function saturationVaporPressureKpa(temperatureC: number): number | null {
  if (!Number.isFinite(temperatureC) || temperatureC <= -237.3) return null;
  return 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
}

const validHumidity = (rh: number) => Number.isFinite(rh) && rh >= 0 && rh <= 100;

/** Déficit de presión de vapor del aire, en kPa. Con HR 0 % es la presión de saturación completa. */
export function vaporPressureDeficitKpa(temperatureC: number, relativeHumidityPct: number): number | null {
  const es = saturationVaporPressureKpa(temperatureC);
  if (es === null || !validHumidity(relativeHumidityPct)) return null;
  return es - es * relativeHumidityPct / 100;
}

/**
 * Punto de rocío aproximado, invirtiendo la misma ecuación. Con HR 0 % el logaritmo no
 * existe: no se calcula ni se fuerza un mínimo artificial de humedad (§6.1, T09).
 */
export function dewPointC(temperatureC: number, relativeHumidityPct: number): number | null {
  const es = saturationVaporPressureKpa(temperatureC);
  if (es === null || !validHumidity(relativeHumidityPct) || relativeHumidityPct === 0) return null;
  // Con saturación el resultado es la propia temperatura; se devuelve sin error de redondeo (T08).
  if (relativeHumidityPct === 100) return temperatureC;
  const x = Math.log(es * relativeHumidityPct / 100 / 0.6108);
  return 237.3 * x / (17.27 - x);
}

/**
 * Derivados de la captura. Cada indicador hereda las limitaciones de sus entradas y sólo se
 * suspende el que depende de un dato ausente o inválido (T04): falta de presión no afecta
 * a ninguno (T10), y el `lux` heredado no participa (T11).
 */
export function deriveLocalPhysics(quality: LocalInputQuality): LocalDerivedIndicators {
  const value = (key: LocalVariable) => quality.observations[key].availability === 'available' ? quality.observations[key].value : null;
  const inherited = (inputs: LocalVariable[]) => [...new Set(inputs.flatMap(key => quality.observations[key].limitationCodes))];
  const missing = (inputs: LocalVariable[]) => inputs.filter(key => value(key) === null).map(key => `input_unavailable:${key}`);
  const airTemp = value('airTemp');
  const airHumidity = value('airHumidity');
  const soilTemp = value('temp');
  // La ecuación es sobre agua: bajo 0 °C no es un cálculo de escarcha sobre hielo (§6.1).
  const belowFreezing = airTemp !== null && airTemp < 0 ? ['water_reference_below_freezing'] : [];

  const indicator = (id: DerivedIndicatorId, unit: DerivedIndicator['unit'], inputs: LocalVariable[], formula: string,
    source: string, computed: number | null, extra: string[]): DerivedIndicator => {
    const absent = missing(inputs);
    const result = absent.length ? null : computed;
    return {
      id, value: result, unit, availability: result === null ? 'not_computable' : 'available', inputs, formula, source,
      limitationCodes: [...inherited(inputs), ...absent, ...extra,
        ...(result === null && !absent.length && !extra.includes('relative_humidity_zero') ? ['outside_formula_domain'] : [])],
    };
  };

  const vpd = airTemp !== null && airHumidity !== null ? vaporPressureDeficitKpa(airTemp, airHumidity) : null;
  const dew = airTemp !== null && airHumidity !== null ? dewPointC(airTemp, airHumidity) : null;
  const humidityZero = airHumidity === 0 ? ['relative_humidity_zero'] : [];
  return {
    version: LOCAL_PHYSICS_VERSION,
    indicators: {
      vpd: indicator('vpd', 'kPa', ['airTemp', 'airHumidity'], 'es(T) − es(T) × HR / 100', FAO56, vpd,
        ['not_leaf_to_air_deficit', ...belowFreezing]),
      dew_point: indicator('dew_point', '°C', ['airTemp', 'airHumidity'], '237,3 × x / (17,27 − x), x = ln(ea / 0,6108)',
        `${FAO56} (inversión)`, dew, ['not_leaf_wetness', ...belowFreezing, ...humidityZero]),
      dew_point_spread: indicator('dew_point_spread', '°C', ['airTemp', 'airHumidity'], 'T − Td', `${FAO56} (inversión)`,
        dew === null || airTemp === null ? null : airTemp - dew, ['not_leaf_wetness', ...belowFreezing, ...humidityZero]),
      soil_air_difference: indicator('soil_air_difference', '°C', ['temp', 'airTemp'], 'Tsuelo − Taire', 'Diferencia observada',
        soilTemp === null || airTemp === null ? null : soilTemp - airTemp, ['single_capture_difference']),
    },
  };
}
