export type PermissionKind = 'bluetooth' | 'location' | 'camera' | 'notifications';
export type PermissionState = {
  /** `restricted`: bloqueado por el propio teléfono (control parental, perfil); Ajustes puede no resolverlo. */
  status: 'undetermined' | 'granted' | 'denied' | 'restricted' | 'unavailable' | 'error';
  /** false: el sistema ya no mostrará su diálogo; el cambio se hace en los ajustes del teléfono. */
  canAskAgain: boolean;
  poweredOff?: boolean;
  /** Ubicación concedida con precisión reducida (iOS) o aproximada (Android). */
  approximate?: boolean;
  /** iOS: avisos provisionales o efímeros, que llegan en silencio. */
  provisional?: boolean;
};
export type PermissionSnapshot = Record<PermissionKind, PermissionState>;
export const PERMISSION_KINDS: PermissionKind[] = ['bluetooth', 'location', 'camera', 'notifications'];

export function toPermissionState(response: { granted: boolean; status: string; canAskAgain: boolean }): PermissionState {
  return {
    status: response.granted ? 'granted' : response.status === 'denied' ? 'denied' : 'undetermined',
    canAskAgain: response.canAskAgain,
  };
}

/** Estar apagado no equivale a haber rechazado el permiso. */
export function bluetoothState(state: string): PermissionState {
  if (state === 'PoweredOn' || state === 'PoweredOff') return { status: 'granted', canAskAgain: false, poweredOff: state === 'PoweredOff' };
  if (state === 'Unauthorized') return { status: 'denied', canAskAgain: false };
  if (state === 'Unsupported') return { status: 'unavailable', canAskAgain: false };
  return { status: 'undetermined', canAskAgain: true };
}

export function iosBluetoothAuthorizationState(authorization: string): PermissionState {
  if (authorization === 'granted') return { status: 'granted', canAskAgain: false };
  if (authorization === 'denied') return { status: 'denied', canAskAgain: false };
  if (authorization === 'restricted') return { status: 'restricted', canAskAgain: false };
  if (authorization === 'undetermined') return { status: 'undetermined', canAskAgain: true };
  return { status: 'error', canAskAgain: true };
}

/**
 * Android no informa directamente si un permiso nunca se pidió o quedó bloqueado:
 * `check` sólo dice si está concedido. `shouldShowRequestPermissionRationale` es
 * verdadero tras un rechazo que todavía admite otra solicitud, y la marca `asked`
 * (por instalación) separa «nunca se pidió» de «el sistema ya no preguntará».
 */
export function androidRuntimeState({ granted, rationale, asked }: { granted: boolean; rationale: boolean; asked: boolean }): PermissionState {
  if (granted) return { status: 'granted', canAskAgain: false };
  if (rationale) return { status: 'denied', canAskAgain: true };
  if (asked) return { status: 'denied', canAskAgain: false };
  return { status: 'undetermined', canAskAgain: true };
}

/** Resultado de una solicitud múltiple de Android (Bluetooth usa SCAN y CONNECT). */
export function androidRequestState(results: string[]): PermissionState {
  if (results.length && results.every(result => result === 'granted')) return { status: 'granted', canAskAgain: false };
  if (results.some(result => result === 'never_ask_again')) return { status: 'denied', canAskAgain: false };
  return { status: 'denied', canAskAgain: true };
}

/** La precisión reducida sigue siendo una autorización utilizable, no un rechazo. */
export function locationState(response: {
  granted: boolean; status: string; canAskAgain: boolean;
  ios?: { accuracy?: string }; android?: { accuracy?: string };
}): PermissionState {
  const state = toPermissionState(response);
  if (state.status !== 'granted') return state;
  const approximate = response.ios?.accuracy === 'reduced' || response.android?.accuracy === 'coarse';
  return approximate ? { ...state, approximate } : state;
}

/** Los avisos provisionales de iOS cuentan como autorización, pero silenciosa. */
export function notificationState(response: { granted: boolean; status: string; canAskAgain: boolean }, provisional: boolean): PermissionState {
  const state = toPermissionState({ ...response, granted: response.granted || provisional });
  return provisional ? { ...state, provisional } : state;
}

/**
 * Marca por instalación, no por cuenta: los permisos pertenecen al teléfono y se
 * reinician al desinstalar la app, igual que AsyncStorage.
 */
export const permissionAskedKey = (kind: PermissionKind) => `@terrasense/permission-asked-v1/${kind}`;

export const permissionsReviewKey = (userId: string) => `@terrasense/permissions-review-v1/${userId}`;
type ReviewStorage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };

/** Sólo guarda la revisión de la etapa; nunca guarda autorizaciones del sistema. */
export async function hasReviewedPermissions(storage: ReviewStorage, userId: string): Promise<boolean> {
  if (!userId) return false;
  return (await storage.getItem(permissionsReviewKey(userId))) === 'reviewed';
}

export async function markPermissionsReviewed(storage: ReviewStorage, userId: string): Promise<void> {
  if (!userId) throw new Error('Missing account');
  await storage.setItem(permissionsReviewKey(userId), 'reviewed');
}
