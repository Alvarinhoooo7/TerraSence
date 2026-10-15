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
export const SPECIES_RULES_VERSION = '2.6.0';

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

// --- Lluvia cerca de la cosecha en hortalizas de fruto ------------------------------------

/** University of Maryland Extension: rajadura por lluvia («rain checking») en varias hortalizas de fruto. */
const UMD_VEGETABLE_CRACKING = (crop: string): SpeciesCriterionEvidence => ({
  institution: 'University of Maryland Extension',
  title: 'Cracking of Vegetables (actualizado el 20 de febrero de 2023)',
  url: 'https://www.extension.umd.edu/node/2473',
  section: '«Rain checking»',
  consultedAt: '2026-10-15',
  originalValue: `Longitudinal and concentric growth cracking also called "rain checking" is caused by soil moisture fluctuations, persistent rainfall, and heavy dews. Melons, cucumbers, eggplant, tomato, and pepper are often affected. Crop listed: ${crop}. Recommended: water plants deeply and regularly; consider harvesting fruits prior to full ripeness during periods of frequent rainfall or heavy dew.`,
});

const RAIN_CRACKING_SCOPE = 'La fuente no fija una cantidad de lluvia ni un porcentaje de pérdida: describe el mecanismo (agua que entra a la fruta por la cicatriz del pedúnculo o grietas de la piel) y recomienda cosechar antes de que la fruta esté totalmente madura en períodos de lluvia frecuente.';
const RAIN_CRACKING_SCOPE_EN = 'The source sets no rainfall amount or loss percentage: it describes the mechanism (water entering the fruit through the stem scar or skin cracks) and advises harvesting before full ripeness during periods of frequent rain.';

/** Rajadura por lluvia cerca de la cosecha: hortaliza de fruto nombrada por UMD en «Cracking of Vegetables». */
const rainCrackingFruit = (crop: string, cropEn: string): SpeciesWeatherEventCriterion =>
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia cerca de la cosecha: riesgo de rajadura del fruto',
    effectEn: 'Rain near harvest: risk of fruit cracking',
    advice: `La lluvia después de un período seco puede rajar el fruto de ${crop} ya maduro. Si hay fruta lista, cosecharla antes de la lluvia reduce la pérdida; después, revisa y cosecha primero la que esté partida.`,
    adviceEn: `Rain after a dry spell can crack ripe ${cropEn} fruit. If fruit is ready, harvesting it before the rain reduces loss; afterward, check the plants and harvest cracked fruit first.`,
    note: 'La fuente documenta rajadura longitudinal o concéntrica por lluvia persistente o rocío abundante, con cambios de humedad del suelo como causa de fondo.',
    noteEn: 'The source documents longitudinal or concentric cracking from persistent rain or heavy dew, with soil moisture swings as the underlying cause.',
    limitations: RAIN_CRACKING_SCOPE, limitationsEn: RAIN_CRACKING_SCOPE_EN,
    evidence: [UMD_VEGETABLE_CRACKING(crop)],
  });

const UDEL_TOMATO_CRACKING: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Fruit Cracking in Tomato (E. Ernest, agosto de 2026)',
  url: 'https://www.udel.edu/content/dam/udelImages/canr/pdfs/extension/factsheets/Fruit-Cracking-in-Tomatoes_A.pdf',
  section: 'Texto completo de la hoja técnica',
  consultedAt: '2026-10-15',
  originalValue: 'Rain during tomato fruit ripening can result in increased fruit cracking in field tomatoes causing extensive losses of marketable fruit. Cracking is most common after heavy rain events but can also occur with irregular irrigation.',
};

const UDEL_BEAN_POD_ROT: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Pythium in Vegetable Production (A. Koehler, Weekly Crop Update, 4 de junio de 2021)',
  url: 'https://sites.udel.edu/weeklycropupdate/?p=18401',
  section: 'Sección sobre poroto verde (snap beans)',
  consultedAt: '2026-10-15',
  originalValue: 'In snap beans, Pythium can be a problem at different stages throughout the season. Cottony leak of pods occurs on mature plants near harvest or postharvest. Cottony leak (Pythium Blight) is typically worse when there is rainy weather with cool temperatures. It is also recommended to avoid harvesting and packing during wet weather.',
};

// --- Lluvia y calor en cosecha de tubérculos y perejil -----------------------------------

const NEBRASKA_POTATO_WET_ROT: SpeciesCriterionEvidence = {
  institution: 'University of Nebraska–Lincoln Extension',
  title: 'Wet Rots of Potato in Storage (G2203, A. D. Pavlista, Extension Potato Specialist, 2013)',
  url: 'https://extensionpubs.unl.edu/publication/g2203/na/pdf/view',
  section: 'Resumen inicial',
  consultedAt: '2026-10-15',
  originalValue: 'Protect stored potatoes from wet rots by digging when the soil is not wet; avoiding bruising when handling; and storing under cool, dry, and well-ventilated conditions.',
};

const MSU_SWEETPOTATO_HARVEST: SpeciesCriterionEvidence = {
  institution: 'Mississippi State University Extension Service',
  title: 'State expects average sweet potato harvest (B. Coblentz, citando a L. Harvey, especialista en camote, 2021)',
  url: 'https://extension.msstate.edu/news/crop-report/2021/state-expects-average-sweet-potato-harvest',
  section: 'Declaraciones de Lorin Harvey sobre lluvia y guarda',
  consultedAt: '2026-10-15',
  originalValue: 'Rainfall at the end of the growing season causes storage problems, such as rot issues. Warm, wet soils increase bacteria and fungus growth in the soils.',
};

const OSU_WINTER_SQUASH_HARVEST: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Plan now to harvest and store pumpkins and winter squash (K. Pokorny, 2023, revisado en 2025)',
  url: 'https://extension.oregonstate.edu/node/153311',
  section: '«Harvest timing»',
  consultedAt: '2026-10-15',
  originalValue: "Pumpkins and squash should be harvested before the weather turns too cold or wet. When temperatures dip below 50°F for more than a week or rain becomes frequent, it's time to bring in your harvest.",
};

const UIUC_CABBAGE_SPLIT: SpeciesCriterionEvidence = {
  institution: 'University of Illinois Extension',
  title: 'Cabbage (Home Vegetable Gardening)',
  url: 'https://extension.illinois.edu/gardening-site/cabbage',
  section: 'Guía de cultivo de repollo, cosecha',
  consultedAt: '2026-10-15',
  originalValue: 'When heads are mature, a sudden heavy rain may cause heads to crack or split wide open. Splitting is caused by the pressure of excessive water taken up after the heads are solid. For highest yield, cut the cabbage heads when they are solid (firm to hand pressure) but before they crack or split.',
};

const UMN_LETTUCE_HEAT: SpeciesCriterionEvidence = {
  institution: 'University of Minnesota Extension',
  title: "What's wrong with my plant? — Lettuce & endive, flowering plant",
  url: 'https://apps.extension.umn.edu/garden/diagnose/plant/vegetable/lettuce%26endive/floweringplant.html',
  section: 'Diagnóstico: planta de lechuga con tallo floral',
  consultedAt: '2026-10-15',
  originalValue: 'Plant produces a flower stalk under multiple days of high temperatures (> 75°F). Lettuce may taste bitter if grown under high temperatures.',
};

const CORNELL_ONION_HARVEST: SpeciesCriterionEvidence = {
  institution: 'Cornell Cooperative Extension, Cornell Vegetable Program',
  title: '«Rolling Onions to "Stop the Rot"» (C. Hoepting, VegEdge, vol. 18, n.° 21, 31 de agosto de 2022)',
  url: 'https://rvpadmin.cce.cornell.edu/pdf/veg_edge/pdf252_pdf.pdf',
  section: 'Ensayo a campo 2021 sobre pudrición bacteriana del bulbo',
  consultedAt: '2026-10-15',
  originalValue: 'In a 2021 on-farm study, we observed numerically 35% less bacterial bulb rot when plants with 40-50% leaf dieback that were "dying standing up" were rolled (4.2%) compared to those that were left standing (6.5%). Splashing rain from heavy rainfall may introduce bacterial pathogens into the neck area and leaf axils of standing onions.',
};

const UARK_PARSLEY: SpeciesCriterionEvidence = {
  institution: 'University of Arkansas Division of Agriculture, Cooperative Extension Service',
  title: 'Parsley (Home Gardening Series, FSA6091, C. R. Andersen, Associate Professor and Extension Specialist)',
  url: 'https://www.uaex.uada.edu/publications/PDF/FSA-6091.pdf',
  section: '«Harvesting» y preguntas frecuentes sobre cosecha prolongada',
  consultedAt: '2026-10-15',
  originalValue: 'If parsley is forced to grow for long periods at temperatures above 90 degrees F, growth is greatly reduced and death may occur.',
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

const WSU_BLUEBERRY_HEAT: SpeciesCriterionEvidence = {
  institution: 'Washington State University Extension',
  title: 'How Does Heat Impact Blueberry Pollination, And Why Does It Matter? (M. Evalt, DeVetter Small Fruit Horticulture Program, WSU NWREC, 2024)',
  url: 'https://extension.wsu.edu/beat-the-heat/?p=527',
  section: 'Efecto del calor sobre el polen, citando a Walters e Isaacs (2023)',
  consultedAt: '2026-10-15',
  originalValue: 'Pollen exposed to air temperatures between 86 and 104°F had reduced pollen germination rates, while tube growth was reduced above 95°F (Walters and Isaacs, 2023).',
};

// --- Fuentes del kiwi ------------------------------------------------------------------

const KIWI_MANUAL = 'Manual de Producción del Kiwi Chileno (2.ª edición, junio de 2011)';
const KIWI_MANUAL_URL = 'https://www.comitedelkiwi.cl/wp-content/uploads/2024/01/manual_prod_cap0_6.pdf';
const KIWI_COMMITTEE = 'Comité del Kiwi (Chile), Comisión de Producción';

const KIWI_FROST: SpeciesCriterionEvidence = {
  institution: KIWI_COMMITTEE,
  title: `${KIWI_MANUAL}, capítulo 3 «Requerimientos agroclimáticos»`,
  url: KIWI_MANUAL_URL,
  section: 'Tabla 3.2 «Temperaturas críticas (heladas) y tejido dañado», p. 02 del capítulo (p. 14 del PDF)',
  consultedAt: '2026-10-15',
  originalValue: 'T° de daño (°C). Brotación: yemas (desde lloro) -8,0 a -4,0; yema algodonosa -1,5 a 2,0; puntas verdes y brotes tiernos -1,0; cáliz partido-flor -0,5. Maduración del fruto: frutos (sección peduncular) y hojas maduras -2,0. (*) Datos para 30 minutos, las temperaturas críticas son más altas (menos negativas) al aumentar el tiempo. Fuente: G. Zuccherelli, Ctifl y M. Kulczewski.',
};

const KIWI_SUMMER: SpeciesCriterionEvidence = {
  institution: KIWI_COMMITTEE,
  title: `${KIWI_MANUAL}, capítulo 3 «Requerimientos agroclimáticos»`,
  url: KIWI_MANUAL_URL,
  section: 'Apartado «3. Verano», p. 08 del capítulo (p. 20 del PDF), y tabla 3.1, p. 02 del capítulo',
  consultedAt: '2026-10-15',
  originalValue: 'Temperaturas mayores a 31 °C que se combinan con viento y baja humedad relativa hacen que la tasa transpiratoria de las hojas se eleve sobre la capacidad de abastecimiento del suelo y la planta, generándose el desorden conocido como «bronceado». Tabla 3.1 (kiwi var. Hayward): temperaturas críticas, máx. verano, período vegetativo (Sep-Abr): 29 con baja humedad relativa.',
};

const KIWI_SOIL: SpeciesCriterionEvidence = {
  institution: KIWI_COMMITTEE,
  title: `${KIWI_MANUAL}, capítulo 4 «Suelos y enmiendas»`,
  url: KIWI_MANUAL_URL,
  section: '«Propiedades químicas», apartado «PH», p. 05 del capítulo (p. 29 del PDF)',
  consultedAt: '2026-10-15',
  originalValue: 'PH. En el kiwi se desea entre 6 y 7.',
};

const WISCONSIN_KIWI: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Extension',
  title: 'Kiwifruit, Actinidia spp. (S. Mahr; última actualización: B. Spangenberg, 2025)',
  url: 'https://hort.extension.wisc.edu/articles/kiwifruit-actinidia-spp/',
  section: 'Requerimientos de sitio y suelo',
  consultedAt: '2026-10-15',
  originalValue: 'The vines do best in a sunny location with well-drained, somewhat acid (pH 5 - 6.5) soil.',
};

const KIWI_BUD_FREEZE: SpeciesCriterionEvidence = {
  institution: 'Scientific Reports (Nature Portfolio), citando a Hewett y Young (1981), New Zealand Journal of Agricultural Research 24: 73–75',
  title: 'Impacts of cold stress and temperature fluctuations on bud abortion and malformed flower development on Hayward kiwifruit (Mirarzgar, Ghasemnezhad, Fotouhi Ghazvini y Jalali Sendi)',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12852680/',
  section: 'Introducción, referencia 32',
  consultedAt: '2026-10-15',
  originalValue: 'In kiwifruit (Actinidia spp.), dormant buds exhibit damage upon exposure to temperatures as low as - 10 °C. However, at advanced phenological stages, even brief exposure (30 min) to - 1.5 °C to - 2.0 °C can damage ~ 10% of floral buds.',
};

const KIWI_EXPOSURE = 'Valores para 30 minutos de exposición: con más tiempo, el daño empieza a temperaturas más altas (menos negativas).';
const KIWI_EXPOSURE_EN = 'Values for 30 minutes of exposure: with longer exposure, damage starts at higher (less negative) temperatures.';

const GROUND_COLDER = 'Cerca del suelo, en noches despejadas, la temperatura puede bajar varios grados más que la mínima pronosticada.';
const GROUND_COLDER_EN = 'Near the ground, on clear nights, temperature can drop several degrees below the forecast minimum.';
const RAIN_RULE = 'La fuente no fija una cantidad de lluvia: cuenta como día con lluvia el que tiene 1 mm o más, o 60 % de probabilidad o más, criterio de planificación de la app.';
const RAIN_RULE_EN = 'The source sets no rainfall amount: a day counts as rainy with 1 mm or more, or a 60% chance or more, which is the app\'s planning rule.';

// --- Fuentes de nuevas especies perennes (Wave 2 - TASK ES6) --------------------------

// Pomáceas y caqui
const CSU_APPLE_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'Apple Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstagesapple.pdf',
  section: 'Tabla «Critical temperatures for apple fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for apple fruit buds. Stage 8 (Full Bloom): Ave. Temp. for 10% Kill 28; Ave. Temp. for 90% Kill 25. For Red Delicious.',
};

const CORNELL_APPLE_PH: SpeciesCriterionEvidence = {
  institution: 'Cornell Cooperative Extension (Eastern NY Commercial Horticulture Program)',
  title: 'Tree Fruit News: Nutrient Management in Apple Orchards for the 2023 Growing Season',
  url: 'https://blogs.cornell.edu/enychp/tree-fruit/apples/tree-fruit-news-nutrient-management-in-apple-orchards-for-the-2023-growing-season/',
  section: 'Recomendaciones de pH del suelo en huertos de manzano',
  consultedAt: '2026-10-15',
  originalValue: 'Soil pH should be maintained in the range of 6.0 to 6.5 throughout the soil profile. For Honeycrisp, target your soil pH between 6.5 and 7.1.',
};

const CSU_PEAR_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'Pear Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstagespear.pdf',
  section: 'Tabla «Critical temperatures for pear fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for pear fruit buds. Stage 7 (Full Bloom): Ave. Temp. for 10% Kill 28; Ave. Temp. for 90% Kill 24. For Bartlett. Anjou is similar but may bloom earlier.',
};

const PENN_STATE_PEAR_PH: SpeciesCriterionEvidence = {
  institution: 'Penn State Agricultural Analytical Services Laboratory',
  title: 'Recommendations for Tree Fruit: Pears (Crop Code 4006)',
  url: 'https://agsci.psu.edu/aasl',
  section: 'Código 4006 PEARS-MAINTAIN',
  consultedAt: '2026-10-15',
  originalValue: '4006 PEARS-MAINTAIN Crop Code: pH Goal: 6.5. Optimum pH for tree fruits is 6.0-6.5.',
};

const NCSU_PERSIMMON_PH: SpeciesCriterionEvidence = {
  institution: 'North Carolina State Extension (N.C. Cooperative Extension)',
  title: 'Japanese Persimmon - Diospyros kaki (Plant Toolbox)',
  url: 'https://plants.ces.ncsu.edu/plants/diospyros-kaki/common-name/japanese-persimmon/',
  section: 'Requerimientos de suelo y pH',
  consultedAt: '2026-10-15',
  originalValue: 'The trees grow best in loamy, moist but well-drained soils with a pH of 6.0 to 6.5 in full sun but thrive on a wide range of soils.',
};

const UCLA_PERSIMMON_HARVEST: SpeciesCriterionEvidence = {
  institution: 'University of California, Los Angeles (Division of Plant Pathology)',
  title: 'Stylar End Checking of the Hachiya Persimmon (P. A. Miller, California Avocado Society Yearbook 1943, 27:53-55)',
  url: 'https://www.avocadosource.com/CAS_Yearbooks/CAS_27_1943/CAS_1943_PG_53-55.pdf',
  section: 'Mecanismo de partidura por lluvia y humedad',
  consultedAt: '2026-10-15',
  originalValue: 'The skin breaks develop during or immediately following humid, foggy or rainy periods during which free moisture collects upon the fruit surface.',
};

const CRFG_LOQUAT_FROST: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Loquat Fruit Facts (Eriobotrya japonica)',
  url: 'https://crfg.org/wiki/fruit/loquat/',
  section: 'Adaptación al frío y temperaturas críticas de flor',
  consultedAt: '2026-10-15',
  originalValue: 'The killing temperature for the flower bud is about 19° F, and for the mature flower about 26° F. At 25° F the seed is killed, causing the fruit to fall. Well established trees can tolerate a low temperature of 12° F.',
};

const CLEMSON_LOQUAT_FROST: SpeciesCriterionEvidence = {
  institution: 'Clemson University Cooperative Extension',
  title: 'Loquat (Eriobotrya japonica) Care, Cultivation & Growing Guide (HGIC)',
  url: 'https://hgic.clemson.edu/factsheet/loquat-eriobotrya-japonica-care-cultivation-growing-guide/',
  section: 'Tolerancia al frío y daño en flores',
  consultedAt: '2026-10-15',
  originalValue: 'Loquat trees are cold hardy to 12 °F, but flowers and developing fruit can be killed when temperatures drop to 27 °F.',
};

// Carozos
const CSU_APRICOT_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'Apricot Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstagesapricot.pdf',
  section: 'Tabla «Critical temperatures for apricot fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for apricot fruit buds. Stage 6 (Full Bloom): Ave. Temp. for 10% Kill 27; Ave. Temp. for 90% Kill 22. First Bloom: 10% Kill 25.',
};

const UNH_STONE_FRUIT_PH: SpeciesCriterionEvidence = {
  institution: 'University of New Hampshire Extension',
  title: 'Growing Fruits: Growing Plums, Cherries and Apricots in NH Home Orchards',
  url: 'https://extension.unh.edu/resource/growing-fruits-growing-plums-cherries-and-apricots-nh-home-orchards',
  section: 'Suelo y pH para frutales de hueso',
  consultedAt: '2026-10-15',
  originalValue: 'The soil pH should be 6.0-7.0 for plums, cherries and apricots.',
};

const MSU_PEACH_FROST: SpeciesCriterionEvidence = {
  institution: 'Michigan State University Extension / Purdue University MRCC',
  title: 'Picture Table of Fruit Freeze Thresholds (citando WSU EB0914)',
  url: 'https://mrcc.purdue.edu/modules/vip/docs/PictureTableFFThresholds.pdf',
  section: 'Peaches - WSU EB0914, Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Peaches - WSU EB0914. Full bloom: 10% kill 27; 90% kill 24.',
};

const UGA_PEACH_PH: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Home Garden Peaches (Circular 1063, D. Chavez y J. Cook)',
  url: 'https://extension.uga.edu/publications/detail.html?number=C1063',
  section: 'Requerimientos de suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Soil pH for peach trees should be between 6 and 6.5.',
};

const UDEL_STONE_FRUIT_CRACK: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Fruit Cracking in Plums, Peaches, and Nectarines (G. Johnson, Weekly Crop Update, julio 2023)',
  url: 'https://sites.udel.edu/weeklycropupdate/?p=22968',
  section: 'Rajado de fruto por exceso de agua y lluvia',
  consultedAt: '2026-10-15',
  originalValue: 'We are seeing fruit cracking in plums, peaches, and nectarines. When the skin of these fruits stays wet for an extended period near ripening, the fruit can absorb so much moisture that it cracks.',
};

const CSU_PLUM_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'European (Prune) Plum Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstageseplum.pdf',
  section: 'Tabla «Critical temperatures for European prune plum fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for European prune plum fruit buds. Stage 7 (Full Bloom): Ave. Temp. for 10% Kill 28; Ave. Temp. for 90% Kill 23.',
};

const MSU_TART_CHERRY_FROST: SpeciesCriterionEvidence = {
  institution: 'Michigan State University Extension / Purdue University MRCC',
  title: 'Picture Table of Fruit Freeze Thresholds (citando MSU Research Report 220)',
  url: 'https://mrcc.purdue.edu/modules/vip/docs/PictureTableFFThresholds.pdf',
  section: 'Tart Cherries - MSU Research Rpt. 220, Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Tart Cherries - MSU Research. Rpt. 220. Full Bloom: 10% kill 28; 90% kill 24.',
};

const UDEL_NECTARINE_CRACK: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Fruit Cracking in Plums, Peaches, and Nectarines (G. Johnson, Weekly Crop Update, julio 2023)',
  url: 'https://sites.udel.edu/weeklycropupdate/?p=22968',
  section: 'Mayor susceptibilidad de nectarinos por piel lisa',
  consultedAt: '2026-10-15',
  originalValue: 'Nectarines are more susceptible to cracking due to the smooth skin. Similar skin cracking can occur in nectarines and peaches.',
};

const UCCE_ALMOND_FROST: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (The Almond Doctor, D. Doll)',
  title: 'Almond Frost Warning and Protection Methods (2018)',
  url: 'https://www.thealmonddoctor.com/almond-frost-warning-protection-methods-2018/',
  section: 'Temperaturas críticas en floración',
  consultedAt: '2026-10-15',
  originalValue: 'At full bloom, temperatures at or below 27-28F can cause crop loss.',
};

const UCCE_ALMOND_PH: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (The Almond Doctor, D. Doll)',
  title: 'Planning and Planting a New Almond Orchard',
  url: 'https://www.thealmonddoctor.com/planning-and-planting-a-new-almond-orchard/',
  section: 'Rango de pH para almendro',
  consultedAt: '2026-10-15',
  originalValue: 'Ideally, the range is between 6.4-7.5, with peach-almond hybrids performing better in alkaline soils.',
};

// Vid
const WSU_GRAPEVINE_FROST: SpeciesCriterionEvidence = {
  institution: 'Washington State University Viticulture & Enology',
  title: 'Grapevine Cold Hardiness (citando Ferguson et al., 2014, AJEV)',
  url: 'https://wine.wsu.edu/extension/cold-hardiness/',
  section: 'Tabla «Frost Cold Tolerance - Post Budbreak», cultivares de Vitis vinifera',
  consultedAt: '2026-10-15',
  originalValue: 'Frost Cold Tolerance - Post Budbreak (°F): 29.8 for Vitis vinifera varieties.',
};

const UCD_GRAPEVINE_HEAT: SpeciesCriterionEvidence = {
  institution: 'University of California, Davis (Department of Viticulture and Enology)',
  title: 'Effect of Heat on Grapevine Production and Fruit Quality (M. K. Bartlett, Progressive Crop Consultant, 2025)',
  url: 'https://progressivecrop.com/2025/03/effect-of-heat-on-grapevine-production-and-fruit-quality/',
  section: 'Impacto de temperaturas sobre 95 °F en floración',
  consultedAt: '2026-10-15',
  originalValue: 'At bloom, temperatures >95 degrees F can interfere with flower fertilization, preventing the pollen from forming the tunnels that allow it to reach the ovary, inducing shatter and berry thinning.',
};

const NCSU_GRAPE_PH: SpeciesCriterionEvidence = {
  institution: 'North Carolina State Extension (N.C. Cooperative Extension)',
  title: "North Carolina Winegrape Grower's Guide, Chapter 9: Vine Nutrition (T. K. Wolf)",
  url: 'https://content.ces.ncsu.edu/north-carolina-winegrape-growers-guide/chapter-9-vine-nutrition',
  section: 'pH de suelo para Vitis vinifera',
  consultedAt: '2026-10-15',
  originalValue: 'Varieties of Vitis vinifera generally grow best at a pH between 6.0 and 7.0, whereas the native American grapes (such as Concord and Niagara) and the hybrids tolerate lower pH values (5.5 to 6.0).',
};

const UW_GRAPE_HARVEST_SPLIT: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Division of Extension (UW Fruit Program)',
  title: 'Berry Splitting in Grapes, Should You Harvest? (A. Atucha, 2020/2021)',
  url: 'https://fruit.wisc.edu/2020/09/17/harvesting-decisions-after-heavy-rains-and-berry-splitting/',
  section: 'Partidura de bayas por lluvias y decisión de cosecha',
  consultedAt: '2026-10-15',
  originalValue: 'All that rain resulted in a significant number of berries splitting. We strongly recommend growers to harvest as soon as possible if more than 20% of the berries in the clusters are split.',
};

// Cítricos
const UF_CITRUS_PH: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Soil and Fertilizer Management for Citrus (EDIS SS666, K. T. Morgan)',
  url: 'https://edis.ifas.ufl.edu/publication/SS666',
  section: 'Rango de pH para cítricos',
  consultedAt: '2026-10-15',
  originalValue: 'Maintain soil pH in the range of 5.8 to 6.5 for citrus trees.',
};

const MSU_CITRUS_COLD: SpeciesCriterionEvidence = {
  institution: 'Mississippi State University Extension Service',
  title: 'Fruit and Nut Review: Citrus (Publication 1779, E. Stafne)',
  url: 'https://extension.msstate.edu/publications/fruit-and-nut-review-citrus',
  section: 'Tabla 1 «Cold hardiness of citrus trees»',
  consultedAt: '2026-10-15',
  originalValue: 'Cold hardiness of citrus trees (°F). Kumquat: 16-17; Satsuma mandarin: 18-20; All other mandarin oranges: 22-23; Orange (Citrus sinensis): 23-24; Grapefruit (Citrus paradisii): 23-24; Lemon: 26-27; Lime (Citrus aurantifolia): 28.',
};

const UCANR_CITRUS_FOOTHILLS: SpeciesCriterionEvidence = {
  institution: 'University of California Agriculture and Natural Resources (UC Cooperative Extension)',
  title: 'Growing Citrus in the Sierra Nevada Foothills (Publication 31-018C, C. Fake)',
  url: 'https://ccfruitandnuts.ucanr.edu/files/238122.pdf',
  section: 'Tolerancia al frío por tipo de cítrico',
  consultedAt: '2026-10-15',
  originalValue: 'Generally, kumquat (18°F) is hardier than Satsuma mandarin (20°F) > Meyer lemon (22°F) > oranges: navel, blood, etc. (24°F) > grapefruit (26°F) > true lemons (Eureka, Lisbon) (28°F) > lime (30°F).',
};

const UF_LEMON_FREEZE: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Lemon Growing in the Florida Home Landscape (EDIS HS402, J. H. Crane)',
  url: 'https://edis.ifas.ufl.edu/publication/HS402',
  section: 'Temperaturas críticas de congelación para limonero',
  consultedAt: '2026-10-15',
  originalValue: 'Defoliated at 22-24°F (-4.4 to -5.6°C), severe wood damaged at 20°F (-6.7°C), flowers and young fruit are killed at 29°F (-1.7°C), and mature fruit damaged at 28°F to 31°F (-2.2°C to -1.8°C).',
};

const UF_TAHITI_LIME_FREEZE: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Growing Tahiti Limes in the Home Landscape (EDIS CH093, J. H. Crane)',
  url: 'https://edis.ifas.ufl.edu/publication/CH093',
  section: 'Tolerancia al frío en lima Tahití',
  consultedAt: '2026-10-15',
  originalValue: 'Damage to Tahiti lime leaves occurs at temperatures below 28°F (-2°C); wood damage occurs below about 26°F (-3°C), and severe damage or death occurs below 24°F (-4°C).',
};

const citrusPh = (): SpeciesPhCriterion => ({
  kind: 'ph', state: 'enabled', stages: GROWING,
  optimum: { min: 5.8, max: 6.5 }, lowerLimit: null, upperLimit: null,
  note: 'El pH del suelo recomendado para cítricos se mantiene en el rango de 5,8 a 6,5.',
  noteEn: 'Recommended soil pH for citrus trees is maintained in the range of 5.8 to 6.5.',
  limitations: 'Recomendación general de UF/IFAS para cítricos comerciales; no desglosa por especie particular dentro del género.',
  limitationsEn: 'General UF/IFAS recommendation for commercial citrus; it does not break down by individual species within the genus.',
  evidence: [UF_CITRUS_PH],
});

// Frutos secos
const OSU_HAZELNUT_FROST: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Growing Hazelnuts in the Pacific Northwest: Introduction (EM 9072, J. Olsen)',
  url: 'https://extension.oregonstate.edu/catalog/em-9072-growing-hazelnuts-pacific-northwest-introduction',
  section: 'Resistencia al frío de amentos y flores femeninas',
  consultedAt: '2026-10-15',
  originalValue: 'Catkins can freeze at 15°F (-9.4°C) when fully elongated. In the most cold-sensitive varieties, the female flowers, which bloom in January and February, can freeze at 10°F (-12.2°C).',
};

const UCCE_WALNUT_FROST: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (Butte County)',
  title: 'Microclimate Considerations and Frost Protection in Walnuts (J. Connell)',
  url: 'https://ccfruitandnuts.ucanr.edu/files/296889.pdf',
  section: 'Temperatura crítica primaveral para hojas, brotes y frutos recién cuajados',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperature for radiation frost damage in spring is 30°F for new leaves, shoots and nutlets.',
};

const UGA_PECAN_FROST: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension (Pecan Team)',
  title: 'Cold Snap Thoughts for Pecan (L. Wells, 2021)',
  url: 'https://site.extension.uga.edu/pecan/2021/04/here-are-some-thoughts-on-the-recent-cold-snap-from-dr-wells/',
  section: 'Daño por helada en tejido verde de pecana',
  consultedAt: '2026-10-15',
  originalValue: 'Green pecan tissue does not suffer long-term or crop damaging injury until temps reach 28 degrees for several hours.',
};

const UGA_PECAN_HARVEST: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Pecan Nut and Kernel Quality (L. Wells, 2015)',
  url: 'https://site.extension.uga.edu/pecan/2015/10/pecan-nut-and-kernel-quality/',
  section: 'Pudriciones de cáscara y humedad en maduración',
  consultedAt: '2026-10-15',
  originalValue: 'Phytophthora shuck rot outbreak following a 15-day period during which rain was recorded on 11 days. Maximum daily temperature exceeded 86°F only once.',
};

const UCCE_PISTACHIO_HEAT: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (Kern County)',
  title: 'Temperature-related variables associated with yield of Kerman pistachio (C. Kallsen, citando HortScience 52:598-605)',
  url: 'https://cekern.ucanr.edu',
  section: 'Efecto de horas sobre 80 °F durante floración',
  consultedAt: '2026-10-15',
  originalValue: 'Hours above 80°F during the bloom window (March 20 to April 25) were negatively correlated with yield.',
};

const QDPI_MACADAMIA_HEAT: SpeciesCriterionEvidence = {
  institution: 'Queensland Department of Primary Industries (Australia)',
  title: 'Effects of temperature on premature nut drop in macadamia (R. A. Stephenson y E. C. Gallagher, 1986)',
  url: 'https://era.dpi.qld.gov.au/id/eprint/11710/',
  section: 'Caída prematura de nueces y temperatura crítica',
  consultedAt: '2026-10-15',
  originalValue: 'It is suggested that 30 deg C might be critical in promoting unacceptable levels of nut drop.',
};

const PURDUE_MACADAMIA_COLD: SpeciesCriterionEvidence = {
  institution: 'Purdue University (New Crops Symposium / ASHS Press)',
  title: 'Macadamia Production in Southern California (L. T. McHargue, 1996)',
  url: 'https://www.hort.purdue.edu/newcrop/proceedings1996/v3-458.html',
  section: 'Tolerancia a heladas en árbol maduro',
  consultedAt: '2026-10-15',
  originalValue: 'Frost damage starts at -2.8°C (27°F), especially if low temperatures persist for several hours.',
};

const UARIZONA_JOJOBA_PH: SpeciesCriterionEvidence = {
  institution: 'University of Arizona Campus Arboretum',
  title: 'Simmondsia chinensis (Snyder Preserve Collection)',
  url: 'https://arboretum.arizona.edu/snyder-preserve-simmondsia-chinensis',
  section: 'Rango de tolerancia de pH',
  consultedAt: '2026-10-15',
  originalValue: 'Soil pH can be in a range between 5-9 (strongly acidic to very alkaline).',
};

// Subtropicales A
const CRFG_CHERIMOYA: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Cherimoya Fruit Facts (Annona cherimola)',
  url: 'https://crfg.org/wiki/fruit/cherimoya/',
  section: 'Clima, temperaturas críticas de helada y pH',
  consultedAt: '2026-10-15',
  originalValue: 'Young growing tips are killed at 29° F and mature trees are killed or severely injured at 25° F. The optimum pH ranges from 6.5 to 7.6.',
};

const CRFG_FEIJOA: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Feijoa Fruit Facts (Acca sellowiana)',
  url: 'https://crfg.org/wiki/fruit/feijoa/',
  section: 'Adaptación climática y pH',
  consultedAt: '2026-10-15',
  originalValue: 'Are generally adapted to areas where temperatures stay above 15° F. Best harvests come from plants growing in well-drained soil with a pH between 5.5 and 7.0.',
};

const UF_POMEGRANATE: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'The Pomegranate (Publication MG056)',
  url: 'https://edis.ifas.ufl.edu/publication/MG056',
  section: 'Heladas, riego, rajado de fruto y pH',
  consultedAt: '2026-10-15',
  originalValue: 'Temperatures down to 12°F (-11°C) may severely injure dormant trees. Optimum growth is in the pH range of 5.5-7.0. Sudden changes in irrigation amounts and timing often lead to fruit splitting, especially a few weeks before harvesting.',
};

const CRFG_POMEGRANATE: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Pomegranate Fruit Facts (Punica granatum)',
  url: 'https://crfg.org/wiki/fruit/pomegranate/',
  section: 'Rajado de fruto por lluvia en madurez',
  consultedAt: '2026-10-15',
  originalValue: 'The tree can be severely injured by temperatures below 12° F. The fruits must be picked before over maturity when they tend to crack open, particularly when rained on.',
};

const UF_GUAVA: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Guava Growing in the Florida Home Landscape (EDIS MG045, J. H. Crane y C. F. Balerdi)',
  url: 'https://edis.ifas.ufl.edu/publication/MG045',
  section: 'Temperaturas críticas de frío y pH de suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Young guava trees may be killed by temperatures of 27° to 28°F (-3° to -2°C). Mature trees may withstand short periods of 25° to 26°F (-4° to -3°C) without much damage. A soil pH of 4.5 to 7 is ideal but plants do well in high pH soils (7-8.5) if supplied with chelated iron materials.',
};

const CRFG_FIG: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Fig Fruit Facts (Ficus carica)',
  url: 'https://crfg.org/wiki/fruit/fig/',
  section: 'Tolerancia a heladas y rajado por lluvia',
  consultedAt: '2026-10-15',
  originalValue: 'Fully dormant trees are hardy to 12° – 15° F, but plants in active growth can be damaged at 30° F. Rains during fruit development and ripening can cause the fruits to split.',
};

const UGUAM_FIG_PH: SpeciesCriterionEvidence = {
  institution: 'University of Guam Cooperative Extension & Outreach',
  title: 'Fig (Ficus carica) Production Guide',
  url: 'https://www.uog.edu/extension/publications/',
  section: 'Requerimientos de suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Fig trees grow best in well-drained soils with a pH of 6 – 6.5 but are tolerant of higher pH levels. It is not tolerant of highly acidic soils.',
};

const FAO_ECOCROP_LUCUMO: SpeciesCriterionEvidence = {
  institution: 'FAO (ECOCROP Data Sheet 8912)',
  title: 'Pouteria lucuma - Agro-climatic data sheet',
  url: 'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=8912',
  section: 'Temperaturas críticas y pH del suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Killing temp. during rest: -5 °C. Killing temp. early growth: 0 °C. Soil PH Optimal Min 6.5 / Max 7.5; Absolute Min 6 / Max 8.5.',
};

// Subtropicales B
const UF_MANGO: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Mango Growing in the Florida Home Landscape (EDIS MG216, J. H. Crane)',
  url: 'https://edis.ifas.ufl.edu/publication/MG216',
  section: 'Temperaturas críticas por etapa',
  consultedAt: '2026-10-15',
  originalValue: 'Flowers and small fruits may be damaged or killed if the temperature falls below 40°F (4.4°C) for a few hours. Young trees may be killed at 29°F to 30°F (-1.7°C to -1.1°C). Mature trees can withstand air temperatures as low as 25°F (-3.9°C) for a few hours.',
};

const FAO_DATE_PALM: SpeciesCriterionEvidence = {
  institution: 'FAO (Plant Production and Protection Paper)',
  title: 'Date Palm Cultivation (A. Zaid y P. F. de Wet)',
  url: 'https://www.fao.org/4/y4360e/y4360e08.htm',
  section: 'Climatic Requirements of Date Palm',
  consultedAt: '2026-10-15',
  originalValue: 'Growth stops below 7°C. At -6°C leaflet margins turn yellow and dry out. Leaves will be damaged at -9 to -15°C. Growth will continue at a stable rate until the temperature reaches 38°C/40°C when it will start decreasing.',
};

const UF_PASSION_FRUIT: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Passion Fruit Growing in the Florida Home Landscape (EDIS HS1467)',
  url: 'https://edis.ifas.ufl.edu/publication/HS1467',
  section: 'pH de suelo y susceptibilidad a bajas temperaturas',
  consultedAt: '2026-10-15',
  originalValue: 'The soil should have a pH of 6–7.5. Exposure to temperatures of 32°F to 59°F can cause chilling injury.',
};

const CRFG_PASSION_FRUIT: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Rare Fruit for Climates with Relatively Frost Free Winters',
  url: 'https://crfg.org/wiki/fruit/passion-fruit/',
  section: 'Cold Hardiness table',
  consultedAt: '2026-10-15',
  originalValue: 'Purple passion fruit (Passiflora edulis) cold hardiness: the mid 20s °F (25° F).',
};

const CRFG_BANANA_PASSION: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Rare Fruit for Climates with Relatively Frost Free Winters',
  url: 'https://crfg.org/wiki/fruit/passion-fruit/',
  section: 'Cold Hardiness table',
  consultedAt: '2026-10-15',
  originalValue: 'Banana passion fruit (P. tripartita var. mollissima) cold hardiness: about 28°F.',
};

const ICAR_OPUNTIA_PH: SpeciesCriterionEvidence = {
  institution: 'Central Soil Salinity Research Institute (ICAR, India)',
  title: 'Performance of edible cactus (Opuntia ficus-indica) in saline environments (Indian J. Agric. Sci. 84:4)',
  url: 'https://epubs.icar.org.in/index.php/IJAgS/article/download/39469/18063',
  section: 'Respuesta al pH del suelo en Opuntia ficus-indica',
  consultedAt: '2026-10-15',
  originalValue: 'Plant height reduced significantly with increase in pH from 7.8 to 9.0 and then to 9.4 and 9.8. There was no cladode formation at pH 9.8.',
};

const FRONTIERS_PAPAYO: SpeciesCriterionEvidence = {
  institution: 'Frontiers in Plant Science (citando Letelier et al. 2020, PMC7348657)',
  title: 'Southern Species From the Biodiversity Hotspot of Central Chile (Vasconcellea pubescens)',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7348657/',
  section: 'Sección Mountain Papaya',
  consultedAt: '2026-10-15',
  originalValue: 'V. pubescens is sensitive to cold: the stem and leaves could be affected leading to complete plant death when temperatures fall below 2°C (36°F).',
};

const CAC_AVOCADO_FREEZE: SpeciesCriterionEvidence = {
  institution: 'California Avocado Commission',
  title: 'Effects of Freezes on Avocado Trees',
  url: 'https://californiaavocadogrowers.com/cultural-management-library/effects-freezes-avocado-trees/',
  section: 'Sensibilidad al frío por variedad',
  consultedAt: '2026-10-15',
  originalValue: 'General temperature indications: Hass (25˚ to 29˚ F). Young trees are most susceptible to freeze conditions.',
};

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
    rainCrackingFruit('la berenjena', 'eggplant'),
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
    weatherEvent(['cosecha'], 'rain', {
      severity: 'warning',
      effect: 'Lluvia en cosecha: favorece pudriciones del camote en guarda',
      effectEn: 'Rain at harvest: favors sweet potato rot in storage',
      advice: 'La lluvia al final del cultivo deja el suelo cálido y mojado, lo que favorece hongos y bacterias que pudren el camote guardado. Si puedes, espera a que el suelo se seque antes de cosechar.',
      adviceEn: 'Rain at the end of the season leaves the soil warm and wet, which favors fungi and bacteria that rot stored sweet potato. If you can, wait for the soil to dry before harvesting.',
      note: 'La especialista indica que la lluvia al final de la temporada causa problemas de guarda, como pudriciones, porque los suelos cálidos y mojados favorecen el crecimiento de bacterias y hongos.',
      noteEn: 'The specialist states that rainfall at the end of the season causes storage problems such as rot, because warm, wet soils favor bacteria and fungus growth.',
      limitations: 'Declaración de manejo de una especialista de extensión sobre una temporada particular de lluvias intensas; no fija una cantidad de lluvia ni un plazo exacto.',
      limitationsEn: 'Management statement from an extension specialist about a particular season of heavy rain; it sets no rainfall amount or exact timeframe.',
      evidence: [MSU_SWEETPOTATO_HARVEST],
    }),
    salt('Sweet potato (Ipomoea batatas)', 1.5, 'moderately_sensitive')),
  annual('sp.cebolla', umdVegetable('Onions - green, bulb, scallions', 6.5, 6.0),
    frostTolerant(28, [inia165('tolerant'), nebraska('tolerant', 'onion'), sdsu('light', 'Onion, Garlic, Chives')],
      'INIA la clasifica entre las que toleran heladas; el mínimo de 28 °F es el que documentan las fuentes de Estados Unidos.',
      'INIA lists it among frost-tolerant crops; the 28 °F minimum is the one documented by the US sources.'),
    weatherEvent(['cosecha'], 'rain', {
      severity: 'warning',
      effect: 'Lluvia cerca de la cosecha: la cebolla en pie queda más expuesta a pudrición bacteriana',
      effectEn: 'Rain near harvest: standing onions are more exposed to bacterial rot',
      advice: 'La lluvia que salpica el cuello de la cebolla madura y en pie puede meter bacterias y pudrir el bulbo guardado. Si ya está lista, prioriza sacarla antes de que llueva mucho.',
      adviceEn: 'Rain splashing the neck of mature, standing onion plants can introduce bacteria and rot the bulb in storage. If it is already ready, prioritize pulling it before heavy rain.',
      note: 'Un ensayo de Cornell encontró menos pudrición bacteriana del bulbo (4,2 %) en cebollas volcadas antes de la lluvia que en las dejadas en pie (6,5 %); la lluvia que salpica puede introducir bacterias por el cuello.',
      noteEn: 'A Cornell trial found less bacterial bulb rot (4.2%) in onions rolled before the rain than in those left standing (6.5%); splashing rain can introduce bacteria through the neck.',
      limitations: 'Un solo ensayo a campo en Nueva York, una variedad y una temporada; la diferencia es numérica, no declarada estadísticamente significativa por el propio boletín. No se pronostica salpicadura ni intensidad, sólo si el día cuenta como lluvioso.',
      limitationsEn: 'A single on-farm trial in New York, one variety and one season; the difference is numeric, not stated as statistically significant by the bulletin itself. Splash and intensity are not forecast, only whether the day counts as rainy.',
      evidence: [CORNELL_ONION_HARVEST],
    }),
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
    airMax(['cosecha'], 'above', fromF(75), {
      severity: 'warning',
      effect: 'Calor sobre 23,9 °C: la lechuga puede amargar y espigar',
      effectEn: 'Heat above 23.9 °C: lettuce may turn bitter and bolt',
      advice: 'Varios días de calor sobre 23,9 °C pueden hacer que la lechuga espigue y amargue. Si está lista, prioriza cosecharla antes de que eso avance.',
      adviceEn: 'Several days of heat above 23.9 °C can make lettuce bolt and turn bitter. If it is ready, prioritize harvesting before that progresses.',
      note: 'La fuente indica que varios días seguidos sobre 75 °F (23,9 °C) hacen que la planta forme tallo floral, y que la lechuga puede amargar con calor.',
      noteEn: 'The source states that several consecutive days above 75 °F (23.9 °C) make the plant form a flower stalk, and that lettuce may turn bitter with heat.',
      limitations: 'La fuente no especifica cuántos días consecutivos cuentan como "varios"; se compara la máxima diaria pronosticada contra este umbral. No distingue variedades, que cambian en tolerancia al calor.',
      limitationsEn: 'The source does not specify how many consecutive days count as "multiple"; the forecast daily maximum is compared against this threshold. It does not distinguish between varieties, which vary in heat tolerance.',
      evidence: [UMN_LETTUCE_HEAT],
    }),
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
    rainCrackingFruit('el melón', 'melon'),
    salt('Muskmelon (Cucumis melo)', null, 'moderately_sensitive')),
  annual('sp.pepino', umdVegetable('Cucumber', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'cucumber'), sdsu('none', 'Cucurbits: Cucumbers, summer squash, melons')]),
    rainCrackingFruit('el pepino', 'cucumber'),
    salt('Cucumber (Cucumis sativus)', 2.5, 'moderately_sensitive')),
  annual('sp.perejil', umdVegetable('Parsley', 6.5, 6.0),
    frostTolerant(28, [sdsu('light', 'Parsley'), INIA_1998_FROST], '', '', GROWING),
    frostNearMaturity(),
    airMax(['cosecha'], 'above', fromF(90), {
      severity: 'warning',
      effect: 'Calor sostenido sobre 32 °C: puede detener el crecimiento del perejil que sigues cosechando',
      effectEn: 'Sustained heat above 32 °C: may stop growth of parsley you keep harvesting',
      advice: 'Si el calor sobre 32 °C se mantiene varios días, el perejil crece mucho más lento y puede morir. Si puedes, dale sombra o más riego mientras dura el calor.',
      adviceEn: 'If heat above 32 °C lasts several days, parsley grows much more slowly and can die. If you can, give it shade or more water while the heat lasts.',
      note: 'La fuente indica que si el perejil se fuerza a crecer por períodos largos sobre 90 °F (32,2 °C), el crecimiento se reduce mucho y puede morir.',
      noteEn: 'The source states that if parsley is forced to grow for long periods above 90 °F (32.2 °C), growth is greatly reduced and death may occur.',
      limitations: 'La fuente habla de períodos largos de calor sostenido en una plantación que se sigue cosechando hoja por hoja, no de un solo día de máxima; el pronóstico sólo compara la máxima diaria.',
      limitationsEn: 'The source refers to long periods of sustained heat on a planting that keeps being picked leaf by leaf, not a single day\'s maximum; the forecast only compares the daily maximum.',
      evidence: [UARK_PARSLEY],
    })),
  annual('sp.pimiento', umdVegetable('Peppers', 6.5, 6.0),
    frostTender([inia165('none'), nebraska('tender', 'pepper'), sdsu('none', 'Pepper, eggplant')]),
    pollinationHeat(75, WARM_NIGHT_NOTE, WARM_NIGHT_NOTE_EN),
    rainCrackingFruit('el pimiento', 'pepper'),
    salt('Pepper (Capsicum annuum)', 1.5, 'moderately_sensitive')),
  annual('sp.poroto', umdVegetable('Beans - lima, snap', 6.2, 6.0,
    'La fila corresponde a poroto verde y pallar; la fuente no trata el poroto de grano seco.',
    'The row covers snap and lima beans; the source does not cover dry beans.'),
  frostTender([inia165('none'), nebraska('tender', 'beans (Lima & snap)'), sdsu('none', 'Beans')]),
  pollinationHeat(68,
    'La fuente cita una investigación de la Universidad de Delaware: en poroto verde, noches sobre 68 °F (20 °C) causaron problemas de polinización.',
    'The source cites University of Delaware research: in snap beans, nights above 68 °F (20 °C) caused pollination problems.'),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia fría cerca de la cosecha: riesgo de pudrición de la vaina',
    effectEn: 'Cool rain near harvest: risk of pod rot',
    advice: 'Con lluvia y frío cerca de la cosecha las vainas maduras pueden pudrirse (pudrición algodonosa). Evita cosechar o embalar con las plantas mojadas.',
    adviceEn: 'With cool rain near harvest, mature pods can rot (cottony leak). Avoid harvesting or packing while plants are wet.',
    note: 'La fuente documenta que la pudrición algodonosa (Pythium) ocurre en plantas maduras cerca de la cosecha o después, y que es más frecuente con lluvia y temperaturas frescas.',
    noteEn: 'The source documents that cottony leak (Pythium) occurs on mature plants near or after harvest, and is more common with rain and cool temperatures.',
    limitations: 'La fuente no da una cantidad de lluvia; describe el riesgo de forma cualitativa y recomienda evitar cosechar o embalar en clima húmedo.',
    limitationsEn: 'The source gives no rainfall amount; it describes the risk qualitatively and recommends avoiding harvest or packing in wet weather.',
    evidence: [UDEL_BEAN_POD_ROT],
  }),
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
    weatherEvent(['cosecha'], 'rain', {
      severity: 'warning',
      effect: 'Lluvia en cosecha: riesgo de que la cabeza se raje',
      effectEn: 'Rain at harvest: risk of head splitting',
      advice: 'Con la cabeza firme y lluvia fuerte en camino, el repollo puede absorber agua de golpe y rajarse. Si ya está firme y lista, considera cosecharla antes de la lluvia.',
      adviceEn: 'With a firm head and heavy rain on the way, cabbage can take up water quickly and split. If it is already firm and ready, consider harvesting before the rain.',
      note: 'La fuente indica que una lluvia fuerte sobre una cabeza madura puede rajarla, porque la presión del agua absorbida de golpe rompe el tejido ya firme.',
      noteEn: 'The source states that heavy rain on a mature head can split it, because the pressure from water taken up suddenly breaks the already-firm tissue.',
      limitations: `${RAIN_RULE} La fuente no fija una cantidad de lluvia; «lluvia fuerte» es su propio término, no un umbral medido.`,
      limitationsEn: `${RAIN_RULE_EN} The source sets no rainfall amount; "heavy rain" is its own term, not a measured threshold.`,
      evidence: [UIUC_CABBAGE_SPLIT],
    }),
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
    weatherEvent(['cosecha'], 'rain', {
      severity: 'warning',
      effect: 'Lluvia frecuente en cosecha: conviene traer el zapallo guardado antes de que se moje',
      effectEn: 'Frequent rain at harvest: bring winter squash in before it gets wet',
      advice: 'Cosecha el zapallo de guarda antes de que el tiempo se vuelva lluvioso: la fruta mojada o con humedad se pudre más fácil en la guarda. Si ya está maduro, cosecha antes de la lluvia y guárdalo seco.',
      adviceEn: 'Harvest winter squash before the weather turns rainy: wet or damp fruit rots more easily in storage. If it is already mature, harvest before the rain and store it dry.',
      note: 'La fuente indica traer la cosecha cuando la lluvia se vuelve frecuente, porque el zapallo de guarda debe cosecharse antes de que el clima se ponga húmedo.',
      noteEn: 'The source advises bringing in the harvest once rain becomes frequent, because winter squash should be picked before the weather turns wet.',
      limitations: `${RAIN_RULE} Es guía de manejo de cosecha y guarda, no un umbral de daño agronómico medido; no distingue variedades de zapallo de guarda.`,
      limitationsEn: `${RAIN_RULE_EN} It is harvest and storage management guidance, not a measured agronomic damage threshold; it does not distinguish winter squash varieties.`,
      evidence: [OSU_WINTER_SQUASH_HARVEST],
    }),
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
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en cosecha: suelo mojado favorece pudriciones de la papa',
    effectEn: 'Rain at harvest: wet soil favors potato rot',
    advice: 'Cosechar con el suelo mojado golpea y rasga más la piel de la papa, y esas heridas dejan entrar las pudriciones húmedas. Si puedes, espera a que el suelo se seque.',
    adviceEn: 'Digging when the soil is wet bruises and skins the potatoes more, and those wounds let wet rots in. If you can, wait for the soil to dry.',
    note: 'La fuente indica proteger las papas de las pudriciones húmedas cosechando cuando el suelo no está mojado, evitando golpes al manipularlas y guardándolas frescas, secas y ventiladas.',
    noteEn: 'The source advises protecting potatoes from wet rots by digging when the soil is not wet, avoiding bruising when handling, and storing them cool, dry and well ventilated.',
    limitations: 'Recomendación general de manejo de cosecha y guarda; no fija una cantidad de lluvia ni distingue variedad. La humedad del suelo que mide la sonda es puntual y no certifica que el resto del paño esté igual.',
    limitationsEn: 'General harvest and storage management advice; it sets no rainfall amount and does not distinguish variety. The soil moisture the probe measures is local and does not certify the rest of the field is the same.',
    evidence: [NEBRASKA_POTATO_WET_ROT],
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
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia cerca de la cosecha: riesgo de rajadura del tomate',
    effectEn: 'Rain near harvest: risk of tomato cracking',
    advice: 'La lluvia después de un período seco puede rajar el tomate maduro, sobre todo si llueve fuerte. Si hay fruta lista, cosecharla antes de la lluvia reduce la pérdida; después, revisa y cosecha primero la que esté partida.',
    adviceEn: 'Rain after a dry spell can crack ripe tomatoes, especially with heavy rain. If fruit is ready, harvesting it before the rain reduces loss; afterward, check the plants and harvest cracked fruit first.',
    note: 'La fuente documenta que la lluvia durante la maduración aumenta la rajadura y las pérdidas de fruta comercial, sobre todo tras lluvia fuerte.',
    noteEn: 'The source documents that rain during ripening increases cracking and losses of marketable fruit, especially after heavy rain.',
    limitations: RAIN_CRACKING_SCOPE, limitationsEn: RAIN_CRACKING_SCOPE_EN,
    evidence: [UDEL_TOMATO_CRACKING],
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
  airMax(['floracion'], 'above', fromF(95), {
    severity: 'warning',
    effect: 'Calor sobre 35 °C en floración: puede reducir la viabilidad del polen',
    effectEn: 'Heat above 35 °C during flowering: may reduce pollen viability',
    advice: 'Con calor sobre 35 °C el polen del arándano germina y crece peor, así que puede cuajar menos fruta. No hay nada que corregir en el momento; revisa la cuaja en los días siguientes.',
    adviceEn: 'With heat above 35 °C blueberry pollen germinates and grows worse, so fewer fruit may set. There is nothing to fix in the moment; check fruit set over the following days.',
    note: 'La investigación citada encontró menor germinación de polen entre 86 y 104 °F (30 a 40 °C) y menor crecimiento del tubo polínico sobre 95 °F (35 °C).',
    noteEn: 'The cited research found reduced pollen germination between 86 and 104 °F (30 to 40 °C) and reduced pollen tube growth above 95 °F (35 °C).',
    limitations: 'Investigación de laboratorio sobre polen expuesto a temperatura de aire controlada, resumida por extensión universitaria; no mide cuaja de campo ni distingue cultivares. Se usa 95 °F porque es el umbral exacto más bajo que la fuente documenta.',
    limitationsEn: 'Laboratory research on pollen exposed to controlled air temperature, summarized by university extension; it does not measure field fruit set or distinguish cultivars. 95 °F is used because it is the lowest exact threshold the source documents.',
    evidence: [WSU_BLUEBERRY_HEAT],
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
  perennial('sp.kiwi', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 7.0 }, lowerLimit: null, upperLimit: null,
    note: 'El pH deseado para el kiwi en Chile es 6 a 7.',
    noteEn: 'The desired pH for kiwifruit in Chile is 6 to 7.',
    limitations: 'La fuente chilena sólo da el rango deseado, sin límites donde documente un problema, así que fuera de él no se advierte. University of Wisconsin–Madison Extension recomienda un suelo algo ácido, pH 5 a 6,5, para varias especies de Actinidia: ambas coinciden entre 6 y 6,5. No se promedian; se usa la fuente chilena.',
    limitationsEn: 'The Chilean source only gives the desired range, with no limits where it documents a problem, so no warning is raised outside it. University of Wisconsin-Madison Extension recommends a somewhat acid soil, pH 5 to 6.5, for several Actinidia species: both agree between 6 and 6.5. They are not averaged; the Chilean source is used.',
    evidence: [KIWI_SOIL, WISCONSIN_KIWI],
  },
  airMin(['vegetativo'], 'at_or_below', celsius(-1), {
    severity: 'warning',
    effect: 'Helada en brotación: daña puntas verdes y brotes tiernos del kiwi',
    effectEn: 'Frost at budbreak injures green tips and tender kiwifruit shoots',
    advice: 'Desde −1 °C se dañan las puntas y los brotes nuevos del kiwi. Si tienes control de heladas, prepáralo para esa noche.',
    adviceEn: 'From −1 °C kiwifruit green tips and new shoots are damaged. If you have frost protection, get it ready for that night.',
    note: 'En la tabla de temperaturas críticas del Comité del Kiwi, las puntas verdes y los brotes tiernos se dañan a −1,0 °C; las yemas desde el lloro, entre −8,0 y −4,0 °C, y la yema algodonosa, desde −1,5 °C.',
    noteEn: 'In the Chilean Kiwifruit Committee critical temperature table, green tips and tender shoots are injured at −1.0 °C; buds from bleeding onward, between −8.0 and −4.0 °C, and woolly buds, from −1.5 °C.',
    limitations: `${KIWI_EXPOSURE} ${GROUND_COLDER} El criterio describe la brotación de primavera; en pleno verano los brotes ya no están tiernos. En la fila de yema algodonosa la tabla imprime «-1,5 a 2,0», sin signo en la segunda cifra, y esa cifra no se usa. La tabla no indica variedad ni distingue kiwi amarillo o baby kiwi.`,
    limitationsEn: `${KIWI_EXPOSURE_EN} ${GROUND_COLDER_EN} The criterion describes spring budbreak; by midsummer shoots are no longer tender. In the woolly bud row the table prints "-1.5 to 2.0", with no sign on the second figure, and that figure is not used. The table names no variety and does not separate gold or baby kiwifruit.`,
    evidence: [KIWI_FROST],
  }),
  airMax(['vegetativo'], 'above', celsius(31), {
    severity: 'info',
    effect: 'Calor sobre 31 °C: con viento y aire seco, riesgo de «bronceado» en las hojas del kiwi',
    effectEn: 'Heat above 31 °C: with wind and dry air, risk of kiwifruit leaf bronzing',
    advice: 'Sobre 31 °C, si además hay viento y aire seco, la hoja del kiwi pierde más agua de la que la planta alcanza a reponer y se quema. Revisa que el riego esté al día esos días.',
    adviceEn: 'Above 31 °C, if there is also wind and dry air, kiwifruit leaves lose more water than the plant can replace and get scorched. Check that irrigation is up to date on those days.',
    note: 'El Comité del Kiwi indica que temperaturas mayores a 31 °C combinadas con viento y baja humedad relativa elevan la transpiración de las hojas sobre lo que el suelo y la planta alcanzan a abastecer, y producen el desorden conocido como «bronceado».',
    noteEn: 'The Chilean Kiwifruit Committee states that temperatures above 31 °C combined with wind and low relative humidity raise leaf transpiration beyond what soil and plant can supply, causing the disorder known as bronzing.',
    limitations: 'Es sólo informativo: el daño descrito exige calor, viento y aire seco juntos, y el pronóstico que usa la app no compara viento ni humedad. La tabla 3.1 del mismo manual da 29 °C con baja humedad relativa como máxima crítica de verano para la variedad Hayward; se usa 31 °C, la cifra del texto que describe el daño. La fuente no indica cuántas horas de calor lo producen.',
    limitationsEn: 'It is informative only: the described damage requires heat, wind and dry air together, and the forecast used by the app does not compare wind or humidity. Table 3.1 of the same manual gives 29 °C with low relative humidity as the critical summer maximum for Hayward; 31 °C is used, the figure in the text that describes the damage. The source does not state how many hours of heat cause it.',
    evidence: [KIWI_SUMMER],
  }),
  airMin(['floracion'], 'at_or_below', celsius(-0.5), {
    severity: 'warning',
    effect: 'Helada en floración: daña la flor del kiwi',
    effectEn: 'Frost during flowering injures kiwifruit blossoms',
    advice: 'Desde −0,5 °C se dañan las flores abiertas del kiwi, y los botones florales desde −1,5 °C. Si tienes control de heladas, prepáralo para esa noche.',
    adviceEn: 'From −0.5 °C open kiwifruit flowers are damaged, and flower buds from −1.5 °C. If you have frost protection, get it ready for that night.',
    note: 'En la tabla del Comité del Kiwi, el cáliz partido y la flor se dañan a −0,5 °C, la temperatura crítica más alta de la tabla. Un estudio neozelandés citado en Scientific Reports encontró que, en estados avanzados, 30 minutos a −1,5 o −2,0 °C dañan cerca del 10 % de las yemas florales.',
    noteEn: 'In the Chilean Kiwifruit Committee table, split calyx and flower are injured at −0.5 °C, the highest critical temperature in the table. A New Zealand study cited in Scientific Reports found that, at advanced stages, 30 minutes at −1.5 or −2.0 °C injure about 10% of floral buds.',
    limitations: `${KIWI_EXPOSURE} ${GROUND_COLDER} El estudio neozelandés (Hewett y Young, 1981) se leyó a través de la revisión publicada en Scientific Reports; el artículo original no estuvo disponible.`,
    limitationsEn: `${KIWI_EXPOSURE_EN} ${GROUND_COLDER_EN} The New Zealand study (Hewett and Young, 1981) was read through the review published in Scientific Reports; the original article was not available.`,
    evidence: [KIWI_FROST, KIWI_BUD_FREEZE],
  }),
  airMin(['cosecha'], 'at_or_below', celsius(-2), {
    severity: 'warning',
    effect: 'Helada con el kiwi en maduración: daña el fruto y las hojas maduras',
    effectEn: 'Frost while kiwifruit ripens injures fruit and mature leaves',
    advice: 'Desde −2 °C se daña la fruta del kiwi junto al pedúnculo, y también las hojas maduras. Si la fruta ya está lista, considera cosecharla antes de la helada.',
    adviceEn: 'From −2 °C kiwifruit is damaged next to the stalk, and so are mature leaves. If the fruit is ready, consider picking it before the frost.',
    note: 'En la tabla del Comité del Kiwi, durante la maduración del fruto la sección peduncular del fruto y las hojas maduras se dañan a −2,0 °C.',
    noteEn: 'In the Chilean Kiwifruit Committee table, during fruit ripening the stalk end of the fruit and mature leaves are injured at −2.0 °C.',
    limitations: `${KIWI_EXPOSURE} ${GROUND_COLDER} La fuente no documenta un umbral de lluvia en cosecha para el kiwi, así que esa etapa sólo compara la helada.`,
    limitationsEn: `${KIWI_EXPOSURE_EN} ${GROUND_COLDER_EN} The source documents no rain threshold at harvest for kiwifruit, so this stage only compares frost.`,
    evidence: [KIWI_FROST],
  })),
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
perennial('sp.manzano', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 6.5 }, lowerLimit: null, upperLimit: null,
    note: 'El pH del suelo debe mantenerse en el rango de 6,0 a 6,5 en todo el perfil del huerto.',
    noteEn: 'Soil pH should be maintained in the range of 6.0 to 6.5 throughout the orchard soil profile.',
    limitations: 'Cornell Cooperative Extension recomienda 6,0 a 6,5 para huertos comerciales en general. Para el cultivar Honeycrisp sugiere 6,5 a 7,1, pero no se distingue por variedad en el motor.',
    limitationsEn: 'Cornell Cooperative Extension recommends 6.0 to 6.5 for commercial orchards in general. For Honeycrisp it suggests 6.5 to 7.1, but varieties are not separated in the engine.',
    evidence: [CORNELL_APPLE_PH],
  },
  airMin(['floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de daño en flores de manzano',
    effectEn: 'Frost during flowering: risk of apple blossom injury',
    advice: 'Desde −2,2 °C se daña cerca del 10 % de las flores abiertas del manzano, y bajo −3,9 °C el daño alcanza al 90 %. Si cuentas con control de heladas, prepáralo para esa noche.',
    adviceEn: 'From −2.2 °C about 10% of open apple blossoms are damaged, and below −3.9 °C damage reaches 90%. If you have frost protection, get it ready for that night.',
    note: 'En plena floración (Full Bloom) se produce 10 % de mortalidad de yemas y flores a 28 °F (−2,2 °C) y 90 % a 25 °F (−3,9 °C) tras 30 minutos de exposición.',
    noteEn: 'At full bloom 10% bud and flower mortality occurs at 28 °F (−2.2 °C) and 90% at 25 °F (−3.9 °C) after 30 minutes of exposure.',
    limitations: 'Valores para 30 minutos de exposición en Red Delicious. Golden Delicious y Winesap resisten cerca de 1 °F menos antes de caída de pétalos. Tras la caída de pétalos todas las variedades presentan sensibilidad similar.',
    limitationsEn: 'Values for 30 minutes of exposure in Red Delicious. Golden Delicious and Winesap withstand about 1 °F less before petal fall. After petal fall all varieties show similar sensitivity.',
    evidence: [CSU_APPLE_FROST],
  })),
  perennial('sp.peral', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 6.5 }, lowerLimit: null, upperLimit: null,
    note: 'El pH objetivo documentado para peral es 6,5, dentro del rango óptimo general de 6,0 a 6,5 para frutales de árbol.',
    noteEn: 'The documented target pH for pear is 6.5, within the general optimum range of 6.0 to 6.5 for tree fruits.',
    limitations: 'Recomendación del laboratorio de suelos de Penn State para huertos en mantención (código 4006); no fija límites de daño fuera del rango.',
    limitationsEn: 'Penn State soil lab recommendation for maintained orchards (code 4006); it sets no damage limits outside the range.',
    evidence: [PENN_STATE_PEAR_PH],
  },
  airMin(['floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de daño en flores de peral',
    effectEn: 'Frost during flowering: risk of pear blossom injury',
    advice: 'Desde −2,2 °C se daña cerca del 10 % de las flores de peral en plena floración, y bajo −4,4 °C el daño llega al 90 %. Si dispones de control de heladas, prepáralo.',
    adviceEn: 'From −2.2 °C about 10% of pear blossoms in full bloom are damaged, and below −4.4 °C damage reaches 90%. If you have frost protection, get it ready.',
    note: 'En plena floración (Full Bloom) se produce 10 % de mortalidad a 28 °F (−2,2 °C) y 90 % a 24 °F (−4,4 °C) tras 30 minutos de exposición en Bartlett.',
    noteEn: 'At full bloom 10% mortality occurs at 28 °F (−2.2 °C) and 90% at 24 °F (−4.4 °C) after 30 minutes of exposure in Bartlett.',
    limitations: 'Datos de WSU para la variedad Bartlett expuesta 30 minutos. Anjou presenta temperaturas críticas similares aunque suele florecer antes.',
    limitationsEn: 'WSU data for Bartlett exposed for 30 minutes. Anjou shows similar critical temperatures although it usually blooms earlier.',
    evidence: [CSU_PEAR_FROST],
  })),
  perennial('sp.caqui', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 6.5 }, lowerLimit: null, upperLimit: null,
    note: 'El caqui se desarrolla mejor con un pH de suelo de 6,0 a 6,5.',
    noteEn: 'Persimmon grows best in soils with a pH of 6.0 to 6.5.',
    limitations: 'Guía de NC State Extension; señala que el árbol tolera una amplia variedad de suelos bien drenados sin fijar límites de toxicidad.',
    limitationsEn: 'NC State Extension guide; notes that the tree tolerates a wide range of well-drained soils without setting toxicity limits.',
    evidence: [NCSU_PERSIMMON_PH],
  },
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en maduración del caqui: riesgo de partidura apical del fruto',
    effectEn: 'Rain during persimmon ripening: risk of fruit stylar end checking',
    advice: 'La lluvia o humedad libre sobre el caqui maduro produce pequeñas grietas en la piel del fruto. Si la fruta está lista, cosecha antes de la lluvia.',
    adviceEn: 'Rain or free moisture on ripening persimmon causes small skin cracks on the fruit. If fruit is ready, harvest before the rain.',
    note: 'Estudios de patología vegetal de UCLA en caqui Hachiya demuestran que períodos húmedos, de niebla o lluvia generan partiduras apicales en frutos cercanos a cosecha cuando el agua libre se deposita en la superficie.',
    noteEn: 'Plant pathology studies by UCLA on Hachiya persimmon demonstrate that humid, foggy or rainy periods cause stylar end skin cracks near harvest when free moisture collects on the fruit surface.',
    limitations: 'Estudio clásico de UCLA enfocado en la variedad Hachiya; el daño ocurre con agua libre sobre el fruto por 24 horas en ambiente húmedo. La app usa el pronóstico de lluvia como aviso preventivo.',
    limitationsEn: 'Classic UCLA study focused on Hachiya persimmon; injury develops with free moisture on fruit for 24 hours in a humid atmosphere. The app uses the rain forecast as a preventive notice.',
    evidence: [UCLA_PERSIMMON_HARVEST],
  })),
  perennial('sp.nispero', airMin(['floracion'], 'at_or_below', fromF(26), {
    severity: 'warning',
    effect: 'Helada en floración: daña flores maduras y cuaja del níspero',
    effectEn: 'Frost during flowering injures mature loquat blossoms and fruit set',
    advice: 'Desde −3,3 °C se dañan las flores maduras del níspero y a −3,9 °C se dañan las semillas del fruto recién cuajado, provocando su caída. Protege los árboles si se prevé helada.',
    adviceEn: 'From −3.3 °C mature loquat blossoms are killed and at −3.9 °C seeds of newly set fruit are damaged, causing fruit drop. Protect trees if frost is forecast.',
    note: 'CRFG documenta muerte de flores maduras a 26 °F (−3,3 °C), muerte de semillas en fruto cuajado a 25 °F (−3,9 °C) y daño en botones florales a 19 °F (−7,2 °C). Clemson Extension señala daño a 27 °F (−2,8 °C).',
    noteEn: 'CRFG documents killing of mature flowers at 26 °F (−3.3 °C), seed death in developing fruit at 25 °F (−3.9 °C), and flower bud injury at 19 °F (−7.2 °C). Clemson Extension reports injury at 27 °F (−2.8 °C).',
    limitations: 'El níspero florece a fines de otoño e invierno, por lo que su floración coincide con el período invernal. Se adopta 26 °F de CRFG como umbral de advertencia, contrastado con 27 °F de Clemson.',
    limitationsEn: 'Loquat blooms in late autumn and winter, so its flowering coincides with cold winter weather. CRFG 26 °F is adopted as the warning threshold, contrasted with Clemson 27 °F.',
    evidence: [CRFG_LOQUAT_FROST, CLEMSON_LOQUAT_FROST],
  })),
  perennial('sp.damasco', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 7.0 }, lowerLimit: null, upperLimit: null,
    note: 'El pH del suelo recomendado para damasco se ubica entre 6,0 y 7,0.',
    noteEn: 'The recommended soil pH for apricot is between 6.0 and 7.0.',
    limitations: 'UNH Extension entrega un rango conjunto de 6,0 a 7,0 para ciruelos, guindos y damascos sin desglosar por especie.',
    limitationsEn: 'UNH Extension gives a shared 6.0 to 7.0 range for plums, cherries and apricots without breaking down by species.',
    evidence: [UNH_STONE_FRUIT_PH],
  },
  airMin(['floracion'], 'at_or_below', fromF(27), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de daño en flores de damasco',
    effectEn: 'Frost during flowering: risk of apricot blossom injury',
    advice: 'Desde −2,8 °C se daña cerca del 10 % de las flores de damasco en plena floración, y bajo −5,6 °C el daño llega al 90 %. Prepara sistemas de control de heladas.',
    adviceEn: 'From −2.8 °C about 10% of apricot blossoms in full bloom are damaged, and below −5.6 °C damage reaches 90%. Prepare frost protection systems.',
    note: 'En plena floración (Full Bloom), 10 % de mortalidad ocurre a 27 °F (−2,8 °C) y 90 % a 22 °F (−5,6 °C). Al inicio de floración (First Bloom), 10 % de muerte ocurre a 25 °F (−3,9 °C).',
    noteEn: 'At full bloom 10% mortality occurs at 27 °F (−2.8 °C) and 90% at 22 °F (−5.6 °C). At first bloom 10% kill occurs at 25 °F (−3.9 °C).',
    limitations: 'Temperaturas críticas de WSU Prosser y CSU para 30 minutos de exposición en damasco.',
    limitationsEn: 'WSU Prosser and CSU critical temperatures for 30 minutes of exposure in apricot.',
    evidence: [CSU_APRICOT_FROST],
  })),
  perennial('sp.duraznero', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 6.5 }, lowerLimit: null, upperLimit: null,
    note: 'El pH del suelo para duraznero debe situarse entre 6,0 y 6,5.',
    noteEn: 'Soil pH for peach trees should be between 6.0 and 6.5.',
    limitations: 'Recomendación de UGA Extension específica para duraznero; no fija límites de daño fuera del rango.',
    limitationsEn: 'UGA Extension recommendation specific to peach; it sets no damage limits outside the range.',
    evidence: [UGA_PEACH_PH],
  },
  airMin(['floracion'], 'at_or_below', fromF(27), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de daño en flores de duraznero',
    effectEn: 'Frost during flowering: risk of peach blossom injury',
    advice: 'Desde −2,8 °C se daña cerca del 10 % de las flores abiertas de duraznero, y bajo −4,4 °C el daño llega al 90 %. Prepara medidas contra la helada.',
    adviceEn: 'From −2.8 °C about 10% of open peach blossoms are damaged, and below −4.4 °C damage reaches 90%. Prepare frost protection measures.',
    note: 'En plena floración (Full bloom), WSU EB0914 y MSU documentan 10 % de mortalidad a 27 °F (−2,8 °C) y 90 % a 24 °F (−4,4 °C).',
    noteEn: 'At full bloom WSU EB0914 and MSU document 10% mortality at 27 °F (−2.8 °C) and 90% at 24 °F (−4.4 °C).',
    limitations: 'Datos de WSU y MSU para 30 minutos de exposición en plena floración de duraznero.',
    limitationsEn: 'WSU and MSU data for 30 minutes of exposure in full bloom peach.',
    evidence: [MSU_PEACH_FROST],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia cerca de la cosecha: riesgo de partidura en duraznos',
    effectEn: 'Rain near harvest: risk of peach fruit cracking',
    advice: 'Si la fruta permanece mojada por lluvia cerca de la cosecha, absorbe humedad y puede rajarse. Cosecha la fruta que esté madura antes de que llueva.',
    adviceEn: 'If fruit stays wet from rain near harvest, it absorbs moisture and can crack. Harvest ripe fruit before the rain.',
    note: 'University of Delaware documenta que la piel mojada por períodos prolongados durante la maduración hace que el fruto absorba exceso de humedad y se raje.',
    noteEn: 'University of Delaware documents that skin wet for extended periods near ripening causes fruit to absorb excess moisture and crack.',
    limitations: 'Guía de manejo cualitativa de University of Delaware para carozos; no especifica milímetros exactos de lluvia.',
    limitationsEn: 'Qualitative management guide from University of Delaware for stone fruits; it does not specify exact millimeters of rainfall.',
    evidence: [UDEL_STONE_FRUIT_CRACK],
  })),
  perennial('sp.ciruelo', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 7.0 }, lowerLimit: null, upperLimit: null,
    note: 'El pH del suelo recomendado para ciruelo se ubica entre 6,0 y 7,0.',
    noteEn: 'The recommended soil pH for plum is between 6.0 and 7.0.',
    limitations: 'UNH Extension agrupa ciruelo, guindo y damasco en 6,0 a 7,0 sin desglosar por especie.',
    limitationsEn: 'UNH Extension groups plum, cherry and apricot at 6.0 to 7.0 without breaking down by species.',
    evidence: [UNH_STONE_FRUIT_PH],
  },
  airMin(['floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de daño en flores de ciruelo',
    effectEn: 'Frost during flowering: risk of plum blossom injury',
    advice: 'Desde −2,2 °C se daña cerca del 10 % de las flores de ciruelo europeo, y bajo −5,0 °C el daño llega al 90 %. Prepara control de heladas.',
    adviceEn: 'From −2.2 °C about 10% of European plum blossoms are damaged, and below −5.0 °C damage reaches 90%. Prepare frost protection.',
    note: 'En plena floración (Full Bloom) de ciruelo europeo (P. domestica), se documenta 10 % de muerte a 28 °F (−2,2 °C) y 90 % a 23 °F (−5,0 °C).',
    noteEn: 'At full bloom of European prune plum (P. domestica), 10% kill is documented at 28 °F (−2.2 °C) and 90% at 23 °F (−5.0 °C).',
    limitations: 'Cifras medidas en ciruelo europeo (Prunus domestica). CSU advierte expresamente que no hay datos propios para ciruelo japonés (Prunus salicina, ej. Santa Rosa).',
    limitationsEn: 'Figures measured on European plum (Prunus domestica). CSU explicitly notes that data for Japanese plum (Prunus salicina, e.g. Santa Rosa) is unavailable.',
    evidence: [CSU_PLUM_FROST],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia cerca de la cosecha: riesgo de partidura en ciruelas',
    effectEn: 'Rain near harvest: risk of plum cracking',
    advice: 'La lluvia prolongada cerca de la madurez puede rajar las ciruelas. Cosecha la fruta madura antes de que comience a llover.',
    adviceEn: 'Extended rain near ripening can crack plums. Harvest ripe fruit before the rain begins.',
    note: 'University of Delaware documenta rajado de fruta en ciruelo cuando la piel permanece mojada por lluvia durante la maduración.',
    noteEn: 'University of Delaware documents fruit cracking in plums when the skin remains wet from rain during ripening.',
    limitations: 'Guía de extensión cualitativa de University of Delaware; no fija un umbral de milímetros de lluvia.',
    limitationsEn: 'Qualitative extension guide from University of Delaware; it sets no rainfall millimeter threshold.',
    evidence: [UDEL_STONE_FRUIT_CRACK],
  })),
  perennial('sp.guindo', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 7.0 }, lowerLimit: null, upperLimit: null,
    note: 'El pH del suelo recomendado para guindo se ubica entre 6,0 y 7,0.',
    noteEn: 'The recommended soil pH for sour cherry is between 6.0 and 7.0.',
    limitations: 'UNH Extension agrupa guindo, ciruelo y damasco en 6,0 a 7,0 sin desglosar por especie.',
    limitationsEn: 'UNH Extension groups sour cherry, plum and apricot at 6.0 to 7.0 without breaking down by species.',
    evidence: [UNH_STONE_FRUIT_PH],
  },
  airMin(['floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de daño en flores de guindo',
    effectEn: 'Frost during flowering: risk of sour cherry blossom injury',
    advice: 'Desde −2,2 °C se daña cerca del 10 % de las flores de guindo en plena floración, y bajo −4,4 °C el daño llega al 90 %. Prepara protección contra helada.',
    adviceEn: 'From −2.2 °C about 10% of sour cherry blossoms in full bloom are damaged, and below −4.4 °C damage reaches 90%. Prepare frost protection.',
    note: 'En plena floración (Full Bloom) de guindo (Prunus cerasus), MSU Research Report 220 documenta 10 % de daño a 28 °F (−2,2 °C) y 90 % a 24 °F (−4,4 °C).',
    noteEn: 'At full bloom of sour cherry (Prunus cerasus), MSU Research Report 220 documents 10% injury at 28 °F (−2.2 °C) and 90% at 24 °F (−4.4 °C).',
    limitations: 'Datos de MSU específicos para guindo agrio (Prunus cerasus). No deben confundirse con cerezo dulce (Prunus avium), que tolera el frío severo de forma diferente.',
    limitationsEn: 'MSU data specific to sour cherry (Prunus cerasus). Must not be confused with sweet cherry (Prunus avium), which tolerates severe cold differently.',
    evidence: [MSU_TART_CHERRY_FROST],
  })),
  perennial('sp.nectarino', weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia cerca de la cosecha: alto riesgo de partidura en nectarinos',
    effectEn: 'Rain near harvest: high risk of nectarine fruit cracking',
    advice: 'Los nectarinos tienen piel lisa y son muy propensos a rajarse si llueve cuando están madurando. Cosecha la fruta lista antes de las lluvias.',
    adviceEn: 'Nectarines have smooth skin and are very prone to cracking if it rains while ripening. Harvest ready fruit before the rains.',
    note: 'University of Delaware documenta que los nectarinos son más susceptibles a la partidura que los duraznos debido a su piel lisa, al absorber humedad durante maduración.',
    noteEn: 'University of Delaware documents that nectarines are more susceptible to cracking than peaches due to their smooth skin, absorbing moisture during ripening.',
    limitations: 'Guía de manejo cualitativa de University of Delaware; no fija un umbral de lluvia en milímetros.',
    limitationsEn: 'Qualitative management guide from University of Delaware; it does not set a rainfall millimeter threshold.',
    evidence: [UDEL_NECTARINE_CRACK],
  })),
  perennial('sp.almendro', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.4, max: 7.5 }, lowerLimit: null, upperLimit: null,
    note: 'El rango ideal de pH del suelo para almendro se ubica entre 6,4 y 7,5.',
    noteEn: 'The ideal soil pH range for almond is between 6.4 and 7.5.',
    limitations: 'Recomendación de asesor de extensión de UCCE; los portainjertos híbridos duraznero-almendro presentan mejor desempeño en suelos alcalinos.',
    limitationsEn: 'Recommendation from UCCE extension advisor; peach-almond hybrid rootstocks perform better in alkaline soils.',
    evidence: [UCCE_ALMOND_PH],
  },
  airMin(['floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de pérdida de flores en almendro',
    effectEn: 'Frost during flowering: risk of almond blossom loss',
    advice: 'A −2,2 °C o menos en plena floración se pueden perder flores y cuaja de almendras. Si cuentas con control de heladas, actívalo.',
    adviceEn: 'At −2.2 °C or below at full bloom, almond blossoms and fruit set can be lost. If you have frost protection, activate it.',
    note: 'UCCE documenta que en plena floración temperaturas de 27 a 28 °F (−2,8 a −2,2 °C) o menores pueden causar pérdida de cosecha.',
    noteEn: 'UCCE documents that at full bloom temperatures at or below 27 to 28 °F (−2.8 to −2.2 °C) can cause crop loss.',
    limitations: 'Fuente de divulgación de asesor de extensión de UCCE Merced; la susceptibilidad exacta varía según cultivar.',
    limitationsEn: 'Extension publication from UCCE Merced extension advisor; exact susceptibility varies by cultivar.',
    evidence: [UCCE_ALMOND_FROST],
  })),
  perennial('sp.vid', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 7.0 }, lowerLimit: null, upperLimit: null,
    note: 'Las variedades de Vitis vinifera se desarrollan mejor en suelos con un pH entre 6,0 y 7,0.',
    noteEn: 'Varieties of Vitis vinifera generally grow best at a soil pH between 6.0 and 7.0.',
    limitations: 'NC State Extension documenta 6,0 a 7,0 para vinífera europea, a diferencia de especies americanas nativas que toleran pH 5,5 a 6,0. No documenta límites de daño.',
    limitationsEn: 'NC State Extension documents 6.0 to 7.0 for European vinifera, unlike native American species that tolerate pH 5.5 to 6.0. It documents no damage limits.',
    evidence: [NCSU_GRAPE_PH],
  },
  airMin(['vegetativo'], 'at_or_below', fromF(29.8), {
    severity: 'warning',
    effect: 'Helada tras la brotación: riesgo de daño en brotes tiernos de la vid',
    effectEn: 'Frost after budbreak: risk of tender grapevine shoot injury',
    advice: 'Bajo −1,2 °C se dañan los brotes nuevos de la vid tras la brotación. Si tienes control de heladas, déjalo preparado.',
    adviceEn: 'Below −1.2 °C new grapevine shoots after budbreak are injured. If you have frost protection, keep it ready.',
    note: 'WSU documenta una tolerancia crítica post-brotación de 29,8 °F (−1,2 °C) para variedades de Vitis vinifera (basado en Ferguson et al., 2014, AJEV).',
    noteEn: 'WSU documents a post-budbreak critical frost tolerance of 29.8 °F (−1.2 °C) for Vitis vinifera varieties (based on Ferguson et al., 2014, AJEV).',
    limitations: 'Medido tras brotación en más de 20 cultivares viníferos; no se dispone de umbral específico de helada en plena floración en vid porque florece más tarde.',
    limitationsEn: 'Measured post-budbreak across more than 20 vinifera cultivars; no specific full bloom frost threshold is available for grapevines because they bloom later.',
    evidence: [WSU_GRAPEVINE_FROST],
  }),
  airMax(['floracion'], 'above', fromF(95), {
    severity: 'warning',
    effect: 'Calor sobre 35 °C en floración: riesgo de corrimiento y raleo de racimos en vid',
    effectEn: 'Heat above 35 °C during flowering: risk of grapevine flower shatter and berry thinning',
    advice: 'Días con más de 35 °C durante la floración impiden la correcta fecundación de las flores de la vid y hacen caer bayas. Mantén el riego al día.',
    adviceEn: 'Days above 35 °C during flowering prevent proper fertilization of grape flowers and cause berry drop. Keep watering up to date.',
    note: 'Investigación de UC Davis indica que sobre 95 °F (35 °C) en floración se interfiere la fecundación floral al impedir el desarrollo del tubo polínico, induciendo corrimiento (shatter).',
    noteEn: 'UC Davis research indicates that above 95 °F (35 °C) at bloom, flower fertilization is impaired because pollen tube growth is prevented, inducing shatter.',
    limitations: 'Publicación técnica de especialista de UC Davis; la susceptibilidad cambia según cultivar y vigor de la parra.',
    limitationsEn: 'Technical publication by UC Davis specialist; susceptibility varies by cultivar and vine vigor.',
    evidence: [UCD_GRAPEVINE_HEAT],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en cosecha: riesgo de partidura de bayas y botritis en vid',
    effectEn: 'Rain at harvest: risk of berry splitting and botrytis in grapevine',
    advice: 'La lluvia sobre racimos maduros hace reventar las bayas y facilita pudriciones. Si más del 20 % de las bayas están partidas, cosecha lo antes posible.',
    adviceEn: 'Rain on ripe grape clusters causes berries to split and promotes rot. If more than 20% of berries are split, harvest as soon as possible.',
    note: 'University of Wisconsin Extension recomienda cosechar de inmediato si más del 20 % de las bayas del racimo se parten tras lluvias copiosas.',
    noteEn: 'University of Wisconsin Extension recommends harvesting immediately if more than 20% of berries in the cluster split after heavy rain.',
    limitations: 'Regla de manejo post-lluvia de UW-Madison; cultivares de racimo apretado presentan mayor susceptibilidad a la partidura.',
    limitationsEn: 'Post-rain management rule from UW-Madison; tight-clustered cultivars show higher susceptibility to splitting.',
    evidence: [UW_GRAPE_HARVEST_SPLIT],
  }),
  salt('Grape (Vitis sp.)', 1.5, 'moderately_sensitive')),
  perennial('sp.naranjo', citrusPh(),
    airMin(ALL_STAGES, 'at_or_below', fromF(24), {
      severity: 'warning',
      effect: 'Helada bajo −4,4 °C: daño severo en ramas y follaje del naranjo',
      effectEn: 'Frost at or below −4.4 °C: severe branch and foliage damage in orange trees',
      advice: 'Bajo −4,4 °C se queman las hojas y ramas del naranjo. Si se pronostica helada, protege los árboles.',
      adviceEn: 'Below −4.4 °C orange leaves and branches are damaged. If frost is forecast, protect the trees.',
      note: 'UC ANR y Mississippi State University documentan daño por frío en naranjo dulce (Citrus sinensis) a 24 °F (−4,4 °C).',
      noteEn: 'UC ANR and Mississippi State University document cold damage in sweet orange (Citrus sinensis) at 24 °F (−4.4 °C).',
      limitations: 'Umbral de rusticidad en madera y follaje de árbol adulto; flores y frutos tiernos pueden dañarse a temperaturas más altas.',
      limitationsEn: 'Hardiness threshold for adult tree wood and foliage; blossoms and young fruit can be damaged at warmer temperatures.',
      evidence: [UCANR_CITRUS_FOOTHILLS, MSU_CITRUS_COLD],
    })),
  perennial('sp.limonero', citrusPh(),
    airMin(['floracion'], 'at_or_below', fromF(29), {
      severity: 'warning',
      effect: 'Helada en floración: mata flores y frutos pequeños de limonero',
      effectEn: 'Frost during flowering kills lemon blossoms and young fruit',
      advice: 'Desde −1,7 °C mueren las flores y frutos recién cuajados del limonero. Activa sistemas de control de heladas.',
      adviceEn: 'From −1.7 °C open lemon flowers and young fruit are killed. Activate frost protection systems.',
      note: 'UF/IFAS documenta que flores y frutos pequeños de limonero mueren a 29 °F (−1,7 °C).',
      noteEn: 'UF/IFAS documents that lemon flowers and young fruit are killed at 29 °F (−1.7 °C).',
      limitations: 'Publicación EDIS HS402 de UF/IFAS para limonero.',
      limitationsEn: 'UF/IFAS EDIS HS402 publication for lemon.',
      evidence: [UF_LEMON_FREEZE],
    }),
    airMin(['cosecha'], 'at_or_below', fromF(28), {
      severity: 'warning',
      effect: 'Helada en cosecha: daña limones maduros en el árbol',
      effectEn: 'Frost at harvest damages mature lemons on the tree',
      advice: 'Desde −2,2 °C se daña la fruta madura en el limonero. Cosecha la fruta comercial antes de la helada.',
      adviceEn: 'From −2.2 °C mature fruit on the lemon tree is damaged. Harvest commercial fruit before the frost.',
      note: 'UF/IFAS documenta daño en fruta madura de limonero entre 28 y 31 °F (−2,2 a −1,8 °C).',
      noteEn: 'UF/IFAS documents damage to mature lemon fruit between 28 and 31 °F (−2.2 to −1.8 °C).',
      limitations: 'Se adopta 28 °F como límite crítico de daño en fruta madura según UF/IFAS.',
      limitationsEn: '28 °F is adopted as the critical damage threshold for mature fruit according to UF/IFAS.',
      evidence: [UF_LEMON_FREEZE],
    }),
    airMin(['vegetativo'], 'at_or_below', fromF(24), {
      severity: 'warning',
      effect: 'Helada intensa: defoliación y daño en madera de limonero',
      effectEn: 'Hard freeze: defoliation and wood injury in lemon trees',
      advice: 'Bajo −4,4 °C el limonero pierde hojas y sufre daño en ramas. Protege los árboles esa noche.',
      adviceEn: 'Below −4.4 °C lemon trees lose leaves and suffer branch damage. Protect trees that night.',
      note: 'UF/IFAS documenta defoliación en limonero a 22–24 °F (−5,6 a −4,4 °C) y daño severo en madera a 20 °F (−6,7 °C).',
      noteEn: 'UF/IFAS documents defoliation in lemon trees at 22–24 °F (−5.6 to −4.4 °C) and severe wood damage at 20 °F (−6.7 °C).',
      limitations: 'Umbral de defoliación en árbol establecido según UF/IFAS.',
      limitationsEn: 'Defoliation threshold in established trees according to UF/IFAS.',
      evidence: [UF_LEMON_FREEZE],
    })),
  perennial('sp.lima', citrusPh(),
    airMin(ALL_STAGES, 'below', fromF(28), {
      severity: 'warning',
      effect: 'Helada bajo −2,2 °C: daño foliar en lima Tahití',
      effectEn: 'Frost below −2.2 °C: foliage damage in Tahiti lime',
      advice: 'Bajo −2,2 °C se queman las hojas de la lima, y bajo −4,4 °C puede morir el árbol. Protege la plantación.',
      adviceEn: 'Below −2.2 °C lime leaves are damaged, and below −4.4 °C tree death can occur. Protect the plantation.',
      note: 'UF/IFAS documenta que en lima Tahití (Citrus latifolia) el daño foliar ocurre bajo 28 °F (−2,2 °C), daño en madera bajo 26 °F (−3,3 °C) y daño severo o muerte bajo 24 °F (−4,4 °C).',
      noteEn: 'UF/IFAS documents that in Tahiti lime (Citrus latifolia) leaf damage occurs below 28 °F (−2.2 °C), wood damage below 26 °F (−3.3 °C), and severe damage or death below 24 °F (−4.4 °C).',
      limitations: 'Cifras para lima Tahití (Citrus latifolia). La lima sutil o Key lime (Citrus aurantiifolia) es aún más sensible al frío (daño foliar desde 30–32 °F).',
      limitationsEn: 'Figures for Tahiti lime (Citrus latifolia). Key lime (Citrus aurantiifolia) is even more cold-sensitive (foliage damage from 30–32 °F).',
      evidence: [UF_TAHITI_LIME_FREEZE],
    })),
  perennial('sp.mandarino', citrusPh(),
    airMin(ALL_STAGES, 'at_or_below', fromF(23), {
      severity: 'warning',
      effect: 'Helada bajo −5,0 °C: daño por frío en mandarinos',
      effectEn: 'Frost at or below −5.0 °C: cold injury in mandarin trees',
      advice: 'Bajo −5,0 °C se dañan hojas y ramas de mandarinos. Protege los árboles ante heladas fuertes.',
      adviceEn: 'Below −5.0 °C mandarin leaves and branches are injured. Protect trees against hard frosts.',
      note: 'Mississippi State University documenta una rusticidad de 22 a 23 °F (−5,6 a −5,0 °C) para mandarinas comunes (Citrus reticulata).',
      noteEn: 'Mississippi State University documents a cold hardiness of 22 to 23 °F (−5.6 to −5.0 °C) for common mandarin oranges (Citrus reticulata).',
      limitations: 'Dato específico para mandarinas del grupo Citrus reticulata; no aplica a mandarina Satsuma (Citrus unshiu), que tolera hasta 18–20 °F.',
      limitationsEn: 'Data specific to Citrus reticulata mandarins; does not apply to Satsuma mandarin (Citrus unshiu), which tolerates down to 18–20 °F.',
      evidence: [MSU_CITRUS_COLD],
    })),
  perennial('sp.pomelo', citrusPh(),
    airMin(ALL_STAGES, 'at_or_below', fromF(24), {
      severity: 'warning',
      effect: 'Helada bajo −4,4 °C: daño en follaje y ramas de pomelo',
      effectEn: 'Frost at or below −4.4 °C: foliage and branch damage in grapefruit',
      advice: 'Bajo −4,4 °C el pomelo sufre daño en hojas y ramas jóvenes. Protege los árboles si se prevén heladas.',
      adviceEn: 'Below −4.4 °C grapefruit suffers damage to leaves and young branches. Protect trees if frost is forecast.',
      note: 'Mississippi State University sitúa la resistencia de pomelo (Citrus paradisi) en 23 a 24 °F (−5,0 a −4,4 °C); UC ANR documenta daño a 26 °F (−3,3 °C).',
      noteEn: 'Mississippi State University rates grapefruit (Citrus paradisi) cold hardiness at 23 to 24 °F (−5.0 to −4.4 °C); UC ANR documents injury at 26 °F (−3.3 °C).',
      limitations: 'Se adopta 24 °F (−4,4 °C) como umbral de advertencia con base en MSU y UC ANR.',
      limitationsEn: '24 °F (−4.4 °C) is adopted as the warning threshold based on MSU and UC ANR.',
      evidence: [MSU_CITRUS_COLD, UCANR_CITRUS_FOOTHILLS],
    })),
  perennial('sp.kumquat', citrusPh(),
    airMin(ALL_STAGES, 'below', fromF(18), {
      severity: 'warning',
      effect: 'Helada bajo −7,8 °C: frío extremo para kumquat',
      effectEn: 'Frost below −7.8 °C: extreme cold for kumquat',
      advice: 'El kumquat tolera heladas moderadas, pero bajo −7,8 °C puede sufrir daño. Revisa el huerto tras heladas muy intensas.',
      adviceEn: 'Kumquat tolerates moderate frosts, but below −7.8 °C it can suffer damage. Check the orchard after very hard frosts.',
      note: 'UC ANR documenta que el kumquat tolera temperaturas de hasta 18 °F (−7,8 °C), siendo el cítrico más resistente al frío.',
      noteEn: 'UC ANR documents that kumquat tolerates temperatures down to 18 °F (−7.8 °C), being the most cold-hardy citrus.',
      limitations: 'UF/IFAS reporta tolerancia de hasta 10 °F en ciertas condiciones; se adopta 18 °F de UC ANR como límite conservador de advertencia.',
      limitationsEn: 'UF/IFAS reports tolerance down to 10 °F under certain conditions; UC ANR 18 °F is adopted as a conservative warning limit.',
      evidence: [UCANR_CITRUS_FOOTHILLS],
    })),
  perennial('sp.avellano', airMin(['floracion'], 'at_or_below', fromF(15), {
    severity: 'warning',
    effect: 'Helada en floración: riesgo de congelamiento de amentos en avellano europeo',
    effectEn: 'Frost during flowering: risk of catkin freezing in European hazelnut',
    advice: 'A −9,4 °C o menos se congelan los amentos masculinos elongados del avellano. En variedades sensibles, las flores femeninas se dañan bajo −12,2 °C.',
    adviceEn: 'At −9.4 °C or below elongated male hazelnut catkins freeze. In sensitive varieties, female flowers freeze below −12.2 °C.',
    note: 'Oregon State University Extension documenta que los amentos se congelan a 15 °F (−9,4 °C) al estar completamente elongados, y flores femeninas sensibles a 10 °F (−12,2 °C).',
    noteEn: 'Oregon State University Extension documents that fully elongated catkins freeze at 15 °F (−9.4 °C), and sensitive female flowers at 10 °F (−12.2 °C).',
    limitations: 'Boletín EM 9072 de OSU Extension; la pérdida de cosecha global suele ser baja si el frío es breve debido a la floración escalonada.',
    limitationsEn: 'OSU Extension bulletin EM 9072; overall crop loss is usually minimal during brief cold spells due to staggered bloom.',
    evidence: [OSU_HAZELNUT_FROST],
  })),
  perennial('sp.nogal', airMin(['floracion'], 'at_or_below', fromF(30), {
    severity: 'warning',
    effect: 'Helada primaveral: daña brotes nuevos y frutos recién cuajados del nogal',
    effectEn: 'Spring frost damages new shoots and small nutlets in walnut',
    advice: 'Desde −1,1 °C se queman las hojas nuevas, brotes y nueces recién cuajadas del nogal. Si tienes control de heladas, actívalo esa noche.',
    adviceEn: 'From −1.1 °C new walnut leaves, shoots and small nutlets are damaged. If you have frost protection, activate it that night.',
    note: 'UCCE Butte County documenta que 30 °F (−1,1 °C) es la temperatura crítica para daño por helada de radiación en brotes y nueces recién cuajadas.',
    noteEn: 'UCCE Butte County documents that 30 °F (−1.1 °C) is the critical temperature for radiation frost damage to new shoots and small nutlets.',
    limitations: 'Presentación técnica de especialista emérito de UCCE Butte County sobre nogal en primavera.',
    limitationsEn: 'Technical presentation by UCCE Butte County emeritus extension specialist on walnut in spring.',
    evidence: [UCCE_WALNUT_FROST],
  })),
  perennial('sp.pecana', airMin(['vegetativo', 'floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada en tejido verde: daña brotes y follaje nuevo de pecana',
    effectEn: 'Frost on green tissue damages new pecan shoots and foliage',
    advice: 'Temperaturas de −2,2 °C sostenidas por varias horas dañan el tejido verde y brotes nuevos de la pecana. Protege los árboles si es posible.',
    adviceEn: 'Temperatures of −2.2 °C lasting several hours injure green tissue and new pecan shoots. Protect trees if possible.',
    note: 'University of Georgia Pecan Extension documenta que el tejido verde de pecana sufre daño de consideración cuando la temperatura alcanza 28 °F (−2,2 °C) por varias horas.',
    noteEn: 'University of Georgia Pecan Extension documents that green pecan tissue suffers damaging injury when temperatures reach 28 °F (−2.2 °C) for several hours.',
    limitations: 'Publicación del equipo de especialistas de pecana de UGA Extension; se refiere a tejido verde tras la brotación.',
    limitationsEn: 'Publication from UGA Extension pecan team specialists; refers to green tissue after budbreak.',
    evidence: [UGA_PECAN_FROST],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en maduración: favorece pudrición de cáscara en nuez pecana',
    effectEn: 'Rain during ripening promotes pecan shuck rot',
    advice: 'Lluvias frecuentes antes de la cosecha favorecen hongos que pudren la cáscara de la pecana. Cosecha tan pronto como las nueces estén secas y listas.',
    adviceEn: 'Frequent rain before harvest favors fungi that rot the pecan shuck. Harvest as soon as nuts are dry and ready.',
    note: 'UGA Extension documenta brotes severos de pudrición de cáscara (Phytophthora shuck rot) tras períodos lluviosos (11 días de lluvia en 15 días) con temperaturas bajo 86 °F (30 °C).',
    noteEn: 'UGA Extension documents severe outbreaks of Phytophthora shuck rot following rainy periods (11 rainy days in 15 days) with temperatures below 86 °F (30 °C).',
    limitations: 'Registro histórico y patológico de UGA Extension sobre calidad de nuez y hongos de poscosecha en pecana.',
    limitationsEn: 'Historical and pathological record from UGA Extension on pecan nut quality and postharvest fungi.',
    evidence: [UGA_PECAN_HARVEST],
  })),
  perennial('sp.pistacho', airMax(['floracion'], 'above', fromF(80), {
    severity: 'warning',
    effect: 'Calor sobre 26,7 °C en floración: reduce el rendimiento de pistacho',
    effectEn: 'Heat above 26.7 °C during bloom reduces pistachio yield',
    advice: 'Horas con más de 26,7 °C durante la floración del pistacho reducen el cuaje y el rendimiento final. Mantén un buen riego esos días.',
    adviceEn: 'Hours above 26.7 °C during pistachio bloom reduce fruit set and final yield. Maintain good irrigation on those days.',
    note: 'UCCE Kern County (Craig Kallsen, HortScience 52:598-605) documenta que las horas sobre 80 °F (26,7 °C) en la ventana de floración se correlacionan negativamente con el rendimiento en cultivar Kerman.',
    noteEn: 'UCCE Kern County (Craig Kallsen, HortScience 52:598-605) documents that hours above 80 °F (26.7 °C) in the bloom window are negatively correlated with yield in cv. Kerman.',
    limitations: 'Estudio de UCCE en San Joaquin Valley para cultivar Kerman; la acumulación de horas cálidas afecta el cuaje.',
    limitationsEn: 'UCCE study in San Joaquin Valley for cultivar Kerman; accumulation of warm hours affects fruit set.',
    evidence: [UCCE_PISTACHIO_HEAT],
  })),
  perennial('sp.macadamia', airMax(['floracion'], 'above', celsius(30), {
    severity: 'warning',
    effect: 'Calor sobre 30 °C en cuaja: favorece caída prematura de nueces en macadamia',
    effectEn: 'Heat above 30 °C during nut set promotes premature macadamia nut drop',
    advice: 'Temperaturas sobre 30 °C provocan la caída de nueces recién cuajadas de macadamia. Asegura el riego para disminuir el estrés térmico.',
    adviceEn: 'Temperatures above 30 °C trigger premature nut drop in macadamia. Ensure irrigation to reduce heat stress.',
    note: 'Queensland DPI (Stephenson y Gallagher, 1986) documenta que 30 °C es una temperatura crítica que detona niveles inaceptables de caída prematura de nueces.',
    noteEn: 'Queensland DPI (Stephenson and Gallagher, 1986) documents that 30 °C is critical in promoting unacceptable levels of premature nut drop.',
    limitations: 'Investigación en macadamia en Australia; describe la respuesta fisiológica a días cálidos en cuaja.',
    limitationsEn: 'Macadamia research in Australia; describes the physiological response to warm days during nut set.',
    evidence: [QDPI_MACADAMIA_HEAT],
  }),
  airMin(['vegetativo'], 'at_or_below', fromF(27), {
    severity: 'warning',
    effect: 'Helada bajo −2,8 °C: daño en árboles maduros de macadamia',
    effectEn: 'Frost at or below −2.8 °C damages mature macadamia trees',
    advice: 'Bajo −2,8 °C se dañan hojas y ramas de macadamia si el frío dura varias horas. Protege los árboles si se prevé helada.',
    adviceEn: 'Below −2.8 °C macadamia leaves and branches are damaged if cold persists for several hours. Protect trees if frost is forecast.',
    note: 'Purdue New Crops (McHargue, 1996) documenta que el daño por helada comienza a −2,8 °C (27 °F), especialmente con exposición prolongada.',
    noteEn: 'Purdue New Crops (McHargue, 1996) documents that frost damage starts at −2.8 °C (27 °F), especially if low temperatures persist.',
    limitations: 'Datos del sur de California para árboles establecidos; ramas jóvenes y flores pueden afectarse a temperaturas más suaves.',
    limitationsEn: 'Data from Southern California for established trees; young branches and flowers may be affected at milder temperatures.',
    evidence: [PURDUE_MACADAMIA_COLD],
  })),
  perennial('sp.jojoba', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 5.0, max: 9.0 }, lowerLimit: null, upperLimit: null,
    note: 'La jojoba tolera un amplio rango de pH de suelo, entre 5,0 y 9,0 (fuertemente ácido a muy alcalino).',
    noteEn: 'Jojoba tolerates a wide soil pH range between 5.0 and 9.0 (strongly acidic to very alkaline).',
    limitations: 'University of Arizona Campus Arboretum; describe el rango de tolerancia edáfica de la especie sin fijar óptimo estrecho.',
    limitationsEn: 'University of Arizona Campus Arboretum; describes the edaphic tolerance range without setting a narrow optimum.',
    evidence: [UARIZONA_JOJOBA_PH],
  }),
  perennial('sp.chirimoyo', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.5, max: 7.6 }, lowerLimit: null, upperLimit: null,
    note: 'El pH óptimo del suelo para chirimoyo se ubica entre 6,5 y 7,6.',
    noteEn: 'The optimum soil pH for cherimoya ranges from 6.5 to 7.6.',
    limitations: 'Guía de cultivo de CRFG; señala que prefiere suelos bien drenados sin fijar límites de toxicidad.',
    limitationsEn: 'CRFG growing guide; notes preference for well-drained soils without setting toxicity limits.',
    evidence: [CRFG_CHERIMOYA],
  },
  airMin(['vegetativo', 'floracion'], 'at_or_below', fromF(29), {
    severity: 'warning',
    effect: 'Helada bajo −1,7 °C: mata brotes tiernos de chirimoyo',
    effectEn: 'Frost at or below −1.7 °C kills young cherimoya growing tips',
    advice: 'A −1,7 °C mueren las puntas de brotes tiernos del chirimoyo, y a −3,9 °C se dañan severamente los árboles adultos. Protege los árboles esa noche.',
    adviceEn: 'At −1.7 °C young cherimoya growing tips are killed, and at −3.9 °C mature trees are severely injured. Protect trees that night.',
    note: 'CRFG documenta que las puntas en crecimiento activo mueren a 29 °F (−1,7 °C) y árboles adultos sufren daño severo a 25 °F (−3,9 °C).',
    noteEn: 'CRFG documents that young growing tips are killed at 29 °F (−1.7 °C) and mature trees are severely injured at 25 °F (−3.9 °C).',
    limitations: 'Publicación técnica de CRFG para Annona cherimola.',
    limitationsEn: 'CRFG technical publication for Annona cherimola.',
    evidence: [CRFG_CHERIMOYA],
  })),
  perennial('sp.feijoa', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 5.5, max: 7.0 }, lowerLimit: null, upperLimit: null,
    note: 'Las mejores cosechas de feijoa se obtienen en suelos con pH entre 5,5 y 7,0.',
    noteEn: 'The best feijoa harvests come from soils with a pH between 5.5 and 7.0.',
    limitations: 'Guía de CRFG para Acca sellowiana en suelos bien drenados.',
    limitationsEn: 'CRFG guide for Acca sellowiana in well-drained soils.',
    evidence: [CRFG_FEIJOA],
  },
  airMin(ALL_STAGES, 'at_or_below', fromF(15), {
    severity: 'warning',
    effect: 'Helada bajo −9,4 °C: frío extremo para feijoa',
    effectEn: 'Frost at or below −9.4 °C: extreme cold for feijoa',
    advice: 'La feijoa tolera heladas comunes, pero temperaturas de −9,4 °C o menores provocan daños severos. Revisa el huerto tras fríos extremos.',
    adviceEn: 'Feijoa tolerates typical frosts, but temperatures of −9.4 °C or lower cause severe injury. Check the orchard after extreme cold.',
    note: 'CRFG documenta que la feijoa se adapta generalmente a zonas con temperaturas sobre 15 °F (−9,4 °C).',
    noteEn: 'CRFG documents that feijoa is generally adapted to areas where temperatures stay above 15 °F (−9.4 °C).',
    limitations: 'Límite de adaptación climática de CRFG; heladas tardías de primavera pueden afectar la floración a temperaturas más altas.',
    limitationsEn: 'CRFG climate adaptation limit; late spring frosts can affect flowering at warmer temperatures.',
    evidence: [CRFG_FEIJOA],
  })),
  perennial('sp.granado', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 5.5, max: 7.0 }, lowerLimit: null, upperLimit: null,
    note: 'El crecimiento óptimo del granado se asocia a suelos con un pH entre 5,5 y 7,0.',
    noteEn: 'Optimum pomegranate growth is associated with soils in the pH range of 5.5 to 7.0.',
    limitations: 'UF/IFAS indica que el granado presenta pobre desarrollo en suelos fuertemente alcalinos.',
    limitationsEn: 'UF/IFAS indicates that pomegranate shows poor development on strongly alkaline soils.',
    evidence: [UF_POMEGRANATE],
  },
  airMin(['vegetativo'], 'at_or_below', fromF(12), {
    severity: 'warning',
    effect: 'Helada bajo −11,1 °C: daño severo en árboles de granado',
    effectEn: 'Frost at or below −11.1 °C: severe damage to pomegranate trees',
    advice: 'El granado en dormancia invernal tolera frío moderado, pero bajo −11,1 °C sufre daños graves. Revisa los árboles tras heladas extremas.',
    adviceEn: 'Dormant pomegranate trees tolerate moderate cold, but below −11.1 °C they suffer severe damage. Check trees after extreme freezes.',
    note: 'CRFG y UF/IFAS coinciden en que temperaturas bajo 12 °F (−11,1 °C) dañan severamente a los árboles en dormancia.',
    noteEn: 'CRFG and UF/IFAS agree that temperatures below 12 °F (−11.1 °C) severely injure dormant trees.',
    limitations: 'Aplica a árboles adultos en reposo invernal; árboles en activo crecimiento se dañan a temperaturas considerablemente mayores (cerca de 28 °F).',
    limitationsEn: 'Applies to mature dormant trees; non-dormant trees are injured at considerably warmer temperatures (around 28 °F).',
    evidence: [UF_POMEGRANATE, CRFG_POMEGRANATE],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en maduración: riesgo de rajado en granadas',
    effectEn: 'Rain during ripening: risk of pomegranate fruit splitting',
    advice: 'La lluvia sobre granadas maduras provoca que los frutos se revienten. Cosecha la fruta que esté madura antes de que llueva.',
    adviceEn: 'Rain on ripe pomegranates causes fruit splitting. Harvest ripe fruit before it rains.',
    note: 'CRFG y UF/IFAS documentan que las granadas tienden a abrirse y rajarse al mojarse con lluvia o cambios bruscos de humedad cerca de cosecha.',
    noteEn: 'CRFG and UF/IFAS document that pomegranates tend to crack open particularly when rained on or with sudden moisture shifts near harvest.',
    limitations: 'Recomendación de cosecha de CRFG y UF/IFAS para evitar rajado del fruto.',
    limitationsEn: 'CRFG and UF/IFAS harvest recommendation to prevent fruit splitting.',
    evidence: [CRFG_POMEGRANATE, UF_POMEGRANATE],
  })),
  perennial('sp.guayabo', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 4.5, max: 7.0 }, lowerLimit: null, upperLimit: 8.5,
    note: 'Un pH de suelo de 4,5 a 7,0 es ideal para guayabo; tolera hasta 8,5 si se aporta hierro quelatado.',
    noteEn: 'A soil pH of 4.5 to 7.0 is ideal for guava; it tolerates up to 8.5 with chelated iron additions.',
    limitations: 'UF/IFAS documenta 4,5 a 7 como óptimo y hasta 8,5 con enmiendas de micronutrientes.',
    limitationsEn: 'UF/IFAS documents 4.5 to 7 as ideal and up to 8.5 with micronutrient amendments.',
    evidence: [UF_GUAVA],
  },
  airMin(['vegetativo', 'floracion'], 'at_or_below', fromF(27), {
    severity: 'warning',
    effect: 'Helada bajo −2,8 °C: riesgo de muerte en guayabos jóvenes',
    effectEn: 'Frost at or below −2.8 °C: risk of young guava tree death',
    advice: 'Entre −2,8 y −2,2 °C mueren los guayabos jóvenes; árboles maduros resisten períodos breves a −3,9 °C. Protege la plantación esa noche.',
    adviceEn: 'Between −2.8 and −2.2 °C young guava trees are killed; mature trees withstand brief spells at −3.9 °C. Protect the plantation that night.',
    note: 'UF/IFAS documenta que árboles jóvenes mueren con 27 a 28 °F (−2,8 a −2,2 °C), mientras que adultos soportan brevemente 25 a 26 °F (−3,9 a −3,3 °C).',
    noteEn: 'UF/IFAS documents that young trees may be killed at 27 to 28 °F (−2.8 to −2.2 °C), while mature trees briefly withstand 25 to 26 °F (−3.9 to −3.3 °C).',
    limitations: 'Boletín EDIS MG045 de UF/IFAS para Psidium guajava.',
    limitationsEn: 'UF/IFAS EDIS MG045 bulletin for Psidium guajava.',
    evidence: [UF_GUAVA],
  })),
  perennial('sp.higuera', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 6.5 }, lowerLimit: null, upperLimit: null,
    note: 'La higuera crece mejor en suelos con pH de 6,0 a 6,5, tolerando niveles mayores.',
    noteEn: 'Fig trees grow best in soils with a pH of 6.0 to 6.5, tolerating higher levels.',
    limitations: 'Guía de University of Guam; la higuera tolera suelos con pH superior a 7 pero no tolera suelos fuertemente ácidos.',
    limitationsEn: 'University of Guam guide; figs tolerate soils above pH 7 but are not tolerant of highly acidic soils.',
    evidence: [UGUAM_FIG_PH],
  },
  airMin(['vegetativo', 'floracion'], 'at_or_below', fromF(30), {
    severity: 'warning',
    effect: 'Helada bajo −1,1 °C: daña brotes activos de la higuera',
    effectEn: 'Frost at or below −1.1 °C damages active fig shoots',
    advice: 'A −1,1 °C se queman los brotes y hojas tiernas de la higuera en crecimiento. Protege los árboles si hay helada.',
    adviceEn: 'At −1.1 °C tender shoots and leaves of actively growing figs are damaged. Protect trees if frost occurs.',
    note: 'CRFG documenta que plantas en crecimiento activo se dañan a 30 °F (−1,1 °C), mientras que árboles en reposo invernal toleran 12 a 15 °F (−11 a −9,4 °C).',
    noteEn: 'CRFG documents that plants in active growth can be damaged at 30 °F (−1.1 °C), while fully dormant trees are hardy to 12 to 15 °F (−11 to −9.4 °C).',
    limitations: 'Umbral para higuera en vegetación activa según CRFG.',
    limitationsEn: 'Threshold for actively growing fig trees according to CRFG.',
    evidence: [CRFG_FIG],
  }),
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: 'Lluvia en maduración: causa partidura y deterioro de higos',
    effectEn: 'Rain during ripening causes fig splitting and spoilage',
    advice: 'La lluvia durante la maduración hace reventar los higos y pudre la fruta. Cosecha los frutos maduros antes de que llueva.',
    adviceEn: 'Rain during ripening causes figs to split and spoil. Harvest ripe fruit before the rain.',
    note: 'CRFG y UC ANR IPM documentan que lluvias y alta humedad durante la maduración causan partidura y pudrición de los higos.',
    noteEn: 'CRFG and UC ANR IPM document that rains and high humidity during ripening cause figs to split and spoil.',
    limitations: 'Guía de manejo y selección de sitio de CRFG y UC ANR IPM.',
    limitationsEn: 'Management and site selection guide from CRFG and UC ANR IPM.',
    evidence: [CRFG_FIG],
  })),
  perennial('sp.lucumo', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.5, max: 7.5 }, lowerLimit: 6.0, upperLimit: 8.5,
    note: 'El pH óptimo del suelo para lúcumo es de 6,5 a 7,5, con un rango absoluto de tolerancia de 6,0 a 8,5.',
    noteEn: 'Optimum soil pH for lucuma is 6.5 to 7.5, with an absolute tolerance range of 6.0 to 8.5.',
    limitations: 'Ficha agroclimática ECOCROP 8912 de la FAO para Pouteria lucuma.',
    limitationsEn: 'FAO ECOCROP 8912 agro-climatic data sheet for Pouteria lucuma.',
    evidence: [FAO_ECOCROP_LUCUMO],
  },
  airMin(['vegetativo'], 'at_or_below', celsius(0), {
    severity: 'warning',
    effect: 'Helada desde 0 °C: daña brotes iniciales de lúcumo',
    effectEn: 'Frost at or below 0 °C damages early lucuma growth',
    advice: 'A 0 °C se dañan los brotes nuevos del lúcumo, y bajo −5 °C se produce la muerte de ramas en reposo. Protege los árboles jóvenes.',
    adviceEn: 'At 0 °C new lucuma growth is damaged, and below −5 °C dormant branch killing occurs. Protect young trees.',
    note: 'FAO ECOCROP indica una temperatura letal de 0 °C durante el crecimiento temprano y de −5 °C durante el reposo vegetativo.',
    noteEn: 'FAO ECOCROP reports a killing temperature of 0 °C during early growth and −5 °C during rest.',
    limitations: 'Datos agroclimáticos de la FAO para Pouteria lucuma en etapa de crecimiento vegetativo.',
    limitationsEn: 'FAO agro-climatic data for Pouteria lucuma during vegetative growth.',
    evidence: [FAO_ECOCROP_LUCUMO],
  })),
  perennial('sp.mango', airMin(['floracion'], 'below', fromF(40), {
    severity: 'warning',
    effect: 'Frío bajo 4,4 °C en floración: mata flores y frutos pequeños de mango',
    effectEn: 'Cold below 4.4 °C during flowering kills mango blossoms and small fruit',
    advice: 'Bajo 4,4 °C durante algunas horas se dañan o mueren las flores y frutos recién cuajados de mango. Protege los árboles esa noche.',
    adviceEn: 'Below 4.4 °C for a few hours mango flowers and small fruit are damaged or killed. Protect trees that night.',
    note: 'UF/IFAS EDIS MG216 documenta que flores y frutos pequeños de mango se dañan o mueren si la temperatura desciende bajo 40 °F (4,4 °C) por unas pocas horas.',
    noteEn: 'UF/IFAS EDIS MG216 documents that mango flowers and small fruit may be damaged or killed if temperature falls below 40 °F (4.4 °C) for a few hours.',
    limitations: 'Publicación de UF/IFAS para huertos de mango en Florida; señala que el mango no se aclimata al frío.',
    limitationsEn: 'UF/IFAS publication for Florida mango orchards; notes that mango trees do not acclimate to cold.',
    evidence: [UF_MANGO],
  }),
  airMin(['vegetativo'], 'at_or_below', fromF(29), {
    severity: 'warning',
    effect: 'Helada bajo −1,7 °C: riesgo de muerte en árboles jóvenes de mango',
    effectEn: 'Frost at or below −1.7 °C: risk of death in young mango trees',
    advice: 'A −1,7 °C mueren los árboles jóvenes de mango; los adultos toleran hasta −3,9 °C por pocas horas. Protege la plantación.',
    adviceEn: 'At −1.7 °C young mango trees are killed; mature trees tolerate down to −3.9 °C for a few hours. Protect the plantation.',
    note: 'UF/IFAS documenta que árboles jóvenes pueden morir a 29–30 °F (−1,7 a −1,1 °C), mientras que adultos soportan 25 °F (−3,9 °C) por pocas horas.',
    noteEn: 'UF/IFAS documents that young trees may be killed at 29–30 °F (−1.7 to −1.1 °C), while mature trees withstand 25 °F (−3.9 °C) for a few hours.',
    limitations: 'Umbral letal para árboles jóvenes según UF/IFAS.',
    limitationsEn: 'Killing threshold for young trees according to UF/IFAS.',
    evidence: [UF_MANGO],
  })),
  perennial('sp.datilera', airMin(['vegetativo'], 'at_or_below', celsius(-6), {
    severity: 'warning',
    effect: 'Helada bajo −6 °C: quemadura y desecación de folíolos en palmera datilera',
    effectEn: 'Frost at or below −6 °C: leaflet scorching and drying in date palm',
    advice: 'A −6 °C los bordes de los folíolos se secan y amarillean; bajo −9 °C se daña el follaje completo. Revisa las palmas tras fríos extremos.',
    adviceEn: 'At −6 °C leaflet margins dry and turn yellow; below −9 °C the entire canopy is damaged. Check palms after extreme freezes.',
    note: 'FAO documenta que el crecimiento se detiene bajo 7 °C, a −6 °C los bordes de folíolos se secan y entre −9 y −15 °C se daña el follaje.',
    noteEn: 'FAO documents that growth stops below 7 °C, at −6 °C leaflet margins dry out, and between −9 and −15 °C foliage is damaged.',
    limitations: 'Manual de cultivo de FAO y UNR Extension; la datilera presenta alta resistencia térmica pero heladas repetidas bajo −9 °C destruyen la copa.',
    limitationsEn: 'FAO and UNR Extension date palm manual; date palm is very adaptable but repeated freezes below −9 °C destroy canopy.',
    evidence: [FAO_DATE_PALM],
  }),
  airMax(['vegetativo'], 'above', celsius(38), {
    severity: 'info',
    effect: 'Calor sobre 38 °C: reduce la tasa de crecimiento de la palmera datilera',
    effectEn: 'Heat above 38 °C reduces date palm growth rate',
    advice: 'Sobre 38 °C el crecimiento de la palmera datilera empieza a declinar, aunque tolera calor extremo con buen riego. Mantén el riego al día.',
    adviceEn: 'Above 38 °C date palm growth starts decreasing, although it tolerates extreme heat under irrigation. Keep watering up to date.',
    note: 'FAO documenta que el crecimiento de la palmera datilera continúa a tasa estable hasta 38 °C a 40 °C, punto a partir del cual comienza a disminuir.',
    noteEn: 'FAO documents that date palm growth continues at a stable rate until temperature reaches 38 °C to 40 °C, when it starts decreasing.',
    limitations: 'Parámetro fisiológico de FAO; con riego adecuado la datilera tolera temperaturas extremas superiores a 50 °C.',
    limitationsEn: 'FAO physiological parameter; with adequate irrigation date palms tolerate extreme temperatures exceeding 50 °C.',
    evidence: [FAO_DATE_PALM],
  })),
  perennial('sp.maracuya', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 6.0, max: 7.5 }, lowerLimit: null, upperLimit: null,
    note: 'El suelo para maracuyá debe tener un pH entre 6,0 y 7,5.',
    noteEn: 'Soil for passion fruit should have a pH between 6.0 and 7.5.',
    limitations: 'Publicación EDIS HS1467 de UF/IFAS para Passiflora edulis.',
    limitationsEn: 'UF/IFAS EDIS HS1467 publication for Passiflora edulis.',
    evidence: [UF_PASSION_FRUIT],
  },
  airMin(['vegetativo', 'floracion'], 'at_or_below', fromF(59), {
    severity: 'info',
    effect: 'Frío bajo 15 °C: riesgo de daño por enfriamiento en maracuyá',
    effectEn: 'Cold below 15 °C: risk of chilling injury in passion fruit',
    advice: 'Temperaturas entre 0 y 15 °C causan daño por frío y retrasan el crecimiento del maracuyá. El cultivo se desarrolla mejor entre 18 y 32 °C.',
    adviceEn: 'Temperatures between 0 and 15 °C cause chilling injury and retard passion fruit growth. The vine grows best between 18 and 32 °C.',
    note: 'UF/IFAS documenta que la exposición a temperaturas de 32 a 59 °F (0 a 15 °C) puede provocar daño por enfriamiento (chilling injury).',
    noteEn: 'UF/IFAS documents that exposure to temperatures of 32 to 59 °F (0 to 15 °C) can cause chilling injury.',
    limitations: 'Criterio informativo de sensibilidad a bajas temperaturas según UF/IFAS.',
    limitationsEn: 'Informative low temperature sensitivity criterion according to UF/IFAS.',
    evidence: [UF_PASSION_FRUIT],
  }),
  airMin(['vegetativo', 'floracion'], 'at_or_below', fromF(25), {
    severity: 'warning',
    effect: 'Helada bajo −3,9 °C: frío letal para maracuyá morado',
    effectEn: 'Frost at or below −3.9 °C: lethal cold for purple passion fruit',
    advice: 'A −3,9 °C se produce la muerte por helada del maracuyá. Protege las plantas ante cualquier pronóstico de helada.',
    adviceEn: 'At −3.9 °C freezing death of passion fruit occurs. Protect vines against any forecast of frost.',
    note: 'CRFG indica una resistencia al frío en torno a los 25 °F (−3,9 °C) para maracuyá morado (Passiflora edulis).',
    noteEn: 'CRFG indicates cold hardiness around 25 °F (−3.9 °C) for purple passion fruit (Passiflora edulis).',
    limitations: 'Ficha de rusticidad de CRFG para maracuyá morado (Passiflora edulis).',
    limitationsEn: 'CRFG cold hardiness sheet for purple passion fruit (Passiflora edulis).',
    evidence: [CRFG_PASSION_FRUIT],
  })),
  perennial('sp.tumbo', airMin(['vegetativo', 'floracion'], 'at_or_below', fromF(28), {
    severity: 'warning',
    effect: 'Helada bajo −2,2 °C: frío letal para tumbo',
    effectEn: 'Frost at or below −2.2 °C: lethal cold for banana passion fruit',
    advice: 'A −2,2 °C se daña severamente el tumbo. Protege las plantas si se anuncian heladas.',
    adviceEn: 'At −2.2 °C banana passion fruit is severely injured. Protect plants if frosts are forecast.',
    note: 'CRFG documenta una rusticidad al frío de aproximadamente 28 °F (−2,2 °C) para tumbo (Passiflora tripartita var. mollissima).',
    noteEn: 'CRFG documents cold hardiness of about 28 °F (−2.2 °C) for banana passion fruit (Passiflora tripartita var. mollissima).',
    limitations: 'Ficha de rusticidad de CRFG para Passiflora tripartita var. mollissima.',
    limitationsEn: 'CRFG cold hardiness sheet for Passiflora tripartita var. mollissima.',
    evidence: [CRFG_BANANA_PASSION],
  })),
  perennial('sp.tuna', {
    kind: 'ph', state: 'enabled', stages: GROWING,
    optimum: { min: 7.8, max: 7.8 }, lowerLimit: null, upperLimit: 9.0,
    note: 'La tuna tolera suelos alcalinos; sobre pH 9,0 su desarrollo disminuye drásticamente, sin formación de cladodios a pH 9,8.',
    noteEn: 'Prickly pear tolerates alkaline soils; above pH 9.0 growth drops drastically, with no cladode formation at pH 9.8.',
    limitations: 'Estudio de ICAR (India) en ambientes salino-alcalinos; evaluó pH desde 7,8 hasta 9,8 sin medir suelos ácidos, por lo que no se fija límite inferior.',
    limitationsEn: 'ICAR study in saline-alkaline environments; evaluated pH from 7.8 to 9.8 without testing acidic soils, so no lower limit is set.',
    evidence: [ICAR_OPUNTIA_PH],
  }),
  perennial('sp.papayo', airMin(ALL_STAGES, 'below', celsius(2), {
    severity: 'warning',
    effect: 'Frío bajo 2 °C: riesgo de muerte en papayo chileno',
    effectEn: 'Cold below 2 °C: risk of plant death in mountain papaya',
    advice: 'Bajo 2 °C se dañan el tallo y las hojas del papayo chileno, pudiendo causar la muerte de la planta. Protégela del frío.',
    adviceEn: 'Below 2 °C stem and leaves of mountain papaya are damaged, which can cause complete plant death. Protect it from the cold.',
    note: 'Investigación en Frontiers in Plant Science (Letelier et al. 2020) documenta que Vasconcellea pubescens es sensible al frío y puede sufrir muerte completa con temperaturas bajo 2 °C (36 °F).',
    noteEn: 'Research in Frontiers in Plant Science (Letelier et al. 2020) documents that Vasconcellea pubescens is cold sensitive leading to complete plant death below 2 °C (36 °F).',
    limitations: 'Estudio científico sobre especies de la zona central de Chile; describe la alta sensibilidad a bajas temperaturas del papayo chileno.',
    limitationsEn: 'Scientific study on species from the central Chile biodiversity hotspot; describes high sensitivity to low temperatures in mountain papaya.',
    evidence: [FRONTIERS_PAPAYO],
  })),
  perennial('sp.palto', airMin(ALL_STAGES, 'at_or_below', fromF(29), {
    severity: 'warning',
    effect: 'Helada bajo −1,7 °C: riesgo de daño por helada en palto Hass',
    effectEn: 'Frost at or below −1.7 °C: risk of freeze injury in Hass avocado',
    advice: 'Entre −1,7 y −3,9 °C se dañan las ramas y flores del palto Hass. Si se pronostican heladas, activa los métodos de control.',
    adviceEn: 'Between −1.7 and −3.9 °C Hass avocado branches and flowers are damaged. If freezes are forecast, activate control methods.',
    note: 'California Avocado Commission documenta un rango crítico de helada de 25 a 29 °F (−3,9 a −1,7 °C) para la variedad Hass.',
    noteEn: 'California Avocado Commission documents a critical freeze range of 25 to 29 °F (−3.9 to −1.7 °C) for cultivar Hass.',
    limitations: 'Indicación de rusticidad general de la California Avocado Commission para la variedad Hass, la más cultivada en Chile. Árboles jóvenes son más sensibles.',
    limitationsEn: 'General hardiness indication from the California Avocado Commission for Hass, the main commercial variety in Chile. Young trees are more susceptible.',
    evidence: [CAC_AVOCADO_FREEZE],
  })),
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
