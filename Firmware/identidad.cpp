// identidad.cpp

#include "identidad.h"

#include <Preferences.h>

namespace {
constexpr const char *NVS_ESPACIO = "terrasense";
constexpr const char *NVS_CLAVE = "codigo";
constexpr size_t LARGO_CODIGO = 15;

Preferences nvs;
String codigoActual;
}  // namespace

namespace identidad {

void begin() {
  nvs.begin(NVS_ESPACIO, false);
  const String guardado = nvs.getString(NVS_CLAVE, "");
  // Un valor corrupto en NVS se trata como ausente: mejor pedir una nueva
  // vinculación que anunciar un código que la app rechazará.
  codigoActual = formatoValido(guardado) ? guardado : "";
}

bool provisionada() { return codigoActual.length() == LARGO_CODIGO; }

String codigo() { return codigoActual; }

bool formatoValido(const String &valor) {
  if (valor.length() != LARGO_CODIGO) return false;
  if (valor[0] < '1' || valor[0] > '9') return false;
  for (size_t i = 1; i < LARGO_CODIGO; i++) {
    if (valor[i] < '0' || valor[i] > '9') return false;
  }
  return true;
}

bool guardar(const String &valor) {
  if (provisionada() || !formatoValido(valor)) return false;
  if (nvs.putString(NVS_CLAVE, valor) != valor.length()) return false;
  codigoActual = valor;
  return true;
}

void borrar() {
  nvs.remove(NVS_CLAVE);
  codigoActual = "";
}

}  // namespace identidad
