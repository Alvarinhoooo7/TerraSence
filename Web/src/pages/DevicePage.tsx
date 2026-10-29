// src/pages/DevicePage.tsx — pantalla de un equipo.
//
// Arriba, la búsqueda para saltar a otro equipo y la vuelta a los resultados.
// Debajo, una tarjeta por tema; cada una carga y refresca por su cuenta.
//
// Los filtros del historial viven en la URL, no en el estado de la tarjeta: así un
// enlace lleva al mismo equipo con la misma etapa, la misma especie y la misma
// agrupación, y se puede pegar en un ticket de soporte.

import { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  getDeviceMeasurements,
  getDeviceMembers,
  getDeviceSpecies,
  getDeviceStatus,
  resetDevice,
} from '../../backend/adminApi';
import { SearchBar } from '../components/SearchBar';
import { MeasurementsCard } from '../components/device/MeasurementsCard';
import { MembersCard } from '../components/device/MembersCard';
import { StatusCard } from '../components/device/StatusCard';
import { UpdateCard } from '../components/device/UpdateCard';
import { useCardData } from '../hooks/useCardData';
import { Notice } from '../ui/Feedback';
import { formatDeviceCode } from '../utils/format';
import {
  filtersFor,
  historyViewFromParams,
  historyViewParams,
  queryKey,
  type HistoryView,
} from '../utils/measurementHistory';

export function DevicePage() {
  const { id = '' } = useParams<{ id: string }>();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => historyViewFromParams(params), [params]);
  const setView = (next: HistoryView) => setParams(historyViewParams(next), { replace: true });

  const status = useCardData(() => getDeviceStatus(id), `status-${id}`);
  const members = useCardData(() => getDeviceMembers(id), `members-${id}`);
  // Cambiar un filtro vuelve a consultar sin vaciar la tabla; cambiar de equipo, sí la vacía.
  const measurements = useCardData(
    () => getDeviceMeasurements(id, filtersFor(view)),
    `measurements-${id}-${queryKey(view)}`,
    `measurements-${id}`,
  );
  const species = useCardData(() => getDeviceSpecies(id), `species-${id}`);

  const code = status.data?.device_code;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          to={from ?? '/buscar'}
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {from ? 'Resultados' : 'Buscar'}
        </Link>
        <div className="w-full lg:max-w-md">
          <SearchBar />
        </div>
      </div>

      <div>
        <p className="text-[13px] text-muted">Equipo</p>
        <h1 className="mt-0.5 font-mono text-2xl font-medium tracking-tight text-ink tabular">
          {code ? formatDeviceCode(code) : '—'}
        </h1>
      </div>

      {resetNotice && (
        <Notice tone="success" onDismiss={() => setResetNotice(null)}>
          {resetNotice}
        </Notice>
      )}

      <StatusCard
        status={status.data}
        loading={status.loading}
        error={status.error}
        onRefresh={() => void status.refresh()}
        onReset={async () => {
          const result = await resetDevice(id);
          setResetNotice(
            `Equipo reseteado: ${result.members_removed} ${result.members_removed === 1 ? 'usuario desvinculado' : 'usuarios desvinculados'} y ${result.measurements_deleted} ${result.measurements_deleted === 1 ? 'medición borrada' : 'mediciones borradas'}.`,
          );
          await Promise.all([status.refresh(), members.refresh(), measurements.refresh(), species.refresh()]);
        }}
      />

      <MembersCard
        deviceId={id}
        members={members.data}
        loading={members.loading}
        error={members.error}
        onRefresh={members.refresh}
      />

      <MeasurementsCard
        measurements={measurements.data}
        inventory={species.data}
        view={view}
        loading={measurements.loading}
        error={measurements.error ?? species.error}
        onViewChange={setView}
        onRefresh={() => {
          void measurements.refresh();
          void species.refresh();
        }}
      />

      <UpdateCard deviceId={id} installedVersion={status.data?.firmware_version ?? null} />
    </div>
  );
}
