// src/components/Dashboard.tsx
//
// Consola de administración central de TerraSense: gestión de flota de equipos,
// telemetría, mapas GIS, firmware OTA y validación metrológica.
//
// Lo que se ve aquí lo acota RLS en el servidor: la consola no aplica filtros
// de seguridad propios, porque un filtro en el cliente no es una defensa.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { GisHeatmap } from './GisHeatmap';
import { FirmwareView } from './FirmwareView';
import type { Device, LabValidationRecord, SoilMeasurement, Verdict } from '../types';
import { STAGE_LABEL } from '../types';
import {
  VERDICT_META,
  concordance,
  formatDeviceCode,
  normalizeDeviceCode,
  relativeTime,
} from '../utils/verdict';

type Tab = 'mediciones' | 'mapa' | 'equipos' | 'firmware' | 'validacion';

export function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>('mediciones');
  const [devices, setDevices] = useState<Device[]>([]);
  const [measurements, setMeasurements] = useState<SoilMeasurement[]>([]);
  const [lab, setLab] = useState<LabValidationRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, m, l] = await Promise.all([
        supabase.from('devices').select('*').order('last_seen_at', { ascending: false, nullsFirst: false }),
        supabase.from('soil_measurements').select('*').order('measured_at', { ascending: false }).limit(500),
        supabase.from('lab_validation_records').select('*').order('sample_date', { ascending: false }),
      ]);
      if (d.error) throw d.error;
      if (m.error) throw m.error;
      if (l.error) throw l.error;
      setDevices((d.data ?? []) as Device[]);
      setMeasurements((m.data ?? []) as SoilMeasurement[]);
      setLab((l.data ?? []) as LabValidationRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Verdict, number> = { GREEN: 0, AMBER: 0, RED: 0 };
    for (const m of measurements) c[m.verdict] += 1;
    return c;
  }, [measurements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const code = normalizeDeviceCode(search);
    if (!q) return measurements;
    const byCode = code.length >= 4
      ? new Set(devices.filter((d) => d.device_code.includes(code)).map((d) => d.id))
      : new Set<string>();
    return measurements.filter(
      (m) =>
        m.field_name?.toLowerCase().includes(q) ||
        m.crop_id?.toLowerCase().includes(q) ||
        m.verdict_title?.toLowerCase().includes(q) ||
        byCode.has(m.device_id),
    );
  }, [measurements, devices, search]);

  return (
    <div className="min-h-full">
      <header className="border-b border-terra-border bg-terra-surface">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-wrap items-center gap-4">
          <span className="text-2xl">🌱</span>
          <h1 className="text-lg font-bold">TerraSense · Consola</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por predio, cultivo o código de equipo…"
            className="flex-1 min-w-[220px] h-10 rounded-lg border border-terra-border bg-terra-bg px-3 text-sm outline-none focus:border-terra-primary"
          />
          <span className="text-sm text-terra-muted">{email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="h-10 px-4 rounded-lg border border-terra-border text-sm hover:border-verdict-red hover:text-verdict-red"
          >
            Salir
          </button>
        </div>

        <nav className="mx-auto max-w-7xl px-6 flex gap-1">
          {(['mediciones', 'mapa', 'equipos', 'firmware', 'validacion'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 h-11 text-sm font-medium border-b-2 -mb-px capitalize ${
                tab === t
                  ? 'border-terra-primary text-terra-primary'
                  : 'border-transparent text-terra-muted hover:text-terra-text'
              }`}
            >
              {t === 'validacion' ? 'Validación de laboratorio' : t === 'mapa' ? 'Mapa GIS' : t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {error && (
          <p className="rounded-lg bg-verdict-red/15 text-verdict-red p-4 mb-4 text-sm">
            {error}
          </p>
        )}
        {loading && <p className="text-terra-muted">Cargando…</p>}

        {!loading && tab === 'mediciones' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat label="Mediciones" value={measurements.length} />
              {(['GREEN', 'AMBER', 'RED'] as Verdict[]).map((v) => (
                <Stat
                  key={v}
                  label={VERDICT_META[v].label}
                  value={counts[v]}
                  icon={VERDICT_META[v].icon}
                  tone={VERDICT_META[v].text}
                />
              ))}
            </div>

            <Table
              head={['Veredicto', 'Predio', 'Etapa', 'pH', 'CE µS/cm', 'VWC %', 'T° °C', 'N-P-K', 'Cuándo']}
              rows={filtered.map((m) => {
                const meta = VERDICT_META[m.verdict];
                return [
                  <span key="v" className={`inline-flex items-center gap-2 ${meta.text}`}>
                    <span className={`w-5 h-5 grid place-items-center rounded-full text-[11px] font-bold text-[#0d1512] ${meta.dot}`}>
                      {meta.icon}
                    </span>
                    {meta.label}
                  </span>,
                  m.field_name,
                  STAGE_LABEL[m.phenological_stage] ?? m.phenological_stage,
                  m.ph?.toFixed(1),
                  Math.round(m.ec_us_cm),
                  m.vwc_percent?.toFixed(0),
                  m.soil_temp_c?.toFixed(1),
                  `${m.nitrogen}-${m.phosphorus}-${m.potassium}`,
                  relativeTime(m.measured_at),
                ];
              })}
              empty="No hay mediciones que coincidan."
            />
          </>
        )}

        {!loading && tab === 'mapa' && <GisHeatmap measurements={filtered} />}

        {!loading && tab === 'equipos' && (
          <Table
            head={['Equipo', 'Código', 'Batería', 'Firmware', 'Hardware', 'Última señal']}
            rows={devices.map((d) => [
              d.alias || d.name,
              <code key="c" className="tabular text-terra-primary">
                {formatDeviceCode(d.device_code)}
              </code>,
              `${d.battery_level}%`,
              d.firmware_version,
              d.hardware_version,
              relativeTime(d.last_seen_at),
            ])}
            empty="No hay equipos visibles para esta cuenta."
          />
        )}

        {!loading && tab === 'firmware' && <FirmwareView devices={devices} />}

        {!loading && tab === 'validacion' && (
          <>
            <p className="text-sm text-terra-muted mb-4 max-w-3xl">
              Corpus de contraste contra laboratorio acreditado. Es la evidencia que sostiene los
              KPI metrológicos del proyecto: sin declarar el método de referencia, la correlación
              no es verificable.
            </p>
            <Table
              head={['Muestra', 'Fecha', 'Laboratorio', 'pH lab / TS', 'CE lab / TS', 'VWC lab / TS', 'Concordancia pH']}
              rows={lab.map((r) => {
                const cPh = concordance(r.lab_ph, r.terrasense_ph);
                return [
                  r.sample_code,
                  new Date(r.sample_date).toLocaleDateString('es-CL'),
                  r.lab_name,
                  `${r.lab_ph?.toFixed(1)} / ${r.terrasense_ph?.toFixed(1)}`,
                  `${Math.round(r.lab_ec)} / ${Math.round(r.terrasense_ec)}`,
                  `${r.lab_vwc?.toFixed(0)} / ${r.terrasense_vwc?.toFixed(0)}`,
                  cPh == null ? '—' : `${cPh.toFixed(1)} %`,
                ];
              })}
              empty="Todavía no hay registros de validación."
            />
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-terra-border bg-terra-surface p-4">
      <div className="text-xs font-semibold tracking-wide text-terra-muted uppercase">
        {icon ? `${icon} ` : ''}
        {label}
      </div>
      <div className={`text-3xl font-bold tabular mt-1 ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: (string | number | React.ReactNode)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-terra-muted py-8 text-center">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-terra-border">
      <table className="w-full text-sm">
        <thead className="bg-terra-surface">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-terra-muted whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-terra-border hover:bg-terra-surface/60">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 whitespace-nowrap tabular">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
