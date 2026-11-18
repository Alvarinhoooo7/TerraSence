// sonda.cpp

#include "sonda.h"

#include "causas_diagnostico.h"
#include "config.h"
#include "pines.h"
#include "registro.h"

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

// Bytes en hexadecimal en una sola línea de registro (hasta 64).
void hexEnLinea(const char *area, const char *rotulo, const uint8_t *bytes, size_t largo, const char *sufijo = "") {
  char hex[3 * 64 + 1] = "";
  size_t k = 0;
  for (size_t i = 0; i < largo && i < 64; ++i) k += snprintf(hex + k, sizeof(hex) - k, " %02X", bytes[i]);
  registro::linea(area, "%s%s%s", rotulo, largo ? hex : " sin bytes", sufijo);
}

// Posición de una respuesta Modbus íntegra (función 03, `datos` bytes de carga
// y CRC correcto) dentro de lo recibido, o -1. direccion 0 acepta cualquiera.
// El eco de la consulta nunca calza: su tercer byte no es la cuenta de datos.
int buscarTrama(const uint8_t *rx, size_t largo, uint8_t datos, uint8_t direccion) {
  const size_t trama = 5 + size_t(datos);
  for (size_t i = 0; i + trama <= largo; ++i) {
    if ((direccion && rx[i] != direccion) || rx[i + 1] != 0x03 || rx[i + 2] != datos) continue;
    const uint16_t crc = modbus::crc16(rx + i, trama - 2);
    if (rx[i + trama - 2] == uint8_t(crc) && rx[i + trama - 1] == uint8_t(crc >> 8)) return int(i);
  }
  return -1;
}

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
  // La primera muestra espera SONDA_ESTABILIZACION_MS tras activar el MOSFET;
  // las muestras siguientes de la misma ráfaga esperan SONDA_SEPARACION_RAFAGA_MS
  // con la sonda ya energizada.
  c.estabilizacionMs = muestrasTomadas_ ? SONDA_SEPARACION_RAFAGA_MS : SONDA_ESTABILIZACION_MS;
  c.respuestaMs = SONDA_RESPUESTA_MS;
  c.reintentos = SONDA_REINTENTOS;
  transporte.limpiar();
  return transporte.iniciar(c, ahora);
}

// La ráfaga sólo pide otra muestra si le queda plazo de reloj. Sin este tope,
// una sucesión de consultas falladas (hasta 1,5 s cada una entre reintentos)
// estiraría la captura más allá de los 15 s que la app espera por la
// notificación, y el equipo terminaría entregando una lectura que ya nadie
// recibe. `millis()` da la vuelta cada 49,7 días y la resta sin signo lo
// resuelve sola, así que no hace falta tratar el desborde aparte.
bool Sonda::quedaPlazoRafaga(uint32_t ahora) const {
  return ahora - rafagaDesde_ < SONDA_RAFAGA_MAX_MS;
}

void Sonda::finalizarCaptura() {
  puerto.sostener(false);
  puerto.direccionTx(false);
  puerto.cerrar();
  puerto.alimentar(false);
  estado_ = Estado::Terminada;
}

uint32_t Sonda::baudios() const { return SONDA_BAUDIOS[velocidad_]; }

void Sonda::registrarFallo(modbus::Fallo fallo) {
  ultimoFallo_ = fallo;
  excepcion_ = fallo == modbus::Fallo::Excepcion ? transporte.excepcion() : 0;
  const uint8_t i = uint8_t(fallo);
  if (i < sizeof(fallosAcumulados_) / sizeof(fallosAcumulados_[0]) && fallosAcumulados_[i] < UINT16_MAX)
    ++fallosAcumulados_[i];
}

bool Sonda::iniciar(uint32_t ahora) {
  if (ocupada()) return false;
  lectura_ = LecturaSuelo{};
  velocidad_ = 0;
  muestrasTomadas_ = 0;
  muestrasValidas_ = 0;
  descartadosRafaga_ = 0;
  largoValida_ = 0;
  ultimoFallo_ = modbus::Fallo::Ninguno;
  excepcion_ = 0;
  rafagaDesde_ = ahora;
  estado_ = Estado::Midiendo;
  puerto.sostener(true);
  if (!consultar(ahora)) {
    registro::linea("SONDA", "No se pudo iniciar la consulta: %s", modbus::nombreFallo(transporte.fallo()));
    registrarFallo(transporte.fallo());
    finalizarCaptura();
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
    const uint16_t *r = transporte.registros();
    if (r && muestrasValidas_ < SONDA_MUESTRAS_RAFAGA) {
      for (uint8_t k = 0; k < SONDA_REGISTROS; ++k) rafaga_[muestrasValidas_][k] = r[k];
      ++muestrasValidas_;
      // El eco se informa sumado en el resumen de la ráfaga, no muestra a muestra.
      descartadosRafaga_ += transporte.descartados();
      const size_t desde = transporte.descartados() < transporte.largoCrudo() ? transporte.descartados()
                                                                              : transporte.largoCrudo();
      largoValida_ = transporte.largoCrudo() - desde;
      if (largoValida_ > sizeof(respuestaValida_)) largoValida_ = sizeof(respuestaValida_);
      memcpy(respuestaValida_, transporte.crudo() + desde, largoValida_);
      if (registro::detallado())
        registro::linea("SONDA", "Muestra %u/%u a %lu baudios: hum %u, temp %d, CE %u, pH %u, N %u, P %u, K %u | "
                        "%u bytes descartados",
                        muestrasValidas_, SONDA_MUESTRAS_RAFAGA, (unsigned long)SONDA_BAUDIOS[velocidad_], r[0],
                        int16_t(r[1]), r[2], r[3], r[4], r[5], r[6], transporte.descartados());
    }
    ++muestrasTomadas_;
    if (muestrasTomadas_ < SONDA_MUESTRAS_RAFAGA && quedaPlazoRafaga(ahora) && consultar(ahora)) return;
    if (muestrasTomadas_ < SONDA_MUESTRAS_RAFAGA && !quedaPlazoRafaga(ahora))
      registro::linea("SONDA", "Ráfaga cerrada por plazo (%lu ms): se promedian las %u muestras válidas obtenidas",
                      (unsigned long)SONDA_RAFAGA_MAX_MS, muestrasValidas_);
    convertirRafaga();
    finalizarCaptura();
    return;
  }
  registrarFallo(fallo);
  if (fallo == modbus::Fallo::Excepcion) {
    registro::linea("SONDA", "Excepción Modbus 0x%02X a %lu baudios", transporte.excepcion(),
                    (unsigned long)SONDA_BAUDIOS[velocidad_]);
  } else {
    registro::linea("SONDA", "Fallo a %lu baudios: %s", (unsigned long)SONDA_BAUDIOS[velocidad_],
                    modbus::nombreFallo(fallo));
  }
  if (transporte.largoCrudo()) hexEnLinea("SONDA", "Bytes recibidos:", transporte.crudo(), transporte.largoCrudo());
  // Si aún no obtuvimos ninguna muestra válida y hubo silencio, probar la otra velocidad.
  if (muestrasValidas_ == 0 && fallo == modbus::Fallo::Silencio && velocidad_ + 1 < VELOCIDADES) {
    velocidad_++;
    muestrasTomadas_ = 0;
    if (consultar(ahora)) return;
  }
  // Si ya teníamos al menos una muestra válida en la ráfaga, intentar completar o cerrar con las válidas.
  if (muestrasValidas_ > 0) {
    ++muestrasTomadas_;
    if (muestrasTomadas_ < SONDA_MUESTRAS_RAFAGA && quedaPlazoRafaga(ahora) && consultar(ahora)) return;
    if (muestrasTomadas_ < SONDA_MUESTRAS_RAFAGA && !quedaPlazoRafaga(ahora))
      registro::linea("SONDA", "Ráfaga cerrada por plazo (%lu ms): se promedian las %u muestras válidas obtenidas",
                      (unsigned long)SONDA_RAFAGA_MAX_MS, muestrasValidas_);
    convertirRafaga();
  }
  finalizarCaptura();
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
  barrido_ = ResumenBarrido{};
  puerto.direccionTx(false);
  puerto.alimentar(true);
  registro::linea("BARRIDO", "Barrido RS-485 iniciado; MOSFET IO5 activo. Seis consultas de %lu ms; x cancela.",
                  (unsigned long)SONDA_RESPUESTA_MS);
  return true;
}

void Sonda::actualizarBarrido(uint32_t ahora) {
  static const uint32_t velocidades[] = {2400, 4800, 9600};
  // Consulta de identidad comodín del manual; no escribe configuración.
  static const uint8_t identidad[8] = {0xFF, 0x03, 0x07, 0xD0, 0x00, 0x01, 0x91, 0x59};
  modbus::Consulta c;
  c.direccion = SONDA_DIRECCION;
  c.funcion = SONDA_FUNCION;
  c.inicio = SONDA_REGISTRO_INICIO;
  c.cantidad = SONDA_REGISTROS;
  uint8_t lectura[8];
  modbus::armarSolicitud(c, lectura);
  const bool esIdentidad = pasoBarrido_ % 2;
  const uint8_t *tx = esIdentidad ? identidad : lectura;
  const uint32_t baudios = velocidades[pasoBarrido_ / 2];
  if (!recibiendoBarrido_) {
    if (pasoBarrido_ == 0 && ahora - barridoDesde_ < SONDA_ESTABILIZACION_MS) return;
    if (!puerto.abrir(baudios)) { cancelar(); return; }
    // Acotado incluso si el bus recibe ruido continuamente.
    for (unsigned i = 0; i < 128 && Serial2.available(); ++i) Serial2.read();
    if (Serial2.available()) {
      cancelar();
      registro::veredicto("BARRIDO", registro::Resultado::Falla,
                          {"el bus recibe bytes sin parar: ruido fuerte, RO flotante o A/B en cortocircuito",
                           "revisar el cableado del transceptor y polarizar A/B (R12/R13)"},
                          "barrido cancelado: recepción continua antes de transmitir; MOSFET apagado");
      return;
    }
    char rotulo[64];
    snprintf(rotulo, sizeof(rotulo), "%u/6 %lu baudios, %s | TX:", pasoBarrido_ + 1, (unsigned long)baudios,
             esIdentidad ? "identidad FF" : "lectura de suelo");
    hexEnLinea("BARRIDO", rotulo, tx, 8);
    puerto.direccionTx(true);
    if (!puerto.transmitir(tx, 8)) {
      cancelar();
      registro::veredicto("BARRIDO", registro::Resultado::Falla, causas::modbus(modbus::Fallo::Puerto),
                          "fallo de transmisión por el UART2; MOSFET apagado");
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

  // Qué llegó, más allá del eco: un transceptor que escucha mientras transmite
  // devuelve primero los 8 bytes de la consulta.
  const bool eco = largoBarrido_ >= 8 && memcmp(rxBarrido_, tx, 8) == 0;
  const size_t propios = largoBarrido_ - (eco ? 8 : 0);
  const int pos = esIdentidad ? buscarTrama(rxBarrido_, largoBarrido_, 2, 0)
                              : buscarTrama(rxBarrido_, largoBarrido_, 2 * SONDA_REGISTROS, SONDA_DIRECCION);
  const char *nota = pos >= 0 ? (esIdentidad ? " | trama de identidad válida" : " | lectura válida (CRC correcto)")
                           : eco && !propios ? " | sólo el eco de la consulta"
                           : propios <= 1 && largoBarrido_ ? " | ruido del bus al conmutar, no una respuesta"
                                                          : "";
  char sufijo[80];
  snprintf(sufijo, sizeof(sufijo), "%s%s", excesoBarrido_ ? " [truncado a 64 bytes]" : "", nota);
  hexEnLinea("BARRIDO", "    RX:", rxBarrido_, largoBarrido_, sufijo);
  if (eco) barrido_.eco = true;
  if (pos >= 0 && !esIdentidad && !barrido_.baudiosLectura) barrido_.baudiosLectura = baudios;
  if (pos >= 0 && esIdentidad && !barrido_.baudiosIdentidad) {
    barrido_.baudiosIdentidad = baudios;
    barrido_.direccion = rxBarrido_[pos];
  }
  if (pos < 0 && propios > 1) barrido_.bytesSinTrama = true;
  puerto.cerrar();
  recibiendoBarrido_ = false;
  if (++pasoBarrido_ == 6) {
    puerto.alimentar(false);
    estado_ = Estado::Terminada;
    resumirBarrido();
  }
}

void Sonda::resumirBarrido() const {
  using registro::Resultado;
  const ResumenBarrido &b = barrido_;
  bool configurada = false;
  for (uint32_t v : SONDA_BAUDIOS) configurada |= v == b.baudiosLectura;
  if (b.baudiosLectura && configurada)
    registro::veredicto("BARRIDO", Resultado::Ok, {nullptr, "enviar 7 para validar la lectura completa y sus rangos"},
                        "la sonda responde a %lu baudios en la dirección %u; MOSFET apagado",
                        (unsigned long)b.baudiosLectura, SONDA_DIRECCION);
  else if (b.baudiosLectura)
    registro::veredicto("BARRIDO", Resultado::Aviso,
                        {"la sonda fue reconfigurada a una velocidad que el firmware no prueba",
                         "reconfigurarla a 4800 (registro 0x07D1) o agregar la velocidad a SONDA_BAUDIOS"},
                        "responde sólo a %lu baudios; MOSFET apagado", (unsigned long)b.baudiosLectura);
  else if (b.baudiosIdentidad)
    registro::veredicto("BARRIDO", Resultado::Aviso,
                        {"la sonda tiene otra dirección Modbus",
                         "reconfigurarla a la dirección 1 (registro 0x07D0) o cambiar SONDA_DIRECCION en config.h"},
                        "contesta la identidad a %lu baudios con dirección %u, pero no la lectura en la dirección %u",
                        (unsigned long)b.baudiosIdentidad, b.direccion, SONDA_DIRECCION);
  else if (b.bytesSinTrama)
    registro::veredicto("BARRIDO", Resultado::Falla,
                        {"velocidad distinta de 2400/4800/9600, A/B invertidos o ruido del bus",
                         "intercambiar A y B (es inofensivo) y polarizar el bus (R12/R13 de 4,7 kΩ)"},
                        "llegan bytes, pero ninguna trama válida");
  else if (b.eco)
    registro::veredicto("BARRIDO", Resultado::Falla,
                        {"el transceptor transmite (vuelve el eco), pero la sonda no contesta: sin 5 V,\n"
                         "GND no común o A/B invertidos",
                         "medir 5 V en el cable café con IO5 activo e intercambiar A y B"},
                        "sólo vuelve el eco de la consulta");
  else
    registro::veredicto("BARRIDO", Resultado::Falla, causas::modbus(modbus::Fallo::Silencio),
                        "ninguna de las seis consultas recibió respuesta; MOSFET apagado");
}

bool Sonda::iniciarEnsayo(uint32_t ahora, uint16_t total) {
  if (ocupada() || !total) return false;
  lectura_ = LecturaSuelo{};
  ensayo_ = Ensayo{};
  ensayo_.total = total;
  ensayo_.desde = ahora;
  estado_ = Estado::Ensayo;
  puerto.sostener(true);
  registro::linea("ENSAYO", "%u consultas Modbus seguidas a %lu baudios, sin reintentos; sonda energizada "
                  "todo el ensayo (IO5). x cancela y apaga.",
                  total, (unsigned long)SONDA_BAUDIOS[0]);
  if (!consultarEnsayo(ahora)) {
    registro::linea("ENSAYO", "No se pudo iniciar: %s", modbus::nombreFallo(transporte.fallo()));
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
    if (l.nitrogeno < e.nMin) e.nMin = l.nitrogeno;
    if (l.nitrogeno > e.nMax) e.nMax = l.nitrogeno;
    if (l.fosforo < e.pMin) e.pMin = l.fosforo;
    if (l.fosforo > e.pMax) e.pMax = l.fosforo;
    if (l.potasio < e.kMin) e.kMin = l.potasio;
    if (l.potasio > e.kMax) e.kMax = l.potasio;
  } else {
    const uint8_t indice = uint8_t(fallo);
    if (indice < sizeof(e.fallos) / sizeof(e.fallos[0])) ++e.fallos[indice];
    if (e.primeraFalla < 0) e.primeraFalla = e.hechas;
    e.racha = 0;
    // Las diez primeras fallas se detallan; el resto sólo se cuenta.
    if (e.hechas - e.correctas <= 10) {
      char rotulo[48];
      snprintf(rotulo, sizeof(rotulo), "Consulta %u: %s | RX:", e.hechas, modbus::nombreFallo(fallo));
      hexEnLinea("ENSAYO", rotulo, transporte.crudo(), transporte.largoCrudo());
    }
  }
  if (e.hechas % 100 == 0 && e.hechas < e.total) {
    // Tiempo restante al ritmo medido hasta ahora, para que el técnico sepa cuánto esperar.
    const uint32_t transcurridoMs = ahora - e.desde;
    const uint32_t restanteS = uint32_t(uint64_t(transcurridoMs) * (e.total - e.hechas) / e.hechas / 1000U);
    registro::linea("ENSAYO", "%u/%u | correctas %u | fallos %u | faltan ~%lu s", e.hechas, e.total, e.correctas,
                    e.hechas - e.correctas, (unsigned long)restanteS);
  }
  if (e.hechas >= e.total) {
    resumirEnsayo(ahora, false);
    transporte.limpiar();
    puerto.sostener(false);
    puerto.alimentar(false);
    estado_ = Estado::Libre;
    return;
  }
  if (!consultarEnsayo(ahora)) {
    registro::linea("ENSAYO", "Detenido: %s", modbus::nombreFallo(transporte.fallo()));
    cancelar();
  }
}

void Sonda::resumirEnsayo(uint32_t ahora, bool cancelado) {
  using registro::Resultado;
  const Ensayo &e = ensayo_;
  const uint16_t fallas = e.hechas - e.correctas;
  using F = modbus::Fallo;
  auto n = [&e](F f) { return e.fallos[uint8_t(f)]; };
  registro::linea("ENSAYO", "===== %s: %u de %u consultas =====", cancelado ? "CANCELADO" : "RESULTADO",
                  e.hechas, e.total);
  registro::linea("ENSAYO", "Correctas %u | CRC %u | silencio %u | truncadas %u | otras fallas %u | "
                  "fuera de rango %u",
                  e.correctas, n(F::Crc), n(F::Silencio), n(F::Truncada),
                  fallas - n(F::Crc) - n(F::Silencio) - n(F::Truncada), e.fueraDeRango);
  if (e.primeraFalla < 0) registro::linea("ENSAYO", "Sin fallas. Racha máxima: %u consultas seguidas", e.rachaMaxima);
  else registro::linea("ENSAYO", "Primera falla en la consulta %ld. Racha máxima sin falla: %u",
                       (long)e.primeraFalla, e.rachaMaxima);
  if (e.correctas) {
    registro::linea("ENSAYO", "Respuesta por consulta: mín %lu ms, prom %lu ms, máx %lu ms "
                    "(resolución ≈ 5 ms; sin la separación de %lu ms)",
                    (unsigned long)e.minMs, (unsigned long)(e.sumaMs / e.correctas), (unsigned long)e.maxMs,
                    (unsigned long)ENSAYO_SEPARACION_MS);
    registro::linea("ENSAYO", "Rango leído: humedad %.1f-%.1f %% | temperatura %.1f-%.1f °C | "
                    "CE %u-%u µS/cm | pH %.1f-%.1f",
                    e.humMin / 10.0f, e.humMax / 10.0f, e.tempMin / 10.0f, e.tempMax / 10.0f,
                    e.ceMin, e.ceMax, e.phMin / 10.0f, e.phMax / 10.0f);
    registro::linea("ENSAYO", "Rango leído: N %u-%u | P %u-%u | K %u-%u mg/kg (valores de referencia)", e.nMin,
                    e.nMax, e.pMin, e.pMax, e.kMin, e.kMax);
  }
  registro::linea("ENSAYO", "Duración total: %.1f s. MOSFET apagado.", (ahora - e.desde) / 1000.0f);
  F frecuente = F::Ninguno;
  for (uint8_t i = 1; i < sizeof(e.fallos) / sizeof(e.fallos[0]); ++i)
    if (e.fallos[i] > (frecuente == F::Ninguno ? 0 : e.fallos[uint8_t(frecuente)]))
      frecuente = static_cast<F>(i);
  if (cancelado)
    registro::veredicto("ENSAYO", Resultado::Aviso, {nullptr, "repetir 12 completo para el registro D-14"},
                        "cancelado: resultado parcial de %u consultas (%u fallas)", e.hechas, fallas);
  else if (fallas)
    registro::veredicto("ENSAYO", Resultado::Falla, causas::modbus(frecuente),
                        "%u de %u consultas fallaron (%.1f %%); la más frecuente: %s", fallas, e.hechas,
                        100.0f * fallas / e.hechas, modbus::nombreFallo(frecuente));
  else if (e.fueraDeRango)
    registro::veredicto("ENSAYO", Resultado::Aviso, causas::FUERA_DE_RANGO,
                        "sin fallas de comunicación, pero %u lecturas fuera de rango", e.fueraDeRango);
  else
    registro::veredicto("ENSAYO", Resultado::Ok, {nullptr, nullptr}, "%u/%u consultas correctas, sin fallas",
                        e.correctas, e.total);
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
  // Los valores con escala los muestra quien pidió la captura (monitor o
  // trama); aquí sólo los registros crudos, que delatan una escala distinta:
  // por eso salen siempre que algo quede fuera de rango, y si no, sólo con v.
  if (registro::detallado() || !sueloPublicable(lectura_))
    registro::linea("SONDA", "Registros crudos (media de la ráfaga): hum %u, temp %d, CE %u, pH %u, N %u, P %u, K %u",
                    r[0], int16_t(r[1]), r[2], r[3], r[4], r[5], r[6]);
}

void Sonda::convertirRafaga() {
  if (!muestrasValidas_) return;
  uint16_t promediado[SONDA_REGISTROS]{};
  const uint8_t recorte = recorteMediaRecortada(muestrasValidas_, SONDA_MUESTRAS_RAFAGA);
  const uint8_t desde = recorte;
  const uint8_t hasta = muestrasValidas_ - recorte;
  const uint8_t cuenta = hasta - desde;

  for (uint8_t k = 0; k < SONDA_REGISTROS; ++k) {
    if (k == 1) {
      int16_t vals[SONDA_MUESTRAS_RAFAGA]{};
      for (uint8_t i = 0; i < muestrasValidas_; ++i) vals[i] = int16_t(rafaga_[i][1]);
      for (uint8_t i = 1; i < muestrasValidas_; ++i) {
        const int16_t v = vals[i];
        uint8_t j = i;
        while (j > 0 && vals[j - 1] > v) { vals[j] = vals[j - 1]; --j; }
        vals[j] = v;
      }
      int32_t suma = 0;
      for (uint8_t i = desde; i < hasta; ++i) suma += vals[i];
      const int32_t mitad = cuenta / 2;
      const int32_t redondeado = suma >= 0 ? (suma + mitad) / int32_t(cuenta) : (suma - mitad) / int32_t(cuenta);
      promediado[1] = uint16_t(int16_t(redondeado));
    } else {
      uint16_t vals[SONDA_MUESTRAS_RAFAGA]{};
      for (uint8_t i = 0; i < muestrasValidas_; ++i) vals[i] = rafaga_[i][k];
      for (uint8_t i = 1; i < muestrasValidas_; ++i) {
        const uint16_t v = vals[i];
        uint8_t j = i;
        while (j > 0 && vals[j - 1] > v) { vals[j] = vals[j - 1]; --j; }
        vals[j] = v;
      }
      uint32_t suma = 0;
      for (uint8_t i = desde; i < hasta; ++i) suma += vals[i];
      promediado[k] = uint16_t((suma + cuenta / 2U) / cuenta);
    }
  }
  uint16_t humMin = rafaga_[0][0], humMax = rafaga_[0][0];
  int16_t tempMin = int16_t(rafaga_[0][1]), tempMax = int16_t(rafaga_[0][1]);
  uint16_t ceMin = rafaga_[0][2], ceMax = rafaga_[0][2];
  uint16_t phMin = rafaga_[0][3], phMax = rafaga_[0][3];
  for (uint8_t i = 1; i < muestrasValidas_; ++i) {
    if (rafaga_[i][0] < humMin) humMin = rafaga_[i][0];
    if (rafaga_[i][0] > humMax) humMax = rafaga_[i][0];
    const int16_t ti = int16_t(rafaga_[i][1]);
    if (ti < tempMin) tempMin = ti;
    if (ti > tempMax) tempMax = ti;
    if (rafaga_[i][2] < ceMin) ceMin = rafaga_[i][2];
    if (rafaga_[i][2] > ceMax) ceMax = rafaga_[i][2];
    if (rafaga_[i][3] < phMin) phMin = rafaga_[i][3];
    if (rafaga_[i][3] > phMax) phMax = rafaga_[i][3];
  }
  convertir(promediado);
  registro::linea("SONDA", "Ráfaga a %lu baudios (%u/%u muestras válidas, media recortada sobre %u centrales) | "
                  "dispersión: Δhum %.1f %%, Δtemp %.1f °C, ΔCE %u µS/cm, ΔpH %.1f",
                  (unsigned long)SONDA_BAUDIOS[velocidad_], muestrasValidas_, SONDA_MUESTRAS_RAFAGA, cuenta,
                  (humMax - humMin) / 10.0f, (tempMax - tempMin) / 10.0f,
                  unsigned(ceMax - ceMin), (phMax - phMin) / 10.0f);
  // Ocho bytes por muestra son el eco exacto de la consulta (transceptor que
  // escucha mientras transmite): es lo normal y sólo se informa con v. Más que
  // eso es ruido del bus al conmutar y se informa siempre.
  const unsigned porMuestra = (descartadosRafaga_ + muestrasValidas_ / 2U) / muestrasValidas_;
  const bool soloEco = descartadosRafaga_ == 8U * muestrasValidas_;
  if (descartadosRafaga_ && (!soloEco || registro::detallado()))
    registro::linea("SONDA", "Descartados antes de la trama: %u bytes en total, ~%u por muestra (%s)",
                    descartadosRafaga_, porMuestra,
                    soloEco ? "eco de la consulta: normal"
                    : porMuestra <= 8 ? "eco parcial o ruido: la lectura vale, la valida el CRC"
                                      : "eco + ruido del bus: polarizar A/B (R12/R13)");
}
