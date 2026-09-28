// Pruebas de las utilidades de presentación del backoffice.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  digitsOnly,
  exactDateTime,
  formatCoordinate,
  formatDeviceCode,
  num,
  personName,
  relativeTime,
} from '../src/utils/format.ts';
import { stageLabel, verdictMeta } from '../src/utils/verdict.ts';
import { summarizeForecast } from '../src/utils/weather.ts';

test('el ID del equipo se presenta en tres bloques y se acepta con guiones', () => {
  assert.equal(formatDeviceCode('482139057416628'), '48213-90574-16628');
  assert.equal(digitsOnly(' 48213-90574 16628 '), '482139057416628');
  assert.equal(formatDeviceCode('4821390'), '4821390');
});

test('num usa coma decimal, acepta cadenas y distingue el cero del dato ausente', () => {
  assert.equal(num('6.52', 1), '6,5');
  assert.equal(num(0, 1, '%'), '0,0 %');
  assert.equal(num(null), '—');
  assert.equal(num(Number.NaN), '—');
});

test('la coordenada va en texto plano con seis decimales y punto y coma', () => {
  assert.equal(formatCoordinate(-30.008954, '-71.482579'), '-30,008954 ; -71,482579');
  assert.equal(formatCoordinate(null, -71.4), 'Sin GPS');
});

test('la fecha exacta incluye segundos', () => {
  const iso = new Date(2026, 8, 28, 14, 3, 7).toISOString();
  assert.equal(exactDateTime(iso), '28-09-2026 14:03:07');
  assert.equal(exactDateTime(null), '—');
});

test('relativeTime escala de minutos a días', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  const hace = (ms) => new Date(now - ms).toISOString();
  assert.equal(relativeTime(hace(20_000), now), 'hace instantes');
  assert.equal(relativeTime(hace(10 * 60_000), now), 'hace 10 min');
  assert.equal(relativeTime(hace(3 * 3_600_000), now), 'hace 3 h');
  assert.equal(relativeTime(hace(25 * 3_600_000), now), 'ayer');
  assert.equal(relativeTime(null, now), '');
});

test('personName junta nombre y apellido y cae al respaldo sin datos', () => {
  assert.equal(personName('Ana', 'Soto'), 'Ana Soto');
  assert.equal(personName(null, ' '), '—');
});

test('un veredicto o una etapa desconocidos no rompen la fila', () => {
  assert.equal(verdictMeta('GREEN').label, 'Apto');
  assert.equal(verdictMeta('AZUL').label, 'Sin veredicto');
  assert.equal(stageLabel('floracion'), 'Floración');
  assert.equal(stageLabel('otra'), 'otra');
});

test('el pronóstico se resume en la racha de lluvia más larga', () => {
  const day = (date, mm, pct = 0, min = 5) => ({
    date,
    precipitationMm: mm,
    rainProbabilityPct: pct,
    minimumTemperatureC: min,
  });
  assert.equal(
    summarizeForecast({
      forecast: [
        day('2026-09-27', 0),
        day('2026-09-28', 3),
        day('2026-09-29', 0, 70),
        day('2026-09-30', 5),
        day('2026-10-01', 2),
        day('2026-10-02', 1),
        day('2026-10-03', 0),
      ],
    }),
    'Lluvia 5 días consecutivos (28-09 a 02-10)',
  );
  assert.equal(summarizeForecast({ forecast: [day('2026-09-28', 0), day('2026-09-29', 0)] }), 'Sin lluvia en 2 días');
  assert.equal(
    summarizeForecast({ forecast: [day('2026-09-28', 4), day('2026-09-29', 0, 0, -1)] }),
    'Lluvia el 28-09 · helada el 29-09',
  );
  assert.equal(summarizeForecast(null), 'Sin pronóstico');
});
