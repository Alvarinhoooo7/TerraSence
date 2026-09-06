// src/pages/FirmwarePage.tsx
//
// Ruta /firmware, documentada en Web/README.md §2.3 pero que hasta ahora no
// existía en el enrutador: el catálogo sólo se alcanzaba desde una pestaña
// interna de /devices.
//
// El listado de equipos que se pasa a `FirmwareView` viene de `devices`, que
// está acotada por RLS a los equipos donde la sesión es miembro. Para una
// cuenta de soporte pura eso es una lista vacía, y el aviso de "equipos
// desactualizados" no aparece: se explica en pantalla en vez de dar a entender
// que la flota está al día.

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Info } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Device } from '../types';
import { FirmwareView } from '../components/FirmwareView';

export function FirmwarePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-terra-text flex items-center gap-3">
          <Cpu className="text-terra-primary" size={28} />
          Firmware OTA
        </h1>
        <p className="text-terra-muted text-sm mt-1">
          Catálogo de versiones publicadas para las sondas ESP32.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div className="rounded-xl border border-terra-border bg-terra-surface/40 p-4 flex items-start gap-3 text-sm">
          <Info size={18} className="text-terra-primary shrink-0 mt-0.5" />
          <p className="text-terra-muted">
            El contraste entre versión instalada y versión publicada sólo cubre los equipos
            vinculados a <em>esta</em> cuenta, porque la tabla <code>devices</code> está acotada por
            RLS. Una cuenta de soporte no es miembro de ningún equipo, así que aquí verá cero: para
            revisar el firmware de una sonda concreta usa su ficha en el{' '}
            <span className="text-terra-text">Panel de Soporte</span>.
          </p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel rounded-2xl p-6"
      >
        {loading ? (
          <p className="text-terra-muted">Cargando catálogo…</p>
        ) : (
          <FirmwareView devices={devices} />
        )}
      </motion.div>
    </div>
  );
}
