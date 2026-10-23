// Pruebas ejecutadas por el evaluador constexpr del compilador; no requieren
// ejecutar binarios nativos de Windows ni conectarse a un ESP32.
#include "../comandos_monitor.h"

constexpr uint8_t linea(EntradaMonitor &entrada, const char *texto) {
  uint8_t ultimo = 0;
  for (size_t i = 0; texto[i]; ++i) {
    const uint8_t resultado = entrada.consumir(texto[i]);
    if (resultado) ultimo = resultado;
  }
  return ultimo;
}

constexpr bool acceso() {
  EntradaMonitor e;
  if (e.abierta() || linea(e, "11\n") != '?') return false;
  if (linea(e, "1\n") != '?' || linea(e, "10\r\n") != '?') return false;
  if (linea(e, "h\n") != '?' || linea(e, "m\n") != '?') return false;
  if (linea(e, "D\r\n") != 'd' || !e.abierta()) return false;
  if (linea(e, "11\r\n") != 11) return false;
  if (linea(e, "1\n") != 1 || linea(e, "10\n") != 10) return false;
  if (linea(e, "Q\r") != 'q' || linea(e, "7\n") != '?') return false;
  if (e.abierta()) return false;
  return linea(e, "d\n") == 'd' && linea(e, "X\n") == 'x';
}

constexpr bool noEjecutarPrefijos() {
  EntradaMonitor e;
  linea(e, "d\n");
  if (e.consumir('1') != 0 || e.consumir('0') != 0) return false;
  if (e.consumir('\r') != 10 || e.consumir('\n') != 0) return false;
  if (e.consumir('1') != 0 || e.consumir('1') != 0 || e.consumir('\n') != 11) return false;
  if (linea(e, "12\n") != '!' || linea(e, "1x\n") != '!') return false;
  if (linea(e, "d1\n") != '!' || linea(e, "1 0\n") != '!') return false;
  if (linea(e, "01\n") != '!' || linea(e, "0\n") != '!') return false;
  return linea(e, " \t10 \t\r\n") == 10;
}

constexpr bool opcionesYLegado() {
  EntradaMonitor e;
  linea(e, "d\n");
  for (char c = '1'; c <= '9'; ++c) {
    if (e.consumir(c) || e.consumir('\n') != uint8_t(c - '0')) return false;
  }
  for (char c : "hH?bBeEaAtTmMgGrR") {
    if (!c) continue;
    if (e.consumir(c) || e.consumir('\n') != '!') return false;
  }
  return linea(e, "\r\n\t \r\n") == 0;
}

constexpr bool desbordamientoYBinario() {
  EntradaMonitor e;
  linea(e, "d\n");
  for (unsigned i = 0; i < 200; ++i)
    if (e.consumir('1') != 0) return false;
  if (e.consumir('\n') != '!') return false;
  if (linea(e, "7\n") != 7) return false;  // recupera después del descarte
  e.consumir('1'); e.consumir('\0');
  if (e.consumir('\n') != '!') return false;
  return linea(e, "x\n") == 'x';
}

static_assert(acceso(), "Debe exigir d/D, cerrar con q/Q y aceptar CR/LF/CRLF");
static_assert(noEjecutarPrefijos(), "10 no debe ejecutar 1; rechazar líneas ambiguas");
static_assert(opcionesYLegado(), "Sólo 1-11 y d/x/q; todos los atajos antiguos retirados");
static_assert(desbordamientoYBinario(), "Desbordes y NUL no deben ejecutar comandos parciales");
