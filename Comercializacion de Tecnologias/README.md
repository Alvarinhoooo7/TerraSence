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
     - [2.4.5. Oportunidades y Estrategia Multicanal (B2C, B2B, Distribución Directa)](#245-oportunidades-y-estrategia-multicanal-b2c-b2b-distribución-directa)
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

El modelo de negocio de TerraSense se enmarca en una **Economía de Mercado**, donde las decisiones de producción, precio y distribución son tomadas por agentes privados —empresa y clientes— sin intervención ni dependencia del Estado. La asignación de recursos está guiada por el mecanismo de precios y la libre competencia:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│              ENMARQUE EN EL SISTEMA ECONÓMICO DE MERCADO — TERRASENSE                   │
├───────────────────────────┬─────────────────────────────────────────────────────────────┤
│ PILAR ECONÓMICO           │ APLICACIÓN DIRECTA EN TERRASENSE                            │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. Economía de Mercado    │ El precio ($179.990 CLP) es fijado por el libre juego de   │
│    (Libre Empresa)        │ oferta y demanda. No requiere subsidio ni licitación        │
│                           │ estatal. El cliente decide libremente basado en valor.      │
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

**Principios orientadores del modelo:**
- **Soberanía del Consumidor:** Es el agricultor —no un organismo estatal— quien determina si TerraSense crea suficiente valor para justificar su compra.
- **Competencia por Mérito:** TerraSense gana clientes demostrando un ROI superior al de cualquier alternativa, no por estar en una lista de productos subsidiados.
- **Financiamiento Privado:** El capital de arranque proviene del sistema bancario comercial, preservando la autonomía estratégica y la agilidad operativa del emprendimiento.

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

**Estructura de Financiamiento — Préstamo Bancario Comercial:**

El proyecto se financia íntegramente mediante un **crédito bancario privado**, aprovechando el bajo monto de inversión requerido ($14.022.415 CLP ≈ $15.000 USD), que lo sitúa en el tramo de microcrédito comercial con alta probabilidad de aprobación:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      ESTRUCTURA DE FINANCIAMIENTO BANCARIO PRIVADO                      │
├──────────────────────────────┬──────────────────────────────────────────────────────────┤
│ ENTIDAD / INSTRUMENTO        │ CONDICIONES Y JUSTIFICACIÓN                              │
├──────────────────────────────┼──────────────────────────────────────────────────────────┤
│ Crédito Comercial Pyme       │ Monto: $14.022.415 CLP | Plazo: 5 años                  │
│ (BancoEstado / Santander /   │ Tasa: 12–15 % anual (tasa comercial de mercado Pyme)    │
│  BCI Emprendimiento)         │ Cuota mensual aprox.: $315.000 CLP/mes                  │
├──────────────────────────────┼──────────────────────────────────────────────────────────┤
│ Justificación de Elegibilidad│ • BOM bajo: equipo de $64.000–$69.000 CLP/unidad        │
│                              │ • Sin activos de alto CAPEX: no se requiere maquinaria  │
│                              │   pesada ni bodegas. Manufactura aditiva + SMT.         │
│                              │ • Flujo de caja positivo desde el mes 12 del Año 1.     │
│                              │ • Sin garantías reales: califica a garantía FOGAPE      │
│                              │   (Fondo de Garantía para Pequeños Empresarios) del     │
│                              │   sistema financiero privado.                            │
├──────────────────────────────┼──────────────────────────────────────────────────────────┤
│ Autonomía Estratégica        │ Al no depender de aportes estatales ni fondos concursales│
│                              │ el emprendimiento puede ejecutar sin tiempos de espera, │
│                              │ sin restricciones de uso y sin rendir cuentas a terceros.│
└──────────────────────────────┴──────────────────────────────────────────────────────────┘
```

$$\textbf{Inversión Inicial } (I_0) = \underbrace{\$9.892.415}_{\text{Capital de Trabajo y Activo Nominal}} + \underbrace{\$4.130.000}_{\text{Activo Fijo (Maquinaria y Taller)}} = \mathbf{\$14.022.415\ \text{CLP}}$$

$$\textbf{Financiado 100\% con Crédito Bancario Privado} \Rightarrow \text{Tasa efectiva anual: } 13{,}5\%\ |\ \text{Plazo: 5 años}$$

##### Estado de Resultados y Flujo de Fondos Proyectado:

| Concepto Financiero | Año 0 | Año 1 (120 u) | Año 2 (240 u) | Año 3 (420 u) | Año 4 (600 u) | Año 5 (840 u) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **(+) Ingresos Netos de Explotación** | $0 | $18.150.240 | $37.026.490 | $66.092.284 | $96.305.899 | $137.524.824 |
| (−) Costos Variables de Fabricación | $0 | ($8.588.280) | ($16.821.521) | ($29.077.296) | ($41.623.083) | ($58.421.685) |
| (−) Gastos de Administración y Fijos | $0 | ($2.641.580) | ($8.604.930) | ($23.012.821) | ($30.913.316) | ($39.379.405) |
| (−) Gastos de Comercialización (CAC) | $0 | ($1.800.000) | ($4.066.920) | ($6.644.793) | ($9.748.860) | ($14.016.911) |
| (−) Depreciación del Activo Fijo | $0 | ($683.095) | ($683.095) | ($683.095) | ($683.095) | ($683.095) |
| (−) **Intereses Crédito Bancario (13,5% anual)** | $0 | ($1.892.026) | ($1.569.821) | ($1.217.630) | ($830.441) | ($403.124) |
| **(=) Utilidad Antes de Impuestos** | $0 | **$2.545.259** | **$5.280.203** | **$5.456.649** | **$12.506.104** | **$24.620.604** |
| (−) Impuesto de Primera Categoría (25%)| $0 | ($636.315) | ($1.320.051) | ($1.364.162) | ($3.126.526) | ($6.155.151) |
| **(=) Utilidad Neta del Ejercicio** | $0 | **$1.908.944** | **$3.960.152** | **$4.092.487** | **$9.379.578** | **$18.465.453** |
| (+) Ajuste por Depreciación | $0 | $683.095 | $683.095 | $683.095 | $683.095 | $683.095 |
| (−) Amortización Capital Crédito Bancario | $0 | ($2.386.210) | ($2.386.210) | ($2.386.210) | ($2.386.210) | ($2.386.210) |
| **(=) FLUJO DE FONDOS NETO** | **($14.022.415)** | **$205.829** | **$2.257.037** | **$2.389.372** | **$7.676.463** | **$16.762.338** |
| **Flujo de Fondos Acumulado** | **($14.022.415)** | **($13.816.586)** | **($11.559.549)** | **($9.170.177)** | **($1.493.714)** | **+$15.268.624** |

> [!NOTE]
> **Nota sobre el Financiamiento:** Los intereses del crédito bancario se calcularon sobre saldo insoluto a tasa anual del 13,5% (tasa de mercado vigente para créditos Pyme en Chile, según referencia BCCh). La cuota anual de capital es de $2.386.210 CLP ($198.851 CLP/mes), monto ampliamente cubierto por el flujo operativo desde el primer año.

##### Indicadores Clave de Decisión:

$$VAN(20\%) = \sum_{t=1}^{5} \frac{FF_t}{(1+0{,}20)^t} - I_0 = \$18.156.204 - \$14.022.415 = \mathbf{+\$4.133.789\ \text{CLP}}$$

$$TIR = \mathbf{28{,}4\ \%} \quad (\text{Supera holgadamente el 20 \% exigido})$$

$$\text{Pay Back Simple} = \mathbf{4{,}09\ \text{años}} \quad (\text{Payback Descontado} = 4{,}85\ \text{años})$$

$$\text{Punto de Equilibrio Año 1} = \frac{\text{Gastos Fijos + Intereses Bancarios}}{\text{Precio Neto} - \text{Costo Var.}} = \frac{\$6.469.701}{\$151.252 - \$69.069} = \mathbf{78{,}7 \approx 79\ \text{unidades}}$$

> [!TIP]
> **Ventaja del Préstamo sobre Capital Propio:** Financiar con deuda bancaria permite a los emprendedores **no inmovilizar capital personal** y mantener liquidez para el ciclo operativo. Dado el bajo monto ($14 M CLP) y el flujo de caja positivo desde el año 1, el servicio de la deuda no compromete la viabilidad del negocio.

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
      │                         /\     \  ← D' (Desplazamiento por urgencia y ROI demostrado)
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
│ FACTOR 1: Cambio Climático y Estrés Salino (D1) │ FACTOR 2: ROI Inmediato y Demostrable │
│                                                 │ para el Cliente (D2)                  │
├─────────────────────────────────────────────────┼───────────────────────────────────────┤
│ • Aumento de la escasez hídrica y salinidad.    │ • Un predio de 3 ha ahorra $700.000+  │
│ • La necesidad de diagnóstico se vuelve crítica.│   en fertilizantes en la 1ª temporada.│
│ • EFECTO: Desplazamiento D -> D' a la DERECHA.  │ • ROI positivo en < 8 meses de uso.   │
│                                                 │ • EFECTO: Gran expansión de cantidad. │
└─────────────────────────────────────────────────┴───────────────────────────────────────┘
```

1. **Variación en Preferencias y Urgencia Ambiental (Factor D1):**  
   * **Causa:** La prolongada sequía y el uso forzado de aguas de pozo salinas aumentan el riesgo de pérdida total de cosechas.
   * **Impacto:** Los agricultores incrementan su disposición a pagar por herramientas de medición in situ, desplazando la curva de demanda hacia la derecha ($D \to D'$), aumentando la cantidad demandada a cualquier nivel de precio.

2. **Variación en el Retorno sobre la Inversión Demostrable (Factor D2):**  
   * **Causa:** El precio de lista de $179.990 CLP representa menos del 2,5 % del presupuesto anual de insumos de un predio de 3 hectáreas con cultivos de valor. El agricultor puede verificar en terreno, en su primera temporada, que la optimización de fertilizantes y riego supera el costo del equipo.
   * **Impacto:** El cliente toma la decisión de compra de manera autónoma, basado exclusivamente en el valor económico percibido, sin necesidad de intermediación estatal. Esto desplaza la curva de demanda hacia la derecha ($D \to D'$) y elimina la dependencia de licitaciones, tiempos de espera o criterios burocráticos de elegibilidad.
   * **Ahorro cuantificado por cliente en 1 temporada:**
     - Reducción de fertilizante por prescripción exacta: **$280.000 – $420.000 CLP / temporada**
     - Reducción de agua de riego por monitoreo de VWC: **$180.000 – $300.000 CLP / temporada**
     - **ROI 1ª Temporada: 253 % – 400 %** sobre el precio de compra del equipo.

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
| **Precio de Venta Público (PVP con IVA)** | $179.990 CLP | $< \$250.000$ | Altamente competitivo sin necesidad de subsidio |
| **Precio Neto de Venta (PVN)** | $151.252 CLP | — | Ingreso real neto de impuestos |
| **Margen de Contribución Unitario** | **$82.183 CLP** | $> 50\%$ | **54,3 % sobre el ingreso neto** (excelente cobertura) |
| **Costo de Adquisición de Clientes (CAC)** | **$15.000 CLP** | $< 25\%$ Margen | **18,3 % del margen unitario** (venta directa y demostraciones) |
| **Ratio LTV / CAC** | **10,1x** | $> 3,0\text{x}$ | Extraordinaria eficiencia comercial: el cliente se paga solo |
| **ROI del Cliente en 1ª Temporada** | **253 % – 400 %** | $> 100\%$ | El agricultor recupera la inversión en su primera cosecha |
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
  Cuota Bancaria      [████████████████████░░]  Servicio de deuda cubierto desde mes 12
```

> [!WARNING]
> ### 🚨 Hallazgo de Inteligencia de Datos: Detección del Valle de Caja en el Mes 6
> El modelamiento dinámico mensual reveló que en el **Mes 6** del Año 1 la caja libre desciende a un nivel crítico al coincidir la compra por anticipado del segundo lote de 60 unidades con ventas semestrales aún en rampa de inicio.  
> **Medida Correctiva Basada en Datos:** Se estructura la compra del lote 2 en dos pedidos fraccionados de 30 unidades (Meses 6 y 8), elevando el piso de caja mínimo seguro. La cuota bancaria mensual ($198.851 CLP) está cubierta con holgura desde el primer mes de ventas.

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
│ • Trámites y burocracia de programas      │ • Compra directa: llega hoy, funciona hoy.│
│   estatales que tardan meses en aprobarse.│ • Sin formularios, sin requisitos, sin    │
│ • Depender del calendario de INDAP para   │   esperar aprobación de ningún organismo. │
│   tomar decisiones agronómicas urgentes.  │ • Recupera la inversión en 1 temporada.   │
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

#### 2.4.5. Oportunidades y Estrategia Multicanal (B2C, B2B, Distribución Directa)

1. **Canal 1 — B2C Directo (Año 1):** Venta directa a través de plataforma web, demostraciones en terreno y ferias agrícolas para construir los primeros **120 casos de éxito documentados** con testimonios y métricas de ROI de agricultores reales. Sin intermediarios: mayor margen y control total del mensaje.
2. **Canal 2 — B2B con Agronomía Privada (Años 2 a 3):** Alianzas con consultoras agronómicas privadas, empresas de asesoría técnica independiente y agronomistas freelance. Estos profesionales recomiendan TerraSense a sus carteras de clientes como herramienta de diagnóstico complementaria. El agricultor compra directamente, sin esperar ningún proceso estatal.
3. **Canal 3 — B2B Distribuidores Agrícolas (Años 3 a 5):** Alianzas estratégicas con cadenas de insumos y ferreterías agrícolas (Coagra, Copeval, Anasac) asignando un margen de canal del 15–20 %. Distribución nacional sin oficinas propias.
4. **Canal 4 — Cooperativas y Asociaciones Gremiales Privadas (Años 4 y 5):** Convenios con cooperativas vitivinícolas, hortícolas y frutícolas de base privada, con descuentos por volumen del 10 %. Modelo de compra colectiva entre socios sin requerir intermediación de ningún organismo público.

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
│ Q4: ¿Por qué financiar con préstamo y no con aportes propios o fondos estatales?        │
│ R4: El monto ($14 M CLP) es accesible para un microcrédito Pyme en el mercado          │
│     financiero privado. Financiar con deuda bancaria permite mantener capital de        │
│     trabajo libre, no atarse a restricciones de uso de fondos concursables y operar    │
│     con autonomía total desde el primer día, sin rendir cuentas a terceros.             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Q5: ¿Por qué no cobrar una suscripción mensual recurrente (SaaS)?                       │
│ R5: El agricultor tradicional rechaza los costos fijos recurrentes en dólares. El cobro│
│     único elimina la fricción de adopción inicial. El LTV se construye por recompra     │
│     (equipos adicionales) y expansión de red (referidos entre vecinos de predio).       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Conclusiones Ejecutivas de la Presentación

1. **Liderazgo en Libre Mercado sin Dependencia del Estado:** TerraSense compite y gana en el mercado privado por mérito propio. Su precio de $179.990 CLP es sostenible sin subsidios, licitaciones ni programas estatales. El agricultor elige TerraSense porque el ROI de la primera temporada supera el 250 %, no porque el Estado lo financie.
2. **Viabilidad Financiera con Capital Bancario Privado:** Con un **VAN de $4.133.789 CLP**, una **TIR de 28,4 %** y el servicio de deuda bancaria cubierto desde el mes 12 de operación, el proyecto demuestra que un emprendimiento tecnológico de bajo costo puede autofinanciarse con crédito comercial sin comprometer la autonomía estratégica.
3. **Propuesta de Valor Centrada en el Cliente:** Frente a sondas extranjeras costosas que solo entregan números crudos, TerraSense ofrece 9 parámetros simultáneos, prescripciones agronómicas automáticas y mapas GIS sin costos de suscripción ni dependencia de internet. El cliente es el único árbitro que determina si el producto vale lo que cuesta.
4. **Resiliencia Operativa y Escalabilidad por Mérito Comercial:** El modelo productivo basado en manufactura aditiva, distribución directa y alianzas con el sector privado agrícola garantiza escalabilidad real sin generar dependencia de ciclos presupuestarios, programas anuales o voluntad política de terceros.
