import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import StoreInfo from '../../models/Watch/StoreInfo';
import WatchStatus from '../../models/Watch/WatchStatus';
import Wearer from '../../models/Watch/Wearer';
import { parseInstalledApps, parseLooseJson } from '../../utils/androidJson';

const EXCEPTIONS = [
  'it.vfsfitvnm.vimusic',
  'com.spotify.lite',
  'com.anandnet.harmonymusic',
];

@injectable()
export class WatchStatusService {
  /**
   * El WatchStatus mas reciente del reloj. Hoy la relacion es 1:1, pero se
   * ordena explicitamente porque lo que interesa siempre es el ultimo.
   */
  // eslint-disable-next-line class-methods-use-this
  private async findLatestWatchStatus(
    wearerId: string
  ): Promise<Parse.Object | undefined> {
    const wearer = Wearer.createWithoutData(wearerId);
    const watchStatusQuery = new Parse.Query(WatchStatus);
    watchStatusQuery.equalTo('watch', wearer);
    watchStatusQuery.descending('updatedAt');
    return watchStatusQuery.first({ useMasterKey: true });
  }

  async getInfoByWatch(wearerId: string) {
    const watchStatus = await this.findLatestWatchStatus(wearerId);
    return watchStatus ? watchStatus.get('info') : null;
  }

  /**
   * Apps instaladas sin filtrar ni enriquecer con StoreInfo. Lo usa el
   * diagnostico de conectividad, al que solo le interesa un package puntual.
   */
  async getInstalledAppsRaw(wearerId: string): Promise<{
    apps: any[];
    watchStatusUpdatedAt: string | null;
  }> {
    const watchStatus = await this.findLatestWatchStatus(wearerId);
    if (!watchStatus) return { apps: [], watchStatusUpdatedAt: null };

    const info = parseLooseJson(watchStatus.get('info'));
    return {
      apps: parseInstalledApps(info?.installedApps),
      watchStatusUpdatedAt: watchStatus.get('updatedAt'),
    };
  }

  /**
   * Version de un package segun el campo `packagesInfo`, que usan los Space 2.
   * Es JSON valido, indexado por packageName y con las claves capitalizadas
   * (VersionCode/VersionName), a diferencia de `info`.
   */
  async getPackagesInfoVersion(
    wearerId: string,
    packageName: string
  ): Promise<{
    versionCode: number | null;
    versionName: string | null;
    watchStatusUpdatedAt: string | null;
    found: boolean;
    hasPackagesInfo: boolean;
  }> {
    const watchStatus = await this.findLatestWatchStatus(wearerId);
    if (!watchStatus) {
      return {
        versionCode: null,
        versionName: null,
        watchStatusUpdatedAt: null,
        found: false,
        hasPackagesInfo: false,
      };
    }

    const watchStatusUpdatedAt = watchStatus.get('updatedAt');
    const raw = watchStatus.get('packagesInfo');
    if (!raw) {
      return {
        versionCode: null,
        versionName: null,
        watchStatusUpdatedAt,
        found: false,
        hasPackagesInfo: false,
      };
    }

    const packages = parseLooseJson(raw);
    const entry = packages?.[packageName];

    return {
      versionCode:
        typeof entry?.VersionCode === 'number' ? entry.VersionCode : null,
      versionName: entry?.VersionName ?? null,
      watchStatusUpdatedAt,
      found: Boolean(entry),
      hasPackagesInfo: true,
    };
  }

  async getEnrichedInstalledAppsByWatch(wearerId: string) {
    const { apps, watchStatusUpdatedAt } = await this.getInstalledAppsRaw(
      wearerId
    );

    if (apps.length === 0) {
      return { installedApps: [], watchStatusUpdatedAt };
    }

    const filteredApps = apps.filter(
      (app: any) =>
        app.packageName?.startsWith('com.sosmartlabs') ||
        EXCEPTIONS.includes(app.packageName)
    );

    const packageNames = filteredApps.map((app: any) => app.packageName);
    const storeInfoQuery = new Parse.Query(StoreInfo);
    storeInfoQuery.containedIn('packageName', packageNames);
    storeInfoQuery.equalTo('locale', 'es');
    const storeInfos = await storeInfoQuery.find({ useMasterKey: true });
    const storeInfoMap = new Map(
      storeInfos.map((store: any) => [store.get('packageName'), store])
    );

    const enrichedApps = filteredApps.map((app: any) => {
      const store = storeInfoMap.get(app.packageName);
      return {
        packageName: app.packageName,
        versionName: app.versionName,
        versionCode: app.versionCode,
        isSystemApp: app.isSystemApp,
        lastUpdateTime: app.lastUpdateTime,
        storeInfo: store
          ? {
              name: store.get('name'),
              image: store.get('image'),
            }
          : null,
      };
    });

    return { installedApps: enrichedApps, watchStatusUpdatedAt };
  }
}
