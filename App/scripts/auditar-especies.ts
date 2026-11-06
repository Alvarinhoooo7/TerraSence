/**
 * Inventario de cobertura del catálogo de cultivos.
 *
 * Responde dos preguntas distintas que conviene no mezclar:
 *
 *   1. ¿Toda especie se puede evaluar en toda etapa? Es la regla que exige
 *      `tests/speciesCoverage.test.ts`: al menos un criterio evaluable y
 *      habilitado por especie y etapa.
 *   2. ¿Qué variable de la pantalla puede hablar de la especie? Depende del
 *      tipo de criterio, y es lo que decide cuánto se puede personalizar el
 *      detalle de cada tarjeta.
 *
 *   npx tsx scripts/auditar-especies.ts
 */
import { SPECIES, SPECIES_GROUPS } from '../src/engine/speciesCatalog';
import { PRE_PLANTING_PROFILES, PRE_PLANTING_VERSION } from '../src/engine/prePlanting';
import { SPECIES_RULES, SPECIES_RULES_VERSION } from '../src/engine/speciesRules';
import type { SpeciesCriterion } from '../src/engine/speciesRules';

const STAGES = ['vegetativo', 'floracion', 'cosecha'] as const;
const EVALUABLE = new Set<SpeciesCriterion['kind']>(['ph', 'air_temperature', 'reading', 'weather_event']);

const criterios = (id: string) =>
  Object.prototype.hasOwnProperty.call(SPECIES_RULES, id) ? SPECIES_RULES[id].criteria : [];
const cubre = (id: string, etapa: typeof STAGES[number]) =>
  criterios(id).some(c => c.state === 'enabled' && EVALUABLE.has(c.kind) && c.stages.includes(etapa));

console.log(`Catálogo: ${SPECIES.length} especies · reglas ${SPECIES_RULES_VERSION}`);
const huecos = SPECIES.flatMap(s => STAGES.filter(e => !cubre(s.id, e)).map(e => `${s.id}/${e}`));
console.log(`Cobertura especie/etapa: ${SPECIES.length * 3 - huecos.length} de ${SPECIES.length * 3}` +
  (huecos.length ? `  ·  faltan: ${huecos.join(', ')}` : '  ·  completa'));

// --------------------------------------------------- estados de los criterios
const porEstado = new Map<string, number>();
const porTipo = new Map<string, number>();
for (const s of SPECIES) {
  for (const c of criterios(s.id)) {
    porEstado.set(c.state, (porEstado.get(c.state) ?? 0) + 1);
    porTipo.set(c.kind, (porTipo.get(c.kind) ?? 0) + 1);
  }
}
console.log(`\nCriterios totales: ${[...porEstado.values()].reduce((a, b) => a + b, 0)}`);
console.log(`   por estado: ${[...porEstado].sort().map(([k, n]) => `${k} ${n}`).join(' · ')}`);
console.log(`   por tipo:   ${[...porTipo].sort().map(([k, n]) => `${k} ${n}`).join(' · ')}`);

// ------------------------------------- qué tarjeta puede hablar de la especie
// El tipo de criterio decide qué variable de la pantalla admite texto propio.
const TARJETA: Record<string, readonly SpeciesCriterion['kind'][]> = {
  'pH del suelo': ['ph'],
  'Conductividad eléctrica': ['salinity_reference'],
  'Humedad del suelo': ['water_sensitivity'],
  'Temperatura del aire': ['air_temperature'],
  'Lectura comparada': ['reading'],
  'Evento del pronóstico': ['weather_event'],
};
console.log('\nTARJETA                      especies con criterio   habilitados   de 111');
console.log('-'.repeat(76));
for (const [tarjeta, tipos] of Object.entries(TARJETA)) {
  const con = SPECIES.filter(s => criterios(s.id).some(c => tipos.includes(c.kind)));
  const hab = SPECIES.filter(s => criterios(s.id).some(c => tipos.includes(c.kind) && c.state === 'enabled'));
  const pct = (hab.length / SPECIES.length * 100).toFixed(0);
  console.log(`${tarjeta.padEnd(28)} ${String(con.length).padStart(10)} ${String(hab.length).padStart(16)} ${(pct + ' %').padStart(10)}`);
}

// --------------------------------- especies sin criterio propio por tarjeta
for (const [tarjeta, tipos] of Object.entries(TARJETA)) {
  const sin = SPECIES.filter(s => !criterios(s.id).some(c => tipos.includes(c.kind) && c.state === 'enabled'));
  if (!sin.length || sin.length === SPECIES.length) continue;
  console.log(`\nSin criterio habilitado para «${tarjeta}» (${sin.length}):`);
  for (const grupo of SPECIES_GROUPS) {
    const propias = sin.filter(s => s.group === grupo.id);
    if (propias.length) console.log(`   ${grupo.id.padEnd(14)} ${propias.map(s => s.es).join(', ')}`);
  }
}

// ----------------------------------------------- cobertura de pre-siembra
const preIds = new Set(PRE_PLANTING_PROFILES.map(p => p.speciesId));
const sinPre = SPECIES.filter(s => !preIds.has(s.id));
console.log(`\nPre-siembra (reglas ${PRE_PLANTING_VERSION}): ${preIds.size} de ${SPECIES.length} especies (${PRE_PLANTING_PROFILES.length} perfiles)`);
if (sinPre.length) {
  console.log(`Sin perfil de pre-siembra (${sinPre.length}):`);
  for (const grupo of SPECIES_GROUPS) {
    const propias = sinPre.filter(s => s.group === grupo.id);
    if (propias.length) console.log(`   ${grupo.id.padEnd(14)} ${propias.map(s => s.es).join(', ')}`);
  }
}

// ----------------------------------------------- criterios por analogía
const analogos = SPECIES.filter(s => criterios(s.id).some(c => c.scope === 'analog' || (c as { origin?: string }).origin === 'analog'));
console.log(`\nEspecies con algún criterio por analogía: ${analogos.length}`);
if (analogos.length) console.log(`   ${analogos.map(s => s.es).join(', ')}`);
