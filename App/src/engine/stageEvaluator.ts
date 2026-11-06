// src/engine/stageEvaluator.ts
//
// CAPA DE ETAPA FENOLÓGICA sobre el motor agronómico base.
//
// El motor base compara perfiles explícitos como si se tratara de una siembra.
// Esta capa adapta esas reglas por etapa. El flujo de la app usa
// evaluateReadingForStage, sin asignar un cultivo ni una textura al campo.
//
// Fundamento: el mismo suelo, con los mismos 7 valores, exige veredictos
// distintos según la etapa y el cultivo. Estos umbrales son orientativos,
// no diagnósticos validados de germinación, daño floral o transitabilidad.
//
// Se declara explícitamente el peso de cada parámetro por etapa, en vez de
// esconderlo en condicionales: así un agrónomo puede auditar y corregir los
// criterios sin leer código (principio P4, determinismo auditable).

import { evaluateAgronomicStatus } from './agronomyEngine';
import type {
  EvaluationCoverage,
  EvaluationState,
  AgronomicEvaluation,
  AgronomicAlert,
  CropId,
  SoilMeasurement,
  SoilTextureId,
  Verdict,
} from '../types/agronomy';
import { buildLocalInputQuality, localQualityNote } from './inputQuality';
import { buildEvaluationCoverage } from './evaluationCoverage';
import { evaluateSpeciesCriteria } from './speciesRules';
import type { PhenologicalStage } from '../types/app';
import type { AppLanguage } from '../types/preferences';

/** Parámetros que gobiernan el veredicto en cada etapa, de mayor a menor peso. */
export const STAGE_DRIVERS: Record<PhenologicalStage, (keyof AgronomicEvaluation['metrics'])[]> = {
  // Germinación: si el suelo está frío o salino, la semilla se pierde.
  pre_siembra: ['temp', 'ec', 'ph', 'vwc'],
  // Máxima demanda fotosintética: nitrógeno y agua en zona radicular.
  vegetativo: ['vwc', 'ph', 'ec'],
  // Etapa más delicada: el estrés salino e hídrico aborta la flor.
  floracion: ['ec', 'vwc', 'ph'],
  // Ya no se corrige el cultivo: importa poder entrar con maquinaria.
  cosecha: ['vwc', 'ec'],
};

const STAGE_TITLES: Record<PhenologicalStage, Record<Verdict, string>> = {
  pre_siembra: {
    GREEN: 'Apto para sembrar',
    AMBER: 'Sembrar con correcciones',
    RED: 'No sembrar todavía',
  },
  vegetativo: {
    GREEN: 'Sin alertas físicas en estas reglas',
    AMBER: 'Revisar condiciones del suelo',
    RED: 'Cultivo en riesgo',
  },
  floracion: {
    GREEN: 'Floración sin estrés',
    AMBER: 'Riesgo de estrés en floración',
    RED: 'Riesgo de aborto floral',
  },
  cosecha: {
    GREEN: 'Suelo transitable',
    AMBER: 'Entrar con precaución',
    RED: 'No ingresar maquinaria',
  },
};

const STAGE_TITLES_EN: Record<PhenologicalStage, Record<Verdict, string>> = {
  pre_siembra: { GREEN: 'Ready to plant', AMBER: 'Plant with corrections', RED: 'Do not plant yet' },
  vegetativo: { GREEN: 'No physical alerts under these rules', AMBER: 'Review soil conditions', RED: 'Crop at risk' },
  floracion: { GREEN: 'Flowering without stress', AMBER: 'Flowering stress risk', RED: 'Flower abortion risk' },
  cosecha: { GREEN: 'Soil is trafficable', AMBER: 'Enter with caution', RED: 'Do not enter with machinery' },
};

/**
 * Título de una lectura guardada en el idioma actual. El título se guarda en el idioma en que
 * se midió; si es uno de los títulos conocidos de su etapa y veredicto, se muestra su
 * equivalente. Un título que no se reconoce (de otra versión de las reglas) queda tal cual.
 */
export function localizedStageTitle(stage: PhenologicalStage, verdict: Verdict, stored: string, language: AppLanguage): string {
  const es = STAGE_TITLES[stage]?.[verdict];
  const en = STAGE_TITLES_EN[stage]?.[verdict];
  if (!es || !en || (stored !== es && stored !== en)) return stored;
  return language === 'en' ? en : es;
}

const translateBaseAlert = (
  alert: AgronomicAlert,
  sensor: SoilMeasurement,
  crop: AgronomicEvaluation['crop'],
  texture: AgronomicEvaluation['texture'],
): AgronomicAlert => {
  const title = alert.title;
  if (title.includes('Suelo Frío')) {
    const days = Math.round((crop.tempMin - sensor.temp) * 2 + 3);
    return { ...alert, title: '❄️ Soil too cold for germination', action: `Do not plant today. Seeds may become dormant and rot. Wait about ${days} sunny days.` };
  }
  if (title.includes('Temperatura Marginal')) return { ...alert, title: '🌡️ Marginal germination temperature', action: 'Germination will be slow and uneven. Wait 2 or 3 sunny days, or plant more shallowly to use warmer surface soil.' };
  if (title.includes('Suelo Ácido')) {
    return { ...alert, title: '🧪 Acid soil: verify in a laboratory', action: 'Request a laboratory lime requirement including buffer capacity, depth and amendment quality. This reading cannot determine a lime dose.' };
  }
  if (title.includes('Ligera Acidez')) return { ...alert, title: '🧪 Slight soil acidity', action: 'Confirm soil pH and crop needs in a laboratory before applying amendments.' };
  if (title.includes('Suelo Alcalino')) return { ...alert, title: '🧂 Alkaline soil: iron chlorosis risk', action: 'Confirm pH and alkalinity in a laboratory; consult an agronomist before applying sulfur.' };
  if (title.includes('Exceso de Sales')) return { ...alert, title: '⚠️ Excess salts / Toxic salinity', action: 'Confirm salinity, irrigation water quality and drainage before designing any leaching irrigation.' };
  if (title.includes('Salinidad Moderada')) return { ...alert, title: '⚠️ Moderate salinity', action: 'Avoid fertilizers with a high salt index and maintain steady moisture.' };
  if (title.includes('Falso Positivo')) return { ...alert, title: '⚠️ Possible salinity false positive', action: 'NPK registers are unvalidated. Confirm nutrients and salinity in a laboratory before fertilization or leaching.' };
  if (title.includes('Déficit Hídrico')) return { ...alert, title: '🏜️ Severe water deficit', action: 'Urgent irrigation is required before planting. Seeds will not absorb enough water to sprout.' };
  if (title.includes('Asfixia Radicular')) return { ...alert, title: '🌊 Root oxygen deprivation from excess water', action: 'Wait 48 to 72 hours for the soil to drain back to field capacity.' };
  if (title.includes('Umbral de Riego')) return { ...alert, title: '💧 Irrigation threshold reached', action: `Schedule irrigation within 24 to 48 hours. Below ${texture.ur}% the plant spends energy extracting water instead of growing.` };
  if (title.includes('Capacidad de Campo')) return { ...alert, title: '💦 Soil above field capacity', action: 'Stop irrigation and do not till yet: wet soil compacts under machinery and roots have less oxygen.' };
  return alert;
};

/** Mensajes de estado del motor base (siempre en español) y su equivalente en inglés, conservando las cifras. */
const METRIC_MESSAGES_EN: [RegExp, string][] = [
  [/^Temperatura adecuada \((.+)°C ≥ (.+)°C mín\)$/, 'Adequate temperature ($1°C ≥ $2°C min)'],
  [/^Suelo frío \((.+)°C < (.+)°C mín\)\.$/, 'Cold soil ($1°C < $2°C min).'],
  [/^Temperatura en el límite \((.+)°C, mínimo (.+)°C\)$/, 'Temperature at the limit ($1°C, minimum $2°C)'],
  [/^pH equilibrado \((.+)\) dentro del rango \((.+) - (.+)\)$/, 'Balanced pH ($1) within range ($2 - $3)'],
  [/^Suelo fuertemente ácido \(pH (.+)\)$/, 'Strongly acidic soil (pH $1)'],
  [/^Suelo ligeramente ácido \(pH (.+)\)$/, 'Slightly acidic soil (pH $1)'],
  [/^Suelo alcalino \/ calcáreo \(pH (.+)\)$/, 'Alkaline / calcareous soil (pH $1)'],
  [/^Conductividad óptima \((.+) µS\/cm ≤ (.+) µS\/cm\)$/, 'Optimal conductivity ($1 µS/cm ≤ $2 µS/cm)'],
  [/^Salinidad crítica \((.+) µS\/cm\)\. Quema radicular asegurada\.$/, 'Critical salinity ($1 µS/cm). Root burn is certain.'],
  [/^Salinidad moderada \((.+) µS\/cm\)\.$/, 'Moderate salinity ($1 µS/cm).'],
  [/^Humedad óptima \((.+)% VWC en capacidad de campo\)$/, 'Optimal moisture ($1% VWC at field capacity)'],
  [/^Suelo seco bajo Punto de Marchitez \((.+)% < (.+)%\)$/, 'Dry soil below the wilting point ($1% < $2%)'],
  [/^Suelo saturado \/ encharcado \((.+)% VWC\)$/, 'Saturated / waterlogged soil ($1% VWC)'],
  [/^Humedad bajo el umbral de riego \((.+)% < (.+)%\)$/, 'Moisture below the irrigation threshold ($1% < $2%)'],
  [/^Humedad sobre Capacidad de Campo \((.+)% > (.+)%\)$/, 'Moisture above field capacity ($1% > $2%)'],
  [/^Sin validar; no diagnostica nutrición$/, 'Unvalidated; does not diagnose nutrition'],
  [/^Radiación normal$/, 'Normal radiation'],
  [/^Alta radiación \((.+)k Lux\) - Evaporación superficial acelerada$/, 'High radiation ($1k Lux) - Accelerated surface evaporation'],
  [/^Registro NPK sin validación química independiente\. .*$/, 'NPK record without independent chemical validation. A low EC does not prove accuracy or allow dosing fertilizers.'],
  [/^Lectura poco confiable: con (.+) µS\/cm de conductividad, .*$/, 'Unreliable reading: at $1 µS/cm of conductivity, the probe may be reading salts (sodium, calcium) and reporting them as nutrients. Take it as a hint, not as data.'],
];
const translateMetricText = (text: string) => {
  for (const [pattern, english] of METRIC_MESSAGES_EN) if (pattern.test(text)) return text.replace(pattern, english);
  return text;
};
const translateMetrics = (metrics: AgronomicEvaluation['metrics']): AgronomicEvaluation['metrics'] =>
  Object.fromEntries(Object.entries(metrics).map(([key, metric]) => [key, {
    ...metric,
    msg: translateMetricText(metric.msg),
    ...(metric.confidenceNote ? { confidenceNote: translateMetricText(metric.confidenceNote) } : {}),
  }])) as AgronomicEvaluation['metrics'];

/**
 * Reglas generales del flujo de captura (MOTOR_AGRONOMICO.md §8.1). Se aplican con o sin
 * especie y no dependen de ningún catálogo: agregar, quitar o reordenar perfiles no cambia
 * una alerta general (T02, T03). Sus límites son los extremos que antes se calculaban sobre
 * los perfiles y texturas del prototipo, congelados con el mismo valor: no son referencias
 * agronómicas revisadas (estado `documented`, no `locally_validated`) y así se declara.
 */
export const GENERAL_RULES_VERSION = '1.0.0';
export const GENERAL_RULES = {
  'GEN-TEMP-01': { inputs: ['temp'], below: 4, basis: 'Mínimo térmico más bajo de los perfiles del prototipo (trigo, 4 °C).' },
  'GEN-PH-01': { inputs: ['ph'], below: 4.2, above: 7.8, basis: 'Unión de los rangos de pH de los perfiles del prototipo (arándano 4,2 a vid 7,8).' },
  'GEN-VWC-01': { inputs: ['vwc'], below: 6, atOrAbove: 60, basis: 'Punto de marchitez más bajo (arenoso, 6 %) y saturación más alta (arcilloso, 60 %) de las texturas del prototipo.' },
} as const;
export type GeneralRuleId = keyof typeof GENERAL_RULES;

export interface StageOutputRuleContract {
  id: string;
  version: string;
  stage: Exclude<PhenologicalStage, 'pre_siembra'>;
  objective: string;
  inputs: readonly string[];
  state: 'enabled' | 'documented';
  evidencePolicy: string;
  prohibitedAssertions: readonly string[];
}

/**
 * Registro explícito de salidas de vegetativo, floración y cosecha (MOTOR_AGRONOMICO.md §8.3–§8.6, E4).
 * Las reglas con umbrales respaldados o indicadores físicos continuos están en `enabled`; las que
 * requerirían un umbral de patógeno, polinizador o maquinaria no especificado permanecen en `documented`
 * para no activar alertas sin evidencia (§8.6).
 */
export const STAGE_OUTPUT_RULES: readonly StageOutputRuleContract[] = [
  { id: 'VG01', version: '1.0.0', stage: 'vegetativo', objective: 'Demanda atmosférica (DPV continuo y exposición térmica)', inputs: ['airTemp', 'airHumidity', 'vpd_kpa'], state: 'enabled', evidencePolicy: 'Indicador continuo de DPV habilitado; sin categoría universal sin dominio documentado (§8.6).', prohibitedAssertions: ['marchitez confirmada'] },
  { id: 'VG02', version: '1.0.0', stage: 'vegetativo', objective: 'Contexto agua–ambiente', inputs: ['vwc', 'precipitationMm', 'rainProbabilityPct'], state: 'enabled', evidencePolicy: 'Revisión de humedad puntual junto con pronóstico de lluvia; nunca reemplaza riego por cantidad fija (§8.6).', prohibitedAssertions: ['dosis de riego en litros', 'lluvia reemplaza el riego'] },
  { id: 'VG03', version: '1.0.0', stage: 'vegetativo', objective: 'Condiciones térmicas en crecimiento', inputs: ['temp', 'airTemp', 'minimumTemperatureC', 'maximumTemperatureC'], state: 'enabled', evidencePolicy: 'Extremos físicos observados/previstos y criterios térmicos por especie cuando se elige cultivo (§8.3).', prohibitedAssertions: ['velocidad de crecimiento sin especie'] },
  { id: 'VG04', version: '1.0.0', stage: 'vegetativo', objective: 'Acidez y conductividad aparente', inputs: ['ph', 'ec'], state: 'enabled', evidencePolicy: 'Comparación de pH general/especie y referencia de salinidad sin clasificar CE sin método (§6.1, §8.3).', prohibitedAssertions: ['toxicidad específica', 'bloqueo de nutrientes', 'receta de fertilización'] },
  { id: 'VG05', version: '1.0.0', stage: 'vegetativo', objective: 'Humedad ambiental persistente', inputs: ['airHumidity', 'dew_point_c', 'hourly.relativeHumidityPct'], state: 'documented', evidencePolicy: 'Punto de rocío continuo publicado; sin umbral de infección de patógeno desconocido (§8.6, T33).', prohibitedAssertions: ['infección fúngica', 'aplicar fungicida'] },
  { id: 'FL01', version: '1.0.0', stage: 'floracion', objective: 'Exposición a frío en floración', inputs: ['airTemp', 'minimumTemperatureC', 'hourly.temperatureC'], state: 'enabled', evidencePolicy: 'Aviso físico de helada y umbrales florales documentados por especie y duración horaria (§8.4).', prohibitedAssertions: ['porcentaje de daño tisular sin especie'] },
  { id: 'FL02', version: '1.0.0', stage: 'floracion', objective: 'Calor y demanda en floración', inputs: ['airTemp', 'airHumidity', 'maximumTemperatureC', 'vpd_kpa'], state: 'enabled', evidencePolicy: 'Exposición térmica y criterios florales de calor/noches cálidas por especie (§8.4).', prohibitedAssertions: ['aborto floral asegurado sin evidencia de especie'] },
  { id: 'FL03', version: '1.0.0', stage: 'floracion', objective: 'Persistencia de humedad y lluvia en floración', inputs: ['airHumidity', 'precipitationMm', 'rainProbabilityPct', 'weatherCode'], state: 'enabled', evidencePolicy: 'Observación de lluvia/niebla en floración sin inferir infección ni polinización fallida (§8.4, T33).', prohibitedAssertions: ['infección confirmada', 'polinización fallida'] },
  { id: 'FL04', version: '1.0.0', stage: 'floracion', objective: 'Viento y ráfagas en floración', inputs: ['windKmh', 'hourly.windKmh'], state: 'documented', evidencePolicy: 'Magnitud de viento publicada; sin umbral de vuelo de polinizadores ni labor no especificada (§8.6).', prohibitedAssertions: ['conteo de visitas de polinizadores', 'ausencia de polinización'] },
  { id: 'FL05', version: '1.0.0', stage: 'floracion', objective: 'Contexto del suelo en floración', inputs: ['vwc', 'ec', 'ph'], state: 'enabled', evidencePolicy: 'Se retira del flujo nuevo el multiplicador uniforme del 80 % de CE; sólo corren criterios documentados por especie (§8.4).', prohibitedAssertions: ['reducción uniforme de tolerancia salina'] },
  { id: 'CO01', version: '1.0.0', stage: 'cosecha', objective: 'Exposición a lluvia en cosecha', inputs: ['precipitationMm', 'rainProbabilityPct', 'remainingToday'], state: 'enabled', evidencePolicy: 'Comparación de períodos con y sin lluvia y avisos de rajadura/fruta mojada por especie (§8.5).', prohibitedAssertions: ['cosecha seca garantizada', 'calidad poscosecha garantizada'] },
  { id: 'CO02', version: '1.0.0', stage: 'cosecha', objective: 'Exposición a calor en cosecha', inputs: ['maximumTemperatureC', 'airTemp'], state: 'enabled', evidencePolicy: 'Comparación relativa de exigencia térmica entre días completos del pronóstico (§8.5).', prohibitedAssertions: ['temperatura interna de fruto', 'vida útil poscosecha'] },
  { id: 'CO03', version: '1.0.0', stage: 'cosecha', objective: 'Viento en cosecha', inputs: ['windKmh', 'hourly.windKmh'], state: 'documented', evidencePolicy: 'Magnitud de viento informada; sin límite de maquinaria sin especificación del equipo (§8.6).', prohibitedAssertions: ['seguridad de maquinaria por viento'] },
  { id: 'CO04', version: '1.0.0', stage: 'cosecha', objective: 'Humedad del suelo antes de labores de cosecha', inputs: ['vwc', 'precipitationMm'], state: 'enabled', evidencePolicy: 'Revisión del terreno antes de ingresar sin declarar transitabilidad, ausencia de barro ni madurez (§8.5, T34).', prohibitedAssertions: ['suelo transitable', 'listo para cosechar', 'madurez alcanzada'] },
  { id: 'CO05', version: '1.0.0', stage: 'cosecha', objective: 'Comparación incompleta de ventanas de cosecha', inputs: ['forecast', 'inputQuality.daily'], state: 'enabled', evidencePolicy: 'Los días con pronóstico incompleto se declaran y nunca se presentan como ventana favorable (§8.5, T28).', prohibitedAssertions: ['ventana favorable por datos ausentes'] },
] as const;

export function getStageOutputRules(stage: Exclude<PhenologicalStage, 'pre_siembra'>): readonly StageOutputRuleContract[] {
  return STAGE_OUTPUT_RULES.filter(r => r.stage === stage);
}

/** Umbrales de humedad para transitabilidad de maquinaria en cosecha. */

export interface StageAwareEvaluation extends Omit<AgronomicEvaluation, 'crop' | 'texture'> {
  /** Ausentes únicamente en el evaluador legado de perfiles explícitos. */
  state?: EvaluationState;
  coverage?: EvaluationCoverage;
  crop: AgronomicEvaluation['crop'] | null;
  texture: AgronomicEvaluation['texture'] | null;
  stage: PhenologicalStage;
  /** Parámetros que efectivamente decidieron el veredicto en esta etapa. */
  drivers: string[];
  actionSummary: string;
}

const worst = (a: Verdict, b: Verdict): Verdict => {
  const order: Verdict[] = ['GREEN', 'AMBER', 'RED'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
};

/**
 * Evalúa el suelo en el contexto de una etapa fenológica concreta.
 *
 * El veredicto se recalcula considerando SÓLO los parámetros que gobiernan la
 * etapa: así un suelo frío no bloquea una cosecha, y una salinidad moderada sí
 * levanta bandera en floración aunque el motor base la considerase tolerable.
 */
export function evaluateForStage(
  sensorData: SoilMeasurement,
  stage: PhenologicalStage,
  cropId: CropId,
  textureId: SoilTextureId,
  language: AppLanguage = 'es',
): StageAwareEvaluation {
  const base = evaluateAgronomicStatus(sensorData, cropId, textureId);
  const drivers = STAGE_DRIVERS[stage];

  // Veredicto reponderado: sólo cuentan los parámetros relevantes a la etapa.
  let verdict: Verdict = 'GREEN';
  const driverLabels: string[] = [];

  for (const key of drivers) {
    const metric = base.metrics[key];
    if (!metric) continue;
    if (metric.status === 'CRITICAL') {
      verdict = worst(verdict, 'RED');
      driverLabels.push(key);
    } else if (metric.status === 'WARNING') {
      verdict = worst(verdict, 'AMBER');
      driverLabels.push(key);
    }
  }

  const alerts: AgronomicAlert[] = [...base.alerts];

  // Regla propia de cosecha: el motor base no contempla la compactación, que
  // es justamente el criterio que decide si entra el tractor.
  if (stage === 'cosecha') {
    const vwc = base.metrics.vwc.val;
    if (vwc >= base.texture.sat) {
      verdict = 'RED';
      driverLabels.push('vwc');
      alerts.unshift({
        type: 'danger',
        param: 'vwc',
        title: language === 'en' ? 'High compaction risk' : 'Riesgo alto de compactación',
        action: language === 'en'
          ? `Moisture is ${vwc.toFixed(0)}%, above field capacity. Heavy machinery will compact the profile and damage soil structure for the next season. Wait for drainage.`
          : `Humedad de ${vwc.toFixed(0)} % sobre capacidad de campo. El ingreso de maquinaria pesada compactará el perfil y dañará la estructura del suelo para la próxima temporada. Esperar a que el suelo drene.`,
      });
    } else if (vwc >= base.texture.cc) {
      verdict = worst(verdict, 'AMBER');
      driverLabels.push('vwc');
      alerts.unshift({
        type: 'warning',
        param: 'vwc',
        title: language === 'en' ? 'Limited trafficability' : 'Transitabilidad limitada',
        action: language === 'en'
          ? `Moisture is ${vwc.toFixed(0)}%. Use only light machinery or low-pressure tires, and avoid repeated passes over the same track.`
          : `Humedad de ${vwc.toFixed(0)} %. Entrar sólo con maquinaria liviana o neumáticos de baja presión, y evitar repetir pasadas por la misma huella.`,
      });
    }
  }

  // Regla propia de floración: la CE que el motor base tolera es demasiado
  // alta cuando la planta está cuajando fruto.
  if (stage === 'floracion') {
    const ec = base.metrics.ec.val;
    const ecFloweringLimit = base.crop.ecMax * 0.8;
    if (ec > ecFloweringLimit) {
      verdict = worst(verdict, 'AMBER');
      driverLabels.push('ec');
      alerts.unshift({
        type: 'warning',
        param: 'ec',
        title: language === 'en' ? 'High salinity during flowering' : 'Salinidad elevada en floración',
        action: language === 'en'
          ? `EC of ${Math.round(ec)} µS/cm triggers a provisional 80% screening threshold. Confirm salinity and drainage with an agronomist before treatment.`
          : `CE de ${Math.round(ec)} µS/cm activa el umbral orientativo del 80 %, aún no validado en campo. Confirmar salinidad y drenaje con asesoría antes de intervenir.`,
      });
    }
  }

  const localizedAlerts = language === 'en'
    ? alerts.map((alert) => translateBaseAlert(alert, sensorData, base.crop, base.texture))
    : alerts;
  const relevantAlert = localizedAlerts.find((a) => driverLabels.includes(a.param)) ?? localizedAlerts[0];
  const actionSummary =
    verdict === 'GREEN'
      ? language === 'en'
        ? 'No alerts under these provisional physical rules. This does not validate nutrition or replace laboratory analysis.'
        : 'Sin alertas bajo estas reglas físicas provisionales. No valida nutrición ni reemplaza análisis de laboratorio.'
      : relevantAlert?.action ?? (language === 'en' ? 'Review the highlighted conditions before continuing.' : base.verdictSummary);

  return {
    ...base,
    metrics: language === 'en' ? translateMetrics(base.metrics) : base.metrics,
    verdict,
    verdictTitle: language === 'en' ? STAGE_TITLES_EN[stage][verdict] : STAGE_TITLES[stage][verdict],
    alerts: localizedAlerts,
    stage,
    drivers: [...new Set(driverLabels)],
    actionSummary,
  };
}

/**
 * Flujo de la app: sólo se conoce la etapa. Compara el catálogo sin asignar un
 * cultivo ni una textura al campo. Si los perfiles discrepan, conserva el dato
 * como contexto; no prescribe riego ni autoriza maquinaria usando suelo franco.
 * La evaluación con perfiles explícitos queda disponible para contrastar reglas.
 */
export function evaluateReadingForStage(
  reading: SoilMeasurement, stage: PhenologicalStage, language: AppLanguage = 'es',
  context?: { capturedAt: string; evaluatedAt: string; simulated?: boolean },
  speciesId?: string | null,
): StageAwareEvaluation {
  const en = language === 'en';
  const quality = buildLocalInputQuality(reading, context?.capturedAt ?? '', context?.simulated);
  const coverage = buildEvaluationCoverage(quality, context?.evaluatedAt ?? null);
  const usable = (key: 'temp' | 'ph' | 'vwc' | 'airHumidity' | 'airTemp') => quality.observations[key].availability === 'available' && coverage.freshness === 'fresh';
  const alerts: AgronomicAlert[] = [];
  const rule = (ruleId: GeneralRuleId) => ({ ruleId, ruleVersion: GENERAL_RULES_VERSION });
  const metrics = Object.fromEntries(
    (['vwc', 'temp', 'ec', 'ph', 'nitrogen', 'phosphorus', 'potassium', 'lux'] as const).map(key => [key, {
      val: reading[key], unit: key === 'vwc' ? '%' : key === 'temp' ? '°C' : key === 'ec' ? 'µS/cm' : key === 'ph' ? 'pH' : key === 'lux' ? 'Lux' : 'mg/kg',
      status: 'INFO', msg: en ? 'Local reading; interpretation depends on field conditions.' : 'Lectura local; su interpretación depende de las condiciones del campo.',
    }]),
  ) as AgronomicEvaluation['metrics'];
  const check = (key: 'temp' | 'ph', ruleId: GeneralRuleId, outside: boolean, note: string, action: string) => {
    if (!usable(key)) return;
    metrics[key].status = outside ? 'WARNING' : 'INFO';
    metrics[key].msg = note;
    // La acción explica qué falta confirmar, sin dar por conocido el cultivo.
    metrics[key].confidenceNote = action;
    if (outside && STAGE_DRIVERS[stage].includes(key)) alerts.push({ type: 'warning', param: key, title: note, action, ...rule(ruleId) });
  };
  check('temp', 'GEN-TEMP-01', reading.temp < GENERAL_RULES['GEN-TEMP-01'].below,
    en ? 'Soil temperature compared with the minimums in the crop catalog.' : 'Temperatura del suelo comparada con los mínimos del catálogo de cultivos.',
    en ? 'Temperature alone does not establish planting suitability. Check the possible crops and local season.' : 'La temperatura por sí sola no determina aptitud para sembrar. Revisa los posibles cultivos y la temporada local.');
  check('ph', 'GEN-PH-01', reading.ph < GENERAL_RULES['GEN-PH-01'].below || reading.ph > GENERAL_RULES['GEN-PH-01'].above,
    en ? 'Soil pH compared with the general reference range (4.2 to 7.8).' : 'pH del suelo comparado con el rango general de referencia (4,2 a 7,8).',
    en ? 'Confirm pH and crop requirements before applying amendments.' : 'Confirma el pH y los requerimientos del cultivo antes de aplicar enmiendas.');
  metrics.ec.msg = localQualityNote(quality.observations.ec, language);
  metrics.ph.confidenceNote = localQualityNote(quality.observations.ph, language);
  // Sólo se destaca un extremo de humedad si todos los perfiles coinciden.
  const dry = usable('vwc') && reading.vwc < GENERAL_RULES['GEN-VWC-01'].below;
  const wet = usable('vwc') && reading.vwc >= GENERAL_RULES['GEN-VWC-01'].atOrAbove;
  metrics.vwc.msg = en ? 'Soil texture is unknown; moisture does not determine an irrigation dose or machinery access.' : 'La textura del suelo no está determinada; esta humedad no define una dosis de riego ni autoriza el ingreso de maquinaria.';
  if (dry || wet) {
    metrics.vwc.status = 'WARNING';
    alerts.push({ type: 'warning', param: 'vwc',
      title: en ? 'Moisture outside all catalog reference ranges' : 'Humedad fuera de los rangos de referencia del catálogo',
      action: en ? 'Check moisture and drainage in the field and repeat the reading before deciding on irrigation or machinery.' : 'Revisa humedad y drenaje en terreno y repite la lectura antes de decidir riego o ingreso de maquinaria.',
      ...rule('GEN-VWC-01'),
    });
  }
  for (const key of ['nitrogen', 'phosphorus', 'potassium'] as const) {
    metrics[key] = { ...metrics[key], confidence: 'LOW',
      msg: en ? 'Unvalidated; does not diagnose nutrition' : 'Sin validar; no diagnostica nutrición',
      confidenceNote: en ? 'Confirm nutrients in a laboratory; do not use these records to dose fertilizers.'
        : 'Confirma nutrientes en laboratorio; no uses estos valores para dosificar fertilizantes.',
    };
  }
  // Criterios propios de la especie (TASK ES6): se agregan al final sin alterar las
  // alertas generales de arriba, para que una especie indicada no cambie cómo se
  // evalúa el suelo frío, salino o seco (T45). Usan la misma regla de calidad y vigencia:
  // un dato ausente, inválido o de una captura antigua no se compara con la especie. Los
  // criterios de la especie que dependen del pronóstico se evalúan en contextualAdvice.ts.
  const speciesAlerts = evaluateSpeciesCriteria(speciesId, stage, reading, language, usable);
  alerts.push(...speciesAlerts);

  // El esquema legado exige un semáforo. Ámbar evita que clientes antiguos lo lean como éxito;
  // los consumidores nuevos usan state para representar insuficiencia con tono neutral.
  // Una nota informativa de la especie (pH dentro de su óptimo) no es motivo de atención.
  const needsAttention = alerts.some(a => !speciesAlerts.includes(a) || a.type !== 'info');
  const state: EvaluationState = needsAttention ? 'attention' : 'insufficient_data';
  const verdict: Verdict = 'AMBER';
  const title = state === 'attention' ? (en ? 'Review the measured conditions' : 'Revisar las condiciones medidas')
    : (en ? 'Insufficient evidence for a complete assessment' : 'Evidencia insuficiente para una evaluación completa');
  const summary = coverage.freshness !== 'fresh'
    ? (en ? 'This reading is old or we cannot tell when it was taken. Measure again before deciding.' : 'Esta lectura es antigua o no sabemos cuándo se tomó. Vuelve a medir antes de decidir.')
    : (en ? 'Reference reading: with this data we cannot give you a complete diagnosis of the soil. pH works as a guide; for salt or fertilizers you need a laboratory analysis.'
      : 'Lectura de referencia: con estos datos no podemos darte un diagnóstico completo del suelo. El pH sirve como guía; para sal o fertilizantes necesitas un análisis de laboratorio.');
  return { crop: null, texture: null, stage, metrics, alerts, verdict, verdictTitle: title,
    state, coverage, verdictSummary: summary, actionSummary: summary, drivers: [...new Set(alerts.map(a => a.param))] };
}
