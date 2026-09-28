// ble_terrasense.cpp

#include "ble_terrasense.h"

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <esp_gap_ble_api.h>

#include "config.h"
#include "identidad.h"

namespace {

BLEServer         *servidor = nullptr;
BLECharacteristic *telemetria = nullptr;
BLECharacteristic *identidadChr = nullptr;
BLECharacteristic *provision = nullptr;
BLECharacteristic *estado = nullptr;

// Compartidas entre la tarea BLE y loop(). Lecturas y escrituras de 32 bits
// son atómicas en el ESP32.
volatile bool     conectado = false;
volatile bool     reanudarAnuncio = false;
volatile bool     nombrePendiente = false;
volatile bool     ventanaActiva = false;
volatile uint32_t ventanaHasta = 0;
volatile bool     solicitudLectura = false;
volatile uint32_t solicitudEn = 0;
volatile uint8_t  resultadoVinculacion = uint8_t(ResultadoVinculacion::Ninguno);
uint32_t          desconectadoEn = 0;

void rechazar(const char *motivo) {
  resultadoVinculacion = uint8_t(ResultadoVinculacion::Rechazado);
  Serial.printf("[PAIR] Código rechazado: %s\n", motivo);
}

String nombreAnunciado() {
  return identidad::provisionada() ? String(TS_NOMBRE_BASE "-") + identidad::codigo() : String(TS_NOMBRE_BASE);
}

bool ventanaVigente(uint32_t ahora) {
  return ventanaActiva && int32_t(ventanaHasta - ahora) > 0;
}

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

void publicarIdentidad() {
  const String codigo = identidad::codigo();
  if (codigo.length() == 0) {
    identidadChr->setValue(nullptr, 0);  // vacío = sonda sin código
  } else {
    identidadChr->setValue(codigo);
  }
}

class CallbacksServidor : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    conectado = true;
    Serial.println("[BLE] Teléfono conectado");
  }
  void onDisconnect(BLEServer *) override {
    conectado = false;
    solicitudLectura = false;
    reanudarAnuncio = true;
    Serial.println("[BLE] Teléfono desconectado");
  }
};

class CallbacksProvision : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *chr) override {
    const String valor = chr->getValue();
    chr->setValue(nullptr, 0);  // la característica no guarda lo escrito

    if (!ventanaVigente(millis())) return rechazar("la ventana de vinculación está cerrada");
    if (identidad::provisionada()) return rechazar("la sonda ya tiene uno");
    if (!identidad::formatoValido(valor)) return rechazar("formato inválido");
    if (!identidad::guardar(valor)) return rechazar("error al guardarlo en NVS");

    publicarIdentidad();
    ventanaActiva = false;  // un código por ventana
    nombrePendiente = true;
    resultadoVinculacion = uint8_t(ResultadoVinculacion::Aceptado);
    Serial.printf("[PAIR] Código %s guardado; ventana cerrada\n", valor.c_str());
  }
};

class CallbacksSuscripcion : public BLEDescriptorCallbacks {
  void onWrite(BLEDescriptor *descriptor) override {
    if (static_cast<BLE2902 *>(descriptor)->getNotifications()) {
      solicitudEn = millis();
      solicitudLectura = true;
      Serial.println("[BLE] Suscripción a telemetría: se armará una trama nueva");
    }
  }
};

}  // namespace

void bleIniciar() {
  BLEDevice::init(nombreAnunciado());
  servidor = BLEDevice::createServer();
  servidor->setCallbacks(new CallbacksServidor());

  BLEService *servicio = servidor->createService(TS_SERVICE_UUID);

  telemetria = servicio->createCharacteristic(TS_TELEMETRY_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  BLE2902 *cccd = new BLE2902();
  cccd->setCallbacks(new CallbacksSuscripcion());
  telemetria->addDescriptor(cccd);

  identidadChr = servicio->createCharacteristic(TS_IDENTITY_UUID, BLECharacteristic::PROPERTY_READ);
  publicarIdentidad();

  provision = servicio->createCharacteristic(TS_PROVISIONING_UUID, BLECharacteristic::PROPERTY_WRITE);
  provision->setCallbacks(new CallbacksProvision());

  estado = servicio->createCharacteristic(TS_STATUS_UUID, BLECharacteristic::PROPERTY_READ);
  bleActualizarEstado(0xFF);  // sin lectura de batería hasta la primera medición del ADC

  servicio->start();
  configurarAnuncio();
  BLEDevice::startAdvertising();
}

void bleActualizar(uint32_t ahora) {
  if (ventanaActiva && !ventanaVigente(ahora)) {
    ventanaActiva = false;
    Serial.println("[PAIR] Ventana de vinculación cerrada por tiempo");
  }

  // El nombre nuevo queda configurado; se emite al reanudar el anuncio.
  if (nombrePendiente) {
    nombrePendiente = false;
    configurarAnuncio();
  }

  // Pequeña pausa tras desconectar para que la pila libere la conexión.
  if (reanudarAnuncio) {
    if (desconectadoEn == 0) desconectadoEn = ahora ? ahora : 1;
    if (ahora - desconectadoEn >= 100) {
      reanudarAnuncio = false;
      desconectadoEn = 0;
      BLEDevice::startAdvertising();
    }
  }
}

bool bleConectado() { return conectado; }

void bleAbrirVentana(uint32_t ahora) {
  ventanaHasta = ahora + PAIR_VENTANA_MS;
  ventanaActiva = true;
}

bool bleVentanaAbierta(uint32_t ahora) { return ventanaVigente(ahora); }

ResultadoVinculacion bleTomarResultadoVinculacion() {
  const auto r = ResultadoVinculacion(resultadoVinculacion);
  resultadoVinculacion = uint8_t(ResultadoVinculacion::Ninguno);
  return r;
}

bool bleTomarSolicitudLectura(uint32_t ahora) {
  if (!solicitudLectura || !conectado) return false;
  if (ahora - solicitudEn < ESPERA_NOTIFICACION_MS) return false;
  solicitudLectura = false;
  return true;
}

bool bleNotificar(const uint8_t *datos, size_t largo) {
  if (!conectado) return false;
  telemetria->setValue(const_cast<uint8_t *>(datos), largo);
  telemetria->notify();
  return true;
}

void bleActualizarEstado(uint8_t bateriaPct) {
  if (!estado) return;
  uint8_t valor[4] = {bateriaPct, FIRMWARE_VERSION_MAYOR, FIRMWARE_VERSION_MENOR, FIRMWARE_VERSION_PARCHE};
  estado->setValue(valor, sizeof(valor));
}
