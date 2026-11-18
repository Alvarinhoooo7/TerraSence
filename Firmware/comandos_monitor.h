// Comandos completos terminados en CR o LF. Nunca ejecuta el prefijo de una
// línea: «10» es una opción y «13», «1x» o una línea desbordada son inválidas.
#pragma once
#include <stddef.h>
#include <stdint.h>

class EntradaMonitor {
public:
  constexpr bool abierta() const { return abierta_; }
  // true mientras hay caracteres sin fin de línea: el monitor lo usa para
  // avisar que falta configurar «Nueva línea» en vez de quedarse callado.
  constexpr bool pendiente() const { return largo_ > 0 || desbordada_; }
  // Última línea completa recibida, sin espacios en los extremos y con los
  // caracteres no imprimibles como «?», para repetirla en la consola.
  constexpr const char *eco() const { return eco_; }
  // Lo recibido aún sin fin de línea, con el mismo saneamiento que eco().
  constexpr const char *parcial() {
    copiar(linea_, 0, largo_, desbordada_, parcial_);
    return parcial_;
  }
  // 0: nada; 1-12: opción; e: estado; t: autotest; s/n: respuesta del técnico;
  // v: detalle; d/x/q: control; !: inválido; ?: menú cerrado.
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
    if (n || invalida) copiar(linea_, inicio, fin, invalida, eco_);
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
      else if (letra == 'e' || letra == 'E') comando = 'e';
      else if (letra == 't' || letra == 'T') comando = 't';
      else if (letra == 's' || letra == 'S') comando = 's';
      else if (letra == 'n' || letra == 'N') comando = 'n';
      else if (letra == 'v' || letra == 'V') comando = 'v';
    } else if (!invalida && n == 2 && linea_[inicio] == '1' &&
               linea_[inicio + 1] >= '0' && linea_[inicio + 1] <= '2') {
      comando = uint8_t(10 + linea_[inicio + 1] - '0');
    } else if (!invalida && n == 2) {
      // «si» y «no» completos también responden al autotest.
      const char a = minuscula(linea_[inicio]), b = minuscula(linea_[inicio + 1]);
      if (a == 's' && b == 'i') comando = 's';
      else if (a == 'n' && b == 'o') comando = 'n';
    }
    if (comando == 'd') { abierta_ = true; return comando; }
    if (!abierta_) return '?';
    if (comando == 'q') abierta_ = false;
    return comando;
  }

private:
  static constexpr size_t LARGO = 16;
  static constexpr size_t ECO = 20;  // 16 caracteres, «...» y el terminador
  static constexpr bool espacio(char c) { return c == ' ' || c == '\t'; }
  static constexpr char minuscula(char c) { return c >= 'A' && c <= 'Z' ? char(c - 'A' + 'a') : c; }
  static constexpr void copiar(const char *origen, size_t inicio, size_t fin, bool truncada, char *destino) {
    size_t k = 0;
    for (size_t i = inicio; i < fin && k < LARGO; ++i) {
      const char c = origen[i];
      destino[k++] = (c < 0x20 || c == 0x7F) ? '?' : c;
    }
    if (truncada) for (int i = 0; i < 3; ++i) destino[k++] = '.';
    destino[k] = '\0';
  }
  char linea_[LARGO] = {};
  char eco_[ECO] = {};
  char parcial_[ECO] = {};
  size_t largo_ = 0;
  bool desbordada_ = false;
  bool abierta_ = false;
};
