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
        title: 'Riesgo alto de compactación',
        action:
          `Humedad de ${vwc.toFixed(0)} % sobre capacidad de campo. El ingreso de maquinaria ` +
          'pesada compactará el perfil y dañará la estructura del suelo para la próxima temporada. ' +
          'Esperar a que el suelo drene.',
      });
    } else if (vwc >= VWC_COMPACTION_RISK) {
      verdict = worst(verdict, 'AMBER');
      driverLabels.push('vwc');
      alerts.unshift({
        type: 'warning',
        param: 'vwc',
        title: 'Transitabilidad limitada',
        action:
          `Humedad de ${vwc.toFixed(0)} %. Entrar sólo con maquinaria liviana o neumáticos de ` +
          'baja presión, y evitar repetir pasadas por la misma huella.',
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
        title: 'Salinidad elevada en floración',
        action:
          `CE de ${Math.round(ec)} µS/cm supera el 80 % del límite del cultivo. En floración el ` +
          'estrés osmótico provoca aborto floral y merma directa de rendimiento. Aplicar riego ' +
          'de lavado antes del cuaje.',
      });
    }
  }

  const relevantAlert = alerts.find((a) => driverLabels.includes(a.param)) ?? alerts[0];
  const actionSummary =
    verdict === 'GREEN'
      ? 'Sin acciones correctivas pendientes para esta etapa.'
      : relevantAlert?.action ?? base.verdictSummary;

  return {
    ...base,
    verdict,
    verdictTitle: STAGE_TITLES[stage][verdict],
    alerts,
    stage,
    drivers: [...new Set(driverLabels)],
    actionSummary,
  };
}
