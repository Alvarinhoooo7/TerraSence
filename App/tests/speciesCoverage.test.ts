import assert from 'node:assert/strict';
import test from 'node:test';
import { SPECIES_RULES } from '../src/engine/speciesRules';
import type { SpeciesCriterion } from '../src/engine/speciesRules';
import { SPECIES, SPECIES_GROUPS, findSpecies } from '../src/engine/speciesCatalog';
import type { SpeciesGroup } from '../src/engine/speciesCatalog';
import { A_ELIMINAR_HORTALIZAS, PENDIENTES_HORTALIZAS } from './es7Hortalizas';
import { A_ELIMINAR_FRUTALES, PENDIENTES_FRUTALES } from './es7Frutales';
import { A_ELIMINAR_BERRIES_AROMATICAS, PENDIENTES_BERRIES_AROMATICAS } from './es8BerriesAromaticas';
import { A_ELIMINAR_CULTIVOS, PENDIENTES_CULTIVOS } from './es8Cultivos';

// TASK ES7/ES8: cada especie del catálogo con al menos un criterio evaluable en cada etapa con especie.
const STAGES = ['vegetativo', 'floracion', 'cosecha'] as const;
/** Salinidad y etapa crítica de riego son referencias que no comparan la lectura: no cubren una etapa. */
const EVALUABLE = new Set<SpeciesCriterion['kind']>(['ph', 'air_temperature', 'reading', 'weather_event']);

const covers = (speciesId: string, stage: typeof STAGES[number]) =>
  (Object.prototype.hasOwnProperty.call(SPECIES_RULES, speciesId) ? SPECIES_RULES[speciesId].criteria : [])
    .some(c => c.state === 'enabled' && EVALUABLE.has(c.kind) && c.stages.includes(stage));

const gaps = (groups: readonly SpeciesGroup[], removed: readonly string[]) => SPECIES
  .filter(s => groups.includes(s.group) && !removed.includes(s.id))
  .flatMap(s => STAGES.filter(stage => !covers(s.id, stage)).map(stage => `${s.id}/${stage}`));

/** Cada lista pertenece a un agente; juntas cubren todos los grupos del catálogo. */
const LOTES: readonly { name: string; groups: readonly SpeciesGroup[]; pending: readonly string[]; removed: readonly string[] }[] = [
  { name: 'ES7.A', groups: ['hortalizas'], pending: PENDIENTES_HORTALIZAS, removed: A_ELIMINAR_HORTALIZAS },
  { name: 'ES7.B', groups: ['frutales'], pending: PENDIENTES_FRUTALES, removed: A_ELIMINAR_FRUTALES },
  { name: 'ES8.C', groups: ['berries', 'aromaticas'], pending: PENDIENTES_BERRIES_AROMATICAS, removed: A_ELIMINAR_BERRIES_AROMATICAS },
  { name: 'ES8.D', groups: ['cultivos', 'forrajeras', 'forestales'], pending: PENDIENTES_CULTIVOS, removed: A_ELIMINAR_CULTIVOS },
];

test('ES8: los lotes cubren todos los grupos del catálogo, cada uno una sola vez', () => {
  assert.deepEqual(LOTES.flatMap(l => l.groups).sort(), SPECIES_GROUPS.map(g => g.id).sort());
});

for (const { name, groups, pending, removed } of LOTES) {
  test(`${name}: cada especie de ${groups.join(', ')} tiene un criterio evaluable en vegetativo, floración y cosecha`, () => {
    // Una combinación cubierta que sigue en la lista también falla: la lista refleja el avance real.
    assert.deepEqual([...gaps(groups, removed)].sort(), [...pending].sort());
  });

  test(`${name}: una especie que se retira no queda a medias`, () => {
    for (const id of removed) {
      assert.ok(groups.includes(findSpecies(id)?.group as SpeciesGroup), `${id} no es de ${groups.join(', ')}`);
      assert.ok(!Object.prototype.hasOwnProperty.call(SPECIES_RULES, id), `${id} se retira y todavía tiene perfil`);
      assert.ok(!pending.some(item => item.startsWith(`${id}/`)), `${id} se retira y sigue pendiente`);
    }
  });
}

test('ES7: un criterio por analogía declara su especie de origen, que lo tiene con fuente propia', () => {
  for (const profile of Object.values(SPECIES_RULES)) for (const c of profile.criteria) {
    const where = `${profile.speciesId}/${c.kind}`;
    if (c.scope !== 'analog') {
      assert.equal(c.analogOf, undefined, `${where}: analogOf sin scope 'analog'`);
      continue;
    }
    assert.ok(c.analogOf && c.analogOf !== profile.speciesId, `${where}: origen ausente o es la misma especie`);
    const origin = Object.prototype.hasOwnProperty.call(SPECIES_RULES, c.analogOf) ? SPECIES_RULES[c.analogOf] : undefined;
    assert.ok(origin, `${where}: ${c.analogOf} no tiene perfil`);
    // Sin encadenar: el origen tiene el mismo tipo de criterio con fuente propia, en alguna de las mismas etapas.
    const own = origin.criteria.filter(o => o.kind === c.kind && o.scope !== 'analog' && o.stages.some(s => c.stages.includes(s)));
    assert.ok(own.length > 0, `${where}: ${c.analogOf} no tiene ese criterio con fuente propia en esas etapas`);
    // La evidencia y la cifra son las del origen, no una fuente nueva atribuida por semejanza.
    const urls = new Set(own.flatMap(o => o.evidence.map(e => e.url)));
    for (const e of c.evidence) assert.ok(urls.has(e.url), `${where}: ${e.url} no es una fuente de ${c.analogOf}`);
    const entry = findSpecies(c.analogOf)!;
    assert.match(c.limitations, new RegExp(entry.es, 'i'), `${where}: las limitaciones no nombran a ${entry.es}`);
    assert.match(c.limitationsEn, new RegExp(entry.en, 'i'), `${where}: las limitaciones en inglés no nombran a ${entry.en}`);
    assert.match(c.limitations, /^Sin fuente propia para /, `${where}: las limitaciones no declaran la analogía`);
  }
});
