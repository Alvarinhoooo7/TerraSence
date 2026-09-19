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
| 1.1.4 Mercado — 12 pts | 2–3 y 11–13 | Producto, cliente, necesidad, Mercado Total/Mercado Accesible/Mercado Objetivo y competencia |
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

- El agricultor decide sobre riego y fertilización con información insuficiente o tardía.
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

## 4. Economía de mercado y Asignación de Recursos

TerraSense opera y se justifica dentro de una **economía de mercado**, modelo donde la interacción libre entre oferta y demanda determina la asignación de los recursos escasos. Se fundamenta en:

- **Asignación eficiente de recursos privados:** una empresa privada decide qué producir (equipos de medición) y cómo usar su capital, trabajo y tecnología para maximizar valor, respondiendo a una necesidad real del agro.
- **Formación libre de precios:** el precio ($349.990) no es fijado centralizadamente, sino que considera la estructura de costos (BOM de $81.184, importación, mano de obra), la disposición a pagar de los clientes y los sustitutos.
- **Soberanía del consumidor y bienes sustitutos:** el agricultor elige libremente cómo resolver su necesidad de información, ponderando sustitutos como medidores básicos (Bluelab, Hanna), laboratorios químicos o la asesoría empírica.
- **Incentivos y diferenciación:** la competencia obliga a la innovación continua para diferenciarse. TerraSense no compite por vender hardware crudo, sino por entregar valor a través de "decisiones" interpretadas agronómicamente.

**Estructura de Mercado:** **Competencia monopolística**.
Existen múltiples oferentes (fabricantes de sensores, laboratorios, asesores) que satisfacen necesidades similares (información de suelo), pero los productos están **diferenciados**. Cada actor tiene cierto poder de mercado sobre su nicho (TerraSense lo tiene gracias a su motor agronómico sin conexión y soporte local), pero el precio de equilibrio a largo plazo sigue disciplinado por la disponibilidad de sustitutos cercanos. Las barreras de entrada son moderadas (requiere integración de hardware y desarrollo de software), pero existe libre entrada y salida.

**Defensa:** “Operamos en competencia monopolística: la aplicación, el modo sin conexión y el diagnóstico agronómico local nos diferencian de un sensor genérico, pero nuestro precio está limitado por la existencia de medidores alternativos y los servicios de laboratorio”.

## 5. Principio económico: Costo de oportunidad y Trade-offs

> **El costo de oportunidad de una decisión es el valor de la mejor alternativa a la que se renuncia.**

En una economía de mercado, los recursos son escasos (tiempo, dinero, esfuerzo) y elegir implica siempre un *trade-off*. Para la decisión de compra del agricultor:

| Alternativa | Beneficio Obtenido | Costo de Oportunidad (A lo que se renuncia) |
|---|---|---|
| Laboratorio Químico | Máxima exactitud analítica, mayor número de analitos y certificación oficial. | Inmediatez (demora 15-30 días), medición frecuente y bajo costo por nuevo muestreo. |
| TerraSense | Diagnóstico inmediato en el campo, alta frecuencia de medición y prescripción. | La exactitud analítica y la validez química certificada del laboratorio. |
| No medir (Intuición) | Ahorro del costo del equipo o del servicio ($0 inicial). | La seguridad en la decisión; riesgo de pérdida de cultivo por estrés hídrico o sobre-fertilización. |

**Trade-off estratégico de la empresa:** TerraSense renuncia deliberadamente a competir en exactitud analítica. A cambio, provee **contexto, alertas, historial y acciones sugeridas**. Optimiza el recurso más crítico del agricultor: la oportunidad de tomar a tiempo una decisión de riego o fertilización.

**Conclusión:** “TerraSense sirve para el monitoreo frecuente y el laboratorio como referencia periódica y comprobación. Son bienes complementarios”.

## 6. Oferta y demanda: Equilibrio y Elasticidad

- **Demanda:** Agricultores, cooperativas e instituciones que valoran las decisiones rápidas en terreno. Esta demanda es **relativamente elástica frente al precio** de los bienes sustitutos (si un medidor de la competencia baja su precio agresivamente, perdemos tracción), pero **tiende a ser inelástica ante contingencias climáticas** (en extrema sequía, conocer la humedad del suelo pasa de ser un lujo a una necesidad operativa ineludible).
- **Oferta:** Equipos fabricados que TerraSense puede ensamblar, soportar y vender de forma rentable en Chile.
- Precio de lista propuesto: **$349.990 con IVA** ($294.109 neto).
- Meta Año 1: **200 unidades**.
- Equilibrio operativo: **176 unidades**; incluyendo servicio de deuda: **204 unidades**.

**Gráfico:** Oferta de pendiente positiva, demanda de pendiente negativa y equilibrio ilustrativo.
**Nota metodológica:** El precio y las 200 unidades son una **meta comercial y un plan financiero**, no un punto de equilibrio econométrico ya observado experimentalmente ni una demanda real ya validada.

## 7. Dos variaciones de demanda (Desplazamientos de la curva)

Factores exógenos alteran la disposición a pagar del mercado, desplazando toda la curva de demanda (ceteris paribus):

| Variación | Causa o Factor | Movimiento de la Curva | Efecto Económico |
|---|---|---|---|
| D1: Escasez hídrica y salinidad | Mayor urgencia por revisar humedad y conductividad eléctrica (CE) | Demanda se desplaza a la **derecha** | Aumenta la demanda; el monitoreo inmediato y la preservación del cultivo ganan valor. |
| D2: Aumento en el costo de fertilizantes | Sube el riesgo y costo de aplicar abono ciegamente | Demanda se desplaza a la **derecha** | Incrementa la disposición a pagar por certidumbre; medir para no desperdiciar fertilizante. |

**Visual:** Dos gráficos D → D’.

**No usar cifras genéricas de pérdida por hectárea en la defensa.** Las magnitudes que circulaban en versiones previas del proyecto ($350.000–$1.400.000/ha) carecen de respaldo identificable (cultivo, temporada, región). El argumento defendible en economía de mercado es conceptual: decidir a ciegas conlleva un riesgo asimétrico, y la certidumbre marginal (el valor de medir) crece directamente con la incertidumbre del entorno climático y de los precios de los insumos.

## 8. Dos variaciones de oferta (Desplazamientos de la curva)

Del mismo modo, factores ligados a los costos de producción y tecnología desplazan la curva de oferta:

| Variación | Causa o Factor | Movimiento de la Curva | Efecto Económico |
|---|---|---|---|
| O1: Alza del tipo de cambio (USD) o de fletes | Aumento en el costo de importación de la sonda (representa el 59% del BOM) | Oferta se desplaza a la **izquierda** | Contracción de oferta; aumentan los costos marginales de producción, reduciendo el margen de contribución. |
| O2: Innovación tecnológica productiva | Impresión 3D optimizada y ensamble PCBA externo evitan altos costos fijos de matricería | Oferta se desplaza a la **derecha** | Expansión de oferta; baja la inversión de capital (CAPEX) inicial, permitiendo lotes pequeños rentables. |

**Precisión sobre la exposición cambiaria:** El porcentaje de exposición del 88,6% fue descartado por falta de respaldo. Lo que sí es defendible: la sonda 7-en-1 concentra **$48.000 de los $81.184 del Costo de Materiales (BOM)** y la mayoría de los componentes son de importación directa. El impacto en la oferta por fluctuaciones de la divisa se proyecta ajustando el modelo financiero en `supuestos.json`.

## 9. Business Intelligence: economía unitaria y equilibrio

**En pantalla:** precio de venta, BOM completa con BME280 y carcasa 3D, margen de contribución y equilibrio operativo/con deuda del año 1. Usar la [tabla económica vigente](../README.md#finanzas-y-modelo-económico).

**Defensa:** el BME280 aporta tres lecturas ambientales locales del Grid. La API gratuita agrega el pronóstico de cinco días después de medir. Su costo directo es cero; el sensor y la impresión 3D se pagan por cada equipo. La nómina incluye el ensamblaje final.

## 10. BI: inversión, financiamiento y evaluación

**En pantalla:** aporte de socios de $9.000.000, crédito dimensionado, caja anual, **VAN, TIR y payback** del caso base. Todas las cifras se obtienen de [RESULTADOS_FINANCIEROS.md](../docs/RESULTADOS_FINANCIEROS.md) y del Excel maestro.

**Defensa:** evaluamos el proyecto durante cinco años con flujos mensuales. VAN al 20 %, TIR efectiva anual y payback usan el mismo capital inicial y flujo económico. El préstamo se revisa por separado mediante cuotas, caja y DSCR. El sueldo de los socios se incluye como costo laboral. El escenario de estrés reduce 35 % las ventas manteniendo marketing; crecimiento aumenta 50 % ventas y adquisición, recalculando personal e inventario.

## 11. Mercado objetivo y necesidades

**Cliente inicial:** pequeños y medianos agricultores chilenos; decisiones frecuentes de riego y fertilización; conectividad irregular; sensibilidad a análisis recurrentes, asesorías o suscripciones.

**Necesidades:** diagnóstico rápido, explicación sencilla, acciones, historial, portabilidad, uso sin internet, pago único y soporte local.

**Adopción inicial:** cultivos de mayor valor y agricultores con smartphone, disposición digital y compra directa o cofinanciada.

## 12. Mercado Total, Mercado Accesible y Mercado Objetivo

| Nivel | Tamaño | Significado |
|---|---:|---|
| Mercado Total | 175.556 explotaciones | Universo censal teórico (VIII Censo Agropecuario y Forestal 2021, INE) |
| Mercado Accesible | ~120.000 | **Supuesto sin tabla de respaldo**: no aplica región, superficie, rubro ni disposición a pagar |
| Mercado Objetivo Año 1 | 200 | Meta comercial: 0,17 % del Mercado Accesible |
| Mercado Objetivo acumulado 5 años | 2.550 | 2,13 % del Mercado Accesible (200 + 350 + 500 + 650 + 850) |

**Gráfico:** embudo Mercado Total → Mercado Accesible → Mercado Objetivo.

**Lectura crítica:** el Mercado Total tiene fuente censal ([INE, resultados finales](https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales)); **el Mercado Accesible y el Mercado Objetivo son supuestos internos**. Las 200 ventas nacen de superar el equilibrio con deuda (205 u), no de demanda observada, y deben validarse en terreno. Una explotación censada tampoco equivale a un cliente ni a un equipo.

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
- **Año 1 (200 u — Meta 0,17 % Mercado Accesible / 0,11 % Mercado Total):** Venta directa digital autogestionada por los socios:
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
| **Cobertura de deuda estrecha el año 1** | **DSCR 0,72, bajo el criterio interno de 1,3** | Un solo crédito a 10 años, reserva dimensionada y cotización completa antes de firmar |
| Metas de venta no validadas | Son metas financieras, no preventas cerradas | Escenario de estrés a 130 u en el modelo; preventas y piloto antes de comprometer inventario |
| **Hardware sin ensayar** | PCB sin rutear, sin firmware en el repositorio, sin ensayos de autonomía ni sellado | No fabricar desde el archivo actual; rediseño, ERC/DRC y ensayos antes de comercializar |
| **Cumplimiento normativo abierto** | SUBTEL, baterías, consumidor y Ley 21.719 (vigente 01-12-2026) | Revisar expediente del producto terminado antes de vender, no del módulo |

## 15. Conclusión

1. TerraSense opera en una economía de mercado bajo competencia monopolística, con libertad de precio y sustitutos reales.
2. Su costo de oportunidad está declarado: renuncia a precisión de laboratorio para ganar inmediatez, frecuencia, portabilidad y prescripción.
3. La oferta es sensible al tipo de cambio: la sonda concentra el 59 % del costo de materiales y casi todo el BOM es importado. La demanda crece con la escasez hídrica y con el costo de decidir a ciegas.
4. La evaluación incluye **VAN, TIR efectiva anual y payback del proyecto**, con flujos mensuales a cinco años. Consultar la tabla de [resultados financieros](../docs/RESULTADOS_FINANCIEROS.md). La remuneración de los socios ya está incluida en nómina.
5. **El primer año es el riesgo.** El DSCR de 2027 es **0,72**, bajo nuestro criterio interno de 1,3, y el escenario de estrés (−35 % de ventas) da un VAN de **−$50.774.058**. Si ese escenario se materializa, corresponde **redimensionar el negocio**, no estirar el plazo de la deuda.
6. La oportunidad radica en **transformar datos agronómicos en decisiones ejecutables sin pretender reemplazar al laboratorio químico** — y en decirlo con los límites explícitos, que es lo que hace defendible el trabajo.

> “TerraSense no promete saber más que un laboratorio; promete ayudar al agricultor a decidir mejor entre un análisis y el siguiente”.

---

# Preguntas de defensa (Batería Completa)

### 1. ¿Cómo se financia el desembolso inicial y por qué un banco prestaría a una empresa recién creada?
El desembolso inicial es de **$11.317.378**, financiado con un **pie propio de los socios de $9.000.000** ($4.500.000 cada uno, 50 % y 50 %) y un **crédito bancario de $30.000.000 a 10 años**, con cuota fija de $419.842 al 12 % efectivo anual. El pie equivale al **30 % del crédito**: es el capital propio que el banco exige antes de desembolsar el suyo, no se descuenta del principal y no se devuelve. El crédito es mayor que el desembolso porque también financia la **caja de arranque** que sostiene los primeros 24 meses, durante los cuales la caja no baja de $13.521.745.

**La respuesta honesta a la segunda parte: todavía no sabemos si un banco prestaría.** No tenemos oferta bancaria. La tasa del 12 % efectivo anual y el 2 % de gastos de apertura son presupuestos, no un CAE cotizado. FOGAPE es una garantía estatal sujeta a evaluación, no un subsidio ni una aprobación automática. Si el banco no ofrece el plazo o exige garantías inaceptables, **reducimos el lanzamiento y validamos preventas**; no lo sustituimos por un crédito personal.

### 2. ¿Por qué no dependen de un subsidio estatal como CORFO?
Porque el proyecto debe poder nacer y pagar sus deudas por sí mismo. Postular sigue siendo una opción abierta y beneficiosa: si se adjudica, sustituye deuda cara y mejora el resultado. El modelo no lo supone.

### 3. ¿Cómo se ve la caja del primer año?
El EBITDA de 2027 es de **$4.426.234** y el servicio de deuda de **$5.038.098**, lo que deja un **DSCR de 0,72**: por cada peso de deuda que hay que pagar, la operación genera 0,72 y el resto sale de la caja de arranque. **Está por debajo de nuestro criterio interno de 1,3 veces.** La caja nunca baja de **$13.521.745** en los primeros 24 meses, pero la reserva objetivo queda **$615.379** corta en su punto más bajo, el mes 19.

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
