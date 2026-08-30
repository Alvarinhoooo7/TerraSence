// src/engine/stageEvaluator.ts
//
// CAPA DE ETAPA FENOLÓGICA sobre el motor agronómico base.
//
// El motor rescatado (`agronomyEngine.ts`) evalúa el suelo de forma correcta
// pero es CIEGO a la etapa del cultivo: siempre razona como si se tratara de
// una siembra. Esta capa corrige eso sin tocar el motor base.
//
// Fundamento: el mismo suelo, con los mismos 7 valores, exige veredictos
// distintos según la etapa. Un suelo a 9 °C es prohibitivo para sembrar y
// perfectamente irrelevante para cosechar; una CE de 2.400 µS/cm es tolerable
// en vegetativo y catastrófica en floración, donde provoca aborto floral.
//
// Se declara explícitamente el peso de cada parámetro por etapa, en vez de
// esconderlo en condicionales: así un agrónomo puede auditar y corregir los
// criterios sin leer código (principio P4, determinismo auditable).

import { evaluateAgronomicStatus } from './agronomyEngine';
import type {
  AgronomicEvaluation,
  AgronomicAlert,
  CropId,
  SoilMeasurement,
  SoilTextureId,
  Verdict,
} from '../types/agronomy';
import type { PhenologicalStage } from '../types/app';
import type { AppLanguage } from '../types/preferences';

/** Parámetros que gobiernan el veredicto en cada etapa, de mayor a menor peso. */
export const STAGE_DRIVERS: Record<PhenologicalStage, (keyof AgronomicEvaluation['metrics'])[]> = {
  // Germinación: si el suelo está frío o salino, la semilla se pierde.
  pre_siembra: ['temp', 'ec', 'ph', 'vwc'],
  // Máxima demanda fotosintética: nitrógeno y agua en zona radicular.
  vegetativo: ['nitrogen', 'vwc', 'ph', 'ec'],
  // Etapa más delicada: el estrés salino e hídrico aborta la flor.
  floracion: ['ec', 'vwc', 'potassium', 'ph'],
  // Ya no se corrige el cultivo: importa poder entrar con maquinaria.
  cosecha: ['vwc', 'potassium', 'nitrogen', 'ec'],
};

const STAGE_TITLES: Record<PhenologicalStage, Record<Verdict, string>> = {
  pre_siembra: {
    GREEN: 'Apto para sembrar',
    AMBER: 'Sembrar con correcciones',
    RED: 'No sembrar todavía',
  },
  vegetativo: {
    GREEN: 'Nutrición y riego correctos',
    AMBER: 'Ajustar nutrición o riego',
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
  vegetativo: { GREEN: 'Nutrition and irrigation are adequate', AMBER: 'Adjust nutrition or irrigation', RED: 'Crop at risk' },
  floracion: { GREEN: 'Flowering without stress', AMBER: 'Flowering stress risk', RED: 'Flower abortion risk' },
  cosecha: { GREEN: 'Soil is trafficable', AMBER: 'Enter with caution', RED: 'Do not enter with machinery' },
};

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
    const limeKg = Math.round((crop.phMin - sensor.ph) * 800 + 400);
    return { ...alert, title: '🧪 Acid soil: phosphorus is locked', action: `Incorporate ${limeKg} kg/ha of agricultural lime (calcium carbonate) before planting. Fertilizer will be wasted unless pH is corrected.` };
  }
  if (title.includes('Ligera Acidez')) return { ...alert, title: '🧪 Slight soil acidity', action: 'Apply organic amendment or a preventive dose of dolomitic lime.' };
  if (title.includes('Suelo Alcalino')) return { ...alert, title: '🧂 Alkaline soil: iron chlorosis risk', action: 'Apply composted organic matter or elemental sulfur.' };
  if (title.includes('Exceso de Sales')) return { ...alert, title: '⚠️ Excess salts / Toxic salinity', action: 'Apply abundant leaching irrigation (leaching fraction above 25%) to displace salts before planting.' };
  if (title.includes('Salinidad Moderada')) return { ...alert, title: '⚠️ Moderate salinity', action: 'Avoid fertilizers with a high salt index and maintain steady moisture.' };
  if (title.includes('Falso Positivo')) return { ...alert, title: '⚠️ Possible salinity false positive', action: 'The probe estimates nutrients from electrical conductivity and cannot distinguish nitrogen from sodium. At this salinity, high N-P-K values may actually be salts. Leach the soil and measure again before deciding on fertilization.' };
  if (title.includes('Déficit Hídrico')) return { ...alert, title: '🏜️ Severe water deficit', action: 'Urgent irrigation is required before planting. Seeds will not absorb enough water to sprout.' };
  if (title.includes('Asfixia Radicular')) return { ...alert, title: '🌊 Root oxygen deprivation from excess water', action: 'Wait 48 to 72 hours for the soil to drain back to field capacity.' };
  if (title.includes('Umbral de Riego')) return { ...alert, title: '💧 Irrigation threshold reached', action: `Schedule irrigation within 24 to 48 hours. Below ${texture.ur}% the plant spends energy extracting water instead of growing.` };
  if (title.includes('Capacidad de Campo')) return { ...alert, title: '💦 Soil above field capacity', action: 'Stop irrigation and do not till yet: wet soil compacts under machinery and roots have less oxygen.' };
  return alert;
};

/** Umbrales de humedad para transitabilidad de maquinaria en cosecha. */
const VWC_COMPACTION_RISK = 32;
const VWC_COMPACTION_CRITICAL = 40;

export interface StageAwareEvaluation extends AgronomicEvaluation {
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
  cropId: CropId = 'maiz',
  textureId: SoilTextureId = 'franco',
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
    if (vwc >= VWC_COMPACTION_CRITICAL) {
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
    } else if (vwc >= VWC_COMPACTION_RISK) {
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
          ? `EC of ${Math.round(ec)} µS/cm exceeds 80% of the crop limit. During flowering, osmotic stress can abort flowers and directly reduce yield. Apply leaching irrigation before fruit set.`
          : `CE de ${Math.round(ec)} µS/cm supera el 80 % del límite del cultivo. En floración el estrés osmótico provoca aborto floral y merma directa de rendimiento. Aplicar riego de lavado antes del cuaje.`,
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
        ? 'No corrective actions are pending for this stage.'
        : 'Sin acciones correctivas pendientes para esta etapa.'
      : relevantAlert?.action ?? (language === 'en' ? 'Review the highlighted conditions before continuing.' : base.verdictSummary);

  return {
    ...base,
    verdict,
    verdictTitle: language === 'en' ? STAGE_TITLES_EN[stage][verdict] : STAGE_TITLES[stage][verdict],
    alerts: localizedAlerts,
    stage,
    drivers: [...new Set(driverLabels)],
    actionSummary,
  };
}
