import 'reflect-metadata';

import { container } from 'tsyringe';

import { PushyPresenceService } from '../../../src/services/Common/PushyPresenceService';
import { PushySendService } from '../../../src/services/Common/PushySendService';
import { WatchConnectivityService } from '../../../src/services/Watch/WatchConnectivityService';
import { WatchStatusService } from '../../../src/services/Watch/WatchStatusService';

const equalToMock = jest.fn().mockReturnThis();
const firstMock = jest.fn();
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
        first: firstMock,
      })),
      Object: MockedParseObject,
      Cloud: { run: (...args: unknown[]) => cloudRunMock(...args) },
    },
  };
});

const getPackagesInfoVersion = jest.fn();
const getInstalledAppsRaw = jest.fn();
const getPresenceByWearer = jest.fn();
const sendDataNotification = jest.fn();

/** Simula el Wearer que devuelve Parse. */
function mockWearer(hardwareModel?: string, pushy?: string) {
  firstMock.mockResolvedValue(
    hardwareModel === undefined && pushy === undefined
      ? undefined
      : {
          get: (field: string) => {
            if (field === 'hardwareModel') return hardwareModel;
            if (field === 'pushy') return pushy;
            if (field === 'deviceId') return 'dev1';
            return undefined;
          },
        }
  );
}

const ONLINE = {
  supported: true,
  hasToken: true,
  online: true,
  lastActive: 'x',
  error: null,
};
const OFFLINE = { ...ONLINE, online: false };

describe('WatchConnectivityService', () => {
  let service: WatchConnectivityService;

  beforeEach(() => {
    container.registerInstance(WatchStatusService, {
      getPackagesInfoVersion,
      getInstalledAppsRaw,
    } as unknown as WatchStatusService);
    container.registerInstance(PushyPresenceService, {
      getPresenceByWearer,
    } as unknown as PushyPresenceService);
    container.registerInstance(PushySendService, {
      sendDataNotification,
    } as unknown as PushySendService);

    service = container.resolve(WatchConnectivityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
  });

  describe('modelos no soportados', () => {
    it.each(['Soymomo_Space_Lite_v1', 'Soymomo_Space_v1', 'Otro_modelo'])(
      '%s devuelve supported false y no consulta WatchStatus',
      async (model) => {
        mockWearer(model, 'token');

        const result = await service.getDiagnosis('w1');

        expect(result?.supported).toBe(false);
        expect(result?.reason).toBe('unsupported_model');
        expect(getPackagesInfoVersion).not.toHaveBeenCalled();
        expect(getInstalledAppsRaw).not.toHaveBeenCalled();
      }
    );

    it('devuelve null si el wearer no existe', async () => {
      mockWearer();

      await expect(service.getDiagnosis('w1')).resolves.toBeNull();
    });
  });

  describe('Space 2 (comparacion >= 49)', () => {
    it('con 49 esta al dia', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: 49,
        versionName: '2.8.3',
        watchStatusUpdatedAt: 'x',
        found: true,
        hasPackagesInfo: true,
      });

      const result = await service.getDiagnosis('w1');

      expect(result?.upToDate).toBe(true);
      expect(result?.action).toBeNull();
      expect(getPresenceByWearer).not.toHaveBeenCalled();
    });

    it('con 48 pide la accion', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: 48,
        versionName: '2.8.2',
        watchStatusUpdatedAt: 'x',
        found: true,
        hasPackagesInfo: true,
      });
      getPresenceByWearer.mockResolvedValue(ONLINE);

      const result = await service.getDiagnosis('w1');

      expect(result?.upToDate).toBe(false);
      expect(result?.action).toBe('space2RepushCredentials');
      expect(result?.comparison).toBe('gte');
      // El diagnostico nunca consulta Pushy: el dashboard ya trae la presencia
      // por su propio endpoint, y la guarda del backend la pide aparte.
      expect(getPresenceByWearer).not.toHaveBeenCalled();
    });

    it('una version MAYOR a 49 tambien esta al dia', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: 50,
        versionName: '2.9',
        watchStatusUpdatedAt: 'x',
        found: true,
        hasPackagesInfo: true,
      });

      const result = await service.getDiagnosis('w1');

      expect(result?.upToDate).toBe(true);
      expect(result?.comparison).toBe('gte');
      expect(getPresenceByWearer).not.toHaveBeenCalled();
    });

    it('sin WatchStatus informa no_watch_status', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: null,
        versionName: null,
        watchStatusUpdatedAt: null,
        found: false,
        hasPackagesInfo: false,
      });

      const result = await service.getDiagnosis('w1');

      expect(result?.reason).toBe('no_watch_status');
      expect(result?.upToDate).toBeNull();
    });

    it('sin el package informa package_not_found', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: null,
        versionName: null,
        watchStatusUpdatedAt: 'x',
        found: false,
        hasPackagesInfo: true,
      });

      const result = await service.getDiagnosis('w1');

      expect(result?.reason).toBe('package_not_found');
    });
  });

  describe('Space 3/4 (comparacion >= 42)', () => {
    it.each([42, 43, 99])('con %i esta al dia', async (versionCode) => {
      mockWearer('Soymomo_Space_v3', 'token');
      getInstalledAppsRaw.mockResolvedValue({
        apps: [
          {
            packageName: 'com.sosmartlabs.watchauthmanager',
            versionCode,
            versionName: 'v',
          },
        ],
        watchStatusUpdatedAt: 'x',
      });

      const result = await service.getDiagnosis('w1');

      expect(result?.upToDate).toBe(true);
      expect(result?.comparison).toBe('gte');
      expect(getPresenceByWearer).not.toHaveBeenCalled();
    });

    it('con 38 pide la accion', async () => {
      mockWearer('Soymomo_Space_v4', 'token');
      getInstalledAppsRaw.mockResolvedValue({
        apps: [
          {
            packageName: 'com.sosmartlabs.watchauthmanager',
            versionCode: 38,
            versionName: '4.3.3',
          },
        ],
        watchStatusUpdatedAt: 'x',
      });
      getPresenceByWearer.mockResolvedValue(ONLINE);

      const result = await service.getDiagnosis('w1');

      expect(result?.upToDate).toBe(false);
      expect(result?.action).toBe('installAuthManagerApk');
      expect(result?.installedVersionCode).toBe(38);
      expect(result?.expectedVersionCode).toBe(42);
    });

    it('sin la app informa package_not_found', async () => {
      mockWearer('Soymomo_Space_v3', 'token');
      getInstalledAppsRaw.mockResolvedValue({
        apps: [{ packageName: 'com.otra.app', versionCode: 1 }],
        watchStatusUpdatedAt: 'x',
      });

      const result = await service.getDiagnosis('w1');

      expect(result?.reason).toBe('package_not_found');
    });
  });

  describe('guardas antes de ejecutar', () => {
    it('rechaza si ya esta al dia', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: 49,
        versionName: 'x',
        watchStatusUpdatedAt: 'x',
        found: true,
        hasPackagesInfo: true,
      });

      await expect(service.repushSpace2Credentials('w1')).rejects.toMatchObject(
        { code: 'already_up_to_date', status: 409 }
      );
      expect(cloudRunMock).not.toHaveBeenCalled();
    });

    it('rechaza si el reloj esta offline', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: 48,
        versionName: 'x',
        watchStatusUpdatedAt: 'x',
        found: true,
        hasPackagesInfo: true,
      });
      getPresenceByWearer.mockResolvedValue(OFFLINE);

      await expect(service.repushSpace2Credentials('w1')).rejects.toMatchObject(
        { code: 'watch_offline', status: 409 }
      );
      expect(cloudRunMock).not.toHaveBeenCalled();
    });

    it('rechaza si el track no corresponde a la ruta', async () => {
      mockWearer('Soymomo_Space_v3', 'token');
      getInstalledAppsRaw.mockResolvedValue({
        apps: [
          { packageName: 'com.sosmartlabs.watchauthmanager', versionCode: 38 },
        ],
        watchStatusUpdatedAt: 'x',
      });
      getPresenceByWearer.mockResolvedValue(ONLINE);

      await expect(service.repushSpace2Credentials('w1')).rejects.toMatchObject(
        { code: 'wrong_track', status: 400 }
      );
      expect(cloudRunMock).not.toHaveBeenCalled();
    });

    it('rechaza si no se pudo determinar la version', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: null,
        versionName: null,
        watchStatusUpdatedAt: null,
        found: false,
        hasPackagesInfo: false,
      });

      await expect(service.repushSpace2Credentials('w1')).rejects.toMatchObject(
        {
          code: 'unknown_version',
          status: 409,
        }
      );
      expect(cloudRunMock).not.toHaveBeenCalled();
    });

    it('toma el deviceId del Wearer, no del request', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: 48,
        versionName: 'x',
        watchStatusUpdatedAt: 'x',
        found: true,
        hasPackagesInfo: true,
      });
      getPresenceByWearer.mockResolvedValue(ONLINE);
      cloudRunMock.mockResolvedValue({ ok: true });

      await service.repushSpace2Credentials('w3');

      expect(cloudRunMock.mock.calls[0][1].deviceId).toBe('dev1');
    });

    it('rechaza un modelo no soportado', async () => {
      mockWearer('Soymomo_Space_Lite_v1', 'token');

      await expect(service.installAuthManagerApk('w1')).rejects.toMatchObject({
        code: 'unsupported_model',
        status: 400,
      });
      expect(sendDataNotification).not.toHaveBeenCalled();
    });
  });

  describe('ejecucion', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('Space 2 llama la cloud function con el deviceId y un secreto', async () => {
      mockWearer('Soymomo_Space_v2', 'token');
      getPackagesInfoVersion.mockResolvedValue({
        versionCode: 48,
        versionName: 'x',
        watchStatusUpdatedAt: 'x',
        found: true,
        hasPackagesInfo: true,
      });
      getPresenceByWearer.mockResolvedValue(ONLINE);
      cloudRunMock.mockResolvedValue({ ok: true });

      await service.repushSpace2Credentials('w4');

      // El valor del secreto no se duplica aca: solo importa que se envie uno
      // junto al deviceId. Duplicarlo obligaria a mantener dos copias.
      const [fnName, params] = cloudRunMock.mock.calls[0];
      expect(fnName).toBe('space2RepushMomoCredentials');
      expect(params.deviceId).toBe('dev1');
      expect(typeof params.secret).toBe('string');
      expect(params.secret.length).toBeGreaterThan(0);
    });

    it('Space 3/4 manda el payload de installApk con la v43', async () => {
      mockWearer('Soymomo_Space_v3', 'token-abc');
      getInstalledAppsRaw.mockResolvedValue({
        apps: [
          { packageName: 'com.sosmartlabs.watchauthmanager', versionCode: 38 },
        ],
        watchStatusUpdatedAt: 'x',
      });
      getPresenceByWearer.mockResolvedValue(ONLINE);
      sendDataNotification.mockResolvedValue({ id: 'push-1' });

      await service.installAuthManagerApk('w5');

      const [token, model, data] = sendDataNotification.mock.calls[0];
      expect(token).toBe('token-abc');
      expect(model).toBe('Soymomo_Space_v3');
      expect(data).toMatchObject({
        pushCode: 80,
        pushCategory: 'installApk',
        packageName: 'com.sosmartlabs.watchauthmanager',
        versionCode: 43,
        fileHash:
          'ab8219649198c38b9bb4aa01865ccea7516562e13990a455a6c2a4558e763339',
      });
      expect(data.apkUrl).toContain('watchauthmanager-release-v43.apk');
      expect(typeof data.sentAt).toBe('string');
    });
  });
});
