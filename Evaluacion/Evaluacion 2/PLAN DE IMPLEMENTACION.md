# Plan de implementación — Informe corregido de la Evaluación 2

> **Documento interno de trabajo. No se entrega.** A diferencia del informe, este plan sí cita
> archivos del repositorio, porque son la fuente de verdad que hay que contrastar.

## 0. Qué se entrega y con qué reglas

**Entregable:** `Evaluacion/Evaluacion 2/INFORME CORREGIDO.md`. Es el informe de la Evaluación 1
corregido según lo que el repositorio tiene implementado hoy y ampliado para cumplir la rúbrica de
la Evaluación 2 (`Readme.md` de esta carpeta). Desde ese archivo se traslada el contenido al
documento Word con formato institucional.

Reglas que valen para todo el entregable:

1. **Mismo formato** que el informe de la Evaluación 1: portada, índices general, de figuras y de
   tablas, capítulos en números romanos, títulos «Tabla X.Y “…”» y «Figura X.Y “…”» bajo cada
   elemento y numeración continua.
2. **Sin referencias al repositorio:** ninguna ruta, nombre de archivo o script, identificador de
   código, comando ni enlace local. El texto debe leerse sin acceso al repositorio.
3. **Figuras nuevas o modificadas como bloques de código Mermaid**, listos para copiar en un editor
   Mermaid. Las figuras que no cambian conservan su imagen original y se indican como tal.
4. **Tablas completas:** todas las celdas con contenido, la misma cantidad de columnas en cada fila
   y totales que cuadren.
5. **Convenciones del proyecto:**
   - Español de Chile, «campo» en vez de «predio» o «potrero».
   - Siglas explicadas la primera vez: TAM, SAM, SOM, VAN, TIR, TCO, BOM.
   - Sin EBITDA, FCFF, FCFE, DSCR ni FTE; la dotación se expresa en personas.
6. **Decisiones cerradas que no se reabren:**
   - Financiamiento: el pie se entrega como condición de entrada y el crédito financia el 100 % de
     la inversión.
   - Precio derivado del costo con un 30 % de utilidad.
   - Horizonte de 10 años, con comparación a cinco.
   - Trama BLE de 20 bytes.

## 0.1. Decisiones tomadas (01-10-2026)

| Tema | Decisión |
| --- | --- |
| Base | El informe de la Evaluación 2 es una **actualización** del de la Evaluación 1. Parte de su versión corregida y conserva todo lo vigente |
| PCB | **99,9 × 90 mm**, medida de JLCPCB y confirmada con el contorno del ruteo. La carcasa se redimensiona para ella |
| Módulo ESP32 | Se compró el **ESP32-WROOM-32D** (antena impresa), aunque el símbolo del esquemático diga 32U. No se agrega antena externa a la BOM. Se conserva la zona libre de cobre bajo la antena y se corrige la denominación en el informe |
| Precio de la PCB | Compra real: **$15.000 con IVA, envío e impuestos** por el pedido mínimo de 5 placas, es decir **$3.000 por placa**. Sin capturas: se cita como compra efectuada, sin cotización documental. El modelo pasa de $2.854 a $3.000 |
| Materiales de montaje | **Entran a la BOM** y se regeneran todas las cifras económicas |
| Ensamble | Se comparan las alternativas de fabricación y se elige la más rentable. Hipótesis del equipo: **PCB desnuda más módulos comprados por separado** (ESP32, SP3485, BME280 y módulo de carga LX-LCBST), soldados en taller propio |
| Retroalimentación del mandante | Aún no hay. El capítulo VIII se arma con las mejoras propias y queda preparado para incorporar la del profesor cuando llegue |
| Cotizaciones | No hay capturas ni correos. Cada precio se cita con proveedor, fecha de consulta del catálogo y enlace público. La PCB es la única compra efectuada |
| Generación | Generador en `finanzas/` (recomendado en F1), salvo que indiques lo contrario |
| Archivo | `Evaluacion/Evaluacion 2/INFORME CORREGIDO.md` |

## 1. Diagnóstico del punto de partida

### 1.1. El archivo «INFORME 1 actualizado .docx» no es un Word

Es **idéntico, byte a byte, a `Evaluacion/Evaluacion 1/INFORME 1 .docx.pdf`**: un PDF de 112
páginas con la extensión cambiada. Por lo tanto, la base de texto es el informe entregado en la
Evaluación 1.

El repositorio ya tiene su versión corregida, `Evaluacion/Evaluacion 1/INFORME 1 CORREGIDO.md`.
La genera `finanzas/corregir_informe.py` con las cifras vigentes del modelo y ya incorpora el
buzzer, el pulsador PAIR y la PCB de JLCPCB. **El trabajo parte de esa versión corregida, no del
PDF.**

### 1.2. Cifras que cambiaron desde el PDF entregado

Todas salen del modelo (`finanzas/supuestos.json` + `finanzas/modelo.py`); no se escriben a mano.

| Concepto | PDF entregado | Valor vigente | Origen del cambio |
| --- | --- | --- | --- |
| PCB portadora por equipo | $2.000 (estimación) | $2.854 | Compra real a JLCPCB: 5 placas por US$15,02 con envío y aduana |
| Buzzer pasivo 9042 | No existía | $140 | Componente agregado al esquemático (BZ1, IO19) |
| BOM (lista de materiales) neta por equipo | $69.672 | $70.666 | Suma de las dos filas anteriores |
| Precio de lista con IVA | $449.409 | $450.929 | Derivado del costo con el 30 % de utilidad |
| VAN al 20 % | $112.827.790 | $113.397.717 | Arrastre del costo y del precio |
| TIR efectiva anual | 53,35 % | 53,43 % | Ídem |

Arrastran el cambio: las tablas 1.8 a 3.7, los párrafos que citan esas cifras, el TCO y las
conclusiones. La versión corregida de la Evaluación 1 ya los tiene al día.

### 1.3. Lo implementado que el informe debe describir con exactitud

| Tema | Estado real en el repositorio | Fuente |
| --- | --- | --- |
| Buzzer | Pasivo magnético 9042 en IO19, onda cuadrada de 2,7 kHz por LEDC. Cinco sonidos: encendido, ventana abierta, éxito, fallo y batería baja. Silencioso en reposo | `Firmware/zumbador.h`, `config.h`, `pines.h` |
| Pulsador | PAIR en IO33, activo en bajo, antirrebote de 30 ms. Mantenerlo 3 s abre una ventana de vinculación de 30 s. **No hay reset por pulsador**: el reset lo hace sólo soporte desde el backoffice | `Firmware/pulsador.h`, `config.h` |
| LEDs | Azul, verde y rojo, apagados en reposo y con un solo significado por color | `Firmware/leds.h`, `Firmware/README.md` |
| Batería | ADC en IO34 con divisor ×2. Aviso del equipo bajo 3,40 V, con histéresis hasta 3,50 V. La app avisa al 15 % y se rearma sobre el 20 % | `Firmware/config.h`, `App/src/utils/batteryWarning.ts` |
| Identidad y estado | ID de 15 dígitos derivado de la MAC. Característica de estado con batería, versión y banderas | `Firmware/identidad.*`, `docs/CONTRATO_BLE.md` |
| Lectura de suelo | **No implementada.** El firmware envía el centinela `FF` y la app no guarda la trama | `Firmware/TASK.md` (F1) |
| Reposo profundo | **No implementado** (F4); el equipo se apaga con el interruptor | `Firmware/TASK.md` |

### 1.4. Discrepancias que hay que resolver antes de redactar

Son bloqueantes: si el informe las arrastra, contradice el hardware real.

| # | Discrepancia | Evidencia | Qué decide |
| --- | --- | --- | --- |
| B1 | **Dimensiones de la PCB.** El ruteo mide **100 × 90 mm**, con 4 agujeros M2 a 90 × 80 mm entre centros. `PCB/README.md` dice 70 × 40 mm y la carcasa mide 75 mm de ancho, así que la placa no cabe | Contorno de `Medidor De Suelos V2.kicad_pcb` | **Resuelto:** la placa mide 99,9 × 90 mm; se redimensionan la carcasa y su costeo (gramos de PETG) |
| B2 | **Módulo ESP32.** El esquemático usa **ESP32-DevKitC-32U** (módulo WROOM-32UE, antena externa por U.FL). La BOM dice «DevKit WROOM-32» y no incluye antena ni cable | Símbolo U1 del esquemático | **Resuelto:** es un WROOM-32D con antena impresa; se corrige la denominación y no se agrega antena |
| B3 | **Buzzer conectado directo al GPIO.** La bobina de 16–42 Ω puede superar los 20 mA recomendados y no tiene diodo de rueda libre | `Firmware/TASK.md`, pendiente H1 | La especificación y las mejoras deben declarar la mitigación: resistencia serie ahora, transistor y diodo en la próxima revisión |
| B4 | **Modelo energético.** No incluye el buzzer ni los LEDs indicadores. Los 18 mA de espera del ESP32 no consideran que hoy anuncia BLE continuamente sin reposo | `finanzas/energia.py` | Recalcular las tablas 4.5 a 4.9 y su texto |
| B5 | **Materiales fuera de la BOM:** interruptor de panel, prensaestopas M12, o-ring, respiradero de PTFE, insertos M3, cableado y embalaje. Suman unos $4.000–5.000 por equipo (+6 %) | `_bom_pendiente` en `finanzas/supuestos.json` | **Resuelto:** entran a la BOM con cotización (fase F5) |
| B6 | **Designadores antiguos** en las secciones 4–9 de `PCB/README.md`; por ejemplo, D4 es el LED rojo en el esquemático y una protección TVS en el README | Esquemático frente a README | Mandan el esquemático y `Firmware/pines.h` |

## 2. Rúbrica frente al informe

| Criterio | Exige | Qué hay hoy | Qué falta | Sección del informe corregido |
| --- | --- | --- | --- | --- |
| 1.1.4.1 Ingeniería conceptual (3) | Que la ingeniería básica se apoye en las decisiones conceptuales | Capítulo V completo | Trazabilidad explícita entre decisión conceptual, requisito y solución básica | VI.1 |
| 1.1.4.2 Alcances y filosofías operativas (3) | Alcance, límites y forma de operar | Filosofía del proyecto (cap. III) y frontera offline/online | Alcance incluido y excluido, modos de operación, roles y secuencia de una jornada | VI.2 |
| 1.1.4.3 Capacidades y características (6) | Qué hace el producto y el servicio, con sus límites | Especificaciones sueltas (tablas 3.8, 3.9 y 4.1) | Ficha de capacidades del equipo, la app, el backoffice y el servicio, distinguiendo lo declarado de lo verificado | VI.3 |
| 1.1.4.4 Selección según especificaciones (6) | Justificación de cada material y equipo | Comparativas conceptuales (tablas 1.3 a 1.5) | Requisito → alternativas → elegido → criterio, para cada subsistema | VI.4 |
| 1.1.4.5 Eficiencia energética y digitalización (6) | Criterios aplicados al diseño | Tablas 4.4 a 4.9 | Actualizar con buzzer, LEDs y reposo pendiente; indicadores y mejoras cuantificadas | VI.5 |
| 1.1.5.6 Materiales, cotizaciones y proveedores (6) | Lista de compra con cotización y proveedor | BOM con proveedor y precio | Número de parte, fecha de cotización, plazo, compra mínima y alternativa; materiales de montaje y equipos de taller | VII.1 |
| 1.1.5.7 Selección de detalle (6) | Verificar cada componente contra su hoja de datos | No existe | Requerido frente a hoja de datos, con su margen | VII.2 |
| 1.1.5.8 Geometría y dimensiones (6) | Todo lo necesario para fabricar y montar | Carcasa conceptual, 140 × 75 × 38 mm | Contorno real de la PCB, agujeros, capas, zona libre de antena, conectores, carcasa con tolerancias, fijaciones, sellos y secuencia de montaje | VII.3 |
| 1.1.5.9 Ensayos y pruebas (6) | Pruebas de equipos y sistemas | Protocolo in situ y deriva (tablas 5.2 y 5.3) | Matriz completa desde la placa sin armar hasta el piloto, con método, instrumento y criterio de aceptación | VII.4 |
| 1.1.6.10 Mejoras retroalimentadas (6) | Mejoras pedidas por el mandante y las propias | No existe como capítulo | Observación → mejora → estado | VIII |
| 1.1.6.11 Formato institucional (6) | El mismo formato | Formato de la Evaluación 1 | Índices y numeración al día | Todo el documento |

## 3. Estructura del informe corregido

Los capítulos I a V se conservan con sus correcciones. Se agregan tres capítulos y los dos finales se
renumeran. Las tablas continúan desde la 5.5 y las figuras desde la 2.0.

| Capítulo | Contenido |
| --- | --- |
| I–V | Texto de la Evaluación 1 corregida, con las cifras vigentes y el hardware real (fase F2) |
| **VI. Ingeniería Básica** | VI.1 Continuidad con la ingeniería conceptual · VI.2 Alcance y filosofía operativa · VI.3 Capacidades y características del producto y del servicio · VI.4 Selección de materiales y equipos · VI.5 Eficiencia energética y digitalización |
| **VII. Ingeniería de Detalle** | VII.1 Materiales y equipos a adquirir, cotizaciones y proveedores · VII.2 Verificación de especificaciones · VII.3 Geometría, dimensiones y montaje · VII.4 Ensayos y pruebas |
| **VIII. Propuestas de Mejora** | Retroalimentación del mandante y mejoras de las ingenierías conceptual y básica |
| IX. Conclusiones | Actualizadas con las ingenierías básica y de detalle |
| X. Referencias Bibliográficas | Las vigentes más las hojas de datos y cotizaciones nuevas |

### 3.1. Tablas nuevas previstas

| N.º | Título | Sección | Fuente |
| --- | --- | --- | --- |
| 5.5 | Trazabilidad de la ingeniería conceptual a la básica | VI.1 | Capítulo V y decisiones cerradas |
| 5.6 | Alcance incluido y excluido | VI.2 | Decisiones vigentes de app, firmware y backend |
| 5.7 | Modos de operación del equipo | VI.2 | Firmware: pulsador, LEDs, buzzer e interruptor |
| 5.8 | Roles y permisos de operación | VI.2 | Administración de equipos (admin, usuario, soporte) |
| 5.9 | Capacidades del equipo | VI.3 | Sonda, BME280, batería, BLE |
| 6.0 | Capacidades de la aplicación y del backoffice | VI.3 | App y Web |
| 6.1 | Capacidades del servicio | VI.3 | Soporte, reset, avisos, garantía |
| 6.2 | Selección por subsistema | VI.4 | Esquemático y BOM |
| 6.3 | Balance energético actualizado (buzzer y LEDs) | VI.5 | Modelo energético recalculado |
| 6.4 | Medidas de eficiencia y ahorro estimado | VI.5 | Mejoras F4, HT7533, divisor de 1 MΩ |
| 6.5 | Lista de compra con cotizaciones y proveedores | VII.1 | BOM con número de parte y fecha |
| 6.6 | Resumen de compra por proveedor | VII.1 | Agregado de la tabla 6.5 |
| 6.7 | Materiales de montaje y sellado | VII.1 | Pendientes B5, cotizados |
| 6.8 | Equipos de taller | VII.1 | Equipamiento del modelo |
| 6.9 | Verificación de especificaciones por componente | VII.2 | Hojas de datos |
| 7.0 | Datos de fabricación de la PCB | VII.3 | Archivo de ruteo |
| 7.1 | Coordenadas de agujeros y conectores | VII.3 | Archivo de ruteo |
| 7.2 | Dimensiones y tolerancias de la carcasa | VII.3 | Diseño mecánico (decisión B1) |
| 7.3 | Matriz de ensayos de la PCB y la electrónica | VII.4 | Puntos de prueba, JP1, procedimiento del firmware |
| 7.4 | Matriz de ensayos del sistema y del software | VII.4 | BLE, Modbus, app, backend, matriz de teléfonos |
| 7.5 | Ensayos de producto terminado y normativos | VII.4 | IP67, caída, temperatura, radiofrecuencia |
| 7.6 | Mejoras incorporadas y propuestas | VIII | Retroalimentación y pendientes |

La numeración final la fija el orden de lectura; esta lista sirve para no olvidar ninguna tabla.

### 3.2. Figuras

| N.º | Título | Tipo Mermaid | Sección |
| --- | --- | --- | --- |
| 1.8 | Árbol de alimentación y nodos de tensión (revisada contra el esquemático: F1, JP1, D1, MOD1, SW1, Q1/Q2) | `flowchart LR` | V |
| 2.0 | De la ingeniería conceptual a la de detalle | `flowchart TD` | VI.1 |
| 2.1 | Estados de operación del equipo | `stateDiagram-v2` | VI.2 |
| 2.2 | Secuencia de una jornada de medición | `sequenceDiagram` | VI.2 |
| 2.3 | Vinculación con la ventana PAIR | `sequenceDiagram` | VI.2 |
| 2.4 | Flujo de datos y digitalización | `flowchart LR` | VI.5 |
| 2.5 | Diagrama de bloques del hardware | `flowchart TB` | VII.2 |
| 2.6 | Secuencia de montaje | `flowchart TD` | VII.3 |
| 2.7 | Secuencia de ensayos, de la placa al piloto | `flowchart LR` | VII.4 |

Lo que **no puede ser Mermaid:**

- **Planos acotados** de la PCB y de la carcasa: Mermaid no dibuja cotas. Las cotas van en las tablas
  7.0 a 7.2, y el plano se exporta de KiCad (vista de fabricación con contorno y agujeros) y del CAD de
  la carcasa. KiCad no está instalado en este equipo, así que esa exportación la harás tú o se instala
  KiCad.
- **Figura 1.9** (representación de la carcasa): conserva la imagen, salvo que la decisión B1 cambie
  sus medidas.

## 4. Fases de implementación

Ejecutar en orden y cerrar cada fase con su comprobación.

### F0. Decisiones (las tomas tú)

Las preguntas de la sección 6. Sin ellas, B1, B2 y B5 quedarían escritas con datos falsos.

### F1. Base y mecanismo de generación

Recomendado: **un generador** (`finanzas/informe_evaluacion2.py`, invocado desde `finanzas/modelo.py`).
Parte de la versión corregida de la Evaluación 1 y escribe `INFORME CORREGIDO.md`. Las cifras y tablas
numéricas (BOM, cotizaciones, energía, economía) se calculan desde el modelo y la prosa vive en el
generador. Así una cifra sigue viviendo en un solo lugar y el informe no se desincroniza al cambiar un
precio.

Alternativa: redactar el archivo a mano y validarlo con el script de la fase F8. Es más rápido, pero
cada cambio de precio obliga a corregirlo a mano.

En ambos casos:

- Agregar el archivo a la lista de generados de `CLAUDE.md` y `AGENTS.md`.
- Asegurar que `python finanzas/modelo.py` lo regenere sin errores.

### F2. Correcciones de los capítulos I a V

1. Llevar las cifras de la sección 1.2 a todas sus apariciones, incluidas las de la prosa y las
   conclusiones.
2. Interfaz física: pulsador (3 s, ventana de 30 s, sin reset), buzzer y LEDs, según la sección 1.3.
3. Hardware: módulo DevKitC-32U y antena (B2), y la nota de mitigación del buzzer (B3).
4. Estado probatorio (tabla 4.1): marcar lo implementado y lo pendiente de ensayo, sin presentar como
   verificado lo que no se ha medido.
5. Figura 1.8: redibujarla en Mermaid si el esquemático difiere de la imagen.

**Hecho cuando:** ninguna cifra del texto difiere del modelo y ninguna afirmación de hardware
contradice el esquemático o el firmware.

### F3. Energía (B4)

1. En `finanzas/energia.py`:
   - Agregar la energía de cada evento del buzzer (duración de cada sonido × corriente estimada)
     y de los LEDs indicadores.
   - Revisar la espera de 18 mA del ESP32 con BLE anunciando y sin reposo, contra la hoja de datos.
   - Declarar como estimación todo lo que no se ha medido.
2. Regenerar y revisar el arrastre en las tablas 4.5 a 4.9. Ese archivo también alimenta la versión
   corregida de la Evaluación 1.
3. Cuantificar las mejoras: reposo profundo por IO33 (F4), módulo desnudo con regulador HT7533,
   divisor de 1 MΩ y excitación del buzzer con transistor.

**Hecho cuando:** el balance incluye todos los consumidores del esquemático y la autonomía declarada
sale del modelo.

### F4. VI. Ingeniería básica (1.1.4.1 a 1.1.4.5)

Contenido de las tablas 5.5 a 6.4 y las figuras 2.0 a 2.4. Cada capacidad lleva su estado: verificada,
implementada sin ensayo o pendiente. Por ejemplo, la lectura de suelo depende del driver Modbus todavía
no implementado; el informe lo dice sin presentarlo como operativo.

### F5. VII. Ingeniería de detalle (1.1.5.6 a 1.1.5.9)

#### Comparación de alternativas de fabricación

Datos de partida obtenidos hoy:

- **Ruteo:** 48 juntas SMD, todas con huellas para soldar a mano (resistencias y condensadores 1206,
  LEDs 0603, SOT-23, SMA, fusible, pulsador y JP1). Hay además 99 juntas pasantes: DevKit (38),
  SP3485 (23), BME280 (4), LX-LCBST (4), borneras (8), buzzer (2), puntos de prueba (15) y
  agujeros M2 (4).
- **Tarifas publicadas de ensamble de JLCPCB:**
  - Económico: preparación US$8,18, esténcil US$1,53 y US$0,0016 por junta SMD.
  - Carga de cada componente «extendido»: US$3,07.
  - Junta pasante manual: US$0,0164.

| Alternativa | Qué compra | Qué se suelda en taller | Variable a calcular |
| --- | --- | --- | --- |
| A. PCB desnuda, módulos y discretos por separado | PCB a JLCPCB; módulos en AliExpress; discretos en LCSC | Las 147 juntas | Minutos de soldadura × costo horario del ensamblador |
| B. PCB con ensamble SMT de JLCPCB, módulos por separado | PCB con los 48 puntos SMD montados; módulos en AliExpress | 99 juntas pasantes | Cargos fijos por pedido prorrateados al tamaño de lote, menos los minutos ahorrados |
| C. Ensamble completo en JLCPCB | No es viable: los módulos (DevKit, LX-LCBST, SP3485 y BME280) no están en su catálogo de montaje | — | Se descarta con su motivo |

El generador calcula el costo por equipo de A y B al volumen anual del plan de ventas y al lote
mínimo, y la decisión sale del menor costo por equipo. Si A gana, como supone el equipo, la BOM queda
igual; si gana B, cambian las filas de discretos y el flete de LCSC.

#### Cotizaciones de los materiales de montaje (consulta del 01-10-2026)

| Material | Proveedor y referencia | Precio encontrado | Uso |
| --- | --- | --- | --- |
| Prensaestopa PG7 IP68 con tuerca | MCI Electronics (Chile) | $990 unitario; $3.900 el pack de 10 | Salida del cable de la sonda |
| Interruptor de encendido IP67 | MCI Electronics (Chile) | $6.990; buscar uno de panel más pequeño en AliExpress | Corte general, bornera J1 |
| Insertos roscados M3 de latón | AliExpress | US$1,09–2,33 por 100 | Cierre tapa-cuerpo |
| Tornillos M3 inoxidables y separadores | MCI Electronics (Chile) | Kits de $7.590–8.490 | Cierre y fijación de la PCB (agujeros M2: confirmar tornillería M2) |
| Respiradero M12 de membrana ePTFE | Alibaba o AliExpress | US$0,42–3,00 según volumen | Respiración del BME280 sin ingreso de agua |
| O-ring de silicona, tapa del USB-C, cableado interno, embalaje, manual y etiqueta | Por cotizar en F5 | — | Sellado y presentación |

Son precios de catálogo, no cotizaciones formales. En F5 se fija un precio por equipo para cada fila,
con su fecha. El total reemplaza el orden de magnitud de $4.000–5.000 del modelo.


1. **Cotizaciones (6.5 a 6.8):**
   - Por cada fila: proveedor, número de parte o SKU, cantidad por equipo, precio unitario, fecha de
     cotización, compra mínima, plazo de entrega estimado y alternativa.
   - Separar la compra real (JLCPCB) de los precios de catálogo (LCSC, AliExpress).
   - Agregar los materiales de montaje según la decisión B5.
2. **Verificación (6.9):** tensión, corriente, temperatura y encapsulado de cada componente frente a
   su hoja de datos:
   - AO3400A y AO3401A frente a la corriente de la sonda.
   - Fusible de 1 A frente al consumo máximo.
   - M7 frente a la inversión de polaridad.
   - SP3485 a 3,3 V.
   - Rangos del BME280.
   - LiPo de 2.000 mAh frente al módulo de carga.
   - Buzzer frente al GPIO (B3).
3. **Geometría (7.0 a 7.2):** datos del archivo de ruteo:
   - Contorno, espesor de 1,6 mm, 2 capas, 1 oz de cobre.
   - Agujeros M2, zona libre de la antena, posición de conectores y puntos de prueba.
   - Carcasa: dimensiones, paredes, tolerancias de impresión, insertos M3, prensaestopas M12, o-ring
     y respiradero.
   - Secuencia de montaje (figura 2.6).
4. **Ensayos (7.3 a 7.5 y figura 2.7):**
   - Inspección de la placa desnuda y continuidad.
   - Puesta en marcha por etapas con los puntos de prueba.
   - Corriente por JP1.
   - Procedimiento de prueba del firmware.
   - Alcance BLE y Modbus con CRC.
   - Calibración contra laboratorio y deriva (se enlazan las tablas 5.2 y 5.3 existentes).
   - Autonomía real, IP67 (IEC 60529), caída y temperatura.
   - Radiofrecuencia según la normativa vigente.
   - Pruebas automatizadas de la app y el backend, matriz de teléfonos y piloto.
   - Cada ensayo con método, instrumento, criterio de aceptación y estado.

### F6. VIII. Mejoras retroalimentadas (1.1.6.10)

Tabla 7.6 con dos orígenes:

1. **Observaciones del mandante en la Evaluación 1**, que necesito que me pases (sección 6).
2. **Mejoras propias ya incorporadas:**
   - Precio derivado del costo.
   - PCB con compra real.
   - Buzzer y pulsador PAIR.
   - Reset sólo desde el backoffice.
   - Avisos de acceso y aviso de batería en la app.
   - Sin lecturas inventadas.

   Y **mejoras propuestas:** las de la fase F3 y las de B2, B3 y B5.

### F7. Cierre editorial

- Índices general, de figuras y de tablas.
- Numeración continua y referencias «Tabla X.Y» resueltas.
- Siglas en su primera aparición.
- Referencias bibliográficas nuevas: hojas de datos de SP3485, AO3400A, AO3401A, 9042, BME280,
  módulo de carga, JLCPCB, LCSC, IEC 60529 y normativa de radiofrecuencia.

## 5. Validación (fase F8)

Un script de comprobación (en `finanzas/`, como las pruebas del modelo) que falle ante cualquier error:

| Comprobación | Cómo |
| --- | --- |
| Cifras | Cada monto, porcentaje y cantidad del informe frente a `supuestos.json`, `modelo.py` y `energia.py` |
| Totales | La suma de cada BOM, subtotal y resumen por proveedor cuadra con su total |
| Tablas | Encabezado, separador y filas con el mismo número de columnas, sin celdas vacías |
| Mermaid | Cada bloque se renderiza con el CLI de Mermaid (`npx @mermaid-js/mermaid-cli`); un error de sintaxis falla la validación |
| Numeración | Tablas y figuras consecutivas, sin repetidos; índices idénticos a los títulos; toda referencia «Tabla X.Y» o «Figura X.Y» existe |
| Sin repositorio | No hay rutas, extensiones de código, nombres de scripts, comillas invertidas de código ni enlaces locales |
| Términos | Ni EBITDA, FCFF, FCFE, DSCR, FTE, «predio» ni «potrero»; siglas definidas en su primera aparición |
| Hardware | Pines, tiempos (3 s, 30 s, 2,7 kHz, 3,40/3,50 V) y designadores coinciden con el firmware y el esquemático |

Además:

- `python finanzas/modelo.py`
- `python -m unittest discover -s finanzas -p "test_*.py"`
- `python docs/verificar_documentacion.py`
- Una lectura completa del documento contra la rúbrica, criterio por criterio.

## 6. Lo que necesito de ti

Las decisiones de la sección 0.1 cubren todo lo necesario para empezar. Quedan dos preguntas que no
bloquean:

1. **Carcasa:** no hay CAD en el repositorio. Si no existe, propongo medidas a partir de la placa, la
   batería, las paredes y las holguras de impresión, y las declaro como diseño a validar con el primer
   prototipo impreso.
2. **Planos acotados:** si instalas KiCad o exportas tú la vista de fabricación, el plano de la PCB
   entra como figura; si no, la geometría queda en tablas de cotas.

## 7. Riesgos

- **Prometer lo no verificado:** lectura de suelo, IP67, autonomía y peso siguen sin ensayo. El
  informe los presenta como especificación de diseño con su ensayo de aceptación, no como resultado.
- **Cambiar la BOM** (PCB a $3.000, materiales de montaje y carcasa más grande) mueve todas las cifras económicas. Hay que regenerar y revisar el texto
  que las comenta (márgenes, punto de quiebre, TCO).
- **Planos acotados:** sin exportar desde KiCad o desde el CAD, el criterio 1.1.5.8 queda sólo con
  tablas de cotas.
