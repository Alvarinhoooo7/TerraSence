// pines.h
//
// Asignación de pines del ESP32-DevKitC-32U (módulo WROOM-32UE) según el
// esquemático «Medidor De Suelos V2». En WROOM, IO16/IO17 están libres; en un
// WROVER los ocupa la PSRAM y este mapa no serviría.

#pragma once

// Batería (ADC1: no entra en conflicto con la radio BLE)
#define PIN_VBAT_SENSE 34

// Interfaz de usuario: pulsador PAIR (activo en LOW) y LEDs (activos en HIGH)
#define PIN_PARING     33
#define PIN_LED_BLUE   25
#define PIN_LED_GREEN  26
#define PIN_LED_RED    27

// Buzzer pasivo 9042 (BZ1), directo entre el pin y GND. Ver TASK.md, pendiente H1.
#define PIN_BUZZER     19

// Bus I2C (BME280)
#define PIN_SCL        22
#define PIN_SDA        21

// Alimentación de la sonda y UART / RS-485
// IO5 es pin de arranque (strapping): durante el reset puede emitir una señal
// antes de que setup() lo fije en LOW. Ver TASK.md, pendientes de hardware.
#define PIN_GATE       5
#define PIN_TX         17
#define PIN_RX         16
#define PIN_RTS        4
