export function createQrScanGate(now: () => number = Date.now, delay = 1000) {
  let readyAt = Infinity;
  let locked = true;
  const rejected = new Set<string>();
  return {
    arm(clearRejected = false) { if (clearRejected) rejected.clear(); locked = false; readyAt = now() + delay; },
    accept(payload: string) { if (locked || now() < readyAt || rejected.has(payload.trim())) return false; locked = true; return true; },
    reject(payload: string) { rejected.add(payload.trim()); },
    cancel() { locked = true; readyAt = Infinity; },
  };
}
