# Auditoría de los README de TerraSense

Fecha: 4 de septiembre de 2026. Moneda: CLP, salvo indicación contraria.

## Dictamen y alcance

La documentación no permite afirmar todavía que TerraSense sea un producto comercial validado ni que su rentabilidad esté probada. Hay cálculos reproducibles, pero conviven versiones distintas de costos y hardware, una evaluación financiera que mezcla perspectivas y prestaciones documentadas que el código no implementa.

Esto no demuestra que el negocio sea inviable. Demuestra que el veredicto de viabilidad publicado es más concluyente que su evidencia. El precio de $249.990 puede ser una hipótesis comercial razonable; su rentabilidad depende de resolver costos de canal, remuneraciones, capital de trabajo y validación del producto.

Se revisaron los seis README: raíz, Comercialización de Tecnologías, PCB, App, Web y Supabase. Se contrastaron con la planilla maestra `Flujo de caja y financiamiento - TerraSense.xlsx`, el BOM de PCB, archivos KiCad, código de app/web, configuración y migraciones de Supabase y documentos de viabilidad vinculados. Se consultaron fuentes públicas para cifras y reglas externas.

Los hallazgos distinguen **error comprobado**, **supuesto no validado** y **limitación de comprobación**. No se probaron sensores físicos, no se certificó hardware ni se accedió a contabilidad, cotizaciones privadas o estado productivo de Supabase/Vercel. La revisión de código respalda contradicciones documentales concretas; no constituye una auditoría completa de seguridad o metrología.

**Aclaración de los socios durante la revisión:** el aporte propio de $8.900.000 ($4.450.000 cada uno) es entregable. Se acepta como disponibilidad confirmada por el usuario; no se objeta ese monto. La comparación de alternativas de deuda está en la sección 8.

## 1. Economía: errores y omisiones prioritarios

### E01 — Crítico: no existe una economía unitaria única

Referencias: `README.md:211`, `README.md:297`; Comercialización, secciones 9 y 10; Excel, `COSTOS UNITARIOS!D6:D24`.

| Concepto | README raíz, secciones 5.1–5.2 | Resumen, Comercialización y flujo financiero |
|---|---:|---:|
| BOM | $66.250 | $70.656 |
| Costo variable entregado | $86.551 | $91.309 |
| Contribución unitaria | $123.525 | $118.767 |
| Margen sobre venta neta | 58,80 % | 56,54 % |
| Costo variable de 200 unidades | $17.310.200 | $18.261.800 |

Las partidas del BOM de $66.250 sí suman correctamente. El flujo utiliza la otra versión: $18.261.800 / 200 = $91.309. La diferencia es $951.600 de costo en el primer año, antes de impuestos.

El Excel conserva **dos celdas 18650 de 3.000 mAh**, conectores y componentes distintos, mientras el README presenta una LiPo de 2.000 mAh y módulo combo. El BOM de PCB describe TP4056 y MT3608 discretos, CH340C, AO3401A y MMBT3904; el README PCB presenta otra lista de referencias y componentes. No es defendible llamar a estos documentos una única lista industrial auditada.

Acción necesaria: fijar una revisión de hardware, cotizarla y derivar de ella todos los cuadros. No escoger el costo menor solo porque mejora los indicadores.

### E02 — Crítico: el VAN mezcla inversión del proyecto con flujo del accionista

Referencias: `README.md:297`; Excel, `PROYECCIÓN!C24:H25`.

Se descuenta la inversión total de $26.548.500 en el año cero, pero en los años posteriores se restan intereses y amortizaciones de deuda. No se registra el ingreso inicial de los $17.648.500 de deuda en esa serie. Por ello no es un flujo puro del proyecto ni un flujo coherente del patrimonio.

Hay dos evaluaciones válidas que deben separarse:

- **Proyecto:** inversión total inicial y flujos operativos después de impuestos, inversión posterior y variaciones de capital de trabajo, sin servicio de deuda. Tasa coherente con el riesgo y costo de capital del proyecto.
- **Socios:** aporte inicial de $8.900.000 y flujos después de deuda, inversiones, capital de trabajo y eventuales aportes adicionales. Tasa de retorno exigida al patrimonio.

La mezcla actual puede subestimar el retorno al patrimonio; no es necesariamente un maquillaje al alza. Pero invalida su interpretación económica. Cambiar únicamente el año cero a −$8.900.000 arrojaría aproximadamente $20,24 millones de VAN al mismo 20 %, **sin que ese número sea una valoración aprobada**: siguen pendientes caja operativa, impuestos, reinversiones y justificación de tasa.

### E03 — Alto: 166 unidades todavía producen pérdida

Referencias: `README.md:289`; Excel, `GASTOS FIJOS 5 AÑOS!C29`.

```text
Q = (16.946.852 + 811.190 + 2.014.850) / 118.767
  = 166,4847 unidades
Mínimo entero sin pérdida = 167 unidades
Resultado antes de impuestos a 166 unidades = −57.570
Resultado antes de impuestos a 167 unidades = +61.197
```

La planilla usa `ROUND`; corresponde redondear hacia arriba para una cantidad mínima indivisible. El margen de seguridad sobre 200 ventas es **16,5 % usando 167 unidades**, no 20,5 %. La holgura sobre el umbral es otra razón: 200 / 167 − 1 = 19,76 %.

Con el costo nuevo de $86.551, el equilibrio sería 160,072, es decir, **161 unidades**. Ninguna de las dos versiones respalda exactamente 166 como mínimo.

### E04 — Crítico: pagar gastos no equivale a pagar deuda ni a financiar crecimiento

El año 1 produce −$3.275.221 después de amortizaciones, aun vendiendo 200 unidades. Con los supuestos antiguos y su impuesto simplificado del 25 %, harían falta aproximadamente **237 ventas** para cubrir también el servicio anual de deuda sin consumir caja inicial. Este umbral no incorpora comisiones omitidas ni variaciones de capital de trabajo.

Consumir caja inicial no es por sí mismo un problema. Lo no demostrado es que esa caja alcance mes a mes. La planilla fija `INVERSIONES!C26 = 14.806.910` como constante, sin memoria mensual que respalde la frase “dimensionado exactamente”.

La explicación de tres meses de gastos fijos más 100 BOM da:

```text
16.946.852 / 4 + 100 × 70.656 = 11.302.313
Diferencia frente a 14.806.910 = 3.504.597
```

Si se usa el costo variable completo de 100 unidades, da $13.367.613. Ambas interpretaciones difieren del monto publicado. El excedente puede justificarse, pero debe explicarse como reserva u otro destino.

Faltan calendario de compras, IVA de importación, ventas estacionales, plazos de cobro, pagos bancarios, inventario de seguridad y cuentas por cobrar institucionales. También falta modelar cómo cambia esa necesidad con ventas de 200 a 850 equipos. Un flujo acumulado de evaluación no es el saldo bancario disponible. Repartir todos los flujos positivos no deja automáticamente dinero para crecer.

### E05 — Crítico: $79.588.754 no son ingresos líquidos ni retorno puro del capital

Referencia: `README.md:329`; Excel, `PROYECCIÓN!D56:I63`.

La suma publicada es:

```text
51.042.636 de sueldos BRUTOS
+ 32.996.118 de dividendos proyectados antes de impuestos personales
− 4.450.000 de aporte inicial
= 79.588.754
```

La operación suma correctamente; la etiqueta “limpios en el bolsillo” es falsa. Aplicando solo los sueldos líquidos aproximados que el propio README publica, estos suman $41.580.000 y el resultado baja a **$70.126.118**, todavía antes de determinar los impuestos personales sobre retiros y sin validar la caja distribuible. No es un nuevo resultado líquido definitivo.

Además, el sueldo remunera cinco años de trabajo: no corresponde incluirlo como ganancia de la inversión para vender un multiplicador de 17,9×. Deben presentarse por separado remuneración del trabajo, distribuciones por propiedad y rentabilidad del patrimonio. Pro Pyme contempla tributación de los propietarios sobre retiros/distribuciones y sus créditos correspondientes. [SII: regímenes tributarios](https://www.sii.cl/destacados/modernizacion/tipos_regimenes_mt.html).

### E06 — Alto: faltan comisiones variables de venta y financiación de cuotas

Referencias: `README.md:193`, `README.md:211`; Comercialización, sección 13.

El modelo presupone Shopify, Webpay/Mercado Pago y cuotas, pero el costo variable solo incluye BOM, flete, merma, garantía y ensamble. El abono fijo de la tienda no cubre todas las comisiones por transacción.

La tarifa pública consultada de Shopify Basic indica **2 % por proveedores de pagos externos**, además de la suscripción. Sobre $249.990, son $4.999,80 por venta afectada. Debe modelarse qué porcentaje de ventas usa esa vía, las condiciones de la pasarela y el costo de cuotas sin interés. No todas las transferencias o canales tendrán idéntico costo. [Shopify Chile: precios](https://www.shopify.com/cl/precios).

Si ese 2 % se aplicara a todas las ventas de los cinco años y fuera un gasto adicional deducible, el VAN del modelo publicado pasaría de +$2,59 millones a **−$2,49 millones**, manteniendo lo demás igual. Es sensibilidad sobre el modelo existente, no una evaluación financiera corregida.

También hay un error simple en las cuotas: $249.990 / 3 = **$83.330**, y / 6 = **$41.665**. El rango de $41.600–$50.000 no representa 3 a 6 cuotas.

### E07 — Alto: el 25 % Pro Pyme no corresponde uniformemente a los años del Excel

El Excel ubica el año cero en 2026 y los años operativos en **2027–2031**. La Circular 53 de 2025 del SII establece rebajas transitorias: **12,5 % en 2027 y 15 % en 2028**, con sus condiciones; identifica 25 % como tasa permanente. Usar 25 % uniforme debe explicitarse como simplificación conservadora y actualizarse por ejercicio. [SII: Circular 53](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf).

No basta cambiar porcentajes: la base tributaria Pro Pyme puede diferir del resultado contable, particularmente por gastos pagados y depreciación tributaria. Además, `PROYECCIÓN!D16:H16` multiplica directamente utilidad por tasa; al estresar el modelo hasta pérdida, genera un impuesto negativo, que no equivale a un reembolso inmediato. Debe modelarse el tratamiento de pérdidas y PPM.

La fila “utilidad operacional” ya resta intereses: corresponde a resultado antes de impuestos, no a utilidad operativa EBIT.

### E08 — Alto: remuneraciones y horas no están reconciliadas

Referencias: `README.md:266`, `README.md:284`; Excel, `GASTOS FIJOS 5 AÑOS!D8:G8`.

El sueldo mínimo de **$553.553 es una cifra real vigente desde mayo de 2026**, no un error numérico. Pero se utiliza como sueldo del primer año operativo 2027 y como base casi fija para contrataciones posteriores sin explicitar reajustes. [Dirección del Trabajo: ingreso mínimo](https://www.dt.gob.cl/portal/1626/w3-article-60141.html).

El costo patronal uniforme de 5 % no es una proyección suficiente: la reforma previsional aumenta gradualmente la cotización del empleador y deben agregarse los otros componentes según el contrato. No debe duplicarse el SIS si ya está incorporado en la tasa aplicable. La gratificación debe presupuestarse según la modalidad y condiciones legales que correspondan. [Previsión Social: calendario de implementación](https://previsionsocial.gob.cl/wp-content/uploads/2025/08/Nota-Tecnica-Reforma-de-Pensiones-Ley-N%C2%B021.735.pdf).

Hay además una posible duplicación: se cobra $9.000/unidad de mano de obra y a la vez se cargan sueldos de quienes realizan ese ensamble. Solo sería correcto si representan trabajos o pagos diferentes, documentados. Eliminar uno sin revisar el contrato también sería incorrecto.

El costo unitario presupone 1,5 h/unidad y la dotación 2,25 h/unidad. A 200 equipos son 300 frente a 450 horas. Falta asignar el tiempo de calibración, prueba, embalaje, retrabajo y soporte. Los gastos fijos sí suman correctamente, pero sumar bien no valida estas premisas.

### E09 — Alto: aprobación y costo de FOGAPE son supuestos

Referencias: Comercialización, pregunta de defensa 1; Excel, `PARÁMETROS!C33:C37`.

La garantía no convierte un crédito en aprobado. BancoEstado indica evaluación crediticia previa y comisiones de garantía. No hay oferta bancaria individual adjunta que respalde 10 % a cinco años, 15 % a un año o que un aporte de 34 % sea condición universal suficiente. [BancoEstado: FOGAPE pequeña empresa](https://nwm.bancoestado.cl/content/bancoestado-public/cl/es/home/inicio---bancoestado-pequena-empresa/productos/garantias-estatales---bancoestado-pequena-empresa/fogape-para-el-pequeno-empresario---bancoestado-pequenas-empresa.html).

La amortización publicada es coherente con **pagos anuales**. La cuota anual dividida por doce no es el cálculo de un crédito francés con amortización mensual: deben modelarse la tasa efectiva mensual, 60 cuotas y gastos bancarios reales.

“Sin subsidios no reembolsables” es defendible como supuesto. “Sin dependencia estatal” es excesivo si el acceso a deuda depende de una garantía estatal. “Autofinanciado” también requiere precisión cuando 66,5 % proviene de terceros.

### E10 — Alto: no está validado el costo puesto en taller

El Excel rotula el arancel como calculado sobre FOB; el cálculo general de derechos se realiza sobre el valor aduanero/CIF. Deben separar mercancía, flete, seguro, derechos según origen y tratado, gestión del courier/agente e IVA. La documentación de Aduanas distingue expresamente FOB, flete, seguro y valor CIF. [Aduanas: declaración e impuestos de importación](https://www.aduana.cl/aduana/site/docs/20071206/20071206180427/informe_analisis_sistema_declaracion_de_importacion_y_pago_simultaneo__dips__de_carga_y_franquicias.pdf).

El flete/arancel de $980 del nuevo BOM no puede interpretarse como internación universal de todo el equipo: solo el 6 % de una sonda de $48.000 sería $2.880, antes de transporte, si corresponde ese derecho y si la sonda no está ya nacionalizada. No añadirlo de nuevo cuando la cotización ya lo incluye.

Existe mezcla de bases en el despacho: se usa “$5.000 + IVA” para cargar $6.000 como costo en un modelo declarado neto. Son $5.950 de desembolso; con crédito fiscal recuperable, el costo neto sería $5.000. Se necesita aclarar la condición tributaria de cada precio.

### E11 — Alto: precio de sonda plausible, calidad y suministro no verificados

Los $48.000 **no son absurdos como orden de magnitud**. La consulta encontró anuncios genéricos de sondas 7-en-1 en Chile por $31.925, $46.497 y $70.391. Son precios exhibidos en publicaciones, no cotizaciones de un mismo SKU, cantidad, IVA y plazo de entrega. [Anuncio 1](https://www.mercadolibre.cl/sensor-de-temperatura-y-humedad-del-suelo-7-en-1-rs485-y/p/MLC2054452096), [anuncio 2](https://www.mercadolibre.cl/sensor-de-temperatura-y-humedad-del-suelo-7-en-1-rs485-y-con/p/MLC2024707551), [anuncio 3](https://www.mercadolibre.cl/sensor-de-suelo-modbus-rs485-7-en-1-mide-la-humedad-del/p/MLC2054677456).

El precio no confirma exactitud, alimentación a 5 V, material 316L, mapa Modbus ni capacidad de suministrar 100 unidades consistentes. El código identifica un SKU de AliExpress y admite que el mapa de registros sigue pendiente de confirmación. Deben archivar ficha, oferta de 10/50/100 unidades y resultados del lote piloto.

Electrónica por miles de pesos, impresión 3D y externalización SMT son hipótesis plausibles. No hay una oferta industrial adjunta que pruebe simultáneamente $1.900 por PCBA terminada, $1.800 por carcasa sellada y el resto del BOM. Una búsqueda genérica de AliExpress no sustituye una cotización trazable.

### E12 — Alto: infraestructura y soporte crecen con equipos instalados

La app consulta `api.open-meteo.com`. La API gratuita del proveedor es para uso no comercial; un producto comercial debe presupuestar el servicio autorizado o una infraestructura alternativa. La licencia de los datos no debe confundirse con las condiciones de uso gratuito del endpoint. [Open-Meteo: precios y uso comercial](https://open-meteo.com/en/pricing).

Los $841.580–$1.000.000 anuales agrupan Shopify, Supabase, tiendas, mapas, dominio y Expo, pero no desglosan suficientemente tarifas, facturador chileno, correo y clima comercial. No se puede concluir que esa bolsa alcance. También faltan horas de actualizaciones de app, diagnóstico de fallas, compatibilidad con teléfonos, recuperación de cuentas y soporte agronómico.

La promesa de pago único puede mantenerse, pero requiere una reserva por cohorte y un plazo de soporte. La obligación crece con los equipos instalados, aunque baje la venta nueva. La cifra de 1.700 equipos corresponde al inicio del año 5; al final serían 2.550 si no hay bajas ni reemplazos.

### E13 — Medio/alto: contabilidad externa es razonable; el respaldo es insuficiente

Los $70.000/mes no son por sí mismos una cifra inverosímil. Un proveedor consultado publica planes de $50.000 + IVA para hasta 80 facturas y $100.000 + IVA para hasta 120. Su página no explicita todo el servicio laboral e importador que TerraSense necesitaría; se debe cotizar el alcance exacto. [Contadores Digitales: planes](https://www.contadoresdigitales.cl/planes-contables/).

La página de Contabilízate citada por el proyecto ofrece evaluación a medida; no verifica por sí sola la banda de 1,5–2,5 UF atribuida. La conversión a pesos del README presupone UF de $38.000 sin fecha.

No es riguroso afirmar que todo el trabajo contable demorará 3–4 horas/mes: las 17 facturas de venta excluyen compras, importaciones, inventarios, conciliación de pasarelas, deuda, remuneraciones y cierres. Tampoco cuadra el extremo superior del comparativo de contador interno: $1.300.000 bruto más 25 % y cargas supera $1.350.000 empresa. La elección de externalizar puede ser correcta aun cuando esa defensa esté mal calculada.

### E14 — Alto: ventas y descuentos de escala son metas, no demanda validada

Comercialización reconoce que 200 unidades se eligieron para superar el equilibrio; después las llama conservadoras y alcanzables. El equilibrio informa cuánto hay que vender, no cuántos clientes comprarán. El salto de 200 a 850 unidades equivale a aproximadamente **43,6 % de crecimiento anual compuesto durante cuatro intervalos**.

El CAC de $6.000 es presupuesto de anuncios dividido por ventas deseadas. No es un CAC observado ni incluye todo el esfuerzo comercial. Faltan leads, tasa de conversión, costo de demostración, horas de cierre, ventas por región/cultivo y evidencia de preventas.

Desde el año 3 se nombran distribuidores, pero todas las ventas conservan el precio neto directo. Hay que modelar precio mayorista/descuento, mezcla de canales, comisiones, plazo de cobro y quién paga garantías/despacho. Tampoco se distingue el honorario de agencia de la inversión efectiva en anuncios.

Aplicar factores 0,97/0,94/0,92/0,90 al costo variable completo rebaja también mano de obra, despacho y garantías sin una explicación por componente. Falta separar economías de escala, inflación, tipo de cambio y tarifas laborales.

### E15 — Alto: garantía, contingencia y validación necesitan evidencia

La provisión de garantía de 5 % del BOM no es una probabilidad de fallas demostrada. Debe derivarse de tasa de devoluciones por costo medio de reparación/reposición, fletes de ida y vuelta, diagnóstico y reembolso. El documento de viabilidad ofrece un año de garantía técnica mientras el costo se describe como garantía legal de seis meses: pueden coexistir, pero el costo debe cubrir la promesa completa.

Los $900.000 para 30 muestras equivalen a $30.000/muestra y no coinciden con la banda general de $35.000–$60.000 del README. Puede existir descuento por lote; falta cotización. Los $1.500.000 para IP67/EMC tampoco prueban el costo de ensayos, repeticiones y modificaciones hasta aprobación.

La contingencia de $2.413.500 sí es 10 % de $24.135.000. Es coherente matemáticamente. No demuestra suficiencia ante rediseño, muestras fallidas o mayor tiempo de desarrollo. El costo de completar ingeniería antes de producir no está calendarizado.

## 2. Recálculo y sensibilidad económica

Se reprodujo esta serie publicada, sin atribuirle una perspectiva financiera válida:

```text
[-26.548.500; -3.275.221; 8.265.898; 7.650.848; 19.583.527; 30.491.963]
VAN(r) = suma de flujo[t] / (1+r)^t, t=0..5
```

| Indicador | Recálculo | Resultado de la verificación |
|---|---:|---|
| Precio neto redondeado | $210.076 | Correcto: $249.990 / 1,19 |
| VAN al 20 % | $2.588.183 | Coincide a menos de $1 con el publicado |
| VAN al 15 % | $8.241.085 | Coincide a menos de $1 con el publicado |
| TIR | 22,7201 % | Correcta para esa serie |
| Payback simple | 3,7101 años | Correcto para esa serie; no es payback descontado |
| Inversión y financiación total | $26.548.500 | Sumas coherentes |
| Gastos fijos por año | $16.946.852 / $27.680.000 / $48.020.000 / $51.850.000 / $63.980.000 | Sumas coherentes |
| Sueldos brutos acumulados por socio | $51.042.636 | Correcto como bruto |
| Volumen acumulado | 2.550 unidades | Correcto |

La sensibilidad siguiente conserva inversión, costos antiguos, deuda y tasa de impuesto simplificada del 25 %. Recalcula resultados como `Q × (Pneto − CV − comisión) − GF − depreciación − intereses`, y flujo como resultado menos impuesto no negativo, más depreciación, menos principal. Las variaciones se aplican a los cinco años, no solo al primero. No se liberan automáticamente gastos fijos ni inventarios al caer ventas.

| Escenario | Resultado año 1 antes de impuestos | VAN al 20 % aproximado |
|---|---:|---:|
| Base publicada | +$3.980.508 | +$2,59 millones |
| Volumen −10 % | +$1.605.168 | **−$10,05 millones** |
| Costo variable +15 % | +$1.241.238 | **−$10,46 millones** |
| Gastos fijos +15 % | +$1.438.480 | **−$10,00 millones** |
| Comisión adicional 2 % del precio con IVA en todas las ventas | +$2.980.548 | **−$2,49 millones** |
| Costo adicional $5.000 por equipo, todos los años | +$2.980.508 | **−$2,49 millones** |
| Volumen −10 %, CV +15 %, GF +15 % | −$3.402.203 | **−$36,06 millones** |

Que el primer año siga dando utilidad con +15 % de costos no significa que se conserve la rentabilidad exigida a cinco años. Esa distinción falta en la defensa.

La holgura del VAN publicado se agota con aproximadamente **$2.548 de gasto deducible adicional por equipo** a lo largo del plan, o con **$1.153.914 al año de gasto fijo adicional**. Son sensibilidades independientes, no montos acumulables. Ambas mantienen el modelo publicado y omiten efectos secundarios de caja. No se deben combinar con un VAN de proyecto corregido como si fueran la misma evaluación.

## 3. Producto, aplicación y hardware

| ID / gravedad | Afirmación documental | Evidencia y refutación |
|---|---|---|
| T01 — Crítico | PCB de 2 capas ruteada y preparada | `PCB/terrasense.kicad_pcb` contiene solo la cabecera y el cierre: no hay componentes, pistas ni contorno. La cabecera indica generador 10.0; el README declara KiCad 8.0. Existe esquemático, pero no una placa ruteada en ese archivo. |
| T02 — Alto | Factibilidad técnica comprobada | `PCB/ERC.rpt` contiene errores de conexión/alimentación. Algunos podrían requerir marcadores o justificaciones, no necesariamente un rediseño; aun así no hay un cierre de ERC limpio documentado. No se encontró firmware fuente de ESP32 en el repositorio revisado. |
| T03 — Alto | ESP32-WROOM-32E con BLE 5.0 | El fabricante especifica Bluetooth 4.2 BR/EDR y BLE. Corregir la versión en raíz, PCB y badges. [Espressif: ficha técnica](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html). |
| T04 — Crítico | Un protocolo BLE compartido de 16 bytes | PCB pone temperatura primero, pH ×100 y dos ambientales al final. App README pone humedad primero, pH ×10 y batería uint16 mV. `probeService.ts:85` decodifica humedad primero, pH ×10 y **solo byte 14 como porcentaje de batería**. Son tres contratos incompatibles. |
| T05 — Alto | 7 medidas de suelo + 2 ambientales del BME280 | `MeasureScreen.tsx:152` obtiene temperatura ambiente de Open-Meteo; la novena tarjeta es lluvia prevista. `probeService.ts` no decodifica BME280. Se guarda `canopy_humidity_pct: null`. La pantalla 3×3 existe, pero no representa las nueve mediciones físicas prometidas. |
| T06 — Alto | Pronóstico de siete días, 100 % offline | `weatherService.ts` pide `forecast_days=2`, utiliza el primer día y devuelve `null` si falla. El motor local puede operar sin internet; un pronóstico actualizado requiere red o caché que aquí no existe. |
| T07 — Alto | Sin GPS se guarda normalmente | `MeasureScreen.tsx`, función `save`, muestra alerta y retorna cuando faltan coordenadas. Contradice expresamente `App/README.md:68`. |
| T08 — Alto | Reconexión vacía automáticamente la cola | `OfflineBanner` solo consulta conectividad y muestra el aviso. Las llamadas a `flushQueue()` están en la carga de `MapScreen`; no se encontró un disparador global al recuperar conexión. El guardado local e idempotencia existen, la promesa de sincronización automática en cualquier pantalla no queda respaldada. |
| T09 — Alto | NPK siempre ordinal y numéricamente oculto al superar CE 1.000 | El motor exige **CE >1.000 y al menos uno de N/P/K alto** para activar la advertencia. `MeasureScreen` sigue formateando los valores en unidades numéricas; la nota de confianza no los enmascara. Contradice raíz, App y defensa comercial. |
| T10 — Alto | Costos de enmienda por hectárea entregados por el motor | Se encontraron acciones y dosis de cal, pero no un cálculo de costos monetarios en los motores revisados. La prestación económica de la app necesita implementación o cambio de estado documental. |
| T11 — Alto | Resultado completo en menos de cinco segundos | Comercialización dice hasta ocho; PCB presupuesta doce segundos de publicidad/conexión, tres de lectura y uno de notificación. Debe definirse si se mide inferencia, adquisición o experiencia completa, con percentiles medidos. |
| T12 — Alto | Más de 18 meses / 4.000–6.000 lecturas garantizadas | El balance omite los 0,133 mAh de conexión BLE al sumar el ciclo: 40×12/3600 + 95×3/3600 + 60×1/3600 = **0,2292 mAh**, no 0,095. A diez ciclos/día más 0,287 de reposo, son **2,579 mAh/día**, ~775 días ideales antes de pérdidas. El resultado depende de reconexiones, eficiencia, autodescarga y reducción de capacidad; el “derateo 60 %” es ambiguo. |
| T13 — Alto | Reposo de 0,0 µA reales | Desconectar la sonda no elimina consumo del ESP32, reguladores, boost, cargador, protección, divisores o fugas. Incluso el divisor declarado de 100k +100k consume 18,5 µA a 3,7 V si permanece conectado, superando por sí solo los 12 µA del presupuesto total de reposo. Debe medirse desde batería y distinguir reposo total de la rama de sonda. |
| T14 — Alto | Sondas 7-en-1 de cualquier catálogo operan con total precisión a 5 V | Solo puede afirmarse para el SKU y variante validados. Una ficha de un sensor distinto, aunque sea del mismo fabricante, no lo prueba. La alimentación mínima interna del circuito tampoco determina el voltaje externo admisible. |
| T15 — Alto | IP67, peso <280 g y funcionamiento industrial demostrados | No se aportan actas de ensayo, pesaje del conjunto, validación mecánica ni archivos de carcasa suficientes para verificar esas prestaciones. Son objetivos hasta ensayar el producto final. Una junta o batería protegida no es por sí sola certificación. |
| T16 — Medio | `npm run android` compila un development build | En `App/package.json` ejecuta `expo start --android`; inicia el servidor y solicita abrir Android, no compila el módulo nativo BLE. La guía debe incluir la preparación real del binario nativo. |

### Riesgos agronómicos que afectan directamente la propuesta de valor

**NPK:** incluso por debajo de 1.000 µS/cm, una lectura de conductividad no identifica independientemente concentraciones de N, P y K. La advertencia por salinidad es una salvaguarda parcial, no una validación analítica. La necesidad de contraste debe abarcar el rango de uso, diferentes suelos y condiciones de humedad. [Bluelab: límites de interpretación de conductividad](https://support.bluelab.com/hc/en-us/articles/360001103995-understanding-nutrient-measurements-with-the-pulse-meter).

**Dosis de cal:** `agronomyEngine.ts` calcula `round((pHmínimoCultivo − pH) × 800 + 400)` kg/ha. No incorpora capacidad tampón, acidez de reserva, profundidad efectiva o poder neutralizante del material. Puede servir como heurística de demostración, pero no prueba una dosis agronómicamente validada. Una referencia universitaria explica por qué pH y pH tampón importan para determinar necesidad de encalado; no se propone trasladar sus tablas regionales directamente a Chile. [University of Minnesota: necesidad de cal](https://extension.umn.edu/agriculture/crop-production/nutrient-management-for-minnesota-crops/lime-needs-in-minnesota).

**Radio de 20 m:** `App/README.md:246` promete saber con exactitud el estado de esa superficie. Una lectura puntual no demuestra homogeneidad en los **1.256,6 m²** del círculo. El radio es una representación cartográfica hasta que un plan de muestreo y análisis espacial lo validen. Precisión GPS y representatividad del suelo son problemas diferentes.

**Ahorro económico del agricultor:** el documento de viabilidad presenta $495.000 y ROI de 98 % como “caso real” sin ensayo, predio, fecha, control ni registro de insumos. La aritmética del ROI es correcta; el beneficio causal no está demostrado. Un daño potencial tampoco equivale a ahorro atribuible al producto.

## 4. Web, backend y reproducibilidad

| ID / gravedad | Hallazgo |
|---|---|
| S01 — Alto | `Web/README.md:242` declara carga de binarios, SHA-256 y publicación OTA masiva implementadas. `Web/src/components/FirmwareView.tsx` consulta el catálogo y se define expresamente como solo lectura. No implementa ese flujo de publicación. |
| S02 — Alto | Una alerta `admin_push_firmware_update` no demuestra instalación OTA en el dispositivo. Supabase README reconoce que falta binario validado contra hardware. La prestación debe distinguir catálogo, aviso, descarga, verificación e instalación comprobada. |
| S03 — Medio | Supabase README dice que SMTP y plantillas están pendientes/desactivados; `config.toml:239` habilita Gmail y las secciones finales habilitan plantillas. Web README coincide mejor con la configuración local. El estado remoto no fue comprobado. |
| S04 — Alto | El propio Supabase README advierte que las migraciones baseline son marcadores y no reconstruyen el esquema original. Se necesita exportación de esquema versionada y prueba de restauración para sostener reproducibilidad. El workflow de backup existe; su éxito y restaurabilidad no se verificaron remotamente. |
| S05 — Medio | La indicación de esperar ocho tablas está desactualizada respecto de las tablas y migraciones descritas por el mismo README. El inventario de migraciones mostrado también omite cambios posteriores. |
| S06 — Medio | La guía propone `PostgreSQL.psqlODBC` para obtener `psql`; un controlador ODBC no es el cliente de consola PostgreSQL. |
| S07 — Medio | El README raíz promete un único `.env` con variables Expo. Web requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; `vite.config.ts` no configura la raíz como directorio de entorno. App sí contempla cargar el `.env` raíz. La guía debe describir esa diferencia. |
| S08 — Medio | `Web/README.md` remite a `Web/.env.example`, que no existe en el árbol revisado. Los enlaces Markdown a `LICENSE` y `MIGRACION_AKURA.md` tampoco resuelven. El badge MIT no queda respaldado por un archivo de licencia. |
| S09 — Medio | `Web/package.json` define `type-check` como `tsc --noEmit`, mientras el tsconfig raíz tiene `files: []` y referencias. Ese comando aislado no sustituye el chequeo de proyectos referenciados que hace `tsc -b` en el build. |

La existencia de RPC con comprobaciones de soporte es una mejora real, pero no justifica “100 % seguro” ni “100 % operativo” por sí sola. No se usaron los comandos de ejemplo que escriben telemetría en producción para comprobar una afirmación documental.

## 5. Mercado, competencia, fuentes y cumplimiento

### M01 — La dimensión censal está respaldada; el SAM no

INE confirma **138.628 UPA y 36.928 UAC**, suma 175.556. Los porcentajes 200/120.000 y 2.550/120.000 son correctos como cálculos sobre un supuesto. Las 120.000 explotaciones servibles no tienen una tabla que aplique región, superficie 0,5–20 ha, rubro, tecnología y disposición a pagar. Tampoco una explotación equivale necesariamente a un cliente o equipo. [INE: resultados finales](https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales).

La cifra de superficie de 48,7 millones debe identificarse por universo/tabla: en el cuadro nacional consultado aparecen 45.742.565 ha de UPA y 31.854 ha de UAC. No intercambiar superficie efectivamente censada con otros totales territoriales sin explicar la diferencia.

El 94,5 % de acceso rural a internet no debe reinterpretarse como cobertura móvil efectiva en potreros ni como posesión individual de smartphone compatible. La bibliografía debe identificar la edición y tabla de la encuesta que respalda cada porcentaje; la referencia genérica a la X Encuesta no basta para cifras de otras ediciones.

### M02 — El benchmark minimiza prestaciones reales de competidores

- **Bluelab Pulse:** tiene Bluetooth, aplicación, historial y uso sin internet después del acceso inicial; no se limita a mostrar números en una pantalla. Esas funciones no son diferenciadores exclusivos de TerraSense. [Bluelab: funcionamiento](https://support.bluelab.com/bluelab-pulse-multimedia-meter), [Bluelab: uso offline](https://support.bluelab.com/bluelab-pulse-meter-faq).
- **FieldScout TDR350:** mide humedad, EC y temperatura; el README raíz le asigna dos variables y Comercialización una. Además tiene registro, GPS y Bluetooth. [Spectrum: TDR350](https://sandbox.specmeters.com/FieldScout-TDR350-Soil-Moisture-Meter).
- **Hanna HI9814:** medir pH/EC/TDS/temperatura en soluciones y sustratos preparados no es equivalente a insertar una sonda genérica en suelo. Comparar cantidad de variables sin método ni exactitud es insuficiente. [Hanna: uso de HI9814](https://blog.hannainst.com/how-to-test-growing-medium-using-the-hanna-groline-nutrient-meter).

Los precios de $269.010, $310.185 y $1.367.925 no tienen cotización chilena enlazada con fecha, IVA, despacho y accesorios. Como contraste, Bluelab Global exhibe USD 315 **sin impuestos**; no es directamente un precio final chileno. No se verificaron esos tres precios locales exactos. [Bluelab: precio de referencia internacional](https://global.bluelab.com/products/bluelab-pulse-multimedia-ec-mc-meter?currency=USD).

El supuesto “techo competitivo” de $249.990 no se deduce automáticamente de esos valores. La disposición a pagar depende también de evidencia de precisión, confiabilidad y servicio.

### M03 — Laboratorios y costo total de uso están presentados de forma desigual

No todo laboratorio demora 15–30 días hábiles ni todo informe carece de recomendación. INIA describe servicios e informes con recomendación y documentación de muestreo compuesto. Diez puntos del predio no siempre implican diez análisis separados: depende del objetivo y de las unidades homogéneas de muestreo. [INIA: documento técnico](https://biblioteca.inia.cl/bitstreams/1fd2026e-a1a4-440e-b309-66ab3604d501/download), [INIA: laboratorios](https://www.inia.cl/laboratorios/).

No es correcto monetizar cada lectura TerraSense como un laboratorio evitado mientras se declara que no son sustitutos analíticos. “Costo marginal cero” omite tiempo de muestreo, limpieza, calibración, energía, mantenimiento y desgaste; “sin cobro por lectura” es una formulación defendible. El propio estudio de TCO incorpora buffers y baterías, contradiciendo la versión de costo invariable de por vida.

Las pérdidas del 30–50 % de emergencia, 60 % de fósforo o $350.000–$700.000/ha necesitan cultivo, dosis, suelo, temporada, fuente y cálculo. No pueden usarse como beneficio universal de compra. La recomendación de laboratorio cada 2–3 años también necesita contexto de cultivo e intensidad de manejo.

### M04 — Cumplimiento normativo declarado sin demostración

`README.md:387` atribuye humedad volumétrica a **ISO 11272**, que trata determinación de **densidad aparente seca**. Corregir la norma y el método aplicable. [ISO 11272:2017](https://www.iso.org/standard/68255.html?browse=tc).

La Ley 21.719 entra en vigor el **1 de diciembre de 2026**. A la fecha de revisión no corresponde presentar su cumplimiento como consecuencia automática de pedir GPS solo bajo demanda. Se requieren bases de tratamiento, derechos, retención, seguridad y transferencia internacional; alojar en Brasil por cercanía no resuelve estas obligaciones. [BCN: Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idParte=10527471&idVersion=2026-12-01).

SUBTEL actualizó el procedimiento de equipos de alcance reducido con vigencia desde febrero de 2026. El expediente debe revisar la declaración e información exigibles al producto final; una certificación FCC/CE del módulo no demuestra automáticamente todo el cumplimiento local del equipo terminado. [SUBTEL: régimen vigente](https://www.subtel.gob.cl/equipos-de-alcance-reducido/).

El carácter SELV y una protección de batería son atributos de diseño, no demostración suficiente de exención SEC para cualquier configuración comercial ni de cumplimiento IEC 62133-2. Debe definirse qué se entrega, incluyendo cargador/adaptador, y respaldarse el expediente de batería, ensayos y transporte. No se concluye aquí que el producto necesariamente requiera una certificación SEC concreta; se refuta la justificación universal publicada.

## 6. Calidad de la planilla y verificaciones ejecutadas

La planilla maestra contiene **577 celdas con fórmulas y las 577 carecen de resultado almacenado en caché**. Esto no significa que Excel no pueda calcularlas al abrir: significa que lectores que solo consultan valores no obtendrán resultados, y que esos valores no constituyen una evidencia archivada de recálculo. Se inspeccionaron fórmulas y se reprodujeron independientemente los indicadores centrales y la sensibilidad. No se ejecutó un motor Excel completo sobre las 577 fórmulas.

Persisten notas que apuntan a secciones XII/XI de un README anterior y textos de celdas donde faltan cifras, por ejemplo `GASTOS FIJOS 5 AÑOS!H6`. También existe otra planilla en `outputs/terrasense-flujo-caja/` con estructura diferente: debe identificarse expresamente como alternativa o archivo histórico para evitar varias fuentes “finales”.

Verificaciones locales:

- App: **18 de 18 pruebas unitarias aprobadas**, coincide con el README.
- App: **chequeo TypeScript aprobado**.
- Web: `npm run build` **no completó** por módulos ausentes en la instalación local (`react-router-dom`, `framer-motion`, `lucide-react`). Es limitación del entorno/dependencias instalado, no evidencia suficiente de un error del despliegue remoto. No se modificaron dependencias para esta revisión.
- Enlaces Markdown locales de los seis README: faltan `LICENSE` y `MIGRACION_AKURA.md`; también se comprobó ausencia del `.env.example` web citado en texto.
- Se inspeccionaron protocolo, medición, clima, cola, catálogo OTA, configuración SMTP y archivos de hardware. No se hicieron escrituras externas ni ensayos físicos.

Durante la revisión apareció una edición ajena en `PCB/README.md` que cambia “uretano” por “prensa estopa” en un diagrama. Se preservó. Este informe es el único documento añadido por la auditoría; no se corrigieron silenciosamente los README ni el modelo financiero.

## 7. Qué haría falta para defender los números

1. Una revisión única de hardware y BOM con SKU, cantidades, precio neto/bruto, moneda, fecha, vigencia y costo puesto en taller.
2. Pruebas de terreno y laboratorio de esa revisión: incertidumbre por variable, sesgos, repetibilidad, salinidad, humedad, calibración y límites de interpretación.
3. Embudo comercial observado y ventas piloto: precio efectivamente pagado, CAC, devoluciones y tiempo de soporte. Tratar 200/350/500/650/850 como metas hasta contar con evidencia.
4. Modelo mensual de 24 meses y anual posterior con inventarios, IVA, cobros, remuneraciones completas, comisiones de canal, reservas de garantía, gastos de nube y deuda cotizada.
5. Evaluaciones separadas del proyecto y del patrimonio. Exponer sueldos brutos/líquidos y dividendos antes/después de impuestos sin mezclarlos con ROI del capital.
6. Sincronizar los seis README y los documentos de apoyo con estados claros: implementado, probado localmente, probado en hardware, certificado o proyectado.

No corresponde emitir hoy un precio mínimo definitivo, un VAN corregido único ni una cifra de ganancia líquida real: faltan insumos que cambian materialmente esas respuestas. Sí corresponde retirar la afirmación de rentabilidad “probada” y presentar el modelo actual como una hipótesis sometida a validación.

## 8. ¿Conviene un solo crédito a diez años en lugar de dos?

### Conclusión de la comparación

**Para proteger la caja de una empresa nueva, un solo crédito amortizable está mejor alineado con el modelo que devolver $5.000.000 de capital al finalizar el primer año.** La línea corta no tiene una fuente de repago operativo suficiente en el escenario actual: se paga consumiendo la reserva inicial. Si ese dinero financia inventario que debe reponerse, una devolución completa al año no extingue la necesidad de capital de trabajo.

**Diez años mejora más la liquidez, pero no minimiza el costo financiero.** A igualdad de tasa, cinco años es más barato; siete ofrece un punto intermedio. Dada la incertidumbre comercial y de costos detectada, tiene sentido cotizar un crédito único a 7 y 10 años con posibilidad de prepago. Mi preferencia provisional sería 10 años si su tasa, costos, moneda y garantías son comparables y la prioridad es resistir el arranque, usando los excedentes futuros para fortalecer caja y luego amortizar anticipadamente. No comprometería ese prepago como si las ventas futuras estuvieran aseguradas.

Esta recomendación es sobre la estructura del financiamiento. No convierte el producto ni su demanda en validados, y no equivale a recomendar contratar hoy una oferta bancaria inexistente.

### Capital propio y monto de crédito

```text
Inversión publicada                      26.548.500
Aporte propio confirmado por los socios −8.900.000
Financiamiento por comparar              17.648.500
```

El aporte representa **33,52 %** de la inversión. Se mantiene en todas las alternativas. No se propone aumentarlo para resolver artificialmente la liquidez. El monto de deuda cambiará si la auditoría del presupuesto cambia la inversión final.

### Supuestos de cálculo comparables

- Créditos en **CLP no reajustables**, sin gracia, tasa fija **10 % efectiva anual** y cuotas mensuales vencidas.
- Conversión correcta: `i_m = (1 + 0,10)^(1/12) − 1 = 0,797414 % mensual`.
- Cuota francesa: `C = P × i_m / [1 − (1 + i_m)^(-n)]`.
- Alternativa con dos créditos: $12.648.500 a 60 meses más $5.000.000 con pago único de $5.750.000 al mes 12, conservando la tasa corta de 15 % del proyecto.
- No se incluyen comisiones FOGAPE, timbres, seguros, gastos de formalización ni costos de prepago; deben incorporarse con la cotización. No se confunde esta tasa con CAE ni con una oferta de mercado verificada.
- No se cambian volumen, costo unitario ni remuneraciones para favorecer una alternativa.

El README original amortiza el crédito largo **anualmente**: $3.336.642 por año y $9.086.642 de servicio total en el año 1 al sumar la línea corta. La tabla siguiente normaliza el crédito largo a pagos mensuales para comparar sin mezclar calendarios. Por eso su fila de dos créditos presenta $8.942.823 en el año 1, en lugar de $9.086.642.

### Cuota, costo total y deuda remanente

| Alternativa | Cuota mensual ordinaria | Pago adicional al mes 12 | Servicio total año 1 | Intereses totales hasta extinguir deuda | Capital pendiente al mes 60 |
|---|---:|---:|---:|---:|---:|
| Dos créditos: largo 5 años + corto 1 año | $266.069 | **$5.750.000** | **$8.942.823** | $4.065.613 | $0 |
| Único a 5 años | $371.246 | $0 | $4.454.958 | **$4.626.288** | $0 |
| Único a 7 años | $289.070 | $0 | $3.468.846 | $6.633.420 | $6.291.494 |
| Único a 10 años | **$229.034** | $0 | **$2.748.411** | $9.835.607 | **$10.887.944** |

Importes redondeados a pesos; los cálculos conservan decimales. En la primera fila, al mes 12 también vence la cuota ordinaria del crédito largo. El pago adicional no sustituye esa cuota.

Comparado con dos créditos normalizados, el crédito único a 10 años libera **$6.194.412 de desembolso bancario en el primer año**, a cambio de aproximadamente **$5.769.994 de intereses adicionales nominales durante toda su vida**. Comparado con un crédito único a 5 años, baja la cuota mensual en $142.212 y aumenta los intereses totales en $5.209.319.

Aunque la suma nominal de intereses sea mayor, la menor cuota tiene valor si evita una crisis de caja o una refinanciación de emergencia. Ese beneficio no se puede tasar con certeza sin flujo mensual y condiciones bancarias. A una misma tasa de descuento contractual, comparar solo valores presentes de cuotas tampoco captura la diferencia de riesgo de liquidez.

### Qué ocurre en el primer año del negocio

Se mantiene el costo de $91.309, venta neta $210.076, gastos fijos $16.946.852 y depreciación $811.190. Los sueldos de ambos socios **ya están incluidos en esos gastos fijos**. Para aislar el cambio de deuda se conserva el impuesto contable simplificado del 25 % del README; no es una liquidación tributaria real de 2027.

```text
EBITDA = unidades × (210.076 − 91.309) − 16.946.852
Caja tras deuda e impuesto = EBITDA − cuota anual
                            − 25 % × max(0, EBITDA − depreciación − intereses)
```

No incluye variación de inventarios/cuentas por cobrar, IVA, inversiones nuevas ni costos omitidos en el presupuesto. Por eso el resultado no equivale a dividendos distribuibles.

| Alternativa | Caja con 200 ventas | Caja con 180 ventas | Caja con 160 ventas | Ventas mínimas enteras para cubrir esta caja |
|---|---:|---:|---:|---:|
| Dos créditos normalizados | −$3.167.357 | −$4.948.862 | −$6.886.955 | 236 |
| Único a 5 años | +$1.243.795 | **−$537.710** | −$2.399.090 | 187 |
| Único a 7 años | +$2.241.012 | +$459.507 | −$1.412.978 | 175 |
| Único a 10 años | **+$2.969.560** | **+$1.188.055** | −$692.543 | 167 |

Con 180 ventas y **$5.000 adicionales de costo por unidad**, cinco años cae a −$1.212.710, siete a −$215.493 y diez conserva aproximadamente +$513.055. Esto respalda preferir holgura al inicio, pero muestra que incluso diez años puede quedar ajustado cuando se incorporen otros costos.

Como comprobación aislada, usar 12,5 % en lugar de 25 % sobre la misma base contable elevaría la caja de 200 ventas a −$2.651.816, +$1.797.693, +$2.789.357 y +$3.513.849, respectivamente. No cambia el orden de preferencia por liquidez; la base fiscal real sigue pendiente de modelar.

### Diez años con tasa distinta

No se debe suponer que el banco conservará 10 % al extender plazo. Para un solo crédito de $17.648.500 a 120 meses:

| Tasa efectiva anual supuesta | Cuota mensual | Intereses totales a 10 años | Capital pendiente al año 5 |
|---|---:|---:|---:|
| 8 % | $211.531 | $7.735.167 | $10.501.414 |
| 10 % | $229.034 | $9.835.607 | $10.887.944 |
| 12 % | $246.986 | $11.989.792 | $11.259.537 |
| 15 % | $274.637 | $15.307.905 | $11.787.853 |
| 20 % | $322.231 | $21.019.262 | $12.589.188 |

Son escenarios, no tasas ofertadas. Una cuota menor puede esconder un costo total elevado. Si la propuesta es en UF, la cuota fija en UF crecerá en pesos con el reajuste; no es comparable directamente con estos montos fijos CLP.

### ¿Está disponible realmente un plazo de diez años?

No es un plazo inventado: BancoEstado contempla financiamientos largos y su documento de crédito comercial indica que el máximo depende del destino y garantías. Pero eso no demuestra que apruebe **esta empresa nueva, por este monto y para esta mezcla de capital de trabajo y equipamiento**, a diez años en pesos al 10 %. [BancoEstado: características del crédito comercial](https://www.bancoestado.cl/content/dam/bancoestado-public/pdf/solvencia-economica/Informacion-Producto-Credito-Comercial.pdf).

Hay productos con condiciones distintas: la ficha de crédito comercial de Banco de Chile señala hasta 60 meses; BancoEstado Microempresas publica exigencias de antigüedad para su producto Crédito Comercio. Esas exigencias no se extrapolan a todos los bancos/productos, pero refutan tratar el crédito de una empresa recién creada como trámite automático. [Banco de Chile: crédito comercial](https://sitiospublicos.bancochile.cl/personas/solvencia/detalle/credito-comercial), [BancoEstado: Crédito Comercio](https://nwm.bancoestado.cl/content/bancoestado-public/cl/es/home/home-microempresa/productos/creditos/creditos-para-tu-negocio/credito-comercio---bancoestado-microempresas.html).

El aporte propio confirmado fortalece la operación y resuelve esa parte del financiamiento. No sustituye la aprobación del tramo bancario. Se necesita una cotización escrita que permita comparar monto líquido recibido, moneda, tasa efectiva, comisiones, seguros, garantía, calendario, gracia y prepago. El catálogo público de FOGAPE describe la cobertura; no garantiza la elegibilidad ni una tasa individual.

### Prepago y horizonte de evaluación

Tomar 10 años no obliga económicamente a mantener la deuda los diez si existe una opción viable de prepago. Bajo el escenario de 10 % y pagando cuotas normales durante 60 meses:

```text
60 cuotas pagadas                         13.742.054
Capital necesario para cerrar al mes 60  +10.887.944
Total pagado antes de comisión prepago    24.629.997
Intereses incurridos hasta entonces        6.981.497
```

Eso cuesta aproximadamente **$2.355.210 más que haber contratado cinco años** al mismo 10 %, antes de comisiones. Es el costo nominal de mantener cuotas iniciales menores hasta el año cinco. Prepagar antes puede reducirlo, pero consume caja que podría necesitar el negocio. La liquidación debe solicitarse al banco y comprobarse según contrato y normativa; no se presupone gratuidad. [CMF: información sobre prepago](https://www.cmfchile.cl/portal/principal/623/w4-article-27594.html).

Con diez años desaparece la frase “empresa sin deudas al año 5”: quedarán $10,89 millones de capital si no se prepaga. Evaluar solo cinco años y ocultar los pagos 6–10 sobreestima lo que queda para el socio. Para una salida al año 5 hay que considerar el saldo de deuda frente al valor de salida; si se mantiene la empresa, extender la evaluación o incluir un valor de continuidad consistente. No restar el saldo dos veces si los pagos futuros ya están incorporados en la valoración.

**Decisión defendible hoy:** mantener el aporte de $8,9 millones y reformular el escenario de financiamiento alrededor de una deuda amortizable única. Cotizar 5/7/10 años; preferir la holgura de 10 si el costo y las garantías son razonables, comparar 7 como equilibrio, y evitar la devolución de $5 millones al año 1 salvo que exista una fuente de repago concreta que no consuma la caja necesaria para operar. La elección final de plazo depende de la oferta bancaria y del flujo mensual corregido, no de hacer que el VAN supere el 20 %.
