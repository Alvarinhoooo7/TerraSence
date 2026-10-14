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
 *
 * Familias: pH del suelo (lectura de la sonda), umbrales de una lectura del equipo
 * (temperatura de suelo, humedad del aire), extremos diarios de temperatura del aire
 * del pronóstico (helada, frío, calor) y episodios del pronóstico (lluvia, niebla).
 * Las dos primeras se evalúan con la captura; las del pronóstico, cuando llega el clima.
 */
import type { PhenologicalStage } from '../types/app';
import type { AgronomicAlert, LocalVariable, SoilMeasurement } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';

/** Versión del conjunto de criterios; cambia cuando se agrega, corrige o retira uno. */
export const SPECIES_RULES_VERSION = '2.1.0';

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

interface SpeciesCriterionBase {
  state: SpeciesCriterionState;
  /** Etapas de medición en que este criterio se evalúa. */
  stages: readonly PhenologicalStage[];
  note: string;
  noteEn: string;
  /** Qué no está documentado o qué contexto limita el criterio; nunca se omite. */
  limitations: string;
  limitationsEn: string;
  /** Al menos una fuente; varias cuando se combinan o se contrastan. */
  evidence: readonly SpeciesCriterionEvidence[];
}

/**
 * pH del suelo para una especie. Distingue dos cosas que las fuentes también distinguen:
 * el óptimo u objetivo (orienta, no alarma) y los límites donde la fuente documenta un
 * problema o una corrección (sólo cruzarlos genera advertencia). Un límite que la fuente
 * no documenta queda en `null`: nunca se rellena con el de otra especie (§7.2).
 */
export interface SpeciesPhCriterion extends SpeciesCriterionBase {
  kind: 'ph';
  /** Intervalo óptimo; `min === max` cuando la fuente da un único valor objetivo. */
  optimum: { min: number; max: number };
  /** Bajo este valor la fuente documenta un problema o indica corregir. */
  lowerLimit: number | null;
  /** Sobre este valor la fuente documenta un problema o indica corregir. */
  upperLimit: number | null;
}

/**
 * Umbral en la unidad interna (°C o %). Cuando la fuente usa °F se conserva su valor y la
 * conversión es `(°F − 32) × 5/9` redondeada a 0,1 °C. `frost_definition` marca el único
 * umbral que no viene de la fuente: 0 °C como definición física de helada, usado cuando la
 * fuente dice «sensible a helada» sin dar una temperatura.
 */
export interface SpeciesThreshold {
  value: number;
  basis: 'source' | 'frost_definition';
  sourceValue?: { value: number; unit: '°F' };
}

export type SpeciesComparison = 'below' | 'at_or_below' | 'above' | 'at_or_above';

/** Gravedad cuando la condición se cumple: `danger` sólo si la fuente documenta muerte o daño grave. */
export type SpeciesSeverity = 'danger' | 'warning' | 'info';

interface SpeciesConditionCriterion extends SpeciesCriterionBase {
  severity: SpeciesSeverity;
  /** Lo que documenta la fuente cuando se cumple la condición; encabeza el título. */
  effect: string;
  effectEn: string;
  /**
   * Qué significa y qué conviene hacer, en lenguaje simple: es el texto que lee el
   * agricultor. Las cifras de la fuente, sus limitaciones y la cita van al detalle técnico.
   */
  advice: string;
  adviceEn: string;
}

/**
 * Extremo diario de temperatura del aire del pronóstico: mínima (helada, frío) o máxima
 * (calor). Varios criterios del mismo extremo describen grados de un mismo riesgo; sólo se
 * informa el más extremo que se cumple, para no contar dos veces el mismo episodio (T44).
 */
export interface SpeciesAirTemperatureCriterion extends SpeciesConditionCriterion {
  kind: 'air_temperature';
  extreme: 'minimum' | 'maximum';
  comparison: SpeciesComparison;
  threshold: SpeciesThreshold;
}

/** Lectura puntual del equipo: temperatura de suelo de la sonda o humedad del aire del BME280. */
export interface SpeciesReadingCriterion extends SpeciesConditionCriterion {
  kind: 'reading';
  variable: Extract<LocalVariable, 'temp' | 'airHumidity'>;
  comparison: SpeciesComparison;
  threshold: SpeciesThreshold;
}

/**
 * Episodio del pronóstico que la fuente documenta como perjudicial en la etapa. Las fuentes
 * no fijan cantidades: un día cuenta con lluvia según `isRainyDay` (weatherOutlook.ts), que
 * es un criterio de planificación de la app, y así se declara en el resultado.
 */
export interface SpeciesWeatherEventCriterion extends SpeciesConditionCriterion {
  kind: 'weather_event';
  event: 'rain' | 'fog';
}

/**
 * Tolerancia a sales documentada para la especie. Es una referencia, no una comparación:
 * la fuente mide la conductividad en extracto saturado (ECe) y la sonda no, así que la
 * lectura nunca se clasifica con este umbral (T13); sólo se informa la tolerancia.
 */
export interface SpeciesSalinityCriterion extends SpeciesCriterionBase {
  kind: 'salinity_reference';
  rating: 'sensitive' | 'moderately_sensitive' | 'moderately_tolerant' | 'tolerant';
  /** ECe (dS/m a 25 °C) hasta el cual la fuente no documenta pérdida de rendimiento; `null` si sólo da la clase. */
  thresholdEce: number | null;
}

/**
 * Sensibilidad del rendimiento a la falta de agua en el período que corresponde a la etapa
 * (factor ky de FAO). Es cualitativa: sin textura, la humedad medida no dice si falta agua,
 * así que no se compara con la lectura; sólo señala que la etapa es crítica para el riego.
 */
export interface SpeciesWaterCriterion extends SpeciesCriterionBase {
  kind: 'water_sensitivity';
  ky: number;
  /** Período de la fuente al que corresponde la etapa de la app. */
  period: 'vegetative' | 'flowering';
}

export type SpeciesCriterion = SpeciesPhCriterion | SpeciesAirTemperatureCriterion | SpeciesReadingCriterion | SpeciesWeatherEventCriterion
  | SpeciesSalinityCriterion | SpeciesWaterCriterion;

/**
 * Forma de establecimiento a la que se refieren los criterios (§7.2). Las tablas de
 * hortalizas no distinguen semilla, almácigo ni trasplante; las de frutales y berries
 * describen plantaciones establecidas.
 */
export type SpeciesEstablishment = 'not_specified' | 'established_plantation';

export interface SpeciesRuleProfile {
  /** == `SpeciesEntry.id` de speciesCatalog.ts. */
  speciesId: string;
  /** Anual o perenne con evaluación parcial de suelo/clima (§7.1, T42). */
  horizon: 'annual' | 'perennial_partial';
  establishment: SpeciesEstablishment;
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

const annual = (speciesId: string, ...criteria: (SpeciesCriterion | readonly SpeciesCriterion[])[]): SpeciesRuleProfile =>
  ({ speciesId, horizon: 'annual', establishment: 'not_specified', criteria: criteria.flat() });
const perennial = (speciesId: string, ...criteria: (SpeciesCriterion | readonly SpeciesCriterion[])[]): SpeciesRuleProfile =>
  ({ speciesId, horizon: 'perennial_partial', establishment: 'established_plantation', criteria: criteria.flat() });

// --- Umbrales y constructores de criterios de condición --------------------------------

/** °F a °C con un decimal, la única conversión que se aplica a una cifra de una fuente. */
export const fahrenheitToCelsius = (f: number) => Math.round(((f - 32) * 5 / 9) * 10) / 10;
const fromF = (f: number): SpeciesThreshold => ({ value: fahrenheitToCelsius(f), basis: 'source', sourceValue: { value: f, unit: '°F' } });
const celsius = (value: number): SpeciesThreshold => ({ value, basis: 'source' });
const percent = celsius;
/** 0 °C como definición física de helada, cuando la fuente no da una temperatura. */
const FROST: SpeciesThreshold = { value: 0, basis: 'frost_definition' };

const ALL_STAGES: PhenologicalStage[] = ['vegetativo', 'floracion', 'cosecha'];

type ConditionText = Pick<SpeciesConditionCriterion,
  'severity' | 'effect' | 'effectEn' | 'advice' | 'adviceEn' | 'note' | 'noteEn' | 'limitations' | 'limitationsEn' | 'evidence'>;

const airMin = (stages: readonly PhenologicalStage[], comparison: SpeciesComparison, threshold: SpeciesThreshold, text: ConditionText): SpeciesAirTemperatureCriterion =>
  ({ kind: 'air_temperature', state: 'enabled', stages, extreme: 'minimum', comparison, threshold, ...text });
const airMax = (stages: readonly PhenologicalStage[], comparison: 'above' | 'at_or_above', threshold: SpeciesThreshold, text: ConditionText): SpeciesAirTemperatureCriterion =>
  ({ kind: 'air_temperature', state: 'enabled', stages, extreme: 'maximum', comparison, threshold, ...text });
const weatherEvent = (stages: readonly PhenologicalStage[], event: 'rain' | 'fog', text: ConditionText): SpeciesWeatherEventCriterion =>
  ({ kind: 'weather_event', state: 'enabled', stages, event, ...text });
const readingBelow = (stages: readonly PhenologicalStage[], variable: 'temp' | 'airHumidity', comparison: 'below' | 'at_or_below', threshold: SpeciesThreshold, text: ConditionText): SpeciesReadingCriterion =>
  ({ kind: 'reading', state: 'enabled', stages, variable, comparison, threshold, ...text });

// --- Fuentes de tolerancia a helada de hortalizas ----------------------------------------

const NEBRASKA_CLASS = {
  veryHardy: 'Very hardy: Can withstand freezing temperatures and hard frost (less than 28° F) for short periods without injury.',
  tolerant: 'Frost tolerant: Can withstand light frosts (28 - 32° F) without injury.',
  tender: 'Tender: Injury or killed by frost (28 - 32° F).',
} as const;

/** Nebraska Extension: lista de hortalizas por tolerancia al frío. */
const nebraska = (group: keyof typeof NEBRASKA_CLASS, crop: string): SpeciesCriterionEvidence => ({
  institution: 'Nebraska Extension (University of Nebraska–Lincoln)',
  title: 'Frost – Cold Temperatures Bring an End to the Gardening Season (S. Browning, 2023)',
  url: 'https://lancaster.unl.edu/frost-cold-temperatures-bring-end-gardening-season/',
  section: 'Clasificación de hortalizas por tolerancia al frío: «Very hardy», «Frost tolerant» y «Tender»',
  consultedAt: '2026-10-14',
  originalValue: `${NEBRASKA_CLASS[group]} Crop listed: ${crop}`,
});

const SDSU_CLASS = {
  none: 'No Frost Tolerance: The following vegetables are not cold tolerant, and they should be protected from frost or harvested before even a light frost. (Light freezes: 28 to 32 degrees Fahrenheit.)',
  light: 'Light Frost Tolerance: Crops from more-temperate regions can withstand light freezes (28 to 32 degrees Fahrenheit).',
  hardy: 'Frost Hardy: cole crops, which can tolerate moderate freezes (24 to 28 degrees Fahrenheit).',
} as const;

/** South Dakota State University Extension: tolerancia a heladas de otoño de hortalizas. */
const sdsu = (group: keyof typeof SDSU_CLASS, crop: string): SpeciesCriterionEvidence => ({
  institution: 'South Dakota State University Extension',
  title: 'Fall Frost Tolerance of Common Vegetables (R. Burrows, actualizado en 2023)',
  url: 'https://extension.sdstate.edu/fall-frost-tolerance-common-vegetables',
  section: '«No Frost Tolerance», «Light Frost Tolerance» y «Frost Hardy»',
  consultedAt: '2026-10-14',
  originalValue: `${SDSU_CLASS[group]} Crop listed: ${crop}`,
});

/** Colorado State University Extension: clasificación de siembra que contrasta apio. */
const CSU_CELERY: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Extension',
  title: 'Vegetable Planting Guide (CMG GardenNotes #720, revisado en 2024)',
  url: 'https://extension.colostate.edu/resource/vegetable-planting-guide/',
  section: '«Warm Season Vegetables», «Tender Vegetables»',
  consultedAt: '2026-10-14',
  originalValue: 'Tender Vegetables. Crops: beans, celery, corn, cucumbers, New Zealand spinach, summer squash. Tender vegetables grow with a daytime temperature above 55°F and are intolerant of frost.',
};

const WISCONSIN_ALLIUMS: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Extension',
  title: 'Growing onions, garlic, leeks, and other alliums in Wisconsin (A3785)',
  url: 'https://hort.extension.wisc.edu/files/2023/10/A3785-Growing-Onions-Garlic-Leeks-and-Other-Alliums-in-Wisconsin-KA-Delahaut-and-AC-Newenhouse.pdf',
  section: '«Onions», tipos de cebolla',
  consultedAt: '2026-10-14',
  originalValue: 'Green onions are actually immature true onions. Japanese bunching onions (Allium fistulosum) are similar to scallions in that they do not form bulbs. They are very hardy and can be seeded in late summer to be overwintered and harvested in spring.',
};

const SDSU_LEEKS: SpeciesCriterionEvidence = {
  institution: 'South Dakota State University Extension',
  title: 'Leeks: Harvest and Storage (D. Kohn, actualizado en 2025)',
  url: 'https://extension.sdstate.edu/leeks-harvest-and-storage',
  section: '«When to Harvest Leeks» y «On-farm Storage of Leeks»',
  consultedAt: '2026-10-14',
  originalValue: 'Harvest can be delayed until after the first few frosts. If temperatures start to go below 20 degrees Fahrenheit, mulch the mounds of leeks to protect them.',
};

const IOWA_ASPARAGUS: SpeciesCriterionEvidence = {
  institution: 'Iowa State University Extension and Outreach',
  title: 'Harvesting Asparagus (R. Jauron, 2018)',
  url: 'https://yardandgarden.extension.iastate.edu/article/2018/03/harvesting-asparagus',
  section: 'Cosecha de turiones en primavera',
  consultedAt: '2026-10-14',
  originalValue: 'Tender spears are sensitive to frost damage; so in early spring it\'s advisable to cut the spears prior to the 8-inch height.',
};

const POTATO_FROST: SpeciesCriterionEvidence = {
  institution: 'Universidad Nacional de Trujillo (revista Scientia Agropecuaria)',
  title: 'Tolerancia de papas nativas (Solanum spp.) a heladas en el contexto de cambio climático (Marmolejo y Ruiz, 2018, vol. 9, n.° 3)',
  url: 'https://www.scielo.org.pe/scielo.php?script=sci_arttext&pid=S2077-99172018000300010',
  section: 'Introducción',
  consultedAt: '2026-10-14',
  originalValue: 'El cultivo de papa (Solanum tuberosum L.) es significativamente afectado por heladas, la mayoría de las variedades cultivadas son sensibles a temperaturas inferiores a -2.5 C, causando daños visibles a nivel foliar',
};

const FROST_SCOPE = 'Clasificación de INIA para hortalizas al aire libre; las temperaturas provienen de extensión agrícola de Estados Unidos. Plántulas recién establecidas pueden ser más sensibles, y la duración de la helada también influye.';
const FROST_SCOPE_EN = 'INIA classification for outdoor vegetables; temperatures come from US agricultural extension. Newly established seedlings may be more sensitive, and frost duration also matters.';

/** Hortaliza sin tolerancia a helada: advertencia con mínima de 0 °C (32 °F) o menos. */
const frostTender = (evidence: SpeciesCriterionEvidence[], extra = '', extraEn = ''): SpeciesAirTemperatureCriterion =>
  airMin(ALL_STAGES, 'at_or_below', fromF(32), {
    severity: 'warning',
    effect: 'Helada prevista: esta especie no la tolera',
    effectEn: 'Frost forecast: this species does not tolerate it',
    advice: 'Una helada puede quemar o matar las plantas. Si puedes, protégelas esa noche (por ejemplo, con una cubierta) o cosecha antes lo que ya esté listo.',
    adviceEn: 'A frost can burn or kill the plants. If you can, protect them that night (for example, with a cover) or harvest what is ready beforehand.',
    note: 'Las fuentes la clasifican como sensible a helada: se daña o muere con heladas de 28 a 32 °F (−2,2 a 0 °C). Indican protegerla o cosechar lo que esté listo antes incluso de una helada leve.',
    noteEn: 'Sources classify it as frost-sensitive: it is injured or killed by frosts of 28 to 32 °F (−2.2 to 0 °C). They advise protecting it or harvesting what is ready before even a light frost.',
    limitations: `${FROST_SCOPE}${extra ? ` ${extra}` : ''}`,
    limitationsEn: `${FROST_SCOPE_EN}${extraEn ? ` ${extraEn}` : ''}`,
    evidence,
  });

/**
 * Hortaliza que tolera helada leve hasta `downToF`: una helada dentro de ese margen es
 * información; bajo ese mínimo, que todas las fuentes consultadas documentan, es advertencia.
 */
const frostTolerant = (downToF: number, evidence: SpeciesCriterionEvidence[], extra = '', extraEn = '',
  stages: readonly PhenologicalStage[] = ALL_STAGES): SpeciesAirTemperatureCriterion[] => {
  const c = fahrenheitToCelsius(downToF);
  const es = decimal(c, 'es'), en = decimal(c, 'en');
  const limitations = `${FROST_SCOPE}${extra ? ` ${extra}` : ''}`;
  const limitationsEn = `${FROST_SCOPE_EN}${extraEn ? ` ${extraEn}` : ''}`;
  return [
    airMin(stages, 'at_or_below', FROST, {
      severity: 'info',
      effect: 'Helada leve prevista, dentro de lo que tolera esta especie',
      effectEn: 'Light frost forecast, within what this species tolerates',
      advice: 'Este cultivo resiste una helada leve, así que no debería dañarse. Revísalo después de la helada.',
      adviceEn: 'This crop withstands a light frost, so it should not be damaged. Check it after the frost.',
      note: `Las fuentes documentan que tolera heladas hasta ${downToF} °F (${es} °C) sin daño.`,
      noteEn: `Sources document that it tolerates frost down to ${downToF} °F (${en} °C) without injury.`,
      limitations, limitationsEn, evidence,
    }),
    airMin(stages, 'below', fromF(downToF), {
      severity: 'warning',
      effect: `Helada más fuerte de lo que este cultivo resiste (${es} °C)`,
      effectEn: `Frost harder than this crop withstands (${en} °C)`,
      advice: `Bajo ${es} °C este cultivo puede dañarse. Si puedes, protégelo esa noche o cosecha antes lo que ya esté listo.`,
      adviceEn: `Below ${en} °C this crop can be damaged. If you can, protect it that night or harvest what is ready beforehand.`,
      note: `Bajo ${downToF} °F (${es} °C) las fuentes consultadas ya no documentan tolerancia. Revisa la protección del cultivo o cosecha lo que esté listo.`,
      noteEn: `Below ${downToF} °F (${en} °C) the sources consulted no longer document tolerance. Review crop protection or harvest what is ready.`,
      limitations, limitationsEn, evidence,
    }),
  ];
};

// --- Fuentes chilenas de helada en hortalizas y olivo ------------------------------------

const INIA_165_GROUPS = {
  none: '4.3.1. Especies que no toleran heladas: albahaca, ají, berenjena, camote, maíz, melón, papa, pepino, pepino dulce, pimiento, poroto verde y granado, sandía, tomate, zapallo, zapallito italiano. Algunas, como el tomate, son capaces de tolerar hasta -2ºC por un corto tiempo, mientras que otras como pepino dulce, sandía y melón no son capaces de tolerar 0ºC.',
  weak: '4.3.2. Especies que toleran heladas débiles: acelga, betarraga, espinaca, brócoli, rábano, repollo, repollito de Bruselas, zanahoria.',
  maturity: '4.3.3. Especies que se dañan cerca de madurez: también tienen un grado de tolerancia a las heladas, pero se dañan más fácilmente cuando se encuentran en un estado de desarrollo cercano a la cosecha. Este daño habitualmente afecta a la calidad del producto cosechado, pero en algunos casos puede perderse la producción: alcachofa, apio, arveja, coliflor, haba, lechuga.',
  tolerant: '4.3.4. Especies que toleran heladas: ajo, cebollas, cebollines, chalota y puerro.',
  flowering: '4.2. Aborto floral: de especial importancia en habas y arvejas que se encuentran en floración.',
} as const;

/** INIA Intihuasi, Boletín 165: sensibilidad de las hortalizas a las heladas. */
const inia165 = (group: keyof typeof INIA_165_GROUPS): SpeciesCriterionEvidence => ({
  institution: 'INIA Intihuasi',
  title: 'Efectos de las heladas en la agricultura (Boletín INIA N° 165, 2007)',
  url: 'https://biblioteca.inia.cl/items/475bd934-243f-4f91-8e24-ec7b98eed311',
  section: '4.2 «Efecto de las heladas en las hortalizas» y 4.3 «Sensibilidad de las hortalizas a las heladas», pp. 41–44',
  consultedAt: '2026-10-14',
  originalValue: INIA_165_GROUPS[group],
});

const INIA_1998_FROST: SpeciesCriterionEvidence = {
  institution: 'INIA Intihuasi',
  title: 'Manual de producción de hortalizas (INDAP-PRODECOP e INIA Intihuasi, 1998)',
  url: 'https://biblioteca.inia.cl/items/16f6bd25-6b1c-4973-8be7-dfa23d2ee52f',
  section: 'Requerimientos de clima: temperaturas críticas y heladas',
  consultedAt: '2026-10-14',
  originalValue: 'La helada ocurre cuando se registran temperaturas inferiores a 0ºC en el cobertizo meteorológico, lo que comúnmente da una medida un poco más alta de la que ocurre a nivel de superficie del suelo. Toleran heladas débiles: espinaca, repollo, brócoli, repollo de Bruselas, betarraga. Se dañan cerca de la madurez: coliflor, alcachofa, lechuga, arveja, apio, zanahoria, acelga, perejil. Toleran heladas: cebolla, ajo, puerro, espárrago. No toleran heladas: todas las de verano.',
};

const INIA_165_OLIVE: SpeciesCriterionEvidence = {
  institution: 'INIA Intihuasi',
  title: 'Efectos de las heladas en la agricultura (Boletín INIA N° 165, 2007)',
  url: 'https://biblioteca.inia.cl/items/475bd934-243f-4f91-8e24-ec7b98eed311',
  section: '3.2.4 «Olivos», p. 32',
  consultedAt: '2026-10-14',
  originalValue: 'Temperaturas de 0ºC a -5ºC provocan pequeñas heridas en brotes y ramas jóvenes. Heladas severas de -5ºC a -10ºC pueden tener como consecuencia la muerte de brotes y ramas. Durante el período de crecimiento y maduración del fruto, temperaturas inferiores a 0ºC lo dañan, disminuyendo la producción y la calidad del aceite obtenido.',
};

/**
 * Especie que INIA describe como tolerante a algo de helada pero que se daña cerca de la
 * cosecha: en cosecha cualquier helada (bajo 0 °C, la definición de INIA) es advertencia.
 */
const frostNearMaturity = (extra = '', extraEn = ''): SpeciesAirTemperatureCriterion =>
  airMin(['cosecha'], 'below', celsius(0), {
    severity: 'warning',
    effect: 'Helada cerca de la cosecha: esta especie se daña con más facilidad',
    effectEn: 'Frost near harvest: this species is damaged more easily',
    advice: 'Cerca de la cosecha este cultivo se daña más fácil con la helada y puede perder calidad. Si ya está listo, considera cosecharlo antes.',
    adviceEn: 'Near harvest this crop is damaged more easily by frost and can lose quality. If it is ready, consider harvesting before the frost.',
    note: 'INIA indica que esta especie tolera algo de helada, pero se daña con más facilidad cuando está cerca de la cosecha; el daño suele afectar la calidad del producto y a veces la producción.',
    noteEn: 'INIA states that this species tolerates some frost but is damaged more easily near harvest; damage usually affects product quality and sometimes the yield.',
    limitations: `INIA define helada como temperatura bajo 0 °C en la caseta meteorológica, que suele marcar algo más que la superficie del suelo.${extra ? ` ${extra}` : ''}`,
    limitationsEn: `INIA defines frost as a temperature below 0 °C in the weather shelter, which usually reads somewhat higher than the soil surface.${extraEn ? ` ${extraEn}` : ''}`,
    evidence: [inia165('maturity'), INIA_1998_FROST],
  });

// --- Calor en floración de hortalizas -----------------------------------------------------

const UMD_POLLINATION: SpeciesCriterionEvidence = {
  institution: 'University of Maryland Extension',
  title: 'Vegetable Plant Pollination in a Changing Climate (Home and Garden Information Center, actualizado en 2026)',
  url: 'https://extension.umd.edu/resource/pollination-vegetable-crops-changing-climate',
  section: '«How will I know if I have a heat stress pollination problem?»',
  consultedAt: '2026-10-14',
  originalValue: 'This problem has been observed in mostly self-fertile crops like bean, tomato, and pepper, and in crops that need cross-pollination, like squash and pumpkin. Generally, day temperatures above 95°F and night temperatures above 75°F can cause problems. Snap beans: University of Delaware research found that night temperatures above 68°F caused pollination problems.',
};

const PURDUE_CORN: SpeciesCriterionEvidence = {
  institution: 'Purdue University, Department of Agronomy',
  title: 'Drought and Heat Stress Effects on Corn Pollination (R. L. Nielsen)',
  url: 'https://www.agry.purdue.edu/ext/corn/pubs/corn-07.htm',
  section: 'Efectos del calor sobre las sedas y el polen',
  consultedAt: '2026-10-14',
  originalValue: 'Temperatures in excess of 95 degrees, especially when accompanied by low relative humidity, can dessicate exposed silks. Pollen is likely damaged by mid-90\'s or greater temperatures, especially when accompanied by low relative humidity. Temperatures over 100 degrees may literally kill pollen.',
};

const HEAT_SCOPE = 'Se compara la máxima o mínima diaria pronosticada; unas pocas horas de calor durante la polinización bastan para causar problemas en cultivares sensibles, y la tolerancia cambia entre variedades.';
const HEAT_SCOPE_EN = 'The forecast daily maximum or minimum is compared; a few hours of heat during pollination are enough to cause problems in sensitive cultivars, and tolerance varies among varieties.';

/** Días sobre 95 °F y noches sobre `nightF`: problemas de polinización documentados por UMD. */
const pollinationHeat = (nightF: number, nightNote: string, nightNoteEn: string): SpeciesAirTemperatureCriterion[] => [
  airMax(['floracion'], 'above', fromF(95), {
    severity: 'warning',
    effect: 'Calor sobre 35 °C en floración: riesgo de caída de flores y mala cuaja',
    effectEn: 'Heat above 35 °C during flowering: risk of flower drop and poor fruit set',
    advice: 'Con días sobre 35 °C se pueden caer flores y los frutos salir pequeños o deformes. Mantén el riego esos días y revisa la cuaja después.',
    adviceEn: 'With days above 35 °C flowers may drop and fruit may come out small or misshapen. Keep watering on those days and check fruit set afterwards.',
    note: 'La fuente documenta que días sobre 95 °F (35 °C) causan problemas de polinización: caída de flores y frutos pequeños o deformes.',
    noteEn: 'The source documents that days above 95 °F (35 °C) cause pollination problems: flower drop and small or misshapen fruit.',
    limitations: HEAT_SCOPE, limitationsEn: HEAT_SCOPE_EN, evidence: [UMD_POLLINATION],
  }),
  airMin(['floracion'], 'above', fromF(nightF), {
    severity: 'warning',
    effect: `Noches sobre ${decimal(fahrenheitToCelsius(nightF), 'es')} °C en floración: afectan la polinización`,
    effectEn: `Nights above ${decimal(fahrenheitToCelsius(nightF), 'en')} °C during flowering affect pollination`,
    advice: `Noches muy cálidas, sobre ${decimal(fahrenheitToCelsius(nightF), 'es')} °C, dificultan la polinización y puede haber menos frutos. Revisa la cuaja en los días siguientes.`,
    adviceEn: `Very warm nights, above ${decimal(fahrenheitToCelsius(nightF), 'en')} °C, hinder pollination and there may be less fruit. Check fruit set over the following days.`,
    note: nightNote, noteEn: nightNoteEn,
    limitations: `${HEAT_SCOPE} La mínima diaria se usa como temperatura de la noche.`,
    limitationsEn: `${HEAT_SCOPE_EN} The daily minimum is used as the night temperature.`,
    evidence: [UMD_POLLINATION],
  }),
];
const WARM_NIGHT_NOTE = 'La fuente indica que noches sobre 75 °F (23,9 °C) causan problemas de polinización, y que la temperatura nocturna parece ser el factor más responsable.';
const WARM_NIGHT_NOTE_EN = 'The source states that nights above 75 °F (23.9 °C) cause pollination problems, and that night temperature seems to be the factor most responsible.';

// --- Salinidad y agua: FAO ---------------------------------------------------------------

const RATING_ES = { sensitive: 'sensible', moderately_sensitive: 'moderadamente sensible', moderately_tolerant: 'moderadamente tolerante', tolerant: 'tolerante' } as const;
const RATING_EN = { sensitive: 'sensitive', moderately_sensitive: 'moderately sensitive', moderately_tolerant: 'moderately tolerant', tolerant: 'tolerant' } as const;
const RATING_FAO = { sensitive: 'Sensitive', moderately_sensitive: 'Moderately sensitive', moderately_tolerant: 'Moderately tolerant', tolerant: 'Tolerant' } as const;

/** FAO 29, tablas 4 y 5: tolerancia a sales en extracto saturado (Maas y Hoffman). */
const salt = (row: string, thresholdEce: number | null, rating: SpeciesSalinityCriterion['rating']): SpeciesSalinityCriterion => {
  const ece = thresholdEce;
  return {
    kind: 'salinity_reference', state: 'enabled', stages: GROWING, rating, thresholdEce: ece,
    note: `La fuente la clasifica como ${RATING_ES[rating]} a las sales${ece != null ? ` y documenta rendimiento completo hasta ${decimal(ece, 'es')} dS/m de conductividad en extracto saturado` : ''}.`,
    noteEn: `The source rates it as ${RATING_EN[rating]} to salts${ece != null ? ` and documents full yield up to ${decimal(ece, 'en')} dS/m of saturated-paste conductivity` : ''}.`,
    limitations: 'Valores guía de tolerancia relativa entre cultivos; la tolerancia absoluta cambia con el clima, el suelo y el manejo. La conductividad de la sonda no se mide en extracto saturado, así que no se compara con este valor.',
    limitationsEn: 'Guide values for relative tolerance among crops; absolute tolerance changes with climate, soil and management. The probe does not measure saturated-paste conductivity, so it is not compared with this value.',
    evidence: [{
      institution: 'FAO',
      title: 'Water quality for agriculture (Ayers y Westcot, FAO Irrigation and Drainage Paper 29 Rev. 1), capítulo 2 «Salinity problems»',
      url: 'https://www.fao.org/4/t0234e/T0234E03.htm',
      section: ece != null ? 'Tabla 4 «Crop tolerance and yield potential of selected crops» y tabla 5 «Relative salt tolerance of agricultural crops»' : 'Tabla 5 «Relative salt tolerance of agricultural crops»',
      consultedAt: '2026-10-14',
      originalValue: `${ece != null ? `Table 4, ${row}: ECe ${ece.toFixed(1)} dS/m at 100% yield potential. ` : ''}Table 5, ${row}: ${RATING_FAO[rating]}. ECe means average root zone salinity as measured by electrical conductivity of the saturation extract of the soil, reported in deciSiemens per metre (dS/m) at 25°C.`,
    }],
  };
};

/** FAO 40, anexo II, tabla 12 (factores de FAO 33): período sensible a la falta de agua. */
const waterSensitive = (row: string, values: string, ky: number, period: SpeciesWaterCriterion['period']): SpeciesWaterCriterion => {
  const es = period === 'flowering' ? 'floración' : 'crecimiento vegetativo';
  const en = period === 'flowering' ? 'flowering' : 'vegetative growth';
  return {
    kind: 'water_sensitivity', state: 'enabled', stages: [period === 'flowering' ? 'floracion' : 'vegetativo'], ky, period,
    note: `En ${es} el rendimiento de esta especie responde fuertemente a la falta de agua: la fuente da un factor ky de ${decimal(ky, 'es')}, y un ky alto marca el período en que conviene no recortar el riego.`,
    noteEn: `During ${en} this species' yield responds strongly to water shortage: the source gives a ky factor of ${decimal(ky, 'en')}, and a high ky marks the period when irrigation should not be cut back.`,
    limitations: 'Factor de rendimiento de FAO para cultivos comerciales. Sin la textura del suelo, la humedad medida no indica si falta agua, así que no se compara con la lectura: revisa el riego en terreno.',
    limitationsEn: 'FAO yield factor for commercial crops. Without soil texture, the measured moisture does not show whether water is lacking, so it is not compared with the reading: check irrigation in the field.',
    evidence: [{
      institution: 'FAO',
      title: 'Organization, operation and maintenance of irrigation schemes (FAO Irrigation and Drainage Paper 40, 1986), anexo II',
      url: 'https://www.fao.org/4/x5647E/x5647e0e.htm',
      section: 'Tabla 12 «Yield response factor (ky)», según FAO Irrigation and Drainage Paper 33',
      consultedAt: '2026-10-14',
      originalValue: `Table 12, ${row}: ${values}. High ky values indicate a sensitive period for water shortage.`,
    }],
  };
};

// --- Fuentes INIA y de extensión para tomate, frutales y berries --------------------------

const INIA_TOMATO_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA',
  title: 'Manual de cultivo del tomate al aire libre (Boletín INIA–INDAP), capítulo 1',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/21592963-55e3-43bb-9426-bd9ec288ae07/content',
  section: '1.5.2 Clima y cuadro 1.3 «Temperaturas críticas para el cultivo de tomate», p. 16',
  consultedAt: '2026-10-14',
  originalValue: 'Temperaturas bajo 10°C afectan la formación de flores y temperaturas mayores a 35°C pueden afectar la fructificación. Cuando [la temperatura nocturna] es inferior a 10°C originaría problemas en el desarrollo de la planta y frutos. Cuadro 1.3: Se hiela la planta -2ºC; Detiene su desarrollo 10–12°C.',
};

const INIA_CHERRY_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA La Platina',
  title: 'El cultivo del cerezo (Boletín INIA N° 133, 2005)',
  url: 'https://biblioteca.inia.cl/items/4ed5eb65-a167-4db2-a6bc-1ebb7a26c489',
  section: 'Requerimientos de clima: «Temperatura» (cuadro 2, Proebsting y Mills, 1978) y «Humedad relativa»; descripción del fruto',
  consultedAt: '2026-10-14',
  originalValue: 'Con -1,1 ºC en primavera ya sufren daño las flores y los frutos; la etapa más sensible a las heladas es el estado de fruto recién cuajado. Cuadro 2, cerezo Bing, plena flor: T10 -2,4; T50 -3,2; T90 -3,9. Temperaturas mayores a 30ºC reducen la capacidad del grano de polen de adherirse al estigma, de germinar y de que el tubo polínico alcance el óvulo. Con más de 36ºC en verano se limita el crecimiento. Las lluvias durante la floración reducen la polinización y ocasionan lavado de polen; antes o durante la cosecha pueden ocasionar partidura de fruta y pudriciones. En la época de maduración son muy sensibles a las partiduras provocadas por rocío o lluvias.',
};

const INIA_OLIVE_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA Intihuasi',
  title: 'Manual del cultivo del olivo (Boletín INIA N° 101, 2003)',
  url: 'https://biblioteca.inia.cl/items/f6a76e2b-197e-4643-8243-d29bc434cf1a',
  section: 'Capítulo 1 «Requerimientos de clima y suelo», cuadro 2 y floración, pp. 11–14',
  consultedAt: '2026-10-14',
  originalValue: 'Cuadro 2: Brotes tiernos -5 a 0: quemazón de ápices y heridas en ramillas; Brotes menores de 1 año -10 a -5: muerte de ramillas. Aunque el olivo es capaz de soportar altas temperaturas veraniegas, del orden de 40ºC, sin sufrir quemaduras, su actividad se detiene cuando éstas superan los 35ºC. Las nieblas son perjudiciales para el olivo, principalmente si se producen en el período de floración ya que provocan la caída de flores. Si la situación es de humedad relativa inferior a 50%, la viabilidad del estigma se reduce a menos de tres días.',
};

const INIA_STRAWBERRY_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA Quilamapu',
  title: 'Manual de frutilla (Boletín INIA N° 262, 2013)',
  url: 'https://bibliotecadigital.ciren.cl/server/api/core/bitstreams/6989b90c-bc5f-494d-b790-fe196c0d430d/content',
  section: '«Requerimientos agroclimáticos de la frutilla», pp. 7–8, y «Pudrición gris (Botrytis cinerea)», pp. 69–70',
  consultedAt: '2026-10-14',
  originalValue: 'Los mejores rendimientos se obtienen en zonas templadas, sin vientos ni heladas en primavera, y sin lluvias ni elevadas temperaturas en épocas de cosecha. Temperaturas superiores a 32 °C en general pueden producir abortos florales. Las raíces se desarrollan mejor con temperaturas mayores a 12 °C en el suelo. Los frutos maduros son muy susceptibles a la pudrición gris; las conidias germinan si existen presencia de agua y temperaturas mayores a 15 °C.',
};

const pennStateBerries = (originalValue: string): SpeciesCriterionEvidence => ({
  institution: 'Penn State Extension',
  title: 'Frost and Freeze Damage on Berry Crops (K. Demchak, actualizado en 2026)',
  url: 'https://extension.psu.edu/frost-and-freeze-damage-on-berry-crops',
  section: '«Critical Temperatures for Blossoms»',
  consultedAt: '2026-10-14',
  originalValue,
});

const UGA_BLUEBERRY_HARVEST: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Blueberry Harvesting and Postharvest Handling (Circular 1269, 2023)',
  url: 'https://fieldreport.caes.uga.edu/publications/C1269/blueberry-harvesting-and-postharvest-handling/',
  section: '«Harvest Guidelines»',
  consultedAt: '2026-10-14',
  originalValue: 'Producers should not harvest when plants are wet from morning dew or rain. Harvesting while it is raining can lead to fruit splitting and reduce storage quality.',
};

const GROUND_COLDER = 'Cerca del suelo, en noches despejadas, la temperatura puede bajar varios grados más que la mínima pronosticada.';
const GROUND_COLDER_EN = 'Near the ground, on clear nights, temperature can drop several degrees below the forecast minimum.';
const RAIN_RULE = 'La fuente no fija una cantidad de lluvia: cuenta como día con lluvia el que tiene 1 mm o más, o 60 % de probabilidad o más, criterio de planificación de la app.';
const RAIN_RULE_EN = 'The source sets no rainfall amount: a day counts as rainy with 1 mm or more, or a 60% chance or more, which is the app\'s planning rule.';

/**
 * Perfiles habilitados. Cada uno se incorpora sólo con fuente propia verificada; no se
 * extrapola un rango de una especie a otra del mismo grupo. Fuentes priorizadas según
 * TASK ES6: INIA primero; tablas de extensión universitaria citables cuando INIA no
 * documenta la especie. Cuando las fuentes discrepan, se usa lo que todas documentan y
 * la discrepancia queda escrita en las limitaciones.
 */
const PROFILES: readonly SpeciesRuleProfile[] = [
  // --- Hortalizas: pH de la tabla B-1 de University of Maryland Extension; helada según la
  // clasificación de INIA (boletines 165 y 1998) con las temperaturas de Nebraska Extension
  // y South Dakota State; salinidad de FAO 29; calor en floración y agua cuando hay fuente ---
  annual('sp.apio', umdVegetable('Celery', 6.5, 6.0),
    frostTolerant(28, [inia165('maturity'), nebraska('tolerant', 'celery'), CSU_CELERY],
      'Colorado State University la clasifica como intolerante a la helada; INIA y Nebraska Extension documentan cierta tolerancia.',
      'Colorado State University classifies it as frost-intolerant; INIA and Nebraska Extension document some tolerance.', GROWING),
    frostNearMaturity(),
    salt('Celery (Apium graveolens)', 1.8, 'moderately_sensitive')),
  annual('sp.arveja', umdVegetable('Peas', 6.5, 6.0),
    frostTolerant(28, [inia165('maturity'), nebraska('veryHardy', 'pea'), sdsu('light', 'Peas')],
      'Nebraska Extension la clasifica como muy resistente (heladas bajo 28 °F por períodos cortos); South Dakota State sólo documenta heladas leves.',
      'Nebraska Extension classifies it as very hardy (frosts below 28 °F for short periods); South Dakota State only documents light frosts.', ['vegetativo']),
    airMin(['floracion'], 'below', celsius(0), {
      severity: 'warning',
      effect: 'Helada en floración: riesgo de aborto floral en arveja',
      effectEn: 'Frost during flowering: risk of pea flower abortion',
      advice: 'Una helada en floración hace caer flores de arveja y puede bajar la cosecha. Revisa las flores después de la helada.',
      adviceEn: 'A frost during flowering makes pea flowers drop and can lower the harvest. Check the flowers after the frost.',
      note: 'INIA señala el aborto floral por helada como un daño de especial importancia en arvejas en floración.',
      noteEn: 'INIA highlights frost-induced flower abortion as a damage of special importance in flowering peas.',
      limitations: 'La fuente no da una temperatura de daño para la flor: se usa la definición de helada de INIA, bajo 0 °C en la caseta meteorológica.',
      limitationsEn: 'The source gives no damaging temperature for the flower: INIA\'s frost definition, below 0 °C in the weather shelter, is used.',
      evidence: [inia165('flowering'), INIA_1998_FROST],
    }),
    frostNearMaturity(),
    waterSensitive('Pea', 'vegetative (early) 0.2; flowering 0.9; yield formation 0.7; ripening 0.2', 0.9, 'flowering')),
  annual('sp.berenjena', umdVegetable('Eggplant', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'eggplant'), sdsu('none', 'Pepper, eggplant')]),
    salt('Eggplant (Solanum melongena)', null, 'moderately_sensitive')),
  annual('sp.betarraga', umdVegetable('Beets', 6.5, 6.2),
    frostTolerant(28, [inia165('weak'), nebraska('tolerant', 'Beet'), sdsu('light', 'Beets')]),
    salt('Beet, red (Beta vulgaris)', 4.0, 'moderately_tolerant')),
  annual('sp.brocoli', umdVegetable('Broccoli', 6.5, 6.2),
    frostTolerant(28, [inia165('weak'), nebraska('tolerant', 'broccoli'), sdsu('hardy', 'Broccoli, cauliflower (26 degrees Fahrenheit)')],
      'South Dakota State documenta tolerancia hasta 26 °F; Nebraska Extension, sólo heladas leves hasta 28 °F.',
      'South Dakota State documents tolerance down to 26 °F; Nebraska Extension, only light frosts down to 28 °F.'),
    salt('Broccoli (Brassica oleracea botrytis)', 2.8, 'moderately_sensitive')),
  annual('sp.camote', umdVegetable('Potatoes, sweet', 6.2, 5.5),
    frostTender([inia165('none'), nebraska('tender', 'sweet potato'), sdsu('none', 'Sweet potatoes')]),
    salt('Sweet potato (Ipomoea batatas)', 1.5, 'moderately_sensitive')),
  annual('sp.cebolla', umdVegetable('Onions - green, bulb, scallions', 6.5, 6.0),
    frostTolerant(28, [inia165('tolerant'), nebraska('tolerant', 'onion'), sdsu('light', 'Onion, Garlic, Chives')],
      'INIA la clasifica entre las que toleran heladas; el mínimo de 28 °F es el que documentan las fuentes de Estados Unidos.',
      'INIA lists it among frost-tolerant crops; the 28 °F minimum is the one documented by the US sources.'),
    salt('Onion (Allium cepa)', 1.2, 'sensitive')),
  annual('sp.cebollin', umdVegetable('Onions - green, bulb, scallions', 6.5, 6.0,
    'La fila de la tabla agrupa cebolla de bulbo y de verdeo.', 'The table row groups bulb and green onions.'),
  frostTolerant(28, [inia165('tolerant'), sdsu('light', 'Onion, Garlic, Chives'), nebraska('tolerant', 'onion'), WISCONSIN_ALLIUMS],
    'El nombre cubre la cebolla de verdeo (cebolla inmadura, que tolera heladas leves) y la cebolla de hoja Allium fistulosum, que la Universidad de Wisconsin describe como muy resistente sin dar una temperatura; se usa el mínimo de la cebolla.',
    'The name covers green onions (immature onions, which tolerate light frost) and Allium fistulosum bunching onions, which the University of Wisconsin describes as very hardy without giving a temperature; the onion minimum is used.')),
  annual('sp.coliflor', umdVegetable('Cauliflower', 6.5, 6.2),
    frostTolerant(28, [inia165('maturity'), nebraska('tolerant', 'cauliflower'), sdsu('light', 'Cauliflower'), sdsu('hardy', 'Broccoli, cauliflower (26 degrees Fahrenheit)')],
      'South Dakota State la incluye entre las de helada leve y también con tolerancia hasta 26 °F; se usa 28 °F, que documentan todas.',
      'South Dakota State lists it both under light frost and with tolerance down to 26 °F; 28 °F, documented by all, is used.', GROWING),
    frostNearMaturity('INIA advierte que la cabeza es más sensible al frío que las hojas.', 'INIA notes the head is more sensitive to cold than the leaves.'),
    salt('Cauliflower (B. oleracea botrytis)', null, 'moderately_sensitive')),
  annual('sp.espinaca', umdVegetable('Spinach', 6.5, 6.0),
    frostTolerant(28, [inia165('weak'), nebraska('veryHardy', 'spinach'), sdsu('light', 'Spinach')],
      'Nebraska Extension la clasifica como muy resistente (heladas bajo 28 °F por períodos cortos); South Dakota State sólo documenta heladas leves.',
      'Nebraska Extension classifies it as very hardy (frosts below 28 °F for short periods); South Dakota State only documents light frosts.'),
    salt('Spinach (Spinacia oleracea)', 2.0, 'moderately_sensitive')),
  annual('sp.lechuga', umdVegetable('Lettuce - leaf, iceberg', 6.5, 6.0),
    frostTolerant(28, [inia165('maturity'), nebraska('veryHardy', 'lettuce'), sdsu('light', 'Lettuce')],
      'Nebraska Extension la clasifica como muy resistente (heladas bajo 28 °F por períodos cortos); South Dakota State sólo documenta heladas leves.',
      'Nebraska Extension classifies it as very hardy (frosts below 28 °F for short periods); South Dakota State only documents light frosts.', GROWING),
    frostNearMaturity(),
    salt('Lettuce (Lactuca sativa)', 1.3, 'moderately_sensitive')),
  annual('sp.maiz', umdVegetable('Sweet corn', 6.5, 6.0,
    'La fila corresponde a choclo (maíz dulce); la fuente no trata el maíz de grano ni para silo.',
    'The row covers sweet corn; the source does not cover grain or silage maize.'),
  frostTender([inia165('none'), nebraska('tender', 'sweet corn'), sdsu('none', 'Sweet Corn')]),
  airMax(['floracion'], 'above', fromF(95), {
    severity: 'warning',
    effect: 'Calor sobre 35 °C en floración: puede desecar las sedas del maíz',
    effectEn: 'Heat above 35 °C during flowering can dry out maize silks',
    advice: 'Sobre 35 °C las barbas del choclo se pueden secar y quedar granos sin formar, sobre todo si falta agua. Mantén el riego esos días.',
    adviceEn: 'Above 35 °C the silks can dry out and kernels may not form, especially if water is short. Keep watering on those days.',
    note: 'La fuente indica que temperaturas sobre 95 °F (35 °C), sobre todo con humedad baja, pueden desecar las sedas expuestas y dañar el polen.',
    noteEn: 'The source states that temperatures above 95 °F (35 °C), especially with low humidity, can desiccate exposed silks and damage pollen.',
    limitations: `${HEAT_SCOPE} Con humedad suficiente en el suelo, el efecto es menor.`,
    limitationsEn: `${HEAT_SCOPE_EN} With enough soil moisture the effect is smaller.`,
    evidence: [PURDUE_CORN],
  }),
  airMax(['floracion'], 'above', fromF(100), {
    severity: 'warning',
    effect: 'Calor sobre 37,8 °C en floración: puede matar el polen del maíz',
    effectEn: 'Heat above 37.8 °C during flowering may kill maize pollen',
    advice: 'Sobre 37,8 °C el calor puede matar el polen y la mazorca queda con granos faltantes. Mantén el riego esos días.',
    adviceEn: 'Above 37.8 °C heat can kill the pollen and the ear ends up with missing kernels. Keep watering on those days.',
    note: 'La fuente indica que temperaturas sobre 100 °F (37,8 °C) pueden matar el polen.',
    noteEn: 'The source states that temperatures above 100 °F (37.8 °C) may kill pollen.',
    limitations: `${HEAT_SCOPE} Con humedad suficiente en el suelo, el efecto es menor.`,
    limitationsEn: `${HEAT_SCOPE_EN} With enough soil moisture the effect is smaller.`,
    evidence: [PURDUE_CORN],
  }),
  salt('Corn, sweet (Zea mays)', 1.7, 'moderately_sensitive'),
  waterSensitive('Maize', 'vegetative 0.4; flowering 1.5; yield formation 0.5; ripening 0.2', 1.5, 'flowering')),
  annual('sp.melon', umdVegetable('Cantaloupes; Muskmelons', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'muskmelon'), sdsu('none', 'Cucurbits: Cucumbers, summer squash, melons')]),
    salt('Muskmelon (Cucumis melo)', null, 'moderately_sensitive')),
  annual('sp.pepino', umdVegetable('Cucumber', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'cucumber'), sdsu('none', 'Cucurbits: Cucumbers, summer squash, melons')]),
    salt('Cucumber (Cucumis sativus)', 2.5, 'moderately_sensitive')),
  annual('sp.perejil', umdVegetable('Parsley', 6.5, 6.0),
    frostTolerant(28, [sdsu('light', 'Parsley'), INIA_1998_FROST], '', '', GROWING),
    frostNearMaturity()),
  annual('sp.pimiento', umdVegetable('Peppers', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'pepper'), sdsu('none', 'Pepper, eggplant')]),
    pollinationHeat(75, WARM_NIGHT_NOTE, WARM_NIGHT_NOTE_EN),
    salt('Pepper (Capsicum annuum)', 1.5, 'moderately_sensitive')),
  annual('sp.poroto', umdVegetable('Beans - lima, snap', 6.2, 6.0,
    'La fila corresponde a poroto verde y pallar; la fuente no trata el poroto de grano seco.',
    'The row covers snap and lima beans; the source does not cover dry beans.'),
  frostTender([inia165('none'), nebraska('tender', 'beans (Lima & snap)'), sdsu('none', 'Beans')]),
  pollinationHeat(68,
    'La fuente cita una investigación de la Universidad de Delaware: en poroto verde, noches sobre 68 °F (20 °C) causaron problemas de polinización.',
    'The source cites University of Delaware research: in snap beans, nights above 68 °F (20 °C) caused pollination problems.'),
  salt('Bean (Phaseolus vulgaris)', 1.0, 'sensitive'),
  waterSensitive('Bean', 'vegetative 0.2; flowering 1.1; yield formation 0.75; ripening 0.2', 1.1, 'flowering')),
  annual('sp.puerro', umdVegetable('Leeks', 6.5, 6.0),
    frostTolerant(20, [inia165('tolerant'), SDSU_LEEKS],
      'La fuente indica que la cosecha puede esperar hasta después de las primeras heladas y que bajo 20 °F conviene proteger los puerros con aporca y mulch; la tolerancia varía entre variedades.',
      'The source says harvest can wait until after the first frosts and that below 20 °F leeks should be protected with hilling and mulch; tolerance varies among varieties.')),
  annual('sp.rabanito', umdVegetable('Radish', 6.5, 6.2),
    frostTolerant(28, [inia165('weak'), nebraska('tolerant', 'radish'), sdsu('light', 'Radish')]),
    salt('Radish (Raphanus sativus)', 1.2, 'moderately_sensitive')),
  annual('sp.repollito-bruselas', umdVegetable('Brussels sprouts', 6.5, 6.2),
    frostTolerant(28, [inia165('weak'), nebraska('tolerant', 'Brussels sprout')],
      'South Dakota State indica que su calidad mejora después de varias heladas moderadas (24 a 28 °F).',
      'South Dakota State notes its quality improves after several moderate freezes (24 to 28 °F).'),
    salt('Brussels sprouts (B. oleracea gemmifera)', null, 'moderately_sensitive')),
  annual('sp.repollo', umdVegetable('Cabbage', 6.5, 6.2),
    frostTolerant(28, [inia165('weak'), nebraska('tolerant', 'cabbage'), sdsu('hardy', 'Chinese cabbage, cabbage, kale, kohlrabi, turnip')],
      'South Dakota State documenta tolerancia a heladas moderadas de 24 a 28 °F; Nebraska Extension, sólo heladas leves hasta 28 °F.',
      'South Dakota State documents tolerance to moderate freezes of 24 to 28 °F; Nebraska Extension, only light frosts down to 28 °F.'),
    salt('Cabbage (Brassica oleracea capitata)', 1.8, 'moderately_sensitive')),
  annual('sp.sandia', umdVegetable('Watermelon', 6.2, 5.5),
    frostTender([inia165('none'), nebraska('tender', 'watermelon')]),
    salt('Watermelon (Citrullus lanatus)', null, 'moderately_sensitive'),
    waterSensitive('Water melon', 'vegetative early 0.45, late 0.7; flowering 0.8; yield formation 0.8; ripening 0.3', 0.8, 'flowering')),
  annual('sp.zanahoria', umdVegetable('Carrot', 6.0, 5.5),
    frostTolerant(28, [inia165('weak'), nebraska('tolerant', 'carrot'), sdsu('light', 'Carrot')], '', '', GROWING),
    frostNearMaturity(
      'El boletín INIA de 2007 la clasifica entre las que toleran heladas débiles y el manual INIA de 1998, entre las que se dañan cerca de la madurez; en cosecha se usa el criterio más cauto.',
      'INIA\'s 2007 bulletin lists it among crops tolerating light frosts and INIA\'s 1998 manual among those damaged near maturity; the more cautious criterion is used at harvest.'),
    salt('Carrot (Daucus carota)', 1.0, 'sensitive')),
  annual('sp.zapallo', umdVegetable('Pumpkins; Squash - winter, summer', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'pumpkin, winter squash'), sdsu('none', 'Cucurbits (pumpkins and winter squash may be able to tolerate very light frosts, but it is better to protect them if possible)')],
      'South Dakota State admite que el zapallo de guarda puede tolerar heladas muy leves, pero indica protegerlo; Nebraska Extension, cosecharlo antes de la helada porque daña la cáscara y acorta su guarda.',
      'South Dakota State allows that winter squash may tolerate very light frosts but advises protecting it; Nebraska Extension, harvesting it before frost because frost damages the rind and shortens storage.'),
    pollinationHeat(75, WARM_NIGHT_NOTE, WARM_NIGHT_NOTE_EN),
    salt('Pumpkin (Cucurbita pepo pepo)', null, 'moderately_sensitive')),
  annual('sp.zapallo-italiano', umdVegetable('Squash - winter, summer', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'summer squash'), sdsu('none', 'Cucurbits: Cucumbers, summer squash, melons')]),
    pollinationHeat(75, WARM_NIGHT_NOTE, WARM_NIGHT_NOTE_EN),
    salt('Squash, zucchini (Cucurbita pepo melopepo)', 4.7, 'moderately_tolerant')),
  perennial('sp.esparrago', umdVegetable('Asparagus', 6.8, 6.2),
    airMin(['vegetativo', 'floracion'], 'at_or_below', FROST, {
      severity: 'info',
      effect: 'Helada prevista: la planta de espárrago la tolera',
      effectEn: 'Frost forecast: the asparagus plant tolerates it',
      advice: 'La planta de espárrago resiste la helada; no debería dañarse.',
      adviceEn: 'The asparagus plant withstands frost; it should not be damaged.',
      note: 'INIA la clasifica entre las hortalizas que toleran heladas, y Nebraska Extension como muy resistente: soporta heladas fuertes, bajo 28 °F (−2,2 °C), por períodos cortos sin daño.',
      noteEn: 'INIA lists it among frost-tolerant vegetables, and Nebraska Extension as very hardy: it withstands hard frosts, below 28 °F (−2.2 °C), for short periods without injury.',
      limitations: `${FROST_SCOPE} Las fuentes no documentan una temperatura de daño para la planta establecida.`,
      limitationsEn: `${FROST_SCOPE_EN} The sources document no damaging temperature for the established plant.`,
      evidence: [INIA_1998_FROST, nebraska('veryHardy', 'Asparagus')],
    }),
    airMin(['cosecha'], 'at_or_below', FROST, {
      severity: 'warning',
      effect: 'Helada prevista en plena cosecha de turiones',
      effectEn: 'Frost forecast during spear harvest',
      advice: 'La helada daña los turiones tiernos. Córtalos antes de que crezcan mucho, a unos 20 cm.',
      adviceEn: 'Frost damages tender spears. Cut them before they grow too tall, at about 20 cm.',
      note: 'Los turiones tiernos son sensibles a la helada; la fuente aconseja cortarlos antes de que alcancen unos 20 cm (8 pulgadas) al inicio de la primavera.',
      noteEn: 'Tender spears are sensitive to frost; the source advises cutting them before they reach about 20 cm (8 inches) in early spring.',
      limitations: 'La fuente no da una temperatura de daño: se considera helada una mínima de 0 °C o menos.',
      limitationsEn: 'The source gives no damaging temperature: a minimum of 0 °C or less is treated as frost.',
      evidence: [IOWA_ASPARAGUS],
    }),
    salt('Asparagus (Asparagus officinalis)', null, 'tolerant')),

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
  },
  frostTender([inia165('none'), sdsu('none', 'Potatoes')],
    'INIA advierte que la papa aparece en las clasificaciones como especie de estación fría, pero es muy sensible a las heladas; Nebraska Extension la clasifica como muy resistente, una clasificación pensada para la fecha de plantación.',
    'INIA warns that potato appears in classifications as a cool-season crop but is very frost-sensitive; Nebraska Extension classifies it as very hardy, a classification aimed at planting dates.'),
  airMin(ALL_STAGES, 'below', celsius(-2.5), {
    severity: 'warning',
    effect: 'Helada que daña el follaje de la mayoría de las papas cultivadas',
    effectEn: 'Frost that injures the foliage of most cultivated potatoes',
    advice: 'Bajo −2,5 °C la mayoría de las papas sufre quemaduras en las hojas. Si puedes, protégelas esa noche.',
    adviceEn: 'Below −2.5 °C most potatoes suffer leaf burn. If you can, protect them that night.',
    note: 'La mayoría de las variedades cultivadas son sensibles a temperaturas inferiores a −2,5 °C, con daño visible en las hojas.',
    noteEn: 'Most cultivated varieties are sensitive to temperatures below −2.5 °C, with visible leaf damage.',
    limitations: 'Afirmación general de un estudio sobre papas nativas en Perú; la tolerancia depende de la variedad, que no se conoce.',
    limitationsEn: 'General statement in a study of native potatoes in Peru; tolerance depends on the variety, which is unknown.',
    evidence: [POTATO_FROST],
  }),
  salt('Potato (Solanum tuberosum)', 1.7, 'moderately_sensitive'),
  waterSensitive('Potato', 'vegetative early 0.45, late 0.8; yield formation 0.7; ripening 0.2', 0.8, 'vegetative')),

  // Tomate: pH y clima de INIA (Chile); mínimo de encalado y helada de extensión de EE. UU.
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
  },
  frostTender([inia165('none'), nebraska('tender', 'tomato'), sdsu('none', 'Tomatoes')]),
  airMin(ALL_STAGES, 'at_or_below', celsius(-2), {
    severity: 'danger',
    effect: 'Helada que congela la planta de tomate',
    effectEn: 'Frost that freezes the tomato plant',
    advice: 'A −2 °C la planta de tomate se congela. Protégela esa noche o cosecha antes los tomates que estén listos.',
    adviceEn: 'At −2 °C the tomato plant freezes. Protect it that night or harvest ripe tomatoes beforehand.',
    note: 'INIA indica que la planta de tomate se hiela a −2 °C; lo tolera sólo por un corto tiempo.',
    noteEn: 'INIA states that the tomato plant freezes at −2 °C; it tolerates it only briefly.',
    limitations: 'Valores referenciales del cultivo al aire libre: la propia fuente advierte que interactúan con otros factores. La mínima pronosticada es del aire a 2 m, no de la hoja.',
    limitationsEn: 'Reference values for outdoor crops: the source itself warns they interact with other factors. The forecast minimum is air at 2 m, not leaf temperature.',
    evidence: [INIA_TOMATO_CLIMATE],
  }),
  airMin(['vegetativo'], 'below', celsius(10), {
    severity: 'warning',
    effect: 'Noches bajo 10 °C: frenan el desarrollo del tomate',
    effectEn: 'Nights below 10 °C slow tomato development',
    advice: 'Con noches bajo 10 °C el tomate crece más lento y los frutos pueden deformarse. Es esperable que avance menos esos días.',
    adviceEn: 'With nights below 10 °C tomato grows more slowly and fruit can become misshapen. Expect slower progress on those days.',
    note: 'INIA indica que una temperatura nocturna inferior a 10 °C origina problemas en el desarrollo de la planta y de los frutos, y que el desarrollo se detiene entre 10 y 12 °C.',
    noteEn: 'INIA states that night temperatures below 10 °C cause problems in plant and fruit development, and that development stops between 10 and 12 °C.',
    limitations: 'Se compara la mínima diaria pronosticada con el umbral nocturno de la fuente. Valores referenciales del cultivo al aire libre.',
    limitationsEn: 'The forecast daily minimum is compared with the source\'s night threshold. Reference values for outdoor crops.',
    evidence: [INIA_TOMATO_CLIMATE],
  }),
  airMin(['floracion'], 'below', celsius(10), {
    severity: 'warning',
    effect: 'Frío bajo 10 °C en floración: afecta la formación de flores',
    effectEn: 'Cold below 10 °C during flowering affects flower formation',
    advice: 'Con frío bajo 10 °C se forman menos flores y puede haber menos tomates.',
    adviceEn: 'With cold below 10 °C fewer flowers form and there may be fewer tomatoes.',
    note: 'INIA indica que temperaturas bajo 10 °C afectan la formación de flores del tomate.',
    noteEn: 'INIA states that temperatures below 10 °C affect tomato flower formation.',
    limitations: 'Se compara la mínima diaria pronosticada. Valores referenciales del cultivo al aire libre.',
    limitationsEn: 'The forecast daily minimum is compared. Reference values for outdoor crops.',
    evidence: [INIA_TOMATO_CLIMATE],
  }),
  airMax(['floracion'], 'above', celsius(35), {
    severity: 'warning',
    effect: 'Calor sobre 35 °C en floración: puede afectar la fructificación',
    effectEn: 'Heat above 35 °C during flowering may affect fruit set',
    advice: 'Sobre 35 °C se pueden caer flores y cuajar menos tomates. Revisa la cuaja después del calor.',
    adviceEn: 'Above 35 °C flowers may drop and fewer tomatoes may set. Check fruit set after the heat.',
    note: 'INIA indica que temperaturas mayores a 35 °C pueden afectar la fructificación, y que el calor con humedad baja puede provocar aborto floral y baja viabilidad del polen.',
    noteEn: 'INIA states that temperatures above 35 °C may affect fruit set, and that heat with low humidity can cause flower abortion and low pollen viability.',
    limitations: 'Se compara la máxima diaria pronosticada; la fuente no indica cuántas horas de calor producen el efecto.',
    limitationsEn: 'The forecast daily maximum is compared; the source does not state how many hours of heat cause the effect.',
    evidence: [INIA_TOMATO_CLIMATE],
  }),
  salt('Tomato (Lycopersicon esculentum)', 2.5, 'moderately_sensitive'),
  waterSensitive('Tomato', 'vegetative 0.4; flowering 1.1; yield formation 0.8; ripening 0.4', 1.1, 'flowering')),

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
  },
  airMin(['floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada en floración: daña flores abiertas y en caída de pétalos',
    effectEn: 'Frost during flowering injures open blossoms and petal-fall flowers',
    advice: 'Desde −2,2 °C se dañan las flores del arándano, sobre todo cuando están botando los pétalos. Si puedes, protégelas esa noche.',
    adviceEn: 'From −2.2 °C blueberry flowers are damaged, especially at petal fall. If you can, protect them that night.',
    note: 'La temperatura crítica de la flor de arándano es 27 °F (−2,8 °C) con la flor abierta y 28 °F (−2,2 °C) en caída de pétalos, el estado más sensible.',
    noteEn: 'Blueberry blossom critical temperature is 27 °F (−2.8 °C) at open bloom and 28 °F (−2.2 °C) at petal fall, the most tender stage.',
    limitations: `La fuente compara la temperatura de la flor; ${GROUND_COLDER.charAt(0).toLowerCase()}${GROUND_COLDER.slice(1)} Botones cerrados toleran más frío.`,
    limitationsEn: `The source refers to blossom temperature; ${GROUND_COLDER_EN.charAt(0).toLowerCase()}${GROUND_COLDER_EN.slice(1)} Closed buds tolerate more cold.`,
    evidence: [pennStateBerries('Critical temperatures for blueberry blossoms: open blossoms 27°F; petal fall (most tender stage) 28°F. Air temperature close to the ground is often much colder (as much as 5°F) than the low temperature reached at standard measurement height.')],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en cosecha: no cosechar fruta mojada',
    effectEn: 'Rain at harvest: do not pick wet fruit',
    advice: 'Cosechar con lluvia o rocío parte la fruta y hace que dure menos guardada. Espera a que las plantas se sequen.',
    adviceEn: 'Picking in rain or dew splits fruit and shortens its storage life. Wait until the plants are dry.',
    note: 'La fuente indica no cosechar con las plantas mojadas por rocío o lluvia: cosechar mientras llueve puede partir la fruta y reducir su calidad de guarda.',
    noteEn: 'The source advises not harvesting when plants are wet from dew or rain: harvesting while it rains can split fruit and reduce storage quality.',
    limitations: `${RAIN_RULE} El rocío no se pronostica.`,
    limitationsEn: `${RAIN_RULE_EN} Dew is not forecast.`,
    evidence: [UGA_BLUEBERRY_HARVEST],
  })),
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
  },
  readingBelow(['vegetativo'], 'temp', 'at_or_below', celsius(12), {
    severity: 'info',
    effect: 'Suelo a 12 °C o menos: las raíces de frutilla crecen mejor sobre esa temperatura',
    effectEn: 'Soil at 12 °C or less: strawberry roots grow better above that temperature',
    advice: 'Las raíces de la frutilla crecen mejor con el suelo sobre 12 °C. Un mulch o cubierta ayuda a calentarlo.',
    adviceEn: 'Strawberry roots grow better with the soil above 12 °C. Mulch or a cover helps warm it.',
    note: 'INIA indica que las raíces de frutilla se desarrollan mejor con temperaturas de suelo mayores a 12 °C, y que la humedad del suelo y el mulch influyen en esa temperatura.',
    noteEn: 'INIA states that strawberry roots develop better with soil temperatures above 12 °C, and that soil moisture and mulch influence that temperature.',
    limitations: 'Lectura puntual a la profundidad de la sonda; la temperatura del suelo cambia durante el día.',
    limitationsEn: 'Single reading at probe depth; soil temperature changes during the day.',
    evidence: [INIA_STRAWBERRY_CLIMATE],
  }),
  airMin(['floracion'], 'at_or_below', fromF(30), {
    severity: 'warning',
    effect: 'Helada en floración: daña las flores abiertas de frutilla',
    effectEn: 'Frost during flowering injures open strawberry blossoms',
    advice: 'Desde −1,1 °C las flores abiertas se dañan y quedan con el centro negro. Si puedes, cúbrelas esa noche.',
    adviceEn: 'From −1.1 °C open flowers are damaged and turn black in the center. If you can, cover them that night.',
    note: 'La temperatura crítica de la flor abierta de frutilla es 30 °F (−1,1 °C); una flor dañada muestra el centro negro.',
    noteEn: 'The critical temperature of an open strawberry blossom is 30 °F (−1.1 °C); a damaged blossom shows a black center.',
    limitations: `La fuente compara la temperatura de la flor; ${GROUND_COLDER.charAt(0).toLowerCase()}${GROUND_COLDER.slice(1)} Botones cerrados toleran más frío.`,
    limitationsEn: `The source refers to blossom temperature; ${GROUND_COLDER_EN.charAt(0).toLowerCase()}${GROUND_COLDER_EN.slice(1)} Closed buds tolerate more cold.`,
    evidence: [pennStateBerries('Critical temperatures for strawberry blossoms: blossoms tightly closed 22°F; popcorn stage 26°F; open blossoms 30°F; young green fruit 28°F. Air temperature close to the ground is often much colder (as much as 5°F) than the low temperature reached at standard measurement height.')],
  }),
  airMax(['floracion'], 'above', celsius(32), {
    severity: 'warning',
    effect: 'Calor sobre 32 °C en floración: riesgo de aborto floral',
    effectEn: 'Heat above 32 °C during flowering: flower abortion risk',
    advice: 'Sobre 32 °C se pueden caer flores y bajar la cosecha.',
    adviceEn: 'Above 32 °C flowers may drop and the harvest may fall.',
    note: 'INIA indica que temperaturas superiores a 32 °C en general pueden producir abortos florales en frutilla.',
    noteEn: 'INIA states that temperatures above 32 °C can generally cause strawberry flower abortion.',
    limitations: 'Se compara la máxima diaria pronosticada; la fuente no indica cuántas horas de calor producen el efecto.',
    limitationsEn: 'The forecast daily maximum is compared; the source does not state how many hours of heat cause the effect.',
    evidence: [INIA_STRAWBERRY_CLIMATE],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en cosecha: fruta madura expuesta a pudrición gris',
    effectEn: 'Rain at harvest: ripe fruit exposed to gray mold',
    advice: 'Con lluvia la fruta madura se pudre más (pudrición gris). Cosecha la fruta madura y revísala antes y después de la lluvia.',
    adviceEn: 'Rain makes ripe fruit rot more (gray mold). Pick ripe fruit and check it before and after the rain.',
    note: 'INIA indica que los mejores rendimientos se obtienen sin lluvias en cosecha, que la fruta madura es muy susceptible a la pudrición gris y que el hongo necesita agua y más de 15 °C. Revisa la fruta madura antes y después de la lluvia.',
    noteEn: 'INIA states that the best yields come without rain at harvest, that ripe fruit is very susceptible to gray mold and that the fungus needs water and over 15 °C. Check ripe fruit before and after the rain.',
    limitations: `${RAIN_RULE} No diagnostica la enfermedad: sólo señala la condición que la fuente asocia con ella.`,
    limitationsEn: `${RAIN_RULE_EN} It does not diagnose disease: it only flags the condition the source associates with it.`,
    evidence: [INIA_STRAWBERRY_CLIMATE],
  }),
  salt('Strawberry (Fragaria sp.)', 1.0, 'sensitive')),

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
  },
  airMax(['vegetativo'], 'above', celsius(36), {
    severity: 'warning',
    effect: 'Calor sobre 36 °C: limita el crecimiento del cerezo',
    effectEn: 'Heat above 36 °C limits cherry growth',
    advice: 'Sobre 36 °C el cerezo crece menos, y ese calor puede dar frutos dobles la temporada siguiente.',
    adviceEn: 'Above 36 °C the cherry tree grows less, and that heat can cause double fruit the next season.',
    note: 'INIA indica que con más de 36 °C en verano se limita el crecimiento, y que ese calor puede provocar frutos dobles en la cosecha siguiente.',
    noteEn: 'INIA states that above 36 °C in summer growth is limited, and that such heat can cause double fruits the following season.',
    limitations: 'Se compara la máxima diaria pronosticada; la fuente no indica cuántas horas de calor producen el efecto.',
    limitationsEn: 'The forecast daily maximum is compared; the source does not state how many hours of heat cause the effect.',
    evidence: [INIA_CHERRY_CLIMATE],
  }),
  airMin(['floracion'], 'at_or_below', celsius(-1.1), {
    severity: 'warning',
    effect: 'Helada en floración: daño en flores y frutos recién cuajados',
    effectEn: 'Frost during flowering: injury to blossoms and newly set fruit',
    advice: 'Desde −1,1 °C se dañan las flores y los frutos recién formados. Si tienes control de heladas, prepáralo.',
    adviceEn: 'From −1.1 °C flowers and newly set fruit are damaged. If you have frost protection, get it ready.',
    note: 'INIA indica que con −1,1 °C en primavera ya sufren daño las flores y los frutos, y que el fruto recién cuajado es el estado más sensible.',
    noteEn: 'INIA states that at −1.1 °C in spring blossoms and fruit are already injured, and that newly set fruit is the most sensitive stage.',
    limitations: `${GROUND_COLDER} La tolerancia cambia con la variedad y el estado de la yema.`,
    limitationsEn: `${GROUND_COLDER_EN} Tolerance changes with variety and bud stage.`,
    evidence: [INIA_CHERRY_CLIMATE],
  }),
  airMin(['floracion'], 'at_or_below', celsius(-2.4), {
    severity: 'warning',
    effect: 'Helada en plena flor: se pierde al menos el 10 % de las flores',
    effectEn: 'Frost at full bloom: at least 10% of blossoms are lost',
    advice: 'A −2,4 °C se pierde al menos 1 de cada 10 flores, y a −3,2 °C la mitad. Si tienes control de heladas, actívalo.',
    adviceEn: 'At −2.4 °C at least 1 in 10 flowers is lost, and at −3.2 °C half of them. If you have frost protection, use it.',
    note: 'En el cuadro de INIA (cerezo Bing), en plena flor se congela el 10 % de las yemas a −2,4 °C y el 50 % a −3,2 °C.',
    noteEn: 'In the INIA table (Bing cherry), at full bloom 10% of buds freeze at −2.4 °C and 50% at −3.2 °C.',
    limitations: `Valores medidos en la variedad Bing (Proebsting y Mills, 1978). ${GROUND_COLDER}`,
    limitationsEn: `Values measured on Bing cherry (Proebsting and Mills, 1978). ${GROUND_COLDER_EN}`,
    evidence: [INIA_CHERRY_CLIMATE],
  }),
  airMin(['floracion'], 'at_or_below', celsius(-3.9), {
    severity: 'danger',
    effect: 'Helada en plena flor: se pierde el 90 % de las flores',
    effectEn: 'Frost at full bloom: 90% of blossoms are lost',
    advice: 'A −3,9 °C se pierden 9 de cada 10 flores. Si tienes control de heladas, actívalo.',
    adviceEn: 'At −3.9 °C 9 in 10 flowers are lost. If you have frost protection, use it.',
    note: 'En el cuadro de INIA (cerezo Bing), en plena flor se congela el 90 % de las yemas a −3,9 °C.',
    noteEn: 'In the INIA table (Bing cherry), at full bloom 90% of buds freeze at −3.9 °C.',
    limitations: `Valores medidos en la variedad Bing (Proebsting y Mills, 1978). ${GROUND_COLDER}`,
    limitationsEn: `Values measured on Bing cherry (Proebsting and Mills, 1978). ${GROUND_COLDER_EN}`,
    evidence: [INIA_CHERRY_CLIMATE],
  }),
  airMax(['floracion'], 'above', celsius(30), {
    severity: 'warning',
    effect: 'Calor sobre 30 °C en floración: afecta la polinización',
    effectEn: 'Heat above 30 °C during flowering affects pollination',
    advice: 'Sobre 30 °C el polen funciona peor y pueden cuajar menos cerezas.',
    adviceEn: 'Above 30 °C pollen works worse and fewer cherries may set.',
    note: 'INIA indica que sobre 30 °C el polen pierde capacidad de adherirse al estigma, de germinar y de alcanzar el óvulo.',
    noteEn: 'INIA states that above 30 °C pollen loses its ability to adhere to the stigma, germinate and reach the ovule.',
    limitations: 'Se compara la máxima diaria pronosticada; la fuente no indica cuántas horas de calor producen el efecto.',
    limitationsEn: 'The forecast daily maximum is compared; the source does not state how many hours of heat cause the effect.',
    evidence: [INIA_CHERRY_CLIMATE],
  }),
  weatherEvent(['floracion'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en floración: reduce la polinización del cerezo',
    effectEn: 'Rain during flowering reduces cherry pollination',
    advice: 'La lluvia lava el polen y baja la polinización; también favorece hongos y bacterias. Revisa las flores después de la lluvia.',
    adviceEn: 'Rain washes pollen away and lowers pollination; it also favors fungi and bacteria. Check the flowers after the rain.',
    note: 'INIA indica que las lluvias en floración reducen la polinización, lavan el polen y aumentan las infecciones por hongos y bacterias.',
    noteEn: 'INIA states that rain during flowering reduces pollination, washes away pollen and increases fungal and bacterial infections.',
    limitations: `${RAIN_RULE} No diagnostica enfermedades.`,
    limitationsEn: `${RAIN_RULE_EN} It does not diagnose disease.`,
    evidence: [INIA_CHERRY_CLIMATE],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en cosecha: riesgo de partidura de la cereza',
    effectEn: 'Rain at harvest: cherry cracking risk',
    advice: 'La lluvia cerca o durante la cosecha parte la cereza madura y favorece pudriciones. Si la fruta está lista, considera cosechar antes.',
    adviceEn: 'Rain near or during harvest cracks ripe cherries and favors rot. If the fruit is ready, consider harvesting before the rain.',
    note: 'INIA indica que en maduración la cereza es muy sensible a la partidura por rocío o lluvia, y que la lluvia antes o durante la cosecha puede ocasionar partidura y pudriciones.',
    noteEn: 'INIA states that ripening cherries are very sensitive to cracking from dew or rain, and that rain before or during harvest can cause cracking and rot.',
    limitations: `${RAIN_RULE} La sensibilidad a la partidura cambia mucho entre variedades.`,
    limitationsEn: `${RAIN_RULE_EN} Cracking susceptibility varies widely among varieties.`,
    evidence: [INIA_CHERRY_CLIMATE],
  }),
  salt('Cherry, sweet (Prunus avium)', null, 'sensitive')),
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
  },
  airMin(GROWING, 'at_or_below', celsius(0), {
    severity: 'warning',
    effect: 'Helada sobre brotes tiernos de olivo',
    effectEn: 'Frost on tender olive shoots',
    advice: 'Entre 0 y −5 °C se queman las puntas de los brotes nuevos del olivo.',
    adviceEn: 'Between 0 and −5 °C the tips of new olive shoots get burned.',
    note: 'INIA indica que entre 0 y −5 °C los brotes tiernos sufren quemazón de ápices y heridas en ramillas, salvo que el frío progresivo del otoño los haya endurecido.',
    noteEn: 'INIA states that between 0 and −5 °C tender shoots suffer tip burn and twig wounds, unless the progressive autumn cold has hardened them.',
    limitations: `${GROUND_COLDER} La tolerancia cambia con la variedad y con el endurecimiento previo al frío.`,
    limitationsEn: `${GROUND_COLDER_EN} Tolerance changes with variety and prior cold hardening.`,
    evidence: [INIA_OLIVE_CLIMATE, INIA_165_OLIVE],
  }),
  airMin(GROWING, 'at_or_below', celsius(-5), {
    severity: 'danger',
    effect: 'Helada fuerte: muerte de ramillas jóvenes de olivo',
    effectEn: 'Hard frost: death of young olive twigs',
    advice: 'Entre −5 y −10 °C mueren las ramillas jóvenes del olivo.',
    adviceEn: 'Between −5 and −10 °C young olive twigs die.',
    note: 'INIA indica que entre −5 y −10 °C mueren las ramillas de menos de un año.',
    noteEn: 'INIA states that between −5 and −10 °C twigs under one year old die.',
    limitations: `${GROUND_COLDER} La tolerancia cambia con la variedad y con el endurecimiento previo al frío.`,
    limitationsEn: `${GROUND_COLDER_EN} Tolerance changes with variety and prior cold hardening.`,
    evidence: [INIA_OLIVE_CLIMATE, INIA_165_OLIVE],
  }),
  airMax(['vegetativo'], 'above', celsius(35), {
    severity: 'warning',
    effect: 'Calor sobre 35 °C: el olivo detiene su actividad',
    effectEn: 'Heat above 35 °C: the olive tree stops its activity',
    advice: 'Sobre 35 °C el olivo deja de crecer; aguanta hasta unos 40 °C sin quemarse.',
    adviceEn: 'Above 35 °C the olive tree stops growing; it withstands about 40 °C without burning.',
    note: 'INIA indica que el olivo soporta unos 40 °C sin quemaduras, pero detiene su actividad cuando la temperatura supera los 35 °C.',
    noteEn: 'INIA states that olive withstands about 40 °C without burns, but stops its activity when temperature exceeds 35 °C.',
    limitations: 'Se compara la máxima diaria pronosticada; la fuente no indica cuántas horas de calor producen el efecto.',
    limitationsEn: 'The forecast daily maximum is compared; the source does not state how many hours of heat cause the effect.',
    evidence: [INIA_OLIVE_CLIMATE],
  }),
  weatherEvent(['floracion'], 'fog', {
    severity: 'warning',
    effect: 'Niebla en floración: provoca caída de flores en olivo',
    effectEn: 'Fog during flowering causes olive flower drop',
    advice: 'La niebla en floración hace caer flores del olivo y puede bajar la cosecha.',
    adviceEn: 'Fog during flowering makes olive flowers drop and can lower the harvest.',
    note: 'INIA indica que las nieblas son perjudiciales para el olivo, sobre todo en floración, porque provocan la caída de flores.',
    noteEn: 'INIA states that fog is harmful to olive, especially during flowering, because it causes flower drop.',
    limitations: 'Se usa el código de tiempo del pronóstico (niebla); la niebla es local y el modelo puede no detectarla.',
    limitationsEn: 'The forecast weather code (fog) is used; fog is local and the model may miss it.',
    evidence: [INIA_OLIVE_CLIMATE],
  }),
  readingBelow(['floracion'], 'airHumidity', 'below', percent(50), {
    severity: 'info',
    effect: 'Aire seco en floración: humedad bajo 50 %',
    effectEn: 'Dry air during flowering: humidity below 50%',
    advice: 'Con el aire bajo 50 % de humedad la flor del olivo se seca antes de polinizarse y cuaja menos fruta.',
    adviceEn: 'With air humidity below 50% the olive flower dries before pollination and less fruit sets.',
    note: 'INIA indica que con humedad relativa inferior a 50 % el estigma de la flor de olivo se deshidrata y su viabilidad baja a menos de tres días, insuficiente para la cuaja.',
    noteEn: 'INIA states that with relative humidity below 50% the olive flower stigma dries out and its viability drops below three days, too short for fruit set.',
    limitations: 'Lectura puntual del sensor de ambiente del equipo; la humedad del aire cambia durante el día y la fuente se refiere a la condición del período de floración.',
    limitationsEn: 'Single reading from the device\'s ambient sensor; air humidity changes during the day and the source refers to conditions over the flowering period.',
    evidence: [INIA_OLIVE_CLIMATE],
  }),
  airMin(['cosecha'], 'below', celsius(0), {
    severity: 'warning',
    effect: 'Helada con la aceituna en maduración: daña el fruto',
    effectEn: 'Frost while olives ripen damages the fruit',
    advice: 'Bajo 0 °C la aceituna se daña: baja la producción y la calidad del aceite. Si ya está lista, considera cosechar antes.',
    adviceEn: 'Below 0 °C the olive fruit is damaged: yield and oil quality drop. If it is ready, consider harvesting before the frost.',
    note: 'INIA indica que durante el crecimiento y la maduración del fruto, temperaturas inferiores a 0 °C lo dañan y disminuyen la producción y la calidad del aceite.',
    noteEn: 'INIA states that during fruit growth and ripening, temperatures below 0 °C damage it and reduce yield and oil quality.',
    limitations: `${GROUND_COLDER} La duración de la helada también influye.`,
    limitationsEn: `${GROUND_COLDER_EN} Frost duration also matters.`,
    evidence: [INIA_165_OLIVE],
  }),
  salt('Olive (Olea europaea)', null, 'moderately_tolerant')),
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

const sourcesOf = (criterion: SpeciesCriterion) =>
  criterion.evidence.map(e => e.institution).filter((name, i, all) => all.indexOf(name) === i).join('; ');

/** Detalle técnico de un criterio: lo que dice la fuente, sus límites, el control y la cita. */
const explanation = (criterion: SpeciesCriterion, check: string, language: AppLanguage) => {
  const en = language === 'en';
  return [en ? criterion.noteEn : criterion.note, en ? criterion.limitationsEn : criterion.limitations, check,
    `(${en ? 'Source' : 'Fuente'}: ${sourcesOf(criterion)}.)`].filter(Boolean).join(' ');
};

/** Lo que lee el agricultor sobre el pH: el valor, el ideal y qué hacer, sin términos de la fuente. */
function phPlain(criterion: SpeciesPhCriterion, position: PhPosition, ph: number, language: AppLanguage): { title: string; action: string } {
  const en = language === 'en';
  const n = (value: number) => decimal(value, language);
  const { min, max } = criterion.optimum;
  const ideal = min === max ? n(min) : (en ? `${n(min)} to ${n(max)}` : `${n(min)} a ${n(max)}`);
  const measured = en ? `Measured pH: ${n(ph)}. Ideal for this crop: ${ideal}.` : `pH medido: ${n(ph)}. Ideal para este cultivo: ${ideal}.`;
  const lab = en ? 'Before correcting the soil, confirm the pH with a laboratory analysis.' : 'Antes de corregir el suelo, confirma el pH con un análisis de laboratorio.';
  const recheck = en ? 'No correction is needed for now; measure again to confirm.' : 'Por ahora no hace falta corregir; vuelve a medir para confirmar.';
  switch (position) {
    case 'below_limit': return {
      title: en ? 'pH too low for this crop (acidic soil)' : 'pH demasiado bajo para este cultivo (suelo ácido)',
      action: `${measured} ${en ? `Below ${n(criterion.lowerLimit!)} this crop has problems.` : `Bajo ${n(criterion.lowerLimit!)} este cultivo tiene problemas.`} ${lab}` };
    case 'above_limit': return {
      title: en ? 'pH too high for this crop (alkaline soil)' : 'pH demasiado alto para este cultivo (suelo alcalino)',
      action: `${measured} ${en ? `Above ${n(criterion.upperLimit!)} this crop has problems.` : `Sobre ${n(criterion.upperLimit!)} este cultivo tiene problemas.`} ${lab}` };
    case 'optimum': return {
      title: en ? 'pH suitable for this crop' : 'pH adecuado para este cultivo',
      action: `${measured} ${en ? 'It is within the ideal range.' : 'Está dentro de lo ideal.'}` };
    case 'below_optimum': return {
      title: en ? 'pH slightly low for this crop' : 'pH algo bajo para este cultivo',
      action: `${measured} ${en ? 'It is below ideal but still acceptable.' : 'Está bajo lo ideal, pero todavía es aceptable.'} ${recheck}` };
    case 'above_optimum': return {
      title: en ? 'pH slightly high for this crop' : 'pH algo alto para este cultivo',
      action: `${measured} ${en ? 'It is above ideal but still acceptable.' : 'Está sobre lo ideal, pero todavía es aceptable.'} ${recheck}` };
  }
}

const SALT_PLAIN = {
  sensitive: ['Este cultivo es sensible a la sal', 'This crop is sensitive to salt',
    'Si el suelo o el agua de riego tienen sales, rinde menos.', 'If the soil or irrigation water is salty, it yields less.'],
  moderately_sensitive: ['Este cultivo es algo sensible a la sal', 'This crop is somewhat sensitive to salt',
    'Con suelo o agua de riego salinos puede rendir menos.', 'With salty soil or irrigation water it may yield less.'],
  moderately_tolerant: ['Este cultivo tolera algo de sal', 'This crop tolerates some salt',
    'Soporta mejor que muchos cultivos un suelo o agua con sales.', 'It handles salty soil or water better than many crops.'],
  tolerant: ['Este cultivo tolera la sal', 'This crop tolerates salt',
    'Soporta bien un suelo o agua con sales.', 'It handles salty soil or water well.'],
} as const;

/** Si `value` cumple la condición del umbral. */
export function meetsThreshold(comparison: SpeciesComparison, threshold: SpeciesThreshold, value: number): boolean {
  switch (comparison) {
    case 'below': return value < threshold.value;
    case 'at_or_below': return value <= threshold.value;
    case 'above': return value > threshold.value;
    case 'at_or_above': return value >= threshold.value;
  }
}

/**
 * Alertas propias de la especie para esta captura y etapa. Se agregan a las alertas
 * generales sin reemplazarlas: una especie indicada no cambia cómo se evalúa el suelo
 * frío, salino o seco (T45); sólo añade las razones que su propio criterio documenta.
 * Sólo cruzar un límite documentado es advertencia; el resto es información.
 *
 * `usable` dice si el dato puede interpretarse (disponible y captura vigente): un dato
 * ausente, inválido o de una captura antigua no se compara con ningún criterio. Los
 * criterios del pronóstico no se evalúan aquí sino en `evaluateSpeciesWeather`.
 */
export function evaluateSpeciesCriteria(
  speciesId: string | null | undefined,
  stage: PhenologicalStage,
  reading: SoilMeasurement,
  language: AppLanguage = 'es',
  usable: (key: 'ph' | 'temp' | 'airHumidity') => boolean = () => true,
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
      const check = en
        ? 'Probe reading in the field: confirm pH with a laboratory analysis before correcting it.'
        : 'Lectura de la sonda en terreno: confirma el pH con un análisis de laboratorio antes de corregirlo.';
      const plain = phPlain(criterion, position, reading.ph, language);
      alerts.push({
        type: position === 'below_limit' || position === 'above_limit' ? 'warning' : 'info',
        param: 'ph', origin: 'species',
        title: plain.title, action: plain.action,
        detail: `${phTitle(criterion, position, language)}. ${explanation(criterion, check, language)}`,
      });
    } else if (criterion.kind === 'reading') {
      const value = reading[criterion.variable];
      if (!usable(criterion.variable) || typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (!meetsThreshold(criterion.comparison, criterion.threshold, value)) continue;
      const unit = criterion.variable === 'temp' ? ' °C' : ' %';
      const measured = en ? `Measured: ${decimal(value, 'en')}${unit}.` : `Medido: ${decimal(value, 'es')}${unit}.`;
      alerts.push({
        type: criterion.severity, param: criterion.variable, origin: 'species',
        title: en ? criterion.effectEn : criterion.effect,
        action: `${measured} ${en ? criterion.adviceEn : criterion.advice}`,
        detail: explanation(criterion, '', language),
      });
    } else if (criterion.kind === 'salinity_reference') {
      // Referencia, no comparación: se informa aunque la conductividad falte o no sea comparable.
      const [title, titleEn, plain, plainEn] = SALT_PLAIN[criterion.rating];
      alerts.push({
        type: 'info', param: 'ec', origin: 'species',
        title: en ? titleEn : title,
        action: en ? `${plainEn} If you are concerned about salt, ask a laboratory for a soil salinity analysis.`
          : `${plain} Si te preocupa la sal, pide en laboratorio un análisis de salinidad del suelo.`,
        detail: explanation(criterion, en
          ? 'To know whether salts limit this crop, ask a laboratory for the saturated-paste electrical conductivity.'
          : 'Para saber si las sales limitan este cultivo, pide en laboratorio la conductividad eléctrica del extracto de saturación.', language),
      });
    } else if (criterion.kind === 'water_sensitivity') {
      alerts.push({
        type: 'info', param: 'vwc', origin: 'species',
        title: en ? `${criterion.period === 'flowering' ? 'Flowering' : 'Vegetative growth'}: make sure this crop does not lack water`
          : `${criterion.period === 'flowering' ? 'Floración' : 'Crecimiento vegetativo'}: que no le falte agua a este cultivo`,
        action: en ? 'At this stage, a lack of water is what lowers this crop\'s harvest the most. Check that irrigation reaches the roots well.'
          : 'En esta etapa, la falta de agua es lo que más baja la cosecha de este cultivo. Revisa que el riego llegue bien a las raíces.',
        detail: explanation(criterion, '', language),
      });
    }
  }
  return alerts;
}

// --- Criterios del pronóstico -------------------------------------------------------------

/** Un día comparable del pronóstico, con su nombre ya resuelto para leer («hoy», «el mar 6 oct»). */
export interface SpeciesWeatherDay {
  date: string;
  label: string;
  isToday: boolean;
  minimumTemperatureC: number | null;
  maximumTemperatureC: number | null;
  /** `null` si faltan cantidad y probabilidad de lluvia. */
  rainy: boolean | null;
  /** `null` si el día no trae código de tiempo. */
  fog: boolean | null;
}

/** Una hora del pronóstico en hora local del proveedor (`AAAA-MM-DDTHH:mm`). */
export interface SpeciesWeatherHour {
  time: string;
  temperatureC: number | null;
}

export interface SpeciesWeatherInput {
  /** Hoy primero, si existe, y luego los días siguientes. */
  days: SpeciesWeatherDay[];
  /** Serie horaria, si el pronóstico la trae; sólo informa la duración, no cambia la gravedad. */
  hours?: SpeciesWeatherHour[];
  rainingNow: boolean;
  fogNow: boolean;
}

export interface SpeciesWeatherFinding {
  type: SpeciesSeverity;
  title: string;
  /** Qué significa y qué hacer, en lenguaje simple. */
  body: string;
  /** Cifras de la fuente, limitaciones y cita, para quien quiera revisarlas. */
  detail: string;
  /** El primer momento en que aplica. */
  when: 'now' | 'today' | 'next_days';
}

export interface SpeciesWeatherResult {
  /** La especie tiene criterios del pronóstico para la etapa. */
  applicable: boolean;
  /** Al menos un criterio aplicable se pudo comparar con el pronóstico. */
  evaluated: boolean;
  findings: SpeciesWeatherFinding[];
}

const isWeatherCriterion = (c: SpeciesCriterion): c is SpeciesAirTemperatureCriterion | SpeciesWeatherEventCriterion =>
  c.kind === 'air_temperature' || c.kind === 'weather_event';

/** Si la especie tiene criterios que dependen del pronóstico en esta etapa. */
export function hasWeatherCriteria(speciesId: string | null | undefined, stage: PhenologicalStage): boolean {
  const profile = findSpeciesRuleProfile(speciesId);
  return !!profile && profile.criteria.some(c => c.state === 'enabled' && c.stages.includes(stage) && isWeatherCriterion(c));
}

const SEVERITY_ORDER: Record<SpeciesSeverity, number> = { danger: 0, warning: 1, info: 2 };

const HOUR_MS = 3_600_000;
const localMs = (time: string) => Date.parse(`${time}:00Z`);

/**
 * Horas seguidas que cumplen la condición en la noche o el día de `date`: la racha más larga
 * con al menos una hora de esa fecha. Una hora sin dato, o un salto distinto de una hora
 * (hueco o cambio de horario), corta la racha en vez de unir episodios (T23, T24). `null`
 * si la serie no cubre esa fecha o ninguna hora cumple: no se inventa una duración (T22).
 */
export function longestRun(hours: readonly SpeciesWeatherHour[] | undefined, date: string, meets: (value: number) => boolean): number | null {
  if (!hours?.some(h => h.time.startsWith(date))) return null;
  let best = 0, run = 0, touches = false, previous = Number.NaN;
  for (const hour of hours) {
    const at = localMs(hour.time);
    const ok = typeof hour.temperatureC === 'number' && Number.isFinite(hour.temperatureC) && Number.isFinite(at) && meets(hour.temperatureC);
    if (!ok || at - previous !== HOUR_MS) { run = 0; touches = false; }
    if (ok) {
      run += 1;
      touches ||= hour.time.startsWith(date);
      if (touches) best = Math.max(best, run);
    }
    previous = ok ? at : Number.NaN;
  }
  return best > 0 ? best : null;
}

const listDays = (labels: string[], language: AppLanguage) => labels.length > 1
  ? `${labels.slice(0, -1).join(', ')} ${language === 'en' ? 'and' : 'y'} ${labels[labels.length - 1]}`
  : labels[0];

/**
 * Compara el pronóstico con los criterios climáticos de la especie para la etapa. Entre
 * los criterios de un mismo extremo (mínima o máxima) que se cumplen, sólo se informa el
 * de umbral más extremo: una helada de −4 °C no genera además el aviso de helada leve
 * (T44). Un día sin el dato necesario no cuenta como favorable: si ningún día lo trae, el
 * criterio queda sin evaluar.
 */
export function evaluateSpeciesWeather(
  speciesId: string | null | undefined,
  stage: PhenologicalStage,
  weather: SpeciesWeatherInput | null,
  language: AppLanguage = 'es',
): SpeciesWeatherResult {
  const profile = findSpeciesRuleProfile(speciesId);
  const criteria = (profile?.criteria ?? []).filter(c => c.state === 'enabled' && c.stages.includes(stage)).filter(isWeatherCriterion);
  if (!criteria.length) return { applicable: false, evaluated: false, findings: [] };
  if (!weather) return { applicable: true, evaluated: false, findings: [] };
  const en = language === 'en';
  const n = (value: number) => decimal(Math.round(value * 10) / 10, language);
  const forecastCheck = en
    ? 'Model forecast for the area, not a measurement on the plant: confirm conditions in the field.'
    : 'Pronóstico del modelo para el sector, no una medición en la planta: confirma las condiciones en terreno.';
  let evaluated = false;
  const found: (SpeciesWeatherFinding & { rank: number; family: string })[] = [];

  for (const criterion of criteria) {
    if (criterion.kind === 'air_temperature') {
      const key = criterion.extreme === 'minimum' ? 'minimumTemperatureC' : 'maximumTemperatureC';
      const valueOf = (day: SpeciesWeatherDay) => day[key];
      const known = weather.days.filter(day => { const v = valueOf(day); return typeof v === 'number' && Number.isFinite(v); });
      if (!known.length) continue;
      evaluated = true;
      const hits = known.filter(day => meetsThreshold(criterion.comparison, criterion.threshold, valueOf(day)!));
      if (!hits.length) continue;
      const worst = hits.reduce((a, b) => (criterion.extreme === 'minimum' ? valueOf(b)! < valueOf(a)! : valueOf(b)! > valueOf(a)!) ? b : a);
      const label = criterion.extreme === 'minimum' ? (en ? 'low' : 'mínima') : (en ? 'high' : 'máxima');
      const on = worst.isToday ? worst.label : `${en ? 'on' : 'el'} ${worst.label}`;
      const days = hits.length > 1 ? ` ${en ? 'Days at risk' : 'Días con riesgo'}: ${listDays(hits.map(d => d.label), language)}.` : '';
      const below = criterion.comparison === 'below' || criterion.comparison === 'at_or_below';
      const hoursRun = longestRun(weather.hours, worst.date, value => meetsThreshold(criterion.comparison, criterion.threshold, value));
      const duration = hoursRun == null ? ''
        : en ? ` About ${hoursRun} hours in a row ${below ? 'at or below' : 'above'} ${n(criterion.threshold.value)} °C are expected ${on}.`
          : ` Se esperan unas ${hoursRun} horas seguidas ${below ? 'a' : 'sobre'} ${n(criterion.threshold.value)} °C${below ? ' o menos' : ''} ${on}.`;
      found.push({
        type: criterion.severity,
        title: `${en ? criterion.effectEn : criterion.effect} — ${label} ${en ? 'of' : 'de'} ${n(valueOf(worst)!)} °C ${on}`,
        body: `${en ? criterion.adviceEn : criterion.advice}${days}${duration}`,
        detail: explanation(criterion, forecastCheck, language),
        when: hits[0].isToday ? 'today' : 'next_days',
        // Gana el umbral más extremo de cada familia: helada más fuerte, calor o noche más cálidos.
        rank: below ? criterion.threshold.value : -criterion.threshold.value,
        family: `${criterion.extreme}:${below ? 'below' : 'above'}`,
      });
    } else {
      const key = criterion.event === 'rain' ? 'rainy' : 'fog';
      const now = criterion.event === 'rain' ? weather.rainingNow : weather.fogNow;
      const known = weather.days.filter(day => day[key] !== null);
      if (!known.length && !now) continue;
      evaluated = true;
      const hits = known.filter(day => day[key] === true);
      if (!hits.length && !now) continue;
      const labels = [...(now ? [en ? 'now' : 'ahora'] : []), ...hits.map(d => d.label)];
      found.push({
        type: criterion.severity,
        title: `${en ? criterion.effectEn : criterion.effect} — ${listDays(labels, language)}`,
        body: en ? criterion.adviceEn : criterion.advice,
        detail: explanation(criterion, forecastCheck, language),
        when: now ? 'now' : hits[0].isToday ? 'today' : 'next_days',
        rank: 0, family: criterion.event,
      });
    }
  }

  const findings = found
    .filter(f => !found.some(other => other !== f && other.family === f.family
      && (other.rank < f.rank || (other.rank === f.rank && SEVERITY_ORDER[other.type] < SEVERITY_ORDER[f.type]))))
    .sort((a, b) => SEVERITY_ORDER[a.type] - SEVERITY_ORDER[b.type])
    .map(({ rank: _rank, family: _family, ...finding }) => finding);
  return { applicable: true, evaluated, findings };
}
