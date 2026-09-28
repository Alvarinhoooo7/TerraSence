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
  Encendido,        // un pitido corto
  VentanaAbierta,   // un pitido corto: ya se puede soltar PAIR
  Exito,            // dos pitidos ascendentes: código guardado, medición enviada
  Fallo,            // un tono grave largo: código rechazado, medición sin suelo
  BateriaBaja,      // dos tonos graves, sólo al entrar en batería baja
  Borrado,          // tono grave de 1 s antes de reiniciar
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

private:
  void tocar(uint16_t frecuencia);

  uint8_t     pin_;
  const Nota *notas_ = nullptr;
  uint8_t     total_ = 0;
  uint8_t     indice_ = 0;
  uint32_t    notaDesde_ = 0;
  int32_t     frecuenciaActual_ = -1;
};
