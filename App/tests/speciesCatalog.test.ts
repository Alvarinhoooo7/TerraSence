import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  EXCLUDED_SOURCE_NAMES, NO_SPECIES_ID, SPECIES, SPECIES_GROUPS, SPECIES_SOURCES, findSpecies, hasStageCriteria,
  normalizeSearch, searchSpecies, type SpeciesSourceId,
} from '../src/engine/speciesCatalog';
import { hasEnabledCriteria } from '../src/engine/speciesRules';

// Nombres exactos de las fuentes oficiales, extraídos de los archivos descargados (TASK ES1).
const sourceNames = JSON.parse(readFileSync(new URL('./fixtures/speciesSourceNames.json', import.meta.url), 'utf8')) as Record<SpeciesSourceId, string[]>;
// IDs del prototipo que ya existen en mediciones guardadas: el catálogo nuevo no debe reutilizarlos.
const LEGACY_IDS = ['maiz', 'tomate', 'papa', 'trigo', 'lechuga', 'palto', 'vid', 'arandano', NO_SPECIES_ID];

test('ES1: IDs únicos, con prefijo, que caben en crop_id y no chocan con los del prototipo', () => {
  const ids = SPECIES.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, /^sp\.[a-z0-9-]+$/);
    assert.ok(id.length <= 50, id);
    assert.equal(LEGACY_IDS.includes(id), false, id);
  }
});

test('ES1: cada especie tiene nombres en ambos idiomas, nombre científico, grupo conocido y una fuente declarada', () => {
  const groups = new Set(SPECIES_GROUPS.map(g => g.id));
  for (const entry of SPECIES) {
    assert.ok(entry.es.trim() && entry.en.trim() && entry.scientific.trim(), entry.id);
    assert.ok(groups.has(entry.group), entry.id);
    const sources = Object.entries(entry.sources);
    assert.ok(sources.length > 0, entry.id);
    for (const [source, names] of sources) {
      assert.ok(source in SPECIES_SOURCES, `${entry.id}: ${source}`);
      assert.ok(names && names.length > 0, `${entry.id}: ${source}`);
    }
  }
});

test('ES1: completitud — todo nombre de hortalizas, frutales y cultivos anuales de las fuentes tiene destino', () => {
  for (const [source, names] of Object.entries(sourceNames) as [SpeciesSourceId, string[]][]) {
    const mapped = new Set(SPECIES.flatMap(entry => entry.sources[source] ?? []));
    const excluded = EXCLUDED_SOURCE_NAMES[source] ?? {};
    const missing = names.filter(name => !mapped.has(name) && !(name in excluded));
    assert.deepEqual(missing, [], `${source}: nombres sin especie ni exclusión`);
    // Y al revés: el catálogo no cita un nombre que la fuente no contiene.
    const unknown = [...mapped, ...Object.keys(excluded)].filter(name => !names.includes(name));
    assert.deepEqual(unknown, [], `${source}: nombres citados que la fuente no contiene`);
  }
});

test('ES1: hortalizas y frutales cubren lo más cultivado en Chile', () => {
  for (const id of ['sp.maiz', 'sp.cebolla', 'sp.lechuga', 'sp.poroto', 'sp.tomate', 'sp.zapallo', 'sp.zanahoria', 'sp.papa', 'sp.frutilla',
    'sp.cerezo', 'sp.avellano', 'sp.nogal', 'sp.palto', 'sp.vid', 'sp.manzano', 'sp.olivo', 'sp.arandano', 'sp.ciruelo', 'sp.mandarino']) {
    assert.ok(findSpecies(id), id);
  }
});

test('T47: la búsqueda ignora tildes, mayúsculas e idioma y encuentra por sinónimo', () => {
  const ids = (query: string, language: 'es' | 'en' = 'es') => searchSpecies(query, language).map(s => s.id);
  assert.ok(ids('MAIZ').includes('sp.maiz'));
  assert.ok(ids('choclo').includes('sp.maiz'));
  assert.equal(ids('palta')[0], 'sp.palto');
  assert.equal(ids('zucchini')[0], 'sp.zapallo-italiano');
  assert.equal(ids('pimenton')[0], 'sp.pimiento');
  assert.equal(ids('avocado', 'en')[0], 'sp.palto');
  assert.equal(ids('aguacate')[0], 'sp.palto');
  assert.ok(ids('uni').includes('sp.murtilla'));
  assert.ok(ids('fresa').includes('sp.frutilla'));
  assert.deepEqual(ids('zzzz'), []);
  assert.equal(normalizeSearch('  Árbol   Ñandú '), 'arbol nandu');
});

test('T47: sin búsqueda devuelve toda la lista agrupada y en orden estable', () => {
  const all = searchSpecies('', 'es');
  assert.equal(all.length, SPECIES.length);
  const groupIndex = (id: string) => SPECIES_GROUPS.findIndex(g => g.id === findSpecies(id)!.group);
  for (let i = 1; i < all.length; i++) assert.ok(groupIndex(all[i - 1].id) <= groupIndex(all[i].id));
  assert.deepEqual(searchSpecies('', 'es').map(s => s.id), all.map(s => s.id));
  assert.equal(all[0].group, 'hortalizas');
});

test('ES6: hasStageCriteria refleja únicamente los perfiles habilitados en speciesRules.ts', () => {
  for (const entry of SPECIES) for (const stage of ['vegetativo', 'floracion', 'cosecha'] as const) {
    assert.equal(hasStageCriteria(entry.id, stage), hasEnabledCriteria(entry.id, stage), `${entry.id}/${stage}`);
  }
  // Los perfiles ES6 documentan pH en vegetativo y floración; en cosecha, sólo criterios del pronóstico.
  assert.equal(hasStageCriteria('sp.arandano', 'vegetativo'), true);
  assert.equal(hasStageCriteria('sp.arandano', 'floracion'), true);
  assert.equal(hasStageCriteria('sp.arandano', 'cosecha'), true);
  assert.equal(hasStageCriteria('sp.frutilla', 'vegetativo'), true);
  // Olivo no tiene una fuente que documente un criterio de cosecha.
  assert.equal(hasStageCriteria('sp.olivo', 'cosecha'), false);
  // El resto del catálogo sigue sin perfil hasta incorporarse con su propia evidencia.
  assert.equal(hasStageCriteria('sp.palto', 'vegetativo'), false);
});
