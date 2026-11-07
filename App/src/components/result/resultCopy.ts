import type { AppLanguage } from '../../types/preferences';
import type { PhenologicalStage } from '../../types/app';
import type { ParameterKey, ParameterPresentation, PresentationSpecies } from '../../engine/measurementPresentation';
import type { DerivedIndicatorId } from '../../engine/localPhysics';
import { findSpeciesRuleProfile, classifyPh } from '../../engine/speciesRules';
import type {
  SpeciesCriterion, SpeciesPhCriterion, SpeciesSalinityCriterion, SpeciesWaterCriterion,
} from '../../engine/speciesRules';

/**
 * Textos del detalle de cada variable: qué pasa con la lectura y qué hacer con ella.
 *
 * Se resuelve al dibujar, no se guarda: una medición antigua se lee con los
 * criterios de hoy sin tocar su instantánea. Nada de lo que aparece aquí es un
 * umbral propio. Cuando el texto habla de la especie, la cifra y la redacción
 * salen del criterio documentado de `speciesRules`, con su limitación, que
 * nunca se omite. Cuando no hay criterio para esa especie y etapa, se dice:
 * callarlo sugeriría una cobertura que el catálogo todavía no tiene.
 */

export interface ResultCopy {
  /** Una o dos frases: qué significa este número aquí. */
  reading: string;
  /** Acciones concretas, en viñetas cortas. */
  tips: readonly string[];
  /** Lo que la fuente no cubre. Presente sólo si el texto se apoyó en un criterio. */
  limitation?: string;
  /** Verdadero cuando el texto nombra a la especie con criterio documentado. */
  speciesBased: boolean;
}

const es = (language: AppLanguage) => language !== 'en';

/** Criterio habilitado de ese tipo para la etapa, si la especie lo tiene. */
function criterion<K extends SpeciesCriterion['kind']>(
  species: PresentationSpecies | null, kind: K, stage: PhenologicalStage,
): Extract<SpeciesCriterion, { kind: K }> | undefined {
  if (!species) return undefined;
  const perfil = findSpeciesRuleProfile(species.id);
  return perfil?.criteria.find(
    c => c.kind === kind && c.state === 'enabled' && c.stages.includes(stage),
  ) as Extract<SpeciesCriterion, { kind: K }> | undefined;
}

const nombre = (species: PresentationSpecies | null, language: AppLanguage) =>
  species ? (es(language) ? species.es : species.en) : '';

/** Con el locale de la app, como el resto del resultado: sin él, Hermes escribe «3.0» en castellano. */
const numero = (valor: number, language: AppLanguage, decimales = 1) =>
  valor.toLocaleString(es(language) ? 'es-CL' : 'en-US', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

/** Sin criterio por especie: se dice, en vez de insinuar una cobertura que no hay. */
function sinCriterio(species: PresentationSpecies | null, language: AppLanguage, variable: string): string {
  if (!species) {
    return es(language)
      ? 'Mediste sin indicar especie, así que la lectura se interpreta con las reglas generales.'
      : 'You measured without a species, so the reading uses the general rules.';
  }
  return es(language)
    ? `El catálogo todavía no tiene un criterio de ${variable} documentado para ${species.es} en esta etapa: se aplican las reglas generales.`
    : `The catalog has no documented ${variable} criterion for ${species.en} at this stage yet; general rules apply.`;
}

// ----------------------------------------------------------------- pH
function copiaPh(m: ParameterPresentation, species: PresentationSpecies | null,
  stage: PhenologicalStage, language: AppLanguage): ResultCopy {
  const c = criterion(species, 'ph', stage) as SpeciesPhCriterion | undefined;
  const castellano = es(language);
  if (!c || m.value == null) {
    return {
      reading: sinCriterio(species, language, castellano ? 'pH' : 'pH'),
      tips: castellano
        ? ['Repite la lectura en otro punto antes de corregir: el pH cambia dentro del mismo campo.']
        : ['Take another reading elsewhere before correcting: pH varies within the same field.'],
      speciesBased: false,
    };
  }
  const posicion = classifyPh(c, m.value);
  const rango = c.optimum.min === c.optimum.max
    ? numero(c.optimum.min, language) : `${numero(c.optimum.min, language)} – ${numero(c.optimum.max, language)}`;
  const quien = nombre(species, language);
  const encabezado = castellano
    ? {
      optimum: `pH ${numero(m.value, language)}, dentro del rango documentado para ${quien} (${rango}).`,
      below_optimum: `pH ${numero(m.value, language)}, bajo el rango documentado para ${quien} (${rango}).`,
      above_optimum: `pH ${numero(m.value, language)}, sobre el rango documentado para ${quien} (${rango}).`,
      below_limit: `pH ${numero(m.value, language)}: la fuente documenta corregir bajo ${numero(c.lowerLimit ?? c.optimum.min, language)} para ${quien}.`,
      above_limit: `pH ${numero(m.value, language)}: la fuente documenta corregir sobre ${numero(c.upperLimit ?? c.optimum.max, language)} para ${quien}.`,
    }[posicion]
    : {
      optimum: `pH ${numero(m.value, language)}, within the documented range for ${quien} (${rango}).`,
      below_optimum: `pH ${numero(m.value, language)}, below the documented range for ${quien} (${rango}).`,
      above_optimum: `pH ${numero(m.value, language)}, above the documented range for ${quien} (${rango}).`,
      below_limit: `pH ${numero(m.value, language)}: the source documents correcting below ${numero(c.lowerLimit ?? c.optimum.min, language)} for ${quien}.`,
      above_limit: `pH ${numero(m.value, language)}: the source documents correcting above ${numero(c.upperLimit ?? c.optimum.max, language)} for ${quien}.`,
    }[posicion];
  const tips = posicion === 'optimum'
    ? (castellano
      ? ['No apliques cal ni acidificantes: el pH ya está donde la fuente lo quiere.',
        'Vuelve a medir después de fertilizar, sobre todo con fertilizantes amoniacales en riego.']
      : ['Do not apply lime or acidifiers: pH is already where the source wants it.',
        'Measure again after fertilizing, especially with ammonium fertilizers through irrigation.'])
    : (castellano
      ? ['Corrige por sectores y vuelve a medir antes de repetir la aplicación.']
      : ['Correct by sector and measure again before repeating the application.']);
  return {
    reading: `${encabezado} ${castellano ? c.note : c.noteEn}`,
    tips, limitation: castellano ? c.limitations : c.limitationsEn, speciesBased: true,
  };
}

// --------------------------------------------- conductividad eléctrica
const CLASE_SAL = {
  sensitive: ['sensible', 'sensitive'], moderately_sensitive: ['moderadamente sensible', 'moderately sensitive'],
  moderately_tolerant: ['moderadamente tolerante', 'moderately tolerant'], tolerant: ['tolerante', 'tolerant'],
} as const;

function copiaEc(m: ParameterPresentation, species: PresentationSpecies | null,
  stage: PhenologicalStage, language: AppLanguage): ResultCopy {
  const c = criterion(species, 'salinity_reference', stage) as SpeciesSalinityCriterion | undefined;
  const castellano = es(language);
  const comun = castellano
    ? ['Compara este número entre puntos y entre temporadas: la tendencia dice más que una lectura suelta.',
      'Si sube tras fertilizar, riega para lavar sales antes de volver a aplicar.']
    : ['Compare this number across points and seasons: the trend says more than a single reading.',
      'If it rises after fertilizing, irrigate to leach salts before applying again.'];
  if (!c) {
    return { reading: sinCriterio(species, language, castellano ? 'salinidad' : 'salinity'), tips: comun, speciesBased: false };
  }
  const clase = CLASE_SAL[c.rating][castellano ? 0 : 1];
  const quien = nombre(species, language);
  const umbral = c.thresholdEce == null ? ''
    : castellano
      ? ` La fuente no documenta pérdida de rendimiento hasta ${numero(c.thresholdEce, language)} dS/m de CE del extracto de saturación.`
      : ` The source documents no yield loss up to ${numero(c.thresholdEce, language)} dS/m of saturation-extract EC.`;
  return {
    reading: castellano
      ? `${quien} se clasifica como ${clase} a la salinidad.${umbral}`
      : `${quien} is classified as ${clase} to salinity.${umbral}`,
    tips: comun, limitation: castellano ? c.limitations : c.limitationsEn, speciesBased: true,
  };
}

// ------------------------------------------------- humedad del suelo
function copiaVwc(m: ParameterPresentation, species: PresentationSpecies | null,
  stage: PhenologicalStage, language: AppLanguage): ResultCopy {
  const c = criterion(species, 'water_sensitivity', stage) as SpeciesWaterCriterion | undefined;
  const castellano = es(language);
  const comun = castellano
    ? ['Mide a la misma profundidad siempre: comparar dos profundidades no dice nada.',
      'Mide antes y después de regar en el mismo punto para conocer cuánto sube tu suelo.']
    : ['Always measure at the same depth: comparing two depths tells you nothing.',
      'Measure before and after irrigating at the same point to learn how much your soil rises.'];
  if (!c) {
    return { reading: sinCriterio(species, language, castellano ? 'sensibilidad al riego' : 'irrigation sensitivity'), tips: comun, speciesBased: false };
  }
  return {
    reading: castellano
      ? `${nombre(species, language)}: la fuente documenta esta etapa como crítica para el riego. ${c.note}`
      : `${nombre(species, language)}: the source documents this stage as critical for irrigation. ${c.noteEn}`,
    tips: castellano
      ? ['No dejes que el suelo se seque entre riegos en esta etapa.', ...comun]
      : ['Do not let the soil dry out between irrigations at this stage.', ...comun],
    limitation: castellano ? c.limitations : c.limitationsEn, speciesBased: true,
  };
}

// ------------------------------------------------ temperatura del suelo
function copiaTempSuelo(m: ParameterPresentation, language: AppLanguage): ResultCopy {
  const castellano = es(language);
  return {
    reading: castellano
      ? 'La temperatura del suelo gobierna la germinación y la actividad de la raíz: un suelo frío retrasa la absorción aunque haya agua y nutrientes disponibles.'
      : 'Soil temperature governs germination and root activity: cold soil slows uptake even when water and nutrients are available.',
    tips: castellano
      ? ['Mide a la misma hora del día: la lectura de la mañana y la de la tarde no son comparables.',
        'Si vas a sembrar, mide varios días seguidos antes de decidir.']
      : ['Measure at the same time of day: morning and afternoon readings are not comparable.',
        'If you are about to sow, measure several days in a row before deciding.'],
    speciesBased: false,
  };
}

// ------------------------------------------------------- nutrientes
const PAPEL_NUTRIENTE: Record<'nitrogen' | 'phosphorus' | 'potassium', Record<PhenologicalStage, readonly [string, string]>> = {
  nitrogen: {
    pre_siembra: ['El nitrógeno manda en el arranque del follaje; en pre-siembra interesa de dónde viene, no cuánto hay.',
      'Nitrogen drives early foliage; before planting what matters is its source, not its amount.'],
    vegetativo: ['Es la etapa en que el nitrógeno más pesa: sostiene el follaje y el vigor.',
      'This is the stage where nitrogen matters most: it sustains foliage and vigor.'],
    floracion: ['En floración el exceso de nitrógeno alarga el follaje y puede retrasar la cuaja.',
      'At flowering, excess nitrogen extends foliage and can delay fruit set.'],
    cosecha: ['Cerca de cosecha el exceso de nitrógeno retrasa la madurez y ablanda el fruto.',
      'Near harvest, excess nitrogen delays ripening and softens the fruit.'],
  },
  phosphorus: {
    pre_siembra: ['El fósforo manda en la raíz nueva: es la etapa en que más conviene tenerlo resuelto.',
      'Phosphorus drives new roots: this is the stage where it pays most to have it sorted.'],
    vegetativo: ['Sostiene el crecimiento de la raíz y el transporte de energía de la planta.',
      'It sustains root growth and the plant’s energy transport.'],
    floracion: ['En floración el fósforo acompaña la formación de flor y la cuaja.',
      'At flowering, phosphorus supports flower formation and fruit set.'],
    cosecha: ['Su papel en cosecha es menor: se decide mucho antes, en la raíz.',
      'Its role at harvest is minor: it is decided much earlier, at the root.'],
  },
  potassium: {
    pre_siembra: ['El potasio se juega más adelante, en el llenado del fruto.',
      'Potassium plays out later, during fruit filling.'],
    vegetativo: ['Regula la apertura de los estomas y, con eso, cuánta agua pierde la planta.',
      'It regulates stomatal opening and, with it, how much water the plant loses.'],
    floracion: ['Empieza a pesar: acompaña el cuaje y la regulación hídrica de la planta.',
      'It starts to matter: it supports fruit set and the plant’s water regulation.'],
    cosecha: ['Es la etapa del potasio: llenado del fruto, calibre y firmeza.',
      'This is potassium’s stage: fruit filling, size and firmness.'],
  },
};

function copiaNutriente(key: 'nitrogen' | 'phosphorus' | 'potassium',
  stage: PhenologicalStage, language: AppLanguage): ResultCopy {
  const castellano = es(language);
  const papel = PAPEL_NUTRIENTE[key][stage][castellano ? 0 : 1];
  return {
    reading: castellano
      ? `${papel} Este número no es una medición química: la sonda lo deriva de la conductividad eléctrica, así que sirve para comparar y no para diagnosticar.`
      : `${papel} This number is not a chemical measurement: the probe derives it from electrical conductivity, so it is for comparison, not diagnosis.`,
    tips: castellano
      ? ['Úsalo para ver si sube o baja entre puntos de tu campo, o antes y después de fertilizar.',
        'Para calcular una dosis, confirma con un análisis químico de suelo o foliar.']
      : ['Use it to see whether it rises or falls between points in your field, or before and after fertilizing.',
        'To calculate a dose, confirm with a chemical soil or leaf analysis.'],
    speciesBased: false,
  };
}

// --------------------------------------------------------- ambiente
function copiaAmbiente(key: 'airTemp' | 'airHumidity' | 'airPressure',
  species: PresentationSpecies | null, stage: PhenologicalStage, language: AppLanguage): ResultCopy {
  const castellano = es(language);
  if (key === 'airTemp') {
    const c = criterion(species, 'air_temperature', stage);
    const base = castellano
      ? 'La temperatura del aire junto a la planta manda en la transpiración y en el estrés térmico del día.'
      : 'Air temperature next to the plant governs transpiration and the day’s heat stress.';
    if (!c) {
      return {
        reading: base,
        tips: castellano
          ? ['Compárala con la del suelo: una brecha grande indica que el suelo todavía no acompaña al aire.']
          : ['Compare it with soil temperature: a wide gap means the soil is not following the air yet.'],
        speciesBased: false,
      };
    }
    return {
      reading: `${base} ${castellano ? c.effect : c.effectEn}`,
      tips: [castellano ? c.advice : c.adviceEn],
      limitation: castellano ? c.limitations : c.limitationsEn, speciesBased: true,
    };
  }
  if (key === 'airHumidity') {
    return {
      reading: castellano
        ? 'La humedad del aire decide cuánta agua pide la planta: con aire seco transpira más aunque el suelo esté húmedo.'
        : 'Air humidity decides how much water the plant demands: in dry air it transpires more even with moist soil.',
      tips: castellano
        ? ['Con aire muy húmedo y hoja mojada, vigila enfermedades de follaje.',
          'Con aire muy seco, riega en las horas de menor demanda.']
        : ['With very humid air and wet leaves, watch for foliar disease.',
          'With very dry air, irrigate during the lowest-demand hours.'],
      speciesBased: false,
    };
  }
  return {
    reading: castellano
      ? 'La presión no actúa sobre la planta de forma directa: sirve como señal de estabilidad del tiempo en las próximas horas.'
      : 'Pressure does not act on the plant directly: it signals how stable the weather will be in the coming hours.',
    tips: castellano
      ? ['Una caída sostenida suele anteceder un cambio de tiempo: contrástala con el pronóstico.']
      : ['A sustained drop usually precedes a weather change: check it against the forecast.'],
    speciesBased: false,
  };
}

/** Texto del detalle de una variable. Puro: mismas entradas, mismo resultado. */
export function buildParameterCopy(
  metric: ParameterPresentation, stage: PhenologicalStage,
  species: PresentationSpecies | null, language: AppLanguage,
): ResultCopy {
  switch (metric.key) {
    case 'ph': return copiaPh(metric, species, stage, language);
    case 'ec': return copiaEc(metric, species, stage, language);
    case 'vwc': return copiaVwc(metric, species, stage, language);
    case 'temp': return copiaTempSuelo(metric, language);
    case 'nitrogen': case 'phosphorus': case 'potassium':
      return copiaNutriente(metric.key, stage, language);
    default: return copiaAmbiente(metric.key as 'airTemp' | 'airHumidity' | 'airPressure', species, stage, language);
  }
}

/** Una línea por indicador derivado, para sustituir el párrafo largo. */
export function derivedMeaning(id: DerivedIndicatorId, language: AppLanguage): string {
  const castellano = es(language);
  return {
    vpd: castellano ? 'Cuánta agua le pide el aire a la hoja ahora mismo.' : 'How much water the air is demanding from the leaf right now.',
    dew_point: castellano ? 'Temperatura a la que se condensaría rocío sobre la hoja.' : 'Temperature at which dew would condense on the leaf.',
    dew_point_spread: castellano ? 'Cuánto falta para que el aire llegue al rocío.' : 'How far the air is from reaching dew point.',
    soil_air_difference: castellano ? 'Cuánto más frío o más cálido está el suelo que el aire.' : 'How much cooler or warmer the soil is than the air.',
  }[id];
}

export const PARAMETER_COPY_KEYS: readonly ParameterKey[] = [
  'vwc', 'temp', 'ph', 'ec', 'nitrogen', 'phosphorus', 'potassium', 'airTemp', 'airHumidity', 'airPressure',
];
