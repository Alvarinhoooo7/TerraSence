# Firmware: estado, prueba y pendientes

Alcance vigente: **vinculación BLE con la app, pulsador PAIR, indicadores LED y trama de 20 bytes activa**. La lectura de la sonda de suelo no está implementada y no se simula: todo campo sin lectura viaja en `0xFF`. Descripción del firmware en [README.md](README.md).

## Hecho

| Bloque | Qué hace | Verificado |
| :--- | :--- | :--- |
| Pulsador PAIR (IO33) | Antirrebote de 30 ms sin bloquear el bucle. 3 s abren la ventana de 30 s; 10 s borran el código y reinician. | Compila. Falta en hardware. |
| Anuncio BLE | Servicio `…6101` en el paquete principal y el nombre en la respuesta de escaneo: `TerraSense` sin código, `TerraSense-<código>` con código. Se reanuda tras cada desconexión. | Compila. Falta con la app. |
| Identidad `…6103` | Lectura: código de 15 dígitos en ASCII, o valor vacío. | Compila. Falta con la app. |
| Provisión `…6104` | Acepta el código sólo con la ventana abierta, sin código previo y con formato `^[1-9]\d{14}$`. Lo guarda en NVS, cierra la ventana y cambia el nombre anunciado. Si lo rechaza, lo ignora y lo informa por el monitor serie. | Compila. Falta con la app. |
| Telemetría `…6102` | Al suscribirse la app arma una trama nueva de 20 bytes, versión 1, y la notifica una vez. | La app real rechaza las tramas `FF` («Batería BLE inválida») y no guarda nada: comprobado con `decodeTelemetry`. |
| BME280 | Driver propio por I2C (0x76/0x77) en modo forzado, con la compensación de Bosch. Si no responde se envían centinelas; se vuelve a buscar en cada lectura. | Compila. Sin sensor para validarlo. |
| LEDs | Apagados en reposo; sólo avisos breves y la ventana PAIR (tabla del README). Encendido/apagado simple, sin PWM. | Compila sin advertencias. Falta en hardware. |
| Batería (IO34) | Lectura calibrada del ADC, divisor ×2, aviso bajo 3,40 V con histéresis hasta 3,50 V; se ignora bajo 2,5 V (sin celda). No entra en la trama sin lectura de suelo. | Compila. Divisor y umbral sin confirmar. |

Compilación: `arduino-cli` del Arduino IDE, núcleo esp32 3.3.0, placa ESP32 Dev Module, sin advertencias en los archivos del firmware. El programa ocupa el 88 % de la partición por defecto.

## Procedimiento de prueba con la app

Requisitos:
- Build de desarrollo de la app con el módulo BLE nativo (Expo Go no lo trae).
- Una cuenta de prueba.
- El monitor serie abierto a 115200 baudios.

| Paso | Acción | Resultado esperado |
| :---: | :--- | :--- |
| 1 | Cargar el firmware y encender. | 🟢 fijo 1 s y luego todo apagado. Serie: `Sin código`, `Anunciando como "TerraSense"`. |
| 2 | Mantener PAIR 3 s. | 🔵 parpadeo 2 Hz. Serie: `Ventana de vinculación abierta por 30 s`. |
| 3 | En la app, Onboarding «Vincula tu sonda» o Mis dispositivos → registrar. | La app encuentra la sonda y se conecta. Serie: `conectado` / `desconectado`. App: «La encontramos.» |
| 4 | Escribir el nombre y guardar **antes de que se cierre la ventana**. | 🟢 tres destellos y el azul se apaga. Serie: `Código … guardado; ventana cerrada` y `Anunciando como "TerraSense-…"`. La app registra el equipo con el mismo código que muestra el monitor serie. |
| 4b | Si pasaron los 30 s. | 🔴 tres destellos. App: «La sonda no confirmó el código. Mantén PAIR 3 segundos y reintenta». Serie: `Código rechazado: la ventana … está cerrada`. Mantener PAIR 3 s y volver a guardar. |
| 5 | Reiniciar el ESP32. | Serie: `Código guardado: …`, igual que en el paso 4. Confirma que el código persiste en NVS. |
| 6 | Medir desde la app. | Serie: `[TRAMA] FF … FF 01 FF FF FF FF (notificada)`. 🔴 tres destellos. App: «La sonda no entregó lectura de suelo…». **Es el resultado correcto**: prueba que llegaron los 20 bytes con versión 1 y que no se guardó una medición inventada. El historial no debe tener mediciones nuevas. |
| 7 | Mantener PAIR 10 s. | 🔵 parpadea desde los 3 s. A los 10 s, 🔴 fijo 1 s y reinicia como `TerraSense` sin código. El equipo sigue registrado en Supabase con el código anterior: eliminarlo de la cuenta de prueba antes de repetir. |

El mensaje del paso 6 requiere una app compilada con el centinela de suelo; una versión anterior muestra «Batería BLE inválida», que también es correcto (no guarda nada). Si en el paso 3 la app muestra «No se pudo verificar la identidad de la sonda», ver el pendiente A2.

## Pendiente de implementación

### Firmware

| # | Tarea | Detalle |
| :---: | :--- | :--- |
| F1 | Driver Modbus RS-485 de la sonda 7-en-1 | Confirmar el mapa de registros con el proveedor; la consulta documentada `01 03 00 00 00 07 04 08` es una suposición. Encender la sonda por GATE, esperar a que se estabilice, controlar RTS y validar dirección, función, longitud y CRC. Ante fallo o timeout: error de sonda. Con lectura válida se llena `LecturaSuelo` y se envía la batería. |
| F2 | Porcentaje de batería | Confirmar el divisor 100k/100k en el PCB armado, calibrar contra un multímetro, definir la curva tensión → % de la celda y validar el umbral de 3,40 V. |
| F3 | Validar el BME280 | Conectar el sensor y comparar temperatura, humedad y presión con una referencia antes de dar por buenos sus valores. |
| F4 | Reposo profundo | Despertar por IO33 (ext0), dormir tras desconectar. Definir si la sonda anuncia siempre o sólo tras una pulsación; la app asume que vuelve a reposo después de cada lectura. |
| F5 | IO5 como pin de arranque | Comprobar con osciloscopio que el MOSFET no se activa durante el reset; si lo hace, agregar un pull-down o mover GATE a otro pin. |
| F6 | Seguridad BLE | No hay cifrado ni bonding: cualquier teléfono cercano puede leer la identidad y la telemetría. |
| F7 | Prueba automatizada de `armarTrama` | Compararla en el host contra el vector de ejemplo de `docs/CONTRATO_BLE.md`. Hoy sólo está revisada contra el contrato; el equipo no tiene un compilador C++ para el host. |

### App y contrato (fuera de este directorio)

| # | Tarea | Detalle |
| :---: | :--- | :--- |
| A1 | Rangos de suelo | El centinela «sin lectura de suelo» (bytes 0-14 en `FF`) ya está en el contrato y en `decodeTelemetry`. Falta validar los rangos de cada campo de suelo (humedad ≤ 100 %, pH ≤ 14) cuando exista el driver Modbus. |
| A2 | Identidad vacía | El firmware publica un valor de 0 bytes cuando no tiene código. `readAssignedCode` lo acepta sólo si llega como `''`; un `null` lo trata a propósito como lectura fallida (prueba en `App/tests/onboardingAudit.test.ts`), para no dar por nueva una sonda que sí tiene código. Comprobar en el teléfono qué entrega `react-native-ble-plx`: si en el paso 3 aparece «No se pudo verificar la identidad de la sonda» con una sonda recién borrada, la pila entrega `null` y hay que decidir cómo distinguirlo de un fallo. |
| A3 | Ventana de 30 s y el nombre | En el Onboarding, el código se escribe después de que el usuario pone el nombre. Si tarda más de 30 s desde que soltó PAIR, falla y hay que repetir. Opciones: provisionar antes de pedir el nombre o alargar la ventana. |
| A4 | Vincular sin pulsador | `pairWithNearbyProbe` acepta cualquier sonda que anuncie el servicio. Una sonda que ya tiene código y no está registrada en Supabase puede quedar vinculada sin tocar PAIR. Una sonda ya registrada está protegida: la base rechaza el código duplicado. |

### Documentación

| # | Tarea |
| :---: | :--- |
| D1 | `CLAUDE.md` §4 dice «No hay firmware del ESP32 en este repositorio». Actualizarlo al versionar este directorio (`docs/CONTRATO_BLE.md` ya está corregido). |
