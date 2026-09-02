import 'reflect-metadata';

import axios from 'axios';
import { container } from 'tsyringe';

import { PushySendService } from '../../../src/services/Common/PushySendService';

// Ojo: jest.mock('axios') tambien mockea axios.isAxiosError, que pasa a
// devolver undefined. Por eso el test de error lo fuerza explicitamente.
jest.mock('axios');

const mockedPost = axios.post as jest.Mock;

const KEY_V1_V2 = 'key-v1-v2';
const KEY_V3_V4 = 'key-v3-v4';

describe('PushySendService', () => {
  let service: PushySendService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PUSHY_API_URL: 'https://api.pushy.me',
      PUSHY_API_KEY_SPACE_V1_V2: KEY_V1_V2,
      PUSHY_API_KEY_SPACE_V3_V4: KEY_V3_V4,
    };
    service = container.resolve(PushySendService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('manda el body exacto que espera Pushy', async () => {
    mockedPost.mockResolvedValue({ data: { success: true, id: 'push-1' } });
    const data = { pushCode: 80, pushCategory: 'installApk' };

    const result = await service.sendDataNotification(
      'token-abc',
      'Soymomo_Space_v3',
      data
    );

    expect(result).toEqual({ id: 'push-1' });
    const [url, body, config] = mockedPost.mock.calls[0];
    expect(url).toBe('https://api.pushy.me/push');
    expect(body).toEqual({
      to: ['token-abc'],
      time_to_live: 3600,
      data,
    });
    expect(config.params).toEqual({ api_key: KEY_V3_V4 });
  });

  it.each([
    ['Soymomo_Space_v1', KEY_V1_V2],
    ['Soymomo_Space_v2', KEY_V1_V2],
    ['Soymomo_Space_v3', KEY_V3_V4],
    ['Soymomo_Space_v4', KEY_V3_V4],
  ])('%s usa la key correspondiente', async (model, expectedKey) => {
    mockedPost.mockResolvedValue({ data: { id: 'x' } });

    await service.sendDataNotification('t', model, {});

    expect(mockedPost.mock.calls[0][2].params).toEqual({
      api_key: expectedKey,
    });
  });

  it('lanza si el modelo no tiene key y no llama a la API', async () => {
    await expect(
      service.sendDataNotification('t', 'Soymomo_Space_Lite_v1', {})
    ).rejects.toThrow('No Pushy API key configured');
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('lanza si falta la key en el env', async () => {
    delete process.env.PUSHY_API_KEY_SPACE_V3_V4;

    await expect(
      service.sendDataNotification('t', 'Soymomo_Space_v3', {})
    ).rejects.toThrow('No Pushy API key configured');
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('traduce el error de Pushy a un Error con status y body', async () => {
    mockedPost.mockRejectedValue({
      message: 'Request failed',
      response: { status: 400, data: { code: 'INVALID_TOKEN' } },
    });
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    await expect(
      service.sendDataNotification('t', 'Soymomo_Space_v3', {})
    ).rejects.toThrow('Pushy send error: 400 - {"code":"INVALID_TOKEN"}');
  });

  it('devuelve id null si Pushy no lo informa', async () => {
    mockedPost.mockResolvedValue({ data: { success: true } });

    const result = await service.sendDataNotification(
      't',
      'Soymomo_Space_v3',
      {}
    );

    expect(result).toEqual({ id: null });
  });
});
