// ble_terrasense.h
//
// Servidor GATT que espera App/src/services/bleService.ts:
//
//   · Anuncio: UUID del servicio en el paquete principal y el nombre en la
//     respuesta de escaneo (juntos no caben en 31 bytes). Se reanuda después
//     de cada desconexión, porque la app se desconecta tras cada operación.
//   · Identidad (lectura): el ID de 15 dígitos en ASCII, derivado de la MAC.
//     Siempre presente; no se escribe ni se borra.
//   · Confirmación (escritura, …6104): la app escribe el ID tras registrar la
//     sonda. Se acepta sólo con la ventana PAIR abierta y si coincide; cierra
//     la ventana y avisa con verde y buzzer.
//   · Estado (lectura): batería, versión y ventana PAIR abierta.
//   · Telemetría (notificación): al suscribirse la app, el bucle principal
//     arma una trama nueva de 20 bytes y la notifica una vez.
//
// Los callbacks BLE corren en Bluedroid. Las transiciones compartidas con loop()
// se protegen con mutex; la característica de estado se refresca en onRead.

#pragma once

#include <Arduino.h>

void bleIniciar();
void bleActualizar(uint32_t ahora);  // cierra la ventana vencida y reanuda el anuncio

bool bleConectado();
void bleAbrirVentana(uint32_t ahora);
bool bleVentanaAbierta(uint32_t ahora);

// Resultado del último intento de confirmar la vinculación, entregado una sola vez.
enum class ResultadoVinculacion : uint8_t { Ninguno, Aceptado, Rechazado };
ResultadoVinculacion bleTomarResultadoVinculacion();

// true una vez por suscripción, tras la espera configurada. Guardar sesion con
// la captura: desconectar, desuscribirse o volver a suscribirse la invalidan.
bool bleTomarSolicitudLectura(uint32_t ahora, uint32_t &sesion);
// Consultar antes de avanzar la captura y antes de consumir una nueva solicitud.
bool bleSesionLecturaVigente(uint32_t sesion);

// Característica de estado (lectura, 5 bytes): batería en % (0xFF = sin dato),
// versión mayor, menor y parche, y banderas (bit 0 = ventana PAIR abierta). La
// app la lee en cada contacto.
void bleActualizarEstado(uint8_t bateriaPct);
// Sólo encola si sigue vigente la suscripción que inició esa captura. true
// confirma aceptación local por la pila, no recepción por el teléfono.
bool bleNotificar(const uint8_t *datos, size_t largo, uint32_t sesion);

struct DiagnosticoBle {
  bool inicializado = false;
  bool gattListo = false;
  bool conectado = false;
  bool anunciando = false;
  bool reanudando = false;
  bool lecturaPendiente = false;
  uint8_t estado[5] = {};
  size_t largoEstado = 0;
};
DiagnosticoBle bleDiagnostico();
