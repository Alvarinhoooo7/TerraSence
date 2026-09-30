/**
 * Descarta las respuestas de consultas antiguas: sólo la última consulta iniciada (y no
 * invalidada) entrega su resultado. Sirve para no pisar un estado nuevo con una lectura lenta.
 */
export function createLatestOnly() {
  let revision = 0;
  return {
    /** Ejecuta `work` y aplica su resultado sólo si nadie inició otra consulta ni invalidó mientras tanto. */
    run: async <T>(work: () => Promise<T>, apply: (value: T) => void): Promise<void> => {
      const mine = ++revision;
      const value = await work();
      if (mine === revision) apply(value);
    },
    /** Descarta lo que esté en vuelo (por ejemplo, al empezar una acción o al desmontar). */
    invalidate: () => { revision += 1; },
  };
}
