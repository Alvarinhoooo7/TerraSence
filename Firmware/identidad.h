// identidad.h
//
// El ID de la sonda (15 dígitos) sale de la MAC base del ESP32, grabada de
// fábrica en eFuse y única por chip: los 48 bits leídos como un entero sin
// signo, en decimal y completados con ceros a la izquierda. El máximo,
// FF:FF:FF:FF:FF:FF = 281474976710655, tiene exactamente 15 dígitos.
//
// Nada se guarda ni se borra: el ID es una propiedad del hardware. El único
// reset de un equipo es el del backoffice, que limpia su historial en la nube
// y deja este mismo ID.
//
// Puede empezar con 0 (por ejemplo, las MAC 08:3A:F2:…). Mismo formato que
// isValidDeviceId() de la app: ^\d{15}$.

#pragma once

#include <Arduino.h>

namespace identidad {

void   begin();
String codigo();  // siempre 15 dígitos
bool   formatoValido(const String &valor);

}  // namespace identidad
