// Pruebas de `src/utils/format.ts` y `src/utils/verdict.ts`.
//
// Cubren exactamente los casos que la auditoría encontró rotos en pantalla, no
// el formateo en general: una versión con prefijo y sufijo, un `numeric` que
// PostgREST entrega como cadena, coordenadas nulas y un veredicto fuera del
// CHECK de la tabla.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  digitsOnly,
  formatDeviceCode,
  formatVersion,
  num,
  relativeTime,
  reportedRecently,
} from '../src/utils/format.ts';
import { concordance, verdictMeta } from '../src/utils/verdict.ts';

test('el código de equipo se presenta en tres bloques de cinco', () => {
  assert.equal(formatDeviceCode('482139057416628'), '48213-90574-16628');
});

test('un código incompleto no se parte a medias', () => {
  assert.equal(formatDeviceCode('4821390'), '4821390');
  assert.equal(formatDeviceCode(null), '');
});

test('digitsOnly acepta el código con guiones, que es como lo muestra la consola', () => {
  assert.equal(digitsOnly('48213-90574-16628'), '482139057416628');
  assert.equal(digitsOnly(' 48213 90574 16628 '), '482139057416628');
});

test('formatVersion no antepone una segunda v ni inventa una para el vacío', () => {
  assert.equal(formatVersion('2.1.0'), 'v2.1.0');
  assert.equal(formatVersion('v2.1.0-BLE'), 'v2.1.0-BLE');
  assert.equal(formatVersion(null), '—');
  assert.equal(formatVersion(''), '—');
});

test('num acepta los numeric que PostgREST entrega como cadena', () => {
  assert.equal(num('6.52', 1), '6.5');
  assert.equal(num(1234.6, 0, 'µS/cm'), '1235 µS/cm');
});

test('num distingue el cero del dato ausente', () => {
  assert.equal(num(0, 1, '%'), '0.0 %');
  assert.equal(num(null), '—');
  assert.equal(num(undefined), '—');
  assert.equal(num(Number.NaN), '—');
});

test('relativeTime devuelve «nunca» sin fecha y no rompe con una inválida', () => {
  assert.equal(relativeTime(null), 'nunca');
  assert.equal(relativeTime('no es una fecha'), '—');
});

test('relativeTime escala de minutos a días', () => {
  const hace = (ms) => new Date(Date.now() - ms).toISOString();
  assert.equal(relativeTime(hace(10_000)), 'ahora');
  assert.equal(relativeTime(hace(10 * 60_000)), 'hace 10 min');
  assert.equal(relativeTime(hace(3 * 3_600_000)), 'hace 3 h');
  assert.equal(relativeTime(hace(25 * 3_600_000)), 'ayer');
});

test('reportedRecently usa la ventana de una hora y no confía en un nulo', () => {
  assert.equal(reportedRecently(null), false);
  assert.equal(reportedRecently(new Date(Date.now() - 59 * 60_000).toISOString()), true);
  assert.equal(reportedRecently(new Date(Date.now() - 61 * 60_000).toISOString()), false);
});

test('un veredicto fuera del CHECK no rompe la tabla', () => {
  assert.equal(verdictMeta('GREEN').label, 'Apto');
  assert.equal(verdictMeta('AZUL').label, 'Sin veredicto');
  assert.equal(verdictMeta(null).label, 'Sin veredicto');
});

test('la concordancia es null cuando falta un valor, no 0 %', () => {
  assert.equal(concordance(null, 6.5), null);
  assert.equal(concordance(6.5, null), null);
  assert.equal(concordance(0, 6.5), null);
});

test('la concordancia compara contra el valor de laboratorio', () => {
  assert.equal(concordance(6.0, 6.0), 100);
  assert.equal(concordance('6.0', '5.4'), 90);
});
