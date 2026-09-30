-- Avisos de acceso a equipos.
--
-- Evento (push_alerts), destinatario (notification_recipients) y entrega
-- (push_deliveries, una por instalación del teléfono) son estados distintos: la
-- lectura de una persona no depende de que Expo haya recibido el mensaje, y un
-- ticket aceptado no es lo mismo que un receipt entregado.
--
-- Sólo existen cuatro eventos: access_request, access_approved, access_rejected
-- y admin_transferred. Los avisos de suelo, clima, sincronización, recordatorios
-- y firmware se retiraron del producto y un disparador impide volver a crearlos.
-- Los usuarios no leen ninguna de estas tablas: sólo usan las RPC de más abajo.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

alter table public.push_alerts
  add column status text not null default 'active',
  add column expires_at timestamptz not null default (now() + interval '30 days'),
  add column source_transaction bigint;
alter table public.push_alerts add constraint push_alerts_status_check
  check (status in ('active', 'cancelled', 'expired'));
comment on column public.push_alerts.is_read is
  'Obsoleta. La lectura vive en notification_recipients.read_at, por usuario.';
create unique index push_alerts_transfer_transaction_idx
  on public.push_alerts(device_id, source_transaction)
  where event_type = 'admin_transferred' and source_transaction is not null;
create index push_alerts_active_idx on public.push_alerts(expires_at) where status = 'active';
create index push_alerts_request_idx on public.push_alerts(device_id, requester_user_id)
  where event_type = 'access_request';

create table public.push_installations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  secret_hash text not null,
  expo_push_token text,
  platform text not null check (platform in ('ios', 'android')),
  permission text not null check (permission in ('granted', 'provisional', 'denied', 'undetermined')),
  token_generation bigint not null default 1,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint push_installations_token_check check (
    expo_push_token is null or expo_push_token ~ '^((Expo|Exponent)PushToken)\[[A-Za-z0-9_-]+\]$'
  )
);
create index push_installations_user_idx on public.push_installations(user_id);
create unique index push_installations_token_idx on public.push_installations(expo_push_token)
  where expo_push_token is not null;

create table public.notification_recipients (
  alert_id uuid not null references public.push_alerts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  cancelled_at timestamptz,
  primary key (alert_id, user_id)
);
create index notification_recipients_user_idx on public.notification_recipients(user_id, alert_id);

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null,
  user_id uuid not null,
  installation_id uuid not null references public.push_installations(id) on delete cascade,
  token_generation bigint not null,
  state text not null default 'pending' check (state in
    ('pending', 'leased', 'ticket_ok', 'receipt_leased', 'delivered', 'failed', 'cancelled', 'expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_id uuid,
  leased_until timestamptz,
  ticket_id text,
  ticket_at timestamptz,
  receipt_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alert_id, installation_id),
  foreign key (alert_id, user_id) references public.notification_recipients(alert_id, user_id) on delete cascade
);
create index push_deliveries_queue_idx on public.push_deliveries(state, next_attempt_at);
create index push_deliveries_installation_idx on public.push_deliveries(installation_id);
create index push_deliveries_user_idx on public.push_deliveries(user_id);

alter table public.push_installations enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.push_installations, public.notification_recipients, public.push_deliveries
  from public, anon, authenticated;
grant all on public.push_installations, public.notification_recipients, public.push_deliveries to service_role;
drop policy if exists ts_alerts_select on public.push_alerts;
drop policy if exists ts_alerts_update on public.push_alerts;
revoke all on public.push_alerts from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Avisos heredados
-- ---------------------------------------------------------------------------

-- Sólo siguen vigentes las solicitudes de acceso que aún esperan respuesta; el
-- resto (suelo, firmware, resueltas) queda cancelado y sin destinatarios.
update public.push_alerts a set status = 'cancelled'
  where a.event_type is distinct from 'access_request'
     or not exists (select 1 from public.device_members p where p.device_id = a.device_id
          and p.user_id = a.requester_user_id and not p.is_authorized)
     or not exists (select 1 from public.device_members d where d.device_id = a.device_id
          and d.role = 'admin' and d.is_authorized);
insert into public.notification_recipients(alert_id, user_id)
  select a.id, d.user_id from public.push_alerts a
    join public.device_members d on d.device_id = a.device_id and d.role = 'admin' and d.is_authorized
    where a.status = 'active' and a.event_type = 'access_request';
-- Los tokens quedan en push_installations; el de perfiles ya no se usa.
update public.profiles set push_token = null where push_token is not null;
comment on column public.profiles.push_token is
  'Obsoleto. Los tokens Expo se guardan por instalación en push_installations.';

-- ---------------------------------------------------------------------------
-- 3. Textos, permisos y guardia de eventos
-- ---------------------------------------------------------------------------

create or replace function public.notification_copy(p_event text, p_language text)
returns table(title text, body text) language sql immutable set search_path = '' as $$
  select case when p_language = 'en' then t.en_title else t.es_title end,
         case when p_language = 'en' then t.en_body else t.es_body end
  from (values
    ('access_request', 'Device access request',
      'Someone is waiting for your approval. Open Administration to review the request.',
      'Solicitud de acceso al equipo',
      'Un usuario espera tu aprobación. Abre Administración para revisar la solicitud.'),
    ('access_approved', 'Access approved', 'Your device access request was approved.',
      'Acceso aprobado', 'Tu solicitud de acceso al equipo fue aprobada.'),
    ('access_rejected', 'Request rejected', 'Your device access request was rejected.',
      'Solicitud rechazada', 'Tu solicitud de acceso al equipo fue rechazada.'),
    ('admin_transferred', 'Administration transferred', 'The administrator of this device changed.',
      'Administración transferida', 'La administración de este equipo cambió.')
  ) as t(event_type, en_title, en_body, es_title, es_body)
  where t.event_type = p_event
$$;

create or replace function public.guard_push_alert_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.category <> 'device'
     or new.event_type is null
     or new.event_type not in ('access_request', 'access_approved', 'access_rejected', 'admin_transferred') then
    raise exception 'Sólo se admiten avisos de acceso a equipos.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger guard_push_alert_event before insert on public.push_alerts
  for each row execute function public.guard_push_alert_event();

-- Quién puede ver un evento: el administrador vigente para las solicitudes, el
-- propio solicitante para su rechazo y cualquier integrante aprobado para el resto.
create or replace function public.notification_access_allowed(p_alert public.push_alerts, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_alert.event_type = 'access_rejected' then p_alert.user_id = p_user_id
    when p_alert.event_type = 'access_request' then exists (
      select 1 from public.device_members admin where admin.device_id = p_alert.device_id
        and admin.user_id = p_user_id and admin.role = 'admin' and admin.is_authorized)
    else exists (select 1 from public.device_members m where m.device_id = p_alert.device_id
      and m.user_id = p_user_id and m.is_authorized)
  end
$$;

-- Además del acceso, una solicitud sólo se despacha mientras siga pendiente.
create or replace function public.notification_dispatch_allowed(p_alert public.push_alerts, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_alert.status = 'active' and p_alert.expires_at > now()
    and public.notification_access_allowed(p_alert, p_user_id)
    and (p_alert.event_type <> 'access_request' or exists (
      select 1 from public.device_members m where m.device_id = p_alert.device_id
        and m.user_id = p_alert.requester_user_id and not m.is_authorized))
$$;

-- ---------------------------------------------------------------------------
-- 4. Instalaciones del teléfono
-- ---------------------------------------------------------------------------

create or replace function public.register_push_installation(
  p_installation_id uuid, p_installation_secret text, p_expo_push_token text,
  p_platform text, p_permission text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_old public.push_installations;
  v_fresh integer;
  v_changed boolean;
begin
  if v_uid is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  if p_installation_id is null or p_installation_secret is null
     or length(p_installation_secret) < 32 or length(p_installation_secret) > 512 then
    raise exception 'Identidad de instalación inválida.' using errcode = '22023';
  end if;
  if p_platform is null or p_permission is null
     or p_platform not in ('ios', 'android')
     or p_permission not in ('granted', 'provisional', 'denied', 'undetermined') then
    raise exception 'Plataforma o permiso inválido.' using errcode = '22023';
  end if;
  if p_expo_push_token is not null and p_expo_push_token !~ '^((Expo|Exponent)PushToken)\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Token Expo inválido.' using errcode = '22023';
  end if;
  if p_permission not in ('granted', 'provisional') and p_expo_push_token is not null then
    raise exception 'El permiso no autoriza un token.' using errcode = '22023';
  end if;
  v_hash := encode(extensions.digest(p_installation_secret, 'sha256'), 'hex');
  insert into public.push_installations(id, user_id, secret_hash, platform, permission)
    values (p_installation_id, v_uid, v_hash, p_platform, 'undetermined')
    on conflict (id) do nothing;
  get diagnostics v_fresh = row_count;
  select * into v_old from public.push_installations where id = p_installation_id for update;
  if v_old.secret_hash <> v_hash then
    raise exception 'Instalación no autorizada.' using errcode = '42501';
  end if;
  v_changed := v_fresh = 0 and (v_old.user_id is distinct from v_uid
    or v_old.expo_push_token is distinct from p_expo_push_token
    or v_old.revoked_at is not null);
  -- Un token pertenece a una sola instalación: si otra lo tenía (datos borrados,
  -- reinstalación), pierde el token y sus envíos abiertos.
  if p_expo_push_token is not null then
    update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      where state in ('pending', 'leased') and installation_id in (
        select id from public.push_installations
          where expo_push_token = p_expo_push_token and id <> p_installation_id);
    update public.push_installations set expo_push_token = null,
        token_generation = token_generation + 1, updated_at = now()
      where expo_push_token = p_expo_push_token and id <> p_installation_id;
  end if;
  if v_changed then
    update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      where installation_id = p_installation_id and state in ('pending', 'leased');
  end if;
  update public.push_installations set user_id = v_uid, expo_push_token = p_expo_push_token,
      platform = p_platform, permission = p_permission, revoked_at = null, updated_at = now(),
      token_generation = token_generation + case when v_changed then 1 else 0 end
    where id = p_installation_id;
end $$;

create or replace function public.revoke_push_installation(p_installation_id uuid, p_installation_secret text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.push_installations;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  if p_installation_id is null or p_installation_secret is null or length(p_installation_secret) < 32
    or length(p_installation_secret) > 512 then
    raise exception 'Identidad de instalación inválida.' using errcode = '22023';
  end if;
  select * into v_row from public.push_installations where id = p_installation_id for update;
  if not found then return; end if;
  if v_row.user_id <> auth.uid()
     or v_row.secret_hash <> encode(extensions.digest(p_installation_secret, 'sha256'), 'hex') then
    raise exception 'Instalación no autorizada.' using errcode = '42501';
  end if;
  update public.push_installations set expo_push_token = null, permission = 'denied', revoked_at = now(),
      updated_at = now(), token_generation = token_generation + 1
    where id = p_installation_id;
  update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
    where installation_id = p_installation_id and state in ('pending', 'leased');
end $$;

-- Cierre de sesión sin red o con la sesión vencida: no hay auth.uid(), así que
-- basta el secreto de la instalación. Responde igual exista o no la instalación.
create or replace function public.revoke_push_installation_by_secret(p_installation_id uuid, p_installation_secret text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_updated integer;
begin
  if p_installation_id is null or p_installation_secret is null or length(p_installation_secret) < 32
    or length(p_installation_secret) > 512 then
    raise exception 'Identidad de instalación inválida.' using errcode = '22023';
  end if;
  update public.push_installations set expo_push_token = null, permission = 'denied', revoked_at = now(),
      updated_at = now(), token_generation = token_generation + 1
    where id = p_installation_id
      and secret_hash = encode(extensions.digest(p_installation_secret, 'sha256'), 'hex');
  get diagnostics v_updated = row_count;
  if v_updated > 0 then
    update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      where installation_id = p_installation_id and state in ('pending', 'leased');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Despacho: cron, Vault y reservas
-- ---------------------------------------------------------------------------

-- Despierta a la Edge Function. Los secretos viven en Vault (push_dispatch_url y
-- push_dispatch_service_role_key); si falta alguno no hace nada, y un fallo nunca
-- deshace la operación que la llamó. pg_net envía la petición al confirmar la
-- transacción, así que el despachador ya ve los avisos nuevos.
create or replace function public.invoke_push_dispatch() returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'push_dispatch_service_role_key';
  if v_url is null or v_key is null then return; end if;
  perform net.http_post(url => v_url,
    headers => jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body => '{}'::jsonb, timeout_milliseconds => 10000);
exception when others then
  raise warning 'No se pudo despertar el despachador de avisos: %', sqlerrm;
end $$;

-- Recuperación periódica: reintentos, reservas vencidas y receipts pendientes.
do $cron_setup$
begin
  if current_database() = coalesce(current_setting('cron.database_name', true), 'postgres') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('terrasense-push-dispatch', '* * * * *', 'select public.invoke_push_dispatch()');
  end if;
end $cron_setup$;

-- Reserva entregas con lease de dos minutos. Cada evento se reparte entre todas
-- las instalaciones vigentes de sus destinatarios y se revalida antes de salir.
create or replace function public.reserve_push_deliveries(p_limit integer default 50)
returns table(delivery_id uuid, lease_id uuid, alert_id uuid, event_type text, title text,
  body text, device_id uuid, expo_push_token text, token_generation bigint)
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
    -- Entregas nuevas: una por instalación de cada destinatario vigente.
    insert into public.push_deliveries(alert_id, user_id, installation_id, token_generation)
      select a.id, r.user_id, i.id, i.token_generation
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
      on conflict (alert_id, installation_id) do update
        set token_generation = excluded.token_generation, state = 'pending', attempts = 0,
          next_attempt_at = now(), last_error = null, lease_id = null, leased_until = null,
          updated_at = now()
        where public.push_deliveries.user_id = excluded.user_id
          and public.push_deliveries.token_generation <> excluded.token_generation
          and public.push_deliveries.state in ('cancelled', 'failed')
          and public.push_deliveries.last_error is distinct from 'preference_disabled'
          and public.push_deliveries.ticket_id is null;
  end if;
  return query
    with candidate as (
      select d.id from public.push_deliveries d
        join public.push_alerts a on a.id = d.alert_id
        join public.notification_recipients r on r.alert_id = d.alert_id and r.user_id = d.user_id
        join public.push_installations i on i.id = d.installation_id
        join public.profiles p on p.id = d.user_id
      where d.state in ('pending', 'leased') and d.next_attempt_at <= now()
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
    select d.id, d.lease_id, a.id, a.event_type, c.title, c.body, a.device_id, i.expo_push_token, i.token_generation
      from reserved d
        join public.push_alerts a on a.id = d.alert_id
        join public.push_installations i on i.id = d.installation_id
        join public.profiles p on p.id = d.user_id
        cross join lateral public.notification_copy(a.event_type, p.app_preferences->>'language') c;
end $$;

-- Resultado del envío: ticket aceptado, error definitivo o reintento con espera
-- creciente por entrega (30 s, 1 min, 2 min... hasta 1 h; cinco intentos).
create or replace function public.report_push_ticket(p_delivery_id uuid, p_lease_id uuid,
  p_ticket_id text default null, p_error text default null, p_invalid_token boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.push_deliveries;
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
  elsif p_invalid_token then
    update public.push_deliveries set state = 'failed',
        last_error = left(coalesce(p_error, 'DeviceNotRegistered'), 500),
        lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
    update public.push_installations set expo_push_token = null,
        token_generation = token_generation + 1, updated_at = now()
      where id = v_row.installation_id and user_id = v_row.user_id
        and token_generation = v_row.token_generation;
  else
    update public.push_deliveries set state = case when attempts >= 5 then 'failed' else 'pending' end,
        last_error = left(coalesce(p_error, 'Error de Expo'), 500), lease_id = null, leased_until = null,
        next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, attempts - 1))::double precision),
        updated_at = now()
      where id = p_delivery_id;
  end if;
end $$;

-- Receipts: se consultan a partir de 15 minutos del ticket y Expo sólo los
-- conserva 24 horas; pasado ese plazo la entrega queda sin confirmación.
create or replace function public.reserve_push_receipts(p_limit integer default 50)
returns table(delivery_id uuid, lease_id uuid, ticket_id text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  update public.push_deliveries set state = 'failed', last_error = 'receipt_unavailable',
      lease_id = null, leased_until = null, updated_at = now()
    where state in ('ticket_ok', 'receipt_leased') and ticket_at < now() - interval '24 hours';
  return query
    with candidate as (
      select d.id from public.push_deliveries d
      where d.ticket_id is not null and d.next_attempt_at <= now()
        and (d.state = 'ticket_ok' or (d.state = 'receipt_leased' and d.leased_until < now()))
      order by d.next_attempt_at, d.created_at
      for update of d skip locked limit least(greatest(coalesce(p_limit, 50), 1), 100)
    ), reserved as (
      update public.push_deliveries d set state = 'receipt_leased', lease_id = gen_random_uuid(),
          leased_until = now() + interval '2 minutes', updated_at = now()
        from candidate c where d.id = c.id
        returning d.*
    )
    select d.id, d.lease_id, d.ticket_id from reserved d;
end $$;

create or replace function public.report_push_receipt(p_delivery_id uuid, p_lease_id uuid,
  p_status text, p_error text default null, p_invalid_token boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.push_deliveries;
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
  elsif p_status = 'error' then
    update public.push_deliveries set state = 'failed', last_error = left(coalesce(p_error, 'Error de receipt'), 500),
        receipt_checked_at = now(), lease_id = null, leased_until = null, updated_at = now()
      where id = p_delivery_id;
    if p_invalid_token then
      update public.push_installations set expo_push_token = null,
          token_generation = token_generation + 1, updated_at = now()
        where id = v_row.installation_id and user_id = v_row.user_id
          and token_generation = v_row.token_generation;
    end if;
  else
    update public.push_deliveries set state = 'ticket_ok', lease_id = null, leased_until = null,
        next_attempt_at = now() + interval '15 minutes', updated_at = now()
      where id = p_delivery_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Lectura por el usuario
-- ---------------------------------------------------------------------------

create or replace function public.list_my_notifications(p_limit integer default 30,
  p_before timestamptz default null, p_before_id uuid default null)
returns table(id uuid, event_type text, title text, body text, device_id uuid,
  created_at timestamptz, read_at timestamptz, status text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.event_type, a.title::text, a.body, a.device_id, a.created_at, r.read_at,
    case when a.expires_at <= now() then 'expired' else a.status end
  from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where auth.uid() is not null and r.user_id = auth.uid()
    and r.cancelled_at is null
    and public.notification_access_allowed(a, auth.uid())
    and (p_before is null or (a.created_at, a.id) <
      (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
$$;

create or replace function public.get_my_notification(p_alert_id uuid)
returns table(id uuid, event_type text, title text, body text, device_id uuid,
  created_at timestamptz, read_at timestamptz, status text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.event_type, a.title::text, a.body, a.device_id, a.created_at, r.read_at,
    case when a.expires_at <= now() then 'expired' else a.status end
  from public.notification_recipients r join public.push_alerts a on a.id = r.alert_id
  where auth.uid() is not null and a.id = p_alert_id and r.user_id = auth.uid()
    and r.cancelled_at is null
    and public.notification_access_allowed(a, auth.uid())
$$;

create or replace function public.mark_notification_read(p_alert_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  update public.notification_recipients r set read_at = coalesce(r.read_at, now())
    from public.push_alerts a
    where r.alert_id = p_alert_id and a.id = r.alert_id and r.user_id = auth.uid()
      and r.cancelled_at is null and public.notification_access_allowed(a, auth.uid());
  if not found then raise exception 'Aviso no disponible.' using errcode = '42501'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Eventos de membresía
-- ---------------------------------------------------------------------------

create or replace function public.create_device_event(p_event text, p_device_id uuid, p_user_id uuid,
  p_requester uuid default null, p_source_transaction bigint default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_alert uuid;
begin
  insert into public.push_alerts(device_id, user_id, title, body, category, severity, event_type,
      requester_user_id, source_transaction)
    select p_device_id, p_user_id, c.title, c.body, 'device', 'medium', p_event, p_requester, p_source_transaction
    from public.notification_copy(p_event, 'es') c
    returning id into v_alert;
  -- Para que el aviso salga sin esperar al cron (pg_net envía al confirmar).
  perform public.invoke_push_dispatch();
  return v_alert;
end $$;

-- La solicitud deja de estar pendiente: se cancela el aviso y sus envíos abiertos.
create or replace function public.resolve_access_requests(p_device_id uuid, p_requester uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.push_alerts set status = 'cancelled'
    where device_id = p_device_id and requester_user_id = p_requester
      and event_type = 'access_request' and status = 'active';
  update public.push_deliveries d set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
    from public.push_alerts a
    where a.id = d.alert_id and a.device_id = p_device_id and a.requester_user_id = p_requester
      and a.event_type = 'access_request' and d.state in ('pending', 'leased');
end $$;

-- Un solo evento por operación: la transferencia toca dos filas (el administrador
-- que cede y el que recibe) en la misma transacción y ambas comparten el evento.
create or replace function public.record_admin_transfer(p_device_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_alert uuid;
begin
  select id into v_alert from public.push_alerts where device_id = p_device_id
    and event_type = 'admin_transferred' and source_transaction = txid_current();
  if v_alert is null then
    v_alert := public.create_device_event('admin_transferred', p_device_id, p_user_id, null, txid_current());
  end if;
  insert into public.notification_recipients(alert_id, user_id) values (v_alert, p_user_id)
    on conflict do nothing;
  return v_alert;
end $$;

create or replace function public.notify_device_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_alert uuid; v_admin uuid; v_request uuid; v_moved boolean := false;
begin
  if tg_op = 'INSERT' then
    -- Alta pendiente, venga del QR o de cualquier otra vía.
    if not new.is_authorized then
      select m.user_id into v_admin from public.device_members m
        where m.device_id = new.device_id and m.role = 'admin' and m.is_authorized;
      if v_admin is not null then
        v_alert := public.create_device_event('access_request', new.device_id, v_admin, new.user_id);
        insert into public.notification_recipients(alert_id, user_id) values (v_alert, v_admin);
      end if;
    end if;
  elsif tg_op = 'UPDATE' and not old.is_authorized and new.is_authorized then
    -- Aprobación.
    perform public.resolve_access_requests(new.device_id, new.user_id);
    v_alert := public.create_device_event('access_approved', new.device_id, new.user_id);
    insert into public.notification_recipients(alert_id, user_id) values (v_alert, new.user_id);
  elsif tg_op = 'DELETE' and not old.is_authorized then
    -- Rechazo (o solicitud retirada por la propia persona, que no se avisa a sí misma).
    perform public.resolve_access_requests(old.device_id, old.user_id);
    if current_setting('terrasense.factory_reset', true) is distinct from 'on'
       and auth.uid() is not null and auth.uid() <> old.user_id
       and exists (select 1 from public.devices where id = old.device_id) then
      v_alert := public.create_device_event('access_rejected', old.device_id, old.user_id);
      insert into public.notification_recipients(alert_id, user_id) values (v_alert, old.user_id);
    end if;
  elsif tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' then
    perform public.record_admin_transfer(new.device_id, new.user_id);
  elsif tg_op = 'UPDATE' and old.role <> 'admin' and new.role = 'admin' and new.is_authorized then
    perform public.record_admin_transfer(new.device_id, new.user_id);
    -- Las solicitudes aún pendientes pasan al administrador nuevo.
    for v_request in select id from public.push_alerts where device_id = new.device_id
        and event_type = 'access_request' and status = 'active' loop
      update public.notification_recipients set cancelled_at = now()
        where alert_id = v_request and user_id <> new.user_id and cancelled_at is null;
      insert into public.notification_recipients(alert_id, user_id) values (v_request, new.user_id)
        on conflict (alert_id, user_id) do update set cancelled_at = null;
      update public.push_deliveries set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
        where alert_id = v_request and user_id <> new.user_id and state in ('pending', 'leased');
      v_moved := true;
    end loop;
    if v_moved then perform public.invoke_push_dispatch(); end if;
  elsif tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.is_authorized and not new.is_authorized) then
    -- Acceso retirado: se conservan sólo los rechazos, que no dependen de la membresía.
    update public.notification_recipients r set cancelled_at = now()
      from public.push_alerts a
      where a.id = r.alert_id and r.user_id = old.user_id and a.device_id = old.device_id
        and a.event_type <> 'access_rejected' and r.cancelled_at is null;
    update public.push_deliveries d set state = 'cancelled', lease_id = null, leased_until = null, updated_at = now()
      from public.push_alerts a
      where a.id = d.alert_id and d.user_id = old.user_id and a.device_id = old.device_id
        and a.event_type <> 'access_rejected' and d.state in ('pending', 'leased');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger notify_device_membership after insert or update or delete on public.device_members
  for each row execute function public.notify_device_membership();

-- ---------------------------------------------------------------------------
-- 8. Funciones existentes que producían o tocaban avisos
-- ---------------------------------------------------------------------------

-- El aviso de solicitud lo crea el disparador; aquí sólo se devuelve su ID.
create or replace function public.join_device_by_invite(p_token uuid)
returns table(device_id uuid, device_name text, is_authorized boolean, role text, alert_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_device public.devices; v_new boolean; v_alert uuid; v_admin uuid;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  select d.* into v_device from public.devices d join public.device_access_invites i on i.device_id = d.id
    where i.token = p_token for update of d;
  -- La vigencia se revisa tras tomar el bloqueo: un reset o la rotación del QR pueden
  -- haberlo invalidado mientras esta petición esperaba.
  if not found or not exists (select 1 from public.device_access_invites i
      where i.device_id = v_device.id and i.token = p_token and i.expires_at > clock_timestamp()) then
    raise exception 'El QR venció o dejó de ser válido. Pide que te muestren el QR actual.' using errcode = '22023';
  end if;
  select dm.user_id into v_admin from public.device_members dm
    where dm.device_id = v_device.id and dm.role = 'admin' and dm.is_authorized;
  if v_admin is null then
    raise exception 'Este equipo debe vincularse primero por Bluetooth.' using errcode = '22023';
  end if;
  v_new := not exists (select 1 from public.device_members dm
    where dm.device_id = v_device.id and dm.user_id = auth.uid());
  insert into public.device_members(device_id, user_id, role, is_authorized)
    values (v_device.id, auth.uid(), 'user', false) on conflict do nothing;
  if v_new then
    select a.id into v_alert from public.push_alerts a where a.device_id = v_device.id
      and a.requester_user_id = auth.uid() and a.event_type = 'access_request'
      order by a.created_at desc, a.id desc limit 1;
  end if;
  return query select v_device.id, v_device.name::text, dm.is_authorized, dm.role::text, v_alert
    from public.device_members dm where dm.device_id = v_device.id and dm.user_id = auth.uid();
end $$;

-- La invitación a instalar firmware queda suspendida hasta que la instalación
-- OTA funcione en la app. La asignación se conserva; devuelve el ID de la asignación.
create or replace function public.assign_firmware_update(p_device_id uuid, p_release public.firmware_releases)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_admin uuid; v_update uuid;
begin
  select dm.user_id into v_admin from public.device_members dm
    where dm.device_id = p_device_id and dm.role = 'admin' and dm.is_authorized;
  if v_admin is null then return null; end if;
  update public.device_firmware_updates set status = 'cancelled', updated_at = now()
    where device_id = p_device_id and status in ('sent', 'postponed', 'installing');
  insert into public.device_firmware_updates(device_id, release_id, sent_by)
    values (p_device_id, p_release.id, auth.uid()) returning id into v_update;
  return v_update;
end $$;

create or replace function public.admin_send_update_all(p_release_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_release public.firmware_releases;
  v_device record;
  v_update uuid;
  v_updates uuid[] := '{}';
  v_skipped integer := 0;
begin
  perform public.assert_support_staff();
  select * into v_release from public.firmware_releases where id = p_release_id and is_published;
  if not found then
    raise exception 'Esa versión no está publicada.' using errcode = '22023';
  end if;
  for v_device in
    select d.id, d.firmware_version from public.devices d order by d.id for update
  loop
    if not public.firmware_is_newer(v_release.version, v_device.firmware_version)
       or exists (select 1 from public.device_firmware_updates u
                   where u.device_id = v_device.id and u.release_id = p_release_id
                     and u.status in ('sent', 'postponed', 'installing', 'installed')) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_update := public.assign_firmware_update(v_device.id, v_release);
    if v_update is null then
      v_skipped := v_skipped + 1;
    else
      v_updates := v_updates || v_update;
    end if;
  end loop;
  return jsonb_build_object('sent', cardinality(v_updates), 'skipped', v_skipped, 'update_ids', to_jsonb(v_updates));
end $$;

-- Aprobar y rechazar desde el backoffice: el disparador de membresía resuelve el
-- aviso; ya no se toca push_alerts ni su antiguo is_read.
create or replace function public.admin_approve_member(p_device_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_support_staff();
  if not exists (select 1 from public.device_members
                  where device_id = p_device_id and user_id = p_user_id and is_authorized is not true) then
    raise exception 'No hay una solicitud pendiente de ese usuario.' using errcode = '22023';
  end if;
  perform public.change_device_membership(p_device_id, p_user_id, 'authorize');
end $$;

create or replace function public.admin_reject_member(p_device_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_support_staff();
  if not exists (select 1 from public.device_members
                  where device_id = p_device_id and user_id = p_user_id and is_authorized is not true) then
    raise exception 'No hay una solicitud pendiente de ese usuario.' using errcode = '22023';
  end if;
  perform public.change_device_membership(p_device_id, p_user_id, 'remove');
end $$;

create or replace function public.admin_cancel_update(p_device_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_support_staff();
  update public.device_firmware_updates set status = 'cancelled', updated_at = now()
    where device_id = p_device_id and status in ('sent', 'postponed');
  if not found then
    raise exception 'No hay una actualización que se pueda cancelar (si se está instalando, espera a que termine).'
      using errcode = '22023';
  end if;
end $$;

create or replace function public.firmware_update_progress(p_update_id uuid, p_action text,
  p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_update public.device_firmware_updates;
  v_next text;
begin
  select * into v_update from public.device_firmware_updates where id = p_update_id for update;
  if not found or not public.has_device_admin_access(v_update.device_id) then
    raise exception 'Actualización no encontrada.' using errcode = '42501';
  end if;
  v_next := case
    when p_action = 'postpone'  and v_update.status in ('sent', 'postponed')            then 'postponed'
    when p_action = 'start'     and v_update.status in ('sent', 'postponed', 'failed')  then 'installing'
    when p_action = 'installed' and v_update.status = 'installing'                      then 'installed'
    when p_action = 'failed'    and v_update.status = 'installing'                      then 'failed'
  end;
  if v_next is null then
    raise exception 'La actualización ya no admite ese paso.' using errcode = '22023';
  end if;
  update public.device_firmware_updates
     set status = v_next,
         error = case when v_next = 'failed' then left(coalesce(p_error, 'Falló sin detalle.'), 300) end,
         updated_at = now()
   where id = p_update_id;
end $$;

-- El reset elimina también los eventos y no genera rechazos espurios.
create or replace function public.admin_reset_device(p_device_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_device public.devices; v_members integer; v_meas integer;
begin
  perform public.assert_support_staff();
  select * into v_device from public.devices where id = p_device_id for update;
  if not found then raise exception 'Equipo no encontrado.' using errcode = 'P0002'; end if;
  select count(*) into v_members from public.device_members where device_id = p_device_id;
  select count(*) into v_meas from public.soil_measurements where device_id = p_device_id;
  insert into public.device_data_resets(user_id, device_id, generation)
    select user_id, device_id, v_device.data_generation + 1 from public.device_members where device_id = p_device_id
    on conflict (user_id, device_id) do update set generation = excluded.generation;
  perform set_config('terrasense.factory_reset', 'on', true);
  delete from public.device_members where device_id = p_device_id;
  perform set_config('terrasense.factory_reset', 'off', true);
  delete from public.soil_measurements where device_id = p_device_id;
  delete from public.push_alerts where device_id = p_device_id;
  delete from public.device_access_invites where device_id = p_device_id;
  delete from public.device_firmware_updates where device_id = p_device_id;
  update public.devices set data_generation = data_generation + 1, name = 'Sonda TerraSense', alias = null,
      pairing_mode_active = false, battery_level = null, first_seen_at = null, last_seen_at = null,
      last_measurement_at = null
    where id = p_device_id;
  -- Después del UPDATE: también se va la fila que el disparador acaba de registrar.
  delete from public.device_status_log where device_id = p_device_id;
  insert into public.device_member_audit(device_id, actor_user_id, action) values (p_device_id, auth.uid(), 'factory_reset');
  return jsonb_build_object('members_removed', v_members, 'measurements_deleted', v_meas);
end $$;

-- ---------------------------------------------------------------------------
-- 9. Permisos de ejecución
-- ---------------------------------------------------------------------------
-- Los privilegios por defecto conceden EXECUTE a anon, authenticated y service_role
-- en toda función nueva: se retiran todos y se otorga sólo lo que corresponde.

revoke all on function
  public.notification_copy(text, text),
  public.guard_push_alert_event(),
  public.notification_access_allowed(public.push_alerts, uuid),
  public.notification_dispatch_allowed(public.push_alerts, uuid),
  public.register_push_installation(uuid, text, text, text, text),
  public.revoke_push_installation(uuid, text),
  public.revoke_push_installation_by_secret(uuid, text),
  public.invoke_push_dispatch(),
  public.reserve_push_deliveries(integer),
  public.report_push_ticket(uuid, uuid, text, text, boolean),
  public.reserve_push_receipts(integer),
  public.report_push_receipt(uuid, uuid, text, text, boolean),
  public.list_my_notifications(integer, timestamptz, uuid),
  public.get_my_notification(uuid),
  public.mark_notification_read(uuid),
  public.create_device_event(text, uuid, uuid, uuid, bigint),
  public.resolve_access_requests(uuid, uuid),
  public.record_admin_transfer(uuid, uuid),
  public.notify_device_membership()
  from public, anon, authenticated, service_role;

grant execute on function
  public.register_push_installation(uuid, text, text, text, text),
  public.revoke_push_installation(uuid, text),
  public.list_my_notifications(integer, timestamptz, uuid),
  public.get_my_notification(uuid),
  public.mark_notification_read(uuid)
  to authenticated;
grant execute on function public.revoke_push_installation_by_secret(uuid, text) to anon, authenticated;
grant execute on function
  public.reserve_push_deliveries(integer),
  public.report_push_ticket(uuid, uuid, text, text, boolean),
  public.reserve_push_receipts(integer),
  public.report_push_receipt(uuid, uuid, text, text, boolean)
  to service_role;
