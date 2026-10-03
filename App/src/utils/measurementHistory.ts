import type { MeasurementPoint } from '../types/app';

/** undefined mantiene compatibilidad; null consulta todas las sondas explícitamente. */
export function measurementHistoryScope(selectedDeviceId: string | undefined, historyDeviceId: string | null | undefined) {
  return historyDeviceId === undefined ? selectedDeviceId : historyDeviceId;
}

/** Une cachés antiguos sin convertir lecturas respaldadas en pendientes. */
export function mergeCachedHistories(histories: MeasurementPoint[][]): MeasurementPoint[] {
  const points = new Map<string, MeasurementPoint>();
  for (const history of histories) {
    for (const point of history) {
      const key = point.clientUuid ?? point.id;
      const previous = points.get(key);
      if (!previous || (previous.isPending && !point.isPending)) points.set(key, point);
    }
  }
  return [...points.values()].sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
}

/** Server confirmation wins over a pending copy, even when their row IDs differ. */
export function mergeMeasurementHistory(remote: MeasurementPoint[], pending: MeasurementPoint[]) {
  const confirmed = new Set(remote.flatMap(p => [p.id, p.clientUuid].filter((id): id is string => !!id)));
  return [...remote, ...pending.filter(p => !confirmed.has(p.clientUuid ?? p.id)).map(p => ({ ...p, isPending: true }))]
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
}
