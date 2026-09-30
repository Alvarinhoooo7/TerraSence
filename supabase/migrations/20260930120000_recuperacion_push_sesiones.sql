-- Cada instalación pertenece a la sesión Auth que la registró. Los registros antiguos
-- quedan sin sesión y dejan de ser elegibles hasta que el teléfono se registre de nuevo.
alter table public.push_installations add column session_id uuid;
create index push_installations_session_idx on public.push_installations(session_id);

-- La barrera persiste si el cierre de Auth falla después del cambio de contraseña.
-- Sólo una sesión creada después de la barrera puede registrar push de nuevo.
create table public.push_recovery_cutoffs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocked_through timestamptz not null
);
alter table public.push_recovery_cutoffs enable row level security;
revoke all on public.push_recovery_cutoffs from public, anon, authenticated;
grant all on public.push_recovery_cutoffs to service_role;

create function public.push_session_valid(p_user_id uuid, p_session_id uuid)
returns boolean language sql volatile security definer set search_path = '' as $$
  select p_user_id is not null and p_session_id is not null and exists (
    select 1 from auth.sessions s
    where s.id = p_session_id and s.user_id = p_user_id and s.created_at is not null
      and (s.not_after is null or s.not_after > clock_timestamp())
      and not exists (
        select 1 from public.push_recovery_cutoffs c
        where c.user_id = p_user_id and s.created_at <= c.blocked_through
      )
  );
$$;
revoke all on function public.push_session_valid(uuid, uuid) from public, anon, authenticated;
grant execute on function public.push_session_valid(uuid, uuid) to service_role;

-- Se llama antes de guardar la contraseña y antes del cierre global de Auth. Es idempotente:
-- elimina tokens y cancela pendientes/leases en una sola transacción.
create function public.revoke_push_for_password_recovery()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
begin
  if v_uid is null or coalesce(auth.jwt()->>'session_id', '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'Sesión requerida.' using errcode = '42501';
  end if;
  v_sid := (auth.jwt()->>'session_id')::uuid;
  -- El registro toma el mismo bloqueo antes de validar su sesión. Si llegó antes,
  -- esta transacción revoca su token; si llegó después, verá la barrera.
  perform 1 from auth.users where id = v_uid for update;
  if not exists (select 1 from auth.sessions where id = v_sid and user_id = v_uid) then
    raise exception 'Sesión revocada.' using errcode = '42501';
  end if;
  insert into public.push_recovery_cutoffs(user_id, blocked_through)
    values (v_uid, clock_timestamp())
    on conflict (user_id) do update
      set blocked_through = greatest(public.push_recovery_cutoffs.blocked_through, excluded.blocked_through);
  update public.push_installations set expo_push_token = null, permission = 'denied',
      revoked_at = now(), token_generation = token_generation + 1, updated_at = now()
    where user_id = v_uid;
  update public.push_deliveries set state = 'cancelled', lease_id = null,
      leased_until = null, updated_at = now()
    where user_id = v_uid and state in ('pending', 'leased');
end $$;
revoke all on function public.revoke_push_for_password_recovery() from public, anon;
grant execute on function public.revoke_push_for_password_recovery() to authenticated;

-- Validación final de cada lease antes de llamar a Expo. Si la sesión desapareció
-- entre reserva y envío, se cancela la entrega y no se revela el token al proveedor.
create function public.validate_push_lease(p_delivery_id uuid, p_lease_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  select public.push_session_valid(i.user_id, i.session_id)
      and i.revoked_at is null and i.expo_push_token is not null
      and i.token_generation = d.token_generation and i.user_id = d.user_id
    into v_ok
    from public.push_deliveries d
    join public.push_installations i on i.id = d.installation_id
    where d.id = p_delivery_id and d.lease_id = p_lease_id and d.state = 'leased'
    for update of d;
  if not coalesce(v_ok, false) then
    update public.push_deliveries set state = 'cancelled', lease_id = null,
      leased_until = null, updated_at = now()
      where id = p_delivery_id and lease_id = p_lease_id and state = 'leased';
    return false;
  end if;
  return true;
end $$;
revoke all on function public.validate_push_lease(uuid, uuid) from public, anon, authenticated;
grant execute on function public.validate_push_lease(uuid, uuid) to service_role;

create or replace function public.register_push_installation(
  p_installation_id uuid, p_installation_secret text, p_expo_push_token text,
  p_platform text, p_permission text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
  v_hash text;
  v_old public.push_installations;
  v_fresh integer;
  v_changed boolean;
begin
  if v_uid is null then raise exception 'Autenticación requerida.' using errcode = '42501'; end if;
  if coalesce(auth.jwt()->>'session_id', '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'Sesión requerida.' using errcode = '42501';
  end if;
  v_sid := (auth.jwt()->>'session_id')::uuid;
  perform 1 from auth.users where id = v_uid for update;
  if not public.push_session_valid(v_uid, v_sid) then
    raise exception 'Sesión revocada.' using errcode = '42501';
  end if;
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
  insert into public.push_installations(id, user_id, session_id, secret_hash, platform, permission)
    values (p_installation_id, v_uid, v_sid, v_hash, p_platform, 'undetermined')
    on conflict (id) do nothing;
  get diagnostics v_fresh = row_count;
  select * into v_old from public.push_installations where id = p_installation_id for update;
  if v_old.secret_hash <> v_hash then
    raise exception 'Instalación no autorizada.' using errcode = '42501';
  end if;
  v_changed := v_fresh = 0 and (v_old.user_id is distinct from v_uid
    or v_old.session_id is distinct from v_sid
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
  update public.push_installations set user_id = v_uid, session_id = v_sid,
      expo_push_token = p_expo_push_token,
      platform = p_platform, permission = p_permission, revoked_at = null, updated_at = now(),
      token_generation = token_generation + case when v_changed then 1 else 0 end
    where id = p_installation_id;
end $$;

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
          or not public.push_session_valid(i.user_id, i.session_id)
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
        and public.push_session_valid(i.user_id, i.session_id)
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
        and public.push_session_valid(i.user_id, i.session_id)
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

