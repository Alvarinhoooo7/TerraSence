// sonda.h
//
// Adquisición de la sonda de suelo 7 en 1 por RS-485: energiza la sonda (IO5),
// consulta sus registros con el transporte Modbus de modbus.h y los convierte a
// LecturaSuelo. No bloquea el bucle: iniciar() arranca una captura y
// actualizar() la avanza hasta que terminada() es true.
//
// Ante cualquier fallo (silencio, CRC, excepción, conexión perdida) la lectura
// queda inválida y la trama viaja con el centinela del contrato. Nunca reutiliza
// una captura anterior.

#pragma once

#include <Arduino.h>

#include "modbus.h"
#include "trama.h"

class Sonda {
public:
  void begin();
  bool iniciar(uint32_t ahora);  // false si ya hay una captura en curso
  void actualizar(uint32_t ahora);
  void cancelar();
  bool ocupada() const { return estado_ == Estado::Midiendo; }
  bool terminada() const { return estado_ == Estado::Terminada; }
  // Entrega el resultado una sola vez y deja la sonda libre para otra captura.
  LecturaSuelo tomarLectura();

private:
  enum class Estado : uint8_t { Libre, Midiendo, Terminada };
  bool consultar(uint32_t ahora);
  void convertir(const uint16_t *registros);

  Estado estado_ = Estado::Libre;
  uint8_t velocidad_ = 0;  // índice en SONDA_BAUDIOS
  LecturaSuelo lectura_{};
};
