// Pruebas de autotest.h que evalúa el compilador (static_assert).
#include "../autotest.h"

using R = registro::Resultado;
using P = PasoAutotest;

constexpr bool recorridoCompleto() {
  Autotest a;
  if (a.activo()) return false;
  a.iniciar(1000);
  if (!a.activo() || a.paso() != P::Bateria || a.numero() != 1) return false;
  a.registrar(R::Ok);                      // batería
  a.marcarEnCurso();
  if (!a.enCurso()) return false;
  a.registrar(R::Ok);                      // bus I2C
  if (a.enCurso() || a.paso() != P::Ambiente) return false;
  a.registrar(R::Aviso);                   // BMP280
  a.registrar(R::Falla);                   // sonda
  a.registrar(R::Ok);                      // Bluetooth
  if (a.responder(true)) return false;     // sin pregunta, s no cuenta
  a.preguntar(5000);
  if (!a.esperandoRespuesta() || a.vencida(34999) || !a.vencida(35000)) return false;
  if (!a.responder(true) || a.paso() != P::Buzzer) return false;  // LEDs confirmados
  a.preguntar(36000);
  if (!a.responder(false)) return false;   // buzzer no se oyó
  if (a.paso() != P::Fin || a.esperandoRespuesta()) return false;
  a.registrar(R::Ok);                      // ya terminado: se ignora
  return a.resultado(P::Ambiente) == R::Aviso && a.resultado(P::Buzzer) == R::Falla &&
         a.resultado(P::Luces) == R::Ok && a.cuenta(R::Ok) == 4 && a.cuenta(R::Falla) == 2 &&
         a.global() == R::Falla && a.duracionMs(15200) == 14200;
}

constexpr bool globalSinFallas() {
  Autotest a;
  a.iniciar(0);
  for (uint8_t i = 0; i < PASOS_AUTOTEST; ++i) a.registrar(R::Ok);
  if (a.global() != R::Ok) return false;
  a.iniciar(0);  // reiniciar borra los resultados anteriores
  if (a.cuenta(R::Ok) || a.cuenta(R::NoDisponible) != PASOS_AUTOTEST) return false;
  for (uint8_t i = 0; i < PASOS_AUTOTEST - 1; ++i) a.registrar(R::Ok);
  a.registrar(R::Confirmar);  // buzzer sin respuesta: no es falla, pero tampoco OK
  return a.global() == R::Aviso;
}

constexpr bool cancelarCorta() {
  Autotest a;
  a.iniciar(0);
  a.preguntar(0);
  a.cancelar();
  return !a.activo() && !a.esperandoRespuesta() && !a.responder(true) && !a.vencida(UINT32_MAX);
}

constexpr bool plazoConDesborde() {
  Autotest a;
  a.iniciar(0);
  a.preguntar(UINT32_MAX - 1000);
  return !a.vencida(UINT32_MAX) && a.vencida(AUTOTEST_RESPUESTA_MS - 1001);
}

static_assert(recorridoCompleto(), "Siete pasos en orden, s/n sólo con pregunta pendiente y conteo final");
static_assert(globalSinFallas(), "OK sólo si los siete pasos son OK; sin confirmar es AVISO");
static_assert(cancelarCorta(), "Cancelar descarta la pregunta pendiente");
static_assert(plazoConDesborde(), "El plazo de respuesta resiste el desborde de millis");
static_assert(PASOS_AUTOTEST == 7, "El resumen y el menú anuncian siete pasos");
