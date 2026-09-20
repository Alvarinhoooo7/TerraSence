export function belongsToRetiredGeneration(row: { device_id: string; data_generation?: number }, reset: { device_id: string; generation: number }): boolean {
  return row.device_id === reset.device_id && (row.data_generation ?? 0) < reset.generation;
}

/** Invalidate this device and aggregate caches; preserve other devices offline. */
export function historyCacheAffected(key: string, accountKey: string, deviceId: string): boolean {
  const prefix = `${accountKey}/history/`;
  if (!key.startsWith(prefix)) return false;
  try {
    const scope: unknown = JSON.parse(key.slice(prefix.length));
    return Array.isArray(scope) && scope.length === 2 && (scope[1] === deviceId || scope[1] === null);
  } catch { return false; }
}
