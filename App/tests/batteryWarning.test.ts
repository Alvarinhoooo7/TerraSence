import assert from 'node:assert/strict';
import test from 'node:test';
import {
  batteryWarningKey, checkLowBattery, LOW_BATTERY_PERCENT, LOW_BATTERY_REARM_PERCENT, nextBatteryWarning,
  type BatteryWarningStorage,
} from '../src/utils/batteryWarning';

const memoria = () => {
  const datos = new Map<string, string>();
  const storage: BatteryWarningStorage = {
    getItem: async (key) => datos.get(key) ?? null,
    setItem: async (key, value) => { datos.set(key, value); },
  };
  return { datos, storage };
};

test('avisa al llegar al 15 % y no sobre ese valor', () => {
  assert.deepEqual(nextBatteryWarning(LOW_BATTERY_PERCENT, 'armed'), { warn: true, state: 'warned' });
  assert.deepEqual(nextBatteryWarning(LOW_BATTERY_PERCENT + 1, 'armed'), { warn: false, state: 'armed' });
  assert.deepEqual(nextBatteryWarning(0, 'armed'), { warn: true, state: 'warned' });
});

test('histéresis: no repite el aviso hasta superar el 20 %', () => {
  assert.deepEqual(nextBatteryWarning(10, 'warned'), { warn: false, state: 'warned' });
  assert.deepEqual(nextBatteryWarning(LOW_BATTERY_REARM_PERCENT, 'warned'), { warn: false, state: 'warned' });
  assert.deepEqual(nextBatteryWarning(LOW_BATTERY_REARM_PERCENT + 1, 'warned'), { warn: false, state: 'armed' });
  assert.deepEqual(nextBatteryWarning(18, 'armed'), { warn: false, state: 'armed' });
});

test('sin dato de batería no avisa ni rearma', () => {
  for (const sinDato of [null, undefined, Number.NaN]) {
    assert.deepEqual(nextBatteryWarning(sinDato, 'warned'), { warn: false, state: 'warned' });
    assert.deepEqual(nextBatteryWarning(sinDato, 'armed'), { warn: false, state: 'armed' });
  }
});

test('un solo aviso por equipo hasta que la batería se recupere', async () => {
  const { storage } = memoria();
  assert.equal(await checkLowBattery(storage, 'u1', '000000000000001', 12), true);
  assert.equal(await checkLowBattery(storage, 'u1', '000000000000001', 9), false);
  assert.equal(await checkLowBattery(storage, 'u1', '000000000000001', 60), false);
  assert.equal(await checkLowBattery(storage, 'u1', '000000000000001', 14), true);
});

test('el estado se separa por cuenta y por equipo', async () => {
  const { datos, storage } = memoria();
  assert.equal(await checkLowBattery(storage, 'u1', '000000000000001', 5), true);
  assert.equal(await checkLowBattery(storage, 'u2', '000000000000001', 5), true);
  assert.equal(await checkLowBattery(storage, 'u1', '000000000000002', 5), true);
  assert.equal(datos.get(batteryWarningKey('u1', '000000000000001')), 'warned');
  assert.equal(datos.size, 3);
});

test('sin cuenta, equipo o batería no avisa ni escribe', async () => {
  const { datos, storage } = memoria();
  assert.equal(await checkLowBattery(storage, null, '000000000000001', 5), false);
  assert.equal(await checkLowBattery(storage, 'u1', null, 5), false);
  assert.equal(await checkLowBattery(storage, 'u1', '000000000000001', null), false);
  assert.equal(datos.size, 0);
});

test('un fallo del almacenamiento no avisa ni lanza', async () => {
  const roto: BatteryWarningStorage = {
    getItem: async () => { throw new Error('sin almacenamiento'); },
    setItem: async () => { throw new Error('sin almacenamiento'); },
  };
  assert.equal(await checkLowBattery(roto, 'u1', '000000000000001', 5), false);
  const soloLectura: BatteryWarningStorage = { getItem: async () => null, setItem: async () => { throw new Error('lleno'); } };
  assert.equal(await checkLowBattery(soloLectura, 'u1', '000000000000001', 5), false);
});
