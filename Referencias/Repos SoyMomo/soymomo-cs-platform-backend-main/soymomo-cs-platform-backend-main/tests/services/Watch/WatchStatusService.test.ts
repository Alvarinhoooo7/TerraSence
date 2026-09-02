import 'reflect-metadata';

import { container } from 'tsyringe';

import { WatchStatusService } from '../../../src/services/Watch/WatchStatusService';

const equalToMock = jest.fn().mockReturnThis();
const descendingMock = jest.fn().mockReturnThis();
const containedInMock = jest.fn().mockReturnThis();
const firstMock = jest.fn();
const findMock = jest.fn();

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
        descending: descendingMock,
        containedIn: containedInMock,
        first: firstMock,
        find: findMock,
      })),
      Object: MockedParseObject,
    },
  };
});

/** Simula la fila WatchStatus que devuelve Parse. */
function mockWatchStatus(fields: Record<string, unknown>) {
  firstMock.mockResolvedValue({
    get: (field: string) => fields[field],
  });
}

/**
 * Tests de caracterizacion: fijan el comportamiento actual de
 * getEnrichedInstalledAppsByWatch antes de extraer el parseo a utils/androidJson,
 * para que el refactor no cambie lo que ve la card de Apps instaladas.
 */
describe('WatchStatusService', () => {
  let service: WatchStatusService;

  beforeEach(() => {
    service = container.resolve(WatchStatusService);
    findMock.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnrichedInstalledAppsByWatch', () => {
    it('devuelve vacio cuando no hay WatchStatus', async () => {
      firstMock.mockResolvedValue(undefined);

      const result = await service.getEnrichedInstalledAppsByWatch('watch-1');

      expect(result).toEqual({ installedApps: [], watchStatusUpdatedAt: null });
    });

    it('parsea info cuando ya viene como objeto', async () => {
      mockWatchStatus({
        info: {
          installedApps: [
            {
              packageName: 'com.sosmartlabs.watchauthmanager',
              versionName: '4.3.3',
              versionCode: 38,
              isSystemApp: true,
              lastUpdateTime: 1774922951554,
            },
          ],
        },
        updatedAt: '2026-08-20T14:03:22.000Z',
      });

      const result = await service.getEnrichedInstalledAppsByWatch('watch-1');

      expect(result.installedApps).toEqual([
        {
          packageName: 'com.sosmartlabs.watchauthmanager',
          versionName: '4.3.3',
          versionCode: 38,
          isSystemApp: true,
          lastUpdateTime: 1774922951554,
          storeInfo: null,
        },
      ]);
      expect(result.watchStatusUpdatedAt).toBe('2026-08-20T14:03:22.000Z');
    });

    it('parsea info cuando viene como string JSON', async () => {
      mockWatchStatus({
        info: JSON.stringify({
          installedApps: [
            {
              packageName: 'com.sosmartlabs.watchauthmanager',
              versionName: '4.4.0',
              versionCode: 42,
              isSystemApp: true,
              lastUpdateTime: 1,
            },
          ],
        }),
        updatedAt: '2026-08-20T14:03:22.000Z',
      });

      const result = await service.getEnrichedInstalledAppsByWatch('watch-1');

      expect(result.installedApps).toHaveLength(1);
      expect((result.installedApps[0] as any).versionCode).toBe(42);
    });

    it('filtra los paquetes que no son de sosmartlabs ni excepciones', async () => {
      mockWatchStatus({
        info: {
          installedApps: [
            {
              packageName: 'com.sosmartlabs.watchauthmanager',
              versionCode: 38,
            },
            { packageName: 'com.android.printspooler', versionCode: 27 },
            { packageName: 'com.spotify.lite', versionCode: 5 },
          ],
        },
        updatedAt: 'x',
      });

      const result = await service.getEnrichedInstalledAppsByWatch('watch-1');

      expect(result.installedApps.map((a: any) => a.packageName)).toEqual([
        'com.sosmartlabs.watchauthmanager',
        'com.spotify.lite',
      ]);
    });

    it('degrada a vacio si info es basura no parseable', async () => {
      mockWatchStatus({ info: '@@@ no es json @@@', updatedAt: 'x' });

      const result = await service.getEnrichedInstalledAppsByWatch('watch-1');

      expect(result.installedApps).toEqual([]);
      expect(result.watchStatusUpdatedAt).toBe('x');
    });

    it('devuelve vacio cuando info no trae installedApps', async () => {
      mockWatchStatus({ info: { otraCosa: true }, updatedAt: 'x' });

      const result = await service.getEnrichedInstalledAppsByWatch('watch-1');

      expect(result.installedApps).toEqual([]);
    });
  });

  describe('getInfoByWatch', () => {
    it('devuelve el campo info', async () => {
      mockWatchStatus({ info: 'algo' });

      await expect(service.getInfoByWatch('watch-1')).resolves.toBe('algo');
    });

    it('devuelve null cuando no hay WatchStatus', async () => {
      firstMock.mockResolvedValue(undefined);

      await expect(service.getInfoByWatch('watch-1')).resolves.toBeNull();
    });
  });
});
