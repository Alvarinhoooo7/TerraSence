import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchDevices } from '../../backend/adminApi';
import type { DeviceSearchResult } from '../../backend/types';
import { formatDeviceCode, relativeTime } from '../utils/verdict';
import { Search, ChevronRight, Cpu, Mail, AlertCircle, ShieldAlert, Wifi, WifiOff, X } from 'lucide-react';
import { motion } from 'framer-motion';

export function SupportPanelPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeviceSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;

    setSearching(true);
    setError(null);
    try {
      const data = await searchDevices(query);
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setResults([]);
    setQuery('');
    setSearched(false);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* HEADER — mismo patrón tipográfico que el resto de la consola: nada
          de títulos gigantes en color de acento, sólo un badge que marca la
          zona como distinta (soporte, no el flujo normal del agricultor). */}
      <div className="flex items-center gap-4 mt-2">
        <div className="p-2.5 rounded-xl bg-verdict-amber/10 border border-verdict-amber/30 text-verdict-amber shrink-0">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-terra-text">Panel de Soporte</h1>
          <p className="text-terra-muted text-sm mt-1">
            Busca un equipo por su código, nombre, o el correo de un usuario enlazado.
          </p>
        </div>
      </div>

      {/* BUSCADOR — el botón ahora tiene borde propio (antes era invisible
          hasta el hover, por eso "no se delimitaba"). */}
      <form onSubmit={handleSearch} className="glass-panel rounded-2xl p-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-terra-muted" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código de equipo, alias o correo del usuario..."
            className="w-full h-12 rounded-xl border border-terra-border bg-terra-bg/40 pl-11 pr-4 text-sm outline-none focus:border-verdict-amber focus:ring-1 focus:ring-verdict-amber/40 transition-all text-terra-text placeholder:text-terra-muted/70"
          />
        </div>
        {(query || results.length > 0) && (
          <button
            type="button"
            onClick={handleClear}
            title="Limpiar búsqueda"
            className="h-12 w-12 shrink-0 rounded-xl border border-terra-border text-terra-muted hover:text-terra-text hover:bg-terra-surface transition-colors flex items-center justify-center"
          >
            <X size={18} />
          </button>
        )}
        <button
          type="submit"
          disabled={searching || query.trim().length < 2}
          className="h-12 px-6 rounded-xl border border-verdict-amber/40 bg-verdict-amber/10 text-verdict-amber hover:bg-verdict-amber/20 hover:border-verdict-amber/60 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-4 text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-terra-border/50">
            <h2 className="font-semibold text-sm text-terra-muted uppercase tracking-wider">
              {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
            </h2>
          </div>

          <div className="divide-y divide-terra-border/40">
            {results.map((r, i) => {
              const isOnline = r.last_seen_at
                ? Date.now() - new Date(r.last_seen_at).getTime() < 3600_000
                : false;
              return (
                <motion.button
                  key={`${r.device_id}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/admin/devices/${r.device_id}`)}
                  className="w-full text-left px-6 py-4 flex items-center gap-4 border border-transparent hover:border-verdict-amber/30 hover:bg-terra-surface/60 transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-terra-surface border border-terra-border flex items-center justify-center text-terra-primary shrink-0">
                    <Cpu size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-terra-text truncate">{r.alias || r.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          r.is_active
                            ? 'bg-terra-primary/10 text-terra-primary border-terra-primary/30'
                            : 'bg-terra-muted/10 text-terra-muted border-terra-muted/30'
                        }`}
                      >
                        {r.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-terra-muted">
                      <span className="font-mono tabular">{formatDeviceCode(r.device_code)}</span>
                      <span className="flex items-center gap-1">
                        {isOnline ? <Wifi size={12} className="text-terra-primary" /> : <WifiOff size={12} />}
                        {relativeTime(r.last_seen_at)}
                      </span>
                      {r.match_reason === 'member_email' && r.matched_member_email && (
                        <span className="flex items-center gap-1 text-verdict-amber/80">
                          <Mail size={12} /> {r.matched_member_email}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={20} className="text-terra-muted group-hover:text-verdict-amber transition-colors shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {!searching && searched && results.length === 0 && !error && (
        <div className="glass-panel rounded-2xl py-16 text-center text-terra-muted">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          No se encontraron equipos que coincidan con la búsqueda.
        </div>
      )}
    </div>
  );
}
