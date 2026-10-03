import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsParent, type SettingsPageId } from '../src/utils/settingsNavigation';

test('cada detalle vuelve a su categoría y luego a configuración', () => {
  const details: SettingsPageId[] = ['notifications', 'firmware', 'language', 'theme', 'permissions', 'sync', 'about', 'contact', 'share'];
  for (const detail of details) {
    assert.notEqual(settingsParent(detail), 'index');
    assert.equal(settingsParent(settingsParent(detail)), 'index');
  }
});

test('mi cuenta se abre desde el índice y vuelve a él', () => {
  assert.equal(settingsParent('profile'), 'index');
});
