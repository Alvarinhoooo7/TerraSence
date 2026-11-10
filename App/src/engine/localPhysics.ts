// src/engine/localPhysics.ts
//
// Derivados físicos de una captura local (MOTOR_AGRONOMICO.md §6.1): déficit de presión de
// vapor, punto de rocío aproximado y diferencia suelo–aire. Son indicadores continuos de la
// captura, no umbrales de cultivo: ninguna función de este archivo clasifica ni recomienda.
// Se calculan con valores sin redondear; se redondea al presentar.

import type { LocalInputQuality, LocalVariable, SoilMeasurement } from '../types/agronomy';

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

// --- Metrología de la sonda ComWinTop CWT-Soil-NPKPHCTH-S y psicrometría barométrica ---------

/**
 * Especificación metrológica e instrumental del sensor de suelo 7 en 1
 * ComWinTop CWT-Soil-NPKPHCTH-S (5 pines, salida RS-485 Modbus RTU, manual V1.0).
 */
export const CWT_SOIL_NPKPHCTH_S_SPEC = {
  model: 'ComWinTop CWT-Soil-NPKPHCTH-S',
  manualTitle: 'Soil sensor (5PIN Probe, RS485 output type) manual, V1.0',
  bus: {
    protocol: 'Modbus RTU (RS-485)',
    address: 1,
    functionCode: 3,
    startRegister: 0x0000,
    registerCount: 7,
    baudRates: [4800, 9600] as const,
  },
  supplyVoltageV: { min: 4.5, max: 30 },
  responseTimeS: {
    phMax: 10,
    temperatureMax: 15,
    firmwareSettleMs: 1000,
    firmwareBurstSamples: 10,
    firmwareTrimmedMeanCentralSamples: 6,
    bme280BurstSamples: 10,
  },
  channels: {
    vwc: {
      register: 0x0000,
      scale: 0.1,
      unit: '%' as const,
      range: { min: 0, max: 100 },
      resolution: 0.1,
      uncertainty: [
        { upTo: 50, absError: 2.0 },
        { upTo: 100, absError: 3.0 },
      ] as const,
      principle: 'Permitividad dieléctrica aparente (FDR)',
    },
    temp: {
      register: 0x0001,
      scale: 0.1,
      signed: true,
      unit: '°C' as const,
      range: { min: -40, max: 80 },
      resolution: 0.1,
      absError: 0.5,
      principle: 'Termistor NTC en encapsulado epóxico',
    },
    ec: {
      register: 0x0002,
      scale: 1,
      unit: 'µS/cm' as const,
      range: { min: 0, max: 20000 },
      resolution: 1,
      thermalCompensationC: { min: 0, max: 50 },
      uncertaintyPct: [
        { upTo: 10000, relErrorPct: 3 },
        { upTo: 20000, relErrorPct: 5 },
      ] as const,
      principle: 'Conductancia aparente a granel entre vástagos (compensada 0–50 °C)',
    },
    ph: {
      register: 0x0003,
      scale: 0.1,
      unit: 'pH' as const,
      contractRange: { min: 0, max: 14 },
      electrodeNominalRange: { min: 3, max: 9 },
      resolution: 0.1,
      absError: 0.3,
      minVwcForIonicBridgePct: 5,
      principle: 'Potenciometría galvánica entre vástagos metálicos (requiere puente electrolítico húmedo)',
    },
    npk: {
      registers: [0x0004, 0x0005, 0x0006] as const,
      scale: 1,
      unit: 'mg/kg' as const,
      range: { min: 0, max: 1999 },
      resolution: 1,
      principle: 'Estimación indirecta por impedancia/conductividad (no selectiva a iones; orientativa)',
    },
  },
} as const;

/**
 * Cota de exactitud declarada por el manual para cada canal de la sonda, en la unidad del canal.
 *
 * Es **exactitud**, no repetibilidad: incluye el error de calibración del transductor, que es
 * sistemático y por lo tanto se cancela casi por completo al restar dos lecturas tomadas con la
 * misma sonda. Usarla como umbral para decidir si una variación entre dos capturas es real resulta
 * deliberadamente conservador —descarta como ruido cambios que la sonda probablemente sí resuelve—,
 * y es la única cota con fuente mientras no se mida la dispersión intrarráfaga en hardware
 * (`Firmware/TASK.md`, F1). La ráfaga de diez muestras con media recortada del firmware reduce el
 * componente aleatorio, así que la repetibilidad real es mejor que esta cota, nunca peor.
 *
 * Vive en un solo lugar: la ficha de cada parámetro y la comparación de lecturas sucesivas en el
 * mismo sitio leen estas mismas funciones, para que no puedan declarar cifras distintas.
 */
export const PROBE_ACCURACY_BAND_KIND = 'declared_accuracy_not_repeatability' as const;

/** Exactitud de la humedad volumétrica: ±2,0 % hasta 50 % y ±3,0 % sobre 50 %. */
export function vwcAccuracyBandPct(vwc: number): number {
  return vwc <= 50 ? 2.0 : 3.0;
}

/** Exactitud de la temperatura de suelo: ±0,5 °C en todo el rango. */
export function soilTempAccuracyBandC(): number {
  return CWT_SOIL_NPKPHCTH_S_SPEC.channels.temp.absError;
}

/** Exactitud del pH: ±0,3 pH en todo el rango. */
export function phAccuracyBand(): number {
  return CWT_SOIL_NPKPHCTH_S_SPEC.channels.ph.absError;
}

/**
 * Exactitud de la CE a granel: ±3 % de la lectura hasta 10.000 µS/cm y ±5 % sobre ese valor, con
 * piso en la resolución de 1 µS/cm del canal.
 *
 * El manual declara el error como porcentaje de la lectura, de modo que cerca de cero la cota se
 * vuelve muy pequeña: a 300 µS/cm son ±9 µS/cm. Esa es la cifra con fuente y es la que se usa; no
 * se le agrega un piso mayor inventado. La limitación queda declarada: en suelos de baja salinidad
 * una cota porcentual subestima la dispersión real del transductor, y medir la dispersión
 * intrarráfaga es la tarea pendiente que permitirá fijarla con evidencia propia.
 */
export function ecAccuracyBandUsCm(ec: number): number {
  const relative = ec * (ecAccuracyRelativePct(ec) / 100);
  return Math.max(CWT_SOIL_NPKPHCTH_S_SPEC.channels.ec.resolution, Math.round(relative));
}

/** Error relativo declarado de la CE en porcentaje de la lectura: 3 % hasta 10.000 µS/cm, 5 % sobre ese valor. */
export function ecAccuracyRelativePct(ec: number): number {
  const tramo = CWT_SOIL_NPKPHCTH_S_SPEC.channels.ec.uncertaintyPct.find(t => ec <= t.upTo);
  return tramo ? tramo.relErrorPct : CWT_SOIL_NPKPHCTH_S_SPEC.channels.ec.uncertaintyPct[1].relErrorPct;
}

/** Exactitud absoluta de la presión barométrica del BME280: ±1,0 hPa. */
export function airPressureAccuracyBandHpa(): number {
  return 1.0;
}

export type ProbeMetrologicalFlag =
  | 'ph_outside_electrode_nominal_range'
  | 'low_moisture_electrolyte_contact'
  | 'ec_outside_thermal_compensation_window';

export interface ProbeMetrologicalContext {
  /** Incertidumbre absoluta de la humedad volumétrica (±2,0 % hasta 50 %; ±3,0 % sobre 50 %). */
  vwcUncertaintyPct: number | null;
  /** Incertidumbre absoluta de la temperatura de suelo (±0,5 °C). */
  soilTempUncertaintyC: number | null;
  /** Incertidumbre absoluta de la CE a granel (±3 % hasta 10.000 µS/cm; ±5 % sobre 10.000 µS/cm). */
  ecUncertaintyUsCm: number | null;
  /** Indica si la temperatura de suelo está dentro del rango de compensación térmica de la CE (0–50 °C). */
  ecThermalCompensationGuaranteed: boolean;
  /** Incertidumbre absoluta del pH (±0,3 pH). */
  phUncertainty: number | null;
  /** Indica si el pH está dentro del rango nominal del electrodo galvánico (3,0–9,0 pH). */
  phWithinElectrodeNominalRange: boolean;
  /** Indica si la humedad volumétrica (≥ 5 %) asegura puente electrolítico para pH y CE a granel. */
  electrolyteContactAdequate: boolean;
  /** Constante psicrométrica local (kPa/°C, FAO-56 ec. 8) calculada desde la presión barométrica del BME280. */
  psychrometricConstantKpaPerC: number | null;
  /** Altitud barométrica aproximada (m s. n. m., atmósfera estándar OACI / FAO-56 ec. 7 inversa). */
  barometricAltitudeM: number | null;
  /** Advertencias metrológicas activas según el estado físico de la captura. */
  flags: ProbeMetrologicalFlag[];
}

/**
 * Constante psicrométrica γ en kPa/°C (FAO-56 cap. 3, ec. 8: γ = 0,000665 × P, con P en kPa).
 * Aprovecha la presión barométrica medida por el BME280 (300–1100 hPa).
 */
export function psychrometricConstantKpaPerC(airPressureHpa: number | null): number | null {
  if (airPressureHpa === null || !Number.isFinite(airPressureHpa) || airPressureHpa < 300 || airPressureHpa > 1100) {
    return null;
  }
  return 0.000665 * (airPressureHpa / 10);
}

/**
 * Altitud barométrica aproximada en metros sobre el nivel medio del mar (fórmula barométrica
 * internacional OACI / inversa de FAO-56 ec. 7 con P0 = 1013,25 hPa).
 */
export function barometricAltitudeMeters(airPressureHpa: number | null, seaLevelPressureHpa = 1013.25): number | null {
  if (
    airPressureHpa === null ||
    !Number.isFinite(airPressureHpa) ||
    airPressureHpa < 300 ||
    airPressureHpa > 1100 ||
    !Number.isFinite(seaLevelPressureHpa) ||
    seaLevelPressureHpa <= 0
  ) {
    return null;
  }
  return 44330 * (1 - Math.pow(airPressureHpa / seaLevelPressureHpa, 0.1903));
}

/**
 * Evalúa el contexto metrológico de una lectura de la sonda CWT-Soil-NPKPHCTH-S y del BME280,
 * entregando bandas de incertidumbre nominales, psicrometría barométrica y banderas físicas
 * (falta de puente electrolítico bajo 5 % VWC, pH fuera del rango nominal 3–9 del electrodo
 * o temperatura fuera de la ventana 0–50 °C de compensación térmica de la CE).
 */
export function assessProbeMetrologicalContext(
  reading: Pick<SoilMeasurement, 'vwc' | 'temp' | 'ec' | 'ph' | 'airPressure'>,
): ProbeMetrologicalContext {
  const validVwc = Number.isFinite(reading.vwc) && reading.vwc >= 0 && reading.vwc <= 100;
  const validTemp = Number.isFinite(reading.temp) && reading.temp >= -40 && reading.temp <= 80;
  const validEc = Number.isFinite(reading.ec) && reading.ec >= 0 && reading.ec <= 20000;
  const validPh = Number.isFinite(reading.ph) && reading.ph >= 0 && reading.ph <= 14;

  const vwcUncertaintyPct = validVwc ? vwcAccuracyBandPct(reading.vwc) : null;
  const soilTempUncertaintyC = validTemp ? soilTempAccuracyBandC() : null;
  const ecUncertaintyUsCm = validEc ? ecAccuracyBandUsCm(reading.ec) : null;
  const ecThermalCompensationGuaranteed = validTemp && reading.temp >= 0 && reading.temp <= 50;
  const phUncertainty = validPh ? phAccuracyBand() : null;
  const phWithinElectrodeNominalRange = validPh && reading.ph >= 3.0 && reading.ph <= 9.0;
  const electrolyteContactAdequate = validVwc && reading.vwc >= CWT_SOIL_NPKPHCTH_S_SPEC.channels.ph.minVwcForIonicBridgePct;

  const flags: ProbeMetrologicalFlag[] = [];
  if (validPh && !phWithinElectrodeNominalRange) {
    flags.push('ph_outside_electrode_nominal_range');
  }
  if (validVwc && !electrolyteContactAdequate) {
    flags.push('low_moisture_electrolyte_contact');
  }
  if (validTemp && !ecThermalCompensationGuaranteed) {
    flags.push('ec_outside_thermal_compensation_window');
  }

  return {
    vwcUncertaintyPct,
    soilTempUncertaintyC,
    ecUncertaintyUsCm,
    ecThermalCompensationGuaranteed,
    phUncertainty,
    phWithinElectrodeNominalRange,
    electrolyteContactAdequate,
    psychrometricConstantKpaPerC: psychrometricConstantKpaPerC(reading.airPressure),
    barometricAltitudeM: barometricAltitudeMeters(reading.airPressure),
    flags,
  };
}

