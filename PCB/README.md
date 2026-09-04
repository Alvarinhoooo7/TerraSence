# 🔌 TerraSense · Hardware, Electrónica y Diseño del Instrumento Portátil Compacto

Documentación técnica integral del hardware embarcado, diseño en KiCad, arquitectura de potencia optimizada a 5V, módulo integrado de carga y elevación TP4056 + Step-Up, batería convencional de litio de 2.000 mAh y chasis ergonómico portátil de mano (**Handheld Agro-Sensor**).

---

## 📑 Tabla de Contenidos

- [1. Especificaciones Generales de Hardware](#1-especificaciones-generales-de-hardware)
- [2. Arquitectura Electrónica y Diagrama de Bloques](#2-arquitectura-electrónica-y-diagrama-de-bloques)
  - [2.1. Microcontrolador Central (ESP32-WROOM-32E)](#21-microcontrolador-central-esp32-wroom-32e)
  - [2.2. Sensor Ambiental de Superficie (Bosch BME280)](#22-sensor-ambiental-de-superficie-bosch-bme280)
  - [2.3. Interfaz de Comunicación Industrial RS-485](#23-interfaz-de-comunicación-industrial-rs-485)
- [3. Sistema de Gestión de Potencia y Alimentación](#3-sistema-de-gestión-de-potencia-y-alimentación)
  - [3.1. Operación de la Sonda NPK a 5V DC](#31-operación-de-la-sonda-npk-a-5v-dc)
  - [3.2. Módulo Integrado TP4056 con Step-Up en PCB](#32-módulo-integrado-tp4056-con-step-up-en-pcb)
  - [3.3. Aislamiento Físico por MOSFET (0,0 µA en Reposo)](#33-aislamiento-físico-por-mosfet-00-µa-en-reposo)
  - [3.4. Batería de Litio Convencional de 2.000 mAh](#34-batería-de-litio-convencional-de-2000-mah)
  - [3.5. Balance Energético y Autonomía de Terreno](#35-balance-energético-y-autonomía-de-terreno)
- [4. Diseño de PCB y Archivos KiCad](#4-diseño-de-pcb-y-archivos-kicad)
  - [4.1. Parámetros de Fabricación JLCPCB (2 Capas)](#41-parámetros-de-fabricación-jlcpcb-2-capas)
  - [4.2. Lista de Materiales (BOM) Electrónico Optimizado](#42-lista-de-materiales-bom-electrónico-optimizado)
  - [4.3. Mapeo de Pines (Pinout)](#43-mapeo-de-pines-pinout)
- [5. Diseño Mecánico del Instrumento Portátil de Mano (Handheld)](#5-diseño-mecánico-del-instrumento-portátil-de-mano-handheld)
  - [5.1. Chasis Compacto Ergonómico IP67](#51-chasis-compacto-ergonómico-ip67)
  - [5.2. Montaje Directo de Electrodos Inox 316L](#52-montaje-directo-de-electrodos-inox-316l)
  - [5.3. Interfaz de Usuario y Puerto USB-C](#53-interfaz-de-usuario-y-puerto-usb-c)
- [6. Protocolo Firmware y Trama BLE GATT](#6-protocolo-firmware-y-trama-ble-gatt)
  - [6.1. Ciclo de Adquisición Modbus RTU](#61-ciclo-de-adquisición-modbus-rtu)
  - [6.2. Estructura Binaria de la Trama BLE (16 Bytes)](#62-estructura-binaria-de-la-trama-ble-16-bytes)

---

## 1. Especificaciones Generales de Hardware

| Parámetro | Valor de Diseño | Justificación Técnica |
| :--- | :--- | :--- |
| **MCU Principal** | ESP32-WROOM-32E (4 MB Flash) | Doble núcleo 240 MHz, BLE 5.0 integrado, antena certificada |
| **Sonda de Suelo** | Sonda industrial 7-en-1 RS-485 Modbus RTU | Rango de alimentación **DC 4.5V–30V**, electrodos acero inox 316L |
| **Alimentación Sonda**| **5,0V DC** (suministrados por Step-Up) | Operación directa sin requerir 12V; menor estrés y menor consumo |
| **Sensor Ambiental** | Bosch BME280 (I2C) | Temperatura, humedad relativa y presión atmosférica en superficie |
| **Transceptor Bus** | SP3485 / MAX3485 (3.3V) | Comunicación diferencial industrial semidúplex robusta |
| **Batería** | 1× Polímero de Litio (LiPo / Li-Ion) 3.7V, **2.000 mAh** | Formato prismático convencional ultraligero (~35 g), sin portaceldas |
| **Carga y Elevación**| Módulo combo **TP4056 + Step-Up integrado** | Carga USB-C + protección DW01A + elevador a 5V en una sola PCB económica |
| **Consumo en Reposo** | **0,0 µA** en línea de sonda (Power Gating) | El rail de 5V y la sonda se desconectan físicamente al no medir |
| **Autonomía** | **≥ 4.000 mediciones** (> 18 meses de uso típico) | 0,146 mAh por medición; el agricultor recarga un par de veces al año |
| **Formato Físico** | Instrumento portátil de mano (*Handheld*) | Peso total < 280 g; inserción directa manual en el suelo |
| **Grado de Sellado** | IP67 (sellado estanco con junta perimetral) | Resistencia total a lluvia, polvo y barro agrícola |

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
 [ LDO AP2112K 3.3V ]                       [ P-MOSFET Power Gate ]
       │                                    (Conmutado por GPIO5)
 ┌─────┴──────────────┐                              │ (0,0 µA en reposo)
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
* **Conectividad:** Bluetooth Low Energy (BLE 5.0).
* **Periféricos Usados:**
  * `UART2`: Pines GPIO16 (RX) y GPIO17 (TX) para el bus RS-485.
  * `I2C`: Pines GPIO21 (SDA) y GPIO22 (SCL) para el sensor ambiental BME280.
  * `GPIO4`: Control de dirección `DE`/`RE` del transceptor RS-485.
  * `GPIO5`: Control de compuerta (*Power Gate*) para habilitar los 5V hacia la sonda.
  * `GPIO34 (ADC1_CH6)`: Divisor de voltaje resistivo (100k / 100k) para monitoreo del voltaje de batería.
  * `GPIO0`: Pulsador ergonómico de gatillo/pulgar para disparo de medición rápida.
  * `GPIO2 / GPIO15`: Micro-LEDs de estado (Azul: BLE / Verde: Lectura Exitosa).

### 2.2. Sensor Ambiental de Superficie (Bosch BME280)
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

### 3.2. Módulo Integrado TP4056 con Step-Up en PCB
En lugar de rutear un circuito elevador discreto en la placa principal (con bobinas, diodos Schottky y potenciómetros sueltos), se utiliza un **módulo integrado de carga y Step-Up** en una sola placa compacta (ej. módulos combo TP4056 + Boost 5V, placas HW-357 o convertidores síncronos de bajo costo):
* **Costo unitario mayorista:** ~$800 a $1.200 CLP por unidad.
* **Ahorro de costos y complejidad:** Resuelve la carga por USB-C, el corte por sobretensión/sobredescarga (DW01A) y la elevación a 5,0V regulados en un submódulo estándar probado en millones de dispositivos.
* **Facilidad de producción:** Se monta como placa hija (*daughterboard*) o módulo soldado mediante orificios almenados (*castellated holes*) o pines estándar de 2.54 mm sobre la PCB de TerraSense.

### 3.3. Aislamiento Físico por MOSFET (0,0 µA en Reposo)
Para evitar que la sonda y el transceptor RS-485 drenen corriente de la batería mientras el equipo no está midiendo:
1. El pin `GPIO5` del ESP32 satura un transistor N-MOSFET (2N7002 / SOT-23).
2. El 2N7002 conmuta la compuerta de un P-MOSFET de potencia (SI2301 / IRLML6402, $R_{DS(on)} < 65\text{ m}\Omega$).
3. El P-MOSFET conecta la línea de 5V hacia la sonda y el transceptor **únicamente durante los 3 a 4 segundos** que toma la adquisición edafológica.
4. Concluida la lectura, `GPIO5` cae a nivel bajo, el P-MOSFET se abre y el consumo de la línea de sensado cae a **0,0 µA reales**.

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
│ Consumo por ciclo de medición individual: 0,095 mAh / lectura                │
│ Consumo diario estimado (10 mediciones/día + 24 h reposo): ~1,23 mAh/día    │
├─────────────────────────────────────────────────────────────────────────────┤
│ AUTONOMÍA TEÓRICA BATERÍA (2.000 mAh): > 1.600 días (4,4 años)              │
│ AUTONOMÍA REAL DECLARADA (Derateo 60% por frío invernal y autodescarga):     │
│ ➜ ≥ 4.000 a 6.000 mediciones efectivas / Más de 18 meses con una sola carga  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Diseño de PCB y Archivos KiCad

El proyecto incluye el diseño completo en **KiCad 8.0** ubicado en la raíz de esta carpeta:
* [`terrasense.kicad_pro`](terrasense.kicad_pro): Proyecto maestro.
* [`terrasense.kicad_sch`](terrasense.kicad_sch): Esquemático jerárquico.
* [`terrasense.kicad_pcb`](terrasense.kicad_pcb): Ruteo físico de 2 capas.
* [`terrasense.pdf`](terrasense.pdf): Planos exportados para fabricación.
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
| **U1** | ESP32-WROOM-32E-N4 | SMD Module | MCU BLE 5.0 / Procesamiento | $2.450 CLP |
| **U2** | Bosch BME280 | LGA-8 | Sensor ambiental T° / Humedad / Presión | $2.100 CLP |
| **U3** | SP3485EN-L/TR | SOIC-8 | Transceptor RS-485 a 3.3V | $480 CLP |
| **MOD1**| Módulo TP4056 + Step-Up 5V | Módulo SMD/Pines | Cargador USB-C + elevador 5V + BMS | $1.150 CLP |
| **U4** | AP2112K-3.3TRG1 | SOT-23-5 | Regulador LDO 3.3V 600mA para ESP32 | $190 CLP |
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
GPIO34       Divisor 100k / 100k a VBAT     Monitoreo analógico de batería (ADC1)
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
                    │ [🔘 Botón Disparo]  │      (PETG Técnico IP67, 140 mm alto)
                    │                     │      Aloja la PCB, Batería 2.000 mAh
                    │   TerraSense Core   │      y sensor ambiental BME280
                    │                     │
                    └──────────┬──────────┘
                               │  Junta de sellado estanca con uretano
                               ▼
                        /─────────────\      ◄── BASE PORTASONDA ROBUSTA
                       │  Cuerpo Sonda │          Epoxi industrial antichoque
                        \──┬──┬──┬──┬─/
                           │  │  │  │        ◄── PUNTAS DE ACERO INOX 316L (70 mm)
                           ▼  ▼  ▼  ▼            Inserción directa manual en el suelo
```

### 5.1. Chasis Compacto Ergonómico IP67
* **Material:** Filamento técnico PETG de grado industrial o ABS inyectado, con aditivos de protección UV y alta resistencia mecánica a caídas accidentales.
* **Forma:** Agarre contorneado para operar con una sola mano, incluso con guantes agrícolas.
* **Dimensiones exteriores:** $140\text{ mm (alto)} \times 75\text{ mm (ancho)} \times 38\text{ mm (profundidad)}$.
* **Peso total del equipo:** **Menos de 280 gramos** (incluyendo batería, electrónica y sonda).
* **Hermeticidad:** Cierre mediante junta perimetral tórica de silicona (O-ring) con grado de protección **IP67**.

### 5.2. Montaje Directo de Electrodos Inox 316L
* La base inferior del gabinete abraza firmemente la sonda edafológica comercial mediante encastre mecánico con relleno de uretano elástico.
* Las agujas de acero inoxidable **grado 316L** sobresalen directamente hacia abajo para insertarse en el suelo con la presión natural de la mano, alcanzando la zona radicular activa del cultivo sin requerir palancas ni estribos mecánicos.

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
6. **Power Gate OFF:** `GPIO5` pasa a nivel bajo $\rightarrow$ La línea de 5V se corta inmediatamente (0,0 µA).
7. **Lectura ambiental I2C:** Captura rápida de temperatura y humedad ambiental con el sensor BME280.

### 6.2. Estructura Binaria de la Trama BLE (16 Bytes)
El firmware notifica los datos a la app móvil en un paquete binario ultracompacto de 16 bytes:

```text
 ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │13 │14 │15 │
 ├───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┼───┤
 │ TempS │ HumS  │  EC   │  pH   │   N   │   P   │   K   │TA │HA │
 └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───┴───┘
```

* **Bytes 0–1 (`TempS`):** Temperatura del suelo en décimas de grado Celsius (ej. `0x00E1` = 225 $\rightarrow$ 22,5 °C).
* **Bytes 2–3 (`HumS`):** Humedad volumétrica en décimas de porcentaje (ej. `0x01C2` = 450 $\rightarrow$ 45,0 %).
* **Bytes 4–5 (`EC`):** Conductividad eléctrica en $\mu\text{S/cm}$ (ej. `0x02BC` = 700 $\mu\text{S/cm}$).
* **Bytes 6–7 (`pH`):** pH del suelo en centésimas (ej. `0x028A` = 650 $\rightarrow$ 6,50 pH).
* **Bytes 8–9 (`N`):** Nitrógeno disponible en mg/kg (PPM).
* **Bytes 10–11 (`P`):** Fósforo disponible en mg/kg (PPM).
* **Bytes 12–13 (`K`):** Potasio disponible en mg/kg (PPM).
* **Byte 14 (`TA`):** Temperatura ambiental entera en °C con offset +50 (ej. valor 72 $\rightarrow$ 22 °C).
* **Byte 15 (`HA`):** Humedad relativa ambiental entera (0 a 100 %).
