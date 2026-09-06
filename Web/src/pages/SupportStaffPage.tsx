// src/pages/SupportStaffPage.tsx
//
// Gobernanza del propio equipo de soporte: quién entra al backoffice y con qué
// código de invitación. Las tres operaciones ya existían en backend/adminApi.ts
// (`listSupportStaff`, `setStaffActive`, `rotateInviteCode`) sin pantalla que
// las usara.
//
// Todo el control real vive en Postgres: `admin_set_staff_active` y
// `admin_rotate_invite_code` comprueban `is_support_staff()` y rechazan la
// autodesactivación. Lo de aquí es interfaz, no seguridad.

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, UserCheck, UserX, Users, RefreshCw } from 'lucide-react';
import { listSupportStaff, rotateInviteCode, setStaffActive } from '../../backend/adminApi';
import type { SupportStaffRow } from '../../backend/types';
import { supabase } from '../services/supabase';

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

  const handleToggleActive = async (row: SupportStaffRow) => {
    if (!row.user_id) return;
    setBusyUserId(row.user_id);
    setFeedback(null);
    try {
      const res = await setStaffActive(row.user_id, !row.is_active);
      if (res.success === false) {
        setFeedback({ tone: 'error', text: res.message ?? 'No se pudo aplicar el cambio.' });
      } else {
        setFeedback({
          tone: 'ok',
          text: `${row.email} quedó ${row.is_active ? 'sin acceso' : 'con acceso'} al panel.`,
        });
        await load();
      }
    } catch (e) {
      setFeedback({ tone: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRotate = async () => {
    setFeedback(null);
    if (newCode.length < 8) {
      setFeedback({ tone: 'error', text: 'El código debe tener al menos 8 caracteres.' });
      return;
    }
    if (newCode !== confirmCode) {
      setFeedback({ tone: 'error', text: 'Los dos códigos no coinciden.' });
      return;
    }
    setRotating(true);
    try {
      const res = await rotateInviteCode(newCode);
      if (res.success === false) {
        setFeedback({ tone: 'error', text: res.message ?? 'No se pudo rotar el código.' });
      } else {
        setFeedback({
          tone: 'ok',
          text: 'Código rotado. El anterior deja de servir de inmediato; comparte el nuevo por un canal privado.',
        });
        setNewCode('');
        setConfirmCode('');
      }
    } catch (e) {
      setFeedback({ tone: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setRotating(false);
    }
  };

  const activos = staff.filter((s) => s.is_active).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1100px] mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-terra-text">Equipo de soporte</h1>
        <p className="text-terra-muted text-sm mt-1">
          Quién puede entrar al backoffice y con qué código se da de alta.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            feedback.tone === 'ok'
              ? 'bg-terra-primary/10 border-terra-primary/30 text-terra-primary'
              : 'bg-verdict-red/10 border-verdict-red/30 text-verdict-red'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Listado del equipo */}
        <div className="glass-panel rounded-2xl overflow-hidden lg:col-span-7">
          <div className="px-6 py-4 border-b border-terra-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-terra-primary/10 text-terra-primary">
                <Users size={18} />
              </div>
              <h2 className="font-semibold text-lg">
                Personal ({activos} activo{activos === 1 ? '' : 's'} de {staff.length})
              </h2>
            </div>
            <button
              onClick={() => void load()}
              className="p-2 rounded-lg border border-terra-border text-terra-muted hover:text-terra-text hover:bg-terra-surface transition-colors"
              title="Recargar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-terra-muted">Cargando equipo…</div>
          ) : staff.length === 0 ? (
            <div className="py-16 text-center text-terra-muted px-6">
              No hay personal de soporte visible. Si acabas de darte de alta, recarga la página.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-terra-surface/50 text-terra-muted uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Persona</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terra-border/30">
                  {staff.map((row) => {
                    const isMe = row.user_id != null && row.user_id === myUserId;
                    const pendiente = row.user_id == null;
                    return (
                      <tr key={row.id} className="hover:bg-terra-surface/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-terra-text flex items-center gap-2">
                            {row.full_name}
                            {isMe && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-terra-primary/10 text-terra-primary">
                                tú
                              </span>
                            )}
                          </div>
                          <div className="text-terra-muted text-xs">{row.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          {pendiente ? (
                            <span className="text-verdict-amber text-xs font-bold uppercase">
                              Invitado, sin registrar
                            </span>
                          ) : row.is_active ? (
                            <span className="text-terra-primary text-xs font-bold uppercase">Activo</span>
                          ) : (
                            <span className="text-terra-muted text-xs font-bold uppercase">Suspendido</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {pendiente ? (
                            <span className="text-xs text-terra-muted italic">
                              Debe registrarse con el código
                            </span>
                          ) : isMe ? (
                            <span className="text-xs text-terra-muted italic">
                              No puedes quitarte el acceso
                            </span>
                          ) : (
                            <button
                              onClick={() => void handleToggleActive(row)}
                              disabled={busyUserId === row.user_id}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                                row.is_active
                                  ? 'bg-verdict-amber/10 text-verdict-amber hover:bg-verdict-amber/20'
                                  : 'bg-terra-primary/10 text-terra-primary hover:bg-terra-primary/20'
                              }`}
                            >
                              {row.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                              {row.is_active ? 'Suspender' : 'Reactivar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rotación del código de invitación */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl lg:col-span-5 flex flex-col"
        >
          <div className="px-6 py-4 border-b border-terra-border/50 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-verdict-amber/10 text-verdict-amber">
              <KeyRound size={18} />
            </div>
            <h2 className="font-semibold text-lg">Código de invitación</h2>
          </div>

          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-terra-muted">
              El código es lo único que separa a un usuario cualquiera del backoffice: la URL del
              panel no basta, porque <code className="text-terra-text">auth.users</code> se comparte
              con la app de agricultores. Rótalo cuando alguien deje el equipo.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-terra-muted">
                Nuevo código
              </span>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="off"
                className="bg-terra-surface border border-terra-border rounded-lg px-3 py-2 outline-none focus:border-terra-primary text-terra-text font-mono text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-terra-muted">
                Repetir código
              </span>
              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Debe coincidir"
                autoComplete="off"
                className="bg-terra-surface border border-terra-border rounded-lg px-3 py-2 outline-none focus:border-terra-primary text-terra-text font-mono text-sm"
              />
            </label>

            <button
              onClick={() => void handleRotate()}
              disabled={rotating || newCode.length === 0}
              className="w-full py-3 rounded-xl bg-verdict-amber/15 text-verdict-amber border border-verdict-amber/30 hover:bg-verdict-amber/25 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              {rotating ? 'Rotando…' : 'Rotar código'}
            </button>

            <p className="text-xs text-terra-muted">
              El servidor guarda sólo el hash del código; no hay forma de consultarlo desde aquí.
              Si lo pierdes, rótalo. Cinco intentos fallidos por hora bloquean el alta de un usuario.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
