import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { DEFAULT_APP_PREFERENCES } from '../src/types/preferences';

type Call = { name: string; account: string | null; args: Record<string, unknown> };
const require = createRequire(import.meta.url);
const loader = Module as unknown as { _load: (id: string, ...args: unknown[]) => unknown };
const servicePath = require.resolve('../src/services/notifications');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

/** Carga el servicio con estado de módulo nuevo y dobles de Supabase, Expo y AsyncStorage. */
function harness() {
  const world = {
    account: 'a' as string | null,
    granted: true,
    status: 'granted' as string,
    iosStatus: undefined as number | undefined,
    token: 'ExponentPushToken[a]',
    requestCount: 0,
    tokenGate: null as Promise<void> | null,
    rpcError: null as unknown,
    rpcHang: false,
    rpcGate: null as Promise<void> | null,
    revokeError: null as unknown,
    signOutError: null as unknown,
    signOutOrder: [] as string[],
    projectId: 'project' as string | undefined,
    calls: [] as Call[],
    storage: new Map<string, string>(),
    authListeners: [] as ((event: string) => void)[],
    appStateListeners: [] as ((state: string) => void)[],
    tokenListeners: [] as (() => void)[],
    handler: null as null | ((n: unknown) => Promise<Record<string, boolean>>),
    session: true,
    sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    sessionError: null as Error | null,
    removeErrorKey: null as string | null,
  };
  const fakeNotifications = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 }, AndroidImportance: { DEFAULT: 3 },
    setNotificationHandler: (value: { handleNotification: (n: unknown) => Promise<Record<string, boolean>> }) => { world.handler = value.handleNotification; },
    getPermissionsAsync: async () => ({ granted: world.granted, status: world.status, canAskAgain: true, ios: world.iosStatus === undefined ? undefined : { status: world.iosStatus } }),
    requestPermissionsAsync: async () => { world.requestCount++; return { granted: true, status: 'granted' }; },
    getExpoPushTokenAsync: async () => { if (world.tokenGate) await world.tokenGate; return { data: world.token }; },
    setNotificationChannelAsync: async () => {}, deleteNotificationChannelAsync: async () => {},
    addPushTokenListener: (listener: () => void) => { world.tokenListeners.push(listener); return { remove: () => {} }; },
  };
  const fakeSupabase = {
    auth: {
      getSession: async () => ({ data: { session: world.account && world.session ? {
        user: { id: world.account },
        access_token: `x.${Buffer.from(JSON.stringify({ session_id: world.sessionId })).toString('base64url')}.y`,
      } : null }, error: world.sessionError }),
      signOut: async (options?: { scope?: string }) => {
        world.calls.push({ name: 'signOut', account: world.account, args: { scope: options?.scope ?? null } });
        if (!world.signOutError) {
          world.session = false;
          world.authListeners.forEach(listener => listener('SIGNED_OUT'));
        }
        return { error: world.signOutError };
      },
      onAuthStateChange: (listener: (event: string) => void) => { world.authListeners.push(listener); return { data: { subscription: { unsubscribe: () => {} } } }; },
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      world.calls.push({ name, account: world.account, args });
      if (world.rpcHang) return new Promise(() => {});
      if (world.rpcGate) await world.rpcGate;
      // Como supabase-js: los fallos llegan como `{ error }`, no como excepción.
      return { error: name.startsWith('revoke') ? (world.revokeError ?? world.rpcError) : world.rpcError };
    },
  };
  const signedIn = () => !!world.account && world.session;
  const original = loader._load;
  loader._load = (id, ...args) => {
    if (id === 'react-native') return { Platform: { OS: 'ios' }, AppState: { addEventListener: (_: string, listener: (state: string) => void) => { world.appStateListeners.push(listener); return { remove: () => {} }; } } };
    if (id === '@react-native-async-storage/async-storage') return { getItem: async (key: string) => world.storage.get(key) ?? null, setItem: async (key: string, value: string) => { world.storage.set(key, value); }, removeItem: async (key: string) => { if (world.removeErrorKey === key) { world.removeErrorKey = null; throw new Error('storage caído'); } world.storage.delete(key); } };
    if (id === 'expo-crypto') return { randomUUID: () => '12345678-1234-4234-8234-123456789abc', getRandomBytes: () => new Uint8Array(32).fill(7) };
    if (id === 'expo-notifications') return fakeNotifications;
    if (id === 'expo-device') return { isDevice: true };
    if (id === 'expo-constants') return { get expoConfig() { return { extra: { eas: { projectId: world.projectId } } }; } };
    if (id === './supabase') return { supabase: fakeSupabase };
    if (id === '../store/useAppStore') return { useAppStore: { getState: () => ({ preferences: DEFAULT_APP_PREFERENCES }) } };
    if (id === '../store/useAuthStore') return { useAuthStore: { getState: () => ({ session: signedIn() ? { user: { id: world.account } } : null }) } };
    return original.call(Module, id, ...args);
  };
  delete require.cache[servicePath];
  let service: typeof import('../src/services/notifications');
  try { service = require('../src/services/notifications'); } finally { loader._load = original; }
  return { world, service };
}

const registrations = (calls: Call[]) => calls.filter(call => call.name === 'register_push_installation');
const off = { ...DEFAULT_APP_PREFERENCES, notifications: { device: false } };

test('identidad persistente, permiso consultado y dos cuentas serializadas', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken(DEFAULT_APP_PREFERENCES);
  world.account = 'b';
  service.setPushRegistrationUser('b');
  await service.registerPushToken(DEFAULT_APP_PREFERENCES);
  const calls = registrations(world.calls);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].account, 'a');
  assert.equal(calls[1].account, 'b');
  assert.equal(calls[0].args.p_installation_id, calls[1].args.p_installation_id, 'la instalación es del teléfono, no de la cuenta');
  assert.equal(calls[0].args.p_installation_secret, calls[1].args.p_installation_secret);
  assert.match(String(calls[0].args.p_installation_secret), /^[0-9a-f]{64}$/);
  assert.equal(calls[0].args.p_expo_push_token, 'ExponentPushToken[a]');
  assert.equal(calls[0].args.p_permission, 'granted');
  assert.equal(calls[0].args.p_platform, 'ios');
  assert.equal(world.requestCount, 0);
  assert.ok(world.storage.get('@terrasense/push-installation-v1'), 'la identidad queda guardada');
});

test('una identidad guardada se reutiliza tras reiniciar y una dañada se regenera', async () => {
  const first = harness();
  first.service.setPushRegistrationUser('a');
  await first.service.registerPushToken();
  const saved = first.world.storage.get('@terrasense/push-installation-v1')!;
  const second = harness();
  second.world.storage.set('@terrasense/push-installation-v1', saved);
  second.service.setPushRegistrationUser('a');
  await second.service.registerPushToken();
  assert.equal(registrations(second.world.calls)[0].args.p_installation_secret, JSON.parse(saved).secret);
  const broken = harness();
  broken.world.storage.set('@terrasense/push-installation-v1', '{no es json');
  broken.service.setPushRegistrationUser('a');
  await broken.service.registerPushToken();
  assert.match(String(registrations(broken.world.calls)[0].args.p_installation_id), /^[0-9a-f-]{36}$/);
});

test('sin sesión o sin autorización de la app no se registra nada', async () => {
  const { world, service } = harness();
  await service.registerPushToken();
  assert.equal(world.calls.length, 0, 'la cuenta aún no fue habilitada por la app');
  assert.equal(service.getPushRegistrationStatus(), 'idle');
  service.setPushRegistrationUser('a');
  world.session = false;
  await service.registerPushToken();
  assert.equal(world.calls.length, 0);
  world.session = true;
  service.setPushRegistrationUser('b');
  await service.registerPushToken();
  assert.equal(world.calls.length, 0, 'la habilitación es de otra cuenta');
});

test('permiso retirado o preferencia desactivada limpian el token del servidor sin pedir permiso', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  world.granted = false; world.status = 'denied';
  await service.registerPushToken(DEFAULT_APP_PREFERENCES);
  assert.equal(world.calls.at(-1)?.args.p_expo_push_token, null);
  assert.equal(world.calls.at(-1)?.args.p_permission, 'denied');
  world.status = 'undetermined';
  await service.registerPushToken(DEFAULT_APP_PREFERENCES);
  assert.equal(world.calls.at(-1)?.args.p_permission, 'undetermined');
  world.granted = true; world.status = 'granted';
  await service.registerPushToken(off);
  assert.equal(world.calls.at(-1)?.args.p_expo_push_token, null);
  assert.equal(world.calls.at(-1)?.args.p_permission, 'granted');
  assert.equal(world.requestCount, 0, 'consultar y registrar nunca abre el diálogo del sistema');
});

test('permiso provisional de iOS se informa como provisional y conserva el token', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  world.granted = false; world.status = 'granted'; world.iosStatus = 3;
  await service.registerPushToken(DEFAULT_APP_PREFERENCES);
  assert.equal(world.calls.at(-1)?.args.p_permission, 'provisional');
  assert.equal(world.calls.at(-1)?.args.p_expo_push_token, 'ExponentPushToken[a]');
});

test('cambio de cuenta durante la obtención del token descarta el registro antiguo', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  let release = () => {};
  world.tokenGate = new Promise<void>(resolve => { release = resolve; });
  const oldCall = service.registerPushToken(DEFAULT_APP_PREFERENCES);
  await tick();
  world.account = 'b';
  service.setPushRegistrationUser('b');
  const newCall = service.registerPushToken(DEFAULT_APP_PREFERENCES);
  release(); world.tokenGate = null;
  await Promise.all([oldCall, newCall]);
  assert.equal(world.calls.at(-1)?.account, 'b');
  assert.equal(registrations(world.calls).filter(call => call.account === 'a').length, 0, 'nada se escribe para la cuenta anterior');
  assert.equal(registrations(world.calls).length, 1);
});

test('llamadas encoladas se fusionan: sólo la última llega al servidor', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  let release = () => {};
  world.tokenGate = new Promise<void>(resolve => { release = resolve; });
  const calls = [service.registerPushToken(), service.registerPushToken(), service.registerPushToken()];
  await tick();
  release(); world.tokenGate = null;
  await Promise.all(calls);
  assert.equal(registrations(world.calls).length, 1);
});

test('un fallo deja el estado en error, rechaza y se puede reintentar', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  const seen: string[] = [];
  service.subscribePushRegistration(next => seen.push(next));
  world.rpcError = new Error('Network request failed');
  await assert.rejects(service.registerPushToken(), /Network request failed/);
  assert.equal(service.getPushRegistrationStatus(), 'error');
  world.rpcError = null;
  await service.registerPushToken();
  assert.equal(service.getPushRegistrationStatus(), 'ready');
  assert.deepEqual(seen, ['syncing', 'error', 'syncing', 'ready']);
  world.projectId = undefined;
  await assert.rejects(service.registerPushToken(), /proyecto EAS/);
  assert.equal(service.getPushRegistrationStatus(), 'error');
});

test('token nuevo, primer plano y recuperación de red re-registran a la cuenta habilitada', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  world.appStateListeners.forEach(listener => listener('active'));
  await tick(); await tick(); await tick();
  assert.equal(registrations(world.calls).length, 1);
  world.token = 'ExponentPushToken[nuevo]';
  world.tokenListeners.forEach(listener => listener());
  await tick(); await tick(); await tick();
  assert.equal(registrations(world.calls).length, 2);
  assert.equal(registrations(world.calls)[1].args.p_expo_push_token, 'ExponentPushToken[nuevo]');
  world.appStateListeners.forEach(listener => listener('background'));
  await tick();
  assert.equal(registrations(world.calls).length, 2, 'sólo el primer plano dispara');
  // Sin habilitación de la app, los disparadores automáticos no registran.
  service.setPushRegistrationUser(null);
  world.tokenListeners.forEach(listener => listener());
  await tick(); await tick(); await tick();
  assert.equal(registrations(world.calls).length, 2);
});

test('cerrar sesión revoca sólo esta instalación antes de salir', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  const installation = registrations(world.calls)[0].args.p_installation_id;
  assert.equal(await service.revokePushInstallationForSignOut(), true);
  const revoke = world.calls.at(-1)!;
  assert.equal(revoke.name, 'revoke_push_installation_by_secret');
  assert.equal(revoke.args.p_installation_id, installation);
  assert.equal(Object.keys(revoke.args).sort().join(), 'p_installation_id,p_installation_secret');
  assert.equal(service.getPushRegistrationStatus(), 'idle');
});

test('entre la revocación y SIGNED_OUT nadie vuelve a registrar; después sí', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  await service.revokePushInstallationForSignOut();
  const before = world.calls.length;
  world.appStateListeners.forEach(listener => listener('active'));
  await service.registerPushToken().catch(() => undefined);
  assert.equal(world.calls.length, before, 'la puerta de cierre de sesión está cerrada');
  world.authListeners.forEach(listener => listener('SIGNED_OUT'));
  world.account = 'b';
  service.setPushRegistrationUser('b');
  await service.registerPushToken();
  assert.equal(world.calls.at(-1)?.name, 'register_push_installation');
  assert.equal(world.calls.at(-1)?.account, 'b');
});

test('si el cierre de sesión falla, la cuenta puede volver a registrar', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.revokePushInstallationForSignOut();
  service.resumePushRegistration();
  await service.registerPushToken();
  assert.equal(registrations(world.calls).length, 1);
});

test('sin red el cierre de sesión no se bloquea: falla el servidor o no responde', async () => {
  const failing = harness();
  failing.service.setPushRegistrationUser('a');
  await failing.service.registerPushToken();
  failing.world.rpcError = new Error('Network request failed');
  assert.equal(await failing.service.revokePushInstallationForSignOut(), false);
  const hanging = harness();
  hanging.service.setPushRegistrationUser('a');
  await hanging.service.registerPushToken();
  hanging.world.rpcHang = true;
  const started = Date.now();
  assert.equal(await hanging.service.revokePushInstallationForSignOut(30), false);
  assert.ok(Date.now() - started < 1000, 'la espera está acotada');
});

test('una cuenta que nunca registró push cierra sesión sin crear identidad ni llamar al servidor', async () => {
  const { world, service } = harness();
  assert.equal(await service.revokePushInstallationForSignOut(), true);
  assert.equal(world.calls.length, 0);
  assert.equal(world.storage.size, 0);
});

const PENDING = '@terrasense/push-revoke-pending-v1';

test('con la sesión ya cerrada o inválida la revocación usa el secreto de instalación', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  world.session = false;
  assert.equal(await service.revokePushInstallationForSignOut(), true);
  assert.equal(world.calls.at(-1)?.name, 'revoke_push_installation_by_secret');
  assert.equal(world.storage.has(PENDING), false);
});

test('una revocación sin red queda pendiente y se confirma al volver la red o el primer plano', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  world.rpcError = new Error('Network request failed');
  assert.equal(await service.revokePushInstallationForSignOut(), false);
  assert.equal(world.storage.get(PENDING), '1', 'la marca sobrevive a reiniciar la app');
  world.authListeners.forEach(listener => listener('SIGNED_OUT'));
  world.account = null;
  await assert.rejects(service.flushPendingPushRevocation(), /Network request failed/);
  assert.equal(world.storage.get(PENDING), '1');
  world.rpcError = null;
  world.appStateListeners.forEach(listener => listener('active'));
  await tick(); await tick(); await tick(); await tick();
  assert.equal(world.calls.at(-1)?.name, 'revoke_push_installation_by_secret');
  assert.equal(world.calls.at(-1)?.account, null, 'no necesita sesión');
  assert.equal(world.storage.has(PENDING), false);
  assert.equal(await service.flushPendingPushRevocation(), false, 'sin marca no llama al servidor');
});

test('un registro nuevo antes de volver la red reemplaza la revocación pendiente', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  world.rpcError = new Error('Network request failed');
  await service.revokePushInstallationForSignOut();
  world.authListeners.forEach(listener => listener('SIGNED_OUT'));
  world.rpcError = null;
  world.account = 'b';
  service.setPushRegistrationUser('b');
  await service.registerPushToken();
  assert.equal(world.storage.has(PENDING), false, 'la instalación ya quedó asociada a la cuenta nueva');
  const before = world.calls.length;
  assert.equal(await service.flushPendingPushRevocation(), false);
  assert.equal(world.calls.length, before, 'no revoca el registro de la cuenta nueva');
});

test('el aviso en primer plano sólo se muestra con sesión, categoría activa y payload válido', async () => {
  const { world, service } = harness();
  void service;
  const valid = { request: { content: { data: { alert_id: '12345678-1234-4234-8234-123456789abc', event_type: 'access_request', category: 'device', device_id: null } } } };
  assert.equal((await world.handler!(valid)).shouldShowBanner, true);
  const agronomic = { request: { content: { data: { alert_id: '12345678-1234-4234-8234-123456789abc', event_type: 'critical_soil', category: 'agronomic' } } } };
  const shown = await world.handler!(agronomic);
  assert.equal(shown.shouldShowBanner, false);
  assert.equal(shown.shouldPlaySound, false);
  world.session = false;
  assert.equal((await world.handler!(valid)).shouldShowBanner, false);
});

test('cerrar sesión desde el teléfono revoca primero y cierra con alcance local, nunca global', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  const antes = world.calls.length;
  let hookVisto = false;
  await service.signOutThisPhone(async () => { hookVisto = true; });
  const nuevas = world.calls.slice(antes);
  assert.deepEqual(nuevas.map(call => call.name), ['revoke_push_installation_by_secret', 'signOut'], 'la revocación va antes del cierre');
  assert.deepEqual(nuevas[1].args, { scope: 'local' }, 'no expulsa a la persona de sus otros teléfonos');
  assert.equal(hookVisto, true);
});

test('si el cierre de sesión falla se reanuda el registro, se descarta la marca y se propaga el error', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  world.signOutError = new Error('fallo de cierre');
  await assert.rejects(service.signOutThisPhone(), /fallo de cierre/);
  await tick(); await tick(); await tick(); await tick();
  assert.equal(world.storage.has(PENDING), false, 'sin cierre real no queda una revocación por reintentar');
  assert.equal(registrations(world.calls).length, 2, 'la cuenta vuelve a quedar registrada');
  assert.equal(world.calls.at(-1)?.name, 'register_push_installation');
  // El error del gancho previo también reanuda y no llega a cerrar sesión.
  await assert.rejects(service.signOutThisPhone(async () => { throw new Error('gancho'); }), /gancho/);
  assert.equal(world.calls.filter(call => call.name === 'signOut').length, 1);
});

test('tras un cierre fallido sin red, el primer plano no revoca el registro vigente de la cuenta', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  world.rpcError = new Error('Network request failed');
  world.signOutError = new Error('fallo de cierre');
  await assert.rejects(service.signOutThisPhone(), /fallo de cierre/);
  world.rpcError = null;
  await tick(); await tick(); await tick(); await tick();
  const revocaciones = () => world.calls.filter(call => call.name === 'revoke_push_installation_by_secret').length;
  const antes = revocaciones();
  world.appStateListeners.forEach(listener => listener('active'));
  await tick(); await tick(); await tick(); await tick();
  assert.equal(revocaciones(), antes, 'la cuenta sigue activa: no hay revocación pendiente que aplicar');
  assert.equal(world.calls.at(-1)?.name, 'register_push_installation');
});

test('una revocación tardía queda antes que el registro de la cuenta nueva y no lo pisa', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  let liberar = () => {};
  world.rpcGate = new Promise<void>(resolve => { liberar = resolve; });
  assert.equal(await service.revokePushInstallationForSignOut(20), false, 'la espera acotada vence sin respuesta');
  assert.equal(world.storage.get(PENDING), '1');
  world.authListeners.forEach(listener => listener('SIGNED_OUT'));
  world.account = 'b';
  service.setPushRegistrationUser('b');
  const registro = service.registerPushToken();
  await tick(); await tick();
  assert.equal(registrations(world.calls).filter(call => call.account === 'b').length, 0, 'el registro nuevo espera detrás de la revocación en vuelo');
  const antes = world.calls.length;
  liberar(); world.rpcGate = null;
  await registro;
  assert.deepEqual(world.calls.slice(antes).map(call => call.name), ['register_push_installation'], 'lo último que llega al servidor es el registro nuevo');
  assert.equal(world.calls.at(-1)?.account, 'b');
  assert.equal(world.storage.has(PENDING), false);
  assert.equal(await service.flushPendingPushRevocation(), false);
  assert.equal(world.calls.at(-1)?.name, 'register_push_installation');
});

test('un registro que termina tras iniciarse la salida no borra la marca de revocación pendiente', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  let liberar = () => {};
  world.rpcGate = new Promise<void>(resolve => { liberar = resolve; });
  const enVuelo = service.registerPushToken();
  await tick(); await tick(); await tick();
  world.revokeError = new Error('Network request failed');
  const salida = service.revokePushInstallationForSignOut(500);
  await tick(); await tick();
  liberar(); world.rpcGate = null;
  await enVuelo.catch(() => undefined);
  assert.equal(await salida, false);
  assert.equal(world.storage.get(PENDING), '1', 'la revocación sin red debe poder reintentarse');
});

// --- D01: alcance del cierre de sesión en todos los puntos de salida de la app ---

test('los cierres directos declaran alcance y Ajustes conserva el cierre local', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, relative, sep } = await import('node:path');
  const root = join(import.meta.dirname, '..');
  const files: string[] = [join(root, 'App.tsx')];
  const walk = (dir: string) => readdirSync(dir).forEach(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path); else if (/\.tsx?$/.test(name)) files.push(path);
  });
  walk(join(root, 'src'));
  for (const file of files) {
    // Sin comentarios: la justificación de una decisión puede nombrar un alcance sin usarlo.
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const match of source.matchAll(/auth\s*\.\s*signOut\(([^)]*)\)/g)) {
      assert.match(match[1], /scope:\s*'(local|global)'/, `${relative(root, file).split(sep).join('/')}: todo cierre directo declara su alcance`);
    }
    assert.doesNotMatch(source, /scope:\s*'others'/, `${relative(root, file)}: no se usa el alcance parcial`);
  }
  const settings = readFileSync(join(root, 'src', 'screens', 'FieldSettingsScreen.tsx'), 'utf8');
  const recovery = readFileSync(join(root, 'src', 'screens', 'ResetPasswordScreen.tsx'), 'utf8');
  assert.match(settings, /signOutThisPhone\(/);
  assert.match(recovery, /finishPasswordRecoveryClosure\(/);
  assert.match(recovery, /cancelPasswordRecoveryClosure\(/);
});

test('la recuperación revoca push en servidor y cierra todas las sesiones', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  await service.beginPasswordRecoveryClosure();
  assert.equal(world.calls.at(-1)?.name, 'revoke_push_for_password_recovery',
    'la barrera se confirma antes de que la pantalla guarde la contraseña');
  const antes = world.calls.length;
  await service.finishPasswordRecoveryClosure();
  assert.deepEqual(world.calls.slice(antes).map(call => call.name),
    ['revoke_push_for_password_recovery', 'signOut']);
  assert.deepEqual(world.calls.at(-1)?.args, { scope: 'global' });
  assert.equal(world.storage.has('@terrasense/password-recovery-pending-v1'), false);
});

test('un fallo parcial conserva la barrera y el reintento termina sin reactivar push', async () => {
  const { world, service } = harness();
  service.setPushRegistrationUser('a');
  await service.registerPushToken();
  await service.beginPasswordRecoveryClosure();
  world.signOutError = new Error('cierre caído');
  await assert.rejects(service.finishPasswordRecoveryClosure(), /cierre caído/);
  assert.deepEqual(JSON.parse(world.storage.get('@terrasense/password-recovery-pending-v1')!),
    { userId: 'a', sessionId: world.sessionId });
  const before = registrations(world.calls).length;
  await service.registerPushToken();
  assert.equal(registrations(world.calls).length, before);
  world.signOutError = null;
  await service.cancelPasswordRecoveryClosure();
  assert.deepEqual(world.calls.at(-1)?.args, { scope: 'global' });
});

test('un inicio nuevo de la misma cuenta descarta una marca que no pudo borrarse', async () => {
  const { world, service } = harness();
  await service.beginPasswordRecoveryClosure();
  world.removeErrorKey = '@terrasense/password-recovery-pending-v1';
  await assert.rejects(service.finishPasswordRecoveryClosure(), /storage caído/);
  const before = world.calls.length;
  world.sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  world.session = true;
  assert.equal(await service.flushPendingPasswordRecoveryClosure(), true);
  assert.equal(world.calls.length, before, 'no cierra la sesión nueva');
  assert.equal(world.storage.has('@terrasense/password-recovery-pending-v1'), false);
});

test('un error al leer Auth conserva la marca y permite reintentar', async () => {
  const { world, service } = harness();
  world.storage.set('@terrasense/password-recovery-pending-v1', JSON.stringify({ userId: 'a', sessionId: world.sessionId }));
  world.sessionError = new Error('Auth sin respuesta');
  await assert.rejects(service.flushPendingPasswordRecoveryClosure(), /Auth sin respuesta/);
  assert.equal(world.storage.has('@terrasense/password-recovery-pending-v1'), true);
});

test('tras cerrar Auth, finalizar o cancelar reintenta sólo la limpieza local pendiente', async () => {
  for (const action of ['finishPasswordRecoveryClosure', 'cancelPasswordRecoveryClosure'] as const) {
    const { world, service } = harness();
    await service.beginPasswordRecoveryClosure();
    world.removeErrorKey = '@terrasense/password-recovery-pending-v1';
    await assert.rejects(service.finishPasswordRecoveryClosure(), /storage caído/);
    assert.equal(world.session, false);
    const before = world.calls.length;
    await service[action]();
    assert.equal(world.calls.length, before, 'no exige una sesión que ya se cerró');
    assert.equal(world.storage.has('@terrasense/password-recovery-pending-v1'), false);
    assert.equal(service.getPushRegistrationStatus(), 'idle');
  }
});

test('finalizar no cierra ni bloquea el registro push de una sesión distinta', async () => {
  const { world, service } = harness();
  await service.beginPasswordRecoveryClosure();
  world.account = 'b';
  world.sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await assert.rejects(service.finishPasswordRecoveryClosure(), /sesión de recuperación cambió/);
  assert.equal(world.calls.some(call => call.name === 'signOut'), false);
  await service.flushPendingPasswordRecoveryClosure();
  service.setPushRegistrationUser('b');
  await service.registerPushToken();
  assert.equal(world.calls.at(-1)?.name, 'register_push_installation');
});

test('finalizaciones concurrentes comparten una revocación y un cierre', async () => {
  const { world, service } = harness();
  await service.beginPasswordRecoveryClosure();
  let release = () => {};
  world.rpcGate = new Promise<void>(resolve => { release = resolve; });
  const first = service.finishPasswordRecoveryClosure();
  const second = service.flushPendingPasswordRecoveryClosure();
  await tick(); await tick();
  release();
  await Promise.all([first, second]);
  assert.equal(world.calls.filter(call => call.name === 'revoke_push_for_password_recovery').length, 2,
    'una llamada al comenzar y una sola al finalizar');
  assert.equal(world.calls.filter(call => call.name === 'signOut').length, 1);
});
