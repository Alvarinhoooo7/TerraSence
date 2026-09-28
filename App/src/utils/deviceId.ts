// src/utils/deviceId.ts
//
// El ID de la sonda (15 dígitos) lo define el firmware a partir de la MAC del
// ESP32 y la app lo lee por BLE al vincular: la app ya no genera IDs. Este
// módulo reexporta las funciones puras de formato y validación.

export * from './deviceCode';
