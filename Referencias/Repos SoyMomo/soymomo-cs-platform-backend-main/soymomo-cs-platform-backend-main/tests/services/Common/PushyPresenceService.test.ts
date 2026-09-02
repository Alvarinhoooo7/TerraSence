import 'reflect-metadata';

import axios from 'axios';
import { container } from 'tsyringe';

import { PushyPresenceService } from '../../../src/services/Common/PushyPresenceService';

const equalToMock = jest.fn().mockReturnThis();
const firstMock = jest.fn();

jest.mock('parse/node', () => {
  const MockedParseObject = function () {
    return { set: jest.fn(), get: jest.fn() };
  };
  MockedParseObject.registerSubclass = jest.fn();
  return {
    __esModule: true,
    default: {
      Query: jest.fn().mockImplementation(() => ({
        equalTo: equalToMock,
        first: firstMock,
      })),
      Object: MockedParseObject,
    },
  };
});

// Ojo: jest.mock('axios') tambien mockea axios.isAxiosError, que pasa a
// devolver undefined. Por eso el test de error lo fuerza explicitamente.
jest.mock('axios');

const mockedPost = axios.post as jest.Mock;

const KEY_V1_V2 = 'key-para-v1-y-v2';
const KEY_V3_V4 = 'key-para-v3-y-v4';

/** Simula un wearer de Parse con los dos campos que le importan al servicio. */
function mockWearer(hardwareModel: string | undefined, pushy?: string) {
  firstMock.mockResolvedValue({
    get: (field: string) => {
      if (field === 'hardwareModel') return hardwareModel;
      if (field === 'pushy') return pushy;
      return undefined;
    },
  });
}

describe('PushyPresenceService', () => {
  let service: PushyPresenceService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PUSHY_API_URL: 'https://api.pushy.me',
      PUSHY_API_KEY_SPACE_V1_V2: KEY_V1_V2,
      PUSHY_API_KEY_SPACE_V3_V4: KEY_V3_V4,
    };
    service = container.resolve(PushyPresenceService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('resolucion de api key por modelo', () => {
    it.each([
      ['Soymomo_Space_v1', KEY_V1_V2],
      ['Soymomo_Space_v2', KEY_V1_V2],
      ['Soymomo_Space_v3', KEY_V3_V4],
      ['Soymomo_Space_v4', KEY_V3_V4],
    ])('%s usa la key correspondiente', async (model, expectedKey) => {
      mockWearer(model, 'device-token');
      mockedPost.mockResolvedValue({ data: { presence: [] } });

      await service.getPresenceByWearer('watch-1');

      expect(mockedPost).toHaveBeenCalledTimes(1);
      const [, , config] = mockedPost.mock.calls[0];
      expect(config.params).toEqual({ api_key: expectedKey });
    });

    it('manda el token en el body', async () => {
      mockWearer('Soymomo_Space_v3', 'device-token');
      mockedPost.mockResolvedValue({ data: { presence: [] } });

      await service.getPresenceByWearer('watch-1');

      const [url, body] = mockedPost.mock.calls[0];
      expect(url).toBe('https://api.pushy.me/devices/presence');
      expect(body).toEqual({ tokens: ['device-token'] });
    });
  });

  describe('casos sin consulta a Pushy', () => {
    it('Space Lite no usa Pushy: no esta soportado y no llama a la API', async () => {
      mockWearer('Soymomo_Space_Lite_v1', 'device-token');

      const result = await service.getPresenceByWearer('watch-1');

      expect(result).toEqual({
        supported: false,
        hasToken: false,
        online: null,
        lastActive: null,
        error: null,
      });
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('un modelo desconocido no esta soportado y no llama a la API', async () => {
      mockWearer('Soymomo_Otro_v9', 'device-token');

      const result = await service.getPresenceByWearer('watch-1');

      expect(result).toEqual({
        supported: false,
        hasToken: false,
        online: null,
        lastActive: null,
        error: null,
      });
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('sin hardwareModel tampoco esta soportado', async () => {
      mockWearer(undefined, 'device-token');

      const result = await service.getPresenceByWearer('watch-1');

      expect(result?.supported).toBe(false);
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('un modelo soportado sin token informa hasToken false', async () => {
      mockWearer('Soymomo_Space_v3', undefined);

      const result = await service.getPresenceByWearer('watch-1');

      expect(result).toEqual({
        supported: true,
        hasToken: false,
        online: null,
        lastActive: null,
        error: null,
      });
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('sin la key en el env degrada a missing_api_key', async () => {
      delete process.env.PUSHY_API_KEY_SPACE_V3_V4;
      mockWearer('Soymomo_Space_v4', 'device-token');

      const result = await service.getPresenceByWearer('watch-1');

      expect(result?.error).toBe('missing_api_key');
      expect(result?.supported).toBe(true);
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('devuelve null si el wearer no existe', async () => {
      firstMock.mockResolvedValue(undefined);

      const result = await service.getPresenceByWearer('no-existe');

      expect(result).toBeNull();
      expect(mockedPost).not.toHaveBeenCalled();
    });
  });

  describe('mapeo de la respuesta', () => {
    beforeEach(() => {
      mockWearer('Soymomo_Space_v3', 'device-token');
    });

    it('mapea online y convierte un epoch en segundos a ISO', async () => {
      mockedPost.mockResolvedValue({
        data: {
          presence: [
            { id: 'device-token', online: true, last_active: 1755792202 },
          ],
        },
      });

      const result = await service.getPresenceByWearer('watch-1');

      expect(result?.online).toBe(true);
      expect(result?.lastActive).toBe(new Date(1755792202000).toISOString());
      expect(result?.error).toBeNull();
    });

    it('convierte un epoch en milisegundos a ISO', async () => {
      mockedPost.mockResolvedValue({
        data: {
          presence: [
            { id: 'device-token', online: false, last_active: 1755792202000 },
          ],
        },
      });

      const result = await service.getPresenceByWearer('watch-1');

      expect(result?.online).toBe(false);
      expect(result?.lastActive).toBe(new Date(1755792202000).toISOString());
    });

    it('acepta un timestamp en formato ISO', async () => {
      mockedPost.mockResolvedValue({
        data: {
          presence: [
            {
              id: 'device-token',
              online: true,
              last_active: '2026-08-21T14:03:22.000Z',
            },
          ],
        },
      });

      const result = await service.getPresenceByWearer('watch-1');

      expect(result?.lastActive).toBe('2026-08-21T14:03:22.000Z');
    });

    it('si el token no aparece en la respuesta lo reporta offline', async () => {
      mockedPost.mockResolvedValue({ data: { presence: [] } });

      const result = await service.getPresenceByWearer('watch-1');

      expect(result).toEqual({
        supported: true,
        hasToken: true,
        online: false,
        lastActive: null,
        error: null,
      });
    });
  });

  describe('errores de Pushy', () => {
    it('un 400 NO_RESULTS significa token no registrado, no falla de servicio', async () => {
      mockWearer('Soymomo_Space_v3', 'device-token');
      mockedPost.mockRejectedValue({
        message: 'Request failed with status code 400',
        response: { status: 400, data: { code: 'NO_RESULTS' } },
      });
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const result = await service.getPresenceByWearer('watch-1');

      expect(result).toEqual({
        supported: true,
        hasToken: true,
        online: false,
        lastActive: null,
        error: null,
      });
    });

    it('degrada a pushy_unavailable sin lanzar', async () => {
      mockWearer('Soymomo_Space_v3', 'device-token');
      mockedPost.mockRejectedValue({
        message: 'timeout of 5000ms exceeded',
        response: { status: 504 },
      });
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.getPresenceByWearer('watch-1');

      expect(result).toEqual({
        supported: true,
        hasToken: true,
        online: null,
        lastActive: null,
        error: 'pushy_unavailable',
      });
    });
  });
});
