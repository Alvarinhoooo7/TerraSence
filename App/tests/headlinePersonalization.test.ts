import assert from 'node:assert/strict';
import test from 'node:test';
import { personalizeHeadline } from '../src/engine/headlinePersonalization';
import { SPECIES } from '../src/engine/speciesCatalog';
import type { PhenologicalStage } from '../src/types/app';

const STAGES: PhenologicalStage[] = ['pre_siembra', 'vegetativo', 'floracion', 'cosecha'];

test('nombra la especie medida en lugar de «el cultivo», sin depender del género', () => {
  assert.equal(personalizeHeadline('Protege el cultivo del frío', 'vegetativo', 'sp.tomate', 'es'), 'Protege tu tomate del frío');
  assert.equal(personalizeHeadline('Protege el cultivo del calor', 'floracion', 'sp.lechuga', 'es'), 'Protege tu lechuga del calor');
  assert.equal(personalizeHeadline('Protect the crop from the cold', 'vegetativo', 'sp.tomate', 'en'), 'Protect your tomato from the cold');
  assert.equal(personalizeHeadline('Cuida que no le falte agua', 'floracion', 'sp.palto', 'es'), 'Cuida que a tu palto no le falte agua');
});

test('conserva las mayúsculas de los nombres propios y quita el paréntesis del nombre', () => {
  // Más de 40 caracteres: queda el titular genérico.
  assert.equal(personalizeHeadline('Protect the crop from the cold', 'vegetativo', 'sp.repollito-bruselas', 'en'), 'Protect the crop from the cold');
  assert.equal(personalizeHeadline('Keep watching the crop', 'floracion', 'sp.repollito-bruselas', 'en'), 'Keep watching your Brussels sprouts');
  assert.equal(personalizeHeadline('Protege el cultivo del frío', 'vegetativo', 'sp.papayo', 'es'), 'Protege tu papayo del frío');
});

test('sin especie o con un titular que no nombra el cultivo, no cambia', () => {
  assert.equal(personalizeHeadline('Protege el cultivo del frío', 'vegetativo', null, 'es'), 'Protege el cultivo del frío');
  assert.equal(personalizeHeadline('Riega antes de sembrar', 'pre_siembra', null, 'es'), 'Riega antes de sembrar');
  assert.equal(personalizeHeadline('Confirma el pH en laboratorio', 'floracion', 'sp.tomate', 'es'), 'Confirma el pH en laboratorio');
});

test('si no hay nada que corregir, el titular sigue la etapa', () => {
  assert.equal(personalizeHeadline('Sigue observando el cultivo', 'pre_siembra', null, 'es'), 'Sigue preparando la siembra');
  assert.equal(personalizeHeadline('Keep watching the crop', 'cosecha', 'sp.tomate', 'en'), 'Carry on with the planned harvest');
  assert.equal(personalizeHeadline('Sigue observando el cultivo', 'floracion', 'sp.tomate', 'es'), 'Sigue observando tu tomate');
});

test('ningún titular personalizado pasa de 40 caracteres, con cualquier especie y etapa', () => {
  const base = ['Protege el cultivo del frío', 'Protege el cultivo del calor', 'Cuida que no le falte agua', 'Sigue observando el cultivo', 'Revisa la ventilación del cultivo'];
  const baseEn = ['Protect the crop from the cold', 'Protect the crop from the heat', 'Make sure it does not lack water', 'Keep watching the crop', 'Check the crop ventilation'];
  for (const species of SPECIES) for (const stage of STAGES) {
    for (const h of base) assert.ok(personalizeHeadline(h, stage, species.id, 'es').length <= 40, `${species.id} ${h}`);
    for (const h of baseEn) assert.ok(personalizeHeadline(h, stage, species.id, 'en').length <= 40, `${species.id} ${h}`);
  }
});
