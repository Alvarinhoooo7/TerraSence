#include "monitor_serie.h"
#include "pines.h"
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

char MonitorSerie::tomarComando() {
  // Acotar el trabajo incluso si un terminal envía datos sin pausa.
  for (uint8_t n = 0; n < 32 && Serial.available() > 0; ++n) {
    int c = Serial.read();
    if (c >= 'A' && c <= 'Z') c += 'a' - 'A';
    if (c == '\r' || c == '\n' || c == ' ' || c == '\t') continue;
    return strchr("h?1234xbeatmgd", c) && c != 0 ? char(c) : '!';
  }
  return 0;
}

void MonitorSerie::texto(const char *formato, ...) {
  if (largo_ >= sizeof(salida_) - 1) return;
  va_list args;
  va_start(args, formato);
  const int n = vsnprintf(salida_ + largo_, sizeof(salida_) - largo_, formato, args);
  va_end(args);
  if (n > 0) {
    const size_t libre = sizeof(salida_) - largo_ - 1;
    largo_ += size_t(n) < libre ? size_t(n) : libre;
  }
}

void MonitorSerie::actualizar(bool capturaEnCurso) {
  if (capturaEnCurso || enviado_ == largo_) return;
  const int libre = Serial.availableForWrite();
  if (libre <= 0) return;
  size_t n = largo_ - enviado_;
  if (n > 64) n = 64;
  if (n > size_t(libre)) n = size_t(libre);
  enviado_ += Serial.write(reinterpret_cast<const uint8_t *>(salida_ + enviado_), n);
  if (enviado_ == largo_) enviado_ = largo_ = 0;
}

void MonitorSerie::mensaje(const char *valor) {
  // Un pedido nuevo sustituye el informe pendiente; nunca se acumulan tareas.
  largo_ = enviado_ = 0;
  texto("\n[MANTENIMIENTO] %s\n", valor);
}

void MonitorSerie::menu() {
  mensaje("TerraSense | monitor a 115200 baudios");
  texto("  h / ? : este menú (comando + Enter; mayúsculas también)\n"
        "  1     : buzzer durante 1 segundo\n"
        "  2     : LED azul durante 1 segundo\n"
        "  3     : LED verde durante 1 segundo\n"
        "  4     : LED rojo durante 1 segundo\n"
        "  x     : cancelar pruebas de salidas; conserva avisos normales\n"
        "  e     : estado del equipo, BLE y pulsador PAIR\n"
        "  b     : batería, ADC, porcentaje y motivo de invalidez\n"
        "  m / g : captura nueva + diagnóstico de suelo, ambiente y trama\n"
        "  a     : ambiente de la última captura (no vuelve a medir)\n"
        "  t     : desglose de la última trama (no vuelve a medir)\n"
        "  d     : barrido RS-485 de banco; bloquea unos segundos\n"
        "Pruebas de salidas y barrido: sólo sin BLE, PAIR ni captura.\n"
        "Un aviso operativo tiene prioridad. Verifica luz/sonido físicamente.\n"
        "Un comando nuevo sustituye el informe pendiente de impresión.\n");
}

void MonitorSerie::bateria(const EstadoBateria &b) {
  texto("\nBATERÍA | GPIO%d | divisor configurado x%.2f\n", PIN_VBAT_SENSE, BATERIA_FACTOR_DIVISOR);
  texto("  ADC en pin: %.3f V | celda estimada: %.3f V\n",
        b.voltios / BATERIA_FACTOR_DIVISOR, b.voltios);
  if (b.valida) texto("  Estado: %s | carga aproximada: %u %%\n", b.baja ? "BAJA" : "normal", b.porcentaje);
  else {
    texto("  Estado: SIN DATO | porcentaje no disponible\n");
    if (!isfinite(b.voltios)) texto("  Motivo: lectura de tensión no finita.\n");
    else if (b.voltios < BATERIA_PRESENTE_MIN_V)
      texto("  Motivo: menos de %.2f V; revisar celda/divisor. Compatible con banco sólo USB.\n", BATERIA_PRESENTE_MIN_V);
    else texto("  Motivo: más de 4.30 V; revisar divisor y tensión real.\n");
    texto("  El firmware descarta el suelo si la batería es inválida.\n");
  }
  texto("  Aviso bajo %.2f V; recuperación sobre %.2f V.\n", BATERIA_BAJA_V, BATERIA_RECUPERADA_V);
}

void MonitorSerie::mostrarBateria(const EstadoBateria &b, uint32_t tomadaEn, uint32_t ahora) {
  mensaje("Lectura periódica de batería; no fuerza otra adquisición");
  if (!tomadaEn) { texto("  Aún no hay lectura.\n"); return; }
  texto("  Antigüedad: %lu ms\n", (unsigned long)(ahora - tomadaEn));
  bateria(b);
}

void MonitorSerie::mostrarEstado(const char *id, bool conectado, bool ventana, bool captura,
                                bool pairPulsado, uint32_t ahora) {
  mensaje("Estado actual del equipo");
  texto("  ID: %s | firmware: %u.%u.%u | encendido: %lu s\n", id,
        FIRMWARE_VERSION_MAYOR, FIRMWARE_VERSION_MENOR, FIRMWARE_VERSION_PARCHE,
        (unsigned long)(ahora / 1000));
  texto("  BLE: %s | ventana PAIR: %s | captura: %s\n",
        conectado ? "conectado" : "sin conexión", ventana ? "abierta" : "cerrada",
        captura ? "en curso" : "en reposo");
  texto("  PAIR IO%d: %s (nivel instantáneo)\n", PIN_PARING, pairPulsado ? "pulsado / LOW" : "suelto / HIGH");
  texto("  LEDs: azul IO%d, verde IO%d, rojo IO%d | buzzer IO%d: %s\n",
        PIN_LED_BLUE, PIN_LED_GREEN, PIN_LED_RED, PIN_BUZZER,
        BUZZER_HABILITADO ? "habilitado" : "silenciado en configuración");
  texto("  I2C: SDA IO%d / SCL IO%d | RS-485: RX IO%d / TX IO%d / RTS IO%d\n",
        PIN_SDA, PIN_SCL, PIN_RX, PIN_TX, PIN_RTS);
  texto("  Modbus configurado: dirección %u, %lu / %lu baudios, 8N1.\n",
        SONDA_DIRECCION, (unsigned long)SONDA_BAUDIOS[0], (unsigned long)SONDA_BAUDIOS[1]);
  texto("  Usa b para batería; m para una captura nueva; a/t para la última.\n");
}

void MonitorSerie::sensorAmbiente(bool presente, bool humedad, uint8_t direccion) {
  if (presente) texto("  Ambiente: %s detectado en 0x%02X (no confirma una lectura actual).\n",
                     humedad ? "BME280" : "BMP280", direccion);
  else texto("  Ambiente: sensor no detectado; m vuelve a intentar leerlo.\n");
}

void MonitorSerie::registrarCaptura(const LecturaSuelo &original, const EstadoBateria &b,
                                   const LecturaAmbiente &aire, const uint8_t *bytes,
                                   bool solicitadaApp, bool enviada, uint32_t ahora) {
  suelo_ = original;
  bateria_ = b;
  aire_ = aire;
  memcpy(trama_, bytes, TRAMA_BYTES);
  solicitadaApp_ = solicitadaApp;
  enviada_ = enviada;
  capturaEn_ = ahora;
  hayCaptura_ = true;
}

bool MonitorSerie::cabeceraCaptura(uint32_t ahora) {
  if (!hayCaptura_) {
    texto("  Aún no hay captura. Usa m para adquirir datos reales.\n");
    return false;
  }
  texto("  Última captura: hace %lu ms | origen: %s\n", (unsigned long)(ahora - capturaEn_),
        solicitadaApp_ ? "app" : "monitor serie");
  texto("  BLE: %s\n", enviada_ ? "notificación encolada; recepción no confirmada" :
        solicitadaApp_ ? "no enviada" : "prueba local; no se notifica");
  return true;
}

void MonitorSerie::ambiente() {
  texto("\nAMBIENTE | lectura del BME280/BMP280 de esa captura\n");
  // Usar los centinelas del empaquetador: reflejan ausencia o fuera de rango.
  const uint16_t t = (uint16_t(trama_[16]) << 4) | (trama_[17] >> 4);
  const uint16_t p = (uint16_t(trama_[17] & 15) << 8) | trama_[18];
  if (t != AMBIENTE_SIN_DATO_12) texto("  Temperatura del aire: %.2f °C\n", aire_.temperaturaC);
  else texto("  Temperatura del aire: SIN DATO (ausente o fuera de rango)\n");
  if (p != AMBIENTE_SIN_DATO_12) texto("  Presión: %.2f hPa\n", aire_.presionHpa);
  else texto("  Presión: SIN DATO (ausente o fuera de rango)\n");
  if (trama_[19] != AMBIENTE_SIN_DATO_8) texto("  Humedad del aire: %.2f %%\n", aire_.humedadPct);
  else texto("  Humedad del aire: SIN DATO (ausente o fuera de rango; BMP280 sin humedad)\n");
}

void MonitorSerie::trama() {
  texto("\nTRAMA BLE | 20 bytes | índices desde 0 | enteros big-endian\n  HEX: ");
  for (size_t i = 0; i < TRAMA_BYTES; ++i) texto("%02X ", trama_[i]);
  texto("\n");
  static const char *nombres[] = {"humedad x10", "temperatura x10 (con signo)", "CE en µS/cm", "pH x10", "N en mg/kg", "P en mg/kg", "K en mg/kg"};
  bool sinSuelo = true;
  for (size_t i = 0; i < 15; ++i) sinSuelo = sinSuelo && trama_[i] == 0xFF;
  for (size_t i = 0; i < 7; ++i)
    texto("  [%02u-%02u] %02X %02X : %s%s\n", unsigned(i * 2), unsigned(i * 2 + 1),
          trama_[i * 2], trama_[i * 2 + 1], nombres[i], sinSuelo ? " | SIN DATO" : "");
  texto("  [14] %02X : batería%s\n  [15] %02X : versión del formato\n",
        trama_[14], sinSuelo ? " | SIN DATO" : " en %", trama_[15]);
  texto("  [16-18] %02X %02X %02X : temperatura (12 bits) + presión (12 bits)\n",
        trama_[16], trama_[17], trama_[18]);
  texto("  [19] %02X : humedad del aire x2 (FF = sin dato)\n", trama_[19]);
  texto("  Temperatura aire = código / 10 - 40 °C; presión = código + 300 hPa.\n"
        "  Código FFF = sin dato para cada magnitud de 12 bits.\n");
}

void MonitorSerie::mostrarCaptura(uint32_t ahora) {
  mensaje("Diagnóstico de la última captura; no modifica la medición");
  if (!cabeceraCaptura(ahora)) return;
  texto("\nSUELO | respuesta Modbus: %s\n", suelo_.valida ? "íntegra (CRC validado)" : "sin lectura válida");
  if (suelo_.valida) {
    texto("  Humedad: %.1f %% | temperatura: %.1f °C | CE: %u µS/cm\n",
          suelo_.humedadX10 / 10.0f, suelo_.temperaturaX10 / 10.0f, suelo_.conductividad);
    texto("  pH: %.1f | N: %u | P: %u | K: %u mg/kg\n", suelo_.phX10 / 10.0f,
          suelo_.nitrogeno, suelo_.fosforo, suelo_.potasio);
    texto("  Resultado: %s\n", !sueloPublicable(suelo_) ? "descartado por rangos" :
          !bateria_.valida ? "descartado por batería inválida; la sonda SÍ respondió" : "suelo incluido en la trama");
    texto("  Rangos válidos no certifican calibración ni contacto con el suelo.\n");
  }
  bateria(bateria_);
  ambiente();
  trama();
}

void MonitorSerie::mostrarAmbiente(uint32_t ahora) {
  mensaje("Ambiente de la última captura; usa m para actualizar");
  if (cabeceraCaptura(ahora)) ambiente();
}

void MonitorSerie::mostrarTrama(uint32_t ahora) {
  mensaje("Última trama; usa m para actualizar");
  if (cabeceraCaptura(ahora)) trama();
}
