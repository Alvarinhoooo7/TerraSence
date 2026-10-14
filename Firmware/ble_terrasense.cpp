// ble_terrasense.cpp

#include "ble_terrasense.h"

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <esp_gap_ble_api.h>
#include <mutex>

#include "config.h"
#include "identidad.h"

namespace {

BLEServer         *servidor = nullptr;
BLECharacteristic *telemetria = nullptr;
BLECharacteristic *identidadChr = nullptr;
BLECharacteristic *confirmacion = nullptr;
BLECharacteristic *estado = nullptr;

// Una transición incluye varias variables: volatile no protege leer y consumir
// una solicitud frente a los callbacks de Bluedroid en la otra tarea.
std::mutex mutexEstado;
using Guardia = std::lock_guard<std::mutex>;
bool     conectado = false;
bool     suscrito = false;
bool     anunciando = false;
bool     reanudarAnuncio = false;
bool     ventanaActiva = false;
uint32_t ventanaHasta = 0;
bool     solicitudLectura = false;
uint32_t solicitudEn = 0;
uint32_t sesionLectura = 0;
uint8_t  resultadoVinculacion = uint8_t(ResultadoVinculacion::Ninguno);
uint8_t  bateriaPublicada = 0xFF;
uint32_t          desconectadoEn = 0;
bool notificacionEncolada = false;  // sólo durante notify(), en la tarea que la llama

void invalidarLectura() {
  solicitudLectura = false;
  if (++sesionLectura == 0) ++sesionLectura;  // 0 significa que no hay captura
}

// Bluedroid no expone isAdvertising(); confirmar el anuncio con sus eventos
// reales, no por el mero hecho de haber solicitado startAdvertising().
void observarGap(esp_gap_ble_cb_event_t evento, esp_ble_gap_cb_param_t *param) {
  Guardia guardia(mutexEstado);
  if (evento == ESP_GAP_BLE_ADV_START_COMPLETE_EVT)
    anunciando = param->adv_start_cmpl.status == ESP_BT_STATUS_SUCCESS;
  else if (evento == ESP_GAP_BLE_ADV_STOP_COMPLETE_EVT &&
           param->adv_stop_cmpl.status == ESP_BT_STATUS_SUCCESS)
    anunciando = false;
}

void rechazar(const char *motivo) {
  resultadoVinculacion = uint8_t(ResultadoVinculacion::Rechazado);
  Serial.printf("[PAIR] Vinculación rechazada: %s\n", motivo);
}

// El ID sale de la MAC y siempre existe: el nombre lo lleva desde el arranque.
String nombreAnunciado() { return String(TS_NOMBRE_BASE "-") + identidad::codigo(); }

bool ventanaVigente(uint32_t ahora) {
  return ventanaActiva && int32_t(ventanaHasta - ahora) > 0;
}

// Estado (5 bytes): batería, versión mayor/menor/parche y banderas. Bit 0 de
// las banderas = ventana PAIR abierta: la app lo exige antes de registrar la
// sonda, así vincular requiere tenerla en la mano.
void armarEstado(uint8_t valor[5]) {
  const uint8_t banderas = ventanaVigente(millis()) ? 0x01 : 0x00;
  valor[0] = bateriaPublicada;
  valor[1] = FIRMWARE_VERSION_MAYOR;
  valor[2] = FIRMWARE_VERSION_MENOR;
  valor[3] = FIRMWARE_VERSION_PARCHE;
  valor[4] = banderas;
}

// Tras iniciar GATT, sólo onRead modifica este String, siempre en Bluedroid.
// loop() actualiza el modelo protegido; no escribe simultáneamente el valor GATT.
void publicarEstado() {
  if (!estado) return;
  uint8_t valor[5];
  armarEstado(valor);
  estado->setValue(valor, sizeof(valor));
}

class CallbacksEstado : public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic *) override {
    Guardia guardia(mutexEstado);
    publicarEstado();
  }
};

class CallbacksTelemetria : public BLECharacteristicCallbacks {
  void onStatus(BLECharacteristic *, Status status, uint32_t) override {
    // Arduino invoca este callback sincrónicamente desde notify().
    notificacionEncolada = status == Status::SUCCESS_NOTIFY;
  }
};

void configurarAnuncio() {
  const String nombre = nombreAnunciado();
  esp_ble_gap_set_device_name(nombre.c_str());

  BLEAdvertising *anuncio = BLEDevice::getAdvertising();
  BLEAdvertisementData principal;
  principal.setFlags(ESP_BLE_ADV_FLAG_GEN_DISC | ESP_BLE_ADV_FLAG_BREDR_NOT_SPT);
  principal.setCompleteServices(BLEUUID(TS_SERVICE_UUID));  // 3 + 18 bytes
  BLEAdvertisementData respuesta;
  respuesta.setName(nombre);  // hasta 2 + 26 bytes
  anuncio->setAdvertisementData(principal);
  anuncio->setScanResponseData(respuesta);
  Serial.printf("[BLE] Anunciando como \"%s\"\n", nombre.c_str());
}

class CallbacksServidor : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    Guardia guardia(mutexEstado);
    invalidarLectura();
    suscrito = false;
    conectado = true;
    anunciando = false;
    reanudarAnuncio = false;
    desconectadoEn = 0;
    Serial.println("[BLE] Teléfono conectado");
  }
  void onDisconnect(BLEServer *) override {
    Guardia guardia(mutexEstado);
    conectado = false;
    suscrito = false;
    invalidarLectura();
    reanudarAnuncio = true;
    desconectadoEn = millis();
    Serial.println("[BLE] Teléfono desconectado");
  }
};

// Confirmación de vinculación: tras registrar la sonda en Supabase, la app
// escribe su ID. Se acepta sólo con la ventana PAIR abierta y si coincide con
// el de esta sonda; entonces se cierra la ventana y se avisa con verde y
// buzzer. No cambia ni guarda nada: el ID es el de la MAC.
class CallbacksConfirmacion : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *chr) override {
    const String valor = chr->getValue();
    chr->setValue(nullptr, 0);  // la característica no guarda lo escrito

    Guardia guardia(mutexEstado);
    if (!ventanaVigente(millis())) return rechazar("la ventana de vinculación está cerrada");
    if (valor != identidad::codigo()) return rechazar("el ID no es el de esta sonda");

    ventanaActiva = false;
    resultadoVinculacion = uint8_t(ResultadoVinculacion::Aceptado);
    Serial.printf("[PAIR] Vinculación confirmada (%s); ventana cerrada\n", valor.c_str());
  }
};

class CallbacksSuscripcion : public BLEDescriptorCallbacks {
  void onWrite(BLEDescriptor *descriptor) override {
    Guardia guardia(mutexEstado);
    invalidarLectura();
    suscrito = conectado && static_cast<BLE2902 *>(descriptor)->getNotifications();
    if (suscrito) {
      solicitudEn = millis();
      solicitudLectura = true;
      Serial.println("[BLE] Suscripción a telemetría: se armará una trama nueva");
    }
  }
};

}  // namespace

void bleIniciar() {
  BLEDevice::init(nombreAnunciado());
  BLEDevice::setCustomGapHandler(observarGap);
  servidor = BLEDevice::createServer();
  servidor->setCallbacks(new CallbacksServidor());

  BLEService *servicio = servidor->createService(TS_SERVICE_UUID);

  telemetria = servicio->createCharacteristic(TS_TELEMETRY_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  telemetria->setCallbacks(new CallbacksTelemetria());
  BLE2902 *cccd = new BLE2902();
  cccd->setCallbacks(new CallbacksSuscripcion());
  telemetria->addDescriptor(cccd);

  identidadChr = servicio->createCharacteristic(TS_IDENTITY_UUID, BLECharacteristic::PROPERTY_READ);
  identidadChr->setValue(identidad::codigo());

  confirmacion = servicio->createCharacteristic(TS_PROVISIONING_UUID, BLECharacteristic::PROPERTY_WRITE);
  confirmacion->setCallbacks(new CallbacksConfirmacion());

  estado = servicio->createCharacteristic(TS_STATUS_UUID, BLECharacteristic::PROPERTY_READ);
  estado->setCallbacks(new CallbacksEstado());
  publicarEstado();  // batería 0xFF hasta la primera medición del ADC

  servicio->start();
  configurarAnuncio();
  BLEDevice::startAdvertising();
}

void bleActualizar(uint32_t ahora) {
  bool iniciarAnuncio = false;
  {
    Guardia guardia(mutexEstado);
    if (ventanaActiva && !ventanaVigente(ahora)) {
      ventanaActiva = false;
      Serial.println("[PAIR] Ventana de vinculación cerrada por tiempo");
    }

    // Pequeña pausa tras desconectar para que la pila libere la conexión.
    if (reanudarAnuncio && !conectado && int32_t(ahora - desconectadoEn) >= 100) {
      reanudarAnuncio = false;
      desconectadoEn = 0;
      iniciarAnuncio = true;
    }
  }
  // startAdvertising() puede esperar eventos GAP: nunca esperar con el mutex
  // que necesitan sus callbacks. Sin anuncio no puede entrar otra conexión.
  if (iniciarAnuncio) BLEDevice::startAdvertising();
}

bool bleConectado() { Guardia guardia(mutexEstado); return conectado; }

void bleAbrirVentana(uint32_t ahora) {
  Guardia guardia(mutexEstado);
  ventanaHasta = ahora + PAIR_VENTANA_MS;
  ventanaActiva = true;
}

bool bleVentanaAbierta(uint32_t ahora) { Guardia guardia(mutexEstado); return ventanaVigente(ahora); }

ResultadoVinculacion bleTomarResultadoVinculacion() {
  Guardia guardia(mutexEstado);
  const auto r = ResultadoVinculacion(resultadoVinculacion);
  resultadoVinculacion = uint8_t(ResultadoVinculacion::Ninguno);
  return r;
}

bool bleTomarSolicitudLectura(uint32_t ahora, uint32_t &sesion) {
  Guardia guardia(mutexEstado);
  if (!solicitudLectura || !conectado || !suscrito) return false;
  // El callback puede haber registrado un instante posterior al inicio de loop().
  if (int32_t(ahora - solicitudEn) < int32_t(ESPERA_NOTIFICACION_MS)) return false;
  solicitudLectura = false;
  sesion = sesionLectura;
  return true;
}

bool bleSesionLecturaVigente(uint32_t sesion) {
  Guardia guardia(mutexEstado);
  return conectado && suscrito && sesion != 0 && sesion == sesionLectura;
}

bool bleNotificar(const uint8_t *datos, size_t largo, uint32_t sesion) {
  Guardia guardia(mutexEstado);
  if (!conectado || !suscrito || sesion == 0 || sesion != sesionLectura) return false;
  // En Arduino-ESP32 3.3.0, notify(true) encola sin esperar confirmación y sus
  // callbacks son síncronos: el nuestro no toma mutex. Mantener la exclusión
  // hasta encolar impide cambiar de sesión entre la validación y el envío.
  // setValue sólo toma su semáforo local; telemetría tiene un único escritor.
  notificacionEncolada = false;
  telemetria->setValue(const_cast<uint8_t *>(datos), largo);
  telemetria->notify();
  return notificacionEncolada;
}

void bleActualizarEstado(uint8_t bateriaPct) {
  Guardia guardia(mutexEstado);
  bateriaPublicada = bateriaPct;
}

DiagnosticoBle bleDiagnostico() {
  Guardia guardia(mutexEstado);
  DiagnosticoBle d;
  d.inicializado = BLEDevice::getInitialized();
  d.gattListo = servidor && telemetria && identidadChr && confirmacion && estado;
  d.conectado = conectado;
  d.anunciando = anunciando;
  d.reanudando = reanudarAnuncio;
  d.lecturaPendiente = solicitudLectura;
  if (estado) {
    armarEstado(d.estado);
    d.largoEstado = sizeof(d.estado);
  }
  return d;
}
