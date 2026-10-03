import test from 'node:test';
import assert from 'node:assert/strict';
import { revealedIndex, maskSecret } from '../src/utils/secretReveal';
test('unicode conserva el índice al insertar y no revela al pegar o borrar', () => {
  assert.equal(revealedIndex('ab', 'a\u{1F600}b'), 1);
  assert.equal(maskSecret('a\u{1F600}b', 1), '*\u{1F600}*');
  assert.equal(revealedIndex('a\u{1F600}', 'a\u{1F600}c'), 2);
  assert.equal(revealedIndex('', '\u{1F600}x'), -1);
  assert.equal(revealedIndex('a\u{1F600}', 'a'), -1);
});
