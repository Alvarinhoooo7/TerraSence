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
