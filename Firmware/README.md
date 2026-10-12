# Firmware TerraSense

Código del ESP32 de TerraSense, compatible con **Arduino IDE** (núcleo `esp32 by Espressif Systems` 3.x, sin bibliotecas externas). Hoy cubre la vinculación BLE con la app (el ID de la sonda sale de su MAC), los indicadores LED y sonoros, la lectura Modbus de la sonda de suelo (sin ensayar aún con la sonda) y la trama de telemetría de 20 bytes. El estado detallado, lo pendiente y el procedimiento de prueba están en [TASK.md](TASK.md).

El contrato con la app lo fija el código de la app, no este firmware: [`App/src/services/bleService.ts`](../App/src/services/bleService.ts) (transporte y vinculación) y [`App/src/services/probeService.ts`](../App/src/services/probeService.ts) (UUID y decodificación). El formato de la trama está explicado en [docs/CONTRATO_BLE.md](../docs/CONTRATO_BLE.md).

## Archivos

| Archivo | Contenido |
| :--- | :--- |
| `Firmware.ino` | Arranque, bucle principal, batería y estado de los LEDs. |
| `pines.h` | Asignación de pines del esquemático. |
| `config.h` | UUID del servicio, versión del firmware, tiempos del pulsador, umbrales de batería y mapa Modbus de la sonda. |
| `trama.h` | Empaquetado de la trama de 20 bytes. |
| `ble_terrasense.*` | Servidor GATT, anuncio, identidad, confirmación de vinculación y estado. |
| `pulsador.*` | Pulsador PAIR con antirrebote y pulsación de 3 s. |
| `leds.*` | Patrones de parpadeo y destellos, encendido/apagado sin PWM. |
| `zumbador.*` | Secuencias de tonos del buzzer pasivo por LEDC, no bloqueantes. |
| `identidad.*` | ID de 15 dígitos derivado de la MAC del ESP32. |
| `bme280.*` | Driver mínimo del BME280 por I2C. |
| `modbus.*` | Transporte Modbus RTU genérico: solicitud, CRC, validación de la respuesta y reintentos. |
| `sonda.*` | Captura de la sonda de suelo: la energiza, la consulta por RS-485 y convierte los registros. |
| `monitor_serie.*` | Menú de mantenimiento, informes de batería y copia de la última captura para diagnóstico. |
| `platformio.ini` | Compilación alternativa con PlatformIO (pioarduino, mismo núcleo 3.3.0). |
| `TASK.md` | Estado, procedimiento de prueba con la app y pendientes. |
| `PLAN.md` | Orden de implementación: Modbus, medición real, batería, validación, reposo y actualización por BLE (OTA). |

## Distribución de pines

Según el esquemático «Medidor De Suelos V2», con un ESP32-DevKitC con módulo WROOM-32D (la huella del esquemático es la de la DevKitC-32U, que tiene el mismo pinout):

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

**No hay reset desde la sonda.** El único reset de un equipo es el del backoffice, que borra sus usuarios y su historial en la nube; la sonda conserva el mismo ID y el primero que la vuelva a vincular con la ventana PAIR abierta queda como administrador. La app tampoco tiene reset.

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

Si la sonda no responde, o no hay una batería válida que informar, la medición termina en tres destellos rojos y el tono grave: el firmware no reemplaza el dato que falta por valores de ejemplo.

Los LEDs ya no son el consumo que importa. El ESP32 despierto con la radio BLE anunciando consume decenas de mA de forma continua, muy por encima de un LED. Para que la batería dure hace falta el reposo profundo (pendiente F4 en [TASK.md](TASK.md)).

## Monitor de mantenimiento

Monitor serie a **115200 baudios**. El menú aparece al arrancar y se repite con **`h`** o **`?`**. Envía un comando por vez; acepta mayúsculas, con o sin Enter, y terminaciones LF o CRLF.

| Comando | Acción |
| :--- | :--- |
| `1` | Tono del buzzer durante 1 segundo. Respeta la configuración de silencio. |
| `2` / `3` / `4` | LED azul / verde / rojo encendido durante 1 segundo. |
| `x` | Cancela las pruebas de salidas y conserva los avisos normales. |
| `e` | ID, versión, tiempo encendido, conexión BLE, ventana PAIR, nivel instantáneo del pulsador, pines y detección del sensor ambiental. |
| `b` | Última lectura periódica de batería y su antigüedad: tensión en el ADC, tensión de celda calculada con el divisor, porcentaje aproximado, umbrales y motivo de invalidez. No fuerza otra adquisición ni cambia el estado publicado. |
| `m` / `g` | Captura nueva por la ruta habitual de la sonda, sin notificar a la app. Al terminar muestra suelo recibido, motivo de aceptación o descarte, batería, temperatura/humedad/presión ambientales y trama desglosada. |
| `a` | Ambiente de la última captura, con antigüedad. No vuelve a medir. |
| `t` | Última trama en hexadecimal, índices, campos, escalas y centinelas. No vuelve a medir ni notifica. |
| `d` | Barrido RS-485 de banco existente: lecturas e identidad a varias velocidades. **Bloquea el bucle unos segundos**; usar sin operaciones desde la app durante el barrido. |

Las pruebas manuales de salidas, la captura local y el barrido se rechazan si hay una captura, conexión BLE, ventana PAIR o pulsación PAIR en curso. Sólo se prueba una salida a la vez. Las pruebas de un segundo no usan `delay`: el bucle sigue atendiendo al equipo. Una conexión BLE, el pulsador PAIR o una captura cancelan las pruebas; un aviso normal del LED o buzzer tiene prioridad sobre su prueba. El barrido `d` conserva su funcionamiento bloqueante anterior.

El informe distingue **«la sonda no respondió»** de **«la sonda respondió, pero el suelo fue descartado por batería inválida»**. La copia de diagnóstico conserva los datos originales; no modifica la trama, los rangos, los umbrales ni las reglas de descarte. Los valores ausentes se muestran como «SIN DATO». La copia nunca se usa para enviar una medición posterior a la app.

Los informes nuevos salen en fragmentos de hasta 64 bytes por vuelta, limitados por el espacio disponible del puerto, y se pausan durante una captura. Un nuevo comando sustituye el informe pendiente; espera a que termine para leerlo completo. Los mensajes operativos existentes pueden intercalarse. El monitor confirma que **ordenó** una salida: comprobar físicamente luz y sonido sigue siendo necesario.

Para verificar en banco: probar `1`–`4` por separado, comprobar que terminan al segundo, cancelar con `x` y pulsar PAIR durante una prueba. Revisar `b` con y sin batería, `a`/`t` antes de la primera captura y después de `m`, y finalmente realizar una medición desde la app para comprobar que conserva su comportamiento habitual.

## Trama de telemetría

Al suscribirse la app, el firmware arma una trama **nueva** de 20 bytes, versión 1, y la notifica una vez. Los campos sin lectura no se simulan:

| Bytes | Hoy | Con sensores |
| :--- | :--- | :--- |
| 0–13 (suelo) | `FF` si la sonda no respondió | Registros Modbus de la sonda. |
| 14 (batería) | `FF` | Porcentaje de batería, sólo junto con una lectura de suelo. |
| 15 (versión) | `01` | `01` |
| 16–19 (BME280) | `FF FF FF FF` si el sensor no responde | Temperatura, presión y humedad empaquetadas. |

Los bytes 0 a 14 todos en `FF` son el centinela «sin lectura de suelo» del [contrato](../docs/CONTRATO_BLE.md#sin-lectura-de-suelo). La app rechaza esa trama con «La sonda no entregó lectura de suelo» y no guarda nada. La batería va en `FF` junto con el suelo, porque una trama sin suelo no se guarda.

## Característica de estado

Además de la trama, el firmware publica una característica de lectura con 5 bytes: batería en % (`FF` sin dato), la versión del firmware (`FIRMWARE_VERSION_*` en `config.h`) y un byte de banderas (bit 0 = ventana PAIR abierta). Se actualiza cada 5 s con la lectura del ADC. Detalle en el [contrato](../docs/CONTRATO_BLE.md#característica-de-estado); el trabajo pendiente de actualización por BLE está en [PLAN.md](PLAN.md).

## Compilar y cargar

1. Instalar en el Gestor de Tarjetas `esp32 by Espressif Systems` (probado con 3.3.0).
2. Abrir `Firmware/Firmware.ino`. El IDE carga los demás archivos como pestañas.
3. Placa: **ESP32 Dev Module**, esquema de particiones por defecto. Verificación y ocupación en [TASK.md](TASK.md#hecho).
4. Compilar y subir. Monitor serie a **115200 baudios**: **`h`** abre el menú de mantenimiento y **`m`** pide una captura sin la app con diagnóstico detallado ([prueba en banco](TASK.md#prueba-de-la-sonda-en-banco)). También conserva los eventos del pulsador, la vinculación, la respuesta de la sonda y cada trama en hexadecimal.

Con PlatformIO, desde `Firmware/`: `pio run -t upload` y `pio device monitor`. [`platformio.ini`](platformio.ini) usa la plataforma pioarduino porque la oficial trae el núcleo 2.x, y este firmware usa APIs del 3.x.
