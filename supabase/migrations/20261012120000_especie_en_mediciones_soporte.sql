-- El backoffice muestra la especie que el agricultor indicó al medir. Se lee de la
-- instantánea guardada (diagnosis -> presentation -> species), igual que la app: el
-- `crop_id` de lecturas antiguas conserva perfiles del prototipo, que no son una especie
-- elegida. Cambia el tipo de retorno, por eso la función se elimina y se vuelve a crear.

drop function public.admin_device_measurements(uuid, integer);

create function public.admin_device_measurements(p_device_id uuid, p_limit integer default 5)
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
           case when jsonb_typeof(m.diagnosis -> 'presentation' -> 'species') = 'object'
                then m.diagnosis -> 'presentation' -> 'species' end
      from public.soil_measurements m
     where m.device_id = p_device_id
     order by m.measured_at desc nulls last
     limit least(greatest(coalesce(p_limit, 5), 1), 50);
end $$;

alter function public.admin_device_measurements(uuid, integer) owner to postgres;
revoke all on function public.admin_device_measurements(uuid, integer) from public, anon;
grant execute on function public.admin_device_measurements(uuid, integer) to authenticated, service_role;
