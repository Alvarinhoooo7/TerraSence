// identidad.cpp

#include "identidad.h"

#include <esp_mac.h>

namespace {
constexpr size_t LARGO_CODIGO = 15;
String codigoActual;
}  // namespace

namespace identidad {

void begin() {
  // MAC base de eFuse, en el orden canónico (mac[0] es el byte más alto).
  uint8_t mac[6] = {0};
  esp_efuse_mac_get_default(mac);
  uint64_t valor = 0;
  for (uint8_t byte : mac) valor = (valor << 8) | byte;

  char texto[LARGO_CODIGO + 1];
  snprintf(texto, sizeof(texto), "%015llu", static_cast<unsigned long long>(valor));
  codigoActual = texto;
}

String codigo() { return codigoActual; }

bool formatoValido(const String &valor) {
  if (valor.length() != LARGO_CODIGO) return false;
  for (size_t i = 0; i < LARGO_CODIGO; i++) {
    if (valor[i] < '0' || valor[i] > '9') return false;
  }
  return true;
}

}  // namespace identidad
