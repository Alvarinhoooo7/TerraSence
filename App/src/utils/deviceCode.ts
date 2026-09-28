/** Funciones puras del contrato de código/QR; compartibles con pruebas Node. */

export const DEVICE_ID_LENGTH = 15;

export const normalizeDeviceId = (raw?: string): string =>
  (raw ?? '').replace(/\D/g, '').slice(0, DEVICE_ID_LENGTH);

export const formatDeviceId = (raw?: string): string => {
  const clean = normalizeDeviceId(raw);
  if (clean.length !== DEVICE_ID_LENGTH) return clean;
  return clean.replace(/(\d{5})(\d{5})(\d{5})/, '$1-$2-$3');
};

/** 15 dígitos derivados de la MAC del ESP32; puede empezar con 0. */
export const isValidDeviceId = (raw?: string): boolean =>
  /^\d{15}$/.test(normalizeDeviceId(raw));

export const buildDeviceQrPayload = (raw?: string): string =>
  `terrasense://join?token=${raw ?? ''}`;

/** El código manual es la misma invitación temporal que contiene el QR. */
export const parseDeviceInvite = (raw: string): string | null => {
  const value = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : parseDeviceQrPayload(value);
};

/** El ID permanente nunca sirve como invitación de acceso. */
export const parseDeviceQrPayload = (payload?: string): string | null => {
  const raw = payload?.trim() ?? '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'terrasense:' || parsed.hostname !== 'join') return null;
    const token = parsed.searchParams.get('token') ?? '';
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token) ? token : null;
  } catch {
    return null;
  }
};
