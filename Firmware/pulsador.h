// pulsador.h
//
// Pulsador PAIR (IO33, activo en LOW) con antirrebote no bloqueante.
// Mantenerlo 3 s abre la ventana de vinculación; seguir hasta 10 s borra el
// código guardado. Cada evento se emite una sola vez por pulsación.

#pragma once

#include <Arduino.h>

enum class EventoPulsador { Ninguno, PairingActivado, ResetSolicitado };

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
  bool     resetEmitido_ = false;
};
