/**
 * Motor de Reglas Agronómicas en TypeScript para React Native (TerraSense)
 */

import { 
  SoilMeasurement, CropId, CropDefinition, SoilTextureId, 
  SoilTexture, AgronomicEvaluation, AgronomicAlert, Verdict 
} from '../types/agronomy';

export const CROPS_DB: Record<CropId, CropDefinition> = {
  maiz: {
    id: 'maiz',
    name: 'Maíz Grano / Choclo',
    emoji: '🌽',
    tempMin: 12.0,
    tempOpt: 22.0,
    phMin: 5.8,
    phMax: 7.2,
    ecMax: 1800,
    depthCm: '4 - 6 cm',
    description: 'Sensible al frío en germinación y a suelos fuertemente ácidos.'
  },
  tomate: {
    id: 'tomate',
    name: 'Tomate de Campo / Invernadero',
    emoji: '🍅',
    tempMin: 15.0,
    tempOpt: 24.0,
    phMin: 6.0,
    phMax: 6.8,
    ecMax: 2200,
    depthCm: '1 - 2 cm (trasplante)',
    description: 'Alta demanda de calcio y fósforo; no tolera anoxia radicular.'
  },
  papa: {
    id: 'papa',
    name: 'Papa (Tubérculo)',
    emoji: '🥔',
    tempMin: 8.0,
    tempOpt: 18.0,
    phMin: 5.0,
    phMax: 6.5,
    ecMax: 1700,
    depthCm: '8 - 12 cm',
    description: 'Tolera suelos ligeramente ácidos; requiere suelo suelto y buena aireación.'
  },
  trigo: {
    id: 'trigo',
    name: 'Trigo / Cereales de Invierno',
    emoji: '🌾',
    tempMin: 4.0,
    tempOpt: 16.0,
    phMin: 6.0,
    phMax: 7.5,
    ecMax: 2500,
    depthCm: '3 - 5 cm',
    description: 'Resistente al frío; muy sensible a acidez extrema (toxicidad de Aluminio).'
  },
  lechuga: {
    id: 'lechuga',
    name: 'Lechuga / Hortalizas de Hoja',
    emoji: '🥬',
    tempMin: 10.0,
    tempOpt: 18.0,
    phMin: 6.0,
    phMax: 7.0,
    ecMax: 1400,
    depthCm: '0.5 - 1 cm',
    description: 'Raíz superficial; muy sensible a salinidad y deshidratación de los primeros 5 cm.'
  },
  palto: {
    id: 'palto',
    name: 'Palto / Aguacate (Hass)',
    emoji: '🥑',
    tempMin: 14.0,
    tempOpt: 25.0,
    phMin: 5.5,
    phMax: 6.8,
    ecMax: 1200,
    depthCm: 'Muestreo a 20-40 cm',
    description: 'Extremadamente sensible a asfixia radicular (Phytophthora) y cloruros/salinidad.'
  },
  vid: {
    id: 'vid',
    name: 'Vid Vinífera / Mesa',
    emoji: '🍇',
    tempMin: 10.0,
    tempOpt: 22.0,
    phMin: 6.0,
    phMax: 7.8,
    ecMax: 2000,
    depthCm: 'Muestreo a 30-50 cm',
    description: 'Tolera suelos calcáreos y moderadamente salinos; requiere control de vigor.'
  },
  arandano: {
    id: 'arandano',
    name: 'Arándano (Berries)',
    emoji: '🫐',
    tempMin: 12.0,
    tempOpt: 20.0,
    phMin: 4.2,
    phMax: 5.2,
    ecMax: 1000,
    depthCm: 'Muestreo a 15-30 cm',
    description: 'Requiere suelo ácido específico (pH 4.5); el pH alto genera clorosis férrica.'
  }
};

export const SOIL_TEXTURES: Record<SoilTextureId, SoilTexture> = {
  arenoso: {
    name: 'Arenoso (Suelto / Ligero)',
    pmp: 6.0,
    ur: 10.0,
    cc: 14.0,
    sat: 30.0
  },
  franco: {
    name: 'Franco (Equilibrado / Ideal)',
    pmp: 12.0,
    ur: 20.0,
    cc: 28.0,
    sat: 45.0
  },
  franco_arcilloso: {
    name: 'Franco-Arcilloso (Pesado)',
    pmp: 16.0,
    ur: 25.0,
    cc: 35.0,
    sat: 52.0
  },
  arcilloso: {
    name: 'Arcilloso (Muy pesado / Drenaje lento)',
    pmp: 20.0,
    ur: 30.0,
    cc: 42.0,
    sat: 60.0
  }
};

/**
 * Umbral de conductividad sobre el cual la calibración de fábrica de la sonda deja
 * de ser válida y la estimación de NPK se contamina con iones no nutritivos.
 * 1.000 µS/cm = 1,0 dS/m.
 */
export const EC_UMBRAL_CONFIANZA_NPK = 1000;

/** Lecturas de NPK (mg/kg) a partir de las cuales el valor se considera "alto". */

/**
 * Regla de veto cruzado por salinidad.
 *
 * Las sondas de bajo costo no miden N, P y K con electrodos ion-selectivos: miden
 * conductividad eléctrica y derivan los tres valores por regresión. El sensor no
 * distingue el nitrógeno del sodio, el calcio o el hierro, de modo que en un suelo
 * salino una lectura alta de NPK puede reflejar sal y no fertilidad.
 *
 * Cuando la EC supera el umbral de validez de la calibración y además el NPK reporta
 * valores altos, se degrada la confianza de las tres lecturas en lugar de presentarlas
 * como si fuesen medidas directas.
 *
 * No incrementa severityScore a propósito: la salinidad ya penaliza el veredicto en la
 * regla de EC, y contarla dos veces sesgaría la clasificación. Esto advierte sobre la validez
 * del dato, no añade un diagnóstico agronómico.
 */
export function vetoCruzadoSalinidad(
  ec: number,
  _nitrogen: number,
  _phosphorus: number,
  _potassium: number
): { activo: boolean; nota: string } {
  if (ec <= EC_UMBRAL_CONFIANZA_NPK) {
    return { activo: false, nota: '' };
  }

  return {
    activo: true,
    nota:
      `Lectura poco confiable: con ${ec} µS/cm de conductividad, la sonda puede estar ` +
      'leyendo sales (sodio, calcio) y reportarlas como nutrientes. Tómelo como indicio, no como dato.'
  };
}

export function evaluateAgronomicStatus(
  sensorData: SoilMeasurement, 
  cropId: CropId = 'maiz', 
  textureId: SoilTextureId = 'franco'
): AgronomicEvaluation {
  const crop = CROPS_DB[cropId] || CROPS_DB.maiz;
  const texture = SOIL_TEXTURES[textureId] || SOIL_TEXTURES.franco;

  const {
    vwc = 25.0,
    temp = 18.5,
    ec = 450,
    ph = 6.5,
    nitrogen = 45,
    phosphorus = 30,
    potassium = 80,
    lux = 65000
  } = sensorData;

  const alerts: AgronomicAlert[] = [];
  let severityScore = 0;

  // 1. Temperatura
  let tempStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  let tempMessage = `Temperatura adecuada (${temp.toFixed(1)}°C ≥ ${crop.tempMin}°C mín)`;
  if (temp < crop.tempMin) {
    tempStatus = 'CRITICAL';
    severityScore += 2;
    tempMessage = `Suelo frío (${temp.toFixed(1)}°C < ${crop.tempMin}°C mín).`;
    alerts.push({
      type: 'danger',
      param: 'Temperatura',
      title: '❄️ Suelo Frío para Germinación',
      action: `No sembrar hoy. La semilla entrará en letargo y se pudrirá. Esperar ${Math.round((crop.tempMin - temp) * 2 + 3)} días con sol.`
    });
  } else if (temp < crop.tempMin + 2.0) {
    // Banda de aviso: justo sobre el cero vegetativo la germinación es lenta y
    // despareja, lo que alarga la exposición de la semilla a hongos del suelo.
    // Sin este tramo, 11,9 °C y 4,0 °C recibían el mismo veredicto.
    tempStatus = 'WARNING';
    severityScore += 1;
    tempMessage = `Temperatura en el límite (${temp.toFixed(1)}°C, mínimo ${crop.tempMin}°C)`;
    alerts.push({
      type: 'warning',
      param: 'Temperatura',
      title: '🌡️ Temperatura Marginal para Germinación',
      action: 'Germinación lenta y despareja. Conviene esperar 2 o 3 días de sol, o sembrar algo más superficial para aprovechar el calor de los primeros centímetros.'
    });
  }

  // 2. pH
  let phStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  let phMessage = `pH equilibrado (${ph.toFixed(1)}) dentro del rango (${crop.phMin} - ${crop.phMax})`;
  if (ph < crop.phMin) {
    if (ph < 5.2 && cropId !== 'arandano') {
      phStatus = 'CRITICAL';
      severityScore += 2;
      phMessage = `Suelo fuertemente ácido (pH ${ph.toFixed(1)})`;
      alerts.push({
        type: 'danger',
        param: 'pH',
        title: '🧪 Suelo Ácido: Fósforo Bloqueado',
        action: 'Confirmar pH en laboratorio y solicitar requerimiento de encalado (capacidad tampón, profundidad y calidad de enmienda). Esta lectura no permite calcular kg/ha de cal.'
      });
    } else {
      phStatus = 'WARNING';
      severityScore += 1;
      phMessage = `Suelo ligeramente ácido (pH ${ph.toFixed(1)})`;
      alerts.push({
        type: 'warning',
        param: 'pH',
        title: '🧪 Ligera Acidez de Suelo',
        action: 'Confirmar pH y requerimientos del cultivo con análisis de suelo antes de aplicar enmiendas.'
      });
    }
  } else if (ph > crop.phMax) {
    phStatus = 'WARNING';
    severityScore += 1;
    phMessage = `Suelo alcalino / calcáreo (pH ${ph.toFixed(1)})`;
    alerts.push({
      type: 'warning',
      param: 'pH',
      title: '🧂 Suelo Alcalino: Riesgo de Clorosis Férrica',
      action: 'Confirmar pH y alcalinidad en laboratorio; solicitar asesoría antes de aplicar azufre u otras enmiendas.'
    });
  }

  // 3. Salinidad (EC)
  let ecStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  let ecMessage = `Conductividad óptima (${ec} µS/cm ≤ ${crop.ecMax} µS/cm)`;
  if (ec > crop.ecMax) {
    if (ec > crop.ecMax * 1.5) {
      ecStatus = 'CRITICAL';
      severityScore += 3;
      ecMessage = `Salinidad crítica (${ec} µS/cm). Quema radicular asegurada.`;
      alerts.push({
        type: 'danger',
        param: 'Salinidad (EC)',
        title: '⚠️ Exceso de Sales / Salinidad Tóxica',
        action: 'Confirmar salinidad y calidad del agua. Evaluar drenaje y asesoría agronómica antes de diseñar un lavado; no aplicar una fracción fija con esta lectura.'
      });
    } else {
      ecStatus = 'WARNING';
      severityScore += 1;
      ecMessage = `Salinidad moderada (${ec} µS/cm).`;
      alerts.push({
        type: 'warning',
        param: 'Salinidad (EC)',
        title: '⚠️ Salinidad Moderada',
        action: 'Evitar fertilizantes con alto índice salino y mantener humedad constante.'
      });
    }
  }

  // 3b. Veto cruzado: la salinidad contamina la estimación de NPK derivada de EC
  const vetoNpk = vetoCruzadoSalinidad(ec, nitrogen, phosphorus, potassium);
  if (vetoNpk.activo) {
    alerts.push({
      type: 'warning',
      param: 'Nutrientes (N-P-K)',
      title: '⚠️ Posible Falso Positivo por Salinidad',
      action:
        'La sonda estima los nutrientes a partir de la conductividad y no distingue el ' +
        'nitrógeno del sodio. Con esta salinidad, los valores altos de N-P-K pueden ser sal. ' +
        'Confirme nutrientes y salinidad en laboratorio antes de decidir fertilización o lavado.'
    });
  }

  // 4. Humedad (VWC)
  let vwcStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  let vwcMessage = `Humedad óptima (${vwc.toFixed(1)}% VWC en capacidad de campo)`;
  if (vwc < texture.pmp) {
    vwcStatus = 'CRITICAL';
    severityScore += 2;
    vwcMessage = `Suelo seco bajo Punto de Marchitez (${vwc.toFixed(1)}% < ${texture.pmp}%)`;
    alerts.push({
      type: 'danger',
      param: 'Humedad',
      title: '🏜️ Déficit Hídrico Severo',
      action: 'Riego urgente indispensable previo a la siembra. La semilla no alcanzará a hidratarse para brotar.'
    });
  } else if (vwc >= texture.sat) {
    vwcStatus = 'CRITICAL';
    severityScore += 2;
    vwcMessage = `Suelo saturado / encharcado (${vwc.toFixed(1)}% VWC)`;
    alerts.push({
      type: 'danger',
      param: 'Humedad',
      title: '🌊 Asfixia Radicular por Exceso de Agua',
      action: 'Esperar 48 a 72 horas a que el suelo drene hasta Capacidad de Campo.'
    });
  } else if (vwc < texture.ur) {
    // Umbral de riego: el suelo aún no está en marchitez, pero ya entró en la
    // franja donde la planta empieza a gastar energía en extraer agua.
    // `texture.ur` estaba definido en SOIL_TEXTURES y no se usaba en ninguna regla.
    vwcStatus = 'WARNING';
    severityScore += 1;
    vwcMessage = `Humedad bajo el umbral de riego (${vwc.toFixed(1)}% < ${texture.ur}%)`;
    alerts.push({
      type: 'warning',
      param: 'Humedad',
      title: '💧 Umbral de Riego Alcanzado',
      action: `Programar riego en las próximas 24 a 48 horas. Por debajo de ${texture.ur}% la planta gasta energía en extraer agua en vez de crecer.`
    });
  } else if (vwc > texture.cc) {
    // Entre capacidad de campo y saturación el suelo drena, pero el laboreo
    // compacta y las raíces ya empiezan a sufrir falta de oxígeno.
    vwcStatus = 'WARNING';
    severityScore += 1;
    vwcMessage = `Humedad sobre Capacidad de Campo (${vwc.toFixed(1)}% > ${texture.cc}%)`;
    alerts.push({
      type: 'warning',
      param: 'Humedad',
      title: '💦 Suelo por Encima de Capacidad de Campo',
      action: 'Suspender el riego y no laborear todavía: el suelo húmedo se compacta al pasar maquinaria y la raíz dispone de poco oxígeno.'
    });
  }

  // 5. Radiación Solar / Luz
  let lightMsg = 'Radiación normal';
  if (lux > 80000) {
    lightMsg = `Alta radiación (${(lux / 1000).toFixed(0)}k Lux) - Evaporación superficial acelerada`;
  }

  // Veredicto General
  let verdict: Verdict = 'GREEN';
  let verdictTitle = '🟢 APTO PARA SEMBRAR';
  let verdictSummary = 'El suelo presenta condiciones ideales de humedad, temperatura, pH y salinidad.';

  if (severityScore >= 2 || tempStatus === 'CRITICAL' || phStatus === 'CRITICAL' || ecStatus === 'CRITICAL' || vwcStatus === 'CRITICAL') {
    verdict = 'RED';
    verdictTitle = '🔴 NO APTO PARA SEMBRAR';
    verdictSummary = 'Condiciones desfavorables. Se requiere enmienda o espera para no perder la inversión en semillas.';
  } else if (severityScore === 1 || tempStatus === 'WARNING' || phStatus === 'WARNING' || ecStatus === 'WARNING' || vwcStatus === 'WARNING') {
    verdict = 'AMBER';
    verdictTitle = '🟡 PRECAUCIÓN / CORREGIR ANTES DE SEMBRAR';
    verdictSummary = 'El suelo es apto con precauciones específicas. Se recomienda aplicar las correcciones sugeridas.';
  }

  // N, P y K son siempre estimaciones derivadas de la conductividad, nunca medidas directas.
  const npkMeta = {
    derived: true,
    confidence: 'LOW' as const,
    confidenceNote: vetoNpk.activo
      ? vetoNpk.nota
      : 'Registro NPK sin validación química independiente. Una CE baja no acredita exactitud ni permite dosificar fertilizantes.'
  };

  return {
    verdict,
    verdictTitle,
    verdictSummary,
    crop,
    texture,
    alerts,
    metrics: {
      vwc: { val: vwc, unit: '%', status: vwcStatus, msg: vwcMessage },
      temp: { val: temp, unit: '°C', status: tempStatus, msg: tempMessage },
      ec: { val: ec, unit: 'µS/cm', status: ecStatus, msg: ecMessage },
      ph: { val: ph, unit: 'pH', status: phStatus, msg: phMessage },
      nitrogen: { val: nitrogen, unit: 'registro', status: 'WARNING', msg: 'Sin validar; no diagnostica nutrición', ...npkMeta },
      phosphorus: { val: phosphorus, unit: 'registro', status: 'WARNING', msg: 'Sin validar; no diagnostica nutrición', ...npkMeta },
      potassium: { val: potassium, unit: 'registro', status: 'WARNING', msg: 'Sin validar; no diagnostica nutrición', ...npkMeta },
      lux: { val: lux, unit: 'Lux', status: 'OPTIMAL', msg: lightMsg }
    }
  };
}
