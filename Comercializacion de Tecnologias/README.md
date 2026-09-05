# TerraSense — guion para presentación de Comercialización de Tecnologías

> Formato final: plantilla institucional INACAP<br>
> Resultado de aprendizaje: 1.1<br>
> Duración sugerida: 12–15 minutos

Este README está ordenado como **guion para crear el PPT**. No se deben copiar párrafos completos a las diapositivas: “En pantalla” indica el contenido visual y “Defensa” lo que debe explicarse oralmente.

> **Tesis central:** TerraSense no reemplaza la exactitud de un laboratorio. Convierte mediciones rápidas de terreno en información comprensible y acciones agronómicas concretas.

## Cobertura de la rúbrica

| Criterio | Diapositivas | Evidencia |
|---|---:|---|
| 1.1.1 Economía y modelos — 9 pts | 4–5 | Economía de mercado, competencia monopolística y costo de oportunidad |
| 1.1.2 Oferta y demanda — 12 pts | 6–8 | Situación base y dos variaciones de cada curva |
| 1.1.3 BI / datos — 12 pts | 9–10 | Economía unitaria, equilibrio, escenarios, VAN y DSCR |
| 1.1.4 Mercado — 12 pts | 2–3 y 11–13 | Producto, cliente, necesidad, TAM/SAM/SOM y competencia |
| 1.1.5 Pensamiento crítico — 6 pts | 14 y preguntas | Límites, decisiones, riesgos y mitigaciones |
| Comunicación y tiempo — 9 pts | Toda la presentación | Guion, reparto y ensayo |

---

# Guion diapositiva por diapositiva

## 1. Portada

**En pantalla:** TerraSense — *Del dato del suelo a una decisión concreta*; integrantes, sección, docente y fecha.

**Defensa:** “TerraSense mide condiciones del suelo y microclima y las traduce, mediante una aplicación, en alertas y recomendaciones comprensibles”.

**Visual:** prototipo y captura de la app en plantilla INACAP.

## 2. Problema y necesidad

**En pantalla**

- El productor decide sobre riego y fertilización con información insuficiente o tardía.
- El laboratorio es preciso, pero requiere muestra, espera y pago por análisis.
- Los medidores portátiles suelen entregar números sin explicar qué hacer.
- Se necesita contexto inmediato, acciones comprensibles e historial.

**Defensa:** “El problema no es solamente medir; es convertir pH, humedad o conductividad en una decisión ejecutable”.

El universo censal usado en el repositorio es de **175.556 explotaciones** (VIII Censo Agropecuario y Forestal 2021). Dimensiona el sector; no demuestra intención de compra.

## 3. Producto y propuesta de valor

**En pantalla:** Hardware → Bluetooth → aplicación → historial y mapas.

- 7 variables de suelo, más contexto meteorológico obtenido por internet.
- Semáforo: óptimo, precaución o crítico.
- Acciones agronómicas cualitativas según etapa fenológica.
- Motor de inferencia sin conexión, georreferenciación opcional y pago único.

**Precisiones obligatorias para no sobrevender:** el ambiente **no** proviene de un sensor a bordo; el dato meteorológico **sí requiere red** y no tiene caché. El motor **no entrega dosis en kg/ha ni costos por hectárea**: esas salidas se retiraron por no estar justificadas agronómicamente. **El tiempo de respuesta no está medido**; no citar «5 segundos» ni «8 segundos».

> **Propuesta de valor:** “Otros equipos entregan números. TerraSense explica qué significan y qué puede hacer el usuario”.

**Límite obligatorio:** N, P y K derivan de conductividad eléctrica y **no son mediciones equivalentes a laboratorio**. Una lectura de conductividad no identifica concentraciones independientes de esos tres nutrientes, ni siquiera bajo el umbral de salinidad. La app **no los muestra como cifras interpretables** y los excluye del veredicto cuando la confianza es baja. Ninguna decisión de fertilización debe basarse en ellos.

## 4. Economía de mercado

TerraSense pertenece a una **economía de mercado** porque:

- una empresa privada decide qué producir y cómo usar recursos;
- el precio considera costos, clientes y competidores;
- el consumidor elige libremente entre sustitutos;
- la competencia obliga a diferenciarse;
- oferta y demanda condicionan las ventas.

**Modelo:** competencia monopolística. Laboratorios, medidores y asesorías satisfacen necesidades relacionadas, pero difieren en precisión, rapidez, precio e interpretación.

**Defensa:** “La aplicación, el modo sin conexión y el soporte local permiten diferenciarnos, aunque el precio sigue limitado por los sustitutos”.

## 5. Principio económico: costo de oportunidad

> **El costo de una cosa es aquello a lo que se renuncia para obtenerla.**

| Alternativa | Se obtiene | Se renuncia a |
|---|---|---|
| Laboratorio | Exactitud, más analitos y respaldo técnico | Inmediatez, frecuencia y bajo costo por nueva lectura |
| TerraSense | Resultado inmediato, repetición e interpretación | Exactitud analítica y validez de laboratorio |

TerraSense renuncia a competir en exactitud analítica. A cambio entrega **contexto, alertas, historial y acciones sugeridas**. El usuario elige entre esperar mayor precisión o disponer ahora de información orientativa para decisiones frecuentes.

**Conclusión:** “TerraSense sirve para monitoreo frecuente y el laboratorio como referencia periódica. Son complementarios”.

## 6. Oferta y demanda: base

- **Demanda:** productores, cooperativas e instituciones que valoran decisiones rápidas.
- **Oferta:** equipos que TerraSense puede fabricar y vender rentablemente.
- Precio de lista propuesto: **$349.990 con IVA** ($294.109 neto).
- Meta Año 1: **200 unidades**.
- Equilibrio operativo: **176 unidades**; incluyendo servicio de deuda: **205 unidades**.

**Gráfico:** oferta ascendente, demanda descendente y equilibrio ilustrativo. El precio y las 200 unidades son un **plan financiero, no un equilibrio econométrico observado** ni demanda validada.

## 7. Dos variaciones de demanda

| Variación | Causa | Movimiento | Efecto |
|---|---|---|---|
| D1: urgencia hídrica y salina | Mayor necesidad de revisar humedad y EC | Demanda a la derecha | El monitoreo inmediato gana valor |
| D2: costo percibido de decidir sin datos | Riesgo de regar o fertilizar mal | Demanda a la derecha | Sube disposición a pagar |

**Visual:** dos gráficos D → D’.

**No usar cifras de pérdida por hectárea en la defensa.** Las magnitudes que circulaban en el repositorio ($350.000–$1.400.000/ha) no tienen cultivo, dosis, suelo, temporada ni fuente identificados: describen un daño potencial genérico, no un ahorro atribuible al producto. El argumento defendible es cualitativo: decidir sin datos tiene un costo, y el valor de medir crece con la incertidumbre.

## 8. Dos variaciones de oferta

| Variación | Causa | Movimiento | Efecto |
|---|---|---|---|
| O1: alza de USD o insumos | La sonda es el 59 % del BOM y casi todo es importado | Oferta a la izquierda | Sube costo y baja margen |
| O2: tecnología productiva | Impresión 3D y montaje SMT externo evitan matricería | Oferta a la derecha | Menor inversión inicial y lotes pequeños |

**No citar un porcentaje exacto de exposición al dólar:** el 88,6 % anterior no tiene respaldo por SKU, moneda y vigencia. Lo que sí puede afirmarse es que la sonda 7-en-1 representa **$48.000 de los $81.184 del BOM** y que la mayor parte de los componentes son importados. El efecto de un alza se evalúa cambiando el BOM en `supuestos.json` y regenerando el modelo.

## 9. Business Intelligence: economía unitaria y equilibrio

**En pantalla:** precio de venta, BOM completa con BME280 y carcasa 3D, margen de contribución y equilibrio operativo/con deuda del año 1. Usar la [tabla económica vigente](../README.md#finanzas-y-modelo-económico).

**Defensa:** el BME280 aporta tres lecturas ambientales locales de la grilla. La API gratuita agrega el pronóstico de cinco días después de medir. Su costo directo es cero; el sensor y la impresión 3D se pagan por cada equipo. La nómina incluye el ensamblaje final.

## 10. BI: inversión, financiamiento y evaluación

**En pantalla:** aporte de socios de $9.000.000, crédito dimensionado, caja anual, **VAN, TIR y payback** del caso base. Todas las cifras se obtienen de [RESULTADOS_FINANCIEROS.md](../docs/RESULTADOS_FINANCIEROS.md) y del Excel maestro.

**Defensa:** evaluamos el proyecto durante cinco años con flujos mensuales. VAN al 20 %, TIR efectiva anual y payback usan el mismo capital inicial y flujo económico. El préstamo se revisa por separado mediante cuotas, caja y DSCR. El sueldo de los socios se incluye como costo laboral. El escenario de estrés reduce 35 % las ventas manteniendo marketing; crecimiento aumenta 50 % ventas y adquisición, recalculando personal e inventario.

## 11. Mercado objetivo y necesidades

**Cliente inicial:** pequeños y medianos productores chilenos; decisiones frecuentes de riego y fertilización; conectividad irregular; sensibilidad a análisis recurrentes, asesorías o suscripciones.

**Necesidades:** diagnóstico rápido, explicación sencilla, acciones, historial, portabilidad, uso sin internet, pago único y soporte local.

**Adopción inicial:** cultivos de mayor valor y productores con smartphone, disposición digital y compra directa o cofinanciada.

## 12. TAM, SAM y SOM

| Nivel | Tamaño | Significado |
|---|---:|---|
| TAM | 175.556 explotaciones | Universo censal teórico (VIII Censo Agropecuario y Forestal 2021, INE) |
| SAM | ~120.000 | **Supuesto sin tabla de respaldo**: no aplica región, superficie, rubro ni disposición a pagar |
| SOM Año 1 | 200 | Meta comercial: 0,17 % del SAM |
| SOM acumulado 5 años | 2.550 | 2,13 % del SAM (200 + 350 + 500 + 650 + 850) |

**Gráfico:** embudo TAM → SAM → SOM.

**Lectura crítica:** el TAM tiene fuente censal ([INE, resultados finales](https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales)); **el SAM y el SOM son supuestos internos**. Las 200 ventas nacen de superar el equilibrio con deuda (205 u), no de demanda observada, y deben validarse en terreno. Una explotación censada tampoco equivale a un cliente ni a un equipo.

## 13. Competencia y oportunidad

Precios exhibidos consultados el **04-09-2026**. **No comparar cantidad de variables sin método ni exactitud declarada**: es la crítica más fácil de recibir en la defensa.

| Alternativa | Precio exhibido | Alcance real |
|---|---:|---|
| [Hanna HI9814](https://hannachile.com/producto/medidor-portatil-e-impermeable-de-ph-ce-tds-temperatura-groline-hidroponia-hi9814/) | $491.827 | pH/CE/TDS/temperatura para **soluciones y sustratos**; no mide humedad de suelo |
| [Bluelab Pulse](https://delaferia.cl/products/pulse-meter-bluelab-temperatura-humedad-y-ec) | $538.990 | Humedad, CE y temperatura **con Bluetooth, app, historial y uso sin internet** |
| [FieldScout TDR 350](https://sandbox.specmeters.com/FieldScout-TDR350-Soil-Moisture-Meter) | No cotizado localmente | Humedad, CE y temperatura **con registro, GPS y Bluetooth** |
| Laboratorio | ~$35.000–$60.000/muestra | Referencia analítica; algunos servicios incluyen recomendación |
| **TerraSense** | **$349.990** | ~29 % bajo Hanna, ~35 % bajo Pulse. **En validación**: sin equivalencia demostrada de precisión ni madurez |

**Corrección respecto de versiones anteriores del guion:** el Pulse **sí tiene** app, Bluetooth, historial y uso sin internet, y el TDR 350 **sí tiene** registro, GPS y Bluetooth. Presentarlos como «solo muestran números» es incorrecto y debilita la defensa.

**Oportunidad real:** el espacio entre el medidor de datos crudos y el laboratorio exacto pero menos inmediato.

**Diferenciador que sí podemos sostener:** la **interpretación agronómica contextualizada por etapa fenológica** y la ausencia de suscripción. El uso sin conexión y la georreferenciación **no son exclusivos** de TerraSense.

**Canales y escalamiento comercial:**
- **Año 1 (200 u — Meta 0,17 % SAM / 0,11 % TAM):** Venta directa digital autogestionada por los socios:
  - **Tienda Shopify institucional:** Plataforma confiable con emisión automática de Factura Electrónica con IVA (crédito fiscal indispensable para el agricultor), pasarela Webpay Plus / Mercado Pago con opción de 3 a 6 cuotas sin interés (~$50.000/mes) y despachos trazables con Bluexpress/Starken.
  - **Pauta digital autogestionada ($6.000.000/año = $30.000 por venta objetivo):** Meta Ads y Google Ads. El embudo de ejemplo — 60 % de ventas atribuibles a anuncios, CAC publicitario de $50.000, cierre de 5 % sobre contactos calificados, lo que exigiría 2.400 contactos y un CPL de $2.500 para 120 ventas — **son objetivos, no conversiones observadas**. El CAC de $6.000 del guion anterior no es sostenible.
  - **Embudo Click-to-WhatsApp:** El anuncio conduce a WhatsApp directo donde los socios fundadores resuelven dudas agronómicas y cierran la venta.
  - **Target de recambio generacional:** Dirigido a hijos de agricultores (28 a 45 años), administradores de fundos tecnificados y agrónomos asesores independientes.
- **Año 2 (350 u):** Escalamiento de pauta ($10,82 M). **La agencia externa no entra el año 2**: en el modelo se activa recién al superar un objetivo de 650 ventas anuales, con $250.000/mes de gestión aparte de la pauta. Los canales INDAP/PRODESAL y de distribución **están fuera del modelo actual** y exigen un escenario financiero propio.
- **Año 3 (500 u):** Pauta de $15,91 M. Dotación presupuestada: 0,5 FTE técnico y 0,5 FTE de soporte, **contratados por capacidad** (2,25 h por equipo; 2 h por venta más 0,5 h por equipo activo al año), no por calendario.
- **Año 4 (650 u):** Pauta de $21,31 M y activación de la agencia ($250.000/mes). Dotación: 1 FTE técnico y 1 FTE de soporte.
- **Año 5 (850 u):** Pauta de $28,70 M. Dotación: 1,5 FTE técnico y 1,5 FTE de soporte. **Subir el presupuesto de adquisición solo después** de medir CAC por cohorte, conversión, devoluciones y capacidad de entrega.

## 14. Decisiones, riesgos y pensamiento crítico

| Riesgo/decisión | Fundamento | Mitigación |
|---|---|---|
| No competir en exactitud | El valor está en frecuencia e interpretación | Posicionamiento complementario al laboratorio |
| N/P/K derivados de conductividad | La conductividad no identifica los tres nutrientes por separado | No mostrarlos como cifras interpretables, excluirlos del veredicto con baja confianza y mantener el laboratorio |
| Exposición cambiaria del BOM | La sonda es el 59 % del costo de materiales y casi todo es importado | Cotizar SKU con moneda y vigencia; lotes fraccionados y proveedores alternativos **por validar** |
| Precio $349.990 sin validar | No hay ventas pagadas que lo confirmen | Pilotos pagados antes de comprar volumen; sensibilidades a $249.990–$329.990 en el modelo |
| **Cobertura de deuda estrecha el año 1** | **DSCR 0,69, bajo el criterio interno de 1,3** | Un solo crédito a 10 años, reserva dimensionada y cotización completa antes de firmar |
| Metas de venta no validadas | Son metas financieras, no preventas cerradas | Escenario de estrés a 130 u en el modelo; preventas y piloto antes de comprometer inventario |
| **Hardware sin ensayar** | PCB sin rutear, sin firmware en el repositorio, sin ensayos de autonomía ni sellado | No fabricar desde el archivo actual; rediseño, ERC/DRC y ensayos antes de comercializar |
| **Cumplimiento normativo abierto** | SUBTEL, baterías, consumidor y Ley 21.719 (vigente 01-12-2026) | Revisar expediente del producto terminado antes de vender, no del módulo |

## 15. Conclusión

1. TerraSense opera en una economía de mercado bajo competencia monopolística, con libertad de precio y sustitutos reales.
2. Su costo de oportunidad está declarado: renuncia a precisión de laboratorio para ganar inmediatez, frecuencia, portabilidad y prescripción.
3. La oferta es sensible al tipo de cambio: la sonda concentra el 59 % del costo de materiales y casi todo el BOM es importado. La demanda crece con la escasez hídrica y con el costo de decidir a ciegas.
4. La evaluación incluye **VAN, TIR efectiva anual y payback del proyecto**, con flujos mensuales a cinco años. Consultar la tabla de [resultados financieros](../docs/RESULTADOS_FINANCIEROS.md). La remuneración de los socios ya está incluida en nómina.
5. **El primer año es el riesgo.** El DSCR de 2027 es **0,69**, bajo nuestro criterio interno de 1,3, y el escenario de estrés (−35 % de ventas) da un VAN de **−$50.774.058**. Si ese escenario se materializa, corresponde **redimensionar el negocio**, no estirar el plazo de la deuda.
6. La oportunidad radica en **transformar datos agronómicos en decisiones ejecutables sin pretender reemplazar al laboratorio químico** — y en decirlo con los límites explícitos, que es lo que hace defendible el trabajo.

> “TerraSense no promete saber más que un laboratorio; promete ayudar al agricultor a decidir mejor entre un análisis y el siguiente”.

---

# Preguntas de defensa (Batería Completa)

### 1. ¿Cómo se financia el desembolso inicial y por qué un banco prestaría a una empresa recién creada?
El desembolso inicial es de **$11.317.378**, financiado con un aporte de los socios de **$9.000.000** ($4.500.000 cada uno, disponibilidad confirmada) y un crédito dimensionado en **$31.000.000 a 10 años**. El crédito es mayor que el desembolso porque también financia la **reserva de liquidez** que sostiene los primeros 24 meses.

**La respuesta honesta a la segunda parte: todavía no sabemos si un banco prestaría.** No tenemos oferta bancaria. La tasa del 12 % efectivo anual y el 2 % de gastos de apertura son presupuestos, no un CAE cotizado. FOGAPE es una garantía estatal sujeta a evaluación, no un subsidio ni una aprobación automática. Si el banco no ofrece el plazo o exige garantías inaceptables, **reducimos el lanzamiento y validamos preventas**; no lo sustituimos por un crédito personal.

### 2. ¿Por qué no dependen de un subsidio estatal como CORFO?
Porque el proyecto debe poder nacer y pagar sus deudas por sí mismo. Postular sigue siendo una opción abierta y beneficiosa: si se adjudica, sustituye deuda cara y mejora el resultado. El modelo no lo supone.

### 3. ¿Cómo se ve la caja del primer año?
El EBITDA de 2027 es de **$4.426.234** y el servicio de deuda de **$5.206.035**, lo que deja un **DSCR de 0,69**: por cada peso de deuda que hay que pagar, la operación genera 0,69. **Está por debajo de nuestro criterio interno de 1,3 veces.** El mínimo de caja libre sobre la reserva en 24 meses es de apenas **$56.737**.

Esto es una advertencia, no un adorno: el primer año no tiene holgura. Por eso el crédito se dimensionó al mínimo que sostiene la reserva, y por eso pedimos cotización completa y probamos meses débiles antes de firmar. **La reserva financia transitorios, no pérdidas permanentes.**

### 4. ¿Cómo se dimensionó la reserva y qué cubre?
Tres meses de gastos fijos —incluido marketing— y tres cuotas del crédito, más un 10 % del desembolso inicial. **La reserva está dentro de la caja**: no es un gasto ni se suma dos veces a la inversión. El inventario inicial cubre solo los dos primeros meses de ventas, redondeado a lotes de 10 equipos; el lote de 10 es una **política de simulación, no un mínimo de compra del proveedor**. Con lead times reales habrá que recalcularlo.

### 5. ¿Por qué $349.990 y no un precio menor?
Porque el precio anterior de $249.990 se sostenía sobre una economía unitaria incompleta: no incluía comisiones de canal, contabilizaba una mano de obra directa que ya estaba en la nómina y usaba una carga patronal del 5 % que no es defendible.

Con el costo de materiales presupuestado en **$81.184** y un costo variable adicional de **$29.994** por unidad, a $349.990 con IVA ($294.109 neto) el margen de contribución es de **$182.931 (62,2 %)**. Frente a las referencias consultadas el 04-09-2026 — **Hanna HI9814 a $491.827** y **Bluelab Pulse a $538.990** — quedamos aproximadamente 29 % y 35 % por debajo.

**Pero es una hipótesis, no un precio demostrado.** No hay ventas pagadas que lo validen. Los $249.990 se conservan solo como sensibilidad en el modelo.

### 6. ¿De dónde salen las 200 unidades del año 1?
Las 200 unidades son la meta comercial del primer año, repartida por una estacionalidad mensual explícita. El equilibrio operativo es de 176 equipos y el equilibrio con servicio de deuda es de 205 equipos.

No las llamamos «conservadoras» por ser un número pequeño: **vender 200 unidades de un producto nuevo puede ser difícil**. La distribución mensual del modelo, concentrada en el segundo semestre, es estacionalidad hipotética. Por eso corremos un escenario de estrés a 130 unidades — que da VAN negativo.

### 7. ¿Qué pasa si el tipo de cambio sube fuertemente?
La sonda 7-en-1 representa **$48.000 de los $81.184 del BOM (59 %)** y la mayoría de los componentes son importados, de modo que la exposición cambiaria es alta. **No damos un porcentaje exacto de exposición al dólar porque aún no tenemos SKU cotizados con moneda y vigencia**; cuantificarlo es parte de la cotización pendiente.

El modelo permite evaluar el efecto cambiando el BOM en `supuestos.json` y regenerando. La mitigación planteada es compra fraccionada, proveedores alternativos y stock de seguridad, pero **ninguna está probada con un proveedor real**.

### 8. ¿Por qué comprar TerraSense si un laboratorio químico es más exacto?
Porque satisfacen necesidades distintas y complementarias. El laboratorio da exactitud analítica; TerraSense busca dar frecuencia e interpretación **sin cobro por lectura**.

Dos precisiones que hay que hacer explícitas: **no es «costo marginal cero»** — el uso implica tiempo de muestreo, limpieza, calibración, energía, mantenimiento y desgaste; y **no todo laboratorio demora 15–30 días ni entrega un informe sin recomendación**: [INIA documenta servicios que sí la incluyen](https://www.inia.cl/laboratorios/). Tampoco corresponde monetizar cada lectura como un laboratorio evitado mientras declaramos que no son sustitutos.

### 9. ¿El equipo realmente mide N, P y K?
**No.** La sonda mide conductividad eléctrica y temperatura; los tres registros asociados a N, P y K derivan de un modelo empírico. **Una lectura de conductividad no identifica concentraciones independientes de nitrógeno, fósforo y potasio**, ni siquiera por debajo del umbral de salinidad.

Por eso la app **no presenta esos valores como cifras interpretables en ningún caso**, marca la lectura como de baja confianza cuando la conductividad es alta y la excluye del veredicto. La salvaguarda por salinidad es parcial, **no una validación analítica**. Ninguna decisión de fertilización debe tomarse a partir de esos registros: para eso está el análisis de laboratorio.

### 10. ¿Cuánto ganan los fundadores y cuál es su retorno financiero?
Hay que separar dos cosas que el guion anterior mezclaba.

**Remuneración por trabajar:** base mensual bruta por socio en moneda del año inicial de $600.000, $700.000, $850.000, $1.000.000 y $1.200.000, más reajuste anual del 3 %. **No son sueldos líquidos**, y el modelo reserva un 35 % adicional sobre sueldos para gratificación y cargas patronales — un presupuesto, no una tasa legal única. La condición laboral y tributaria de socios con control de la empresa **debe revisarla el contador**.

**Retorno del capital: no lo publicamos.** No existe política de dividendos definida, y el FCFE es generación de caja de la empresa, **no un depósito al socio**. La cifra anterior de «+$79.588.754 limpios en el bolsillo» se retira: sumaba el sueldo bruto del socio al retorno de su inversión, lo que no tiene significado financiero. Los dividendos y prepagos se decidirán anualmente con información real y con la reserva cubierta.

### 11. ¿Por qué contabilidad externa y no un contador interno?
Porque el volumen de trabajo del primer año no justifica una contratación indefinida, y un contador general en Chile tiene un costo de empresa muy superior al de un servicio externo para una microempresa en Régimen Pro Pyme.

El modelo presupuesta **contador externo desde el mes 1** — antes incluso, para la apertura, el régimen tributario y el diseño de remuneraciones — a **$120.000/mes** más $20.000 por cada FTE contratado, reajustado. Hay [ofertas públicas de planes contables](https://www.contadoresdigitales.cl/planes-contables/), pero no todos incluyen inventario, nómina y renta anual: hay que pedir propuesta completa.

**Aclaración importante:** *no existe una regla que obligue a contratar un contador interno en un año determinado.* Lo que existe son obligaciones tributarias desde el inicio y una necesidad operativa de asesoría.

### 12. ¿Qué falta para que estas cifras sean defendibles?
1. BOM cotizado con SKU, precio neto y bruto, moneda, fecha, vigencia y costo puesto en taller.
2. Ensayos de terreno y laboratorio: incertidumbre por variable, repetibilidad, comportamiento con salinidad y humedad.
3. Embudo comercial observado y ventas piloto pagadas: precio efectivo, CAC, devoluciones y horas de soporte.
4. Oferta bancaria efectiva en CLP a tasa fija, con todos los cargos y garantías exigidas.
5. Revisión contable independiente del régimen, remuneraciones, PPM e IVA efectivo.
6. Obligaciones revisadas ante SUBTEL, baterías, protección al consumidor y datos personales (Ley 21.719, vigente desde el 1 de diciembre de 2026).

---

# Fuentes y Resumen de Cifras Vigentes

- [Informe maestro](../README.md)
- **[Modelo económico: supuestos y límites](../docs/MODELO_ECONOMICO.md)**
- **[Resultados financieros vigentes](../docs/RESULTADOS_FINANCIEROS.md)** — fuente de todas las cifras de este guion
- **[Plan de validación](../docs/PLAN_VALIDACION.md)** — qué falta para cerrar cada hallazgo
- **[Auditoría del 04-09-2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md)** — origen de estas correcciones
- [Flujo de caja y financiamiento](../Flujo%20de%20caja%20y%20financiamiento%20-%20TerraSense.xlsx) — generado por `finanzas/modelo.py`
- [Estudio de viabilidad](../docs/INFORME%201%20.docx.md#analisis-economico)
- [Especificaciones y filosofía](../docs/INFORME%201%20.docx.md#propuesta)
- [Comparativa competitiva](../docs/INFORME%201%20.docx.md#viabilidad-tecnica)

## Cuadro Maestro de Cifras Vigentes

Consultar el [resumen económico del README](../README.md#finanzas-y-modelo-económico) y los [resultados financieros generados](../docs/RESULTADOS_FINANCIEROS.md): BOM por componente, margen, inversión, crédito, flujo anual, VAN, TIR y payback. Estas tablas se actualizan con `python finanzas/modelo.py`.
