// Comandos completos terminados en CR o LF. Nunca ejecuta el prefijo de una
// línea: «10» es una opción y «12», «1x» o una línea desbordada son inválidas.
#pragma once
#include <stddef.h>
#include <stdint.h>

class EntradaMonitor {
public:
  constexpr bool abierta() const { return abierta_; }
  // 0: nada; 1-11: opción; d/x/q: control; !: inválido; ?: menú cerrado.
  constexpr uint8_t consumir(char c) {
    if (c != '\r' && c != '\n') {
      if (largo_ < sizeof(linea_)) linea_[largo_++] = c;
      else desbordada_ = true;
      return 0;
    }
    size_t inicio = 0, fin = largo_;
    while (inicio < fin && espacio(linea_[inicio])) ++inicio;
    while (fin > inicio && espacio(linea_[fin - 1])) --fin;
    const size_t n = fin - inicio;
    const bool invalida = desbordada_;
    largo_ = 0;
    desbordada_ = false;
    if (!n && !invalida) return 0;  // también absorbe el LF de un CRLF
    uint8_t comando = '!';
    if (!invalida && n == 1) {
      const char letra = linea_[inicio];
      if (letra >= '1' && letra <= '9') comando = uint8_t(letra - '0');
      else if (letra == 'd' || letra == 'D') comando = 'd';
      else if (letra == 'x' || letra == 'X') comando = 'x';
      else if (letra == 'q' || letra == 'Q') comando = 'q';
    } else if (!invalida && n == 2 && linea_[inicio] == '1' &&
               (linea_[inicio + 1] == '0' || linea_[inicio + 1] == '1')) {
      comando = uint8_t(10 + linea_[inicio + 1] - '0');
    }
    if (comando == 'd') { abierta_ = true; return comando; }
    if (!abierta_) return '?';
    if (comando == 'q') abierta_ = false;
    return comando;
  }

private:
  static constexpr bool espacio(char c) { return c == ' ' || c == '\t'; }
  char linea_[16] = {};
  size_t largo_ = 0;
  bool desbordada_ = false;
  bool abierta_ = false;
};
