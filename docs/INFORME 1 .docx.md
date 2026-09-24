> **Documento de trabajo interno del proyecto TerraSense.** A diferencia del informe entregable de la raíz, este documento sí cita los archivos del repositorio que son fuente de verdad de cada cifra y cada especificación, de modo que al cambiar el código o los parámetros baste con regenerar o releer, sin reescribir prosa. El mapa completo de esa trazabilidad está en la sección siguiente.
>
> El informe entregable del proyecto es `INFORME_ENTREGABLE.md`, en la raíz del repositorio, y **no debe contener ninguna referencia a rutas, scripts ni archivos internos**: es un documento académico autocontenido. Este documento es su contraparte técnica.

## Trazabilidad al repositorio

Cada bloque de este informe tiene un origen verificable en el repositorio. La tabla indica de dónde sale cada cosa y cómo se actualiza:

| Contenido del informe | Fuente de verdad en el repositorio | Cómo se mantiene al día |
| --- | --- | --- |
| Todas las tablas y cifras económicas | `finanzas/supuestos.json` (parámetros) y `finanzas/modelo.py` (modelo anual) | `python finanzas/modelo.py`: reescribe los bloques marcados `<!-- INFORME:*:INICIO/FIN -->` de este archivo, el bloque `<!-- FINANZAS:* -->` del README, `docs/RESULTADOS_FINANCIEROS.md`, el Excel de la raíz y `PCB/BOM_TerraSense.xlsx`. **No editar esas tablas a mano** |
| Redacción de los bloques generados | `finanzas/informe.py` (este documento) y `finanzas/documentacion.py` (README) | Editar el generador, no el resultado |
| Verificación del modelo financiero | `finanzas/test_modelo.py` | `python -m unittest discover -s finanzas -p "test_*.py"` |
| Estructura de costos (BOM) | Lista `bom` dentro de `finanzas/supuestos.json` | Cambiar el precio ahí y regenerar; el BOM en Excel sale de la misma lista |
| Financiamiento: pie, crédito, tasa y plazo | Claves `pie_sobre_credito`, `tasa_credito_efectiva_anual` y `plazo_credito_anios` de `finanzas/supuestos.json` | El crédito financia el 100 % de la inversión inicial, que el modelo sí dimensiona; el pie es el 30 % de ese crédito y se entrega al banco como condición de entrada |
| Metodología, límites y supuestos económicos | `docs/MODELO_ECONOMICO.md` | Documento redactado a mano; actualizar al cambiar criterios |
| Contrato de datos BLE | `App/src/services/probeService.ts` (decodificador real) y `docs/CONTRATO_BLE.md` | El decodificador manda: si cambia, se actualizan el contrato y `PCB/README.md` |
| Transporte BLE y notificaciones | `App/src/services/bleService.ts` | — |
| Motor agronómico y recomendaciones | `App/src/engine/agronomyEngine.ts`, `stageEvaluator.ts` y `contextualAdvice.ts` | Los umbrales del informe deben coincidir con estos archivos |
| Pronóstico meteorológico y su degradación sin red | `App/src/services/weatherService.ts` | — |
| Grid 2×5, pantallas y flujo de la app | `App/README.md` | — |
| Consola web, inventario y soporte | `Web/README.md` | — |
| Esquema de base de datos, RLS y perímetros | `supabase/migrations/*.sql`, `supabase/README.md` y `supabase/ADMINISTRACION.md` | Las migraciones son la fuente; el README describe el esquema vigente |
| Hardware, árbol de alimentación y BOM física | `PCB/README.md` | — |
| Marco normativo y estándares | `docs/MARCO_NORMATIVO_Y_ESTANDARES.md` | — |
| Comprobaciones físicas pendientes | `docs/PLAN_VALIDACION.md` | — |
| Integridad de enlaces y diagramas de toda la documentación | `docs/verificar_documentacion.py` | `python docs/verificar_documentacion.py` |

**Numeración de tablas.** Las series 1.x a 4.x conservan su numeración histórica porque los bloques generados por `finanzas/modelo.py` llevan sus pies de tabla fijados en `finanzas/informe.py` (diccionario `CAPTIONS`): renumerarlas obligaría a editar el generador y a revisar cada ancla del índice. El material incorporado en la revisión vigente —frontera offline/online, tres economías, costo total de propiedad, supuestos de mercado, estado probatorio, matriz normativa, protocolo de validación y plan de calibración— usa por eso la serie **5.x**, numerada en orden de lectura. Si en algún momento se renumera todo, hay que actualizar `CAPTIONS` en el mismo cambio.

Regla de oro para no duplicar verdades: **una cifra vive en un solo lugar**. Si aparece en dos documentos, uno de los dos la genera y el otro la enlaza. El informe entregable de la raíz es la única excepción deliberada: replica las cifras ya cerradas porque debe leerse sin acceso al repositorio, de modo que tras cada `python finanzas/modelo.py` corresponde verificar que sus tablas económicas sigan coincidiendo con `docs/RESULTADOS_FINANCIEROS.md`.

El Grid 2×5 está implementado en la aplicación; las comprobaciones físicas pendientes se organizan en el [plan de validación](PLAN_VALIDACION.md).

**TERRASENSE**

Álvaro Nicolás Villena Torrejón
Alan Paul Escobar Rojas

	Académico guía: Carlos Alberto Castillo Torres

Santiago − Chile
AÑO 2026

**Índice general**

[I. Introducción	5](#introducción)

[II. Descripción de la Problemática	6](#descripción-de-la-problemática)

[III. Propuesta de Solución Tecnológica.	9](#propuesta-de-solución-tecnológica.)

[IV. Objetivos del Proyecto.	14](#objetivos-del-proyecto.)

[V. Ingeniería conceptual	17](#ingeniería-conceptual)

[VI. Conclusiones	70](#conclusiones)

[VII. Referencias bibliográficas	72](#referencias-bibliográficas)

**Índice de figura**

[Figura 1.0 “ Diagrama de Flujo Arquitectura 8 Bits \+ Bluetooth Classic”	19](#figura-10--diagrama-de-flujo-arquitectura-8-bits--bluetooth-classic)

[Figura 1.1 “ Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla”	20](#figura-11--diagrama-de-flujo-arquitectura-de-sistema-embebido-y-pantalla)

[Figura 1.2 “ Diagrama de Flujo Arquitectura con Datalogger Estacionario”	20](#figura-12--diagrama-de-flujo-arquitectura-con-datalogger-estacionario)

[Figura 1.3 “ Diagrama de Flujo Arquitectura de Nodos con LoRaWAN”	21](#figura-13--diagrama-de-flujo-arquitectura-de-nodos-con-lorawan)

[Figura 1.4 “ Diagrama de Flujo Arquitectura de Sonda conecta a Celular”	21](#figura-14--diagrama-de-flujo-arquitectura-de-sonda-conecta-a-celular)

[Figura 1.5 “ Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo”	22](#figura-15--diagrama-de-flujo-arquitectura-de-sistema-embebido-de-bajo-consumo)

[Figura 1.6 “Rutas de Información y Alimentación de las Alternativas”	23](#figura-16-rutas-de-información-y-alimentación-de-las-alternativas)

[Figura 1.7 “Alternativa Cableada con Electrónica Intermedia”	23](#figura-17-alternativa-cableada-con-electrónica-intermedia)

[Figura 1.8 “Diagrama de Flujo del Proceso de Selección de Arquitectura”	25](#figura-18-diagrama-de-flujo-del-proceso-de-selección-de-arquitectura)

[Figura 1.9 “Arquitectura Objetivo de TerraSense y Origen de Cada Dato”	30](#figura-19-arquitectura-objetivo-de-terrasense-y-origen-de-cada-dato)

[Figura 2.0 “Diagrama de Flujo Arquitectura de Conectividad”	32](#figura-20-diagrama-de-flujo-arquitectura-de-conectividad)

[Figura 2.1 “Ciclo de Adquisición y Transmisión con Fallos Diferenciados”	33](#figura-21-ciclo-de-adquisición-y-transmisión-con-fallos-diferenciados)

[Figura 2.2 “Construcción de Flujos e Indicadores desde los Supuestos de Operación”	47](#figura-22-construcción-de-flujos-e-indicadores-desde-los-supuestos-de-operación)

[Figura 2.3 “Representación Conceptual de Carcasa”	57](#figura-23-representación-conceptual-de-carcasa)

[Figura 2.4 “Recorrido de Uso en Campo y Presentación del Diagnóstico”	59](#figura-24-recorrido-de-uso-en-campo-y-presentación-del-diagnóstico)

[Figura 2.5 “Persistencia Local y Sincronización Idempotente”	60](#figura-25-persistencia-local-y-sincronización-idempotente)

[Figura 2.6 “Decisión Agronómica Local Complementada por Pronóstico”	62](#figura-26-decisión-agronómica-local-complementada-por-pronóstico)

[Figura 2.7 “Distribución Funcional de la Carcasa”	63](#figura-27-distribución-funcional-de-la-carcasa)

[Figura 2.8 “Estados Energéticos del Instrumento”	66](#figura-28-estados-energéticos-del-instrumento)

**Índice de tablas**

[Tabla 1.0 “Distribución de Funciones del Sistema”	10](#tabla-10-distribución-de-funciones-del-sistema)

[Tabla 1.1 “Organización del Grid 2×5”	11](#tabla-11-organización-del-grid-25)

[Tabla 1.2 “Objetivos Específicos y Resultado Verificable”	16](#tabla-12-objetivos-específicos-y-resultado-verificable)

[Tabla 1.3 “Filtro de Viabilidad”	18](#tabla-13-filtro-de-viabilidad)

[Tabla 1.4 “Matriz de Decisiones”	23](#tabla-14-matriz-de-decisiones)

[Tabla 1.5 “Comparación Razonada de Arquitecturas”	24](#tabla-15-comparación-razonada-de-arquitecturas)

[Tabla 1.6 “Comparativa de Microcontroladores”	26](#tabla-16-comparativa-de-microcontroladores)

[Tabla 1.7 “Comparativa de Sondas de Suelo”	27](#tabla-17-comparativa-de-sondas-de-suelo)

[Tabla 1.8 “Comparativa de Sensores de Temperatura / Humedad / Presión Barométrica”	28](#tabla-18-comparativa-de-sensores-de-temperatura--humedad--presión-barométrica)

[Tabla 1.9 “Selección de Componentes e Integración Eléctrica”	29](#tabla-19-selección-de-componentes-e-integración-eléctrica)

[Tabla 2.0 “Dimensionamiento del Mercado”	35](#tabla-20-dimensionamiento-del-mercado)

[Tabla 2.1 “Plan de Ventas y Dotación”	36](#tabla-21-plan-de-ventas-y-dotación)

[Tabla 2.2 “Estructura de Costos de Fabricación (BOM)”	38](#tabla-22-estructura-de-costos-de-fabricación-bom)

[Tabla 2.3 “Costo Variable por Equipo”	39](#tabla-23-costo-variable-por-equipo)

[Tabla 2.4 “Estructura de Gastos de Operación, Administración y Comercialización”	42](#tabla-24-estructura-de-gastos-de-operación-administración-y-comercialización)

[Tabla 2.7 “Estado de Resultados y Flujo de Fondos Proyectado”	42](#tabla-27-estado-de-resultados-y-flujo-de-fondos-proyectado)

[Tabla 2.5 “Inversión Inicial”	44](#tabla-25-inversión-inicial)

[Tabla 2.6 “Amortización del Crédito”	45](#tabla-26-amortización-del-crédito)

[Tabla 2.7 “Estado de Resultados y Flujo de Fondos Proyectado”	48](#tabla-27-estado-de-resultados-y-flujo-de-fondos-proyectado)

[Tabla 2.7 “Estado de Resultados y Flujo de Fondos Proyectado”	48](#tabla-27-estado-de-resultados-y-flujo-de-fondos-proyectado)

[Tabla 2.8 “Evaluación Económica”	49](#tabla-28-evaluación-económica)

[Tabla 2.9 “Análisis de Sensibilidad y Punto de Quiebre”	50](#tabla-29-análisis-de-sensibilidad-y-punto-de-quiebre)

[Tabla 3.0 “Análisis del VAN”	52](#tabla-30-análisis-del-van)

[Tabla 3.3 “Evaluación Financiera”	53](#tabla-33-evaluación-financiera)

[Tabla 3.4 “Especificaciones Técnicas ESP32”	54](#tabla-34-especificaciones-técnicas-esp32)

[Tabla 3.5 “Especificaciones Técnicas Sonda”	55](#tabla-35-especificaciones-técnicas-sonda)

[Tabla 3.6 “Contrato de Datos BLE (20 bytes)”	56](#tabla-36-contrato-de-datos-ble-20-bytes)

[Tabla 3.7 “Mapeo de Pines del Instrumento”	56](#tabla-37-mapeo-de-pines-del-instrumento)

[Tabla 3.8 “Especificaciones Técnicas de Gestión Energética”	57](#tabla-38-especificaciones-técnicas-de-gestión-energética)

[Tabla 3.9 “Interfaz Hardware”	58](#tabla-39-interfaz-hardware)

[Tabla 4.0 “Matriz de Cultivos del Motor Agronómico”	59](#tabla-40-matriz-de-cultivos-del-motor-agronómico)

[Tabla 4.1 “Umbrales Hídricos por Textura de Suelo”	60](#tabla-41-umbrales-hídricos-por-textura-de-suelo)

[Tabla 4.2 “Estado de Integración del BME280 y del Pronóstico”	61](#tabla-42-estado-de-integración-del-bme280-y-del-pronóstico)

[Tabla 4.3 “Estados Energéticos y Medidas de Diseño”	65](#tabla-43-estados-energéticos-y-medidas-de-diseño)

[Tabla 4.4 “Fases de Operación y Consumo Energético”	66](#tabla-44-fases-de-operación-y-consumo-energético)

[Tabla 4.5 “Energía por Ciclo de Medición”	66](#tabla-45-energía-por-ciclo-de-medición)

[Tabla 4.6 “Efecto del Consumo de Reposo sobre la Autonomía”	67](#tabla-46-efecto-del-consumo-de-reposo-sobre-la-autonomía)

[Tabla 4.7 “Análisis Comparativo de Parámetros”	68](#tabla-47-análisis-comparativo-de-parámetros)

[Tabla 4.8 “Indicadores Ambientales y de Servicio a Medir”	69](#tabla-48-indicadores-ambientales-y-de-servicio-a-medir)

[Tabla 4.9 “Criterios de Cierre Técnico y Evidencia”	70](#tabla-49-criterios-de-cierre-técnico-y-evidencia)

[Tabla 5.0 “Frontera Offline / Online del Sistema”	31](#tabla-50-frontera-offline--online-del-sistema)

[Tabla 5.1 “Separación de las Tres Economías del Análisis”	33](#tabla-51-separación-de-las-tres-economías-del-análisis)

[Tabla 5.2 “Costo Total de Propiedad del Agricultor a 1, 3, 5 y 10 Años”	43](#tabla-52-costo-total-de-propiedad-del-agricultor-a-1-3-5-y-10-años)

[Tabla 5.3 “Supuestos de Mercado Declarados”	44](#tabla-53-supuestos-de-mercado-declarados)

[Tabla 5.4 “Estado Probatorio de las Especificaciones de Hardware”	74](#tabla-54-estado-probatorio-de-las-especificaciones-de-hardware)

[Tabla 5.5 “Clasificación Normativa: Obligatoria, Voluntaria y de Mercado Futuro”	95](#tabla-55-clasificación-normativa-obligatoria-voluntaria-y-de-mercado-futuro)

[Tabla 5.6 “Protocolo de Validación In Situ vs. Laboratorio de Referencia”	99](#tabla-56-protocolo-de-validación-in-situ-vs-laboratorio-de-referencia)

[Tabla 5.7 “Plan de Calibración y Control de Deriva”	101](#tabla-57-plan-de-calibración-y-control-de-deriva)



<a id="introducción"></a>

1. #### **Introducción**

La agricultura chilena, y en particular la Agricultura Familiar Campesina (AFC), se enfrenta a un escenario de alta vulnerabilidad marcado por la convergencia de una mega sequía ininterrumpida y el aumento sostenido en los costos de insumos clave como los fertilizantes. En este contexto, optimizar el uso del agua y los nutrientes es un requisito estricto de supervivencia económica para el pequeño y mediano agricultor. Sin embargo, existe una profunda brecha tecnológica que margina a este sector: los instrumentos de medición edáfica disponibles son económicamente prohibitivos y entregan datos crudos (como valores aislados de conductividad o pH) que resultan incomprensibles sin una formación técnica especializada.

Para dar respuesta a esta problemática, el presente informe detalla el desarrollo y evaluación de TerraSense, un sistema integral de apoyo a la decisión en terreno. Más que un simple sensor, la propuesta se basa en una arquitectura de bajo costo y bajo consumo que captura las variables físicas del suelo (mediante bus RS-485 con protocolo Modbus RTU) y del ambiente inmediato del punto de muestreo (mediante el sensor BME280 en bus I²C). Su innovación radica en delegar el procesamiento complejo al smartphone del agricultor vía Bluetooth Low Energy (BLE), transformando datos crudos en recomendaciones agronómicas accionables de forma inmediata, sin necesidad de conexión a internet durante la medición ni de suscripciones de pago. A lo largo de este documento se expone la ingeniería conceptual del sistema, justificando la selección de componentes, el diseño de gestión energética, el cumplimiento del marco regulatorio y la evaluación económica que respalda su viabilidad técnica y financiera.

El informe distingue de forma explícita tres planos que suelen confundirse en un estudio de ingeniería conceptual: lo que el proyecto **decide** (arquitectura y componentes), lo que el proyecto **ya tiene construido** (aplicación móvil, motor agronómico, backend y modelo económico reproducible en código) y lo que el proyecto **debe todavía comprobar** en banco de pruebas (autonomía medida desde batería, ensayo de estanqueidad, ficha del SKU de sonda efectivamente adquirido). Esta separación es deliberada: un estudio que presenta objetivos de diseño como resultados verificados pierde valor como herramienta de decisión, y es precisamente el tipo de error que esta revisión corrige respecto de versiones anteriores del documento.

<a id="descripción-de-la-problemática"></a>

2. #### **Descripción de la Problemática**

**Contexto y Antecedentes del Sector:**

La agricultura chilena es un pilar fundamental para la seguridad alimentaria y el desarrollo rural del país. Según el último Censo Agropecuario y Forestal, el cual se realiza cada 10 años, existen más de 175.000 unidades productivas a nivel nacional \[1, 2\].

Dentro de este universo, la Agricultura Familiar Campesina (AFC) y los pequeños agricultores (con campos de 0,5 a 20 hectáreas) representan la base productiva del mercado interno \[3\]. Sin embargo, este sector se encuentra actualmente en un punto de vulnerabilidad histórica debido a la convergencia de dos factores extremos:

En primer lugar, el país atravesó una "mega sequía" ininterrumpida desde 2010, con un déficit de precipitaciones cercano al 30% en la zona centro-sur \[4\]. Esta crisis hídrica no solo limita el riego, sino que altera las condiciones físico-químicas del terreno, promoviendo la salinización y degradación del suelo.

En segundo lugar, el escenario económico ha provocado una escalada sostenida en los costos operativos, especialmente impulsada por el alza internacional en los precios de los fertilizantes y agroquímicos \[5\].

En este escenario de estrechez hídrica y alto costo de insumos, la eficiencia productiva ya no es solo una oportunidad de mejora, sino un requisito estricto de supervivencia. La agricultura moderna exige optimizar cada gota de agua y cada gramo de nutriente aplicado. No obstante, para lograr esta eficiencia es imperativo contar con información precisa y en tiempo real sobre las condiciones del suelo, un requerimiento que choca frontalmente con la realidad tecnológica y económica del pequeño agricultor.

**El Problema Central:**

La problemática real radica en que los pequeños y medianos agricultores carecen de herramientas tecnológicas accesibles y comprensibles para diagnosticar el estado de su suelo. En un contexto de sequía constante y alto costo de los insumos agrícolas, optimizar el uso del agua y los fertilizantes es vital para la supervivencia del cultivo.

El problema central es que el agricultor agrícola opera **"a ciegas"**. Carece de herramientas accesibles para diagnosticar el estado de su suelo y se ve obligado a tomar decisiones críticas basándose únicamente en la intuición.

Esta situación se fundamenta en dos grandes limitantes de la oferta actual:

* **Barrera Económica:** Los equipos de medición profesional son financieramente inalcanzables para la agricultura familiar (diseñados para la agroindustria de gran escala con costos prohibitivos).
* **Barrera de Interpretación:** Los instrumentos disponibles entregan datos técnicos crudos, incomprensibles sin estudios agronómicos avanzados. No entregan el feedback necesario para ejecutar una acción concreta.

Esta falta de herramientas accesibles e intuitivas tiene un impacto severo a lo largo de todo el ciclo de vida del cultivo:

* **Pre-siembra:** Pérdida de semillas por siembra en suelos fríos o altamente salinos.
* **Vegetativo:** Asfixia de raíces y pérdida de fertilizantes por riegos ineficientes.
* **Floración:** Aborto floral masivo por estrés hídrico no detectado a tiempo.
* **Cosecha:** Destrucción de la estructura del suelo por ingresar con exceso de humedad.

**Relación con los Servicios Formales de Análisis y Asesoría:**

Actualmente, las alternativas formales como los análisis de laboratorio son lentas (15 a 30 días) y costosas, entregando resultados cuando la fase crítica ya pasó. Por otro lado, pagar asesorías agronómicas continuas para que un profesional interprete los datos escapa del presupuesto operativo.

Corresponde precisar el alcance exacto de esta brecha, porque el proyecto no se plantea como un reemplazo del laboratorio. Un análisis acreditado determina propiedades químicas mediante extracción y método normalizado; un instrumento de terreno entrega una lectura directa, en un punto y en un instante. Son procedimientos distintos que responden preguntas distintas, y confundirlos sería el error de fondo más grave que podría cometer este proyecto. TerraSense apunta al vacío que existe **entre** dos análisis de laboratorio: las decenas de decisiones de riego, siembra y manejo que el agricultor toma cada semana y que hoy resuelve por intuición, porque no existe ninguna herramienta que las acompañe con un dato propio de su campo. Los servicios de laboratorio y de asesoría conservan íntegramente su función en las decisiones que exigen determinaciones específicas, en particular las de fertilización.

En síntesis, el pequeño agricultor está atrapado entre una crisis climática que exige precisión, un mercado tecnológico que lo excluye por precio, y equipos que le entregan datos incomprensibles. Esto lo obliga a tomar decisiones a ciegas, descubriendo sus errores solo al final de la temporada, cuando la pérdida de la cosecha y el endeudamiento ya son irreversibles.

<a id="propuesta"></a>

<a id="propuesta-de-solución-tecnológica."></a>

3. #### **Propuesta de Solución Tecnológica.**

El proyecto TerraSense no se concibe como "un medidor más" que compite únicamente por precisión de sensado. Se define como un sistema integral de apoyo a la decisión en terreno, compuesto por tres elementos colaborativos donde cada pieza asume exclusivamente la función que mejor sabe ejecutar, optimizando costos y maximizando la usabilidad.

**Arquitectura del Sistema:**

* **El Instrumento Físico (Sonda y Sensores):** Un dispositivo portátil y robusto que se inserta directamente en el suelo. Su función es tomar el pulso físico-químico del terreno como también ambiental para luego transmitir esta información de forma inalámbrica.
* **El Celular del Agricultor (Interfaz y Procesamiento):** La aplicación móvil actúa como el cerebro del sistema. Recibe los datos crudos del sistema y los convierte, en tiempo real y en el mismo lugar de la medición, en recomendaciones de manejo agronómico claras, interpretables y accionables.
* **La Nube (Respaldo y Trazabilidad):** Una base de datos que resguarda el historial de mediciones, permite visualizar la evolución de los campos y mantiene el sistema actualizado. Opera en segundo plano: sincroniza cuando hay conexión a internet, pero su ausencia nunca bloquea la entrega de recomendaciones en terreno.

El instrumento y el teléfono forman una unidad funcional, no dos productos independientes. La siguiente tabla precisa qué resuelve cada bloque, para evitar la lectura equivocada de que "el teléfono hace todo" o de que "el instrumento mide todo":

| Bloque del sistema | Responsabilidad exclusiva | Lo que deliberadamente NO hace |
| :---- | :---- | :---- |
| **Instrumento (ESP32)** | Alimentar y excitar la sonda, ejecutar la consulta Modbus RTU, leer el BME280, verificar la validez de la trama y transmitirla por BLE. | No interpreta agronómicamente, no almacena historial de usuario ni resuelve la posición geográfica. |
| **Aplicación móvil** | Interpretar según cultivo, textura y etapa fenológica; presentar el diagnóstico; georreferenciar y conservar el registro localmente. | No genera señales RS-485 ni sustituye la medición física del suelo. |
| **Supabase (backend)** | Identidad, permisos, persistencia remota y consulta geográfica del historial. | No participa en la entrega del diagnóstico en terreno; su ausencia no bloquea la medición. |
| **Consola web** | Soporte técnico, catálogo de firmware y gestión del fabricante. | No es una herramienta de uso del agricultor en el campo. |

###### **Tabla 1.0 “Distribución de Funciones del Sistema”**

Esta distribución aprovecha recursos que ya están presentes en el teléfono y evita añadir al instrumento otra pantalla de navegación, memoria de usuario y receptor GPS. Corresponde señalar, sin embargo, que traslada parte del consumo energético y de la carga de compatibilidad al smartphone: reducir el consumo del instrumento no significa que el procesamiento o la visualización dejen de consumir energía; significa que ese gasto ocurre en un dispositivo que el usuario ya recarga todos los días.

**La Lectura Local y el Grid 2×5:**

El sensor ambiental **BME280 es un componente obligatorio del instrumento**, no un accesorio opcional. Aporta tres magnitudes medidas en el punto exacto de muestreo: temperatura del aire en °C, humedad relativa en % y presión barométrica local en hPa. Estas tres variables constituyen las tres tarjetas ambientales del Grid de resultados y no pueden sustituirse por datos de un servicio meteorológico: un modelo de pronóstico describe una celda geográfica de varios kilómetros, mientras el agricultor está de pie sobre un punto concreto, que puede estar bajo malla, en una ladera de exposición sur o dentro de un invernadero.

El Grid **2×5 tiene dos columnas y cinco filas**, con una tarjeta por variable y diez registros locales en total.

| Fila | Columna 1 | Columna 2 |
|---|---|---|
| 1 | Humedad del suelo | Conductividad eléctrica del suelo |
| 2 | Temperatura del suelo | Nitrógeno (N) |
| 3 | Fósforo (P) | Potasio (K) |
| 4 | pH del suelo | Temperatura ambiente (BME280) |
| 5 | Humedad relativa ambiente (BME280) | Presión atmosférica ambiente (BME280) |

N, P y K se muestran por separado como registros informativos, sin atribuirles selectividad química o capacidad para prescribir dosis de fertilizante. Estado, batería y completitud van fuera de estas diez tarjetas. El pronóstico a cinco días se presenta aparte. Si falta una lectura ambiental, se indica su ausencia; no se sustituye por datos de internet. **El Grid está implementado en la App y en el detalle web; la validación física sigue pendiente.**

###### **Tabla 1.1 “Organización del Grid 2×5”**

Cada tarjeta N, P y K informa su procedencia y su limitación, sin construir un diagnóstico nutricional ni una dosis de fertilizante. El indicador de calidad fuera del Grid indica si la captura contiene todas las fuentes esperadas. Si el BME280 falla, las tres tarjetas ambientales muestran ausencia de lectura y el conjunto se declara incompleto: **no se rellenan con temperatura o lluvia obtenidas de internet**, porque eso convertiría una medición local en una estimación regional sin avisar al usuario. La presión local tampoco debe confundirse con la presión reducida al nivel del mar que publican los servicios meteorológicos.

**El Pronóstico como Complemento Posterior a la Lectura:**

Una vez tomada la medición, y solo si existe conectividad, el sistema consulta el pronóstico de los próximos cinco días para la ubicación y la fecha local. Estas variables se presentan en una sección de planificación claramente separada de las observaciones del equipo. La utilidad es concreta: una recomendación de aplazar la siembra puede surgir de precipitación intensa prevista, riesgo de saturación o temperaturas extremas, aun cuando la humedad y la temperatura medidas del suelo sean adecuadas en ese momento.

La formulación de estas advertencias expresa riesgo, no certeza: «Se prevén lluvias intensas; conviene revisar la fecha de siembra», en lugar de afirmar que las semillas necesariamente se perderán. El efecto real depende del suelo, del drenaje, de la especie y del manejo. Del mismo modo, una ola de calor prevista orienta una revisión de fecha o de riego, sin que el pronóstico sustituya la medición local del BME280: una sola lectura de presión barométrica no predice por sí sola un frente meteorológico.

**Filosofía del Proyecto:**

Antes de cualquier decisión técnica o de diseño más focalizado, el proyecto responde a una pregunta fundamental: *¿Para qué existe esta herramienta?* La respuesta no es "para cuidar plantas", sino para proteger el patrimonio de una familia que se juega el año entero en cada siembra.

Esta distinción no es un matiz retórico; cambia el criterio con el que se evalúa cada decisión de desarrollo. El fin último no es el campo productivo, sino el ser humano cuyo sustento familiar depende de él. Un cultivo que se pierde por acidez o salinidad es, en el fondo, un problema agronómico menor comparado con lo que realmente está en juego: una familia que queda endeudada durante un año entero por tomar una decisión sin la información adecuada. Ese es el problema social y económico que TerraSense ataca. Por ello, toda decisión de diseño se resuelve preguntando cuál alternativa reduce más el riesgo económico del agricultor, no cuál es la más sofisticada desde el punto de vista técnico.

De esta premisa central se desprenden cuatro principios que gobiernan el diseño del sistema:

* **"No entregamos datos, entregamos respuestas":** Un dato aislado, un valor de pH o una lectura de conductividad no es información útil para quien no sabe interpretarlo. Un dato sin contexto es, en la práctica, “un vacío” con unidades. TerraSense no entrega la medición en bruto, sino la cadena completa: desde la captura de la variable física hasta una recomendación concreta de manejo (qué hacer, cuánto y por qué), formulada siempre dentro de lo que un instrumento de terreno puede sostener con evidencia.
* **"El Celular es el cerebro del sistema":** La idea central que ordena todo el diseño es sencilla y radical en sus consecuencias: el teléfono que el agricultor ya posee es el instrumento de registro más potente que existe. Tiene pantalla legible, ubicación satelital, capacidad de cálculo y memoria. Fabricar un instrumento nuevo que vuelva a incluir todas esas capacidades sería cobrarle dos veces al agricultor por algo que ya tiene. Por eso, el aparato físico se reduce a lo mínimo indispensable: hacer lo único que el teléfono no puede hacer por sí solo (tomar contacto físico con la tierra y el ambiente). Todo el resto ocurre en el celular.
* **"Diseño para el campo real, no para el laboratorio":** El instrumento no vivirá sobre un escritorio; se caerá sobre tierra y piedras, se mojará, viajará en la caja de una camioneta y será manipulado con guantes de trabajo. Cada elección de materiales responde a esa realidad de uso, priorizando la austeridad y la resistencia sobre la estética.
* **"Soberanía del dato y cero suscripciones":** El agricultor paga una vez por su instrumento y sus mediciones le pertenecen; puede consultarlas, exportarlas y usarlas libremente. A diferencia de la instrumentación importada que depende de plataformas por suscripción, aquí no existe una cuota mensual que condicione el funcionamiento del equipo. La tecnología no debe convertirse en una carga financiera mensual para quien ya enfrenta suficiente incertidumbre. Este principio tiene una consecuencia económica directa y asumida: los costos de soporte, servicios digitales, mantenimiento y reposición permanecen en el presupuesto de la empresa y están explícitamente cuantificados en la evaluación económica de este informe.

**Beneficiarios de la Solución:**

El beneficiario directo y principal es el pequeño y mediano agricultor comercial (Agricultura Familiar Campesina), quien hoy queda fuera de toda la oferta de instrumentación profesional. Sin embargo, el diseño contempla un impacto expansivo hacia otros actores:

* **La familia y el equipo de trabajo:** El sistema está diseñado para que cualquier persona del campo pueda tomar una medición sin necesitar formación técnica previa.
* **Asesores técnicos y extensionistas:** Quienes hoy deben estimar las condiciones del suelo a través de la observación, podrán pasar de "estimar" a "medir", dejando un registro histórico y georreferenciado de cada visita. Cabe precisar, para efectos del dimensionamiento comercial, que la cantidad de campos visitados por un asesor no equivale a la cantidad de equipos comprados.
* **Cooperativas y asociaciones:** Podrán utilizar la herramienta para reunir un registro de salud edáfica de todo el territorio que administran, mejorando las compras conjuntas de insumos.
* **Instituciones públicas:** Podrían apoyarse en esta información agregada para focalizar sus programas de fomento, paliando la actual falta de datos de suelo georreferenciados a escala de campo individual.
* **El medio ambiente:** Una fertilización y riego ajustados a la necesidad real del cultivo en lugar de aplicaciones preventivas por exceso de precaución reduce el desperdicio hídrico y la contaminación de napas por lixiviación.

**La Propuesta de Valor:**

TerraSense toma la información física del suelo y del aire, la cruza con el conocimiento agronómico del cultivo y con las condiciones climáticas del lugar exacto de la medición, entregando en segundos y sin necesidad de conexión a internet una recomendación concreta y accionable.

Es, en esencia, la diferencia entre entregarle a alguien un termómetro y entregarle una orientación de manejo ya interpretada. El modelo comercial que sostiene esa promesa es la venta del instrumento con la aplicación incluida y sin cobro por lectura: el usuario dispone de una herramienta de seguimiento permanente, mientras los servicios de laboratorio y asesoría conservan su función en aquellas decisiones que requieren determinaciones específicas.

<a id="objetivos"></a>

<a id="objetivos-del-proyecto."></a>

4. #### **Objetivos del Proyecto.**

**Objetivo General:**
Diseñar, construir y validar un instrumento portátil de medición de suelo y ambiente que resuelva, de punta a punta, la toma de decisiones del pequeño agricultor: capturando en terreno las variables físicas y químicas relevantes del suelo y de su ambiente inmediato, interpretándolas mediante un sistema de razonamiento agronómico ejecutado en el smartphone del usuario, y entregando una recomendación de manejo clara y aplicable en terreno, con una estructura económica que incluya fabricación, comercialización y soporte, sin costos recurrentes por suscripción para el usuario.
En síntesis: lograr que una medición física se convierta, en el mismo lugar, en una decisión agronómica correcta.

**Objetivos Específicos:**

Para materializar este objetivo general, el proyecto se estructura en los siguientes frentes de trabajo:

* **Definir la arquitectura de hardware y comunicación**: Comparar explícitamente distintas combinaciones de componentes y protocolos de transmisión hacia el teléfono, justificando técnica y económicamente la elección final en lugar de asumir la primera opción disponible.
* **Diseñar el sistema de adquisición de datos:** Lograr una integración confiable entre la sonda edáfica (que penetra la tierra) y el sensor ambiental BME280, asegurando que el equipo capture un panorama físico-químico completo, con marca temporal común y estado de validez explícito para cada fuente.
* **Optimizar la autonomía energética:** Desarrollar un sistema de alimentación capaz de sostener un uso frecuente en terreno durante una temporada agrícola sin requerir recargas constantes ni mantenimiento especializado, y **medir** ese desempeño desde los bornes de la batería con el equipo completo, en lugar de estimarlo a partir de fichas de componentes aislados.
* **Desarrollar el motor de razonamiento agronómico:** Construir el algoritmo (el "corazón" del sistema) que convierta las variables físicas capturadas en recomendaciones de manejo ajustadas al cultivo, a la textura del suelo y a la etapa fenológica específica (pre-siembra, vegetativo, floración o cosecha).
* **Programar la interfaz móvil (App) para entornos rurales:** Desarrollar una aplicación intuitiva y accesible para usuarios de distintos niveles de alfabetización digital, que opere de forma *offline* al momento de medir y sincronice los datos cuando recupere la cobertura de red.
* **Diseñar el encapsulado industrial (Carcasa):** Crear una estructura física robusta, pensada explícitamente para el rigor del trabajo agrícola, que proteja los componentes electrónicos del barro, polvo, sol directo y humedad, resolviendo simultáneamente el requisito opuesto de ventilar el sensor ambiental para que pueda medir el aire exterior.
* **Validar la precisión instrumental:** Contrastar empíricamente las mediciones del equipo contra muestras analizadas por un laboratorio de referencia acreditado, declarando el método, la profundidad y la condición de humedad de cada comparación.
* **Asegurar el cumplimiento normativo:** Identificar y cumplir el marco regulatorio aplicable, abarcando la seguridad eléctrica del hardware, el uso permitido del espectro radioeléctrico, y la protección de datos personales y derechos del consumidor.
* **Evaluar la viabilidad económica y financiera:** Estructurar el modelo de negocio, analizando rigurosamente la estructura de costos, proyecciones de flujo de caja mensual y fuentes de financiamiento, para asegurar que la solución tecnológica sea sostenible como empresa en el tiempo.
* **Dimensionar el mercado y la capacidad productiva:** Cuantificar el segmento de clientes objetivo basándose en datos censales oficiales y verificar que la estrategia de fabricación planificada pueda sostener la demanda proyectada sin comprometer la calidad.

Cada objetivo específico se acompaña de un resultado esperado y de una forma de evaluación declarada de antemano. Este compromiso es lo que permite distinguir un avance real de una intención:

| Objetivo específico | Resultado esperado | Forma de evaluación |
| :---- | :---- | :---- |
| Definir la arquitectura | Comparación de alternativas y distribución de funciones | Requisitos obligatorios, criterios ponderados y justificación trazable de la decisión |
| Integrar suelo y ambiente | Adquisición RS-485 e I²C asociada a una misma captura con marca temporal | Capturas seriales, errores controlados y comparación de valores contra referencia |
| Comunicar con la aplicación | Contrato BLE definido y versionado | Pruebas de decodificación, conexión y compatibilidad en Android e iOS reales |
| Interpretar el contexto | Motor por cultivo, textura y etapa fenológica | Casos agronómicos documentados y revisión de reglas |
| Conservar la información | Registro local y sincronización idempotente | Pruebas de desconexión, reintento y cambio de cuenta |
| Diseñar energía y carcasa | Batería recargable, alimentación conmutada y alojamiento impreso en 3D | Balance energético medido desde batería y ensayos del conjunto ensamblado |
| Evaluar costos y operación | BOM, personal, inventario y flujo mensual | Conciliación reproducible en Python y Excel desde una fuente única de supuestos |
| Evaluar el retorno económico | VAN, TIR y payback a diez años, con comparación a cinco | Misma inversión, mismos flujos y mismo horizonte para los tres indicadores |

###### **Tabla 1.2 “Objetivos Específicos y Resultado Verificable”**

Una precisión metodológica que atraviesa toda esta tabla: la velocidad de diagnóstico se evaluará midiendo el tiempo completo desde que el usuario inicia la captura hasta que obtiene un resultado utilizable. El tiempo de lectura eléctrica de un sensor no representa por sí solo toda la experiencia, porque intervienen conexión, estabilización, transmisión, procesamiento y presentación. Los objetivos de autonomía, precisión y protección mecánica siguen este mismo criterio de medición del conjunto y no de sus partes.

<a id="ingeniería-conceptual"></a>

5. #### **Ingeniería conceptual**

La ingeniería conceptual constituye el puente crítico entre la problemática diagnosticada y la materialización de la solución. En esta etapa, los principios filosóficos del proyecto —movilidad, independencia de red, bajo costo y el uso del smartphone como núcleo de procesamiento— se traducen en requerimientos técnicos concretos. El objetivo de esta fase no es simplemente elegir componentes al azar, sino definir y justificar la arquitectura de hardware y software óptima que garantice la viabilidad del equipo en el mundo real, equilibrando rendimiento, robustez y usabilidad para el pequeño agricultor.

A partir de estas premisas, se desarrolla el siguiente análisis de viabilidad técnica, como también viabilidad económica, en donde se evalúan las distintas alternativas para materializar el sistema.

<a id="viabilidad-tecnica"></a>

**Análisis de Viabilidad Técnica:**

Antes de comparar cualquier alternativa, el proyecto fija dos capas de exigencia, porque confundirlas es el error metodológico más común en un estudio de ingeniería conceptual.

* **Requisitos Obligatorios (filtro de viabilidad):** Son condiciones de cumplimiento innegociable derivadas del caso de uso real: un operador recorre varios puntos y necesita interpretar una lectura en el mismo lugar. Una arquitectura que no las satisface queda eliminada antes de puntuar, sin importar su desempeño en el resto de los criterios.

|  | Requisito | Qué exige | Consecuencia de diseño |
| :---- | ----- | ----- | ----- |
| RO-1 | Alimentar y comunicarse con la sonda | Operar por bus diferencial RS-485 con sonda industrial. | Verificar tensión, corriente, interfaz diferencial y mapa de registros del SKU adquirido. |
| RO-2 | Medir el ambiente local del punto | Capturar temperatura del aire, humedad relativa y presión en el punto de muestreo. | Incluir el BME280, ventilarlo y transportar sus tres datos hasta la aplicación. |
| RO-3 | Interpretar, no solo mostrar | Entregar un veredicto interpretado, no una lectura plana. | Disponer de reglas agronómicas locales y de una interfaz comprensible. |
| RO-4 | Operar sin cobertura celular | Completar la medición y su diagnóstico en el momento, sin depender de señal de datos. | Persistencia local y estado de sincronización explícito. |
| RO-5 | Muestrear múltiples puntos | Permitir recorrer y medir distintos puntos de un mismo campo en una jornada. | Portabilidad y un ciclo de operación repetible y breve. |
| RO-6 | Ser físicamente realizable y mantenible | Construirse con componentes de catálogo real y poder repararse por piezas. | Disponibilidad de componentes, carcasa desmontable y documentación de montaje. |

###### **Tabla 1.3 “Filtro de Viabilidad”**

**Criterios Ponderados:** Solo entre las arquitecturas que sobreviven el filtro se aplica una matriz de puntuación (escala 1 a 10) sobre ocho criterios: cobertura espacial (15 %), calidad de interfaz (13 %), capacidad de interpretación (15 %), autonomía energética (14 %), costo total a cinco años para el agricultor (16 %), robustez mecánica y ambiental (10 %), facilidad de actualizar el conocimiento agronómico (9 %) e independencia de infraestructura externa (8 %).

Esta separación en dos capas evita "aprobar" una arquitectura inviable con un buen puntaje ponderado, un caso real que aparece más adelante y que el propio proyecto descarta por honestidad tecnológica.

**Alternativas Evaluadas:** Se compararon seis arquitecturas; ninguna es hipotética, las seis existen hoy como productos comerciales o como proyectos publicados en la literatura técnica.

* **Instrumento autónomo (8 bits \+ pantalla \+ Bluetooth Classic)**: La arquitectura por defecto de la electrónica educativa y de buena parte de los medidores genéricos de importación: un microcontrolador simple, una pantalla LCD u OLED pequeña, y un módulo Bluetooth Classic para vinculación.

  *Evaluación:* Los módulos Bluetooth Classic más usados implementan un perfil de comunicación serial cuya integración con iOS exige resolver la certificación MFi de Apple, un trámite y un costo que el proyecto no puede asumir en esta etapa; adoptarla arriesga renunciar a una parte relevante del mercado de smartphones. Además, la memoria disponible no alcanza cómodamente para el motor de interpretación y no existe una vía práctica de actualizar el firmware de forma remota. Incumple el filtro de viabilidad y queda eliminada.

![Diagrama de flujo: arquitectura 8 bits con Bluetooth Classic](img/figura-1-0-arquitectura-8bits-bluetooth-classic.png)

##### **Figura 1.0 “ Diagrama de Flujo Arquitectura 8 Bits \+ Bluetooth Classic”**

* **Instrumento autónomo con inferencia embebida y pantalla:** La versión seria de la alternativa anterior. Todo el sistema, incluido el motor de interpretación agronómica, viviría dentro del microcontrolador, sin depender de un teléfono.

  *Evaluación:* Es una alternativa técnicamente válida y resuelve bien el caso de un usuario que no quiere depender de su celular. Sus costos aparecen en otro lado: incorporar una pantalla activa aumenta el consumo y añade una ventana que es el punto débil de la estanqueidad; sin GPS ni conectividad se pierde la capa del motor que cruza la medición con el clima previsto; y corregir el conocimiento agronómico exigiría publicar un nuevo firmware y lograr que el usuario lo instale. Supera el filtro de viabilidad y llega a la etapa de puntuación.

![Diagrama de flujo: sistema embebido con pantalla](img/figura-1-1-sistema-embebido-pantalla.png)

##### **Figura 1.1 “ Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla”**

* **Datalogger estacionario con telemetría celular:** La arquitectura típica de las parcelas de investigación: equipo fijo, alimentado por panel solar, con una sonda enterrada en un único punto y un módem celular que sube datos a una web por suscripción.

  *Evaluación:* Resuelve muy bien un problema distinto, y conviene decirlo sin descalificarla: entrega series continuas en el tiempo, algo que un instrumento portátil no puede ofrecer. Pero la variabilidad de un campo es también espacial, y mapear veinte puntos exigiría veinte instalaciones. Requiere cobertura celular exacta en el punto de instalación e impone una suscripción recurrente, incompatible con el principio de cero suscripciones. Incumple RO-4 y RO-5 para este caso de uso y queda clasificada como adecuada para monitoreo fijo, no para el recorrido de terreno.

![Diagrama de flujo: datalogger estacionario](img/figura-1-2-datalogger-estacionario.png)

##### **Figura 1.2 “ Diagrama de Flujo Arquitectura con Datalogger Estacionario”**

* **Red de nodos LoRaWAN con estación concentradora en el campo:** Reemplaza el módem celular por una radio de largo alcance y bajísimo consumo hacia una estación concentradora en el campo.

  *Evaluación:* Es la alternativa técnicamente más elegante entre las descartadas y la que mejor resuelve el monitoreo distribuido y simultáneo. Su limitación para este proyecto es económica y operativa: la cantidad de nodos depende de la resolución espacial y temporal buscada, y alcanzar una cobertura comparable al recorrido de un operador exigiría un número de nodos con costo prohibitivo para la AFC, además de instalar infraestructura propia. Tampoco resuelve el caso de uso central: el agricultor está de pie sobre el punto cuando necesita la decisión, no a distancia. Cumple los requisitos y pasa a puntuar con esa reserva.

![Diagrama de flujo: nodos LoRaWAN](img/figura-1-3-nodos-lorawan.png)

##### **Figura 1.3 “ Diagrama de Flujo Arquitectura de Nodos con LoRaWAN”**

* **Sonda conectada directo al teléfono (electrónica intermedia):** La alternativa más radical: eliminar la radio del medio y conectar la sonda al teléfono por cable, mediante un adaptador USB–RS-485 con fuente de alimentación propia.

  *Evaluación:* Es técnicamente realizable y hereda gratis todas las capacidades del teléfono, por lo que si se puntuara obtendría un resultado alto. Su costo está en la operación real: el teléfono no puede entregar por sí solo la tensión y corriente que exige la sonda industrial ni generar la señal diferencial, de modo que el cable exige igualmente un adaptador y una fuente externa; a eso se suman la compatibilidad del modo host USB entre modelos y fabricantes, y una ergonomía de trabajo peor, con el teléfono cableado al instrumento mientras el operador camina por el campo con guantes. Se conserva como alternativa viable a prototipar, no como arquitectura seleccionada.

![Diagrama de flujo: sonda conectada al celular](img/figura-1-4-sonda-conectada-celular.png)

##### **Figura 1.4 “ Diagrama de Flujo Arquitectura de Sonda conecta a Celular”**

* **Instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete:** La síntesis de las lecciones anteriores: un equipo portátil mínimo que resuelve únicamente lo que el teléfono no puede hacer (proveer la tensión, el protocolo y la medición física del suelo y del aire), y delega en el teléfono la interpretación, la posición geográfica, la pantalla y el almacenamiento mediante un enlace inalámbrico BLE (Bluetooth Low Energy).

  *Evaluación:* El teléfono reúne capacidades que duplicar en el instrumento sería un gasto innecesario, y el enlace inalámbrico preserva la libertad de movimiento durante el recorrido. Asume que el usuario dispone de un smartphone, supuesto razonable dada la penetración de telefonía móvil en zonas rurales. Cumple la totalidad de los requisitos obligatorios y pasa a puntuar.

![Diagrama de flujo: sistema embebido de bajo consumo](img/figura-1-5-sistema-embebido-bajo-consumo.png)

##### **Figura 1.5 “ Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo”**

Para contrastar de un vistazo cómo circulan la información y la energía en las alternativas descartadas, se resumen sus rutas en el siguiente esquema comparativo:

```mermaid
flowchart LR
    subgraph A[Instrumento autonomo]
        A1[Sensores] --> A2[MCU e interpretacion]
        A2 --> A3[Pantalla propia]
    end
    subgraph B[Estacion fija celular]
        B1[Sensores instalados] --> B2[Datalogger y memoria]
        B3[Panel solar y bateria] -->|Energia| B2
        B2 --> B4[Modem y plataforma remota]
    end
    subgraph C[Red LoRaWAN]
        C1[Nodos de medicion] --> C2[Concentrador]
        C2 --> C3[Servidor de red y aplicacion]
    end
```

##### **Figura 1.6 “Rutas de Información y Alimentación de las Alternativas”**

La alternativa cableada merece un esquema propio, porque su descarte no se funda en una imposibilidad física sino en el conjunto de piezas que sigue exigiendo:

```mermaid
flowchart LR
    A[Fuente compatible con la sonda] -->|Energia| B[Sonda RS-485]
    B <-->|Modbus RTU| C[Adaptador USB a RS-485]
    C <-->|USB y controlador compatible| D[Telefono en modo host]
    D --> E[Aplicacion e interpretacion]
```

##### **Figura 1.7 “Alternativa Cableada con Electrónica Intermedia”**

**Matriz de Decisión:** Puntuando sólo a las arquitecturas que superaron el filtro.

| Criterio | Peso | Instrumento autónomo con inferencia embebida y pantalla | Red de nodos LoRaWAN con concentradora en el campo | Instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete |
| :---: | :---: | :---: | :---: | :---: |
| **Cobertura espacial** | 15 % | 8 | 5 | 10 |
| **Calidad de interfaz** | 13 % | 4 | 7 | 10 |
| **Capacidad de interpretación** | 15 % | 6 | 8 | 10 |
| **Autonomía energética** | 14 % | 4 | 8 | 9 |
| **Costo total a 5 años** | 16 % | 6 | 2 | 8 |
| **Robustez mecánica** | 10 % | 6 | 9 | 9 |
| **Actualización del conocimiento** | 9 % | 5 | 8 | 10 |
| **Independencia de infraestructura** | 8 % | 9 | 5 | 7 |
| **Puntaje ponderado final** | **100 %** | **6,04** | **5,64** |  **9,20** |

###### **Tabla 1.4 “Matriz de Decisiones”**

* **Conclusión y Sensibilidad:** La arquitectura de un instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete, gana con margen amplio por su ventaja en cobertura espacial, capacidad de interpretación y facilidad de actualización del software. Tras un análisis de sensibilidad elevando los pesos de distintos criterios, esta arquitectura mantiene su ventaja.

* **Alcance de la matriz:** Esta puntuación ordena preferencias respecto del caso de uso definido en la Tabla 1.3; no constituye una medición de laboratorio. Cada nota es un juicio de ingeniería sobre configuraciones típicas y no debe leerse como que una pantalla reduce la autonomía en un porcentaje universal ni como que una red LoRaWAN exige siempre un nodo por muestra. Por esa razón la matriz se acompaña de una comparación razonada de funciones y compromisos, que es la que soporta realmente la decisión:

| Arquitectura | Fortalezas | Trabajo adicional o limitación para este proyecto | Decisión |
| :---- | :---- | :---- | :---- |
| MCU de 8 bits, pantalla y Bluetooth Classic | Sencillez y bajo costo en instrumentación básica | Menor memoria; perfil serial clásico y compatibilidad móvil a resolver | No priorizada |
| MCU con inferencia y pantalla propia | Lectura autónoma sin depender del teléfono | Interfaz, actualizaciones, estanqueidad de la ventana y carcasa más complejas | Alternativa viable |
| Datalogger fijo con módem celular | Series continuas en el tiempo y acceso remoto | Instalación por zona, cobertura celular y servicio de comunicaciones recurrente | Adecuada para otro uso |
| Nodos LoRaWAN con concentrador | Cobertura simultánea de múltiples puntos fijos | Infraestructura propia y costo por nodo; recorrido de datos hasta la aplicación | Alternativa para monitoreo distribuido |
| Adaptador USB–RS-485 con fuente propia | Menos radio; el teléfono actúa como interfaz | Cableado, compatibilidad USB entre modelos, alimentación externa y ergonomía | Alternativa viable a prototipar |
| **ESP32 portátil, BME280 y BLE** | **Recorrido libre, interfaz móvil y sensores de suelo y ambiente reunidos** | **Gestión del enlace y consumo de la placa de desarrollo** | **Seleccionada** |

###### **Tabla 1.5 “Comparación Razonada de Arquitecturas”**

La preferencia por BLE responde a la libertad de movimiento y a la separación física entre instrumento y teléfono, no a que las alternativas sean imposibles. El equipo portátil ofrece una muestra por recorrido; una red fija puede medir simultáneamente y con mayor frecuencia. Son ventajas distintas, y el proyecto elige la que corresponde al problema que declaró resolver.

```mermaid
flowchart TD
    A[Definir recorrido y decisiones del agricultor] --> B[Comparar arquitecturas completas]
    B --> C{Adquiere suelo y ambiente local}
    C -->|No| D[Agregar interfaces o descartar configuracion]
    C -->|Si| E{Entrega resultado local y permite recorrido}
    E -->|No| F[Clasificar para monitoreo fijo u otro uso]
    E -->|Si| G[Evaluar costo, energia, usabilidad y mantenimiento]
    G --> H[Seleccionar ESP32 con BLE y aplicacion movil]
    H --> I[Definir ensayos y costos del conjunto]
```

##### **Figura 1.8 “Diagrama de Flujo del Proceso de Selección de Arquitectura”**

**Selección de Componentes Base:** Decidida la arquitectura general, la segunda capa de decisiones define con qué componente concreto se construye cada bloque.
Se aplicó la misma disciplina: evaluación de candidatos reales, criterios declarados antes de comparar, y honestidad explícita cuando la alternativa descartada es superior en alguna dimensión. Sobre once subsistemas evaluados, en siete existe una alternativa técnicamente superior en alguna métrica, y el proyecto lo declara en lugar de presentar una selección irreal donde el componente elegido gane en todo.

**Microcontrolador:** Se evaluaron cuatro candidatos: ESP32, nRF52840, STM32WB55 y ATmega328P+HC-05. Este último queda descartado de entrada por el mismo problema de compatibilidad con iOS visto en la evaluación de arquitecturas.

| Microcontrolador | Consumo BLE (Tx) | Wi-Fi / OTA | Núcleos | Puntaje Ponderado | Veredicto |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **STM32WB55** | \~5-6 mA (Bajísimo) | No | 2 | 7,72 | Descartado |
| **nRF52840** | \~5-6 mA (Bajísimo) | No | 1 (ARM Cortex) | 8,10 | Descartado |
| **ESP32-WROOM-32** | **Más alto** | **Sí (Nativo)** | **2** | **8,98** |  **Seleccionado** |

###### **Tabla 1.6 “Comparativa de Microcontroladores”**

* **Justificación de la Selección:** Los chips nRF52840 y STM32WB55 superan claramente al ESP32 en eficiencia de radio, y el proyecto lo reconoce. La elección del ESP32 se sostiene en tres razones prácticas: Wi-Fi integrado para actualizar el firmware por aire sin hardware adicional, una disponibilidad y un ecosistema de bibliotecas y documentación que reducen el riesgo y el plazo de desarrollo, y un costo de placa de desarrollo compatible con la BOM objetivo. Corresponde precisar dos límites de esta justificación. Primero, el doble núcleo es una capacidad útil para separar la pila de radio de la temporización Modbus, pero no es una condición necesaria: una implementación mononúcleo bien programada también puede sostener ambas tareas. Segundo, no se afirma una mejora porcentual de autonomía frente a nRF52840 o STM32WB55, porque una comparación así exigiría medir configuraciones completas de cada plataforma y no se ha realizado. El componente se utiliza en formato de placa de desarrollo, lo que facilita programación y montaje inicial, pero incorpora al balance energético el regulador, el LED de alimentación y el puente USB-UART de esa placa.

**Sonda de Suelo**: Aporta 7 de las 10 magnitudes del sistema, siendo la decisión más crítica y la que concentra el 59,1 % del costo de materiales. Se comparó la Sonda 7-en-1 RS-485 contra instrumentos de grado de investigación (METER TEROS 12, Delta-T WET150, Stevens HydraProbe).

| Sonda | Variables entregadas | Exactitud Pura | Viabilidad Económica | Puntaje Ponderado |
| :---: | :---: | :---: | :---: | :---: |
| **Grado Investigación (TEROS 12, etc.)** | 3 a 4 variables | 10 / 10 | Muy Baja (Costo x20) | 6,46 |
| **Sonda 7-en-1 RS-485** | 7 registros | 7 / 10 | Alta | 8,87 |

###### **Tabla 1.7 “Comparativa de Sondas de Suelo”**

* **Justificación:** Se sacrifica exactitud absoluta a cambio de viabilidad. Obtener las siete variables con sensores de investigación multiplicaría el costo del producto por veinte, lo que contradice el objetivo mismo del proyecto. La limitación técnica más importante se declara explícitamente: la estimación de N, P y K no se mide por electrodo ion-selectivo, sino que se deriva de la conductividad eléctrica. En suelo salino puede leer erróneamente un estado "fértil". Para mitigarlo, la App presenta N, P y K por separado como registros informativos sin validación química, nunca para calcular dosis, independientemente de la conductividad. Ni una CE baja ni una tendencia estable prueban selectividad química de la sonda, y el informe no lo presenta como si lo hicieran.

**Sensor Ambiental:** Compite el Bosch BME280 contra el Sensirion SHT40 y contra el Bosch BMP280.

| Sensor | Exactitud Temperatura | Mide Humedad Relativa | Mide Presión Barométrica | Veredicto |
| :---: | :---: | :---: | :---: | :---: |
| **Sensirion SHT40** | ±0,2 °C | Sí | No | Descartado por función |
| **Bosch BMP280** | ±1,0 °C | No | Sí | Descartado por función |
| **Bosch BME280** | ±1,0 °C | Sí (±3 % HR) | Sí (±1,0 hPa) | **Seleccionado** |

###### **Tabla 1.8 “Comparativa de Sensores de Temperatura / Humedad / Presión Barométrica”**

* **Justificación:** Se elige por una razón funcional, no de desempeño. El BME280 es el único de los tres candidatos que entrega simultáneamente las tres magnitudes que el Grid 2×5 reserva al ambiente local. El SHT40 es más exacto en temperatura pero no mide presión; el BMP280, frecuentemente confundido con el BME280 por su encapsulado casi idéntico, no aporta humedad relativa y por lo tanto **no constituye un reemplazo funcional**. La presión barométrica se utiliza además para corregir el cálculo de evapotranspiración por altitud. Cabe precisar que la temperatura del BME280 se emplea también en la compensación interna del propio sensor, y su correspondencia con el aire exterior depende críticamente de su ubicación física dentro de la carcasa, requisito que se aborda en el diseño mecánico.

Cerrando esta capa de decisiones, la siguiente tabla resume la selección vigente por bloque funcional y el motivo de integración de cada uno:

| Bloque | Selección vigente | Motivo e integración |
| :---- | :---- | :---- |
| Control | ESP32-WROOM-32 en placa de desarrollo | UART para Modbus, I²C ambiental, BLE hacia el teléfono, Wi-Fi para OTA |
| Suelo | Sonda 7-en-1 RS-485 Modbus RTU | Captura multiparamétrica; ficha, tensión y mapa de registros dependen del SKU |
| Ambiente | Módulo Bosch BME280 I²C | Reúne temperatura del aire, humedad relativa y presión local |
| Interfaz diferencial | SP3485 a 3,3 V | Adapta el UART del ESP32 al bus RS-485; requiere terminación y protección |
| Energía | LiPo protegida de 2.000 mAh | Recarga y volumen compatibles con un instrumento portátil de mano |
| Carga y elevación | PCB combinada USB-C carga + boost | Una sola compra de $900; no se suman módulos discretos duplicados |
| Conexión de batería | Conector JST de tres pines con contraparte y cable | Confirmar pinout y función del tercer pin antes de cerrar el esquema |
| Alojamiento | Carcasa PETG impresa en 3D | Acceso de montaje, ventilación del BME280 y reposición por piezas |

###### **Tabla 1.9 “Selección de Componentes e Integración Eléctrica”**

Dos verificaciones quedan expresamente abiertas sobre esta tabla. La línea de sonda se diseña para la variante compatible con la rama prevista de 5 V, pero la interfaz RS-485 no determina por sí sola la tensión de alimentación: debe confirmarse contra la ficha del SKU efectivamente adquirido, incluyendo su comportamiento a batería baja, durante el arranque y durante la transmisión. Por su parte, el BME280 se comunica a 3,3 V por I²C, con GPIO21 como SDA y GPIO22 como SCL en el pinout de trabajo; la dirección 0x76 o 0x77 y la presencia de resistencias de pull-up dependen del módulo comprado.

```mermaid
flowchart LR
    S[Sonda de suelo] <-->|RS-485 y Modbus RTU| R[SP3485]
    R <-->|UART| E[ESP32-WROOM-32]
    B[BME280 local] <-->|I2C| E
    P[LiPo 2000 mAh y placa USB-C] -->|Energia regulada| E
    P -->|Rama de sonda controlada| S
    E <-->|BLE GATT| A[Aplicacion movil]
    A --> M[Motor local por cultivo y etapa]
    A --> L[Historial y cola local]
    A -.->|HTTPS con conexion| C[Supabase]
    W[API gratuita de pronostico] -.->|Proximos cinco dias| A
    C <-->|Gestion y soporte| V[Consola web]
```

##### **Figura 1.9 “Arquitectura Objetivo de TerraSense y Origen de Cada Dato”**

La figura expresa el diseño objetivo completo. El decodificador de la trama, el guardado local y el transporte de las tres variables del BME280 ya existen en el repositorio del proyecto; la adquisición I²C en el firmware y la consulta de cinco días son trabajos de integración identificados más adelante en este mismo capítulo. No debe inferirse del diagrama que exista ya firmware terminado para todos los bloques.

**Arquitectura de Conectividad:**

La estrategia de comunicación del sistema se divide en distintas etapas, cada una diseñada para optimizar los recursos energéticos y superar las barreras del entorno agrícola:

*  **Sonda de Suelo → ESP32 (Bus RS-485 Modbus RTU):** Se eligió esta interfaz frente a alternativas más simples (como UART directo) porque transmite una señal diferencial robusta e inmune al ruido electromagnético en campo abierto. Además, al ser el estándar universal para instrumentación industrial, permite intercambiar sondas de distintos fabricantes en el futuro sin necesidad de rediseñar la placa base del equipo. Conviene separar las dos capas involucradas: RS-485 define la capa eléctrica diferencial, mientras Modbus define la estructura de los mensajes; en su implementación serial RTU se verifican longitud, dirección, función, CRC-16 y temporización entre tramas.
* **Sensor Ambiental BME280 → ESP32 (Bus I2C):** Para la captura de datos atmosféricos (temperatura del aire, humedad relativa y presión barométrica), se utiliza una comunicación serie de dos hilos (I²C). Al estar el sensor integrado para lectura ambiental local, directamente en la placa o a muy corta distancia del microcontrolador, el protocolo I²C es el estándar ideal por su simplicidad técnica y bajo consumo, sin verse afectado por las limitaciones de distancia que sufriría en campo abierto.
* **ESP32 → Smartphone (Bluetooth Low Energy):** Se optó por un enlace BLE puntual debido a su bajo consumo energético. El equipo envía paquetes de datos muy pequeños (tramas de 16 o 20 bytes según la versión del contrato vigente) y se conecta solo durante los segundos que dura la medición. Al utilizar BLE se evita la barrera de certificación MFi que afecta al perfil serial de Bluetooth Classic en iOS, habilitando compatibilidad con Android y Apple sin costos de hardware adicionales. Corresponde precisar que disponer de BLE no constituye por sí solo una prueba de compatibilidad terminada: el enlace requiere una compilación nativa de la aplicación (Expo Go no sustituye un build que incluya la biblioteca BLE) y debe comprobarse con permisos, reconexiones y versiones reales de sistema operativo en ambas plataformas.
* **Smartphone → Nube (HTTPS / Supabase):** El sistema implementa una arquitectura estrictamente *offline-first*. La falta de cobertura en zonas rurales es la principal causa de fallo en agrotecnología, por lo que el motor de interpretación agronómica corre localmente en el teléfono sobre almacenamiento local persistente. La conexión a la nube ocurre de manera diferida y en segundo plano, interviniendo únicamente para sincronizar historiales y respaldar información cuando el teléfono detecta señal de internet. Esta independencia tiene un límite honesto: crear una cuenta, registrar un equipo nuevo o recuperar credenciales sí requieren conexión; lo que no la requiere es medir, diagnosticar y guardar.

Se adjunta un diagrama de flujo para comprender de manera visual la ruta de la información, desde la captura en terreno hasta el almacenamiento diferido en la nube:
**![Diagrama de flujo: arquitectura de conectividad](img/figura-conectividad.png)**

##### **Figura 2.0 “Diagrama de Flujo Arquitectura de Conectividad”**

El ciclo de adquisición merece un detalle adicional, porque de él depende que un fallo de comunicación no se confunda jamás con un resultado agronómico. Una respuesta ausente de la sonda no debe convertirse en "cero humedad" ni en un semáforo rojo atribuido al suelo: debe presentarse como lo que es, un error de lectura. El siguiente diagrama describe el ciclo objetivo con los fallos diferenciados:

```mermaid
flowchart TD
    A[Usuario solicita medicion] --> B[Comprobar equipo y enlace BLE]
    B --> C{Enlace disponible}
    C -->|No| D[Informar error de conexion y permitir reintento]
    C -->|Si| E[Habilitar sonda y esperar estabilizacion]
    E --> F[Consultar Modbus y adquirir BME280]
    F --> G{Respuesta de suelo valida}
    G -->|No| H[Identificar fallo y apagar rama de medicion]
    G -->|Si| I{Tres datos ambientales validos}
    I -->|No| J[Marcar captura ambiental incompleta]
    I -->|Si| K[Asociar suelo y ambiente a una captura]
    J --> L[Transmitir datos y estados por contrato versionado]
    K --> L
    L --> M[Validar version, escalas y rangos en la app]
    M --> N[Interpretar y conservar lectura]
    N --> O[Finalizar captura y reducir consumo]
```

##### **Figura 2.1 “Ciclo de Adquisición y Transmisión con Fallos Diferenciados”**

<a id="analisis-economico"></a>

**Frontera Offline / Online del Sistema:**

Afirmar genéricamente que el sistema “funciona offline” no es verificable. La tabla siguiente es la definición operativa de esa frontera, función por función, con la columna de estado que distingue lo implementado de lo comprometido.

> **Fuente de verdad:** el motor agronómico y sus umbrales están en `App/src/engine/agronomyEngine.ts`, `stageEvaluator.ts` y `contextualAdvice.ts`; la cola local y la sincronización diferida, en `App/src/services/measurementsService.ts`; la degradación del pronóstico sin red, en `App/src/services/weatherService.ts`; los perímetros de acceso, en `supabase/migrations/*.sql`.

| Función del sistema | Conectividad requerida | Comportamiento sin cobertura | Estado |
| :---- | :---: | :---- | :---: |
| Emparejamiento y lectura BLE del instrumento | Ninguna | Funciona íntegramente; el enlace es punto a punto entre equipo y teléfono | Implementado |
| Validación de la trama y marcado de lecturas ausentes | Ninguna | Una variable no recibida se almacena como ausente, nunca se estima | Implementado |
| Motor agronómico: diagnóstico y recomendación de labor | Ninguna | Las reglas y umbrales residen en el código de la aplicación, no en un servidor | Implementado |
| Georreferenciación de la medición | Ninguna | Funciona con el GPS satelital del teléfono, que no requiere datos móviles | Implementado |
| Guardado local y consulta del histórico ya almacenado | Ninguna | Funciona sobre el almacenamiento persistente del teléfono | Implementado |
| Exportación del histórico local a archivo | Ninguna por diseño | El archivo se generaría en el propio teléfono, sin consultar ningún servidor | **Comprometida, no implementada** |
| Creación de cuenta, inicio de sesión y recuperación de credenciales | Requiere internet | No disponible; la sesión ya iniciada permanece válida y permite seguir midiendo | Implementado |
| Registro de un equipo nuevo en la cuenta | Requiere internet | No disponible; se completa al recuperar cobertura | Implementado |
| Sincronización y respaldo del histórico hacia la nube | Requiere internet | Las mediciones se encolan localmente y se envían al recuperar señal; no se pierde ninguna | Implementado |
| Consola web de flota para asesores y cooperativas | Requiere internet | No disponible; es una herramienta de escritorio, no de terreno | Implementado |
| Pronóstico meteorológico a cinco días | Requiere internet | La aplicación indica expresamente que el pronóstico no está disponible y no lo sustituye por un valor estimado | Implementado |

###### **Tabla 5.0 “Frontera Offline / Online del Sistema”**

La regla que resume la tabla define el diseño completo: medir, diagnosticar, georreferenciar y guardar no dependen jamás de la cobertura; administrar la cuenta, respaldar y contextualizar con el clima previsto sí, y son funciones que el agricultor ejecuta antes o después de la jornada, no durante.

Una sola fila no está implementada: la exportación del histórico a archivo. Se declara con su estado real porque el principio de soberanía del dato la compromete y porque la matriz normativa la utiliza como uno de los mecanismos con que se atiende el derecho del titular bajo la Ley N° 21.719. Su diseño no depende de la red, de modo que su columna de conectividad dice “ninguna por diseño”, pero mientras no exista no se cuenta entre las funciones disponibles. Queda registrada como pendiente en el [plan de validación](PLAN_VALIDACION.md).

**Análisis de Viabilidad Económica:**

El siguiente análisis detalla el dimensionamiento del mercado, la estructura de costos, la estrategia de precios, el plan operativo y las proyecciones financieras del proyecto TerraSense, dando respuesta a los objetivos específicos de evaluar la viabilidad económica y de dimensionar el mercado y la capacidad productiva.

El estudio vincula explícitamente las decisiones técnicas con la operación de una empresa. Cada instrumento necesita sonda, sensor ambiental, electrónica, carcasa, montaje, pruebas, embalaje y entrega; a ello se agregan adquisición de clientes, personal, contabilidad, soporte y servicios digitales. Un margen calculado solo como precio menos sonda no permitiría financiar estas actividades ni explicar la caja necesaria para iniciar la operación.

Las convenciones del modelo son las siguientes: la moneda es CLP nominal, el primer año operativo es **2027**, se aplica un reajuste general del **3 % anual**, el precio inicial es de **$449.337 con IVA** y el horizonte económico de evaluación es de **diez años** con flujos calculados mes a mes. La fuente editable de costos y operación reside en un archivo de supuestos único (`finanzas/supuestos.json`), desde el cual se regeneran todas las tablas de este capítulo, el flujo de caja en Excel y la BOM. Esto significa que un cambio en el precio del sensor ambiental, en la carcasa o en el precio de venta se propaga automáticamente a inventario, caja e indicadores, sin posibilidad de que dos secciones del informe se contradigan entre sí.

**Las Tres Economías del Análisis:**

Antes de la primera cifra conviene fijar una separación que este informe mantiene en todo su desarrollo, porque mezclarlas es el error que vuelve incomparable cualquier evaluación de este tipo.

| Economía | Qué mide | Con qué se evalúa | Dónde se desarrolla |
| :---- | :---- | :---- | :---- |
| Economía del proyecto | La inversión de desarrollo y puesta en marcha frente a los flujos que genera la actividad, antes de decidir cómo se financia | VAN, TIR y payback sobre el flujo de fondos anual | Metodología de VAN, TIR y payback, y Tabla 3.0 |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados | Tablas 2.2 a 2.5 y 2.8 |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | TCO comparado a 1, 3, 5 y 10 años | Tabla 5.1 |

###### **Tabla 5.1 “Separación de las Tres Economías del Análisis”**

La consecuencia práctica de esta separación es una sola y se aplica sin excepción: **el ahorro del agricultor no es ingreso del proyecto**. Los pesos que un cliente deja de gastar en laboratorio o asesoría no aparecen en ninguna línea del flujo de caja de la empresa —no existe ninguna clave en `finanzas/supuestos.json` que los recoja, ni podría existir— y se presentan únicamente como argumento de adopción. Del mismo modo, el margen de la empresa no mide la rentabilidad del proyecto, que se calcula antes de financiamiento y sobre la inversión total.

**Costo Total de Propiedad para el Agricultor (TCO):**

La comparación depende críticamente de una variable que no puede darse por supuesta: con qué frecuencia el agricultor recurre hoy al laboratorio o a la asesoría. Presentar una sola frecuencia construiría el argumento sobre un supuesto cómodo, de modo que el cuadro se desarrolla sobre dos intensidades declaradas: **uso habitual** (4 muestras y 2 visitas al año), que es el caso base y corresponde razonablemente a un productor de 0,5 a 20 ha con orientación comercial, y **uso intensivo** (20 muestras y 12 visitas al año), que marca el techo del beneficio posible.

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
| :---- | :---: | ---: | ---: | ---: | ---: |
| **TerraSense** (equipo, kit de batería en años 3 y 8, segundo equipo en año 6, a precio de lista) | Mediciones ilimitadas | $449.337 | $374.980 | $374.980 | $749.960 |
| Análisis de laboratorio (S1) | 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |

###### **Tabla 5.2 “Costo Total de Propiedad del Agricultor a 1, 3, 5 y 10 Años”**

> **Nota de mantenimiento:** esta tabla **no** la genera `finanzas/modelo.py` y por eso no está dentro de marcadores `<!-- INFORME:*:INICIO/FIN -->`. El precio de $449.337 y el precio del kit de batería de $24.990 sí provienen de `finanzas/supuestos.json` y de la política de repuestos descrita en [`docs/MODELO_ECONOMICO.md`](MODELO_ECONOMICO.md); si cambian allí, esta tabla se actualiza a mano. Los valores S1 y S2 son supuestos declarados y no parámetros del modelo.

Todas las partidas de la fila de TerraSense son desembolsos del agricultor a precio de lista: el proyecto no bonifica repuestos ni entrega equipos de reposición, y ninguna constituye un costo absorbido por la empresa. La vida útil del instrumento se fija en cinco años, de modo que el corte a diez incorpora la compra íntegra de un segundo equipo en el año 6, sin descuento de renovación: esa segunda compra es una venta más y no una concesión.

**Lectura del resultado.** Bajo la intensidad habitual el instrumento **no se paga el primer año**: $449.337 contra $200.000 de laboratorio o $120.000 de asesoría. El cruce ocurre durante el segundo año frente al laboratorio y durante el tercero frente a la asesoría, y a diez años la ventaja es de 2,7 y 1,6 veces respectivamente. Bajo uso intensivo llega a más de trece y casi diez veces. Declarar el caso base en la intensidad menor es deliberado: es el que resiste la pregunta directa y el que muestra dónde está realmente el argumento, que **no es el ahorro nominal sino el costo marginal cero de la medición repetida**. A cien mediciones anuales, cada lectura cuesta $750 frente a los $50.000 de una muestra de laboratorio, relación que no depende de ningún supuesto de frecuencia porque el instrumento se paga una vez y cada lectura adicional no cuesta nada.

**Supuestos de Mercado Declarados:**

Dos cifras que sostienen la comparación anterior no provienen de una fuente bibliográfica publicable, sino de consultas de mercado del equipo. Incluirlas en la lista de referencias induciría a error sobre su naturaleza, de modo que se declaran aparte:

| Id. | Supuesto | Valor adoptado | Cómo se obtuvo | Qué falta para confirmarlo |
| :---: | :---- | ---: | :---- | :---- |
| S1 | Análisis de suelo en laboratorio acreditado en Chile | $50.000 por muestra | Consulta de tarifarios de laboratorios de suelos universitarios y comerciales, sin fuente única | Cotización formal y fechada del laboratorio que se adopte en la campaña de validación |
| S2 | Visita de asesoría agronómica externa en Chile | $60.000 por visita | Consulta de tarifarios de consultores agronómicos independientes, sin fuente única | Cotización formal y fechada de al menos dos consultores de la zona de operación |

###### **Tabla 5.3 “Supuestos de Mercado Declarados”**

Ambos valores se utilizan exclusivamente como término de comparación en la economía del cliente y no intervienen en ninguna línea del flujo de caja, de modo que una desviación en ellos altera el argumento de adopción pero no el VAN, la TIR ni la caja de la empresa.

**Dimensionamiento del Mercado:**

Antes de proyectar una sola unidad vendida es necesario acotar el universo sobre el cual se proyecta. El dimensionamiento se construyó sobre fuente censal oficial: el Censo Agropecuario y Forestal 2021 del INE, que informa 138.628 unidades productivas agropecuarias y 36.928 unidades de autoconsumo.

| Nivel | Definición y filtros aplicados | Universo | Uso dentro del estudio |
| :---: | :---- | :---: | :---- |
| **Mercado Total (universo de contexto)** | Unidades productivas censadas (138.628 UPA \+ 36.928 UAC) | 175.556 u | Dimensionar el sector; **no convierte cada unidad en una venta** |
| **Mercado Accesible (servible)** | Agricultores y asesores con orientación comercial, smartphone y acceso al canal | A cuantificar por cultivo, región y canal | Acotar el mercado direccionable con cruces explícitos, no por atribución directa al censo |
| **Mercado Objetivo (meta 5 años)** | Equipos que el plan comercial propone vender en cinco años | 2.550 u | Meta derivada del presupuesto de ventas y de la capacidad productiva |

###### **Tabla 2.0 “Dimensionamiento del Mercado”**

Esta tabla incorpora una corrección metodológica importante respecto de versiones anteriores del estudio. El total censal describe el sector, pero **no equivale a clientes con intención de compra**, y por lo tanto no respalda por sí solo una cifra de mercado servible expresada en pesos. El segmento inicial se orienta al pequeño y mediano agricultor comercial, aproximadamente de 0,5 a 20 hectáreas, además de los asesores que utilizan el instrumento en más de un campo. La existencia de smartphone importa para la adopción, pero la cobertura permanente de internet no es un requisito para cada lectura local, precisamente por el diseño *offline-first*. El Mercado Objetivo, en consecuencia, se presenta como lo que es: una meta de ventas sostenida por un presupuesto comercial, no una fracción de una cifra censal.

**Plan de Ventas y Motor de Crecimiento:**

Toda esta evaluación económica se ha construido sobre un escenario base conservador respecto a la proyección de ventas anuales. La estimación es el supuesto más frágil de cualquier modelo, por lo que el escenario inicial contempla apenas 200 unidades el primer año, equivalentes a 17 unidades mensuales. Proyectar una colocación masiva para una marca nueva destruiría la credibilidad del estudio.

Cada salto de volumen responde a una causa presupuestada y a una inversión asociada. El crecimiento no es una extrapolación matemática, sino la consecuencia de acciones comerciales financiadas dentro del flujo, con la pauta publicitaria calculada a razón de **$30.000 por venta objetivo**:

* **Año 1 (200 unidades):** Sin agencia. Los socios gestionan directamente anuncios y demostraciones para documentar los primeros casos de éxito.
* **Año 2 (350 unidades):** Se incorpora el primer ensamblador y se activa el canal de asesores agronómicos.
* **Año 3 (500 unidades):** Se suma soporte dedicado y se consolida la base instalada.
* **Año 4 (650 unidades):** Se incorpora gestión de agencia y la primera postulación a compras institucionales.
* **Año 5 (850 unidades):** Cobertura multirregional apalancada por la base instalada y las recomendaciones.

<!-- INFORME:VENTAS:INICIO -->

| Año | Equipos | Personas | Sueldo socio | Oficina | Publicidad digital |
|---|---|---|---|---|---|
| 2027 | 200 | 3 | $600.000 | no | $6.000.000 |
| 2028 | 350 | 4 | $700.000 | sí | $10.815.000 |
| 2029 | 500 | 5 | $850.000 | sí | $15.913.500 |
| 2030 | 650 | 6 | $1.000.000 | sí | $21.308.176 |
| 2031 | 850 | 6 | $1.200.000 | sí | $28.700.475 |
| 2032 | 892 | 7 | $1.236.000 | sí | $31.022.174 |
| 2033 | 937 | 7 | $1.273.080 | sí | $33.564.810 |
| 2034 | 984 | 7 | $1.311.272 | sí | $36.305.877 |
| 2035 | 1033 | 8 | $1.350.611 | sí | $39.257.205 |
| 2036 | 1085 | 8 | $1.391.129 | sí | $42.470.367 |

###### **Tabla 2.1 “Plan de Ventas y Dotación”**

La dotación crece de forma escalonada: el primer año operan los dos socios y un contador, sin oficina. La oficina entra el segundo año y la encargada de marketing el tercero. El plan suma **7481 equipos** en los diez años.

<!-- INFORME:VENTAS:FIN -->

La estrategia base utiliza venta directa, pauta digital, demostraciones y atención comercial de los socios; la distribución mayorista, el crédito a clientes y los convenios institucionales se consideran expansiones posibles, pero **no se contabilizan como ventas comprometidas** ni con el mismo margen de la venta directa.

Una advertencia de gestión que el modelo hace explícita: la pauta se calcula sobre la venta *objetivo* y no se reduce automáticamente cuando una campaña vende menos. El gasto puede ocurrir antes de saber cuántas ventas producirá, lo que convierte al seguimiento comercial (contactos, conversión, devolución, costo de adquisición y tiempo de soporte) en una función crítica y no accesoria. Las ventas mensuales, además, se distribuyen con pesos estacionales explícitos en lugar de asumir que los doce meses del año reciben el mismo ingreso.

**Estructura de Costos y Producción:**

El costo de capital de cada unidad se optimiza para mantener el equilibrio entre accesibilidad comercial y precisión técnica. El instrumento de medición (Sonda 7-en-1 RS-485) representa la variable crítica: **$48.000, equivalente al 59,1 % del costo de materiales**, lo que justifica la decisión de no sacrificar la lectura de variables clave del suelo a expensas de abaratar componentes.

<!-- INFORME:BOM:INICIO -->

| Material o servicio por equipo | Cant. | Neto unitario | Subtotal | Origen del precio |
|---|---|---|---|---|
| Sonda de suelo 7-en-1 RS-485 Modbus RTU | 1 | $48.000 | $48.000 | AliExpress; presupuesto conservador, el mercado va de $12.100 a $82.100 |
| Carcasa PETG impresa en taller propio | 1 | $6.900 | $6.900 | costeo propio, ver cuadro siguiente |
| ESP32 DevKit WROOM-32D | 1 | $4.800 | $4.800 | AliExpress Choice $3.506-$6.600; en Chile $8.148 c/IVA |
| Bateria LiPo 3,7 V 2.000 mAh con proteccion | 1 | $4.400 | $4.400 | AliExpress: $4.784 unitaria, $4.350/u en pack de 10 |
| PCB portadora 2 capas, fabricacion y envio | 1 | $2.000 | $2.000 | JLCPCB, estimacion propia a volumen de 200 u |
| Modulo ambiental BME280 (I2C) | 1 | $1.050 | $1.050 | AliExpress Choice $990-$1.064 |
| Modulo de carga y elevacion LX-LCBST (Modulos:Modulo_LX-LCBST) | 1 | $900 | $900 | AliExpress: equivalentes de carga+boost $703-$900 |
| Modulo transceptor SP3485 RS-485 3,3 V | 1 | $900 | $900 | AliExpress: modulo $1.555; IC suelto $285/u en pack de 10 |
| Terminal block 2 pines, paso 5 mm | 2 | $95 | $190 | LCSC, carrito pendiente |
| Terminal block 4 pines, paso 5 mm (TerminalBlock_MetzConnect Type055) | 1 | $190 | $190 | LCSC, carrito pendiente |
| Condensador electrolitico 100 uF 35 V (CP_Elec 6,3x7,7) | 2 | $29 | $58 | LCSC, carrito pendiente |
| Condensador ceramico 100 nF 50 V (1206) | 4 | $4 | $16 | LCSC, carrito pendiente |
| Resistencia 100 kOhm (1206) | 2 | $2 | $4 | LCSC, carrito pendiente |
| Resistencia 330 Ohm (1206) | 3 | $2 | $6 | LCSC, carrito pendiente |
| Resistencia 10 kOhm (1206) | 1 | $2 | $2 | LCSC, carrito pendiente |
| LED 0603 azul, rojo y verde | 3 | $8 | $24 | LCSC, carrito pendiente |
| Pulsador SMD 4 mm (XKB TS-1187A) | 1 | $19 | $19 | LCSC, carrito pendiente |
| Fusible 0603 | 1 | $19 | $19 | LCSC, carrito pendiente |
| Diodo 1N4007 / M7 (SMA DO-214AC) | 1 | $4 | $4 | LCSC C95872, verificado en US$0,0042 |
| Flete de discretos LCSC, prorrateado por equipo | 1 | $150 | $150 | LCSC cobra envio; prorrateado a 200 u |
| **Total BOM neto** |  |  | **$69.632** |  |

###### **Tabla 2.2 “Estructura de Costos de Fabricación (BOM)”**

La BOM contiene **exclusivamente** los componentes presentes en el esquemático. NO estan en la BOM porque todavia no figuran en el esquematico ni en el diseno mecanico cerrado: prensaestopas M12, o-ring y respiradero del BME280, cableado y conectores internos, y embalaje con manual y etiqueta. Se incorporaran cuando el diseno mecanico se cierre; su orden de magnitud conjunto es de $4.000 a $5.000 por equipo y elevaria la BOM en torno a un 6 %.

| Concepto | Neto CLP |
|---|---|
| Materiales y servicios de la BOM | $69.632 |
| Merma de fabricación, 3 % de la BOM | $2.089 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $3.482 |
| Envío al cliente | $6.000 |
| **Costo variable por equipo, sin comisión** | **$81.203** |

###### **Tabla 2.3 “Costo Variable por Equipo”**

<!-- INFORME:BOM:FIN -->

Cuatro decisiones metodológicas sostienen estos números y conviene declararlas, porque son exactamente los puntos donde un modelo económico suele engañarse a sí mismo:

* **La mano de obra de ensamblaje final no se cuenta dos veces.** Está incorporada en la nómina de la empresa, dentro de los gastos fijos. Añadirla además como un costo variable por unidad duplicaría el costo del trabajo. El montaje SMD externo que sí aparece en la BOM es un servicio distinto, realizado por un proveedor.
* **La impresión 3D externa tiene una frontera de costo definida.** Los $6.000 netos del proveedor ya incluyen material, energía, uso de máquina y acabado; no se vuelve a sumar filamento ni electricidad, ni se incorpora una impresora como activo mientras se mantenga esta modalidad. Si en el futuro se decidiera producir internamente, deberían recalcularse activo, depreciación, material, horas y tasa de rechazo.
* **No se supone un descuento automático por volumen.** Las compras se reajustan por inflación y el inventario conserva su costo promedio ponderado, sin aplicar ninguna reducción automática del costo de componentes por escala. Si se consiguen precios por volumen deberán incorporarse como una modificación explícita del modelo; hasta entonces, esa mejora no se utiliza para justificar rentabilidad.
* **Los precios brutos y netos no se mezclan.** El BME280 tiene un precio de $3.500 finales con IVA, equivalentes a $2.941,18 netos bajo IVA del 19 %; la placa combinada de carga y elevación mantiene $900 como costo completo sin crédito fiscal hasta disponer de factura. Los subtotales se calculan antes de redondear, por lo que la suma visual de las filas puede diferir en un peso.

La decisión de fabricar el gabinete mediante impresión 3D FDM, en lugar de inyección en molde, sigue siendo económicamente determinante: elimina el costo de utillaje, que ascendería a millones de pesos y solo se amortizaría vendiendo miles de unidades. Además permite modificar geometría, soportes y acceso a conectores durante el desarrollo sin comprometer un molde por cada cambio.

**Estrategia de Precios y Posicionamiento Competitivo:**

El precio de venta al público se ha fijado en **$449.337 CLP con IVA ($377.594 neto)**. Esta cifra no se calcula mediante un margen de adición estándar sobre el costo, sino que actúa como un techo estratégico declarado: es el máximo que el proyecto se permite cobrar para sostener su ventaja frente a la instrumentación importada, que parte en torno a US$294 por un medidor de tres o cuatro parámetros sin interpretación agronómica.

La consecuencia metodológica de este enfoque es fundamental: al estar el precio predefinido, la variable que el modelo debe resolver no es cuánto cobrar, sino cuántas unidades se deben vender para cubrir la estructura de costos completa. El precio se evalúa entonces por el margen que deja para sostener gastos fijos, soporte y capital de trabajo. El análisis de sensibilidad que se presenta más adelante demuestra por qué este techo no admite rebajas: a $299.990 el proyecto pasa a pérdida operacional en el primer año.

**Capacidad Productiva, Gastos Fijos y Punto de Equilibrio:**

La estructura de personal relaciona ventas con trabajo real, y no con una dotación fijada arbitrariamente. Se consideran 2,25 horas por equipo para ensamblaje y prueba final, 500 horas anuales combinadas aportadas por los socios a producción y 1.400 horas productivas anuales por cada equivalente de jornada completa contratado. Las funciones comercial y de soporte utilizan dos horas por venta más media hora anual por equipo activo, con 900 horas combinadas de los socios. La contratación aumenta en escalones de 0,5 personas.

La dotación se expresa en **personas contratadas**, no en equivalentes de jornada: el modelo cuenta cargos reales con su sueldo bruto y sus cotizaciones. Los tiempos incluyen una asignación de trabajo que debe comprobarse con el montaje completo, incluido el BME280: la lectura del sensor agrega poco material, pero el control de su ubicación, comunicación y respuesta térmica sí debe formar parte del procedimiento de calidad.

Para garantizar el realismo de la evaluación, los gastos fijos asumen una formalización inmediata. Los socios perciben remuneración bruta presupuestada por su trabajo desde el mes 1, con escalones base de $600.000, $700.000, $850.000, $1.000.000 y $1.200.000 mensuales por persona, más reajuste; el 35 % adicional es una reserva de sobrecosto laboral y no una tasa legal única ni un sueldo líquido. Se incorpora contabilidad externa desde el primer mes, junto con taller, administración y seguros. Evaluar este proyecto asumiendo un "costo cero" para el trabajo de los socios sería un autoengaño; por ello se integran como gasto fijo real.

<!-- INFORME:FIJOS:INICIO -->

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Nómina y cargas | $32.606.640 | $47.079.721 | $68.745.793 | $86.764.684 | $94.902.837 | $110.985.034 | $114.761.092 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.800.000 | $5.562.000 | $5.728.860 | $5.900.726 | $6.077.748 | $6.260.080 | $6.447.882 | $6.641.319 | $6.840.558 | $7.045.775 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| Otros de estructura | $1.870.000 | $1.926.100 | $1.983.883 | $2.043.399 | $2.104.701 | $2.167.843 | $2.232.878 | $2.299.864 | $2.368.860 | $2.439.926 |
| **Total gastos de estructura** | $51.276.640 | $95.046.821 | $124.835.576 | $151.421.341 | $168.252.246 | $190.082.304 | $197.843.250 | $205.512.670 | $229.494.969 | $238.415.264 |

###### **Tabla 2.4 “Estructura de Gastos de Operación, Administración y Comercialización”**

El costo laboral sobre el sueldo bruto no es un recargo fijo: sigue el calendario de la Ley N° 21.735, y pasa de **23,5 % en 2027 a 28,5 % en 2036**, más cesantía, mutualidad y las provisiones de vacaciones e indemnización.

<!-- INFORME:FIJOS:FIN -->

En el primer año, los $32.160.000 de gastos fijos se cubren con 176 unidades al margen calculado, de modo que la meta de 200 unidades deja un margen de seguridad del 12 % sobre el equilibrio operativo. Al añadir capital e intereses del crédito, sin embargo, el umbral sube a 204 unidades: **la meta del Año 1 cubre la operación pero queda cuatro unidades por debajo del equilibrio con deuda**. Esta diferencia no es un defecto oculto del modelo sino su hallazgo más útil, porque explica exactamente por qué el proyecto necesita liquidez inicial durante el arranque y por qué una venta no equivale a caja libre inmediatamente distribuible.

El equilibrio operativo se calcula como gastos fijos divididos por el margen unitario, redondeado hacia arriba; el equilibrio con deuda añade capital e intereses al numerador. Este segundo umbral no incluye por sí solo el impuesto ni la acumulación de inventario, por lo que complementa —pero no sustituye— el flujo de fondos anual y la caja acumulada.

**Inversión Inicial y Estructura de Financiamiento:**

La puesta en marcha se estructura sobre fuentes de financiamiento por **$29.725.912 CLP**: un pie propio de los socios de **$9.000.000** ($4.500.000 cada uno, 50 % y 50 %) y un crédito bancario de **$30.000.000**. El pie equivale al **30 % del crédito** y es el capital propio que el banco exige antes de desembolsar el suyo; se registra una sola vez como aporte de los socios, no se descuenta del principal y no se devuelve al banco.

<!-- INFORME:INVERSION:INICIO -->

| Destino | CLP | Participación |
|---|---|---|
| Equipamiento y activo fijo | $9.000.000 | 30,3 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,5 % |
| Capital de trabajo (3,0 meses) | $12.819.160 | 43,1 % |
| Inventario inicial | $2.706.752 | 9,1 % |
| **Inversión inicial total** | **$29.725.912** | **100,0 %** |

###### **Tabla 2.5 “Inversión Inicial”**

**El pie no es una fuente adicional de fondos.** Los socios entregan al banco un pie del 30 % del monto solicitado como condición de entrada, y es el crédito el que financia el 100 % de la inversión: **$29.725.912** de crédito y **$8.917.774** de pie ($4.458.887 por socio), con cuota mensual de $416.006 por el sistema francés.

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |
|---|---|---|---|---|---|
| 2027 | $29.725.912 | $1.693.906 | $3.298.163 | $4.992.069 | $28.032.006 |
| 2028 | $28.032.006 | $1.897.175 | $3.094.894 | $4.992.069 | $26.134.831 |
| 2029 | $26.134.831 | $2.124.836 | $2.867.233 | $4.992.069 | $24.009.995 |
| 2030 | $24.009.995 | $2.379.816 | $2.612.253 | $4.992.069 | $21.630.178 |
| 2031 | $21.630.178 | $2.665.394 | $2.326.675 | $4.992.069 | $18.964.784 |
| 2032 | $18.964.784 | $2.985.242 | $2.006.827 | $4.992.069 | $15.979.543 |
| 2033 | $15.979.543 | $3.343.471 | $1.648.598 | $4.992.069 | $12.636.072 |
| 2034 | $12.636.072 | $3.744.687 | $1.247.382 | $4.992.069 | $8.891.385 |
| 2035 | $8.891.385 | $4.194.049 | $798.019 | $4.992.069 | $4.697.335 |
| 2036 | $4.697.335 | $4.697.335 | $294.733 | $4.992.069 | $0 |

###### **Tabla 2.6 “Amortización del Crédito”**

<!-- INFORME:INVERSION:FIN -->

Conviene precisar una distinción decisiva en evaluaciones de este tipo: **los $29.725.912 son fuentes de financiamiento, no inversión económica consumida**. El desembolso efectivo de apertura es de **$11.317.378**; el resto permanece en caja como capital de trabajo y reserva. Para el cálculo de VAN y TIR, el capital comprometido en el mes 0 es de **$20.489.116**, compuesto por ese desembolso más la caja mínima operativa que la actividad requiere con independencia de cómo se financie.

El tamaño de la estructura responde a un factor logístico y financiero concreto: el proyecto requiere liquidez para sostener el desfase entre compras, gastos y cobros durante el arranque. Con el crédito fijado en $30.000.000, la caja no baja de $13.521.745 en los primeros 24 meses; la reserva objetivo —tres meses de gastos fijos y tres cuotas más un 10 % del desembolso inicial— queda $615.379 corta en su punto más bajo (mes 19), diferencia que se informa en lugar de corregirse ampliando el préstamo. Esa reserva está *dentro* de la caja y no se descuenta como un gasto adicional ni se suma dos veces al total. La política de inventario cubre dos meses de ventas, supuesto que debe ajustarse según el plazo real de entrega del proveedor de sondas.

La elección del plazo del crédito, comparada en la tercera tabla del bloque anterior sobre el mismo principal y la misma tasa, no es indiferente.

El plazo de cinco años sería preferible por costo financiero total ($9.484.253 de intereses contra $20.380.983 a diez años), pero su cuota de $658.071 deja la caja de arranque en $8.995.388 y la reserva objetivo $5.856.425 bajo su nivel: el proyecto quedaría sin colchón para el arranque. Quince años alivia aún más la cuota, pero incrementa los intereses en más de $12 millones adicionales y prolonga la exposición cinco años más allá del estudio. Diez años equilibra ambos efectos con el menor costo financiero tolerable. Se declara expresamente que **el crédito no desaparece al terminar el quinto año**: en ese corte quedan $19.139.649 de saldo pendiente, cifra que se muestra en su propia tabla. La evaluación principal a diez años sí cubre el crédito completo, que se cancela en el mes 120, mientras que el modelo extendido en Excel amortiza la alternativa hasta el año 15.

La tasa se convierte a período mensual mediante la expresión `r_m = (1 + 0,12)^(1/12) − 1 = 0,9489 %`, y no dividiendo simplemente por doce, porque está definida como efectiva anual. Sobre esa base, la cuota fija es de $419.842 durante 120 meses y el total pagado al banco asciende a $50.380.983. Con cuotas constantes, cada pago se separa en intereses y amortización: la cuota no es un gasto operativo completo, ya que el capital reduce la deuda mientras los intereses tienen tratamiento de financiamiento y tributario propio.

**Inventario, Impuestos y Construcción del Flujo de Caja:**

Las ventas se cobran en el mes de entrega. Las compras cubren las ventas del mes y de los dos siguientes, redondeadas a lotes de diez unidades, y el inventario inicial cubre los dos primeros meses. El modelo concilia unidades y valor mediante promedio ponderado. La consecuencia es que la compra consume caja antes de que todo el lote se venda, mientras el costo de venta solo reconoce las unidades entregadas: esta diferencia es la razón por la cual la utilidad del ejercicio y la caja no coinciden, y por la cual una utilidad contable no puede presentarse como efectivo disponible.

El IVA se trata separado del ingreso neto. El stock comprado en el mes 0 genera crédito disponible desde el mes 1, excluyendo la placa combinada cuyo costo se toma sin recuperación fiscal por no disponer aún de factura; el IVA inicial recuperable no se deduce además como gasto de renta. Se mantiene una aproximación tributaria de caja con pérdidas arrastradas y reserva anual, utilizando las tasas de referencia del régimen Pro Pyme: **12,5 % para 2027, 15 % para 2028 y 25 % desde 2029**, sujetas al régimen y condiciones vigentes. El calendario del estudio no reproduce el formulario F29, los pagos provisionales mensuales ni la declaración de abril; esa limitación metodológica se declara en lugar de disimularse.

```mermaid
flowchart TD
    A[BOM, dotacion, estructura y plan de ventas] --> B[Costo total del horizonte]
    B --> C[Precio derivado con el margen exigido]
    C --> D[Estado de resultados proyectado]
    A --> E[Inversion inicial: activo fijo, nominal y capital de trabajo]
    E --> F[Credito que financia el 100 por ciento y tabla de amortizacion]
    F --> D
    D --> G[Flujo de fondos anual]
    G --> H[VAN, TIR y payback]
    G --> I[Caja acumulada y piso de seguridad]
    I --> J[Dimensionar capital de trabajo por iteracion]
    J --> E
```

##### **Figura 2.2 “Construcción de Flujos e Indicadores desde los Supuestos de Operación”**

**Proyección de Resultados y Evaluación Financiera:**

<!-- INFORME:FLUJOS:INICIO -->

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $75.518.744 | $136.122.536 | $200.294.589 | $268.194.455 | $361.237.300 | $390.459.273 | $422.462.050 | $456.962.366 | $494.109.134 | $534.551.465 |
| (-) Costos operacionales | $20.733.877 | $37.372.814 | $54.991.426 | $73.633.519 | $99.178.687 | $107.201.659 | $115.988.109 | $125.460.265 | $135.659.011 | $146.762.563 |
| (-) Gastos de estructura | $51.276.640 | $95.046.821 | $124.835.576 | $151.421.341 | $168.252.246 | $190.082.304 | $197.843.250 | $205.512.670 | $229.494.969 | $238.415.264 |
| (-) Depreciación y amortización | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.149.294 | $2.213.773 | $2.280.186 | $2.348.592 |
| (-) Intereses | $3.298.163 | $3.094.894 | $2.867.233 | $2.612.253 | $2.326.675 | $2.006.827 | $1.648.598 | $1.247.382 | $798.019 | $294.733 |
| (-) Impuesto a la renta | $0 | $0 | $2.474.606 | $9.421.836 | $22.159.923 | $22.270.447 | $26.208.200 | $30.632.069 | $31.469.237 | $36.682.578 |
| **(=) Utilidad del ejercicio** | $-2.629.936 | $-2.231.993 | $12.285.748 | $28.265.507 | $66.479.770 | $66.811.342 | $78.624.599 | $91.896.208 | $94.407.712 | $110.047.734 |
| (+) Depreciación y amortización | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.149.294 | $2.213.773 | $2.280.186 | $2.348.592 |
| (-) Cuota de capital | $1.693.906 | $1.897.175 | $2.124.836 | $2.379.816 | $2.665.394 | $2.985.242 | $3.343.471 | $3.744.687 | $4.194.049 | $4.697.335 |
| **(=) Flujo de fondos** | $-1.483.842 | $-1.289.168 | $13.000.912 | $28.725.690 | $66.654.376 | $65.912.794 | $77.430.423 | $90.365.294 | $92.493.848 | $107.698.991 |
| Caja acumulada | $11.335.318 | $10.046.151 | $23.047.062 | $51.772.752 | $118.427.128 | $184.339.922 | $261.770.345 | $352.135.639 | $444.629.487 | $552.328.478 |

###### **Tabla 2.7 “Estado de Resultados y Flujo de Fondos Proyectado”**

Los ejercicios 2027 y 2028 cierran con pérdida porque la estructura mínima para operar formalmente no se cubre con el volumen inicial. La caja nunca baja de **$10.046.151**.

<!-- INFORME:FLUJOS:FIN -->

El resultado del primer ejercicio merece lectura detenida, porque es donde el proyecto muestra su punto de tensión. El ejercicio 2027 cierra con una pérdida de $2.629.936 y el 2028 con $2.231.993: con el volumen inicial, la estructura mínima que exige operar formalmente todavía no se cubre. Esa pérdida está financiada por el capital de trabajo, dimensionado precisamente para sostenerla, y la caja nunca baja de $10.046.151. Desde 2029 el resultado es positivo y creciente.

**Metodología de VAN, TIR y Payback:**

El flujo del proyecto se evalúa sobre el flujo de fondos anual, después de impuestos y del servicio de deuda, con la inversión inicial comprometida en el año cero. Se compromete en el mes 0 el desembolso más la caja mínima operativa, definida como tres meses de gastos fijos y contingencia; sus aumentos posteriores se descuentan del flujo de fondos. La reserva destinada a cuotas pertenece al análisis financiero y no se incorpora como costo de una operación sin deuda. Esta decisión evita que cambiar el monto del préstamo altere artificialmente la rentabilidad del proyecto: el VAN económico responde a inversión, operación e impuestos de la actividad, mientras el flujo de los socios y su riesgo de caja sí cambian con cuotas, gastos de apertura y tasa del crédito.

Las definiciones se aplican sobre una única serie de 121 flujos mensuales `F_0, F_1, …, F_120`:

* **VAN:** `Σ F_m / (1 + k)^(m/12)`, incluyendo `F_0` negativo y `k = 20 %` anual.
* **TIR:** tasa mensual que anula el VAN, convertida a efectiva anual como `(1 + TIR_m)^12 − 1`.
* **Payback simple:** primer momento en que el acumulado de flujos sin descuento alcanza cero, interpolando dentro del mes.
* **Payback descontado:** mismo procedimiento, descontando cada flujo al 20 % anual.

No se añade venta final del negocio, valor terminal, rescate de activos ni recuperación de inventario o caja mínima al cierre del horizonte. Los indicadores corresponden, por lo tanto, a la operación del decenio bajo esa convención conservadora, y no a una liquidación de la empresa. El saldo de deuda de cada año se muestra en la tabla de amortización y no se vuelve a restar al flujo de fondos, que ya descuenta la cuota de capital.

**Resultados de la Evaluación por Escenario:**

Aplicando esta metodología sobre los tres escenarios de actividad definidos —base, estrés (ventas reducidas un 35 %, recalculando personal, inventario y servicios según actividad) y crecimiento (ventas y adquisición aumentadas un 50 %, ajustando capacidad)— se obtienen los siguientes indicadores:

<!-- INFORME:INDICADORES:INICIO -->

| Indicador | Valor | Criterio | Veredicto |
|---|---|---|---|
| Inversión inicial | $29.725.912 | — | — |
| VAN al 20 % | $116.325.391 | VAN > 0 | Cumple |
| TIR efectiva anual | 54,03 % | TIR > 20 % | Cumple |
| Payback simple | 3,68 años | ≤ 5 años | Cumple |
| Payback descontado | 4,39 años | ≤ 5 años | Cumple |
| Deuda al cierre de 2036 | $0 | Crédito saldado | Cumple |

###### **Tabla 2.8 “Evaluación Económica”**

El precio **se deriva** del costo total exigiendo un 30 % de utilidad: $449.337 con IVA ($377.594 netos). No es un supuesto de entrada.

<!-- INFORME:INDICADORES:FIN -->

Los tres escenarios muestran que el margen técnico del equipo, el costo comercial y el ritmo de ventas deben analizarse en conjunto: una mayor capacidad de lectura o una BOM reducida no compensan por sí solas una estructura de adquisición de clientes ineficiente.

**Análisis de Sensibilidad y Punto de Quiebre:** Los indicadores anteriores corresponden al escenario base. Para verificar la robustez del modelo frente a desviaciones razonables, se recalculó el resultado del Año 1 y el VAN bajo variaciones individuales de las variables más frágiles, modificando una condición a la vez y manteniendo el principal del crédito:

<!-- INFORME:SENSIBILIDAD:INICIO -->

| Caso | Precio | Utilidad año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---|---|---|---|---|
| Caso base | $449.337 | $-2.629.936 | $116.325.391 | 54,0 % | $10.046.151 |
| Ventas −10 % | $449.337 | $-7.478.390 | $63.246.795 | 39,2 % | $-3.534.896 |
| Ventas −25 % | $449.337 | $-14.751.072 | $-18.551.328 | 13,9 % | $-45.709.095 |
| BOM +15 % | $449.337 | $-4.927.732 | $91.083.026 | 46,8 % | $3.597.203 |
| BOM +30 % | $449.337 | $-7.225.528 | $65.601.983 | 39,5 % | $-2.851.745 |
| Precio a $399.990 | $399.990 | $-10.430.005 | $30.136.289 | 29,3 % | $-17.025.757 |
| Precio a $349.990 | $349.990 | $-18.333.366 | $-61.714.629 | -1,6 % | $-77.757.668 |

###### **Tabla 2.9 “Análisis de Sensibilidad y Punto de Quiebre”**

Se modifica una condición a la vez **manteniendo congelado el financiamiento**. El punto de quiebre del precio está cerca de $400.000: al precio de $349.990 de versiones anteriores del estudio, el proyecto arroja VAN negativo y caja que nunca se recupera.

<!-- INFORME:SENSIBILIDAD:FIN -->

La lectura de esta tabla es más exigente que la de versiones anteriores del estudio, y esa es precisamente su utilidad. El proyecto tolera desviaciones, pero su holgura es acotada: una caída del 25 % en el volumen ya lleva el VAN a terreno negativo, y la caja se agota antes que el valor. No existe holgura alguna sobre el precio: rebajarlo bajo $400.000 destruye el resultado con más severidad que perder un cuarto de las ventas, lo que confirma que $449.337 es un techo estratégico y no un punto de negociación. Un alza del 15 % en la BOM afecta materiales, inventario, merma y reposiciones —no equivale a subir todos los gastos de la empresa— y deja el VAN levemente negativo, señalando que el margen técnico del equipo no admite descuido en la cotización del SKU de sonda. Finalmente, el alza de tasa al 18 % altera la caja del accionista y la reserva pero **conserva el VAN del proyecto**, porque el flujo del proyecto se evalúa con el financiamiento congelado: es la verificación de que la metodología está correctamente separada.

Estas sensibilidades orientan medidas de gestión concretas: revisar el costo del SKU que concentra los materiales, comparar canales por margen después de comisión, contratar según horas efectivas y observar la caja antes de ampliar compras.

Adicionalmente, se recalculó el VAN ante distintas tasas de descuento, para verificar que el resultado no dependa de una única exigencia de rentabilidad. Todas las filas descuentan exactamente la misma serie mensual, sin modificar ventas ni costos:

<!-- INFORME:DESCUENTO:INICIO -->

| Tasa efectiva anual | VAN |
|---|---|
| 5 % | $345.896.895 |
| 10 % | $238.479.871 |
| 15 % | $166.179.843 |
| 20 % | $116.325.391 |
| 30 % | $55.904.665 |
| 40 % | $23.587.817 |
| 50 % | $5.133.720 |
| TIR: 54,03 % | $0 |

###### **Tabla 3.0 “Análisis del VAN”**

<!-- INFORME:DESCUENTO:FIN -->

Todas las filas de la tabla descuentan la misma serie mensual de flujos, sin modificar ventas ni costos, de modo que el VAN disminuye monótonamente al elevar la tasa y cruza cero exactamente en la TIR. El resultado se mantiene positivo hasta exigencias de rentabilidad muy superiores al 20 % de referencia.

**Análisis de Riesgos y Plan de Mitigación:** La solidez de los indicadores financieros no exime al proyecto de riesgos concretos que deben gestionarse activamente. Se identifican los siguientes:

**Riesgos Técnicos:**

* **Dependencia de proveedor único de la sonda 7-en-1 (RS-485):** al concentrar el 59,1 % del costo de materiales y no existir múltiples proveedores calificados bajo el mismo mapa de registros, una discontinuación o alza abrupta de precio impactaría directamente el margen. *Mitigación:* calificar un segundo proveedor alternativo antes del lanzamiento comercial; el mapa de registros Modbus parametrizable contemplado en el diseño de firmware permite migrar de sonda sin rediseñar el sistema.
* **Ficha del SKU no verificada:** la tensión de alimentación, el mapa de registros y el comportamiento en arranque de la variante concreta que se adquiera no están confirmados. *Mitigación:* declarado como bloqueante técnico previo a comprometer compra de volumen.
* **Desviación entre la exactitud declarada por el fabricante y el desempeño real en suelos chilenos:** mitigado mediante el objetivo específico de validación instrumental contra un laboratorio de referencia acreditado, declarando método, profundidad y condición de humedad de cada comparación.
* **Autonomía no medida:** el balance energético del conjunto no se ha ensayado desde batería. *Mitigación:* la autonomía no se declara comercialmente hasta disponer de la medición, y ninguna cifra de campaña depende hoy de ese dato.

**Riesgos Económicos y Financieros:**

* **Riesgo cambiario:** al importar componentes críticos, una devaluación del peso incrementa el Costo Variable Unitario. El análisis de sensibilidad muestra que un alza del 15 % en la BOM reduce el VAN; consultar la sensibilidad a diez años, por lo que este riesgo exige cobertura activa y no simple monitoreo.
* **Riesgo de acceso a financiamiento:** la estructura de capital depende de obtener el crédito de largo plazo en condiciones cercanas al 12 % efectivo anual y a diez años de plazo. *Condición de mitigación:* confirmar con al menos dos o tres entidades bancarias la disponibilidad real de esta tasa y plazo antes de comprometer la inversión, considerando el uso de garantías estatales tipo FOGAPE.
* **Riesgo de liquidez en el arranque:** los dos primeros ejercicios cierran con pérdida y la caja desciende hasta $10.046.151. *Condición de mitigación:* mantener íntegra la reserva de los primeros 24 meses y no distribuir utilidades durante ese período.
* **Riesgo de dotación operativa:** la proyección asume una dotación reducida (según los escalones de técnicos y soporte de las tablas anuales, complementada por horas de los socios). *Condición de mitigación:* validar operativamente que esta dotación sea suficiente antes de escalar la producción del Año 2.
* **Riesgo de demanda:** el escenario base es deliberadamente conservador, pero la sensibilidad muestra que la holgura frente a una caída de ventas es menor que la supuesta en versiones anteriores del estudio. Toda la estrategia comercial inicial debe orientarse a proteger el volumen del primer año.
* **Riesgo de licencia del servicio de pronóstico:** la aplicación utiliza actualmente un proveedor cuya modalidad gratuita está destinada a uso no comercial. *Condición de mitigación:* comprobar licencia, cupo y cobertura antes del lanzamiento, o presupuestar un plan pagado que hoy no está contratado.

Con el análisis de sensibilidad y de riesgos expuesto, la evaluación del escenario base es favorable pero no confirma viabilidad real; quedan pendientes ventas, costos, crédito y ensayos. Bajo un horizonte de evaluación de 5 años y una Tasa de Descuento del 20 %, los resultados del negocio son los siguientes:

**Comparación conservada a cinco años:** los valores siguientes son del horizonte de 60 meses; la evaluación principal a diez años está en los bloques anteriores.

| Indicador | Valor Proyectado | Criterio de Éxito (5 años, 20 %) | Veredicto |
| :---- | :---- | :---- | :---- |
| **VAN (20 %)** | $15.504.053 | VAN \> 0 | **Cumple** |
| **TIR** | 35,43 % | TIR \> 20 % | **Cumple** |
| **Pay Back simple** | 34,61 meses (2,88 años) | ≤ 5 años | **Cumple** |
| **Pay Back descontado (20 %)** | 47,15 meses (3,93 años) | ≤ 5 años | **Cumple** |
| **Caja mínima del horizonte** | $10.046.151 | > 0 | Cumple |

###### **Tabla 3.3 “Evaluación Financiera”**

La decisión económica del caso base es favorable. La planificación financiera añade, sin embargo, una segunda pregunta que este informe responde en lugar de evitar: cómo pagar los meses iniciales antes de alcanzar la escala proyectada. Por eso se publican también la caja acumulada y el piso de seguridad que el capital de trabajo sostiene. Retorno económico y liquidez de arranque describen aspectos diferentes del mismo proyecto, y solo presentando ambos el estudio puede defenderse.

**Especificaciones Técnicas del Proyecto:**

> **Fuente de verdad de esta sección:** el detalle de esquemático, huellas, árbol de alimentación y lista de materiales física está en [`PCB/README.md`](../PCB/README.md); los costos de cada componente, en la lista `bom` de `finanzas/supuestos.json`.

**Arquitectura General y Estrategia de Hardware:** El diseño de hardware se articula en torno a una topología de bajo consumo, orientada a maximizar la autonomía del equipo en jornadas de terreno. La arquitectura separa lógicamente el sistema en un dominio de control digital (siempre energizado, pero capaz de entrar en reposo profundo) y un dominio de potencia analógico/periférico que se aísla mediante *power gating* cuando no está en ciclo de medición.

La fuente de energía primaria es **una celda LiPo protegida de 2.000 mAh a 3,7 V nominales**, equivalente a una energía de referencia de aproximadamente 7,4 Wh. Corresponde señalar que esta configuración sustituye al banco de dos celdas 18650 en paralelo (6.000 mAh) considerado en versiones anteriores del estudio; el cambio responde al formato de instrumento portátil de mano y obliga, como se detalla más adelante, a retirar todas las cifras de autonomía calculadas sobre aquella capacidad. La tensión de la celda alimenta un bus principal regulado, del cual derivan tres subramas:

* **Rama Digital Continua:** un regulador LDO de baja corriente de reposo reduce la tensión a 3,3 V para alimentar el microcontrolador y el sensor ambiental.
* **Rama de Medición Conmutada:** un MOSFET controlado por GPIO habilita el paso de energía hacia el convertidor elevador que provee los 5 V DC necesarios para excitar la sonda de suelo RS-485.
* **Rama de Interfaz:** lógica directa para los LEDs indicadores y un divisor resistivo (100 kΩ + 100 kΩ) para el muestreo del estado de batería por ADC.

La carga y la elevación de tensión se resuelven mediante una **PCB combinada USB-C de carga y boost**, adquirida como un solo componente de $900. Esta decisión reemplaza a los módulos discretos TP4056/TP5100 y MT3608 que figuraban en el diseño anterior; presentarlos hoy en la BOM significaría comprar dos veces la misma función.

**Sistema de Procesamiento y Conectividad:** El núcleo del procesamiento recae en el módulo ESP32-WROOM-32, utilizado en formato de placa de desarrollo. El procesador Xtensa LX6 de 32 bits y doble núcleo permite dedicar un núcleo a la pila de radio y al sistema operativo en tiempo real (FreeRTOS), mientras el segundo gestiona la temporización del protocolo Modbus RTU hacia la sonda. Como se indicó en la justificación de componentes, esta separación es una comodidad de diseño valiosa, no una condición sin la cual el sistema sería imposible.

| Especificación | Detalle Técnico |
| :---: | :---: |
| **Microcontrolador** | Módulo ESP32-WROOM-32 sobre placa de desarrollo |
| **Procesamiento** | Xtensa LX6, 32 bits, doble núcleo, hasta 240 MHz |
| **Memoria** | 520 KB SRAM interna / Flash SPI según variante de devkit (verificar particiones OTA) |
| **Conectividad** | Wi-Fi 802.11 b/g/n \+ **Bluetooth 4.2 (BR/EDR y BLE)** |
| **Consumo Dinámico** | 95–380 mA según estado del transceptor de radio (dato de chip, no de la placa completa) |
| **Consumo en reposo del chip** | 10 µA en *deep sleep* / 5 µA en hibernación (**no incluye** regulador, LED de alimentación ni puente USB-UART del devkit) |
| **Certificación RF** | Módulo pre-certificado FCC ID 2AC7Z-ESPWROOM32 (**no acredita** el equipo terminado) |

###### **Tabla 3.4 “Especificaciones Técnicas ESP32”**

Dos precisiones sobre esta ficha técnica. Primero, la hoja de datos de Espressif especifica **Bluetooth 4.2 BR/EDR y BLE**, no BLE 5.0. Segundo, las cifras de consumo en reposo corresponden al chip y no a la placa de desarrollo: el regulador, el LED de alimentación y el puente USB-UART del devkit consumen adicionalmente, y ese consumo es precisamente el que domina el balance energético real del instrumento.

**Adquisición de Datos y Sensado:**

* **Sonda de Suelo 7-en-1 (RS-485 Modbus RTU):** El nodo extrae 7 de las 10 magnitudes del sistema mediante una sonda multiparamétrica de grado industrial, construida en acero inoxidable 316L para prevenir la corrosión por picadura inducida por cloruros en el suelo.

| Parámetro | Rango de Operación | Exactitud Declarada por el fabricante |
| :---: | :---: | :---: |
| **Humedad Volumétrica** | 0 – 100 % | ±2 % (en rango 0–50 %) |
| **Temperatura de Suelo** | −40 °C a \+80 °C | ±0,3 °C |
| **Conductividad Eléctrica** | 0 – 20.000 µS/cm | ±3 % |
| **pH** | 3,0 – 9,0 | ±0,1 |
| **Macronutrientes (N, P, K)** | 1 – 1.999 mg/kg c/u | ±5 % (declarado; **valores derivados de la CE, no medidos por electrodo ion-selectivo**) |

###### **Tabla 3.5 “Especificaciones Técnicas Sonda”**

Estas cifras corresponden a lo declarado por el fabricante y deben verificarse contra la ficha del SKU efectivamente adquirido. La comunicación se establece a 9.600 baudios vía Modbus RTU, función 0x03 (lectura de registros *holding*), con verificación CRC-16 y respeto de los tiempos de silencio entre tramas. Para mitigar variaciones entre lotes de proveedores, el mapa de registros Modbus, la dirección del esclavo y los coeficientes de calibración no estarán fijados en el firmware, sino parametrizados en la memoria no volátil (NVS) del ESP32, permitiendo ajustes remotos vía OTA.

* **Sensor Ambiental (Bosch BME280):** Para las variables climáticas del punto de muestreo se integra un BME280 en el bus I²C a 3,3 V, aportando temperatura del aire (±1,0 °C), humedad relativa (±3 % HR) y presión barométrica (±1,0 hPa). El sensor opera en *forced mode*, realizando una adquisición y regresando por sí solo al reposo. Bosch especifica aproximadamente 3,6 µA de consumo promedio a una tasa de una actualización por segundo midiendo las tres magnitudes, y 0,1 µA en reposo del sensor; conviene precisar que el primer valor **es un promedio a esa configuración de muestreo específica** y no una corriente instantánea aplicable a cualquier régimen, y que a ambos debe sumarse el consumo del módulo *breakout* que aloja el chip.

**Contrato de Datos BLE:** El instrumento actúa como puente entre dos entornos distintos: hacia la sonda ejecuta una consulta Modbus RTU y verifica la respuesta; hacia el teléfono publica los datos ya decodificados en una característica GATT. La aplicación no necesita generar señales RS-485 ni procesar el cableado industrial, sino consumir un contrato de datos de aplicación. El contrato del producto es de **20 bytes** con valores multibyte en formato *big-endian*, e incluye siempre las siete variables de suelo, las tres de ambiente y la batería en una sola notificación.

> **Fuente de verdad:** el decodificador real es `App/src/services/probeService.ts`; el transporte y la suscripción a la característica, `App/src/services/bleService.ts`. La descripción byte a byte para quien escriba el firmware está en [`docs/CONTRATO_BLE.md`](CONTRATO_BLE.md) y se replica en `PCB/README.md`. Si el decodificador cambia, esos tres documentos se actualizan desde él y no al revés.

| Bytes | Contenido | Tipo y escala | Interpretación en la App |
| :---: | :---- | :---: | :---- |
| 0–1 | Humedad volumétrica de suelo | `uint16`, ÷10 | Porcentaje con un decimal |
| 2–3 | Temperatura de suelo | **`int16` con signo**, ÷10 | Grados Celsius, admite valores bajo cero |
| 4–5 | Conductividad eléctrica | `uint16` | µS/cm directo |
| 6–7 | pH | `uint16`, ÷10 | Unidades de pH con un decimal |
| 8–9 | Nitrógeno (N) | `uint16` | mg/kg, presentado como **registro informativo** con advertencia permanente |
| 10–11 | Fósforo (P) | `uint16` | mg/kg, presentado como **registro informativo** con advertencia permanente |
| 12–13 | Potasio (K) | `uint16` | mg/kg, presentado como **registro informativo** con advertencia permanente |
| 14 | Batería | **`uint8`** | **Porcentaje 0–100, no milivoltios** |
| 15 | Identificador de formato | `uint8` | `1` = 20 bytes con ambiente, el formato del producto; `0` = 16 bytes, tolerado sólo para prototipos sin BME280 |
| 16–19 | Ambiente BME280 | 32 bits empaquetados | Temperatura del aire (12 bits), presión (12 bits) y humedad relativa (8 bits) |

###### **Tabla 3.6 “Contrato de Datos BLE (20 bytes)”**

Este nivel de detalle no es ornamental. Un cambio de orden de bytes o de escala puede producir cifras plausibles pero incorrectas, mucho más difíciles de detectar que una desconexión visible: una humedad de 35,0 % leída como 8.960 se advierte de inmediato, pero un pH mal escalado que arroje 6,5 en lugar de 5,6 puede pasar inadvertido y provocar una recomendación equivocada. Del contrato se desprende además una consecuencia de diseño explícita: **los tres datos ambientales del BME280 no caben en el byte reservado ni pueden colocarse sobre los registros existentes**. La solución adoptada es una **trama versionada**, no una característica adicional: el antiguo byte reservado pasa a declarar la versión, y la versión 1 añade cuatro bytes en los que las tres magnitudes viajan empaquetadas en bits —temperatura en 12, presión en 12 y humedad relativa en 8—. Los veinte bytes resultantes son el máximo que cabe en una notificación BLE con el MTU por defecto, de modo que suelo y ambiente pertenecen por construcción a la misma captura, sin necesidad de emparejar dos paquetes ni de negociar MTU. Los quince primeros bytes no cambian, así que un equipo con firmware antiguo sigue siendo legible y su lectura ambiental se marca explícitamente como ausente en lugar de rellenarse.

**Mapeo de Pines:** La asignación de puertos del microcontrolador queda definida como sigue:

| GPIO | Conexión de hardware | Función |
| :---: | :---- | :---- |
| **GPIO16** | SP3485 pin 1 (RO) | UART2 recepción (RXD2) |
| **GPIO17** | SP3485 pin 4 (DI) | UART2 transmisión (TXD2) |
| **GPIO4** | SP3485 pines 2 y 3 (RE/DE) | Control de dirección del bus RS-485 (1 = Tx, 0 = Rx) |
| **GPIO5** | Compuerta del MOSFET de disparo | *Power gating* de la rama de 5 V de la sonda (1 = On, 0 = Off) |
| **GPIO21** | BME280 (SDA) | Bus de datos I²C |
| **GPIO22** | BME280 (SCL) | Bus de reloj I²C |
| **GPIO34** | Divisor 100 kΩ / 100 kΩ a VBAT | Monitoreo analógico de batería (ADC1) |
| **GPIO0** | Pulsador de muestreo | Disparo de lectura rápida |
| **GPIO2** | LED verde | Indicador de medición y batería correcta |
| **GPIO15** | LED azul | Indicador de enlace BLE activo |

###### **Tabla 3.7 “Mapeo de Pines del Instrumento”**

**Gestión Energética:** La viabilidad del dispositivo depende del esquema de *power gating* controlado por el ESP32.

| Componente de Potencia | Función en la Arquitectura |
| :---: | :---- |
| **PCB combinada USB-C (carga + boost)** | Carga de la celda de litio por USB-C con protecciones (sobrecarga, sobredescarga, cortocircuito) y elevación a 5 V para la sonda, en un solo módulo. |
| **Regulador LDO 3,3 V** | Alimentación de la rama digital continua: microcontrolador y sensor ambiental. |
| **MOSFET de aislamiento** | Actuador de corte de la rama de 5 V, gobernado por GPIO 5. |
| **Interruptor mecánico** | Aislamiento manual del banco de batería para mantenimiento o almacenamiento prolongado. |

###### **Tabla 3.8 “Especificaciones Técnicas de Gestión Energética”**

El principio de diseño se mantiene: un convertidor elevador presenta corriente quiescente incluso sin carga, del orden de decenas a cientos de microamperios, y si permaneciera conectado al bus de forma continua dominaría por sí solo el presupuesto de reposo del sistema. Por ello el microcontrolador secciona físicamente esa rama, energizándola solo durante los segundos que dura la rutina de lectura Modbus. Ahora bien, **cortar la rama de la sonda no equivale a un consumo total de 0 µA del equipo**. El corte anula el consumo de esa rama, pero permanecen activos el ESP32, el regulador, el cargador, el circuito de protección de la celda y el divisor de batería —este último consume por sí solo alrededor de 18,5 µA a 3,7 V si queda permanentemente conectado—. La estrategia debe además comprobarse sobre la PCB combinada y sus pines de habilitación: no se presupone que desconectar únicamente la salida de 5 V anule también la corriente del elevador. Si se requiere un transistor externo adicional, debe identificarse dentro de la línea presupuestada de pasivos y protección al cerrar el esquema.

**Interfaz Física de Usuario:** El panel físico del equipo se reduce deliberadamente a lo mínimo indispensable para la operación en terreno. El panel frontal centraliza las interacciones físicas, aislando las entradas de cableado en la sección inferior:

![Representación conceptual de la carcasa](img/figura-carcasa.png)

##### **Figura 2.3 “Representación Conceptual de Carcasa”**

La interfaz consta de luces indicadoras, un botón de muestreo y emparejamiento, un puerto USB-C de carga y un interruptor mecánico de encendido dimensionado para ser accionable incluso con guantes de trabajo pesados. Las luces comunican, mediante distintos patrones de encendido, los estados relevantes del equipo sin necesidad de abrir la aplicación:

| Estado Operativo | Indicador Activo | Patrón de Señalización | Significado Técnico |
| :---: | :---: | :---: | :---- |
| **Buscando conexión** | 🔵 Azul | Pulso suave (1 Hz) | Encendido, emitiendo *advertising* a la espera de un enlace BLE. |
| **Modo de emparejamiento** | 🔵 Azul | Parpadeo rápido (4 Hz) | Ventana de enlace abierta durante 30 s. |
| **Enlazado y listo** | 🟢 Verde | Iluminación fija | Conexión BLE establecida correctamente con el teléfono. |
| **Medición exitosa** | 🟢 Verde | Tres destellos rápidos | Lectura capturada y transmitida correctamente. |
| **Batería baja** | 🔴 Rojo | Pulso lento (0,5 Hz) | Tensión de batería bajo el umbral de aviso; requiere recarga por USB-C. |
| **Error de sonda** | 🔴 Rojo | Parpadeo rápido (2 Hz) | Fallo o tiempo de espera agotado en la comunicación Modbus. |

###### **Tabla 3.9 “Interfaz Hardware”**

Nótese que el patrón de error de sonda es distinto de cualquier indicación de resultado agronómico: la señalización física respeta la misma regla que la aplicación, según la cual un fallo de comunicación nunca se presenta como un diagnóstico del suelo.

**Aplicación Móvil y Motor de Razonamiento Agronómico:**

> **Fuente de verdad de esta sección:** el motor agronómico vive en `App/src/engine/` (`agronomyEngine.ts` para el diagnóstico por variable, `stageEvaluator.ts` para la etapa fenológica y `contextualAdvice.ts` para la recomendación de labor); el pronóstico y su degradación sin red, en `App/src/services/weatherService.ts`; la persistencia y la cola local, en `App/src/services/measurementsService.ts`. Los umbrales que aparecen en la matriz de cultivos de este informe deben coincidir con los de esos archivos: si difieren, mandan los archivos. La descripción funcional completa de pantallas y flujos está en [`App/README.md`](../App/README.md).

La aplicación está desarrollada con React Native, Expo y TypeScript. El motor agronómico y las definiciones de cultivos residen en código local; la persistencia utiliza almacenamiento local del dispositivo con estado administrado mediante Zustand. Corresponde precisar, frente a versiones anteriores del informe, que **no se implementa una base SQLite** en la versión revisada: la persistencia local existe y funciona, pero mediante otro mecanismo. Esta distinción importa porque describe con exactitud qué parte del sistema interpreta, cuál conserva una lectura y cuál solicita datos remotos.

El motor evalúa la medición contra una matriz de cultivos con umbrales declarados por especie:

| Cultivo | Temp. mínima | Temp. óptima | Rango de pH | CE máxima (µS/cm) | Observación agronómica |
| :---- | :---: | :---: | :---: | :---: | :---- |
| **Maíz grano / choclo** | 12,0 °C | 22,0 °C | 5,8 – 7,2 | 1.800 | Sensible al frío en germinación y a suelos fuertemente ácidos. |
| **Tomate de campo / invernadero** | 15,0 °C | 24,0 °C | 6,0 – 6,8 | 2.200 | Alta demanda de calcio y fósforo; no tolera anoxia radicular. |
| **Papa (tubérculo)** | 8,0 °C | 18,0 °C | 5,0 – 6,5 | 1.700 | Tolera suelos ligeramente ácidos; requiere suelo suelto y aireado. |
| **Trigo / cereales de invierno** | 4,0 °C | 16,0 °C | 6,0 – 7,5 | 2.500 | Resistente al frío; muy sensible a acidez extrema por toxicidad de aluminio. |
| **Lechuga, palto, vid y arándano** | Según especie | Según especie | Según especie | Según especie | Incluidos en la matriz; el arándano exige suelo ácido específico. |

###### **Tabla 4.0 “Matriz de Cultivos del Motor Agronómico”**

La interpretación de la humedad no es absoluta sino relativa a la textura del suelo declarada por el usuario, criterio que se apoya en la clasificación textural normalizada. Un 20 % de humedad volumétrica significa cosas opuestas en un suelo arenoso y en uno arcilloso, y el motor lo resuelve mediante cuatro umbrales por textura:

| Textura | Punto de marchitez | Umbral de riego | Capacidad de campo | Saturación |
| :---- | :---: | :---: | :---: | :---: |
| **Arenoso (suelto / ligero)** | 6,0 % | 10,0 % | 14,0 % | 30,0 % |
| **Franco (equilibrado)** | 12,0 % | 20,0 % | 28,0 % | 45,0 % |
| **Franco-arcilloso (pesado)** | 16,0 % | 25,0 % | 35,0 % | 52,0 % |
| **Arcilloso (muy pesado, drenaje lento)** | 20,0 % | 30,0 % | 42,0 % | — |

###### **Tabla 4.1 “Umbrales Hídricos por Textura de Suelo”**

Sobre esta base, la evaluación se ajusta además a una de las cuatro etapas fenológicas del ciclo productivo (pre-siembra, vegetativo, floración y cosecha), porque la misma lectura exige decisiones distintas según el momento del cultivo. El recorrido de uso completo en terreno es el siguiente:

```mermaid
flowchart TD
    A[Seleccionar equipo y campo] --> B[Elegir cultivo, textura y etapa]
    B --> C[Revisar limpieza e insertar la sonda]
    C --> D[Iniciar captura]
    D --> E{Hay datos utilizables}
    E -->|No| F[Explicar fallo y repetir captura]
    E -->|Si| G[Revisar valores y completitud en el Grid]
    G --> H[Leer diagnostico y causas]
    H --> I[Consultar recomendacion y contexto climatico]
    I --> J[Guardar lectura con fecha y contexto]
    J --> K{Ubicacion disponible}
    K -->|Si| L[Guardar coordenadas con la lectura]
    K -->|No| M[Conservar en historial sin ubicacion]
    L --> N[Continuar recorrido]
    M --> N
```

##### **Figura 2.4 “Recorrido de Uso en Campo y Presentación del Diagnóstico”**

La presentación se organiza en dos páginas: Grid y diagnóstico. El Grid permite revisar las variables; el diagnóstico ordena los factores que explican el resultado y las recomendaciones. La aplicación no representa las lecturas sobre un mapa. El semáforo se acompaña siempre de texto y explicación, de modo que el color no sea el único medio de comunicación, en línea con las pautas de accesibilidad adoptadas. Las decisiones se formulan como orientaciones cualitativas y cuantificadas hasta donde la evidencia lo permite: la aplicación **no** determina por sí sola litros exactos de lavado ni dosis de cal en kg/ha, porque hacerlo excedería lo que un instrumento de terreno puede sostener.

La ubicación es una ayuda para reconstruir el recorrido y no debe impedir guardar información útil: la app conserva también lecturas sin GPS y las muestra en el historial junto a las demás. Las coordenadas se registran y se consultan como dato numérico. Conviene subrayar el límite que de ahí se sigue: una medición describe el punto en que se insertó la sonda y no autoriza a extender esa lectura a la superficie que la rodea.

El guardado local antecede siempre al intento de envío. Cada medición recibe un identificador único de cliente (`client_uuid`) que se conserva al reintentar, y la cola se separa por cuenta de usuario. La operación remota utiliza ese identificador para evitar duplicación:

```mermaid
flowchart TD
    A[Lectura con contexto e identificador unico] --> B[Guardar en cola local de la cuenta]
    B --> C[Intentar envio a Supabase]
    C --> D{Servidor confirma recepcion}
    D -->|Si| E[Retirar registro de la cola]
    D -->|No| F[Conservar como pendiente]
    F --> G[Reintentar al ejecutar sincronizacion]
    G --> H[Reutilizar el mismo identificador]
    H --> C
    E --> I[Mostrar estado sincronizado]
```

##### **Figura 2.5 “Persistencia Local y Sincronización Idempotente”**

Si falla internet, la lectura sigue pendiente; si el servidor confirma recepción, se retira de la cola. El código incluye estos mecanismos de sincronización, pero no se afirma que una aplicación cerrada mantenga un servicio continuo en segundo plano en cualquier teléfono, porque el comportamiento depende del sistema operativo y del fabricante.

<a id="integracion-bme280"></a>

**Estado de Integración del BME280 y del Pronóstico:**

Corresponde declarar con precisión qué parte de esta arquitectura está construida y qué parte constituye trabajo de integración identificado. El BME280 permanece obligatorio en el diseño y en los costos; lo que sigue registra el estado del código para guiar la implementación:

| Función | Estado en el código revisado | Integración requerida |
| :---- | :---- | :---- |
| Suelo por BLE | Decodificador implementado, con identificador de formato | Contrastar con el firmware y la ficha de la sonda adquirida |
| Ambiente local | Transporte resuelto: la trama de 20 bytes lleva las tres magnitudes y el decodificador las lee | Adquisición I²C en el firmware y captura real contra el sensor físico |
| Grid 2×5 | Diez tarjetas locales en App y detalle web; N/P/K separados e informativos | Validar interfaz en dispositivo físico |
| Guardado ambiental | Resuelto: las tres magnitudes se guardan desde el BME280 y el VPD se deriva de ellas; sin sensor queda `NULL` | Verificar contra hardware real que los valores persistidos coinciden con el sensor |
| Pronóstico | Solicita `forecast_days=6`; presenta las cinco fechas locales posteriores al día actual, con ausencias explícitas | Validar en campo; el resultado local no espera al pronóstico |
| Fallo de red | El servicio devuelve valor nulo | Mantener la lectura local y distinguir "pronóstico no disponible" de "sin dato" |

###### **Tabla 4.2 “Estado de Integración del BME280 y del Pronóstico”**

El contrato ambiental deberá representar temperatura con signo, humedad relativa, presión local, instante de captura y estado del sensor. La estructura de almacenamiento debe mantener el origen del dato: el campo ambiental de una medición no puede conservar indistintamente un valor del BME280 y uno de un modelo meteorológico sin informar esa diferencia, y también deben revisarse exportación e historial para que la distinción sobreviva al guardado. Respecto del horizonte, la integración debe verificar si el proveedor incluye el día actual en su respuesta y solicitar suficientes fechas para completar los cinco días posteriores a la lectura; para cada día se necesitan fecha, precipitación prevista y temperaturas extremas, mostrando como no disponibles los valores faltantes. La recomendación debe conservar qué pronóstico se utilizó, evitando que una actualización futura cambie el significado histórico de una lectura guardada.

```mermaid
flowchart TD
    A[Lectura de suelo y BME280] --> B[Diagnostico local por cultivo y etapa]
    B --> C{Pronostico de cinco dias disponible}
    C -->|No| D[Presentar diagnostico y ausencia de pronostico]
    C -->|Si| E[Revisar lluvia y temperaturas previstas]
    E --> F{Hay riesgo relevante para la labor}
    F -->|Si| G[Recomendar revisar o posponer la labor]
    F -->|No| H[Mantener orientacion del diagnostico local]
    G --> I[Explicar causa, fechas y contexto]
    H --> I
    D --> J[Guardar medicion y fuentes disponibles]
    I --> J
```

##### **Figura 2.6 “Decisión Agronómica Local Complementada por Pronóstico”**

**Carcasa del Dispositivo:**

Aislada de la interfaz de usuario, la envolvente física se enfoca en la estanqueidad, la durabilidad y la integración de los sensores en entornos agrícolas agresivos.

* **Material y Estructura:** La carcasa se fabrica en PETG mediante impresión 3D FDM contratada como servicio externo. A diferencia del PLA o el ABS, el PETG resiste mejor la intemperie y la radiación UV. La rigidez frente a caídas sobre gravilla se busca mediante un relleno del 40–60 %, mientras la estanqueidad depende de la configuración de perímetros sólidos (≥ 4 capas, altura de 0,16–0,20 mm). Debe señalarse que la selección del material **no demuestra por sí sola** resistencia UV, estanqueidad ni tolerancia a caídas: influyen el filamento concreto, la orientación de capas, la geometría y el acabado, factores que deben evaluarse con la pieza fabricada.

**Sellado de Componentes:**

* **Junta Principal:** un *O-ring* de silicona comprimido de forma controlada mediante insertos roscados M3 entre la tapa y el cuerpo.
* **Salida de Sonda:** el cable hacia la sonda de suelo emplea un prensaestopas industrial M12 en la base, que actúa como sellado y alivio de tracción; sin él, cualquier tirón transmitiría el esfuerzo mecánico directamente a las soldaduras de la PCB.

**El requisito opuesto: ventilación del sensor ambiental.** El diseño mecánico debe resolver simultáneamente dos exigencias contradictorias. El instrumento debe proteger la electrónica del agua y el barro, pero el BME280 necesita intercambio con el aire exterior para medir aquello que justifica su inclusión. Se resuelve mediante un alojamiento ventilado y protegido, apartado del ESP32, de los reguladores, del circuito de carga y del calor de la mano del operador. Sellar el sensor con resina o encerrarlo en una cámara sin intercambio invalidaría su lectura. La BOM presupuesta $6.000 netos de impresión del conjunto y $1.500 de fijaciones, juntas, prensaestopas y respiradero.

```mermaid
flowchart TB
    subgraph C[Carcasa PETG impresa en 3D]
        U[Pulsador y LED de estado]
        E[ESP32 y placa portadora]
        P[PCB combinada USB-C carga y boost]
        L[LiPo protegida de 2000 mAh]
        B[Alojamiento BME280 separado del calor]
        J[Juntas, fijaciones y acceso de mantenimiento]
    end
    A[Aire exterior] <-->|Respiradero protegido| B
    USB[Cable USB-C] --> P
    P --> L
    L --> E
    U --> E
    B --> E
    E <-->|Cable y prensaestopas| S[Sonda de suelo]
```

##### **Figura 2.7 “Distribución Funcional de la Carcasa”**

*(Esquema funcional, sin escala ni dimensiones de fabricación.)*

**Mantenimiento y reparabilidad.** El diseño debe permitir sustituir la batería, el módulo ambiental o una pieza de carcasa sin desechar el instrumento completo. Para ello se priorizan tornillos sobre uniones permanentes, conectores identificados y alivio de tracción. La documentación de montaje debe señalar polaridades, pares de apriete cuando corresponda y el procedimiento de comprobación después de abrir el equipo. Reparabilidad, precisión ambiental y protección mecánica son tres requisitos que deben resolverse en conjunto, porque optimizar cualquiera de ellos por separado perjudica a los otros dos.

<a id="energia"></a>

**Criterios de Eficiencia Energética y Digitalización:**

Toda la ingeniería de energía del equipo se reduce a una sola regla, declarada de forma explícita y aplicada sin excepción a cada decisión de diseño, desde la elección del microcontrolador hasta el tipo de LED montado en el panel:

***Toda energía que el instrumento consume fuera del instante de medición es energía desperdiciada, y esa energía desperdiciada se paga dos veces: en autonomía perdida para el usuario y en batería adicional que hay que comprar.***

Esta regla es la que explica, con hilo conductor, las decisiones de hardware adoptadas: por qué el equipo no lleva pantalla, por qué existe un MOSFET dedicado solo a cortar la alimentación de la sonda y por qué se prefirieron LEDs por sobre otros métodos de alerta o guía para el usuario.

**Digitalización del Proceso Agrícola:** El segundo eje de este criterio es la digitalización del proceso de toma de decisiones en terreno. TerraSense transforma un proceso hoy manual y no trazable —la estimación visual, la memoria del agricultor o, en el mejor de los casos, un cuaderno de papel— en un flujo digital estructurado: cada medición queda georreferenciada, con marca de tiempo y sincronizada a una base histórica consultable. Esta digitalización habilita capacidades imposibles bajo el modelo análogo: comparar la evolución de un mismo punto del campo entre temporadas, agregar indicadores de salud edáfica por cooperativa o territorio, y exportar reportes estandarizados para asesorías técnicas o postulaciones a programas de fomento. El agricultor pasa de "estimar" a "medir y registrar", cerrando la brecha de datos que hoy impide a instituciones públicas y privadas focalizar sus políticas de apoyo al sector.

**Arquitectura de la Gestión Eficiente de Energía:**

El rendimiento real lo dictan componentes básicos implementados estratégicamente. La sonda y sus circuitos de soporte, el elevador de tensión y el transceptor RS-485 no permanecen alimentados de forma continua: un MOSFET controlado directamente por el microcontrolador actúa como interruptor electrónico que corta ese consumo salvo durante los segundos exactos en que se toma una lectura. Sin este corte, el consumo de reposo del elevador y del transceptor sumaría entre 350 y 500 µA de forma continua, una cifra que por sí sola excedería en un orden de magnitud el presupuesto de reposo del resto del sistema. Este MOSFET cuesta menos de $1.000 CLP y es, proporcionalmente, la mejor inversión electrónica del diseño.

Sin embargo, el componente que más autonomía aporta no es electrónico, sino mecánico: el interruptor que permite al usuario apagar el equipo por completo en lugar de dejarlo emitiendo *advertising* Bluetooth de forma permanente. La diferencia entre un equipo apagado y uno en publicidad continua es de varios órdenes de magnitud en consumo, y la determina una pieza de menos de $1.000 CLP.

**Los Estados de Consumo:**

El equipo no tiene un único nivel de consumo, sino que transita entre estados bien delimitados. Dado que el dispositivo pasa la mayor parte de su vida útil en reposo, el diseño se enfoca en gestionar estas transiciones y en acotar el tiempo que permanece conectado:

| Estado | Qué permanece activo | Medida de diseño |
| :---- | :---- | :---- |
| **Almacenamiento** | Circuitos no desconectados por el interruptor y autodescarga de la celda | Identificar rutas reales de consumo y verificar el método de apagado |
| **Reposo** | Control, regulación y periféricos retenidos | Medir la corriente del conjunto; revisar LED de alimentación y puente USB-UART |
| **Publicidad y conexión** | Radio BLE y control | Ventanas acotadas de *advertising* y reintento controlado |
| **Medición** | Sonda, interfaces RS-485 y lectura ambiental | Habilitar solo durante estabilización y adquisición |
| **Entrega y espera** | Comunicación y procesamiento | Confirmar envío y regresar al estado de menor consumo |
| **Carga** | Circuito USB-C y celda | Verificar corriente, temperatura y efecto del calor sobre la lectura ambiental |

###### **Tabla 4.3 “Estados Energéticos y Medidas de Diseño”**

```mermaid
stateDiagram-v2
    [*] --> Reposo
    Reposo --> Conexion: Activacion del usuario
    Conexion --> Medicion: Enlace y solicitud
    Conexion --> Reposo: Tiempo agotado
    Medicion --> Entrega: Lectura adquirida
    Medicion --> Reposo: Error y apagado de rama
    Entrega --> Espera: Resultado transmitido
    Espera --> Medicion: Nueva solicitud
    Espera --> Reposo: Inactividad
    Reposo --> Carga: USB conectado
    Carga --> Reposo: USB retirado
```

##### **Figura 2.8 “Estados Energéticos del Instrumento”**

**Modelo de Consumo por Ciclo de Medición:**

Cada vez que el usuario dispara una lectura, el equipo recorre tres fases consecutivas. El error metodológico que arrastraban las versiones anteriores de este capítulo era sumar corrientes de distintos nodos de tensión como si fueran directamente equivalentes. El equipo no opera a una única tensión: la celda entrega 3,7 V nominales, la rama digital trabaja a 3,3 V detrás de un regulador lineal y la sonda a 5 V detrás de un elevador conmutado. Un miliamperio-hora no significa lo mismo en cada uno de esos tres nodos, de modo que el balance se plantea en unidades de **energía (mWh)** y no de carga (mAh): la energía sí es aditiva entre nodos de distinta tensión, la carga no.

La conversión desde cada nodo hacia la batería sigue dos reglas distintas. En la rama del LDO (ESP32, BME280 y transceptor) la corriente no se transforma —un regulador lineal entrega la misma corriente que consume— pero la potencia sí: `P_batería = I_nodo × V_batería`, y la diferencia hasta 3,3 V se disipa como calor, lo que representa el 10,8 % de la energía extraída. En la rama de la sonda, alimentada por un elevador de eficiencia η ≈ 0,85, la conversión opera sobre la potencia: `P_batería = (V_nodo × I_nodo) / η`.

> **Fuente de verdad:** el árbol de alimentación, los nodos de tensión y los componentes de cada rama están descritos en [`PCB/README.md`](../PCB/README.md). Las corrientes de hoja de datos corresponden al ESP32-WROOM-32, al SP3485, al HT7533-1 y al BME280; la eficiencia del elevador y el consumo de vigilancia del cargador son estimaciones de diseño no medidas, y así se declaran en la tabla de estado probatorio.

| Fase | Componente | Nodo / tensión | Corriente en el nodo | Potencia en el nodo | Potencia desde la batería (3,7 V) |
| :---- | :---- | :---: | ---: | ---: | ---: |
| 1. Publicidad y conexión | ESP32 en advertising BLE | 3,3 V (LDO) | 40 mA | 132 mW | 148 mW |
| 2. Adquisición del conjunto | ESP32 (temporización Modbus) | 3,3 V (LDO) | 95 mA | 313,5 mW | 351,5 mW |
| | Transceptor SP3485 (driver activo) | 3,3 V (LDO) | 2 mA | 6,6 mW | 7,4 mW |
| | BME280 (muestreo *forced mode*) | 3,3 V (LDO) | 0,0036 mA | 0,012 mW | 0,013 mW |
| | Sonda 7-en-1 (excitación y lectura) | 5 V (elevador, η ≈ 0,85) | 30 mA | 150 mW | ≈ 176,5 mW |
| | **Subtotal Fase 2** | | | **470,1 mW** | **535,4 mW** |
| 3. Envío del resultado | ESP32 transmitiendo BLE | 3,3 V (LDO) | 150 mA | 495 mW | 555 mW |

###### **Tabla 4.4 “Fases de Operación y Consumo Energético”**

| Fase operativa | Potencia desde la batería | Duración | Energía por ciclo |
| :---- | ---: | :---: | ---: |
| 1. Publicidad y conexión | 148 mW | 12 s | 0,493 mWh |
| 2. Adquisición del conjunto | 535,4 mW | 3 s | 0,446 mWh |
| 3. Envío del resultado | 555 mW | 1 s | 0,154 mWh |
| **Total por ciclo** | Variable | **16 s** | **1,094 mWh** |

###### **Tabla 4.5 “Energía por Ciclo de Medición”**

Tres precisiones sostienen estas tablas frente a un cálculo por suma directa de corrientes. La sonda toma 150 mW en su nodo de 5 V pero exige 176,5 mW a la batería: el factor `1/η = 1,176` es energía perdida en la conversión, y omitirlo subestima la Fase 2. La rama del LDO exhibe la pérdida simétrica: los 40 mA de la Fase 1 valen 132 mW en el nodo de 3,3 V pero cuestan 148 mW de batería. Sumar los tres nodos en mAh habría hecho desaparecer ambas pérdidas. Por último, el consumo de la sonda a 5 V es un **supuesto de potencia constante**: la descripción del vendedor declara 0,15 W a 12 V y 0,5 W a 24 V, de modo que la potencia no es constante con la tensión y la extrapolación al extremo inferior debe medirse en banco antes de comprometer volumen de compra.

**Sensibilidad al Consumo de Reposo:**

El ciclo de medición no es lo que determina la autonomía: la determina el consumo entre mediciones. El presupuesto de reposo del sistema suma el ESP32 en reposo profundo (10 µA), el regulador LDO (2,5 µA), el circuito cargador/protección en vigilancia (≈5 µA, estimación de diseño) y el divisor de batería de 1 MΩ + 1 MΩ (1,85 µA), es decir **≈19,4 µA**. El ejercicio siguiente utiliza diez capturas diarias con el ciclo de 1,094 mWh, cinco minutos adicionales de espera BLE a 18 mA (66,6 mW desde la batería, 5,55 mWh), una capacidad útil supuesta de 1.600 mAh equivalente a 5.920 mWh a 3,7 V y una pérdida diaria simplificada por autodescarga de 1,3333 mAh, es decir 4,93 mWh (2 % mensual sobre 2.000 mAh):

| Escenario de reposo | Reposo total | Potencia en reposo | Consumo diario calculado | Energía útil / consumo diario |
| :---- | :---: | ---: | ---: | :---: |
| **Diseño adoptado** (placa intervenida, divisor 1 MΩ + 1 MΩ) | 19,4 µA | 71,8 µW | 23,14 mWh/día | **255,8 días (≈ 8,5 meses)** |
| Alternativa con divisor de 100 kΩ + 100 kΩ | 36,0 µA | 133,2 µW | 24,62 mWh/día | 240,5 días (≈ 8,0 meses) |
| Fuga adicional no identificada (contingencia de validación) | 1,0 mA | 3,7 mW | 110,22 mWh/día | 53,7 días (≈ 1,8 meses) |
| **Placa de desarrollo sin intervenir** (LED de alimentación conectado) | ≈ 2,0 mA | 7,4 mW | 199,02 mWh/día | **29,7 días (≈ 1,0 mes)** |

###### **Tabla 4.6 “Efecto del Consumo de Reposo sobre la Autonomía”**

**La condición que hace válido este presupuesto, y que la BOM obliga a declarar.** La lista de materiales compra una **placa de desarrollo** ESP32-WROOM-32, no el módulo desnudo: la línea del BOM dice literalmente «Placa de desarrollo ESP32-WROOM-32» y el precio de referencia corresponde a un devkit de catálogo. Un devkit mantiene alimentados un regulador de propósito general, un puente USB-UART y un LED de alimentación que **no se apagan con el modo de reposo profundo del microcontrolador**, y cuyo consumo conjunto se sitúa en el orden de los miliamperios. Los 10 µA de la hoja de datos son una cifra del módulo, no de la placa. Sin intervención, la autonomía cae a la última fila de la tabla: un mes escaso en lugar de ocho meses y medio.

El diseño resuelve esto con dos operaciones de taller sobre cada unidad, contenidas en las 2,25 horas de montaje y prueba que la nómina ya presupuesta y sin costo adicional de materiales:

1. **Alimentar la placa por su riel de 3,3 V** desde el LDO del instrumento, dejando sin tensión de entrada al regulador propio de la placa. El puente USB-UART, alimentado desde el bus de 5 V del conector USB, queda igualmente sin energía cuando el equipo opera con batería.
2. **Retirar el LED de alimentación**, único de los tres elementos que cuelga del riel de 3,3 V y que drenaría del orden de 2 mA de forma permanente.

La cifra de referencia que este informe sostiene de aquí en adelante es la del diseño adoptado —aproximadamente **8,5 meses (256 días, más de 2.500 mediciones)** con una sola carga— con un piso de 1,8 meses si se materializara la fuga de contingencia. Es un **resultado calculado, no medido**: procede del balance energético por nodo con las eficiencias declaradas, y su confirmación exige medir el consumo de reposo de la placa ensamblada e intervenida. Esa medición encabeza las comprobaciones físicas pendientes del [plan de validación](PLAN_VALIDACION.md).

Sobre el corte de la rama de la sonda, el mismo criterio aplica con cifras propias: sin el MOSFET, el elevador aportaría entre 30 y 100 µA según su modo de reposo y el transceptor SP3485, con el driver deshabilitado pero el integrado energizado, del orden de 300 a 400 µA según su hoja de datos. La suma, entre 330 y 500 µA, excede en más de un orden de magnitud el presupuesto de reposo del resto del sistema, y ambas cifras deben confirmarse sobre el conjunto ensamblado.

**Sostenibilidad Ambiental y Análisis Competitivo:**
Al comparar el sistema contra los estándares de la industria, el proyecto enfrenta con honestidad las diferencias de arquitectura. Las referencias siguientes son dos casos puntuales documentados y no una descripción exhaustiva del mercado:

| Equipo | Fuente de energía especificada | Recambio y continuidad operativa | Parámetros medidos |
| :---: | :---- | :---- | :---- |
| **Bluelab Pulse** | 1 pila AA alcalina | Sustituir la pila agotada; conviene disponer de repuesto | 3 (conductividad, humedad y temperatura), con app |
| **Hanna HI9814** | 3 pilas AAA de 1,5 V | Sustituir el juego completo; ~600 horas de uso continuo declaradas | 4 (pH, EC, TDS y temperatura), en soluciones hidropónicas |
| **TerraSense**  | 1 celda LiPo recargable de 2.000 mAh, carga USB-C | Recargar la misma celda; sustituirla al degradarse | 7 registros de suelo \+ 3 ambientales, con interpretación agronómica móvil |

###### **Tabla 4.7 “Análisis Comparativo de Parámetros”**

TerraSense busca reducir el recambio habitual de pilas primarias al recuperar la carga de la misma celda durante muchos ciclos de uso, lo que para el agricultor significa menos compras de repuestos y la posibilidad de cargar el equipo antes de una jornada mediante USB-C. Conviene reconocer, sin embargo, la ventaja operativa que conservan las pilas intercambiables: permiten reanudar el trabajo de inmediato con un repuesto, mientras que la batería integrada obliga a planificar la carga y a asegurar acceso a energía.

Este informe se abstiene además de dos afirmaciones que podrían parecer favorables pero no resisten el análisis. La primera es la métrica de "44 % menos energía por parámetro entregado": dividir energía por cantidad de parámetros favorece artificialmente a una sonda que entrega varios registros derivados de una misma señal, y por lo tanto no demuestra un beneficio comparable. La segunda es la distinción retórica entre llamar "sustentable" a un competidor y "sostenible" a TerraSense; la diferencia demostrable es concreta y no necesita adjetivos: pila primaria reemplazable frente a batería recargable, junto con las condiciones de reparación y vida útil del equipo.

Tampoco corresponde afirmar que una batería recargable produce residuos cero. Su fabricación, envejecimiento, reemplazo, electrónica de carga y disposición final forman parte del ciclo de vida; tanto las pilas agotadas como la celda LiPo retirada requieren gestión adecuada y no eliminación en la basura común. La Ley N° 20.920 identifica pilas, baterías y aparatos eléctricos y electrónicos dentro del marco de productos prioritarios \[9\], y el diseño responde a ello facilitando la separación de componentes y un canal de gestión al fin de la vida útil. La ventaja ambiental real del proyecto es reducir el flujo de pilas desechables y permitir la reparación por módulos, no eliminar el impacto.

Para sostener estas afirmaciones con evidencia en lugar de con declaraciones, se definen los indicadores que el proyecto se compromete a medir:

| Indicador | Forma de registro | Decisión que permite tomar |
| :---- | :---- | :---- |
| Energía por captura completa | Integración de potencia en batería y tiempo de sesión | Optimizar conexión, adquisición y entrega |
| Capacidad útil y degradación | Ensayos de ciclos y temperatura | Definir reemplazo y condiciones de uso |
| Reparación por módulo | Tiempo, piezas y resultado de la intervención | Reducir el descarte del equipo completo |
| Rechazo de impresión 3D | Masa de material y piezas fallidas por lote | Ajustar diseño y proceso de carcasa |
| Gestión al final de la vida útil | Baterías y electrónica recibidas y derivadas | Respaldar el compromiso ambiental con datos |

###### **Tabla 4.8 “Indicadores Ambientales y de Servicio a Medir”**

<a id="condiciones"></a>

**Estado Probatorio de las Especificaciones Declaradas:**

Las tablas de esta sección mezclan, inevitablemente, cifras de distinta solidez: algunas provienen de la hoja de datos del componente exacto, otras de una ficha representativa de la familia mientras no se cierre el SKU, y otras son estimaciones de diseño aún no medidas. Presentarlas con el mismo peso sería engañoso, de modo que se clasifican explícitamente.

> **Fuente de verdad:** la lista de componentes y sus notas de procedencia están en la clave `bom` de `finanzas/supuestos.json`, cuyos comentarios por línea registran qué está confirmado por socios, qué es presupuesto y qué falta cotizar. El árbol de alimentación está en [`PCB/README.md`](../PCB/README.md) y las comprobaciones físicas pendientes, en el [plan de validación](PLAN_VALIDACION.md).

| Especificación declarada | Origen de la cifra | Nivel de evidencia | Qué falta para confirmar |
| :---- | :---- | :---- | :---- |
| ESP32-WROOM-32: procesamiento, memoria y radio | Hoja de datos del módulo | Confirmada por hoja de datos del componente seleccionado | Nada |
| ESP32: reposo profundo 10 µA | Hoja de datos del módulo | **Confirmada para el módulo, no para la placa de desarrollo que adquiere la BOM** | Medir el reposo de la placa efectivamente montada, ya intervenida en taller |
| Intervención de taller sobre la placa de desarrollo | Decisión de diseño de este informe | Procedimiento definido, no ejecutado | Ejecutarlo sobre unidades piloto y medir antes y después |
| ESP32: FCC ID 2AC7Z-ESPWROOM32 | Certificado modular del fabricante | Confirmada | Verificar que la integración respeta las condiciones del certificado modular |
| BME280: ±1,0 °C, ±3 % HR, ±1,0 hPa, 0,1 µA en reposo | Hoja de datos Bosch del componente exacto | Confirmada por hoja de datos del componente seleccionado | Verificar la respuesta térmica montado tras el respiradero |
| SP3485: 2 mA con driver habilitado | Hoja de datos del transceptor exacto | Confirmada por hoja de datos del componente seleccionado | Nada |
| HT7533-1: 2,5 µA de quiescente | Hoja de datos del regulador exacto | Confirmada por hoja de datos del componente seleccionado | Nada |
| Sonda 7-en-1: rangos y exactitudes de las 7 variables | Ficha de una sonda representativa de la familia; el SKU de `supuestos.json` no tiene ficha propia publicada | Representativa de la familia, no del SKU | Exigir la ficha del SKU al proveedor antes de la orden de compra y contrastar con la campaña de 30 muestras |
| Sonda: alimentación 5–24 V DC y consumo 30 mA a 5 V | Descripción del vendedor (4,5–30 V; 0,15 W a 12 V; 0,5 W a 24 V) más supuesto propio de potencia constante | Supuesto de diseño sobre declaración del vendedor | Medir consumo y exactitud a 5 V; si la exactitud se degradara, elevar a 12 V |
| Sonda: acero inoxidable 316L | Descripción del vendedor | Declaración del vendedor | Certificado de material o ensayo; afecta la vida útil en suelos salinos |
| Circuito cargador/protección: ≈5 µA en vigilancia | Estimación conservadora de diseño | Estimación de diseño, no medida | Medir en banco sobre el módulo finalmente adquirido |
| Elevador: eficiencia η ≈ 0,85 | Valor típico de convertidores de esta clase y corriente | Estimación de diseño, no medida | Medir la eficiencia real a la corriente de excitación de la sonda |
| Divisor de batería: 1,85 µA | Cálculo directo (3,7 V / 2 MΩ) | Calculada a partir de una decisión de diseño | Verificar con las resistencias reales y su tolerancia |
| Reposo del sistema ≈19,4 µA y autonomía de 8,5 meses | Suma de las líneas anteriores referida a la batería, **sobre la placa ya intervenida** | Calculada; hereda la incertidumbre de las estimaciones y de la intervención | Medición del reposo de la placa completa; la Tabla 4.6 acota el peor caso |

###### **Tabla 5.4 “Estado Probatorio de las Especificaciones de Hardware”**

La conclusión de esta clasificación define la prioridad de la etapa siguiente: toda la electrónica de control está confirmada por hojas de datos de componentes exactos, y la incertidumbre relevante se concentra en dos puntos —la sonda, que además concentra el 59,1 % del costo de materiales, y el reposo de la placa de desarrollo una vez intervenida—. Ambas se atacan con el mismo gasto y en el mismo mes, y ambas preceden a cualquier compromiso de volumen de compra.

**Condiciones Técnicas y Normativas Respecto al Diseño:**

El marco regulatorio aplicable al proyecto TerraSense organiza su cumplimiento normativo en seis dominios fundamentales: hardware y seguridad eléctrica, radiofrecuencia y telecomunicaciones, buses industriales, estándares edafológicos, protección de datos y accesibilidad, y protección al consumidor.

**Hardware:**

* **IEC 60529 \[10\]:** Define y clasifica los grados de protección proporcionados por las envolventes. El proyecto adopta **IP67 como objetivo de diseño** (estanco al polvo e inmersión a 1 metro durante 30 minutos), materializado mediante una envolvente en PETG con sellado intercapa, *O-ring* de silicona y prensaestopas M12. Debe precisarse el alcance exacto de la norma: **no obliga a que un medidor agrícola sea IP67**, sino que permite clasificar la protección conforme al ensayo aplicable. Un *O-ring*, un tipo de filamento o una certificación del módulo de radio no acreditan automáticamente el equipo terminado. La clasificación solo podrá declararse tras el ensayo de ingreso de polvo y agua sobre el producto final, ensayo que además debe compatibilizarse con el respiradero que el sensor ambiental exige.
* **UN 38.3 / IEC 62133-2 \[11\]:** Corresponden a ámbitos distintos y complementarios: IEC 62133-2 rige la seguridad de las celdas de ion-litio secundarias, mientras UN 38.3 define los ensayos exigibles para su transporte. El diseño lo aborda integrando una celda comercial con certificación de origen y protección electrónica incorporada, y exige reunir la documentación de la celda además de revisar la configuración de entrega del producto.
* **RoHS 2011/65/EU y RoHS 3 (2015/863):** Restringe el uso de metales pesados en la electrónica. El proyecto exige el uso de soldadura sin plomo (aleación SAC305) y componentes con declaración de conformidad del proveedor.
* **Ley N° 20.920 (Ley REP, Chile) \[9\]:** Establece la responsabilidad extendida del productor sobre residuos prioritarios, incluyendo pilas, baterías y aparatos eléctricos y electrónicos. Se responde mediante un diseño desmontable con herramientas comunes y celda extraíble, requiriendo habilitar un canal de recepción al fin de la vida útil del equipo y revisar las obligaciones concretas que apliquen al volumen de comercialización.

**Radiofrecuencia y Telecomunicaciones:**

* **Régimen de equipos de alcance reducido, SUBTEL \[12\]:** Norma técnica chilena para equipos que operan en bandas de uso libre. El enlace Bluetooth del proyecto opera a +9 dBm (equivalentes a unos 8 mW radiados), muy por debajo de los límites del régimen exento de licencia. Corresponde precisar que **la potencia radiada no equivale a la potencia consumida en bornes de batería** y que sus límites no deben confundirse entre sí.
* **Actualización del régimen de certificación \[13\]:** SUBTEL mantiene un procedimiento vigente desde febrero de 2026 para equipos de alcance reducido. Su revisión debe realizarse sobre la configuración final del producto y la documentación exigible, **sin considerar una certificación FCC o CE como sustituto universal de los requisitos chilenos**. Este trámite queda declarado como pendiente de verificación formal antes del lanzamiento comercial.
* **FCC, Título 47 CFR Parte 15, subpartes B y C \[14\]:** Límites de emisiones para dispositivos no licenciados. El proyecto parte de una posición favorable al utilizar el módulo ESP32-WROOM-32, pre-certificado con FCC ID 2AC7Z-ESPWROOM32; esa certificación cubre el módulo, no el equipo terminado.

**Buses Industriales:**

* **TIA/EIA-485-A \[15\]:** Define los niveles eléctricos y la terminación de un bus diferencial multipunto. Es el fundamento técnico-normativo para elegir RS-485 sobre I²C para la comunicación cableada en terreno, y determina los requisitos de polaridad A/B, referencia de masa, terminación y limitación de transitorios que el esquema debe resolver.
* **Modbus Application Protocol Specification V1.1b3 \[16\]:** Rige la estructura de la comunicación, definiendo la función 0x03 (lectura de registros *holding*), el mecanismo de verificación CRC-16 y los tiempos de silencio exigidos entre tramas con la sonda de suelo. Estas verificaciones son las que permiten distinguir formalmente un error de comunicación de una lectura agronómica crítica.

**Estándares Edafológicos:**

* **ISO 10390:** Método de referencia para la determinación de pH en suelo. Fundamenta la interpretación de la lectura de pH y su contraste contra laboratorio.
* **ISO 11265 \[17\]:** Método de referencia para la conductividad eléctrica específica del suelo. Fundamenta la normalización de la lectura de CE a 25 °C, aplicando un coeficiente térmico de 2 %/°C.
* **ISO 11277 \[18\]:** Método de granulometría y textura. Actúa como base para la clasificación textural declarada por el usuario en la aplicación móvil, que alimenta los umbrales hídricos de la Tabla 4.1.
* **Métodos oficiales SAG / INIA:** Criterios de interpretación agronómica nacional utilizados para calibrar los umbrales de la matriz de cultivos. La validación instrumental debe especificar método de referencia, profundidad y condición de humedad, reconociendo que una comparación entre lectura directa en terreno y extracto de laboratorio no evalúa exactamente el mismo procedimiento.

**Datos, Seguridad de la Información y Accesibilidad:**

* **Ley N° 19.628 y Ley N° 21.719 (Protección de Datos Personales, Chile) \[19\]:** Exigen consentimiento y garantizan derechos del titular. La **Ley N° 21.719 entra en vigor el 1 de diciembre de 2026**, por lo que el proyecto debe diseñarse directamente bajo ese marco y no bajo el régimen anterior. A nivel de arquitectura se aplica Seguridad a Nivel de Fila (*Row Level Security*) en la base de datos, garantizando aislamiento estricto por campo y rol, y los datos son exportables por el usuario. Corresponde precisar que el uso de RLS y autenticación ayuda a controlar accesos pero **no resuelve por sí solo todas las obligaciones de tratamiento**: deben definirse finalidad, información al titular, plazos de conservación, ejercicio de derechos y alojamiento de datos, con especial atención a la georreferenciación de campos, que constituye información sensible para el agricultor.
* **ISO/IEC 27001:2022 e ISO/IEC 25010 \[20\]:** El desarrollo de la plataforma se rige por cifrado en tránsito (TLS) y en reposo, control de acceso segmentado y criterios internacionales de fiabilidad, usabilidad y mantenibilidad de software.
* **WCAG 2.1, nivel AA \[21\]:** Pautas de accesibilidad digital implementadas en la app: contraste mínimo de 4,5:1 y prohibición del uso del color como único portador de información, razón por la cual el semáforo de diagnóstico siempre se acompaña de texto explicativo.

**Protección al Consumidor:**

* **Ley N° 21.398 ("Pro Consumidor") \[22\]:** Extiende la garantía legal a 6 meses y obliga a informar la vida útil y la disponibilidad de repuestos. A nivel de negocio, el proyecto incorpora una provisión del 5 % del costo de materiales para atender esta garantía —cuantificada en $4.059 por unidad en la Tabla 2.3— y asume el compromiso de mantener *stock* de partes, coherente con el diseño desmontable de la carcasa.
* **Ley N° 19.496 \[23\]:** Prohíbe la publicidad engañosa. Constituye la barrera normativa formal por la cual el proyecto declara el equipo comercialmente como "diseñado conforme a IP67" en lugar de "certificado IP67" hasta que los laboratorios documenten el ensayo final, y por la cual toda cifra de autonomía se publica **identificada como valor calculado** mientras no exista la medición sobre el equipo completo e intervenido. Ambas restricciones son, antes que una exigencia legal, una decisión de honestidad técnica del proyecto.

**Clasificación Normativa y Requisitos Verificables:**

El listado anterior mezcla normas de cumplimiento legal ineludible en Chile con estándares adoptados voluntariamente y con referencias pensadas para una eventual exportación. Presentarlas al mismo nivel sería engañoso, de modo que se clasifican aquí y, sobre todo, se expresan como requisitos de diseño con método de verificación, criterio de aceptación y evidencia archivable.

> **Fuente de verdad:** el desarrollo normativo completo, con el detalle de cada norma y su alcance, está en [`docs/MARCO_NORMATIVO_Y_ESTANDARES.md`](MARCO_NORMATIVO_Y_ESTANDARES.md). El estado de cada comprobación física se lleva en el [plan de validación](PLAN_VALIDACION.md); los perímetros de acceso que sustentan las filas de protección de datos están en `supabase/migrations/*.sql`.

| Norma | Carácter | Requisito de diseño derivado | Método de verificación, criterio y evidencia | Estado |
| :---- | :---- | :---- | :---- | :---: |
| Ley N° 20.920 (REP) | Obligatoria (Chile) | Diseño desmontable con celdas extraíbles y canal de recepción al fin de vida útil | Ensayo de desmontaje sin herramientas especiales y convenio con gestor autorizado. Criterio: celda extraíble y punto de recepción operativo. Evidencia: procedimiento y convenio firmado | Pendiente |
| SUBTEL, Res. Exenta N° 1.985/2017 | Obligatoria (Chile) | Enlace BLE a +9 dBm (≈8 mW), con margen frente al límite aplicable | Medición en banda 2,4 GHz sobre la unidad ensamblada, **previa confirmación documental de cuál es el límite vigente y sobre qué magnitud se mide**. Criterio: cumplir el límite acreditado con margen. Evidencia: extracto de la resolución e informe de medición | Pendiente |
| SUBTEL, Resolución N° 737/2025 | Obligatoria (Chile) | Verificación formal del producto terminado, con cargo al rubro de desarrollo y validación | Trámite ante la autoridad sectorial. Criterio: resolución favorable previa a la comercialización. Evidencia: expediente y resolución | Pendiente |
| UN 38.3 / IEC 62133-2 | Obligatoria (transporte y comercialización de celdas de litio) | Celdas comerciales con certificación de origen y protección electrónica del cargador | Certificados del proveedor y ensayo de las protecciones. Criterio: certificados vigentes y corte por sobrecarga, sobredescarga y cortocircuito. Evidencia: certificados y acta de ensayo | Pendiente |
| Ley N° 19.628 | Obligatoria (Chile) | Aislamiento por campo y rol; datos exportables por el titular | Pruebas de acceso cruzado entre cuentas y verificación de exportación. Criterio: cero lecturas de campos ajenos y exportación completa a solicitud. Evidencia: batería de pruebas de Row Level Security | Parcial: aislamiento implementado, exportación no implementada |
| Ley N° 21.719 | Obligatoria (Chile) | Registro de actividades de tratamiento y procedimiento escrito de notificación de vulneraciones | Revisión documental antes de abrir la primera cuenta comercial. Criterio: registro y procedimiento redactados con responsable designado. Evidencia: documentos firmados | Pendiente |
| Ley N° 21.398 (“Pro Consumidor”) | Obligatoria (Chile) | Garantía legal de 6 meses más provisión del 5 % de BOM | Revisión legal de las condiciones y provisión contable. Criterio: cobertura ≥ 6 meses y provisión reservada. Evidencia: texto de garantía y asiento de provisión | Parcial |
| Ley N° 19.496 | Obligatoria (Chile) | Declaración comercial como “diseñado conforme a IP67” hasta contar con ensayo | Auditoría del material comercial. Criterio: ninguna pieza declara IP67 certificado sin ensayo. Evidencia: material revisado y aprobado | Cumple |
| Alimentación sin adaptador de red | Obligatoria si cambiara (Chile) | El equipo se vende con cable USB-C y sin fuente conectada a la red domiciliaria | Verificación del contenido del empaque. Criterio: ningún adaptador de red incluido; si se incluyera, exigir su protocolo de aprobación SEC. Evidencia: lista de empaque aprobada | Cumple |
| IEC 60529 (IP67) | Voluntaria como estándar; **exigible como declaración** una vez publicada, por efecto de la Ley N° 19.496 | Envolvente PETG con O-ring, sellado intercapa, prensaestopas M12 y respiradero protegido | Ensayo IP67 en laboratorio acreditado sobre el conjunto ensamblado, incluido el respiradero. Criterio: sin ingreso de agua tras 30 min a 1 m. Evidencia: informe de ensayo | Pendiente |
| Métodos oficiales SAG / INIA | Voluntaria (referencia técnica nacional adoptada) | Umbrales de la matriz de cultivos trazables a criterios oficiales publicados | Contraste de cada umbral de `App/src/engine/agronomyEngine.ts` con su fuente oficial. Criterio: trazabilidad documental de cada umbral. Evidencia: tabla umbral–fuente con fecha de consulta | Pendiente |
| RoHS 2011/65/EU y RoHS 3 | Voluntaria en Chile / referencia de mercado futuro | Soldadura SAC305 y declaración de conformidad de proveedores | Recopilación de declaraciones. Criterio: cobertura documental de la BOM. Evidencia: carpeta de declaraciones | Pendiente |
| FCC, Título 47 CFR Parte 15 | Referencia de mercado futuro (EE. UU., no exigible en Chile) | Cubierto de forma incidental por el módulo pre-certificado | Verificación del FCC ID y de las condiciones del certificado modular. Criterio: integración dentro del alcance declarado. Evidencia: ficha del módulo | No aplica en Chile |
| TIA/EIA-485-A y Modbus V1.1b3 | Voluntaria (estándares técnicos abiertos) | Base de diseño del bus RS-485 y de la trama Modbus RTU | Prueba de bus con analizador lógico. Criterio: terminación correcta y cero errores de CRC en 1.000 lecturas consecutivas. Evidencia: captura y registro de errores | Parcial |
| ISO 10390, ISO 11265, ISO 11277, ISO 11465 | Voluntaria (métodos de referencia de laboratorio) | Métodos de contraste del protocolo de validación in situ | Protocolo de la Tabla 5.6 contra laboratorio **acreditado bajo ISO/IEC 17025**. Criterio: el fijado en el propio protocolo. Evidencia: informes de laboratorio y análisis de concordancia | Pendiente |
| ISO/IEC 27001:2022 e ISO/IEC 25010 | Voluntaria (gestión y calidad de software) | Cifrado en tránsito y reposo, control de acceso segmentado | Revisión de configuración y segmentación. Criterio: TLS vigente y ausencia de credenciales embebidas. Evidencia: informe de revisión | Parcial |
| WCAG 2.1, nivel AA | Voluntaria (no exigida por ley a aplicaciones privadas en Chile) | Contraste ≥ 4,5:1, área táctil ≥ 48×48 dp y color no exclusivo | Auditoría de accesibilidad sobre las pantallas de la App. Criterio: contraste ≥ 4,5:1 y ninguna información solo por color. Evidencia: informe de auditoría | Pendiente |

###### **Tabla 5.5 “Clasificación Normativa: Obligatoria, Voluntaria y de Mercado Futuro”**

Dos filas merecen comentario porque corrigen clasificaciones habituales. Los **métodos SAG / INIA** no son una obligación legal sobre un instrumento privado: son criterios de interpretación agronómica que el proyecto adopta voluntariamente, y clasificarlos como obligatorios debilitaría la propia matriz. La **IEC 60529** sí es un estándar voluntario, pero desde el momento en que el material comercial declara “diseñado conforme a IP67” la afirmación queda sujeta a la Ley N° 19.496 y deja de ser voluntaria en sus efectos; por eso su carácter se enuncia en dos partes.

**Protocolo de Validación de la Medición In Situ contra Laboratorio de Referencia:**

El objetivo específico de validar la precisión instrumental exige un protocolo concreto. Antes del detalle corresponde una decisión de alcance: **la campaña valida cuatro de las diez variables del sistema**. Se validan humedad volumétrica, pH, conductividad eléctrica y textura, porque las tres primeras sustentan las recomendaciones de riego, encalado y lavado de sales que produce `App/src/engine/agronomyEngine.ts`, y la cuarta es el parámetro que el usuario declara y que modula los umbrales. Quedan fuera la temperatura de suelo, resuelta con termómetro patrón en la calibración de fábrica, y las tres magnitudes del BME280, confirmadas por hoja de datos del componente exacto y cuyo riesgo real es de montaje.

Quedan fuera también, y esto es lo más importante, **N, P y K**. La exclusión es deliberada y coherente con el resto del sistema: esos tres valores no son determinaciones químicas independientes sino derivaciones de la conductividad eléctrica, de modo que contrastarlos contra laboratorio mediría la correlación entre salinidad y fertilidad de los suelos muestreados, no la exactitud del instrumento. Validarlos sugeriría una capacidad analítica que la sonda no tiene. Por esa misma razón el motor los devuelve como registros informativos con advertencia permanente y con veto de confianza sobre `EC_UMBRAL_CONFIANZA_NPK`: la limitación se resuelve en la interfaz, no en la campaña de laboratorio.

| Elemento del protocolo | Especificación |
| :---- | :---- |
| Variables validadas | Humedad volumétrica, pH, conductividad eléctrica y textura |
| Variables excluidas y motivo | N, P y K, por ser derivaciones de la conductividad y no determinaciones independientes; temperatura de suelo, resuelta con termómetro patrón; magnitudes del BME280, confirmadas por hoja de datos |
| Tamaño de muestra | N ≥ 30 puntos en total y **no menos de 10 por clase textural**, submuestreados el mismo día para envío a laboratorio |
| Diversidad de suelos | Al menos 3 clases texturales (franco, arcilloso, arenoso), cubriendo el rango útil de pH (4,5–8,5) y de CE (0–5.000 µS/cm), que es donde se toman las decisiones agronómicas reales |
| Referencia de laboratorio | pH según ISO 10390; CE según ISO 11265; textura según ISO 11277; humedad volumétrica por gravimetría según ISO 11465. Laboratorio **acreditado bajo ISO/IEC 17025** para los ensayos solicitados |
| Estadístico de concordancia | R² entre lectura in situ y laboratorio; RMSE en la unidad nativa de cada variable; Bland-Altman para detectar sesgo sistemático |
| Umbral de aceptación | Umbral agronómico propio: pH, RMSE ≤ 0,3 unidades; CE, RMSE ≤ 10 % de la lectura o 200 µS/cm, el mayor; humedad volumétrica, RMSE ≤ 4 puntos porcentuales. Además R² ≥ 0,80 y ausencia de sesgo proporcional significativo (p < 0,05) |
| Alcance del resultado | La campaña detecta sesgo grueso y desviación sistemática. El ajuste fino de coeficientes requiere una segunda campaña sobre la base instalada |
| Acción si no se cumple | La variable se marca como “referencial” en la App y deja de sustentar prescripción cuantitativa hasta recalibrar el coeficiente o sustituir el sensor |

###### **Tabla 5.6 “Protocolo de Validación In Situ vs. Laboratorio de Referencia”**

**Por qué un umbral propio y no el del fabricante.** Una formulación aparentemente más rigurosa sería exigir que el error no supere la exactitud declarada por el fabricante, es decir ±0,1 unidades de pH. No se adopta, por dos razones. La primera es de evidencia: esa exactitud proviene de una ficha de familia y no del SKU, como declara la Tabla 5.4, de modo que sería medirse contra un número que el propio proyecto reconoce no tener verificado. La segunda es de pertinencia: ±0,1 unidades es una exigencia de laboratorio, y el producto de este instrumento no es una cifra sino una decisión de manejo. Un error de 0,3 unidades de pH no cambia la recomendación de encalado de ningún cultivo de la matriz; uno de 0,8 sí. El umbral debe fijarse donde la decisión cambia.

**Plan de Calibración y Control de Deriva:**

La validación anterior responde si el instrumento concuerda con el laboratorio en un momento dado. No responde cómo se calibra cada equipo antes de salir de taller ni cómo se detecta la deriva con el uso. La calibración no se ejecuta reescribiendo el firmware sino ajustando coeficientes residentes en la memoria no volátil del ESP32, actualizables de forma remota; esa decisión de arquitectura es la que hace viable corregir un equipo en terreno sin recuperarlo.

| Etapa | Qué se hace | Periodicidad | Criterio de aceptación | Evidencia que queda |
| :---- | :---- | :---- | :---- | :---- |
| Calibración de fábrica | Verificación contra soluciones patrón de pH (4,00 y 7,00) y de CE (1.413 y 12.880 µS/cm), contraste de temperatura contra termómetro patrón y ajuste de coeficientes en memoria no volátil | Una vez por equipo, antes del despacho | Desviación dentro del umbral agronómico de la Tabla 5.6 | Certificado de calibración individual con número de serie, fecha y valores medidos |
| Compensación térmica de la CE | Verificación de la normalización a 25 °C con el coeficiente de 2 %/°C exigido por ISO 11265 | Una vez por equipo, dentro de la calibración de fábrica | Error ≤ 3 % entre 5 °C y 35 °C | Registro de la curva de verificación térmica |
| Verificación periódica por el usuario | Comprobación con solución patrón de pH 7,00 mediante rutina guiada de la App | Al inicio de cada temporada, o cada 6 meses | Desviación ≤ 0,3 unidades de pH | Registro en el histórico del equipo, con fecha y resultado |
| Recalibración correctiva | Ajuste remoto de coeficientes sobre el equipo específico, sin recuperarlo ni reemplazar el firmware | Cuando la verificación periódica excede el umbral | La verificación posterior vuelve a cumplir | Registro del coeficiente anterior y del nuevo, con justificación |
| Retiro de la variable | La variable se marca como “referencial” y deja de sustentar recomendaciones cuantitativas | Cuando la recalibración no recupera el criterio | — | Aviso en la pantalla de la variable y en el histórico |
| Control de deriva de la flota | Seguimiento agregado de las verificaciones sincronizadas, para distinguir un equipo desviado de un patrón de lote | Revisión semestral | Ningún lote con desviación media creciente y sostenida | Informe de deriva por lote de fabricación |

###### **Tabla 5.7 “Plan de Calibración y Control de Deriva”**

Tres precisiones. La primera es de alcance: la verificación del usuario emplea solución patrón de pH, barata y de uso corriente en agricultura, y su función es detectar que algo se desvió, no cuantificarlo con precisión metrológica. La segunda es de costo: la calibración de fábrica es trabajo de taller contenido en las 2,25 horas por equipo que `finanzas/supuestos.json` presupuesta en `horas_unidad`, mientras las soluciones patrón y el instrumental se cargan a la partida de metrología del rubro de desarrollo y validación. La tercera es de honestidad: la periodicidad semestral y los umbrales se fijan sobre el comportamiento típico de electrodos de pH y sondas de conductividad, y deben confirmarse con la deriva real del SKU adquirido durante la primera temporada.

**Criterios de Cierre Técnico:**

Para cerrar este capítulo corresponde declarar con precisión qué separa el diseño actual de un producto verificado. El archivo de PCB en KiCad no contiene todavía una placa ruteada y el repositorio no incluye el código fuente del firmware del ESP32; la existencia de un esquema, de un decodificador o de un diagrama no sustituye el cierre técnico. Ese cierre requiere que la cadena completa produzca capturas verificables y que el montaje coincida con los componentes presupuestados:

| Área | Comprobación propuesta | Evidencia que se conservará |
| :---- | :---- | :---- |
| **Sonda y Modbus** | Ficha, tensión, mapa de registros y respuestas ante fallo | SKU adquirido, capturas seriales y casos de prueba |
| **BME280** | Tres lecturas locales y respuesta dentro de la carcasa | Capturas I²C, referencia ambiental y disposición física |
| **BLE** | Versión, identidad de captura, escalas y reconexión | Paquetes capturados y comparación app/instrumento |
| **Aplicación** | Contexto de cultivo, Grid, datos faltantes y pronóstico | Casos de uso y pruebas por escenario |
| **Persistencia** | Sin GPS, sin red, reintento y cambio de cuenta | Registros locales y remotos conciliados |
| **Energía** | Corriente desde batería por estado y temperatura | Perfiles medidos y cálculo de carga por jornada |
| **Carcasa** | Montaje, acceso, ventilación, caída y sellado | CAD, proceso, fotografías y resultados de ensayo |
| **Producción** | Montaje y pruebas repetibles por equipo | Tiempo por operación, rechazo y retrabajo |

###### **Tabla 4.9 “Criterios de Cierre Técnico y Evidencia”**

<a id="conclusiones"></a>

6. #### **Conclusiones**

El desarrollo conceptual y la evaluación del proyecto TerraSense plantean la posibilidad de ampliar el acceso a seguimiento agrícola, sujeta a validación técnica y comercial. Desde la perspectiva ingenieril, la arquitectura seleccionada —un nodo portátil de captura basado en ESP32, sonda industrial RS-485, sensor ambiental BME280 y batería de litio recargable, que transfiere los datos al smartphone del usuario— resuelve de forma efectiva la barrera de adopción tecnológica. Su adecuación al recorrido de terreno proviene precisamente de esa distribución de funciones: el operador puede muestrear distintos puntos, revisar las causas del diagnóstico y conservar los antecedentes de la visita, sin depender de cobertura celular durante la medición. La comparación técnica reconoce, además, que estaciones fijas, redes LoRaWAN y conexiones cableadas resuelven de forma válida otros requerimientos; la elección de este proyecto responde al problema que declaró resolver, no a una supuesta superioridad universal.

El sensor ambiental BME280 ocupa una función central y claramente distinta de la API meteorológica. Temperatura del aire, humedad relativa y presión barométrica completan las tres tarjetas ambientales locales del Grid 2×5, mientras el pronóstico de cinco días complementa la planificación posterior y permite recomendar la revisión de una fecha de siembra ante lluvia o calor previstos. La reorganización propuesta del Grid presenta diez tarjetas para diez registros de sensores y conserva el carácter estrictamente informativo de los valores N/P/K, que se derivan de la conductividad eléctrica y no de una determinación química independiente.

La implementación de un diseño energético estricto, basado en *power gating* para cortar físicamente la alimentación de la rama de medición en reposo, sigue siendo la decisión correcta y la de mejor relación costo-beneficio del hardware. El balance energético se plantea ahora **por nodo de tensión y en unidades de energía (mWh)**, con la eficiencia del elevador y la pérdida del regulador lineal explícitas, y arroja una autonomía de aproximadamente **8,5 meses (256 días, más de 2.500 mediciones)** con una sola carga. Corresponde declarar con la misma claridad qué tipo de cifra es esa: un **resultado calculado, no medido**, condicionado además a que cada placa de desarrollo se intervenga en taller según el procedimiento descrito junto a la Tabla 4.6. Sin esa intervención la autonomía cae a un mes escaso, y con una fuga no identificada de 1 mA, a 1,8 meses. Las cifras anteriores de 784 días y de 8 a 12 meses quedan retiradas: fueron calculadas sobre un banco de 6.000 mAh que ya no forma parte del diseño. La ventaja ambiental frente a los instrumentos alimentados por pilas primarias es real —recarga de la misma celda por USB-C, carcasa desmontable y reparación por módulos— pero se enuncia con precisión: **reduce** el flujo de residuos a una celda por ciclo de vida, no lo elimina, porque una celda de litio recargable es igualmente un residuo prioritario bajo la Ley N° 20.920.

Desde el punto de vista financiero, el proyecto se sostiene como un modelo de negocio viable y auditable, aun proyectando un escenario de introducción de mercado conservador de 200 unidades el primer año.

<!-- INFORME:CIERRE:INICIO -->

En el escenario base el proyecto presenta **VAN de $116.325.391**, **TIR efectiva anual de 54,03 %** y **payback simple de 3,68 años**. La BOM asciende a **$69.632 netos por equipo** y el precio de lista derivado es de **$449.337 con IVA**. La empresa cancela su crédito dentro del horizonte y cierra 2036 con $552.328.478 de caja.

<!-- INFORME:CIERRE:FIN -->

Ese nivel de detalle mensual, que una proyección anual agregada no habría revelado, expone las dos tensiones que el proyecto debe administrar y que este informe no oculta: los dos primeros ejercicios cierran con pérdida, de modo que el arranque exige mantener íntegro el capital de trabajo; y la sensibilidad muestra que no existe holgura alguna sobre el precio de venta, que constituye un techo estratégico y no un punto de negociación.

En síntesis, TerraSense cumple con éxito su objetivo general: lograr que una medición física se convierta, en el mismo lugar, en una decisión agronómica correcta. Al eliminar los costos recurrentes y transformar valores numéricos planos en instrucciones de manejo claras, el proyecto mitiga el riesgo de pérdida de cosechas, protege el patrimonio familiar del pequeño agricultor y fomenta la resiliencia hídrica del sector agrícola nacional. El resultado económico y el diseño técnico convergen en una misma decisión: construir una herramienta útil que pueda fabricarse, mantenerse y respaldarse con el margen presupuestado. Los próximos cierres se concentran en la medición del consumo de reposo de la placa ensamblada e intervenida, en la ficha técnica del SKU de sonda, en la integración ambiental de extremo a extremo y en los ensayos del equipo terminado, trabajos que este informe deja identificados con su evidencia esperada y su criterio de aceptación precisamente para que puedan ejecutarse y defenderse.

<a id="referencias"></a>

<a id="referencias-bibliográficas"></a>

7. #### **Referencias bibliográficas**

1. Instituto Nacional de Estadísticas (INE), Chile. (2021). Censo Agropecuario y Forestal 2021\. Resultados finales, gráficas nacionales. Recuperado de [https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales](https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales)
2. ODEPA. (2021). Censo Agropecuario y Forestal 2021: distribución de las unidades productivas y sus cambios respecto al Censo 2007\. Recuperado de [https://www.odepa.gob.cl/publicaciones/articulos/censo-agropecuario-y-forestal-2021-distribucion-de-las-unidades-productivas](https://www.odepa.gob.cl/publicaciones/articulos/censo-agropecuario-y-forestal-2021-distribucion-de-las-unidades-productivas)
3. INDAP. (s.f.). Agricultura Familiar Campesina. Recuperado de [https://www.indap.gob.cl/agricultura-familiar-campesina](https://www.indap.gob.cl/agricultura-familiar-campesina)
4. Centro de Ciencia del Clima y la Resiliencia (CR)². (s.f.). Informe a la Nación: La mega sequía 2010–2015 una lección para el futuro. [Recuperado de https://www.cr2.cl/megasequia/](https://www.cr2.cl/megasequia/)
5. ODEPA. (s.f.). Boletín macroeconómico y evolución reciente de los precios de los fertilizantes. Recuperado de [https://www.odepa.gob.cl/publicaciones/articulos/evolucion-reciente-de-los-precios-de-los-fertilizantes](https://www.odepa.gob.cl/publicaciones/articulos/evolucion-reciente-de-los-precios-de-los-fertilizantes)
6. Bluelab. (s.f.). Pulse Multimedia EC/MC Meter y preguntas frecuentes sobre energía y uso. Recuperado de [https://support.bluelab.com/bluelab-pulse-meter-faq](https://support.bluelab.com/bluelab-pulse-meter-faq)
7. Hanna Instruments. (s.f.). GroLine HI9814. Precio de referencia US$294. Recuperado de [https://hannainst.com/groline-waterproof-portable-ph-ec-tds-meter/](https://hannainst.com/groline-waterproof-portable-ph-ec-tds-meter/)
8. Spectrum Technologies. (s.f.). FieldScout TDR 350\. Precio de referencia US$1.495. Recuperado de [https://www.specmeters.com/FieldScout-TDR350-Soil-Moisture-Meter](https://www.specmeters.com/FieldScout-TDR350-Soil-Moisture-Meter)
9. Ministerio del Medio Ambiente. (2016). Ley N° 20.920: Marco para la gestión de residuos, la responsabilidad extendida del productor y fomento al reciclaje (REP). Recuperado de [https://www.bcn.cl/leychile/Navegar?idNorma=1090894](https://www.bcn.cl/leychile/Navegar?idNorma=1090894)
10. International Electrotechnical Commission (IEC). (s.f.). *IEC 60529: Degrees of protection provided by enclosures (IP Code)*. Recuperado de [https://webstore.iec.ch/publication/2452](https://webstore.iec.ch/publication/2452)
11. Organización de las Naciones Unidas (ONU) / IEC. (s.f.). *UN 38.3 / IEC 62133-2: Ensayos de transporte y seguridad de celdas y baterías secundarias de ion-litio*. Recuperado de [https://webstore.iec.ch/publication/60070](https://webstore.iec.ch/publication/60070)
12. Subsecretaría de Telecomunicaciones (SUBTEL). (s.f.). *Equipos de alcance reducido: procedimiento vigente*. Recuperado de [https://www.subtel.gob.cl/equipos-de-alcance-reducido/](https://www.subtel.gob.cl/equipos-de-alcance-reducido/)
13. Subsecretaría de Telecomunicaciones (SUBTEL). (2025). *Resolución N° 737: Actualización del régimen de certificación de equipos de telecomunicaciones, vigente desde febrero de 2026*. Recuperado de [https://www.subtel.gob.cl/](https://www.subtel.gob.cl/)
14. Federal Communications Commission (FCC). (s.f.). *Título 47 CFR Parte 15, subpartes B y C*. Recuperado de [https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-15](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-15)
15. Telecommunications Industry Association (TIA). (1998). *Norma TIA/EIA-485-A: Características eléctricas de los generadores y receptores para su uso en sistemas multipunto digitales balanceados*. Recuperado de [https://global.ihs.com/](https://global.ihs.com/)
16. Modbus Organization. (2006). *Modbus over Serial Line Specification and Implementation Guide V1.02 y Modbus Application Protocol Specification V1.1b3*. Recuperado de [https://www.modbus.org/file/secure/modbusoverserial.pdf](https://www.modbus.org/file/secure/modbusoverserial.pdf)
17. Organización Internacional de Normalización (ISO). (1994). *ISO 11265: Calidad del suelo — Determinación de la conductividad eléctrica específica*. Recuperado de [https://www.iso.org/standard/19243.html](https://www.iso.org/standard/19243.html)
18. Organización Internacional de Normalización (ISO). (2009). *ISO 11277: Calidad del suelo — Determinación de la distribución del tamaño de partícula en material de suelo mineral (granulometría y textura)*. Recuperado de [https://www.iso.org/standard/54151.html](https://www.iso.org/standard/54151.html)
19. Ministerio Secretaría General de la Presidencia. (1999 y 2024). *Ley N° 19.628 sobre Protección de la Vida Privada y Ley N° 21.719 sobre protección y tratamiento de datos personales, vigente desde el 1 de diciembre de 2026*. Recuperado de [https://www.bcn.cl/leychile/Navegar?idNorma=1209272](https://www.bcn.cl/leychile/Navegar?idNorma=1209272)
20. Organización Internacional de Normalización (ISO) / IEC. (2022). *ISO/IEC 27001:2022 (Sistemas de gestión de seguridad de la información) e ISO/IEC 25010 (Calidad de software)*. Recuperado de [https://www.iso.org/standard/27001.html](https://www.iso.org/standard/27001.html)
21. World Wide Web Consortium (W3C). (2018). *Web Content Accessibility Guidelines (WCAG) 2.1, nivel AA*. Recuperado de [https://www.w3.org/TR/WCAG21/](https://www.w3.org/TR/WCAG21/)
22. Ministerio de Economía, Fomento y Turismo. (2021). *Ley N° 21.398 ("Pro Consumidor")*. Recuperado de [https://www.bcn.cl/leychile/navegar?idNorma=1170464](https://www.bcn.cl/leychile/navegar?idNorma=1170464)
23. Ministerio de Economía, Fomento y Turismo. (1997). *Ley N° 19.496: Establece normas sobre protección de los derechos de los consumidores*. Recuperado de [https://www.bcn.cl/leychile/navegar?idNorma=61438](https://www.bcn.cl/leychile/navegar?idNorma=61438)
24. Espressif Systems. (s.f.). *ESP32-WROOM-32E / ESP32-WROOM-32UE Datasheet*. Recuperado de [https://documentation.espressif.com/esp32-wroom-32e\_esp32-wroom-32ue\_datasheet\_en.html](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html)
25. Bosch Sensortec. (s.f.). *BME280 Datasheet: sensor combinado de humedad, presión y temperatura*. Recuperado de [https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf)
26. Open-Meteo. (s.f.). *Condiciones de acceso y licencia de la API meteorológica*. Recuperado de [https://open-meteo.com/en/pricing](https://open-meteo.com/en/pricing)
27. Servicio de Impuestos Internos (SII). (2025). *Circular N° 53: tasas de referencia del régimen Pro Pyme*. Recuperado de [https://www.sii.cl/normativa\_legislacion/circulares/2025/circu53.pdf](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf)
28. Proyecto TerraSense. (2026). *Supuestos económicos, modelo mensual en Python, BOM y flujo de caja*. Repositorio del proyecto: `finanzas/supuestos.json`, `finanzas/modelo.py`, `PCB/BOM_TerraSense.xlsx` y `Flujo de caja y financiamiento - TerraSense.xlsx`.
