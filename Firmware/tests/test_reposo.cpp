// Pruebas de reposo.h que evalúa el compilador (static_assert): el gesto de
// despertar con PAIR y el temporizador que decide cuándo volver a dormir.
#include "../reposo.h"

// Recorre una secuencia de tramos {nivel, duración} muestreando cada 5 ms,
// como el bucle de clasificarDespertar(), y devuelve el primer resultado.
struct Tramo {
  bool presionado;
  uint32_t ms;
};

template <unsigned N>
constexpr Gesto gesto(const Tramo (&tramos)[N], uint32_t inicio = 1000) {
  GestoDespertar g;
  g.iniciar(tramos[0].presionado, inicio);
  uint32_t t = inicio;
  for (unsigned i = 0; i < N; ++i) {
    for (uint32_t transcurrido = 0; transcurrido < tramos[i].ms; transcurrido += 5) {
      t += 5;
      const Gesto r = g.actualizar(tramos[i].presionado, t);
      if (r != Gesto::Pendiente) return r;
    }
  }
  // Pasado el último tramo, se sigue leyendo el último nivel hasta decidir.
  for (int k = 0; k < 2000; ++k) {
    t += 5;
    const Gesto r = g.actualizar(tramos[N - 1].presionado, t);
    if (r != Gesto::Pendiente) return r;
  }
  return Gesto::Pendiente;
}

// --- Gesto de despertar ---

// Primera pulsación aún presionada al arrancar, suelta y segunda a los 250 ms.
constexpr Tramo DOBLE[] = {{true, 120}, {false, 250}, {true, 150}, {false, 100}};
static_assert(gesto(DOBLE) == Gesto::Despertar, "Dos pulsaciones despiertan");

// La primera ya se soltó durante el arranque: la espera cuenta desde ahí.
constexpr Tramo DOBLE_TRAS_ARRANQUE[] = {{false, 400}, {true, 150}, {false, 100}};
static_assert(gesto(DOBLE_TRAS_ARRANQUE) == Gesto::Despertar, "Segunda pulsación tras un arranque lento");

// Una sola pulsación: vuelve a dormir, nunca despierta del todo.
constexpr Tramo SIMPLE[] = {{true, 150}, {false, 1500}};
static_assert(gesto(SIMPLE) == Gesto::Dormir, "Una pulsación vuelve a dormir");
constexpr Tramo SIN_PULSACION[] = {{false, 1500}};
static_assert(gesto(SIN_PULSACION) == Gesto::Dormir, "Despertar sin pulsación visible vuelve a dormir");

// Segunda pulsación demasiado tarde (1,2 s después de soltar): duerme.
constexpr Tramo TARDE[] = {{true, 100}, {false, 1200}, {true, 200}};
static_assert(gesto(TARDE) == Gesto::Dormir, "La segunda fuera de plazo no cuenta");

// Un rebote de 10 ms al soltar no es una segunda pulsación.
constexpr Tramo REBOTE[] = {{true, 100}, {false, 15}, {true, 10}, {false, 1500}};
static_assert(gesto(REBOTE) == Gesto::Dormir, "El antirrebote filtra el rebote");
// Ni un pico de ruido sin pulsación previa.
constexpr Tramo RUIDO[] = {{false, 300}, {true, 10}, {false, 1500}};
static_assert(gesto(RUIDO) == Gesto::Dormir, "Un pico corto no despierta");

// Mantenida 3 s desde el reposo: abre la ventana PAIR.
constexpr Tramo MANTENIDA[] = {{true, 3500}};
static_assert(gesto(MANTENIDA) == Gesto::Vincular, "Mantener 3 s vincula");
// 2,5 s y soltar: no es vinculación; sin segunda pulsación, duerme.
constexpr Tramo CASI[] = {{true, 2500}, {false, 1500}};
static_assert(gesto(CASI) == Gesto::Dormir, "Menos de 3 s no vincula");
// 2,5 s, soltar y volver a presionar: es una doble pulsación.
constexpr Tramo CASI_DOBLE[] = {{true, 2500}, {false, 300}, {true, 200}};
static_assert(gesto(CASI_DOBLE) == Gesto::Despertar, "Larga y corta también despiertan");

// La segunda pulsación que empieza justo al vencer el plazo y aún rebota no
// deja dormir con PAIR en LOW (ext0 despertaría al instante): se acepta.
constexpr Tramo AL_LIMITE[] = {{true, 100}, {false, 990}, {true, 200}};
static_assert(gesto(AL_LIMITE) == Gesto::Despertar, "Al límite se acepta, nunca duerme presionado");

static_assert(gesto(DOBLE, UINT32_MAX - 300) == Gesto::Despertar, "Debe funcionar al desbordarse millis");
static_assert(gesto(SIMPLE, UINT32_MAX - 300) == Gesto::Dormir, "Debe funcionar al desbordarse millis");

// --- Temporizador de reposo ---

constexpr bool sinConexion(uint32_t t0) {
  TemporizadorReposo r;
  r.iniciar(t0);
  r.actualizar(t0 + 59999, false, false);
  if (r.vencido(t0 + 59999) || r.restante(t0 + 59999) != 1) return false;
  r.actualizar(t0 + 60000, false, false);
  return r.vencido(t0 + 60000) && r.plazo() == REPOSO_SIN_CONEXION_MS;
}
static_assert(sinConexion(1000), "Sin conexión duerme a los 60 s");
static_assert(sinConexion(UINT32_MAX - 30000), "Debe funcionar al desbordarse millis");

constexpr bool graciaTrasDesconexion() {
  TemporizadorReposo r;
  r.iniciar(0);
  r.actualizar(40000, true, false);           // la app se conecta a los 40 s
  r.actualizar(200000, true, false);          // conectada no duerme, aunque pase el plazo
  if (r.vencido(200000)) return false;
  r.actualizar(200010, false, false);         // se desconecta: 2 min de gracia
  if (r.plazo() != REPOSO_GRACIA_TRAS_DESCONEXION_MS || r.restante(200010) != 120000) return false;
  r.actualizar(200010 + 119999, false, false);
  if (r.vencido(200010 + 119999)) return false;
  r.actualizar(200010 + 120000, false, false);
  return r.vencido(200010 + 120000);
}
static_assert(graciaTrasDesconexion(), "Tras desconectarse, duerme a los 2 min");

constexpr bool cadaDesconexionReinicia() {
  TemporizadorReposo r;
  r.iniciar(0);
  r.actualizar(1000, true, false);
  r.actualizar(2000, false, false);           // primera medición
  r.actualizar(100000, true, false);          // segunda, dentro de la gracia
  r.actualizar(101000, false, false);
  return !r.vencido(2000 + 120000) && r.restante(101000 + 60000) == 60000 && r.vencido(101000 + 120000);
}
static_assert(cadaDesconexionReinicia(), "Cada desconexión reinicia los 2 min");

constexpr bool ocupadoNoDuerme() {
  TemporizadorReposo r;
  r.iniciar(0);
  r.actualizar(50000, false, true);           // ventana PAIR o diagnóstico abierto
  r.actualizar(500000, false, true);
  if (r.vencido(500000)) return false;
  // Al terminar corre el plazo completo, desde la última vuelta ocupada.
  r.actualizar(500005, false, false);
  return !r.vencido(500000 + 59999) && r.vencido(500000 + 60000) && r.plazo() == REPOSO_SIN_CONEXION_MS;
}
static_assert(ocupadoNoDuerme(), "Ocupado no duerme y luego corre el plazo completo");

constexpr bool ocupadoEnLaGracia() {
  TemporizadorReposo r;
  r.iniciar(0);
  r.actualizar(1000, true, false);
  r.actualizar(2000, false, false);
  r.actualizar(30000, false, true);           // PAIR presionado dentro de la gracia
  r.actualizar(30100, false, false);
  return r.plazo() == REPOSO_GRACIA_TRAS_DESCONEXION_MS && r.restante(30000) == 120000 &&
         r.restante(30100) == 119900;
}
static_assert(ocupadoEnLaGracia(), "La actividad conserva la gracia tras una medición");

static_assert(REPOSO_GRACIA_TRAS_DESCONEXION_MS == 120000, "La app cuenta 2 min: cambiar ambos lados juntos");
static_assert(REPOSO_DOBLE_PULSACION_MS < PAIR_PULSACION_MS, "La doble pulsación no se confunde con mantener");
