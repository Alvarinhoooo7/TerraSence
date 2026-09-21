// src/components/device/DeviceMembers.tsx — miembros del equipo.
//
// El defecto que corrige: el botón de autorización estaba `disabled` en cuanto
// el miembro figuraba como aprobado, así que suspender el acceso de alguien ya
// aprobado era imposible desde la consola — aunque tanto `setMemberAuthorized`
// como la RPC `admin_set_member_authorized` aceptan `false` desde el primer
// día. Encima el botón inerte se pintaba en ámbar, el color de «pendiente»,
// de modo que parecía accionable.

import { useState } from 'react';
import { BellOff, ShieldCheck, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import type { DeviceMemberInfo, DeviceMemberRole } from '../../../backend/types';
import { Panel, PanelHeader, PanelNote } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { Badge, TableScroll } from '../../ui/Data';
import { EmptyState } from '../../ui/Feedback';
import { absoluteDate } from '../../utils/format';

type Confirm = { userId: string; action: 'delegar' | 'desvincular' | 'suspender' } | null;

export function DeviceMembers({
  members,
  busy,
  onSetRole,
  onSetAuthorized,
  onRemove,
}: {
  members: DeviceMemberInfo[];
  busy: string | null;
  onSetRole: (userId: string, role: DeviceMemberRole) => void;
  onSetAuthorized: (userId: string, authorized: boolean) => void;
  onRemove: (userId: string) => void;
}) {
  const [confirm, setConfirm] = useState<Confirm>(null);

  const pending = members.filter((m) => !m.is_authorized).length;
  const onlyOne = members.length <= 1;

  const ask = (userId: string, action: NonNullable<Confirm>['action']) =>
    setConfirm({ userId, action });

  const run = (fn: () => void) => {
    setConfirm(null);
    fn();
  };

  return (
    <Panel>
      <PanelHeader
        icon={Users}
        title={`Miembros (${members.length})`}
        hint={pending > 0 ? `${pending} a la espera de aprobación` : undefined}
        tone={pending > 0 ? 'support' : 'primary'}
      />

      {members.length === 0 ? (
        <EmptyState icon={Users} title="Sin usuarios vinculados">
          El equipo está libre: quien lo escanee primero quedará como administrador.
        </EmptyState>
      ) : (
        <TableScroll label="Miembros del equipo" maxHeight="26rem">
          <table className="data-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-2.5">Persona</th>
                <th className="px-3 py-2.5">Rol</th>
                <th className="px-3 py-2.5">Acceso</th>
                <th className="px-3 py-2.5">Alta</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terra-border">
              {members.map((m) => {
                const isAdmin = m.role === 'admin';
                const working = busy === m.user_id;
                const open = confirm?.userId === m.user_id ? confirm.action : null;

                return (
                  <tr key={m.user_id}>
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-terra-text">
                        {m.full_name ?? <span className="text-terra-muted">Sin nombre cargado</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-terra-muted">
                        {m.email}
                        {!m.has_push_token && (
                          <span title="Este usuario no tiene token de notificaciones: no recibiría avisos push.">
                            <BellOff size={12} className="text-terra-faint" aria-hidden="true" />
                            <span className="sr-only">Sin token de notificaciones</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <Badge tone={isAdmin ? 'primary' : 'neutral'} icon={isAdmin ? ShieldCheck : undefined}>
                        {isAdmin ? 'Administrador' : 'Usuario'}
                      </Badge>
                    </td>

                    <td className="px-3 py-2.5">
                      <Badge tone={m.is_authorized ? 'green' : 'amber'}>
                        {m.is_authorized ? 'Autorizado' : 'Pendiente'}
                      </Badge>
                    </td>

                    <td className="px-3 py-2.5 whitespace-nowrap text-terra-muted">
                      {absoluteDate(m.created_at)}
                    </td>

                    <td className="px-3 py-2.5">
                      {open ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="text-xs text-terra-muted">
                            {open === 'delegar'
                              ? 'El administrador actual pasará a usuario.'
                              : open === 'suspender'
                                ? 'Conserva la membresía, pero pierde el acceso al equipo.'
                                : 'Se elimina la membresía. La cuenta del usuario no se toca.'}
                          </p>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant={open === 'desvincular' ? 'danger' : 'primary'}
                              busy={working}
                              onClick={() =>
                                run(() => {
                                  if (open === 'delegar') onSetRole(m.user_id, 'admin');
                                  else if (open === 'suspender') onSetAuthorized(m.user_id, false);
                                  else onRemove(m.user_id);
                                })
                              }
                            >
                              Confirmar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {!m.is_authorized && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={UserCheck}
                              busy={working}
                              onClick={() => onSetAuthorized(m.user_id, true)}
                            >
                              Aprobar
                            </Button>
                          )}
                          {m.is_authorized && !isAdmin && (
                            <>
                              <Button
                                size="sm"
                                icon={ShieldCheck}
                                onClick={() => ask(m.user_id, 'delegar')}
                              >
                                Delegar administración
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={UserX}
                                onClick={() => ask(m.user_id, 'suspender')}
                              >
                                Suspender
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            disabled={isAdmin || onlyOne}
                            title={
                              isAdmin
                                ? 'Delega la administración antes de desvincular a esta persona'
                                : onlyOne
                                  ? 'Debe quedar al menos un miembro; para vaciar el equipo usa el reseteo de fábrica'
                                  : 'Desvincular del equipo'
                            }
                            onClick={() => ask(m.user_id, 'desvincular')}
                          >
                            Desvincular
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      )}

      <PanelNote icon={BellOff}>
        Suspender conserva la membresía y retira el acceso; desvincular la elimina. El administrador
        no se puede desvincular sin delegar antes: la restricción `device_admin_authorized` de
        Postgres exige que todo equipo con administrador lo tenga autorizado.
      </PanelNote>
    </Panel>
  );
}
