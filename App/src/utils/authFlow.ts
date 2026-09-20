export type EntryRoute = 'loading' | 'recovery' | 'welcome' | 'auth' | 'permissions' | 'onboarding-error' | 'approval' | 'onboarding' | 'app';

/** Precedencia única de las barreras de entrada, independiente de las pantallas internas. */
export function resolveEntryRoute(state: {
  loading: boolean;
  recovery: boolean;
  welcomeComplete: boolean;
  userId: string | null;
  permissionsUserId: string | null;
  permissionsReviewed: boolean;
  onboardingUserId: string | null;
  checkingOnboarding: boolean;
  onboardingError: boolean;
  onboardingComplete: boolean;
  awaitingApproval: boolean;
}): EntryRoute {
  if (state.loading) return 'loading';
  if (state.recovery) return 'recovery';
  if (!state.welcomeComplete) return 'welcome';
  if (!state.userId) return 'auth';
  if (state.permissionsUserId !== state.userId) return 'loading';
  if (!state.permissionsReviewed) return 'permissions';
  if (state.checkingOnboarding || state.onboardingUserId !== state.userId) return 'loading';
  if (state.onboardingError) return 'onboarding-error';
  if (state.onboardingComplete) return 'app';
  if (state.awaitingApproval) return 'approval';
  return 'onboarding';
}
