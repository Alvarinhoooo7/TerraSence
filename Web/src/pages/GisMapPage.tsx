import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { SoilMeasurement } from '../types';
import { GisHeatmap } from '../components/GisHeatmap';
import { Map as MapIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export function GisMapPage() {
  const [measurements, setMeasurements] = useState<SoilMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('soil_measurements')
        .select('*')
        .order('measured_at', { ascending: false })
        .limit(1000); // Traemos más datos para el mapa
      
      if (err) throw err;
      setMeasurements((data ?? []) as SoilMeasurement[]);
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
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa GIS & Heatmaps</h1>
          <p className="text-terra-muted text-sm mt-1">Visualización geoespacial interactiva de tus cultivos.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-4 text-sm shrink-0">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-terra-muted">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-terra-primary border-t-transparent rounded-full animate-spin" />
            <p>Renderizando capas GIS...</p>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex-1 glass-panel rounded-2xl overflow-hidden relative shadow-[0_0_40px_rgba(18,210,113,0.05)] border border-terra-border"
        >
          {measurements.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-terra-muted">
              <MapIcon size={48} className="mb-4 opacity-20" />
              <p>Aún no hay mediciones georreferenciadas.</p>
            </div>
          ) : (
            <div className="absolute inset-0">
              <GisHeatmap measurements={measurements} />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
