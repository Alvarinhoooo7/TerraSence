// Aviso de batería baja dentro de la app. No es una push: se decide en cada contacto BLE
// con la batería que informa la sonda.
//
// Avisa una vez al bajar del 15 % (≈ 3,70 V con la curva sin calibrar del firmware) y se
// rearma sólo al superar el 20 %, la misma histéresis que el firmware aplica a su zumbador
// entre 3,40 V y 3,50 V (Firmware/TASK.md, F2). El estado es por cuenta y equipo.

export const LOW_BATTERY_PERCENT = 15;
export const LOW_BATTERY_REARM_PERCENT = 20;

export type BatteryWarningState = 'armed' | 'warned';

export interface BatteryWarningStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Sin dato (sonda sin celda o firmware sin estado) no avisa ni rearma. */
export function nextBatteryWarning(
  percent: number | null | undefined,
  previous: BatteryWarningState,
): { warn: boolean; state: BatteryWarningState } {
  if (percent == null || !Number.isFinite(percent)) return { warn: false, state: previous };
  if (percent <= LOW_BATTERY_PERCENT) return { warn: previous === 'armed', state: 'warned' };
  if (percent > LOW_BATTERY_REARM_PERCENT) return { warn: false, state: 'armed' };
  return { warn: false, state: previous };
}

export const batteryWarningKey = (userId: string, deviceCode: string) =>
  `@terrasense/battery-warning-v1/${userId}/${deviceCode}`;

/**
 * Devuelve si hay que avisar ahora. Un fallo del almacenamiento no avisa y nunca lanza:
 * el aviso no puede interrumpir una lectura.
 */
export async function checkLowBattery(
  storage: BatteryWarningStorage,
  userId: string | null | undefined,
  deviceCode: string | null | undefined,
  percent: number | null | undefined,
): Promise<boolean> {
  if (!userId || !deviceCode || percent == null) return false;
  const key = batteryWarningKey(userId, deviceCode);
  try {
    const stored = await storage.getItem(key);
    const previous: BatteryWarningState = stored === 'warned' ? 'warned' : 'armed';
    const { warn, state } = nextBatteryWarning(percent, previous);
    if (state !== previous) await storage.setItem(key, state);
    return warn;
  } catch {
    return false;
  }
}
