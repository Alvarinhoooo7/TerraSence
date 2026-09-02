export interface CurrentWeather {
  temperatureC: number;
  precipitationMm: number;
  windKmh: number;
  rainProbabilityPct: number | null;
  dailyPrecipitationMm: number | null;
  minimumTemperatureC: number | null;
  maximumTemperatureC: number | null;
  fetchedAt: string;
}

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<CurrentWeather | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${latitude}&longitude=${longitude}` +
      '&current=temperature_2m,precipitation,wind_speed_10m' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum' +
      '&forecast_days=2&timezone=auto';
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json() as {
      current?: {
        temperature_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
        time?: string;
      };
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
        precipitation_sum?: number[];
      };
    };
    const current = payload.current;
    if (!current || typeof current.temperature_2m !== 'number') return null;
    return {
      temperatureC: current.temperature_2m,
      precipitationMm: current.precipitation ?? 0,
      windKmh: current.wind_speed_10m ?? 0,
      rainProbabilityPct: payload.daily?.precipitation_probability_max?.[0] ?? null,
      dailyPrecipitationMm: payload.daily?.precipitation_sum?.[0] ?? null,
      minimumTemperatureC: payload.daily?.temperature_2m_min?.[0] ?? null,
      maximumTemperatureC: payload.daily?.temperature_2m_max?.[0] ?? null,
      fetchedAt: current.time ?? new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
