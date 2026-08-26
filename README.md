# 🌱 TerraSense — Tu Ingeniero Agrónomo en el Bolsillo

> **No vendemos datos. Vendemos decisiones.**
>
> El primer sistema IoT agronómico que no solo *sensa* el suelo —  
> sino que lo *interpreta*, lo *diagnostica* y te *dice exactamente qué hacer*.

> **Proyecto de Título:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP  
> **Stack:** `ESP32` · RS-485 Modbus RTU · BLE 5.0 · BME280 I2C · React Native / Expo / TypeScript · Supabase + PostGIS · Motor Agronómico IA

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![ESP32](https://img.shields.io/badge/MCU-ESP32%20(Espressif)-E7352C.svg)](https://www.espressif.com/en/products/socs/esp32)
[![Bluetooth 5.0](https://img.shields.io/badge/BLE-5.0%20BLE%20%2B%20WiFi-0082FC.svg)](https://www.bluetooth.com/)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native%20(Expo%20%2B%20TS)-61DAFB.svg)](https://reactnative.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2B%20PostGIS-3ECF8E.svg)](https://supabase.com/)
[![AI Agronomic Engine](https://img.shields.io/badge/Engine-Agronomic%20AI%20Advisor-FF6B35.svg)]()

---

## 📑 Tabla de Contenidos

* [🏛️ PARTE I: VISIÓN ESTRATÉGICA, PROBLEMÁTICA Y MERCADO](#️-parte-i-visión-estratégica-problemática-y-mercado)
  * [1. Problemática del Agro y Propuesta de Valor](#1-problemática-del-agro-y-propuesta-de-valor)
    * [1.1. La Brecha que Nadie ha Cerrado: Parálisis de Interpretación](#11-la-brecha-que-nadie-ha-cerrado-parálisis-de-interpretación)
    * [1.2. La Realidad del Campo Chileno en Cifras](#12-la-realidad-del-campo-chileno-en-cifras)
    * [1.3. Qué hace TerraSense que nadie más hace: De Sensor a Asistente IA](#13-qué-hace-terrasense-que-nadie-más-hace-de-sensor-a-asistente-ia)
    * [1.4. Los 5 Pilares de Diferenciación Tecnológica](#14-los-5-pilares-de-diferenciación-tecnológica)
  * [2. Análisis Competitivo y Matriz de Brechas](#2-análisis-competitivo-y-matriz-de-brechas)
    * [2.1. Mapa de Rivales Reales ($170.000 – $300.000+ CLP)](#21-mapa-de-rivales-reales-170000--300000-clp)
    * [2.2. Matriz Comparativa de Brechas](#22-matriz-comparativa-de-brechas)
    * [2.3. Transparencia Técnica: Lo que TerraSense Admite Honestamente](#23-transparencia-técnica-lo-que-terrasense-admite-honestamente)
    * [2.4. Ventajas Defensivas de TerraSense (Moats)](#24-ventajas-defensivas-de-terrasense-moats)
  * [3. Modelo Económico y Viabilidad Comercial](#3-modelo-económico-y-viabilidad-comercial)
    * [3.1. Estructura de Costos Industriales (BOM Lote 100 unidades)](#31-estructura-de-costos-industriales-bom-lote-100-unidades)
    * [3.2. Precio de Venta al Público (PVP) y Margen de Rentabilidad](#32-precio-de-venta-al-público-pvp-y-margen-de-rentabilidad)
    * [3.3. Dimensionamiento de Mercado en Chile (TAM / SAM / SOM)](#33-dimensionamiento-de-mercado-en-chile-tam--sam--som)
* [🧬 PARTE II: MOTOR AGRONÓMICO Y MODELOS CIENTÍFICOS](#-parte-ii-motor-agronómico-y-modelos-científicos)
  * [4. Arquitectura del Motor Agronómico IA](#4-arquitectura-del-motor-agronómico-ia)
    * [4.1. Capa 1 — Perfiles de Cultivo y Umbrales Fisiológicos (+80 Especies)](#41-capa-1--perfiles-de-cultivo-y-umbrales-fisiológicos-80-especies)
    * [4.2. Capa 2 — Diagnóstico de Deficiencias y Toxicidades](#42-capa-2--diagnóstico-de-deficiencias-y-toxicidades)
    * [4.3. Capa 3 — Plan de Enmiendas y Fertilización Cuantificada](#43-capa-3--plan-de-enmiendas-y-fertilización-cuantificada)
    * [4.4. Capa 4 — Integración Climática Predictiva (7 Días GPS)](#44-capa-4--integración-climática-predictiva-7-días-gps)
  * [5. Parámetros de Medición y Modelos Físico-Químicos](#5-parámetros-de-medición-y-modelos-físico-químicos)
    * [5.1. Matriz de Parámetros Sensados (Suelo 7-en-1 + Ambiente BME280)](#51-matriz-de-parámetros-sensados-suelo-7-en-1--ambiente-bme280)
    * [5.2. Modelos de Balance Hídrico, AUD y Evapotranspiración (VPD / ET₀)](#52-modelos-de-balance-hídrico-aud-y-evapotranspiración-vpd--et₀)
* [⚡ PARTE III: INGENIERÍA DE HARDWARE Y ELECTRÓNICA](#-parte-iii-ingeniería-de-hardware-y-electrónica)
  * [6. Especificación y Diseño Electrónico](#6-especificación-y-diseño-electrónico)
    * [6.1. Diagrama de Arquitectura Integral de Sistema](#61-diagrama-de-arquitectura-integral-de-sistema)
    * [6.2. Microcontrolador Principal: ESP32-WROOM-32 y Pinout](#62-microcontrolador-principal-esp32-wroom-32-y-pinout)
    * [6.3. Sensor Ambiental Integrado: Bosch BME280 I2C](#63-sensor-ambiental-integrado-bosch-bme280-i2c)
    * [6.4. BOM Detallado de Componentes Electrónicos](#64-bom-detallado-de-componentes-electrónicos)
    * [6.5. Interfaz Física del Dispositivo (Panel, LED WS2812B, Pulsador)](#65-interfaz-física-del-dispositivo-panel-led-ws2812b-pulsador)
    * [6.6. Persistencia de Vinculación BLE tras Apagado (Flash NVS)](#66-persistencia-de-vinculación-ble-tras-apagado-flash-nvs)
    * [6.7. Roadmap de Hardware v2.0](#67-roadmap-de-hardware-v20)
  * [7. Sistema de Potencia y Eficiencia Energética](#7-sistema-de-potencia-y-eficiencia-energética)
    * [7.1. Sistema de Carga USB-C y Gestión de Batería (TP5100 + 2× 18650)](#71-sistema-de-carga-usb-c-y-gestión-de-batería-tp5100--2-18650)
    * [7.2. Control de Alimentación del Boost MT3608 por MOSFET](#72-control-de-alimentación-del-boost-mt3608-por-mosfet)
    * [7.3. Perfil de Consumo Eléctrico y Autonomía en Terreno](#73-perfil-de-consumo-eléctrico-y-autonomía-en-terreno)
  * [8. Protocolos de Comunicación Industrial e Inalámbrica](#8-protocolos-de-comunicación-industrial-e-inalámbrica)
    * [8.1. Trama Industrial RS-485 Modbus RTU (Sonda NPK)](#81-trama-industrial-rs-485-modbus-rtu-sonda-npk)
    * [8.2. Comunicación Bluetooth 5.0 BLE (GATT) hacia el Smartphone](#82-comunicación-bluetooth-50-ble-gatt-hacia-el-smartphone)
* [💻 PARTE IV: ECOSISTEMA DE SOFTWARE Y NUBE](#-parte-iv-ecosistema-de-software-y-nube)
  * [9. Aplicación Móvil TerraSense (React Native / Expo)](#9-aplicación-móvil-terrasense-react-native--expo)
    * [9.1. Arquitectura In-App y Flujo de Pantallas](#91-arquitectura-in-app-y-flujo-de-pantallas)
    * [9.2. Funcionalidades Clave y Experiencia de Usuario (UX)](#92-funcionalidades-clave-y-experiencia-de-usuario-ux)
    * [9.3. Arquitectura Offline-First y Sincronización Automática](#93-arquitectura-offline-first-y-sincronización-automática)
  * [10. Plataforma Cloud y Consola Web GIS (Supabase + PostGIS)](#10-plataforma-cloud-y-consola-web-gis-supabase--postgis)
    * [10.1. Arquitectura Multi-Rol (Agricultor, Asesor Técnico, Admin)](#101-arquitectura-multi-rol-agricultor-asesor-técnico-admin)
    * [10.2. Consola Web de Gestión Geoespacial y Mapeo de Calor](#102-consola-web-de-gestión-geoespacial-y-mapeo-de-calor)
    * [10.3. Actualización de Firmware Over-The-Air (WiFi OTA)](#103-actualización-de-firmware-over-the-air-wifi-ota)
* [🎯 PARTE V: VALIDACIÓN, DEFENSA Y PUESTA EN MARCHA](#-parte-v-validación-defensa-y-puesta-en-marcha)
  * [11. Criterios de Éxito y Validación Experimental (KPIs)](#11-criterios-de-éxito-y-validación-experimental-kpis)
  * [12. Guía de Defensa Hostil (Las 7 Preguntas Incómodas)](#12-guía-de-defensa-hostil-las-7-preguntas-incómodas)
  * [13. Guía de Puesta en Marcha y Entornos de Desarrollo](#13-guía-de-puesta-en-marcha-y-entornos-de-desarrollo)
  * [14. Estructura Integral del Repositorio](#14-estructura-integral-del-repositorio)

---

# 🏛️ PARTE I: VISIÓN ESTRATÉGICA, PROBLEMÁTICA Y MERCADO

## 1. Problemática del Agro y Propuesta de Valor

### 1.1. La Brecha que Nadie ha Cerrado: Parálisis de Interpretación

En Chile y en toda Latinoamérica, existen decenas de dispositivos capaces de medir variables del suelo: desde instrumentos manuales económicos hasta costosas estaciones fijas de investigación. Sin embargo, todos adolecen de la misma falla estructural:

**Entregan datos crudos y dejan al agricultor en completa incertidumbre.**

```text
ESTADO DEL ARTE HOY (Cualquier competidor):
┌─────────────────────────────────────────────────────────┐
│  SENSOR DE SUELO  ──►  DATO CRUDO  ──►  AGRICULTOR      │
│                                                         │
│  pH:    5.1             "¿Qué significa esto?"          │
│  EC:    2.400 µS/cm     "¿Puedo sembrar tomates hoy?"   │
│  Temp:  9.3°C           "¿Cuánto fertilizante aplico?"  │
│  N:     23 mg/kg        "¿Qué cultivo tolera mi suelo?" │
│  P:     12 mg/kg                                        │
│  K:     23 mg/kg        ❌ NADIE RESPONDE               │
│  VWC:   38%                                             │
└─────────────────────────────────────────────────────────┘
```

---

### 1.2. La Realidad del Campo Chileno en Cifras

* **278.000 explotaciones** agropecuarias en Chile (el **92%** corresponde a Agricultura Familiar Campesina y medianos productores), abarcando más de **12 millones de hectáreas** *(ODEPA / FAO)*.
* **0% de análisis in situ previo a la siembra:** La inmensa mayoría siembra guiada por intuición empírica o calendarios tradicionales desfasados por el cambio climático.
* **$40.000 a $60.000 CLP por muestra** cuesta un análisis químico tradicional de laboratorio, tardando de **1 a 4 semanas** en entregar resultados. Para cuando llega el informe, la ventana agronómica de siembra ya expiró.
* **$80.000 a $200.000 CLP por visita** cobra un asesor agronómico privado, cuya disponibilidad física en terreno es limitada frente a la urgencia diaria del agricultor.

> *"No vendemos un sensor: vendemos la certeza de saber, antes de sembrar, si la tierra está lista, qué cultivo plantar y exactamente qué enmienda aplicar."*

---

### 1.3. Qué hace TerraSense que nadie más hace: De Sensor a Asistente IA

TerraSense transforma un conjunto de variables físico-químicas en una **instrucción agronómica ejecutable e instantánea**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FLUJO TERRASENSE                                │
│                                                                        │
│  MEDICIÓN IN-SITU ──► MOTOR AGRONÓMICO IA ──► DIAGNÓSTICO EN ≤ 5 SEG   │
│   (Sonda Inox 316L)       (En el Smartphone)                           │
│                                                ├─► VEREDICTO SEMÁFORO  │
│                                                ├─► CULTIVOS APTOS (+80)│
│                                                ├─► ALERTAS DE CLIMA    │
│                                                ├─► DOSIS DE ENMIENDA   │
│                                                └─► MAPA SATELITAL GIS  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 1.4. Los 5 Pilares de Diferenciación Tecnológica

1. 🧠 **Diagnóstico Instantáneo de Deficiencias:** En menos de 5 segundos traduce valores como `pH 5.1` y `K 23 mg/kg` a instrucciones directas: *"Acidez bloquea fósforo. Aplica 500 kg/ha de cal agrícola antes de sembrar"*.
2. 🌿 **Lista de Cultivos Compatibles en Tiempo Real:** Cruza los 7 parámetros sensados contra una matriz biológica de **+80 cultivos**, clasificándolos en: *Aptos*, *Aptos con corrección* y *No recomendados*.
3. 🌦️ **Alertas Climáticas Predictivas (7 Días GPS):** Vincula el estado del suelo con el pronóstico meteorológico local (ej. *"Suelo al 38% VWC + 45 mm de lluvia prevista en 48h = riesgo de asfixia radicular. Posponer siembra 10 días"*).
4. ⚡ **Velocidad de Decisión (De Semanas a Segundos):** Reduce el ciclo de retroalimentación agronómica de 21 días (laboratorio) a **≤ 5 segundos** directamente en el potrero.
5. 🗺️ **Mapeo Satelital Geoespacial del Predio:** Georreferencia automáticamente cada pinchazo, generando mapas de variabilidad de fertilidad para aplicar enmiendas dirigidas por sector.

---

## 2. Análisis Competitivo y Matriz de Brechas

TerraSense se posiciona en el segmento de entrada profesional con un precio estimado de **$170.000 a $200.000 CLP** (~$178–$210 USD). En ese rango y hacia el segmento superior, el panorama competitivo es el siguiente:

### 2.1. Mapa de Rivales Reales ($170.000 – $300.000+ CLP)

#### Rival A — Bluelab Pulse Multimedia Meter (~$265–$350 USD / ~$255.000–$335.000 CLP)
* **Lo que tiene Bluelab:** Electrodo de vidrio de alta precisión, marca consolidada (+20 años), app BLE para registro de humedad/temperatura/EC y soluciones de calibración certificadas.
* **Lo que le falta frente a TerraSense:** **No mide NPK ni pH** (requiere medidores separados), no tiene motor agronómico, no sugiere cultivos, no integra clima, no georreferencia en mapa satelital y está orientado a sustratos hidropónicos/invernaderos, no a suelo agrícola abierto.

#### Rival B — Hanna Instruments HI9814 GroLine (~$310 USD / ~$295.000 CLP)
* **Lo que tiene Hanna:** Electrodo pre-amplificado IP67 resistente a interferencias, calibración rápida (*Quick-Cal*), compensación automática de temperatura y respaldo técnico en Chile (Veto.cl).
* **Lo que le falta frente a TerraSense:** **No mide NPK**, no tiene conectividad inalámbrica ni app móvil, no tiene GPS, no ofrece recomendaciones agronómicas y requiere preparar soluciones de suelo disuelto en agua para medir pH (no es inserción directa rápida).

#### Rival C — Análisis de Laboratorio Químico (~$35.000–$60.000 CLP / muestra)
* **Lo que tiene el Laboratorio:** Exactitud metrológica absoluta por espectrometría (ICP-OES), validez legal/SAG e informe de micronutrientes y materia orgánica.
* **Lo que le falta frente a TerraSense:** **Demora de 1 a 4 semanas**, costo prohibitivo para muestreo denso ($400.000+ CLP para 10 puntos), muestra estática que no refleja cambios térmicos o hídricos diarios y carece de integración con clima en tiempo real.

#### Rival D — Asesor Agrónomo Particular ($80.000–$200.000 CLP / visita)
* **Lo que tiene el Asesor:** Criterio profesional para diagnóstico visual de plagas, patógenos y gestión de créditos INDAP.
* **Lo que le falta frente a TerraSense:** Costo inviable para consultas diarias, agenda con semanas de desfase, sin disponibilidad inmediata a las 7:00 AM del día de siembra y diagnósticos sin respaldo geoespacial continuo.

---

### 2.2. Matriz Comparativa de Brechas

| Capacidad / Función | Bluelab Pulse | Hanna HI9814 | Laboratorio Químico | Asesor Privado | **TerraSense IoT** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Precio Unitario** | ~$265–$350 USD | ~$310 USD | $35–60K CLP/muestra | $80–200K CLP/visita | **~$185 USD (Único)** |
| **Inserción In-Situ Directa** | ✅ | Parcial *(Slurry)* | ❌ | ❌ | **✅ (Inox 316L)** |
| **Medición de NPK** | ❌ | ❌ | ✅ | Con laboratorio | **✅ (Reactividad)** |
| **Medición de pH Suelo** | ❌ *(Solo EC)* | ✅ | ✅ | Con laboratorio | **✅ (Estado Sólido)** |
| **Tiempo de Respuesta** | < 5 s | < 10 s | 1–4 semanas | 2–14 días | **≤ 5 segundos** |
| **Conectividad App Móvil** | ✅ *(Básica)* | ❌ | ❌ | ❌ | **✅ (BLE + Nube)** |
| **Motor Agronómico IA** | ❌ | ❌ | Parcial *(Manual)* | ✅ | **✅ (Instantáneo)** |
| **Lista de Cultivos Aptos** | ❌ | ❌ | ❌ | ✅ | **✅ (+80 Especies)** |
| **Dosis de Enmienda Cuantificada**| ❌ | ❌ | ✅ *(En informe)* | ✅ | **✅ (kg/ha + costo)**|
| **Alertas Climáticas (GPS)** | ❌ | ❌ | ❌ | Parcial | **✅ (7 Días)** |
| **Mapa Satelital GIS Predial** | ❌ | ❌ | ❌ | ❌ | **✅ (PostGIS)** |
| **Operación 100% Offline** | ✅ | ✅ | ❌ | ✅ | **✅ (Store&Forward)**|
| **Costo por Medición** | $0 | $0 | ~$40.000 CLP | ~$80.000 CLP | **$0 CLP** |

---

### 2.3. Transparencia Técnica: Lo que TerraSense Admite Honestamente

Para garantizar rigor académico y honestidad técnica en defensa:

* **Electrodo NPK de Estado Sólido ≠ Espectrometría de Laboratorio:** Las mediciones de N, P y K se basan en reactividad iónica superficial de CA. Son estimaciones relativas altamente precisas para **clasificación de rangos y detección de anomalías**, no para dosificación farmacéutica gramo a gramo.
* **Sin Detección de Micronutrientes Específicos:** TerraSense no mide elementos traza como Boro, Cobre, Zinc o Molibdeno. Para corregir micro-deficiencias graves se recomienda un análisis químico complementario de laboratorio cada 2 o 3 años.
* **No reemplaza al agrónomo en fitopatología visual:** El sensor diagnostica la condición físico-química del suelo; no detecta virus, bacterias o insectos en follaje.

---

### 2.4. Ventajas Defensivas de TerraSense (Moats)

1. **Algoritmia Regionalizada:** Base de datos calibrada específicamente para suelos volcánicos (trumaos del sur), vertisoles arcillosos del Valle Central y condiciones hídricas de Chile y Latinoamérica.
2. **Arquitectura 7-en-1 Integrada:** Un solo hardware realiza el trabajo de 3 instrumentos separados cuyo costo combinado superaría los $700 USD.
3. **Ecosistema Abierto sin Suscripción Cautiva:** El usuario es dueño de su hardware y de sus datos históricos en PostgreSQL, sin cobros mensuales por acceder a sus mapas.

---

## 3. Modelo Económico y Viabilidad Comercial

### 3.1. Estructura de Costos Industriales (BOM Lote 100 unidades)

| Componente / Módulo | Descripción Técnica / SKU | Costo Unitario (CLP) | Costo Unitario (USD) |
| :--- | :--- | :---: | :---: |
| **Sonda Suelo 7-en-1 Industrial** | Sonda RS-485 Modbus Inox 316L (VWC, T, EC, pH, N, P, K) | $16.500 CLP | $17.20 USD |
| **Microcontrolador ESP32** | ESP32-WROOM-32 DevKit v1 (Xtensa Dual-Core, BLE, WiFi) | $2.900 CLP | $3.00 USD |
| **Sensor Ambiental I2C** | Bosch BME280 (Temperatura, Humedad Relativa, Presión) | $800 CLP | $0.80 USD |
| **Etapa de Potencia & RS-485** | N-MOSFET 2N7002 + Boost MT3608 (12V) + MAX485 | $1.200 CLP | $1.25 USD |
| **Sistema de Carga & BMS USB-C** | Módulo TP5100 (2A, gestión Li-Ion con protección) | $1.500 CLP | $1.50 USD |
| **Baterías Li-Ion (2 Celdas)** | 2× 18650 Li-Ion 3.000 mAh en paralelo (~6.000 mAh) | $7.600 CLP | $8.00 USD |
| **PCB Fabricación & SMT** | Placa FR4 2 capas con serigrafía + ensamblaje de componentes | $2.500 CLP | $2.60 USD |
| **Carcasa Rugged IP67 & Switches**| Gabinete ABS industrial con prensaestopas, rocker switch, LED | $5.000 CLP | $5.20 USD |
| **Empaque, Calibración & QA** | Caja de presentación, espumas, soluciones de prueba y control QA | $4.000 CLP | $4.20 USD |
| **TOTAL COSTO DIRECTO (BOM)** | | **$42.000 CLP** | **$43.75 USD** |

---

### 3.2. Precio de Venta al Público (PVP) y Margen de Rentabilidad

$$\begin{aligned}
\text{Costo Industrial de Fabricación (BOM):} & \quad \mathbf{\$42.000\text{ CLP}}\quad(\approx \$44\text{ USD}) \\
\text{Precio de Venta al Público (PVP Objetivo):} & \quad \mathbf{\$179.990\text{ CLP}}\quad(\approx \$188\text{ USD}) \\
\text{Margen Bruto Unitario:} & \quad \$179.990 - \$42.000 = \mathbf{\$137.990\text{ CLP}}\quad(\mathbf{76.6\% \text{ Margen}})
\end{aligned}$$

---

### 3.3. Dimensionamiento de Mercado en Chile (TAM / SAM / SOM)

* **TAM (Total Addressable Market):** **278.000 explotaciones agropecuarias** en Chile.
* **SAM (Serviceable Available Market):** **83.400 explotaciones** (productores con smartphone, cobertura y cultivos comerciales hortofrutícolas).
* **SOM (Serviceable Obtainable Market - Meta Año 1):** **834 unidades (1% de SAM)**.

$$\begin{aligned}
\text{Facturación Bruta Año 1 (834 equipos } \times \$179.990\text{):} & \quad \mathbf{\$150.111.660\text{ CLP}}\quad(\approx \$158.000\text{ USD}) \\
\text{Costo Total de Producción (834 } \times \$42.000\text{):} & \quad \mathbf{\$35.028.000\text{ CLP}} \\
\mathbf{\text{MARGEN BRUTO GENERADO:}} & \quad \mathbf{\$115.083.660\text{ CLP}}\quad(\approx \$121.000\text{ USD})
\end{aligned}$$

---

# 🧬 PARTE II: MOTOR AGRONÓMICO Y MODELOS CIENTÍFICOS

## 4. Arquitectura del Motor Agronómico IA

El núcleo diferencial de TerraSense reside en su **motor de inferencia agronómica multicapa**, ejecutado de forma nativa en el dispositivo móvil y respaldado por modelos geoestadísticos en la nube:

```text
                  ARQUITECTURA DEL MOTOR DE REGLAS AGRONÓMICAS
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 1: MATRIZ BIOLÓGICA DE CULTIVOS (+80 Especies)                         │
│ • Umbrales de pH óptimo/crítico • Conductividad máxima de germinación       │
│ • Temperatura base de suelo (Tb) • Rangos NPK por etapa fenológica          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 2: MOTOR DE DIAGNÓSTICO FÍSICO-QUÍMICO                                 │
│ • Detección de bloqueos iónicos (pH vs Fósforo/Micronutrientes)             │
│ • Identificación de estrés osmótico (EC) y frío de suelo (< Tb)             │
│ • Evaluación de riesgo de asfixia radicular (VWC > Capacidad de Campo)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 3: GENERADOR DE RECOMENDACIONES Y ENMIENDAS CUANTIFICADAS              │
│ • Cálculo de dosis de enmienda (kg/ha de Cal agrícola / Yeso / Sulfatos)    │
│ • Estimación de costo económico de insumos para la superficie indicada      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 4: INTEGRACIÓN CLIMÁTICA Y VENTANAS DE SIEMBRA                         │
│ • Pronóstico meteorológico GPS 7 días (Lluvia, Heladas, Radiación)         │
│ • Cálculo de Evapotranspiración (ET₀) y Déficit de Presión de Vapor (VPD)   │
│ • Veredicto final: Semáforo (🟢 Verde, 🟡 Ámbar, 🔴 Rojo) + Lista Cultivos │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.1. Capa 1 — Perfiles de Cultivo y Umbrales Fisiológicos (+80 Especies)

Cada especie vegetal cuenta con una definición agronómica estructurada:

```json
{
  "cultivo_id": "solanum_lycopersicum",
  "nombre_comun": "Tomate",
  "familia": "Solanáceas",
  "umbrales_fisiologicos": {
    "ph": { "critico_bajo": 5.5, "min_optimo": 6.0, "max_optimo": 6.8, "critico_alto": 7.5 },
    "ec_us_cm": { "optimo": 1500, "max_germinacion": 2000, "limite_toxicidad": 2800 },
    "temp_suelo_c": { "cero_vegetativo": 10.0, "min_siembra": 12.0, "optima": 22.0, "max": 35.0 },
    "vwc_porcentaje": { "punto_marchitez": 12.0, "min_optimo": 25.0, "capacidad_campo": 38.0, "asfixia": 55.0 },
    "npk_mg_kg": { "n_min": 50, "n_opt": 100, "p_min": 30, "p_opt": 60, "k_min": 100, "k_opt": 200 }
  }
}
```

---

### 4.2. Capa 2 — Diagnóstico de Deficiencias y Toxicidades

| Parámetro Sensado | Condición Crítica Detectada | Diagnóstico Agronómico Automatizado |
| :--- | :--- | :--- |
| **pH Suelo** | $\text{pH} < 5.5$ (Acidez Fuerte) | *"Acidez crítica. El Fósforo está insolubilizado como fosfato de aluminio/hierro. Aplicar cal agrícola para desbloquear asimilación."* |
| **Conductividad (EC)** | $\text{EC} > 2.400\,\mu\text{S/cm}$ | *"Salinidad severa. Provoca estrés osmótico y quema radicular. Aplicar riego de lavado de sales antes del trasplante."* |
| **Temperatura Suelo** | $T_{\text{suelo}} < 12.0^\circ\text{C}$ | *"Suelo bajo el cero vegetativo para solanáceas/cucurbitáceas. Riesgo inminente de pudrición de semilla por hongos del suelo."* |
| **Humedad (VWC)** | $\text{VWC} > 45\%$ | *"Contenido hídrico sobre capacidad de campo. Riesgo de anoxia radicular y ataque de Phytophthora/Pythium."* |
| **Potasio (K)** | $\text{K} < 40\,\text{mg/kg}$ | *"Deficiencia severa de Potasio. Pérdida de turgencia celular y alta susceptibilidad a estrés térmico."* |

---

### 4.3. Capa 3 — Plan de Enmiendas y Fertilización Cuantificada

TerraSense no solo reporta la carencia; calcula la **dosis exacta de producto comercial** según el área declarada por el agricultor:

$$\text{Dosis Cal Agrícola (kg/ha)} = (\text{pH}_{\text{objetivo}} - \text{pH}_{\text{actual}}) \times \text{Factor Buffer Suelo} \times 1.000$$

```text
EJEMPLO DE PRESCRIPCIÓN GENERADA EN LA APP:
─────────────────────────────────────────────────────────────────
SECTOR: Potrero Bajo (Superficie: 0.8 ha)
DIAGNÓSTICO: pH actual = 5.1  |  Potasio = 23 mg/kg
OBJETIVO: Siembra de Maíz Dulce

PLAN DE APLICACIÓN RECOMENDADO:
1. Encalado: Aplicar 480 kg de Cal Agrícola (CaCO₃) al voleo.
   Incorporar con rastra 15 días antes de la siembra.
   Costo estimado: ~$35.000 CLP.
2. Fertilización Potásica: Aplicar 100 kg de Sulfato de Potasio.
   Costo estimado: ~$45.000 CLP.
─────────────────────────────────────────────────────────────────
```

---

### 4.4. Capa 4 — Integración Climática Predictiva (7 Días GPS)

El motor consulta la API meteorológica georreferenciada del predio y cruza:
* **Precipitaciones acumuladas pronosticadas:** Si se pronostican $> 25\text{ mm}$ en suelos con VWC $> 35\%$, bloquea la siembra por riesgo de lavado de semillas y compactación.
* **Temperaturas mínimas nocturnas:** Alerta de heladas agronómicas ($< 2^\circ\text{C}$) en cultivos sensibles recién trasplantados.
* **Índice UV y Temperatura Ambiental:** Evalúa la velocidad de desecación superficial mediante el cálculo de evapotranspiración.

---

## 5. Parámetros de Medición y Modelos Físico-Químicos

### 5.1. Matriz de Parámetros Sensados (Suelo 7-en-1 + Ambiente BME280)

| Sensor / Subsistema | Parámetro Físico | Rango de Medición | Precisión Metrológica | Utilidad en el Diagnóstico |
| :--- | :--- | :---: | :---: | :--- |
| **Sonda Suelo Inox 316L** | **Humedad Volumétrica (VWC)** | $0 - 100\%$ | $\pm 2\%$ ($0-50\%$) | Balance hídrico, punto de marchitez y encharcamiento. |
| **Sonda Suelo Inox 316L** | **Temperatura de Suelo** | $-40 \text{ a } +80^\circ\text{C}$ | $\pm 0.3^\circ\text{C}$ | Superación del umbral térmico de germinación. |
| **Sonda Suelo Inox 316L** | **Conductividad Eléctrica (EC)** | $0 - 20.000\,\mu\text{S/cm}$ | $\pm 3\%$ | Salinidad efectiva y riesgo osmótico en raíces. |
| **Sonda Suelo Inox 316L** | **pH de Suelo** | $3.0 - 9.0\text{ pH}$ | $\pm 0.1\text{ pH}$ | Disponibilidad y bloqueo químico de macro/micronutrientes. |
| **Sonda Suelo Inox 316L** | **Nitrógeno (N)** | $1 - 1.999\text{ mg/kg}$ | $\pm 5\%$ | Vigor vegetativo inicial y desarrollo foliar. |
| **Sonda Suelo Inox 316L** | **Fósforo (P)** | $1 - 1.999\text{ mg/kg}$ | $\pm 5\%$ | Reserva energética y estimulación radicular temprana. |
| **Sonda Suelo Inox 316L** | **Potasio (K)** | $1 - 1.999\text{ mg/kg}$ | $\pm 5\%$ | Regulación estomática, tolerancia al frío y llenado de fruto. |
| **Bosch BME280 (I2C)** | **Temperatura Ambiental** | $-40 \text{ a } +85^\circ\text{C}$ | $\pm 1.0^\circ\text{C}$ | Gradiente térmico aire-suelo y riesgo de heladas. |
| **Bosch BME280 (I2C)** | **Humedad Relativa Aire** | $0 - 100\%\text{ HR}$ | $\pm 3\%\text{ HR}$ | Cálculo de VPD y condiciones predisponentes a hongos. |
| **Bosch BME280 (I2C)** | **Presión Barométrica** | $300 - 1.100\text{ hPa}$ | $\pm 1.0\text{ hPa}$ | Detección de frentes de mal tiempo y altitud predial. |

---

### 5.2. Modelos de Balance Hídrico, AUD y Evapotranspiración (VPD / ET₀)

#### 1. Agua Útil Disponible (AUD)
$$\text{AUD} = (\theta_{\text{CC}} - \theta_{\text{PMP}}) \times Z_r$$
Donde $\theta_{\text{CC}}$ es la Capacidad de Campo, $\theta_{\text{PMP}}$ es el Punto de Marchitez Permanente y $Z_r$ es la profundidad radicular activa en milímetros.

#### 2. Déficit de Presión de Vapor (VPD)
El BME280 permite calcular el VPD ambiental para anticipar el estrés hídrico:
$$\text{VPD} = \text{VP}_{\text{sat}} \times \left(1 - \frac{\text{HR}}{100}\right) \quad \text{donde} \quad \text{VP}_{\text{sat}} = 0.61078 \times \exp\left(\frac{17.27 \times T_{\text{aire}}}{T_{\text{aire}} + 237.3}\right)$$

* **$\text{VPD} < 0.4\text{ kPa}$:** Transpiración vegetal bloqueada; alta propensión a enfermedades fungosas (*Botrytis*, *Oídio*).
* **$\text{VPD} \in [0.8, 1.2]\text{ kPa}$:** Rango de confort transpiratorio óptimo.
* **$\text{VPD} > 1.6\text{ kPa}$:** Estrés hídrico severo; cierre estomático preventivo de la planta.

---

# ⚡ PARTE III: INGENIERÍA DE HARDWARE Y ELECTRÓNICA

## 6. Especificación y Diseño Electrónico

### 6.1. Diagrama de Arquitectura Integral de Sistema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DIAGRAMA DE HARDWARE TERRASENSE                          │
│                                                                             │
│  ┌──────────┐   ┌──────────┐    ┌─────────────────────────────────────┐    │
│  │ 18650 #1 │   │ 18650 #2 │    │         MÓDULO TP5100               │    │
│  │  3.7V    ├───┤  3.7V    ├───►│  BMS + Cargador 2A + USB-C         │    │
│  │ 3000 mAh │   │ 3000 mAh │    │  Protección: Sobrecarga, Subcarga,SC│    │
│  └──────────┘   └──────────┘    └──────────────┬──────────────────────┘    │
│                                                │ Bus 3.7–4.2V              │
│                  ┌─────────────────────────────┼───────────────────┐       │
│                  │                             │                   │       │
│                  ▼                             ▼                   ▼       │
│          ┌──────────────┐            ┌─────────────────┐   ┌─────────────┐ │
│          │  ROCKER SW   │            │  MT3608 Boost   │   │   ESP32     │ │
│          │  (Corte      │            │  3.7V → 12V DC  │   │  WROOM-32   │ │
│          │   Físico)    │            │  Alim. Sonda    │   │  BLE + WiFi │ │
│          └──────────────┘            └────────┬────────┘   └──────┬──────┘ │
│                                               │                   │        │
│                                               ▼                   │ I2C    │
│                                    ┌─────────────────┐            ▼        │
│                                    │  Sonda NPK      │   ┌───────────────┐ │
│                                    │  7-en-1 RS-485  │   │ Bosch BME280  │ │
│                                    │  (5–30V DC)     │   │ T° + HR + Bar │ │
│                                    └────────┬────────┘   └───────────────┘ │
│                                             │ RS-485                       │
│                                             ▼                              │
│                                    ┌─────────────────┐                     │
│                                    │  MAX485 / SP3485│                     │
│                                    │  Transceptor    │◄────── ESP32 UART2  │
│                                    └─────────────────┘        (GPIO 16/17) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.2. Microcontrolador Principal: ESP32-WROOM-32 y Pinout

El sistema está gobernado por un **ESP32-WROOM-32 (Espressif Systems)** con CPU Xtensa Dual-Core @ 240 MHz:

| Señal / Periférico | Pin GPIO ESP32 | Tipo / Configuración | Función en TerraSense |
| :--- | :---: | :---: | :--- |
| **UART2 RX** | **GPIO 16** | Entrada Digital | Recepción de tramas Modbus RTU desde MAX485 |
| **UART2 TX** | **GPIO 17** | Salida Digital | Transmisión de consultas Modbus RTU hacia MAX485 |
| **RS-485 DE / RE** | **GPIO 18** | Salida Digital | Control de dirección de bus RS-485 (Transmisión / Recepción) |
| **I2C SDA** | **GPIO 21** | Bidireccional Open-Drain | Línea de datos para sensor ambiental BME280 |
| **I2C SCL** | **GPIO 22** | Salida Open-Drain | Línea de reloj para sensor ambiental BME280 |
| **Power Gate Boost** | **GPIO 4** | Salida Digital | Gate de N-MOSFET (HIGH = Energiza Boost 12V y Sonda) |
| **LED RGB WS2812B** | **GPIO 5** | Salida Digital (1-Wire) | Indicador luminoso multicolor de estado del sistema |
| **Pulsador de Pairing** | **GPIO 0** | Entrada Pull-up Int. | Activación de pairing BLE (corto) / Reset fábrica (5s) |
| **Medición Batería ADC** | **GPIO 34** | Entrada Analógica | Divisor de tensión para monitoreo de voltaje Li-Ion |

---

### 6.3. Sensor Ambiental Integrado: Bosch BME280 I2C

Integrado en la placa PCB interna con ventilación hidrofóbica ePTFE (membrana Gore-Tex respirable):
* **Dirección I2C:** `0x76` (o `0x77` seleccionable).
* **Consumo activo:** $3.6\,\mu\text{A}$ a $1\text{ Hz}$.
* Permite independizar la lectura climática superficial de las condiciones internas del gabinete.

---

### 6.4. BOM Detallado de Componentes Electrónicos

| Item | Componente | Encapsulado / Módulo | Especificación Clave |
| :---: | :--- | :--- | :--- |
| 1 | Microcontrolador | ESP32-WROOM-32D | Dual-Core 240 MHz, 4MB Flash, BLE 5.0 + WiFi |
| 2 | Sensor Ambiental | Bosch BME280 | I2C, $T^\circ$, Humedad Relativa y Presión |
| 3 | Sonda de Suelo | Sonda 7-en-1 RS-485 | Acero Inoxidable 316L, Modbus RTU, 5–30V DC |
| 4 | Transceptor RS-485 | MAX485 / SP3485 | Conversión UART TTL a diferencial RS-485 |
| 5 | Convertidor Boost | MT3608 Step-Up | Eleva 3.7V nominal a 12V DC regulados ($\eta \approx 92\%$) |
| 6 | Transistor de Corte | 2N7002 / AO3400 | N-MOSFET $V_{\text{DS}} = 30\text{V}$, $R_{\text{DS(on)}} < 0.05\,\Omega$ |
| 7 | Sistema de Carga/BMS | Módulo TP5100 | Carga Li-Ion 2A con protección integral y USB-C |
| 8 | Baterías | 2× Celda 18650 Li-Ion | $3.7\text{V}$, $3.000\text{ mAh}$ c/u en paralelo ($6.000\text{ mAh}$ total) |
| 9 | Interruptor Principal | Rocker Switch SPST | Interruptor basculante 250V/3A de corte físico total |
| 10 | LED Piloto | WS2812B NeoPixel | LED direccionable digital RGB 5050 |
| 11 | Gabinete | Caja ABS IP67 | Carcasa sellada con O-ring de silicona y prensaestopas PG7 |

---

### 6.5. Interfaz Física del Dispositivo (Panel, LED WS2812B, Pulsador)

```text
                    PANEL FRONTAL DEL DISPOSITIVO
      ┌────────────────────────────────────────────────────────┐
      │                                                        │
      │    🔴/🟢/🔵 LED RGB                 [ PAIR ]           │
      │    WS2812B Estado                 Pulsador Táctil      │
      │                                                        │
      │    ━━━━━━━━━━━━━━━━━  USB-C ▬ (Carga 2A)               │
      │                                                        │
      │    [  ○  OFF   |   ON  ○  ]  ← Rocker Switch           │
      │                                                        │
      └────────────────────────────────────────────────────────┘
                                   │
                                   ▼ Prensaestopas IP67
                         Cable hacia Sonda Inox 316L
```

#### Código de Colores del LED RGB (WS2812B)

| Estado del Dispositivo | Color LED | Patrón Visual | Significado Operacional |
| :--- | :---: | :--- | :--- |
| **Buscando Conexión** | 🔵 Azul | Pulso suave (1 Hz) | Equipo encendido, esperando conexión BLE con app. |
| **Modo Pairing Activo** | 🔵 Azul | Parpadeo rápido (4 Hz) | Pulsador presionado; ventana de enlace abierta (30 s). |
| **Enlazado y Listo** | 🟢 Verde | Luz fija continua | Conexión BLE establecida con el smartphone. |
| **Medición Exitosa** | 🟢 Verde | 3 destellos rápidos | Lectura Modbus y BME280 capturada y enviada. |
| **Batería Baja** | 🟠 Naranja | Pulso lento | Batería $< 15\%$ ($V_{\text{bat}} < 3.4\text{V}$). Recargar por USB-C. |
| **Error de Sonda** | 🔴 Rojo | Parpadeo continuo | Falla de respuesta Modbus UART o timeout de sonda. |
| **Reset de Fábrica** | 🔴 Rojo | Fijo por 3 segundos | NVS borrada; equipo restaurado a estado de fábrica. |

#### Lógica del Pulsador Multifunción

* **Pulsación Corta ($< 1\text{ s}$):** Activa el modo de anuncio BLE forzado para vincular un nuevo teléfono móvil.
* **Pulsación Larga ($\ge 5\text{ s}$):** Ejecuta el borrado de la partición NVS del ESP32 (*Factory Reset*), eliminando el bonding previo para transferencia a un nuevo dueño.

---

### 6.6. Persistencia de Vinculación BLE tras Apagado (Flash NVS)

El ESP32 almacena las claves de emparejamiento y bonding en su partición **NVS (Non-Volatile Storage)**:
1. El agricultor vincula su teléfono una sola vez mediante el código PIN.
2. Al apagar el equipo con el *Rocker Switch*, las claves quedan guardadas en la memoria Flash no volátil.
3. Al encender nuevamente el equipo en terreno, el enlace BLE se restablece en **$< 1.5\text{ segundos}$** sin requerir interacción manual.

---

### 6.7. Roadmap de Hardware v2.0

* **Display OLED monocromático de 0.96" (I2C):** Lectura directa de pH, Humedad y T° en pantalla para uso sin smartphone.
* **Buzzer piezoeléctrico SMD:** Señal sonora de confirmación de medición exitosa y alerta de batería crítica.
* **Conector M8 / M12 Industrial IP68:** Desconexión rápida de la sonda para facilitar transporte y reemplazo.

---

## 7. Sistema de Potencia y Eficiencia Energética

### 7.1. Sistema de Carga USB-C y Gestión de Batería (TP5100 + 2× 18650)

* **Capacidad Total:** $6.000\text{ mAh}$ a $3.7\text{V}$ nominal ($22.2\text{ Wh}$) mediante 2 celdas 18650 grado A en paralelo.
* **Cargador Rápido TP5100:** Corriente de carga de $2.0\text{ A}$ constante (tiempo de carga completa: $\approx 3.5\text{ horas}$).
* **Protecciones Integradas:** Corte por sobrevoltaje ($4.2\text{V}$), desconexión por sobredescarga ($2.9\text{V}$) y protección contra cortocircuitos.

---

### 7.2. Control de Alimentación del Boost MT3608 por MOSFET

Para evitar el drenaje de corriente en reposo del convertidor elevador y de la sonda RS-485 (que consumirían entre 25 y 40 mA de forma permanente), se implementa **aislamiento por transistor MOSFET**:

```text
         CIRCUITO DE CONTROL DE ENERGÍA (POWER GATING)
                     +VBAT (3.7V - 4.2V)
                             │
                       ┌─────┴─────┐
                       │  N-MOSFET │
                       │  2N7002   │◄─── GPIO 4 del ESP32
                       └─────┬─────┘     (HIGH = Activo / LOW = 0 mA)
                             │
               ┌─────────────┴─────────────┐
               ▼                           ▼
   ┌───────────────────────┐   ┌───────────────────────┐
   │ MT3608 Boost Step-Up  │   │ MAX485 Transceiver    │
   │ 3.7V → 12V DC Sonda   │   │ Bus de Comunicación   │
   └───────────┬───────────┘   └───────────┬───────────┘
               └─────────────┬─────────────┘
                             ▼
              ┌─────────────────────────────┐
              │ Sonda Suelo 7-en-1 (Inox)   │
              │ EN REPOSO: 0.0 µA           │
              └─────────────────────────────┘
```

---

### 7.3. Perfil de Consumo Eléctrico y Autonomía en Terreno

| Estado de Operación | Subsistemas Activos | Corriente Típica | Duración |
| :--- | :--- | :---: | :---: |
| **Apagado Total (Rocker OFF)** | Ninguno (circuito abierto físico) | **$0.0\,\mu\text{A}$** | Indefinida |
| **Standby BLE (Conectado)** | ESP32 (Radio BLE activo) + BME280 | $\approx 22\text{ mA}$ | Entre mediciones |
| **Ciclo de Medición Activa** | Boost 12V + Sonda 7-en-1 + MAX485 + ESP32 | $\approx 65\text{ mA}$ | $150\text{ ms}$ |
| **Transmisión de Ráfaga BLE** | ESP32 TX @ $+9\text{ dBm}$ | $\approx 85\text{ mA}$ | $50\text{ ms}$ |

#### Estimación de Autonomía con 2× 18650 (6.000 mAh):
* **Uso Práctico en Terreno (Encender, medir 15 puntos y apagar):** **$> 6\text{ meses}$** con una sola carga USB-C.
* **Modo Muestreo Intensivo Continuo (Sin apagar rocker switch):** **$\approx 11\text{ días}$** de funcionamiento ininterrumpido.

---

## 8. Protocolos de Comunicación Industrial e Inalámbrica

### 8.1. Trama Industrial RS-485 Modbus RTU (Sonda NPK)

El ESP32 realiza consultas periódicas mediante protocolo estándar **Modbus RTU** a $9.600\text{ bps}$ ($8\text{N}1$):

```text
[TRAMA DE CONSULTA - 8 Bytes]:
0x01 (ID Dispositivo) | 0x03 (Función Read Holding Registers) | 0x00 0x00 (Registro Base) | 0x00 0x07 (7 Registros) | 0x04 0x08 (CRC16)

[TRAMA DE RESPUESTA DE LA SONDA - 19 Bytes Totales / 14 Bytes de Datos]:
Byte 0-1   : Humedad Volumétrica (VWC)   -> ej. 0x015E = 350  -> 35.0 %
Byte 2-3   : Temperatura del Suelo       -> ej. 0x00F5 = 245  -> 24.5 °C
Byte 4-5   : Conductividad Eléctrica (EC)-> ej. 0x04D2 = 1234 -> 1234 µS/cm
Byte 6-7   : pH del Suelo                -> ej. 0x0041 = 65   -> 6.5 pH
Byte 8-9   : Nitrógeno (N)               -> ej. 0x002D = 45   -> 45 mg/kg
Byte 10-11 : Fósforo (P)                 -> ej. 0x001E = 30   -> 30 mg/kg
Byte 12-13 : Potasio (K)                 -> ej. 0x0050 = 80   -> 80 mg/kg
```

---

### 8.2. Comunicación Bluetooth 5.0 BLE (GATT) hacia el Smartphone

* **Servicio Primario TerraSense:** UUID `00000001-5e4e-4c69-6d61-746572726101`
* **Característica de Telemetría (Read / Notify):** UUID `00000002-5e4e-4c69-6d61-746572726102`
  * Emite un paquete binario compacto de **16 bytes** que encapsula los 7 datos del suelo más los 3 datos del BME280 y el nivel de batería, recibido por la app en menos de $300\text{ ms}$.

---

# 💻 PARTE IV: ECOSISTEMA DE SOFTWARE Y NUBE

## 9. Aplicación Móvil TerraSense (React Native / Expo)

### 9.1. Arquitectura In-App y Flujo de Pantallas

Desarrollada en **React Native con TypeScript estricto y Expo SDK 51+**:

```text
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│   RADAR Y TELEMETRÍA      │  │    DIAGNÓSTICO MOTOR IA   │  │   MAPA SATELITAL PREDIAL  │
│                           │  │                           │  │                           │
│  📡 Sonda: TS-840-A9F4    │  │  🟢 APTO PARA SIEMBRA     │  │   ┌─────────────────────┐ │
│     Batería: 94% (4.1V)   │  │                           │  │   │  🟢 P1       🟢 P2  │ │
│                           │  │  Cultivo: Maíz Dulce      │  │   │       🟡 P3         │ │
│  pH: 6.4  |  EC: 420 µS/cm│  │  pH: 6.4 (Rango Óptimo)   │  │   │  🔴 P4       🟢 P5  │ │
│  T°: 18.2°C | VWC: 32.1%  │  │  Temp: 18.2°C (>12°C OK)  │  │   └─────────────────────┘ │
│  NPK: 65 / 40 / 140 mg/kg │  │  Humedad: 32% (Adecuada)  │  │  🟢 3 Puntos Aptos        │
│                           │  │  Enmienda: No requerida   │  │  🟡 1 Requiere Encalado   │
│  [ CAPTURAR MEDICIÓN ]    │  │  🌦️ Clima: Lluvia en 6 d  │  │  🔴 1 Salinidad Excesiva  │
└───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
```

---

### 9.2. Funcionalidades Clave y Experiencia de Usuario (UX)

1. **Veredicto Semáforo Trimodal:** Verde (Proceder a siembra), Amarillo (Requiere enmienda o espera térmica) y Rojo (Suelo no apto / toxicidad).
2. **Selector Dinámico de Cultivos:** Despliega inmediatamente la lista de qué especies pueden plantarse hoy y cuáles no.
3. **Generador de Prescripciones de Fertilizante:** Traduce las deficiencias a sacos comerciales de cal, urea, superfosfato triple o sulfato de potasio.
4. **Georreferenciación Automática por GPS:** Registra latitud, longitud, altitud y precisión métrica del smartphone en cada punto.

---

### 9.3. Arquitectura Offline-First y Sincronización Automática

* **Operación Sin Cobertura Celular:** Si el agricultor está en una quebrada o potrero sin señal 4G, la aplicación ejecuta el motor agronómico íntegramente en local y almacena las lecturas en la base de datos interna (**SQLite / WatermelonDB**).
* **Mecanismo Store & Forward:** Al detectar conexión a Internet (red 4G/5G en el camino o WiFi del hogar), un *background sync service* transmite los registros en cola hacia Supabase sin requerir intervención del usuario.

---

## 10. Plataforma Cloud y Consola Web GIS (Supabase + PostGIS)

### 10.1. Arquitectura Multi-Rol (Device ID Único)

Cada instrumento TerraSense cuenta con un **Device ID único de 16 caracteres** grabado en hardware. Un mismo equipo físico puede compartirse entre varios usuarios mediante roles:

```text
                   MATRIZ DE ROLES Y PRIVILEGIOS DE USUARIO
┌────────────────────┬────────────┬──────────────────────────────────────────┐
│ ROL DE USUARIO     │ PLATAFORMA │ PRIVILEGIOS Y ACCIONES                   │
├────────────────────┼────────────┼──────────────────────────────────────────┤
│ 🧑‍🌾 Agricultor    │ App Móvil  │ Captura datos, ve semáforo, mapa predial.│
│ 👷 Asesor INDAP    │ App + Web  │ Calibra umbrales, revisa predios, emite. │
│ 👨‍🔧 Operador Campo │ App Móvil  │ Modo cuadrilla: pincha suelo y sincroniza│
│ 🛠️ Administrador   │ Consola Web│ Gestión de hardware, soporte y FOTA OTA. │
└────────────────────┴────────────┴──────────────────────────────────────────┘
```

---

### 10.2. Consola Web de Gestión Geoespacial y Mapeo de Calor

* **Motor Geoespacial PostGIS:** Polígonos prediales vectoriales asociados a cada rol de agricultor.
* **Interpolación Espacial:** Algoritmos geoestadísticos de **Kriging e Inverse Distance Weighting (IDW)** para generar mapas de calor continuo de salinidad, pH y humedad a partir de muestreos discretos.
* **Histórico Multitemporal:** Seguimiento de la degradación o recuperación del suelo a lo largo de las temporadas agrícolas.

---

### 10.3. Actualización de Firmware Over-The-Air (WiFi OTA)

El ESP32 permite actualizar el firmware binario (`v1.0.4` $\rightarrow$ `v1.1.0`) de manera inalámbrica vía WiFi a través del smartphone o de la red local, permitiendo incorporar nuevas curvas de calibración sin requerir retorno al laboratorio.

---

# 🎯 PARTE V: VALIDACIÓN, DEFENSA Y PUESTA EN MARCHA

## 11. Criterios de Éxito y Validación Experimental (KPIs)

| Dimensión | Indicador Clave (KPI) | Meta Cuantificable | Método de Verificación |
| :--- | :--- | :---: | :--- |
| 🔋 **Energía** | Autonomía de batería en modo campo | $\ge 4\text{ meses}$ ($15\text{ med/día}$) | Prueba acelerada de descarga con carga activa $22\text{ mA}$. |
| 🎯 **Metrología** | Correlación en lecturas de pH y EC | $\ge 90\%$ vs. Laboratorio | Contrastación de $\ge 30$ muestras de suelo agrícola. |
| ⚡ **Rendimiento** | Tiempo de veredicto agronómico | $\le 5\text{ segundos}$ | Medición de latencia desde pulsación hasta render UI. |
| 📶 **Conectividad** | Alcance de enlace inalámbrico BLE | $\ge 30\text{ metros}$ campo abierto | Verificación de RSSI y pérdida de paquetes en terreno. |
| 🌿 **Algoritmia** | Concordancia en recomendación de cultivos| $\ge 85\%$ vs. Ingeniero Agrónomo | Validación ciega de 20 casos de prueba agronómica. |

---

## 12. Guía de Defensa Hostil (Las 7 Preguntas Incómodas)

### ❓ 1. *"¿Qué hace tu equipo que no haga un medidor chino de $200 USD si usan la misma sonda?"*
> **🎯 Respuesta:**  
> *"El equipo genérico chino es solo una pantalla voltimétrica que muestra 7 números aislados (`pH 5.1`, `EC 2400`). El agricultor común no sabe qué hacer con eso. **TerraSense vende una decisión:** procesa esos datos con su motor agronómico y en 5 segundos le entrega un semáforo claro diciéndole: 'No plantes tomates porque el pH bloqueará el fósforo; aplica 500 kg/ha de cal agrícola y en su lugar planta papas o lechuga'. Además, georreferencia cada punto en un mapa satelital predial y sincroniza con la nube, algo que el equipo chino no puede hacer."*

---

### ❓ 2. *"¿Por qué no mandar un análisis tradicional de laboratorio una vez al año y olvidarse de tu aparato?"*
> **🎯 Respuesta:**  
> *"Porque el suelo cambia todos los días y el laboratorio cuesta $40.000 CLP y tarda 3 semanas. Para cuando llega el resultado, la ventana de siembra ya pasó. El suelo varía según la última lluvia, la temperatura de la semana o la salinidad acumulada por el riego. El laboratorio es una foto mensual cara; TerraSense es un monitoreo en tiempo real a costo cero por medición."*

---

### ❓ 3. *"¿Por qué un campesino de 60 años te compraría a ti si lleva 40 años sembrando 'al ojo'?"*
> **🎯 Respuesta:**  
> *"Porque el cambio climático rompió la regla del 'ojo'. Hoy un saco de fertilizante supera los $45.000 CLP y una bolsa de semilla híbrida cuesta $150.000 CLP. Si siembra a ciegas en un suelo frío o salino y pierde la siembra, se endeuda por todo el año. Diseñamos la app con interfaz de semáforo (Verde, Amarillo, Rojo) para que cualquier persona entienda el veredicto en 2 segundos sin requerir conocimientos técnicos."*

---

### ❓ 4. *"¿De verdad un agricultor pequeño tiene $180.000 CLP para comprar esto?"*
> **🎯 Respuesta:**  
> *"Un productor de 2 hectáreas de hortalizas invierte entre $2.000.000 y $5.000.000 CLP por temporada en insumos. Gastar $179.990 CLP una sola vez en la vida para proteger esa inversión representa menos del 4% de su presupuesto de siembra. Además, nuestro modelo B2B apunta a compras colectivas a través de programas de INDAP, PRODESAL y cooperativas agrícolas."*

---

### ❓ 5. *"¿Qué pasa si en medio del cerro no hay señal 4G?"*
> **🎯 Respuesta:**  
> *"El sistema funciona 100% desconectado. La sonda se comunica con el teléfono por Bluetooth Low Energy (BLE) sin requerir internet. El motor agronómico corre localmente en el procesador del smartphone y entrega el veredicto en 5 segundos. En cuanto el usuario recupera cobertura 4G o WiFi, la app se sincroniza en segundo plano con la base de datos Supabase."*

---

### ❓ 6. *"Si equipos como Meter Group o Spectrum valen $2.500 USD, ¿por qué el tuyo cuesta $188 USD? ¿Es de menor calidad?"*
> **🎯 Respuesta:**  
> *"No. La diferencia está en la arquitectura del sistema: ellos venden dataloggers pesados con paneles solares propietarios, pantallas LCD dedicadas y módems celulares con suscripciones anuales de $300 USD. Nosotros **aprovechamos la pantalla táctil, el GPS de precisión y el módem 4G/5G del smartphone que el agricultor ya tiene en su bolsillo**, reduciendo radicalmente el costo de hardware sin sacrificar la calidad metrológica de los electrodos."*

---

### ❓ 7. *"¿Qué impide que una empresa asiática saque una app mañana y te copie?"*
> **🎯 Respuesta:**  
> *"El hardware es genérico; la barrera de entrada está en el **motor agronómico calibrado para los suelos y cultivos de Chile y Latinoamérica** (suelos volcánicos trumaos, arcillas del Valle Central, variedades comerciales locales y vinculación con programas de fertilización de INDAP). Los fabricantes asiáticos comercializan hardware sin contextualización biológica local ni integración con plataformas satelitales territoriales."*

---

## 13. Guía de Puesta en Marcha y Entornos de Desarrollo

### 13.1. Aplicación Móvil (React Native / Expo / TypeScript)
```bash
cd App
npm install
npx expo start
```

### 13.2. Consola Web Agronómica (React 18 / Vite)
```bash
cd Web
npm install
npm run dev
```

### 13.3. Firmware del Microcontrolador (ESP32 / PlatformIO / Arduino)
```bash
cd Firmware
# Compilación y flasheo mediante PlatformIO:
pio run --target upload
# Monitoreo serial de depuración:
pio device monitor -b 115200
```

---

## 14. Estructura Integral del Repositorio

```text
TerraSence/
├── README.md                          # Documento maestro y especificación integral
├── .gitignore                         # Reglas de exclusión de Git
├── App/                               # Aplicación Móvil React Native (Expo + TypeScript)
│   ├── App.tsx                        # Componente raíz: máquina de estados y navegación
│   ├── tsconfig.json                  # Configuración TypeScript estricta
│   ├── app.json                       # Configuración de permisos BLE, GPS y red
│   ├── src/
│   │   ├── engine/                    # Motor Agronómico: reglas, cultivos, enmiendas
│   │   ├── services/                  # Bluetooth BLE, GPS, Open-Meteo, Supabase Sync
│   │   ├── screens/                   # Pantallas: Radar, Semáforo, Cultivos, Mapa
│   │   └── types/                     # Interfaces y tipos de datos del sistema
│   └── package.json                   # Dependencias de la app móvil
├── Web/                               # Consola Web Agronómica (React 18 + Vite + GIS)
│   ├── src/
│   │   ├── components/                # Visor satelital PostGIS, heatmaps, panel soporte
│   │   └── pages/                     # Gestión predial y administración de dispositivos
│   └── package.json                   # Dependencias web
├── Firmware/                          # Firmware C++ para microcontrolador ESP32
│   ├── src/
│   │   ├── main.cpp                   # Máquina de estados principal y bucle de eventos
│   │   ├── ble/                       # Servidor GATT, bonding NVS y handler de pairing
│   │   ├── modbus/                    # Driver RS-485 Modbus RTU para sonda 7-en-1
│   │   ├── sensors/                   # Driver I2C para Bosch BME280
│   │   ├── power/                     # Control de MOSFET Power Gating y lectura de batería
│   │   └── ui/                        # Control de LED WS2812B y debounce de pulsador
│   ├── platformio.ini                 # Configuración de entorno de compilación PlatformIO
│   └── CMakeLists.txt                 # Configuración para ESP-IDF
├── PCB/                               # Diseño Electrónico en KiCad
│   ├── TerraSense_v2.kicad_sch        # Esquemático de circuito electrónico
│   ├── TerraSense_v2.kicad_pcb        # Ruteo de pistas de 2 capas
│   └── BOM.csv                        # Lista de materiales para ensamblaje SMT
├── Diseño 3D/                         # Modelado CAD de Carcasas y Empuñaduras
│   └── Carcasa_IP67_TerraSense.step   # Archivo STEP para inyección/impresión 3D
└── supabase/                          # Infraestructura Backend Serverless
    ├── migrations/                    # Esquema de tablas PostGIS y políticas RLS
    └── functions/                     # Edge Functions para sincronización y reportes
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
