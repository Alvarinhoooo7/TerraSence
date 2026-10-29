// Pruebas de la división del historial del backoffice: agrupación y opciones del filtro.
//
// Filtrar es cosa del servidor, así que aquí sólo se comprueba lo que hace el navegador:
// cómo quedan los grupos y en qué orden.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VIEW,
  changeView,
  dayLabel,
  filtersFor,
  historyViewFromParams,
  historyViewParams,
  measurementSpeciesId,
  organizeHistory,
  queryKey,
  speciesOptions,
  totalMeasurements,
} from '../src/utils/measurementHistory.ts';

const species = (id, es) => ({ id, es, en: es, scientific: es, hasStageCriteria: true });

/** Una medición con lo mínimo que mira la agrupación. */
const at = (id, day, stage, especie) => ({
  id,
  measured_at: `2026-10-${day}T12:00:00Z`,
  phenological_stage: stage,
  species: especie ?? null,
});

const measurements = [
  at('a', '10', 'vegetativo', species('sp.tomate', 'Tomate')),
  at('b', '12', 'vegetativo', species('sp.palto', 'Palto')),
  at('c', '11', 'cosecha'),
  at('d', '09', 'vegetativo', species('sp.tomate', 'Tomate')),
  at('e', '12', 'pre_siembra', species('sp.palto', 'Palto')),
];

const shape = (sections) => sections.map((s) => [s.title, s.data.map((m) => m.id)]);

test('la especie de una medición sale de la instantánea guardada', () => {
  assert.equal(measurementSpeciesId(measurements[0]), 'sp.tomate');
  assert.equal(measurementSpeciesId(measurements[2]), null);
  assert.equal(dayLabel('2026-10-12T12:00:00Z'), '12-10-2026');
  assert.equal(dayLabel(null), '—');
});

test('agrupar por fecha deja los días de más reciente a más antiguo', () => {
  assert.deepEqual(shape(organizeHistory(measurements, 'date')), [
    ['12-10-2026', ['b', 'e']],
    ['11-10-2026', ['c']],
    ['10-10-2026', ['a']],
    ['09-10-2026', ['d']],
  ]);
});

test('agrupar por especie ordena por la lectura más reciente y deja «Sin especie» al final', () => {
  assert.deepEqual(shape(organizeHistory(measurements, 'species')), [
    ['Palto', ['b', 'e']],
    ['Tomate', ['a', 'd']],
    ['Sin especie', ['c']],
  ]);
});

test('agrupar por etapa sigue el ciclo productivo, no la fecha', () => {
  assert.deepEqual(shape(organizeHistory(measurements, 'stage')), [
    ['Pre-siembra', ['e']],
    ['Vegetativo', ['b', 'a', 'd']],
    ['Cosecha', ['c']],
  ]);
});

test('una etapa fuera del CHECK de la tabla conserva su grupo y va al final', () => {
  const sections = organizeHistory([...measurements, at('x', '13', 'barbecho')], 'stage');
  assert.deepEqual(shape(sections).at(-1), ['barbecho', ['x']]);
});

test('las opciones del filtro vienen del inventario del equipo, con «Sin especie» al final', () => {
  const inventory = [
    { species: species('sp.tomate', 'Tomate'), measurements: 12, last_measured_at: '2026-10-10T12:00:00Z' },
    { species: null, measurements: 3, last_measured_at: '2026-10-11T12:00:00Z' },
    { species: species('sp.palto', 'Palto'), measurements: 5, last_measured_at: '2026-10-12T12:00:00Z' },
  ];
  assert.deepEqual(speciesOptions(inventory), [
    { value: 'sp.palto', label: 'Palto', count: 5 },
    { value: 'sp.tomate', label: 'Tomate', count: 12 },
    { value: 'none', label: 'Sin especie', count: 3 },
  ]);
  assert.equal(totalMeasurements(inventory), 20);
  // Sin lecturas sin especie no aparece la opción, y sin inventario no hay opciones.
  assert.deepEqual(speciesOptions([inventory[0]]), [{ value: 'sp.tomate', label: 'Tomate', count: 12 }]);
  assert.deepEqual(speciesOptions(null), []);
  assert.equal(totalMeasurements(null), 0);
});

test('la vista del historial se lee de la URL y un valor desconocido vuelve al de omisión', () => {
  const view = (query) => historyViewFromParams(new URLSearchParams(query));
  assert.deepEqual(view(''), DEFAULT_VIEW);
  assert.deepEqual(view('etapa=floracion&especie=sp.palto&agrupar=especie&lecturas=200&desde=400'), {
    stage: 'floracion',
    species: 'sp.palto',
    grouping: 'species',
    limit: 200,
    offset: 400,
  });
  assert.deepEqual(view('especie=sin-especie&agrupar=etapa'), {
    ...DEFAULT_VIEW,
    species: 'none',
    grouping: 'stage',
  });
  // Nada de esto debe romper la página: etapa inventada, agrupación inventada y
  // un tope fuera de rango o sin sentido.
  assert.deepEqual(view('etapa=barbecho&agrupar=color&lecturas=99999'), { ...DEFAULT_VIEW, limit: 200 });
  assert.deepEqual(view('lecturas=-3'), DEFAULT_VIEW);
  assert.deepEqual(view('lecturas=ocho'), DEFAULT_VIEW);
  assert.deepEqual(view('desde=-10'), DEFAULT_VIEW);
  assert.deepEqual(view('desde=siete'), DEFAULT_VIEW);
  assert.deepEqual(view('desde=50.9'), { ...DEFAULT_VIEW, offset: 50 });
});

test('la URL sólo lleva lo que no es el valor por omisión', () => {
  assert.deepEqual(historyViewParams(DEFAULT_VIEW), {});
  assert.deepEqual(
    historyViewParams({ stage: 'cosecha', species: 'none', grouping: 'stage', limit: 200, offset: 200 }),
    { etapa: 'cosecha', especie: 'sin-especie', agrupar: 'etapa', lecturas: '200', desde: '200' },
  );
  // Ida y vuelta: lo escrito en la URL se vuelve a leer igual.
  const view = { stage: 'vegetativo', species: 'sp.tomate', grouping: 'species', limit: 200, offset: 600 };
  assert.deepEqual(historyViewFromParams(new URLSearchParams(historyViewParams(view))), view);
});

test('los filtros del servidor distinguen «sin especie» de «todas»', () => {
  assert.deepEqual(filtersFor(DEFAULT_VIEW), {
    stage: null,
    speciesId: null,
    withoutSpecies: false,
    limit: 50,
    offset: 0,
  });
  assert.deepEqual(filtersFor({ ...DEFAULT_VIEW, species: 'none' }), {
    stage: null,
    speciesId: null,
    withoutSpecies: true,
    limit: 50,
    offset: 0,
  });
  assert.deepEqual(
    filtersFor({ stage: 'cosecha', species: 'sp.palto', grouping: 'date', limit: 200, offset: 200 }),
    { stage: 'cosecha', speciesId: 'sp.palto', withoutSpecies: false, limit: 200, offset: 200 },
  );
});

test('cambiar de agrupación no cambia la consulta: reordena lo que ya está en pantalla', () => {
  const base = { stage: 'all', species: 'all', limit: 50, offset: 0 };
  assert.equal(queryKey({ ...base, grouping: 'date' }), queryKey({ ...base, grouping: 'species' }));
  assert.notEqual(queryKey({ ...base, grouping: 'date' }), queryKey({ ...base, limit: 200, grouping: 'date' }));
  assert.notEqual(queryKey({ ...base, grouping: 'date' }), queryKey({ ...base, species: 'none', grouping: 'date' }));
  // Cambiar de página sí es otra consulta.
  assert.notEqual(queryKey({ ...base, grouping: 'date' }), queryKey({ ...base, offset: 50, grouping: 'date' }));
});

test('filtrar distinto vuelve a la primera página; moverse entre páginas no', () => {
  const pagina3 = { ...DEFAULT_VIEW, offset: 100 };
  assert.equal(changeView(pagina3, { stage: 'cosecha' }).offset, 0);
  assert.equal(changeView(pagina3, { species: 'none' }).offset, 0);
  assert.equal(changeView(pagina3, { limit: 200 }).offset, 0);
  // Agrupar no consulta de nuevo, así que la página se queda donde está.
  assert.equal(changeView(pagina3, { grouping: 'stage' }).offset, 100);
  // Y moverse a mano manda, incluso en el mismo cambio que un filtro.
  assert.equal(changeView(pagina3, { offset: 150 }).offset, 150);
  assert.equal(changeView(pagina3, { stage: 'cosecha', offset: 50 }).offset, 50);
  // Elegir el mismo filtro que ya estaba no debe sacar al operador de su página.
  assert.equal(changeView(pagina3, { stage: DEFAULT_VIEW.stage }).offset, 100);
});
