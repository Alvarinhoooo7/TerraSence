// sonda.cpp

#include "sonda.h"

#include "config.h"
#include "pines.h"

namespace {

// Puerto Modbus sobre UART2 del ESP32, con los pines de la placa V2 (pines.h):
// IO16 recibe, IO17 transmite, IO4 (RTS) conmuta el transceptor (alto =
// transmitir) e IO5 (GATE) energiza la sonda a través del corte por MOSFET.
// La placa V3 del informe aún no existe: este firmware no la contempla.
class PuertoEsp32 : public modbus::Puerto {
public:
  bool abrir(uint32_t baudios) override {
    Serial2.begin(baudios, SERIAL_8N1, PIN_RX, PIN_TX);
    abierto_ = true;
    return true;
  }
  void cerrar() override {
    if (abierto_) Serial2.end();
    abierto_ = false;
  }
  void alimentar(bool encendido) override { digitalWrite(PIN_GATE, encendido ? HIGH : LOW); }
  void direccionTx(bool transmitir) override { digitalWrite(PIN_RTS, transmitir ? HIGH : LOW); }
  bool transmitir(const uint8_t *bytes, size_t largo) override {
    if (!abierto_ || Serial2.write(bytes, largo) != largo) return false;
    // Ocho bytes a 4.800 baudios son ≈ 17 ms: se espera el fin de la
    // transmisión aquí para soltar la línea antes de que responda la sonda.
    Serial2.flush();
    return true;
  }
  bool txTerminado() override { return true; }  // flush() ya esperó el último bit
  int disponible() override { return abierto_ ? Serial2.available() : 0; }
  int recibir() override { return abierto_ ? Serial2.read() : -1; }

private:
  bool abierto_ = false;
};

PuertoEsp32 puerto;
modbus::Transporte transporte(puerto);
constexpr uint8_t VELOCIDADES = sizeof(SONDA_BAUDIOS) / sizeof(SONDA_BAUDIOS[0]);

}  // namespace

void Sonda::begin() {
  // Sonda sin energía y transceptor en recepción hasta la primera captura.
  pinMode(PIN_GATE, OUTPUT);
  digitalWrite(PIN_GATE, LOW);
  pinMode(PIN_RTS, OUTPUT);
  digitalWrite(PIN_RTS, LOW);
}

bool Sonda::consultar(uint32_t ahora) {
  modbus::Consulta c;
  c.direccion = SONDA_DIRECCION;
  c.funcion = SONDA_FUNCION;
  c.inicio = SONDA_REGISTRO_INICIO;
  c.cantidad = SONDA_REGISTROS;
  c.baudios = SONDA_BAUDIOS[velocidad_];
  c.estabilizacionMs = SONDA_ESTABILIZACION_MS;
  c.respuestaMs = SONDA_RESPUESTA_MS;
  c.reintentos = SONDA_REINTENTOS;
  transporte.limpiar();
  return transporte.iniciar(c, ahora);
}

bool Sonda::iniciar(uint32_t ahora) {
  if (estado_ == Estado::Midiendo) return false;
  lectura_ = LecturaSuelo{};
  velocidad_ = 0;
  estado_ = Estado::Midiendo;
  if (!consultar(ahora)) {
    Serial.printf("[SONDA] No se pudo iniciar la consulta: %s\n", modbus::nombreFallo(transporte.fallo()));
    estado_ = Estado::Terminada;
  }
  return true;
}

void Sonda::actualizar(uint32_t ahora) {
  if (estado_ != Estado::Midiendo) return;
  transporte.actualizar(ahora);
  if (!transporte.terminado()) return;

  const modbus::Fallo fallo = transporte.fallo();
  if (fallo == modbus::Fallo::Ninguno) {
    convertir(transporte.registros());
    Serial.printf("[SONDA] Lectura a %lu baudios\n", (unsigned long)SONDA_BAUDIOS[velocidad_]);
    estado_ = Estado::Terminada;
    return;
  }
  if (fallo == modbus::Fallo::Excepcion) {
    Serial.printf("[SONDA] Excepción Modbus 0x%02X a %lu baudios\n", transporte.excepcion(),
                  (unsigned long)SONDA_BAUDIOS[velocidad_]);
  } else {
    Serial.printf("[SONDA] Fallo a %lu baudios: %s\n", (unsigned long)SONDA_BAUDIOS[velocidad_],
                  modbus::nombreFallo(fallo));
  }
  // Sólo el silencio sugiere otra velocidad; un CRC o una excepción indican
  // que la sonda sí escucha a esta velocidad y no conviene insistir.
  if (fallo == modbus::Fallo::Silencio && velocidad_ + 1 < VELOCIDADES) {
    velocidad_++;
    if (consultar(ahora)) return;
  }
  estado_ = Estado::Terminada;
}

void Sonda::cancelar() {
  transporte.cancelar();
  if (estado_ == Estado::Midiendo) estado_ = Estado::Libre;
}

LecturaSuelo Sonda::tomarLectura() {
  const LecturaSuelo l = lectura_;
  lectura_ = LecturaSuelo{};
  estado_ = Estado::Libre;
  transporte.limpiar();
  return l;
}

void Sonda::convertir(const uint16_t *r) {
  if (!r) return;
  lectura_.humedadX10 = r[0];
  lectura_.temperaturaX10 = int16_t(r[1]);
  lectura_.conductividad = r[2];
  lectura_.phX10 = r[3];
  lectura_.nitrogeno = r[4];
  lectura_.fosforo = r[5];
  lectura_.potasio = r[6];
  lectura_.valida = true;
  Serial.printf("[SONDA] Registros: hum %u, temp %d, CE %u, pH %u, N %u, P %u, K %u\n",
                r[0], int16_t(r[1]), r[2], r[3], r[4], r[5], r[6]);
}
