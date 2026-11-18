// Pruebas de registro.h y causas_diagnostico.h que evalúa el compilador
// (static_assert): no requieren ejecutar binarios ni conectar el ESP32.
#include "../causas_diagnostico.h"

constexpr bool igual(const char *a, const char *b) {
  size_t i = 0;
  for (; a[i] && b[i]; ++i)
    if (a[i] != b[i]) return false;
  return a[i] == b[i];
}

constexpr bool prefijo(uint32_t ms, const char *area, const char *esperado) {
  char out[registro::LARGO_PREFIJO] = {};
  const size_t n = registro::prefijo(out, ms, area);
  return igual(out, esperado) && out[n] == '\0';
}

static_assert(prefijo(0, "SONDA", "   0.00s [SONDA]    "), "Hora cero alineada a la columna 20");
static_assert(prefijo(12345, "BAT", "  12.34s [BAT]      "), "Centésimas truncadas, no redondeadas");
static_assert(prefijo(99999999, "AUTOTEST", "99999.99s [AUTOTEST] "), "Área de 8 letras deja un espacio");
static_assert(prefijo(UINT32_MAX, "ENSAYO", "4294967.29s [ENSAYO]   "), "El desborde de millis cabe");
static_assert(prefijo(5, "TAMANOLARGO", "   0.00s [TAMANOLA] "), "Área recortada a 8 letras");

constexpr bool todasLasFallasTienenPista() {
  for (uint8_t i = 1; i <= uint8_t(modbus::Fallo::Cancelada); ++i) {
    const registro::Pista p = causas::modbus(modbus::Fallo(i));
    if (!p.causa || !p.sigue || !p.causa[0] || !p.sigue[0]) return false;
  }
  const registro::Pista ninguna = causas::modbus(modbus::Fallo::Ninguno);
  return !ninguna.causa && !ninguna.sigue;
}
static_assert(todasLasFallasTienenPista(), "Cada fallo Modbus explica causa y siguiente paso");

constexpr LecturaSuelo suelo(uint16_t hum, int16_t temp, uint16_t ph, uint16_t k) {
  LecturaSuelo s;
  s.valida = true;
  s.humedadX10 = hum;
  s.temperaturaX10 = temp;
  s.phX10 = ph;
  s.potasio = k;
  return s;
}
static_assert(!causas::campoFueraDeRango(suelo(1000, -400, 140, 1999)), "Los extremos del manual son válidos");
static_assert(igual(causas::campoFueraDeRango(suelo(0, 215, 650, 0)), "pH"), "pH × 100 se delata");
static_assert(igual(causas::campoFueraDeRango(suelo(1001, 0, 70, 0)), "humedad"), "Humedad sobre 100 %");
static_assert(igual(causas::campoFueraDeRango(suelo(0, -401, 70, 0)), "temperatura"), "Bajo -40 °C");
static_assert(igual(causas::campoFueraDeRango(suelo(0, 0, 70, 2000)), "K"), "K sobre 1.999 mg/kg");
using registro::Resultado;
constexpr EstadoBateria celda(bool valida, bool baja, float voltios) {
  EstadoBateria b;
  b.valida = valida;
  b.baja = baja;
  b.voltios = voltios;
  return b;
}
static_assert(causas::bateria(celda(true, false, 3.9f)).resultado == Resultado::Ok, "Celda normal");
static_assert(causas::bateria(celda(true, true, 3.3f)).resultado == Resultado::Aviso, "Celda baja");
static_assert(causas::bateria(celda(false, false, 0.1f)).resultado == Resultado::NoDisponible, "Sin celda");
static_assert(causas::bateria(celda(false, false, 4.8f)).resultado == Resultado::Falla, "Tensión imposible");

static_assert(causas::busI2C(0, 0, 0).resultado == Resultado::Falla, "Bus mudo");
static_assert(causas::busI2C(1, 0, 0x60).resultado == Resultado::Ok, "BME280 sin errores");
static_assert(causas::busI2C(1, 2, 0x60).resultado == Resultado::Aviso, "BME280 con errores de bus");
static_assert(causas::busI2C(1, 0, 0x58).resultado == Resultado::Aviso, "BMP280 sin humedad");
static_assert(causas::busI2C(1, 0, 0).resultado == Resultado::Aviso, "Dispositivos sin 0x76/0x77");
static_assert(causas::busI2C(1, 0, 0xFF).resultado == Resultado::Aviso, "Identidad ilegible");
static_assert(igual(registro::etiqueta(Resultado::Confirmar), "CONFIRMA"), "Etiquetas de veredicto");

static_assert(causas::ambiente(false, false, false, false, false).resultado == Resultado::Falla, "Sin sensor");
static_assert(causas::ambiente(true, true, true, true, true).resultado == Resultado::Ok, "BME280 completo");
static_assert(causas::ambiente(true, false, true, true, false).resultado == Resultado::Aviso,
              "BMP280: la humedad ausente no es falla");
static_assert(causas::ambiente(true, true, true, false, true).resultado == Resultado::Falla, "Presión imposible");

using F = modbus::Fallo;
static_assert(causas::sonda(true, nullptr, 10, 10, F::Ninguno).resultado == Resultado::Ok, "Ráfaga completa");
static_assert(causas::sonda(true, nullptr, 7, 10, F::Crc).resultado == Resultado::Aviso, "Ráfaga parcial");
static_assert(igual(causas::sonda(true, nullptr, 7, 10, F::Crc).pista.causa, causas::modbus(F::Crc).causa),
              "La ráfaga parcial explica su fallo");
static_assert(causas::sonda(true, "pH", 10, 10, F::Ninguno).resultado == Resultado::Falla, "Fuera de rango");
static_assert(causas::sonda(false, nullptr, 0, 10, F::Silencio).resultado == Resultado::Falla, "Sin respuesta");

static_assert(causas::bluetooth(false, true, false, true, false).resultado == Resultado::Falla, "Pila caída");
static_assert(causas::bluetooth(true, false, false, true, false).resultado == Resultado::Falla, "GATT incompleto");
static_assert(causas::bluetooth(true, true, true, false, false).resultado == Resultado::Ok, "Conectado");
static_assert(causas::bluetooth(true, true, false, true, false).resultado == Resultado::Ok, "Anunciando");
static_assert(causas::bluetooth(true, true, false, false, true).resultado == Resultado::Aviso, "Reanunciando");
static_assert(causas::bluetooth(true, true, false, false, false).resultado == Resultado::Falla, "Sin anuncio");
