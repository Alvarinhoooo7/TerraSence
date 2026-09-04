# 🌱 TerraSense — Sistema IoT de Diagnóstico Agronómico Prescriptivo

> **No vendemos datos. Vendemos decisiones agronómicas en menos de 5 segundos.**

**Proyecto de Título — Ingeniería en Electrónica y Sistemas Inteligentes, INACAP**  
**Autores:** Álvaro Villena y Alan (Socios Fundadores) · **Versión:** 3.5 Oficial (Septiembre 2026)

| Dimensión | Especificación Oficial del Negocio |
| :--- | :--- |
| **Producto** | Instrumento agronómico portátil de diagnóstico edafológico 7-en-1 con sensor ambiental BME280 y motor prescriptivo local en smartphone |
| **Pila Tecnológica** | ESP32-WROOM-32E · RS-485 Modbus RTU · BLE 5.0 · React Native (Expo/TS) · Supabase + PostGIS · Vite Backoffice |
| **Mercado Objetivo** | Pequeño y mediano agricultor comercial (0,5 a 20 ha), asesores agronómicos y recambio generacional en Chile |
| **Precio Oficial** | **$249.990 CLP con IVA** ($210.076 CLP valor neto de venta) |
| **Inversión Inicial**| **$26.548.500 CLP** — 100 % privada: $8,9 M pie de socios + $12,65 M banco (5 años) + $5 M línea corta ($0 subsidios) |
| **Rentabilidad Oficial**| **VAN (20 %): +$2.588.182 CLP** · **TIR: 22,72 %** · **Pay Back: 3,71 años** · **Equilibrio Año 1: 166 unidades** |
| **Retorno por Socio**| **+$79.588.754 CLP netos** en el bolsillo a 5 años (17,9× sobre el pie inicial de $4.450.000 CLP de cada socio) |

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![ESP32](https://img.shields.io/badge/MCU-ESP32--WROOM--32E-E7352C.svg)](https://www.espressif.com/)
[![BLE](https://img.shields.io/badge/Radio-BLE%205.0-0082FC.svg)](https://www.bluetooth.com/)
[![React Native](https://img.shields.io/badge/App-React%20Native%20%2B%20Expo-61DAFB.svg)](https://reactnative.dev/)
[![Web Console](https://img.shields.io/badge/Web-Vite%20%2B%20Tailwind-646CFF.svg)](https://terrasense-web.vercel.app)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2B%20PostGIS-3ECF8E.svg)](https://supabase.com/)

---

## 🗺️ Ecosistema Tecnológico y Enlaces a Módulos

El proyecto se encuentra modularizado con documentación técnica especializada en cada carpeta:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ARQUITECTURA DEL SISTEMA                                │
├────────────────────────────────────────────────────────┬────────────────────────────────┤
│ 🔌 Hardware, PCB y Diseño Portátil                     │ 📱 Aplicación Móvil de Campo   │
│    Diseño KiCad 8.0, módulo combo TP4056 + Step-Up     │    React Native, Expo, BLE,    │
│    5V, P-MOSFET (0 µA reposo), LiPo 2.000 mAh, USB-C   │    4 etapas fenológicas,       │
│    y chasis ergonómico compacto de mano IP67.          │    carrusel de 3 páginas.      │
│    ➜ Ver: [PCB/README.md](PCB/README.md)               │    ➜ Ver: [App/README.md](App/README.md) │
├────────────────────────────────────────────────────────┼────────────────────────────────┤
│ 🖥️ Consola Web de Soporte y Firmware                  │ 🗄️ Backend y Base de Datos     │
│    Backoffice operativo en Vite + React, panel         │    PostgreSQL en Supabase con  │
│    /admin, diagnóstico de flota, fábrica reset y       │    PostGIS, políticas RLS y    │
│    distribución masiva OTA /firmware.                  │    Edge Functions (Deno).      │
│    ➜ Ver: [Web/README.md](Web/README.md)               │    ➜ Ver: [supabase/README.md](supabase/README.md) │
├────────────────────────────────────────────────────────┼────────────────────────────────┤
│ 📊 Planilla Financiera Maestra (Excel)                 │ 📑 Estudio de Viabilidad y GTM │
│    Inversiones, amortización bancaria, gastos fijos,   │    Estudio formal y guion de   │
│    flujo proyectado a 5 años, VAN, TIR y Pay Back.     │    defensa oral para comisión. │
│    ➜ Ver: [Flujo de caja.xlsx](Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx) │ ➜ Ver: [Comercialización](Comercializacion%20de%20Tecnologias/README.md) / [docs](docs/ESTUDIO_VIABILIDAD_TECNICA_ECONOMICA.md) │
└────────────────────────────────────────────────────────┴────────────────────────────────┘
```

---

## 📑 Tabla de Contenidos

1. [I. Resumen Ejecutivo del Proyecto](#i-resumen-ejecutivo-del-proyecto)
2. [II. Descripción de la Problemática Agronómica y Económica](#ii-descripción-de-la-problemática-agronómica-y-económica)
   - [2.1. El Contexto Macro: Megasequía y Suelo Degradado](#21-el-contexto-macro-megasequía-y-suelo-degradado)
   - [2.2. El Micro-Problema: La Decisión de las 7:00 AM](#22-el-micro-problema-la-decisión-de-las-700-am)
   - [2.3. Por qué el Laboratorio Químico No Resuelve el Día a Día](#23-por-qué-el-laboratorio-químico-no-resuelve-el-día-a-día)
   - [2.4. Cuantificación Económica del Error Agronómico](#24-cuantificación-económica-del-error-agronómico)
   - [2.5. Universo Censal Verificado (Censo 2021)](#25-universo-censal-verificado-censo-2021)
3. [III. Propuesta de Solución y Filosofía de Producto](#iii-propuesta-de-solución-y-filosofía-de-producto)
   - [3.1. Arquitectura de Cuatro Capas de Inferencia](#31-arquitectura-de-cuatro-capas-de-inferencia)
   - [3.2. Qué NO es este Proyecto (Límites Declarados)](#32-qué-no-es-este-proyecto-límites-declarados)
4. [IV. Estudio de Mercado y Factibilidad Comercial](#iv-estudio-de-mercado-y-factibilidad-comercial)
   - [4.1. Dimensionamiento de Mercado: TAM, SAM y SOM](#41-dimensionamiento-de-mercado-tam-sam-y-som)
   - [4.2. Benchmarking y Análisis Competitivo](#42-benchmarking-y-análisis-competitivo)
   - [4.3. Estrategia Comercial Go-To-Market (Año 1)](#43-estrategia-comercial-go-to-market-año-1)
   - [4.4. Escalamiento Comercial y Agencia de Marketing (Años 2 a 5)](#44-escalamiento-comercial-y-agencia-de-marketing-años-2-a-5)
5. [V. Estudio Económico y Evaluación Financiera Integral](#v-estudio-económico-y-evaluación-financiera-integral)
   - [5.1. Estructura de Costos Unitarios (BOM a Costo Variable)](#51-estructura-de-costos-unitarios-bom-a-costo-variable)
   - [5.2. Determinación del Precio Oficial ($249.990) y Margen](#52-determinación-del-precio-oficial-249990-y-margen)
   - [5.3. Inversión Inicial y Estructura de Financiamiento 100 % Privado](#53-inversión-inicial-y-estructura-de-financiamiento-100--privado)
   - [5.4. Gastos Fijos Quinquenales y Escalamiento de Operarios](#54-gastos-fijos-quinquenales-y-escalamiento-de-operarios)
   - [5.5. Validación de Mercado del Servicio Contable (Outsourcing PYME vs Nómina)](#55-validación-de-mercado-del-servicio-contable-outsourcing-pyme-vs-nómina)
   - [5.6. Punto de Equilibrio Contable (166 unidades)](#56-punto-de-equilibrio-contable-166-unidades)
   - [5.7. Estado de Resultados y Flujo de Fondos Proyectado a 5 Años](#57-estado-de-resultados-y-flujo-de-fondos-proyectado-a-5-años)
   - [5.8. Indicadores Oficiales de Rentabilidad: VAN, TIR y Pay Back](#58-indicadores-oficiales-de-rentabilidad-van-tir-y-pay-back)
   - [5.9. Retribución y Ganancias por Socio Fundador (Álvaro y Alan)](#59-retribución-y-ganancias-por-socio-fundador-álvaro-y-alan)
6. [VI. Resumen de Módulos del Ecosistema Tecnológico](#vi-resumen-de-módulos-del-ecosistema-tecnológico)
   - [6.1. Hardware Embarcado y Sensor Portátil (PCB)](#61-hardware-embarcado-y-sensor-portátil-pcb)
   - [6.2. Aplicación Móvil de Campo (App)](#62-aplicación-móvil-de-campo-app)
   - [6.3. Consola Web de Soporte y Actualización (Web)](#63-consola-web-de-soporte-y-actualización-web)
   - [6.4. Backend y Seguridad de Datos (Supabase)](#64-backend-y-seguridad-de-datos-supabase)
7. [VII. Condiciones Técnicas, Normativas y Metrología](#vii-condiciones-técnicas-normativas-y-metrología)
8. [VIII. Puesta en Marcha y Ejecución Local](#viii-puesta-en-marcha-y-ejecución-local)
9. [IX. Conclusiones y Defensa del Proyecto](#ix-conclusiones-y-defensa-del-proyecto)
10. [X. Referencias Bibliográficas](#x-referencias-bibliográficas)

---

# I. Resumen Ejecutivo del Proyecto

**TerraSense** es un instrumento agronómico portátil de diagnóstico edafológico prescriptivo. Integra un chasis ergonómico compacto de mano con una sonda industrial 7-en-1 de inserción directa (humedad volumétrica, temperatura de suelo, conductividad eléctrica, pH, nitrógeno, fósforo y potasio estimados por conductividad), un microcontrolador ESP32-WROOM-32E, un sensor ambiental de superficie Bosch BME280 y una aplicación móvil que procesa localmente un motor de inferencia agronómica de cuatro capas.

El sistema se diseñó bajo una premisa central: **el agricultor no necesita números crudos; necesita prescripciones inmediatas y comprensibles**. En menos de 5 segundos, sin requerir conexión a internet ni pagar suscripciones mensuales, la aplicación entrega un semáforo 3×3 de variables críticas, diagnóstico holístico contextualizado con el clima y recomendaciones concretas de labor, dosis y costos según la etapa fenológica del cultivo (pre-siembra, vegetativo, floración o cosecha).

El modelo de negocio es **100 % autofinanciado y privado ($0 subsidios CORFO)**, sustentado en un precio de venta unitario de **$249.990 CLP con IVA** ($210.076 CLP neto) y una estructura de costos que asegura un margen de contribución del **56,5 % ($118.767 CLP/unidad)**. Con una inversión inicial de **$26.548.500 CLP** financiada entre capital propio de los socios ($8.900.000 CLP) y crédito bancario con garantía FOGAPE ($17.648.500 CLP), el proyecto alcanza el punto de equilibrio en **166 unidades** en el Año 1 frente a 200 planificadas (+20,5 % de margen de seguridad).

A 5 años y con una tasa de descuento exigida del 20 % anual, el proyecto genera un **VAN de +$2.588.182 CLP**, una **TIR del 22,72 %**, un **Pay Back de 3,71 años**, utilidad neta positiva todos los años y un **retorno acumulado de +$79.588.754 CLP limpios en el bolsillo para cada socio fundador**.

---

# II. Descripción de la Problemática Agronómica y Económica

## 2.1. El Contexto Macro: Megasequía y Suelo Degradado
El suelo agrícola es el activo productivo más valioso de una explotación, pero en la inmensa mayoría de los predios pequeños y medianos **nunca se mide físicamente**.

Chile atraviesa la sequía más prolongada de su historia documentada: desde 2010, la zona central (Coquimbo a La Araucanía) acumula un **déficit de precipitaciones del ~30 % ininterrumpido** <sup>[4]</sup>. Esto genera dos impactos críticos en el agro:
1. **Salinización progresiva de suelos:** La menor lluvia reduce el lavado natural de sales, y el riego con aguas subterráneas o de pozo concentra sales en la zona radicular activa. La conductividad eléctrica deja de ser un valor teórico y se convierte en el principal factor limitante del cultivo.
2. **Desacople térmico y fenológico:** Las fechas tradicionales de siembra ("a mediados de septiembre") ya no coinciden con la temperatura real del suelo a 15 cm de profundidad. Sembrar en suelo frío pudre la semilla antes de germinar.

## 2.2. El Micro-Problema: La Decisión de las 7:00 AM
Cada mañana, el agricultor se enfrenta al potrero con la inversión de su temporada comprometida:
* *¿Riego hoy o el suelo todavía retiene humedad en profundidad?* (Regar de más lava nutrientes y gasta energía de bombeo; regar de menos provoca estrés hídrico irreversible).
* *¿Aplico fertilizante hoy?* (Si el pH del suelo está fuera de rango, entre 5,5 y 7,0, los nutrientes quedan bloqueados químicamente: el agricultor gasta dinero en fertilizante que la planta no puede absorber).
* *¿El agua de riego está acumulando sales en la raíz?*

## 2.3. Por qué el Laboratorio Químico No Resuelve el Día a Día
El análisis químico de laboratorio acreditado es la referencia de oro analítica, pero posee barreras insalvables para el manejo diario de campo:
* **Costo por muestra:** $35.000 a $60.000 CLP por análisis. Muestrear una grilla de 10 puntos en un predio costaría más de $350.000 CLP.
* **Tiempo de espera:** Demora entre 15 y 30 días hábiles en entregar resultados. La ventana agronómica de siembra o fertilización se cierra semanas antes de recibir el informe.
* **Brecha de interpretación:** Entrega una hoja con decenas de valores técnicos (meq/100g, ppm, dS/m) sin indicarle al productor qué hacer exactamente en su potrero.

> **Tesis del proyecto:** TerraSense no reemplaza al laboratorio químico. Convierte mediciones frecuentes de terreno en decisiones inmediatas a **costo marginal cero**, recomendando un análisis de laboratorio cada 2 o 3 años como contraste de calibración.

## 2.4. Cuantificación Económica del Error Agronómico
Tomar decisiones a ciegas genera pérdidas masivas en la pequeña y mediana agricultura:
* **Pérdida por siembra en suelo frío (< 12 °C en maíz o tomate):** Pérdida del 30 % al 50 % de la emergencia de plántulas, con costo de resiembra y semilla de **$400.000 a $900.000 CLP por hectárea**.
* **Bloqueo de fertilizantes por pH ácido o alcalino:** Inmovilización de hasta el 60 % del fósforo aplicado. Pérdida económica de **$350.000 a $700.000 CLP por hectárea** en insumos botados al suelo.
* **Estrés salino no detectado:** Caída del 20 % al 40 % en el rendimiento de cosecha en hortalizas sensibles.

## 2.5. Universo Censal Verificado (Censo 2021)
Según el VIII Censo Agropecuario y Forestal (INE 2021) <sup>[1]</sup>:
* **Unidades Productivas Agropecuarias (UPA):** 138.628 unidades comerciales.
* **Unidades de Autoconsumo (UAC):** 36.928 unidades (< 2 ha).
* **Total Nacional Censado:** **175.556 explotaciones** sobre 48,7 millones de hectáreas.
* **Hogares rurales con conectividad móvil (Subtel 2024):** **94,5 %** de cobertura rural, de los cuales el 51,4 % depende exclusivamente de su smartphone.

---

# III. Propuesta de Solución y Filosofía de Producto

TerraSense traslada la inteligencia al teléfono del agricultor:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                       FLUJO DE ADQUISICIÓN Y DECISIÓN                       │
 └─────────────────────────────────────────────────────────────────────────────┘

  [ Sonda Portátil de Mano ] ──(BLE 5.0 GATT)──► [ Smartphone (App Offline) ]
    • 7 Variables de Suelo (Modbus 5V)             • Motor Inferencia 4 Capas
    • 2 Variables Ambientales (BME280)             • Clima Local (Open-Meteo)
    • Muestreo en 3 a 5 segundos                   • Prescripción y Dosis
                                                           │
                                                           ▼ (Sincronización cuando hay red)
                                                 [ Nube Supabase + Backoffice Web ]
```

## 3.1. Arquitectura de Cuatro Capas de Inferencia
La aplicación ejecuta un algoritmo determinista calibrado para cultivos chilenos:
1. **Capa 1 (Veredicto Físico 3×3):** Compara cada una de las 7 variables de suelo y 2 ambientales contra umbrales agronómicos clasificados en semáforo: Verde (Óptimo), Amarillo (Precaución) y Rojo (Crítico).
2. **Capa 2 (Veto Cruzado de Salinidad sobre NPK):** Si la conductividad eléctrica supera los $1.000\,\mu	ext{S/cm}$, el motor veta automáticamente la estimación de nitrógeno, fósforo y potasio para evitar sobredosis tóxicas.
3. **Capa 3 (Contextualización Fenológica):** Adapta los requerimientos según la fase elegida por el usuario: Pre-siembra (Siembra), Vegetativo, Floración o Cosecha.
4. **Capa 4 (Prescripción y Clima):** Cruza el estado del suelo con el pronóstico de 7 días (riesgo de heladas, olas de calor o lluvias) y emite acciones agronómicas claras con dosis de enmienda (ej. cal agrícola, yeso o lavado) y costo estimado por hectárea.

## 3.2. Qué NO es este Proyecto (Límites Declarados)
* **No es un laboratorio acreditado:** No reemplaza la cromatografía ni análisis de micronutrientes para certificación de exportación.
* **No es un diagnóstico foliar:** Detecta condiciones de suelo y microclima; no plagas de follaje ni virus.
* **No es un SaaS con suscripción:** El cliente compra el hardware una vez. La app es gratuita, sin pagos mensuales ni bloqueo de funciones.

---

# IV. Estudio de Mercado y Factibilidad Comercial

## 4.1. Dimensionamiento de Mercado: TAM, SAM y SOM
* **TAM (Mercado Total Direccionable):** **175.556 explotaciones** agrícolas en Chile (universo censal INE 2021).
* **SAM (Mercado Servible Disponible):** **~120.000 explotaciones** (productores de hortalizas, frutales y chacras con smartphone en las regiones de Coquimbo a Los Lagos).
* **SOM Año 1 (Meta Comercial):** **200 unidades** (16,7 unidades al mes), lo que representa apenas el **0,17 % del SAM** y el **0,11 % del TAM**.
* **SOM Acumulado a 5 Años:** **2.550 unidades** en 5 años (200 + 350 + 500 + 650 + 850), equivalente al **2,13 % del SAM**.

## 4.2. Benchmarking y Análisis Competitivo

| Equipo / Solución | Precio con IVA | Variables | Prescripción Agronómica | Modelo de Pago |
| :--- | ---:|:---:|:---:|:---:|
| **Hanna HI9814 GroLine** | $269.010 CLP | 4 | ❌ Solo números crudos | Pago único |
| **Bluelab Pulse Meter** | $310.185 CLP | 3 | ❌ Muestra dato en pantalla | Pago único |
| **FieldScout TDR 350** | $1.367.925 CLP | 2 | ❌ Requiere software externo | Pago único alto |
| **Análisis de Laboratorio** | $35.000/muestra | 12+ | ⚠️ Informe técnico diferido | Recurrente por muestra |
| **TerraSense IoT** | **$249.990 CLP** | **9 (7+2)** | **✔ Prescripción en app < 5 s**| **Pago único sin cuotas** |

## 4.3. Estrategia Comercial Go-To-Market (Año 1)
En el primer año, la venta es directa y digital, autogestionada por los socios fundadores con un presupuesto de marketing de **$1.200.000 CLP ($100.000/mes)**:
1. **Tienda E-Commerce Shopify:** Plataforma formal con emisión automática de **Factura Electrónica con IVA** (crédito fiscal indispensable que recupera el agricultor), pasarela Webpay Plus / Mercado Pago en **3 a 6 cuotas sin interés de ~$41.600 a $50.000 CLP/mes**, y despachos trazables mediante Starken y Bluexpress.
2. **Pauta Digital Directa (Meta & Google Ads):** Anuncios en video mostrando el uso real del sensor portátil de mano insertándose en potreros con barro y el resultado instantáneo en la app, más campañas de búsqueda en Google para términos de alta intención (*"sensor ph suelo chile"*, *"medidor humedad agrícola"*).
3. **Embudo Click-to-WhatsApp:** Cada anuncio dirige a WhatsApp Business, donde los socios fundadores resuelven dudas agronómicas y cierran la venta en forma personalizada.
4. **Público Objetivo (Recambio Generacional):** La pauta se segmenta quirúrgicamente hacia los hijos y administradores jóvenes de predios agrícolas (28 a 45 años) y agrónomos asesores independientes que gestionan múltiples campos.

## 4.4. Escalamiento Comercial y Agencia de Marketing (Años 2 a 5)
A partir del Año 2, la empresa terceriza su comercialización en una **agencia de marketing digital externa**:
* **Presupuesto de Agencia:** $7.080.000 CLP (Año 2), $10.680.000 CLP (Año 3), $12.000.000 CLP (Año 4) y $14.400.000 CLP (Año 5).
* **Canales B2B e Institucionales:** Apertura del canal INDAP / PRODESAL (el programa PDI cofinancia entre el 60 % y 90 % de inversiones en tecnología para la pequeña agricultura) y convenios de distribución con cooperativas y tiendas de insumos agrícolas.

---

# V. Estudio Económico y Evaluación Financiera Integral

## 5.1. Estructura de Costos Unitarios (BOM a Costo Variable)
El costo de fabricación unitario está auditado con proveedores industriales a escala real:

| Componente del Costo | Detalle Técnico / Proveedor | Monto $ CLP |
| :--- | :--- | ---:|
| **Electrónica SMD y Módulos** | ESP32-WROOM-32E, BME280, SP3485, combo TP4056 + Step-Up 5V, pasivos | $5.820 |
| **Fabricación PCB** | Placa FR-4 de 2 capas compacta + ensamblaje SMT turnkey (JLCPCB) | $1.900 |
| **Flete y Arancel** | Courier consolidado internacional + arancel de importación 6 % | $980 |
| **Batería y Potencia** | Batería LiPo convencional 3.7V 2.000 mAh con PCM + cable JST | $3.800 |
| **Conectores y Sellos** | USB-C estanco con tapón de silicona, pulsador táctil, junta tórica IP67 | $1.850 |
| **Chasis Ergonómico de Mano** | Carcasa compacta PETG técnico grado agrícola (peso < 280 g, 0 tubo aluminio) | $1.800 |
| **Empaque y Manual** | Caja serigrafiada, manual impreso, espuma troquelada y desecante | $2.100 |
| **Sonda Industrial 7-en-1**| Sonda edafológica RS-485 Modbus RTU (4.5V–30V), resina y acero 316L | **$48.000** |
| **TOTAL BOM INDUSTRIAL** | | **$66.250** |
| (+) Flete nacional al cliente | Despacho a todo Chile vía Bluexpress (~$5.000 + IVA) | $6.000 |
| (+) Merma y scrap (3 %) | Tolerancia por fallas de ensamble y pruebas de calidad | $1.988 |
| (+) Garantía legal 6 meses (5 %) | Provisión técnica según Ley 21.398 del Consumidor | $3.313 |
| (+) Mano de obra directa | 1,5 horas de ensamble, calibración y testeo @ $6.000/h | $9.000 |
| **COSTO VARIABLE UNITARIO ENTREGADO (Año 1)** | | **$86.551** |

*Curva de escala por volumen:* Año 1: $86.551 CLP | Año 2: $83.954 CLP (factor 0,97) | Año 3: $81.358 CLP (factor 0,94) | Año 4: $79.627 CLP (factor 0,92) | Año 5: $77.896 CLP (factor 0,90).

## 5.2. Determinación del Precio Oficial ($249.990) y Margen
* **Precio de Venta con IVA:** **$249.990 CLP**
* **Precio de Venta Neto (sin IVA):** **$210.076 CLP** ($249.990 ÷ 1,19)
* **Costo Variable Unitario:** **$86.551 CLP**
* **Margen de Contribución Unitario:** **$123.525 CLP** por sonda vendida.
* **Margen de Contribución Porcentual:** **58,80 %** sobre el valor neto de venta (86,4 % sobre el BOM).

## 5.3. Inversión Inicial y Estructura de Financiamiento 100 % Privado

$$	extbf{Inversión Inicial Total } (I_0): \mathbf{\$26.548.500	ext{ CLP}}$$

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DESGLOSE DE INVERSIONES Y FINANCIAMIENTO                        │
├──────────────────────────────────┬───────────┬─────────────────────────────────────────┤
│ Concepto de Inversión            │ Monto CLP │ Detalle                                 │
├──────────────────────────────────┼───────────┼─────────────────────────────────────────┤
│ 1. Activo Nominal                │ $4.418.090│ Constitución SpA, marca INAPI, ensayos  │
│ 2. Capital de Trabajo            │$14.806.910│ 3 meses de gastos fijos + lote 100 u    │
│ 3. Contingencia de Imprevistos   │ $2.413.500│ 10 % sobre inversión de puesta en marcha│
│ 4. Activo Fijo                   │ $4.910.000│ 2 impresoras 3D, instrumental, 2 PCs    │
├──────────────────────────────────┼───────────┼─────────────────────────────────────────┤
│ TOTAL INVERSIÓN INICIAL          │$26.548.500│ Requerimiento total de capital          │
├──────────────────────────────────┴───────────┴─────────────────────────────────────────┤
│ FUENTES DE FINANCIAMIENTO (100 % PRIVADO — $0 SUBSIDIO ESTATAL)                        │
├──────────────────────────────────┬───────────┬─────────────────────────────────────────┤
│ • Capital Propio (Pie de Socios) │ $8.900.000│ 33,52 % ($4.450.000 por socio)          │
│ • Crédito Bancario 5 Años (10 %) │$12.648.500│ 47,64 % (Garantía FOGAPE, $3,34 M/año)  │
│ • Línea Corto Plazo 1 Año (15 %) │ $5.000.000│ 18,83 % (Garantía FOGAPE, primer lote)  │
│ • Subsidio Estatal (CORFO/FIA)   │        $0 │ 0,00 % (Autonomía financiera total)     │
└──────────────────────────────────┴───────────┴─────────────────────────────────────────┘
```

## 5.4. Gastos Fijos Quinquenales y Escalamiento de Operarios

| Concepto de Gasto Fijo | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
| :--- | ---:| ---:| ---:| ---:| ---:|
| **Sueldo empresarial de los 2 socios** | $13.285.272 | $14.400.000 | $21.600.000 | $24.000.000 | $28.800.000 |
| *→ Sueldo mensual bruto por socio* | *$553.553 (IMM)* | *$600.000* | *$900.000* | *$1.000.000* | *$1.200.000* |
| **Ensamblador(es) de liceo técnico** | **$0 (socios)**| $3.490.000 *(0,5 FTE)*| $6.980.000 *(1 FTE)*| $6.980.000 *(1 FTE)*| $10.460.000 *(1,5 FTE)*|
| Arriendo de taller y oficina | $0 *(casa)* | $0 *(casa)* | $4.200.000 | $4.200.000 | $5.040.000 |
| Servicios digitales (Shopify, Supabase, tiendas)| $841.580 | $850.000 | $900.000 | $950.000 | $1.000.000 |
| Servicios básicos (luz, agua, internet) | $360.000 | $420.000 | $1.140.000 | $1.140.000 | $1.320.000 |
| Contabilidad, patente municipal y legal | $840.000 | $960.000 | $1.680.000 | $1.680.000 | $1.980.000 |
| Materiales indirectos y seguros | $420.000 | $480.000 | $840.000 | $900.000 | $980.000 |
| **Subtotal Gastos de Administración** | **$15.746.852** | **$20.600.000** | **$37.340.000** | **$39.850.000** | **$49.580.000** |
| **Marketing (Año 1 Ads / Año 2+ Agencia)**| **$1.200.000** | **$7.080.000** | **$10.680.000** | **$12.000.000** | **$14.400.000** |
| **TOTAL GASTOS FIJOS OPERACIONALES** | **$16.946.852** | **$27.680.000** | **$48.020.000** | **$51.850.000** | **$63.980.000** |

*Criterio de dotación técnica:* En el Año 1, los 2 socios cubren las 300 horas de ensamble anuales (3 h/semana cada uno). Desde el Año 2, se contratan técnicos egresados de liceos industriales a Ingreso Mínimo Mensual cargado (+5 % costo patronal), dimensionados estrictamente por horas reales de ensamble, calibración y QA (2,25 h/unidad sobre 1.800 h productivas anuales por FTE).

## 5.5. Validación de Mercado del Servicio Contable (Outsourcing PYME vs Nómina)
* **Por qué no se contrata un contador interno indefinido:** Según portales laborales en Chile (Indeed, Talent.com, Computrabajo) y guías de remuneraciones (Robert Half, Michael Page 2024-2025), un Contador General junior percibe un sueldo bruto de **$850.000 a $1.300.000 CLP/mes**. Al agregar la gratificación legal (Art. 50 Código del Trabajo, 25 %) y las cargas patronales obligatorias (SIS 1,49 %, AFC empleador 2,4 %, Mutual de Seguridad 1,83 %), el costo real de empresa se sitúa en **$1.150.000 a $1.350.000 CLP/mes ($13,8M a $16,2M anuales)**. Para emitir 16 facturas de venta y procesar 2 sueldos al mes (3 a 4 horas de trabajo real mensual), contratar un contador interno consumiría el **36 % de todas las ventas netas de TerraSense ($42M)**, haciendo quebrar el proyecto.
* **Outsourcing Contable Especializado para PYMEs:** Plataformas y estudios tributarios chilenos (Contabilizate.cl, TuContador.cl, ChileContador.cl, DeNegocios.cl) cobran tarifas mensuales de **1,5 UF a 2,5 UF/mes ($57.000 a $95.000 CLP/mes)** para microempresas en Régimen Pro Pyme (F29 mensual, compras/ventas, Previred y DJ de renta anual).
* **Asignación en el modelo:** **$70.000/mes ($840.000/año = ~1,84 UF/mes)** en el Año 1, escalando a **$80.000/mes** (Año 2), **$140.000/mes** (Años 3 y 4, al formalizar taller físico y pagar Patente Comercial Municipal semestral) y **$165.000/mes** (Año 5).

## 5.6. Punto de Equilibrio Contable (166 unidades)
El volumen mínimo de ventas requerido para no registrar pérdidas en el Año 1, cubriendo gastos fijos, depreciación de activos e intereses bancarios:

$$	ext{Punto de Equilibrio} = rac{	ext{Gastos Fijos} + 	ext{Depreciación} + 	ext{Costo Financiero}}{	ext{Precio Neto} - 	ext{Costo Variable Unitario}} = rac{\$16.946.852 + \$811.190 + \$2.014.850}{\$118.767} = \mathbf{166\ 	ext{unidades}}$$

* **Unidades planificadas:** **200 unidades**.
* **Holgura de seguridad:** **+20,5 % (+34 unidades de margen sobre el equilibrio)**.

## 5.7. Estado de Resultados y Flujo de Fondos Proyectado a 5 Años

| Concepto | Año 0 | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
| :--- | ---:| ---:| ---:| ---:| ---:| ---:|
| **Unidades vendidas** | — | **200** | **350** | **500** | **650** | **850** |
| **(+) VENTAS NETAS** | $0 | $42.015.200 | $73.526.600 | $105.038.000 | $136.549.400 | $178.564.600 |
| (−) Costos operacionales (variables)| $0 | −$18.261.800 | −$30.999.500 | −$42.915.000 | −$54.602.600 | −$69.851.300 |
| (−) Gastos fijos operacionales | $0 | −$16.946.852 | −$27.680.000 | −$48.020.000 | −$51.850.000 | −$63.980.000 |
| (−) Depreciación activo fijo | $0 | −$811.190 | −$811.190 | −$811.190 | −$811.190 | −$811.190 |
| (−) Costo financiero (intereses) | $0 | −$2.014.850 | −$1.057.671 | −$829.774 | −$579.087 | −$303.331 |
| **(=) UTILIDAD OPERACIONAL** | $0 | **$3.980.508** | **$12.978.239** | **$12.462.036** | **$28.706.523** | **$43.618.779** |
| (−) Impuesto a la renta (25 % Pro Pyme)| $0 | −$995.127 | −$3.244.560 | −$3.115.509 | −$7.176.631 | −$10.904.695 |
| **(=) UTILIDAD NETA CONTABLE** | $0 | **$2.985.381** | **$9.733.679** | **$9.346.527** | **$21.529.892** | **$32.714.084** |
| (+) Depreciación (no es salida de caja)| — | +$811.190 | +$811.190 | +$811.190 | +$811.190 | +$811.190 |
| (−) Amortización de capital bancario | — | −$7.071.792 | −$2.278.972 | −$2.506.869 | −$2.757.556 | −$3.033.311 |
| (−) Inversión inicial ($I_0$) | −$26.548.500 | — | — | — | — | — |
| **(=) FLUJO DE FONDOS NETO** | **−$26.548.500** | **−$3.275.221** | **+$8.265.898** | **+$7.650.848** | **+$19.583.527** | **+$30.491.963** |
| **Flujo de fondos acumulado** | **−$26.548.500** | **−$29.823.721** | **−$21.557.824** | **−$13.906.975** | **+$5.676.552** | **+$36.168.514** |

> **Prueba de Caja:** El Año 1 es el único con flujo de caja negativo (−$3.275.221 CLP), y es un comportamiento esperado y planificado: ese año se amortiza la deuda corta completa de $5.000.000 CLP más la primera amortización de capital bancario ($2.071.792 CLP). El capital de trabajo inicial ($14,8M) está dimensionado para absorber esta salida sin estrés de liquidez. A partir del Año 2, extinguida la línea corta, la empresa genera flujos fuertemente positivos hasta acumular **$36,17 millones** al cierre del Año 5.

## 5.8. Indicadores Oficiales de Rentabilidad: VAN, TIR y Pay Back

| Indicador Financiero | Valor Oficial | Criterio de Aceptación | Veredicto del Proyecto |
| :--- | ---:|:---:|:---:|
| **V.A.N. (Tasa de Descuento 20 % anual)**| **+$2.588.182 CLP** | VAN > 0 (Crea valor económico) | ✔ **Proyecto Rentable** |
| **V.A.N. (Tasa de Descuento 15 % anual)**| **+$8.241.084 CLP** | Tasa bancaria estándar PYME | ✔ **Crecimiento Sólido** |
| **T.I.R. (Tasa Interna de Retorno)** | **22,72 %** | TIR > 20 % exigido | ✔ **Supera Tasa de Corte** |
| **Pay Back (Plazo de Recuperación)** | **3,71 años** | Recuperación < 5 años (cruza en Año 4) | ✔ **Recuperación Probada** |
| **Punto de Equilibrio Año 1** | **166 unidades** | < 200 unidades planificadas | ✔ **Holgura de 20,5 %** |
| **Utilidad Neta Quinquenal** | Positiva siempre | Crecimiento de $2,99 M a $32,71 M | ✔ **Sin años de pérdida** |

## 5.9. Retribución y Ganancias por Socio Fundador (Álvaro y Alan)
El modelo financiero detalla los ingresos percibidos por cada socio (**50 % Álvaro Villena y 50 % Alan**), combinando sueldo empresarial fijo mensual (gasto deducible según Art. 31 N° 6 de la Ley de la Renta) y retiro de dividendos de caja libre:

| Concepto Financiero | Año 0 | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 | TOTAL 5 AÑOS |
| :--- | :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Sueldo Empresarial Bruto por socio (anual)** | $0 | **$6.642.636** | **$7.200.000** | **$10.800.000** | **$12.000.000** | **$14.400.000** | **$51.042.636** |
| *→ Sueldo mensual bruto por socio* | *$0* | *$553.553 (IMM)* | *$600.000* | *$900.000* | *$1.000.000* | *$1.200.000* | *—* |
| *→ Sueldo mensual líquido en bolsillo* | *$0* | *~$450.000* | *~$490.000* | *~$735.000* | *~$815.000* | *~$975.000* | *—* |
| **Flujo libre de caja de la empresa** | −$26.548.500 | −$3.275.221 | $8.265.898 | $7.650.848 | $19.583.527 | $30.491.963 | $62.717.014 |
| **Reparto de Dividendos por socio (50 %)** | $0 | **$0** *(amortiza deuda)* | **$4.132.949** | **$3.825.424** | **$9.791.763** | **$15.245.981** | **$32.996.118** |
| **TOTAL INGRESOS PERCIBIDOS POR SOCIO** | **$0** | **$6.642.636** | **$11.332.949** | **$14.625.424** | **$21.791.763** | **$29.645.981** | **$84.038.754** |
| *(−) Pie de capital inicial aportado por socio* | −$4.450.000 | $0 | $0 | $0 | $0 | $0 | −$4.450.000 |
| **(=) RETORNO NETO LIMPIO EN EL BOLSILLO** | | | | | | | **+$79.588.754 CLP** |

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         BALANCE PATRIMONIAL DEL SOCIO AL CIERRE DEL AÑO 5                      │
├───────────────────────────────────────────────────────┬────────────────────────────────────────┤
│ Capital Propio Invertido (Pie Inicial en el Banco)    │ −$4.450.000 CLP                        │
│ Total Sueldos Empresariales Percibidos (5 años)       │ +$51.042.636 CLP                       │
│ Total Dividendos de Caja Retirados (50 % del flujo)   │ +$32.996.118 CLP                       │
│ Retorno Neto Acumulado en el Bolsillo por Socio       │ +$79.588.754 CLP limpios               │
│ Multiplicador sobre el Capital Propio Aportado        │ 17,9× veces la inversión inicial       │
│ Activo Patrimonial Adicional al Año 5                 │ Dueño del 50 % de TerraSense SpA,      │
│                                                       │ libre de deudas y con 850 u/año ventas │
└───────────────────────────────────────────────────────┴────────────────────────────────────────┘
```

---

# VI. Resumen de Módulos del Ecosistema Tecnológico

Para mantener la documentación limpia y modular, el detalle de ingeniería profunda se gestiona en sus carpetas dedicadas:

### 6.1. Hardware Embarcado y Sensor Portátil (PCB)
* **Contenido:** Esquemáticos KiCad 8.0, ruteo de 2 capas, pinout del ESP32-WROOM-32E, módulo combo TP4056 con Step-Up 5V integrado, conmutación por P-MOSFET para lograr **0,0 µA en reposo**, batería convencional de litio de 2.000 mAh recargable por USB-C, chasis ergonómico compacto de mano IP67 e interfaz de muestreo directo en suelo con trama binaria BLE GATT de 16 bytes.
* ➜ **Documentación completa:** [`PCB/README.md`](PCB/README.md)

### 6.2. Aplicación Móvil de Campo (App)
* **Contenido:** Desarrollada en React Native 0.81, Expo 54, TypeScript y Zustand. Principio offline-first total, enlace BLE automático por GATT, recordatorio de limpieza de electrodos, flujo obligatorio de 4 etapas fenológicas, carrusel de 3 páginas (Grid 3×3 interactivo, diagnóstico holístico con clima y mapa predial con círculos de 20 metros exclusivo para siembra).
* ➜ **Documentación completa:** [`App/README.md`](App/README.md)

### 6.3. Consola Web de Soporte y Actualización (Web)
* **Contenido:** SPA desarrollada en React 19, Vite 6 y Tailwind CSS v4. Funciona estrictamente como **backoffice técnico para el fabricante/administrador**: panel de soporte `/admin` con búsqueda multi-criterio, ficha técnica de sonda con curvas de batería y roles de miembros, factory reset remoto, distribución centralizada de firmware OTA (`/firmware`) y roadmap futuro.
* ➜ **Documentación completa:** [`Web/README.md`](Web/README.md)

### 6.4. Backend y Seguridad de Datos (Supabase)
* **Contenido:** PostgreSQL en São Paulo (Brasil) con extensión geoespacial PostGIS, autenticación, políticas estrictas de seguridad a nivel de fila (RLS), funciones RPC atómicas (`register_paired_device`, `claim_operator_membership`, `reset_device_to_factory`) y Edge Functions en Deno (`device-checkin`, `send-push-alert`).
* ➜ **Documentación completa:** [`supabase/README.md`](supabase/README.md)

---

# VII. Condiciones Técnicas, Normativas y Metrología

TerraSense cumple con el marco normativo chileno e internacional aplicable:
* **Seguridad Eléctrica y Baterías:** Celda Li-Ion / LiPo convencional de 2.000 mAh con circuito PCM de protección contra sobretensión, sobredescarga y cortocircuito complementado por el módulo TP4056 según estándar IEC 62133-2. Tensión máxima en chasis de 5V DC (SELV - Muy Baja Tensión de Seguridad), exenta de certificación SEC de alta tensión.
* **Telecomunicaciones y Radiofrecuencia:** Módulo ESP32 con certificación internacional FCC/CE y cumplimiento de la Resolución Exenta 1.985 de SUBTEL para dispositivos de corto alcance en banda ISM de 2,4 GHz (potencia EIRP < 100 mW).
* **Protección Mecánica y Ambiental:** Chasis ergonómico compacto y sellado perimetral diseñado bajo estándar IP67 (protección total contra polvo e inmersión temporal). Sonda edafológica encapsulada en resina epóxica industrial bajo grado IP68.
* **Metrología y Edafología:** Mediciones edafológicas alineadas con las guías de muestreo y fertilización de INIA (Instituto de Investigaciones Agropecuarias) y estándares ISO 11272 para humedad volumétrica de suelo.

➜ *Para el análisis normativo exhaustivo, consultar:* [`docs/MARCO_NORMATIVO_Y_ESTANDARES.md`](docs/MARCO_NORMATIVO_Y_ESTANDARES.md).

---

# VIII. Puesta en Marcha y Ejecución Local

### 1. Variables de Entorno
El sistema utiliza un único archivo `.env` en la raíz del proyecto para centralizar credenciales (ignorado por Git):

```env
EXPO_PUBLIC_SUPABASE_URL=https://bjmhjatykqccksddgtmo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 2. Comandos de la Aplicación Móvil (`App/`)
```bash
cd App
npm install
npm test            # Ejecuta las 18 pruebas unitarias automatizadas
npx expo start      # Inicia el entorno Expo para desarrollo en dispositivo
```

### 3. Comandos de la Consola Web (`Web/`)
```bash
cd Web
npm install
npm run dev         # Inicia el servidor de desarrollo Vite (http://localhost:5173)
npm run build       # Genera el paquete optimizado de producción
npm run type-check  # Validación estricta de tipos TypeScript
```

---

# IX. Conclusiones y Defensa del Proyecto

1. **Factibilidad Técnica Comprobada:** El prototipo reúne 7 variables de suelo y 2 atmosféricas mediante un enlace industrial RS-485 con aislamiento de potencia por MOSFET (0,0 µA en reposo), garantizando más de **4.000 a 6.000 mediciones efectivas** con una batería de litio convencional de 2.000 mAh recargable por USB-C. El formato portátil de mano ultraliviano (< 280 g) permite muestreos rápidos e inserción directa en el suelo sin fatiga ni estructuras mecánicas pesadas.
2. **Propuesta Prescriptiva Superior:** TerraSense no compite en exactitud de laboratorio ni satura al usuario con números crudos: entrega diagnósticos agronómicos holísticos y recomendaciones prácticas en menos de 5 segundos, de forma 100 % offline y sin costos recurrentes de suscripción.
3. **Estructura Financiera Realista y Autofinanciada:** El modelo económico no depende de subsidios públicos ($0 CORFO). Se financia de forma privada mediante un **pie de socios de $8.900.000 CLP ($4.450.000 por socio)** y un crédito bancario a 5 años por **$12.648.500 CLP** respaldado por FOGAPE.
4. **Rentabilidad y Retorno Probado:** A 5 años y bajo una tasa exigida del 20 %, el proyecto arroja un **VAN de +$2.588.182 CLP (+$8.241.084 CLP al 15 %)**, una **TIR de 22,72 %** y un Pay Back de **3,71 años**, garantizando sueldos formales desde el mes 1 y generando un **retorno acumulado de +$79.588.754 CLP netos para cada socio fundador**.

---

# X. Referencias Bibliográficas

- <sup>[1]</sup> **INE (2021):** *VIII Censo Nacional Agropecuario y Forestal*. Instituto Nacional de Estadísticas, Santiago, Chile.
- <sup>[2]</sup> **ODEPA (2022):** *Agricultura Chilena: Reflexiones a partir del Censo Agropecuario 2021*. Oficina de Estudios y Políticas Agrarias, Ministerio de Agricultura.
- <sup>[3]</sup> **INDAP (2021):** *Caracterización de la Agricultura Familiar Campesina e Indígena en Chile*. Instituto de Desarrollo Agropecuario.
- <sup>[4]</sup> **CR2 (2023):** *Informe a la Nación: La megasequía en Chile central*. Centro de Ciencia del Clima y la Resiliencia (CR2), Universidad de Chile.
- <sup>[5]</sup> **FAO (2020):** *State of the World's Land and Water Resources for Food and Agriculture (SOLAW)*. Organización de las Naciones Unidas para la Alimentación y la Agricultura.
- <sup>[6]</sup> **ODEPA (2024):** *Boletín de Precios de Insumos Agropecuarios*. Ministerio de Agricultura de Chile.
- <sup>[7]</sup> **INE (2024):** *Encuesta de Superficie Sembrada de Hortalizas*. Instituto Nacional de Estadísticas.
- <sup>[8]</sup> **SUBTEL (2024):** *X Encuesta de Acceso y Usos de Internet*. Subsecretaría de Telecomunicaciones de Chile.
- <sup>[9]</sup> **Espressif Systems (2023):** *ESP32-WROOM-32E Datasheet v1.7*.
- <sup>[10]</sup> **Bosch Sensortec (2021):** *BME280 Combined Humidity and Pressure Sensor Datasheet*.
- <sup>[11]</sup> **MaxLinear (2020):** *SP3485 3.3V Low Power RS-485 Transceiver Datasheet*.
- <sup>[12]</sup> **Aerosemi (2018):** *MT3608 2A High Efficiency Step-Up Converter Datasheet*.
- <sup>[13]</sup> **NanJing Top Power (2019):** *TP4056 1A Standalone Linear Li-lon Battery Charger*.
- <sup>[14]</sup> **INIA (2018):** *Manual de Fertirriego y Manejo de Suelos en Hortalizas*. Instituto de Investigaciones Agropecuarias, Boletín Técnico N° 342.
- <sup>[15]</sup> **Robert Half (2024–2025):** *Reporte de Mercado Laboral y Guía Salarial Chile*. Robert Half International.
- <sup>[16]</sup> **Michael Page (2024–2025):** *Estudio de Remuneraciones Chile: Finanzas y Contabilidad*. PageGroup.
- <sup>[17]</sup> **Servicio de Impuestos Internos (SII 2026):** *Circular N° 62: Régimen Pro Pyme General (Art. 14 D3 LIR) y Sueldo Empresarial (Art. 31 N° 6 LIR)*.
