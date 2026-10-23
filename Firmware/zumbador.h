// zumbador.h
//
// Buzzer pasivo 9042 (BZ1) en IO19, entre el pin y GND. Al ser pasivo no suena
// con un nivel fijo: necesita una onda cuadrada, que genera el periférico LEDC.
//
// Acompaña a los LEDs con el mismo significado (tabla en Firmware/README.md):
// agudo y corto = salió bien, grave y largo = necesita atención. Cada sonido es
// una secuencia breve no bloqueante; uno nuevo reemplaza al que esté sonando.

#pragma once

#include <Arduino.h>

enum class Sonido : uint8_t {
  Encendido,        // tres notas ascendentes: equipo iniciado
  VentanaAbierta,   // dos llamadas iguales: ya se puede soltar PAIR
  Vinculado,        // tres notas de confirmación, con cierre sostenido
  Exito,            // dos pitidos ascendentes: medición enviada
  Fallo,            // dos notas descendentes: vinculación rechazada, medición sin suelo
  BateriaBaja,      // dos tonos graves, sólo al entrar en batería baja
};

struct Nota {
  uint16_t frecuencia;  // Hz; 0 = silencio
  uint16_t duracionMs;
};

class Zumbador {
public:
  explicit Zumbador(uint8_t pin) : pin_(pin) {}
  void begin();
  void reproducir(Sonido sonido, uint32_t ahora);
  void actualizar(uint32_t ahora);
  void silenciar();
  bool probar(uint32_t ahora);  // tono de 2 s, sin reemplazar sonidos operativos
  bool enPrueba() const { return prueba_; }
  void cancelarPrueba();

private:
  void tocar(uint16_t frecuencia);

  uint8_t     pin_;
  const Nota *notas_ = nullptr;
  uint8_t     total_ = 0;
  uint8_t     indice_ = 0;
  uint32_t    notaDesde_ = 0;
  int32_t     frecuenciaActual_ = -1;
  bool        prueba_ = false;
  uint32_t    pruebaDesde_ = 0;
};
