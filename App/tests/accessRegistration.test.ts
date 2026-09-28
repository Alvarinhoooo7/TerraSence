import assert from 'node:assert/strict';
import test from 'node:test';
import { createSubmissionGate, transitionRegistrationStep, registrationConsentValid, registrationIdentityValid, registrationNameMetadata, registrationPasswordValid } from '../src/utils/accessRegistration';
import { consentReducer, createRegistrationConsent, initialConsent } from '../src/utils/registrationConsent';

test('el primer paso exige nombre y apellido y un correo válido sin crear cuenta', () => {
  assert.equal(registrationIdentityValid('Ana', 'ana@ejemplo.cl'), false);
  assert.equal(registrationIdentityValid('Ana Soto', 'ana@ejemplo.cl'), true);
  assert.equal(registrationIdentityValid(' Ana   Soto ', ' ANA@EJEMPLO.CL '), true);
  assert.equal(registrationIdentityValid('Ana Soto', 'correo inválido'), false);
});

test('los metadatos conservan todos los nombres y apellidos en el perfil', () => {
  const name = registrationNameMetadata('  María   José Pérez Soto  ');
  assert.deepEqual(name, { full_name: 'María José Pérez Soto', first_name: 'María', last_name: 'José Pérez Soto' });
  assert.equal(`${name.first_name} ${name.last_name}`, name.full_name);
});

test('el segundo paso exige política y confirmación idéntica', () => {
  assert.equal(registrationPasswordValid('Campo2026!', 'Campo2026!'), true);
  assert.equal(registrationPasswordValid('Campo2026!', 'Campo2026?'), false);
  assert.equal(registrationPasswordValid('campo', 'campo'), false);
});

test('la creación requiere ambas aceptaciones y versión vigente', () => {
  let state = consentReducer(initialConsent, { type: 'read' });
  state = consentReducer(state, { type: 'terms' });
  state = consentReducer(state, { type: 'privacy' });
  const consent = createRegistrationConsent(state, 'es');
  assert.equal(registrationConsentValid(consent), true);
  assert.equal(registrationConsentValid(null), false);
  assert.equal(registrationConsentValid({ ...consent, terms_version: 'anterior' }), false);
  assert.equal(registrationConsentValid({ ...consent, privacy_accepted: false } as unknown as typeof consent), false);
});

test('datos inválidos no avanzan; volver permite corregir la identidad sin enviar registro', () => {
  assert.equal(transitionRegistrationStep(1, 'next', false), 1);
  assert.equal(transitionRegistrationStep(1, 'next', true), 2);
  assert.equal(transitionRegistrationStep(2, 'back', true), 1);
});

test('el envío se bloquea en el mismo frame y se libera para reintentar después del error', async () => {
  const gate = createSubmissionGate();
  let requests = 0;
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const submit = async () => {
    if (!gate.enter()) return;
    try { requests++; await pending; throw new Error('network'); }
    finally { gate.leave(); }
  };
  const first = assert.rejects(submit(), /network/);
  await submit();
  assert.equal(requests, 1);
  finish();
  await first;
  await assert.rejects(submit(), /network/);
  assert.equal(requests, 2);
});
