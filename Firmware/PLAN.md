# Plan: estado del equipo y actualización por BLE

Trabajo del firmware que exige el backoffice nuevo ([Web/TAREAS.md](../Web/TAREAS.md)). Cada casilla `[x]` está hecha y verificada; `[ ]` sigue pendiente. Cuando todo esté cerrado, lo vigente pasa a [README.md](README.md) y [TASK.md](TASK.md), y este archivo se borra.

## E. Característica de estado

La app necesita batería y versión en **cada** contacto para informar a Supabase la última conexión, la batería y el firmware. La trama de 20 bytes no sirve para eso: sin lectura de suelo la batería viaja en `FF`, y la trama es un contrato cerrado.

| Campo | Valor |
| --- | --- |
| UUID | `00000005-5e4e-4c69-6d61-746572726105`, lectura |
| Byte 0 | Batería en % (0–100); `0xFF` = sin dato (sin celda o aún sin medir) |
| Bytes 1–3 | Versión del firmware: mayor, menor, parche |

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

- [ ] Máquina de estados OTA en un módulo propio (`ota.h/.cpp`) con `esp_ota_begin/write/end` y SHA-256 incremental de mbedTLS.
- [ ] La ventana PAIR se mantiene abierta mientras dure la transferencia; una desconexión aborta.
- [ ] LEDs y buzzer: azul parpadeando durante la carga; éxito o fallo con los patrones actuales.

### O3. Arranque seguro

- [ ] Tras reiniciar en la versión nueva: si BLE inicia y el bucle corre 10 s sin fallos, `esp_ota_mark_app_valid_cancel_rollback()`; si no, el cargador vuelve a la versión anterior. Confirmar en hardware que el cargador del núcleo 3.x tiene la vuelta atrás habilitada; si no, documentar la alternativa.
- [ ] La app confirma la instalación leyendo la versión en la característica de estado.

### O4. Pruebas

- [ ] Actualizar de 1.0.0 a 1.0.1 desde nRF Connect o un script, y desde la app.
- [ ] Binario con SHA-256 alterado → rechazo sin cambiar de partición.
- [ ] Corte a mitad de transferencia → la versión anterior sigue arrancando.
- [ ] Medir la duración con un MTU de 247 y uno de 185 (iOS).

## Relación con la app

La app descarga el binario desde Supabase Storage con internet, verifica su SHA-256, pide al usuario mantener PAIR 3 s y ejecuta el protocolo O2 mostrando el progreso. El detalle está en las fases 5 a 7 de [Web/TAREAS.md](../Web/TAREAS.md).
