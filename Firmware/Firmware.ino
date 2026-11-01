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
enum class OrigenCaptura : uint8_t { Ninguna, App, DiagnosticoSonda, BarridoSonda, EnsayoSonda };
OrigenCaptura captura = OrigenCaptura::Ninguna;
uint32_t sesionCaptura = 0;
uint8_t direccionI2C = 0;  // 0: diagnóstico inactivo
uint8_t encontradosI2C = 0, erroresI2C = 0;

EstadoBateria bateriaActual;
uint32_t ultimaBateria = 0;
uint16_t ultimoAdc = 0;
uint16_t ultimosMilivoltios = 0;

// Tensión de la celda en voltios, promediando para reducir el ruido del ADC.
float leerBateriaV() {
  uint32_t suma = 0;
  uint32_t sumaCruda = 0;
  for (int i = 0; i < 8; i++) {
    sumaCruda += analogRead(PIN_VBAT_SENSE);
    suma += analogReadMilliVolts(PIN_VBAT_SENSE);
  }
  ultimoAdc = (sumaCruda + 4) / 8;
  ultimosMilivoltios = (suma + 4) / 8;
  return (suma / 8.0f) / 1000.0f * BATERIA_FACTOR_DIVISOR;
}

void revisarBateria(uint32_t ahora, bool forzar = false) {
  if (!forzar && ultimaBateria != 0 && ahora - ultimaBateria < BATERIA_PERIODO_MS) return;
  ultimaBateria = ahora ? ahora : 1;
  const bool antes = bateriaActual.baja;
  bateriaActual = evaluarBateria(leerBateriaV(), antes);
  bleActualizarEstado(bateriaActual.porcentaje);
  if (bateriaActual.baja != antes) {
    if (bateriaActual.baja) zumbador.reproducir(Sonido::BateriaBaja, ahora);
    Serial.printf("[BAT] %.2f V: %s\n", bateriaActual.voltios,
                  !bateriaActual.valida ? "batería sin dato" : bateriaActual.baja ? "batería baja" : "batería normal");
  }
}

// Arma la trama con la lectura de suelo de esta captura (inválida si la sonda
// no respondió), el ambiente y la batería medidos ahora mismo, y la notifica
// si la pidió la app.
void medirYNotificar(uint32_t ahora, LecturaSuelo suelo) {
  revisarBateria(ahora, true);  // la batería de esta captura, sin reutilizar la anterior
  // Los rangos se revisan antes que la batería para que la prueba en banco, sin
  // celda, igual diga si la lectura de la sonda habría sido publicable.
  if (suelo.valida && !sueloPublicable(suelo)) {
    Serial.println("[TRAMA] Suelo fuera de los rangos del manual: se descarta la medición");
    suelo.valida = false;
  }
  if (suelo.valida && !bateriaActual.valida) {
    Serial.println("[TRAMA] Suelo dentro de rango, pero batería inválida: se descarta la medición de suelo");
    suelo.valida = false;
  }
  if (suelo.valida) suelo.bateriaPct = bateriaActual.porcentaje;
  const LecturaAmbiente aire = bme.leer();

  uint8_t trama[TRAMA_BYTES];
  armarTrama(suelo, aire, trama);
  const bool enviada = bleNotificar(trama, sizeof(trama), sesionCaptura);

  Serial.print("[TRAMA] ");
  for (size_t i = 0; i < sizeof(trama); i++) Serial.printf("%02X ", trama[i]);
  Serial.println(enviada ? "(notificada)" : "(sesión BLE terminada o suscripción cancelada)");
  Serial.printf("[TRAMA] suelo: %s | BME280: %s | batería ADC: %.2f V (%s)\n",
                suelo.valida ? "ok" : "sin lectura (FF)",
                bme.presente() ? "ok" : "ausente (centinela)", bateriaActual.voltios,
                bateriaActual.valida ? "aproximada" : "sin dato");

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
  if (secuenciaLeds.activa()) monitor.evento("Secuencia LED interrumpida; se conservan los avisos del equipo.");
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

void iniciarSecuenciaLeds(uint32_t ahora) {
  if (captura != OrigenCaptura::Ninguna || direccionI2C || bleConectado() ||
      bleVentanaAbierta(ahora) || pulsadorPair.presionado() || !ledsDisponibles(ahora)) {
    monitor.evento("Secuencia LED no iniciada: equipo ocupado o aviso activo. Usa 11 cuando esté en reposo.");
    return;
  }
  cancelarPruebas();
  secuenciaLeds.iniciar(ahora);
  faseLeds = 4;
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
    case 0: monitor.evento("LED 1/4: rojo + verde + azul (2 s). x cancela."); break;
    case 1: monitor.evento("LED 2/4: sólo rojo (1 s)."); break;
    case 2: monitor.evento("LED 3/4: sólo verde (1 s)."); break;
    case 3: monitor.evento("LED 4/4: sólo azul (1 s)."); break;
    default:
      secuenciaLeds.cancelar();
      monitor.evento("Secuencia LED terminada: luces apagadas. Confirma visualmente; 11 repite.");
      break;
  }
}

void cancelarCapturaLocal() {
  direccionI2C = 0;
  if (captura != OrigenCaptura::BarridoSonda && captura != OrigenCaptura::DiagnosticoSonda &&
      captura != OrigenCaptura::EnsayoSonda) return;
  sonda.cancelar();
  captura = OrigenCaptura::Ninguna;
}

void atenderMonitor(uint32_t ahora) {
  const bool estabaAbierto = monitor.activo();
  const uint8_t comando = monitor.tomarComando();
  if (!comando) return;
  const bool ocupada = captura != OrigenCaptura::Ninguna || direccionI2C != 0;
  switch (comando) {
    case 'd':
      monitor.menu();
      if (!estabaAbierto) iniciarSecuenciaLeds(ahora);
      return;
    case 'q':
      cancelarPruebas();
      cancelarCapturaLocal();
      monitor.salir();
      return;
    case 'x':
      cancelarPruebas();
      cancelarCapturaLocal();
      monitor.mensaje("Prueba local cancelada; avisos normales conservados.");
      return;
    case 8: monitor.mostrarBle(bleDiagnostico(), identidad::codigo().c_str()); return;
    case '?': monitor.mensaje("Envía d o D + Enter para entrar al diagnóstico."); return;
    case '!': monitor.mensaje("Comando desconocido. Usa d para ver el menú."); return;
  }
  // Las pruebas manuales nunca compiten con una captura o vinculación.
  if (ocupada || bleConectado() || bleVentanaAbierta(ahora) || pulsadorPair.presionado()) {
    monitor.mensaje("Prueba no iniciada: captura, BLE o PAIR activos. Intenta cuando esté en reposo.");
    return;
  }
  cancelarPruebas();  // una sola salida de mantenimiento a la vez
  bool iniciada = false;
  switch (comando) {
    case 1:
      revisarBateria(ahora, true);
      monitor.mostrarAdc(bateriaActual, ultimoAdc, ultimosMilivoltios);
      return;
    case 2: iniciada = zumbador.probar(ahora); break;
    case 3: iniciada = ledAzul.probar(ahora); break;
    case 4: iniciada = ledRojo.probar(ahora); break;
    case 5: iniciada = ledVerde.probar(ahora); break;
    case 6: {
      const LecturaAmbiente aire = bme.leer();
      monitor.mostrarAmbienteNuevo(aire, bme.presente(), bme.tieneHumedad());
      return;
    }
    case 7:
      if (sonda.iniciar(ahora)) {
        captura = OrigenCaptura::DiagnosticoSonda;
        monitor.aviso("MOSFET IO5 activado: estabilizando y leyendo la sonda. x cancela y apaga.");
        Serial.println("[SONDA] Captura pedida desde el monitor serie");
      } else monitor.mensaje("No se pudo iniciar: la sonda ya está ocupada.");
      return;
    case 9:
      direccionI2C = 0x08;
      encontradosI2C = erroresI2C = 0;
      monitor.aviso("Diagnóstico I2C iniciado: direcciones 08-77; x cancela.");
      return;
    case 10:
      if (sonda.iniciarBarrido(ahora)) captura = OrigenCaptura::BarridoSonda;
      else monitor.mensaje("No se pudo iniciar el barrido: sonda ocupada.");
      return;
    case 11:
      iniciarSecuenciaLeds(ahora);
      return;
    case 12:
      if (sonda.iniciarEnsayo(ahora, 1000)) captura = OrigenCaptura::EnsayoSonda;
      else monitor.mensaje("No se pudo iniciar el ensayo: sonda ocupada.");
      return;
  }
  if (!iniciada) monitor.mensaje("Salida no probada: aviso operativo activo o buzzer deshabilitado.");
  else monitor.mensaje(comando == 2 ? "Buzzer: tono de 2 s. Confirma si se escucha; x cancela." :
                       comando == 3 ? "LED azul: encendido de 1 s. Confirma visualmente; x cancela." :
                       comando == 4 ? "LED rojo: encendido de 1 s. Confirma visualmente; x cancela." :
                                        "LED verde: encendido de 1 s. Confirma visualmente; x cancela.");
}

// Una dirección por vuelta; el timeout de Wire limita cada transacción.
void actualizarDiagnosticoI2C() {
  if (!direccionI2C) return;
  const uint8_t dir = direccionI2C++;
  Wire.beginTransmission(dir);
  const uint8_t resultado = Wire.endTransmission();
  if (resultado == 0) {
    ++encontradosI2C;
    Serial.printf("[I2C] Dispositivo responde en 0x%02X\nHEX dirección I2C (7 bits): %02X\n", dir, dir);
    if (dir == 0x76 || dir == 0x77) {
      Wire.beginTransmission(dir);
      Wire.write(uint8_t(0xD0));
      if (Wire.endTransmission(false) == 0 && Wire.requestFrom(dir, uint8_t(1)) == 1) {
        const uint8_t id = uint8_t(Wire.read());
        Serial.printf("[I2C] Identidad: %s\nHEX registro D0: %02X\n",
                      id == 0x60 ? "BME280" : id == 0x58 ? "BMP280 (sin humedad)" : "otro modelo", id);
      } else {
        ++erroresI2C;
        Serial.println("[I2C] No se pudo leer la identidad del sensor.");
      }
    }
  } else if (resultado != 2) {  // NACK de dirección es normal cuando no hay dispositivo.
    ++erroresI2C;
    Serial.printf("[I2C] Error al consultar 0x%02X\nHEX dirección / código Wire: %02X %02X\n",
                  dir, dir, resultado);
  }
  if (direccionI2C == 0x78) {
    direccionI2C = 0;
    Serial.printf("[I2C] Diagnóstico terminado: %u dispositivos, %u errores. SDA IO%d / SCL IO%d.\n",
                  encontradosI2C, erroresI2C, PIN_SDA, PIN_SCL);
    if (!encontradosI2C) Serial.println("[I2C] Revisar alimentación, GND, SDA/SCL y pull-up.");
  }
}

// Diagnóstico de arranque del bus I2C: lista las direcciones que responden,
// para distinguir un bus mudo (cableado, alimentación, modo SPI) de un sensor
// en otra dirección o de otro modelo. Devuelve cuántas respondieron.
uint8_t escanearI2C() {
  uint8_t encontrados = 0;
  Serial.print("[I2C] Responden:");
  for (uint8_t dir = 0x08; dir < 0x78; dir++) {
    Wire.beginTransmission(dir);
    if (Wire.endTransmission() == 0) {
      Serial.printf(" 0x%02X", dir);
      encontrados++;
    }
  }
  Serial.println(encontrados ? "" : " ninguna dirección");
  return encontrados;
}

void informarBme(uint8_t enBus) {
  if (bme.presente()) {
    if (bme.tieneHumedad()) Serial.printf("[BME280] Detectado en 0x%02X\n", bme.direccion());
    else Serial.printf("[BME280] En 0x%02X hay un BMP280: temperatura y presión sí, la humedad viajará como centinela\n",
                       bme.direccion());
    return;
  }
  Serial.println("[BME280] No detectado: el ambiente viajará como centinela");
  if (bme.direccionAjena()) {
    Serial.printf("[BME280] En 0x%02X responde un chip con ID 0x%02X, que no es BME280 (0x60) ni BMP280 (0x58)\n",
                  bme.direccionAjena(), bme.idAjeno());
  } else if (enBus) {
    Serial.println("[BME280] Hay dispositivos en el bus, pero ninguno en 0x76 ni 0x77");
  } else {
    Serial.printf("[BME280] Bus mudo. Revisar: SDA en IO%d y SCL en IO%d sin invertir; VCC a 3,3 V y GND común; "
                  "en módulos de 6 pines, CSB a VCC (a GND o al aire el sensor puede quedar en modo SPI) y SDO a "
                  "GND (0x76) o a VCC (0x77); pull-up en el módulo o 4,7 kΩ de SDA y SCL a 3,3 V\n",
                  PIN_SDA, PIN_SCL);
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
  Serial.println("\n========== TerraSense | ARRANQUE ==========\n"
                 "[INICIO] Sonda sin energía; preparando indicadores, sensores y Bluetooth.");

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
  Serial.printf("[PAIR] ID de la sonda (desde la MAC): %s\n", identidad::codigo().c_str());

  bleIniciar();
  // La única señal de «estoy encendida».
  ledVerde.aviso(PatronLed::Encendido1s, millis());
  zumbador.reproducir(Sonido::Encendido, millis());
  Serial.println("[LISTO] Inicio terminado. La conexión y las lecturas se comprueban por separado.\n"
                 "[USO] Mantén PAIR 3 s para vincular; suelta al escuchar la doble llamada.\n"
                 "[CONSOLA] 115200 baudios. Envía d + Enter para diagnóstico y prueba de luces.\n"
                 "==========================================");
}

void loop() {
  const uint32_t ahora = millis();

  switch (pulsadorPair.actualizar(ahora)) {
    case EventoPulsador::PairingActivado:
      cancelarPruebas();
      bleAbrirVentana(ahora);
      zumbador.reproducir(Sonido::VentanaAbierta, ahora);
      Serial.printf("[PAIR] Ventana de vinculación abierta por %lu s\n", PAIR_VENTANA_MS / 1000UL);
      break;
    case EventoPulsador::Ninguno:
      break;
  }

  bleActualizar(ahora);
  if (captura == OrigenCaptura::App && !bleSesionLecturaVigente(sesionCaptura)) {
    sonda.cancelar();
    captura = OrigenCaptura::Ninguna;
    Serial.println("[SONDA] Captura cancelada: terminó la sesión o suscripción BLE");
  }
  // PAIR con el antirrebote del pulsador: un pico de ruido en IO33 no cancela pruebas.
  if (bleConectado() || bleVentanaAbierta(ahora) || pulsadorPair.presionado()) {
    cancelarPruebas();
    if (direccionI2C || captura == OrigenCaptura::BarridoSonda || captura == OrigenCaptura::DiagnosticoSonda ||
        captura == OrigenCaptura::EnsayoSonda) {
      cancelarCapturaLocal();
      monitor.aviso("Captura local cancelada por BLE/PAIR; MOSFET apagado.");
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
  actualizarDiagnosticoI2C();
  sonda.actualizar(ahora);
  if ((captura == OrigenCaptura::BarridoSonda || captura == OrigenCaptura::EnsayoSonda) &&
      !sonda.ocupada() && !sonda.terminada())
    captura = OrigenCaptura::Ninguna;  // barrido abortado o ensayo terminado: imprimen su propio informe
  if (captura != OrigenCaptura::Ninguna && sonda.terminada()) {
    const bool desdeApp = captura == OrigenCaptura::App;
    const bool soloSonda = captura == OrigenCaptura::DiagnosticoSonda;
    captura = OrigenCaptura::Ninguna;
    const LecturaSuelo lectura = sonda.tomarLectura();
    if (soloSonda) monitor.mostrarSonda(lectura, sonda.crudo(), sonda.largoCrudo(), sonda.descartados());
    else if (desdeApp) medirYNotificar(ahora, lectura);
  }
  actualizarAvisos(millis());
  monitor.actualizar(captura != OrigenCaptura::Ninguna);

  delay(5);
}
