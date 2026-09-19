import assert from 'node:assert/strict';
import test from 'node:test';
import { isEmailCodeValid, normalizeEmailCode, resendEmailCode, resendSecondsRemaining, verifyEmailCode } from '../src/services/emailOtp';

type Auth = Parameters<typeof verifyEmailCode>[0];
function fakeAuth() {
  const calls: Array<{ method: string; args: unknown }> = [];
  const session = { user: { id: 'user-1' } };
  const auth = {
    verifyOtp: async (args: unknown) => { calls.push({ method: 'verifyOtp', args }); return { data: { session }, error: null }; },
    resend: async (args: unknown) => { calls.push({ method: 'resend', args }); return { error: null }; },
    resetPasswordForEmail: async (args: unknown) => { calls.push({ method: 'resetPasswordForEmail', args }); return { error: null }; },
  } as unknown as Auth;
  return { auth, calls, session };
}

test('conserva ceros iniciales y acepta pegar espacios sin aceptar códigos incompletos', () => {
  assert.equal(normalizeEmailCode(' 012 345\n'), '012345');
  assert.ok(isEmailCodeValid(' 012 345\n'));
  for (const invalid of ['', '12345', '1234567', '12a456', '-12345']) assert.equal(isEmailCodeValid(invalid), false);
});

test('la confirmación valida el código con el correo normalizado y tipo email', async () => {
  const { auth, calls, session } = fakeAuth();
  assert.equal(await verifyEmailCode(auth, ' TEST@example.com ', '012 345', 'signup'), session);
  assert.deepEqual(calls, [{ method: 'verifyOtp', args: { email: 'test@example.com', token: '012345', type: 'email' } }]);
});

test('recuperación usa recovery y no modifica contraseñas ni crea cuentas', async () => {
  const { auth, calls } = fakeAuth();
  await verifyEmailCode(auth, 'test@example.com', '123456', 'recovery');
  assert.deepEqual(calls, [{ method: 'verifyOtp', args: { email: 'test@example.com', token: '123456', type: 'recovery' } }]);
});

test('un código incompleto nunca llega al servidor; errores y respuestas sin sesión no cuentan como éxito', async () => {
  const { auth, calls } = fakeAuth();
  await assert.rejects(verifyEmailCode(auth, 'test@example.com', '123', 'signup'));
  assert.equal(calls.length, 0);
  const expired = new Error('Token has expired');
  auth.verifyOtp = (async () => ({ data: { session: null, user: null }, error: expired })) as unknown as Auth['verifyOtp'];
  await assert.rejects(verifyEmailCode(auth, 'test@example.com', '123456', 'recovery'), expired);
  auth.verifyOtp = (async () => ({ data: { session: null, user: null }, error: null })) as Auth['verifyOtp'];
  await assert.rejects(verifyEmailCode(auth, 'test@example.com', '123456', 'signup'), /sesión/);
});

test('reenviar confirmación y recuperación usa sus endpoints específicos', async () => {
  const { auth, calls } = fakeAuth();
  await resendEmailCode(auth, ' TEST@example.com ', 'signup');
  await resendEmailCode(auth, ' TEST@example.com ', 'recovery');
  assert.deepEqual(calls, [
    { method: 'resend', args: { type: 'signup', email: 'test@example.com' } },
    { method: 'resetPasswordForEmail', args: 'test@example.com' },
  ]);
});

test('el reenvío propaga el límite del servidor y el contador usa tiempo real tras volver a la app', async () => {
  const { auth } = fakeAuth();
  const limited = new Error('Too many requests');
  auth.resetPasswordForEmail = (async () => ({ data: null, error: limited })) as unknown as Auth['resetPasswordForEmail'];
  await assert.rejects(resendEmailCode(auth, 'test@example.com', 'recovery'), limited);
  assert.equal(resendSecondsRemaining(60_000, 0), 60);
  assert.equal(resendSecondsRemaining(60_000, 59_500), 1);
  assert.equal(resendSecondsRemaining(60_000, 180_000), 0);
});
