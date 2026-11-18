import assert from 'node:assert/strict';
import test from 'node:test';
import { accountInitials } from '../src/utils/accountInitials';

test('usa la inicial del nombre y la del apellido', () => {
  assert.equal(accountInitials('ana', 'Pérez', 'a@b.cl'), 'AP');
  assert.equal(accountInitials('Ana', null, 'a@b.cl'), 'A');
});

test('sin nombre cae a la primera letra del correo, y sin correo a un signo', () => {
  assert.equal(accountInitials('', '  ', 'campo@terrasense.cl'), 'C');
  assert.equal(accountInitials(undefined, undefined, undefined), '?');
});
