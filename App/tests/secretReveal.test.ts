import test from 'node:test';
import assert from 'node:assert/strict';
import { maskSecret, revealedIndex, SECRET_REVEAL_MS } from '../src/utils/secretReveal';

test('escribir al final revela el último carácter', () => {
  assert.equal(revealedIndex('abc', 'abcd'), 3);
  assert.equal(maskSecret('abcd', 3), '***d');
});

test('escribir en medio revela sólo el carácter insertado', () => {
  assert.equal(revealedIndex('abd', 'abcd'), 2);
  assert.equal(maskSecret('abcd', 2), '**c*');
});

test('borrar, pegar o reemplazar no revelan nada', () => {
  assert.equal(revealedIndex('abcd', 'abc'), -1);
  assert.equal(revealedIndex('ab', 'abcde'), -1);
  assert.equal(revealedIndex('abc', 'xbcd'), -1);
  assert.equal(maskSecret('abcd'), '****');
});

test('el retardo es el mismo del código por correo', () => {
  assert.equal(SECRET_REVEAL_MS, 900);
});
