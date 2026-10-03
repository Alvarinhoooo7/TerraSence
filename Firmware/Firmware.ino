/*
 * Firmware TerraSense - ESP32 (Arduino IDE, núcleo esp32 3.x)
 *
 * Alcance actual: vinculación BLE con la app (pulsador PAIR y confirmación del
 * ID, que sale de la MAC), indicadores LED y sonoros, y trama de telemetría de
 * 20 bytes. No hay reset desde la sonda: el único reset es el del backoffice.
 * Sin lectura de suelo todavía: los campos sin lectura viajan en 0xFF y nunca
 * se simulan. Estado y pendientes en TASK.md.
 */

#include <Wire.h>

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
bool capturaEnCurso = false;

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

// La sonda RS-485 aún no tiene driver: la lectura siempre es inválida.
// No se reemplaza por valores de ejemplo; ver trama.h.
// Arma y notifica la trama con la lectura de suelo de esta captura (inválida si
// la sonda no respondió), el ambiente y la batería medidos ahora mismo.
void medirYNotificar(uint32_t ahora, LecturaSuelo suelo) {
  revisarBateria(ahora, true);  // la batería de esta captura, sin reutilizar la anterior
  if (suelo.valida && !bateriaActual.valida) {
    Serial.println("[TRAMA] Batería inválida: se descarta la medición de suelo");
    suelo.valida = false;
  }
  if (suelo.valida) suelo.bateriaPct = bateriaActual.porcentaje;
  if (suelo.valida && !sueloPublicable(suelo)) {
    Serial.println("[TRAMA] Suelo fuera de rango: se descarta la medición");
    suelo.valida = false;
  }
  const LecturaAmbiente aire = bme.leer();

  uint8_t trama[TRAMA_BYTES];
  armarTrama(suelo, aire, trama);
  const bool enviada = bleNotificar(trama, sizeof(trama));

  Serial.print("[TRAMA] ");
  for (size_t i = 0; i < sizeof(trama); i++) Serial.printf("%02X ", trama[i]);
  Serial.println(enviada ? "(notificada)" : "(sin teléfono conectado)");
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

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setTimeOut(20);
  bme.begin(Wire);
  if (bme.presente()) Serial.printf("[BME280] Detectado en 0x%02X\n", bme.direccion());
  else Serial.println("[BME280] No detectado: el ambiente viajará como centinela");

  identidad::begin();
  Serial.printf("[PAIR] ID de la sonda (desde la MAC): %s\n", identidad::codigo().c_str());

  bleIniciar();
  // La única señal de «estoy encendida».
  ledVerde.aviso(PatronLed::Encendido1s, millis());
  zumbador.reproducir(Sonido::Encendido, millis());
  Serial.println("TerraSense ESP32 inicializado.");
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
  if (bleTomarSolicitudLectura(ahora) && sonda.iniciar(ahora)) capturaEnCurso = true;
  sonda.actualizar(ahora);
  if (capturaEnCurso && !bleConectado()) {
    sonda.cancelar();  // la respuesta no se entrega a una conexión posterior
    capturaEnCurso = false;
    Serial.println("[SONDA] Captura cancelada: la app se desconectó");
  }
  if (capturaEnCurso && sonda.terminada()) {
    capturaEnCurso = false;
    medirYNotificar(ahora, sonda.tomarLectura());
  }
  actualizarAvisos(ahora);

  delay(5);
}
