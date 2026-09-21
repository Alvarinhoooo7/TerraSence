// src/utils/devSkipOnboarding.ts
//
// Atajo de desarrollo para entrar a la app sin vincular una sonda.
//
// El acceso a la app lo decide `deriveOnboardingState`, y su regla es que la
// membresía visible manda: sin equipos, hay onboarding. Eso es correcto en
// producción, pero durante el desarrollo obliga a emparejar una sonda física —o a
// tocar `device_members` a mano— sólo para ver una pantalla.
//
// Este interruptor levanta esa compuerta y nada más. NO inventa un equipo: la app
// entra con `device` en null. Dashboard avisa que no hay sonda y dirige la acción
// principal a vincular un equipo; el atajo no crea mediciones.
//
// Es temporal y sólo de desarrollo. La lectura y activación comprueban `__DEV__` por
// separado a propósito: aunque alguien llame a `enableDevSkip()` desde código de
// producción, no pasa nada, y `isDevSkipEnabled()` devuelve false aunque la clave
// haya quedado escrita en el dispositivo. Retirar cuando el emparejamiento pueda
// probarse con hardware real.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE = 'terrasense.dev.skipOnboarding';

/** true sólo en compilaciones de desarrollo y con el atajo activado. */
export async function isDevSkipEnabled(userId: string): Promise<boolean> {
  if (!__DEV__ || !userId) return false;
  try {
    return (await AsyncStorage.getItem(`${CLAVE}/${userId}`)) === '1';
  } catch {
    return false;
  }
}

export async function enableDevSkip(userId: string): Promise<void> {
  if (!__DEV__ || !userId) return;
  try {
    await AsyncStorage.setItem(`${CLAVE}/${userId}`, '1');
  } catch {
    // Que no se pueda persistir no debe romper la pantalla: el atajo es una
    // comodidad, no una función de la app.
  }
}

/** Se llama al cerrar sesión, para que la siguiente cuenta empiece limpia. */
export async function clearDevSkip(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(key => key === CLAVE || key.startsWith(`${CLAVE}/`));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // Ídem.
  }
}
