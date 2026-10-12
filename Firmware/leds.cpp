// leds.cpp
//
// Encendido/apagado simple con digitalWrite: sin PWM ni pulsos de brillo, que
// obligaban a recalcular el brillo en cada vuelta del bucle y dejaban el LED
// encendido a media intensidad casi todo el tiempo.

#include "leds.h"

namespace {
constexpr uint32_t DESTELLO_MS      = 120;    // encendido y apagado de cada destello
constexpr uint32_t ENCENDIDO_MS     = 1000;
constexpr uint32_t LATIDO_PERIODO_MS = 10000;
constexpr uint32_t LATIDO_ON_MS     = 80;

// Duración de un aviso; 0 si el patrón no es un aviso.
uint32_t duracionAviso(PatronLed p) {
  switch (p) {
    case PatronLed::TresDestellos: return 6 * DESTELLO_MS;
    case PatronLed::Encendido1s:   return ENCENDIDO_MS;
    default:                       return 0;
  }
}

bool nivel(PatronLed p, uint32_t t) {
  switch (p) {
    case PatronLed::Apagado:       return false;
    case PatronLed::Parpadeo2Hz:   return (t % 500) < 250;
    case PatronLed::Latido10s:     return (t % LATIDO_PERIODO_MS) < LATIDO_ON_MS;
    case PatronLed::TresDestellos: return (t / DESTELLO_MS) % 2 == 0;  // tramos 0, 2, 4
    case PatronLed::Encendido1s:   return true;
  }
  return false;
}
}  // namespace

void Led::begin() {
  pinMode(pin_, OUTPUT);
  apagar();
}

void Led::fondo(PatronLed patron, uint32_t ahora) {
  if (patron != PatronLed::Apagado) cancelarPrueba();
  if (patron == fondo_) return;
  fondo_ = patron;
  fondoDesde_ = ahora;
}

void Led::aviso(PatronLed patron, uint32_t ahora) {
  cancelarPrueba();
  aviso_ = patron;
  avisoDesde_ = ahora;
}

void Led::apagar() {
  cancelarPrueba();
  fondo_ = PatronLed::Apagado;
  aviso_ = PatronLed::Apagado;
  digitalWrite(pin_, LOW);
  estado_ = 0;
}

bool Led::probar(uint32_t ahora) {
  if (fondo_ != PatronLed::Apagado ||
      (aviso_ != PatronLed::Apagado && ahora - avisoDesde_ < duracionAviso(aviso_))) return false;
  prueba_ = true;
  pruebaDesde_ = ahora;
  return true;
}

void Led::actualizar(uint32_t ahora) {
  bool encendido;
  const uint32_t tAviso = ahora - avisoDesde_;
  if (aviso_ != PatronLed::Apagado && tAviso < duracionAviso(aviso_)) {
    encendido = nivel(aviso_, tAviso);
  } else {
    aviso_ = PatronLed::Apagado;
    encendido = nivel(fondo_, ahora - fondoDesde_);
  }
  if (prueba_ && ahora - pruebaDesde_ >= ENCENDIDO_MS) cancelarPrueba();
  if (prueba_) encendido = true;
  if (int8_t(encendido) != estado_) {
    digitalWrite(pin_, encendido ? HIGH : LOW);
    estado_ = encendido;
  }
}
