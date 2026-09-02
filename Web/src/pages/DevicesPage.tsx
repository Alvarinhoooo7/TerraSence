import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Device } from '../types';
import { FirmwareView } from '../components/FirmwareView';
import { formatDeviceCode, relativeTime } from '../utils/verdict';
import { motion } from 'framer-motion';
import { Settings2, Signal, Battery, Cpu, CheckCircle2, BatteryWarning } from 'lucide-react';

const ONLINE_WINDOW_MS = 3600_000; // 1 h

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'firmware'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('devices')
        .select('*')
        .order('last_seen_at', { ascending: false, nullsFirst: false });

      if (err) throw err;
      setDevices((data ?? []) as Device[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const online = devices.filter(
      (d) => d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < ONLINE_WINDOW_MS,
    ).length;
    const lowBattery = devices.filter((d) => d.battery_level < 20).length;
    return { total: devices.length, online, lowBattery };
  }, [devices]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-terra-text">Gestión de Equipos</h1>
          <p className="text-terra-muted text-sm mt-1">Supervisa la salud de tu hardware y actualizaciones OTA.</p>
        </div>

        <div className="flex p-1 bg-terra-surface rounded-xl border border-terra-border shrink-0">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'list'
                ? 'bg-terra-bg text-terra-text shadow-sm border border-terra-border/50'
                : 'text-terra-muted hover:text-terra-text border border-transparent'
            }`}
          >
            Inventario
          </button>
          <button
            onClick={() => setView('firmware')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              view === 'firmware'
                ? 'bg-terra-primary/10 text-terra-primary shadow-sm border border-terra-primary/20'
                : 'text-terra-muted hover:text-terra-text border border-transparent'
            }`}
          >
            <Settings2 size={16} />
            Firmware OTA
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-terra-muted">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-terra-primary border-t-transparent rounded-full animate-spin" />
            <p>Conectando con la flota...</p>
          </div>
        </div>
      ) : (
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-6"
        >
          {view === 'list' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={<Cpu size={18} />} label="Equipos totales" value={stats.total} />
              <StatCard icon={<CheckCircle2 size={18} />} label="Conectados (última hora)" value={stats.online} tone="text-terra-primary" delay={0.05} />
              <StatCard icon={<BatteryWarning size={18} />} label="Batería baja (< 20%)" value={stats.lowBattery} tone={stats.lowBattery > 0 ? 'text-verdict-red' : 'text-terra-text'} delay={0.1} />
            </div>
          )}

          {view === 'list' ? (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-terra-border flex items-center justify-between">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Cpu className="text-terra-primary" size={20} />
                  Equipos Registrados ({devices.length})
                </h2>
              </div>

              {devices.length === 0 ? (
                <div className="py-16 text-center text-terra-muted">
                  No hay equipos vinculados a tu cuenta.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-terra-surface/50 text-terra-muted uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Equipo</th>
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Batería</th>
                        <th className="px-6 py-4">Firmware / HW</th>
                        <th className="px-6 py-4 text-right">Última Conexión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-terra-border/50">
                      {devices.map((d) => {
                        const online = d.last_seen_at
                          ? Date.now() - new Date(d.last_seen_at).getTime() < ONLINE_WINDOW_MS
                          : false;
                        return (
                          <tr key={d.id} className="hover:bg-terra-surface/40 transition-colors">
                            <td className="px-6 py-4 font-medium text-terra-text">
                              <span className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-terra-primary shadow-[0_0_6px_currentColor] text-terra-primary' : 'bg-terra-muted'}`}
                                />
                                {d.alias || d.name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <code className="tabular bg-terra-surface border border-terra-border/60 px-2 py-1 rounded text-xs text-terra-primary/80 font-mono">
                                {formatDeviceCode(d.device_code)}
                              </code>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Battery size={16} className={d.battery_level < 20 ? 'text-verdict-red' : 'text-terra-primary'} />
                                <span className="tabular">{d.battery_level}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-terra-muted">
                              <span className="font-mono text-xs bg-terra-surface/50 border border-terra-border/40 px-2 py-1 rounded">v{d.firmware_version}</span>
                              <span className="mx-2 opacity-50">/</span>
                              <span className="font-mono text-xs bg-terra-surface/50 border border-terra-border/40 px-2 py-1 rounded">hw_{d.hardware_version}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Signal size={14} className={online ? 'text-terra-primary' : 'text-terra-muted'} />
                                <span className="text-terra-muted">{relativeTime(d.last_seen_at)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6">
               <FirmwareView devices={devices} />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="glass-panel hover-glass rounded-2xl p-5 flex items-center gap-4 transition-all"
    >
      <div className={`p-2.5 rounded-xl bg-terra-surface border border-terra-border ${tone ?? 'text-terra-primary'}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tabular text-terra-text leading-none">{value}</div>
        <div className="text-xs font-medium text-terra-muted mt-1">{label}</div>
      </div>
    </motion.div>
  );
}
