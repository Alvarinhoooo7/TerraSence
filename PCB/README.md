# 🔌 TerraSense · PCB V2

Especificación del hardware del instrumento portátil de medición de suelo: placa portadora, árbol de alimentación, control y periféricos. Este documento es la fuente para dibujar el esquemático y rutear la placa.

> ### 🛑 Estado de verificación — leer antes de usar este documento
>
> **Describe un diseño en curso, no un producto verificado.** Las secciones 4 a 9 se escribieron antes de dibujar el esquemático y conservan designadores y nets antiguos: **cuando difieran, mandan el esquemático de KiCad y [`Firmware/pines.h`](../Firmware/pines.h)**. El mapa de pines de la sección 5.7 ya está alineado con ambos.
>
> | Afirmación | Estado real |
> | :--- | :--- |
> | Placa ruteada | **Sí.** Esquemático y ruteo en `Medidor De Suelos V2/`. Primer lote de 5 placas sin ensamblar pedido a JLCPCB; aún no se arma ni se prueba |
> | Firmware | **Existe en [`Firmware/`](../Firmware/README.md)**: vinculación BLE, LEDs, buzzer, trama de 20 bytes y lectura Modbus de la sonda, esta última sin ensayo en banco |
> | Mapa de registros de la sonda | **Coincide con el manual del fabricante** de la muestra adquirida (ComWinTop CWT-Soil-NPKPHCTH-S). Falta la captura real en banco |
> | BLE 5.0 | El ESP32-WROOM-32E especifica **Bluetooth 4.2 BR/EDR y BLE**. La certificación del módulo no acredita el equipo terminado |
> | Consumo en reposo y autonomía | **No se declaran en la V2.** Ver sección 5.9 |
> | IP67 y peso bajo 280 g | **Objetivos de diseño sin ensayo.** No hay actas ni pesaje del conjunto |
> | Sonda operando a 5 V | Solo puede afirmarse del **SKU y variante validados**, que aún no se adquieren |
>
> Las cifras de componentes y costos viven en la lista `bom` de [`finanzas/supuestos.json`](../finanzas/supuestos.json) y se publican en [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx), que regenera `python finanzas/modelo.py`. **No editar ese Excel a mano.**

---

## 📑 Tabla de Contenidos

- [1. Alcance de la V2](#1-alcance-de-la-v2)
- [2. Especificaciones generales](#2-especificaciones-generales)
- [3. Arquitectura y nets del sistema](#3-arquitectura-y-nets-del-sistema)
- [4. Guía de Implementación del Esquemático](#4-guía-de-implementación-del-esquemático)
- [5. Puntos de prueba y medición](#5-puntos-de-prueba-y-medición)
- [6. Fabricación de la PCB y Diseño mecánico](#6-fabricación-de-la-pcb-y-diseño-mecánico)
- [7. Decisiones de Diseño y Detalles Técnicos (Rationale)](#7-decisiones-de-diseño-y-detalles-técnicos-rationale)
- [8. Orden de trabajo y pendientes](#8-orden-de-trabajo-y-pendientes)
- [9. Netlist completa](#9-netlist-completa)

---

## 1. Alcance de la V2

La V2 es una **placa portadora**: no integra el silicio, sino que sostiene y conecta tres módulos comerciales más la electrónica discreta que los une.

| Módulo | Qué aporta |
| :--- | :--- |
| DevKit ESP32-WROOM-32 | Microcontrolador, radio BLE, regulador de 3,3 V y USB-UART |
| **`LX-LCBST`**, PCB combinada USB-C | Carga de la celda con sus protecciones y elevación a 5,0 V |
| Módulo BME280 I²C | Temperatura del aire, humedad relativa y presión |

### 1.1. Decisiones cerradas

| Decisión | Valor | Motivo |
| :--- | :--- | :--- |
| Microcontrolador | **DevKit ESP32-WROOM-32**, no módulo desnudo | Evita rutear LDO, USB-UART y auto-reset en la portadora |
| Carga con el equipo apagado | **Sí** | Define dónde va `SW1`: después del módulo, nunca en serie con la celda |
| USB al exterior | **Solo el USB-C del módulo de carga** | El micro-USB de la DevKit queda interno |
| Tercer pin del conector de batería | **NC**, no conectado | |
| Divisor de batería | **Conmutado por MOSFET**, no fijo | Evita dejar tensión sobre una entrada sin alimentar |
| Consumo en reposo | **No se declara** | La DevKit consume miliamperios; `SW1` lo resuelve apagando |
| Trama BLE | **20 bytes, formato único** | Contrato de la sección 6.9 |

> La elección de DevKit es **propia de esta versión**. El proyecto está definido sobre el módulo WROOM-32 desnudo, que es lo que costea el BOM. Volver al módulo desnudo obliga a agregar a la portadora el regulador de 3,3 V, el USB-UART y el circuito de auto-reset.

### 1.2. Contenido de la carpeta

| Ruta | Qué es |
| :--- | :--- |
| `README.md` | Este documento |
| `BOM_TerraSense.xlsx` | Lista de materiales, **generada**; no editar a mano |
| `Medidor De Suelos V2/` | Proyecto KiCad de la V2: esquemático y ruteo. **Fuente de verdad del hardware** |
| `V1/` | Prototipo anterior, congelado. No se edita ni se usa como referencia de diseño |
| `V3/` | Placa del instrumento del informe 2 (90 × 64 mm): esquemático con circuitos integrados soldados y placa ruteada en dos capas con planos de masa. Local, fuera de git; no está liberada a fabricación |

Las vistas de la V3 y los anexos C y D se regeneran con `python finanzas/figuras_e2.py`, que toma los renders de la placa con `kicad-cli`. El estado eléctrico y mecánico pendiente está en el [plan de implementación del informe 2](<../Evaluacion/Evaluacion 2/PLAN DE IMPLEMENTACION.md>). La lista de materiales y los costos se mantienen por decisión del proyecto.

---

## 2. Especificaciones generales

| Parámetro | Valor de diseño | Justificación |
| :--- | :--- | :--- |
| **Microcontrolador** | DevKit ESP32-WROOM-32 | Doble núcleo a 240 MHz, 520 KB SRAM, 4 MB de flash. [Ficha Espressif](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html): **Bluetooth 4.2 BR/EDR y BLE**, no 5.0 |
| **Sonda de suelo** | Industrial 7 en 1, RS-485 Modbus RTU | ComWinTop CWT-Soil-NPKPHCTH-S. Alimentación **4,5 – 30 V DC**, 0,5 W como máximo a 24 V, IP68, cable de 2 m; electrodos de aleación anticorrosión, grado de acero por confirmar |
| **Alimentación de la sonda** | **5,0 V DC** conmutados | Operación directa sin elevar a 12 V; menor estrés térmico y menor consumo |
| **Sensor ambiental** | BME280 I²C a 3,3 V | Temperatura del aire, humedad relativa y presión en el punto de lectura |
| **Transceptor de bus** | SP3485 a 3,3 V | Diferencial industrial semidúplex, sin desplazadores de nivel |
| **Batería** | LiPo 1S 3,7 V, 2.000 mAh con PCM | Formato prismático plano, ~35 g, sin portaceldas |
| **Carga y elevación** | Módulo **`LX-LCBST`** | Resuelve carga, protección y elevación a 5 V en un submódulo |
| **Encendido** | Interruptor rocker SPST | Corta el consumo entre usos |
| **Formato** | Instrumento portátil de mano | Inserción manual directa en el suelo |

---

## 3. Arquitectura y nets del sistema

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                    DIAGRAMA DE BLOQUES — TerraSense V2                      │
 └─────────────────────────────────────────────────────────────────────────────┘

   [ USB-C exterior ]
          │
          ▼
  ┌───────────────────────────────┐        ┌──────────────────────────┐
  │  MOD1  LX-LCBST carga+boost   │◄───────┤ BT1 LiPo 1S 2000 mAh     │
  │  • Cargador con protecciones  │  VBAT  │ P1 / P2 pads soldados    │
  │  • Elevador 3,7 V ──► 5,0 V   │────────┤ F1 fusible 1 A · JP1     │
  │                               │        │ D1 M7 crowbar a GND      │
  └───────────────┬───────────────┘        └──────────────────────────┘
                  │ 5 V
                  ▼
            [ SW1 rocker ]
                  │
                  ▼  +5V ──────────────────────────────┐
  ┌───────────────┴───────────────┐                    │
  │  U1  DevKit ESP32-WROOM-32    │                    ▼
  │  VIN ◄── +5V   (C3, C4)       │          [ Q1 P-MOSFET power gate ]
  │  3V3 ──► +3V3  (C5, C6)       │             (mandado por GPIO5 vía Q2)
  └──┬─────────────┬──────────┬───┘                    │
     │             │          │                        ▼  5V_SONDA
     │ I²C         │ UART2    │ ADC                    │
     ▼             ▼          ▼                        │
 [ U3 BME280 ]  [ U2 SP3485 ] [ Divisor R9/R10 ]       │
       3V3         3V3          conmutado por Q3       │
                    │ A/B                              │
                    └──────────────┬───────────────────┘
                                   ▼
                        [ J2 conector de sonda ]
                     5V_SONDA · GND · A · B  +  D4 TVS
                                   │
                                   ▼
                    [ Sonda 7 en 1 RS-485, cable 2 m ]
```

### 3.1. Nets

Nombrar las redes antes de dibujar evita la mitad de los errores de ERC:

| Net | Tensión | Origen |
| :--- | :--- | :--- |
| `BATT 3.7V` | 3,0 – 4,2 V | Celda LiPo, pad `P1` |
| `VBAT_F` | 3,0 – 4,2 V | Después de `F1` |
| `+BATT 3.7V` | 3,0 – 4,2 V | Después de `JP1`; nodo protegido por `D1` |
| `+5V` | 5,0 V | Salida de `MOD1`, después de `SW1` |
| `3.3V` | 3,3 V | Pin `3V3` de la DevKit |
| `5V_SONDA` | 5,0 V conmutados | Después de `Q1` |
| `VBat_Sense` | 1,5 – 2,1 V | Nodo del divisor hacia `GPIO34` |
| `GND` | 0 V | Masa única, común a placa y sonda |

---

## 4. Guía de Implementación del Esquemático

Esta sección contiene las instrucciones directas para dibujar el esquemático en KiCad.

### 4.1. Etapa 1 — Alimentación

### 4.1. Componentes

| Ref | Componente | Encapsulado | Pines |
| :--- | :--- | :--- | :--- |
| `BT1` | LiPo 1S 2.000 mAh con PCM | Celda plana, fuera de placa | 2 cables |
| `P1` | Pad de soldadura `BAT+` | Isla de cobre | 1 |
| `P2` | Pad de soldadura `BAT−` | Isla de cobre | 1 |
| `F1` | Fusible de cartucho **1 A rápido** | Cartucho 5 × 20 mm sobre pads | 2 |
| `JP1` | Puente de medición de corriente | 2 islas | 2 |
| `D1` | **`M7`**, rectificador de silicio | SMA / DO-214AC | Á, K |
| `MOD1` | Módulo **`LX-LCBST`**, carga USB-C y elevación | Placa hija | `B+`, `B−`, `OUT+`, `OUT−` |
| `J3` | Terminal block 2 vías, salida al interruptor | THT | 2 |
| `SW1` | Interruptor rocker SPST | Panel, fuera de placa | 2 |
| `C1` | 100 µF, 35 V, aluminio **polarizado** | Lata SMD ~8 mm | 2 |
| `C2` | 100 nF `104K`, 50 V, cerámico X7R | 1206 | 2 |

> **`F1` y `D1` trabajan juntos.** No son dos protecciones independientes: el diodo detecta la inversión y el fusible es quien corta. Uno sin el otro no protege.

### 4.2. Esquema

```text
   BT1 (+) ── cable ──► P1 ──► F1 (1 A) ──► JP1 ──┬──► VBAT_PROT ──► MOD1.B+
                                                   │                  │
                                                   │                  ├──► R9 (divisor)
                                                   │                  └──► TP1
                                                   │
                                                  ─┴─ K
                                                  /_\  D1   en inversa: no conduce
                                                   │  Á
                                                   │
   BT1 (−) ── cable ──► P2 ─────────────────────── ┴──► GND


                     ┌──────────────┐
                     │ MOD1 LX-LCBST│
   USB-C exterior ──►│ B+      OUT+ │──► SW1 ──► +5V ──┬── C1 ── GND
                     │ B−      OUT− │──► GND           ├── C2 ── GND
                     └──────────────┘                  ├──► U1.VIN
                                                       ├──► Q1.S
                                                       └──► TP2
```

### 4.3. Conexiones

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `BT1` positivo | `P1` | `BATT 3.7V` |
| `BT1` negativo | `P2` | `GND` |
| `P1` | `F1` pin 1 | `BATT 3.7V` |
| `F1` pin 2 | `JP1` isla 1 | `VBAT_F` |
| `JP1` isla 2 | `D1` cátodo, `MOD1` `B+`, `R1` pin 1, `TP1` | `+BATT 3.7V` |
| `D1` ánodo | `GND` | `GND` |
| `P2` | `GND` | `GND` |
| `MOD1` `B−` | `GND` | `GND` |
| `MOD1` `Vo+` | `J3` pin 1, `TP11` | `5V` |
| `MOD1` `Vo−` | `GND`, `TP12` | `GND` |
| `J3` pin 1 | `SW1` pin 1, por cable | `5V` |
| `SW1` pin 2 | `J3` pin 2, por cable | `+5V` |
| `J3` pin 2 | `C1` pin 1, `C2` pin 1, `U1` `VIN`, `C3` pin 1, `C4` pin 1, `Q1` fuente, `R4` pin 1, `TP2` | `+5V` |
| `C1` pin 2, `C2` pin 2 | `GND` | `GND` |

### 4.2. Etapa 2 — Control

### 5.1. Componentes

| Ref | Componente | Encapsulado | Pines |
| :--- | :--- | :--- | :--- |
| `U1` | DevKit ESP32-WROOM-32 | Placa hija, zócalos | 30 o 38 |
| `C3` | 100 µF, 35 V, aluminio **polarizado** | Lata SMD ~8 mm | 2 |
| `C4` | 100 nF `104K`, 50 V, cerámico X7R | 1206 | 2 |
| `C5` | 10 µF, X7R | 0805 | 2 |
| `C6` | 100 nF, X7R | 0805 | 2 |
| `SW2` | Pulsador táctil | THT o SMD | 2 nets |
| `R4` | 10 kΩ | 0805 | 2 |
| `C6` | 100 nF | 0805 | 2 |
| `D2` | LED verde | 0805 | Á, K |
| `D3` | LED azul | 0805 | Á, K |
| `R5` | 270 Ω | 0805 | 2 |
| `R6` | 120 Ω | 0805 | 2 |
| `Q1` | P-MOSFET `AO3401A` | SOT-23 | G, D, S |
| `Q2` | N-MOSFET `2N7002` | SOT-23 | G, D, S |
| `R4` | 100 kΩ | 0805 | 2 |
| `R5` | 1 kΩ | 0805 | 2 |
| `R6` | 100 kΩ | 0805 | 2 |
| `R1` | 100 kΩ, 1 % | 1206 | 2 |
| `R2` | 100 kΩ, 1 % | 1206 | 2 |
| `C3` | 100 nF `104K`, 50 V, X7R | 1206 | 2 |

### 5.2. Conexiones de alimentación de la DevKit

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `+5V` | `U1` `VIN` | `+5V` |
| `+5V` | `C3` pin 1, `C4` pin 1 | `+5V` |
| `C3` pin 2, `C4` pin 2 | `GND` | `GND` |
| `U1` `GND` | `GND` | `GND` |
| `U1` `3V3` | `C5` pin 1, `C6` pin 1, `TP3` | `3.3V` |
| `C5` pin 2, `C6` pin 2 | `GND` | `GND` |

`3.3V` alimenta además a `U2`, `U3`, `R4`, `R7`, `R8` y `R12`, detallados en la etapa 3.

**No conectar nunca `+5V` al pin `3V3`.**

### 5.3. Pulsador `SW2`

```text
   +3V3 ──── R1 10k ────┬──── GPIO33
                        │
                        ├──── C7 100nF ──── GND
                        │
                        └──── SW2 ──── GND
```

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `3.3V` | `R4` pin 1 | `3.3V` |
| `R4` pin 2 | `U1` `GPIO33`, `SW2` pin 1, `C6` pin 1 | `BTN` |
| `SW2` pin 2 | `GND` | `GND` |
| `C6` pin 2 | `GND` | `GND` |

En reposo el pin queda alto por `R4`; al pulsar cae a cero. `C6` filtra el rebote del contacto.

**Va en `GPIO33`, no en `GPIO0`.** En la DevKit, `GPIO0` ya está cableado al botón BOOT: dejar ahí el pulsador significa que apretarlo durante el arranque mete al ESP32 en modo programación en vez de medir. `GPIO33` es RTC, así que despierta del sueño profundo, y no es pin de *strapping*.

### 5.4. LED de estado

```text
   GPIO2  ──── R2 270Ω ────►|──── GND      D2 verde
   GPIO15 ──── R3 120Ω ────►|──── GND      D3 azul
```

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `U1` `GPIO2` | `R5` pin 1 | `GPIO2` |
| `R5` pin 2 | `D2` ánodo | `LED_V` |
| `D2` cátodo | `GND` | `GND` |
| `U1` `GPIO15` | `R6` pin 1 | `GPIO15` |
| `R6` pin 2 | `D3` ánodo | `LED_A` |
| `D3` cátodo | `GND` | `GND` |

| LED | Color | Función | Caída | Corriente | Resistencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `D2` | Verde | Lectura exitosa y batería correcta | 2,0 V | 5 mA | **270 Ω** |
| `D3` | Azul | Enlace BLE activo | 3,0 V | 3 mA | **120 Ω** |

El azul queda justo: con 3,3 V de riel y 3,0 V de caída hay poco margen y el brillo varía entre lotes. Si hace falta verlo bajo sol directo, alimentarlo desde `+5V` con su propio transistor o usar un LED de alta eficiencia.

> **Superado por el esquemático:** la V2 monta tres LED (azul, verde y rojo en `IO25`, `IO26` e `IO27`), igual que la BOM. Ver sección 5.7.

### 5.5. Power gate de la sonda

```text
                    +5V ──────┬─────────────┬───────────────┐
                              │             │               │
                            R4 100k      S ─┴─ Q1           │ (a U1 VIN)
                              │        ┌────────┐           │
                              ├────────┤ G      │ P-MOSFET  │
                              │        └────┬───┘           │
                              │           D │               │
                              │             ▼ 5V_SONDA ──► J2.1, TP4
                              │
                              │  D
                          ┌───┴───┐
   GPIO5 ── R5 1k ────────┤ G  Q2 │ N-MOSFET
                    │     └───┬───┘
                 R6 100k      │ S
                    │         │
                   GND ───────┴──── GND
```

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `U1` `GPIO5` | `R5` pin 1 | `GPIO5` |
| `R5` pin 2 | `Q2` compuerta, `R6` pin 1 | `Q2_G` |
| `R6` pin 2 | `GND` | `GND` |
| `Q2` fuente | `GND` | `GND` |
| `Q2` drenador | `Q1` compuerta, `R4` pin 2 | `Q1_G` |
| `R4` pin 1 | `+5V` | `+5V` |
| `Q1` fuente | `+5V` | `+5V` |
| `Q1` drenador | `J2` pin 1, `TP4` | `5V_SONDA` |

**Funcionamiento:** `GPIO5` en alto satura `Q2`, que tira la compuerta de `Q1` a masa; con $V_{GS}$ de −5 V el P-MOSFET conduce y la sonda recibe 5 V. En bajo, `R4` devuelve la compuerta a `+5V`, $V_{GS}$ queda en cero y `Q1` corta.

**Orientación de `Q1`:** fuente a `+5V` y drenador a la carga. Así el diodo de cuerpo queda en inversa respecto del sentido de la corriente y el corte es real.

> **`R4` y `R6` no son opcionales.** Sin `R6`, la compuerta de `Q2` queda flotando durante el arranque del ESP32 y **la sonda puede alimentarse sola antes de que el firmware tome control del pin**. `R4` hace lo mismo del lado de `Q1`: lo mantiene cortado por defecto.

> Si `Q2` no satura bien con 3,3 V, reemplazar el `2N7002` por un `BSS138`, de umbral más bajo.

### 5.6. Divisor de medición de batería

Alimenta el byte 14 de la trama BLE, el porcentaje de batería.

```text
   VBAT_PROT ──── R9 100k ────┬──── GPIO34
                              │
                              ├──── C9 100nF ──── GND   (TP9 aquí)
                              │
                           R10 100k
                              │
                             GND
```

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `+BATT 3.7V` | `R1` pin 1 | `+BATT 3.7V` |
| `R1` pin 2 | `R2` pin 1, `C3` pin 1, `U1` `GPIO34`, `TP9` | `VBat_Sense` |
| `R2` pin 2 | `GND` | `GND` |
| `C3` pin 2 | `GND` | `GND` |

| Ref | Valor | Tolerancia | Encapsulado |
| :--- | :--- | :--- | :--- |
| `R1` | 100 kΩ | 1 % | 1206 |
| `R2` | 100 kΩ | 1 % | 1206 |
| `C3` | 100 nF `104K`, 50 V, X7R | — | 1206 |

#### Escalado

| Tensión de celda | En `GPIO34` |
| :--- | :--- |
| 4,2 V, llena | 2,100 V |
| 3,7 V, nominal | 1,850 V |
| 3,0 V, corte | 1,500 V |

La razón 1:2 deja el máximo en 2,1 V. Con atenuación de 11 dB el `ADC1` se mantiene lineal hasta cerca de 2,45 V, así que el rango completo de la celda cae en la zona útil y sobra margen.

#### Por qué 100 kΩ

- **Consumo:** 21 µA permanentes, unos 15 mAh al mes sobre una celda de 2.000 mAh. Menos del 1 %.
- **Impedancia de fuente:** 50 kΩ. Es alta para el ADC del ESP32 y por eso **`C3` no es opcional**: el conversor muestrea sobre un condensador interno y necesita que alguien le entregue esa carga.
- **Tolerancia 1 %** en ambas para que la razón sea repetible entre unidades. La disipación es de 88 µW, así que el encapsulado es indiferente; 1206 por comodidad de soldadura.

#### Por qué el divisor es fijo y no conmutado

Un divisor conmutado por MOSFET **en el lado bajo no funciona**, aunque parezca la solución evidente:

```text
   VBAT_PROT ── R9 ──┬── VBAT_SENSE ──► GPIO34
                     R10
                     │
                    Q3 apagado    ← camino a masa interrumpido
                     │
                    GND
```

Con el MOSFET cortado, el nodo de medición **no tiene camino a masa** y sube hasta la tensión de celda: 4,2 V aplicados sobre `GPIO34`, que tolera 3,3 V. Es peor que el consumo que se pretendía evitar.

Para cortar de verdad, el interruptor tiene que ir **arriba**, entre `+BATT 3.7V` y `R1`, lo que exige un P-MOSFET más un N-MOSFET de mando, igual que el power gate. Cuatro componentes para ahorrar 21 µA.

**No se justifica en la V2:** `SW1` corta los 5 V, no la batería, así que la celda queda conectada al divisor con el equipo apagado de todas formas.

#### Calibración

`V_bat = V_adc × 2` es la razón teórica, pero **el ADC del ESP32 no es lineal en los extremos y su referencia varía entre chips**. Medir con multímetro en `TP1` y `TP9` y ajustar en firmware. Promediar varias muestras: el nodo tiene impedancia alta y capta ruido.

### 4.3. Etapa 3 — Periféricos de salida y sensores

### 6.1. Componentes

| Ref | Componente | Encapsulado | Pines |
| :--- | :--- | :--- | :--- |
| `U3` | Módulo BME280 I²C de 4 pines (formato GY-BME280) | Placa hija | `VIN`, `GND`, `SCL`, `SDA` |
| `R7` | 4,7 kΩ | 0805 | 2 |
| `R8` | 4,7 kΩ | 0805 | 2 |
| `U2` | Módulo RS-485 (SP3485) | Placa hija / Módulo | `VCC`, `GND`, `RO`, `DI`, `RE/DE`, `A`, `B` |
| `C8` | 100 nF | 0805 | 2 |
| `J2` | Borne de tornillo o JST | 4 vías | 4 |
| `R11` | 120 Ω | 0805 | 2 |
| `R12` | 4,7 kΩ | 0805 | 2 |
| `R13` | 4,7 kΩ | 0805 | 2 |
| `D4` | `SM712` | SOT-23 | 3 |

### 6.2. Sensor ambiental BME280

```text
   +3V3 ──┬──── U3.VIN            (pad 6)
          ├──── R7 4k7 ──┬──── U3.SDA ──── GPIO21   (pad 3)
          └──── R8 4k7 ──│─┬── U3.SCL ──── GPIO22   (pad 4)
                         │ │
   GND ───────── U3.GND  │ │                         (pad 5)
```

La huella tiene **4 pads en línea, paso 2,54 mm**, en el orden del módulo GY-BME280 de 4 pines: `VIN`, `GND`, `SCL`, `SDA` (pads 6, 5, 4 y 3). El símbolo del esquemático dibuja además `CSB` y `SDO` (pines 1 y 2), pero la huella no los tiene: el módulo los resuelve en su propia placa (`CSB` a su 3,3 V para el modo I²C y `SDO` a masa, dirección `0x76`). El módulo trae un regulador propio; alimentado con 3,3 V en `VIN` entrega unos 3,0 V al sensor, dentro de su rango (comprobado en banco: responde en `0x76`).

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `3.3V` | `U3` `VIN`, `R7` pin 1, `R8` pin 1 | `3.3V` |
| `U3` `GND` | `GND` | `GND` |
| `U3` `SDA` | `R7` pin 2, `U1` `GPIO21` | `SDA` |
| `U3` `SCL` | `R8` pin 2, `U1` `GPIO22` | `SCL` |

| Magnitud | Rango | Exactitud |
| :--- | :--- | :--- |
| Temperatura del aire | −40 a +85 °C | ±0,5 °C |
| Humedad relativa | 0 a 100 % | ±3 % |
| Presión atmosférica | 300 a 1100 hPa | ±1 hPa |

Detalles que deciden el dibujo:

- **La dirección `0x76` y el modo I²C los fija el módulo de 4 pines**, que lleva `SDO` a masa y `CSB` alto en su placa. Un módulo de 6 pines (`VCC`, `GND`, `SCL`, `SDA`, `CSB`, `SDO`) no sirve en esta huella: `CSB` y `SDO` quedarían al aire.
- **Muchos módulos BME280 ya traen `R7` y `R8` montados.** Verificar antes de duplicarlos: en paralelo la resistencia de pull-up baja a la mitad y carga el bus de más.
- Es **BME280**, no BMP280: el BMP no mide humedad. El formato de 4 pines se vende con cualquiera de los dos chips (a veces rotulado «GY-BMEP»); el firmware informa al arrancar cuál encontró (ID `0x60` o `0x58`).

**Lectura local obligatoria:** la app usa estas tres magnitudes para tres celdas del grid 2×5; el pronóstico de la API solo las complementa. Los centinelas de ausencia se declaran por magnitud y **no se reemplazan con ceros ni con la última lectura buena**.

El sensor va en la parte posterior del chasis, tras una membrana microporosa de PTFE. **Debe ver aire exterior**: no encapsularlo.

### 6.3. Módulo Transceptor RS-485 (SparkFun S3485 o genérico)

Al utilizar el **módulo preensamblado** en lugar del chip suelto, el dibujo se simplifica radicalmente porque el módulo ya incluye el integrado, el condensador de desacoplo y (dependiendo del modelo) las resistencias de polarización.

```text
   GPIO16 -- RX-I (RO)        VCC (3-5V) -- 3.3V
   
   GPIO4  -- RTS (RE/DE)      A -- Hacia J2 (Terminal Block)
   
   GPIO17 -- TX-O (DI)        B -- Hacia J2 (Terminal Block)
   
   GND    -- GND              GND -- (Opcional, ya está a GND por el otro lado)
```

| Pin del Módulo | Conecta a | Net | Por qué |
| :--- | :--- | :--- | :--- |
| `RX-I` (o `RO`) | `U1` `GPIO16` | `RX2` | Pin de recepción de la UART2 del ESP32. |
| `TX-O` (o `DI`) | `U1` `GPIO17` | `TX2` | Pin de transmisión de la UART2 del ESP32. |
| `RTS` (o `RE/DE`) | `U1` `GPIO4` | `DE_RE` | Pin de control. Al ponerlo en `1`, el módulo transmite. Al ponerlo en `0`, el módulo escucha. |
| `VCC` | `3.3V` | `3.3V` | **CRÍTICO:** Debe ir a `3.3V` y NO a 5V. Si lo alimentas con 5V, enviará señales lógicas de 5V al ESP32 y lo freirá. El chip SP3485 funciona a 3.3V. |
| `GND` | `GND` | `GND` | Referencia común. |
| `A` | `J2` pin 3 | `RS485_A` | Línea diferencial positiva. Va directo al conector de la sonda. |
| `B` | `J2` pin 4 | `RS485_B` | Línea diferencial negativa. Va directo al conector de la sonda. |

> **Sobre el Modo de Bajo Consumo (Shutdown):** Dado que alimentamos el módulo directo de `3.3V` (y no del Power Gate), la forma de apagar el chip para que no consuma batería es vía software: poniendo `GPIO4` en un estado de alta impedancia o bajo, dependiendo del integrado, forzándolo a modo "Shutdown" (consume apenas 1µA).
### 6.4. Conector de la sonda (Terminal Block KF301-4P)

Utilizaremos un "Terminal Block" estándar de 4 vías (paso de 5.0mm o 5.08mm) para que el agricultor/usuario pueda atornillar los 4 cables pelados de la sonda (normalmente Rojo, Negro, Amarillo, Verde).

| Pin (Borne) | Señal | Viene de | Por qué |
| :--- | :--- | :--- | :--- |
| 1 | `5V_Sonda` | `Q1` drenador | **Poder:** La sonda industrial exige entre 5V y 30V para funcionar. Le damos 5V desde nuestro Power Gate (así la apagamos cuando no se usa para ahorrar batería). |
| 2 | `GND` | `GND` general | **Retorno:** La sonda requiere compartir masa con la placa para cerrar el circuito eléctrico y tener referencia RS-485. |
| 3 | `A` | `A` del Módulo RS-485 | **Datos +:** Cable de comunicación diferencial. |
| 4 | `B` | `B` del Módulo RS-485 | **Datos -:** Cable de comunicación diferencial. |

### 6.5. Terminación y polarización

| Desde | Hasta | Net |
| :--- | :--- | :--- |
| `R11` pin 1 | `RS485_A` | `RS485_A` |
| `R11` pin 2 | `RS485_B` | `RS485_B` |
| `R12` pin 1 | `3.3V` | `3.3V` |
| `R12` pin 2 | `RS485_A` | `RS485_A` |
| `R13` pin 1 | `RS485_B` | `RS485_B` |
| `R13` pin 2 | `GND` | `GND` |

**La terminación de 120 Ω probablemente sobra.** `R11` evita reflexiones en buses largos; con **2 m de cable y 4800 baudios** no hay reflexión que corregir, y **consume del orden de 25 mA extra mientras el transceptor transmite**. Dejarla como huella sin montar, con dos islas puenteables, y montarla solo si aparecen errores de CRC.

La polarización *fail-safe* `R12` y `R13` sí conviene: define el estado del bus cuando nadie transmite y evita que el receptor lea ruido como datos. Consume unos 350 µA mientras haya `3.3V`.

## 5. Puntos de prueba y medición

Sin esto no se puede ejecutar el plan de medición de consumo. Van en el esquemático como símbolos `TestPoint`.

### 7.1. Lista

| Ref | Nodo | Para qué |
| :--- | :--- | :--- |
| `TP1` | `+BATT 3.7V` | Tensión real de celda; calibrar el divisor |
| `TP2` | `+5V` | Salida del elevador después de `SW1` |
| `TP3` | `3.3V` | Regulador de la DevKit bajo carga |
| `TP4` | `5V_SONDA` | Verificar que el power gate abre y cierra |
| `TP5` | `A` | Bus RS-485, línea A |
| `TP6` | `B` | Bus RS-485, línea B |
| `TP7` | `GND` | Retorno, junto a `TP1` y `TP2` |
| `TP8` | `GND` | Retorno, junto a `TP5` y `TP6`, para sonda diferencial |
| `TP9` | `VBat_Sense` | Nodo del divisor; comparar contra `TP1` al calibrar |
| `TP10` | `BATT 3.7V` | Entrada de los pads de batería, **antes** de la protección |
| `TP11` | `5V` | `Vo+` del módulo, antes del interruptor |
| `TP12` | `GND` | Junto a `Vo−`, retorno de las dos medidas anteriores |

### 7.2. `JP1`, el puente que hace medible el consumo

Un punto de prueba deja ver una tensión, pero para medir **corriente** hay que **abrir el circuito** e intercalar el amperímetro. Con la batería soldada en firme no hay dónde hacerlo sin cortar una pista.

`JP1` es un puente de dos islas en serie con `VBAT`, entre `F1` y el nodo `+BATT 3.7V`, fabricado unido por una pista fina:

- **Uso normal:** la pista los une, no hay que hacer nada.
- **Para medir:** se corta la pista y se sueldan dos cables al amperímetro. Al terminar se restablece con una gota de estaño.

Separación de 2,54 mm, con islas lo bastante grandes para soldar cable, no solo para apoyar una punta.

### 7.3. Ubicación física

La carcasa se abre para programar, así que los puntos de prueba **no salen al exterior**, pero deben quedar accesibles con la placa montada y la tapa abierta:

1. **`TP1`, `TP2`, `TP3`, `TP7` y `JP1` agrupados en el borde de alimentación**, en una fila, para medir todo el árbol sin mover la punta de sitio.
2. **`TP5`, `TP6` y `TP8` juntos y cerca de `J2`**, para enganchar una sonda diferencial sin cables largos que capten ruido.
3. **`TP4` cerca de `Q1`**, para ver el corte del power gate donde ocurre.
4. **`TP9` junto al divisor**, al lado de `R1` y `R2`.
5. **Ninguno bajo la DevKit ni bajo `MOD1`:** quedarían tapados por la placa hija.
6. **Ninguno dentro del área libre de cobre de la antena.**

Islas de 1,5 a 2,0 mm de cobre expuesto, o perforadas de 1,0 mm para pinzas. Rotuladas en serigrafía con el nombre del net, no con el número de referencia: sirve leer `3.3V`, no `TP3`.

---

## 6. Fabricación de la PCB y Diseño mecánico


| Parámetro | Valor |
| :--- | :--- |
| Dimensiones | 70,0 × 40,0 mm, para encajar en la carcasa de mano |
| Capas | 2. Superior señales y componentes; inferior plano de masa ininterrumpido |
| Espesor de sustrato | 1,6 mm FR-4 |
| Espesor de cobre | 1 oz, 35 µm |
| Keep-out de RF | Área sin cobre de 15 × 10 mm bajo la antena del módulo ESP32 |

Consideraciones de ruteo que nacen del esquemático:

- **La antena del módulo debe sobresalir del borde de la placa** o quedar sobre el área libre de cobre. Ningún plano, pista ni punto de prueba la cruza.
- **`C1` lo más cerca posible de `J2`**, que es donde ocurre el escalón de corriente de la sonda.
- **`C4` y `C6` pegados a sus pines** de la DevKit, con la vía a masa inmediata.
- **`A` y `B` ruteadas como par**, con el mismo largo y sin plano dividido debajo.
- **`D4` entre el conector y el transceptor**, nunca después: debe interceptar el transitorio antes de que llegue a `U2`.
- El lazo de corriente de la sonda, de `MOD1` a `Q1` a `J2` y de vuelta por masa, debe ser lo más corto posible.

---


Instrumento compacto de mano, para llevar en la mano, mochila o bolsillo de trabajo.

```text
                     ◄────── 75 mm ──────►
                    ┌─────────────────────┐
                    │ [•] Micro-LEDs      │
                    │ [O] USB-C sellado   │
                    │                     │  ◄── CHASIS ERGONÓMICO DE MANO
                    │ [ Botón disparo ]   │      PETG, objetivo IP67 sin ensayo
                    │                     │      Aloja PCB, batería y BME280
                    │   TerraSense Core   │      140 mm de alto
                    │                     │
                    └──────────┬──────────┘
                               │  Junta de sellado con prensaestopa
                               ▼
                        /─────────────\      ◄── BASE PORTASONDA
                       │  Cuerpo sonda │          Epoxi industrial antichoque
                        \──┬──┬──┬──┬─/
                           ▼  ▼  ▼  ▼        ◄── ELECTRODOS, largo por confirmar
```

| Aspecto | Especificación |
| :--- | :--- |
| Material | PETG técnico o ABS, con aditivos UV. Impresión por servicio externo |
| Dimensiones | 140 mm alto × 75 mm ancho × 38 mm profundidad |
| Peso objetivo | Menos de 280 g con batería, electrónica y sonda. **Sin verificar** |
| Sellado | Junta tórica de silicona perimetral. **Objetivo IP67, sin ensayo del conjunto** |
| Sonda | 45 mm ancho × 15 mm grosor × 123 mm totales con electrodos, cable de 2 m. **Variante por confirmar** |
| Montaje de sonda | Encastre mecánico con relleno de uretano elástico |
| Respiradero del BME280 | Membrana microporosa de PTFE. Debe ver aire exterior |
| USB-C | Embutido con tapa de silicona cautiva |
| Pulsador | En la posición natural del pulgar |
| LED | Tras visores difusores de policarbonato |

> El IP68 que anuncia el vendedor de la sonda **no certifica la carcasa del equipo**. Una junta o una resina no constituyen certificación: requiere ensayo de ingreso de polvo y agua sobre el producto terminado.

---

## 7. Decisiones de Diseño y Detalles Técnicos (Rationale)

Esta sección contiene las justificaciones profundas de diseño (por qué se eligieron ciertos componentes, cálculos de corrientes de falla, comportamiento del bus, etc.).

### 7.1. Decisiones de Alimentación

### 4.4. Pads de batería `P1` y `P2`

La celda se suelda directamente a la placa; no hay conector.

| Aspecto | Especificación |
| :--- | :--- |
| Tamaño | 2,5 × 3,0 mm de cobre expuesto, suficiente para cable de 22 AWG |
| Separación | Al menos 3 mm entre `P1` y `P2`, para que una gota de estaño no los puentee |
| Alivio de tracción | Dos perforaciones de 1,5 mm junto a los pads, para amarrar el cable y que el tirón no levante la isla |
| Serigrafía | `BAT+` y `BAT−` en texto, no solo símbolos. El `+` y el `−` solos se confunden bajo estaño |
| Ubicación | En el borde de la placa, del lado donde queda la celda en la carcasa |

**Ventaja frente al conector:** desaparece el conector JST, su contraparte, el cable armado y la duda sobre el tercer pin. Menos costo y menos altura.

**Desventaja, y por eso existe `D1`:** un conector polarizado solo entra de una forma; dos pads aceptan el cable al revés. **La inversión de polaridad deja de ser improbable y pasa a ser un error de ensamblaje perfectamente posible.**

> **Procedimiento de primera energización:** antes de soldar, medir con multímetro la tensión entre los cables de la celda e identificar el positivo. No confiar en el color del aislante: en celdas económicas el rojo y el negro se invierten más seguido de lo que uno esperaría.

### 4.5. Protección de polaridad inversa — `D1` en configuración crowbar

`D1` va **en paralelo** entre `+BATT 3.7V` y `GND`, con el **cátodo al positivo**.

| Situación | Qué hace `D1` |
| :--- | :--- |
| Celda bien conectada | Polarizado en inversa. **No conduce y no introduce caída de tensión** |
| Celda invertida | Queda en directa, conduce como un corto y fuerza la apertura de `F1` |

Esta es la razón de usar crowbar en vez de un diodo en serie: **sobre una celda que termina en 3,0 V, la caída de 0,3 a 0,4 V de un Schottky en serie es cara.** El crowbar no cuesta nada en operación normal.

#### El `M7` es la elección correcta, y no por casualidad

El `M7` es el `1N4007` en encapsulado SMA. Para este puesto es mejor que un Schottky, aunque suene al revés:

| | Caída en directa | Fuga en inversa | Sobrecarga |
| :--- | :--- | :--- | :--- |
| Schottky `SS34` | ~0,4 V | Decenas de µA, y crece con la temperatura | 100 A / 8,3 ms |
| **`M7` silicio** | ~1,0 V | **Nanoamperios** | 30 A / 8,3 ms |

El crowbar vive permanentemente polarizado en inversa sobre la batería, así que **su corriente de fuga es un consumo parásito que nunca se apaga**, ni siquiera con `SW1` abierto. En cambio la caída en directa **solo existe durante la falla**, cuando ya da lo mismo.

Por eso aquí gana el silicio: la fuga es lo que importa y el `M7` la tiene tres órdenes de magnitud más baja.

Sus 1000 V de tensión inversa son un exceso enorme frente a los 4,2 V de la celda, pero no molesta. Que sea de recuperación lenta tampoco importa: la falla es continua, no conmutada.

**Los 30 A durante 8,3 ms son el dato que decide**, y alcanzan con margen para los ~13 A de la falla.

#### Corriente de falla estimada

Con la celda invertida, la tensión disponible menos la caída del diodo se reparte entre la resistencia interna de la celda, la del fusible y la del cobre:

$$I_{falla} \approx \frac{3{,}7 - 1{,}0}{0{,}1 + 0{,}1} \approx 13\ \text{A}$$

Trece amperios abren un fusible de 1 A en milisegundos, muy dentro de lo que `D1` tolera. El PCM de la celda también reacciona, pero **no se diseña contando con él**: es la última línea, no la primera.

### 4.6. Protección de cortocircuito — `F1`

Un **fusible rápido de 1 A** en serie con el positivo. Cumple dos funciones:

1. **Corta la corriente de falla cuando `D1` detecta la inversión.** Esta es su función principal.
2. Protege contra un cortocircuito aguas abajo, en la sonda o en el cableado.

#### Por qué rápido y de un disparo, no PTC

Esto cambia respecto de lo que se había planteado antes. Un PTC rearmable **no sirve acompañando a un crowbar**:

| Tipo | Tiempo de corte | ¿Sobrevive `D1`? |
| :--- | :--- | :--- |
| PTC rearmable | Desde 10 ms hasta varios segundos | **No.** El diodo se destruye esperando |
| **Fusible rápido de un disparo** | Milisegundos | **Sí** |

El PTC limita corriente calentándose, y ese proceso es lento comparado con lo que aguanta un diodo conduciendo 13 A. Con crowbar, el fusible tiene que abrir de verdad y rápido.

#### Verificar el valor de 1 A contra el consumo real

**1 A es el valor de partida, no un resultado medido.** El consumo máximo desde la celda todavía no se conoce: depende del peak de la sonda a 5 V, del rendimiento del elevador y del peak de la radio BLE. La estimación de diseño ronda los 600 mA, lo que deja un margen ajustado.

Medir con `JP1` antes de congelar el valor. Si el peak real supera ~700 mA, subir a 1,5 A o pasar a un fusible lento, aceptando que tarda más en abrir.

La corriente de arranque al cerrar `SW1`, cargando `C1`, es un pulso de microsegundos: su energía es demasiado baja para abrir el fusible.

#### Formato: cartucho convencional sobre pads

Se usa **fusible de cartucho de 5 × 20 mm**, montado sobre dos pads separados a la distancia del cuerpo.

| Aspecto | Especificación |
| :--- | :--- |
| Cartucho | 5 × 20 mm, 1 A, acción rápida (`F`) |
| Separación entre centros de pad | **20,5 a 22 mm.** Medir el cartucho real antes de fijar la huella: la tolerancia de largo entre fabricantes llega a 0,5 mm |
| Ancho de pad | 4 a 5 mm, para apoyar la tapa metálica completa |
| Montaje | Clips portafusible soldados a los pads, o el cartucho soldado directo a las tapas |

**La diferencia entre las dos formas de montaje importa:**

| | Clips portafusible | Cartucho soldado directo |
| :--- | :--- | :--- |
| Reemplazo | Se saca con los dedos | Hay que desoldar las dos tapas |
| Altura sobre la placa | Mayor | Menor |
| Contacto | Puede aflojarse con vibración en terreno | Firme |

Con la celda soldada a pads, **los clips tienen más sentido de lo que parece**: si alguien invierte la polaridad en el taller, se cambia el fusible con la mano y la placa se salva. Soldado, cada error de polaridad obliga a sacar el cautín.

> **Ojo con el espacio.** Un cartucho de 5 × 20 mm ocupa más de 20 mm de largo en una placa de **70 × 40 mm**: es la mitad del ancho. Conviene ubicarlo paralelo al borde largo, en la zona de alimentación, y verificar temprano en el ruteo que no choque con `MOD1` ni con la celda. Si el espacio aprieta, la alternativa es un fusible SMD 1206, que ocupa casi nada pero solo se cambia con cautín.

### 4.7. El módulo de carga y elevación `MOD1` — `LX-LCBST`

Después de la protección viene `MOD1`, el módulo **`LX-LCBST`**. Esta es la parte donde más se confunde el paso del diagrama de bloques al esquemático.

> **`LX-LCBST` es la designación del módulo adquirido** y es el nombre que debe aparecer en el símbolo, en la serigrafía y en la lista de materiales. Las secciones que siguen describen cómo se conecta; **su distribución de pines, la existencia del pad `EN` y su consumo en vacío se verifican sobre el módulo físico**, no se dan por supuestos aquí.

#### No se dibuja el circuito interno

`MOD1` es una **placa comprada**. En el esquemático se representa como un símbolo con sus pines de conexión, no como el circuito que lleva adentro.

| Lo que **no** se dibuja | Lo que **sí** se dibuja |
| :--- | :--- |
| Controlador de carga, protección de celda, MOSFET dual, bobina, diodo Schottky, elevador, conector USB-C | Un rectángulo con `B+`, `B−`, `OUT+`, `OUT−` y, si existe, `EN` |

Es el mismo criterio que se aplica a `U1` y a `U3`: la DevKit no se dibuja con su cristal, su flash y su regulador, sino como un bloque con pines. **El esquemático documenta lo que conecta esta placa, no lo que el fabricante ya resolvió dentro de la suya.**

#### Los 5 V no son una alimentación externa

Hay un solo camino de energía, y pasa entero por `MOD1`:

```text
   celda ──► B+ ──► [ elevador interno ] ──► OUT+ ──► SW1 ──► +5V
```

El elevador existe, pero está **dentro del módulo**. Desde el esquemático de esta placa, los 5 V simplemente aparecen en el pin `OUT+`. No hay que dibujar bobina, diodo ni realimentación: nada de eso vive en esta PCB.

#### `B+` es bidireccional

Este pin **no es solo una entrada**:

| Situación | Sentido de la corriente en `B+` |
| :--- | :--- |
| Cargando por USB-C | Del módulo **hacia** la celda |
| Operando | De la celda **hacia** el módulo |

Por eso `F1` y `D1` van entre la celda y `B+`: quedan en el camino en **ambos sentidos** y protegen tanto al cargar como al descargar.

También por eso `JP1` mide **corriente neta**: si se mide con el USB-C conectado, lo que se lee es la carga menos el consumo, no el consumo. **Para medir consumo hay que desconectar el USB-C.**

#### El USB-C está en el módulo, no en esta placa

Consecuencia directa y fácil de pasar por alto al rutear: **esta PCB no lleva ninguna pista de USB.** El conector está físicamente montado sobre `MOD1`.

| Opción | Qué implica |
| :--- | :--- |
| **A.** `MOD1` en el borde, con su USB-C asomando por la carcasa | No hay cable extra. Obliga a ubicar el módulo en una posición fija y a que la abertura de la carcasa calce con su conector |
| **B.** `MOD1` donde convenga y un USB-C de panel cableado a él | Libera el ruteo, pero agrega un conector, dos cables soldados al módulo y un punto de falla mecánica |

La **A** es preferible por costo y fiabilidad. Fijar la posición de `MOD1` **antes** de repartir el resto de los componentes, porque su conector manda sobre la geometría de la carcasa.

#### Huella y montaje

La huella es un conjunto de pads al paso del módulo real. **Medir el módulo físico antes de dibujarla**; el paso habitual es 2,54 mm, pero la distribución de `B+`, `B−`, `OUT+` y `OUT−` varía entre fabricantes.

| Montaje | Ventaja | Costo |
| :--- | :--- | :--- |
| Tiras de pines hembra | El módulo se cambia sin cautín | Mayor altura, peor para una carcasa de 38 mm |
| Soldado directo a los pads | Mínima altura y contacto firme | Reemplazarlo exige desoldar |

Si el módulo trae orificios almenados, se suelda por el borde y queda más bajo aún.

#### El pin `EN`

Si el módulo expone `EN`, `KEY` o `SHDN`, **sacarlo a una isla puenteable** aunque la V2 no lo use. Es lo que permite migrar `SW1` a la variante **B** de la sección 4.9 sin rehacer la placa.

#### Símbolo en KiCad

No existe en las librerías estándar: hay que crearlo. Un rectángulo con cuatro pines, o cinco con `EN`.

**Declarar `OUT+` como salida de potencia** (*power output*). Si queda como pasivo, el ERC reclamará que la net `+5V` no tiene fuente que la alimente. Lo mismo aplica al pin `3V3` de la DevKit.

### 4.8. Condensadores

Todos SMD.

| Ref | Valor | Marcado | Tensión | Tecnología | Encapsulado | Va junto a |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `C1` | 100 µF | — | 35 V | Electrolítico de aluminio | Lata SMD, ~8 mm | `Q1` y `J2` |
| `C2` | 100 nF | `104K` | 50 V | Cerámico X7R | 1206 | `Q1` |
| `C3` | 100 µF | — | 35 V | Electrolítico de aluminio | Lata SMD, ~8 mm | `U1` `VIN` |
| `C4` | 100 nF | `104K` | 50 V | Cerámico X7R | 1206 | `U1` `VIN` |

El marcado `104K` es la notación habitual: `10 × 10⁴ pF` igual a 100 nF, con `K` de tolerancia ±10 %.

#### Los 100 µF: aluminio y polarizados

Un 100 µF SMD es un electrolítico de aluminio en formato lata (*V-chip*). A 35 V el margen sobre un riel de 5 V es amplio, pero **la lata crece**: del orden de 8 mm de diámetro contra 6,3 mm de una de 16 V. Tenerlo presente al repartir, porque la placa además lleva el cartucho de 20 mm de `F1`.

> **Son componentes polarizados.** Usar símbolo de condensador polarizado en el esquemático, no el genérico, y marcar el positivo en la serigrafía. Un electrolítico montado al revés se calienta, se abomba y revienta.

#### Los 100 nF: cerámicos, nunca electrolíticos

Su función **no es almacenar energía** —para eso están los 100 µF— sino **filtrar el rizado de conmutación**. El elevador del `LX-LCBST` trabaja a cientos de kilohertz y ese rizado aparece en `+5V`.

| | Electrolítico de aluminio | Cerámico |
| :--- | :--- | :--- |
| Resistencia serie | Varios ohms | Miliohms |
| En alta frecuencia | Casi un cable con resistencia | Filtra |

Un electrolítico pequeño junto a `C1` sería redundante: mismo comportamiento y mucha menos capacidad. Por eso van cerámicos.

> **Verificar que sean X7R y no Y5V.** Ambos se venden como `104K` a 50 V en 1206 y cuestan casi lo mismo, pero el Y5V pierde hasta un 80 % de su capacidad en los extremos de temperatura, y este equipo trabaja a la intemperie. El X7R se mantiene dentro de ±15 %.

Con 50 V nominales sobre 5 V aplicados, la pérdida por tensión aplicada es despreciable: entregan sus 100 nF.

**No usar tantalio.** Falla en cortocircuito, y un corto permanente sobre una celda LiPo es un riesgo que no conviene introducir a propósito.

### 4.9. Interruptor `SW1`

`SW1` va **después de `MOD1`, del lado de los 5 V**. Ponerlo en serie con la celda cortaría también al cargador y el equipo no podría cargar apagado.

| | **A. En serie con `OUT+`** | **B. Sobre el pin `EN` del elevador** |
| :--- | :--- | :--- |
| Condición | Siempre posible | Solo si `MOD1` expone `EN`, `KEY` o `SHDN` |
| Corriente por el contacto | Toda la carga, picos de ~300 mA | Microamperios |
| Con el equipo apagado | El elevador sigue consumiendo en vacío | Elevador deshabilitado |
| Carga apagado | Sí | Sí |

**Decidido: variante A.** El `LX-LCBST` expone únicamente cuatro pines conectables —`Vo+`, `Vo−`, `Bat+`, `Bat−`— y no tiene pad `EN`, `KEY` ni `SHDN`, así que la variante B no es posible con este módulo.

El interruptor es de panel y se conecta por **terminal block `J3` de 2 vías**: `MOD1` `Vo+` sale por `J3` pin 1, va por cable al rocker, y vuelve por `J3` pin 2 al riel `+5V`.

### 4.10. Carga por USB-C

El USB-C de `MOD1` es **el único conector que sale al exterior**, con tapa de silicona cautiva.

Con `SW1` cerrado se puede cargar y operar a la vez. **Definir en firmware** si se permite: durante la carga la tensión de celda sube hasta 4,2 V y el porcentaje informado deja de reflejar la carga real.

### 4.11. Regla de programación

**`SW1` en OFF antes de conectar el USB de la DevKit.**

Con `SW1` cerrado, los 5 V del elevador llegan a `VIN` al mismo tiempo que el USB de la DevKit inyecta los suyos: dos fuentes empujando el mismo nodo. Con `SW1` abierto, `VIN` queda aislado y la DevKit se alimenta sola por USB. El BME280 y el transceptor siguen alimentados por `3V3`, así que se depura todo salvo la sonda.

Por esto **no hace falta un diodo de aislamiento** entre `+5V` y `VIN`.

### 4.12. Orden de la cadena, y por qué no se puede alterar

```text
   1. Celda        BT1 ──► P1 / P2              pads soldados
   2. Fusible      P1  ──► F1                   1 A rápido
   3. Medición     F1  ──► JP1                  puente de corriente
   4. Protección   JP1 ──► nodo VBAT_PROT       D1 (M7) en paralelo a GND
   5. Carga/boost  VBAT_PROT ──► MOD1.B+        el módulo eleva a 5 V
   6. Salida       MOD1.OUT+ ──► SW1            encendido del equipo
   7. Riel         SW1 ──► +5V                  con C1 y C2, y TP2
                                                 │
                                                 ├──► U1.VIN   (etapa 2)
                                                 └──► Q1.S     (power gate)
```

El paso 5 **no se salta ni se dibuja por dentro**: `MOD1` entra al esquemático como el símbolo de cuatro pines de la sección 4.7.

**`F1` va antes del nodo donde cuelga `D1`.** Es el punto crítico de toda la etapa.

Si el diodo quedara antes del fusible, al invertir la celda `D1` la cortocircuitaría **sin ningún fusible en el camino de esa corriente**: el fusible ni se entera, y la energía la absorben el diodo y la propia celda hasta que algo se destruye o el PCM interviene.

Con el fusible primero, la corriente de falla obligatoriamente lo atraviesa y lo abre. **Invertir estos dos componentes convierte la protección en un cortocircuito deliberado.**

`JP1` queda después de `F1` para que el amperímetro también esté protegido durante las mediciones.

---

### 7.2. Decisiones de Control

### 5.7. Mapa de pines

Extraído de la netlist del esquemático de KiCad (designadores del esquemático, no los de las secciones anteriores). El firmware lo replica en [`Firmware/pines.h`](../Firmware/pines.h).

| GPIO | Net | Va a | Nota |
| :--- | :--- | :--- | :--- |
| `IO16` | `RX` | `U3` (módulo S3485) `RX` | Libre en WROOM-32 |
| `IO17` | `TX` | `U3` `TX` | Libre en WROOM-32 |
| `IO4` | `RTS` | `U3` `RTS` | Dirección del transceptor |
| `IO5` | `GATE` | Compuerta de `Q1` (AO3400A), `TP15` | *Strapping*; ver pendiente F5 del firmware |
| `IO21` | `SDA` | `U2` (BME280) `SDA`, `TP9` | |
| `IO22` | `SCL` | `U2` `SCL`, `TP10` | |
| `IO34` | `VBat_Sense` | Divisor `R1`/`R2` y `C3`, `TP5` | Solo entrada, `ADC1_CH6` |
| `IO33` | `Paring` | `SW1`, pull-up `R6`, `C6`, `TP6` | RTC, despierta del sueño profundo |
| `IO25` | `BLUE` | `D2` y `R3`, `TP12` | LED azul |
| `IO26` | `GREEN` | `D3` y `R4`, `TP13` | LED verde |
| `IO27` | `RED` | `D4` y `R5`, `TP14` | LED rojo |
| `IO19` | `Buzzer` | `BZ1` (+); el (−) va a `GND` | Buzzer pasivo 9042 excitado por LEDC. **Directo, sin transistor ni diodo**: ver sección 5.7.1 |

#### 5.7.1. Buzzer `BZ1`

Buzzer pasivo magnético 9042 (9 × 4,2 mm), huella `MagneticBuzzer_CUI_CST-931RP-A`. Da avisos sonoros además de los LEDs (encendido, ventana PAIR, vinculación, medición, batería baja); la tabla de sonidos está en [`Firmware/README.md`](../Firmware/README.md#indicadores-led-y-sonoros). Al ser pasivo necesita una onda cuadrada cerca de su frecuencia de resonancia; con un nivel fijo no suena.

**Riesgo en esta revisión:** va directo entre `IO19` y `GND`. La bobina de un 9042 ronda 16 a 42 Ω, de modo que a 3,3 V puede exigir más que los 20 mA recomendados por pin del ESP32 (40 mA máximo absoluto) y devuelve picos inductivos al pin. En las placas del primer lote, medir la corriente con la hoja de datos del modelo comprado y, si excede, intercalar una resistencia de 47 a 100 Ω. En la siguiente revisión: excitarlo con un N-MOSFET o NPN desde `IO19` y un diodo 1N4148 en antiparalelo con el buzzer.

### 5.8. Pines que no se pueden usar

| GPIO | Motivo |
| :--- | :--- |
| `GPIO6` a `GPIO11` | Conectados a la memoria flash del módulo. Usarlos cuelga la placa |
| `GPIO12` | *Strapping* de tensión de flash. En alto al arrancar puede dejar la placa sin iniciar |
| `GPIO0` | Ya ocupado por el botón BOOT de la DevKit |
| `ADC2` completo | No funciona con la radio encendida. Por eso la batería se lee en `GPIO34`, que es `ADC1` |
| `GPIO16` y `GPIO17` | Libres en WROOM-32, pero **en WROVER los ocupa la PSRAM**. Confirmar que la DevKit monta WROOM |

### 5.9. Consumo de la V2

**La V2 no declara autonomía ni consumo en reposo.**

El regulador `AMS1117` de la DevKit consume del orden de 5 a 10 mA en vacío y el conversor USB-serie agrega lo suyo. El sueño profundo en una DevKit típica queda en **decenas de miliamperios**, no en microamperios.

Está **aceptado para esta versión**. Por eso `SW1` no es un accesorio: el equipo se apaga físicamente entre usos y el consumo en reposo deja de importar. La medición se hace igual, con `JP1`, para tener el dato real.

---

### 7.3. Decisiones de Periféricos y Software

### 6.6. Protección del bus — `D4`

| Pin `D4` | Conecta a |
| :--- | :--- |
| A | `RS485_A` |
| B | `RS485_B` |
| Masa | `GND` |

`SM712` es un TVS bidireccional **específico para RS-485**: sus tensiones de trabajo están pensadas para el rango de modo común del estándar, a diferencia de un TVS genérico.

**Va entre `J2` y `U2`, nunca después:** debe interceptar el transitorio antes de que llegue al transceptor.

### 6.7. El transceptor no queda cortado

`U2` se alimenta de `3.3V` y `Q1` corta `+5V`. **Tal como está especificado, el transceptor queda alimentado siempre que el equipo esté encendido**, junto con el consumo de la polarización.

Se deja así en la V2, porque `SW1` corta todo entre usos. Si más adelante se persigue un reposo en microamperios, hay que agregar un segundo MOSFET en la rama de `3.3V` que alimenta a `U2`.

### 6.8. Ciclo de adquisición Modbus RTU

1. **Despertar:** por pulsación en `GPIO33` (pendiente F4 de [`Firmware/TASK.md`](../Firmware/TASK.md)); hoy el firmware no duerme y mide cuando la app se suscribe a la telemetría.
2. **Power gate ON:** `GPIO5` en alto, la sonda recibe 5,0 V.
3. **Estabilización:** 1 s (`SONDA_ESTABILIZACION_MS`). El manual no da un tiempo de arranque: se mide en banco con el MOSFET montado.
4. **Comando, UART2 a 4800 baudios, 8N1** (velocidad de fábrica; si no hay respuesta se reintenta a 9600), con `GPIO4` en alto:
   ```text
   0x01 (dirección) 0x03 (leer holding) 0x00 0x00 (registro inicial) 0x00 0x07 (7 registros) 0x04 0x08 (CRC16)
   ```
5. **`GPIO4` a bajo** apenas sale el último bit, y recepción de 19 bytes con validación CRC16.
6. **Power gate OFF:** `GPIO5` en bajo.
7. **Lectura ambiental I²C** del BME280.
8. **Lectura de batería:** muestreo de `GPIO34`, promediando varias tomas.
9. **Notificación BLE** de los 20 bytes.

> El mapa de registros coincide con el manual del fabricante (ComWinTop CWT-Soil-NPKPHCTH-S). Antes de fabricar hace falta una captura Modbus real de la muestra: procedimiento en [`Firmware/TASK.md`](../Firmware/TASK.md#prueba-de-la-sonda-en-banco).

---

### 6.9. Estructura binaria de la trama BLE (20 bytes)

No condiciona el esquemático, pero sí el firmware que correrá sobre esta placa.

**Formato único de 20 bytes:** 14 de suelo, 1 de batería, 1 de identificador y 4 de ambiente, para diez variables más batería. Es el máximo que cabe en una notificación con el MTU por defecto de BLE, así que no hace falta negociar MTU ni partir la lectura en dos paquetes.

**El contrato válido es el que decodifica `App/src/services/probeService.ts`.** El firmware debe emitir exactamente esto. Ver la [explicación byte a byte y el ejemplo hexadecimal completo](../docs/CONTRATO_BLE.md).

```text
 ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │13 │14 │15 │
 ├───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┼───┤
 │ HumS  │ TempS │  EC   │  pH   │   N   │   P   │   K   │Bat│fmt│
 └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───┴───┘
 ┌────┬────┬────┬────┐
 │ 16 │ 17 │ 18 │ 19 │   Ambiente BME280 empaquetado en 32 bits
 └────┴────┴────┴────┘
```

Todos los campos multibyte son **big-endian**, igual que Modbus.

| Bytes | Campo | Tipo | Escala |
| :--- | :--- | :--- | :--- |
| 0–1 | Humedad volumétrica | `uint16` | × 10 (`0x015E` = 350 → 35,0 %) |
| 2–3 | Temperatura de suelo | **`int16`** | × 10, **con signo**, admite bajo 0 °C |
| 4–5 | Conductividad eléctrica | `uint16` | µS/cm directo |
| 6–7 | pH | `uint16` | **× 10** (`0x0041` = 65 → 6,5 pH) |
| 8–9 | Nitrógeno | `uint16` | mg/kg |
| 10–11 | Fósforo | `uint16` | mg/kg |
| 12–13 | Potasio | `uint16` | mg/kg |
| 14 | Batería | **`uint8`** | **porcentaje 0–100**, no milivoltios. Sale del divisor de la sección 5.6 |
| 15 | Identificador de formato | `uint8` | `1` = 20 bytes con ambiente, el formato del producto. `0` = 16 bytes, tolerado solo para prototipos sin BME280. Otro valor se rechaza |
| 16–19 | Ambiente BME280 | 32 bits | Temperatura 12 bits `(°C × 10) + 400`; presión 12 bits `hPa − 300`; humedad 8 bits `% × 2`. Todos los bits a uno = sin dato → `NULL` |

**La V2 emite siempre el identificador `1`.** El valor `0` existe únicamente como tolerancia del decodificador para prototipos sin BME280 y no es un modo de operación del producto.

El firmware debe adquirir y notificar una lectura nueva al suscribirse: no transporta contador ni reloj del sensor. La localización y la fecha las aporta el celular. Recibir una notificación válida confirma respuesta en ese instante, no conexión permanente ni internet.

---

## 8. Orden de trabajo y pendientes

### 10.1. Orden para dibujar el esquemático

1. Hoja de alimentación completa, con las nets nombradas.
2. DevKit con sus desacoplos y los puntos de prueba.
3. Power gate `Q1` y `Q2` con `R4` y `R6`, que es donde más se equivoca uno.
4. Divisor conmutado `R1`, `R2`, `Q3`, `R14` y `C3`.
5. Transceptor, conector de sonda, terminación y TVS.
6. BME280, pulsador y LED.
7. Puntos de prueba y `JP1`.
8. **ERC en cero antes de asignar una sola huella.**
9. Asignación de huellas y recién entonces el ruteo.

### 10.2. Verificaciones sobre componentes físicos

| Qué | Por qué bloquea |
| :--- | :--- |
| ¿El `LX-LCBST` expone pad `EN` o `KEY`? | Decide la variante de `SW1` de la sección 4.9 |
| ¿El módulo BME280 trae pull-ups I²C montados? | Evita duplicar `R7` y `R8` |
| ¿La DevKit monta WROOM o WROVER? | En WROVER, `GPIO16` y `GPIO17` están ocupados por la PSRAM |
| Consumo real de la sonda a 5 V | Dimensiona `F1`, `Q1` y `C1` |
| Tercer pin de la celda adquirida | Confirmar que dejarlo `NC` es seguro |

### 10.3. Pendientes antes de fabricar

- **Medir el consumo de la sonda a 5 V**: el manual de la ComWinTop CWT-Soil-NPKPHCTH-S sólo publica 0,5 W como máximo a 24 V.
- **Capturar una respuesta Modbus real** de la muestra y contrastarla con el mapa del manual.
- Cerrar fichas de DevKit, BME280, módulo de carga y elevación, y celda.
- Completar el firmware de [`Firmware/`](../Firmware/TASK.md): falta ensayar en banco la lectura Modbus de la sonda.
- Medir la corriente de `BZ1` en `IO19` y decidir resistencia serie o transistor (sección 5.7.1).
- **Medir energía desde la batería** con `JP1`, distinguiendo el consumo del equipo encendido del de la rama de sonda.
- Ensayos de radio, batería y carcasa. El IP68 de la sonda no acredita el equipo.
- Definir si se permite medir mientras carga.

---

## 9. Netlist completa

Cada net con **todos** los pines que van unidos a ella. Si un pin no aparece aquí, no está conectado. Al terminar el esquemático, esta tabla es la lista de comprobación: recorrer net por net y confirmar que KiCad muestra exactamente los mismos nodos.

| Net | Pines conectados |
| :--- | :--- |
| `BATT 3.7V` | `P1` · `F1`.1 · `TP10` |
| `VBAT_F` | `F1`.2 · `JP1`.1 |
| `+BATT 3.7V` | `JP1`.2 · `D1`.cátodo · `MOD1`.Bat+ · `R1`.1 · `TP1` |
| `5V` | `MOD1`.Vo+ · `J3`.1 · `TP11` |
| `+5V` | `J3`.2 · `C1`.1 · `C2`.1 · `U1`.VIN · `C3`.1 · `C4`.1 · `Q1`.S · `R4`.1 · `TP2` |
| `3.3V` | `U1`.3V3 · `C5`.1 · `C6`.1 · `U2`.8 · `C8`.1 · `U3`.VCC · `U3`.CSB · `R4`.1 · `R7`.1 · `R8`.1 · `R12`.1 · `TP3` |
| `Q1_G` | `Q1`.G · `R4`.2 · `Q2`.D |
| `Q2_G` | `Q2`.G · `R5`.2 · `R6`.1 |
| `GPIO5` | `U1`.GPIO5 · `R5`.1 |
| `5V_SONDA` | `Q1`.D · `J2`.1 · `TP4` |
| `VBat_Sense` | `R1`.2 · `R2`.1 · `C3`.1 · `U1`.GPIO34 · `TP9` |
| `BTN` | `U1`.GPIO33 · `R4`.2 · `SW2`.1 · `C6`.1 |
| `GPIO2` | `U1`.GPIO2 · `R5`.1 |
| `LED_V` | `R5`.2 · `D2`.ánodo |
| `GPIO15` | `U1`.GPIO15 · `R6`.1 |
| `LED_A` | `R6`.2 · `D3`.ánodo |
| `SDA` | `U1`.GPIO21 · `U3`.SDA · `R7`.2 |
| `SCL` | `U1`.GPIO22 · `U3`.SCL · `R8`.2 |
| `RX2` | `U1`.GPIO16 · `U2`.1 |
| `TX2` | `U1`.GPIO17 · `U2`.4 |
| `DE_RE` | `U1`.GPIO4 · `U2`.2 · `U2`.3 |
| `RS485_A` | `U2`.6 · `R11`.1 · `R12`.2 · `D4`.A · `J2`.3 · `TP5` |
| `RS485_B` | `U2`.7 · `R11`.2 · `R13`.1 · `D4`.B · `J2`.4 · `TP6` |
| `GND` | `P2` · `D1`.ánodo · `MOD1`.Bat− · `MOD1`.Vo− · `C1`.2 · `C2`.2 · `U1`.GND · `C3`.2 · `C4`.2 · `C5`.2 · `C6`.2 · `SW2`.2 · `C6`.2 · `D2`.cátodo · `D3`.cátodo · `Q2`.S · `R6`.2 · `R2`.2 · `C3`.2 · `U2`.5 · `C8`.2 · `U3`.GND · `U3`.SDO · `R13`.2 · `D4`.masa · `J2`.2 · `TP7` · `TP8` · `TP12` |


### 11.1. Resumen por componente

| Ref | Pin | Net |
| :--- | :--- | :--- |
| `P1` | 1 | `BATT 3.7V` |
| `P2` | 1 | `GND` |
| `F1` | 1 / 2 | `BATT 3.7V` / `VBAT_F` |
| `JP1` | 1 / 2 | `VBAT_F` / `+BATT 3.7V` |
| `D1` | ánodo / cátodo | `GND` / `+BATT 3.7V` |
| `MOD1` | Bat+ / Bat− / Vo+ / Vo− | `+BATT 3.7V` / `GND` / `5V` / `GND` |
| `J3` | 1 / 2 | `5V` / `+5V` |
| `SW1` | 1 / 2 | `5V` / `+5V` — fuera de placa, cableado a `J3` |
| `C1`, `C2` | 1 / 2 | `+5V` / `GND` |
| `U1` | VIN / GND / 3V3 | `+5V` / `GND` / `3.3V` |
| `C3`, `C4` | 1 / 2 | `+5V` / `GND` |
| `C5`, `C6` | 1 / 2 | `3.3V` / `GND` |
| `R4` | 1 / 2 | `3.3V` / `BTN` |
| `SW2` | 1 / 2 | `BTN` / `GND` |
| `C6` | 1 / 2 | `BTN` / `GND` |
| `R5` | 1 / 2 | `GPIO2` / `LED_V` |
| `D2` | ánodo / cátodo | `LED_V` / `GND` |
| `R6` | 1 / 2 | `GPIO15` / `LED_A` |
| `D3` | ánodo / cátodo | `LED_A` / `GND` |
| `Q1` | S / G / D | `+5V` / `Q1_G` / `5V_SONDA` |
| `R4` | 1 / 2 | `+5V` / `Q1_G` |
| `Q2` | D / G / S | `Q1_G` / `Q2_G` / `GND` |
| `R5` | 1 / 2 | `GPIO5` / `Q2_G` |
| `R6` | 1 / 2 | `Q2_G` / `GND` |
| `R1` | 1 / 2 | `+BATT 3.7V` / `VBat_Sense` |
| `R2` | 1 / 2 | `VBat_Sense` / `GND` |
| `C3` | 1 / 2 | `VBat_Sense` / `GND` |
| `U3` | VCC / GND / SDA / SCL / CSB / SDO | `3.3V` / `GND` / `SDA` / `SCL` / `3.3V` / `GND` |
| `R7` | 1 / 2 | `3.3V` / `SDA` |
| `R8` | 1 / 2 | `3.3V` / `SCL` |
| `U2` | 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 | `RX2` / `DE_RE` / `DE_RE` / `TX2` / `GND` / `RS485_A` / `RS485_B` / `3.3V` |
| `C8` | 1 / 2 | `3.3V` / `GND` |
| `R11` | 1 / 2 | `RS485_A` / `RS485_B` |
| `R12` | 1 / 2 | `3.3V` / `RS485_A` |
| `R13` | 1 / 2 | `RS485_B` / `GND` |
| `D4` | A / B / masa | `RS485_A` / `RS485_B` / `GND` |
| `J2` | 1 / 2 / 3 / 4 | `5V_SONDA` / `GND` / `RS485_A` / `RS485_B` |

### 11.2. Comprobaciones antes de cerrar el ERC

| Comprobación | Por qué |
| :--- | :--- |
| `GND` es **una sola net**, no varias con nombres parecidos | Es el error más común al dibujar por hojas |
| `U1`.3V3 tiene `PWR_FLAG` o está declarado como salida de potencia | Si no, KiCad reclama que `3.3V` no tiene fuente |
| `MOD1`.OUT+ declarado como salida de potencia | Igual que el anterior, para `+5V` |
| `U2`.2 y `U2`.3 realmente unidos | Si quedan separados, el transceptor no cambia de dirección |
| `Q1` con fuente a `+5V`, no al revés | Invertido, el diodo de cuerpo alimenta la sonda aunque el gate esté cortado |
| `D1` con **cátodo** a `+BATT 3.7V` | Al revés queda en directa permanente: cortocircuita la celda apenas se conecta |
| `F1` **antes** del nodo de `D1` | Invertidos, la corriente de falla no pasa por el fusible y la protección no existe |
| Ningún GPIO de la lista 5.8 usado | |
| Cada integrado con su condensador de desacoplo | `C4` para `U1`, `C8` para `U2`, `C6` para el riel de 3,3 V |
| `C1` y `C3` con símbolo **polarizado** y positivo marcado en serigrafía | Un electrolítico al revés se abomba y revienta |

