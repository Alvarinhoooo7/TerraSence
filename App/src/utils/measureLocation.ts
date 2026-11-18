// Ubicación opcional al medir. La lectura nunca espera ni depende de ella: sin opción, sin
// permiso, sin señal o con error, las coordenadas quedan nulas y no se consulta el pronóstico.

export type LocationChoice = 'on' | 'off' | null;

export const LOCATION_TIMEOUT_MS = 5000;

/** Clave donde se guarda la elección de ubicación. */
export const LOCATION_CHOICE_KEY = '@terrasense/measure-location-v1';

export type LocationStep = 'capture' | 'ask' | 'skip';

/**
 * Qué hacer con la ubicación antes de una lectura. La pregunta se hace una sola vez: después
 * queda una elección guardada. Un permiso revocado o que el sistema ya no pregunta no reabre nada,
 * y la elección `on` se conserva: la lectura vuelve a georreferenciarse cuando el permiso regresa.
 * En Android 11 o anterior el permiso existe por el Bluetooth y no equivale a aceptar.
 */
export function nextLocationStep(
  choice: LocationChoice,
  permission: { granted: boolean; canAskAgain: boolean },
  legacyAndroidBluetooth: boolean,
): LocationStep {
  if (choice === 'off') return 'skip';
  if (choice === 'on') return permission.granted ? 'capture' : 'skip';
  if (permission.granted) return legacyAndroidBluetooth ? 'ask' : 'capture';
  return permission.canAskAgain ? 'ask' : 'skip';
}

/** Elección que se guarda después de preguntar: nunca vuelve a quedar en `null`. */
export function choiceAfterAsking(accepted: boolean): Exclude<LocationChoice, null> {
  return accepted ? 'on' : 'off';
}

/** Marca de que ya se avisó el retiro del permiso; se borra cuando el teléfono lo devuelve. */
export const LOCATION_REVOKED_NOTICE_KEY = '@terrasense/measure-location-revoked-notice-v1';

/**
 * Elección después de que el teléfono retiró el permiso: una ubicación aceptada queda activa para
 * siempre. La app no la apaga ni vuelve a preguntar; captura sola en cuanto el permiso vuelve.
 * Sólo la persona la apaga, desde Preferencias.
 */
export function choiceAfterRevocation(choice: LocationChoice): LocationChoice {
  return choice;
}

/** El aviso de permiso retirado sale en la primera lectura de cada retiro, no en todas. */
export function revokedNoticeDue(choice: LocationChoice, granted: boolean, alreadyNoticed: boolean): boolean {
  return choice === 'on' && !granted && !alreadyNoticed;
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
