// src/utils/passwordRules.ts
//
// Requisitos de contraseña del registro, como lógica pura.
//
// Vive separado de la pantalla para poder probarlo sin montar React, y porque la
// lista se recorre en dos sitios: la casilla de verificación que el usuario ve
// marcarse mientras escribe, y la validación que bloquea el envío del formulario.
//
// La comprobación es del lado del cliente y su propósito es guiar, no proteger:
// quien llame a la API directamente se salta esto. El mínimo real lo impone
// Supabase Auth. Aquí se exige algo más estricto a propósito, porque el coste de
// una contraseña débil lo paga el agricultor, que guarda mediciones con valor
// probatorio.

/** Mínimo del formulario; Auth se configura con el mismo umbral. */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
  id: 'length' | 'letter' | 'number' | 'special';
  /** Texto en español e inglés; la pantalla elige según el idioma activo. */
  es: string;
  en: string;
  met: boolean;
}

/** Las marcas de acento combinadas pertenecen a la letra, no son símbolos. */
const SPECIAL = /[^\p{L}\p{M}\p{N}\s]/u;

/**
 * Evalúa la contraseña contra cada requisito por separado.
 *
 * Devuelve siempre las cuatro reglas, cumplidas o no: la pantalla necesita
 * pintar también las pendientes para que el usuario sepa qué le falta.
 */
export function evaluatePassword(password: string): PasswordRule[] {
  return [
    {
      id: 'length',
      es: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      en: `At least ${PASSWORD_MIN_LENGTH} characters`,
      // Cuenta puntos Unicode; un emoji no ocupa dos caracteres por usar UTF-16.
      // No se normaliza ni modifica la contraseña que se envía a Auth.
      met: Array.from(password).length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'letter',
      es: 'Una letra',
      en: 'One letter',
      met: /\p{L}/u.test(password),
    },
    {
      id: 'number',
      es: 'Un número',
      en: 'One number',
      met: /\p{N}/u.test(password),
    },
    {
      id: 'special',
      es: 'Un carácter especial (por ejemplo . - _ @ !)',
      en: 'One special character (for example . - _ @ !)',
      met: SPECIAL.test(password),
    },
  ];
}

/** true sólo si se cumplen las cuatro reglas. */
export function isPasswordAcceptable(password: string): boolean {
  return evaluatePassword(password).every(rule => rule.met);
}
