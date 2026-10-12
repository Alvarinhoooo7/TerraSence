import assert from 'node:assert/strict';
import test from 'node:test';
import { measurementHistoryScope, mergeCachedHistories, mergeMeasurementHistory } from '../src/utils/measurementHistory';
import type { MeasurementPoint } from '../src/types/app';

test('el filtro de Mediciones permanece independiente de la sonda seleccionada para medir', () => {
  assert.equal(measurementHistoryScope('measure-a', 'history-b'), 'history-b');
  assert.equal(measurementHistoryScope('measure-c', 'history-b'), 'history-b');
  assert.equal(measurementHistoryScope('measure-a', null), null);
  assert.equal(measurementHistoryScope('measure-c', null), null);
  assert.equal(measurementHistoryScope('measure-a', undefined), 'measure-a');
});

const point = (id: string, clientUuid: string, measuredAt = '2026-09-05T12:00:00Z'): MeasurementPoint => ({
  id, clientUuid, measuredAt, latitude: null, longitude: null,
  verdict: 'GREEN', stage: 'pre_siembra', title: 'Favorable', action: null,
  ph: 6.5, ecUsCm: 200, vwcPercent: 30, soilTempC: 18,
  nitrogen: 0, phosphorus: 0, potassium: 0, gpsAccuracyM: null,
});

test('unifica cachés de campos sin duplicar lecturas ni cambiar su estado de respaldo', () => {
  const older = point('older', 'a', '2026-09-04T12:00:00Z');
  const recent = point('recent', 'b');
  const pendingCopy = { ...recent, id: 'local-b', isPending: true };
  assert.deepEqual(mergeCachedHistories([[older, pendingCopy], [recent, older]]), [recent, older]);
  assert.deepEqual(mergeCachedHistories([[recent], [pendingCopy]]), [recent]);
  assert.equal(pendingCopy.isPending, true);
});

test('server confirmation replaces local UUID without duplicating a reading', () => {
  const server = point('server-id', 'client-id');
  assert.deepEqual(mergeMeasurementHistory([server], [point('client-id', 'client-id')]), [server]);
});
test('retains unsynced readings, missing GPS and chronological order', () => {
  const result = mergeMeasurementHistory([point('older', 'a', '2026-09-04T12:00:00Z')], [point('newer', 'b')]);
  assert.deepEqual(result.map(p => p.id), ['newer', 'older']);
  assert.equal(result[0].isPending, true);
  assert.equal(result[0].latitude, null);
});
test('supports cached points without client UUID and does not mutate inputs', () => {
  const cached = { ...point('same', 'c'), clientUuid: undefined };
  const pending = { ...cached };
  assert.equal(mergeMeasurementHistory([cached], [pending]).length, 1);
  assert.equal(pending.isPending, undefined);
});

test('el historial se filtra por etapa y especie y se agrupa por fecha, especie o etapa', async () => {
  const { organizeHistory, historySpeciesOptions } = await import('../src/utils/measurementHistory');
  const species = (id: string, es: string) => ({ presentation: { version: 3, stage: 'vegetativo', species: { id, es, en: es, scientific: es, catalogVersion: '2.0.0', hasStageCriteria: false },
    context: '', title: '', summary: '', weatherNote: '', actions: [], suggestedCrops: [],
    parameters: ['vwc', 'temp', 'ph', 'ec', 'nitrogen', 'phosphorus', 'potassium', 'airTemp', 'airHumidity', 'airPressure']
      .map(key => ({ key, label: key, value: 1, unit: '', status: 'INFO', state: '', recommendation: '', control: '' })) } });
  const at = (id: string, day: string, stage: MeasurementPoint['stage'], diagnosis?: unknown) =>
    ({ ...point(id, id, `2026-10-${day}T12:00:00Z`), stage, diagnosis });
  const points = [
    at('a', '10', 'vegetativo', species('sp.tomate', 'Tomate')),
    at('b', '12', 'vegetativo', species('sp.palto', 'Palto')),
    at('c', '11', 'cosecha'),
    at('d', '09', 'vegetativo', species('sp.tomate', 'Tomate')),
  ];
  const titles = { dayTitle: (iso: string) => iso.slice(0, 10), speciesTitle: (id: string | null) => id ?? 'Sin especie', stageTitle: (stage: string) => stage };
  const shape = (sections: { title: string; data: MeasurementPoint[] }[]) => sections.map(s => [s.title, s.data.map(p => p.id)]);

  assert.deepEqual(historySpeciesOptions(points), { species: [{ id: 'sp.palto', name: 'Palto' }, { id: 'sp.tomate', name: 'Tomate' }], withoutSpecies: true });
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'date', stage: 'all', species: 'all' })),
    [['2026-10-12', ['b']], ['2026-10-11', ['c']], ['2026-10-10', ['a']], ['2026-10-09', ['d']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'species', stage: 'all', species: 'all' })),
    [['sp.palto', ['b']], ['sp.tomate', ['a', 'd']], ['Sin especie', ['c']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'stage', stage: 'all', species: 'all' })),
    [['vegetativo', ['b', 'a', 'd']], ['cosecha', ['c']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'date', stage: 'vegetativo', species: 'sp.tomate' })),
    [['2026-10-10', ['a']], ['2026-10-09', ['d']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'date', stage: 'all', species: 'none' })), [['2026-10-11', ['c']]]);
});
