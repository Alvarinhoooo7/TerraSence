import { useAppStore } from '../store/useAppStore';
// src/services/notifications.ts
//
// Registro del token de notificaciones. Adaptado de `notifications.ts` de Akura.
//
// Sin esto, la Edge Function `send-push-alert` no tiene a dónde enviar: lee
// `profiles.push_token` y lo encuentra vacío. Es la mitad que faltaba del
// circuito de alertas.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { loadPreferences } from './preferencesService';
import type { AppPreferences } from '../types/preferences';

Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const raw = notification.request.content.data?.category;
    const category = raw === 'device' || raw === 'weather' || raw === 'sync' ? raw : 'agronomic';
    const allowed = useAppStore.getState().preferences.notifications[category] && notification.request.content.data?.event_type !== 'firmware_update';
    return { shouldShowBanner: allowed, shouldShowList: allowed, shouldPlaySound: allowed, shouldSetBadge: false };
  },
});

/** Android 13 requiere un canal antes de presentar el permiso de notificaciones. */
export async function prepareNotificationChannels(language: 'es' | 'en'): Promise<void> {
  if (Platform.OS === 'android') {
    const en = language === 'en';
    await Promise.all([
      Notifications.setNotificationChannelAsync('agronomic', {
        name: en ? 'Agronomic alerts' : 'Alertas agronómicas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      }),
      Notifications.setNotificationChannelAsync('device', {
        name: en ? 'Device status' : 'Estado del equipo',
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync('weather', {
        name: en ? 'Weather risks' : 'Riesgos meteorológicos',
        importance: Notifications.AndroidImportance.HIGH,
      }),
      Notifications.setNotificationChannelAsync('sync', {
        name: en ? 'Synchronization' : 'Sincronización',
        importance: Notifications.AndroidImportance.LOW,
      }),
    ]);
  }
}

/**
 * Pide permiso, obtiene el token de Expo y lo guarda en el perfil.
 *
 * Devuelve el token o null. No lanza: que fallen las notificaciones no debe
 * impedir usar la app, que es una herramienta de campo antes que un canal de
 * avisos.
 */
export async function registerPushToken(
  preferencesOverride?: AppPreferences,
  options: { requestPermission?: boolean } = {},
): Promise<string | null> {
  try {
    const preferences = preferencesOverride ?? (await loadPreferences());
    if (!Object.values(preferences.notifications).some(Boolean)) {
      await clearPushToken();
      return null;
    }

    // Los emuladores no reciben notificaciones remotas.
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    const permitted = (value: Notifications.NotificationPermissionsStatus) => value.granted ||
      value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      value.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
    let permission = existing;
    if (!permitted(permission)) {
      // El arranque sólo registra permisos ya concedidos. Ajustes conserva su solicitud explícita.
      if (options.requestPermission === false || !permission.canAskAgain) return null;
      await prepareNotificationChannels(preferences.language);
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permitted(permission)) return null;

    await prepareNotificationChannels(preferences.language);

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid || !token) return token ?? null;

    // Sólo se escribe si cambió: evita una escritura en cada arranque.
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', uid)
      .maybeSingle();

    if (profile?.push_token !== token) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', uid);
    }

    return token;
  } catch {
    return null;
  }
}

/** Aplica inmediatamente los toggles sin esperar al próximo arranque. */
export async function reconcileNotificationRegistration(
  preferences: AppPreferences,
): Promise<void> {
  if (Object.values(preferences.notifications).some(Boolean)) {
    await registerPushToken(preferences);
  } else {
    await clearPushToken();
  }
}

/** Borra el token al cerrar sesión: si no, el equipo sigue recibiendo avisos ajenos. */
export async function clearPushToken(): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const uid = data.session?.user.id;
  if (!uid) return;
  const { error } = await supabase.from('profiles').update({ push_token: null }).eq('id', uid);
  if (error) throw error;
}
