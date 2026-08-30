import type { DeviceMembershipRow, DeviceRow, OnboardingMethod } from '../types/app';

export interface OnboardingProfileState {
  onboarding_completed_at: string | null;
  onboarding_method: OnboardingMethod | null;
}

export interface DerivedOnboardingState {
  completed: boolean;
  method: OnboardingMethod | null;
  needsProfileRepair: boolean;
}

/**
 * La membresía visible es la autoridad: un sello de perfil huérfano no puede
 * dejar a la cuenta dentro de la app sin ningún equipo operativo.
 */
export function deriveOnboardingState(
  profile: OnboardingProfileState | null,
  devices: DeviceRow[],
  memberships: DeviceMembershipRow[],
): DerivedOnboardingState {
  if (devices.length === 0) {
    return { completed: false, method: null, needsProfileRepair: false };
  }

  const inferredMethod: OnboardingMethod = memberships.some(
    (membership) => membership.is_authorized && membership.role === 'owner',
  )
    ? 'pairing'
    : 'qr';

  return {
    completed: true,
    method: profile?.onboarding_method ?? inferredMethod,
    needsProfileRepair: !profile?.onboarding_completed_at,
  };
}
