# Firmware TerraSense

Código del ESP32 de TerraSense, compatible con **Arduino IDE** (núcleo `esp32 by Espressif Systems` 3.x, sin bibliotecas externas). Hoy cubre la vinculación BLE con la app, los indicadores LED y la trama de telemetría de 20 bytes; la lectura de la sonda de suelo aún no está implementada. El estado detallado, lo pendiente y el procedimiento de prueba están en [TASK.md](TASK.md).

El contrato con la app lo fija el código de la app, no este firmware: [`App/src/services/bleService.ts`](../App/src/services/bleService.ts) (transporte y vinculación) y [`App/src/services/probeService.ts`](../App/src/services/probeService.ts) (UUID y decodificación). El formato de la trama está explicado en [docs/CONTRATO_BLE.md](../docs/CONTRATO_BLE.md).

## Archivos

| Archivo | Contenido |
| :--- | :--- |
| `Firmware.ino` | Arranque, bucle principal, batería y estado de los LEDs. |
| `pines.h` | Asignación de pines del esquemático. |
| `config.h` | UUID del servicio, tiempos del pulsador y umbrales de batería. |
| `trama.h` | Empaquetado de la trama de 20 bytes. |
| `ble_terrasense.*` | Servidor GATT, anuncio, identidad y provisión. |
| `pulsador.*` | Pulsador PAIR con antirrebote y pulsación larga. |
| `leds.*` | Patrones de pulso, parpadeo y destellos por PWM. |
| `identidad.*` | Código de 15 dígitos guardado en la memoria NVS. |
| `bme280.*` | Driver mínimo del BME280 por I2C. |

## Distribución de pines

Según el esquemático «Medidor De Suelos V2», con un ESP32-DevKitC-32U (módulo WROOM-32UE):

| GPIO | Función | Notas |
| :--- | :--- | :--- |
| **IO34** | `VBAT_SENSE` | Tensión de batería por divisor 100k/100k (ADC1, no choca con la radio). |
| **IO33** | `Paring` | Pulsador PAIR, activo en `LOW`, con pull-up. |
| **IO25** | `LED_BLUE` | LED azul, activo en `HIGH`. |
| **IO26** | `LED_GREEN` | LED verde, activo en `HIGH`. |
| **IO27** | `LED_RED` | LED rojo, activo en `HIGH`. |
| **IO22** | `SCL` | Reloj I2C (BME280). |
| **IO21** | `SDA` | Datos I2C (BME280). |
| **IO5** | `GATE_MOSFET` | Alimentación de la sonda. Pin de arranque: ver pendientes en [TASK.md](TASK.md). |
| **IO17** | `TX` | Transmisión UART hacia el RS-485. |
| **IO16** | `RX` | Recepción UART desde el RS-485. |
| **IO4** | `RTS` | Dirección del transceptor RS-485. |

## Pulsador PAIR

| Acción | Efecto |
| :--- | :--- |
| Mantener **3 s** | Abre la ventana de vinculación de **30 s**: sólo dentro de ella la sonda acepta el código que le envía la app. |
| Mantener **10 s** | Borra el código guardado y reinicia. Sirve para volver a vincular; la base de datos no acepta registrar dos veces el mismo código. |

La ventana se abre al cumplir los 3 s, sin esperar a soltar. El parpadeo azul rápido indica que ya se puede soltar.

## Indicadores LED

**En reposo los tres LEDs están apagados.** Sólo se encienden para decir algo, y cada color tiene un único significado: azul = vinculación, verde = salió bien, rojo = necesita atención.

| Cuándo | LED | Patrón |
| :--- | :--- | :--- |
| Al encender | 🟢 Verde | Fijo 1 s, una vez |
| Ventana PAIR abierta (30 s) | 🔵 Azul | Parpadeo 2 Hz mientras dure |
| Código guardado | 🟢 Verde | Tres destellos |
| Código rechazado (ventana cerrada, ya tenía uno, formato inválido) | 🔴 Rojo | Tres destellos |
| Medición enviada a la app | 🟢 Verde | Tres destellos |
| Medición enviada sin lectura de suelo | 🔴 Rojo | Tres destellos |
| Batería baja | 🔴 Rojo | Un destello corto cada 10 s |
| Borrado con PAIR 10 s | 🔴 Rojo | Fijo 1 s y reinicia |

Los LEDs son independientes: el azul de la ventana PAIR puede coincidir con los tres destellos verdes del código guardado. En el rojo, los tres destellos se muestran encima del latido de batería baja y luego este sigue. Estar conectado al teléfono no enciende nada: la app se conecta sólo lo que dura cada operación.

Mientras no exista el driver Modbus, toda medición termina en tres destellos rojos: no hay lectura de suelo que capturar, y el firmware no la reemplaza por valores de ejemplo.

Los LEDs ya no son el consumo que importa. El ESP32 despierto con la radio BLE anunciando consume decenas de mA de forma continua, muy por encima de un LED. Para que la batería dure hace falta el reposo profundo (pendiente F4 en [TASK.md](TASK.md)).

## Trama de telemetría

Al suscribirse la app, el firmware arma una trama **nueva** de 20 bytes, versión 1, y la notifica una vez. Los campos sin lectura no se simulan:

| Bytes | Hoy | Con sensores |
| :--- | :--- | :--- |
| 0–13 (suelo) | `FF` | Valores del driver Modbus (pendiente). |
| 14 (batería) | `FF` | Porcentaje de batería, sólo junto con una lectura de suelo. |
| 15 (versión) | `01` | `01` |
| 16–19 (BME280) | `FF FF FF FF` si el sensor no responde | Temperatura, presión y humedad empaquetadas. |

Los bytes 0 a 14 todos en `FF` son el centinela «sin lectura de suelo» del [contrato](../docs/CONTRATO_BLE.md#sin-lectura-de-suelo). La app rechaza esa trama con «La sonda no entregó lectura de suelo» y no guarda nada. La batería va en `FF` junto con el suelo, porque una trama sin suelo no se guarda.

## Compilar y cargar

1. Instalar en el Gestor de Tarjetas `esp32 by Espressif Systems` (probado con 3.3.0).
2. Abrir `Firmware/Firmware.ino`. El IDE carga los demás archivos como pestañas.
3. Placa: **ESP32 Dev Module**. Esquema de particiones por defecto: el programa ocupa cerca del 88 % de la partición.
4. Compilar y subir. Monitor serie a **115200 baudios**: muestra los eventos del pulsador, la vinculación y cada trama en hexadecimal.
