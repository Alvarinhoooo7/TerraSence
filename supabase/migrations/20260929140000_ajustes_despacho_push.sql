-- Ajustes del despacho posteriores a la primera migración de avisos.
-- La fecha límite que recibe Expo es la menor entre la vigencia del evento y 24 h, y los
-- errores de Expo se clasifican en una sola función (push_error_class).
drop function public.reserve_push_deliveries(integer);
create or replace function public.reserve_push_deliveries(p_limit integer default 50)
returns table(delivery_id uuid, lease_id uuid, alert_id uuid, event_type text, title text,
  body text, device_id uuid, expo_push_token text, token_generation bigint, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  -- El mantenimiento es idempotente: si otra ejecución ya lo hace, se omite.
  if pg_try_advisory_xact_lock(hashtextextended('terrasense.push_deliveries', 0)) then
    update public.push_alerts set status = 'expired' where status = 'active' and expires_at <= now();
    -- Una push sólo sirve el día del evento; la bandeja conserva el aviso 30 días.
    update public.push_deliveries d set state = 'expired', lease_id = null, leased_until = null,
        last_error = coalesce(d.last_error, 'expired'), updated_at = now()
      from public.push_alerts a
      where a.id = d.alert_id and d.state in ('pending', 'leased')
        and (a.status = 'expired' or a.created_at < now() - interval '24 hours');
    -- Reserva vencida tras agotar los intentos: no se reintenta más.
    update public.push_deliveries set state = 'failed', lease_id = null, leased_until = null,
        last_error = coalesce(last_error, 'lease_expired'), updated_at = now()
      where state = 'leased' and leased_until < now() and attempts >= 5;
    -- Destinatario, instalación o preferencia que ya no corresponden.
    update public.push_deliveries d set state = 'cancelled', lease_id = null, leased_until = null,
        last_error = case when coalesce(p.app_preferences->'notifications'->>'device', 'true') = 'false'
          then 'preference_disabled' else d.last_error end,
        updated_at = now()
      from public.push_installations i, public.notification_recipients r, public.push_alerts a,
        public.profiles p
      where i.id = d.installation_id and r.alert_id = d.alert_id and r.user_id = d.user_id
        and a.id = d.alert_id and p.id = d.user_id
        and d.state in ('pending', 'leased')
        and (i.user_id <> d.user_id or i.token_generation <> d.token_generation
          or i.revoked_at is not null or i.expo_push_token is null
          or i.permission not in ('granted', 'provisional')
          or r.cancelled_at is not null
          or not public.notification_dispatch_allowed(a, d.user_id)
          or coalesce(p.app_preferences->'notifications'->>'device', 'true') = 'false');
    -- Entregas nuevas: una por instalación de cada destinatario vigente. Las que ya existen no se
    -- tocan (ON CONFLICT DO NOTHING no bloquea filas): sólo se reabren, con su propio UPDATE, las
    -- canceladas o fallidas de una generación anterior del token. Así el mantenimiento no deja
    -- bloqueadas las entregas de otros trabajadores mientras dura su transacción.
    with eligible as (
      select a.id as alert_id, r.user_id, i.id as installation_id, i.token_generation
      from public.push_alerts a
        join public.notification_recipients r on r.alert_id = a.id
        join public.push_installations i on i.user_id = r.user_id
        join public.profiles p on p.id = r.user_id
      where a.status = 'active' and a.expires_at > now() and a.created_at >= now() - interval '24 hours'
        and r.cancelled_at is null
        and i.revoked_at is null and i.expo_push_token is not null
        and i.permission in ('granted', 'provisional')
        and coalesce(p.app_preferences->'notifications'->>'device', 'true') <> 'false'
        and public.notification_dispatch_allowed(a, r.user_id)
    ), created as (
      insert into public.push_deliveries(alert_id, user_id, installation_id, token_generation)
        select e.alert_id, e.user_id, e.installation_id, e.token_generation from eligible e
        on conflict (alert_id, installation_id) do nothing
    )
    update public.push_deliveries d
      set token_generation = e.token_generation, state = 'pending', attempts = 0,
        next_attempt_at = now(), last_error = null, lease_id = null, leased_until = null,
        updated_at = now()
      from eligible e
      where d.alert_id = e.alert_id and d.installation_id = e.installation_id and d.user_id = e.user_id
        and d.token_generation <> e.token_generation
        and d.state in ('cancelled', 'failed')
        and d.last_error is distinct from 'preference_disabled'
        and d.ticket_id is null;
  end if;
  return query
    with candidate as (
      select d.id from public.push_deliveries d
        join public.push_alerts a on a.id = d.alert_id
        join public.notification_recipients r on r.alert_id = d.alert_id and r.user_id = d.user_id
        join public.push_installations i on i.id = d.installation_id
        join public.profiles p on p.id = d.user_id
      where d.state in ('pending', 'leased') and d.next_attempt_at <= now()
        -- Un ticket aceptado nunca se reenvía: sólo un receipt con error explícito lo reabre.
        and d.ticket_id is null
        and (d.state = 'pending' or d.leased_until < now()) and d.attempts < 5
        and a.status = 'active' and a.expires_at > now() and a.created_at >= now() - interval '24 hours'
        and r.cancelled_at is null
        and public.notification_dispatch_allowed(a, d.user_id)
        and i.user_id = d.user_id and i.token_generation = d.token_generation
        and i.revoked_at is null and i.expo_push_token is not null
        and i.permission in ('granted', 'provisional')
        and coalesce(p.app_preferences->'notifications'->>'device', 'true') <> 'false'
      order by d.next_attempt_at, d.created_at
      for update of d skip locked limit v_limit
    ), reserved as (
      update public.push_deliveries d set state = 'leased', lease_id = gen_random_uuid(),
          leased_until = now() + interval '2 minutes', attempts = d.attempts + 1, updated_at = now()
        from candidate c where d.id = c.id
        returning d.*
    )
    select d.id, d.lease_id, a.id, a.event_type, c.title, c.body, a.device_id, i.expo_push_token, i.token_generation,
        least(a.expires_at, a.created_at + interval '24 hours')
      from reserved d
        join public.push_alerts a on a.id = d.alert_id
        join public.push_installations i on i.id = d.installation_id
        join public.profiles p on p.id = d.user_id
        cross join lateral public.notification_copy(a.event_type, p.app_preferences->>'language') c;
end $$;

-- ---------------------------------------------------------------------------
-- Clasificación de errores de Expo
-- ---------------------------------------------------------------------------
-- Es la única autoridad sobre qué error se reintenta: el despachador sólo informa el
-- código que recibió (por ticket o por receipt) y esta función decide. La tabla
-- EXPO_ERRORS de send-push-alert/dispatch.mjs debe coincidir; su prueba lo comprueba.
--   invalid_token  DeviceNotRegistered: el token ya no sirve; se retira sin reintentar.
--   permanent      no se reintenta: MessageTooBig, InvalidCredentials, MismatchSenderId y
--                  todo código con prefijo «permanent:» (HTTP 4xx salvo 408/429, evento vencido).
--   transient      todo lo demás, con espera creciente y hasta cinco intentos:
--                  MessageRateExceeded, ExpoServerError, ServiceUnavailable, HTTP 408/429/5xx,
--                  códigos desconocidos y los «uncertain:…» (sin respuesta de Expo).
create or replace function public.push_error_class(p_error text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_error = 'DeviceNotRegistered' then 'invalid_token'
    when p_error like 'permanent:%' or p_error in ('MessageTooBig', 'InvalidCredentials', 'MismatchSenderId')
      then 'permanent'
    else 'transient'
  end
$$;

-- Resultado del envío de una entrega, informado por ticket:
--   ticket aceptado  -> ticket_ok; sólo entonces se consulta el receipt.
--   invalid_token    -> failed y retiro del token (si la instalación sigue en la misma generación).
--   permanent        -> failed; «permanent:expired» (vencido antes de salir) -> expired.
--   transient        -> pending con espera de 30 s, 1 min, 2 min... hasta 1 h; al quinto intento, failed.
-- Un «uncertain:…» significa que no se supo si Expo recibió el mensaje: se reintenta y puede
-- duplicar el aviso, pero jamás afirma recepción. Una entrega con ticket aceptado no vuelve a
-- salir por esta vía: sólo un receipt con error explícito del proveedor la reenvía.
create or replace function public.report_push_ticket(p_delivery_id uuid, p_lease_id uuid,
  p_ticket_id text default null, p_error text default null, p_invalid_token boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.push_deliveries;
  v_class text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  select * into v_row from public.push_deliveries
    where id = p_delivery_id and lease_id = p_lease_id and state = 'leased' for update;
  if not found then return; end if;
  if p_ticket_id is not null then
    update public.push_deliveries set state = 'ticket_ok', ticket_id = p_ticket_id, ticket_at = now(),
        last_error = null, lease_id = null, leased_until = null,
        next_attempt_at = now() + interval '15 minutes', updated_at = now()
      where id = p_delivery_id;
    return;
  end if;
  v_class := case when p_invalid_token then 'invalid_token' else public.push_error_class(p_error) end;
  if p_error = 'permanent:expired' then
    update public.push_deliveries set state = 'expired', last_error = 'permanent:expired',
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
  elsif v_class = 'invalid_token' then
    update public.push_deliveries set state = 'failed',
        last_error = left(coalesce(p_error, 'DeviceNotRegistered'), 500),
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
    update public.push_installations set expo_push_token = null,
        token_generation = token_generation + 1, updated_at = now()
      where id = v_row.installation_id and user_id = v_row.user_id
        and token_generation = v_row.token_generation;
  elsif v_class = 'permanent' then
    update public.push_deliveries set state = 'failed',
        last_error = left(coalesce(p_error, 'Error permanente de Expo'), 500),
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
  else
    update public.push_deliveries set state = case when attempts >= 5 then 'failed' else 'pending' end,
        last_error = left(coalesce(p_error, 'Error de Expo'), 500), lease_id = null, leased_until = null,
        next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, attempts - 1))::double precision),
        updated_at = now()
      where id = p_delivery_id;
  end if;
end $$;

-- Resultado del receipt:
--   ok     -> delivered (el proveedor lo aceptó; no prueba lectura ni recepción física).
--   retry  -> el receipt aún no existe o la consulta falló: se conserva ticket_ok y se vuelve a
--             consultar en 15 minutos (Expo los guarda 24 h). No cambia nada más.
--   error  -> el proveedor informó que no lo entregó; se clasifica con push_error_class:
--             invalid_token y permanent -> failed (y retiro del token, si corresponde);
--             transient -> el mensaje no llegó, así que se reenvía como un envío nuevo con la
--             misma espera creciente, hasta cinco intentos.
create or replace function public.report_push_receipt(p_delivery_id uuid, p_lease_id uuid,
  p_status text, p_error text default null, p_invalid_token boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.push_deliveries;
  v_class text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('ok', 'error', 'retry') then
    raise exception 'Estado de receipt inválido.' using errcode = '22023';
  end if;
  select * into v_row from public.push_deliveries
    where id = p_delivery_id and lease_id = p_lease_id and state = 'receipt_leased' for update;
  if not found then return; end if;
  if p_status = 'ok' then
    update public.push_deliveries set state = 'delivered', receipt_checked_at = now(),
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
  elsif p_status = 'retry' then
    update public.push_deliveries set state = 'ticket_ok', lease_id = null, leased_until = null,
        next_attempt_at = now() + interval '15 minutes', updated_at = now()
      where id = p_delivery_id;
  else
    v_class := case when p_invalid_token then 'invalid_token' else public.push_error_class(p_error) end;
    if v_class = 'transient' and v_row.attempts < 5 then
      update public.push_deliveries set state = 'pending', ticket_id = null, ticket_at = null,
          receipt_checked_at = now(), last_error = left(coalesce(p_error, 'Error de receipt'), 500),
          lease_id = null, leased_until = null,
          next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, attempts - 1))::double precision),
          updated_at = now()
        where id = p_delivery_id;
    else
      update public.push_deliveries set state = 'failed',
          last_error = left(coalesce(p_error, 'Error de receipt'), 500),
          receipt_checked_at = now(), lease_id = null, leased_until = null, updated_at = now()
        where id = p_delivery_id;
      if v_class = 'invalid_token' then
        update public.push_installations set expo_push_token = null,
            token_generation = token_generation + 1, updated_at = now()
          where id = v_row.installation_id and user_id = v_row.user_id
            and token_generation = v_row.token_generation;
      end if;
    end if;
  end if;
end $$;

revoke all on function public.reserve_push_deliveries(integer) from public, anon, authenticated, service_role;
grant execute on function public.reserve_push_deliveries(integer) to service_role;
-- Ayuda interna: sólo la llaman las funciones anteriores (con los privilegios de su dueño).
revoke all on function public.push_error_class(text) from public, anon, authenticated, service_role;
