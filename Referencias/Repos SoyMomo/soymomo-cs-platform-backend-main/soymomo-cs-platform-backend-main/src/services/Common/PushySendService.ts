import axios from 'axios';
import { injectable } from 'tsyringe';

import {
  PUSHY_REQUEST_TIMEOUT_MS,
  pushyApiUrl,
  resolvePushyApiKey,
} from './pushyConfig';

/**
 * Un push a un reloj apagado no debe quedar vivo durante dias: cuando el reloj
 * despierte, el caso de soporte ya estaria cerrado.
 */
const TIME_TO_LIVE_SECONDS = 3600;

export interface PushySendResult {
  id: string | null;
}

/**
 * Unico lugar que envia notificaciones a Pushy. Aparte de PushyPresenceService
 * a proposito: enviar y consultar presencia son responsabilidades distintas,
 * aunque compartan la resolucion de api key.
 */
@injectable()
export class PushySendService {
  private readonly API_URL: string;

  constructor() {
    this.API_URL = pushyApiUrl();
  }

  /**
   * Envia una data notification a un unico token. Lanza si Pushy la rechaza:
   * el caller decide como traducirlo, porque aca un fallo si es un fallo real
   * (a diferencia de la consulta de presencia, que degrada).
   */
  async sendDataNotification(
    token: string,
    hardwareModel: string | undefined,
    data: Record<string, unknown>
  ): Promise<PushySendResult> {
    const apiKey = resolvePushyApiKey(hardwareModel);
    if (!apiKey) {
      throw new Error(`No Pushy API key configured for model ${hardwareModel}`);
    }

    try {
      const response = await axios.post(
        `${this.API_URL}/push`,
        {
          to: [token],
          // eslint-disable-next-line camelcase
          time_to_live: TIME_TO_LIVE_SECONDS,
          data,
        },
        {
          params: { api_key: apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: PUSHY_REQUEST_TIMEOUT_MS,
        }
      );

      return { id: response.data?.id ?? null };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 'network';
        const body = error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message;
        throw new Error(`Pushy send error: ${status} - ${body}`);
      }
      throw error;
    }
  }
}
