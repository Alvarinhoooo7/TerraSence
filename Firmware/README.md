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
| `monitor_serie.*` | Menú de mantenimiento y sus informes: batería, ambiente, sonda y BLE. No guarda capturas anteriores. |
| `comandos_monitor.h` | Lectura de los comandos del monitor: una línea completa por comando; rechaza prefijos y líneas ambiguas. |
| `tests/test_comandos.cpp` | Pruebas de `comandos_monitor.h` que evalúa el compilador (`static_assert`): se comprueban compilando, sin cargar el ESP32. Arduino IDE no compila esta carpeta con el sketch. |
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

**En reposo los tres LEDs están apagados y el buzzer en silencio.** Sólo se activan para decir algo, y cada color tiene un único significado: azul = vinculación, verde = salió bien, rojo = necesita atención. El sonido sigue la misma regla: notas que suben = salió bien, notas que bajan o graves = necesita atención, y cada evento tiene su propia melodía para reconocerlo sin mirar el equipo.

| Cuándo | LED | Patrón | Sonido |
| :--- | :--- | :--- | :--- |
| Al encender | 🟢 Verde | Fijo 1 s, una vez | Tres notas que suben (grave, aguda, alta) |
| Ventana PAIR abierta (30 s) | 🔵 Azul | Parpadeo 2 Hz mientras dure | Doble llamada aguda al abrirse: ya se puede soltar |
| Vinculación confirmada | 🟢 Verde | Tres destellos | Tres notas de confirmación con cierre largo |
| Vinculación rechazada (ventana cerrada o ID que no es el de esta sonda) | 🔴 Rojo | Tres destellos | Dos notas que bajan (aguda y grave) |
| Medición enviada a la app | 🟢 Verde | Tres destellos | Dos pitidos ascendentes |
| Medición enviada sin lectura de suelo | 🔴 Rojo | Tres destellos | Dos notas que bajan (aguda y grave) |
| Batería baja | 🔴 Rojo | Un destello corto cada 10 s | Dos tonos graves, sólo al entrar en batería baja |

Las notas agudas usan `BUZZER_FRECUENCIA_HZ` (2,7 kHz por defecto), las altas 5/4 de ella y las graves la mitad; `BUZZER_HABILITADO = false` en `config.h` silencia todo. La batería baja suena una sola vez y no en cada latido, para no volver molesto un equipo que se usa horas en el campo.

Los LEDs son independientes: el azul de la ventana PAIR puede coincidir con los tres destellos verdes de la vinculación confirmada. En el rojo, los tres destellos se muestran encima del latido de batería baja y luego este sigue. Estar conectado al teléfono no enciende nada: la app se conecta sólo lo que dura cada operación.

Si la sonda no responde, o no hay una batería válida que informar, la medición termina en tres destellos rojos y el tono grave: el firmware no reemplaza el dato que falta por valores de ejemplo.

Los LEDs ya no son el consumo que importa. El ESP32 despierto con la radio BLE anunciando consume decenas de mA de forma continua, muy por encima de un LED. Para que la batería dure hace falta el reposo profundo (pendiente F4 en [TASK.md](TASK.md)).

## Monitor de mantenimiento

Monitor serie a **115200 baudios**. Cada comando es una línea completa terminada en Enter: el firmware acepta LF, CR o CRLF, así que en Arduino IDE el monitor debe estar en «Nueva línea», «Retorno de carro» o «Ambos NL & CR»; con «Sin ajuste de línea» ningún comando se ejecuta. Primero envía **`d` o `D`** para entrar: antes de eso cualquier línea sólo responde cómo entrar y no ejecuta pruebas. Al entrar, el menú se agrupa en salidas, sensores, comunicación y control, y las luces hacen su secuencia de prueba (la de `11`) si el equipo está en reposo; los eventos de la secuencia salen como `[DIAG +ms]`. Las letras aceptan mayúsculas, y los espacios y tabuladores alrededor del comando se ignoran. Una línea ambigua (`12`, `1x`, `01`, `1 0`) o de más de 16 caracteres se rechaza como «Comando desconocido»: el firmware nunca ejecuta el comienzo de una línea, de modo que `10` no dispara `1`.

| Comando | Acción |
| :--- | :--- |
| `1` | Adquisición nueva de batería: ADC crudo de 12 bits, milivoltios calibrados en IO34, tensión de celda y porcentaje estimado. Promedia ocho conversiones crudas y ocho calibradas, tomadas consecutivamente. Bajo 2,50 V indica «no conectada»; también puede ser descarga profunda. Sobre 4,30 V indica tensión inválida. |
| `2` | Tono del buzzer durante **2 segundos**. Respeta la configuración de silencio (`BUZZER_HABILITADO`). |
| `3` / `4` / `5` | LED **azul / rojo / verde**, respectivamente, durante 1 segundo. |
| `11` | Secuencia de luces: las tres juntas 2 s, luego sólo rojo 1 s, sólo verde 1 s y sólo azul 1 s, y todo apagado. El monitor anuncia cada paso; `x` la cancela. No se inicia con batería baja ni con un aviso de LED en curso. |
| `6` | Lectura nueva sólo del BME280: temperatura, presión atmosférica y humedad. Un BMP280 entrega temperatura y presión, con humedad sin dato. No consulta la sonda. |
| `7` | Energiza la sonda por el MOSFET de IO5, espera su estabilización y lee los siete registros Modbus (4.800 baudios y, si no hay respuesta, 9.600), **independientemente de la batería**. Valida CRC y rangos por separado. Apaga IO5 al terminar, fallar o cancelar. No consulta el BME280 ni publica telemetría. |
| `8` | Estado de la pila BLE, configuración GATT, conexión, anuncio, reanuncio pendiente, solicitud de lectura y ventana PAIR. Incluye nombre, UUID del servicio y los cinco bytes de la característica de estado. No certifica la recepción por un teléfono. |
| `9` | Diagnóstico del bus I2C: recorre las direcciones `0x08` a `0x77`, una por vuelta del bucle, y lista las que responden y los errores distintos de «no hay dispositivo». En `0x76` y `0x77` lee el registro de identidad (`0xD0`) para distinguir BME280 (`60`), BMP280 (`58`) u otro modelo. Al final informa el total y los pines SDA (IO21) y SCL (IO22). |
| `10` | Barrido RS-485: energiza IO5, espera la estabilización y, a 2.400, 4.800 y 9.600 baudios, envía la lectura a la dirección 1 y la consulta de identidad del manual (dirección comodín `FF`, registro `0x07D0`). Muestra lo transmitido y los bytes recibidos en 300 ms, sin validar CRC (hasta 64 bytes). Avanza por pasos sin bloquear el bucle; `x` lo cancela. Apaga IO5 al terminar o cancelar. Sirve para buscar la velocidad o la dirección cuando `7` no recibe respuesta. |
| `d` / `D` | Repite el menú. |
| `x` | Cancela salidas y capturas locales, apagando el MOSFET. Conserva avisos normales y capturas de la app. |
| `q` | Cancela la prueba local y cierra el menú; exige `d` o `D` para volver a entrar. |

Las opciones `1`–`7` y `9`–`11` se rechazan si hay una captura, conexión BLE, ventana PAIR o pulsador PAIR presionado (con su antirrebote); `8` permite consultar BLE también con el teléfono conectado. Sólo se prueba una salida a la vez. Los temporizadores de LEDs y buzzer no usan `delay`: el bucle sigue atendiendo al equipo. Una conexión BLE o PAIR cancela las salidas y las capturas locales para dar paso a la app, y lo avisa de inmediato; un aviso normal del LED o buzzer tiene prioridad sobre su prueba.

Cada lectura nueva lleva una línea `HEX` después de sus datos, terminada en `\n`: `1` muestra ADC crudo, milivoltios y el byte de porcentaje (`FF` sin dato); `6` muestra el bloque ambiental empaquetado de cuatro bytes, correspondiente a los índices 16–19 del contrato BLE; `7` muestra la respuesta Modbus recibida con CRC, sin eco ni ruido inicial cuando es válida (si falla, muestra los bytes recibidos del último intento, o indica que no llegaron bytes); `8` muestra los cinco bytes de estado GATT; `9`, la dirección de cada dispositivo y su registro de identidad; `10`, lo transmitido (`HEX TX`) y lo recibido (`HEX RX`) en cada consulta. Son formatos distintos y quedan identificados: el bloque ambiental no es una lectura cruda de registros I2C. LEDs y buzzer informan la orden ejecutada; no generan tramas de sensor.

La detección de batería requiere el divisor conectado: IO34 flotante puede producir una tensión que parezca válida. Sin batería ni divisor, conectar IO34 a GND durante la prueba. El porcentaje sigue siendo una estimación por tensión, pendiente de calibración física.

La opción `7` comprueba la sonda sin batería; las reglas completas de la app (suelo descartado si la batería es inválida y trama de 20 bytes) se verifican midiendo desde la app, y el monitor muestra cada trama notificada en hexadecimal (`[TRAMA]`). Ninguna lectura de diagnóstico se usa para enviar una medición posterior a la app.

Los informes del menú salen en fragmentos de hasta 64 bytes por vuelta, limitados por el espacio disponible del puerto, y se retienen mientras hay una captura en curso; un comando nuevo sustituye el informe pendiente. Los avisos de inicio de `7` y `9`, y el de cancelación por BLE/PAIR, salen de inmediato, antes de los mensajes y del resultado de esa prueba. Los mensajes operativos (`[SONDA]`, `[I2C]`, `[DIAG]`, `[BLE]`, `[PAIR]`) se escriben directo y muestran el avance antes del resultado. Nada de esto viaja en la trama BLE. El monitor confirma que **ordenó** una salida: comprobar físicamente luz y sonido sigue siendo necesario.

Para verificar en banco: enviar `1`–`10` antes de `d` y comprobar que no ejecutan pruebas; entrar con `D` y probar las terminaciones LF, CR y CRLF, y que `12` o `1x` se rechazan. Revisar `1` con y sin batería y contra un multímetro; comprobar los 2 s de `2`, los colores de `3`–`5` y los tiempos y el orden de `11` (también al entrar con `d`), y que PAIR la interrumpe. Probar `6` y `9` con BME280, BMP280 y sin sensor; probar `7` y `10` sin batería con sonda presente y ausente, comprobando IO5 alto durante la adquisición y bajo al terminar, fallar o cancelar con `x`/`q`. Consultar `8` con y sin teléfono, iniciar PAIR durante una prueba y medir desde la app. Tras `q`, comprobar que los números vuelven a quedar inactivos.

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
4. Compilar y subir. Monitor serie a **115200 baudios**: **`d` o `D`** abre el menú de diagnóstico y **`7`** pide una lectura de la sonda sin depender de la batería ([prueba en banco](TASK.md#prueba-de-la-sonda-en-banco)). También conserva los eventos del pulsador, la vinculación, la respuesta de la sonda y cada trama en hexadecimal.
