import assert from 'node:assert/strict';
import test from 'node:test';

import { createKeyedLock } from '../src/utils/keyedLock';

/**
 * `createKeyedLock` es la exclusión mutua que protege la cola offline por cuenta.
 * Sin ella, dos escrituras concurrentes sobre `@terrasense/pending_measurements`
 * leen la misma lista y la última en escribir descarta la medición de la otra.
 */

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

test('serializa operaciones de la misma cuenta y conserva el orden', async () => {
  const locked = createKeyedLock();
  const traza: string[] = [];
  const primera = deferred<void>();

  const a = locked('cuenta-1', async () => {
    traza.push('a:inicio');
    await primera.promise;
    traza.push('a:fin');
  });
  const b = locked('cuenta-1', async () => { traza.push('b:inicio'); });

  // Mientras `a` no termina, `b` no debe haber empezado.
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(traza, ['a:inicio']);

  primera.resolve();
  await Promise.all([a, b]);
  assert.deepEqual(traza, ['a:inicio', 'a:fin', 'b:inicio']);
});

test('no bloquea entre cuentas distintas', async () => {
  const locked = createKeyedLock();
  const traza: string[] = [];
  const bloqueo = deferred<void>();

  const a = locked('cuenta-1', async () => {
    traza.push('cuenta-1:inicio');
    await bloqueo.promise;
  });
  const b = locked('cuenta-2', async () => { traza.push('cuenta-2:fin'); });

  // La cuenta 2 avanza aunque la cuenta 1 siga esperando: cambiar de sesión
  // no debe quedar atrapado tras una sincronización pendiente de otra cuenta.
  await b;
  assert.deepEqual(traza, ['cuenta-1:inicio', 'cuenta-2:fin']);

  bloqueo.resolve();
  await a;
});

test('una operación fallida no bloquea las siguientes de la misma cuenta', async () => {
  const locked = createKeyedLock();

  const fallo = locked('cuenta-1', async () => { throw new Error('sin red'); });
  await assert.rejects(fallo, /sin red/);

  // El error se propaga a quien llamó, pero la cadena queda utilizable:
  // un corte de red no puede dejar la cola inservible hasta reiniciar la app.
  const resultado = await locked('cuenta-1', async () => 'siguiente');
  assert.equal(resultado, 'siguiente');
});

test('un rechazo previo no arrastra el fallo a la operación encolada detrás', async () => {
  const locked = createKeyedLock();
  const traza: string[] = [];

  const fallo = locked('cuenta-1', async () => { throw new Error('sin red'); });
  const siguiente = locked('cuenta-1', async () => { traza.push('ejecutada'); return 42; });

  await assert.rejects(fallo, /sin red/);
  assert.equal(await siguiente, 42);
  assert.deepEqual(traza, ['ejecutada']);
});

test('devuelve el valor de la operación y propaga el tipo', async () => {
  const locked = createKeyedLock();
  assert.deepEqual(await locked('cuenta-1', async () => ({ sent: 2, remaining: 0 })), {
    sent: 2,
    remaining: 0,
  });
});

test('escrituras concurrentes sobre una lista compartida no se pisan', async () => {
  // Reproduce el patrón real: leer la cola, modificarla y volver a escribirla.
  const locked = createKeyedLock();
  let cola: string[] = [];

  const encolar = (uuid: string) =>
    locked('cuenta-1', async () => {
      const actual = cola;                       // lectura
      await new Promise((r) => setTimeout(r, 1)); // ventana de carrera
      cola = [...actual, uuid];                   // escritura
    });

  await Promise.all(['m1', 'm2', 'm3', 'm4'].map(encolar));
  assert.deepEqual(cola, ['m1', 'm2', 'm3', 'm4']);
});

test('sin exclusión mutua la misma secuencia sí pierde escrituras', async () => {
  // Prueba de control: justifica por qué existe keyedLock. Si esta prueba
  // dejara de perder datos, el escenario de carrera habría cambiado.
  let cola: string[] = [];

  const encolarSinLock = async (uuid: string) => {
    const actual = cola;
    await new Promise((r) => setTimeout(r, 1));
    cola = [...actual, uuid];
  };

  await Promise.all(['m1', 'm2', 'm3', 'm4'].map(encolarSinLock));
  assert.equal(cola.length, 1, 'sin lock solo sobrevive la última escritura');
});
