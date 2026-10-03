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
