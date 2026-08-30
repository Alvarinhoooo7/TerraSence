/** Funciones puras del contrato de código/QR; compartibles con pruebas Node. */

export const DEVICE_ID_LENGTH = 15;

export const normalizeDeviceId = (raw?: string): string =>
  (raw ?? '').replace(/\D/g, '').slice(0, DEVICE_ID_LENGTH);

export const formatDeviceId = (raw?: string): string => {
  const clean = normalizeDeviceId(raw);
  if (clean.length !== DEVICE_ID_LENGTH) return clean;
  return clean.replace(/(\d{5})(\d{5})(\d{5})/, '$1-$2-$3');
};

export const isValidDeviceId = (raw?: string): boolean =>
  /^[1-9]\d{14}$/.test(normalizeDeviceId(raw));

export const buildDeviceQrPayload = (raw?: string): string =>
  `terrasense://join?code=${normalizeDeviceId(raw)}`;

/** Acepta el URI TerraSense canónico o un código legado crudo/con guiones. */
export const parseDeviceQrPayload = (payload?: string): string | null => {
  const raw = payload?.trim() ?? '';
  let candidate = raw;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'terrasense:' || parsed.hostname !== 'join') return null;
    candidate = parsed.searchParams.get('code') ?? '';
  } catch {
    // Los QR antiguos pueden contener únicamente 48213-90574-16628.
  }

  const digits = candidate.replace(/\D/g, '');
  if (digits.length !== DEVICE_ID_LENGTH) return null;
  const code = normalizeDeviceId(candidate);
  return isValidDeviceId(code) ? code : null;
};
