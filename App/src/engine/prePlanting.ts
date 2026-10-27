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

export const PRE_PLANTING_VERSION = '1.0.0';

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

const f = fahrenheitToCelsius;

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
        originalValue: 'Vitis vinifera optimum pH 6.0–7.0 (tolerates up to 7.8); root growth starts at 10 °C',
      },
    ],
  },
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
  const matched: (PrePlantingOption & { incomplete: boolean })[] = [];

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

    const classification: PrePlantingClassification =
      profile.scope === 'short_term_establishment' && !incomplete && tempInOpt && phInOpt
        ? 'matches_evaluated_criteria'
        : 'has_limitations';

    const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', en ? '.' : ',');
    const sources = [...new Set(profile.evidence.map(e => en ? e.institution : `${e.institution} (${e.section})`))].join('; ');
    const technicalSummary = en
      ? `Reference: soil temperature ${fmt(profile.tempMin)} to ${profile.tempMax !== null ? `${fmt(profile.tempMax)} °C` : 'no fixed maximum'} (optimum ${profile.tempOpt ? `${fmt(profile.tempOpt.min)}–${fmt(profile.tempOpt.max)} °C` : 'not tabulated'}); pH ${fmt(profile.phMin)} to ${fmt(profile.phMax)} (target ${fmt(profile.phOpt.min)}–${fmt(profile.phOpt.max)}). Sources: ${sources}.`
      : `Referencia: temperatura ${fmt(profile.tempMin)} a ${profile.tempMax !== null ? `${fmt(profile.tempMax)} °C` : 'sin máximo fijo'} (óptimo ${profile.tempOpt ? `${fmt(profile.tempOpt.min)}–${fmt(profile.tempOpt.max)} °C` : 'no tabulado'}); pH ${fmt(profile.phMin)} a ${fmt(profile.phMax)} (objetivo ${fmt(profile.phOpt.min)}–${fmt(profile.phOpt.max)}). Fuentes: ${sources}.`;
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
      incomplete,
    });
  }

  return matched
    .sort((a, b) => {
      const scopeOrder = (a.scope === 'short_term_establishment' ? 0 : 1) - (b.scope === 'short_term_establishment' ? 0 : 1);
      if (scopeOrder !== 0) return scopeOrder;
      const classOrder = (a.classification === 'matches_evaluated_criteria' ? 0 : 1) - (b.classification === 'matches_evaluated_criteria' ? 0 : 1);
      if (classOrder !== 0) return classOrder;
      const incompleteOrder = (a.incomplete ? 1 : 0) - (b.incomplete ? 1 : 0);
      if (incompleteOrder !== 0) return incompleteOrder;
      return a.profileId.localeCompare(b.profileId);
    })
    .map(({ incomplete: _incomplete, ...option }) => option);
}

/** Lista de etiquetas sugeridas en pre-siembra para mostrar al agricultor. */
export function suggestPrePlantingCrops(reading: SoilMeasurement, language: AppLanguage = 'es'): string[] {
  return evaluatePrePlantingOptions(reading, language).map(option => option.label);
}

