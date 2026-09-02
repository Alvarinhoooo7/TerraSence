import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { factoryResetDevice } from '../../../backend/adminApi';

interface FactoryResetModalProps {
  deviceId: string;
  expectedCode: string;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export function FactoryResetModal({ deviceId, expectedCode, onClose, onSuccess }: FactoryResetModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (code !== expectedCode) {
      setError('El código ingresado no coincide con el del equipo.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await factoryResetDevice(deviceId, code);
      if (res.success) {
        onSuccess(res);
      } else {
        setError(res.message || 'Error desconocido al resetear equipo.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-terra-surface border border-verdict-red/30 rounded-2xl p-6 md:p-8 shadow-2xl shadow-verdict-red/10"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-terra-muted hover:text-terra-text"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-verdict-red/10 flex items-center justify-center mb-4">
              <AlertTriangle className="text-verdict-red" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-verdict-red mb-2">Peligro: Reseteo de Fábrica</h2>
            <p className="text-terra-muted text-sm leading-relaxed">
              Estás a punto de borrar todo el historial privado (mediciones, cuadrantes, miembros y alertas) de este equipo. Esta acción es <strong>irreversible</strong> y se utiliza para preparar el equipo antes de transferirlo a un nuevo dueño.
            </p>
          </div>

          <div className="bg-terra-bg p-4 rounded-xl border border-terra-border mb-6">
            <label className="block text-xs font-bold tracking-widest text-terra-muted uppercase mb-2">
              Confirmar Código UUID
            </label>
            <p className="text-xs text-terra-muted mb-3">
              Para confirmar que realmente quieres resetear este equipo, escribe su código exacto de 15 dígitos.
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: 123456789012345"
              className="w-full h-12 rounded-lg border border-verdict-red/30 bg-terra-surface px-4 font-mono text-center tracking-widest text-lg outline-none focus:border-verdict-red"
            />
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-verdict-red/10 text-verdict-red text-sm text-center border border-verdict-red/20">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-terra-border font-semibold text-terra-muted hover:text-terra-text hover:bg-terra-bg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleReset}
              disabled={loading || code.length < 10}
              className="flex-1 py-3 rounded-xl bg-verdict-red text-white font-bold shadow-[0_0_15px_rgba(244,91,91,0.3)] hover:shadow-[0_0_25px_rgba(244,91,91,0.5)] transition-all disabled:opacity-50"
            >
              {loading ? 'Reseteando...' : 'Confirmar Reseteo'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
