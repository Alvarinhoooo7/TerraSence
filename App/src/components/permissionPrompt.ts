import { Alert, Platform } from 'react-native';
import { openPermissionSettings, readPermission, requestPermission, isLegacyAndroidBluetooth } from '../services/permissionsService';
import {
  blockedMessage, legacyBluetoothNote, PERMISSION_ACTIONS, PERMISSION_COPY, pick, poweredOffMessage, unavailableMessage,
  type Language,
} from '../utils/permissionCopy';
import type { PermissionKind, PermissionState } from '../utils/permissionState';

export interface AccessResult {
  /** Se puede usar la función ahora (Bluetooth, además, encendido). */
  ok: boolean;
  state: PermissionState;
  /** Se mostró el diálogo del sistema y la persona no concedió: la pantalla explica el efecto. */
  deniedNow: boolean;
  /** No se pudo consultar el estado (p. ej. Expo Go sin módulo nativo): no es un rechazo. */
  unknown: boolean;
}

function choose(title: string, message: string, cancel: string, confirm: string): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirm, onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

function notice(title: string, message: string, language: Language): Promise<void> {
  return new Promise(resolve => {
    Alert.alert(title, message, [{ text: language === 'en' ? 'OK' : 'Entendido', onPress: () => resolve() }],
      { cancelable: true, onDismiss: () => resolve() });
  });
}

/**
 * Pide un permiso desde la función que lo necesita, con la variante de cada plataforma:
 *
 * - Primera vez: diálogo del sistema directo. La acción que tocó la persona ya da el
 *   contexto, así que no hay pantalla previa (Apple la limitaría a un solo «Continuar»).
 * - Android tras un rechazo: explicación cancelable antes de volver a pedir.
 * - El sistema ya no preguntará: se explica dónde se cambia y se ofrece abrir Ajustes,
 *   sólo porque la persona volvió a intentar la función.
 */
export async function askForAccess(kind: PermissionKind, language: Language, isActive: () => boolean = () => true): Promise<AccessResult> {
  const copy = PERMISSION_COPY[kind];
  const title = pick(copy.name, language);
  const done = (state: PermissionState, deniedNow = false): AccessResult => {
    const ok = state.status === 'granted' && !state.poweredOff;
    const unknown = state.status === 'error';
    return { ok, state, unknown, deniedNow: deniedNow && !unknown && state.status !== 'granted' };
  };
  const current = await readPermission(kind);
  if (!isActive()) return done(current);

  if (current.status === 'granted') {
    if (current.poweredOff && isActive()) await notice(title, poweredOffMessage(language), language);
    return done(current);
  }
  if (current.status === 'unavailable') {
    if (isActive()) await notice(title, unavailableMessage(kind, language), language);
    return done(current);
  }
  if (current.status === 'restricted' || !current.canAskAgain) {
    if (current.status === 'restricted' && isActive()) await notice(title, blockedMessage(kind, current, language), language);
    else if (await choose(title, blockedMessage(kind, current, language), pick(PERMISSION_ACTIONS.cancel, language), pick(PERMISSION_ACTIONS.settings, language))) {
      if (isActive()) await openPermissionSettings().catch(() => undefined);
    }
    return done(current);
  }
  if (Platform.OS === 'android' && current.status === 'denied') {
    const rationale = kind === 'bluetooth' && isLegacyAndroidBluetooth()
      ? `${pick(copy.rationale, language)} ${legacyBluetoothNote(language)}` : pick(copy.rationale, language);
    const proceed = await choose(title, rationale, pick(PERMISSION_ACTIONS.cancel, language), pick(PERMISSION_ACTIONS.continue, language));
    if (!proceed || !isActive()) return done(current);
  }

  const result = await requestPermission(kind, language, isActive);
  if (isActive() && result.status === 'granted' && result.poweredOff) await notice(title, poweredOffMessage(language), language);
  return done(result, true);
}
