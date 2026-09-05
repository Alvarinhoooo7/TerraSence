# Plan de validación — qué falta para poder comprometer dinero

Revisión 04-09-2026. Este documento lista **lo que sigue pendiente**. Las correcciones ya aplicadas al repositorio están resumidas al final, en una sola sección.

La [auditoría del 04-09-2026](AUDITORIA_READMES_2026-09-04.md) es evidencia histórica, no la especificación vigente. Los documentos y planillas que reemplazó se conservan en `finanzas/historico/` y **no deben usarse para cotizar ni fabricar**.

> **Nada de lo pendiente se resuelve dentro de este repositorio.** Todo requiere dinero, terceros, ensayos físicos o decisiones de los socios.

---

## 1. Bloqueantes antes de firmar crédito o comprar volumen

| # | Pendiente | Por qué bloquea | Cómo se cierra |
|:---:|---|---|---|
| 1 | **Cotización real del BOM** | El costo de $75.243 es un presupuesto sin SKU. La sonda sola es el 64 % y define el margen | Cotizaciones con SKU, cantidad, precio neto y bruto, moneda, fecha, vigencia, lead time y costo puesto en taller |
| 2 | **Oferta bancaria efectiva** | El crédito de $27.700.000 a 10 años y 12 % e.a. es un supuesto. **No hay oferta**. FOGAPE es garantía sujeta a evaluación, no aprobación | Cotización en CLP a tasa fija, a 5 y 10 años, con todos los cargos, garantías exigidas, gracia y comisión de prepago |
| 3 | **Ventas piloto pagadas** | Las metas de 200–850 unidades son objetivos, no demanda. El precio de $349.990 no lo validó ningún cliente | Pilotos pagados con margen positivo: precio efectivamente pagado, CAC por cohorte, devoluciones y horas de soporte |
| 4 | **Revisión contable independiente** | El impuesto es una aproximación de caja Pro Pyme; no reproduce F29, PPM ni la declaración de abril | Contador revisa régimen, calificación Pro Pyme, remuneración de socios con control, PPM, IVA efectivo y deducibilidad |

**Cobertura de deuda del primer año: DSCR 1,04**, bajo el criterio interno de 1,3. Con el mismo principal, 5 años da 0,66 y 15 años 1,25: **ninguna alternativa alcanza 1,3 en 2027**. No firmar sin probar meses débiles.

Si se materializa el escenario de estrés (−35 % de ventas, VAN **−$47.949.651**), corresponde **redimensionar el negocio**, no estirar el plazo de la deuda.

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

## 4. Backend, despliegue y datos

| # | Pendiente | Estado actual |
|:---:|---|---|
| 16 | **Aplicar y probar la migración en staging** | `20260904120000_mediciones_sin_gps_idempotencia.sql` está escrita pero **no desplegada**. Validar constraints heredadas y PostgREST con `ON CONFLICT(client_uuid)` |
| 17 | **Esquema reproducible desde cero** | Las migraciones baseline son marcadores que no reconstruyen el esquema. Falta exportación versionada y prueba de restauración |
| 18 | **Ensayo de recuperación de respaldo** | El workflow diario existe; **que exista no prueba que restaure** |
| 19 | **Prueba e2e de la cola offline** | Cortes de red, cierre del proceso y cambio de cuenta |
| 20 | **Publicación OTA real** | `/firmware` es catálogo de solo lectura. Faltan carga de binarios, SHA-256, verificación e instalación comprobada — y el firmware mismo |
| 21 | **Backend meteorológico comercial** | [Open-Meteo reserva su modalidad gratuita al uso no comercial](https://open-meteo.com/en/pricing). Antes de vender hay que contratar acceso comercial o un proxy, y no exponer la clave en la app. La caché y el pronóstico de 7 días **no están implementados** |
| 22 | **Estado del despliegue remoto** | No se comprobó. El código local compila; producción no se auditó |

---

## 5. Obligaciones legales antes de comercializar

| # | Pendiente | Estado actual |
|:---:|---|---|
| 23 | **SUBTEL — equipos de alcance reducido** | Régimen actualizado vigente desde febrero de 2026. Las obligaciones aplican al **producto terminado**; la homologación FCC/CE del módulo no basta |
| 24 | **Batería: UN 38.3 / IEC 62133-2** | Sin celda definitiva adquirida ni expediente de ensayos y transporte |
| 25 | **Seguridad eléctrica (SEC)** | Definir qué se entrega, incluido cargador o adaptador. SELV a 5 V es atributo de diseño, no exención demostrada |
| 26 | **Ley 21.719 de datos personales** | Vigente desde el **1 de diciembre de 2026**. Faltan bases de tratamiento, derechos, retención, seguridad y transferencia internacional. Alojar en Brasil no las resuelve |
| 27 | **Protección al consumidor y garantía** | Definir política de garantía real frente al 5 % presupuestado en el modelo |
| 28 | **Decisión de licencia del repositorio** | **Sin `LICENSE`: todos los derechos reservados por defecto.** Decisión tomada el 04-09-2026 de no publicar licencia abierta mientras se evalúa comercializar. Revisable |

---

## Cifras vigentes al 04-09-2026

Precio **$349.990** con IVA · BOM **$75.243** neto · aporte **$9.000.000** · crédito **$27.700.000** a 10 años · cuota **$387.654** · DSCR 2027 **1,04** · VAN base **+$21.874.878** · VAN estrés **−$47.949.651** · equilibrio 2027 **170 u operativas / 195 u con deuda**.

Generadas con `python finanzas/modelo.py` desde `finanzas/supuestos.json`. **Regenerar siempre tras editar supuestos; no editar resultados a mano.** La fuente publicada es [`RESULTADOS_FINANCIEROS.md`](RESULTADOS_FINANCIEROS.md).

---

## Ya cerrado en el repositorio (04-09-2026)

Modelo económico reproducible con fuente única en JSON, FCFF y FCFE separados, deuda completa a 5/10/15 años y bullet, reserva explícita, tasas Pro Pyme por año, comisiones de canal y nómina sin mano de obra duplicada. Excel regenerado con **5.415 fórmulas, todas con resultado en caché** (la auditoría halló 577 sin ninguno) y sin la copia duplicada de `outputs/`.

Documentación sincronizada: los seis README y los cuatro documentos de apoyo declaran estado explícito —implementado, probado localmente u objetivo sin ensayo— y citan `RESULTADOS_FINANCIEROS.md` como fuente única. Se retiraron TIR, Pay Back, «retorno por socio», el ROI del 98 %, la matriz de «100 % Cumplido» normativo, IP67 y autonomía como prestaciones, y el badge MIT sin archivo de licencia.

En código: N/P/K sin cifras interpretables y excluidos del veredicto, dosis de cal y lavado eliminadas, mediciones sin GPS admitidas en el historial, cola con exclusión mutua por cuenta y borrado solo tras acuse, sincronización al recuperar red en primer plano, simulación restringida a desarrollo y contrato BLE unificado.

**Comprobado:** modelo reproducible en dos corridas idénticas · App 18/18 pruebas y `tsc --noEmit` limpio · Web `type-check` y `build` aprobados sin cambiar `package-lock.json` · 0 enlaces internos rotos · 0 cifras obsoletas sin retractar.

**No se ejecutó:** ningún ensayo físico, despliegue SQL, envío de notificaciones, cambio de credenciales ni contratación de servicios.
