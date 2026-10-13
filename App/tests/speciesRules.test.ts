import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSpeciesCriteria, findSpeciesRuleProfile, hasEnabledCriteria, SPECIES_RULES } from '../src/engine/speciesRules';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { SPECIES, findSpecies } from '../src/engine/speciesCatalog';
import type { SoilMeasurement } from '../src/types/agronomy';

const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 24, airHumidity: 55, airPressure: 1010 };
const clock = { capturedAt: '2026-10-11T15:30:00.000Z', evaluatedAt: '2026-10-11T15:31:00.000Z' };

test('ES6: todo perfil de speciesRules.ts corresponde a una especie real del catálogo', () => {
  for (const [key, profile] of Object.entries(SPECIES_RULES)) {
    assert.equal(profile.speciesId, key);
    assert.ok(findSpecies(key), `${key} no existe en speciesCatalog.ts`);
    assert.ok(profile.criteria.length > 0, `${key} no declara ningún criterio`);
    for (const criterion of profile.criteria) {
      assert.ok(criterion.stages.length > 0, `${key}: criterio sin etapas`);
      assert.ok(criterion.evidence.institution.trim() && criterion.evidence.url.trim() && criterion.evidence.consultedAt.trim(),
        `${key}: criterio sin evidencia completa`);
    }
  }
});

test('ES6/T46: una especie del catálogo sin perfil propio no tiene criterios en ninguna etapa', () => {
  const withProfile = new Set(Object.keys(SPECIES_RULES));
  for (const entry of SPECIES.filter(s => !withProfile.has(s.id)).slice(0, 20)) {
    for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) {
      assert.equal(hasEnabledCriteria(entry.id, stage), false, `${entry.id}/${stage}`);
      assert.deepEqual(evaluateSpeciesCriteria(entry.id, stage, raw, 'es'), []);
    }
  }
  assert.equal(findSpeciesRuleProfile('sp.no-existe'), undefined);
  assert.equal(findSpeciesRuleProfile(null), undefined);
});

test('ES6/T15: el criterio de pH de arándano distingue dentro, en el borde y fuera del rango documentado', () => {
  assert.equal(hasEnabledCriteria('sp.arandano', 'vegetativo'), true);
  assert.equal(hasEnabledCriteria('sp.arandano', 'floracion'), true);
  assert.equal(hasEnabledCriteria('sp.arandano', 'cosecha'), false, 'el criterio no se declaró para cosecha');

  const within = evaluateSpeciesCriteria('sp.arandano', 'vegetativo', { ...raw, ph: 4.8 }, 'es');
  assert.equal(within.length, 1);
  assert.equal(within[0].type, 'info');

  const lowerEdge = evaluateSpeciesCriteria('sp.arandano', 'vegetativo', { ...raw, ph: 4.5 }, 'es');
  const upperEdge = evaluateSpeciesCriteria('sp.arandano', 'vegetativo', { ...raw, ph: 5.3 }, 'es');
  assert.equal(lowerEdge[0].type, 'info');
  assert.equal(upperEdge[0].type, 'info');

  const tooAcidic = evaluateSpeciesCriteria('sp.arandano', 'vegetativo', { ...raw, ph: 4.4 }, 'es');
  const tooAlkaline = evaluateSpeciesCriteria('sp.arandano', 'vegetativo', { ...raw, ph: 5.4 }, 'es');
  assert.equal(tooAcidic[0].type, 'warning');
  assert.equal(tooAlkaline[0].type, 'warning');
  assert.match(tooAcidic[0].action, /University of Maryland Extension/);

  // Cosecha no tiene el criterio habilitado: ninguna alerta propia de la especie.
  assert.deepEqual(evaluateSpeciesCriteria('sp.arandano', 'cosecha', { ...raw, ph: 4.4 }, 'es'), []);
});

test('ES6/T45: los criterios de especie se agregan al final sin alterar las alertas generales', () => {
  for (const reading of [raw, { ...raw, ph: 4.4, ec: 2400, temp: 3 }]) {
    const without = evaluateReadingForStage(reading, 'vegetativo', 'es', clock, null);
    const withSpecies = evaluateReadingForStage(reading, 'vegetativo', 'es', clock, 'sp.arandano');
    assert.deepEqual(withSpecies.alerts.slice(0, without.alerts.length), without.alerts);
    assert.equal(withSpecies.alerts.length, without.alerts.length + 1);
    assert.equal(withSpecies.alerts.at(-1)?.param, 'ph');
    // Un cultivo sin perfil (p.ej. nadie o una especie desconocida) no agrega nada.
    const unknown = evaluateReadingForStage(reading, 'vegetativo', 'es', clock, 'sp.tomate');
    assert.deepEqual(unknown.alerts, without.alerts);
  }
});
