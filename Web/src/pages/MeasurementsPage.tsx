// src/pages/MeasurementsPage.tsx — últimas mediciones de toda la flota.
//
// Sustituye a la antigua `/measurements`, que leía `soil_measurements` con el
// cliente del navegador. Esa tabla está acotada por `ts_measurements_select` a
// las mediciones propias o de equipos donde la sesión es miembro: para una
// cuenta de soporte, siempre cero filas. Se alimenta de
// `admin_list_recent_measurements()`, con perímetro `is_support_staff()`.

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, RefreshCw, Search, Sprout } from 'lucide-react';
import { listRecentMeasurements } from '../../backend/adminApi';
import type { FleetMeasurement } from '../../backend/types';
import { STAGE_LABEL } from '../types';
import type { PhenologicalStage, Verdict } from '../types';
import { verdictMeta } from '../utils/verdict';
import { absoluteTime, digitsOnly, num, relativeTime } from '../utils/format';
import { downloadCsv, fileStamp } from '../utils/csv';
import { PageHeader } from '../ui/PageHeader';
import { Panel, PanelHeader, PanelNote } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Badge, StatTile, TableScroll } from '../ui/Data';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/Feedback';
import { MeasurementGrid } from '../components/MeasurementGrid';

const stageLabel = (stage: string): string =>
  STAGE_LABEL[stage as PhenologicalStage] ?? stage;

export function MeasurementsPage() {
  const [rows, setRows] = useState<FleetMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [verdict, setVerdict] = useState<Verdict | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listRecentMeasurements(300));
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
    for (const r of rows) {
      if (r.verdict in c) c[r.verdict] += 1;
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const code = digitsOnly(query);
    return rows.filter((r) => {
      if (verdict !== 'ALL' && r.verdict !== verdict) return false;
      if (!text) return true;
      return (
        r.field_name.toLowerCase().includes(text) ||
        r.crop_id.toLowerCase().includes(text) ||
        r.device_label.toLowerCase().includes(text) ||
        r.verdict_title.toLowerCase().includes(text) ||
        (code.length >= 3 && r.device_code.includes(code))
      );
    });
  }, [rows, query, verdict]);

  const exportCsv = () => {
    downloadCsv(
      `terrasense-mediciones-flota-${fileStamp()}.csv`,
      [
        'Fecha', 'Equipo', 'Codigo', 'Campo', 'Cultivo', 'Etapa', 'Veredicto', 'Titulo',
        'Humedad (%)', 'Temp suelo (C)', 'CE (uS/cm)', 'pH',
        'N sin validar (mg/kg)', 'P sin validar (mg/kg)', 'K sin validar (mg/kg)',
        'Temp ambiente (C)', 'HR ambiente (%)', 'Presion (hPa)', 'Bateria en captura (%)',
        'Latitud', 'Longitud',
      ],
      visible.map((r) => [
        r.measured_at, r.device_label, r.device_code, r.field_name, r.crop_id,
        stageLabel(r.phenological_stage), r.verdict, r.verdict_title,
        r.vwc_percent, r.soil_temp_c, r.ec_us_cm, r.ph,
        r.nitrogen, r.phosphorus, r.potassium,
        r.canopy_temp_c ?? '', r.canopy_humidity_pct ?? '', r.air_pressure_hpa ?? '',
        r.battery_percent ?? '', r.latitude ?? '', r.longitude ?? '',
      ]),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Mediciones"
        icon={Sprout}
        description="Las últimas 300 lecturas de toda la flota, para verificar que los sensores responden en terreno."
        actions={
          <>
            <Button icon={Download} size="sm" onClick={exportCsv} disabled={visible.length === 0}>
              CSV
            </Button>
            <Button icon={RefreshCw} size="sm" onClick={() => void load()} busy={loading}>
              Actualizar
            </Button>
          </>
        }
      />

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Lecturas cargadas" value={rows.length} />
            {(['GREEN', 'AMBER', 'RED'] as Verdict[]).map((v) => {
              const meta = verdictMeta(v);
              return (
                <StatTile
                  key={v}
                  label={meta.label}
                  value={counts[v]}
                  tone={v === 'GREEN' ? 'green' : v === 'AMBER' ? 'amber' : 'red'}
                />
              );
            })}
          </div>

          <Panel>
            <PanelHeader
              icon={Sprout}
              title={`Historial (${visible.length})`}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    role="group"
                    aria-label="Filtrar por veredicto"
                    className="flex gap-1.5"
                  >
                    {(['ALL', 'GREEN', 'AMBER', 'RED'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVerdict(v)}
                        aria-pressed={verdict === v}
                        className={`rounded-sm border px-2 py-1 text-xs font-medium transition-colors ${
                          verdict === v
                            ? 'border-terra-primary/40 bg-terra-primary-soft text-terra-primary-ink'
                            : 'border-terra-border text-terra-muted hover:bg-terra-raised hover:text-terra-text'
                        }`}
                      >
                        {v === 'ALL' ? 'Todos' : verdictMeta(v).label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-terra-faint"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Campo, cultivo o equipo"
                      aria-label="Filtrar las mediciones"
                      className="h-8 w-52 rounded-md border border-terra-border bg-terra-surface pr-3 pl-8
                        text-sm text-terra-text placeholder:text-terra-faint focus:border-terra-primary"
                    />
                  </div>
                </div>
              }
            />

            {loading ? (
              <TableSkeleton label="Cargando mediciones" rows={8} />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Sprout}
                title={rows.length === 0 ? 'Todavía no hay mediciones' : 'Ninguna lectura coincide'}
              >
                {rows.length === 0
                  ? 'Aparecen aquí en cuanto un equipo sincroniza su primera captura desde la app.'
                  : 'Cambia el veredicto seleccionado o borra el texto de búsqueda.'}
              </EmptyState>
            ) : (
              <TableScroll label="Historial de mediciones de la flota" maxHeight="36rem">
                <table className="data-table w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-2.5">Veredicto</th>
                      <th className="px-3 py-2.5">Equipo</th>
                      <th className="px-3 py-2.5">Campo / Etapa</th>
                      <th className="px-3 py-2.5 text-right">pH</th>
                      <th className="px-3 py-2.5 text-right">CE</th>
                      <th className="px-3 py-2.5 text-right">Humedad</th>
                      <th className="px-3 py-2.5 text-right">N·P·K*</th>
                      <th className="px-3 py-2.5 text-right">Fecha</th>
                      <th className="px-3 py-2.5">
                        <span className="sr-only">Detalle</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terra-border">
                    {visible.map((r) => {
                      const meta = verdictMeta(r.verdict);
                      const open = expanded === r.id;
                      return (
                        <Fragment key={r.id}>
                          <tr>
                            <td className="px-5 py-2.5">
                              <Badge tone={r.verdict === 'GREEN' ? 'green' : r.verdict === 'AMBER' ? 'amber' : 'red'}>
                                <span aria-hidden="true">{meta.icon}</span> {meta.label}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              <Link
                                to={`/admin/devices/${r.device_id}`}
                                className="text-terra-text hover:text-terra-primary-ink hover:underline"
                              >
                                {r.device_label}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="text-terra-text">{r.field_name}</div>
                              <div className="text-xs text-terra-muted">
                                {stageLabel(r.phenological_stage)} · {r.crop_id}
                              </div>
                            </td>
                            <td className="tabular px-3 py-2.5 text-right">{num(r.ph, 1)}</td>
                            <td className="tabular px-3 py-2.5 text-right">{num(r.ec_us_cm, 0)}</td>
                            <td className="tabular px-3 py-2.5 text-right">{num(r.vwc_percent, 0, '%')}</td>
                            <td className="tabular px-3 py-2.5 text-right text-terra-muted">
                              {r.nitrogen}·{r.phosphorus}·{r.potassium}
                            </td>
                            <td
                              className="px-3 py-2.5 text-right whitespace-nowrap text-terra-muted"
                              title={absoluteTime(r.measured_at)}
                            >
                              {relativeTime(r.measured_at)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-expanded={open}
                                onClick={() => setExpanded(open ? null : r.id)}
                              >
                                {open ? 'Ocultar' : 'Detalle'}
                              </Button>
                            </td>
                          </tr>
                          {open && (
                            <tr>
                              <td colSpan={9} className="bg-terra-raised px-5 py-4">
                                <MeasurementGrid reading={r} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </TableScroll>
            )}

            <PanelNote>
              * N, P y K se derivan de la conductividad eléctrica y no tienen validación química.
              Las coordenadas se exportan como números: la consola no dibuja mapas.
            </PanelNote>
          </Panel>
        </>
      )}
    </div>
  );
}
