export type PermissionKind = 'bluetooth' | 'location' | 'camera' | 'notifications';
export type PermissionState = {
  status: 'undetermined' | 'granted' | 'denied' | 'unavailable' | 'error';
  canAskAgain: boolean;
  poweredOff?: boolean;
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
