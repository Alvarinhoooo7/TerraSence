# Plan de implementación del firmware TerraSense

Plan para pasar del firmware de vinculación a una medición real y, después, a reposo profundo y actualización por BLE. [TASK.md](TASK.md) conserva el inventario de pendientes y las pruebas físicas; aquí se define su orden y aceptación. Las secciones E y O conservan el trabajo de estado y actualización que exige el [backoffice](../Web/TAREAS.md). Una casilla completada no sustituye la validación física indicada en TASK.

## Estado y límites de la revisión

El código ya contiene identidad por MAC, ventana PAIR, anuncio BLE, estado, indicadores, lectura aproximada de batería y driver BME280. `leerSuelo()` devuelve siempre una lectura inválida: no existen todavía adquisición UART/Modbus, reposo profundo ni receptor de actualizaciones. El 88 % de ocupación mencionado más abajo corresponde a la compilación registrada anteriormente; no es una medición nueva.

En esta revisión no se compiló ni se cargó firmware. `arduino-cli`, `pio`, `g++` y `clang++` no se encontraron en PATH; esto no demuestra que no estén instalados fuera de él. Tampoco hay captura real ni manual del modelo de sonda identificado en este plan.

La app permite empezar la integración BLE sin cerrar primero push. Sus pendientes no son exclusivamente físicos: siguen las credenciales FCM/APNs, monitoreo, publicación y la instalación OTA. Además, `decodeTelemetry` aún necesita validar rangos de suelo (A1). No se reactiva push de firmware mientras no exista instalación funcional; la casilla antigua sobre ese aviso en Web/TAREAS no representa el alcance vigente de [TASK_PERMISSIONS](../App/TASK_PERMISSIONS.md).

## Reglas de implementación

- Mantener la trama única de 20 bytes, versión 1, UUID existentes, identidad por MAC y reset exclusivo del backoffice.
- No inventar registros, escalas, lecturas ni batería. Los vectores artificiales se usan sólo en pruebas aisladas; nunca como modo de medición del firmware.
- Separar «implementado y probado en computador» de «validado en placa». No cerrar F1, F2 o F3 sólo porque compilen.
- Cada operación termina con tiempo acotado y libera alimentación de la sonda y dirección RS-485 al fallar, cancelar o desconectarse.
- Usar el esquemático V2 y `pines.h` como referencia. Los textos antiguos de PCB no autorizan cambiar pines.

## Orden de trabajo

### P0. Preparar compilación y ficha del sensor — F1, F5, H1, D1

**Dependencias:** ninguna. **Alcance:** pequeño; `platformio.ini`, README y TASK.

- [ ] Localizar o preparar Arduino-ESP32 3.3.0 y un compilador C++ para pruebas de lógica; fijar comando reproducible, placa, flash y partición efectiva. Configurar exclusiones si se añaden pruebas bajo `src_dir = .`.
- [ ] Identificar fabricante/modelo y registrar fuente de dirección, velocidad, paridad, función, registros, escalas, signo, rangos y tiempo de estabilización. La consulta de siete registros, 9600/8N1 y los 100 ms del texto de PCB siguen siendo hipótesis hasta confirmarlas.
- [ ] Antes de energizar el conjunto, comprobar alimentación, masa, GATE, RTS y divisor contra la placa; resolver el ensayo del buzzer y el comportamiento de IO5 durante reset descritos en TASK. Actualizar sólo las referencias de PCB que se comprueben.

**Verificación:** compilar el estado inicial, registrar tamaño real y comprobar mapa de pines; contrastar manual con una captura usando adaptador USB–RS-485 cuando haya hardware. Sin manual se puede avanzar en P1 y en el transporte genérico de P2, pero no activar un mapa supuesto como lectura real.

### P1. Probar el contrato binario — F7

**Dependencias:** compilador de P0. **Alcance:** pequeño; `trama.h` y pruebas C++ nuevas dentro de Firmware.

- [ ] Ejecutar el `armarTrama` real en el computador y comparar byte a byte con el vector de [CONTRATO_BLE](../docs/CONTRATO_BLE.md).
- [ ] Cubrir temperatura negativa, suelo ausente, ambiente parcial/ausente y límites, incluidos valores no finitos del ambiente.
- [ ] Verificar esos mismos vectores con el decodificador de la app; mantener siempre 20 bytes y versión 1.

**Verificación:** pruebas C++ y `App/tests/probeTelemetry.test.ts`, además de compilación ESP32. No reescribir el empaquetador en otro lenguaje para probar una copia.

### P2. Transporte Modbus acotado — primera parte de F1

**Dependencias:** P0; configuración concreta bloqueada por la ficha del sensor. **Alcance:** medio; módulo `modbus.h/.cpp` propuesto, configuración y pruebas.

- [ ] Construir solicitudes con CRC calculado y analizar respuestas comprobando dirección, función, excepciones, cantidad de bytes y CRC antes de acceder a registros.
- [ ] Controlar UART y RTS, esperar el fin de transmisión antes de recibir y tratar respuestas parciales, sobrantes, timeout y reintentos limitados sin bloquear indefinidamente el bucle.
- [ ] Separar el transporte de las escalas del sensor y clasificar fallos para diagnóstico serie, sin convertir fallos en ceros ni reutilizar una captura anterior.

**Verificación:** casos aislados de CRC correcto/alterado, respuesta truncada, excepción, dirección errónea, silencio y recuperación. En banco, comparar solicitud y respuesta con una captura real.

### P3. Medición completa bajo demanda — segunda parte de F1

**Dependencias:** P1, P2 y mapa confirmado. **Alcance:** medio; `Firmware.ino`, módulo de adquisición propuesto, configuración e interfaz BLE.

- [ ] Reemplazar `leerSuelo()` por estados de encendido, estabilización, consulta, recepción, conversión y apagado. Una suscripción inicia una captura nueva y no permite adquisiciones superpuestas.
- [ ] Convertir registros a `LecturaSuelo`, adquirir ambiente y batería de esa operación, y emitir una única trama. Mantener PAIR e indicadores atendidos; al desconectar, cancelar y evitar entregar la respuesta a una conexión posterior.
- [ ] Acotar estabilización y reintentos dentro del timeout de notificación de la app (15 s), con margen. Si el sensor exige más tiempo, coordinar el cambio con el transporte de la app. Ante fallo de suelo mantener el centinela vigente.

**Verificación:** banco con sonda presente/ausente, cable retirado, timeout y desconexión durante adquisición; comprobar GATE apagado y RTS en recepción en todas las salidas. Una notificación emitida no demuestra recepción o guardado: confirmar también en la app.

### P4. Batería válida y coherente — F2

**Dependencias:** P1; calibración requiere placa, celda y multímetro. Puede prepararse antes de P3. **Alcance:** medio; módulo de batería propuesto, `Firmware.ino`, `trama.h` y pruebas.

- [ ] Separar muestreo, presencia/validez, curva e histéresis; compartir el resultado entre estado y telemetría sin confundir batería ausente con 0 %.
- [ ] Resolver explícitamente el caso suelo válido sin batería válida: el estado admite `FF`, pero la app rechaza batería mayor a 100 en telemetría. `armarTrama` hoy convierte cualquier valor mayor a 100 en 100: no pasarle `FF` porque fabricaría batería llena. Manteniendo el contrato, impedir emitir una medición válida en ese caso y hacer visible el motivo por diagnóstico; si se necesita medir sólo con USB, acordar primero su representación con la app.
- [ ] Calibrar divisor y curva; revisar conjuntamente aviso del firmware y umbrales de la app de `batteryWarning.ts`, sin cambiar valores basándose sólo en una curva teórica.

**Verificación:** pruebas de curva, ausencia e histéresis; mediciones con multímetro en varios niveles y bajo carga. No dar por calibrado el porcentaje sin esa comparación.

### P5. Validar ambiente y aceptación en la app — F3, A1

**Dependencias:** P3 y P4 para recorrido completo. **Alcance:** dos cambios pequeños: BME280/pruebas y decodificador/pruebas de la app.

- [ ] Contrastar compensación del BME280 con vectores de referencia y revisar calibración inválida, desconexión y recuperación; luego comparar con una referencia física.
- [ ] Rechazar humedad de suelo sobre 100 % y pH sobre 14 en el firmware y el decodificador; fijar los demás límites desde la ficha técnica, sin recortar valores inválidos para que parezcan correctos.
- [ ] Verificar captura nueva → 20 bytes → decodificación → guardado local → sincronización; sin ambiente se conservan nulos y sin suelo no se guarda una medición.

**Verificación:** pruebas del driver y telemetría, `npm test` y `npm run type-check` en App; ensayo físico comparando valores crudos, trama y datos guardados. No confundir validación del sensor con auditoría experta de recomendaciones agronómicas.

### Punto de control: primera medición real

- [ ] P1–P5 verificados, sin valores de relleno ni lectura anterior reutilizada.
- [ ] Vinculación, reinicio y revinculación tras reset del backoffice mantienen el mismo ID.
- [ ] Fallos de sensor, batería y conexión no guardan una medición inválida y permiten reintentar.

Éste es el primer objetivo funcional. Push, publicación en tiendas y OTA no lo bloquean.

### P6. Reposo profundo y despertar — F4

**Dependencias:** primera medición real. **Alcance:** medio; bucle, módulo de energía propuesto, pulsador e interfaz BLE.

- [ ] Definir el gesto de despertar y período de disponibilidad, conservando mantener PAIR 3 s para vincular. No dormir tras cualquier desconexión: la app separa búsqueda/vinculación y confirmación en conexiones distintas.
- [ ] Dormir sólo sin adquisición, actualización ni ventana de uso pendiente; apagar periféricos, esperar que se suelte el pulsador y evitar ciclos inmediatos de despertar por IO33 activo.
- [ ] Conservar identidad y permitir nueva medición después de despertar. Actualizar instrucciones de la app si cambia la interacción necesaria para encontrar la sonda.

**Verificación:** consumo real en reposo/medición, despertar, botón sostenido, expiración y reconexión. Medir en la placa completa, incluidos reguladores y periféricos.

### P7. Actualización por BLE — F8

**Dependencias:** reservar particiones en P0 antes de distribuir; implementar después de estabilizar medición. **Alcance:** dividir O1–O4 en cambios de hasta cinco archivos.

- [ ] Cerrar los detalles de protocolo descritos en O2 antes de escribir receptor y emisor; incorporar exclusión entre medición, reposo y actualización.
- [ ] Implementar receptor, integridad, cancelación y recuperación en firmware; demostrar actualización y cortes con cliente de prueba antes de integrar la pantalla móvil.
- [ ] Implementar en la app descarga, comprobación, transferencia, progreso y confirmación por versión. La pantalla actual sólo consulta versiones; el flujo de instalación sigue pendiente.

**Verificación:** O4 y pruebas de protocolo. Publicar «instalada» sólo al reconectar y comprobar versión. La recepción correcta del binario no basta.

### P8. Seguridad y aceptación del conjunto — F6, H2, D12 y P7 de la app

**Dependencias:** P5 para medición; P7 para distribución con OTA. **Alcance:** revisión y cambios pequeños por hallazgo.

- [ ] Definir protección BLE y autorización de actualizaciones compatible con varios usuarios y el reset del backoffice, sin introducir bonding que impida revincular. Mantener explícito el límite aceptado de registro por ID descrito en A4.
- [ ] Probar Android e iPhone con hardware real: permisos, cancelar, volver a medir, cuentas, modo avión y recuperación; completar indicadores y sonido de TASK.
- [ ] Compilar binario de entrega, comprobar flash/particiones, versión, consumo y recuperación por USB; actualizar README/TASK con resultados efectivos.

**Verificación:** casos negativos de acceso y actualización, matriz física de la app y `python docs/verificar_documentacion.py` al modificar documentación. Compilar en cada cambio de firmware; ejecutar pruebas de App/Web sólo cuando se afecten sus contratos o código.

## Datos pendientes para comenzar con la sonda

Marca/modelo y manual de registros; disponibilidad de ESP32, placa V2, sonda, celda y BME280; adaptador USB–RS-485 y multímetro; flash real del módulo. Su ausencia no bloquea preparar compilación y pruebas binarias, pero sí declarar validada una medición real.

## E. Característica de estado

La app necesita batería y versión en **cada** contacto para informar a Supabase la última conexión, la batería y el firmware. La trama de 20 bytes no sirve para eso: sin lectura de suelo la batería viaja en `FF`, y la trama es un contrato cerrado.

| Campo | Valor |
| --- | --- |
| UUID | `00000005-5e4e-4c69-6d61-746572726105`, lectura |
| Byte 0 | Batería en % (0–100); `0xFF` = sin dato (sin celda o aún sin medir) |
| Bytes 1–3 | Versión del firmware: mayor, menor, parche |
| Byte 4 | Banderas: bit 0 = ventana PAIR abierta (la app la exige para vincular) |

- [x] `FIRMWARE_VERSION_*` en `config.h` (1.0.0) y característica en `ble_terrasense.cpp`. Compila sin advertencias, 88 % de la partición.
- [x] Porcentaje por curva LiPo típica, actualizado cada 5 s junto con la lectura del ADC.
- [ ] Probar en hardware: leer la característica con nRF Connect y comparar el porcentaje con un multímetro (pendiente F2 de TASK.md).

## O. Actualización por BLE (OTA)

### O1. Partición: decidir antes de repartir equipos

El firmware ocupa el **88 %** de un espacio de aplicación de 1,25 MB (partición por defecto, que ya trae los dos espacios OTA). El código OTA cabe, pero deja poco margen para el driver Modbus y lo que venga. **La tabla de particiones solo se cambia por USB**: una vez que un equipo está en el campo queda con la que tenga.

- [ ] Pasar a **Minimal SPIFFS (1,9 MB APP con OTA / 190 KB SPIFFS)**: el firmware no usa SPIFFS y cada espacio de aplicación sube a 1,9 MB. Hacerlo al cargar las 5 placas del primer lote.

### O2. Protocolo

Dos características nuevas en el mismo servicio:

| UUID | Propiedades | Uso |
| --- | --- | --- |
| `…6106` Control | escritura + notificación | Órdenes de la app y respuestas del equipo |
| `…6107` Datos | escritura sin respuesta | Trozos del binario |

Órdenes (primer byte):

| Código | Contenido | Efecto |
| --- | --- | --- |
| `01` BEGIN | tamaño (`uint32` BE) + SHA-256 (32 bytes) + versión (3 bytes) | Abre la partición libre. Solo con la **ventana PAIR abierta**; si no, responde error |
| `02` END | — | Cierra, compara el SHA-256, fija la partición de arranque y reinicia |
| `03` ABORT | — | Descarta lo recibido |

Datos: `uint16` de secuencia + carga útil de hasta MTU − 5 bytes. El equipo notifica por Control un acuse cada 16 trozos (`10` + secuencia) para regular el ritmo, y un error (`E0` + código) si la secuencia salta, la escritura falla o el tamaño se excede.

Antes de implementar, completar este borrador: `BEGIN` ocupa 40 bytes y no cabe en una escritura convencional con el MTU mínimo de 23. Definir fragmentación o requisito de MTU y rechazo explícito; orden de bytes de secuencia, acuse del último bloque parcial, timeout, duplicados y reinicio de sesión. Con MTU 23 la carga de datos es de 18 bytes: una secuencia de 16 bits se agota tras 1.179.648 bytes si empieza en cero; definir desbordamiento o ampliar el contador. Recalcular el tamaño de carga si cambia la cabecera.

SHA-256 comprueba integridad, pero no acredita quién publicó el binario. Resolver en F6 la autorización y autenticidad antes de distribuir OTA; no presentar PAIR más hash como una firma del fabricante.

- [ ] Máquina de estados OTA en un módulo propio (`ota.h/.cpp`) con `esp_ota_begin/write/end` y SHA-256 incremental de mbedTLS.
- [ ] La ventana PAIR se mantiene abierta mientras dure la transferencia; una desconexión aborta.
- [ ] LEDs y buzzer: azul parpadeando durante la carga; éxito o fallo con los patrones actuales.

### O3. Arranque seguro

- [ ] Tras reiniciar en la versión nueva: si BLE inicia y el bucle corre 10 s sin fallos, `esp_ota_mark_app_valid_cancel_rollback()`; si no, el cargador vuelve a la versión anterior. Confirmar en hardware que el cargador del núcleo 3.x tiene la vuelta atrás habilitada; si no, documentar la alternativa.
- [ ] La app confirma la instalación leyendo la versión en la característica de estado.

No prometer retorno automático hasta verificar configuración del cargador y un ensayo de fallo de arranque. La documentación de [Espressif sobre OTA](https://docs.espressif.com/projects/esp-idf/en/v5.3/esp32/api-reference/system/ota.html) especifica que los estados de validación dependen de habilitar rollback; llamar a la función de confirmación por sí solo no lo habilita. Validar este punto contra el núcleo y cargador efectivamente usados en P0.

### O4. Pruebas

- [ ] Actualizar de 1.0.0 a 1.0.1 desde nRF Connect o un script, y desde la app.
- [ ] Binario con SHA-256 alterado → rechazo sin cambiar de partición.
- [ ] Corte a mitad de transferencia → la versión anterior sigue arrancando.
- [ ] Medir la duración con un MTU de 247 y uno de 185 (iOS).

## Relación con la app

Flujo por implementar: la app descargará el binario desde Supabase Storage con internet, verificará su SHA-256, pedirá mantener PAIR 3 s y ejecutará el protocolo O2 mostrando progreso. Hoy consulta versiones; no transfiere el binario por BLE. El detalle está en las fases 5 a 7 de [Web/TAREAS.md](../Web/TAREAS.md).
