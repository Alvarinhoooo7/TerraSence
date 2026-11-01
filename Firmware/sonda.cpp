// sonda.cpp

#include "sonda.h"

#include "config.h"
#include "pines.h"

namespace {

// Puerto Modbus sobre UART2 del ESP32, con los pines de la placa V2 (pines.h):
// IO16 recibe, IO17 transmite, IO4 (RTS) conmuta el transceptor (alto =
// transmitir) e IO5 (GATE) energiza la sonda a través del corte por MOSFET.
// El esquemático V3 conserva estos mismos pines.
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
  void alimentar(bool encendido) override {
    if (!encendido && sostener_) return;  // el ensayo D-14 mantiene la sonda energizada
    digitalWrite(PIN_GATE, encendido ? HIGH : LOW);
  }
  void sostener(bool activo) { sostener_ = activo; }
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
  bool sostener_ = false;
  uint32_t baudios_ = 4800;
};

// Separación entre consultas del ensayo: muy por sobre los 3,5 caracteres de
// silencio que exige Modbus RTU (≈ 8 ms a 4.800 baudios).
constexpr uint32_t ENSAYO_SEPARACION_MS = 50;

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
  if (estado_ == Estado::Ensayo) { actualizarEnsayo(ahora); return; }
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
  if (estado_ == Estado::Ensayo) resumirEnsayo(millis(), true);
  transporte.cancelar();
  puerto.sostener(false);
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

bool Sonda::iniciarEnsayo(uint32_t ahora, uint16_t total) {
  if (ocupada() || !total) return false;
  lectura_ = LecturaSuelo{};
  ensayo_ = Ensayo{};
  ensayo_.total = total;
  ensayo_.desde = ahora;
  estado_ = Estado::Ensayo;
  puerto.sostener(true);
  Serial.printf("[ENSAYO] %u consultas Modbus seguidas a %lu baudios, sin reintentos; sonda energizada "
                "todo el ensayo (IO5). x cancela y apaga.\n",
                total, (unsigned long)SONDA_BAUDIOS[0]);
  if (!consultarEnsayo(ahora)) {
    Serial.printf("[ENSAYO] No se pudo iniciar: %s\n", modbus::nombreFallo(transporte.fallo()));
    cancelar();
  }
  return true;
}

bool Sonda::consultarEnsayo(uint32_t ahora) {
  modbus::Consulta c;
  c.direccion = SONDA_DIRECCION;
  c.funcion = SONDA_FUNCION;
  c.inicio = SONDA_REGISTRO_INICIO;
  c.cantidad = SONDA_REGISTROS;
  c.baudios = SONDA_BAUDIOS[0];
  // La primera consulta espera la estabilización tras energizar; las demás,
  // sólo la separación entre tramas.
  c.estabilizacionMs = ensayo_.hechas ? ENSAYO_SEPARACION_MS : SONDA_ESTABILIZACION_MS;
  c.respuestaMs = SONDA_RESPUESTA_MS;
  c.reintentos = 0;  // cada fallo cuenta: nada se oculta tras un reintento
  ensayo_.consultaDesde = ahora;
  transporte.limpiar();
  return transporte.iniciar(c, ahora);
}

void Sonda::actualizarEnsayo(uint32_t ahora) {
  transporte.actualizar(ahora);
  if (!transporte.terminado()) return;
  Ensayo &e = ensayo_;
  // Tiempo de la consulta sin la espera previa (resolución del bucle ≈ 5 ms).
  const uint32_t espera = e.hechas ? ENSAYO_SEPARACION_MS : SONDA_ESTABILIZACION_MS;
  const uint32_t transcurrido = ahora - e.consultaDesde;
  const uint32_t ms = transcurrido > espera ? transcurrido - espera : 0;
  const modbus::Fallo fallo = transporte.fallo();
  ++e.hechas;
  if (fallo == modbus::Fallo::Ninguno) {
    const uint16_t *r = transporte.registros();
    LecturaSuelo l;
    l.valida = true;
    l.humedadX10 = r[0]; l.temperaturaX10 = int16_t(r[1]); l.conductividad = r[2]; l.phX10 = r[3];
    l.nitrogeno = r[4]; l.fosforo = r[5]; l.potasio = r[6];
    ++e.correctas;
    if (!sueloPublicable(l)) ++e.fueraDeRango;
    if (++e.racha > e.rachaMaxima) e.rachaMaxima = e.racha;
    if (ms < e.minMs) e.minMs = ms;
    if (ms > e.maxMs) e.maxMs = ms;
    e.sumaMs += ms;
    if (l.humedadX10 < e.humMin) e.humMin = l.humedadX10;
    if (l.humedadX10 > e.humMax) e.humMax = l.humedadX10;
    if (l.temperaturaX10 < e.tempMin) e.tempMin = l.temperaturaX10;
    if (l.temperaturaX10 > e.tempMax) e.tempMax = l.temperaturaX10;
    if (l.conductividad < e.ceMin) e.ceMin = l.conductividad;
    if (l.conductividad > e.ceMax) e.ceMax = l.conductividad;
    if (l.phX10 < e.phMin) e.phMin = l.phX10;
    if (l.phX10 > e.phMax) e.phMax = l.phX10;
  } else {
    const uint8_t indice = uint8_t(fallo);
    if (indice < sizeof(e.fallos) / sizeof(e.fallos[0])) ++e.fallos[indice];
    if (e.primeraFalla < 0) e.primeraFalla = e.hechas;
    e.racha = 0;
    // Las diez primeras fallas se detallan; el resto sólo se cuenta.
    if (e.hechas - e.correctas <= 10) {
      Serial.printf("[ENSAYO] Consulta %u: %s | RX:", e.hechas, modbus::nombreFallo(fallo));
      for (size_t i = 0; i < transporte.largoCrudo(); ++i) Serial.printf(" %02X", transporte.crudo()[i]);
      if (!transporte.largoCrudo()) Serial.print(" sin bytes");
      Serial.println();
    }
  }
  if (e.hechas % 100 == 0 && e.hechas < e.total)
    Serial.printf("[ENSAYO] %u/%u | correctas %u | fallos %u\n", e.hechas, e.total, e.correctas,
                  e.hechas - e.correctas);
  if (e.hechas >= e.total) {
    resumirEnsayo(ahora, false);
    transporte.limpiar();
    puerto.sostener(false);
    puerto.alimentar(false);
    estado_ = Estado::Libre;
    return;
  }
  if (!consultarEnsayo(ahora)) {
    Serial.printf("[ENSAYO] Detenido: %s\n", modbus::nombreFallo(transporte.fallo()));
    cancelar();
  }
}

void Sonda::resumirEnsayo(uint32_t ahora, bool cancelado) {
  const Ensayo &e = ensayo_;
  const uint16_t fallas = e.hechas - e.correctas;
  using F = modbus::Fallo;
  auto n = [&e](F f) { return e.fallos[uint8_t(f)]; };
  Serial.printf("[ENSAYO] ===== %s: %u de %u consultas =====\n", cancelado ? "CANCELADO" : "RESULTADO",
                e.hechas, e.total);
  Serial.printf("[ENSAYO] Correctas %u | CRC %u | silencio %u | truncadas %u | otras fallas %u | "
                "fuera de rango %u\n",
                e.correctas, n(F::Crc), n(F::Silencio), n(F::Truncada),
                fallas - n(F::Crc) - n(F::Silencio) - n(F::Truncada), e.fueraDeRango);
  if (e.primeraFalla < 0) Serial.printf("[ENSAYO] Sin fallas. Racha máxima: %u consultas seguidas\n", e.rachaMaxima);
  else Serial.printf("[ENSAYO] Primera falla en la consulta %ld. Racha máxima sin falla: %u\n",
                     (long)e.primeraFalla, e.rachaMaxima);
  if (e.correctas) {
    Serial.printf("[ENSAYO] Respuesta por consulta: mín %lu ms, prom %lu ms, máx %lu ms "
                  "(resolución ≈ 5 ms; sin la separación de %lu ms)\n",
                  (unsigned long)e.minMs, (unsigned long)(e.sumaMs / e.correctas), (unsigned long)e.maxMs,
                  (unsigned long)ENSAYO_SEPARACION_MS);
    Serial.printf("[ENSAYO] Rango leído: humedad %.1f-%.1f %% | temperatura %.1f-%.1f °C | "
                  "CE %u-%u µS/cm | pH %.1f-%.1f\n",
                  e.humMin / 10.0f, e.humMax / 10.0f, e.tempMin / 10.0f, e.tempMax / 10.0f,
                  e.ceMin, e.ceMax, e.phMin / 10.0f, e.phMax / 10.0f);
  }
  Serial.printf("[ENSAYO] Duración total: %.1f s. MOSFET apagado.\n", (ahora - e.desde) / 1000.0f);
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
