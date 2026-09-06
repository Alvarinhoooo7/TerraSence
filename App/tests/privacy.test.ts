import assert from 'node:assert/strict';
import test from 'node:test';

import { maskEmail, maskName } from '../src/utils/privacy';

test('conserva la inicial de cada palabra del nombre', () => {
  assert.equal(maskName('Alvaro Villena'), 'Axxxxx Vxxxxxx');
  assert.equal(maskName('Ana'), 'Axx');
  assert.equal(maskName('maria jose del pino'), 'Mxxxx Jxxx Dxx Pxxx');
});

test('normaliza espacios sobrantes en el nombre', () => {
  assert.equal(maskName('  Alvaro   Villena  '), 'Axxxxx Vxxxxxx');
});

test('censura la parte local y el dominio del correo por separado', () => {
  assert.equal(maskEmail('alvarovillena8@gmail.com'), 'Axxxxxxxxxxxxx@Gxxxxxxxx');
  // El punto del dominio también se oculta: no se revela el proveedor.
  assert.ok(!maskEmail('alvarovillena8@gmail.com').includes('.'));
});

test('resiste correos de una sola letra y dominios cortos', () => {
  assert.equal(maskEmail('a@b.cl'), 'A@Bxxx');
});

test('un valor sin arroba se trata como un único token, no como correo', () => {
  assert.equal(maskEmail('sinarroba'), 'Sxxxxxxxx');
  // Entrada degenerada: se censura entera en vez de reventar o dejarla pasar.
  assert.equal(maskEmail('@solodominio'), '@xxxxxxxxxxx');
});

test('ausencia de dato devuelve cadena vacía y no "undefined"', () => {
  assert.equal(maskName(null), '');
  assert.equal(maskName(undefined), '');
  assert.equal(maskName(''), '');
  assert.equal(maskEmail(null), '');
  assert.equal(maskEmail(undefined), '');
  assert.equal(maskEmail(''), '');
});

test('no deja pasar ningún carácter original más allá de las iniciales', () => {
  const enmascarado = maskEmail('contacto.soporte@terrasense.cl');
  const iniciales = enmascarado.replace(/x/g, '');
  assert.equal(iniciales, 'C@T');
});
