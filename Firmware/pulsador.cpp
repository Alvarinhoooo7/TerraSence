// pulsador.cpp

#include "pulsador.h"
#include "config.h"

void Pulsador::begin() {
  // El esquemático también trae pull-up; el interno es redundante pero inofensivo
  // y mantiene la entrada definida si se prueba el DevKit sin la placa.
  pinMode(pin_, INPUT_PULLUP);
  lecturaCruda_ = digitalRead(pin_) == LOW;
  presionado_ = lecturaCruda_;
  cambioCrudoEn_ = millis();
  presionadoDesde_ = cambioCrudoEn_;
}

EventoPulsador Pulsador::actualizar(uint32_t ahora) {
  const bool crudo = digitalRead(pin_) == LOW;
  if (crudo != lecturaCruda_) {
    lecturaCruda_ = crudo;
    cambioCrudoEn_ = ahora;
  }

  // Sólo se acepta un cambio que se mantuvo estable durante el antirrebote.
  if (lecturaCruda_ != presionado_ && ahora - cambioCrudoEn_ >= ANTIRREBOTE_MS) {
    presionado_ = lecturaCruda_;
    if (presionado_) {
      presionadoDesde_ = ahora;
      pairingEmitido_ = false;
    }
  }

  if (!presionado_) return EventoPulsador::Ninguno;

  const uint32_t mantenido = ahora - presionadoDesde_;
  // La ventana se abre al cumplir 3 s, sin esperar a soltar: el parpadeo azul
  // rápido confirma al usuario que ya puede soltar.
  if (!pairingEmitido_ && mantenido >= PAIR_PULSACION_MS) {
    pairingEmitido_ = true;
    return EventoPulsador::PairingActivado;
  }
  return EventoPulsador::Ninguno;
}
