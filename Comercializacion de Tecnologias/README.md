# 🌾 Comercialización de Tecnologías — Unidad 1
## Informe Integral de Factibilidad Comercial, Análisis Económico y Validación de Mercado: TerraSense IoT

> **Asignatura:** Comercialización de Tecnologías
> **Proyecto Tecnológico:** TerraSense — Tu Ingeniero Agrónomo en el Bolsillo
> **Área Académica:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP
> **Fecha:** Agosto 2026

> [!IMPORTANT]
> ### 📋 Nota de versión — 31 de agosto de 2026
> Este informe coincide con el flujo de caja vigente y con la Sección XII del informe técnico maestro. El modelo conserva la sonda a $48.000, el sueldo de ambos socios desde el mes 1 y el precio máximo de $249.990; incorpora 10 % de contingencia, una línea corta estimada al 15 % y una dotación de ensamblaje dimensionada por horas. **El resultado vigente cumple el criterio de 5 años y 20 %: VAN $2.588.182 y TIR 22,7 %.**

---

## 📑 Tabla de Contenidos

1. [Introducción: Problemática y Especificaciones Técnicas del Producto](#1-introducción-problemática-y-especificaciones-técnicas-del-producto)
   - [1.1. Contexto y Problemática del Sector Agrícola](#11-contexto-y-problemática-del-sector-agrícola)
   - [1.2. Especificaciones Técnicas del Producto y Arquitectura Integral](#12-especificaciones-técnicas-del-producto-y-arquitectura-integral)
2. [Desarrollo Temático](#2-desarrollo-temático)
   - [2.1. Conceptos de Economía, Tipo de Economía y Modelos Económicos](#21-conceptos-de-economía-tipo-de-economía-y-modelos-económicos)
     - [2.1.1. Determinación y Justificación del Tipo de Economía](#211-determinación-y-justificación-del-tipo-de-economía)
     - [2.1.2. Aplicación Rigurosa de Conceptos Económicos al Negocio](#212-aplicación-rigurosa-de-conceptos-económicos-al-negocio)
     - [2.1.3. Modelo Financiero y Evaluación de Inversiones (Flujo de Caja, VAN, TIR, Payback)](#213-modelo-financiero-y-evaluación-de-inversiones-flujo-de-caja-van-tir-payback)
   - [2.2. Análisis Microeconómico de Oferta y Demanda](#22-análisis-microeconómico-de-oferta-y-demanda)
     - [2.2.1. Estructura de Mercado y Comportamiento de los Agentes](#221-estructura-de-mercado-y-comportamiento-de-los-agentes)
     - [2.2.2. Identificación y Análisis de 2 Variaciones en los Factores de Demanda](#222-identificación-y-análisis-de-2-variaciones-en-los-factores-de-demanda)
     - [2.2.3. Identificación y Análisis de 2 Variaciones en los Factores de Oferta](#223-identificación-y-análisis-de-2-variaciones-en-los-factores-de-oferta)
   - [2.3. Business Intelligence y Analítica de Datos](#23-business-intelligence-y-analítica-de-datos)
     - [2.3.1. Dashboard de Métricas Unitarias (*Unit Economics*) y KPIs](#231-dashboard-de-métricas-unitarias-unit-economics-y-kpis)
     - [2.3.2. Inteligencia Geográfica y Analítica Espacial (GIS + IDW)](#232-inteligencia-geográfica-y-analítica-espacial-gis--idw)
     - [2.3.3. Análisis de Sensibilidad, Pruebas de Estrés y Punto Crítico de Liquidez](#233-análisis-de-sensibilidad-pruebas-de-estrés-y-punto-crítico-de-liquidez)
     - [2.3.4. Capacidad de Producción y Cuello de Botella Real](#234-capacidad-de-producción-y-cuello-de-botella-real)
   - [2.4. Investigación de Mercado y Validación Comercial](#24-investigación-de-mercado-y-validación-comercial)
     - [2.4.1. Descripción y Características del Producto / Servicio](#241-descripción-y-características-del-producto--servicio)
     - [2.4.2. Segmentación y Dimensionamiento Basado en Datos Censales (TAM / SAM / SOM)](#242-segmentación-y-dimensionamiento-basado-en-datos-censales-tam--sam--som)
     - [2.4.3. Mapa de Empatía y Necesidades No Satisfechas del Cliente](#243-mapa-de-empatía-y-necesidades-no-satisfechas-del-cliente)
     - [2.4.4. Benchmark Cuantitativo de la Competencia](#244-benchmark-cuantitativo-de-la-competencia)
     - [2.4.5. Oportunidades y Estrategia Multicanal (B2C, B2G, B2B, Distribución Directa)](#245-oportunidades-y-estrategia-multicanal-b2c-b2g-b2b-distribución-directa)
   - [2.5. Argumentación Estratégica y Defensa ante Objeciones (Q&A con Evidencia)](#25-argumentación-estratégica-y-defensa-ante-objeciones-qa-con-evidencia)
3. [Conclusiones Ejecutivas de la Presentación](#3-conclusiones-ejecutivas-de-la-presentación)

---

## 1. Introducción: Problemática y Especificaciones Técnicas del Producto

### 1.1. Contexto y Problemática del Sector Agrícola

La pequeña y mediana agricultura chilena —compuesta por más de 175.556 explotaciones según el VIII Censo Agropecuario y Forestal (INE/ODEPA)— enfrenta una crisis multidimensional:
1. **Restricción Hídrica Extrema:** Déficit pluviométrico crónico en la macrozona central y norte chico, con un uso intensivo de acuíferos subterráneos de conductividad eléctrica creciente.
2. **Volatilidad y Alza de Fertilizantes:** El encarecimiento de los insumos nitrogenados y fosfatados exige dosificaciones exactas para no destruir el margen del agricultor.
3. **Degradación del Suelo Agrícola:** Acidificación, compactación y salinización progresiva que merman los rendimientos por hectárea.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    FALLA ESTRUCTURAL DE DIAGNÓSTICO EN EL AGRO CHILENO                  │
├───────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ ALTERNATIVA               │ BARRERA CRÍTICA             │ IMPACTO ECONÓMICO EN CAMPO    │
├───────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ 1. Laboratorio Químico    │ Demora de 15 a 30 días y    │ Inviable para monitoreo denso.│
│    Acreditado             │ costo de $35.000/muestra.   │ Corrección llega a destiempo. │
├───────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ 2. Asesor Agrónomo        │ Alto costo por visita y     │ No disponible en decisiones   │
│    Privado                │ baja presencia rural diaria.│ críticas de las 7:00 AM.      │
├───────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ 3. Instrumentos Importados│ Costo elevado ($269.010 –   │ Entregan números abstractos   │
│    (Hanna / Bluelab / TDR)│ $1.367.925) y parámetros    │ sin prescripción agronómica.  │
│                           │ incompletos.                │                               │
└───────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

El pequeño y mediano productor termina gestionando su campo **«a ciegas» o por intuición**, provocando asfixias radiculares, abortos florales por exceso salino y sobrefertilizaciones que contaminan las napas freáticas.

> [!NOTE]
> Los rangos de impacto económico por error agronómico ($450.000–$1.400.000 CLP/ha según el escenario, ver [II.5 del informe técnico maestro](../README.md#ii5-cuantificación-económica-del-error-agronómico)) son **estimaciones de orden de magnitud construidas por el proyecto** a partir de costos de insumos y jornales de referencia, no de un estudio publicado. Se usan aquí para dimensionar el problema, nunca como insumo del modelo financiero de la Sección 2.1.3, que no depende de ellas.

---

### 1.2. Especificaciones Técnicas del Producto y Arquitectura Integral

**TerraSense** es un ecosistema IoT de instrumentación y diagnóstico agronómico in situ que traduce datos físicos de suelo y microclima en prescripciones agronómicas cuantificadas en menos de 8 segundos.

```text
                                ESQUEMA DEL ECOSISTEMA TERRASENSE
  ┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
  │         HARDWARE DE CAMPO       │                 │       APLICACIÓN MÓVIL          │
  │ • Sonda 7-en-1 Acero Inox 316L  │   BLE 5.0       │ • Motor Agronómico Local        │
  │ • Sensor Bosch BME280 (Aire)    │ ──────────────> │ • 4 Etapas Fenológicas          │
  │ • ESP32 SoC + Batería Li-ion    │ (Offline-First) │ • Veto Cruzado por Salinidad    │
  │ • Gabinete IP67 + USB-C         │                 │ • Dosis en kg/ha y Costo ($CLP) │
  └─────────────────────────────────┘                 └────────────────┬────────────────┘
                                                                       │ Sincronización
                                                                       │ diferida
                                                                       ▼
                                                      ┌─────────────────────────────────┐
                                                      │     NUBE Y CONSOLA BACKOFFICE   │
                                                      │ • Supabase PostGIS + RLS        │
                                                      │ • Visor GIS con Heatmap IDW     │
                                                      │ • Gestión y Actualización OTA   │
                                                      └─────────────────────────────────┘
```

#### Ficha de Especificaciones de Ingeniería:
* **Metrología Multivariable (9 Parámetros simultáneos):**
  * *Suelo (7):* Humedad volumétrica (VWC, FDR), Conductividad eléctrica (EC, compensada en T°), Potencial de hidrógeno (pH, estado sólido), Temperatura de suelo, Nitrógeno (N), Fósforo (P) y Potasio (K) **estimados a partir de conductividad eléctrica** — no mediante electrodos ion-selectivos, limitación técnica que el proyecto declara explícitamente y mitiga con una regla de veto cruzado por salinidad.
  * *Microclima (2):* Temperatura del aire y Humedad relativa del aire mediante sensor Bosch BME280 integrado.
* **Comunicaciones y Procesamiento:** Microcontrolador SoC ESP32-WROOM-32E dual-core a 240 MHz con enlace inalámbrico **Bluetooth Low Energy (BLE 5.0)** y bus industrial RS-485 con transceptor aislado bajo protocolo Modbus RTU.
* **Autonomía Energética:** Pack de 2 celdas de Ion-Litio 18650 en paralelo (3,7 V, 3.000 mAh nominales), circuito de carga USB-C con protección activa (TP4056), corte físico de potencia por interruptor basculante en la rama de sonda.
* **Robustez Industrial IP67 (diseñado, en proceso de ensayo):** Gabinete de PETG impreso en FDM con absorbedores de impacto, tornillería inox 316L, sello perimetral elastomérico, prensaestopas M12 y membrana hidrofóbica ePTFE permeable a gases pero estanca a líquidos.
* **Motor Prescriptivo Offline:** Algoritmo determinístico de 4 capas en TypeScript/SQLite que opera **sin necesidad de conexión a internet o señal 4G**, evaluando umbrales agronómicos específicos para 4 etapas fenológicas (*pre-siembra, vegetativo, floración y cosecha*).

---

## 2. Desarrollo Temático

### 2.1. Conceptos de Economía, Tipo de Economía y Modelos Económicos

#### 2.1.1. Determinación y Justificación del Tipo de Economía

El modelo de negocio de TerraSense se enmarca en una **Economía de Mercado**, donde las decisiones de producción, precio y distribución son tomadas por agentes privados —empresa y clientes— sin dependencia de un subsidio estatal no reembolsable. La asignación de recursos está guiada por el mecanismo de precios y la libre competencia:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│              ENMARQUE EN EL SISTEMA ECONÓMICO DE MERCADO — TERRASENSE                   │
├───────────────────────────┬─────────────────────────────────────────────────────────────┤
│ PILAR ECONÓMICO           │ APLICACIÓN DIRECTA EN TERRASENSE                            │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. Economía de Mercado    │ El precio ($249.990 CLP con IVA, techo declarado del        │
│    (Libre Empresa)        │ negocio) es fijado por los socios en función del costo real │
│                           │ y de la competencia, no por licitación ni tarifa regulada.   │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. Economía del           │ El valor no reside en la materia prima física (plástico o   │
│    Conocimiento           │ silicio), sino en los algoritmos prescriptivos y la analítica│
│                           │ agronómica propietaria incorporada en el software.          │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. Economía Circular y    │ Batería recargable USB-C (elimina el consumo recurrente de  │
│    Eficiencia de Recursos │ pilas alcalinas de la competencia) y optimización en campo   │
│                           │ que apunta a reducir el desperdicio de agua y fertilizantes. │
└───────────────────────────┴─────────────────────────────────────────────────────────────┘
```

**Principios orientadores del modelo:**
- **Soberanía del Consumidor:** Es el agricultor —no un organismo estatal— quien determina si TerraSense crea suficiente valor para justificar su compra.
- **Competencia por Mérito:** TerraSense gana clientes demostrando un costo total de propiedad muy inferior al de cualquier alternativa profesional, no por estar en una lista de productos subsidiados.
- **Financiamiento mixto, con matiz honesto:** el capital de arranque combina 33,5 % de aporte de los socios y 66,5 % de deuda bancaria. Los créditos cuentan con garantía FOGAPE —una reducción de riesgo para el banco, no un subsidio ni un aporte no reembolsable al proyecto.

* **Estructura de Mercado Elegida:** **Competencia Monopolística con Diferenciación Tecnológica**. TerraSense no compite como un *price-taker* de sensores genéricos sin marca, sino como una solución integrada con poder de fijación de precio gracias a su motor agronómico, georreferenciación GIS y soporte local.

---

#### 2.1.2. Aplicación Rigurosa de Conceptos Económicos al Negocio

1. **Costo Marginal Asimétrico ($CMg = 0$):**
   El laboratorio tradicional opera bajo rendimientos constantes con costo marginal elevado ($CMg_{\text{Lab}} \approx \$35.000\text{ CLP}$ por muestra). TerraSense rompe este paradigma: una vez adquirido el equipo (CAPEX del cliente), el **costo marginal de ejecutar 1, 10 o 100 mediciones adicionales en el predio es exactamente $0 CLP**. Esto desata una asimetría económica que habilita la agricultura de precisión en predios pequeños.

2. **Economías de Escala en la Curva de Manufactura:**
   El costo variable unitario disminuye progresivamente según la escala del lote, principalmente por la dilución del NRE de PCB, quiebres de precio por volumen en componentes LCSC y consolidación de flete:
   * **Año 1 (200 unidades):** Costo Variable Unitario = **$91.309 CLP**
   * **Año 3 (500 unidades):** Costo Variable Unitario = **$85.830 CLP**
   * **Año 5 (850 unidades):** Costo Variable Unitario = **$82.178 CLP** (negociación directa con el proveedor de la sonda)

   > [!NOTE]
   > La reducción de escala es más modesta que en estudios anteriores del proyecto (−9,9 % del Año 1 al Año 5, frente a un −10 % previamente estimado sobre un costo base mucho menor): la sonda, que hoy representa el 68 % del BOM, tiene menos recorrido de negociación por volumen que la electrónica SMD.

3. **Costo Total de Propiedad (TCO a 5 Años) para un Predio de 3 Hectáreas con 20 mediciones/año:**

```text
                  COMPARATIVA TCO A 5 AÑOS (20 MEDICIONES / AÑO)
  $3.500.000 ┬──────────────────────────────────────────────────────── Laboratorio Químico
             │                                                          (20 × $35.000 × 5 años)
  $2.500.000 ┼──────────────────────────────────── Asesoría Agronómica
             │                                     (alto y recurrente — sin cifra
  $1.500.000 ┼─────────────────────────────────     estandarizada de mercado)
             │
  $1.000.000 ┼─────────────────────────────────
             │                                  ═══════════════════════ TerraSense IoT
          $0 ┴────────────────────────────────────────────────────────  ($249.990 CLP + consumibles
             Año 0       Año 1       Año 2       Año 3       Año 4       menores, sin suscripción)
```

$$\text{Ahorro Económico Neto a 5 Años (vs. laboratorio)} = \frac{\$3.500.000 - \$249.990}{\$3.500.000} = \mathbf{92{,}9\ \%}$$

> [!NOTE]
> El costo del laboratorio ($3.500.000 a 5 años) se deriva directamente de $35.000/muestra × 20 muestras/año × 5 años — es un número calculado, no estimado. El costo de la asesoría agronómica particular **no se cuantifica** en el informe técnico maestro más allá de "alto y recurrente" (multiplicador ~3× a 3 años, ~5× a 5 años sobre el gasto del Año 1), por lo que se representa aquí sin cifra puntual en vez de inventar un monto de mercado.

---

#### 2.1.3. Modelo Financiero y Evaluación de Inversiones (Flujo de Caja, VAN, TIR, Payback)

> [!IMPORTANT]
> ### Léase antes de continuar
> Esta sección reporta el resultado vigente del Excel: **VAN positivo a 5 años, TIR sobre la tasa exigida y Pay Back dentro del Año 4**. Los supuestos de tasa bancaria y capacidad operativa se mantienen explícitos porque deben verificarse antes de ejecutar la inversión.

##### Tabla maestra de parámetros del modelo

| Parámetro | Valor adoptado | Origen |
| :--- | :---: | :--- |
| Tipo de cambio | 915 CLP/USD | Dólar observado, BCCh |
| IVA | 19 % | SII |
| Impuesto de primera categoría | **25 %** | Régimen Pro Pyme General |
| Arancel de importación | 6 % sobre valor FOB | Aduanas |
| **Tasa de descuento de evaluación** | **20 %** | Tasa de rentabilidad exigida por la planilla de evaluación |
| Vidas útiles para depreciación | 6 años equipamiento; 7 años mobiliario | Tabla de vida útil del SII |
| Préstamo a largo plazo | 5 años, **10 % anual**, sistema francés | Crédito PYME con garantía FOGAPE |
| Préstamo a corto plazo | 1 año, **15 % anual** | Línea de capital de trabajo con garantía FOGAPE; tasa por validar con 2–3 bancos |
| **Sueldo empresarial de cada socio (Año 1)** | **Ingreso Mínimo Mensual, $553.553 bruto/mes** | Piso legal vigente, pagado desde el mes 1 |
| **Precio de venta** | **$249.990 CLP con IVA** (techo declarado del negocio) | Verificado contra competencia en [2.4.4](#244-benchmark-cuantitativo-de-la-competencia) |
| Volumen proyectado | 200 / 350 / 500 / 650 / 850 unidades | Años 1 a 5, ver [2.4.2](#242-segmentación-y-dimensionamiento-basado-en-datos-censales-tam--sam--som) |

##### Estructura de costos unitarios

**BOM (Lista de Materiales) — 100 % SMD, componentes cotizados en LCSC + PCBA en JLCPCB:**

| Componente | Costo unitario |
| :--- | ---: |
| ESP32-WROOM-32E-N4, BME280, SP3485, TP4056, MT3608, Si2301 + pasivos | $6.711 |
| PCB (2 capas) + ensamblaje SMT + NRE prorrateado | $2.229 |
| Flete internacional + arancel 6 % | $1.183 |
| 2× celda 18650 3.000 mAh + portacelda + fusible | $4.510 |
| USB-C sellado, rocker, pulsador PAIR, prensaestopas M12, O-ring, insertos M3 | $3.250 |
| Filamento PETG (118 g) + energía de impresión | $2.273 |
| Empaque (caja, manual, espuma, desecante) | $2.500 |
| **Sonda de suelo 7-en-1 RS-485, inox 316L (cotización real de mercado)** | **$48.000** |
| **BOM TOTAL** | **$70.656** |

**Del BOM al costo variable unitario real (Año 1):**

| Concepto | Monto |
| :--- | ---: |
| BOM | $70.656 |
| + Flete nacional (Bluexpress) | $6.000 |
| + Merma y scrap (3 %) | $2.120 |
| + Provisión de garantía legal, 6 meses (5 %, Ley 21.398) | $3.533 |
| + Mano de obra directa — 1,5 h de ensamblaje y QA × $6.000/h | $9.000 |
| **= COSTO VARIABLE UNITARIO (Año 1)** | **$91.309** |

> [!IMPORTANT]
> **El 88,6 % del BOM está denominado o indexado a dólares** (sonda + electrónica LCSC + PCB/SMT + flete y arancel + celdas 18650 = $62.633 de $70.656), frente a un ~72 % estimado en versiones anteriores del estudio, que subestimaban el peso real de la sonda. Una devaluación del peso chileno **presiona directamente casi nueve décimos del costo variable**; el análisis de sensibilidad de [2.3.3](#233-análisis-de-sensibilidad-pruebas-de-estrés-y-punto-crítico-de-liquidez) cuantifica cuánto margen hay antes de que eso comprometa el Año 1.

##### CUADRO N° 1 — Inversiones del proyecto

**(A) Capital de trabajo y activo nominal:**

| Ítem | Monto |
| :--- | ---: |
| Constitución de la SpA vía Empresa en un Día | $0 |
| Firma electrónica avanzada para ambos socios | $30.000 |
| Inicio de actividades SII, timbraje electrónico y apertura de cuenta | $0 |
| Registro de marca comercial ante INAPI (1 clase) | $220.000 |
| Patente municipal — actividad en casa, primer año | $35.000 |
| Resolución sanitaria y certificación SEC — no aplica | $0 |
| Honorarios contables de puesta en marcha | $100.000 |
| Ensayos de contraste agronómico en laboratorio (30 muestras) | $900.000 |
| Ensayos externos de estanqueidad IP67 y compatibilidad electromagnética | $1.500.000 |
| Sitio web, identidad de marca y material comercial | $450.000 |
| Patrones de calibración (buffers pH y EC 1.413 µS/cm) | $120.000 |
| Herramienta menor, tornillería, insertos y consumibles | $150.000 |
| Lote piloto de validación (10 unidades preserie, a $91.309) | $913.090 |
| *Subtotal activo nominal* | *$4.418.090* |
| **Capital de trabajo** (~3 meses de gasto fijo + primer lote de 100 unidades) | **$14.806.910** |
| **Contingencia e imprevistos** (10 % sobre el subtotal A + B antes de contingencia) | **$2.413.500** |
| **TOTAL (A)** | **$21.638.500** |

**(B) Activo fijo:**

| Ítem | Monto |
| :--- | ---: |
| Impresora 3D FDM principal, cámara cerrada | $900.000 |
| Impresora 3D FDM secundaria (redundancia operacional) | $450.000 |
| Secador de filamento y almacenamiento estanco | $80.000 |
| Estación de soldadura, aire caliente y microscopio USB | $240.000 |
| Fuente de poder programable y multímetro de banco | $250.000 |
| Osciloscopio 100 MHz, 2 canales | $400.000 |
| Analizador lógico, programador y sonda de corriente de µA | $160.000 |
| Banco de ensayo IP67 (columna de 1 m + cámara de polvo) | $180.000 |
| Instrumento patrón de laboratorio (pH/EC) | $350.000 |
| 2× notebook y puesto de desarrollo (uno por socio) | $1.600.000 |
| Mobiliario de taller y almacenamiento (casa de ambos socios) | $300.000 |
| **TOTAL (B)** | **$4.910.000** |

$$\textbf{TOTAL INVERSIÓN INICIAL } (I_0) = \$21.638.500 + \$4.910.000 = \mathbf{\$26.548.500\ \text{CLP}}$$

> [!NOTE]
> **No hay vehículos, construcciones ni oficina en el activo fijo.** La logística se resuelve por Bluexpress y la producción cabe en la casa de los dos socios. Se incorpora arriendo de taller/oficina recién desde el **Año 3**, cuando el volumen y la dotación lo justifican.

**Fuentes de financiamiento:**

| Fuente | Monto | % | Naturaleza |
| :--- | ---: | :---: | :--- |
| **Pie de los socios** (2×, aporte propio) | $8.900.000 | 33,5 % | $4.450.000 por socio — el compromiso de capital que el banco exige ver antes de aprobar el crédito |
| **Crédito bancario largo plazo** — 5 años, 10 % anual | $12.648.500 | 47,6 % | Con garantía estatal **FOGAPE**, que reduce el riesgo del banco |
| **Línea de corto plazo** — 1 año, 15 % anual | $5.000.000 | 18,8 % | Cubre el desfase del primer lote; tasa pendiente de cotización bancaria real |
| **TOTAL FINANCIAMIENTO** | **$26.548.500** | **100 %** | |

> [!IMPORTANT]
> **Sin subsidio estatal no reembolsable.** El proyecto no depende de que se adjudique un fondo CORFO. Ningún banco chileno presta el 100 % de la inversión a una empresa recién constituida, aunque tenga garantía FOGAPE: el aporte de los socios, cercano al 34 %, respalda la solicitud.

**Amortización, sistema francés — Préstamo largo plazo ($12.648.500, 10 % anual, 5 años):**

| Año | Saldo insoluto | Amortización de capital | Interés | **Cuota total** | Saldo final |
| :---: | ---: | ---: | ---: | ---: | ---: |
| 1 | $12.648.500 | $2.071.792 | $1.264.850 | **$3.336.642** | $10.576.708 |
| 2 | $10.576.708 | $2.278.972 | $1.057.671 | **$3.336.642** | $8.297.736 |
| 3 | $8.297.736 | $2.506.869 | $829.774 | **$3.336.642** | $5.790.867 |
| 4 | $5.790.867 | $2.757.556 | $579.087 | **$3.336.642** | $3.033.311 |
| 5 | $3.033.311 | $3.033.311 | $303.331 | **$3.336.642** | $0 |

*La planilla modela una cuota anual constante de **$3.336.642 CLP**.*

**Préstamo a corto plazo ($5.000.000, 15 % anual, 1 año — pago único):**

| Año | Saldo insoluto | Amortización de capital | Interés | **Cuota total** | Saldo final |
| :---: | ---: | ---: | ---: | ---: | ---: |
| 1 | $5.000.000 | $5.000.000 | $750.000 | **$5.750.000** | $0 |

> [!WARNING]
> **El Año 1 concentra $9.086.642 de servicio de deuda: $2.014.850 de interés y $7.071.792 de capital**, porque la línea corta se paga íntegra ese año. El capital de trabajo está dimensionado para absorberlo.

**Depreciación anual del activo fijo (valor residual cero):**

| Grupo de activo | Valor de adquisición | Vida útil | **Depreciación anual** |
| :--- | ---: | :---: | ---: |
| Equipamiento técnico e informático | $4.610.000 | 6 años | $768.333 |
| Mobiliario de taller | $300.000 | 7 años | $42.857 |
| **TOTAL** | **$4.910.000** | | **$811.190** |

##### CUADRO N° 2 — Ingresos, costos y gastos operacionales (Año 1)

| Concepto | Valor mes $ | **Valor Año 1 $** |
| :--- | ---: | ---: |
| **(+) VENTAS** — 200 unidades × $210.076 netos | $3.501.267 | **$42.015.200** |
| **COSTOS OPERACIONALES (VARIABLES)** | | |
| Materiales directos (BOM) — 200 × $70.656 | $1.177.600 | $14.131.200 |
| Flete nacional, merma y provisión de garantía — 200 × $11.653 | $194.217 | $2.330.600 |
| Mano de obra directa: ensamblaje, QA y calibración | $150.000 | $1.800.000 |
| **(−) TOTAL COSTOS OPERACIONALES** | **$1.521.817** | **$18.261.800** |
| **GASTOS DE ADMINISTRACIÓN (FIJOS)** | | |
| Sueldo empresarial de los 2 socios (Ingreso Mínimo Mensual) | $1.107.106 | **$13.285.272** |
| Ensamblador — sin contratar el Año 1 (0,17 FTE, cubierto por los socios) | $0 | $0 |
| Servicios digitales y tiendas de aplicaciones | $70.132 | $841.580 |
| Energía e internet incremental (casa de ambos socios) | $30.000 | $360.000 |
| Contabilidad, patente municipal y asesoría legal | $70.000 | $840.000 |
| Materiales indirectos y seguros | $35.000 | $420.000 |
| **(−) TOTAL GASTOS DE ADMINISTRACIÓN** | **$1.312.238** | **$15.746.852** |
| **GASTOS DE COMERCIALIZACIÓN (FIJOS)** | | |
| Pauta digital directa (Google Ads + Meta Ads) — sin agencia el Año 1 | $100.000 | **$1.200.000** |
| **TOTAL COSTOS Y GASTOS FIJOS** | **$1.412.238** | **$16.946.852** |
| **TOTAL COSTOS Y GASTOS (CT)** | **$2.934.055** | **$35.208.652** |
| **(=) UTILIDAD OPERACIONAL** *(antes de depreciación e intereses)* | | **$6.806.548** |

**Determinación del precio y del volumen necesario:**

Con sueldos completos desde el mes 1, el precio ya no se deriva de un porcentaje de rentabilidad sobre el costo: se fija en el **techo declarado del negocio, $249.990 CLP con IVA** (neto $210.076), y lo que se resuelve es cuántas unidades hacen falta vender para cubrir los costos, incluidos los dos sueldos.

$$\text{Punto de equilibrio (Año 1)} = \frac{\text{Gastos fijos} + \text{Depreciación} + \text{Costo financiero}}{\text{Precio neto} - \text{Costo variable unitario}} = \frac{\$16.946.852 + \$811.190 + \$2.014.850}{\$118.767} = \mathbf{166\ \text{unidades}}$$

| Escenario | Volumen Año 1 | Resultado |
| :--- | :---: | :--- |
| A precio tope, sin holgura | 166 u | Aproxima el punto de equilibrio con depreciación y costo financiero |
| **Plan adoptado** | **200 u** | **+20,5 % de holgura sobre el punto de equilibrio contable** |

> [!IMPORTANT]
> **Con 120 unidades (la meta de estudios anteriores), ni siquiera al precio tope de $249.990 alcanza.** La palanca que hizo falta mover no fue el precio: fue el volumen, de 120 a 200 unidades (17 al mes) — todavía una fracción mínima (0,17 %) del mercado servible.

**Estructura de gastos fijos por año:**

| Concepto | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Sueldo empresarial de los 2 socios | $13.285.272 | $14.400.000 | $21.600.000 | $24.000.000 | $28.800.000 |
| *→ por socio/mes* | *$553.553 (IMM)* | *$600.000* | *$900.000* | *$1.000.000* | *$1.200.000* |
| Ensambladores contratados | $0 | $3.490.000 (0,5 FTE) | $6.980.000 (1 FTE) | $6.980.000 (1 FTE) | $10.460.000 (1,5 FTE) |
| Arriendo de taller/oficina | $0 (casa) | $0 (casa) | $4.200.000 | $4.200.000 | $5.040.000 |
| Servicios digitales | $841.580 | $850.000 | $900.000 | $950.000 | $1.000.000 |
| Energía, agua e internet | $360.000 | $420.000 | $1.140.000 | $1.140.000 | $1.320.000 |
| Contabilidad, patente y asesoría legal | $840.000 | $960.000 | $1.680.000 | $1.680.000 | $1.980.000 |
| Materiales indirectos y seguros | $420.000 | $480.000 | $840.000 | $900.000 | $980.000 |
| **Subtotal administración** | **$15.746.852** | **$20.600.000** | **$37.340.000** | **$39.850.000** | **$49.580.000** |
| Marketing (Año 1 directo; Año 2+ agencia) | $1.200.000 | $7.080.000 | $10.680.000 | $12.000.000 | $14.400.000 |
| **TOTAL GASTOS FIJOS** | **$16.946.852** | **$27.680.000** | **$48.020.000** | **$51.850.000** | **$63.980.000** |
| Unidades planificadas | 200 | 350 | 500 | 650 | 850 |
| **CAC** (marketing / unidades) | $6.000 | $20.229 | $21.360 | $18.462 | $16.941 |
| **Punto de equilibrio contable** | **166 u** | **243 u** | **400 u** | **422 u** | **509 u** |
| **Holgura sobre el equilibrio** | +20,5 % | +44,0 % | +25,0 % | +54,0 % | +67,0 % |

##### CUADRO N° 3 — Estado de resultados proyectado a 5 años

| Concepto | Año 0 | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **(+) VENTAS** | $0 | $42.015.200 | $73.526.600 | $105.038.000 | $136.549.400 | $178.564.600 |
| (−) Costos variables | $0 | $18.261.800 | $30.999.500 | $42.915.000 | $54.602.600 | $69.851.300 |
| (−) Gastos fijos | $0 | $16.946.852 | $27.680.000 | $48.020.000 | $51.850.000 | $63.980.000 |
| (−) Depreciación | $0 | $811.190 | $811.190 | $811.190 | $811.190 | $811.190 |
| (−) Costo financiero | $0 | $2.014.850 | $1.057.671 | $829.774 | $579.087 | $303.331 |
| **(=) UTILIDAD OPERACIONAL** | | **$3.980.508** | **$12.978.239** | **$12.462.036** | **$28.706.523** | **$43.618.779** |
| (−) Impuestos (25 %) | | $995.127 | $3.244.560 | $3.115.509 | $7.176.631 | $10.904.695 |
| **(=) UTILIDAD NETA** | | **$2.985.381** | **$9.733.679** | **$9.346.527** | **$21.529.892** | **$32.714.084** |

**Flujo de fondos para la evaluación:**

| Concepto | Año 0 | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Utilidad neta | | $2.985.381 | $9.733.679 | $9.346.527 | $21.529.892 | $32.714.084 |
| (+) Depreciación | | $811.190 | $811.190 | $811.190 | $811.190 | $811.190 |
| (−) Cuota de capital de los préstamos | | $7.071.792 | $2.278.972 | $2.506.869 | $2.757.556 | $3.033.311 |
| (−) Inversión inicial | −$26.548.500 | | | | | |
| **(=) FLUJO DE FONDOS PROYECTADO** | **−$26.548.500** | **−$3.275.221** | **$8.265.898** | **$7.650.848** | **$19.583.527** | **$30.491.963** |
| **Flujo acumulado** | −$26.548.500 | −$29.823.721 | −$21.557.824 | −$13.906.975 | **+$5.676.552** | **+$36.168.514** |

> [!NOTE]
> **El Año 1 es el único con flujo negativo, y es un resultado esperado.** La utilidad neta del Año 1 es positiva ($2.985.381), pero ese año se pagan $7.071.792 de capital. El capital de trabajo fue dimensionado para absorberlo.

##### Evaluación económica: VAN, TIR y Pay Back

**Valor Actual Neto (tasa de descuento exigida $r = 20\%$):**

| Concepto | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Flujo de fondos proyectado | −$3.275.221 | $8.265.898 | $7.650.848 | $19.583.527 | $30.491.963 |
| Factor de descuento $(1{,}20)^n$ | 1,2000 | 1,4400 | 1,7280 | 2,0736 | 2,4883 |
| **Valor presente del flujo** | −$2.729.351 | $5.740.207 | $4.427.574 | $9.444.216 | $12.254.036 |

$$\sum VP = \$29.136.682 \qquad I_0 = \$26.548.500$$

$$\boxed{\mathbf{VAN\,(20\%) = \$29.136.682 - \$26.548.500 = \$2.588.182\ \text{CLP}}}$$

**Tasa Interna de Retorno:**

$$\text{TIR} \approx \mathbf{22{,}7\ \%}$$

La TIR supera en aproximadamente **2,7 puntos porcentuales** el 20 % exigido a 5 años.

**Pay Back:**

| Año | Flujo de fondos | **Flujo acumulado** |
| :---: | ---: | ---: |
| 0 | −$26.548.500 | −$26.548.500 |
| 1 | −$3.275.221 | −$29.823.721 |
| 2 | $8.265.898 | −$21.557.824 |
| 3 | $7.650.848 | −$13.906.975 |
| **4** | **$19.583.527** | **$5.676.552 ✅** |
| 5 | $30.491.963 | $36.168.514 |

$$\text{Pay Back} = 3 + \frac{\$13.906.975}{\$19.583.527} = \mathbf{3{,}71\ \text{años}} \quad \text{(3 años y 9 meses)}$$

**Resumen de indicadores:**

| Indicador | Valor | Umbral (5 años, 20 %) | Cumple |
| :--- | ---: | :---: | :---: |
| **VAN (20 %)** | **$2.588.182** | > 0 | ✅ Sí |
| **TIR real** | **≈ 22,7 %** | > 20 % | ✅ Sí |
| **Pay Back** | **3,71 años** | ≤ 5 años | ✅ Sí |
| Utilidad neta, todos los años | Positiva desde el Año 1 | Sin pérdidas | ✅ Sí |
| Punto de equilibrio Año 1 | 166 unidades | < 200 planificadas | ✅ Holgura del 20,5 % |

---

##### Toma de decisiones: aceptación bajo el criterio estándar

> **DECISIÓN: SE ACEPTA EL PROYECTO BAJO EL CRITERIO DE 5 AÑOS Y 20 %.**

Bajo el criterio estricto de la evaluación estándar, **el proyecto se acepta**: el VAN es $2.588.182 y la TIR alcanza 22,7 %. La recomendación se sostiene en:

1. **Utilidad neta positiva todos los años, sin excepción, desde el Año 1.** No hay ningún ejercicio en pérdida en el quinquenio proyectado.
2. **La TIR real (≈22,7 %) supera el 20 % exigido.**
3. **El Pay Back es de 3,71 años.** El flujo acumulado cruza a positivo durante el Año 4.

**Condiciones de ejecución:** proteger un volumen mínimo cercano a 166 unidades, mantener el precio máximo de $249.990, cotizar la tasa corta del 15 % con 2–3 bancos y validar la dotación de ensamblaje prevista.

> [!WARNING]
> La aceptación depende de dos supuestos que deben confirmarse antes de firmar: la tasa corta cercana al 15 % con garantía FOGAPE y la suficiencia operativa de 0,5 a 1,5 FTE de ensamblaje según el año.

---

### 2.2. Análisis Microeconómico de Oferta y Demanda

#### 2.2.1. Estructura de Mercado y Comportamiento de los Agentes

El mercado de la instrumentación de suelo opera con curvas de oferta y demanda altamente diferenciadas. La demanda es inelástica en relación con la necesidad biológica del cultivo (el agua y los nutrientes no son prescindibles), pero elástica respecto al precio del instrumento de medición si este supera el presupuesto de operación del pequeño agricultor.

```text
  Precio (P)
      ▲               Curva de Oferta (S)
      │                    \          /
      │                     \        /  ← S' (Desplazamiento por reducción BOM/SMT)
  P_trad ┼─────────────●     \      /
      │                 \     \    /
  P_terra┼───────────────────●─\──/──●
      │                         \/    \
      │                         /\     \  ← D' (Desplazamiento por urgencia y evidencia de campo)
      │                        /  \     \
      │                       /    \     \  Curva de Demanda (D)
      └──────────────────────┴──────┴─────┴────────────────► Cantidad (Q)
                           Q_trad  Q_terra
```

---

#### 2.2.2. Identificación y Análisis de 2 Variaciones en los Factores de Demanda

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    VARIACIONES IDENTIFICADAS EN LOS FACTORES DE DEMANDA                 │
├─────────────────────────────────────────────────┬───────────────────────────────────────┤
│ FACTOR 1: Cambio Climático y Estrés Salino (D1) │ FACTOR 2: Costo de No Medir (D2)      │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ • Aumento de la escasez hídrica y salinidad.    │ • Un error agronómico no detectado     │
│ • La necesidad de diagnóstico se vuelve crítica.│   cuesta entre $350.000 y $1.400.000/ha│
│ • EFECTO: Desplazamiento D -> D' a la DERECHA.  │   (estimación de orden de magnitud).   │
│                                                 │ • EFECTO: Aumenta la disposición a pagar│
└─────────────────────────────────────────────────┴───────────────────────────────────────┘
```

1. **Variación en Preferencias y Urgencia Ambiental (Factor D1):**
   * **Causa:** La prolongada sequía y el uso forzado de aguas de pozo salinas aumentan el riesgo de pérdida total de cosechas.
   * **Impacto:** Los agricultores incrementan su disposición a pagar por herramientas de medición in situ, desplazando la curva de demanda hacia la derecha ($D \to D'$).

2. **Variación en el Costo Percibido de No Medir (Factor D2):**
   * **Causa:** Los escenarios de error agronómico cuantificados en la Sección [1.1](#11-contexto-y-problemática-del-sector-agrícola) —pérdida de siembra por frío, fertilización inútil por bloqueo de pH, quema radicular por salinidad, asfixia radicular— representan pérdidas de $350.000 a $1.400.000 CLP por hectárea, muy por encima del precio de compra del equipo ($249.990 CLP).
   * **Impacto:** Cuando el agricultor internaliza ese riesgo, la curva de demanda se desplaza hacia la derecha ($D \to D'$), aumentando la cantidad demandada a cualquier nivel de precio.
   * **Nota metodológica obligatoria:** estos rangos de pérdida por hectárea son **estimaciones propias de orden de magnitud**, no un estudio de campo publicado ni un cálculo de ROI garantizado por unidad vendida. No se usan como insumo del modelo financiero de [2.1.3](#213-modelo-financiero-y-evaluación-de-inversiones-flujo-de-caja-van-tir-payback), que se sostiene enteramente en el volumen, precio y costos reales de venta del producto — nunca en el ahorro que el cliente eventualmente obtenga.

---

#### 2.2.3. Identificación y Análisis de 2 Variaciones en los Factores de Oferta

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     VARIACIONES IDENTIFICADAS EN LOS FACTORES DE OFERTA                 │
├─────────────────────────────────────────────────┬───────────────────────────────────────┤
│ FACTOR 1: Tipo de Cambio y Fletes Aéreos (O1)   │ FACTOR 2: Manufactura Aditiva/SMT (O2)│
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ • Volatilidad USD/CLP (88,6% del BOM importado).│ • Madurez de impresión 3D industrial. │
│ • Alza del dólar presiona costos al alza.       │ • Elimina matricería de $15.000.000.  │
│ • EFECTO: Contracción O -> O'' a la IZQUIERDA.  │ • EFECTO: Expansión O -> O' a DERECHA.│
└─────────────────────────────────────────────────┴───────────────────────────────────────┘
```

1. **Variación en los Precios de Insumos y Tipo de Cambio (Factor O1):**
   * **Causa:** El **88,6 %** del costo directo de materiales depende de insumos transados en dólares o indexados a ellos (sonda inox 316L, microcontrolador ESP32, sensores, celdas 18650) — muy por encima del 72 % estimado en versiones anteriores del estudio, porque la sonda real ($48.000, el 68 % del BOM por sí sola) pesa mucho más que la cifra que se había cotizado antes.
   * **Impacto:** Una devaluación del peso chileno contrae la curva de oferta ($S \to S''$). El análisis de sensibilidad de [2.3.3](#233-análisis-de-sensibilidad-pruebas-de-estrés-y-punto-crítico-de-liquidez) muestra que el proyecto tolera hasta **+15 %** de alza en el costo variable antes de comprometer el resultado del Año 1 — sin margen de precio disponible para absorber más, porque $249.990 ya es el techo declarado del negocio.

2. **Variación en la Tecnología de Producción (Factor O2):**
   * **Causa:** La adopción de manufactura aditiva FDM y ensamblaje superficial SMT automatizado permite fabricar gabinetes técnicos IP67 sin incurrir en moldes de inyección plástica de alto CAPEX ($>\$15.000.000\text{ CLP}$).
   * **Impacto:** Reduce los costos fijos de entrada y los costos variables de lote pequeño, desplazando la curva de oferta hacia la derecha ($S \to S'$), permitiendo salir al mercado **7 % más barato que el Hanna HI9814 y 19 % más barato que el Bluelab Pulse** — los dos instrumentos portátiles comparables (ver [2.4.4](#244-benchmark-cuantitativo-de-la-competencia)).

---

### 2.3. Business Intelligence y Analítica de Datos

#### 2.3.1. Dashboard de Métricas Unitarias (*Unit Economics*) y KPIs

```text
                       DESGLOSE UNITARIO DEL PRECIO NETO ($210.076)
  ┌─────────────────────────────────┬───────────────────────────────┐
  │   COSTO VARIABLE: $91.309       │      MARGEN DE CONTRIBUCIÓN:  │
  │ (BOM, Flete, M.O., Garantía)    │      $118.767 (56,5 %)        │
  │             43,5 %              │                                │
  └─────────────────────────────────┴───────────────────────────────┘
```

| Métrica de Business Intelligence | Valor Año 1 | Diagnóstico Estratégico |
| :--- | :---: | :--- |
| **Precio de Venta Público (PVP con IVA)** | $249.990 CLP | Techo declarado del negocio; sigue siendo el más barato de los tres instrumentos portátiles comparables |
| **Precio Neto de Venta (PVN)** | $210.076 CLP | Ingreso real neto de impuestos |
| **Costo Variable Unitario** | $91.309 CLP | 43,5 % del precio neto — subió 32 % frente a estudios anteriores por el costo real de la sonda |
| **Margen de Contribución Unitario** | **$118.767 CLP** | **56,5 % sobre el ingreso neto** |
| **CAC — Año 1** | **$6.000 CLP** | Artificialmente bajo: gestión directa de los socios, sin agencia. No es un número replicable de régimen |
| **CAC — régimen (Años 2 a 5, promedio)** | **≈ $19.250 CLP** | Costo real una vez contratada una agencia de marketing digital |
| **Margen unitario / CAC — Año 1** | ≈ 19,8× | Cifra inflada por el CAC artificial del Año 1; no usar como referencia de eficiencia comercial estable |
| **Margen unitario / CAC — régimen** | **≈ 6,2×** | Cifra más honesta de la eficiencia comercial sostenible del negocio |
| **Período de recuperación del CAC** | **Inmediato (0 meses)** | Cobro contra entrega al 100 % sin diferimiento de cartera ni suscripción |

> [!NOTE]
> Este informe **no reporta un ratio LTV/CAC**. El modelo financiero no proyecta recompra ni tasa de retención por cliente —sólo unidades nuevas vendidas por año—, así que cualquier cifra de *lifetime value* sería una construcción no verificada. Si en el futuro se dispone de datos reales de recompra (equipos adicionales, referidos), esta métrica puede incorporarse con base empírica.

---

#### 2.3.2. Inteligencia Geográfica y Analítica Espacial (GIS + IDW)

TerraSense implementa un motor de analítica espacial basado en **Interpolación por Ponderación Inversa de la Distancia (IDW, $p=2$)** ejecutado de manera nativa en Canvas HTML5, sin servicios de mapas de pago ni carga en el servidor:

$$Z(s_0) = \frac{\sum_{i=1}^{N} \frac{1}{d_i^2} Z(s_i)}{\sum_{i=1}^{N} \frac{1}{d_i^2}}$$

* **Generación de Zonas de Manejo Diferenciado:** Transforma puntos dispersos de muestreo en mapas de calor de salinidad, humedad y pH sin costos de licencias satelitales.
* **Impacto Agronómico:** Permite al productor concentrar la aplicación de fertilizantes y correctores de acidez en los sectores deficitarios en lugar de aplicar de forma uniforme al predio completo.

> [!NOTE]
> El informe técnico maestro **no cuantifica un porcentaje específico de ahorro de insumos** atribuible al mapa IDW (a diferencia de una versión anterior de este documento, que citaba "15 % a 25 %" sin respaldo verificable). El beneficio se declara aquí en términos cualitativos hasta que exista un ensayo de campo propio que lo mida.

---

#### 2.3.3. Análisis de Sensibilidad, Pruebas de Estrés y Punto Crítico de Liquidez

| Escenario | UO Año 1 | Lectura |
| :--- | ---: | :--- |
| **BASE** — 200 u @ $249.990 | **$3.980.508** | ✅ |
| Volumen −10 % (180 u) | $1.605.168 | ✅ Sigue positivo |
| **Volumen −17 % (166 u)** | **−$57.570** | ⚠️ Aproximación al umbral de equilibrio |
| Volumen −20 % (160 u) | −$770.172 | ❌ Pérdida |
| Costo variable +15 % | $1.241.238; equilibrio 188 u | ✅ Sigue positivo |
| Gastos fijos +15 % | $1.438.480; equilibrio 188 u | ✅ Sigue positivo |
| **PESIMISTA combinado** (−10 % vol, +15 % CV, +15 % GF) | **−$3.402.203** | ❌ Pérdida en el Año 1 |

```text
                  ANÁLISIS DE RESILIENCIA (TOLERANCIA AL QUIEBRE, AÑO 1)
  Volumen de Ventas   [██████████████████░░░░]  −17,0 % (piso aproximado: 166 unidades)
  Costo Variable      [███████████████████░░░]  +15,0 % (aprox., antes de comprometer el año)
  Gastos Fijos        [███████████████████░░░]  +15,0 % (aprox., poca holgura para adelantar contrataciones)
  Precio de Venta     [░░░░░░░░░░░░░░░░░░░░░░]    0,0 % — YA ESTÁ EN EL TECHO DECLARADO DEL NEGOCIO
```

> [!WARNING]
> ### 🎯 Conclusión del análisis de sensibilidad
> **Ya no queda palanca de precio disponible.** $249.990 es el máximo que el proyecto se permite cobrar frente a la competencia. La única variable de ajuste real frente a un mal desempeño del Año 1 es el **volumen**, de ahí que toda la estrategia comercial del Año 1 (demostraciones en terreno, pauta digital directa gestionada por los propios socios) esté orientada a proteger esa única variable.

> [!WARNING]
> **Sobre el mes crítico de caja del Año 1:** con la sonda a $48.000, un lote de 100 unidades cuesta cerca de $7,1 millones sólo en materiales (frente a los ~$2,98 millones que costaba con la cotización anterior, subestimada). El mes en que se paga un lote grande de importación, con las ventas del año todavía en rampa de inicio, es el punto más ajustado del ejercicio. **Mitigación recomendada:** fraccionar las compras de componentes y sonda en lotes más pequeños y frecuentes (por ejemplo, 50 unidades en vez de 100), en lugar de una compra semestral grande. El capital de trabajo de esta sección ya se dimensionó considerando esta irregularidad de caja.

---

#### 2.3.4. Capacidad de Producción y Cuello de Botella Real

Antes de proyectar ventas hay que verificar que el negocio pueda fabricarlas.

| Año | Unidades | Horas de impresión 3D | Impresoras necesarias | Horas de ensamblaje | Dotación necesaria | Impresoras disponibles | Utilización |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 200 | 1.500 h | 0,25 | 300 h | 0,17 FTE | 2 | **12,5 %** |
| 2 | 350 | 2.625 h | 0,44 | 525 h | 0,29 FTE | 2 | **21,9 %** |
| 3 | 500 | 3.750 h | 0,63 | 750 h | 0,42 FTE | 2 | **31,3 %** |
| 4 | 650 | 4.875 h | 0,81 | 975 h | 0,54 FTE | 3 | **27,1 %** |
| 5 | 850 | 6.375 h | 1,06 | 1.275 h | 0,71 FTE | 3 | **35,4 %** |

*Supuestos: 7,5 h de impresión y 1,5 h de ensamblaje + QA por unidad; 6.000 h útiles por impresora al año; 1.800 h por persona a jornada completa.*

> [!IMPORTANT]
> **La capacidad instalada no es la restricción.** Incluso en el Año 5, la granja de impresión opera al 35 % y el ensamblaje ocupa poco más de media jornada equivalente — el proyecto podría producir más del doble del plan sin CAPEX adicional en máquinas. Los cuellos de botella reales son otros tres: **(1)** el plazo de importación de componentes (~45–60 días entre pedido y bodega), mitigado con compras por lotes y stock de seguridad ya incluido en el capital de trabajo; **(2)** la **capacidad comercial** —colocar las unidades, no fabricarlas— que es la verdadera restricción del modelo, y por eso el presupuesto de marketing crece más rápido que el de producción; **(3)** la **caja disponible** al momento de comprar cada lote, ya abordada en [2.3.3](#233-análisis-de-sensibilidad-pruebas-de-estrés-y-punto-crítico-de-liquidez). La impresora 3D secundaria se compra por **redundancia operacional**, no por capacidad: al 12,5 % de uso el primer año, su función es que una falla de la impresora principal no detenga un lote completo.

---

### 2.4. Investigación de Mercado y Validación Comercial

#### 2.4.1. Descripción y Características del Producto / Servicio

TerraSense no se define como un termómetro digital, sino como una **plataforma prescriptiva de toma de decisiones agronómicas**:
* **Lectura Integral en menos de 8 Segundos:** Registra 7 variables de suelo y 2 de aire en un solo acto mecánico de inserción.
* **Traducción a Lenguaje de Acción:** El agricultor no recibe números complejos; recibe un semáforo de estado (*Óptimo, Precaución, Crítico*) y una receta explícita en kg/ha y costo estimado en pesos.
* **Veto Cruzado por Salinidad:** Algoritmo defensivo propietario que marca como confianza baja las lecturas de NPK si la conductividad eléctrica supera el umbral de validez de la calibración de fábrica, protegiendo al productor de interpretar salinidad como fertilidad.

---

#### 2.4.2. Segmentación y Dimensionamiento Basado en Datos Censales (TAM / SAM / SOM)

Construido exclusivamente sobre la fuente estadística oficial del **VIII Censo Nacional Agropecuario y Forestal 2021 (INE/ODEPA)**, valorizado al precio neto real ($210.076 CLP):

```text
                     EMBUDO DE MERCADO TERRASENSE (CHILE)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🌍 TAM · Mercado Total Teórico                                               │
│    175.556 explotaciones censadas (138.628 UPA + 36.928 UAC)                 │
│    Valoración económica total: ~$36.880 millones CLP                         │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │  Filtro 1: exclusión de autoconsumo (UAC)
                                     │  Filtro 2: cobertura de internet móvil rural (94,5 %)
                                     │  Filtro 3: orientación comercial y cultivo de valor
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🎯 SAM · Mercado Servible Disponible                                         │
│    ~120.000 UPA comerciales con smartphone y cultivo de valor                │
│    Valoración servible: ~$25.209 millones CLP                                │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │  Filtro 4: capacidad de captura comercial real
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🚀 SOM · Meta de Captura Operativa (5 Años)                                  │
│    Año 1 → 0,17 % del SAM =  200 unidades                                    │
│    Año 2 → 0,29 % del SAM =  350 unidades                                    │
│    Año 3 → 0,42 % del SAM =  500 unidades                                    │
│    Año 4 → 0,54 % del SAM =  650 unidades                                    │
│    Año 5 → 0,71 % del SAM =  850 unidades                                    │
│    Total acumulado a 5 años: 2.550 unidades (2,13 % del SAM total)           │
└──────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Por qué 200 unidades y no 1.000 en el Año 1.** Una marca nueva, sin red de distribución consolidada, sin historial de campo y sin referencias de productores conocidos no coloca mil unidades en doce meses en el agro chileno. El volumen se revisó de 120 a 200 unidades por una razón financiera, no comercial: pagar sueldo a los dos socios desde el mes 1 exige un punto de equilibrio más alto. 200 unidades siguen siendo apenas 17 al mes, sostenibles con venta directa y demostraciones en terreno, sin una fuerza de ventas contratada.

**Motor del crecimiento año a año — no es una lista de deseos, cada salto tiene una causa presupuestada:**

| Año | Unidades | Qué se hace ese año para conseguirlo | Inversión en marketing | CAC |
| :---: | :---: | :--- | :---: | :---: |
| **1** | 200 | Sin agencia: los dos socios gestionan $100.000/mes en Google/Meta Ads, más demostraciones en terreno. Objetivo real: construir los primeros 200 casos documentados | $1.200.000 | $6.000 |
| **2** | 350 | Se contrata la primera **agencia de marketing** y se activa el canal **PRODESAL/INDAP** | $7.080.000 | $20.229 |
| **3** | 500 | Primer **convenio con distribuidor de insumos agrícolas**, se completa 1 FTE de ensamblaje y se arrienda el primer taller | $10.680.000 | $21.360 |
| **4** | 650 | Consolidación del canal B2B y primera postulación a compra institucional | $12.000.000 | $18.462 |
| **5** | 850 | Cobertura multirregional, base instalada de ~1.700 equipos generando recomendación entre pares | $14.400.000 | $16.941 |

---

#### 2.4.3. Mapa de Empatía y Necesidades No Satisfechas del Cliente

```text
┌───────────────────────────────────────────┬───────────────────────────────────────────┐
│ FRUSTRACIONES Y DOLORES (PAINS)           │ ALEGRÍAS Y GANANCIAS ESPERADAS (GAINS)    │
├───────────────────────────────────────────┼───────────────────────────────────────────┤
│ • Demoras de 15 a 30 días en saber el     │ • Diagnóstico inmediato antes de regar.   │
│   estado del suelo por vía de laboratorio.│ • Dosis exacta en sacos o kg/ha.          │
│ • Incertidumbre al dosificar fertilizante.│ • Sonda robusta que soporte caídas (IP67).│
│ • Instrumentos que se rompen con el barro.│ • Pago único sin suscripciones obligadas. │
│ • Cobros mensuales en dólares por software│ • Compra directa: llega, funciona.        │
│ • Trámites y burocracia de programas      │ • Sin formularios, sin esperar aprobación │
│   estatales que tardan meses en aprobarse.│   de ningún organismo, salvo si se opta   │
│ • Depender del calendario de INDAP para   │   voluntariamente por el cofinanciamiento │
│   tomar decisiones agronómicas urgentes.  │   PRODESAL/INDAP del canal B2G (Año 2).   │
└───────────────────────────────────────────┴───────────────────────────────────────────┘
```

---

#### 2.4.4. Benchmark Cuantitativo de la Competencia

| Parámetro Comparativo | Hanna HI9814 | Bluelab Pulse | FieldScout TDR 350 | Lab. Químico | **TerraSense IoT** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Precio de Venta (CLP)** | $269.010 | $310.185 | $1.367.925 | $35.000 / muestra | **$249.990** |
| **Posicionamiento de Precio vs. TerraSense** | +7,6 % más caro | +24,1 % más caro | +447,2 % más caro | Recurrente (no comparable) | **Líder en costo entre portátiles** |
| **Parámetros Medidos** | 4 (pH, EC, T°, TDS) | 3 (Hum., EC, T°) | 1 (Humedad) | 12+ (Analítico) | **9 (Suelo + Aire)** |
| **Medición de NPK** | ❌ No | ❌ No | ❌ No | ✅ Sí (analítico) | **✅ Sí — estimado por EC, no ion-selectivo (limitación declarada)** |
| **Tiempo de Respuesta** | Inmediato | < 10 segundos | Inmediato | 15 a 30 días | **≤ 8 segundos** |
| **Preparación de Muestra** | Suspensión/lodo | Directa | Directa | Secado y tamizado | **Directa in situ** |
| **Motor Prescriptivo** | ❌ No | ❌ No | ❌ No | Parcial (tablas) | **✅ Cuantitativo, 4 capas** |
| **Georreferenciación GIS** | ❌ No | ✅ En app | ✅ Opcional | ❌ No | **✅ Integrada IDW, sin costo** |
| **Alimentación Eléctrica** | 3 pilas AAA | 1 pila AA | 4 pilas AA | N/A | **Recargable USB-C** |

> [!NOTE]
> **El precio subió de $179.990 a $249.990** al revisar el modelo económico con el costo real de la sonda y con sueldo de ambos socios desde el mes 1. **Sigue siendo el más barato de los tres instrumentos portátiles comparables**, pero el margen de esa afirmación se estrechó frente a versiones anteriores del estudio: de "42 % más barato" a "7 %–19 % más barato" según el competidor. Se declara así, sin maquillar la reducción del margen competitivo.
>
> **Sobre el NPK: se corrige aquí una imprecisión de versiones anteriores de este informe**, que lo describía como "reactivo". La sonda **no usa electrodos ion-selectivos ni química reactiva**: deriva N, P y K de la conductividad eléctrica del suelo mediante una recta de regresión empírica, igual que la mayoría de las sondas económicas del mercado. El proyecto lo declara como limitación técnica de fondo y mitiga el riesgo de falsos positivos por salinidad con una regla de veto cruzado en el motor agronómico — ver el informe técnico maestro, sección X.2.2.5.

---

#### 2.4.5. Oportunidades y Estrategia Multicanal (B2C, B2G, B2B, Distribución Directa)

| Canal | Cómo opera | Cuándo se activa | Consideración de precio |
| :--- | :--- | :---: | :--- |
| **B2C directo** | Venta online con despacho nacional; demostraciones en ferias | Año 1 | Precio de lista completo, $249.990 |
| **B2G / institucional (INDAP, PRODESAL)** | El agricultor postula al Programa de Desarrollo de Inversiones. INDAP cofinancia hasta el 60 % del valor bruto de la inversión (hasta el 90 % para proyectos de sustentabilidad o postulantes jóvenes, mujeres o de pueblos originarios), con tope de $7.500.000 por productor al año | Año 2 | El precio deja de ser la barrera: el desembolso efectivo del productor cae al 10–40 % |
| **B2B distribuidores de insumos agrícolas** | Venta a través de casas comerciales agrícolas (Coagra, Copeval, Anasac y similares) | Año 3 | Exige margen de canal del 15–20 %: debe salir de un precio de lista superior, no del margen del fabricante |
| **Cooperativas y asociaciones gremiales** | Compra colectiva con descuento por volumen | Año 4 | Descuento por volumen acotado al 10 % |

> [!WARNING]
> **Implicancia directa sobre el precio.** Si el canal B2B exige un 15–20 % de margen sobre un precio de lista de $249.990, el fabricante recibe entre $168.061 y $178.564 netos por unidad — todavía por encima del costo variable unitario ($91.309), pero con un margen de contribución bastante más ajustado que en venta directa. **El descuento de canal debe salir del precio de lista, no del margen del fabricante**: razón adicional para no bajar el precio de lista por debajo de $249.990 una vez activo el canal B2B (Año 3).

---

### 2.5. Argumentación Estratégica y Defensa ante Objeciones (Q&A con Evidencia)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    DEFENSA ESTRATÉGICA Y RESPUESTAS BASADAS EN EVIDENCIA                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q1: ¿Cumple el proyecto la evaluación financiera estándar?                              │
│ R1: Sí. El VAN(20 %, 5 años) es $2.588.182 y la TIR es ≈22,7 %, superior al 20 %       │
│     exigido. El Pay Back es 3,71 años. Deben verificarse la tasa corta del 15 % y la    │
│     dotación de ensamblaje antes de ejecutar la inversión.                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q2: ¿Por qué proyectar sólo 200 unidades el primer año y no 1.000?                       │
│ R2: 200 unidades representan el 0,17 % del SAM (~17 al mes). Una meta mayor sin red de  │
│     distribución consolidada carece de credibilidad técnica y financiera. Subió de 120  │
│     a 200 por una razón financiera —sueldo de los socios desde el mes 1—, no comercial. │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q3: ¿Cómo compite con la exactitud de un laboratorio químico?                           │
│ R3: No son sustitutos, son complementarios. El laboratorio entrega el perfil analítico  │
│     de referencia; TerraSense entrega el monitoreo diario in situ a costo marginal cero.│
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q4: ¿Qué ocurre ante una devaluación fuerte del peso chileno?                            │
│ R4: El 88,6 % del BOM está denominado en dólares. El análisis de sensibilidad muestra   │
│     que el costo variable tolera hasta +15 % antes de comprometer el resultado del Año  │
│     1 — y esta vez **no existe la opción de subir el precio**: $249.990 ya es el techo  │
│     que el proyecto se fijó frente a la competencia. La única palanca de ajuste real es │
│     el volumen, por lo que la estrategia comercial del Año 1 está diseñada para eso.    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q5: ¿Por qué financiar con deuda y aporte propio, y no 100 % con banco o con fondos      │
│     estatales?                                                                           │
│ R5: Ningún banco chileno presta el 100 % a una empresa recién constituida, ni siquiera  │
│     con garantía FOGAPE: la garantía reduce el riesgo del banco, no reemplaza el         │
│     compromiso de capital propio. El pie de los socios (33,5 %) respalda la solicitud   │
│     el crédito. El proyecto no depende de un fondo CORFO no reembolsable, pero tampoco  │
│     lo descarta si se adjudica: aliviaría de inmediato la carga de deuda del Año 1.      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q6: ¿Por qué no cobrar una suscripción mensual recurrente (SaaS)?                       │
│ R6: El agricultor tradicional rechaza los costos fijos recurrentes en dólares. El cobro │
│     único elimina la fricción de adopción inicial y evita depender de conectividad      │
│     continua, coherente con la arquitectura offline-first del producto.                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q7: La sonda no mide NPK con electrodos ion-selectivos: ¿lo sabían al fijar el precio?  │
│ R7: Sí, y se declara explícitamente en el producto y en este informe: el NPK se deriva  │
│     de conductividad eléctrica, igual que la mayoría de las sondas económicas del       │
│     mercado. Se mitiga con una regla de veto cruzado por salinidad y se recomienda el   │
│     contraste de laboratorio cada 2–3 años como política de producto, no como opcional. │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Conclusiones Ejecutivas de la Presentación

1. **Economía de mercado, con matiz honesto sobre el rol del Estado.** TerraSense fija su precio ($249.990 CLP) por costo real y posición competitiva. El financiamiento combina 33,5 % de capital propio, 47,6 % de crédito largo y 18,8 % de línea corta; la garantía FOGAPE reduce el riesgo bancario, pero no es un aporte no reembolsable. No hay fondo CORFO comprometido.

2. **La viabilidad financiera cumple la evaluación estándar.** A 5 años y con 20 % de tasa exigida, **el VAN es $2.588.182, la TIR ≈22,7 % y el Pay Back 3,71 años**. La utilidad neta es positiva desde el Año 1. La recomendación queda sujeta a confirmar la tasa corta con bancos y la capacidad operativa de la dotación dimensionada por horas.

3. **Propuesta de valor centrada en el cliente, con sus límites declarados.** Frente a sondas extranjeras más caras que sólo entregan números crudos, TerraSense ofrece 9 parámetros simultáneos, prescripciones agronómicas automáticas y mapas GIS sin suscripción — pero reconoce abiertamente que su medición de NPK es una estimación por conductividad, no un análisis ion-selectivo, y lo comunica en el producto en vez de ocultarlo detrás del marketing.

4. **Escalabilidad limitada por la demanda, no por la producción.** El cuello de botella real del negocio es comercial (colocar 200, 350, 500, 650 y 850 unidades en cinco años sucesivos) y de caja (financiar los lotes de importación en los meses de venta baja), no de capacidad instalada: la planta opera al 12,5 %–35,4 % de utilización durante todo el quinquenio proyectado.

---

> [!NOTE]
> **Trazabilidad de este informe.** Todas las cifras de este documento provienen de la Sección XII (Evaluación económica) y la Sección XI (Estudio de mercado) del informe técnico maestro del proyecto (`README.md`, raíz del repositorio), revisado el 30 de agosto de 2026, y de las planillas `flujo de caja.xlsx` y `financiamiento.xlsx` del mismo repositorio, que reproducen el mismo modelo. Cualquier actualización futura de esos documentos debe propagarse aquí para mantener la consistencia entre el informe académico y el informe real de proyecto.
