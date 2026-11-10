/**
 * Comprueba que cada enlace citado por el motor agronómico siga siendo alcanzable.
 *
 * La auditoría de evidencia (`auditar-evidencia.ts`) comprueba que el contrato esté completo:
 * que cada criterio nombre institución, título, enlace, sección, fecha y el valor original. Eso
 * es necesario pero no suficiente, porque un campo bien formado puede apuntar a un documento que
 * no existe. Esto cierra ese hueco por el lado más barato de verificar: si la URL no responde, la
 * cita no se sostiene y nadie puede comprobarla.
 *
 * Lo que NO hace: leer el documento y confirmar que dice lo que el criterio afirma. Eso se hace a
 * mano, y las fuentes ya comprobadas así están en `FUENTES_LEIDAS`.
 *
 *   npx tsx scripts/verificar-enlaces.ts            # sólo las URLs sin leer
 *   npx tsx scripts/verificar-enlaces.ts --todas    # todas, incluidas las ya leídas
 */
import { SPECIES } from '../src/engine/speciesCatalog';
import { SPECIES_RULES } from '../src/engine/speciesRules';
import { PRE_PLANTING_PROFILES } from '../src/engine/prePlanting';

/**
 * Hosts que responden 403 o 406 a un cliente automático aunque la página exista. Un fallo en
 * estos no prueba nada, así que se informan aparte en vez de hacer fallar la comprobación.
 */
const BLOQUEAN_ROBOTS = [
  'umass.edu', 'ask.ifas.ufl.edu', 'edis.ifas.ufl.edu', 'extension.okstate.edu',
  'biblioteca.inia.cl', 'anrcatalog.ucanr.edu', 'extension.uga.edu', 'fieldreport.caes.uga.edu',
  'pfaf.org', 'www.canolacouncil.org', 'extension.umn.edu', 'apps.extension.umn.edu',
  'bibliotecadigital.infor.cl', 'bibliotecadigital.ciren.cl', 'scholarspace.manoa.hawaii.edu',
  'www.uaex.uada.edu', 'ecocrop.apps.fao.org', 'www.ars.usda.gov', 'extensionpubs.unl.edu',
  // Rechazan al cliente automático con 403 aunque la página exista: las fichas de poscosecha de
  // UC Davis se leyeron una por una con un navegador, y los demás responden en navegador.
  'postharvest.ucdavis.edu', 'ucanr.edu', 'extension.unh.edu', 'omafra.gov.on.ca', 'ainfo.inia.uy',
];

/**
 * URLs cuyo contenido se leyó y se comparó con lo que el criterio afirma. Añadir una aquí es
 * afirmar que alguien abrió el documento y encontró la frase citada; no se añade por inercia.
 */
const FUENTES_LEIDAS = new Set([
  'https://www.fao.org/4/t0234e/T0234E03.htm',
  'https://www.fao.org/4/x0490e/x0490e0b.htm',
  'https://www.fao.org/4/x0490e/x0490e0e.htm',
  'https://www.fao.org/4/x5647E/x5647e0e.htm',
  'https://biblioteca.inia.cl/items/475bd934-243f-4f91-8e24-ec7b98eed311',
  'https://biblioteca.inia.cl/items/16f6bd25-6b1c-4973-8be7-dfa23d2ee52f',
  'https://extension.sdstate.edu/fall-frost-tolerance-common-vegetables',
  'https://lancaster.unl.edu/frost-cold-temperatures-bring-end-gardening-season/',
  'https://extension.umd.edu/sites/extension.umd.edu/files/2026-02/Soil%20and%20Nutrient%20Management.pdf',
  'https://ucanr.edu/program/uc-master-gardener-program/seed-germination-temperature-and-timing',
  'https://s3-us-west-2.amazonaws.com/treefruit.wsu.edu/wp-content/uploads/2016/01/04-Kalcsits_Root-Fnx-Phys.pdf',
  'https://www.avocadosource.com/Journals/AustJOurnAgRes/AustJournAgRes_1982_33_549-558.pdf',
  'https://extension.msstate.edu/sites/default/files/publications/P1779_web.pdf',
  'https://agsci.psu.edu/aasl/soil-testing/fertility/handbooks/tree-fruits/recommendations/4006-pears-maintain',
  'https://projects.sare.org/media/pdf/F/i/g/Fig-Publictation.pdf',
  'https://postharvest.ucdavis.edu/produce-facts-sheets/herbs-fresh-culinary',
  'https://www.ndsu.edu/agriculture/sites/default/files/2026-02/25%20Effect%20of%20Rainfall%20During%20the%20Harvest%20Interval%20on%20Barley%20Preharvest%20Sprouting_0.pdf',
  'https://www.ndsu.edu/agriculture/sites/default/files/2025-11/as574_25_0.pdf',
  'https://www.bookstore.ksre.ksu.edu/pubs/C529.pdf',
  'https://bookstore.ksre.ksu.edu/pubs/MF2586.pdf',
  'https://bookstore.ksre.ksu.edu/pubs/spring-freeze-injury-to-kansas-wheat_C646.pdf',
  'https://extension.okstate.edu/fact-sheets/variation-in-heat-sensitive-germination-among-contemporary-hard-winter-wheat-varieties-2019-2024',
  'https://ir.library.oregonstate.edu/downloads/mg74qm32g',
  'https://hort.extension.wisc.edu/files/2023/10/A3785-Growing-Onions-Garlic-Leeks-and-Other-Alliums-in-Wisconsin-KA-Delahaut-and-AC-Newenhouse.pdf',
  'https://www.comitedelkiwi.cl/wp-content/uploads/2024/01/manual_prod_cap0_6.pdf',
  'https://www.umass.edu/agriculture-food-environment/cranberry/cranberry-chart-book/nutrition-management-for-producing-bogs',
  'https://ask.ifas.ufl.edu/publication/PG133',
  'https://edis.ifas.ufl.edu/publication/SS666',
  'https://edis.ifas.ufl.edu/publication/HS1467',
  'https://edis.ifas.ufl.edu/publication/MG056',
  'https://edis.ifas.ufl.edu/publication/MG216',
  'https://edis.ifas.ufl.edu/publication/MG045',
  'https://edis.ifas.ufl.edu/publication/HS402',
  'https://edis.ifas.ufl.edu/publication/CH093',
  'https://crfg.org/homepage/library/fruitfacts/cherimoya/',
  'https://crfg.org/homepage/library/fruitfacts/feijoa/',
  'https://crfg.org/homepage/library/fruitfacts/loquat/',
  'https://crfg.org/homepage/library/fruitfacts/pomegranate/',
  'https://crfg.org/homepage/library/fruitfacts/fig/',
  'https://crfg.org/homepage/library/fruitfacts/passion-fruit/',
]);

const usos = new Map<string, Set<string>>();
const anotar = (url: string, donde: string) => {
  const s = usos.get(url) ?? new Set<string>();
  s.add(donde);
  usos.set(url, s);
};
for (const s of SPECIES) {
  for (const c of SPECIES_RULES[s.id]?.criteria ?? []) for (const e of c.evidence) anotar(e.url, `${s.es}/${c.kind}`);
}
for (const p of PRE_PLANTING_PROFILES) for (const e of p.evidence) anotar(e.url, p.id);

const todas = process.argv.includes('--todas');
const objetivo = [...usos.keys()].filter(u => todas || !FUENTES_LEIDAS.has(u)).sort();
const bloqueado = (u: string) => BLOQUEAN_ROBOTS.some(h => new URL(u).host.endsWith(h));

const sondear = async (url: string): Promise<number | string> => {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), 45_000);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: control.signal });
    return r.status;
  } catch (e) {
    return e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'sin respuesta';
  } finally {
    clearTimeout(t);
  }
};

const LOTE = 8;
const nombre = (u: string) => `${u} (${[...(usos.get(u) ?? [])].length} usos)`;

const main = async () => {
  const roto: { url: string; estado: number | string }[] = [];
  const dudoso: { url: string; estado: number | string }[] = [];
  let ok = 0;

  for (let i = 0; i < objetivo.length; i += LOTE) {
    const lote = objetivo.slice(i, i + LOTE);
    const estados = await Promise.all(lote.map(sondear));
    lote.forEach((url, k) => {
      const estado = estados[k];
      if (estado === 200) { ok += 1; return; }
      // Un 404 es definitivo: el servidor responde y dice que el documento no está. Sólo el
      // rechazo por ser un cliente automático (403, 406) no concluye nada sobre la cita.
      const noConcluyente = bloqueado(url) && estado !== 404 && estado !== 410;
      (noConcluyente ? dudoso : roto).push({ url, estado });
    });
  }

  console.log(`Enlaces comprobados: ${objetivo.length} de ${usos.size} distintos${todas ? '' : '; las ya leídas se omiten'}`);
  console.log(`   responden: ${ok}`);
  console.log(`   inalcanzables desde un host que bloquea robots (no concluyente): ${dudoso.length}`);
  for (const d of dudoso) console.log(`      ${d.estado}  ${nombre(d.url)}`);
  console.log(`\nENLACES ROTOS: ${roto.length}`);
  for (const r of roto.sort((a, b) => (usos.get(b.url)?.size ?? 0) - (usos.get(a.url)?.size ?? 0))) {
    console.log(`   ${r.estado}  ${nombre(r.url)}`);
    for (const d of [...(usos.get(r.url) ?? [])].slice(0, 8)) console.log(`        ${d}`);
  }
  process.exit(roto.length ? 1 : 0);
};

void main();
