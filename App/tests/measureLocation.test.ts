import assert from 'node:assert/strict';
import test from 'node:test';
import { captureLocation, initialIncludeLocation, revalidateIncludeLocation } from '../src/utils/measureLocation';

const posicion = { coords: { latitude: -33.45, longitude: -70.66, accuracy: 12 } };

test('la elección guardada manda, pero nunca incluye ubicación sin permiso', () => {
  assert.equal(initialIncludeLocation('on', true, false), true);
  assert.equal(initialIncludeLocation('on', false, false), false);
  assert.equal(initialIncludeLocation('off', true, false), false);
});

test('sin elección guardada se incluye si ya había permiso, salvo en Android antiguo', () => {
  assert.equal(initialIncludeLocation(null, true, false), true);
  assert.equal(initialIncludeLocation(null, true, true), false);
  assert.equal(initialIncludeLocation(null, false, false), false);
});

test('el permiso revocado apaga la opción y avisa; con la opción apagada no hay nada que avisar', () => {
  assert.deepEqual(revalidateIncludeLocation(true, false), { include: false, lost: true });
  assert.deepEqual(revalidateIncludeLocation(true, true), { include: true, lost: false });
  assert.deepEqual(revalidateIncludeLocation(false, false), { include: false, lost: false });
  assert.deepEqual(revalidateIncludeLocation(false, true), { include: false, lost: false });
});

test('con la opción apagada no se pide la posición y las coordenadas quedan nulas', async () => {
  let llamadas = 0;
  const coords = await captureLocation(false, async () => { llamadas += 1; return posicion; });
  assert.equal(coords, null);
  assert.equal(llamadas, 0);
});

test('con la opción encendida devuelve las coordenadas y su precisión real', async () => {
  assert.deepEqual(await captureLocation(true, async () => posicion), posicion.coords);
});

test('permiso perdido o servicios apagados durante la lectura: coordenadas nulas sin error', async () => {
  const coords = await captureLocation(true, async () => { throw new Error('Location services are disabled'); });
  assert.equal(coords, null);
});

test('sin señal la lectura no espera más que el tiempo límite', async () => {
  const inicio = Date.now();
  const coords = await captureLocation(true, () => new Promise<typeof posicion>(() => undefined), 50);
  assert.equal(coords, null);
  assert.ok(Date.now() - inicio < 1000);
});
