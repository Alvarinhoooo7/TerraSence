# Evaluación 3: implementación y validación del prototipo

> **Nota:** `INFORME 3.md` es la **continuación del informe 2**: conserva íntegra su ingeniería conceptual, básica y de detalle, con las correcciones ya implementadas, y agrega la implementación del prototipo, las mediciones con sus gráficas y comentarios, la coherencia entre lo diseñado y lo medido, y la respuesta a las observaciones de mejora. Las figuras heredadas se toman de `../Evaluacion 2/Figuras/`; las nuevas las genera `python finanzas/figuras_e3.py` en `Figuras/` a partir de `Registros de ensayo/`.

## Criterios de calificación

| Criterio | Excelente | Bueno | Insatisfactorio | Dónde se responde en el informe 3 |
| :--- | :---: | :---: | :---: | :--- |
| **2.1.1.1.** Considera lo establecido en ingeniería básica y de detalle | 6 | 4 | 0 | Capítulos VI y VII (heredados) y la trazabilidad diseño → implementación del capítulo X |
| **2.1.1.2.** Utiliza herramientas de ofimática para el desarrollo y análisis de la factibilidad de implementación del proyecto | 3 | 2 | 0 | Anexos A, B, E, F y G (planillas Excel con el modelo, las cotizaciones, los protocolos, la carta Gantt y los registros de medición con sus gráficos) y la sección de factibilidad del capítulo X |
| **2.1.2.3.** Realiza mediciones de parámetros técnicos para validar cumplimiento de criterios de eficiencia energética | 3 | 2 | 0 | Capítulo XI: consumo por estado, energía por medición, lectura de batería, carga y autonomía estimada con el consumo medido |
| **2.1.3.4.** La documentación técnica presentada aborda todos los aspectos técnicos requeridos en base a la naturaleza del proyecto | 3 | 2 | 0 | Capítulos V a IX (heredados) y X a XII |
| **2.1.3.5.** Realiza documentación, como: planos, esquemas de conexión, diagramas de circuitos | 6 | 4 | 0 | Capítulo VII (placa, carcasa, montaje), anexos C y D, y el esquema de conexión del prototipo del capítulo X |
| **2.1.4.6.** Indica condiciones de funcionalidades técnicas según el tipo de proyecto | 3 | 2 | 0 | Capítulo X, «Condiciones de funcionamiento del prototipo» |
| **2.1.4.7.** El prototipo y/o simulación, responden al diseño realizado | 6 | 4 | 0 | Capítulo X, «El prototipo frente al diseño» |
| **2.1.4.8.** Se identifica cada etapa técnica que compone el proyecto | 6 | 4 | 0 | Capítulo X, «Etapas técnicas del proyecto» |
| **2.1.4.9.** Registra en el informe las gráficas de los parámetros técnicos | 3 | 2 | 0 | Capítulo XI (una figura por parámetro medido) |
| **2.1.4.10.** Realiza comentarios de los parámetros técnicos medidos | 3 | 2 | 0 | Capítulo XI (comentario bajo cada figura) |
| **2.1.4.11.** Los parámetros técnicos son coherentes con los parámetros de diseño | 6 | 4 | 0 | Capítulo XII, tabla diseño frente a medido |
| **2.1.4.12.** El objetivo indicado es coherente con el resultado de la implementación y/o simulación | 6 | 4 | 0 | Capítulo XII, objetivos frente a resultados, y conclusiones |
| **2.1.5.13.** Responde de manera colaborativa a observaciones de mejora en el proyecto | 3 | 2 | 0 | Capítulo XIII |
| **2.1.5.14.** El informe del proyecto está en base al formato institucional | 3 | 2 | 0 | `INFORME 3.docx`, exportado con la plantilla institucional del informe 2 |

Total: 60 puntos.

## Retroalimentación del informe 2 (19-11-2026)

Es el punto de partida de esta evaluación y la base del capítulo XIII. Comentario general del académico, textual:

> El informe final mantiene un nivel técnico muy alto y muestra una incorporación concreta de la retroalimentación entregada en la etapa formativa. Se valora especialmente la trazabilidad completa de los requisitos, el nivel de definición de la Ingeniería Básica y de Detalle, la documentación de fabricación y la incorporación de resultados experimentales reales de consumo, comunicación Modbus, operación offline, enlace BLE y pruebas automatizadas de software.
>
> Las principales brechas que permanecen ya no corresponden al desarrollo documental, sino a la validación física del producto. Continúan pendientes la campaña de comparación contra laboratorio, la descarga completa para confirmar la autonomía, la validación definitiva de la sonda a 5 V y los ensayos de IP67, temperatura, caída y ESD. El propio informe reconoce correctamente estos puntos y evita declarar como cumplido aquello que todavía no cuenta con evidencia experimental.
>
> En términos generales, el proyecto presenta un excelente nivel de ingeniería y una evolución clara respecto de la preentrega. Para completar totalmente el cierre técnico resta transformar los ensayos actualmente pendientes en evidencia experimental de cumplimiento.

| Criterio | Comentario del académico |
| :--- | :--- |
| 1.1.4.1 | Excelente trazabilidad entre problemática, requisitos, conceptual, básica, detalle y prueba; los 27 requerimientos se mantienen identificados |
| 1.1.4.2 | Muy sólido: operación offline, pérdida de sensores, batería, sincronización, estados de medición y límites explícitos |
| 1.1.4.3 | Capacidades cuantificadas con valores, unidades y criterios de aceptación, distinguiendo lo calculado de lo verificado |
| 1.1.4.4 | Selección exhaustiva mediante matrices para cada bloque |
| 1.1.4.5 | Muy desarrollado; incorpora el consumo medido y corrige la autonomía con resultados reales |
| 1.1.5.6 | BOM, números de parte, proveedores, alternativas, precios fechados y costos de fabricación |
| 1.1.5.7 | Selección congelada y verificada contra hojas de datos, con segundas fuentes declaradas no validadas |
| 1.1.5.8 | Nivel adecuado para ingeniería de detalle: PCB, carcasa, conectores, cableado, tolerancias, torques y montaje |
| 1.1.5.9 | «Uno de los mejores apartados»: cada requisito vinculado a su ensayo con criterio y registro |
| 1.1.6.10 | **No asigna Excelente**: varias correcciones pedidas para la sumativa siguen sin cierre experimental, especialmente laboratorio, IP67 y autonomía completa |
| 1.1.6.11 | Muy bien estructurado, con índices, trazabilidad, figuras, tablas, referencias, planificación y anexos |

El plan con que se convierten esos ensayos en evidencia está en [../Evaluacion 2/PLAN DE IMPLEMENTACION.md](../Evaluacion%202/PLAN%20DE%20IMPLEMENTACION.md#cierre-experimental-para-la-evaluación-3).

## Registros de ensayo

`Registros de ensayo/` guarda los datos crudos de las mediciones de esta evaluación, con la hora del PC en cada línea, y los guiones que los tomaron. Son la fuente de las figuras y del anexo G; el informe no los cita por ruta.

| Archivo | Qué registra | Cómo se tomó |
| :--- | :--- | :--- |
| `sonda.csv`, `crudo_sonda.txt` | Siete variables de la sonda al aire, en agua potable, en suelo seco y en suelo regado, con la dispersión de cada ráfaga | `serie_sonda.py sonda ETIQUETA N INTERVALO` por el monitor serie (comando 7) |
| `bme.csv`, `crudo_bme.txt` | Temperatura, presión y humedad del BME280 en el tiempo (autocalentamiento) | `serie_sonda.py bme …` (comando 6) |
| `03_D14_enterrada.txt` | D-14 con la sonda enterrada: 1.000 consultas Modbus | `serie.py` (comando 12) |
| `02_bateria_vs_multimetro.txt` | Tensión de la celda leída por el equipo frente al multímetro | Comando 1 y multímetro del operador |
| `consumo/` | Campaña de consumo con el firmware vigente: corriente a 100 muestras/s, marcas de cada tramo y tiempos de las diez mediciones | `consumo_ble.py` (FNB58 y Bluetooth del PC) |
| `carga/` | Corriente y tensión de carga de la celda por el puerto del módulo de carga (27 min desde el 70 %; la descarga se estima con el consumo medido, no se ensayó) | `fnb58.py` de `../Evaluacion 2/Registros de banco/D-07 consumo/` y `fnb58_continuo.py`, que se reconecta solo cuando el FNB58 corta la comunicación |
| `00_estado.txt`, `01_sonda_aire.txt` | Estado del equipo, autotest de luces y primera lectura | `serie.py` |

## Entrega

- `INFORME 3.docx` se genera con `python finanzas/exportar_informe_e2.py --informe 3` y va junto con los ocho archivos de `Anexos/` (A a H). Los anexos A, B, E y F son copia de los que `python finanzas/modelo.py` escribe en `../Evaluacion 2/Anexos/`: si cambia una cifra, regenerar y volver a copiarlos.
- Al abrir el Word, aceptar la actualización de campos: así se llenan los índices general, de figuras y de tablas con sus páginas (la paginación automática con Word falla en este equipo).
- La descarga completa no se ensayó en la placa de laboratorio, por decisión del equipo y porque su alimentación no representa al producto: el informe la estima con el consumo medido (Tabla «Autonomía estimada por configuración»). La descarga D-08, la carga completa D-15, temperatura, ESD, la campaña contra laboratorio y la serie BLE con el equipo cerrado quedan como ensayos programados de la placa del instrumento en la carta Gantt del informe.
