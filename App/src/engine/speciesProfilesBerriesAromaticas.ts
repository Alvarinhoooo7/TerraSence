/** Perfiles de berries (salvo arándano y frutilla, en speciesProfilesFrutales.ts) y aromáticas (salvo perejil, en speciesProfilesHortalizas.ts) (TASK ES8.C). Contrato y fuentes compartidas: speciesRuleKit.ts. */
import type { PhenologicalStage } from '../types/app';
import type { SpeciesCriterion, SpeciesCriterionEvidence, SpeciesPhCriterion, SpeciesRuleProfile, SpeciesThreshold } from './speciesRuleKit';
import { warmSoilRootAnalog, ALL_STAGES, FROST, GROUND_COLDER, GROUND_COLDER_EN, GROWING, INIA_1998_FROST, RAIN_RULE, RAIN_RULE_EN, UARK_PARSLEY, airMax, airMin, analog, analogPh, analogSalt, analogWater, annual, celsius, decimal, fao56Water, fromF, harvestFreeze, inia165, perennial, readingBelow, salt, sdsu, umaineFreeze, umdVegetable, weatherEvent } from './speciesRuleKit';

// --- Fuentes nuevas del lote C (TASK ES8.C, S180–S239): ver MOTOR_AGRONOMICO.md ---------

const CONSULTED = '2026-10-19';
const GROUND = `${GROUND_COLDER.charAt(0).toLowerCase()}${GROUND_COLDER.slice(1)}`;
const GROUND_EN = `${GROUND_COLDER_EN.charAt(0).toLowerCase()}${GROUND_COLDER_EN.slice(1)}`;
const NO_FROST_FIGURE = 'La fuente no da una temperatura: se usa 0 °C como definición de helada.';
const NO_FROST_FIGURE_EN = 'The source gives no temperature: 0 °C is used as the definition of frost.';

const INIA_372 = {
  institution: 'INIA e INDAP',
  title: 'Manual de manejo agronómico del frambueso (Boletín INIA N° 372, C. G. Morales y otros, 2017)',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/1237ffdb-2623-4b6f-ae8b-beccafc46e1d/content',
  consultedAt: CONSULTED,
};

const INIA_372_PH: SpeciesCriterionEvidence = {
  ...INIA_372,
  section: 'Cuadro 7.2 «Características químicas de suelo adecuadas para un huerto de frambueso»',
  originalValue: 'pH (agua 1:2,5): 6,0 - 7,0 en suelos franco-arenosa a franco-limosa; 5,8 - 6,8 en suelos franco-limosa a franco-arcillosa.',
};

const INIA_372_FROST: SpeciesCriterionEvidence = {
  ...INIA_372,
  section: 'Capítulo 3, requerimientos de clima, p. 24',
  originalValue: 'Durante el período floral el frambueso es sensible a las bajas temperaturas, pudiendo tolerar en estado fenológico de botón cerrado -1,3° C, en flor abierta -0,7° C y en fruto recién formado -0,7° C.',
};

const INIA_372_BOTRYTIS: SpeciesCriterionEvidence = {
  ...INIA_372,
  section: '9.2 «Pudrición gris (Botrytis cinerea)», pp. 55–56',
  originalValue: 'Descripción: es la principal enfermedad de la fruta, aunque también puede atacar a las flores, hojas y tallos. A la salida de invierno el hongo produce numerosas conidias que son diseminadas por las gotas de lluvia y el viento. Control: [...] control químico al momento de la floración y después de lluvias.',
};

const PSU_RASPBERRY_FROST: SpeciesCriterionEvidence = {
  institution: 'Penn State Extension',
  title: 'Frost and Freeze Damage on Berry Crops (K. Demchak, actualizado en 2026)',
  url: 'https://extension.psu.edu/frost-and-freeze-damage-on-berry-crops',
  section: '«Critical Temperatures for Raspberry Blossoms»',
  consultedAt: CONSULTED,
  originalValue: 'More recently, we have had frost damage to open raspberry blossoms, and this occurred when temperatures were barely below freezing, which makes me think that the critical temperature is in the 30–32°F range.',
};

const NCSU_CANEBERRY = {
  institution: 'NC State Extension (North Carolina State University)',
  consultedAt: CONSULTED,
};

const NCSU_CANEBERRY_PH: SpeciesCriterionEvidence = {
  ...NCSU_CANEBERRY,
  title: 'Southeast Regional Caneberry Production Guide, capítulo 11 «Fertility Management»',
  url: 'https://content.ces.ncsu.edu/southeast-regional-caneberry-production-guide/fertility-management',
  section: 'Preparación del suelo antes de plantar',
  originalValue: 'If the soil pH is below optimum pH from 6.0 to 6.5, lime must be applied in the fall before planting to allow sufficient time for the lime to react with the soil.',
};

const NCSU_BLACKBERRY_FROST: SpeciesCriterionEvidence = {
  ...NCSU_CANEBERRY,
  title: 'Southeast Regional Caneberry Production Guide, capítulo 5 «Plant Growth»',
  url: 'https://content.ces.ncsu.edu/southeast-regional-caneberry-production-guide/plant-growth',
  section: 'Daño por frío en yemas florales de mora',
  originalValue: 'Floral buds in all stages are susceptible to cold injury. Studies conducted in growth chambers have shown that all stages (tight bud, popcorn, and open blossom) blackberry flowers are killed at 27°F.',
};

/**
 * La guía de zarzamoras de NC State no tiene capítulo de enfermedades: sus capítulos van de
 * cultivares a inocuidad, y lo más cercano es «Integrated Pest Management and Pollination». El
 * criterio pasa a la ficha de UC IPM dedicada a esta enfermedad en zarzamora y frambuesa.
 */
const UCIPM_CANEBERRY_BOTRYTIS: SpeciesCriterionEvidence = {
  institution: 'University of California Statewide IPM Program (UC IPM)',
  title: 'Agriculture: Caneberries Pest Management Guidelines — Botrytis Fruit Rot',
  url: 'https://ipm.ucanr.edu/agriculture/caneberries/botrytis-fruit-rot/',
  section: '«Comments on the Disease» y «Symptoms and Signs»',
  consultedAt: '2026-11-10',
  originalValue: 'Botrytis fruit rot occurs under cool, wet conditions. The pathogen requires free water for sclerotial germination, spore germination, and infection. Physical damage to the fruit increases disease incidence, especially during the rainy season. Conidia are dispersed by wind, rain, and overhead irrigation. Infections generally remain dormant until fruit is nearly ripe or after harvest.',
};

const UMASS_CRANBERRY_PH: SpeciesCriterionEvidence = {
  institution: 'University of Massachusetts Amherst, Cranberry Station',
  title: 'Cranberry Chart Book — Management Guide for Massachusetts, Nutrition Management',
  url: 'https://www.umass.edu/agriculture-food-environment/cranberry/publications/cranberry-chart-book',
  section: '«Soil pH»',
  consultedAt: CONSULTED,
  originalValue: 'Cranberries require acidic soils with an optimum pH between 4.0 and 5.0 (acceptable up to 5.5).',
};

const UMASS_CRANBERRY_SPRING: SpeciesCriterionEvidence = {
  institution: 'University of Massachusetts Amherst, Cranberry Station',
  title: 'Frost Protection Guide (1998)',
  url: 'https://www.umass.edu/agriculture-food-environment/cranberry/fact-sheets/frost-protection-guide-1998',
  section: 'Tolerancia a heladas de primavera y verano',
  consultedAt: CONSULTED,
  originalValue: 'From the roughneck stage (>1/2 inch new growth) onward, temperatures below 30°F will cause damage to young cranberry leaves and flowers. Newly formed green berries are also sensitive. Flowers and green fruit are sensitive to temperatures below 30°F.',
};

const UMASS_CRANBERRY_FRUIT: SpeciesCriterionEvidence = {
  institution: 'University of Massachusetts Amherst, Cranberry Station',
  title: 'Frost Tolerances of Cranberry Fruit (2019)',
  url: 'https://www.umass.edu/agriculture-food-environment/cranberry/fact-sheets/frost-tolerances-of-cranberry-fruit-2019',
  section: 'Tolerancia de la fruta según su color',
  consultedAt: CONSULTED,
  originalValue: 'Summer – 30°F tolerance. White to light blush fruit – 28°F tolerance. Deep blush on exposed fruit surface – 27°F tolerance. Deep blush over entire fruit – 26°F tolerance. Red – 25°F tolerance.',
};

const BC_RIBES_PH: SpeciesCriterionEvidence = {
  institution: 'Gobierno de Columbia Británica (Canadá), Ministerio de Agricultura',
  title: 'Currant and gooseberry production guide',
  url: 'https://www2.gov.bc.ca/gov/content/industry/agriculture-seafood/animals-and-crops/crop-production/berries/berry-production-guides/currant-gooseberry',
  section: '«Site selection» y «pH»',
  consultedAt: CONSULTED,
  originalValue: 'Soil should be slightly acidic with a pH range of 5.5 to 6.5. Check and adjust soil pH before planting and every 3 to 4 years after planting. The optimum pH is 5.5 to 6.5. If pH is below 5.5 lime should be applied and incorporated well before planting.',
};

const UTALCA_MAQUI: SpeciesCriterionEvidence = {
  institution: 'Universidad de Talca (presentación en el seminario de productos forestales no madereros de INFOR, 2018)',
  title: 'Maqui: experiencias en domesticación desde la Región del Maule (B. González)',
  url: 'https://www.infor.cl/images/pdf/Seminario_PFNM_2018/Maqui_Experiencias_en_domesticaci%C3%B3n_desde_la_Regi%C3%B3n_del_Maule.pdf',
  section: '«Requerimientos básicos para un cultivo de maqui exitoso», lámina 4',
  consultedAt: CONSULTED,
  originalValue: 'Requerimientos básicos para un cultivo de maqui exitoso: variedad de alta producción frutal; requerimiento de polinizantes; suelos con buen drenaje; sensibles a las heladas en época productiva; disponibilidad hídrica, especialmente en etapa productiva.',
};

const INFOR_MAQUI_SOIL: SpeciesCriterionEvidence = {
  institution: 'INFOR (Instituto Forestal de Chile)',
  title: 'Monografía de Maqui: Aristotelia chilensis (Mol.) Stuntz (Programa de Productos Forestales No Madereros, INFOR)',
  url: 'https://bibliotecadigital.infor.cl/handle/20.500.12220/20856',
  section: '«Requerimientos edáficos»',
  consultedAt: CONSULTED,
  originalValue: 'Se desarrolla preferentemente en suelos profundos, húmedos, bien drenados y ligeramente ácidos, con pH óptimo entre 5,3 y 6,5 (rango tolerado de 5,0 a 7,0).',
};

const INIA_CALAFATE_SOIL: SpeciesCriterionEvidence = {
  institution: 'INIA Kampenaike',
  title: 'Antecedentes para el manejo y domesticación del calafate (Berberis microphylla G. Forst.) en Magallanes (Boletín INIA)',
  url: 'https://biblioteca.inia.cl/handle/20.500.14001/3560',
  section: '«Características de suelo en poblaciones naturales y ensayos»',
  consultedAt: CONSULTED,
  originalValue: 'Crece en suelos moderadamente ácidos a neutros, con un rango de pH óptimo de 5,5 a 6,8 (tolerando desde 5,0 hasta 7,2).',
};

const pfaf = (latin: string, originalValue: string): SpeciesCriterionEvidence => ({
  institution: 'Plants For A Future (PFAF)',
  title: `${latin} (ficha de la especie)`,
  url: `https://pfaf.org/user/Plant.aspx?LatinName=${latin.replace(' ', '+')}`,
  section: 'Rusticidad («hardiness») y cultivo',
  consultedAt: CONSULTED,
  originalValue,
});

const PFAF_MAQUI = pfaf('Aristotelia chilensis', 'It is hardy to UK zone 8 and is frost tender. If the plants are cut back by winter frosts, they normally put up a crowd of vigorous shoots in the spring.');
const PFAF_UGNI = pfaf('Ugni molinae', 'It is hardy to UK zone 8 and is frost tender. It is only hardy in the milder parts of Britain, tolerating temperatures down to about -10°c when fully dormant. The young growth in spring can be damaged by late frosts.');
const PFAF_CALAFATE = pfaf('Berberis buxifolia', 'It is hardy to UK zone 5 and is not frost tender. Plants are hardy to about -15°c, but they can be deciduous in cold winters.');
const PFAF_MICHAY = pfaf('Berberis darwinii', 'It is hardy to UK zone 7 and is not frost tender. A very ornamental plant, it is hardy to about -15°c.');
const PFAF_SAUCO = pfaf('Sambucus nigra', 'It is hardy to UK zone 5 and is not frost tender.');

const FIA_MURTILLA: SpeciesCriterionEvidence = {
  institution: 'FIA (Fundación para la Innovación Agraria) e INIA',
  title: 'Manual técnico de producción de la murtilla (Ugni molinae): «La gran promesa de la fruticultura chilena» (resumen en OPIA, 2017)',
  url: 'https://opia.fia.cl/601/w3-article-81742.html',
  section: '«La planta» y recomendaciones de plantación',
  consultedAt: CONSULTED,
  originalValue: 'Los análisis de muestras sacadas en 36 sitios prospectados demostraron que crece en forma natural en suelos marginales y de baja fertilidad [...] y con un pH que varía de 5,6 a 6,0. Las variedades de murtilla INIA son recomendadas para establecer plantaciones [...] en zonas libres o de baja ocurrencia de heladas y con disponibilidad de riego.',
};

const FIA_MOSQUETA_SUELO: SpeciesCriterionEvidence = {
  institution: 'FIA (Fundación para la Innovación Agraria)',
  title: 'Resultados y lecciones en cultivo de rosa mosqueta. Proyecto de innovación en la VIII Región del Biobío (Serie Experiencias de Innovación N° 20, 2008)',
  url: 'https://opia.fia.cl/601/articles-75533_archivo_01.pdf',
  section: 'Anexo 1 «Antecedentes del cultivo de rosa mosqueta», 1. Requerimiento de clima y suelo',
  consultedAt: CONSULTED,
  originalValue: 'Se desarrolla bien en suelos delgados, de 30 cm de profundidad y permeables, pobres, de pH 6 a 6,5; la producción y calidad del fruto mejora si en el suelo existe bastante materia orgánica, nitrógeno y fósforo.',
};

const FIA_MOSQUETA_FRUTO: SpeciesCriterionEvidence = {
  institution: 'FIA (Fundación para la Innovación Agraria)',
  title: 'Rosa mosqueta: cuaderno para recolectoras y recolectores (Serie Cuadernos para la Innovación, Buenas Prácticas de Recolección Sustentable, 2018)',
  url: 'https://www.fia.cl/wp-content/uploads/2018/04/Rosa-Mosqueta.pdf',
  section: 'Ecología del fruto, p. 9',
  consultedAt: CONSULTED,
  originalValue: 'Los frutos maduros se mantienen adheridos a la planta después de su completa madurez. Tras las primeras heladas, el fruto se ablanda y comienza a caer.',
};

const UVM_ELDERBERRY_PH: SpeciesCriterionEvidence = {
  institution: 'University of Vermont Extension, Center for Sustainable Agriculture',
  title: 'Growing Elderberries: A Production Manual and Enterprise Viability Guide for Vermont and the Northeast (2016)',
  url: 'https://www.uvm.edu/d10-files/documents/2025-02/ElderberryGuideComplete.pdf',
  section: '«Fertility Management», p. 17',
  consultedAt: CONSULTED,
  originalValue: 'If necessary, adjust for pH, phosphorous and potassium based on recommendations from the soil test. Adjust the pH level to 5.5 to 6.5; lime is most effective for adjusting pH.',
};

const MU_ELDERBERRY_FROST: SpeciesCriterionEvidence = {
  institution: 'University of Missouri Center for Agroforestry',
  title: 'Growing and Marketing Elderberries in Missouri (AF1016, P. L. Byers, A. L. Thomas y otros, 2014)',
  url: 'https://mastergardener.osu.edu/sites/mgv/files/imce/MISC/Resources/HLL-HHH/2014GrowingElderberryGuide%20(1).pdf',
  section: 'Elección del sitio y preparación del suelo',
  consultedAt: CONSULTED,
  originalValue: 'Adjust pH level to 5.5-6.5, phosphorus level to 50 lbs/acre, and potassium level to 200-300 lbs/acre. Although elderberry tolerates cold temperatures following bud break, it is best to select sites that are elevated relative to surrounding land to reduce the risk of damage from spring frost.',
};

const SDSU_BASIL: SpeciesCriterionEvidence = {
  institution: 'South Dakota State University Extension',
  title: 'Fall Frost Tolerance of Common Vegetables (R. Burrows, actualizado en 2023)',
  url: 'https://extension.sdstate.edu/fall-frost-tolerance-common-vegetables',
  section: 'Introducción, sensibilidad al frío de cultivos de clima cálido',
  consultedAt: CONSULTED,
  originalValue: 'Crops that came from warmer parts of the world cannot tolerate even a light frost, and may even begin to suffer at temperatures below 50 degrees Fahrenheit. Basil is an extreme example of this, as the leaves can turn black when the temperatures dip into the 40s.',
};

const UCIPM_OREGANO: SpeciesCriterionEvidence = {
  institution: 'University of California Statewide IPM Program (UC IPM)',
  title: 'Cultural Tips for Growing Oregano',
  url: 'https://ipm.ucanr.edu/home-and-landscape/cultural-tips-for-growing-oregano/',
  section: 'Suelo, plantación y rusticidad',
  consultedAt: CONSULTED,
  originalValue: 'The soil should be kept at a pH level of 6.0 to 6.5. Plant seeds or transplants in ground when the risk of spring frost has passed. Once established, oregano is hardy and can tolerate frost.',
};

const BC_RIBES_RAIN: SpeciesCriterionEvidence = {
  institution: 'Gobierno de Columbia Británica (Canadá), Ministerio de Agricultura',
  title: 'Currant and gooseberry production guide',
  url: 'https://www2.gov.bc.ca/gov/content/industry/agriculture-seafood/animals-and-crops/crop-production/berries/berry-production-guides/currant-gooseberry',
  section: '«Harvesting and handling» y «Botrytis fruit rot»',
  consultedAt: CONSULTED,
  originalValue: 'Rain near or during harvest causes mature gooseberry and currant berries to split and increases Botrytis fruit rot; harvest berries when dry.',
};

const UMASS_CRANBERRY_POLLINATION_RAIN: SpeciesCriterionEvidence = {
  institution: 'University of Massachusetts Amherst, Cranberry Station',
  title: 'Cranberry Chart Book — Pollination and Bloom Management',
  url: 'https://www.umass.edu/agriculture-food-environment/cranberry/publications/cranberry-chart-book',
  section: '«Pollination»',
  consultedAt: CONSULTED,
  originalValue: 'Rainy and cold weather during cranberry bloom reduces bee foraging activity and pollen transfer, lowering fruit set.',
};

const UMASS_CRANBERRY_ROOT_TEMP: SpeciesCriterionEvidence = {
  institution: 'University of Massachusetts Amherst, Cranberry Station',
  title: 'Cranberry Chart Book — Nutrition Management for Producing Bogs (C. J. DeMoranville, K. M. Ghantous y P. Jeranyama)',
  url: 'https://www.umass.edu/agriculture-food-environment/cranberry/cranberry-chart-book/nutrition-management-for-producing-bogs',
  section: '«NITROGEN (N)», oportunidad de la aplicación',
  consultedAt: '2026-11-10',
  originalValue: 'Plan nitrogen fertilizer applications based on soil type and soil temperature. For typical cranberry bogs (1-4% organic matter), applications of N should not be necessary early in the spring. From flood removal until soil temperatures exceed 55°F, adequate N should be available through biological processes (mineralization). COLD SOIL/AIR TEMPERATURES, particularly in the spring, will lessen or eliminate response of cranberry plants to fertilizer applications.',
};

const UCDAVIS_HERB_HARVEST_RAIN: SpeciesCriterionEvidence = {
  institution: 'University of California, Davis — Postharvest Research and Extension Center',
  title: 'Produce Facts Sheet: Herbs (Fresh Culinary) (M. Cantwell y M. S. Reid, actualizada en febrero de 2001)',
  url: 'https://postharvest.ucdavis.edu/produce-facts-sheets/herbs-fresh-culinary',
  section: '«Pathological Disorders»',
  consultedAt: '2026-11-10',
  originalValue: 'Bacterial soft-rots are caused by numerous bacteria species and result in a slimy breakdown of the infected tissue. Soft-rots may follow fungal infections. Trimming older leaves, rapid cooling and low temperature storage reduce development of bacterial soft-rots. Water spraying at retail may favor bacterial growth. Gray mold rot caused by Botrytis cinerea can occur commonly on basil and shiso.',
};

const berryRootTemp = (cropEs: string, cropEn: string) =>
  readingBelow(GROWING, 'temp', 'below', fromF(55), {
    severity: 'info',
    effect: `Suelo bajo 12,8 °C: ${cropEs} responde poco al fertilizante`,
    effectEn: `Soil below 12.8 °C: ${cropEn} responds little to fertilizer`,
    advice: `Con el suelo bajo 12,8 °C ${cropEs} aprovecha poco el nitrógeno que se aplique. Espera a que el suelo se temple antes de fertilizar.`,
    adviceEn: `With soil below 12.8 °C ${cropEn} makes little use of applied nitrogen. Wait until the soil warms before fertilizing.`,
    note: 'La Estación del Arándano Rojo de UMass indica planificar el nitrógeno según la temperatura del suelo: hasta que el suelo supera los 55 °F (12,8 °C) el nitrógeno disponible proviene de la mineralización, y el suelo frío reduce o anula la respuesta de la planta al fertilizante.',
    noteEn: 'The UMass Cranberry Station advises planning nitrogen by soil temperature: until the soil exceeds 55 °F (12.8 °C) available nitrogen comes from mineralization, and cold soil lessens or eliminates the plant\'s response to fertilizer.',
    limitations: 'La fuente es de manejo del arándano rojo en turbera y habla de la respuesta al fertilizante, no de un umbral de actividad radicular medido; se traslada al resto de los berries por semejanza de porte y profundidad de raíz. Lectura puntual a la profundidad de la sonda; la temperatura del suelo varía durante el día.',
    limitationsEn: 'The source covers cranberry bog management and speaks of fertilizer response, not a measured root-activity threshold; it is carried over to the other berries by similarity of habit and rooting depth. Single reading at probe depth; soil temperature varies during the day.',
    evidence: [UMASS_CRANBERRY_ROOT_TEMP],
  });

const berryHarvestRain = (cropEs: string, cropEn: string) =>
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: `Lluvia en cosecha: humedad libre en el fruto favorece pudriciones en ${cropEs}`,
    effectEn: `Rain at harvest: free moisture on berries favors decay in ${cropEn}`,
    advice: `Evita cosechar ${cropEs} bajo la lluvia o con las bayas mojadas: el agua libre sobre la fruta acelera el ablandamiento y el moho gris en poscosecha.`,
    adviceEn: `Avoid picking ${cropEn} in the rain or while berries are wet: free water on fruit speeds up softening and gray mold after harvest.`,
    note: 'Las guías de manejo de berries indican que la lluvia y la humedad libre sobre bayas maduras durante la cosecha favorecen la infección por Botrytis y el deterioro poscosecha.',
    noteEn: 'Berry management guides state that rain and free moisture on ripe berries during harvest favor Botrytis infection and postharvest decay.',
    limitations: `${RAIN_RULE} Recomendación preventiva de cosecha en seco; no diagnostica infección.`,
    limitationsEn: `${RAIN_RULE_EN} Preventive dry-harvest recommendation; it does not diagnose infection.`,
    evidence: [UCIPM_CANEBERRY_BOTRYTIS],
  });

const herbHarvestRain = (cropEs: string, cropEn: string) =>
  weatherEvent(['cosecha'], 'rain', {
    severity: 'info',
    effect: `Lluvia en cosecha: ${cropEs} mojada entra con más humedad al empaque`,
    effectEn: `Rain at harvest: wet ${cropEn} goes into packing with more moisture`,
    advice: `Si puedes, espera a que las plantas se sequen antes de cortar ${cropEs} y enfría pronto lo cosechado: la pudrición blanda avanza menos en frío.`,
    adviceEn: `If you can, wait until the plants dry before cutting ${cropEn} and cool the harvest promptly: soft rot advances less in the cold.`,
    note: 'La ficha de poscosecha de hierbas de UC Davis documenta pudrición blanda bacteriana y moho gris por Botrytis, y que el agua aplicada sobre el producto favorece el crecimiento bacteriano; indica enfriar rápido y guardar en frío para contenerlas.',
    noteEn: 'The UC Davis postharvest sheet for herbs documents bacterial soft-rot and Botrytis gray mold, and that water applied on the produce favors bacterial growth; it advises rapid cooling and cold storage to limit them.',
    limitations: `${RAIN_RULE} La ficha no menciona la lluvia ni el corte con follaje mojado: habla del agua aplicada sobre el producto ya cosechado. Esperar a que seque es precaución de manejo de este equipo, no una indicación de la fuente.`,
    limitationsEn: `${RAIN_RULE_EN} Postharvest handling recommendation for fresh herbs.`,
    evidence: [UCDAVIS_HERB_HARVEST_RAIN],
  });

const ribesHarvestRain = (cropEs: string, cropEn: string) =>
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: `Lluvia en cosecha: riesgo de partidura y pudrición gris en ${cropEs}`,
    effectEn: `Rain at harvest: risk of berry splitting and gray mold in ${cropEn}`,
    advice: `La lluvia sobre fruta madura de ${cropEs} parte las bayas y acelera la pudrición. Cosecha cuando los arbustos estén secos.`,
    adviceEn: `Rain on ripe ${cropEn} berries causes fruit splitting and speeds up rot. Harvest when bushes are dry.`,
    note: 'La guía de Columbia Británica indica que la lluvia cerca o durante la cosecha parte las bayas maduras de grosella y zarzaparrilla y aumenta la pudrición gris, recomendando cosechar en seco.',
    noteEn: 'The British Columbia guide states that rain near or during harvest causes mature gooseberry and currant berries to split and increases gray mold, recommending dry harvesting.',
    limitations: `${RAIN_RULE} No diagnostica la enfermedad: sólo señala la condición meteorológica asociada.`,
    limitationsEn: `${RAIN_RULE_EN} It does not diagnose disease: it only flags the associated weather condition.`,
    evidence: [BC_RIBES_RAIN],
  });

// --- Constructores del lote -----------------------------------------------------------

type Text = { es: string; en: string };

/** pH con óptimo y límites tal como los da la fuente; `null` donde la fuente no fija un límite. */
const ph = (min: number, max: number, lowerLimit: number | null, upperLimit: number | null,
  note: Text, limitations: Text, evidence: SpeciesCriterionEvidence[]): SpeciesPhCriterion => ({
  kind: 'ph', state: 'enabled', stages: GROWING,
  optimum: { min, max }, lowerLimit, upperLimit,
  note: note.es, noteEn: note.en, limitations: limitations.es, limitationsEn: limitations.en, evidence,
});

/**
 * Especie que tolera la helada leve hasta `limit`: una helada dentro de ese margen es
 * información; bajo ese mínimo, sin tolerancia documentada, es advertencia.
 */
const toleratesDownTo = (stages: readonly PhenologicalStage[], limit: SpeciesThreshold, crop: Text,
  note: Text, limitations: Text, evidence: SpeciesCriterionEvidence[]): SpeciesCriterion[] => {
  const es = decimal(limit.value, 'es'), en = decimal(limit.value, 'en');
  return [
    airMin(stages, 'at_or_below', FROST, {
      severity: 'info',
      effect: 'Helada leve prevista, dentro de lo que tolera esta especie',
      effectEn: 'Light frost forecast, within what this species tolerates',
      advice: `${crop.es} resiste una helada leve, así que no debería dañarse. Revisa las plantas después de la helada.`,
      adviceEn: `${crop.en} withstands a light frost, so it should not be damaged. Check the plants after the frost.`,
      note: note.es, noteEn: note.en, limitations: limitations.es, limitationsEn: limitations.en, evidence,
    }),
    airMin(stages, 'below', limit, {
      severity: 'warning',
      effect: `Helada más fuerte de lo que este cultivo resiste (${es} °C)`,
      effectEn: `Frost harder than this crop withstands (${en} °C)`,
      advice: `Bajo ${es} °C este cultivo puede dañarse. Si puedes, protégelo esa noche o cosecha antes lo que ya esté listo.`,
      adviceEn: `Below ${en} °C this crop can be damaged. If you can, protect it that night or harvest what is ready beforehand.`,
      note: note.es, noteEn: note.en, limitations: limitations.es, limitationsEn: limitations.en, evidence,
    }),
  ];
};

const ribesPh = (crop: Text): SpeciesPhCriterion => ph(5.5, 6.5, 5.5, null,
  {
    es: `El pH óptimo para ${crop.es} es 5,5 a 6,5; la fuente indica encalar bajo 5,5.`,
    en: `The optimum pH for ${crop.en} is 5.5 to 6.5; the source indicates liming below 5.5.`,
  },
  {
    es: 'Guía de producción del Ministerio de Agricultura de Columbia Británica (Canadá) para grosellas y zarzaparrillas (currants y gooseberries), sin distinguir entre ellas; no fija un máximo.',
    en: 'Production guide of the British Columbia (Canada) Ministry of Agriculture for currants and gooseberries, without distinguishing between them; it sets no maximum.',
  },
  [BC_RIBES_PH]);

/** Rusticidad de la planta completa (PFAF): tolera la helada común y se advierte bajo su límite. */
const shrubHardiness = (crop: Text, limit: number, evidence: SpeciesCriterionEvidence, synonym: Text | null) =>
  toleratesDownTo(ALL_STAGES, celsius(limit), crop,
    {
      es: `PFAF clasifica esta especie como no sensible a la helada («not frost tender») y rústica hasta cerca de ${decimal(limit, 'es')} °C.`,
      en: `PFAF classifies this species as not frost tender and hardy to about ${decimal(limit, 'en')} °C.`,
    },
    {
      es: `Rusticidad de la planta completa según PFAF, una base de datos de plantas útiles; no distingue etapas: flores y frutos pueden dañarse con heladas menos intensas que la planta.${synonym ? ` ${synonym.es}` : ''}`,
      en: `Whole-plant hardiness according to PFAF, a database of useful plants; it does not distinguish stages: flowers and fruit can be damaged by milder frosts than the plant.${synonym ? ` ${synonym.en}` : ''}`,
    },
    [evidence]);

const BASIL_ANALOG = {
  es: 'Sin fuente propia para albahaca: se usa el criterio documentado para Perejil (Parsley), porque ambas son hierbas de hoja tierna cosechadas en verde y la tabla no tiene fila de albahaca.',
  en: 'No source of its own for basil: the documented criterion for Perejil (Parsley) is used, because both are tender-leaf herbs harvested green and the table has no basil row.',
};

const CHIVES_PH_ANALOG = {
  es: 'Sin fuente propia para ciboulette: se usa el criterio documentado para Cebollín (Green onion), porque ambas son alliums de hoja cosechados en verde y la tabla no tiene fila de ciboulette.',
  en: 'No source of its own for chives: the documented criterion for Cebollín (Green onion) is used, because both are leaf alliums harvested green and the table has no chives row.',
};

const PARSLEY_ANALOG = {
  es: 'Sin fuente propia para cilantro: se usa el criterio documentado para Perejil (Parsley), porque ambas son Apiáceas de estación fresca de las que se cosecha la hoja.',
  en: 'No source for coriander: the documented criterion for Perejil (Parsley) is used, because both are cool-season Apiaceae grown for their leaves.',
};

const MURTILLA_PH: SpeciesPhCriterion = ph(5.6, 6.0, null, null,
  {
    es: 'En su hábitat natural la murtilla crece en suelos de pH 5,6 a 6,0, según las muestras de INIA en 36 sitios.',
    en: 'In its natural habitat Chilean guava grows on soils of pH 5.6 to 6.0, according to INIA samples from 36 sites.',
  },
  {
    es: 'Es el rango donde la especie crece en forma silvestre, no un óptimo ensayado en huertos; la murtilla prospera en suelos pobres y ácidos, así que un valor fuera de este rango sólo orienta.',
    en: 'It is the range where the species grows in the wild, not an optimum tested in orchards; Chilean guava thrives on poor, acid soils, so a value outside this range is only guidance.',
  },
  [FIA_MURTILLA]);

const CALAFATE_PH: SpeciesPhCriterion = ph(5.5, 6.8, 5.0, 7.2,
  {
    es: 'El calafate crece en suelos moderadamente ácidos a neutros, con un pH óptimo de 5,5 a 6,8 y tolerancia de 5,0 a 7,2.',
    en: 'Calafate grows in moderately acidic to neutral soils, with an optimum pH of 5.5 to 6.8 and tolerance from 5.0 to 7.2.',
  },
  {
    es: 'Antecedentes de domesticación y suelos de poblaciones naturales de INIA Kampenaike en Magallanes.',
    en: 'Domestication and natural population soil records from INIA Kampenaike in Magallanes.',
  },
  [INIA_CALAFATE_SOIL]);

// --- Perfiles --------------------------------------------------------------------------

export const BERRY_AROMATIC_PROFILES: readonly SpeciesRuleProfile[] = [
  perennial('sp.frambuesa',
    ph(5.8, 7.0, null, null,
      {
        es: 'INIA indica como adecuado un pH de 6,0 a 7,0 en suelos franco-arenosos a franco-limosos y de 5,8 a 6,8 en suelos franco-limosos a franco-arcillosos.',
        en: 'INIA gives a suitable pH of 6.0 to 7.0 on sandy loam to silt loam soils and 5.8 to 6.8 on silt loam to clay loam soils.',
      },
      {
        es: 'Rango adecuado según la textura del suelo para huertos de frambueso en Chile; como la sonda no mide la textura, el óptimo es la unión de ambos rangos. La fuente no fija límites de daño fuera de él.',
        en: 'Suitable range by soil texture for Chilean raspberry orchards; since the probe does not measure texture, the optimum is the union of both ranges. The source sets no damage limits outside it.',
      },
      [INIA_372_PH]),
    airMin(['floracion'], 'below', celsius(-0.7), {
      severity: 'warning',
      effect: 'Helada bajo −0,7 °C en floración: daña la flor abierta del frambueso',
      effectEn: 'Frost below −0.7 °C during flowering injures open raspberry blossoms',
      advice: 'Bajo −0,7 °C se dañan las flores abiertas y los frutos recién formados, y baja la cosecha. Si puedes, protege las plantas esa noche.',
      adviceEn: 'Below −0.7 °C open flowers and newly formed fruit are damaged, and the harvest falls. If you can, protect the plants that night.',
      note: 'INIA indica que, en floración, el frambueso tolera −1,3 °C con el botón cerrado y −0,7 °C con la flor abierta y el fruto recién formado. Penn State observó daño en flores abiertas con temperaturas apenas bajo 0 °C.',
      noteEn: 'INIA states that during flowering raspberry tolerates −1.3 °C at closed bud and −0.7 °C at open bloom and newly formed fruit. Penn State observed damage to open blossoms at temperatures barely below 0 °C.',
      limitations: `La floración del frambueso es escalonada, así que una helada rara vez daña toda la cosecha; ${GROUND}`,
      limitationsEn: `Raspberry flowering is staggered, so a frost rarely damages the whole crop; ${GROUND_EN}`,
      evidence: [INIA_372_FROST, PSU_RASPBERRY_FROST],
    }),
    harvestFreeze('frambuesa', 'raspberry', 30.0, umaineFreeze('Raspberries: Temperature 31–32°F; Rel. humidity 90–95%; Approximate storage life 2–3 days; Freezing point 30.0°F.')),
    weatherEvent(['cosecha'], 'rain', {
      severity: 'warning',
      effect: 'Lluvia en cosecha: favorece la pudrición gris de la frambuesa',
      effectEn: 'Rain at harvest favors raspberry gray mold',
      advice: 'Con lluvia la fruta madura se pudre más (pudrición gris). Cosecha la fruta madura antes de la lluvia y revisa el huerto después.',
      adviceEn: 'Rain makes ripe fruit rot more (gray mold). Pick ripe fruit before the rain and check the planting afterwards.',
      note: 'INIA indica que la pudrición gris (Botrytis cinerea) es la principal enfermedad de la fruta del frambueso, que sus esporas se diseminan con las gotas de lluvia y que el control se aplica en floración y después de las lluvias.',
      noteEn: 'INIA states that gray mold (Botrytis cinerea) is the main fruit disease of raspberry, that its spores are spread by raindrops and that control is applied at bloom and after rains.',
      limitations: `${RAIN_RULE} No diagnostica la enfermedad: sólo señala la condición que la fuente asocia con ella.`,
      limitationsEn: `${RAIN_RULE_EN} It does not diagnose disease: it only flags the condition the source associates with it.`,
      evidence: [INIA_372_BOTRYTIS],
    }),
    salt('Raspberry (Rubus idaeus)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryRootTemp('el frambueso', 'raspberry')),

  perennial('sp.mora',
    ph(6.0, 6.5, 6.0, null,
      {
        es: 'El pH óptimo para mora es 6,0 a 6,5; la fuente indica encalar si está bajo ese rango.',
        en: 'The optimum pH for blackberry is 6.0 to 6.5; the source indicates liming if it is below that range.',
      },
      {
        es: 'Guía regional de NC State para caneberries (mora y frambuesa) del sureste de Estados Unidos; no fija un máximo.',
        en: 'NC State regional caneberry guide (blackberry and raspberry) for the southeastern United States; it sets no maximum.',
      },
      [NCSU_CANEBERRY_PH]),
    airMin(['floracion'], 'at_or_below', fromF(27), {
      severity: 'danger',
      effect: 'Helada en floración: a −2,8 °C mueren las flores de la mora',
      effectEn: 'Frost during flowering: blackberry flowers are killed at −2.8 °C',
      advice: 'Desde −2,8 °C mueren las flores de la mora, abiertas o todavía en botón. Si puedes, protege las plantas esa noche.',
      adviceEn: 'From −2.8 °C blackberry flowers die, whether open or still in bud. If you can, protect the plants that night.',
      note: 'Ensayos en cámara de crecimiento mostraron que las flores de mora mueren a 27 °F (−2,8 °C) en todos sus estados: botón cerrado, botón hinchado y flor abierta.',
      noteEn: 'Growth chamber trials showed that blackberry flowers are killed at 27 °F (−2.8 °C) at every stage: tight bud, popcorn and open blossom.',
      limitations: `Ensayo en cámara de crecimiento resumido por la guía regional de NC State; las yemas secundarias pueden sobrevivir y florecer después. La fuente compara la temperatura de la flor; ${GROUND}`,
      limitationsEn: `Growth chamber trial summarized by the NC State regional guide; secondary buds may survive and flower later. The source refers to blossom temperature; ${GROUND_EN}`,
      evidence: [NCSU_BLACKBERRY_FROST],
    }),
    harvestFreeze('mora', 'blackberry', 30.5, umaineFreeze('Blackberries: Temperature 31–32°F; Rel. humidity 90–95%; Approximate storage life 2–3 days; Freezing point 30.5°F.')),
    weatherEvent(['cosecha'], 'rain', {
      severity: 'warning',
      effect: 'Lluvia en cosecha: favorece la pudrición gris de la mora',
      effectEn: 'Rain at harvest favors blackberry gray mold',
      advice: 'La lluvia y la humedad prolongada sobre moras maduras aceleran la pudrición gris. Cosecha la fruta lista antes de la lluvia y retira la fruta sobremadura.',
      adviceEn: 'Rain and prolonged wetness on ripe blackberries speed up gray mold decay. Harvest ready fruit before the rain and remove overripe berries.',
      note: 'La guía regional de NC State indica que la pudrición gris (Botrytis) es la enfermedad más destructiva del fruto maduro de mora y frambuesa, y que las lluvias durante la cosecha favorecen la infección y el deterioro rápido.',
      noteEn: 'The NC State regional guide states that Botrytis fruit rot is the most destructive disease of ripe blackberry and raspberry fruit, and that rain during harvest favors infection and rapid decay.',
      limitations: `${RAIN_RULE} No diagnostica la enfermedad: sólo señala la condición que la fuente asocia con ella.`,
      limitationsEn: `${RAIN_RULE_EN} It does not diagnose disease: it only flags the condition the source associates with it.`,
      evidence: [UCIPM_CANEBERRY_BOTRYTIS],
    }),
    salt('Blackberry (Rubus spp.)', 1.5, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryRootTemp('la mora', 'blackberry')),

  perennial('sp.arandano-rojo',
    ph(4.0, 5.0, 4.0, 5.5,
      {
        es: 'El arándano rojo requiere suelos ácidos con un pH óptimo entre 4,0 y 5,0, aceptable hasta 5,5.',
        en: 'Cranberry requires acidic soils with an optimum pH between 4.0 and 5.0, acceptable up to 5.5.',
      },
      {
        es: 'Guía de nutrición de University of Massachusetts Amherst Cranberry Station para camas comerciales de arándano rojo (Vaccinium macrocarpon).',
        en: 'University of Massachusetts Amherst Cranberry Station nutrition guide for commercial cranberry beds (Vaccinium macrocarpon).',
      },
      [UMASS_CRANBERRY_PH]),
    airMin(GROWING, 'below', fromF(30), {
      severity: 'warning',
      effect: 'Helada bajo −1,1 °C: daña brotes nuevos y flores del arándano rojo',
      effectEn: 'Frost below −1.1 °C injures new cranberry shoots and flowers',
      advice: 'Con los brotes ya creciendo, bajo −1,1 °C se dañan las hojas nuevas, las flores y los frutos recién formados. Si tienes riego por aspersión contra heladas, prepáralo.',
      adviceEn: 'Once shoots are growing, below −1.1 °C new leaves, flowers and newly formed fruit are damaged. If you have sprinkler frost protection, get it ready.',
      note: 'UMass indica que, desde que el brote nuevo supera la media pulgada (1,3 cm), temperaturas bajo 30 °F (−1,1 °C) dañan hojas nuevas y flores, y que los frutos verdes recién formados también son sensibles.',
      noteEn: 'UMass states that once new growth exceeds half an inch (1.3 cm), temperatures below 30 °F (−1.1 °C) injure young leaves and flowers, and that newly formed green berries are also sensitive.',
      limitations: 'Antes de ese estado los botones toleran bastante más frío (18 a 27 °F según el estado y la variedad), así que al inicio de la brotación el aviso es cauto. La fuente mide la temperatura a la altura de las puntas de las guías, que en noches despejadas suele ser menor que la pronosticada.',
      limitationsEn: 'Before that stage buds tolerate much more cold (18 to 27 °F depending on stage and variety), so early in budbreak the warning is cautious. The source measures temperature at vine-tip height, which on clear nights is usually lower than forecast.',
      evidence: [UMASS_CRANBERRY_SPRING],
    }),
    airMin(['cosecha'], 'below', fromF(28), {
      severity: 'warning',
      effect: 'Helada bajo −2,2 °C en cosecha: daña la fruta que empieza a colorear',
      effectEn: 'Frost below −2.2 °C at harvest injures fruit that is starting to color',
      advice: 'La fruta del arándano rojo resiste más frío a medida que toma color. Bajo −2,2 °C se puede dañar la fruta blanca o recién coloreada; si tienes riego por aspersión contra heladas, úsalo.',
      adviceEn: 'Cranberry fruit withstands more cold as it colors. Below −2.2 °C white or lightly colored fruit can be damaged; if you have sprinkler frost protection, use it.',
      note: 'UMass indica que la fruta blanca a levemente coloreada tolera 28 °F (−2,2 °C) y que la tolerancia sube con el color: 27 °F con color intenso en la cara expuesta, 26 °F con color en toda la fruta y 25 °F con la fruta roja.',
      noteEn: 'UMass states that white to light blush fruit tolerates 28 °F (−2.2 °C) and that tolerance rises with color: 27 °F with deep blush on the exposed surface, 26 °F with deep blush over the whole fruit and 25 °F when red.',
      limitations: 'Se usa la cifra de la fruta menos coloreada, la más cauta; la fruta roja tolera más frío y la sobremadura vuelve a perder tolerancia. Valores conservadores de UMass para variedades de Massachusetts.',
      limitationsEn: 'The figure for the least colored fruit, the most cautious one, is used; red fruit tolerates more cold and overripe fruit loses tolerance again. Conservative UMass values for Massachusetts varieties.',
      evidence: [UMASS_CRANBERRY_FRUIT],
    }),
    analogSalt('sp.arandano', 'el arándano rojo', 'cranberry', 'Arándano', 'Blueberry', 'ambas especies son ericáceas del género Vaccinium sensibles a las sales', 'both species are salt-sensitive ericaceous berries of the genus Vaccinium', 'Blueberry (Vaccinium spp.)', 1.5, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    weatherEvent(['floracion'], 'rain', {
      severity: 'warning',
      effect: 'Lluvia en floración: reduce el vuelo de abejas y la cuaja en arándano rojo',
      effectEn: 'Rain during bloom reduces bee flight and fruit set in cranberry',
      advice: 'La lluvia durante la floración del arándano rojo frena el trabajo de los polinizadores y baja la cuaja. Revisa la cuaja en las semanas siguientes.',
      adviceEn: 'Rain during cranberry bloom curtails pollinator activity and lowers fruit set. Check fruit set in the following weeks.',
      note: 'UMass Cranberry Station indica que el tiempo lluvioso y frío en floración reduce el pecoreo de las abejas y la transferencia de polen, disminuyendo el cuaje.',
      noteEn: 'UMass Cranberry Station states that rainy and cold weather during cranberry bloom reduces bee foraging and pollen transfer, lowering fruit set.',
      limitations: `${RAIN_RULE} El efecto depende de cuántos días de floración coincidan con lluvia.`,
      limitationsEn: `${RAIN_RULE_EN} The effect depends on how many bloom days coincide with rain.`,
      evidence: [UMASS_CRANBERRY_POLLINATION_RAIN],
    }),
    readingBelow(GROWING, 'temp', 'below', fromF(55), {
      severity: 'info',
      effect: 'Suelo bajo 12,8 °C: el arándano rojo responde poco al fertilizante',
      effectEn: 'Soil below 12.8 °C: cranberry responds little to fertilizer',
      advice: 'Con la cama bajo 12,8 °C el arándano rojo aprovecha poco el nitrógeno que se aplique. Espera a que se temple antes de fertilizar.',
      adviceEn: 'With the bed below 12.8 °C cranberry makes little use of applied nitrogen. Wait until it warms before fertilizing.',
      note: 'UMass Cranberry Station indica planificar el nitrógeno según la temperatura del suelo: hasta que supera los 55 °F (12,8 °C) el nitrógeno disponible viene de la mineralización, y el suelo frío reduce o anula la respuesta de la planta al fertilizante.',
      noteEn: 'The UMass Cranberry Station advises planning nitrogen by soil temperature: until it exceeds 55 °F (12.8 °C) available nitrogen comes from mineralization, and cold soil lessens or eliminates the plant response to fertilizer.',
      limitations: 'La fuente habla de la respuesta al fertilizante, no de un umbral de actividad radicular medido. Lectura puntual a la profundidad de la sonda; la temperatura de la cama varía durante el día.',
      limitationsEn: 'The source speaks of fertilizer response, not a measured root-activity threshold. Single reading at probe depth; bed temperature varies during the day.',
      evidence: [UMASS_CRANBERRY_ROOT_TEMP],
    })),

  perennial('sp.grosella',
    ribesPh({ es: 'grosella', en: 'gooseberry' }),
    harvestFreeze('grosella', 'gooseberry', 30.0, umaineFreeze('Gooseberries: Temperature 31–32°F; Rel. humidity 90–95%; Approximate storage life 3–4 weeks; Freezing point 30.0°F.')),
    ribesHarvestRain('la grosella', 'gooseberry'),
    salt('Gooseberry (Ribes spp.)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryRootTemp('la grosella', 'gooseberry')),

  perennial('sp.zarzaparrilla',
    ribesPh({ es: 'zarzaparrilla roja', en: 'red currant' }),
    harvestFreeze('zarzaparrilla roja', 'red currant', 30.2, umaineFreeze('Currants: Temperature 31–32°F; Rel. humidity 90–95%; Approximate storage life 1–4 weeks; Freezing point 30.2°F.')),
    ribesHarvestRain('la zarzaparrilla roja', 'red currant'),
    salt('Currant (Ribes spp.)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryRootTemp('la zarzaparrilla roja', 'red currant')),

  perennial('sp.zarzaparrilla-negra',
    ribesPh({ es: 'zarzaparrilla negra', en: 'black currant' }),
    harvestFreeze('zarzaparrilla negra', 'black currant', 30.2, umaineFreeze('Currants: Temperature 31–32°F; Rel. humidity 90–95%; Approximate storage life 1–4 weeks; Freezing point 30.2°F.')),
    ribesHarvestRain('la zarzaparrilla negra', 'black currant'),
    salt('Currant (Ribes spp.)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryRootTemp('la zarzaparrilla negra', 'black currant')),

  perennial('sp.maqui',
    ph(5.3, 6.5, 5.0, 7.0,
      {
        es: 'El maqui se desarrolla preferentemente en suelos ligeramente ácidos, con un pH óptimo entre 5,3 y 6,5 y tolerancia de 5,0 a 7,0.',
        en: 'Maqui grows preferably in slightly acidic soils, with an optimum pH between 5.3 and 6.5 and tolerance from 5.0 to 7.0.',
      },
      {
        es: 'Monografía de INFOR para maqui (Aristotelia chilensis) en el centro-sur de Chile.',
        en: 'INFOR monograph for maqui (Aristotelia chilensis) in south-central Chile.',
      },
      [INFOR_MAQUI_SOIL]),
    airMin(ALL_STAGES, 'at_or_below', FROST, {
      severity: 'warning',
      effect: 'Helada prevista: el maqui es sensible a la helada en temporada productiva',
      effectEn: 'Frost forecast: maqui is frost-sensitive during the productive season',
      advice: 'El maqui se daña con heladas mientras brota, florece o tiene fruta, y se puede perder la producción del año. Si puedes, protege las plantas jóvenes esa noche.',
      adviceEn: 'Maqui is damaged by frost while it sprouts, flowers or carries fruit, and the year\'s crop can be lost. If you can, protect young plants that night.',
      note: 'La Universidad de Talca, en su experiencia de domesticación, señala que el maqui es sensible a las heladas en época productiva, y PFAF lo clasifica como sensible a la helada («frost tender»).',
      noteEn: 'Universidad de Talca, from its domestication work, states that maqui is frost-sensitive in the productive season, and PFAF classifies it as frost tender.',
      limitations: `${NO_FROST_FIGURE} En receso invernal la planta adulta tolera bastante más frío, y las heladas de invierno pueden cortar ramas que luego rebrotan; ${GROUND}`,
      limitationsEn: `${NO_FROST_FIGURE_EN} In winter dormancy the adult plant tolerates much more cold, and winter frosts can cut back branches that later resprout; ${GROUND_EN}`,
      evidence: [UTALCA_MAQUI, PFAF_MAQUI],
    }),
    analogSalt('sp.frambuesa', 'el maqui', 'maqui berry', 'Frambuesa', 'Raspberry', 'ambos son arbustos de bayas de zonas templado-húmedas sensibles a la salinidad', 'both are temperate-humid berry shrubs sensitive to salinity', 'Raspberry (Rubus idaeus)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryHarvestRain('el maqui', 'maqui berry'),
    berryRootTemp('el maqui', 'maqui berry')),

  perennial('sp.murtilla',
    MURTILLA_PH,
    airMin(ALL_STAGES, 'at_or_below', FROST, {
      severity: 'warning',
      effect: 'Helada prevista: el brote nuevo de murtilla se daña con heladas',
      effectEn: 'Frost forecast: new Chilean guava growth is damaged by frost',
      advice: 'La murtilla es sensible a la helada mientras crece: se queman los brotes nuevos y puede bajar la producción. Si puedes, protege las plantas esa noche.',
      adviceEn: 'Chilean guava is frost-sensitive while growing: new shoots get burned and the crop may fall. If you can, protect the plants that night.',
      note: 'PFAF clasifica a la murtilla como sensible a la helada («frost tender») e indica que el brote nuevo de primavera se daña con heladas tardías; sólo en receso completo tolera cerca de −10 °C. INIA y FIA recomiendan plantarla en zonas libres o de baja ocurrencia de heladas.',
      noteEn: 'PFAF classifies Chilean guava as frost tender and states that new spring growth is damaged by late frosts; only when fully dormant does it tolerate about −10 °C. INIA and FIA recommend planting it in frost-free or low-frost areas.',
      limitations: `${NO_FROST_FIGURE} Ninguna fuente distingue la flor ni el fruto; ${GROUND}`,
      limitationsEn: `${NO_FROST_FIGURE_EN} No source distinguishes flower or fruit; ${GROUND_EN}`,
      evidence: [PFAF_UGNI, FIA_MURTILLA],
    }),
    analogSalt('sp.frambuesa', 'la murtilla', 'Chilean guava', 'Frambuesa', 'Raspberry', 'ambos son arbustos de bayas de zonas templado-húmedas sensibles a la salinidad', 'both are temperate-humid berry shrubs sensitive to salinity', 'Raspberry (Rubus idaeus)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryHarvestRain('la murtilla', 'Chilean guava'),
    berryRootTemp('la murtilla', 'Chilean guava')),

  perennial('sp.calafate',
    CALAFATE_PH,
    shrubHardiness({ es: 'El calafate', en: 'Calafate' }, -15, PFAF_CALAFATE, {
      es: 'La ficha usa el nombre Berberis buxifolia, sinónimo de Berberis microphylla.',
      en: 'The sheet uses the name Berberis buxifolia, a synonym of Berberis microphylla.',
    }),
    analogSalt('sp.frambuesa', 'el calafate', 'calafate', 'Frambuesa', 'Raspberry', 'ambos son arbustos de bayas de zonas templado-frías sensibles a la salinidad', 'both are cool-temperate berry shrubs sensitive to salinity', 'Raspberry (Rubus idaeus)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryHarvestRain('el calafate', 'calafate'),
    berryRootTemp('el calafate', 'calafate')),

  perennial('sp.michay',
    analogPh('sp.calafate', 'el michay', 'Darwin\'s barberry', 'Calafate', 'Calafate', 'ambas especies son arbustos nativos del mismo género botánico (Berberis, familia Berberidaceae)', 'both species are native shrubs of the same botanical genus (Berberis, family Berberidaceae)', CALAFATE_PH),
    shrubHardiness({ es: 'El michay', en: 'Darwin\'s barberry' }, -15, PFAF_MICHAY, null),
    analogSalt('sp.frambuesa', 'el michay', 'Darwin\'s barberry', 'Frambuesa', 'Raspberry', 'ambos son arbustos de bayas de zonas templado-húmedas sensibles a la salinidad', 'both are temperate-humid berry shrubs sensitive to salinity', 'Raspberry (Rubus idaeus)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryHarvestRain('el michay', 'Darwin\'s barberry'),
    berryRootTemp('el michay', 'Darwin\'s barberry')),

  perennial('sp.mosqueta',
    ph(6.0, 6.5, null, null,
      {
        es: 'La rosa mosqueta se desarrolla bien en suelos de pH 6 a 6,5.',
        en: 'Rosehip grows well on soils of pH 6 to 6.5.',
      },
      {
        es: 'Antecedentes de cultivo de FIA para el Biobío; la especie crece también en suelos pobres y delgados, y la fuente no fija límites de daño.',
        en: 'FIA cultivation background for the Biobio region; the species also grows on thin, poor soils, and the source sets no damage limits.',
      },
      [FIA_MOSQUETA_SUELO]),
    airMin(['cosecha'], 'at_or_below', FROST, {
      severity: 'warning',
      effect: 'Helada en cosecha: el fruto de la rosa mosqueta se ablanda y cae',
      effectEn: 'Frost at harvest: rosehip fruit softens and drops',
      advice: 'Después de las primeras heladas el fruto maduro se ablanda y empieza a caer. Si ya tomó color, conviene cosecharlo antes de la helada.',
      adviceEn: 'After the first frosts ripe fruit softens and starts to drop. If it has already colored, it is best to pick it before the frost.',
      note: 'FIA indica que los frutos maduros se mantienen en la planta después de su completa madurez y que, tras las primeras heladas, se ablandan y comienzan a caer.',
      noteEn: 'FIA states that ripe fruit stays on the plant after full maturity and that, after the first frosts, it softens and begins to drop.',
      limitations: `${NO_FROST_FIGURE} Algunos recolectores esperan la helada porque el fruto queda más dulce; el aviso se refiere a la pérdida por caída del fruto.`,
      limitationsEn: `${NO_FROST_FIGURE_EN} Some pickers wait for frost because the fruit becomes sweeter; the warning refers to loss from fruit drop.`,
      evidence: [FIA_MOSQUETA_FRUTO],
    }),
    analogSalt('sp.frambuesa', 'la rosa mosqueta', 'rosehip', 'Frambuesa', 'Raspberry', 'ambas especies son arbustos frutales rosáceos sensibles a la salinidad', 'both species are rosaceous berry shrubs sensitive to salinity', 'Raspberry (Rubus idaeus)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryHarvestRain('la rosa mosqueta', 'rosehip'),
    berryRootTemp('la rosa mosqueta', 'rosehip')),

  perennial('sp.sauco',
    ph(5.5, 6.5, null, null,
      {
        es: 'Las guías de saúco indican ajustar el pH del suelo a 5,5–6,5 antes de plantar.',
        en: 'Elderberry guides indicate adjusting soil pH to 5.5–6.5 before planting.',
      },
      {
        es: 'Guías de Vermont y Missouri escritas sobre todo para el saúco americano (Sambucus canadensis, que algunos autores tratan como subespecie de Sambucus nigra); no fijan límites de daño.',
        en: 'Vermont and Missouri guides written mainly for American elderberry (Sambucus canadensis, which some authors treat as a subspecies of Sambucus nigra); they set no damage limits.',
      },
      [UVM_ELDERBERRY_PH, MU_ELDERBERRY_FROST]),
    airMin(GROWING, 'at_or_below', FROST, {
      severity: 'info',
      effect: 'Helada de primavera: puede dañar brotes y flores del saúco',
      effectEn: 'Spring frost can injure elderberry shoots and flowers',
      advice: 'El saúco resiste bien el frío, pero una helada con los brotes ya abiertos puede dañarlos. Revisa las plantas después de la helada.',
      adviceEn: 'Elderberry handles cold well, but a frost after budbreak can damage the shoots. Check the plants after the frost.',
      note: 'University of Missouri indica que el saúco tolera el frío después de la brotación, pero recomienda sitios altos para reducir el riesgo de daño por helada de primavera.',
      noteEn: 'University of Missouri states that elderberry tolerates cold after budbreak, but recommends elevated sites to reduce the risk of spring frost damage.',
      limitations: `${NO_FROST_FIGURE} Como florece tarde, la helada de primavera rara vez lo alcanza en floración.`,
      limitationsEn: `${NO_FROST_FIGURE_EN} Because it flowers late, spring frost rarely reaches it at bloom.`,
      evidence: [MU_ELDERBERRY_FROST],
    }),
    airMin(['cosecha'], 'at_or_below', FROST, {
      severity: 'info',
      effect: 'Helada en cosecha: el saúco no es sensible a la helada',
      effectEn: 'Frost at harvest: elderberry is not frost tender',
      advice: 'El saúco resiste una helada común, así que no debería dañarse. Revisa la fruta después de la helada.',
      adviceEn: 'Elderberry withstands an ordinary frost, so it should not be damaged. Check the fruit after the frost.',
      note: 'PFAF clasifica al saúco como rústico (zona 5 del Reino Unido) y no sensible a la helada («not frost tender»).',
      noteEn: 'PFAF classifies elderberry as hardy (UK zone 5) and not frost tender.',
      limitations: `${NO_FROST_FIGURE} La ficha describe la rusticidad de la planta en general, no la del fruto en maduración; el criterio sólo orienta.`,
      limitationsEn: `${NO_FROST_FIGURE_EN} The sheet describes the hardiness of the plant in general, not of the ripening fruit; the criterion is only guidance.`,
      evidence: [PFAF_SAUCO],
    }),
    analogSalt('sp.frambuesa', 'el saúco', 'elderberry', 'Frambuesa', 'Raspberry', 'ambos son arbustos frutales de bayas sensibles a la salinidad', 'both are berry shrubs sensitive to salinity', 'Raspberry (Rubus idaeus)', null, 'sensitive'),
    fao56Water('Berries (bushes)', 1.05, 0.5, 'flowering'),
    berryHarvestRain('el saúco', 'elderberry'),
    berryRootTemp('el saúco', 'elderberry')),

  // --- Aromáticas ---
  annual('sp.albahaca',
    analog('sp.perejil', {
      ...umdVegetable('Parsley', 6.5, 6.0),
      note: 'Por analogía con perejil: pH objetivo 6,5; se indica encalar bajo 6,0.',
      noteEn: 'By analogy with parsley: target pH 6.5; liming is indicated below 6.0.',
      limitations: `${BASIL_ANALOG.es} Tabla de producción comercial de hortalizas de la región atlántica media de Estados Unidos, que sólo fija el objetivo y el pH bajo el cual encalar.`,
      limitationsEn: `${BASIL_ANALOG.en} Commercial vegetable production table for the US Mid-Atlantic, which only sets the target and the pH below which to lime.`,
    }),
    airMin(ALL_STAGES, 'at_or_below', FROST, {
      severity: 'warning',
      effect: 'Helada prevista: la albahaca no la tolera',
      effectEn: 'Frost forecast: basil does not tolerate it',
      advice: 'Una helada quema o mata la albahaca. Si puedes, protégela esa noche o cosecha antes las hojas que estén listas.',
      adviceEn: 'A frost burns or kills basil. If you can, protect it that night or harvest the leaves that are ready beforehand.',
      note: 'INIA clasifica a la albahaca entre las especies que no toleran heladas.',
      noteEn: 'INIA classifies basil among the species that do not tolerate frost.',
      limitations: `INIA no da una temperatura para la albahaca: se usa 0 °C como definición de helada. ${GROUND_COLDER}`,
      limitationsEn: `INIA gives no temperature for basil: 0 °C is used as the definition of frost. ${GROUND_COLDER_EN}`,
      evidence: [inia165('none')],
    }),
    airMin(ALL_STAGES, 'below', fromF(50), {
      severity: 'info',
      effect: 'Frío bajo 10 °C: las hojas de albahaca pueden ennegrecerse',
      effectEn: 'Cold below 10 °C: basil leaves may turn black',
      advice: 'La albahaca sufre con noches bajo 10 °C y sus hojas pueden ponerse negras. Si puedes, cúbrela en las noches frías.',
      adviceEn: 'Basil suffers on nights below 10 °C and its leaves can turn black. If you can, cover it on cold nights.',
      note: 'South Dakota State indica que los cultivos de climas cálidos pueden sufrir bajo 50 °F (10 °C) y que la albahaca es un caso extremo: sus hojas pueden ennegrecerse con temperaturas en los 40 °F (4,4 a 9,4 °C).',
      noteEn: 'South Dakota State states that warm-climate crops may suffer below 50 °F (10 °C) and that basil is an extreme case: its leaves can turn black when temperatures dip into the 40s °F (4.4 to 9.4 °C).',
      limitations: 'Se compara la mínima diaria pronosticada; en muchas zonas de Chile se cumple varias noches de primavera y otoño, por eso el criterio sólo informa.',
      limitationsEn: 'The forecast daily minimum is compared; in many parts of Chile it is met on several spring and autumn nights, so the criterion is only informative.',
      evidence: [SDSU_BASIL],
    }),
    analogSalt('sp.lechuga', 'la albahaca', 'basil', 'Lechuga', 'Lettuce', 'ambas son especies herbáceas de hoja cosechada sensibles al exceso de sales', 'both are leafy herbaceous crops harvested for their foliage and sensitive to excess salts', 'Lettuce (Lactuca sativa)', 1.3, 'moderately_sensitive'),
    analogWater('sp.lechuga', 'la albahaca', 'basil', 'Lechuga', 'Lettuce', 'ambas se cultivan por la hoja tierna en ciclo corto y su crecimiento responde al agua de los primeros centímetros del suelo', 'both are grown for tender leaf on a short cycle and their growth responds to water in the top few centimetres of soil', fao56Water('Lettuce', 1.0, 0.3, 'vegetative')),
    herbHarvestRain('la albahaca', 'basil'),
    warmSoilRootAnalog('sp.pimiento', 'la albahaca', 'basil', 'Pimiento', 'Bell pepper', 'ambas son de estación cálida y no se establecen con el suelo frío', 'both are warm-season and do not establish in cold soil', 'Peppers')),

  perennial('sp.ciboulette',
    analog('sp.cebollin', {
      ...umdVegetable('Onions - green, bulb, scallions', 6.5, 6.0),
      note: 'Por analogía con cebollín: pH objetivo 6,5; se indica encalar bajo 6,0.',
      noteEn: 'By analogy with green onion: target pH 6.5; liming is indicated below 6.0.',
      limitations: `${CHIVES_PH_ANALOG.es} Tabla de producción comercial de hortalizas de la región atlántica media de Estados Unidos, que sólo fija el objetivo y el pH bajo el cual encalar.`,
      limitationsEn: `${CHIVES_PH_ANALOG.en} Commercial vegetable production table for the US Mid-Atlantic, which only sets the target and the pH below which to lime.`,
    }),
    toleratesDownTo(ALL_STAGES, fromF(28), { es: 'La ciboulette', en: 'Chives' },
      {
        es: 'South Dakota State incluye a la ciboulette («chives») entre las hortalizas que resisten heladas leves de 28 a 32 °F (−2,2 a 0 °C).',
        en: 'South Dakota State lists chives among the vegetables that withstand light freezes of 28 to 32 °F (−2.2 to 0 °C).',
      },
      {
        es: 'Clasificación de extensión agrícola de Estados Unidos para heladas de otoño; bajo 28 °F la fuente ya no indica tolerancia, así que el aviso es cauto.',
        en: 'US agricultural extension classification for fall frosts; below 28 °F the source no longer indicates tolerance, so the warning is cautious.',
      },
      [sdsu('light', 'Onion, Garlic, Chives')]),
    analogSalt('sp.cebolla', 'la ciboulette', 'chives', 'Cebolla', 'Onion', 'ambas especies pertenecen al género Allium', 'both species belong to the genus Allium', 'Onion (Allium cepa)', 1.2, 'sensitive'),
    analogWater('sp.cebollin', 'la ciboulette', 'chives', 'Cebollín', 'Green onion', 'ambas son alliums de hoja, de raíz somera y sin la fase de engrosamiento de bulbo', 'both are leaf alliums, shallow-rooted and without a bulb-filling phase', fao56Water('Onions - green', 1.0, 0.3, 'vegetative')),
    herbHarvestRain('la ciboulette', 'chives'),
    warmSoilRootAnalog('sp.cebollin', 'la ciboulette', 'chives', 'Cebollín', 'Green onion', 'ambas son alliums de hoja de raíz somera', 'both are shallow-rooted leaf alliums', 'Onions')),

  annual('sp.cilantro',
    analog('sp.perejil', {
      ...umdVegetable('Parsley', 6.5, 6.0),
      note: 'Por analogía con perejil: pH objetivo 6,5; se indica encalar bajo 6,0.',
      noteEn: 'By analogy with parsley: target pH 6.5; liming is indicated below 6.0.',
      limitations: `${PARSLEY_ANALOG.es} Tabla de producción comercial de hortalizas de la región atlántica media de Estados Unidos, que sólo fija el objetivo y el pH bajo el cual encalar.`,
      limitationsEn: `${PARSLEY_ANALOG.en} Commercial vegetable production table for the US Mid-Atlantic, which only sets the target and the pH below which to lime.`,
    }),
    toleratesDownTo(GROWING, fromF(28), { es: 'El cilantro', en: 'Coriander' },
      {
        es: 'Por analogía con perejil: las fuentes lo clasifican como tolerante a heladas leves de 28 a 32 °F (−2,2 a 0 °C).',
        en: 'By analogy with parsley: sources classify it as tolerant of light freezes of 28 to 32 °F (−2.2 to 0 °C).',
      },
      {
        es: `${PARSLEY_ANALOG.es} Clasificación de extensión agrícola de Estados Unidos e INIA; plántulas recién emergidas pueden ser más sensibles.`,
        en: `${PARSLEY_ANALOG.en} US agricultural extension and INIA classification; newly emerged seedlings may be more sensitive.`,
      },
      [sdsu('light', 'Parsley'), INIA_1998_FROST]).map(c => analog('sp.perejil', c)),
    analog('sp.perejil', airMax(['cosecha'], 'above', fromF(90), {
      severity: 'warning',
      effect: 'Calor sostenido sobre 32 °C: frena el cilantro que sigues cosechando',
      effectEn: 'Sustained heat above 32 °C slows coriander you keep harvesting',
      advice: 'Con varios días sobre 32 °C el cilantro casi deja de crecer y produce menos hojas. Si puedes, dale sombra o más riego mientras dura el calor.',
      adviceEn: 'With several days above 32 °C coriander nearly stops growing and yields fewer leaves. If you can, give it shade or more water while the heat lasts.',
      note: 'Por analogía con perejil: la fuente indica que, si se fuerza a crecer por períodos largos sobre 90 °F (32,2 °C), el crecimiento se reduce mucho y la planta puede morir.',
      noteEn: 'By analogy with parsley: the source states that if it is forced to grow for long periods above 90 °F (32.2 °C), growth is greatly reduced and the plant may die.',
      limitations: `${PARSLEY_ANALOG.es} La fuente habla de períodos largos de calor, no de un solo día; Utah State agrega que el cilantro se espiga con calor, lo que también corta la cosecha de hojas.`,
      limitationsEn: `${PARSLEY_ANALOG.en} The source refers to long hot periods, not a single day; Utah State adds that coriander bolts in heat, which also ends the leaf harvest.`,
      evidence: [UARK_PARSLEY],
    })),
    analogSalt('sp.apio', 'el cilantro', 'coriander', 'Apio', 'Celery', 'ambas son Apiáceas aromáticas de hoja cultivadas en estación fresca', 'both are cool-season aromatic leafy Apiaceae', 'Celery (Apium graveolens)', 1.8, 'moderately_sensitive'),
    analogWater('sp.apio', 'el cilantro', 'coriander', 'Apio', 'Celery', 'ambas son Apiáceas de hoja y tallo tierno con raíces superficiales sensibles a la falta de agua', 'both are tender-leafed Apiaceae with shallow roots sensitive to water shortage', fao56Water('Celery', 1.05, 0.2, 'vegetative')),
    herbHarvestRain('el cilantro', 'coriander'),
    warmSoilRootAnalog('sp.perejil', 'el cilantro', 'coriander', 'Perejil', 'Parsley', 'ambas son apiáceas de hoja de estación fresca', 'both are cool-season leafy apiaceae', 'Parsley')),

  perennial('sp.oregano',
    ph(6.0, 6.5, null, null,
      {
        es: 'La fuente indica mantener el suelo del orégano con pH 6,0 a 6,5.',
        en: 'The source indicates keeping oregano soil at pH 6.0 to 6.5.',
      },
      {
        es: 'Recomendación de UC IPM para huertos caseros de hierbas en California; no fija límites de daño.',
        en: 'UC IPM recommendation for home herb gardens in California; it sets no damage limits.',
      },
      [UCIPM_OREGANO]),
    airMin(ALL_STAGES, 'at_or_below', FROST, {
      severity: 'info',
      effect: 'Helada prevista: el orégano establecido la tolera',
      effectEn: 'Frost forecast: established oregano tolerates it',
      advice: 'Una vez establecido, el orégano resiste la helada. Si lo plantaste hace poco, protégelo esa noche.',
      adviceEn: 'Once established, oregano withstands frost. If you planted it recently, protect it that night.',
      note: 'UC IPM indica que, una vez establecido, el orégano es rústico y tolera la helada, y que se planta cuando ya pasó el riesgo de heladas de primavera.',
      noteEn: 'UC IPM states that once established, oregano is hardy and tolerates frost, and that it is planted after the risk of spring frost has passed.',
      limitations: `${NO_FROST_FIGURE} No hay un límite de daño documentado para plantas establecidas, así que el criterio sólo orienta.`,
      limitationsEn: `${NO_FROST_FIGURE_EN} There is no documented damage limit for established plants, so the criterion is only guidance.`,
      evidence: [UCIPM_OREGANO],
    }),
    analogSalt('sp.apio', 'el orégano', 'oregano', 'Apio', 'Celery', 'ante la falta de curva en FAO 29 para Lamiáceas culinarias se usa una herbácea aromática de referencia moderadamente sensible', 'in the absence of an FAO 29 curve for culinary Lamiaceae, a moderately sensitive reference aromatic herb is used', 'Celery (Apium graveolens)', 1.8, 'moderately_sensitive'),
    analogWater('sp.lechuga', 'el orégano', 'oregano', 'Lechuga', 'Lettuce', 'en producción comercial de hoja aromática el crecimiento vegetativo responde a la disponibilidad de agua en la zona radicular', 'in commercial aromatic leaf production vegetative growth responds to root-zone water availability', fao56Water('Lettuce', 1.0, 0.3, 'vegetative')),
    herbHarvestRain('el orégano', 'oregano'),
    warmSoilRootAnalog('sp.perejil', 'el orégano', 'oregano', 'Perejil', 'Parsley', 'ambas son hierbas de hoja que se cosechan en verde y enraízan en los primeros centímetros', 'both are leaf herbs harvested green that root in the top few centimetres', 'Parsley')),
];
