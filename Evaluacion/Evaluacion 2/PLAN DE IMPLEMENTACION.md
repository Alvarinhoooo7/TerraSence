# Plan de implementación — Informe de la Evaluación 2

> **Documento interno de trabajo. No se entrega.** A diferencia del informe y de sus anexos, este plan
> sí cita archivos del repositorio, porque son la fuente de verdad que hay que contrastar.
>
> Versión del 02-10-2026. Reemplaza la del 01-10-2026: incorpora lo indicado en clases. Lo nuevo es el
> hilo conductor de ingeniería, el diseño sin módulos de desarrollo, el taller como sistema a
> especificar, la potencia instalada, Industria 4.0, FAT/SAT, la carta Gantt y los anexos.

## 0. Qué se entrega

| Entregable | Archivo | Forma |
| --- | --- | --- |
| Informe | `Evaluacion/Evaluacion 2/INFORME CORREGIDO.md` → Word con formato institucional | Redacción a mano. Las cifras se validan contra el modelo (F12) |
| Anexo A. Cotizaciones | `Evaluacion/Evaluacion 2/Anexos/Anexo A - Cotizaciones TerraSense.xlsx` | Generado por `python finanzas/modelo.py`. Se sube a Drive |
| Anexo B. Flujo de caja | `Evaluacion/Evaluacion 2/Anexos/Anexo B - Flujo de caja TerraSense.xlsx` | Generado por `python finanzas/modelo.py`. Se sube a Drive |
| Anexo C. Planos de la placa | PDF exportado de KiCad: esquemático, capas, vista de fabricación acotada y plano de ensamble | Lo exportas tú desde la PCB V3 |
| Anexo D. Planos de la carcasa | PDF del CAD con vistas acotadas, cortes y tolerancias | Lo exportas tú desde el CAD |
| Anexo E. Protocolos FAT y SAT | Formularios de registro, una hoja por protocolo | Generado por `finanzas/anexos.py` desde `modelo.py` |

### 0.1. Reglas que valen para el informe y los anexos

1. **Mismo formato institucional** que la Evaluación 1:
   - Portada e índices general, de figuras y de tablas.
   - Capítulos en números romanos.
   - «Tabla X.Y "…"» y «Figura X.Y "…"» bajo cada elemento, con numeración continua.
2. **Sin referencias al repositorio**, ni en el informe ni en los anexos: ninguna ruta, nombre de
   archivo o script, identificador de código, comando ni enlace local.
3. **Figuras nuevas en bloques Mermaid** listos para copiar. Los planos acotados no pueden ser Mermaid:
   van como figura exportada de KiCad o del CAD, con el detalle en los anexos C y D.
4. **Tablas completas:** todas las celdas con contenido, igual número de columnas por fila y totales que
   cuadren.
5. **Convenciones:**
   - Español de Chile; se dice «campo».
   - Siglas explicadas la primera vez (TAM, SAM, SOM, VAN, TIR, TCO, BOM, y además FAT, SAT, PCBA, LDO,
     ESD, IoT).
   - Sin EBITDA, FCFF, FCFE, DSCR ni FTE; la dotación se expresa en personas.
6. **Decisiones cerradas** (`CLAUDE.md` §3): pie como condición de entrada y crédito por el 100 % de la
   inversión; precio derivado del costo con un 30 % de utilidad; horizonte de 10 años con comparación a
   cinco; trama BLE de 20 bytes.
7. **Una cifra vive en un solo lugar.** Los precios de la BOM y del taller viven en
   `finanzas/supuestos.json`. Los anexos A y B se generan desde ahí, y el informe se valida contra
   ellos.

## 1. Lo que pidió el profesor, traducido a exigencias verificables

### 1.1. Hilos conductores

**Etapas del proyecto, que pasan a ser la estructura del informe:**

> Problema → Ingeniería conceptual → Ingeniería básica → Ingeniería de detalle → Fabricación → Pruebas

| Etapa | Pregunta que responde | Capítulo |
| --- | --- | --- |
| Problema | ¿Qué necesidad hay y cómo se mide? | II |
| Ingeniería conceptual | ¿Qué solución implementaremos? | III |
| Ingeniería básica | ¿Cómo funcionará técnicamente? | IV |
| Ingeniería de detalle | ¿Cómo se construirá, comprará e instalará? | V |
| Fabricación | ¿Con qué proceso, capacidad y control se produce? | VI |
| Pruebas | ¿Cómo se demuestra que cumple? | VII |

**Ciclo que se aplica a cada equipo, del producto y del taller:**

> Especificar → Justificar → Cotizar → Dimensionar → Probar

Cada ítem debe recorrer las cinco columnas: requisito, matriz de decisión, proveedor y precio, cálculo
de capacidad o carga, y ensayo que lo acepta. La **tabla de trazabilidad maestra** (F8) lo comprueba fila
por fila.

### 1.2. Exigencias concretas

| # | Exigencia de clases | Dónde se cumple | Estado actual en el informe |
| --- | --- | --- | --- |
| E1 | Transformar la necesidad en una solución técnicamente especificada | II (requerimientos medibles) → IV (ficha técnica) | La necesidad está descrita, pero no convertida en requerimientos numéricos |
| E2 | Justificar **todos** los equipos, incluido el taller (impresora 3D, soldador, osciloscopio) | IV.4 (producto) y V.2 (taller) | El taller aparece sólo como lista de precios (tablas 2.1 y 7.0), sin modelo ni justificación |
| E3 | Filosofía operativa: condiciones, fases y acción que se ejecuta | IV.1 | Hay modos de operación (tabla 5.7); falta la matriz condición → fase → acción |
| E4 | Capacidades: n.º de sensores, rango, precisión, autonomía, tensiones, almacenamiento, distancia, protocolos, temperatura, velocidad | IV.2 | Dispersas en las tablas 3.8, 3.9, 4.1 y 5.9 |
| E5 | Requerimientos técnicos de cada componente y matriz de decisión («este porque es IP67», «este porque trabaja a 3,3 V») | IV.3 | Matrices sólo para el MCU, la sonda y el sensor ambiental, y a nivel de módulo |
| E6 | Eficiencia energética: potencia instalada, modos, gestión de cargas, consumo anual en kWh | IV.5 | Balance del equipo en mAh. Falta la potencia instalada en W, el taller y los kWh/año |
| E7 | Digitalización con Industria 4.0: independencia o dependencia de la red, dashboard, alarmas, app, IoT, análisis de datos, trazabilidad, ciberseguridad | IV.6 | Hay pilares (tabla 4.4) y eslabones (tabla 6.6); falta el marco 4.0 y la ciberseguridad |
| E8 | Cotización en Excel: Equipo · Modelo · Cantidad · Proveedor · Valor unitario · Valor total. Proveedores LCSC y DigiKey | Anexo A + tabla resumen en V.3 | La BOM está en el cuerpo del informe, con AliExpress como fuente principal |
| E9 | Geometría completa: planos, ubicaciones, montaje, tolerancias, conectores, distancias y secuencia, de modo que un tercero pueda construirlo | V.5, V.6 y anexos C y D | Tablas de cotas (7.5 a 7.9), pero sin planos ni lista de cableado |
| E10 | Ensayos Requerimiento → Prueba, con FAT y SAT | VII | Matrices por tipo (8.0 a 8.4), sin el par requerimiento → prueba ni FAT/SAT |
| E11 | **Sin módulos de desarrollo:** ESP32 como módulo con antena, BME280 como IC, cargador y elevador como IC, USB-C de carga y datos con CH340 | IV.3, V y PCB V3 | Todo el estudio está hecho sobre módulos (DevKit, LX-LCBST, SP3485 y BME280 en placa) |
| E12 | Introducción y conclusión propias de la Evaluación 2 | I y XI | La introducción todavía habla de «la ingeniería conceptual» del informe 1 |
| E13 | Achicar el flujo de caja en el informe y entregarlo ordenado como anexo, en hojas independientes | VIII + anexo B | El capítulo económico ocupa ≈ 400 líneas con 30 tablas |
| E14 | Carta Gantt real del proyecto: desarrollo hasta el prototipo final de diciembre, puesta en marcha y aprobación de la app, por trimestres | IX | No existe |

## 2. Decisiones

### 2.1. Vigentes del plan anterior

- **Tamaño de la PCB V3 abierto.** Los 99,9 × 90 mm son los de la V2. La V3 aún no tiene contorno: la
  carcasa, su costeo (gramos de PETG) y la cantidad de carcasas por cama de impresión se calculan cuando
  lo tenga. Mientras tanto, la V2 sirve como cota superior.
- **Compra real de la PCB V2 a $3.000 por placa.** Pasa a ser el antecedente del prototipo. El costo de
  la V3 se cotiza en F3.
- **Materiales de montaje dentro de la BOM.**
- **La retroalimentación del mandante es lo dicho en clases.** Se registra en el capítulo X con origen
  «mandante» (E1 a E14).

### 2.2. Nuevas, con la recomendación que aplico si no indicas otra cosa

| # | Tema | Recomendación | Motivo |
| --- | --- | --- | --- |
| D1 | **Prototipo frente a producto** | La **PCB V2** (con módulos, ya comprada) se declara **prototipo de laboratorio**. El estudio completo (especificación, BOM, costos, energía y ensayos) se hace sobre la **PCB V3 sin módulos**, que es el producto | Lo pidió el profesor: el abastecimiento de los módulos de desarrollo no está asegurado |
| D2 | **Microcontrolador** (**cerrada por ti, 02-10-2026**) | **Módulo ESP32-WROOM-32D**, con antena impresa, soldado por sus pads castellados directamente en la PCB V3 | Es el mismo módulo del prototipo, así que se conservan el firmware y `Firmware/pines.h`. No se usa ni la placa de desarrollo ni el chip desnudo |
| D3 | **Matriz del MCU por nivel de integración** | Comparar los tres niveles del mismo ESP32 y justificar el módulo. Ver la tabla siguiente | Es la justificación exacta que pide el profesor: por qué no el DevKit y por qué no el IC desnudo |

**Los tres niveles de integración del ESP32.** El informe debe distinguirlos con precisión:

| Nivel | Qué es | Qué trae | Por qué no o por qué sí |
| --- | --- | --- | --- |
| IC desnudo **ESP32-D0WD** | Chip en QFN de 5 × 5 mm o 6 × 6 mm | Sólo el silicio: **sin antena**, sin flash y sin cristal | Obliga a diseñar cristal de 40 MHz, flash SPI, red de adaptación y antena, y a certificar la radiofrecuencia desde cero. Exige soldadura por reflujo. Descartado |
| **Módulo ESP32-WROOM-32D** | Módulo blindado de 18 × 25,5 mm con pads castellados | Chip, flash de 4 MB, cristal, **antena impresa** y certificación modular de radio | **Elegido**: integra lo difícil de RF, ya certificado. Se suelda a la placa como un componente más y es el que ya se usa |
| Placa de desarrollo **ESP32-DevKitC** | Módulo + regulador AMS1117 + puente USB + pines THT | Todo lo anterior, más el regulador, el USB, los LED y los pulsadores | Es un **módulo de desarrollo**: su abastecimiento no está asegurado para producción, ocupa espacio y su regulador consume ≈ 6 mA en reposo. Queda sólo en el prototipo V2 |

**Riesgo del 32D que el informe debe declarar.** Espressif no recomienda el 32D para diseños nuevos; su
reemplazo directo, de igual huella y pines, es el **ESP32-WROOM-32E**. El informe lo plantea como
alternativa de abastecimiento: «si el 32D se discontinúa, el 32E entra sin cambiar la placa ni el
firmware». Se confirma en F3 contra la ficha de ciclo de vida del fabricante.
| D4 | **Ensamble** | Con componentes desnudos (BME280 en LGA de 2,5 × 2,5 mm, cargador con almohadilla térmica) la soldadura a mano deja de ser razonable. Se compara **A: taller con esténcil y placa calefactora** con **C: PCBA completo de JLCPCB**. Con todos los IC en el catálogo de LCSC, C pasa a ser viable | Invierte la conclusión actual de las tablas 7.1 y 7.2, que descartaban C por los módulos |
| D5 | **Proveedores** | Componentes electrónicos: **LCSC** como principal y **DigiKey** como alternativa y para el instrumental del taller. Sonda, celda y carcasa: se mantienen sus fuentes actuales, con justificación. AliExpress sólo donde ni LCSC ni DigiKey tienen el ítem | Indicación de clases. LCSC además alimenta el PCBA de JLCPCB |
| D6 | **Generación** | Informe redactado a mano y validado por script (F12). Anexos A y B generados por `finanzas/modelo.py` | El informe de la E2 ya es manual. Los anexos son tablas puras: generados no se desincronizan |
| D7 | **Fechas de la carta Gantt** (**cerrada por ti, 02-10-2026**) | Hito fijo: **entrega del prototipo funcional al cliente el 17 de diciembre de 2026**. Después: puesta en marcha en **febrero de 2027**, aprobación de la app en las tiendas en **marzo de 2027** y venta desde el segundo trimestre de 2027, coherente con las 200 unidades de 2027 del modelo | La carta Gantt es del proyecto, no del curso: **no incluye las evaluaciones** |
| D8 | **Celda** (**cerrada por ti, 02-10-2026**) | **LiPo de 3,7 V y 2.000 mAh con protección incluida** | Se mantiene. Por eso la protección DW01A + FS8205A **no** va en la placa |
| D9 | **Impresora 3D** (**propuesta por ti, 02-10-2026**) | **Creality K1C**: volumen de 220 × 220 × 250 mm y cámara cerrada | Permite imprimir más de una carcasa por cama. La matriz la compara con otras dos impresoras de cámara cerrada, y el dimensionamiento de F7 calcula cuántas carcasas caben por cama cuando exista el tamaño de la V3 |

## 3. Nueva estructura del informe

La Evaluación 1 era un informe de ingeniería conceptual con un capítulo económico grande. La E2 se
reorganiza sobre el flujo de etapas. Lo conceptual se condensa (ya fue evaluado) y la economía pasa al
final, porque el costo **sale** de la ingeniería de detalle: el ciclo «cotizar» alimenta la BOM y la BOM
alimenta el precio.

| Cap. | Título | Contenido | Viene de |
| --- | --- | --- | --- |
| I | Introducción | Nueva (F10) | Reescrita |
| II | Problemática y requerimientos | Problema condensado + **tabla Necesidad → Requerimiento técnico medible** (E1) | Cap. II actual |
| III | Ingeniería conceptual | Propuesta y filosofía del proyecto, ecosistema, filtro de viabilidad, matriz de arquitecturas, frontera offline/online, mercado (TAM, SAM, SOM). **Trazabilidad conceptual → básica** | Caps. III, IV y V actuales, condensados |
| IV | Ingeniería básica | IV.1 Filosofía operativa · IV.2 Capacidades y características · IV.3 Requerimientos técnicos y matrices de decisión · IV.4 Arquitectura eléctrica de la PCB V3 · IV.5 Eficiencia energética · IV.6 Digitalización e Industria 4.0 · IV.7 Marco normativo aplicable | Cap. VI actual, reescrito sin módulos |
| V | Ingeniería de detalle | V.1 Especificación de compra del producto · V.2 Equipos del taller · V.3 Cotizaciones y proveedores (resumen; detalle en anexo A) · V.4 Verificación contra hojas de datos · V.5 Geometría de la PCB V3 · V.6 Carcasa, conectores, cableado y montaje · V.7 Instalación y puesta en marcha en campo | Cap. VII actual |
| VI | Fabricación | Alternativas de ensamble (A frente a C), proceso por estaciones, **dimensionamiento de la capacidad del taller**, control de calidad y trazabilidad por número de serie | Tablas 7.1 y 7.2, ampliadas |
| VII | Ensayos y pruebas | **Matriz Requerimiento → Prueba**, ensayos de desarrollo, **FAT**, **SAT**, ensayos normativos, calibración y deriva | Tablas 5.2, 5.3 y 8.0 a 8.4 |
| VIII | Evaluación económica | Resumen: BOM V3, inversión, financiamiento, precio derivado, VAN/TIR, sensibilidad, TCO. **El detalle anual va al anexo B** | Cap. V económico (tablas 1.7 a 3.7) |
| IX | Planificación del proyecto | **Carta Gantt** por trimestres, hitos y ruta crítica | Nuevo |
| X | Propuestas de mejora | Retroalimentación del mandante (lo dicho en clases) + mejoras propias, con su estado | Cap. VIII actual |
| XI | Conclusiones | Nuevas (F10) | Reescritas |
| XII | Referencias bibliográficas | Vigentes + hojas de datos de los IC nuevos, LCSC, DigiKey y normas de FAT/SAT | Cap. X actual |
| — | Anexos A a E | Ver sección 0 | Nuevos |

**Qué sale del cuerpo del informe hacia el anexo B:**

- Tabla 2.5: amortización del crédito.
- Tablas 2.6 y 2.7: dotación y sueldos.
- Tabla 2.8: servicios básicos.
- Tabla 2.9: costos anuales.
- Tabla 3.1: estado de resultados.
- Tabla 3.2: flujo de fondos.

En el cuerpo queda **una** tabla resumen anual: ventas, utilidad, flujo y caja, con 10 columnas de año.
También quedan los indicadores.

**Meta de extensión:** el informe actual tiene 2.376 líneas. La E2 no debería crecer: lo que se agrega
en IV a VII se compensa con lo que el capítulo VIII envía al anexo B.

## 4. Diseño electrónico sin módulos (PCB V3) — base técnica del estudio

Es el insumo del que dependen los capítulos IV, V y VI y los anexos A y C. Lo dejo especificado para que
tú dibujes la V3. El informe documenta esta especificación aunque la placa no esté fabricada, y declara
su estado.

### 4.1. Bloques y componentes candidatos

| Bloque | Función | Candidato (LCSC/DigiKey) | Alternativas para la matriz | Periféricos que exige |
| --- | --- | --- | --- | --- |
| MCU + radio | Lógica, BLE 4.2 y ADC | **Módulo ESP32-WROOM-32D** (D2) | Por nivel de integración: IC ESP32-D0WD y DevKitC (D3). De abastecimiento: WROOM-32E, de huella compatible | 10 µF + 100 nF en 3V3; RC en EN (10 kΩ/1 µF); pulsadores BOOT y EN; zona libre de cobre bajo la antena, con el módulo en el borde de la placa |
| USB-C, carga y datos | Carga + programación y monitor serie | Receptáculo USB-C de 16 pines + **CH340C** (SOIC-16, sin cristal) | CH340K; CP2102N (más caro) | 2 × 5,1 kΩ en CC1/CC2; ESD **USBLC6-2SC6**; PTC o fusible en VBUS; autoprogramación EN/IO0 con 2 NPN (o UMH3N); CH340 alimentado sólo desde VBUS, para que no consuma batería |
| Cargador Li-ion | Carga de la celda 1S | **TP4056** (ESOP-8) | MCP73831 (SOT-23-5, 500 mA); BQ24074 (gestión de ruta de potencia) | R_PROG (1,2 kΩ → 1 A; 2 kΩ → 580 mA, a decidir por temperatura); 2 LED de estado (CHRG/STDBY); NTC en TEMP o puente a GND; ruta de carga compartida (P-MOSFET + Schottky) |
| Protección de celda | Sobrecarga, sobredescarga y cortocircuito | **La que trae la celda** (D8) | DW01A + FS8205A en placa, sólo si cambia la celda | No va en la V3. El informe justifica por qué basta la protección integrada de la LiPo |
| Regulador 3,3 V | Alimentar ESP32, BME280 y SP3485 | **LDO de baja Iq ≥ 500 mA** (RT9080-33, HT7833 o ME6211) | Buck-boost TPS63001 | La matriz compara Iq, caída y corriente: el pico de BLE es de ≈ 130 mA y el de Wi-Fi no aplica |
| Elevador a 5 V | Alimentar la sonda RS-485 | **MT3608** (SOT-23-6) con pin EN | TPS61023 (0,5 µA en apagado, más eficiente); SX1308 | Bobina de 22 µH (dimensionar I_sat); Schottky SS14/SS34; divisor de realimentación; 22 µF entrada/salida. **Se conserva el corte AO3401A/AO3400A** en serie con la salida: el MT3608 no desconecta la carga con EN bajo (la salida queda en ≈ VBAT menos el diodo). IO5 gobierna el EN y el corte a la vez |
| RS-485 | Bus Modbus RTU con la sonda | **SP3485EN** (SOIC-8) | MAX3485; THVD1410 | TVS **SM712** en A/B; terminación de 120 Ω por puente; resistencias de polarización fail-safe |
| Sensor ambiental | T, HR y presión | **BME280** (LGA-8) | SHT40 + BMP280 | 100 nF; pull-ups I²C de 4,7 kΩ; ubicarlo en el borde, junto al respiradero, lejos del LDO y del ESP32, con ranura de aislación térmica |
| Interfaz | Avisos sin pantalla | 3 LED (azul, verde, rojo) + buzzer pasivo 9042 + pulsador PAIR | — | **Buzzer con transistor y diodo de rueda libre**: cierra el riesgo H1 |
| Medición de batería | ADC | Divisor 100 k/100 k | 1 M/1 M o divisor conmutado | Ya existe en V2 |
| Protección de entrada | Fusible, inversión e interruptor | Fusible + M7 (o P-MOSFET de polaridad) + interruptor de panel | — | Ya existe en V2 |
| Ensayo | Puntos de prueba y JP1 | Se mantienen | — | Más puntos en VBUS, VBAT, 5V_SONDA y 3V3 |

### 4.2. Qué se mantiene de la V2

Para no reabrir el firmware:

- El contrato de pines de `Firmware/pines.h`: PAIR en IO33, buzzer en IO19, batería en IO34 y LEDs.
  El control de la sonda sigue en IO5, que ahora gobierna también el EN del elevador.
- La trama de 20 bytes.
- El puente de medición de corriente JP1.

### 4.3. Lo que el estudio calcula para la V3 («Dimensionar»)

- **Bobina del elevador:** corriente de pico con la carga de la sonda y la celda a 3,0 V.
- **Disipación del LDO** en el peor caso (4,2 V → 3,3 V a 130 mA).
- **Corriente de carga** frente a la temperatura del TP4056 y a la capacidad de la celda (0,5 C).
- **Ancho de pistas:** VBUS/VBAT a 1 A y 5 V de la sonda.
- **Resistencias del LED y del transistor del buzzer.**
- **Autonomía** con reposo profundo y Iq del LDO: reemplaza la de la V2.

Cada cálculo va en IV.4 o V.4 con su fórmula y su margen.

## 5. Fases

Ejecutar en orden. Cada fase cierra con su comprobación. Entre paréntesis, las exigencias de la
sección 1.2 que cubre.

### F1. Requerimientos (E1)

1. **Tabla «Necesidad → Requerimiento técnico»**, con ID R01…Rn. Cada requerimiento lleva valor
   numérico, unidad y criterio de aceptación. Ejemplos:
   - Medir 7 variables de suelo en menos de 10 s por punto.
   - Operar sin red.
   - Autonomía mayor a una temporada de muestreo.
   - IP67.
   - Precio de lista derivado.
   - Operación de 0 a 45 °C.
   - Alcance BLE de 10 m.
2. Esos ID son las filas de la trazabilidad maestra (F8) y de la matriz Requerimiento → Prueba (F9).

**Hecho cuando:** todo requisito que aparezca después en el informe tiene un ID R.

### F2. Ingeniería básica del producto (E3, E4, E5)

1. **IV.1 Filosofía operativa:**
   - Matriz **Condición → Fase → Acción del sistema → Señal al usuario**. Ejemplos:
     - Equipo apagado.
     - Encendido.
     - Sin vincular.
     - Ventana PAIR abierta.
     - Vinculado y conectado.
     - Midiendo.
     - Sonda sin respuesta (centinela FF; la app rechaza la trama).
     - Batería bajo 3,40 V (histéresis hasta 3,50 V).
     - Cargando y carga completa (LED del TP4056).
     - Sin red (la app trabaja offline y sincroniza después).
     - Reset desde el backoffice.
     - Falla del sensor ambiental.
   - Diagrama de estados en Mermaid (`stateDiagram-v2`).
   - Fuentes: `Firmware/config.h`, `pulsador.h`, `zumbador.h`, `leds.h`; `App/src/utils/batteryWarning.ts`; `App/src/services/probeService.ts`.
2. **IV.2 Capacidades y características:** una sola **ficha técnica** que reemplaza las tablas 3.8, 3.9,
   4.1 y 5.9, con columnas Parámetro · Valor · Fuente · Estado (verificado, implementado sin ensayo o de
   diseño). Debe cubrir:

   | Grupo | Parámetros |
   | --- | --- |
   | Sensado | N.º de variables (7 de suelo + 3 ambientales + batería); rango, resolución y precisión de cada una (hoja de la sonda y del BME280) |
   | Alimentación | Tensiones (VBUS 5 V, VBAT 3,0–4,2 V, 3,3 V, 5 V de la sonda); autonomía; tiempo de carga |
   | Almacenamiento | 4 MB de flash en el equipo y almacenamiento local de la app. El equipo **no guarda** mediciones; la app sí, offline |
   | Comunicación | BLE 4.2 (GATT, PHY de 1 Mbps, alcance de 10–30 m a verificar); RS-485 Modbus RTU (velocidad y formato: confirmar contra la sonda y `probeService.ts`); I²C de 100/400 kHz; USB 2.0 Full Speed vía CH340 |
   | Ambiente | Temperatura de operación (limitada por la celda: carga de 0–45 °C, descarga de −20–60 °C); grado IP |
   | Físico | Dimensiones y masa |
   | Servicio | App, backoffice, soporte, reset y garantía |

3. **IV.3 Requerimientos técnicos y matrices de decisión, por componente.** Formato fijo para cada
   bloque de la tabla 4.1:
   - Requisito: tensión, corriente, encapsulado soldable, temperatura, disponibilidad en LCSC/DigiKey,
     ciclo de vida y precio.
   - 2 o 3 alternativas reales, con criterios ponderados y puntaje.
   - Justificación en una frase, del tipo «este porque trabaja a 3,3 V», «este porque es IP67»,
     «este porque está en el catálogo PCBA».

   Matrices obligatorias:
   - MCU por nivel de integración (D3), sonda, sensor ambiental, cargador, regulador, elevador,
     transceptor y puente USB.
   - Celda: química y capacidad. La LiPo de 2.000 mAh está decidida (D8); la matriz documenta por qué.
   - LED y buzzer.
   - Interruptor, prensaestopa y respiradero (por grado IP).
   - Material de la carcasa: PETG, ASA, PLA y ABS por UV, temperatura y estanqueidad.

**Hecho cuando:** ningún componente de la BOM V3 queda sin su matriz o sin su línea de justificación.

### F3. Cotizaciones y anexo A (E2, E8, D5)

1. **Datos.** En `finanzas/supuestos.json`, convertir la `bom` en filas estructuradas con: equipo ·
   modelo/número de parte del fabricante · código del proveedor (n.º LCSC o DigiKey) · cantidad por
   equipo · proveedor · precio unitario por tramo (1, 10, 100 y 1.000) · moneda · fecha de consulta ·
   enlace público · alternativa.
   - Lo mismo para el **taller**, con el modelo concreto de cada equipo: hoy es «Impresora 3D $800.000»
     sin modelo.
   - Lo mismo para los **servicios**: PCB, PCBA, esténcil, laboratorio, certificación SUBTEL y
     ensayo IP.
2. **Consultar precios reales** en LCSC y DigiKey, con el navegador si hace falta, para cada IC de la
   tabla 4.1 y cada pasivo.
   - Costo puesto en Chile: flete según el umbral de cada proveedor, IVA de importación (Ley 21.713) y
     arancel según el tratado de origen. Se verifica en la consulta; no se asume.
   - PCBA de JLCPCB: cargos de preparación, esténcil, componentes extendidos y juntas, al lote del piloto
     y al lote anual.
3. **Taller.** Especificar un modelo por equipo, con justificación y matriz para los de mayor valor:

   | Equipo | Qué se compara | Por qué cambia con la V3 |
   | --- | --- | --- |
   | Impresora 3D | **Creality K1C** (D9) frente a otras dos impresoras de cámara cerrada. Criterios: volumen útil y carcasas por cama, cámara cerrada para PETG/ASA, velocidad, consumo, precio puesto en Chile y repuestos | — |
   | Estación de soldadura | Modelo concreto | — |
   | **Estación de aire caliente y placa calefactora o pequeño horno de reflujo; esténcil** | — | **Nuevos con la V3**, si gana la alternativa A en D4 |
   | Microscopio o lupa estereoscópica | — | Inspección de LGA y SOIC |
   | Osciloscopio, fuente de laboratorio y multímetros | Modelos con resolución de µA, para el reposo profundo | — |
   | Analizador lógico | — | Para Modbus/I²C |
   | Equipo de ensayo FAT | Fixture con pogo pins + PC | — |

   Proveedor DigiKey donde lo tenga, con su precio puesto en Chile.
4. **Generar el anexo A** con `finanzas/modelo.py`, en `Evaluacion/Evaluacion 2/Anexos/`. Hojas:

   | Hoja | Contenido |
   | --- | --- |
   | Producto (BOM por equipo) | Columnas **Equipo · Modelo · Cantidad · Proveedor · Valor unitario · Valor total**, más fecha y enlace en columnas al final |
   | Taller (activo fijo) | Mismas columnas |
   | Servicios de fabricación y validación | Mismas columnas |
   | Resumen por proveedor | Total por proveedor |

   - Totales con fórmulas.
   - Sin rutas ni nombres de scripts.
5. **Regenerar el modelo:** la BOM V3 mueve el costo variable, el precio derivado, VAN, TIR, sensibilidad
   y TCO. Actualizar `test_modelo.py` si fija valores.

**Hecho cuando:**

- El anexo A cuadra con `supuestos.json`.
- `python finanzas/modelo.py` y las pruebas pasan.
- Cada precio tiene proveedor, fecha y enlace.

### F4. Flujo de caja ordenado y anexo B (E13)

1. **Reescribir `planilla_flujo`** en `finanzas/modelo.py`, con hojas independientes enlazadas por
   fórmulas y valor en caché, para que el revisor pueda seguir cada cifra:

   | # | Hoja | Contenido |
   | --- | --- | --- |
   | 1 | Resumen | Indicadores: VAN, TIR, paybacks, precio y caja mínima |
   | 2 | Inversión | Activo fijo, activo nominal, capital de trabajo e inventario |
   | 3 | Ventas | Unidades, precio neto y ventas netas por año |
   | 4 | Costos operacionales | BOM por unidad × unidades, garantía y costos variables |
   | 5 | Gastos de administración | Nómina de administración, arriendo, servicios, patente, software, materiales y mantención |
   | 6 | Gastos de comercialización | Publicidad y nómina comercial |
   | 7 | **Financiamiento** | Condiciones del crédito, pie y cuadro de amortización del crédito |
   | 8 | **Costo financiero** | Intereses anuales |
   | 9 | **Depreciación** | Activo fijo, vida útil, cuota anual y reinversión de 2032 |
   | 10 | **Amortización** | Activo nominal |
   | 11 | Estado de resultados | — |
   | 12 | Flujo de caja | — |

   - Las hojas 7 a 10 quedan **contiguas**, como se pidió.
   - Las hojas 11 y 12 toman cada línea de las anteriores.
2. **Separar administración de comercialización.** Hoy el modelo no los separa: `gastos` trae `nomina`,
   `pauta`, `arriendo`, etc. Hay que clasificar la nómina por cargo según la dotación (tabla 2.6) y
   llevar `pauta` a comercialización. **Si la clasificación cambia una cifra, el error es mío:** debe
   ser sólo una reagrupación, y una prueba lo verifica (la suma de las hojas 4 a 6 es igual al costo
   total actual).
3. Escribirlo en `Anexos/Anexo B - Flujo de caja TerraSense.xlsx` y mantener la planilla de la raíz, o
   apuntar los enlaces al anexo. Lo decido al implementar, según cuántos documentos la enlazan.
4. Prueba nueva: cada total del anexo B coincide con `dimensionar()`.

**Hecho cuando:** el anexo B abre en Excel sin errores de fórmula y sus totales son idénticos a los del
modelo.

### F5. Arquitectura eléctrica V3 (E11)

1. **IV.4:**
   - Diagrama de bloques del hardware V3 en Mermaid.
   - Árbol de alimentación V3 (VBUS → TP4056 → VBAT → LDO 3,3 V / elevador 5 V con EN) en Mermaid.
     Reemplaza la figura 1.8.
   - Tabla de asignación de pines: se mantienen los de la V2 y se agregan USB y EN del elevador.
2. **Cálculos de la sección 4.3**, con fórmula, datos de la hoja de datos y margen.
3. **V.4 Verificación contra hojas de datos:** se rehacen las tablas 7.3 y 7.4 para los IC de la V3.

**Hecho cuando:** cada bloque de la tabla 4.1 tiene su IC elegido, sus periféricos y su verificación.

### F6. Eficiencia energética (E6)

1. **Producto, en W y no sólo en mAh:**
   - Tabla de **potencia instalada** por consumidor: ESP32 con TX BLE, sonda, elevador (pérdidas), LDO
     (pérdidas), BME280, LED, buzzer, CH340 (sólo con USB) y divisor.
   - **Potencia total instalada** del equipo.
   - Tabla de **modos de consumo**: apagado, reposo profundo, anuncio BLE, conectado, midiendo y
     cargando. Para cada uno: potencia y tiempo por jornada.
   - Energía por medición y por jornada.
   - **Consumo anual por equipo en Wh**, y en kWh tomados de la red al cargar, con la eficiencia del
     cargador.
   - Consumo de la flota vendida en el horizonte, como dato de impacto.
2. **Gestión de cargas:**
   - Corte de la sonda por AO3401A y EN del elevador, ambos desde IO5.
   - Reposo profundo con despertar por PAIR.
   - CH340 sin alimentación desde la batería.
   - LED apagados en reposo.
   - LDO de baja Iq.
   - Mejoras cuantificadas: reutilizar el modelo de `finanzas/energia.py` con los parámetros de la V3 y
     agregar las filas nuevas. Las cifras salen del modelo.
3. **Taller, que es lo que el profesor ejemplificó con «10 sensores = 10 W»:**
   - Potencia instalada por equipo: impresoras 3D, soldador, aire caliente o placa, notebooks,
     monitores, osciloscopio, fuente e iluminación.
   - Horas de uso al año, que salen del dimensionamiento de F7.
   - **kWh/año** y costo anual a la tarifa vigente.
   - **Contrastarlo con la electricidad de la tabla 2.8** ($60.000 y $180.000 mensuales): si no calza,
     se corrige el supuesto en `supuestos.json`.
   - Medidas de eficiencia del taller: impresión por lotes, apagado automático y LED.
4. **Fuentes de eficiencia:** listar las que se aplican (conversión, reposo, conmutación de cargas, carga
   por USB frente a pilas primarias) con su ahorro.

**Hecho cuando:**

- La potencia instalada y los kWh/año del equipo y del taller están en tablas con totales.
- La electricidad del modelo económico es coherente con ellos.

### F7. Ingeniería de detalle: geometría, montaje, instalación y fabricación (E9, D4)

1. **V.5 PCB V3** (una vez que la dibujes):
   - Tabla de datos de fabricación: contorno, capas, espesor, cobre, acabado, máscara, ancho y
     separación mínimos y vías.
   - Coordenadas de los agujeros de montaje, conectores, antena y BME280.
   - Distancias críticas: zona libre de la antena, aislación térmica del BME280, separación de la
     bornera de la sonda.
   - Anexo C: esquemático, capas, plano acotado, plano de ensamble con designadores, BOM con designadores
     y archivo de posición (CPL) si gana C.
2. **V.6 Carcasa y montaje:**
   - Plano acotado en el anexo D y tabla de tolerancias: ajuste PCB-carcasa, insertos M3, alojamiento
     del o-ring y diámetros de las aberturas para la prensaestopa PG7, el respiradero M12, el USB-C y el
     interruptor.
   - **Lista de conectores y pinout:** USB-C, bornera de la sonda con colores de cable, batería e
     interruptor.
   - **Lista de cableado:** de-a, sección, color y largo.
   - **Torques** de los tornillos.
   - **Secuencia de montaje** paso a paso, con control por paso, en Mermaid más tabla.
   - **Prueba del tercero:** ¿alguien que nunca habló con nosotros lo arma con esto? Se recorre la
     secuencia buscando datos faltantes.
3. **V.7 Instalación y puesta en marcha en campo:** qué recibe el agricultor, instalación de la app,
   vinculación, primera medición, inserción de la sonda (profundidad y humedad mínima), cuidado y
   carga. Esto alimenta el SAT.
4. **VI Fabricación:**
   - Comparación de ensamble A frente a C con la BOM V3 (tablas 7.1 y 7.2 rehechas).
   - Proceso por estaciones: recepción, PCBA, programación por USB, ensamble, FAT, embalaje.
   - **Dimensionamiento de capacidad:**
     - Carcasas por cama de la K1C (220 × 220 mm), según la huella de la carcasa V3 → horas por cama ÷
       carcasas por cama = horas por carcasa → × demanda anual (200 → 1.085 equipos) → n.º de
       impresoras. **Justifica las 2 impresoras del activo fijo o corrige la cifra.**
     - Minutos de ensamble y FAT por unidad → personas de taller, contrastadas con la dotación de la
       tabla 2.6.
   - **Trazabilidad:** número de serie = ID de 15 dígitos derivado de la MAC; registro FAT asociado al
     equipo en el backoffice.

**Hecho cuando:**

- La secuencia de montaje no tiene pasos que dependan de conocimiento no escrito.
- La capacidad del taller cuadra con el plan de ventas.

### F8. Digitalización, Industria 4.0 y trazabilidad maestra (E7)

1. **IV.6** con el marco de **Industria 4.0**. Una tabla de los pilares (IoT, nube, análisis de datos,
   integración vertical, ciberseguridad y trazabilidad) contra lo que TerraSense implementa:
   - **Independencia operativa:** el equipo y la app miden y recomiendan **sin red**; la nube (Supabase)
     sólo sincroniza.
   - **Interfaces:** app móvil, backoffice web (dashboard de flota y de equipos), avisos (acceso y
     batería). Explicar por qué **no** hay alarmas agronómicas push ni SCADA: es un instrumento portátil,
     no una planta.
   - **Análisis de datos:** motor agronómico determinista, historial por campo y pronóstico.
   - **Trazabilidad:** medición georreferenciada con fecha, equipo y usuario; registro FAT por número de
     serie; versión de firmware.
   - **Ciberseguridad, en dos columnas, implementado y propuesto:**
     - Implementado: autenticación, RLS por usuario, TLS hacia la nube y reset sólo desde el backoffice.
     - Propuesto: emparejamiento BLE cifrado, firmware firmado con arranque seguro y cifrado de flash del
       ESP32, y OTA firmada.
   - Diagrama de flujo de datos en Mermaid.
   - Fuentes: `supabase/migrations/*.sql`, `Web/`, `App/`.
2. **Tabla de trazabilidad maestra:** **Requerimiento → Especificar → Justificar → Cotizar → Dimensionar
   → Probar**. Cada fila apunta a la tabla o figura donde se cumple cada paso. Va al final del
   capítulo V o como cierre de VII.

### F9. Ensayos: Requerimiento → Prueba, FAT y SAT (E10)

1. **Matriz Requerimiento → Prueba**, una fila por R de F1, con columnas: método · instrumento · criterio
   de aceptación · etapa (desarrollo, FAT, SAT o normativo) · estado. Cubre:
   - Precisión: sonda contra laboratorio y BME280 contra referencia.
   - Comunicación: alcance BLE, tasa de error Modbus con CRC y sincronización.
   - Protección eléctrica: inversión, fusible, ESD en el USB y TVS en RS-485.
   - Tiempo de operación: autonomía real y tiempo de carga.
   - IP67 (IEC 60529), caída y temperatura (IEC 60068-2) y radiofrecuencia (SUBTEL).
2. **FAT** (*Factory Acceptance Test*), sobre el 100 % de las unidades, en el taller y antes de
   embalar:
   - Inspección visual.
   - Corriente en reposo y en medición por JP1.
   - Programación y versión.
   - BLE.
   - Lectura de la sonda patrón.
   - BME280 contra la referencia.
   - LED, buzzer y PAIR.
   - Carga.
   - Prueba de estanqueidad por muestreo.

   Tiempo por unidad, que alimenta F7, y registro con el número de serie.
3. **SAT** (*Site Acceptance Test*), en el campo del cliente:
   - Vinculación.
   - Primera medición con georreferencia.
   - Comparación con una muestra de laboratorio en el piloto.
   - Sincronización con la nube.
   - Aviso de batería.
   - Firma de recepción.

   Se ejecuta en la puesta en marcha de febrero de 2027 (Gantt).
4. Formularios de FAT y SAT en el anexo E.
5. Integrar las tablas 5.2, 5.3 y 8.0 a 8.4 actuales en este esquema, sin duplicarlas.

**Hecho cuando:** todo R tiene al menos una prueba y toda prueba tiene criterio de aceptación numérico o
binario.

### F10. Evaluación económica condensada, Gantt y mejoras (E12 a E14)

1. **VIII Evaluación económica:**
   - BOM V3 resumida por bloque.
   - Inversión.
   - Financiamiento, respetando la decisión cerrada.
   - Precio derivado.
   - Una tabla resumen anual.
   - VAN, TIR, paybacks, 5 frente a 10 años, sensibilidad y punto de quiebre.
   - TCO.

   Todo el detalle se remite al anexo B. Las cifras salen de `docs/RESULTADOS_FINANCIEROS.md` tras F3.
2. **IX Carta Gantt** en Mermaid (`gantt`) por trimestres, de octubre de 2026 a fines de 2027. Más una
   tabla de hitos con su entregable y su criterio de cumplimiento. Paquetes:

   | Trimestre | Paquetes |
   | --- | --- |
   | T4 2026 | Diseño de la PCB V3. Firmware: lectura Modbus y reposo profundo. CAD e impresión de la carcasa. Pedido PCB/PCBA. Ensamble, FAT del prototipo. **Hito: entrega del prototipo funcional al cliente, 17 de diciembre de 2026** |
   | T1 2027 | Constitución de la empresa y crédito. Campaña de laboratorio (30 muestras). Certificación SUBTEL. **Puesta en marcha y SAT del piloto, febrero 2027**. **Publicación de la app en Google Play y App Store, marzo 2027**. Primer lote |
   | T2–T4 2027 | Lanzamiento comercial. Lotes de producción con PCBA desde 12 placas. Revisión de la placa con lo aprendido en el piloto. Ventas del año 1 (200 equipos) |

   - Marcar la **ruta crítica**: sonda → firmware Modbus → calibración → piloto.
   - **Coherencia obligatoria:** el inicio de las ventas del Gantt debe calzar con el año 1 del modelo
     económico. Si no calza, se ajusta el Gantt, no el modelo.
3. **X Propuestas de mejora:**
   - Registrar E1 a E14 como **retroalimentación del mandante**, con la mejora y el estado de cada una.
   - Actualizar las mejoras propias. Las que la V3 ya resuelve pasan a «incorporada en el diseño»:
     buzzer H1, módulo desnudo, huella 32U/32D, Iq de la placa de desarrollo.
4. **I Introducción, nueva:**
   - Propósito de la E2: transformar la necesidad definida en una solución técnicamente especificada.
   - Método: el flujo de etapas y el ciclo especificar…probar.
   - Qué cambió respecto del informe 1: producto sin módulos, taller especificado, FAT/SAT, Gantt.
   - Cómo leer el documento y sus anexos.
   - **Sin** repetir el resumen conceptual del informe 1.
5. **XI Conclusiones, nuevas,** organizadas por etapa: qué quedó especificado, justificado, cotizado,
   dimensionado y con qué se probará.
   - Cifras finales.
   - Lo que el estudio acredita y lo que no; se conserva la lista honesta actual, actualizada a la V3.
   - Próximo hito: el prototipo de diciembre.

### F11. Correcciones transversales

- Retirar o reubicar las referencias a módulos de desarrollo: DevKit, LX-LCBST, módulo SP3485 y
  módulo BME280. Quedan sólo como descripción del **prototipo V2**.
- Renumerar tablas y figuras con numeración continua y rehacer los índices.
- Referencias nuevas:
  - Hojas de datos: ESP32-WROOM-32D (y 32E como alternativa), CH340C, TP4056, MT3608 (o el elegido),
    el LDO elegido, USBLC6-2SC6, SM712 y BME280.
  - Creality K1C (ficha técnica).
  - Proveedores: LCSC y DigiKey.
  - Normas: IEC 60529, IEC 60068-2 e IEC 62133-2.
  - Una referencia para FAT/SAT (IEC 62381).
- Retirar las referencias que queden huérfanas: IP5306 y AMS1117 si se van con los módulos.

## 6. Validación (F12)

Un script `finanzas/verificar_informe_e2.py` (con prueba en `test_*.py`) que falle ante cualquier error:

| Comprobación | Cómo |
| --- | --- |
| Cifras | Cada monto y porcentaje del informe frente a `supuestos.json`, `modelo.py` y `energia.py` |
| Anexos | El total de la BOM del anexo A coincide con el modelo; los totales del anexo B coinciden con `dimensionar()` |
| Tablas | Mismo número de columnas, sin celdas vacías, totales que cuadran |
| Mermaid | Cada bloque se renderiza con `npx @mermaid-js/mermaid-cli`, incluido el `gantt` |
| Numeración | Tablas y figuras consecutivas; índices idénticos a los títulos; toda referencia «Tabla X.Y» existe |
| Sin repositorio | En el informe y dentro de los .xlsx de los anexos: sin rutas, extensiones de código, nombres de scripts ni comillas invertidas |
| Términos | Sin EBITDA, FCFF, FCFE, DSCR, FTE, «predio» ni «potrero»; siglas definidas en su primera aparición |
| Sin módulos | Fuera de la sección del prototipo V2, no aparecen «DevKit», «LX-LCBST» ni «módulo BME280» |
| Hardware | Pines, tiempos (3 s, 30 s, 2,7 kHz, 3,40/3,50 V) y designadores coinciden con el firmware y el esquemático |
| Trazabilidad | Todo R tiene fila en la matriz de pruebas y en la trazabilidad maestra |

Además:

- `python finanzas/modelo.py`
- `python -m unittest discover -s finanzas -p "test_*.py"`
- `python docs/verificar_documentacion.py`
- Agregar los anexos generados a la lista de `CLAUDE.md` §2 y de `AGENTS.md`.
- Una lectura completa contra la rúbrica (`Readme.md`), criterio por criterio, y contra E1 a E14.

## 7. Estado al 02-10-2026 y lo que falta

F1 a F12 están implementadas. `python finanzas/verificar_informe_e2.py` sólo reporta los marcadores `⟦PENDIENTE PCB V3: …⟧` y `⟦PENDIENTE CAD: …⟧`: 18 en total, todos de geometría. Precios, hojas de datos y redacción quedaron cerrados con consultas del 02-10-2026:

- **Sonda:** ComWinTop CWT-Soil-NPKPHCTH-S (variante T-H-EC-NPK-PH) en AliExpress, $34.700 más $9.694 de envío; la muestra adquirida es ese modelo. Desde el 03-10-2026 la referencia [16] del informe es el manual del fabricante: 4,5 a 30 V, 4.800 baudios 8N1, dirección 1, pH ±0,3, NPK ±2 % de la escala; cable marrón (+), negro (−), amarillo (A+) y azul (B−). La ficha de Sumeet pasó a [51] y sólo respalda el consumo de 0,15 W a 12 V. El mapa de registros está en `Firmware/config.h`; la prueba en banco, en [Firmware/TASK.md](../../Firmware/TASK.md#prueba-de-la-sonda-en-banco).
- **Celda:** EEMB LP103454, $6.900 en pack de 10. Se eligió por tener un fabricante identificable que respalde la certificación IEC 62133-2.
- **Termistor de la celda** (MF52A103F3950) con red de 4,7 kΩ y 47 kΩ en TEMP, para una ventana de carga de ≈ 0 a 44 °C. Estaba en el texto y faltaba en la BOM; también lleva una tercera bornera de 2 vías.
- **Accesorios** con enlace al producto exacto: interruptor, respiradero, tapón, insertos M3 × 5,7 × 4,6 (agujero de 4,0 mm), cordón, cable y embalaje.
- **Flete:** dos envíos UPS de 2,5 kg a US$188,45 cada uno (carrito de LCSC con destino Chile). Los componentes de 200 equipos pesan ≈ 4,7 kg netos. DigiKey cobra US$100 por envío a Chile.
- **Clasificación básica o extendida de JLCPCB** verificada pieza por pieza: había 14 rótulos errados.
- **Taller:** el microscopio pasa al precio de la tienda oficial. El fixture del FAT ($38.528) y las herramientas ($374.588, antes $1.000.000 sin respaldo) quedan desglosados con precios consultados.
- **Servicios:** SUBTEL por declaración con QR (Res. 737, vigente desde el 22-02-2026), $1.300.000. Ensayo IP67, US$500 ($475.000).
- **Hojas de datos:** CH340 con 12 mA típicos; PTC de la serie 0603L al 82 % a 40 °C y al 74 % a 50 °C [49]; PETG con 74,5 °C de deflexión bajo carga [50]; LED azul de 300 mcd a 20 mA.
- **Figuras:** los 8 Mermaid se renderizaron con `mermaid-cli` sin errores. Los PNG para el Word están en `Evaluacion/Evaluacion 2/Figuras/`.

### 7.1. Guía para cerrar la placa V3 y la carcasa

1. **Placa V3 dibujada:**
   - Copiar a la Tabla 5.1 el contorno y las coordenadas: 6 marcadores `PCB V3`.
   - Exportar las seis láminas del anexo C.
   - En `finanzas/supuestos.json`, actualizar el precio de la fila «Placa de circuito impreso V3» con la cotización de JLCPCB para el contorno real, y los `pines` de cada fila si cambia la huella.
2. **Modelo 3D de la carcasa:**
   - Copiar las dimensiones exteriores (Tabla 5.3) y las posiciones de las aberturas (Tabla 5.4): 10 marcadores `CAD`.
   - Exportar las cuatro láminas del anexo D.
   - En `supuestos.json`, actualizar `capacidad_impresion.huella_mm` y `capacidad_impresion.masa_g`, y los gramos de PETG de `_carcasa_detalle`.
3. **Regenerar y propagar:**
   - Ejecutar `python finanzas/modelo.py` y `python finanzas/energia_v3.py`.
   - Llevar al informe las cifras que cambien: BOM, precio, VAN, TIR, Tabla 4.9, Tabla 6.4 (carcasas por cama, horas e impresoras) y capítulo VIII.
   - `verificar_informe_e2.py` detecta las cifras clave que no calcen.
4. **Cerrar:** el validador debe dar 0 errores.
   - Ejecutar `python -m unittest discover -s finanzas -p "test_*.py"` y `python docs/verificar_documentacion.py`.
   - Re-renderizar los Mermaid si se tocaron.

## 8. Riesgos

- **Precios:** la BOM V3 se construye con precios de catálogo de LCSC y DigiKey, no con compras. El
  informe lo declara y conserva la PCB V2 como única compra efectuada.
- **Cambio en cascada:** la BOM V3 y el taller nuevo (aire caliente, placa calefactora, fixture FAT)
  mueven el costo variable, la inversión, el precio, el VAN, la TIR, la sensibilidad y el TCO. Hay que
  regenerar y releer cada párrafo que los comenta, conclusiones incluidas.
- **Prometer lo no verificado:**
  - La V3 no está fabricada.
  - La lectura de la sonda y el reposo profundo no están en el firmware.
  - IP67, la autonomía y el alcance BLE no están ensayados.

  Todo va con su estado (de diseño, implementado sin ensayo o verificado) y su prueba de aceptación.
- **Extensión:** sin mover el detalle económico al anexo B, el informe crece por sobre lo razonable.
  F10 es condición para las demás.
- **Planos:** sin el KiCad de la V3 y sin un CAD de la carcasa, el criterio 1.1.5.8 queda sólo con tablas
  de cotas. Es el mayor riesgo de puntaje.
