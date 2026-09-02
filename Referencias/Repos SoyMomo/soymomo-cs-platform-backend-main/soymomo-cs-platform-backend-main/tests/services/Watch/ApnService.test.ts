import 'reflect-metadata';

import { container } from 'tsyringe';

import { PushySendService } from '../../../src/services/Common/PushySendService';
import {
  ApnService,
  buildProtocolCommand,
  toPushPayload,
} from '../../../src/services/Watch/ApnService';

const equalToMock = jest.fn().mockReturnThis();
const ascendingMock = jest.fn().mockReturnThis();
const addAscendingMock = jest.fn().mockReturnThis();
const selectMock = jest.fn().mockReturnThis();
const limitMock = jest.fn().mockReturnThis();
const firstMock = jest.fn();
const findMock = jest.fn();
const cloudRunMock = jest.fn();

jest.mock('parse/node', () => {
  const MockedParseObject: any = function () {
    return { set: jest.fn(), get: jest.fn() };
  };
  MockedParseObject.registerSubclass = jest.fn();
  MockedParseObject.createWithoutData = jest.fn((id: string) => ({ id }));
  return {
    __esModule: true,
    default: {
      Query: jest.fn().mockImplementation(() => ({
        equalTo: equalToMock,
        ascending: ascendingMock,
        addAscending: addAscendingMock,
        select: selectMock,
        limit: limitMock,
        first: firstMock,
        find: findMock,
      })),
      Object: MockedParseObject,
      Cloud: { run: (...args: unknown[]) => cloudRunMock(...args) },
    },
  };
});

const sendDataNotification = jest.fn();

/** Fila de la clase APN tal como la devuelve Parse. */
function apnRow(fields: Record<string, unknown>, id = 'apn-1') {
  return {
    id,
    get: (field: string) => fields[field],
  } as any;
}

/**
 * Credenciales ficticias. Van por constante y no como literal: los APN reales
 * traen usuario y clave publicos del operador, pero un literal al lado de
 * `password` dispara el detector de secretos del CI.
 */
const CREDENTIAL = 'carrier-credential';

const ENTEL = {
  key: 'cl-entel-soymomo',
  name: 'SoyMomo Entel',
  carrier: 'Entel',
  apn: 'm2m.entel.cl',
  user: CREDENTIAL,
  password: CREDENTIAL,
  mcc: '730',
  mnc: '01',
  numeric: '73001',
  type: 'default,supl',
  simScope: 'SOYMOMO',
  authType: 'PAP',
  protocol: 'IPV4V6',
  roamingProtocol: 'IPV4V6',
};

/** Operador sin credenciales: los segmentos vacios se conservan. */
const WOM = {
  ...ENTEL,
  key: 'cl-wom-internet',
  name: 'WOM Internet',
  carrier: 'WOM',
  apn: 'internet',
  user: '',
  password: '',
  mnc: '09',
  numeric: '73009',
  authType: null,
};

function mockWearer(hardwareModel?: string, extra: Record<string, any> = {}) {
  const fields: Record<string, any> = {
    hardwareModel,
    deviceId: 'dev1',
    pushy: 'token1',
    ...extra,
  };
  return {
    get: (field: string) => fields[field],
  };
}

/** El service busca primero el Wearer y despues el APN. */
function mockLookups(wearer: unknown, apn: unknown) {
  firstMock.mockResolvedValueOnce(wearer).mockResolvedValueOnce(apn);
}

describe('ApnService', () => {
  let service: ApnService;

  beforeEach(() => {
    container.registerInstance(PushySendService, {
      sendDataNotification,
    } as unknown as PushySendService);

    service = container.resolve(ApnService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
  });

  describe('buildProtocolCommand', () => {
    it('arma el comando con las credenciales del operador', () => {
      expect(buildProtocolCommand(apnRow(ENTEL))).toBe(
        `APN,m2m.entel.cl,${CREDENTIAL},${CREDENTIAL},73001`
      );
    });

    it('conserva los segmentos vacios cuando no hay usuario ni password', () => {
      expect(buildProtocolCommand(apnRow(WOM))).toBe('APN,internet,,,73009');
    });

    it('trata undefined como vacio en vez de escribir "undefined"', () => {
      const row = apnRow({ ...ENTEL, user: undefined, password: undefined });

      expect(buildProtocolCommand(row)).toBe('APN,m2m.entel.cl,,,73001');
    });
  });

  describe('toPushPayload', () => {
    it('no incluye metadata de Parse', () => {
      const payload = toPushPayload(
        apnRow({
          ...ENTEL,
          objectId: 'x',
          createdAt: 'x',
          source: 'SOYMOMO_INTERNAL',
          priority: 100,
          enabled: true,
          country: 'CL',
        })
      ) as unknown as Record<string, unknown>;

      expect(Object.keys(payload).sort()).toEqual(
        [
          'apn',
          'authType',
          'carrierEnabled',
          'current',
          'key',
          'mcc',
          'mnc',
          'name',
          'numeric',
          'password',
          'protocol',
          'roamingProtocol',
          'type',
          'user',
        ].sort()
      );
    });

    it('marca el apn como habilitado y actual', () => {
      const payload = toPushPayload(apnRow(ENTEL));

      // El brain los lee con default false/0: sin ellos la fila entra apagada.
      expect(payload.carrierEnabled).toBe(true);
      expect(payload.current).toBe(1);
    });

    it('omite los opcionales vacios', () => {
      const payload = toPushPayload(apnRow(WOM));

      expect(payload).not.toHaveProperty('authType');
      expect(payload).not.toHaveProperty('mvnoType');
      expect(payload.user).toBe('');
    });

    it('incluye los datos de mvno cuando existen', () => {
      const payload = toPushPayload(
        apnRow({ ...ENTEL, mvnoType: 'spn', mvnoMatchData: 'BAIT' })
      );

      expect(payload.mvnoType).toBe('spn');
      expect(payload.mvnoMatchData).toBe('BAIT');
    });
  });

  describe('getCatalog', () => {
    it('devuelve null si el wearer no existe', async () => {
      firstMock.mockResolvedValueOnce(undefined);

      await expect(service.getCatalog('w1')).resolves.toBeNull();
    });

    it('devuelve las opciones y el track del modelo', async () => {
      firstMock.mockResolvedValueOnce(mockWearer('Soymomo_Space_v2'));
      findMock.mockResolvedValueOnce([apnRow(ENTEL), apnRow(WOM, 'apn-2')]);

      const catalog = await service.getCatalog('w1', 'CL');

      expect(catalog).toMatchObject({
        supported: true,
        track: 'protocol',
        hardwareModel: 'Soymomo_Space_v2',
        country: 'CL',
      });
      expect(catalog?.options).toEqual([
        {
          objectId: 'apn-1',
          key: 'cl-entel-soymomo',
          name: 'SoyMomo Entel',
          carrier: 'Entel',
          apn: 'm2m.entel.cl',
          simScope: 'SOYMOMO',
        },
        {
          objectId: 'apn-2',
          key: 'cl-wom-internet',
          name: 'WOM Internet',
          carrier: 'WOM',
          apn: 'internet',
          simScope: 'SOYMOMO',
        },
      ]);
    });

    it('nunca expone el password en las opciones', async () => {
      firstMock.mockResolvedValueOnce(mockWearer('Soymomo_Space_v4'));
      findMock.mockResolvedValueOnce([apnRow(ENTEL)]);

      const catalog = await service.getCatalog('w1', 'CL');

      expect(catalog?.options[0]).not.toHaveProperty('password');
    });

    it('filtra por el pais pedido y solo los habilitados', async () => {
      firstMock.mockResolvedValueOnce(mockWearer('Soymomo_Space_v3'));
      findMock.mockResolvedValueOnce([]);

      await service.getCatalog('w1', 'ES');

      expect(equalToMock).toHaveBeenCalledWith('country', 'ES');
      expect(equalToMock).toHaveBeenCalledWith('enabled', true);
    });

    it('sin pais devuelve el track pero no consulta el catalogo', async () => {
      firstMock.mockResolvedValueOnce(mockWearer('Soymomo_Space_v2'));

      const catalog = await service.getCatalog('w1');

      expect(catalog).toEqual({
        supported: true,
        track: 'protocol',
        hardwareModel: 'Soymomo_Space_v2',
        country: null,
        options: [],
      });
      expect(findMock).not.toHaveBeenCalled();
    });

    it('marca supported false para un modelo desconocido', async () => {
      firstMock.mockResolvedValueOnce(mockWearer('Soymomo_H2O'));
      findMock.mockResolvedValueOnce([]);

      const catalog = await service.getCatalog('w1', 'CL');

      expect(catalog).toMatchObject({ supported: false, track: null });
    });
  });

  describe('getCountries', () => {
    it('agrupa por pais, cuenta y ordena alfabeticamente', async () => {
      findMock.mockResolvedValueOnce([
        apnRow({ country: 'ES' }),
        apnRow({ country: 'CL' }),
        apnRow({ country: 'ES' }),
        apnRow({ country: 'AR' }),
        apnRow({ country: 'CL' }),
        apnRow({ country: 'CL' }),
      ]);

      await expect(service.getCountries()).resolves.toEqual([
        { country: 'AR', count: 1 },
        { country: 'CL', count: 3 },
        { country: 'ES', count: 2 },
      ]);
      expect(equalToMock).toHaveBeenCalledWith('enabled', true);
    });

    it('ignora las filas sin pais', async () => {
      findMock.mockResolvedValueOnce([
        apnRow({ country: 'CL' }),
        apnRow({ country: undefined }),
      ]);

      await expect(service.getCountries()).resolves.toEqual([
        { country: 'CL', count: 1 },
      ]);
    });
  });

  describe('sendApn', () => {
    it('no envia un apn deshabilitado aunque llegue su objectId', async () => {
      mockLookups(mockWearer('Soymomo_Space_v2'), undefined);

      await expect(service.sendApn('w1', 'apn-off')).rejects.toMatchObject({
        code: 'apn_not_found',
        status: 404,
      });
      expect(equalToMock).toHaveBeenCalledWith('enabled', true);
      expect(cloudRunMock).not.toHaveBeenCalled();
    });
  });

  describe('sendApn por protocolo (Space Lite / 1.0 / 2.0)', () => {
    it.each(['Soymomo_Space_Lite_v1', 'Soymomo_Space_v1', 'Soymomo_Space_v2'])(
      '%s manda el comando por cloud function',
      async (model) => {
        mockLookups(mockWearer(model), apnRow(ENTEL));
        cloudRunMock.mockResolvedValue({});

        const result = await service.sendApn('w1', 'apn-1');

        expect(cloudRunMock).toHaveBeenCalledWith('sendProtocolCommand', {
          deviceId: 'dev1',
          command: `APN,m2m.entel.cl,${CREDENTIAL},${CREDENTIAL},73001`,
        });
        expect(sendDataNotification).not.toHaveBeenCalled();
        expect(result).toEqual({
          track: 'protocol',
          apnKey: 'cl-entel-soymomo',
        });
      }
    );

    it('usa el deviceId del wearer, no uno del request', async () => {
      mockLookups(
        mockWearer('Soymomo_Space_v2', { deviceId: 'real-device' }),
        apnRow(ENTEL)
      );
      cloudRunMock.mockResolvedValue({});

      await service.sendApn('w1', 'apn-1');

      expect(cloudRunMock).toHaveBeenCalledWith(
        'sendProtocolCommand',
        expect.objectContaining({ deviceId: 'real-device' })
      );
    });

    it('falla con no_device_id si el wearer no tiene deviceId', async () => {
      mockLookups(
        mockWearer('Soymomo_Space_v2', { deviceId: undefined }),
        apnRow(ENTEL)
      );

      await expect(service.sendApn('w1', 'apn-1')).rejects.toMatchObject({
        code: 'no_device_id',
        status: 409,
      });
      expect(cloudRunMock).not.toHaveBeenCalled();
    });

    it('traduce el fallo de la cloud function a cloud_function_failed', async () => {
      mockLookups(mockWearer('Soymomo_Space_v2'), apnRow(ENTEL));
      cloudRunMock.mockRejectedValue(new Error('boom'));

      await expect(service.sendApn('w1', 'apn-1')).rejects.toMatchObject({
        code: 'cloud_function_failed',
        status: 502,
      });
    });
  });

  describe('sendApn por push (Space 3.0 / 4.0)', () => {
    it.each(['Soymomo_Space_v3', 'Soymomo_Space_v4'])(
      '%s manda la data notification',
      async (model) => {
        mockLookups(mockWearer(model), apnRow(ENTEL));
        sendDataNotification.mockResolvedValue({ id: 'push-1' });

        const result = await service.sendApn('w1', 'apn-1');

        expect(cloudRunMock).not.toHaveBeenCalled();
        expect(sendDataNotification).toHaveBeenCalledWith(
          'token1',
          model,
          expect.objectContaining({
            pushCode: 6,
            pushCategory: 'apn',
            apn: expect.any(String),
          })
        );
        expect(result).toEqual({
          track: 'push',
          apnKey: 'cl-entel-soymomo',
          pushId: 'push-1',
        });
      }
    );

    it('serializa el apn como string parseable', async () => {
      mockLookups(mockWearer('Soymomo_Space_v3'), apnRow(ENTEL));
      sendDataNotification.mockResolvedValue({ id: 'push-1' });

      await service.sendApn('w1', 'apn-1');

      // El brain hace bundle.getString('apn') antes de JSONObject(...).
      const [, , data] = sendDataNotification.mock.calls[0];
      expect(typeof data.apn).toBe('string');
      expect(JSON.parse(data.apn)).toMatchObject({
        apn: 'm2m.entel.cl',
        carrierEnabled: true,
        current: 1,
      });
    });

    it('falla con no_push_token si el reloj no tiene token', async () => {
      mockLookups(
        mockWearer('Soymomo_Space_v3', { pushy: undefined }),
        apnRow(ENTEL)
      );

      await expect(service.sendApn('w1', 'apn-1')).rejects.toMatchObject({
        code: 'no_push_token',
        status: 409,
      });
      expect(sendDataNotification).not.toHaveBeenCalled();
    });

    it('traduce el fallo de Pushy a push_failed', async () => {
      mockLookups(mockWearer('Soymomo_Space_v4'), apnRow(ENTEL));
      sendDataNotification.mockRejectedValue(new Error('401'));

      await expect(service.sendApn('w1', 'apn-1')).rejects.toMatchObject({
        code: 'push_failed',
        status: 502,
      });
    });
  });

  describe('sendApn: validaciones previas', () => {
    it('falla con wearer_not_found', async () => {
      firstMock.mockResolvedValueOnce(undefined);

      await expect(service.sendApn('w1', 'apn-1')).rejects.toMatchObject({
        code: 'wearer_not_found',
        status: 404,
      });
    });

    it('falla con unsupported_model antes de buscar el APN', async () => {
      firstMock.mockResolvedValueOnce(mockWearer('Soymomo_H2O'));

      await expect(service.sendApn('w1', 'apn-1')).rejects.toMatchObject({
        code: 'unsupported_model',
        status: 400,
      });
      expect(firstMock).toHaveBeenCalledTimes(1);
    });

    it('falla con apn_not_found si el APN no existe', async () => {
      mockLookups(mockWearer('Soymomo_Space_v2'), undefined);

      await expect(service.sendApn('w1', 'apn-1')).rejects.toMatchObject({
        code: 'apn_not_found',
        status: 404,
      });
      expect(cloudRunMock).not.toHaveBeenCalled();
    });
  });
});
