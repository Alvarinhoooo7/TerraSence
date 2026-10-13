import assert from 'node:assert/strict';
import test from 'node:test';
import {
  asksForSpecies, cropIdForSave, initialMeasureSpecies, measuredSpeciesId, speciesAfterStageChange,
} from '../src/utils/measureSpecies';
import { NO_SPECIES_ID, findSpecies, type SpeciesEntry } from '../src/engine/speciesCatalog';
import { useAppStore } from '../src/store/useAppStore';

const tomate = findSpecies('sp.tomate')!;

test('T48: una medición nueva parte sin especie aunque la anterior tuviera una', () => {
  // Primera medición: elige tomate en floración y guarda.
  let species: SpeciesEntry | null = initialMeasureSpecies<SpeciesEntry>();
  species = tomate;
  assert.equal(cropIdForSave('floracion', species), 'sp.tomate');
  // La pantalla se desmonta al terminar; la siguiente medición se monta desde el valor inicial.
  const next = initialMeasureSpecies<SpeciesEntry>();
  assert.equal(next, null);
  assert.equal(measuredSpeciesId('floracion', next), null);
  assert.equal(cropIdForSave('floracion', next), NO_SPECIES_ID);
});

test('T48: la especie no vive en el store global', () => {
  const state = useAppStore.getState() as unknown as Record<string, unknown>;
  const keys = Object.keys(state).map(k => k.toLowerCase());
  assert.equal(keys.some(k => k.includes('species') || k.includes('crop') || k.includes('especie')), false, keys.join(', '));
  // Cambiar la etapa global, como hace la pantalla, no arrastra ninguna especie.
  useAppStore.getState().setStage('floracion');
  assert.equal(Object.values(useAppStore.getState()).some(v => v === 'sp.tomate' || v === tomate), false);
});

test('ES2: entre vegetativo, floración y cosecha se conserva la especie; pre-siembra la borra', () => {
  assert.equal(speciesAfterStageChange(tomate, 'vegetativo'), tomate);
  assert.equal(speciesAfterStageChange(tomate, 'floracion'), tomate);
  assert.equal(speciesAfterStageChange(tomate, 'cosecha'), tomate);
  assert.equal(speciesAfterStageChange(tomate, 'pre_siembra'), null);
  assert.equal(speciesAfterStageChange(null, 'cosecha'), null);
});

test('ES2/ES4: sólo se evalúa y guarda la especie en etapas que la piden', () => {
  assert.equal(asksForSpecies(null), false);
  assert.equal(asksForSpecies('pre_siembra'), false);
  for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) {
    assert.equal(asksForSpecies(stage), true);
    assert.equal(measuredSpeciesId(stage, tomate), 'sp.tomate');
    assert.equal(measuredSpeciesId(stage, null), null);
  }
  // Una especie que quedó en el estado no se usa si la etapa ya no la pide.
  assert.equal(measuredSpeciesId('pre_siembra', tomate), null);
  assert.equal(cropIdForSave('pre_siembra', tomate), NO_SPECIES_ID);
  assert.equal(cropIdForSave(null, tomate), NO_SPECIES_ID);
});
