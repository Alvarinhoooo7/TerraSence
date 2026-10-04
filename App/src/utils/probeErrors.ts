import type { AppLanguage } from '../types/preferences';

// Los servicios (sonda, Bluetooth, mediciones, equipos, códigos) y las funciones de Supabase
// lanzan errores en español (las pruebas y los registros dependen de ese texto). Las pantallas
// los muestran a la persona, así que en inglés se traducen aquí por su contenido; lo que no se
// reconoce se reemplaza por el texto general que recibe `fallback`, nunca se muestra en
// español a quien usa la app en inglés.
const ENGLISH: [RegExp, string][] = [
  [/Bluetooth.*apagado/i, 'Bluetooth is off. Turn it on to read the probe.'],
  [/permiso de Bluetooth|Sin acceso a Bluetooth/i, 'Bluetooth access is off. Turn it on in Settings to find and read the probe.'],
  [/Bluetooth no está disponible/i, 'Bluetooth is not available on this device.'],
  [/No se pudo iniciar Bluetooth/i, 'Could not start Bluetooth.'],
  [/Fallo al buscar la sonda/i, 'Could not find the probe.'],
  [/ninguna sonda cerca/i, 'No probe found nearby. Check that it is on, with the PAIR window open and within 2 meters of the phone.'],
  [/sonda seleccionada/i, 'The selected probe was not found. Check that it is on and that its code matches the active device.'],
  [/no respondió a tiempo/i, 'The probe did not respond in time. Reinsert the probe and try again.'],
  [/Fallo de lectura BLE|Paquete BLE|Versión de trama|BLE inválid|fuera del rango|Presión fuera/i, 'The probe sent a reading that could not be interpreted. Measure again.'],
  [/no entregó lectura de suelo/i, 'The probe did not deliver a soil reading. Check that the sensor is connected and buried, and measure again.'],
  [/verificar la identidad/i, 'Could not verify the probe identity. If it is an older device, update its firmware.'],
  [/No hay una sonda vinculada/i, 'There is no probe linked to this account.'],
  [/cancelad/i, 'Cancelled.'],
  [/Inicia sesión/i, 'Sign in to save or sync readings.'],
  [/La cuenta ha cambiado/i, 'The account changed. The reading was not saved.'],
  [/historial local|Cola local/i, 'The local storage could not be read. Your data is kept; contact support if it persists.'],
  // Vinculación, invitaciones y administración de equipos.
  [/código de vinculación inválido/i, 'The probe sent an invalid pairing code.'],
  [/ya tiene usuarios/i, 'This probe already has users. Ask an approved member to show you the temporary QR.'],
  [/no confirmó el registro/i, 'The device registration could not be confirmed. Try again.'],
  [/QR venció|QR inválido/i, 'The QR has expired or is no longer valid. Ask them to show you the current QR.'],
  [/No se pudo generar el QR/i, 'Could not generate the QR.'],
  [/No se pudo solicitar acceso/i, 'Could not request access. Try again.'],
  [/vincularse primero por Bluetooth/i, 'This device must first be paired over Bluetooth.'],
  [/Equipo no (encontrado|reconocido)/i, 'Device not found.'],
  [/solicitud pendiente/i, 'There is no pending request from that user.'],
  [/Operación no permitida|No autorizado/i, 'You are not allowed to do this.'],
  // Sesión y códigos de correo.
  [/seis dígitos/i, 'Enter the six digits of the code.'],
  [/No se pudo iniciar la sesión/i, 'Could not sign in. Request another code.'],
  [/Sesión (requerida|revocada|no válida)|Autenticación requerida|La sesión expiró/i, 'Your session has expired. Sign in again.'],
  [/La cuenta cambió/i, 'The account changed during the operation.'],
  [/Sin respuesta del servidor|tardó demasiado/i, 'The server did not respond. Check your connection and try again.'],
];

export function localizeProbeError(message: string | undefined, language: AppLanguage, fallback: string): string {
  if (!message) return fallback;
  if (language !== 'en') return message;
  return ENGLISH.find(([pattern]) => pattern.test(message))?.[1] ?? fallback;
}
