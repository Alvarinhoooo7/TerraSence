export interface ForecastDay {
  date: string;
  minimumTemperatureC: number | null;
  maximumTemperatureC: number | null;
  precipitationMm: number | null;
  rainProbabilityPct: number | null;
}

export interface CurrentWeather {
  forecast: ForecastDay[];
  source: 'Open-Meteo';
  timezone: string;
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
      '&forecast_days=6&timezone=auto';
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json() as {
      timezone?: string;
      current?: {
        temperature_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
        time?: string;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
        precipitation_sum?: number[];
      };
    };
    const current = payload.current;
    if (!current || typeof current.temperature_2m !== 'number' || !Number.isFinite(current.temperature_2m)) return null;
    const today = current.time?.slice(0, 10);
    if (!today) return null;
    const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
    const forecast = Array.from({ length: 5 }, (_, offset): ForecastDay => {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset + 1);
      const key = date.toISOString().slice(0, 10);
      const index = payload.daily?.time?.indexOf(key) ?? -1;
      return {
        date: key,
        minimumTemperatureC: finite(payload.daily?.temperature_2m_min?.[index]),
        maximumTemperatureC: finite(payload.daily?.temperature_2m_max?.[index]),
        precipitationMm: finite(payload.daily?.precipitation_sum?.[index]),
        rainProbabilityPct: finite(payload.daily?.precipitation_probability_max?.[index]),
      };
    });
    return {
      forecast,
      source: 'Open-Meteo',
      timezone: payload.timezone ?? 'auto',
      temperatureC: current.temperature_2m,
      precipitationMm: current.precipitation ?? 0,
      windKmh: current.wind_speed_10m ?? 0,
      rainProbabilityPct: payload.daily?.precipitation_probability_max?.[0] ?? null,
      dailyPrecipitationMm: payload.daily?.precipitation_sum?.[0] ?? null,
      minimumTemperatureC: payload.daily?.temperature_2m_min?.[0] ?? null,
      maximumTemperatureC: payload.daily?.temperature_2m_max?.[0] ?? null,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
