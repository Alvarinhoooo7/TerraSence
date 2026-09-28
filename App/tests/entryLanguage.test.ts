import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveEntryRoute } from '../src/utils/authFlow';
import { DEFAULT_APP_PREFERENCES, normalizePreferences, serializePreferences } from '../src/types/preferences';

const state = {
  loading: false, recovery: false, welcomeComplete: false, languageSelected: false,
  userId: null, permissionsUserId: null, permissionsReviewed: false,
  onboardingUserId: null, checkingOnboarding: false, onboardingError: false,
  onboardingComplete: false, awaitingApproval: false,
};

test('primera entrada y reinicio respetan idioma y bienvenida por instalación', () => {
  assert.equal(resolveEntryRoute(state), 'language');
  assert.equal(resolveEntryRoute({ ...state, languageSelected: true }), 'welcome');
  assert.equal(resolveEntryRoute({ ...state, languageSelected: true, welcomeComplete: true }), 'auth');
  assert.equal(resolveEntryRoute({ ...state, languageSelected: false, welcomeComplete: true }), 'language');
});

test('sesión restaurada omite idioma y bienvenida sin omitir permisos', () => {
  assert.equal(resolveEntryRoute({ ...state, userId: 'a' }), 'loading');
  assert.equal(resolveEntryRoute({ ...state, userId: 'a', permissionsUserId: 'a' }), 'permissions');
  assert.equal(resolveEntryRoute({ ...state, userId: 'a', permissionsUserId: 'a', recovery: true }), 'recovery');
});

test('guardar idioma conserva el resto de las preferencias del perfil', () => {
  const profile = normalizePreferences({ language: 'es', theme: 'dark', measurement_system: 'imperial',
    notifications: { agronomic: false, device: true, weather: false, sync: true }, guides_seen: { measure: true } });
  const changed = { ...profile, language: 'en' as const };
  assert.deepEqual({ ...serializePreferences(changed), language: 'es' }, serializePreferences(profile));
  assert.notDeepEqual(changed, DEFAULT_APP_PREFERENCES);
});
