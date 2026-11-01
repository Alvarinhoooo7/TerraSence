# Firmware: estado, prueba y pendientes

Alcance vigente: **vinculación BLE con la app, pulsador PAIR, indicadores LED y sonoros, lectura Modbus de la sonda de suelo y trama de 20 bytes activa**. La lectura de suelo está implementada y validada en banco al aire (1.000 de 1.000 lecturas sin error de CRC, 31-10-2026), y falta contrastarla en agua, en tierra y con soluciones patrón (F1); nunca se simula: todo campo sin lectura viaja en `0xFF`. Descripción del firmware en [README.md](README.md).

## Hecho

| Bloque | Qué hace | Verificado |
| :--- | :--- | :--- |
| Pulsador PAIR (IO33) | Antirrebote de 30 ms sin bloquear el bucle. 3 s abren la ventana de 30 s. **No hay pulsación de reset**: el único reset es el del backoffice. | Compila. Falta en hardware. |
| Anuncio BLE | Servicio `…6101` en el paquete principal y el nombre `TerraSense-<ID>` en la respuesta de escaneo. Se reanuda tras cada desconexión. | Compila. Falta con la app. |
| Identidad `…6103` | Lectura: el ID de 15 dígitos en ASCII, derivado de la MAC base del ESP32 (`esp_efuse_mac_get_default`, 48 bits en decimal con ceros a la izquierda). Siempre presente; no se guarda ni se borra. | Compila sin advertencias. Falta comparar con la MAC real en hardware. |
| Confirmación `…6104` | La app escribe el ID tras registrar la sonda. Se acepta sólo con la ventana abierta y si coincide con el de la sonda: cierra la ventana y avisa con verde y buzzer. No guarda nada. | Compila. Falta con la app. |
| Telemetría `…6102` | Al suscribirse la app arma una trama nueva de 20 bytes, versión 1, y la notifica una vez. | La app rechaza la trama sin suelo («La sonda no entregó lectura de suelo») y no guarda nada: comprobado con `decodeTelemetry` y `App/tests/probeTelemetry.test.ts`. |
| BME280 | Driver propio por I2C (0x76/0x77) en modo forzado, con la compensación de Bosch. Acepta también un BMP280 (ID 0x58, sin humedad: la humedad viaja como centinela). Al arrancar escanea el bus e informa qué direcciones responden y, si no lo encuentra, si el bus está mudo (cableado, alimentación, CSB/SDO), si hay otros dispositivos o un chip de otro modelo. Si no responde se envían centinelas; se vuelve a buscar en cada lectura. | En banco (31-10-2026) responde un BME280 real en `0x76` (identidad `0x60`): 23,2 °C, 959,7 hPa y 60,3 % HR. Falta contrastarlo contra una referencia (F3). |
| LEDs | Apagados en reposo; sólo avisos breves y la ventana PAIR (tabla del README). Encendido/apagado simple, sin PWM. | Compila sin advertencias. Falta en hardware. |
| Buzzer (IO19) | Tonos por LEDC con el mismo significado que los LEDs (tabla del README), en secuencias no bloqueantes. | Compila sin advertencias. Falta en hardware; ver H1. |
| Característica de estado `…6105` | 5 bytes: batería en % (curva LiPo típica, sin calibrar), versión `FIRMWARE_VERSION_*` y banderas (bit 0 = ventana PAIR abierta), legible en cualquier momento. La app la lee en cada contacto y la informa a Supabase. | Compila sin advertencias. Falta leerla con nRF Connect en hardware. |
| Batería (IO34) | Lectura calibrada del ADC, divisor ×2, aviso bajo 3,40 V con histéresis hasta 3,50 V; se ignora bajo 2,5 V (sin celda). No entra en la trama sin lectura de suelo. | Compila. Divisor y umbral sin confirmar. |
| Monitor de mantenimiento | Acceso sólo con `d`/`D` y un comando por línea; `1` mide ADC y batería, `2` buzzer 2 s, `3` azul, `4` rojo, `5` verde, `6` ambiente nuevo, `7` sonda independiente de batería con MOSFET, `8` estado BLE, `9` diagnóstico I2C, `10` barrido RS-485 por pasos y cancelable, `11` secuencia de luces (las tres 2 s, rojo, verde y azul 1 s cada una), que también corre al entrar con `d` si el equipo está en reposo y se cancela con `x`, PAIR, BLE o una lectura de la app, `12` ensayo D-14 de 1.000 lecturas Modbus seguidas. Lecturas con hexadecimal identificado en la línea siguiente. `x` cancela la prueba local y `q` cierra el menú. | Falta comprobar salidas físicas, tensiones, duración y convivencia con BLE/PAIR en hardware; procedimiento en [README.md](README.md#monitor-de-mantenimiento). |

El menú `1`–`12` y los sonidos de encendido, ventana PAIR, vinculación y fallo compilan con `arduino-cli` y el núcleo esp32 3.3.0 para ESP32 Dev Module con todas las advertencias, sin advertencias en los archivos del firmware, y generan el BIN para cargar (1,18 MB, 89 % del espacio de programa; 22 de octubre de 2026). Las pruebas de `tests/test_comandos.cpp` y `tests/test_secuencia_leds.cpp` (tiempos de la secuencia, cancelación y desborde de `millis`) pasan al compilar con el g++ del núcleo. Falta cargarlo al equipo y comprobar de oído y a la vista los sonidos y la secuencia. La documentación pasa su verificador con cero errores.

## Procedimiento de prueba con la app

Requisitos:
- Build de desarrollo de la app con el módulo BLE nativo (Expo Go no lo trae).
- Una cuenta de prueba.
- El monitor serie abierto a 115200 baudios.

| Paso | Acción | Resultado esperado |
| :---: | :--- | :--- |
| 1 | Cargar el firmware y encender. | 🟢 fijo 1 s con tres notas que suben y luego todo apagado. Serie: `ID de la sonda (desde la MAC): …` y `Anunciando como "TerraSense-…"` con ese mismo ID. |
| 2 | En la app, Onboarding «Vincula tu sonda» o Mis dispositivos → registrar, **sin** tocar PAIR. | App: «Mantén el botón PAIR de la sonda 3 segundos…». No se registra nada. |
| 3 | Mantener PAIR 3 s y volver a buscar desde la app. | 🔵 parpadeo 2 Hz y una doble llamada aguda. La app encuentra la sonda. Serie: `conectado` / `desconectado`. |
| 4 | Escribir el nombre y guardar. | La app registra el equipo con el ID del monitor serie. Si la ventana sigue abierta: 🟢 tres destellos con tres notas de confirmación y el azul se apaga (serie: `Vinculación confirmada`). Si ya pasaron los 30 s, el equipo queda registrado igual y la sonda sólo avisa en rojo. |
| 5 | Reiniciar el ESP32. | El mismo ID en el monitor serie: sale de la MAC, no de algo guardado. |
| 6 | Medir desde la app. | Serie: `[TRAMA] FF … FF 01 FF FF FF FF (notificada)`. 🔴 tres destellos y dos notas que bajan. App: «La sonda no entregó lectura de suelo…». **Es el resultado correcto**: prueba que llegaron los 20 bytes con versión 1 y que no se guardó una medición inventada. |
| 7 | Resetear el equipo desde el backoffice y volver a vincularlo (pasos 3 y 4). | Reaparece con el mismo ID y quien lo vincula queda como administrador, aunque sea otra cuenta. Depende de la migración `20260928130000`, aplicada el 28-09-2026 ([supabase §10.0.2](../supabase/README.md#1002-reset-sólo-desde-el-backoffice-28-09-2026)). |

Si la app muestra «No se pudo verificar la identidad de la sonda», la sonda tiene un firmware anterior al ID por MAC: cargar este.

## Prueba de la sonda en banco

Sirve para F1 sin la app ni la batería. La sonda va directo a 5 V (no hace falta el MOSFET de IO5) y el ESP32 por USB.

1. Cables de la sonda: café a +5 V, negro a GND, amarillo a A del transceptor y azul a B. El GND de la fuente de la sonda tiene que ser el mismo del ESP32.
2. Transceptor SP3485 a 3,3 V: su salida del receptor (RO) a IO16, la entrada del driver (DI) a IO17 y RTS a IO4. En el módulo SparkFun BOB-10124, `RX-I` es la entrada del driver (va a IO17) y `TX-O` la salida del receptor (va a IO16): conectarlos «TX con TX» deja la sonda muda. Ese módulo además escucha mientras transmite, así que la propia consulta vuelve como eco antes de la respuesta; el firmware la descarta.
3. IO34 a GND mientras no haya batería ni divisor: un pin flotante da tensiones al azar que pueden parecer una celda.
4. Monitor serie a 115200 baudios: enviar **`d` o `D`** y luego **`7`**. Se activa IO5 para energizar la sonda, se espera la estabilización y se muestran los siete datos con su respuesta Modbus hexadecimal y CRC. IO5 vuelve a LOW al terminar, incluso ante un fallo; `x` cancela y apaga. La batería no condiciona esta prueba. Si aparece «fuera de rango», revisar los registros y las escalas. Las reglas completas de la app, que sí descartan el suelo cuando la batería es inválida, se comprueban midiendo desde la app.
5. Comparar con la realidad: sonda al aire, humedad cerca de 0 y CE cerca de 0; en un vaso con agua, humedad alta; temperatura parecida a la del ambiente. Un pH × 100 (p. ej. `pH 650`) indicaría otra escala.

| Monitor serie | Causa probable |
| :--- | :--- |
| `sin respuesta` a 4.800 y a 9.600 | Sin alimentación o sin GND común, A y B invertidos (inofensivo: intercambiarlos), RO y DI invertidos, RTS sin conectar o sonda con otra dirección o velocidad. La opción **`10`**, dentro del menú abierto con **`d`**, permite investigar las dos últimas: envía la lectura a la dirección 1 y la consulta de identidad del manual (dirección comodín `FF`, registro `0x07D0`) a 2.400, 4.800 y 9.600 baudios, y muestra los bytes crudos. Si las seis dicen «nada», el problema es de cableado. Un solo `00` por intento es el ruido del bus al pasar a recepción, no una respuesta. |
| `CRC`, `direccion` o `respuesta truncada` | Ruido o pérdida de los primeros bytes: revisar GND común, cable y la conexión de RTS. La línea `[SONDA] Bytes recibidos` muestra lo que llegó. Uno o más bytes sueltos (típicamente `00`, `80` o `FF`) antes de `01 03 0E` son el bus flotando al pasar a recepción: el firmware descarta hasta 24 bytes (eco incluido) antes de la trama, pero la solución es polarizar el bus, con 4,7 kΩ de A a 3,3 V y 4,7 kΩ de B a GND (en la placa V2 lo hacen `R12` y `R13`). |
| `Se descartaron N bytes` tras una lectura buena | Normal con un transceptor que escucha mientras transmite: los 8 primeros son el eco de la consulta. Si son más, hay además ruido del bus y conviene polarizarlo. La lectura es válida (la valida el CRC). |
| `CRC` repetido | La trama llega con bits alterados: polarizar el bus, revisar GND común y el empalme del cable. El firmware reintenta dos veces por velocidad. |
| `excepcion` | La sonda responde pero rechaza la consulta: revisar dirección, función y cantidad de registros. |

Para que la app reciba una medición completa hace falta una tensión válida en IO34 (entre 1,25 y 2,15 V, es decir, 2,5 a 4,3 V después del divisor ×2): la batería real con su divisor o, en banco, un divisor desde 3,3 V (por ejemplo 68 kΩ arriba y 100 kΩ abajo, ≈ 1,96 V, se lee como 3,9 V). Esa batería es de banco: no la des por calibrada (F2).

## Pendiente de implementación

Orden, dependencias y criterios de aceptación en [PLAN.md](PLAN.md#orden-de-trabajo). Primer objetivo: una medición real de suelo y ambiente recibida y guardada por la app; después reposo profundo y actualización por BLE. El plan distingue pruebas en computador de validación física y conserva los identificadores F/H/A/D de este inventario.

### Firmware

| # | Tarea | Detalle |
| :---: | :--- | :--- |
| F1 | Validar el driver Modbus con la sonda real | Implementado sin ensayo: `sonda.cpp` energiza la sonda por IO5, consulta por UART2 (IO16/IO17, DE/RE en IO4) con `modbus.cpp` y prueba 4.800 y luego 9.600 baudios. El mapa de `config.h` (dirección 1, 4.800 8N1, función 03, siete registros desde 0x0000) coincide con el manual de ComWinTop para la CWT-Soil-NPKPHCTH-S; en banco (03-10-2026) la muestra respondió a 4.800 baudios en la dirección 1, con la sonda al aire: temperatura 21,2 °C, coherente con el ambiente, humedad y CE 0 y pH 8,6. Esa primera trama llegó con el CRC dañado; se corrigió el fin de la transmisión (RTS bajaba antes del último bit) y la recepción del eco. Con eso, la ruta de captura completa (entonces la opción `m` del menú, hoy retirada) entregó la primera lectura válida, con el CRC correcto y la sonda al aire: humedad 0 %, 21,5 °C, CE 0 µS/cm, pH 8,6 (sin significado en seco) y N, P y K en 0. En banco (31-10-2026) el ensayo `12` dio 1.000 de 1.000 lecturas sin error de CRC ni reintentos (respuesta de 64 a 74 ms), repetido con igual resultado con la sonda a 4,54 V. Falta medir en agua y en tierra húmeda, y el pH contra soluciones patrón. Falta también medir cuánto tarda la sonda en entregar valores estables tras energizarla por el MOSFET: `SONDA_ESTABILIZACION_MS` (1 s) no sale del manual. Una escala distinta (p. ej. pH × 100) hace que la trama se descarte, no que llegue un valor errado. |
| F2 | Porcentaje de batería | Confirmar el divisor 100k/100k en el PCB armado, calibrar contra un multímetro, definir la curva tensión → % de la celda y validar el umbral de 3,40 V. La app avisa al 15 % y se rearma sobre 20 % ([`batteryWarning.ts`](../App/src/utils/batteryWarning.ts)); revisar ese umbral con la curva calibrada. |
| F3 | Validar el BME280 | Conectar el sensor y comparar temperatura, humedad y presión con una referencia antes de dar por buenos sus valores. |
| F4 | Reposo profundo | Hoy el equipo espera a 80 MHz con anuncio cada 152,5–162,5 ms: 56,2 mA en la entrada USB del prototipo (FNB58, 31-10-2026), frente a 73,8 mA a 240 MHz con anuncio cada 20–40 ms. Un anuncio de ~420 ms dejó 2 de 5 mediciones sin encontrar el equipo. El reposo ligero automático exige `CONFIG_PM_ENABLE`, que el núcleo de Arduino trae desactivado. Despertar por IO33 (ext0), dormir tras desconectar. Definir si la sonda anuncia siempre o sólo tras una pulsación; la app asume que vuelve a reposo después de cada lectura. |
| F5 | IO5 como pin de arranque | Comprobar con osciloscopio que el MOSFET no se activa durante el reset; si lo hace, agregar un pull-down o mover GATE a otro pin. |
| F8 | Actualización por BLE (OTA) | Protocolo, partición y arranque seguro en [PLAN.md](PLAN.md). El backoffice ya carga, publica y envía binarios; falta que el firmware los reciba. **Decidir la partición antes de repartir equipos**: sólo se cambia por USB. |
| F6 | Seguridad BLE | No hay cifrado ni bonding: cualquier teléfono cercano puede leer la identidad y la telemetría. |
| F7 | Prueba automatizada de `armarTrama` | Compararla en el host contra el vector de ejemplo de `docs/CONTRATO_BLE.md`. Hoy sólo está revisada contra el contrato; el equipo no tiene un compilador C++ para el host. |

### Hardware (placa V2 fabricada)

| # | Tarea | Detalle |
| :---: | :--- | :--- |
| H1 | Corriente del buzzer en IO19 | `BZ1` va directo entre IO19 y GND, sin transistor ni diodo de rueda libre. Un 9042 magnético tiene una bobina de 16 a 42 Ω: a 3,3 V puede pedir más de los 20 mA recomendados para un GPIO del ESP32 (40 mA máximo absoluto), y la bobina devuelve picos inductivos al pin. Con la hoja de datos del modelo comprado, medir la corriente con el multímetro en serie. Si supera ~20 mA: en esta placa, resistencia en serie de 47 a 100 Ω (cortando la pista o levantando una pata); en la siguiente revisión, excitarlo con un transistor (el AO3400A ya está en la BOM) y un diodo 1N4148 en antiparalelo con el buzzer. |
| H2 | Frecuencia de resonancia | Ajustar `BUZZER_FRECUENCIA_HZ` a la resonancia de la hoja de datos y confirmar de oído que se escucha al aire libre. |

### App y contrato (fuera de este directorio)

| # | Tarea | Detalle |
| :---: | :--- | :--- |
| A1 | Rangos de suelo | El centinela «sin lectura de suelo» (bytes 0-14 en `FF`) ya está en el contrato y en `decodeTelemetry`. El firmware ya descarta una lectura fuera de los rangos del manual de la sonda (`sueloPublicable` en `trama.h`: humedad ≤ 100 %, temperatura de −40 a +80 °C, CE ≤ 20.000 µS/cm, pH ≤ 14, N, P y K ≤ 1.999 mg/kg). Falta la misma validación en `decodeTelemetry` como segunda barrera. |
| A3 | Ventana de 30 s y el nombre | La ventana se comprueba al buscar la sonda, antes de pedir el nombre: registrar ya no depende de terminar dentro de los 30 s. Sólo el aviso verde de la sonda lo requiere. Resuelto. |
| A4 | Vincular sin pulsador | Resuelto: la app sólo registra una sonda con la ventana PAIR abierta (byte de banderas de la característica de estado). Queda un límite de la base, **aceptado**: `register_paired_device` acepta el ID de una sonda libre sin prueba física, así que alguien que conozca el ID (se anuncia por BLE) podría registrarla llamando a la API directamente. Vale para una sonda nueva y para una recién reseteada por el backoffice, que queda libre para revincularse. Una sonda con dueño está protegida. |

### Documentación

| # | Tarea |
| :---: | :--- |
| D1 | `PCB/README.md` conserva designadores y nets de antes de dibujar el esquemático (por ejemplo, LEDs en `GPIO2` y `GPIO15`). Mientras no se reescriba, el esquemático de KiCad y `pines.h` mandan; su mapa de pines (5.7) ya está al día. |
