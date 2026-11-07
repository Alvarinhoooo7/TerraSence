/**
 * Contrato y constructores de los criterios por especie, con las fuentes compartidas (TASK ES6/ES7).
 * Los perfiles viven en speciesProfilesHortalizas.ts y speciesProfilesFrutales.ts; la versión,
 * el índice `SPECIES_RULES` y la evaluación, en speciesRules.ts. Reglas de evidencia, incluido el
 * criterio por analogía: MOTOR_AGRONOMICO.md §7.1 y §7.5.
 */
import type { PhenologicalStage } from '../types/app';
import type { LocalVariable } from '../types/agronomy';
import type { AppLanguage } from '../types/preferences';


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

export interface SpeciesCriterionBase {
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
  /**
   * `analog`: no hay fuente para esta especie y se usa el criterio documentado de una especie
   * similar (MOTOR_AGRONOMICO.md §7.1). La evidencia y la cifra son las de esa especie, y las
   * limitaciones lo declaran. Por omisión, `species`: la fuente nombra a la especie.
   */
  scope?: 'species' | 'analog';
  /** ID de la especie de origen cuando `scope` es `analog`; debe tener ese criterio con fuente propia. */
  analogOf?: string;
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

export interface SpeciesConditionCriterion extends SpeciesCriterionBase {
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

export const GROWING: PhenologicalStage[] = ['vegetativo', 'floracion'];

/** Cifra en el formato del idioma: coma decimal en español. */
export const decimal = (value: number, language: AppLanguage) => language === 'en' ? String(value) : String(value).replace('.', ',');

// --- Fuentes -------------------------------------------------------------------------

/** Mid-Atlantic Commercial Vegetable Production Recommendations, edición 2026, tabla B-1. */
export const umdTableB1 = (crop: string, target: number, limeBelow: number): SpeciesCriterionEvidence => ({
  institution: 'University of Maryland Extension',
  title: 'Mid-Atlantic Commercial Vegetable Production Recommendations 2026, sección B «Soil and Nutrient Management»',
  url: 'https://extension.umd.edu/sites/extension.umd.edu/files/2026-02/Soil%20and%20Nutrient%20Management.pdf',
  section: 'Tabla B-1 «Target Soil pH Values for Vegetable Crops», p. 40',
  consultedAt: '2026-10-13',
  originalValue: `${crop}: target pH ${target}; apply lime when pH falls below ${limeBelow}`,
});

export const UMD_B1_SCOPE = 'Tabla de producción comercial de hortalizas de la región atlántica media de Estados Unidos; la fuente sólo fija el valor objetivo y el pH bajo el cual encalar, sin un máximo. Ese mínimo es una indicación de manejo, no un umbral de daño medido en Chile.';
export const UMD_B1_SCOPE_EN = 'Commercial vegetable production table for the US Mid-Atlantic; the source only sets the target value and the pH below which to lime, with no maximum. That minimum is a management threshold, not a damage threshold measured in Chile.';
export const UMD_ORGANIC = ' En suelos con más de 6 % de materia orgánica, la misma fuente indica que muchos cultivos con objetivo 6,5 toleran un pH menor, típicamente 5,6.';
export const UMD_ORGANIC_EN = ' On soils with more than 6% organic matter, the same source notes that many crops with a 6.5 target tolerate a lower pH, typically 5.6.';

/**
 * Hortaliza de la tabla B-1: el objetivo es el óptimo y «encalar bajo» es el límite inferior.
 * `extra` agrega el alcance propio de la especie (p. ej. qué uso cubre la fila de la tabla).
 */
export const umdVegetable = (
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

export const annual = (speciesId: string, ...criteria: (SpeciesCriterion | readonly SpeciesCriterion[])[]): SpeciesRuleProfile =>
  ({ speciesId, horizon: 'annual', establishment: 'not_specified', criteria: criteria.flat() });
export const perennial = (speciesId: string, ...criteria: (SpeciesCriterion | readonly SpeciesCriterion[])[]): SpeciesRuleProfile =>
  ({ speciesId, horizon: 'perennial_partial', establishment: 'established_plantation', criteria: criteria.flat() });

/**
 * Marca un criterio tomado de una especie similar (MOTOR_AGRONOMICO.md §7.1). Se redacta para la
 * especie destino, con la evidencia y la cifra de `fromSpeciesId`, y sus limitaciones empiezan con
 * «Sin fuente propia para {especie}: se usa el criterio documentado para {origen}, {semejanza}.».
 */
export const analog = <C extends SpeciesCriterion>(fromSpeciesId: string, criterion: C): C =>
  ({ ...criterion, scope: 'analog', analogOf: fromSpeciesId });

// --- Umbrales y constructores de criterios de condición --------------------------------

/** °F a °C con un decimal, la única conversión que se aplica a una cifra de una fuente. */
export const fahrenheitToCelsius = (f: number) => Math.round(((f - 32) * 5 / 9) * 10) / 10;
export const fromF = (f: number): SpeciesThreshold => ({ value: fahrenheitToCelsius(f), basis: 'source', sourceValue: { value: f, unit: '°F' } });
export const celsius = (value: number): SpeciesThreshold => ({ value, basis: 'source' });
export const percent = celsius;
/** 0 °C como definición física de helada, cuando la fuente no da una temperatura. */
export const FROST: SpeciesThreshold = { value: 0, basis: 'frost_definition' };

export const ALL_STAGES: PhenologicalStage[] = ['vegetativo', 'floracion', 'cosecha'];

export type ConditionText = Pick<SpeciesConditionCriterion,
  'severity' | 'effect' | 'effectEn' | 'advice' | 'adviceEn' | 'note' | 'noteEn' | 'limitations' | 'limitationsEn' | 'evidence'>;

export const airMin = (stages: readonly PhenologicalStage[], comparison: SpeciesComparison, threshold: SpeciesThreshold, text: ConditionText): SpeciesAirTemperatureCriterion =>
  ({ kind: 'air_temperature', state: 'enabled', stages, extreme: 'minimum', comparison, threshold, ...text });
export const airMax = (stages: readonly PhenologicalStage[], comparison: 'above' | 'at_or_above', threshold: SpeciesThreshold, text: ConditionText): SpeciesAirTemperatureCriterion =>
  ({ kind: 'air_temperature', state: 'enabled', stages, extreme: 'maximum', comparison, threshold, ...text });
export const weatherEvent = (stages: readonly PhenologicalStage[], event: 'rain' | 'fog', text: ConditionText): SpeciesWeatherEventCriterion =>
  ({ kind: 'weather_event', state: 'enabled', stages, event, ...text });
export const readingBelow = (stages: readonly PhenologicalStage[], variable: 'temp' | 'airHumidity', comparison: 'below' | 'at_or_below', threshold: SpeciesThreshold, text: ConditionText): SpeciesReadingCriterion =>
  ({ kind: 'reading', state: 'enabled', stages, variable, comparison, threshold, ...text });

// --- Helada sobre la fruta en cosecha (USDA Handbook 66), compartida por frutales y berries ---

/** USDA Agriculture Handbook 66 (Hardenburg, Watada y Wang, 1986), tabla 1, reproducida por University of Maine Cooperative Extension. */
export const UMAINE_4135_TITLE = 'Bulletin #4135, Storage Conditions: Fruits and Vegetables (K. L. B. Gast; reimpreso de Kansas State University Cooperative Extension Service, 2001), tabla 1, con datos de Hardenburg, Watada y Wang (1986), USDA Agriculture Handbook N.° 66';
export const UMAINE_4135_URL = 'https://extension.umaine.edu/publications/4135e/';
export const umaineFreeze = (row: string): SpeciesCriterionEvidence => ({
  institution: 'University of Maine Cooperative Extension',
  title: UMAINE_4135_TITLE,
  url: UMAINE_4135_URL,
  section: 'Tabla 1, columna «Freezing point (°F)»',
  consultedAt: '2026-10-18',
  originalValue: row,
});

export const HARVEST_FREEZE_SCOPE = 'El valor es el «punto de congelación» más alto registrado para la fruta ya cosechada en la tabla de almacenamiento de USDA Agriculture Handbook 66 (Hardenburg, Watada y Wang, 1986), reproducida por University of Maine Cooperative Extension; no se midió en el árbol. Se usa aquí como referencia de la temperatura a la que se congela el tejido del fruto todavía en maduración.';
export const HARVEST_FREEZE_SCOPE_EN = 'The value is the highest "freezing point" recorded for the already-harvested fruit in the USDA Agriculture Handbook 66 storage table (Hardenburg, Watada and Wang, 1986), reproduced by University of Maine Cooperative Extension; it was not measured on the tree. It is used here as a reference for the temperature at which the still-ripening fruit tissue freezes.';

/** Helada sobre la fruta en maduración, con la cifra de la tabla 1 de USDA Handbook 66 (University of Maine). */
export const harvestFreeze = (cropEs: string, cropEn: string, f: number, evidence: SpeciesCriterionEvidence) => {
  const cEs = decimal(fahrenheitToCelsius(f), 'es');
  const cEn = decimal(fahrenheitToCelsius(f), 'en');
  return airMin(['cosecha'], 'at_or_below', fromF(f), {
    severity: 'warning',
    effect: `Helada en cosecha: congela el tejido de ${cropEs} en maduración`,
    effectEn: `Frost at harvest freezes ripening ${cropEn} tissue`,
    advice: `Bajo ${cEs} °C el fruto de ${cropEs} que sigue en la planta se congela. Si hay fruta lista, cosecharla antes de la helada reduce la pérdida.`,
    adviceEn: `Below ${cEn} °C ${cropEn} fruit still on the plant freezes. If fruit is ready, harvesting it before the frost reduces loss.`,
    note: `La tabla de USDA Handbook 66 (reproducida por University of Maine Extension) documenta un punto de congelación de ${f} °F (${cEs} °C) para esta fruta.`,
    noteEn: `The USDA Handbook 66 table (reproduced by University of Maine Extension) documents a freezing point of ${f} °F (${cEn} °C) for this fruit.`,
    limitations: HARVEST_FREEZE_SCOPE,
    limitationsEn: HARVEST_FREEZE_SCOPE_EN,
    evidence: [evidence],
  });
};

// --- Fuentes de tolerancia a helada de hortalizas ----------------------------------------

export const NEBRASKA_CLASS = {
  veryHardy: 'Very hardy: Can withstand freezing temperatures and hard frost (less than 28° F) for short periods without injury.',
  tolerant: 'Frost tolerant: Can withstand light frosts (28 - 32° F) without injury.',
  tender: 'Tender: Injury or killed by frost (28 - 32° F).',
} as const;

/** Nebraska Extension: lista de hortalizas por tolerancia al frío. */
export const nebraska = (group: keyof typeof NEBRASKA_CLASS, crop: string): SpeciesCriterionEvidence => ({
  institution: 'Nebraska Extension (University of Nebraska–Lincoln)',
  title: 'Frost – Cold Temperatures Bring an End to the Gardening Season (S. Browning, 2023)',
  url: 'https://lancaster.unl.edu/frost-cold-temperatures-bring-end-gardening-season/',
  section: 'Clasificación de hortalizas por tolerancia al frío: «Very hardy», «Frost tolerant» y «Tender»',
  consultedAt: '2026-10-14',
  originalValue: `${NEBRASKA_CLASS[group]} Crop listed: ${crop}`,
});

export const SDSU_CLASS = {
  none: 'No Frost Tolerance: The following vegetables are not cold tolerant, and they should be protected from frost or harvested before even a light frost. (Light freezes: 28 to 32 degrees Fahrenheit.)',
  light: 'Light Frost Tolerance: Crops from more-temperate regions can withstand light freezes (28 to 32 degrees Fahrenheit).',
  hardy: 'Frost Hardy: cole crops, which can tolerate moderate freezes (24 to 28 degrees Fahrenheit).',
} as const;

/** South Dakota State University Extension: tolerancia a heladas de otoño de hortalizas. */
export const sdsu = (group: keyof typeof SDSU_CLASS, crop: string): SpeciesCriterionEvidence => ({
  institution: 'South Dakota State University Extension',
  title: 'Fall Frost Tolerance of Common Vegetables (R. Burrows, actualizado en 2023)',
  url: 'https://extension.sdstate.edu/fall-frost-tolerance-common-vegetables',
  section: '«No Frost Tolerance», «Light Frost Tolerance» y «Frost Hardy»',
  consultedAt: '2026-10-14',
  originalValue: `${SDSU_CLASS[group]} Crop listed: ${crop}`,
});

/** Colorado State University Extension: clasificación de siembra que contrasta apio. */
export const CSU_CELERY: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Extension',
  title: 'Vegetable Planting Guide (CMG GardenNotes #720, revisado en 2024)',
  url: 'https://extension.colostate.edu/resource/vegetable-planting-guide/',
  section: '«Warm Season Vegetables», «Tender Vegetables»',
  consultedAt: '2026-10-14',
  originalValue: 'Tender Vegetables. Crops: beans, celery, corn, cucumbers, New Zealand spinach, summer squash. Tender vegetables grow with a daytime temperature above 55°F and are intolerant of frost.',
};

export const WISCONSIN_ALLIUMS: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Extension',
  title: 'Growing onions, garlic, leeks, and other alliums in Wisconsin (A3785)',
  url: 'https://hort.extension.wisc.edu/files/2023/10/A3785-Growing-Onions-Garlic-Leeks-and-Other-Alliums-in-Wisconsin-KA-Delahaut-and-AC-Newenhouse.pdf',
  section: '«Onions», tipos de cebolla',
  consultedAt: '2026-10-14',
  originalValue: 'Green onions are actually immature true onions. Japanese bunching onions (Allium fistulosum) are similar to scallions in that they do not form bulbs. They are very hardy and can be seeded in late summer to be overwintered and harvested in spring.',
};

export const SDSU_LEEKS: SpeciesCriterionEvidence = {
  institution: 'South Dakota State University Extension',
  title: 'Leeks: Harvest and Storage (D. Kohn, actualizado en 2025)',
  url: 'https://extension.sdstate.edu/leeks-harvest-and-storage',
  section: '«When to Harvest Leeks» y «On-farm Storage of Leeks»',
  consultedAt: '2026-10-14',
  originalValue: 'Harvest can be delayed until after the first few frosts. If temperatures start to go below 20 degrees Fahrenheit, mulch the mounds of leeks to protect them.',
};

export const IOWA_ASPARAGUS: SpeciesCriterionEvidence = {
  institution: 'Iowa State University Extension and Outreach',
  title: 'Harvesting Asparagus (R. Jauron, 2018)',
  url: 'https://yardandgarden.extension.iastate.edu/article/2018/03/harvesting-asparagus',
  section: 'Cosecha de turiones en primavera',
  consultedAt: '2026-10-14',
  originalValue: 'Tender spears are sensitive to frost damage; so in early spring it\'s advisable to cut the spears prior to the 8-inch height.',
};

export const POTATO_FROST: SpeciesCriterionEvidence = {
  institution: 'Universidad Nacional de Trujillo (revista Scientia Agropecuaria)',
  title: 'Tolerancia de papas nativas (Solanum spp.) a heladas en el contexto de cambio climático (Marmolejo y Ruiz, 2018, vol. 9, n.° 3)',
  url: 'https://www.scielo.org.pe/scielo.php?script=sci_arttext&pid=S2077-99172018000300010',
  section: 'Introducción',
  consultedAt: '2026-10-14',
  originalValue: 'El cultivo de papa (Solanum tuberosum L.) es significativamente afectado por heladas, la mayoría de las variedades cultivadas son sensibles a temperaturas inferiores a -2.5 C, causando daños visibles a nivel foliar',
};

export const FROST_SCOPE = 'Clasificación de INIA para hortalizas al aire libre; las temperaturas provienen de extensión agrícola de Estados Unidos. Plántulas recién establecidas pueden ser más sensibles, y la duración de la helada también influye.';
export const FROST_SCOPE_EN = 'INIA classification for outdoor vegetables; temperatures come from US agricultural extension. Newly established seedlings may be more sensitive, and frost duration also matters.';

/** Hortaliza sin tolerancia a helada: advertencia con mínima de 0 °C (32 °F) o menos. */
export const frostTender = (evidence: SpeciesCriterionEvidence[], extra = '', extraEn = ''): SpeciesAirTemperatureCriterion =>
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
export const frostTolerant = (downToF: number, evidence: SpeciesCriterionEvidence[], extra = '', extraEn = '',
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

export const INIA_165_GROUPS = {
  none: '4.3.1. Especies que no toleran heladas: albahaca, ají, berenjena, camote, maíz, melón, papa, pepino, pepino dulce, pimiento, poroto verde y granado, sandía, tomate, zapallo, zapallito italiano. Algunas, como el tomate, son capaces de tolerar hasta -2ºC por un corto tiempo, mientras que otras como pepino dulce, sandía y melón no son capaces de tolerar 0ºC.',
  weak: '4.3.2. Especies que toleran heladas débiles: acelga, betarraga, espinaca, brócoli, rábano, repollo, repollito de Bruselas, zanahoria.',
  maturity: '4.3.3. Especies que se dañan cerca de madurez: también tienen un grado de tolerancia a las heladas, pero se dañan más fácilmente cuando se encuentran en un estado de desarrollo cercano a la cosecha. Este daño habitualmente afecta a la calidad del producto cosechado, pero en algunos casos puede perderse la producción: alcachofa, apio, arveja, coliflor, haba, lechuga.',
  tolerant: '4.3.4. Especies que toleran heladas: ajo, cebollas, cebollines, chalota y puerro.',
  flowering: '4.2. Aborto floral: de especial importancia en habas y arvejas que se encuentran en floración.',
} as const;

/** INIA Intihuasi, Boletín 165: sensibilidad de las hortalizas a las heladas. */
export const inia165 = (group: keyof typeof INIA_165_GROUPS): SpeciesCriterionEvidence => ({
  institution: 'INIA Intihuasi',
  title: 'Efectos de las heladas en la agricultura (Boletín INIA N° 165, 2007)',
  url: 'https://biblioteca.inia.cl/items/475bd934-243f-4f91-8e24-ec7b98eed311',
  section: '4.2 «Efecto de las heladas en las hortalizas» y 4.3 «Sensibilidad de las hortalizas a las heladas», pp. 41–44',
  consultedAt: '2026-10-14',
  originalValue: INIA_165_GROUPS[group],
});

export const INIA_1998_FROST: SpeciesCriterionEvidence = {
  institution: 'INIA Intihuasi',
  title: 'Manual de producción de hortalizas (INDAP-PRODECOP e INIA Intihuasi, 1998)',
  url: 'https://biblioteca.inia.cl/items/16f6bd25-6b1c-4973-8be7-dfa23d2ee52f',
  section: 'Requerimientos de clima: temperaturas críticas y heladas',
  consultedAt: '2026-10-14',
  originalValue: 'La helada ocurre cuando se registran temperaturas inferiores a 0ºC en el cobertizo meteorológico, lo que comúnmente da una medida un poco más alta de la que ocurre a nivel de superficie del suelo. Toleran heladas débiles: espinaca, repollo, brócoli, repollo de Bruselas, betarraga. Se dañan cerca de la madurez: coliflor, alcachofa, lechuga, arveja, apio, zanahoria, acelga, perejil. Toleran heladas: cebolla, ajo, puerro, espárrago. No toleran heladas: todas las de verano.',
};

export const INIA_165_OLIVE: SpeciesCriterionEvidence = {
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
export const frostNearMaturity = (extra = '', extraEn = ''): SpeciesAirTemperatureCriterion =>
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

export const UMD_POLLINATION: SpeciesCriterionEvidence = {
  institution: 'University of Maryland Extension',
  title: 'Vegetable Plant Pollination in a Changing Climate (Home and Garden Information Center, actualizado en 2026)',
  url: 'https://extension.umd.edu/resource/pollination-vegetable-crops-changing-climate',
  section: '«How will I know if I have a heat stress pollination problem?»',
  consultedAt: '2026-10-14',
  originalValue: 'This problem has been observed in mostly self-fertile crops like bean, tomato, and pepper, and in crops that need cross-pollination, like squash and pumpkin. Generally, day temperatures above 95°F and night temperatures above 75°F can cause problems. Snap beans: University of Delaware research found that night temperatures above 68°F caused pollination problems.',
};

export const PURDUE_CORN: SpeciesCriterionEvidence = {
  institution: 'Purdue University, Department of Agronomy',
  title: 'Drought and Heat Stress Effects on Corn Pollination (R. L. Nielsen)',
  url: 'https://www.agry.purdue.edu/ext/corn/pubs/corn-07.htm',
  section: 'Efectos del calor sobre las sedas y el polen',
  consultedAt: '2026-10-14',
  originalValue: 'Temperatures in excess of 95 degrees, especially when accompanied by low relative humidity, can dessicate exposed silks. Pollen is likely damaged by mid-90\'s or greater temperatures, especially when accompanied by low relative humidity. Temperatures over 100 degrees may literally kill pollen.',
};

export const HEAT_SCOPE = 'Se compara la máxima o mínima diaria pronosticada; unas pocas horas de calor durante la polinización bastan para causar problemas en cultivares sensibles, y la tolerancia cambia entre variedades.';
export const HEAT_SCOPE_EN = 'The forecast daily maximum or minimum is compared; a few hours of heat during pollination are enough to cause problems in sensitive cultivars, and tolerance varies among varieties.';

/** Días sobre 95 °F y noches sobre `nightF`: problemas de polinización documentados por UMD. */
export const pollinationHeat = (nightF: number, nightNote: string, nightNoteEn: string): SpeciesAirTemperatureCriterion[] => [
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
export const WARM_NIGHT_NOTE = 'La fuente indica que noches sobre 75 °F (23,9 °C) causan problemas de polinización, y que la temperatura nocturna parece ser el factor más responsable.';
export const WARM_NIGHT_NOTE_EN = 'The source states that nights above 75 °F (23.9 °C) cause pollination problems, and that night temperature seems to be the factor most responsible.';

// --- Salinidad y agua: FAO ---------------------------------------------------------------

export const RATING_ES = { sensitive: 'sensible', moderately_sensitive: 'moderadamente sensible', moderately_tolerant: 'moderadamente tolerante', tolerant: 'tolerante' } as const;
export const RATING_EN = { sensitive: 'sensitive', moderately_sensitive: 'moderately sensitive', moderately_tolerant: 'moderately tolerant', tolerant: 'tolerant' } as const;
export const RATING_FAO = { sensitive: 'Sensitive', moderately_sensitive: 'Moderately sensitive', moderately_tolerant: 'Moderately tolerant', tolerant: 'Tolerant' } as const;

/** FAO 29, tablas 4 y 5: tolerancia a sales en extracto saturado (Maas y Hoffman). */
export const salt = (row: string, thresholdEce: number | null, rating: SpeciesSalinityCriterion['rating']): SpeciesSalinityCriterion => {
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
export const waterSensitive = (row: string, values: string, ky: number, period: SpeciesWaterCriterion['period']): SpeciesWaterCriterion => {
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

/** FAO 56, tablas 12 y 22: coeficiente de cultivo medio (Kc mid) y fracción de agotamiento sin estrés (p). */
export const fao56Water = (row: string, kcMid: number, depletionP: number, period: SpeciesWaterCriterion['period']): SpeciesWaterCriterion => {
  const es = period === 'flowering' ? 'floración y cuaja' : 'desarrollo vegetativo';
  const en = period === 'flowering' ? 'flowering and fruit set' : 'vegetative development';
  return {
    kind: 'water_sensitivity', state: 'enabled', stages: [period === 'flowering' ? 'floracion' : 'vegetativo'], ky: depletionP, period,
    note: `Durante ${es} este cultivo presenta máxima demanda hídrica: FAO 56 documenta un coeficiente de cultivo medio Kc de ${decimal(kcMid, 'es')} y una fracción de agotamiento sin estrés hídrico p de ${decimal(depletionP, 'es')}.`,
    noteEn: `During ${en} this crop has its peak water demand: FAO 56 documents a mid-season crop coefficient Kc of ${decimal(kcMid, 'en')} and a no-stress soil water depletion fraction p of ${decimal(depletionP, 'en')}.`,
    limitations: 'La fracción p de FAO 56 indica la proporción del agua disponible que puede agotarse antes de reducir la transpiración, y depende de la capacidad de campo y del punto de marchitez permanente del suelo; la humedad volumétrica puntual de la sonda sin curva de retención por textura no permite calcular ese agotamiento ni una lámina de riego.',
    limitationsEn: 'The FAO 56 fraction p indicates the share of available soil water that can be depleted before transpiration is reduced, and depends on field capacity and permanent wilting point; a single volumetric moisture reading from the probe without a texture retention curve cannot compute that depletion or an irrigation depth.',
    evidence: [{
      institution: 'FAO',
      title: 'Crop evapotranspiration — Guidelines for computing crop water requirements (FAO Irrigation and Drainage Paper 56, R. G. Allen, L. S. Pereira, D. Raes y M. Smith, 1998)',
      url: 'https://www.fao.org/4/x0490e/x0490e0b.htm',
      section: 'Capítulo 6, tabla 12 «Single (time-averaged) crop coefficients, Kc» y capítulo 8, tabla 22 «Soil water depletion fraction for no stress, p»',
      consultedAt: '2026-10-18',
      originalValue: `Table 12 & Table 22, ${row}: Kc mid = ${kcMid}; soil water depletion fraction for no stress p = ${depletionP}.`,
    }],
  };
};

/** Analogía declarada para salinidad (FAO 29). */
export const analogSalt = (
  fromSpeciesId: string,
  targetEs: string,
  targetEn: string,
  originEs: string,
  originEn: string,
  reasonEs: string,
  reasonEn: string,
  row: string,
  thresholdEce: number | null,
  rating: SpeciesSalinityCriterion['rating'],
): SpeciesSalinityCriterion => {
  const base = salt(row, thresholdEce, rating);
  return analog(fromSpeciesId, {
    ...base,
    note: `Por analogía con ${originEs.toLowerCase()}: ${base.note}`,
    noteEn: `By analogy with ${originEn.toLowerCase()}: ${base.noteEn}`,
    limitations: `Sin fuente propia para ${targetEs}: se usa el criterio documentado para ${originEs} (${originEn}), porque ${reasonEs}. ${base.limitations}`,
    limitationsEn: `No source of its own for ${targetEn}: the documented criterion for ${originEn} is used, because ${reasonEn}. ${base.limitationsEn}`,
  });
};

/** Analogía declarada para sensibilidad hídrica (FAO 33/40 o FAO 56). */
export const analogWater = (
  fromSpeciesId: string,
  targetEs: string,
  targetEn: string,
  originEs: string,
  originEn: string,
  reasonEs: string,
  reasonEn: string,
  base: SpeciesWaterCriterion,
): SpeciesWaterCriterion => analog(fromSpeciesId, {
  ...base,
  note: `Por analogía con ${originEs.toLowerCase()}: ${base.note}`,
  noteEn: `By analogy with ${originEn.toLowerCase()}: ${base.noteEn}`,
  limitations: `Sin fuente propia para ${targetEs}: se usa el criterio documentado para ${originEs} (${originEn}), porque ${reasonEs}. ${base.limitations}`,
  limitationsEn: `No source of its own for ${targetEn}: the documented criterion for ${originEn} is used, because ${reasonEn}. ${base.limitationsEn}`,
});

/** Analogía declarada para pH del suelo. */
export const analogPh = (
  fromSpeciesId: string,
  targetEs: string,
  targetEn: string,
  originEs: string,
  originEn: string,
  reasonEs: string,
  reasonEn: string,
  base: SpeciesPhCriterion,
): SpeciesPhCriterion => analog(fromSpeciesId, {
  ...base,
  note: `Por analogía con ${originEs.toLowerCase()}: ${base.note}`,
  noteEn: `By analogy with ${originEn.toLowerCase()}: ${base.noteEn}`,
  limitations: `Sin fuente propia para ${targetEs}: se usa el criterio documentado para ${originEs} (${originEn}), porque ${reasonEs}. ${base.limitations}`,
  limitationsEn: `No source of its own for ${targetEn}: the documented criterion for ${originEn} is used, because ${reasonEn}. ${base.limitationsEn}`,
});

// --- Lluvia cerca de la cosecha en hortalizas de fruto ------------------------------------

/** University of Maryland Extension: rajadura por lluvia («rain checking») en varias hortalizas de fruto. */
export const UMD_VEGETABLE_CRACKING = (crop: string): SpeciesCriterionEvidence => ({
  institution: 'University of Maryland Extension',
  title: 'Cracking of Vegetables (actualizado el 20 de febrero de 2023)',
  url: 'https://www.extension.umd.edu/node/2473',
  section: '«Rain checking»',
  consultedAt: '2026-10-15',
  originalValue: `Longitudinal and concentric growth cracking also called "rain checking" is caused by soil moisture fluctuations, persistent rainfall, and heavy dews. Melons, cucumbers, eggplant, tomato, and pepper are often affected. Crop listed: ${crop}. Recommended: water plants deeply and regularly; consider harvesting fruits prior to full ripeness during periods of frequent rainfall or heavy dew.`,
});

export const RAIN_CRACKING_SCOPE = 'La fuente no fija una cantidad de lluvia ni un porcentaje de pérdida: describe el mecanismo (agua que entra a la fruta por la cicatriz del pedúnculo o grietas de la piel) y recomienda cosechar antes de que la fruta esté totalmente madura en períodos de lluvia frecuente.';
export const RAIN_CRACKING_SCOPE_EN = 'The source sets no rainfall amount or loss percentage: it describes the mechanism (water entering the fruit through the stem scar or skin cracks) and advises harvesting before full ripeness during periods of frequent rain.';

/** Rajadura por lluvia cerca de la cosecha: hortaliza de fruto nombrada por UMD en «Cracking of Vegetables». */
export const rainCrackingFruit = (crop: string, cropEn: string): SpeciesWeatherEventCriterion =>
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

export const UDEL_TOMATO_CRACKING: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Fruit Cracking in Tomato (E. Ernest, agosto de 2026)',
  url: 'https://www.udel.edu/content/dam/udelImages/canr/pdfs/extension/factsheets/Fruit-Cracking-in-Tomatoes_A.pdf',
  section: 'Texto completo de la hoja técnica',
  consultedAt: '2026-10-15',
  originalValue: 'Rain during tomato fruit ripening can result in increased fruit cracking in field tomatoes causing extensive losses of marketable fruit. Cracking is most common after heavy rain events but can also occur with irregular irrigation.',
};

export const UDEL_BEAN_POD_ROT: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Pythium in Vegetable Production (A. Koehler, Weekly Crop Update, 4 de junio de 2021)',
  url: 'https://sites.udel.edu/weeklycropupdate/?p=18401',
  section: 'Sección sobre poroto verde (snap beans)',
  consultedAt: '2026-10-15',
  originalValue: 'In snap beans, Pythium can be a problem at different stages throughout the season. Cottony leak of pods occurs on mature plants near harvest or postharvest. Cottony leak (Pythium Blight) is typically worse when there is rainy weather with cool temperatures. It is also recommended to avoid harvesting and packing during wet weather.',
};

// --- Lluvia y calor en cosecha de tubérculos y perejil -----------------------------------

export const NEBRASKA_POTATO_WET_ROT: SpeciesCriterionEvidence = {
  institution: 'University of Nebraska–Lincoln Extension',
  title: 'Wet Rots of Potato in Storage (G2203, A. D. Pavlista, Extension Potato Specialist, 2013)',
  url: 'https://extensionpubs.unl.edu/publication/g2203/na/pdf/view',
  section: 'Resumen inicial',
  consultedAt: '2026-10-15',
  originalValue: 'Protect stored potatoes from wet rots by digging when the soil is not wet; avoiding bruising when handling; and storing under cool, dry, and well-ventilated conditions.',
};

export const MSU_SWEETPOTATO_HARVEST: SpeciesCriterionEvidence = {
  institution: 'Mississippi State University Extension Service',
  title: 'State expects average sweet potato harvest (B. Coblentz, citando a L. Harvey, especialista en camote, 2021)',
  url: 'https://extension.msstate.edu/news/crop-report/2021/state-expects-average-sweet-potato-harvest',
  section: 'Declaraciones de Lorin Harvey sobre lluvia y guarda',
  consultedAt: '2026-10-15',
  originalValue: 'Rainfall at the end of the growing season causes storage problems, such as rot issues. Warm, wet soils increase bacteria and fungus growth in the soils.',
};

export const OSU_WINTER_SQUASH_HARVEST: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Plan now to harvest and store pumpkins and winter squash (K. Pokorny, 2023, revisado en 2025)',
  url: 'https://extension.oregonstate.edu/node/153311',
  section: '«Harvest timing»',
  consultedAt: '2026-10-15',
  originalValue: "Pumpkins and squash should be harvested before the weather turns too cold or wet. When temperatures dip below 50°F for more than a week or rain becomes frequent, it's time to bring in your harvest.",
};

export const UIUC_CABBAGE_SPLIT: SpeciesCriterionEvidence = {
  institution: 'University of Illinois Extension',
  title: 'Cabbage (Home Vegetable Gardening)',
  url: 'https://extension.illinois.edu/gardening-site/cabbage',
  section: 'Guía de cultivo de repollo, cosecha',
  consultedAt: '2026-10-15',
  originalValue: 'When heads are mature, a sudden heavy rain may cause heads to crack or split wide open. Splitting is caused by the pressure of excessive water taken up after the heads are solid. For highest yield, cut the cabbage heads when they are solid (firm to hand pressure) but before they crack or split.',
};

export const UMN_LETTUCE_HEAT: SpeciesCriterionEvidence = {
  institution: 'University of Minnesota Extension',
  title: "What's wrong with my plant? — Lettuce & endive, flowering plant",
  url: 'https://apps.extension.umn.edu/garden/diagnose/plant/vegetable/lettuce%26endive/floweringplant.html',
  section: 'Diagnóstico: planta de lechuga con tallo floral',
  consultedAt: '2026-10-15',
  originalValue: 'Plant produces a flower stalk under multiple days of high temperatures (> 75°F). Lettuce may taste bitter if grown under high temperatures.',
};

export const CORNELL_ONION_HARVEST: SpeciesCriterionEvidence = {
  institution: 'Cornell Cooperative Extension, Cornell Vegetable Program',
  title: '«Rolling Onions to "Stop the Rot"» (C. Hoepting, VegEdge, vol. 18, n.° 21, 31 de agosto de 2022)',
  url: 'https://rvpadmin.cce.cornell.edu/pdf/veg_edge/pdf252_pdf.pdf',
  section: 'Ensayo a campo 2021 sobre pudrición bacteriana del bulbo',
  consultedAt: '2026-10-15',
  originalValue: 'In a 2021 on-farm study, we observed numerically 35% less bacterial bulb rot when plants with 40-50% leaf dieback that were "dying standing up" were rolled (4.2%) compared to those that were left standing (6.5%). Splashing rain from heavy rainfall may introduce bacterial pathogens into the neck area and leaf axils of standing onions.',
};

export const UARK_PARSLEY: SpeciesCriterionEvidence = {
  institution: 'University of Arkansas Division of Agriculture, Cooperative Extension Service',
  title: 'Parsley (Home Gardening Series, FSA6091, C. R. Andersen, Associate Professor and Extension Specialist)',
  url: 'https://www.uaex.uada.edu/publications/PDF/FSA-6091.pdf',
  section: '«Harvesting» y preguntas frecuentes sobre cosecha prolongada',
  consultedAt: '2026-10-15',
  originalValue: 'If parsley is forced to grow for long periods at temperatures above 90 degrees F, growth is greatly reduced and death may occur.',
};

// --- Fuentes INIA y de extensión para tomate, frutales y berries --------------------------

export const INIA_TOMATO_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA',
  title: 'Manual de cultivo del tomate al aire libre (Boletín INIA–INDAP), capítulo 1',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/21592963-55e3-43bb-9426-bd9ec288ae07/content',
  section: '1.5.2 Clima y cuadro 1.3 «Temperaturas críticas para el cultivo de tomate», p. 16',
  consultedAt: '2026-10-14',
  originalValue: 'Temperaturas bajo 10°C afectan la formación de flores y temperaturas mayores a 35°C pueden afectar la fructificación. Cuando [la temperatura nocturna] es inferior a 10°C originaría problemas en el desarrollo de la planta y frutos. Cuadro 1.3: Se hiela la planta -2ºC; Detiene su desarrollo 10–12°C.',
};

export const INIA_CHERRY_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA La Platina',
  title: 'El cultivo del cerezo (Boletín INIA N° 133, 2005)',
  url: 'https://biblioteca.inia.cl/items/4ed5eb65-a167-4db2-a6bc-1ebb7a26c489',
  section: 'Requerimientos de clima: «Temperatura» (cuadro 2, Proebsting y Mills, 1978) y «Humedad relativa»; descripción del fruto',
  consultedAt: '2026-10-14',
  originalValue: 'Con -1,1 ºC en primavera ya sufren daño las flores y los frutos; la etapa más sensible a las heladas es el estado de fruto recién cuajado. Cuadro 2, cerezo Bing, plena flor: T10 -2,4; T50 -3,2; T90 -3,9. Temperaturas mayores a 30ºC reducen la capacidad del grano de polen de adherirse al estigma, de germinar y de que el tubo polínico alcance el óvulo. Con más de 36ºC en verano se limita el crecimiento. Las lluvias durante la floración reducen la polinización y ocasionan lavado de polen; antes o durante la cosecha pueden ocasionar partidura de fruta y pudriciones. En la época de maduración son muy sensibles a las partiduras provocadas por rocío o lluvias.',
};

export const INIA_OLIVE_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA Intihuasi',
  title: 'Manual del cultivo del olivo (Boletín INIA N° 101, 2003)',
  url: 'https://biblioteca.inia.cl/items/f6a76e2b-197e-4643-8243-d29bc434cf1a',
  section: 'Capítulo 1 «Requerimientos de clima y suelo», cuadro 2 y floración, pp. 11–14',
  consultedAt: '2026-10-14',
  originalValue: 'Cuadro 2: Brotes tiernos -5 a 0: quemazón de ápices y heridas en ramillas; Brotes menores de 1 año -10 a -5: muerte de ramillas. Aunque el olivo es capaz de soportar altas temperaturas veraniegas, del orden de 40ºC, sin sufrir quemaduras, su actividad se detiene cuando éstas superan los 35ºC. Las nieblas son perjudiciales para el olivo, principalmente si se producen en el período de floración ya que provocan la caída de flores. Si la situación es de humedad relativa inferior a 50%, la viabilidad del estigma se reduce a menos de tres días.',
};

export const INIA_STRAWBERRY_CLIMATE: SpeciesCriterionEvidence = {
  institution: 'INIA Quilamapu',
  title: 'Manual de frutilla (Boletín INIA N° 262, 2013)',
  url: 'https://bibliotecadigital.ciren.cl/server/api/core/bitstreams/6989b90c-bc5f-494d-b790-fe196c0d430d/content',
  section: '«Requerimientos agroclimáticos de la frutilla», pp. 7–8, y «Pudrición gris (Botrytis cinerea)», pp. 69–70',
  consultedAt: '2026-10-14',
  originalValue: 'Los mejores rendimientos se obtienen en zonas templadas, sin vientos ni heladas en primavera, y sin lluvias ni elevadas temperaturas en épocas de cosecha. Temperaturas superiores a 32 °C en general pueden producir abortos florales. Las raíces se desarrollan mejor con temperaturas mayores a 12 °C en el suelo. Los frutos maduros son muy susceptibles a la pudrición gris; las conidias germinan si existen presencia de agua y temperaturas mayores a 15 °C.',
};

export const pennStateBerries = (originalValue: string): SpeciesCriterionEvidence => ({
  institution: 'Penn State Extension',
  title: 'Frost and Freeze Damage on Berry Crops (K. Demchak, actualizado en 2026)',
  url: 'https://extension.psu.edu/frost-and-freeze-damage-on-berry-crops',
  section: '«Critical Temperatures for Blossoms»',
  consultedAt: '2026-10-14',
  originalValue,
});

export const UGA_BLUEBERRY_HARVEST: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Blueberry Harvesting and Postharvest Handling (Circular 1269, 2023)',
  url: 'https://fieldreport.caes.uga.edu/publications/C1269/blueberry-harvesting-and-postharvest-handling/',
  section: '«Harvest Guidelines»',
  consultedAt: '2026-10-14',
  originalValue: 'Producers should not harvest when plants are wet from morning dew or rain. Harvesting while it is raining can lead to fruit splitting and reduce storage quality.',
};

export const WSU_BLUEBERRY_HEAT: SpeciesCriterionEvidence = {
  institution: 'Washington State University Extension',
  title: 'How Does Heat Impact Blueberry Pollination, And Why Does It Matter? (M. Evalt, DeVetter Small Fruit Horticulture Program, WSU NWREC, 2024)',
  url: 'https://extension.wsu.edu/beat-the-heat/?p=527',
  section: 'Efecto del calor sobre el polen, citando a Walters e Isaacs (2023)',
  consultedAt: '2026-10-15',
  originalValue: 'Pollen exposed to air temperatures between 86 and 104°F had reduced pollen germination rates, while tube growth was reduced above 95°F (Walters and Isaacs, 2023).',
};

// --- Fuentes del kiwi ------------------------------------------------------------------

export const KIWI_MANUAL = 'Manual de Producción del Kiwi Chileno (2.ª edición, junio de 2011)';
export const KIWI_MANUAL_URL = 'https://www.comitedelkiwi.cl/wp-content/uploads/2024/01/manual_prod_cap0_6.pdf';
export const KIWI_COMMITTEE = 'Comité del Kiwi (Chile), Comisión de Producción';

export const KIWI_FROST: SpeciesCriterionEvidence = {
  institution: KIWI_COMMITTEE,
  title: `${KIWI_MANUAL}, capítulo 3 «Requerimientos agroclimáticos»`,
  url: KIWI_MANUAL_URL,
  section: 'Tabla 3.2 «Temperaturas críticas (heladas) y tejido dañado», p. 02 del capítulo (p. 14 del PDF)',
  consultedAt: '2026-10-15',
  originalValue: 'T° de daño (°C). Brotación: yemas (desde lloro) -8,0 a -4,0; yema algodonosa -1,5 a 2,0; puntas verdes y brotes tiernos -1,0; cáliz partido-flor -0,5. Maduración del fruto: frutos (sección peduncular) y hojas maduras -2,0. (*) Datos para 30 minutos, las temperaturas críticas son más altas (menos negativas) al aumentar el tiempo. Fuente: G. Zuccherelli, Ctifl y M. Kulczewski.',
};

export const KIWI_SUMMER: SpeciesCriterionEvidence = {
  institution: KIWI_COMMITTEE,
  title: `${KIWI_MANUAL}, capítulo 3 «Requerimientos agroclimáticos»`,
  url: KIWI_MANUAL_URL,
  section: 'Apartado «3. Verano», p. 08 del capítulo (p. 20 del PDF), y tabla 3.1, p. 02 del capítulo',
  consultedAt: '2026-10-15',
  originalValue: 'Temperaturas mayores a 31 °C que se combinan con viento y baja humedad relativa hacen que la tasa transpiratoria de las hojas se eleve sobre la capacidad de abastecimiento del suelo y la planta, generándose el desorden conocido como «bronceado». Tabla 3.1 (kiwi var. Hayward): temperaturas críticas, máx. verano, período vegetativo (Sep-Abr): 29 con baja humedad relativa.',
};

export const KIWI_SOIL: SpeciesCriterionEvidence = {
  institution: KIWI_COMMITTEE,
  title: `${KIWI_MANUAL}, capítulo 4 «Suelos y enmiendas»`,
  url: KIWI_MANUAL_URL,
  section: '«Propiedades químicas», apartado «PH», p. 05 del capítulo (p. 29 del PDF)',
  consultedAt: '2026-10-15',
  originalValue: 'PH. En el kiwi se desea entre 6 y 7.',
};

export const WISCONSIN_KIWI: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Extension',
  title: 'Kiwifruit, Actinidia spp. (S. Mahr; última actualización: B. Spangenberg, 2025)',
  url: 'https://hort.extension.wisc.edu/articles/kiwifruit-actinidia-spp/',
  section: 'Requerimientos de sitio y suelo',
  consultedAt: '2026-10-15',
  originalValue: 'The vines do best in a sunny location with well-drained, somewhat acid (pH 5 - 6.5) soil.',
};

export const KIWI_BUD_FREEZE: SpeciesCriterionEvidence = {
  institution: 'Scientific Reports (Nature Portfolio), citando a Hewett y Young (1981), New Zealand Journal of Agricultural Research 24: 73–75',
  title: 'Impacts of cold stress and temperature fluctuations on bud abortion and malformed flower development on Hayward kiwifruit (Mirarzgar, Ghasemnezhad, Fotouhi Ghazvini y Jalali Sendi)',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12852680/',
  section: 'Introducción, referencia 32',
  consultedAt: '2026-10-15',
  originalValue: 'In kiwifruit (Actinidia spp.), dormant buds exhibit damage upon exposure to temperatures as low as - 10 °C. However, at advanced phenological stages, even brief exposure (30 min) to - 1.5 °C to - 2.0 °C can damage ~ 10% of floral buds.',
};

export const KIWI_EXPOSURE = 'Valores para 30 minutos de exposición: con más tiempo, el daño empieza a temperaturas más altas (menos negativas).';
export const KIWI_EXPOSURE_EN = 'Values for 30 minutes of exposure: with longer exposure, damage starts at higher (less negative) temperatures.';

export const GROUND_COLDER = 'Cerca del suelo, en noches despejadas, la temperatura puede bajar varios grados más que la mínima pronosticada.';
export const GROUND_COLDER_EN = 'Near the ground, on clear nights, temperature can drop several degrees below the forecast minimum.';
export const RAIN_RULE = 'La fuente no fija una cantidad de lluvia: cuenta como día con lluvia el que tiene 1 mm o más, o 60 % de probabilidad o más, criterio de planificación de la app.';
export const RAIN_RULE_EN = 'The source sets no rainfall amount: a day counts as rainy with 1 mm or more, or a 60% chance or more, which is the app\'s planning rule.';

// --- Fuentes de nuevas especies perennes (Wave 2 - TASK ES6) --------------------------

// Pomáceas y caqui
export const CSU_APPLE_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'Apple Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstagesapple.pdf',
  section: 'Tabla «Critical temperatures for apple fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for apple fruit buds. Stage 8 (Full Bloom): Ave. Temp. for 10% Kill 28; Ave. Temp. for 90% Kill 25. For Red Delicious.',
};

export const CORNELL_APPLE_PH: SpeciesCriterionEvidence = {
  institution: 'Cornell Cooperative Extension (Eastern NY Commercial Horticulture Program)',
  title: 'Tree Fruit News: Nutrient Management in Apple Orchards for the 2023 Growing Season',
  url: 'https://blogs.cornell.edu/enychp/tree-fruit/apples/tree-fruit-news-nutrient-management-in-apple-orchards-for-the-2023-growing-season/',
  section: 'Recomendaciones de pH del suelo en huertos de manzano',
  consultedAt: '2026-10-15',
  originalValue: 'Soil pH should be maintained in the range of 6.0 to 6.5 throughout the soil profile. For Honeycrisp, target your soil pH between 6.5 and 7.1.',
};

export const CSU_PEAR_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'Pear Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstagespear.pdf',
  section: 'Tabla «Critical temperatures for pear fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for pear fruit buds. Stage 7 (Full Bloom): Ave. Temp. for 10% Kill 28; Ave. Temp. for 90% Kill 24. For Bartlett. Anjou is similar but may bloom earlier.',
};

export const PENN_STATE_PEAR_PH: SpeciesCriterionEvidence = {
  institution: 'Penn State Agricultural Analytical Services Laboratory',
  title: 'Recommendations for Tree Fruit: Pears (Crop Code 4006)',
  url: 'https://agsci.psu.edu/aasl',
  section: 'Código 4006 PEARS-MAINTAIN',
  consultedAt: '2026-10-15',
  originalValue: '4006 PEARS-MAINTAIN Crop Code: pH Goal: 6.5. Optimum pH for tree fruits is 6.0-6.5.',
};

export const NCSU_PERSIMMON_PH: SpeciesCriterionEvidence = {
  institution: 'North Carolina State Extension (N.C. Cooperative Extension)',
  title: 'Japanese Persimmon - Diospyros kaki (Plant Toolbox)',
  url: 'https://plants.ces.ncsu.edu/plants/diospyros-kaki/common-name/japanese-persimmon/',
  section: 'Requerimientos de suelo y pH',
  consultedAt: '2026-10-15',
  originalValue: 'The trees grow best in loamy, moist but well-drained soils with a pH of 6.0 to 6.5 in full sun but thrive on a wide range of soils.',
};

export const UCLA_PERSIMMON_HARVEST: SpeciesCriterionEvidence = {
  institution: 'University of California, Los Angeles (Division of Plant Pathology)',
  title: 'Stylar End Checking of the Hachiya Persimmon (P. A. Miller, California Avocado Society Yearbook 1943, 27:53-55)',
  url: 'https://www.avocadosource.com/CAS_Yearbooks/CAS_27_1943/CAS_1943_PG_53-55.pdf',
  section: 'Mecanismo de partidura por lluvia y humedad',
  consultedAt: '2026-10-15',
  originalValue: 'The skin breaks develop during or immediately following humid, foggy or rainy periods during which free moisture collects upon the fruit surface.',
};

export const CRFG_LOQUAT_FROST: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Loquat Fruit Facts (Eriobotrya japonica)',
  url: 'https://crfg.org/wiki/fruit/loquat/',
  section: 'Adaptación al frío y temperaturas críticas de flor',
  consultedAt: '2026-10-15',
  originalValue: 'The killing temperature for the flower bud is about 19° F, and for the mature flower about 26° F. At 25° F the seed is killed, causing the fruit to fall. Well established trees can tolerate a low temperature of 12° F.',
};

export const CLEMSON_LOQUAT_FROST: SpeciesCriterionEvidence = {
  institution: 'Clemson University Cooperative Extension',
  title: 'Loquat (Eriobotrya japonica) Care, Cultivation & Growing Guide (HGIC)',
  url: 'https://hgic.clemson.edu/factsheet/loquat-eriobotrya-japonica-care-cultivation-growing-guide/',
  section: 'Tolerancia al frío y daño en flores',
  consultedAt: '2026-10-15',
  originalValue: 'Loquat trees are cold hardy to 12 °F, but flowers and developing fruit can be killed when temperatures drop to 27 °F.',
};

// Carozos
export const CSU_APRICOT_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'Apricot Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstagesapricot.pdf',
  section: 'Tabla «Critical temperatures for apricot fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for apricot fruit buds. Stage 6 (Full Bloom): Ave. Temp. for 10% Kill 27; Ave. Temp. for 90% Kill 22. First Bloom: 10% Kill 25.',
};

export const UNH_STONE_FRUIT_PH: SpeciesCriterionEvidence = {
  institution: 'University of New Hampshire Extension',
  title: 'Growing Fruits: Growing Plums, Cherries and Apricots in NH Home Orchards',
  url: 'https://extension.unh.edu/resource/growing-fruits-growing-plums-cherries-and-apricots-nh-home-orchards',
  section: 'Suelo y pH para frutales de hueso',
  consultedAt: '2026-10-15',
  originalValue: 'The soil pH should be 6.0-7.0 for plums, cherries and apricots.',
};

export const MSU_PEACH_FROST: SpeciesCriterionEvidence = {
  institution: 'Michigan State University Extension / Purdue University MRCC',
  title: 'Picture Table of Fruit Freeze Thresholds (citando WSU EB0914)',
  url: 'https://mrcc.purdue.edu/modules/vip/docs/PictureTableFFThresholds.pdf',
  section: 'Peaches - WSU EB0914, Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Peaches - WSU EB0914. Full bloom: 10% kill 27; 90% kill 24.',
};

export const UGA_PEACH_PH: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Home Garden Peaches (Circular 1063, D. Chavez y J. Cook)',
  url: 'https://extension.uga.edu/publications/detail.html?number=C1063',
  section: 'Requerimientos de suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Soil pH for peach trees should be between 6 and 6.5.',
};

export const UDEL_STONE_FRUIT_CRACK: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Fruit Cracking in Plums, Peaches, and Nectarines (G. Johnson, Weekly Crop Update, julio 2023)',
  url: 'https://sites.udel.edu/weeklycropupdate/?p=22968',
  section: 'Rajado de fruto por exceso de agua y lluvia',
  consultedAt: '2026-10-15',
  originalValue: 'We are seeing fruit cracking in plums, peaches, and nectarines. When the skin of these fruits stays wet for an extended period near ripening, the fruit can absorb so much moisture that it cracks.',
};

export const CSU_PLUM_FROST: SpeciesCriterionEvidence = {
  institution: 'Colorado State University Western Colorado Research Center',
  title: 'European (Prune) Plum Bud Stages & Critical Temperatures (H. J. Larsen, 2004, datos de WSU Prosser)',
  url: 'https://labs.agsci.colostate.edu/minas/wp-content/uploads/sites/7/2025/09/budstageseplum.pdf',
  section: 'Tabla «Critical temperatures for European prune plum fruit buds», Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperatures for European prune plum fruit buds. Stage 7 (Full Bloom): Ave. Temp. for 10% Kill 28; Ave. Temp. for 90% Kill 23.',
};

export const MSU_TART_CHERRY_FROST: SpeciesCriterionEvidence = {
  institution: 'Michigan State University Extension / Purdue University MRCC',
  title: 'Picture Table of Fruit Freeze Thresholds (citando MSU Research Report 220)',
  url: 'https://mrcc.purdue.edu/modules/vip/docs/PictureTableFFThresholds.pdf',
  section: 'Tart Cherries - MSU Research Rpt. 220, Full Bloom',
  consultedAt: '2026-10-15',
  originalValue: 'Tart Cherries - MSU Research. Rpt. 220. Full Bloom: 10% kill 28; 90% kill 24.',
};

export const UDEL_NECTARINE_CRACK: SpeciesCriterionEvidence = {
  institution: 'University of Delaware Cooperative Extension',
  title: 'Fruit Cracking in Plums, Peaches, and Nectarines (G. Johnson, Weekly Crop Update, julio 2023)',
  url: 'https://sites.udel.edu/weeklycropupdate/?p=22968',
  section: 'Mayor susceptibilidad de nectarinos por piel lisa',
  consultedAt: '2026-10-15',
  originalValue: 'Nectarines are more susceptible to cracking due to the smooth skin. Similar skin cracking can occur in nectarines and peaches.',
};

export const UIUC_NECTARINE_PH: SpeciesCriterionEvidence = {
  institution: 'University of Illinois Extension',
  title: 'Nectarine (Prunus persica nectarina) — HortAnswers',
  url: 'https://web.extension.illinois.edu/hortanswers/plantdetail.cfm?PlantID=628&PlantTypeID=11',
  section: 'Ficha de la especie, requerimientos de suelo',
  consultedAt: '2026-10-18',
  originalValue: 'Soil pH of 6 to 6.5 is preferred.',
};

export const USU_NECTARINE_FROST: SpeciesCriterionEvidence = {
  institution: 'Utah State University Extension (Intermountain Tree Fruit Production Guide)',
  title: 'Peach/Nectarine Growth Stages and Critical Temperatures',
  url: 'https://intermountainfruit.org/cold-effects/peach-nectarine-stages',
  section: 'Tabla de temperaturas críticas por estado, «Full Bloom», 30 minutos de exposición',
  consultedAt: '2026-10-18',
  originalValue: 'Peach/Nectarine Growth Stages and Critical Temperatures. Full Bloom — 10% kill: 27; 90% kill: 24.',
};

export const UCCE_ALMOND_FROST: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (The Almond Doctor, D. Doll)',
  title: 'Almond Frost Warning and Protection Methods (2018)',
  url: 'https://www.thealmonddoctor.com/almond-frost-warning-protection-methods-2018/',
  section: 'Temperaturas críticas en floración',
  consultedAt: '2026-10-15',
  originalValue: 'At full bloom, temperatures at or below 27-28F can cause crop loss.',
};

export const UCCE_ALMOND_PH: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (The Almond Doctor, D. Doll)',
  title: 'Planning and Planting a New Almond Orchard',
  url: 'https://www.thealmonddoctor.com/planning-and-planting-a-new-almond-orchard/',
  section: 'Rango de pH para almendro',
  consultedAt: '2026-10-15',
  originalValue: 'Ideally, the range is between 6.4-7.5, with peach-almond hybrids performing better in alkaline soils.',
};

// Vid
export const WSU_GRAPEVINE_FROST: SpeciesCriterionEvidence = {
  institution: 'Washington State University Viticulture & Enology',
  title: 'Grapevine Cold Hardiness (citando Ferguson et al., 2014, AJEV)',
  url: 'https://wine.wsu.edu/extension/cold-hardiness/',
  section: 'Tabla «Frost Cold Tolerance - Post Budbreak», cultivares de Vitis vinifera',
  consultedAt: '2026-10-15',
  originalValue: 'Frost Cold Tolerance - Post Budbreak (°F): 29.8 for Vitis vinifera varieties.',
};

export const UCD_GRAPEVINE_HEAT: SpeciesCriterionEvidence = {
  institution: 'University of California, Davis (Department of Viticulture and Enology)',
  title: 'Effect of Heat on Grapevine Production and Fruit Quality (M. K. Bartlett, Progressive Crop Consultant, 2025)',
  url: 'https://progressivecrop.com/2025/03/effect-of-heat-on-grapevine-production-and-fruit-quality/',
  section: 'Impacto de temperaturas sobre 95 °F en floración',
  consultedAt: '2026-10-15',
  originalValue: 'At bloom, temperatures >95 degrees F can interfere with flower fertilization, preventing the pollen from forming the tunnels that allow it to reach the ovary, inducing shatter and berry thinning.',
};

export const NCSU_GRAPE_PH: SpeciesCriterionEvidence = {
  institution: 'North Carolina State Extension (N.C. Cooperative Extension)',
  title: "North Carolina Winegrape Grower's Guide, Chapter 9: Vine Nutrition (T. K. Wolf)",
  url: 'https://content.ces.ncsu.edu/north-carolina-winegrape-growers-guide/chapter-9-vine-nutrition',
  section: 'pH de suelo para Vitis vinifera',
  consultedAt: '2026-10-15',
  originalValue: 'Varieties of Vitis vinifera generally grow best at a pH between 6.0 and 7.0, whereas the native American grapes (such as Concord and Niagara) and the hybrids tolerate lower pH values (5.5 to 6.0).',
};

export const UW_GRAPE_HARVEST_SPLIT: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Division of Extension (UW Fruit Program)',
  title: 'Berry Splitting in Grapes, Should You Harvest? (A. Atucha, 2020/2021)',
  url: 'https://fruit.wisc.edu/2020/09/17/harvesting-decisions-after-heavy-rains-and-berry-splitting/',
  section: 'Partidura de bayas por lluvias y decisión de cosecha',
  consultedAt: '2026-10-15',
  originalValue: 'All that rain resulted in a significant number of berries splitting. We strongly recommend growers to harvest as soon as possible if more than 20% of the berries in the clusters are split.',
};

// Cítricos
export const UF_CITRUS_PH: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Soil and Fertilizer Management for Citrus (EDIS SS666, K. T. Morgan)',
  url: 'https://edis.ifas.ufl.edu/publication/SS666',
  section: 'Rango de pH para cítricos',
  consultedAt: '2026-10-15',
  originalValue: 'Maintain soil pH in the range of 5.8 to 6.5 for citrus trees.',
};

export const MSU_CITRUS_COLD: SpeciesCriterionEvidence = {
  institution: 'Mississippi State University Extension Service',
  title: 'Fruit and Nut Review: Citrus (Publication 1779, E. Stafne)',
  url: 'https://extension.msstate.edu/publications/fruit-and-nut-review-citrus',
  section: 'Tabla 1 «Cold hardiness of citrus trees»',
  consultedAt: '2026-10-15',
  originalValue: 'Cold hardiness of citrus trees (°F). Kumquat: 16-17; Satsuma mandarin: 18-20; All other mandarin oranges: 22-23; Orange (Citrus sinensis): 23-24; Grapefruit (Citrus paradisii): 23-24; Lemon: 26-27; Lime (Citrus aurantifolia): 28.',
};

export const UCANR_CITRUS_FOOTHILLS: SpeciesCriterionEvidence = {
  institution: 'University of California Agriculture and Natural Resources (UC Cooperative Extension)',
  title: 'Growing Citrus in the Sierra Nevada Foothills (Publication 31-018C, C. Fake)',
  url: 'https://ccfruitandnuts.ucanr.edu/files/238122.pdf',
  section: 'Tolerancia al frío por tipo de cítrico',
  consultedAt: '2026-10-15',
  originalValue: 'Generally, kumquat (18°F) is hardier than Satsuma mandarin (20°F) > Meyer lemon (22°F) > oranges: navel, blood, etc. (24°F) > grapefruit (26°F) > true lemons (Eureka, Lisbon) (28°F) > lime (30°F).',
};

export const UF_LEMON_FREEZE: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Lemon Growing in the Florida Home Landscape (EDIS HS402, J. H. Crane)',
  url: 'https://edis.ifas.ufl.edu/publication/HS402',
  section: 'Temperaturas críticas de congelación para limonero',
  consultedAt: '2026-10-15',
  originalValue: 'Defoliated at 22-24°F (-4.4 to -5.6°C), severe wood damaged at 20°F (-6.7°C), flowers and young fruit are killed at 29°F (-1.7°C), and mature fruit damaged at 28°F to 31°F (-2.2°C to -1.8°C).',
};

export const UF_TAHITI_LIME_FREEZE: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Growing Tahiti Limes in the Home Landscape (EDIS CH093, J. H. Crane)',
  url: 'https://edis.ifas.ufl.edu/publication/CH093',
  section: 'Tolerancia al frío en lima Tahití',
  consultedAt: '2026-10-15',
  originalValue: 'Damage to Tahiti lime leaves occurs at temperatures below 28°F (-2°C); wood damage occurs below about 26°F (-3°C), and severe damage or death occurs below 24°F (-4°C).',
};

export const citrusPh = (): SpeciesPhCriterion => ({
  kind: 'ph', state: 'enabled', stages: GROWING,
  optimum: { min: 5.8, max: 6.5 }, lowerLimit: null, upperLimit: null,
  note: 'El pH del suelo recomendado para cítricos se mantiene en el rango de 5,8 a 6,5.',
  noteEn: 'Recommended soil pH for citrus trees is maintained in the range of 5.8 to 6.5.',
  limitations: 'Recomendación general de UF/IFAS para cítricos comerciales; no desglosa por especie particular dentro del género.',
  limitationsEn: 'General UF/IFAS recommendation for commercial citrus; it does not break down by individual species within the genus.',
  evidence: [UF_CITRUS_PH],
});

// Frutos secos
export const OSU_HAZELNUT_FROST: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Growing Hazelnuts in the Pacific Northwest: Introduction (EM 9072, J. Olsen)',
  url: 'https://extension.oregonstate.edu/catalog/em-9072-growing-hazelnuts-pacific-northwest-introduction',
  section: 'Resistencia al frío de amentos y flores femeninas',
  consultedAt: '2026-10-15',
  originalValue: 'Catkins can freeze at 15°F (-9.4°C) when fully elongated. In the most cold-sensitive varieties, the female flowers, which bloom in January and February, can freeze at 10°F (-12.2°C).',
};

export const UCCE_WALNUT_FROST: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (Butte County)',
  title: 'Microclimate Considerations and Frost Protection in Walnuts (J. Connell)',
  url: 'https://ccfruitandnuts.ucanr.edu/files/296889.pdf',
  section: 'Temperatura crítica primaveral para hojas, brotes y frutos recién cuajados',
  consultedAt: '2026-10-15',
  originalValue: 'Critical temperature for radiation frost damage in spring is 30°F for new leaves, shoots and nutlets.',
};

export const UGA_PECAN_FROST: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension (Pecan Team)',
  title: 'Cold Snap Thoughts for Pecan (L. Wells, 2021)',
  url: 'https://site.extension.uga.edu/pecan/2021/04/here-are-some-thoughts-on-the-recent-cold-snap-from-dr-wells/',
  section: 'Daño por helada en tejido verde de pecana',
  consultedAt: '2026-10-15',
  originalValue: 'Green pecan tissue does not suffer long-term or crop damaging injury until temps reach 28 degrees for several hours.',
};

export const UGA_PECAN_HARVEST: SpeciesCriterionEvidence = {
  institution: 'University of Georgia Cooperative Extension',
  title: 'Pecan Nut and Kernel Quality (L. Wells, 2015)',
  url: 'https://site.extension.uga.edu/pecan/2015/10/pecan-nut-and-kernel-quality/',
  section: 'Pudriciones de cáscara y humedad en maduración',
  consultedAt: '2026-10-15',
  originalValue: 'Phytophthora shuck rot outbreak following a 15-day period during which rain was recorded on 11 days. Maximum daily temperature exceeded 86°F only once.',
};

export const UCCE_PISTACHIO_HEAT: SpeciesCriterionEvidence = {
  institution: 'University of California Cooperative Extension (Kern County)',
  title: 'Temperature-related variables associated with yield of Kerman pistachio (C. Kallsen, citando HortScience 52:598-605)',
  url: 'https://cekern.ucanr.edu',
  section: 'Efecto de horas sobre 80 °F durante floración',
  consultedAt: '2026-10-15',
  originalValue: 'Hours above 80°F during the bloom window (March 20 to April 25) were negatively correlated with yield.',
};

export const QDPI_MACADAMIA_HEAT: SpeciesCriterionEvidence = {
  institution: 'Queensland Department of Primary Industries (Australia)',
  title: 'Effects of temperature on premature nut drop in macadamia (R. A. Stephenson y E. C. Gallagher, 1986)',
  url: 'https://era.dpi.qld.gov.au/id/eprint/11710/',
  section: 'Caída prematura de nueces y temperatura crítica',
  consultedAt: '2026-10-15',
  originalValue: 'It is suggested that 30 deg C might be critical in promoting unacceptable levels of nut drop.',
};

export const PURDUE_MACADAMIA_COLD: SpeciesCriterionEvidence = {
  institution: 'Purdue University (New Crops Symposium / ASHS Press)',
  title: 'Macadamia Production in Southern California (L. T. McHargue, 1996)',
  url: 'https://www.hort.purdue.edu/newcrop/proceedings1996/v3-458.html',
  section: 'Tolerancia a heladas en árbol maduro',
  consultedAt: '2026-10-15',
  originalValue: 'Frost damage starts at -2.8°C (27°F), especially if low temperatures persist for several hours.',
};

export const UARIZONA_JOJOBA_PH: SpeciesCriterionEvidence = {
  institution: 'University of Arizona Campus Arboretum',
  title: 'Simmondsia chinensis (Snyder Preserve Collection)',
  url: 'https://arboretum.arizona.edu/snyder-preserve-simmondsia-chinensis',
  section: 'Rango de tolerancia de pH',
  consultedAt: '2026-10-15',
  originalValue: 'Soil pH can be in a range between 5-9 (strongly acidic to very alkaline).',
};

// Subtropicales A
export const CRFG_CHERIMOYA: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Cherimoya Fruit Facts (Annona cherimola)',
  url: 'https://crfg.org/wiki/fruit/cherimoya/',
  section: 'Clima, temperaturas críticas de helada y pH',
  consultedAt: '2026-10-15',
  originalValue: 'Young growing tips are killed at 29° F and mature trees are killed or severely injured at 25° F. The optimum pH ranges from 6.5 to 7.6.',
};

export const CRFG_FEIJOA: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Feijoa Fruit Facts (Acca sellowiana)',
  url: 'https://crfg.org/wiki/fruit/feijoa/',
  section: 'Adaptación climática y pH',
  consultedAt: '2026-10-15',
  originalValue: 'Are generally adapted to areas where temperatures stay above 15° F. Best harvests come from plants growing in well-drained soil with a pH between 5.5 and 7.0.',
};

export const UF_POMEGRANATE: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'The Pomegranate (Publication MG056)',
  url: 'https://edis.ifas.ufl.edu/publication/MG056',
  section: 'Heladas, riego, rajado de fruto y pH',
  consultedAt: '2026-10-15',
  originalValue: 'Temperatures down to 12°F (-11°C) may severely injure dormant trees. Optimum growth is in the pH range of 5.5-7.0. Sudden changes in irrigation amounts and timing often lead to fruit splitting, especially a few weeks before harvesting.',
};

export const CRFG_POMEGRANATE: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Pomegranate Fruit Facts (Punica granatum)',
  url: 'https://crfg.org/wiki/fruit/pomegranate/',
  section: 'Rajado de fruto por lluvia en madurez',
  consultedAt: '2026-10-15',
  originalValue: 'The tree can be severely injured by temperatures below 12° F. The fruits must be picked before over maturity when they tend to crack open, particularly when rained on.',
};

export const UF_GUAVA: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Guava Growing in the Florida Home Landscape (EDIS MG045, J. H. Crane y C. F. Balerdi)',
  url: 'https://edis.ifas.ufl.edu/publication/MG045',
  section: 'Temperaturas críticas de frío y pH de suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Young guava trees may be killed by temperatures of 27° to 28°F (-3° to -2°C). Mature trees may withstand short periods of 25° to 26°F (-4° to -3°C) without much damage. A soil pH of 4.5 to 7 is ideal but plants do well in high pH soils (7-8.5) if supplied with chelated iron materials.',
};

export const CRFG_FIG: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Fig Fruit Facts (Ficus carica)',
  url: 'https://crfg.org/wiki/fruit/fig/',
  section: 'Tolerancia a heladas y rajado por lluvia',
  consultedAt: '2026-10-15',
  originalValue: 'Fully dormant trees are hardy to 12° – 15° F, but plants in active growth can be damaged at 30° F. Rains during fruit development and ripening can cause the fruits to split.',
};

export const UGUAM_FIG_PH: SpeciesCriterionEvidence = {
  institution: 'University of Guam Cooperative Extension & Outreach',
  title: 'Fig (Ficus carica) Production Guide',
  url: 'https://www.uog.edu/extension/publications/',
  section: 'Requerimientos de suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Fig trees grow best in well-drained soils with a pH of 6 – 6.5 but are tolerant of higher pH levels. It is not tolerant of highly acidic soils.',
};

export const FAO_ECOCROP_LUCUMO: SpeciesCriterionEvidence = {
  institution: 'FAO (ECOCROP Data Sheet 8912)',
  title: 'Pouteria lucuma - Agro-climatic data sheet',
  url: 'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=8912',
  section: 'Temperaturas críticas y pH del suelo',
  consultedAt: '2026-10-15',
  originalValue: 'Killing temp. during rest: -5 °C. Killing temp. early growth: 0 °C. Soil PH Optimal Min 6.5 / Max 7.5; Absolute Min 6 / Max 8.5.',
};

// Subtropicales B
export const UF_MANGO: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Mango Growing in the Florida Home Landscape (EDIS MG216, J. H. Crane)',
  url: 'https://edis.ifas.ufl.edu/publication/MG216',
  section: 'Temperaturas críticas por etapa',
  consultedAt: '2026-10-15',
  originalValue: 'Flowers and small fruits may be damaged or killed if the temperature falls below 40°F (4.4°C) for a few hours. Young trees may be killed at 29°F to 30°F (-1.7°C to -1.1°C). Mature trees can withstand air temperatures as low as 25°F (-3.9°C) for a few hours.',
};

export const FAO_DATE_PALM: SpeciesCriterionEvidence = {
  institution: 'FAO (Plant Production and Protection Paper)',
  title: 'Date Palm Cultivation (A. Zaid y P. F. de Wet)',
  url: 'https://www.fao.org/4/y4360e/y4360e08.htm',
  section: 'Climatic Requirements of Date Palm',
  consultedAt: '2026-10-15',
  originalValue: 'Growth stops below 7°C. At -6°C leaflet margins turn yellow and dry out. Leaves will be damaged at -9 to -15°C. Growth will continue at a stable rate until the temperature reaches 38°C/40°C when it will start decreasing.',
};

export const UF_PASSION_FRUIT: SpeciesCriterionEvidence = {
  institution: 'University of Florida IFAS Extension',
  title: 'Passion Fruit Growing in the Florida Home Landscape (EDIS HS1467)',
  url: 'https://edis.ifas.ufl.edu/publication/HS1467',
  section: 'pH de suelo y susceptibilidad a bajas temperaturas',
  consultedAt: '2026-10-15',
  originalValue: 'The soil should have a pH of 6–7.5. Exposure to temperatures of 32°F to 59°F can cause chilling injury.',
};

export const CRFG_PASSION_FRUIT: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Rare Fruit for Climates with Relatively Frost Free Winters',
  url: 'https://crfg.org/wiki/fruit/passion-fruit/',
  section: 'Cold Hardiness table',
  consultedAt: '2026-10-15',
  originalValue: 'Purple passion fruit (Passiflora edulis) cold hardiness: the mid 20s °F (25° F).',
};

export const CRFG_BANANA_PASSION: SpeciesCriterionEvidence = {
  institution: 'California Rare Fruit Growers (CRFG)',
  title: 'Rare Fruit for Climates with Relatively Frost Free Winters',
  url: 'https://crfg.org/wiki/fruit/passion-fruit/',
  section: 'Cold Hardiness table',
  consultedAt: '2026-10-15',
  originalValue: 'Banana passion fruit (P. tripartita var. mollissima) cold hardiness: about 28°F.',
};

export const ICAR_OPUNTIA_PH: SpeciesCriterionEvidence = {
  institution: 'Central Soil Salinity Research Institute (ICAR, India)',
  title: 'Performance of edible cactus (Opuntia ficus-indica) in saline environments (Indian J. Agric. Sci. 84:4)',
  url: 'https://epubs.icar.org.in/index.php/IJAgS/article/download/39469/18063',
  section: 'Respuesta al pH del suelo en Opuntia ficus-indica',
  consultedAt: '2026-10-15',
  originalValue: 'Plant height reduced significantly with increase in pH from 7.8 to 9.0 and then to 9.4 and 9.8. There was no cladode formation at pH 9.8.',
};

export const FRONTIERS_PAPAYO: SpeciesCriterionEvidence = {
  institution: 'Frontiers in Plant Science (citando Letelier et al. 2020, PMC7348657)',
  title: 'Southern Species From the Biodiversity Hotspot of Central Chile (Vasconcellea pubescens)',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7348657/',
  section: 'Sección Mountain Papaya',
  consultedAt: '2026-10-15',
  originalValue: 'V. pubescens is sensitive to cold: the stem and leaves could be affected leading to complete plant death when temperatures fall below 2°C (36°F).',
};

export const CAC_AVOCADO_FREEZE: SpeciesCriterionEvidence = {
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
