// Lectura en lenguaje claro del clima de Open-Meteo: qué tiempo hace ahora, cómo viene
// el día y un resumen de los próximos días. Describe el pronóstico; no decide labores.
// Las decisiones con umbrales viven en contextualAdvice.ts.

import type { CurrentWeather, ForecastDay } from '../services/weatherService';
import type { AppLanguage } from '../types/preferences';

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'showers' | 'snow' | 'storm';

/** Grupo visual y nombre de un código WMO. `null` si el código no llegó o no se reconoce. */
export function weatherKind(code: number | null | undefined): WeatherKind | null {
  if (code == null) return null;
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67)) return 'rain';
  if (code >= 80 && code <= 82) return 'showers';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return null;
}

const KIND_LABEL: Record<WeatherKind, [string, string]> = {
  clear: ['Despejado', 'Clear'], partly: ['Parcialmente nublado', 'Partly cloudy'], cloudy: ['Nublado', 'Cloudy'],
  fog: ['Niebla', 'Fog'], drizzle: ['Llovizna', 'Drizzle'], rain: ['Lluvia', 'Rain'], showers: ['Chubascos', 'Showers'],
  snow: ['Nieve', 'Snow'], storm: ['Tormenta', 'Thunderstorm'],
};

export const weatherKindLabel = (kind: WeatherKind, language: AppLanguage = 'es') => KIND_LABEL[kind][language === 'en' ? 1 : 0];

const WET: readonly WeatherKind[] = ['drizzle', 'rain', 'showers', 'storm'];

/** Llueve en la consulta: el proveedor acumuló agua en el último intervalo o informa un tiempo lluvioso. */
export function isRainingNow(weather: Pick<CurrentWeather, 'precipitationMm' | 'weatherCode'> | null | undefined): boolean {
  if (!weather) return false;
  const kind = weatherKind(weather.weatherCode);
  return (weather.precipitationMm ?? 0) > 0 || (kind !== null && WET.includes(kind));
}

/** Día con lluvia relevante para planificar: 1 mm o más, o probabilidad de 60 % o más. */
export const isRainyDay = (day: ForecastDay) => (day.precipitationMm ?? 0) >= 1 || (day.rainProbabilityPct ?? 0) >= 60;

const WEEKDAYS = { es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };

/** «mañana» para el primer día del pronóstico; el nombre del día para los demás. */
function dayName(date: string, index: number, language: AppLanguage): string {
  if (index === 0) return language === 'en' ? 'tomorrow' : 'mañana';
  const day = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(day.getTime())) return date;
  return `${language === 'en' ? 'on ' : 'el '}${WEEKDAYS[language][day.getUTCDay()]}`;
}

const decimal = (value: number, language: AppLanguage) =>
  (Math.round(value * 10) / 10).toString().replace('.', language === 'en' ? '.' : ',');

/**
 * Resumen breve de los próximos días: cuándo llueve y cuánto, desde cuándo se seca,
 * rango de máximas y si aparecen heladas o calor bajo los mismos umbrales orientativos
 * de las recomendaciones. `null` si no hay días con datos.
 */
export function forecastOutlook(days: ForecastDay[], language: AppLanguage = 'es'): string | null {
  const en = language === 'en';
  const known = days.filter(d => [d.precipitationMm, d.rainProbabilityPct, d.minimumTemperatureC, d.maximumTemperatureC].some(v => v != null));
  if (!known.length) return null;
  const parts: string[] = [];

  const rainy = days.map((day, index) => ({ day, index })).filter(({ day }) => isRainyDay(day));
  if (rainy.length) {
    const list = rainy.map(({ day, index }) => {
      const amount = day.precipitationMm != null ? `${decimal(day.precipitationMm, language)} mm` : null;
      const chance = day.rainProbabilityPct != null ? `${day.rainProbabilityPct} %` : null;
      const detail = [amount, chance].filter(Boolean).join(', ');
      return `${dayName(day.date, index, language)}${detail ? ` (${detail})` : ''}`;
    });
    const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')} ${en ? 'and' : 'y'} ${list[list.length - 1]}` : list[0];
    parts.push(en ? `Rain expected ${joined}.` : `Se espera lluvia ${joined}.`);
    const lastRain = rainy[rainy.length - 1].index;
    if (lastRain < days.length - 1) {
      const next = days[lastRain + 1];
      parts.push(en ? `From ${WEEKDAYS.en[new Date(`${next.date}T12:00:00Z`).getUTCDay()]}, drier days.`
        : `Desde el ${WEEKDAYS.es[new Date(`${next.date}T12:00:00Z`).getUTCDay()]}, días más secos.`);
    }
  } else {
    parts.push(en ? 'No significant rain expected in the coming days.' : 'No se espera lluvia importante en los próximos días.');
  }

  const highs = days.map(d => d.maximumTemperatureC).filter((v): v is number => v != null);
  if (highs.length) {
    const low = Math.round(Math.min(...highs)), high = Math.round(Math.max(...highs));
    parts.push(en ? `Highs between ${low} and ${high} °C.` : `Máximas entre ${low} y ${high} °C.`);
  }
  const frost = days.some(d => d.minimumTemperatureC != null && d.minimumTemperatureC <= 0);
  const heat = days.some(d => d.maximumTemperatureC != null && d.maximumTemperatureC >= 35);
  parts.push(frost && heat ? (en ? 'Frost and heat are both possible.' : 'Hay riesgo de helada y de calor.')
    : frost ? (en ? 'Frost is possible.' : 'Hay riesgo de helada.')
    : heat ? (en ? 'Very hot days are possible.' : 'Hay riesgo de calor fuerte.')
    : (en ? 'No frost or extreme heat expected.' : 'Sin heladas ni calor extremo previstos.'));
  return parts.join(' ');
}
