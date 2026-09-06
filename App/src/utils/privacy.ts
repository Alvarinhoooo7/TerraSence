// src/utils/privacy.ts
//
// Censurado de identidades en el flujo de aprobación por QR.
//
// Quien escanea el QR y quien administra el equipo no se conocen todavía: el
// solicitante entra en una cola y el administrador decide. Mostrar el nombre y el
// correo completos de la otra parte antes de esa decisión expone datos personales
// de alguien que aún no ha aceptado nada.
//
// Se conserva sólo la inicial de cada palabra del nombre y la inicial de cada parte
// del correo. Es suficiente para reconocer a quien esperas y no basta para escribirle,
// buscarlo ni identificarlo si no lo conocías ya.
//
// El censurado es sólo de presentación: el valor real sigue llegando del backend y
// las políticas RLS son las que deciden quién puede leerlo. Esto no sustituye a esas
// políticas, sólo evita mostrar en pantalla más de lo necesario.

/** Sustituye por `x` todo menos el primer carácter, que se devuelve en mayúscula. */
function ocultarResto(token: string): string {
  if (!token) return '';
  return token[0].toUpperCase() + 'x'.repeat(Math.max(token.length - 1, 0));
}

/**
 * `Alvaro Villena` → `Axxxxx Vxxxxxx`
 *
 * Cada palabra conserva su inicial. Devuelve cadena vacía si no hay nombre, para que
 * la pantalla decida qué poner en su lugar en vez de mostrar un `undefined`.
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(ocultarResto)
    .join(' ');
}

/**
 * `alvarovillena8@gmail.com` → `Axxxxxxxxxxxxx@Gxxxxxxxx`
 *
 * Se censuran por separado la parte local y el dominio; dentro del dominio también
 * desaparecen los puntos, para no revelar de qué proveedor es la cuenta.
 *
 * Un valor sin `@` se trata como un único token: no se asume que sea un correo válido.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const limpio = email.trim();
  const arroba = limpio.lastIndexOf('@');
  if (arroba <= 0) return ocultarResto(limpio);
  return `${ocultarResto(limpio.slice(0, arroba))}@${ocultarResto(limpio.slice(arroba + 1))}`;
}
