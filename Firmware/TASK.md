# Firmware: estado, prueba y pendientes

Alcance vigente: **vinculación BLE con la app, pulsador PAIR, indicadores LED y sonoros y trama de 20 bytes activa**. La lectura de la sonda de suelo no está implementada y no se simula: todo campo sin lectura viaja en `0xFF`. Descripción del firmware en [README.md](README.md).

## Hecho

| Bloque | Qué hace | Verificado |
| :--- | :--- | :--- |
| Pulsador PAIR (IO33) | Antirrebote de 30 ms sin bloquear el bucle. 3 s abren la ventana de 30 s. **No hay pulsación de reset**: el único reset es el del backoffice. | Compila. Falta en hardware. |
| Anuncio BLE | Servicio `…6101` en el paquete principal y el nombre `TerraSense-<ID>` en la respuesta de escaneo. Se reanuda tras cada desconexión. | Compila. Falta con la app. |
| Identidad `…6103` | Lectura: el ID de 15 dígitos en ASCII, derivado de la MAC base del ESP32 (`esp_efuse_mac_get_default`, 48 bits en decimal con ceros a la izquierda). Siempre presente; no se guarda ni se borra. | Compila sin advertencias. Falta comparar con la MAC real en hardware. |
| Confirmación `…6104` | La app escribe el ID tras registrar la sonda. Se acepta sólo con la ventana abierta y si coincide con el de la sonda: cierra la ventana y avisa con verde y buzzer. No guarda nada. | Compila. Falta con la app. |
| Telemetría `…6102` | Al suscribirse la app arma una trama nueva de 20 bytes, versión 1, y la notifica una vez. | La app rechaza la trama sin suelo («La sonda no entregó lectura de suelo») y no guarda nada: comprobado con `decodeTelemetry` y `App/tests/probeTelemetry.test.ts`. |
| BME280 | Driver propio por I2C (0x76/0x77) en modo forzado, con la compensación de Bosch. Si no responde se envían centinelas; se vuelve a buscar en cada lectura. | Compila. Sin sensor para validarlo. |
| LEDs | Apagados en reposo; sólo avisos breves y la ventana PAIR (tabla del README). Encendido/apagado simple, sin PWM. | Compila sin advertencias. Falta en hardware. |
| Buzzer (IO19) | Tonos por LEDC con el mismo significado que los LEDs (tabla del README), en secuencias no bloqueantes. | Compila sin advertencias. Falta en hardware; ver H1. |
| Característica de estado `…6105` | 5 bytes: batería en % (curva LiPo típica, sin calibrar), versión `FIRMWARE_VERSION_*` y banderas (bit 0 = ventana PAIR abierta), legible en cualquier momento. La app la lee en cada contacto y la informa a Supabase. | Compila sin advertencias. Falta leerla con nRF Connect en hardware. |
| Batería (IO34) | Lectura calibrada del ADC, divisor ×2, aviso bajo 3,40 V con histéresis hasta 3,50 V; se ignora bajo 2,5 V (sin celda). No entra en la trama sin lectura de suelo. | Compila. Divisor y umbral sin confirmar. |

Compilación: `arduino-cli` del Arduino IDE, núcleo esp32 3.3.0, placa ESP32 Dev Module, sin advertencias en los archivos del firmware. El programa ocupa el 88 % de la partición por defecto.

## Procedimiento de prueba con la app

Requisitos:
- Build de desarrollo de la app con el módulo BLE nativo (Expo Go no lo trae).
- Una cuenta de prueba.
- El monitor serie abierto a 115200 baudios.

| Paso | Acción | Resultado esperado |
| :---: | :--- | :--- |
| 1 | Cargar el firmware y encender. | 🟢 fijo 1 s con un pitido corto y luego todo apagado. Serie: `ID de la sonda (desde la MAC): …` y `Anunciando como "TerraSense-…"` con ese mismo ID. |
| 2 | En la app, Onboarding «Vincula tu sonda» o Mis dispositivos → registrar, **sin** tocar PAIR. | App: «Mantén el botón PAIR de la sonda 3 segundos…». No se registra nada. |
| 3 | Mantener PAIR 3 s y volver a buscar desde la app. | 🔵 parpadeo 2 Hz y un pitido corto. La app encuentra la sonda. Serie: `conectado` / `desconectado`. |
| 4 | Escribir el nombre y guardar. | La app registra el equipo con el ID del monitor serie. Si la ventana sigue abierta: 🟢 tres destellos con dos pitidos y el azul se apaga (serie: `Vinculación confirmada`). Si ya pasaron los 30 s, el equipo queda registrado igual y la sonda sólo avisa en rojo. |
| 5 | Reiniciar el ESP32. | El mismo ID en el monitor serie: sale de la MAC, no de algo guardado. |
| 6 | Medir desde la app. | Serie: `[TRAMA] FF … FF 01 FF FF FF FF (notificada)`. 🔴 tres destellos y tono grave. App: «La sonda no entregó lectura de suelo…». **Es el resultado correcto**: prueba que llegaron los 20 bytes con versión 1 y que no se guardó una medición inventada. |
| 7 | Resetear el equipo desde el backoffice y volver a vincularlo (pasos 3 y 4). | Reaparece con el mismo ID y quien lo vincula queda como administrador, aunque sea otra cuenta. Depende de la migración `20260928130000`, aplicada el 28-09-2026 ([supabase §10.0.2](../supabase/README.md#1002-reset-sólo-desde-el-backoffice-28-09-2026)). |

Si la app muestra «No se pudo verificar la identidad de la sonda», la sonda tiene un firmware anterior al ID por MAC: cargar este.

## Pendiente de implementación

Orden, dependencias y criterios de aceptación en [PLAN.md](PLAN.md#orden-de-trabajo). Primer objetivo: una medición real de suelo y ambiente recibida y guardada por la app; después reposo profundo y actualización por BLE. El plan distingue pruebas en computador de validación física y conserva los identificadores F/H/A/D de este inventario.

### Firmware

| # | Tarea | Detalle |
| :---: | :--- | :--- |
| F1 | Validar el driver Modbus con la sonda real | Implementado sin ensayo: `sonda.cpp` energiza la sonda por IO5, consulta por UART2 (IO16/IO17, DE/RE en IO4) con `modbus.cpp` y prueba 4.800 y luego 9.600 baudios. El mapa de `config.h` (dirección 1, función 03, siete registros desde 0x0000) es el de la familia de la ficha y debe contrastarse con la muestra: comparar el monitor serie (`[SONDA] Registros: …`) con un adaptador USB–RS-485. Una escala distinta (p. ej. pH × 100) hace que la trama se descarte, no que llegue un valor errado. |
| F2 | Porcentaje de batería | Confirmar el divisor 100k/100k en el PCB armado, calibrar contra un multímetro, definir la curva tensión → % de la celda y validar el umbral de 3,40 V. La app avisa al 15 % y se rearma sobre 20 % ([`batteryWarning.ts`](../App/src/utils/batteryWarning.ts)); revisar ese umbral con la curva calibrada. |
| F3 | Validar el BME280 | Conectar el sensor y comparar temperatura, humedad y presión con una referencia antes de dar por buenos sus valores. |
| F4 | Reposo profundo | Despertar por IO33 (ext0), dormir tras desconectar. Definir si la sonda anuncia siempre o sólo tras una pulsación; la app asume que vuelve a reposo después de cada lectura. |
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
| A1 | Rangos de suelo | El centinela «sin lectura de suelo» (bytes 0-14 en `FF`) ya está en el contrato y en `decodeTelemetry`. Falta validar los rangos de cada campo de suelo (humedad ≤ 100 %, pH ≤ 14) cuando exista el driver Modbus. |
| A3 | Ventana de 30 s y el nombre | La ventana se comprueba al buscar la sonda, antes de pedir el nombre: registrar ya no depende de terminar dentro de los 30 s. Sólo el aviso verde de la sonda lo requiere. Resuelto. |
| A4 | Vincular sin pulsador | Resuelto: la app sólo registra una sonda con la ventana PAIR abierta (byte de banderas de la característica de estado). Queda un límite de la base, **aceptado**: `register_paired_device` acepta el ID de una sonda libre sin prueba física, así que alguien que conozca el ID (se anuncia por BLE) podría registrarla llamando a la API directamente. Vale para una sonda nueva y para una recién reseteada por el backoffice, que queda libre para revincularse. Una sonda con dueño está protegida. |

### Documentación

| # | Tarea |
| :---: | :--- |
| D1 | `PCB/README.md` conserva designadores y nets de antes de dibujar el esquemático (por ejemplo, LEDs en `GPIO2` y `GPIO15`). Mientras no se reescriba, el esquemático de KiCad y `pines.h` mandan; su mapa de pines (5.7) ya está al día. |
