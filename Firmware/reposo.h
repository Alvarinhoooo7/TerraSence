// reposo.h
//
// Lógica del reposo profundo, separada del hardware para probarla en el
// compilador (tests/test_reposo.cpp). El equipo duerme sin anuncio BLE y se
// despierta con dos pulsaciones de PAIR; el bucle principal decide cuándo
// volver a dormir. Los tiempos viven en config.h (sección «Reposo profundo»).
//
//   · GestoDespertar clasifica lo que hace el usuario con PAIR justo después
//     de que la primera pulsación despierta al ESP32 (ext0 en IO33):
//       - suelta y vuelve a presionar dentro de REPOSO_DOBLE_PULSACION_MS → Despertar;
//       - la mantiene PAIR_PULSACION_MS desde el arranque → Vincular (abre la ventana PAIR);
//       - una sola pulsación, o ruido sin segunda → Dormir, sin ninguna señal.
//     El arranque tarda unos cientos de milisegundos: si la primera pulsación
//     ya se soltó cuando corre el código, la espera de la segunda cuenta
//     desde ese instante.
//   · TemporizadorReposo cuenta la inactividad: mientras haya una conexión o
//     el equipo esté ocupado no corre; al desconectarse la app concede
//     REPOSO_GRACIA_TRAS_DESCONEXION_MS para medir el punto siguiente, y sin
//     ninguna conexión desde que despertó, REPOSO_SIN_CONEXION_MS.

#pragma once

#include <stdint.h>

#include "config.h"

enum class Gesto : uint8_t { Pendiente, Despertar, Vincular, Dormir };

class GestoDespertar {
public:
  // `presionado` es la lectura de PAIR al empezar (true = en LOW).
  constexpr void iniciar(bool presionado, uint32_t ahora) {
    crudo_ = estable_ = presionado;
    cambioEn_ = desde_ = ahora;
    fase_ = presionado ? Fase::Primera : Fase::EsperaSegunda;
    resultado_ = Gesto::Pendiente;
  }

  // Se llama con cada lectura cruda; el antirrebote es el del pulsador.
  constexpr Gesto actualizar(bool presionado, uint32_t ahora) {
    if (resultado_ != Gesto::Pendiente) return resultado_;
    if (presionado != crudo_) {
      crudo_ = presionado;
      cambioEn_ = ahora;
    }
    if (crudo_ != estable_ && ahora - cambioEn_ >= ANTIRREBOTE_MS) {
      estable_ = crudo_;
      if (fase_ == Fase::Primera && !estable_) {
        fase_ = Fase::EsperaSegunda;
        desde_ = cambioEn_;  // la espera de la segunda cuenta desde que se soltó
      } else if (fase_ == Fase::EsperaSegunda && estable_) {
        return resultado_ = Gesto::Despertar;
      }
    }
    if (fase_ == Fase::Primera && estable_ && ahora - desde_ >= PAIR_PULSACION_MS)
      return resultado_ = Gesto::Vincular;
    // Sólo se vuelve a dormir con el botón suelto también sin filtrar: con
    // PAIR en LOW, ext0 despertaría al instante.
    if (fase_ == Fase::EsperaSegunda && !crudo_ && ahora - desde_ >= REPOSO_DOBLE_PULSACION_MS)
      return resultado_ = Gesto::Dormir;
    return Gesto::Pendiente;
  }

  constexpr Gesto resultado() const { return resultado_; }

private:
  enum class Fase : uint8_t { Primera, EsperaSegunda };
  bool     crudo_ = false;
  bool     estable_ = false;
  uint32_t cambioEn_ = 0;
  uint32_t desde_ = 0;
  Fase     fase_ = Fase::EsperaSegunda;
  Gesto    resultado_ = Gesto::Pendiente;
};

class TemporizadorReposo {
public:
  // Al despertar (o al encender con el interruptor) todavía no hubo conexión.
  constexpr void iniciar(uint32_t ahora) {
    base_ = ahora;
    plazo_ = REPOSO_SIN_CONEXION_MS;
    conectado_ = false;
  }

  // Una vez por vuelta del bucle. `ocupado` agrupa todo lo que no debe
  // interrumpirse: captura, ventana PAIR, PAIR presionado, diagnóstico abierto.
  constexpr void actualizar(uint32_t ahora, bool conectado, bool ocupado) {
    if (conectado_ && !conectado) {
      plazo_ = REPOSO_GRACIA_TRAS_DESCONEXION_MS;
      base_ = ahora;
    }
    conectado_ = conectado;
    if (conectado || ocupado) base_ = ahora;
  }

  // Milisegundos hasta dormir si nada cambia; 0 = ya corresponde dormir.
  constexpr uint32_t restante(uint32_t ahora) const {
    const uint32_t t = ahora - base_;
    return t >= plazo_ ? 0 : plazo_ - t;
  }
  constexpr bool vencido(uint32_t ahora) const { return !conectado_ && restante(ahora) == 0; }
  constexpr uint32_t plazo() const { return plazo_; }

private:
  uint32_t base_ = 0;
  uint32_t plazo_ = REPOSO_SIN_CONEXION_MS;
  bool     conectado_ = false;
};
