// src/pages/FleetPage.tsx — inventario completo de sondas.
//
// Sustituye a la antigua `/devices`, que leía la tabla `devices` directamente.
// Esa tabla está acotada por la política `ts_devices_select_member` a los
// equipos donde la sesión es MIEMBRO, y una cuenta de soporte no lo es de
// ninguno: la pantalla salía vacía siempre, y el aviso de batería baja y el
// contraste de firmware no podían activarse nunca. Ahora se alimenta de
// `admin_list_fleet()`, cuyo perímetro es `is_support_staff()`.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BatteryWarning,
  ChevronRight,
  Cpu,
  Download,
  RefreshCw,
  Search,
  UserCheck,
  Wifi,
} from 'lucide-react';
import { listFleet } from '../../backend/adminApi';
import type { FleetDevice } from '../../backend/types';
import { FIRMWARE_STATUS_LABEL } from '../../backend/types';
import { PageHeader } from '../ui/PageHeader';
import { Panel, PanelHeader } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Badge, BatteryBar, DeviceCode, ReportStatus, StatTile, TableScroll } from '../ui/Data';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/Feedback';
import { absoluteTime, digitsOnly, formatVersion, int, reportedRecently } from '../utils/format';
import { downloadCsv, fileStamp } from '../utils/csv';

type Filter = 'todos' | 'sin_reporte' | 'bateria_baja' | 'pendientes' | 'desactualizados';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'sin_reporte', label: 'Sin reporte reciente' },
  { id: 'bateria_baja', label: 'Batería < 20 %' },
  { id: 'pendientes', label: 'Con solicitudes' },
  { id: 'desactualizados', label: 'Firmware atrasado' },
];

const firmwareTone = (status: FleetDevice['firmware_status']) =>
  status === 'desactualizado' ? 'amber' : status === 'al_dia' ? 'green' : 'neutral';

export function FleetPage() {
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDevices(await listFleet());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let online = 0;
    let lowBattery = 0;
    let pending = 0;
    let outdated = 0;
    for (const d of devices) {
      if (reportedRecently(d.last_seen_at)) online += 1;
      if (d.battery_level < 20) lowBattery += 1;
      pending += d.pending_count;
      if (d.firmware_status === 'desactualizado') outdated += 1;
    }
    return { total: devices.length, online, lowBattery, pending, outdated };
  }, [devices]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const code = digitsOnly(query);
    return devices.filter((d) => {
      if (filter === 'sin_reporte' && reportedRecently(d.last_seen_at)) return false;
      if (filter === 'bateria_baja' && d.battery_level >= 20) return false;
      if (filter === 'pendientes' && d.pending_count === 0) return false;
      if (filter === 'desactualizados' && d.firmware_status !== 'desactualizado') return false;
      if (!text) return true;
      return (
        (code.length >= 3 && d.device_code.includes(code)) ||
        d.name.toLowerCase().includes(text) ||
        (d.alias ?? '').toLowerCase().includes(text) ||
        d.hardware_version.toLowerCase().includes(text)
      );
    });
  }, [devices, query, filter]);

  const exportCsv = () => {
    downloadCsv(
      `terrasense-flota-${fileStamp()}.csv`,
      [
        'Codigo', 'Nombre', 'Alias', 'Activo', 'Bateria (%)', 'Firmware', 'Ultima publicada',
        'Estado firmware', 'Hardware', 'Miembros', 'Solicitudes pendientes', 'Mediciones',
        'Ultimo reporte', 'Ultima medicion', 'Alta',
      ],
      visible.map((d) => [
        d.device_code, d.name, d.alias ?? '', d.is_active ? 'si' : 'no', d.battery_level,
        d.firmware_version, d.latest_version ?? '', FIRMWARE_STATUS_LABEL[d.firmware_status],
        d.hardware_version, d.member_count, d.pending_count, d.measurement_count,
        d.last_seen_at ?? '', d.last_measurement_at ?? '', d.created_at ?? '',
      ]),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Flota"
        icon={Cpu}
        description="Todas las sondas registradas, con su estado energético, de firmware y de membresías."
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Sondas" value={stats.total} icon={Cpu} />
            <StatTile
              label="Reporte < 1 h"
              value={stats.online}
              icon={Wifi}
              tone={stats.online > 0 ? 'green' : 'neutral'}
            />
            <StatTile
              label="Batería < 20 %"
              value={stats.lowBattery}
              icon={BatteryWarning}
              tone={stats.lowBattery > 0 ? 'red' : 'neutral'}
            />
            <StatTile
              label="Solicitudes"
              value={stats.pending}
              icon={UserCheck}
              tone={stats.pending > 0 ? 'amber' : 'neutral'}
              hint="Miembros sin aprobar"
            />
            <StatTile
              label="Firmware atrasado"
              value={stats.outdated}
              icon={Download}
              tone={stats.outdated > 0 ? 'amber' : 'neutral'}
            />
          </div>

          <Panel>
            <PanelHeader
              icon={Cpu}
              title={`Inventario (${visible.length}${
                visible.length === devices.length ? '' : ` de ${devices.length}`
              })`}
              actions={
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
                    placeholder="Código, alias o hardware"
                    aria-label="Filtrar el inventario"
                    className="h-8 w-56 rounded-md border border-terra-border bg-terra-surface pr-3 pl-8
                      text-sm text-terra-text placeholder:text-terra-faint focus:border-terra-primary"
                  />
                </div>
              }
            />

            <div
              role="group"
              aria-label="Filtros rápidos"
              className="flex flex-wrap gap-1.5 border-b border-terra-border px-5 py-2.5"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`rounded-sm border px-2 py-1 text-xs font-medium transition-colors ${
                    filter === f.id
                      ? 'border-terra-primary/40 bg-terra-primary-soft text-terra-primary-ink'
                      : 'border-terra-border text-terra-muted hover:bg-terra-raised hover:text-terra-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <TableSkeleton label="Cargando la flota" />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Cpu}
                title={devices.length === 0 ? 'No hay sondas registradas' : 'Ningún equipo coincide'}
              >
                {devices.length === 0
                  ? 'El inventario se llena cuando un equipo se registra y se vincula con su primer dueño.'
                  : 'Prueba con otro filtro o borra el texto de búsqueda.'}
              </EmptyState>
            ) : (
              <TableScroll label="Inventario de sondas" maxHeight="34rem">
                <table className="data-table w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-2.5">Equipo</th>
                      <th className="px-3 py-2.5">Código</th>
                      <th className="px-3 py-2.5">Batería</th>
                      <th className="px-3 py-2.5">Firmware</th>
                      <th className="px-3 py-2.5">Miembros</th>
                      <th className="px-3 py-2.5 text-right">Mediciones</th>
                      <th className="px-3 py-2.5">Último reporte</th>
                      <th className="px-3 py-2.5">
                        <span className="sr-only">Abrir ficha</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terra-border">
                    {visible.map((d) => (
                      <tr key={d.device_id}>
                        <td className="px-5 py-2.5">
                          <Link
                            to={`/admin/devices/${d.device_id}`}
                            className="font-medium text-terra-text hover:text-terra-primary-ink hover:underline"
                          >
                            {d.alias || d.name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-xs text-terra-muted">{d.hardware_version}</span>
                            {!d.is_active && <Badge tone="neutral">Inactivo</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <DeviceCode code={d.device_code} />
                        </td>
                        <td className="px-3 py-2.5">
                          <BatteryBar level={d.battery_level} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="tabular text-sm">{formatVersion(d.firmware_version)}</div>
                          <div className="mt-0.5">
                            <Badge tone={firmwareTone(d.firmware_status)}>
                              {FIRMWARE_STATUS_LABEL[d.firmware_status]}
                              {d.firmware_status === 'desactualizado' && d.latest_version
                                ? ` → ${formatVersion(d.latest_version)}`
                                : ''}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="tabular">{d.member_count}</span>
                          {d.pending_count > 0 && (
                            <Badge tone="amber" className="ml-1.5">
                              {d.pending_count} pendiente{d.pending_count === 1 ? '' : 's'}
                            </Badge>
                          )}
                        </td>
                        <td className="tabular px-3 py-2.5 text-right">
                          {int(d.measurement_count)}
                        </td>
                        <td className="px-3 py-2.5" title={absoluteTime(d.last_seen_at)}>
                          <ReportStatus
                            lastSeenAt={d.last_seen_at}
                            online={reportedRecently(d.last_seen_at)}
                            compact
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link
                            to={`/admin/devices/${d.device_id}`}
                            aria-label={`Abrir la ficha de ${d.alias || d.name}`}
                            className="inline-flex text-terra-muted hover:text-terra-primary-ink"
                          >
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
