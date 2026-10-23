import type { PermissionKind, PermissionState } from './permissionState';

/**
 * Textos de permisos, en un solo lugar y en los dos idiomas.
 *
 * Reglas (Apple HIG «Privacy», Android «Request runtime permissions», App Review 5.1.1):
 * - Ninguna acción propia se titula «Permitir»/«Allow»: se parecería al botón del diálogo
 *   del sistema. La que abre ese diálogo se llama «Continuar»/«Continue».
 * - Una explicación previa en Android siempre se puede cancelar. En iOS la app no muestra
 *   una pantalla previa: pide el acceso directamente desde la función que lo necesita.
 * - Tras un rechazo, se dice qué función queda limitada y qué alternativa existe, sin
 *   insistir ni abrir Ajustes automáticamente. Ajustes se ofrece sólo cuando la persona
 *   vuelve a intentar la función y el sistema ya no mostrará su diálogo.
 */
type Text = { es: string; en: string };
export type Language = 'es' | 'en';

export interface PermissionCopy {
  name: Text;
  /** Fila de la pantalla informativa inicial. */
  summary: Text;
  /** Explicación cancelable de Android, antes de volver a pedir tras un rechazo. */
  rationale: Text;
  /** Tras un rechazo nuevo: qué no se puede hacer y qué alternativa hay. */
  denied: Text;
}

export const PERMISSION_COPY: Record<PermissionKind, PermissionCopy> = {
  bluetooth: {
    name: { es: 'Bluetooth', en: 'Bluetooth' },
    summary: { es: 'Conecta la sonda y recibe sus mediciones.', en: 'Connects the probe and receives its readings.' },
    rationale: {
      es: 'TerraSense usa Bluetooth para encontrar tu sonda y recibir sus mediciones. Sin ese acceso puedes seguir usando la app, pero no conectar la sonda.',
      en: 'TerraSense uses Bluetooth to find your probe and receive its readings. Without it you can keep using the app, but not connect the probe.',
    },
    denied: {
      es: 'Sin acceso a Bluetooth no se puede buscar ni leer la sonda. El resto de la app sigue disponible.',
      en: 'Without Bluetooth access the probe cannot be found or read. The rest of the app remains available.',
    },
  },
  location: {
    name: { es: 'Ubicación', en: 'Location' },
    summary: { es: 'Si lo eliges al medir, guarda las coordenadas y consulta el pronóstico con Open-Meteo.', en: 'If you choose it when measuring, saves coordinates and gets the forecast from Open-Meteo.' },
    rationale: {
      es: 'Con tu ubicación, la lectura guarda sus coordenadas y consulta el pronóstico. Sin ella, la medición se guarda igual, sin coordenadas ni pronóstico.',
      en: 'With your location, the reading saves its coordinates and gets the forecast. Without it, the reading is saved anyway, without coordinates or forecast.',
    },
    denied: {
      es: 'Sin acceso a la ubicación, las lecturas se guardan sin coordenadas ni pronóstico.',
      en: 'Without location access, readings are saved without coordinates or forecast.',
    },
  },
  camera: {
    name: { es: 'Cámara', en: 'Camera' },
    summary: { es: 'Escanea invitaciones QR. También puedes escribir el código.', en: 'Scans QR invitations. You can also type the code.' },
    rationale: {
      es: 'La cámara sólo se usa para leer el QR de invitación. Sin ella puedes escribir el código que aparece bajo el QR.',
      en: 'The camera is only used to read the invitation QR code. Without it you can type the code shown below the QR.',
    },
    denied: {
      es: 'Sin acceso a la cámara, escribe el código de invitación que aparece bajo el QR.',
      en: 'Without camera access, type the invitation code shown below the QR.',
    },
  },
  notifications: {
    name: { es: 'Notificaciones', en: 'Notifications' },
    summary: { es: 'Avisos sobre solicitudes y acceso a equipos. Son opcionales.', en: 'Alerts about requests and device access. They are optional.' },
    rationale: {
      es: 'Los avisos te informan de solicitudes de acceso y del estado de tus equipos. Sin ellos la app funciona igual.',
      en: 'Notifications tell you about access requests and your devices. The app works the same without them.',
    },
    denied: {
      es: 'Sin permiso de notificaciones la app funciona igual, pero no recibirás avisos.',
      en: 'Without notification permission the app works the same, but you will not receive alerts.',
    },
  },
};

/** Botones propios. Nunca «Permitir», «Ahora no» ni «Más tarde». */
export const PERMISSION_ACTIONS = {
  continue: { es: 'Continuar', en: 'Continue' },
  cancel: { es: 'Cancelar', en: 'Cancel' },
  settings: { es: 'Abrir ajustes', en: 'Open settings' },
  request: { es: 'Solicitar permiso', en: 'Request permission' },
  writeCode: { es: 'Escribir el código', en: 'Type the code' },
} satisfies Record<string, Text>;

export const pick = (text: Text, language: Language) => text[language];

export function legacyBluetoothNote(language: Language) {
  return pick({ es: 'En este Android, buscar la sonda también usa la ubicación.', en: 'On this Android version, finding the probe also uses location.' }, language);
}

export function poweredOffMessage(language: Language) {
  return pick({ es: 'El Bluetooth del teléfono está apagado. Enciéndelo y vuelve a intentarlo.', en: 'Your phone’s Bluetooth is off. Turn it on and try again.' }, language);
}

/** Cuando el sistema ya no mostrará su diálogo. No promete que Ajustes lo resuelva si está restringido. */
export function blockedMessage(kind: PermissionKind, state: PermissionState, language: Language) {
  const name = pick(PERMISSION_COPY[kind].name, language).toLowerCase();
  if (state.status === 'restricted') {
    return pick({ es: `Este teléfono restringe el acceso a ${name} para TerraSense. Puede que no se pueda cambiar desde sus ajustes.`,
      en: `This phone restricts ${name} access for TerraSense. It may not be possible to change it in settings.` }, language);
  }
  return pick({ es: `El teléfono ya no mostrará la solicitud de ${name}. Para usar esta función, cambia el acceso de TerraSense en los ajustes del teléfono.`,
    en: `Your phone will no longer show the ${name} request. To use this feature, change TerraSense access in your phone settings.` }, language);
}

export function unavailableMessage(kind: PermissionKind, language: Language) {
  const name = pick(PERMISSION_COPY[kind].name, language).toLowerCase();
  return pick({ es: `Este teléfono no tiene ${name} disponible.`, en: `${name[0].toUpperCase()}${name.slice(1)} is not available on this phone.` }, language);
}

/** Estado legible, sin culpa ni postergación («por ahora», «después»). */
export function permissionStatusLabel(state: PermissionState | undefined, language: Language): string {
  const say = (es: string, en: string) => (language === 'en' ? en : es);
  if (!state) return say('Por comprobar', 'Not checked');
  if (state.status === 'error') return say('No pudimos comprobar el estado', 'Could not check status');
  if (state.status === 'unavailable') return say('No disponible en este teléfono', 'Not available on this phone');
  if (state.status === 'restricted') return say('Restringido en este teléfono', 'Restricted on this phone');
  if (state.poweredOff) return say('Autorizado · Bluetooth apagado', 'Allowed · Bluetooth is off');
  if (state.status === 'granted' && state.approximate) return say('Autorizado · Ubicación aproximada', 'Allowed · Approximate location');
  if (state.status === 'granted' && state.provisional) return say('Avisos silenciosos', 'Quiet notifications');
  if (state.status === 'granted') return say('Autorizado', 'Allowed');
  if (!state.canAskAgain) return say('Sin acceso · Se cambia en los ajustes del teléfono', 'No access · Change it in phone settings');
  if (state.status === 'denied') return say('Sin acceso', 'No access');
  return say('Sin decidir', 'Not decided');
}
