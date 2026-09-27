// identidad.h
//
// Código estable de 15 dígitos que la app provisiona y el ESP32 guarda en NVS.
// Mismo formato que isValidDeviceId() de la app: ^[1-9]\d{14}$.

#pragma once

#include <Arduino.h>

namespace identidad {

void   begin();
bool   provisionada();
String codigo();  // "" si no hay código
bool   formatoValido(const String &valor);
bool   guardar(const String &valor);  // sólo si no hay código previo
void   borrar();

}  // namespace identidad
