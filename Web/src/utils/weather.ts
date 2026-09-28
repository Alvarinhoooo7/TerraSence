// src/utils/weather.ts — el pronóstico guardado con cada medición, en una línea.
//
// La app guarda los días de Open-Meteo que consultó al medir. La tabla del
// backoffice los resume en lo que importa para interpretar el consejo:
// cuántos días seguidos llueve y si viene helada.

import type { ForecastDay, MeasurementWeather } from '../../backend/types';
import { dayMonth } from './format.ts';

/** Un día cuenta como lluvioso con 1 mm previsto o una probabilidad de 60 % o más. */
export const isRainy = (day: ForecastDay): boolean =>
  (day.precipitationMm ?? 0) >= 1 || (day.rainProbabilityPct ?? 0) >= 60;

export function summarizeForecast(weather: MeasurementWeather | null | undefined): string {
  const days = (weather?.forecast ?? []).filter((d) => typeof d?.date === 'string');
  if (days.length === 0) return 'Sin pronóstico';

  // Racha más larga de días lluviosos seguidos.
  let best = { start: -1, length: 0 };
  let start = -1;
  days.forEach((day, i) => {
    if (isRainy(day)) {
      if (start < 0) start = i;
      const length = i - start + 1;
      if (length > best.length) best = { start, length };
    } else {
      start = -1;
    }
  });

  const rainyCount = days.filter(isRainy).length;
  let rain: string;
  if (best.length >= 2) {
    const first = days[best.start]!;
    const last = days[best.start + best.length - 1]!;
    rain = `Lluvia ${best.length} días consecutivos (${dayMonth(first.date)} a ${dayMonth(last.date)})`;
  } else if (rainyCount === 1) {
    rain = `Lluvia el ${dayMonth(days.find(isRainy)!.date)}`;
  } else if (rainyCount > 1) {
    rain = `Lluvia en ${rainyCount} de ${days.length} días`;
  } else {
    rain = `Sin lluvia en ${days.length} ${days.length === 1 ? 'día' : 'días'}`;
  }

  const frost = days.find((d) => d.minimumTemperatureC != null && d.minimumTemperatureC <= 0);
  return frost ? `${rain} · helada el ${dayMonth(frost.date)}` : rain;
}
