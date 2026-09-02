import { ActionError } from './ActionError';

export type ConnectivityTrack = 'space2' | 'space34';

export type ConnectivityAction =
  | 'space2RepushCredentials'
  | 'installAuthManagerApk';

export type ConnectivityReason =
  | 'unsupported_model'
  | 'no_watch_status'
  | 'package_not_found'
  | 'unparsable';

/**
 * Contrato unico para los dos tracks. El frontend solo lee upToDate, presence y
 * action: no conoce nombres de paquete, numeros de version ni comparadores.
 */
export interface WatchConnectivityDiagnosis {
  /** v2/v3/v4 -> true. v1, Space Lite y desconocidos -> false */
  supported: boolean;
  track: ConnectivityTrack | null;
  packageName: string | null;
  expectedVersionCode: number | null;
  /**
   * Version que instalaria la accion. Distinta de expectedVersionCode: el
   * umbral para estar conforme es 42, pero si hay que instalar se instala la 43.
   * null cuando la accion no instala nada (Space 2 recarga credenciales).
   */
  targetVersionCode: number | null;
  /** 'eq' para Space 2 (version exacta), 'gte' para Space 3/4 (minimo) */
  comparison: 'eq' | 'gte' | null;
  installedVersionCode: number | null;
  installedVersionName: string | null;
  /** null cuando no se pudo determinar */
  upToDate: boolean | null;
  watchStatusUpdatedAt: string | null;
  /** null si esta al dia o si el modelo no aplica */
  action: ConnectivityAction | null;
  reason: ConnectivityReason | null;
}

export type ConnectivityActionErrorCode =
  | 'wearer_not_found'
  | 'unsupported_model'
  | 'wrong_track'
  | 'already_up_to_date'
  | 'unknown_version'
  | 'no_device_id'
  | 'watch_offline'
  | 'no_push_token'
  | 'push_failed'
  | 'cloud_function_failed';

export class ConnectivityActionError extends ActionError<ConnectivityActionErrorCode> {
  constructor(
    code: ConnectivityActionErrorCode,
    status: number,
    message: string
  ) {
    super(code, status, message);
    this.name = 'ConnectivityActionError';
  }
}
