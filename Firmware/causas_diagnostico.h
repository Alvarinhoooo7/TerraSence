// Veredictos y causas probables del monitor de mantenimiento. Es la tabla de
// fallas de TASK.md llevada al equipo: el técnico la lee en la consola, sin
// abrir el repositorio. Sin dependencias del hardware: se prueba en el
// compilador (tests/test_causas.cpp).
#pragma once
#include <stdint.h>

#include "bateria.h"
#include "modbus.h"
#include "registro.h"
#include "trama.h"

namespace causas {

using registro::Pista;
using registro::Resultado;

// Causa probable y siguiente paso para cada fallo del transporte Modbus.
constexpr Pista modbus(modbus::Fallo f) {
  using F = modbus::Fallo;
  switch (f) {
    case F::Ninguno: return {};
    case F::Configuracion:
      return {"consulta mal armada: dirección, función o cantidad de config.h fuera de rango",
              "revisar SONDA_* en config.h y recompilar"};
    case F::Puerto:
      return {"no se pudo abrir o escribir el UART2 (IO16/IO17)",
              "reiniciar el equipo; si se repite, reportarlo con esta salida"};
    case F::Silencio:
      return {"la sonda no contesta: sin 5 V o sin GND común, A/B invertidos, RO/DI cruzados,\n"
              "RTS (IO4) suelto, o sonda con otra dirección o velocidad",
              "medir 5 V en el cable café; enviar 10 para ver los bytes crudos a 2400/4800/9600"};
    case F::Truncada:
      return {"llegó sólo parte de la respuesta: bytes perdidos al conmutar RTS o cable intermitente",
              "revisar RTS (IO4), GND común y empalmes; 12 mide la tasa de error"};
    case F::Sobrante:
      return {"llegaron bytes de más: ruido en el bus o más de un equipo respondiendo",
              "polarizar A/B (R12/R13, 4,7 kΩ) y dejar una sola sonda en el bus"};
    case F::Direccion:
      return {"respondió un equipo con otra dirección Modbus",
              "enviar 10: la consulta de identidad FF muestra la dirección real"};
    case F::Funcion:
      return {"la respuesta trae otra función Modbus: otro modelo o trama alterada",
              "confirmar el modelo de la sonda; v muestra el HEX recibido"};
    case F::Cantidad:
      return {"la sonda entregó otra cantidad de datos: otro modelo o mapa de registros",
              "comparar el modelo con el manual y SONDA_REGISTROS de config.h"};
    case F::Crc:
      return {"la trama llegó con bits alterados: ruido, bus sin polarizar o GND no común",
              "polarizar A/B (R12/R13), unir los GND y revisar el empalme; 12 mide la tasa"};
    case F::Excepcion:
      return {"la sonda contesta pero rechaza la consulta (registro o cantidad no válidos)",
              "revisar SONDA_REGISTRO_INICIO y SONDA_REGISTROS contra el manual"};
    case F::Cancelada:
      return {"la prueba se canceló (x, q, Bluetooth o PAIR)", "repetir con el equipo en reposo"};
  }
  return {};
}

// Primer dato de la sonda fuera del rango del manual (el mismo criterio de
// sueloPublicable); nullptr si todos están dentro.
constexpr const char *campoFueraDeRango(const LecturaSuelo &s) {
  if (s.humedadX10 > 1000) return "humedad";
  if (s.temperaturaX10 < -400 || s.temperaturaX10 > 800) return "temperatura";
  if (s.conductividad > 20000) return "CE";
  if (s.phX10 > 140) return "pH";
  if (s.nitrogeno > 1999) return "N";
  if (s.fosforo > 1999) return "P";
  if (s.potasio > 1999) return "K";
  return nullptr;
}

constexpr Pista FUERA_DE_RANGO = {
    "valor imposible según el manual: escala distinta (p. ej. pH × 100) o trama corrupta",
    "comparar «[SONDA] Registros crudos» con las escalas de config.h"};

struct Veredicto {
  Resultado resultado = Resultado::Ok;
  Pista pista{};
};

constexpr Veredicto bateria(const EstadoBateria &b) {
  if (b.valida && b.baja)
    return {Resultado::Aviso, {"la celda está bajo 3,40 V",
                               "cargar antes de medir en terreno; el porcentaje aún no está calibrado"}};
  if (b.valida) return {};
  if (b.voltios == b.voltios && b.voltios < BATERIA_PRESENTE_MIN_V)  // finita y bajo el umbral
    return {Resultado::NoDisponible,
            {"sin celda, descarga profunda o divisor desconectado",
             "en banco sin batería, IO34 a GND; con batería, medirla con un multímetro"}};
  return {Resultado::Falla, {"IO34 flotante o divisor distinto de 100k/100k (debe ver la mitad de la celda)",
                             "medir IO34 y la celda con un multímetro"}};
}

// Bus I2C al terminar el recorrido de la opción 9. idBme: registro 0xD0 leído
// en 0x76/0x77 (0 si nadie respondió ahí; 0xFF si respondió y no se pudo leer).
constexpr Veredicto busI2C(uint8_t encontrados, uint8_t errores, uint8_t idBme) {
  if (!encontrados)
    return {Resultado::Falla, {"sin 3,3 V o GND en el módulo, SDA/SCL invertidos o sin pull-up de 4,7 kΩ",
                               "medir 3,3 V en el módulo y continuidad SDA→IO21 y SCL→IO22"}};
  if (idBme == 0)
    return {Resultado::Aviso, {"hay dispositivos, pero ninguno en 0x76/0x77: SDO sin conectar u otro sensor",
                               "SDO a GND (0x76) o a VCC (0x77); en módulos de 6 pines, CSB a VCC"}};
  if (idBme == 0x58)
    return {Resultado::Aviso, {"el módulo trae un BMP280: mide temperatura y presión, no humedad",
                               "reemplazarlo por un BME280 si se necesita la humedad del aire"}};
  if (idBme != 0x60)
    return {Resultado::Aviso, {"en 0x76/0x77 responde un chip que no es BME280 (60) ni BMP280 (58)",
                               "confirmar el modelo impreso en el módulo"}};
  if (errores)
    return {Resultado::Aviso, {"el bus tuvo errores distintos de «nadie responde»: pull-up débil, cable largo o ruido",
                               "acortar el cable y revisar los pull-up; repetir 9"}};
  return {};
}

// Sensor ambiental: presente/humedad según la detección; t, p y h, si cada
// magnitud quedó dentro del rango físico (las que no, viajan sin dato).
constexpr Veredicto ambiente(bool presente, bool humedad, bool t, bool p, bool h) {
  if (!presente)
    return {Resultado::Falla,
            {"sin 3,3 V o GND, SDA (IO21)/SCL (IO22) invertidos, sin pull-up, o CSB sin VCC (queda en SPI)",
             "enviar 9 para recorrer el bus I2C"}};
  if (!t || !p || (humedad && !h))
    return {Resultado::Falla, {"lectura corrupta o sensor dañado", "repetir 6; si se repite, cambiar el módulo"}};
  if (!humedad) return {Resultado::Aviso, busI2C(1, 0, 0x58).pista};
  return {};
}

// Captura de la sonda: campoFuera es el de campoFueraDeRango (nullptr si no hay).
constexpr Veredicto sonda(bool valida, const char *campoFuera, uint8_t validas, uint8_t total,
                          modbus::Fallo fallo) {
  if (!valida) return {Resultado::Falla, modbus(fallo)};
  if (campoFuera) return {Resultado::Falla, FUERA_DE_RANGO};
  if (validas < total) return {Resultado::Aviso, modbus(fallo)};
  return {};
}

constexpr Veredicto bluetooth(bool iniciada, bool gattCompleto, bool conectado, bool anunciando, bool reanudando) {
  if (!iniciada)
    return {Resultado::Falla, {"falta memoria o Bluedroid falló al arrancar", "reiniciar; e muestra la memoria libre"}};
  if (!gattCompleto)
    return {Resultado::Falla, {"alguna característica GATT no se creó",
                               "reiniciar; si se repite, reportarlo con esta salida"}};
  if (conectado) return {};
  if (anunciando) return {Resultado::Ok, {nullptr, "confirmar con la app o nRF Connect que la sonda aparece"}};
  if (reanudando)
    return {Resultado::Aviso, {"la pila aún libera la conexión anterior", "repetir 8 en unos segundos"}};
  return {Resultado::Falla, {"el anuncio se detuvo y no se reanudó", "reiniciar el equipo"}};
}

}  // namespace causas
