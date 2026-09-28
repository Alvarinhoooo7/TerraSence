// src/components/device/MembersCard.tsx — usuarios enlazados al equipo.
//
// Columnas: Usuario · Correo · Admin · Hacer admin · Aprobado.
//   · Hacer administrador pide confirmación: el admin actual pasa a usuario.
//     Sólo se ofrece a usuarios aprobados (la base exige un admin aprobado).
//   · Aceptar y Rechazar sólo aparecen en solicitudes pendientes. Rechazar
//     borra la solicitud; el usuario puede volver a pedir acceso.
// Cada acción se confirma contra el servidor recargando la tarjeta: lo que se
// ve es lo que quedó en la base, no una suposición de la interfaz.

import { useState } from 'react';
import { Check, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { approveMember, friendlyError, makeAdmin, rejectMember } from '../../../backend/adminApi';
import type { DeviceMember } from '../../../backend/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/Dialog';
import { EmptyState, Notice, SkeletonRows } from '../../ui/Feedback';
import { personName } from '../../utils/format';

type Feedback = { tone: 'success' | 'error'; text: string } | null;

const COLS = 'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_3.5rem_12.5rem_14.5rem] md:items-center md:gap-4';

export function MembersCard({
  deviceId,
  members,
  loading,
  error,
  onRefresh,
}: {
  deviceId: string;
  members: DeviceMember[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [promote, setPromote] = useState<DeviceMember | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const currentAdmin = members?.find((m) => m.role === 'admin') ?? null;
  const pending = members?.filter((m) => !m.is_authorized).length ?? 0;

  const act = async (userId: string, run: () => Promise<unknown>, ok: string) => {
    setBusyUser(userId);
    setFeedback(null);
    try {
      await run();
      setFeedback({ tone: 'success', text: ok });
      await onRefresh();
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) });
    } finally {
      setBusyUser(null);
    }
  };

  return (
    <Card
      title="Usuarios"
      labelledBy="card-usuarios"
      description={
        members
          ? `${members.length} ${members.length === 1 ? 'enlazado' : 'enlazados'}${
              pending ? ` · ${pending} ${pending === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}` : ''
            }`
          : undefined
      }
      actions={
        <Button size="sm" icon={RefreshCw} onClick={() => void onRefresh()} busy={loading && members != null}>
          Refrescar
        </Button>
      }
    >
      {(feedback || error) && (
        <div className="px-5 pt-4">
          <Notice tone={feedback?.tone ?? 'error'} onDismiss={feedback ? () => setFeedback(null) : undefined}>
            {feedback?.text ?? error}
          </Notice>
        </div>
      )}

      {!members ? (
        loading && <SkeletonRows rows={3} label="Cargando usuarios" />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Sin usuarios enlazados">
          El equipo está libre: quien lo vincule desde la app quedará como administrador.
        </EmptyState>
      ) : (
        <div role="table" aria-label="Usuarios del equipo" className="text-sm">
          <div role="rowgroup" className="hidden border-b border-line px-5 py-2.5 text-xs text-muted md:block">
            <div role="row" className={COLS}>
              <span role="columnheader">Usuario</span>
              <span role="columnheader">Correo</span>
              <span role="columnheader">Admin</span>
              <span role="columnheader">Hacer admin</span>
              <span role="columnheader">Aprobado</span>
            </div>
          </div>
          <div role="rowgroup" className="divide-y divide-line">
            {members.map((m) => {
              const isAdmin = m.role === 'admin';
              const working = busyUser === m.user_id;
              const name = personName(m.first_name, m.last_name, m.email);
              return (
                <div
                  role="row"
                  key={m.user_id}
                  className={`flex flex-col gap-2 px-5 py-3.5 ${COLS} ${m.is_authorized ? '' : 'bg-warning-soft/40'}`}
                >
                  <div role="cell" className="min-w-0 font-medium text-ink">
                    <span className="block truncate">{name}</span>
                  </div>
                  <div role="cell" className="min-w-0 break-all text-muted">
                    {m.email}
                  </div>
                  <div role="cell" className="text-ink">
                    <span className="text-xs text-muted md:hidden">Admin: </span>
                    {isAdmin ? 'Sí' : 'No'}
                  </div>
                  <div role="cell">
                    {!isAdmin && m.is_authorized && (
                      <Button
                        size="sm"
                        icon={ShieldCheck}
                        disabled={busyUser != null}
                        onClick={() => {
                          setPromoteError(null);
                          setPromote(m);
                        }}
                      >
                        Hacer administrador
                      </Button>
                    )}
                  </div>
                  <div role="cell" className="flex gap-2">
                    {!m.is_authorized && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={Check}
                          busy={working}
                          disabled={busyUser != null && !working}
                          onClick={() => void act(m.user_id, () => approveMember(deviceId, m.user_id), `${name} fue aceptado.`)}
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={X}
                          disabled={busyUser != null}
                          onClick={() =>
                            void act(m.user_id, () => rejectMember(deviceId, m.user_id), `Solicitud de ${name} rechazada.`)
                          }
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {promote && (
        <ConfirmDialog
          title={`¿Hacer administrador a ${personName(promote.first_name, promote.last_name, promote.email)}?`}
          confirmLabel="Hacer administrador"
          busy={busyUser === promote.user_id}
          error={promoteError}
          onClose={() => setPromote(null)}
          onConfirm={() => {
            const target = promote;
            setBusyUser(target.user_id);
            setPromoteError(null);
            makeAdmin(deviceId, target.user_id)
              .then(async () => {
                setPromote(null);
                setFeedback({
                  tone: 'success',
                  text: `${personName(target.first_name, target.last_name, target.email)} es ahora el administrador.`,
                });
                await onRefresh();
              })
              .catch((e) => setPromoteError(friendlyError(e)))
              .finally(() => setBusyUser(null));
          }}
        >
          {currentAdmin ? (
            <p>
              <strong className="font-medium text-ink">
                {personName(currentAdmin.first_name, currentAdmin.last_name, currentAdmin.email)}
              </strong>{' '}
              dejará de ser administrador y quedará como usuario común.
            </p>
          ) : (
            <p>El equipo no tiene administrador ahora; esta persona pasará a serlo.</p>
          )}
        </ConfirmDialog>
      )}
    </Card>
  );
}
