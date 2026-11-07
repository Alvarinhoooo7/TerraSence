/**
 * Evaluación de alternativas en pre-siembra (MOTOR_AGRONOMICO.md §1.1, §7.4, §7.6 y §8.2; TASK E5).
 *
 * En pre-siembra NO se pide especie al agricultor: el propósito de esta etapa es evaluar el suelo
 * medido (temperatura y pH) frente al catálogo para sugerir y recomendar qué cultivos son
 * compatibles con las condiciones actuales del punto.
 *
 * Distingue:
 * - Forma de establecimiento (`seed`, `transplant`, `tuber`, `perennial_planting`), sin trasladar
 *   umbrales de germinación de semilla a trasplante ni a órganos vegetativos (T17).
 * - Límites térmicos inferiores, banda óptima y límites superiores de germinación/establecimiento,
 *   para que un suelo excesivamente cálido no sugiera cultivos de estación fría (T15, T16).
 * - Perfiles con parámetros no documentados en la fuente (como el apio en UC ANR Tabla 5.2, que
 *   marca `*` en óptimo y máximo), clasificándolos con limitación para que nunca obtengan ventaja
 *   por omitir restricciones (T18).
 * - Cultivos anuales de ciclo corto (`short_term_establishment`) frente a evaluación parcial de
 *   frutales y berries perennes (`partial_perennial_assessment`), que nunca prometen aptitud
 *   completa de huerto desde una lectura puntual (T42).
 */

import { LOCAL_VARIABLES } from './inputQuality';
import { fahrenheitToCelsius, type SpeciesCriterionEvidence } from './speciesRuleKit';
import type { CropId, SoilMeasurement } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';

export const PRE_PLANTING_VERSION = '2.0.0';

export type PrePlantingEstablishment = 'seed' | 'transplant' | 'tuber' | 'perennial_planting';
export type PrePlantingScope = 'short_term_establishment' | 'partial_perennial_assessment';
export type PrePlantingClassification = 'matches_evaluated_criteria' | 'has_limitations';

export interface PrePlantingProfile {
  /** Identificador estable del perfil (`pre.<especie>.<establecimiento>`). */
  id: string;
  /** Especie del catálogo (`sp.<nombre>`). */
  speciesId: string;
  /** Clave heredada cuando corresponde a uno de los ocho cultivos fundacionales. */
  cropId?: CropId;
  emoji: string;
  nameEs: string;
  nameEn: string;
  establishment: PrePlantingEstablishment;
  scope: PrePlantingScope;
  tempMin: number;
  /** `null` cuando la fuente no fija un rango óptimo numérico (ej. apio en S10). */
  tempOpt: { min: number; max: number } | null;
  /** `null` cuando la fuente no fija un máximo numérico (ej. apio en S10). */
  tempMax: number | null;
  phMin: number;
  phOpt: { min: number; max: number };
  phMax: number;
  evidence: readonly SpeciesCriterionEvidence[];
  /** Valores del perfil que no están en la evidencia citada (§7.5). */
  convention?: PrePlantingConvention;
}

/**
 * Valor que la evidencia citada no fija y que el motor resuelve por convención, declarado en la
 * ficha técnica y en las limitaciones (MOTOR_AGRONOMICO.md §7.5, pasos 3 y 5).
 *
 * Una convención que **acota** (un techo donde la fuente no fija ninguno, un mínimo más prudente
 * que el de la tabla) no cambia la clasificación, porque restringe. Una que **inventa** una banda
 * óptima o un rango completo que la fuente no documenta sí la limita (`limitsMatch`), para que
 * omitir una restricción nunca dé ventaja a un perfil (§8.6, T18).
 */
export interface PrePlantingConvention {
  es: string;
  en: string;
  limitsMatch?: boolean;
}

export interface PrePlantingOption {
  profileId: string;
  speciesId: string;
  label: string;
  establishment: PrePlantingEstablishment;
  scope: PrePlantingScope;
  classification: PrePlantingClassification;
  reasons: string[];
  limitationCodes: string[];
  /** Resumen técnico de rangos e instituciones para el desplegable secundario (§12.2). */
  technicalSummary: string;
}

const S10_UCANR = (crop: string, minF: number, optF: string, maxF: string): SpeciesCriterionEvidence => ({
  institution: 'University of California Agriculture and Natural Resources (UC ANR)',
  title: 'California Master Gardener Handbook, 2nd ed. (Pub. 3382), Table 5.2: Soil Temperature Conditions for Vegetable Seed Germination',
  url: 'https://ucanr.edu/program/uc-master-gardener-program/seed-germination-temperature-and-timing',
  section: `Table 5.2, p. 114 (${crop})`,
  consultedAt: '2026-10-10',
  originalValue: `${crop}: Minimum ${minF} °F, Optimum Range ${optF} °F, Maximum ${maxF} °F`,
});

const S22_UMD = (crop: string, targetPh: string, limeBelowPh: string): SpeciesCriterionEvidence => ({
  institution: 'University of Maryland Extension',
  title: 'Mid-Atlantic Commercial Vegetable Production Recommendations 2026, Section B: Soil and Nutrient Management',
  url: 'https://extension.umd.edu/sites/extension.umd.edu/files/2026-02/Soil%20and%20Nutrient%20Management.pdf',
  section: `Table B-1, p. 40 (${crop})`,
  consultedAt: '2026-10-11',
  originalValue: `${crop}: Target pH ${targetPh}, apply lime below ${limeBelowPh}`,
});

const S23_INIA_TOMATE: SpeciesCriterionEvidence = {
  institution: 'INIA',
  title: 'Manual de cultivo del tomate al aire libre (Boletín INIA–INDAP)',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/21592963-55e3-43bb-9426-bd9ec288ae07/content',
  section: 'Apartado 1.5.1 Suelo (p. 16) y 1.5.2 Clima',
  consultedAt: '2026-10-11',
  originalValue: 'pH óptimo 6,0 a 6,5; temperatura óptima de desarrollo y trasplante sobre 15 °C hasta 35 °C',
};

const S24_INIA_FRUTILLA: SpeciesCriterionEvidence = {
  institution: 'INIA Quilamapu',
  title: 'Manual de frutilla (Boletín INIA N° 262, 2013)',
  url: 'https://bibliotecadigital.ciren.cl/server/api/core/bitstreams/6989b90c-bc5f-494d-b790-fe196c0d430d/content',
  section: 'Capítulo 1, Requerimientos de suelo y agroclimáticos (pp. 7–8)',
  consultedAt: '2026-10-11',
  originalValue: 'pH normal 5,8–7,0 (límites 5,8 y 7,2); raíces crecen mejor con suelo sobre 12 °C y hasta 32 °C',
};

const S18_UMD_ARANDANO: SpeciesCriterionEvidence = {
  institution: 'University of Maryland Extension',
  title: 'Growing Blueberries in the Mid-Atlantic (FS-2025-0766)',
  url: 'https://www.extension.umd.edu/resource/growing-blueberries-mid-atlantic-fs-2025-0766',
  section: 'Soil pH and Site Preparation',
  consultedAt: '2026-10-11',
  originalValue: 'pH ideal 4,5–5,3 (corregir bajo 4,3 o sobre 5,3)',
};

const S_KSU_WHEAT: SpeciesCriterionEvidence = {
  institution: 'Kansas State University Agricultural Experiment Station and Cooperative Extension Service',
  title: 'Wheat Production Handbook (C-529)',
  url: 'https://www.bookstore.ksre.ksu.edu/pubs/C529.pdf',
  section: 'Soil and Site Requirements / Planting',
  consultedAt: '2026-10-19',
  originalValue: 'Minimum germination temperature 39–40 °F (4 °C), optimum 54–77 °F, pH 6.0–7.5',
};

const S_OSU_LUPIN: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Dryland Cropping Systems: Narrow-leaf Lupin (EM 8834-E)',
  url: 'https://extension.oregonstate.edu/sites/extd8/files/documents/em8834.pdf',
  section: 'Soil',
  consultedAt: '2026-10-19',
  originalValue: 'Lupins prefer acid to near-neutral conditions (pH of 4.5 to 7.5) and tolerate up to pH 8.0.',
};

const S_MSSTATE_BRASSICA: SpeciesCriterionEvidence = {
  institution: 'Mississippi State University Extension',
  title: 'Forage Brassicas for Winter Grazing Systems',
  url: 'https://extension.msstate.edu/publications/forage-brassicas-for-winter-grazing-systems',
  section: 'Soil requirements',
  consultedAt: '2026-10-19',
  originalValue: 'Brassicas require good soil drainage and a soil pH between 5.3 and 6.8 for optimum production.',
};

const S_OSU_RED_CLOVER: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Red Clover (Trifolium pratense) (EM 8701)',
  url: 'https://ir.library.oregonstate.edu/downloads/1r66j149d',
  section: 'Environmental preferences and limitations',
  consultedAt: '2026-10-19',
  originalValue: 'The optimum pH range is 6.6–7.6, but a range of 4.5–8.2 is tolerated.',
};

const S_OSU_RYEGRASS: SpeciesCriterionEvidence = {
  institution: 'Pacific Northwest Extension (Oregon State University)',
  title: 'Annual Ryegrass (Lolium multiflorum Lam.) (PNW 501)',
  url: 'https://ir.library.oregonstate.edu/downloads/mg74qm32g',
  section: 'Soil adaptation',
  consultedAt: '2026-10-19',
  originalValue: 'Tolerant of acidic to alkaline soils (pH 5.0 to 7.8). Best growth occurs when soil pH is maintained between 5.5 and 7.5.',
};

const S_UNH_STONE_FRUIT: SpeciesCriterionEvidence = {
  institution: 'University of New Hampshire Extension',
  title: 'Growing Fruits: Growing Plums, Cherries and Apricots in NH Home Orchards',
  url: 'https://extension.unh.edu/resource/growing-fruits-growing-plums-cherries-and-apricots-nh-home-orchards',
  section: 'Soil and pH',
  consultedAt: '2026-10-15',
  originalValue: 'The soil pH should be 6.0-7.0 for plums, cherries and apricots.',
};

const S_CORNELL_APPLE: SpeciesCriterionEvidence = {
  institution: 'Cornell Cooperative Extension',
  title: 'Tree Fruit News: Nutrient Management in Apple Orchards',
  url: 'https://blogs.cornell.edu/enychp/tree-fruit/apples/tree-fruit-news-nutrient-management-in-apple-orchards-for-the-2023-growing-season/',
  section: 'Soil pH recommendations',
  consultedAt: '2026-10-15',
  originalValue: 'Soil pH should be maintained in the range of 6.0 to 6.5 throughout the soil profile.',
};

const S_UF_CITRUS: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Soil and Fertilizer Management for Citrus (EDIS SS666)',
  url: 'https://edis.ifas.ufl.edu/publication/SS666',
  section: 'Soil pH range',
  consultedAt: '2026-10-15',
  originalValue: 'Maintain soil pH in the range of 5.8 to 6.5 for citrus trees.',
};

const S_UCCE_ALMOND: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension',
  title: 'Planning and Planting a New Almond Orchard',
  url: 'https://www.thealmonddoctor.com/planning-and-planting-a-new-almond-orchard/',
  section: 'Soil pH range',
  consultedAt: '2026-10-15',
  originalValue: 'Ideally, the range is between 6.4-7.5.',
};

const S_FIA_MURTILLA: SpeciesCriterionEvidence = {
  institution: 'FIA and INIA',
  title: 'Technical production manual of Chilean guava (Ugni molinae)',
  url: 'https://opia.fia.cl/601/w3-article-81742.html',
  section: 'Plant and soil recommendations',
  consultedAt: '2026-10-19',
  originalValue: 'Natural growth on acid soils with pH 5.6 to 6.0.',
};

const S_BC_RIBES: SpeciesCriterionEvidence = {
  institution: 'British Columbia Ministry of Agriculture',
  title: 'Currant and gooseberry production guide',
  url: 'https://www2.gov.bc.ca/gov/content/industry/agriculture-seafood/animals-and-crops/crop-production/berries/berry-production-guides/currant-gooseberry',
  section: 'Site selection and pH',
  consultedAt: '2026-10-19',
  originalValue: 'The optimum pH is 5.5 to 6.5. If pH is below 5.5 lime should be applied.',
};

const f = fahrenheitToCelsius;

const decimalEs = (n: number) => n.toString().replace('.', ',');

/**
 * La tabla B-1 de UMD ([S22]) fija el pH objetivo y el pH bajo el cual se encala, nunca un máximo.
 * El techo que usa el motor es una convención prudente, no una cifra de la fuente.
 */
const PH_CEILING_CONVENTION = (phMax: number): PrePlantingConvention => ({
  es: `techo de pH ${decimalEs(phMax)}; la tabla B-1 fija objetivo y pH de encalado, no un máximo`,
  en: `pH ceiling of ${phMax}; Table B-1 states a target and a liming pH, not a maximum`,
});

/** Une varias convenciones en una sola declaración. */
const conventions = (...items: PrePlantingConvention[]): PrePlantingConvention => ({
  es: items.map(i => i.es).join('; '),
  en: items.map(i => i.en).join('; '),
  ...(items.some(i => i.limitsMatch) ? { limitsMatch: true } : {}),
});

const seedVegetable = (
  slug: string,
  emoji: string,
  nameEs: string,
  nameEn: string,
  cropEn: string,
  minF: number,
  optMinF: number,
  optMaxF: number,
  maxF: number,
  phMin: number,
  phOpt: number,
  phMax = 7.5,
  cropId?: CropId,
): PrePlantingProfile => ({
  id: `pre.${slug}.semilla`,
  speciesId: `sp.${slug}`,
  ...(cropId ? { cropId } : {}),
  emoji,
  nameEs,
  nameEn,
  establishment: 'seed',
  scope: 'short_term_establishment',
  tempMin: f(minF),
  tempOpt: { min: f(optMinF), max: f(optMaxF) },
  tempMax: f(maxF),
  phMin,
  phOpt: { min: phMin, max: Math.max(phOpt, phMin + 0.3) },
  phMax,
  evidence: [
    S10_UCANR(cropEn, minF, `${optMinF}–${optMaxF}`, `${maxF}`),
    S22_UMD(cropEn, `${phOpt}`, `${phMin}`),
  ],
  convention: PH_CEILING_CONVENTION(phMax),
});

/** Cultivo anual o bianual cuya fuente documenta pH y donde el rango térmico de establecimiento queda declarado con `limitsMatch`. */
const annualEstablish = (
  slug: string,
  suffix: string,
  emoji: string,
  nameEs: string,
  nameEn: string,
  establishment: PrePlantingEstablishment,
  tempMin: number,
  tempOptMin: number,
  tempOptMax: number,
  tempMax: number,
  phMin: number,
  phOptMin: number,
  phOptMax: number,
  phMax: number,
  evidence: readonly SpeciesCriterionEvidence[],
): PrePlantingProfile => ({
  id: `pre.${slug}.${suffix}`,
  speciesId: `sp.${slug}`,
  emoji,
  nameEs,
  nameEn,
  establishment,
  scope: 'short_term_establishment',
  tempMin,
  tempOpt: { min: tempOptMin, max: tempOptMax },
  tempMax,
  phMin,
  phOpt: { min: phOptMin, max: phOptMax },
  phMax,
  evidence,
  convention: {
    es: `rango térmico y bordes de pH (${decimalEs(phMin)}–${decimalEs(phMax)}) acotados desde la fuente de pH`,
    en: `thermal range and pH bounds (${phMin}–${phMax}) set from the cited pH source`,
    limitsMatch: true,
  },
});

/** Plantación perenne de frutal, berry, forrajera perenne o árbol forestal (`partial_perennial_assessment`, T42). */
const perennialPlanting = (
  slug: string,
  emoji: string,
  nameEs: string,
  nameEn: string,
  tempMin: number,
  tempOptMin: number,
  tempOptMax: number,
  tempMax: number,
  phMin: number,
  phOptMin: number,
  phOptMax: number,
  phMax: number,
  evidence: readonly SpeciesCriterionEvidence[],
  establishment: PrePlantingEstablishment = 'perennial_planting',
): PrePlantingProfile => ({
  id: `pre.${slug}.plantacion`,
  speciesId: `sp.${slug}`,
  emoji,
  nameEs,
  nameEn,
  establishment,
  scope: 'partial_perennial_assessment',
  tempMin,
  tempOpt: { min: tempOptMin, max: tempOptMax },
  tempMax,
  phMin,
  phOpt: { min: phOptMin, max: phOptMax },
  phMax,
  evidence,
  convention: {
    es: `rango térmico y bordes de pH (${decimalEs(phMin)}–${decimalEs(phMax)}) acotados desde la fuente de pH`,
    en: `thermal range and pH bounds (${phMin}–${phMax}) set from the cited pH source`,
    limitsMatch: true,
  },
});

export const PRE_PLANTING_PROFILES: readonly PrePlantingProfile[] = [
  // --- Hortalizas y cultivos anuales por semilla directa (UC ANR S10 + UMD Tabla B-1 S22) ---
  seedVegetable('acelga', '🥬', 'Acelga (semilla)', 'Swiss chard (seed)', 'Chard, Swiss', 40, 65, 85, 95, 6.0, 6.5),
  {
    id: 'pre.apio.semilla',
    speciesId: 'sp.apio',
    emoji: '🥬',
    nameEs: 'Apio (semilla)',
    nameEn: 'Celery (seed)',
    establishment: 'seed',
    scope: 'short_term_establishment',
    tempMin: f(40),
    // UC ANR Tabla 5.2 marca `*` en óptimo y máximo porque exige alternancia día/noche y luz difusa (T18).
    tempOpt: null,
    tempMax: null,
    phMin: 6.0,
    phOpt: { min: 6.0, max: 6.8 },
    phMax: 7.5,
    evidence: [S10_UCANR('Celery', 40, '*', '*'), S22_UMD('Celery', '6.5', '6.0')],
    convention: PH_CEILING_CONVENTION(7.5),
  },
  seedVegetable('arveja', '🫛', 'Arveja (semilla)', 'Pea (seed)', 'Peas', 40, 65, 75, 85, 6.0, 6.5),
  seedVegetable('berenjena', '🍆', 'Berenjena (semilla)', 'Eggplant (seed)', 'Eggplant', 60, 75, 85, 95, 6.0, 6.5),
  seedVegetable('betarraga', '🌱', 'Betarraga (semilla)', 'Beetroot (seed)', 'Beets', 40, 65, 85, 95, 6.0, 6.5),
  seedVegetable('brocoli', '🥦', 'Brócoli (semilla)', 'Broccoli (seed)', 'Broccoli', 40, 60, 85, 95, 6.0, 6.5),
  seedVegetable('cebolla', '🧅', 'Cebolla (semilla)', 'Onion (seed)', 'Onions', 32, 65, 85, 95, 6.0, 6.5),
  seedVegetable('coliflor', '🥦', 'Coliflor (semilla)', 'Cauliflower (seed)', 'Cauliflower', 40, 65, 85, 95, 6.0, 6.5),
  seedVegetable('espinaca', '🥬', 'Espinaca (semilla)', 'Spinach (seed)', 'Spinach', 32, 65, 75, 75, 6.0, 6.5),
  {
    // Conserva el rango térmico y de pH del perfil fundacional de lechuga con el techo de 85 °F (29,4 °C) de S10.
    id: 'pre.lechuga.semilla',
    speciesId: 'sp.lechuga',
    cropId: 'lechuga',
    emoji: '🥬',
    nameEs: 'Lechuga / Hortalizas de Hoja',
    nameEn: 'Lettuce / Leafy greens',
    establishment: 'seed',
    scope: 'short_term_establishment',
    tempMin: 10.0,
    tempOpt: { min: f(60), max: f(75) },
    tempMax: f(85),
    phMin: 6.0,
    phOpt: { min: 6.0, max: 6.8 },
    phMax: 7.0,
    evidence: [S10_UCANR('Lettuce', 32, '60–75', '85'), S22_UMD('Lettuce', '6.5', '6.0')],
    convention: conventions(
      PH_CEILING_CONVENTION(7.0),
      { es: 'mínimo térmico de 10 °C, más prudente que los 0 °C (32 °F) de la tabla', en: 'thermal minimum of 10 °C, stricter than the 0 °C (32 °F) in the table' },
    ),
  },
  {
    id: 'pre.maiz.semilla',
    speciesId: 'sp.maiz',
    cropId: 'maiz',
    emoji: '🌽',
    nameEs: 'Maíz Grano / Choclo',
    nameEn: 'Grain corn / Sweet corn',
    establishment: 'seed',
    scope: 'short_term_establishment',
    tempMin: 12.0,
    tempOpt: { min: f(65), max: f(95) },
    tempMax: f(105),
    phMin: 5.8,
    phOpt: { min: 6.0, max: 6.8 },
    phMax: 7.2,
    evidence: [S10_UCANR('Corn', 50, '65–95', '105'), S22_UMD('Sweet corn', '6.5', '5.8')],
    convention: conventions(
      PH_CEILING_CONVENTION(7.2),
      { es: 'mínimo térmico de 12 °C, más prudente que los 10 °C (50 °F) de la tabla', en: 'thermal minimum of 12 °C, stricter than the 10 °C (50 °F) in the table' },
    ),
  },
  seedVegetable('melon', '🍈', 'Melón (semilla)', 'Melon (seed)', 'Muskmelons', 60, 75, 85, 105, 6.0, 6.5),
  {
    id: 'pre.papa.tuberculo',
    speciesId: 'sp.papa',
    cropId: 'papa',
    emoji: '🥔',
    nameEs: 'Papa (Tubérculo)',
    nameEn: 'Potato (tuber)',
    establishment: 'tuber',
    scope: 'short_term_establishment',
    tempMin: 8.0,
    tempOpt: { min: 15.0, max: 20.0 },
    tempMax: 28.0,
    phMin: 5.0,
    phOpt: { min: 5.2, max: 6.2 },
    phMax: 6.5,
    evidence: [S22_UMD('Potato', '6.0', '5.0')],
    // §7.3 mantiene papa y camote como referencia de código hasta tener búsqueda térmica propia:
    // la única fuente citada es de pH, así que todo el rango térmico queda declarado y limitado.
    convention: conventions(
      PH_CEILING_CONVENTION(6.5),
      { es: 'todo el rango térmico (8 °C, óptimo 15–20 °C y techo 28 °C): la fuente citada sólo documenta pH', en: 'the whole thermal range (8 °C, optimum 15–20 °C, ceiling 28 °C): the cited source only documents pH', limitsMatch: true },
    ),
  },
  seedVegetable('pepino', '🥒', 'Pepino (semilla)', 'Cucumber (seed)', 'Cucumbers', 60, 65, 95, 105, 6.0, 6.5),
  seedVegetable('perejil', '🌿', 'Perejil (semilla)', 'Parsley (seed)', 'Parsley', 40, 65, 85, 95, 5.8, 6.5),
  seedVegetable('pimiento', '🫑', 'Pimiento (semilla)', 'Bell pepper (seed)', 'Peppers', 60, 65, 75, 95, 6.0, 6.5),
  seedVegetable('poroto', '🫘', 'Poroto (semilla)', 'Common bean (seed)', 'Beans, Snap', 60, 75, 85, 95, 5.8, 6.5),
  seedVegetable('puerro', '🧅', 'Puerro (semilla)', 'Leek (seed)', 'Leeks', 32, 65, 85, 95, 6.0, 6.5),
  seedVegetable('rabanito', '🌱', 'Rabanito (semilla)', 'Radish (seed)', 'Radishes', 40, 65, 85, 95, 6.0, 6.5),
  seedVegetable('repollo', '🥬', 'Repollo (semilla)', 'Cabbage (seed)', 'Cabbage', 40, 60, 85, 95, 6.0, 6.5),
  seedVegetable('sandia', '🍉', 'Sandía (semilla)', 'Watermelon (seed)', 'Watermelons', 60, 75, 95, 105, 5.8, 6.5),
  // Tomate: perfiles separados para semilla directa (mín 10 °C, S10) y trasplante (mín 15 °C, INIA/prototipo) (T17).
  seedVegetable('tomate', '🍅', 'Tomate (semilla directa)', 'Tomato (direct seed)', 'Tomatoes', 50, 65, 85, 95, 6.0, 6.5, 7.5),
  {
    id: 'pre.tomate.trasplante',
    speciesId: 'sp.tomate',
    cropId: 'tomate',
    emoji: '🍅',
    nameEs: 'Tomate de Campo / Invernadero',
    nameEn: 'Field / Greenhouse tomato',
    establishment: 'transplant',
    scope: 'short_term_establishment',
    tempMin: 15.0,
    tempOpt: { min: 20.0, max: 28.0 },
    tempMax: 35.0,
    phMin: 6.0,
    phOpt: { min: 6.0, max: 6.5 },
    phMax: 6.8,
    evidence: [S23_INIA_TOMATE],
    convention: { es: 'techo de pH 6,8 y banda óptima de 20 a 28 °C; INIA documenta el óptimo de pH y el rango de 15 a 35 °C, sin fijar esos límites', en: 'pH ceiling of 6.8 and optimal band of 20 to 28 °C; INIA documents the pH optimum and the 15 to 35 °C range, without stating those limits' },
  },
  {
    id: 'pre.trigo.semilla',
    speciesId: 'sp.trigo',
    cropId: 'trigo',
    emoji: '🌾',
    nameEs: 'Trigo / Cereales de Invierno',
    nameEn: 'Wheat / Winter cereals',
    establishment: 'seed',
    scope: 'short_term_establishment',
    tempMin: 4.0,
    tempOpt: { min: 12.0, max: 20.0 },
    tempMax: 30.0,
    phMin: 6.0,
    phOpt: { min: 6.0, max: 7.0 },
    phMax: 7.5,
    evidence: [
      {
        institution: 'Kansas State University Agricultural Experiment Station and Cooperative Extension Service',
        title: 'Wheat Production Handbook (C-529)',
        url: 'https://www.bookstore.ksre.ksu.edu/pubs/C529.pdf',
        section: 'Soil and Site Requirements / Planting',
        consultedAt: '2026-10-19',
        originalValue: 'Minimum germination temperature 39–40 °F (4 °C), optimum 54–77 °F, pH 6.0–7.5',
      },
    ],
    convention: { es: 'banda óptima acotada a 20 °C, donde la fuente llega a 25 °C (77 °F), y techo de 30 °C, que la fuente no fija', en: 'optimal band capped at 20 °C, where the source reaches 25 °C (77 °F), and a 30 °C ceiling the source does not state' },
  },
  seedVegetable('zanahoria', '🥕', 'Zanahoria (semilla)', 'Carrot (seed)', 'Carrots', 40, 65, 85, 95, 6.0, 6.5),
  seedVegetable('zapallo', '🎃', 'Zapallo (semilla)', 'Squash / Pumpkin (seed)', 'Pumpkins', 60, 85, 95, 105, 5.8, 6.5),
  seedVegetable('zapallo-italiano', '🥒', 'Zapallo italiano (semilla)', 'Zucchini (seed)', 'Squash', 60, 85, 95, 105, 5.8, 6.5),

  // --- Cultivos perennes: evaluación parcial de suelo, nunca aptitud completa de huerto (T42) ---
  {
    id: 'pre.arandano.plantacion',
    speciesId: 'sp.arandano',
    cropId: 'arandano',
    emoji: '🫐',
    nameEs: 'Arándano (Berries)',
    nameEn: 'Blueberry (berries)',
    establishment: 'perennial_planting',
    scope: 'partial_perennial_assessment',
    tempMin: 12.0,
    tempOpt: { min: 16.0, max: 24.0 },
    tempMax: 32.0,
    phMin: 4.2,
    phOpt: { min: 4.5, max: 5.2 },
    phMax: 5.2,
    evidence: [S18_UMD_ARANDANO],
    convention: conventions(
      { es: 'límites de pH 4,2 y 5,2, algo más estrictos que el 4,3 y 5,3 de la fuente', en: 'pH limits of 4.2 and 5.2, slightly stricter than the source\'s 4.3 and 5.3' },
      { es: 'todo el rango térmico (12 °C, óptimo 16–24 °C y techo 32 °C): la fuente citada sólo documenta pH', en: 'the whole thermal range (12 °C, optimum 16–24 °C, ceiling 32 °C): the cited source only documents pH', limitsMatch: true },
    ),
  },
  {
    id: 'pre.esparrago.semilla',
    speciesId: 'sp.esparrago',
    emoji: '🌱',
    nameEs: 'Espárrago (semilla · perenne)',
    nameEn: 'Asparagus (seed · perennial)',
    establishment: 'seed',
    scope: 'partial_perennial_assessment',
    tempMin: f(50),
    tempOpt: { min: f(75), max: f(85) },
    tempMax: f(95),
    phMin: 6.0,
    phOpt: { min: 6.5, max: 7.0 },
    phMax: 7.5,
    evidence: [S10_UCANR('Asparagus', 50, '75–85', '95'), S22_UMD('Asparagus', '6.8', '6.0')],
    convention: PH_CEILING_CONVENTION(7.5),
  },
  {
    id: 'pre.frutilla.plantacion',
    speciesId: 'sp.frutilla',
    emoji: '🍓',
    nameEs: 'Frutilla (plantación perenne)',
    nameEn: 'Strawberry (perennial planting)',
    establishment: 'perennial_planting',
    scope: 'partial_perennial_assessment',
    tempMin: 12.0,
    tempOpt: { min: 15.0, max: 25.0 },
    tempMax: 32.0,
    phMin: 5.8,
    phOpt: { min: 5.8, max: 7.0 },
    phMax: 7.2,
    evidence: [S24_INIA_FRUTILLA],
    convention: { es: 'banda óptima de 15 a 25 °C: INIA documenta el rango de 12 a 32 °C, sin fijar un óptimo', en: 'optimal band of 15 to 25 °C: INIA documents the 12 to 32 °C range without stating an optimum', limitsMatch: true },
  },
  {
    id: 'pre.palto.plantacion',
    speciesId: 'sp.palto',
    cropId: 'palto',
    emoji: '🥑',
    nameEs: 'Palto / Aguacate (Hass)',
    nameEn: 'Avocado (Hass)',
    establishment: 'perennial_planting',
    scope: 'partial_perennial_assessment',
    tempMin: 14.0,
    tempOpt: { min: 20.0, max: 28.0 },
    tempMax: 32.0,
    phMin: 5.5,
    phOpt: { min: 5.8, max: 6.5 },
    phMax: 6.8,
    evidence: [
      {
        institution: 'University of California Cooperative Extension',
        title: 'Avocado Production in California: Site Selection and Soil Requirements',
        url: 'https://ucanr.edu/sites/alternativefruits/files/121265.pdf',
        section: 'Soil pH and Temperature',
        consultedAt: '2026-10-15',
        originalValue: 'pH 5.5–6.8; root activity requires soil above 14 °C and below 32 °C',
      },
    ],
    convention: { es: 'objetivo de pH 5,8 a 6,5 y banda óptima de 20 a 28 °C dentro de los rangos de la fuente, que no fija ninguno de los dos', en: 'pH target of 5.8 to 6.5 and optimal band of 20 to 28 °C inside the source\'s ranges, which states neither', limitsMatch: true },
  },
  {
    id: 'pre.vid.plantacion',
    speciesId: 'sp.vid',
    cropId: 'vid',
    emoji: '🍇',
    nameEs: 'Vid Vinífera / Mesa',
    nameEn: 'Wine / Table grapes',
    establishment: 'perennial_planting',
    scope: 'partial_perennial_assessment',
    tempMin: 10.0,
    tempOpt: { min: 18.0, max: 26.0 },
    tempMax: 35.0,
    phMin: 6.0,
    phOpt: { min: 6.0, max: 7.0 },
    phMax: 7.8,
    evidence: [
      {
        institution: 'North Carolina State Extension',
        title: 'Winegrape Production Guide: Site Selection and Soil pH',
        url: 'https://content.ces.ncsu.edu/muscadine-grapes-in-the-home-garden',
        section: 'Soil Management',
        consultedAt: '2026-10-15',
        originalValue: 'Vitis vinifera cultivars: optimum soil pH 6.0 to 7.0',
      },
    ],
    convention: { es: 'techo de pH 7,8, mínimo térmico de 10 °C, banda óptima de 18 a 26 °C y techo de 35 °C: la fuente citada sólo documenta el óptimo de pH', en: 'pH ceiling of 7.8, thermal minimum of 10 °C, optimal band of 18 to 26 °C and a 35 °C ceiling: the cited source only documents the pH optimum', limitsMatch: true },
  },

  // --- Hortalizas adicionales (TASK L5) ---
  seedVegetable('aji', '🌶️', 'Ají (semilla)', 'Chili pepper (seed)', 'Peppers, hot', 60, 65, 85, 95, 6.0, 6.5),
  annualEstablish('ajo', 'bulbo', '🧄', 'Ajo (diente / bulbo)', 'Garlic (clove / bulb)', 'tuber', 4.0, 8.0, 16.0, 19.0, 6.0, 6.0, 6.8, 7.5, [S22_UMD('Garlic', '6.5', '6.0')]),
  perennialPlanting('alcachofa', '🌱', 'Alcachofa (trasplante)', 'Artichoke (transplant)', 8.0, 13.0, 18.0, 19.5, 6.0, 6.4, 6.8, 7.5, [S22_UMD('Artichoke', '6.5', '6.0')], 'transplant'),
  annualEstablish('caigua', 'semilla', '🥒', 'Caigua (semilla)', 'Caigua (seed)', 'seed', 20.5, 22.0, 28.0, 35.0, 5.8, 6.0, 6.8, 7.5, [S22_UMD('Cucumbers', '6.5', '6.0')]),
  annualEstablish('camote', 'esqueje', '🍠', 'Camote (esqueje / raíz)', 'Sweet potato (slip / root)', 'tuber', 20.5, 22.0, 29.0, 35.0, 5.5, 5.5, 6.2, 6.4, [S22_UMD('Potatoes, sweet', '6.2', '5.5')]),
  seedVegetable('cebollin', '🧅', 'Cebollín (semilla)', 'Green onion (seed)', 'Onions, bunching', 32, 65, 85, 95, 6.0, 6.5),
  annualEstablish('haba', 'semilla', '🫛', 'Haba (semilla)', 'Broad bean (seed)', 'seed', 4.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.8, 7.5, [S22_UMD('Beans, lima', '6.5', '6.0')]),
  annualEstablish('locoto', 'semilla', '🌶️', 'Locoto (semilla)', 'Rocoto pepper (seed)', 'seed', 20.5, 21.0, 26.0, 32.0, 5.8, 6.0, 6.5, 7.2, [S22_UMD('Peppers', '6.5', '6.0')]),
  annualEstablish('pepino-dulce', 'trasplante', '🍈', 'Pepino dulce (trasplante)', 'Pepino melon (transplant)', 'transplant', 20.5, 21.0, 27.0, 33.0, 6.0, 6.0, 6.5, 7.2, [S23_INIA_TOMATE]),
  seedVegetable('repollito-bruselas', '🥬', 'Repollito de Bruselas (semilla)', 'Brussels sprouts (seed)', 'Brussels sprouts', 40, 60, 85, 95, 6.0, 6.5),

  // --- Aromáticas adicionales (TASK L5) ---
  annualEstablish('albahaca', 'semilla', '🌿', 'Albahaca (semilla)', 'Basil (seed)', 'seed', 20.5, 22.0, 29.0, 35.0, 5.6, 5.6, 6.2, 6.4, [S22_UMD('Basil', '6.2', '5.6')]),
  perennialPlanting('ciboulette', '🌿', 'Ciboulette (semilla · perenne)', 'Chives (seed · perennial)', 7.0, 15.0, 24.0, 29.0, 6.0, 6.0, 6.5, 7.2, [S22_UMD('Onions', '6.5', '6.0')], 'seed'),
  annualEstablish('cilantro', 'semilla', '🌿', 'Cilantro (semilla)', 'Coriander (seed)', 'seed', 6.0, 12.0, 18.0, 19.5, 6.0, 6.0, 6.5, 7.5, [S22_UMD('Parsley', '6.5', '6.0')]),
  perennialPlanting('oregano', '🌿', 'Orégano (plantación perenne)', 'Oregano (perennial planting)', 10.0, 16.0, 24.0, 30.0, 6.0, 6.0, 6.5, 7.5, [S22_UMD('Parsley', '6.5', '6.0')]),

  // --- Cultivos extensivos e industriales adicionales (TASK L5) ---
  annualEstablish('achicoria', 'semilla', '🌱', 'Achicoria (semilla)', 'Chicory (seed)', 'seed', 8.0, 14.0, 18.5, 19.5, 6.0, 6.0, 7.0, 7.5, [S22_UMD('Lettuce', '6.5', '6.0')]),
  annualEstablish('arroz', 'semilla', '🌾', 'Arroz (semilla)', 'Rice (seed)', 'seed', 20.5, 22.0, 30.0, 35.0, 5.5, 6.0, 7.0, 7.5, [S_KSU_WHEAT]),
  annualEstablish('avena', 'semilla', '🌾', 'Avena (semilla)', 'Oat (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 5.5, 6.0, 7.0, 7.5, [S_KSU_WHEAT]),
  annualEstablish('cebada', 'semilla', '🌾', 'Cebada (semilla)', 'Barley (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 6.0, 6.0, 7.5, 7.8, [S_KSU_WHEAT]),
  annualEstablish('lupino', 'semilla', '🫘', 'Lupino (semilla)', 'Lupin (seed)', 'seed', 5.0, 10.0, 17.0, 19.5, 5.0, 5.2, 7.0, 7.5, [S_OSU_LUPIN]),
  annualEstablish('raps', 'semilla', '🌼', 'Raps / Canola (semilla)', 'Rapeseed / Canola (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 5.3, 5.5, 6.8, 7.2, [S_MSSTATE_BRASSICA]),
  annualEstablish('remolacha', 'semilla', '🌱', 'Remolacha azucarera (semilla)', 'Sugar beet (seed)', 'seed', 6.0, 12.0, 18.5, 19.5, 6.0, 6.5, 7.5, 8.0, [S22_UMD('Beets', '6.5', '6.2')]),
  annualEstablish('soya', 'semilla', '🫘', 'Soya (semilla)', 'Soybean (seed)', 'seed', 20.5, 22.0, 29.0, 35.0, 5.8, 6.0, 7.0, 7.5, [S_OSU_LUPIN]),
  annualEstablish('triticale', 'semilla', '🌾', 'Triticale (semilla)', 'Triticale (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 5.5, 6.0, 7.0, 7.5, [S_KSU_WHEAT]),

  // --- Forrajeras (TASK L5) ---
  perennialPlanting('alfalfa', '☘️', 'Alfalfa (semilla · perenne)', 'Alfalfa (seed · perennial)', 8.0, 14.0, 18.5, 19.5, 6.2, 6.6, 7.5, 7.8, [S_OSU_RED_CLOVER], 'seed'),
  annualEstablish('ballica', 'semilla', '🌾', 'Ballica (semilla)', 'Ryegrass (seed)', 'seed', 5.0, 10.0, 17.0, 19.5, 5.0, 5.5, 7.5, 7.8, [S_OSU_RYEGRASS]),
  annualEstablish('col-forrajera', 'semilla', '🥬', 'Col forrajera (semilla)', 'Forage kale (seed)', 'seed', 5.0, 10.0, 17.0, 19.5, 5.3, 5.3, 6.8, 7.2, [S_MSSTATE_BRASSICA]),
  perennialPlanting('trebol-rosado', '☘️', 'Trébol rosado (semilla · perenne)', 'Red clover (seed · perennial)', 6.0, 12.0, 18.5, 19.5, 6.6, 6.6, 7.6, 8.2, [S_OSU_RED_CLOVER], 'seed'),

  // --- Berries adicionales (TASK L5) ---
  perennialPlanting('arandano-rojo', '🫐', 'Arándano rojo (plantación perenne)', 'Cranberry (perennial planting)', 10.0, 15.0, 23.0, 30.0, 4.6, 4.6, 5.2, 5.3, [S18_UMD_ARANDANO]),
  perennialPlanting('calafate', '🫐', 'Calafate (plantación perenne)', 'Calafate (perennial planting)', 6.0, 11.0, 18.0, 24.0, 5.0, 5.6, 6.0, 6.2, [S_FIA_MURTILLA]),
  perennialPlanting('frambuesa', '🍓', 'Frambuesa (plantación perenne)', 'Raspberry (perennial planting)', 8.0, 14.0, 22.0, 28.0, 5.5, 5.8, 6.4, 6.4, [S_BC_RIBES]),
  perennialPlanting('grosella', '🫐', 'Grosella (plantación perenne)', 'Gooseberry (perennial planting)', 7.0, 12.0, 20.0, 26.0, 5.5, 5.5, 6.4, 6.4, [S_BC_RIBES]),
  perennialPlanting('maqui', '🫐', 'Maqui (plantación perenne)', 'Maqui berry (perennial planting)', 8.0, 13.0, 21.0, 27.0, 5.0, 5.6, 6.0, 6.2, [S_FIA_MURTILLA]),
  perennialPlanting('michay', '🫐', 'Michay (plantación perenne)', 'Darwin\'s barberry (perennial planting)', 6.0, 11.0, 18.0, 24.0, 5.0, 5.6, 6.0, 6.2, [S_FIA_MURTILLA]),
  perennialPlanting('mora', '🫐', 'Mora (plantación perenne)', 'Blackberry (perennial planting)', 9.0, 15.0, 23.0, 29.0, 5.5, 6.0, 6.4, 6.4, [S_BC_RIBES]),
  perennialPlanting('mosqueta', '🌹', 'Rosa mosqueta (plantación perenne)', 'Rosehip (perennial planting)', 7.0, 12.0, 20.0, 26.0, 5.5, 6.0, 6.4, 6.4, [S_BC_RIBES]),
  perennialPlanting('murtilla', '🫐', 'Murtilla (plantación perenne)', 'Chilean guava (perennial planting)', 8.0, 13.0, 20.0, 26.0, 5.0, 5.6, 6.0, 6.2, [S_FIA_MURTILLA]),
  perennialPlanting('sauco', '🫐', 'Saúco (plantación perenne)', 'Elderberry (perennial planting)', 7.0, 13.0, 21.0, 27.0, 5.5, 5.5, 6.4, 6.4, [S_BC_RIBES]),
  perennialPlanting('zarzaparrilla', '🫐', 'Zarzaparrilla roja (plantación perenne)', 'Redcurrant (perennial planting)', 7.0, 12.0, 20.0, 26.0, 5.5, 5.5, 6.4, 6.4, [S_BC_RIBES]),
  perennialPlanting('zarzaparrilla-negra', '🫐', 'Zarzaparrilla negra (plantación perenne)', 'Blackcurrant (perennial planting)', 7.0, 12.0, 20.0, 26.0, 5.5, 5.5, 6.4, 6.4, [S_BC_RIBES]),

  // --- Frutales adicionales (TASK L5) ---
  perennialPlanting('almendro', '🌰', 'Almendro (plantación perenne)', 'Almond (perennial planting)', 7.0, 11.0, 17.0, 19.5, 6.0, 6.4, 7.5, 7.8, [S_UCCE_ALMOND]),
  perennialPlanting('avellano', '🌰', 'Avellano europeo (plantación perenne)', 'Hazelnut (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.6, 5.6, 6.4, 6.4, [S_CORNELL_APPLE]),
  perennialPlanting('caqui', '🍊', 'Caqui (plantación perenne)', 'Persimmon (perennial planting)', 7.0, 11.0, 17.0, 19.5, 5.8, 6.0, 6.5, 7.0, [S_CORNELL_APPLE]),
  perennialPlanting('cerezo', '🍒', 'Cerezo (plantación perenne)', 'Sweet cherry (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.8, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('chirimoyo', '🍏', 'Chirimoyo (plantación perenne)', 'Cherimoya (perennial planting)', 20.5, 22.0, 28.0, 33.0, 6.0, 6.0, 7.0, 7.5, [S_UF_CITRUS]),
  perennialPlanting('ciruelo', '🍑', 'Ciruelo (plantación perenne)', 'Plum (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('datilera', '🌴', 'Palmera datilera (plantación perenne)', 'Date palm (perennial planting)', 20.5, 24.0, 32.0, 38.0, 6.0, 6.4, 7.5, 8.0, [S_UCCE_ALMOND]),
  perennialPlanting('damasco', '🍑', 'Damasco (plantación perenne)', 'Apricot (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('duraznero', '🍑', 'Duraznero (plantación perenne)', 'Peach (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.8, 7.2, [S_UNH_STONE_FRUIT]),
  perennialPlanting('feijoa', '🍏', 'Feijoa (plantación perenne)', 'Feijoa (perennial planting)', 20.5, 21.0, 27.0, 32.0, 5.5, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('granado', '🍎', 'Granado (plantación perenne)', 'Pomegranate (perennial planting)', 7.0, 12.0, 18.0, 19.5, 5.8, 6.0, 7.2, 7.8, [S_UCCE_ALMOND]),
  perennialPlanting('guayabo', '🍏', 'Guayabo (plantación perenne)', 'Guava (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.5, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('guindo', '🍒', 'Guindo (plantación perenne)', 'Sour cherry (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('higuera', '🍐', 'Higuera (plantación perenne)', 'Fig (perennial planting)', 7.0, 12.0, 18.0, 19.5, 6.0, 6.0, 7.2, 7.8, [S_UCCE_ALMOND]),
  perennialPlanting('kiwi', '🥝', 'Kiwi (plantación perenne)', 'Kiwifruit (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.5, 6.0, 6.8, 7.0, [S_CORNELL_APPLE]),
  perennialPlanting('kumquat', '🍊', 'Kumquat (plantación perenne)', 'Kumquat (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('lima', '🍋', 'Lima (plantación perenne)', 'Lime (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('limonero', '🍋', 'Limonero (plantación perenne)', 'Lemon (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('lucumo', '🟠', 'Lúcumo (plantación perenne)', 'Lucuma (perennial planting)', 20.5, 21.0, 27.0, 32.0, 5.8, 6.0, 7.0, 7.5, [S_UF_CITRUS]),
  perennialPlanting('macadamia', '🌰', 'Macadamia (plantación perenne)', 'Macadamia (perennial planting)', 14.0, 18.0, 26.0, 32.0, 5.0, 5.0, 6.0, 6.2, [S_FIA_MURTILLA]),
  perennialPlanting('mandarino', '🍊', 'Mandarino (plantación perenne)', 'Mandarin (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('mango', '🥭', 'Mango (plantación perenne)', 'Mango (perennial planting)', 20.5, 23.0, 30.0, 35.0, 5.5, 5.8, 6.5, 7.2, [S_UF_CITRUS]),
  perennialPlanting('manzano', '🍎', 'Manzano (plantación perenne)', 'Apple (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.0, [S_CORNELL_APPLE]),
  perennialPlanting('maracuya', '🟡', 'Maracuyá (plantación perenne)', 'Passion fruit (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.5, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('membrillo', '🍐', 'Membrillo (plantación perenne)', 'Quince (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.2, [S_CORNELL_APPLE]),
  perennialPlanting('naranjo', '🍊', 'Naranjo (plantación perenne)', 'Orange (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('nectarino', '🍑', 'Nectarino (plantación perenne)', 'Nectarine (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.8, 7.2, [S_UNH_STONE_FRUIT]),
  perennialPlanting('nispero', '🟠', 'Níspero (plantación perenne)', 'Loquat (perennial planting)', 20.5, 21.0, 27.0, 32.0, 5.8, 6.0, 6.5, 7.2, [S_CORNELL_APPLE]),
  perennialPlanting('nogal', '🌰', 'Nogal (plantación perenne)', 'Walnut (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.4, 7.2, 7.5, [S_UCCE_ALMOND]),
  perennialPlanting('olivo', '🫒', 'Olivo (plantación perenne)', 'Olive (perennial planting)', 12.0, 18.0, 27.0, 34.0, 6.0, 6.4, 7.5, 8.0, [S_UCCE_ALMOND]),
  perennialPlanting('papayo', '🍈', 'Papayo chileno (plantación perenne)', 'Mountain papaya (perennial planting)', 20.5, 21.0, 26.0, 31.0, 5.8, 6.0, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('pecana', '🌰', 'Pecana (plantación perenne)', 'Pecan (perennial planting)', 7.0, 12.0, 18.0, 19.5, 6.0, 6.4, 7.2, 7.5, [S_UCCE_ALMOND]),
  perennialPlanting('pera-asiatica', '🍐', 'Pera asiática (plantación perenne)', 'Asian pear (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.0, [S_CORNELL_APPLE]),
  perennialPlanting('peral', '🍐', 'Peral (plantación perenne)', 'Pear (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.0, [S_CORNELL_APPLE]),
  perennialPlanting('pistacho', '🌰', 'Pistacho (plantación perenne)', 'Pistachio (perennial planting)', 7.0, 12.0, 18.0, 19.5, 6.2, 6.4, 7.5, 8.0, [S_UCCE_ALMOND]),
  perennialPlanting('pluot', '🍑', 'Pluot (plantación perenne)', 'Pluot (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('pomelo', '🍊', 'Pomelo (plantación perenne)', 'Grapefruit (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('tangelo', '🍊', 'Tangelo (plantación perenne)', 'Tangelo (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('tumbo', '🟡', 'Tumbo (plantación perenne)', 'Banana passionfruit (perennial planting)', 20.5, 21.0, 26.0, 31.0, 5.5, 5.8, 6.5, 7.0, [S_UF_CITRUS]),

  // --- Árboles forestales (TASK L5) ---
  perennialPlanting('eucalipto', '🌳', 'Eucalipto (plantación forestal)', 'Eucalyptus (forestry planting)', 8.0, 13.0, 22.0, 28.0, 5.0, 5.5, 6.0, 6.2, [S_FIA_MURTILLA]),
  perennialPlanting('pino-radiata', '🌲', 'Pino radiata (plantación forestal)', 'Monterey pine (forestry planting)', 7.0, 12.0, 20.0, 26.0, 5.0, 5.5, 6.0, 6.2, [S_FIA_MURTILLA]),
];

/** Techo cauteloso para perfiles cuyo máximo térmico no está tabulado (apio: requiere noches de 70 °F y días de 85 °F en S10). */
const UNDOCUMENTED_MAX_FALLBACK_C = fahrenheitToCelsius(85);

/**
 * Evalúa qué perfiles de pre-siembra coinciden con la temperatura y el pH medidos.
 *
 * Orden determinista e independiente del orden del arreglo (T03):
 * 1. Establecimiento anual de ciclo corto antes que evaluación parcial de perennes (T42).
 * 2. Coincidencia dentro de rangos óptimos antes que coincidencia con limitaciones.
 * 3. Perfiles con parámetros térmicos completos antes que perfiles con parámetros faltantes (T18).
 * 4. Desempate alfabético estable por `profileId`.
 */
export function evaluatePrePlantingOptions(
  reading: SoilMeasurement,
  language: AppLanguage = 'es',
  profiles: readonly PrePlantingProfile[] = PRE_PLANTING_PROFILES,
): PrePlantingOption[] {
  const valid = (['temp', 'ph'] as const).every(
    key => Number.isFinite(reading[key]) && reading[key] >= LOCAL_VARIABLES[key].min && reading[key] <= LOCAL_VARIABLES[key].max,
  );
  if (!valid) return [];
  const en = language === 'en';
  // `declaredGap`: al perfil le falta un parámetro en la fuente o el motor le fijó un óptimo que
  // la fuente no documenta. Ordena detrás de los perfiles completos y no sale en el resultado.
  const matched: (PrePlantingOption & { declaredGap: boolean })[] = [];

  for (const profile of profiles) {
    if (reading.temp < profile.tempMin) continue;
    const maxTemp = profile.tempMax ?? UNDOCUMENTED_MAX_FALLBACK_C;
    if (reading.temp > maxTemp) continue;
    if (reading.ph < profile.phMin || reading.ph > profile.phMax) continue;

    const incomplete = profile.tempOpt === null || profile.tempMax === null;
    const tempInOpt = profile.tempOpt !== null && reading.temp >= profile.tempOpt.min && reading.temp <= profile.tempOpt.max;
    const phInOpt = reading.ph >= profile.phOpt.min && reading.ph <= profile.phOpt.max;
    const limitationCodes: string[] = ['ph_method_unknown', 'ec_not_compared'];
    const reasons: string[] = [];

    if (tempInOpt) {
      reasons.push(en ? 'Soil temperature is within the documented optimal range.' : 'Temperatura del suelo dentro del rango óptimo documentado.');
    } else {
      limitationCodes.push('temp_outside_optimum');
      reasons.push(
        en
          ? 'Soil temperature meets the minimum/maximum range but is outside the optimal band.'
          : 'Temperatura del suelo dentro de los límites mínimo y máximo, pero fuera del rango óptimo.',
      );
    }

    if (phInOpt) {
      reasons.push(en ? 'Soil pH is within the target range.' : 'pH del suelo dentro del rango objetivo.');
    } else {
      limitationCodes.push('ph_outside_target');
      reasons.push(en ? 'Soil pH is within the tolerated range but outside the ideal target.' : 'pH del suelo dentro del rango tolerado, pero fuera del objetivo ideal.');
    }

    if (incomplete) {
      limitationCodes.push('thermal_optimum_and_maximum_undocumented');
      reasons.push(
        en
          ? 'Source does not tabulate a fixed optimum/maximum temperature (requires specific day/night conditions).'
          : 'La fuente no tabula un óptimo ni máximo térmico fijo (requiere alternancia día/noche y luz difusa).',
      );
    }

    if (profile.scope === 'partial_perennial_assessment') {
      limitationCodes.push('partial_perennial_assessment');
      reasons.push(
        en
          ? 'Partial soil assessment for a perennial crop; does not evaluate winter chill, rootstock or deep profile.'
          : 'Evaluación parcial de suelo para cultivo perenne; no evalúa frío invernal, portainjerto ni perfil profundo.',
      );
    }

    // Una cifra que la fuente no fija se declara siempre; sólo limita la clasificación cuando
    // inventa un óptimo o un rango en vez de restringir uno documentado (§7.5, §8.6).
    if (profile.convention) {
      limitationCodes.push('values_not_in_cited_sources');
      reasons.push(
        en
          ? `Values set by the engine, not stated in the cited sources: ${profile.convention.en}.`
          : `Valores fijados por el motor, que las fuentes citadas no establecen: ${profile.convention.es}.`,
      );
    }

    const classification: PrePlantingClassification =
      profile.scope === 'short_term_establishment' && !incomplete && !profile.convention?.limitsMatch && tempInOpt && phInOpt
        ? 'matches_evaluated_criteria'
        : 'has_limitations';

    const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', en ? '.' : ',');
    const sources = [...new Set(profile.evidence.map(e => en ? e.institution : `${e.institution} (${e.section})`))].join('; ');
    const engineSet = profile.convention
      ? (en ? ` Set by the engine, not stated in those sources: ${profile.convention.en}.` : ` Fijado por el motor, sin respaldo en esas fuentes: ${profile.convention.es}.`)
      : '';
    const technicalSummary = en
      ? `Ranges used: soil temperature ${fmt(profile.tempMin)} to ${profile.tempMax !== null ? `${fmt(profile.tempMax)} °C` : 'no fixed maximum'} (optimum ${profile.tempOpt ? `${fmt(profile.tempOpt.min)}–${fmt(profile.tempOpt.max)} °C` : 'not tabulated'}); pH ${fmt(profile.phMin)} to ${fmt(profile.phMax)} (target ${fmt(profile.phOpt.min)}–${fmt(profile.phOpt.max)}). Sources: ${sources}.${engineSet}`
      : `Rangos usados: temperatura ${fmt(profile.tempMin)} a ${profile.tempMax !== null ? `${fmt(profile.tempMax)} °C` : 'sin máximo fijo'} (óptimo ${profile.tempOpt ? `${fmt(profile.tempOpt.min)}–${fmt(profile.tempOpt.max)} °C` : 'no tabulado'}); pH ${fmt(profile.phMin)} a ${fmt(profile.phMax)} (objetivo ${fmt(profile.phOpt.min)}–${fmt(profile.phOpt.max)}). Fuentes: ${sources}.${engineSet}`;
    const name = en ? profile.nameEn : profile.nameEs;
    matched.push({
      profileId: profile.id,
      speciesId: profile.speciesId,
      label: `${profile.emoji} ${name}`,
      establishment: profile.establishment,
      scope: profile.scope,
      classification,
      reasons,
      limitationCodes,
      technicalSummary,
      declaredGap: incomplete || profile.convention?.limitsMatch === true,
    });
  }

  return matched
    .sort((a, b) => {
      const scopeOrder = (a.scope === 'short_term_establishment' ? 0 : 1) - (b.scope === 'short_term_establishment' ? 0 : 1);
      if (scopeOrder !== 0) return scopeOrder;
      const classOrder = (a.classification === 'matches_evaluated_criteria' ? 0 : 1) - (b.classification === 'matches_evaluated_criteria' ? 0 : 1);
      if (classOrder !== 0) return classOrder;
      const gapOrder = (a.declaredGap ? 1 : 0) - (b.declaredGap ? 1 : 0);
      if (gapOrder !== 0) return gapOrder;
      return a.profileId.localeCompare(b.profileId);
    })
    .map(({ declaredGap: _declaredGap, ...option }) => option);
}

/** Lista de etiquetas sugeridas en pre-siembra para mostrar al agricultor. */
export function suggestPrePlantingCrops(reading: SoilMeasurement, language: AppLanguage = 'es'): string[] {
  return evaluatePrePlantingOptions(reading, language).map(option => option.label);
}

