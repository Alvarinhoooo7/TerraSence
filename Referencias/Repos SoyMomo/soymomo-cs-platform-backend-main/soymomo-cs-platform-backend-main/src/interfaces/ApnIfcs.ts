import { ActionError } from './ActionError';

/**
 * Como se le manda un APN al reloj:
 * - 'protocol': Space Lite / 1.0 / 2.0, comando TCP por cloud function.
 * - 'push': Space 3.0 / 4.0, data notification de Pushy.
 */
export type ApnTrack = 'protocol' | 'push';

/** Lo minimo que necesita el dropdown. Nunca se expone el password. */
export interface ApnOption {
  objectId: string;
  key: string;
  name: string;
  carrier: string;
  apn: string;
  simScope: string;
}

/** Un pais con APNs cargados, para el primer dropdown de la card. */
export interface ApnCountry {
  country: string;
  count: number;
}

/**
 * Contrato hacia el frontend. El track lo decide el backend a partir del
 * hardwareModel, igual que en el diagnostico de conectividad: la card solo lee
 * `track` para saber que contexto mostrar.
 *
 * Sin `country` no se devuelven opciones: la card pide primero el pais y recien
 * ahi arma la lista, asi que no tiene sentido traer un catalogo por defecto.
 */
export interface ApnCatalog {
  /** false cuando el hardwareModel no esta en APN_TRACK_BY_MODEL */
  supported: boolean;
  track: ApnTrack | null;
  hardwareModel: string | null;
  /** null cuando todavia no se eligio pais */
  country: string | null;
  options: ApnOption[];
}

/** Lo que el firmware necesita para crear el APN en Android. Sin metadata de Parse. */
export interface ApnPushPayload {
  key: string;
  name: string;
  apn: string;
  user: string;
  password: string;
  mcc: string;
  mnc: string;
  numeric: string;
  type: string;
  /**
   * handleApnNotification los lee con optBoolean('carrierEnabled', false) y
   * optInt('current', 0), y addApn los escribe tal cual en Telephony.Carriers.
   * Sin mandarlos explicitos la fila entra deshabilitada y sin marcar como
   * actual, o sea el reloj sigue sin datos.
   */
  carrierEnabled: boolean;
  current: number;
  authType?: string;
  protocol?: string;
  roamingProtocol?: string;
  mvnoType?: string;
  mvnoMatchData?: string;
}

export interface ApnSendResult {
  track: ApnTrack;
  apnKey: string;
  /** solo track 'push' */
  pushId?: string | null;
}

export type ApnActionErrorCode =
  | 'wearer_not_found'
  | 'apn_not_found'
  | 'unsupported_model'
  | 'no_device_id'
  | 'no_push_token'
  | 'cloud_function_failed'
  | 'push_failed';

export class ApnActionError extends ActionError<ApnActionErrorCode> {
  constructor(code: ApnActionErrorCode, status: number, message: string) {
    super(code, status, message);
    this.name = 'ApnActionError';
  }
}
