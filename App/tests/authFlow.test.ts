import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveEntryRoute } from '../src/utils/authFlow';
import { isEmailValid, isExistingAccountSignUp, isInvalidSessionError } from '../src/utils/authValidation';

const ready = {
  loading: false, recovery: false, welcomeComplete: true, userId: 'account-a',
  onboardingUserId: 'account-a', checkingOnboarding: false, onboardingError: false,
  onboardingComplete: true, awaitingApproval: false,
  permissionsUserId: 'account-a', permissionsReviewed: true,
};

test('una recuperación nunca entra a la app, incluso con bienvenida pendiente o equipo autorizado', () => {
  assert.equal(resolveEntryRoute({ ...ready, recovery: true }), 'recovery');
  assert.equal(resolveEntryRoute({ ...ready, recovery: true, welcomeComplete: false }), 'recovery');
  assert.equal(resolveEntryRoute({ ...ready, recovery: true, userId: null }), 'recovery');
});

test('mientras se valida un enlace no se presenta un formulario operable sobre la sesión anterior', () => {
  assert.equal(resolveEntryRoute({ ...ready, loading: true, recovery: true }), 'loading');
});

test('cambiar de cuenta no reutiliza el onboarding ni muestra la aplicación anterior', () => {
  assert.equal(resolveEntryRoute({ ...ready, userId: 'account-b' }), 'loading');
  assert.equal(resolveEntryRoute({ ...ready, onboardingUserId: null }), 'loading');
  assert.equal(resolveEntryRoute({ ...ready, checkingOnboarding: true }), 'loading');
});

test('un equipo autorizado prevalece sobre otra solicitud pendiente', () => {
  assert.equal(resolveEntryRoute({ ...ready, awaitingApproval: true }), 'app');
  assert.equal(resolveEntryRoute({ ...ready, onboardingComplete: false, awaitingApproval: true }), 'approval');
});

test('sin sesión se exige acceso; una cuenta nueva requiere vinculación; fallos ofrecen reintento', () => {
  assert.equal(resolveEntryRoute({ ...ready, userId: null }), 'auth');
  assert.equal(resolveEntryRoute({ ...ready, userId: null, welcomeComplete: false }), 'welcome');
  assert.equal(resolveEntryRoute({ ...ready, onboardingComplete: false }), 'onboarding');
  assert.equal(resolveEntryRoute({ ...ready, onboardingError: true }), 'onboarding-error');
});

test('fallos transitorios de red, límite y servidor no se confunden con una cuenta inválida', () => {
  for (const error of [null, {}, { status: 500 }, { status: 503 }, { status: 429 }, { status: 0 }]) {
    assert.equal(isInvalidSessionError(error), false);
  }
  for (const error of [{ status: 401 }, { status: 403 }, { code: 'user_not_found' }, { code: 'refresh_token_not_found' }]) {
    assert.equal(isInvalidSessionError(error), true);
  }
});

test('validación de correo rechaza espacios, dominios incompletos y múltiples arrobas', () => {
  for (const email of ['', '@', 'a@', '@campo.cl', 'a@campo', 'a b@campo.cl', 'a@@campo.cl']) assert.equal(isEmailValid(email), false);
  assert.equal(isEmailValid(' Persona+sonda@campo.cl '), true);
});

test('permisos aparece después del acceso y antes de cualquier resultado de onboarding', () => {
  const pending = { ...ready, permissionsReviewed: false };
  assert.equal(resolveEntryRoute(pending), 'permissions');
  assert.equal(resolveEntryRoute({ ...pending, checkingOnboarding: true }), 'permissions');
  assert.equal(resolveEntryRoute({ ...pending, onboardingError: true }), 'permissions');
  assert.equal(resolveEntryRoute({ ...pending, awaitingApproval: true, onboardingComplete: false }), 'permissions');
  assert.equal(resolveEntryRoute({ ...pending, userId: null }), 'auth');
});

test('recuperación y carga inicial conservan prioridad aun sin permisos revisados', () => {
  assert.equal(resolveEntryRoute({ ...ready, permissionsUserId: null, recovery: true }), 'recovery');
  assert.equal(resolveEntryRoute({ ...ready, permissionsReviewed: false, recovery: true }), 'recovery');
  assert.equal(resolveEntryRoute({ ...ready, permissionsReviewed: false, loading: true }), 'loading');
});

test('la marca de permisos de otra cuenta no permite saltar esta etapa', () => {
  assert.equal(resolveEntryRoute({ ...ready, permissionsUserId: 'account-b' }), 'loading');
  assert.equal(resolveEntryRoute({ ...ready, permissionsUserId: null }), 'loading');
});

test('revisar permisos conduce a onboarding, aprobación o app según el estado existente', () => {
  assert.equal(resolveEntryRoute({ ...ready, onboardingComplete: false }), 'onboarding');
  assert.equal(resolveEntryRoute({ ...ready, onboardingComplete: false, awaitingApproval: true }), 'approval');
  assert.equal(resolveEntryRoute(ready), 'app');
});

test('reconoce que el correo ya tenía cuenta por la respuesta ofuscada del registro', () => {
  const nuevo = { user: { id: 'u1', identities: [{ provider: 'email' }] }, session: null };
  const existente = { user: { id: 'u1', identities: [] }, session: null };
  assert.equal(isExistingAccountSignUp(existente), true);
  assert.equal(isExistingAccountSignUp(nuevo), false, 'un registro real trae su identidad');
  assert.equal(isExistingAccountSignUp({ user: { id: 'u1', identities: [] }, session: { access_token: 'x' } }), false,
    'con sesión activa el registro prosperó: no se avisa de cuenta previa');
  // Ante respuestas que no traen el dato, no se afirma nada.
  for (const dudosa of [null, {}, { user: null, session: null }, { user: { id: 'u1' }, session: null },
                        { user: { id: 'u1', identities: null }, session: null }]) {
    assert.equal(isExistingAccountSignUp(dudosa), false);
  }
});
