#include "registro.h"

#include <Arduino.h>
#include <stdarg.h>
#include <stdio.h>

namespace registro {
namespace {

bool detalle = false;

// Copia `texto` a `out` sangrando cada línea que sigue a un '\n' interno.
size_t sangrar(char *out, size_t cap, size_t k, const char *texto) {
  for (size_t i = 0; texto[i] && k + 1 < cap; ++i) {
    out[k++] = texto[i];
    if (texto[i] == '\n' && texto[i + 1])
      for (size_t s = 0; s < SANGRIA && k + 1 < cap; ++s) out[k++] = ' ';
  }
  return k;
}

void escribir(const char *area, const char *cuerpo, const Pista *pista) {
  char salida[576];
  size_t k = prefijo(salida, millis(), area);
  k = sangrar(salida, sizeof(salida), k, cuerpo);
  auto continuar = [&](const char *rotulo, const char *texto) {
    if (!texto) return;
    if (k + 1 < sizeof(salida)) salida[k++] = '\n';
    for (size_t s = 0; s < SANGRIA && k + 1 < sizeof(salida); ++s) salida[k++] = ' ';
    k = sangrar(salida, sizeof(salida), k, rotulo);
    k = sangrar(salida, sizeof(salida), k, texto);
  };
  if (pista) {
    continuar("causa: ", pista->causa);
    continuar("sigue: ", pista->sigue);
  }
  if (k + 1 < sizeof(salida)) salida[k++] = '\n';
  Serial.write(reinterpret_cast<const uint8_t *>(salida), k);
}

}  // namespace

bool detallado() { return detalle; }
void detallado(bool activo) { detalle = activo; }

void linea(const char *area, const char *formato, ...) {
  char cuerpo[384];
  va_list args;
  va_start(args, formato);
  vsnprintf(cuerpo, sizeof(cuerpo), formato, args);
  va_end(args);
  escribir(area, cuerpo, nullptr);
}

void veredicto(const char *area, Resultado resultado, const Pista &pista, const char *formato, ...) {
  char cuerpo[384];
  const int n = snprintf(cuerpo, sizeof(cuerpo), "%-9s", etiqueta(resultado));
  va_list args;
  va_start(args, formato);
  if (n > 0 && size_t(n) < sizeof(cuerpo)) vsnprintf(cuerpo + n, sizeof(cuerpo) - n, formato, args);
  va_end(args);
  escribir(area, cuerpo, &pista);
}

}  // namespace registro
