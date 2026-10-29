-- Prueba del historial de mediciones del backoffice contra una base local con las
-- migraciones aplicadas:
--
--   docker exec -i supabase_db_TerraSense psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/scripts/test_historial_soporte.sql
--
-- Cubre `measurement_species`, `admin_device_measurements` y `admin_device_species`: de
-- dónde sale la especie, los filtros del servidor, el orden total que exige paginar, los
-- topes de la ventana, el inventario que alimenta el filtro y quién puede llamarlas.
--
-- Todo ocurre en una transacción que termina en rollback. Cualquier incumplimiento lanza
-- una excepción con el prefijo FALLA y detiene el guion. La persona de soporte se simula
-- con el rol real de Postgres (authenticated), así también se comprueban los permisos.

\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

\set staff '''44444444-4444-4444-8444-444444444444''::uuid'
\set other '''55555555-5555-4555-8555-555555555555''::uuid'
\set d1    '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa''::uuid'
\set d2    '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb''::uuid'
-- Las lecturas de :d1 comparten prefijo y se distinguen por su última letra, que es
-- también su orden por `id`: así el desempate del orden se puede leer de un tirón.
\set m1 '''aaaaaaaa-0000-4000-8000-00000000000a''::uuid'
\set m2 '''aaaaaaaa-0000-4000-8000-00000000000b''::uuid'
\set m3 '''aaaaaaaa-0000-4000-8000-00000000000c''::uuid'
\set m4 '''aaaaaaaa-0000-4000-8000-00000000000d''::uuid'
\set m5 '''aaaaaaaa-0000-4000-8000-00000000000e''::uuid'
\set m6 '''aaaaaaaa-0000-4000-8000-00000000000f''::uuid'

begin;

create function public.t_assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FALLA: %', p_msg; end if;
end $$;

-- Simula a una persona (o a anon) con el rol real de Postgres; reset role vuelve a postgres.
create function public.t_as(p_uid uuid, p_role text default 'authenticated') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
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

-- El historial que devuelve la función, leído como la inicial de cada lectura y en el
-- orden en que lo entregó: 'fdcabe' es el orden esperado del historial completo.
create function public.t_historial(p_device uuid, p_limit integer default 50,
  p_offset integer default 0, p_stage text default null, p_species_id text default null,
  p_without_species boolean default false) returns text
language sql as $$
  select coalesce(string_agg(right(q.id::text, 1), '' order by q.n), '')
    from (select row_number() over () as n, m.id
            from public.admin_device_measurements(p_device, p_limit, p_offset, p_stage,
                                                 p_species_id, p_without_species) m) q
$$;

grant execute on function public.t_assert(boolean, text), public.t_as(uuid, text),
  public.t_fails(text, text), public.t_historial(uuid, integer, integer, text, text, boolean)
  to public, anon, authenticated, service_role;

-- La instantánea de la especie tal como la guarda la app dentro de `diagnosis`.
create function public.t_especie(p_id text, p_es text, p_catalogo text) returns jsonb
language sql immutable as $$
  select jsonb_build_object('presentation', jsonb_build_object('species', jsonb_build_object(
    'id', p_id, 'es', p_es, 'en', p_es, 'scientific', p_es, 'catalogVersion', p_catalogo)))
$$;

create function public.t_medir(p_id uuid, p_device uuid, p_stage text, p_at timestamptz,
  p_crop text, p_diagnosis jsonb) returns void language plpgsql as $$
begin
  insert into public.soil_measurements(id, device_id, crop_id, vwc_percent, soil_temp_c,
    ec_us_cm, ph, verdict, verdict_title, action_summary, phenological_stage, measured_at,
    diagnosis)
  values (p_id, p_device, p_crop, 25, 18, 900, 6.5, 'GREEN', 'Suelo en rango',
    'Mantener el riego', p_stage, p_at, p_diagnosis);
end $$;

-- ---------------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------------
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
values (:staff, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'akurasoporte@gmail.com', 'x', now()),
       (:other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        't-other@example.com', 'x', now());
insert into public.admin_support_users(email, full_name, user_id)
  values ('akurasoporte@gmail.com', 'Soporte', :staff);
insert into public.devices(id, device_code, name) values
  (:d1, '123456789012345', 'Sonda 1'), (:d2, '123456789012346', 'Sonda 2');

-- Dos lecturas con la misma hora exacta (m1 y m2), una guardada sin especie, otra sin
-- hora, y una especie distinta de `crop_id` a propósito.
select public.t_medir(:m1, :d1, 'vegetativo', '2026-10-20 10:00+00', 'tomate',
         public.t_especie('sp.tomate', 'Tomate', '1.0.0'));
select public.t_medir(:m2, :d1, 'floracion', '2026-10-20 10:00+00', 'tomate',
         public.t_especie('sp.tomate', 'Tomate', '1.0.0'));
select public.t_medir(:m3, :d1, 'vegetativo', '2026-10-21 10:00+00', 'tomate',
         public.t_especie('sp.lechuga', 'Lechuga', '1.0.0'));
select public.t_medir(:m4, :d1, 'vegetativo', '2026-10-22 10:00+00', 'prototipo_v1', '{}'::jsonb);
select public.t_medir(:m5, :d1, 'cosecha', null, 'prototipo_v1',
         '{"presentation":{"species":null}}'::jsonb);
select public.t_medir(:m6, :d1, 'pre_siembra', '2026-10-23 10:00+00', 'tomate',
         public.t_especie('sp.tomate', 'Tomate', '1.2.0'));
-- Otro equipo con la misma especie: no debe aparecer en el historial ni en el inventario
-- de :d1.
select public.t_medir('bbbbbbbb-0000-4000-8000-00000000000a'::uuid, :d2, 'vegetativo',
         '2026-10-24 10:00+00', 'tomate', public.t_especie('sp.tomate', 'Tomate', '1.2.0'));

-- ---------------------------------------------------------------------------
-- 1. La especie sale de la instantánea, nunca de `crop_id`
-- ---------------------------------------------------------------------------
select public.t_assert(public.measurement_species('{}'::jsonb) is null,
  'una lectura sin instantánea no tiene especie');
select public.t_assert(public.measurement_species('{"presentation":{"species":null}}'::jsonb) is null,
  'una instantánea con especie nula es medir sin especie');
select public.t_assert(public.measurement_species('{"presentation":{"species":"tomate"}}'::jsonb) is null,
  'una especie que no es objeto no se devuelve a medias');
select public.t_as(:staff);
select public.t_assert(
  (select species ->> 'id' from public.admin_device_measurements(:d1, 50, 0, null, null, false)
    where id = :m3) = 'sp.lechuga',
  'la especie es la de la instantánea, no el perfil de crop_id');

-- ---------------------------------------------------------------------------
-- 2. Orden total: la hora, y el id cuando la hora empata o falta
-- ---------------------------------------------------------------------------
select public.t_assert(public.t_historial(:d1) = 'fdcabe',
  'el historial va de la lectura más reciente a la más antigua, m1 antes que m2 por id y la lectura sin hora al final');

-- ---------------------------------------------------------------------------
-- 3. Filtros del servidor
-- ---------------------------------------------------------------------------
select public.t_assert(public.t_historial(:d1, 50, 0, 'vegetativo') = 'dca',
  'el filtro por etapa deja sólo las lecturas de esa etapa');
select public.t_assert(public.t_historial(:d1, 50, 0, 'inexistente') = '',
  'una etapa fuera del CHECK no coincide con nada y no rompe la consulta');
select public.t_assert(public.t_historial(:d1, 50, 0, null, 'sp.tomate') = 'fab',
  'el filtro por especie usa el id de la instantánea');
select public.t_assert(public.t_historial(:d1, 50, 0, null, 'sp.lechuga') = 'c',
  'la lechuga no arrastra a las lecturas cuyo crop_id dice tomate');
select public.t_assert(public.t_historial(:d1, 50, 0, 'vegetativo', 'sp.tomate') = 'a',
  'etapa y especie se combinan');
select public.t_assert(public.t_historial(:d1, 50, 0, null, null, true) = 'de',
  '«sin especie» trae las guardadas sin especie, con o sin instantánea');
select public.t_assert(public.t_historial(:d1, 50, 0, null, 'sp.tomate', true) = 'de',
  'un id de especie junto a la bandera no contradice «sin especie»');
select public.t_assert(public.t_historial(:d1, 50, 0, null, 'sp.inexistente') = '',
  'una especie que el equipo nunca midió devuelve el historial vacío');

-- ---------------------------------------------------------------------------
-- 4. La ventana: paginar no puede repetir ni saltarse una lectura
-- ---------------------------------------------------------------------------
select public.t_assert(
  public.t_historial(:d1, 2, 0) || public.t_historial(:d1, 2, 2) || public.t_historial(:d1, 2, 4)
    = 'fdcabe',
  'tres páginas de dos reconstruyen el historial completo, sin repetir ni saltar');
select public.t_assert(public.t_historial(:d1, 50, 6) = '',
  'una página más allá del final queda vacía');
select public.t_assert(length(public.t_historial(:d1, 0)) = 1,
  'un tope de cero lecturas se corrige a una, en lugar de fallar');
select public.t_assert(public.t_historial(:d1, 50, -5) = 'fdcabe',
  'un desplazamiento negativo se corrige a cero');
reset role;
insert into public.soil_measurements(device_id, crop_id, vwc_percent, soil_temp_c, ec_us_cm,
  ph, verdict, verdict_title, phenological_stage, measured_at, diagnosis)
select :d2, 'tomate', 25, 18, 900, 6.5, 'GREEN', 'Suelo en rango', 'vegetativo',
  '2026-10-01 10:00+00'::timestamptz + (n * interval '1 minute'),
  public.t_especie('sp.tomate', 'Tomate', '1.2.0')
from generate_series(1, 205) as n;
select public.t_as(:staff);
select public.t_assert(length(public.t_historial(:d2, 9999)) = 200,
  'el tope de la función son 200 lecturas, aunque se pidan más');

-- ---------------------------------------------------------------------------
-- 5. Inventario de especies: las opciones del filtro y su recuento
-- ---------------------------------------------------------------------------
select public.t_assert(
  (select string_agg(coalesce(species ->> 'id', 'sin-especie') || ':' || measurements, ' '
            order by q.n)
     from (select row_number() over () as n, * from public.admin_device_species(:d1)) q)
    = 'sp.tomate:3 sp.lechuga:1 sin-especie:2',
  'el inventario cuenta por especie, ordena por la lectura más reciente y deja «sin especie» al final');
select public.t_assert(
  (select species ->> 'catalogVersion' from public.admin_device_species(:d1)
    where species ->> 'id' = 'sp.tomate') = '1.2.0',
  'de una misma especie queda la instantánea más reciente, no la primera');
select public.t_assert(
  (select last_measured_at from public.admin_device_species(:d1)
    where species is null) = '2026-10-22 10:00+00'::timestamptz,
  'la última lectura del grupo sin especie ignora la que no tiene hora');
select public.t_assert(
  (select measurements from public.admin_device_species(:d2)
    where species ->> 'id' = 'sp.tomate') = 206,
  'el inventario es del equipo consultado y cuenta todas sus lecturas, no sólo una página');
select public.t_assert(
  (select count(*) from public.admin_device_species(
     '00000000-0000-4000-8000-000000000000'::uuid)) = 0,
  'un equipo sin lecturas no tiene opciones de filtro');

-- ---------------------------------------------------------------------------
-- 6. Quién puede llamarlas
-- ---------------------------------------------------------------------------
select public.t_as(:other);
select public.t_fails(format('select public.t_historial(%L)', :d1), '42501');
select public.t_fails(format('select public.admin_device_species(%L)', :d1), '42501');
reset role;
select public.t_as(null, 'anon');
select public.t_fails(format('select public.t_historial(%L)', :d1), '42501');
select public.t_fails(format('select public.admin_device_species(%L)', :d1), '42501');
select public.t_fails('select public.measurement_species(''{}''::jsonb)', '42501');
reset role;
update public.admin_support_users set is_active = false where user_id = :staff;
select public.t_as(:staff);
select public.t_fails(format('select public.t_historial(%L)', :d1), '42501');
reset role;

rollback;
\echo test_historial_soporte.sql: TODO CORRECTO (rollback ejecutado)
