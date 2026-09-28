# Firmware TerraSense

Código del ESP32 de TerraSense, compatible con **Arduino IDE** (núcleo `esp32 by Espressif Systems` 3.x, sin bibliotecas externas). Hoy cubre la vinculación BLE con la app (el ID de la sonda sale de su MAC), los indicadores LED y sonoros y la trama de telemetría de 20 bytes; la lectura de la sonda de suelo aún no está implementada. El estado detallado, lo pendiente y el procedimiento de prueba están en [TASK.md](TASK.md).

El contrato con la app lo fija el código de la app, no este firmware: [`App/src/services/bleService.ts`](../App/src/services/bleService.ts) (transporte y vinculación) y [`App/src/services/probeService.ts`](../App/src/services/probeService.ts) (UUID y decodificación). El formato de la trama está explicado en [docs/CONTRATO_BLE.md](../docs/CONTRATO_BLE.md).

## Archivos

| Archivo | Contenido |
| :--- | :--- |
| `Firmware.ino` | Arranque, bucle principal, batería y estado de los LEDs. |
| `pines.h` | Asignación de pines del esquemático. |
| `config.h` | UUID del servicio, versión del firmware, tiempos del pulsador y umbrales de batería. |
| `trama.h` | Empaquetado de la trama de 20 bytes. |
| `ble_terrasense.*` | Servidor GATT, anuncio, identidad, confirmación de vinculación y estado. |
| `pulsador.*` | Pulsador PAIR con antirrebote y pulsación de 3 s. |
| `leds.*` | Patrones de parpadeo y destellos, encendido/apagado sin PWM. |
| `zumbador.*` | Secuencias de tonos del buzzer pasivo por LEDC, no bloqueantes. |
| `identidad.*` | ID de 15 dígitos derivado de la MAC del ESP32. |
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
| **IO19** | `Buzzer` | Buzzer pasivo 9042 (`BZ1`), directo a `GND`. Necesita onda cuadrada (LEDC). Ver pendiente H1 en [TASK.md](TASK.md). |
| **IO22** | `SCL` | Reloj I2C (BME280). |
| **IO21** | `SDA` | Datos I2C (BME280). |
| **IO5** | `GATE_MOSFET` | Alimentación de la sonda. Pin de arranque: ver pendientes en [TASK.md](TASK.md). |
| **IO17** | `TX` | Transmisión UART hacia el RS-485. |
| **IO16** | `RX` | Recepción UART desde el RS-485. |
| **IO4** | `RTS` | Dirección del transceptor RS-485. |

## Identidad de la sonda

El ID de 15 dígitos **sale de la MAC base del ESP32**, grabada de fábrica y única por chip: sus 48 bits leídos como un entero, en decimal y con ceros a la izquierda. El máximo, `FF:FF:FF:FF:FF:FF` = 281474976710655, tiene exactamente 15 dígitos, y el ID puede empezar con 0 (las MAC `08:3A:F2:…` dan números de 13 dígitos).

Nada se guarda ni se borra: el ID es del hardware y no cambia nunca. La app lo lee por BLE al vincular; ya no lo inventa. La sonda se anuncia siempre como `TerraSense-<ID>` y el monitor serie lo muestra al arrancar.

**No hay reset desde la sonda.** El único reset de un equipo es el del backoffice, que borra sus usuarios y su historial en la nube; la sonda conserva el mismo ID y el primero que la vuelva a vincular queda como administrador.

## Pulsador PAIR

| Acción | Efecto |
| :--- | :--- |
| Mantener **3 s** | Abre la ventana de vinculación de **30 s**. La app sólo registra una sonda que tenga la ventana abierta: prueba que el usuario la tiene en la mano. |

La ventana se abre al cumplir los 3 s, sin esperar a soltar. El parpadeo azul rápido indica que ya se puede soltar. Tras registrar la sonda, la app le escribe su ID en la característica de confirmación; con la ventana abierta y el ID correcto, la sonda la cierra y avisa con verde y buzzer.

## Indicadores LED y sonoros

**En reposo los tres LEDs están apagados y el buzzer en silencio.** Sólo se activan para decir algo, y cada color tiene un único significado: azul = vinculación, verde = salió bien, rojo = necesita atención. El sonido sigue la misma regla: agudo y corto = salió bien, grave y largo = necesita atención.

| Cuándo | LED | Patrón | Sonido |
| :--- | :--- | :--- | :--- |
| Al encender | 🟢 Verde | Fijo 1 s, una vez | Un pitido corto |
| Ventana PAIR abierta (30 s) | 🔵 Azul | Parpadeo 2 Hz mientras dure | Un pitido corto al abrirse |
| Vinculación confirmada | 🟢 Verde | Tres destellos | Dos pitidos ascendentes |
| Vinculación rechazada (ventana cerrada o ID que no es el de esta sonda) | 🔴 Rojo | Tres destellos | Tono grave de 0,4 s |
| Medición enviada a la app | 🟢 Verde | Tres destellos | Dos pitidos ascendentes |
| Medición enviada sin lectura de suelo | 🔴 Rojo | Tres destellos | Tono grave de 0,4 s |
| Batería baja | 🔴 Rojo | Un destello corto cada 10 s | Dos tonos graves, sólo al entrar en batería baja |

Los tonos agudos usan `BUZZER_FRECUENCIA_HZ` (2,7 kHz por defecto) y los graves la mitad; `BUZZER_HABILITADO = false` en `config.h` silencia todo. La batería baja suena una sola vez y no en cada latido, para no volver molesto un equipo que se usa horas en el campo.

Los LEDs son independientes: el azul de la ventana PAIR puede coincidir con los tres destellos verdes de la vinculación confirmada. En el rojo, los tres destellos se muestran encima del latido de batería baja y luego este sigue. Estar conectado al teléfono no enciende nada: la app se conecta sólo lo que dura cada operación.

Mientras no exista el driver Modbus, toda medición termina en tres destellos rojos y el tono grave: no hay lectura de suelo que capturar, y el firmware no la reemplaza por valores de ejemplo.

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

## Característica de estado

Además de la trama, el firmware publica una característica de lectura con 5 bytes: batería en % (`FF` sin dato), la versión del firmware (`FIRMWARE_VERSION_*` en `config.h`) y un byte de banderas (bit 0 = ventana PAIR abierta). Se actualiza cada 5 s con la lectura del ADC. Detalle en el [contrato](../docs/CONTRATO_BLE.md#característica-de-estado); el trabajo pendiente de actualización por BLE está en [PLAN.md](PLAN.md).

## Compilar y cargar

1. Instalar en el Gestor de Tarjetas `esp32 by Espressif Systems` (probado con 3.3.0).
2. Abrir `Firmware/Firmware.ino`. El IDE carga los demás archivos como pestañas.
3. Placa: **ESP32 Dev Module**. Esquema de particiones por defecto: el programa ocupa cerca del 88 % de la partición.
4. Compilar y subir. Monitor serie a **115200 baudios**: muestra los eventos del pulsador, la vinculación y cada trama en hexadecimal.
