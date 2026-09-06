import type { MapMeasurementPoint } from '../types/app';

/** Server confirmation wins over a pending copy, even when their row IDs differ. */
export function mergeMeasurementHistory(remote: MapMeasurementPoint[], pending: MapMeasurementPoint[]) {
  const confirmed = new Set(remote.flatMap(p => [p.id, p.clientUuid].filter((id): id is string => !!id)));
  return [...remote, ...pending.filter(p => !confirmed.has(p.clientUuid ?? p.id)).map(p => ({ ...p, isPending: true }))]
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
}
