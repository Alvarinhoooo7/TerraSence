// bme280.cpp

#include "bme280.h"

namespace {
constexpr uint8_t REG_CHIP_ID   = 0xD0;
constexpr uint8_t CHIP_ID       = 0x60;
constexpr uint8_t CHIP_ID_BMP   = 0x58;  // BMP280: temperatura y presión, sin humedad
constexpr uint8_t REG_CTRL_HUM  = 0xF2;
constexpr uint8_t REG_STATUS    = 0xF3;
constexpr uint8_t REG_CTRL_MEAS = 0xF4;
constexpr uint8_t REG_CONFIG    = 0xF5;
constexpr uint8_t REG_DATOS     = 0xF7;  // 8 bytes: presión, temperatura, humedad
constexpr uint8_t REG_CALIB_TP  = 0x88;  // 26 bytes
constexpr uint8_t REG_CALIB_H   = 0xE1;  // 7 bytes

// Sobremuestreo ×1 en las tres magnitudes y modo forzado.
constexpr uint8_t CTRL_HUM_X1        = 0x01;
constexpr uint8_t CTRL_MEAS_FORZADO  = (1 << 5) | (1 << 2) | 0x01;
constexpr uint32_t MEDICION_MAX_MS   = 50;  // ~10 ms típicos con ×1

// Valores crudos que el sensor entrega cuando la magnitud no se midió.
constexpr int32_t CRUDO_20_OMITIDO = 0x80000;
constexpr int32_t CRUDO_16_OMITIDO = 0x8000;
}  // namespace

void Bme280::begin(TwoWire &bus) {
  bus_ = &bus;
  detectar();
}

bool Bme280::escribir(uint8_t registro, uint8_t valor) {
  bus_->beginTransmission(direccion_);
  bus_->write(registro);
  bus_->write(valor);
  return bus_->endTransmission() == 0;
}

bool Bme280::leerBloque(uint8_t registro, uint8_t *destino, size_t largo) {
  bus_->beginTransmission(direccion_);
  bus_->write(registro);
  if (bus_->endTransmission(false) != 0) return false;
  if (bus_->requestFrom(direccion_, uint8_t(largo)) != largo) return false;
  for (size_t i = 0; i < largo; i++) destino[i] = bus_->read();
  return true;
}

bool Bme280::detectar() {
  direccion_ = direccionAjena_ = idAjeno_ = 0;
  humedad_ = false;
  if (!bus_) return false;
  for (uint8_t candidata : {uint8_t(0x76), uint8_t(0x77)}) {
    direccion_ = candidata;
    uint8_t id = 0;
    if (!leerBloque(REG_CHIP_ID, &id, 1)) continue;
    if (id != CHIP_ID && id != CHIP_ID_BMP) {
      direccionAjena_ = candidata;
      idAjeno_ = id;
      continue;
    }
    humedad_ = id == CHIP_ID;
    if (leerCalibracion() && escribir(REG_CONFIG, 0x00)) return true;
  }
  direccion_ = 0;
  humedad_ = false;
  return false;
}

bool Bme280::leerCalibracion() {
  uint8_t c[26];
  uint8_t h[7] = {};
  if (!leerBloque(REG_CALIB_TP, c, sizeof(c))) return false;
  if (humedad_ && !leerBloque(REG_CALIB_H, h, sizeof(h))) return false;

  auto u16 = [&](size_t i) { return uint16_t(c[i] | (c[i + 1] << 8)); };  // little-endian
  auto s16 = [&](size_t i) { return int16_t(u16(i)); };
  T1_ = u16(0);  T2_ = s16(2);  T3_ = s16(4);
  P1_ = u16(6);  P2_ = s16(8);  P3_ = s16(10); P4_ = s16(12); P5_ = s16(14);
  P6_ = s16(16); P7_ = s16(18); P8_ = s16(20); P9_ = s16(22);
  H1_ = c[25];
  H2_ = int16_t(h[0] | (h[1] << 8));
  H3_ = h[2];
  H4_ = int16_t((int8_t(h[3]) * 16) | (h[4] & 0x0F));
  H5_ = int16_t((int8_t(h[5]) * 16) | (h[4] >> 4));
  H6_ = int8_t(h[6]);
  return true;
}

LecturaAmbiente Bme280::leer() {
  LecturaAmbiente r;
  // Si no estaba al arrancar se reintenta: permite conectarlo sin reiniciar.
  if (!presente() && !detectar()) return r;

  if ((humedad_ && !escribir(REG_CTRL_HUM, CTRL_HUM_X1)) || !escribir(REG_CTRL_MEAS, CTRL_MEAS_FORZADO)) {
    direccion_ = 0;
    return r;
  }

  const uint32_t inicio = millis();
  uint8_t estado = 0;
  do {
    delay(2);
    if (!leerBloque(REG_STATUS, &estado, 1)) { direccion_ = 0; return r; }
  } while ((estado & 0x08) && millis() - inicio < MEDICION_MAX_MS);
  if (estado & 0x08) return r;  // no terminó a tiempo: sin dato

  uint8_t d[8] = {0, 0, 0, 0, 0, 0, 0x80, 0x00};  // sin humedad: crudo «omitido»
  if (!leerBloque(REG_DATOS, d, humedad_ ? 8 : 6)) { direccion_ = 0; return r; }
  const int32_t adcP = (int32_t(d[0]) << 12) | (int32_t(d[1]) << 4) | (d[2] >> 4);
  const int32_t adcT = (int32_t(d[3]) << 12) | (int32_t(d[4]) << 4) | (d[5] >> 4);
  const int32_t adcH = (int32_t(d[6]) << 8) | d[7];

  // Sin temperatura no se pueden compensar presión ni humedad.
  if (adcT == CRUDO_20_OMITIDO) return r;

  // --- Temperatura (resultado en centésimas de °C) ---
  int32_t var1 = ((((adcT >> 3) - (int32_t(T1_) << 1))) * int32_t(T2_)) >> 11;
  int32_t var2 = (((((adcT >> 4) - int32_t(T1_)) * ((adcT >> 4) - int32_t(T1_))) >> 12) * int32_t(T3_)) >> 14;
  const int32_t tFine = var1 + var2;
  r.temperaturaC = float((tFine * 5 + 128) >> 8) / 100.0f;
  r.temperaturaOk = true;

  // --- Presión (resultado en Pa, formato Q24.8) ---
  if (adcP != CRUDO_20_OMITIDO) {
    int64_t p1 = int64_t(tFine) - 128000;
    int64_t p2 = p1 * p1 * int64_t(P6_);
    p2 = p2 + ((p1 * int64_t(P5_)) << 17);
    p2 = p2 + (int64_t(P4_) << 35);
    p1 = ((p1 * p1 * int64_t(P3_)) >> 8) + ((p1 * int64_t(P2_)) << 12);
    p1 = ((((int64_t(1)) << 47) + p1) * int64_t(P1_)) >> 33;
    if (p1 != 0) {
      int64_t p = 1048576 - adcP;
      p = (((p << 31) - p2) * 3125) / p1;
      p1 = (int64_t(P9_) * (p >> 13) * (p >> 13)) >> 25;
      p2 = (int64_t(P8_) * p) >> 19;
      p = ((p + p1 + p2) >> 8) + (int64_t(P7_) << 4);
      r.presionHpa = float(uint32_t(p)) / 256.0f / 100.0f;
      r.presionOk = true;
    }
  }

  // --- Humedad (resultado en %RH, formato Q22.10) ---
  if (adcH != CRUDO_16_OMITIDO) {
    int32_t v = tFine - 76800;
    v = (((((adcH << 14) - (int32_t(H4_) << 20) - (int32_t(H5_) * v)) + 16384) >> 15) *
         (((((((v * int32_t(H6_)) >> 10) * (((v * int32_t(H3_)) >> 11) + 32768)) >> 10) + 2097152) *
               int32_t(H2_) + 8192) >> 14));
    v = v - (((((v >> 15) * (v >> 15)) >> 7) * int32_t(H1_)) >> 4);
    v = v < 0 ? 0 : v;
    v = v > 419430400 ? 419430400 : v;
    r.humedadPct = float(uint32_t(v) >> 12) / 1024.0f;
    r.humedadOk = true;
  }
  return r;
}
