// Diagnóstico serial local; no conserva ni publica mediciones anteriores.
#pragma once
#include <Arduino.h>
#include "bateria.h"
#include "trama.h"
#include "ble_terrasense.h"
#include "comandos_monitor.h"

class MonitorSerie {
public:
  uint8_t tomarComando();
  bool activo() const { return entrada_.abierta(); }
  void actualizar(bool capturaEnCurso);
  void menu();
  void salir();
  void mensaje(const char *texto);
  // Agrega un evento sin borrar el menú o informe que se está imprimiendo.
  void evento(const char *texto);
  // Aviso de inicio de una prueba con resultado diferido (sonda, I2C): sale de
  // inmediato, antes de los mensajes de esa prueba, y nunca se borra ni se retiene.
  void aviso(const char *texto);
  void mostrarAdc(const EstadoBateria &bateria, uint16_t adc, uint16_t milivoltios);
  void mostrarAmbienteNuevo(const LecturaAmbiente &aire, bool presente, bool humedad);
  void mostrarSonda(const LecturaSuelo &suelo, const uint8_t *crudo, size_t largo, uint8_t descartados);
  void mostrarBle(const DiagnosticoBle &estado, const char *id);

private:
  void texto(const char *formato, ...);
  void hexadecimal(const char *nombre, const uint8_t *bytes, size_t largo);
  EntradaMonitor entrada_;
  // Salida acotada: sin String dinámico, sin flush ni esperas por el monitor.
  char salida_[2048] = {};
  size_t largo_ = 0, enviado_ = 0;
};
