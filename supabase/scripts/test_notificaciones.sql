-- Prueba de los avisos de acceso a equipos contra una base local con las migraciones aplicadas:
--
--   docker exec -i supabase_db_TerraSense psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/scripts/test_notificaciones.sql
--
-- Todo ocurre en una transacción que termina en rollback. Cualquier incumplimiento lanza
-- una excepción con el prefijo FALLA y detiene el guion. Las personas se simulan con los
-- roles reales de Postgres (authenticated y anon), de modo que también se comprueban
-- permisos y RLS; el despachador se simula con el rol de servicio en el token (t_svc) y una
-- vez con el rol real. Dentro de una transacción now() no avanza: los plazos se mueven
-- editando las columnas de tiempo.

\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

\set admin    '''11111111-1111-4111-8111-111111111111''::uuid'
\set pend     '''22222222-2222-4222-8222-222222222222''::uuid'
\set other    '''33333333-3333-4333-8333-333333333333''::uuid'
\set staff    '''44444444-4444-4444-8444-444444444444''::uuid'
\set stranger '''55555555-5555-4555-8555-555555555555''::uuid'
\set extra    '''66666666-6666-4666-8666-666666666666''::uuid'
\set u7       '''77777777-7777-4777-8777-777777777777''::uuid'
\set u8       '''88888888-8888-4888-8888-888888888888''::uuid'
\set u9       '''99999999-9999-4999-8999-999999999999''::uuid'
\set d1       '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa''::uuid'
\set d2       '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb''::uuid'
\set d3       '''cccccccc-cccc-4ccc-8ccc-cccccccccccc''::uuid'
\set i1       '''aaaaaaaa-1111-4111-8111-111111111111''::uuid'
\set i2       '''aaaaaaaa-2222-4222-8222-222222222222''::uuid'
\set i3       '''aaaaaaaa-3333-4333-8333-333333333333''::uuid'
\set i4       '''aaaaaaaa-4444-4444-8444-444444444444''::uuid'
\set i5       '''aaaaaaaa-5555-4555-8555-555555555555''::uuid'
\set s1       'repeat(''a'',40)'
\set s2       'repeat(''b'',40)'
\set s3       'repeat(''c'',40)'
\set s4       'repeat(''d'',40)'
\set s5       'repeat(''e'',40)'
\set sbad     'repeat(''x'',40)'

begin;
set constraints all deferred;

create function public.t_assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FALLA: %', p_msg; end if;
end $$;

-- Simula a una persona (o a anon) con el rol real de Postgres; reset role vuelve a postgres.
create function public.t_as(p_uid uuid, p_role text default 'authenticated') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role,
    'session_id', p_uid)::text, true);
  execute format('set local role %I', p_role);
end $$;

-- El despachador: token con rol de servicio, sin cambiar el rol de Postgres.
create function public.t_svc() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
end $$;

-- Ejecuta una sentencia y exige que falle (con el SQLSTATE indicado, si se da).
create function public.t_fails(p_sql text, p_state text default null) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_state is not null and sqlstate <> p_state then
      raise exception 'FALLA: % dio SQLSTATE % y se esperaba %', p_sql, sqlstate, p_state;
    end if;
    return;
  end;
  raise exception 'FALLA: debía fallar y no falló: %', p_sql;
end $$;
grant execute on function public.t_assert(boolean, text), public.t_as(uuid, text), public.t_svc(),
  public.t_fails(text, text) to public, anon, authenticated, service_role;

-- Identificadores que las personas simuladas no pueden consultar por su cuenta.
create temp table t_events(kind text primary key, id uuid);
grant select on t_events to public;

-- ---------------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------------
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
select v.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v.email, 'x', now()
from (values
  (:admin, 't-admin@example.com'), (:pend, 't-pend@example.com'), (:other, 't-other@example.com'),
  (:staff, 'akurasoporte@gmail.com'), (:stranger, 't-stranger@example.com'),
  (:extra, 't-extra@example.com'), (:u7, 't-u7@example.com'), (:u8, 't-u8@example.com'),
  (:u9, 't-u9@example.com')) as v(id, email);
insert into auth.sessions(id, user_id, created_at)
  select id, id, now() - interval '1 minute' from auth.users
  where id in (:admin, :pend, :other, :staff, :stranger, :extra, :u7, :u8, :u9);
select public.t_assert((select count(*) from public.profiles
  where id in (:admin, :pend, :other, :staff, :stranger, :extra, :u7, :u8, :u9)) = 9,
  'handle_new_user debe crear los nueve perfiles');
insert into public.admin_support_users(email, full_name, user_id)
  values ('akurasoporte@gmail.com', 'Soporte', :staff);
insert into public.devices(id, device_code, name) values
  (:d1, '123456789012345', 'Sonda 1'), (:d2, '123456789012346', 'Sonda 2'), (:d3, '123456789012347', 'Sonda 3');

-- ---------------------------------------------------------------------------
-- 1. Alta pendiente: un solo evento, con destinatario y vigencia
-- ---------------------------------------------------------------------------
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :admin, 'admin', true);
select public.t_assert((select count(*) from public.push_alerts where device_id = :d1) = 0,
  'el primer administrador no genera avisos');
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :pend, 'user', false);
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :pend, 'user', false)
  on conflict do nothing;
select public.t_assert((select count(*) from public.push_alerts where device_id = :d1
  and event_type = 'access_request' and requester_user_id = :pend and status = 'active') = 1,
  'una alta pendiente debe crear un solo access_request, aunque se repita el intento');
select public.t_assert((select count(*) from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.device_id = :d1 and a.event_type = 'access_request' and r.user_id = :admin) = 1,
  'el administrador debe ser el único destinatario de la solicitud');
select public.t_assert((select expires_at between now() + interval '29 days' and now() + interval '31 days'
  from public.push_alerts where device_id = :d1 and event_type = 'access_request'),
  'el evento vence a los 30 días');
insert into t_events select 'req_pend', id from public.push_alerts
  where device_id = :d1 and event_type = 'access_request' and requester_user_id = :pend;

-- ---------------------------------------------------------------------------
-- 2. Instalaciones: dos teléfonos por cuenta, secreto y validaciones
-- ---------------------------------------------------------------------------
select public.t_as(:admin);
select public.register_push_installation(:i1, :s1, 'ExpoPushToken[adminone]', 'android', 'granted');
select public.register_push_installation(:i2, :s2, 'ExpoPushToken[admintwo]', 'ios', 'granted');
select public.t_as(:pend);
select public.register_push_installation(:i3, :s3, 'ExpoPushToken[pendone]', 'android', 'granted');
reset role;
select public.t_assert((select count(*) from public.push_installations where user_id = :admin and expo_push_token is not null) = 2,
  'una cuenta debe poder registrar dos instalaciones');
select public.t_assert((select secret_hash <> repeat('a', 40) and length(secret_hash) = 64
  from public.push_installations where id = :i1), 'el servidor sólo guarda el resumen del secreto');
select public.t_assert((select token_generation from public.push_installations where id = :i1) = 1,
  'una instalación nueva parte en la generación 1');
create temp table t_snap on commit drop as
  select id, user_id, expo_push_token, token_generation, revoked_at, permission from public.push_installations;

select public.t_as(:admin);
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i1, :sbad, 'ExpoPushToken[adminone]', 'android', 'granted'), '42501');
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i1, 'corto', null, 'android', 'granted'), '22023');
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i5, :s5, 'ExpoPushToken[x]', 'android', 'denied'), '22023');
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i5, :s5, 'token-cualquiera', 'android', 'granted'), '22023');
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i5, :s5, null, 'windows', 'granted'), '22023');
select public.t_as(:pend);
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i1, :sbad, 'ExpoPushToken[robo]', 'android', 'granted'), '42501');
reset role;
select public.t_assert((select count(*) from public.push_installations where id = :i5) = 0,
  'los intentos rechazados no dejan filas');
select public.t_assert((select bool_and(s.expo_push_token is not distinct from i.expo_push_token
  and s.user_id = i.user_id and s.token_generation = i.token_generation)
  from t_snap s join public.push_installations i using (id)),
  'los intentos con secreto incorrecto no modifican ninguna instalación');

-- ---------------------------------------------------------------------------
-- 3. Despacho: reserva por instalación (con el rol real de servicio)
-- ---------------------------------------------------------------------------
select public.t_as(null, 'service_role');
create temp table t_res1 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0,
  'una segunda ejecución no duplica reservas vigentes');
reset role;
select public.t_assert((select count(*) from t_res1) = 2, 'la solicitud debe reservarse para las dos instalaciones del administrador');
select public.t_assert((select count(distinct lease_id) from t_res1) = 2, 'cada reserva tiene su lease');
select public.t_assert((select bool_and(event_type = 'access_request' and device_id = :d1
  and title = 'Solicitud de acceso al equipo') from t_res1), 'textos y datos del primer aviso');
select public.t_assert((select array_agg(expo_push_token order by expo_push_token) = array['ExpoPushToken[adminone]', 'ExpoPushToken[admintwo]']
  from t_res1), 'sólo las instalaciones del administrador reciben la solicitud (no la del solicitante)');

-- ---------------------------------------------------------------------------
-- 4. Ticket, reintento con espera, lease vencido, token inválido y receipts
-- ---------------------------------------------------------------------------
create temp table t_ids on commit drop as
  select (select delivery_id from t_res1 where expo_push_token = 'ExpoPushToken[adminone]') as d1,
         (select lease_id from t_res1 where expo_push_token = 'ExpoPushToken[adminone]') as l1,
         (select delivery_id from t_res1 where expo_push_token = 'ExpoPushToken[admintwo]') as d2,
         (select lease_id from t_res1 where expo_push_token = 'ExpoPushToken[admintwo]') as l2;
select public.t_svc();
select public.report_push_ticket((select d1 from t_ids), (select l1 from t_ids), 'TICKET-1');
select public.report_push_ticket((select d2 from t_ids), (select l2 from t_ids), null, 'MessageRateExceeded');
-- Un lease ajeno o ya usado no cambia nada.
select public.report_push_ticket((select d1 from t_ids), gen_random_uuid(), null, 'X');
select public.report_push_ticket((select d1 from t_ids), (select l1 from t_ids), null, 'X');
select public.t_assert((select state = 'ticket_ok' and ticket_id = 'TICKET-1' and ticket_at is not null
  and attempts = 1 and last_error is null from public.push_deliveries where id = (select d1 from t_ids)),
  'el ticket aceptado queda registrado una sola vez');
select public.t_assert((select state = 'pending' and attempts = 1 and last_error = 'MessageRateExceeded'
  and next_attempt_at between now() + interval '25 seconds' and now() + interval '35 seconds'
  from public.push_deliveries where id = (select d2 from t_ids)),
  'un fallo transitorio reprograma la entrega con 30 s de espera');
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0, 'no se reintenta antes de la espera');
update public.push_deliveries set next_attempt_at = now() where id = (select d2 from t_ids);
create temp table t_res2 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res2) = 1 and (select attempts from public.push_deliveries
  where id = (select d2 from t_ids)) = 2, 'tras la espera se reserva de nuevo (segundo intento)');
select public.report_push_ticket((select d2 from t_ids), (select lease_id from t_res2), null, 'MessageRateExceeded');
select public.t_assert((select next_attempt_at between now() + interval '55 seconds' and now() + interval '65 seconds'
  from public.push_deliveries where id = (select d2 from t_ids)), 'la espera crece: 30 s, 60 s, 120 s...');
-- Lease vencido: vuelve a la cola sin que nadie haya informado.
update public.push_deliveries set next_attempt_at = now() where id = (select d2 from t_ids);
create temp table t_res3 on commit drop as select * from public.reserve_push_deliveries(50);
update public.push_deliveries set leased_until = now() - interval '1 second' where id = (select d2 from t_ids);
create temp table t_res4 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res3) = 1 and (select count(*) from t_res4) = 1
  and (select attempts from public.push_deliveries where id = (select d2 from t_ids)) = 4,
  'un lease vencido se vuelve a reservar y cuenta el intento');
-- Token inválido: la entrega falla y sólo esa instalación pierde el token.
select public.report_push_ticket((select d2 from t_ids), (select lease_id from t_res4), null, 'DeviceNotRegistered', true);
select public.t_assert((select state = 'failed' and last_error = 'DeviceNotRegistered'
  from public.push_deliveries where id = (select d2 from t_ids)), 'DeviceNotRegistered cierra la entrega');
select public.t_assert((select expo_push_token is null and token_generation = 2
  from public.push_installations where id = :i2), 'el token inválido se retira de esa instalación');
select public.t_assert((select expo_push_token is not null and token_generation = 1
  from public.push_installations where id = :i1), 'la otra instalación de la cuenta no se ve afectada');
-- Receipts: separados del ticket y de la lectura.
select public.t_assert((select count(*) from public.reserve_push_receipts(50)) = 0, 'el receipt no se consulta antes de 15 minutos');
update public.push_deliveries set next_attempt_at = now() where id = (select d1 from t_ids);
create temp table t_rc1 on commit drop as select * from public.reserve_push_receipts(50);
select public.t_assert((select count(*) from t_rc1) = 1 and (select ticket_id from t_rc1) = 'TICKET-1', 'se reserva el receipt del ticket');
select public.t_assert((select state from public.push_deliveries where id = (select d1 from t_ids)) = 'receipt_leased', 'estado receipt_leased');
select public.report_push_receipt((select delivery_id from t_rc1), (select lease_id from t_rc1), 'retry');
select public.t_assert((select state = 'ticket_ok' and next_attempt_at between now() + interval '14 minutes' and now() + interval '16 minutes'
  from public.push_deliveries where id = (select d1 from t_ids)), 'un receipt ausente espera otro ciclo');
update public.push_deliveries set next_attempt_at = now() where id = (select d1 from t_ids);
create temp table t_rc2 on commit drop as select * from public.reserve_push_receipts(50);
update public.push_deliveries set leased_until = now() - interval '1 second' where id = (select d1 from t_ids);
create temp table t_rc3 on commit drop as select * from public.reserve_push_receipts(50);
select public.t_assert((select count(*) from t_rc2) = 1 and (select count(*) from t_rc3) = 1,
  'un lease de receipt vencido se vuelve a reservar');
select public.t_fails(format('select public.report_push_receipt(%L,%L,%L)',
  (select delivery_id from t_rc3), (select lease_id from t_rc3), 'desconocido'), '22023');
select public.report_push_receipt((select delivery_id from t_rc2), (select lease_id from t_rc2), 'ok');  -- lease anterior: sin efecto
select public.t_assert((select state = 'receipt_leased' from public.push_deliveries where id = (select d1 from t_ids)),
  'un lease de receipt reemplazado no puede cerrar la entrega');
select public.report_push_receipt((select delivery_id from t_rc3), (select lease_id from t_rc3), 'ok');
select public.t_assert((select state = 'delivered' and receipt_checked_at is not null
  from public.push_deliveries where id = (select d1 from t_ids)), 'el receipt confirma la entrega');
select public.t_assert((select read_at is null from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.device_id = :d1 and a.event_type = 'access_request' and r.user_id = :admin),
  'entrega confirmada por Expo no equivale a lectura');
-- La lectura es del usuario y no cambia el despacho.
select public.t_as(:admin);
select public.mark_notification_read((select id from public.list_my_notifications(30) where event_type = 'access_request' limit 1));
select public.mark_notification_read((select id from public.list_my_notifications(30) where event_type = 'access_request' limit 1));
reset role;
select public.t_assert((select read_at is not null from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.device_id = :d1 and a.event_type = 'access_request' and r.user_id = :admin), 'la lectura queda registrada por destinatario');
select public.t_assert((select state from public.push_deliveries where id = (select d1 from t_ids)) = 'delivered'
  and (select state from public.push_deliveries where id = (select d2 from t_ids)) = 'failed',
  'leer un aviso no modifica el estado de las entregas');

-- ---------------------------------------------------------------------------
-- 5. Preferencias e idioma
-- ---------------------------------------------------------------------------
update public.profiles set app_preferences = jsonb_set(jsonb_set(app_preferences, '{notifications,device}', 'false'),
  '{language}', '"en"') where id = :admin;
select public.t_as(:other);
select public.register_push_installation(:i5, :s5, 'ExpoPushToken[otherone]', 'ios', 'granted');
reset role;
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :other, 'user', false);
create temp table t_alerts on commit drop as
  select requester_user_id as who, id from public.push_alerts where device_id = :d1 and event_type = 'access_request';
grant select on t_alerts to public;
select public.t_svc();
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0,
  'con device=false no se reserva ninguna entrega');
select public.t_assert((select count(*) from public.push_deliveries where alert_id = (select id from t_alerts where who = :other)) = 0,
  'con device=false ni siquiera se crean entregas');
update public.profiles set app_preferences = jsonb_set(app_preferences, '{notifications,device}', 'true') where id = :admin;
create temp table t_res5 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res5) = 1 and (select title from t_res5) = 'Device access request'
  and (select expo_push_token from t_res5) = 'ExpoPushToken[adminone]',
  'al reactivar la preferencia sale un solo aviso, sólo a la instalación con token y en inglés');
-- Preferencia desactivada con una entrega ya reservada: se cancela y no revive.
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :extra, 'user', false);
insert into t_alerts select requester_user_id, id from public.push_alerts
  where device_id = :d1 and event_type = 'access_request' and requester_user_id = :extra;
create temp table t_res6 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res6) = 1, 'la solicitud de extra se reserva');
update public.profiles set app_preferences = jsonb_set(app_preferences, '{notifications,device}', 'false') where id = :admin;
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0, 'preferencia apagada: no hay reservas');
select public.t_assert((select bool_and(state = 'cancelled' and last_error = 'preference_disabled')
  from public.push_deliveries where alert_id in (select id from t_alerts where who in (:other, :extra))),
  'las entregas abiertas se cancelan por preferencia');
update public.profiles set app_preferences = jsonb_set(app_preferences, '{notifications,device}', 'true') where id = :admin;
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0,
  'una entrega cancelada por preferencia no se reactiva sola');

-- ---------------------------------------------------------------------------
-- 6. Resolución de solicitudes: aprobación, rechazo, retiro y retiro propio
-- ---------------------------------------------------------------------------
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :u8, 'user', false);
insert into t_alerts select requester_user_id, id from public.push_alerts
  where device_id = :d1 and event_type = 'access_request' and requester_user_id = :u8;
create temp table t_res7 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res7) = 1 and (select alert_id from t_res7) = (select id from t_alerts where who = :u8),
  'la solicitud de u8 queda con una entrega reservada');
select public.t_as(:admin);
select public.manage_device_member(:d1, :u8, 'authorize');
select public.manage_device_member(:d1, :u8, 'authorize');  -- repetir no crea otro evento
reset role;
select public.t_assert((select status = 'cancelled' from public.push_alerts where id = (select id from t_alerts where who = :u8)),
  'la solicitud aprobada queda cancelada');
select public.t_assert((select count(*) from public.push_deliveries where alert_id = (select id from t_alerts where who = :u8)
  and state in ('pending', 'leased')) = 0, 'no quedan entregas abiertas de una solicitud resuelta');
select public.t_assert((select count(*) from public.push_alerts where device_id = :d1 and event_type = 'access_approved'
  and user_id = :u8) = 1, 'la aprobación genera un solo evento');
select public.t_assert((select count(*) from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.event_type = 'access_approved' and a.device_id = :d1) = 1, 'el aprobado es el único destinatario');
select public.t_svc();
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0,
  'la solicitud resuelta no se despacha y u8 no tiene teléfono registrado');

-- Rechazo por el administrador de la app: un evento, legible sólo por el solicitante.
select public.t_as(:admin);
select public.manage_device_member(:d1, :pend, 'remove');
reset role;
select public.t_assert((select count(*) from public.push_alerts where device_id = :d1 and event_type = 'access_rejected') = 1,
  'el rechazo genera un solo evento');
select public.t_assert((select status = 'cancelled' from public.push_alerts where id = (select id from t_events where kind = 'req_pend')),
  'la solicitud rechazada queda cancelada');
insert into t_events select 'rej_pend', id from public.push_alerts
  where device_id = :d1 and event_type = 'access_rejected' and user_id = :pend;
select public.t_as(:pend);
select public.t_assert((select count(*) from public.list_my_notifications(30)) = 1
  and (select event_type from public.list_my_notifications(30)) = 'access_rejected'
  and (select status from public.list_my_notifications(30)) = 'active',
  'el solicitante rechazado sólo ve su rechazo, aunque ya no sea integrante');
select public.t_assert((select count(*) from public.get_my_notification((select id from t_events where kind = 'rej_pend'))) = 1,
  'get_my_notification devuelve el rechazo');
select public.mark_notification_read((select id from t_events where kind = 'rej_pend'));
select public.t_as(:admin);
select public.t_assert((select count(*) from public.list_my_notifications(30) where event_type = 'access_rejected') = 0,
  'el administrador no ve el rechazo ajeno');
select public.t_fails(format('select public.mark_notification_read(%L)', (select id from t_events where kind = 'rej_pend')), '42501');
reset role;
select public.t_assert((select read_at is not null from public.notification_recipients
  where alert_id = (select id from t_events where kind = 'rej_pend') and user_id = :pend), 'el solicitante marcó su rechazo');
select public.t_svc();
create temp table t_res8 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res8) = 1 and (select event_type from t_res8) = 'access_rejected'
  and (select expo_push_token from t_res8) = 'ExpoPushToken[pendone]', 'el rechazo se despacha al teléfono del solicitante');

-- Retiro de un integrante aprobado: sus avisos dejan de ser visibles y despachables.
select public.t_as(:other);
select public.t_assert((select count(*) from public.list_my_notifications(30)) = 0, 'other aún no tiene avisos');
select public.t_as(:admin);
select public.manage_device_member(:d1, :other, 'authorize');
reset role;
select public.t_svc();
create temp table t_res9 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res9) = 1 and (select event_type from t_res9) = 'access_approved',
  'la aprobación se despacha al aprobado');
insert into t_events select 'appr_other', id from public.push_alerts
  where device_id = :d1 and event_type = 'access_approved' and user_id = :other;
select public.t_as(:other);
select public.t_assert((select count(*) from public.list_my_notifications(30)) = 1, 'el aprobado ve su aviso');
select public.t_as(:admin);
select public.manage_device_member(:d1, :other, 'remove');
reset role;
select public.t_assert((select count(*) from public.push_alerts where device_id = :d1 and event_type = 'access_rejected') = 1,
  'retirar a un integrante aprobado no genera un rechazo');
select public.t_assert((select count(*) from public.push_deliveries d join public.push_alerts a on a.id = d.alert_id
  where a.event_type = 'access_approved' and d.user_id = :other and d.state in ('pending', 'leased')) = 0,
  'el retiro cancela las entregas abiertas del retirado');
select public.t_as(:other);
select public.t_assert((select count(*) from public.list_my_notifications(30)) = 0, 'el retirado ya no ve avisos del equipo');
select public.t_fails(format('select public.mark_notification_read(%L)', (select id from t_events where kind = 'appr_other')), '42501');
reset role;
-- Retiro de la propia solicitud: no se avisa a sí mismo.
-- (authenticated no tiene DELETE directo sobre device_members: se simula la identidad sin cambiar de rol.)
select public.t_as(:extra);
reset role;
delete from public.device_members where device_id = :d1 and user_id = :extra;
select public.t_assert((select status = 'cancelled' from public.push_alerts where id = (select id from t_alerts where who = :extra)),
  'retirar la propia solicitud la cancela');
select public.t_assert((select count(*) from public.push_alerts where device_id = :d1 and event_type = 'access_rejected') = 1,
  'retirar la propia solicitud no genera rechazo');

-- ---------------------------------------------------------------------------
-- 7. Transferencia de administración
-- ---------------------------------------------------------------------------
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d2, :admin, 'admin', true);
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d2, :other, 'user', false);
update public.device_members set is_authorized = true where device_id = :d2 and user_id = :other;
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d2, :u7, 'user', false);
select public.t_assert((select count(*) from public.push_alerts where device_id = :d2 and event_type = 'access_request'
  and status = 'active') = 1, 'sólo queda pendiente la solicitud de u7');
select public.t_as(:admin);
select public.manage_device_member(:d2, :other, 'transfer_owner');
reset role;
select public.t_assert((select count(*) from public.push_alerts where device_id = :d2 and event_type = 'admin_transferred') = 1,
  'la transferencia genera un solo evento');
select public.t_assert((select count(*) from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.device_id = :d2 and a.event_type = 'admin_transferred' and r.user_id in (:admin, :other)) = 2,
  'ambos administradores (el que cede y el que recibe) son destinatarios del mismo evento');
select public.t_assert((select cancelled_at is not null from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.device_id = :d2 and a.event_type = 'access_request' and a.status = 'active' and r.user_id = :admin),
  'el administrador anterior deja de recibir las solicitudes pendientes');
select public.t_assert((select cancelled_at is null from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.device_id = :d2 and a.event_type = 'access_request' and a.status = 'active' and r.user_id = :other),
  'la solicitud pendiente pasa al administrador nuevo');
select public.t_as(:admin);
select public.t_assert((select count(*) from public.list_my_notifications(30) where device_id = :d2 and event_type = 'access_request') = 0,
  'el administrador anterior no ve la solicitud');
select public.t_assert((select count(*) from public.list_my_notifications(30) where device_id = :d2 and event_type = 'admin_transferred') = 1,
  'el administrador anterior sí ve la transferencia');
select public.t_as(:other);
select public.t_assert((select count(*) from public.list_my_notifications(30) where device_id = :d2 and event_type = 'access_request') = 1,
  'el administrador nuevo ve la solicitud');
select public.mark_notification_read((select id from public.list_my_notifications(30) where event_type = 'admin_transferred'));
reset role;
select public.t_assert((select read_at is not null from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.event_type = 'admin_transferred' and a.device_id = :d2 and r.user_id = :other)
  and (select read_at is null from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where a.event_type = 'admin_transferred' and a.device_id = :d2 and r.user_id = :admin),
  'la lectura de un destinatario no marca la del otro');
select public.t_svc();
create temp table t_res10 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res10 where alert_id = (select id from public.push_alerts
  where device_id = :d2 and event_type = 'access_request' and status = 'active')
  and expo_push_token = 'ExpoPushToken[otherone]') = 1, 'el teléfono del administrador nuevo recibe la solicitud');
select public.t_assert((select count(*) from t_res10 where alert_id = (select id from public.push_alerts
  where device_id = :d2 and event_type = 'access_request' and status = 'active')
  and expo_push_token like 'ExpoPushToken[admin%') = 0, 'los teléfonos del administrador anterior no la reciben');
-- Receipt con DeviceNotRegistered retira el token.
select public.report_push_ticket(delivery_id, lease_id, 'TICKET-5') from t_res10
  where alert_id = (select id from public.push_alerts where device_id = :d2 and event_type = 'admin_transferred')
    and expo_push_token = 'ExpoPushToken[otherone]';
update public.push_deliveries set next_attempt_at = now() where ticket_id = 'TICKET-5';
create temp table t_rc4 on commit drop as select * from public.reserve_push_receipts(50);
select public.report_push_receipt(delivery_id, lease_id, 'error', 'DeviceNotRegistered', true) from t_rc4 where ticket_id = 'TICKET-5';
select public.t_assert((select state = 'failed' and last_error = 'DeviceNotRegistered' from public.push_deliveries where ticket_id = 'TICKET-5'),
  'un receipt con error cierra la entrega');
select public.t_assert((select expo_push_token is null from public.push_installations where id = :i5),
  'el receipt DeviceNotRegistered retira el token de la instalación');

-- ---------------------------------------------------------------------------
-- 8. Cambio de cuenta en la misma instalación, token único y revocación
-- ---------------------------------------------------------------------------
create temp table t_snap2 on commit drop as
  select id, user_id, expo_push_token, token_generation, revoked_at, permission from public.push_installations;
select public.t_as(:extra);
select public.register_push_installation(:i4, :s4, 'ExpoPushToken[extraone]', 'android', 'granted');
select public.t_as(:other);
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i4, :sbad, 'ExpoPushToken[othertwo]', 'android', 'granted'), '42501');
select public.register_push_installation(:i4, :s4, 'ExpoPushToken[othertwo]', 'android', 'granted');
reset role;
select public.t_assert((select user_id = :other and expo_push_token = 'ExpoPushToken[othertwo]' and token_generation = 2
  from public.push_installations where id = :i4), 'la misma instalación pasa a la cuenta nueva y sube de generación');
select public.t_assert((select bool_and(s.user_id = i.user_id and s.expo_push_token is not distinct from i.expo_push_token
  and s.token_generation = i.token_generation) from t_snap2 s join public.push_installations i using (id)),
  'el cambio de cuenta no afecta otras instalaciones');
-- Un token pertenece a una sola instalación.
select public.t_as(:other);
select public.register_push_installation(:i5, :s5, 'ExpoPushToken[othertwo]', 'ios', 'granted');
reset role;
select public.t_assert((select expo_push_token is null from public.push_installations where id = :i4)
  and (select expo_push_token = 'ExpoPushToken[othertwo]' from public.push_installations where id = :i5),
  'un token duplicado se mueve a la instalación que lo registra');

-- Revocación autenticada con una entrega abierta.
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :u9, 'user', false);
insert into t_alerts select requester_user_id, id from public.push_alerts
  where device_id = :d1 and event_type = 'access_request' and requester_user_id = :u9;
update public.profiles set app_preferences = jsonb_set(app_preferences, '{language}', '"es"') where id = :admin;
select public.t_svc();
create temp table t_res11 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res11 where alert_id = (select id from t_alerts where who = :u9)
  and expo_push_token = 'ExpoPushToken[adminone]' and title = 'Solicitud de acceso al equipo') = 1,
  'la solicitud de u9 sale a la instalación 1, ahora en español');
select public.t_assert((select bool_and(expo_push_token in ('ExpoPushToken[adminone]', 'ExpoPushToken[othertwo]')) from t_res11),
  'sólo salen avisos a instalaciones con token vigente (el token movido recibe los pendientes de su cuenta nueva)');
create temp table t_snap3 on commit drop as
  select id, user_id, expo_push_token, token_generation, revoked_at, permission from public.push_installations;
select public.t_as(:admin);
select public.t_fails(format('select public.revoke_push_installation(%L,%L)', :i1, :sbad), '42501');
select public.t_as(:pend);
select public.t_fails(format('select public.revoke_push_installation(%L,%L)', :i1, :s1), '42501');
select public.t_as(:admin);
select public.revoke_push_installation(:i1, :s1);
reset role;
select public.t_assert((select expo_push_token is null and permission = 'denied' and revoked_at is not null and token_generation = 2
  from public.push_installations where id = :i1), 'la revocación limpia el token y sube de generación');
select public.t_assert((select count(*) from public.push_deliveries where installation_id = :i1 and state in ('pending', 'leased')) = 0,
  'la revocación cancela las entregas abiertas');
select public.t_assert((select bool_and(s.user_id = i.user_id and s.expo_push_token is not distinct from i.expo_push_token
  and s.token_generation = i.token_generation and s.revoked_at is not distinct from i.revoked_at)
  from t_snap3 s join public.push_installations i using (id) where s.id <> :i1),
  'revocar una instalación no toca las demás');
-- Recuperación del registro: la misma cuenta vuelve a registrarse y los avisos recientes se reenvían.
select public.t_as(:admin);
select public.register_push_installation(:i1, :s1, 'ExpoPushToken[adminthree]', 'android', 'granted');
reset role;
select public.t_assert((select revoked_at is null and expo_push_token = 'ExpoPushToken[adminthree]' and token_generation = 3
  from public.push_installations where id = :i1), 're-registrar reactiva la instalación');
select public.t_svc();
create temp table t_res12 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res12) >= 2 and (select bool_and(expo_push_token = 'ExpoPushToken[adminthree]') from t_res12)
  and (select count(*) from t_res12 where alert_id = (select id from t_alerts where who = :u9)) = 1,
  'tras recuperar el registro se reenvían los avisos recientes con el token nuevo');

-- Revocación por secreto (sin sesión): no revela si la instalación existe.
select public.t_as(null, 'anon');
select public.revoke_push_installation_by_secret(:i1, :sbad);
select public.revoke_push_installation_by_secret(gen_random_uuid(), :sbad);
select public.t_fails(format('select public.revoke_push_installation_by_secret(%L,%L)', :i1, 'corto'), '22023');
select public.t_fails(format('select public.revoke_push_installation_by_secret(%L,%L)', null, :s1), '22023');
reset role;
select public.t_assert((select expo_push_token = 'ExpoPushToken[adminthree]' and revoked_at is null and token_generation = 3
  from public.push_installations where id = :i1), 'un secreto incorrecto no revoca');
create temp table t_snap4 on commit drop as
  select id, user_id, expo_push_token, token_generation, revoked_at, permission from public.push_installations;
select public.t_as(null, 'anon');
select public.revoke_push_installation_by_secret(:i1, :s1);
reset role;
select public.t_assert((select expo_push_token is null and permission = 'denied' and revoked_at is not null and token_generation = 4
  from public.push_installations where id = :i1), 'el secreto correcto revoca la instalación');
select public.t_assert((select count(*) from public.push_deliveries where installation_id = :i1 and state in ('pending', 'leased')) = 0,
  'la revocación por secreto cancela las entregas abiertas');
select public.t_assert((select bool_and(s.user_id = i.user_id and s.expo_push_token is not distinct from i.expo_push_token
  and s.token_generation = i.token_generation and s.revoked_at is not distinct from i.revoked_at)
  from t_snap4 s join public.push_installations i using (id) where s.id <> :i1),
  'la revocación por secreto no afecta otras instalaciones');
select public.t_as(:admin);
select public.revoke_push_installation_by_secret(:i1, :s1);   -- también la puede llamar authenticated; repetir es inocuo
select public.register_push_installation(:i1, :s1, 'ExpoPushToken[adminfour]', 'android', 'granted');
select public.register_push_installation(:i2, :s2, 'ExpoPushToken[admintwob]', 'ios', 'granted');
reset role;

-- ---------------------------------------------------------------------------
-- 9. Agotamiento de intentos, caducidad y horizonte de la push
-- ---------------------------------------------------------------------------
select public.t_svc();
create temp table t_res14 on commit drop as select * from public.reserve_push_deliveries(50);
select public.t_assert((select count(*) from t_res14 where alert_id = (select id from t_alerts where who = :u9)) = 2,
  'la solicitud vigente sale por las dos instalaciones vigentes del administrador');
create temp table t_max on commit drop as
  select d.id from public.push_deliveries d where d.alert_id = (select id from t_alerts where who = :u9)
    and d.installation_id = :i1;
update public.push_deliveries set state = 'leased', leased_until = now() + interval '1 minute', attempts = 1,
  lease_id = gen_random_uuid() where id = (select id from t_max);
do $$
declare v_id uuid; v_lease uuid; v_i integer; v_next timestamptz;
begin
  select id into v_id from t_max;
  for v_i in 1..5 loop
    select lease_id into v_lease from public.push_deliveries where id = v_id;
    perform public.report_push_ticket(v_id, v_lease, null, 'MessageRateExceeded');
    select next_attempt_at into v_next from public.push_deliveries where id = v_id;
    if v_i = 1 and not (v_next between now() + interval '25 seconds' and now() + interval '35 seconds') then
      raise exception 'FALLA: la primera espera debía ser de 30 s'; end if;
    if v_i = 3 and not (v_next between now() + interval '115 seconds' and now() + interval '125 seconds') then
      raise exception 'FALLA: la tercera espera debía ser de 120 s'; end if;
    if v_i < 5 then
      update public.push_deliveries set state = 'leased', lease_id = gen_random_uuid(),
        leased_until = now() + interval '1 minute', attempts = attempts + 1 where id = v_id;
    end if;
  end loop;
  if (select state from public.push_deliveries where id = v_id) <> 'failed' then
    raise exception 'FALLA: tras cinco intentos la entrega debía quedar failed'; end if;
end $$;
select public.t_assert((select count(*) from public.reserve_push_deliveries(50) where delivery_id = (select id from t_max)) = 0,
  'una entrega agotada no vuelve a reservarse');
-- Reserva vencida con los intentos agotados: no queda colgada.
update public.push_deliveries set state = 'leased', attempts = 5, leased_until = now() - interval '1 second',
  lease_id = gen_random_uuid(), last_error = null
  where alert_id = (select id from t_alerts where who = :u9) and installation_id = :i2;
select public.t_assert((select count(*) from public.reserve_push_deliveries(50) where alert_id = (select id from t_alerts where who = :u9)) = 0,
  'un lease vencido con cinco intentos no se reserva');
select public.t_assert((select state = 'failed' and last_error = 'lease_expired'
  from public.push_deliveries where alert_id = (select id from t_alerts where who = :u9) and installation_id = :i2),
  'un lease vencido con los intentos agotados pasa a failed');
-- Caducidad del evento.
update public.push_alerts set expires_at = now() - interval '1 second' where id = (select id from t_alerts where who = :u9);
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0, 'un evento vencido no se despacha');
select public.t_assert((select status = 'expired' from public.push_alerts where id = (select id from t_alerts where who = :u9)),
  'el evento vencido pasa a expired');
select public.t_as(:admin);
select public.t_assert((select status from public.list_my_notifications(100) where id = (select id from t_alerts where who = :u9)) = 'expired',
  'la bandeja informa el estado expired');
reset role;
-- Entregas pendientes de un evento que vence antes de salir: expiran.
select public.create_device_event('access_request', :d1, :admin, :u9);
create temp table t_old on commit drop as
  select id from public.push_alerts where device_id = :d1 and event_type = 'access_request' and expires_at > now() and status = 'active';
grant select on t_old to public;
select public.t_assert((select count(*) from t_old) = 1, 'existe un evento vigente para probar el horizonte');
insert into public.notification_recipients(alert_id, user_id) select id, :admin from t_old;
-- Horizonte: un evento de hace dos días sigue en la bandeja pero ya no genera push.
update public.push_alerts set created_at = now() - interval '2 days' where id in (select id from t_old);
select public.t_svc();
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0, 'un evento viejo no genera push');
select public.t_assert((select count(*) from public.push_deliveries where alert_id in (select id from t_old)) = 0,
  'un evento fuera del horizonte no crea entregas');
select public.t_as(:admin);
select public.t_assert((select count(*) from public.list_my_notifications(100) where id in (select id from t_old)) = 1,
  'pero sigue visible en la bandeja');
-- Paginación por (fecha, id).
select public.t_assert((select count(*) from public.list_my_notifications(1)) = 1, 'p_limit acota la página');
select public.t_assert((select count(*) from public.list_my_notifications(100, (select created_at from public.list_my_notifications(1)),
  (select id from public.list_my_notifications(1)))) = (select count(*) from public.list_my_notifications(100)) - 1,
  'la página siguiente excluye al último elemento entregado');
reset role;
-- Una entrega pendiente cuyo evento cumple 24 horas expira.
update public.push_alerts set created_at = now() where id in (select id from t_old);
select public.t_svc();
create temp table t_res15 on commit drop as select * from public.reserve_push_deliveries(50);
reset role;
select public.t_assert((select count(*) from t_res15 where alert_id in (select id from t_old)) >= 1, 'el evento reciente sí se despacha');
update public.push_alerts set created_at = now() - interval '25 hours' where id in (select id from t_old);
update public.push_deliveries set state = 'pending', lease_id = null, leased_until = null where alert_id in (select id from t_old);
select public.t_svc();
select public.t_assert((select count(*) from public.reserve_push_deliveries(50)) = 0, 'pasadas 24 horas la entrega pendiente no sale');
select public.t_assert((select bool_and(state = 'expired') from public.push_deliveries where alert_id in (select id from t_old)),
  'la entrega pendiente pasada de plazo queda expired');

-- ---------------------------------------------------------------------------
-- 10. Backoffice y firmware
-- ---------------------------------------------------------------------------
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :extra, 'admin', true);
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :u8, 'user', false);
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :u9, 'user', false);
select public.t_as(:staff);
select public.admin_approve_member(:d3, :u8);
select public.admin_reject_member(:d3, :u9);
reset role;
select public.t_assert((select count(*) from public.push_alerts where device_id = :d3 and event_type = 'access_approved' and user_id = :u8) = 1,
  'admin_approve_member genera un solo evento de aprobación');
select public.t_assert((select count(*) from public.push_alerts where device_id = :d3 and event_type = 'access_rejected' and user_id = :u9) = 1,
  'admin_reject_member genera un solo evento de rechazo');
select public.t_assert((select count(*) from public.push_alerts where device_id = :d3 and event_type = 'access_request' and status = 'active') = 0,
  'aprobar o rechazar desde el backoffice cancela las solicitudes');
select public.t_assert((select count(*) from public.push_alerts where device_id = :d3 and event_type = 'access_request') = 2,
  'el backoffice ya no borra los avisos de solicitud');
select public.t_as(:staff);
select public.admin_make_admin(:d3, :u8);
reset role;
select public.t_assert((select count(*) from public.push_alerts where device_id = :d3 and event_type = 'admin_transferred') = 1,
  'admin_make_admin genera un solo evento de transferencia');
insert into public.firmware_releases(version, sha256, size_bytes, storage_path, is_published, published_at)
  values ('9.9.9', repeat('a', 64), 1000, 'releases/9.9.9.bin', true, now());
insert into t_events select 'release', id from public.firmware_releases where version = '9.9.9';
select public.t_assert((select public.assign_firmware_update(:d1, r) is not null from public.firmware_releases r where version = '9.9.9'),
  'la asignación de firmware sigue funcionando');
select public.t_assert((select count(*) from public.push_alerts where event_type = 'firmware_update') = 0,
  'asignar firmware no crea invitaciones push');
select public.t_as(:staff);
select public.admin_cancel_update(:d1);
select public.t_assert((select (public.admin_send_update_all((select id from t_events where kind = 'release'))->>'sent')::int >= 1),
  'admin_send_update_all asigna sin crear avisos');
reset role;
insert into t_events select 'update_d1', id from public.device_firmware_updates where device_id = :d1 and status = 'sent';
select public.t_as(:admin);
select public.firmware_update_progress((select id from t_events where kind = 'update_d1'), 'postpone');
reset role;
select public.t_assert((select count(*) from public.push_alerts where event_type = 'firmware_update') = 0,
  'el firmware sigue sin avisos push');
select public.t_as(:staff);
select public.admin_reset_device(:d3);
reset role;
select public.t_assert((select count(*) from public.push_alerts where device_id = :d3) = 0
  and (select count(*) from public.device_members where device_id = :d3) = 0,
  'el reset elimina miembros y avisos del equipo');

-- ---------------------------------------------------------------------------
-- 11. Guardia de eventos retirados
-- ---------------------------------------------------------------------------
select public.t_fails(format('insert into public.push_alerts(device_id,user_id,title,body,category,severity,event_type) values (%L,%L,%L,%L,%L,%L,%L)',
  :d1, :admin, 'Suelo', 'Crítico', 'agronomic', 'high', null), '23514');
select public.t_fails(format('insert into public.push_alerts(device_id,user_id,title,body,category,severity,event_type) values (%L,%L,%L,%L,%L,%L,%L)',
  :d1, :admin, 'Firmware', 'Instala', 'device', 'medium', 'firmware_update'), '23514');
select public.t_fails(format('insert into public.push_alerts(device_id,user_id,title,body,category,severity,event_type) values (%L,%L,%L,%L,%L,%L,%L)',
  :d1, :admin, 'Clima', 'Helada', 'weather', 'medium', 'access_request'), '23514');
select public.t_as(null, 'service_role');
select public.t_fails(format('insert into public.push_alerts(device_id,user_id,title,body,category,severity,event_type) values (%L,%L,%L,%L,%L,%L,%L)',
  :d1, :admin, 'Suelo', 'Crítico', 'agronomic', 'high', 'soil_critical'), '23514');
reset role;

-- ---------------------------------------------------------------------------
-- 12. Permisos: los usuarios sólo usan las RPC
-- ---------------------------------------------------------------------------
-- Nota: la imagen local de Postgres de Supabase se cae (segfault) al informar «permission
-- denied for function». Por eso el EXECUTE se comprueba con has_function_privilege y no
-- llamando a la función; los permisos sobre tablas sí se prueban con consultas reales.
select public.t_assert((select bool_and(not has_table_privilege(r, t, p))
  from unnest(array['anon', 'authenticated']) r, unnest(array['public.push_alerts', 'public.push_installations',
    'public.notification_recipients', 'public.push_deliveries']) t,
    unnest(array['select', 'insert', 'update', 'delete']) p),
  'anon y authenticated no tienen privilegios sobre las tablas de avisos');
select public.t_assert((select bool_and(relrowsecurity) from pg_class where oid in ('public.push_alerts'::regclass,
  'public.push_installations'::regclass, 'public.notification_recipients'::regclass, 'public.push_deliveries'::regclass)),
  'las cuatro tablas tienen RLS activado');
select public.t_assert((select count(*) from pg_policies where tablename in ('push_alerts', 'push_installations',
  'notification_recipients', 'push_deliveries')) = 0, 'no quedan políticas de lectura directa');
select public.t_assert((select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (
   'register_push_installation', 'revoke_push_installation', 'revoke_push_installation_by_secret',
   'list_my_notifications', 'get_my_notification', 'mark_notification_read', 'reserve_push_deliveries',
   'report_push_ticket', 'reserve_push_receipts', 'report_push_receipt', 'notification_copy',
   'notification_access_allowed', 'notification_dispatch_allowed', 'invoke_push_dispatch', 'create_device_event',
   'resolve_access_requests', 'record_admin_transfer', 'notify_device_membership', 'guard_push_alert_event')) = 19,
  'existen las 19 funciones del sistema de avisos');
select public.t_assert((select bool_and(
     has_function_privilege('authenticated', p.oid, 'execute') = (p.proname in
       ('register_push_installation', 'revoke_push_installation', 'revoke_push_installation_by_secret',
        'list_my_notifications', 'get_my_notification', 'mark_notification_read'))
 and has_function_privilege('anon', p.oid, 'execute') = (p.proname = 'revoke_push_installation_by_secret')
 and has_function_privilege('service_role', p.oid, 'execute') = (p.proname in ('reserve_push_deliveries',
       'report_push_ticket', 'reserve_push_receipts', 'report_push_receipt'))
 and not has_function_privilege('public', p.oid, 'execute'))
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (
   'register_push_installation', 'revoke_push_installation', 'revoke_push_installation_by_secret',
   'list_my_notifications', 'get_my_notification', 'mark_notification_read', 'reserve_push_deliveries',
   'report_push_ticket', 'reserve_push_receipts', 'report_push_receipt', 'notification_copy',
   'notification_access_allowed', 'notification_dispatch_allowed', 'invoke_push_dispatch', 'create_device_event',
   'resolve_access_requests', 'record_admin_transfer', 'notify_device_membership', 'guard_push_alert_event')),
  'las funciones nuevas sólo se ejecutan por quien corresponde');
select public.t_as(:admin);
select public.t_fails('select * from public.push_alerts', '42501');
select public.t_fails('select * from public.push_installations', '42501');
select public.t_fails('select * from public.notification_recipients', '42501');
select public.t_fails('select * from public.push_deliveries', '42501');
select public.t_fails('update public.push_alerts set status = ''active''', '42501');
select public.t_as(null, 'anon');
select public.t_fails('select * from public.push_alerts', '42501');
select public.t_fails('select * from public.push_installations', '42501');
reset role;
-- Sin el rol de servicio en el token, el despachador tampoco entra.
select set_config('request.jwt.claims', '', true);
select public.t_fails('select * from public.reserve_push_deliveries(10)', '42501');
select public.t_fails('select public.report_push_receipt(gen_random_uuid(), gen_random_uuid(), ''ok'')', '42501');

-- Un usuario ajeno no lee ni marca avisos.
select public.t_as(:stranger);
select public.t_assert((select count(*) from public.list_my_notifications(100)) = 0, 'un ajeno no ve avisos');
select public.t_assert((select count(*) from public.get_my_notification((select id from t_events where kind = 'req_pend'))) = 0,
  'un ajeno no obtiene un aviso por su ID');
select public.t_fails(format('select public.mark_notification_read(%L)', (select id from t_events where kind = 'req_pend')), '42501');
reset role;

-- ---------------------------------------------------------------------------
-- 13. Cron, Vault y despertar inmediato
-- ---------------------------------------------------------------------------
select public.t_assert((select count(*) from cron.job where jobname = 'terrasense-push-dispatch'
  and schedule = '* * * * *' and command like '%invoke_push_dispatch%' and active) = 1,
  'el cron de recuperación está programado cada minuto');
create temp table t_queue on commit drop as select count(*) as n from net.http_request_queue;
select public.invoke_push_dispatch();
select public.t_assert((select count(*) from net.http_request_queue) = (select n from t_queue),
  'sin secretos en Vault el cron no llama a nada');
select vault.create_secret('https://ejemplo.test/functions/v1/send-push-alert', 'push_dispatch_url');
select public.invoke_push_dispatch();
select public.t_assert((select count(*) from net.http_request_queue) = (select n from t_queue),
  'con un solo secreto tampoco llama');
select vault.create_secret('clave-de-servicio-de-prueba', 'push_dispatch_service_role_key');
select public.invoke_push_dispatch();
select public.t_assert((select count(*) from net.http_request_queue) = (select n from t_queue) + 1
  and (select count(*) from net.http_request_queue where url = 'https://ejemplo.test/functions/v1/send-push-alert'
    and headers->>'Authorization' = 'Bearer clave-de-servicio-de-prueba') = 1,
  'con ambos secretos llama a la URL con la clave de servicio de Vault');
select public.t_assert(pg_get_functiondef('public.invoke_push_dispatch'::regproc) !~ 'eyJ',
  'la migración no incrusta ninguna clave');
-- Un evento nuevo despierta al despachador sin esperar al cron.
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d1, :stranger, 'user', false);
select public.t_assert((select count(*) from net.http_request_queue) = (select n from t_queue) + 2,
  'una solicitud nueva despierta al despachador (una sola llamada)');
select public.t_assert((select count(*) from cron.job where jobname = 'terrasense-push-retention'
  and schedule = '17 3 * * *' and command like '%purge_push_notifications%' and active) = 1,
  'la retención está programada una vez al día');

-- ---------------------------------------------------------------------------
-- 14. Errores de Expo: clasificación por ticket y por receipt
-- ---------------------------------------------------------------------------
-- Cada caso crea su propio evento y entrega en el estado que corresponde (t_delivery) y los
-- resuelve con las funciones reales. Los códigos son los mismos de dispatch.mjs (EXPO_ERRORS).
create function public.t_delivery(p_installation uuid, p_state text default 'leased',
  p_attempts integer default 1, p_ticket text default null)
returns table(delivery_id uuid, lease_id uuid, alert_id uuid)
language plpgsql as $$
declare v_alert uuid; v_user uuid; v_gen bigint; v_lease uuid := gen_random_uuid(); v_id uuid;
begin
  select user_id, token_generation into v_user, v_gen from public.push_installations where id = p_installation;
  insert into public.push_alerts(device_id, user_id, title, body, category, severity, event_type)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', v_user, 't', 't', 'device', 'medium', 'access_approved')
    returning id into v_alert;
  insert into public.notification_recipients(alert_id, user_id) values (v_alert, v_user);
  insert into public.push_deliveries(alert_id, user_id, installation_id, token_generation, state, attempts,
      lease_id, leased_until, ticket_id, ticket_at)
    values (v_alert, v_user, p_installation, v_gen, p_state, p_attempts, v_lease, now() + interval '1 minute',
      p_ticket, case when p_ticket is not null then now() end)
    returning id into v_id;
  return query select v_id, v_lease, v_alert;
end $$;
grant execute on function public.t_delivery(uuid, text, integer, text) to public, anon, authenticated, service_role;

select public.t_assert((select bool_and(public.push_error_class(c) = e) from (values
    ('DeviceNotRegistered', 'invalid_token'),
    ('MessageTooBig', 'permanent'), ('InvalidCredentials', 'permanent'), ('MismatchSenderId', 'permanent'),
    ('permanent:Expo HTTP 401', 'permanent'), ('permanent:expired', 'permanent'),
    ('MessageRateExceeded', 'transient'), ('ExpoServerError', 'transient'), ('ServiceUnavailable', 'transient'),
    ('Expo HTTP 429', 'transient'), ('Expo HTTP 503', 'transient'), ('uncertain:timeout', 'transient'),
    ('uncertain:sin_ticket', 'transient'), ('CodigoNuevoDeExpo', 'transient'), (null, 'transient')
  ) v(c, e)), 'push_error_class clasifica igual que dispatch.mjs');

select public.t_svc();
do $$
declare d record; r record; v_next interval;
begin
  -- Ticket con error permanente: la entrega falla y no vuelve a la cola ni toca el token.
  for r in select * from (values ('InvalidCredentials'), ('MessageTooBig'), ('MismatchSenderId'),
      ('permanent:Expo HTTP 401'), ('permanent:Expo HTTP 400')) c(code) loop
    select * into d from public.t_delivery('aaaaaaaa-1111-4111-8111-111111111111');
    perform public.report_push_ticket(d.delivery_id, d.lease_id, null, r.code);
    if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'failed'
        and last_error = r.code and ticket_id is null and lease_id is null) then
      raise exception 'FALLA: el error permanente % debía dejar la entrega en failed', r.code; end if;
  end loop;
  if not exists (select 1 from public.push_installations where id = 'aaaaaaaa-1111-4111-8111-111111111111'
      and expo_push_token is not null) then
    raise exception 'FALLA: un error permanente del ticket no debe retirar el token'; end if;
  -- Ticket con error transitorio: vuelve a pending con espera creciente, sin ticket.
  for r in select * from (values ('MessageRateExceeded'), ('ExpoServerError'), ('ServiceUnavailable'),
      ('Expo HTTP 429'), ('Expo HTTP 503'), ('uncertain:timeout'), ('uncertain:sin_ticket'),
      ('CodigoNuevoDeExpo')) c(code) loop
    select * into d from public.t_delivery('aaaaaaaa-1111-4111-8111-111111111111', 'leased', 2);
    perform public.report_push_ticket(d.delivery_id, d.lease_id, null, r.code);
    if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'pending'
        and last_error = r.code and ticket_id is null and lease_id is null
        and next_attempt_at between now() + interval '55 seconds' and now() + interval '65 seconds') then
      raise exception 'FALLA: el error transitorio % debía reprogramar con 60 s (segundo intento)', r.code; end if;
    -- Agotados los cinco intentos ya no se reintenta.
    select * into d from public.t_delivery('aaaaaaaa-1111-4111-8111-111111111111', 'leased', 5);
    perform public.report_push_ticket(d.delivery_id, d.lease_id, null, r.code);
    if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'failed'
        and last_error = r.code) then
      raise exception 'FALLA: el error transitorio % debía fallar tras cinco intentos', r.code; end if;
  end loop;
  -- Vencido antes de salir.
  select * into d from public.t_delivery('aaaaaaaa-1111-4111-8111-111111111111');
  perform public.report_push_ticket(d.delivery_id, d.lease_id, null, 'permanent:expired');
  if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'expired') then
    raise exception 'FALLA: permanent:expired debía dejar la entrega en expired'; end if;
  -- Un error sin código nunca deja la entrega sin resolver.
  select * into d from public.t_delivery('aaaaaaaa-1111-4111-8111-111111111111');
  perform public.report_push_ticket(d.delivery_id, d.lease_id, null, null);
  if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'pending'
      and last_error = 'Error de Expo') then
    raise exception 'FALLA: un ticket sin código debía reintentarse'; end if;
end $$;

-- Ticket con DeviceNotRegistered: la entrega falla y el token sólo se retira si la generación coincide.
create temp table t_dnr on commit drop as
  select t.delivery_id, t.lease_id,
    (select token_generation from public.push_installations where id = :i1) as gen
  from public.t_delivery(:i1) t;
select public.report_push_ticket(delivery_id, lease_id, null, 'DeviceNotRegistered') from t_dnr;  -- sin el indicador: la base lo deduce del código
select public.t_assert((select state = 'failed' and last_error = 'DeviceNotRegistered' from public.push_deliveries
  where id = (select delivery_id from t_dnr)), 'DeviceNotRegistered del ticket cierra la entrega');
select public.t_assert((select expo_push_token is null and token_generation = (select gen from t_dnr) + 1
  from public.push_installations where id = :i1), 'y retira el token aunque no llegue el indicador');
create temp table t_dnr2 on commit drop as select t.delivery_id, t.lease_id from public.t_delivery(:i2) t;
update public.push_installations set token_generation = token_generation + 1 where id = :i2;
create temp table t_gen2 on commit drop as select token_generation as gen from public.push_installations where id = :i2;
select public.report_push_ticket(delivery_id, lease_id, null, 'DeviceNotRegistered', true) from t_dnr2;
select public.t_assert((select expo_push_token is not null and token_generation = (select gen from t_gen2)
  from public.push_installations where id = :i2),
  'con una generación más nueva el DeviceNotRegistered antiguo no retira el token');

-- Receipts: ok, sin receipt, error transitorio, error permanente y token inválido.
do $$
declare d record; r record;
begin
  perform public.t_svc();
  select * into d from public.t_delivery('aaaaaaaa-2222-4222-8222-222222222222', 'receipt_leased', 1, 'TICKET-R1');
  perform public.report_push_receipt(d.delivery_id, d.lease_id, 'ok');
  if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'delivered'
      and ticket_id = 'TICKET-R1' and receipt_checked_at is not null) then
    raise exception 'FALLA: receipt ok debía dejar delivered'; end if;
  select * into d from public.t_delivery('aaaaaaaa-2222-4222-8222-222222222222', 'receipt_leased', 1, 'TICKET-R2');
  perform public.report_push_receipt(d.delivery_id, d.lease_id, 'retry');
  if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'ticket_ok'
      and ticket_id = 'TICKET-R2' and next_attempt_at between now() + interval '14 minutes' and now() + interval '16 minutes') then
    raise exception 'FALLA: sin receipt debía conservar el ticket y esperar 15 minutos'; end if;
  -- Error transitorio del proveedor: no llegó, se reenvía como envío nuevo (sin ticket).
  for r in select * from (values ('MessageRateExceeded'), ('ExpoServerError'), ('ServiceUnavailable'),
      ('CodigoNuevoDeExpo')) c(code) loop
    select * into d from public.t_delivery('aaaaaaaa-2222-4222-8222-222222222222', 'receipt_leased', 1, 'TICKET-R3');
    perform public.report_push_receipt(d.delivery_id, d.lease_id, 'error', r.code);
    if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'pending'
        and ticket_id is null and last_error = r.code and receipt_checked_at is not null
        and next_attempt_at between now() + interval '25 seconds' and now() + interval '35 seconds') then
      raise exception 'FALLA: el receipt con error transitorio % debía reenviarse con 30 s', r.code; end if;
    select * into d from public.t_delivery('aaaaaaaa-2222-4222-8222-222222222222', 'receipt_leased', 5, 'TICKET-R4');
    perform public.report_push_receipt(d.delivery_id, d.lease_id, 'error', r.code);
    if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'failed'
        and last_error = r.code) then
      raise exception 'FALLA: el receipt transitorio % debía fallar al quinto intento', r.code; end if;
  end loop;
  -- Error permanente: falla, se conserva el ticket como evidencia y no se reenvía.
  for r in select * from (values ('MessageTooBig'), ('InvalidCredentials'), ('MismatchSenderId')) c(code) loop
    select * into d from public.t_delivery('aaaaaaaa-2222-4222-8222-222222222222', 'receipt_leased', 1, 'TICKET-R5');
    perform public.report_push_receipt(d.delivery_id, d.lease_id, 'error', r.code);
    if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'failed'
        and last_error = r.code and ticket_id = 'TICKET-R5') then
      raise exception 'FALLA: el receipt permanente % debía dejar failed', r.code; end if;
  end loop;
  if not exists (select 1 from public.push_installations where id = 'aaaaaaaa-2222-4222-8222-222222222222'
      and expo_push_token is not null) then
    raise exception 'FALLA: un error permanente del receipt no debe retirar el token'; end if;
  -- Un lease ajeno no cambia nada.
  select * into d from public.t_delivery('aaaaaaaa-2222-4222-8222-222222222222', 'receipt_leased', 1, 'TICKET-R6');
  perform public.report_push_receipt(d.delivery_id, gen_random_uuid(), 'error', 'MessageTooBig');
  if not exists (select 1 from public.push_deliveries where id = d.delivery_id and state = 'receipt_leased') then
    raise exception 'FALLA: un lease ajeno no debe resolver el receipt'; end if;
end $$;
-- Receipt con DeviceNotRegistered: falla y retira el token de la instalación (i2, con su generación vigente).
create temp table t_rdnr on commit drop as
  select t.delivery_id, t.lease_id,
    (select token_generation from public.push_installations where id = :i2) as gen
  from public.t_delivery(:i2, 'receipt_leased', 1, 'TICKET-R7') t;
select public.report_push_receipt(delivery_id, lease_id, 'error', 'DeviceNotRegistered') from t_rdnr;
select public.t_assert((select state = 'failed' and last_error = 'DeviceNotRegistered' from public.push_deliveries
  where id = (select delivery_id from t_rdnr))
  and (select expo_push_token is null and token_generation = (select gen from t_rdnr) + 1
    from public.push_installations where id = :i2),
  'el receipt DeviceNotRegistered falla la entrega y retira el token vigente');

-- Resultado incierto: se reintenta, pero un ticket aceptado no vuelve a salir y un ticket tardío no pisa al vigente.
select public.t_as(:admin);
select public.register_push_installation(:i1, :s1, 'ExpoPushToken[adminfive]', 'android', 'granted');
reset role;
select public.t_svc();
create temp table t_unc on commit drop as select t.delivery_id, t.lease_id from public.t_delivery(:i1) t;
select public.report_push_ticket(delivery_id, lease_id, null, 'uncertain:timeout') from t_unc;
select public.t_assert((select state = 'pending' and ticket_id is null and last_error = 'uncertain:timeout' and attempts = 1
  from public.push_deliveries where id = (select delivery_id from t_unc)),
  'un resultado incierto no registra ticket ni recepción: queda pendiente con su causa');
update public.push_deliveries set next_attempt_at = now() where id = (select delivery_id from t_unc);
create temp table t_unc2 on commit drop as
  select * from public.reserve_push_deliveries(100) where delivery_id = (select delivery_id from t_unc);
select public.t_assert((select count(*) from t_unc2) = 1 and (select attempts from public.push_deliveries
  where id = (select delivery_id from t_unc)) = 2, 'tras la espera vuelve a salir, con un intento más');
select public.report_push_ticket((select delivery_id from t_unc2), (select lease_id from t_unc2), 'TICKET-NUEVO');
select public.report_push_ticket((select delivery_id from t_unc), (select lease_id from t_unc), 'TICKET-VIEJO');  -- lease anterior
select public.t_assert((select state = 'ticket_ok' and ticket_id = 'TICKET-NUEVO'
  from public.push_deliveries where id = (select delivery_id from t_unc)),
  'el ticket de un lease reemplazado se ignora y no pisa al vigente');
update public.push_deliveries set next_attempt_at = now() - interval '1 hour', leased_until = now() - interval '1 hour'
  where id = (select delivery_id from t_unc);
select public.t_assert((select count(*) from public.reserve_push_deliveries(100) where delivery_id = (select delivery_id from t_unc)) = 0,
  'una entrega con ticket aceptado no se reenvía');
update public.push_deliveries set state = 'pending', lease_id = null where id = (select delivery_id from t_unc);
select public.t_assert((select count(*) from public.reserve_push_deliveries(100) where delivery_id = (select delivery_id from t_unc)) = 0,
  'ni siquiera si por error volviera a pending con el ticket guardado');

-- ---------------------------------------------------------------------------
-- 15. Vigencia enviada a Expo y cancelación con envíos en curso
-- ---------------------------------------------------------------------------
-- Equipo d3 (vaciado por el reset): administrador extra con teléfono i6 y cuatro solicitantes.
\set i6 '''aaaaaaaa-6666-4666-8666-666666666666''::uuid'
\set s6 'repeat(''f'',40)'
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :extra, 'admin', true);
select public.t_as(:extra);
select public.register_push_installation(:i6, :s6, 'ExpoPushToken[extrasix]', 'android', 'granted');
reset role;
update public.profiles set app_preferences = jsonb_set(app_preferences, '{notifications,device}', 'true') where id = :extra;
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :u8, 'user', false);
select public.t_svc();
create temp table t_ttl1 on commit drop as
  select * from public.reserve_push_deliveries(100) where device_id = :d3;
select public.t_assert((select count(*) from t_ttl1) = 1
  and (select expires_at between now() + interval '23 hours 59 minutes' and now() + interval '24 hours 1 minute' from t_ttl1),
  'la vigencia enviada a Expo es la del horizonte de 24 h cuando el evento dura 30 días');
-- Un evento que vence antes: la vigencia enviada es lo que le queda, no un plazo nuevo.
update public.push_alerts set expires_at = now() + interval '10 minutes' where id = (select alert_id from t_ttl1);
update public.push_deliveries set state = 'pending', lease_id = null, leased_until = null, next_attempt_at = now()
  where id = (select delivery_id from t_ttl1);
create temp table t_ttl2 on commit drop as
  select * from public.reserve_push_deliveries(100) where device_id = :d3;
select public.t_assert((select count(*) from t_ttl2) = 1
  and (select expires_at between now() + interval '9 minutes 30 seconds' and now() + interval '10 minutes 30 seconds' from t_ttl2),
  'un evento que vence en 10 minutos sale a Expo con esa vigencia restante');

-- Preferencia apagada con el envío reservado: se cancela y el ticket tardío no lo revive.
update public.profiles set app_preferences = jsonb_set(app_preferences, '{notifications,device}', 'false') where id = :extra;
select public.reserve_push_deliveries(100);
select public.t_assert((select state = 'cancelled' and last_error = 'preference_disabled' from public.push_deliveries
  where id = (select delivery_id from t_ttl2)), 'apagar la preferencia cancela el envío en curso');
select public.report_push_ticket((select delivery_id from t_ttl2), (select lease_id from t_ttl2), 'TICKET-TARDIO-1');
select public.t_assert((select state = 'cancelled' and ticket_id is null from public.push_deliveries
  where id = (select delivery_id from t_ttl2)), 'el ticket que llega tarde a una entrega cancelada se ignora');
update public.profiles set app_preferences = jsonb_set(app_preferences, '{notifications,device}', 'true') where id = :extra;

-- Permiso retirado con el envío reservado (desde la app: el teléfono se vuelve a registrar sin permiso).
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :u9, 'user', false);
select public.t_svc();
create temp table t_perm on commit drop as
  select * from public.reserve_push_deliveries(100) where device_id = :d3;
select public.t_assert((select count(*) from t_perm) = 1, 'la solicitud de u9 sale al teléfono de extra');
select public.t_as(:extra);
select public.register_push_installation(:i6, :s6, null, 'android', 'denied');
reset role;
select public.t_assert((select state = 'cancelled' from public.push_deliveries where id = (select delivery_id from t_perm)),
  'quitar el permiso cancela el envío en curso');
select public.t_svc();
select public.report_push_ticket((select delivery_id from t_perm), (select lease_id from t_perm), 'TICKET-TARDIO-2');
select public.t_assert((select state = 'cancelled' and ticket_id is null from public.push_deliveries
  where id = (select delivery_id from t_perm)), 'ni el permiso retirado ni el ticket tardío reviven el envío');
select public.t_as(:extra);
select public.register_push_installation(:i6, :s6, 'ExpoPushToken[extraseven]', 'android', 'granted');
reset role;

-- Permiso revocado por otra vía (estado de la instalación): el mantenimiento de la reserva lo cancela.
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :stranger, 'user', false);
select public.t_svc();
create temp table t_perm2 on commit drop as
  select * from public.reserve_push_deliveries(100) where device_id = :d3 and alert_id in (
    select id from public.push_alerts where requester_user_id = :stranger);
select public.t_assert((select count(*) from t_perm2) = 1, 'la solicitud de stranger sale al teléfono de extra');
update public.push_installations set permission = 'denied' where id = :i6;
select public.reserve_push_deliveries(100);
select public.t_assert((select state = 'cancelled' from public.push_deliveries where id = (select delivery_id from t_perm2)),
  'el mantenimiento cancela el envío cuya instalación perdió el permiso');
update public.push_installations set permission = 'granted' where id = :i6;

-- Membresía: aprobar la solicitud cancela el envío en curso; transferir la administración cancela los del administrador anterior.
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :u7, 'user', false);
insert into public.device_members(device_id, user_id, role, is_authorized) values (:d3, :pend, 'user', false);
update public.push_deliveries set next_attempt_at = now() where installation_id = :i6 and state = 'pending';
select public.t_svc();
create temp table t_mem on commit drop as
  select r.*, a.requester_user_id from public.reserve_push_deliveries(100) r
    join public.push_alerts a on a.id = r.alert_id where r.device_id = :d3 and a.event_type = 'access_request';
select public.t_assert((select count(*) from t_mem where requester_user_id in (:u7, :pend)) = 2,
  'las solicitudes de u7 y pend salen al teléfono de extra');
select public.t_as(:extra);
select public.manage_device_member(:d3, :u7, 'authorize');
reset role;
select public.t_assert((select bool_and(d.state = 'cancelled') from public.push_deliveries d
  where d.id in (select delivery_id from t_mem where requester_user_id = :u7)),
  'aprobar la solicitud cancela su envío en curso');
select public.t_svc();
select public.report_push_ticket(delivery_id, lease_id, 'TICKET-TARDIO-3') from t_mem where requester_user_id = :u7;
select public.t_assert((select bool_and(d.state = 'cancelled' and d.ticket_id is null) from public.push_deliveries d
  where d.id in (select delivery_id from t_mem where requester_user_id = :u7)),
  'el ticket tardío de una solicitud aprobada se ignora');
select public.t_assert((select state = 'leased' from public.push_deliveries
  where id = (select delivery_id from t_mem where requester_user_id = :pend)),
  'la solicitud que sigue pendiente conserva su envío en curso');
select public.t_as(:extra);
select public.manage_device_member(:d3, :u7, 'transfer_owner');
reset role;
select public.t_assert((select state = 'cancelled' from public.push_deliveries
  where id = (select delivery_id from t_mem where requester_user_id = :pend)),
  'transferir la administración cancela el envío del administrador anterior');
select public.t_svc();
select public.report_push_ticket(delivery_id, lease_id, 'TICKET-TARDIO-4') from t_mem where requester_user_id = :pend;
select public.t_assert((select state = 'cancelled' and ticket_id is null from public.push_deliveries
  where id = (select delivery_id from t_mem where requester_user_id = :pend)),
  'el ticket tardío del administrador anterior se ignora');
select public.t_assert((select cancelled_at is not null from public.notification_recipients r
  where r.alert_id = (select alert_id from t_mem where requester_user_id = :pend) and r.user_id = :extra),
  'la solicitud pendiente deja de ser del administrador anterior');

-- ---------------------------------------------------------------------------
-- 16. Supervisión y retención
-- ---------------------------------------------------------------------------
select public.t_assert((select bool_and(
     has_function_privilege('service_role', p.oid, 'execute') = (p.proname in ('push_dispatch_health', 'purge_push_notifications'))
 and not has_function_privilege('anon', p.oid, 'execute')
 and not has_function_privilege('authenticated', p.oid, 'execute')
 and not has_function_privilege('public', p.oid, 'execute'))
  from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('push_dispatch_health', 'purge_push_notifications', 'push_error_class')),
  'supervisión, retención y clasificación no son ejecutables por anon ni authenticated');
select set_config('request.jwt.claims', '', true);
select public.t_fails('select * from public.push_dispatch_health()', '42501');
select public.t_svc();

-- Sin los secretos de Vault el despacho está sin configurar.
delete from vault.secrets where name in ('push_dispatch_url', 'push_dispatch_service_role_key');
select public.t_assert((select not vault_configured from public.push_dispatch_health()), 'la supervisión detecta que falta Vault');
select vault.create_secret('https://ejemplo.test/functions/v1/send-push-alert', 'push_dispatch_url');
select vault.create_secret('clave-de-servicio-de-prueba', 'push_dispatch_service_role_key');
select public.t_assert((select vault_configured from public.push_dispatch_health()), 'con ambos secretos figura configurado');

-- Estados conocidos sobre las instalaciones que quedan con token (i5 y i6).
create temp table t_h0 on commit drop as select * from public.push_dispatch_health();
create temp table t_hq on commit drop as
  select delivery_id from public.t_delivery(:i5, 'pending', 0)
  union all select delivery_id from public.t_delivery(:i5, 'pending', 0);
update public.push_deliveries set next_attempt_at = now() - interval '3 hours' where id in (select delivery_id from t_hq);
create temp table t_hl on commit drop as select delivery_id from public.t_delivery(:i5, 'leased', 1);
update public.push_deliveries set leased_until = now() - interval '5 minutes' where id in (select delivery_id from t_hl);
create temp table t_hf on commit drop as
  select delivery_id, 'InvalidCredentials'::text as code from public.t_delivery(:i5, 'leased', 1)
  union all select delivery_id, 'permanent:Expo HTTP 401' from public.t_delivery(:i5, 'leased', 1);
update public.push_deliveries set state = 'failed', last_error = t.code from t_hf t where id = t.delivery_id;
create temp table t_hu on commit drop as select delivery_id from public.t_delivery(:i5, 'pending', 2);
update public.push_deliveries set last_error = 'uncertain:timeout', next_attempt_at = now() + interval '1 hour'
  where id in (select delivery_id from t_hu);
create temp table t_ht on commit drop as select delivery_id from public.t_delivery(:i5, 'ticket_ok', 1, 'TICKET-H');
update public.push_deliveries set ticket_at = now() - interval '2 hours' where id in (select delivery_id from t_ht);
create temp table t_h1 on commit drop as select * from public.push_dispatch_health();
select public.t_assert((select h1.queue_ready = h0.queue_ready + 2 and h1.queue_oldest_age >= interval '3 hours'
    and h1.leased = h0.leased + 1 and h1.leases_expired = h0.leases_expired + 1
    and h1.retrying = h0.retrying + 1
  from t_h1 h1, t_h0 h0), 'la cola informa listas, antigüedad, reservas y reservas vencidas');
select public.t_assert((select h1.failed_24h = h0.failed_24h + 2
    and coalesce((h1.failures_by_error->>'InvalidCredentials')::int, 0) = coalesce((h0.failures_by_error->>'InvalidCredentials')::int, 0) + 1
    and coalesce((h1.failures_by_error->>'permanent:Expo HTTP 401')::int, 0) = coalesce((h0.failures_by_error->>'permanent:Expo HTTP 401')::int, 0) + 1
    and h1.uncertain_24h = h0.uncertain_24h + 1
  from t_h1 h1, t_h0 h0), 'los fallos y los resultados inciertos se cuentan por causa');
select public.t_assert((select h1.awaiting_receipt = h0.awaiting_receipt + 1 and h1.receipts_overdue = h0.receipts_overdue + 1
    and h1.oldest_ticket_age >= interval '2 hours' and h1.last_ticket_at is not null
  from t_h1 h1, t_h0 h0), 'los tickets sin receipt y los atrasados se cuentan');
-- Última ejecución de las tareas (con filas futuras para que ganen a las ejecuciones reales).
-- (El rol de la prueba no puede usar la secuencia de cron: el runid se da a mano.)
insert into cron.job_run_details(runid, jobid, database, username, command, status, start_time, end_time)
  select 9000000001, jobid, 'postgres', 'postgres', command, 'succeeded', now() + interval '1 hour', now() + interval '1 hour' from cron.job
    where jobname = 'terrasense-push-dispatch';
insert into cron.job_run_details(runid, jobid, database, username, command, status, start_time, end_time)
  select 9000000002, jobid, 'postgres', 'postgres', command, 'failed', now() + interval '1 hour', now() + interval '1 hour' from cron.job
    where jobname = 'terrasense-push-retention';
select public.t_assert((select dispatch_last_status = 'succeeded' and dispatch_last_run > now() and retention_last_status = 'failed'
    and retention_last_run > now() from public.push_dispatch_health()),
  'la supervisión informa la última ejecución del despacho y de la retención');

-- Retención: eventos vencidos con sus entregas, instalaciones abandonadas y bitácora de cron antigua.
create temp table t_pold on commit drop as select t.alert_id, t.delivery_id from public.t_delivery(:i5, 'pending', 0) t;
update public.push_alerts set expires_at = now() - interval '1 hour', status = 'expired'
  where id = (select alert_id from t_pold);
create temp table t_pkeep on commit drop as select t.alert_id, t.delivery_id from public.t_delivery(:i5, 'pending', 0) t;
insert into public.push_installations(id, user_id, secret_hash, platform, permission, updated_at) values
  ('aaaaaaaa-7777-4777-8777-777777777777', :other, repeat('1', 64), 'android', 'denied', now() - interval '31 days'),
  ('aaaaaaaa-8888-4888-8888-888888888888', :other, repeat('2', 64), 'android', 'denied', now() - interval '2 days');
insert into public.push_installations(id, user_id, secret_hash, platform, permission, expo_push_token, updated_at) values
  ('aaaaaaaa-9999-4999-8999-999999999999', :other, repeat('3', 64), 'android', 'granted', 'ExpoPushToken[vieja]', now() - interval '90 days');
select cron.schedule('t-otra-tarea', '0 0 1 1 *', 'select 1');
insert into cron.job_run_details(runid, jobid, database, username, command, status, start_time, end_time)
  select 9000000010 + row_number() over (), jobid, 'postgres', 'postgres', 'x', 'succeeded', now() - interval '8 days', now() - interval '8 days' from cron.job
    where jobname in ('terrasense-push-dispatch', 't-otra-tarea');
create temp table t_purge on commit drop as select * from public.purge_push_notifications();
select public.t_assert((select alerts_deleted >= 1 and installations_deleted = 1 and job_runs_deleted >= 1 from t_purge),
  'la retención informa lo borrado');
select public.t_assert(not exists (select 1 from public.push_alerts where id = (select alert_id from t_pold))
  and not exists (select 1 from public.notification_recipients where alert_id = (select alert_id from t_pold))
  and not exists (select 1 from public.push_deliveries where id = (select delivery_id from t_pold)),
  'el evento vencido se borra con sus destinatarios y entregas');
select public.t_assert(exists (select 1 from public.push_alerts where id = (select alert_id from t_pkeep))
  and exists (select 1 from public.push_deliveries where id = (select delivery_id from t_pkeep)),
  'el evento vigente y su entrega se conservan');
select public.t_assert(not exists (select 1 from public.push_installations where id = 'aaaaaaaa-7777-4777-8777-777777777777')
  and exists (select 1 from public.push_installations where id = 'aaaaaaaa-8888-4888-8888-888888888888')
  and exists (select 1 from public.push_installations where id = 'aaaaaaaa-9999-4999-8999-999999999999'),
  'sólo se borra la instalación sin token y sin actividad en 30 días');
select public.t_assert(not exists (select 1 from cron.job_run_details r join cron.job j using (jobid)
    where j.jobname = 'terrasense-push-dispatch' and r.start_time < now() - interval '7 days')
  and exists (select 1 from cron.job_run_details r join cron.job j using (jobid)
    where j.jobname = 't-otra-tarea' and r.start_time < now() - interval '7 days'),
  'la bitácora de cron se limpia sólo para las tareas de avisos');

-- Recuperación: dos sesiones del mismo usuario, JWT antiguo aún firmado y leases abiertos.
insert into auth.sessions(id, user_id, created_at)
  values ('11111111-1111-4111-8111-111111111112', :admin, now() - interval '1 minute');
select public.t_as(:admin);
select public.register_push_installation(:i1, :s1, 'ExpoPushToken[recoveryone]', 'android', 'granted');
select set_config('request.jwt.claims', json_build_object('sub', :admin, 'role', 'authenticated',
  'session_id', '11111111-1111-4111-8111-111111111112')::text, true);
select public.register_push_installation(:i2, :s2, 'ExpoPushToken[recoverytwo]', 'ios', 'granted');
reset role;
select public.t_assert((select session_id = '11111111-1111-4111-8111-111111111112'::uuid
  from public.push_installations where id = :i2), 'la instalación identifica la sesión autenticada');
update public.push_deliveries set state = 'leased', lease_id = gen_random_uuid(),
  leased_until = now() + interval '2 minutes', ticket_id = null
  where installation_id in (:i1, :i2) and id in (
    select id from public.push_deliveries where installation_id in (:i1, :i2) limit 2);
select public.t_as(:admin);
select public.revoke_push_for_password_recovery();
reset role;
select public.t_assert((select count(*) = 2 from public.push_installations
  where id in (:i1, :i2) and expo_push_token is null and revoked_at is not null),
  'la recuperación retira los tokens de ambas sesiones');
select public.t_assert(not exists (select 1 from public.push_deliveries
  where installation_id in (:i1, :i2) and state in ('pending', 'leased')),
  'la recuperación cancela pendientes y reservas');
select public.t_assert(exists (select 1 from public.push_recovery_cutoffs where user_id = :admin),
  'la barrera de recuperación se guardó para la cuenta');
select public.t_assert(not public.push_session_valid(:admin, :admin),
  'la sesión anterior queda bloqueada aunque Auth todavía no la cierre');
select public.t_as(:admin);
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i1, :s1, 'ExpoPushToken[stalejwt]', 'android', 'granted'), '42501');
reset role;
insert into auth.sessions(id, user_id, created_at)
  values ('11111111-1111-4111-8111-111111111113', :admin, clock_timestamp() + interval '1 second');
select public.t_as(:admin);
select set_config('request.jwt.claims', json_build_object('sub', :admin, 'role', 'authenticated',
  'session_id', '11111111-1111-4111-8111-111111111113')::text, true);
select public.register_push_installation(:i1, :s1, 'ExpoPushToken[newsession]', 'android', 'granted');
reset role;
select public.t_assert((select session_id = '11111111-1111-4111-8111-111111111113'::uuid
  and revoked_at is null from public.push_installations where id = :i1),
  'una sesión nueva tras la recuperación puede registrar el teléfono');
update auth.sessions set not_after = clock_timestamp() - interval '1 second'
  where id = '11111111-1111-4111-8111-111111111113';
select public.t_as(:admin);
select set_config('request.jwt.claims', json_build_object('sub', :admin, 'role', 'authenticated',
  'session_id', '11111111-1111-4111-8111-111111111113')::text, true);
select public.t_fails(format('select public.register_push_installation(%L,%L,%L,%L,%L)',
  :i1, :s1, 'ExpoPushToken[expiredsession]', 'android', 'granted'), '42501');
reset role;

rollback;
\echo test_notificaciones.sql: TODO CORRECTO (rollback ejecutado)
