import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dispatchPush, classifyError, EXPO_ERRORS } from './dispatch.mjs';

const delivery = (id) => ({ delivery_id: id, lease_id: `lease-${id}`, alert_id: `alert-${id}`,
  event_type: 'access_request', title: 'Solicitud', body: 'Revisar',
  device_id: 'device-1', expo_push_token: `ExpoPushToken[${id}]`,
  expires_at: new Date(Date.now() + 60_000).toISOString() });
const receiptRow = (id) => ({ delivery_id: id, lease_id: `lease-${id}`, ticket_id: `ticket-${id}` });

function clientFor(deliveries, receipts = [], { failReport, validLease = () => true } = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'reserve_push_deliveries') return { data: deliveries };
      if (name === 'reserve_push_receipts') return { data: receipts };
      if (name === 'validate_push_lease') return { data: validLease(args) };
      if (failReport?.(name, args)) return { data: null, error: new Error('rpc caído') };
      return { data: null };
    },
  };
}

test('un lease de sesión revocada no llega a Expo', async () => {
  const client = clientFor([delivery('a'), delivery('b')], [], {
    validLease: ({ p_delivery_id }) => p_delivery_id !== 'a',
  });
  await dispatchPush(client, async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body).map((item) => item.to), ['ExpoPushToken[b]']);
    return jsonResponse({ data: [{ status: 'ok', id: 'ticket-b' }] });
  });
  assert.equal(reports(client, 'report_push_ticket').length, 1);
  assert.equal(reports(client, 'validate_push_lease').length, 2);
});
const reports = (client, name) => client.calls.filter((call) => call.name === name);
const jsonResponse = (payload) => ({ ok: true, json: async () => payload });

test('envía por instalación y guarda tickets independientes, con payload mínimo', async () => {
  const client = clientFor([delivery('a'), delivery('b')]);
  const fetcher = async (url, options) => {
    assert.match(url, /\/push\/send$/);
    const messages = JSON.parse(options.body);
    assert.equal(messages.length, 2);
    assert.deepEqual(Object.keys(messages[0].data).sort(), ['alert_id', 'category', 'device_id', 'event_type']);
    assert.equal(messages[0].data.category, 'device');
    assert.equal(messages[0].channelId, 'device');
    assert.ok(messages[0].expiration >= Math.floor(Date.now() / 1000) + 58);
    assert.equal('ttl' in messages[0], false);
    assert.equal(options.headers.Authorization, 'Bearer expo-key');
    return jsonResponse({ data: [
      { status: 'ok', id: 'ticket-a' },
      { status: 'error', details: { error: 'MessageTooBig' } },
    ] });
  };
  const result = await dispatchPush(client, fetcher, { expoAccessToken: 'expo-key' });
  assert.equal(result.tickets_accepted, 1);
  const calls = reports(client, 'report_push_ticket');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].args.p_ticket_id, 'ticket-a');
  assert.equal(calls[0].args.p_error, null);
  assert.equal(calls[1].args.p_error, 'MessageTooBig');
  assert.equal(calls[1].args.p_invalid_token, false);
});

test('sin token de acceso de Expo no se envía Authorization', async () => {
  const client = clientFor([delivery('a')]);
  await dispatchPush(client, async (_url, options) => {
    assert.equal('Authorization' in options.headers, false);
    return jsonResponse({ data: [{ status: 'ok', id: 't' }] });
  });
});

test('falla HTTP: todas las entregas vuelven al RPC para reintento', async () => {
  const client = clientFor([delivery('a'), delivery('b')]);
  await dispatchPush(client, async () => ({ ok: false, status: 503 }));
  const calls = reports(client, 'report_push_ticket');
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.args.p_ticket_id === null && /503/.test(call.args.p_error)
    && call.args.p_invalid_token === false));
});

test('falla de red o JSON inválido: se reintenta y el despachador no se cae', async () => {
  for (const fetcher of [
    async () => { throw new Error('ECONNRESET'); },
    async () => ({ ok: true, json: async () => { throw new SyntaxError('no es JSON'); } }),
    async () => jsonResponse({ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] }),
  ]) {
    const client = clientFor([delivery('a')]);
    const result = await dispatchPush(client, fetcher);
    assert.equal(result.tickets_accepted, 0);
    const [call] = reports(client, 'report_push_ticket');
    assert.equal(call.args.p_ticket_id, null);
    assert.ok(call.args.p_error);
  }
});

test('sin respuesta de Expo el resultado es incierto: prefijo uncertain, sin afirmar recepción', async () => {
  const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
  const cases = [
    [async () => { throw timeout; }, 'uncertain:timeout'],
    [async () => { throw new Error('ECONNRESET'); }, 'uncertain:red'],
    [async () => ({ ok: true, json: async () => { throw new SyntaxError('no es JSON'); } }), 'uncertain:respuesta_ilegible'],
    [async () => jsonResponse({ algo: 'raro' }), 'uncertain:respuesta_invalida'],
  ];
  for (const [fetcher, expected] of cases) {
    const client = clientFor([delivery('a'), delivery('b')]);
    const result = await dispatchPush(client, fetcher);
    const calls = reports(client, 'report_push_ticket');
    assert.equal(calls.length, 2);
    assert.ok(calls.every((call) => call.args.p_error === expected && call.args.p_ticket_id === null
      && call.args.p_invalid_token === false));
    assert.equal(classifyError(expected), 'transient');
    assert.equal(result.tickets_accepted, 0);
    assert.equal(result.tickets_to_retry, 2);
    assert.equal(reports(client, 'report_push_receipt').length, 0);
  }
});

test('una petición rechazada entera por Expo (errors) no es incierta y se reintenta', async () => {
  const client = clientFor([delivery('a')]);
  await dispatchPush(client, async () => jsonResponse({ errors: [{ code: 'INTERNAL_SERVER_ERROR' }] }));
  const [call] = reports(client, 'report_push_ticket');
  assert.equal(call.args.p_error, 'INTERNAL_SERVER_ERROR');
  assert.equal(classifyError(call.args.p_error), 'transient');
});

test('tokens de proyectos distintos en un lote: se reparten mensaje por mensaje', async () => {
  const client = clientFor([delivery('a'), delivery('b'), delivery('c')]);
  const sizes = [];
  const result = await dispatchPush(client, async (_url, options) => {
    const messages = JSON.parse(options.body);
    sizes.push(messages.length);
    if (messages.length > 1) return jsonResponse({ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] });
    return messages[0].to === 'ExpoPushToken[b]'
      ? jsonResponse({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] })
      : jsonResponse({ data: [{ status: 'ok', id: `t-${messages[0].to}` }] });
  });
  assert.deepEqual(sizes, [3, 1, 1, 1]);
  assert.equal(result.tickets_accepted, 2);
  assert.equal(result.tickets_invalid_tokens, 1);
  const calls = reports(client, 'report_push_ticket');
  assert.deepEqual(calls.map((call) => call.args.p_delivery_id), ['a', 'b', 'c']);
  assert.equal(calls[1].args.p_invalid_token, true);
});

test('fallo parcial: una respuesta con menos tickets deja las últimas entregas en reintento', async () => {
  const client = clientFor([delivery('a'), delivery('b'), delivery('c')]);
  const result = await dispatchPush(client, async () => jsonResponse({ data: [
    { status: 'ok', id: 'ticket-a' },
    { status: 'error', details: { error: 'MessageRateExceeded' } },
  ] }));
  assert.equal(result.tickets_accepted, 1);
  const calls = reports(client, 'report_push_ticket');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].args.p_ticket_id, 'ticket-a');
  assert.equal(calls[1].args.p_error, 'MessageRateExceeded');
  assert.equal(calls[2].args.p_ticket_id, null);
  assert.equal(calls[2].args.p_error, 'uncertain:sin_ticket');
  assert.equal(calls[2].args.p_invalid_token, false);
  assert.equal(result.tickets_to_retry, 2);
});

test('un ticket ok sin id no cuenta como aceptado', async () => {
  const client = clientFor([delivery('a')]);
  const result = await dispatchPush(client, async () => jsonResponse({ data: [{ status: 'ok' }] }));
  assert.equal(result.tickets_accepted, 0);
  const [call] = reports(client, 'report_push_ticket');
  assert.equal(call.args.p_ticket_id, null);
  assert.equal(call.args.p_error, 'uncertain:ticket_sin_id');
});

test('DeviceNotRegistered en el ticket marca el token como inválido sólo en esa entrega', async () => {
  const client = clientFor([delivery('a'), delivery('b')]);
  await dispatchPush(client, async () => jsonResponse({ data: [
    { status: 'error', message: 'no registrado', details: { error: 'DeviceNotRegistered' } },
    { status: 'ok', id: 'ticket-b' },
  ] }));
  const calls = reports(client, 'report_push_ticket');
  assert.equal(calls[0].args.p_invalid_token, true);
  assert.equal(calls[0].args.p_ticket_id, null);
  assert.equal(calls[1].args.p_invalid_token, false);
});

test('lotes de 100: 250 entregas hacen tres peticiones y cada una se informa', async () => {
  const many = Array.from({ length: 250 }, (_, index) => delivery(String(index)));
  const client = clientFor(many);
  const sizes = [];
  await dispatchPush(client, async (_url, options) => {
    const messages = JSON.parse(options.body);
    sizes.push(messages.length);
    return jsonResponse({ data: messages.map((_, index) => ({ status: 'ok', id: `t-${sizes.length}-${index}` })) });
  });
  assert.deepEqual(sizes, [100, 100, 50]);
  assert.equal(reports(client, 'report_push_ticket').length, 250);
});

test('la reserva pide como máximo el límite indicado', async () => {
  const client = clientFor([]);
  await dispatchPush(client, async () => assert.fail('sin entregas no se llama a Expo'), { limit: 25 });
  assert.equal(reports(client, 'reserve_push_deliveries')[0].args.p_limit, 25);
  assert.equal(reports(client, 'reserve_push_receipts')[0].args.p_limit, 25);
});

test('si la reserva falla, el error sube y no se llama a Expo', async () => {
  const client = { rpc: async () => ({ data: null, error: new Error('base caída') }) };
  await assert.rejects(dispatchPush(client, async () => assert.fail('no debe llamar a Expo')), /base caída/);
});

test('una falla al registrar un resultado no impide registrar los demás', async () => {
  const client = clientFor([delivery('a'), delivery('b')], [], {
    failReport: (name, args) => name === 'report_push_ticket' && args.p_delivery_id === 'a',
  });
  const original = console.error;
  console.error = () => {};
  let result;
  try {
    result = await dispatchPush(client, async () => jsonResponse({ data: [
      { status: 'ok', id: 'ticket-a' }, { status: 'ok', id: 'ticket-b' },
    ] }));
  } finally { console.error = original; }
  assert.equal(reports(client, 'report_push_ticket').length, 2);
  assert.equal(result.report_failures, 1);
});

test('receipt con error DeviceNotRegistered informa su entrega; uno ausente espera otro ciclo', async () => {
  const client = clientFor([], [receiptRow('a'), receiptRow('b'), receiptRow('c')]);
  const result = await dispatchPush(client, async (url, options) => {
    assert.match(url, /getReceipts$/);
    assert.deepEqual(JSON.parse(options.body).ids, ['ticket-a', 'ticket-b', 'ticket-c']);
    return jsonResponse({ data: {
      'ticket-a': { status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } },
      'ticket-c': { status: 'ok' },
    } });
  });
  const calls = reports(client, 'report_push_receipt');
  assert.equal(calls[0].args.p_status, 'error');
  assert.equal(calls[0].args.p_invalid_token, true);
  assert.equal(calls[0].args.p_error, 'DeviceNotRegistered');
  assert.equal(calls[1].args.p_status, 'retry');
  assert.equal(calls[1].args.p_invalid_token, false);
  assert.equal(calls[2].args.p_status, 'ok');
  assert.equal(result.receipts_delivered, 1);
});

test('un error de receipt distinto de DeviceNotRegistered no retira el token', async () => {
  const client = clientFor([], [receiptRow('a')]);
  await dispatchPush(client, async () => jsonResponse({ data: {
    'ticket-a': { status: 'error', message: 'fcm', details: { error: 'MismatchSenderId' } },
  } }));
  const [call] = reports(client, 'report_push_receipt');
  assert.equal(call.args.p_status, 'error');
  assert.equal(call.args.p_invalid_token, false);
  assert.equal(call.args.p_error, 'MismatchSenderId');
});

test('receipt con error transitorio se informa como error con su causa; el ausente sólo se reconsulta', async () => {
  const client = clientFor([], [receiptRow('a'), receiptRow('b'), receiptRow('c')]);
  const result = await dispatchPush(client, async () => jsonResponse({ data: {
    'ticket-a': { status: 'error', details: { error: 'MessageRateExceeded' } },
    'ticket-c': { status: 'error', message: 'proveedor', details: { error: 'MismatchSenderId' } },
  } }));
  const calls = reports(client, 'report_push_receipt');
  // La base decide: MessageRateExceeded se reenvía y MismatchSenderId no.
  assert.equal(calls[0].args.p_status, 'error');
  assert.equal(calls[0].args.p_error, 'MessageRateExceeded');
  assert.equal(calls[0].args.p_invalid_token, false);
  assert.equal(classifyError('MessageRateExceeded'), 'transient');
  assert.equal(calls[1].args.p_status, 'retry');
  assert.equal(calls[1].args.p_error, null);
  assert.equal(calls[2].args.p_status, 'error');
  assert.equal(calls[2].args.p_error, 'MismatchSenderId');
  assert.equal(classifyError('MismatchSenderId'), 'permanent');
  assert.equal(result.receipts_delivered, 0);
});

test('evento vencido durante la espera no sale a Expo', async () => {
  const old = { ...delivery('a'), expires_at: new Date(Date.now() - 1000).toISOString() };
  const client = clientFor([old]);
  await dispatchPush(client, async () => assert.fail('sin envío tras vencimiento'));
  assert.equal(reports(client, 'report_push_ticket')[0].args.p_error, 'permanent:expired');
});

test('HTTP 401 es permanente y HTTP 429 se reintenta', async () => {
  for (const [status, prefix] of [[401, 'permanent:'], [429, '']]) {
    const client = clientFor([delivery('a')]);
    await dispatchPush(client, async () => ({ ok: false, status }));
    assert.equal(reports(client, 'report_push_ticket')[0].args.p_error, `${prefix}Expo HTTP ${status}`);
  }
});

test('si la consulta de receipts falla, todos esperan otro ciclo', async () => {
  const client = clientFor([], [receiptRow('a'), receiptRow('b')]);
  const original = console.error;
  console.error = () => {};
  try {
    for (const fetcher of [async () => ({ ok: false, status: 500 }), async () => { throw new Error('timeout'); }]) {
      client.calls.length = 0;
      const result = await dispatchPush(client, fetcher);
      assert.equal(result.receipts_delivered, 0);
      const calls = reports(client, 'report_push_receipt');
      assert.equal(calls.length, 2);
      assert.ok(calls.every((call) => call.args.p_status === 'retry' && call.args.p_error === null));
    }
  } finally { console.error = original; }
});

test('los receipts también se consultan en lotes de 100', async () => {
  const rows = Array.from({ length: 150 }, (_, index) => receiptRow(String(index)));
  const client = clientFor([], rows);
  const sizes = [];
  await dispatchPush(client, async (_url, options) => {
    const ids = JSON.parse(options.body).ids;
    sizes.push(ids.length);
    return jsonResponse({ data: Object.fromEntries(ids.map((id) => [id, { status: 'ok' }])) });
  });
  assert.deepEqual(sizes, [100, 50]);
  assert.equal(reports(client, 'report_push_receipt').length, 150);
});

test('InvalidCredentials, MessageTooBig y MismatchSenderId del ticket son permanentes y no retiran el token', async () => {
  const codes = ['InvalidCredentials', 'MessageTooBig', 'MismatchSenderId'];
  const client = clientFor(codes.map((_, index) => delivery(String(index))));
  const result = await dispatchPush(client, async () => jsonResponse({
    data: codes.map((code) => ({ status: 'error', message: code, details: { error: code } })),
  }));
  const calls = reports(client, 'report_push_ticket');
  assert.deepEqual(calls.map((call) => call.args.p_error), codes);
  assert.ok(calls.every((call) => call.args.p_ticket_id === null && call.args.p_invalid_token === false));
  assert.ok(codes.every((code) => classifyError(code) === 'permanent'));
  assert.equal(result.tickets_permanent_failures, 3);
  assert.equal(result.tickets_to_retry, 0);
});

test('en el ticket, MessageRateExceeded y los errores del proveedor son transitorios', async () => {
  const codes = ['MessageRateExceeded', 'ExpoServerError', 'ServiceUnavailable', 'CodigoDesconocido'];
  const client = clientFor(codes.map((_, index) => delivery(String(index))));
  const result = await dispatchPush(client, async () => jsonResponse({
    data: codes.map((code) => ({ status: 'error', details: { error: code } })),
  }));
  assert.ok(codes.every((code) => classifyError(code) === 'transient'));
  assert.equal(result.tickets_to_retry, 4);
  assert.equal(result.tickets_permanent_failures, 0);
  assert.ok(reports(client, 'report_push_ticket').every((call) => call.args.p_invalid_token === false));
});

test('HTTP 5xx y 408 se reintentan; 400 y 403 son permanentes', async () => {
  for (const [status, expected] of [[500, 'Expo HTTP 500'], [502, 'Expo HTTP 502'], [408, 'Expo HTTP 408'],
    [400, 'permanent:Expo HTTP 400'], [403, 'permanent:Expo HTTP 403']]) {
    const client = clientFor([delivery('a')]);
    await dispatchPush(client, async () => ({ ok: false, status }));
    const [call] = reports(client, 'report_push_ticket');
    assert.equal(call.args.p_error, expected);
    assert.equal(classifyError(call.args.p_error), status >= 500 || status === 408 ? 'transient' : 'permanent');
  }
});

test('la caducidad enviada a Expo es la vigencia restante del evento, no un plazo desde el envío', async () => {
  const soon = new Date(Date.now() + 10 * 60_000);
  const client = clientFor([{ ...delivery('a'), expires_at: soon.toISOString() }]);
  await dispatchPush(client, async (_url, options) => {
    const [sent] = JSON.parse(options.body);
    assert.equal(sent.expiration, Math.floor(soon.getTime() / 1000));
    assert.ok(sent.expiration - Math.floor(Date.now() / 1000) <= 600);
    assert.equal('ttl' in sent, false);
    return jsonResponse({ data: [{ status: 'ok', id: 'ticket-a' }] });
  });
  assert.equal(reports(client, 'report_push_ticket')[0].args.p_ticket_id, 'ticket-a');
});

test('un lote mixto reporta vencidas, aceptadas y rechazadas por separado', async () => {
  const old = { ...delivery('old'), expires_at: new Date(Date.now() - 1000).toISOString() };
  const client = clientFor([old, delivery('ok'), delivery('big')]);
  const result = await dispatchPush(client, async (_url, options) => {
    assert.equal(JSON.parse(options.body).length, 2);
    return jsonResponse({ data: [{ status: 'ok', id: 'ticket-ok' },
      { status: 'error', details: { error: 'MessageTooBig' } }] });
  });
  const byId = Object.fromEntries(reports(client, 'report_push_ticket').map((call) => [call.args.p_delivery_id, call.args]));
  assert.equal(byId.old.p_error, 'permanent:expired');
  assert.equal(byId.ok.p_ticket_id, 'ticket-ok');
  assert.equal(byId.big.p_error, 'MessageTooBig');
  assert.equal(result.tickets_accepted, 1);
  assert.equal(result.tickets_permanent_failures, 1);
});

test('receipts que fallan no provocan ningún reenvío: sólo se consulta Expo por receipts', async () => {
  const client = clientFor([], [receiptRow('a')]);
  const urls = [];
  const original = console.error;
  console.error = () => {};
  try {
    await dispatchPush(client, async (url) => { urls.push(url); throw new Error('timeout'); });
  } finally { console.error = original; }
  assert.equal(urls.length, 1);
  assert.match(urls[0], /getReceipts$/);
  assert.equal(reports(client, 'report_push_ticket').length, 0);
});

test('la clasificación coincide exactamente con public.push_error_class de la migración', () => {
  const sql = readFileSync(new URL('../../migrations/20260929140000_ajustes_despacho_push.sql', import.meta.url), 'utf8');
  const body = sql.match(/function public\.push_error_class[\s\S]*?\$\$;/)?.[0];
  assert.ok(body, 'no se encontró push_error_class');
  const quoted = (text) => [...text.matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1]);
  const invalidSql = quoted(body.match(/p_error = '[A-Za-z]+'/)[0]);
  const permanentSql = quoted(body.match(/p_error in \(([^)]*)\)/)[1]);
  assert.deepEqual(invalidSql, EXPO_ERRORS.invalidToken);
  assert.deepEqual([...permanentSql].sort(), [...EXPO_ERRORS.permanent].sort());
  assert.match(body, /like 'permanent:%'/);
  assert.match(body, /else 'transient'/);
  for (const code of EXPO_ERRORS.transient) assert.equal(classifyError(code), 'transient');
  assert.equal(classifyError('permanent:Expo HTTP 401'), 'permanent');
  assert.equal(classifyError('uncertain:timeout'), 'transient');
});
