import assert from 'node:assert/strict';
import test from 'node:test';
import {
  awakeRemainingMs, firmwareDeclaresSleep, formatAwakeCountdown, lastProbeDisconnect, loadProbeSleeps, probeSleepsKnown, probeAwakeRemainingMs, probeSleeps, probeSleepsKey,
  PROBE_AWAKE_GRACE_MS, PROBE_AWAKE_MARGIN_MS, recordProbeDisconnect, rememberProbeSleeps, resetProbeWakeForTests,
  subscribeProbeWake, type ProbeWakeStorage,
} from '../src/utils/probeWake';
import { decodeProbeStatus } from '../src/services/probeService';

const memoria = () => {
  const datos = new Map<string, string>();
  const storage: ProbeWakeStorage = {
    getItem: async (key) => datos.get(key) ?? null,
    setItem: async (key, value) => { datos.set(key, value); },
  };
  return { datos, storage };
};
const ID = '123456789012345';

test('la bandera de reposo es el bit 1 del byte de banderas, sin tocar el bit 0', () => {
  assert.equal(decodeProbeStatus(new Uint8Array([80, 1, 2, 0, 0x02])).sleepsBetweenReadings, true);
  assert.equal(decodeProbeStatus(new Uint8Array([80, 1, 2, 0, 0x02])).pairingOpen, false);
  assert.equal(decodeProbeStatus(new Uint8Array([80, 1, 2, 0, 0x03])).pairingOpen, true);
  assert.equal(decodeProbeStatus(new Uint8Array([80, 1, 1, 0, 0x01])).sleepsBetweenReadings, false);
  assert.equal(decodeProbeStatus(new Uint8Array([80, 1, 1, 0])).sleepsBetweenReadings, false);
});

test('la cuenta regresiva descuenta el margen y nunca es negativa', () => {
  const t0 = 1_000_000;
  assert.equal(awakeRemainingMs(t0, t0), PROBE_AWAKE_GRACE_MS - PROBE_AWAKE_MARGIN_MS);
  assert.equal(awakeRemainingMs(t0, t0 + PROBE_AWAKE_GRACE_MS - PROBE_AWAKE_MARGIN_MS), 0);
  assert.equal(awakeRemainingMs(t0, t0 + PROBE_AWAKE_GRACE_MS), 0);
  assert.equal(awakeRemainingMs(null, t0), 0);
  // Un reloj que retrocede no inventa tiempo despierta.
  assert.equal(awakeRemainingMs(t0, t0 - 5_000), 0);
});

test('formato m:ss redondeado hacia arriba', () => {
  assert.equal(formatAwakeCountdown(84_000), '1:24');
  assert.equal(formatAwakeCountdown(83_100), '1:24');
  assert.equal(formatAwakeCountdown(500), '0:01');
  assert.equal(formatAwakeCountdown(0), '0:00');
  assert.equal(formatAwakeCountdown(-3), '0:00');
});

test('una sonda que no declaró dormir no muestra cuenta regresiva', async () => {
  resetProbeWakeForTests();
  recordProbeDisconnect(ID, 0);
  assert.equal(probeAwakeRemainingMs(ID, 1_000), 0);
  const { storage } = memoria();
  await rememberProbeSleeps(storage, ID, true);
  assert.equal(probeAwakeRemainingMs(ID, 1_000), PROBE_AWAKE_GRACE_MS - PROBE_AWAKE_MARGIN_MS - 1_000);
});

test('la bandera se guarda por equipo y sobrevive a un reinicio de la app', async () => {
  resetProbeWakeForTests();
  const { datos, storage } = memoria();
  await rememberProbeSleeps(storage, ID, true);
  assert.equal(datos.get(probeSleepsKey(ID)), '1');
  resetProbeWakeForTests();
  assert.equal(probeSleeps(ID), false);
  assert.equal(await loadProbeSleeps(storage, ID), true);
  assert.equal(probeSleeps(ID), true);
  // Volver a un firmware sin reposo la apaga.
  await rememberProbeSleeps(storage, ID, false);
  assert.equal(datos.get(probeSleepsKey(ID)), '0');
  assert.equal(probeSleeps(ID), false);
});

test('sin dato de estado no se cambia lo sabido', async () => {
  resetProbeWakeForTests();
  const { datos, storage } = memoria();
  await rememberProbeSleeps(storage, ID, null);
  await rememberProbeSleeps(storage, null, true);
  assert.equal(datos.size, 0);
  assert.equal(await loadProbeSleeps(storage, ID), false);
});

test('avisa a los suscriptores al cambiar la bandera o la desconexión', async () => {
  resetProbeWakeForTests();
  let avisos = 0;
  const off = subscribeProbeWake(() => { avisos += 1; });
  const { storage } = memoria();
  await rememberProbeSleeps(storage, ID, true);
  await rememberProbeSleeps(storage, ID, true);
  recordProbeDisconnect(ID, 10);
  off();
  recordProbeDisconnect(ID, 20);
  assert.equal(avisos, 2);
});

test('la versión informada a la nube sirve de pista desde la 1.2.0', () => {
  assert.equal(firmwareDeclaresSleep('1.2.0'), true);
  assert.equal(firmwareDeclaresSleep('1.10.0'), true);
  assert.equal(firmwareDeclaresSleep('2.0.0'), true);
  assert.equal(firmwareDeclaresSleep('1.1.9'), false);
  assert.equal(firmwareDeclaresSleep('1.1.0'), false);
  assert.equal(firmwareDeclaresSleep(null), false);
  assert.equal(firmwareDeclaresSleep('1.2'), false);
});

test('la bandera leída por BLE manda sobre la pista de versión', async () => {
  resetProbeWakeForTests();
  const { storage } = memoria();
  assert.equal(probeSleepsKnown(ID), false);
  await rememberProbeSleeps(storage, ID, false);
  assert.equal(probeSleepsKnown(ID), true);
  assert.equal(probeSleeps(ID), false);
  recordProbeDisconnect(ID, 5);
  assert.equal(lastProbeDisconnect(ID), 5);
  assert.equal(lastProbeDisconnect('otro'), null);
});
