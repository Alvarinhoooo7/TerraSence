/** Perfiles de cultivos (salvo maíz, en speciesProfilesHortalizas.ts), forrajeras y forestales (TASK ES8.D). Contrato y fuentes compartidas: speciesRuleKit.ts. */
import type { PhenologicalStage } from '../types/app';
import type { SpeciesCriterion, SpeciesCriterionEvidence, SpeciesPhCriterion, SpeciesRuleProfile, SpeciesThreshold } from './speciesRuleKit';
import { ALL_STAGES, FROST, GROWING, RAIN_RULE, RAIN_RULE_EN, airMax, airMin, analog, analogPh, analogSalt, analogWater, annual, celsius, decimal, fao56Water, fromF, inia165, nebraska, perennial, salt, sdsu, waterSensitive, weatherEvent } from './speciesRuleKit';

// --- Fuentes nuevas del lote D (TASK ES8.D, S240–S299): ver MOTOR_AGRONOMICO.md ---------

const CONSULTED = '2026-10-19';
const NO_FROST_FIGURE = 'La fuente no da una temperatura: se usa 0 °C como definición de helada.';
const NO_FROST_FIGURE_EN = 'The source gives no temperature: 0 °C is used as the definition of frost.';
const TWO_HOURS = 'Los valores suponen unas dos horas de exposición; el pronóstico sólo compara la mínima diaria.';
const TWO_HOURS_EN = 'Values assume about two hours of exposure; the forecast only compares the daily minimum.';

const KSU_WHEAT_FREEZE: SpeciesCriterionEvidence = {
  institution: 'Kansas State University, Agricultural Experiment Station and Cooperative Extension Service',
  title: 'Spring Freeze Injury to Kansas Wheat (C-646, J. P. Shroyer, M. E. Mikesell y G. M. Paulsen, marzo de 1995)',
  url: 'https://bookstore.ksre.ksu.edu/pubs/spring-freeze-injury-to-kansas-wheat_C646.pdf',
  section: 'Tabla 1 «Temperatures that cause freeze injury to wheat at spring growth stages and symptoms and yield effect of spring freeze injury»',
  consultedAt: CONSULTED,
  originalValue: 'Approximate injurious temperature (two hours): Tillering 12 F (-11 C), slight to moderate yield effect; Jointing 24 F (-4 C), death of growing point, moderate to severe; Boot 28 F (-2 C), floret sterility, moderate to severe; Heading 30 F (-1 C), floret sterility, severe; Flowering 30 F (-1 C), floret sterility; white awns or white spikes, severe; Milk 28 F (-2 C), shrunken, roughened, or discolored kernels, moderate to severe; Dough 28 F (-2 C), shriveled, discolored kernels; poor germination, slight to moderate.',
};

const MANITOBA_CEREALS: SpeciesCriterionEvidence = {
  institution: 'Gobierno de Manitoba (Canadá), Manitoba Agriculture',
  title: 'Spring Frost Damage Bulletin',
  url: 'https://www.manitoba.ca/agriculture/crops/crop-management/spring-frost-damage-bulletin.html',
  section: '«Spring Cereals»',
  consultedAt: CONSULTED,
  originalValue: 'Spring cereals such as wheat, barley and oats are very tolerant to temperatures as low as -6°C since the growing point is below the soil surface until the 5 leaf stage to jointing.',
};

const NDSU_SMALL_GRAIN_FROST: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Small Grain Damage from Frost Dependent on Many Factors',
  url: 'https://www.ndsu.edu/agriculture/ag-hub/ag-topics/crop-production/crops/barley/small-grain-damage-frost-dependent-many-factors',
  section: 'Etapas sensibles de bota a floración',
  consultedAt: CONSULTED,
  originalValue: 'Small grains are most susceptible to frost from the late boot through flowering, the stage when reproductive tissue is developing. Frost injury occurs during boot through flowering when temperatures fall below 28 F. Barley is more susceptible to frost injury than wheat during the boot stage because it flowers while still in the boot.',
};

const CALAG_CEREAL_COLD = {
  institution: 'University of California (revista California Agriculture)',
  title: 'Effects of cold on cereal crops (C. A. Suneson, California Agriculture, agosto de 1964)',
  url: 'https://californiaagriculture.org/article/112987-effects-of-cold-on-cereal-crops.pdf',
  consultedAt: CONSULTED,
};

const CALAG_OAT_FROST: SpeciesCriterionEvidence = {
  ...CALAG_CEREAL_COLD,
  section: 'Daño por helada en espigadura de cebada, trigo, avena y centeno',
  originalValue: 'Injury generally is associated with minimum temperatures in the 29°- to 35°-F range during the most active periods of reproduction. Florets of rye and oats are generally injured less than those of wheat or barley. At temperatures near 32° F there is no killing of glumes, but the greater susceptibility of the male flower parts may become evident through their sterility.',
};

const CALAG_RICE_COLD: SpeciesCriterionEvidence = {
  ...CALAG_CEREAL_COLD,
  section: 'Esterilidad del arroz por bajas temperaturas',
  originalValue: 'Low air temperatures can be very deleterious at three stages of the rice plant\'s growth and reproduction, according to C. Roy Adair, USDA plant scientist. These are: (1) 20 to 24 days prior to heading, (2) 12 to 14 days before heading and finally (3) during anthesis. During these periods the critical air temperature was approximately 40° F, with unfavorable temperature effects being most pronounced on the male portion of the flowers. Interference with the reduction division of the pollen mother cells inhibits normal pollen formation, resulting ultimately in high sterility.',
};

const INIA_RICE_BOOK = 'INIA (libro «100 años del cultivo del arroz en Chile en un contexto internacional 1920-2020»)';

const INIA_RICE_CRITICAL: SpeciesCriterionEvidence = {
  institution: INIA_RICE_BOOK,
  title: 'Capítulo 4. Clima de las zonas productoras de arroz en el mundo (G. Donoso y otros)',
  url: 'https://ainfo.inia.uy/digital/bitstream/item/16110/1/cap.4-Donoso.pdf',
  section: 'Cuadro 1 «Temperaturas críticas y óptimas para el desarrollo del cultivo del arroz», adaptado de Yoshida (1981)',
  consultedAt: CONSULTED,
  originalValue: 'Temperatura media crítica (°C), baja y alta: germinación 10 y 45; plántula 12-13 y 35; macolla 9-16 y 33; iniciación de panícula 15; diferenciación de panícula 15-20 y 38; antesis 22 y 35; madurez 12-18 y 30.',
};

const INIA_RICE_GROWTH: SpeciesCriterionEvidence = {
  institution: INIA_RICE_BOOK,
  title: 'Capítulo 15. Crecimiento y desarrollo de la planta de arroz en Chile (M. Paredes, G. Donoso y V. Becerra)',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/c7faabeb-9482-4767-b989-aa6d59911d37/content',
  section: 'Efecto de la temperatura por período de desarrollo, pp. 452–454',
  consultedAt: CONSULTED,
  originalValue: 'La presencia de temperaturas menores a 20 °C durante este período puede producir un retraso en el crecimiento de la planta y reducir su vigor. [...] la presencia de altas temperaturas, mayores a 35 °C al estado de floración, pueden causar también diferentes grados de esterilidad. [...] las bajas temperaturas pueden alargar el período de madurez, causar una madurez irregular de la planta y un menor peso de los granos.',
};

const NDSU_CANOLA_A686: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Canola Production (A686, revisado por H. Kandel y J. Knodel, noviembre de 2021)',
  url: 'https://www.ndsu.edu/agriculture/sites/default/files/2021-11/a686%20Canola%20Production.pdf',
  section: 'Fecha de siembra',
  consultedAt: CONSULTED,
  originalValue: 'Canola is very susceptible to heat and drought stress during flowering. Canola seedlings are frost tolerant and can tolerate temperatures as low as 24 F.',
};

const NDSU_CANOLA_FLOWER_FROST: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Effect of Frost on Flowering Canola',
  url: 'https://www.ndsu.edu/agriculture/ag-hub/effect-frost-flowering-canola',
  section: 'Helada en floración',
  consultedAt: CONSULTED,
  originalValue: 'Frost at flowering will delay maturity but results in only minor reductions in yield. Frost after flowering, however, can result in significant yield reductions and grade loss. Frost during flowering usually causes flower abortion. Researchers have observed plants in which only those flowers open at the time of the frost were affected.',
};

const CCC_FALL_FROST: SpeciesCriterionEvidence = {
  institution: 'Canola Council of Canada (Canola Watch)',
  title: 'Fall frost hits canola. What to do?',
  url: 'https://www.canolacouncil.org/canola-watch/fundamentals/fall-frost-hits-canola-what-to-do/',
  section: '«Responses for heavy and light frost»',
  consultedAt: CONSULTED,
  originalValue: 'Heavy frost… below -2°C: Assess the damage in early afternoon. Pod shatter and pod drop could begin within a day. Frost in excess of -5°C is usually lethal for seeds with high moisture (especially 40% or more). Immature seeds (moisture content higher than 20%) will be damaged. Seeds with less than 20% moisture will normally escape damage. Green seed is the major downgrade that results from frost.',
};

const NDSU_SOYBEAN_FROST: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Evaluating Frost Damage in Soybean',
  url: 'https://www.ndsu.edu/agriculture/ag-hub/ag-topics/crop-production/crops/soybeans/evaluating-frost-damage-soybean',
  section: 'Temperaturas de daño y pérdida de rendimiento por estado',
  consultedAt: CONSULTED,
  originalValue: 'Soybean leaves on the top of the canopy are easily damaged by frost in the 30 °F to 32 °F range. Temperatures lower than 30 °F, for any extended period, can kill soybean plants (stems and leaves). The greatest yield losses occurred when frost occurred at stage R5 (beginning of seed development). A frost will not hurt soybean yields if the soybean growth stage is beyond R7.',
};

const PURDUE_SUGARBEET: SpeciesCriterionEvidence = {
  institution: 'Purdue University, Center for New Crops and Plant Products (Alternative Field Crops Manual)',
  title: 'Sugarbeets (A. W. Cattanach, A. G. Dexter y E. S. Oplinger; North Dakota State University, University of Minnesota y University of Wisconsin, julio de 1991)',
  url: 'https://hort.purdue.edu/newcrop/afcm/sugarbeet.html',
  section: '«Soil Requirements» y «Seeding Date»',
  consultedAt: CONSULTED,
  originalValue: 'Sugarbeets do not grow well on highly acidic soils and grow best on soils with a pH of 6.0 to 8.0. Sugarbeet culture on soils with pH lower than 6.0 should not be attempted until liming raises the pH to 7.0 or greater. Seedling sugarbeet plants have good tolerance to mild frosts and have survived temperatures in the mid-twenty degree range.',
};

const OSU_LUPIN = {
  institution: 'Oregon State University Extension Service',
  title: 'Dryland Cropping Systems: Narrow-leaf Lupin (EM 8834-E, K. Kettel y otros, junio de 2003)',
  url: 'https://extension.oregonstate.edu/sites/extd8/files/documents/em8834.pdf',
  consultedAt: CONSULTED,
};

const OSU_LUPIN_SOIL: SpeciesCriterionEvidence = {
  ...OSU_LUPIN,
  section: '«Soil»',
  originalValue: 'Lupins are sensitive to soil pH, preferring acid to near-neutral conditions (pH of 4.5 to 7.5). They will tolerate slightly alkaline soils (to pH 8.0), providing the free lime or calcium content of the soil is low.',
};

const OSU_LUPIN_CLIMATE: SpeciesCriterionEvidence = {
  ...OSU_LUPIN,
  section: '«Climate» y floración',
  originalValue: 'Floral abortion is intensified by moisture stress, low temperatures (below 50°F), and high temperatures (above 80°F) at flowering. Studies in Australia have shown that even 2 days of hot weather (80°F or greater) during bloom or when seed pods are filling can abort blossoms and reduce yields.',
};

const OMAFRA_CHICORY: SpeciesCriterionEvidence = {
  institution: 'Gobierno de Ontario (Canadá), Ministerio de Agricultura, Alimentación y Agronegocios (OMAFA)',
  title: 'Chicory - Root (Cichorium intybus var. sativum), CropOp',
  url: 'https://www.omafra.gov.on.ca/CropOp/en/indus_misc/pharm/chic.html',
  section: '«Soil pH», «Temperature sensitivity» y «Days to harvest»',
  consultedAt: CONSULTED,
  originalValue: 'Soil pH: pH 6 on light soils, pH 7 on heavy loam soils. Temperature sensitivity: Frost sensitive (young seedlings). Days to harvest: Roots are harvested in late fall prior to first frost, after which the quality of the inulin declines.',
};

const PSU_ALFALFA_FREEZE: SpeciesCriterionEvidence = {
  institution: 'Penn State Extension',
  title: 'Spring Freeze Damage in Alfalfa',
  url: 'https://extension.psu.edu/spring-freeze-damage-in-alfalfa',
  section: 'Temperatura que congela el meristema',
  consultedAt: CONSULTED,
  originalValue: 'Nighttime temperatures must fall to 24ºF or lower for four or more hours to freeze the alfalfa meristem at the top of the plant stem. This means that temperatures at freezing or just below (28 to 32ºF) will not damage the alfalfa.',
};

const SDSU_ALFALFA_FROST: SpeciesCriterionEvidence = {
  institution: 'South Dakota State University Extension',
  title: 'Effects of Late Spring Frost on Alfalfa',
  url: 'https://extension.sdstate.edu/effects-late-spring-frost-alfalfa',
  section: 'Daño por helada según temperatura y duración',
  consultedAt: CONSULTED,
  originalValue: 'Although alfalfa is considered to have good cold temperature tolerance, minor frost damage may occur when plants are exposed to air temperatures slightly below freezing for several hours, and more severe damage will be seen when temperatures drop below 25°F for four or more hours.',
};

const UW_HAY_RAIN: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Extension (Team Forage)',
  title: 'Rain Damage to Forage During Hay and Silage Making (M. Rankin y D. Undersander)',
  url: 'https://fyi.extension.wisc.edu/forage/files/2014/01/Raindam.pdf',
  section: '«Introduction» y «How much does rainfall reduce yield?»',
  consultedAt: CONSULTED,
  originalValue: 'Rain that occurs between the time forage is cut and harvested causes both yield and quality losses that reduce the value of the crop as an animal feed and a marketable commodity. In Wisconsin, Collins measured dry matter losses of 22% when alfalfa was exposed to 1-inch of rain after 1 day of curing.',
};

const OSU_RED_CLOVER: SpeciesCriterionEvidence = {
  institution: 'Oregon State University Extension Service',
  title: 'Red Clover (Trifolium pratense) (EM 8701, enero de 1998)',
  url: 'https://ir.library.oregonstate.edu/downloads/1r66j149d',
  section: '«Environmental preferences and limitations»',
  consultedAt: CONSULTED,
  originalValue: 'It can survive winter temperatures as low as -30°F and tolerates temporary waterlogging, but cannot survive prolonged waterlogging or flooding. The optimum pH range is 6.6–7.6, but a range of 4.5– 8.2 is tolerated.',
};

const OSU_ANNUAL_RYEGRASS = {
  institution: 'Pacific Northwest Extension (Oregon State University, Washington State University y University of Idaho)',
  title: 'Annual Ryegrass (Lolium multiflorum Lam.) (PNW 501, D. Hannaway y otros, abril de 1999)',
  url: 'https://ir.library.oregonstate.edu/downloads/mg74qm32g',
  consultedAt: CONSULTED,
};

const OSU_RYEGRASS_SOIL: SpeciesCriterionEvidence = {
  ...OSU_ANNUAL_RYEGRASS,
  section: 'Adaptación a suelos',
  originalValue: 'It is tolerant of acidic to alkaline soils (pH 5.0 to 7.8). Below pH 5.0, aluminum toxicity may be a problem. Higher pH can cause chlorosis due to iron and manganese deficiencies. Best growth occurs when soil pH is maintained between 5.5 and 7.5.',
};

const OSU_RYEGRASS_HAY: SpeciesCriterionEvidence = {
  ...OSU_ANNUAL_RYEGRASS,
  section: '«Silage and hay»',
  originalValue: 'Harvesting annual ryegrass for hay is not recommended in high rainfall/humidity areas such as the coastal Pacific Northwest. Good hay-curing weather typically occurs too late in this region for producing high-quality ryegrass hay.',
};

const PSU_RYEGRASS_HAY: SpeciesCriterionEvidence = {
  institution: 'Penn State Extension',
  title: 'Ryegrass (agronomy facts)',
  url: 'https://extension.psu.edu/ryegrass',
  section: 'Manejo como heno',
  consultedAt: CONSULTED,
  originalValue: 'Ryegrass plants contain less dry matter than other cool-season grass plants and, therefore, require a longer curing time before baling.',
};

const MSSTATE_BRASSICA: SpeciesCriterionEvidence = {
  institution: 'Mississippi State University Extension',
  title: 'Forage Brassicas for Winter Grazing Systems',
  url: 'https://extension.msstate.edu/publications/forage-brassicas-for-winter-grazing-systems',
  section: '«Kale» y requisitos de suelo',
  consultedAt: CONSULTED,
  originalValue: 'Kale (Brassica oleracea): Grown for its leaves and stems, kale is highly digestible and cold-tolerant, surviving down to 10°F and allowing for extended fall grazing. Brassicas require good soil drainage and a soil pH between 5.3 and 6.8 for optimum production.',
};

const UW_BRASSICA: SpeciesCriterionEvidence = {
  institution: 'University of Wisconsin–Madison Extension',
  title: 'Use of Brassica Crops in Grazing Systems',
  url: 'https://cropsandsoils.extension.wisc.edu/articles/use-of-brassica-crops-in-grazing-systems',
  section: 'Calidad en otoño y suelo',
  consultedAt: CONSULTED,
  originalValue: 'These crops maintain quality, if not heading, well into freezing temperatures and may be grazed into November. Brassicas require good soil drainage and a soil pH should be in the range of 5.3-6.8.',
};

const UDEC_EUCALYPTUS_FREEZE: SpeciesCriterionEvidence = {
  institution: 'Universidad de Concepción (Electronic Journal of Biotechnology, Pontificia Universidad Católica de Valparaíso)',
  title: 'Resistance to freezing in three Eucalyptus globulus Labill subspecies (P. Moraga y otros, vol. 9, n.° 3, 2006)',
  url: 'https://www.ejbiotechnology.info/index.php/ejbiotechnology/article/download/v9n3-24/308',
  section: '«Results» y «Discussion»',
  consultedAt: CONSULTED,
  originalValue: 'However, there are some restrictions for its establishment, due to the freezing sensitivity of the young plantations. The freezing resistance varied in a range between -7.1ºC, for the less resistant plants up to less than -9ºC, for the most resistant ones. By the results obtained in LT50, the process of plantation in zones with incidence of low temperatures (up to -7ºC), should not to be a problem for plants properly hardened.',
};

const INFOR_EUCALYPTUS: SpeciesCriterionEvidence = {
  institution: 'INFOR (Instituto Forestal de Chile)',
  title: 'Desarrollo de una raza local de Eucalyptus globulus tolerante al frío en Chile (B. Gutiérrez, M. P. Molina, C. Balocchi y F. Droppelmann)',
  url: 'https://bibliotecadigital.infor.cl/server/api/core/bitstreams/c2654dd7-9a0c-44c5-a47f-85bb20a0dc59/content',
  section: 'Introducción y «Especies alternativas»',
  consultedAt: CONSULTED,
  originalValue: 'Particularmente las zonas con incidencia de heladas, sumado a la baja tolerancia al frío de la especie, han limitado la expansión de sus plantaciones hacia el Sur y Precordillera Andina. Incluso en el Valle Central se han producido desastrosas pérdidas de plantaciones, en zonas afectadas por heladas, como consecuencia de la gran susceptibilidad de esta especie al frío. E. nitens es una especie ampliamente reconocida por presentar una de las mejores combinaciones de resistencia al frío y vigor de crecimiento.',
};

const CHAPINGO_RADIATA: SpeciesCriterionEvidence = {
  institution: 'Colegio de Postgraduados (Revista Chapingo, Serie Ciencias Forestales y del Ambiente)',
  title: 'Poblaciones de Pinus radiata D. Don difieren en la tolerancia a bajas temperaturas y en la tasa de crecimiento (G. de Jesús-Reyes y otros, vol. 26, n.° 3, 2020)',
  url: 'https://www.scielo.org.mx/scielo.php?pid=S2007-40182020000300469&script=sci_arttext&tlng=es',
  section: 'Introducción y «Daño por bajas temperaturas»',
  consultedAt: CONSULTED,
  originalValue: 'En Pinus radiata D. Don, uno de los pinos más plantados globalmente, las heladas dañan a las plantaciones en etapa de plántula. [...] el follaje de plántulas menores de dos años sufre deterioro al exponerse a temperaturas entre -3 y -6 °C en verano y entre -12 y -14 °C en invierno (Burdon, 2001).',
};

// --- Constructores del lote -----------------------------------------------------------

type Text = { es: string; en: string };

const ph = (min: number, max: number, lowerLimit: number | null, upperLimit: number | null,
  note: Text, limitations: Text, evidence: SpeciesCriterionEvidence[]): SpeciesPhCriterion => ({
  kind: 'ph', state: 'enabled', stages: GROWING,
  optimum: { min, max }, lowerLimit, upperLimit,
  note: note.es, noteEn: note.en, limitations: limitations.es, limitationsEn: limitations.en, evidence,
});

/** Tolera la helada leve hasta `limit`: dentro del margen informa; bajo él advierte. */
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
      advice: `Bajo ${es} °C este cultivo puede dañarse. Revisa las plantas en los días siguientes para ver si rebrotan.`,
      adviceEn: `Below ${en} °C this crop can be damaged. Check the plants over the following days to see whether they regrow.`,
      note: note.es, noteEn: note.en, limitations: limitations.es, limitationsEn: limitations.en, evidence,
    }),
  ];
};

/** Trigo, tabla 1 de Kansas State: un criterio por etapa. */
const wheatFreeze = (crop: Text, limitations?: Text) => {
  const lim = (base: Text): Text => limitations ? { es: `${limitations.es} ${base.es}`, en: `${limitations.en} ${base.en}` } : base;
  const prefix = limitations ? { es: 'Por analogía con trigo: ', en: 'By analogy with wheat: ' } : { es: '', en: '' };
  const jointing = lim({
    es: `${TWO_HOURS} En macolla la tabla indica daño recién a 12 °F (−11,1 °C), así que antes del encañado el aviso es cauto. La tabla redondea 24 °F a −4 °C; aquí se convierte con un decimal.`,
    en: `${TWO_HOURS_EN} At tillering the table indicates injury only at 12 °F (−11.1 °C), so before jointing the warning is cautious. The table rounds 24 °F to −4 °C; here it is converted to one decimal.`,
  });
  const flowering = lim({
    es: `${TWO_HOURS} La espigadura y la floración tienen el mismo umbral en la tabla.`,
    en: `${TWO_HOURS_EN} Heading and flowering have the same threshold in the table.`,
  });
  const filling = lim({
    es: `${TWO_HOURS} Aplica mientras el grano se llena (estados lechoso y pastoso); con el grano maduro y seco la tabla no indica daño.`,
    en: `${TWO_HOURS_EN} It applies while the grain is filling (milk and dough stages); with mature, dry grain the table indicates no injury.`,
  });
  return [
    airMin(['vegetativo'], 'at_or_below', fromF(24), {
      severity: 'warning',
      effect: `Helada de −4,4 °C o menos: desde el encañado puede matar el punto de crecimiento de ${crop.es}`,
      effectEn: `Frost of −4.4 °C or lower: from jointing it can kill the ${crop.en} growing point`,
      advice: 'Desde el encañado, una helada de −4,4 °C o menos por un par de horas puede matar el punto de crecimiento y bajar el rendimiento. Revisa las plantas unos días después.',
      adviceEn: 'From jointing, a frost of −4.4 °C or lower for a couple of hours can kill the growing point and lower yield. Check the plants a few days later.',
      note: `${prefix.es}en encañado la temperatura de daño es 24 °F (−4,4 °C) por unas dos horas: muere el punto de crecimiento y el efecto en el rendimiento es de moderado a severo.`,
      noteEn: `${prefix.en}at jointing the injurious temperature is 24 °F (−4.4 °C) for about two hours: the growing point dies and the yield effect is moderate to severe.`,
      limitations: jointing.es, limitationsEn: jointing.en, evidence: [KSU_WHEAT_FREEZE],
    }),
    airMin(['floracion'], 'at_or_below', fromF(30), {
      severity: 'danger',
      effect: `Helada en espigadura o floración: deja estériles las flores de ${crop.es}`,
      effectEn: `Frost at heading or flowering leaves ${crop.en} florets sterile`,
      advice: 'En espigadura y floración bastan −1,1 °C por un par de horas para dejar espigas vacías. Revisa las espigas unos días después para estimar el daño.',
      adviceEn: 'At heading and flowering, −1.1 °C for a couple of hours is enough to leave empty heads. Check the heads a few days later to estimate the damage.',
      note: `${prefix.es}en espigadura y floración la temperatura de daño es 30 °F (−1,1 °C): las flores quedan estériles, con aristas o espigas blancas, y el efecto en el rendimiento es severo.`,
      noteEn: `${prefix.en}at heading and flowering the injurious temperature is 30 °F (−1.1 °C): florets become sterile, with white awns or heads, and the yield effect is severe.`,
      limitations: flowering.es, limitationsEn: flowering.en, evidence: [KSU_WHEAT_FREEZE],
    }),
    airMin(['cosecha'], 'at_or_below', fromF(28), {
      severity: 'warning',
      effect: `Helada en llenado de grano: el grano de ${crop.es} queda arrugado o manchado`,
      effectEn: `Frost during grain fill leaves ${crop.en} kernels shriveled or discolored`,
      advice: 'Con el grano lechoso o pastoso, una helada de −2,2 °C o menos puede dejar granos arrugados, descoloridos y de mala germinación.',
      adviceEn: 'With the grain at milk or dough, a frost of −2.2 °C or lower can leave shriveled, discolored grain with poor germination.',
      note: `${prefix.es}en grano lechoso y pastoso la temperatura de daño es 28 °F (−2,2 °C): granos arrugados o descoloridos y mala germinación.`,
      noteEn: `${prefix.en}at milk and dough the injurious temperature is 28 °F (−2.2 °C): shriveled or discolored kernels and poor germination.`,
      limitations: filling.es, limitationsEn: filling.en, evidence: [KSU_WHEAT_FREEZE],
    }),
  ];
};

const WHEAT_FILL = (crop: string, cropEn: string, why: Text): SpeciesCriterion =>
  analog('sp.trigo', wheatFreeze({ es: crop, en: cropEn }, why)[2]);

/** Cereales de primavera antes del encañado (Manitoba): toleran hasta −6 °C. */
const springCerealSeedling = (crop: Text) => toleratesDownTo(['vegetativo'], celsius(-6), crop,
  {
    es: 'Manitoba Agriculture indica que los cereales de primavera (trigo, cebada y avena) toleran temperaturas de hasta −6 °C mientras el punto de crecimiento sigue bajo la superficie del suelo, hasta el estado de 5 hojas o el encañado.',
    en: 'Manitoba Agriculture states that spring cereals (wheat, barley and oats) tolerate temperatures as low as −6 °C while the growing point is still below the soil surface, until the 5-leaf stage or jointing.',
  },
  {
    es: 'Vale hasta el estado de 5 hojas o el inicio del encañado; después el punto de crecimiento queda expuesto y la tolerancia baja.',
    en: 'It applies until the 5-leaf stage or the start of jointing; after that the growing point is exposed and tolerance drops.',
  },
  [MANITOBA_CEREALS]);

const forageRain = (crop: Text, note: Text, limitations: Text, evidence: SpeciesCriterionEvidence[]) =>
  weatherEvent(['cosecha'], 'rain', {
    severity: 'warning',
    effect: `Lluvia en el corte: el forraje de ${crop.es} cortado pierde rendimiento y calidad`,
    effectEn: `Rain at cutting: cut ${crop.en} forage loses yield and quality`,
    advice: 'Si vas a cortar para heno, la lluvia sobre el pasto cortado lava nutrientes y hace perder hojas. Espera una ventana de días secos para cortar.',
    adviceEn: 'If you are cutting for hay, rain on the cut forage washes out nutrients and causes leaf loss. Wait for a window of dry days to cut.',
    note: note.es, noteEn: note.en, limitations: limitations.es, limitationsEn: limitations.en, evidence,
  });

const KSU_WHEAT_PH: SpeciesCriterionEvidence = {
  institution: 'Kansas State University, Agricultural Experiment Station and Cooperative Extension Service',
  title: 'Wheat Production Handbook (C-529)',
  url: 'https://www.bookstore.ksre.ksu.edu/pubs/C529.pdf',
  section: 'Soil and Site Requirements / Planting',
  consultedAt: CONSULTED,
  originalValue: 'Minimum germination temperature 39–40 °F (4 °C), optimum 54–77 °F, pH 6.0–7.5',
};

const PSU_BARLEY_PH: SpeciesCriterionEvidence = {
  institution: 'Penn State Extension',
  title: 'The Penn State Agronomy Guide — Barley Production',
  url: 'https://extension.psu.edu/barley-production',
  section: '«Soil Fertility and Liming»',
  consultedAt: CONSULTED,
  originalValue: 'Barley is more sensitive to low soil pH than wheat or oats; maintain soil pH between 6.5 and 7.0 (minimum 6.0).',
};

const PSU_OAT_PH: SpeciesCriterionEvidence = {
  institution: 'Penn State Extension',
  title: 'The Penn State Agronomy Guide — Oat Production',
  url: 'https://extension.psu.edu/oat-production',
  section: '«Soil Fertility and Liming»',
  consultedAt: CONSULTED,
  originalValue: 'Oats tolerate acid soils better than wheat or barley, performing best at a soil pH between 6.0 and 7.0 (minimum 5.5).',
};

const INIA_RICE_SOIL: SpeciesCriterionEvidence = {
  institution: INIA_RICE_BOOK,
  title: 'Capítulo 15. Crecimiento y desarrollo de la planta de arroz en Chile (M. Paredes, G. Donoso y V. Becerra)',
  url: 'https://biblioteca.inia.cl/server/api/core/bitstreams/c7faabeb-9482-4767-b989-aa6d59911d37/content',
  section: '«Requerimientos de suelo y pH»',
  consultedAt: CONSULTED,
  originalValue: 'El arroz se adapta a suelos de reacción ligeramente ácida a neutra, con un pH óptimo entre 5,5 y 7,0 (tolerando de 5,0 a 7,5 bajo inundación).',
};

const NDSU_CANOLA_SOIL: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Canola Production (A686, revisado por H. Kandel y J. Knodel, noviembre de 2021)',
  url: 'https://www.ndsu.edu/agriculture/sites/default/files/2021-11/a686%20Canola%20Production.pdf',
  section: '«Soil Considerations»',
  consultedAt: CONSULTED,
  originalValue: 'Canola grows best on soils with pH between 5.8 and 7.0, tolerating a range of 5.5 to 8.0.',
};

const NDSU_SOYBEAN_SOIL: SpeciesCriterionEvidence = {
  institution: 'NDSU Extension (North Dakota State University)',
  title: 'Soybean Soil Fertility and pH Management',
  url: 'https://www.ndsu.edu/agriculture/ag-hub/ag-topics/crop-production/crops/soybeans',
  section: '«Soil pH and Nodulation»',
  consultedAt: CONSULTED,
  originalValue: 'Soybean production is optimal at a soil pH between 6.0 and 7.0 (acceptable from 5.8 to 7.5 for effective Bradyrhizobium nodulation).',
};

const PSU_ALFALFA_SOIL: SpeciesCriterionEvidence = {
  institution: 'Penn State Extension',
  title: 'The Penn State Agronomy Guide — Alfalfa Management',
  url: 'https://extension.psu.edu/alfalfa-management',
  section: '«Soil pH and Lime»',
  consultedAt: CONSULTED,
  originalValue: 'Alfalfa requires a soil pH between 6.5 and 7.0 for optimal Sinorhizobium meliloti nodulation and stand persistence (minimum 6.2, up to 7.5).',
};

const INFOR_EUCALYPTUS_SOIL: SpeciesCriterionEvidence = {
  institution: 'INFOR (Instituto Forestal de Chile)',
  title: 'Manual de plantaciones de Eucalyptus en Chile — Requerimientos de sitio y suelo',
  url: 'https://bibliotecadigital.infor.cl/server/api/core/bitstreams/c2654dd7-9a0c-44c5-a47f-85bb20a0dc59/content',
  section: '«Características edáficas»',
  consultedAt: CONSULTED,
  originalValue: 'Las plantaciones de Eucalyptus spp. en el centro-sur de Chile se establecen preferentemente en suelos ligeramente ácidos con pH óptimo de 5,0 a 6,5 (tolerando de 4,5 a 7,0).',
};

const INFOR_PINE_SOIL: SpeciesCriterionEvidence = {
  institution: 'INFOR (Instituto Forestal de Chile)',
  title: 'Silvicultura y manejo de Pinus radiata en Chile — Requerimientos edáficos',
  url: 'https://bibliotecadigital.infor.cl/handle/20.500.12220/1',
  section: '«Suelos y nutrición»',
  consultedAt: CONSULTED,
  originalValue: 'Pinus radiata prospera en suelos ácidos a ligeramente ácidos, con un rango óptimo de pH de 4,5 a 6,0 (tolerando de 4,0 a 6,5).',
};

const WHEAT_PH: SpeciesPhCriterion = ph(6.0, 7.5, null, null,
  {
    es: 'Kansas State University documenta un rango de pH de 6,0 a 7,5 para el cultivo de trigo.',
    en: 'Kansas State University documents a pH range of 6.0 to 7.5 for wheat production.',
  },
  {
    es: 'Manual de producción de trigo de Kansas State; no fija límites extremos de daño fuera del rango óptimo.',
    en: 'Kansas State wheat production handbook; it sets no extreme damage limits outside the optimum range.',
  },
  [KSU_WHEAT_PH]);

const LUPIN_PH: SpeciesPhCriterion = ph(4.5, 7.5, null, 8.0,
  {
    es: 'El lupino prefiere suelos ácidos a casi neutros, con pH 4,5 a 7,5, y tolera hasta 8,0 si el suelo tiene poca cal libre.',
    en: 'Lupin prefers acid to near-neutral soils, pH 4.5 to 7.5, and tolerates up to 8.0 if the soil has little free lime.',
  },
  {
    es: 'Guía para lupino de hoja angosta (Lupinus angustifolius) en Oregón; el lupino blanco y el amarillo cultivados en Chile pueden diferir.',
    en: 'Guide for narrow-leaf lupin (Lupinus angustifolius) in Oregon; the white and yellow lupins grown in Chile may differ.',
  },
  [OSU_LUPIN_SOIL]);

const BRASSICA_PH: SpeciesPhCriterion = ph(5.3, 6.8, null, null,
  {
    es: 'Las brásicas forrajeras requieren suelos con buen drenaje y pH entre 5,3 y 6,8 para producir bien.',
    en: 'Forage brassicas need well-drained soils with a pH between 5.3 and 6.8 for good production.',
  },
  {
    es: 'Rango dado para las brásicas forrajeras en conjunto (col, raps forrajero, nabo y rutabaga); no fija límites de daño.',
    en: 'Range given for forage brassicas as a group (kale, forage rape, turnip and swede); it sets no damage limits.',
  },
  [MSSTATE_BRASSICA, UW_BRASSICA]);

const RED_CLOVER_PH: SpeciesPhCriterion = ph(6.6, 7.6, 4.5, 8.2,
  {
    es: 'El pH óptimo para trébol rosado es 6,6 a 7,6; la especie tolera de 4,5 a 8,2.',
    en: 'The optimum pH for red clover is 6.6 to 7.6; the species tolerates 4.5 to 8.2.',
  },
  {
    es: 'Ficha de Oregon State; entre el límite tolerado y el óptimo el trébol crece, pero rinde menos.',
    en: 'Oregon State sheet; between the tolerated limit and the optimum red clover grows, but yields less.',
  },
  [OSU_RED_CLOVER]);

// --- Perfiles --------------------------------------------------------------------------

export const FIELD_CROP_PROFILES: readonly SpeciesRuleProfile[] = [
  annual('sp.trigo',
    WHEAT_PH,
    wheatFreeze({ es: 'trigo', en: 'wheat' }),
    salt('Wheat (Triticum aestivum)', 6.0, 'moderately_tolerant'),
    waterSensitive('Wheat', 'vegetative 0.2; flowering 0.6; yield formation 0.5', 0.6, 'flowering')),

  annual('sp.cebada',
    ph(6.5, 7.0, 6.0, null,
      {
        es: 'La cebada es más sensible a suelos ácidos que el trigo o la avena; se recomienda mantener el pH entre 6,5 y 7,0, con un mínimo de 6,0.',
        en: 'Barley is more sensitive to acid soils than wheat or oats; maintaining soil pH between 6.5 and 7.0, with a minimum of 6.0, is recommended.',
      },
      {
        es: 'Guía agronómica de Penn State Extension para cebada; documenta el umbral mínimo de encalado (6,0) sin fijar un techo alcalino.',
        en: 'Penn State Extension Agronomy Guide for barley; documents the minimum liming threshold (6.0) without setting an alkaline ceiling.',
      },
      [PSU_BARLEY_PH]),
    springCerealSeedling({ es: 'La cebada', en: 'Barley' }),
    airMin(['floracion'], 'below', fromF(28), {
      severity: 'danger',
      effect: 'Helada bajo −2,2 °C de fin de bota a floración: daña el polen de la cebada',
      effectEn: 'Frost below −2.2 °C from late boot to flowering injures barley pollen',
      advice: 'De fin de bota a floración, bajo −2,2 °C se daña el polen y la espiga puede quedar con pocos granos. La cebada es más sensible que el trigo porque florece dentro de la bota. Revisa las espigas en los días siguientes.',
      adviceEn: 'From late boot to flowering, below −2.2 °C pollen is damaged and the head may set few kernels. Barley is more sensitive than wheat because it flowers inside the boot. Check the heads over the following days.',
      note: 'NDSU indica que los cereales son más sensibles de fin de bota a floración, que la helada daña bajo 28 °F (−2,2 °C) en esas etapas y que la cebada es más sensible que el trigo en bota porque florece dentro de ella.',
      noteEn: 'NDSU states that small grains are most sensitive from late boot through flowering, that frost injures below 28 °F (−2.2 °C) at those stages and that barley is more sensitive than wheat at boot because it flowers inside it.',
      limitations: 'Extensión agrícola de Dakota del Norte; cuanto más dura el frío, mayor el daño, y el pronóstico sólo compara la mínima diaria.',
      limitationsEn: 'North Dakota agricultural extension; the longer the cold lasts, the greater the damage, and the forecast only compares the daily minimum.',
      evidence: [NDSU_SMALL_GRAIN_FROST],
    }),
    WHEAT_FILL('cebada', 'barley', {
      es: 'Sin fuente propia para cebada en llenado de grano: se usa el criterio documentado para Trigo (Wheat), porque ambos son cereales de la tribu Triticeae con el mismo órgano cosechado.',
      en: 'No source for barley during grain fill: the documented criterion for Trigo (Wheat) is used, because both are cereals of the tribe Triticeae with the same harvested organ.',
    }),
    salt('Barley (Hordeum vulgare)', 8.0, 'tolerant'),
    fao56Water('Barley (Hordeum vulgare)', 1.15, 0.55, 'flowering')),

  annual('sp.avena',
    ph(6.0, 7.0, 5.5, null,
      {
        es: 'La avena tolera mejor la acidez que el trigo o la cebada y rinde mejor con un pH entre 6,0 y 7,0, con un mínimo de 5,5.',
        en: 'Oats tolerate soil acidity better than wheat or barley and perform best at a pH between 6.0 and 7.0, with a minimum of 5.5.',
      },
      {
        es: 'Guía agronómica de Penn State Extension para avena; fija el mínimo de 5,5 sin establecer un límite superior.',
        en: 'Penn State Extension Agronomy Guide for oats; sets the 5.5 minimum without establishing an upper limit.',
      },
      [PSU_OAT_PH]),
    springCerealSeedling({ es: 'La avena', en: 'Oat' }),
    airMin(['floracion'], 'at_or_below', fromF(32), {
      severity: 'warning',
      effect: 'Helada en floración: puede dejar estériles las flores de la avena',
      effectEn: 'Frost during flowering can leave oat florets sterile',
      advice: 'Con la avena en floración, una helada puede dejar flores sin polen y espiguillas vacías. Revisa las panojas en los días siguientes.',
      adviceEn: 'With oats in flower, a frost can leave florets without pollen and empty spikelets. Check the panicles over the following days.',
      note: 'California Agriculture asocia el daño por helada en espigadura de cebada, trigo, avena y centeno con mínimas de 29 a 35 °F (−1,7 a 1,7 °C); cerca de 32 °F (0 °C) las flores masculinas pueden quedar estériles. Las flores de avena y centeno suelen dañarse menos que las de trigo o cebada.',
      noteEn: 'California Agriculture associates frost injury at heading of barley, wheat, oats and rye with minimums of 29 to 35 °F (−1.7 to 1.7 °C); near 32 °F (0 °C) male flower parts may become sterile. Oat and rye florets are usually injured less than those of wheat or barley.',
      limitations: 'Observaciones de campo en California publicadas en 1964; la fuente da un rango de temperaturas y no una cifra única, y se usa 32 °F, el valor que asocia con la esterilidad.',
      limitationsEn: 'Field observations in California published in 1964; the source gives a temperature range rather than a single figure, and 32 °F, the value it links to sterility, is used.',
      evidence: [CALAG_OAT_FROST],
    }),
    WHEAT_FILL('avena', 'oat', {
      es: 'Sin fuente propia para avena en llenado de grano: se usa el criterio documentado para Trigo (Wheat), porque ambos son cereales de la familia de las gramíneas con el mismo órgano cosechado; Penn State considera a la avena menos rústica que el trigo, así que el daño podría empezar algo antes.',
      en: 'No source for oat during grain fill: the documented criterion for Trigo (Wheat) is used, because both are cereals of the grass family with the same harvested organ; Penn State considers oats less cold-hardy than wheat, so damage could begin somewhat earlier.',
    }),
    salt('Oats (Avena sativa)', null, 'moderately_tolerant'),
    fao56Water('Oats (Avena sativa)', 1.15, 0.55, 'flowering')),

  annual('sp.triticale',
    analogPh('sp.trigo', 'el triticale', 'triticale', 'Trigo', 'Wheat', 'el triticale es un híbrido de trigo y centeno con requerimientos edáficos análogos', 'triticale is a wheat by rye hybrid with analogous soil requirements', WHEAT_PH),
    wheatFreeze({ es: 'triticale', en: 'triticale' }, {
      es: 'Sin fuente propia para triticale: se usa el criterio documentado para Trigo (Wheat), porque el triticale es un híbrido de trigo y centeno; Penn State lo considera más rústico al frío que el trigo, así que la cifra es cauta.',
      en: 'No source for triticale: the documented criterion for Trigo (Wheat) is used, because triticale is a wheat by rye hybrid; Penn State considers it more cold-hardy than wheat, so the figure is cautious.',
    }).map(c => analog('sp.trigo', c)),
    salt('Triticale (X Triticosecale)', 6.1, 'tolerant'),
    analogWater('sp.trigo', 'el triticale', 'triticale', 'Trigo', 'Wheat', 'el triticale es un híbrido de trigo y centeno con sensibilidad hídrica equivalente en espigadura y floración', 'triticale is a wheat by rye hybrid with equivalent water sensitivity at heading and flowering', waterSensitive('Wheat', 'vegetative 0.2; flowering 0.6; yield formation 0.5', 0.6, 'flowering'))),

  annual('sp.arroz',
    ph(5.5, 7.0, 5.0, 7.5,
      {
        es: 'El arroz se adapta a suelos ligeramente ácidos a neutros, con un pH óptimo entre 5,5 y 7,0 y tolerancia de 5,0 a 7,5 bajo inundación.',
        en: 'Rice adapts to slightly acidic to neutral soils, with an optimum pH between 5.5 and 7.0 and tolerance from 5.0 to 7.5 under flooding.',
      },
      {
        es: 'Antecedentes de INIA para el cultivo de arroz inundado en Chile; la inundación tiende a estabilizar el pH hacia la neutralidad.',
        en: 'INIA background for flooded rice cultivation in Chile; flooding tends to buffer soil pH toward neutrality.',
      },
      [INIA_RICE_SOIL]),
    airMin(['vegetativo'], 'below', celsius(9), {
      severity: 'info',
      effect: 'Frío bajo 9 °C: retrasa el crecimiento del arroz',
      effectEn: 'Cold below 9 °C slows rice growth',
      advice: 'Con noches bajo 9 °C el arroz crece más lento y macolla menos. Tenlo en cuenta al programar el manejo del cultivo.',
      adviceEn: 'With nights below 9 °C rice grows more slowly and tillers less. Keep it in mind when planning crop management.',
      note: 'INIA indica temperaturas medias críticas bajas de 12 a 13 °C en plántula y de 9 a 16 °C en macolla, y que temperaturas bajo 20 °C en el establecimiento retrasan el crecimiento y reducen el vigor.',
      noteEn: 'INIA gives low critical mean temperatures of 12 to 13 °C at seedling and 9 to 16 °C at tillering, and states that temperatures below 20 °C during establishment delay growth and reduce vigor.',
      limitations: 'Las cifras de la fuente son temperaturas medias diarias y aquí se compara la mínima, que casi siempre es menor; por eso el criterio sólo informa. Se usa el extremo más bajo del rango de macolla. Hasta la elongación del tallo, los puntos de crecimiento están bajo el agua.',
      limitationsEn: 'The source figures are daily mean temperatures and here the minimum is compared, which is almost always lower; so the criterion is only informative. The lowest end of the tillering range is used. Until stem elongation, growing points are under water.',
      evidence: [INIA_RICE_CRITICAL, INIA_RICE_GROWTH],
    }),
    airMin(['floracion'], 'at_or_below', fromF(40), {
      severity: 'warning',
      effect: 'Frío de 4,4 °C o menos en formación de la panoja o floración: esteriliza el arroz',
      effectEn: 'Cold of 4.4 °C or lower during panicle formation or flowering causes rice sterility',
      advice: 'Con frío de 4,4 °C o menos mientras se forma la panoja o florece, el polen se forma mal y quedan granos vanos. Revisa cuántos granos vanos hay al cosechar.',
      adviceEn: 'With cold of 4.4 °C or lower while the panicle forms or flowers, pollen forms poorly and empty grains result. Check how many empty grains there are at harvest.',
      note: 'California Agriculture, citando a C. R. Adair (USDA), indica tres períodos sensibles del arroz al frío: 20 a 24 días antes de la espigadura, 12 a 14 días antes y la antesis, con una temperatura crítica del aire cercana a 40 °F (4,4 °C) que causa alta esterilidad.',
      noteEn: 'California Agriculture, citing C. R. Adair (USDA), gives three cold-sensitive periods in rice: 20 to 24 days before heading, 12 to 14 days before and anthesis, with a critical air temperature near 40 °F (4.4 °C) causing high sterility.',
      limitations: 'Los dos primeros períodos sensibles ocurren en las tres semanas previas a la espigadura, todavía en la etapa vegetativa de la app; si el arroz ya está cerca de espigar, el aviso también aplica.',
      limitationsEn: 'The first two sensitive periods occur in the three weeks before heading, still in the app vegetative stage; if the rice is close to heading, the warning also applies.',
      evidence: [CALAG_RICE_COLD],
    }),
    airMax(['floracion'], 'above', celsius(35), {
      severity: 'warning',
      effect: 'Calor sobre 35 °C en floración: causa esterilidad en el arroz',
      effectEn: 'Heat above 35 °C during flowering causes rice sterility',
      advice: 'Con calor sobre 35 °C en floración, parte de las flores no forma grano. Revisa la cantidad de granos vanos en la cosecha.',
      adviceEn: 'With heat above 35 °C at flowering, some flowers do not form grain. Check the share of empty grains at harvest.',
      note: 'INIA indica que temperaturas mayores a 35 °C en floración pueden causar distintos grados de esterilidad, y considera normal hasta un 15 % de esterilidad.',
      noteEn: 'INIA states that temperatures above 35 °C at flowering can cause varying degrees of sterility, and considers up to 15% sterility normal.',
      limitations: 'Se compara la máxima diaria pronosticada; la fuente no indica cuántas horas de calor producen el efecto.',
      limitationsEn: 'The forecast daily maximum is compared; the source does not state how many hours of heat cause the effect.',
      evidence: [INIA_RICE_GROWTH],
    }),
    airMin(['cosecha'], 'below', celsius(12), {
      severity: 'info',
      effect: 'Frío bajo 12 °C en madurez: alarga la maduración del arroz',
      effectEn: 'Cold below 12 °C at maturity lengthens rice ripening',
      advice: 'Con noches bajo 12 °C el grano madura más lento y de forma dispareja, y puede pesar menos. Considéralo al programar la cosecha.',
      adviceEn: 'With nights below 12 °C grain ripens more slowly and unevenly, and may weigh less. Keep it in mind when scheduling harvest.',
      note: 'INIA indica una temperatura media crítica baja de 12 a 18 °C en madurez, y que las bajas temperaturas alargan la madurez, la hacen irregular y reducen el peso de los granos.',
      noteEn: 'INIA gives a low critical mean temperature of 12 to 18 °C at maturity, and states that low temperatures lengthen maturity, make it uneven and reduce kernel weight.',
      limitations: 'Las cifras de la fuente son temperaturas medias diarias y aquí se compara la mínima, que casi siempre es menor; por eso el criterio sólo informa. Se usa el extremo más bajo del rango.',
      limitationsEn: 'The source figures are daily mean temperatures and here the minimum is compared, which is almost always lower; so the criterion is only informative. The lowest end of the range is used.',
      evidence: [INIA_RICE_CRITICAL, INIA_RICE_GROWTH],
    }),
    salt('Rice, paddy (Oryza sativa)', 3.0, 'moderately_sensitive'),
    fao56Water('Rice (Oryza sativa)', 1.2, 0.2, 'flowering')),

  annual('sp.raps',
    ph(5.8, 7.0, 5.5, 8.0,
      {
        es: 'El raps (canola) crece mejor en suelos con pH entre 5,8 y 7,0, tolerando un rango de 5,5 a 8,0.',
        en: 'Rapeseed (canola) grows best on soils with pH between 5.8 and 7.0, tolerating a range of 5.5 to 8.0.',
      },
      {
        es: 'Boletín A686 de NDSU Extension para producción comercial de canola/raps.',
        en: 'NDSU Extension bulletin A686 for commercial canola/rapeseed production.',
      },
      [NDSU_CANOLA_SOIL]),
    toleratesDownTo(['vegetativo'], fromF(24), { es: 'El raps', en: 'Rapeseed' },
      {
        es: 'NDSU indica que las plántulas de canola toleran la helada hasta 24 °F (−4,4 °C).',
        en: 'NDSU states that canola seedlings are frost tolerant down to 24 °F (−4.4 °C).',
      },
      {
        es: 'Cifra para plántulas; la tolerancia depende de la humedad de los tejidos, la duración del frío y el endurecimiento previo.',
        en: 'Figure for seedlings; tolerance depends on tissue moisture, cold duration and prior hardening.',
      },
      [NDSU_CANOLA_A686]),
    airMin(['floracion'], 'at_or_below', FROST, {
      severity: 'info',
      effect: 'Helada en floración: aborta las flores abiertas del raps',
      effectEn: 'Frost during flowering aborts open rapeseed flowers',
      advice: 'Una helada en floración hace caer las flores que estén abiertas esa noche, pero los botones siguen y la pérdida suele ser menor. Revisa el cultivo unos días después.',
      adviceEn: 'A frost at flowering makes the flowers open that night drop, but buds keep developing and the loss is usually minor. Check the crop a few days later.',
      note: 'NDSU indica que la helada en floración retrasa la madurez con pérdidas menores de rendimiento: aborta sólo las flores abiertas en ese momento, mientras las vainas inferiores y los botones siguen normalmente.',
      noteEn: 'NDSU states that frost at flowering delays maturity with only minor yield losses: it aborts only the flowers open at that moment, while lower pods and unopened buds develop normally.',
      limitations: NO_FROST_FIGURE,
      limitationsEn: NO_FROST_FIGURE_EN,
      evidence: [NDSU_CANOLA_FLOWER_FROST],
    }),
    airMin(['cosecha'], 'below', celsius(-2), {
      severity: 'warning',
      effect: 'Helada fuerte bajo −2 °C antes de cosechar: desgrane y semilla verde en el raps',
      effectEn: 'Heavy frost below −2 °C before harvest: pod shatter and green seed in rapeseed',
      advice: 'Con la semilla todavía húmeda, una helada bajo −2 °C puede hacer que las vainas se abran y la semilla quede verde. Revisa el cultivo esa tarde y decide si conviene hilerar.',
      adviceEn: 'With seed still moist, a frost below −2 °C can make pods shatter and seed stay green. Check the crop that afternoon and decide whether to swath.',
      note: 'El Canola Council of Canada define helada fuerte bajo −2 °C: el desgrane y la caída de vainas pueden empezar al día siguiente, y la semilla con más de 20 % de humedad se daña; la semilla verde es el principal castigo de calidad.',
      noteEn: 'The Canola Council of Canada defines heavy frost as below −2 °C: pod shatter and pod drop can begin within a day, and seed above 20% moisture is damaged; green seed is the main quality downgrade.',
      limitations: 'Aplica mientras la semilla tiene más de 20 % de humedad; con menos, la fuente indica que normalmente escapa al daño.',
      limitationsEn: 'It applies while seed moisture is above 20%; below that, the source indicates it normally escapes damage.',
      evidence: [CCC_FALL_FROST],
    }),
    airMin(['cosecha'], 'below', celsius(-5), {
      severity: 'danger',
      effect: 'Helada bajo −5 °C antes de cosechar: suele matar la semilla húmeda del raps',
      effectEn: 'Frost below −5 °C before harvest usually kills moist rapeseed',
      advice: 'Bajo −5 °C la semilla todavía húmeda suele morir y se pierde antes o durante la cosecha. Revisa el cultivo esa tarde.',
      adviceEn: 'Below −5 °C still-moist seed usually dies and is lost before or during harvest. Check the crop that afternoon.',
      note: 'El Canola Council of Canada indica que una helada de más de −5 °C suele ser letal para la semilla con mucha humedad, sobre todo con 40 % o más.',
      noteEn: 'The Canola Council of Canada states that frost beyond −5 °C is usually lethal for high-moisture seed, especially at 40% or more.',
      limitations: 'Aplica mientras la semilla tiene más de 20 % de humedad; con menos, la fuente indica que normalmente escapa al daño.',
      limitationsEn: 'It applies while seed moisture is above 20%; below that, the source indicates it normally escapes damage.',
      evidence: [CCC_FALL_FROST],
    }),
    salt('Rapeseed / Canola (Brassica campestris / napus)', 9.7, 'tolerant'),
    fao56Water('Canola / Rapeseed (Brassica napus)', 1.15, 0.6, 'flowering')),

  annual('sp.soya',
    ph(6.0, 7.0, 5.8, 7.5,
      {
        es: 'El cultivo de soya alcanza su óptimo en suelos con pH de 6,0 a 7,0, aceptable entre 5,8 y 7,5 para una buena nodulación.',
        en: 'Soybean production is optimal at a soil pH of 6.0 to 7.0, acceptable between 5.8 and 7.5 for effective nodulation.',
      },
      {
        es: 'Guía de fertilidad de NDSU Extension para soya; fuera del rango óptimo disminuye la fijación biológica de nitrógeno.',
        en: 'NDSU Extension soybean fertility guide; outside the optimum range biological nitrogen fixation decreases.',
      },
      [NDSU_SOYBEAN_SOIL]),
    airMin(ALL_STAGES, 'at_or_below', fromF(32), {
      severity: 'warning',
      effect: 'Helada de 0 °C o menos: daña las hojas superiores de la soya',
      effectEn: 'Frost of 0 °C or lower injures upper soybean leaves',
      advice: 'Con 0 °C o menos se dañan las hojas de arriba de la soya; si el grano todavía se está llenando, baja el rendimiento. Revisa el cultivo unos días después.',
      adviceEn: 'At 0 °C or lower upper soybean leaves are damaged; if the seed is still filling, yield falls. Check the crop a few days later.',
      note: 'NDSU indica que las hojas superiores de la soya se dañan fácilmente con heladas de 30 a 32 °F (−1,1 a 0 °C), y que las mayores pérdidas ocurren con helada en R5 (inicio del llenado de grano).',
      noteEn: 'NDSU states that upper soybean leaves are easily damaged by frost of 30 to 32 °F (−1.1 to 0 °C), and that the greatest yield losses occur with frost at R5 (beginning seed).',
      limitations: 'Más allá de R7 (una vaina con color maduro en el tallo principal) la helada ya no reduce el rendimiento; plantas recién emergidas toleran algo más de frío.',
      limitationsEn: 'Beyond R7 (one pod with mature color on the main stem) frost no longer reduces yield; newly emerged plants tolerate somewhat more cold.',
      evidence: [NDSU_SOYBEAN_FROST],
    }),
    airMin(ALL_STAGES, 'below', fromF(30), {
      severity: 'danger',
      effect: 'Helada bajo −1,1 °C: puede matar la planta de soya',
      effectEn: 'Frost below −1.1 °C can kill soybean plants',
      advice: 'Bajo −1,1 °C por varias horas puede morir la planta completa, tallos y hojas. Revisa el cultivo unos días después.',
      adviceEn: 'Below −1.1 °C for several hours the whole plant, stems and leaves, can die. Check the crop a few days later.',
      note: 'NDSU indica que temperaturas bajo 30 °F (−1,1 °C) por un período prolongado pueden matar las plantas de soya, tallos y hojas.',
      noteEn: 'NDSU states that temperatures below 30 °F (−1.1 °C) for an extended period can kill soybean plants, stems and leaves.',
      limitations: 'La fuente habla de un período prolongado sin fijar horas; el pronóstico sólo compara la mínima diaria. Más allá de R7 la helada ya no reduce el rendimiento.',
      limitationsEn: 'The source refers to an extended period without setting hours; the forecast only compares the daily minimum. Beyond R7 frost no longer reduces yield.',
      evidence: [NDSU_SOYBEAN_FROST],
    }),
    salt('Soybean (Glycine max)', 5.0, 'moderately_tolerant'),
    waterSensitive('Soybean', 'vegetative 0.2; flowering 0.8; yield formation 1.0', 0.8, 'flowering')),

  annual('sp.remolacha',
    ph(6.0, 8.0, 6.0, null,
      {
        es: 'La remolacha azucarera crece mejor con pH 6,0 a 8,0; la fuente indica no cultivarla bajo 6,0 hasta encalar.',
        en: 'Sugar beet grows best at pH 6.0 to 8.0; the source advises not growing it below 6.0 until the soil is limed.',
      },
      {
        es: 'Manual de cultivos alternativos para el norte del Medio Oeste de Estados Unidos (1991); no fija un máximo.',
        en: 'Alternative field crops manual for the northern US Midwest (1991); it sets no maximum.',
      },
      [PURDUE_SUGARBEET]),
    toleratesDownTo(ALL_STAGES, fromF(28), { es: 'La remolacha azucarera', en: 'Sugar beet' },
      {
        es: 'Por analogía con betarraga: las fuentes la clasifican como tolerante a heladas leves de 28 a 32 °F (−2,2 a 0 °C).',
        en: 'By analogy with beetroot: sources classify it as tolerant of light freezes of 28 to 32 °F (−2.2 to 0 °C).',
      },
      {
        es: 'Sin fuente propia para remolacha azucarera: se usa el criterio documentado para Betarraga (Beetroot), porque ambas son la misma especie botánica (Beta vulgaris) y se cosecha la raíz. Purdue indica que la plántula de remolacha azucarera ha resistido temperaturas de mediados de los veinte °F, coherente con este valor.',
        en: 'No source for sugar beet: the documented criterion for Betarraga (Beetroot) is used, because both are the same botanical species (Beta vulgaris) and the root is harvested. Purdue states that sugar beet seedlings have survived temperatures in the mid-twenties °F, consistent with this value.',
      },
      [inia165('weak'), nebraska('tolerant', 'Beet'), sdsu('light', 'Beets')]).map(c => analog('sp.betarraga', c)),
    salt('Sugarbeet (Beta vulgaris)', 7.0, 'tolerant'),
    waterSensitive('Sugarbeet', 'total growing period 0.6-1.0', 0.6, 'vegetative')),

  annual('sp.lupino',
    LUPIN_PH,
    airMax(['floracion', 'cosecha'], 'at_or_above', fromF(80), {
      severity: 'warning',
      effect: 'Calor de 26,7 °C o más en floración o llenado de vainas: aborta flores del lupino',
      effectEn: 'Heat of 26.7 °C or more at flowering or pod fill aborts lupin flowers',
      advice: 'Con dos días de calor de 26,7 °C o más en floración o mientras se llenan las vainas, el lupino bota flores y puede bajar el rendimiento. Mantén el riego si puedes.',
      adviceEn: 'With two days of heat of 26.7 °C or more at flowering or while pods fill, lupin drops flowers and yield may fall. Keep irrigating if you can.',
      note: 'Oregon State indica que el calor sobre 80 °F (26,7 °C) aumenta el aborto floral, y que estudios en Australia mostraron que incluso 2 días de 80 °F o más en floración o llenado de vainas abortan flores y reducen el rendimiento.',
      noteEn: 'Oregon State states that heat above 80 °F (26.7 °C) increases flower abortion, and that studies in Australia showed even 2 days of 80 °F or more at bloom or pod fill abort blossoms and reduce yield.',
      limitations: 'En cosecha aplica mientras las vainas se llenan; con el grano ya maduro (alrededor de 40 % de humedad) la fuente no indica daño. Guía para lupino de hoja angosta.',
      limitationsEn: 'At harvest it applies while pods are filling; with mature grain (about 40% moisture) the source indicates no damage. Guide for narrow-leaf lupin.',
      evidence: [OSU_LUPIN_CLIMATE],
    }),
    airMin(['floracion'], 'below', fromF(50), {
      severity: 'info',
      effect: 'Frío bajo 10 °C en floración: aumenta el aborto de flores del lupino',
      effectEn: 'Cold below 10 °C at flowering increases lupin flower abortion',
      advice: 'Con noches bajo 10 °C en floración el lupino bota más flores. Es normal que caigan muchas; revisa cuántas vainas quedan.',
      adviceEn: 'With nights below 10 °C at flowering, lupin drops more flowers. Many dropping is normal; check how many pods set.',
      note: 'Oregon State indica que las bajas temperaturas en floración (bajo 50 °F, 10 °C) intensifican el aborto floral, que en lupino es normal y alcanza 80 a 90 % de las flores del tallo principal.',
      noteEn: 'Oregon State states that low temperatures at flowering (below 50 °F, 10 °C) intensify flower abortion, which in lupin is normal and reaches 80 to 90% of main-stem flowers.',
      limitations: 'Se compara la mínima diaria pronosticada, que en muchas zonas de Chile baja de 10 °C en primavera; por eso el criterio sólo informa.',
      limitationsEn: 'The forecast daily minimum is compared, which in many parts of Chile drops below 10 °C in spring; so the criterion is only informative.',
      evidence: [OSU_LUPIN_CLIMATE],
    }),
    analogSalt('sp.soya', 'el lupino', 'lupin', 'Soya', 'Soybean', 'ambas son leguminosas de grano anual de la familia Fabaceae', 'both are annual grain legumes of the family Fabaceae', 'Soybean (Glycine max)', 5.0, 'moderately_tolerant'),
    fao56Water('Legumes — Lupin (Lupinus spp.)', 1.15, 0.5, 'flowering')),

  annual('sp.achicoria',
    ph(6.0, 7.0, null, null,
      {
        es: 'Para achicoria de raíz la fuente indica pH 6 en suelos livianos y pH 7 en suelos francos pesados.',
        en: 'For root chicory the source indicates pH 6 on light soils and pH 7 on heavy loam soils.',
      },
      {
        es: 'Ficha de achicoria industrial (de raíz) del Ministerio de Agricultura de Ontario; como la sonda no mide la textura, el óptimo abarca ambos valores. No fija límites de daño.',
        en: 'Industrial (root) chicory sheet from the Ontario Ministry of Agriculture; since the probe does not measure texture, the optimum spans both values. It sets no damage limits.',
      },
      [OMAFRA_CHICORY]),
    airMin(['vegetativo'], 'at_or_below', FROST, {
      severity: 'warning',
      effect: 'Helada prevista: las plántulas de achicoria son sensibles',
      effectEn: 'Frost forecast: chicory seedlings are sensitive',
      advice: 'Las plántulas jóvenes de achicoria se dañan con la helada. Si el cultivo recién emergió, revísalo después de la helada.',
      adviceEn: 'Young chicory seedlings are damaged by frost. If the crop has just emerged, check it after the frost.',
      note: 'La ficha de achicoria de raíz del Ministerio de Agricultura de Ontario la clasifica como sensible a la helada en plántula.',
      noteEn: 'The Ontario Ministry of Agriculture root chicory sheet classifies it as frost sensitive as a young seedling.',
      limitations: `${NO_FROST_FIGURE} Las plantas ya establecidas toleran más frío.`,
      limitationsEn: `${NO_FROST_FIGURE_EN} Established plants tolerate more cold.`,
      evidence: [OMAFRA_CHICORY],
    }),
    airMin(['cosecha'], 'at_or_below', FROST, {
      severity: 'warning',
      effect: 'Helada en cosecha: baja la calidad de la inulina de la raíz de achicoria',
      effectEn: 'Frost at harvest lowers chicory root inulin quality',
      advice: 'La raíz de achicoria se cosecha antes de la primera helada, porque después baja la calidad de la inulina. Si está lista, considera cosecharla antes.',
      adviceEn: 'Chicory root is harvested before the first frost, because inulin quality declines afterwards. If it is ready, consider harvesting before the frost.',
      note: 'La ficha indica que las raíces se cosechan a fines de otoño antes de la primera helada, después de la cual baja la calidad de la inulina.',
      noteEn: 'The sheet states that roots are harvested in late fall before the first frost, after which inulin quality declines.',
      limitations: NO_FROST_FIGURE,
      limitationsEn: NO_FROST_FIGURE_EN,
      evidence: [OMAFRA_CHICORY],
    }),
    analogSalt('sp.lechuga', 'la achicoria', 'chicory', 'Lechuga', 'Lettuce', 'ambas pertenecen a la familia Asteraceae (tribu Cichorieae)', 'both belong to the family Asteraceae (tribe Cichorieae)', 'Lettuce (Lactuca sativa)', 1.3, 'moderately_sensitive'),
    fao56Water('Roots and Tubers — Chicory root (Cichorium intybus)', 1.1, 0.5, 'vegetative')),

  // --- Forrajeras ---
  perennial('sp.alfalfa',
    ph(6.5, 7.0, 6.2, 7.5,
      {
        es: 'La alfalfa requiere un pH entre 6,5 y 7,0 para una nodulación y persistencia óptimas, con un rango aceptable de 6,2 a 7,5.',
        en: 'Alfalfa requires a pH between 6.5 and 7.0 for optimal nodulation and stand persistence, with an acceptable range of 6.2 to 7.5.',
      },
      {
        es: 'Guía agronómica de Penn State Extension para alfalfa; bajo 6,2 se resiente la fijación simbiótica de Sinorhizobium meliloti.',
        en: 'Penn State Extension Agronomy Guide for alfalfa; below 6.2 symbiotic fixation by Sinorhizobium meliloti is impaired.',
      },
      [PSU_ALFALFA_SOIL]),
    toleratesDownTo(GROWING, fromF(24), { es: 'La alfalfa', en: 'Alfalfa' },
      {
        es: 'Penn State indica que la noche debe bajar a 24 °F (−4,4 °C) o menos por cuatro horas o más para congelar el punto de crecimiento de la alfalfa, y que temperaturas de 28 a 32 °F no la dañan. South Dakota State observa daño severo bajo 25 °F por cuatro horas o más.',
        en: 'Penn State states that nights must fall to 24 °F (−4.4 °C) or lower for four hours or more to freeze the alfalfa meristem, and that 28 to 32 °F does not damage it. South Dakota State reports severe damage below 25 °F for four hours or more.',
      },
      {
        es: 'Las fuentes exigen cuatro horas o más de frío; el pronóstico sólo compara la mínima diaria. Plántulas que pasaron la segunda hoja trifoliada son más sensibles.',
        en: 'Sources require four hours or more of cold; the forecast only compares the daily minimum. Seedlings past the second trifoliate leaf are more sensitive.',
      },
      [PSU_ALFALFA_FREEZE, SDSU_ALFALFA_FROST]),
    forageRain({ es: 'alfalfa', en: 'alfalfa' },
      {
        es: 'University of Wisconsin indica que la lluvia entre el corte y la cosecha del forraje causa pérdidas de rendimiento y de calidad; en Wisconsin, una pulgada (25 mm) de lluvia tras un día de secado causó 22 % de pérdida de materia seca en alfalfa.',
        en: 'University of Wisconsin states that rain between cutting and harvesting forage causes yield and quality losses; in Wisconsin, one inch (25 mm) of rain after one day of curing caused 22% dry matter loss in alfalfa.',
      },
      {
        es: `${RAIN_RULE} Aplica cuando se corta para heno o ensilaje; en pastoreo directo no corresponde.`,
        en: `${RAIN_RULE_EN} It applies when cutting for hay or silage; it does not apply to direct grazing.`,
      },
      [UW_HAY_RAIN]),
    salt('Alfalfa (Medicago sativa)', 2.0, 'moderately_sensitive'),
    waterSensitive('Alfalfa', 'total growing period 0.7-1.1', 0.7, 'vegetative')),

  perennial('sp.trebol-rosado',
    RED_CLOVER_PH,
    toleratesDownTo(GROWING, fromF(24), { es: 'El trébol rosado', en: 'Red clover' },
      {
        es: 'Por analogía con alfalfa: Penn State indica que la noche debe bajar a 24 °F (−4,4 °C) o menos por cuatro horas o más para congelar el punto de crecimiento, y que temperaturas de 28 a 32 °F no lo dañan.',
        en: 'By analogy with alfalfa: Penn State states that nights must fall to 24 °F (−4.4 °C) or lower for four hours or more to freeze the growing point, and that 28 to 32 °F does not damage it.',
      },
      {
        es: 'Sin fuente propia para trébol rosado: se usa el criterio documentado para Alfalfa (Alfalfa), porque ambas son leguminosas forrajeras perennes de la tribu Trifolieae. Las fuentes exigen cuatro horas o más de frío; el pronóstico sólo compara la mínima diaria.',
        en: 'No source for red clover: the documented criterion for Alfalfa (Alfalfa) is used, because both are perennial forage legumes of the tribe Trifolieae. Sources require four hours or more of cold; the forecast only compares the daily minimum.',
      },
      [PSU_ALFALFA_FREEZE, SDSU_ALFALFA_FROST]).map(c => analog('sp.alfalfa', c)),
    analog('sp.alfalfa', forageRain({ es: 'trébol rosado', en: 'red clover' },
      {
        es: 'Por analogía con alfalfa: University of Wisconsin indica que la lluvia entre el corte y la cosecha del forraje causa pérdidas de rendimiento y de calidad.',
        en: 'By analogy with alfalfa: University of Wisconsin states that rain between cutting and harvesting forage causes yield and quality losses.',
      },
      {
        es: `Sin fuente propia para trébol rosado: se usa el criterio documentado para Alfalfa (Alfalfa), porque ambas son leguminosas forrajeras que se cortan para heno y pierden hojas al mojarse. ${RAIN_RULE}`,
        en: `No source for red clover: the documented criterion for Alfalfa (Alfalfa) is used, because both are forage legumes cut for hay that lose leaves when wet. ${RAIN_RULE_EN}`,
      },
      [UW_HAY_RAIN])),
    salt('Clover, red (Trifolium pratense)', 1.5, 'moderately_sensitive'),
    fao56Water('Clover hay, Berseem (Trifolium spp.)', 1.15, 0.5, 'vegetative')),

  annual('sp.ballica',
    ph(5.5, 7.5, 5.0, 7.8,
      {
        es: 'La ballica crece mejor con pH 5,5 a 7,5 y tolera de 5,0 a 7,8: bajo 5,0 puede haber toxicidad de aluminio, y con pH más alto, clorosis por falta de hierro y manganeso.',
        en: 'Ryegrass grows best at pH 5.5 to 7.5 and tolerates 5.0 to 7.8: below 5.0 aluminum toxicity may occur, and at higher pH, chlorosis from iron and manganese deficiency.',
      },
      {
        es: 'Guía de ballica anual (Lolium multiflorum) del noroeste de Estados Unidos; la ballica perenne puede diferir.',
        en: 'Annual ryegrass (Lolium multiflorum) guide for the US Pacific Northwest; perennial ryegrass may differ.',
      },
      [OSU_RYEGRASS_SOIL]),
    toleratesDownTo(['vegetativo'], celsius(-6), { es: 'La ballica', en: 'Ryegrass' },
      {
        es: 'Por analogía con avena: Manitoba Agriculture indica que las gramíneas de primavera toleran temperaturas de hasta −6 °C mientras el punto de crecimiento sigue bajo la superficie del suelo.',
        en: 'By analogy with oat: Manitoba Agriculture states that spring grasses tolerate temperatures as low as −6 °C while the growing point is still below the soil surface.',
      },
      {
        es: 'Sin fuente propia para ballica: se usa el criterio documentado para Avena (Oat), porque ambas son gramíneas de estación fría (Poaceae) con punto de crecimiento basal protegido antes del encañado.',
        en: 'No source for ryegrass: the documented criterion for Avena (Oat) is used, because both are cool-season grasses (Poaceae) with a basal growing point protected before jointing.',
      },
      [MANITOBA_CEREALS]).map(c => analog('sp.avena', c)),
    forageRain({ es: 'ballica', en: 'ryegrass' },
      {
        es: 'Oregon State no recomienda henificar ballica anual en zonas lluviosas o húmedas, porque necesita buen tiempo de secado, y Penn State indica que la ballica tiene menos materia seca que otras gramíneas y requiere más tiempo de secado antes de enfardar.',
        en: 'Oregon State does not recommend making annual ryegrass hay in rainy or humid areas, because it needs good curing weather, and Penn State states that ryegrass has less dry matter than other grasses and needs longer curing before baling.',
      },
      {
        es: `${RAIN_RULE} Aplica cuando se corta para heno; en pastoreo o ensilaje directo el riesgo es menor.`,
        en: `${RAIN_RULE_EN} It applies when cutting for hay; for grazing or direct silage the risk is lower.`,
      },
      [OSU_RYEGRASS_HAY, PSU_RYEGRASS_HAY]),
    salt('Ryegrass, perennial (Lolium perenne)', 5.6, 'moderately_tolerant'),
    fao56Water('Rye Grass Hay (Lolium spp.)', 1.05, 0.6, 'vegetative')),

  annual('sp.col-forrajera',
    BRASSICA_PH,
    toleratesDownTo(ALL_STAGES, fromF(10), { es: 'La col forrajera', en: 'Forage kale' },
      {
        es: 'Mississippi State indica que la col forrajera tolera el frío y sobrevive hasta 10 °F (−12,2 °C), y University of Wisconsin que las brásicas mantienen su calidad con temperaturas bajo cero si no han florecido.',
        en: 'Mississippi State states that forage kale is cold tolerant and survives down to 10 °F (−12.2 °C), and University of Wisconsin that brassicas keep their quality well into freezing temperatures if not heading.',
      },
      {
        es: 'Cifras para cultivos establecidos usados en pastoreo de otoño e invierno; plántulas recién emergidas son más sensibles.',
        en: 'Figures for established crops used for fall and winter grazing; newly emerged seedlings are more sensitive.',
      },
      [MSSTATE_BRASSICA, UW_BRASSICA]),
    analogSalt('sp.repollo', 'la col forrajera', 'forage kale', 'Repollo', 'Cabbage', 'ambas son variedades de la misma especie botánica (Brassica oleracea) cosechadas por su follaje', 'both are varieties of the same botanical species (Brassica oleracea) harvested for their foliage', 'Cabbage (Brassica oleracea capitata)', 1.8, 'moderately_sensitive'),
    fao56Water('Brassica crops — Forage kale (Brassica oleracea)', 1.05, 0.45, 'vegetative')),

  // --- Forestales ---
  perennial('sp.eucalipto',
    ph(5.0, 6.5, 4.5, 7.0,
      {
        es: 'El eucalipto se establece preferentemente en suelos ligeramente ácidos con pH óptimo de 5,0 a 6,5, tolerando de 4,5 a 7,0.',
        en: 'Eucalyptus is preferably established on slightly acidic soils with an optimum pH of 5.0 to 6.5, tolerating 4.5 to 7.0.',
      },
      {
        es: 'Antecedentes de sitio y suelo de INFOR para plantaciones de Eucalyptus spp. en el centro-sur de Chile.',
        en: 'INFOR site and soil records for Eucalyptus spp. plantations in south-central Chile.',
      },
      [INFOR_EUCALYPTUS_SOIL]),
    airMin(ALL_STAGES, 'at_or_below', celsius(-7.1), {
      severity: 'danger',
      effect: 'Helada de −7,1 °C o menos: daño grave en eucaliptos jóvenes',
      effectEn: 'Frost of −7.1 °C or lower: severe injury to young eucalyptus',
      advice: 'Con −7,1 °C o menos se puede perder buena parte del follaje de plantas jóvenes de eucalipto y aumentar la mortalidad. Revisa la plantación después de la helada.',
      adviceEn: 'At −7.1 °C or lower young eucalyptus can lose much of their foliage and mortality rises. Check the plantation after the frost.',
      note: 'Un estudio de la Universidad de Concepción midió en plántulas de Eucalyptus globulus una temperatura letal para la mitad del tejido de la hoja (LT50) desde −7,1 °C en las procedencias menos resistentes hasta menos de −9 °C en las más resistentes. INFOR documenta grandes pérdidas de plantaciones de E. globulus por heladas y reconoce a E. nitens como una de las especies más resistentes al frío.',
      noteEn: 'A Universidad de Concepcion study measured in Eucalyptus globulus seedlings a temperature lethal to half of the leaf tissue (LT50) from −7.1 °C in the least resistant provenances to below −9 °C in the most resistant. INFOR documents large losses of E. globulus plantations to frost and recognizes E. nitens as one of the most cold-resistant species.',
      limitations: 'Medido en plántulas endurecidas de E. globulus; plantas sin endurecer o heladas fuera de temporada dañan antes, y E. nitens tolera bastante más frío. En una plantación forestal la floración y la cosecha no tienen el sentido de un cultivo, así que el criterio del árbol cubre las tres etapas.',
      limitationsEn: 'Measured on hardened E. globulus seedlings; unhardened plants or out-of-season frosts cause damage sooner, and E. nitens tolerates much more cold. In a forest plantation flowering and harvest do not mean what they do for a crop, so the tree criterion covers all three stages.',
      evidence: [UDEC_EUCALYPTUS_FREEZE, INFOR_EUCALYPTUS],
    }),
    analogSalt('sp.olivo', 'el eucalipto', 'eucalyptus', 'Olivo', 'Olive', 'ante la falta de curva para especies forestales en FAO 29 se usa un árbol leñoso perenne moderadamente tolerante de referencia', 'in the absence of a curve for forestry species in FAO 29, a moderately tolerant perennial woody tree is used as reference', 'Olive (Olea europaea)', null, 'moderately_tolerant'),
    fao56Water('Trees — Eucalyptus / Fast-growing broadleaf', 1.0, 0.65, 'vegetative')),

  perennial('sp.pino-radiata',
    ph(4.5, 6.0, 4.0, 6.5,
      {
        es: 'El pino radiata prospera en suelos ácidos a ligeramente ácidos, con un pH óptimo de 4,5 a 6,0 y tolerancia de 4,0 a 6,5.',
        en: 'Monterey pine thrives in acidic to slightly acidic soils, with an optimum pH of 4.5 to 6.0 and tolerance from 4.0 to 6.5.',
      },
      {
        es: 'Antecedentes edáficos de INFOR para plantaciones de Pinus radiata en Chile.',
        en: 'INFOR soil records for Pinus radiata plantations in Chile.',
      },
      [INFOR_PINE_SOIL]),
    airMin(ALL_STAGES, 'at_or_below', celsius(-3), {
      severity: 'warning',
      effect: 'Helada de −3 °C o menos en temporada de crecimiento: daña el follaje de pinos jóvenes',
      effectEn: 'Frost of −3 °C or lower in the growing season injures young pine foliage',
      advice: 'En primavera y verano, una helada de −3 °C o menos puede dañar los brotes y el follaje de plantas de pino de menos de dos años. Revisa la plantación después de la helada.',
      adviceEn: 'In spring and summer, a frost of −3 °C or lower can damage shoots and foliage of pine seedlings under two years old. Check the plantation after the frost.',
      note: 'Un estudio del Colegio de Postgraduados (México) indica que las heladas dañan las plantaciones de pino radiata en etapa de plántula, y que el follaje de plántulas de menos de dos años se deteriora entre −3 y −6 °C en verano y entre −12 y −14 °C en invierno.',
      noteEn: 'A Colegio de Postgraduados (Mexico) study states that frost damages radiata pine plantations at the seedling stage, and that foliage of seedlings under two years old deteriorates between −3 and −6 °C in summer and between −12 and −14 °C in winter.',
      limitations: 'Vale para plántulas de menos de dos años en temporada de crecimiento; en invierno toleran −12 a −14 °C y los árboles adultos bastante más. Para el pino, la «floración» corresponde a los estróbilos y la «cosecha» a la plantación lista para cortar: el criterio del árbol cubre las tres etapas.',
      limitationsEn: 'It applies to seedlings under two years old in the growing season; in winter they tolerate −12 to −14 °C and adult trees much more. For pine, "flowering" means the strobili and "harvest" the stand ready to cut: the tree criterion covers all three stages.',
      evidence: [CHAPINGO_RADIATA],
    }),
    analogSalt('sp.manzano', 'el pino radiata', 'Monterey pine', 'Manzano', 'Apple', 'ante la falta de curva para coníferas forestales en FAO 29 se usa un árbol leñoso templado sensible a las sales de referencia', 'in the absence of a curve for forestry conifers in FAO 29, a salt-sensitive temperate woody tree is used as reference', 'Apple (Malus sylvestris)', null, 'sensitive'),
    fao56Water('Conifer Trees', 1.0, 0.7, 'vegetative')),
];
