import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyPh, evaluateSpeciesCriteria, findSpeciesRuleProfile, hasEnabledCriteria, SPECIES_RULES, type SpeciesPhCriterion,
} from '../src/engine/speciesRules';
import { evaluateReadingForStage } from '../src/engine/stageEvaluator';
import { SPECIES, findSpecies } from '../src/engine/speciesCatalog';
import type { SoilMeasurement } from '../src/types/agronomy';

const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 24, airHumidity: 55, airPressure: 1010 };
const clock = { capturedAt: '2026-10-11T15:30:00.000Z', evaluatedAt: '2026-10-11T15:31:00.000Z' };
const STAGES = ['vegetativo', 'floracion', 'cosecha'] as const;
const phCriteria = Object.values(SPECIES_RULES).flatMap(p => p.criteria.map(c => ({ id: p.speciesId, c: c as SpeciesPhCriterion })));
const round = (n: number) => Math.round(n * 10) / 10;

/** La cifra aparece tal cual en el texto de la fuente: 6 o 6.0 o 6,0; 6.5 o 6,5. Nunca como parte de otra cifra. */
const citesNumber = (text: string, n: number) => {
  const [int, dec = '0'] = n.toFixed(1).split('.');
  const forms = dec === '0' ? [int, `${int}[.,]0`] : [`${int}[.,]\\s?${dec}`];
  return new RegExp(`(?<![\\d.,])(?:${forms.join('|')})(?!\\d|[.,]\\d)`).test(text);
};

test('ES6: todo perfil corresponde a una especie real del catálogo y tiene evidencia completa', () => {
  assert.ok(Object.keys(SPECIES_RULES).length >= 30, 'el lote ES6 cubre las especies documentadas');
  for (const [key, profile] of Object.entries(SPECIES_RULES)) {
    assert.equal(profile.speciesId, key);
    assert.ok(findSpecies(key), `${key} no existe en speciesCatalog.ts`);
    assert.ok(profile.criteria.length > 0, `${key} no declara ningún criterio`);
    for (const criterion of profile.criteria) {
      assert.ok(criterion.stages.length > 0, `${key}: criterio sin etapas`);
      assert.ok(criterion.evidence.length > 0, `${key}: criterio sin fuente`);
      assert.ok(criterion.note.trim() && criterion.noteEn.trim() && criterion.limitations.trim() && criterion.limitationsEn.trim(), `${key}: textos incompletos`);
      for (const e of criterion.evidence) {
        assert.ok(e.institution.trim() && e.title.trim() && e.section.trim() && e.originalValue.trim(), `${key}: evidencia incompleta`);
        assert.match(e.url, /^https:\/\//, `${key}: URL`);
        assert.match(e.consultedAt, /^\d{4}-\d{2}-\d{2}$/, `${key}: fecha de consulta`);
      }
    }
  }
});

test('ES6: los umbrales de pH son coherentes y cada cifra figura en el valor original de una fuente', () => {
  for (const { id, c } of phCriteria) {
    const values = [c.lowerLimit, c.optimum.min, c.optimum.max, c.upperLimit].filter((v): v is number => v != null);
    for (const v of values) assert.ok(Number.isFinite(v) && v >= 3 && v <= 10, `${id}: ${v} fuera del dominio del pH`);
    for (let i = 1; i < values.length; i++) assert.ok(values[i - 1] <= values[i], `${id}: límites desordenados ${values.join(' ≤ ')}`);
    const original = c.evidence.map(e => e.originalValue).join(' | ');
    // Una cifra que no aparece en la fuente es una transcripción errónea o un valor inventado (§7.5).
    for (const v of values) assert.ok(citesNumber(original, v), `${id}: ${v} no figura en «${original}»`);
  }
});

test('ES6/T46: una especie del catálogo sin perfil propio no tiene criterios en ninguna etapa', () => {
  const withProfile = new Set(Object.keys(SPECIES_RULES));
  const without = SPECIES.filter(s => !withProfile.has(s.id));
  assert.ok(without.length > 0);
  for (const entry of without) for (const stage of STAGES) {
    assert.equal(hasEnabledCriteria(entry.id, stage), false, `${entry.id}/${stage}`);
    assert.deepEqual(evaluateSpeciesCriteria(entry.id, stage, raw, 'es'), []);
  }
  assert.equal(findSpeciesRuleProfile('sp.no-existe'), undefined);
  assert.equal(findSpeciesRuleProfile('toString'), undefined, 'una clave heredada no es un perfil');
  assert.equal(findSpeciesRuleProfile('tomate'), undefined, 'los IDs del prototipo no son especies');
  assert.equal(findSpeciesRuleProfile(null), undefined);
});

test('ES6/T15: en cada perfil, el límite exacto no advierte y un décimo más allá sí', () => {
  for (const { id, c } of phCriteria) {
    const type = (ph: number) => evaluateSpeciesCriteria(id, 'vegetativo', { ...raw, ph }, 'es')[0]?.type;
    if (c.lowerLimit != null) {
      assert.equal(type(c.lowerLimit), 'info', `${id}: en el mínimo ${c.lowerLimit}`);
      assert.equal(type(round(c.lowerLimit - 0.1)), 'warning', `${id}: bajo el mínimo`);
    } else {
      assert.equal(type(3.5), 'info', `${id}: sin mínimo documentado no hay advertencia`);
    }
    if (c.upperLimit != null) {
      assert.equal(type(c.upperLimit), 'info', `${id}: en el máximo ${c.upperLimit}`);
      assert.equal(type(round(c.upperLimit + 0.1)), 'warning', `${id}: sobre el máximo`);
    } else {
      assert.equal(type(9.5), 'info', `${id}: sin máximo documentado no hay advertencia`);
    }
    assert.equal(classifyPh(c, c.optimum.min), 'optimum', id);
    assert.equal(classifyPh(c, c.optimum.max), 'optimum', id);
  }
});

test('ES6/T15: arándano distingue óptimo, fuera del óptimo y límites documentados', () => {
  const at = (ph: number, language: 'es' | 'en' = 'es') => evaluateSpeciesCriteria('sp.arandano', 'vegetativo', { ...raw, ph }, language)[0];
  assert.equal(hasEnabledCriteria('sp.arandano', 'vegetativo'), true);
  assert.equal(hasEnabledCriteria('sp.arandano', 'floracion'), true);
  assert.equal(hasEnabledCriteria('sp.arandano', 'cosecha'), false, 'el criterio no se declaró para cosecha');
  assert.equal(at(4.8).type, 'info');
  assert.match(at(4.8).title, /dentro del óptimo documentado para esta especie \(4,5–5,3\)/);
  // Entre 4,3 y 4,5 está bajo el ideal, pero la fuente sólo indica encalar bajo 4,3.
  assert.equal(at(4.4).type, 'info');
  assert.match(at(4.4).title, /bajo el óptimo \(4,5–5,3\).*sobre su mínimo \(4,3\)/);
  assert.equal(at(4.2).type, 'warning');
  assert.equal(at(5.3).type, 'info');
  assert.equal(at(5.4).type, 'warning');
  assert.match(at(5.4).title, /sobre el máximo documentado para esta especie \(5,3\)/);
  assert.match(at(4.2).action, /University of Maryland Extension/);
  assert.match(at(4.2).action, /laboratorio/);
  assert.match(at(5.4, 'en').title, /above the documented maximum for this species \(5\.3\)/);
  assert.deepEqual(evaluateSpeciesCriteria('sp.arandano', 'cosecha', { ...raw, ph: 4.2 }, 'es'), []);
});

test('ES6: tomate combina el óptimo de INIA con el mínimo de encalado y no inventa un máximo', () => {
  const at = (ph: number) => evaluateSpeciesCriteria('sp.tomate', 'floracion', { ...raw, ph }, 'es')[0];
  assert.equal(at(5.9).type, 'warning');
  assert.equal(at(6.0).type, 'info');
  assert.match(at(6.2).title, /dentro del óptimo documentado para esta especie \(6–6,5\)/);
  assert.equal(at(7.8).type, 'info', 'INIA documenta tomate establecido con pH 8');
  assert.match(at(7.8).title, /no hay un máximo documentado/);
  assert.match(at(7.8).action, /INIA; University of Maryland Extension/);
});

test('ES6: papa sólo advierte bajo el mínimo común a ambos grupos de variedades', () => {
  const at = (ph: number) => evaluateSpeciesCriteria('sp.papa', 'vegetativo', { ...raw, ph }, 'es')[0];
  assert.equal(at(4.9).type, 'warning');
  for (const ph of [5.0, 5.3, 6.0, 7.0]) assert.equal(at(ph).type, 'info', `pH ${ph}`);
  assert.match(at(5.3).action, /variedad/);
});

test('ES6: una hortaliza con valor objetivo único lo nombra como objetivo, no como rango', () => {
  const lettuce = (ph: number, language: 'es' | 'en' = 'es') => evaluateSpeciesCriteria('sp.lechuga', 'vegetativo', { ...raw, ph }, language)[0];
  assert.match(lettuce(6.5).title, /en el objetivo documentado para esta especie \(6,5\)/);
  assert.match(lettuce(6.2).title, /bajo el objetivo 6,5 documentado para esta especie, sobre su mínimo \(6\)/);
  assert.match(lettuce(7.2).title, /sobre el objetivo 6,5 .*no hay un máximo documentado/);
  assert.match(lettuce(5.9).title, /bajo el mínimo documentado para esta especie \(6\)/);
  assert.match(lettuce(5.9).action, /materia orgánica/);
  assert.match(lettuce(7.2, 'en').title, /above this species' documented target 6\.5; no maximum is documented/);
  // El texto en inglés no mezcla español.
  assert.doesNotMatch(lettuce(5.9, 'en').action, /laboratorio|Fuente|objetivo/);
});

test('ES6: un pH ausente, no finito o que no se puede interpretar no se compara con la especie', () => {
  for (const ph of [Number.NaN, Number.POSITIVE_INFINITY, null as unknown as number]) {
    assert.deepEqual(evaluateSpeciesCriteria('sp.tomate', 'vegetativo', { ...raw, ph }, 'es'), []);
  }
  assert.deepEqual(evaluateSpeciesCriteria('sp.tomate', 'vegetativo', { ...raw, ph: 5 }, 'es', () => false), []);
  // Una captura antigua suspende la interpretación también para la especie.
  const stale = evaluateReadingForStage({ ...raw, ph: 5 }, 'vegetativo', 'es', { capturedAt: clock.capturedAt, evaluatedAt: '2026-10-11T18:00:00.000Z' }, 'sp.tomate');
  assert.equal(stale.alerts.some(a => a.param === 'ph'), false);
});

test('ES6/T45: los criterios de especie se agregan al final sin alterar las alertas generales', () => {
  for (const speciesId of Object.keys(SPECIES_RULES)) {
    for (const reading of [raw, { ...raw, ph: 4.4, ec: 2400, temp: 3 }, { ...raw, ph: 8.6, vwc: 2 }]) {
      for (const stage of STAGES) {
        const without = evaluateReadingForStage(reading, stage, 'es', clock, null);
        const withSpecies = evaluateReadingForStage(reading, stage, 'es', clock, speciesId);
        assert.deepEqual(withSpecies.alerts.slice(0, without.alerts.length), without.alerts, `${speciesId}/${stage}`);
        const added = withSpecies.alerts.slice(without.alerts.length);
        assert.equal(added.length, hasEnabledCriteria(speciesId, stage) ? 1 : 0, `${speciesId}/${stage}`);
        // Una nota informativa no cambia el estado; sólo cruzar un límite documentado lo hace.
        if (added.every(a => a.type === 'info')) assert.equal(withSpecies.state, without.state, `${speciesId}/${stage}`);
        else assert.equal(withSpecies.state, 'attention');
        assert.equal(new Set(withSpecies.drivers).size, withSpecies.drivers.length, 'sin parámetros repetidos');
      }
    }
  }
  // Una especie sin perfil o desconocida no agrega nada.
  for (const id of ['sp.palto', 'sp.no-existe']) {
    assert.deepEqual(evaluateReadingForStage(raw, 'vegetativo', 'es', clock, id).alerts, evaluateReadingForStage(raw, 'vegetativo', 'es', clock, null).alerts);
  }
});
