# 📈 Estudio de Viabilidad Técnica y Económica de las Alternativas vs. TerraSense

> ### ⚠️ Estado de verificación
> Revisado tras la [auditoría del 4 de septiembre de 2026](AUDITORIA_READMES_2026-09-04.md). **TerraSense es un prototipo en validación: este documento no acredita viabilidad comprobada ni rentabilidad probada.**
>
> - **Cifras económicas:** la fuente única es [`RESULTADOS_FINANCIEROS.md`](RESULTADOS_FINANCIEROS.md), generado por `python finanzas/modelo.py`. Supuestos y límites en [`MODELO_ECONOMICO.md`](MODELO_ECONOMICO.md).
> - **Prestaciones de hardware** (IP67, autonomía, consumo en reposo, peso, precisión): **objetivos de diseño sin ensayo**.
> - **N, P y K:** derivados de conductividad eléctrica. **No son análisis químicos** y no sustentan decisiones de fertilización.
> - **Comparaciones de competencia:** los precios de esta versión son los verificados el 04-09-2026; las capacidades de los competidores se corrigieron al alza.

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
| **Variables Ambientales (Aire)**| ❌ No mide | ❌ No mide | ❌ No mide | Termómetro de mano | ⚠️ **Sin sensor a bordo.** El BME280 no está en el diseño vigente; el ambiente proviene de un servicio meteorológico por internet |

* **Conclusión Metrológica:** Aunque el laboratorio tradicional ofrece la máxima exactitud analítica de referencia, **TerraSense entrega una precisión operativa de $\ge 95\%$ en campo**, holgadamente suficiente para la toma de decisiones agronómicas diarias de siembra, riego y fertilización.

---

### 2.2. Robustez Mecánica y Resistencia a Condiciones Extremas de Campo (IP67)

> ⚠️ **IP67 es un objetivo de diseño, no una prestación verificada.** No hay actas de ensayo de ingreso de polvo y agua, pesaje del conjunto ensamblado ni validación mecánica. Una junta, un prensaestopas o una resina **no constituyen certificación**. Lo que sigue describe el criterio de diseño; los puntajes de la matriz de §2.4 son **estimaciones internas, no resultados de ensayo**.

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
\text{CAPEX (TerraSense):} & \quad \mathbf{\$349.990\text{ CLP}}\quad(\text{Precio con IVA, \$294.109 CLP neto, pago único}) \\
\text{OPEX para el usuario:} & \quad \text{Sin suscripción; consumibles y recambios NO son cero} \\
\text{Cobro por medición:} & \quad \mathbf{\$0}\quad(\text{no equivale a costo marginal cero})
\end{aligned}$$

> **Precisiones.** El precio de $349.990 es una **hipótesis comercial a validar con pilotos pagados**, no un precio demostrado; el anterior de $249.990 se conserva solo como sensibilidad en el modelo.
>
> **«OPEX $0» y «costo marginal cero» son formulaciones incorrectas.** No hay suscripción ni cobro por lectura —eso sí es cierto, y es el diferenciador—, pero el uso implica tiempo de muestreo, limpieza, calibración, energía, mantenimiento y desgaste, y el propio TCO de §3.3 incorpora buffers y baterías. Para la empresa, además, los servicios de nube tienen costo: **no se promete gratuidad perpetua**.

---

### 3.2. Curva de Costo Marginal por Medición ($1, 10, 50, 200\text{ Muestras}$)

```text
COSTO TOTAL ACUMULADO SEGÚN EL NÚMERO DE MUESTREOS EN EL AÑO:
(CLP)
$2.500.000 │                                                   / Laboratorio Tradicional
$2.000.000 │                                                 / ($50.000 CLP / muestra)
$1.500.000 │                                               /
$1.000.000 │                                             / 
  $500.000 │                          /─────────────────  Combo importado (referencial)
  $349.990 │ ═══════════════════════════════════════════  TerraSense ($349.990 ÚNICO)
        $0 └───────┬───────────────┬───────────────┬───────────────► N° Muestras
                  10              50             100             200
```

| Volumen de Muestreos Anuales | Costo Laboratorio ($50K/u) | Costo Asesor ($120K/visita) | Costo Bluelab + pH | **Costo TerraSense IoT** |
| :--- | :---: | :---: | :---: | :---: |
| **1 Medición** | $50.000 CLP | $120.000 CLP | $500.000 CLP | **$349.990 CLP** |
| **5 Mediciones** | $250.000 CLP | $600.000 CLP | $500.000 CLP | **$349.990 CLP** |
| **10 Mediciones (Mapeo Predio)** | $500.000 CLP | $1.200.000 CLP | $500.000 CLP | **$349.990 CLP** |
| **50 Mediciones (Monitoreo Riego)**| $2.500.000 CLP | $6.000.000 CLP | $500.000 CLP | **$349.990 CLP** |
| **200 Mediciones (Temporada)** | $10.000.000 CLP | Inviable | $500.000 CLP | **$349.990 CLP** |

> **Cómo leer esta curva.** Muestra correctamente que **el costo por lectura baja con la frecuencia de uso**, porque no hay tarifa por medición. **No demuestra un ahorro:** una lectura de TerraSense no es un análisis de laboratorio evitado, y un muestreo compuesto bien diseñado no requiere un informe por punto. Los precios de las columnas de laboratorio y asesoría **no tienen cotización con fecha, IVA ni alcance declarado**.

---

### 3.3. Proyección de Costo Total de Propiedad (TCO a 1, 3 y 5 Años)

Para un predio representativo de 3 hectáreas con un régimen de monitoreo estándar (20 mediciones de suelo por temporada):

| Solución Tecnológica | TCO Año 1 | TCO Año 3 (Acumulado) | TCO Año 5 (Acumulado) |
| :--- | :---: | :---: | :---: |
| **Laboratorio Químico (20 muestras/año)**| $1.000.000 CLP | $3.000.000 CLP | $5.000.000 CLP |
| **Asesor Agronómico (6 visitas/año)** | $720.000 CLP | $2.160.000 CLP | $3.600.000 CLP |
| **Bluelab Pulse + Soil pH Pen** | $520.000 CLP | $640.000 CLP *(Sondas rep.)*| $780.000 CLP |
| **Spectrum TDR 350 + Suscripción** | $1.950.000 CLP | $2.550.000 CLP | $3.150.000 CLP |
| **TerraSense (kit completo)** | **$349.990 CLP** | **$365.000 CLP** *(buffers)* | **$385.000 CLP** *(baterías)*|

> [!WARNING]
> **Esta tabla no debe usarse como argumento de ahorro.** La auditoría identificó tres problemas:
>
> 1. **No es correcto monetizar cada lectura de TerraSense como un análisis de laboratorio evitado** mientras se declara —correctamente— que no son sustitutos analíticos. Comparan cosas distintas.
> 2. El propio TCO incorpora buffers y baterías, lo que **contradice** la afirmación de «costo invariable de por vida» usada en otras secciones. La formulación defendible es **«sin cobro por lectura»**, no «costo marginal cero»: el uso implica tiempo de muestreo, limpieza, calibración, energía, mantenimiento y desgaste.
> 3. Los precios de laboratorio, asesoría y equipos importados de esta tabla **no tienen cotización con fecha, IVA, despacho y accesorios**. El régimen de 20 mediciones/temporada es un supuesto, no un patrón de uso observado.
>
> Lo que sí puede afirmarse: **el pago es único y no hay tarifa por medición**, lo que hace que el costo por lectura baje con la frecuencia de uso. Cuánto ahorra un predio concreto depende de su manejo y **no se ha medido**.

---

### 3.4. Análisis de Sensibilidad y Mitigación de Pérdidas Productivas

> [!CAUTION]
> **El «caso real» de $495.000 y el ROI de 98 % quedan retirados.**
>
> No era un caso real: **no hay predio, fecha, cultivo, control, registro de insumos ni ensayo** que lo respalde. La aritmética del ROI era correcta, pero **el beneficio causal nunca se demostró**, y un daño potencial evitable no equivale a un ahorro atribuible al producto.
>
> Lo mismo aplica a las magnitudes que circulaban en la documentación —30–50 % de emergencia, 60 % del fósforo inmovilizado, $350.000–$700.000 por hectárea—: requieren cultivo, dosis, suelo, temporada, fuente y cálculo identificados.

**Qué haría falta para sostener un ROI:** un piloto con predio identificado, cultivo y superficie declarados, grupo de control o línea base, registro de insumos aplicados y rendimiento medido al cierre de temporada. Está en el [plan de validación](PLAN_VALIDACION.md) como trabajo pendiente, **no como resultado disponible**.

Mientras tanto, el argumento defendible es cualitativo: **decidir sin datos tiene un costo, y el valor de medir crece con la incertidumbre**. No se cuantifica ese costo en la documentación comercial.

---

## 4. Financiamiento, estrategia comercial y evaluación de rentabilidad

> **Esta sección fue reemplazada tras la [auditoría del 4 de septiembre de 2026](AUDITORIA_READMES_2026-09-04.md).** La versión anterior mezclaba el flujo del proyecto con el del accionista, aplicaba una tasa de impuesto uniforme, omitía comisiones de canal y presentaba como «retorno del socio» la suma de su sueldo bruto más dividendos.
>
> **Fuente única de las cifras económicas:** [`RESULTADOS_FINANCIEROS.md`](RESULTADOS_FINANCIEROS.md), generado por `python finanzas/modelo.py` desde [`finanzas/supuestos.json`](../finanzas/supuestos.json). Los supuestos y sus límites están en [`MODELO_ECONOMICO.md`](MODELO_ECONOMICO.md). **Si una cifra de este documento no coincide con esa fuente, la correcta es la de la fuente.**

### 4.1. Financiamiento propuesto

| Concepto | Monto CLP |
| :--- | ---: |
| Desembolso inicial (activos, desarrollo, formalización e inventario, con IVA prudencial) | $11.248.388 |
| Aporte de los socios ($4.500.000 cada uno) | $9.000.000 |
| Crédito dimensionado — 10 años, 12 % efectivo anual **supuesto** | $27.700.000 |
| Gastos de apertura presupuestados (2 %) | $554.000 |
| Caja inicial, **con la reserva incluida** | $24.897.612 |

El crédito se dimensiona como el **mínimo, en tramos de $100.000, que mantiene la reserva objetivo durante los primeros 24 meses** del escenario base. La reserva son 3 meses de gastos fijos —marketing incluido— más la cuota, más un 10 % del desembolso inicial, y **está dentro de la caja**: no es un gasto adicional ni se suma dos veces a la inversión.

> ⚠️ **No existe oferta bancaria.** El 12 % efectivo anual y el 2 % de apertura son presupuestos, **no un CAE cotizado**. FOGAPE es una **garantía estatal sujeta a evaluación**, no un subsidio, una condonación ni una aprobación previa. Una ficha comercial general no prueba el acceso de una empresa sin ventas. Si el banco no ofrece el plazo o exige garantías inaceptables, corresponde **reducir el lanzamiento y validar preventas**, no sustituirlo por un crédito personal.

### 4.2. Comparación de alternativas de deuda (mismo principal)

| Alternativa | Cuota mensual | Intereses totales | Saldo al año 5 | Mín. sobre reserva (24 m) | DSCR año 1 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 5 años | $607.619 | $8.757.127 | $0 | **−$4.525.964** | 0,66 |
| **10 años (propuesta)** | **$387.654** | **$18.818.441** | **$17.672.276** | **$45.210** | **1,04** |
| 15 años | $321.593 | $30.186.829 | $22.979.635 | $1.366.413 | 1,25 |
| 5 años + $5 M al 15 % pagados en el mes 12 | $497.940 | $7.926.418 | $0 | **−$7.910.523** | 0,41 |

El esquema anterior de **dos créditos** exigía **$11.725.284 de servicio de deuda el primer año** y dejaba la caja **$7,9 millones bajo la reserva**: por eso se abandonó. Quince años mejora la cobertura, pero encarece los intereses en casi $11,4 millones frente a diez años y prolonga la exposición de un producto tecnológico no validado.

### 4.3. Estrategia comercial

**Año 1:** venta directa digital autogestionada por los socios, con tienda formal y facturación electrónica. Presupuesto de marketing de **$6.000.000 anuales** ($30.000 por venta objetivo).

El embudo de referencia —60 % de ventas atribuibles a anuncios, CAC publicitario de $50.000, cierre del 5 % sobre contactos calificados, lo que exigiría 2.400 contactos y un CPL de $2.500 para 120 ventas— **son objetivos de trabajo, no conversiones observadas**. Las 80 ventas restantes provendrían de pilotos, recomendaciones y contacto directo, tampoco demostrados.

El modelo presupuesta un **5 % del precio bruto** como costo comercial agregado, que incluye el riesgo de la tarifa adicional por pagos externos. **No es una tarifa verificada de una pasarela**, y el modelo **no contempla ventas en cuotas, a crédito ni descuentos de distribuidor**: cada una de esas modalidades exige un escenario financiero propio y no puede financiarse con el margen de la venta directa.

**Escalamiento:** la agencia externa ($250.000/mes de gestión, aparte de la pauta) se activa **solo al superar un objetivo de 650 ventas anuales** —año 4 en el escenario base—, no en el año 2. Los canales institucionales y de distribución están **fuera del modelo actual**.

**Regla de gestión:** subir el presupuesto de adquisición **solo después** de medir CAC por cohorte, conversión, devoluciones, margen después de soporte y capacidad de entrega. Evaluar campañas en lotes pequeños y detener las que destruyen contribución. **Pagar más no garantiza vender más.**

### 4.4. Dotación y contabilidad

**Contador externo desde el mes 1** —antes incluso, para la apertura, el régimen tributario y el diseño de remuneraciones—: $120.000/mes de base más $20.000 por cada FTE contratado, reajustado. **No existe una regla que obligue a contratar un contador interno en un año determinado**; existen obligaciones tributarias desde el inicio y una necesidad operativa de asesoría.

**Remuneración de los socios:** base mensual bruta de $600.000, $700.000, $850.000, $1.000.000 y $1.200.000 por socio en moneda del año inicial, más reajuste anual del 3 %. **No son sueldos líquidos.** El modelo reserva un **35 % sobre sueldos** para gratificación y cargas patronales: es un presupuesto, **no una tasa legal única** —el modelo anterior usaba 5 %, que no es defendible— y debe someterse también a un estrés de 45 %. La condición laboral y tributaria de socios con control de la empresa **debe revisarla el contador**.

**Contratación por capacidad**, en escalones de 0,5 FTE sobre 1.400 horas productivas anuales por FTE:

| Año | 2027 | 2028 | 2029 | 2030 | 2031 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Técnicos FTE (2,25 h/equipo; socios aportan 500 h) | 0 | 0,5 | 0,5 | 1,0 | 1,5 |
| Soporte/comercial FTE (2 h/venta + 0,5 h/equipo activo; socios aportan 900 h) | 0 | 0 | 0,5 | 1,0 | 1,5 |

FTE es **equivalente de jornada presupuestado, no número de contratos**. Los tiempos de ensamblaje, prueba y retrabajo son presupuestos por recalcular con datos reales.

### 4.5. Retorno de los socios

Hay que separar dos cosas que la versión anterior de este documento mezclaba:

* **Remuneración por trabajar:** es **costo laboral de la empresa**, deducible y sujeto a revisión contable. Nunca es retorno del capital.
* **Retorno del capital: no se publica.** No existe una política de dividendos definida, y el FCFE es generación de caja de la empresa, **no un depósito al socio**.

La cifra de **«+$79.588.754 limpios en el bolsillo» queda retirada**: sumaba el sueldo bruto del socio al retorno de su inversión, lo que no tiene significado financiero. Tampoco se publica un multiplicador de 17,9×. Los dividendos y prepagos se decidirán anualmente con información real y con la reserva cubierta.

### 4.6. Indicadores de evaluación y escenarios

| Año | Ventas | EBITDA | Servicio deuda | Caja final | Reserva | DSCR | Equilibrio op./deuda |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2027 | 200 | $5.709.528 | $4.651.844 | $25.061.618 | $10.327.800 | **1,04** | 170 / 195 |
| 2028 | 350 | $21.324.647 | $4.651.844 | $39.526.551 | $14.033.662 | 4,11 | 241 / 265 |
| 2029 | 500 | $35.078.302 | $4.651.844 | $61.191.779 | $18.646.878 | 5,66 | 326 / 349 |
| 2030 | 650 | $40.278.414 | $4.651.844 | $85.276.292 | $25.866.117 | 6,18 | 456 / 478 |
| 2031 | 850 | $56.043.380 | $4.651.844 | $123.092.636 | $33.596.641 | 9,13 | 588 / 610 |

| Escenario | Ventas año 1 | Mín. caja libre 24 m | VAN proyecto 5 años al 20 % |
| :--- | ---: | ---: | ---: |
| **Base** | 200 | $45.210 | **+$21.874.878** |
| **Estrés** (−35 % ventas, mismo marketing) | 130 | **−$19.803.623** | **−$47.949.651** |
| **Crecimiento** (+50 % ventas y adquisición) | 300 | $824.154 | +$87.302.635 |

**Perspectivas separadas:** el **FCFF** es el flujo del proyecto, con impuesto calculado **sin** deducir intereses; el **FCFE** es el flujo después de intereses, capital e impuesto con financiamiento. No se mezclan para el VAN. El VAN usa flujos mensuales, **sin valor de rescate, sin recuperación de reserva o inventario y sin valor terminal**; la reserva inicial se trata como capital comprometido y los gastos de apertura pertenecen al financiamiento, no al FCFF.

**Impuestos:** aproximación de caja Pro Pyme con pérdidas arrastradas, con tasas de referencia de 12,5 % (2027), 15 % (2028) y 25 % en adelante según la [Circular SII 53/2025](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf). **No reproduce F29, PPM ni la declaración de abril, y no debe usarse para declarar.** El modelo anterior aplicaba 25 % uniforme a todos los años, lo que no corresponde.

**No se publican TIR ni Pay Back.** Faltan insumos que cambian materialmente esas respuestas.

---

## 5. Veredicto y conclusiones del estudio de viabilidad

1. **Viabilidad técnica: plausible en software, no comprobada en hardware.** El motor agronómico determinista funciona sin conexión, la app tiene 18 pruebas unitarias aprobadas y chequeo de tipos limpio, y la consola web compila. **No existe** PCB ruteada, firmware en el repositorio, cierre de ERC, medición de consumo desde batería ni ensayo de sellado. Las 7 variables provienen de la sonda; **las variables de ambiente vienen de un servicio meteorológico por internet, no de un sensor a bordo**, y el tiempo de respuesta extremo a extremo no está medido.

2. **Viabilidad económica: hipótesis defendible, rentabilidad no probada.** El caso base crea valor —VAN de **+$21.874.878** al 20 %— pero con **cobertura de deuda estrecha el primer año (DSCR 1,04, bajo el criterio interno de 1,3)** y un margen de solo 5 unidades sobre el equilibrio con deuda. El escenario de estrés destruye valor: **VAN de −$47.949.651** y caja **$19,8 millones bajo la reserva**.

3. **El supuesto crítico sin resolver es el financiamiento.** El crédito de $27.700.000 a 10 años **no tiene oferta bancaria**. Sin ella, el resto del análisis es condicional.

4. **La estrategia comercial es coherente pero no está validada.** Las metas de 200 a 850 unidades son objetivos de trabajo, no demanda observada ni preventas cerradas. El CAC, la conversión y las devoluciones no se han medido.

5. **Lo que corresponde antes de comprometer dinero:** cotizar el BOM con SKU, moneda y vigencia; ensayar el instrumento en terreno y laboratorio; vender pilotos pagados con margen positivo; obtener una oferta bancaria efectiva; hacer revisar régimen tributario y remuneraciones por un contador; y cerrar las obligaciones ante SUBTEL, normativa de baterías, protección al consumidor y Ley 21.719. El detalle está en el [plan de validación](PLAN_VALIDACION.md).

6. **Si las ventas del escenario de estrés se materializan, corresponde redimensionar el negocio**, no tapar una pérdida recurrente con un plazo de deuda más largo.

---

*Documento revisado el 4 de septiembre de 2026 tras la [auditoría de la documentación](AUDITORIA_READMES_2026-09-04.md). Las cifras económicas provienen de [`RESULTADOS_FINANCIEROS.md`](RESULTADOS_FINANCIEROS.md); no editarlas a mano.*
