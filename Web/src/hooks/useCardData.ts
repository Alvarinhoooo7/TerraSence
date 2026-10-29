// src/hooks/useCardData.ts — carga y refresco independientes por tarjeta.
//
// Mientras refresca, la tarjeta conserva lo que ya mostraba (sin parpadeo a
// esqueleto); el esqueleto sólo aparece en la primera carga. Una respuesta que
// llega tarde de un equipo anterior se descarta.
//
// `key` dice cuándo volver a consultar y `resetKey`, cuándo descartar lo que se
// mostraba. Separarlos es lo que permite que cambiar un filtro del mismo equipo
// vuelva a consultar sin vaciar la tabla, mientras cambiar de equipo sí la vacía.

import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyError } from '../../backend/adminApi';

export function useCardData<T>(load: () => Promise<T>, key: string, resetKey: string = key) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (mine === seq.current) setData(result);
    } catch (e) {
      if (mine === seq.current) setError(friendlyError(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
    // `load` es una función nueva en cada render; `key` identifica el equipo.
  }, [key]);

  useEffect(() => {
    setData(null);
  }, [resetKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
