/** Unidades de la respuesta de prueba; no son un relleno del adaptador de producción. */
export const WEATHER_UNITS = {
  current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C', precipitation: 'mm', wind_speed_10m: 'km/h' },
  daily_units: { time: 'iso8601', temperature_2m_min: '°C', temperature_2m_max: '°C', precipitation_sum: 'mm', precipitation_probability_max: '%' },
  utc_offset_seconds: -10800,
};

/**
 * Fixture reproducible de una respuesta Open-Meteo para Chile central (Valle del Maipo,
 * America/Santiago, UTC-3) con variables actuales, diarias y las 5 series horarias de E3.
 */
export const CHILE_OPEN_METEO_FIXTURE = {
  latitude: -33.668,
  longitude: -70.929,
  timezone: 'America/Santiago',
  utc_offset_seconds: -10800,
  current_units: {
    time: 'iso8601',
    interval: 'seconds',
    temperature_2m: '°C',
    precipitation: 'mm',
    wind_speed_10m: 'km/h',
    weather_code: 'wmo code',
  },
  current: {
    time: '2026-10-12T18:30',
    interval: 900,
    temperature_2m: 19.4,
    precipitation: 0,
    wind_speed_10m: 14.2,
    weather_code: 2,
  },
  daily_units: {
    time: 'iso8601',
    temperature_2m_min: '°C',
    temperature_2m_max: '°C',
    precipitation_sum: 'mm',
    precipitation_probability_max: '%',
    weather_code: 'wmo code',
  },
  daily: {
    time: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
    temperature_2m_min: [6.2, 4.8, 5.5, 7.0, 8.1, 7.4],
    temperature_2m_max: [23.5, 21.0, 19.8, 22.4, 25.1, 24.0],
    precipitation_sum: [12.0, 0.0, 2.4, 0.0, 0.0, 0.0],
    precipitation_probability_max: [80, 10, 65, 5, 0, 5],
    weather_code: [61, 1, 61, 0, 0, 1],
  },
  hourly_units: {
    time: 'iso8601',
    temperature_2m: '°C',
    relative_humidity_2m: '%',
    precipitation: 'mm',
    precipitation_probability: '%',
    wind_speed_10m: 'km/h',
  },
  hourly: {
    time: [
      '2026-10-12T16:00',
      '2026-10-12T17:00',
      '2026-10-12T18:00',
      '2026-10-12T19:00',
      '2026-10-12T20:00',
      '2026-10-12T21:00',
      '2026-10-12T22:00',
      '2026-10-12T23:00',
      '2026-10-13T00:00',
      '2026-10-13T01:00',
    ],
    temperature_2m: [23.5, 21.8, 19.6, 16.4, 14.1, 12.0, 10.2, 8.8, 7.5, 6.4],
    relative_humidity_2m: [42, 48, 55, 64, 71, 78, 82, 86, 88, 90],
    precipitation: [5.0, 4.0, 0.5, 1.2, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0],
    precipitation_probability: [80, 75, 40, 55, 45, 20, 15, 10, 10, 5],
    wind_speed_10m: [22.0, 19.5, 15.0, 12.4, 9.8, 8.0, 6.5, 5.2, 4.8, 4.1],
  },
};
