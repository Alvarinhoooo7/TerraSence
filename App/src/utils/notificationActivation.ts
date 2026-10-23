import type { PermissionState } from './permissionState';
import type { PushRegistrationStatus } from '../services/notifications';

/** Preferencia, autorización nativa y registro de envío son condiciones distintas. */
export function notificationActivation(permission: PermissionState | null, enabled: boolean, registration: PushRegistrationStatus) {
  if (!permission) return { state: 'checking', action: null } as const;
  if (permission.status === 'error') return { state: 'permission-error', action: 'check' } as const;
  if (permission.status === 'restricted' || permission.status === 'unavailable') return { state: 'unavailable', action: null } as const;
  if (!enabled) return { state: 'preference-off', action: 'enable' } as const;
  if (permission.status !== 'granted') return permission.canAskAgain
    ? { state: 'permission-needed', action: 'request' } as const
    : { state: 'permission-blocked', action: 'settings' } as const;
  if (registration === 'syncing') return { state: 'registering', action: null } as const;
  if (registration !== 'ready') return { state: 'registration-pending', action: 'retry' } as const;
  return { state: permission.provisional ? 'quiet' : 'registered', action: 'settings' } as const;
}
