// Lectura en lenguaje claro del clima de Open-Meteo: qué tiempo hace ahora, cómo viene
// el día y un resumen de los próximos días. Describe el pronóstico; no decide labores:
// qué hacer con un día adverso se decide en contextualAdvice.ts. Lo único compartido es
// `GENERAL_WEATHER_RISK`, los umbrales que definen «día adverso» para todo el motor.

import type { CurrentWeather, ForecastDay } from '../services/weatherService';
import type { AppLanguage } from '../types/preferences';

export type GeneralWeatherRisk = 'rain' | 'frost' | 'heat';

/**
 * Umbrales generales que marcan un día del pronóstico como adverso, sin especie indicada.
 * Viven aquí porque los usan la comparación de ventanas (`compareForecastWindows`), el plan
 * de labores (`contextualAdvice.ts`) y la fusión con los criterios por especie (§9.2).
 */
export const GENERAL_WEATHER_RISK = {
  rainAtOrAboveMm: 5,
  rainProbabilityAtOrAbovePct: 60,
  frostAtOrBelowC: 0,
  heatAtOrAboveC: 35,
} as const;

/** Riesgos generales de un día del pronóstico, bajo `GENERAL_WEATHER_RISK`. */
export function generalRisksOfDay(day: ForecastDay): GeneralWeatherRisk[] {
  const risks: GeneralWeatherRisk[] = [];
  if ((day.precipitationMm != null && day.precipitationMm >= GENERAL_WEATHER_RISK.rainAtOrAboveMm)
    || (day.rainProbabilityPct != null && day.rainProbabilityPct >= GENERAL_WEATHER_RISK.rainProbabilityAtOrAbovePct)) risks.push('rain');
  if (day.minimumTemperatureC != null && day.minimumTemperatureC <= GENERAL_WEATHER_RISK.frostAtOrBelowC) risks.push('frost');
  if (day.maximumTemperatureC != null && day.maximumTemperatureC >= GENERAL_WEATHER_RISK.heatAtOrAboveC) risks.push('heat');
  return risks;
}

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

function joinDayNames(indices: number[], days: ForecastDay[], language: AppLanguage): string {
  const en = language === 'en';
  const names = indices.map(i => dayName(days[i].date, i, language));
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')} ${en ? 'and' : 'y'} ${names[names.length - 1]}`
    : names[0] ?? '';
}

/**
 * Compara ventanas temporales del pronóstico corto (CO01–CO05, T28).
 * Un día con datos faltantes (`precipitationMm`, `minimumTemperatureC` o `maximumTemperatureC` en `null`)
 * nunca se clasifica como ventana favorable frente a un día completo.
 */
export function compareForecastWindows(days: ForecastDay[], language: AppLanguage = 'es'): string | null {
  if (!days.length) return null;
  const en = language === 'en';
  const known = days.filter(d => [d.precipitationMm, d.rainProbabilityPct, d.minimumTemperatureC, d.maximumTemperatureC].some(v => v != null));
  if (!known.length) return null;

  const favorable: number[] = [];
  const risky: number[] = [];
  const incomplete: number[] = [];

  days.forEach((day, index) => {
    const hasObstacle = generalRisksOfDay(day).length > 0;
    const isComplete = day.precipitationMm != null && day.minimumTemperatureC != null && day.maximumTemperatureC != null;
    if (hasObstacle) {
      risky.push(index);
    } else if (isComplete) {
      favorable.push(index);
    } else {
      incomplete.push(index);
    }
  });

  const parts: string[] = [];
  if (favorable.length > 0 && risky.length > 0) {
    const favList = joinDayNames(favorable, days, language);
    const riskyList = joinDayNames(risky, days, language);
    parts.push(en
      ? `Clearer window for field work ${favList}, compared with more adverse conditions ${riskyList}.`
      : `Ventana más despejada para labores de campo ${favList}, frente a condiciones más adversas ${riskyList}.`);
  } else if (favorable.length > 0) {
    const maxTemps = favorable.map(i => days[i].maximumTemperatureC as number);
    if (favorable.length >= 2 && Math.min(...maxTemps) < Math.max(...maxTemps)) {
      const bestIdx = favorable.reduce((best, cur) => (days[cur].maximumTemperatureC as number) < (days[best].maximumTemperatureC as number) ? cur : best, favorable[0]);
      const bestName = dayName(days[bestIdx].date, bestIdx, language);
      const bestMax = decimal(days[bestIdx].maximumTemperatureC as number, language);
      parts.push(en
        ? `Assessed days without heavy rain, frost or extreme heat; lower relative thermal demand ${bestName} (${bestMax} °C high).`
        : `Días evaluados sin lluvia fuerte, helada ni calor extremo; menor exigencia térmica relativa ${bestName} (máxima de ${bestMax} °C).`);
    } else {
      const favList = joinDayNames(favorable, days, language);
      parts.push(en
        ? `Stable window across days with complete records (${favList}), without heavy rain, frost or extreme heat.`
        : `Ventana estable en los días con datos completos (${favList}), sin lluvia fuerte, helada ni calor extremo.`);
    }
  } else if (risky.length > 0) {
    parts.push(en
      ? 'No clear window across assessed days; all present significant rain, frost or extreme heat.'
      : 'Sin ventana despejada en los días evaluados; todos presentan lluvia relevante, helada o calor extremo.');
  }

  if (incomplete.length > 0) {
    const incList = joinDayNames(incomplete, days, language);
    parts.push(en
      ? `Not counted as a favorable window (${incList}) due to incomplete forecast records.`
      : `No se consideran como ventana favorable ${incList} por tener pronóstico incompleto.`);
  }

  return parts.length ? parts.join(' ') : null;
}

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
