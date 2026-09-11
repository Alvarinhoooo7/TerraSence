interface Reading {
  vwc_percent: number; ec_us_cm: number; soil_temp_c: number;
  nitrogen: number; phosphorus: number; potassium: number; ph: number;
  canopy_temp_c?: number | null; canopy_humidity_pct?: number | null; air_pressure_hpa?: number | null;
  measured_at: string; diagnosis?: unknown; battery_percent?: number | null;
}

export function MeasurementGrid({ reading }: { reading: Reading }) {
  const metrics: [string, number | null | undefined, string][] = [
    ['Humedad del suelo', reading.vwc_percent, '%'],
    ['Conductividad del suelo', reading.ec_us_cm, 'µS/cm'],
    ['Temperatura del suelo', reading.soil_temp_c, '°C'],
    ['Nitrógeno (N) · Sin validar', reading.nitrogen, 'mg/kg'],
    ['Fósforo (P) · Sin validar', reading.phosphorus, 'mg/kg'],
    ['Potasio (K) · Sin validar', reading.potassium, 'mg/kg'],
    ['pH del suelo', reading.ph, ''],
    ['Temperatura ambiente', reading.canopy_temp_c, '°C'],
    ['Humedad relativa ambiente', reading.canopy_humidity_pct, '%'],
    ['Presión atmosférica', reading.air_pressure_hpa, 'hPa'],
  ];
  const verified = typeof reading.diagnosis === 'object' && reading.diagnosis !== null &&
    'localSource' in reading.diagnosis && reading.diagnosis.localSource === 'probe-bme280-v1';
  return <section className="p-4 whitespace-normal min-w-64 max-w-xl" aria-label="Diez variables de la medición">
    <p className="text-sm text-terra-muted mb-3">{new Date(reading.measured_at).toLocaleString()} · {metrics.filter(([, value]) => value != null && Number.isFinite(value)).length}/10 registros · Batería en captura: {reading.battery_percent == null ? 'Sin dato' : `${reading.battery_percent} %`}</p>
    <dl className="grid grid-cols-2 gap-2">
      {metrics.map(([label, value, unit]) => <div key={label} className="rounded-xl border border-terra-border p-3 min-w-0">
        <dt className="text-xs text-terra-muted">{label}</dt>
        <dd className="font-semibold mt-1">{value == null || !Number.isFinite(value) ? 'Sin dato' : `${value.toFixed(1)} ${unit}`}</dd>
      </div>)}
    </dl>
    <p className="text-xs text-terra-muted mt-3">Suelo: sonda · Ambiente: {verified ? 'BME280 local' : 'origen no verificado en este registro histórico'}. N/P/K informativos, sin validación química; no permiten dosificar fertilizantes.</p>
  </section>;
}
