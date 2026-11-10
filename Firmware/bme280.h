// bme280.h
//
// Driver mínimo del BME280 por I2C, sin bibliotecas externas. También acepta
// el BMP280 (mismo encapsulado y mapa, sin humedad), que muchos módulos venden
// como BME280: con él la humedad viaja como centinela. Usa modo forzado
// (una medición por pedido, el sensor duerme entre lecturas) y la compensación
// entera de la hoja de datos de Bosch (BST-BME280-DS002, §4.2.3).
//
// Si el sensor no responde, cada magnitud queda marcada como ausente y la
// trama lleva su centinela. Nunca se reutiliza la última lectura buena.
// Sin validar contra hardware: ver TASK.md.

#pragma once

#include <Arduino.h>
#include <Wire.h>

#include "trama.h"

class Bme280 {
public:
  void begin(TwoWire &bus);
  LecturaAmbiente leer();
  bool presente() const { return direccion_ != 0; }
  uint8_t direccion() const { return direccion_; }
  bool tieneHumedad() const { return humedad_; }
  // Diagnóstico: dirección e ID de un chip que respondió pero no es BME280 ni
  // BMP280 (p. ej. 0x61, un BME680). 0 si no hubo ninguno.
  uint8_t direccionAjena() const { return direccionAjena_; }
  uint8_t idAjeno() const { return idAjeno_; }

private:
  LecturaAmbiente leerMuestra();
  bool detectar();
  bool leerCalibracion();
  bool escribir(uint8_t registro, uint8_t valor);
  bool leerBloque(uint8_t registro, uint8_t *destino, size_t largo);

  TwoWire *bus_ = nullptr;
  uint8_t  direccion_ = 0;  // 0x76 o 0x77; 0 = no encontrado
  bool     humedad_ = false;  // false con un BMP280
  uint8_t  direccionAjena_ = 0, idAjeno_ = 0;

  // Coeficientes de calibración grabados de fábrica en cada sensor.
  uint16_t T1_ = 0; int16_t T2_ = 0, T3_ = 0;
  uint16_t P1_ = 0; int16_t P2_ = 0, P3_ = 0, P4_ = 0, P5_ = 0, P6_ = 0, P7_ = 0, P8_ = 0, P9_ = 0;
  uint8_t  H1_ = 0, H3_ = 0; int16_t H2_ = 0, H4_ = 0, H5_ = 0; int8_t H6_ = 0;
};
