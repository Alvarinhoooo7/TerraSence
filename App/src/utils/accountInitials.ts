/** Iniciales para el avatar de la cuenta: nombre y apellido; sin ellos, la primera letra del correo. */
export function accountInitials(firstName: string | null | undefined, lastName: string | null | undefined, email: string | null | undefined): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  const letters = [first, last].filter(Boolean).map(part => Array.from(part)[0]!.toUpperCase()).join('');
  if (letters) return letters;
  const fallback = Array.from((email ?? '').trim())[0];
  return fallback ? fallback.toUpperCase() : '?';
}
