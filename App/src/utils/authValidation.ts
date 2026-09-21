/** Validación de formato local; Supabase verifica la identidad y las credenciales. */
export const isEmailValid = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isInvalidSessionError = (error: { status?: number; code?: string } | null): boolean =>
  !!error && (error.status === 401 || error.status === 403 ||
    ['user_not_found', 'session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(error.code ?? ''));

/**
 * Detecta que el correo ya tenía cuenta, a partir de la respuesta del registro.
 *
 * Supabase no responde con un error cuando la dirección ya existe: para no confirmarle
 * a un extraño qué correos están registrados, devuelve un usuario con la lista de
 * identidades **vacía** y sin sesión. Sin esto, la app mandaba al agricultor a esperar
 * un código de confirmación que nunca iba a llegar.
 *
 * El aviso cuesta un registro completo y limitado por tasa, no una pulsación de tecla:
 * por eso no habilita sondear el padrón de cuentas, que es lo que evitaría una consulta
 * directa a la base.
 *
 * Ante la duda no afirma nada. Si la respuesta no trae identidades, o ya hay sesión,
 * devuelve `false` y el flujo sigue como un registro normal.
 */
export const isExistingAccountSignUp = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const { user, session } = data as { user?: unknown; session?: unknown };
  if (session || !user || typeof user !== 'object') return false;
  const identities = (user as { identities?: unknown }).identities;
  return Array.isArray(identities) && identities.length === 0;
};
