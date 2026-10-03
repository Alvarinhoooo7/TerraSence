#include "modbus.h"

namespace modbus {

uint16_t crc16(const uint8_t *bytes, size_t largo) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < largo; ++i) {
    crc ^= bytes[i];
    for (uint8_t bit = 0; bit < 8; ++bit)
      crc = (crc & 1) ? uint16_t((crc >> 1) ^ 0xA001) : uint16_t(crc >> 1);
  }
  return crc;
}

bool armarSolicitud(const Consulta &c, uint8_t out[8]) {
  if (!out || c.direccion < 1 || c.direccion > 247 ||
      (c.funcion != 3 && c.funcion != 4) ||
      c.cantidad < 1 || c.cantidad > MAX_REGISTROS ||
      uint32_t(c.inicio) + c.cantidad > 65536UL) return false;
  out[0] = c.direccion;
  out[1] = c.funcion;
  out[2] = uint8_t(c.inicio >> 8);
  out[3] = uint8_t(c.inicio);
  out[4] = 0;
  out[5] = c.cantidad;
  const uint16_t crc = crc16(out, 6);
  out[6] = uint8_t(crc);
  out[7] = uint8_t(crc >> 8);
  return true;
}

Fallo analizarRespuesta(const Consulta &c, const uint8_t *bytes, size_t largo,
                       uint16_t *registros, uint8_t &excepcion) {
  excepcion = 0;
  if (!bytes || !registros || largo < 5) return Fallo::Truncada;
  if (bytes[0] != c.direccion) return Fallo::Direccion;
  if (bytes[1] != c.funcion && bytes[1] != uint8_t(c.funcion | 0x80)) return Fallo::Funcion;
  const bool esExcepcion = bytes[1] & 0x80;
  const size_t esperado = esExcepcion ? 5 : size_t(5 + c.cantidad * 2);
  if (largo < esperado) return Fallo::Truncada;
  if (largo > esperado) return Fallo::Sobrante;
  if (!esExcepcion && bytes[2] != c.cantidad * 2) return Fallo::Cantidad;
  const uint16_t recibido = uint16_t(bytes[largo - 2]) | (uint16_t(bytes[largo - 1]) << 8);
  if (crc16(bytes, largo - 2) != recibido) return Fallo::Crc;
  if (esExcepcion) { excepcion = bytes[2]; return Fallo::Excepcion; }
  for (uint8_t i = 0; i < c.cantidad; ++i)
    registros[i] = uint16_t(bytes[3 + 2 * i] << 8) | bytes[4 + 2 * i];
  return Fallo::Ninguno;
}

const char *nombreFallo(Fallo fallo) {
  switch (fallo) {
    case Fallo::Ninguno: return "ninguno";
    case Fallo::Configuracion: return "configuracion";
    case Fallo::Puerto: return "puerto";
    case Fallo::Silencio: return "sin respuesta";
    case Fallo::Truncada: return "respuesta truncada";
    case Fallo::Sobrante: return "respuesta sobrante";
    case Fallo::Direccion: return "direccion";
    case Fallo::Funcion: return "funcion";
    case Fallo::Cantidad: return "cantidad";
    case Fallo::Crc: return "CRC";
    case Fallo::Excepcion: return "excepcion";
    case Fallo::Cancelada: return "cancelada";
  }
  return "desconocido";
}

bool Transporte::iniciar(const Consulta &c, uint32_t ahora) {
  if (ocupado()) return false;
  uint8_t solicitud[8];
  if (!armarSolicitud(c, solicitud) || c.baudios < 1200 || c.baudios > 115200 ||
      c.respuestaMs < 10 || c.respuestaMs > 2000 ||
      c.estabilizacionMs > 5000 || c.reintentos > 2) {
    fase_ = Fase::Terminado;
    fallo_ = Fallo::Configuracion;
    return false;
  }
  consulta_ = c;
  fallo_ = Fallo::Ninguno;
  excepcion_ = 0;
  intentos_ = 0;
  recibidos_ = 0;
  inicio_ = faseDesde_ = ahora;
  puerto_.direccionTx(false);
  puerto_.alimentar(true);
  if (!puerto_.abrir(c.baudios)) { terminar(Fallo::Puerto); return false; }
  fase_ = Fase::Estabilizando;
  return true;
}

void Transporte::vaciarEntrada() {
  // Límite de trabajo por iteración; una inundación de bytes es fallo del bus.
  for (unsigned i = 0; i < 128 && puerto_.disponible() > 0; ++i) puerto_.recibir();
}

void Transporte::enviar(uint32_t ahora) {
  vaciarEntrada();
  if (puerto_.disponible() > 0) { terminar(Fallo::Sobrante); return; }
  uint8_t solicitud[8];
  if (!armarSolicitud(consulta_, solicitud)) { terminar(Fallo::Configuracion); return; }
  recibidos_ = 0;
  esperados_ = 0;
  crudos_ = 0;
  descartados_ = 0;
  puerto_.direccionTx(true);
  if (!puerto_.transmitir(solicitud, sizeof(solicitud))) { terminar(Fallo::Puerto); return; }
  faseDesde_ = ahora;
  fase_ = Fase::Tx;
}

void Transporte::terminar(Fallo fallo) {
  puerto_.direccionTx(false);
  puerto_.cerrar();
  puerto_.alimentar(false);
  fallo_ = fallo;
  fase_ = Fase::Terminado;
}

void Transporte::fallar(Fallo fallo, uint32_t ahora) {
  puerto_.direccionTx(false);
  if (fallo == Fallo::Excepcion || intentos_ >= consulta_.reintentos) {
    terminar(fallo);
    return;
  }
  ++intentos_;
  faseDesde_ = ahora;
  fase_ = Fase::Reintento;
}

void Transporte::actualizar(uint32_t ahora) {
  if (!ocupado()) return;
  // Cota total adicional ante un reloj o periférico que no progresa.
  const uint32_t maximo = consulta_.estabilizacionMs +
      uint32_t(consulta_.reintentos + 1) * (consulta_.respuestaMs + 150) + 100;
  if (ahora - inicio_ > maximo) { terminar(recibidos_ ? Fallo::Truncada : Fallo::Silencio); return; }
  switch (fase_) {
    case Fase::Estabilizando:
      if (ahora - faseDesde_ >= consulta_.estabilizacionMs) enviar(ahora);
      return;
    case Fase::Tx:
      if (puerto_.txTerminado()) {
        puerto_.direccionTx(false);
        faseDesde_ = ahora;
        fase_ = Fase::Rx;
      } else if (ahora - faseDesde_ > 100) fallar(Fallo::Puerto, ahora);
      return;
    case Fase::Rx: {
      for (unsigned i = 0; i < 64 && puerto_.disponible() > 0; ++i) {
        const int valor = puerto_.recibir();
        if (valor < 0) break;
        if (crudos_ < sizeof(crudo_)) crudo_[crudos_++] = uint8_t(valor);
        // Al pasar a recepción, un bus RS-485 sin polarización queda flotando y
        // el transceptor puede entregar un byte espurio. Antes del primer byte
        // de la trama se descartan hasta MAX_DESCARTE que no sean la dirección
        // esperada; el CRC sigue validando la trama completa.
        if (recibidos_ == 0 && uint8_t(valor) != consulta_.direccion) {
          if (++descartados_ > MAX_DESCARTE) { fallar(Fallo::Direccion, ahora); return; }
          continue;
        }
        if (recibidos_ >= MAX_RESPUESTA || (esperados_ && recibidos_ >= esperados_)) {
          fallar(Fallo::Sobrante, ahora); return;
        }
        respuesta_[recibidos_++] = uint8_t(valor);
        if (recibidos_ == 2) {
          if (respuesta_[0] != consulta_.direccion) { fallar(Fallo::Direccion, ahora); return; }
          if (respuesta_[1] != consulta_.funcion &&
              respuesta_[1] != uint8_t(consulta_.funcion | 0x80)) {
            fallar(Fallo::Funcion, ahora); return;
          }
          if (respuesta_[1] & 0x80) esperados_ = 5;
        }
        if (recibidos_ == 3 && !esperados_) {
          if (respuesta_[2] != consulta_.cantidad * 2) { fallar(Fallo::Cantidad, ahora); return; }
          esperados_ = 5 + respuesta_[2];
        }
      }
      if (esperados_ && recibidos_ == esperados_) {
        if (puerto_.disponible() > 0) { fallar(Fallo::Sobrante, ahora); return; }
        const Fallo resultado = analizarRespuesta(consulta_, respuesta_, recibidos_, registros_, excepcion_);
        if (resultado == Fallo::Ninguno) terminar(Fallo::Ninguno);
        else fallar(resultado, ahora);
      } else if (ahora - faseDesde_ >= consulta_.respuestaMs) {
        // Bytes descartados sin trama detrás son ruido del bus, no una respuesta:
        // cuentan como silencio, para que se pruebe la otra velocidad.
        fallar(recibidos_ ? Fallo::Truncada : Fallo::Silencio, ahora);
      }
      return;
    }
    case Fase::Reintento:
      if (ahora - faseDesde_ >= 20) enviar(ahora);
      return;
    case Fase::Inactivo: case Fase::Terminado: return;
  }
}

void Transporte::cancelar() {
  if (ocupado()) terminar(Fallo::Cancelada);
}

}  // namespace modbus
