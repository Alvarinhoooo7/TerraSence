// Diagnóstico de mantenimiento: conserva una copia para inspección, nunca
// reutiliza esa copia como medición ni la publica por BLE.
#pragma once

#include <Arduino.h>
#include "bateria.h"
#include "trama.h"

class MonitorSerie {
public:
  char tomarComando();
  void actualizar(bool capturaEnCurso);
  void menu();
  void mensaje(const char *texto);
  void mostrarBateria(const EstadoBateria &bateria, uint32_t tomadaEn, uint32_t ahora);
  void mostrarEstado(const char *id, bool conectado, bool ventana, bool captura,
                     bool pairPulsado, uint32_t ahora);
  void sensorAmbiente(bool presente, bool humedad, uint8_t direccion);
  void registrarCaptura(const LecturaSuelo &original, const EstadoBateria &bateria,
                       const LecturaAmbiente &aire, const uint8_t *trama,
                       bool solicitadaApp, bool enviada, uint32_t ahora);
  void mostrarCaptura(uint32_t ahora);
  void mostrarAmbiente(uint32_t ahora);
  void mostrarTrama(uint32_t ahora);

private:
  void texto(const char *formato, ...);
  void bateria(const EstadoBateria &valor);
  bool cabeceraCaptura(uint32_t ahora);
  void ambiente();
  void trama();

  // Salida acotada: sin String dinámico, sin flush ni esperas por el monitor.
  char salida_[4096] = {};
  size_t largo_ = 0, enviado_ = 0;
  bool hayCaptura_ = false;
  uint32_t capturaEn_ = 0;
  LecturaSuelo suelo_{};
  EstadoBateria bateria_{};
  LecturaAmbiente aire_{};
  uint8_t trama_[TRAMA_BYTES] = {};
  bool solicitadaApp_ = false, enviada_ = false;
};
