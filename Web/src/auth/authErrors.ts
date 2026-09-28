// src/auth/authErrors.ts — mensajes de acceso.
//
// El login nunca distingue «correo inexistente», «contraseña equivocada» o
// «cuenta sin acceso al backoffice»: las tres dicen lo mismo. Decir cuál
// permitiría averiguar qué cuentas existen y cuál es la de soporte.

export const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';

export function loginErrorText(error: unknown): string {
  const message = String((error as { message?: string } | null)?.message ?? error ?? '').toLowerCase();
  if (/rate|too many|429/.test(message)) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  if (/fetch|network/.test(message)) return 'Sin conexión con el servidor. Revisa tu red y reintenta.';
  return INVALID_CREDENTIALS;
}

export function codeErrorText(error: unknown): string {
  const message = String((error as { message?: string } | null)?.message ?? error ?? '').toLowerCase();
  if (/rate|too many|429|seconds/.test(message)) return 'Espera un momento antes de volver a intentarlo.';
  if (/fetch|network/.test(message)) return 'Sin conexión con el servidor. Revisa tu red y reintenta.';
  return 'El código no es válido o venció. Revisa el correo o pide uno nuevo.';
}

export function passwordErrorText(error: unknown): string {
  const message = String((error as { message?: string } | null)?.message ?? error ?? '').toLowerCase();
  if (message.includes('different') || message.includes('same')) return 'Elige una contraseña distinta a la anterior.';
  if (message.includes('weak') || message.includes('least') || message.includes('short'))
    return 'La contraseña no cumple los requisitos.';
  if (/fetch|network/.test(message)) return 'Sin conexión con el servidor. Revisa tu red y reintenta.';
  return 'No se pudo guardar la contraseña. Reintenta.';
}

export const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
