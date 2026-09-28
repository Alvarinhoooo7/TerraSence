// src/components/device/StatusCard.tsx — datos clave del equipo.
//
// La sonda no tiene internet: «Online» significa que un teléfono habló con ella
// hace menos de 15 minutos, y lo decide el servidor. Offline, la batería se
// muestra como «No disponible»: el último valor conocido ya no describe el
// estado actual.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import type { DeviceStatus } from '../../../backend/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Notice, SkeletonRows } from '../../ui/Feedback';
import { dateTime, formatDeviceCode, relativeTime } from '../../utils/format';
import { ResetDialog } from './ResetDialog';

function Item({
  label,
  children,
  sub,
  className = '',
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 px-5 py-4 ${className}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-[15px] font-medium text-ink">{children}</dd>
      {sub && <dd className="mt-0.5 text-xs text-faint">{sub}</dd>}
    </div>
  );
}

function Battery({ level }: { level: number }) {
  const tone = level < 20 ? 'bg-danger' : level < 40 ? 'bg-warning' : 'bg-primary';
  return (
    <span className="flex items-center gap-2.5">
      <span className="tabular">{level} %</span>
      <span
        className="h-1.5 w-16 overflow-hidden rounded-full bg-sunken"
        role="meter"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Nivel de batería"
      >
        <span className={`block h-full ${tone}`} style={{ width: `${Math.max(3, level)}%` }} />
      </span>
    </span>
  );
}

export function StatusCard({
  status,
  loading,
  error,
  onRefresh,
  onReset,
}: {
  status: DeviceStatus | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onReset: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card
      title="Estado"
      labelledBy="card-estado"
      actions={
        <>
          <Button size="sm" icon={RefreshCw} onClick={onRefresh} busy={loading && status != null}>
            Refrescar
          </Button>
          <Button size="sm" variant="danger" icon={RotateCcw} disabled={!status} onClick={() => setConfirming(true)}>
            Reset
          </Button>
        </>
      }
    >
      {error && (
        <div className="px-5 pt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {!status ? (
        loading && <SkeletonRows rows={2} label="Cargando el estado" />
      ) : (
        <dl className="grid grid-cols-2 divide-line lg:grid-cols-5 lg:divide-x">
          <Item label="ID" className="col-span-2 border-b border-line lg:col-span-1 lg:border-b-0">
            <span className="font-mono text-[14px] tabular">{formatDeviceCode(status.device_code)}</span>
          </Item>
          <Item label="Conexión">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${status.is_online ? 'bg-primary' : 'bg-offline'}`}
              />
              {status.is_online ? 'Online' : 'Offline'}
            </span>
          </Item>
          <Item label="Batería">
            {status.is_online && status.battery_level != null ? (
              <Battery level={status.battery_level} />
            ) : (
              <span className="text-muted">No disponible</span>
            )}
          </Item>
          <Item label="Primera conexión" sub={relativeTime(status.first_seen_at)}>
            {status.first_seen_at ? dateTime(status.first_seen_at) : <span className="text-muted">Sin registro</span>}
          </Item>
          <Item label="Última conexión" sub={relativeTime(status.last_seen_at)}>
            {status.last_seen_at ? dateTime(status.last_seen_at) : <span className="text-muted">Sin registro</span>}
          </Item>
        </dl>
      )}

      {confirming && status && (
        <ResetDialog
          deviceCode={status.device_code}
          onClose={() => setConfirming(false)}
          onReset={async () => {
            await onReset();
            setConfirming(false);
          }}
        />
      )}
    </Card>
  );
}
