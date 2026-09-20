# Bytes entre el ESP32 y el teléfono

El formato del producto es **una notificación BLE binaria de 20 bytes**, con las siete variables de suelo, las tres de ambiente y el estado de batería en una sola captura. El decodificador acepta además una trama reducida de 16 bytes, que existe únicamente como tolerancia hacia el firmware de prototipo anterior al BME280 y no es un modo de operación del equipo terminado. No se envía texto hexadecimal ni JSON. El hexadecimal de este documento es una forma legible de representar esos bytes.

El aviso de los README se refería a documentos antiguos que describían formatos distintos. La tabla siguiente coincide con `decodeTelemetry` y sus pruebas. Falta comprobarla con el firmware y la sonda física: este repositorio no contiene el firmware ni una captura real del sensor adquirido.

## Dos tramas diferentes

1. **Sonda → ESP32, por RS-485/Modbus:** el ESP32 recibe la respuesta del sensor, valida dirección, función, longitud y CRC, y convierte sus registros a unidades conocidas. La consulta documentada `01 03 00 00 00 07 04 08` supone siete registros desde la dirección cero; ese mapa debe confirmarse con el proveedor. No debe asumirse que sirve para cualquier sonda 7-en-1.
2. **ESP32 → teléfono, por BLE:** el ESP32 construye el paquete TerraSense de abajo, con los datos de la sonda **y los de su propio BME280**. No incluye la cabecera Modbus ni su CRC. El teléfono se suscribe a la característica de telemetría y procesa una notificación completa.

El servicio es `00000001-5e4e-4c69-6d61-746572726101` y la característica de telemetría, `00000002-5e4e-4c69-6d61-746572726102`. La biblioteca del teléfono entrega su valor como Base64; `bleService.ts` lo convierte a bytes antes de decodificarlo. **El firmware debe enviar los bytes originales**, sin codificarlos a Base64.

## Por qué 20 bytes y no dos paquetes

El MTU por defecto de BLE es de 23 bytes y una notificación gasta 3 en su cabecera: quedan **20 bytes de carga útil garantizados** sin negociar nada. El contrato usa ese mínimo común y no depende de que el sistema negocie un MTU mayor. Ver [ATT, notificaciones](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-54/out/en/host/attribute-protocol--att-.html) y [GATT, MTU mínimo](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-54/out/en/host/generic-attribute-profile--gatt-.html).

Partir la lectura en dos notificaciones costaría emparejarlas —¿son de la misma medición?—, tratar el caso de que llegue una y no la otra, y ordenarlas; hoy `bleService.ts` resuelve con la primera notificación y se desuscribe. Todo eso para resolver un problema de espacio que no existe: las tres magnitudes del BME280 caben en los cuatro bytes que sobran.

## Orden y escalas

Un byte tiene ocho bits. Cada valor de dos bytes usa **big-endian**: primero el byte alto y luego el bajo. Por ejemplo, `01 5E` representa `1 × 256 + 94 = 350`; al dividir por diez, la app obtiene `35,0 %`.

El **byte 15 identifica el formato** y decide la longitud del paquete:

| Valor | Longitud | Contenido | Estado |
| :---: | :---: | :--- | :--- |
| `1` | 20 bytes | Suelo, batería y el ambiente del BME280 | **Formato del producto.** Es el que debe emitir el firmware del equipo. |
| `0` | 16 bytes | Sólo suelo y batería; los campos de aire quedan en `null` | Tolerancia del decodificador para firmware de prototipo sin BME280. No es un modo de operación comercial. |

Los bytes 0 a 14 son **idénticos en ambos**, así que un prototipo antiguo se sigue leyendo sin ramas especiales. Cualquier otro valor en el byte 15 se rechaza. Un equipo terminado que emita `0` se considera defectuoso, no configurado en modo reducido.

| Posiciones, contando desde 0 | Valor | Tipo | Conversión al enviar | Ejemplo |
| --- | --- | --- | --- | --- |
| 0–1 | Humedad volumétrica | `uint16` | Porcentaje × 10 | 35,0 % → `01 5E` |
| 2–3 | Temperatura del suelo | `int16` con signo | °C × 10 | 24,5 °C → `00 F5` |
| 4–5 | Conductividad | `uint16` | µS/cm, entero | 1000 → `03 E8` |
| 6–7 | pH | `uint16` | pH × 10 | 6,5 → `00 41` |
| 8–9 | Nitrógeno | `uint16` | mg/kg, entero | 45 → `00 2D` |
| 10–11 | Fósforo | `uint16` | mg/kg, entero | 30 → `00 1E` |
| 12–13 | Potasio | `uint16` | mg/kg, entero | 80 → `00 50` |
| 14 | Batería | `uint8` | Porcentaje entre 0 y 100 | 87 % → `57` |
| 15 | **Identificador de formato** | `uint8` | `01` = 20 bytes (producto); `00` = 16 bytes (prototipo sin BME280) | `01` |
| 16–19 | **Ambiente BME280** | 32 bits empaquetados | Ver abajo | `26 52 C0 7D` |

### Los cuatro bytes del BME280

Las tres magnitudes no caben en cuatro bytes alineados, así que van **en bits**. Los 32 bits se reparten sin desperdiciar ninguno:

```text
byte 16    byte 17    byte 18    byte 19
TTTTTTTT   TTTTPPPP   PPPPPPPP   HHHHHHHH
└─── T: 12 bits ──┘   └─ P: 12 bits ─┘   └ H: 8 bits ┘
```

| Magnitud | Bits | Conversión al enviar | Rango que cubre | Resolución |
| :--- | :---: | :--- | :--- | :--- |
| Temperatura del aire | 12 | `(°C × 10) + 400` | −40,0 a +85,0 °C | 0,1 °C |
| Presión | 12 | `hPa − 300` | 300 a 1100 hPa | 1 hPa |
| Humedad relativa | 8 | `% × 2` | 0 a 100,0 % | 0,5 % |

El empaquetado define resoluciones de transporte; no acredita exactitud ni calibración del conjunto. La app rechaza además valores por encima del máximo del sensor: temperatura sobre 85 °C, presión sobre 1100 hPa o humedad sobre 100 %.

**Si el BME280 no responde, el firmware pone a uno todos los bits de esa magnitud** y la app guarda `null`:

| Magnitud | Centinela de "sin dato" |
| :--- | :--- |
| Temperatura | `0xFFF` en sus 12 bits |
| Presión | `0xFFF` en sus 12 bits |
| Humedad | `0xFF` en su byte |

Las tres a la vez son los cuatro bytes en `FF FF FF FF`. Pueden faltar por separado. **Nunca se envía un valor plausible en lugar de un dato ausente**: la base guarda `NULL` y quien lea la medición sabe que no se midió.

## Ejemplo completo

Suelo como antes, y aire a 21,3 °C, 62,5 % de humedad y 1004 hPa:

```text
01 5E 00 F5 03 E8 00 41 00 2D 00 1E 00 50 57 01 26 52 C0 7D
```

Cómo salen esos cuatro últimos bytes: `21,3 °C → 213 + 400 = 613 = 0x265`; `1004 hPa → 1004 − 300 = 704 = 0x2C0`; `62,5 % → 125 = 0x7D`. Los 12 bits de temperatura ocupan el byte 16 entero y el nibble alto del 17; los 12 de presión, el nibble bajo del 17 y el byte 18 entero.

La temperatura de suelo negativa usa complemento a dos: −5,5 °C se envía como −55 décimas, es decir, `FF C9`. La app usa `getInt16`, por lo que lo interpreta como negativo. La temperatura del aire **no** usa complemento a dos: usa el desplazamiento `+400`, porque va en 12 bits y no en un entero con signo.

## Cómo empaquetarlo en el firmware

El firmware debe escribir los bytes explícitamente; copiar la memoria de un `struct` puede introducir otro orden de bytes o relleno.

```cpp
uint8_t packet[20] = {};
auto put16 = [&](size_t offset, uint16_t value) {
  packet[offset] = uint8_t(value >> 8);
  packet[offset + 1] = uint8_t(value & 0xff);
};
put16(0, 350);                    // 35,0 %
put16(2, uint16_t(int16_t(245))); // 24,5 grados de suelo
put16(4, 1000);
put16(6, 65);
put16(8, 45);
put16(10, 30);
put16(12, 80);
packet[14] = 87;                  // bateria
packet[15] = 1;                   // version de trama: lleva ambiente

// Ambiente. Usar el centinela cuando la lectura del BME280 haya fallado:
// nunca el ultimo valor bueno, ni un promedio, ni un cero.
const uint16_t SIN_DATO_12 = 0xfff;
const uint8_t  SIN_DATO_8  = 0xff;

uint16_t temp12 = bmeOk ? uint16_t(lroundf(airTempC * 10.0f) + 400) : SIN_DATO_12;
uint16_t pres12 = bmeOk ? uint16_t(lroundf(pressureHpa) - 300)      : SIN_DATO_12;
uint8_t  hum8   = bmeOk ? uint8_t(lroundf(humidityPct * 2.0f))      : SIN_DATO_8;

packet[16] = uint8_t(temp12 >> 4);
packet[17] = uint8_t(((temp12 & 0x0f) << 4) | (pres12 >> 8));
packet[18] = uint8_t(pres12 & 0xff);
packet[19] = hum8;
// Pasar packet y sizeof(packet) a la caracteristica GATT y notificar.
```

Un prototipo sin BME280 puede emitir `packet[15] = 0` y notificar sólo los primeros 16 bytes; la app lo acepta y deja el ambiente en `null`. El firmware de producción emite siempre los 20 bytes.

Este fragmento ilustra el empaquetado; no es un firmware completo. El ID del equipo se comunica en otra característica, no dentro de estas mediciones. El QR temporal se gestiona entre la app y Supabase y tampoco ocupa bytes de esta trama.

## Qué pasa si el formato está mal

La app rechaza paquetes incompletos, una longitud que no corresponde a la versión declarada, una versión distinta de 0 o 1, batería superior a 100 y valores de ambiente por encima del rango del BME280. No convierte un error de trama en una medición simulada. Las pruebas de [`App/tests/probeTelemetry.test.ts`](../App/tests/probeTelemetry.test.ts) cubren las dos versiones, la temperatura de aire y de suelo bajo cero, los centinelas por separado y juntos, cada límite de rango y vistas con desplazamiento dentro de un buffer.

Una longitud correcta **no permite detectar por sí sola campos intercambiados o escalas erróneas**. Para validar el firmware hay que comparar una captura real con las unidades del sensor y con estos valores esperados. Si el proveedor usa otro mapa o escala, se corrige la conversión Modbus del ESP32 manteniendo el contrato BLE.

## Dónde acaban estos datos

| Magnitud de la trama | Columna en `soil_measurements` |
| :--- | :--- |
| Temperatura del aire | `canopy_temp_c` |
| Humedad relativa | `canopy_humidity_pct` |
| Presión | `air_pressure_hpa` |
| — (derivada de las dos primeras) | `vpd_kpa` |

El VPD no viaja en la trama: lo calcula la app con `computeVpdKpa` (ecuación de Tetens) a partir de la temperatura y la humedad de esa misma lectura, y queda en `null` si falta cualquiera de las dos. La presión no entra en esa fórmula; se guarda por su propio valor.

> [!IMPORTANT]
> **La API del clima no alimenta ninguna de estas columnas.** Es pronóstico de varios días y sirve para complementar la recomendación *después* de la medición, no para describir el punto y el instante en que se midió. Hasta la migración `20260906140000`, `canopy_temp_c` se rellenaba con la temperatura de esa API, y las tres columnas tenían valores por defecto inventados (`22.4`, `55.0`, `1.25`) que se guardaban solos en cuanto un `INSERT` las omitía. Las dos cosas están corregidas: sin sensor, `NULL`.


## Conexión, batería y captura (11-09-2026)

La trama v1 transporta **diez variables + batería + versión en 20 bytes**: 14 bytes de suelo, 1 de batería, 1 de versión y 4 de ambiente. No necesita añadir coordenadas: las obtiene el teléfono. El orden binario no cambia para seguir el orden visual del Grid.

La condición «respondió» se verifica mediante una conexión GATT y la recepción de la notificación válida dentro del timeout de 15 segundos. El escaneo previo sólo verifica presencia anunciada. Si el equipo no responde, la app muestra un error; ningún bit recibido puede demostrar que un equipo ausente está desconectado. Tras recibir, la app cierra la conexión para permitir reposo: el resultado muestra **respuesta recibida**, no promete conexión permanente ni acceso a internet del ESP32. No hay un bit de conectividad a internet en v1.

La batería del byte 14 se guarda en `soil_measurements.battery_percent` (0–100, NULL en históricos). `measured_at` conserva la fecha de recepción en el teléfono, incluso si la sincronización ocurre más tarde. No es un reloj del sensor ni una prueba criptográfica de frescura: el firmware debe adquirir una lectura nueva al suscribirse y no repetir la última. `diagnosis` conserva fuente local, respuesta BLE y el pronóstico disponible al guardar. El estado remoto `devices.last_seen_at` no equivale a una conexión BLE activa.

Todas las etapas se guardan en el historial, con o sin coordenadas. Ni la app ni la consola web proyectan las lecturas sobre un mapa. El firmware real y las pruebas de recepción siguen pendientes.
