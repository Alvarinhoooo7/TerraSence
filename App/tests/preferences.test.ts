import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_APP_PREFERENCES,
  normalizePreferences,
  serializePreferences,
} from '../src/types/preferences';

test('aplica defaults seguros a preferencias ausentes o inválidas', () => {
  assert.deepEqual(normalizePreferences(null), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(normalizePreferences({ language: 'fr', theme: 'neon' }), DEFAULT_APP_PREFERENCES);
});

test('normaliza el formato JSONB usado por Supabase', () => {
  const normalized = normalizePreferences({
    language: 'en',
    theme: 'dark',
    measurement_system: 'imperial',
    notifications: { agronomic: false, device: true, weather: false, sync: true },
    guides_seen: { map: true, auth: false, unexpected: 'yes' },
  });

  assert.equal(normalized.language, 'en');
  assert.equal(normalized.theme, 'dark');
  assert.equal(normalized.measurementSystem, 'imperial');
  assert.deepEqual(normalized.notifications, { device: true });
  assert.deepEqual(normalized.guidesSeen, { map: true });
});

test('serializar y normalizar conserva las preferencias de la cuenta', () => {
  const preferences = {
    ...DEFAULT_APP_PREFERENCES,
    language: 'en' as const,
    theme: 'light' as const,
    measurementSystem: 'imperial' as const,
    guidesSeen: { onboarding: true, settings: true },
  };

  assert.deepEqual(normalizePreferences(serializePreferences(preferences)), preferences);
});

test('las categorías de aviso retiradas se descartan sin romper la carga', () => {
  const legacy = normalizePreferences({ notifications: { agronomic: true, device: false, weather: true, sync: true, reminders: true } });
  assert.deepEqual(legacy.notifications, { device: false });
  assert.deepEqual(Object.keys(legacy.notifications), ['device']);
  // Sin la clave `device`, el aviso de equipos queda activo por defecto.
  assert.deepEqual(normalizePreferences({ notifications: { agronomic: false, weather: false, sync: true } }).notifications, { device: true });
  assert.deepEqual(normalizePreferences({ notifications: 'no es objeto' }).notifications, { device: true });
});

test('al serializar sólo se envía la categoría vigente', () => {
  const legacy = normalizePreferences({ notifications: { agronomic: true, weather: true, sync: true, device: true } });
  assert.deepEqual(serializePreferences(legacy).notifications, { device: true });
  assert.deepEqual(DEFAULT_APP_PREFERENCES.notifications, { device: true });
});
