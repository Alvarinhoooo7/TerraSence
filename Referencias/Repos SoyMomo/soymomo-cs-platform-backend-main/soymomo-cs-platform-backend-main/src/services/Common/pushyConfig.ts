/**
 * Config compartida de Pushy. Vive aparte de los services para que tanto la
 * consulta de presencia como el envio de push resuelvan la api key igual, sin
 * que uno tenga que depender del otro.
 */

const DEFAULT_API_URL = 'https://api.pushy.me';

export const PUSHY_REQUEST_TIMEOUT_MS = 5000;

/**
 * Cada generacion de reloj vive en una app distinta de Pushy, asi que la key
 * depende del hardwareModel. Space Lite no usa Pushy: al quedar fuera de este
 * mapa, nunca se consulta ni se envia nada para esos relojes.
 *
 * Ojo: este agrupamiento NO es el mismo que usa WearerService.getContacts.
 */
export const PUSHY_MODEL_KEY_ENV: Record<string, string> = {
  Soymomo_Space_v1: 'PUSHY_API_KEY_SPACE_V1_V2',
  Soymomo_Space_v2: 'PUSHY_API_KEY_SPACE_V1_V2',
  Soymomo_Space_v3: 'PUSHY_API_KEY_SPACE_V3_V4',
  Soymomo_Space_v4: 'PUSHY_API_KEY_SPACE_V3_V4',
};

export function pushyApiUrl(): string {
  return process.env.PUSHY_API_URL || DEFAULT_API_URL;
}

export function isPushySupportedModel(hardwareModel?: string | null): boolean {
  return Boolean(hardwareModel && PUSHY_MODEL_KEY_ENV[hardwareModel]);
}

/**
 * La key se resuelve por modelo y su ausencia debe degradar, no lanzar: asi el
 * endpoint sobrevive a un deploy donde los secretos aun no esten cargados.
 */
export function resolvePushyApiKey(
  hardwareModel?: string | null
): string | undefined {
  if (!hardwareModel) return undefined;
  const envName = PUSHY_MODEL_KEY_ENV[hardwareModel];
  if (!envName) return undefined;
  return process.env[envName];
}
