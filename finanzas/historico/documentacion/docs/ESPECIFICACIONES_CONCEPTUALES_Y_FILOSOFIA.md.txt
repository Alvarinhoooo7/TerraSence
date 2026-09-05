# 🌿 Especificaciones Técnicas Conceptuales y Filosofía del Proyecto TerraSense

> **Proyecto:** TerraSense — Tu Ingeniero Agrónomo en el Bolsillo  
> **Área:** Arquitectura de Sistemas IoT, Diseño Conceptual e Ingeniería de Software/Hardware  
> **Institución:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP  

---

## 📑 Tabla de Contenidos

1. [Filosofía y Manifiesto de Diseño de TerraSense](#1-filosofía-y-manifiesto-de-diseño-de-terrasense)
   - [1.1. Principio 1: "No Vendemos Datos, Vendemos Decisiones"](#11-principio-1-no-vendemos-datos-vendemos-decisiones)
   - [1.2. Principio 2: "El Smartphone es el Datalogger Universal"](#12-principio-2-el-smartphone-es-el-datalogger-universal)
   - [1.3. Principio 3: "Diseño para el Campo Real (Rugged & No-Fragile)"](#13-principio-3-diseño-para-el-campo-real-rugged--no-fragile)
   - [1.4. Principio 4: "Soberanía Tecnológica y Cero Suscripciones Cautivas"](#14-principio-4-soberanía-tecnológica-y-cero-suscripciones-cautivas)
2. [Especificaciones Conceptuales de Hardware y Electrónica](#2-especificaciones-conceptuales-de-hardware-y-electrónica)
   - [2.1. Subsistema de Control y Procesamiento Embebido (ESP32)](#21-subsistema-de-control-y-procesamiento-embebido-esp32)
   - [2.2. Subsistema de Sensado Dual (Suelo 7-en-1 + Ambiente I2C)](#22-subsistema-de-sensado-dual-suelo-7-en-1--ambiente-i2c)
   - [2.3. Subsistema de Potencia y Eficiencia Energética (Power Gating)](#23-subsistema-de-potencia-y-eficiencia-energética-power-gating)
   - [2.4. Subsistema Mecánico y Envolvente Industrial IP67](#24-subsistema-mecánico-y-envolvente-industrial-ip67)
3. [Especificaciones Conceptuales de Firmware y Comunicaciones](#3-especificaciones-conceptuales-de-firmware-y-comunicaciones)
   - [3.1. Arquitectura de Tareas FreeRTOS](#31-arquitectura-de-tareas-freertos)
   - [3.2. Capa de Enlace Industrial RS-485 Modbus RTU](#32-capa-de-enlace-industrial-rs-485-modbus-rtu)
   - [3.3. Perfil de Comunicación Bluetooth Low Energy (GATT)](#33-perfil-de-comunicación-bluetooth-low-energy-gatt)
4. [Especificaciones Conceptuales del Ecosistema de Software](#4-especificaciones-conceptuales-del-ecosistema-de-software)
   - [4.1. Aplicación Móvil Offline-First (React Native / TypeScript)](#41-aplicación-móvil-offline-first-react-native--typescript)
   - [4.2. Motor Agronómico de Inferencia Biofísica (4 Capas)](#42-motor-agronómico-de-inferencia-biofísica-4-capas)
   - [4.3. Infraestructura Cloud y Consola Web GIS (Supabase + PostGIS)](#43-infraestructura-cloud-y-consola-web-gis-supabase--postgis)
5. [Resumen de Requerimientos No Funcionales (RNF)](#5-resumen-de-requerimientos-no-funcionales-rnf)

---

## 1. Filosofía y Manifiesto de Diseño de TerraSense

TerraSense nace como una respuesta de ingeniería crítica frente al modelo extractivo y elitista de la tecnología agrícola tradicional.

```text
               EL MANIFIESTO DE INGENIERÍA TERRASENSE
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. 🧠 DE LA TELEMETRÍA A LA ACCIÓN: Los números solos no salvan cosechas.   │
│    El valor reside en traducir la física del suelo en órdenes de siembra.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. 📱 APROVECHAR LO EXISTENTE: No le cobres al campesino $1.500 USD por una │
│    pantalla LCD y un módem celular si ya lleva una supercomputadora en el   │
│    bolsillo (su smartphone).                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. 🛡️ SIN PIEZAS FRÁGILES: El campo es barro, polvo, piedras y calor.       │
│    Cero electrodos de vidrio en terreno abierto; solo acero inoxidable.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. 🔓 LIBERTAD DEL AGRICULTOR: El dato pertenece a quien trabaja la tierra. │
│    Cero licencias cautivas, cero suscripciones obligatorias.                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Principio 1: "No Vendemos Datos, Vendemos Decisiones"
Mostrarle a un agricultor `pH 5.2` y `Conductividad 2.4 mS/cm` es una falla de ingeniería de producto si no se le explica que a ese pH el fósforo está bloqueado químicamente y que sembrar tomates provocará la pérdida del 100% de la inversión. TerraSense entrega el veredicto en **lenguaje natural, semáforo visual de tres colores y dosis cuantificadas de enmienda en kg/ha**.

### 1.2. Principio 2: "El Smartphone es el Datalogger Universal"
Los equipos tradicionales de investigación (Spectrum Technologies, Meter Group) cobran entre $1.500 y $2.500 USD porque incorporan dataloggers voluminosos, pantallas monocromáticas protegidas contra sol y módems celulares propietarios con cuotas anuales de $300 USD. TerraSense externaliza la interfaz humana, el GPS de precisión y el módem de comunicaciones hacia el teléfono inteligente del usuario mediante BLE 5.0, reduciendo el costo del hardware físico a solo **$70.656 CLP** (BOM industrializado).

### 1.3. Principio 3: "Diseño para el Campo Real (Rugged & No-Fragile)"
La ergonomía de campo exige operabilidad con una sola mano, manipulación con guantes de cuero y resistencia a caídas sobre gravilla y barro. Se eliminaron pantallas LCD del mango del dispositivo (propensas a fracturarse en caídas o volverse ilegibles bajo el sol de mediodía de 100.000 lux) y se sustituyeron por **tres LEDs SMD ultrabrillantes discretos (0805) montados directamente en la PCB** —azul, verde y rojo, cada uno con su propio GPIO y resistencia limitadora— y una empuñadura ergonómica de ABS de alta densidad sellada con grado **IP67**. Se descartan expresamente las tiras y los LEDs direccionables: su controlador interno drena entre 0,7 y 1 mA de forma permanente aun con el LED apagado, lo que resultaría incompatible con el presupuesto de corriente de reposo del equipo.

### 1.4. Principio 4: "Soberanía Tecnológica y Cero Suscripciones Cautivas"
El agricultor es dueño irrevocable de su equipo físico y de su información geoespacial. Las aplicaciones operan en modo local permanente con sincronización voluntaria a Supabase y exportación libre en formatos abiertos (GeoJSON, CSV, PDF).

---

## 2. Especificaciones Conceptuales de Hardware y Electrónica

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DE HARDWARE TERRASENSE                      │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      SISTEMA DE ALIMENTACIÓN                        │   │
│   │  Batería LiPo Convencional (3.7V / 2.000 mAh)                       │   │
│   │  Módulo Combo TP4056 + Step-Up 5V (BMS + Carga USB-C @ 1A)          │   │
│   │  Interruptor Físico de Aislamiento Total                            │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │ Bus 5.0V Regulado                    │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                 ETAPA DE CONTROL DE POTENCIA                        │   │
│   │  P-MOSFET Power Gating (GPIO 5 ESP32) ──► Corte a 0.0 µA en reposo  │   │
│   │  Línea de 5.0V Conmutada directa a Sonda (Rango DC 4.5V–30V)        │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │ Línea 5V DC Conmutada                │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                 SISTEMA DE SENSADO DUAL                             │   │
│   │  1. Sonda Suelo 7-en-1 (Inox 316L): VWC, Temp, EC, pH, N, P, K      │   │
│   │     Transceptor RS-485 SP3485 (Half-Duplex @ 9.600 bps)             │   │
│   │  2. Sensor Ambiental I2C Bosch BME280: T° Aire, HR %, Presión Bar.  │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │ UART2 (GPIO 16/17) + I2C (GPIO 21/22)│
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                 MICROCONTROLADOR PRINCIPAL                          │   │
│   │  ESP32-WROOM-32 (Xtensa Dual-Core 32-bit @ 160/240 MHz)             │   │
│   │  Radio BLE 5.0 (Potencia TX: +9 dBm, Antena PCB Integrada)          │   │
│   │  Memoria Flash 4 MB (Partición NVS para Bonding y Calibración)      │   │
│   │  Micro-LEDs SMD + Pulsador Táctil de Muestreo (GPIO 0)              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Subsistema de Control y Procesamiento Embebido (ESP32)
* **Microcontrolador:** Espressif ESP32-WROOM-32 (2 núcleos Xtensa LX6 @ 240 MHz).
* **Conectividad:** Bluetooth Low Energy 5.0 (BLE) y WiFi 802.11 b/g/n para actualizaciones OTA.
* **Memoria No Volátil (NVS):** Almacenamiento seguro de tablas de calibración de offset ($\text{pH}_{\text{offset}}, \text{EC}_{\text{gain}}$) y claves criptográficas de enlace BLE.

### 2.2. Subsistema de Sensado Dual (Suelo 7-en-1 + Ambiente I2C)
* **Sonda Edafológica 7-en-1:**
  * Electrodo: Varillas de acero inoxidable quirúrgico 316L (resistente a cloruros y ácidos).
  * Comunicación: Interfaz diferencial industrial RS-485 bajo protocolo Modbus RTU.
  * Tensión de Operación: **5,0V DC** (rango admisible de sonda 4.5V–30V).
  * Variables Sensadas: Humedad Volumétrica (VWC %), Temperatura del Suelo (°C), Conductividad Eléctrica (EC en $\mu\text{S/cm}$), pH del Suelo, Nitrógeno (N en $\text{mg/kg}$), Fósforo (P en $\text{mg/kg}$) y Potasio (K en $\text{mg/kg}$).
* **Sensor Agroclimático I2C (Bosch BME280):**
  * Montado en cámara de ventilación con membrana hidrofóbica ePTFE.
  * Variables Sensadas: Temperatura del Aire (°C), Humedad Relativa Ambiental (% HR) y Presión Barométrica (hPa) para el cálculo dinámico del Déficit de Presión de Vapor (VPD).

### 2.3. Subsistema de Potencia y Eficiencia Energética (Power Gating)
* **Batería:** Batería convencional de polímero de litio (LiPo) de celda única ($3.7\text{V nominal} / 2.000\text{ mAh} / 7.4\text{ Wh}$).
* **Módulo de Carga y Elevación:** Módulo integrado TP4056 + Step-Up con perfil de carga CC/CV a $1.0\text{ A}$ vía USB-C y circuito BMS de protección.
* **Power Gating:** Transistor P-MOSFET controlado por el ESP32 (`GPIO5`) que desenergiza por completo la sonda 7-en-1 y el transceptor RS-485 en estado de reposo, logrando un consumo residual de **$0.0\,\mu\text{A}$** en la etapa de sensado.

### 2.4. Subsistema Mecánico y Envolvente Industrial IP67
* **Carcasa:** Gabinete ergonómico compacto de mano en PETG técnico con sello de silicona perimetral (peso total < 280 g).
* **Inserción Directa:** Electrodos de acero 316L montados directamente en la base portasonda para inserción manual en terreno.
* **Grado de Protección:** Certificación de estanqueidad **IP67 según IEC 60529** (inmersión temporal en agua a 1 metro de profundidad durante 30 minutos y hermeticidad total frente al polvo de campo).

---

## 3. Especificaciones Conceptuales de Firmware y Comunicaciones

### 3.1. Arquitectura de Tareas FreeRTOS
El firmware se estructura en tres tareas concurrentes con prioridades estrictas:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ARQUITECTURA DE FIRMWARE FREERTOS                      │
│                                                                             │
│  ┌─────────────────────────────────┐   Prioridad 3 (Tiempo Real)            │
│  │ Task_Sensors_Modbus (Núcleo 1)  │ ◄─ Dispara Power Gate 12V              │
│  │ - Adquisición UART2 @ 115.200b  │ ◄─ 10 Muestras + Filtro Mediana Móvil  │
│  │ - Lectura I2C BME280            │ ◄─ Apaga Power Gate tras 7 segundos    │
│  └────────────────┬────────────────┘                                        │
│                   │ Envía Struct Datos (16 Bytes) vía Cola FreeRTOS         │
│                   ▼                                                         │
│  ┌─────────────────────────────────┐   Prioridad 2                          │
│  │ Task_BLE_GATT (Núcleo 0)        │ ◄─ Manejo de Conexión BLE              │
│  │ - Notificación de Telemetría    │ ◄─ Recepción de Comandos de Control    │
│  │ - Persistencia NVS de Bonding   │ ◄─ Heartbeat de Batería y RSSI         │
│  └─────────────────────────────────┘                                        │
│                                                                             │
│  ┌─────────────────────────────────┐   Prioridad 1 (Baja)                   │
│  │ Task_UI_System (Núcleo 1)       │ ◄─ Patrones de 3 LEDs SMD discretos    │
│  │ - Debounce de Pulsador Pair     │ ◄─ ADC Batería y Modo Sleep            │
│  └─────────────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Capa de Enlace Industrial RS-485 Modbus RTU
* **Baudrate:** $115.200\text{ bps}$, 8 bits de datos, sin paridad, 1 bit de parada (8-N-1).
* **Control de Dirección:** Pin GPIO 18 conectado a las líneas combinadas $\text{DE}/\overline{\text{RE}}$ del transceptor MAX485 para conmutación ultra-rápida entre transmisión y recepción ($< 2\,\mu\text{s}$).

### 3.3. Perfil de Comunicación Bluetooth Low Energy (GATT)
* **GATT Primary Service:** UUID `00000001-5e4e-4c69-6d61-746572726101`
* **Characteristics:**
  * `00000002-...` **(Telemetry Data):** Notificación de 16 bytes empaquetados en Little-Endian con los 9 parámetros físicos + voltaje de batería.
  * `00000003-...` **(Device Control & Calib):** Escritura de offsets de calibración y reinicio.
  * `00000004-...` **(Device Info & Battery):** Nivel de carga (0-100%) y versión de firmware.

---

## 4. Especificaciones Conceptuales del Ecosistema de Software

### 4.1. Aplicación Móvil Offline-First (React Native / TypeScript)
* **Framework:** React Native con Expo Managed Workflow y tipado estricto en TypeScript.
* **Persistencia Local:** SQLite / WatermelonDB con sincronización bidireccional asíncrona (*Store & Forward*).
* **Geolocalización:** Módulo `expo-location` con proveedor GPS de alta precisión submétrica ($\pm 1.5\text{ m}$).

### 4.2. Motor Agronómico de Inferencia Biofísica (4 Capas)
* **Capa 1:** Matriz de requerimientos biofísicos de **+80 cultivos comerciales** (pH óptimo, tolerancia a salinidad EC, temperatura base de suelo $T_b$, requerimientos NPK y susceptibilidad a encharcamiento).
* **Capa 2:** Diagnóstico de bloqueos iónicos físico-químicos (ej. insolubilización de Fósforo por acidez $\text{pH} < 5.5$).
* **Capa 3:** Algoritmo cuantitativo de enmiendas (kg/ha de Cal Agrícola, Yeso o Fertilizante soluble + cálculo de costo económico estimado).
* **Capa 4:** Integración climática predictiva a 7 días vía API Open-Meteo para emitir alertas de heladas, golpes de calor y ventanas de siembra seguras.

### 4.3. Infraestructura Cloud y Consola Web GIS (Supabase + PostGIS)
* **Base de Datos:** PostgreSQL 15 con extensión espacial **PostGIS 3.3**.
* **Modelado Geoespacial:** Tablas espaciales con geometría de tipo `GEOMETRY(Point, 4326)` e índices espaciales R-Tree `GIST` para consultas prediales en menos de $15\text{ ms}$.
* **Interpolación Espacial:** Generación de mapas de calor continuo mediante algoritmos de **IDW (Inverse Distance Weighting)** y **Kriging ordinario**.

---

## 5. Resumen de Requerimientos No Funcionales (RNF)

| Identificador | Categoría | Requerimiento No Funcional (RNF) | Criterio de Aceptación |
| :--- | :--- | :--- | :--- |
| **RNF-01** | **Rendimiento** | Latencia de Veredicto Agronómico | El diagnóstico completo debe procesarse y renderizarse en $\le 5.0\text{ s}$. |
| **RNF-02** | **Energía** | Autonomía de Batería en Campo | $\ge 1.500\text{ mediciones activas}$ por carga ($> 6\text{ meses}$ a 8 med/día). |
| **RNF-03** | **Disponibilidad** | Operabilidad Desconectada (Offline) | El 100% de las funciones de sensado y diagnóstico operan sin conexión 4G. |
| **RNF-04** | **Hermeticidad** | Grado de Protección Mecánica | Cumplimiento de norma **IP67** (inmersión $1\text{ m}$ por $30\text{ min}$, sellado de polvo). |
| **RNF-05** | **Metrología** | Precisión Operativa de Sensores | pH $\pm 0.1$, EC $\pm 3\%$, VWC $\pm 2\%$, Temperatura $\pm 0.3^\circ\text{C}$. |
| **RNF-06** | **Accesibilidad** | Estándar Visual y Ergonómico | Contraste de interfaz compatible con **WCAG 2.1 Nivel AA** bajo sol directo. |
| **RNF-07** | **Seguridad** | Privacidad de Datos y Conexión | Enlace BLE cifrado y aislamiento estricto de predios mediante **Row Level Security (RLS)**. |

---

*Documento conceptual elaborado para el proyecto TerraSense — INACAP 2026.*
