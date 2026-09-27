// src/auth/paths.ts — rutas públicas del acceso al backoffice.
//
// En español, como `/cuenta-confirmada`: son las únicas URL que ve alguien
// sin sesión, y se comparten por correo o chat con el equipo.

export const LOGIN_PATH = '/ingresar';
export const SIGNUP_PATH = '/crear-cuenta';
export const RECOVER_PATH = '/recuperar-acceso';

/** Estado que viaja con la redirección a `/ingresar` para volver después. */
export interface ReturnState {
  from?: string;
}
