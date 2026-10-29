-- El backoffice divide el historial de un equipo por etapa y por especie, igual que la
-- app. Para que los filtros sean fieles hacen falta dos cosas que la función anterior no
-- daba: traer más de 50 lecturas (agrupar por especie sobre cinco filas no dice nada) y
-- filtrar en el servidor, para no descargar el historial completo en cada cambio de
-- filtro. Se añade además el inventario de especies del equipo: las opciones del filtro
-- no pueden deducirse de las filas ya filtradas.
--
-- La especie se lee de la instantánea guardada (diagnosis -> presentation -> species),
-- nunca de `crop_id`: el de lecturas antiguas conserva perfiles del prototipo, que no son
-- una especie elegida. La regla vive en `measurement_species` para que las dos funciones
-- la compartan en lugar de repetirla.

create or replace function public.measurement_species(p_diagnosis jsonb)
returns jsonb
language sql immutable
set search_path to 'public'
as $$
  select case when jsonb_typeof(p_diagnosis -> 'presentation' -> 'species') = 'object'
              then p_diagnosis -> 'presentation' -> 'species' end
$$;

alter function public.measurement_species(jsonb) owner to postgres;
revoke all on function public.measurement_species(jsonb) from public, anon;
grant execute on function public.measurement_species(jsonb) to authenticated, service_role;

comment on function public.measurement_species(jsonb) is
  'Especie que el agricultor indicó al medir, leída de la instantánea del diagnóstico; null si midió sin especie.';

-- Cambia la firma, por eso la función se elimina y se vuelve a crear: conservar la
-- anterior dejaría dos sobrecargas y la llamada por nombre quedaría ambigua.
drop function public.admin_device_measurements(uuid, integer);

create function public.admin_device_measurements(
  p_device_id uuid,
  p_limit integer default 50,
  p_offset integer default 0,
  p_stage text default null,
  p_species_id text default null,
  p_without_species boolean default false
)
returns table(
  id uuid, measured_at timestamp with time zone, phenological_stage text,
  vwc_percent numeric, soil_temp_c numeric, ec_us_cm integer, ph numeric,
  nitrogen integer, phosphorus integer, potassium integer,
  canopy_temp_c numeric, canopy_humidity_pct numeric, air_pressure_hpa numeric, battery_percent integer,
  weather jsonb, verdict text, verdict_title text, action_summary text, latitude numeric, longitude numeric,
  species jsonb
)
language plpgsql stable security definer
set search_path to 'public'
as $$
begin
    perform public.assert_support_staff();
    return query
    select m.id, m.measured_at, m.phenological_stage, m.vwc_percent, m.soil_temp_c, m.ec_us_cm, m.ph,
           m.nitrogen, m.phosphorus, m.potassium, m.canopy_temp_c, m.canopy_humidity_pct,
           m.air_pressure_hpa, m.battery_percent::integer,
           nullif(m.diagnosis -> 'weather', 'null'::jsonb),
           m.verdict::text, m.verdict_title, m.action_summary, m.latitude, m.longitude,
           public.measurement_species(m.diagnosis)
      from public.soil_measurements m
     where m.device_id = p_device_id
       -- Cada filtro nulo deja pasar todo; una etapa fuera del CHECK simplemente no
       -- coincide con ninguna fila.
       and (p_stage is null or m.phenological_stage = p_stage)
       -- «Sin especie» es una opción del filtro, no la ausencia de filtro, así que viaja
       -- en su propio parámetro: un id de especie no puede expresarla.
       and (not coalesce(p_without_species, false) or public.measurement_species(m.diagnosis) is null)
       and (p_species_id is null or coalesce(p_without_species, false)
            or public.measurement_species(m.diagnosis) ->> 'id' = p_species_id)
     order by m.measured_at desc nulls last
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end $$;

alter function public.admin_device_measurements(uuid, integer, integer, text, text, boolean) owner to postgres;
revoke all on function public.admin_device_measurements(uuid, integer, integer, text, text, boolean) from public, anon;
grant execute on function public.admin_device_measurements(uuid, integer, integer, text, text, boolean) to authenticated, service_role;

-- Inventario de especies del equipo, para las opciones del filtro y su recuento. Agrupa
-- por el id de la especie y devuelve la instantánea más reciente de cada una: una misma
-- especie medida con distintas versiones del catálogo o de las reglas es una sola opción.
-- La fila de `species` nula son las lecturas guardadas sin especie y va al final, como en
-- la app.
create function public.admin_device_species(p_device_id uuid)
returns table(species jsonb, measurements integer, last_measured_at timestamp with time zone)
language plpgsql stable security definer
set search_path to 'public'
as $$
begin
    perform public.assert_support_staff();
    return query
    select (array_agg(s.species order by m.measured_at desc nulls last))[1],
           count(*)::integer,
           max(m.measured_at)
      from public.soil_measurements m
      cross join lateral (select public.measurement_species(m.diagnosis) as species) s
     where m.device_id = p_device_id
     group by s.species ->> 'id'
     order by (s.species ->> 'id') is null, max(m.measured_at) desc nulls last;
end $$;

alter function public.admin_device_species(uuid) owner to postgres;
revoke all on function public.admin_device_species(uuid) from public, anon;
grant execute on function public.admin_device_species(uuid) to authenticated, service_role;
