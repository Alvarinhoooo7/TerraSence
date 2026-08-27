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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Pide permiso, obtiene el token de Expo y lo guarda en el perfil.
 *
 * Devuelve el token o null. No lanza: que fallen las notificaciones no debe
 * impedir usar la app, que es una herramienta de campo antes que un canal de
 * avisos.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    // Los emuladores no reciben notificaciones remotas.
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('agronomic', {
        name: 'Alertas agronómicas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

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

/** Borra el token al cerrar sesión: si no, el equipo sigue recibiendo avisos ajenos. */
export async function clearPushToken(): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) await supabase.from('profiles').update({ push_token: null }).eq('id', uid);
  } catch {
    // Sin conexión al cerrar sesión: el token caducará por su cuenta.
  }
}
