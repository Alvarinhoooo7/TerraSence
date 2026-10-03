// Enmascarado con retardo para campos secretos (código por correo y contraseña
// nueva): el último carácter escrito queda a la vista un momento y luego se oculta.
// El retardo nativo de cada sistema es demasiado breve y no se puede ajustar.

/** Tiempo que el último carácter queda a la vista antes de enmascararse. */
export const SECRET_REVEAL_MS = 900;

export const SECRET_MASK = '*';

/**
 * Posición del carácter que acaba de escribirse, o -1 si el cambio no fue
 * escribir uno solo (borrar, pegar o reemplazar no revelan nada).
 */
export function revealedIndex(previous: string, next: string): number {
  if (next.length !== previous.length + 1) return -1;
  let i = 0;
  while (i < previous.length && previous[i] === next[i]) i++;
  return next.slice(i + 1) === previous.slice(i) ? i : -1;
}

/** El texto enmascarado, salvo el carácter en `revealIndex`. */
export function maskSecret(value: string, revealIndex = -1): string {
  return Array.from(value, (character, position) => position === revealIndex ? character : SECRET_MASK).join('');
}
