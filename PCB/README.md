# 🔌 TerraSense · Hardware, Electrónica y Diseño del Instrumento Portátil Compacto

> Revisión del 10-09-2026: informe académico de la raíz. Esta revisión documenta trabajo futuro; no modifica App, Web, Supabase o PCB ni acredita despliegues.

## Pendientes de hardware y ensayos

- Confirmar variante de la sonda AliExpress 1005005548177699: 4,5–30 V, RS485 y 45×15×123 mm incluyendo electrodos. Los 0,5 W publicados corresponden a 24 V; medir consumo a la tensión elegida.
- Cerrar fichas de devkit ESP32, BME280, carga/boost, LDO, batería y mapa Modbus. SP3485 trabaja a 3,3 V.
- Validar captura de siete registros de suelo y tres del BME280, trama BLE, centinelas y firmware real.
- Medir energía en Wh desde batería, reposo de placa, eficiencia, bus terminado y reintentos. La autonomía es provisional.
- Ejecutar el plan metrológico del informe y los ensayos de radio, batería y carcasa. IP68 anunciado para la sonda no certifica la carcasa del equipo.
- Carcasa mediante impresión externa: no presupuestar compra de impresora.

---

Documentación técnica del hardware embarcado, diseño en KiCad, arquitectura de potencia a 5 V, PCB combinada de carga y elevación por USB-C, batería de litio de 2.000 mAh y chasis portátil de mano (**Handheld Agro-Sensor**).

> ### 🛑 Estado de verificación — leer antes de usar este documento
> Corregido tras la [auditoría del 4 de septiembre de 2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md). **Este documento describe un diseño en curso, no un producto verificado. No fabricar a partir de los archivos actuales.**
>
> | Afirmación anterior | Estado real |
> |---|---|
> | «Ruteo físico de 2 capas» | **`V1/terrasense.kicad_pcb` no contiene componentes, pistas ni contorno.** No hay placa ruteada. El archivo declara generador KiCad 10.0, no 8.0 |
> | «Factibilidad técnica comprobada» | `V1/ERC.rpt` registra errores de conexión y alimentación **sin cierre limpio documentado** |
> | «BLE 5.0» | El ESP32-WROOM-32E especifica **Bluetooth 4.2 BR/EDR y BLE** |
> | «Consumo en reposo 0,0 µA» | Se refiere solo a la **rama de la sonda**. El reposo total del equipo **no se ha medido desde batería** |
> | «≥ 4.000 mediciones / > 18 meses» | El balance **omitía el consumo de la conexión BLE**. Ver §3.5 |
> | «IP67, peso < 280 g» | **Objetivos de diseño sin ensayo.** No hay actas, pesaje del conjunto ni validación mecánica |
> | «Sonda 7-en-1 opera a 5 V» | Solo puede afirmarse del **SKU y variante validados**, que aún no se han adquirido |
> | Sensor ambiental BME280 | **BME280 incluido y obligatorio:** temperatura del aire, humedad relativa y presión local para tres celdas del grid 2×5. La API gratuita complementa la lectura con el pronóstico de cinco días. Ver [contrato y estado de integración](../docs/INFORME%201%20.docx.md#integracion-bme280). |
> | Módulo TP4056 + Step-Up discreto | Sustituido por una **PCB combinada de carga/boost USB-C** ($900 confirmados por los socios) |
>
> El BOM vigente y provisional está en [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx), generado desde [`finanzas/supuestos.json`](../finanzas/supuestos.json). Las secciones que siguen se conservan como **memoria de diseño**; donde contradigan esta tabla, manda esta tabla.

---

## 0. Estructura de la carpeta y estado de versiones

Esta carpeta separa el **prototipo congelado (V1)** del **diseño de producción (V2)**, que todavía no existe.

| Ruta | Qué es | Estado |
| :--- | :--- | :--- |
| `README.md` | Este documento: especificación de hardware, árbol de alimentación, pinout y contrato de trama | **Vivo.** Es el único documento editable de la carpeta |
| `BOM_TerraSense.xlsx` | Lista de materiales que alimenta el modelo económico | **Generado.** Lo reescribe `python finanzas/modelo.py` desde `finanzas/supuestos.json`; no se edita a mano |
| [`V1/`](V1/) | Prototipo académico: esquemático KiCad, reporte ERC, planos y archivo de placa | **Congelado.** Memoria de diseño; no se edita |
| `V2/` | Diseño de producción | **No existe todavía** |

### 0.1. Inventario verificado de V1

Comprobado sobre los archivos, no sobre la memoria de diseño:

| Archivo | Contenido real |
| :--- | :--- |
| `V1/terrasense.kicad_sch` | Esquemático de **66 símbolos**, generador **KiCad 10.0** |
| `V1/terrasense.kicad_pcb` | **Vacío: 2 líneas, 80 bytes.** Solo cabecera y cierre, sin componentes, pistas ni contorno |
| `V1/ERC.rpt` | Corrida del 30-08-2026 con **38 incidencias abiertas**: 27 `pin_not_connected`, 5 `pin_not_driven`, 3 `power_pin_not_driven`, 2 `multiple_net_names`, 1 `label_dangling` |
| `V1/terrasense.pdf` | Planos exportados del esquemático |
| `V1/terrasense.kicad_pro` | Proyecto maestro |
| `V1/terrasense.kicad_sch.bak` | Respaldo automático de KiCad |

### 0.2. Qué separa a la V1 del BOM vigente

La fuente de verdad de los componentes es la lista `bom` de [`finanzas/supuestos.json`](../finanzas/supuestos.json), no las tablas de memoria de este README. Comparada contra el esquemático de V1:

| Bloque | Esquemático V1 | Línea del BOM vigente | ¿Coincide? |
| :--- | :--- | :--- | :--- |
| MCU | `RF_Module:ESP32-WROOM-32E` | «Módulo ESP32-WROOM-32 desnudo» | Sí, pero la variante está **por confirmar** |
| Carga | `Battery_Management:TP4056-42-ESOP8` | «PCB combinada USB-C carga + boost» | **No.** Sustituido |
| Elevación | `Regulator_Switching:MT3608` + `L1` + `Diode:SS34` | «PCB combinada USB-C carga + boost» | **No.** Sustituido |
| USB-UART | `Interface_USB:CH340C` | **Sin línea en el BOM** | **Indefinido** |
| Regulador 3,3 V | `Regulator_Linear:AP2112K-3.3` | **Sin línea en el BOM** | **Indefinido** |
| MOSFET del power gate | `Transistor_FET:AO3401A` + `MMBT3904` | Dentro del lote «Pasivos, protección y terminación RS485» | Sin desglosar |
| Sensor ambiental | `Sensor:BME280` | «Módulo ambiental Bosch BME280 I2C» | Sí |
| Bus RS-485 | `Interface_UART:MAX3485` | «SP3485 transceptor RS485 3.3 V» | Sí, pero falta **definir IC o módulo** |
| LEDs | 2 (`GPIO2` verde, `GPIO15` azul) | «LED SMD» ×3 | **No.** El BOM compra tres, el diseño usa dos |

El rediseño obligado y acotado es el de **carga y elevación**: la PCB combinada reemplaza al TP4056, al MT3608, a la bobina y al Schottky. El resto del esquemático de V1 es reutilizable como punto de partida, siempre que se cierren antes las decisiones de la sección 0.5.

### 0.3. Contradicciones abiertas

Entre este README y el esquemático de V1:

| Tema | Dice este README | Dice `V1/terrasense.kicad_sch` |
| :--- | :--- | :--- |
| Regulador LDO 3,3 V | HT7533-1 en SOT-89 | `Regulator_Linear:AP2112K-3.3` |
| Driver de compuerta | 2N7002 (N-MOSFET) | `Transistor_BJT:MMBT3904` (BJT) |
| P-MOSFET power gate | IRLML6402 / SI2301 | `Transistor_FET:AO3401A` |
| TVS del bus RS-485 | SM712 | `Device:D_TVS_Dual_ACA` (genérico, sin SKU) |

Y una contradicción interna del propio README:

| Tema | Secciones 1 y 3.3 | Secciones 2.1 y 4.3 |
| :--- | :--- | :--- |
| Divisor de medición de batería | 100 k + 100 k (~18,5 µA a 3,7 V) | R16 / R17 de 1 M + 1 M (~1,85 µA) |

El presupuesto de reposo de 12 µA de la sección 3.5 solo es alcanzable con la segunda. **Hay que fijar el valor antes de cerrar el árbol de alimentación de la V2.**

### 0.4. Puertas que la V2 debe cruzar

Ninguna está cerrada hoy:

1. Esquemático rehecho sobre la arquitectura vigente y **ERC en cero**.
2. **Ruteo real de la placa:** hoy el archivo de PCB está vacío.
3. **SKU de sonda adquirido** y su mapa de registros Modbus confirmado contra la ficha del proveedor.
4. **Firmware del ESP32:** no existe en este repositorio. Debe emitir la trama de 20 bytes que decodifica el decodificador de la app.
5. **Medición de consumo desde batería**, separando reposo total de reposo de la rama de sonda.
6. **Ensayos de sellado, caída y peso** del conjunto: hoy IP67 y < 280 g son objetivos sin acta.

---

### 0.5. Decisiones que bloquean el esquemático de la V2

Ninguna se puede resolver dibujando: cada una cambia qué bloques existen en la hoja. Están ordenadas por cuánto arrastran.

#### D1 — ¿Módulo WROOM-32 desnudo o placa de desarrollo?

> **Cerrada para la V2: se usa DevKit.** Decisión acotada a esa versión; el proyecto sigue definido sobre el módulo desnudo, que es lo que costea el BOM. Ver [sección 7](#7-esquemático-de-la-v2--especificación-por-etapas). La tabla siguiente queda como registro de lo que arrastra la decisión cuando se vuelva al módulo desnudo.

Es la decisión raíz: define si la placa portadora lleva tres bloques más o ninguno.

| | Módulo desnudo | Placa de desarrollo |
| :--- | :--- | :--- |
| Qué dice el BOM | «Módulo ESP32-WROOM-32 desnudo», variante por confirmar | — |
| Qué dice este README | — | Secciones 1 y 3.2: «en placa de desarrollo», «el USB-UART va incluido» |
| La portadora necesita | LDO 3,3 V, USB-UART, auto-reset (DTR/RTS), resistencias de arranque y `EN` | Nada: solo zócalos |
| Programación | Requiere el USB-UART de la portadora | Por el USB de la placa |
| Consumo en reposo | Menor: sin LED de encendido ni reguladores extra | Mayor, y casi ninguna devkit lo documenta |

El BOM **no tiene línea** de LDO, USB-UART ni cristal. Eso es coherente con una placa de desarrollo e incoherente con un módulo desnudo: si se confirma «desnudo», hay que agregar esas líneas al BOM antes de cerrar el costo.

#### D2 — Divisor de medición de batería

Decide si el presupuesto de reposo es alcanzable.

| Opción | Consumo permanente a 3,7 V | Problema |
| :--- | :--- | :--- |
| 100 k + 100 k | ~18,5 µA | Excede por sí solo el presupuesto de 12 µA de la sección 3.5 |
| 1 M + 1 M | ~1,85 µA | Impedancia de fuente demasiado alta para el ADC del ESP32: la lectura se degrada |
| Divisor conmutado por MOSFET | ~0 µA en reposo | Cuesta un MOSFET y un GPIO más; es la práctica habitual |

#### D3 — SP3485: ¿integrado o módulo?

El BOM lo deja explícito: «definir IC o módulo, no ambos». Un SOIC-8 se rutea en la portadora y obliga a poner la terminación de 120 Ω, la polarización *fail-safe* y el TVS alrededor. Un módulo ya los trae, ocupa más alto y encarece la línea.

#### D4 — Componentes sin cerrar

| Tema | Estado |
| :--- | :--- |
| TVS del bus RS-485 | El esquemático usa un símbolo genérico sin SKU; este README propone SM712 |
| Conector JST de batería | El BOM dice 3 pines con «pinout/tercer pin por verificar»: probablemente un termistor NTC |
| Cantidad de LEDs | El BOM compra tres, el pinout define dos |
| Conector de la sonda | El esquemático de V1 usa un borne de tornillo de 4 vías, sin sellado definido |

#### D5 — Lo que no se decide en el esquemático pero lo condiciona

El mapa de registros Modbus de la sonda **no está confirmado contra la ficha del proveedor** y el SKU no se ha adquirido. Eso no cambia el dibujo, pero sí la alimentación: los 0,5 W publicados corresponden a 24 V y hay que medir el consumo real a 5 V antes de dimensionar el elevador y el MOSFET de corte.

### 0.6. Orden de trabajo de la V2

1. ~~Cerrar D1~~: cerrada para la V2 con DevKit.
2. Cerrar D2, D3 y D4, y reflejarlas en `finanzas/supuestos.json` si agregan o quitan líneas de compra.
3. Dibujar el esquemático en `PCB/V2/` y dejar el ERC en cero.
4. Asignar huellas y recién ahí rutear la placa.
5. Reemplazar las secciones 1 a 6 de este README, que hoy describen la V1, por la especificación de lo que se dibujó.

> Las secciones 1 a 6 siguientes son **memoria de diseño de la V1**. Donde contradigan a las secciones 0.2 a 0.5, mandan estas últimas.

---

## 📑 Tabla de Contenidos

- [0. Estructura de la carpeta y estado de versiones](#0-estructura-de-la-carpeta-y-estado-de-versiones)
- [1. Especificaciones Generales de Hardware](#1-especificaciones-generales-de-hardware)
- [2. Arquitectura Electrónica y Diagrama de Bloques](#2-arquitectura-electrónica-y-diagrama-de-bloques)
  - [2.1. Microcontrolador Central (ESP32-WROOM-32E)](#21-microcontrolador-central-esp32-wroom-32e)
  - [2.2. Sensor ambiental BME280 — lectura local obligatoria](#22-sensor-ambiental-bme280--lectura-local-obligatoria)
  - [2.3. Interfaz de Comunicación Industrial RS-485](#23-interfaz-de-comunicación-industrial-rs-485)
- [3. Sistema de Gestión de Potencia y Alimentación](#3-sistema-de-gestión-de-potencia-y-alimentación)
  - [3.1. Operación de la Sonda NPK a 5V DC](#31-operación-de-la-sonda-npk-a-5v-dc)
  - [3.2. Carga y elevación — PCB combinada (sustituye al módulo TP4056)](#32-carga-y-elevación--pcb-combinada-sustituye-al-módulo-tp4056)
  - [3.3. Aislamiento físico por MOSFET (consumo de reposo sin medir)](#33-aislamiento-físico-por-mosfet-consumo-de-reposo-sin-medir)
  - [3.4. Batería de Litio Convencional de 2.000 mAh](#34-batería-de-litio-convencional-de-2000-mah)
  - [3.5. Balance Energético y Autonomía de Terreno](#35-balance-energético-y-autonomía-de-terreno)
- [4. Diseño de PCB y Archivos KiCad](#4-diseño-de-pcb-y-archivos-kicad)
  - [4.1. Parámetros de Fabricación JLCPCB (2 Capas)](#41-parámetros-de-fabricación-jlcpcb-2-capas)
  - [4.2. Lista de Materiales (BOM) Electrónico Optimizado](#42-lista-de-materiales-bom-electrónico-optimizado)
  - [4.3. Mapeo de Pines (Pinout)](#43-mapeo-de-pines-pinout)
- [5. Diseño Mecánico del Instrumento Portátil de Mano (Handheld)](#5-diseño-mecánico-del-instrumento-portátil-de-mano-handheld)
  - [5.1. Chasis compacto ergonómico — objetivo IP67, sin ensayo](#51-chasis-compacto-ergonómico--objetivo-ip67-sin-ensayo)
  - [5.2. Montaje Directo de Electrodos de Aleación](#52-montaje-directo-de-electrodos-de-aleación)
  - [5.3. Interfaz de Usuario y Puerto USB-C](#53-interfaz-de-usuario-y-puerto-usb-c)
- [6. Protocolo Firmware y Trama BLE GATT](#6-protocolo-firmware-y-trama-ble-gatt)
  - [6.1. Ciclo de Adquisición Modbus RTU](#61-ciclo-de-adquisición-modbus-rtu)
  - [6.2. Estructura binaria de la trama BLE (20 bytes)](#62-estructura-binaria-de-la-trama-ble-20-bytes)

Las secciones 1 a 6 documentan la V1. Para la V2, partir por [0.5. Decisiones que bloquean el esquemático](#05-decisiones-que-bloquean-el-esquemático-de-la-v2) y [0.6. Orden de trabajo](#06-orden-de-trabajo-de-la-v2).

- [7. Esquemático de la V2 — especificación por etapas](#7-esquemático-de-la-v2--especificación-por-etapas)

---

## 1. Especificaciones Generales de Hardware

| Parámetro | Valor de Diseño | Justificación Técnica |
| :--- | :--- | :--- |
| **MCU Principal** | ESP32-WROOM-32 en placa de desarrollo | Doble núcleo 240 MHz. [Ficha Espressif](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html): **Bluetooth 4.2 BR/EDR y BLE**, no 5.0. La certificación del módulo **no acredita** el cumplimiento del equipo terminado |
| **Sonda de Suelo** | Sonda industrial 7-en-1 RS-485 Modbus RTU | Rango de alimentación **DC 4.5V–30V**, electrodos de aleación anticorrosión, grado de acero por confirmar |
| **Alimentación Sonda**| **5,0V DC** (suministrados por Step-Up) | Operación directa sin requerir 12V; menor estrés y menor consumo |
| **Sensor Ambiental** | **BME280 I²C a 3,3 V** | Temperatura del aire, humedad relativa y presión en el punto de lectura |
| **Transceptor Bus** | SP3485 / MAX3485 (3.3V) | Comunicación diferencial industrial semidúplex robusta |
| **Batería** | 1× Polímero de Litio (LiPo / Li-Ion) 3.7V, **2.000 mAh** | Formato prismático convencional ultraligero (~35 g), sin portaceldas |
| **Carga y Elevación**| **PCB combinada USB-C carga + boost** | Costo de $900 confirmado por los socios. **No se compran TP4056 ni MT3608 discretos por separado** |
| **Consumo en Reposo** | ⚠️ **Sin medir** | El corte de la rama de 5 V es real, pero **no elimina** el consumo de ESP32, reguladores, boost, cargador, protección y divisores. El divisor declarado de 100 k + 100 k consume por sí solo ~18,5 µA a 3,7 V si queda conectado |
| **Autonomía** | ⚠️ **Sin ensayar** | Ver §3.5: el balance publicado omitía el consumo de la conexión BLE. **Debe medirse, no estimarse** |
| **Formato Físico** | Instrumento portátil de mano (*Handheld*) | Inserción directa manual en el suelo. **El peso objetivo (< 280 g) no ha sido verificado sobre el conjunto ensamblado** |
| **Grado de Sellado** | ⚠️ **IP67 como objetivo, sin ensayo** | Una junta o una resina **no constituyen certificación**. Requiere ensayo de ingreso de polvo y agua sobre el producto final |

---

## 2. Arquitectura Electrónica y Diagrama de Bloques

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                      DIAGRAMA DE BLOQUES ELECTRÓNICO                        │
 └─────────────────────────────────────────────────────────────────────────────┘

    [ Conector USB-C ]
            │
            ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  MÓDULO COMBO INTEGRADO (TP4056 + Step-Up Boost 5V)              │
    │  • Controlador de carga lineal TP4056 (1.000 mA)                  │
    │  • Protección de batería DW01A + MOSFET dual FS8205A              │
    │  • Circuito elevador síncrono/asíncrono 3.7V ──► 5.0V regulados  │
    └─────────────────┬───────────────────────────────▲─────────────────┘
                      │                               │
                      ▼                               │
         [ Batería LiPo 3.7V 2.000 mAh ] ─────────────┘
                      │
                      ▼ [ 5.0V Boost Out ]
       ┌──────────────┴──────────────────────────────┐
       ▼                                             ▼
 [ LDO HT7533-1 3.3V ]                       [ P-MOSFET Power Gate ]
       │                                    (Conmutado por GPIO5)
 ┌─────┴──────────────┐                              │ (rama cortada)
 ▼                    ▼                              ▼
[ ESP32-WROOM ]  [ BME280 I2C ]              [ Línea VCC 5V Sonda & Bus ]
 (Core MCU)      (Ambiente Sup.)                     │
 │                                                   ├────────────────┐
 ├────── UART2 (TX/RX) ──────► [ SP3485 ] ───────────┤                │
 └────── DE/RE (GPIO4) ──────► (RS-485)              ▼                ▼
                                                [ VCC 5V ]          [ GND ]
                                                     │                │
                                                     ▼                ▼
                                          [ Sonda Suelo 7-en-1 (4.5V-30V) ]
```

### 2.1. Microcontrolador Central (ESP32-WROOM-32E)
* **Arquitectura:** Xtensa dual-core 32-bit LX6 a 240 MHz.
* **Memoria:** 520 KB SRAM interna, 4 MB SPI Flash externa.
* **Conectividad:** Bluetooth Low Energy. La ficha del ESP32-WROOM-32E especifica **Bluetooth 4.2 BR/EDR y BLE**, no BLE 5.0.
* **Periféricos Usados:**
  * `UART2`: Pines GPIO16 (RX) y GPIO17 (TX) para el bus RS-485.
  * `I2C`: Pines GPIO21 (SDA) y GPIO22 (SCL) para el sensor ambiental BME280.
  * `GPIO4`: Control de dirección `DE`/`RE` del transceptor RS-485.
  * `GPIO5`: Control de compuerta (*Power Gate*) para habilitar los 5V hacia la sonda.
  * `GPIO34 (ADC1_CH6)`: Divisor de voltaje resistivo (R16/R17, 1M / 1M) para monitoreo del voltaje de batería.
  * `GPIO0`: Pulsador ergonómico de gatillo/pulgar para disparo de medición rápida.
  * `GPIO2 / GPIO15`: Micro-LEDs de estado (Azul: BLE / Verde: Lectura Exitosa).

### 2.2. Sensor ambiental BME280 — lectura local obligatoria

> **BME280 incluido y obligatorio:** temperatura del aire, humedad relativa y presión local para tres celdas del grid 2×5. La API gratuita complementa la lectura con el pronóstico de cinco días. Ver [contrato y estado de integración](../docs/INFORME%201%20.docx.md#integracion-bme280).
Ubicado en la parte posterior del chasis, protegido por una membrana microporosa de PTFE permeable al vapor e impermeable al agua y polvo (IP67):
* **Temperatura ambiental:** Rango −40 °C a +85 °C (exactitud ±0.5 °C).
* **Humedad relativa:** Rango 0 % a 100 % RH (exactitud ±3 % RH).
* **Presión atmosférica:** Rango 300 hPa a 1100 hPa (exactitud ±1 hPa).

### 2.3. Interfaz de Comunicación Industrial RS-485
* **Transceptor:** SP3485E o MAX3485 en encapsulado SOIC-8.
* **Tensión lógica:** 3.3V directo con el ESP32, sin desplazadores de nivel (*level shifters*).
* **Protección de línea:** Diodo de supresión de transitorios ESD TVS bidireccional (SM712) entre las líneas A y B.
* **Polarización:** Resistencias de *fail-safe* pull-up en A (4.7 kΩ a 3.3V) y pull-down en B (4.7 kΩ a GND), con terminación de 120 Ω.

---

## 3. Sistema de Gestión de Potencia y Alimentación

### 3.1. Operación de la Sonda NPK a 5V DC
Las sondas edafológicas 7-en-1 (humedad, temperatura, conductividad, pH, N, P, K) comercializadas bajo el protocolo RS-485 Modbus RTU integran internamente en su encapsulado epóxico un microcontrolador (típicamente STM8 u 8051) y circuitería analógica que operan a baja tensión interna (3.3V o 5V).

* **Compatibilidad de catálogo:** Los modelos vigentes (como los sensores JXCT, Grobotronics o DFrobot) tienen un rango de alimentación especificado de **DC 4.5V a 30V** o **DC 5V a 30V**. Admiten tensiones de 12V a 24V únicamente por conveniencia con tableros industriales o PLCs, pero **funcionan con total precisión y estabilidad al suministrarles 5,0V DC regulados**.
* **Ventajas de alimentar a 5V:**
  1. Reduce la disipación térmica interna de la sonda.
  2. Disminuye el consumo de corriente durante la excitación.
  3. Elimina la necesidad de elevar la tensión hasta 12V, simplificando el circuito elevador.

> [!TIP]
> **Criterio de Adquisición de Sondas:** Al adquirir los lotes de sondas 7-en-1 en fábrica o proveedores mayoristas, se debe verificar en ficha técnica que el rango de alimentación indique **DC 4.5V–30V** o **DC 5V–30V** (estándar mayoritario del mercado actual).

### 3.2. Carga y elevación — PCB combinada (sustituye al módulo TP4056)

> ⚠️ **El diseño vigente usa una PCB combinada de carga USB-C y elevación a 5 V**, presupuestada en $900 netos (precio confirmado por los socios). **No se compran TP4056 ni MT3608 discretos por separado**, y el USB-UART va incluido en la placa de desarrollo ESP32, por lo que tampoco se compra un CH340. El texto siguiente describe el criterio de diseño; los nombres de módulos concretos son ejemplos, no una selección cerrada.
En lugar de rutear un circuito elevador discreto en la placa principal (con bobinas, diodos Schottky y potenciómetros sueltos), se utiliza un **módulo integrado de carga y Step-Up** en una sola placa compacta (ej. módulos combo TP4056 + Boost 5V, placas HW-357 o convertidores síncronos de bajo costo):
* **Costo unitario mayorista:** ~$800 a $1.200 CLP por unidad.
* **Ahorro de costos y complejidad:** Resuelve la carga por USB-C, el corte por sobretensión/sobredescarga (DW01A) y la elevación a 5,0V regulados en un submódulo estándar probado en millones de dispositivos.
* **Facilidad de producción:** Se monta como placa hija (*daughterboard*) o módulo soldado mediante orificios almenados (*castellated holes*) o pines estándar de 2.54 mm sobre la PCB de TerraSense.

### 3.3. Aislamiento físico por MOSFET (consumo de reposo sin medir)

> ⚠️ **El corte de la rama de 5 V es real; «0,0 µA de consumo en reposo» no lo es.** Desconectar la sonda no elimina el consumo del ESP32, los reguladores, el boost, el cargador, el circuito de protección, los divisores ni las fugas. El divisor de medición de batería declarado (100 k + 100 k) consume por sí solo **~18,5 µA a 3,7 V** si permanece conectado — más que el presupuesto total de reposo de 12 µA. **Hay que medir desde la batería y distinguir el reposo total del reposo de la rama de sonda.**
Para evitar que la sonda y el transceptor RS-485 drenen corriente de la batería mientras el equipo no está midiendo:
1. El pin `GPIO5` del ESP32 satura un transistor N-MOSFET (2N7002 / SOT-23).
2. El 2N7002 conmuta la compuerta de un P-MOSFET de potencia (SI2301 / IRLML6402, $R_{DS(on)} < 65\text{ m}\Omega$).
3. El P-MOSFET conecta la línea de 5V hacia la sonda y el transceptor **únicamente durante los 3 a 4 segundos** que toma la adquisición edafológica.
4. Concluida la lectura, `GPIO5` cae a nivel bajo y el P-MOSFET se abre, cortando la alimentación de la sonda. **El consumo residual de esa línea y el reposo total del equipo no se han medido**: la cifra de «0,0 µA reales» se retira.

### 3.4. Batería de Litio Convencional de 2.000 mAh
Se descarta el uso de dos pesadas celdas cilíndricas 18650 (que requerían portaceldas voluminosos y sumaban más de 90 g de peso) en favor de una **batería de polímero de litio (LiPo / Li-Ion convencional) de celda única (1S)**:
* **Tensión nominal:** 3.7V DC (4.2V a plena carga, 3.0V en corte de descarga).
* **Capacidad:** 2.000 mAh (7.4 Wh).
* **Formato físico:** Batería prismática plana ultra compacta (~6 × 34 × 50 mm), peso ~35 g.
* **Costo unitario:** ~$3.500 a $4.200 CLP.
* **Seguridad:** Integra circuito de protección interna contra cortocircuito (PCM) complementario a la protección del TP4056.

### 3.5. Balance Energético y Autonomía de Terreno

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PERFIL DE CONSUMO POR MEDICIÓN                        │
├────────────────────────────────┬──────────────┬──────────────┬──────────────┤
│ Estado Operativo               │ Duración     │ Corriente    │ Carga (mAh)  │
├────────────────────────────────┼──────────────┼──────────────┼──────────────┤
│ 1. Reposo Profundo (Deep Sleep)│ 23 h 55 min  │ 12 µA        │ 0,287 mAh    │
│ 2. Publicidad BLE y Conexión   │ 12 segundos  │ 40 mA        │ 0,133 mAh    │
│ 3. Disparo y Lectura Sonda (5V)│ 3 segundos   │ 95 mA        │ 0,079 mAh    │
│ 4. Notificación BLE GATT       │ 1 segundo    │ 60 mA        │ 0,016 mAh    │
├────────────────────────────────┴──────────────┴──────────────┴──────────────┤
│ ERROR CORREGIDO: el ciclo publicado (0,095 mAh) OMITÍA la etapa 2, es decir  │
│ los 0,133 mAh de publicidad y conexión BLE.                                  │
│ Ciclo correcto: 40x12/3600 + 95x3/3600 + 60x1/3600 = 0,2292 mAh / lectura    │
│ Consumo diario (10 mediciones + 0,287 mAh de reposo): ~2,579 mAh/día         │
├─────────────────────────────────────────────────────────────────────────────┤
│ COTA SUPERIOR IDEAL (2.000 mAh / 2,579): ~775 días, en condiciones ideales   │
│ y suponiendo correcto el presupuesto de reposo de 12 uA, que NO se ha medido.│
│                                                                              │
│ NO SE DECLARA AUTONOMÍA. El resultado real depende de reconexiones,          │
│ eficiencia del conversor, autodescarga, temperatura y pérdida de capacidad.  │
│ El "derateo 60 %" anterior era ambiguo y no sustituye una medición.          │
│ La cifra de ">= 4.000 a 6.000 mediciones / > 18 meses" QUEDA RETIRADA.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Qué hace falta para declarar autonomía:** medir el consumo **desde la batería** con el equipo completo, distinguiendo reposo total de reposo de la rama de sonda, y ensayar ciclos reales de carga y descarga a distintas temperaturas.

---

## 4. Diseño de PCB y Archivos KiCad

Los archivos de la **V1 (prototipo, congelada)** viven en [`V1/`](V1/). No se editan: cualquier trabajo nuevo pertenece a la V2. Ver [estructura de la carpeta](#0-estructura-de-la-carpeta-y-estado-de-versiones).
* [`V1/terrasense.kicad_pro`](V1/terrasense.kicad_pro): Proyecto maestro.
* [`V1/terrasense.kicad_sch`](V1/terrasense.kicad_sch): Esquemático jerárquico.
* [`V1/terrasense.kicad_pcb`](V1/terrasense.kicad_pcb): ⚠️ **Vacío.** Contiene únicamente la cabecera y el cierre del formato: **sin componentes, pistas ni contorno de placa**. La cabecera declara generador **KiCad 10.0**, no 8.0. **No enviar a fabricación.**
* [`V1/terrasense.pdf`](V1/terrasense.pdf): Planos exportados para fabricación.
* [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx): Lista formal de componentes.

### 4.1. Parámetros de Fabricación JLCPCB (2 Capas)
* **Dimensiones:** $70{,}0\text{ mm} \times 40{,}0\text{ mm}$ (formato ultracompacto para encajar en la carcasa de mano).
* **Capas:** 2 capas (Top: Señales y componentes / Bottom: Plano de masa GND ininterrumpido).
* **Espesor de sustrato:** 1.6 mm FR-4 estándar.
* **Espesor de cobre:** $1\text{ oz}$ ($35\,\mu\text{m}$).
* **Keep-out RF:** Área sin plano de cobre de $15 \times 10\text{ mm}$ bajo la antena del ESP32.

### 4.2. Lista de Materiales (BOM) Electrónico Optimizado

| Ref | Componente | Encapsulado | Función | Costo Unitario |
| :--- | :--- | :--- | :--- | ---: |
> ⚠️ **Esta tabla es memoria de diseño de una arquitectura SMD discreta y NO es el BOM vigente.** El BOM que alimenta el modelo económico está en [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx) y parte de una **placa de desarrollo ESP32** más una **PCB combinada de carga/boost**, con BME280, sin TP4056 ni MT3608 discretos. Los precios de abajo **no están cotizados con SKU, moneda ni vigencia**.

| **U1** | ESP32-WROOM-32E-N4 | SMD Module | MCU (BLE 4.2, no 5.0) / Procesamiento | $2.450 CLP |
| **U2** | Módulo Bosch BME280 | Breakout I²C | **Incluido en BOM vigente** | $3.500 final ($2.941,18 neto) |
| **U3** | SP3485EN-L/TR | SOIC-8 | Transceptor RS-485 a 3.3V | $480 CLP |
| **MOD1**| PCB combinada carga/boost USB-C | Módulo | Carga de la celda con protecciones y elevación a 5V para la sonda | $900 CLP |
| **U4** | HT7533-1 | SOT-89 | Regulador LDO 3.3V de baja corriente de reposo (2,5 µA típ.) | Cotización pendiente |
| **Q1** | IRLML6402TRPBF | SOT-23 | P-MOSFET Power Gate (−20V, −3.7A) | $140 CLP |
| **Q2** | 2N7002 | SOT-23 | N-MOSFET control de disparo | $45 CLP |
| **D1** | SM712 | SOT-23 | Diodo TVS protección bus RS-485 | $180 CLP |
| **J1** | Conector USB-C | SMD Type-C | Entrada de carga hermética | $290 CLP |
| **BAT**| Batería LiPo 3.7V 2.000 mAh | Celda plana | Batería recargable convencional | $3.800 CLP |
| **Pas**| Resistencias 1%, Condensadores X7R | 0805 / 0603 | Desacoplo, polarización y divisores | $175 CLP |
| **SUBTOTAL ELECTRÓNICA Y ALIMENTACIÓN** | | | | **$11.000 CLP** |

### 4.3. Mapeo de Pines (Pinout)

```text
ESP32 GPIO   Conexión Hardware              Función
──────────   ─────────────────────────────  ─────────────────────────────────────
GPIO16       SP3485 Pin 1 (RO)              UART2 Receive (RXD2)
GPIO17       SP3485 Pin 4 (DI)              UART2 Transmit (TXD2)
GPIO4        SP3485 Pines 2 y 3 (RE/DE)     Control dirección RS-485 (1=TX, 0=RX)
GPIO5        2N7002 Gate                    Power Gating 5V Sonda (1=On, 0=Off)
GPIO21       BME280 Pin 3 (SDA)             I2C Data Bus
GPIO22       BME280 Pin 4 (SCL)             I2C Clock Bus
GPIO34       Divisor 1M / 1M a VBAT         Monitoreo analógico de batería (ADC1)
GPIO0        Pulsador de Muestreo           Disparo de lectura rápida / Reset
GPIO2        Micro-LED Verde                Indicador de medición y batería OK
GPIO15       Micro-LED Azul                 Indicador de enlace BLE activo
```

---

## 5. Diseño Mecánico del Instrumento Portátil de Mano (Handheld)

TerraSense adopta un diseño compacto de mano (*handheld*), optimizado para que el agricultor o técnico agronómico lo lleve cómodamente en la mano, mochila o bolsillo de trabajo, eliminando estructuras tubulares pesadas y gastos de mecanizado innecesarios.

```text
 ┌─────────────────────────────────────────────────────────────────────────┐
 │               DIAGRAMA DEL INSTRUMENTO COMPACTO DE MANO                 │
 └─────────────────────────────────────────────────────────────────────────┘

                     ◄────── 75 mm ──────►
                    ┌─────────────────────┐
                    │ [•] Micro-LEDs      │
                    │ [O] USB-C Sellado   │
                    │                     │  ◄── CHASSIS ERGONÓMICO DE MANO
                    │ [🔘 Botón Disparo]  │      (PETG, objetivo IP67 sin ensayo, 140 mm)
                    │                     │      Aloja la PCB, Batería 2.000 mAh
                    │   TerraSense Core   │      y sensor ambiental BME280
                    │                     │
                    └──────────┬──────────┘
                               │  Junta de sellado estanca con prensa estopa
                               ▼
                        /─────────────\      ◄── BASE PORTASONDA ROBUSTA
                       │  Cuerpo Sonda │          Epoxi industrial antichoque
                        \──┬──┬──┬──┬─/
                           │  │  │  │        ◄── ELECTRODOS: largo individual por confirmar
                           ▼  ▼  ▼  ▼            Inserción directa manual en el suelo
```

### 5.1. Chasis compacto ergonómico — objetivo IP67, sin ensayo
* **Material:** Filamento técnico PETG de grado industrial o ABS inyectado, con aditivos de protección UV y alta resistencia mecánica a caídas accidentales.
* **Forma:** Agarre contorneado para operar con una sola mano, incluso con guantes agrícolas.
* **Dimensiones exteriores:** $140\text{ mm (alto)} \times 75\text{ mm (ancho)} \times 38\text{ mm (profundidad)}$.
* **Peso total del equipo:** **Menos de 280 gramos** (incluyendo batería, electrónica y sonda).
* **Hermeticidad:** Cierre mediante junta perimetral tórica de silicona (O-ring) con **objetivo IP67, sin ensayo del conjunto**.

### 5.2. Montaje Directo de Electrodos de Aleación

**Sonda candidata:** 45 mm de ancho × 15 mm de grosor × 123 mm totales incluidos los electrodos. El cable de 2 m es la configuración publicada; verificar variante y montaje real. Las cotas del gabinete y diagrama son objetivos de diseño, no planos liberados.

* La base inferior del gabinete abraza firmemente la sonda edafológica comercial mediante encastre mecánico con relleno de uretano elástico.
* Los electrodos de aleación anticorrosión (sin grado 316L confirmado) se proponen hacia abajo para insertarse en el suelo con la presión natural de la mano, alcanzando la zona radicular activa del cultivo sin requerir palancas ni estribos mecánicos.

### 5.3. Interfaz de Usuario y Puerto USB-C
* **Pulsador de Muestreo:** Botón táctil industrial ubicado en la posición natural del pulgar para disparar la medición en 3 segundos (*One-Click Sampling*).
* **Puerto de Carga:** Conector hembra USB-C embutido con tapa de silicona cautiva para prevenir la entrada de tierra o barro durante la faena agrícola.
* **Feedback Visual:** Micro-LEDs protegidos por visores difusores de policarbonato para confirmación inmediata bajo luz solar directa.

---

## 6. Protocolo Firmware y Trama BLE GATT

### 6.1. Ciclo de Adquisición Modbus RTU
1. **Wake-up:** El ESP32 despierta por pulsación en el botón frontal (`GPIO0`) o solicitud BLE desde la app.
2. **Power Gate ON:** `GPIO5` pasa a nivel alto $\rightarrow$ P-MOSFET satura $\rightarrow$ La sonda recibe 5,0V regulados.
3. **Espera de estabilización:** Retardo de **100 ms** para estabilización del oscilador interno de la sonda.
4. **Envío de comando Modbus RTU (UART2 @ 9600 baud, 8N1):**
   ```text
   0x01 (Dirección) 0x03 (Función Read Holding) 0x00 0x00 (Reg Inicial) 0x00 0x07 (7 Registros) 0x04 0x08 (CRC16)
   ```
5. **Recepción y validación CRC16:** Se leen los 19 bytes de respuesta con las 7 variables de suelo:
   `[0x01 | 0x03 | 0x0E | Data_H | Data_L ... | CRC_L | CRC_H]`.
6. **Power Gate OFF:** `GPIO5` pasa a nivel bajo $\rightarrow$ la línea de 5 V se corta inmediatamente. El consumo residual **no está medido**.
7. **Lectura ambiental I²C del BME280:** adquirir temperatura del aire, humedad relativa y presión junto con el suelo. Implementación y transporte BLE detallados en [integración](../docs/INFORME%201%20.docx.md#integracion-bme280).

### 6.2. Estructura binaria de la trama BLE (20 bytes)

La integración de software del 11-09-2026 conserva este formato: **14 bytes de suelo + 1 de batería + 1 de identificador + 4 de ambiente = 20 bytes** para diez variables y batería. El orden de las tarjetas 2×5 no cambia el orden binario. La localización y fecha de recepción proceden del celular. El firmware de producto debe adquirir y notificar una lectura nueva al suscribirse: v1 no transporta contador ni reloj del sensor. Los centinelas ambientales indican ausencia por magnitud; no se reemplazan con ceros ni con la última lectura buena.

Recibir una notificación válida confirma respuesta en ese instante, no conexión permanente ni internet. La app cierra el enlace para permitir reposo. El byte de batería se conserva como `soil_measurements.battery_percent`; [persistencia](../supabase/README.md#persistencia-ambiental-y-bateria) y [contrato completo de conexión/captura](../docs/CONTRATO_BLE.md#conexión-batería-captura-y-mapa-11-09-2026). La implementación del decodificador no acredita firmware ni ensayos físicos: ambos siguen pendientes.


> El aviso de incompatibilidad corresponde a documentos antiguos: describían distinto orden de campos, escala de pH y formato de batería. La tabla siguiente coincide con el decodificador actual. Consulta la [explicación byte a byte, separación Modbus/BLE y ejemplo hexadecimal completo](../docs/CONTRATO_BLE.md).
>
> **El contrato válido es el que decodifica `App/src/services/probeService.ts`.** El firmware debe emitir exactamente esto. El byte 15 es el **identificador de formato**: `0` son 16 bytes con sólo suelo y batería, y `1` son 20 bytes que añaden las tres magnitudes del BME280 empaquetadas en bits. Veinte bytes es el máximo que cabe en una notificación con el MTU por defecto de BLE, así que no hace falta negociar MTU ni partir la lectura en dos paquetes. Ver [integración](../docs/INFORME%201%20.docx.md#integracion-bme280).

```text
 ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │13 │14 │15 │
 ├───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┼───┤
 │ HumS  │ TempS │  EC   │  pH   │   N   │   P   │   K   │Bat│rsv│
 └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───┴───┘
```

Todos los campos multibyte son **big-endian**, igual que Modbus.

| Bytes | Campo | Tipo | Escala |
| :--- | :--- | :--- | :--- |
| 0–1 | Humedad volumétrica | `uint16` | × 10 (`0x015E` = 350 → 35,0 %) |
| 2–3 | Temperatura de suelo | **`int16`** | × 10, **con signo** (admite bajo 0 °C) |
| 4–5 | Conductividad eléctrica | `uint16` | µS/cm directo |
| 6–7 | pH | `uint16` | **× 10** (`0x0041` = 65 → 6,5 pH) |
| 8–9 | Nitrógeno | `uint16` | mg/kg |
| 10–11 | Fósforo | `uint16` | mg/kg |
| 12–13 | Potasio | `uint16` | mg/kg |
| 14 | Batería | **`uint8`** | **porcentaje 0–100**, no milivoltios |
| 15 | **Identificador de formato** | `uint8` | `1` = 20 bytes con ambiente, el formato del producto; `0` = 16 bytes, tolerado sólo para prototipos sin BME280; otro valor se rechaza |
| 16–19 | **Ambiente BME280** (sólo v1) | 32 bits | Temperatura 12 bits `(°C × 10) + 400`; presión 12 bits `hPa − 300`; humedad 8 bits `% × 2`. Todos los bits a uno = sin dato → `NULL` |

**Estado:** no hay firmware fuente en el repositorio y el mapa de registros de la sonda **no está confirmado contra la ficha del proveedor**. Antes de fabricar hace falta una **captura BLE/Modbus real del SKU adquirido** y la ficha técnica del vendedor.


---

## 7. Esquemático de la V2 — especificación por etapas

> **Decisión de versión, acotada a la V2.** Esta versión usa una **placa de desarrollo ESP32-WROOM-32 (DevKit)**. El proyecto sigue definido sobre el **módulo WROOM-32 desnudo**, que es lo que costea la línea del BOM; la DevKit es una elección de prototipo para llegar antes a una placa funcional. La versión de producción vuelve al módulo desnudo, y entonces hay que agregar a la portadora el LDO de 3,3 V, el USB-UART y el circuito de auto-reset que hoy aporta la DevKit. **Esto cierra la decisión D1 solo para la V2.**

### 7.0. Nets del sistema

Nombrar las redes antes de dibujar evita la mitad de los errores de ERC:

| Net | Tensión | Origen |
| :--- | :--- | :--- |
| `VBAT` | 3,0 – 4,2 V | Celda LiPo, pin 1 del JST |
| `VBAT_PROT` | 3,0 – 4,2 V | Después del fusible y la protección de polaridad |
| `+5V` | 5,0 V | Salida del módulo combinado, después del interruptor |
| `+3V3` | 3,3 V | Pin `3V3` de la DevKit, de su regulador interno |
| `5V_SONDA` | 5,0 V conmutados | Después del P-MOSFET de corte |
| `GND` | 0 V | Masa única, común a sonda y placa |

### 7.1. Etapa 1 — Alimentación

| Ref | Componente | Función |
| :--- | :--- | :--- |
| `BT1` | LiPo 1S 2000 mAh con PCM | Fuente de energía |
| `J1` | JST-PH 2,0 mm, 3 pines | Conector de batería |
| `F1` | PTC rearmable | Protección de **cortocircuito y sobrecorriente** |
| `D1` | Protección de **polaridad inversa** | Schottky en serie o P-MOSFET tipo diodo ideal |
| `MOD1` | PCB combinada USB-C: carga más elevación a 5 V | Carga la celda y genera los 5 V |
| `SW1` | Interruptor rocker SPST | Corta el consumo del equipo |
| `C1` | 100 µF electrolítico o tántalo | Reserva en `+5V` para los picos de la sonda |
| `C2` | 100 nF cerámico | Desacoplo de alta frecuencia en `+5V` |

**Cadena:** `BT1` → `J1` → `F1` → `D1` → `VBAT_PROT` → `MOD1` (`B+` / `B−`) → salida de 5 V → `SW1` → `+5V`.

#### Fusible y diodo no son lo mismo

La lista de partida pedía «algún diodo de protección de cortocircuito». Son dos protecciones distintas y hacen falta las dos:

| Componente | Protege contra | Qué pasa si falta |
| :--- | :--- | :--- |
| `F1` PTC rearmable | Cortocircuito y sobrecorriente | Un corto en la sonda descarga la celda a través de las pistas |
| `D1` Schottky o P-MOSFET | Conectar la batería al revés | Se destruyen `MOD1` y la DevKit |

El Schottky en serie es barato pero cae 0,3 – 0,4 V, y sobre una celda que termina en 3,0 V eso es mucho. **La alternativa recomendada es un P-MOSFET en configuración de diodo ideal**, que cae milivoltios. Dimensionar el PTC después de medir el consumo real de la sonda a 5 V: la corriente de retención debe quedar sobre el peak de medición y bajo la corriente de falla.

#### Dónde va `SW1` — decisión cerrada

**Requisito:** el equipo debe cargar la batería estando completamente apagado.

Eso descarta poner `SW1` en serie con la batería: cortaría la celda antes de `MOD1` y dejaría sin alimentación también al cargador. **`SW1` va después de `MOD1`, del lado de los 5 V.** El cargador queda siempre conectado a la celda y carga con el equipo apagado.

Quedan dos formas de hacerlo, y cuál se usa depende de una verificación sobre el módulo físico:

| | **A. En serie con `OUT+`** | **B. Sobre el pin `EN` del elevador** |
| :--- | :--- | :--- |
| Condición | Siempre posible | Solo si `MOD1` expone `EN`, `KEY` o `SHDN` |
| Corriente por el contacto | Toda la carga, picos de ~300 mA | Microamperios |
| Consumo con el equipo apagado | El elevador sigue en vacío | Elevador deshabilitado |
| Carga apagado | Sí | Sí |

**Verificar primero si `MOD1` tiene pad `EN` o `KEY`.** Si lo tiene, la opción **B** es mejor: el elevador se apaga de verdad y el interruptor no conduce corriente de carga, así que dura más. Si no lo tiene, va la **A**, que siempre funciona.

Dibujar el esquemático con la **A** y dejar el pad `EN` accesible con una isla puenteable: así se puede migrar a la **B** sin rehacer la placa.

#### Regla de programación

`SW1` se pone en **OFF antes de conectar el USB de la DevKit**.

Con `SW1` cerrado, los 5 V del elevador llegan a `VIN` al mismo tiempo que el USB de la DevKit inyecta sus propios 5 V: dos fuentes empujando el mismo nodo. Con `SW1` abierto, `VIN` queda aislado y la DevKit se alimenta sola por USB, que es lo correcto. El BME280 y el transceptor siguen alimentados desde el pin `3V3`, así que se puede depurar todo salvo la sonda.

Esta regla es la razón por la que **no hace falta un diodo de aislamiento** entre `+5V` y `VIN`.

#### El tercer pin del JST — decisión cerrada

**El tercer pin queda como NC, no conectado.** No se rutea a ninguna parte y se documenta en el esquemático con una etiqueta `NC` explícita, no dejándolo suelto sin comentario: un pin sin conexión declarada es indistinguible de un olvido cuando alguien revise la hoja.

| Pin `J1` | Señal |
| :--- | :--- |
| 1 | `VBAT` |
| 2 | `GND` |
| 3 | **NC** |

Si la celda que se compre trae NTC en ese pin, queda sin usar. Conviene anotarlo también en la serigrafía, junto al conector, para que nadie lo puentee a masa durante un ensamblaje posterior.

### 7.2. Etapa 2 — Control

| Ref | Componente | Función |
| :--- | :--- | :--- |
| `U1` | DevKit ESP32-WROOM-32 | Control, BLE y adquisición |
| `C3` | 100 µF | Reserva en `VIN` de la DevKit |
| `C4` | 100 nF | Desacoplo en `VIN` |
| `C5`, `C6` | 10 µF y 100 nF | Desacoplo en `+3V3` |
| `SW2` | Pulsador táctil | Disparo de medición y despertar |
| `R1` | 10 kΩ | Pull-up del pulsador |
| `C7` | 100 nF | Antirrebote del pulsador |
| `D2`, `D3` | LED verde y azul | Estado de lectura y de enlace |
| `R2`, `R3` | Limitadoras de LED | Ver cálculo más abajo |
| `Q1` | P-MOSFET `AO3401A` o `IRLML6402` | Corte de `5V_SONDA` |
| `Q2` | N-MOSFET `2N7002` | Adapta el nivel del GPIO a la compuerta de `Q1` |
| `R4` | 100 kΩ | Pull-up de compuerta de `Q1` hacia `+5V` |
| `R5` | 1 kΩ | Serie en la compuerta de `Q2` |
| `R6` | 100 kΩ | **Pull-down de la compuerta de `Q2`** |
| `U3` | Módulo BME280 I²C | Temperatura, humedad y presión |
| `R7`, `R8` | 4,7 kΩ | Pull-ups de `SDA` y `SCL` |
| `R9`, `R10` | 100 kΩ y 100 kΩ | Divisor de medición de batería |
| `Q3` | N-MOSFET `2N7002` | Conmuta el divisor, ver más abajo |
| `R14` | 100 kΩ | Pull-down de compuerta de `Q3` |
| `C9` | 100 nF | Reserva de carga en el nodo del ADC |

**`R6` no es opcional.** Sin el pull-down, la compuerta de `Q2` queda flotando durante el arranque del ESP32 y **la sonda puede alimentarse sola antes de que el firmware tome control del pin**. Lo mismo vale para `R4`: mantiene `Q1` cortado por defecto.

#### Alimentación de la DevKit

`+5V` entra por `VIN`. El regulador interno de la DevKit genera `+3V3`, que alimenta al BME280 y al transceptor. **No conectar nunca `+5V` al pin `3V3`.**

Los capacitores van en `VIN`: `C3` de 100 µF absorbe el escalón de corriente cuando arranca la radio BLE, y `C4` de 100 nF va lo más cerca posible del pin.

#### Cálculo de las limitadoras de LED

La resistencia sale de la tensión sobrante dividida por la corriente deseada:

| LED | Caída típica | Corriente | Resistencia |
| :--- | :--- | :--- | :--- |
| Verde | 2,0 V | 5 mA | 260 Ω, se usa **270 Ω** |
| Azul | 3,0 V | 3 mA | 100 Ω, se usa **120 Ω** |

El azul queda muy justo: con 3,3 V de alimentación y 3,0 V de caída apenas hay margen, y el brillo varía mucho entre lotes. Si hace falta verlo bajo sol directo, conviene alimentarlo desde `+5V` con su propio transistor, o elegir un LED azul de alta eficiencia. **El BOM compra tres LED y el diseño usa dos**: decidir si se agrega un tercero de carga o se corrige la cantidad comprada.

#### Divisor de medición de batería — decisión cerrada

Es lo que alimenta el byte 14 de la trama BLE, el porcentaje de batería.

**Topología:** `VBAT_PROT` → `R9` 100 kΩ → nodo `VBAT_SENSE` → `R10` 100 kΩ → drenador de `Q3` → `GND`. El nodo `VBAT_SENSE` va a `GPIO34` y lleva `C9` de 100 nF a masa. La compuerta de `Q3` va a un GPIO libre, `GPIO25`, con `R14` de 100 kΩ como pull-down.

**Por qué conmutado y no un divisor fijo.** Un divisor permanente de 100 k + 100 k tiene dos problemas, y el segundo es de corrección, no de consumo:

1. Drena ~18,5 µA sin parar. Irrelevante frente a los miliamperios de la DevKit, pero se arrastra a la versión con módulo desnudo.
2. **Con el equipo apagado por `SW1`, el ESP32 queda sin alimentación mientras el divisor sigue aplicando ~2,1 V a `GPIO34`.** Eso inyecta corriente por los diodos de protección de una entrada sin alimentar. Con 100 kΩ la corriente es pequeña y no rompe nada, pero es una condición que conviene no dejar puesta.

Con `Q3`, al estar el ESP32 apagado la compuerta cae por `R14`, el MOSFET corta y el nodo del ADC queda en cero. El firmware sube `GPIO25`, espera a que `C9` se estabilice, lee y vuelve a bajarlo.

**Escalado:** a 4,2 V de celda el nodo entrega 2,10 V, y a 3,0 V entrega 1,50 V. Ambos caen dentro del rango utilizable de `ADC1` con atenuación de 11 dB. `C9` es necesario porque el ADC del ESP32 muestrea sobre un condensador interno y una impedancia de fuente de 50 kΩ no alcanza a recargarlo entre muestras.

**Calibración:** el ADC del ESP32 no es lineal en los extremos. Medir con multímetro en `TP1` y en `TP9` y ajustar en firmware, no asumir la razón teórica de 0,5.

### 7.3. Etapa 3 — Periféricos

| Ref | Componente | Función |
| :--- | :--- | :--- |
| `U2` | `SP3485` SOIC-8 | Transceptor RS-485 a 3,3 V |
| `C8` | 100 nF | Desacoplo de `U2` |
| `J2` | Borne de tornillo o JST de 4 vías | Conexión de la sonda |
| `R11` | 120 Ω | Terminación del bus |
| `R12`, `R13` | 4,7 kΩ | Polarización *fail-safe* |
| `D4` | `SM712` SOT-23 | TVS específico para RS-485 |

**Conexionado de `U2`:**

| Pin | Señal | Va a |
| :--- | :--- | :--- |
| 1 | `RO` | `GPIO16`, RX2 |
| 2 | `/RE` | Unido al pin 3 |
| 3 | `DE` | `GPIO4` |
| 4 | `DI` | `GPIO17`, TX2 |
| 5 | `GND` | `GND` |
| 6 | `A` | `J2` pin 3 |
| 7 | `B` | `J2` pin 4 |
| 8 | `VCC` | `+3V3`, con `C8` al lado |

**Conector de la sonda `J2`:** pin 1 `5V_SONDA`, pin 2 `GND`, pin 3 `A`, pin 4 `B`. Los 5 V salen del elevador **después** del corte por `Q1`.

#### La terminación de 120 Ω probablemente sobra

`R11` existe para evitar reflexiones en buses largos. Con **2 m de cable y 9600 baudios** no hay reflexión que corregir, y en cambio la terminación **consume del orden de 25 mA extra mientras el transceptor transmite**. Conviene dejarla como huella sin montar, con dos islas puenteables, y montarla solo si aparecen errores de CRC.

La polarización *fail-safe* `R12` y `R13` sí conviene: define el estado del bus cuando nadie transmite. Consume alrededor de 350 µA de forma permanente mientras haya `+3V3`.

#### ¿Se corta también el transceptor?

El diagrama de la V1 habla de cortar «sonda y bus», pero `U2` se alimenta de `+3V3` y `Q1` corta `+5V`. **Tal como está dibujado, el transceptor queda siempre alimentado.** Hay que decidir: dejarlo permanente y aceptar su consumo más el de la polarización, o agregar un segundo MOSFET en `+3V3`. Con el interruptor rocker de la etapa 1 el punto pierde urgencia para la V2.

### 7.4. Lo que faltaba en la lista de partida

Nada de esto estaba enumerado y va al esquemático:

1. **Divisor de batería** `R9` y `R10` hacia `GPIO34`: sin él no hay indicación de carga, y el byte 14 de la trama BLE la transporta.
2. **`R4` y `R6`**, las resistencias que mantienen la sonda apagada durante el arranque.
3. **Pull-ups de I²C** `R7` y `R8`: muchos módulos BME280 ya los traen. Verificar antes de duplicarlos.
4. **Limitadoras de LED** `R2` y `R3`.
5. **Desacoplos** `C5` a `C8`, uno por integrado.
6. **Polarización *fail-safe* y terminación** del bus.
7. **TVS con SKU**, `SM712`, no un símbolo genérico.
8. **Puntos de prueba y puente de medición de corriente:** ver la sección 7.6. Sin ellos no se puede ejecutar el plan de medición de consumo.
9. **Agujeros de montaje** acotados contra la carcasa.
10. **Los dos conectores USB. Resuelto:** al exterior sale solo el USB-C de `MOD1`, el de carga. El de la DevKit queda interno y se usa abriendo la carcasa, siempre con `SW1` en OFF. Conviene además sacar un header de 4 pines con `GND`, `TX0`, `RX0` y `EN` junto a la DevKit, para poder reprogramar con un adaptador externo sin depender del micro-USB si este se daña.
11. **Comportamiento al cargar y medir a la vez:** definir si se permite o si el firmware lo bloquea.

### 7.5. Trampas del ESP32 que condicionan este pinout

| Pin | Problema |
| :--- | :--- |
| `GPIO0` | Pin de *strapping*. En la DevKit **ya está cableado al botón BOOT**. Si se le cuelga además el pulsador de medición, una pulsación durante el arranque entra en modo programación. **Conviene mover `SW2` a `GPIO33` o `GPIO27`**, que son RTC y despiertan del sueño profundo |
| `GPIO2` | *Strapping*. Un LED a masa lo deja en nivel bajo, que es el estado válido. Tolerable |
| `GPIO15` | *Strapping*. En bajo durante el arranque silencia el registro de inicio. Arranca igual, pero se pierde diagnóstico |
| `GPIO5` | *Strapping*, debe estar alto al arrancar. `R4` y `R6` lo dejan en un estado definido |
| `GPIO12` | **No usar.** En alto durante el arranque cambia la tensión de flash y puede dejar la placa sin arrancar |
| `GPIO6` a `GPIO11` | **No usar.** Van a la memoria flash del módulo |
| `GPIO34` | Solo entrada, sin pull interno. Correcto para el divisor: pertenece a `ADC1`, el único que funciona con la radio encendida |
| `GPIO16` y `GPIO17` | Libres en WROOM-32. **En WROVER los ocupa la PSRAM.** Confirmar que la DevKit monta WROOM y no WROVER |

#### El consumo en reposo de la DevKit

Esto obliga a retirar una cifra: **el presupuesto de 12 µA de la sección 3.5 es inalcanzable con una DevKit.** Su regulador `AMS1117` consume del orden de 5 a 10 mA en vacío, y el conversor USB-serie agrega lo suyo. El sueño profundo en una DevKit típica queda en **decenas de miliamperios**, no en microamperios: unas mil veces más.

Por eso `SW1` deja de ser un accesorio y pasa a ser **la única razón por la que la DevKit es viable en la V2**: el equipo se apaga físicamente entre usos y el consumo en reposo se vuelve irrelevante. El presupuesto de 12 µA vuelve a la conversación recién con el módulo desnudo.

### 7.6. Puntos de prueba y medición

Sin esto no se puede ejecutar el plan de medición de consumo, que es una de las puertas de la sección 0.4. Van en el esquemático como símbolos `TestPoint`, aunque su valor real aparezca recién en el ruteo.

| Ref | Nodo | Para qué |
| :--- | :--- | :--- |
| `TP1` | `VBAT_PROT` | Tensión real de celda; calibrar el divisor |
| `TP2` | `+5V` | Salida del elevador después de `SW1` |
| `TP3` | `+3V3` | Regulador de la DevKit bajo carga |
| `TP4` | `5V_SONDA` | Verificar que el power gate abre y cierra |
| `TP5` | `A` | Bus RS-485, línea A |
| `TP6` | `B` | Bus RS-485, línea B |
| `TP7` | `GND` | Retorno, junto a `TP1` y `TP2` |
| `TP8` | `GND` | Retorno, junto a `TP5` y `TP6`, para sonda diferencial |
| `TP9` | `VBAT_SENSE` | Nodo del divisor; comparar contra `TP1` al calibrar |

#### `JP1`, el puente que hace medible el consumo

**Este es el más importante y el que más se olvida.** Un punto de prueba deja ver una tensión, pero para medir corriente hay que **abrir el circuito** e intercalar el amperímetro. Si la batería está soldada en firme, no hay dónde hacerlo sin cortar una pista.

`JP1` es un puente de dos islas en serie con `VBAT`, entre `J1` pin 1 y `F1`. Se fabrica unido por una pista fina entre ambas islas:

- **Uso normal:** la pista los une, no hay que hacer nada.
- **Para medir:** se corta la pista y se sueldan dos cables al amperímetro. Al terminar se restablece con una gota de estaño.

Separación recomendada de 2,54 mm, con las islas lo bastante grandes para soldar cable, no solo para una punta.

#### Dónde ubicarlos físicamente

La carcasa se abre para programar, así que los puntos de prueba **no necesitan salir al exterior**, pero sí quedar accesibles con la placa montada y la tapa abierta:

1. **Agrupar `TP1`, `TP2`, `TP3`, `TP7` y `JP1` en un solo borde**, el de alimentación, en una fila. Así se mide todo el árbol sin mover la punta de sitio.
2. **`TP5`, `TP6` y `TP8` van juntos y cerca de `J2`**, el conector de la sonda, para enganchar una sonda diferencial sin cables largos que capten ruido.
3. **`TP4` cerca de `Q1`**, para ver el corte del power gate en el mismo punto donde ocurre.
4. **`TP9` junto al divisor**, al lado de `R9` y `R10`.
5. **No ubicar ninguno bajo la DevKit ni bajo `MOD1`:** quedarían tapados por la placa hija y son inalcanzables sin desoldar.
6. **Ningún punto de prueba dentro del área libre de cobre de la antena**, los 15 × 10 mm de la sección 4.1.

Islas de 1,5 a 2,0 mm de cobre expuesto, o perforadas de 1,0 mm si se prefiere enganchar pinzas. Todas rotuladas en serigrafía con el nombre del net, no con el número de referencia: en terreno sirve leer `+3V3`, no `TP3`.

### 7.7. Mapa de pines de la V2

**Este mapa reemplaza al de la sección 4.3**, que corresponde a la V1. Cambian dos asignaciones y se agrega una tercera.

| GPIO | Señal | Va a | Nota |
| :--- | :--- | :--- | :--- |
| `GPIO16` | `RX2` | `U2` pin 1, `RO` | Libre en WROOM-32 |
| `GPIO17` | `TX2` | `U2` pin 4, `DI` | Libre en WROOM-32 |
| `GPIO4` | `DE` y `/RE` | `U2` pines 2 y 3, unidos | Alto transmite, bajo recibe |
| `GPIO5` | Power gate | `R5` hacia compuerta de `Q2` | *Strapping*; `R6` lo define al arrancar |
| `GPIO21` | `SDA` | `U3` y `R7` | |
| `GPIO22` | `SCL` | `U3` y `R8` | |
| `GPIO34` | `VBAT_SENSE` | Nodo de `R9`, `R10` y `C9` | Solo entrada, `ADC1_CH6` |
| `GPIO25` | Habilitación del divisor | Compuerta de `Q3` con `R14` | **Nuevo respecto de la V1** |
| `GPIO33` | Pulsador | `SW2` y `R1` | **Cambia:** la V1 usaba `GPIO0` |
| `GPIO2` | LED verde | `R2` | *Strapping* tolerable |
| `GPIO15` | LED azul | `R3` | *Strapping*; en bajo silencia el log de arranque |

#### Los dos cambios respecto de la V1, y por qué

**El pulsador se va de `GPIO0` a `GPIO33`.** En la DevKit, `GPIO0` **ya está cableado al botón BOOT de la placa**. Dejar ahí el pulsador de medición significa que apretarlo durante el arranque mete al ESP32 en modo programación en vez de tomar una lectura. `GPIO33` es RTC, así que sirve para despertar del sueño profundo, y no es pin de *strapping*.

**`GPIO25` es nuevo** y habilita el divisor de batería. También es RTC y queda libre.

#### Pines que no se pueden usar

| GPIO | Motivo |
| :--- | :--- |
| `GPIO6` a `GPIO11` | Conectados a la memoria flash del módulo. Usarlos cuelga la placa |
| `GPIO12` | *Strapping* de tensión de flash. En alto al arrancar puede dejar la placa sin iniciar |
| `GPIO0` | Ya ocupado por el botón BOOT de la DevKit |
| `ADC2` completo | No funciona con la radio encendida. Por eso la batería se lee en `GPIO34`, que es `ADC1` |

#### Consumo declarado de la V2

Para que no se arrastre una cifra equivocada: **la V2 no declara autonomía ni consumo en reposo.** La DevKit consume miliamperios en vacío y eso está aceptado para esta versión. El equipo se apaga con `SW1` entre usos, y la medición de consumo que exige la sección 0.4 se hace igual, con `JP1`, para tener el dato real antes de la versión con módulo desnudo.

### 7.8. Orden sugerido para dibujar

1. Hoja de alimentación completa, con sus nets nombradas.
2. DevKit con sus desacoplos y los puntos de prueba.
3. Power gate `Q1` y `Q2` con `R4` y `R6`, que es donde más se equivoca uno.
4. Divisor conmutado `R9`, `R10`, `Q3`, `R14` y `C9`.
5. Transceptor, conector de sonda, terminación y TVS.
6. BME280, pulsador y LED.
7. Puntos de prueba y `JP1`.
8. ERC en cero **antes** de asignar una sola huella.
