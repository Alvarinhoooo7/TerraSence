/**
 * Lista de especies que el agricultor puede indicar en vegetativo, floración y cosecha.
 *
 * Es identidad, no agronomía: nombre, nombre científico, grupo, sinónimos y la fuente
 * oficial que acredita que la especie se cultiva en Chile. Ningún umbral vive aquí; los
 * criterios por etapa se incorporan aparte con su propia evidencia, en speciesRules.ts
 * (TASK ES6), y `hasStageCriteria` informa honestamente cuándo todavía no existen.
 *
 * Criterio de inclusión y fuentes: TASK_MOTOR_AGRONOMICO.md, sección ES1.
 */
import type { PhenologicalStage } from '../types/app';
import { hasEnabledCriteria } from './speciesRules';

export const SPECIES_CATALOG_VERSION = '2.2.0';

/** Valor de `crop_id` cuando la medición no tiene especie (saltada o pre-siembra). */
export const NO_SPECIES_ID = 'sin_especificar';

export type SpeciesGroup = 'hortalizas' | 'frutales' | 'berries' | 'cultivos' | 'forrajeras' | 'aromaticas' | 'forestales';

export type SpeciesSourceId =
  | 'ine-esh-2023' | 'ine-ena-2025-26' | 'ciren-odepa-catastro' | 'odepa-mayoristas-2025'
  | 'sag-catastro-viticola-2024' | 'infor-anuario-2025';

export interface SpeciesSource {
  title: string;
  url: string;
  /** Qué acredita la fuente para la lista. */
  scope: string;
}

/** Consultadas el 2026-10-11. */
export const SPECIES_SOURCES: Record<SpeciesSourceId, SpeciesSource> = {
  'ine-esh-2023': {
    title: 'INE, Encuesta de superficie hortícola 2023',
    url: 'https://bibliotecadigital.odepa.gob.cl/items/a4e3ae62-900d-41d0-9b23-c94c3ed08a54',
    scope: 'Superficie nacional de hortalizas y frutilla',
  },
  'ine-ena-2025-26': {
    title: 'INE–ODEPA, Encuesta Nacional Agropecuaria 2025/26',
    url: 'https://bibliotecadigital.odepa.gob.cl/items/d1424b0a-f70b-4549-8758-f157a2c9c371',
    scope: 'Superficie de cereales, legumbres, tubérculos, industriales, hortalizas y forrajeras',
  },
  'ciren-odepa-catastro': {
    title: 'CIREN–ODEPA, Catastro frutícola (catastros regionales 2019–2025)',
    url: 'https://datos.odepa.gob.cl/dataset/catastro-fruticola',
    scope: 'Superficie frutícola por especie',
  },
  'odepa-mayoristas-2025': {
    title: 'ODEPA, Precios mayoristas de frutas y hortalizas 2025',
    url: 'https://datos.odepa.gob.cl/dataset/precios-mayoristas-de-frutas-y-hortalizas',
    scope: 'Productos transados con origen en regiones de Chile',
  },
  'sag-catastro-viticola-2024': {
    title: 'SAG, Catastro vitícola nacional 2024',
    url: 'https://www.sag.gob.cl/sites/default/files/Informe%20ejecutivo%20Catastro%202024%20v2.0.pdf',
    scope: 'Superficie de vides para vino y pisco',
  },
  'infor-anuario-2025': {
    title: 'INFOR, Anuario forestal 2025',
    url: 'https://bibliotecadigital.infor.cl/handle/20.500.12220/33115',
    scope: 'Superficie de plantaciones forestales por especie',
  },
};

export interface SpeciesGroupInfo {
  id: SpeciesGroup;
  es: string;
  en: string;
  /** La lista no pretende ser exhaustiva en este grupo. */
  partial: boolean;
}

export const SPECIES_GROUPS: readonly SpeciesGroupInfo[] = [
  { id: 'hortalizas', es: 'Hortalizas', en: 'Vegetables', partial: false },
  { id: 'frutales', es: 'Frutales', en: 'Fruit trees', partial: false },
  { id: 'berries', es: 'Berries', en: 'Berries', partial: false },
  { id: 'cultivos', es: 'Cereales, legumbres e industriales', en: 'Grains, pulses and industrial crops', partial: false },
  { id: 'forrajeras', es: 'Forrajeras', en: 'Forage crops', partial: false },
  { id: 'aromaticas', es: 'Aromáticas', en: 'Herbs', partial: true },
  { id: 'forestales', es: 'Árboles forestales', en: 'Forestry trees', partial: true },
];

export interface SpeciesEntry {
  /** `sp.<nombre>`: distinto de los IDs del prototipo, que ya existen en mediciones antiguas. */
  id: string;
  group: SpeciesGroup;
  es: string;
  en: string;
  scientific: string;
  synonymsEs: readonly string[];
  synonymsEn: readonly string[];
  /** Nombre exacto con que cada fuente registra la especie. */
  sources: Partial<Record<SpeciesSourceId, readonly string[]>>;
}

type Sources = SpeciesEntry['sources'];
const ESH = 'ine-esh-2023', ENA = 'ine-ena-2025-26', CAT = 'ciren-odepa-catastro', MAY = 'odepa-mayoristas-2025';

const sp = (id: string, group: SpeciesGroup, es: string, en: string, scientific: string,
  synonymsEs: string[], synonymsEn: string[], sources: Sources): SpeciesEntry =>
  ({ id: `sp.${id}`, group, es, en, scientific, synonymsEs, synonymsEn, sources });

export const SPECIES: readonly SpeciesEntry[] = [
  // --- Hortalizas ---
  sp('acelga', 'hortalizas', 'Acelga', 'Swiss chard', 'Beta vulgaris subsp. vulgaris (grupo Cicla)', [], ['chard'],
    { [ESH]: ['Acelga'], [ENA]: ['Acelga'], [MAY]: ['Acelga'] }),
  sp('aji', 'hortalizas', 'Ají', 'Chili pepper', 'Capsicum spp.', ['chile'], ['hot pepper', 'chilli'],
    { [ESH]: ['Ají'], [MAY]: ['Ají'] }),
  sp('ajo', 'hortalizas', 'Ajo', 'Garlic', 'Allium sativum', [], [], { [ESH]: ['Ajo'], [MAY]: ['Ajo'] }),
  sp('alcachofa', 'hortalizas', 'Alcachofa', 'Artichoke', 'Cynara cardunculus var. scolymus', ['alcaucil'], [],
    { [ESH]: ['Alcachofa'], [MAY]: ['Alcachofa'] }),
  sp('apio', 'hortalizas', 'Apio', 'Celery', 'Apium graveolens var. dulce', [], [], { [ESH]: ['Apio'], [MAY]: ['Apio', 'Ramas de apio'] }),
  sp('arveja', 'hortalizas', 'Arveja', 'Pea', 'Pisum sativum', ['arveja verde', 'guisante', 'chícharo'], ['green pea', 'garden pea'],
    { [ESH]: ['Arveja Verde'], [ENA]: ['Arveja verde'], [MAY]: ['Arveja Verde'] }),
  sp('berenjena', 'hortalizas', 'Berenjena', 'Eggplant', 'Solanum melongena', [], ['aubergine'], { [MAY]: ['Berenjena'] }),
  sp('betarraga', 'hortalizas', 'Betarraga', 'Beetroot', 'Beta vulgaris subsp. vulgaris (grupo Conditiva)', ['beterraga', 'remolacha de mesa', 'betabel'], ['beet', 'red beet'],
    { [ESH]: ['Betarraga'], [MAY]: ['Betarraga'] }),
  sp('brocoli', 'hortalizas', 'Brócoli', 'Broccoli', 'Brassica oleracea var. italica', ['brécol'], [], { [ESH]: ['Brócoli'], [MAY]: ['Brócoli'] }),
  sp('caigua', 'hortalizas', 'Caigua', 'Caigua', 'Cyclanthera pedata', ['achocha'], ['stuffing cucumber'], { [MAY]: ['Caigua'] }),
  sp('camote', 'hortalizas', 'Camote', 'Sweet potato', 'Ipomoea batatas', ['batata', 'boniato'], [], { [MAY]: ['Camote'] }),
  sp('cebolla', 'hortalizas', 'Cebolla', 'Onion', 'Allium cepa', ['cebolla de guarda', 'cebolla temprana'], [],
    { [ESH]: ['Cebolla de guarda', 'Cebolla temprana'], [ENA]: ['Cebolla'], [MAY]: ['Cebolla'] }),
  sp('cebollin', 'hortalizas', 'Cebollín', 'Green onion', 'Allium fistulosum', ['cebolla de verdeo', 'cebolleta', 'cebollín baby'], ['scallion', 'spring onion', 'welsh onion'],
    { [MAY]: ['Cebollín', 'Cebollín baby'] }),
  sp('coliflor', 'hortalizas', 'Coliflor', 'Cauliflower', 'Brassica oleracea var. botrytis', [], [],
    { [ESH]: ['Coliflor'], [ENA]: ['Coliflor'], [MAY]: ['Coliflor'] }),
  sp('esparrago', 'hortalizas', 'Espárrago', 'Asparagus', 'Asparagus officinalis', [], [], { [ESH]: ['Espárrago'], [MAY]: ['Espárragos'] }),
  sp('espinaca', 'hortalizas', 'Espinaca', 'Spinach', 'Spinacia oleracea', [], [], { [ESH]: ['Espinaca'], [MAY]: ['Espinaca'] }),
  sp('haba', 'hortalizas', 'Haba', 'Broad bean', 'Vicia faba', [], ['fava bean'], { [ESH]: ['Haba'], [MAY]: ['Haba'] }),
  sp('lechuga', 'hortalizas', 'Lechuga', 'Lettuce', 'Lactuca sativa', [], [], { [ESH]: ['Lechuga'], [ENA]: ['Lechuga'], [MAY]: ['Lechuga'] }),
  sp('locoto', 'hortalizas', 'Locoto', 'Rocoto pepper', 'Capsicum pubescens', ['rocoto'], ['rocoto'], { [MAY]: ['Locoto'] }),
  sp('melon', 'hortalizas', 'Melón', 'Melon', 'Cucumis melo', [], ['muskmelon', 'cantaloupe'], { [ESH]: ['Melón'], [MAY]: ['Melón'] }),
  sp('papa', 'hortalizas', 'Papa', 'Potato', 'Solanum tuberosum', ['patata'], [], { [ENA]: ['Papa'], [MAY]: ['Papa'] }),
  sp('pepino', 'hortalizas', 'Pepino', 'Cucumber', 'Cucumis sativus', ['pepino de ensalada'], [],
    { [ESH]: ['Pepino de ensalada'], [MAY]: ['Pepino ensalada'] }),
  sp('pepino-dulce', 'hortalizas', 'Pepino dulce', 'Pepino melon', 'Solanum muricatum', [], ['melon pear'], { [MAY]: ['Pepino dulce'] }),
  sp('pimiento', 'hortalizas', 'Pimiento', 'Bell pepper', 'Capsicum annuum', ['pimentón', 'morrón'], ['sweet pepper', 'capsicum'],
    { [ESH]: ['Pimiento'], [MAY]: ['Pimiento'] }),
  sp('poroto', 'hortalizas', 'Poroto', 'Common bean', 'Phaseolus vulgaris', ['poroto verde', 'poroto granado', 'frejol', 'frijol', 'judía', 'vainita', 'chaucha'], ['green bean', 'dry bean', 'kidney bean'],
    { [ESH]: ['Poroto granado', 'Poroto verde'], [ENA]: ['Poroto (Grano Seco)', 'Poroto verde'], [MAY]: ['Poroto granado', 'Poroto verde'] }),
  sp('puerro', 'hortalizas', 'Puerro', 'Leek', 'Allium ampeloprasum (grupo Porrum)', ['porro'], [], { [MAY]: ['Puerro'] }),
  sp('rabanito', 'hortalizas', 'Rabanito', 'Radish', 'Raphanus sativus', ['rábano'], [], { [MAY]: ['Rabanito'] }),
  sp('repollito-bruselas', 'hortalizas', 'Repollito de Bruselas', 'Brussels sprouts', 'Brassica oleracea var. gemmifera', ['col de bruselas'], [],
    { [MAY]: ['Bruselas (repollito)'] }),
  sp('repollo', 'hortalizas', 'Repollo', 'Cabbage', 'Brassica oleracea var. capitata', ['col'], [], { [ESH]: ['Repollo'], [MAY]: ['Repollo'] }),
  sp('sandia', 'hortalizas', 'Sandía', 'Watermelon', 'Citrullus lanatus', [], [], { [ESH]: ['Sandía'], [MAY]: ['Sandia'] }),
  sp('tomate', 'hortalizas', 'Tomate', 'Tomato', 'Solanum lycopersicum', ['jitomate'], [], { [ESH]: ['Tomate consumo fresco'], [MAY]: ['Tomate'] }),
  sp('zanahoria', 'hortalizas', 'Zanahoria', 'Carrot', 'Daucus carota subsp. sativus', [], [],
    { [ESH]: ['Zanahoria'], [ENA]: ['Zanahoria'], [MAY]: ['Zanahoria'] }),
  sp('zapallo', 'hortalizas', 'Zapallo', 'Squash', 'Cucurbita maxima y Cucurbita moschata', ['zapallo de guarda', 'zapallo temprano', 'calabaza'], ['pumpkin', 'winter squash'],
    { [ESH]: ['Zapallo temprano y de guarda'], [ENA]: ['Zapallo'], [MAY]: ['Zapallo'] }),
  sp('zapallo-italiano', 'hortalizas', 'Zapallo italiano', 'Zucchini', 'Cucurbita pepo', ['zucchini', 'calabacín', 'zapallito'], ['courgette', 'summer squash'],
    { [ESH]: ['Zapallo italiano'], [MAY]: ['Zapallo italiano'] }),

  // --- Frutales ---
  sp('almendro', 'frutales', 'Almendro', 'Almond', 'Prunus dulcis', ['almendra'], [], { [CAT]: ['Almendro'] }),
  sp('avellano', 'frutales', 'Avellano europeo', 'Hazelnut', 'Corylus avellana', ['avellano', 'avellana'], ['filbert'], { [CAT]: ['Avellano'] }),
  sp('caqui', 'frutales', 'Caqui', 'Persimmon', 'Diospyros kaki', ['kaki', 'persimón'], [], { [CAT]: ['Caqui'], [MAY]: ['Caqui'] }),
  sp('cerezo', 'frutales', 'Cerezo', 'Sweet cherry', 'Prunus avium', ['cereza'], ['cherry'], { [CAT]: ['Cerezo'], [MAY]: ['Cereza'] }),
  sp('chirimoyo', 'frutales', 'Chirimoyo', 'Cherimoya', 'Annona cherimola', ['chirimoya'], ['custard apple'], { [CAT]: ['Chirimoyo'], [MAY]: ['Chirimoya'] }),
  sp('ciruelo', 'frutales', 'Ciruelo', 'Plum', 'Prunus domestica y Prunus salicina', ['ciruela', 'ciruelo europeo', 'ciruelo japonés', 'ciruela d\'agen'], ['prune'],
    { [CAT]: ['Ciruelo Europeo', 'Ciruelo Japonés'], [MAY]: ['Ciruela'] }),
  sp('datilera', 'frutales', 'Palmera datilera', 'Date palm', 'Phoenix dactylifera', ['datilera', 'dátil'], ['date'], { [CAT]: ['Datilera'] }),
  sp('damasco', 'frutales', 'Damasco', 'Apricot', 'Prunus armeniaca', ['albaricoque', 'chabacano'], [], { [CAT]: ['Damasco'], [MAY]: ['Damasco'] }),
  sp('duraznero', 'frutales', 'Duraznero', 'Peach', 'Prunus persica', ['durazno', 'melocotón', 'durazno conservero'], [],
    { [CAT]: ['Duraznero Tipo Conservero', 'Duraznero Consumo Fresco'], [MAY]: ['Durazno'] }),
  sp('feijoa', 'frutales', 'Feijoa', 'Feijoa', 'Acca sellowiana', [], ['pineapple guava'], { [CAT]: ['Feijoa'] }),
  sp('granado', 'frutales', 'Granado', 'Pomegranate', 'Punica granatum', ['granada'], [], { [CAT]: ['Granado'], [MAY]: ['Granada'] }),
  sp('guayabo', 'frutales', 'Guayabo', 'Guava', 'Psidium guajava', ['guayaba'], [], { [CAT]: ['Guayabo'], [MAY]: ['Guayaba'] }),
  sp('guindo', 'frutales', 'Guindo', 'Sour cherry', 'Prunus cerasus', ['guinda', 'guindo agrio'], [], { [CAT]: ['Guindo Agrio'] }),
  sp('higuera', 'frutales', 'Higuera', 'Fig', 'Ficus carica', ['higo', 'breva'], [], { [CAT]: ['Higuera'], [MAY]: ['Higo', 'Breva'] }),
  sp('kiwi', 'frutales', 'Kiwi', 'Kiwifruit', 'Actinidia spp.', ['kiwi gold', 'kiwi amarillo', 'kiwi baby'], ['kiwi', 'gold kiwi', 'hardy kiwi'],
    { [CAT]: ['Kiwi', 'Kiwi Gold o Kiwi Amarillo', 'Hardy Kiwi o Baby Kiwi'], [MAY]: ['Kiwi'] }),
  sp('kumquat', 'frutales', 'Kumquat', 'Kumquat', 'Citrus japonica', ['quinoto', 'naranjo enano'], [], { [CAT]: ['Kumquat'] }),
  sp('lima', 'frutales', 'Lima', 'Lime', 'Citrus × aurantiifolia y Citrus × latifolia', ['limón de pica'], [], { [CAT]: ['Lima'] }),
  sp('limonero', 'frutales', 'Limonero', 'Lemon', 'Citrus × limon', ['limón'], [], { [CAT]: ['Limonero'], [MAY]: ['Limón'] }),
  sp('lucumo', 'frutales', 'Lúcumo', 'Lucuma', 'Pouteria lucuma', ['lúcuma'], [], { [CAT]: ['Lúcumo'] }),
  sp('macadamia', 'frutales', 'Macadamia', 'Macadamia', 'Macadamia integrifolia y Macadamia tetraphylla', ['nuez de macadamia'], [], { [CAT]: ['Nuez de Macadamia'] }),
  sp('mandarino', 'frutales', 'Mandarino', 'Mandarin', 'Citrus reticulata', ['mandarina', 'clementina'], ['tangerine', 'clementine'],
    { [CAT]: ['Mandarino'], [MAY]: ['Mandarina'] }),
  sp('mango', 'frutales', 'Mango', 'Mango', 'Mangifera indica', [], [], { [CAT]: ['Mango'], [MAY]: ['Mango'] }),
  sp('manzano', 'frutales', 'Manzano', 'Apple', 'Malus domestica', ['manzana', 'manzano rojo', 'manzano verde'], [],
    { [CAT]: ['Manzano Rojo', 'Manzano Verde'], [MAY]: ['Manzana'] }),
  sp('maracuya', 'frutales', 'Maracuyá', 'Passion fruit', 'Passiflora edulis', ['fruta de la pasión'], [], { [CAT]: ['Maracuyá'], [MAY]: ['Maracuyá'] }),
  sp('membrillo', 'frutales', 'Membrillo', 'Quince', 'Cydonia oblonga', [], [], { [CAT]: ['Membrillo'], [MAY]: ['Membrillo'] }),
  sp('naranjo', 'frutales', 'Naranjo', 'Orange', 'Citrus × sinensis', ['naranja'], [], { [CAT]: ['Naranjo'], [MAY]: ['Naranja'] }),
  sp('nectarino', 'frutales', 'Nectarino', 'Nectarine', 'Prunus persica var. nucipersica', ['nectarín', 'nectarina'], [],
    { [CAT]: ['Nectarino'], [MAY]: ['Nectarín'] }),
  sp('nispero', 'frutales', 'Níspero', 'Loquat', 'Eriobotrya japonica', [], [], { [CAT]: ['Nispero'], [MAY]: ['Níspero'] }),
  sp('nogal', 'frutales', 'Nogal', 'Walnut', 'Juglans regia', ['nuez'], [], { [CAT]: ['Nogal'] }),
  sp('olivo', 'frutales', 'Olivo', 'Olive', 'Olea europaea', ['aceituna', 'oliva'], [], { [CAT]: ['Olivo'] }),
  sp('palto', 'frutales', 'Palto', 'Avocado', 'Persea americana', ['palta', 'aguacate'], [], { [CAT]: ['Palto'], [MAY]: ['Palta'] }),
  sp('papayo', 'frutales', 'Papayo (papaya chilena)', 'Mountain papaya', 'Vasconcellea pubescens', ['papaya', 'papaya chilena', 'papaya de La Serena'], ['chilean papaya'],
    { [CAT]: ['Papayo'], [MAY]: ['Papaya'] }),
  sp('pecana', 'frutales', 'Pecana', 'Pecan', 'Carya illinoinensis', ['nuez pecana', 'pecán'], [], { [CAT]: ['Pecana'] }),
  sp('pera-asiatica', 'frutales', 'Pera asiática', 'Asian pear', 'Pyrus pyrifolia', ['nashi'], [], { [CAT]: ['Pera Asiática'], [MAY]: ['Pera asiática'] }),
  sp('peral', 'frutales', 'Peral', 'Pear', 'Pyrus communis', ['pera'], [], { [CAT]: ['Peral'], [MAY]: ['Pera'] }),
  sp('pistacho', 'frutales', 'Pistacho', 'Pistachio', 'Pistacia vera', [], [], { [CAT]: ['Pistacho'] }),
  sp('pluot', 'frutales', 'Pluot', 'Pluot', 'Prunus salicina × Prunus armeniaca', ['ciruelo interespecífico'], ['plumcot'], { [CAT]: ['Pluots'] }),
  sp('pomelo', 'frutales', 'Pomelo', 'Grapefruit', 'Citrus × paradisi', ['toronja'], [], { [CAT]: ['Pomelo'], [MAY]: ['Pomelo'] }),
  sp('tangelo', 'frutales', 'Tangelo', 'Tangelo', 'Citrus × tangelo', [], [], { [CAT]: ['Tangelo'] }),
  sp('tumbo', 'frutales', 'Tumbo', 'Banana passionfruit', 'Passiflora tripartita var. mollissima', ['curuba'], [], { [MAY]: ['Tumbo'] }),
  sp('vid', 'frutales', 'Vid', 'Grapevine', 'Vitis vinifera', ['uva', 'parra', 'viña', 'uva de mesa', 'uva vinífera', 'uva pisquera'], ['grape', 'table grape', 'wine grape'],
    { [CAT]: ['Vid de Mesa'], 'sag-catastro-viticola-2024': ['Vides para vinificación y pisco'], [MAY]: ['Uva'] }),

  // --- Berries ---
  sp('arandano', 'berries', 'Arándano', 'Blueberry', 'Vaccinium corymbosum', ['arándano azul', 'blueberry'], [],
    { [CAT]: ['Arándano Americano'], [MAY]: ['Arándano (blue)'] }),
  sp('arandano-rojo', 'berries', 'Arándano rojo', 'Cranberry', 'Vaccinium macrocarpon', ['cranberry'], [], { [CAT]: ['Cranberry'] }),
  sp('calafate', 'berries', 'Calafate', 'Calafate', 'Berberis microphylla', [], ['magellan barberry'], { [CAT]: ['Calafate'] }),
  sp('frambuesa', 'berries', 'Frambuesa', 'Raspberry', 'Rubus idaeus', [], [], { [CAT]: ['Frambuesa'], [MAY]: ['Frambuesa'] }),
  sp('frutilla', 'berries', 'Frutilla', 'Strawberry', 'Fragaria × ananassa', ['fresa'], [], { [ESH]: ['Frutilla'], [MAY]: ['Frutilla'] }),
  sp('grosella', 'berries', 'Grosella', 'Gooseberry', 'Ribes uva-crispa', ['uva espina', 'uva crespa'], [], { [CAT]: ['Grosella'] }),
  sp('maqui', 'berries', 'Maqui', 'Maqui berry', 'Aristotelia chilensis', [], [], { [CAT]: ['Maqui'] }),
  sp('michay', 'berries', 'Michay', 'Darwin\'s barberry', 'Berberis darwinii', [], [], { [CAT]: ['Michay'] }),
  sp('mora', 'berries', 'Mora', 'Blackberry', 'Rubus spp.', ['zarzamora', 'mora híbrida'], [], { [CAT]: ['Moras Cultivadas e Híbridos'], [MAY]: ['Mora'] }),
  sp('mosqueta', 'berries', 'Rosa mosqueta', 'Rosehip', 'Rosa rubiginosa', ['mosqueta'], ['sweet briar'], { [CAT]: ['Mosqueta'] }),
  sp('murtilla', 'berries', 'Murtilla', 'Chilean guava', 'Ugni molinae', ['murta', 'uñi'], ['murta'], { [CAT]: ['Murtilla'] }),
  sp('sauco', 'berries', 'Saúco', 'Elderberry', 'Sambucus nigra', [], ['elder'], { [CAT]: ['Sauco'] }),
  sp('zarzaparrilla-negra', 'berries', 'Zarzaparrilla negra', 'Blackcurrant', 'Ribes nigrum', ['grosella negra', 'casis'], ['black currant'],
    { [CAT]: ['Zarzaparrilla Negra'] }),
  sp('zarzaparrilla', 'berries', 'Zarzaparrilla roja', 'Redcurrant', 'Ribes rubrum', ['grosella roja', 'corinto', 'parrilla'], ['red currant'],
    { [CAT]: ['Zarzaparrilla Roja'] }),

  // --- Cereales, legumbres e industriales ---
  sp('achicoria', 'cultivos', 'Achicoria', 'Chicory', 'Cichorium intybus', ['chicoria', 'achicoria industrial'], [],
    { [ENA]: ['Achicoria'], [MAY]: ['Achicoria'] }),
  sp('arroz', 'cultivos', 'Arroz', 'Rice', 'Oryza sativa', [], [], { [ENA]: ['Arroz'] }),
  sp('avena', 'cultivos', 'Avena', 'Oat', 'Avena sativa', ['avena forrajera'], ['oats'],
    { [ENA]: ['Avena (Grano Seco)', 'Avena (forrajera) sola', 'Avena asociada'] }),
  sp('cebada', 'cultivos', 'Cebada', 'Barley', 'Hordeum vulgare', ['cebada cervecera'], [], { [ENA]: ['Cebada Cervecera'] }),
  sp('lupino', 'cultivos', 'Lupino', 'Lupin', 'Lupinus spp.', ['lupino dulce', 'altramuz', 'chocho'], ['lupine'], { [ENA]: ['Lupino Dulce'] }),
  sp('maiz', 'cultivos', 'Maíz', 'Maize', 'Zea mays', ['choclo', 'maíz dulce', 'maíz para silo'], ['corn', 'sweet corn'],
    { [ESH]: ['Choclo'], [ENA]: ['Maiz', 'Maiz (Semillero)', 'Choclo dulce (maíz dulce)', 'Maíz para silo'], [MAY]: ['Choclo'] }),
  sp('raps', 'cultivos', 'Raps', 'Rapeseed', 'Brassica napus', ['canola', 'colza'], ['canola'], { [ENA]: ['Raps (Canola)'] }),
  sp('remolacha', 'cultivos', 'Remolacha azucarera', 'Sugar beet', 'Beta vulgaris subsp. vulgaris (grupo Altissima)', ['remolacha'], [], { [ENA]: ['Remolacha'] }),
  sp('soya', 'cultivos', 'Soya', 'Soybean', 'Glycine max', ['soja'], ['soy'], { [ENA]: ['Soya'] }),
  sp('trigo', 'cultivos', 'Trigo', 'Wheat', 'Triticum aestivum y Triticum durum', ['trigo blanco', 'trigo candeal', 'trigo harinero'], ['bread wheat', 'durum wheat'],
    { [ENA]: ['Trigo Blanco', 'Trigo Candeal'] }),
  sp('triticale', 'cultivos', 'Triticale', 'Triticale', '× Triticosecale', [], [], { [ENA]: ['Triticale (Grano Seco)'] }),

  // --- Forrajeras ---
  sp('alfalfa', 'forrajeras', 'Alfalfa', 'Alfalfa', 'Medicago sativa', [], ['lucerne'], { [ENA]: ['Alfalfa'] }),
  sp('ballica', 'forrajeras', 'Ballica', 'Ryegrass', 'Lolium multiflorum y Lolium perenne', ['ballica anual', 'ballica bianual', 'ballica perenne', 'raigrás'], ['rye grass'],
    { [ENA]: ['Ballica anual', 'Ballica bianual', 'Ballica perenne o persistente'] }),
  sp('col-forrajera', 'forrajeras', 'Col forrajera', 'Forage kale', 'Brassica oleracea var. viridis', [], ['fodder kale'], { [ENA]: ['Col'] }),
  sp('trebol-rosado', 'forrajeras', 'Trébol rosado', 'Red clover', 'Trifolium pratense', ['trébol'], ['clover'], { [ENA]: ['Trébol Rosado'] }),

  // --- Aromáticas (cobertura parcial) ---
  sp('albahaca', 'aromaticas', 'Albahaca', 'Basil', 'Ocimum basilicum', [], [], { [MAY]: ['Albahaca'] }),
  sp('ciboulette', 'aromaticas', 'Ciboulette', 'Chives', 'Allium schoenoprasum', ['cebollino'], [], { [MAY]: ['Ciboulette'] }),
  sp('cilantro', 'aromaticas', 'Cilantro', 'Coriander', 'Coriandrum sativum', [], ['cilantro'], { [MAY]: ['Cilantro'] }),
  sp('oregano', 'aromaticas', 'Orégano', 'Oregano', 'Origanum vulgare', [], [], { [ESH]: ['Orégano'], [MAY]: ['Orégano'] }),
  sp('perejil', 'aromaticas', 'Perejil', 'Parsley', 'Petroselinum crispum', [], [], { [MAY]: ['Perejil'] }),

  // --- Árboles forestales (cobertura parcial) ---
  sp('eucalipto', 'forestales', 'Eucalipto', 'Eucalyptus', 'Eucalyptus globulus y Eucalyptus nitens', [], ['gum tree'],
    { 'infor-anuario-2025': ['Eucalyptus globulus', 'Eucalyptus nitens'] }),
  sp('pino-radiata', 'forestales', 'Pino radiata', 'Monterey pine', 'Pinus radiata', ['pino insigne', 'pino'], ['radiata pine'],
    { 'infor-anuario-2025': ['Pinus radiata'] }),
];

/**
 * Nombres de las fuentes que no se convierten en especie, con su motivo. Junto con
 * `SPECIES[].sources` debe cubrir todos los nombres de hortalizas, frutales y cultivos
 * anuales de las fuentes (prueba de completitud).
 */
export const EXCLUDED_SOURCE_NAMES: Partial<Record<SpeciesSourceId, Record<string, string>>> = {
  'ine-esh-2023': { 'Otras hortalizas': 'Categoría agregada' },
  'ine-ena-2025-26': {
    'Otras Leguminosas y/o Tubérculos': 'Categoría agregada',
    'Otros Cereales': 'Categoría agregada',
    'Otros Cultivos Industriales': 'Categoría agregada',
    'Otras Hortalizas': 'Categoría agregada',
    'Huerta casera (princ. autoconsumo)': 'Categoría agregada',
    'Mezcla de forrajeras': 'Categoría agregada',
    'Otros cultivos forrajeros': 'Categoría agregada',
  },
  'ciren-odepa-catastro': {
    Palma: 'Nombre que no identifica una especie',
    Castaño: 'Retirada: sin criterios agronómicos ni especie similar (TASK ES7)',
    Jojoba: 'Retirada: sin criterios agronómicos ni especie similar (TASK ES7)',
    Tuna: 'Retirada: sin criterios agronómicos ni especie similar (TASK ES7)',
    'Haskap o Honeyberry': 'Retirada: sin criterios agronómicos ni especie similar (TASK ES8)',
  },
  'odepa-mayoristas-2025': {
    Plátano: 'Sin origen chileno en 2025',
    Piña: 'Sin origen chileno en 2025',
    Coco: 'Sin origen chileno en 2025',
    Jengibre: 'Sin origen chileno en 2025',
    'Fruto del paraíso': 'Nombre que no identifica una especie',
    Tuna: 'Retirada: sin criterios agronómicos ni especie similar (TASK ES7)',
  },
};

const BY_ID = new Map(SPECIES.map(entry => [entry.id, entry]));

export const findSpecies = (id: string | null | undefined): SpeciesEntry | undefined =>
  id ? BY_ID.get(id) : undefined;

export const speciesName = (entry: SpeciesEntry, language: 'es' | 'en' = 'es'): string =>
  language === 'en' ? entry.en : entry.es;

/** Minúsculas, sin tildes ni diéresis (la ñ queda como n) y con espacios simples. */
export const normalizeSearch = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const GROUP_ORDER = new Map(SPECIES_GROUPS.map((group, i) => [group.id, i]));

/**
 * Especies cuyo nombre o sinónimo, en cualquiera de los dos idiomas, contiene la
 * búsqueda. Sin búsqueda, toda la lista. Orden: primero las que empiezan con el texto,
 * luego por grupo y nombre en el idioma de la app; es estable para la misma entrada.
 */
export function searchSpecies(query: string, language: 'es' | 'en' = 'es'): SpeciesEntry[] {
  const needle = normalizeSearch(query);
  const name = (entry: SpeciesEntry) => normalizeSearch(speciesName(entry, language));
  const scored = SPECIES.flatMap(entry => {
    if (!needle) return [{ entry, rank: 1 }];
    const terms = [entry.es, entry.en, ...entry.synonymsEs, ...entry.synonymsEn].map(normalizeSearch);
    if (!terms.some(term => term.includes(needle))) return [];
    return [{ entry, rank: terms.some(term => term.startsWith(needle) || term.includes(` ${needle}`)) ? 0 : 1 }];
  });
  return scored.sort((a, b) => a.rank - b.rank
    || GROUP_ORDER.get(a.entry.group)! - GROUP_ORDER.get(b.entry.group)!
    || (name(a.entry) < name(b.entry) ? -1 : name(a.entry) > name(b.entry) ? 1 : 0))
    .map(item => item.entry);
}

/**
 * Si la especie tiene criterios propios habilitados para la etapa. Delega en
 * speciesRules.ts (TASK ES6), que crece especie por especie con su propia evidencia;
 * una especie sin perfil ahí sigue devolviendo `false`.
 */
export const hasStageCriteria = (id: string, stage: PhenologicalStage): boolean => hasEnabledCriteria(id, stage);
