import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { listMyDeviceMemberships, listMyDevices } from './deviceService';
import type { DeviceRow, OnboardingMethod } from '../types/app';
import {
  deriveOnboardingState,
  type OnboardingProfileState,
} from '../utils/onboardingState';

export interface OnboardingState {
  completed: boolean;
  method: OnboardingMethod | null;
  devices: DeviceRow[];
}

const cacheKey = (uid: string) => `@terrasense/onboarding/${uid}`;

async function sessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function readCachedState(uid: string): Promise<OnboardingState | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    return raw ? (JSON.parse(raw) as OnboardingState) : null;
  } catch {
    return null;
  }
}

async function cacheState(uid: string, state: OnboardingState): Promise<void> {
  await AsyncStorage.setItem(cacheKey(uid), JSON.stringify(state)).catch(() => undefined);
}

/**
 * Resuelve el onboarding desde el servidor.
 *
 * Una membresía existente también cuenta como finalización. Esto migra sin
 * fricción a las cuentas creadas antes de que existieran las columnas de
 * onboarding y mantiene el flujo recuperable si el perfil quedó incompleto.
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const uid = await sessionUserId();
  const cached = uid ? await readCachedState(uid) : null;

  try {
    const [devices, memberships, profileResult] = await Promise.all([
      listMyDevices(),
      listMyDeviceMemberships(),
      supabase
        .from('profiles')
        .select('onboarding_completed_at,onboarding_method')
        .maybeSingle(),
    ]);

    if (profileResult.error) throw profileResult.error;

    const profile = profileResult.data as OnboardingProfileState | null;
    const derived = deriveOnboardingState(profile, devices, memberships);

    // Completa en segundo plano el dato nuevo para cuentas antiguas. La membresía
    // ya garantiza que no se vuelva a mostrar la pantalla si este UPDATE falla.
    if (derived.needsProfileRepair) {
      void completeOnboarding(derived.method!, devices[0]).catch(() => undefined);
    }

    const state: OnboardingState = {
      completed: derived.completed,
      method: derived.method,
      devices,
    };
    if (uid) await cacheState(uid, state);
    return state;
  } catch (error) {
    // Un estado completo ya verificado permite reabrir la app en terreno. Una
    // cuenta jamás verificada sigue mostrando reintento y no salta onboarding.
    if (cached?.completed && cached.devices.length > 0) return cached;
    throw error;
  }
}

export async function completeOnboarding(
  method: OnboardingMethod,
  device?: DeviceRow,
): Promise<void> {
  const { error } = await supabase.rpc('complete_my_onboarding', {
    p_method: method,
  });

  if (error) throw error;
  const uid = await sessionUserId();
  if (uid && device) {
    await cacheState(uid, { completed: true, method, devices: [device] });
  }
}
