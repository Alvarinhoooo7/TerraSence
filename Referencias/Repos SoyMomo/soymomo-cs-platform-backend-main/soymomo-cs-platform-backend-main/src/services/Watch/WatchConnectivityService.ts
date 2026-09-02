import Parse from 'parse/node';
import { container, injectable } from 'tsyringe';

import type {
  ConnectivityTrack,
  WatchConnectivityDiagnosis,
} from '../../interfaces/WatchConnectivityIfcs';
import { ConnectivityActionError } from '../../interfaces/WatchConnectivityIfcs';
import Wearer from '../../models/Watch/Wearer';
import { PushyPresenceService } from '../Common/PushyPresenceService';
import { PushySendService } from '../Common/PushySendService';
import { WatchStatusService } from './WatchStatusService';

/**
 * Space 2: la app de credenciales tiene que estar en esta version o superior.
 */
const SOYMOMO_BRAIN = {
  packageName: 'com.sosmartlabs.soymomobrain',
  minVersionCode: 49,
};

/**
 * Space 3/4: el umbral de "estamos bien" (42) y la version que instala el APK
 * (43) son numeros distintos A PROPOSITO. No unificarlos: un reloj con 42 ya
 * esta conforme, pero si hay que instalar algo se instala lo ultimo.
 */
const AUTH_MANAGER_MIN_VERSION_CODE = 42;

const AUTH_MANAGER_APK = {
  packageName: 'com.sosmartlabs.watchauthmanager',
  versionCode: 43,
  apkUrl:
    'https://soymomo-public-images.s3.us-east-1.amazonaws.com/watchauthmanager-release-v43.apk',
  fileHash: 'ab8219649198c38b9bb4aa01865ccea7516562e13990a455a6c2a4558e763339',
};

const PUSH_CODE_INSTALL_APK = 80;

/**
 * Secreto que valida la cloud function. Va hardcodeado por decision del equipo:
 * no da acceso a nada por si solo, solo acompaña al comando de recarga.
 */
const SPACE2_REPUSH_SECRET = '7b3ee2-01db6e-74a73e-b362b7';

const TRACK_BY_MODEL: Record<string, ConnectivityTrack> = {
  Soymomo_Space_v2: 'space2',
  Soymomo_Space_v3: 'space34',
  Soymomo_Space_v4: 'space34',
};

const UNSUPPORTED: WatchConnectivityDiagnosis = {
  supported: false,
  track: null,
  packageName: null,
  expectedVersionCode: null,
  targetVersionCode: null,
  comparison: null,
  installedVersionCode: null,
  installedVersionName: null,
  upToDate: null,
  watchStatusUpdatedAt: null,
  action: null,
  reason: 'unsupported_model',
};

@injectable()
export class WatchConnectivityService {
  // eslint-disable-next-line class-methods-use-this
  private async findWearer(
    wearerId: string
  ): Promise<Parse.Object | undefined> {
    const query = new Parse.Query(Wearer);
    query.equalTo('objectId', wearerId);
    return query.first({ useMasterKey: true });
  }

  /** Diagnostico completo. Solo consulta Pushy si hace falta actuar. */
  async getDiagnosis(
    wearerId: string
  ): Promise<WatchConnectivityDiagnosis | null> {
    const wearer = await this.findWearer(wearerId);
    if (!wearer) return null;

    const hardwareModel = wearer.get('hardwareModel') as string | undefined;
    const track = hardwareModel ? TRACK_BY_MODEL[hardwareModel] : undefined;

    // El track se decide por el modelo, nunca por que campo de WatchStatus
    // este poblado: `packagesInfo` e `info` conviven en muchos relojes.
    if (!track) return UNSUPPORTED;

    return track === 'space2'
      ? this.diagnoseSpace2(wearerId)
      : this.diagnoseSpace34(wearerId);
  }

  // eslint-disable-next-line class-methods-use-this
  private async diagnoseSpace2(
    wearerId: string
  ): Promise<WatchConnectivityDiagnosis> {
    const statusService = container.resolve(WatchStatusService);
    const result = await statusService.getPackagesInfoVersion(
      wearerId,
      SOYMOMO_BRAIN.packageName
    );

    const base: WatchConnectivityDiagnosis = {
      supported: true,
      track: 'space2',
      packageName: SOYMOMO_BRAIN.packageName,
      expectedVersionCode: SOYMOMO_BRAIN.minVersionCode,
      targetVersionCode: null,
      comparison: 'gte',
      installedVersionCode: result.versionCode,
      installedVersionName: result.versionName,
      upToDate: null,
      watchStatusUpdatedAt: result.watchStatusUpdatedAt,
      action: null,
      reason: null,
    };

    if (!result.watchStatusUpdatedAt) {
      return { ...base, reason: 'no_watch_status' };
    }
    if (!result.hasPackagesInfo) {
      return { ...base, reason: 'unparsable' };
    }
    if (!result.found || result.versionCode === null) {
      return { ...base, reason: 'package_not_found' };
    }

    const upToDate = result.versionCode >= SOYMOMO_BRAIN.minVersionCode;
    return {
      ...base,
      upToDate,
      action: upToDate ? null : 'space2RepushCredentials',
    };
  }

  // eslint-disable-next-line class-methods-use-this
  private async diagnoseSpace34(
    wearerId: string
  ): Promise<WatchConnectivityDiagnosis> {
    const statusService = container.resolve(WatchStatusService);
    const { apps, watchStatusUpdatedAt } =
      await statusService.getInstalledAppsRaw(wearerId);

    const app = apps.find(
      (a: any) => a.packageName === AUTH_MANAGER_APK.packageName
    );

    const base: WatchConnectivityDiagnosis = {
      supported: true,
      track: 'space34',
      packageName: AUTH_MANAGER_APK.packageName,
      expectedVersionCode: AUTH_MANAGER_MIN_VERSION_CODE,
      targetVersionCode: AUTH_MANAGER_APK.versionCode,
      comparison: 'gte',
      installedVersionCode: app?.versionCode ?? null,
      installedVersionName: app?.versionName ?? null,
      upToDate: null,
      watchStatusUpdatedAt,
      action: null,
      reason: null,
    };

    if (!watchStatusUpdatedAt) {
      return { ...base, reason: 'no_watch_status' };
    }
    if (!app || typeof app.versionCode !== 'number') {
      return { ...base, reason: 'package_not_found' };
    }

    const upToDate = app.versionCode >= AUTH_MANAGER_MIN_VERSION_CODE;
    return {
      ...base,
      upToDate,
      action: upToDate ? null : 'installAuthManagerApk',
    };
  }

  /**
   * Se re-corre el diagnostico server-side antes de ejecutar: no se confia en
   * lo que el frontend crea que vio.
   */
  private async assertActionable(
    wearerId: string,
    expectedTrack: ConnectivityTrack
  ): Promise<WatchConnectivityDiagnosis> {
    const diagnosis = await this.getDiagnosis(wearerId);

    if (!diagnosis) {
      throw new ConnectivityActionError(
        'wearer_not_found',
        404,
        'Wearer not found'
      );
    }
    if (!diagnosis.supported) {
      throw new ConnectivityActionError(
        'unsupported_model',
        400,
        'This watch model has no connectivity fix available'
      );
    }
    if (diagnosis.track !== expectedTrack) {
      throw new ConnectivityActionError(
        'wrong_track',
        400,
        `This watch belongs to track ${diagnosis.track}, not ${expectedTrack}`
      );
    }
    if (diagnosis.upToDate === true) {
      throw new ConnectivityActionError(
        'already_up_to_date',
        409,
        'The watch is already up to date'
      );
    }
    // upToDate null = no se pudo determinar la version (sin WatchStatus, sin el
    // package, o ilegible). No es lo mismo que "hay que actualizar": sin dato
    // concluyente no se reinicia el reloj de nadie.
    if (diagnosis.upToDate !== false) {
      throw new ConnectivityActionError(
        'unknown_version',
        409,
        `Cannot determine the installed version (${diagnosis.reason})`
      );
    }
    // La presencia se consulta aca y no en el diagnostico: el GET lo pide el
    // dashboard en cada carga, y ahi ya la trae por su propio endpoint.
    const presenceService = container.resolve(PushyPresenceService);
    const presence = await presenceService.getPresenceByWearer(wearerId);
    if (presence?.online !== true) {
      throw new ConnectivityActionError(
        'watch_offline',
        409,
        'The watch is not online in Pushy'
      );
    }

    return diagnosis;
  }

  // eslint-disable-next-line class-methods-use-this
  private static audit(entry: Record<string, unknown>) {
    // Sin esto no hay forma de saber a que relojes se les ejecuto una accion.
    // Nunca incluir el secreto ni la api key.
    // eslint-disable-next-line no-console
    console.log('[connectivity]', JSON.stringify(entry));
  }

  /** Space 2: recarga de credenciales via cloud function. Reinicia el reloj. */
  async repushSpace2Credentials(wearerId: string) {
    const diagnosis = await this.assertActionable(wearerId, 'space2');

    // El deviceId sale del Wearer, nunca del request: aceptarlo del body
    // permitiria diagnosticar un reloj y reiniciar otro.
    const wearer = await this.findWearer(wearerId);
    const deviceId = wearer?.get('deviceId') as string | undefined;
    if (!deviceId) {
      throw new ConnectivityActionError(
        'no_device_id',
        409,
        'The wearer has no deviceId'
      );
    }

    try {
      const result = await Parse.Cloud.run('space2RepushMomoCredentials', {
        deviceId,
        secret: SPACE2_REPUSH_SECRET,
      });
      WatchConnectivityService.audit({
        action: 'space2RepushCredentials',
        wearerId,
        deviceId,
        installedVersionCode: diagnosis.installedVersionCode,
        result: 'ok',
      });
      return result;
    } catch (error) {
      WatchConnectivityService.audit({
        action: 'space2RepushCredentials',
        wearerId,
        deviceId,
        result: 'error',
        message: (error as Error).message,
      });
      throw new ConnectivityActionError(
        'cloud_function_failed',
        502,
        `space2RepushMomoCredentials failed: ${(error as Error).message}`
      );
    }
  }

  /** Space 3/4: instala el APK de watchauthmanager por push. Reinicia el reloj. */
  async installAuthManagerApk(wearerId: string) {
    const diagnosis = await this.assertActionable(wearerId, 'space34');

    const wearer = await this.findWearer(wearerId);
    const token = wearer?.get('pushy') as string | undefined;
    const hardwareModel = wearer?.get('hardwareModel') as string | undefined;

    if (!token) {
      throw new ConnectivityActionError(
        'no_push_token',
        409,
        'The watch has no pushy token'
      );
    }

    const installApkData = {
      pushCode: PUSH_CODE_INSTALL_APK,
      pushCategory: 'installApk',
      apkUrl: AUTH_MANAGER_APK.apkUrl,
      packageName: AUTH_MANAGER_APK.packageName,
      versionCode: AUTH_MANAGER_APK.versionCode,
      fileHash: AUTH_MANAGER_APK.fileHash,
      sentAt: new Date().toISOString(),
    };

    try {
      const sendService = container.resolve(PushySendService);
      const result = await sendService.sendDataNotification(
        token,
        hardwareModel,
        installApkData
      );
      WatchConnectivityService.audit({
        action: 'installAuthManagerApk',
        wearerId,
        hardwareModel,
        installedVersionCode: diagnosis.installedVersionCode,
        targetVersionCode: AUTH_MANAGER_APK.versionCode,
        pushId: result.id,
        result: 'ok',
      });
      return result;
    } catch (error) {
      WatchConnectivityService.audit({
        action: 'installAuthManagerApk',
        wearerId,
        hardwareModel,
        result: 'error',
        message: (error as Error).message,
      });
      throw new ConnectivityActionError(
        'push_failed',
        502,
        `Pushy send failed: ${(error as Error).message}`
      );
    }
  }
}
