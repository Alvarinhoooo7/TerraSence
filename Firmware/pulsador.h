// pulsador.h
//
// Pulsador PAIR (IO33, activo en LOW) con antirrebote no bloqueante.
// Mantenerlo 3 s abre la ventana de vinculación; el evento se emite una sola
// vez por pulsación. No hay pulsación de reset: el único reset de un equipo es
// el del backoffice.

#pragma once

#include <Arduino.h>

enum class EventoPulsador { Ninguno, PairingActivado };

class Pulsador {
public:
  explicit Pulsador(uint8_t pin) : pin_(pin) {}
  void begin();
  EventoPulsador actualizar(uint32_t ahora);

private:
  uint8_t  pin_;
  bool     lecturaCruda_ = false;
  bool     presionado_ = false;
  uint32_t cambioCrudoEn_ = 0;
  uint32_t presionadoDesde_ = 0;
  bool     pairingEmitido_ = false;
};
