// trama.h
//
// Empaquetado de la trama BLE de 20 bytes (versión 1) definida en
// docs/CONTRATO_BLE.md y decodificada por decodeTelemetry() en
// App/src/services/probeService.ts.
//
// Regla del firmware: nunca se envía un valor plausible en lugar de un dato
// ausente. Si no hay lectura de suelo, los bytes 0-14 van todos en 0xFF,
// batería incluida: es el centinela «sin lectura de suelo» del contrato, y la
// app rechaza esa trama con su motivo real sin guardar nada.

#pragma once

#include <stdint.h>
#include <stddef.h>
#include <math.h>

constexpr size_t  TRAMA_BYTES   = 20;
constexpr uint8_t TRAMA_VERSION = 1;

struct LecturaSuelo {
  bool     valida = false;  // true sólo con una respuesta Modbus íntegra de esta captura
  uint16_t humedadX10 = 0;  // % × 10
  int16_t  temperaturaX10 = 0;  // °C × 10, con signo
  uint16_t conductividad = 0;   // µS/cm
  uint16_t phX10 = 0;           // pH × 10
  uint16_t nitrogeno = 0;       // mg/kg
  uint16_t fosforo = 0;         // mg/kg
  uint16_t potasio = 0;         // mg/kg
  uint8_t  bateriaPct = 0;      // 0-100
};

// Rangos de medición del manual de la sonda (ComWinTop CWT-Soil-NPKPHCTH-S):
// humedad 0-100 %, temperatura -40 a +80 °C, CE 0-20.000 µS/cm y N, P, K hasta
// 1.999 mg/kg. El pH se mide de 3 a 9, pero sólo se exige que sea físico
// (≤ 14): fuera de 3-9 la sonda pierde exactitud, no la lectura su escala. Un
// valor fuera de rango delata una escala distinta o una trama corrupta: la
// medición entera se descarta, nunca se recorta.
inline bool sueloPublicable(const LecturaSuelo &suelo) {
  return suelo.valida && suelo.humedadX10 <= 1000 &&
         suelo.temperaturaX10 >= -400 && suelo.temperaturaX10 <= 800 &&
         suelo.conductividad <= 20000 && suelo.phX10 <= 140 &&
         suelo.nitrogeno <= 1999 && suelo.fosforo <= 1999 && suelo.potasio <= 1999 &&
         suelo.bateriaPct <= 100;
}

struct LecturaAmbiente {
  bool  temperaturaOk = false;
  bool  presionOk = false;
  bool  humedadOk = false;
  float temperaturaC = 0;
  float presionHpa = 0;
  float humedadPct = 0;
};

// Centinelas de "sin dato" del BME280: todos los bits de la magnitud a uno.
constexpr uint16_t AMBIENTE_SIN_DATO_12 = 0xFFF;
constexpr uint8_t  AMBIENTE_SIN_DATO_8  = 0xFF;

inline void armarTrama(const LecturaSuelo &suelo, const LecturaAmbiente &aire, uint8_t out[TRAMA_BYTES]) {
  // Escritura explícita byte a byte, big-endian: copiar un struct introduciría
  // el orden little-endian del ESP32 y relleno.
  auto put16 = [&](size_t offset, uint16_t valor) {
    out[offset] = uint8_t(valor >> 8);
    out[offset + 1] = uint8_t(valor & 0xFF);
  };

  if (sueloPublicable(suelo)) {
    put16(0, suelo.humedadX10);
    put16(2, uint16_t(suelo.temperaturaX10));
    put16(4, suelo.conductividad);
    put16(6, suelo.phX10);
    put16(8, suelo.nitrogeno);
    put16(10, suelo.fosforo);
    put16(12, suelo.potasio);
    out[14] = suelo.bateriaPct;
  } else {
    for (size_t i = 0; i <= 14; i++) out[i] = 0xFF;
  }

  out[15] = TRAMA_VERSION;  // metadato de formato, no una lectura: siempre 1

  // Un valor fuera del rango físico del BME280 sólo puede venir de un fallo:
  // se envía como ausente, no recortado.
  const bool tOk = aire.temperaturaOk && aire.temperaturaC >= -40.0f && aire.temperaturaC <= 85.0f;
  const bool pOk = aire.presionOk && aire.presionHpa >= 300.0f && aire.presionHpa <= 1100.0f;
  const bool hOk = aire.humedadOk && aire.humedadPct >= 0.0f && aire.humedadPct <= 100.0f;

  const uint16_t temp12 = tOk ? uint16_t(lroundf(aire.temperaturaC * 10.0f) + 400) : AMBIENTE_SIN_DATO_12;
  const uint16_t pres12 = pOk ? uint16_t(lroundf(aire.presionHpa) - 300) : AMBIENTE_SIN_DATO_12;
  const uint8_t  hum8   = hOk ? uint8_t(lroundf(aire.humedadPct * 2.0f)) : AMBIENTE_SIN_DATO_8;

  out[16] = uint8_t(temp12 >> 4);
  out[17] = uint8_t(((temp12 & 0x0F) << 4) | (pres12 >> 8));
  out[18] = uint8_t(pres12 & 0xFF);
  out[19] = hum8;
}
