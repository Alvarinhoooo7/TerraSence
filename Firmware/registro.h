// Formato único de la consola serie: cada línea lleva la hora desde el
// arranque y el área entre corchetes, y las continuaciones van sangradas:
//
//      12.40s [SONDA]    FALLA    sin respuesta a 4800 ni 9600 baudios
//                        causa: sin 5 V o sin GND común; A/B invertidos ...
//                        sigue: envía 10 para ver los bytes crudos
//
// Las etiquetas entre corchetes ([SONDA], [ENSAYO], ...) se conservan porque
// los análisis de registros de banco filtran por ellas.
#pragma once
#include <stddef.h>
#include <stdint.h>

namespace registro {

// Columna en que empieza el texto: 8 de hora, un espacio y 11 de área.
constexpr size_t SANGRIA = 20;
// Hora de hasta 7 dígitos de segundos (49,7 días), área de hasta 8 letras.
constexpr size_t LARGO_PREFIJO = 24;

// Escribe «   12.40s [SONDA]    » en `out` (LARGO_PREFIJO bytes) y devuelve
// su largo. Sin printf para poder probarlo en el compilador.
constexpr size_t prefijo(char *out, uint32_t ms, const char *area) {
  char inverso[12] = {};
  size_t r = 0;
  const uint32_t centesimas = ms / 10;
  inverso[r++] = 's';
  inverso[r++] = char('0' + centesimas % 10);
  inverso[r++] = char('0' + centesimas / 10 % 10);
  inverso[r++] = '.';
  uint32_t segundos = centesimas / 100;
  do {
    inverso[r++] = char('0' + segundos % 10);
    segundos /= 10;
  } while (segundos);
  size_t k = 0;
  for (size_t i = r; i < 8; ++i) out[k++] = ' ';
  while (r) out[k++] = inverso[--r];
  out[k++] = ' ';
  const size_t inicio = k;
  out[k++] = '[';
  for (size_t i = 0; area[i] && i < 8; ++i) out[k++] = area[i];
  out[k++] = ']';
  while (k - inicio < 11) out[k++] = ' ';
  out[k] = '\0';
  return k;
}

// Veredicto de una prueba. CONFIRMA: el equipo ordenó una salida física (luz,
// sonido) que sólo el técnico puede comprobar.
enum class Resultado : uint8_t { Ok, Aviso, Falla, NoDisponible, Confirmar };

constexpr const char *etiqueta(Resultado r) {
  switch (r) {
    case Resultado::Ok: return "OK";
    case Resultado::Aviso: return "AVISO";
    case Resultado::Falla: return "FALLA";
    case Resultado::NoDisponible: return "N/D";
    case Resultado::Confirmar: return "CONFIRMA";
  }
  return "?";
}

// Causa probable y siguiente paso de un veredicto; cualquiera puede faltar.
struct Pista {
  const char *causa = nullptr;
  const char *sigue = nullptr;
};

// --- Salida directa al puerto (sólo en el equipo) ---
// Modo detallado (opción v del monitor): agrega el HEX de cada informe y la
// ráfaga muestra a muestra. Apagado al arrancar; las fallas se detallan igual.
bool detallado();
void detallado(bool activo);

// Cada llamada arma la línea completa y la escribe de una vez, para que los
// mensajes de Bluetooth (otra tarea) no se intercalen a mitad de línea. Un
// '\n' dentro del texto continúa sangrado.
void linea(const char *area, const char *formato, ...) __attribute__((format(printf, 2, 3)));
void veredicto(const char *area, Resultado resultado, const Pista &pista, const char *formato, ...)
    __attribute__((format(printf, 4, 5)));

}  // namespace registro
