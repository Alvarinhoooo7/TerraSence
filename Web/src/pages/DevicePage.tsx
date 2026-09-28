// src/pages/DevicePage.tsx — pantalla de un equipo.
//
// Arriba, la búsqueda para saltar a otro equipo y la vuelta a los resultados.
// Debajo, una tarjeta por tema; cada una carga y refresca por su cuenta.

import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  getDeviceMeasurements,
  getDeviceMembers,
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

export function DevicePage() {
  const { id = '' } = useParams<{ id: string }>();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const status = useCardData(() => getDeviceStatus(id), `status-${id}`);
  const members = useCardData(() => getDeviceMembers(id), `members-${id}`);
  const measurements = useCardData(() => getDeviceMeasurements(id), `measurements-${id}`);

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
          await Promise.all([status.refresh(), members.refresh(), measurements.refresh()]);
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
        loading={measurements.loading}
        error={measurements.error}
        onRefresh={() => void measurements.refresh()}
      />

      <UpdateCard deviceId={id} installedVersion={status.data?.firmware_version ?? null} />
    </div>
  );
}
