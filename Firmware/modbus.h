// Transporte Modbus RTU genérico. No contiene el mapa ni las escalas de la sonda.
#pragma once

#include <stddef.h>
#include <stdint.h>

namespace modbus {

constexpr uint8_t MAX_REGISTROS = 16;
constexpr size_t MAX_RESPUESTA = 5 + 2 * MAX_REGISTROS;
// Bytes tolerados antes del primero de la trama (ver Fase::Rx): el eco de
// la consulta (8) cuando el transceptor escucha mientras transmite, más
// ruido del bus al cambiar de dirección.
constexpr uint8_t MAX_DESCARTE = 24;

enum class Fallo : uint8_t {
  Ninguno, Configuracion, Puerto, Silencio, Truncada, Sobrante,
  Direccion, Funcion, Cantidad, Crc, Excepcion, Cancelada
};

struct Consulta {
  uint8_t direccion = 0;
  uint8_t funcion = 3;  // lectura de registros 03 o 04, según manual confirmado
  uint16_t inicio = 0;
  uint8_t cantidad = 0;
  uint32_t baudios = 0;
  uint32_t estabilizacionMs = 0;
  uint32_t respuestaMs = 0;
  uint8_t reintentos = 0;
};

// Puerto implementado por el ESP32 o por un doble de pruebas. Todas las
// funciones se llaman desde loop(); transmitir() escribe sólo ocho bytes.
class Puerto {
public:
  virtual ~Puerto() = default;
  virtual bool abrir(uint32_t baudios) = 0;
  virtual void cerrar() = 0;
  virtual void alimentar(bool encendido) = 0;
  virtual void direccionTx(bool transmitir) = 0;
  virtual bool transmitir(const uint8_t *bytes, size_t largo) = 0;
  virtual bool txTerminado() = 0;
  virtual int disponible() = 0;
  virtual int recibir() = 0;
};

uint16_t crc16(const uint8_t *bytes, size_t largo);
bool armarSolicitud(const Consulta &consulta, uint8_t out[8]);
Fallo analizarRespuesta(const Consulta &consulta, const uint8_t *bytes,
                       size_t largo, uint16_t *registros, uint8_t &excepcion);
const char *nombreFallo(Fallo fallo);

class Transporte {
public:
  explicit Transporte(Puerto &puerto) : puerto_(puerto) {}
  bool iniciar(const Consulta &consulta, uint32_t ahora);
  void actualizar(uint32_t ahora);
  void cancelar();
  bool ocupado() const { return fase_ != Fase::Inactivo && fase_ != Fase::Terminado; }
  bool terminado() const { return fase_ == Fase::Terminado; }
  Fallo fallo() const { return fallo_; }
  uint8_t excepcion() const { return excepcion_; }
  const uint16_t *registros() const { return fallo_ == Fallo::Ninguno && terminado() ? registros_ : nullptr; }
  // Diagnóstico del último intento: todos los bytes que llegaron, en orden,
  // incluidos los descartados antes de la trama.
  const uint8_t *crudo() const { return crudo_; }
  size_t largoCrudo() const { return crudos_; }
  uint8_t descartados() const { return descartados_; }
  void limpiar() { if (!ocupado()) fase_ = Fase::Inactivo; }

private:
  enum class Fase : uint8_t { Inactivo, Estabilizando, Tx, Rx, Reintento, Terminado };
  void enviar(uint32_t ahora);
  void fallar(Fallo fallo, uint32_t ahora);
  void terminar(Fallo fallo);
  void vaciarEntrada();
  bool prefijoValido() const;

  Puerto &puerto_;
  Consulta consulta_{};
  Fase fase_ = Fase::Inactivo;
  Fallo fallo_ = Fallo::Ninguno;
  uint8_t excepcion_ = 0;
  uint8_t intentos_ = 0;
  uint8_t respuesta_[MAX_RESPUESTA]{};
  size_t recibidos_ = 0;
  size_t esperados_ = 0;
  uint8_t crudo_[MAX_RESPUESTA + MAX_DESCARTE]{};
  size_t crudos_ = 0;
  uint8_t descartados_ = 0;
  uint16_t registros_[MAX_REGISTROS]{};
  uint32_t faseDesde_ = 0;
  uint32_t inicio_ = 0;
};

}  // namespace modbus
