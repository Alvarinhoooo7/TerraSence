import Parse from 'parse/node';
import { container, injectable } from 'tsyringe';

import type {
  ApnCatalog,
  ApnCountry,
  ApnOption,
  ApnPushPayload,
  ApnSendResult,
  ApnTrack,
} from '../../interfaces/ApnIfcs';
import { ApnActionError } from '../../interfaces/ApnIfcs';
import APN from '../../models/Watch/APN';
import Wearer from '../../models/Watch/Wearer';
import { PushySendService } from '../Common/PushySendService';

/**
 * Tope de filas del catalogo. Hoy son ~100 en total, pero el default de Parse
 * es 100 y un catalogo truncado en silencio le esconderia operadores al agente.
 */
const MAX_APN_ROWS = 1000;

/**
 * PushNotificationCategory.APN(6) de watch-brain-space-3: PushyReceiver lo
 * despacha a ConnectivityNotificationHandler.handleApnNotification, que agrega
 * el APN a Telephony.Carriers. El diccionario de soymomo-watch-cloud no lista
 * el 6; el brain es la referencia.
 */
const PUSH_CODE_APN = 6;

/**
 * Como se le manda el APN a cada generacion de reloj.
 *
 * Ojo: este agrupamiento NO es el mismo que TRACK_BY_MODEL de
 * WatchConnectivityService (ahi v1 y Space Lite no tienen arreglo disponible)
 * ni el de pushyConfig. Son tres cosas distintas a proposito.
 */
const APN_TRACK_BY_MODEL: Record<string, ApnTrack> = {
  Soymomo_Space_Lite_v1: 'protocol',
  Soymomo_Space_v1: 'protocol',
  Soymomo_Space_v2: 'protocol',
  Soymomo_Space_v3: 'push',
  Soymomo_Space_v4: 'push',
};

/**
 * Comando TCP que entiende el reloj 3G: APN,<apn>,<user>,<password>,<numeric>.
 * Los segmentos vacios se conservan (hay operadores sin credenciales, ej.
 * "APN,internet,,,73009"): el firmware cuenta comas, no campos.
 */
export function buildProtocolCommand(row: Parse.Object): string {
  return [
    'APN',
    row.get('apn') ?? '',
    row.get('user') ?? '',
    row.get('password') ?? '',
    row.get('numeric') ?? '',
  ].join(',');
}

/**
 * Solo los campos con los que Android crea el APN. Deja fuera la metadata de
 * Parse (objectId, timestamps, source, priority, simScope): al reloj no le
 * sirve y no hay razon para mandarsela.
 */
export function toPushPayload(row: Parse.Object): ApnPushPayload {
  const payload: ApnPushPayload = {
    key: row.get('key'),
    name: row.get('name'),
    apn: row.get('apn'),
    user: row.get('user') ?? '',
    password: row.get('password') ?? '',
    mcc: row.get('mcc'),
    mnc: row.get('mnc'),
    numeric: row.get('numeric'),
    type: row.get('type'),
    // Ver ApnPushPayload: si no van, el brain inserta el APN apagado.
    carrierEnabled: true,
    current: 1,
  };

  // Opcionales: mandarlos en null/undefined haria que el firmware cree un APN
  // con campos invalidos, asi que solo van cuando tienen valor.
  if (row.get('authType')) payload.authType = row.get('authType');
  if (row.get('protocol')) payload.protocol = row.get('protocol');
  if (row.get('roamingProtocol'))
    payload.roamingProtocol = row.get('roamingProtocol');
  if (row.get('mvnoType')) payload.mvnoType = row.get('mvnoType');
  if (row.get('mvnoMatchData'))
    payload.mvnoMatchData = row.get('mvnoMatchData');

  return payload;
}

function toOption(row: Parse.Object): ApnOption {
  return {
    objectId: row.id,
    key: row.get('key'),
    name: row.get('name'),
    carrier: row.get('carrier'),
    apn: row.get('apn'),
    simScope: row.get('simScope'),
  };
}

@injectable()
export class ApnService {
  // eslint-disable-next-line class-methods-use-this
  private async findWearer(
    wearerId: string
  ): Promise<Parse.Object | undefined> {
    const query = new Parse.Query(Wearer);
    query.equalTo('objectId', wearerId);
    return query.first({ useMasterKey: true });
  }

  // eslint-disable-next-line class-methods-use-this
  private async findApn(apnId: string): Promise<Parse.Object | undefined> {
    const query = new Parse.Query(APN);
    query.equalTo('objectId', apnId);
    // Mismo filtro que getCountries y getCatalog: una fila deshabilitada no
    // aparece en el dropdown, asi que tampoco tiene que ser enviable a mano
    // por objectId.
    query.equalTo('enabled', true);
    return query.first({ useMasterKey: true });
  }

  /**
   * Paises con APNs habilitados, para el primer dropdown de la card.
   *
   * Se cuenta en memoria en vez de con distinct/aggregate: el catalogo son
   * ~100 filas y asi no dependemos de permisos de agregacion en Parse.
   */
  // eslint-disable-next-line class-methods-use-this
  async getCountries(): Promise<ApnCountry[]> {
    const query = new Parse.Query(APN);
    query.equalTo('enabled', true);
    query.select('country');
    query.limit(MAX_APN_ROWS);
    const rows = await query.find({ useMasterKey: true });

    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const country = row.get('country');
      if (!country) return;
      counts.set(country, (counts.get(country) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => a.country.localeCompare(b.country));
  }

  /**
   * Track del reloj y, si ya se eligio pais, los APNs de ese pais. Devuelve
   * null si el wearer no existe para que el controller responda 404.
   */
  async getCatalog(
    wearerId: string,
    country?: string
  ): Promise<ApnCatalog | null> {
    const wearer = await this.findWearer(wearerId);
    if (!wearer) return null;

    const hardwareModel = wearer.get('hardwareModel') as string | undefined;
    const track = hardwareModel ? APN_TRACK_BY_MODEL[hardwareModel] : undefined;

    const base = {
      supported: Boolean(track),
      track: track ?? null,
      hardwareModel: hardwareModel ?? null,
    };

    // Sin pais elegido la card solo necesita el track: no se consulta el catalogo.
    if (!country) {
      return { ...base, country: null, options: [] };
    }

    const query = new Parse.Query(APN);
    query.equalTo('country', country);
    query.equalTo('enabled', true);
    query.ascending('carrier').addAscending('name');
    query.limit(MAX_APN_ROWS);
    const rows = await query.find({ useMasterKey: true });

    return { ...base, country, options: rows.map(toOption) };
  }

  // eslint-disable-next-line class-methods-use-this
  private static audit(entry: Record<string, unknown>) {
    // Sin esto no hay forma de saber a que relojes se les cambio el APN.
    // Nunca incluir el password del APN ni la api key de Pushy.
    // eslint-disable-next-line no-console
    console.log('[apn]', JSON.stringify(entry));
  }

  /**
   * Manda el APN elegido al reloj. A diferencia de las acciones de
   * conectividad, aca no se bloquea por ultima conexion ni por presencia de
   * Pushy: el dashboard muestra ambas cosas y el agente decide. Un reloj
   * apagado igual recibe el comando cuando vuelve (queda encolado, y la push
   * tiene time to live de una hora).
   */
  async sendApn(wearerId: string, apnId: string): Promise<ApnSendResult> {
    const wearer = await this.findWearer(wearerId);
    if (!wearer) {
      throw new ApnActionError('wearer_not_found', 404, 'Wearer not found');
    }

    const hardwareModel = wearer.get('hardwareModel') as string | undefined;
    const track = hardwareModel ? APN_TRACK_BY_MODEL[hardwareModel] : undefined;
    if (!track) {
      throw new ApnActionError(
        'unsupported_model',
        400,
        `Model ${hardwareModel ?? 'unknown'} cannot receive an APN command`
      );
    }

    const apnRow = await this.findApn(apnId);
    if (!apnRow) {
      throw new ApnActionError('apn_not_found', 404, 'APN not found');
    }

    return track === 'protocol'
      ? ApnService.sendByProtocol(wearerId, wearer, apnRow)
      : ApnService.sendByPush(wearerId, wearer, apnRow, hardwareModel);
  }

  /** Space Lite / 1.0 / 2.0: comando TCP via cloud function. */
  private static async sendByProtocol(
    wearerId: string,
    wearer: Parse.Object,
    apnRow: Parse.Object
  ): Promise<ApnSendResult> {
    // El deviceId sale del Wearer, nunca del request: aceptarlo del body
    // permitiria elegir un reloj y configurarle el APN a otro.
    const deviceId = wearer.get('deviceId') as string | undefined;
    if (!deviceId) {
      throw new ApnActionError(
        'no_device_id',
        409,
        'The wearer has no deviceId'
      );
    }

    const command = buildProtocolCommand(apnRow);
    const apnKey = apnRow.get('key');

    try {
      await Parse.Cloud.run('sendProtocolCommand', { deviceId, command });
      ApnService.audit({
        action: 'sendApn',
        track: 'protocol',
        wearerId,
        deviceId,
        apnKey,
        result: 'ok',
      });
      // El comando no vuelve al front: lleva el password del operador, que el
      // catalogo y el log de auditoria omiten a proposito.
      return { track: 'protocol', apnKey };
    } catch (error) {
      ApnService.audit({
        action: 'sendApn',
        track: 'protocol',
        wearerId,
        deviceId,
        apnKey,
        result: 'error',
        message: (error as Error).message,
      });
      throw new ApnActionError(
        'cloud_function_failed',
        502,
        `sendProtocolCommand failed: ${(error as Error).message}`
      );
    }
  }

  /** Space 3.0 / 4.0: data notification de Pushy. */
  private static async sendByPush(
    wearerId: string,
    wearer: Parse.Object,
    apnRow: Parse.Object,
    hardwareModel: string | undefined
  ): Promise<ApnSendResult> {
    const token = wearer.get('pushy') as string | undefined;
    if (!token) {
      throw new ApnActionError(
        'no_push_token',
        409,
        'The watch has no pushy token'
      );
    }

    const apnKey = apnRow.get('key');
    const data = {
      pushCode: PUSH_CODE_APN,
      pushCategory: 'apn',
      sentAt: new Date().toISOString(),
      // String y no objeto: el brain hace bundle.getString('apn') y recien ahi
      // JSONObject(...), asi que no puede depender de como Pushy aplane un
      // objeto anidado al pasarlo a los intent extras.
      apn: JSON.stringify(toPushPayload(apnRow)),
    };

    try {
      const sendService = container.resolve(PushySendService);
      const result = await sendService.sendDataNotification(
        token,
        hardwareModel,
        data
      );
      ApnService.audit({
        action: 'sendApn',
        track: 'push',
        wearerId,
        hardwareModel,
        apnKey,
        pushId: result.id,
        result: 'ok',
      });
      return { track: 'push', apnKey, pushId: result.id };
    } catch (error) {
      ApnService.audit({
        action: 'sendApn',
        track: 'push',
        wearerId,
        hardwareModel,
        apnKey,
        result: 'error',
        message: (error as Error).message,
      });
      throw new ApnActionError(
        'push_failed',
        502,
        `Pushy send failed: ${(error as Error).message}`
      );
    }
  }
}
