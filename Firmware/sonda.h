// sonda.h
//
// Adquisición de la sonda de suelo 7 en 1 por RS-485: energiza la sonda (IO5),
// consulta sus registros con el transporte Modbus de modbus.h y los convierte a
// LecturaSuelo. No bloquea el bucle: iniciar() arranca una captura y
// actualizar() la avanza hasta que terminada() es true.
//
// Ante cualquier fallo (silencio, CRC, excepción, conexión perdida) la lectura
// queda inválida y la trama viaja con el centinela del contrato. Nunca reutiliza
// una captura anterior.

#pragma once

#include <Arduino.h>

#include "config.h"
#include "modbus.h"
#include "trama.h"

class Sonda {
public:
  void begin();
  bool iniciar(uint32_t ahora);  // false si ya hay una captura en curso
  void actualizar(uint32_t ahora);
  void cancelar();
  bool ocupada() const {
    return estado_ == Estado::Midiendo || estado_ == Estado::Barrido || estado_ == Estado::Ensayo;
  }
  bool terminada() const { return estado_ == Estado::Terminada; }
  // Entrega el resultado una sola vez y deja la sonda libre para otra captura.
  LecturaSuelo tomarLectura();
  // Bytes del último intento, válido o no (incluye eco y ruido iniciales).
  const uint8_t *crudo() const;
  size_t largoCrudo() const;
  uint8_t descartados() const;
  // Copia de la última respuesta íntegra de la ráfaga, sin eco ni ruido: es la
  // que corresponde a una lectura válida, aunque el último intento fallara.
  const uint8_t *respuestaValida() const { return respuestaValida_; }
  size_t largoRespuestaValida() const { return largoValida_; }
  // Resumen de la última captura, para el veredicto del monitor.
  uint8_t muestrasValidas() const { return muestrasValidas_; }
  uint32_t baudios() const;
  modbus::Fallo ultimoFallo() const { return ultimoFallo_; }
  uint8_t excepcion() const { return excepcion_; }
  // Fallos por tipo (índice modbus::Fallo) de todas las capturas desde el
  // arranque, de la app y del monitor; el ensayo D-14 lleva su propia cuenta.
  uint16_t fallosAcumulados(modbus::Fallo f) const { return fallosAcumulados_[uint8_t(f)]; }
  // Opción 10: barrido incremental y cancelable; no produce una medición.
  bool iniciarBarrido(uint32_t ahora);
  // Opción 12 (ensayo D-14): `total` consultas seguidas con la sonda energizada
  // todo el ensayo y sin reintentos, para contar cada fallo. Imprime el avance
  // y el resumen; no produce una medición ni publica nada.
  bool iniciarEnsayo(uint32_t ahora, uint16_t total);
  bool enEnsayo() const { return estado_ == Estado::Ensayo; }

private:
  enum class Estado : uint8_t { Libre, Midiendo, Terminada, Barrido, Ensayo };
  bool consultar(uint32_t ahora);
  void convertir(const uint16_t *registros);
  void convertirRafaga();
  void finalizarCaptura();
  bool quedaPlazoRafaga(uint32_t ahora) const;
  void actualizarBarrido(uint32_t ahora);
  void resumirBarrido() const;
  bool consultarEnsayo(uint32_t ahora);
  void actualizarEnsayo(uint32_t ahora);
  void resumirEnsayo(uint32_t ahora, bool cancelado);

  struct Ensayo {
    uint16_t total = 0, hechas = 0, correctas = 0, fueraDeRango = 0;
    uint16_t fallos[12] = {};  // por modbus::Fallo
    int32_t primeraFalla = -1;
    uint16_t racha = 0, rachaMaxima = 0;
    uint32_t desde = 0, consultaDesde = 0;
    uint32_t minMs = UINT32_MAX, maxMs = 0, sumaMs = 0;
    uint16_t humMin = UINT16_MAX, humMax = 0, ceMin = UINT16_MAX, ceMax = 0, phMin = UINT16_MAX, phMax = 0;
    int16_t tempMin = INT16_MAX, tempMax = INT16_MIN;
    uint16_t nMin = UINT16_MAX, nMax = 0, pMin = UINT16_MAX, pMax = 0, kMin = UINT16_MAX, kMax = 0;
  };
  Ensayo ensayo_{};

  Estado estado_ = Estado::Libre;
  uint8_t velocidad_ = 0;  // índice en SONDA_BAUDIOS
  uint8_t muestrasTomadas_ = 0;
  uint8_t muestrasValidas_ = 0;
  uint32_t rafagaDesde_ = 0;
  uint16_t rafaga_[SONDA_MUESTRAS_RAFAGA][SONDA_REGISTROS]{};
  uint16_t descartadosRafaga_ = 0;  // eco y ruido sumados de las muestras válidas
  uint8_t respuestaValida_[modbus::MAX_RESPUESTA] = {};
  size_t largoValida_ = 0;
  modbus::Fallo ultimoFallo_ = modbus::Fallo::Ninguno;
  uint8_t excepcion_ = 0;
  uint16_t fallosAcumulados_[12] = {};
  void registrarFallo(modbus::Fallo fallo);
  LecturaSuelo lectura_{};
  uint32_t barridoDesde_ = 0;
  uint8_t pasoBarrido_ = 0;
  bool recibiendoBarrido_ = false;
  uint8_t rxBarrido_[64] = {};
  size_t largoBarrido_ = 0;
  bool excesoBarrido_ = false;
  // Lo que encontró el barrido, para su veredicto final.
  struct ResumenBarrido {
    uint32_t baudiosLectura = 0;    // primera velocidad con lectura válida en SONDA_DIRECCION
    uint32_t baudiosIdentidad = 0;  // primera velocidad que contestó la identidad FF
    uint8_t direccion = 0;          // dirección que contestó la identidad
    bool eco = false;               // volvió el eco de alguna consulta
    bool bytesSinTrama = false;     // llegaron bytes propios sin trama válida
  };
  ResumenBarrido barrido_{};
};
