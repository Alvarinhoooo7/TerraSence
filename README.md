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

* [🏛️ SECCIÓN GENERAL 1: Problemática Agrícola, Contexto de Mercado y Propuesta de Valor](#️-sección-general-1-problemática-agrícola-contexto-de-mercado-y-propuesta-de-valor)
  * [1.1. Contexto Macro del Agro en Chile y Latinoamérica](#11-contexto-macro-del-agro-en-chile-y-latinoamérica)
  * [1.2. El Micro-Problema Diario en Terreno (La Decisión a las 7:00 AM)](#12-el-micro-problema-diario-en-terreno-la-decisión-a-las-700-am)
  * [1.3. La Brecha de Interpretación: Del Dato Crudo a la Parálisis por Análisis](#13-la-brecha-de-interpretación-del-dato-crudo-a-la-parálisis-por-análisis)
  * [1.4. El Costo Financiero del Error: Pérdidas Cuantificadas por Hectárea](#14-el-costo-financiero-del-error-pérdidas-cuantificadas-por-hectárea)
  * [1.5. Propuesta de Valor Disruptiva: El Ingeniero Agrónomo en el Bolsillo](#15-propuesta-de-valor-disruptiva-el-ingeniero-agrónomo-en-el-bolsillo)
  * [1.6. Los 5 Pilares de Diferenciación Tecnológica](#16-los-5-pilares-de-diferenciación-tecnológica)
* [⚔️ SECCIÓN GENERAL 2: Benchmarking y Análisis Competitivo Exhaustivo ($170.000 CLP hacia arriba)](#️-sección-general-2-benchmarking-y-análisis-competitivo-exhaustivo-170000-clp-hacia-arriba)
  * [2.1. Posicionamiento de Precio y Segmentación de Rivales](#21-posicionamiento-de-precio-y-segmentación-de-rivales)
  * [2.2. Fichas de Rivales Reales: Lo que Tienen vs. Lo que Falta vs. Lo que Destaca TerraSense](#22-fichas-de-rivales-reales-lo-que-tienen-vs-lo-que-falta-vs-lo-que-destaca-terrasense)
    * [2.2.1. Bluelab Pulse Multimedia Meter ($255.000 – $340.000 CLP)](#221-bluelab-pulse-multimedia-meter-255000--340000-clp)
    * [2.2.2. Hanna Instruments HI9814 GroLine ($280.000 – $380.000 CLP)](#222-hanna-instruments-hi9814-groline-280000--380000-clp)
    * [2.2.3. FieldScout TDR 150 / 350 (Spectrum Technologies) ($1.400.000 – $2.200.000 CLP)](#223-fieldscout-tdr-150--350-spectrum-technologies-1400000--2200000-clp)
    * [2.2.4. Meter Group ProCheck + Sonda TEROS 12 ($900.000 – $1.600.000 CLP)](#224-meter-group-procheck--sonda-teros-12-900000--1600000-clp)
    * [2.2.5. Análisis Químico Tradicional de Laboratorio ($40.000 – $65.000 CLP / muestra)](#225-análisis-químico-tradicional-de-laboratorio-40000--65000-clp--muestra)
    * [2.2.6. Asesoría Agronómica Particular ($90.000 – $200.000 CLP / visita)](#226-asesoría-agronómica-particular-90000--200000-clp--visita)
  * [2.3. Matriz Comparativa Integral de Brechas y Capacidades](#23-matriz-comparativa-integral-de-brechas-y-capacidades)
  * [2.4. Transparencia Técnica: Lo que TerraSense Admite Honestamente](#24-transparencia-técnica-lo-que-terrasense-admite-honestamente)
  * [2.5. Ventajas Competitivas Defensivas (Moats)](#25-ventajas-competitivas-defensivas-moats)
* [💰 SECCIÓN GENERAL 3: Modelo Económico, Viabilidad Comercial y Estudio de Mercado (TAM / SAM / SOM)](#-sección-general-3-modelo-económico-viabilidad-comercial-y-estudio-de-mercado-tam--sam--som)
  * [3.1. Estructura de Costos Industriales (BOM Lote 100 unidades)](#31-estructura-de-costos-industriales-bom-lote-100-unidades)
  * [3.2. Precio de Venta al Público (PVP) y Margen Unitario de Contribución](#32-precio-de-venta-al-público-pvp-y-margen-unitario-de-contribución)
  * [3.3. Estudio de Mercado Exhaustivo: Metodología y Dimensionamiento (TAM / SAM / SOM)](#33-estudio-de-mercado-exhaustivo-metodología-y-dimensionamiento-tam--sam--som)
  * [3.4. Proyección Financiera a 3 Años y Punto de Equilibrio (Break-Even Point)](#34-proyección-financiera-a-3-años-y-punto-de-equilibrio-break-even-point)
  * [3.5. Retorno de Inversión (ROI) y Payback para el Agricultor](#35-retorno-de-inversión-roi-y-payback-para-el-agricultor)
  * [3.6. Canales de Distribución y Estrategia B2B / B2G](#36-canales-de-distribución-y-estrategia-b2b--b2g)
* [🧬 SECCIÓN GENERAL 4: Motor Agronómico IA y Modelos Científico-Matemáticos](#-sección-general-4-motor-agronómico-ia-y-modelos-científico-matemáticos)
  * [4.1. Arquitectura del Motor de Inferencia Multicapa](#41-arquitectura-del-motor-de-inferencia-multicapa)
  * [4.2. Capa 1 — Perfiles de Cultivo y Umbrales Fisiológicos (+80 Especies)](#42-capa-1--perfiles-de-cultivo-y-umbrales-fisiológicos-80-especies)
  * [4.3. Capa 2 — Diagnóstico Físico-Químico y Bloqueos de Absorción](#43-capa-2--diagnóstico-físico-químico-y-bloqueos-de-absorción)
  * [4.4. Capa 3 — Generador de Prescripciones y Dosis de Enmienda Cuantificada](#44-capa-3--generador-de-prescripciones-y-dosis-de-enmienda-cuantificada)
  * [4.5. Capa 4 — Integración Climática Predictiva (7 Días GPS)](#45-capa-4--integración-climática-predictiva-7-días-gps)
  * [4.6. Modelos de Balance Hídrico, AUD y Evapotranspiración (VPD / ET₀)](#46-modelos-de-balance-hídrico-aud-y-evapotranspiración-vpd--et₀)
* [⚡ SECCIÓN GENERAL 5: Ingeniería de Hardware y Electrónica](#-sección-general-5-ingeniería-de-hardware-y-electrónica)
  * [5.1. Diagrama de Arquitectura Integral de Sistema](#51-diagrama-de-arquitectura-integral-de-sistema)
  * [5.2. Microcontrolador Principal: ESP32-WROOM-32 y Pinout Detallado](#52-microcontrolador-principal-esp32-wroom-32-y-pinout-detallado)
  * [5.3. Sistema de Sensado Dual: Sonda Suelo 7-en-1 + Bosch BME280 I2C](#53-sistema-de-sensado-dual-sonda-suelo-7-en-1--bosch-bme280-i2c)
  * [5.4. Sistema de Potencia y Eficiencia Energética (TP5100 + Power Gating)](#54-sistema-de-potencia-y-eficiencia-energética-tp5100--power-gating)
  * [5.5. Protocolos de Comunicación Industrial e Inalámbrica (Modbus + BLE)](#55-protocolos-de-comunicación-industrial-e-inalámbrica-modbus--ble)
  * [5.6. Interfaz Física del Dispositivo y Persistencia Flash NVS](#56-interfaz-física-del-dispositivo-y-persistencia-flash-nvs)
  * [5.7. BOM Electrónico Detallado y Roadmap de Hardware v2.0](#57-bom-electrónico-detallado-y-roadmap-de-hardware-v20)
* [💻 SECCIÓN GENERAL 6: Ecosistema de Software, Aplicación Móvil y Plataforma Cloud](#-sección-general-6-ecosistema-de-software-aplicación-móvil-y-plataforma-cloud)
  * [6.1. Aplicación Móvil TerraSense (React Native / Expo / TypeScript)](#61-aplicación-móvil-terrasense-react-native--expo--typescript)
  * [6.2. Arquitectura Offline-First y Sincronización Automática (Store & Forward)](#62-arquitectura-offline-first-y-sincronización-automática-store--forward)
  * [6.3. Plataforma Cloud y Consola Web GIS (Supabase + PostGIS)](#63-plataforma-cloud-y-consola-web-gis-supabase--postgis)
  * [6.4. Arquitectura Multi-Rol y Device ID Único](#64-arquitectura-multi-rol-y-device-id-único)
  * [6.5. Actualización de Firmware Over-The-Air (WiFi OTA)](#65-actualización-de-firmware-over-the-air-wifi-ota)
* [🛠️ SECCIÓN GENERAL 7: Protocolos de Mantenimiento Integral y Ciclo de Vida](#️-sección-general-7-protocolos-de-mantenimiento-integral-y-ciclo-de-vida)
  * [7.1. Protocolo de Mantenimiento de Hardware y Sonda en Terreno](#71-protocolo-de-mantenimiento-de-hardware-y-sonda-en-terreno)
  * [7.2. Mantenimiento y Operaciones de Base de Datos Cloud (Supabase / PostGIS)](#72-mantenimiento-y-operaciones-de-base-de-datos-cloud-supabase--postgis)
  * [7.3. Mantenimiento del Ecosistema de Software y App Móvil](#73-mantenimiento-del-ecosistema-de-software-y-app-móvil)
* [🎯 SECCIÓN GENERAL 8: Validación Experimental, Defensa de Título y Puesta en Marcha](#-sección-general-8-validación-experimental-defensa-de-título-y-puesta-en-marcha)
  * [8.1. Criterios de Éxito y Matriz de Validación de KPIs](#81-criterios-de-éxito-y-matriz-de-validación-de-kpis)
  * [8.2. Guía Maestra de Defensa Hostil (Las 7 Preguntas Incómodas)](#82-guía-maestra-de-defensa-hostil-las-7-preguntas-incómodas)
  * [8.3. Guía de Puesta en Marcha y Entornos de Desarrollo](#83-guía-de-puesta-en-marcha-y-entornos-de-desarrollo)
  * [8.4. Estructura Integral del Repositorio](#84-estructura-integral-del-repositorio)

---

# 🏛️ SECCIÓN GENERAL 1: Problemática Agrícola, Contexto de Mercado y Propuesta de Valor

## 1.1. Contexto Macro del Agro en Chile y Latinoamérica

El sector agrícola en Chile y Latinoamérica enfrenta una encrucijada histórica. En Chile existen más de **278.000 explotaciones agropecuarias** *(ODEPA / Censo Agropecuario y Forestal)*, abarcando más de **12 millones de hectáreas**. De este universo:

* El **92% corresponde a la Agricultura Familiar Campesina (AFC)** y pequeños/medianos productores (predios de 0.5 a 20 hectáreas).
* Más de **14 años de megasequía** ininterrumpida entre las regiones de Coquimbo y La Araucanía han degradado la calidad del agua de riego, incrementando drásticamente la salinidad del suelo ($EC > 2.000\,\mu\text{S/cm}$).
* El **cambio climático ha desarticulado los calendarios agrícolas tradicionales**: las fechas empíricas de siembra de "toda la vida" ya no coinciden con las ventanas térmicas reales del suelo ni con los patrones de lluvia erráticos (heladas tardías en primavera, golpes de calor en floración).
* **Escalada de costos de insumos:** Tras la crisis global de fertilizantes, un saco de urea o sulfato de potasio oscila entre **$45.000 y $65.000 CLP**, mientras que un kilo de semilla híbrida de tomate o maíz de alto rendimiento supera los **$150.000 CLP**.

---

## 1.2. El Micro-Problema Diario en Terreno (La Decisión a las 7:00 AM)

A pesar de que el agricultor se juega el sustento de todo su año en cada siembra, el **99% de las decisiones agronómicas en terreno se toman a ciegas y por intuición visual**:

```text
EL DILEMA DEL AGRICULTOR A LAS 7:00 AM FRENTE AL POTRERO:
┌──────────────────────────────────────────────────────────────────────────┐
│  🧑‍🌾 AGRICULTOR CON $3.000.000 CLP INVERTIDOS EN SEMILLAS Y FERTILIZANTES │
│                                                                          │
│  ❓ "¿Tiene el suelo la temperatura mínima para que la semilla no se pudra?"│
│  ❓ "¿Está el pH en rango para que la planta absorba el fertilizante caro?"│
│  ❓ "¿Hay exceso de sales que queme las raíces tiernas del trasplante?"    │
│  ❓ "¿Va a llover en 48 horas provocando asfixia radicular por barro?"   │
│                                                                          │
│  ❌ OPCIÓN A: Esperar 3 semanas el resultado del laboratorio ($45.000 CLP)│
│               ➜ La ventana de siembra se cierra y el precio de venta cae.│
│  ❌ OPCIÓN B: Pagar $120.000 CLP por la visita de un agrónomo particular   │
│               ➜ Costo prohibitivo para un pequeño productor.             │
│  ⚠️ OPCIÓN C: Sembrar "al ojo" como siempre                              │
│               ➜ Riesgo inminente de perder toda la inversión.             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 1.3. La Brecha de Interpretación: Del Dato Crudo a la Parálisis por Análisis

Incluso cuando el agricultor adquiere un instrumento de medición comercial disponible en el mercado, se enfrenta a la **falla estructural de la tecnología actual**:

> **Los instrumentos comerciales entregan números crudos, pero no entregan respuestas.**

```text
PARÁLISIS POR ANÁLISIS (ESTADO DEL ARTE COMERCIAL):
┌─────────────────────────────────────────────────────────────────────────┐
│ SENSOR COMERCIAL ──► PANTALLA LCD (Dato Crudo) ──► AGRICULTOR CONFUNDIDO│
│                                                                         │
│   pH:    5.1          ❌ ¿Es bueno o malo para el tomate?                │
│   EC:    2.400 µS/cm  ❌ ¿Está salino? ¿Tengo que lavar sales?          │
│   Temp:  9.3°C        ❌ ¿Germinará el maíz a esta temperatura?         │
│   N:     23 mg/kg     ❌ ¿Cuántos sacos de fertilizante debo comprar?   │
│   VWC:   38%          ❌ ¿Puedo meter el tractor hoy?                   │
│                                                                         │
│   RESULTADO: Desconexión total entre el dato físico y la acción real.   │
└─────────────────────────────────────────────────────────────────────────┘
```

El pequeño y mediano agricultor no es químico ni ingeniero agrónomo. Mostrarle `pH 5.1` y `EC 2.4 mS/cm` sin contexto biológico genera **analfabetismo de datos**, conduciendo a dos errores críticos:
1. **Ignorar el dato** y continuar aplicando dosis excesivas e inadecuadas de agroquímicos.
2. **Aplicar enmiendas incorrectas**, acidificando o salinizando aún más el suelo.

---

## 1.4. El Costo Financiero del Error: Pérdidas Cuantificadas por Hectárea

Sembrar o fertilizar a ciegas no es un detalle menor; representa un impacto económico devastador para la economía rural:

| Escenario de Error Agronómico | Causa Físico-Química No Detectada | Impacto Financiero Directo por Hectárea (CLP) |
| :--- | :--- | :---: |
| **Pérdida Total de Siembra por Frío** | Suelo $< 10.0^\circ\text{C}$ (bajo cero vegetativo). La semilla no germina y es atacada por hongos (*Pythium*). | **$450.000 – $800.000 CLP/ha** *(Pérdida de semillas híbridas + labores de rastra).* |
| **Fertilización Inútil por Bloqueo de pH** | Aplicación de superfosfato en suelo con $\text{pH} < 5.5$. El fósforo se insolubiliza con aluminio/hierro. | **$350.000 – $600.000 CLP/ha** *(Fertilizante botado a la basura sin ser absorbido).* |
| **Quema Radicular por Salinidad** | Trasplante de hortalizas en suelo con $\text{EC} > 2.400\,\mu\text{S/cm}$ sin riego de lavado previo. | **$600.000 – $1.400.000 CLP/ha** *(Muerte de plantines y retraso comercial de 45 días).* |
| **Asfixia Radicular por Lluvia Posterior** | Siembra con humedad alta ($\text{VWC} > 38\%$) previa a frente de lluvia de $40\text{ mm}$ no pronosticado. | **$500.000 – $1.100.000 CLP/ha** *(Pudrición radicular generalizada).* |
| **Muestreo Tradicional Denso (10 Puntos)** | Enviar 10 muestras a laboratorio químico tradicional ($50.000 CLP c/u) para mapear variabilidad predial. | **$500.000 CLP** *(Costo prohibitivo e inviable para monitoreo frecuente).* |

---

## 1.5. Propuesta de Valor Disruptiva: El Ingeniero Agrónomo en el Bolsillo

TerraSense cambia radicalmente el paradigma de la instrumentación agrícola:

$$\mathbf{\text{Medición In-Situ (7 Parámetros)}} + \mathbf{\text{Clima GPS}} + \mathbf{\text{Matriz Biológica (+80 Cultivos)}} \implies \mathbf{\text{Prescripción Ejecutable en } \le 5\text{ Segundos}}$$

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        EL FLUJO TERRASENSE                             │
│                                                                        │
│  PINCHAZO IN-SITU ──► MOTOR AGRONÓMICO IA ──► DIAGNÓSTICO EN ≤ 5 SEG   │
│   (Sonda Inox 316L)       (En el Smartphone)                           │
│                                                ├─► 🟢 SEMÁFORO VISUAL  │
│                                                ├─► 🌿 CULTIVOS APTOS   │
│                                                ├─► 🌦️ ALERTA METEO GPS │
│                                                ├─► 💊 DOSIS (kg/ha)    │
│                                                └─► 🗺️ MAPA SATELITAL   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1.6. Los 5 Pilares de Diferenciación Tecnológica

1. 🧠 **Diagnóstico Prescriptivo Instantáneo (≤ 5 segundos):** Convierte variables crudas (`pH 5.1`, `K 23 mg/kg`) en una orden agronómica directa: *"Acidez crítica bloquea fósforo. Aplica 500 kg/ha de cal agrícola antes de sembrar"*.
2. 🌿 **Matriz Biológica de Compatibilidad (+80 Cultivos):** Evalúa el suelo frente a las exigencias fisiológicas de hortalizas, frutales y cereales, indicando qué especies prosperarán hoy y cuáles fracasarán.
3. 🌦️ **Integración Meteorológica Predictiva GPS (7 Días):** Cruza la humedad actual del suelo con el pronóstico de lluvias y heladas locales para evitar siembras previas a temporales destructivos.
4. 🗺️ **Mapeo Satelital Geoespacial del Predio (GIS):** Georreferencia automáticamente cada pinchazo con el GPS del smartphone, generando mapas de calor de fertilidad predial mediante PostGIS.
5. ⚡ **Costo Marginal Cero por Medición:** Permite muestrear 10, 50 o 100 puntos en una mañana sin costo recurrente, democratizando la agricultura de precisión.

---

# ⚔️ SECCIÓN GENERAL 2: Benchmarking y Análisis Competitivo Exhaustivo ($170.000 CLP hacia arriba)

## 2.1. Posicionamiento de Precio y Segmentación de Rivales

TerraSense se comercializa a un precio objetivo de **$179.990 CLP** (rango de **$170.000 a $200.000 CLP** / ~**$185 USD**), posicionándose en el segmento de **entrada profesional accesible**.

A partir de este umbral de precio hacia arriba ($170.000 a $2.200.000+ CLP), el mercado se compone de cuatro categorías de soluciones comerciales:

```text
SEGMENTACIÓN DE PRECIOS EN EL MERCADO AGRÍCOLA:
$170.000 CLP ─────────────── $350.000 CLP ─────────────── $1.500.000 CLP ─────────────── $2.200.000+ CLP
    │                             │                              │                              │
    ▼                             ▼                              ▼                              ▼
[TERRASENSE IoT]          [Bluelab / Hanna]             [Meter Group TEROS]            [Spectrum TDR 350]
$179.990 CLP              $255.000 - $380.000 CLP       $900.000 - $1.600.000 CLP      $1.400.000 - $2.200.000 CLP
7-en-1 + IA Prescriptiva  Instrumentos Portátiles       Dataloggers de Investigación   Mástil TDR Investigación
```

---

## 2.2. Fichas de Rivales Reales: Lo que Tienen vs. Lo que Falta vs. Lo que Destaca TerraSense

### 2.2.1. Bluelab Pulse Multimedia Meter (~$255.000 – $340.000 CLP / ~$265 – $350 USD)

*Instrumento portátil de inserción directa de origen neozelandés, líder en hidroponía y sustratos.*

* **🔍 Qué tienen ellos que a TerraSense le falta:**
  * Marca global consolidada con más de 20 años de reputación en horticultura de precisión.
  * Electrodos de acero inoxidable y vidrio templado con calibración trazable de fábrica.
  * Aplicación móvil nativa extremadamente pulida para el registro continuo de humedad y conductividad en sustratos (fibra de coco, perlita, lana de roca).
  * Soluciones de calibración certificadas y estandarizadas internacionalmente.
* **❌ Qué les falta frente a TerraSense:**
  * **No mide Nitrógeno, Fósforo ni Potasio (NPK):** Es ciego a la fertilidad real del suelo.
  * **No mide pH en suelo vivo:** Requiere comprar por separado el *Bluelab Soil pH Pen* (~$180.000 CLP adicionales), elevando el combo a más de **$500.000 CLP**.
  * **Cero inteligencia prescriptiva:** No indica qué cultivo sembrar ni calcula dosis de fertilizante o cal; solo muestra cifras.
  * **Sin integración meteorológica:** No se comunica con servicios de clima ni anticipa heladas o temporales.
  * **Sin mapas satelitales GIS:** No georreferencia los puntos en mapas prediales interactivos.
* **🚀 Qué tiene TerraSense para destacar:**
  * Sonda industrial 7-en-1 integrada (VWC, T°, EC, pH, N, P, K) en una sola inserción directa.
  * Motor agronómico con semáforo inteligente y catálogo de +80 cultivos en español.
  * Prescripción exacta de enmiendas en kg/ha y cálculo de costo comercial estimado.
  * Precio ~35% más económico que el Bluelab Pulse básico (y ~65% más barato que el combo Pulse + pH).

---

### 2.2.2. Hanna Instruments HI9814 GroLine (~$280.000 – $380.000 CLP / ~$290 – $400 USD)

*Medidor portátil multiparámetro profesional de origen europeo/norteamericano, estándar en laboratorios y viveros.*

* **🔍 Qué tienen ellos que a TerraSense le falta:**
  * Sonda amplificada con cuerpo de titanio y electrodo de pH con unión de tela renovable de alta durabilidad.
  * Sistema patentado *Quick-Cal* que permite calibrar pH y conductividad simultáneamente en 1 minuto con una sola solución.
  * Red oficial de soporte técnico, repuestos y servicio técnico presencial en Chile (Veto.cl y Hanna Chile).
  * Certificación metrológica IP67 grado laboratorio industrial.
* **❌ Qué les falta frente a TerraSense:**
  * **No mide NPK in-situ:** Para medir NPK, Hanna exige comprar fotómetros químicos con reactivos líquidos de alto costo (*HI83325* de más de $1.200.000 CLP).
  * **Medición de pH engorrosa en suelo:** Requiere preparar previamente una mezcla líquida (*slurry*) de suelo con agua destilada en proporción 1:2 o 1:5; no permite pinchazo directo instantáneo en terreno abierto.
  * **Sin conectividad inalámbrica ni app móvil:** Equipo cerrado sin Bluetooth, sin WiFi y sin almacenamiento en la nube.
  * **Sin georreferenciación GPS:** Obliga al agricultor a anotar las coordenadas a mano en una libreta de papel.
  * **Sin motor agronómico:** Muestra `pH 5.4` y `EC 1.8 mS/cm` en un LCD monocromático sin decir qué hacer.
* **🚀 Qué tiene TerraSense para destacar:**
  * Inserción directa en suelo en 5 segundos sin preparar mezclas con agua destilada.
  * Conectividad Bluetooth 5.0 hacia el smartphone y sincronización cloud con Supabase.
  * Diagnóstico en lenguaje natural comprensible por cualquier agricultor de la tercera edad.
  * Costo 40% menor con 7 mediciones simultáneas en vez de 3.

---

### 2.2.3. FieldScout TDR 150 / 350 (Spectrum Technologies) (~$1.400.000 – $2.200.000 CLP / ~$1.500 – $2.300 USD)

*El estándar de oro en investigación agronómica y campos de golf profesionales a nivel mundial.*

* **🔍 Qué tienen ellos que a TerraSense le falta:**
  * Tecnología TDR (*Time Domain Reflectometry*) de alta frecuencia, considerada el estándar científico de referencia para humedad volumétrica.
  * Mástil vertical ergonómico de acero con empuñadura para muestreo rápido de cientos de puntos de pie sin agacharse.
  * Varillas de acero intercambiables de longitud variable (7.5 cm, 12 cm y 20 cm) para muestreo a diferentes profundidades de la raíz.
  * Pantalla LCD retroiluminada de alta visibilidad bajo luz solar directa montada en el cabezal.
* **❌ Qué les falta frente a TerraSense:**
  * **Precio estratosférico:** Cuesta entre **8 y 12 veces más** que TerraSense, siendo inalcanzable para el 95% de los agricultores de Chile.
  * **No mide pH ni macronutrientes NPK:** Solo sensa humedad (VWC) y conductividad aparente (EC).
  * **Sin prescripciones agronómicas:** Requiere que un ingeniero agrónomo descargue los datos en una computadora y los interprete.
  * **Software propietario con suscripciones de pago:** Para acceder a mapas de calor satelitales avanzados exige la plataforma *SpecConnect* con costo anual recurrente de ~$300 USD.
* **🚀 Qué tiene TerraSense para destacar:**
  * Medición completa 7-en-1 que añade pH, Nitrógeno, Fósforo y Potasio.
  * Motor agronómico prescriptivo con IA integrado que genera recomendaciones al instante.
  * Plataforma en la nube y mapas satelitales prediales **100% gratuitos y de código abierto sin licencias anuales**.
  * Factor de forma compacto y liviano que cabe en una mochila de mano.

---

### 2.2.4. Meter Group ProCheck + Sonda TEROS 12 (~$900.000 – $1.600.000 CLP / ~$950 – $1.700 USD)

*Sistema de lectura portátil para sondas de grado de investigación científica (Decagon Devices / Meter Group).*

* **🔍 Qué tienen ellos que a TerraSense le falta:**
  * Sensado de capacitancia de muy alta frecuencia (70 MHz) que minimiza los efectos de salinidad y textura del suelo.
  * Curvas de calibración estándar para tipos específicos de suelo validadas por decenas de publicaciones científicas internacionales *peer-reviewed*.
  * Durabilidad extrema de las agujas de acero inoxidable con sellado epóxico de grado militar.
* **❌ Qué les falta frente a TerraSense:**
  * **No mide pH ni NPK:** La sonda TEROS 12 solo mide humedad, temperatura y conductividad eléctrica.
  * **Enfocado en científicos, no en agricultores:** Su interfaz muestra constantes dieléctricas ($\varepsilon_a$) y valores crudos incomprensibles para un campesino.
  * **Costo 5 a 8 veces superior** para un kit básico de lectura portátil.
  * **No integra pronósticos meteorológicos ni alertas de heladas en tiempo real.**
* **🚀 Qué tiene TerraSense para destacar:**
  * Enfoque centrado en la toma de decisión del productor: semáforo visual, cultivos compatibles y dosis de cal/fertilizante.
  * Integración nativa con smartphone mediante BLE y consola web interactiva con PostGIS.
  * Sensado ambiental complementario (Bosch BME280) para cálculo de VPD y evapotranspiración.

---

### 2.2.5. Análisis Químico Tradicional de Laboratorio ($40.000 – $65.000 CLP / muestra)

*Servicio oficial de análisis de suelos ofrecido por laboratorios acreditados (INIA, Agrolab, SGS, universidades).*

* **🔍 Qué tienen ellos que a TerraSense le falta:**
  * Exactitud metrológica absoluta mediante espectrometría de plasma de acoplamiento inductivo (ICP-OES) y extracción Olsen/Kjeldahl.
  * Determinación completa de micronutrientes (Boro, Zinc, Cobre, Manganeso, Hierro, Molibdeno).
  * Determinación de Materia Orgánica (%), Capacidad de Intercambio Catiónico (CIC) y textura física (arena, limo, arcilla).
  * Validez legal e institucional para certificaciones SAG, créditos INDAP o exportación de fruta.
* **❌ Qué les falta frente a TerraSense:**
  * **Demora crítica de 15 a 30 días:** Para cuando el informe en PDF llega por correo, la ventana de siembra ya expiró.
  * **Costo prohibitivo para muestreo denso:** Mapear 10 puntos de un predio de 5 hectáreas cuesta **$500.000 CLP**.
  * **Muestra estática no representativa del momento de siembra:** No informa la temperatura ni la humedad del suelo a las 7:00 AM del día de trabajo.
* **🚀 Qué tiene TerraSense para destacar:**
  * **Diagnóstico en ≤ 5 segundos** directamente en el potrero.
  * **Costo marginal de $0 CLP por medición:** Permite tomar 50 muestras en un día para generar mapas de calor prediales sin costo extra.
  * Complemento ideal: TerraSense se usa para el día a día y el laboratorio tradicional cada 2-3 años para micronutrientes.

---

### 2.2.6. Asesoría Agronómica Particular ($90.000 – $200.000 CLP / visita)

*Ingeniero agrónomo o asesor técnico privado que visita el predio de forma presencial.*

* **🔍 Qué tienen ellos que a TerraSense le falta:**
  * Juicio visual holístico para detección de plagas foliares (pulgones, arañitas), hongos (*Botrytis*, *Oídio*) y deficiencias visuales en hojas.
  * Criterio humano para podas, injertos, manejo de riego tecnificado y firma técnica ante bancos/INDAP.
* **❌ Qué les falta frente a TerraSense:**
  * **Costo recurrente insostenible:** Pagar visitas semanales o quincenales supera los **$1.500.000 CLP** por temporada.
  * **Disponibilidad física limitada:** No están disponibles a las 7:00 AM un domingo cuando el agricultor debe decidir si sembrar o no.
  * **Sin digitalización geoespacial continua:** Rara vez generan mapas satelitales históricos interpolados por GPS.
* **🚀 Qué tiene TerraSense para destacar:**
  * **Disponibilidad 24/7 en el bolsillo** a un costo único de adquisición ($179.990 CLP).
  * Digitalización automática de cada punto muestreado con respaldo histórico en la nube.
  * Herramienta que potencia tanto al agricultor como al propio agrónomo para tomar decisiones con datos objetivos.

---

## 2.3. Matriz Comparativa Integral de Brechas y Capacidades

| Capacidad / Función Técnica | Bluelab Pulse | Hanna HI9814 | Spectrum TDR 350 | Meter TEROS 12 | Laboratorio Químico | Asesor Privado | **TerraSense IoT** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Precio de Adquisición** | ~$255–$340K CLP | ~$280–$380K CLP | ~$1.4–$2.2M CLP | ~$900K–$1.6M CLP | $40–65K CLP/muestra | $90–200K CLP/visita | **$179.990 CLP** |
| **Inserción In-Situ Directa** | ✅ | ❌ *(Requiere Slurry)*| ✅ | ✅ | ❌ | ❌ | **✅ (Inox 316L)** |
| **Medición de NPK** | ❌ | ❌ | ❌ | ❌ | ✅ | Con laboratorio | **✅ (Reactividad CA)** |
| **Medición de pH de Suelo** | ❌ | ✅ | ❌ | ❌ | ✅ | Con laboratorio | **✅ (Estado Sólido)** |
| **Humedad (VWC) y Temp** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | **✅ (Suelo + Aire)** |
| **Sensor Ambiental Aire** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ (Bosch BME280)** |
| **Tiempo de Respuesta** | < 5 s | < 10 s | < 3 s | < 5 s | 15–30 días | 2–14 días | **≤ 5 segundos** |
| **Conectividad Móvil** | ✅ BLE *(Básica)* | ❌ | Opcional ($$$) | Opcional ($$$) | ❌ | ❌ | **✅ BLE 5.0 + Cloud** |
| **Motor Agronómico Prescriptivo** | ❌ | ❌ | ❌ | ❌ | Parcial *(Manual)* | ✅ | **✅ IA Instantánea** |
| **Catálogo de Cultivos (+80)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **✅ Integrado** |
| **Dosis Cuantificada de Enmienda**| ❌ | ❌ | ❌ | ❌ | ✅ *(En PDF)* | ✅ | **✅ (kg/ha + costo)** |
| **Pronóstico Climático GPS 7 Días**| ❌ | ❌ | ❌ | ❌ | ❌ | Parcial | **✅ Automático** |
| **Mapeo Satelital Predial GIS** | ❌ | ❌ | Con SpecConnect ($$$)| Con software PC ($$$)| ❌ | ❌ | **✅ PostGIS Gratis** |
| **Operación 100% Offline** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | **✅ Store & Forward** |
| **Costo por Muestreo Adicional** | $0 | $0 | $0 | $0 | ~$50.000 CLP | ~$120.000 CLP | **$0 CLP** |

---

## 2.4. Transparencia Técnica: Lo que TerraSense Admite Honestamente

Para garantizar el máximo rigor académico en la defensa de título y evitar objeciones de la comisión evaluadora:

1. **Estimación Electroquímica NPK vs. Espectrometría ICP-OES:**
   * La sonda utiliza electrodos de acero inoxidable 316L con medición de reactividad iónica superficial de corriente alterna (CA).
   * **No entrega precisión farmacéutica de laboratorio**: clasifica los niveles de N, P y K en rangos agronómicos operativos (*Bajo*, *Medio*, *Óptimo*, *Excesivo*) con una precisión de $\pm 5\%$, ideal para decisiones de fertilización en campo, pero no reemplaza un análisis de suelo SAG de certificación.
2. **Ausencia de Sensado de Micronutrientes Específicos:**
   * TerraSense no mide Boro, Zinc, Cobre, Manganeso ni Molibdeno. Para corregir micro-deficiencias graves se recomienda mantener un análisis de laboratorio tradicional cada 2 o 3 años.
3. **Diagnóstico Físico-Químico vs. Fitopatología Visual:**
   * El dispositivo evalúa la condición de la tierra y el microclima; no detecta virus foliares, bacterias ni insectos en las hojas. Su rol es complementario al ojo del agrónomo.

---

## 2.5. Ventajas Competitivas Defensivas (Moats)

1. **Algoritmia Regionalizada y Calibración Local:**
   * El motor de reglas está calibrado para las tipologías de suelo de Chile y el cono sur (trumaos volcánicos del sur, suelos arcillosos y vertisoles del Valle Central, y condiciones salinas del norte chico), a diferencia de equipos importados con parametrizaciones genéricas.
2. **Arquitectura 7-en-1 Integrada de Bajo Costo:**
   * Al reemplazar múltiples instrumentos costosos por un solo hardware optimizado, logramos un costo de fabricación industrial (BOM) de **$42.000 CLP**, permitiendo un precio de venta disruptivo con márgenes sobre el **75%**.
3. **Ecosistema Abierto sin Suscripciones Cautivas:**
   * El agricultor es dueño total de su hardware y de sus registros históricos en PostgreSQL/Supabase, eliminando los cobros mensuales que imponen las grandes multinacionales agtech.

---

# 💰 SECCIÓN GENERAL 3: Modelo Económico, Viabilidad Comercial y Estudio de Mercado (TAM / SAM / SOM)

## 3.1. Estructura de Costos Industriales (BOM Lote 100 unidades)

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

## 3.2. Precio de Venta al Público (PVP) y Margen Unitario de Contribución

$$\begin{aligned}
\text{Costo Industrial de Fabricación (BOM):} & \quad \mathbf{\$42.000\text{ CLP}}\quad(\approx \$44\text{ USD}) \\
\text{Precio de Venta al Público (PVP Objetivo):} & \quad \mathbf{\$179.990\text{ CLP}}\quad(\approx \$188\text{ USD}) \\
\text{Margen Bruto Unitario:} & \quad \$179.990 - \$42.000 = \mathbf{\$137.990\text{ CLP}}\quad(\mathbf{76.6\% \text{ Margen}})
\end{aligned}$$

---

## 3.3. Estudio de Mercado Exhaustivo: Metodología y Dimensionamiento (TAM / SAM / SOM)

Para modelar la viabilidad comercial real del proyecto se utiliza la metodología internacional de embudo de mercado **TAM - SAM - SOM**, adaptada al contexto agrícola nacional:

```text
               ESTRUCTURA DEL EMBUDO DE MERCADO TERRASENSE (CHILE)
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🌍 TAM (Total Addressable Market) — Mercado Total Teórico                  │
│    278.000 a 300.000 Explotaciones Agropecuarias en Chile (100% Censo)      │
│    Valor Total Teórico: ~$50.000 Millones CLP (~$52.6M USD)                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼  Filtro: Acceso Smartphone + Cultivo Comercial
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 SAM (Serviceable Available Market) — Mercado Servible / Disponible       │
│    100.000 Agricultores Comerciales con Voluntad y Capacidad de Inversión   │
│    Valor Disponible: ~$18.000 Millones CLP (~$18.9M USD)                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼  Filtro: Captura Realista Año 1 (1% del SAM)
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🚀 SOM (Serviceable Obtainable Market) — Meta de Captura Comercial Año 1   │
│    1.000 Unidades Vendidas (1% del SAM)                                     │
│    Facturación Bruta Año 1: $179.990.000 CLP (~$189.000 USD)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. 🌍 TAM (Total Addressable Market — Mercado Total Direccionable)
* **Definición:** El 100% de la demanda posible si TerraSense no tuviera competidores y alcanzara a cada productor agrícola de Chile.
* **Cifra Base:** **~278.000 a 300.000 explotaciones agropecuarias** según el Censo Agropecuario y Forestal de ODEPA / INE.
* **Valorización del TAM:**
  $$\text{TAM} = 278.000 \times \$179.990\text{ CLP} = \mathbf{\$50.037.220.000\text{ CLP}}\quad(\approx \mathbf{\$52.6\text{M USD}})$$

### 2. 🎯 SAM (Serviceable Available Market — Mercado Disponible Servible)
* **Definición:** El subsegmento del TAM que cuenta con cultivos comerciales intensivos (hortalizas, frutales, cereales, viñas), posee cobertura móvil/smartphone y tiene la **voluntad y capacidad real de invertir en optimización tecnológica** (productores AFC avanzados, cooperativas y medianos agricultores).
* **Cifra Base:** **~100.000 productores agropecuarios** (~36% del total nacional).
* **Valorización del SAM:**
  $$\text{SAM} = 100.000 \times \$179.990\text{ CLP} = \mathbf{\$17.999.000.000\text{ CLP}}\quad(\approx \mathbf{\$18.9\text{M USD}})$$

### 3. 🚀 SOM (Serviceable Obtainable Market — Mercado Objetivo Obtenible)
* **Definición:** La cuota de mercado que TerraSense puede capturar efectivamente en su primer año de operación comercial formal, considerando capacidades de fabricación en lote, canales de distribución y comercialización inicial.
* **Meta Año 1 (1% del SAM):** **1.000 unidades comercializadas**.

---

## 3.4. Proyección Financiera a 3 Años y Punto de Equilibrio (Break-Even Point)

### Proyección de Crecimiento Escalonado (Años 1 al 3)

| Métrica Financiera | Año 1 (SOM 1.0%) | Año 2 (SOM 2.5%) | Año 3 (SOM 5.0%) |
| :--- | :---: | :---: | :---: |
| **Unidades Comercializadas** | **1.000 unidades** | **2.500 unidades** | **5.000 unidades** |
| **Precio de Venta Unitario (PVP)** | $179.990 CLP | $179.990 CLP | $179.990 CLP |
| **Facturación Bruta (Ingresos)** | **$179.990.000 CLP** *(~$189K USD)* | **$449.975.000 CLP** *(~$473K USD)* | **$899.950.000 CLP** *(~$947K USD)* |
| **Costo Total Directo (BOM $42K)** | $42.000.000 CLP | $105.000.000 CLP | $210.000.000 CLP |
| **MARGEN BRUTO GENERADO** | **$137.990.000 CLP** | **$344.975.000 CLP** | **$689.950.000 CLP** |
| **Margen Bruto Porcentual** | **76.6%** | **76.6%** | **76.6%** |

### Cálculo del Punto de Equilibrio (*Break-Even Point*)
Considerando unos costos fijos operacionales anuales (alquiler de taller/ensamblaje, herramientas, hosting Supabase Pro, packaging inicial, licencias y marketing) estimados en **$12.000.000 CLP/año**:

$$\text{Punto de Equilibrio (Unidades)} = \frac{\text{Costos Fijos Anuales}}{\text{Margen de Contribución Unitario}} = \frac{\$12.000.000\text{ CLP}}{\$137.990\text{ CLP}} \approx \mathbf{87\text{ unidades}}$$

$$\text{Punto de Equilibrio (Ventas en Dinero)} = 87 \times \$179.990\text{ CLP} = \mathbf{\$15.659.130\text{ CLP}}$$

> [!TIP]
> **Conclusión de Viabilidad:** Con comercializar únicamente **87 unidades en el año** (menos del **0.09%** de los agricultores interesados), el proyecto cubre la totalidad de sus costos operativos y de fabricación, entrando en zona de rentabilidad neta positiva.

---

## 3.5. Retorno de Inversión (ROI) y Payback para el Agricultor

Para el agricultor individual, la compra de TerraSense no es un gasto, sino una inversión con retorno acelerado:

* **Inversión Inicial:** **$179.990 CLP** (pago único de por vida).
* **Ahorro en Insumos Evitados (1 Temporada en 1 ha):**
  * Evitar 2 sacos de fertilizante mal dosificado o bloqueado por acidez: $2 \times \$50.000 = \$100.000\text{ CLP}$.
  * Evitar la pérdida de 0.5 hectárea de semilla híbrida por siembra en suelo frío: $\approx \$250.000\text{ CLP}$.
  * Ahorro total directo por temporada: **$350.000 CLP**.
* **Período de Recuperación (*Payback*):**
  $$\text{Payback} = \frac{\$179.990\text{ CLP}}{\$350.000\text{ CLP/temporada}} \approx \mathbf{0.51\text{ temporadas}}\quad(\mathbf{\approx 2\text{ a }4\text{ meses}})$$

---

## 3.6. Canales de Distribución y Estrategia B2B / B2G

1. **Canal B2G / Institucional (INDAP y PRODESAL):** Venta directa a programas de fomento estatal como herramienta de dotación para extensionistas agrícolas y cooperativas campesinas.
2. **Canal B2B (Distribuidores de Insumos y Semilleras):** Alianzas comerciales con distribuidoras agrícolas (ej. Anasac, Copeval, Coagra) para vender TerraSense como complemento técnico en la compra de semillas e insumos.
3. **Canal Directo B2C (E-commerce Agrícola):** Venta online directa con despacho a todo Chile, con soporte técnico y tutoriales por WhatsApp.

---

# 🧬 SECCIÓN GENERAL 4: Motor Agronómico IA y Modelos Científico-Matemáticos

## 4.1. Arquitectura del Motor de Inferencia Multicapa

El núcleo de TerraSense opera bajo una arquitectura de inferencia determinística y biofísica de 4 capas:

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

## 4.2. Capa 1 — Perfiles de Cultivo y Umbrales Fisiológicos (+80 Especies)

Cada cultivo cuenta con un esquema de caracterización biofísica estructurado:

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

## 4.3. Capa 2 — Diagnóstico Físico-Químico y Bloqueos de Absorción

| Parámetro Sensado | Condición Crítica Detectada | Diagnóstico Agronómico Automatizado |
| :--- | :--- | :--- |
| **pH Suelo** | $\text{pH} < 5.5$ (Acidez Fuerte) | *"Acidez crítica. El Fósforo está insolubilizado como fosfato de aluminio/hierro. Aplicar cal agrícola para desbloquear asimilación."* |
| **Conductividad (EC)** | $\text{EC} > 2.400\,\mu\text{S/cm}$ | *"Salinidad severa. Provoca estrés osmótico y quema radicular. Aplicar riego de lavado de sales antes del trasplante."* |
| **Temperatura Suelo** | $T_{\text{suelo}} < 12.0^\circ\text{C}$ | *"Suelo bajo el cero vegetativo para solanáceas/cucurbitáceas. Riesgo inminente de pudrición de semilla por hongos del suelo."* |
| **Humedad (VWC)** | $\text{VWC} > 45\%$ | *"Contenido hídrico sobre capacidad de campo. Riesgo de anoxia radicular y ataque de Phytophthora/Pythium."* |
| **Potasio (K)** | $\text{K} < 40\,\text{mg/kg}$ | *"Deficiencia severa de Potasio. Pérdida de turgencia celular y alta susceptibilidad a estrés térmico."* |

---

## 4.4. Capa 3 — Generador de Prescripciones y Dosis de Enmienda Cuantificada

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

## 4.5. Capa 4 — Integración Climática Predictiva (7 Días GPS)

* **Precipitaciones acumuladas pronosticadas:** Si se pronostican $> 25\text{ mm}$ en suelos con $\text{VWC} > 35\%$, bloquea la siembra por riesgo de lavado de semillas y asfixia radicular.
* **Temperaturas mínimas nocturnas:** Alerta de heladas agronómicas ($< 2^\circ\text{C}$) en cultivos sensibles recién trasplantados.
* **Índice UV y Temperatura Ambiental:** Evalúa la velocidad de desecación superficial mediante el cálculo de evapotranspiración.

---

## 4.6. Modelos de Balance Hídrico, AUD y Evapotranspiración (VPD / ET₀)

### 1. Agua Útil Disponible (AUD)
$$\text{AUD} = (\theta_{\text{CC}} - \theta_{\text{PMP}}) \times Z_r$$
Donde $\theta_{\text{CC}}$ es la Capacidad de Campo, $\theta_{\text{PMP}}$ es el Punto de Marchitez Permanente y $Z_r$ es la profundidad radicular activa en milímetros.

### 2. Déficit de Presión de Vapor (VPD)
$$\text{VPD} = \text{VP}_{\text{sat}} \times \left(1 - \frac{\text{HR}}{100}\right) \quad \text{donde} \quad \text{VP}_{\text{sat}} = 0.61078 \times \exp\left(\frac{17.27 \times T_{\text{aire}}}{T_{\text{aire}} + 237.3}\right)$$

* **$\text{VPD} < 0.4\text{ kPa}$:** Transpiración vegetal bloqueada; alta propensión a enfermedades fungosas (*Botrytis*, *Oídio*).
* **$\text{VPD} \in [0.8, 1.2]\text{ kPa}$:** Rango de confort transpiratorio óptimo.
* **$\text{VPD} > 1.6\text{ kPa}$:** Estrés hídrico severo; cierre estomático preventivo de la planta.

---

# ⚡ SECCIÓN GENERAL 5: Ingeniería de Hardware y Electrónica

## 5.1. Diagrama de Arquitectura Integral de Sistema

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

## 5.2. Microcontrolador Principal: ESP32-WROOM-32 y Pinout Detallado

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

## 5.3. Sistema de Sensado Dual: Sonda Suelo 7-en-1 + Bosch BME280 I2C

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

## 5.4. Sistema de Potencia y Eficiencia Energética (TP5100 + Power Gating)

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

| Estado de Operación | Subsistemas Activos | Corriente Típica | Duración |
| :--- | :--- | :---: | :---: |
| **Apagado Total (Rocker OFF)** | Ninguno (circuito abierto físico) | **$0.0\,\mu\text{A}$** | Indefinida |
| **Standby BLE (Conectado)** | ESP32 (Radio BLE activo) + BME280 | $\approx 22\text{ mA}$ | Entre mediciones |
| **Ciclo de Medición Activa** | Boost 12V + Sonda 7-en-1 + MAX485 + ESP32 | $\approx 65\text{ mA}$ | $150\text{ ms}$ |
| **Transmisión de Ráfaga BLE** | ESP32 TX @ $+9\text{ dBm}$ | $\approx 85\text{ mA}$ | $50\text{ ms}$ |

* **Autonomía Práctica en Campo:** **$> 6\text{ meses}$** con 2 celdas 18650 (6.000 mAh) tomando 15 mediciones diarias.

---

## 5.5. Protocolos de Comunicación Industrial e Inalámbrica (Modbus + BLE)

### Trama Industrial RS-485 Modbus RTU (Sonda NPK)
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

### Bluetooth 5.0 BLE (GATT) hacia el Smartphone
* **Servicio Primario TerraSense:** UUID `00000001-5e4e-4c69-6d61-746572726101`
* **Característica de Telemetría (Read / Notify):** UUID `00000002-5e4e-4c69-6d61-746572726102` (paquete binario compacto de 16 bytes).

---

## 5.6. Interfaz Física del Dispositivo y Persistencia Flash NVS

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

| Estado del Dispositivo | Color LED | Patrón Visual | Significado Operacional |
| :--- | :---: | :--- | :--- |
| **Buscando Conexión** | 🔵 Azul | Pulso suave (1 Hz) | Equipo encendido, esperando conexión BLE con app. |
| **Modo Pairing Activo** | 🔵 Azul | Parpadeo rápido (4 Hz) | Pulsador presionado; ventana de enlace abierta (30 s). |
| **Enlazado y Listo** | 🟢 Verde | Luz fija continua | Conexión BLE establecida con el smartphone. |
| **Medición Exitosa** | 🟢 Verde | 3 destellos rápidos | Lectura Modbus y BME280 capturada y enviada. |
| **Batería Baja** | 🟠 Naranja | Pulso lento | Batería $< 15\%$ ($V_{\text{bat}} < 3.4\text{V}$). Recargar por USB-C. |
| **Error de Sonda** | 🔴 Rojo | Parpadeo continuo | Falla de respuesta Modbus UART o timeout de sonda. |
| **Reset de Fábrica** | 🔴 Rojo | Fijo por 3 segundos | NVS borrada; equipo restaurado a estado de fábrica. |

* **Persistencia NVS:** Las claves de bonding BLE se almacenan en la partición NVS del ESP32. Tras apagar el dispositivo, la reconexión se realiza automáticamente en **$< 1.5\text{ segundos}$** al volver a encenderlo.

---

## 5.7. BOM Electrónico Detallado y Roadmap de Hardware v2.0

* **Display OLED monocromático de 0.96" (I2C):** Lectura directa de pH, Humedad y T° en pantalla para uso sin smartphone.
* **Buzzer piezoeléctrico SMD:** Señal sonora de confirmación de medición exitosa y alerta de batería crítica.
* **Conector M8 / M12 Industrial IP68:** Desconexión rápida de la sonda para facilitar transporte y reemplazo.

---

# 💻 SECCIÓN GENERAL 6: Ecosistema de Software, Aplicación Móvil y Plataforma Cloud

## 6.1. Aplicación Móvil TerraSense (React Native / Expo / TypeScript)

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

## 6.2. Arquitectura Offline-First y Sincronización Automática (Store & Forward)

* **Operación Sin Cobertura Celular:** El motor agronómico corre localmente en SQLite/WatermelonDB dentro del smartphone.
* **Mecanismo Store & Forward:** Al detectar cobertura 4G/5G o WiFi, el servicio en segundo plano sincroniza las mediciones en cola con Supabase sin requerir acción del usuario.

---

## 6.3. Plataforma Cloud y Consola Web GIS (Supabase + PostGIS)

* **Motor Geoespacial PostGIS:** Almacenamiento de polígonos prediales vectoriales y puntos muestreados.
* **Interpolación Espacial:** Algoritmos de **Kriging e IDW** para generar mapas de calor continuo de salinidad, pH y humedad a partir de muestreos discretos.

---

## 6.4. Arquitectura Multi-Rol y Device ID Único

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

## 6.5. Actualización de Firmware Over-The-Air (WiFi OTA)

El ESP32 permite actualizar el firmware binario (`v1.0.4` $\rightarrow$ `v1.1.0`) de forma inalámbrica vía WiFi a través del smartphone o la red local.

---

# 🛠️ SECCIÓN GENERAL 7: Protocolos de Mantenimiento Integral y Ciclo de Vida

Para garantizar la confiabilidad metrológica y la disponibilidad continua del servicio en terreno, TerraSense define tres protocolos de mantenimiento sistemático:

## 7.1. Protocolo de Mantenimiento de Hardware y Sonda en Terreno

```text
RUTINA DE MANTENIMIENTO PREVENTIVO DE HARDWARE:
┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
│     POST-MUESTREO (DÍA)   │     SEMESTRAL (6 MESES)   │     ANUAL (12 MESES)      │
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ • Limpieza de agujas inox │ • Verificación en buffer  │ • Reemplazo O-ring IP67   │
│   con agua destilada.     │   pH 4.01 / 6.86 / EC 1413│ • Test de capacidad 18650 │
│ • Secado con paño suave.  │ • Ajuste de offset digital│ • Inspección membrana Gore│
│ • Apagado con Rocker Switch│ • Limpieza prensaestopas  │ • Re-torque de bornes     │
└───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

### 1. Limpieza y Cuidado de la Sonda Inox 316L
* **Limpieza de Residuos:** Tras cada jornada de muestreo, limpiar las varillas de acero con agua desmineralizada y un paño de microfibra. **Prohibido usar lijas metálicas, esponjas abrasivas o solventes clorados**, ya que degradan la capa pasivada del acero inoxidable y descalibran la reactividad iónica superficial.
* **Almacenamiento Seguro:** Guardar la sonda en su funda protectora plástica rígida para evitar dobleces mecánicos en las agujas de sensado.

### 2. Protocolo de Recalibración Semestral
* Sumergir la sonda en una solución buffer estándar de calibración ($\text{pH } 4.01$, $\text{pH } 6.86$ y estándar de conductividad $1.413\,\mu\text{S/cm}$).
* En caso de desviación $> \pm 0.1\text{ pH}$ o $> \pm 3\%\text{ EC}$, la app móvil incluye una pantalla de **Calibración Guiada de Offset** que escribe los coeficientes correctivos en la memoria Flash NVS del ESP32.

### 3. Ciclo de Vida de las Baterías Li-Ion 18650
* **Recarga Periódica en Almacén:** Si el equipo permanece sin uso durante la temporada de invierno, realizar una recarga de mantenimiento cada 90 días para evitar que el voltaje caiga por debajo del umbral crítico de descarga profunda ($< 2.8\text{V}$).
* **Sustitución Modular:** Las 2 celdas 18650 poseen un ciclo de vida de **500 a 800 ciclos de recarga completa** (~3 a 4 años de uso agronómico intenso). El receptáculo interno permite su sustitución directa sin desoldar componentes.

### 4. Estanqueidad IP67 y Membrana ePTFE
* Inspeccionar anualmente el O-ring de silicona del gabinete ABS y lubricar con grasa de silicona dieléctrica si presenta resequedad.
* La membrana hidrofóbica de ePTFE (tipo Gore-Tex) del sensor ambiental BME280 debe limpiarse con aire comprimido a baja presión para retirar el polvo acumulado sin perforarla.

---

## 7.2. Mantenimiento y Operaciones de Base de Datos Cloud (Supabase / PostGIS)

```text
ARQUITECTURA DE MANTENIMIENTO Y ALMACENAMIENTO POSTGRESQL / POSTGIS
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🗄️ PARTICIONAMIENTO TEMPORAL: `mediciones_2026_q1`, `mediciones_2026_q2`   │
│    Permite purgar o archivar temporadas agrícolas antiguas sin downtimes.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⚡ ÍNDICES GEOESPACIALES GIST: `idx_mediciones_geom_gist`                   │
│    Mantenimiento `REINDEX` mensual para acelerar consultas espaciales GIS.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🛡️ POLÍTICA DE BACKUP AUTOMÁTICO (PITR): Snapshots diarios con RPO < 1h.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Reindexación Geoespacial Periódica:**
   * Ejecutar periódicamente la reindexación de índices espaciales R-Tree / GiST para garantizar que las consultas de polígonos prediales y mapas de calor respondan en menos de $20\text{ ms}$:
     ```sql
     REINDEX INDEX idx_mediciones_coordenadas_gist;
     VACUUM ANALYZE mediciones;
     ```
2. **Estrategia de Particionamiento por Temporadas Agrícolas:**
   * La tabla principal de telemetría se encuentra particionada por rangos de fecha anuales (`mediciones_2026`, `mediciones_2027`). Esto optimiza el consumo de almacenamiento y permite archivar datos históricos en almacenamiento frío (*Cold Storage S3*) sin penalizar el rendimiento del servidor en vivo.
3. **Respaldo Automático y Disaster Recovery:**
   * Respaldos diarios automatizados gestionados por Supabase con política **PITR (Point-in-Time Recovery)** de 7 días, asegurando un **RPO (Recovery Point Objective) < 1 hora** y un **RTO (Recovery Time Objective) < 15 minutos**.
4. **Seguridad y Políticas Row Level Security (RLS):**
   * Auditoría periódica de políticas RLS para garantizar el aislamiento estricto de los datos entre diferentes agricultores y cooperativas.

---

## 7.3. Mantenimiento del Ecosistema de Software y App Móvil

1. **Sincronización de Nuevos Perfiles Agronómicos:**
   * La base de datos de cultivos local (SQLite en el smartphone) se actualiza de forma transparente mediante una Edge Function ligera en Supabase (`/sync-crops-catalog`), permitiendo incorporar nuevas variedades híbridas o cultivos regionales sin requerir actualizar la app en la tienda.
2. **Ciclo de Actualización y Compatibilidad de SO Móvil:**
   * Soporte continuo para versiones modernas de **Android (API 26 a 34+)** e **iOS (14 a 17+)**, asegurando el mantenimiento de permisos Bluetooth Low Energy (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`) y geolocalización en segundo plano.
3. **Monitoreo de Telemetría y Errores en Vivo (Sentry):**
   * Registro automatizado de excepciones y fallos de enlace BLE en tiempo real para desplegar parches en caliente mediante **Expo EAS Update** sin obligar al usuario a descargar un nuevo instalador desde Play Store.

---

# 🎯 SECCIÓN GENERAL 8: Validación Experimental, Defensa de Título y Puesta en Marcha

## 8.1. Criterios de Éxito y Matriz de Validación de KPIs

| Dimensión | Indicador Clave (KPI) | Meta Cuantificable | Método de Verificación |
| :--- | :--- | :---: | :--- |
| 🔋 **Energía** | Autonomía de batería en modo campo | $\ge 4\text{ meses}$ ($15\text{ med/día}$) | Prueba acelerada de descarga con carga activa $22\text{ mA}$. |
| 🎯 **Metrología** | Correlación en lecturas de pH y EC | $\ge 90\%$ vs. Laboratorio | Contrastación de $\ge 30$ muestras de suelo agrícola. |
| ⚡ **Rendimiento** | Tiempo de veredicto agronómico | $\le 5\text{ segundos}$ | Medición de latencia desde pulsación hasta render UI. |
| 📶 **Conectividad** | Alcance de enlace inalámbrico BLE | $\ge 30\text{ metros}$ campo abierto | Verificación de RSSI y pérdida de paquetes en terreno. |
| 🌿 **Algoritmia** | Concordancia en recomendación de cultivos| $\ge 85\%$ vs. Ingeniero Agrónomo | Validación ciega de 20 casos de prueba agronómica. |

---

## 8.2. Guía Maestra de Defensa Hostil (Las 7 Preguntas Incómodas)

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

### ❓ 6. *"Si equipos como Spectrum o Meter Group valen más de $1.500 USD, ¿por qué el tuyo cuesta $188 USD? ¿Es de menor calidad?"*
> **🎯 Respuesta:**  
> *"No. La diferencia radica en la arquitectura del sistema: ellos venden dataloggers pesados con mástiles de acero propietarios, pantallas LCD dedicadas y módems celulares con licencias anuales de software de $300 USD. Nosotros **aprovechamos la pantalla táctil de alta resolución, el GPS submétrico y el módem 4G/5G del smartphone que el agricultor ya tiene en su bolsillo**, reduciendo drásticamente el costo de hardware sin comprometer la efectividad operativa en terreno."*

---

### ❓ 7. *"¿Qué impide que una empresa asiática saque una app mañana y te copie?"*
> **🎯 Respuesta:**  
> *"El hardware es genérico; la barrera de entrada está en el **motor agronómico calibrado para los suelos y cultivos de Chile y Latinoamérica** (suelos volcánicos trumaos, arcillas del Valle Central, variedades comerciales locales y vinculación con programas de fertilización de INDAP). Los fabricantes asiáticos comercializan hardware sin contextualización biológica local ni integración con plataformas satelitales territoriales."*

---

## 8.3. Guía de Puesta en Marcha y Entornos de Desarrollo

### 8.3.1. Aplicación Móvil (React Native / Expo / TypeScript)
```bash
cd App
npm install
npx expo start
```

### 8.3.2. Consola Web Agronómica (React 18 / Vite)
```bash
cd Web
npm install
npm run dev
```

### 8.3.3. Firmware del Microcontrolador (ESP32 / PlatformIO / Arduino)
```bash
cd Firmware
# Compilación y flasheo mediante PlatformIO:
pio run --target upload
# Monitoreo serial de depuración:
pio device monitor -b 115200
```

---

## 8.4. Estructura Integral del Repositorio

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
