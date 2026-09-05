# Plan de integración y validación — TerraSense

Revisión 05-09-2026. El [Informe 1](INFORME%201%20.docx.md) concentra arquitectura, operación y evaluación; este documento organiza las comprobaciones pendientes.

La [auditoría del 04-09-2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md) es evidencia histórica, no la especificación vigente. Los documentos y planillas que reemplazó se conservan en `finanzas/historico/` y **no deben usarse para cotizar ni fabricar**.

La integración de datos y las pruebas de software se trabajan en el repositorio. Los ensayos del instrumento, las cotizaciones y la evaluación contable requieren el equipo o antecedentes externos.

---

## 1. Bloqueantes antes de firmar crédito o comprar volumen

| # | Pendiente | Por qué bloquea | Cómo se cierra |
|:---:|---|---|---|
| 1 | **Cotización real del BOM** | El costo de $81.184 es un presupuesto sin SKU. La sonda es aproximadamente el 59 % y define el margen | Cotizaciones con SKU, cantidad, precio neto y bruto, moneda, fecha, vigencia, lead time y costo puesto en taller |
| 2 | **Oferta bancaria efectiva** | El crédito de $31.000.000 a 10 años y 12 % e.a. es un supuesto. **No hay oferta**. FOGAPE es garantía sujeta a evaluación, no aprobación | Cotización en CLP a tasa fija, a 5 y 10 años, con todos los cargos, garantías exigidas, gracia y comisión de prepago |
| 3 | **Ventas piloto pagadas** | Las metas de 200–850 unidades son objetivos, no demanda. El precio de $349.990 no lo validó ningún cliente | Pilotos pagados con margen positivo: precio efectivamente pagado, CAC por cohorte, devoluciones y horas de soporte |
| 4 | **Revisión contable independiente** | El impuesto es una aproximación de caja Pro Pyme; no reproduce F29, PPM ni la declaración de abril | Contador revisa régimen, calificación Pro Pyme, remuneración de socios con control, PPM, IVA efectivo y deducibilidad |

Los resultados de DSCR, VAN y caja libre por escenario se consultan en [RESULTADOS_FINANCIEROS.md](RESULTADOS_FINANCIEROS.md). La comparación de plazos utiliza el mismo principal; no reutilizar ratios de versiones anteriores de la BOM.

---

## 2. Hardware — nada está ensayado

| # | Pendiente | Estado actual |
|:---:|---|---|
| 5 | **Rediseño de esquema y ruteo de PCB** | `PCB/terrasense.kicad_pcb` está **vacío**: sin componentes, pistas ni contorno. **No fabricar desde ese archivo** |
| 6 | **Cierre de ERC/DRC** | `ERC.rpt` registra errores de conexión y alimentación sin cierre documentado |
| 7 | **Firmware del ESP32** | **No existe en el repositorio.** El contrato BLE de 16 bytes está documentado según el decodificador de la app; el firmware debe implementarlo |
| 8 | **Captura BLE/Modbus real** | El mapa de registros de la sonda no está confirmado contra la ficha del proveedor. Requiere el SKU adquirido |
| 9 | **Consumo y autonomía** | Sin medir desde batería. Hay que distinguir reposo total del reposo de la rama de sonda; el divisor 100 k+100 k consume ~18,5 µA por sí solo |
| 10 | **Sellado, peso y robustez** | IP67, peso < 280 g y resistencia mecánica son **objetivos sin ensayo**. No hay actas ni pesaje del conjunto |
| 11 | **Build de release con BLE en teléfono** | `npm run android` no compila el módulo nativo. La simulación está restringida a desarrollo con guardado bloqueado |

---

## 3. Validación agronómica y metrológica

| # | Pendiente | Estado actual |
|:---:|---|---|
| 12 | **Ensayos de precisión por variable** | Sin incertidumbre, sesgo ni repetibilidad medidos, en distintos suelos, salinidades y humedades |
| 13 | **Revisión por agrónomo** | Se eliminaron la dosis de cal en kg/ha y la fracción fija de lavado. Las reglas que quedan siguen siendo **orientativas** |
| 14 | **Representatividad del círculo de 20 m** | Una lectura puntual no demuestra el estado de 1.256,6 m². Requiere plan de muestreo y análisis espacial |
| 15 | **Cuantificar el beneficio para el agricultor** | El «caso real» de $495.000 y el ROI de 98 % se retiraron por no tener predio, control ni registro. Requiere piloto con línea base |

**Los registros N/P/K derivan de conductividad eléctrica y no se validan aquí.** Mantener el análisis de laboratorio para decisiones de fertilización y encalado: ni una lectura instantánea ni un mapa de círculos equivalen a un análisis representativo del predio.

---

## 4. Backend y servicios

| # | Pendiente | Estado actual |
|:---:|---|---|
| 16 | **Pronóstico gratuito e integración ambiental** | El requisito es cubrir los próximos cinco días; hoy la consulta pide dos y utiliza el primero. Seleccionar una API gratuita con licencia y cupo adecuados al uso. Open-Meteo gratuito sirve para el estudio no comercial; un proxy no cambia su licencia. Completar también adquisición, BLE, guardado y grilla BME280 conforme al [Informe 1](INFORME%201%20.docx.md#integracion-bme280) |

La temperatura observada por BME280 debe guardarse separada de la temperatura del servicio meteorológico, junto con humedad relativa, presión local, instante y estado de captura.

Las tareas **operativas** de despliegue —aplicar la migración en staging, exportar el esquema, ensayar la restauración del respaldo y auditar el estado de producción— viven en [`supabase/README.md` §10](../supabase/README.md), que es donde están los comandos. La verificación en dispositivo de la cola offline y del enlace BLE está en [`App/README.md`](../App/README.md). La publicación OTA real figura en el roadmap de [`Web/README.md` §11.2](../Web/README.md).

---

## 5. Dependencias y comprobaciones de software

Los resultados de auditoría y pruebas del 4 de septiembre se conservan en el archivo histórico. Antes de una entrega se ejecutan las pruebas y compilaciones de los módulos modificados; la integración BLE y el guardado sin red requieren también ensayo en teléfono. No se reutilizan conteos antiguos de vulnerabilidades o PR como estado actual.

---

## 6. Obligaciones legales antes de comercializar

| # | Pendiente | Estado actual |
|:---:|---|---|
| 17 | **SUBTEL — equipos de alcance reducido** | Régimen actualizado vigente desde febrero de 2026. Las obligaciones aplican al **producto terminado**; la homologación FCC/CE del módulo no basta |
| 18 | **Batería: UN 38.3 / IEC 62133-2** | Sin celda definitiva adquirida ni expediente de ensayos y transporte |
| 19 | **Seguridad eléctrica (SEC)** | Definir qué se entrega, incluido cargador o adaptador. SELV a 5 V es atributo de diseño, no exención demostrada |
| 20 | **Ley 21.719 de datos personales** | Vigente desde el **1 de diciembre de 2026**. Faltan bases de tratamiento, derechos, retención, seguridad y transferencia internacional. Alojar en Brasil no las resuelve |
| 21 | **Protección al consumidor y garantía** | Definir política de garantía real frente al 5 % presupuestado en el modelo |
| 22 | **Decisión de licencia del repositorio** | **Sin `LICENSE`: todos los derechos reservados por defecto.** Decisión tomada el 04-09-2026 de no publicar licencia abierta mientras se evalúa comercializar. Revisable |

---

## Cifras vigentes

Las cifras vigentes de BOM, crédito, cuota, DSCR, VAN, TIR, payback y equilibrio se regeneran en [RESULTADOS_FINANCIEROS.md](RESULTADOS_FINANCIEROS.md).

Generadas con `python finanzas/modelo.py` desde `finanzas/supuestos.json`. **Regenerar siempre tras editar supuestos; no editar resultados a mano.** La fuente publicada es [`RESULTADOS_FINANCIEROS.md`](RESULTADOS_FINANCIEROS.md).

---

## Revisión documental y financiera del 5 de septiembre

La BOM contiene BME280 a $3.500 finales y carcasa impresa en 3D. El modelo calcula VAN, TIR y payback con la misma serie mensual, separa financiación de inversión económica y aprovecha el IVA de inventario inicial. Las tablas del Informe 1 se generan desde el modelo para mantener una sola fuente de cifras.

El Informe 1 incorpora once diagramas, el funcionamiento de la app contrastado con código, el balance energético para LiPo de 2.000 mAh y la comparación de batería recargable con pilas de referencias concretas. Los documentos conceptuales duplicados se consolidaron allí; el índice vigente está en [docs/README.md](README.md).

## Integración BME280 y clima — actualización 5 de septiembre

El BME280 vuelve al diseño obligatorio y la BOM, junto con carcasa 3D explícita. Completar adquisición I²C, transporte BLE de tres variables, guardado/grilla y pronóstico de cinco días según [contrato de integración](INFORME%201%20.docx.md#integracion-bme280). La revisión económica no implica que esa integración de firmware/app esté terminada.
