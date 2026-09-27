// leds.h
//
// Tres LEDs discretos (azul, verde, rojo; activos en HIGH), apagados en
// reposo. Sólo se encienden para decir algo que el usuario necesita saber, y
// cada color tiene un único significado:
//
//   · Azul  = vinculación (ventana PAIR abierta).
//   · Verde = algo salió bien (encendido, código guardado, medición enviada).
//   · Rojo  = algo necesita atención (fallo, batería baja).
//
// Cada LED tiene un patrón de fondo, que dura mientras dura el estado (por
// ejemplo, la ventana PAIR), y puede mostrar encima un aviso breve que se
// apaga solo. La tabla completa está en Firmware/README.md.

#pragma once

#include <Arduino.h>

enum class PatronLed {
  // Fondos: se repiten mientras se mantengan.
  Apagado,
  Parpadeo2Hz,   // azul: ventana de vinculación abierta
  Latido10s,     // rojo: batería baja (un destello corto cada 10 s)
  // Avisos: una sola vez, luego vuelve el fondo.
  TresDestellos, // verde = éxito; rojo = fallo
  Encendido1s,   // verde: la sonda acaba de encender; rojo: borrado de fábrica
};

class Led {
public:
  explicit Led(uint8_t pin) : pin_(pin) {}
  void begin();
  // Patrón de fondo. Cambiarlo reinicia su fase: un parpadeo empieza encendido.
  void fondo(PatronLed patron, uint32_t ahora);
  // Aviso breve encima del fondo. Uno nuevo reemplaza al que esté en curso.
  void aviso(PatronLed patron, uint32_t ahora);
  void actualizar(uint32_t ahora);
  void apagar();

private:
  uint8_t   pin_;
  PatronLed fondo_ = PatronLed::Apagado;
  uint32_t  fondoDesde_ = 0;
  PatronLed aviso_ = PatronLed::Apagado;
  uint32_t  avisoDesde_ = 0;
  int8_t    estado_ = -1;  // último nivel escrito en el pin
};
