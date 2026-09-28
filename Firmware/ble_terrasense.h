// ble_terrasense.h
//
// Servidor GATT que espera App/src/services/bleService.ts:
//
//   · Anuncio: UUID del servicio en el paquete principal y el nombre en la
//     respuesta de escaneo (juntos no caben en 31 bytes). Se reanuda después
//     de cada desconexión, porque la app se desconecta tras cada operación.
//   · Identidad (lectura): código de 15 dígitos en ASCII, o vacío.
//   · Provisión (escritura): acepta el código sólo con la ventana PAIR abierta
//     y si no hay uno previo. Si no lo acepta, lo ignora: la app relee la
//     identidad y avisa «Mantén PAIR 3 segundos y reintenta».
//   · Telemetría (notificación): al suscribirse la app, el bucle principal
//     arma una trama nueva de 20 bytes y la notifica una vez.
//
// Los callbacks BLE corren en la tarea de Bluedroid; sólo marcan banderas que
// el bucle principal consume, salvo la provisión, que se resuelve en el mismo
// callback porque la app relee la identidad inmediatamente después de escribir.

#pragma once

#include <Arduino.h>

void bleIniciar();
void bleActualizar(uint32_t ahora);  // reanuda el anuncio y aplica el nombre nuevo

bool bleConectado();
void bleAbrirVentana(uint32_t ahora);
bool bleVentanaAbierta(uint32_t ahora);

// Resultado del último intento de grabar un código, entregado una sola vez.
enum class ResultadoVinculacion : uint8_t { Ninguno, Aceptado, Rechazado };
ResultadoVinculacion bleTomarResultadoVinculacion();

// true una vez por suscripción, cuando ya pasó la espera configurada.
bool bleTomarSolicitudLectura(uint32_t ahora);

// Característica de estado (lectura, 4 bytes): batería en % (0xFF = sin dato)
// y versión mayor, menor y parche del firmware. La app la lee en cada contacto.
void bleActualizarEstado(uint8_t bateriaPct);
bool bleNotificar(const uint8_t *datos, size_t largo);
