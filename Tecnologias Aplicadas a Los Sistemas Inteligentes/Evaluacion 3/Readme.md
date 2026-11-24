# Evaluación N° 3: Solución Tecnológica para Sistemas Inteligentes (trabajo ABP)

> **Asignatura:** Tecnologías Aplicadas a los Sistemas Inteligentes (PITA01), INACAP Santiago Sur 2026
> **Docente:** Osvaldo Javier Duarte Faúndez
> **Equipo:** Álvaro Villena, Felipe Martínez, Alan Escobar y Tomas Quezada
> **Unidad:** 3. Tecnologías aplicadas a los sistemas inteligentes
> **Plazo:** del 11-11-2026 al **2-12-2026**
> **Entrega:** informe técnico en PDF, presentación oral y un pequeño prototipo (deseable)

Este documento reúne el contexto de la evaluación para quien edite el informe o arme la presentación. El caso de estudio es TerraSense, el mismo proyecto del ramo de Proyecto de Título; aquí se mira desde los sistemas inteligentes, el pensamiento sistémico, la normativa, la ética y la gestión del conocimiento.

## Estado

| Entregable | Archivo | Estado |
| :--- | :--- | :--- |
| Informe técnico | [Evaluacion 3.docx](Evaluacion%203.docx) | Redactado, 33 páginas, con el formato institucional de la [Evaluación 2](../Evaluacion%202/Evaluacion%202.docx) |
| Presentación oral | — | Pendiente; el guion propuesto está más abajo |
| Prototipo | Placa de laboratorio, aplicación y consola | Existe y funciona; falta decidir la demostración en vivo |

`EVALUACIÓN 2 (2).pptx`, que está en esta carpeta, **no pertenece a este ramo**: es una evaluación de Sistemas de Telecomunicaciones (redes VLAN de un hospital). No se usa como base.

### Cómo se trabaja el informe

- El `.docx` se edita **directamente en Word**. Conserva la portada, el encabezado con el logotipo, el pie con la franja roja, el índice automático y los estilos de la Evaluación 2.
- Al abrirlo, Word pide actualizar los campos: aceptar, para que el índice tome los números de página de Word. Si se mueve un capítulo: clic derecho sobre el índice → *Actualizar campos* → *Actualizar toda la tabla*.
- El PDF de entrega se exporta desde Word (*Archivo → Exportar → PDF*), no desde LibreOffice, porque la paginación puede cambiar.
- Antes de exportar, completar en la portada lo que falte (por ejemplo, la sección o el número de grupo, si el docente lo pide).

## Rúbrica

El docente entregó una pauta de contenidos, no una rúbrica con puntajes. Pide **aplicar e integrar sistemas inteligentes diseñando, desarrollando, implementando u optimizando un proyecto de ingeniería**, con pensamiento sistémico, normativa vigente, ética y transferencia del conocimiento en equipos multidisciplinarios. Original: [Rubrica.pdf](Rubrica.pdf).

El informe sigue el hilo de un informe de proyecto, no el orden numérico de la pauta: Introducción → Contextualización de la Problemática → Objetivos (general y específicos) → Propuesta de Valor → Marco Teórico → Análisis Técnico y Disciplinar → Referencias Normativas y Legislativas → Propuesta de Solución → Consideraciones Éticas y Profesionales → Transferencia del Conocimiento → Planificación de la Integración → Conclusiones → Referencias → Anexos.

| Elemento que debe contemplar el trabajo | Dónde se responde en el informe |
| :--- | :--- |
| 1. Contextualización del problema: descripción clara; relevancia técnica y social | «Contextualización de la Problemática» |
| 2. Análisis técnico y disciplinar: diagnóstico desde los sistemas inteligentes; variables críticas y actores | «Análisis Técnico y Disciplinar» (agente percibir-comunicar-razonar-actuar, ciclo sistémico con sus bucles, tabla de variables críticas, tabla de actores) |
| 3. Referencias normativas y legislativas: normas nacionales e internacionales; marco legal | «Referencias Normativas y Legislativas» (marco nacional, estándares internacionales, análisis legal y tendencias) |
| 4. Propuesta de solución: integración y adaptación; viabilidad técnica, económica y operativa; herramientas colaborativas | «Propuesta de Valor» (qué es y qué valor entrega) y «Propuesta de Solución» (integración, viabilidad y herramientas) |
| 5. Consideraciones éticas y profesionales: dilemas; responsabilidad profesional | «Consideraciones Éticas y Profesionales» |
| 6. Transferencia del conocimiento: estrategias en equipos diversos; gestión del conocimiento | «Transferencia del Conocimiento» (espiral SECI y ciclo de gestión con indicadores) |
| 7. Presentación y comunicación: informe estructurado; exposición oral clara, profesional y colaborativa | El informe y la presentación (guion más abajo) |

Contenidos mínimos obligatorios: tópicos de sistemas inteligentes (marco teórico: IoT, computación en el borde, fusión de datos y sistemas basados en conocimiento), tendencias normativas y legislativas, planeación para la integración y la adaptación, gestión y transferencia del conocimiento, y consideraciones éticas y profesionales. El anexo A del informe cruza cada elemento y cada contenido mínimo con su capítulo.

## Ideas centrales del informe

Son las que la presentación debe sostener:

1. **TerraSense es un sistema inteligente completo**: percibe (sonda de 7 variables y BME280), comunica (RS-485 Modbus y BLE de 20 bytes), razona (motor agronómico en el teléfono, sin red) y orienta (plan de acción). La acción la ejecuta el agricultor: la persona decide.
2. **El motor es basado en reglas, no aprendizaje automático, por decisión**: no hay datos locales etiquetados, una recomendación que no se puede explicar no se puede corregir, y cada medición guarda la versión del motor, del catálogo y del firmware.
3. **Pensamiento sistémico**: el bucle de decisión (medir → orientar → actuar → el suelo cambia), el bucle de confianza (que también puede llevar al abandono si se exagera), los retardos (pH tras el riego, el laboratorio) y los límites (N, P y K son valores de referencia).
4. **La normativa es fuente de requisitos de diseño**, y las tendencias (Ley de IA europea y proyecto chileno, Ley N° 21.719 vigente desde el 1-12-2026, ciberseguridad, baterías extraíbles) apuntan a transparencia, supervisión humana y responsabilidad durante toda la vida útil, que el proyecto ya aplica.
5. **Ética**: no afirmar más de lo que la evidencia sostiene (grado probatorio declarado, IP67 «diseñado conforme a», sin dosis de N, P y K, datos ausentes marcados y nunca inventados).
6. **Conocimiento**: contratos de interfaz como lenguaje común, una sola fuente de verdad, conocimiento ejecutable (pruebas y autotest) y la espiral SECI con indicadores.

## Reglas de redacción

Las mismas del informe del proyecto ([CLAUDE.md](../../CLAUDE.md)), resumidas para este ramo:

- **Sin referencias al repositorio** en el informe ni en la presentación: ni rutas, ni nombres de archivos o scripts, ni comandos. Sí se puede decir que el equipo usa control de versiones, integración continua y un repositorio único.
- Español de Chile. Se dice **campo** (no «predio» ni «potrero») y **variables** para lo que mide el equipo: diez, siete del suelo y tres del ambiente. N, P y K son **valores de referencia**.
- Siglas explicadas la primera vez (VAN, TIR, TRL, BLE, CRC, FAT, SAT). No se usan EBITDA, FCFF, FCFE, DSCR ni FTE.
- Propuesta de valor según el capítulo III del [informe 3](../../Evaluacion/Evaluacion%203/INFORME%203.md#la-propuesta-de-valor): sólo **cuatro diferencias** (interpretación por etapa y especie; orientación de manejo en vez del número; diez variables de una inserción; trazabilidad del criterio con estadística chilena). Portabilidad, aplicación, historial, georreferenciación y uso sin red son **paridad** frente a los medidores portátiles. «Sin suscripción» es diferencia frente al laboratorio y al monitoreo remoto, **no** frente a Hanna o Bluelab.
- La autonomía se enuncia **siempre con su patrón de uso**: de 22 a 28 semanas con dos jornadas semanales; de 7 a 9,5 semanas con diez mediciones diarias todos los días. Es una estimación con el consumo medido, no una descarga completa.
- El laboratorio y el asesor son **complemento**, no competencia: el laboratorio fija la referencia y la sonda aporta la repetición.

## Fuentes de las cifras

El informe repite cifras a propósito (es entregable). Si cambian, se toman de su fuente y se corrigen en el `.docx` y en la presentación:

| Tema | Fuente |
| :--- | :--- |
| Problema, requerimientos R01–R27 y propuesta de valor | [INFORME 3.md](../../Evaluacion/Evaluacion%203/INFORME%203.md), capítulos II y III |
| Normativa nacional e internacional | Capítulo V del informe 3, «Condiciones Técnicas y Normativas Respecto al Diseño» |
| Precio, inversión, VAN, TIR y sensibilidades | [RESULTADOS_FINANCIEROS.md](../../docs/RESULTADOS_FINANCIEROS.md) (generado por el modelo económico) |
| Parámetros medidos frente al diseño | Capítulo XII del informe 3 |
| Etapas, prototipo y condiciones de funcionamiento | Capítulo X del informe 3 |
| Hitos y carta Gantt | Capítulo XIV del informe 3 |

Figuras del informe: dos se dibujaron para esta evaluación (el ciclo del sistema inteligente y la espiral de conocimiento); las demás vienen de [../../Evaluacion/Evaluacion 2/Figuras](../../Evaluacion/Evaluacion%202/Figuras) y [../../Evaluacion/Evaluacion 3/Figuras](../../Evaluacion/Evaluacion%203/Figuras), y dos (arquitectura y modelo híbrido) del `.docx` de la Evaluación 2. Para la presentación se pueden copiar desde el propio `.docx`.

## Guion propuesto para la presentación

Formato de referencia: [Evaluacion 2.pptx](../Evaluacion%202/Evaluacion%202.pptx) (16:9, 15 diapositivas, una idea por lámina). Se presenta **como si se presentara el proyecto**: problema, propuesta de valor, hardware, funcionamiento, resultados, normativa, ética, conocimiento y economía, todo resumido. Duración supuesta: unos 15 minutos más preguntas (confirmar con el docente). Las cuatro personas hablan, con traspasos claros.

| N° | Diapositiva | Mensaje | Apoyo visual |
| :---: | :--- | :--- | :--- |
| 1 | Portada | TerraSense: una medición del suelo que se convierte en decisión, en el campo y sin internet | Logo, equipo, ramo y docente |
| 2 | El problema | El pequeño agricultor decide riego, siembra y fertilización a ciegas: dos barreras, económica y de interpretación | Mega sequía, precio de fertilizantes, $50.000 por muestra y 15 a 30 días de laboratorio |
| 3 | Por qué importa | Errar cuesta la temporada; medir cuesta poco. Cuatro momentos irreversibles | Figura de decisiones y consecuencias |
| 4 | La solución | Sonda portátil multivariable de diagnóstico agronómico; el teléfono es el cerebro | Foto del prototipo y de la aplicación |
| 5 | Propuesta de valor | Tres clases de valor y las cuatro diferencias; complemento del laboratorio y del asesor | Tabla de clases de valor |
| 6 | Cómo funciona | Percibir, comunicar, razonar, orientar, actuar | Diagrama del ciclo del sistema inteligente |
| 7 | Hardware | ESP32, sonda RS-485, BME280, celda con carga USB-C, corte de la sonda y reposo profundo | Arquitectura en bloques o render de la placa |
| 8 | El motor agronómico | Reglas por etapa y especie, explicables; datos ausentes declarados; N, P y K como referencia | Captura del plan de acción |
| 9 | Resultados medidos | 3.000 de 3.000 sin error, medición en menos de 10 s, inmersión y caídas superadas, autonomía de 5 a 6 meses en uso habitual | Tabla diseño frente a medido y gráfico de autonomía |
| 10 | Normativa y tendencias | La ley como requisito de diseño; Ley N° 21.719 vigente; IA, ciberseguridad y baterías | Tabla resumida de tendencias |
| 11 | Ética | No afirmar más de lo que se mide; la persona decide | Tres o cuatro dilemas con su decisión |
| 12 | Conocimiento y trabajo en equipo | Contratos de interfaz, una fuente de verdad, conocimiento ejecutable, espiral SECI | Figura de la espiral y herramientas colaborativas |
| 13 | Viabilidad económica | Precio derivado del costo, inversión, VAN, TIR y caja nunca negativa; cuándo se paga para el agricultor | Indicadores grandes |
| 14 | Planificación | Prototipo funcional el 17-12-2026, laboratorio en enero y febrero, lanzamiento el 19-04-2027 | Carta Gantt simplificada |
| 15 | Cierre | Qué está demostrado, qué falta y por qué el sistema es viable | Tres conclusiones y llamado a la demostración |

**Demostración del prototipo (deseable en la pauta).** Propuesta: despertar la placa de laboratorio con dos toques, medir una maceta desde la aplicación y mostrar el plan de acción en pantalla (unos 2 minutos, después de la diapositiva 9). Llevar un video de respaldo por si falla el enlace en la sala y la sonda ya enterrada en tierra húmeda, porque al aire la humedad y la conductividad dan cero.
