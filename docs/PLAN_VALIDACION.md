# Plan de integración y validación — TerraSense

El [Informe 1](INFORME%201%20.docx.md) concentra arquitectura, operación y evaluación; este documento organiza las comprobaciones que siguen pendientes.

La [auditoría del 04-09-2026](../finanzas/historico/documentacion/docs/AUDITORIA_READMES_2026-09-04.md) es evidencia histórica, no la especificación vigente. Los documentos y planillas que reemplazó se conservan en `finanzas/historico/` y **no deben usarse para cotizar ni fabricar**.

La integración de datos y las pruebas de software se trabajan en el repositorio. Los ensayos del instrumento, las cotizaciones y la evaluación contable requieren el equipo o antecedentes externos.

---

## 1. Bloqueantes antes de firmar crédito o comprar volumen

| # | Pendiente | Por qué bloquea | Cómo se cierra |
|:---:|---|---|---|
| 1 | **Cotización real del BOM** | La BOM está cotizada en plataformas al detalle, no con SKU ni factura. La sonda es cerca de dos tercios del costo de materiales ([resultados](RESULTADOS_FINANCIEROS.md)) y define el margen | Cotizaciones con SKU, cantidad, precio neto y bruto, moneda, fecha, vigencia, lead time y costo puesto en taller |
| 2 | **Oferta bancaria efectiva** | El crédito financia el 100 % de la inversión inicial a 10 años, con un pie propio del 30 % del crédito entregado como condición de entrada; montos y cuota en [RESULTADOS_FINANCIEROS.md](RESULTADOS_FINANCIEROS.md). **Falta la oferta bancaria formal**. FOGAPE es garantía sujeta a evaluación, no aprobación | Cotización en CLP a tasa fija, a 5 y 10 años, con todos los cargos, garantías exigidas, gracia y comisión de prepago |
| 3 | **Ventas piloto pagadas** | Las metas de 200–850 unidades son objetivos, no demanda. El precio derivado ([`RESULTADOS_FINANCIEROS.md`](RESULTADOS_FINANCIEROS.md)) no lo validó ningún cliente | Pilotos pagados con margen positivo: precio efectivamente pagado, CAC por cohorte, devoluciones y horas de soporte |
| 4 | **Revisión contable independiente** | El impuesto es una aproximación de caja Pro Pyme; no reproduce F29, PPM ni la declaración de abril | Contador revisa régimen, calificación Pro Pyme, remuneración de socios con control, PPM, IVA efectivo y deducibilidad |

Los resultados de VAN, TIR y caja por escenario se consultan en [RESULTADOS_FINANCIEROS.md](RESULTADOS_FINANCIEROS.md). La comparación de plazos utiliza el mismo principal; no reutilizar ratios de versiones anteriores de la BOM.

---

## 2. Hardware — nada está ensayado

| # | Pendiente | Estado actual |
|:---:|---|---|
| 5 | **Armar y probar la placa V2** | Esquemático y ruteo en [`PCB/Medidor De Suelos V2/`](../PCB/README.md); primer lote de 5 placas pedido, sin armar ni probar. `PCB/V1/` es la versión anterior: **no fabricar desde ella** |
| 6 | **Cierre de ERC/DRC** | El único informe en el repositorio es `PCB/V1/ERC.rpt`, de la versión anterior. No hay informe ERC/DRC de la V2 documentado |
| 7 | **Firmware del ESP32** | **Existe en [`Firmware/`](../Firmware/README.md)**: vinculación BLE, LEDs, buzzer, BME280 y trama de 20 bytes, compilado pero sin probar en hardware. Falta el driver Modbus de la sonda: sin él, toda trama sale con el centinela «sin lectura de suelo». Estado y prueba con la app en [`Firmware/TASK.md`](../Firmware/TASK.md) |
| 8 | **Captura BLE/Modbus real** | El mapa de registros de la sonda no está confirmado contra la ficha del proveedor. Requiere el SKU adquirido |
| 9 | **Consumo y autonomía** | Sin medir desde batería. Hay que distinguir reposo total del reposo de la rama de sonda; el divisor 100 k+100 k consume ~18,5 µA por sí solo |
| 10 | **Sellado, peso y robustez** | IP67, peso < 280 g y resistencia mecánica son **objetivos sin ensayo**. No hay actas ni pesaje del conjunto |
| 11 | **Build de release con BLE en teléfono** | `npm run android` (`expo run:android`) compila el módulo BLE para desarrollo; falta un build de release probado con la sonda. La simulación está restringida a desarrollo y no se guarda |

---

## 3. Validación agronómica y metrológica

| # | Pendiente | Estado actual |
|:---:|---|---|
| 12 | **Ensayos de precisión por variable** | Sin incertidumbre, sesgo ni repetibilidad medidos, en distintos suelos, salinidades y humedades |
| 13 | **Revisión por agrónomo** | Se eliminaron la dosis de cal en kg/ha y la fracción fija de lavado. Las reglas que quedan siguen siendo **orientativas** |
| 14 | **Representatividad de la lectura** | Una lectura puntual no demuestra el estado del campo. Requiere plan de muestreo: cuántos puntos, dónde y a qué profundidad |
| 15 | **Cuantificar el beneficio para el agricultor** | El «caso real» de $495.000 y el ROI de 98 % se retiraron por no tener campo, control ni registro. Requiere piloto con línea base |

**Los registros N/P/K derivan de conductividad eléctrica y no se validan aquí.** Mantener el análisis de laboratorio para decisiones de fertilización y encalado: una lectura instantánea no equivale a un análisis representativo del campo.

---

## 4. Backend y servicios

| # | Pendiente | Estado actual |
|:---:|---|---|
| 16 | **Validación física y servicio meteorológico** | El Grid 2×5, el guardado ambiental y el pronóstico de cinco fechas posteriores están implementados; se solicita `forecast_days=6&timezone=auto`. La migración 20260911120000 está aplicada y verificada. Falta validar adquisición I²C/firmware, BLE real y operación en teléfono; confirmar licencia y cupo del proveedor para el uso comercial. Ver [App](../App/README.md) y [Supabase](../supabase/README.md#persistencia-ambiental-y-bateria) |

La temperatura observada por BME280 debe guardarse separada de la temperatura del servicio meteorológico, junto con humedad relativa, presión local, instante y estado de captura.

Las tareas **operativas** de despliegue —aplicar la migración en staging, exportar el esquema, ensayar la restauración del respaldo y auditar el estado de producción— viven en [`supabase/README.md` §10](../supabase/README.md), que es donde están los comandos. La verificación en dispositivo de la cola offline y del enlace BLE está en [`App/README.md`](../App/README.md). La publicación OTA real figura en el roadmap de [`Web/README.md` §11.2](../Web/README.md).

---

## 5. Dependencias y comprobaciones de software

### Comprobaciones automáticas

Antes de dar un cambio por terminado se ejecutan las de [CLAUDE.md](../CLAUDE.md) §6: modelo financiero, verificación de documentación, `npm test` de App y Web, y `npm run type-check` en ambos. Las pruebas de App cubren la trama v0/v1, negativos, centinelas y rangos, el estado de la sonda, la vinculación, la cola de contactos, el historial ambiental y el pronóstico con fallo de red. `App/scripts/verify-supabase-onboarding.mjs` verifica contra una base los roles, el QR, el reset y la revinculación ([pendiente de correr](../supabase/README.md#1002-reset-sólo-desde-el-backoffice-28-09-2026)).

Quedan pruebas con ESP32/BME280 reales, interfaz y accesibilidad en teléfonos, modo avión, ausencia de GPS, cierre/reinicio y recuperación de cobertura sin duplicados. La trama v1 no incluye reloj del sensor ni contador: el firmware debe enviar una lectura nueva al suscribirse, y eso debe comprobarse en hardware.

Los roadmaps de SMTP/dominio, tickets de soporte, OTA real, alertas preventivas, canary y repaso visual completo conservan sus pendientes en los README de cada módulo; no se consideran cerrados por aprobar estas pruebas.


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

Las cifras vigentes de BOM, precio derivado, crédito, cuota, VAN, TIR y payback se regeneran en [RESULTADOS_FINANCIEROS.md](RESULTADOS_FINANCIEROS.md).

Generadas con `python finanzas/modelo.py` desde `finanzas/supuestos.json`. **Regenerar siempre tras editar supuestos; no editar resultados a mano.** La fuente publicada es [`RESULTADOS_FINANCIEROS.md`](RESULTADOS_FINANCIEROS.md).
