// zumbador.cpp

#include "zumbador.h"
#include "config.h"

namespace {
constexpr uint16_t AGUDO = BUZZER_FRECUENCIA_HZ;
constexpr uint16_t ALTO  = BUZZER_FRECUENCIA_HZ * 5 / 4;
constexpr uint16_t GRAVE = BUZZER_FRECUENCIA_HZ / 2;

const Nota ENCENDIDO[] = {{AGUDO, 80}};
const Nota VENTANA[]   = {{AGUDO, 60}};
const Nota EXITO[]     = {{AGUDO, 70}, {0, 50}, {ALTO, 90}};
const Nota FALLO[]     = {{GRAVE, 400}};
const Nota BATERIA[]   = {{GRAVE, 120}, {0, 80}, {GRAVE, 120}};

template <size_t N>
constexpr uint8_t largo(const Nota (&)[N]) { return N; }
}  // namespace

void Zumbador::begin() {
  // El núcleo 3.x asigna el canal LEDC solo. 8 bits bastan para el ciclo de
  // trabajo del 50 % que fija ledcWriteTone.
  ledcAttach(pin_, BUZZER_FRECUENCIA_HZ, 8);
  silenciar();
}

void Zumbador::tocar(uint16_t frecuencia) {
  if (int32_t(frecuencia) == frecuenciaActual_) return;
  ledcWriteTone(pin_, frecuencia);  // 0 deja el pin en LOW
  frecuenciaActual_ = frecuencia;
}

void Zumbador::silenciar() {
  prueba_ = false;
  notas_ = nullptr;
  total_ = 0;
  tocar(0);
}

void Zumbador::reproducir(Sonido sonido, uint32_t ahora) {
  if (!BUZZER_HABILITADO) return;
  prueba_ = false;
  switch (sonido) {
    case Sonido::Encendido:      notas_ = ENCENDIDO; total_ = largo(ENCENDIDO); break;
    case Sonido::VentanaAbierta: notas_ = VENTANA;   total_ = largo(VENTANA);   break;
    case Sonido::Exito:          notas_ = EXITO;     total_ = largo(EXITO);     break;
    case Sonido::Fallo:          notas_ = FALLO;     total_ = largo(FALLO);     break;
    case Sonido::BateriaBaja:    notas_ = BATERIA;   total_ = largo(BATERIA);   break;
  }
  indice_ = 0;
  notaDesde_ = ahora;
  tocar(notas_[0].frecuencia);
}

bool Zumbador::probar(uint32_t ahora) {
  if (!BUZZER_HABILITADO || notas_) return false;
  prueba_ = true;
  pruebaDesde_ = ahora;
  tocar(AGUDO);
  return true;
}

void Zumbador::cancelarPrueba() {
  if (prueba_) silenciar();
}

void Zumbador::actualizar(uint32_t ahora) {
  if (prueba_ && ahora - pruebaDesde_ >= 2000) silenciar();
  if (!notas_) return;
  while (indice_ < total_ && ahora - notaDesde_ >= notas_[indice_].duracionMs) {
    notaDesde_ += notas_[indice_].duracionMs;
    indice_++;
  }
  if (indice_ >= total_) {
    silenciar();
    return;
  }
  tocar(notas_[indice_].frecuencia);
}
