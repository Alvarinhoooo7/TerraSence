/*
 * Firmware TerraSense - ESP32 (Arduino IDE, núcleo esp32 3.x)
 *
 * Alcance actual: vinculación BLE con la app (pulsador PAIR y confirmación del
 * ID, que sale de la MAC), indicadores LED y sonoros, lectura Modbus de la
 * sonda de suelo y trama de telemetría de 20 bytes. No hay reset desde la
 * sonda: el único reset es el del backoffice. Un campo sin lectura viaja en
 * 0xFF y nunca se simula. Estado y pendientes en TASK.md.
 */

#include <Wire.h>
#include <esp_log.h>
#include <esp_system.h>

#include "pines.h"
#include "config.h"
#include "trama.h"
#include "bateria.h"
#include "sonda.h"
#include "pulsador.h"
#include "leds.h"
#include "zumbador.h"
#include "identidad.h"
#include "bme280.h"
#include "ble_terrasense.h"
#include "monitor_serie.h"
#include "secuencia_leds.h"
#include "registro.h"
#include "causas_diagnostico.h"
#include "autotest.h"

// Número de pin de pines.h dentro de un literal: el texto no se desfasa del esquemático.
#define PIN_TEXTO_(n) #n
#define PIN_TEXTO(n) PIN_TEXTO_(n)

using registro::Pista;
using registro::Resultado;

Pulsador pulsadorPair(PIN_PARING);
Led ledAzul(PIN_LED_BLUE);
Led ledVerde(PIN_LED_GREEN);
Led ledRojo(PIN_LED_RED);
Zumbador zumbador(PIN_BUZZER);
Bme280 bme;
Sonda sonda;
MonitorSerie monitor;
SecuenciaLeds secuenciaLeds;
uint8_t faseLeds = 4;

// Las opciones locales nunca publican una medición por BLE.
enum class OrigenCaptura : uint8_t { Ninguna, App, DiagnosticoSonda, BarridoSonda, EnsayoSonda, Autotest };
OrigenCaptura captura = OrigenCaptura::Ninguna;
uint32_t sesionCaptura = 0;
uint8_t direccionI2C = 0;  // 0: diagnóstico inactivo
uint8_t encontradosI2C = 0, erroresI2C = 0;
uint8_t idBmeI2C = 0;  // registro 0xD0 en 0x76/0x77; 0 sin respuesta, 0xFF ilegible

EstadoBateria bateriaActual;
uint32_t ultimaBateria = 0;
uint16_t ultimoAdc = 0;
uint16_t ultimosMilivoltios = 0;

// Lo acumulado desde el arranque, para la opción «e».
struct Reinicio {
  const char *texto;
  Resultado resultado;
  Pista pista;
};
Reinicio reinicio{"desconocido", Resultado::Ok, {}};
uint16_t conexionesBle = 0;
bool estabaConectado = false;
uint16_t lecturasApp = 0, lecturasAppConSuelo = 0;
char ultimaLecturaApp[64] = "";
uint32_t ultimaLecturaAppMs = 0;

Autotest autotest;
char detallesAutotest[PASOS_AUTOTEST][AUTOTEST_DETALLE] = {};

// El motivo del reinicio delata fallas que el técnico no vio: un brownout al
// energizar la sonda o un cuelgue que reinició el equipo en terreno.
Reinicio motivoReinicio() {
  static char otro[40];
  const esp_reset_reason_t motivo = esp_reset_reason();
  switch (motivo) {
    case ESP_RST_POWERON: return {"encendido normal", Resultado::Ok, {}};
    case ESP_RST_EXT: return {"pin EN (botón de reset)", Resultado::Ok, {}};
    case ESP_RST_SW: return {"por software (carga de firmware o reinicio pedido)", Resultado::Ok, {}};
    case ESP_RST_DEEPSLEEP: return {"despertar del reposo profundo", Resultado::Ok, {}};
    case ESP_RST_PANIC:
      return {"PÁNICO: el firmware se cayó por una excepción", Resultado::Falla,
              {"error de programa: antes del reinicio el monitor mostró «Guru Meditation» y un backtrace",
               "copiar esa salida completa y reportarla junto con lo que se estaba haciendo"}};
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT:
      return {"WATCHDOG: el programa se quedó colgado", Resultado::Falla,
              {"un bloqueo largo en el bucle principal o en Bluetooth",
               "anotar qué se estaba haciendo y reportarlo con la salida del monitor"}};
    case ESP_RST_BROWNOUT:
      return {"BROWNOUT: la tensión cayó bajo el mínimo del ESP32", Resultado::Falla,
              {"batería baja o pico de consumo al energizar la sonda o la radio",
               "cargar la batería, medir 3,3 V mientras se envía 7 y revisar el regulador"}};
    default:
      snprintf(otro, sizeof(otro), "poco habitual (código %d)", int(motivo));
      return {otro, Resultado::Aviso, {nullptr, "reportar el código junto con la salida del monitor"}};
  }
}

// Tensión de la celda en voltios, con media recortada sobre 10 lecturas del ADC
// (descarta el mínimo y el máximo para filtrar picos de radio y promedia las 8 centrales).
float leerBateriaV() {
  uint32_t suma = 0, minMv = UINT32_MAX, maxMv = 0;
  uint32_t sumaCruda = 0, minCrudo = UINT32_MAX, maxCrudo = 0;
  for (int i = 0; i < 10; i++) {
    const uint32_t crudo = analogRead(PIN_VBAT_SENSE);
    const uint32_t mv = analogReadMilliVolts(PIN_VBAT_SENSE);
    sumaCruda += crudo;
    if (crudo < minCrudo) minCrudo = crudo;
    if (crudo > maxCrudo) maxCrudo = crudo;
    suma += mv;
    if (mv < minMv) minMv = mv;
    if (mv > maxMv) maxMv = mv;
  }
  const uint32_t sumaCentralCruda = sumaCruda - minCrudo - maxCrudo;
  const uint32_t sumaCentralMv = suma - minMv - maxMv;
  ultimoAdc = (sumaCentralCruda + 4) / 8;
  ultimosMilivoltios = (sumaCentralMv + 4) / 8;
  return (sumaCentralMv / 8.0f) / 1000.0f * BATERIA_FACTOR_DIVISOR;
}

void revisarBateria(uint32_t ahora, bool forzar = false) {
  if (!forzar && ultimaBateria != 0 && ahora - ultimaBateria < BATERIA_PERIODO_MS) return;
  ultimaBateria = ahora ? ahora : 1;
  const bool antes = bateriaActual.baja;
  bateriaActual = evaluarBateria(leerBateriaV(), antes);
  bleActualizarEstado(bateriaActual.porcentaje);
  if (bateriaActual.baja != antes) {
    if (bateriaActual.baja) zumbador.reproducir(Sonido::BateriaBaja, ahora);
    registro::linea("BAT", "%.2f V: %s", bateriaActual.voltios,
                    !bateriaActual.valida ? "batería sin dato" : bateriaActual.baja ? "batería baja" : "batería normal");
  }
}

// Arma la trama con la lectura de suelo de esta captura (inválida si la sonda
// no respondió), el ambiente y la batería medidos ahora mismo, y la notifica
// si la pidió la app.
void medirYNotificar(uint32_t ahora, LecturaSuelo suelo) {
  revisarBateria(ahora, true);  // la batería de esta captura, sin reutilizar la anterior
  ++lecturasApp;
  ultimaLecturaAppMs = ahora;
  if (suelo.valida)
    registro::linea("SONDA", "Valores: humedad %.1f %%, temperatura %.1f °C, CE %u µS/cm, pH %.1f, "
                    "N %u, P %u, K %u mg/kg",
                    suelo.humedadX10 / 10.0f, suelo.temperaturaX10 / 10.0f, suelo.conductividad,
                    suelo.phX10 / 10.0f, suelo.nitrogeno, suelo.fosforo, suelo.potasio);
  else snprintf(ultimaLecturaApp, sizeof(ultimaLecturaApp), "sin suelo (sonda: %s)",
                modbus::nombreFallo(sonda.ultimoFallo()));
  // Los rangos se revisan antes que la batería para que la prueba en banco, sin
  // celda, igual diga si la lectura de la sonda habría sido publicable.
  if (suelo.valida && !sueloPublicable(suelo)) {
    const char *campo = causas::campoFueraDeRango(suelo);
    registro::veredicto("TRAMA", Resultado::Falla, causas::FUERA_DE_RANGO,
                        "%s fuera de los rangos del manual: se descarta la medición", campo ? campo : "dato");
    snprintf(ultimaLecturaApp, sizeof(ultimaLecturaApp), "suelo descartado (%s fuera de rango)",
             campo ? campo : "dato");
    suelo.valida = false;
  }
  if (suelo.valida && !bateriaActual.valida) {
    registro::veredicto("TRAMA", Resultado::Aviso, causas::bateria(bateriaActual).pista,
                        "suelo dentro de rango, pero batería inválida (%.2f V): se descarta la medición de suelo",
                        bateriaActual.voltios);
    snprintf(ultimaLecturaApp, sizeof(ultimaLecturaApp), "suelo descartado (batería inválida)");
    suelo.valida = false;
  }
  if (suelo.valida) {
    suelo.bateriaPct = bateriaActual.porcentaje;
    ++lecturasAppConSuelo;
    snprintf(ultimaLecturaApp, sizeof(ultimaLecturaApp), "suelo válido");
  }
  const LecturaAmbiente aire = bme.leer();

  uint8_t trama[TRAMA_BYTES];
  armarTrama(suelo, aire, trama);
  const bool enviada = bleNotificar(trama, sizeof(trama), sesionCaptura);
  if (!enviada) strncat(ultimaLecturaApp, ", no notificada", sizeof(ultimaLecturaApp) - strlen(ultimaLecturaApp) - 1);

  char hex[3 * TRAMA_BYTES + 1] = "";
  for (size_t i = 0; i < sizeof(trama); i++) snprintf(hex + 3 * i, 4, "%02X ", trama[i]);
  registro::linea("TRAMA", "%s%s", hex, enviada ? "(notificada)" : "(sesión BLE terminada o suscripción cancelada)");
  registro::linea("TRAMA", "suelo: %s | BME280: %s | batería ADC: %.2f V (%s)",
                  suelo.valida ? "ok" : "sin lectura (FF)", bme.presente() ? "ok" : "ausente (centinela)",
                  bateriaActual.voltios, bateriaActual.valida ? "aproximada" : "sin dato");

  if (!enviada) return;
  ahora = millis();  // los avisos comienzan después de terminar la adquisición I2C
  // notify() sólo encola la notificación; no acredita recepción en la app.
  if (suelo.valida) {
    ledVerde.aviso(PatronLed::TresDestellos, ahora);
    zumbador.reproducir(Sonido::Exito, ahora);
  } else {
    ledRojo.aviso(PatronLed::TresDestellos, ahora);
    zumbador.reproducir(Sonido::Fallo, ahora);
  }
}

void cancelarPruebas() {
  if (!secuenciaLeds.activa() && !ledAzul.enPrueba() && !ledVerde.enPrueba() && !ledRojo.enPrueba() && !zumbador.enPrueba()) return;
  if (secuenciaLeds.activa()) monitor.evento("LUCES", "Secuencia interrumpida; se conservan los avisos del equipo.");
  secuenciaLeds.cancelar();
  ledAzul.cancelarPrueba();
  ledVerde.cancelarPrueba();
  ledRojo.cancelarPrueba();
  zumbador.cancelarPrueba();
  // Aplicar el fondo/aviso vigente de inmediato, también antes del barrido 10.
  const uint32_t ahora = millis();
  ledAzul.actualizar(ahora);
  ledVerde.actualizar(ahora);
  ledRojo.actualizar(ahora);
}

bool ledsDisponibles(uint32_t ahora) {
  return ledRojo.disponibleParaPrueba(ahora) && ledVerde.disponibleParaPrueba(ahora) &&
         ledAzul.disponibleParaPrueba(ahora) && !bateriaActual.baja;
}

bool iniciarSecuenciaLeds(uint32_t ahora) {
  if (captura != OrigenCaptura::Ninguna || direccionI2C || bleConectado() ||
      bleVentanaAbierta(ahora) || pulsadorPair.presionado() || !ledsDisponibles(ahora)) {
    monitor.evento("LUCES", "N/D      secuencia no iniciada: equipo ocupado, batería baja o aviso de LED en curso.\n"
                   "sigue: enviar 11 cuando el equipo esté en reposo");
    return false;
  }
  cancelarPruebas();
  secuenciaLeds.iniciar(ahora);
  faseLeds = 4;
  return true;
}

void actualizarSecuenciaLeds(uint32_t ahora) {
  if (!secuenciaLeds.activa()) return;
  if (!ledsDisponibles(ahora)) {
    cancelarPruebas();
    return;
  }
  const uint8_t fase = secuenciaLeds.fase(ahora);
  if (fase == faseLeds) return;
  faseLeds = fase;
  ledRojo.cancelarPrueba();
  ledVerde.cancelarPrueba();
  ledAzul.cancelarPrueba();
  const uint32_t restante = secuenciaLeds.restante(ahora);
  if (fase == 0 || fase == 1) ledRojo.probar(ahora, restante);
  if (fase == 0 || fase == 2) ledVerde.probar(ahora, restante);
  if (fase == 0 || fase == 3) ledAzul.probar(ahora, restante);
  switch (fase) {
    case 0: monitor.evento("LUCES", "1/4: rojo + verde + azul (2 s). x cancela."); break;
    case 1: monitor.evento("LUCES", "2/4: sólo rojo (1 s, IO%d).", PIN_LED_RED); break;
    case 2: monitor.evento("LUCES", "3/4: sólo verde (1 s, IO%d).", PIN_LED_GREEN); break;
    case 3: monitor.evento("LUCES", "4/4: sólo azul (1 s, IO%d).", PIN_LED_BLUE); break;
    default:
      secuenciaLeds.cancelar();
      if (autotest.activo()) {
        monitor.evento("LUCES", "Secuencia terminada: luces apagadas.");
        break;
      }
      monitor.evento("LUCES", "CONFIRMA secuencia terminada: ¿se vieron las tres juntas y luego rojo, verde y azul?\n"
                     "causa si falta un color: LED invertido, resistencia abierta o pista cortada en ese pin\n"
                     "sigue: 11 repite; 3, 4 y 5 prueban cada color por separado");
      break;
  }
}

bool capturaLocal() {
  return captura == OrigenCaptura::BarridoSonda || captura == OrigenCaptura::DiagnosticoSonda ||
         captura == OrigenCaptura::EnsayoSonda || captura == OrigenCaptura::Autotest;
}

void cancelarCapturaLocal() {
  direccionI2C = 0;
  if (autotest.activo()) {
    autotest.cancelar();
    registro::linea("AUTOTEST", "Cancelado en el paso %u/%u (%s); no se emite resumen.", autotest.numero(),
                    PASOS_AUTOTEST, nombrePaso(autotest.paso()));
  }
  if (!capturaLocal()) return;
  sonda.cancelar();
  captura = OrigenCaptura::Ninguna;
}

// --- Autotest (opción t) ---

// Cierra el paso en curso: imprime su veredicto, guarda la frase para el
// resumen y avanza.
void cerrarPaso(Resultado r, const Pista &pista, const char *detalle) {
  const PasoAutotest paso = autotest.paso();
  snprintf(detallesAutotest[uint8_t(paso)], AUTOTEST_DETALLE, "%s", detalle);
  registro::veredicto("AUTOTEST", r, pista, "%u/%u %s: %s", autotest.numero(), PASOS_AUTOTEST, nombrePaso(paso),
                      detalle);
  autotest.registrar(r);
}

void preguntarAlTecnico(uint32_t ahora, const char *pregunta) {
  autotest.preguntar(ahora);
  registro::linea("AUTOTEST", "%u/%u %s: %s\nResponde s o n + Enter (%lu s).", autotest.numero(), PASOS_AUTOTEST,
                  nombrePaso(autotest.paso()), pregunta, static_cast<unsigned long>(AUTOTEST_RESPUESTA_MS / 1000));
}

void responderAutotest(bool si) {
  const PasoAutotest paso = autotest.paso();
  const bool luces = paso == PasoAutotest::Luces;
  cerrarPaso(si ? Resultado::Ok : Resultado::Falla,
             si ? Pista{} :
             luces ? Pista{"LED invertido, resistencia abierta o pista cortada en el color que faltó",
                           "enviar 3, 4 y 5 para probar cada color por separado"} :
                     Pista{"buzzer desconectado o invertido, o frecuencia lejos de su resonancia",
                           "enviar 2; revisar BZ1 en IO19 y BUZZER_FRECUENCIA_HZ"},
             si ? "confirmado por el técnico" : "el técnico no lo vio u oyó");
}

void actualizarAutotest(uint32_t ahora) {
  if (!autotest.activo()) return;
  if (autotest.esperandoRespuesta()) {
    if (autotest.vencida(ahora))
      cerrarPaso(Resultado::Confirmar, {nullptr, "repetir la prueba individual y confirmar mirando o escuchando"},
                 "sin respuesta del técnico");
    return;
  }
  char texto[AUTOTEST_DETALLE];
  switch (autotest.paso()) {
    case PasoAutotest::Bateria: {
      revisarBateria(ahora, true);
      const causas::Veredicto v = juzgarBateria(bateriaActual, texto, sizeof(texto));
      cerrarPaso(v.resultado, v.pista, texto);
      return;
    }
    case PasoAutotest::BusI2C:
      if (!autotest.enCurso()) {
        direccionI2C = 0x08;
        encontradosI2C = erroresI2C = idBmeI2C = 0;
        autotest.marcarEnCurso();
        return;
      }
      if (direccionI2C) return;  // actualizarDiagnosticoI2C sigue recorriendo
      {
        const causas::Veredicto v = causas::busI2C(encontradosI2C, erroresI2C, idBmeI2C);
        snprintf(texto, sizeof(texto), "%u dispositivos, %u errores%s", encontradosI2C, erroresI2C,
                 idBmeI2C == 0x60 ? "; BME280 identificado" : idBmeI2C == 0x58 ? "; BMP280" : "");
        cerrarPaso(v.resultado, v.pista, texto);
      }
      return;
    case PasoAutotest::Ambiente: {
      const LecturaAmbiente aire = bme.leer();
      const causas::Veredicto v =
          juzgarAmbiente(aire, bme.presente(), bme.tieneHumedad(), bme.direccion(), texto, sizeof(texto));
      cerrarPaso(v.resultado, v.pista, texto);
      return;
    }
    case PasoAutotest::Sonda:
      // Se cierra cuando la sonda termina (ver loop); aquí sólo se inicia.
      if (autotest.enCurso()) return;
      if (sonda.iniciar(ahora)) {
        captura = OrigenCaptura::Autotest;
        autotest.marcarEnCurso();
        registro::linea("AUTOTEST", "%u/%u %s: energizando y leyendo una ráfaga de %u...", autotest.numero(),
                        PASOS_AUTOTEST, nombrePaso(autotest.paso()), SONDA_MUESTRAS_RAFAGA);
      } else {
        cerrarPaso(Resultado::NoDisponible, {nullptr, "repetir con 7"}, "la sonda estaba ocupada");
      }
      return;
    case PasoAutotest::Bluetooth: {
      const causas::Veredicto v = juzgarBle(bleDiagnostico(), texto, sizeof(texto));
      cerrarPaso(v.resultado, v.pista, texto);
      return;
    }
    case PasoAutotest::Luces:
      if (!autotest.enCurso()) {
        if (iniciarSecuenciaLeds(ahora)) autotest.marcarEnCurso();
        else cerrarPaso(Resultado::NoDisponible, {"batería baja o un aviso del equipo ocupa los LED", "repetir con 11"},
                        "secuencia no iniciada");
        return;
      }
      // Se pregunta cuando ya salieron los eventos de la secuencia, para no mezclarlos.
      if (!secuenciaLeds.activa() && monitor.vacio())
        preguntarAlTecnico(ahora, "¿se vieron las tres luces juntas y luego rojo, verde y azul?");
      return;
    case PasoAutotest::Buzzer:
      if (!autotest.enCurso()) {
        if (zumbador.probar(ahora)) {
          autotest.marcarEnCurso();
          registro::linea("AUTOTEST", "%u/%u %s: tono de 2 s...", autotest.numero(), PASOS_AUTOTEST,
                          nombrePaso(autotest.paso()));
        } else {
          cerrarPaso(Resultado::NoDisponible,
                     {"un aviso sonoro está en curso o BUZZER_HABILITADO es false", "repetir con 2"},
                     "tono no iniciado");
        }
        return;
      }
      if (!zumbador.enPrueba()) preguntarAlTecnico(ahora, "¿sonó el buzzer durante unos 2 s?");
      return;
    case PasoAutotest::Fin: {
      const String id = identidad::codigo();
      monitor.mostrarResumenAutotest(autotest, detallesAutotest, id.c_str(), reinicio.texto, ahora);
      autotest.cancelar();
      return;
    }
  }
}

// Por qué una prueba manual no puede empezar ahora, con lo que el técnico
// debe hacer; nullptr si el equipo está en reposo.
const char *motivoBloqueo(uint32_t ahora, char *texto, size_t largo) {
  if (captura == OrigenCaptura::App) return "la app está midiendo: espera a que termine la lectura";
  if (captura != OrigenCaptura::Ninguna || direccionI2C)
    return "otra prueba del monitor sigue en curso: espera su resultado o envía x";
  if (bleConectado()) return "hay un teléfono conectado por Bluetooth: cierra la app o desconéctala";
  if (bleVentanaAbierta(ahora)) {
    snprintf(texto, largo, "la ventana PAIR está abierta: se cierra sola en %lu s",
             static_cast<unsigned long>((bleVentanaRestanteMs(ahora) + 999) / 1000));
    return texto;
  }
  if (pulsadorPair.presionado()) return "el botón PAIR está presionado: suéltalo";
  return nullptr;
}

void mostrarEstado(uint32_t ahora) {
  const String id = identidad::codigo();  // vive hasta que el informe quede en el buffer
  EstadoEquipo e;
  e.id = id.c_str();
  e.reinicio = reinicio.texto;
  e.reinicioResultado = reinicio.resultado;
  e.reinicioPista = reinicio.pista;
  e.cpuMhz = getCpuFrequencyMhz();
  e.heapLibre = ESP.getFreeHeap();
  e.heapMinimo = ESP.getMinFreeHeap();
  e.bateria = bateriaActual;
  e.bmePresente = bme.presente();
  e.bmeHumedad = bme.tieneHumedad();
  e.bmeDireccion = bme.direccion();
  e.ble = bleDiagnostico();
  e.pairRestanteMs = bleVentanaRestanteMs(ahora);
  e.conexionesBle = conexionesBle;
  e.lecturasApp = lecturasApp;
  e.lecturasAppConSuelo = lecturasAppConSuelo;
  e.ultimaLecturaApp = lecturasApp ? ultimaLecturaApp : nullptr;
  e.ultimaLecturaAppMs = ultimaLecturaAppMs;
  e.sonda = &sonda;
  monitor.mostrarEstado(e);
}

void atenderMonitor(uint32_t ahora) {
  const bool estabaAbierto = monitor.activo();
  const uint8_t comando = monitor.tomarComando(ahora);
  if (!comando) return;
  char textoBloqueo[72];
  const char *bloqueo = motivoBloqueo(ahora, textoBloqueo, sizeof(textoBloqueo));
  if (comando == 'v') {  // sólo cambia cuánto se imprime: vale siempre, también en el autotest
    monitor.alternarDetalle();
    return;
  }
  // Durante el autotest sólo valen sus respuestas, e, x y q: otro informe se
  // mezclaría con sus pasos.
  if (autotest.activo() && comando != 's' && comando != 'n' && comando != 'x' && comando != 'q' && comando != 'e') {
    monitor.mensaje("AUTOTEST", "Autotest en curso (paso %u/%u, %s): responde s o n cuando se pida; x lo cancela.",
                    autotest.numero(), PASOS_AUTOTEST, nombrePaso(autotest.paso()));
    return;
  }
  switch (comando) {
    case 's':
    case 'n':
      if (autotest.esperandoRespuesta()) responderAutotest(comando == 's');
      else monitor.mensaje("MONITOR", "No hay ninguna pregunta pendiente: s y n responden al autotest (t).");
      return;
    case 'd':
      monitor.menu(identidad::codigo().c_str());
      if (!estabaAbierto) iniciarSecuenciaLeds(ahora);
      return;
    case 'q':
      cancelarPruebas();
      cancelarCapturaLocal();
      monitor.salir();
      return;
    case 'x': {
      const bool habia = direccionI2C || secuenciaLeds.activa() || ledAzul.enPrueba() || ledVerde.enPrueba() ||
                         ledRojo.enPrueba() || zumbador.enPrueba() || capturaLocal() || autotest.activo();
      cancelarPruebas();
      cancelarCapturaLocal();
      monitor.mensaje("MONITOR", "%s", habia ? "Prueba local cancelada; MOSFET apagado y avisos normales conservados." :
                      captura == OrigenCaptura::App ? "Nada que cancelar: la lectura en curso es de la app y sigue." :
                                                      "Nada que cancelar: no había ninguna prueba en curso.");
      return;
    }
    case 'e': mostrarEstado(ahora); return;
    case 8: monitor.mostrarBle(bleDiagnostico(), identidad::codigo().c_str()); return;
    case '?': monitor.mensaje("MONITOR", "El diagnóstico está cerrado: envía d o D + Enter para entrar."); return;
    case '!': monitor.mensaje("MONITOR", "Comando «%s» desconocido. Envía d para ver el menú.", monitor.eco()); return;
  }
  // Las pruebas manuales nunca compiten con una captura o vinculación.
  if (bloqueo) {
    monitor.mensaje("MONITOR", "N/D      prueba no iniciada: %s.", bloqueo);
    return;
  }
  cancelarPruebas();  // una sola salida de mantenimiento a la vez
  switch (comando) {
    case 1:
      revisarBateria(ahora, true);
      monitor.mostrarAdc(bateriaActual, ultimoAdc, ultimosMilivoltios);
      return;
    case 2: monitor.mostrarSalida("BUZZER", "Buzzer: tono de 2 s en IO" PIN_TEXTO(PIN_BUZZER), zumbador.probar(ahora)); return;
    case 3: monitor.mostrarSalida("LUCES", "LED azul: encendido de 1 s en IO" PIN_TEXTO(PIN_LED_BLUE), ledAzul.probar(ahora)); return;
    case 4: monitor.mostrarSalida("LUCES", "LED rojo: encendido de 1 s en IO" PIN_TEXTO(PIN_LED_RED), ledRojo.probar(ahora)); return;
    case 5: monitor.mostrarSalida("LUCES", "LED verde: encendido de 1 s en IO" PIN_TEXTO(PIN_LED_GREEN), ledVerde.probar(ahora)); return;
    case 6: {
      const LecturaAmbiente aire = bme.leer();
      monitor.mostrarAmbienteNuevo(aire, bme.presente(), bme.tieneHumedad(), bme.direccion());
      return;
    }
    case 7:
      if (sonda.iniciar(ahora)) {
        captura = OrigenCaptura::DiagnosticoSonda;
        monitor.aviso("SONDA", "MOSFET IO5 activado: estabilizando %lu ms y leyendo una ráfaga de %u. x cancela y apaga.",
                      static_cast<unsigned long>(SONDA_ESTABILIZACION_MS), SONDA_MUESTRAS_RAFAGA);
      } else monitor.mensaje("SONDA", "N/D      no se pudo iniciar: la sonda ya está ocupada.");
      return;
    case 9:
      direccionI2C = 0x08;
      encontradosI2C = erroresI2C = idBmeI2C = 0;
      monitor.aviso("I2C", "Recorriendo el bus: direcciones 08-77 (SDA IO%d, SCL IO%d); x cancela.", PIN_SDA, PIN_SCL);
      return;
    case 10:
      if (sonda.iniciarBarrido(ahora)) captura = OrigenCaptura::BarridoSonda;
      else monitor.mensaje("BARRIDO", "N/D      no se pudo iniciar: la sonda está ocupada.");
      return;
    case 11:
      if (iniciarSecuenciaLeds(ahora)) monitor.mensaje("LUCES", "Secuencia de luces iniciada; mira el equipo.");
      return;
    case 12:
      if (sonda.iniciarEnsayo(ahora, 1000)) captura = OrigenCaptura::EnsayoSonda;
      else monitor.mensaje("ENSAYO", "N/D      no se pudo iniciar: la sonda está ocupada.");
      return;
    case 't':
      autotest.iniciar(ahora);
      for (auto &d : detallesAutotest) d[0] = '\0';
      monitor.aviso("AUTOTEST", "Autotest de %u pasos: batería, bus I2C, BME280, sonda, Bluetooth, LEDs y buzzer.\n"
                    "Dura unos 15 s más tus respuestas. Mira y escucha el equipo; x cancela.",
                    PASOS_AUTOTEST);
      return;
  }
}

// Una dirección por vuelta; el timeout de Wire limita cada transacción.
void actualizarDiagnosticoI2C() {
  if (!direccionI2C) return;
  const uint8_t dir = direccionI2C++;
  Wire.beginTransmission(dir);
  const uint8_t resultado = Wire.endTransmission();
  if (resultado == 0) {
    ++encontradosI2C;
    registro::linea("I2C", "Responde 0x%02X%s", dir, dir == 0x76 || dir == 0x77 ? " (dirección del BME280)" : "");
    if (dir == 0x76 || dir == 0x77) {
      Wire.beginTransmission(dir);
      Wire.write(uint8_t(0xD0));
      if (Wire.endTransmission(false) == 0 && Wire.requestFrom(dir, uint8_t(1)) == 1) {
        const uint8_t id = uint8_t(Wire.read());
        idBmeI2C = id;
        registro::linea("I2C", "Identidad (registro D0 = %02X): %s", id,
                        id == 0x60 ? "BME280" : id == 0x58 ? "BMP280 (sin humedad)" : "otro modelo");
      } else {
        ++erroresI2C;
        idBmeI2C = 0xFF;
        registro::linea("I2C", "No se pudo leer la identidad del sensor en 0x%02X.", dir);
      }
    }
  } else if (resultado != 2) {  // NACK de dirección es normal cuando no hay dispositivo.
    ++erroresI2C;
    registro::linea("I2C", "Error %u de Wire al consultar 0x%02X (1 dato largo, 3 NACK de dato, 4 otro, 5 tiempo)",
                    resultado, dir);
  }
  if (direccionI2C == 0x78) {
    direccionI2C = 0;
    if (autotest.activo()) return;  // el autotest emite su propio veredicto de este paso
    const causas::Veredicto v = causas::busI2C(encontradosI2C, erroresI2C, idBmeI2C);
    registro::veredicto("I2C", v.resultado, v.pista, "%u dispositivos, %u errores%s", encontradosI2C, erroresI2C,
                        idBmeI2C == 0x60 ? "; BME280 identificado" : "");
  }
}

// Diagnóstico de arranque del bus I2C: lista las direcciones que responden,
// para distinguir un bus mudo (cableado, alimentación, modo SPI) de un sensor
// en otra dirección o de otro modelo. Devuelve cuántas respondieron.
uint8_t escanearI2C() {
  uint8_t encontrados = 0;
  char lista[96] = "";
  size_t k = 0;
  for (uint8_t dir = 0x08; dir < 0x78; dir++) {
    Wire.beginTransmission(dir);
    if (Wire.endTransmission() == 0) {
      if (k + 6 < sizeof(lista)) k += snprintf(lista + k, sizeof(lista) - k, " 0x%02X", dir);
      encontrados++;
    }
  }
  registro::linea("I2C", "Responden:%s", encontrados ? lista : " ninguna dirección");
  return encontrados;
}

void informarBme(uint8_t enBus) {
  if (bme.presente()) {
    if (bme.tieneHumedad()) registro::linea("BME280", "Detectado en 0x%02X", bme.direccion());
    else registro::linea("BME280", "En 0x%02X hay un BMP280: temperatura y presión sí, la humedad viajará como centinela",
                         bme.direccion());
    return;
  }
  if (bme.direccionAjena()) {
    registro::veredicto("BME280", Resultado::Aviso, {nullptr, "confirmar el modelo impreso en el módulo"},
                        "en 0x%02X responde un chip con ID 0x%02X, que no es BME280 (0x60) ni BMP280 (0x58); "
                        "el ambiente viajará como centinela", bme.direccionAjena(), bme.idAjeno());
  } else if (enBus) {
    registro::veredicto("BME280", Resultado::Aviso, causas::busI2C(enBus, 0, 0).pista,
                        "no detectado: hay dispositivos en el bus, pero ninguno en 0x76 ni 0x77");
  } else {
    registro::veredicto("BME280", Resultado::Falla,
                        {"bus mudo: SDA (IO21) y SCL (IO22) invertidos, sin 3,3 V o GND común, sin pull-up de\n"
                         "4,7 kΩ, o en módulos de 6 pines CSB sin VCC (queda en SPI) y SDO al aire",
                         "CSB a VCC, SDO a GND (0x76) o a VCC (0x77); después enviar d y 9"},
                        "no detectado: el ambiente viajará como centinela");
  }
}

// En reposo todo está apagado y en silencio. Tabla completa en Firmware/README.md.
void actualizarAvisos(uint32_t ahora) {
  ledAzul.fondo(bleVentanaAbierta(ahora) ? PatronLed::Parpadeo2Hz : PatronLed::Apagado, ahora);
  ledRojo.fondo(bateriaActual.baja ? PatronLed::Latido10s : PatronLed::Apagado, ahora);

  switch (bleTomarResultadoVinculacion()) {
    case ResultadoVinculacion::Aceptado:
      ledVerde.aviso(PatronLed::TresDestellos, ahora);
      zumbador.reproducir(Sonido::Vinculado, ahora);
      break;
    case ResultadoVinculacion::Rechazado:
      ledRojo.aviso(PatronLed::TresDestellos, ahora);
      zumbador.reproducir(Sonido::Fallo, ahora);
      break;
    case ResultadoVinculacion::Ninguno:   break;
  }

  actualizarSecuenciaLeds(ahora);
  ledAzul.actualizar(ahora);
  ledVerde.actualizar(ahora);
  ledRojo.actualizar(ahora);
  zumbador.actualizar(ahora);
}

void setup() {
  setCpuFrequencyMhz(CPU_MHZ);  // ver config.h: la espera domina el consumo
  Serial.begin(115200);

  // Sonda sin energía y transceptor RS-485 en recepción hasta la primera captura.
  sonda.begin();
  reinicio = motivoReinicio();
  Serial.write('\n');
  registro::linea("INICIO", "========== TerraSense | ARRANQUE ==========\n"
                  "Firmware %u.%u.%u | último reinicio: %s\n"
                  "Sonda sin energía; preparando indicadores, sensores y Bluetooth.",
                  FIRMWARE_VERSION_MAYOR, FIRMWARE_VERSION_MENOR, FIRMWARE_VERSION_PARCHE, reinicio.texto);
  if (reinicio.resultado != Resultado::Ok)
    registro::veredicto("INICIO", reinicio.resultado, reinicio.pista, "último reinicio: %s", reinicio.texto);

  pinMode(PIN_VBAT_SENSE, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_VBAT_SENSE, ADC_11db);

  ledAzul.begin();
  ledVerde.begin();
  ledRojo.begin();
  zumbador.begin();
  pulsadorPair.begin();

  // El driver I2C del núcleo registra cada NACK como error; la ausencia del
  // sensor ya la informa el firmware, y sin esto el escaneo llena la consola.
  esp_log_level_set("i2c.master", ESP_LOG_NONE);
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setTimeOut(20);
  const uint8_t enBus = escanearI2C();
  bme.begin(Wire);
  informarBme(enBus);

  identidad::begin();
  registro::linea("PAIR", "ID de la sonda (desde la MAC): %s", identidad::codigo().c_str());

  bleIniciar();
  // La única señal de «estoy encendida».
  ledVerde.aviso(PatronLed::Encendido1s, millis());
  zumbador.reproducir(Sonido::Encendido, millis());
  registro::linea("LISTO", "Inicio terminado. La conexión y las lecturas se comprueban por separado.\n"
                  "Mantén PAIR 3 s para vincular; suelta al escuchar la doble llamada.\n"
                  "Consola a 115200 baudios con «Nueva línea»: envía d + Enter para el diagnóstico.\n"
                  "==========================================");
}

void loop() {
  const uint32_t ahora = millis();

  switch (pulsadorPair.actualizar(ahora)) {
    case EventoPulsador::PairingActivado:
      cancelarPruebas();
      bleAbrirVentana(ahora);
      zumbador.reproducir(Sonido::VentanaAbierta, ahora);
      registro::linea("PAIR", "Ventana de vinculación abierta por %lu s", PAIR_VENTANA_MS / 1000UL);
      break;
    case EventoPulsador::Ninguno:
      break;
  }

  bleActualizar(ahora);
  const bool conectado = bleConectado();
  if (conectado && !estabaConectado && conexionesBle < UINT16_MAX) ++conexionesBle;
  estabaConectado = conectado;
  if (captura == OrigenCaptura::App && !bleSesionLecturaVigente(sesionCaptura)) {
    sonda.cancelar();
    captura = OrigenCaptura::Ninguna;
    registro::linea("SONDA", "Captura cancelada: terminó la sesión o suscripción BLE");
  }
  // PAIR con el antirrebote del pulsador: un pico de ruido en IO33 no cancela pruebas.
  if (conectado || bleVentanaAbierta(ahora) || pulsadorPair.presionado()) {
    cancelarPruebas();
    if (direccionI2C || capturaLocal() || autotest.activo()) {
      cancelarCapturaLocal();
      monitor.aviso("MONITOR", "Prueba local cancelada por %s; MOSFET apagado.",
                    conectado ? "una conexión Bluetooth" : "PAIR");
    }
  }
  revisarBateria(ahora);
  // La suscripción de la app inicia una captura nueva; el bucle sigue atendiendo
  // PAIR y avisos mientras la sonda se estabiliza y responde.
  uint32_t sesionSolicitada = 0;
  if (captura == OrigenCaptura::Ninguna && bleTomarSolicitudLectura(ahora, sesionSolicitada)) {
    cancelarPruebas();
    if (sonda.iniciar(ahora)) { captura = OrigenCaptura::App; sesionCaptura = sesionSolicitada; }
  }
  atenderMonitor(ahora);
  actualizarAutotest(ahora);
  actualizarDiagnosticoI2C();
  sonda.actualizar(ahora);
  if ((captura == OrigenCaptura::BarridoSonda || captura == OrigenCaptura::EnsayoSonda) &&
      !sonda.ocupada() && !sonda.terminada())
    captura = OrigenCaptura::Ninguna;  // barrido abortado o ensayo terminado: imprimen su propio informe
  if (captura != OrigenCaptura::Ninguna && sonda.terminada()) {
    const OrigenCaptura origen = captura;
    captura = OrigenCaptura::Ninguna;
    const LecturaSuelo lectura = sonda.tomarLectura();
    if (origen == OrigenCaptura::DiagnosticoSonda) monitor.mostrarSonda(lectura, sonda);
    else if (origen == OrigenCaptura::App) medirYNotificar(ahora, lectura);
    else if (origen == OrigenCaptura::Autotest && autotest.paso() == PasoAutotest::Sonda) {
      char texto[AUTOTEST_DETALLE];
      const causas::Veredicto v = juzgarSonda(lectura, sonda, texto, sizeof(texto));
      cerrarPaso(v.resultado, v.pista, texto);
    }
  }
  actualizarAvisos(millis());
  monitor.actualizar(captura != OrigenCaptura::Ninguna);

  delay(5);
}
