// src/auth/authErrors.ts — mensajes de Supabase Auth en español.
//
// Los textos no distinguen «el correo no existe» de «la contraseña no
// coincide»: decirlo permitiría averiguar qué correos tienen cuenta.

export const humanizeAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.';
  if (m.includes('email not confirmed'))
    return 'Esta cuenta aún no está confirmada. Revisa tu correo.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.';
  if (m.includes('same') || m.includes('different'))
    return 'La contraseña nueva debe ser distinta a la actual.';
  if (m.includes('password') && (m.includes('least') || m.includes('weak') || m.includes('short')))
    return 'La contraseña no cumple los requisitos.';
  if (m.includes('invalid') && m.includes('email')) return 'Ese correo no es válido.';
  if (/rate|too many|seconds|429/.test(m)) return 'Espera un momento antes de volver a intentarlo.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión con el servidor.';
  return message;
};

export const errorText = (e: unknown) =>
  humanizeAuthError(e instanceof Error ? e.message : String(e));

/** Validación mínima del formato; el servidor tiene la última palabra. */
export const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
