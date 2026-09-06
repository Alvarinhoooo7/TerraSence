import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluatePassword,
  isPasswordAcceptable,
  PASSWORD_MIN_LENGTH,
} from '../src/utils/passwordRules';

const met = (password: string) =>
  Object.fromEntries(evaluatePassword(password).map(r => [r.id, r.met]));

test('devuelve siempre las cuatro reglas, cumplidas o no', () => {
  const reglas = evaluatePassword('');
  assert.equal(reglas.length, 4);
  assert.deepEqual(reglas.map(r => r.id), ['length', 'letter', 'number', 'special']);
  assert.ok(reglas.every(r => !r.met));
});

test('acepta una contraseña que cumple las cuatro', () => {
  assert.equal(isPasswordAcceptable('Trigo2026!'), true);
  assert.deepEqual(met('Trigo2026!'), { length: true, letter: true, number: true, special: true });
});

test('marca cada regla por separado', () => {
  // Ocho letras: cumple longitud y letra, falla número y especial.
  assert.deepEqual(met('abcdefgh'), { length: true, letter: true, number: false, special: false });
  // Corta pero completa en composición: sólo falla la longitud.
  assert.deepEqual(met('a1!'), { length: false, letter: true, number: true, special: true });
});

test('la longitud se mide en caracteres, no en reglas cumplidas', () => {
  const justo = 'a1!'.padEnd(PASSWORD_MIN_LENGTH, 'x');
  assert.equal(justo.length, PASSWORD_MIN_LENGTH);
  assert.equal(isPasswordAcceptable(justo), true);
  assert.equal(isPasswordAcceptable(justo.slice(0, PASSWORD_MIN_LENGTH - 1)), false);
});

test('el espacio no cuenta como carácter especial', () => {
  assert.equal(met('abcd 1234').special, false);
  assert.equal(isPasswordAcceptable('abcd 1234'), false);
});

test('acepta letras y dígitos no latinos, y acentos como letra', () => {
  assert.equal(met('contraseña1!').letter, true);
  assert.equal(met('пароль2026!').letter, true);
  // Los signos de puntuación del español también valen como especial.
  assert.equal(met('¿Siembra2026?').special, true);
});

test('rechaza una contraseña larga pero sin número ni especial', () => {
  assert.equal(isPasswordAcceptable('unacontrasenamuylarga'), false);
});
