import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountOperation } from '../src/utils/accountOperation';
import { createQrScanGate } from '../src/utils/qrScanGate';
import { parseDeviceQrPayload } from '../src/utils/deviceId';
test('la solicitud QR se reanuda tras cancelar, pero la respuesta antigua no puede terminar ni desbloquear', async () => {
  let user: string | undefined = 'a'; let time = 0;
  const account = createAccountOperation(user, () => user);
  const gate = createQrScanGate(() => time);
  const qr = 'terrasense://join?token=12345678-1234-4123-8123-123456789abc';
  let resolve!: () => void; const response = new Promise<void>(done => { resolve = done; });
  const old = account.begin(); let finished = false; let busy = true;
  gate.arm(); time = 1000; assert.equal(gate.accept(qr), true); assert.ok(parseDeviceQrPayload(qr));
  const continuation = response.then(() => { if (old()) { finished = true; busy = false; } });
  account.cancel(); gate.cancel(); gate.arm(); time = 2000;
  assert.equal(gate.accept(qr), true); resolve(); await continuation;
  assert.equal(finished, false); assert.equal(busy, true); assert.equal(gate.accept(qr), false);
  user = 'b'; account.cancelIfAccountChanged(); user = 'a';
  assert.equal(old(), false);
});
test('un QR inválido nunca invoca la solicitud y los cuadros repetidos siguen bloqueados', () => {
  let time = 0; let requests = 0; const gate = createQrScanGate(() => time);
  const scan = (data: string) => { if (!gate.accept(data)) return; const token = parseDeviceQrPayload(data); if (!token) gate.reject(data); else requests++; };
  gate.arm(); time = 1000; scan('foreign'); scan('foreign');
  gate.arm(); time = 2000; scan('foreign'); assert.equal(requests, 0);
});
