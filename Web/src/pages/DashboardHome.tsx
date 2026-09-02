import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Device, SoilMeasurement, Verdict } from '../types';
import { STAGE_LABEL } from '../types';
import { VERDICT_META, normalizeDeviceCode, relativeTime } from '../utils/verdict';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardHome() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [measurements, setMeasurements] = useState<SoilMeasurement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, m] = await Promise.all([
        supabase.from('devices').select('*').order('last_seen_at', { ascending: false, nullsFirst: false }),
        supabase.from('soil_measurements').select('*').order('measured_at', { ascending: false }).limit(500),
      ]);
      if (d.error) throw d.error;
      if (m.error) throw m.error;
      setDevices((d.data ?? []) as Device[]);
      setMeasurements((m.data ?? []) as SoilMeasurement[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Verdict, number> = { GREEN: 0, AMBER: 0, RED: 0 };
    for (const m of measurements) c[m.verdict] += 1;
    return c;
  }, [measurements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const code = normalizeDeviceCode(search);
    if (!q) return measurements;
    const byCode = code.length >= 4
      ? new Set(devices.filter((d) => d.device_code.includes(code)).map((d) => d.id))
      : new Set<string>();
    return measurements.filter(
      (m) =>
        m.field_name?.toLowerCase().includes(q) ||
        m.crop_id?.toLowerCase().includes(q) ||
        m.verdict_title?.toLowerCase().includes(q) ||
        byCode.has(m.device_id),
    );
  }, [measurements, devices, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumen General</h1>
          <p className="text-terra-muted text-sm mt-1">Monitorea el estado de todos tus predios en tiempo real.</p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-terra-muted" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar predio o cultivo..."
            className="w-full sm:w-72 h-11 rounded-xl border border-terra-border bg-terra-surface pl-10 pr-4 text-sm outline-none focus:border-terra-primary transition-all focus:ring-1 focus:ring-terra-primary/50 shadow-sm"
          />
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
            <p>Cargando datos agrícolas...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Mediciones" value={measurements.length} delay={0.1} />
            {(['GREEN', 'AMBER', 'RED'] as Verdict[]).map((v, i) => (
              <StatCard
                key={v}
                label={VERDICT_META[v].label}
                value={counts[v]}
                icon={VERDICT_META[v].icon}
                tone={VERDICT_META[v].text}
                delay={0.15 + i * 0.05}
              />
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-2xl overflow-hidden mt-2"
          >
            <div className="px-6 py-5 border-b border-terra-border flex items-center justify-between">
              <h2 className="font-semibold text-lg">Últimas Mediciones</h2>
            </div>
            
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-terra-muted">
                No hay mediciones que coincidan con tu búsqueda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-terra-surface/50 text-terra-muted uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Veredicto</th>
                      <th className="px-6 py-4">Predio</th>
                      <th className="px-6 py-4">Etapa</th>
                      <th className="px-6 py-4">pH</th>
                      <th className="px-6 py-4">CE (µS/cm)</th>
                      <th className="px-6 py-4">VWC %</th>
                      <th className="px-6 py-4">N-P-K</th>
                      <th className="px-6 py-4 text-right">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terra-border/50">
                    {filtered.map((m) => {
                      const meta = VERDICT_META[m.verdict];
                      return (
                        <tr key={m.id} className="hover:bg-terra-surface/40 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-2 ${meta.text}`}>
                              <span className={`w-6 h-6 grid place-items-center rounded-full text-[11px] font-bold text-[#050a07] shadow-sm ${meta.dot}`}>
                                {meta.icon}
                              </span>
                              <span className="font-medium">{meta.label}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-terra-text">{m.field_name}</td>
                          <td className="px-6 py-4 text-terra-muted capitalize">{STAGE_LABEL[m.phenological_stage] ?? m.phenological_stage}</td>
                          <td className="px-6 py-4 tabular font-medium">{m.ph?.toFixed(1)}</td>
                          <td className="px-6 py-4 tabular font-medium">{Math.round(m.ec_us_cm)}</td>
                          <td className="px-6 py-4 tabular font-medium">{m.vwc_percent?.toFixed(0)}</td>
                          <td className="px-6 py-4 tabular text-terra-muted text-xs bg-terra-surface/30 rounded-md w-fit inline-block mt-2 px-2 py-1">
                            {`${m.nitrogen}-${m.phosphorus}-${m.potassium}`}
                          </td>
                          <td className="px-6 py-4 text-terra-muted text-right whitespace-nowrap">{relativeTime(m.measured_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone, delay }: { label: string; value: number; icon?: string; tone?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-panel hover-glass p-6 rounded-2xl transition-all relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon && <span className="text-6xl">{icon}</span>}
      </div>
      <div className="text-xs font-bold tracking-wider text-terra-muted uppercase flex items-center gap-2 relative z-10">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className={`text-4xl sm:text-5xl font-bold tabular mt-4 relative z-10 ${tone ?? 'text-terra-text'}`}>{value}</div>
    </motion.div>
  );
}
