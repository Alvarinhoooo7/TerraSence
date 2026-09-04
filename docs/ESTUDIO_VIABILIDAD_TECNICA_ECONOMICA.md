# 📈 Estudio de Viabilidad Técnica y Económica de las Alternativas vs. TerraSense

> **Proyecto:** TerraSense — Tu Ingeniero Agrónomo en el Bolsillo  
> **Área:** Evaluación de Proyectos, Benchmarking Técnico-Financiero y Metrología Agrícola  
> **Institución:** Ingeniería en Electrónica y Sistemas Inteligentes — INACAP  

---

## 📑 Tabla de Contenidos

1. [Objetivo y Alcance del Estudio](#1-objetivo-y-alcance-del-estudio)
2. [Evaluación de Viabilidad Técnica Multidimensional](#2-evaluación-de-viabilidad-técnica-multidimensional)
   - [2.1. Desempeño Metrológico, Resolución y Repetibilidad](#21-desempeño-metrológico-resolución-y-repetibilidad)
   - [2.2. Robustez Mecánica y Resistencia a Condiciones Extremas de Campo (IP67)](#22-robustez-mecánica-y-resistencia-a-condiciones-extremas-de-campo-ip67)
   - [2.3. Disponibilidad Operativa, Tiempo de Respuesta e Inferencia Offline](#23-disponibilidad-operativa-tiempo-de-respuesta-e-inferencia-offline)
   - [2.4. Matriz de Ponderación de Viabilidad Técnica (Puntaje 1 a 10)](#24-matriz-de-ponderación-de-viabilidad-técnica-puntaje-1-a-10)
3. [Evaluación de Viabilidad Económica y Costo Total de Propiedad (TCO)](#3-evaluación-de-viabilidad-económica-y-costo-total-de-propiedad-tco)
   - [3.1. Estructura de Costos de Adquisición (CAPEX) y Operación (OPEX)](#31-estructura-de-costos-de-adquisición-capex-y-operación-opex)
   - [3.2. Curva de Costo Marginal por Medición ($1, 10, 50, 200\text{ Muestras}$)](#32-curva-de-costo-marginal-por-medición-1-10-50-200text-muestras)
   - [3.3. Proyección de Costo Total de Propiedad (TCO a 1, 3 y 5 Años)](#33-proyección-de-costo-total-de-propiedad-tco-a-1-3-y-5-años)
   - [3.4. Análisis de Sensibilidad y Mitigación de Pérdidas Productivas](#34-análisis-de-sensibilidad-y-mitigación-de-pérdidas-productivas)
4. [Estructura de Financiamiento, Estrategia Comercial Go-To-Market y Evaluación de Rentabilidad](#4-estructura-de-financiamiento-estrategia-comercial-go-to-market-y-evaluación-de-rentabilidad)
   - [4.1. Estructura de Financiamiento: Capital Propio y Deuda Bancaria ($0 Subsidio Estatal)](#41-estructura-de-financiamiento-capital-propio-y-deuda-bancaria-0-subsidio-estatal)
   - [4.2. Estrategia Comercial Año 1: E-commerce Shopify, Pauta Digital Autogestionada y Cierre en WhatsApp](#42-estrategia-comercial-año-1-e-commerce-shopify-pauta-digital-autogestionada-y-cierre-en-whatsapp)
   - [4.3. Escalamiento Comercial Año 2 en Adelante: Agencia de Marketing Externa](#43-escalamiento-comercial-año-2-en-adelante-agencia-de-marketing-externa)
   - [4.4. Indicadores de Evaluación Económica y Flujo de Fondos a 5 Años](#44-indicadores-de-evaluación-económica-y-flujo-de-fondos-a-5-años)
5. [Veredicto y Conclusiones del Estudio de Viabilidad](#5-veredicto-y-conclusiones-del-estudio-de-viabilidad)

---

## 1. Objetivo y Alcance del Estudio

El presente estudio tiene por objeto evaluar de forma cuantitativa y rigurosa la **viabilidad técnica** y la **viabilidad económica** de las principales alternativas de instrumentación, monitoreo y asesoría disponibles en el mercado chileno y latinoamericano frente a la solución **TerraSense IoT**, determinando la relación costo-beneficio para explotaciones de la **Agricultura Familiar Campesina (AFC)** y medianos agricultores (predios de 0.5 a 10 hectáreas).

---

## 2. Evaluación de Viabilidad Técnica Multidimensional

### 2.1. Desempeño Metrológico, Resolución y Repetibilidad

| Parámetro / Solución | Sonda Genérica LCD | Bluelab Pulse / Hanna | Lab. Químico Acreditado | Asesor Privado | **TerraSense IoT** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Humedad del Suelo (VWC)** | $\pm 5\%$ (No calibrada) | $\pm 3\%$ (Capacitiva) | $\pm 0.5\%$ (Gravimétrico) | Cualitativa | **$\pm 2\%$ (FDR Calibrada)** |
| **Conductividad (EC)** | $\pm 8\%$ | $\pm 2\%$ (Compensada T°) | $\pm 1\%$ (Extracto saturado)| No mide | **$\pm 3\%$ (Compensada T°)** |
| **pH del Suelo** | $\pm 0.5\text{ pH}$ | $\pm 0.1\text{ pH}$ (Slurry) | $\pm 0.02\text{ pH}$ (Potenciom.)| No mide | **$\pm 0.1\text{ pH}$ (Estado Sólido)** |
| **Nitrógeno, Fósforo y Potasio**| ❌ No mide | ❌ No mide | $\pm 1\%\text{ ppm}$ (ICP-OES) | Visual (Deficiencia) | **$\pm 5\%\text{ mg/kg}$ (Reactividad CA)**|
| **Variables Ambientales (Aire)**| ❌ No mide | ❌ No mide | ❌ No mide | Termómetro de mano | **$\pm 0.5^\circ\text{C} / \pm 3\%\text{ HR}$ (BME280)**|

* **Conclusión Metrológica:** Aunque el laboratorio tradicional ofrece la máxima exactitud analítica de referencia, **TerraSense entrega una precisión operativa de $\ge 95\%$ en campo**, holgadamente suficiente para la toma de decisiones agronómicas diarias de siembra, riego y fertilización.

---

### 2.2. Robustez Mecánica y Resistencia a Condiciones Extremas de Campo (IP67)

```text
EVALUACIÓN DE ROBUSTEZ Y VULNERABILIDAD MECÁNICA EN CAMPO:
┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
│ SOLUCIÓN EVALUADA         │ COMPONENTE VULNERABLE     │ RIESGO EN TERRENO REAL    │
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ 1. Sonda Asiática LCD     │ Pantalla LCD y Plástico   │ Quebradura por caída en   │
│                           │ sin sellado (IP40).       │ piedras o lluvia directa. │
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ 2. Hanna HI9814 / Bluelab │ Bulbo de vidrio y unión   │ Rotura de electrodo al    │
│                           │ líquida de referencia.    │ pinchar suelo pedregoso.  │
├───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ 3. TerraSense IoT         │ Sólido: Agujas de Acero   │ Alta resistencia al barro,│
│                           │ Inox 316L + Gabinete IP67 │ agua y caídas de 1.5 m.   │
└───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

* **Cuerpo de Acero Inoxidable 316L:** Las varillas de sensado resisten suelos compactados, pedregosos y salinos sin fractura mecánica ni corrosión galvánica.
* **Hermeticidad IP67:** Gabinete de ABS/PETG reforzado con sellos de elastómero y prensaestopas M12 para garantizar estanqueidad total.

---

### 2.3. Disponibilidad Operativa, Tiempo de Respuesta e Inferencia Offline

* **Operación Sin Cobertura (Offline-First):** TerraSense ejecuta su motor agronómico determinista directamente en el teléfono móvil del agricultor (Zustand + SQLite local), garantizando **100% de disponibilidad en quebradas o valles cordilleranos sin señal 4G**.
* **Latencia de Veredicto:** $\le 5\text{ segundos}$ frente a los **15 a 30 días** de espera del laboratorio químico tradicional.

---

### 2.4. Matriz de Ponderación de Viabilidad Técnica (Puntaje 1 a 10)

| Dimensión Técnica (Ponderación) | Sonda LCD (15%) | Hanna/Bluelab (20%) | Laboratorio (25%) | Asesor (15%) | **TerraSense (25%)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Exactitud y Metrología (25%) | 4.0 | 7.5 | **10.0** | 5.0 | **8.5** |
| Velocidad de Veredicto (25%) | 7.0 | 6.0 | 1.0 | 3.0 | **10.0** |
| Robustez de Campo IP67 (20%) | 3.5 | 5.0 | N/A | N/A | **9.5** |
| Capacidad Prescriptiva Local (15%)| 1.0 | 1.0 | 6.0 | 8.5 | **9.5** |
| Georreferenciación en Siembra (15%)| 1.0 | 2.0 | 1.0 | 2.0 | **9.5** |
| **PUNTAJE TÉCNICO PONDERADO (10.0)** | **3.50** | **4.75** | **4.05** | **3.85** | **🏆 9.35** |

---

## 3. Evaluación de Viabilidad Económica y Costo Total de Propiedad (TCO)

### 3.1. Estructura de Costos de Adquisición (CAPEX) y Operación (OPEX)

$$\begin{aligned}
\text{CAPEX (TerraSense):} & \quad \mathbf{\$249.990\text{ CLP}}\quad(\text{Precio con IVA, \$210.076 CLP neto, pago único de por vida}) \\
\text{OPEX (TerraSense):} & \quad \mathbf{\$0\text{ CLP/año}}\quad(\text{Sin suscripciones recurrentes, software local offline, recarga USB-C}) \\
\text{Costo Marginal:} & \quad \mathbf{\$0\text{ CLP por cada medición adicional}}
\end{aligned}$$

---

### 3.2. Curva de Costo Marginal por Medición ($1, 10, 50, 200\text{ Muestras}$)

```text
COSTO TOTAL ACUMULADO SEGÚN EL NÚMERO DE MUESTREOS EN EL AÑO:
(CLP)
$2.500.000 │                                                   / Laboratorio Tradicional
$2.000.000 │                                                 / ($50.000 CLP / muestra)
$1.500.000 │                                               /
$1.000.000 │                                             / 
  $500.000 │                          /─────────────────  Bluelab Combo ($500.000 CLP)
  $249.990 │ ═══════════════════════════════════════════  TerraSense IoT ($249.990 ÚNICO)
        $0 └───────┬───────────────┬───────────────┬───────────────► N° Muestras
                  10              50             100             200
```

| Volumen de Muestreos Anuales | Costo Laboratorio ($50K/u) | Costo Asesor ($120K/visita) | Costo Bluelab + pH | **Costo TerraSense IoT** |
| :--- | :---: | :---: | :---: | :---: |
| **1 Medición** | $50.000 CLP | $120.000 CLP | $500.000 CLP | **$249.990 CLP** |
| **5 Mediciones** | $250.000 CLP | $600.000 CLP | $500.000 CLP | **$249.990 CLP** |
| **10 Mediciones (Mapeo Predio)** | $500.000 CLP | $1.200.000 CLP | $500.000 CLP | **$249.990 CLP** |
| **50 Mediciones (Monitoreo Riego)**| $2.500.000 CLP | $6.000.000 CLP | $500.000 CLP | **$249.990 CLP** |
| **200 Mediciones (Temporada)** | $10.000.000 CLP | Inviable | $500.000 CLP | **$249.990 CLP** |

---

### 3.3. Proyección de Costo Total de Propiedad (TCO a 1, 3 y 5 Años)

Para un predio representativo de 3 hectáreas con un régimen de monitoreo estándar (20 mediciones de suelo por temporada):

| Solución Tecnológica | TCO Año 1 | TCO Año 3 (Acumulado) | TCO Año 5 (Acumulado) |
| :--- | :---: | :---: | :---: |
| **Laboratorio Químico (20 muestras/año)**| $1.000.000 CLP | $3.000.000 CLP | $5.000.000 CLP |
| **Asesor Agronómico (6 visitas/año)** | $720.000 CLP | $2.160.000 CLP | $3.600.000 CLP |
| **Bluelab Pulse + Soil pH Pen** | $520.000 CLP | $640.000 CLP *(Sondas rep.)*| $780.000 CLP |
| **Spectrum TDR 350 + Suscripción** | $1.950.000 CLP | $2.550.000 CLP | $3.150.000 CLP |
| **TerraSense IoT (Kit Completo)** | **$249.990 CLP** | **$265.000 CLP** *(Buffers)* | **$285.000 CLP** *(Baterías)*|

> [!IMPORTANT]
> **Ahorro Financiero a 5 Años:** TerraSense representa un **ahorro de más del 94 %** frente al laboratorio químico y un **63 % de ahorro** frente a combos comerciales importados sin prescripción agronómica.

---

### 3.4. Análisis de Sensibilidad y Mitigación de Pérdidas Productivas

* **Caso Real en Hortalizas (Tomate / Maíz Dulce en 1 ha):**
  * Evitar 2 sacos de urea/potasio bloqueados por acidez: $\$100.000\text{ CLP}$.
  * Evitar resiembra de 0.5 ha por suelo frío ($< 10^\circ\text{C}$): $\$350.000\text{ CLP}$.
  * Ahorro de 15 horas de motobomba de riego por monitoreo de VWC: $\$45.000\text{ CLP}$.
  * **Beneficio directo generado en Temporada 1:** **$495.000 CLP**.
  * **Retorno sobre la Inversión (ROI):**
    $$\text{ROI} = \frac{\$495.000 - \$249.990}{\$249.990} \times 100 = \mathbf{+98,0\% \text{ en menos de 6 meses (1 temporada)}}$$

---

## 4. Estructura de Financiamiento, Estrategia Comercial Go-To-Market y Evaluación de Rentabilidad

### 4.1. Estructura de Financiamiento: Capital Propio y Deuda Bancaria ($0 Subsidio Estatal)

El proyecto se estructura bajo un principio de **autosuficiencia financiera absoluta**, sin depender de fondos concursables del Estado (CORFO, Sercotec, FIA = $0):

$$\textbf{Inversión Inicial Total: } \mathbf{\$26.548.500\text{ CLP}}$$

| Componente | Monto ($ CLP) | % del Total | Naturaleza Financiera |
| :--- | ---:|:---:| :--- |
| **Capital Propio (Pie de los 2 Socios)** | **$8.900.000** | **33,52 %** | **$4.450.000 CLP por socio**. Depósito líquido directo en la cuenta de la SpA. Es el respaldo de patrimonio que la banca exige ver para cursar financiamiento. |
| **Crédito Bancario de Largo Plazo** | **$12.648.500** | **47,64 %** | Crédito comercial a **5 años (60 meses)**, tasa **10 % anual**, amortización en sistema francés (cuota anual de $3.336.642 CLP = ~$278.000 CLP/mes). Respaldado con garantía FOGAPE y aval de los socios. |
| **Línea de Crédito de Corto Plazo** | **$5.000.000** | **18,83 %** | Línea de capital de trabajo a **1 año, 15 % anual**. Destinada a cubrir el desfase de caja del primer lote de importación de sensores y componentes. |
| **Financiamiento Estatal (CORFO / Subsidios)**| **$0** | **0,0 %** | Cero por decisión estratégica: el proyecto debe ser rentable por sus propios méritos desde el día 1. |
| **TOTAL FINANCIAMIENTO** | **$26.548.500** | **100,0 %** | Calce exacto con la inversión inicial clasificada. |

---

### 4.2. Estrategia Comercial Año 1: E-commerce Shopify, Pauta Digital Autogestionada y Cierre en WhatsApp

Para el primer año (meta de **200 unidades vendidas = 16 a 17 unidades mensuales**), la empresa no contrata agencias ni distribuidores intermediarios:

1. **Tienda E-commerce en Shopify como Ancla de Confianza:**
   * **Facturación Electrónica Oficial:** Conexión con facturador chileno para emisión automática de Factura con IVA. El productor o empresa agrícola descuenta el 19% de crédito fiscal y registra la sonda como gasto de la explotación.
   * **Pasarelas de Pago en Cuotas:** Integración con Transbank Webpay Plus y Mercado Pago, permitiendo a agrónomos y administradores pagar los $297.488 CLP (IVA incl.) en **3 ó 6 cuotas sin interés** (~$50.000 CLP/mes).
   * **Señales de Confianza (*Trust Signals*):** RUT visible, garantía técnica por escrito de 1 año, manuales descargables y convenios de despacho trazable con Bluexpress y Starken.
2. **Pauta Digital Directa en Meta Ads y Google Ads ($1.200.000 CLP/año):**
   * Presupuesto mensual de ~$100.000 CLP gestionado directamente por los fundadores.
   * **Meta Ads (Facebook / Instagram):** Videos grabados en terreno real mostrando la inserción de la lanza en el suelo pedregoso y el veredicto en la app en 5 segundos.
   * **Google Ads (Búsqueda):** Captura de demanda activa con palabras clave de alta intención (*"sensor ph suelo chile"*, *"medidor humedad suelo precio"*, *"analisis npk portatil"*).
3. **Embudo Conversacional (Click-to-WhatsApp):**
   * El agricultor chileno no compra tecnología de $250.000 CLP en un carrito frío: hace clic en el anuncio y va directo al WhatsApp de la empresa.
   * Los socios fundadores brindan asesoría técnica en vivo, resuelven dudas agronómicas específicas de su cultivo (ej. cerezos, paltos, viñas) y coordinan el pago y despacho.
4. **Público Objetivo Ultra-Conservador (0,17 % al 0,44 % del Mercado):**
   * No se gasta presupuesto en agricultores tradicionales de 70 años sin smartphone.
   * La pauta se dirige quirúrgicamente al **recambio generacional** (hijos de agricultores de 28 a 45 años que administran el campo), administradores de fundos tecnificados y agrónomos asesores independientes. Vender 200 unidades representa apenas el **0,11 % del TAM censal** (175.556 explotaciones) o el **0,17 % del SAM**.

---

### 4.3. Escalamiento Comercial Año 2 en Adelante: Agencia de Marketing Externa

A partir del segundo año, con el producto validado en terreno y flujo de caja operativo positivo, la empresa profesionaliza su tracción comercial:

* **Contratación de Agencia de Marketing Externa:**
  * Presupuesto de comercialización: **$7.080.000 CLP (Año 2)**, **$10.680.000 CLP (Año 3)**, **$12.000.000 CLP (Año 4)** y **$14.400.000 CLP (Año 5)**.
  * **Eficiencia frente a equipo interno:** Contratar un ingeniero de marketing full-time significaría un sueldo cargado de ~$12M a $14M anuales más el costo de pauta publicitaria aparte. La agencia externa por retainer mensual incluye diseño, optimización de campañas y pauta a escala de manera mucho más flexible.
* **Apertura de Canales Institucionales y Distribuidores:**
  * Año 2: Postulación de agricultores a fondos de cofinanciamiento INDAP (PDI cofinancia 60% a 90%).
  * Año 3: Convenios con distribuidores de insumos agrícolas y arriendo del primer taller formal.
  * Años 4 y 5: Compras colectivas con cooperativas agrícolas y venta multirregional (850 u/año).

---

### 4.4. Estructura de Dotación y Validación de Costos Contables en Chile (Mercado 2024-2026)

La estructura de personal y servicios profesionales de TerraSense responde estrictamente a la realidad operacional de una microempresa tecnológica en Chile:

#### 1. Validación de Mercado del Servicio Contable: Outsourcing vs. Nómina Indefinida
* **Inviabilidad de contratar un contador interno indefinido en el Año 1:**
  * **Sueldo Bruto de Mercado (Fuentes: Indeed Chile, Talent.com, Computrabajo, Guías Salariales Robert Half y Michael Page 2024-2025):** Un Contador General o Auditor recién egresado o junior en Chile percibe entre **$850.000 y $1.300.000 CLP brutos mensuales**; para profesionales con dominio de ERPs o tributaria supera los **$1.600.000 CLP**.
  * **Costo Real Empleador (Cargas Patronales y Gratificación Legal):** Considerando sueldo base de $900.000 CLP + gratificación legal (Art. 50 Código del Trabajo, 25% con tope de 4,75 IMM) + aportes patronales obligatorios (SIS 1,49%, AFC empleador 2,4%, Mutual de Seguridad 1,83%), el costo empresa asciende a **$1.150.000 a $1.350.000 CLP mensuales** (**$13.800.000 a $16.200.000 CLP anuales**).
  * **Diagnóstico Operacional:** En el Año 1 la empresa emite apenas 16-17 facturas de venta al mes, registra ~8 facturas de compras y liquida 2 sueldos de socios (carga real: 3 a 4 horas de trabajo al mes). Pagar $15M/año representaría el **36% de las ventas netas totales del Año 1 ($42M)**, quebrando la empresa de inmediato.
* **Modelo Adoptado: Outsourcing Contable Especializado para PYMEs:**
  * **Tarifas Reales de Mercado (Fuentes: Contabilizate.cl, TuContador.cl, ChileContador.cl, DeNegocios.cl, Contable.app):** Los planes mensuales de abono contable para microempresas bajo Régimen Pro Pyme (Art. 14 D3 y 14 D8) con hasta 50 documentos mensuales oscilan entre **1,5 UF y 2,5 UF/mes** ($57.000 a $95.000 CLP mensuales).
  * **Asignación en el Modelo de TerraSense (`GASTOS FIJOS 5 AÑOS`, Fila 12):**
    * **Año 1:** **$70.000 CLP/mes ($840.000 CLP/año = ~1,84 UF/mes):** Calce exacto de mercado para F29 mensual, Registro Centralizado de Compras/Ventas, Previred y DJ/Renta anual.
    * **Año 2:** **$80.000 CLP/mes ($960.000 CLP/año = ~2,1 UF/mes):** Sube al incorporar el primer técnico a medio tiempo.
    * **Años 3 y 4:** **$140.000 CLP/mes ($1.680.000 CLP/año = ~3,7 UF/mes):** Escala por arriendo de taller físico formal (tramitación y pago semestral de Patente Comercial Municipal + nómina ampliada).
    * **Año 5:** **$165.000 CLP/mes ($1.980.000 CLP/año = ~4,3 UF/mes):** Soporte tributario y laboral para 850 u/año.

#### 2. Dotación de Operarios y Ensamblaje
* **Año 1 (200 unidades):** Los fundadores absorben el ensamble (300 horas anuales totales = 6 horas/semana entre ambos, 3 h/sem c/u). Costo externo: $0.
* **Año 2 en adelante:** Contratación de técnicos egresados de liceos industriales o centros de formación técnica a sueldo de Ingreso Mínimo Mensual cargado (+5% costo patronal), dimensionado según las horas efectivas requeridas (2,25 h/unidad para ensamble, calibración, QA y embalaje):
  * **Año 2:** 0,5 FTE ($3.490.000 CLP/año).
  * **Años 3 y 4:** 1,0 FTE ($6.980.000 CLP/año).
  * **Año 5:** 1,5 FTE ($10.460.000 CLP/año).

---

### 4.5. Retorno Financiero y Ganancias de los Socios Fundadores (Álvaro y Alan)

El modelo financiero oficial estipula con total transparencia cuánto percibe cada uno de los socios fundadores (**reparto igualitario 50% Álvaro Villena y 50% Alan**) a través de dos mecanismos complementarios: **Sueldo Empresarial Fijo Mensual** (Art. 31 N° 6 LIR) y **Reparto de Dividendos / Excedentes de Caja Libre**.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        RESUMEN DE INGRESOS POR SOCIO (ÁLVARO Y ALAN) AÑO A AÑO                         │
├───────┬───────────────────────────────┬───────────────────────────────┬────────────────────────────────┤
│  Año  │  Sueldo Bruto por Socio       │  Dividendo Disponible (50%)   │  TOTAL ANUAL POR SOCIO         │
├───────┼───────────────────────────────┼───────────────────────────────┼────────────────────────────────┤
│ Año 1 │ $553.553/mes ($6.642.636/año) │ $0 (Caja paga deuda bancaria) │ $6.642.636 (~$553.553/mes)     │
│ Año 2 │ $600.000/mes ($7.200.000/año) │ +$4.132.949 al año            │ $11.332.949 (~$944.412/mes)    │
│ Año 3 │ $900.000/mes ($10.800.000/a)  │ +$3.825.424 al año            │ $14.625.424 (~$1.218.785/mes)  │
│ Año 4 │ $1.000.000/m ($12.000.000/a)  │ +$9.791.763 al año            │ $21.791.763 (~$1.815.980/mes)  │
│ Año 5 │ $1.200.000/m ($14.400.000/a)  │ +$15.245.981 al año           │ $29.645.981 (~$2.470.498/mes)  │
├───────┴───────────────────────────────┴───────────────────────────────┴────────────────────────────────┤
│ TOTAL ACUMULADO POR SOCIO A 5 AÑOS (Sueldos + Dividendos): $84.038.754 CLP                             │
│ RETORNO NETO REAL (Descontando el pie inicial de -$4.450.000): +$79.588.754 CLP limpios                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Dinámica de los Retiros
1. **Año 1 ($6.642.636 por socio):** Viven exclusivamente de su sueldo empresarial mensual ($553.553 bruto, ~$450.000 líquido c/u). No hay reparto de dividendos porque la caja absorbe la devolución íntegra de la línea de crédito de corto plazo ($5.000.000) y la primera cuota de amortización bancaria ($2.071.792).
2. **Años 2 y 3 ($11.3M a $14.6M/año por socio):** Sueldo mensual sube a $600.000 y $900.000 brutos. Con la deuda corta saldada, la empresa genera entre $7,6M y $8,2M de flujo libre al año, permitiendo retirar ~$3,8M a $4,1M anuales en dividendos por socio.
3. **Años 4 y 5 ($21.8M a $29.6M/año por socio):** Con ventas de 650 a 850 unidades, el sueldo asciende a $1.000.000 y $1.200.000 brutos mensuales, y los dividendos anuales escalan a $9,8M (Año 4) y $15,2M (Año 5) para cada fundador.
4. **Balance Global:** Tras 5 años, cada socio recupera con creces sus **$4.450.000 de pie aportado**, percibiendo **+$79.588.754 CLP limpios** en su bolsillo (multiplicador de 17,9x sobre el capital invertido) y manteniendo el 50% de la propiedad de una empresa consolidada, sin pasivos financieros y operando a escala multirregional.

---

### 4.6. Indicadores de Evaluación Económica y Flujo de Fondos a 5 Años

El modelo económico maestro (`Flujo de caja y financiamiento - TerraSense.xlsx`) arroja los siguientes resultados auditados:

| Indicador Financiero | Valor Oficial | Criterio de Aceptación | Veredicto del Proyecto |
| :--- | ---:|:---:|:---:|
| **Precio de Venta Neto (sin IVA)** | **$210.076 CLP** | Techo de negocio $249.990 con IVA | ✔ Óptimo |
| **Costo Variable Unitario Entregado** | **$91.309 CLP** | BOM $70.656 + flete + mano de obra | ✔ 71,7 % margen sobre BOM |
| **Margen de Contribución Unitario** | **$118.767 CLP** | Margen del 56,5 % sobre precio neto | ✔ Cubre estructura fija |
| **Punto de Equilibrio Contable (Año 1)**| **166 unidades** | < 200 unidades planificadas | ✔ **Holgura de seguridad de 20,5 %** |
| **V.A.N. (Tasa de Descuento 20 % anual)**| **+$2.588.182 CLP** | VAN > 0 (Crea valor económico) | ✔ **Proyecto Rentable** |
| **V.A.N. (Tasa de Descuento 15 % anual)**| **+$8.241.084 CLP** | Tasa bancaria estándar PYME | ✔ **Crecimiento Sólido** |
| **T.I.R. (Tasa Interna de Retorno)** | **22,72 %** | TIR > 20 % exigido | ✔ **Supera Tasa de Corte** |
| **Pay Back (Plazo de Recuperación)** | **3,71 años** | Recuperación antes de 5 años | ✔ **Cruza a positivo en Año 4** |
| **Utilidad Neta Año 1** | **+$2.985.381 CLP** | Sueldo de ambos socios pagado | ✔ **Sin años de pérdida contable** |
| **Utilidad Neta Año 5** | **+$32.714.084 CLP** | Crecimiento de 10x en 5 años | ✔ **Escalabilidad probada** |
| **Flujo de Fondos Acumulado al Año 5** | **+$36.168.514 CLP** | Caja neta generada | ✔ **Solvencia comprobada** |
| **Retorno Neto Limpio por Socio (5 Años)** | **+$79.588.754 CLP** | Descontado el pie inicial ($4,45M) | ✔ **Multiplicador de 17,9x** |

---

## 5. Veredicto y Conclusiones del Estudio de Viabilidad

1. **Viabilidad Técnica Comprobada:** TerraSense reúne 7 variables edafológicas directas más 2 ambientales en un chasis resistente de acero inoxidable 316L, con inferencia agronómica instantánea en $\le 5\text{ segundos}$ y operación 100% offline-first.
2. **Estructura Financiera Realista y Autofinanciada:** El negocio no requiere subsidios estatales ($0 CORFO). Se financia mediante un **pie de capital propio de $8.900.000 CLP ($4.450.000 por socio)** y un crédito bancario a 5 años por **$12.648.500 CLP**, respaldado por una cuota mensual fácilmente absorbible con la venta de apenas 2 a 3 sondas al mes.
3. **Estrategia Comercial Go-To-Market Coherente:** El Año 1 combina la seriedad de una tienda **Shopify** (con facturación electrónica y pago en cuotas) con pauta digital focalizada (**Meta Ads / Google Ads**) y cierre en **WhatsApp**, dirigida al 0,17% - 0,44% del mercado representado por el recambio generacional de agricultores y agrónomos jóvenes. Desde el Año 2, el traspaso a una **agencia de marketing externa** asegura la escala hasta 850 unidades anuales.
4. **Rentabilidad Privada Sobresaliente:** Con un **VAN de +$2.588.182 CLP al 20% (+$8.241.084 CLP al 15%)**, una **TIR de 22,72%** y un punto de equilibrio de **166 unidades**, TerraSense demuestra ser una empresa sustentable, financieramente sólida y con un retorno probado de inversión.

---

*Documento técnico y financiero actualizado para el proyecto TerraSense — INACAP 2026.*
