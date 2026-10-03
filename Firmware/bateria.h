// Evaluación de batería sin depender del ADC ni del servidor BLE.
#pragma once

#include <math.h>
#include <stdint.h>
#include <stddef.h>

#include "config.h"

struct EstadoBateria {
  bool valida = false;
  bool baja = false;
  float voltios = 0;
  uint8_t porcentaje = 0xFF;
};

inline uint8_t porcentajeBateria(float voltios) {
  static const float curva[][2] = {
    {3.30f, 0}, {3.60f, 5}, {3.70f, 15}, {3.75f, 25}, {3.80f, 40},
    {3.85f, 55}, {3.95f, 70}, {4.05f, 85}, {4.20f, 100},
  };
  constexpr size_t n = sizeof(curva) / sizeof(curva[0]);
  if (voltios <= curva[0][0]) return 0;
  if (voltios >= curva[n - 1][0]) return 100;
  for (size_t i = 1; i < n; ++i) {
    if (voltios <= curva[i][0]) {
      const float t = (voltios - curva[i - 1][0]) / (curva[i][0] - curva[i - 1][0]);
      return uint8_t(curva[i - 1][1] + t * (curva[i][1] - curva[i - 1][1]) + 0.5f);
    }
  }
  return 100;
}

inline EstadoBateria evaluarBateria(float voltios, bool bajaAnterior) {
  EstadoBateria estado;
  estado.voltios = voltios;
  // Una tensión imposible, ausente o no finita no representa 0 % ni 100 %.
  if (!isfinite(voltios) || voltios < BATERIA_PRESENTE_MIN_V || voltios > 4.30f) return estado;
  estado.valida = true;
  estado.porcentaje = porcentajeBateria(voltios);
  estado.baja = bajaAnterior ? voltios <= BATERIA_RECUPERADA_V : voltios < BATERIA_BAJA_V;
  return estado;
}
