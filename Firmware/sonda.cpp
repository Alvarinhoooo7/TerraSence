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
    baudios_ = baudios;
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
    // transmisión aquí y se suelta el bus sin esperar la siguiente vuelta de
    // loop() (≥ 5 ms), porque la sonda puede responder apenas pasan 3,5
    // caracteres (≈ 8 ms). flush() vuelve con los últimos bits aún saliendo:
    // en banco, el eco mostró el último byte truncado en sus 3 bits finales.
    // Por eso se sostiene el bus un carácter más (≈ 2,3 ms a 4.800 baudios),
    // muy por debajo de los 3,5 que la sonda espera antes de responder.
    Serial2.flush();
    delayMicroseconds(11000000UL / baudios_);
    digitalWrite(PIN_RTS, LOW);
    return true;
  }
  bool txTerminado() override { return true; }  // flush() ya esperó el último bit
  int disponible() override { return abierto_ ? Serial2.available() : 0; }
  int recibir() override { return abierto_ ? Serial2.read() : -1; }

private:
  bool abierto_ = false;
  uint32_t baudios_ = 4800;
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
  if (ocupada()) return false;
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
  if (estado_ == Estado::Barrido) { actualizarBarrido(ahora); return; }
  if (estado_ != Estado::Midiendo) return;
  transporte.actualizar(ahora);
  if (!transporte.terminado()) return;

  const modbus::Fallo fallo = transporte.fallo();
  if (fallo == modbus::Fallo::Ninguno) {
    convertir(transporte.registros());
    Serial.printf("[SONDA] Lectura a %lu baudios\n", (unsigned long)SONDA_BAUDIOS[velocidad_]);
    if (transporte.descartados())
      Serial.printf("[SONDA] Se descartaron %u bytes antes de la trama (eco de la consulta o ruido del bus)\n",
                    transporte.descartados());
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
  if (transporte.largoCrudo()) {
    Serial.print("[SONDA] Bytes recibidos:");
    for (size_t i = 0; i < transporte.largoCrudo(); i++) Serial.printf(" %02X", transporte.crudo()[i]);
    Serial.println();
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
  puerto.direccionTx(false);
  puerto.cerrar();
  puerto.alimentar(false);
  lectura_ = LecturaSuelo{};
  estado_ = Estado::Libre;
}

LecturaSuelo Sonda::tomarLectura() {
  const LecturaSuelo l = lectura_;
  lectura_ = LecturaSuelo{};
  estado_ = Estado::Libre;
  transporte.limpiar();
  return l;
}

const uint8_t *Sonda::crudo() const { return transporte.crudo(); }
size_t Sonda::largoCrudo() const { return transporte.largoCrudo(); }
uint8_t Sonda::descartados() const { return transporte.descartados(); }

bool Sonda::iniciarBarrido(uint32_t ahora) {
  if (ocupada()) return false;
  lectura_ = LecturaSuelo{};
  transporte.limpiar();
  estado_ = Estado::Barrido;
  pasoBarrido_ = 0;
  recibiendoBarrido_ = false;
  barridoDesde_ = ahora;
  puerto.direccionTx(false);
  puerto.alimentar(true);
  Serial.println("[DIAG] Barrido RS-485 iniciado; MOSFET IO5 activo. x cancela.");
  return true;
}

void Sonda::actualizarBarrido(uint32_t ahora) {
  static const uint32_t velocidades[] = {2400, 4800, 9600};
  if (!recibiendoBarrido_) {
    if (pasoBarrido_ == 0 && ahora - barridoDesde_ < SONDA_ESTABILIZACION_MS) return;
    modbus::Consulta c;
    c.direccion = SONDA_DIRECCION;
    c.funcion = SONDA_FUNCION;
    c.inicio = SONDA_REGISTRO_INICIO;
    c.cantidad = SONDA_REGISTROS;
    uint8_t lectura[8];
    modbus::armarSolicitud(c, lectura);
    // Consulta de identidad comodín del manual; no escribe configuración.
    static const uint8_t identidad[8] = {0xFF, 0x03, 0x07, 0xD0, 0x00, 0x01, 0x91, 0x59};
    const uint8_t *tx = pasoBarrido_ % 2 ? identidad : lectura;
    if (!puerto.abrir(velocidades[pasoBarrido_ / 2])) { cancelar(); return; }
    // Acotado incluso si el bus recibe ruido continuamente.
    for (unsigned i = 0; i < 128 && Serial2.available(); ++i) Serial2.read();
    if (Serial2.available()) {
      cancelar();
      Serial.println("[DIAG] Barrido cancelado: recepción continua antes de transmitir; MOSFET apagado.");
      return;
    }
    Serial.printf("[DIAG] %lu baudios | %s\nHEX TX:",
                  (unsigned long)velocidades[pasoBarrido_ / 2],
                  pasoBarrido_ % 2 ? "identidad FF" : "lectura de suelo");
    for (size_t i = 0; i < 8; ++i) Serial.printf(" %02X", tx[i]);
    Serial.println();
    puerto.direccionTx(true);
    if (!puerto.transmitir(tx, 8)) {
      cancelar();
      Serial.println("[DIAG] Fallo de transmisión; MOSFET apagado.");
      return;
    }
    barridoDesde_ = millis();
    largoBarrido_ = 0;
    excesoBarrido_ = false;
    recibiendoBarrido_ = true;
    return;
  }
  for (unsigned n = 0; n < 64 && Serial2.available(); ++n) {
    const uint8_t byte = uint8_t(Serial2.read());
    if (largoBarrido_ < sizeof(rxBarrido_)) rxBarrido_[largoBarrido_++] = byte;
    else excesoBarrido_ = true;
  }
  if (ahora - barridoDesde_ < SONDA_RESPUESTA_MS) return;
  Serial.println("[DIAG] Bytes recibidos sin validar (pueden incluir eco/ruido):");
  Serial.print("HEX RX:");
  for (size_t i = 0; i < largoBarrido_; ++i) Serial.printf(" %02X", rxBarrido_[i]);
  if (!largoBarrido_) Serial.print(" sin respuesta");
  if (excesoBarrido_) Serial.print(" [truncado a 64 bytes]");
  Serial.println();
  puerto.cerrar();
  recibiendoBarrido_ = false;
  if (++pasoBarrido_ == 6) {
    puerto.alimentar(false);
    estado_ = Estado::Terminada;
    Serial.println("[DIAG] Barrido terminado; MOSFET apagado. Opción 7 valida lectura y CRC.");
  }
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
  Serial.printf("[SONDA] Con las escalas de config.h: humedad %.1f %%, temperatura %.1f °C, "
                "CE %u µS/cm, pH %.1f, N %u, P %u, K %u mg/kg\n",
                r[0] / 10.0f, int16_t(r[1]) / 10.0f, r[2], r[3] / 10.0f, r[4], r[5], r[6]);
}
