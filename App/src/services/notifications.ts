import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import type { AppPreferences } from '../types/preferences';
import { shouldPresentNotification } from '../utils/notificationRoute';

// Identidad propia de esta instalación: sobrevive a cerrar sesión y cambiar de cuenta.
// El secreto sólo se guarda aquí; el servidor conserva su resumen criptográfico.
const IDENTITY_KEY = '@terrasense/push-installation-v1';
// Revocación que no pudo confirmarse (cierre de sesión sin red o con la cuenta ya inválida).
// Se reintenta con el secreto de instalación, sin sesión, hasta que el servidor la acepte
// o hasta que el teléfono se registre de nuevo, que reasocia la instalación a otra cuenta.
const PENDING_REVOKE_KEY = '@terrasense/push-revoke-pending-v1';
const PENDING_RECOVERY_KEY = '@terrasense/password-recovery-pending-v1';
type Identity = { id: string; secret: string };
let identityPromise: Promise<Identity> | null = null;
let operation: Promise<unknown> = Promise.resolve();
let revision = 0;
// Cuenta autorizada por la app para registrar (explicación de permisos revisada, preferencias
// cargadas, fuera de recuperación). Los disparadores internos (red, primer plano, token)
// respetan esta puerta para no registrar antes de tiempo ni a una cuenta en recuperación.
let eligibleUser: string | null = null;
// Cerrar sesión: entre la revocación y el `SIGNED_OUT` real nadie puede volver a registrar.
let signingOut = false;
let recoveryUpdateInProgress = false;
let recoveryFinishPromise: Promise<void> | null = null;
type RecoveryIdentity = { userId: string; sessionId: string };

function recoveryIdentity(session: { user: { id: string }; access_token: string }): RecoveryIdentity {
  try {
    const encoded = session.access_token.split('.')[1];
    const payload = JSON.parse(globalThis.atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) as { session_id?: unknown };
    if (typeof payload.session_id === 'string' && /^[0-9a-f-]{36}$/i.test(payload.session_id)) {
      return { userId: session.user.id, sessionId: payload.session_id };
    }
  } catch { /* Un JWT inválido no debe iniciar el cambio. */ }
  throw new Error('La sesión no contiene un identificador válido.');
}

async function pendingRecoveryIdentity(): Promise<RecoveryIdentity | null> {
  const stored = await AsyncStorage.getItem(PENDING_RECOVERY_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as RecoveryIdentity;
    if (typeof parsed.userId === 'string' && typeof parsed.sessionId === 'string') return parsed;
  } catch { /* Una marca incompleta no autoriza cerrar otra sesión. */ }
  throw new Error('La marca de recuperación está dañada.');
}

export type PushRegistrationStatus = 'idle' | 'syncing' | 'ready' | 'error';
let status: PushRegistrationStatus = 'idle';
const statusListeners = new Set<(next: PushRegistrationStatus) => void>();
function setStatus(next: PushRegistrationStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach(listener => listener(next));
}
export function getPushRegistrationStatus() { return status; }
export function subscribePushRegistration(listener: (next: PushRegistrationStatus) => void) {
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

export function setPushRegistrationUser(userId: string | null) { eligibleUser = userId; }

function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = operation.catch(() => undefined).then(run);
  operation = next;
  return next;
}

async function identity(): Promise<Identity> {
  if (!identityPromise) identityPromise = (async () => {
    const stored = await AsyncStorage.getItem(IDENTITY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Identity;
        if (/^[0-9a-f-]{36}$/i.test(parsed.id) && /^[0-9a-f]{64}$/i.test(parsed.secret)) return parsed;
      } catch { /* Regenerar un registro corrupto. */ }
    }
    const created = { id: Crypto.randomUUID(), secret: Array.from(Crypto.getRandomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('') };
    await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(created));
    return created;
  })().catch(error => { identityPromise = null; throw error; });
  return identityPromise;
}

async function sessionUserId(): Promise<string | undefined> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id;
}

const permitted = (value: Notifications.NotificationPermissionsStatus) => value.granted ||
  value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  value.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;

Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const allowed = shouldPresentNotification(notification.request.content.data, {
      signedIn: !!useAuthStore.getState().session,
      deviceEnabled: useAppStore.getState().preferences.notifications.device,
    });
    return { shouldShowBanner: allowed, shouldShowList: allowed, shouldPlaySound: allowed, shouldSetBadge: false };
  },
});

export async function prepareNotificationChannels(language: 'es' | 'en'): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('device', {
    name: language === 'en' ? 'Device access' : 'Acceso a equipos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  // Canales de categorías retiradas (suelo, clima, sincronización).
  await Promise.all(['agronomic', 'weather', 'sync'].map(channel =>
    Notifications.deleteNotificationChannelAsync(channel).catch(() => undefined)));
}

type Outcome = { token: string | null; registered: boolean };

/**
 * Sincroniza esta instalación con el servidor para la cuenta actual: consulta el permiso
 * (nunca abre el diálogo; eso ocurre sólo en Permisos del teléfono) y envía permiso y token.
 * La cola serializa las llamadas y descarta las obsoletas, así que un cambio de cuenta o de
 * permiso a mitad de camino no deja escrituras cruzadas. Rechaza si el registro falla.
 */
export async function registerPushToken(preferencesOverride?: AppPreferences): Promise<string | null> {
  const ticket = ++revision;
  setStatus('syncing');
  return serial<Outcome>(async () => {
    const skipped: Outcome = { token: null, registered: false };
    const stale = async (uid: string) =>
      ticket !== revision || signingOut || eligibleUser !== uid || (await sessionUserId()) !== uid;
    const uid = await sessionUserId();
    if (!uid || eligibleUser !== uid || signingOut || ticket !== revision ||
        await AsyncStorage.getItem(PENDING_RECOVERY_KEY)) return skipped;
    const preferences = preferencesOverride ?? useAppStore.getState().preferences;
    const permission = await Notifications.getPermissionsAsync();
    const permissionValue = permitted(permission)
      ? (permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ? 'provisional' : 'granted')
      : permission.status === 'undetermined' ? 'undetermined' : 'denied';
    let token: string | null = null;
    if (preferences.notifications.device && permitted(permission) && Device.isDevice) {
      await prepareNotificationChannels(preferences.language);
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
      if (!projectId) throw new Error('Falta configurar el ID del proyecto EAS para recibir avisos.');
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
    if (await stale(uid)) return skipped;
    const installation = await identity();
    if (await stale(uid)) return skipped;
    const { error } = await supabase.rpc('register_push_installation', {
      p_installation_id: installation.id,
      p_installation_secret: installation.secret,
      p_expo_push_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
      p_permission: permissionValue,
    });
    if (error) throw error;
    // El registro reemplaza una revocación pendiente sólo si nadie cerró sesión ni registró
    // después: una salida iniciada mientras esta llamada volaba conserva su marca, porque su
    // revocación corre a continuación en la cola y, sin red, debe poder reintentarse.
    if (ticket === revision && !signingOut) await AsyncStorage.removeItem(PENDING_REVOKE_KEY);
    return { token, registered: true };
  }).then(outcome => {
    if (ticket === revision) setStatus(outcome.registered ? 'ready' : 'idle');
    return outcome.token;
  }, error => {
    if (ticket === revision) setStatus('error');
    throw error;
  });
}

async function hasIdentity(): Promise<boolean> {
  return !!identityPromise || !!(await AsyncStorage.getItem(IDENTITY_KEY));
}

/** Revoca esta instalación con su secreto; no depende de la sesión. Retira la marca pendiente. */
async function revokeInstallation(): Promise<void> {
  const installation = await identity();
  const { error } = await supabase.rpc('revoke_push_installation_by_secret', {
    p_installation_id: installation.id, p_installation_secret: installation.secret,
  });
  if (error) throw error;
  await AsyncStorage.removeItem(PENDING_REVOKE_KEY);
}

/** Revoca esta instalación. Rechaza si no hay red o el servidor no acepta. */
export async function clearPushToken(): Promise<void> {
  ++revision;
  await serial(async () => {
    // Una cuenta que jamás registró push puede cerrar sesión sin crear una identidad.
    if (!(await hasIdentity())) return;
    await revokeInstallation();
  });
  setStatus('idle');
}

/** Reintenta una revocación pendiente. Devuelve si hubo una y el servidor la confirmó. */
export async function flushPendingPushRevocation(): Promise<boolean> {
  return serial(async () => {
    if (!(await AsyncStorage.getItem(PENDING_REVOKE_KEY))) return false;
    if (!(await hasIdentity())) { await AsyncStorage.removeItem(PENDING_REVOKE_KEY); return false; }
    await revokeInstallation();
    return true;
  });
}

/**
 * Se invoca antes de `signOut` en todo cierre de sesión iniciado por la persona. Revoca esta
 * instalación con una espera acotada y NUNCA rechaza: sin red, el cierre de sesión continúa.
 * Bloquea nuevos registros hasta que llegue `SIGNED_OUT` o se llame a `resumePushRegistration`
 * (si el cierre de sesión falló y la cuenta sigue activa). Devuelve si el servidor confirmó.
 */
export async function revokePushInstallationForSignOut(timeoutMs = 5000): Promise<boolean> {
  signingOut = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // La marca se guarda antes de intentar: si la app se cierra durante la espera, se reintenta.
    if (await hasIdentity()) await AsyncStorage.setItem(PENDING_REVOKE_KEY, '1');
    await Promise.race([
      clearPushToken(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Sin respuesta del servidor')), timeoutMs); }),
    ]);
    return true;
  } catch { return false; }
  finally { if (timer) clearTimeout(timer); }
}

/**
 * El cierre de sesión no ocurrió y la cuenta sigue activa en este teléfono. La marca de
 * revocación pendiente ya no representa nada: si se conservara, el próximo primer plano
 * revocaría un registro vigente. Se descarta en la cola (después de cualquier revocación en
 * vuelo) salvo que la persona ya haya iniciado otra salida, y se vuelve a registrar.
 */
export function resumePushRegistration() {
  signingOut = false;
  void serial(async () => { if (!signingOut) await AsyncStorage.removeItem(PENDING_REVOKE_KEY); }).catch(() => undefined);
  void registerPushToken().catch(() => undefined);
}

/**
 * Cierre de sesión de la persona en ESTE teléfono: revoca esta instalación (acotado, sin
 * bloquear sin red) y cierra con alcance `local`. El alcance por defecto de Supabase es
 * `global` y expulsaría a la persona de sus otros teléfonos. Si algo falla, reanuda el registro
 * y propaga el error para que la pantalla lo muestre.
 */
export async function signOutThisPhone(beforeSignOut?: () => Promise<void>): Promise<void> {
  await revokePushInstallationForSignOut();
  try {
    await beforeSignOut?.();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch (error) {
    resumePushRegistration();
    throw error;
  }
}

/**
 * La marca se escribe antes de cambiar la contraseña: una respuesta perdida de Auth deja
 * incierto si se guardó. Hasta resolverlo, esta instalación no se vuelve a registrar.
 */
export async function beginPasswordRecoveryClosure(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Sesión de recuperación ausente.');
  const recovery = recoveryIdentity(data.session);
  signingOut = true;
  ++revision;
  await AsyncStorage.setItem(PENDING_RECOVERY_KEY, JSON.stringify(recovery));
  recoveryUpdateInProgress = true;
  const { error: revokeError } = await supabase.rpc('revoke_push_for_password_recovery');
  if (revokeError) throw revokeError;
}

/** Cierra también la sesión actual. Se puede repetir tras un fallo parcial o reinicio. */
async function finishPasswordRecoveryClosureOnce(): Promise<void> {
  recoveryUpdateInProgress = false;
  ++revision;
  const expected = await pendingRecoveryIdentity();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const current = data.session ? recoveryIdentity(data.session) : null;
  // Auth puede haber cerrado correctamente antes de fallar AsyncStorage. En ese caso
  // sólo falta limpiar: ni finalizar ni cancelar deben exigir la sesión que ya terminó.
  if (!current) {
    await clearPasswordRecoveryClosure();
    return;
  }
  if (!expected || current.userId !== expected.userId || current.sessionId !== expected.sessionId) {
    throw new Error('La sesión de recuperación cambió.');
  }
  signingOut = true;
  const { error: revokeError } = await supabase.rpc('revoke_push_for_password_recovery');
  if (revokeError) throw revokeError;
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) throw signOutError;
  await clearPasswordRecoveryClosure();
}

async function clearPasswordRecoveryClosure(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_RECOVERY_KEY);
  await AsyncStorage.removeItem(PENDING_REVOKE_KEY);
  signingOut = false;
  setStatus('idle');
}

export function finishPasswordRecoveryClosure(): Promise<void> {
  if (!recoveryFinishPromise) {
    recoveryFinishPromise = finishPasswordRecoveryClosureOnce().finally(() => { recoveryFinishPromise = null; });
  }
  return recoveryFinishPromise;
}

/** Si se reinició la app durante el cierre, completa la revocación antes de registrar push. */
export async function flushPendingPasswordRecoveryClosure(): Promise<boolean> {
  if (recoveryUpdateInProgress) return false;
  const expected = await pendingRecoveryIdentity();
  if (!expected) return false;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const current = data.session ? recoveryIdentity(data.session) : null;
  if (!current || current.userId !== expected.userId || current.sessionId !== expected.sessionId) {
    await AsyncStorage.removeItem(PENDING_RECOVERY_KEY);
    signingOut = false;
    return true;
  }
  await finishPasswordRecoveryClosure();
  return true;
}

export async function cancelPasswordRecoveryClosure(): Promise<void> {
  if (await AsyncStorage.getItem(PENDING_RECOVERY_KEY)) await finishPasswordRecoveryClosure();
  else await signOutThisPhone();
}

// La puerta de cierre de sesión se abre sola cuando la sesión termina de verdad.
supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') signingOut = false; });

AppState.addEventListener('change', state => {
  if (state !== 'active') return;
  void flushPendingPasswordRecoveryClosure().catch(() => undefined);
  void flushPendingPushRevocation().catch(() => undefined);
  void registerPushToken().catch(() => undefined);
});
void flushPendingPasswordRecoveryClosure().catch(() => undefined);
void flushPendingPushRevocation().catch(() => undefined);
Notifications.addPushTokenListener(() => {
  void registerPushToken().catch(() => undefined);
});
