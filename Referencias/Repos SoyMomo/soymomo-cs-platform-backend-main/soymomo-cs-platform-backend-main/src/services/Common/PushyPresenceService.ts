import axios from 'axios';
import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import type {
  PushyPresenceApiResponse,
  PushyPresenceEntry,
  WearerPushyPresence,
} from '../../interfaces/PushyPresenceIfcs';
import Wearer from '../../models/Watch/Wearer';
import {
  isPushySupportedModel,
  PUSHY_REQUEST_TIMEOUT_MS,
  pushyApiUrl,
  resolvePushyApiKey,
} from './pushyConfig';

const UNSUPPORTED: WearerPushyPresence = {
  supported: false,
  hasToken: false,
  online: null,
  lastActive: null,
  error: null,
};

@injectable()
export class PushyPresenceService {
  private readonly API_URL: string;

  constructor() {
    this.API_URL = pushyApiUrl();
  }

  /**
   * Unico lugar del codigo que conoce los nombres de campo de Pushy. Tolera las
   * variantes del timestamp porque la documentacion no fija la unidad.
   */
  // eslint-disable-next-line class-methods-use-this
  private static mapPresenceEntry(
    entry: PushyPresenceEntry | undefined
  ): Pick<WearerPushyPresence, 'online' | 'lastActive'> {
    if (!entry) {
      return { online: false, lastActive: null };
    }

    const raw = entry.last_active ?? entry.lastActive ?? null;
    let lastActive: string | null = null;

    if (typeof raw === 'number') {
      // Epoch en segundos si el valor es chico; en milisegundos si no.
      const ms = raw < 1e12 ? raw * 1000 : raw;
      const date = new Date(ms);
      lastActive = Number.isNaN(date.getTime()) ? null : date.toISOString();
    } else if (typeof raw === 'string' && raw) {
      const date = new Date(raw);
      lastActive = Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    return { online: Boolean(entry.online), lastActive };
  }

  private async fetchPresence(
    token: string,
    apiKey: string
  ): Promise<PushyPresenceEntry | undefined> {
    const response = await axios.post<PushyPresenceApiResponse>(
      `${this.API_URL}/devices/presence`,
      { tokens: [token] },
      {
        params: { api_key: apiKey },
        headers: { 'Content-Type': 'application/json' },
        timeout: PUSHY_REQUEST_TIMEOUT_MS,
      }
    );

    const entries = response.data?.presence ?? [];
    return entries.find((e) => (e.id ?? e.token) === token) ?? entries[0];
  }

  async getPresenceByWearer(
    wearerId: string
  ): Promise<WearerPushyPresence | null> {
    const query = new Parse.Query(Wearer);
    query.equalTo('objectId', wearerId);
    const wearer = await query.first({ useMasterKey: true });

    if (!wearer) return null;

    const hardwareModel = wearer.get('hardwareModel') as string | undefined;
    const token = wearer.get('pushy') as string | undefined;

    if (!isPushySupportedModel(hardwareModel)) {
      return UNSUPPORTED;
    }

    if (!token) {
      return { ...UNSUPPORTED, supported: true, hasToken: false };
    }

    const apiKey = resolvePushyApiKey(hardwareModel);
    if (!apiKey) {
      return {
        supported: true,
        hasToken: true,
        online: null,
        lastActive: null,
        error: 'missing_api_key',
      };
    }

    try {
      const entry = await this.fetchPresence(token, apiKey);
      return {
        supported: true,
        hasToken: true,
        error: null,
        ...PushyPresenceService.mapPresenceEntry(entry),
      };
    } catch (error) {
      // Pushy responde 400 NO_RESULTS cuando el token no esta registrado en la
      // app. Es el equivalente a un presence vacio, no una falla del servicio.
      if (
        axios.isAxiosError(error) &&
        (error.response?.data as { code?: string } | undefined)?.code ===
          'NO_RESULTS'
      ) {
        return {
          supported: true,
          hasToken: true,
          online: false,
          lastActive: null,
          error: null,
        };
      }

      if (axios.isAxiosError(error)) {
        // eslint-disable-next-line no-console
        console.error(
          `Pushy presence error: ${error.response?.status ?? 'network'} - ${
            error.message
          }`
        );
      } else {
        // eslint-disable-next-line no-console
        console.error('Pushy presence error:', error);
      }
      return {
        supported: true,
        hasToken: true,
        online: null,
        lastActive: null,
        error: 'pushy_unavailable',
      };
    }
  }
}
