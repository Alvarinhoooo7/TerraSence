/** Serializa cambios locales por cuenta; fallos no bloquean operaciones futuras. */
export function createKeyedLock() {
  const tails = new Map<string, Promise<unknown>>();
  return function locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const current = (tails.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
    tails.set(key, current);
    const cleanup = () => { if (tails.get(key) === current) tails.delete(key); };
    void current.then(cleanup, cleanup);
    return current;
  };
}
