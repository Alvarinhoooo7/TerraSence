-- Paginar con `p_offset` exige un orden total. `measured_at desc nulls last` no lo es:
-- dos lecturas con la misma hora —o varias sin hora, que `nulls last` deja juntas al
-- final— quedan en un orden que Postgres no promete, así que la misma fila podía
-- repetirse en una página y faltar en la siguiente. Se desempata por `id`, que es único.
--
-- La firma no cambia, por eso basta reemplazar el cuerpo: no hay sobrecargas ni permisos
-- que rehacer. El resto es idéntico a 20261029120000.

create or replace function public.admin_device_measurements(
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
     order by m.measured_at desc nulls last, m.id
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end $$;
