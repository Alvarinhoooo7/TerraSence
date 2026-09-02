import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchDevices } from '../../backend/adminApi';
import type { DeviceSearchResult } from '../../backend/types';
import { Search, ChevronRight, Cpu, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function SupportPanelPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeviceSearchResult[]>([]);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col text-center mt-8 mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-verdict-amber">Panel de Soporte Técnico</h1>
        <p className="text-terra-muted text-sm mt-3 max-w-2xl mx-auto">
          Búsqueda global de hardware. Ingresa el código UUID, nombre de equipo o correo electrónico del usuario para gestionar remotamente el dispositivo.
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto">
        <div className="relative flex items-center shadow-[0_0_30px_rgba(242,169,59,0.05)] rounded-2xl">
          <Search className="absolute left-4 text-verdict-amber/70" size={24} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por UUID, alias o email..."
            className="w-full h-16 rounded-2xl border border-terra-border bg-terra-surface/80 backdrop-blur-md pl-14 pr-32 text-lg outline-none focus:border-verdict-amber transition-all text-terra-text"
          />
          <button 
            type="submit" 
            disabled={searching || query.trim().length < 2}
            className="absolute right-2 h-12 px-6 rounded-xl bg-verdict-amber/10 text-verdict-amber hover:bg-verdict-amber/20 font-bold transition-colors disabled:opacity-50"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-4 text-sm max-w-2xl mx-auto w-full flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Resultados ({results.length})</h2>
          </div>
          
          <div className="grid gap-3">
            {results.map((r, i) => (
              <motion.button
                key={`${r.device_id}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/admin/devices/${r.device_id}`)}
                className="w-full text-left glass-panel p-5 rounded-2xl hover:border-verdict-amber/50 hover:bg-terra-surface transition-all flex items-center justify-between group"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{r.alias || r.name}</span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      r.is_active ? 'bg-terra-primary/10 text-terra-primary' : 'bg-terra-muted/20 text-terra-muted'
                    }`}>
                      {r.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-terra-muted">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Cpu size={14} /> {r.device_code}
                    </div>
                    {r.match_reason === 'member_email' && (
                      <div className="flex items-center gap-1.5 text-verdict-amber/80">
                        <User size={14} /> Vinculado a: {r.matched_member_email}
                      </div>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="text-terra-muted group-hover:text-verdict-amber transition-colors" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {!searching && query && results.length === 0 && !error && (
        <div className="mt-12 text-center text-terra-muted">
          No se encontraron equipos que coincidan con la búsqueda.
        </div>
      )}
    </div>
  );
}
