// src/components/MeasurementGrid.tsx — el detalle 2×5 de una lectura.
//
// Diez variables: siete del suelo (sonda RS-485) y tres del ambiente (BME280).
// Cada una declara su unidad y distingue «sin dato» de cero, porque un 0 %
// de humedad y un sensor que no respondió son cosas distintas.

import { num } from '../utils/format';

export interface GridReading {
  vwc_percent: number | string | null;
  ec_us_cm: number | string | null;
  soil_temp_c: number | string | null;
  nitrogen: number | string | null;
  phosphorus: number | string | null;
  potassium: number | string | null;
  ph: number | string | null;
  canopy_temp_c?: number | string | null;
  canopy_humidity_pct?: number | string | null;
  air_pressure_hpa?: number | string | null;
  battery_percent?: number | null;
  diagnosis?: unknown;
}

type Metric = {
  label: string;
  value: number | string | null | undefined;
  unit: string;
  decimals?: number;
  origin: 'suelo' | 'ambiente';
  caveat?: boolean;
};

const isPresent = (v: number | string | null | undefined): boolean => {
  if (v == null) return false;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n);
};

/** `diagnosis.localSource` sólo lo escribe el flujo nuevo de captura; un
 * histórico sin esa marca no permite afirmar que el ambiente venga del
 * BME280 del equipo en vez de una API de clima. */
const fromLocalProbe = (diagnosis: unknown): boolean =>
  typeof diagnosis === 'object' &&
  diagnosis !== null &&
  'localSource' in diagnosis &&
  (diagnosis as { localSource?: unknown }).localSource === 'probe-bme280-v1';

export function MeasurementGrid({ reading }: { reading: GridReading }) {
  const metrics: Metric[] = [
    { label: 'Humedad del suelo', value: reading.vwc_percent, unit: '%', origin: 'suelo' },
    { label: 'Conductividad', value: reading.ec_us_cm, unit: 'µS/cm', decimals: 0, origin: 'suelo' },
    { label: 'Temperatura del suelo', value: reading.soil_temp_c, unit: '°C', origin: 'suelo' },
    { label: 'pH', value: reading.ph, unit: '', origin: 'suelo' },
    { label: 'Nitrógeno (N)', value: reading.nitrogen, unit: 'mg/kg', decimals: 0, origin: 'suelo', caveat: true },
    { label: 'Fósforo (P)', value: reading.phosphorus, unit: 'mg/kg', decimals: 0, origin: 'suelo', caveat: true },
    { label: 'Potasio (K)', value: reading.potassium, unit: 'mg/kg', decimals: 0, origin: 'suelo', caveat: true },
    { label: 'Temperatura ambiente', value: reading.canopy_temp_c, unit: '°C', origin: 'ambiente' },
    { label: 'Humedad relativa', value: reading.canopy_humidity_pct, unit: '%', origin: 'ambiente' },
    { label: 'Presión atmosférica', value: reading.air_pressure_hpa, unit: 'hPa', decimals: 0, origin: 'ambiente' },
  ];

  const present = metrics.filter((m) => isPresent(m.value)).length;

  return (
    <section aria-label="Detalle de la medición" className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="min-w-0 rounded-md border border-terra-border bg-terra-surface px-3 py-2"
          >
            <dt className="flex items-center gap-1 truncate text-[11px] text-terra-muted">
              {m.label}
              {m.caveat && (
                <span
                  className="text-verdict-amber"
                  title="Derivado de la conductividad, sin validación química"
                  aria-label="Sin validar"
                >
                  *
                </span>
              )}
            </dt>
            <dd
              className={`tabular mt-0.5 font-semibold ${
                isPresent(m.value) ? 'text-terra-text' : 'text-terra-faint'
              }`}
            >
              {isPresent(m.value) ? num(m.value, m.decimals ?? 1, m.unit) : 'Sin dato'}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-xs leading-relaxed text-terra-muted">
        {present}/10 variables registradas · Batería en la captura:{' '}
        {reading.battery_percent == null ? 'sin dato' : `${reading.battery_percent} %`} · Ambiente:{' '}
        {fromLocalProbe(reading.diagnosis)
          ? 'BME280 del equipo'
          : 'origen no verificado en este registro histórico'}
        .
        <br />
        <span className="text-verdict-amber">*</span> N, P y K se derivan de la conductividad
        eléctrica, no de electrodos ion-selectivos: sirven para verificar que el sensor responde, no
        para calcular dosis de fertilizante.
      </p>
    </section>
  );
}
