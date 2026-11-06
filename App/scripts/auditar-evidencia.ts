/**
 * Auditoría del contrato de evidencia de los criterios por especie.
 *
 * El kit exige que cada criterio nombre su fuente —institución, título, enlace,
 * sección, fecha de consulta y el valor tal como aparece en el original— y que
 * declare sus limitaciones, que nunca se omiten. Un criterio resuelto por
 * analogía tiene que decirlo. Esto lo comprueba, porque es la diferencia que el
 * proyecto vende como defendible y no puede quedar a la buena fe.
 *
 *   npx tsx scripts/auditar-evidencia.ts
 */
import { SPECIES } from '../src/engine/speciesCatalog';
import { SPECIES_RULES, SPECIES_RULES_VERSION } from '../src/engine/speciesRules';

type Falla = { especie: string; tipo: string; motivo: string };
const fallas: Falla[] = [];
const vacio = (v: unknown) => typeof v !== 'string' || !v.trim();

let criterios = 0, pruebas = 0;
const instituciones = new Map<string, number>();
const sinFecha: string[] = [];
let analogos = 0, conLimitacion = 0;

for (const s of SPECIES) {
  const perfil = SPECIES_RULES[s.id];
  if (!perfil) { fallas.push({ especie: s.es, tipo: '—', motivo: 'sin perfil' }); continue; }
  for (const c of perfil.criteria) {
    criterios += 1;
    const donde = (motivo: string) => fallas.push({ especie: s.es, tipo: c.kind, motivo });
    if (vacio(c.note) || vacio(c.noteEn)) donde('nota vacía en algún idioma');
    if (vacio(c.limitations) || vacio(c.limitationsEn)) donde('limitaciones vacías'); else conLimitacion += 1;
    const scope = (c as { scope?: string }).scope;
    if (scope === 'analog') analogos += 1;
    if (!c.evidence?.length) { donde('sin evidencia'); continue; }
    for (const e of c.evidence) {
      pruebas += 1;
      instituciones.set(e.institution, (instituciones.get(e.institution) ?? 0) + 1);
      if (vacio(e.institution)) donde('evidencia sin institución');
      if (vacio(e.title)) donde('evidencia sin título');
      if (vacio(e.section)) donde('evidencia sin sección citada');
      if (vacio(e.originalValue)) donde('evidencia sin el valor original de la fuente');
      if (!/^https?:\/\//.test(e.url ?? '')) donde(`enlace que no es una URL: ${e.url}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.consultedAt ?? '')) { donde('fecha de consulta mal formada'); sinFecha.push(s.es); }
    }
  }
}

console.log(`Reglas ${SPECIES_RULES_VERSION}: ${criterios} criterios sobre ${SPECIES.length} especies, ${pruebas} citas`);
console.log(`Criterios con limitaciones declaradas: ${conLimitacion} de ${criterios}`);
console.log(`Criterios resueltos por analogía: ${analogos}`);
console.log(`\nInstituciones citadas (${instituciones.size}):`);
for (const [nombre, n] of [...instituciones].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
  console.log(`   ${String(n).padStart(4)}  ${nombre}`);
}
console.log(`\nIncumplimientos del contrato: ${fallas.length}`);
for (const f of fallas.slice(0, 25)) console.log(`   ${f.especie} · ${f.tipo}: ${f.motivo}`);
process.exit(fallas.length ? 1 : 0);
