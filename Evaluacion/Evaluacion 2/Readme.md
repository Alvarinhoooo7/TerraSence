# Evaluación 2: Ingeniería Básica y de Detalle

> **Nota:** Esta evaluación documenta y aborda los entregables de la **ingeniería conceptual, básica y de detalle** del proyecto TerraSense. Es la continuación directa del Informe 1, el cual desarrolló la primera etapa de ingeniería conceptual.

## Criterios de calificación

| Criterio | Excelente | Bueno | Insatisfactorio |
| :--- | :--- | :--- | :--- |
| **1.1.4.1. Considera lo establecido en ingeniería conceptual.** | 3 puntos | 2 puntos | 0 puntos |
| **1.1.4.2. Establece alcances y filosofías operativas del proyecto.** | 3 puntos | 2 puntos | 0 puntos |
| **1.1.4.3. Establece las capacidades y características de los productos y servicios del proyecto.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.4.4. Selecciona materiales y equipos de acuerdo a especificaciones.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.4.5. Establece criterios de eficiencia energética y digitalización.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.5.6. Especifica los materiales y equipos a adquirir, incluye cotizaciones y proveedores.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.5.7. Selección de materiales y equipos de acuerdo a especificaciones.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.5.8. Incluye todos los aspectos geométricos y dimensionales necesarios para la fabricación y montaje de los materiales y equipos del proyecto.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.5.9. Define todos los requerimientos de ensayos y pruebas de equipos y sistemas que comprenden el proyecto.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.6.10. Incluye las propuestas de mejoras obtenidas en las ingenierías conceptual y básica retroalimentadas por el mandante.** | 6 puntos | 4 puntos | 0 puntos |
| **1.1.6.11. El informe del proyecto está en base al formato institucional.** | 6 puntos | 4 puntos | 0 puntos |

## Retroalimentación del informe final (19-11-2026)

Comentario general del académico, textual:

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

El plan para convertir esos ensayos en evidencia está en [PLAN DE IMPLEMENTACION.md](PLAN%20DE%20IMPLEMENTACION.md#cierre-experimental-para-la-evaluación-3).
