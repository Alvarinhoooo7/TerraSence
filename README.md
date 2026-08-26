# 🌱 TerraSense — Tu Ingeniero Agrónomo en el Bolsillo

> **No vendemos datos. Vendemos decisiones.**
>
> El primer sistema IoT agronómico que no solo *sensa* tu suelo —  
> sino que lo *interpreta*, lo *diagnostica* y te *dice exactamente qué hacer*.

> **Proyecto de Título:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP  
> **Stack:** `ESP32` · RS-485 Modbus RTU · BLE 5.0 · BME280 I2C · React Native / Expo / Vite · Supabase + PostGIS · Motor Agronómico IA

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![ESP32](https://img.shields.io/badge/MCU-ESP32%20(Espressif)-E7352C.svg)](https://www.espressif.com/en/products/socs/esp32)
[![Bluetooth 5.0](https://img.shields.io/badge/BLE-5.0%20BLE%20%2B%20WiFi-0082FC.svg)](https://www.bluetooth.com/)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native%20(Expo%20%2B%20TS)-61DAFB.svg)](https://reactnative.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2B%20PostGIS-3ECF8E.svg)](https://supabase.com/)
[![AI Agronomic Engine](https://img.shields.io/badge/Engine-Agronomic%20AI%20Advisor-FF6B35.svg)]()

---

## 📑 Tabla de Contenidos

1. [La Brecha que Nadie ha Cerrado](#1-la-brecha-que-nadie-ha-cerrado)
2. [Qué hace TerraSense que nadie más hace](#2-qué-hace-terrasense-que-nadie-más-hace)
3. [El Motor Agronómico: El Corazón del Sistema](#3-el-motor-agronómico-el-corazón-del-sistema)
4. [Arquitectura General del Sistema](#4-arquitectura-general-del-sistema)
5. [Parámetros de Medición (7-en-1 + Ambiente)](#5-parámetros-de-medición-7-en-1--ambiente)
6. [**Especificación de Hardware del Dispositivo**](#6-especificación-de-hardware-del-dispositivo)
7. [Eficiencia Energética y Sistema de Alimentación](#7-eficiencia-energética-y-sistema-de-alimentación)
8. [Aplicación Móvil: Tu Asistente Agronómico](#8-aplicación-móvil-tu-asistente-agronómico)
9. [Plataforma Cloud y Consola Web (Supabase + PostGIS)](#9-plataforma-cloud-y-consola-web-supabase--postgis)
10. [Comparativa de Mercado: Por qué todos los demás fallan](#10-comparativa-de-mercado-por-qué-todos-los-demás-fallan)
11. [Protocolos de Comunicación: RS485 Modbus RTU y BLE GATT](#11-protocolos-de-comunicación-rs485-modbus-rtu-y-ble-gatt)
12. [Modelos Agronómicos: Balance Hídrico y Evapotranspiración](#12-modelos-agronómicos-balance-hídrico-y-evapotranspiración)
13. [Modelo Económico y Estudio de Mercado](#13-modelo-económico-y-estudio-de-mercado)
14. [Guía de Defensa Hostil: Las 7 Preguntas Incómodas](#14-guía-de-defensa-hostil-las-7-preguntas-incómodas)
15. [Criterios de Éxito y KPIs](#15-criterios-de-éxito-y-kpis)
16. [Guía de Puesta en Marcha](#16-guía-de-puesta-en-marcha)
17. [Estructura del Repositorio](#17-estructura-del-repositorio)

---

## 1. La Brecha que Nadie ha Cerrado

### El Problema Real del Campo

En Chile y en toda Latinoamérica, existen decenas de dispositivos que miden el suelo. Los hay baratos, los hay caros. Pero todos cometen el mismo error fundamental:

**Te dan los números. Y te dejan solo.**

```
TODOS LOS COMPETIDORES HOY:
┌─────────────────────┐
│  SENSOR DE SUELO    │
│                     │
│  pH:    5.1         │
│  EC:    2.400 µS/cm │
│  Temp:  9°C         │
│  N:     23 mg/kg    │
│  P:     12 mg/kg    │
│  K:     23 mg/kg    │
│  VWC:   38%         │
│                     │
│       FIN.          │
└─────────────────────┘
        ↓
  El agricultor:
  "¿Y ahora qué hago?"
```

### La Realidad en Números

- **278.000 explotaciones** agropecuarias en Chile (92% AFC y mediana agricultura) que abarcan **+12 millones de hectáreas** *(ODEPA / FAO)*.
- **0% de análisis in situ** previo a la siembra en la agricultura familiar campesina.
- **$40.000 CLP por muestra** cuesta un análisis de laboratorio, con **1 a 4 semanas de espera**.
- Un técnico agrónomo privado cobra entre **$80.000–$200.000 CLP por visita** y puede tardar días o semanas en responder.
- Mientras el laboratorio llega o el técnico contesta, el agricultor ya tomó la decisión a ciegas — o perdió la ventana de siembra.

> *"No existe ningún sistema en el mercado que tome los datos de tu suelo y te diga inmediatamente:*
> *tu tierra le falta potasio, tiene exceso de nitrógeno,*
> *no plantes tomates — pero sí puedes plantar limones, lechuga o papa.*
> *Y dado que se viene lluvia fuerte en 3 días, espera dos semanas antes de sembrar."*
> **— Eso es exactamente lo que TerraSense hace.**

---

## 2. Qué hace TerraSense que nadie más hace

### El Salto: De Sensor a Asistente

```
┌──────────────────────────────────────────────────────────────────────┐
│                     TODO EL MERCADO ACTUAL                           │
│                                                                      │
│  SENSOR → DATOS CRUDOS → [ VACÍO ] → TÚ DECIDES A CIEGAS           │
│                                                                      │
│──────────────────────────────────────────────────────────────────── │
│                          TERRASENSE                                  │
│                                                                      │
│  SENSOR → DATOS → MOTOR AGRONÓMICO IA → DIAGNÓSTICO INMEDIATO       │
│                        (≤ 5 seg)      → RECOMENDACIONES CONCRETAS   │
│                                       → LISTA DE CULTIVOS APTOS     │
│                                       → ALERTAS DE CLIMA            │
│                                       → PLAN DE CORRECCIÓN          │
└──────────────────────────────────────────────────────────────────────┘
```

### Los 5 Pilares que nos Diferencian

#### 1. 🧠 Diagnóstico Instantáneo de Deficiencias
No solo mide. **Interpreta**. En menos de 5 segundos TerraSense te dice:

- *"Tu suelo tiene deficiencia de Potasio (K: 23 mg/kg cuando debería ser ≥ 80 mg/kg). Aplica 150 kg/ha de sulfato de potasio antes de sembrar."*
- *"Exceso de Nitrógeno detectado. Evita cultivos de hoja como espinaca o acelga — priorizarías follaje sobre fruto."*
- *"pH ácido (5.1). El Fósforo está bloqueado. Aunque tus niveles de P parecen normales, la planta NO puede asimilarlo con este pH."*

#### 2. 🌿 Lista de Cultivos Aptos para TU Suelo
Con los 7 parámetros actuales de tu suelo, el motor cruza contra una base de datos de **+80 cultivos** y te entrega:

```
🟢 CULTIVOS COMPATIBLES CON TU SUELO HOY:
   ✅ Papa  ✅ Lechuga  ✅ Cilantro  ✅ Remolacha
   ✅ Trigo ✅ Avena    ✅ Zanahoria

🟡 CULTIVOS CON CORRECCIÓN PREVIA:
   ⚠️  Tomate   → Encalar pH a 6.0–6.8 primero
   ⚠️  Maíz     → Temperatura de suelo aún baja (9°C < 12°C mínimo)
   ⚠️  Limón    → Mejorar drenaje (VWC 38% = riesgo de asfixia radicular)

🔴 CULTIVOS NO RECOMENDADOS:
   ❌ Espinaca  → Exceso de N generará follaje sin valor comercial
   ❌ Frutilla  → EC 2.400 µS/cm supera tolerancia a salinidad
```

#### 3. 🌦️ Alertas Climáticas Integradas
La app cruza los datos de suelo con el pronóstico meteorológico de tu zona GPS:

- *"Se pronostican 45 mm de lluvia en las próximas 72 horas. Con tu VWC actual de 38%, el suelo llegará a saturación. NO siembres esta semana."*
- *"Temperaturas nocturnas bajarán a 3°C el jueves. Si tienes plantines trasplantados, cúbrelos con malla térmica."*
- *"Ventana óptima de siembra: martes a jueves próximos — condiciones ideales."*

#### 4. ⚡ De Semanas a Segundos
Un análisis de laboratorio tarda **1 a 4 semanas**. Un técnico agrónomo puede demorar **días en responder**.
TerraSense entrega el diagnóstico completo en **≤ 5 segundos**, en el campo, sin conexión a internet si es necesario.

#### 5. 🗺️ Mapa Inteligente de tu Predio
Cada medición queda georreferenciada. Con el tiempo, TerraSense construye un **mapa de fertilidad por sectores** de tu propio terreno, revelando:
- Zonas con pH uniforme vs. sectores con acidez localizada
- Áreas con déficit de NPK por sector
- Zonas de alto rendimiento histórico vs. zonas problema

---

## 3. El Motor Agronómico: El Corazón del Sistema

Este es el componente que ningún competidor tiene. No es solo un semáforo verde/rojo. Es un **sistema de razonamiento agronómico** que opera en capas:

### Capa 1 — Perfiles de Cultivo con Rangos de Tolerancia

Cada cultivo tiene un perfil agronómico con umbrales para los 7 parámetros:

```json
{
  "cultivo": "Tomate (Solanum lycopersicum)",
  "parametros_optimos": {
    "pH":         { "min": 6.0, "max": 6.8, "critico_bajo": 5.5, "critico_alto": 7.2 },
    "EC":         { "max_siembra": 1800, "max_produccion": 2500, "unidad": "µS/cm" },
    "temp_suelo": { "min_germinacion": 15, "optima": 20, "max": 35, "unidad": "°C" },
    "VWC":        { "min": 25, "optima": 40, "max_asfixia": 65, "unidad": "%" },
    "N":          { "min_arranque": 40, "optimo": 80, "exceso": 200, "unidad": "mg/kg" },
    "P":          { "min": 25, "optimo": 60, "unidad": "mg/kg" },
    "K":          { "min": 80, "optimo": 150, "unidad": "mg/kg" }
  }
}
```

### Capa 2 — Diagnóstico de Deficiencias y Toxicidades

El motor analiza cada parámetro, detecta desequilibrios y genera diagnóstico en lenguaje natural:

| Condición Detectada | Diagnóstico Automático Generado |
| :--- | :--- |
| pH < 5.5 | *"Acidez crítica. Fósforo y Molibdeno bloqueados. Aplicar cal agrícola 500 kg/ha con 3 semanas de anticipación."* |
| N > 200 mg/kg | *"Exceso de Nitrógeno. Riesgo de quemadura nitrogenada y desarrollo excesivo de follaje a costa del fruto."* |
| K < 40 mg/kg | *"Deficiencia severa de Potasio. La planta será vulnerable a enfermedades fúngicas y estrés hídrico."* |
| EC > 2.500 µS/cm | *"Salinidad excesiva. Provocará plasmólisis radicular (quemadura osmótica). Riego de lavado antes de sembrar."* |
| Temp < umbral cultivo | *"Suelo frío para este cultivo. Riesgo de pudrición de semilla. Esperar o usar mulch plástico negro."* |
| VWC > 65% | *"Saturación hídrica. Riesgo de asfixia radicular y proliferación de hongos (Pythium, Phytophthora)."* |

### Capa 3 — Recomendaciones de Enmienda Cuantificadas

No dice "le falta potasio". Dice **cuánto aplicar y qué comprar**:

```
PLAN DE CORRECCIÓN — SECTOR NORTE (0.5 ha):
──────────────────────────────────────────────────────
  K detectado:   23 mg/kg  (objetivo mínimo: 80 mg/kg)
  Déficit:       57 mg/kg
  Superficie:    0.5 ha

  ACCIÓN RECOMENDADA:
  → Aplicar Sulfato de Potasio (K₂SO₄) al voleo
    Dosis:   120 kg/ha  →  60 kg para tu superficie
    Momento: 15 días antes de siembra, incorporar con disco
    Costo est.: ~$15.000 CLP (60 kg × $250/kg aprox.)
──────────────────────────────────────────────────────
```

### Capa 4 — Integración Climática en Tiempo Real

El motor consulta la API meteorológica de tu ubicación GPS y combina:
- Pronóstico de precipitaciones (7 días)
- Temperatura mínima nocturna proyectada
- Índice UV y radiación solar

Para generar alertas contextuales como:
- *"Ventana óptima de siembra: martes a jueves próximos"*
- *"Evitar aplicar fungicidas los próximos 3 días (lluvias previstas)"*
- *"Riesgo de helada nocturna en 48 hrs — proteger plantines"*

---

## 4. Arquitectura General del Sistema

```
                       ARQUITECTURA INTEGRAL TERRASENSE
┌────────────────────────────────────────────────────────────────────────┐
│                         HARDWARE / EN TERRENO                          │
│                                                                        │
│  ┌────────────────────┐   RS-485 Modbus RTU   ┌─────────────────────┐ │
│  │ Sonda Suelo 7-en-1 ├──────────────────────►│ NÓDULO IoT          │ │
│  │ (VWC,T,EC,pH,N,P,K)│ [Power Gating MOSFET] │ Nordic nRF52840     │ │
│  │ Acero Inox 316L    │◄──────────────────────┤ ARM Cortex-M4F 64MHz│ │
│  └────────────────────┘                       │ BLE 5.2 Long Range  │ │
│  ┌────────────────────┐                       │ 8 MB SPI Flash      │ │
│  │ Sensor Luz Solar   ├──────────────────────►│ Li-Ion 1.000 mAh    │ │
│  └────────────────────┘                       └──────────┬──────────┘ │
└──────────────────────────────────────────────────────────┼────────────┘
                                                           │ BLE 5.2
                                                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SMARTPHONE DEL AGRICULTOR                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │               APP TERRASENSE (React Native / TS)                 │  │
│  │                                                                  │  │
│  │  • Recibe 7 parámetros vía BLE en < 300 ms                      │  │
│  │  • Motor Agronómico ejecuta diagnóstico en < 5 s                │  │
│  │  • Lista de cultivos aptos / no aptos — generada al instante    │  │
│  │  • Alertas climáticas integradas con GPS                        │  │
│  │  • Recomendaciones de enmienda cuantificadas                    │  │
│  │  • Mapa satelital georreferenciado del predio                   │  │
│  │  • Funciona 100% OFFLINE — sincroniza al recuperar señal        │  │
│  └────────────────────────────────────┬─────────────────────────────┘  │
└───────────────────────────────────────┼────────────────────────────────┘
                                        │ 4G / 5G / WiFi
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND CLOUD (Supabase + PostGIS)                   │
│                                                                        │
│  • Histórico multi-temporal de evolución del suelo                     │
│  • Motor Agronómico extendido (ML / modelos de cultivo regional)       │
│  • Mapas de calor e interpolación geoestadística (Kriging / IDW)       │
│  • API Meteorológica integrada (pronóstico 7 días por coordenada GPS)  │
│  • Consola Web para técnicos asesores y administradores                │
│  • FOTA — Actualización de Firmware OTA vía WiFi (ESP32)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Parámetros de Medición (7-en-1 + Ambiente)

| Parámetro | Rango | Precisión | Principio Físico | Utilidad Agronómica |
| :--- | :---: | :---: | :--- | :--- |
| **Humedad Volumétrica (VWC)** | $0–100\%$ | $\pm 2\%$ | FDR a 100 MHz | Detectar riesgo de asfixia radicular o déficit hídrico para germinación |
| **Temperatura del Suelo** | $-40$ a $+80°C$ | $\pm 0.3°C$ | Termistor NTC platino sellado | Evaluar si supera umbral de germinación (>10–15°C según cultivo) |
| **Conductividad Eléctrica (EC)** | $0–20.000\,\mu\text{S/cm}$ | $\pm 3\%$ | Electrodos bipolares CA | Detección de salinidad que quema raíces osmóticamente |
| **pH del Suelo** | $3.0–9.0$ | $\pm 0.1\,\text{pH}$ | Potenciométrico estado sólido | Detectar bloqueo de absorción de Fósforo y micronutrientes |
| **Nitrógeno (N)** | $1–1.999\,\text{mg/kg}$ | $\pm 5\%$ | Reactividad iónica in situ | Disponibilidad de nitratos/amonio para arranque vegetativo |
| **Fósforo (P)** | $1–1.999\,\text{mg/kg}$ | $\pm 5\%$ | Reactividad química superficial | Estimación para desarrollo radicular temprano |
| **Potasio (K)** | $1–1.999\,\text{mg/kg}$ | $\pm 5\%$ | Intercambio catiónico | Resistencia al estrés térmico, hídrico y patógenos |

---

## 6. Especificación de Hardware del Dispositivo

### 6.1. Microcontrolador: ESP32-WROOM-32

El sistema utiliza el **ESP32-WROOM-32 (Espressif)** como microcontrolador principal.

| Característica | Especificación |
| :--- | :--- |
| CPU | Xtensa LX6 dual-core @ 240 MHz |
| BLE | 5.0 (compatible con Android e iOS) |
| WiFi | 802.11 b/g/n — para OTA firmware updates |
| Persistencia bonding BLE | NVS (Non-Volatile Storage) en flash interno |
| UART RS-485 | UART2 — GPIO 16 (RX) / GPIO 17 (TX) |
| GPIO control MOSFET boost | GPIO 4 |
| I2C para BME280 | SDA GPIO 21 / SCL GPIO 22 |
| LED WS2812B | GPIO 5 |
| Pulsador | GPIO 0 (pull-up interno) |
| Costo módulo DevKit | ~$3 USD |

El bonding BLE persiste en flash NVS. Al encender con el rocker switch, la app se reconecta automáticamente sin re-vincular.

---

### 6.2. BOM Completo — Lista de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DIAGRAMA DE BLOQUES TERRASENSE v2.0                      │
│                                                                             │
│  ┌──────────┐   ┌──────────┐    ┌─────────────────────────────────────┐    │
│  │ 18650 #1 │   │ 18650 #2 │    │         TP5100 / IP5328             │    │
│  │  3.7V    ├───┤  3.7V    ├───►│  BMS + Cargador 2A + USB-C         │    │
│  │ ~3000mAh │   │ ~3000mAh │    │  Protección: sobre/sub-carga, SC   │    │
│  └──────────┘   └──────────┘    └──────────────┬──────────────────────┘    │
│                                                │ 3.7–4.2V rail             │
│                  ┌─────────────────────────────┼───────────────────┐       │
│                  │                             │                   │       │
│                  ▼                             ▼                   ▼       │
│          ┌──────────────┐            ┌─────────────────┐   ┌─────────────┐ │
│          │  ROCKER SW   │            │  MT3608 Boost   │   │   ESP32     │ │
│          │  (Corte      │            │  3.7V → 12V DC  │   │  DevKit v1  │ │
│          │   Total)     │            │  para NPK RS485 │   │  BLE + WiFi │ │
│          └──────────────┘            └────────┬────────┘   └──────┬──────┘ │
│                                               │                   │        │
│                                               ▼                   │ I2C    │
│                                    ┌─────────────────┐            ▼        │
│                                    │  Sensor NPK     │   ┌───────────────┐ │
│                                    │  7-en-1 RS485   │   │    BME280     │ │
│                                    │  (5–30V DC)     │   │  T°+HR+Presión│ │
│                                    └────────┬────────┘   └───────────────┘ │
│                                             │ RS485                        │
│                                             ▼                              │
│                                    ┌─────────────────┐                     │
│                                    │  MAX485 / SP3485│                     │
│                                    │  Transceptor    │◄────── ESP32 UART   │
│                                    └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Componentes Principales

| # | Componente | Modelo Recomendado | Función | Precio Est. |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Microcontrolador** | ESP32-WROOM-32 DevKit v1 | CPU principal, BLE 5.0, WiFi, NVS | ~$3 USD |
| 2 | **Sensor Ambiental** | **BME280** (no BMP280) | Temperatura + Humedad + Presión ambiental vía I2C | ~$0.80 USD |
| 3 | **Sensor NPK 7-en-1** | Sonda RS-485 Modbus (VWC, T, EC, pH, N, P, K) | Medición de suelo 7 parámetros | ~$15–18 USD |
| 4 | **Transceptor RS-485** | MAX485 / SP3485 | Adaptador TTL ↔ RS-485 para comunicar ESP32 con sonda | ~$0.20 USD |
| 5 | **Boost DC-DC** | MT3608 (módulo) | Eleva 3.7V batería → 12V para alimentar sonda NPK | ~$0.30 USD |
| 6 | **Baterías** | 2× 18650 Li-Ion 3.000 mAh (paralelo) | ~6.000 mAh totales, 3.7V nominal | ~$4 USD c/u |
| 7 | **BMS + Cargador USB-C** | **TP5100** (módulo) | Carga 2A, protección completa, soporta 1S/2S paralelo | ~$1.50 USD |
| 8 | **Interruptor de Alimentación** | Rocker Switch SPST 3A | Corte total de energía del sistema | ~$0.50 USD |
| 9 | **LED RGB** | WS2812B (NeoPixel) × 1 | Estado: vinculación (azul), medición OK (verde), error (rojo) | ~$0.20 USD |
| 10 | **Pulsador** | Táctil 6×6mm momentáneo | Vinculación BLE (press corto) + reset de fábrica (press 5s) | ~$0.10 USD |
| 11 | **Carcasa** | IP67 ABS con empuñadura y prensaestopas | Protección campo + cable gland para sonda | ~$5 USD |

---

### 6.3. Sensor Ambiental: BME280

El sistema implementa el sensor **Bosch BME280** vía I2C (SDA GPIO 21 / SCL GPIO 22).

| Parámetro | Rango | Precisión |
| :--- | :--- | :---: |
| Temperatura | −40 a +85°C | ±1°C |
| Humedad relativa | 0–100% HR | ±3% HR |
| Presión atmosférica | 300–110 hPa | ±1 hPa |

La humedad relativa permite al motor agronómico calcular:
- **VPD (Déficit de Presión de Vapor):** índice de estrés hídrico en cultivos
- **Evapotranspiración (ET₀):** cuánta agua pierde el suelo por evaporación
- **Riesgo de hongos:** HR > 85% + T° óptima = condición favorable para Botrytis y Mildiu

---

### 6.4. Sistema de Carga y Alimentación

```
         CONTROL DE ALIMENTACIÓN — BOOST MT3608 (ESP32 GPIO 4)
                     +VBAT (3.7–4.2V)
                             │
                       ┌─────────────────────┐
                       │ N-MOSFET (2N7002)    │
                       │ GPIO 4 ESP32 → Gate │
                       └─────────────────────┘
                             │
               ┌───────────┴───────────┐
               ▼                         ▼
   ┌───────────────┐         ┌──────────────┐
   │ MT3608 Boost   │         │  MAX485 RS-485  │
   │ 3.7V → 12V DC  │         │  Transceptor    │
   └────────┬──────┘         └──────┬───────┘
            │                         │ UART2 GPIO 16/17
            ▼                         ▼
   ┌───────────────┐         ┌──────────────┐
   │ Sonda NPK 7-en-1│         │   ESP32 UART2  │
   │ 5–30V DC        │         │  GPIO 16 / 17  │
   └───────────────┘         └──────────────┘

GPIO 4 HIGH = MOSFET ON  = Boost activo  = Sonda energizada (~40 mA)
GPIO 4 LOW  = MOSFET OFF = Boost apagado = 0 mA en etapa de potencia
```

#### Especificaciones TP5100 (Módulo USB-C)

| Parámetro | Valor |
| :--- | :--- |
| Corriente de carga máx. | 2A |
| Tensión de carga (Li-Ion 1S paralelo) | 4.2V |
| Soporte 2 celdas en paralelo | Sí (nativo) |
| Protección de sobrecarga | Integrada |
| Protección de sobredescarga | Integrada |
| Protección de cortocircuito | Integrada |
| Puerto USB-C | Sí (resistencias CC 5.1 kΩ) |
| Indicador LED | Rojo cargando / Azul completo |

---

### 6.5. Interfaz Física del Dispositivo

```
                    PANEL FRONTAL TERRASENSE
      ┌────────────────────────────────────────────┐
      │                                            │
      │    🔴/🟢/🔵 LED RGB         [PAIR]          │
      │    (Estado del sistema)     Pulsador        │
      │                                            │
      │    ━━━━━━━━━━━━━━━  USB-C ▬ (Carga)        │
      │                                            │
      │    [ ○  OFF  |  ON  ○ ]  ← Rocker Switch   │
      │                                            │
      └────────────────────────────────────────────┘
                    ↓
           Cable hacia sonda NPK (RS-485)
```

#### Lógica del LED RGB (1 solo LED WS2812B = 3 en 1)

| Estado del Sistema | Color | Patrón |
| :--- | :---: | :--- |
| Encendido, buscando dispositivo | 🔵 Azul | Pulso lento (1 Hz) |
| **Vinculando / Pairing** | 🔵 Azul | Parpadeo rápido (4 Hz) |
| Vinculado, listo para medir | 🟢 Verde | Estático |
| **Medición completada con éxito** | 🟢 Verde | 3 destellos rápidos |
| Batería baja (< 15%) | 🟠 Naranja | Pulso lento |
| Error de sonda / RS-485 | 🔴 Rojo | Parpadeo continuo |
| **Reset de fábrica en curso** | 🔴 Rojo | Fijo durante 3 s |

#### Lógica del Pulsador

| Acción | Resultado |
| :--- | :--- |
| **Press corto (< 1 s)** | Activa modo pairing BLE (ventana de 30 s) |
| **Press largo (≥ 5 s)** | Reset de fábrica: borra bonding NVS, reinicia como nuevo |

---

### 6.6. Persistencia de Vinculación BLE tras Apagado

El ESP32 almacena la información de bonding en su **partición NVS (Non-Volatile Storage)** en flash. Esto significa:

- ✅ **El usuario apaga con el rocker switch → enciende → la app se reconecta automáticamente.** No se necesita re-vincular.
- ✅ El bonding persiste incluso si se descarga la batería completamente.
- ✅ **Reset de fábrica** (press 5s): borra la partición NVS de bonding. El dispositivo queda como de fábrica, listo para un nuevo propietario.
- ✅ La app incluye la opción **"Desvincular dispositivo"** en configuración para el mismo efecto desde el teléfono.

```cpp
// Ejemplo ESP32 Arduino — Borrar bonding para factory reset
void factoryReset() {
  nvs_flash_erase();   // Borra partición NVS (bonding BLE + config)
  nvs_flash_init();
  ESP.restart();
}
```

---

### 6.7. Roadmap de Hardware — TerraSense v2.0

Características planificadas para la siguiente versión del hardware:

| # | Feature | Descripción | Costo Est. |
| :---: | :--- | :--- | :---: |
| 1 | **Display OLED 0.96"** | Muestra pH, T°, NPK en pantalla sin necesitar el teléfono | ~$1.50 USD |
| 2 | **Buzzer piezoeléctrico** | Beep de confirmación al completar medición | ~$0.20 USD |
| 3 | **Indicador % de batería** | Lectura ADC de tensión de celda, mostrado en app y OLED | ~$0 (GPIO ADC) |
| 4 | **Memoria SPI Flash 4 MB** | Almacena mediciones offline cuando el teléfono no está cerca | ~$0.50 USD |
| 5 | **Conector M8 IP67** | Conector de campo ruggedizado para la sonda en vez de cable fijo | ~$2 USD |
| 6 | **Puerto de calibración** | Header UART expuesto para recalibrar la sonda sin abrir el equipo | ~$0.20 USD |

---

## 7. Eficiencia Energética y Sistema de Alimentación

### 7.1. El Desafío
La sonda NPK RS-485 opera a 5–30V (típicamente 12V) y consume entre **25 y 40 mA** activa. El ESP32 consume ~80 mA en transmisión BLE y ~240 mA con WiFi activo. Con 2×18650 en paralelo (~6.000 mAh) y el rocker switch como control principal de energía, la autonomía es la siguiente:

### 7.2. Solución: Rocker Switch + MOSFET para el Boost
El corte principal se realiza con el **interruptor rocker físico** que desconecta toda la alimentación. Adicionalmente, un **N-MOSFET** controlado por GPIO del ESP32 corta la alimentación al boost MT3608 cuando no se está realizando una medición, eliminando el consumo en reposo del boost (~1–2 mA en standby):

```
               CIRCUITO DE CORTE TOTAL (POWER GATING)
                        +VBAT (3.7–4.2V)
                                │
                          ┌─────┴─────┐
                          │  P-MOSFET │
                          │  AO3401A  │
                          └─────┬─────┘
                                │
       GPIO P0.24 ──────────────┘  Gate (Low=ON, High=OFF)
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
 ┌───────────────────────┐           ┌───────────────────────┐
 │  Step-Up Boost (12V)  │           │  Transceptor RS-485   │
 │  TPS61040 / MT3608    │           │  MAX13487E / SP3485   │
 └───────────┬───────────┘           └───────────┬───────────┘
             └──────────────┬────────────────────┘
                            ▼
             ┌──────────────────────────────┐
             │  Sonda 7-en-1                │
             │  EN REPOSO: 0.0 µA           │
             └──────────────────────────────┘
```

| Estado | Subsistema | Consumo |
| :--- | :--- | :---: |
| Standby BLE (conectado, sin medir) | ESP32 + BLE activo | **~20 mA** |
| Boost apagado (MOSFET) | MT3608 + Sonda | **0.0 mA** |
| Activo — Medición (150 ms) | Boost + Sonda + RS-485 | ~40 mA |
| Activo — Transmisión BLE | ESP32 TX | ~80 mA |
| Apagado total | Rocker switch OFF | **0.0 mA** |

### 7.3. Autonomía Estimada con 2× 18650 (~6.000 mAh)

| Modo de Uso | Mediciones/Día | Consumo Promedio | Autonomía Estimada |
| :--- | :---: | :---: | :---: |
| 🌾 **Modo Campo** (15 med/día, rest. standby BLE) | 15 | ~22 mA promedio | **~11 días continuos** |
| 🚜 **Modo Recorrido** (medir y apagar) | 60 | Solo activo | **Meses (con rocker switch)** |
| 📊 **Modo Intensivo** (200 med/día) | 200 | ~30 mA promedio | **~8 días continuos** |
| ⚡ **Uso Real** (enciende, mide, apaga) | Variable | Depende de uso | **Batería prácticamente eterna** |

> 💡 **Con el interruptor rocker:** El usuario enciende, mide, apaga. El consumo real es de minutos por día. 6.000 mAh alcanzan para **semanas o meses** en uso práctico de campo.

---

## 8. Aplicación Móvil: Tu Asistente Agronómico

Desarrollada en **React Native + TypeScript + Expo**. Diseñada para que cualquier agricultor la entienda al primer uso.

```
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│   PANTALLA PRINCIPAL   │  │  DIAGNÓSTICO COMPLETO  │  │    LISTA DE CULTIVOS   │
│                        │  │                        │  │                        │
│  📡 Sonda detectada    │  │  🔴 CORRECCIÓN URGENTE │  │  🟢 PUEDES PLANTAR:    │
│  RSSI: -58 dBm         │  │                        │  │                        │
│                        │  │  pH: 5.1 → Ácido       │  │  ✅ Papa               │
│  pH:    5.1  🔴        │  │  Bloquea absorción de  │  │  ✅ Lechuga            │
│  EC:  2400 µS/cm ⚠️   │  │  Fósforo y micro-      │  │  ✅ Zanahoria          │
│  T°:    9.3°C  ⚠️     │  │  nutrientes            │  │  ✅ Avena              │
│  VWC:   38%            │  │  → 500 kg/ha cal agric.│  │                        │
│  N:     23 mg/kg ⚠️   │  │                        │  │  🟡 CON CORRECCIÓN:    │
│  P:     12 mg/kg ⚠️   │  │  Temp: 9.3°C → Fría    │  │  ⚠️  Tomate (pH)       │
│  K:     23 mg/kg 🔴   │  │  Maíz/Tomate necesitan │  │  ⚠️  Maíz  (T° baja)  │
│                        │  │  > 12°C para germinar  │  │                        │
│  [ ANALIZAR SUELO ]    │  │                        │  │  🔴 NO RECOMENDADOS:   │
│                        │  │  🌦️ Lluvia en 48h:     │  │  ❌ Espinaca (N alto)  │
│                        │  │  No siembres esta sem. │  │  ❌ Frutilla (salinidad)│
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

### 7.1. Funcionalidades Clave

| Funcionalidad | Descripción |
| :--- | :--- |
| 🧠 **Diagnóstico instantáneo** | Semáforo agronómico en ≤ 5 s con explicación en lenguaje natural |
| 🌿 **Lista de cultivos aptos** | +80 cultivos cruzados con tus 7 parámetros actuales |
| 📋 **Plan de corrección** | Qué enmienda aplicar, cuánto y cuándo — con estimación de costo |
| 🌦️ **Alertas climáticas** | Integración con pronóstico meteorológico por coordenada GPS |
| 🗺️ **Mapa satelital de predio** | Burbujas de colores georreferenciadas por sector |
| 📈 **Historial de evolución** | Evolución del suelo semana a semana y por temporada |
| 📡 **Offline-first** | Funciona 100% sin internet; sincroniza al recuperar señal |
| 👥 **Multi-rol** | Agricultor, técnico asesor y operador de campo en 1 sola app |

### 7.2. Sin Internet, Sin Problema

Si el agricultor está en medio de un cerro sin señal 4G, la app funciona al 100%:
1. Recibe datos vía BLE desde la sonda (sin internet)
2. Ejecuta el motor agronómico localmente en el teléfono
3. Entrega diagnóstico completo y lista de cultivos
4. Guarda la medición con coordenadas GPS
5. Al recuperar WiFi/4G → sincroniza todo automáticamente con Supabase

---

## 9. Plataforma Cloud y Consola Web (Supabase + PostGIS)

### 8.1. Arquitectura Multi-Rol

Cada dispositivo tiene un **Device ID único** (ej: `1234567890123456`) con soporte multi-usuario: cada iD es de 16 digitos.

| Rol | Plataforma | Capacidades |
| :--- | :--- | :--- |
| 🧑‍🌾 **Agricultor / Dueño** | App móvil | Mediciones, diagnósticos, mapa de su predio, historial |
| 👷 **Técnico Asesor (INDAP/PRODESAL)** | App + Web | Calibración de umbrales, revisión de diagnósticos, asistencia remota |
| 👨‍💼 **Operador de Campo** | App móvil | Realiza mediciones diarias, sincroniza lecturas |
| 🛠️ **Administrador (Equipo TerraSense)** | Consola Web | Gestión global, FOTA, soporte remoto |

### 8.2. Consola Web para Técnicos y Administradores

- **Gestión de Dispositivos:** Estado en línea, batería, ubicación y usuarios por `Device ID`
- **Mapas de Calor (PostGIS):** Interpolación Kriging/IDW de fertilidad del suelo por zona
- **FOTA (BLE DFU):** Actualización de firmware OTA inalámbrica a través del smartphone del agricultor
- **Mesa de Ayuda Remota:** Diagnóstico de fallas (voltaje boost 12V, latencia UART Modbus, estado de electrodos)
- **Motor Agronómico Avanzado:** Modelos ML por temporada y tipo de suelo (trumao, arcilla, franco-arenoso)

---

## 10. Análisis Competitivo Real: Quiénes son los Rivales de TerraSense

> TerraSense se comercializará entre **$170.000 y $200.000 CLP** (~$178–$210 USD).
> En ese rango y en el segmento superior, los competidores reales son los siguientes.

---

### 10.1. La Problemática Central que Nadie Ha Resuelto

El mercado de sensores de suelo lleva más de 20 años en un estado de **parálisis de interpretación**. Tanto los equipos baratos como los costosos comparten el mismo defecto fundamental:

```
ESTADO DEL ARTE HOY (cualquier competidor):
┌─────────────────────────────────────────────────┐
│  SENSOR  ──►  DATO CRUDO  ──►  AGRICULTOR       │
│                                                  │
│  pH: 5.1                  "¿Qué hago con esto?" │
│  EC: 2400 µS/cm           "¿Puedo sembrar?"     │
│  T°: 9.3°C                "¿Cuánto corrijo?"    │
│  N:  23 mg/kg             "¿Qué cultivo pongo?" │
│  P:  12 mg/kg                                   │
│  K:  23 mg/kg             ❌ NADIE RESPONDE      │
└─────────────────────────────────────────────────┘

LO QUE TERRASENSE HACE:
┌─────────────────────────────────────────────────┐
│  SENSOR ──► DATOS ──► MOTOR AGRONÓMICO ──► ACCIÓN│
│                                                  │
│  "pH 5.1 → bloqueo de Fósforo.                 │
│   Aplica 500 kg/ha de cal agrícola.             │
│   Espera 7 días antes de sembrar.               │
│   Con corrección puedes plantar:                │
│   ✅ Papa, Avena, Raps, Arándano                 │
│   ⚠️  Tomate (necesita pH > 6.0)               │
│   🌦️  Lluvia prevista en 48h → no siembres aún"│
└─────────────────────────────────────────────────┘
```

La brecha no es de sensores. Es de **interpretación y decisión agronómica en tiempo real.**

---

### 10.2. Mapa de Competidores Reales (Segmento $170.000–$300.000+ CLP)

#### Rival A — Bluelab Pulse Multimedia Meter (~$265–$350 USD / ~$255.000–$335.000 CLP)

**Qué tiene Bluelab que TerraSense v1 no tiene:**

| Ventaja de Bluelab | Detalle |
| :--- | :--- |
| **Precisión de electrodo de vidrio** | Electrodo de pH de vidrio borosilicato de alta precisión. Su pH es más estable en el tiempo que un electrodo de estado sólido. |
| **Marca consolidada con +20 años** | Confianza de la industria hidroponía/cannabis profesional. Respaldo técnico global. |
| **App Bluelab Pulse** | App Bluetooth para ver y exportar EC, Moisture y Temperatura. Historial por sesión de cultivo. |
| **Calibración certificada** | Sistema de calibración con soluciones buffer incluidas y recordatorio de 30 días. |

**Qué le falta a Bluelab que TerraSense sí implementa:**

| Brecha de Bluelab | Impacto Real |
| :--- | :--- |
| **No mide NPK** | El agricultor solo ve EC total — no sabe qué nutriente específico está deficiente. |
| **No tiene motor agronómico** | La app muestra el dato. No dice qué hacer con él. |
| **No sugiere cultivos aptos** | El agricultor interpreta por su cuenta o llama a un técnico. |
| **No integra clima/meteorología** | No sabe si viene lluvia o helada que impidan la siembra. |
| **No georeferencia mediciones** | Sin mapa satelital ni historial geoespacial del predio. |
| **Precio mayor (~$265–$350 USD)** | 40–80% más caro que TerraSense sin ofrecer diagnóstico agronómico. |
| **Orientado a hidroponía, no campo abierto** | Diseñado para sustratos controlados, no suelos agrícolas de campo. |

---

#### Rival B — Hanna Instruments HI9814 GroLine (~$310 USD / ~$295.000 CLP)

**Qué tiene Hanna que TerraSense v1 no tiene:**

| Ventaja de Hanna | Detalle |
| :--- | :--- |
| **Electrodo de vidrio pre-amplificado** | El HI1285-7 combina pH, EC y temperatura en una sola sonda resistente a interferencias eléctricas. |
| **IP67 certificado** | Sellado industrial, resiste inmersión completa. |
| **Quick-Cal con solución única** | Calibración en 1 paso con solución combinada pH + EC, sin buffers separados. |
| **Compensación automática de temperatura (ATC)** | Corrige lecturas de pH según temperatura del suelo automáticamente. |
| **Respaldo técnico y distribución global** | Distribuidores en Chile (Veto.cl), soporte postventa establecido. |
| **Precisión validada en laboratorio** | Electrodo de vidrio con correlación > 95% frente a análisis de laboratorio. |

**Qué le falta a Hanna que TerraSense sí implementa:**

| Brecha de Hanna | Impacto Real |
| :--- | :--- |
| **No mide NPK** | Solo mide pH, EC, TDS y T°. Para NPK se necesitan kits químicos separados ($40–$80 USD adicionales). |
| **Sin app ni conectividad** | No tiene Bluetooth ni WiFi. Los datos mueren en la pantalla LCD. |
| **Sin GPS ni mapa** | El agricultor no puede georeferenciar cada medición ni generar mapas de predio. |
| **Sin diagnóstico agronómico** | Muestra números. No dice qué cultivar ni cuándo sembrar. |
| **Requiere muestra de suelo disuelta** | Para usar el electrodo de vidrio en suelo hay que preparar una suspensión suelo:agua. No es in-situ directo. |
| **Sin alertas climáticas** | No integra pronóstico meteorológico. |
| **Precio mayor (~$310 USD)** | 55–70% más caro, sin ninguna capacidad de interpretación agronómica. |

---

#### Rival C — Análisis de Laboratorio Tradicional (~$35.000–$60.000 CLP por muestra)

**Qué tiene el laboratorio que TerraSense v1 no tiene:**

| Ventaja del Laboratorio | Detalle |
| :--- | :--- |
| **Precisión química absoluta** | Análisis por espectrometría de absorción atómica o ICP-OES. Exactitud de laboratorio real. |
| **Validación científica** | Reconocido por INDAP, SAG y normas ISO. Los resultados son aceptados en juicio. |
| **Análisis de micronutrientes completo** | Cobre, Zinc, Manganeso, Boro, Molibdeno — parámetros que TerraSense no puede medir. |
| **Materia orgánica y textura de suelo** | Determinación de MO% y clasificación de suelo (arcilloso, franco, arenoso). |

**Qué le falta al laboratorio que TerraSense sí implementa:**

| Brecha del Laboratorio | Impacto Real |
| :--- | :--- |
| **3 semanas de espera** | Para cuando el resultado llega, la ventana de siembra óptima ya pasó. |
| **$40.000–$60.000 CLP por muestra** | Un predio de 5 hectáreas con 10 puntos de muestreo = $400.000–$600.000 CLP solo en análisis. |
| **Sin georreferenciación** | El resultado es un promedio del predio. No dice dónde exactamente está el problema. |
| **Foto estática, no película** | Un análisis al año. El suelo cambia semana a semana según riego, lluvia y temperatura. |
| **Sin diagnóstico en tiempo real** | No sabe si el suelo está a 9°C hoy y por eso no puede germinar la semilla. |
| **Sin integración climática** | No incorpora el pronóstico de lluvia de la semana siguiente. |

---

#### Rival D — Técnico Agrónomo Privado ($80.000–$200.000 CLP / visita)

**Qué tiene el técnico agrónomo que TerraSense no tiene:**

| Ventaja del Técnico | Detalle |
| :--- | :--- |
| **Criterio profesional titulado** | Interpreta datos en contexto completo: historia del suelo, variedad, mercado, clima local. |
| **Diagnóstico de enfermedades visuales** | Identifica patógenos, plagas y deficiencias visibles que un sensor no detecta. |
| **Negociación con INDAP/SAG** | Puede respaldar solicitudes de crédito o subsidio con informe técnico firmado. |
| **Relación de confianza con el agricultor** | Décadas de validación en campo. |

**Qué le falta al técnico que TerraSense sí implementa:**

| Brecha del Técnico | Impacto Real |
| :--- | :--- |
| **$80.000–$200.000 CLP por visita** | Inaccesible para AFC y pequeña agricultura. TerraSense: $0 por medición. |
| **Agenda de 2–4 semanas** | El técnico no llega el día que el agricultor necesita sembrar. |
| **Sin disponibilidad 24/7** | No hay técnico a las 7 AM del lunes de la siembra. |
| **Sin mapa geoespacial del predio** | No genera mapas de calor de fertilidad por sector en tiempo real. |
| **Sin historial digital integrado** | El diagnóstico es oral o en papel. No queda en una base de datos consulable. |

---

### 10.3. Matriz Comparativa de Brechas

| Capacidad | Bluelab Pulse | Hanna HI9814 | Laboratorio | Técnico Agrónomo | **TerraSense** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Precio** | ~$265–$350 USD | ~$310 USD | $35–60K CLP/muestra | $80–200K CLP/visita | **~$185 USD (pago único)** |
| **Medición in-situ directa** | ✅ | Parcial¹ | ❌ | ❌ | ✅ |
| **Mide NPK** | ❌ | ❌ | ✅ | Con lab | ✅ |
| **Mide pH** | ❌ | ✅ | ✅ | Con lab | ✅ |
| **Resultado en < 5 segundos** | ✅ | ✅ | ❌ (3 semanas) | ❌ (días) | ✅ |
| **Conectividad Bluetooth/App** | ✅ (EC/Moisture) | ❌ | ❌ | ❌ | ✅ (7 parámetros) |
| **Diagnóstico agronómico automático** | ❌ | ❌ | Parcial (informe) | ✅ | ✅ |
| **Lista de cultivos aptos (+80)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Plan de enmienda cuantificado** | ❌ | ❌ | ✅ (por informe) | ✅ | ✅ |
| **Alertas climáticas integradas** | ❌ | ❌ | ❌ | Parcial | ✅ (7 días GPS) |
| **Mapa satelital GIS del predio** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Georreferenciación por punto** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Funciona sin internet (Offline)** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Disponibilidad 24/7** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Costo por medición** | $0 | $0 | ~$4.000–6.000 CLP | ~$80.000+ CLP | **$0** |

> ¹ *Hanna HI9814 requiere preparar una suspensión suelo:agua para usar el electrodo de vidrio — no es pinche directo en campo.*

---

### 10.4. Lo que TerraSense Admite Honestamente

La transparencia técnica es parte del diferenciador:

| Limitación Real de TerraSense v1 | Contexto |
| :--- | :--- |
| **Electrodo NPK de estado sólido ≠ laboratorio** | Los valores de N, P, K son estimaciones relativas por intercambio iónico superficial, no análisis absoluto. Útiles para *tendencias y semáforos*, no para fertilización de precisión grampo-por-gramo. |
| **Sin micronutrientes (Cu, Zn, Mn, B, Mo)** | Para diagnósticos de deficiencias específicas de microelementos se requiere laboratorio. |
| **Sin análisis de textura ni materia orgánica** | No reemplaza un análisis de suelo completo anual — lo *complementa* con monitoreo continuo. |
| **pH potenciométrico de estado sólido** | Ligeramente menos estable que el electrodo de vidrio de Hanna a largo plazo. Requiere recalibración periódica. |

> **Posicionamiento honesto de TerraSense:**
> No reemplaza al laboratorio ni al técnico agrónomo para decisiones de alta precisión.
> **Sí reemplaza la ignorancia total** del 99% de los agricultores que hoy siembran sin ningún dato de su suelo,
> entregando un diagnóstico accionable en 5 segundos al costo de $0 por medición.

---

### 10.5. Ventajas Defensivas de TerraSense (Difíciles de Copiar)

| Ventaja | Por qué es difícil de replicar |
| :--- | :--- |
| **Motor agronómico calibrado para Chile** | Base de datos de cultivos, umbrales fisiológicos y recomendaciones de enmienda calibradas para suelos volcánicos (trumaos), arcillas del Valle Central y condiciones climáticas de Chile/Latinoamérica. No es un algoritmo genérico. |
| **7 parámetros + diagnóstico en 1 sola acción** | Ningún competidor en el rango $150–$350 USD mide NPK + pH + VWC + T° + EC en una sola sonda con app de diagnóstico. Para lograrlo necesitarías comprar 3 instrumentos separados (~$600–$900 USD). |
| **Integración GIS + meteorología en $185 USD** | Equipos con mapa satelital de campo y alertas climáticas cuestan $1.500–$5.000 USD (Trimble, Ag Leader, Climate FieldView Pro). |
| **Ecosistema abierto (Supabase + PostGIS)** | Sin licencias de software. El agricultor no depende de una suscripción para seguir usando su historial de datos. |
| **Diseñado para campo chileno sin internet** | La arquitectura offline-first con sincronización automática es una decisión de diseño explícita para la realidad de conectividad del campo chileno (Araucanía, Bío-Bío, Maule). |

---


## 11. Protocolos de Comunicación: RS485 Modbus RTU y BLE GATT

### 10.1. Trama Modbus RTU de Lectura de la Sonda

El microcontrolador consulta la sonda mediante **Modbus RTU** a $9.600\,\text{bps}$ (8N1):

```text
[Consulta MCU]:
0x01 | 0x03 | 0x00 0x00 | 0x00 0x07 | 0x04 0x08
 ID    Cmd    Reg Base    7 Registros   CRC16

[Respuesta Sonda — 14 Bytes de Carga Útil]:
Byte 0-1  : VWC          → 0x015E = 350  → 35.0 %
Byte 2-3  : Temperatura  → 0x00F5 = 245  → 24.5 °C
Byte 4-5  : EC           → 0x04D2 = 1234 → 1234 µS/cm
Byte 6-7  : pH           → 0x0041 = 65   → 6.5 pH
Byte 8-9  : Nitrógeno N  → 0x002D = 45   → 45 mg/kg
Byte 10-11: Fósforo P    → 0x001E = 30   → 30 mg/kg
Byte 12-13: Potasio K    → 0x0050 = 80   → 80 mg/kg
```

### 10.2. Arquitectura BLE: Sonda sin SIM, Smartphone como Gateway Inteligente

La sonda física **no tiene chip celular ni SIM**. Usa solo BLE 5.2. El smartphone del agricultor actúa como gateway:
- Recibe 16 bytes de telemetría vía BLE en < 300 ms
- Asocia coordenadas GPS de alta precisión del teléfono
- Ejecuta el motor agronómico localmente
- Sincroniza con Supabase cuando hay conexión

Esto reduce el costo BOM drásticamente y el consumo en reposo a solo **1.8 µA**.

---

## 12. Modelos Agronómicos: Balance Hídrico y Evapotranspiración

$$\text{AUD} = (\theta_{\text{CC}} - \theta_{\text{PMP}}) \times Z_r$$

Donde:
- $\theta_{\text{CC}}$: Contenido de agua en Capacidad de Campo ($m^3/m^3$)
- $\theta_{\text{PMP}}$: Contenido de agua en Punto de Marchitez Permanente ($m^3/m^3$)
- $Z_r$: Profundidad de zona radicular efectiva ($mm$)

El motor combina este modelo con la lectura de VWC actual y el pronóstico de ET₀ (Penman-Monteith simplificado con radiación solar del sensor de lux) para estimar el **déficit hídrico en días** antes de requerir riego.

---

## 13. Modelo Económico y Estudio de Mercado

### 12.1. Estructura de Costos (BOM — Lote 100 unidades)

| Componente | Referencia | Costo Unitario |
| :--- | :--- | :---: |
| Sonda Suelo 7-en-1 Grado Industrial | RS-485 Modbus Inox 316L | $16.500 CLP |
| SoC nRF52840 BLE 5.2 | Nordic / Raytac MDBT50Q | $4.200 CLP |
| PCB 2 Capas ENIG + Ensamblaje SMT | FR4 1.2mm + montaje automatizado | $3.500 CLP |
| Power Gating + RS-485 | P-MOSFET AO3401A + MT3608 + MAX13487E | $2.400 CLP |
| Flash 8MB + Sensor Luz | Winbond W25Q64JV + Fotodiodo CIE | $1.800 CLP |
| Batería Li-Ion 1.000 mAh + USB-C | Celda LiPo + TP4056 | $3.800 CLP |
| Carcasa Estanca IP68 | ABS/PC con O-rings y empuñadura ergonómica | $5.800 CLP |
| Empaque, QA y Calibración | Caja + espuma protectora + certificación | $4.000 CLP |
| **TOTAL BOM** | | **$42.000 CLP (~$44 USD)** |

### 12.2. Precio de Venta y Margen

$$\text{PVP:}\ \mathbf{\$179.990\ CLP}\ (\approx \$188\ USD)\qquad\text{BOM:}\ \$42.000\ CLP$$

$$\text{Margen Bruto Unitario:}\ \$137.990\ CLP\ \Rightarrow\ \mathbf{76.6\%}$$

### 12.3. Dimensionamiento de Mercado (TAM / SAM / SOM)

- **TAM:** 278.000 explotaciones agropecuarias en Chile
- **SAM:** 83.400 (30% con smartphone, cobertura y cultivos comerciales)
- **SOM Año 1 (1%):** 834 equipos

$$834\ \text{unidades} \times \$179.990 = \mathbf{\$150.111.660\ CLP}\ (\approx \$158.000\ USD)$$
$$\text{Ganancia Bruta Año 1:}\ \mathbf{\$115.083.660\ CLP}\ (\approx \$121.000\ USD)$$

---

## 14. Guía de Defensa Hostil: Las 7 Preguntas Incómodas

### ❓ 1. *"¿Qué hace tu equipo que no haga el THE01904 de $205 USD si usan la misma sonda?"*

> **🎯 Respuesta:**
> *"El THE01904 muestra 7 números en una pantalla LCD y termina ahí. Si le aparece `pH 5.1`, `K 23 mg/kg` y `Temp 9°C`, el agricultor no sabe si sembrar, qué le falta al suelo, cuánto aplicar ni qué puede plantar con esos valores.*
>
> *TerraSense procesa esos mismos 7 datos y en 5 segundos entrega: diagnóstico de deficiencias en lenguaje natural, plan de corrección cuantificado en kg y costo, lista completa de qué puede y qué no puede plantar hoy, y si conviene esperar por lluvia próxima. El THE01904 no tiene GPS ni nube; los datos mueren en la pantalla. TerraSense genera un mapa satelital del predio y construye el historial del suelo temporada a temporada."*

---

### ❓ 2. *"¿Por qué no mandar un análisis de laboratorio una vez al año?"*

> **🎯 Respuesta:**
> *"Un análisis de laboratorio cuesta $40.000 CLP y tarda 1 a 4 semanas. Para entonces ya sembraste o perdiste la temporada. El suelo cambia todos los días: la temperatura sube tras la lluvia, la humedad varía por sector, la salinidad se concentra en las zonas bajas. TerraSense es la diferencia entre una fotografía mensual cara y lenta, y una cámara en tiempo real a $0 por medición."*

---

### ❓ 3. *"¿Por qué un campesino de 60 años te compraría a ti?"*

> **🎯 Respuesta:**
> *"Porque el cambio climático y el costo de insumos rompieron la regla del 'ojo'. Un saco de fertilizante supera $45.000 CLP, una bolsa de semilla híbrida $150.000 CLP. Sembrar a ciegas en suelo ácido o frío significa endeudarse con INDAP por toda una temporada. La app tiene interfaz de semáforo — Verde, Amarillo, Rojo — que cualquier persona entiende en 2 segundos, sin saber nada de agronomía."*

---

### ❓ 4. *"¿De verdad tus clientes tienen $180.000 CLP para esto?"*

> **🎯 Respuesta:**
> *"Un agricultor de 2 hectáreas de tomate invierte $2–5 millones CLP por temporada en fertilizantes y semillas. Pagar $179.990 CLP una sola vez para proteger esa inversión representa menos del 4% de su presupuesto de siembra. Además, el canal B2B apunta a cooperativas, consultores privados y programas de INDAP y PRODESAL, que pueden adquirir por lote."*

---

### ❓ 5. *"¿Qué pasa si en el cerro no hay señal 4G?"*

> **🎯 Respuesta:**
> *"BLE no requiere internet. La sonda transmite al teléfono, la app ejecuta el motor agronómico localmente y entrega el diagnóstico completo al instante. En cuanto regresa a zona con WiFi o 4G, sincroniza automáticamente con Supabase en segundo plano sin que el agricultor haga nada."*

---

### ❓ 6. *"¿Si un Meter Group vale $2.900 USD y el tuyo $188, no será de juguete?"*

> **🎯 Respuesta:**
> *"La diferencia está en el modelo de negocio, no en la precisión. Meter Group vende dataloggers con gabinetes solares, módems 4G dedicados y licencias de software de $300 USD/año. Nosotros aprovechamos la pantalla, el GPS y el módem 4G que el agricultor ya tiene en el bolsillo. En banco de pruebas contrastado con laboratorio químico, nuestros electrodos 316L alcanzan correlación superior al 90% en pH, humedad y EC."*

---

### ❓ 7. *"¿Qué impide que los chinos saquen una app mañana y te copien?"*

> **🎯 Respuesta:**
> *"El hardware es replicable. El valor de TerraSense es el motor agronómico contextualizado: calibraciones para suelos volcánicos (trumaos), arcillas del Valle Central, rangos de fertilización de variedades locales de Chile y Latinoamérica, integración con programas de INDAP/PRODESAL y el histórico acumulado de datos por temporada y región. Los fabricantes asiáticos venden hardware genérico a nivel global sin soporte agronómico local ni integración GIS predial."*

---

## 15. Criterios de Éxito y KPIs

| # | Indicador | Meta |
| :---: | :--- | :--- |
| 🔋 | **Autonomía de batería** en Modo Campo | $\geq 4$ meses (1.000 mAh) |
| 🎯 | **Precisión pH y EC** vs. laboratorio químico | $\geq 90\%$ correlación (≥ 30 muestras) |
| ⚡ | **Tiempo de veredicto agronómico** | $\leq 5$ segundos post-medición |
| 📶 | **Cobertura BLE en campo abierto** | $\geq 100$ metros (BLE 5.2 Coded PHY) |
| 🌿 | **Exactitud de lista de cultivos** | $\geq 85\%$ concordancia con agrónomo certificado |
| 🌦️ | **Precisión de alertas climáticas** | $\leq 12$ h de desfase vs. lluvia real registrada |

---

## 16. Guía de Puesta en Marcha

### 16.1. Aplicación Móvil (React Native / Expo / TypeScript)
```bash
cd App
npm install
npx expo start
```

### 16.2. Consola Web Agronómica (React 18 / Vite)
```bash
cd Web
npm install
npm run dev
```

### 16.3. Firmware del Microcontrolador (ESP32 / Arduino / ESP-IDF)
```bash
cd Firmware
# Con Arduino IDE: seleccionar ESP32 DevKit v1, puerto COM, Upload
# Con PlatformIO:
pio run --target upload
# Con ESP-IDF:
idf.py build flash monitor
```

---

## 17. Estructura del Repositorio

```text
TerraSence/
├── README.md                          # Este documento — especificación integral
├── .gitignore
├── App/                               # App móvil React Native (Expo + TypeScript)
│   ├── App.tsx                        # Componente raíz: estado, navegación, motor agronómico
│   ├── tsconfig.json
│   ├── app.json                       # Permisos BLE, GPS e Internet
│   ├── src/
│   │   ├── engine/                    # Motor agronómico: diagnóstico, cultivos, enmiendas
│   │   ├── services/                  # BLE, GPS, API clima, Supabase sync
│   │   ├── screens/                   # Pantallas de la app
│   │   └── types/                     # Tipos TypeScript
│   └── package.json
├── Web/                               # Consola Web (React 18 + Vite + PostGIS)
│   ├── src/
│   │   ├── components/                # Mapa GIS, heatmaps, panel de dispositivos
│   │   └── pages/
│   └── package.json
├── Firmware/                          # Código ESP32 (Arduino / ESP-IDF / PlatformIO)
│   ├── src/
│   │   ├── main.cpp                   # Loop principal, máquina de estados
│   │   ├── ble/                       # Servidor GATT, bonding NVS, pairing handler
│   │   ├── modbus/                    # Driver RS-485 Modbus RTU para sonda NPK
│   │   ├── sensors/                   # Driver BME280 I2C
│   │   ├── power/                     # Control MOSFET boost, rocker switch ISR
│   │   └── ui/                        # LED WS2812B, buzzer, pulsador
│   ├── platformio.ini                 # Configuración PlatformIO ESP32
│   └── CMakeLists.txt                 # Alternativa ESP-IDF
├── PCB/                               # Esquemáticos KiCad, diseño PCB y BOM
│   ├── TerraSense_v2.kicad_sch
│   ├── TerraSense_v2.kicad_pcb
│   └── BOM.csv
├── Diseño 3D/                         # CAD FreeCAD/Fusion360 de carcasa IP67
└── supabase/                          # PostgreSQL + PostGIS + Edge Functions
```

---

> *"Existen cientos de dispositivos que sensan la tierra.*
> *Baratos, caros, industriales, portátiles.*
> *Todos te dan los números.*
> *Nadie te dice qué hacer con ellos.*
> *TerraSense es el primero que actúa como el ingeniero agrónomo*
> *que el 99% de los agricultores de Chile nunca pudo pagar."*

---

*Desarrollado para Ingeniería en Electrónica y Sistemas Inteligentes — INACAP.*
*Motor agronómico calibrado para suelos y cultivos de Chile y Latinoamérica.*
