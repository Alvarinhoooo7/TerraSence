import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlantingMapReading } from '../src/utils/measurementMap.ts';

test('el mapa sólo admite pre-siembra con GPS válido, incluidos ceros', () => {
  const base = { phenological_stage: 'pre_siembra', latitude: 0, longitude: 0 };
  assert.equal(isPlantingMapReading(base), true);
  for (const stage of ['vegetativo', 'floracion', 'cosecha', 'otra']) {
    assert.equal(isPlantingMapReading({ ...base, phenological_stage: stage }), false);
  }
  for (const latitude of [null, undefined, NaN, Infinity, '0']) {
    assert.equal(isPlantingMapReading({ ...base, latitude }), false);
  }
  assert.equal(isPlantingMapReading({ ...base, longitude: null }), false);
});
