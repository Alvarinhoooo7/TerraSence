#include "monitor_serie.h"
#include "pines.h"
#include "config.h"
#include "causas_diagnostico.h"
#include <stdarg.h>
#include <stdio.h>

using registro::Pista;
using registro::Resultado;

// Sin fin de línea el comando nunca se ejecuta; tras esta pausa se explica por qué.
constexpr uint32_t ESPERA_FIN_LINEA_MS = 1500;

uint8_t MonitorSerie::tomarComando(uint32_t ahora) {
  for (uint8_t n = 0; n < 32 && Serial.available() > 0; ++n) {
    ultimoByte_ = ahora;
    const uint8_t comando = entrada_.consumir(char(Serial.read()));
    if (comando) {
      avisoFinLinea_ = false;
      Serial.printf("\n> %s\n", entrada_.eco());
      return comando;
    }
  }
  if (!entrada_.pendiente()) avisoFinLinea_ = false;
  else if (!avisoFinLinea_ && ahora - ultimoByte_ >= ESPERA_FIN_LINEA_MS) {
    avisoFinLinea_ = true;
    registro::veredicto("MONITOR", Resultado::Aviso,
                        {"el monitor serie está en «Sin ajuste de línea»",
                         "elegir «Nueva línea» o «Ambos NL & CR» y volver a enviarlo"},
                        "llegó «%s» sin fin de línea: no se ejecuta", entrada_.parcial());
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

void MonitorSerie::agregarSangrado(const char *cuerpo) {
  for (size_t i = 0; cuerpo[i] && largo_ < sizeof(salida_) - 1; ++i) {
    salida_[largo_++] = cuerpo[i];
    if (cuerpo[i] == '\n' && cuerpo[i + 1]) texto("%*s", int(registro::SANGRIA), "");
  }
  salida_[largo_] = '\0';
}

void MonitorSerie::encabezar(const char *area) {
  char prefijo[registro::LARGO_PREFIJO];
  registro::prefijo(prefijo, millis(), area);
  texto("%s", prefijo);
}

void MonitorSerie::actualizar(bool capturaEnCurso) {
  if (capturaEnCurso || enviado_ == largo_) return;
  const int libre = Serial.availableForWrite();
  if (libre <= 0) return;
  size_t n = largo_ - enviado_;
  if (n > 64) n = 64;
  if (n > size_t(libre)) n = size_t(libre);
  // Cortar en un fin de línea: así una línea directa (registro::linea) nunca
  // cae a mitad de una línea de este informe. Una línea más larga que el
  // trozo sale entera en varias vueltas.
  if (enviado_ + n < largo_) {
    size_t corte = n;
    while (corte > 0 && salida_[enviado_ + corte - 1] != '\n') --corte;
    if (corte) n = corte;
  }
  enviado_ += Serial.write(reinterpret_cast<const uint8_t *>(salida_ + enviado_), n);
  if (enviado_ == largo_) enviado_ = largo_ = 0;
}

void MonitorSerie::mensaje(const char *area, const char *formato, ...) {
  largo_ = enviado_ = 0;
  char cuerpo[384];
  va_list args;
  va_start(args, formato);
  vsnprintf(cuerpo, sizeof(cuerpo), formato, args);
  va_end(args);
  texto("\n");
  encabezar(area);
  agregarSangrado(cuerpo);
  texto("\n");
}

void MonitorSerie::evento(const char *area, const char *formato, ...) {
  char cuerpo[384];
  va_list args;
  va_start(args, formato);
  vsnprintf(cuerpo, sizeof(cuerpo), formato, args);
  va_end(args);
  encabezar(area);
  agregarSangrado(cuerpo);
  texto("\n");
}

void MonitorSerie::aviso(const char *area, const char *formato, ...) {
  // Descarta el informe anterior, como mensaje(), pero escribe directo: una
  // captura retiene el buffer y su resultado lo reemplazaría al llegar.
  largo_ = enviado_ = 0;
  char cuerpo[384];
  va_list args;
  va_start(args, formato);
  vsnprintf(cuerpo, sizeof(cuerpo), formato, args);
  va_end(args);
  Serial.write('\n');
  registro::linea(area, "%s", cuerpo);
}

void MonitorSerie::dato(const char *formato, ...) {
  char cuerpo[384];
  va_list args;
  va_start(args, formato);
  vsnprintf(cuerpo, sizeof(cuerpo), formato, args);
  va_end(args);
  texto("%*s", int(registro::SANGRIA), "");
  agregarSangrado(cuerpo);
  texto("\n");
}

void MonitorSerie::bloque(const char *literal) {
  texto("%*s", int(registro::SANGRIA), "");
  agregarSangrado(literal);
  texto("\n");
}

void MonitorSerie::veredicto(const char *area, Resultado r, const Pista &pista, const char *formato, ...) {
  char cuerpo[384];
  va_list args;
  va_start(args, formato);
  vsnprintf(cuerpo, sizeof(cuerpo), formato, args);
  va_end(args);
  encabezar(area);
  texto("%-9s", registro::etiqueta(r));
  agregarSangrado(cuerpo);
  texto("\n");
  if (pista.causa) dato("causa: %s", pista.causa);
  if (pista.sigue) dato("sigue: %s", pista.sigue);
}

void MonitorSerie::hexadecimal(const char *nombre, const uint8_t *bytes, size_t largo, bool siempre) {
  if (!siempre && !registro::detallado()) return;  // con v se ve siempre; una falla lo muestra igual
  texto("%*sHEX %s:", int(registro::SANGRIA), "", nombre);
  for (size_t i = 0; i < largo; ++i) texto(" %02X", bytes[i]);
  if (!largo) texto(" sin bytes recibidos");
  texto("\n");
}

void MonitorSerie::menu(const char *id) {
  mensaje("MONITOR", "========== TerraSense | DIAGNÓSTICO ==========");
  dato("Firmware %u.%u.%u | ID %s | encendido hace %lu s", FIRMWARE_VERSION_MAYOR, FIRMWARE_VERSION_MENOR,
       FIRMWARE_VERSION_PARCHE, id, static_cast<unsigned long>(millis() / 1000));
  bloque("t            AUTOTEST: los 7 pasos en orden (~15 s) y un resumen para el registro\n"
         "e            estado del equipo: reinicio, memoria, Bluetooth y fallos acumulados\n"
         "ENERGÍA      1   batería: ADC, tensión y porcentaje\n"
         "SONDA        7   leer la sonda (ráfaga de 10), sin depender de la batería\n"
         "             10  barrido RS-485: lectura e identidad a 2400/4800/9600 baudios\n"
         "             12  ensayo D-14: 1.000 lecturas seguidas (CRC, tiempos, rango)\n"
         "AMBIENTE     6   lectura nueva del BME280\n"
         "             9   recorrer el bus I2C e identificar el sensor\n"
         "BLUETOOTH    8   anuncio, conexión y característica de estado\n"
         "INDICADORES  11  secuencia de luces: todas 2 s, luego rojo, verde y azul\n"
         "             2   buzzer 2 s | 3 LED azul | 4 LED rojo | 5 LED verde\n"
         "CONTROL      d   menú | x cancelar la prueba | q salir | s/n responder al autotest");
  dato("DETALLE      v   %s: HEX y muestra a muestra (las fallas lo muestran siempre)",
       registro::detallado() ? "ACTIVO, v lo apaga" : "apagado, v lo enciende");
  bloque("Cada prueba termina en OK, AVISO, FALLA, N/D o CONFIRMA, con causa y siguiente paso.\n"
         "Las pruebas piden reposo: sin teléfono conectado ni PAIR (8, e y v funcionan siempre).\n"
         "Un comando por línea, con Enter. Luz y sonido se confirman mirando y escuchando.");
}

void MonitorSerie::alternarDetalle() {
  registro::detallado(!registro::detallado());
  mensaje("MONITOR", "Modo detallado %s.", registro::detallado() ?
          "ACTIVO: cada informe agrega su HEX y la ráfaga se muestra muestra a muestra" :
          "apagado: sólo resultados y veredictos (el HEX de una falla se sigue mostrando)");
}

void MonitorSerie::salir() {
  mensaje("MONITOR", "Diagnóstico cerrado. Envía d o D para volver a entrar.");
}

void MonitorSerie::mostrarSalida(const char *area, const char *descripcion, bool iniciada) {
  mensaje(area, "%s", descripcion);
  if (iniciada)
    veredicto(area, Resultado::Confirmar,
              {"si no se ve u oye: componente invertido, resistencia abierta o pista cortada en ese pin",
               "mirar o escuchar el equipo; x cancela"},
              "salida ordenada: sólo tú puedes comprobar que funcionó");
  else
    veredicto(area, Resultado::NoDisponible,
              {"un aviso del equipo (batería baja, PAIR, resultado de una lectura) ocupa esa salida,\n"
               "o BUZZER_HABILITADO es false en config.h",
               "repetir cuando termine el aviso"},
              "salida no probada");
}

// Ancho en pantalla de un texto UTF-8: los bytes de continuación no ocupan columna.
static size_t anchoVisible(const char *s) {
  size_t n = 0;
  for (; *s; ++s) n += (uint8_t(*s) & 0xC0) != 0x80;
  return n;
}

void MonitorSerie::mostrarResumenAutotest(const Autotest &a, const char (*detalles)[AUTOTEST_DETALLE],
                                          const char *id, const char *reinicio, uint32_t ahora) {
  mensaje("AUTOTEST", "===== RESUMEN %.1f s | firmware %u.%u.%u | ID %s =====", a.duracionMs(ahora) / 1000.0f,
          FIRMWARE_VERSION_MAYOR, FIRMWARE_VERSION_MENOR, FIRMWARE_VERSION_PARCHE, id);
  dato("Último reinicio: %s", reinicio);
  char repetir[96] = "";
  size_t k = 0;
  for (uint8_t i = 0; i < PASOS_AUTOTEST; ++i) {
    const PasoAutotest paso = PasoAutotest(i);
    const char *nombre = nombrePaso(paso);
    // Puntos hasta la columna fija, contando caracteres y no bytes («Batería»).
    char puntos[20] = "";
    size_t n = 0;
    for (size_t c = anchoVisible(nombre); c < 15 && n + 1 < sizeof(puntos); ++c) puntos[n++] = '.';
    puntos[n] = '\0';
    dato("%s %s %-9s%s", nombre, puntos, registro::etiqueta(a.resultado(paso)),
         detalles[i][0] ? detalles[i] : "no se ejecutó");
    if (a.resultado(paso) != Resultado::Ok && k < sizeof(repetir)) {
      const int w = snprintf(repetir + k, sizeof(repetir) - k, "%s%s (%s)", k ? ", " : "", comandoPaso(paso), nombre);
      if (w > 0) k += size_t(w);
    }
  }
  const unsigned ok = a.cuenta(Resultado::Ok), fallas = a.cuenta(Resultado::Falla),
                 avisos = a.cuenta(Resultado::Aviso), sinConfirmar = a.cuenta(Resultado::Confirmar),
                 nd = a.cuenta(Resultado::NoDisponible);
  char sigue[160];
  snprintf(sigue, sizeof(sigue), "repetir %s; el detalle de cada paso está más arriba", repetir);
  if (a.global() == Resultado::Ok)
    veredicto("AUTOTEST", Resultado::Ok, {nullptr, "copiar este resumen al registro del equipo"},
              "equipo sin fallas en los %u pasos", PASOS_AUTOTEST);
  else
    veredicto("AUTOTEST", a.global(), {nullptr, sigue},
              "%u OK | %u falla(s) | %u aviso(s) | %u sin confirmar | %u no disponible(s)", ok, fallas, avisos,
              sinConfirmar, nd);
}

void MonitorSerie::mostrarAdc(const EstadoBateria &b, uint16_t adc, uint16_t milivoltios) {
  mensaje("BAT", "Batería: lectura nueva (media recortada: 10 conversiones, se promedian las 8 centrales)");
  dato("ADC IO%d: %u / 4095 | pin: %u mV | celda: %.3f V (divisor ×%.0f)", PIN_VBAT_SENSE, adc, milivoltios,
       b.voltios, BATERIA_FACTOR_DIVISOR);
  const uint8_t crudo[] = {uint8_t(adc >> 8), uint8_t(adc), uint8_t(milivoltios >> 8), uint8_t(milivoltios),
                           b.porcentaje};
  hexadecimal("ADC (2 bytes) | mV (2 bytes) | porcentaje (FF = sin dato)", crudo, sizeof(crudo));
  char resumen[96];
  const causas::Veredicto v = juzgarBateria(b, resumen, sizeof(resumen));
  veredicto("BAT", v.resultado, v.pista, "%s", resumen);
}

void MonitorSerie::mostrarAmbienteNuevo(const LecturaAmbiente &aire, bool presente, bool humedad,
                                        uint8_t direccion) {
  mensaje("BME280", "Ambiente: lectura nueva del sensor (ráfaga de 10, media recortada)");
  char t[32] = "sin dato", p[32] = "sin dato", h[32] = "sin dato";
  if (aire.temperaturaOk) snprintf(t, sizeof(t), "%.2f °C", aire.temperaturaC);
  if (aire.presionOk) snprintf(p, sizeof(p), "%.2f hPa", aire.presionHpa);
  if (aire.humedadOk) snprintf(h, sizeof(h), "%.2f %%", aire.humedadPct);
  dato("Medido: temperatura %s | presión %s | humedad %s", t, p, h);
  uint8_t bytes[TRAMA_BYTES];
  armarTrama(LecturaSuelo{}, aire, bytes);
  hexadecimal("ambiente (bytes 16-19 de la trama BLE; empaquetados, no registros I2C)", bytes + 16, 4);
  char resumen[160];
  const causas::Veredicto v = juzgarAmbiente(aire, presente, humedad, direccion, resumen, sizeof(resumen));
  veredicto("BME280", v.resultado, v.pista, "%s", resumen);
}

causas::Veredicto juzgarBateria(const EstadoBateria &b, char *texto, size_t largo) {
  const causas::Veredicto v = causas::bateria(b);
  switch (v.resultado) {
    case Resultado::Ok:
      snprintf(texto, largo, "%.2f V, %u %% (estimado por tensión, sin calibrar)", b.voltios, b.porcentaje);
      break;
    case Resultado::Aviso: snprintf(texto, largo, "batería baja: %.2f V, %u %%", b.voltios, b.porcentaje); break;
    case Resultado::NoDisponible:
      snprintf(texto, largo, "sin celda: %.2f V, bajo %.2f V", b.voltios, BATERIA_PRESENTE_MIN_V);
      break;
    default: snprintf(texto, largo, "tensión imposible para una celda LiPo: %.2f V", b.voltios); break;
  }
  return v;
}

causas::Veredicto juzgarAmbiente(const LecturaAmbiente &aire, bool presente, bool humedad, uint8_t direccion,
                                 char *texto, size_t largo) {
  // Mismo criterio que la trama: un valor fuera del rango físico viaja sin dato.
  uint8_t bytes[TRAMA_BYTES];
  armarTrama(LecturaSuelo{}, aire, bytes);
  const bool t = ((uint16_t(bytes[16]) << 4) | (bytes[17] >> 4)) != AMBIENTE_SIN_DATO_12;
  const bool p = ((uint16_t(bytes[17] & 15) << 8) | bytes[18]) != AMBIENTE_SIN_DATO_12;
  const bool h = bytes[19] != AMBIENTE_SIN_DATO_8;
  const causas::Veredicto v = causas::ambiente(presente, humedad, t, p, h);
  if (!presente) snprintf(texto, largo, "sin respuesta en 0x76 ni 0x77");
  else if (v.resultado == Resultado::Falla)
    snprintf(texto, largo, "responde en 0x%02X pero entregó valores imposibles:%s%s%s", direccion,
             t ? "" : " temperatura", p ? "" : " presión", humedad && !h ? " humedad" : "");
  else if (!humedad)
    snprintf(texto, largo, "BMP280 en 0x%02X: %.1f °C, %.1f hPa; sin humedad", direccion, aire.temperaturaC,
             aire.presionHpa);
  else
    snprintf(texto, largo, "BME280 en 0x%02X: %.1f °C, %.1f hPa, %.1f %% (sin contrastar con referencia)",
             direccion, aire.temperaturaC, aire.presionHpa, aire.humedadPct);
  return v;
}

causas::Veredicto juzgarSonda(const LecturaSuelo &suelo, const Sonda &sonda, char *texto, size_t largo) {
  const char *campo = suelo.valida ? causas::campoFueraDeRango(suelo) : nullptr;
  const modbus::Fallo f = sonda.ultimoFallo();
  const causas::Veredicto v =
      causas::sonda(suelo.valida, campo, sonda.muestrasValidas(), SONDA_MUESTRAS_RAFAGA, f);
  const unsigned long baudios = static_cast<unsigned long>(sonda.baudios());
  if (campo) snprintf(texto, largo, "%s fuera del rango del manual: la app descartaría esta medición", campo);
  else if (suelo.valida && v.resultado == Resultado::Aviso)
    snprintf(texto, largo, "sólo %u/%u muestras válidas a %lu baudios; fallo: %s", sonda.muestrasValidas(),
             SONDA_MUESTRAS_RAFAGA, baudios, modbus::nombreFallo(f));
  else if (suelo.valida)
    snprintf(texto, largo, "%u/%u muestras a %lu baudios, CRC correcto y dentro de rango", sonda.muestrasValidas(),
             SONDA_MUESTRAS_RAFAGA, baudios);
  else if (f == modbus::Fallo::Silencio) snprintf(texto, largo, "sin respuesta (probadas 4800 y 9600 baudios)");
  else if (f == modbus::Fallo::Excepcion)
    snprintf(texto, largo, "excepción Modbus 0x%02X a %lu baudios", sonda.excepcion(), baudios);
  else snprintf(texto, largo, "sin lectura válida: %s a %lu baudios", modbus::nombreFallo(f), baudios);
  return v;
}

causas::Veredicto juzgarBle(const DiagnosticoBle &d, char *texto, size_t largo) {
  const causas::Veredicto v =
      causas::bluetooth(d.inicializado, d.gattListo && d.largoEstado == 5, d.conectado, d.anunciando, d.reanudando);
  snprintf(texto, largo, "%s",
           !d.inicializado ? "la pila Bluetooth no inició: la app no encontrará la sonda" :
           !d.gattListo || d.largoEstado != 5 ? "servicio GATT incompleto" :
           d.conectado ? "teléfono conectado" :
           d.anunciando ? "anunciando: visible para la app" :
           d.reanudando ? "reanuncio pendiente tras una desconexión" : "no anuncia: la app no encontrará la sonda");
  return v;
}

void MonitorSerie::mostrarSonda(const LecturaSuelo &suelo, const Sonda &sonda) {
  mensaje("SONDA", "Sonda: lectura independiente de la batería; MOSFET IO5 ya apagado");
  if (suelo.valida) {
    dato("Humedad %.1f %% | temperatura %.1f °C | CE %u µS/cm | pH %.1f", suelo.humedadX10 / 10.0f,
         suelo.temperaturaX10 / 10.0f, suelo.conductividad, suelo.phX10 / 10.0f);
    dato("N %u | P %u | K %u mg/kg (valores de referencia)", suelo.nitrogeno, suelo.fosforo, suelo.potasio);
    // Los valores son la media de la ráfaga; el HEX es una de sus respuestas
    // íntegras, no el último intento (que pudo fallar).
    hexadecimal("última respuesta válida de la ráfaga (incluye CRC)", sonda.respuestaValida(),
                sonda.largoRespuestaValida());
  } else {
    hexadecimal("RX del último intento (sin validar; puede incluir eco/ruido)", sonda.crudo(), sonda.largoCrudo(),
                true);
  }
  char resumen[160];
  const causas::Veredicto v = juzgarSonda(suelo, sonda, resumen, sizeof(resumen));
  veredicto("SONDA", v.resultado, v.pista, "%s", resumen);
}

void MonitorSerie::mostrarBle(const DiagnosticoBle &d, const char *id) {
  mensaje("BLE", "Bluetooth: estado actual");
  dato("Nombre " TS_NOMBRE_BASE "-%s | servicio " TS_SERVICE_UUID, id);
  dato("Pila %s | GATT %s | teléfono %s | anuncio %s", d.inicializado ? "iniciada" : "NO iniciada",
       d.gattListo ? "configurado" : "incompleto", d.conectado ? "conectado" : "sin conexión",
       d.anunciando ? "activo" : "inactivo");
  if (d.largoEstado == 5) {
    char bateria[12] = "sin dato";
    if (d.estado[0] != 0xFF) snprintf(bateria, sizeof(bateria), "%u %%", d.estado[0]);
    dato("Característica de estado: batería %s | firmware %u.%u.%u | PAIR %s", bateria, d.estado[1],
         d.estado[2], d.estado[3], d.estado[4] & 1 ? "abierta" : "cerrada");
  }
  dato("Reanudar anuncio: %s | lectura de la app pendiente: %s", d.reanudando ? "sí" : "no",
       d.lecturaPendiente ? "sí" : "no");
  hexadecimal("estado (batería, versión mayor/menor/parche, banderas)", d.estado, d.largoEstado);
  char resumen[96];
  const causas::Veredicto v = juzgarBle(d, resumen, sizeof(resumen));
  veredicto("BLE", v.resultado, v.pista, "%s", resumen);
}

void MonitorSerie::mostrarEstado(const EstadoEquipo &e) {
  mensaje("ESTADO", "Estado del equipo");
  const uint32_t s = millis() / 1000;
  dato("Firmware %u.%u.%u | ID %s | encendido hace %lu h %02lu min %02lu s", FIRMWARE_VERSION_MAYOR,
       FIRMWARE_VERSION_MENOR, FIRMWARE_VERSION_PARCHE, e.id, static_cast<unsigned long>(s / 3600),
       static_cast<unsigned long>(s / 60 % 60), static_cast<unsigned long>(s % 60));
  dato("Último reinicio: %s", e.reinicio);
  dato("CPU %lu MHz | memoria libre %lu KB (mínima desde el arranque %lu KB)", static_cast<unsigned long>(e.cpuMhz),
       static_cast<unsigned long>(e.heapLibre / 1024), static_cast<unsigned long>(e.heapMinimo / 1024));
  if (e.bateria.valida)
    dato("Batería: %.2f V, %u %%%s (última lectura periódica)", e.bateria.voltios, e.bateria.porcentaje,
         e.bateria.baja ? ", BAJA" : "");
  else dato("Batería: sin dato (%.2f V en IO34 × 2)", e.bateria.voltios);
  if (!e.bmePresente) dato("Ambiente: sensor no detectado (6 o 9 para revisarlo)");
  else dato("Ambiente: %s en 0x%02X", e.bmeHumedad ? "BME280" : "BMP280 sin humedad", e.bmeDireccion);
  char pair[40] = "cerrada";
  if (e.pairRestanteMs) snprintf(pair, sizeof(pair), "abierta, cierra en %lu s",
                                 static_cast<unsigned long>((e.pairRestanteMs + 999) / 1000));
  dato("Bluetooth: %s | conexiones desde el arranque: %u | PAIR %s",
       !e.ble.inicializado ? "NO iniciado" : e.ble.conectado ? "teléfono conectado" :
       e.ble.anunciando ? "anunciando" : "sin anuncio", e.conexionesBle, pair);
  if (e.ultimaLecturaApp)
    dato("Lecturas pedidas por la app: %u (%u con suelo válido) | última hace %lu s: %s", e.lecturasApp,
         e.lecturasAppConSuelo, static_cast<unsigned long>((millis() - e.ultimaLecturaAppMs) / 1000),
         e.ultimaLecturaApp);
  else dato("Lecturas pedidas por la app: ninguna desde el arranque");
  // Fallos Modbus acumulados, en el orden de modbus::Fallo; sólo los que ocurrieron.
  char fallos[160] = "";
  size_t k = 0;
  uint32_t total = 0;
  modbus::Fallo masFrecuente = modbus::Fallo::Ninguno;
  uint16_t maximo = 0;
  for (uint8_t i = 1; e.sonda && i <= uint8_t(modbus::Fallo::Cancelada); ++i) {
    const modbus::Fallo f = modbus::Fallo(i);
    const uint16_t n = e.sonda->fallosAcumulados(f);
    if (!n) continue;
    total += n;
    if (n > maximo) { maximo = n; masFrecuente = f; }
    if (k < sizeof(fallos)) {
      const int w = snprintf(fallos + k, sizeof(fallos) - k, "%s%s %u", k ? " | " : "", modbus::nombreFallo(f), n);
      if (w > 0) k += size_t(w);
    }
  }
  dato("Fallos Modbus desde el arranque (app y monitor, sin el ensayo 12): %s", total ? fallos : "ninguno");
  if (e.reinicioResultado != Resultado::Ok)
    veredicto("ESTADO", e.reinicioResultado, e.reinicioPista, "último reinicio: %s", e.reinicio);
  else if (!e.ble.inicializado || (!e.ble.anunciando && !e.ble.conectado && !e.ble.reanudando))
    veredicto("ESTADO", Resultado::Falla, {"el anuncio Bluetooth está detenido", "enviar 8 para ver el detalle"},
              "la app no puede encontrar la sonda ahora");
  else if (total)
    veredicto("ESTADO", Resultado::Aviso, causas::modbus(masFrecuente),
              "%lu fallos Modbus desde el arranque; el más frecuente: %s", static_cast<unsigned long>(total),
              modbus::nombreFallo(masFrecuente));
  else if (e.bateria.baja)
    veredicto("ESTADO", Resultado::Aviso, causas::bateria(e.bateria).pista, "batería baja");
  else veredicto("ESTADO", Resultado::Ok, {nullptr, nullptr}, "sin anomalías registradas desde el arranque");
}
