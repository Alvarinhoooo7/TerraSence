# Modelo económico revisado — 4 de septiembre de 2026

Este documento reemplaza los supuestos económicos anteriores, no constituye una cotización bancaria ni una validación de demanda. Año 1: 2027. Moneda: CLP nominales, reajuste supuesto de 3% anual. Los **$9.000.000 aportados por los socios ($4.500.000 cada uno) se consideran disponibles**, según su confirmación; no se cuestiona su capacidad de aportarlos. Aportar dinero no asegura que un banco financie el saldo.

## Decisión propuesta

Precio de lista de prueba **$349.990 IVA incluido** para venta directa del equipo, sin prometer NPK cuantitativos ni certificaciones no obtenidas. Es una hipótesis comercial defendible por costos y referencias, no el «precio correcto» demostrado. Validarlo con pilotos pagados antes de comprar volumen. No ofrecer descuentos permanentes, cuotas subsidiadas ni distribución mayorista utilizando el margen de venta directa.

Financiamiento propuesto: **un crédito a 10 años en pesos y tasa fija**, sujeto a una oferta real, en lugar de devolver $5 millones en el primer año. Comparar también 5 años; 15 años ahorra relativamente poco al mes y aumenta mucho los intereses y la exposición de un producto tecnológico. El modelo usa 12% efectivo anual y 2% inicial para gastos de contratación: ambos son presupuestos, **no CAE ni tasa bancaria observada**. Si el banco no ofrece el plazo o pide garantías inaceptables, reducir el lanzamiento y validar preventas; no sustituir automáticamente por un crédito personal.

Resultados, monto calculado, cuotas, saldo pendiente y mínimos de caja están en [RESULTADOS_FINANCIEROS.md](RESULTADOS_FINANCIEROS.md). El Excel contiene la misma información, 180 meses y tres escenarios. No se vende la recomendación de diez años como certeza: el primer año tiene cobertura de deuda estrecha. Exigir cotización total, revisar una cobertura de caja de al menos 1,3 veces como criterio interno y probar meses débiles antes de firmar. La reserva financia transitorios, no pérdidas permanentes.

## Referencias de competencia

Precios exhibidos consultados el 04-09-2026; confirmar despacho, factura, vigencia y condiciones al cotizar. No comparar una sonda suelta con un instrumento completo como si fueran equivalentes.

| Referencia | Precio exhibido CLP | Alcance y limitación de comparación |
|---|---:|---|
| [Hanna Chile HI9814](https://hannachile.com/producto/medidor-portatil-e-impermeable-de-ph-ce-tds-temperatura-groline-hidroponia-hi9814/) | $491.827 | Instrumento pH/CE/TDS/temperatura para soluciones hidropónicas; no mide humedad directa del suelo. TDS no es otro sensor independiente. |
| [Bluelab Pulse, distribuidor Delaferia](https://delaferia.cl/products/pulse-meter-bluelab-temperatura-humedad-y-ec) | $538.990 | Equipo con app para humedad, CE y temperatura; referencia funcional más cercana. No es prueba de NPK individuales. |
| TerraSense, propuesta | $349.990 IVA incluido | Aprox. 29% bajo Hanna y 35% bajo Pulse. Producto aún en validación: no equivalencia de precisión, garantía técnica o madurez. |

La [documentación de Bluelab](https://support.bluelab.com/bluelab-pulse-meter-faq) distingue el seguimiento mediante conductividad del análisis de nutrientes individuales. No justificar nuestro precio contando tres registros NPK como tres análisis químicos. El precio anterior de $249.990 se conserva únicamente como sensibilidad: con remuneraciones, comercialización y soporte completos no debe defenderse con la antigua utilidad inflada.

## Costos y unidades

Fuente única editable: [supuestos.json](../finanzas/supuestos.json). [BOM](../PCB/BOM_TerraSense.xlsx) y flujo financiero se generan desde allí. Valores de compras presupuestados **netos** salvo indicación expresa. La placa de carga/boost cuesta $900 según socios; se presupuesta ese costo completo y no se inventa recuperación de IVA sin factura.

ESP32-WROOM-32 en placa de desarrollo, LiPo 2000 mAh, PCB USB-C carga/boost, SP3485, JST de batería de tres pines, pulsador y tres LED SMD provisionales están incluidos. No se agregan CH340, TP4056 ni MT3608 discretos por separado. El USB-UART incorporado en el devkit no es otra compra. El [precio de referencia AFEL de un devkit ESP32](https://afel.cl/collections/placas-esp32) es $8.000 exhibidos; el neto asumido es $8.000/1,19. No se presume un descuento por cientos de unidades sin cotización. El presupuesto no compra BME280: el ambiente mostrado actualmente viene de internet, no de un sensor conectado.

El lote de reposición de 10 equipos es una **política de simulación**, no un MOQ del proveedor. El inventario cubre ventas del mes y los dos siguientes, se compra antes de vender y se redondea al lote; al comienzo solo se dispone del lote calculado para los primeros dos meses. Recalcular con lead times y mínimos reales. Las compras consumen caja; el costo vendido usa promedio ponderado y el stock se concilia, sin cargar dos veces todo el inventario como gasto.

Costos variables: BOM vendida, 3% de BOM por merma, 5% por reposiciones/garantía, envío neto de $6.000 y comisiones presupuestadas de 5% del precio bruto. Merma y garantía se tratan como desembolso prudencial del período, no como dinero ganado. No hay MOD de $9.000 adicional: el montaje final ya está en la nómina. El montaje externo SMD de la portadora es un servicio distinto incluido en BOM.

El 5% comercial es un supuesto agregado, no una tarifa verificada de una pasarela: incluye el riesgo de la tarifa adicional del 2% por pagos externos en [Shopify Basic](https://www.shopify.com/cl/precios). Cotizar pasarela, IVA de comisiones, devoluciones y cuotas; si el costo efectivo supera el presupuesto, corregirlo. No se incluyen ventas a crédito ni descuentos de distribuidor. Ambas estrategias requieren un escenario nuevo.

## Ventas, marketing y escalamiento

Base de trabajo: 200, 350, 500, 650 y 850 unidades/año. No se las llama «conservadoras» porque sean números pequeños: 200 ventas de un producto nuevo pueden ser difíciles. Distribución mensual explícita en JSON, concentrada en el segundo semestre; **es estacionalidad hipotética que se repite**, no datos históricos ni pedidos firmados. Desde el sexto año se prolonga un 5% de crecimiento para visualizar deuda: esa extensión no valida quince años de negocio.

Marketing: $30.000 por venta objetivo, comenzando con $6 millones anuales. Ejemplo de embudo a validar: 60% de ventas atribuibles a anuncios, CAC publicitario de $50.000; con cierre de 5% sobre contactos calificados se necesitarían 2.400 contactos y CPL de $2.500 para 120 ventas. Las otras 80 provendrían de pilotos, recomendaciones y contacto directo: tampoco están demostradas. No confundir objetivos del embudo con conversiones observadas.

El escenario de estrés vende 35% menos **sin reducir marketing**. Crecimiento aumenta 50% ventas y gasto de adquisición, y recalcula personal, inventario y servicios; puede exigir más caja aun siendo rentable. Subir presupuesto solo después de medir CAC por cohorte, conversión, devoluciones, margen después de soporte y capacidad de entrega. Evaluar campañas en lotes pequeños, detener las que destruyen contribución; pagar más no garantiza más ventas.

## Personas: desde cuándo y por qué

Contador **externo desde mes 1**, incluso antes para apertura, régimen tributario y diseño de remuneraciones. $120.000/mes base más incremento por personal, reajustado. Hay ofertas públicas de servicios externos por volumen, pero no todos incluyen inventario, nómina y renta anual; [referencia de planes contables](https://www.contadoresdigitales.cl/planes-contables/). Solicitar propuesta completa. **No existe aquí una regla «en año X la ley obliga a contratar contador interno»**: existen obligaciones tributarias desde el inicio y una necesidad operativa de asesoría.

Los socios reciben remuneración económica por trabajar, separada del aporte. Base mensual por socio en moneda del año inicial: $600.000, $700.000, $850.000, $1.000.000 y $1.200.000, además del reajuste anual. No son sueldos líquidos. Desde año 6 se mantiene el último escalón real. La condición laboral/tributaria de socios con control de la empresa debe revisarla el contador; no se presume un contrato subordinado válido solo para obtener deducciones.

Se reserva 35% sobre sueldos para gratificación, cargas patronales y otros costos laborales. **No es una tasa legal única ni una liquidación salarial**. Revisar contratos, jornada, mutual, AFC, vacaciones, reemplazos y evolución previsional; someter también a estrés de 45%. El [ingreso mínimo informado por la Dirección del Trabajo](https://www.dt.gob.cl/portal/1626/w3-article-60141.html) y la [gratificación legal](https://dt.gob.cl/legislacion/1624/w3-article-106600.html) no deben sustituirse por una carga patronal fija del 5%. El mínimo aplicable a 2027 y cada año posterior debe actualizarse, no inferirse del valor de 2026.

Contratar por capacidad antes de incumplir entregas:

- Producción: 2,25 horas por equipo; socios destinan 500 horas combinadas al año. Cada FTE contratado aporta 1.400 horas productivas presupuestadas. Contratación en escalones de 0,5 FTE, no personas fraccionarias. En base aparece ayuda técnica desde año 2; recalcular con el tiempo real de ensamblaje, pruebas y retrabajo.
- Comercial/soporte: 2 horas por venta más 0,5 horas por equipo activo/año; socios disponen de 900 horas combinadas. La base activa supone cinco años de uso. Se contrata al exceder esa capacidad, en escalones de 0,5 FTE. Tiempo comercial incluye una asignación promedio a consultas no convertidas; validarlo con el embudo.
- Los socios conservan aproximadamente 1.400 horas combinadas de estas tareas más tiempo de desarrollo, dirección, contabilidad operativa y marketing. El modelo no supone producción ilimitada gratis. Si soporte o CAC consumen más horas, adelantar contratación.
- Agencia: $250.000/mes de gestión desde objetivo de 650 ventas/año (año 4 base), aparte de pauta. Es una opción de organización, no obligación legal; comparar con una persona interna y honorarios reales.

Servicios digitales: $150.000/mes más $1.200 por equipo activo/año para capacidad y mantenimiento operativo. Incluye un presupuesto conjunto de tienda, backend, correo, mapas y clima, no tarifas garantizadas. [Open-Meteo reserva su modalidad gratuita al uso no comercial](https://open-meteo.com/en/pricing): antes de vender, contratar acceso comercial/proxy, no exponer una clave privada en la app. No prometer servicio de nube gratuito «para siempre»; definir duración contractual, exportación de datos y funcionamiento local.

## Caja, impuestos y financiamiento

Se separan desembolso inicial, activos/reinversión, inventario, gasto operativo, IVA, impuesto y amortización. Reserva objetivo: **tres meses de gastos fijos (incluido marketing) y cuota, más 10% del desembolso inicial**. La reserva está dentro de la caja; no se vuelve a descontar como gasto ni se suma a la inversión dos veces. El crédito se dimensiona en incrementos de $100.000 para mantenerla inicialmente y durante los primeros 24 meses del escenario base. Una reserva mínima no es una garantía de supervivencia: cotizaciones e incertidumbre pueden exigir más margen.

IVA: ventas netas de IVA; crédito de compras documentadas disponible desde el mes siguiente. Se inmoviliza el débito en el mes de venta y no se utiliza recuperación inicial de activos/desarrollo/servicios; tratamiento prudente pero **no un calendario F29 exacto**. Impuesto: aproximación de caja Pro Pyme con pérdidas arrastradas; reserva anual al cierre, no pago legal en diciembre. Antes de operar, agregar PPM mensuales, declaración de abril, IVA efectivo y deducibilidad con contador. No se publica «flujo tributario definitivo» ni impuesto personal neto de los socios.

Tasas empresariales de referencia: 12,5% para 2027, 15% para 2028 y 25% posteriormente bajo régimen/condiciones de la [Circular SII 53/2025](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf). Comprobar que la empresa califica y actualizar legislación; el régimen transparente tendría otro tratamiento.

El [FOGAPE para pequeña empresa publicado por BancoEstado](https://nwm.bancoestado.cl/content/bancoestado-public/cl/es/home/inicio---bancoestado-pequena-empresa/productos/garantias-estatales---bancoestado-pequenas-empresa/fogape-para-el-pequeno-empresario---bancoestado-pequenas-empresa.html) menciona hasta diez años, sujeto a evaluación. No extrapolar quince años a ese producto ni tratar FOGAPE como subsidio o condonación. Solicitar cotización CLP fija a 5 y 10 años con todos los cargos, garantías personales, gracia y comisión de prepago. La ficha general de crédito no prueba acceso de una empresa sin ventas.

La hoja compara igual principal a 5/10/15 años y muestra toda su amortización, no solo cinco años con la deuda restante oculta. También muestra el esquema de dos préstamos: $5 millones al 15% pagados capital e interés al mes 12, resto amortizable a cinco años. No se mezclan cuotas anuales con mensuales. Un prepago futuro puede reducir intereses, pero no se da por hecho: realizarlo solo con caja excedente, inversión del siguiente período cubierta y condiciones cotizadas.

FCFF = caja operativa después de impuestos calculados **sin** deducir intereses, menos reinversión e inventario/IVA. FCFE = caja luego de intereses, capital e impuesto con financiamiento. VAN del proyecto a 20% con flujos mensuales, capital inicial comprometido y sin valor terminal; no sumar sueldos como retorno de inversión. No hay dividendos automáticos ni «ganancia neta por socio» calculada desde remuneraciones brutas. Definir dividendos/prepago anualmente con información real y reservas antes de estimar TIR del capital propio.

## Condiciones para pasar de plan a inversión

Antes de crédito y producción: BOM cotizada, especificación energética comprobada, piloto técnico y ventas pagadas con margen positivo; contrato bancario efectivo; régimen y remuneraciones revisados; presupuesto de validación suficiente; obligaciones SUBTEL, batería, consumidores y datos revisadas. Si las ventas de estrés se materializan, redimensionar el negocio: no tapar pérdida recurrente con un plazo de quince años. El [plan de validación](PLAN_VALIDACION.md) distingue correcciones de repositorio de trabajo físico/regulatorio pendiente.
