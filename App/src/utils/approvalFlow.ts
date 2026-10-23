/** Conserva las solicitudes conocidas antes del primer sondeo, aunque ya estén resueltas. */
export function createApprovalTracker(targetDeviceId?: string | readonly string[], discoverPending = false) {
  const targets = new Set<string>(typeof targetDeviceId === 'string' ? [targetDeviceId] : targetDeviceId ?? []);
  let delivered = false;
  return {
    update<T extends { id: string }, P extends { device_id: string }>(pending: P[], devices: T[]) {
      if (discoverPending && !targets.size) pending.forEach(request => targets.add(request.device_id));
      // Sólo la entrada inicial sin objetivo puede reconciliar cualquier acceso actual.
      // Vincular otra sonda siempre exige el identificador solicitado.
      const reconcileInitial = discoverPending && targets.size === 0 && pending.length === 0;
      const approved = delivered ? undefined : devices.find(device => (reconcileInitial || targets.has(device.id)) && !pending.some(request => request.device_id === device.id));
      if (approved) delivered = true;
      return { approved, requests: pending.filter(request => targets.has(request.device_id)), removed: (targets.size > 0 || reconcileInitial) && !approved && !pending.some(request => targets.has(request.device_id)) };
    },
  };
}
