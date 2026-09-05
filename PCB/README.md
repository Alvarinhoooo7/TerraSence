# 🔌 TerraSense · Hardware, Electrónica y Diseño del Instrumento Portátil Compacto

Documentación técnica del hardware embarcado, diseño en KiCad, arquitectura de potencia a 5 V, PCB combinada de carga y elevación por USB-C, batería de litio de 2.000 mAh y chasis portátil de mano (**Handheld Agro-Sensor**).

> ### 🛑 Estado de verificación — leer antes de usar este documento
> Corregido tras la [auditoría del 4 de septiembre de 2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md). **Este documento describe un diseño en curso, no un producto verificado. No fabricar a partir de los archivos actuales.**
>
> | Afirmación anterior | Estado real |
> |---|---|
> | «Ruteo físico de 2 capas» | **`terrasense.kicad_pcb` no contiene componentes, pistas ni contorno.** No hay placa ruteada. El archivo declara generador KiCad 10.0, no 8.0 |
> | «Factibilidad técnica comprobada» | `ERC.rpt` registra errores de conexión y alimentación **sin cierre limpio documentado** |
> | «BLE 5.0» | El ESP32-WROOM-32E especifica **Bluetooth 4.2 BR/EDR y BLE** |
> | «Consumo en reposo 0,0 µA» | Se refiere solo a la **rama de la sonda**. El reposo total del equipo **no se ha medido desde batería** |
> | «≥ 4.000 mediciones / > 18 meses» | El balance **omitía el consumo de la conexión BLE**. Ver §3.5 |
> | «IP67, peso < 280 g» | **Objetivos de diseño sin ensayo.** No hay actas, pesaje del conjunto ni validación mecánica |
> | «Sonda 7-en-1 opera a 5 V» | Solo puede afirmarse del **SKU y variante validados**, que aún no se han adquirido |
> | Sensor ambiental BME280 | **BME280 incluido y obligatorio:** temperatura del aire, humedad relativa y presión local para tres celdas del grid 3×3. La API gratuita complementa la lectura con el pronóstico de cinco días. Ver [contrato y estado de integración](../docs/INFORME%201%20.docx.md#integracion-bme280). |
> | Módulo TP4056 + Step-Up discreto | Sustituido por una **PCB combinada de carga/boost USB-C** ($900 confirmados por los socios) |
>
> El BOM vigente y provisional está en [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx), generado desde [`finanzas/supuestos.json`](../finanzas/supuestos.json). Las secciones que siguen se conservan como **memoria de diseño**; donde contradigan esta tabla, manda esta tabla.

---

## 📑 Tabla de Contenidos

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
  - [5.2. Montaje Directo de Electrodos Inox 316L](#52-montaje-directo-de-electrodos-inox-316l)
  - [5.3. Interfaz de Usuario y Puerto USB-C](#53-interfaz-de-usuario-y-puerto-usb-c)
- [6. Protocolo Firmware y Trama BLE GATT](#6-protocolo-firmware-y-trama-ble-gatt)
  - [6.1. Ciclo de Adquisición Modbus RTU](#61-ciclo-de-adquisición-modbus-rtu)
  - [6.2. Estructura binaria de la trama BLE (16 bytes)](#62-estructura-binaria-de-la-trama-ble-16-bytes)

---

## 1. Especificaciones Generales de Hardware

| Parámetro | Valor de Diseño | Justificación Técnica |
| :--- | :--- | :--- |
| **MCU Principal** | ESP32-WROOM-32 en placa de desarrollo | Doble núcleo 240 MHz. [Ficha Espressif](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html): **Bluetooth 4.2 BR/EDR y BLE**, no 5.0. La certificación del módulo **no acredita** el cumplimiento del equipo terminado |
| **Sonda de Suelo** | Sonda industrial 7-en-1 RS-485 Modbus RTU | Rango de alimentación **DC 4.5V–30V**, electrodos acero inox 316L |
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
* **Conectividad:** Bluetooth Low Energy. La ficha del ESP32-WROOM-32E especifica **Bluetooth 4.2 BR/EDR y BLE**, no BLE 5.0.
* **Periféricos Usados:**
  * `UART2`: Pines GPIO16 (RX) y GPIO17 (TX) para el bus RS-485.
  * `I2C`: Pines GPIO21 (SDA) y GPIO22 (SCL) para el sensor ambiental BME280.
  * `GPIO4`: Control de dirección `DE`/`RE` del transceptor RS-485.
  * `GPIO5`: Control de compuerta (*Power Gate*) para habilitar los 5V hacia la sonda.
  * `GPIO34 (ADC1_CH6)`: Divisor de voltaje resistivo (100k / 100k) para monitoreo del voltaje de batería.
  * `GPIO0`: Pulsador ergonómico de gatillo/pulgar para disparo de medición rápida.
  * `GPIO2 / GPIO15`: Micro-LEDs de estado (Azul: BLE / Verde: Lectura Exitosa).

### 2.2. Sensor ambiental BME280 — lectura local obligatoria

> **BME280 incluido y obligatorio:** temperatura del aire, humedad relativa y presión local para tres celdas del grid 3×3. La API gratuita complementa la lectura con el pronóstico de cinco días. Ver [contrato y estado de integración](../docs/INFORME%201%20.docx.md#integracion-bme280).
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

El proyecto incluye el diseño completo en **KiCad 8.0** ubicado en la raíz de esta carpeta:
* [`terrasense.kicad_pro`](terrasense.kicad_pro): Proyecto maestro.
* [`terrasense.kicad_sch`](terrasense.kicad_sch): Esquemático jerárquico.
* [`terrasense.kicad_pcb`](terrasense.kicad_pcb): ⚠️ **Vacío.** Contiene únicamente la cabecera y el cierre del formato: **sin componentes, pistas ni contorno de placa**. La cabecera declara generador **KiCad 10.0**, no 8.0. **No enviar a fabricación.**
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
> ⚠️ **Esta tabla es memoria de diseño de una arquitectura SMD discreta y NO es el BOM vigente.** El BOM que alimenta el modelo económico está en [`BOM_TerraSense.xlsx`](BOM_TerraSense.xlsx) y parte de una **placa de desarrollo ESP32** más una **PCB combinada de carga/boost**, con BME280, sin TP4056 ni MT3608 discretos. Los precios de abajo **no están cotizados con SKU, moneda ni vigencia**.

| **U1** | ESP32-WROOM-32E-N4 | SMD Module | MCU (BLE 4.2, no 5.0) / Procesamiento | $2.450 CLP |
| **U2** | Módulo Bosch BME280 | Breakout I²C | **Incluido en BOM vigente** | $3.500 final ($2.941,18 neto) |
| **U3** | SP3485EN-L/TR | SOIC-8 | Transceptor RS-485 a 3.3V | $480 CLP |
| **MOD1**| ~~Módulo TP4056 + Step-Up 5V~~ | Módulo | Sustituido por **PCB combinada carga/boost USB-C** | $900 CLP |
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
                               │  Junta de sellado estanca con prensa estopa
                               ▼
                        /─────────────\      ◄── BASE PORTASONDA ROBUSTA
                       │  Cuerpo Sonda │          Epoxi industrial antichoque
                        \──┬──┬──┬──┬─/
                           │  │  │  │        ◄── PUNTAS DE ACERO INOX 316L (70 mm)
                           ▼  ▼  ▼  ▼            Inserción directa manual en el suelo
```

### 5.1. Chasis compacto ergonómico — objetivo IP67, sin ensayo
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
6. **Power Gate OFF:** `GPIO5` pasa a nivel bajo $\rightarrow$ la línea de 5 V se corta inmediatamente. El consumo residual **no está medido**.
7. **Lectura ambiental I²C del BME280:** adquirir temperatura del aire, humedad relativa y presión junto con el suelo. Implementación y transporte BLE detallados en [integración](../docs/INFORME%201%20.docx.md#integracion-bme280).

### 6.2. Estructura binaria de la trama BLE (16 bytes)

> ### 🛑 Contrato corregido
> Las versiones anteriores de este README y del README de la App describían **tres contratos incompatibles**: distinto orden de campos, pH en centésimas frente a décimas, y batería como `uint16` de milivoltios frente a un solo byte de porcentaje.
>
> **El contrato válido es el que decodifica `App/src/services/probeService.ts`.** El firmware debe emitir exactamente esto. La trama de 16 bytes actual solo contiene suelo y batería. El BME280 está incluido en el diseño y la BOM; requiere extender/versionar el contrato o agregar una característica para las tres variables ambientales. No reusar dos bytes para tres magnitudes. Ver [integración](../docs/INFORME%201%20.docx.md#integracion-bme280).

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
| 15 | Reservado | — | — |

**Estado:** no hay firmware fuente en el repositorio y el mapa de registros de la sonda **no está confirmado contra la ficha del proveedor**. Antes de fabricar hace falta una **captura BLE/Modbus real del SKU adquirido** y la ficha técnica del vendedor.
