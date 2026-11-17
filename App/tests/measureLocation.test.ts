import assert from 'node:assert/strict';
import test from 'node:test';
import { captureLocation, choiceAfterAsking, choiceAfterRevocation, nextLocationStep, revokedNoticeDue } from '../src/utils/measureLocation';

const posicion = { coords: { latitude: -33.45, longitude: -70.66, accuracy: 12 } };

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

test('con la elección apagada nunca se captura ni se pregunta', () => {
  assert.equal(nextLocationStep('off', { granted: true, canAskAgain: true }, false), 'skip');
  assert.equal(nextLocationStep('off', { granted: false, canAskAgain: true }, false), 'skip');
});

test('con la elección encendida y permiso se captura', () => {
  assert.equal(nextLocationStep('on', { granted: true, canAskAgain: true }, false), 'capture');
});

test('sin elección guardada se pregunta una vez; con permiso previo se captura directo', () => {
  assert.equal(nextLocationStep(null, { granted: false, canAskAgain: true }, false), 'ask');
  assert.equal(nextLocationStep(null, { granted: true, canAskAgain: true }, false), 'capture');
});

test('si el sistema ya no pregunta, se mide sin ubicación y sin insistir', () => {
  assert.equal(nextLocationStep(null, { granted: false, canAskAgain: false }, false), 'skip');
});

test('en Android antiguo el permiso existe por el Bluetooth: se pregunta dentro de la app', () => {
  assert.equal(nextLocationStep(null, { granted: true, canAskAgain: true }, true), 'ask');
});

test('un permiso revocado no reabre la pregunta', () => {
  assert.equal(nextLocationStep('on', { granted: false, canAskAgain: true }, false), 'skip');
});

test('una ubicación aceptada queda activa para siempre: vuelve a capturar en cuanto el teléfono devuelve el permiso', () => {
  assert.equal(choiceAfterRevocation('on'), 'on');
  assert.equal(nextLocationStep(choiceAfterRevocation('on'), { granted: true, canAskAgain: true }, false), 'capture');
});

test('el aviso de permiso retirado sale una sola vez por cada retiro', () => {
  assert.equal(revokedNoticeDue('on', false, false), true);
  assert.equal(revokedNoticeDue('on', false, true), false);
  assert.equal(revokedNoticeDue('on', true, false), false);
  assert.equal(revokedNoticeDue('off', false, false), false);
  assert.equal(revokedNoticeDue(null, false, false), false);
});

test('después de preguntar siempre queda una elección guardada', () => {
  assert.equal(choiceAfterAsking(true), 'on');
  assert.equal(choiceAfterAsking(false), 'off');
});
