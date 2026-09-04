# 🔌 TerraSense · Hardware, Electrónica y Mecánica de la Lanza

Documentación técnica integral del hardware embarcado, diseño de PCB en KiCad, arquitectura de potencia, electrónica de acondicionamiento y estructura electromecánica de la **Lanza Agronómica TerraSense de 1,5 metros**.

---

## 📑 Tabla de Contenidos

- [1. Especificaciones Generales de Hardware](#1-especificaciones-generales-de-hardware)
- [2. Arquitectura Electrónica y Esquemático](#2-arquitectura-electrónica-y-esquemático)
  - [2.1. Microcontrolador Central (ESP32-WROOM-32E)](#21-microcontrolador-central-esp32-wroom-32e)
  - [2.2. Sensor Ambiental de Superficie (Bosch BME280)](#22-sensor-ambiental-de-superficie-bosch-bme280)
  - [2.3. Interfaz de Comunicación Industrial RS-485](#23-interfaz-de-comunicación-industrial-rs-485)
- [3. Sistema de Gestión de Potencia (Power Gating)](#3-sistema-de-gestión-de-potencia-power-gating)
  - [3.1. Elevador de Voltaje Step-Up (MT3608) a 12V](#31-elevador-de-voltaje-step-up-mt3608-a-12v)
  - [3.2. Aislamiento Físico por MOSFET (0,0 µA en Reposo)](#32-aislamiento-físico-por-mosfet-00-µa-en-reposo)
  - [3.3. Banco de Baterías Li-Ion 18650 y Carga USB-C (TP4056)](#33-banco-de-baterías-li-ion-18650-y-carga-usb-c-tp4056)
  - [3.4. Balance Energético y Autonomía de Terreno](#34-balance-energético-y-autonomía-de-terreno)
- [4. Diseño de PCB y Archivos KiCad](#4-diseño-de-pcb-y-archivos-kicad)
  - [4.1. Parámetros de Fabricación JLCPCB (2 Capas)](#41-parámetros-de-fabricación-jlcpcb-2-capas)
  - [4.2. Lista de Materiales (BOM) Electrónico Unitario](#42-lista-de-materiales-bom-electrónico-unitario)
  - [4.3. Mapeo de Pines (Pinout) y Puntos de Prueba](#43-mapeo-de-pines-pinout-y-puntos-de-prueba)
- [5. Estructura Mecánica de la Lanza (1,5 Metros / 150 cm)](#5-estructura-mecánica-de-la-lanza-15-metros--150-cm)
  - [5.1. Empuñadura Ergonómica Superior en T](#51-empuñadura-ergonómica-superior-en-t)
  - [5.2. Mástil Tubular de Aluminio Estructural](#52-mástil-tubular-de-aluminio-estructural)
  - [5.3. Estribo / Pedal de Pie Desmontable](#53-estribo--pedal-de-pie-desmontable)
  - [5.4. Cabezal Edafológico 7-en-1 con Puntas 316L](#54-cabezal-edafológico-7-en-1-con-puntas-316l)
- [6. Protocolo Firmware y Trama BLE GATT](#6-protocolo-firmware-y-trama-ble-gatt)
  - [6.1. Ciclo de Adquisición Modbus RTU](#61-ciclo-de-adquisición-modbus-rtu)
  - [6.2. Estructura Binaria de la Trama BLE (16 Bytes)](#62-estructura-binaria-de-la-trama-ble-16-bytes)

---

## 1. Especificaciones Generales de Hardware

| Parámetro | Valor de Diseño | Justificación Técnica |
| :--- | :--- | :--- |
| **MCU Principal** | ESP32-WROOM-32E (4 MB Flash) | Doble núcleo 240 MHz, BLE 5.0 integrado, certificación SUBTEL/FCC |
| **Sonda de Suelo** | Sonda industrial 7-en-1 RS-485 Modbus RTU | Electrodos acero inoxidable 316L, encapsulado epóxico IP68 |
| **Sensor Ambiental** | Bosch BME280 (I2C) | Temperatura, humedad relativa y presión atmosférica en superficie |
| **Transceptor Bus** | SP3485 / MAX3485 (3.3V) | Comunicación diferencial robusta hasta 10 metros de cableado |
| **Batería** | 2× Li-Ion 18650 en paralelo (3.7V, 6.000 mAh) | Densidad energética óptima, recambio estándar, 22.2 Wh |
| **Carga Eléctrica** | USB-C sellado con controlador TP4056 (1A) | Carga completa en ~4,5 h con cargador estándar de celular |
| **Alimentación Sonda**| 12V DC generados por elevador MT3608 | La sonda industrial requiere mínimo 5V–12V para excitación estable |
| **Consumo en Reposo** | **0,0 µA** en línea de sonda (Power Gating) | El elevador y la sonda se desconectan físicamente cuando no miden |
| **Autonomía** | **≥ 2.000 mediciones** (8 a 12 meses típicos) | 0,141 mAh por ciclo de medición (8 a 12 mediciones diarias) |
| **Formato Físico** | Lanza agronómica de 1.500 mm (1,5 metros) | Postura erguida ergonómica ("walk-and-sample") con pedal de pie |
| **Grado de Sellado** | IP67 (cabezal y electrónica sellados) | Protección contra polvo, lluvia y barro en operaciones de campo |

---

## 2. Arquitectura Electrónica y Esquemático

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                      DIAGRAMA DE BLOQUES ELECTRÓNICO                        │
 └─────────────────────────────────────────────────────────────────────────────┘

    [ USB-C 5V ] ──► [ TP4056 + DW01A ] ──► [ 2× 18650 Li-Ion (3.7V 6Ah) ]
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             ▼                                               ▼
                     [ LDO AP2112K 3.3V ]                           [ P-MOSFET Switch ]
                             │                                      (GPIO5 Enable)
                 ┌───────────┴───────────┐                                   │
                 ▼                       ▼                                   ▼
          [ ESP32-WROOM ]        [ BME280 I2C ]                     [ MT3608 Boost 12V ]
             (MCU Core)          (Ambiente Sup.)                             │
                 │                                                   ┌───────┴───────┐
                 ├────── UART2 (TX/RX) ──────► [ SP3485 Transceiver ]│               │
                 └────── DE/RE (GPIO4) ──────►      (RS-485)         ▼               ▼
                                                       │        [VCC 12V]        [GND]
                                                       │            │               │
                                                       └────────────┼───────────────┤
                                                                    ▼               ▼
                                                         [ Sonda de Suelo 7-en-1 RS-485 ]
```

### 2.1. Microcontrolador Central (ESP32-WROOM-32E)
* **Arquitectura:** Xtensa dual-core 32-bit LX6 a 240 MHz.
* **Memoria:** 520 KB SRAM, 4 MB SPI Flash externa.
* **Conectividad:** Bluetooth Low Energy (BLE) v4.2 BR/EDR y BLE 5.0. Antena integrada en PCB certificada.
* **Periféricos Usados:**
  * `UART2`: Pines GPIO16 (RX) y GPIO17 (TX) para el bus RS-485.
  * `I2C`: Pines GPIO21 (SDA) y GPIO22 (SCL) para el sensor BME280.
  * `GPIO4`: Control de dirección `DE`/`RE` del transceptor RS-485.
  * `GPIO5`: Control de compuerta (*Power Gate*) para encendido de 12V.
  * `GPIO34 (ADC1_CH6)`: Divisor de voltaje resistivo (100k / 100k) para monitoreo analógico de batería.
  * `GPIO0`: Pulsador multifunción frontal (Pairing / Trigger de medición).
  * `GPIO2 / GPIO15`: LEDs indicadores de estado (Azul: BLE / Verde: Medición OK / Rojo: Falla).

### 2.2. Sensor Ambiental de Superficie (Bosch BME280)
Ubicado en la base inferior del cabezal de la empuñadura, protegido por una membrana microporosa de PTFE permeable al vapor pero impermeable al agua y polvo (IP67):
* **Temperatura ambiental:** Rango −40 °C a +85 °C (exactitud ±0.5 °C).
* **Humedad relativa:** Rango 0 % a 100 % RH (exactitud ±3 % RH).
* **Presión atmosférica:** Rango 300 hPa a 1100 hPa (exactitud ±1 hPa).

### 2.3. Interfaz de Comunicación Industrial RS-485
* **Transceptor:** SP3485E (Exar/MaxLinear) o MAX3485 en encapsulado SOIC-8.
* **Tensión de operación:** 3.3V directo sin desplazadores de nivel (*level shifters*).
* **Protección de línea:** Diodo de supresión de transitorios ESD TVS bidireccional (SM712) entre las líneas A y B para proteger contra descargas estáticas al clavar la lanza en terreno seco.
* **Resistencias de polarización:** Resistencias de *fail-safe* pull-up en A (4.7 kΩ a 3.3V) y pull-down en B (4.7 kΩ a GND), más resistencia de terminación de 120 Ω conmutable por jumper.

---

## 3. Sistema de Gestión de Potencia (Power Gating)

### 3.1. Elevador de Voltaje Step-Up (MT3608) a 12V
La sonda edafológica industrial requiere una tensión continua de excitación de 12V DC para alimentar su circuitería interna de alta frecuencia (FDR) y sus electrodos. Para suministrarla desde la batería Li-Ion (3.0V a 4.2V):
* **Topología:** Convertidor elevador asíncrono conmutado a 1.2 MHz.
* **Cálculo de realimentación:**
  $$V_{\text{out}} = V_{\text{ref}} \times \left(1 + \frac{R_1}{R_2}\right) = 0{,}6\,\text{V} \times \left(1 + \frac{190\,\text{k}\Omega}{10\,\text{k}\Omega}\right) = 12{,}0\,\text{V}$$
* **Eficiencia:** 88 % a 92 % en el punto de operación de la sonda (consumo de ~35 mA a 12V = 420 mW).

### 3.2. Aislamiento Físico por MOSFET (0,0 µA en Reposo)
El convertidor MT3608 y la sonda consumen una corriente quiescente inaceptable (~2 mA a 5 mA) si se mantienen energizados continuamente. 

Se implementa una conmutación de potencia en el lado alto (*High-Side Power Gating*):
1. El pin `GPIO5` del ESP32 satura un transistor N-MOSFET (2N7002 / SOT-23).
2. El 2N7002 drena la compuerta de un P-MOSFET de potencia (SI2301 / IRLML6402, $R_{DS(on)} < 65\text{ m}\Omega$).
3. El P-MOSFET conecta la línea positiva de la batería al pin `VIN` del MT3608 únicamente durante los **3 a 5 segundos** que dura la secuencia de lectura de campo.
4. Finalizada la lectura, `GPIO5` vuelve a nivel bajo, el P-MOSFET se abre y la corriente hacia el elevador, el transceptor y la sonda cae a **0,0 µA reales**.

### 3.3. Banco de Baterías Li-Ion 18650 y Carga USB-C (TP4056)
* **Configuración:** 2 celdas formato 18650 conectadas en paralelo (1S2P).
* **Capacidad:** 2× 3.000 mAh = 6.000 mAh nominales @ 3.7V (22.2 Wh de energía almacenada).
* **Protección integrada:** Módulo de protección por celda con integrado DW01A y MOSFET dual FS8205A (corte por sobretensión a 4.25V, corte por sobredescarga a 2.5V, límite de sobrecorriente a 3A).
* **Carga:** Circuito integrado lineal TP4056 con resistencia $R_{\text{prog}} = 1.2\text{ k}\Omega$ para corriente constante de 1.000 mA. Disipación térmica acoplada al plano de cobre inferior de la PCB.

### 3.4. Balance Energético y Autonomía de Terreno

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PERFIL DE CONSUMO POR CICLO                           │
├────────────────────────────────┬──────────────┬──────────────┬──────────────┤
│ Estado Operativo               │ Duración     │ Corriente    │ Carga (mAh)  │
├────────────────────────────────┼──────────────┼──────────────┼──────────────┤
│ 1. Reposo Profundo (Deep Sleep)│ 23 h 55 min  │ 15 µA        │ 0,358 mAh    │
│ 2. Publicidad BLE y Conexión   │ 15 segundos  │ 45 mA        │ 0,188 mAh    │
│ 3. Disparo y Excitación Sonda  │ 4 segundos   │ 115 mA       │ 0,128 mAh    │
│ 4. Transmisión BLE GATT        │ 1 segundo    │ 65 mA        │ 0,018 mAh    │
├────────────────────────────────┴──────────────┴──────────────┴──────────────┤
│ Consumo por ciclo de medición individual: 0,146 mAh / lectura                │
│ Consumo diario (8 mediciones/día + 24 h reposo): ~1,52 mAh/día               │
├─────────────────────────────────────────────────────────────────────────────┤
│ AUTONOMÍA TEÓRICA BATERÍA (6.000 mAh): > 3.500 días                          │
│ AUTONOMÍA DECLARADA (Derateo 3x por frío invernal y autodescarga):           │
│ ➜ ≥ 2.000 mediciones efectivas / 8 a 12 meses sin recargar                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Diseño de PCB y Archivos KiCad

El proyecto incluye el diseño completo en **KiCad 8.0** ubicado en la raíz de esta carpeta:
* [`terrasense.kicad_pro`](terrasense.kicad_pro): Proyecto maestro.
* [`terrasense.kicad_sch`](terrasense.kicad_sch): Esquemático jerárquico completo.
* [`terrasense.kicad_pcb`](terrasense.kicad_pcb): Ruteo físico y apilado de capas.
* [`terrasense.pdf`](terrasense.pdf): Planos esquemáticos exportados listos para imprimir.
* [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx): Planilla formal de componentes y referencias LCSC.
* [`ERC.rpt`](ERC.rpt): Informe de chequeo de reglas eléctricas (ERC) limpio.

### 4.1. Parámetros de Fabricación JLCPCB (2 Capas)
* **Dimensiones:** $85{,}0\text{ mm} \times 48{,}0\text{ mm}$ (diseñada para encajar en el cabezal de la empuñadura).
* **Capas:** 2 capas (Top: Señal / Bottom: Plano de masa ininterrumpido GND).
* **Espesor de sustrato:** 1.6 mm FR-4 (Tg 130–140 °C).
* **Espesor de cobre:** $1\text{ oz}$ ($35\,\mu\text{m}$).
* **Acabado superficial:** HASL con plomo o ENIG (inmersión en oro).
* **Ancho de pistas mín:** Señales: 0.25 mm (10 mil); Potencia (VBAT, 12V): 0.8 mm a 1.2 mm (30 a 45 mil).
* **Aislamiento de RF:** Área libre de cobre (*keep-out zone*) de $15 \times 10\text{ mm}$ bajo la antena traceada del ESP32.

### 4.2. Lista de Materiales (BOM) Electrónico Unitario

| Referencia | Componente | Encapsulado | Función | Costo Unitario (LCSC) |
| :--- | :--- | :--- | :--- | ---: |
| **U1** | ESP32-WROOM-32E-N4 | SMD Module | Microcontrolador BLE/WiFi | $2.450 CLP |
| **U2** | Bosch BME280 | LGA-8 ($2.5\times2.5$) | Sensor ambiental I2C | $2.100 CLP |
| **U3** | SP3485EN-L/TR | SOIC-8 | Transceptor RS-485 a 3.3V | $480 CLP |
| **U4** | MT3608 | SOT-23-6 | Elevador DC-DC a 12V | $220 CLP |
| **U5** | TP4056 + DW01A + FS8205A | SOP-8 / SOT-23-6 | Cargador y protección Li-Ion | $350 CLP |
| **U6** | AP2112K-3.3TRG1 | SOT-23-5 | Regulador LDO 3.3V 600mA | $190 CLP |
| **Q1** | IRLML6402TRPBF | SOT-23 | P-MOSFET Power Gate (−20V, −3.7A)| $140 CLP |
| **Q2** | 2N7002 | SOT-23 | N-MOSFET de control de compuerta| $45 CLP |
| **D1** | SM712 | SOT-23 | Diodo TVS protección bus RS-485 | $180 CLP |
| **D2** | SS34 | SMA / DO-214AC | Diodo Schottky rectificador MT3608| $75 CLP |
| **L1** | 22 µH blindada (CD54) | SMD | Inductor de potencia MT3608 | $190 CLP |
| **J1** | Conector USB-C 16-pin | SMD Type-C | Puerto de carga sellado | $290 CLP |
| **Pasivos**| Resistencias (1%), Capacitores cerámicos X7R | 0805 / 0603 | Filtros, divisores y desacoplo | $181 CLP |
| **SUBTOTAL BOM ELECTRÓNICO (SMD LCSC)** | | | | **$6.711 CLP** |

### 4.3. Mapeo de Pines (Pinout) y Puntos de Prueba

```text
ESP32 GPIO   Conexión Hardware              Función
──────────   ─────────────────────────────  ─────────────────────────────────────
GPIO16       SP3485 Pin 1 (RO)              UART2 Receive (RXD2)
GPIO17       SP3485 Pin 4 (DI)              UART2 Transmit (TXD2)
GPIO4        SP3485 Pines 2 y 3 (RE/DE)     Control de dirección RS-485 (1=TX, 0=RX)
GPIO5        2N7002 Gate                    Power Gating 12V (1=On, 0=Off)
GPIO21       BME280 Pin 3 (SDA)             I2C Data Bus
GPIO22       BME280 Pin 4 (SCL)             I2C Clock Bus
GPIO34       Divisor 100k / 100k a VBAT     Monitoreo analógico de batería (ADC1)
GPIO0        Pulsador Táctil (Pull-up)      Disparo de medición y modo Pairing BLE
GPIO2        LED de Estado Verde            Indicador de medición y carga OK
GPIO15       LED de Estado Azul             Indicador de enlace BLE activo
```

---

## 5. Estructura Mecánica de la Lanza (1,5 Metros / 150 cm)

La lanza agronómica de 1.500 mm está diseñada para resolver la fatiga postural del agricultor: permite muestrear una grilla predial caminando erguido y asistiendo la inserción en el suelo con el peso del cuerpo.

```text
 ┌─────────────────────────────────────────────────────────────────────────┐
 │               DIAGRAMA MECÁNICO DE LA LANZA TERRASENSE                  │
 └─────────────────────────────────────────────────────────────────────────┘

   ◄──────── 300 mm ────────►
  ┌──────────────────────────┐  ◄── EMPUÑADURA EN T (Impresión 3D PETG IP67)
  │ [O] USB-C  [B] Pulsador │      Alberga la PCB principal, 2x 18650, LEDs
  └────────────┬─────────────┘
               │  Prensaestopas de fijación estanca PG-16
               ▼
  ╔══════════════════════════╗  ◄── MÁSTIL TUBULAR (1.200 mm)
  ║                          ║      Aluminio 6061-T6 anodizado
  ║  Cable apantallado       ║      Ø Exterior: 30 mm | Espesor: 1.8 mm
  ║  4 hilos en el interior  ║      Protección mecánica total contra ramas
  ║                          ║
  ║                          ║
  ║                          ║
  ╚══════════════════════════╝
               │
               ▼  (a 1.200 mm desde la empuñadura)
       [═══ PEDAL DE PIE ═══]  ◄── ESTRIBO METÁLICO DESMONTABLE
               │                   Apoyo con la bota para penetrar suelos duros
               ▼
        /─────────────\        ◄── CABEZAL CÓNICO AMORTIGUADOR
       │  Sonda 7-en-1 │           Encapsulado en resina con tope de impacto
        \──┬──┬──┬──┬─/
           │  │  │  │          ◄── PUNTAS DE ACERO INOXIDABLE 316L (100 mm)
           ▼  ▼  ▼  ▼              Inserción directa en la zona radicular activa
```

### 5.1. Empuñadura Ergonómica Superior en T
* **Material:** Filamento PETG industrial de alta resistencia al impacto y rayos UV (118 g).
* **Post-procesado:** Tratamiento de sellado con resina epóxica en juntas y recubrimiento de poliuretano antideslizante.
* **Hermeticidad:** Sellado perimetral con junta de elastómero EPDM y prensaestopas IP68 que une la empuñadura al tubo central.
* **Componentes accesibles:**
  * Interruptor basculante de encendido general (*rocker switch*) con capuchón de silicona estanco.
  * Pulsador metálico de acero inoxidable con anillo LED RGB para inicio de medición y re-vinculación (*PAIR*).
  * Conector de carga USB-C embutido con tapón cautivo de goma para evitar ingreso de barro.

### 5.2. Mástil Tubular de Aluminio Estructural
* **Material:** Tubo de aleación de aluminio **6061-T6** con anodizado duro mate (protección anticorrosiva frente a abonos, fertilizantes y humedad).
* **Dimensiones:** Longitud 1.200 mm, diámetro exterior 30,0 mm, espesor de pared 1,8 mm.
* **Cableado interno:** Manguera flexible apantallada de 4 conductores (AWG 24) con aislamiento de silicona que conecta la PCB superior con la sonda inferior.

### 5.3. Estribo / Pedal de Pie Desmontable
* **Función:** Permite al operador apoyar el pie con la bota de trabajo y aplicar parte de su peso corporal (50 a 80 kg) para clavar las puntas en suelos arcillosos secos o compactados, **sin golpear la empuñadura ni forzar la electrónica**.
* **Fijación:** Abrazadera mecanizada de dos piezas sujeta con dos pernos de acero inoxidable Allen M6 que permiten ajustar su altura según la estatura del usuario.

### 5.4. Cabezal Edafológico 7-en-1 con Puntas 316L
* **Acople inferior:** Pieza mecanizada cónica que aloja el cuerpo de resina de la sonda industrial 7-en-1, disipando los esfuerzos de torsión y palanca mecánica para que no fracturen el vástago de resina epóxica.
* **Electrodos:** Varillas metálicas de acero inoxidable austenítico **grado 316L** (longitud 100 mm, diámetro 3 mm) resistentes a la corrosión por cloruros, ácidos y sales edáficas.

---

## 6. Protocolo Firmware y Trama BLE GATT

### 6.1. Ciclo de Adquisición Modbus RTU
1. **Wake-up:** El ESP32 despierta por pulsación en el botón frontal (`GPIO0`) o por temporizador.
2. **Power Gate ON:** `GPIO5` pasa a nivel alto $\rightarrow$ P-MOSFET satura $\rightarrow$ Sonda recibe 12V.
3. **Espera de estabilización:** Delay no bloqueante de **150 ms** para estabilización de los osciladores internos de la sonda.
4. **Envío de comando Modbus RTU (UART2 @ 9600 baud, 8N1):**
   ```text
   0x01 (Dirección) 0x03 (Función Read Holding) 0x00 0x00 (Reg Inicial) 0x00 0x07 (7 Registros) 0x04 0x08 (CRC16)
   ```
5. **Recepción y validación CRC16:** Se capturan los 19 bytes de respuesta de la sonda:
   `[0x01 | 0x03 | 0x0E | Data_H | Data_L ... | CRC_L | CRC_H]`.
6. **Power Gate OFF:** `GPIO5` pasa a nivel bajo $\rightarrow$ 12V se cortan inmediatamente.
7. **Lectura ambiental I2C:** Adquisición instantánea de temperatura y humedad ambiental del BME280.

### 6.2. Estructura Binaria de la Trama BLE (16 Bytes)
El firmware publica los datos empaquetados en una única característica GATT BLE mediante notificación, garantizando una transferencia de bajísima energía en menos de **25 ms**:

```text
 ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │13 │14 │15 │
 ├───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┴───┼───┼───┤
 │ TempS │ HumS  │  EC   │  pH   │   N   │   P   │   K   │TA │HA │
 └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───┴───┘
```

* **Bytes 0–1 (`TempS`):** Temperatura del suelo en décimas de grado Celsius (ej. `0x00E1` = 225 $\rightarrow$ 22,5 °C). Entero Modbus con signo (int16_t en big-endian).
* **Bytes 2–3 (`HumS`):** Humedad volumétrica del suelo en décimas de porcentaje (ej. `0x01C2` = 450 $\rightarrow$ 45,0 %).
* **Bytes 4–5 (`EC`):** Conductividad eléctrica en $\mu\text{S/cm}$ (ej. `0x02BC` = 700 $\mu\text{S/cm}$).
* **Bytes 6–7 (`pH`):** pH del suelo en centésimas (ej. `0x028A` = 650 $\rightarrow$ 6,50 pH).
* **Bytes 8–9 (`N`):** Nitrógeno disponible en mg/kg (PPM estimado por conductividad).
* **Bytes 10–11 (`P`):** Fósforo disponible en mg/kg (PPM estimado por conductividad).
* **Bytes 12–13 (`K`):** Potasio disponible en mg/kg (PPM estimado por conductividad).
* **Byte 14 (`TA`):** Temperatura ambiental entera en °C con offset de +50 (ej. valor 72 $\rightarrow$ $72 - 50 = 22^\circ\text{C}$).
* **Byte 15 (`HA`):** Humedad relativa ambiental entera (0 a 100 %).

---

*Para detalles de ensamble, diseño mecánico y compras de componentes, consultar el archivo [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx) y los esquemáticos [`terrasense.kicad_sch`](terrasense.kicad_sch).*
