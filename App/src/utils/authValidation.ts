/** Validación de formato local; Supabase verifica la identidad y las credenciales. */
export const isEmailValid = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isInvalidSessionError = (error: { status?: number; code?: string } | null): boolean =>
  !!error && (error.status === 401 || error.status === 403 ||
    ['user_not_found', 'session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(error.code ?? ''));
