// Despacho de avisos por Expo Push. La base decide qué enviar (reserve_push_deliveries) y
// registra el resultado (report_push_*); aquí sólo se habla con Expo, en lotes de hasta 100.
//
// Cada entrega recorre estados distintos: el ticket dice que Expo aceptó el mensaje y el
// receipt (consultado después) dice si el proveedor lo aceptó. Ninguno de los dos equivale
// a que la persona haya leído el aviso: eso lo guarda la bandeja.
//
// Errores. Este módulo sólo informa el código recibido, por ticket o por receipt; la base lo
// clasifica con push_error_class (migración 20260929140000) y decide si reintenta:
//   - DeviceNotRegistered: token inválido, se retira. No se reintenta.
//   - MessageTooBig, InvalidCredentials, MismatchSenderId y todo «permanent:…» (HTTP 4xx salvo
//     408/429, evento vencido): permanentes. No se reintentan.
//   - MessageRateExceeded, ExpoServerError, ServiceUnavailable, HTTP 408/429/5xx y códigos
//     desconocidos: transitorios, con espera creciente y hasta cinco intentos.
// Resultado incierto: si Expo pudo recibir el lote y no lo sabemos (timeout, corte de red,
// respuesta ilegible o con menos tickets que mensajes), el código lleva el prefijo «uncertain:».
// Esas entregas se reintentan como transitorias (puede duplicarse el aviso, nunca se afirma
// recepción) y una entrega con ticket aceptado no vuelve a enviarse por esa vía.

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH_SIZE = 100;
const REQUEST_TIMEOUT_MS = 15_000;
// Expo rechaza un lote con tokens de proyectos distintos; se reparte mensaje por mensaje.
const MIXED_PROJECTS = 'PUSH_TOO_MANY_EXPERIENCE_IDS';

// Debe coincidir con public.push_error_class; dispatch.test.mjs lo comprueba contra la migración.
export const EXPO_ERRORS = {
  invalidToken: ['DeviceNotRegistered'],
  permanent: ['MessageTooBig', 'InvalidCredentials', 'MismatchSenderId'],
  transient: ['MessageRateExceeded', 'ExpoServerError', 'ServiceUnavailable'],
};

export function classifyError(code) {
  if (EXPO_ERRORS.invalidToken.includes(code)) return 'invalid_token';
  if (EXPO_ERRORS.permanent.includes(code) || String(code).startsWith('permanent:')) return 'permanent';
  return 'transient';
}

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data ?? [];
}

function headers(accessToken) {
  return {
    'Content-Type': 'application/json', Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function errorCode(item) {
  return String(item?.details?.error ?? item?.message ?? 'Error de Expo');
}

function expiration(delivery) {
  const timestamp = Date.parse(delivery.expires_at);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0;
}

function permanentHttp(status) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

const timeoutSignal = () => (typeof AbortSignal?.timeout === 'function'
  ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined);

// Un ticket de error sintético: una falla del lote entero se informa igual que una del ticket.
const failedTicket = (code) => ({ status: 'error', message: code, details: { error: code } });
const acceptedTicket = (ticket) => ticket?.status === 'ok' && typeof ticket.id === 'string' && ticket.id !== '';

class RequestFailure extends Error {
  constructor(code) { super(code); this.code = code; }
}

// Informa cada resultado por separado: una falla al registrar una entrega no impide
// registrar las demás. Lo que no se registre queda con su lease y vuelve a la cola al vencer.
async function reportAll(reports) {
  const results = await Promise.allSettled(reports);
  const failed = results.filter((result) => result.status === 'rejected');
  failed.forEach((result) => console.error('No se pudo registrar un resultado de Expo:', result.reason));
  return failed.length;
}

function message(delivery) {
  return {
    to: delivery.expo_push_token,
    title: delivery.title,
    body: delivery.body,
    // Fecha absoluta de caducidad: la vigencia restante del evento, no un plazo desde el envío.
    sound: 'default', priority: 'high', expiration: expiration(delivery), channelId: 'device',
    data: { alert_id: delivery.alert_id, event_type: delivery.event_type,
      category: 'device', device_id: delivery.device_id },
  };
}

// Devuelve los tickets alineados con `ready` o lanza RequestFailure con el código a informar.
async function postMessages(fetcher, ready, accessToken) {
  let response;
  try {
    response = await fetcher(SEND_URL, {
      method: 'POST', headers: headers(accessToken), signal: timeoutSignal(),
      body: JSON.stringify(ready.map(message)),
    });
  } catch (error) {
    // Sin respuesta: Expo pudo recibir el lote. No se sabe.
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw new RequestFailure(`uncertain:${timedOut ? 'timeout' : 'red'}`);
  }
  if (!response.ok) {
    throw new RequestFailure(permanentHttp(response.status)
      ? `permanent:Expo HTTP ${response.status}` : `Expo HTTP ${response.status}`);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new RequestFailure('uncertain:respuesta_ilegible');
  }
  if (Array.isArray(payload?.data)) return payload.data;
  const requestError = Array.isArray(payload?.errors) ? payload.errors[0]?.code : null;
  // Con «errors» Expo rechazó la petición completa: no se envió nada, no hay incertidumbre.
  if (requestError) throw new RequestFailure(String(requestError));
  throw new RequestFailure('uncertain:respuesta_invalida');
}

async function requestTickets(fetcher, ready, accessToken) {
  try {
    return await postMessages(fetcher, ready, accessToken);
  } catch (error) {
    if (error.code === MIXED_PROJECTS && ready.length > 1) {
      const tickets = [];
      for (const delivery of ready) tickets.push(...await requestTickets(fetcher, [delivery], accessToken));
      return tickets;
    }
    return ready.map(() => failedTicket(error.code ?? `uncertain:${String(error)}`));
  }
}

async function sendBatch(client, fetcher, batch, accessToken) {
  // Una sesión puede desaparecer después de reservar y antes de llamar a Expo.
  // La RPC cancela el lease inválido; una falla al validar detiene el lote.
  const valid = [];
  for (const delivery of batch) {
    if (await rpc(client, 'validate_push_lease', {
      p_delivery_id: delivery.delivery_id, p_lease_id: delivery.lease_id,
    })) valid.push(delivery);
  }
  const now = Math.floor(Date.now() / 1000);
  const expired = valid.filter((delivery) => expiration(delivery) <= now);
  const ready = valid.filter((delivery) => expiration(delivery) > now);
  const expiredFailures = await reportAll(expired.map((delivery) => rpc(client, 'report_push_ticket', {
    p_delivery_id: delivery.delivery_id, p_lease_id: delivery.lease_id,
    p_ticket_id: null, p_error: 'permanent:expired', p_invalid_token: false,
  })));
  const summary = { accepted: 0, permanent: 0, retry: 0, invalidTokens: 0 };
  if (!ready.length) return { ...summary, reportFailures: expiredFailures };
  const tickets = await requestTickets(fetcher, ready, accessToken);
  const reportFailures = expiredFailures + await reportAll(ready.map((delivery, index) => {
    // Una respuesta parcial (menos tickets que mensajes) deja sin ticket a las últimas entregas:
    // Expo pudo recibirlas, así que su resultado es incierto.
    const ticket = tickets[index] ?? failedTicket('uncertain:sin_ticket');
    const accepted = acceptedTicket(ticket);
    let code = null;
    if (!accepted) {
      code = ticket?.status === 'ok' ? 'uncertain:ticket_sin_id' : errorCode(ticket);
    }
    const kind = accepted ? 'accepted' : classifyError(code);
    if (kind === 'accepted') summary.accepted += 1;
    else if (kind === 'invalid_token') summary.invalidTokens += 1;
    else if (kind === 'permanent') summary.permanent += 1;
    else summary.retry += 1;
    return rpc(client, 'report_push_ticket', {
      p_delivery_id: delivery.delivery_id, p_lease_id: delivery.lease_id,
      p_ticket_id: accepted ? ticket.id : null,
      p_error: code,
      p_invalid_token: kind === 'invalid_token',
    });
  }));
  return { ...summary, reportFailures };
}

async function receiptBatch(client, fetcher, batch, accessToken) {
  let receipts;
  try {
    const response = await fetcher(RECEIPTS_URL, {
      method: 'POST', headers: headers(accessToken), signal: timeoutSignal(),
      body: JSON.stringify({ ids: batch.map((delivery) => delivery.ticket_id) }),
    });
    if (!response.ok) throw new Error(`Expo HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.data || typeof payload.data !== 'object') throw new Error('Receipts inválidos');
    receipts = payload.data;
  } catch (error) {
    // Sin respuesta útil no se sabe nada: todos esperan otro ciclo (Expo guarda receipts 24 h)
    // y ninguno se reenvía, porque su ticket sigue aceptado.
    receipts = {};
    console.error('No se pudieron consultar receipts:', error);
  }
  const reportFailures = await reportAll(batch.map((delivery) => {
    const receipt = receipts[delivery.ticket_id];
    if (receipt?.status === 'ok') {
      return rpc(client, 'report_push_receipt', {
        p_delivery_id: delivery.delivery_id, p_lease_id: delivery.lease_id,
        p_status: 'ok', p_error: null, p_invalid_token: false,
      });
    }
    if (receipt?.status === 'error') {
      const code = errorCode(receipt);
      // La base decide si el error del proveedor se reenvía o se da por fallido.
      return rpc(client, 'report_push_receipt', {
        p_delivery_id: delivery.delivery_id, p_lease_id: delivery.lease_id,
        p_status: 'error', p_error: code, p_invalid_token: classifyError(code) === 'invalid_token',
      });
    }
    // Receipt ausente: aún no existe, no se sabe nada.
    return rpc(client, 'report_push_receipt', {
      p_delivery_id: delivery.delivery_id, p_lease_id: delivery.lease_id,
      p_status: 'retry', p_error: null, p_invalid_token: false,
    });
  }));
  return { delivered: batch.filter((delivery) => receipts[delivery.ticket_id]?.status === 'ok').length, reportFailures };
}

export async function dispatchPush(client, fetcher, { limit = 50, expoAccessToken } = {}) {
  const deliveries = await rpc(client, 'reserve_push_deliveries', { p_limit: limit });
  const totals = { accepted: 0, permanent: 0, retry: 0, invalidTokens: 0 };
  let reportFailures = 0;
  for (let index = 0; index < deliveries.length; index += BATCH_SIZE) {
    const result = await sendBatch(client, fetcher, deliveries.slice(index, index + BATCH_SIZE), expoAccessToken);
    for (const key of Object.keys(totals)) totals[key] += result[key];
    reportFailures += result.reportFailures;
  }
  const receipts = await rpc(client, 'reserve_push_receipts', { p_limit: limit });
  let delivered = 0;
  for (let index = 0; index < receipts.length; index += BATCH_SIZE) {
    const result = await receiptBatch(client, fetcher, receipts.slice(index, index + BATCH_SIZE), expoAccessToken);
    delivered += result.delivered;
    reportFailures += result.reportFailures;
  }
  return { reserved: deliveries.length, tickets_accepted: totals.accepted,
    tickets_permanent_failures: totals.permanent, tickets_invalid_tokens: totals.invalidTokens,
    tickets_to_retry: totals.retry, receipts_checked: receipts.length,
    receipts_delivered: delivered, report_failures: reportFailures };
}
