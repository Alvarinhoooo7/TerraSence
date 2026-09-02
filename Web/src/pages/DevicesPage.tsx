import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Device } from '../types';
import { FirmwareView } from '../components/FirmwareView';
import { formatDeviceCode, relativeTime } from '../utils/verdict';
import { motion } from 'framer-motion';
import { Settings2, Signal, Battery, Cpu } from 'lucide-react';

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Equipos</h1>
          <p className="text-terra-muted text-sm mt-1">Supervisa la salud de tu hardware y actualizaciones OTA.</p>
        </div>
        
        <div className="flex p-1 bg-terra-surface rounded-xl border border-terra-border">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'list' 
                ? 'bg-terra-bg text-terra-text shadow-sm border border-terra-border/50' 
                : 'text-terra-muted hover:text-terra-text'
            }`}
          >
            Inventario
          </button>
          <button
            onClick={() => setView('firmware')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              view === 'firmware' 
                ? 'bg-terra-primary/10 text-terra-primary shadow-sm border border-terra-primary/20' 
                : 'text-terra-muted hover:text-terra-text'
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
        >
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
                        <th className="px-6 py-4">Código UUID</th>
                        <th className="px-6 py-4">Batería</th>
                        <th className="px-6 py-4">Firmware / HW</th>
                        <th className="px-6 py-4 text-right">Última Conexión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-terra-border/50">
                      {devices.map((d) => (
                        <tr key={d.id} className="hover:bg-terra-surface/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-terra-text">
                            {d.alias || d.name}
                          </td>
                          <td className="px-6 py-4">
                            <code className="tabular bg-terra-surface px-2 py-1 rounded text-xs text-terra-primary/80 font-mono">
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
                            <span className="font-mono text-xs bg-terra-surface/50 px-2 py-1 rounded">v{d.firmware_version}</span>
                            <span className="mx-2 opacity-50">/</span>
                            <span className="font-mono text-xs bg-terra-surface/50 px-2 py-1 rounded">hw_{d.hardware_version}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Signal size={14} className={new Date(d.last_seen_at || 0).getTime() > Date.now() - 3600000 ? 'text-terra-primary' : 'text-terra-muted'} />
                              <span className="text-terra-muted">{relativeTime(d.last_seen_at)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
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
