// config.h
//
// Constantes del contrato con la app y tiempos de operación.
// Los UUID deben coincidir con App/src/services/probeService.ts: si cambian
// aquí y no allá, la app deja de encontrar la sonda.

#pragma once

#include <stdint.h>

// --- Servicio y características GATT (contrato docs/CONTRATO_BLE.md) ---
#define TS_SERVICE_UUID "00000001-5e4e-4c69-6d61-746572726101"
#define TS_TELEMETRY_UUID "00000002-5e4e-4c69-6d61-746572726102"
#define TS_IDENTITY_UUID "00000003-5e4e-4c69-6d61-746572726103"
// Confirmación de vinculación: la app escribe el ID de la sonda tras
// registrarla; se acepta sólo con la ventana PAIR abierta.
#define TS_PROVISIONING_UUID "00000004-5e4e-4c69-6d61-746572726104"
#define TS_STATUS_UUID "00000005-5e4e-4c69-6d61-746572726105"

// Versión del firmware (X.Y.Z). Viaja en la característica de estado y es la
// que la app informa a Supabase: subirla en cada binario que se publique.
constexpr uint8_t FIRMWARE_VERSION_MAYOR = 1;
constexpr uint8_t FIRMWARE_VERSION_MENOR = 1;
constexpr uint8_t FIRMWARE_VERSION_PARCHE = 0;

// Nombre anunciado: "TerraSense-<ID de 15 dígitos>", del que la app extrae el
// ID para reconocer su sonda al medir.
#define TS_NOMBRE_BASE "TerraSense"

// --- Pulsador PAIR ---
constexpr uint32_t ANTIRREBOTE_MS = 30;
constexpr uint32_t PAIR_PULSACION_MS = 3000; // abre la ventana de vinculación
constexpr uint32_t PAIR_VENTANA_MS =
    30000; // la app sólo puede vincular dentro de ella

// --- Buzzer ---
// Frecuencia de los tonos agudos; los graves usan la mitad. Ajustarla a la
// resonancia de la hoja de datos del 9042 (suele estar entre 2,3 y 4 kHz), que
// es donde suena más fuerte con la misma corriente.
constexpr uint16_t BUZZER_FRECUENCIA_HZ = 2700;
// false silencia todos los sonidos sin tocar el resto del firmware.
constexpr bool BUZZER_HABILITADO = true;

// --- Energía en espera ---
// El reposo con anuncio BLE domina el consumo de una jornada (ensayo D-07 con
// FNB58: 74 mA a 240 MHz y anuncio cada ~50 ms). A 80 MHz la radio y el UART
// funcionan igual. El anuncio cada ~150 ms (valor recomendado por Apple para
// descubrimiento rápido) cuesta 1-2 mA más que uno de ~420 ms, pero éste dejó
// 2 de 5 mediciones sin encontrar la sonda: el escaneo de bajo consumo de
// Android abre ventanas cortas y espaciadas.
constexpr uint32_t CPU_MHZ = 80;
// Unidades de 0,625 ms: 152,5 ms y 162,5 ms (Bluedroid usa 20-40 ms por
// omisión).
constexpr uint16_t ANUNCIO_INTERVALO_MIN = 0xF4;
constexpr uint16_t ANUNCIO_INTERVALO_MAX = 0x104;

// --- Telemetría ---
// Espera entre la suscripción de la app y la notificación, para que el
// teléfono termine de habilitar las notificaciones antes de recibir la trama.
constexpr uint32_t ESPERA_NOTIFICACION_MS = 200;

// --- Batería ---
// Divisor resistivo 100k/100k del esquemático: la pata IO34 ve la mitad de la
// tensión de la celda. Confirmar contra el PCB armado (TASK.md).
constexpr float BATERIA_FACTOR_DIVISOR = 2.0f;
constexpr float BATERIA_BAJA_V = 3.40f; // entra en aviso bajo este valor
constexpr float BATERIA_RECUPERADA_V =
    3.50f; // histéresis: sale del aviso sobre este
constexpr float BATERIA_PRESENTE_MIN_V =
    2.50f; // bajo esto no hay celda (p. ej. sólo USB)
constexpr uint32_t BATERIA_PERIODO_MS = 5000;

// --- Sonda de suelo 7 en 1 ComWinTop CWT-Soil-NPKPHCTH-S (RS-485, Modbus RTU)
// --- Mapa del manual del fabricante («Soil sensor (5PIN Probe, RS485 output
// type) manual», V1.0, que cubre el NPKPHCTH-S): dirección 1, 4.800 8N1,
// función 03, siete registros desde el 0x0000 en este orden: humedad (% × 10),
// temperatura (°C × 10, complemento a dos), conductividad (µS/cm), pH (× 10),
// nitrógeno, fósforo y potasio (mg/kg). Alimentación de 4,5 a 30 V; cable café
// +, negro −, amarillo A+, azul B−. Falta contrastarlo con la muestra
// (TASK.md, F1): si una escala difiere, la trama se descarta por fuera de rango
// en vez de enviar un valor equivocado. 9.600 baudios es el segundo intento,
// por si la sonda fue reconfigurada (registro 0x07D1).
constexpr uint8_t SONDA_DIRECCION = 1;
constexpr uint8_t SONDA_FUNCION = 3;
constexpr uint16_t SONDA_REGISTRO_INICIO = 0x0000;
constexpr uint8_t SONDA_REGISTROS = 7;
constexpr uint32_t SONDA_BAUDIOS[] = {4800, 9600};
// Tras energizar, antes de consultar. Sin confirmar: el manual no da un
// tiempo de arranque (sólo de respuesta a cambios: pH ≤ 10 s, temperatura
// ≤ 15 s). Medirlo cuando el corte por MOSFET esté montado (TASK.md, F1).
constexpr uint32_t SONDA_ESTABILIZACION_MS = 1000;
constexpr uint32_t SONDA_RESPUESTA_MS =
    300; // espera por respuesta, por intento
constexpr uint8_t SONDA_REINTENTOS =
    2; // reintentos por velocidad (máximo del transporte)
// Ráfaga de 10 muestras con media recortada (trimmed mean) canal por canal:
// mantiene energizado el MOSFET entre las 10 lecturas consecutivas (separadas
// 50 ms, igual que en el ensayo D-14 de 1.000 lecturas), descarta los valores
// extremos (2 mínimos y 2 máximos con >= 6 muestras válidas) y promedia las
// muestras centrales para reducir el ruido aleatorio y eliminar transitorios.
constexpr uint8_t SONDA_MUESTRAS_RAFAGA = 10;
constexpr uint32_t SONDA_SEPARACION_RAFAGA_MS = 50;
// Tope de reloj de la ráfaga completa, contado desde que se energiza la sonda.
// La app espera la notificación 15 s (NOTIFY_TIMEOUT_MS en bleService.ts): con
// 10 s la captura cierra con las muestras válidas que tenga y aún queda margen
// para el BME280 y la notificación. Una ráfaga sin fallos dura ~2 s.
constexpr uint32_t SONDA_RAFAGA_MAX_MS = 10000;

// Cuántas muestras se descartan en cada extremo de la media recortada, según
// las válidas obtenidas: 2 y 2 con 6 o más, 1 y 1 con 4 o 5, ninguna con
// menos (no queda qué promediar). `maximo` es el tamaño del arreglo de la
// ráfaga y acota `validas`. La comparten la sonda y el BME280.
constexpr uint8_t recorteMediaRecortada(uint8_t validas, uint8_t maximo) {
  return (validas > maximo ? maximo : validas) >= 6
             ? 2
             : ((validas > maximo ? maximo : validas) >= 4 ? 1 : 0);
}

// --- Sensor ambiental BME280 (I2C) ---
// Ráfaga de 10 lecturas forzadas consecutivas con sobremuestreo ×2 y media
// recortada (descarta extremos y promedia las centrales en ~165 ms totales).
constexpr uint8_t BME280_MUESTRAS_RAFAGA = 10;
