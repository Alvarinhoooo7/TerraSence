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

Pulsador pulsadorPair(PIN_PARING);
Led ledAzul(PIN_LED_BLUE);
Led ledVerde(PIN_LED_GREEN);
Led ledRojo(PIN_LED_RED);
Zumbador zumbador(PIN_BUZZER);
Bme280 bme;
Sonda sonda;

// Quién pidió la captura en curso: la de la app se notifica; la de la tecla
// «m» del monitor serie sólo se muestra, para probar la sonda sin teléfono.
enum class OrigenCaptura : uint8_t { Ninguna, App, Serie };
OrigenCaptura captura = OrigenCaptura::Ninguna;

EstadoBateria bateriaActual;
uint32_t ultimaBateria = 0;

// Tensión de la celda en voltios, promediando para reducir el ruido del ADC.
float leerBateriaV() {
  uint32_t suma = 0;
  for (int i = 0; i < 8; i++) suma += analogReadMilliVolts(PIN_VBAT_SENSE);
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
                  bateriaActual.baja ? "batería baja" : "batería normal");
  }
}

// Arma la trama con la lectura de suelo de esta captura (inválida si la sonda
// no respondió), el ambiente y la batería medidos ahora mismo, y la notifica
// si la pidió la app.
void medirYNotificar(uint32_t ahora, LecturaSuelo suelo, bool notificar) {
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
  const bool enviada = notificar && bleNotificar(trama, sizeof(trama));

  Serial.print("[TRAMA] ");
  for (size_t i = 0; i < sizeof(trama); i++) Serial.printf("%02X ", trama[i]);
  Serial.println(enviada     ? "(notificada)"
                 : notificar ? "(sin teléfono conectado)"
                             : "(prueba desde el monitor serie: no se notifica)");
  Serial.printf("[TRAMA] suelo: %s | BME280: %s | batería ADC: %.2f V (%s)\n",
                suelo.valida ? "ok" : "sin lectura (FF)",
                bme.presente() ? "ok" : "ausente (centinela)", bateriaActual.voltios,
                bateriaActual.valida ? "aproximada" : "sin dato");

  if (!enviada) return;
  // notify() sólo encola la notificación; no acredita recepción en la app.
  if (suelo.valida) {
    ledVerde.aviso(PatronLed::TresDestellos, ahora);
    zumbador.reproducir(Sonido::Exito, ahora);
  } else {
    ledRojo.aviso(PatronLed::TresDestellos, ahora);
    zumbador.reproducir(Sonido::Fallo, ahora);
  }
}

// Comandos del monitor serie para el banco: «m» pide una captura de prueba y
// «d» el diagnóstico del bus RS-485. Devuelve el último reconocido, o 0.
char comandoSerie() {
  char comando = 0;
  while (Serial.available() > 0) {
    const int c = Serial.read();
    if (c == 'm' || c == 'M') comando = 'm';
    if (c == 'd' || c == 'D') comando = 'd';
  }
  return comando;
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
      zumbador.reproducir(Sonido::Exito, ahora);
      break;
    case ResultadoVinculacion::Rechazado:
      ledRojo.aviso(PatronLed::TresDestellos, ahora);
      zumbador.reproducir(Sonido::Fallo, ahora);
      break;
    case ResultadoVinculacion::Ninguno:   break;
  }

  ledAzul.actualizar(ahora);
  ledVerde.actualizar(ahora);
  ledRojo.actualizar(ahora);
  zumbador.actualizar(ahora);
}

void setup() {
  Serial.begin(115200);

  // Sonda sin energía y transceptor RS-485 en recepción hasta la primera captura.
  sonda.begin();

  pinMode(PIN_VBAT_SENSE, INPUT);
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
  Serial.println("TerraSense ESP32 inicializado. Tecla «m»: medir la sonda sin la app; «d»: diagnóstico del bus RS-485.");
}

void loop() {
  const uint32_t ahora = millis();

  switch (pulsadorPair.actualizar(ahora)) {
    case EventoPulsador::PairingActivado:
      bleAbrirVentana(ahora);
      zumbador.reproducir(Sonido::VentanaAbierta, ahora);
      Serial.printf("[PAIR] Ventana de vinculación abierta por %lu s\n", PAIR_VENTANA_MS / 1000UL);
      break;
    case EventoPulsador::Ninguno:
      break;
  }

  bleActualizar(ahora);
  revisarBateria(ahora);
  // La suscripción de la app inicia una captura nueva; el bucle sigue atendiendo
  // PAIR y avisos mientras la sonda se estabiliza y responde.
  if (bleTomarSolicitudLectura(ahora) && sonda.iniciar(ahora)) captura = OrigenCaptura::App;
  const char comando = comandoSerie();
  if (comando && captura != OrigenCaptura::Ninguna) {
    Serial.println("[SONDA] Ya hay una captura en curso");
  } else if (comando == 'm' && sonda.iniciar(ahora)) {
    captura = OrigenCaptura::Serie;
    Serial.println("[SONDA] Captura pedida desde el monitor serie");
  } else if (comando == 'd') {
    sonda.diagnosticoBus();
  }
  sonda.actualizar(ahora);
  if (captura == OrigenCaptura::App && !bleConectado()) {
    sonda.cancelar();  // la respuesta no se entrega a una conexión posterior
    captura = OrigenCaptura::Ninguna;
    Serial.println("[SONDA] Captura cancelada: la app se desconectó");
  }
  if (captura != OrigenCaptura::Ninguna && sonda.terminada()) {
    const bool notificar = captura == OrigenCaptura::App;
    captura = OrigenCaptura::Ninguna;
    medirYNotificar(ahora, sonda.tomarLectura(), notificar);
  }
  actualizarAvisos(ahora);

  delay(5);
}
