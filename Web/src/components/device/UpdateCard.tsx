// src/components/device/UpdateCard.tsx — enviar una actualización a este equipo.
//
// La versión queda asignada al equipo para consulta. La instalación desde
// la app aún no está disponible y no se despacha una notificación de firmware.

import { useMemo, useState } from 'react';
import { RefreshCw, Send, X } from 'lucide-react';
import {
  cancelDeviceUpdate,
  friendlyError,
  getDeviceUpdate,
  listReleases,
  sendUpdateToDevice,
} from '../../../backend/adminApi';
import { UPDATE_STATUS_LABEL } from '../../../backend/types';
import type { DeviceUpdate, Release, UpdateStatus } from '../../../backend/types';
import { useCardData } from '../../hooks/useCardData';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/Dialog';
import { Badge, Notice, SkeletonRows } from '../../ui/Feedback';
import { dateTime, relativeTime } from '../../utils/format';

const STATUS_TONE: Record<UpdateStatus, 'neutral' | 'green' | 'amber' | 'red'> = {
  sent: 'amber',
  postponed: 'amber',
  installing: 'amber',
  installed: 'green',
  failed: 'red',
  cancelled: 'neutral',
};

export function UpdateStatusBadge({ status }: { status: UpdateStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{UPDATE_STATUS_LABEL[status]}</Badge>;
}

const isActive = (u: DeviceUpdate | null) => !!u && ['sent', 'postponed', 'installing'].includes(u.status);

export function UpdateCard({ deviceId, installedVersion }: { deviceId: string; installedVersion: string | null }) {
  const data = useCardData(
    async () => {
      const [update, releases] = await Promise.all([getDeviceUpdate(deviceId), listReleases()]);
      return { update, releases: releases.filter((r) => r.is_published) };
    },
    `update-${deviceId}`,
  );
  const [selected, setSelected] = useState('');
  const [confirm, setConfirm] = useState<'send' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const update = data.data?.update ?? null;
  const releases: Release[] = useMemo(() => data.data?.releases ?? [], [data.data]);
  const chosen = releases.find((r) => r.id === selected) ?? releases[0] ?? null;

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    setDialogError(null);
    try {
      const text = await task();
      setConfirm(null);
      setFeedback({ tone: 'success', text });
      await data.refresh();
    } catch (e) {
      setDialogError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Actualización"
      labelledBy="card-actualizacion"
      description="Asigna una versión al equipo. La instalación desde la app aún no está disponible."
      actions={
        <Button size="sm" icon={RefreshCw} onClick={() => void data.refresh()} busy={data.loading && data.data != null}>
          Refrescar
        </Button>
      }
    >
      {(feedback || data.error) && (
        <div className="px-5 pt-4">
          <Notice tone={feedback?.tone ?? 'error'} onDismiss={feedback ? () => setFeedback(null) : undefined}>
            {feedback?.text ?? data.error}
          </Notice>
        </div>
      )}

      {!data.data ? (
        data.loading && <SkeletonRows rows={2} label="Cargando la actualización" />
      ) : (
        <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 content-start">
            <div>
              <dt className="text-xs text-muted">Versión instalada</dt>
              <dd className="mt-1 font-mono text-[15px] text-ink tabular">{installedVersion ?? 'Sin informar'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Última asignación</dt>
              <dd className="mt-1 font-mono text-[15px] text-ink tabular">{update?.version ?? '—'}</dd>
            </div>
            {update && (
              <div className="col-span-2">
                <dt className="text-xs text-muted">Estado</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <UpdateStatusBadge status={update.status} />
                  <span className="text-faint">
                    {dateTime(update.updated_at)} · {relativeTime(update.updated_at)}
                  </span>
                </dd>
                {update.error && <dd className="mt-1.5 text-[13px] text-danger">{update.error}</dd>}
              </div>
            )}
          </dl>

          <div className="flex flex-col gap-3 rounded-md border border-line bg-sunken p-4">
            {releases.length === 0 ? (
              <p className="text-sm text-muted">
                No hay versiones publicadas. Cárgalas y publícalas en <strong className="font-medium text-ink">Update</strong>.
              </p>
            ) : (
              <>
                <label htmlFor="version-envio" className="text-[13px] font-medium text-ink">
                  Versión a asignar
                </label>
                <select
                  id="version-envio"
                  value={chosen?.id ?? ''}
                  onChange={(e) => setSelected(e.target.value)}
                  className="h-10 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none"
                >
                  {releases.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.version}
                      {r.is_mandatory ? ' · obligatoria' : ''}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    icon={Send}
                    disabled={!chosen || update?.status === 'installing'}
                    onClick={() => {
                      setDialogError(null);
                      setConfirm('send');
                    }}
                  >
                    Asignar actualización
                  </Button>
                  {isActive(update) && update?.status !== 'installing' && (
                    <Button
                      icon={X}
                      onClick={() => {
                        setDialogError(null);
                        setConfirm('cancel');
                      }}
                    >
                      Cancelar asignación
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirm === 'send' && chosen && (
        <ConfirmDialog
          title={`¿Asignar la versión ${chosen.version}?`}
          confirmLabel="Asignar"
          busy={busy}
          error={dialogError}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            void run(async () => {
              await sendUpdateToDevice(deviceId, chosen.id);
              return `Versión ${chosen.version} asignada al equipo.`;
            })
          }
        >
          <p>
            La versión quedará asociada al equipo. La instalación desde la app está pendiente de habilitación.
            {isActive(update) && ` Reemplaza la asignación anterior (${update?.version}).`}
          </p>
        </ConfirmDialog>
      )}

      {confirm === 'cancel' && update && (
        <ConfirmDialog
          title={`¿Cancelar la asignación de la versión ${update.version}?`}
          confirmLabel="Cancelar asignación"
          cancelLabel="Volver"
          tone="danger"
          busy={busy}
          error={dialogError}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            void run(async () => {
              await cancelDeviceUpdate(deviceId);
              return 'Asignación cancelada.';
            })
          }
        >
          <p>Esta versión dejará de estar asignada al equipo.</p>
        </ConfirmDialog>
      )}
    </Card>
  );
}
