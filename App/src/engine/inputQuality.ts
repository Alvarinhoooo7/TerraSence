import type { EvidenceDatum, LocalInputQuality, LocalVariable, SoilMeasurement } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';

/** Rangos de integridad del contrato BLE, no umbrales agronómicos ni exactitud garantizada. */
export const LOCAL_VARIABLES: Record<LocalVariable, { unit: string; min: number; max: number }> = {
  vwc: { unit: '%', min: 0, max: 100 },
  temp: { unit: '°C', min: -40, max: 80 },
  ec: { unit: 'µS/cm', min: 0, max: 20000 },
  ph: { unit: 'pH', min: 0, max: 14 },
  nitrogen: { unit: 'mg/kg', min: 0, max: 1999 },
  phosphorus: { unit: 'mg/kg', min: 0, max: 1999 },
  potassium: { unit: 'mg/kg', min: 0, max: 1999 },
  airTemp: { unit: '°C', min: -40, max: 85 },
  airHumidity: { unit: '%', min: 0, max: 100 },
  airPressure: { unit: 'hPa', min: 300, max: 1100 },
};

export function numericEvidence(
  raw: unknown,
  metadata: Omit<EvidenceDatum, 'value' | 'reportedValue' | 'availability'>,
  range?: { min: number; max: number },
): EvidenceDatum {
  const reportedValue = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  const reason = raw == null ? 'missing_value'
    : typeof raw !== 'number' ? 'invalid_type'
    : !Number.isFinite(raw) ? 'non_finite'
    : range && (raw < range.min || raw > range.max) ? 'out_of_range' : null;
  return {
    ...metadata,
    reportedValue,
    value: reason ? null : reportedValue,
    availability: raw == null ? 'missing' : reason ? 'invalid' : 'available',
    limitationCodes: [...metadata.limitationCodes, ...(reason ? [reason] : [])],
  };
}

/** No usa reloj global, red, catálogo de cultivos ni valores de referencia sustitutivos. */
export function buildLocalInputQuality(
  reading: SoilMeasurement, capturedAt: string, simulated = false,
): LocalInputQuality {
  // La captura exige instante con zona explícita; no interpreta fechas locales del teléfono.
  const format = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/;
  const calendar = new Date(`${capturedAt.slice(0, 10)}T12:00:00Z`);
  const validCalendar = Number.isFinite(calendar.getTime()) && calendar.toISOString().slice(0, 10) === capturedAt.slice(0, 10);
  const parsed = format.test(capturedAt) && validCalendar ? Date.parse(capturedAt) : NaN;
  const instant = Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  const observations = {} as Record<LocalVariable, EvidenceDatum>;
  const availabilityCounts: LocalInputQuality['availabilityCounts'] = { available: 0, missing: 0, invalid: 0 };
  for (const key of Object.keys(LOCAL_VARIABLES) as LocalVariable[]) {
    const ambient = key === 'airTemp' || key === 'airHumidity' || key === 'airPressure';
    const nutrient = key === 'nitrogen' || key === 'phosphorus' || key === 'potassium';
    const methodRequired = key === 'ec' || key === 'ph' || key === 'vwc';
    const datum = numericEvidence(reading[key], {
      unit: LOCAL_VARIABLES[key].unit, reportedUnit: LOCAL_VARIABLES[key].unit, source: ambient ? 'bme280' : 'soil_probe',
      validFrom: instant, validTo: instant, timezone: 'UTC', temporalKind: 'instant',
      methodId: null, measurementQuality: 'uncharacterized',
      interpretation: nutrient ? 'unvalidated' : methodRequired ? 'method_required' : 'physical_only',
      limitationCodes: [
        'calibration_unverified', 'point_reading_only',
        ...(ambient ? ['exposure_and_stability_unverified'] : []),
        ...(nutrient ? ['chemical_validation_missing'] : []),
        ...(key === 'ec' ? ['ec_method_unknown'] : []),
        ...(key === 'ph' ? ['ph_method_unknown'] : []),
        ...(key === 'vwc' ? ['soil_context_unknown'] : []),
        ...(instant ? [] : ['invalid_capture_time']),
        ...(simulated ? ['simulated_reading'] : []),
      ],
    }, LOCAL_VARIABLES[key]);
    observations[key] = datum;
    availabilityCounts[datum.availability] += 1;
  }
  return { version: 1, capturedAt, simulated, observations, availabilityCounts };
}

/** Texto para el detalle existente: no confunde integridad con validación de campo. */
export function localQualityNote(datum: EvidenceDatum, language: AppLanguage): string {
  const en = language === 'en';
  if (datum.availability === 'invalid') return en
    ? 'Invalid value: it is not shown as an available measurement. Check the device and repeat the reading.'
    : 'Dato inválido: no se muestra como medición disponible. Revisa el equipo y repite la lectura.';
  if (datum.availability === 'missing') return en ? 'The device did not deliver this value.' : 'El equipo no entregó este dato.';
  const codes = datum.limitationCodes;
  const limitation = codes.includes('ec_method_unknown')
    ? (en ? 'Unknown conductivity method; equivalence with laboratory extracts is not established.' : 'Método de conductividad desconocido; no se acredita equivalencia con extractos de laboratorio.')
    : codes.includes('ph_method_unknown')
      ? (en ? 'Unknown pH method and calibration; comparisons with reference ranges are partial.' : 'Método y calibración de pH desconocidos; las comparaciones con rangos de referencia son parciales.')
      : codes.includes('soil_context_unknown')
        ? (en ? 'Without soil texture and depth, this reading does not determine water available to roots.' : 'Sin textura y profundidad, esta lectura no determina el agua disponible para las raíces.')
        : codes.includes('chemical_validation_missing')
          ? (en ? 'No independent chemical validation. Do not use this value to dose fertilizers.' : 'Sin validación química independiente. No usar este valor para dosificar fertilizantes.')
          : datum.source === 'bme280'
            ? (en ? 'Instantaneous ambient reading; sensor exposure and stability are unverified.' : 'Lectura ambiental instantánea; exposición y estabilidad del sensor sin verificar.')
            : (en ? 'Point reading; calibration and field representativeness are unverified.' : 'Lectura puntual; calibración y representatividad del campo sin verificar.');
  return [
    ...(codes.includes('simulated_reading') ? [en ? 'Demonstration data.' : 'Datos de demostración.'] : []),
    ...(codes.includes('invalid_capture_time') ? [en ? 'Invalid capture time.' : 'Instante de captura inválido.'] : []),
    limitation,
  ].join(' ');
}
