/*
 * Firmware TerraSense - ESP32 (Arduino IDE, núcleo esp32 3.x)
 *
 * Alcance actual: vinculación BLE con la app (pulsador PAIR + provisión del
 * código), indicadores LED y trama de telemetría de 20 bytes.
 * Sin lectura de suelo todavía: los campos sin lectura viajan en 0xFF y nunca
 * se simulan. Estado y pendientes en TASK.md.
 */

#include <Wire.h>

#include "pines.h"
#include "config.h"
#include "trama.h"
#include "pulsador.h"
#include "leds.h"
#include "identidad.h"
#include "bme280.h"
#include "ble_terrasense.h"

Pulsador pulsadorPair(PIN_PARING);
Led ledAzul(PIN_LED_BLUE);
Led ledVerde(PIN_LED_GREEN);
Led ledRojo(PIN_LED_RED);
Bme280 bme;

bool bateriaBaja = false;
uint32_t ultimaBateria = 0;

// Tensión de la celda en voltios, promediando para reducir el ruido del ADC.
float leerBateriaV() {
  uint32_t suma = 0;
  for (int i = 0; i < 8; i++) suma += analogReadMilliVolts(PIN_VBAT_SENSE);
  return (suma / 8.0f) / 1000.0f * BATERIA_FACTOR_DIVISOR;
}

void revisarBateria(uint32_t ahora) {
  if (ultimaBateria != 0 && ahora - ultimaBateria < BATERIA_PERIODO_MS) return;
  ultimaBateria = ahora ? ahora : 1;

  const float v = leerBateriaV();
  const bool antes = bateriaBaja;
  if (v < BATERIA_PRESENTE_MIN_V) {
    bateriaBaja = false;  // sin celda (p. ej. sólo USB): no hay nada que avisar
  } else if (v < BATERIA_BAJA_V) {
    bateriaBaja = true;
  } else if (v > BATERIA_RECUPERADA_V) {
    bateriaBaja = false;
  }
  if (bateriaBaja != antes) {
    Serial.printf("[BAT] %.2f V: %s\n", v, bateriaBaja ? "batería baja" : "batería normal");
  }
}

// La sonda RS-485 aún no tiene driver: la lectura siempre es inválida.
// No se reemplaza por valores de ejemplo; ver trama.h.
LecturaSuelo leerSuelo() {
  LecturaSuelo suelo;
  suelo.valida = false;
  return suelo;
}

void medirYNotificar(uint32_t ahora) {
  const LecturaSuelo suelo = leerSuelo();
  const LecturaAmbiente aire = bme.leer();

  uint8_t trama[TRAMA_BYTES];
  armarTrama(suelo, aire, trama);
  const bool enviada = bleNotificar(trama, sizeof(trama));

  Serial.print("[TRAMA] ");
  for (size_t i = 0; i < sizeof(trama); i++) Serial.printf("%02X ", trama[i]);
  Serial.println(enviada ? "(notificada)" : "(sin teléfono conectado)");
  Serial.printf("[TRAMA] suelo: %s | BME280: %s | batería ADC: %.2f V (no se envía sin suelo)\n",
                suelo.valida ? "ok" : "sin lectura (FF)",
                bme.presente() ? "ok" : "ausente (centinela)", leerBateriaV());

  if (!enviada) return;
  // Verde: la app recibió una medición. Rojo: la trama llegó, pero sin suelo.
  if (suelo.valida) ledVerde.aviso(PatronLed::TresDestellos, ahora);
  else              ledRojo.aviso(PatronLed::TresDestellos, ahora);
}

// En reposo todo está apagado. Tabla completa en Firmware/README.md.
void actualizarLeds(uint32_t ahora) {
  ledAzul.fondo(bleVentanaAbierta(ahora) ? PatronLed::Parpadeo2Hz : PatronLed::Apagado, ahora);
  ledRojo.fondo(bateriaBaja ? PatronLed::Latido10s : PatronLed::Apagado, ahora);

  switch (bleTomarResultadoVinculacion()) {
    case ResultadoVinculacion::Aceptado:  ledVerde.aviso(PatronLed::TresDestellos, ahora); break;
    case ResultadoVinculacion::Rechazado: ledRojo.aviso(PatronLed::TresDestellos, ahora); break;
    case ResultadoVinculacion::Ninguno:   break;
  }

  ledAzul.actualizar(ahora);
  ledVerde.actualizar(ahora);
  ledRojo.actualizar(ahora);
}

void setup() {
  Serial.begin(115200);

  // Sonda sin energía y transceptor RS-485 en recepción mientras no haya driver.
  pinMode(PIN_GATE, OUTPUT);
  digitalWrite(PIN_GATE, LOW);
  pinMode(PIN_RTS, OUTPUT);
  digitalWrite(PIN_RTS, LOW);

  pinMode(PIN_VBAT_SENSE, INPUT);
  analogSetPinAttenuation(PIN_VBAT_SENSE, ADC_11db);

  ledAzul.begin();
  ledVerde.begin();
  ledRojo.begin();
  pulsadorPair.begin();

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setTimeOut(20);
  bme.begin(Wire);
  if (bme.presente()) Serial.printf("[BME280] Detectado en 0x%02X\n", bme.direccion());
  else Serial.println("[BME280] No detectado: el ambiente viajará como centinela");

  identidad::begin();
  if (identidad::provisionada()) Serial.printf("[PAIR] Código guardado: %s\n", identidad::codigo().c_str());
  else Serial.println("[PAIR] Sin código: mantén PAIR 3 s y vincula desde la app");

  bleIniciar();
  ledVerde.aviso(PatronLed::Encendido1s, millis());  // la única señal de «estoy encendida»
  Serial.println("TerraSense ESP32 inicializado.");
}

void loop() {
  const uint32_t ahora = millis();

  switch (pulsadorPair.actualizar(ahora)) {
    case EventoPulsador::PairingActivado:
      bleAbrirVentana(ahora);
      Serial.printf("[PAIR] Ventana de vinculación abierta por %lu s\n", PAIR_VENTANA_MS / 1000UL);
      break;
    case EventoPulsador::ResetSolicitado:
      Serial.println("[PAIR] Pulsación de 10 s: se borra el código y se reinicia");
      identidad::borrar();
      // Rojo fijo 1 s: confirma el borrado antes de reiniciar.
      ledAzul.apagar();
      ledVerde.apagar();
      ledRojo.apagar();
      ledRojo.aviso(PatronLed::Encendido1s, millis());
      ledRojo.actualizar(millis());
      delay(1000);
      ESP.restart();
      break;
    case EventoPulsador::Ninguno:
      break;
  }

  bleActualizar(ahora);
  revisarBateria(ahora);
  if (bleTomarSolicitudLectura(ahora)) medirYNotificar(ahora);
  actualizarLeds(ahora);

  delay(5);
}
