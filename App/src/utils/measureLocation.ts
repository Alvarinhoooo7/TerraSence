// Ubicación opcional al medir. La lectura nunca espera ni depende de ella: sin opción, sin
// permiso, sin señal o con error, las coordenadas quedan nulas y no se consulta el pronóstico.

export type LocationChoice = 'on' | 'off' | null;

export const LOCATION_TIMEOUT_MS = 5000;

/**
 * Sin elección guardada se conserva lo anterior: coordenadas si la ubicación ya estaba
 * autorizada, salvo en Android antiguo, donde ese permiso existe por el Bluetooth.
 */
export function initialIncludeLocation(choice: LocationChoice, granted: boolean, legacyAndroidBluetooth: boolean): boolean {
  const wanted = choice === null ? granted && !legacyAndroidBluetooth : choice === 'on';
  return wanted && granted;
}

/** El permiso se revoca fuera de la app: la opción encendida se apaga y se avisa una vez. */
export function revalidateIncludeLocation(include: boolean, granted: boolean): { include: boolean; lost: boolean } {
  if (!include) return { include: false, lost: false };
  return granted ? { include: true, lost: false } : { include: false, lost: true };
}

export interface CapturedCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/** Con la opción apagada no se pide la posición; un error o el tiempo agotado dan `null`. */
export async function captureLocation<T extends { coords: CapturedCoords }>(
  include: boolean,
  getPosition: () => Promise<T>,
  timeoutMs = LOCATION_TIMEOUT_MS,
): Promise<T['coords'] | null> {
  if (!include) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); });
  try {
    const position = await Promise.race([getPosition().catch(() => null), timeout]);
    return position?.coords ?? null;
  } finally {
    clearTimeout(timer);
  }
}
