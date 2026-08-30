// src/utils/deviceId.ts
//
// ALGORITMO CANÓNICO DEL DEVICE ID — debe permanecer IDÉNTICO a la función
// `public.generate_device_code()` de Supabase (migración 20260827100000) y a
// `Web/src/utils/deviceId.ts`. Si se modifica en un sitio hay que replicarlo en
// los otros, o los códigos que el agricultor copia desde la app dejarán de
// encontrarse en la consola de soporte.
//
// 15 dígitos ALEATORIOS, no derivados de un UUID por hash: un hash de 10
// dígitos colisiona por la paradoja del cumpleaños a partir de unos pocos
// miles de registros. La unicidad final la garantiza el índice UNIQUE de la
// base de datos; la base es además quien genera el código por DEFAULT, y esta
// función existe para previsualización y para provisionamiento sin conexión.

import * as Crypto from 'expo-crypto';
import { DEVICE_ID_LENGTH } from './deviceCode';

export * from './deviceCode';

/** Genera un Device ID aleatorio de 15 dígitos (el primero nunca es 0). */
export const generateDeviceId = (): string => {
  const bytes = Crypto.getRandomBytes(DEVICE_ID_LENGTH);
  let id = String(1 + (bytes[0] % 9));
  for (let i = 1; i < DEVICE_ID_LENGTH; i++) {
    id += String(bytes[i] % 10);
  }
  return id;
};
