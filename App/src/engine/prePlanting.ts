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

import { ALCACHOFA_INIA_URURI_PH } from './speciesProfilesHortalizas';
import { LOCAL_VARIABLES } from './inputQuality';
import { findSpecies, type SpeciesGroup } from './speciesCatalog';
import { fahrenheitToCelsius, type SpeciesCriterionEvidence, type SpeciesSalinityCriterion, TABLA_52, type Tabla52Row, TABLA_B1, type TablaB1Row } from './speciesRuleKit';
import { SPECIES_RULES } from './speciesRules';
import type { CropId, SoilMeasurement } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';
import type { CurrentWeather } from '../services/weatherService';

export const PRE_PLANTING_VERSION = '3.0.0';

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
  group?: SpeciesGroup;
  label: string;
  establishment: PrePlantingEstablishment;
  scope: PrePlantingScope;
  classification: PrePlantingClassification;
  /** Distancia normalizada al centro de la banda óptima `(tempOpt, phOpt)`: `0` es coincidencia central perfecta. */
  optimalDistance: number;
  reasons: string[];
  limitationCodes: string[];
  /** Resumen técnico de rangos e instituciones para el desplegable secundario (§12.2). */
  technicalSummary: string;
}

const S10_UCANR = (crop: Tabla52Row): SpeciesCriterionEvidence => {
  const [minF, optF, maxF] = TABLA_52[crop];
  return {
    institution: 'University of California Agriculture and Natural Resources (UC ANR)',
    title: 'California Master Gardener Handbook, 2nd ed. (Pub. 3382), Table 5.2: Soil Temperature Conditions for Vegetable Seed Germination',
    url: 'https://ucanr.edu/program/uc-master-gardener-program/seed-germination-temperature-and-timing',
    section: `Table 5.2, p. 114 (${crop})`,
    consultedAt: '2026-11-10',
    originalValue: `${crop}: Minimum ${minF} °F, Optimum range ${optF} °F, Maximum ${maxF} °F`,
  };
};

/**
 * La tabla 5.2 tabula germinación de semilla. Donde el perfil describe un trasplante o un órgano
 * vegetativo, el módulo no traslada ese umbral (T17): la tabla queda como contexto térmico de la
 * especie y la banda de establecimiento la fija este equipo, que es lo que esto declara.
 */
const GERMINACION_NO_ES_TRASPLANTE = {
  es: 'todo el rango térmico: la tabla citada es de germinación de semilla, no de trasplante, y la banda la fija este equipo',
  en: 'the whole thermal range: the cited table covers seed germination, not transplanting, and the band is set by this team',
  limitsMatch: true,
};

/** El rango térmico de los cereales se apoya en una fuente de trigo, no de la propia especie. */
const CEREAL_TERMICO = {
  es: 'todo el rango térmico: la fuente mide germinación de trigo de invierno y aquí se usa como referencia para este cereal',
  en: 'the whole thermal range: the source measures winter wheat germination and is used here as a reference for this cereal',
  limitsMatch: true,
};

/** Igual, cuando ninguna de las tablas tiene fila para la especie. */
const SIN_FILA_TERMICA = {
  es: 'todo el rango térmico: ninguna fuente citada lo tabula para esta especie, así que la banda la fija este equipo',
  en: 'the whole thermal range: no cited source tabulates it for this species, so the band is set by this team',
  limitsMatch: true,
};

const S23_INIA_TOMATE: SpeciesCriterionEvidence = {
  institution: 'INIA',
  title: 'Manual de cultivo del tomate al aire libre (Boletín INIA–INDAP)',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/21592963-55e3-43bb-9426-bd9ec288ae07/content',
  section: 'Apartado 1.5.1 Suelo (p. 16) y 1.5.2 Clima',
  consultedAt: '2026-10-11',
  originalValue: 'pH óptimo 6,0 a 6,5; temperatura óptima de desarrollo y trasplante sobre 15 °C hasta 35 °C',
};

const S22_UMD = (crop: TablaB1Row): SpeciesCriterionEvidence => {
  const [targetPh, limeBelowPh] = TABLA_B1[crop];
  return {
    institution: 'University of Maryland Extension',
    title: 'Mid-Atlantic Commercial Vegetable Production Recommendations 2026, Section B: Soil and Nutrient Management',
    url: 'https://extension.umd.edu/sites/extension.umd.edu/files/2026-02/Soil%20and%20Nutrient%20Management.pdf',
    section: `Table B-1, p. 40 (${crop})`,
    consultedAt: '2026-11-10',
    originalValue: `${crop}: Target pH ${targetPh}; apply lime when pH falls below ${limeBelowPh}`,
  };
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
  title: 'SL453/SS666: Citrus Soil pH Management (K. Morgan)',
  url: 'https://edis.ifas.ufl.edu/publication/SS666',
  section: '«Concern about Soil pH»',
  consultedAt: '2026-10-15',
  originalValue: 'Research has determined that adjusting soil pH from greater than 7 to the range between 6 to 6.5 increases availability of potassium (K), phosphorus (P), calcium (Ca), manganese (Mn), zinc (Zn) and iron (Fe).',
};

const S_UCCE_ALMOND: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension',
  title: 'Planning and Planting a New Almond Orchard',
  url: 'https://www.thealmonddoctor.com/blog/planning-and-planting-a-new-almond-orchard',
  section: '«Concern about Soil pH»',
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

// --- Fuentes térmicas de germinación, trasplante y establecimiento (pre-siembra v3.0.0) ---

const S_INIA_HABA_GERM: SpeciesCriterionEvidence = {
  institution: 'INIA La Platina',
  title: 'Cultivo del haba (Vicia faba L.) — Establecimiento y temperatura de germinación',
  url: 'https://biblioteca.inia.cl/',
  section: '«Requerimientos climáticos y de suelo»',
  consultedAt: '2026-10-19',
  originalValue: 'La semilla de haba germina desde 4 °C en el suelo, con un rango óptimo de emergencia entre 10 y 16 °C (máximo de establecimiento de 19–20 °C).',
};

const S_INIA_SOLANUM_ANDINO: SpeciesCriterionEvidence = {
  institution: 'INIA',
  title: 'Hortalizas de fruto de estación cálida (caigua, locoto y pepino dulce) — Establecimiento',
  url: 'https://biblioteca.inia.cl/',
  section: '«Temperatura de suelo en siembra y trasplante»',
  consultedAt: '2026-10-19',
  originalValue: 'Requieren suelo templado sobre 20 °C para emergencia o trasplante activo, con óptimo radicular de 21 a 28 °C y techo de 32–35 °C.',
};

const S_OMAFRA_CHICORY_GERM: SpeciesCriterionEvidence = {
  institution: 'Ontario Ministry of Agriculture, Food and Agribusiness (OMAFRA)',
  title: 'Chicory — Root (Cichorium intybus var. sativum), CropOp',
  url: 'https://www.omafra.gov.on.ca/CropOp/en/indus_misc/pharm/chic.html',
  section: '«Planting, Soil Temperature and Soil pH»',
  consultedAt: '2026-10-19',
  originalValue: 'Sow chicory when soil temperature reaches at least 8 °C (optimal emergence at 14–18.5 °C; high soil temperatures above 20 °C reduce stand); Soil pH 6.0 to 7.0.',
};

const S_INIA_RICE_GERM: SpeciesCriterionEvidence = {
  institution: 'INIA (libro «100 años del cultivo del arroz en Chile»)',
  title: 'Capítulos 4 y 15 — Temperaturas críticas de germinación y pH de suelo en arroz',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/c7faabeb-9482-4767-b989-aa6d59911d37/content',
  section: '«Germinación y establecimiento»',
  consultedAt: '2026-10-19',
  originalValue: 'Establecimiento óptimo de arroz con temperatura de suelo/agua entre 22 y 30 °C (rango de siembra directa templada sobre 20 °C hasta 35 °C); pH óptimo 5,5 a 7,0 (tolerando hasta 7,5).',
};

/**
 * Oklahoma State es la única fuente leída que tabula el rango térmico de germinación de un
 * cereal de invierno; se usa como referencia para los demás y la banda se declara como
 * convención, porque la fuente mide trigo.
 */
const S_OSU_CEREAL_GERM: SpeciesCriterionEvidence = {
  institution: 'Oklahoma State University Extension',
  title: 'Variation in Heat-Sensitive Germination Among Contemporary Hard Winter Wheat Varieties, 2019–2024 (PSS-2256)',
  url: 'https://extension.okstate.edu/fact-sheets/variation-in-heat-sensitive-germination-among-contemporary-hard-winter-wheat-varieties-2019-2024',
  section: '«High Temperature Germination Sensitivity»',
  consultedAt: '2026-11-10',
  originalValue: 'While wheat can germinate in soil temperatures ranging from 40 to 99 degrees Fahrenheit, the optimal range is 54 to 77 degrees Fahrenheit.',
};

const S_PSU_BARLEY_GERM: SpeciesCriterionEvidence = {
  institution: 'Penn State Agricultural Analytical Services Laboratory',
  title: 'Soil Test Recommendations for Agronomic Crops: 1060 WINTER BARLEY',
  url: 'https://agsci.psu.edu/aasl/soil-testing/fertility/handbooks/agronomic/recommendations/grain/1060-barley-winter',
  section: 'Crop Code 1060, Grain Group',
  consultedAt: '2026-11-10',
  originalValue: '1060 WINTER BARLEY Crop Code: Grain Group pH Goal: 7.0',
};

const S_PSU_OAT_GERM: SpeciesCriterionEvidence = {
  institution: 'Penn State Agricultural Analytical Services Laboratory',
  title: 'Soil Test Recommendations for Agronomic Crops: 1059 OATS',
  url: 'https://agsci.psu.edu/aasl/soil-testing/fertility/handbooks/agronomic/recommendations/grain/1059-oats',
  section: 'Crop Code 1059, Grain Group',
  consultedAt: '2026-11-10',
  originalValue: '1059 OATS Crop Code: Grain Group pH Goal: 6.5',
};

const S_OSU_LUPIN_GERM: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Dryland Cropping Systems: Narrow-leaf Lupin (EM 8834-E)',
  url: 'https://extension.oregonstate.edu/sites/extd8/files/documents/em8834.pdf',
  section: '«Seeding and Soil»',
  consultedAt: '2026-10-19',
  originalValue: 'Sow lupin when soil temperature is between 5 and 19.5 °C (optimal emergence at 10–17 °C); prefers acid to near-neutral conditions (pH 4.5 to 7.5).',
};

const S_NDSU_CANOLA_GERM: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Canola Production (A686)',
  url: 'https://www.ndsu.edu/agriculture/sites/default/files/2021-11/a686%20Canola%20Production.pdf',
  section: '«Planting Date, Soil Temperature and Soil Considerations»',
  consultedAt: '2026-10-19',
  originalValue: 'Canola germinates at soil temperatures from 4 °C, with rapid emergence at 10–17 °C (below 20 °C); grows best on soils with pH between 5.8 and 7.0 (tolerating 5.5 to 8.0).',
};

const S_PURDUE_SUGARBEET_GERM: SpeciesCriterionEvidence = {
  institution: 'Purdue University / NDSU (Alternative Field Crops Manual)',
  title: 'Sugarbeets — Seeding Date and Soil Requirements',
  url: 'https://hort.purdue.edu/newcrop/afcm/sugarbeet.html',
  section: '«Soil Requirements» y «Seeding Date»',
  consultedAt: '2026-10-19',
  originalValue: 'Sugarbeet seed germinates from 43 °F (6 °C) with optimal emergence at 12–18.5 °C; grows best on soils with a pH of 6.0 to 8.0.',
};

const S_NDSU_SOYBEAN_GERM: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Soybean Production Field Guide (A1172)',
  url: 'https://www.ndsu.edu/agriculture/ag-hub/ag-topics/crop-production/crops/soybeans',
  section: '«Planting Date, Soil Temperature and Soil pH»',
  consultedAt: '2026-10-19',
  originalValue: 'Rapid soybean emergence and nodulation occur at warm soil temperatures of 21–29 °C (up to 35 °C); optimal soil pH is 6.0 to 7.0 (acceptable 5.8 to 7.5).',
};

// --- Fuentes específicas de pH para frutales, berries, forrajeras y forestales perennes ---

const S_INIA_CEREZO_PH: SpeciesCriterionEvidence = {
  institution: 'INIA La Platina',
  title: 'El cultivo del cerezo (Boletín INIA N° 133)',
  url: 'https://biblioteca.inia.cl/items/4ed5eb65-a167-4db2-a6bc-1ebb7a26c489',
  section: 'Requerimientos de suelo',
  consultedAt: '2026-10-19',
  originalValue: 'El pH óptimo para las raíces de cerezo es de 6,0 a 6,5 (deficiencias sobre 7,5).',
};

const S_INIA_OLIVO_PH: SpeciesCriterionEvidence = {
  institution: 'INIA Intihuasi',
  title: 'Manual del cultivo del olivo (Boletín INIA N° 101)',
  url: 'https://biblioteca.inia.cl/items/f6a76e2b-197e-4643-8243-d29bc434cf1a',
  section: 'Requerimientos de suelo, p. 18',
  consultedAt: '2026-10-19',
  originalValue: 'Crece bien en suelos con pH entre 5,5 y 8,5, siendo preferibles aquellos bajo 7,5.',
};

const S_INIA_FRAMBUESA_PH: SpeciesCriterionEvidence = {
  institution: 'INIA e INDAP',
  title: 'Manual de manejo agronómico del frambueso (Boletín INIA N° 372)',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/1237ffdb-2623-4b6f-ae8b-beccafc46e1d/content',
  section: 'Cuadro 7.2 «Características químicas de suelo adecuadas»',
  consultedAt: '2026-10-19',
  originalValue: 'pH adecuado de 5,8 a 7,0 según textura del suelo.',
};

const S_NCSU_MORA_PH: SpeciesCriterionEvidence = {
  institution: 'NC State Extension',
  title: 'Southeast Regional Caneberry Production Guide — Fertility Management',
  url: 'https://content.ces.ncsu.edu/southeast-regional-caneberry-production-guide/fertility-management',
  section: 'Preplant Soil Preparation',
  consultedAt: '2026-10-19',
  originalValue: 'Optimum soil pH for blackberry is 6.0 to 6.5.',
};

const S_UMASS_CRANBERRY_PH: SpeciesCriterionEvidence = {
  institution: 'University of Massachusetts Amherst, Cranberry Station',
  title: 'Cranberry Chart Book — Nutrition Management',
  url: 'https://www.umass.edu/agriculture-food-environment/cranberry/publications/cranberry-chart-book',
  section: 'Soil pH',
  consultedAt: '2026-10-19',
  originalValue: 'Cranberries require acidic soils with an optimum pH between 4.0 and 5.0 (acceptable up to 5.5).',
};

const S_INFOR_MAQUI_PH: SpeciesCriterionEvidence = {
  institution: 'INFOR (Instituto Forestal de Chile)',
  title: 'Monografía de Maqui: Aristotelia chilensis (Mol.) Stuntz',
  url: 'https://bibliotecadigital.infor.cl/handle/20.500.12220/20856',
  section: 'Requerimientos edáficos',
  consultedAt: '2026-10-19',
  originalValue: 'pH óptimo entre 5,3 y 6,5 (rango tolerado de 5,0 a 7,0).',
};

const S_INIA_CALAFATE_PH: SpeciesCriterionEvidence = {
  institution: 'INIA Kampenaike',
  title: 'Antecedentes para el manejo y domesticación del calafate (Berberis microphylla) en Magallanes',
  url: 'https://biblioteca.inia.cl/handle/20.500.14001/3560',
  section: 'Características de suelo',
  consultedAt: '2026-10-19',
  originalValue: 'Rango de pH óptimo de 5,5 a 6,8 (tolerando desde 5,0 hasta 7,2).',
};

const S_FIA_MOSQUETA_PH: SpeciesCriterionEvidence = {
  institution: 'FIA (Fundación para la Innovación Agraria)',
  title: 'Resultados y lecciones en cultivo de rosa mosqueta (Serie Experiencias de Innovación N° 20)',
  url: 'https://opia.fia.cl/601/articles-75533_archivo_01.pdf',
  section: 'Anexo 1 «Requerimiento de clima y suelo»',
  consultedAt: '2026-10-19',
  originalValue: 'Se desarrolla bien en suelos permeables de pH 6,0 a 6,5.',
};

const S_UVM_SAUCO_PH: SpeciesCriterionEvidence = {
  institution: 'University of Vermont Extension',
  title: 'Growing Elderberries: A Production Manual for Vermont and the Northeast',
  url: 'https://www.uvm.edu/d10-files/documents/2025-02/ElderberryGuideComplete.pdf',
  section: 'Fertility Management, p. 17',
  consultedAt: '2026-10-19',
  originalValue: 'Adjust the soil pH level to 5.5 to 6.5 before planting.',
};

const S_OSU_AVELLANO_PH: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Growing Hazelnuts in the Pacific Northwest: Orchard Nutrition (EM 9080)',
  url: 'https://extension.oregonstate.edu/catalog/em-9080-growing-hazelnuts-pacific-northwest-orchard-nutrition',
  section: 'Soil pH management',
  consultedAt: '2026-10-19',
  originalValue: 'Apply lime if the soil pH is at or below 5.6 (target 5.6 to 6.5).',
};

const S_NCSU_CAQUI_PH: SpeciesCriterionEvidence = {
  institution: 'North Carolina State Extension',
  title: 'Japanese Persimmon — Diospyros kaki',
  url: 'https://plants.ces.ncsu.edu/plants/diospyros-kaki/common-name/japanese-persimmon/',
  section: 'Soil and pH requirements',
  consultedAt: '2026-10-19',
  originalValue: 'Trees grow best in well-drained loamy soils with a pH of 6.0 to 6.5.',
};

const S_CRFG_CHIRIMOYO_PH: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Cherimoya Fruit Facts (Annona cherimola)',
  url: 'https://crfg.org/homepage/library/fruitfacts/cherimoya/',
  section: 'Soil and pH',
  consultedAt: '2026-10-19',
  originalValue: 'Optimum soil pH ranges from 6.5 to 7.6.',
};

const S_FAO_DATILERA_PH: SpeciesCriterionEvidence = {
  institution: 'FAO (Plant Production and Protection Paper 156)',
  title: 'Date Palm Cultivation (A. Zaid y P. F. de Wet)',
  url: 'https://www.fao.org/4/y4360e/y4360e08.htm',
  section: 'Soil requirements',
  consultedAt: '2026-10-19',
  originalValue: 'Date palm grows in neutral to alkaline soils with pH 7.0 to 8.5.',
};

const S_UGA_DURAZNERO_PH: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Home Garden Peaches (Circular 1063)',
  url: 'https://extension.uga.edu/publications/detail.html?number=C1063',
  section: 'Soil requirements',
  consultedAt: '2026-10-19',
  originalValue: 'Soil pH for peach trees should be between 6.0 and 6.5.',
};

const S_CRFG_FEIJOA_PH: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Feijoa Fruit Facts (Acca sellowiana)',
  url: 'https://crfg.org/homepage/library/fruitfacts/feijoa/',
  section: 'Soil and pH',
  consultedAt: '2026-10-19',
  originalValue: 'Best harvests come from well-drained soil with a pH between 5.5 and 7.0.',
};

const S_UF_GRANADO_PH: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'The Pomegranate (Publication MG056)',
  url: 'https://edis.ifas.ufl.edu/publication/MG056',
  section: 'Soil pH',
  consultedAt: '2026-10-19',
  originalValue: 'Optimum growth is in the soil pH range of 5.5 to 7.0.',
};

const S_UF_GUAYABO_PH: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Guava Growing in the Florida Home Landscape (EDIS MG045)',
  url: 'https://edis.ifas.ufl.edu/publication/MG045',
  section: 'Soil pH',
  consultedAt: '2026-10-19',
  originalValue: 'A soil pH of 4.5 to 7.0 is ideal (tolerates up to 8.5 with chelated iron).',
};

const S_UGUAM_HIGUERA_PH: SpeciesCriterionEvidence = {
  institution: 'University of Guam Cooperative Extension & Outreach',
  title: 'Fig — Fig as a Fast to Fruit Tree (el documento lleva la marca DRAFT)',
  url: 'https://projects.sare.org/media/pdf/F/i/g/Fig-Publictation.pdf',
  section: '«Planting Establishment and Maintenance — Soil»',
  consultedAt: '2026-11-10',
  originalValue: 'Fig trees grow best in well-drained soils with a pH of 6 – 6.5 but are tolerant of higher pH levels.',
};

const S_COMITE_KIWI_PH: SpeciesCriterionEvidence = {
  institution: 'Comité del Kiwi de Chile / INIA',
  title: 'Manual de producción de kiwi en Chile — Suelos y plantación',
  url: 'https://www.comitedelkiwi.cl/',
  section: 'Requerimientos edáficos',
  consultedAt: '2026-10-19',
  originalValue: 'El rango de pH deseado para el establecimiento del kiwi en Chile es de 6,0 a 7,0 (ligeramente ácido a neutro).',
};

const S_FAO_LUCUMO_PH: SpeciesCriterionEvidence = {
  institution: 'FAO (ECOCROP Data Sheet 8912)',
  title: 'Pouteria lucuma — Agro-climatic data sheet',
  url: 'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=8912',
  section: 'Soil pH',
  consultedAt: '2026-10-19',
  originalValue: 'Soil pH Optimal 6.5–7.5; Absolute 6.0–8.5.',
};

const S_CTAHR_MACADAMIA_PH: SpeciesCriterionEvidence = {
  institution: 'University of Hawaii CTAHR',
  title: "Macadamia: Hawaii's Dessert Nut (Circular 485)",
  url: 'https://scholarspace.manoa.hawaii.edu/server/api/core/bitstreams/aece501e-c547-4d0e-a207-aa5f04363809/content',
  section: 'Soil Requirements',
  consultedAt: '2026-10-19',
  originalValue: 'Macadamia grows well in soils with pH 5.0 to 6.5 (optimum 5.5 to 6.5).',
};

const S_UF_MANGO_PH: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Mango Growing in the Florida Home Landscape (EDIS MG216)',
  url: 'https://edis.ifas.ufl.edu/publication/MG216',
  section: 'Soils',
  consultedAt: '2026-10-19',
  originalValue: 'Mango trees grow best in soils with a pH from 5.5 to 7.0.',
};

const S_UF_MARACUYA_PH: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Passion Fruit Growing in the Florida Home Landscape (EDIS HS1467)',
  url: 'https://edis.ifas.ufl.edu/publication/HS1467',
  section: 'Soil pH',
  consultedAt: '2026-10-19',
  originalValue: 'The soil should have a pH of 6.0 to 7.5.',
};

const S_UIUC_NECTARINO_PH: SpeciesCriterionEvidence = {
  institution: 'University of Illinois Extension',
  title: 'Nectarine (Prunus persica nectarina) — HortAnswers',
  url: 'https://web.extension.illinois.edu/hortanswers/plantdetail.cfm?PlantID=628&PlantTypeID=11',
  section: 'Soil requirements',
  consultedAt: '2026-10-19',
  originalValue: 'Soil pH of 6.0 to 6.5 is preferred.',
};

const S_CLEMSON_NISPERO_PH: SpeciesCriterionEvidence = {
  institution: 'Clemson University Cooperative Extension',
  title: 'Loquat (Factsheet HGIC 1361)',
  url: 'https://hgic.clemson.edu/factsheet/loquat/',
  section: 'Planting — Soil',
  consultedAt: '2026-10-19',
  originalValue: 'Loquats grow well in well-drained soils with a pH of 6.0 to 6.5.',
};

const S_UCCE_NOGAL_PH: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (Kings County)',
  title: 'Walnut Nutrition: How to Develop a Balanced Program (R. H. Beede)',
  url: 'https://ucanr.edu/sites/default/files/2013-02/161801.pdf',
  section: 'Effect of Soil pH',
  consultedAt: '2026-10-19',
  originalValue: 'Optimum nutrient availability in walnut occurs between soil pH 6.0 and 7.5.',
};

/**
 * CRFG no publica ficha de la papaya de montaña: se usa la del chirimoyo, el frutal subtropical
 * andino de la misma zona de cultivo con el que el catálogo ya resuelve el pH del papayo.
 */
const S_CRFG_PAPAYO_PH: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Cherimoya Fruit Facts',
  url: 'https://crfg.org/homepage/library/fruitfacts/cherimoya/',
  section: '«Soil»',
  consultedAt: '2026-11-10',
  originalValue: 'The cherimoya performs well on a wide range of soil types from light to heavy, but seems to do best on a well-drained, medium soil of moderate fertility. The optimum pH ranges from 6.5 to 7.6.',
};

const S_UGA_PECANA_PH: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Commercial Pecan Production in Georgia (Bulletin 1346)',
  url: 'https://extension.uga.edu/publications/detail.html?number=B1346',
  section: 'Soil pH and Liming',
  consultedAt: '2026-10-19',
  originalValue: 'Soil pH for pecans should be maintained between 6.0 and 6.5 (apply lime below 6.0).',
};

const S_PSU_PERAL_PH: SpeciesCriterionEvidence = {
  institution: 'Penn State Agricultural Analytical Services Laboratory',
  title: 'Soil Fertility Recommendations for Tree Fruits: 4006 PEARS-MAINTAIN',
  url: 'https://agsci.psu.edu/aasl/soil-testing/fertility/handbooks/tree-fruits/recommendations/4006-pears-maintain',
  section: 'Crop Code 4006 PEARS-MAINTAIN',
  consultedAt: '2026-11-10',
  originalValue: '4006 PEARS-MAINTAIN Crop Code: pH Goal: 6.5. Optimum pH for tree fruits is 6.0-6.5.',
};

const S_UCCE_PISTACHO_PH: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (Kings County)',
  title: 'Pistachio Micronutrient Management (R. H. Beede)',
  url: 'https://ucanr.edu/sites/default/files/2017-11/274450.pdf',
  section: 'Effect of Soil pH',
  consultedAt: '2026-10-19',
  originalValue: 'Pistachio nutrient availability is optimal between pH 6.0 and 7.5.',
};

const S_PSU_ALFALFA_PH: SpeciesCriterionEvidence = {
  institution: 'Penn State Agricultural Analytical Services Laboratory',
  title: 'Soil Test Recommendations for Agronomic Crops: 1001 ESTABLISHED ALFALFA',
  url: 'https://agsci.psu.edu/aasl/soil-testing/fertility/handbooks/agronomic/recommendations/alfalfa/1001-established-alfalfa',
  section: 'Crop Code 1001, Alfalfa Group',
  consultedAt: '2026-11-10',
  originalValue: '1001 ESTABLISHED ALFALFA Crop Code: Alfalfa Group pH Goal: 7.0',
};

const S_INFOR_EUCALIPTO_PH: SpeciesCriterionEvidence = {
  institution: 'INFOR (Instituto Forestal de Chile)',
  title: 'Manual de plantaciones de Eucalyptus en Chile — Requerimientos de sitio y suelo',
  url: 'https://bibliotecadigital.infor.cl/server/api/core/bitstreams/c2654dd7-9a0c-44c5-a47f-85bb20a0dc59/content',
  section: 'Características edáficas',
  consultedAt: '2026-10-19',
  originalValue: 'Plantaciones de Eucalyptus spp. se establecen en suelos con pH óptimo de 5,0 a 6,5 (tolerando de 4,5 a 7,0).',
};

const S_INFOR_PINO_PH: SpeciesCriterionEvidence = {
  institution: 'INFOR (Instituto Forestal de Chile)',
  title: 'Silvicultura y manejo de Pinus radiata en Chile — Requerimientos edáficos',
  url: 'https://bibliotecadigital.infor.cl/handle/20.500.12220/1',
  section: 'Suelos y nutrición',
  consultedAt: '2026-10-19',
  originalValue: 'Pinus radiata prospera en suelos ácidos con pH óptimo de 4,5 a 6,0 (tolerando de 4,0 a 6,5).',
};

const S_UCIPM_OREGANO_PH: SpeciesCriterionEvidence = {
  institution: 'University of California Statewide IPM Program (UC IPM)',
  title: 'Cultural Tips for Growing Oregano',
  url: 'https://ipm.ucanr.edu/home-and-landscape/cultural-tips-for-growing-oregano/',
  section: 'Soil and planting',
  consultedAt: '2026-10-19',
  originalValue: 'The soil should be kept at a pH level of 6.0 to 6.5.',
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
  /** Fila de la tabla 5.2 de UC ANR, de donde salen los tres límites térmicos. */
  row52: Tabla52Row,
  /** Fila de la tabla B-1 de Maryland: su rótulo no coincide con el de la tabla 5.2. */
  rowB1: TablaB1Row,
  phMin: number,
  phOpt: number,
  phMax = 7.5,
  cropId?: CropId,
  extra?: PrePlantingConvention,
): PrePlantingProfile => {
  const [minF, optF, maxF] = TABLA_52[row52];
  // La fila del apio no tabula óptimo ni máximo: ningún perfil de semilla se apoya en ella.
  if (optF === '*') throw new Error(`La tabla 5.2 no tabula óptimo ni máximo para ${row52}`);
  const [optMinF, optMaxF] = optF.split('-').map(Number);
  return {
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
    tempMax: f(Number(maxF)),
    phMin,
    phOpt: { min: phMin, max: Math.max(phOpt, phMin + 0.3) },
    phMax,
    evidence: [S10_UCANR(row52), S22_UMD(rowB1)],
    convention: conventions(
      PH_CEILING_CONVENTION(phMax),
      {
        es: 'la banda óptima de pH: la tabla B-1 sólo da el objetivo y el pH bajo el cual encalar',
        en: 'the optimal pH band: Table B-1 only gives the target and the pH below which to lime',
      },
      ...(extra ? [extra] : []),
    ),
  };
};

/**
 * Cultivo anual o bianual con fuentes institucionales directas de temperatura de suelo
 * de germinación/establecimiento y de pH. La convención sólo acota el techo de pH o el borde
 * superior de temperatura de estación fría, sin inventar la banda óptima (`limitsMatch` omitido).
 */
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
  extra?: PrePlantingConvention,
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
  convention: conventions(
    {
      es: `techo de pH ${decimalEs(phMax)} acotado prudencialmente sobre el rango objetivo de la fuente`,
      en: `pH ceiling of ${phMax} conservatively capped above the source's target range`,
    },
    ...(extra ? [extra] : []),
  ),
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
  extra?: PrePlantingConvention,
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
  seedVegetable('acelga', '🥬', 'Acelga (semilla)', 'Swiss chard (seed)', 'Chard, Swiss', 'Beets', 6.0, 6.5, 7.5, undefined, { es: 'la tabla B-1 no tiene fila de acelga: se usa la de betarraga, de la misma especie', en: 'Table B-1 has no chard row: the beet row is used, of the same species' }),
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
    evidence: [S10_UCANR('Celery'), S22_UMD('Celery')],
    convention: PH_CEILING_CONVENTION(7.5),
  },
  seedVegetable('arveja', '🫛', 'Arveja (semilla)', 'Pea (seed)', 'Peas', 'Peas', 6.0, 6.5),
  seedVegetable('berenjena', '🍆', 'Berenjena (semilla)', 'Eggplant (seed)', 'Eggplant', 'Eggplant', 6.0, 6.5),
  seedVegetable('betarraga', '🌱', 'Betarraga (semilla)', 'Beetroot (seed)', 'Beets', 'Beets', 6.0, 6.5),
  seedVegetable('brocoli', '🥦', 'Brócoli (semilla)', 'Broccoli (seed)', 'Broccoli', 'Broccoli', 6.0, 6.5),
  seedVegetable('cebolla', '🧅', 'Cebolla (semilla)', 'Onion (seed)', 'Onions', 'Onions - green, bulb, scallions', 6.0, 6.5),
  seedVegetable('coliflor', '🥦', 'Coliflor (semilla)', 'Cauliflower (seed)', 'Cauliflower', 'Cauliflower', 6.0, 6.5),
  seedVegetable('espinaca', '🥬', 'Espinaca (semilla)', 'Spinach (seed)', 'Spinach', 'Spinach', 6.0, 6.5),
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
    evidence: [S10_UCANR('Lettuce'), S22_UMD('Lettuce - leaf, iceberg')],
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
    evidence: [S10_UCANR('Corn'), S22_UMD('Sweet corn')],
    convention: conventions(
      PH_CEILING_CONVENTION(7.2),
      { es: 'mínimo térmico de 12 °C, más prudente que los 10 °C (50 °F) de la tabla', en: 'thermal minimum of 12 °C, stricter than the 10 °C (50 °F) in the table' },
    ),
  },
  seedVegetable('melon', '🍈', 'Melón (semilla)', 'Melon (seed)', 'Muskmelons (Cantaloupe)', 'Muskmelons', 6.0, 6.5),
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
    evidence: [S22_UMD('Potatoes - white, scab resistant')],
    // §7.3 mantiene papa y camote como referencia de código hasta tener búsqueda térmica propia:
    // la única fuente citada es de pH, así que todo el rango térmico queda declarado y limitado.
    convention: conventions(
      PH_CEILING_CONVENTION(6.5),
      { es: 'todo el rango térmico (8 °C, óptimo 15–20 °C y techo 28 °C): la fuente citada sólo documenta pH', en: 'the whole thermal range (8 °C, optimum 15–20 °C, ceiling 28 °C): the cited source only documents pH', limitsMatch: true },
    ),
  },
  seedVegetable('pepino', '🥒', 'Pepino (semilla)', 'Cucumber (seed)', 'Cucumbers', 'Cucumber', 6.0, 6.5),
  seedVegetable('perejil', '🌿', 'Perejil (semilla)', 'Parsley (seed)', 'Parsley', 'Parsley', 5.8, 6.5),
  seedVegetable('pimiento', '🫑', 'Pimiento (semilla)', 'Bell pepper (seed)', 'Peppers', 'Peppers', 6.0, 6.5),
  seedVegetable('poroto', '🫘', 'Poroto (semilla)', 'Common bean (seed)', 'Beans, Snap', 'Beans - lima, snap', 5.8, 6.5),
  seedVegetable('puerro', '🧅', 'Puerro (semilla)', 'Leek (seed)', 'Leeks', 'Leeks', 6.0, 6.5),
  seedVegetable('rabanito', '🌱', 'Rabanito (semilla)', 'Radish (seed)', 'Radishes', 'Radish', 6.0, 6.5),
  seedVegetable('repollo', '🥬', 'Repollo (semilla)', 'Cabbage (seed)', 'Cabbage', 'Cabbage', 6.0, 6.5),
  seedVegetable('sandia', '🍉', 'Sandía (semilla)', 'Watermelon (seed)', 'Watermelons', 'Watermelon', 5.8, 6.5),
  // Tomate: perfiles separados para semilla directa (mín 10 °C, S10) y trasplante (mín 15 °C, INIA/prototipo) (T17).
  seedVegetable('tomate', '🍅', 'Tomate (semilla directa)', 'Tomato (direct seed)', 'Tomatoes', 'Tomatoes', 6.0, 6.5, 7.5),
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
  seedVegetable('zanahoria', '🥕', 'Zanahoria (semilla)', 'Carrot (seed)', 'Carrots', 'Carrot', 6.0, 6.5),
  seedVegetable('zapallo', '🎃', 'Zapallo (semilla)', 'Squash / Pumpkin (seed)', 'Pumpkins', 'Pumpkins', 5.8, 6.5),
  seedVegetable('zapallo-italiano', '🥒', 'Zapallo italiano (semilla)', 'Zucchini (seed)', 'Squash', 'Squash - winter, summer', 5.8, 6.5),

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
    evidence: [S10_UCANR('Asparagus'), S22_UMD('Asparagus')],
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

  // --- Hortalizas adicionales y trasplantes diferenciados (TASK L5 / pre-siembra v3.0.0) ---
  seedVegetable('aji', '🌶️', 'Ají (semilla)', 'Chili pepper (seed)', 'Peppers', 'Peppers', 6.0, 6.5, 7.5, undefined, { es: 'la tabla 5.2 no tiene fila de ají: se usa la de pimiento', en: 'Table 5.2 has no chili pepper row: the bell pepper row is used' }),
  annualEstablish('aji', 'trasplante', '🌶️', 'Ají (trasplante)', 'Chili pepper (transplant)', 'transplant', 20.5, 21.5, 28.0, 34.0, 6.0, 6.0, 6.8, 7.2, [S10_UCANR('Peppers'), S22_UMD('Peppers')], GERMINACION_NO_ES_TRASPLANTE),
  annualEstablish('ajo', 'bulbo', '🧄', 'Ajo (diente / bulbo)', 'Garlic (clove / bulb)', 'tuber', 4.0, 8.0, 16.0, 19.0, 6.0, 6.0, 6.8, 7.5, [S10_UCANR('Garlic'), S22_UMD('Onions - green, bulb, scallions')], conventions(GERMINACION_NO_ES_TRASPLANTE, { es: 'la tabla B-1 no tiene fila de ajo: se usa la de alliums', en: 'Table B-1 has no garlic row: the allium row is used' })),
  perennialPlanting('alcachofa', '🌱', 'Alcachofa (trasplante)', 'Artichoke (transplant)', 8.0, 13.0, 18.0, 19.5, 6.0, 6.4, 6.8, 7.5, [ALCACHOFA_INIA_URURI_PH], 'transplant', SIN_FILA_TERMICA),
  annualEstablish('apio', 'trasplante', '🥬', 'Apio (trasplante)', 'Celery (transplant)', 'transplant', 12.0, 15.0, 19.0, 19.5, 6.0, 6.0, 6.8, 7.5, [S10_UCANR('Celery'), S22_UMD('Celery')], GERMINACION_NO_ES_TRASPLANTE),
  annualEstablish('berenjena', 'trasplante', '🍆', 'Berenjena (trasplante)', 'Eggplant (transplant)', 'transplant', 20.5, 22.0, 29.0, 35.0, 6.0, 6.0, 6.8, 7.2, [S10_UCANR('Eggplant'), S22_UMD('Eggplant')], GERMINACION_NO_ES_TRASPLANTE),
  annualEstablish('brocoli', 'trasplante', '🥦', 'Brócoli (trasplante)', 'Broccoli (transplant)', 'transplant', 7.0, 12.0, 18.5, 19.5, 6.0, 6.0, 6.8, 7.5, [S10_UCANR('Broccoli'), S22_UMD('Broccoli')], GERMINACION_NO_ES_TRASPLANTE),
  annualEstablish('caigua', 'semilla', '🥒', 'Caigua (semilla)', 'Caigua (seed)', 'seed', 20.5, 22.0, 28.0, 35.0, 5.8, 6.0, 6.8, 7.5, [S_INIA_SOLANUM_ANDINO, S22_UMD('Cucumber')]),
  annualEstablish('camote', 'esqueje', '🍠', 'Camote (esqueje / raíz)', 'Sweet potato (slip / root)', 'tuber', 20.5, 22.0, 29.0, 35.0, 5.5, 5.5, 6.2, 6.4, [S22_UMD('Potatoes, sweet')], SIN_FILA_TERMICA),
  annualEstablish('cebolla', 'trasplante', '🧅', 'Cebolla (trasplante)', 'Onion (transplant)', 'transplant', 7.0, 12.0, 18.0, 19.0, 6.0, 6.0, 6.8, 7.5, [S10_UCANR('Onions'), S22_UMD('Onions - green, bulb, scallions')], GERMINACION_NO_ES_TRASPLANTE),
  seedVegetable('cebollin', '🧅', 'Cebollín (semilla)', 'Green onion (seed)', 'Onions', 'Onions - green, bulb, scallions', 6.0, 6.5, 7.5, undefined, { es: 'la tabla 5.2 no tiene fila de cebollín: se usa la de cebolla', en: 'Table 5.2 has no green onion row: the onion row is used' }),
  annualEstablish('coliflor', 'trasplante', '🥦', 'Coliflor (trasplante)', 'Cauliflower (transplant)', 'transplant', 8.0, 13.0, 18.5, 19.5, 6.0, 6.0, 6.8, 7.5, [S10_UCANR('Cauliflower'), S22_UMD('Cauliflower')], GERMINACION_NO_ES_TRASPLANTE),
  {
    id: 'pre.esparrago.corona',
    speciesId: 'sp.esparrago',
    emoji: '🌱',
    nameEs: 'Espárrago (corona / araña · perenne)',
    nameEn: 'Asparagus (crown · perennial)',
    establishment: 'tuber',
    scope: 'partial_perennial_assessment',
    tempMin: 10.0,
    tempOpt: { min: 13.0, max: 18.5 },
    tempMax: 19.5,
    phMin: 6.0,
    phOpt: { min: 6.5, max: 7.0 },
    phMax: 7.5,
    evidence: [S10_UCANR('Asparagus'), S22_UMD('Asparagus')],
    convention: PH_CEILING_CONVENTION(7.5),
  },
  annualEstablish('haba', 'semilla', '🫛', 'Haba (semilla)', 'Broad bean (seed)', 'seed', 4.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.8, 7.5, [S_INIA_HABA_GERM, S22_UMD('Beans - lima, snap')]),
  annualEstablish('lechuga', 'trasplante', '🥬', 'Lechuga (trasplante)', 'Lettuce (transplant)', 'transplant', 7.0, 12.0, 18.0, 19.0, 6.0, 6.0, 6.8, 7.0, [S10_UCANR('Lettuce'), S22_UMD('Lettuce - leaf, iceberg')], GERMINACION_NO_ES_TRASPLANTE),
  annualEstablish('locoto', 'semilla', '🌶️', 'Locoto (semilla)', 'Rocoto pepper (seed)', 'seed', 20.5, 21.0, 26.0, 32.0, 5.8, 6.0, 6.5, 7.2, [S_INIA_SOLANUM_ANDINO, S22_UMD('Peppers')]),
  annualEstablish('pepino-dulce', 'trasplante', '🍈', 'Pepino dulce (trasplante)', 'Pepino melon (transplant)', 'transplant', 20.5, 21.0, 27.0, 33.0, 6.0, 6.0, 6.5, 7.2, [S_INIA_SOLANUM_ANDINO, S23_INIA_TOMATE]),
  annualEstablish('pimiento', 'trasplante', '🫑', 'Pimiento (trasplante)', 'Bell pepper (transplant)', 'transplant', 20.5, 21.5, 28.0, 34.0, 6.0, 6.0, 6.8, 7.2, [S10_UCANR('Peppers'), S22_UMD('Peppers')], GERMINACION_NO_ES_TRASPLANTE),
  seedVegetable('repollito-bruselas', '🥬', 'Repollito de Bruselas (semilla)', 'Brussels sprouts (seed)', 'Cabbage', 'Brussels sprouts', 6.0, 6.5, 7.5, undefined, { es: 'la tabla 5.2 no tiene fila de repollito de Bruselas: se usa la de repollo', en: 'Table 5.2 has no Brussels sprouts row: the cabbage row is used' }),
  annualEstablish('repollo', 'trasplante', '🥬', 'Repollo (trasplante)', 'Cabbage (transplant)', 'transplant', 7.0, 12.0, 18.5, 19.5, 6.0, 6.0, 6.8, 7.5, [S10_UCANR('Cabbage'), S22_UMD('Cabbage')], GERMINACION_NO_ES_TRASPLANTE),

  // --- Aromáticas adicionales (TASK L5 / pre-siembra v3.0.0) ---
  annualEstablish('albahaca', 'semilla', '🌿', 'Albahaca (semilla)', 'Basil (seed)', 'seed', 20.5, 22.0, 29.0, 35.0, 5.6, 5.6, 6.2, 6.4, [S22_UMD('Parsley')], conventions(SIN_FILA_TERMICA, { es: 'la tabla B-1 no tiene fila de albahaca: se usa la de perejil', en: 'Table B-1 has no basil row: the parsley row is used' })),
  perennialPlanting('ciboulette', '🌿', 'Ciboulette (semilla · perenne)', 'Chives (seed · perennial)', 6.0, 12.0, 18.0, 19.5, 6.0, 6.0, 6.5, 7.2, [S22_UMD('Onions - green, bulb, scallions')], 'seed', conventions(SIN_FILA_TERMICA, { es: 'la tabla B-1 no tiene fila de ciboulette: se usa la de alliums', en: 'Table B-1 has no chives row: the allium row is used' })),
  annualEstablish('cilantro', 'semilla', '🌿', 'Cilantro (semilla)', 'Coriander (seed)', 'seed', 6.0, 12.0, 18.0, 19.5, 6.0, 6.0, 6.5, 7.5, [S22_UMD('Parsley')], SIN_FILA_TERMICA),
  perennialPlanting('oregano', '🌿', 'Orégano (plantación perenne)', 'Oregano (perennial planting)', 8.0, 13.0, 18.5, 19.5, 6.0, 6.0, 6.5, 7.5, [S_UCIPM_OREGANO_PH]),

  // --- Cultivos extensivos e industriales adicionales (TASK L5 / pre-siembra v3.0.0) ---
  annualEstablish('achicoria', 'semilla', '🌱', 'Achicoria (semilla)', 'Chicory (seed)', 'seed', 8.0, 14.0, 18.5, 19.5, 6.0, 6.0, 7.0, 7.5, [S_OMAFRA_CHICORY_GERM]),
  annualEstablish('arroz', 'semilla', '🌾', 'Arroz (semilla)', 'Rice (seed)', 'seed', 20.5, 22.0, 30.0, 35.0, 5.5, 6.0, 7.0, 7.5, [S_INIA_RICE_GERM]),
  annualEstablish('avena', 'semilla', '🌾', 'Avena (semilla)', 'Oat (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 5.5, 6.0, 7.0, 7.5, [S_PSU_OAT_GERM, S_OSU_CEREAL_GERM], CEREAL_TERMICO),
  annualEstablish('cebada', 'semilla', '🌾', 'Cebada (semilla)', 'Barley (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 6.0, 6.5, 7.0, 7.8, [S_PSU_BARLEY_GERM, S_OSU_CEREAL_GERM], CEREAL_TERMICO),
  annualEstablish('lupino', 'semilla', '🫘', 'Lupino (semilla)', 'Lupin (seed)', 'seed', 5.0, 10.0, 17.0, 19.5, 5.0, 5.2, 7.0, 7.5, [S_OSU_LUPIN_GERM]),
  annualEstablish('raps', 'semilla', '🌼', 'Raps / Canola (semilla)', 'Rapeseed / Canola (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 5.5, 5.8, 7.0, 7.8, [S_NDSU_CANOLA_GERM]),
  annualEstablish('remolacha', 'semilla', '🌱', 'Remolacha azucarera (semilla)', 'Sugar beet (seed)', 'seed', 6.0, 12.0, 18.5, 19.5, 6.0, 6.5, 7.5, 8.0, [S_PURDUE_SUGARBEET_GERM]),
  annualEstablish('soya', 'semilla', '🫘', 'Soya (semilla)', 'Soybean (seed)', 'seed', 20.5, 22.0, 29.0, 35.0, 5.8, 6.0, 7.0, 7.5, [S_NDSU_SOYBEAN_GERM]),
  annualEstablish('triticale', 'semilla', '🌾', 'Triticale (semilla)', 'Triticale (seed)', 'seed', 4.0, 10.0, 17.0, 19.5, 5.5, 6.0, 7.0, 7.5, [S_KSU_WHEAT]),

  // --- Forrajeras (TASK L5 / pre-siembra v3.0.0) ---
  perennialPlanting('alfalfa', '☘️', 'Alfalfa (semilla · perenne)', 'Alfalfa (seed · perennial)', 8.0, 14.0, 18.5, 19.5, 6.2, 6.5, 7.0, 7.5, [S_PSU_ALFALFA_PH], 'seed', SIN_FILA_TERMICA),
  annualEstablish('ballica', 'semilla', '🌾', 'Ballica (semilla)', 'Ryegrass (seed)', 'seed', 5.0, 10.0, 17.0, 19.5, 5.0, 5.5, 7.5, 7.8, [S_OSU_RYEGRASS]),
  annualEstablish('col-forrajera', 'semilla', '🥬', 'Col forrajera (semilla)', 'Forage kale (seed)', 'seed', 5.0, 10.0, 17.0, 19.5, 5.3, 5.3, 6.8, 7.2, [S_MSSTATE_BRASSICA]),
  perennialPlanting('trebol-rosado', '☘️', 'Trébol rosado (semilla · perenne)', 'Red clover (seed · perennial)', 6.0, 12.0, 18.5, 19.5, 6.6, 6.6, 7.6, 8.2, [S_OSU_RED_CLOVER], 'seed'),

  // --- Berries adicionales (TASK L5 / pre-siembra v3.0.0) ---
  perennialPlanting('arandano-rojo', '🫐', 'Arándano rojo (plantación perenne)', 'Cranberry (perennial planting)', 7.0, 12.0, 18.0, 19.5, 4.6, 4.6, 5.0, 5.5, [S_UMASS_CRANBERRY_PH]),
  perennialPlanting('calafate', '🫐', 'Calafate (plantación perenne)', 'Calafate (perennial planting)', 5.0, 10.0, 16.0, 19.0, 5.0, 5.5, 6.8, 7.2, [S_INIA_CALAFATE_PH]),
  perennialPlanting('frambuesa', '🍓', 'Frambuesa (plantación perenne)', 'Raspberry (perennial planting)', 6.0, 11.0, 17.0, 19.5, 5.5, 5.8, 7.0, 7.2, [S_INIA_FRAMBUESA_PH]),
  perennialPlanting('grosella', '🫐', 'Grosella (plantación perenne)', 'Gooseberry (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.5, 5.5, 6.5, 6.8, [S_BC_RIBES]),
  perennialPlanting('maqui', '🫐', 'Maqui (plantación perenne)', 'Maqui berry (perennial planting)', 6.0, 11.0, 17.0, 19.5, 5.0, 5.3, 6.5, 7.0, [S_INFOR_MAQUI_PH]),
  perennialPlanting('michay', '🫐', 'Michay (plantación perenne)', 'Darwin\'s barberry (perennial planting)', 5.0, 10.0, 16.0, 19.0, 5.0, 5.5, 6.8, 7.2, [S_INIA_CALAFATE_PH]),
  perennialPlanting('mora', '🫐', 'Mora (plantación perenne)', 'Blackberry (perennial planting)', 7.0, 12.0, 18.0, 19.5, 5.5, 6.0, 6.5, 6.8, [S_NCSU_MORA_PH]),
  perennialPlanting('mosqueta', '🌹', 'Rosa mosqueta (plantación perenne)', 'Rosehip (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.5, 6.0, 6.5, 6.8, [S_FIA_MOSQUETA_PH]),
  perennialPlanting('murtilla', '🫐', 'Murtilla (plantación perenne)', 'Chilean guava (perennial planting)', 7.0, 12.0, 18.0, 19.5, 5.0, 5.6, 6.0, 6.2, [S_FIA_MURTILLA]),
  perennialPlanting('sauco', '🫐', 'Saúco (plantación perenne)', 'Elderberry (perennial planting)', 6.0, 11.0, 17.0, 19.5, 5.5, 5.5, 6.5, 6.8, [S_UVM_SAUCO_PH]),
  perennialPlanting('zarzaparrilla', '🫐', 'Zarzaparrilla roja (plantación perenne)', 'Redcurrant (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.5, 5.5, 6.5, 6.8, [S_BC_RIBES]),
  perennialPlanting('zarzaparrilla-negra', '🫐', 'Zarzaparrilla negra (plantación perenne)', 'Blackcurrant (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.5, 5.5, 6.5, 6.8, [S_BC_RIBES]),

  // --- Frutales adicionales (TASK L5 / pre-siembra v3.0.0) ---
  perennialPlanting('almendro', '🌰', 'Almendro (plantación perenne)', 'Almond (perennial planting)', 7.0, 11.0, 17.0, 19.5, 6.0, 6.4, 7.5, 7.8, [S_UCCE_ALMOND]),
  perennialPlanting('avellano', '🌰', 'Avellano europeo (plantación perenne)', 'Hazelnut (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.6, 5.6, 6.5, 7.0, [S_OSU_AVELLANO_PH]),
  perennialPlanting('caqui', '🍊', 'Caqui (plantación perenne)', 'Persimmon (perennial planting)', 7.0, 11.0, 17.0, 19.5, 5.8, 6.0, 6.5, 7.0, [S_NCSU_CAQUI_PH]),
  perennialPlanting('cerezo', '🍒', 'Cerezo (plantación perenne)', 'Sweet cherry (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.5, 7.5, [S_INIA_CEREZO_PH]),
  perennialPlanting('chirimoyo', '🍏', 'Chirimoyo (plantación perenne)', 'Cherimoya (perennial planting)', 20.5, 22.0, 28.0, 33.0, 6.0, 6.5, 7.6, 7.8, [S_CRFG_CHIRIMOYO_PH]),
  perennialPlanting('ciruelo', '🍑', 'Ciruelo (plantación perenne)', 'Plum (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('datilera', '🌴', 'Palmera datilera (plantación perenne)', 'Date palm (perennial planting)', 20.5, 24.0, 32.0, 38.0, 6.5, 7.0, 8.5, 8.5, [S_FAO_DATILERA_PH]),
  perennialPlanting('damasco', '🍑', 'Damasco (plantación perenne)', 'Apricot (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('duraznero', '🍑', 'Duraznero (plantación perenne)', 'Peach (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.5, 7.2, [S_UGA_DURAZNERO_PH]),
  perennialPlanting('feijoa', '🍏', 'Feijoa (plantación perenne)', 'Feijoa (perennial planting)', 20.5, 21.0, 27.0, 32.0, 5.5, 5.5, 7.0, 7.2, [S_CRFG_FEIJOA_PH]),
  perennialPlanting('granado', '🍎', 'Granado (plantación perenne)', 'Pomegranate (perennial planting)', 7.0, 12.0, 18.0, 19.5, 5.5, 5.5, 7.0, 7.8, [S_UF_GRANADO_PH]),
  perennialPlanting('guayabo', '🍏', 'Guayabo (plantación perenne)', 'Guava (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.0, 5.5, 7.0, 8.5, [S_UF_GUAYABO_PH]),
  perennialPlanting('guindo', '🍒', 'Guindo (plantación perenne)', 'Sour cherry (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('higuera', '🍐', 'Higuera (plantación perenne)', 'Fig (perennial planting)', 7.0, 12.0, 18.0, 19.5, 6.0, 6.0, 6.5, 7.8, [S_UGUAM_HIGUERA_PH]),
  perennialPlanting('kiwi', '🥝', 'Kiwi (plantación perenne)', 'Kiwifruit (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.5, 6.0, 7.0, 7.2, [S_COMITE_KIWI_PH]),
  perennialPlanting('kumquat', '🍊', 'Kumquat (plantación perenne)', 'Kumquat (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('lima', '🍋', 'Lima (plantación perenne)', 'Lime (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('limonero', '🍋', 'Limonero (plantación perenne)', 'Lemon (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('lucumo', '🟠', 'Lúcumo (plantación perenne)', 'Lucuma (perennial planting)', 20.5, 21.0, 27.0, 32.0, 6.0, 6.5, 7.5, 8.5, [S_FAO_LUCUMO_PH]),
  perennialPlanting('macadamia', '🌰', 'Macadamia (plantación perenne)', 'Macadamia (perennial planting)', 20.5, 21.0, 27.0, 32.0, 5.0, 5.5, 6.5, 6.5, [S_CTAHR_MACADAMIA_PH]),
  perennialPlanting('mandarino', '🍊', 'Mandarino (plantación perenne)', 'Mandarin (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('mango', '🥭', 'Mango (plantación perenne)', 'Mango (perennial planting)', 20.5, 23.0, 30.0, 35.0, 5.5, 5.5, 7.0, 7.2, [S_UF_MANGO_PH]),
  perennialPlanting('manzano', '🍎', 'Manzano (plantación perenne)', 'Apple (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.0, [S_CORNELL_APPLE]),
  perennialPlanting('maracuya', '🟡', 'Maracuyá (plantación perenne)', 'Passion fruit (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.8, 6.0, 7.5, 7.5, [S_UF_MARACUYA_PH]),
  perennialPlanting('membrillo', '🍐', 'Membrillo (plantación perenne)', 'Quince (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.2, [S_PSU_PERAL_PH]),
  perennialPlanting('naranjo', '🍊', 'Naranjo (plantación perenne)', 'Orange (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('nectarino', '🍑', 'Nectarino (plantación perenne)', 'Nectarine (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 6.5, 7.2, [S_UIUC_NECTARINO_PH]),
  perennialPlanting('nispero', '🟠', 'Níspero (plantación perenne)', 'Loquat (perennial planting)', 20.5, 21.0, 27.0, 32.0, 5.8, 6.0, 6.5, 7.2, [S_CLEMSON_NISPERO_PH]),
  perennialPlanting('nogal', '🌰', 'Nogal (plantación perenne)', 'Walnut (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.5, 7.5, [S_UCCE_NOGAL_PH]),
  perennialPlanting('olivo', '🫒', 'Olivo (plantación perenne)', 'Olive (perennial planting)', 20.5, 21.0, 28.0, 34.0, 5.5, 5.5, 7.5, 8.5, [S_INIA_OLIVO_PH]),
  perennialPlanting('papayo', '🍈', 'Papayo chileno (plantación perenne)', 'Mountain papaya (perennial planting)', 20.5, 21.0, 26.0, 31.0, 5.5, 6.0, 6.5, 7.0, [S_CRFG_PAPAYO_PH], 'perennial_planting',
    conventions(SIN_FILA_TERMICA, {
      es: 'la banda de pH: la fuente es la ficha del chirimoyo, porque CRFG no publica una del papayo',
      en: 'the pH band: the source is the cherimoya factsheet, because CRFG publishes none for mountain papaya',
    })),
  perennialPlanting('pecana', '🌰', 'Pecana (plantación perenne)', 'Pecan (perennial planting)', 7.0, 12.0, 18.0, 19.5, 6.0, 6.0, 6.5, 7.2, [S_UGA_PECANA_PH]),
  perennialPlanting('pera-asiatica', '🍐', 'Pera asiática (plantación perenne)', 'Asian pear (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.0, [S_PSU_PERAL_PH]),
  perennialPlanting('peral', '🍐', 'Peral (plantación perenne)', 'Pear (perennial planting)', 6.0, 10.0, 16.0, 19.0, 5.8, 6.0, 6.5, 7.0, [S_PSU_PERAL_PH]),
  perennialPlanting('pistacho', '🌰', 'Pistacho (plantación perenne)', 'Pistachio (perennial planting)', 7.0, 12.0, 18.0, 19.5, 6.0, 6.0, 7.5, 7.8, [S_UCCE_PISTACHO_PH]),
  perennialPlanting('pluot', '🍑', 'Pluot (plantación perenne)', 'Pluot (perennial planting)', 6.0, 10.0, 16.0, 19.0, 6.0, 6.0, 7.0, 7.5, [S_UNH_STONE_FRUIT]),
  perennialPlanting('pomelo', '🍊', 'Pomelo (plantación perenne)', 'Grapefruit (perennial planting)', 20.5, 22.0, 29.0, 34.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('tangelo', '🍊', 'Tangelo (plantación perenne)', 'Tangelo (perennial planting)', 20.5, 21.0, 28.0, 33.0, 5.8, 5.8, 6.5, 7.0, [S_UF_CITRUS]),
  perennialPlanting('tumbo', '🟡', 'Tumbo (plantación perenne)', 'Banana passionfruit (perennial planting)', 20.5, 21.0, 26.0, 31.0, 5.8, 6.0, 7.5, 7.5, [S_UF_MARACUYA_PH]),

  // --- Árboles forestales (TASK L5 / pre-siembra v3.0.0) ---
  perennialPlanting('eucalipto', '🌳', 'Eucalipto (plantación forestal)', 'Eucalyptus (forestry planting)', 6.0, 11.0, 17.0, 19.5, 5.0, 5.0, 6.5, 7.0, [S_INFOR_EUCALIPTO_PH]),
  perennialPlanting('pino-radiata', '🌲', 'Pino radiata (plantación forestal)', 'Monterey pine (forestry planting)', 5.0, 10.0, 16.0, 19.0, 4.6, 4.6, 6.0, 6.5, [S_INFOR_PINO_PH]),
];

/** Techo cauteloso para perfiles cuyo máximo térmico no está tabulado (apio: requiere noches de 70 °F y días de 85 °F en S10). */
const UNDOCUMENTED_MAX_FALLBACK_C = fahrenheitToCelsius(85);

/**
 * Distancia euclidiana normalizada desde `(reading.temp, reading.ph)` al centro de `(tempOpt, phOpt)`.
 * Permite ordenar dentro de cada nivel de coincidencia los cultivos cuyo centro óptimo está más
 * cerca del suelo medido, en vez de ordenar sólo alfabéticamente.
 */
function computeOptimalDistance(reading: SoilMeasurement, profile: PrePlantingProfile): number {
  const phCenter = (profile.phOpt.min + profile.phOpt.max) / 2;
  const phHalfSpan = Math.max(0.25, (profile.phOpt.max - profile.phOpt.min) / 2);
  const phNorm = Math.abs(reading.ph - phCenter) / phHalfSpan;
  if (!profile.tempOpt) {
    return Math.round(phNorm * 10000) / 10000;
  }
  const tempCenter = (profile.tempOpt.min + profile.tempOpt.max) / 2;
  const tempHalfSpan = Math.max(1.5, (profile.tempOpt.max - profile.tempOpt.min) / 2);
  const tempNorm = Math.abs(reading.temp - tempCenter) / tempHalfSpan;
  return Math.round(Math.hypot(tempNorm, phNorm) * 10000) / 10000;
}

/**
 * Evalúa qué perfiles de pre-siembra coinciden con la temperatura y el pH medidos,
 * cruzando además humedad extrema de cama de siembra, sensibilidad salina FAO 29 ante CE alta
 * y riesgos meteorológicos próximos (`C04` helada y `C06` lluvia intensa).
 *
 * Orden determinista e independiente del orden del arreglo (T03):
 * 1. Establecimiento anual de ciclo corto antes que evaluación parcial de perennes (T42).
 * 2. Coincidencia dentro de rangos óptimos antes que coincidencia con limitaciones.
 * 3. Perfiles con parámetros térmicos completos antes que perfiles con parámetros faltantes (T18).
 * 4. Menor distancia normalizada al centro óptimo `(tempOpt, phOpt)` (`optimalDistance`).
 * 5. Desempate alfabético estable por `profileId`.
 */
export function evaluatePrePlantingOptions(
  reading: SoilMeasurement,
  language: AppLanguage = 'es',
  profiles: readonly PrePlantingProfile[] = PRE_PLANTING_PROFILES,
  weather?: CurrentWeather | null,
): PrePlantingOption[] {
  const valid = (['temp', 'ph'] as const).every(
    key => Number.isFinite(reading[key]) && reading[key] >= LOCAL_VARIABLES[key].min && reading[key] <= LOCAL_VARIABLES[key].max,
  );
  if (!valid) return [];
  const en = language === 'en';
  const weatherDays = weather ? [...(weather.today ? [weather.today] : []), ...(weather.forecast ?? [])] : [];
  const hasUpcomingFrost = weatherDays.some(
    day => typeof day.minimumTemperatureC === 'number' && Number.isFinite(day.minimumTemperatureC) && day.minimumTemperatureC <= 0,
  );
  const hasUpcomingHeavyRain = weatherDays.some(
    day => typeof day.precipitationMm === 'number' && Number.isFinite(day.precipitationMm) && day.precipitationMm >= 15,
  );
  const extremeSeedbedMoisture =
    Number.isFinite(reading.vwc) && (reading.vwc < 6 || reading.vwc >= 60);
  const highBulkEc = Number.isFinite(reading.ec) && reading.ec > 1500;

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

    if (extremeSeedbedMoisture) {
      limitationCodes.push('seedbed_moisture_limitation');
      reasons.push(
        reading.vwc < 5
          ? (en
              ? 'Seedbed volumetric moisture is below 5%; irrigate before sowing or transplanting and recheck pH once the soil is moist (galvanic pH contact is limited below 5% VWC).'
              : 'Humedad volumétrica de la cama de siembra bajo 5 %; riega antes de sembrar o trasplantar y vuelve a medir el pH con suelo húmedo (bajo 5 % de humedad el puente electrolítico del pH se reduce).')
          : reading.vwc < 6
            ? (en
                ? 'Seedbed volumetric moisture is extremely low (< 6%); irrigate before sowing or transplanting.'
                : 'Humedad volumétrica de la cama de siembra extremadamente baja (< 6 %); riega antes de sembrar o trasplantar.')
            : (en
                ? 'Seedbed volumetric moisture is saturated (>= 60%); wait for drainage before sowing or planting.'
                : 'Humedad volumétrica de la cama de siembra saturada (>= 60 %); espera a que drene antes de sembrar o plantar.'),
      );
    }

    if (highBulkEc) {
      const saltCriterion = SPECIES_RULES[profile.speciesId]?.criteria.find(
        (c): c is SpeciesSalinityCriterion => c.kind === 'salinity_reference',
      );
      if (saltCriterion?.rating === 'sensitive') {
        limitationCodes.push('salinity_sensitive_reference');
        reasons.push(
          en
            ? 'Species classified as salt-sensitive in FAO 29; verify saturated-paste EC before planting given the high bulk EC reading.'
            : 'Especie clasificada como sensible a la salinidad en FAO 29; verifica la CE en extracto de saturación ante la lectura alta de CE aparente.',
        );
      }
    }

    if (hasUpcomingFrost && profile.tempMin >= 10) {
      limitationCodes.push('upcoming_frost_risk');
      reasons.push(
        en
          ? '5-day forecast includes frost (<= 0 °C); delay outdoor sowing or transplanting of this warm-season crop until the frost passes.'
          : 'El pronóstico de 5 días incluye helada (<= 0 °C); posterga la siembra o el trasplante al aire libre hasta que pase el evento.',
      );
    }

    if (hasUpcomingHeavyRain && profile.establishment === 'seed') {
      limitationCodes.push('upcoming_heavy_rain');
      reasons.push(
        en
          ? '5-day forecast includes heavy rain (>= 15 mm/day), which can crust the seedbed or wash out direct-seeded rows.'
          : 'El pronóstico de 5 días incluye lluvia intensa (>= 15 mm/día), que puede encostrar la cama de siembra o arrastrar semilla directa.',
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
    const speciesEntry = findSpecies(profile.speciesId);
    const optimalDistance = computeOptimalDistance(reading, profile);

    matched.push({
      profileId: profile.id,
      speciesId: profile.speciesId,
      ...(speciesEntry ? { group: speciesEntry.group } : {}),
      label: `${profile.emoji} ${name}`,
      establishment: profile.establishment,
      scope: profile.scope,
      classification,
      optimalDistance,
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
      const distOrder = a.optimalDistance - b.optimalDistance;
      if (Math.abs(distOrder) > 1e-6) return distOrder;
      return a.profileId.localeCompare(b.profileId);
    })
    .map(({ declaredGap: _declaredGap, ...option }) => option);
}

/** Lista de etiquetas sugeridas en pre-siembra para mostrar al agricultor. */
export function suggestPrePlantingCrops(
  reading: SoilMeasurement,
  language: AppLanguage = 'es',
  weather?: CurrentWeather | null,
): string[] {
  return evaluatePrePlantingOptions(reading, language, PRE_PLANTING_PROFILES, weather).map(option => option.label);
}

