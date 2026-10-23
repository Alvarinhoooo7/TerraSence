#include "../secuencia_leds.h"

constexpr bool recorrido(uint32_t inicio) {
  SecuenciaLeds s;
  if (s.activa() || s.fase(inicio) != 4 || s.restante(inicio)) return false;
  s.iniciar(inicio);
  if (!s.activa() || s.fase(inicio) != 0 || s.restante(inicio) != 2000) return false;
  if (s.fase(inicio + 1999) != 0 || s.restante(inicio + 1999) != 1) return false;
  if (s.fase(inicio + 2000) != 1 || s.restante(inicio + 2000) != 1000) return false;
  if (s.fase(inicio + 2999) != 1 || s.restante(inicio + 2999) != 1) return false;
  if (s.fase(inicio + 3000) != 2 || s.restante(inicio + 3000) != 1000) return false;
  if (s.fase(inicio + 3999) != 2 || s.restante(inicio + 3999) != 1) return false;
  if (s.fase(inicio + 4000) != 3 || s.restante(inicio + 4000) != 1000) return false;
  if (s.fase(inicio + 4999) != 3 || s.restante(inicio + 4999) != 1) return false;
  return s.fase(inicio + 5000) == 4 && s.restante(inicio + 5000) == 0;
}

constexpr bool cancelarYReiniciar() {
  SecuenciaLeds s;
  s.iniciar(100);
  s.cancelar();
  if (s.activa() || s.fase(200) != 4 || s.restante(200)) return false;
  s.iniciar(500);
  if (s.fase(500) != 0 || s.restante(500) != 2000) return false;
  // Una vuelta tardía salta a la fase real, sin alargar la secuencia.
  return s.fase(4750) == 3 && s.restante(4750) == 750 && s.fase(9000) == 4;
}

static_assert(recorrido(100), "Todas 2 s, rojo 1 s, verde 1 s, azul 1 s y apagado");
static_assert(recorrido(UINT32_MAX - 2500), "Debe funcionar al desbordarse millis");
static_assert(cancelarYReiniciar(), "Cancelar, reiniciar y saltar fases no debe dejar luces fijas");
