/**
 * Criterios agronómicos propios de una especie, por etapa, con su evidencia (TASK ES6).
 *
 * `speciesCatalog.ts` es identidad: nombre, nombre científico y la fuente que acredita
 * que la especie se cultiva en Chile. Este archivo es agronomía: umbrales con fuente
 * técnica, habilitados criterio por criterio. Ninguna especie hereda el perfil de otra
 * ni del grupo (MOTOR_AGRONOMICO.md §7.1): un perfil ausente en `SPECIES_RULES` no tiene
 * criterios, y así lo informa `hasEnabledCriteria`.
 *
 * Proceso de incorporación de cada criterio: MOTOR_AGRONOMICO.md §7.5. Esquema de
 * evidencia por perfil: §7.2. Estados de una regla: §8.1 (`candidate`/`documented`/`enabled`
 * aquí; `locally_validated`/`retired` no aplican todavía porque no hay contraste de
 * terreno ni retiro de ningún criterio).
 */
import type { PhenologicalStage } from '../types/app';
import type { AgronomicAlert, SoilMeasurement } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';

/** Versión del conjunto de criterios; cambia cuando se agrega, corrige o retira uno. */
export const SPECIES_RULES_VERSION = '1.1.0';

export type SpeciesCriterionState = 'candidate' | 'documented' | 'enabled';

export interface SpeciesCriterionEvidence {
  institution: string;
  title: string;
  url: string;
  /** Sección, página o tabla citada dentro de la fuente. */
  section: string;
  /** Fecha ISO en que se verificó el contenido citado. */
  consultedAt: string;
  /** Valor y contexto tal como figuran en la fuente, antes de cualquier conversión. */
  originalValue: string;
}

/**
 * pH del suelo para una especie. Distingue dos cosas que las fuentes también distinguen:
 * el óptimo u objetivo (orienta, no alarma) y los límites donde la fuente documenta un
 * problema o una corrección (sólo cruzarlos genera advertencia). Un límite que la fuente
 * no documenta queda en `null`: nunca se rellena con el de otra especie (§7.2).
 */
export interface SpeciesPhCriterion {
  kind: 'ph';
  state: SpeciesCriterionState;
  /** Etapas de medición en que este criterio se evalúa. */
  stages: readonly PhenologicalStage[];
  /** Intervalo óptimo; `min === max` cuando la fuente da un único valor objetivo. */
  optimum: { min: number; max: number };
  /** Bajo este valor la fuente documenta un problema o indica corregir. */
  lowerLimit: number | null;
  /** Sobre este valor la fuente documenta un problema o indica corregir. */
  upperLimit: number | null;
  note: string;
  noteEn: string;
  /** Qué no está documentado o qué contexto limita el criterio; nunca se omite. */
  limitations: string;
  limitationsEn: string;
  /** Al menos una fuente; varias cuando se combinan o se contrastan. */
  evidence: readonly SpeciesCriterionEvidence[];
}

/** Únicamente `ph` por ahora; ES6 incorpora temperatura, salinidad, agua y clima por especie. */
export type SpeciesCriterion = SpeciesPhCriterion;

export interface SpeciesRuleProfile {
  /** == `SpeciesEntry.id` de speciesCatalog.ts. */
  speciesId: string;
  /** Anual o perenne con evaluación parcial de suelo/clima (§7.1, T42). */
  horizon: 'annual' | 'perennial_partial';
  criteria: readonly SpeciesCriterion[];
}

const GROWING: PhenologicalStage[] = ['vegetativo', 'floracion'];

/** Cifra en el formato del idioma: coma decimal en español. */
const decimal = (value: number, language: AppLanguage) => language === 'en' ? String(value) : String(value).replace('.', ',');

// --- Fuentes -------------------------------------------------------------------------

/** Mid-Atlantic Commercial Vegetable Production Recommendations, edición 2026, tabla B-1. */
const umdTableB1 = (crop: string, target: number, limeBelow: number): SpeciesCriterionEvidence => ({
  institution: 'University of Maryland Extension',
  title: 'Mid-Atlantic Commercial Vegetable Production Recommendations 2026, sección B «Soil and Nutrient Management»',
  url: 'https://extension.umd.edu/sites/extension.umd.edu/files/2026-02/Soil%20and%20Nutrient%20Management.pdf',
  section: 'Tabla B-1 «Target Soil pH Values for Vegetable Crops», p. 40',
  consultedAt: '2026-10-13',
  originalValue: `${crop}: target pH ${target}; apply lime when pH falls below ${limeBelow}`,
});

const UMD_B1_SCOPE = 'Tabla de producción comercial de hortalizas de la región atlántica media de Estados Unidos; la fuente sólo fija el valor objetivo y el pH bajo el cual encalar, sin un máximo. Ese mínimo es una indicación de manejo, no un umbral de daño medido en Chile.';
const UMD_B1_SCOPE_EN = 'Commercial vegetable production table for the US Mid-Atlantic; the source only sets the target value and the pH below which to lime, with no maximum. That minimum is a management threshold, not a damage threshold measured in Chile.';
const UMD_ORGANIC = ' En suelos con más de 6 % de materia orgánica, la misma fuente indica que muchos cultivos con objetivo 6,5 toleran un pH menor, típicamente 5,6.';
const UMD_ORGANIC_EN = ' On soils with more than 6% organic matter, the same source notes that many crops with a 6.5 target tolerate a lower pH, typically 5.6.';

/**
 * Hortaliza de la tabla B-1: el objetivo es el óptimo y «encalar bajo» es el límite inferior.
 * `extra` agrega el alcance propio de la especie (p. ej. qué uso cubre la fila de la tabla).
 */
const umdVegetable = (
  crop: string, target: number, limeBelow: number,
  extra = '', extraEn = '',
): SpeciesPhCriterion => {
  const organic = target === 6.5;
  return {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: target, max: target }, lowerLimit: limeBelow, upperLimit: null,
    note: `pH objetivo documentado: ${decimal(target, 'es')}; se indica encalar bajo ${decimal(limeBelow, 'es')}.`,
    noteEn: `Documented target pH: ${decimal(target, 'en')}; liming is indicated below ${decimal(limeBelow, 'en')}.`,
    limitations: `${UMD_B1_SCOPE}${organic ? UMD_ORGANIC : ''}${extra ? ` ${extra}` : ''}`,
    limitationsEn: `${UMD_B1_SCOPE_EN}${organic ? UMD_ORGANIC_EN : ''}${extraEn ? ` ${extraEn}` : ''}`,
    evidence: [umdTableB1(crop, target, limeBelow)],
  };
};

const annual = (speciesId: string, ...criteria: SpeciesCriterion[]): SpeciesRuleProfile => ({ speciesId, horizon: 'annual', criteria });
const perennial = (speciesId: string, ...criteria: SpeciesCriterion[]): SpeciesRuleProfile => ({ speciesId, horizon: 'perennial_partial', criteria });

/**
 * Perfiles habilitados. Cada uno se incorpora sólo con fuente propia verificada; no se
 * extrapola un rango de una especie a otra del mismo grupo. Fuentes priorizadas según
 * TASK ES6: INIA primero; tablas de extensión universitaria citables cuando INIA no
 * documenta la especie.
 */
const PROFILES: readonly SpeciesRuleProfile[] = [
  // --- Hortalizas: tabla B-1 de University of Maryland Extension ---
  annual('sp.apio', umdVegetable('Celery', 6.5, 6.0)),
  annual('sp.arveja', umdVegetable('Peas', 6.5, 6.0)),
  annual('sp.berenjena', umdVegetable('Eggplant', 6.5, 6.0)),
  annual('sp.betarraga', umdVegetable('Beets', 6.5, 6.2)),
  annual('sp.brocoli', umdVegetable('Broccoli', 6.5, 6.2)),
  annual('sp.camote', umdVegetable('Potatoes, sweet', 6.2, 5.5)),
  annual('sp.cebolla', umdVegetable('Onions - green, bulb, scallions', 6.5, 6.0)),
  annual('sp.cebollin', umdVegetable('Onions - green, bulb, scallions', 6.5, 6.0,
    'La fila de la tabla agrupa cebolla de bulbo y de verdeo.', 'The table row groups bulb and green onions.')),
  annual('sp.coliflor', umdVegetable('Cauliflower', 6.5, 6.2)),
  annual('sp.espinaca', umdVegetable('Spinach', 6.5, 6.0)),
  annual('sp.lechuga', umdVegetable('Lettuce - leaf, iceberg', 6.5, 6.0)),
  annual('sp.maiz', umdVegetable('Sweet corn', 6.5, 6.0,
    'La fila corresponde a choclo (maíz dulce); la fuente no trata el maíz de grano ni para silo.',
    'The row covers sweet corn; the source does not cover grain or silage maize.')),
  annual('sp.melon', umdVegetable('Cantaloupes; Muskmelons', 6.5, 6.0)),
  annual('sp.pepino', umdVegetable('Cucumber', 6.5, 6.0)),
  annual('sp.perejil', umdVegetable('Parsley', 6.5, 6.0)),
  annual('sp.pimiento', umdVegetable('Peppers', 6.5, 6.0)),
  annual('sp.poroto', umdVegetable('Beans - lima, snap', 6.2, 6.0,
    'La fila corresponde a poroto verde y pallar; la fuente no trata el poroto de grano seco.',
    'The row covers snap and lima beans; the source does not cover dry beans.')),
  annual('sp.puerro', umdVegetable('Leeks', 6.5, 6.0)),
  annual('sp.rabanito', umdVegetable('Radish', 6.5, 6.2)),
  annual('sp.repollito-bruselas', umdVegetable('Brussels sprouts', 6.5, 6.2)),
  annual('sp.repollo', umdVegetable('Cabbage', 6.5, 6.2)),
  annual('sp.sandia', umdVegetable('Watermelon', 6.2, 5.5)),
  annual('sp.zanahoria', umdVegetable('Carrot', 6.0, 5.5)),
  annual('sp.zapallo', umdVegetable('Pumpkins; Squash - winter, summer', 6.5, 6.0)),
  annual('sp.zapallo-italiano', umdVegetable('Squash - winter, summer', 6.5, 6.0)),
  perennial('sp.esparrago', umdVegetable('Asparagus', 6.8, 6.2)),

  // Papa: la tabla separa dos grupos de variedades y la variedad no se conoce. Sólo el
  // mínimo común (5,0) se puede afirmar para cualquier papa.
  annual('sp.papa', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 5.2, max: 6.2 }, lowerLimit: 5.0, upperLimit: null,
    note: 'El pH objetivo documentado depende de la variedad: 5,2 en variedades susceptibles a sarna común y 6,2 en resistentes. Bajo 5,0 se indica encalar en ambos grupos.',
    noteEn: 'The documented target pH depends on the variety: 5.2 for common-scab-susceptible varieties and 6.2 for resistant ones. Liming is indicated below 5.0 for both groups.',
    limitations: `${UMD_B1_SCOPE} Las variedades resistentes a sarna tienen su mínimo en 5,5; sin conocer la variedad, entre 5,0 y 5,5 no se puede afirmar una limitación.`,
    limitationsEn: `${UMD_B1_SCOPE_EN} Scab-resistant varieties have their minimum at 5.5; without knowing the variety, no limitation can be stated between 5.0 and 5.5.`,
    evidence: [
      umdTableB1('Potatoes - white, scab susceptible', 5.2, 5.0),
      umdTableB1('Potatoes - white, scab resistant', 6.2, 5.5),
    ],
  }),

  // Tomate: óptimo de INIA (Chile); mínimo de encalado de la tabla B-1, coherente con él.
  annual('sp.tomate', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 6.5 }, lowerLimit: 6.0, upperLimit: null,
    note: 'El pH óptimo documentado para tomate es 6 a 6,5; bajo 6,0 se indica encalar.',
    noteEn: 'The documented optimum pH for tomato is 6 to 6.5; liming is indicated below 6.0.',
    limitations: 'INIA no fija un máximo: documenta suelos desde ligeramente ácidos hasta medianamente alcalinos y cultivos establecidos con pH 8 en la Región de Arica y Parinacota. El mínimo proviene de una tabla de manejo de Estados Unidos.',
    limitationsEn: 'INIA sets no maximum: it documents soils from slightly acidic to moderately alkaline and crops established at pH 8 in the Arica y Parinacota Region. The minimum comes from a US management table.',
    evidence: [
      {
        institution: 'INIA',
        title: 'Manual de cultivo del tomate al aire libre (Boletín INIA–INDAP), capítulo 1',
        url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/21592963-55e3-43bb-9426-bd9ec288ae07/content',
        section: '1.5.1 Suelo, p. 16',
        consultedAt: '2026-10-13',
        originalValue: 'el pH de suelo óptimo debe oscilar entre 6 y 6,5; cultivos establecidos en suelos con pH 8 (Arica y Parinacota)',
      },
      umdTableB1('Tomatoes', 6.5, 6.0),
    ],
  }),

  // --- Berries ---
  perennial('sp.arandano', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 4.5, max: 5.3 }, lowerLimit: 4.3, upperLimit: 5.3,
    note: 'El pH ideal documentado para arándano es 4,5 a 5,3. La fuente indica corregir cuando sube de 5,3 o baja de 4,3.',
    noteEn: 'The documented ideal pH for blueberry is 4.5 to 5.3. The source indicates correcting when it rises above 5.3 or falls below 4.3.',
    limitations: 'Bajo 4,3 hay riesgo de toxicidad de aluminio; sobre 5,5 la planta crece lenta y achaparrada. La fuente es de la región atlántica media de Estados Unidos; otras fuentes dan intervalos algo distintos según el contexto y no se promedian.',
    limitationsEn: 'Below 4.3 there is a risk of aluminum toxicity; above 5.5 plants are stunted and grow slowly. The source is from the US Mid-Atlantic; other sources give somewhat different ranges by context and they are not averaged.',
    evidence: [{
      institution: 'University of Maryland Extension',
      title: 'Growing Blueberries in the Mid-Atlantic (FS-2025-0766)',
      url: 'https://www.extension.umd.edu/resource/growing-blueberries-mid-atlantic-fs-2025-0766',
      section: '«Site Selection and Preparation» y «Fertilizing»',
      consultedAt: '2026-10-13',
      originalValue: 'ideal pH range 4.5 to 5.3; stunted above 5.5; lime if pH falls below 4.3 to prevent aluminum toxicity; adjust using sulfur if pH rises above 5.3',
    }],
  }),
  perennial('sp.frutilla', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 5.8, max: 7.0 }, lowerLimit: 5.8, upperLimit: 7.2,
    note: 'El rango normal documentado para frutilla es pH 5,8 a 7,0.',
    noteEn: 'The documented normal range for strawberry is pH 5.8 to 7.0.',
    limitations: 'Bajo 5,8 la fuente advierte daño y toxicidad por microelementos; sobre 7,2, efecto en el crecimiento y en los microorganismos del suelo. Entre 7,0 y 7,2 no documenta un efecto.',
    limitationsEn: 'Below 5.8 the source warns of damage and micronutrient toxicity; above 7.2, effects on growth and soil microorganisms. Between 7.0 and 7.2 it documents no effect.',
    evidence: [
      {
        institution: 'INIA Quilamapu',
        title: 'Manual de frutilla (Boletín INIA N° 262, 2013), capítulo 1 «Establecimiento del cultivo de frutilla»',
        url: 'https://bibliotecadigital.ciren.cl/server/api/core/bitstreams/6989b90c-bc5f-494d-b790-fe196c0d430d/content',
        section: '«Requerimientos de suelo» y cuadro 1 «Características químicas del suelo»',
        consultedAt: '2026-10-13',
        originalValue: 'Reacción pH 5,8 - 7,0; suelos con pH inferiores a 5,8 pueden dañar las plantas; pH superiores a 7,2 pueden afectar el crecimiento',
      },
      umdTableB1('Strawberries', 6.2, 5.8),
    ],
  }),

  // --- Frutales ---
  perennial('sp.cerezo', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 6.5 }, lowerLimit: null, upperLimit: 7.5,
    note: 'El pH óptimo documentado para las raíces de cerezo es 6,0 a 6,5.',
    noteEn: 'The documented optimum pH for cherry roots is 6.0 to 6.5.',
    limitations: 'Sobre 7,5 la fuente documenta deficiencias de hierro, zinc, boro y manganeso. No fija un mínimo. La tolerancia cambia según el portainjerto, que no se conoce.',
    limitationsEn: 'Above 7.5 the source documents iron, zinc, boron and manganese deficiencies. It sets no minimum. Tolerance depends on the rootstock, which is unknown.',
    evidence: [{
      institution: 'INIA La Platina',
      title: 'El cultivo del cerezo (Boletín INIA N° 133, 2005)',
      url: 'https://biblioteca.inia.cl/items/4ed5eb65-a167-4db2-a6bc-1ebb7a26c489',
      section: 'Requerimientos de clima y suelo, apartado «Suelo»',
      consultedAt: '2026-10-13',
      originalValue: 'El pH óptimo para las raíces de cerezo es de 6,0 a 6,5. En suelo con pH sobre 7,5 aparecen deficiencias de microelementos',
    }],
  }),
  perennial('sp.olivo', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 5.5, max: 7.5 }, lowerLimit: 5.5, upperLimit: 8.5,
    note: 'El olivo crece bien con pH 5,5 a 8,5; dentro de ese rango son preferibles los suelos bajo 7,5.',
    noteEn: 'Olive grows well at pH 5.5 to 8.5; within that range, soils below 7.5 are preferable.',
    limitations: 'Sobre 7,5 a la planta le cuesta absorber micronutrientes. Fuera de 5,5–8,5 la fuente no documenta buen crecimiento; la variedad Picual tuvo problemas con pH sobre 8,5 en Atacama.',
    limitationsEn: 'Above 7.5 the plant struggles to absorb micronutrients. Outside 5.5–8.5 the source does not document good growth; the Picual variety had problems above pH 8.5 in Atacama.',
    evidence: [{
      institution: 'INIA Intihuasi',
      title: 'Manual del cultivo del olivo (Boletín INIA N° 101, 2003)',
      url: 'https://biblioteca.inia.cl/items/f6a76e2b-197e-4643-8243-d29bc434cf1a',
      section: 'Capítulo 1 «Requerimientos de clima y suelo», p. 18',
      consultedAt: '2026-10-13',
      originalValue: 'crece bien en suelos de reacción moderadamente ácidos a moderadamente alcalinos (pH entre 5,5 y 8,5); son preferibles aquellos suelos de pH inferior a 7,5',
    }],
  }),
];

export const SPECIES_RULES: Readonly<Record<string, SpeciesRuleProfile>> =
  Object.fromEntries(PROFILES.map(profile => [profile.speciesId, profile]));

export const findSpeciesRuleProfile = (speciesId: string | null | undefined): SpeciesRuleProfile | undefined =>
  speciesId && Object.prototype.hasOwnProperty.call(SPECIES_RULES, speciesId) ? SPECIES_RULES[speciesId] : undefined;

/** Si la especie tiene al menos un criterio habilitado para la etapa. `speciesCatalog.ts` delega aquí. */
export function hasEnabledCriteria(speciesId: string | null | undefined, stage: PhenologicalStage): boolean {
  const profile = findSpeciesRuleProfile(speciesId);
  if (!profile) return false;
  return profile.criteria.some(c => c.state === 'enabled' && c.stages.includes(stage));
}

export type PhPosition = 'below_limit' | 'below_optimum' | 'optimum' | 'above_optimum' | 'above_limit';

/**
 * Posición de una lectura respecto del criterio. Los límites son estrictos: en el valor
 * exacto del límite la fuente todavía no indica corregir. Cruzar un límite manda sobre
 * el óptimo (frutilla: 5,8 es a la vez mínimo y comienzo del rango normal).
 */
export function classifyPh(criterion: SpeciesPhCriterion, ph: number): PhPosition {
  if (criterion.lowerLimit != null && ph < criterion.lowerLimit) return 'below_limit';
  if (criterion.upperLimit != null && ph > criterion.upperLimit) return 'above_limit';
  if (ph < criterion.optimum.min) return 'below_optimum';
  if (ph > criterion.optimum.max) return 'above_optimum';
  return 'optimum';
}

function phTitle(criterion: SpeciesPhCriterion, position: PhPosition, language: AppLanguage): string {
  const en = language === 'en';
  const n = (value: number) => decimal(value, language);
  const { min, max } = criterion.optimum;
  const single = min === max;
  const optimum = single ? (en ? `target ${n(min)}` : `objetivo ${n(min)}`) : `${n(min)}–${n(max)}`;
  switch (position) {
    case 'below_limit': return en ? `pH below the documented minimum for this species (${n(criterion.lowerLimit!)})`
      : `pH bajo el mínimo documentado para esta especie (${n(criterion.lowerLimit!)})`;
    case 'above_limit': return en ? `pH above the documented maximum for this species (${n(criterion.upperLimit!)})`
      : `pH sobre el máximo documentado para esta especie (${n(criterion.upperLimit!)})`;
    case 'optimum': return single
      ? (en ? `pH at this species' documented target (${n(min)})` : `pH en el objetivo documentado para esta especie (${n(min)})`)
      : (en ? `pH within this species' documented optimum (${optimum})` : `pH dentro del óptimo documentado para esta especie (${optimum})`);
    case 'below_optimum': return en
      ? `pH below this species' documented ${single ? optimum : `optimum (${optimum})`}${criterion.lowerLimit != null ? `, above its minimum (${n(criterion.lowerLimit)})` : ''}`
      : `pH bajo el ${single ? optimum : `óptimo (${optimum})`} documentado para esta especie${criterion.lowerLimit != null ? `, sobre su mínimo (${n(criterion.lowerLimit)})` : ''}`;
    case 'above_optimum': return en
      ? `pH above this species' documented ${single ? optimum : `optimum (${optimum})`}${criterion.upperLimit != null ? `, below its maximum (${n(criterion.upperLimit)})` : '; no maximum is documented'}`
      : `pH sobre el ${single ? optimum : `óptimo (${optimum})`} documentado para esta especie${criterion.upperLimit != null ? `, bajo su máximo (${n(criterion.upperLimit)})` : '; no hay un máximo documentado'}`;
  }
}

/**
 * Alertas propias de la especie para esta captura y etapa. Se agregan a las alertas
 * generales sin reemplazarlas: una especie indicada no cambia cómo se evalúa el suelo
 * frío, salino o seco (T45); sólo añade las razones que su propio criterio documenta.
 * Sólo cruzar un límite documentado es advertencia; el resto es información.
 *
 * `usable` dice si el dato puede interpretarse (disponible y captura vigente): un pH
 * ausente, inválido o de una captura antigua no se compara con ningún criterio.
 */
export function evaluateSpeciesCriteria(
  speciesId: string | null | undefined,
  stage: PhenologicalStage,
  reading: SoilMeasurement,
  language: AppLanguage = 'es',
  usable: (key: 'ph') => boolean = () => true,
): AgronomicAlert[] {
  const profile = findSpeciesRuleProfile(speciesId);
  if (!profile) return [];
  const en = language === 'en';
  const alerts: AgronomicAlert[] = [];
  for (const criterion of profile.criteria) {
    if (criterion.state !== 'enabled' || !criterion.stages.includes(stage)) continue;
    if (criterion.kind === 'ph') {
      if (!usable('ph') || typeof reading.ph !== 'number' || !Number.isFinite(reading.ph)) continue;
      const position = classifyPh(criterion, reading.ph);
      const sources = criterion.evidence.map(e => e.institution).filter((name, i, all) => all.indexOf(name) === i).join('; ');
      const check = en
        ? 'Probe reading in the field: confirm pH with a laboratory analysis before correcting it.'
        : 'Lectura de la sonda en terreno: confirma el pH con un análisis de laboratorio antes de corregirlo.';
      alerts.push({
        type: position === 'below_limit' || position === 'above_limit' ? 'warning' : 'info',
        param: 'ph',
        title: phTitle(criterion, position, language),
        action: `${en ? criterion.noteEn : criterion.note} ${en ? criterion.limitationsEn : criterion.limitations} ${check} (${en ? 'Source' : 'Fuente'}: ${sources}.)`,
      });
    }
  }
  return alerts;
}
