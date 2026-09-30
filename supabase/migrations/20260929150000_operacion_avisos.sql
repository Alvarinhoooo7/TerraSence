-- Operación de los avisos: supervisión de la cola y retención de eventos y entregas.
--
-- Ambas funciones son sólo para la clave de servicio (o el cron, que corre como postgres):
-- ni anon ni authenticated pueden ejecutarlas, y ninguna devuelve tokens ni datos de personas.

-- ---------------------------------------------------------------------------
-- 1. Supervisión
-- ---------------------------------------------------------------------------
-- Una sola fila con lo que hay que mirar para saber si el circuito está sano:
--   queue_ready / queue_oldest_age   entregas listas para salir y cuánto llevan esperando (una
--                                    cola que envejece indica que el despachador no corre);
--   leases_expired                   reservas vencidas que nadie informó (trabajador caído);
--   retrying                         entregas que ya fallaron alguna vez y esperan su reintento;
--   failed_24h / failures_by_error   fallos definitivos recientes y su causa (InvalidCredentials
--                                    o «permanent:Expo HTTP 401» apuntan a una configuración);
--   uncertain_24h                    envíos sin respuesta de Expo, que pudieron duplicarse;
--   awaiting_receipt / receipts_overdue / oldest_ticket_age
--                                    tickets aceptados sin receipt; «overdue» pasa de una hora,
--                                    el primer receipt se consulta a los 15 minutos;
--   last_ticket_at                   último ticket aceptado por Expo;
--   vault_configured                 si Vault tiene los dos secretos que necesita el cron;
--   *_last_run / *_last_status       última ejecución de las tareas de despacho y retención.
create or replace function public.push_dispatch_health()
returns table(
  queue_ready bigint, queue_oldest_age interval, leased bigint, leases_expired bigint,
  retrying bigint, failed_24h bigint, failures_by_error jsonb, uncertain_24h bigint,
  awaiting_receipt bigint, receipts_overdue bigint, oldest_ticket_age interval,
  last_ticket_at timestamptz, vault_configured boolean,
  dispatch_last_run timestamptz, dispatch_last_status text,
  retention_last_run timestamptz, retention_last_status text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Servicio requerido.' using errcode = '42501';
  end if;
  return query
    select
      count(*) filter (where d.state = 'pending' and d.next_attempt_at <= now()),
      now() - min(d.next_attempt_at) filter (where d.state = 'pending' and d.next_attempt_at <= now()),
      count(*) filter (where d.state = 'leased'),
      count(*) filter (where d.state = 'leased' and d.leased_until < now()),
      count(*) filter (where d.state = 'pending' and d.attempts > 0),
      count(*) filter (where d.state = 'failed' and d.updated_at > now() - interval '24 hours'),
      coalesce((select jsonb_object_agg(f.error, f.n) from (
          select coalesce(x.last_error, 'sin_detalle') as error, count(*) as n
            from public.push_deliveries x
            where x.state = 'failed' and x.updated_at > now() - interval '24 hours'
            group by 1) f), '{}'::jsonb),
      count(*) filter (where d.last_error like 'uncertain:%' and d.updated_at > now() - interval '24 hours'),
      count(*) filter (where d.state in ('ticket_ok', 'receipt_leased')),
      count(*) filter (where d.state in ('ticket_ok', 'receipt_leased') and d.ticket_at < now() - interval '1 hour'),
      now() - min(d.ticket_at) filter (where d.state in ('ticket_ok', 'receipt_leased')),
      max(d.ticket_at),
      (select count(*) = 2 from vault.decrypted_secrets s
        where s.name in ('push_dispatch_url', 'push_dispatch_service_role_key')),
      (select r.start_time from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-dispatch' order by r.start_time desc limit 1),
      (select r.status from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-dispatch' order by r.start_time desc limit 1),
      (select r.start_time from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-retention' order by r.start_time desc limit 1),
      (select r.status from cron.job_run_details r join cron.job j on j.jobid = r.jobid
        where j.jobname = 'terrasense-push-retention' order by r.start_time desc limit 1)
    from public.push_deliveries d;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Retención
-- ---------------------------------------------------------------------------
-- La bandeja conserva un aviso hasta su vencimiento (push_alerts.expires_at, 30 días desde
-- el evento). Pasado ese plazo el evento ya no se muestra ni se despacha, así que se borra
-- junto con sus destinatarios y entregas (ON DELETE CASCADE). Además se retiran:
--   - las instalaciones sin token y sin actividad en 30 días (cierres de sesión, tokens
--     inválidos, permisos negados): la app vuelve a registrarse con su secreto si regresa;
--   - el historial de ejecuciones de cron de estas tareas con más de 7 días, que de otro modo
--     crece con una fila por minuto.
-- Devuelve cuánto borró de cada cosa.
create or replace function public.purge_push_notifications()
returns table(alerts_deleted bigint, installations_deleted bigint, job_runs_deleted bigint)
language plpgsql security definer set search_path = '' as $$
declare v_alerts bigint; v_installations bigint; v_runs bigint;
begin
  delete from public.push_alerts where expires_at <= now();
  get diagnostics v_alerts = row_count;
  delete from public.push_installations
    where expo_push_token is null and updated_at < now() - interval '30 days';
  get diagnostics v_installations = row_count;
  delete from cron.job_run_details
    where start_time < now() - interval '7 days'
      and jobid in (select jobid from cron.job where jobname like 'terrasense-push-%');
  get diagnostics v_runs = row_count;
  return query select v_alerts, v_installations, v_runs;
end $$;

-- Una vez al día, fuera de las horas de uso (03:17 UTC).
do $cron_setup$
begin
  if current_database() = coalesce(current_setting('cron.database_name', true), 'postgres') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('terrasense-push-retention', '17 3 * * *', 'select public.purge_push_notifications()');
  end if;
end $cron_setup$;

revoke all on function public.push_dispatch_health(), public.purge_push_notifications()
  from public, anon, authenticated, service_role;
grant execute on function public.push_dispatch_health() to service_role;
grant execute on function public.purge_push_notifications() to service_role;
