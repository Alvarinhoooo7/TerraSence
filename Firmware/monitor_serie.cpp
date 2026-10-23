#include "monitor_serie.h"
#include "pines.h"
#include "config.h"
#include <stdarg.h>
#include <stdio.h>

uint8_t MonitorSerie::tomarComando() {
  for (uint8_t n = 0; n < 32 && Serial.available() > 0; ++n) {
    const uint8_t comando = entrada_.consumir(char(Serial.read()));
    if (comando) return comando;
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

void MonitorSerie::aviso(const char *valor) {
  // Descarta el informe anterior, como mensaje(), pero escribe directo: una
  // captura retiene el buffer y su resultado lo reemplazaría al llegar.
  largo_ = enviado_ = 0;
  Serial.printf("\n[MANTENIMIENTO] %s\n", valor);
}

void MonitorSerie::evento(const char *valor) {
  texto("[DIAG +%lu ms] %s\n", static_cast<unsigned long>(millis()), valor);
}

void MonitorSerie::menu() {
  mensaje("========== TerraSense | DIAGNÓSTICO ===========");
  texto("Consola: 115200 baudios | encendido hace %lu s\n", static_cast<unsigned long>(millis() / 1000));
  texto("SALIDAS (confirmación visual y auditiva)\n"
        "  11    : secuencia: todas 2 s > rojo 1 s > verde 1 s > azul 1 s\n"
        "  2     : buzzer durante 2 segundos\n"
        "  3     : LED azul durante 1 segundo\n"
        "  4     : LED rojo durante 1 segundo\n"
        "  5     : LED verde durante 1 segundo\n"
        "SENSORES (adquisición nueva, sin publicar en la app)\n"
        "  1     : batería: ADC, tensión y porcentaje\n"
        "  6     : lectura nueva de temperatura, presión y humedad del BME280\n"
        "  7     : energizar y leer la sonda, incluso sin batería\n"
        "  9     : diagnóstico I2C: direcciones, errores e identidad del sensor\n"
        "  10    : barrido RS-485: lectura e identidad a 2400/4800/9600 baudios\n"
        "COMUNICACIÓN\n"
        "  8     : estado de Bluetooth y su característica en hexadecimal\n"
        "CONTROL\n"
        "  d/D   : repetir menú | q: salir | x: cancelar prueba local\n"
        "Envía un comando por línea, con Enter (LF, CR o CRLF).\n"
        "Pruebas 1-7 y 9-11: sólo sin BLE conectado, PAIR ni captura.\n"
        "Un aviso operativo tiene prioridad. Verifica luz/sonido físicamente.\n"
        "Un comando nuevo sustituye el informe pendiente de impresión.\n");
}

void MonitorSerie::salir() {
  mensaje("Diagnóstico cerrado. Envía d o D para volver a entrar.");
}

void MonitorSerie::hexadecimal(const char *nombre, const uint8_t *bytes, size_t largo) {
  texto("HEX %s:", nombre);
  for (size_t i = 0; i < largo; ++i) texto(" %02X", bytes[i]);
  if (!largo) texto(" sin bytes recibidos");
  texto("\n");
}

void MonitorSerie::mostrarAdc(const EstadoBateria &b, uint16_t adc, uint16_t milivoltios) {
  mensaje("Batería: adquisición nueva (promedio de 8 muestras)");
  texto("ADC IO%d: %u / 4095 | pin: %u mV | celda: %.3f V\n",
        PIN_VBAT_SENSE, adc, milivoltios, b.voltios);
  texto("HEX ADC crudo: %04X | mV: %04X\n", adc, milivoltios);
  if (b.valida) texto("Batería %s: %u %% (estimado por tensión)\n", b.baja ? "baja" : "conectada", b.porcentaje);
  else if (isfinite(b.voltios) && b.voltios < BATERIA_PRESENTE_MIN_V)
    texto("Batería no conectada (tensión bajo %.2f V; también puede ser descarga profunda)\n", BATERIA_PRESENTE_MIN_V);
  else texto("Batería: tensión inválida; revisar divisor y alimentación\n");
  hexadecimal("porcentaje (FF = sin dato)", &b.porcentaje, 1);
  texto("Conservar el divisor conectado: IO34 flotante no permite detectar ausencia.\n");
}

void MonitorSerie::mostrarAmbienteNuevo(const LecturaAmbiente &aire, bool presente, bool humedad) {
  mensaje(presente ? (humedad ? "Lectura nueva del BME280" : "Lectura nueva del BMP280; no mide humedad") :
                    "Sensor ambiental no conectado o sin respuesta");
  uint8_t bytes[TRAMA_BYTES];
  armarTrama(LecturaSuelo{}, aire, bytes);
  const uint16_t t = (uint16_t(bytes[16]) << 4) | (bytes[17] >> 4);
  const uint16_t p = (uint16_t(bytes[17] & 15) << 8) | bytes[18];
  if (t != AMBIENTE_SIN_DATO_12) texto("Temperatura: %.2f °C\n", aire.temperaturaC);
  else texto("Temperatura: SIN DATO\n");
  if (p != AMBIENTE_SIN_DATO_12) texto("Presión atmosférica: %.2f hPa\n", aire.presionHpa);
  else texto("Presión atmosférica: SIN DATO\n");
  if (bytes[19] != AMBIENTE_SIN_DATO_8) texto("Humedad: %.2f %%\n", aire.humedadPct);
  else texto("Humedad: SIN DATO\n");
  hexadecimal("ambiente (bytes 16-19 de telemetría; empaquetados, no registros I2C)", bytes + 16, 4);
}

void MonitorSerie::mostrarSonda(const LecturaSuelo &suelo, const uint8_t *crudo, size_t largo, uint8_t descartados) {
  mensaje("Sonda: captura independiente de batería y ambiente; MOSFET apagado al finalizar");
  if (suelo.valida) {
    texto("Humedad: %.1f %% | temperatura: %.1f °C | CE: %u µS/cm | pH: %.1f\n"
          "N: %u | P: %u | K: %u mg/kg | CRC correcto | rangos: %s\n",
          suelo.humedadX10 / 10.0f, suelo.temperaturaX10 / 10.0f, suelo.conductividad,
          suelo.phX10 / 10.0f, suelo.nitrogeno, suelo.fosforo, suelo.potasio,
          sueloPublicable(suelo) ? "correctos" : "fuera de rango");
    // El transporte conserva eco/ruido antes de la respuesta; no son parte de la trama.
    const size_t inicio = descartados < largo ? descartados : largo;
    hexadecimal("respuesta Modbus recibida (incluye CRC)", crudo + inicio, largo - inicio);
  } else {
    texto("Sonda sin lectura válida; revisar alimentación, cableado y mensajes Modbus\n");
    hexadecimal("RX del último intento (sin validar; puede incluir eco/ruido)", crudo, largo);
  }
}

void MonitorSerie::mostrarBle(const DiagnosticoBle &d, const char *id) {
  mensaje("Estado actual de Bluetooth");
  texto("Nombre: " TS_NOMBRE_BASE "-%s\nServicio: " TS_SERVICE_UUID "\n", id);
  texto("Pila: %s | GATT: %s | teléfono: %s | anuncio: %s\n",
        d.inicializado ? "iniciada" : "NO iniciada", d.gattListo ? "configurado" : "incompleto",
        d.conectado ? "conectado" : "sin conexión", d.anunciando ? "activo" : "inactivo");
  texto("Reanudar anuncio: %s | lectura pendiente: %s | PAIR: %s\n",
        d.reanudando ? "sí" : "no", d.lecturaPendiente ? "sí" : "no",
        d.largoEstado == 5 ? (d.estado[4] & 1 ? "abierta" : "cerrada") : "sin dato");
  texto("Característica de estado: batería, versión mayor/menor/parche, banderas\n");
  hexadecimal("estado actual (mismo formato de la lectura GATT)", d.estado, d.largoEstado);
  texto("Resultado local: %s; comprobar descubrimiento y recepción con un teléfono.\n",
        d.inicializado && d.gattListo && d.largoEstado == 5 && (d.conectado || d.anunciando) ?
        "sin anomalías detectadas" : d.reanudando ? "reanuncio pendiente" : "revisar BLE");
}
