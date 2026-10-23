// Reloj del recorrido visual de diagnóstico, independiente del hardware.
#pragma once
#include <stdint.h>

class SecuenciaLeds {
public:
  constexpr void iniciar(uint32_t ahora) { desde_ = ahora; activa_ = true; }
  constexpr void cancelar() { activa_ = false; }
  constexpr bool activa() const { return activa_; }
  // 0: las tres; 1: rojo; 2: verde; 3: azul; 4: terminada/inactiva.
  constexpr uint8_t fase(uint32_t ahora) const {
    const uint32_t t = ahora - desde_;
    return !activa_ || t >= 5000 ? 4 : t < 2000 ? 0 : uint8_t(1 + (t - 2000) / 1000);
  }
  constexpr uint32_t restante(uint32_t ahora) const {
    const uint8_t f = fase(ahora);
    return f == 4 ? 0 : (f == 0 ? 2000U : 2000U + f * 1000U) - (ahora - desde_);
  }
private:
  uint32_t desde_ = 0;
  bool activa_ = false;
};
