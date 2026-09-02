import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { LabValidationRecord } from '../types';
import { concordance } from '../utils/verdict';
import { motion } from 'framer-motion';
import { FlaskConical, CheckCircle2 } from 'lucide-react';

export function ValidationPage() {
  const [lab, setLab] = useState<LabValidationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('lab_validation_records')
        .select('*')
        .order('sample_date', { ascending: false });
      
      if (err) throw err;
      setLab((data ?? []) as LabValidationRecord[]);
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
          <h1 className="text-3xl font-bold tracking-tight">Validación Metrológica</h1>
          <p className="text-terra-muted text-sm mt-1 max-w-2xl">
            Corpus de contraste contra laboratorios acreditados. Esta es la evidencia que sostiene la fiabilidad de las mediciones de TerraSense.
          </p>
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
            <p>Obteniendo registros de laboratorio...</p>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-panel rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-terra-border flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <FlaskConical className="text-terra-primary" size={20} />
              Registros Históricos
            </h2>
          </div>
          
          {lab.length === 0 ? (
            <div className="py-16 text-center text-terra-muted">
              Todavía no hay registros de validación.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-terra-surface/50 text-terra-muted uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Muestra</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Laboratorio</th>
                    <th className="px-6 py-4">pH (Lab / TS)</th>
                    <th className="px-6 py-4">CE (Lab / TS)</th>
                    <th className="px-6 py-4">VWC (Lab / TS)</th>
                    <th className="px-6 py-4 text-right">Concordancia pH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terra-border/50">
                  {lab.map((r) => {
                    const cPh = concordance(r.lab_ph, r.terrasense_ph);
                    const isHigh = cPh !== null && cPh >= 90;
                    
                    return (
                      <tr key={r.id} className="hover:bg-terra-surface/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-terra-text">{r.sample_code}</td>
                        <td className="px-6 py-4 text-terra-muted">{new Date(r.sample_date).toLocaleDateString('es-CL')}</td>
                        <td className="px-6 py-4 text-terra-muted">{r.lab_name}</td>
                        <td className="px-6 py-4 tabular font-medium">
                          <span className="text-terra-muted">{r.lab_ph?.toFixed(1)}</span>
                          <span className="mx-2 opacity-30">/</span>
                          <span className="text-terra-primary">{r.terrasense_ph?.toFixed(1)}</span>
                        </td>
                        <td className="px-6 py-4 tabular font-medium">
                          <span className="text-terra-muted">{Math.round(r.lab_ec)}</span>
                          <span className="mx-2 opacity-30">/</span>
                          <span className="text-terra-primary">{Math.round(r.terrasense_ec)}</span>
                        </td>
                        <td className="px-6 py-4 tabular font-medium">
                          <span className="text-terra-muted">{r.lab_vwc?.toFixed(0)}</span>
                          <span className="mx-2 opacity-30">/</span>
                          <span className="text-terra-primary">{r.terrasense_vwc?.toFixed(0)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {cPh == null ? (
                            <span className="text-terra-muted">—</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {isHigh && <CheckCircle2 size={16} className="text-terra-primary" />}
                              <span className={`tabular font-bold ${isHigh ? 'text-terra-primary' : 'text-verdict-amber'}`}>
                                {cPh.toFixed(1)} %
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
