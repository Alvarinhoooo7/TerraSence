// Reposo profundo de la sonda (Firmware/TASK.md, F4).
//
// Una sonda con reposo profundo declara la bandera «duerme entre mediciones» (bit 1 del byte de
// banderas de la característica de estado). Duerme sin anuncio BLE: el usuario la despierta con
// dos toques en PAIR antes de medir. Tras una desconexión sigue despierta PROBE_AWAKE_GRACE_MS
// para medir el punto siguiente sin volver a despertarla, y se duerme a los 60 s de despertar si
// nadie se conecta.
//
// La app no puede preguntarle a la sonda cuánto le queda: lo calcula desde la última desconexión.
// Descuenta un margen para avisar «se durmió» un poco antes que el equipo, nunca después.

/** Gracia del firmware tras una desconexión. Debe coincidir con el firmware. */
export const PROBE_AWAKE_GRACE_MS = 120_000;
/** Margen para no prometer segundos que el equipo ya no tiene (relojes y desconexión desfasados). */
export const PROBE_AWAKE_MARGIN_MS = 10_000;

export interface ProbeWakeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const probeSleepsKey = (deviceCode: string) => `@terrasense/probe-sleeps-v1/${deviceCode}`;

const sleeps = new Map<string, boolean>();
const lastDisconnect = new Map<string, number>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

/** Avisa cuando cambia lo que se sabe de alguna sonda (bandera o desconexión). */
export function subscribeProbeWake(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Lo que la sonda declaró en su último contacto; sin contacto, se supone que no duerme. */
export function probeSleeps(deviceCode: string | null | undefined): boolean {
  return !!deviceCode && sleeps.get(deviceCode) === true;
}

/** Si este teléfono ya leyó la bandera de esa sonda (en esta sesión o guardada). */
export function probeSleepsKnown(deviceCode: string | null | undefined): boolean {
  return !!deviceCode && sleeps.has(deviceCode);
}

/** Primera versión del firmware con reposo profundo (Firmware/TASK.md, F4). */
export const FIRST_SLEEPING_FIRMWARE = [1, 2, 0] as const;

/**
 * Pista para un teléfono que todavía no conversó con la sonda: la versión que la sonda informó a
 * la nube en otro contacto. La bandera leída por BLE, cuando existe, manda sobre esta pista.
 */
export function firmwareDeclaresSleep(version: string | null | undefined): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version?.trim() ?? '');
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  for (let i = 0; i < 3; i++) {
    if (parts[i]! !== FIRST_SLEEPING_FIRMWARE[i]) return parts[i]! > FIRST_SLEEPING_FIRMWARE[i]!;
  }
  return true;
}

/** Hora de la última desconexión de esa sonda en esta sesión, o null. */
export function lastProbeDisconnect(deviceCode: string | null | undefined): number | null {
  return deviceCode ? lastDisconnect.get(deviceCode) ?? null : null;
}

/** Recuerda la bandera en memoria y en el teléfono. Sin dato (firmware sin estado) no cambia nada. */
export async function rememberProbeSleeps(storage: ProbeWakeStorage, deviceCode: string | null | undefined, value: boolean | null | undefined): Promise<void> {
  if (!deviceCode || value == null || sleeps.get(deviceCode) === value) return;
  sleeps.set(deviceCode, value);
  notify();
  await storage.setItem(probeSleepsKey(deviceCode), value ? '1' : '0').catch(() => undefined);
}

/** Carga la bandera guardada de un equipo; lo ya sabido en esta sesión manda sobre lo guardado. */
export async function loadProbeSleeps(storage: ProbeWakeStorage, deviceCode: string | null | undefined): Promise<boolean> {
  if (!deviceCode) return false;
  if (sleeps.has(deviceCode)) return sleeps.get(deviceCode)!;
  const stored = await storage.getItem(probeSleepsKey(deviceCode)).catch(() => null);
  if (stored !== '1' && stored !== '0') return false;
  if (!sleeps.has(deviceCode)) { sleeps.set(deviceCode, stored === '1'); notify(); }
  return sleeps.get(deviceCode)!;
}

/** La app cortó la conexión con la sonda: desde aquí corre la gracia. */
export function recordProbeDisconnect(deviceCode: string | null | undefined, at: number): void {
  if (!deviceCode) return;
  lastDisconnect.set(deviceCode, at);
  notify();
}

/** Milisegundos que la sonda sigue despierta según la app; 0 si duerme o no se sabe. */
export function awakeRemainingMs(disconnectedAt: number | null | undefined, now: number): number {
  if (disconnectedAt == null || !Number.isFinite(disconnectedAt) || now < disconnectedAt) return 0;
  return Math.max(0, disconnectedAt + PROBE_AWAKE_GRACE_MS - PROBE_AWAKE_MARGIN_MS - now);
}

export function probeAwakeRemainingMs(deviceCode: string | null | undefined, now: number): number {
  if (!deviceCode || !probeSleeps(deviceCode)) return 0;
  return awakeRemainingMs(lastDisconnect.get(deviceCode), now);
}

/** «1:24»: minutos y segundos, redondeando hacia arriba para no mostrar 0:00 con tiempo en curso. */
export function formatAwakeCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Sólo para pruebas: olvida todo lo sabido en esta sesión. */
export function resetProbeWakeForTests(): void {
  sleeps.clear();
  lastDisconnect.clear();
  listeners.clear();
}
