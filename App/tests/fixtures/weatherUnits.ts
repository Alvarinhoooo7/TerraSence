/** Unidades de la respuesta de prueba; no son un relleno del adaptador de producción. */
export const WEATHER_UNITS = {
  current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C', precipitation: 'mm', wind_speed_10m: 'km/h' },
  daily_units: { time: 'iso8601', temperature_2m_min: '°C', temperature_2m_max: '°C', precipitation_sum: 'mm', precipitation_probability_max: '%' },
  utc_offset_seconds: -10800,
};
