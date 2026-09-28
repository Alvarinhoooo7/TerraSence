import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { DEFAULT_APP_PREFERENCES, normalizePreferences, serializePreferences, type AppPreferences, type AppLanguage } from '../types/preferences';
import { createKeyedLock } from '../utils/keyedLock';
import { timedOperation } from '../utils/timedOperation';

const preferenceLock = createKeyedLock();
const keyFor = (uid: string) => '@terrasense/preferences/' + uid;
const dirtyKeyFor = (uid: string) => '@terrasense/preferences_dirty/' + uid;
const pendingLanguageKeyFor = (uid: string) => '@terrasense/language_pending/' + uid;
const ENTRY_LANGUAGE_KEY = '@terrasense/entry-language-v1';
const ENTRY_INTENT_KEY = '@terrasense/entry-language-intent-v1';
const validLanguage = (value: string | null): AppLanguage | null => value === 'es' || value === 'en' ? value : null;

async function currentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

async function requireAccount(uid: string) {
  if (await currentUserId() !== uid) throw new Error('La cuenta cambió durante la operación.');
}

async function readLocal(uid: string): Promise<AppPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    return raw ? normalizePreferences(JSON.parse(raw)) : null;
  } catch { return null; }
}

/** Disponible antes de autenticar y sin consultar la red. */
export async function loadEntryLanguage(): Promise<{ language: AppLanguage; selected: boolean }> {
  const language = validLanguage(await AsyncStorage.getItem(ENTRY_LANGUAGE_KEY));
  return { language: language ?? DEFAULT_APP_PREFERENCES.language, selected: !!language };
}

export async function chooseEntryLanguage(language: AppLanguage): Promise<void> {
  await preferenceLock('entry-language', () => AsyncStorage.multiSet([
    [ENTRY_LANGUAGE_KEY, language], [ENTRY_INTENT_KEY, language],
  ]));
}

/** Consumir la intención antes de cualquier red la asigna a una sola cuenta. */
async function claimEntryLanguage(uid: string) {
  await preferenceLock('entry-language', async () => {
    await requireAccount(uid);
    const explicit = validLanguage(await AsyncStorage.getItem(ENTRY_INTENT_KEY));
    if (!explicit) return;
    await AsyncStorage.setItem(pendingLanguageKeyFor(uid), explicit);
    await AsyncStorage.removeItem(ENTRY_INTENT_KEY);
  });
}

export async function cachedAccountPreferences(uid: string): Promise<AppPreferences | null> {
  const local = await readLocal(uid);
  const pending = validLanguage(await AsyncStorage.getItem(pendingLanguageKeyFor(uid)));
  return pending ? { ...(local ?? DEFAULT_APP_PREFERENCES), language: pending } : local;
}

async function remoteOperation<T>(run: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  return timedOperation(Promise.resolve(run(controller.signal)), 3500, () => controller.abort(), 'La conexión tardó demasiado.');
}

async function writeRemote(uid: string, preferences: AppPreferences): Promise<void> {
  await requireAccount(uid);
  const { data, error } = await remoteOperation(signal => supabase.from('profiles')
    .update({ app_preferences: serializePreferences(preferences) }).eq('id', uid)
    .select('id').abortSignal(signal).single());
  if (error) throw error;
  // Un UPDATE que afectó cero filas no permite dar por sincronizada la preferencia.
  if (data?.id !== uid) throw new Error('No se pudo guardar el perfil de esta cuenta.');
}

async function reconcileUnlocked(uid: string): Promise<AppPreferences> {
  const local = await readLocal(uid);
  const pending = validLanguage(await AsyncStorage.getItem(pendingLanguageKeyFor(uid)));
  const dirty = await AsyncStorage.getItem(dirtyKeyFor(uid)) === '1';
  const installation = validLanguage(await AsyncStorage.getItem(ENTRY_LANGUAGE_KEY)) ?? DEFAULT_APP_PREFERENCES.language;
  let result = { ...(local ?? { ...DEFAULT_APP_PREFERENCES, language: installation }),
    ...(pending ? { language: pending } : {}) };
  try {
    await requireAccount(uid);
    if (!(dirty && local)) {
      const { data, error } = await remoteOperation(signal => supabase.from('profiles')
        .select('app_preferences').eq('id', uid).abortSignal(signal).maybeSingle());
      if (error) throw error;
      if (!data) throw new Error('El perfil aún no está disponible.');
      const remote = normalizePreferences(data.app_preferences);
      result = pending ? { ...remote, language: pending } : remote;
    }
    await requireAccount(uid);
    await AsyncStorage.setItem(keyFor(uid), JSON.stringify(result));
    if (pending || dirty) {
      await writeRemote(uid, result);
      await AsyncStorage.multiRemove([pendingLanguageKeyFor(uid), dirtyKeyFor(uid)]);
    }
  } catch {
    // El idioma pendiente está aislado por cuenta. No guardar defaults como una
    // edición completa si nunca se pudo leer el perfil: sobrescribirían sus ajustes.
  }
  return result;
}

export async function reconcileAccountLanguage(uid: string): Promise<AppPreferences> {
  return preferenceLock('preferences', async () => {
    await claimEntryLanguage(uid);
    const result = await reconcileUnlocked(uid);
    if (await currentUserId() === uid) await AsyncStorage.setItem(ENTRY_LANGUAGE_KEY, result.language);
    return result;
  });
}

export async function loadPreferences(): Promise<AppPreferences> {
  const uid = await currentUserId();
  return uid ? preferenceLock('preferences', () => reconcileUnlocked(uid)) : DEFAULT_APP_PREFERENCES;
}

/** Guarda primero en el teléfono; el respaldo se reintenta al recuperar cobertura. */
export async function savePreferences(preferences: AppPreferences): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error('La sesión expiró. Vuelve a iniciar sesión.');
  await preferenceLock('preferences', async () => {
    await requireAccount(uid);
    await AsyncStorage.multiSet([[keyFor(uid), JSON.stringify(preferences)], [dirtyKeyFor(uid), '1']]);
    // Esta edición explícita sustituye cualquier idioma anterior aún pendiente.
    await AsyncStorage.removeItem(pendingLanguageKeyFor(uid));
    await AsyncStorage.setItem(ENTRY_LANGUAGE_KEY, preferences.language);
    try {
      await writeRemote(uid, preferences);
      await AsyncStorage.removeItem(dirtyKeyFor(uid));
    } catch { /* La copia local sigue pendiente, incluso si la cuenta cambió. */ }
  });
}

export async function syncPendingPreferences(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await preferenceLock('preferences', async () => {
    if (await AsyncStorage.getItem(dirtyKeyFor(uid)) === '1' ||
        validLanguage(await AsyncStorage.getItem(pendingLanguageKeyFor(uid)))) {
      await reconcileUnlocked(uid);
    }
  });
}
