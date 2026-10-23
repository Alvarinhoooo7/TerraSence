import type { EvaluationCoverage, EvaluationState, LocalInputQuality, SoilMeasurement } from '../types/agronomy';
import { buildLocalInputQuality, localQualityNote } from './inputQuality';
import type { MeasurementPoint, PhenologicalStage } from '../types/app';
import type { StageAwareEvaluation } from './stageEvaluator';
import { STAGE_DRIVERS, localizedStageTitle } from './stageEvaluator';
import type { ContextualAdvice, Recommendation } from './contextualAdvice';
import type { AppLanguage } from '../types/preferences';
import { SPECIES_CATALOG_VERSION, findSpecies, hasStageCriteria } from './speciesCatalog';
import { SPECIES_RULES_VERSION } from './speciesRules';
import { deriveLocalPhysics, type DerivedIndicator, type DerivedIndicatorId } from './localPhysics';

export const PARAMETER_KEYS = ['vwc', 'temp', 'ph', 'ec', 'nitrogen', 'phosphorus', 'potassium', 'airTemp', 'airHumidity', 'airPressure'] as const;
export type ParameterKey = typeof PARAMETER_KEYS[number];
export interface ParameterPresentation {
  key: ParameterKey;
  label: string;
  value: number | null;
  unit: string;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'INFO';
  state: string;
  recommendation: string;
  control: string;
  /** Cálculos con esta captura (localPhysics.ts); ausente en lecturas anteriores y en variables sin derivados. */
  derived?: PresentationDerived[];
}
/** Indicador continuo calculado con la captura: valor sin redondear y explicación simple, sin categoría. */
export interface PresentationDerived {
  id: DerivedIndicatorId;
  label: string;
  value: number | null;
  unit: 'kPa' | '°C';
  /** `difference`: diferencia de temperatura; en °F sólo cambia la escala. */
  kind: 'pressure' | 'temperature' | 'difference';
  note: string;
}
/** Especie indicada por el usuario, copiada al guardar: el histórico no depende del catálogo vigente. */
export interface PresentationSpecies {
  id: string;
  es: string;
  en: string;
  scientific: string;
  catalogVersion: string;
  /** Versión de los criterios por especie con que se evaluó (`SPECIES_RULES_VERSION`); ausente en lecturas anteriores. */
  rulesVersion?: string;
  /** Si al medir había criterios propios de la especie para la etapa. */
  hasStageCriteria: boolean;
}
export interface MeasurementPresentation {
  evaluationState?: EvaluationState;
  coverage?: EvaluationCoverage;
  version: 1 | 2 | 3;
  /** Desde la versión 3: `null` es medición sin especie; ausente en versiones anteriores. */
  species?: PresentationSpecies | null;
  stage: PhenologicalStage;
  context: string;
  title: string;
  summary: string;
  actions: string[];
  /** Plan de recomendaciones estructurado; ausente en lecturas guardadas antes de existir. */
  recommendations?: Recommendation[];
  weatherNote: string;
  /** Ausente en históricos que no conservaron sugerencias; [] significa sin coincidencias. */
  suggestedCrops?: string[];
  parameters: ParameterPresentation[];
}
const labelsEs = ['Humedad del suelo', 'Temperatura del suelo', 'pH del suelo', 'Conductividad eléctrica', 'Nitrógeno', 'Fósforo', 'Potasio', 'Temperatura ambiente', 'Humedad ambiente', 'Presión atmosférica'];
const labelsEn = ['Soil moisture', 'Soil temperature', 'Soil pH', 'Electrical conductivity', 'Nitrogen', 'Phosphorus', 'Potassium', 'Air temperature', 'Air humidity', 'Atmospheric pressure'];
/** Nombre del parámetro en el idioma actual; también sirve para lecturas guardadas en el otro idioma. */
export const parameterLabel = (key: ParameterKey, language: AppLanguage = 'es') => (language === 'en' ? labelsEn : labelsEs)[PARAMETER_KEYS.indexOf(key)];
const units = ['%', '°C', 'pH', 'µS/cm', 'mg/kg', 'mg/kg', 'mg/kg', '°C', '%', 'hPa'];

/** Variable del aire donde se muestra cada derivado: el DPV y el rocío dependen de la humedad. */
const DERIVED_BY_PARAMETER: Partial<Record<ParameterKey, DerivedIndicatorId[]>> = {
  airTemp: ['soil_air_difference'],
  airHumidity: ['vpd', 'dew_point', 'dew_point_spread'],
};

function presentDerived(indicator: DerivedIndicator, en: boolean): PresentationDerived {
  const t = (es: string, english: string) => en ? english : es;
  const codes = indicator.limitationCodes;
  const unavailable = codes.includes('relative_humidity_zero')
    ? t('Con humedad del aire de 0 % no se puede calcular.', 'It cannot be calculated with 0 % air humidity.')
    : t('Hace falta que esta lectura traiga los datos del aire que usa el cálculo.', 'This reading needs the air data the calculation uses.');
  const freezing = codes.includes('water_reference_below_freezing')
    ? ` ${t('Bajo 0 °C es una aproximación sobre agua, no un cálculo de escarcha.', 'Below 0 °C it is an approximation over water, not a frost calculation.')}` : '';
  const texts: Record<DerivedIndicatorId, [string, string, PresentationDerived['kind']]> = {
    vpd: [t('Sequedad del aire (déficit de presión de vapor)', 'Air dryness (vapor pressure deficit)'),
      t('Cuánta humedad le falta al aire para saturarse en este momento. Más alto es aire más seco, que hace transpirar más a las plantas; no dice cuánta agua pierde tu cultivo.',
        'How much moisture the air lacks to become saturated right now. Higher means drier air, which makes plants transpire more; it does not tell how much water your crop loses.'), 'pressure'],
    dew_point: [t('Punto de rocío aproximado', 'Approximate dew point'),
      t('Si el aire se enfría hasta esta temperatura, se forma rocío. No indica que las hojas estén mojadas.',
        'If the air cools down to this temperature, dew forms. It does not mean the leaves are wet.'), 'temperature'],
    dew_point_spread: [t('Distancia al rocío', 'Distance to dew point'),
      t('Grados que le faltan al aire para llegar al rocío. Cerca de cero, el aire está casi saturado.',
        'Degrees the air must cool to reach the dew point. Close to zero, the air is almost saturated.'), 'difference'],
    soil_air_difference: [t('Diferencia entre suelo y aire', 'Soil minus air temperature'),
      t('Temperatura del suelo menos la del aire en esta lectura. Muestra que suelo y aire están en condiciones distintas; no anticipa la temperatura de las raíces.',
        'Soil temperature minus air temperature in this reading. It shows that soil and air are in different conditions; it does not predict root temperature.'), 'difference'],
  };
  const [label, note, kind] = texts[indicator.id];
  return { id: indicator.id, label, value: indicator.value, unit: indicator.unit, kind,
    note: indicator.value === null ? unavailable : `${note}${freezing}` };
}

export function applicableAlerts(evaluation: StageAwareEvaluation) {
  const drivers = STAGE_DRIVERS[evaluation.stage] as readonly string[];
  return evaluation.alerts.filter(a => a.origin === 'species' || drivers.includes(a.param))
    .filter(a => evaluation.stage === 'pre_siembra' || !/sembr|siembra|germin|planting|seeds|germination/i.test(a.action))
    .sort((a, b) => ({ danger: 0, warning: 1, info: 2 }[a.type] - { danger: 0, warning: 1, info: 2 }[b.type]));
}

const STAGE_NAMES: Record<PhenologicalStage, [string, string]> = {
  pre_siembra: ['pre-siembra', 'pre-planting'], vegetativo: ['vegetativo', 'vegetative growth'], floracion: ['floración', 'flowering'], cosecha: ['cosecha', 'harvest'],
};

/** Copia de la especie para la instantánea. En pre-siembra, o con un ID desconocido, no hay especie. */
export function presentationSpecies(speciesId: string | null | undefined, stage: PhenologicalStage): PresentationSpecies | null {
  const entry = stage === 'pre_siembra' ? undefined : findSpecies(speciesId);
  return entry ? { id: entry.id, es: entry.es, en: entry.en, scientific: entry.scientific,
    catalogVersion: SPECIES_CATALOG_VERSION, rulesVersion: SPECIES_RULES_VERSION, hasStageCriteria: hasStageCriteria(entry.id, stage) } : null;
}

export const presentationSpeciesName = (species: PresentationSpecies, language: AppLanguage = 'es') =>
  language === 'en' ? species.en : species.es;

function presentationContext(stage: PhenologicalStage, species: PresentationSpecies | null, en: boolean): string {
  if (!species) return en ? 'Based on the measured soil conditions.' : 'Según las condiciones medidas del suelo.';
  const stageName = STAGE_NAMES[stage][en ? 1 : 0];
  if (species.hasStageCriteria) return en ? `Based on the measured soil conditions, the forecast and this species' ${stageName} criteria.`
    : `Según las condiciones medidas del suelo, el pronóstico y los criterios de esta especie para ${stageName}.`;
  return en ? `Based on the measured soil conditions. There are no criteria specific to this species for ${stageName} yet, so the general assessment is shown.`
    : `Según las condiciones medidas del suelo. Todavía no hay criterios propios de esta especie para ${stageName}: se muestra el análisis general.`;
}

export function buildMeasurementPresentation(raw: SoilMeasurement, evaluation: StageAwareEvaluation, advice: ContextualAdvice, language: AppLanguage = 'es', quality?: LocalInputQuality, speciesId?: string | null): MeasurementPresentation {
  const en = language === 'en';
  quality ??= buildLocalInputQuality(raw, '');
  const alerts = applicableAlerts(evaluation);
  const species = presentationSpecies(speciesId, evaluation.stage);
  const physics = deriveLocalPhysics(quality);
  return {
    version: 3, stage: evaluation.stage, species,
    ...(evaluation.state ? { evaluationState: evaluation.state, coverage: evaluation.coverage } : {}),
    context: presentationContext(evaluation.stage, species, en),
    title: evaluation.verdictTitle, summary: advice.summary,
    actions: advice.actions, weatherNote: advice.weatherNote,
    ...(advice.recommendations ? { recommendations: advice.recommendations.map(item => ({ ...item })) } : {}),
    suggestedCrops: evaluation.stage === 'pre_siembra' ? [...advice.suggestedCrops] : [],
    parameters: PARAMETER_KEYS.map((key, index) => {
      const metric = key in evaluation.metrics ? evaluation.metrics[key as keyof typeof evaluation.metrics] : undefined;
      const datum = quality?.observations[key];
      const value = datum ? datum.value : raw[key];
      const derived = ['nitrogen', 'phosphorus', 'potassium'].includes(key);
      const related = alerts.filter(a => a.param === key);
      // Un criterio de la especie sobre esta variable (frío medido en el aire, humedad del aire)
      // la vuelve relevante aunque no gobierne la etapa.
      const relevant = (STAGE_DRIVERS[evaluation.stage] as readonly string[]).includes(key) || related.some(a => a.origin === 'species');
      const derivedIds = DERIVED_BY_PARAMETER[key];
      const status = value == null || derived || !relevant ? 'INFO'
        : related.some(a => a.type === 'danger') ? 'CRITICAL'
        : related.some(a => a.type === 'warning') ? 'WARNING' : metric?.status ?? 'INFO';
      return {
        key, label: parameterLabel(key, language), value, unit: units[index], status,
        state: datum?.availability === 'invalid' ? (en ? 'Invalid value; unavailable for this assessment.' : 'Dato inválido; no disponible para esta evaluación.')
          : value == null ? (en ? 'The device did not deliver this value.' : 'El equipo no entregó este dato.')
          : derived ? (en ? 'Sensor register without independent chemical validation.' : 'Registro de la sonda sin validación química independiente.')
          : !relevant ? (en ? 'Context data. It does not determine the diagnosis for this stage.' : 'Dato de contexto. No determina el diagnóstico de esta fase.')
          : related.length ? related.map(a => a.title).join('\n') : metric?.msg ?? (en ? 'Local ambient reading from the device.' : 'Lectura ambiental local del equipo.'),
        recommendation: value == null ? (en ? 'Check the sensor and repeat the reading if you need this variable.' : 'Comprueba el sensor y repite la lectura si necesitas esta variable.')
          : derived ? (en ? 'Do not use this value to dose fertilizers. Confirm nutrients with a laboratory analysis.' : 'No usar este registro para dosificar fertilizantes. Confirma nutrientes con un análisis de laboratorio.')
          : related.length ? [...new Set(related.map(a => a.action))].join('\n\n')
          : status === 'OPTIMAL' ? (en ? 'No correction is indicated for this parameter under the current rules. Keep monitoring the crop.' : 'No se indica una corrección para este parámetro bajo las reglas actuales. Mantén seguimiento del cultivo.')
          : (en ? 'Interpret this value together with the global plan. There is no validated specific action for this condition and stage.' : 'Interpreta este dato junto con el plan global. No hay una acción específica validada para esta condición y fase.'),
        control: [datum ? localQualityNote(datum, language) : '', metric?.confidenceNote ?? (derived
          ? (en ? 'Cross-check with a laboratory before making nutrition decisions.' : 'Contrasta con laboratorio antes de tomar decisiones sobre nutrición.')
          : (en ? 'Compare representative points and repeat the measurement after management changes. No automatic interval is set.' : 'Compara puntos representativos y repite la medición después de cambios de manejo. No se establece un plazo automático.'))].filter(Boolean).join('\n\n'),
        ...(derivedIds ? { derived: derivedIds.map(id => presentDerived(physics.indicators[id], en)) } : {}),
      };
    }),
  };
}

export function isMeasurementPresentation(value: unknown): value is MeasurementPresentation {
  if (!value || typeof value !== 'object') return false;
  const p = value as MeasurementPresentation;
  return [1, 2, 3].includes(p.version) && ['pre_siembra', 'vegetativo', 'floracion', 'cosecha'].includes(p.stage)
    && (p.version < 3 ? p.species == null : p.species === null || isPresentationSpecies(p.species))
    && (p.evaluationState === undefined || ['attention', 'no_detected_risk', 'insufficient_data'].includes(p.evaluationState))
    && (p.suggestedCrops === undefined ? p.version === 1 : Array.isArray(p.suggestedCrops) && p.suggestedCrops.every(c => typeof c === 'string'))
    && ['context', 'title', 'summary', 'weatherNote'].every(k => typeof (p as unknown as Record<string, unknown>)[k] === 'string')
    && Array.isArray(p.actions) && p.actions.every(a => typeof a === 'string')
    && (p.recommendations === undefined || (Array.isArray(p.recommendations) && p.recommendations.every(isRecommendation)))
    && Array.isArray(p.parameters) && p.parameters.length === PARAMETER_KEYS.length
    && p.parameters.every((m, i) => m && m.key === PARAMETER_KEYS[i] && (m.value === null || (typeof m.value === 'number' && Number.isFinite(m.value)))
      && ['OPTIMAL', 'WARNING', 'CRITICAL', 'INFO'].includes(m.status)
      && ['label', 'unit', 'state', 'recommendation', 'control'].every(k => typeof (m as unknown as Record<string, unknown>)[k] === 'string')
      && (m.derived === undefined || (Array.isArray(m.derived) && m.derived.every(isPresentationDerived))));
}

function isPresentationDerived(value: unknown): value is PresentationDerived {
  if (!value || typeof value !== 'object') return false;
  const d = value as PresentationDerived;
  return ['vpd', 'dew_point', 'dew_point_spread', 'soil_air_difference'].includes(d.id) && typeof d.label === 'string' && typeof d.note === 'string'
    && ['kPa', '°C'].includes(d.unit) && ['pressure', 'temperature', 'difference'].includes(d.kind)
    && (d.value === null || (typeof d.value === 'number' && Number.isFinite(d.value)));
}

function isRecommendation(value: unknown): value is Recommendation {
  if (!value || typeof value !== 'object') return false;
  const r = value as Recommendation;
  return ['soil', 'evidence', 'weather', 'irrigation', 'monitoring'].includes(r.kind) && ['high', 'normal'].includes(r.priority)
    && ['now', 'today', 'next_days', 'next_reading'].includes(r.when) && typeof r.title === 'string' && typeof r.body === 'string'
    && (r.detail === undefined || typeof r.detail === 'string');
}

function isPresentationSpecies(value: unknown): value is PresentationSpecies {
  if (!value || typeof value !== 'object') return false;
  const s = value as PresentationSpecies;
  return ['id', 'es', 'en', 'scientific', 'catalogVersion'].every(k => typeof (s as unknown as Record<string, unknown>)[k] === 'string')
    && typeof s.hasStageCriteria === 'boolean' && (s.rulesVersion === undefined || typeof s.rulesVersion === 'string');
}

/**
 * Especie guardada en la instantánea de una medición. Las mediciones anteriores a la
 * versión 3 no tienen especie elegida, aunque su `crop_id` conserve un perfil del prototipo.
 */
export function savedSpecies(diagnosis: unknown): PresentationSpecies | null {
  const presentation = diagnosis && typeof diagnosis === 'object' ? (diagnosis as { presentation?: unknown }).presentation : undefined;
  return isMeasurementPresentation(presentation) && presentation.species ? presentation.species : null;
}

/** Sólo lee la instantánea guardada; no ejecuta reglas nuevas sobre históricos. */
export function savedEvaluationState(diagnosis: unknown): EvaluationState | undefined {
  if (!diagnosis || typeof diagnosis !== 'object') return undefined;
  const saved = diagnosis as { evaluationState?: unknown; presentation?: unknown };
  const state = isMeasurementPresentation(saved.presentation) ? saved.presentation.evaluationState : saved.evaluationState;
  return state === 'attention' || state === 'no_detected_risk' || state === 'insufficient_data' ? state : undefined;
}

export function presentationFromPoint(point: MeasurementPoint, language: AppLanguage = 'es'): MeasurementPresentation {
  const diagnosis = point.diagnosis as { presentation?: unknown; advice?: { suggestedCrops?: unknown } } | null;
  if (isMeasurementPresentation(diagnosis?.presentation) && diagnosis.presentation.stage === point.stage) {
    const saved = diagnosis.presentation;
    const title = localizedStageTitle(point.stage, point.verdict, saved.title, language);
    if (saved.version === 1) {
      const crops = diagnosis?.advice?.suggestedCrops;
      return { ...saved, title,
        context: language === 'en' ? 'Saved reading evaluated with assumed reference profiles in an earlier version.' : 'Lectura guardada evaluada con perfiles de referencia supuestos en una versión anterior.',
        suggestedCrops: point.stage === 'pre_siembra' && Array.isArray(crops) && crops.every(c => typeof c === 'string') ? [...crops] : saved.suggestedCrops,
      };
    }
    return title === saved.title ? saved : { ...saved, title };
  }
  const title = localizedStageTitle(point.stage, point.verdict, point.title, language);
  const en = language === 'en';
  const values = [point.vwcPercent, point.soilTempC, point.ph, point.ecUsCm, point.nitrogen, point.phosphorus, point.potassium, point.airTemp, point.airHumidity, point.airPressure];
  return {
    version: 1, stage: point.stage, context: en ? 'Saved reading' : 'Lectura guardada', title,
    summary: point.action ?? (en ? 'This reading does not keep a detailed recommendation.' : 'Esta lectura no conserva una recomendación detallada.'),
    actions: point.action ? [point.action] : [],
    weatherNote: en ? 'See the recorded diagnosis; the current forecast is not added to this reading.' : 'Consulta el diagnóstico registrado; no se incorpora pronóstico actual a esta lectura.',
    parameters: PARAMETER_KEYS.map((key, i) => ({ key, label: parameterLabel(key, language), value: values[i] ?? null, unit: units[i], status: 'INFO',
      state: values[i] == null ? (en ? 'No value recorded.' : 'Sin dato registrado.') : (en ? 'Recorded value. No individual versioned assessment is kept.' : 'Valor registrado. No se conserva una evaluación individual versionada.'),
      recommendation: i >= 4 && i <= 6
        ? (en ? 'Record without chemical validation. Do not use to dose fertilizers.' : 'Registro sin validación química. No usar para dosificar fertilizantes.')
        : (en ? 'See the action recorded in the global plan. It is not recalculated with the current settings.' : 'Consulta la acción registrada en el plan global. No se recalcula con la configuración actual.'),
      control: en ? 'For an updated diagnosis, take a new measurement and select its stage.' : 'Para obtener un diagnóstico actualizado, realiza una nueva medición y selecciona su fase.',
    })),
  };
}
