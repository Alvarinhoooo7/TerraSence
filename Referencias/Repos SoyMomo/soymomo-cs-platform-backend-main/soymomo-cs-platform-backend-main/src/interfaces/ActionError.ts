/**
 * Error de una accion sobre el reloj que el controller sabe traducir a HTTP.
 *
 * Vive aparte de cada feature para que las cards del dashboard reciban siempre
 * la misma forma ({ message, code }) y puedan distinguir "reloj sin token" de
 * "Pushy caido" sin parsear texto. Cada feature declara su propio union de
 * codigos y extiende esta clase.
 */
export class ActionError<TCode extends string = string> extends Error {
  constructor(
    public readonly code: TCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ActionError';
  }
}
