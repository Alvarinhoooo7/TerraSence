/**
 * Forma de la respuesta de POST /devices/presence de Pushy, verificada contra
 * la API real: { presence: [{ id, online, last_active }] } con last_active como
 * epoch en SEGUNDOS.
 *
 * Los campos alternativos (token / lastActive) y las otras unidades de tiempo se
 * siguen tolerando en mapPresenceEntry por si la API cambia.
 */
export interface PushyPresenceEntry {
  id?: string;
  token?: string;
  online?: boolean;
  // eslint-disable-next-line camelcase
  last_active?: number | string;
  lastActive?: number | string;
}

export interface PushyPresenceApiResponse {
  presence?: PushyPresenceEntry[];
}

export type PushyPresenceError = 'missing_api_key' | 'pushy_unavailable';

/**
 * Contrato hacia el frontend. Siempre se responde 200 con este payload: los
 * casos de "no disponible" son datos, no errores, para que la card degrade sin
 * romperse.
 */
export interface WearerPushyPresence {
  /** false cuando el hardwareModel no tiene app de Pushy (Space Lite, desconocidos) */
  supported: boolean;
  /** false cuando el wearer no tiene device token guardado */
  hasToken: boolean;
  online: boolean | null;
  /** ISO 8601, o null si Pushy no reporto actividad */
  lastActive: string | null;
  error: PushyPresenceError | null;
}
