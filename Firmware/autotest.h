// Autotest guiado del monitor (opción t): recorre el equipo en orden, sin
// bloquear el bucle, y pide al técnico confirmar con s/n lo que sólo él puede
// ver u oír. Aquí sólo el orden de los pasos, las respuestas y el conteo; las
// pruebas físicas las hace Firmware.ino. Se prueba en tests/test_autotest.cpp.
#pragma once
#include <stddef.h>
#include <stdint.h>

#include "registro.h"

enum class PasoAutotest : uint8_t { Bateria, BusI2C, Ambiente, Sonda, Bluetooth, Luces, Buzzer, Fin };
constexpr uint8_t PASOS_AUTOTEST = uint8_t(PasoAutotest::Fin);
// Plazo para responder s/n: vencido, el paso queda CONFIRMA (sin confirmar).
constexpr uint32_t AUTOTEST_RESPUESTA_MS = 30000;
// Largo de la frase de resultado que el resumen guarda por paso.
constexpr size_t AUTOTEST_DETALLE = 96;

constexpr const char *nombrePaso(PasoAutotest p) {
  switch (p) {
    case PasoAutotest::Bateria: return "Batería";
    case PasoAutotest::BusI2C: return "Bus I2C";
    case PasoAutotest::Ambiente: return "BME280";
    case PasoAutotest::Sonda: return "Sonda RS-485";
    case PasoAutotest::Bluetooth: return "Bluetooth";
    case PasoAutotest::Luces: return "LEDs";
    case PasoAutotest::Buzzer: return "Buzzer";
    case PasoAutotest::Fin: return "Fin";
  }
  return "?";
}

// La prueba individual que repite cada paso, para el resumen.
constexpr const char *comandoPaso(PasoAutotest p) {
  switch (p) {
    case PasoAutotest::Bateria: return "1";
    case PasoAutotest::BusI2C: return "9";
    case PasoAutotest::Ambiente: return "6";
    case PasoAutotest::Sonda: return "7";
    case PasoAutotest::Bluetooth: return "8";
    case PasoAutotest::Luces: return "11";
    case PasoAutotest::Buzzer: return "2";
    case PasoAutotest::Fin: return "";
  }
  return "";
}

class Autotest {
public:
  using Resultado = registro::Resultado;

  constexpr void iniciar(uint32_t ahora) {
    *this = Autotest{};
    activo_ = true;
    desde_ = ahora;
  }
  constexpr void cancelar() { activo_ = false; }
  constexpr bool activo() const { return activo_; }
  constexpr PasoAutotest paso() const { return paso_; }
  constexpr uint8_t numero() const { return uint8_t(paso_) + 1; }
  // El paso arrancó una prueba que termina en otra vuelta del bucle.
  constexpr bool enCurso() const { return enCurso_; }
  constexpr void marcarEnCurso() { enCurso_ = true; }

  // Cierra el paso actual con su veredicto y pasa al siguiente.
  constexpr void registrar(Resultado r) {
    if (!activo_ || paso_ == PasoAutotest::Fin) return;
    resultados_[uint8_t(paso_)] = r;
    paso_ = PasoAutotest(uint8_t(paso_) + 1);
    enCurso_ = false;
    esperando_ = false;
  }

  constexpr void preguntar(uint32_t ahora) {
    esperando_ = true;
    preguntaDesde_ = ahora;
  }
  constexpr bool esperandoRespuesta() const { return activo_ && esperando_; }
  constexpr bool vencida(uint32_t ahora) const {
    return esperandoRespuesta() && ahora - preguntaDesde_ >= AUTOTEST_RESPUESTA_MS;
  }
  // s: el técnico lo vio u oyó (OK); n: no (FALLA). false si no había pregunta.
  constexpr bool responder(bool si) {
    if (!esperandoRespuesta()) return false;
    registrar(si ? Resultado::Ok : Resultado::Falla);
    return true;
  }

  constexpr Resultado resultado(PasoAutotest p) const { return resultados_[uint8_t(p)]; }
  constexpr uint8_t cuenta(Resultado r) const {
    uint8_t n = 0;
    for (uint8_t i = 0; i < PASOS_AUTOTEST; ++i) n += resultados_[i] == r;
    return n;
  }
  // FALLA si algo falló; AVISO si quedó algo por revisar o confirmar; si no, OK.
  constexpr Resultado global() const {
    if (cuenta(Resultado::Falla)) return Resultado::Falla;
    return cuenta(Resultado::Ok) == PASOS_AUTOTEST ? Resultado::Ok : Resultado::Aviso;
  }
  constexpr uint32_t duracionMs(uint32_t ahora) const { return ahora - desde_; }

private:
  Resultado resultados_[PASOS_AUTOTEST] = {Resultado::NoDisponible, Resultado::NoDisponible,
                                           Resultado::NoDisponible, Resultado::NoDisponible,
                                           Resultado::NoDisponible, Resultado::NoDisponible,
                                           Resultado::NoDisponible};
  PasoAutotest paso_ = PasoAutotest::Bateria;
  uint32_t desde_ = 0, preguntaDesde_ = 0;
  bool activo_ = false, enCurso_ = false, esperando_ = false;
};
