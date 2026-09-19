# 🔌 TerraSense · PCB V2

Especificación del hardware del instrumento portátil de medición de suelo: placa portadora, árbol de alimentación, control y periféricos. Este documento es la fuente para dibujar el esquemático y rutear la placa.

> ### 🛑 Estado de verificación — leer antes de usar este documento
>
> **Describe un diseño en curso, no un producto verificado. No fabricar sin cerrar los pendientes de la sección 10.**
>
> | Afirmación | Estado real |
> | :--- | :--- |
> | Placa ruteada | **No existe.** La V2 parte del esquemático; no hay ruteo |
> | Firmware | **No existe en este repositorio.** El contrato que debe cumplir está en la sección 6.9 |
> | Mapa de registros de la sonda | **Sin confirmar** contra la ficha del proveedor. El SKU no se ha adquirido |
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
- [4. Etapa 1 — Alimentación](#4-etapa-1--alimentación)
- [5. Etapa 2 — Control](#5-etapa-2--control)
- [6. Etapa 3 — Periféricos de salida y sensores](#6-etapa-3--periféricos-de-salida-y-sensores)
- [7. Puntos de prueba y medición](#7-puntos-de-prueba-y-medición)
- [8. Fabricación de la PCB](#8-fabricación-de-la-pcb)
- [9. Diseño mecánico](#9-diseño-mecánico)
- [10. Orden de trabajo y pendientes](#10-orden-de-trabajo-y-pendientes)

---

## 1. Alcance de la V2

La V2 es una **placa portadora**: no integra el silicio, sino que sostiene y conecta tres módulos comerciales más la electrónica discreta que los une.

| Módulo | Qué aporta |
| :--- | :--- |
| DevKit ESP32-WROOM-32 | Microcontrolador, radio BLE, regulador de 3,3 V y USB-UART |
| PCB combinada USB-C | Carga de la celda con sus protecciones y elevación a 5,0 V |
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
| `V1/` | Prototipo anterior, congelado. No se edita ni se usa como referencia de diseño |

---

## 2. Especificaciones generales

| Parámetro | Valor de diseño | Justificación |
| :--- | :--- | :--- |
| **Microcontrolador** | DevKit ESP32-WROOM-32 | Doble núcleo a 240 MHz, 520 KB SRAM, 4 MB de flash. [Ficha Espressif](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html): **Bluetooth 4.2 BR/EDR y BLE**, no 5.0 |
| **Sonda de suelo** | Industrial 7 en 1, RS-485 Modbus RTU | Alimentación **4,5 – 30 V DC**, electrodos de aleación anticorrosión, grado de acero por confirmar |
| **Alimentación de la sonda** | **5,0 V DC** conmutados | Operación directa sin elevar a 12 V; menor estrés térmico y menor consumo |
| **Sensor ambiental** | BME280 I²C a 3,3 V | Temperatura del aire, humedad relativa y presión en el punto de lectura |
| **Transceptor de bus** | SP3485 a 3,3 V | Diferencial industrial semidúplex, sin desplazadores de nivel |
| **Batería** | LiPo 1S 3,7 V, 2.000 mAh con PCM | Formato prismático plano, ~35 g, sin portaceldas |
| **Carga y elevación** | PCB combinada USB-C | Resuelve carga, protección y elevación a 5 V en un submódulo |
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
  │  MOD1  PCB combinada USB-C    │◄───────┤ BT1 LiPo 1S 2000 mAh     │
  │  • Cargador con protecciones  │  VBAT  │ J1 JST 3 pines (pin3 NC) │
  │  • Elevador 3,7 V ──► 5,0 V   │────────┤ F1 PTC  ·  D1 polaridad  │
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
| `VBAT` | 3,0 – 4,2 V | Celda LiPo, pin 1 de `J1` |
| `VBAT_PROT` | 3,0 – 4,2 V | Después de `F1` y `D1` |
| `+5V` | 5,0 V | Salida de `MOD1`, después de `SW1` |
| `+3V3` | 3,3 V | Pin `3V3` de la DevKit |
| `5V_SONDA` | 5,0 V conmutados | Después de `Q1` |
| `VBAT_SENSE` | 1,5 – 2,1 V | Nodo del divisor hacia `GPIO34` |
| `GND` | 0 V | Masa única, común a placa y sonda |

---

## 4. Etapa 1 — Alimentación

Lleva la energía desde la celda hasta un riel de 5 V estable, protegido y conmutable, y permite cargar con el equipo apagado.

### 4.1. Componentes

| Ref | Componente | Función |
| :--- | :--- | :--- |
| `BT1` | LiPo 1S 2.000 mAh con PCM | Fuente de energía |
| `J1` | JST-PH 2,0 mm, 3 pines | Conector de batería |
| `F1` | PTC rearmable | Protección de **cortocircuito y sobrecorriente** |
| `D1` | Schottky o P-MOSFET tipo diodo ideal | Protección de **polaridad inversa** |
| `MOD1` | PCB combinada USB-C, carga más elevación a 5 V | Carga la celda y genera los 5 V |
| `SW1` | Interruptor rocker SPST | Enciende y apaga el equipo |
| `C1` | 100 µF electrolítico o tántalo | Reserva en `+5V` para los picos de la sonda |
| `C2` | 100 nF cerámico | Desacoplo de alta frecuencia en `+5V` |
| `JP1` | Puente de dos islas | Corte para medir corriente; ver sección 7.2 |

### 4.2. Cadena de alimentación

```text
BT1 ──► J1 ──► JP1 ──► F1 ──► D1 ──► VBAT_PROT ──► MOD1 (B+ / B−)
                                                      │
                                              salida 5 V
                                                      │
                                                    SW1 ──► +5V ──► C1, C2
```

El cargador de `MOD1` queda conectado a la celda de forma permanente. Por eso **el equipo carga estando apagado**: `SW1` interrumpe los 5 V de salida, no la batería.

### 4.3. Protección contra cortocircuito — `F1`

Un **PTC rearmable** en serie con el positivo de la batería. Ante un corto, su resistencia sube bruscamente y limita la corriente; al desaparecer la falla vuelve solo, sin reemplazo.

**Dimensionar después de medir el consumo real de la sonda a 5 V.** La corriente de retención debe quedar por sobre el peak de medición y por debajo de la corriente de falla. Los 0,5 W publicados por el vendedor corresponden a 24 V y no sirven para dimensionar a 5 V.

### 4.4. Protección contra polaridad inversa — `D1`

Protege de conectar la batería al revés, que destruiría `MOD1` y la DevKit.

| Opción | Caída | Observación |
| :--- | :--- | :--- |
| Schottky en serie | 0,3 – 0,4 V | Barato, pero sobre una celda que termina en 3,0 V esa caída es mucha |
| **P-MOSFET tipo diodo ideal** | Milivoltios | **Recomendado.** Un P-MOSFET con la fuente al positivo de la celda |

> **Fusible y diodo no son lo mismo.** `F1` protege contra cortocircuito y sobrecorriente; `D1` protege contra inversión de polaridad. Son fallas distintas y hacen falta los dos componentes: un diodo no salva de un corto, y un fusible no salva de una batería al revés.

### 4.5. Interruptor `SW1`

`SW1` va **después de `MOD1`, del lado de los 5 V**. Ponerlo en serie con la celda cortaría también al cargador y el equipo no podría cargar apagado.

Quedan dos formas de hacerlo, y cuál se usa depende de una verificación sobre el módulo físico:

| | **A. En serie con `OUT+`** | **B. Sobre el pin `EN` del elevador** |
| :--- | :--- | :--- |
| Condición | Siempre posible | Solo si `MOD1` expone `EN`, `KEY` o `SHDN` |
| Corriente por el contacto | Toda la carga, picos de ~300 mA | Microamperios |
| Con el equipo apagado | El elevador sigue consumiendo en vacío | Elevador deshabilitado |
| Carga apagado | Sí | Sí |

**Verificar si `MOD1` tiene pad `EN` o `KEY`.** Si lo tiene, la **B** es mejor: el elevador se apaga de verdad y el contacto no conduce corriente de carga, así que dura más. Si no lo tiene, va la **A**.

Dibujar con la **A** y dejar el pad `EN` accesible mediante una isla puenteable, para poder migrar a la **B** sin rehacer la placa.

### 4.6. Conector de batería `J1`

| Pin | Señal |
| :--- | :--- |
| 1 | `VBAT` |
| 2 | `GND` |
| 3 | **NC** |

**El tercer pin queda sin conectar.** Se rotula `NC` de forma explícita en el esquemático y en la serigrafía: un pin sin conexión declarada es indistinguible de un olvido cuando alguien revise la hoja. Si la celda trae un termistor NTC en ese pin, queda sin usar; **nunca puentearlo a masa**.

### 4.7. Carga por USB-C

El USB-C de `MOD1` es **el único conector que sale al exterior**. Entra por la carcasa con tapa de silicona cautiva.

Con `SW1` cerrado se puede cargar y operar a la vez. **Definir en firmware** si se permite medir mientras carga o si se bloquea: durante la carga la tensión de celda sube hasta 4,2 V y el porcentaje de batería informado deja de reflejar la carga real.

### 4.8. Regla de programación

**`SW1` se pone en OFF antes de conectar el USB de la DevKit.**

Con `SW1` cerrado, los 5 V del elevador llegan a `VIN` al mismo tiempo que el USB de la DevKit inyecta los suyos: dos fuentes empujando el mismo nodo. Con `SW1` abierto, `VIN` queda aislado y la DevKit se alimenta sola por USB. El BME280 y el transceptor siguen alimentados desde el pin `3V3`, así que se puede depurar todo salvo la sonda.

Esta regla es la razón por la que **no hace falta un diodo de aislamiento** entre `+5V` y `VIN`.

---

## 5. Etapa 2 — Control

Es el ruteo hacia el microcontrolador: alimentación limpia a la DevKit, interfaz de usuario y los dos circuitos de conmutación que gobiernan la sonda y la medición de batería.

### 5.1. Componentes

| Ref | Componente | Función |
| :--- | :--- | :--- |
| `U1` | DevKit ESP32-WROOM-32 | Control, BLE y adquisición |
| `C3` | 100 µF | Reserva en `VIN` |
| `C4` | 100 nF | Desacoplo en `VIN` |
| `C5`, `C6` | 10 µF y 100 nF | Desacoplo en `+3V3` |
| `SW2` | Pulsador táctil | Disparo de medición y despertar |
| `R1` | 10 kΩ | Pull-up del pulsador |
| `C7` | 100 nF | Antirrebote |
| `D2`, `D3` | LED verde y azul | Estado de lectura y de enlace |
| `R2` | 270 Ω | Limitadora del LED verde |
| `R3` | 120 Ω | Limitadora del LED azul |
| `Q1` | P-MOSFET `AO3401A` o `IRLML6402` | Corte de `5V_SONDA` |
| `Q2` | N-MOSFET `2N7002` | Adapta el nivel del GPIO a la compuerta de `Q1` |
| `R4` | 100 kΩ | Pull-up de compuerta de `Q1` hacia `+5V` |
| `R5` | 1 kΩ | Serie en la compuerta de `Q2` |
| `R6` | 100 kΩ | Pull-down de compuerta de `Q2` |
| `R9`, `R10` | 100 kΩ y 100 kΩ | Divisor de medición de batería |
| `Q3` | N-MOSFET `2N7002` | Conmuta el divisor |
| `R14` | 100 kΩ | Pull-down de compuerta de `Q3` |
| `C9` | 100 nF | Reserva de carga en el nodo del ADC |

### 5.2. Alimentación de la DevKit

`+5V` entra por `VIN`. El regulador interno de la DevKit genera `+3V3`, que alimenta al BME280 y al transceptor.

**No conectar nunca `+5V` al pin `3V3`.**

`C3` de 100 µF absorbe el escalón de corriente cuando arranca la radio BLE; `C4` de 100 nF va lo más cerca posible del pin. En el lado de 3,3 V, `C5` y `C6` estabilizan el riel que comparten los dos periféricos.

### 5.3. Pulsador `SW2`

Pulsador a masa con `R1` de 10 kΩ como pull-up hacia `+3V3` y `C7` de 100 nF en paralelo como antirrebote. En reposo el pin queda alto; al pulsar cae a cero.

Va en **`GPIO33`**, no en `GPIO0`. En la DevKit, `GPIO0` **ya está cableado al botón BOOT de la placa**: dejar ahí el pulsador de medición significa que apretarlo durante el arranque mete al ESP32 en modo programación en vez de tomar una lectura. `GPIO33` es RTC, así que sirve para despertar del sueño profundo, y no es pin de *strapping*.

### 5.4. LED de estado

Dos LED con su resistencia en serie desde `+3V3`:

| LED | Color | Función | Caída típica | Corriente | Resistencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `D2` | Verde | Lectura exitosa y batería correcta | 2,0 V | 5 mA | **270 Ω** |
| `D3` | Azul | Enlace BLE activo | 3,0 V | 3 mA | **120 Ω** |

El azul queda muy justo: con 3,3 V de alimentación y 3,0 V de caída apenas hay margen y el brillo varía mucho entre lotes. Si hace falta verlo bajo sol directo, conviene alimentarlo desde `+5V` con su propio transistor, o usar un LED azul de alta eficiencia.

> **El BOM compra tres LED y el diseño usa dos.** Decidir si se agrega un tercero de indicación de carga o se corrige la cantidad comprada.

### 5.5. Power gate de la sonda

Corta la alimentación de la sonda y del bus mientras no se mide.

```text
+5V ──┬──────────────[ Q1 P-MOSFET ]────────► 5V_SONDA
      │               S          D
      │               └──┬──G
      └── R4 100k ───────┘
                         │
                    [ Q2 N-MOSFET ]
   GPIO5 ── R5 1k ──G    D ── a compuerta de Q1
                    │    S ── GND
              R6 100k
                    │
                   GND
```

`GPIO5` en alto satura `Q2`, que tira la compuerta de `Q1` a masa y lo hace conducir: la sonda recibe 5 V. En bajo, `R4` devuelve la compuerta a `+5V` y `Q1` corta.

> **`R4` y `R6` no son opcionales.** Sin `R6`, la compuerta de `Q2` queda flotando durante el arranque del ESP32 y **la sonda puede alimentarse sola antes de que el firmware tome control del pin**. `R4` cumple lo mismo del lado de `Q1`: lo mantiene cortado por defecto.

### 5.6. Divisor de medición de batería

Alimenta el byte 14 de la trama BLE, el porcentaje de batería.

```text
VBAT_PROT ── R9 100k ──┬── VBAT_SENSE ──► GPIO34
                       │
                    R10 100k
                       │
                 [ Q3 N-MOSFET ]  ◄── GPIO25, con R14 100k a GND
                       │
                      GND

C9 100 nF entre VBAT_SENSE y GND
```

**Por qué conmutado y no fijo.** Un divisor permanente tiene dos problemas, y el segundo es de corrección, no de consumo:

1. Drena ~18,5 µA sin parar, que se arrastraría a la versión con módulo desnudo.
2. **Con el equipo apagado por `SW1`, el ESP32 queda sin alimentación mientras el divisor sigue aplicando ~2,1 V sobre `GPIO34`.** Eso inyecta corriente por los diodos de protección de una entrada sin alimentar.

Con `Q3`, al apagarse el equipo la compuerta cae por `R14`, el MOSFET corta y el nodo del ADC queda en cero. El firmware sube `GPIO25`, espera a que `C9` se estabilice, lee y vuelve a bajarlo.

**Escalado:** a 4,2 V de celda el nodo entrega 2,10 V; a 3,0 V entrega 1,50 V. Ambos caen dentro del rango utilizable de `ADC1` con atenuación de 11 dB.

`C9` es necesario porque el ADC del ESP32 muestrea sobre un condensador interno y una impedancia de fuente de 50 kΩ no alcanza a recargarlo entre muestras.

**Calibración:** el ADC del ESP32 no es lineal en los extremos. Medir con multímetro en `TP1` y `TP9` y ajustar en firmware; no asumir la razón teórica de 0,5.

### 5.7. Mapa de pines

| GPIO | Señal | Va a | Nota |
| :--- | :--- | :--- | :--- |
| `GPIO16` | `RX2` | `U2` pin 1, `RO` | Libre en WROOM-32 |
| `GPIO17` | `TX2` | `U2` pin 4, `DI` | Libre en WROOM-32 |
| `GPIO4` | `DE` y `/RE` | `U2` pines 2 y 3, unidos | Alto transmite, bajo recibe |
| `GPIO5` | Power gate | `R5` hacia compuerta de `Q2` | *Strapping*; `R6` lo define al arrancar |
| `GPIO21` | `SDA` | `U3` y `R7` | |
| `GPIO22` | `SCL` | `U3` y `R8` | |
| `GPIO34` | `VBAT_SENSE` | Nodo de `R9`, `R10` y `C9` | Solo entrada, `ADC1_CH6` |
| `GPIO25` | Habilitación del divisor | Compuerta de `Q3` con `R14` | RTC libre |
| `GPIO33` | Pulsador | `SW2` y `R1` | RTC, despierta del sueño profundo |
| `GPIO2` | LED verde | `R2` | *Strapping* tolerable |
| `GPIO15` | LED azul | `R3` | *Strapping*; en bajo silencia el log de arranque |

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

El regulador `AMS1117` de la DevKit consume del orden de 5 a 10 mA en vacío, y el conversor USB-serie agrega lo suyo. El sueño profundo en una DevKit típica queda en **decenas de miliamperios**, no en microamperios.

Esto está **aceptado para esta versión**. Por eso `SW1` no es un accesorio sino la pieza que hace viable la DevKit: el equipo se apaga físicamente entre usos y el consumo en reposo deja de importar. Un presupuesto de reposo en microamperios solo tiene sentido con el módulo desnudo.

La medición de consumo se hace igual, con `JP1`, para tener el dato real antes de pasar al módulo desnudo.

---

## 6. Etapa 3 — Periféricos de salida y sensores

### 6.1. Componentes

| Ref | Componente | Función |
| :--- | :--- | :--- |
| `U3` | Módulo BME280 I²C | Temperatura, humedad relativa y presión |
| `R7`, `R8` | 4,7 kΩ | Pull-ups de `SDA` y `SCL` |
| `U2` | `SP3485` SOIC-8 | Transceptor RS-485 a 3,3 V |
| `C8` | 100 nF | Desacoplo de `U2` |
| `J2` | Borne de tornillo o JST de 4 vías | Conexión de la sonda |
| `R11` | 120 Ω | Terminación del bus |
| `R12`, `R13` | 4,7 kΩ | Polarización *fail-safe* |
| `D4` | `SM712` SOT-23 | TVS específico para RS-485 |

### 6.2. Sensor ambiental BME280

Alimentado desde `+3V3`, en `SDA` = `GPIO21` y `SCL` = `GPIO22`.

| Magnitud | Rango | Exactitud |
| :--- | :--- | :--- |
| Temperatura del aire | −40 a +85 °C | ±0,5 °C |
| Humedad relativa | 0 a 100 % | ±3 % |
| Presión atmosférica | 300 a 1100 hPa | ±1 hPa |

**Lectura local obligatoria:** la app usa estas tres magnitudes para tres celdas del grid 2×5; el pronóstico de la API solo las complementa. Los centinelas de ausencia se declaran por magnitud y **no se reemplazan con ceros ni con la última lectura buena**.

Detalles a cerrar en el esquemático:

- `R7` y `R8` de 4,7 kΩ hacia `+3V3`. **Muchos módulos BME280 ya los traen montados**: verificar antes de duplicarlos, porque en paralelo bajan demasiado la resistencia de pull-up.
- Dirección I²C: `SDO` a masa da `0x76`, a `+3V3` da `0x77`. Fijarla por hardware y documentarla.
- `CSB` a `+3V3` para forzar modo I²C.
- Es **BME280**, no BMP280: el BMP no mide humedad.

El sensor va en la parte posterior del chasis, tras una membrana microporosa de PTFE permeable al vapor. **Debe medir aire exterior**: no encapsularlo ni sellarlo contra la carcasa.

### 6.3. Transceptor RS-485

| Pin `U2` | Señal | Va a |
| :--- | :--- | :--- |
| 1 | `RO` | `GPIO16`, RX2 |
| 2 | `/RE` | Unido al pin 3 |
| 3 | `DE` | `GPIO4` |
| 4 | `DI` | `GPIO17`, TX2 |
| 5 | `GND` | `GND` |
| 6 | `A` | `J2` pin 3 |
| 7 | `B` | `J2` pin 4 |
| 8 | `VCC` | `+3V3`, con `C8` al lado |

Los pines 2 y 3 van unidos y mandados por un solo GPIO: alto transmite, bajo recibe. Trabaja a 3,3 V directo con el ESP32, sin desplazadores de nivel.

> **El BOM pide «definir IC o módulo, no ambos».** Este documento especifica el **integrado SOIC-8**, que obliga a rutear alrededor la terminación, la polarización y el TVS. Si se prefiere un módulo, esos tres componentes ya vienen incluidos y hay que quitarlos del esquemático.

### 6.4. Conector de la sonda `J2`

| Pin | Señal |
| :--- | :--- |
| 1 | `5V_SONDA` |
| 2 | `GND` |
| 3 | `A` |
| 4 | `B` |

Los 5 V salen del elevador **después** del corte de `Q1`, de modo que la sonda queda sin alimentación mientras no se mide. La sonda trae cable de 2 m y masa común con la placa.

### 6.5. Terminación y polarización

**La terminación de 120 Ω probablemente sobra.** `R11` existe para evitar reflexiones en buses largos; con **2 m de cable y 9600 baudios** no hay reflexión que corregir, y en cambio **consume del orden de 25 mA extra mientras el transceptor transmite**.

Dejarla como huella sin montar, con dos islas puenteables, y montarla solo si aparecen errores de CRC.

La polarización *fail-safe* sí conviene: `R12` de 4,7 kΩ desde `A` hacia `+3V3` y `R13` de 4,7 kΩ desde `B` hacia `GND`. Definen el estado del bus cuando nadie transmite y evitan que el receptor lea ruido como datos. Consumen alrededor de 350 µA mientras haya `+3V3`.

### 6.6. Protección del bus

`D4`, un TVS bidireccional **`SM712`** en SOT-23, entre `A`, `B` y masa. Es un TVS específico para RS-485: sus tensiones de trabajo están pensadas para el rango de modo común del estándar, a diferencia de un TVS genérico.

### 6.7. El transceptor no queda cortado

`U2` se alimenta de `+3V3` y `Q1` corta `+5V`. **Tal como está especificado, el transceptor queda alimentado siempre que el equipo esté encendido**, junto con el consumo de la polarización *fail-safe*.

Se puede dejar así en la V2, porque `SW1` corta todo entre usos. Si más adelante se persigue un presupuesto de reposo en microamperios, hay que agregar un segundo MOSFET en la rama de `+3V3` que alimenta a `U2`.

### 6.8. Ciclo de adquisición Modbus RTU

1. **Despertar:** por pulsación en `GPIO33` o por solicitud BLE desde la app.
2. **Power gate ON:** `GPIO5` en alto, la sonda recibe 5,0 V.
3. **Estabilización:** 100 ms de espera para el oscilador interno de la sonda.
4. **Comando, UART2 a 9600 baudios, 8N1:**
   ```text
   0x01 (dirección) 0x03 (leer holding) 0x00 0x00 (registro inicial) 0x00 0x07 (7 registros) 0x04 0x08 (CRC16)
   ```
5. **Recepción y validación CRC16:** 19 bytes con las siete variables de suelo.
6. **Power gate OFF:** `GPIO5` en bajo, la línea de 5 V se corta.
7. **Lectura ambiental I²C del BME280:** temperatura, humedad y presión.
8. **Lectura de batería:** `GPIO25` en alto, muestreo de `GPIO34`, `GPIO25` en bajo.
9. **Notificación BLE** de los 20 bytes.

> El mapa de registros **no está confirmado** contra la ficha del proveedor. Antes de fabricar hace falta una captura Modbus real del SKU adquirido.

### 6.9. Estructura binaria de la trama BLE (20 bytes)

**Formato único de 20 bytes:** 14 de suelo, 1 de batería, 1 de identificador y 4 de ambiente, para diez variables más batería. Es el máximo que cabe en una notificación con el MTU por defecto de BLE, así que no hace falta negociar MTU ni partir la lectura en dos paquetes.

**El contrato válido es el que decodifica `App/src/services/probeService.ts`.** El firmware debe emitir exactamente esto. Ver la [explicación byte a byte y el ejemplo hexadecimal completo](../docs/CONTRATO_BLE.md).

```text
 ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │13 │14 │15 │
 ├───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┼───┤
 │ HumS  │ TempS │  EC   │  pH   │   N   │   P   │   K   │Bat│fmt│
 └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───┴───┘
 ┌────────────────────┐
 │ 16 │ 17 │ 18 │ 19  │  Ambiente BME280 empaquetado en 32 bits
 └────────────────────┘
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
| 14 | Batería | **`uint8`** | **porcentaje 0–100**, no milivoltios |
| 15 | Identificador de formato | `uint8` | `1` = 20 bytes con ambiente, el formato del producto. `0` = 16 bytes, tolerado solo para prototipos sin BME280. Otro valor se rechaza |
| 16–19 | Ambiente BME280 | 32 bits | Temperatura 12 bits `(°C × 10) + 400`; presión 12 bits `hPa − 300`; humedad 8 bits `% × 2`. Todos los bits a uno = sin dato → `NULL` |

**La V2 emite siempre el identificador `1`.** El valor `0` existe únicamente como tolerancia del decodificador para prototipos sin BME280 y no es un modo de operación del producto.

El firmware debe adquirir y notificar una lectura nueva al suscribirse: no transporta contador ni reloj del sensor. La localización y la fecha las aporta el celular. Recibir una notificación válida confirma respuesta en ese instante, no conexión permanente ni internet.

---

## 7. Puntos de prueba y medición

Sin esto no se puede ejecutar el plan de medición de consumo. Van en el esquemático como símbolos `TestPoint`.

### 7.1. Lista

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

### 7.2. `JP1`, el puente que hace medible el consumo

Un punto de prueba deja ver una tensión, pero para medir **corriente** hay que **abrir el circuito** e intercalar el amperímetro. Con la batería soldada en firme no hay dónde hacerlo sin cortar una pista.

`JP1` es un puente de dos islas en serie con `VBAT`, entre `J1` pin 1 y `F1`, fabricado unido por una pista fina:

- **Uso normal:** la pista los une, no hay que hacer nada.
- **Para medir:** se corta la pista y se sueldan dos cables al amperímetro. Al terminar se restablece con una gota de estaño.

Separación de 2,54 mm, con islas lo bastante grandes para soldar cable, no solo para apoyar una punta.

### 7.3. Ubicación física

La carcasa se abre para programar, así que los puntos de prueba **no salen al exterior**, pero deben quedar accesibles con la placa montada y la tapa abierta:

1. **`TP1`, `TP2`, `TP3`, `TP7` y `JP1` agrupados en el borde de alimentación**, en una fila, para medir todo el árbol sin mover la punta de sitio.
2. **`TP5`, `TP6` y `TP8` juntos y cerca de `J2`**, para enganchar una sonda diferencial sin cables largos que capten ruido.
3. **`TP4` cerca de `Q1`**, para ver el corte del power gate donde ocurre.
4. **`TP9` junto al divisor**, al lado de `R9` y `R10`.
5. **Ninguno bajo la DevKit ni bajo `MOD1`:** quedarían tapados por la placa hija.
6. **Ninguno dentro del área libre de cobre de la antena.**

Islas de 1,5 a 2,0 mm de cobre expuesto, o perforadas de 1,0 mm para pinzas. Rotuladas en serigrafía con el nombre del net, no con el número de referencia: sirve leer `+3V3`, no `TP3`.

---

## 8. Fabricación de la PCB

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

## 9. Diseño mecánico

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

## 10. Orden de trabajo y pendientes

### 10.1. Orden para dibujar el esquemático

1. Hoja de alimentación completa, con las nets nombradas.
2. DevKit con sus desacoplos y los puntos de prueba.
3. Power gate `Q1` y `Q2` con `R4` y `R6`, que es donde más se equivoca uno.
4. Divisor conmutado `R9`, `R10`, `Q3`, `R14` y `C9`.
5. Transceptor, conector de sonda, terminación y TVS.
6. BME280, pulsador y LED.
7. Puntos de prueba y `JP1`.
8. **ERC en cero antes de asignar una sola huella.**
9. Asignación de huellas y recién entonces el ruteo.

### 10.2. Verificaciones sobre componentes físicos

| Qué | Por qué bloquea |
| :--- | :--- |
| ¿`MOD1` expone pad `EN` o `KEY`? | Decide la variante de `SW1` de la sección 4.5 |
| ¿El módulo BME280 trae pull-ups I²C montados? | Evita duplicar `R7` y `R8` |
| ¿La DevKit monta WROOM o WROVER? | En WROVER, `GPIO16` y `GPIO17` están ocupados por la PSRAM |
| Consumo real de la sonda a 5 V | Dimensiona `F1`, `Q1` y `C1` |
| Tercer pin de la celda adquirida | Confirmar que dejarlo `NC` es seguro |

### 10.3. Pendientes antes de fabricar

- Confirmar la variante de sonda y **medir su consumo a la tensión elegida**. Los 0,5 W publicados corresponden a 24 V.
- **Confirmar el mapa de registros Modbus** contra la ficha del proveedor, con captura real del SKU adquirido.
- Cerrar fichas de DevKit, BME280, módulo de carga y elevación, y celda.
- Escribir el firmware. **No existe en este repositorio**; debe cumplir el contrato de la sección 6.9.
- **Medir energía desde la batería** con `JP1`, distinguiendo el consumo del equipo encendido del de la rama de sonda.
- Ensayos de radio, batería y carcasa. El IP68 de la sonda no acredita el equipo.
- Resolver los tres LED del BOM contra los dos del diseño.
- Definir si se permite medir mientras carga.
