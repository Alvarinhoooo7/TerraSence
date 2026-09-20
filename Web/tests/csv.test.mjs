import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, fileStamp } from '../src/utils/csv.ts';

test('el CSV separa con punto y coma para no romper el decimal en Excel', () => {
  const csv = toCsv(['pH', 'CE'], [[6.5, 200]]);
  assert.equal(csv, 'pH;CE\r\n6.5;200');
});

test('entrecomilla solo cuando el valor lleva separador, comillas o salto', () => {
  const csv = toCsv(['a'], [['sin nada'], ['con;separador'], ['con"comilla'], ['con\nsalto']]);
  const filas = csv.split('\r\n');
  assert.equal(filas[1], 'sin nada');
  assert.equal(filas[2], '"con;separador"');
  assert.equal(filas[3], '"con""comilla"');
  assert.equal(filas[4], '"con\nsalto"');
});

test('null y undefined viajan como celda vacía, no como texto', () => {
  assert.equal(toCsv(['a', 'b', 'c'], [[null, undefined, 0]]), 'a;b;c\r\n;;0');
});

test('la marca de tiempo rellena con cero a dos dígitos', () => {
  assert.equal(fileStamp(new Date(2026, 0, 5, 9, 4)), '20260105-0904');
});
