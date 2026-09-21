// src/pages/SupportDeviceDetailPage.tsx — ficha completa de un equipo.
//
// Contenedor: resuelve los datos, orquesta las acciones y reparte el render
// entre los componentes de `components/device/`. Todo lo que se ve viene de
// una sola llamada a `admin_get_device_detail`.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Cpu, RefreshCw } from 'lucide-react';
import {
  getDeviceDetail,
  removeMember,
  setMemberAuthorized,
  setMemberRole,
} from '../../backend/adminApi';
import type { DeviceDetail, DeviceMemberRole, FactoryResetResult } from '../../backend/types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Alert, ErrorState, TableSkeleton } from '../ui/Feedback';
import { DeviceCode } from '../ui/Data';
import { DeviceIdentity } from '../components/device/DeviceIdentity';
import { DeviceCommands } from '../components/device/DeviceCommands';
import { DeviceMembers } from '../components/device/DeviceMembers';
import { DeviceBattery } from '../components/device/DeviceBattery';
import { DeviceMeasurements } from '../components/device/DeviceMeasurements';
import { FactoryResetModal } from '../components/admin/FactoryResetModal';

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

export function SupportDeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busyMember, setBusyMember] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await getDeviceDetail(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Envuelve una acción sobre un miembro: bloquea su fila, informa del
   * resultado y recarga la ficha para que lo mostrado venga del servidor y no
   * de un estado optimista que podría mentir. */
  const memberAction = useCallback(
    async (userId: string, ok: string, run: () => Promise<unknown>) => {
      setBusyMember(userId);
      setFeedback(null);
      try {
        await run();
        setFeedback({ tone: 'ok', text: ok });
        await load();
      } catch (e) {
        setFeedback({ tone: 'error', text: e instanceof Error ? e.message : String(e) });
      } finally {
        setBusyMember(null);
      }
    },
    [load],
  );

  const back = (
    <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => navigate('/admin')}>
      Volver al buscador
    </Button>
  );

  if (loading && !detail) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <div className="panel">
          <TableSkeleton label="Obteniendo la ficha del equipo" rows={7} />
        </div>
      </div>
    );
  }

  if (error || !detail || !id) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <div className="panel">
          <ErrorState
            title="No se pudo cargar el equipo"
            message={error ?? 'No se encontró el equipo solicitado.'}
            onRetry={() => void load()}
          />
        </div>
      </div>
    );
  }

  const { device } = detail;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={device.alias || device.name}
        icon={Cpu}
        tone="support"
        breadcrumb={back}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <DeviceCode code={device.device_code} />
            <span className="text-terra-faint">·</span>
            <span className="font-mono text-xs">{device.hardware_version}</span>
          </span>
        }
        actions={
          <Button size="sm" icon={RefreshCw} onClick={() => void load()} busy={loading}>
            Actualizar
          </Button>
        }
      />

      {feedback && (
        <Alert tone={feedback.tone} onDismiss={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      <DeviceIdentity detail={detail} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DeviceMembers
            members={detail.members}
            busy={busyMember}
            onSetRole={(userId: string, role: DeviceMemberRole) =>
              void memberAction(userId, 'Administración delegada.', () =>
                setMemberRole(id, userId, role),
              )
            }
            onSetAuthorized={(userId: string, authorized: boolean) =>
              void memberAction(
                userId,
                authorized ? 'Miembro autorizado.' : 'Acceso suspendido sin desvincular.',
                () => setMemberAuthorized(id, userId, authorized),
              )
            }
            onRemove={(userId: string) =>
              void memberAction(userId, 'Usuario desvinculado del equipo.', () =>
                removeMember(id, userId),
              )
            }
          />
        </div>
        <DeviceCommands deviceId={id} onOpenReset={() => setResetOpen(true)} />
      </div>

      <DeviceBattery
        history={detail.battery_history}
        deviceCode={device.device_code}
        onExportError={(text) => setFeedback({ tone: 'error', text })}
      />

      <DeviceMeasurements
        measurements={detail.measurements}
        deviceCode={device.device_code}
        onExportError={(text) => setFeedback({ tone: 'error', text })}
      />

      {resetOpen && (
        <FactoryResetModal
          deviceId={id}
          expectedCode={device.device_code}
          onClose={() => setResetOpen(false)}
          onSuccess={(res: FactoryResetResult) => {
            setResetOpen(false);
            setFeedback({
              tone: 'ok',
              text:
                `Reseteo completado: ${res.members_removed} miembro(s) desvinculado(s), ` +
                `${res.measurements_deleted} medición(es) y ${res.alerts_deleted} alerta(s) ` +
                'eliminadas. El código del equipo se conserva.',
            });
            void load();
          }}
        />
      )}
    </div>
  );
}
