// Diagnóstico serial local; no conserva ni publica mediciones anteriores.
//
// Cada informe termina en un veredicto (OK, AVISO, FALLA, N/D o CONFIRMA)
// con la causa probable y el siguiente paso, en el formato de registro.h.
#pragma once
#include <Arduino.h>
#include "bateria.h"
#include "trama.h"
#include "ble_terrasense.h"
#include "comandos_monitor.h"
#include "registro.h"
#include "causas_diagnostico.h"
#include "autotest.h"
#include "sonda.h"

// Lo que muestra la opción «e»: una foto del equipo y lo acumulado desde el arranque.
struct EstadoEquipo {
  const char *id = "";
  const char *reinicio = "";       // motivo del último reinicio, en palabras
  registro::Resultado reinicioResultado = registro::Resultado::Ok;
  registro::Pista reinicioPista{};
  uint32_t cpuMhz = 0, heapLibre = 0, heapMinimo = 0;
  EstadoBateria bateria{};
  bool bmePresente = false, bmeHumedad = false;
  uint8_t bmeDireccion = 0;
  DiagnosticoBle ble{};
  uint32_t pairRestanteMs = 0;
  uint16_t conexionesBle = 0;
  uint16_t lecturasApp = 0, lecturasAppConSuelo = 0;
  const char *ultimaLecturaApp = nullptr;  // nullptr: ninguna desde el arranque
  uint32_t ultimaLecturaAppMs = 0;
  const Sonda *sonda = nullptr;
};

// Veredicto de cada subsistema y su frase de resumen; los comparten la prueba
// individual y el autotest, para que ambos juzguen igual.
causas::Veredicto juzgarBateria(const EstadoBateria &b, char *texto, size_t largo);
causas::Veredicto juzgarAmbiente(const LecturaAmbiente &aire, bool presente, bool humedad, uint8_t direccion,
                                 char *texto, size_t largo);
causas::Veredicto juzgarSonda(const LecturaSuelo &suelo, const Sonda &sonda, char *texto, size_t largo);
causas::Veredicto juzgarBle(const DiagnosticoBle &d, char *texto, size_t largo);

class MonitorSerie {
public:
  // Lee la consola y repite cada línea recibida («> 7»). Si llegan caracteres
  // sin fin de línea, avisa una vez cómo configurar el monitor serie.
  uint8_t tomarComando(uint32_t ahora);
  const char *eco() const { return entrada_.eco(); }
  bool activo() const { return entrada_.abierta(); }
  // true cuando no queda informe por enviar: antes de escribir directo sin mezclarse.
  bool vacio() const { return enviado_ == largo_; }
  void actualizar(bool capturaEnCurso);
  void menu(const char *id);
  // Opción v: enciende o apaga el detalle (HEX, muestras de la ráfaga) y lo informa.
  void alternarDetalle();
  void salir();
  // Informe nuevo: sustituye el pendiente de impresión; nunca se acumulan tareas.
  void mensaje(const char *area, const char *formato, ...) __attribute__((format(printf, 3, 4)));
  // Agrega una línea al informe en curso sin borrarlo.
  void evento(const char *area, const char *formato, ...) __attribute__((format(printf, 3, 4)));
  // Aviso de inicio de una prueba con resultado diferido (sonda, I2C): sale de
  // inmediato, antes de los mensajes de esa prueba, y nunca se borra ni se retiene.
  void aviso(const char *area, const char *formato, ...) __attribute__((format(printf, 3, 4)));
  void mostrarAdc(const EstadoBateria &bateria, uint16_t adc, uint16_t milivoltios);
  void mostrarAmbienteNuevo(const LecturaAmbiente &aire, bool presente, bool humedad, uint8_t direccion);
  void mostrarSonda(const LecturaSuelo &suelo, const Sonda &sonda);
  void mostrarBle(const DiagnosticoBle &estado, const char *id);
  void mostrarEstado(const EstadoEquipo &estado);
  // Salida física ordenada (LED, buzzer): sólo el técnico confirma que se vio u oyó.
  void mostrarSalida(const char *area, const char *descripcion, bool iniciada);
  // Resumen final del autotest, pensado para copiarlo al registro del equipo.
  void mostrarResumenAutotest(const Autotest &autotest, const char (*detalles)[AUTOTEST_DETALLE], const char *id,
                              const char *reinicio, uint32_t ahora);

private:
  void texto(const char *formato, ...) __attribute__((format(printf, 2, 3)));
  void encabezar(const char *area);
  // Línea de datos sangrada bajo el encabezado.
  void dato(const char *formato, ...) __attribute__((format(printf, 2, 3)));
  // Texto fijo de cualquier largo (el menú), sangrado igual que dato().
  void bloque(const char *literal);
  void veredicto(const char *area, registro::Resultado r, const registro::Pista &pista, const char *formato, ...)
      __attribute__((format(printf, 5, 6)));
  // Sólo en modo detallado (v), salvo `siempre`: el HEX de una falla es evidencia.
  void hexadecimal(const char *nombre, const uint8_t *bytes, size_t largo, bool siempre = false);
  void agregarSangrado(const char *cuerpo);
  EntradaMonitor entrada_;
  // Salida acotada: sin String dinámico, sin flush ni esperas por el monitor.
  char salida_[2048] = {};
  size_t largo_ = 0, enviado_ = 0;
  uint32_t ultimoByte_ = 0;
  bool avisoFinLinea_ = false;
};
