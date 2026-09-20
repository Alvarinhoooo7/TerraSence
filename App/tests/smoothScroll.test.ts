import assert from 'node:assert/strict';
import test from 'node:test';
import { easeOutCubic, maxScrollOffset, scrollTweenDuration, scrollTweenPosition } from '../src/utils/smoothScroll';

test('la curva parte en el origen, termina en el destino y nunca lo sobrepasa', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  let previous = 0;
  for (let step = 1; step <= 20; step += 1) {
    const value = easeOutCubic(step / 20);
    assert.ok(value > previous, 'avanza siempre hacia adelante');
    assert.ok(value <= 1, 'no rebota por encima del destino');
    previous = value;
  }
});

test('la duración se ajusta al recorrido y se mantiene dentro de límites legibles', () => {
  assert.equal(scrollTweenDuration(0), 0);
  assert.equal(scrollTweenDuration(50), 300, 'un recorrido corto no se vuelve un salto');
  assert.equal(scrollTweenDuration(100000), 1100, 'un texto largo no se vuelve eterno');
  assert.ok(scrollTweenDuration(1500) > 300 && scrollTweenDuration(1500) < 1100);
  assert.equal(scrollTweenDuration(-800), scrollTweenDuration(800), 'el sentido no cambia el ritmo');
  assert.equal(scrollTweenDuration(Number.NaN), 300);
});

test('la posición avanza de principio a fin y se queda en el destino al terminar', () => {
  assert.equal(scrollTweenPosition(0, 900, 0, 600), 0);
  assert.equal(scrollTweenPosition(0, 900, 600, 600), 900);
  assert.equal(scrollTweenPosition(0, 900, 5000, 600), 900, 'no se pasa aunque el reloj siga corriendo');
  assert.equal(scrollTweenPosition(0, 900, -50, 600), 0, 'un reloj hacia atrás no retrocede el texto');
  const middle = scrollTweenPosition(100, 900, 300, 600);
  assert.ok(middle > 100 && middle < 900);
  // Sin duración válida no hay animación posible: se va directo al destino.
  assert.equal(scrollTweenPosition(0, 900, 10, 0), 900);
  assert.equal(scrollTweenPosition(0, 900, 10, Number.NaN), 900);
});

test('el final del recorrido nunca es negativo aunque el texto quepa entero', () => {
  assert.equal(maxScrollOffset(2000, 800), 1200);
  assert.equal(maxScrollOffset(400, 800), 0, 'un texto que cabe ya está al final');
  assert.equal(maxScrollOffset(Number.NaN, 800), 0);
});
