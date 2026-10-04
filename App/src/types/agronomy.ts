/**
 * Definiciones de Tipos TypeScript para TerraSense Mobile
 */

export interface SoilMeasurement {
  vwc: number;          // Humedad volumétrica (%)
  temp: number;         // Temperatura de suelo (°C)
  ec: number;           // Conductividad eléctrica (µS/cm)
  ph: number;           // pH de suelo
  nitrogen: number;     // mg/kg
  phosphorus: number;   // mg/kg
  potassium: number;    // mg/kg
  lux: number;          // Radiación solar incidente (Lux)
  battery: number;      // Porcentaje de batería (%)

  // Ambiente medido por el BME280 del equipo (trama BLE v1, bytes 16-19).
  // null en la trama v0, que no los transporta, y cuando el sensor no responde.
  // No confundir con la API del clima: esa da pronóstico de días para complementar
  // la recomendación, no una medición del punto de lectura. No debe escribirse aquí.
  airTemp: number | null;      // Temperatura del aire (°C), resolución 0,1
  airHumidity: number | null;  // Humedad relativa (%), resolución 0,5
  airPressure: number | null;  // Presión atmosférica (hPa), resolución 1
}

export type CropId = 'maiz' | 'tomate' | 'papa' | 'trigo' | 'lechuga' | 'palto' | 'vid' | 'arandano';

export interface CropDefinition {
  id: CropId;
  name: string;
  emoji: string;
  tempMin: number;
  tempOpt: number;
  phMin: number;
  phMax: number;
  ecMax: number;
  depthCm: string;
  description: string;
}

export type SoilTextureId = 'arenoso' | 'franco' | 'franco_arcilloso' | 'arcilloso';

export interface SoilTexture {
  name: string;
  pmp: number;   // Punto de marchitez permanente (%)
  ur: number;    // Umbral de riego (%)
  cc: number;    // Capacidad de campo (%)
  sat: number;   // Saturación (%)
}

export type Verdict = 'GREEN' | 'AMBER' | 'RED';

export interface AgronomicAlert {
  type: 'danger' | 'warning' | 'info';
  /** Clave de la métrica que la origina (`vwc`, `temp`, `ec`, `ph`) o `npk`. La etapa y la ficha de cada parámetro la buscan por esta clave. */
  param: string;
  title: string;
  action: string;
}

export interface MetricDetail {
  val: number;
  unit: string;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  msg: string;
  /** true cuando la sonda no mide la variable, sino que la deriva de la conductividad. */
  derived?: boolean;
  /** 'LOW' cuando una condición del suelo compromete la validez de la lectura. */
  confidence?: 'HIGH' | 'LOW';
  /** Motivo de la baja confianza, redactado para mostrarse al usuario. */
  confidenceNote?: string;
}

export interface AgronomicEvaluation {
  verdict: Verdict;
  verdictTitle: string;
  verdictSummary: string;
  crop: CropDefinition;
  texture: SoilTexture;
  alerts: AgronomicAlert[];
  metrics: {
    vwc: MetricDetail;
    temp: MetricDetail;
    ec: MetricDetail;
    ph: MetricDetail;
    nitrogen: MetricDetail;
    phosphorus: MetricDetail;
    potassium: MetricDetail;
    lux: MetricDetail;
  };
}

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  verdict: Verdict;
  cropName: string;
  vwc: number;
  temp: number;
  ph: number;
  ec: number;
  action: string;
  timestamp: string;
}
