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
  assert.deepEqual(normalized.notifications, {
    agronomic: false,
    device: true,
    weather: false,
    sync: true,
  });
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
