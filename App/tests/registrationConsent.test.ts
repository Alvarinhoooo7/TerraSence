import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAcceptRegistration, consentReducer, createRegistrationConsent,
  hasReachedLegalEnd, initialConsent, REGISTRATION_LEGAL_VERSION,
} from '../src/utils/registrationConsent';

test('no acepta casillas antes de llegar al final ni genera una aceptación incompleta', () => {
  assert.deepEqual(consentReducer(initialConsent, { type: 'terms' }), initialConsent);
  assert.deepEqual(consentReducer(initialConsent, { type: 'privacy' }), initialConsent);
  for (const reachedEnd of [false, true]) {
    for (const termsAccepted of [false, true]) {
      for (const privacyAccepted of [false, true]) {
        const state = { reachedEnd, termsAccepted, privacyAccepted };
        const complete = reachedEnd && termsAccepted && privacyAccepted;
        assert.equal(canAcceptRegistration(state), complete);
        if (!complete) assert.throws(() => createRegistrationConsent(state, 'es'));
      }
    }
  }
});

test('solo habilita continuar con ambas aceptaciones y lo bloquea al desmarcar cualquiera', () => {
  let state = consentReducer(initialConsent, { type: 'read' });
  state = consentReducer(state, { type: 'terms' });
  assert.equal(canAcceptRegistration(state), false);
  state = consentReducer(state, { type: 'privacy' });
  assert.equal(canAcceptRegistration(state), true);
  for (const type of ['terms', 'privacy'] as const) {
    assert.equal(canAcceptRegistration(consentReducer(state, { type })), false);
  }
  const record = createRegistrationConsent(state, 'es');
  assert.equal(record.terms_version, REGISTRATION_LEGAL_VERSION);
  assert.equal(record.privacy_version, REGISTRATION_LEGAL_VERSION);
  assert.equal(record.language, 'es');
  assert.ok(Number.isFinite(Date.parse(record.accepted_at_client)));
  assert.deepEqual(initialConsent, { reachedEnd: false, termsAccepted: false, privacyAccepted: false });
});

test('exige medidas reales de layout y permite el texto que cabe sin desplazamiento', () => {
  assert.equal(hasReachedLegalEnd(0, 0, 0), false);
  assert.equal(hasReachedLegalEnd(0, 500, 0), false);
  assert.equal(hasReachedLegalEnd(0, 500, 1500), false);
  assert.equal(hasReachedLegalEnd(900, 500, 1500), false);
  assert.equal(hasReachedLegalEnd(1000, 500, 1500), true);
  assert.equal(hasReachedLegalEnd(0, 1600, 1500), true);
  assert.equal(hasReachedLegalEnd(-10, 1600, 1500), false);
  assert.equal(hasReachedLegalEnd(NaN, 500, 1500), false);
});

test('llegar al final es idempotente: no rehace el estado en cada evento de desplazamiento', () => {
  const leido = consentReducer(initialConsent, { type: 'read' });
  assert.equal(leido.reachedEnd, true);
  // Misma referencia: sin objeto nuevo no hay re-render del texto legal.
  assert.equal(consentReducer(leido, { type: 'read' }), leido);
  const marcado = consentReducer(consentReducer(leido, { type: 'terms' }), { type: 'privacy' });
  assert.equal(consentReducer(marcado, { type: 'read' }), marcado, 'no descarta lo ya marcado');
  assert.equal(canAcceptRegistration(marcado), true);
});
