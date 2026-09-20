import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import {
  DEFAULT_APP_PREFERENCES,
  normalizePreferences,
  serializePreferences,
  type AppPreferences,
} from '../types/preferences';

import { createKeyedLock } from '../utils/keyedLock';
const preferenceLock = createKeyedLock();

const keyFor = (uid: string) => `@terrasense/preferences/${uid}`;
const dirtyKeyFor = (uid: string) => `@terrasense/preferences_dirty/${uid}`;

async function currentUserId(): Promise<string | null> {
  // getSession lee la sesión persistida localmente; getUser valida contra la
  // red y haría imposible cambiar preferencias en pleno modo campo.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

async function readLocal(uid: string): Promise<AppPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    return raw ? normalizePreferences(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

async function writeRemote(uid: string, preferences: AppPreferences): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ app_preferences: serializePreferences(preferences) })
    .eq('id', uid);
  if (error) throw error;
}

/** Carga remota con caché local y reintento de cambios hechos sin cobertura. */
async function loadPreferencesUnlocked(uid: string | null): Promise<AppPreferences> {
  if (!uid) return DEFAULT_APP_PREFERENCES;

  const local = await readLocal(uid);
  const dirty = (await AsyncStorage.getItem(dirtyKeyFor(uid))) === '1';

  if (dirty && local) {
    try {
      await writeRemote(uid, local);
      await AsyncStorage.removeItem(dirtyKeyFor(uid));
    } catch {
      return local;
    }
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('app_preferences')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    const preferences = normalizePreferences(data?.app_preferences);
    await AsyncStorage.setItem(keyFor(uid), JSON.stringify(preferences));
    return preferences;
  } catch {
    return local ?? DEFAULT_APP_PREFERENCES;
  }
}

/** Guarda primero en el teléfono; la nube se sincroniza cuando haya cobertura. */
async function savePreferencesUnlocked(preferences: AppPreferences, uid: string | null): Promise<void> {
  if (!uid) throw new Error('La sesión expiró. Vuelve a iniciar sesión.');

  await AsyncStorage.multiSet([[keyFor(uid), JSON.stringify(preferences)], [dirtyKeyFor(uid), '1']]);
  try {
    await writeRemote(uid, preferences);
    await AsyncStorage.removeItem(dirtyKeyFor(uid));
  } catch {
    // El cambio ya está aplicado localmente y se reenviará al cargar la cuenta.
  }
}

export async function loadPreferences(): Promise<AppPreferences> { const uid = await currentUserId(); return preferenceLock('preferences', () => loadPreferencesUnlocked(uid)); }
export async function savePreferences(preferences: AppPreferences): Promise<void> { const uid = await currentUserId(); return preferenceLock('preferences', () => savePreferencesUnlocked(preferences, uid)); }

export async function syncPendingPreferences(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await preferenceLock('preferences', async () => {
    if (await AsyncStorage.getItem(dirtyKeyFor(uid)) !== '1') return;
    const local = await readLocal(uid);
    if (!local) return;
    await writeRemote(uid, local);
    await AsyncStorage.removeItem(dirtyKeyFor(uid));
  });
}
