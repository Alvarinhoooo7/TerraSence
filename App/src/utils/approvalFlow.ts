/** Sólo una solicitud identificada puede completar este flujo; los equipos ajenos se ignoran. */
export function createApprovalTracker(targetDeviceId?: string, discoverPending = false) {
  const targets = new Set<string>(targetDeviceId ? [targetDeviceId] : []);
  let delivered = false;
  return {
    update<T extends { id: string }, P extends { device_id: string }>(pending: P[], devices: T[]) {
      if (discoverPending && !targets.size) pending.forEach(request => targets.add(request.device_id));
      const approved = delivered ? undefined : devices.find(device => targets.has(device.id) && !pending.some(request => request.device_id === device.id));
      if (approved) delivered = true;
      return { approved, requests: pending.filter(request => targets.has(request.device_id)), removed: targets.size > 0 && !approved && !pending.some(request => targets.has(request.device_id)) };
    },
  };
}
/** Las solicitudes previas o ambiguas no pueden identificar una invitación recién enviada. */
export function newPendingTarget(before: { device_id: string }[], after: { device_id: string }[]): string | undefined {
  const existing = new Set(before.map(request => request.device_id));
  const added = [...new Set(after.filter(request => !existing.has(request.device_id)).map(request => request.device_id))];
  return added.length === 1 ? added[0] : undefined;
}
