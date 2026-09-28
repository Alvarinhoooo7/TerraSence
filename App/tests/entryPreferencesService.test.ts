import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import Module, { createRequire } from 'node:module';
import { timedOperation } from '../src/utils/timedOperation';
import { DEFAULT_APP_PREFERENCES, normalizePreferences, serializePreferences } from '../src/types/preferences';

const storage = new Map<string, string>();
const profiles = new Map<string, ReturnType<typeof serializePreferences>>();
let account: string | null = 'a';
let offline = false;
let noUpdatedRow = false;
let storageFails = false;
let waitForRead: (() => Promise<void>) | undefined;
let aborted = 0;
let updates = 0;
const localKey = (uid: string) => '@terrasense/preferences/' + uid;
const pendingKey = (uid: string) => '@terrasense/language_pending/' + uid;
const dirtyKey = (uid: string) => '@terrasense/preferences_dirty/' + uid;

const fakeStorage = {
  async getItem(key: string) { if (storageFails) throw new Error('storage'); return storage.get(key) ?? null; },
  async setItem(key: string, value: string) { if (storageFails) throw new Error('storage'); storage.set(key, value); },
  async removeItem(key: string) { if (storageFails) throw new Error('storage'); storage.delete(key); },
  async multiSet(items: [string, string][]) { for (const [key, value] of items) await fakeStorage.setItem(key, value); },
  async multiRemove(keys: string[]) { for (const key of keys) await fakeStorage.removeItem(key); },
};
const fakeSupabase = {
  auth: { async getSession() { return { data: { session: account ? { user: { id: account } } : null }, error: null }; } },
  from(table: string) {
    assert.equal(table, 'profiles');
    let uid = '';
    let value: ReturnType<typeof serializePreferences> | null = null;
    let signal: AbortSignal;
    const builder = {
      select(_columns: string) { return builder; },
      eq(column: string, id: string) { assert.equal(column, 'id'); uid = id; return builder; },
      update(row: { app_preferences: ReturnType<typeof serializePreferences> }) { value = row.app_preferences; return builder; },
      abortSignal(next: AbortSignal) { signal = next; signal.addEventListener('abort', () => aborted++, { once: true }); return builder; },
      async maybeSingle() {
        const wait = waitForRead;
        waitForRead = undefined;
        if (wait) await wait();
        if (offline) return { data: null, error: new Error('offline') };
        return { data: profiles.has(uid) ? { app_preferences: profiles.get(uid) } : null, error: null };
      },
      async single() {
        if (offline || signal.aborted) return { data: null, error: new Error('offline') };
        if (noUpdatedRow || uid !== account) return { data: null, error: null };
        assert.ok(value);
        profiles.set(uid, value);
        updates++;
        return { data: { id: uid }, error: null };
      },
    };
    return builder;
  },
};

const require = createRequire(import.meta.url);
const loader = Module as unknown as { _load: (id: string, ...args: unknown[]) => unknown };
const original = loader._load;
loader._load = (id, ...args) => {
  if (id === '@react-native-async-storage/async-storage') return fakeStorage;
  if (id === './supabase') return { supabase: fakeSupabase };
  if (id === '../utils/timedOperation') return {
    timedOperation: <T>(work: Promise<T>, _ms: number, cancel: () => void, message: string) => timedOperation(work, 30, cancel, message),
  };
  return original.call(Module, id, ...args);
};
let service: typeof import('../src/services/preferencesService');
try { service = require('../src/services/preferencesService'); } finally { loader._load = original; }

beforeEach(() => {
  storage.clear(); profiles.clear(); account = 'a'; offline = false; noUpdatedRow = false;
  storageFails = false; waitForRead = undefined; aborted = 0; updates = 0;
  profiles.set('a', serializePreferences(normalizePreferences({ theme: 'dark', measurement_system: 'imperial',
    notifications: { weather: false }, guides_seen: { measure: true } })));
  profiles.set('b', serializePreferences(DEFAULT_APP_PREFERENCES));
});

test('el idioma previo al acceso sobrevive al reinicio y conserva otros ajustes remotos', async () => {
  account = null;
  assert.deepEqual(await service.loadEntryLanguage(), { language: 'es', selected: false });
  await service.chooseEntryLanguage('en');
  assert.deepEqual(await service.loadEntryLanguage(), { language: 'en', selected: true });
  const originalProfile = profiles.get('a');
  account = 'a';
  const result = await service.reconcileAccountLanguage('a');
  assert.equal(result.language, 'en');
  assert.deepEqual(profiles.get('a'), { ...originalProfile, language: 'en' });
  assert.equal(storage.has(pendingKey('a')), false);
  assert.equal(updates, 1);
});

test('sin red sólo queda idioma pendiente; reconectar recupera el perfil completo antes de escribir', async () => {
  await service.chooseEntryLanguage('en');
  offline = true;
  assert.equal((await service.reconcileAccountLanguage('a')).language, 'en');
  assert.equal(storage.get(pendingKey('a')), 'en');
  assert.equal(storage.has(localKey('a')), false, 'no guardar defaults como perfil editado');
  offline = false;
  await service.syncPendingPreferences();
  assert.equal(profiles.get('a')?.theme, 'dark');
  assert.equal(profiles.get('a')?.language, 'en');
  assert.equal(storage.has(pendingKey('a')), false);
});

test('los ajustes editados offline prevalecen al reconciliar y se reintentan completos', async () => {
  const desired = normalizePreferences({ theme: 'light', measurement_system: 'imperial', notifications: { sync: true } });
  offline = true;
  await service.savePreferences(desired);
  await service.chooseEntryLanguage('en');
  assert.deepEqual(await service.reconcileAccountLanguage('a'), { ...desired, language: 'en' });
  assert.equal(storage.get(dirtyKey('a')), '1');
  offline = false;
  await service.syncPendingPreferences();
  assert.deepEqual(profiles.get('a'), serializePreferences({ ...desired, language: 'en' }));
  assert.equal(storage.has(dirtyKey('a')), false);
});

test('una actualización sin filas mantiene el idioma pendiente y permite reintentar', async () => {
  await service.chooseEntryLanguage('en'); noUpdatedRow = true;
  await service.reconcileAccountLanguage('a');
  assert.equal(storage.get(pendingKey('a')), 'en');
  noUpdatedRow = false;
  await service.syncPendingPreferences();
  assert.equal(profiles.get('a')?.language, 'en');
});

test('una respuesta de la cuenta anterior no consume la elección de la cuenta nueva', async () => {
  await service.chooseEntryLanguage('en');
  let release!: () => void;
  let started!: () => void;
  const reading = new Promise<void>(resolve => { started = resolve; });
  waitForRead = () => { started(); return new Promise<void>(resolve => { release = resolve; }); };
  const previous = service.reconcileAccountLanguage('a');
  await reading;
  account = 'b';
  await service.chooseEntryLanguage('es');
  const current = service.reconcileAccountLanguage('b');
  release();
  await previous;
  assert.equal((await current).language, 'es');
  assert.equal(storage.get(pendingKey('a')), 'en');
  assert.equal(profiles.get('a')?.language, 'es');
  assert.equal(profiles.get('b')?.language, 'es');
  assert.equal(storage.has(localKey('a')), false);
});

test('un timeout aborta y libera la cola; una lectura tardía no escribe la caché', async () => {
  let release!: () => void;
  waitForRead = () => new Promise<void>(resolve => { release = resolve; });
  await service.reconcileAccountLanguage('a');
  assert.equal(aborted, 1);
  account = 'b';
  await service.reconcileAccountLanguage('b');
  release();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(storage.has(localKey('a')), false);
  assert.ok(storage.has(localKey('b')));
});

test('los fallos de almacenamiento se propagan y la elección puede repetirse', async () => {
  storageFails = true;
  await assert.rejects(service.chooseEntryLanguage('en'));
  storageFails = false;
  await service.chooseEntryLanguage('en');
  assert.deepEqual(await service.loadEntryLanguage(), { language: 'en', selected: true });
});

test('una sesión sin caché ni red conserva el idioma de instalación sin cambiar el perfil remoto', async () => {
  storage.set('@terrasense/entry-language-v1', 'en');
  offline = true;
  assert.equal((await service.reconcileAccountLanguage('a')).language, 'en');
  assert.deepEqual(await service.loadEntryLanguage(), { language: 'en', selected: true });
  assert.equal(storage.has(localKey('a')), false);
  assert.equal(storage.has(pendingKey('a')), false);
  assert.equal(updates, 0);
  offline = false;
  assert.equal((await service.reconcileAccountLanguage('a')).language, 'es');
  assert.deepEqual(await service.loadEntryLanguage(), { language: 'es', selected: true });
});
