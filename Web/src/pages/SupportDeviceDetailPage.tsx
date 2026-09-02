import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getDeviceDetail, 
  setMemberRole, 
  setMemberAuthorized, 
  removeMember 
} from '../../backend/adminApi';
import type { DeviceDetail, DeviceMemberRole } from '../../backend/types';
import { FactoryResetModal } from '../components/admin/FactoryResetModal';
import { ChevronLeft, Cpu, Battery, MapPin, ShieldAlert, CheckCircle, XCircle, Trash2, Shield, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export function SupportDeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceDetail(id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRoleChange = async (userId: string, role: DeviceMemberRole) => {
    if (!id) return;
    try {
      await setMemberRole(id, userId, role);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAuthChange = async (userId: string, authorized: boolean) => {
    if (!id) return;
    try {
      await setMemberAuthorized(id, userId, authorized);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemove = async (userId: string) => {
    if (!id) return;
    if (!confirm('¿Estás seguro de que quieres desvincular a este usuario de forma permanente?')) return;
    try {
      await removeMember(id, userId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-terra-muted">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-verdict-amber border-t-transparent rounded-full animate-spin" />
          <p>Obteniendo ficha técnica del equipo...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-terra-muted hover:text-terra-text mb-6">
          <ChevronLeft size={20} /> Volver al buscador
        </button>
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-6">
          <h2 className="font-bold text-lg mb-2">Error al cargar el equipo</h2>
          <p>{error || 'No se encontró el equipo.'}</p>
        </div>
      </div>
    );
  }

  const { device, members, last_location } = detail;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-lg bg-terra-surface border border-terra-border text-terra-muted hover:text-terra-text transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-verdict-amber flex items-center gap-3">
            {device.alias || device.name}
            {device.is_active && <span className="w-3 h-3 rounded-full bg-terra-primary shadow-[0_0_10px_rgba(18,210,113,0.5)]"></span>}
          </h1>
          <p className="text-terra-muted text-sm mt-1 font-mono">UUID: {device.device_code}</p>
        </div>
        
        <div className="ml-auto">
          <button 
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-verdict-red/10 text-verdict-red border border-verdict-red/30 hover:bg-verdict-red/20 font-bold transition-colors"
          >
            <ShieldAlert size={18} />
            Factory Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-terra-surface rounded-xl text-terra-primary">
            <Battery size={24} />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-terra-muted uppercase mb-1">Batería</p>
            <p className="text-2xl font-bold tabular">{device.battery_level}%</p>
          </div>
        </div>
        
        <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-terra-surface rounded-xl text-verdict-amber">
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-terra-muted uppercase mb-1">Firmware</p>
            <p className="text-2xl font-bold tabular font-mono">v{device.firmware_version}</p>
            {!detail.is_up_to_date && (
              <span className="text-[10px] bg-verdict-amber/20 text-verdict-amber px-2 py-0.5 rounded ml-2">Desactualizado</span>
            )}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-terra-surface rounded-xl text-terra-text">
            <MapPin size={24} />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-terra-muted uppercase mb-1">Ubicación Actual</p>
            {last_location ? (
              <p className="text-lg font-bold truncate" title={last_location.field_name}>{last_location.field_name}</p>
            ) : (
              <p className="text-sm text-terra-muted mt-1">Sin ubicación registrada</p>
            )}
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl overflow-hidden mt-2"
      >
        <div className="px-6 py-5 border-b border-terra-border flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Shield className="text-verdict-amber" size={20} />
            Miembros Vinculados ({members.length})
          </h2>
        </div>
        
        {members.length === 0 ? (
          <div className="py-12 text-center text-terra-muted">Este equipo no tiene usuarios vinculados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-terra-surface/50 text-terra-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones Administrativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terra-border/50">
                {members.map((m) => (
                  <tr key={m.user_id} className="hover:bg-terra-surface/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-terra-text">{m.full_name}</p>
                      <p className="text-xs text-terra-muted">{m.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value as DeviceMemberRole)}
                        className="bg-terra-surface border border-terra-border rounded-md px-2 py-1 text-xs outline-none focus:border-verdict-amber"
                      >
                        <option value="owner">Dueño (Owner)</option>
                        <option value="admin">Administrador</option>
                        <option value="operator">Operador</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {m.is_authorized ? (
                        <span className="inline-flex items-center gap-1.5 text-terra-primary text-xs font-bold bg-terra-primary/10 px-2 py-1 rounded">
                          <CheckCircle size={14} /> Autorizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-verdict-amber text-xs font-bold bg-verdict-amber/10 px-2 py-1 rounded">
                          <XCircle size={14} /> Suspendido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleAuthChange(m.user_id, !m.is_authorized)}
                          className="p-2 rounded hover:bg-terra-surface text-terra-muted hover:text-terra-text"
                          title={m.is_authorized ? "Suspender acceso" : "Reanudar acceso"}
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => handleRemove(m.user_id)}
                          className="p-2 rounded hover:bg-verdict-red/20 text-terra-muted hover:text-verdict-red"
                          title="Desvincular usuario"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {showResetModal && id && (
        <FactoryResetModal 
          deviceId={id}
          expectedCode={device.device_code}
          onClose={() => setShowResetModal(false)}
          onSuccess={(res) => {
            alert(`Reseteo exitoso. Se borraron ${res.measurements_deleted} mediciones.`);
            setShowResetModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
