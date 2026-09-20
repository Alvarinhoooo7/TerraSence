import test from 'node:test';
import assert from 'node:assert/strict';
import { belongsToRetiredGeneration, historyCacheAffected } from '../src/utils/deviceReset';

test('reset removes old and legacy pending readings but preserves other devices and new generations', () => {
  const reset = { device_id: 'probe-a', generation: 2 };
  const rows = [
    { device_id: 'probe-a' }, { device_id: 'probe-a', data_generation: 1 },
    { device_id: 'probe-a', data_generation: 2 }, { device_id: 'probe-b', data_generation: 0 },
  ];
  assert.deepEqual(rows.filter(row => !belongsToRetiredGeneration(row, reset)), rows.slice(2));
});
test('cache cleanup isolates accounts and keeps unrelated device history available offline', () => {
  const account = '@queue/account-a';
  const cache = (owner: string, device: string | null) => `${owner}/history/${JSON.stringify(['Campo Norte', device])}`;
  assert.equal(historyCacheAffected(cache(account, 'probe-a'), account, 'probe-a'), true);
  assert.equal(historyCacheAffected(cache(account, null), account, 'probe-a'), true);
  assert.equal(historyCacheAffected(cache(account, 'probe-b'), account, 'probe-a'), false);
  assert.equal(historyCacheAffected(cache('@queue/account-b', 'probe-a'), account, 'probe-a'), false);
  assert.equal(historyCacheAffected(`${account}/lastSentAt`, account, 'probe-a'), false);
  assert.equal(historyCacheAffected(`${account}/history/not-json`, account, 'probe-a'), false);
});
