// config.h
//
// Constantes del contrato con la app y tiempos de operación.
// Los UUID deben coincidir con App/src/services/probeService.ts: si cambian
// aquí y no allá, la app deja de encontrar la sonda.

#pragma once

#include <stdint.h>

// --- Servicio y características GATT (contrato docs/CONTRATO_BLE.md) ---
#define TS_SERVICE_UUID      "00000001-5e4e-4c69-6d61-746572726101"
#define TS_TELEMETRY_UUID    "00000002-5e4e-4c69-6d61-746572726102"
#define TS_IDENTITY_UUID     "00000003-5e4e-4c69-6d61-746572726103"
#define TS_PROVISIONING_UUID "00000004-5e4e-4c69-6d61-746572726104"

// Nombre anunciado. Sin código: "TerraSense". Con código: "TerraSense-<15 dígitos>",
// del que la app extrae el código para reconocer su sonda al medir.
#define TS_NOMBRE_BASE "TerraSense"

// --- Pulsador PAIR ---
constexpr uint32_t ANTIRREBOTE_MS     = 30;
constexpr uint32_t PAIR_PULSACION_MS  = 3000;   // abre la ventana de vinculación
constexpr uint32_t RESET_PULSACION_MS = 10000;  // borra el código guardado y reinicia
constexpr uint32_t PAIR_VENTANA_MS    = 30000;  // la app sólo puede provisionar dentro de ella

// --- Telemetría ---
// Espera entre la suscripción de la app y la notificación, para que el
// teléfono termine de habilitar las notificaciones antes de recibir la trama.
constexpr uint32_t ESPERA_NOTIFICACION_MS = 200;

// --- Batería ---
// Divisor resistivo 100k/100k del esquemático: la pata IO34 ve la mitad de la
// tensión de la celda. Confirmar contra el PCB armado (TASK.md).
constexpr float    BATERIA_FACTOR_DIVISOR = 2.0f;
constexpr float    BATERIA_BAJA_V         = 3.40f;  // entra en aviso bajo este valor
constexpr float    BATERIA_RECUPERADA_V   = 3.50f;  // histéresis: sale del aviso sobre este
constexpr float    BATERIA_PRESENTE_MIN_V = 2.50f;  // bajo esto no hay celda (p. ej. sólo USB)
constexpr uint32_t BATERIA_PERIODO_MS     = 5000;
