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
  * [1.3. La Falacia de la "Siembra al Ojo" y el Ciclo Productivo en 4 Etapas](#13-la-falacia-de-la-siembra-al-ojo-y-el-ciclo-productivo-en-4-etapas)
  * [1.4. La Brecha de Interpretación: Del Dato Crudo a la Parálisis por Análisis](#14-la-brecha-de-interpretación-del-dato-crudo-a-la-parálisis-por-análisis)
  * [1.5. El Costo Financiero del Error: Pérdidas Cuantificadas por Hectárea](#15-el-costo-financiero-del-error-pérdidas-cuantificadas-por-hectárea)
  * [1.6. Propuesta de Valor Disruptiva: El Ingeniero Agrónomo en el Bolsillo](#16-propuesta-de-valor-disruptiva-el-ingeniero-agrónomo-en-el-bolsillo)
  * [1.7. Los 5 Pilares de Diferenciación Tecnológica](#17-los-5-pilares-de-diferenciación-tecnológica)
* [⚔️ SECCIÓN GENERAL 2: Benchmarking y Análisis Competitivo Exhaustivo ($170.000 CLP hacia arriba)](#️-sección-general-2-benchmarking-y-análisis-competitivo-exhaustivo-170000-clp-hacia-arriba)
  * [2.1. Posicionamiento de Precio y Segmentación de Rivales](#21-posicionamiento-de-precio-y-segmentación-de-rivales)
  * [2.2. Fichas de Rivales Reales: Lo que Tienen vs. Lo que Falta vs. Lo que Destaca TerraSense](#22-fichas-de-rivales-reales-lo-que-tienen-vs-lo-que-falta-vs-lo-que-destaca-terrasense)
  * [2.3. Diagramas de Flujo Operativo de las Alternativas (Workflows de la Competencia)](#23-diagramas-de-flujo-operativo-de-las-alternativas-workflows-de-la-competencia)
  * [2.4. Diagramas de Bloques de Arquitectura Tecnológica Comparativa](#24-diagramas-de-bloques-de-arquitectura-tecnológica-comparativa)
  * [2.5. Matriz Comparativa Integral de Brechas y Capacidades](#25-matriz-comparativa-integral-de-brechas-y-capacidades)
  * [2.6. Estudio de Viabilidad Técnica y Económica de las Alternativas](#26-estudio-de-viabilidad-técnica-y-económica-de-las-alternativas)
  * [2.7. Transparencia Técnica: Lo que TerraSense Admite Honestamente](#27-transparencia-técnica-lo-que-terrasense-admite-honestamente)
  * [2.8. Ventajas Competitivas Defensivas (Moats)](#28-ventajas-competitivas-defensivas-moats)
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
* [⚡ SECCIÓN GENERAL 5: Ingeniería de Hardware, Electrónica y Criterios de Eficiencia Energética](#-sección-general-5-ingeniería-de-hardware-electrónica-y-criterios-de-eficiencia-energética)
  * [5.1. Diagrama de Arquitectura Integral de Sistema Hardware](#51-diagrama-de-arquitectura-integral-de-sistema-hardware)
  * [5.2. Microcontrolador Principal: ESP32-WROOM-32 y Pinout Detallado](#52-microcontrolador-principal-esp32-wroom-32-y-pinout-detallado)
  * [5.3. Sistema de Sensado Dual: Sonda Suelo 7-en-1 + Bosch BME280 I2C](#53-sistema-de-sensado-dual-sonda-suelo-7-en-1--bosch-bme280-i2c)
  * [5.4. Criterios de Eficiencia Energética y Conmutación por Power Gating (0.0 µA)](#54-criterios-de-eficiencia-energética-y-conmutación-por-power-gating-00-µa)
  * [5.5. Protocolos de Comunicación Industrial e Inalámbrica (Modbus + BLE)](#55-protocolos-de-comunicación-industrial-e-inalámbrica-modbus--ble)
  * [5.6. Interfaz Física del Dispositivo y Persistencia Flash NVS](#56-interfaz-física-del-dispositivo-y-persistencia-flash-nvs)
  * [5.7. Especificaciones Técnicas Conceptuales y Filosofía del Proyecto](#57-especificaciones-técnicas-conceptuales-y-filosofía-del-proyecto)
* [💻 SECCIÓN GENERAL 6: Ecosistema de Software, UI/UX Móvil y Consola Web GIS](#-sección-general-6-ecosistema-de-software-uiux-móvil-y-consola-web-gis)
  * [6.1. Aplicación Móvil TerraSense: Flujo Completo de Pantallas y Wireframes (UI/UX)](#61-aplicación-móvil-terrasense-flujo-completo-de-pantallas-y-wireframes-uiux)
    * [6.1.1. Onboarding y Propuesta de Valor (Carrusel 2 Pantallas)](#611-onboarding-y-propuesta-de-valor-carrusel-2-pantallas)
    * [6.1.2. Autenticación y Gestión de Sesión](#612-autenticación-y-gestión-de-sesión)
    * [6.1.3. Lógica de Vinculación de Hardware: 3 Caminos (Admin, Segundo Usuario y Omitir)](#613-lógica-de-vinculación-de-hardware-3-caminos-admin-segundo-usuario-y-omitir)
    * [6.1.4. Pantalla Principal (Main Dashboard) y Selector de Modo](#614-pantalla-principal-main-dashboard-y-selector-de-modo)
    * [6.1.5. Pantalla de Carga Interactiva: Animación 2D y Tiempo de Muestreo (5 a 8s)](#615-pantalla-de-carga-interactiva-animación-2d-y-tiempo-de-muestreo-5-a-8s)
    * [6.1.6. Dashboard Comercial en Grid 3×3 (9 Variables Físicas)](#616-dashboard-comercial-en-grid-33-9-variables-físicas)
    * [6.1.7. Diagnóstico Individual por Variable (Modal Interactivo)](#617-diagnóstico-individual-por-variable-modal-interactivo)
    * [6.1.8. Carrusel de Recomendaciones Holísticas, Clima Predictivo (7 Días) y Guardado GPS](#618-carrusel-de-recomendaciones-holísticas-clima-predictivo-7-días-y-guardado-gps)
    * [6.1.9. Modalidad Operativa: Medición Rápida vs. Medición Detallada](#619-modalidad-operativa-medición-rápida-vs-medición-detallada)
  * [6.2. Arquitectura Offline-First y Sincronización Automática (Store & Forward)](#62-arquitectura-offline-first-y-sincronización-automática-store--forward)
  * [6.3. Plataforma Cloud y Consola Web GIS (Supabase + PostGIS)](#63-plataforma-cloud-y-consola-web-gis-supabase--postgis)
  * [6.4. Criterios de Digitalización e Inclusión Tecnológica Rural](#64-criterios-de-digitalización-e-inclusión-tecnológica-rural)
  * [6.5. Arquitectura Multi-Rol y Device ID Único](#65-arquitectura-multi-rol-y-device-id-único)
  * [6.6. Actualización de Firmware Over-The-Air (WiFi OTA)](#66-actualización-de-firmware-over-the-air-wifi-ota)
* [📜 SECCIÓN GENERAL 7: Marco Normativo, Certificaciones y Estándares Internacionales](#-sección-general-7-marco-normativo-certificaciones-y-estándares-internacionales)
  * [7.1. Normas de Hardware, Seguridad Eléctrica y Envolventes (IEC 60529 IP67, UN 38.3, RoHS)](#71-normas-de-hardware-seguridad-eléctrica-y-envolventes-iec-60529-ip67-un-383-rohs)
  * [7.2. Normas de Radiofrecuencia y Telecomunicaciones (SUBTEL, FCC Parte 15, RED)](#72-normas-de-radiofrecuencia-y-telecomunicaciones-subtel-fcc-parte-15-red)
  * [7.3. Estándares Edafológicos y Calidad de Suelo (ISO 10390, ISO 11265, ISO 11277)](#73-estándares-edafológicos-y-calidad-de-suelo-iso-10390-iso-11265-iso-11277)
  * [7.4. Legislación de Protección de Datos, Ciberseguridad y Accesibilidad (Ley 19.628, GDPR, WCAG 2.1 AA)](#74-legislación-de-protección-de-datos-ciberseguridad-y-accesibilidad-ley-19628-gdpr-wcag-21-aa)
  * [7.5. Matriz Consolidada de Cumplimiento Regulatorio](#75-matriz-consolidada-de-cumplimiento-regulatorio)
* [🛠️ SECCIÓN GENERAL 8: Protocolos de Mantenimiento Integral y Ciclo de Vida](#️-sección-general-8-protocolos-de-mantenimiento-integral-y-ciclo-de-vida)
  * [8.1. Protocolo de Mantenimiento de Hardware y Sonda en Terreno](#81-protocolo-de-mantenimiento-de-hardware-y-sonda-en-terreno)
  * [8.2. Mantenimiento y Operaciones de Base de Datos Cloud (Supabase / PostGIS)](#82-mantenimiento-y-operaciones-de-base-de-datos-cloud-supabase--postgis)
  * [8.3. Mantenimiento del Ecosistema de Software y App Móvil](#83-mantenimiento-del-ecosistema-de-software-y-app-móvil)
* [🎯 SECCIÓN GENERAL 9: Validación Experimental, Defensa de Título y Puesta en Marcha](#-sección-general-9-validación-experimental-defensa-de-título-y-puesta-en-marcha)
  * [9.1. Criterios de Éxito y Matriz de Validación de KPIs](#91-criterios-de-éxito-y-matriz-de-validación-de-kpis)
  * [9.2. Guía Maestra de Defensa Hostil (Las 7 Preguntas Incómodas)](#92-guía-maestra-de-defensa-hostil-las-7-preguntas-incómodas)
  * [9.3. Guía de Puesta en Marcha y Entornos de Desarrollo](#93-guía-de-puesta-en-marcha-y-entornos-de-desarrollo)
  * [9.4. Estructura Integral del Repositorio y Documentación Técnica](#94-estructura-integral-del-repositorio-y-documentación-técnica)

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

## 1.3. La Falacia de la "Siembra al Ojo" y el Ciclo Productivo en 4 Etapas

Sembrar "al ojo" encierra una trampa económica devastadora: **la agricultura no es una prueba de 1 hora**. Cuando un productor siembra a ciegas, no sabe si su decisión fue correcta hasta pasados **20 a 45 días** (cuando la semilla no brotó o el plantín murió por acidez/salinidad). Para ese momento, ya gastó el presupuesto de la temporada en semillas, mano de obra, diésel de tractor y fertilizante, quedando endeudado por el resto del año.

Asimismo, **el valor de la medición física del suelo no se limita únicamente a la siembra**, sino que acompaña al cultivo en sus **4 etapas fenológicas críticas**:

```text
                  CICLO FENOLÓGICO CONTINUO CON TERRASENSE
  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
  │ 1. PRE-SIEMBRA  │───►│ 2. DESARROLLO   │───►│ 3. FLORACIÓN    │───►│ 4. PRE/POST     │
  │    Y TRASPLANTE │    │    VEGETATIVO   │    │    Y CUAJADO    │    │    COSECHA      │
  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
           │                      │                      │                      │
           ▼                      ▼                      ▼                      ▼
  • Temp > Cero Veg.     • Monitoreo de N       • Control salino (EC)  • Suelo seco para
  • pH sin bloqueos        y humedad en raíz.     crítico en floración   cosecha mecánica.
  • Enmiendas cal/yeso   • Manejo de riego      • Balance K para       • Acondicionamiento
  • Evitar siembra        para evitar asfixia    llenado y calibre      para próxima rotación.
    antes de lluvia.      radicular.             de fruto.
```

1. **Riego Diario y Manejo Hídrico:** Permite saber exactamente cuándo encender o apagar las bombas de riego, evitando tanto el marchitamiento por sequedad como la asfixia radicular por sobre-riego.
2. **Crecimiento Vegetativo:** Monitorea la absorción radicular efectiva de agua y Nitrógeno en la etapa de mayor demanda fotosintética.
3. **Floración y Cuajado de Fruto:** Controla el estrés hídrico y la salinidad (EC) en el momento más delicado de la planta, donde un exceso de sales causa el aborto floral y arruina el rendimiento final.
4. **Maduración y Cosecha / Post-Cosecha:** Monitorea el secado superficial para permitir el ingreso de maquinaria pesada sin compactar el potrero y evalúa el agotamiento de nutrientes para acondicionar el suelo de cara a la siguiente temporada.

---

## 1.4. La Brecha de Interpretación: Del Dato Crudo a la Parálisis por Análisis

Incluso cuando el agricultor adquiere un instrumento comercial importado, se enfrenta a la falla estructural de la tecnología actual: **los instrumentos comerciales entregan números crudos, pero no entregan respuestas**.

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

---

## 1.5. El Costo Financiero del Error: Pérdidas Cuantificadas por Hectárea

| Escenario de Error Agronómico | Causa Físico-Química No Detectada | Impacto Financiero Directo por Hectárea (CLP) |
| :--- | :--- | :---: |
| **Pérdida Total de Siembra por Frío** | Suelo $< 10.0^\circ\text{C}$ (bajo cero vegetativo). La semilla no germina y es atacada por hongos (*Pythium*). | **$450.000 – $800.000 CLP/ha** *(Pérdida de semillas híbridas + labores de rastra).* |
| **Fertilización Inútil por Bloqueo de pH** | Aplicación de superfosfato en suelo con $\text{pH} < 5.5$. El fósforo se insolubiliza con aluminio/hierro. | **$350.000 – $600.000 CLP/ha** *(Fertilizante botado a la basura sin ser absorbido).* |
| **Quema Radicular por Salinidad** | Trasplante de hortalizas en suelo con $\text{EC} > 2.400\,\mu\text{S/cm}$ sin riego de lavado previo. | **$600.000 – $1.400.000 CLP/ha** *(Muerte de plantines y retraso comercial de 45 días).* |
| **Asfixia Radicular por Lluvia Posterior** | Siembra con humedad alta ($\text{VWC} > 38\%$) previa a frente de lluvia de $40\text{ mm}$ no pronosticado. | **$500.000 – $1.100.000 CLP/ha** *(Pudrición radicular generalizada).* |
| **Muestreo Tradicional Denso (10 Puntos)** | Enviar 10 muestras a laboratorio químico tradicional ($50.000 CLP c/u) para mapear variabilidad predial. | **$500.000 CLP** *(Costo prohibitivo e inviable para monitoreo frecuente).* |

---

## 1.6. Propuesta de Valor Disruptiva: El Ingeniero Agrónomo en el Bolsillo

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

## 1.7. Los 5 Pilares de Diferenciación Tecnológica

1. 🧠 **Diagnóstico Prescriptivo Instantáneo (≤ 5 segundos):** Convierte variables crudas (`pH 5.1`, `K 23 mg/kg`) en una orden agronómica directa.
2. 🌿 **Matriz Biológica de Compatibilidad (+80 Cultivos):** Evalúa el suelo frente a las exigencias fisiológicas de hortalizas, frutales y cereales.
3. 🌦️ **Integración Meteorológica Predictiva GPS (7 Días):** Cruza la humedad del suelo con el pronóstico de lluvias y heladas.
4. 🗺️ **Mapeo Satelital Geoespacial del Predio (GIS):** Georreferencia automáticamente cada pinchazo con el GPS del smartphone mediante PostGIS.
5. ⚡ **Costo Marginal Cero por Medición:** Muestreo de 10, 50 o 100 puntos en una mañana sin costo recurrente.

---

# ⚔️ SECCIÓN GENERAL 2: Benchmarking y Análisis Competitivo Exhaustivo ($170.000 CLP hacia arriba)

## 2.1. Posicionamiento de Precio y Segmentación de Rivales

TerraSense se comercializa a un precio objetivo de **$179.990 CLP** (rango de **$170.000 a $200.000 CLP** / ~**$185 USD**), posicionándose en el segmento de **entrada profesional accesible**.

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

### 2.2.1. Bluelab Pulse Multimedia Meter (~$255.000 – $340.000 CLP)
* **🔍 Qué tienen ellos:** Marca global consolidada, electrodos calibrados de fábrica y app móvil para hidroponía.
* **❌ Qué les falta:** No mide NPK, no mide pH en suelo vivo (requiere comprar *Soil pH Pen* elevando el combo a >$500.000 CLP), sin motor prescriptivo ni mapas GIS.
* **🚀 Qué destaca TerraSense:** Sonda 7-en-1 integrada, motor prescriptivo con +80 cultivos y precio ~35% menor que el Pulse básico.

### 2.2.2. Hanna Instruments HI9814 GroLine (~$280.000 – $380.000 CLP)
* **🔍 Qué tienen ellos:** Sonda de titanio, sistema Quick-Cal y certificación IP67 de laboratorio.
* **❌ Qué les falta:** No mide NPK, requiere preparar mezclas líquidas (*slurry*) de tierra con agua destilada (no es inserción directa), sin conectividad BLE ni GPS.
* **🚀 Qué destaca TerraSense:** Inserción directa en 5s sin mezclas, Bluetooth 5.0, sincronización cloud y diagnóstico en lenguaje natural.

### 2.2.3. FieldScout TDR 150 / 350 (Spectrum Technologies) (~$1.400.000 – $2.200.000 CLP)
* **🔍 Qué tienen ellos:** Tecnología TDR de estándar científico, mástil ergonómico de pie y varillas intercambiables.
* **❌ Qué les falta:** Precio estratosférico (8 a 12 veces mayor), no mide pH ni NPK, software satelital con suscripción anual de $300 USD.
* **🚀 Qué destaca TerraSense:** Medición 7-en-1 completa con pH y NPK, prescripciones automáticas y plataforma GIS 100% gratuita.

### 2.2.4. Meter Group ProCheck + Sonda TEROS 12 (~$900.000 – $1.600.000 CLP)
* **🔍 Qué tienen ellos:** Capacitancia a 70 MHz validada científicamente y sellado epóxico de grado militar.
* **❌ Qué les falta:** No mide pH ni NPK, interfaz enfocada en científicos (constantes dieléctricas crudas), costo 5 a 8 veces superior.
* **🚀 Qué destaca TerraSense:** Enfoque en toma de decisiones (semáforo visual, cultivos compatibles y dosis de cal en kg/ha).

### 2.2.5. Análisis Químico Tradicional de Laboratorio ($40.000 – $65.000 CLP / muestra)
* **🔍 Qué tienen ellos:** Espectrometría ICP-OES de máxima precisión y validez legal oficial para exportación.
* **❌ Qué les falta:** Demora crítica de 15 a 30 días, costo prohibitivo para muestreo denso ($500.000 CLP por 10 puntos), muestra estática desactualizada.
* **🚀 Qué destaca TerraSense:** Diagnóstico en ≤ 5 segundos a costo marginal de $0 CLP por muestra.

### 2.2.6. Asesoría Agronómica Particular ($90.000 – $200.000 CLP / visita)
* **🔍 Qué tienen ellos:** Juicio visual holístico para plagas foliares e injertos.
* **❌ Qué les falta:** Costo recurrente insostenible ($1.500.000+ CLP al año), disponibilidad limitada a las 7:00 AM.
* **🚀 Qué destaca TerraSense:** Disponibilidad 24/7 en el bolsillo por un pago único de $179.990 CLP.

---

## 2.3. Diagramas de Flujo Operativo de las Alternativas (Workflows de la Competencia)

```mermaid
flowchart TD
    subgraph Sonda_Asiatica[Sonda Genérica LCD - $200 USD]
        A1([Duda en Campo]) --> B1[Insertar Sonda] --> C1[Ver LCD: pH 5.2] --> D1{¿Sabe qué hacer?}
        D1 -- No (90%) --> E1[Parálisis por Análisis: Siembra al Ojo] --> F1[🔴 Pérdida de Cosecha]
    end

    subgraph Hanna_Bluelab[Instrumentos Hidroponía - $350 USD]
        A2([Duda en Campo]) --> B2[Preparar mezcla Slurry con agua destilada] --> C2[Medir pH en vaso] --> D2[❌ No mide NPK] --> E2[Consultar Agrónomo Externo]
    end

    subgraph Lab_Tradicional[Laboratorio Químico - $50.000 CLP/m]
        A3([Duda en Campo]) --> B3[Excavar 10 calicatas + Enviar muestra] --> C3[⏳ Espera de 15 a 30 días] --> D3[Recibir PDF de 5 páginas] --> E3[Ventana de Siembra Expirada]
    end

    subgraph TerraSense_IoT[TerraSense IoT - $179.990 CLP]
        A4([Duda a las 7:00 AM]) --> B4[Pinchar Suelo In-Situ] --> C4[Presionar Medición en App] --> D4[Adquisición 9 Variables + IA en 5s] --> E4[🟢 Semáforo + Cultivos Aptos + Dosis Cal kg/ha + Clima GPS + Mapa GIS]
    end
```

---

## 2.4. Diagramas de Bloques de Arquitectura Tecnológica Comparativa

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                 COMPARATIVA DE ARQUITECTURA DE BLOQUES                      │
│                                                                             │
│ 1. INSTRUMENTOS TRADICIONALES:                                              │
│    [ Pila 9V / AAA ] ──► [ MCU 8-Bits ] ──► [ LCD Monocromo (Dato Crudo) ]  │
│    (Sin Bluetooth, Sin GPS, Sin Cloud, Sin Inteligencia Agronómica)         │
│                                                                             │
│ 2. DATALOGGERS CIENTÍFICOS ($2.000 USD):                                    │
│    [ Panel Solar 20W + Batería 12V 7Ah ] ──► [ Datalogger ] ──► [ Módem 4G]│
│    (Peso >8 kg, Costo inasumible, suscripción anual obligatoria de $300 USD)│
│                                                                             │
│ 3. TERRASENSE IoT:                                                          │
│    [ 2x 18650 Li-Ion + Power Gating ] ──► [ ESP32 Dual-Core ] ──► [ BLE 5.0]│
│                                                   │                         │
│                                                   ▼                         │
│    [ SMARTPHONE: Inferencia IA + GPS + SQLite ] ──► [ SUPABASE + POSTGIS ]  │
│    (BOM $42.000 CLP, 0.0 µA en reposo, 100% Offline-First, Mapas GIS)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2.5. Matriz Comparativa Integral de Brechas y Capacidades

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

## 2.6. Estudio de Viabilidad Técnica y Económica de las Alternativas

### Costo Total de Propiedad (TCO Proyectado a 1, 3 y 5 Años)
Para un predio representativo de 3 hectáreas de hortalizas con un régimen de monitoreo estándar (20 mediciones de suelo por temporada):

| Solución Tecnológica | TCO Año 1 | TCO Año 3 (Acumulado) | TCO Año 5 (Acumulado) |
| :--- | :---: | :---: | :---: |
| **Laboratorio Químico (20 muestras/año)**| $1.000.000 CLP | $3.000.000 CLP | $5.000.000 CLP |
| **Asesor Agronómico (6 visitas/año)** | $720.000 CLP | $2.160.000 CLP | $3.600.000 CLP |
| **Bluelab Pulse + Soil pH Pen** | $520.000 CLP | $640.000 CLP *(Sondas rep.)*| $780.000 CLP |
| **Spectrum TDR 350 + Suscripción** | $1.950.000 CLP | $2.550.000 CLP | $3.150.000 CLP |
| **TerraSense IoT (Kit Completo)** | **$179.990 CLP** | **$195.000 CLP** *(Buffers)* | **$215.000 CLP** *(Baterías)*|

> [!IMPORTANT]
> **Ahorro Financiero a 5 Años:** TerraSense representa un **ahorro de más del 95%** en comparación con el monitoreo tradicional por laboratorio químico y un **72% de ahorro** frente a combos comerciales importados sin inteligencia.

---

## 2.7. Transparencia Técnica: Lo que TerraSense Admite Honestamente

1. **Estimación Electroquímica NPK vs. Espectrometría ICP-OES:** La sonda entrega clasificación operativa (*Bajo, Medio, Óptimo, Excesivo*) con precisión de $\pm 5\%$, ideal para fertilización en campo, pero no reemplaza un análisis SAG de certificación.
2. **Ausencia de Micronutrientes Específicos:** No mide Boro, Zinc ni Molibdeno. Se recomienda mantener un análisis de laboratorio cada 2 o 3 años.
3. **Diagnóstico Físico-Químico vs. Fitopatología Visual:** Evalúa el suelo y el microclima; no diagnostica virus foliares ni insectos visibles.

---

## 2.8. Ventajas Competitivas Defensivas (Moats)

1. **Algoritmia Regionalizada y Calibración Local:** Calibrado para suelos volcánicos trumaos, arcillas del Valle Central y suelos salinos del norte de Chile.
2. **Arquitectura 7-en-1 Integrada de Bajo Costo:** Costo BOM de **$42.000 CLP**, permitiendo un precio de venta disruptivo con margen de contribución del **76.6%**.
3. **Ecosistema Abierto sin Suscripciones Cautivas:** Plataforma cloud Supabase/PostGIS gratuita sin cobros mensuales.

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

---

## 3.4. Proyección Financiera a 3 Años y Punto de Equilibrio (Break-Even Point)

| Métrica Financiera | Año 1 (SOM 1.0%) | Año 2 (SOM 2.5%) | Año 3 (SOM 5.0%) |
| :--- | :---: | :---: | :---: |
| **Unidades Comercializadas** | **1.000 unidades** | **2.500 unidades** | **5.000 unidades** |
| **Precio de Venta Unitario (PVP)** | $179.990 CLP | $179.990 CLP | $179.990 CLP |
| **Facturación Bruta (Ingresos)** | **$179.990.000 CLP** *(~$189K USD)* | **$449.975.000 CLP** *(~$473K USD)* | **$899.950.000 CLP** *(~$947K USD)* |
| **Costo Total Directo (BOM $42K)** | $42.000.000 CLP | $105.000.000 CLP | $210.000.000 CLP |
| **MARGEN BRUTO GENERADO** | **$137.990.000 CLP** | **$344.975.000 CLP** | **$689.950.000 CLP** |
| **Margen Bruto Porcentual** | **76.6%** | **76.6%** | **76.6%** |

$$\text{Punto de Equilibrio (Unidades)} = \frac{\text{Costos Fijos Anuales}}{\text{Margen Unitario}} = \frac{\$12.000.000\text{ CLP}}{\$137.990\text{ CLP}} \approx \mathbf{87\text{ unidades/año}}$$

---

## 3.5. Retorno de Inversión (ROI) y Payback para el Agricultor

$$\text{Payback} = \frac{\$179.990\text{ CLP}}{\$350.000\text{ CLP/temporada}} \approx \mathbf{0.51\text{ temporadas}}\quad(\mathbf{\approx 2\text{ a }4\text{ meses}})$$

---

## 3.6. Canales de Distribución y Estrategia B2B / B2G

1. **Canal B2G / Institucional (INDAP y PRODESAL):** Venta directa a programas de fomento estatal con financiamiento de hasta el 80% mediante el Programa de Desarrollo de Inversiones (PDI).
2. **Canal B2B (Distribuidores de Insumos y Semilleras):** Alianzas comerciales con distribuidoras agrícolas (ej. Anasac, Copeval, Coagra).
3. **Canal Directo B2C (E-commerce Agrícola):** Venta online directa con despacho a todo Chile.

---

# 🧬 SECCIÓN GENERAL 4: Motor Agronómico IA y Modelos Científico-Matemáticos

## 4.1. Arquitectura del Motor de Inferencia Multicapa

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

---

## 4.5. Capa 4 — Integración Climática Predictiva (7 Días GPS)

* **Precipitaciones acumuladas pronosticadas:** Si se pronostican $> 25\text{ mm}$ en suelos con $\text{VWC} > 35\%$, bloquea la siembra por riesgo de lavado y asfixia.
* **Temperaturas mínimas nocturnas:** Alerta de heladas agronómicas ($< 2^\circ\text{C}$) en cultivos sensibles recién trasplantados.

---

## 4.6. Modelos de Balance Hídrico, AUD y Evapotranspiración (VPD / ET₀)

$$\text{AUD} = (\theta_{\text{CC}} - \theta_{\text{PMP}}) \times Z_r$$

$$\text{VPD} = \text{VP}_{\text{sat}} \times \left(1 - \frac{\text{HR}}{100}\right) \quad \text{donde} \quad \text{VP}_{\text{sat}} = 0.61078 \times \exp\left(\frac{17.27 \times T_{\text{aire}}}{T_{\text{aire}} + 237.3}\right)$$

---

# ⚡ SECCIÓN GENERAL 5: Ingeniería de Hardware, Electrónica y Criterios de Eficiencia Energética

## 5.1. Diagrama de Arquitectura Integral de Sistema Hardware

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
| **Power Gate Boost** | **GPIO 4** | Salida Digital | Gate de P-MOSFET (Conduce = Energiza Boost 12V y Sonda) |
| **LED RGB WS2812B** | **GPIO 5** | Salida Digital (1-Wire) | Indicador luminoso multicolor de estado del sistema |
| **Pulsador de Pairing** | **GPIO 0** | Entrada Pull-up Int. | Activación de pairing BLE (3s) / Reset fábrica (5s) |
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

## 5.4. Criterios de Eficiencia Energética y Conmutación por Power Gating (0.0 µA)

La sonda industrial RS-485 NPK 7-en-1 requiere una tensión de **$12\text{V DC}$** y un transceptor MAX485 que consumirían entre **$30\text{ mA}$ y $45\text{ mA}$** de forma continua si no se gestionaran adecuadamente.

TerraSense erradica este consumo parásito mediante un circuito de **Power Gating** con transistor MOSFET controlado por el pin **GPIO 4 del ESP32**:

```text
               CIRCUITO DE GESTIÓN DE ENERGÍA POR POWER GATING
                              V_BAT (3.7V - 4.2V)
                                       │
                                 ┌─────┴─────┐
                                 │ P-MOSFET  │
                 GPIO 4 ESP32 ──►│ Si2301DS  │ (LOW = Conduce / HIGH = 0.0 µA)
                                 └─────┬─────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
           ┌──────────────────────┐          ┌──────────────────────┐
           │ MT3608 Boost Step-Up │          │ MAX485 Driver RS-485 │
           │ 3.7V ──► 12V DC      │          │ Bus Diferencial      │
           └──────────┬───────────┘          └──────────┬───────────┘
                      └────────────────┬────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │ Sonda Suelo Inox 7-en-1       │
                       │ CONSUMO EN REPOSO: 0.0 µA     │
                       └───────────────────────────────┘
```

### Balance Energético y Cálculo de Autonomía de Campo
El consumo de energía total por ciclo de medición ($E_{\text{ciclo}}$) es de solo **$0.141\text{ mAh}$**:

| Fase Operativa | Subsistemas Activos | Corriente ($I$) | Duración ($t$) | Carga Consumida ($Q$) |
| :--- | :--- | :---: | :---: | :---: |
| **1. Conexión BLE** | ESP32 Radio BLE activa | $22.0\text{ mA}$ | $1.0\text{ s}$ | $22.0\text{ mAs}$ |
| **2. Muestreo Modbus 12V** | Boost 12V + Sonda 7-en-1 + MAX485 + BME280 + ESP32 | $65.0\text{ mA}$ | $7.0\text{ s}$ | $455.0\text{ mAs}$ |
| **3. Ráfaga BLE Telemetría**| ESP32 TX @ $+9\text{ dBm}$ | $85.0\text{ mA}$ | $0.2\text{ s}$ | $17.0\text{ mAs}$ |
| **4. Retorno a Standby BLE**| ESP32 BLE en escucha | $18.0\text{ mA}$ | $0.8\text{ s}$ | $14.4\text{ mAs}$ |
| **TOTAL POR CICLO** | | | **$9.0\text{ s}$** | **$508.4\text{ mAs} \approx \mathbf{0.141\text{ mAh}}$** |

* **Autonomía Práctica:** Con 2 celdas 18650 en paralelo ($6.000\text{ mAh} / 22.2\text{ Wh}$), el equipo soporta **más de 1.500 mediciones activas por carga**, otorgando entre **6 y 9 meses de autonomía** en régimen de campo estándar.
* **Recarga Rápida USB-C a 2A:** Módulo TP5100 que recarga al 100% en menos de 3.5 horas.

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

---

## 5.7. Especificaciones Técnicas Conceptuales y Filosofía del Proyecto

1. **"No Vendemos Datos, Vendemos Decisiones":** La agronomía es biológica; no voltimétrica.
2. **"El Smartphone es el Datalogger Universal":** Aprovechar el procesador, GPS y módem 4G/5G que el productor ya lleva en su bolsillo.
3. **"Diseño para el Campo Real":** Sin pantallas de cristal frágiles en la estaca; chasis IP67 y varillas de acero quirúrgico 316L.
4. **"Soberanía del Dato":** Sin suscripciones cautivas ni formatos cerrados.

---

# 💻 SECCIÓN GENERAL 6: Ecosistema de Software, UI/UX Móvil y Consola Web GIS

## 6.1. Aplicación Móvil TerraSense: Flujo Completo de Pantallas y Wireframes (UI/UX)

La aplicación móvil de TerraSense (desarrollada en React Native, Expo y TypeScript) fue concebida para brindar una experiencia fluida, intuitiva y robusta en terreno.

```mermaid
stateDiagram-v2
    [*] --> Onboarding: Primera Apertura
    Onboarding --> LoginScreen: Finalizar Carrusel (2 Slides)
    LoginScreen --> PairingRouter: Autenticación Exitosa
    
    state PairingRouter {
        [*] --> ChoiceModal
        ChoiceModal --> BlePairingScreen: Opción A (Admin / BLE 3s)
        ChoiceModal --> JoinDeviceScreen: Opción B (Operador / QR / ID)
        ChoiceModal --> MainDashboard: Opción C ("Ya estoy vinculado")
        
        BlePairingScreen --> MainDashboard: Pairing Exitoso
        JoinDeviceScreen --> WaitingApprovalScreen: Código Enviado
        WaitingApprovalScreen --> MainDashboard: Aprobación Recibida (Realtime)
    }
    
    state MainDashboard {
        [*] --> Idle
        Idle --> MeasureModeSelectModal: Pulsar "EMPEZAR MEDICIÓN"
        MeasureModeSelectModal --> MeasuringScreen_Fast: Modo Rápido (5s)
        MeasureModeSelectModal --> MeasuringScreen_Detail: Modo Detallado (7s)
    }
```

---

### 6.1.1. Onboarding y Propuesta de Valor (Carrusel 2 Pantallas)

```text
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│        ONBOARDING — SLIDE 1          │  │        ONBOARDING — SLIDE 2          │
│                                      │  │                                      │
│               🌱                     │  │               🤝                     │
│           TERRASENSE                 │  │          QUIÉNES SOMOS               │
│                                      │  │                                      │
│  "No vendemos datos.                 │  │  Democratizamos la agronomía         │
│   Vendemos decisiones."              │  │  de precisión para la pequeña y      │
│                                      │  │  mediana agricultura de Chile.       │
│  Tu ingeniero agrónomo de bolsillo   │  │                                      │
│  que te dice exactamente qué hacer   │  │  • Protegemos tu inversión familiar  │
│  en cada metro de tu tierra.         │  │  • Eliminamos la siembra 'al ojo'    │
│                                      │  │  • Acompañamos todo tu cultivo       │
│             ● ○                      │  │             ○ ●                      │
│       [ CONTINUAR ➔ ]                │  │       [ EMPEZAR AHORA ➔ ]            │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

* **Slide 1:** Logo de TerraSense + Refrán central (*"No vendemos datos. Vendemos decisiones. Tu ingeniero agrónomo de bolsillo"*).
* **Slide 2:** Quiénes somos, qué hacemos y a quién ayudamos (pequeña y mediana agricultura, AFC, cooperativas INDAP).

---

### 6.1.2. Autenticación y Gestión de Sesión
* Registro e inicio de sesión seguro con **Supabase Auth** (Email + Contraseña, Magic Link y Google OAuth).

---

### 6.1.3. Lógica de Vinculación de Hardware: 3 Caminos (Admin, Segundo Usuario y Omitir)

```text
┌────────────────────────────────────────────────────────┐
│             VINCULAR DISPOSITIVO TERRASENSE            │
│                                                        │
│  Selecciona cómo deseas enlazar tu equipo:             │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📡 OPCIÓN 1: VINCULAR MI EQUIPO (ADMIN)          │  │
│  │ Soy el dueño del equipo. Conectar por BLE (3s).  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 👥 OPCIÓN 2: UNIRME A UN EQUIPO EXISTENTE        │  │
│  │ Soy operador/familiar. Escanear QR o código ID.  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚡ OPCIÓN 3: YA ESTOY VINCULADO / OMITIR         │  │
│  │ Entrar directamente a la pantalla principal.     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Opción A (Propietario / Admin):** Mantener presionado el botón `PAIR` en el hardware por 3 segundos para activar el modo de anunciamiento BLE rápido (4 Hz en LED azul).
2. **Opción B (Segundo Usuario / Operador):** Escanear el código QR del administrador o ingresar el código ID de 15 dígitos del equipo (`TS-8409-2026-A9F4`), entrando a una pantalla de espera en tiempo real hasta la aprobación del admin.
3. **Opción C ("Ya Estoy Vinculado" / Omitir):** Entra directo al Main. Si no tiene hardware asociado, el Main muestra una tarjeta destacada de acceso rápido para vincularse:

```text
┌────────────────────────────────────────────────────────┐
│ ⚠️ NINGÚN EQUIPO VINCULADO                             │
│ Para realizar mediciones físicas necesitas enlazar un  │
│ equipo TerraSense.                                     │
│                                                        │
│  [ 📡 Vincular con BLE ]      [ 👥 Unirme con QR/ID ]  │
└────────────────────────────────────────────────────────┘
```

---

### 6.1.4. Pantalla Principal (Main Dashboard) y Selector de Modo

```text
┌────────────────────────────────────────────────────────┐
│ 🌿 TERRASENSE                      📡 Conectado (98%) │
│ Predio: Fundo San Fernando — Potrero 4                 │
├────────────────────────────────────────────────────────┤
│ 🌦️ CLIMA LOCAL (GPS): 16.5°C | HR 62% | ☀️ Soleado    │
│    Alerta: Sin riesgo de helada en las próx. 72 horas. │
├────────────────────────────────────────────────────────┤
│                                                        │
│              ╔══════════════════════════╗              │
│              ║   📍 EMPEZAR MEDICIÓN    ║              │
│              ╚══════════════════════════╝              │
│             [ ⚡ RÁPIDA ]   [ 🔍 DETALLADA ]           │
│                                                        │
├────────────────────────────────────────────────────────┤
│ 📊 RESUMEN DEL DÍA (4 Puntos Muestreados)              │
│ • 🟢 3 Puntos: Óptimos para siembra de Maíz / Papa     │
│ • 🟡 1 Punto: Requiere encalado de suelo (pH 5.2)      │
├────────────────────────────────────────────────────────┤
│ 🗺️ ÚLTIMA UBICACIÓN GEOESPACIAL                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │  🗺️ [ MAPA SATELITAL INTERACTIVO CON PINES ]      │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [ 🏠 Inicio ]   [ 📊 Historial ]   [ 🗺️ GIS ]   [ ⚙️ Config ]│
└────────────────────────────────────────────────────────┘
```

---

### 6.1.5. Pantalla de Carga Interactiva: Animación 2D y Tiempo de Muestreo (5 a 8s)

```text
┌────────────────────────────────────────────────────────┐
│                   MEDICIÓN EN PROCESO                  │
│                                                        │
│  Progreso de Muestreo: [██████████████░░] 78% (6.2 s) │
│                                                        │
│             ANIMACIÓN 2D EN TIEMPO REAL:               │
│                                                        │
│                      🌿 PLANTA                         │
│                      │                                 │
│          ┌───────────┴───────────┐                     │
│          │  Zona Radicular (15cm)│                     │
│          ▼                       ▼                     │
│      ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ Suelo          │
│          │ ║ ║ ║                 ▲                     │
│          │ ║ ║ ║ ← Inserción     │ 15-20 cm            │
│          │ ║ ║ ║   Vertical      │ de Profundidad      │
│          ▼ █ █ █                 ▼                     │
│                                                        │
│  📢 INSTRUCCIONES EN VIVO:                             │
│  1. Inserte las varillas de acero inox verticalmente.  │
│  2. Asegure contacto pleno con la tierra sin moverla.  │
│  3. Espere el promedio de estabilización térmica.     │
│                                                        │
│  🔄 Adquiriendo ráfaga: Muestra 8 de 10...             │
└────────────────────────────────────────────────────────┘
```

* **Fundamentación Científica:**
  1. *Polarización Dieléctrica ($0 - 2\text{ s}$):* Estabilización del campo electromagnético de alta frecuencia.
  2. *Equilibrio Térmico ($2 - 4\text{ s}$):* Ajuste de la sonda para aplicar la fórmula de compensación de Nernst en pH y conductividad.
  3. *Doble Capa Electroquímica ($4 - 6\text{ s}$):* Estabilización del potencial redox e iónico superficial.
  4. *Filtro de Mediana Móvil ($6 - 8\text{ s}$):* El ESP32 captura **10 tramas Modbus consecutivas**, descarta valores espurios y promedia las 8 restantes.

---

### 6.1.6. Dashboard Comercial en Grid 3×3 (9 Variables Físicas)

```text
┌────────────────────────────────────────────────────────┐
│ 📊 RESULTADOS DE MEDICIÓN — GRID 3×3                   │
│ Predio: Potrero Bajo | Punto: #04 | 10:45 AM          │
├────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ 💧 HUMEDAD    │ │ 🌡️ TEMP SUELO │ │ ⚡ COND. (EC) │ │
│ │    31.5 %     │ │    18.4 °C    │ │ 1.250 µS/cm │ │
│ │   🟢 Óptima   │ │   🟢 Templado │ │   🟢 Normal │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ 🧪 pH SUELO   │ │ 🟢 NITRÓGENO  │ │ 🟡 FÓSFORO (P)│ │
│ │     5.3       │ │   65 mg/kg    │ │   18 mg/kg    │ │
│ │  🔴 Ácido     │ │   🟢 Medio    │ │  🟡 Bajo      │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ 🟣 POTASIO(K) │ │ 🌤️ TEMP AIRE  │ │ 💨 HUMEDAD AMB│ │
│ │   145 mg/kg   │ │    21.2 °C    │ │    58.0 % HR  │ │
│ │   🟢 Adecuado │ │  ☀️ Favorable │ │   🟢 Confort  │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
├────────────────────────────────────────────────────────┤
│ 💡 Toca cualquier tarjeta para ver sugerencias y clima │
│                                                        │
│         [ VER DIAGNÓSTICO INTEGRAL Y CULTIVOS ➔ ]      │
└────────────────────────────────────────────────────────┘
```

---

### 6.1.7. Diagnóstico Individual por Variable (Modal Interactivo)

Al pulsar cualquier variable (ej. **🧪 pH SUELO = 5.3**):

```text
┌────────────────────────────────────────────────────────┐
│ 🧪 DETALLE: pH DEL SUELO                               │
│                                                        │
│  Valor Actual: 5.3 pH  |  Estado: 🔴 Fuertemente Ácido │
│                                                        │
│  📈 ESCALA DE ACIDEZ:                                  │
│  [ 4.0 ─── 🔴 5.3 ─── 🟡 5.8 ─── 🟢 6.5 ─── 8.5 ]      │
│                                                        │
│  ⚠️ DIAGNÓSTICO AGRONÓMICO:                            │
│  A este nivel de pH, el Fósforo (P) se encuentra       │
│  químicamente bloqueado por iones de Aluminio y        │
│  Hierro. El fertilizante que apliques se perderá en un │
│  60% sin ser absorbido por las raíces.                 │
│                                                        │
│  💊 ACCIÓN CORRECTIVA RECOMENDADA:                     │
│  • Aplicar 500 kg/ha de Cal Agrícola (CaCO₃) o dolomita│
│  • Incorporar con rastra ligera 15 días antes.         │
│  • Costo estimado de corrección: ~$35.000 CLP / ha.    │
│                                                        │
│  🌦️ CORRELACIÓN CLIMÁTICA:                             │
│  Aprovechar la humedad actual del 31.5% para que la    │
│  cal reaccione antes del alza térmica de la semana.    │
│                                                        │
│                     [ ENTENDIDO / CERRAR ]             │
└────────────────────────────────────────────────────────┘
```

---

### 6.1.8. Carrusel de Recomendaciones Holísticas, Clima Predictivo (7 Días) y Guardado GPS

```text
┌────────────────────────────────────────────────────────┐
│           DIAGNÓSTICO AGRONÓMICO INTEGRAL              │
│                                                        │
│   🟡 VEREDICTO GENERAL: CONDICIONADO / REQUIERE CAL   │
│                                                        │
│  ❓ ¿Es recomendable plantar hoy?                      │
│  ➜ SÍ para Papa, Arándano y Avena (toleran acidez).    │
│  ➜ NO para Tomate, Maíz ni Alfalfa hasta encalar.      │
│                                                        │
│  🌿 MATRIZ DE CULTIVOS COMPATIBLES:                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🟢 Papa Pastusa / Desirée   │ 92% Compatibilidad │  │
│  │ 🟢 Arándano O'Neal          │ 88% Compatibilidad │  │
│  │ 🟡 Tomate Larga Vida        │ 54% (Bloqueo de P) │  │
│  │ 🔴 Cebolla Morada           │ 28% (Incompatible) │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  💊 PLAN DE ENMIENDA INTEGRADO:                        │
│  1. Cal Agrícola: 480 kg/ha para elevar pH a 6.2.      │
│  2. Fosfato Monoamónico (MAP): 60 kg/ha para suplir P. │
│                                                        │
│             ● ○ ○      [ SIGUIENTE: CLIMA ➔ ]          │
└────────────────────────────────────────────────────────┘
```

* **Slide 1 (Matriz de Cultivos y Enmiendas):** Semáforo global holístico, evaluación de +80 cultivos y prescripción de cal en kg/ha.
* **Slide 2 (Recomendaciones Agroclimáticas):** Pronóstico GPS 7 días (Open-Meteo), alertas de heladas matinales y recomendación de suspender/activar riego tecnificado.
* **Slide 3 (Guardado Georreferenciado):** Coordenadas submétricas ($\pm 1.5\text{ m}$), asignación de cuartel/potrero y guardado local transaccional.

---

### 6.1.9. Modalidad Operativa: Medición Rápida vs. Medición Detallada

| Aspecto Operacional | ⚡ Medición Rápida | 🔍 Medición Detallada |
| :--- | :--- | :--- |
| **Público Objetivo** | Operador de cuadrilla, regador o chequeo veloz matinal. | Propietario del campo, asesor INDAP o agrónomo. |
| **Tiempo Total en Pantalla** | **~5 segundos**. | **~25 a 45 segundos**. |
| **Paso de Carga** | Animación rápida 2D + adquisición de 5s. | Animación guiada paso a paso + 7s con filtro Nernst. |
| **Presentación de Datos** | Grid 3×3 directo con semáforo global simplificado. | Grid 3×3 + Modales de diagnóstico individual. |
| **Análisis de Cultivos** | Omitido (evalúa fertilidad base general). | Matriz completa de +80 cultivos y % compatibilidad. |
| **Integración Climática** | Solo indicador de helada/lluvia en cabecera. | Pronóstico completo a 7 días y cálculo de evapotranspiración. |
| **Guardado de Datos** | Auto-guardado transparente en segundo plano. | Formulario con asignación de cuartel, etapa y notas. |

---

## 6.2. Arquitectura Offline-First y Sincronización Automática (Store & Forward)

* **Operación Sin Cobertura Celular:** El motor agronómico corre localmente en SQLite/WatermelonDB dentro del smartphone.
* **Mecanismo Store & Forward:** Al detectar cobertura 4G/5G o WiFi, el servicio en segundo plano sincroniza las mediciones en cola con Supabase sin requerir acción del usuario.

---

## 6.3. Plataforma Cloud y Consola Web GIS (Supabase + PostGIS)

```text
┌────────────────────────────────────────────────────────┐
│ 🗺️ VISOR PREDIAL GEOESPACIAL           [ 🎛️ Capas ▼ ] │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │  🛰️ MAPA SATELITAL PREDIAL (HORTALIZAS)           │ │
│ │                                                    │ │
│ │   (P1) 🟢          (P2) 🟢                         │ │
│ │    pH 6.4           pH 6.6                         │ │
│ │                                                    │ │
│ │           (P3) 🟡                                  │ │
│ │            pH 5.8 [Cal 200 kg]                     │ │
│ │                                                    │ │
│ │   (P4) 🔴          (P5) 🟢                         │ │
│ │    pH 5.1           pH 6.5                         │ │
│ │    [Salino!]                                       │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🎛️ FILTROS ACTIVOS:                                    │
│ [ Capa: Semáforo Global ▼ ]   [ Fecha: Últimos 30 días ]│
│                                                        │
│ 📈 RESUMEN DEL PREDIO:                                 │
│ • Superficie Muestreada: 3.2 Hectáreas                 │
│ • Puntos Totales: 18 mediciones georreferenciadas      │
│ • % Superficie Apta: 78% (2.5 ha) | Enmienda: 22%      │
│                                                        │
│       [ 📄 EXPORTAR INFORME TÉCNICO PDF / EXCEL ]      │
└────────────────────────────────────────────────────────┘
```

* **Motor Geoespacial PostGIS:** Almacenamiento de polígonos prediales vectoriales y puntos muestreados con tipo `GEOMETRY(Point, 4326)`.
* **Interpolación Espacial:** Algoritmos de **Kriging e IDW** para generar mapas de calor continuo de salinidad, pH y humedad a partir de muestreos discretos.

---

## 6.4. Criterios de Digitalización e Inclusión Tecnológica Rural

1. **De la Libreta de Papel al GIS Satelital:** Cada pinchazo queda registrado con fecha, hora y coordenadas GPS submétricas.
2. **Cero Pérdida de Información:** Respaldo automático en nube Supabase al recuperar señal móvil.
3. **Interoperabilidad Estatal:** Generación de informes agronómicos exportables para INDAP, SAG y Comisión Nacional de Riego (CNR).

---

## 6.5. Arquitectura Multi-Rol y Device ID Único

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

## 6.6. Actualización de Firmware Over-The-Air (WiFi OTA)

El ESP32 permite actualizar el firmware binario (`v1.0.4` $\rightarrow$ `v1.1.0`) de forma inalámbrica vía WiFi a través del smartphone o la red local.

---

# 📜 SECCIÓN GENERAL 7: Marco Normativo, Certificaciones y Estándares Internacionales

TerraSense se rige por un marco de cumplimiento normativo multidisciplinario:

```text
                     MATRIZ DE ESTÁNDARES Y REGULACIONES
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ HARDWARE & ENERGÍA     │ 📡 RADIO & TELECOM      │ 🧪 EDAFOLOGÍA & AGRO  │
│ • IEC 60529 (IP67)        │ • SUBTEL Res. 1.985     │ • ISO 10390 (pH)      │
│ • UN 38.3 / IEC 62133-2   │ • FCC Parte 15 Clase B  │ • ISO 11265 (EC)      │
│ • RoHS 3 (2015/863/EU)    │ • RED 2014/53/EU (BLE)  │ • Métodos SAG / INIA  │
├───────────────────────────┼─────────────────────────┼───────────────────────┤
│ 🏭 PROTOCOLOS INDUSTRIALES│ 🛡️ CIBERSEGURIDAD & PRIV│ 👁️ ACCESIBILIDAD & UX │
│ • EIA/TIA-485-A           │ • Ley 19.628 / GDPR     │ • WCAG 2.1 Nivel AA   │
│ • Modbus-IDA v1.1b3       │ • ISO/IEC 27001 (SGSI)  │ • ISO/IEC 25010       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 7.1. Normas de Hardware, Seguridad Eléctrica y Envolventes (IEC 60529 IP67, UN 38.3, RoHS)
* **IEC 60529 (Grado de Protección IP67):** Gabinete hermético frente al polvo fino de campo e inmersión temporal en agua a 1 metro durante 30 minutos. Sonda de acero Inox 316L con grado **IP68**.
* **UN 38.3 e IEC 62133-2:** Ensayos de choque térmico, impacto y sobrecarga en el pack de 2 celdas Li-Ion 18650 con módulo de protección BMS TP5100.
* **Directiva RoHS 2011/65/EU / RoHS 3:** Soldadura libre de plomo (SAC305) y componentes SMD certificados.
* **Ley REP N° 20.920 (Chile):** Gestión responsable y reciclaje de baterías al fin de su vida útil.

## 7.2. Normas de Radiofrecuencia y Telecomunicaciones (SUBTEL, FCC Parte 15, RED)
* **SUBTEL Resolución Exenta N° 1.985 / 2017 (Chile):** Dispositivos de corto alcance en la banda 2.4 GHz con $\text{PIRE} \le 100\text{ mW}$ (TerraSense opera a $+9\text{ dBm} \approx 8\text{ mW}$, 100% exento de licencia).
* **FCC Parte 15 Subparte B y C:** Módulo precertificado ESP32-WROOM-32 con FCC ID: 2AC7Z-ESPWROOM32.

## 7.3. Estándares Edafológicos y Calidad de Suelo (ISO 10390, ISO 11265, ISO 11277)
* **ISO 10390:2021:** Determinación de pH con compensación de temperatura basada en la ecuación electroquímica de Nernst.
* **ISO 11265:1994:** Normalización de conductividad eléctrica a $25.0^\circ\text{C}$ con coeficiente térmico $\alpha = 2.0\% / ^\circ\text{C}$.
* **ISO 11277:** Granulometría y caracterización textural de suelos agrícolas según estándares SAG / INIA.

## 7.4. Legislación de Protección de Datos, Ciberseguridad y Accesibilidad (Ley 19.628, GDPR, WCAG 2.1 AA)
* **Ley N° 19.628 / Nueva Ley de Protección de Datos Personales (Chile):** Consentimiento informado, soberanía del dato y aislamiento de predios mediante **Row Level Security (RLS)** en PostgreSQL.
* **ISO/IEC 27001:** Cifrado en tránsito vía TLS 1.3 / HTTPS / WSS y en reposo mediante AES-256.
* **WCAG 2.1 Nivel AA:** Botones de área táctil $\ge 48 \times 48\text{ dp}$, contraste $\ge 4.5:1$ y semáforo cromático con texto redundante para campesinos adultos mayores.

## 7.5. Matriz Consolidada de Cumplimiento Regulatorio

| Norma / Estándar | Ámbito de Aplicación | Nivel de Cumplimiento | Método de Verificación en TerraSense |
| :--- | :--- | :---: | :--- |
| **IEC 60529** | Estanqueidad Mecánica IP67 | **100% Cumplido** | Envolvente ABS con O-ring de silicona y prensaestopas IP68. |
| **UN 38.3 / IEC 62133**| Seguridad Baterías Li-Ion | **100% Cumplido** | Celdas 18650 certificadas + módulo BMS TP5100 integrado. |
| **RoHS 2011/65/EU** | Restricción Sustancias Peligrosas | **100% Cumplido** | Fabricación PCB Lead-Free (SAC305) y componentes SMD certificados. |
| **SUBTEL Res. 1.985** | Radiocomunicaciones Chile | **100% Cumplido** | Emisión BLE a $+9\text{ dBm}$ ($< 100\text{ mW}$ límite legal). |
| **FCC Part 15 Class B**| Emisiones Electromagnéticas | **100% Cumplido** | Módulo pre-homologado ESP32-WROOM-32 FCC ID. |
| **Modbus RTU v1.1b3**| Comunicación Serial Sonda | **100% Cumplido** | Trama industrial UART2 a 115.200 bps con checksum CRC-16. |
| **ISO 10390 / 11265** | Metrología de pH y Conductividad | **100% Cumplido** | Compensación Nernst y normalización a $25^\circ\text{C}$ con $\alpha=2\%$. |
| **Ley N° 19.628 / GDPR**| Privacidad de Datos Prediales | **100% Cumplido** | Row Level Security (RLS) en Supabase + Cifrado TLS 1.3. |
| **WCAG 2.1 Nivel AA** | Accesibilidad e Inclusividad | **100% Cumplido** | Botones $\ge 48\text{dp}$, contraste $\ge 4.5:1$ y semáforo redundante. |

---

# 🛠️ SECCIÓN GENERAL 8: Protocolos de Mantenimiento Integral y Ciclo de Vida

## 8.1. Protocolo de Mantenimiento de Hardware y Sonda en Terreno

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

1. **Limpieza y Cuidado de la Sonda Inox 316L:** Limpiar con agua desmineralizada y microfibra tras cada jornada. Prohibido usar esponjas abrasivas o cloro.
2. **Recalibración Semestral Guiada:** Inmersión en soluciones buffer estándar ($\text{pH } 4.01 / 6.86$ y $\text{EC } 1.413\,\mu\text{S/cm}$) con ajuste de offset digital en la Flash NVS del ESP32.
3. **Ciclo de Vida Li-Ion 18650:** Recarga trimestral en invierno para evitar descarga profunda ($< 2.8\text{V}$). Vida útil de 500 a 800 ciclos completos.
4. **Estanqueidad IP67:** Inspección anual del O-ring de silicona y limpieza con aire comprimido suave de la membrana hidrofóbica ePTFE del sensor BME280.

---

## 8.2. Mantenimiento y Operaciones de Base de Datos Cloud (Supabase / PostGIS)

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

---

## 8.3. Mantenimiento del Ecosistema de Software y App Móvil

1. **Sincronización de Nuevos Perfiles Agronómicos:** Actualización transparente de catálogo de cultivos vía Edge Function ligera (`/sync-crops-catalog`).
2. **Compatibilidad Móvil:** Soporte continuo para **Android (API 26 a 34+)** e **iOS (14 a 17+)**.
3. **Despliegue en Caliente:** Parches inmediatos mediante **Expo EAS Update** sin obligar al usuario a reinstalar desde tiendas.

---

# 🎯 SECCIÓN GENERAL 9: Validación Experimental, Defensa de Título y Puesta en Marcha

## 9.1. Criterios de Éxito y Matriz de Validación de KPIs

| Dimensión | Indicador Clave (KPI) | Meta Cuantificable | Método de Verificación |
| :--- | :--- | :---: | :--- |
| 🔋 **Energía** | Autonomía de batería en modo campo | $\ge 6\text{ meses}$ ($8\text{ med/día}$) | Ensayo de descarga acelerada con carga activa $22\text{ mA}$. |
| 🎯 **Metrología** | Correlación en lecturas de pH y EC | $\ge 90\%$ vs. Laboratorio | Contrastación de $\ge 30$ muestras de suelo agrícola. |
| ⚡ **Rendimiento** | Tiempo de veredicto agronómico | $\le 5\text{ segundos}$ | Medición de latencia desde pulsación hasta render UI. |
| 📶 **Conectividad** | Alcance de enlace inalámbrico BLE | $\ge 30\text{ metros}$ campo abierto | Verificación de RSSI y pérdida de paquetes en terreno. |
| 🌿 **Algoritmia** | Concordancia en recomendación de cultivos| $\ge 85\%$ vs. Ingeniero Agrónomo | Validación ciega de 20 casos de prueba agronómica. |

---

## 9.2. Guía Maestra de Defensa Hostil (Las 7 Preguntas Incómodas)

### ❓ 1. *"¿Qué hace tu equipo que no haga un medidor chino de $200 USD si usan la misma sonda?"*
> **🎯 Respuesta:**  
> *"El equipo genérico chino es solo una pantalla voltimétrica que muestra 7 números aislados (`pH 5.1`, `EC 2400`). El agricultor común no sabe qué hacer con eso. **TerraSense vende una decisión:** procesa esos datos con su motor agronómico y en 5 segundos le entrega un semáforo claro diciéndole: 'No plantes tomates porque el pH bloqueará el fósforo; aplica 500 kg/ha de cal agrícola y en su lugar planta papas o lechuga'. Además, georreferencia cada punto en un mapa satelital predial y sincroniza con la nube, algo que el equipo chino no puede hacer."*

### ❓ 2. *"¿Por qué no mandar un análisis tradicional de laboratorio una vez al año y olvidarse de tu aparato?"*
> **🎯 Respuesta:**  
> *"Porque el suelo cambia todos los días y el laboratorio cuesta $40.000 CLP y tarda 3 semanas. Para cuando llega el resultado, la ventana de siembra ya pasó. El suelo varía según la última lluvia, la temperatura de la semana o la salinidad acumulada por el riego. El laboratorio es una foto mensual cara; TerraSense es un monitoreo en tiempo real a costo cero por medición."*

### ❓ 3. *"¿Por qué un campesino de 60 años te compraría a ti si lleva 40 años sembrando 'al ojo'?"*
> **🎯 Respuesta:**  
> *"Porque el cambio climático rompió la regla del 'ojo'. Hoy un saco de fertilizante supera los $45.000 CLP y una bolsa de semilla híbrida cuesta $150.000 CLP. Si siembra a ciegas en un suelo frío o salino y pierde la siembra, se endeuda por todo el año. Diseñamos la app con interfaz de semáforo (Verde, Amarillo, Rojo) para que cualquier persona entienda el veredicto en 2 segundos sin requerir conocimientos técnicos."*

### ❓ 4. *"¿De verdad un agricultor pequeño tiene $180.000 CLP para comprar esto?"*
> **🎯 Respuesta:**  
> *"Un productor de 2 hectáreas de hortalizas invierte entre $2.000.000 y $5.000.000 CLP por temporada en insumos. Gastar $179.990 CLP una sola vez en la vida para proteger esa inversión representa menos del 4% de su presupuesto de siembra. Además, nuestro modelo B2B apunta a compras colectivas a través de programas de INDAP, PRODESAL y cooperativas agrícolas."*

### ❓ 5. *"¿Qué pasa si en medio del cerro no hay señal 4G?"*
> **🎯 Respuesta:**  
> *"El sistema funciona 100% desconectado. La sonda se comunica con el teléfono por Bluetooth Low Energy (BLE) sin requerir internet. El motor agronómico corre localmente en el procesador del smartphone y entrega el veredicto en 5 segundos. En cuanto el usuario recupera cobertura 4G o WiFi, la app se sincroniza en segundo plano con la base de datos Supabase."*

### ❓ 6. *"Si equipos como Spectrum o Meter Group valen más de $1.500 USD, ¿por qué el tuyo cuesta $188 USD? ¿Es de menor calidad?"*
> **🎯 Respuesta:**  
> *"No. La diferencia radica en la arquitectura del sistema: ellos venden dataloggers pesados con mástiles de acero propietarios, pantallas LCD dedicadas y módems celulares con licencias anuales de software de $300 USD. Nosotros **aprovechamos la pantalla táctil de alta resolución, el GPS submétrico y el módem 4G/5G del smartphone que el agricultor ya tiene en su bolsillo**, reduciendo drásticamente el costo de hardware sin comprometer la efectividad operativa en terreno."*

### ❓ 7. *"¿Qué impide que una empresa asiática saque una app mañana y te copie?"*
> **🎯 Respuesta:**  
> *"El hardware es genérico; la barrera de entrada está en el **motor agronómico calibrado para los suelos y cultivos de Chile y Latinoamérica** (suelos volcánicos trumaos, arcillas del Valle Central, variedades comerciales locales y vinculación con programas de fertilización de INDAP). Los fabricantes asiáticos comercializan hardware sin contextualización biológica local ni integración con plataformas satelitales territoriales."*

---

## 9.3. Guía de Puesta en Marcha y Entornos de Desarrollo

### 9.3.1. Aplicación Móvil (React Native / Expo / TypeScript)
```bash
cd App
npm install
npx expo start
```

### 9.3.2. Consola Web Agronómica (React 18 / Vite)
```bash
cd Web
npm install
npm run dev
```

### 9.3.3. Firmware del Microcontrolador (ESP32 / PlatformIO / Arduino)
```bash
cd Firmware
# Compilación y flasheo mediante PlatformIO:
pio run --target upload
# Monitoreo serial de depuración:
pio device monitor -b 115200
```

---

## 9.4. Estructura Integral del Repositorio y Documentación Técnica

```text
TerraSence/
├── README.md                                      # Documento maestro y especificación integral exhaustiva
├── .gitignore                                     # Reglas de exclusión de Git
├── docs/                                          # Documentación técnica formal de respaldo
│   ├── FLUJO_PANTALLAS_APP_MOVIL.md               # Wireframes ASCII, UI/UX, estados y tiempos de muestreo
│   ├── DIAGRAMAS_ALTERNATIVAS_COMPETENCIA.md      # Flujos operativos Mermaid y arquitectura de rivales
│   ├── ESTUDIO_VIABILIDAD_TECNICA_ECONOMICA.md    # TCO a 5 años, curvas de costo marginal y modelos INDAP
│   ├── ESPECIFICACIONES_CONCEPTUALES_Y_FILOSOFIA.md # Filosofía, arquitectura hardware/software y RNF
│   ├── MARCO_NORMATIVO_Y_ESTANDARES.md            # IEC 60529, UN 38.3, RoHS, SUBTEL, ISO, GDPR/Ley 19.628
│   └── CRITERIOS_EFICIENCIA_ENERGETICA_Y_DIGITALIZACION.md # Power Gating 0.0µA, balance de energía y GIS AFC
├── App/                                           # Aplicación Móvil React Native (Expo + TypeScript)
│   ├── App.tsx                                    # Componente raíz: máquina de estados y navegación
│   ├── tsconfig.json                              # Configuración TypeScript estricta
│   ├── app.json                                   # Configuración de permisos BLE, GPS y red
│   ├── src/
│   │   ├── engine/                                # Motor Agronómico: reglas, cultivos, enmiendas
│   │   ├── services/                              # Bluetooth BLE, GPS, Open-Meteo, Supabase Sync
│   │   ├── screens/                               # Pantallas: Radar, Semáforo, Cultivos, Mapa
│   │   └── types/                                 # Interfaces y tipos de datos del sistema
│   └── package.json                               # Dependencias de la app móvil
├── Web/                                           # Consola Web Agronómica (React 18 + Vite + GIS)
│   ├── src/
│   │   ├── components/                            # Visor satelital PostGIS, heatmaps, panel soporte
│   │   └── pages/                                 # Gestión predial y administración de dispositivos
│   └── package.json                               # Dependencias web
├── Firmware/                                      # Firmware C++ para microcontrolador ESP32
│   ├── src/
│   │   ├── main.cpp                               # Máquina de estados principal y bucle de eventos
│   │   ├── ble/                                   # Servidor GATT, bonding NVS y handler de pairing
│   │   ├── modbus/                                # Driver RS-485 Modbus RTU para sonda 7-en-1
│   │   ├── sensors/                               # Driver I2C para Bosch BME280
│   │   ├── power/                                 # Control de MOSFET Power Gating y lectura de batería
│   │   └── ui/                                    # Control de LED WS2812B y debounce de pulsador
│   ├── platformio.ini                             # Configuración de entorno de compilación PlatformIO
│   └── CMakeLists.txt                             # Configuración para ESP-IDF
├── PCB/                                           # Diseño Electrónico en KiCad
│   ├── TerraSense_v2.kicad_sch                    # Esquemático de circuito electrónico
│   ├── TerraSense_v2.kicad_pcb                    # Ruteo de pistas de 2 capas
│   └── BOM.csv                                    # Lista de materiales para ensamblaje SMT
├── Diseño 3D/                                     # Modelado CAD de Carcasas y Empuñaduras
│   └── Carcasa_IP67_TerraSense.step               # Archivo STEP para inyección/impresión 3D
└── supabase/                                      # Infraestructura Backend Serverless
    ├── migrations/                                # Esquema de tablas PostGIS y políticas RLS
    └── functions/                                 # Edge Functions para sincronización y reportes
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
