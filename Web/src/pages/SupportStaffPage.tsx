// src/pages/SupportStaffPage.tsx
//
// Gobernanza del propio equipo de soporte: quién entra al backoffice y con qué
// código de invitación.
//
// Todo el control real vive en Postgres: `admin_set_staff_active` y
// `admin_rotate_invite_code` comprueban `is_support_staff()` y rechazan la
// autodesactivación. Lo de aquí es interfaz, no seguridad.

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { listSupportStaff, rotateInviteCode, setStaffActive } from '../../backend/adminApi';
import type { SupportStaffRow } from '../../backend/types';
import { supabase } from '../services/supabase';
import { PageHeader } from '../ui/PageHeader';
import { Panel, PanelHeader } from '../ui/Panel';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Form';
import { Badge, TableScroll } from '../ui/Data';
import { Alert, EmptyState, TableSkeleton } from '../ui/Feedback';
import { absoluteDate } from '../utils/format';

const MIN_CODE = 8;

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

export function SupportStaffPage() {
  const [staff, setStaff] = useState<SupportStaffRow[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [rotating, setRotating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, session] = await Promise.all([listSupportStaff(), supabase.auth.getUser()]);
      setStaff(rows);
      setMyUserId(session.data.user?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (row: SupportStaffRow) => {
    if (!row.user_id) return;
    setBusyUserId(row.user_id);
    setFeedback(null);
    try {
      await setStaffActive(row.user_id, !row.is_active);
      setFeedback({
        tone: 'ok',
        text: `${row.email} quedó ${row.is_active ? 'sin acceso' : 'con acceso'} al panel.`,
      });
      await load();
    } catch (e) {
      setFeedback({ tone: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyUserId(null);
    }
  };

  const rotate = async () => {
    setFeedback(null);
    if (newCode.length < MIN_CODE) {
      setCodeError(`El código debe tener al menos ${MIN_CODE} caracteres.`);
      return;
    }
    if (newCode !== confirmCode) {
      setCodeError('Los dos códigos no coinciden.');
      return;
    }
    setCodeError(undefined);
    setRotating(true);
    try {
      await rotateInviteCode(newCode);
      setFeedback({
        tone: 'ok',
        text: 'Código rotado. El anterior deja de servir de inmediato; comparte el nuevo por un canal privado.',
      });
      setNewCode('');
      setConfirmCode('');
    } catch (e) {
      setFeedback({ tone: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setRotating(false);
    }
  };

  const activos = staff.filter((s) => s.is_active).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Equipo de soporte"
        icon={Users}
        description="Quién puede entrar al backoffice y con qué código se da de alta."
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
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel>
            <PanelHeader
              icon={Users}
              title={`Personal (${activos} activo${activos === 1 ? '' : 's'} de ${staff.length})`}
            />

            {loading ? (
              <TableSkeleton label="Cargando el equipo de soporte" rows={4} />
            ) : staff.length === 0 ? (
              <EmptyState icon={Users} title="No hay personal visible">
                Si acabas de darte de alta, vuelve a cargar la página: la política
                `support_select_staff` sólo muestra el equipo completo a quien ya pertenece al
                panel.
              </EmptyState>
            ) : (
              <TableScroll label="Personal de soporte" maxHeight="26rem">
                <table className="data-table w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-2.5">Persona</th>
                      <th className="px-3 py-2.5">Estado</th>
                      <th className="px-3 py-2.5">Alta</th>
                      <th className="px-3 py-2.5 text-right">Acceso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terra-border">
                    {staff.map((row) => {
                      const isMe = row.user_id != null && row.user_id === myUserId;
                      const invitado = row.user_id == null;
                      return (
                        <tr key={row.id}>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2 font-medium text-terra-text">
                              {row.full_name}
                              {isMe && <Badge tone="primary">Tú</Badge>}
                            </div>
                            <div className="text-xs text-terra-muted">{row.email}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            {invitado ? (
                              <Badge tone="amber">Invitado, sin registrar</Badge>
                            ) : row.is_active ? (
                              <Badge tone="green">Activo</Badge>
                            ) : (
                              <Badge tone="neutral">Suspendido</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-terra-muted">
                            {absoluteDate(row.created_at)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {invitado ? (
                              <span className="text-xs text-terra-muted">
                                Debe registrarse con el código
                              </span>
                            ) : isMe ? (
                              <span className="text-xs text-terra-muted">
                                No puedes quitarte el acceso
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant={row.is_active ? 'ghost' : 'primary'}
                                icon={row.is_active ? UserX : UserCheck}
                                busy={busyUserId === row.user_id}
                                onClick={() => void toggleActive(row)}
                              >
                                {row.is_active ? 'Suspender' : 'Reactivar'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel>
            <PanelHeader icon={KeyRound} tone="support" title="Código de invitación" />
            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm leading-relaxed text-terra-muted">
                El código es lo único que separa a un usuario cualquiera del backoffice: la URL del
                panel no basta, porque <code className="font-mono text-xs">auth.users</code> se
                comparte con la app de agricultores. Rótalo cuando alguien deje el equipo.
              </p>

              <TextField
                label="Nuevo código"
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder={`Mínimo ${MIN_CODE} caracteres`}
                autoComplete="off"
                className="font-mono"
                error={codeError}
              />

              <TextField
                label="Repetir código"
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Debe coincidir"
                autoComplete="off"
                className="font-mono"
              />

              <Button
                variant="support"
                icon={ShieldCheck}
                disabled={newCode.length === 0}
                busy={rotating}
                busyLabel="Rotando…"
                onClick={() => void rotate()}
              >
                Rotar código
              </Button>

              <p className="text-xs leading-relaxed text-terra-muted">
                El servidor guarda sólo el hash del código; no hay forma de consultarlo desde aquí.
                Si lo pierdes, rótalo. Cinco intentos fallidos por hora bloquean el alta de un
                usuario.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
