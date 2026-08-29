# 🌾 Comercialización de Tecnologías — Unidad 1
## Informe Integral de Factibilidad Comercial, Análisis Económico y Validación de Mercado: TerraSense IoT

> **Asignatura:** Comercialización de Tecnologías  
> **Proyecto Tecnológico:** TerraSense — Tu Ingeniero Agrónomo en el Bolsillo  
> **Área Académica:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP  
> **Fecha:** Agosto 2026  

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
   - [2.4. Investigación de Mercado y Validación Comercial](#24-investigación-de-mercado-y-validación-comercial)
     - [2.4.1. Descripción y Características del Producto / Servicio](#241-descripción-y-características-del-producto--servicio)
     - [2.4.2. Segmentación y Dimensionamiento Basado en Datos Censales (TAM / SAM / SOM)](#242-segmentación-y-dimensionamiento-basado-en-datos-censales-tam--sam--som)
     - [2.4.3. Mapa de Empatía y Necesidades No Satisfechas del Cliente](#243-mapa-de-empatía-y-necesidades-no-satisfechas-del-cliente)
     - [2.4.4. Benchmark Cuantitativo de la Competencia](#244-benchmark-cuantitativo-de-la-competencia)
     - [2.4.5. Oportunidades y Estrategia Multicanal (B2C, B2G, B2B, Asociativo)](#245-oportunidades-y-estrategia-multicanal-b2c-b2g-b2b-asociativo)
   - [2.5. Argumentación Estratégica y Defensa ante Objeciones (Q&A con Evidencia)](#25-argumentación-estratégica-y-defensa-ante-objeciones-qa-con-evidencia)
3. [Conclusiones Ejecutivas de la Presentación](#3-conclusiones-ejecutivas-de-la-presentación)

---

## 1. Introducción: Problemática y Especificaciones Técnicas del Producto

### 1.1. Contexto y Problemática del Sector Agrícola

La pequeña y mediana agricultura chilena —compuesta por más de 175.000 explotaciones según el VIII Censo Agropecuario y Forestal (INE/ODEPA)— enfrenta una crisis multidimensional:
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
│ 3. Instrumentos Importados│ Costo elevado ($270k–$1,3M) │ Entregan números abstractos   │
│    (Bluelab / Hanna / TDR)│ y parámetros incompletos.   │ sin prescripción agronómica.  │
└───────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

El pequeño y mediano productor termina gestionando su campo **«a ciegas» o por intuición**, provocando asfixias radiculares, abortos florales por exceso salino y sobrefertilizaciones que contaminan las napas freáticas.

---

### 1.2. Especificaciones Técnicas del Producto y Arquitectura Integral

**TerraSense** es un ecosistema IoT de instrumentación y diagnóstico agronómico in situ que traduce datos físicos de suelo y microclima en prescripciones agronómicas cuantificadas en menos de 5 segundos.

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
  * *Suelo (7):* Humedad volumétrica (VWC $\pm 2\%$, FDR), Conductividad eléctrica (EC $\pm 3\%$, compensada en $T^\circ$), Potencial de hidrógeno (pH $\pm 0,1$, estado sólido), Temperatura de suelo ($\pm 0,5^\circ\text{C}$), Nitrógeno (N), Fósforo (P) y Potasio (K) reactivos.
  * *Microclima (2):* Temperatura del aire ($\pm 0,5^\circ\text{C}$) y Humedad relativa del aire ($\pm 3\%$) mediante sensor Bosch BME280 integrado.
* **Comunicaciones y Procesamiento:** Microcontrolador SoC ESP32 dual-core a 240 MHz con enlace inalámbrico **Bluetooth Low Energy (BLE 5.0)** y bus industrial RS-485 con transceptor aislado bajo protocolo Modbus RTU.
* **Autonomía Energética:** Pack de 2 celdas de Ion-Litio 18650 en paralelo (3,7 V, 6.000 mAh nominales), circuito de carga USB-C con protección activa (TP5100), consumo en reposo de $\approx 15\ \mu\text{A}$ y capacidad para realizar **más de 1.400 mediciones completas por recarga** (>8 meses sin conectar a la red).
* **Robustez Industrial IP67:** Gabinete de PETG con absorbedores de impacto, tornillería inox 316L, sello perimetral elastomérico y membrana hidrofóbica ePTFE permeable a gases pero estanca a líquidos.
* **Motor Prescriptivo Offline:** Algoritmo determinístico de 4 capas en TypeScript/SQLite que opera **sin necesidad de conexión a internet o señal 4G**, evaluando umbrales agronómicos específicos para 4 etapas fenológicas (*pre-siembra, vegetativo, floración y cosecha*).

---

## 2. Desarrollo Temático

### 2.1. Conceptos de Economía, Tipo de Economía y Modelos Económicos

#### 2.1.1. Determinación y Justificación del Tipo de Economía

El modelo de negocio de TerraSense se enmarca estratégicamente en una **Economía Social de Mercado (Economía Mixta con Rol Subsidiario y Fomento Tecnológico)**, complementada por los principios de la **Economía del Conocimiento** y la **Economía Circular y Sostenible**:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                  ENMARQUE EN EL SISTEMA ECONÓMICO Y MODELO DE NEGOCIO                   │
├───────────────────────────┬─────────────────────────────────────────────────────────────┤
│ TIPO DE ECONOMÍA          │ APLICACIÓN DIRECTA EN TERRASENSE                            │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. Economía Social de     │ Opera en el libre mercado chileno pero aprovecha el rol     │
│    Mercado (Mixta)        │ subsidiario del Estado (INDAP, FIA, CORFO) para cofinanciar │
│                           │ la adquisición del bien tecnológico a pequeños productores. │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. Economía del           │ El valor no reside en la materia prima física (plástico o   │
│    Conocimiento           │ silicio), sino en los algoritmos prescriptivos y la analítica│
│                           │ agronómica propietaria incorporada en el software.          │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. Economía Circular y    │ Minimiza el impacto ambiental: baterías recargables USB-C   │
│    Eficiencia de Recursos │ (evita 4.200 pilas alcalinas/año) y optimización en campo   │
│                           │ que reduce el desperdicio de agua y fertilizantes químicos. │
└───────────────────────────┴─────────────────────────────────────────────────────────────┘
```

* **Estructura de Mercado Elegida:** **Competencia Monopolística con Diferenciación Tecnológica**. TerraSense no compite como un *price-taker* de sensores genéricos sin marca, sino como una solución integrada con poder de fijación de precio gracias a su motor agronómico, georreferenciación GIS y soporte local.

---

#### 2.1.2. Aplicación Rigurosa de Conceptos Económicos al Negocio

1. **Costo Marginal Asimétrico ($CMg = 0$):**  
   El laboratorio tradicional opera bajo rendimientos constantes con costo marginal elevado ($CMg_{\text{Lab}} \approx \$35.000\text{ CLP}$ por muestra). TerraSense rompe este paradigma: una vez adquirido el equipo (CAPEX), el **costo marginal de ejecutar 1, 10 o 100 mediciones adicionales en el predio es exactamente $0 CLP**. Esto desata una asimetría económica que habilita la agricultura de precisión en predios pequeños.

2. **Economías de Escala en la Curva de Manufactura:**  
   El costo variable unitario disminuye progresivamente según la escala del lote:
   * **Año 1 (120 unidades):** Costo Variable Unitario = **$69.069 CLP**
   * **Año 3 (420 unidades):** Costo Variable Unitario = **$64.925 CLP** (quiebres de precio por volumen)
   * **Año 5 (840 unidades):** Costo Variable Unitario = **$62.162 CLP** (negociación directa con fábricas)

3. **Costo Total de Propiedad (TCO a 5 Años) para un Predio de 3 Hectáreas:**

```text
                  COMPARATIVA TCO A 5 AÑOS (20 MEDICIONES / AÑO)
  $4.000.000 ┬──────────────────────────────────────────────────────── Laboratorio Químico
             │                                                          ($3.500.000 CLP)
  $3.000.000 ┼──────────────────────────────────── Asesor Agronómico
             │                                     ($2.400.000 CLP)
  $2.000.000 ┼─────────────────────────────────
             │
  $1.000.000 ┼─────────────────────────────────
             │                                  ═══════════════════════ TerraSense IoT
          $0 ┴────────────────────────────────────────────────────────  ($204.990 CLP)
             Año 0       Año 1       Año 2       Año 3       Año 4       Año 5
```

$$\text{Ahorro Económico Neto a 5 Años} = \frac{\$3.500.000 - \$204.990}{\$3.500.000} = \mathbf{94{,}1\ \%}$$

---

#### 2.1.3. Modelo Financiero y Evaluación de Inversiones (Flujo de Caja, VAN, TIR, Payback)

La evaluación financiera se formuló a un horizonte de 5 años bajo el régimen tributario Pro Pyme General (**25 % de impuesto a la renta**) y una **tasa de descuento exigida del $r = 20\ \%$ anual**.

$$\textbf{Inversión Inicial } (I_0) = \underbrace{\$9.892.415}_{\text{Capital de Trabajo y Activo Nominal}} + \underbrace{\$4.130.000}_{\text{Activo Fijo (Maquinaria y Taller)}} = \mathbf{\$14.022.415\ \text{CLP}}$$

##### Estado de Resultados y Flujo de Fondos Proyectado:

| Concepto Financiero | Año 0 | Año 1 (120 u) | Año 2 (240 u) | Año 3 (420 u) | Año 4 (600 u) | Año 5 (840 u) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **(+) Ingresos Netos de Explotación** | $0 | $18.150.240 | $37.026.490 | $66.092.284 | $96.305.899 | $137.524.824 |
| (−) Costos Variables de Fabricación | $0 | ($8.588.280) | ($16.821.521) | ($29.077.296) | ($41.623.083) | ($58.421.685) |
| (−) Gastos de Administración y Fijos | $0 | ($2.641.580) | ($8.604.930) | ($23.012.821) | ($30.913.316) | ($39.379.405) |
| (−) Gastos de Comercialización (CAC) | $0 | ($1.800.000) | ($4.066.920) | ($6.644.793) | ($9.748.860) | ($14.016.911) |
| (−) Depreciación del Activo Fijo | $0 | ($683.095) | ($683.095) | ($683.095) | ($683.095) | ($683.095) |
| (−) Costo Financiero (Intereses) | $0 | ($497.242) | ($121.793) | ($91.345) | ($60.897) | ($30.448) |
| **(=) Utilidad Antes de Impuestos** | $0 | **$3.940.043** | **$6.728.231** | **$6.582.934** | **$13.276.648** | **$24.993.280** |
| (−) Impuesto de Primera Categoría (25%)| $0 | ($985.011) | ($1.682.058) | ($1.645.733) | ($3.319.162) | ($6.248.320) |
| **(=) Utilidad Neta del Ejercicio** | $0 | **$2.955.032** | **$5.046.173** | **$4.937.200** | **$9.957.486** | **$18.744.960** |
| (+) Ajuste por Depreciación | $0 | $683.095 | $683.095 | $683.095 | $683.095 | $683.095 |
| (−) Amortización de Créditos | $0 | ($1.804.483) | ($304.483) | ($304.483) | ($304.483) | ($304.483) |
| **(=) FLUJO DE FONDOS NETO** | **($14.022.415)** | **$1.833.645** | **$5.424.785** | **$5.315.813** | **$10.336.098** | **$19.123.572** |
| **Flujo de Fondos Acumulado** | **($14.022.415)** | **($12.188.770)** | **($6.763.985)** | **($1.448.173)** | **+$8.887.926** | **+$28.011.498** |

##### Indicadores Clave de Decisión:

$$VAN(20\%) = \sum_{t=1}^{5} \frac{FF_t}{(1+0{,}20)^t} - I_0 = \$21.041.480 - \$14.022.415 = \mathbf{+\$7.019.065\ \text{CLP}}$$

$$TIR = \mathbf{34{,}6\ \%} \quad (\text{Supera holgadamente el 20 \% exigido})$$

$$\text{Pay Back Simple} = \mathbf{3{,}14\ \text{años}} \quad (\text{Payback Descontado } = 4{,}09\ \text{años})$$

$$\text{Punto de Equilibrio Año 1} = \frac{\text{Gastos Fijos}}{\text{Precio Neto} - \text{Costo Var.}} = \frac{\$4.577.675}{\$151.252 - \$69.069} = \mathbf{55{,}7 \approx 56\ \text{unidades}}$$

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
      │                         /\     \  ← D' (Desplazamiento por sequía y subsidio INDAP)
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
│ FACTOR 1: Cambio Climático y Estrés Salino (D1) │ FACTOR 2: Política Pública INDAP (D2) │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ • Aumento de la escasez hídrica y salinidad.    │ • Subsidio PDI cofinancia 60% a 90%.  │
│ • La necesidad de diagnóstico se vuelve crítica.│ • Desembolso baja a $18.000–$72.000.  │
│ • EFECTO: Desplazamiento D -> D' a la DERECHA.  │ • EFECTO: Gran expansión de cantidad. │
└─────────────────────────────────────────────────┴───────────────────────────────────────┘
```

1. **Variación en Preferencias y Urgencia Ambiental (Factor D1):**  
   * **Causa:** La prolongada sequía y el uso forzado de aguas de pozo salinas aumentan el riesgo de pérdida total de cosechas.
   * **Impacto:** Los agricultores incrementan su disposición a pagar por herramientas de medición in situ, desplazando la curva de demanda hacia la derecha ($D \to D'$), aumentando la cantidad demandada a cualquier nivel de precio.
2. **Variación en el Nivel de Ingreso Disponible vía Subsidio Estatal (Factor D2):**  
   * **Causa:** El Programa de Desarrollo de Inversiones (PDI) de INDAP subsidia hasta el **60 % y hasta el 90 %** del valor bruto de tecnologías agrícolas sustentables para productores acreditados (con tope de $7,5 millones anuales).
   * **Impacto:** El precio efectivo percibido por el usuario cae a un rango de **$18.000 a $72.000 CLP**, eliminando la restricción presupuestaria del segmento más vulnerable y expandiendo masivamente la demanda accesible.

---

#### 2.2.3. Identificación y Análisis de 2 Variaciones en los Factores de Oferta

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     VARIACIONES IDENTIFICADAS EN LOS FACTORES DE OFERTA                 │
├─────────────────────────────────────────────────┬───────────────────────────────────────┤
│ FACTOR 1: Tipo de Cambio y Fletes Aéreos (O1)   │ FACTOR 2: Manufactura Aditiva/SMT (O2)│
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ • Volatilidad USD/CLP (72% BOM importado).      │ • Madurez de impresión 3D industrial. │
│ • Alza del dólar presiona costos al alza.       │ • Elimina matricería de $15.000.000.  │
│ • EFECTO: Contracción O -> O'' a la IZQUIERDA.  │ • EFECTO: Expansión O -> O' a DERECHA.│
└─────────────────────────────────────────────────┴───────────────────────────────────────┘
```

1. **Variación en los Precios de Insumos y Tipo de Cambio (Factor O1):**  
   * **Causa:** El 72 % del costo directo de materiales depende de insumos transados en dólares (sonda inox 316L, microcontrolador ESP32, sensores).
   * **Impacto:** Una devaluación del peso chileno por encima de $1.030 CLP/USD contrae la curva de oferta ($S \to S''$), obligando a elevar el precio o absorber menores márgenes brutos.
2. **Variación en la Tecnología de Producción (Factor O2):**  
   * **Causa:** La adopción de manufactura aditiva FDM de alta velocidad y ensamblaje superficial SMT automatizado permite fabricar gabinetes técnicos IP67 sin incurrir en moldes de inyección plástica de alto CAPEX ($>\$15.000.000\text{ CLP}$).
   * **Impacto:** Reduce los costos fijos de entrada y los costos variables de lote pequeño, desplazando la curva de oferta hacia la derecha ($S \to S'$), permitiendo salir al mercado a un precio de lista $42 \%$ inferior a la competencia internacional.

---

### 2.3. Business Intelligence y Analítica de Datos

#### 2.3.1. Dashboard de Métricas Unitarias (*Unit Economics*) y KPIs

```text
                       DESGLOSE UNITARIO DEL PRECIO NETO ($151.252)
  ┌───────────────────────────────┬───────────────────────────────┬───────────────┐
  │   COSTO VARIABLE: $69.069     │      MARGEN NETO: $67.183     │ CAC: $15.000  │
  │ (BOM, Flete, M.O., Garantía)  │  (Contribución a Utilidad/GF) │ (Marketing)   │
  │            45,7 %             │            44,4 %             │     9,9 %     │
  └───────────────────────────────┴───────────────────────────────┴───────────────┘
```

| Métrica de Business Intelligence | Valor Año 1 | Benchmark Saludable | Diagnóstico Estratégico |
| :--- | :---: | :---: | :--- |
| **Precio de Venta Público (PVP con IVA)** | $179.990 CLP | $< \$250.000$ | Altamente competitivo frente a rivales internacionales |
| **Precio Neto de Venta (PVN)** | $151.252 CLP | — | Ingreso real neto de impuestos |
| **Margen de Contribución Unitario** | **$82.183 CLP** | $> 50\%$ | **54,3 % sobre el ingreso neto** (excelente cobertura) |
| **Costo de Adquisición de Clientes (CAC)** | **$15.000 CLP** | $< 25\%$ Margen | **18,3 % del margen unitario** (venta directa y ferias) |
| **Ratio LTV / CAC** | **10,1x** | $> 3,0\text{x}$ | Extraordinaria eficiencia comercial de cada peso en marketing |
| **Período de Recuperación del CAC** | **Inmediato (0 meses)**| $< 12\text{ meses}$ | Cobro contra entrega al 100 % sin diferimiento de cartera |

---

#### 2.3.2. Inteligencia Geográfica y Analítica Espacial (GIS + IDW)

TerraSense implementa un motor de analítica espacial basado en **Interpolación por Ponderación Inversa de la Distancia (IDW, $p=2$)** ejecutado de manera nativa en Canvas HTML5:

$$Z(s_0) = \frac{\sum_{i=1}^{N} \frac{1}{d_i^2} Z(s_i)}{\sum_{i=1}^{N} \frac{1}{d_i^2}}$$

* **Generación de Zonas de Manejo Diferenciado:** Transforma puntos dispersos de muestreo en mapas de calor de salinidad, humedad y pH sin costos de licencias satelitales ni consumo de APIs externas.
* **Impacto Agronómico Cuantificable:** Permite al productor aplicar fertilizantes y correctores de acidez únicamente en los sectores deficitarios, reduciendo el gasto de insumos químicos en un **15 % a 25 % por temporada**.

---

#### 2.3.3. Análisis de Sensibilidad, Pruebas de Estrés y Punto Crítico de Liquidez

```text
                  ANÁLISIS DE RESILIENCIA (TOLERANCIA AL QUIEBRE)
  Volumen de Ventas   [██████████████░░░░░░░░]  -10,0 % (Mínimo: 108 unidades/año)
  Precio de Venta     [████████████████░░░░░░]   -5,6 % (Piso: $170.000 CLP)
  Costo Variable      [████████████████████░░]  +13,0 % (Dólar máx: $1.030 CLP)
  Gastos Fijos        [██████████████████████]  +15,0 % (Holgura de arriendo/sueldos)
```

> [!WARNING]
> ### 🚨 Hallazgo de Inteligencia de Datos: Detección del Valle de Caja en el Mes 6
> El modelamiento dinámico mensual reveló que en el **Mes 6** del Año 1 la caja libre desciende a un nivel crítico de **$81.434 CLP** al coincidir la compra por anticipado del segundo lote de 60 unidades con ventas semestrales aún en rampa de inicio.  
> **Medida Correctiva Basada en Datos:** Se estructuró la compra del lote 2 en dos pedidos semestrales fraccionados de 30 unidades (Meses 6 y 8), elevando el piso de caja mínimo seguro a **$1.573.325 CLP** con costo financiero cero.

---

### 2.4. Investigación de Mercado y Validación Comercial

#### 2.4.1. Descripción y Características del Producto / Servicio

TerraSense no se define como un termómetro digital, sino como una **plataforma prescriptiva de toma de decisiones agronómicas**:
* **Lectura Integral en 5 Segundos:** Registra 7 variables de suelo y 2 de aire en un solo acto mecánico de inserción.
* **Traducción a Lenguaje de Acción:** El agricultor no recibe números complejos; recibe un semáforo de estado (*Óptimo, Precaución, Crítico*) y una receta explícita: *«Aplicar 45 kg/ha de Sulfato de Calcio para neutralizar salinidad. Costo estimado: $22.500 CLP/ha»*.
* **Veto Cruzado por Salinidad:** Algoritmo defensivo propietario que anula lecturas falseadas de NPK si la conductividad eléctrica supera $3,0\text{ mS/cm}$, protegiendo al productor de aplicaciones erróneas de fertilizante.

---

#### 2.4.2. Segmentación y Dimensionamiento Basado en Datos Censales (TAM / SAM / SOM)

Construido exclusivamente sobre la fuente estadística oficial del **VIII Censo Nacional Agropecuario y Forestal 2021 (INE/ODEPA)**:

```text
                     EMBUDO DE MERCADO TERRASENSE (CHILE)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🌍 TAM · Mercado Total Teórico                                               │
│    175.556 explotaciones agropecuarias (138.628 UPA + 36.928 UAC)            │
│    Valoración económica total: $26.554 millones CLP (~US$29 M)               │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │  Filtro 1: Exclusión autoconsumo (UAC)
                                     │  Filtro 2: Cobertura internet móvil (94,5% rural)
                                     │  Filtro 3: Orientación comercial (0,5 a 20 ha)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🎯 SAM · Mercado Servible Disponible                                         │
│    ~120.000 Explotaciones Comerciales con smartphone y cultivos de valor     │
│    Valoración servible: $18.150 millones CLP (~US$19,8 M)                    │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │  Filtro 4: Capacidad de captura comercial real
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🚀 SOM · Meta de Captura Operativa (5 Años)                                  │
│    Año 1 → 0,10 % del SAM =  120 unidades ($18,15 M CLP)                     │
│    Año 2 → 0,20 % del SAM =  240 unidades ($37,03 M CLP)                     │
│    Año 3 → 0,35 % del SAM =  420 unidades ($66,09 M CLP)                     │
│    Año 4 → 0,50 % del SAM =  600 unidades ($96,31 M CLP)                     │
│    Año 5 → 0,70 % del SAM =  840 unidades ($137,52 M CLP)                   │
│    Total acumulado a 5 años: 2.220 unidades (1,85 % del SAM total)           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.4.3. Mapa de Empatía y Necesidades No Satisfechas del Cliente

```text
┌───────────────────────────────────────────┬───────────────────────────────────────────┐
│ FRUSTRACIONES Y DOLORES (PAINS)           │ ALEGRÍAS Y GANANCIAS ESPERADAS (GAINS)    │
├───────────────────────────────────────────┼───────────────────────────────────────────┤
│ • Demoras de 1 mes en saber estado suelo. │ • Diagnóstico inmediato antes de regar.   │
│ • Incertidumbre al dosificar fertilizante.│ • Dosis exacta en sacos o kg/ha.          │
│ • Instrumentos que se rompen con el barro.│ • Sonda robusta que soporte caídas (IP67).│
│ • Cobros mensuales en dólares por software│ • Pago único sin suscripciones obligadas. │
└───────────────────────────────────────────┴───────────────────────────────────────────┘
```

---

#### 2.4.4. Benchmark Cuantitativo de la Competencia

| Parámetro Comparativo | Hanna HI9814 | Bluelab Pulse | FieldScout TDR 350 | Lab. Químico | **TerraSense IoT** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Precio de Venta (CLP)** | $269.010 | $310.185 | $1.367.925 | $35.000 / muestra | **$179.990** |
| **Posicionamiento de Precio** | +49 % más caro | +72 % más caro | +660 % más caro | Recurrente | **Líder en Costo** |
| **Parámetros Medidos** | 4 (pH, EC, T°, TDS) | 3 (Hum., EC, T°) | 1 (Humedad) | 12+ (Analítico) | **9 (Suelo + Aire)** |
| **Medición de NPK** | ❌ No | ❌ No | ❌ No | ✅ Sí | **✅ Sí (Reactivo)** |
| **Tiempo de Respuesta** | Inmediato | < 10 segundos | Inmediato | 15 a 30 días | **≤ 5 segundos** |
| **Preparación de Muestra** | Suspensión/lodo | Directa | Directa | Secado y tamizado | **Directa in situ** |
| **Motor Prescriptivo** | ❌ No | ❌ No | ❌ No | Parcial (tablas) | **✅ Cuantitativo** |
| **Georreferenciación GIS** | ❌ No | ✅ En app | ✅ Opcional | ❌ No | **✅ Integrada IDW** |
| **Alimentación Eléctrica** | 3 pilas AAA | 1 pila AA | 4 pilas AA | N/A | **Recargable USB-C** |

---

#### 2.4.5. Oportunidades y Estrategia Multicanal (B2C, B2G, B2B, Asociativo)

1. **Canal 1 — B2C Directo (Año 1):** Venta directa a través de plataforma web y demostraciones en terreno para construir los primeros **120 casos de éxito documentados** con testimonios de agricultores reales.
2. **Canal 2 — B2G / Institucional (Años 2 a 5):** Articulación con asesores técnicos de **PRODESAL e INDAP**. El agricultor financia su equipo mediante el Programa de Desarrollo de Inversiones (PDI), donde el Estado subsidia hasta el 90 % del costo.
3. **Canal 3 — B2B Distribuidores Agrícolas (Años 3 a 5):** Alianzas estratégicas con cadenas de insumos y ferreterías agrícolas (Coagra, Copeval, Anasac) asignando un margen de canal del 15–20 %.
4. **Canal 4 — Cooperativas y Asociaciones Gremiales (Años 4 y 5):** Convenios asociativos para cooperativas vitivinícolas y hortícolas con descuentos por volumen del 10 %.

---

### 2.5. Argumentación Estratégica y Defensa ante Objeciones (Q&A con Evidencia)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    DEFENSA ESTRATÉGICA Y RESPUESTAS BASADAS EN EVIDENCIA                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q1: ¿Por qué proyectar solo 120 unidades el primer año y no 1.000?                      │
│ R1: 120 unidades representan el 0,10 % del SAM (~10 unidades al mes). Una meta mayor   │
│     sin red de distribución consolidada carece de credibilidad técnica y financiera.    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q2: ¿Cómo compite con la exactitud de un laboratorio químico?                           │
│ R2: No son sustitutos, son complementarios. El laboratorio entrega el perfil anual;    │
│     TerraSense entrega el monitoreo diario in situ a costo marginal cero.               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q3: ¿Qué ocurre ante una devaluación del peso chileno (dólar a $1.100)?                 │
│ R3: El análisis de sensibilidad muestra que el costo variable tolera un +13% de alza;  │
│     además, el escenario recomendado contempla migrar el PVP a $199.990 para blindaje. │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q4: ¿Por qué no cobrar una suscripción mensual recurrente (SaaS)?                       │
│ R4: El agricultor tradicional rechaza los costos fijos recurrentes en dólares. El cobro │
│     único elimina la fricción de adopción inicial y facilita el subsidio estatal 100%.  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Conclusiones Ejecutivas de la Presentación

1. **Alineación con la Economía Social de Mercado:** TerraSense aprovecha de manera óptima las oportunidades de fomento productivo del Estado de Chile (INDAP/FIA) para superar la barrera de adopción tecnológica en la agricultura familiar campesina.
2. **Viabilidad Financiera Incuestionable:** Con un **VAN de $7.019.065 CLP**, una **TIR de 34,6 %**, un período de recuperación de **3,14 años** y un punto de equilibrio de solo **56 unidades**, el proyecto crea valor económico sostenible desde el primer año de operación.
3. **Propuesta de Valor Asimétrica:** Frente a sondas extranjeras costosas que solo entregan números crudos, TerraSense ofrece 9 parámetros simultáneos, prescripciones agronómicas automáticas y mapas GIS sin costos de suscripción ni dependencia de internet.
4. **Resiliencia Operativa y Escalabilidad:** El modelo productivo basado en manufactura aditiva y componentes estándar de alta disponibilidad garantiza la atención de la demanda proyectada sin generar cuellos de botella mecánicos ni sobreinversiones en CAPEX.
