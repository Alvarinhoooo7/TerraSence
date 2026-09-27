<!-- INFORME 1 de TerraSense. Contraparte en texto de la exportación

     `INFORME 1 .docx.pdf` de esta misma carpeta. Documento generado: no editar a mano. -->


<!-- ===== PAGINA 1 ===== -->


### TERRASENSE

### Álvaro Nicolás Villena Torrejón

Alan Paul Escobar Rojas Académico guía: Carlos Alberto Castillo Torres Santiago − Chile AÑO 2026 1


<!-- ===== PAGINA 2 ===== -->


### Índice general

- I. Introducción
- II. Descripción de la Problemática
- III. Propuesta de Solución Tecnológica
- IV. Objetivos del Proyecto
- V. Ingeniería Conceptual
  - Análisis de Viabilidad Técnica
  - Arquitectura de Conectividad
  - Análisis de Viabilidad Económica
  - Especificaciones Técnicas del Proyecto
  - Gestión Energética
  - Carcasa del Dispositivo
  - Criterios de Eficiencia Energética y Digitalización
  - Modelo de Autonomía en el Campo
  - Condiciones Técnicas y Normativas Respecto al Diseño
  - Protocolo de Validación de la Medición In Situ contra Laboratorio de Referencia
  - Plan de Calibración y Control de Deriva
  - Supuestos de Mercado
- VI. Conclusiones
- VII. Referencias Bibliográficas


### Índice de figuras

- Figura 1.0 “Diagrama de Decisiones y Consecuencias”
- Figura 1.1 “Diagrama de Flujo Arquitectura 8 Bits + Bluetooth Classic”
- Figura 1.2 “Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla”
- Figura 1.3 “Diagrama de Flujo Arquitectura con Datalogger Estacionario”
- Figura 1.4 “Diagrama de Flujo Arquitectura de Nodos con LoRaWAN”
- Figura 1.5 “Diagrama de Flujo Arquitectura de Sonda conectada al Teléfono”
- Figura 1.6 “Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo”
- Figura 1.7 “Diagrama de Flujo Arquitectura de Conectividad”
- Figura 1.8 “Árbol de Alimentación y Nodos de Tensión”
- Figura 1.9 “Representación Conceptual de Carcasa”


### Índice de tablas

- Tabla 1.0 “Distribución de Responsabilidades Funcionales del Sistema”
- Tabla 1.1 “Filtro de Viabilidad”
- Tabla 1.2 “Matriz de Decisiones”
- Tabla 1.3 “Comparativa de Microcontroladores”
- Tabla 1.4 “Comparativa de Sondas de Suelo”
- Tabla 1.5 “Comparativa de Sensores de Temperatura / Humedad / Presión Barométrica”
- Tabla 1.6 “Frontera Offline / Online del Sistema”
- Tabla 1.7 “Economías del análisis”
- Tabla 1.8 “Estructura de costos de fabricación (BOM) por equipo”
- Tabla 1.9 “Costeo de la carcasa impresa en taller propio”
- Tabla 2.0 “Costo variable por equipo”
- Tabla 2.1 “Equipamiento e inversión en activo fijo”
- Tabla 2.2 “Activo nominal (gastos de puesta en marcha)”
- Tabla 2.3 “Inversión inicial total”
- Tabla 2.4 “Condiciones del financiamiento”
- Tabla 2.5 “Tabla de amortización del crédito”
- Tabla 2.6 “Dotación por año”
- Tabla 2.7 “Sueldo bruto mensual por cargo y costo laboral anual”
- Tabla 2.8 “Desglose estimado de servicios básicos mensuales”
- Tabla 2.9 “Costos operacionales, de administración y de comercialización”
- Tabla 3.0 “Determinación del precio de venta”
- Tabla 3.1 “Estado de resultados proyectado”
- Tabla 3.2 “Flujo de fondos para la evaluación del proyecto”
- Tabla 3.3 “Evaluación económica”
- Tabla 3.4 “Comparación del horizonte de evaluación: cinco y diez años”
- Tabla 3.5 “VAN ante distintas tasas de descuento”
- Tabla 3.6 “Análisis de sensibilidad y punto de quiebre”
- Tabla 3.7 “Costo total de propiedad para el agricultor”
- Tabla 3.8 “Especificaciones Técnicas ESP32”
- Tabla 3.9 “Especificaciones Técnicas Sonda”
- Tabla 4.0 “Contrato de Datos BLE (20 bytes)”
- Tabla 4.1 “Estado Probatorio de las Especificaciones de Hardware”
- Tabla 4.2 “Gestión Energética”
- Tabla 4.3 “Interfaz Hardware”
- Tabla 4.4 “Pilares de Digitalización del Proceso Agrícola”
- Tabla 4.5 “Estados Energéticos y Medidas de Diseño”
- Tabla 4.6 “Balance Energético por Nodo de Tensión”
- Tabla 4.7 “Energía por Ciclo de Medición”
- Tabla 4.8 “Autonomía según el Patrón de Uso”
- Tabla 4.9 “Sensibilidad de la Autonomía al Consumo y al Uso”
- Tabla 5.0 “Análisis Comparativo de Parámetros”
- Tabla 5.1 “Clasificación Normativa: Obligatoria, Voluntaria y de Mercado Futuro”
- Tabla 5.2 “Protocolo de Validación In Situ vs. Laboratorio de Referencia”
- Tabla 5.3 “Plan de Calibración y Control de Deriva”
- Tabla 5.4 “Supuestos de Mercado Declarados”


## I. Introducción

La agricultura nacional enfrentó hasta hace muy poco tiempo un período decisivo marcado por la escasez hídrica persistente en la zona centro-sur y el encarecimiento de los insumos agroquímicos esenciales [1].

En este contexto, optimizar el uso del agua y los nutrientes es un requisito estricto de supervivencia económica para el pequeño y mediano productor. Sin embargo, existe una profunda brecha tecnológica que margina a este sector, los instrumentos de medición disponibles son económicamente difíciles de adquirir además de que entregan datos crudos (como valores aislados de conductividad o pH) que resultan incomprensibles sin una formación técnica especializada.

Para dar respuesta a esta problemática, el presente informe detalla el desarrollo y evaluación de TerraSense, un sistema integral de apoyo a la decisión sobre el terreno. Más que un simple sensor, la propuesta se basa en una arquitectura de bajo consumo que captura las variables físicas del suelo (mediante bus RS-485 con protocolo Modbus RTU) y del ambiente inmediato del punto de muestreo (mediante el sensor BME280 en bus I²C). Su innovación radica en delegar el procesamiento complejo al teléfono del agricultor vía Bluetooth Low Energy (BLE), transformando datos crudos en recomendaciones agronómicas accionables de forma inmediata, sin necesidad de conexión a internet durante la medición ni de suscripciones de pago. A lo largo de este documento se expone la ingeniería conceptual del sistema, justificando la selección de componentes, el diseño de gestión energética, el cumplimiento del marco regulatorio y la evaluación económica que respalda su viabilidad técnica y financiera.

En el teléfono una aplicación con motor agronómico determinista opera de manera estrictamente offline, interpretando las variables y presentándolas bajo un Grid 2×5 de fácil asimilación, categorizada por código de colores tipo semáforo y enriquecida con recomendaciones directas de labor según el cultivo, el tipo de suelo y la etapa fenológica (Pre-siembra, Vegetativo, Floración o Cosecha). Como complemento a la lectura local, el sistema consulta un pronóstico meteorológico a 5 días que contextualiza la labor a mediano plazo (evitando, por ejemplo, sembrar antes de un pronóstico temporal).

La ingeniería conceptual que fundamenta el proyecto se desarrolla en las siguientes secciones: la evaluación de alternativas, el dimensionamiento de mercado, el diseño electrónico y mecánico, el modelo financiero de rentabilidad a diez años, con comparación a cinco años, el marco normativo y el protocolo de validación experimental que sustentan su factibilidad técnica y económica.

6


<!-- ===== PAGINA 7 ===== -->


## II. Descripción de la Problemática

### Contexto del Sector Agrícola Nacional

La agricultura chilena es un pilar fundamental para la seguridad alimentaria y el desarrollo rural del país.

Según el último Censo Agropecuario y Forestal, el cual se realiza cada 10 años, existen más de 175.000 unidades productivas a nivel nacional [2, 3]. Dentro de este universo, la Agricultura Familiar Campesina (AFC) y los productores pequeños (con campos de 0,5 a 20 hectáreas) representan la base productiva del mercado interno [4]. Sin embargo, este sector se encuentra actualmente en un punto de vulnerabilidad histórica debido a la convergencia de dos factores extremos:

En primer lugar, el país atravesó una “mega sequía” ininterrumpida desde 2010, con un déficit de precipitaciones cercano al 30 % en la zona centro-sur [1]. Esta crisis hídrica no solo limita el riego, sino que altera las condiciones físico-químicas del terreno, promoviendo la salinización y degradación del suelo.

En segundo lugar, el escenario económico ha provocado una escalada sostenida en los costos operativos, especialmente impulsada por el alza internacional en los precios de los fertilizantes y agroquímicos [5].

En este escenario de estrechez hídrica y alto costo de insumos, la eficiencia productiva ya no es solo una oportunidad de mejora, sino un requisito estricto. La agricultura moderna exige optimizar cada gota de agua y cada gramo de nutriente aplicado. No obstante, para lograr esta eficiencia es imperativo contar con información precisa y en tiempo real sobre las condiciones del suelo, un requisito que choca frontalmente con la realidad tecnológica y económica del pequeño o mediano agricultor.

7


<!-- ===== PAGINA 8 ===== -->


### El Problema Central

El problema radica en que el pequeño y mediano agricultor no tiene acceso a herramientas tecnológicas adaptadas a su realidad económica y técnica para tomar decisiones agronómicas. Si bien existen en el mercado instrumentos para medir parámetros vitales como la humedad, temperatura, pH y conductividad eléctrica (CE), estos presentan una doble barrera de entrada para la Agricultura Familiar Campesina:

La Barrera Económica: El problema no es únicamente que estos instrumentos tengan una etiqueta de precio alto en términos absolutos, sino que entregan poca capacidad de medición e interpretación por cada peso invertido, y que esa inversión debe repetirse porque la alternativa formal es un servicio, no un activo.

Un medidor portátil básico como el Hanna HI9814 cuesta US$294 [6] y mide únicamente 4 variables (pH, CE, TDS y temperatura) en soluciones hidropónicas, sin ninguna capa de interpretación agronómica; las sondas de precisión de grado investigación superan los US$1.495 [7]. La alternativa formal, el análisis de laboratorio acreditado, cuesta en Chile del orden de $50.000 por muestra; a ese costo, nueve muestras ya igualan el precio completo de un instrumento propio, sin que el agricultor pueda repetir la medición al día siguiente sin costo marginal, ni reciba una recomendación de manejo lista para aplicar en el momento. La barrera real, entonces, no es el precio de compra aislado, sino la relación entre lo que el instrumento mide, interpreta y permite repetir en el tiempo, frente a lo que cuesta sostener esa misma información por la vía del servicio. Esa es la relación que este proyecto reformula, y su comparación completa de costo total de propiedad para el agricultor se desarrolla también en este informe, junto con la estrategia de precios.

La Barrera de Interpretación: Incluso si el agricultor logra adquirir uno de estos equipos, las herramientas actuales entregan “datos planos” (por ejemplo, un valor aislado de 2.500 µS/cm o un pH de 5.5). La mayoría de los pequeños productores no cuenta con la formación técnica especializada para interpretar si ese número es letal para su cultivo específico, ni saben cómo traducir ese dato crudo en una acción correctiva concreta (como calcular cuántos litros de agua aplicar para lavar las sales).

Esta falta de herramientas accesibles e intuitivas obliga al agricultor a operar “a ciegas” durante todo el proceso productivo. El costo de esa ceguera no se reparte de manera pareja a lo largo de la temporada: se concentra en cuatro momentos en los que la decisión, una vez tomada, ya no se puede deshacer. Son las mismas cuatro etapas fenológicas sobre las que opera la solución propuesta.

8


<!-- ===== PAGINA 9 ===== -->


- Pre-Siembra: Sin medir la conductividad eléctrica, el productor desconoce cuánta sal dejó acumulada la sequía en su terreno; sin medir la temperatura del suelo, no sabe si la tierra alcanzó el mínimo que exige la germinación. Siembra igual, guiado por el calendario heredado. La semilla se pierde en un suelo frío o demasiado salino, y esa pérdida sólo se vuelve visible varias semanas más tarde, cuando ya no queda ventana para resembrar.

- Vegetativo: Con la inversión ya comprometida, el riego se ajusta por costumbre y no por la humedad real del terreno. El exceso de agua desplaza el aire del suelo y asfixia las raíces, y de paso arrastra hacia abajo el fertilizante recién aplicado, que el cultivo ya no alcanza a absorber; la falta de agua, en el otro extremo, frena el desarrollo. En ambos casos el productor paga dos veces: el insumo perdido y el crecimiento que no ocurrió.

- Floración: Es la ventana más corta y la más cara de todas. Un estrés hídrico que pase inadvertido durante esos días provoca aborto floral masivo, y con él se pierde el rendimiento de la temporada completa aunque la planta siga verde y aparentemente sana. Es exactamente el tipo de daño que la inspección visual no alcanza a detectar a tiempo, porque cuando se hace evidente ya está consumado.

- Cosecha: Entrar al campo con maquinaria sobre un suelo con exceso de humedad compacta la tierra y destruye su estructura. El costo no se paga en la cosecha que se está levantando, sino en la siguiente: un suelo compactado infiltra peor, retiene menos agua y obliga a más labores de preparación. La decisión que hipoteca la temporada que viene se toma, sin saberlo, al cerrar la actual.

9


<!-- ===== PAGINA 10 ===== -->


### Impacto de las Decisiones Tradicionales

Ante la falta de instrumental comprensible, el productor toma decisiones basadas en la tradición o en inspecciones sensoriales superficiales ( tocar la tierra con la mano, observar el polvo en superficie o guiarse por el calendario astronómico). Este método empírico induce fallos agronómicos severos en los cuatro momentos clave del cultivo:

> *[imagen del documento original]*

**Figura 1.0 “Diagrama de Decisiones y Consecuencias”**

Diagrama que encadena, para cada una de las cuatro etapas fenológicas, la decisión tomada sin medición, el fallo agronómico que produce y la consecuencia económica en que termina.

10


<!-- ===== PAGINA 11 ===== -->


### Relación con los Servicios Formales de Análisis y Asesoría

Actualmente, las alternativas formales como los análisis de laboratorio son lentas (15 a 30 días) y costosas, entregando resultados cuando la fase crítica ya pasó. Por otro lado, pagar asesorías agronómicas continuas para que un profesional interprete los datos escapa del presupuesto operativo.

Corresponde precisar el alcance exacto de esta brecha, porque el proyecto no se plantea como un reemplazo del laboratorio. Un análisis acreditado determina propiedades químicas mediante extracción y método normalizado; un instrumento de terreno entrega una lectura directa, en un punto y en un instante.

Son procedimientos distintos que responden preguntas distintas, y confundirlos sería el error de fondo más grave que podría cometer este proyecto. TerraSense apunta al vacío que existe entre dos análisis de laboratorio: las decenas de decisiones de riego, siembra y manejo que el agricultor toma cada semana y que hoy resuelve por intuición, porque no existe ninguna herramienta que las acompañe con un dato propio de su campo. Los servicios de laboratorio y de asesoría conservan íntegramente su función en las decisiones que exigen determinaciones específicas, en particular las de fertilización.

En síntesis, el pequeño productor queda atrapado entre una crisis climática que le exige más precisión que nunca, un mercado de instrumentación que lo deja fuera por la relación entre lo que cobra y lo que entrega, y equipos que, cuando los alcanza, le devuelven un número que no sabe leer. Las dos barreras se refuerzan entre sí: la económica le impide comprar el instrumento, y la de interpretación vuelve inútil el instrumento que sí lograra comprar. El resultado es un productor que decide a ciegas y descubre sus errores al final de la temporada, cuando la pérdida de la cosecha y el endeudamiento del año ya son irreversibles.

11


<!-- ===== PAGINA 12 ===== -->


## III. Propuesta de Solución Tecnológica

### Filosofía del Proyecto

Antes de cualquier decisión técnica o de diseño más focalizado, el proyecto responde a una pregunta fundamental: ¿Para qué existe esta herramienta? La respuesta no es "para cuidar plantas", sino para proteger el patrimonio de una familia que se juega el año entero en cada siembra.

Esta distinción no es un matiz retórico; cambia el criterio con el que se evalúa cada decisión de desarrollo.

El fin último no es el campo productivo, sino el ser humano cuyo sustento familiar depende de él. Un cultivo que se pierde por acidez o salinidad es, en el fondo, un problema agronómico menor comparado con lo que realmente está en juego, una familia que queda endeudada durante un año entero por tomar una decisión sin la información adecuada. Ese es el problema social y económico que TerraSense ataca. Por ello, toda decisión de diseño se resuelve preguntando cuál alternativa reduce más el riesgo económico del productor, no cuál es la más sofisticada desde el punto de vista técnico. De esta premisa central se desprenden cuatro principios que gobiernan el diseño del sistema:

- No Entregamos Datos, Entregamos Respuestas: Un dato aislado, un valor de pH o una lectura de conductividad no es información útil para quien no sabe interpretarlo. Un dato sin contexto es, en la práctica, “un vacío” con unidades. TerraSense no entrega la medición en bruto, sino la cadena completa: desde la captura de la variable física hasta una recomendación concreta de manejo (qué hacer, cuánto y por qué).

- El Teléfono es el Cerebro del Sistema: La idea central que ordena todo el diseño es sencilla y radical en sus consecuencias: el teléfono que el agricultor ya posee es el instrumento de registro más potente que existe. Tiene pantalla legible, ubicación satelital, capacidad de cálculo y memoria.

Fabricar un instrumento nuevo que vuelva a incluir todas esas capacidades sería cobrarle dos veces al agricultor por algo que ya tiene. Por eso, el aparato físico se reduce a lo mínimo indispensable:

hacer lo único que el teléfono no puede hacer por sí solo (tomar contacto físico con la tierra y el ambiente). Todo el resto ocurre en el teléfono. Además de que el 100 % del procesamiento agronómico ocurre en el procesador del teléfono sin depender de cobertura de red móvil (3G/4G/5G). La nube actúa exclusivamente como respaldo posterior.

12


<!-- ===== PAGINA 13 ===== -->


- Diseño para el Campo Real, no para el Laboratorio: El instrumento no vivirá sobre un escritorio; se caerá sobre tierra y piedras, se mojará y viajará quizás en la caja de una camioneta.

Cada elección de materiales responde a esa realidad de uso, priorizando la austeridad y la resistencia sobre la estética .

- Cero Suscripciones Recurrentes: El agricultor paga una vez por su instrumento y sus mediciones le pertenecen; puede consultarlas, exportarlas y usarlas libremente. A diferencia de la instrumentación importada que depende de plataformas por suscripción, aquí no existe una cuota mensual que condicione el funcionamiento del equipo. La tecnología no debe convertirse en una carga financiera mensual para quien ya enfrenta suficiente incertidumbre. Este principio tiene una consecuencia económica directa y asumida; los costos de soporte, servicios digitales, mantenimiento y reposición permanecen en el presupuesto de la empresa y están explícitamente cuantificados en la evaluación económica de este informe.

### Beneficiarios de la Solución

El beneficiario directo y principal es el pequeño y mediano productor comercial (Agricultura Familiar Campesina), quien hoy queda fuera de toda la oferta de instrumentación profesional. Sin embargo, el diseño contempla un impacto expansivo hacia otros actores:

La Familia y el Equipo de Trabajo: El sistema está diseñado para que cualquier persona en el campo pueda tomar una medición sin necesitar formación técnica previa.

Asesores Técnicos y Extensionistas: Quienes hoy deben estimar las condiciones del suelo a través de la observación, podrán pasar de “estimar” a “medir”, dejando un registro histórico de cada medición.

Cabe precisar, para efectos del dimensionamiento comercial, que la cantidad de campos visitados por un asesor no equivale a la cantidad de equipos comprados.

Instituciones Públicas: Podrían apoyarse en esta información agregada para focalizar sus programas de fomento, paliando la actual falta de datos de suelo georreferenciados a escala de campo individual.

13 El Medio Ambiente: Una fertilización y riego ajustados a la necesidad real del cultivo en lugar de aplicaciones preventivas por exceso de precaución reduce el desperdicio hídrico y la contaminación de napas por lixiviación.


<!-- ===== PAGINA 14 ===== -->


### La Propuesta de Valor

TerraSense toma la información física del suelo y del aire, la cruza con el conocimiento agronómico del cultivo y con las condiciones climáticas del lugar exacto de la medición, entregando en segundos y sin necesidad de conexión a internet una recomendación concreta y accionable. Es, en esencia, la diferencia entre entregarle a alguien un termómetro y entregarle una orientación de manejo ya interpretada. El modelo comercial que sostiene esa promesa es la venta del instrumento con la aplicación incluida y sin cobro por lectura, el usuario dispone de una herramienta de seguimiento permanente, mientras los servicios de laboratorio y asesoría conservan su función en aquellas decisiones que requieren determinaciones específicas.

14


<!-- ===== PAGINA 15 ===== -->


### Estructura del Ecosistema

Para optimizar costos de manufactura y maximizar la durabilidad en terreno, las responsabilidades se distribuyen de forma estricta entre el hardware, la aplicación móvil y la infraestructura backend:

| Capa del Sistema | Componente Físico | Responsabilidad Asignada | Lo Que Deliberadamente No Realiza |
|---|---|---|---|
| 1. Instrumento de Captura | ESP32-WROOM-32 + Sonda 7-en-1 + BME280 | Excitar sensores, leer buses RS-485 e I²C, verificar checksums y transmitir trama BLE. | No procesa algoritmos agronómicos, no almacena historial ni requiere pantalla gráfica propia. |
| 2. Inteligencia Local | App móvil (React Native) con almacenamiento local persistente del teléfono y cola de sincronización diferida | Ejecutar motor agronómico determinista, desplegar Grid 2×5 y almacenar histórico local. | No genera voltajes de excitación industrial ni depende de servidores externos para evaluar. |
| 3. Respaldo y Flota | Supabase (PostgreSQL) + Consola Web | Respaldar mediciones al detectar red, control de cuentas, soporte posventa y consulta del histórico de cada equipo. | No bloquea la operación en campo en ausencia de conectividad. |

**Tabla 1.0 “Distribución de Responsabilidades Funcionales del Sistema”**

Sobre la segunda fila conviene una precisión, porque de ella dependen las afirmaciones de operación sin red que el informe sostiene más adelante. La aplicación no utiliza un motor de base de datos embebido, conserva las mediciones en el almacenamiento persistente del propio teléfono y mantiene una cola de envío diferido, mientras el motor agronómico y las definiciones de cultivos residen en el código de la aplicación y no en un servidor. El efecto para el usuario de medir, diagnosticar y consultar sin cobertura es el mismo que ofrecería una base de datos local.

15


<!-- ===== PAGINA 16 ===== -->


## IV. Objetivos del Proyecto

### Objetivo General

Diseñar, construir y validar un instrumento portátil de medición de suelo que resuelva, de punta a punta, la toma de decisiones del pequeño agricultor: capturando en terreno las variables físicas y químicas relevantes del suelo y su ambiente, interpretándolas de inmediato mediante un sistema de razonamiento agronómico ejecutado en el teléfono del usuario, y entregando una recomendación de manejo clara y aplicable en cuestión de segundos, sin costos recurrentes por suscripción.

En síntesis: lograr que una medición física se convierta, en el mismo lugar, en una decisión agronómica correcta.

### Objetivos Específicos

Para materializar este objetivo general, el proyecto se estructura en los siguientes frentes de trabajo:

- Definir la arquitectura de hardware y comunicación: Comparar explícitamente distintas combinaciones de componentes y protocolos de transmisión hacia el teléfono, justificando técnica y económicamente la elección final en lugar de asumir la primera opción disponible.

- Diseñar el sistema de adquisición de datos: Lograr una integración confiable entre la sonda edáfica (que penetra la tierra) y los sensores ambientales, asegurando que el equipo capture un panorama físico-químico completo y no sólo datos aislados.

- Optimizar la autonomía energética: Desarrollar un sistema de alimentación capaz de sostener un uso frecuente en terreno durante varios meses sin requerir recargas constantes ni mantenimiento especializado, garantizando su disponibilidad durante toda la temporada agrícola.

16


<!-- ===== PAGINA 17 ===== -->


- Desarrollar el motor de razonamiento agronómico: Construir el algoritmo (el “corazón” del sistema) que convierta las variables físicas capturadas en orientaciones cualitativas ajustadas a la etapa fenológica específica del cultivo y su etapa (siembra, desarrollo, floración o cosecha).

- Programar la interfaz móvil (App) para entornos rurales: Desarrollar una aplicación intuitiva y accesible para usuarios de distintos niveles de alfabetización digital, que opere de forma offline al momento de medir y sincronizar los datos cuando recupere la cobertura de red.

- Diseñar el encapsulado industrial (Carcasa): Crear una estructura física robusta, pensada explícitamente para el rigor del trabajo agrícola, que proteja los componentes electrónicos del barro, polvo, sol directo, humedad e inmersiones accidentales.

- Validar la precisión instrumental: Contrastar empíricamente las mediciones del equipo contra muestras analizadas por un laboratorio de referencia acreditado, respaldando con evidencia científica que los datos capturados reflejan fielmente la realidad del suelo, y declarar con igual claridad qué variables quedan fuera de esa validación y por qué.

- Asegurar el cumplimiento normativo: Identificar y cumplir el marco regulatorio aplicable, abarcando la seguridad eléctrica del hardware, el uso permitido del espectro radioeléctrico, y la protección de datos personales y derechos del consumidor, expresando cada norma como un requisito de diseño con método de verificación y criterio de aceptación.

- Evaluar la viabilidad económica y financiera: Estructurar el modelo de negocio, analizando rigurosamente la estructura de costos, proyecciones de flujo de caja y fuentes de financiamiento, para asegurar que la solución tecnológica sea sostenible como empresa en el tiempo.

17


<!-- ===== PAGINA 18 ===== -->


## V. Ingeniería Conceptual

La ingeniería conceptual constituye el puente crítico entre la problemática diagnosticada y la materialización de la solución. En esta etapa, los principios filosóficos del proyecto, movilidad, independencia de red, bajo costo y el uso del teléfono como núcleo de procesamiento se traducen en requerimientos técnicos concretos. El objetivo de esta fase no es simplemente elegir componentes al azar, sino definir y justificar la arquitectura de hardware y software óptima que garantice la viabilidad del equipo en el mundo real, equilibrando rendimiento, robustez y usabilidad para el pequeño agricultor.

A partir de estas premisas, se desarrolla el siguiente análisis de viabilidad técnica, como también viabilidad económica en donde se evalúan las distintas alternativas para materializar el sistema.

18


<!-- ===== PAGINA 19 ===== -->


### Análisis de Viabilidad Técnica

Antes de comparar cualquier alternativa, el proyecto fija dos capas de exigencia, porque confundirlas es el error metodológico más común en un estudio de ingeniería conceptual.

- Requisitos Obligatorios (filtro de viabilidad): Son condiciones de cumplimiento innegociable: una arquitectura que no las satisface queda eliminada antes de puntuar, sin importar su desempeño en el resto de los criterios.

|  | Requisito | Qué exige |
|---|---|---|
| RO-1 | Alimentar y comunicarse con la sonda | Operar por bus diferencial RS-485 con sonda industrial. |
| RO-2 | Interpretar, no solo mostrar | Entregar un veredicto interpretado, no una lectura plana. |
| RO-3 | Operar sin cobertura celular | Completar la medición en el momento, sin depender de señal de datos. |
| RO-4 | Muestrear múltiples puntos | Permitir recorrer y medir distintos puntos de un mismo campo en una jornada. |
| RO-5 | Ser físicamente realizable | Construirse con componentes de catálogo real, no con tecnología hipotética. |

**Tabla 1.1 “Filtro de Viabilidad”**

19 Criterios Ponderados: Solo entre las arquitecturas que sobreviven el filtro se aplica una matriz de puntuación (escala 1 a 10) sobre ocho criterios: cobertura espacial (15 %), calidad de interfaz (13 %), capacidad de interpretación (15 %), autonomía energética (14 %), costo total a cinco años para el agricultor (16 %), robustez mecánica y ambiental (10 %), facilidad de actualizar el conocimiento agronómico (9 %) e independencia de infraestructura externa (8 %).


<!-- ===== PAGINA 20 ===== -->


Esta separación en dos capas evita "aprobar" una arquitectura inviable con un buen puntaje ponderado, un caso real que aparece más adelante y que el propio proyecto descarta por honestidad tecnológica.

Alternativas Evaluadas: Se compararon seis arquitecturas; ninguna es hipotética, las seis existen hoy como productos comerciales o como proyectos publicados en la literatura técnica.

20


<!-- ===== PAGINA 21 ===== -->


- Instrumento autónomo (8 bits + pantalla + Bluetooth Classic): La arquitectura por defecto de la electrónica educativa y de buena parte de los medidores genéricos de importación, un microcontrolador simple, una pantalla LCD u OLED pequeña, y un módulo Bluetooth Classic para vinculación.

> *[imagen del documento original]*

**Figura 1.1 “Diagrama de Flujo Arquitectura 8 Bits + Bluetooth Classic”**

Evaluación: Los módulos Bluetooth Classic más usados implementan un perfil de comunicación que iOS no permite usar sin certificación MFi de Apple. Adoptarla significa renunciar a la mitad del mercado de teléfonos. Además, la memoria disponible no alcanza para el motor de interpretación y no hay forma de actualizar el firmware de forma remota. Incumple el filtro de viabilidad y queda eliminada.

21


<!-- ===== PAGINA 22 ===== -->


- Instrumento autónomo con inferencia embebida y pantalla: La versión seria de la alternativa anterior. Todo el sistema incluido el motor de interpretación agronómica viviría dentro del microcontrolador, sin depender de un teléfono.

> *[imagen del documento original]*

**Figura 1.2 “Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla”**

Evaluación: Incorporar una pantalla activa y el motor de interpretación agronómica reduce la autonomía en más de tres cuartas partes; la ventana de la pantalla es un riesgo de estanqueidad frente a la humedad;

sin GPS ni conectividad, se pierde la capa del motor que cruza la medición con el clima previsto; y corregir el conocimiento agronómico exigiría publicar un nuevo firmware y forzar al usuario a instalarlo. Sí supera el filtro de viabilidad y llega a la etapa de puntuación.

22


<!-- ===== PAGINA 23 ===== -->


- Datalogger estacionario con telemetría de red móvil: La arquitectura típica de las parcelas de investigación: equipo fijo, alimentado por panel solar, con una sonda enterrada en un único punto y un módem de red móvil que sube datos a una web por suscripción.

> *[imagen del documento original]*

**Figura 1.3 “Diagrama de Flujo Arquitectura con Datalogger Estacionario”**

Evaluación: Resuelve bien un problema distinto. La variabilidad de un campo es espacial; mapear veinte puntos exigiría veinte equipos. Requiere cobertura celular exacta en el punto de instalación e impone una suscripción recurrente (incompatible con el proyecto). Incumple RO-3 y RO-4 y queda eliminada.

23


<!-- ===== PAGINA 24 ===== -->


- Red de nodos LoRaWAN con estación controladora en el campo: Reemplaza el módem de red móvil por una radio de largo alcance y bajísimo consumo hacia una estación concentradora en el campo.

> *[imagen del documento original]*

**Figura 1.4 “Diagrama de Flujo Arquitectura de Nodos con LoRaWAN”**

Evaluación: Es la alternativa técnicamente más elegante entre las descartadas, pero medir 20 puntos exigiría 20 nodos a un costo prohibitivo, y exige instalar infraestructura propia (la estación). Además, no resuelve el caso de uso real: el agricultor está de pie sobre el punto cuando necesita la decisión, no a distancia. Cumple los requisitos y pasa a puntuar con esa reserva.

24


<!-- ===== PAGINA 25 ===== -->


- Sonda conectada directo al teléfono (electrónica intermedia): La alternativa más radical: eliminar la radio del medio y conectar la sonda al teléfono por cable.

> *[imagen del documento original]*

**Figura 1.5 “Diagrama de Flujo Arquitectura de Sonda conectada al Teléfono”**

Evaluación: Si se puntuara, obtendría el segundo mejor resultado al heredar gratis todas las capacidades del teléfono. Sin embargo, es físicamente irrealizable, la sonda opera en un rango de 5 a 24 V DC que técnicamente incluye los 5 V que entrega un puerto USB, el puerto de un teléfono convencional en modo host no puede sostener la corriente de excitación que exige la sonda industrial durante la medición, y ningún teléfono comercial genera de forma nativa la señalización diferencial RS-485 que el protocolo exige.

El límite no es de tensión sino de corriente entregable y de capa física. Incumple RO-1 y RO-5 y queda eliminada sin puntuar.

25


<!-- ===== PAGINA 26 ===== -->


- Instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete: La síntesis de las lecciones anteriores: un equipo portátil mínimo que resuelve únicamente lo que el teléfono no puede hacer (proveer la tensión, protocolo y medición física), y delega en el teléfono la interpretación, posición geográfica, pantalla y almacenamiento mediante un enlace inalámbrico BLE

(Bluetooth Low Energy).

> *[imagen del documento original]*

**Figura 1.6 “Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo”**

### Evaluación: El teléfono reúne capacidades que duplicar en el instrumento sería un gasto

innecesario. Asume que el usuario dispone de un teléfono, supuesto respaldado por la alta penetración del smartphone en zonas rurales [15].

26


<!-- ===== PAGINA 27 ===== -->


### Matriz de Decisión: Puntuando sólo a las arquitecturas que superaron el filtro.

| Criterio | Peso | Instrumento autónomo con inferencia embebida y pantalla | Red de nodos LoRaWAN con estación concentradora campo | Instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete |
|---|---|---|---|---|
| Cobertura espacial | 15 % | 8 | 5 | 10 |
| Calidad de interfaz | 13 % | 4 | 7 | 10 |
| Capacidad de interpretación | 15 % | 6 | 8 | 10 |
| Autonomía energética | 14 % | 4 | 8 | 9 |
| Costo total a 5 años | 16 % | 6 | 2 | 8 |
| Robustez mecánica | 10 % | 6 | 9 | 9 |
| Actualización del conocimiento | 9 % | 5 | 8 | 10 |
| Independencia de infraestructura | 8 % | 9 | 5 | 7 |
| Puntaje ponderado final | 100 % | 5,91 | 6,32 | 9,20 |

**Tabla 1.2 “Matriz de Decisiones”**

27 Conclusión y Sensibilidad: La arquitectura de un instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete gana con margen amplio por su ventaja insuperable en cobertura espacial ilimitada, capacidad de interpretación y facilidad de actualización del software. Tras un análisis de sensibilidad elevando los pesos de distintos criterios, esta arquitectura mantiene su ventaja.


<!-- ===== PAGINA 28 ===== -->


Selección de Componentes Base: Decidida la arquitectura general, la segunda capa de decisiones define con qué componente concreto se construye cada bloque.

Se aplicó la misma disciplina, evaluación de candidatos reales, criterios declarados antes de comparar, y honestidad explícita cuando la alternativa descartada es superior en alguna dimensión. Sobre once subsistemas evaluados, en siete existe una alternativa técnicamente superior en alguna métrica, y el proyecto lo declara en lugar de presentar una selección irreal donde el componente elegido gane en todo.

Microcontrolador: Se evaluaron cuatro candidatos: ESP32, nRF52840, STM32WB55 y ATmega328P + HC-05. Este último queda descartado de entrada: su módulo Bluetooth Classic sufre el mismo bloqueo de iOS (certificación MFi) visto en la evaluación de arquitecturas.

Los tres restantes se puntúan sobre cinco criterios declarados antes de comparar, en la misma escala de 1 a 10 usada en la matriz de arquitecturas: consumo de radio en transmisión BLE (20 %), Wi-Fi integrado para actualización remota (20 %), concurrencia disponible para separar la pila de radio de la temporización Modbus (15 %), ecosistema y soporte de documentación (25 %) y disponibilidad y costo en el mercado local (20 %).

28


<!-- ===== PAGINA 29 ===== -->


| Microcontrolador | Consumo de radio en Tx BLE | Wi-Fi / OTA | Núcleo s | Ecosiste ma | Disponibilida d y costo | Puntaje ponderad o | Veredicto |
|---|---|---|---|---|---|---|---|
| STM32WB55 | ~5–6 mA [8] | No | 2 | 5 | 4 | 5,65 | Descartado |
| nRF52840 | ~5–6 mA [9] | No | 1 (ARM Cortex) | 7 | 5 | 5,90 | Descartado |
| ESP32 | ~130–150 mA [19] | Sí (nativ o) | 2 | 10 | 10 | 8,80 | Seleccionado |

**Tabla 1.3 “Comparativa de Microcontroladores”**

Justificación de la Selección: Aunque los chips nRF52840 y STM32WB55 superan al ESP32 por un factor enorme en eficiencia de radio, al modelar el presupuesto energético completo del equipo esa ventaja de radio sólo se traduce en una fracción mínima de autonomía total, porque la carga dominante es el consumo propio de la placa de control mientras el equipo está encendido, no la radio. A cambio de resignar ese porcentaje, el ESP32 aporta Wi-Fi integrado (vital para actualizar el firmware por aire sin complicaciones), doble núcleo (para sostener la temporización de la sonda sin perder el Bluetooth) y, por último, un extenso ecosistema de desarrollo y soporte global de la comunidad para proyectos basados en este microcontrolador.

Sobre la cifra de consumo conviene fijar una sola referencia, porque este informe la utiliza en dos lugares distintos, el módulo presenta un rango dinámico total de 95 a 380 mA medido en su propio pin de 3,3 V, dentro del cual la transmisión BLE se sitúa en el orden de 130 a 150 mA. El balance energético de este informe adopta 150 mA para la fase de envío, es decir el extremo superior de esa banda, por prudencia.

29 Sonda de Suelo: Aporta 7 de las 10 variables del sistema, siendo la decisión más crítica. Se comparó la sonda 7-en-1 RS-485 contra instrumentos de grado de investigación (METER TEROS 12, Delta-T WET150, Stevens HydraProbe) [10].


<!-- ===== PAGINA 30 ===== -->


Los criterios declarados y sus pesos son: número de variables entregadas (30 %), exactitud declarada (25 %), viabilidad económica medida como costo por variable (30 %) y robustez e idoneidad para uso portátil en terreno (15 %).

| Sonda | Variables entregada s | Exactitud Pura | Viabilidad Económica | Robustez | Puntaje Ponderado |
|---|---|---|---|---|---|
| Grado Investigación (TEROS 12, etc.) | 3 a 4 variables | 10 / 10 | Muy Baja (Costo x20) | 10 | 5,50 |
| Sonda 7-en-1 RS-485 | 7 variables | 7 / 10 | Alta | 7 | 8,50 |

**Tabla 1.4 “Comparativa de Sondas de Suelo”**

Justificación de la Selección: Se sacrifica exactitud absoluta a cambio de viabilidad. Obtener las siete variables con sensores de investigación multiplicaría el costo del producto por veinte, lo que contradice el objetivo mismo del proyecto. La limitación técnica más importante se declara explícitamente: la estimación de N, P y K no se mide por electrodo ion-selectivo, sino que se deriva de la conductividad eléctrica. En suelo salino se puede leer erróneamente un estado “fértil”. Para mitigarlo, la aplicación presenta N, P y K como registros informativos, acompañados de forma permanente por una advertencia de que no constituyen un diagnóstico nutricional y no permiten prescribir dosis de fertilizante; además, cuando la conductividad eléctrica supera los 1.000 µS/cm se activa un veto de confianza que refuerza esa advertencia en pantalla. En ningún caso se presenta una clase agronómica ni una dosis derivada de estos tres valores.

30


<!-- ===== PAGINA 31 ===== -->


### Sensor Ambiental: Compite el Bosch BME280, BMP280 y el Sensirion SHT40.

| Sensor | Exactitud Temperatura | Mide Humedad Relativa | Mide Presión Barométrica | Veredicto |
|---|---|---|---|---|
| Sensirion SHT40 | ±0,2 °C [11] | Sí | No | Descartado por función |
| Bosch BMP280 | ±1,0 °C [12] | No | Sí | Descartado por función |
| Bosch BME280 | ±1,0 °C [13] | Sí (±3 % HR) | Sí (±1,0 hPa) | Seleccionado |

**Tabla 1.5 “Comparativa de Sensores de Temperatura / Humedad / Presión Barométrica”**

Justificación de la Selección: Se elige por una razón funcional, no de desempeño. El BME280 es el único de los tres candidatos que entrega simultáneamente las tres magnitudes que el Grid 2×5 reserva al ambiente local. El SHT40 es más exacto en temperatura pero no mide presión; el BMP280, frecuentemente confundido con el BME280 por su encapsulado casi idéntico, no aporta humedad relativa y por lo tanto no constituye un reemplazo funcional. La presión barométrica se utiliza además para corregir el cálculo de evapotranspiración por altitud [14]. Cabe precisar que la temperatura del BME280 se emplea también en la compensación interna del propio sensor, y su correspondencia con el aire exterior depende críticamente de su ubicación física dentro de la carcasa, requisito que se aborda en el diseño mecánico.

31


<!-- ===== PAGINA 32 ===== -->


### Arquitectura de Conectividad

La estrategia de comunicación del sistema se divide en distintas etapas, cada una diseñada para optimizar los recursos energéticos y superar las barreras del entorno agrícola:

- Sonda de Suelo → ESP32 (Bus RS-485 Modbus RTU): Se eligió esta interfaz frente a alternativas más simples (como UART directo) porque transmite una señal diferencial robusta e inmune al ruido electromagnético en campo abierto. Además, al ser el estándar universal para instrumentación industrial, permite intercambiar sondas de distintos fabricantes en el futuro sin necesidad de rediseñar la placa base del equipo. Conviene separar las dos capas involucradas:

RS-485 define la capa eléctrica diferencial, mientras Modbus define la estructura de los mensajes;

en su implementación serial RTU se verifican longitud, dirección, función, CRC-16 y temporización entre tramas.

- Sensor Ambiental BME280 → ESP32 (Bus I2C): Para la captura de datos atmosféricos

(temperatura del aire, humedad relativa y presión barométrica), se utiliza una comunicación serie de dos hilos (I²C). Al estar el sensor integrado para lectura ambiental local, directamente en la placa o a muy corta distancia del microcontrolador, el protocolo I²C es el estándar ideal por su simplicidad técnica y bajo consumo, sin verse afectado por las limitaciones de distancia que sufriría en campo abierto.

- ESP32 → Teléfono (Bluetooth Low Energy): Se optó por un enlace BLE puntual debido a su bajo consumo energético. El equipo envía paquetes de datos muy pequeños (tramas de 20 bytes en el contrato vigente) y se conecta solo durante los segundos que dura la medición. Al utilizar BLE se evita la barrera de certificación MFi que afecta al perfil serial de Bluetooth Classic en iOS, habilitando compatibilidad con Android y Apple sin costos de hardware adicionales.

32


<!-- ===== PAGINA 33 ===== -->


- Teléfono → Nube (HTTPS / Supabase): El sistema implementa una arquitectura estrictamente offline-first. La falta de cobertura en zonas rurales es la principal causa de fallo en agrotecnología, por lo que el motor de interpretación agronómica corre localmente en el teléfono sobre almacenamiento local persistente. La conexión a la nube ocurre de manera diferida y en segundo plano, interviniendo únicamente para sincronizar historiales y respaldar información cuando el teléfono detecta señal de internet.

Esta independencia tiene un límite preciso, y conviene declarar la frontera función por función en lugar de afirmar genéricamente que el sistema “funciona offline”. La siguiente tabla es la definición operativa de esa frontera.

| Función del sistema | Conectividad requerida | Comportamiento sin cobertura |
|---|---|---|
| Emparejamiento y lectura BLE del instrumento | Ninguna | Funciona íntegramente; el enlace es punto a punto entre equipo y teléfono |
| Validación de la trama y marcado de lecturas ausentes | Ninguna | Funciona íntegramente; una variable no recibida se almacena como ausente, nunca se estima |
| Motor agronómico: diagnóstico y recomendación de labor | Ninguna | Funciona íntegramente; las reglas y umbrales residen en la aplicación, no en un servidor |
| Georreferenciación de la medición | Ninguna | Funciona con el GPS satelital del teléfono, que no requiere datos móviles |
| Guardado en la base local y consulta del histórico ya almacenado | Ninguna | Funciona íntegramente sobre el almacenamiento del teléfono |
| Exportación del histórico local | Ninguna | El archivo se genera en el propio teléfono, sin consultar ningún servidor |
| Creación de cuenta, inicio de sesión inicial y recuperación de credenciales | Requiere internet | No disponible; la sesión ya iniciada permanece válida y permite seguir midiendo |
| Registro de un equipo nuevo en la cuenta | Requiere internet | No disponible; se completa al recuperar cobertura |

33


<!-- ===== PAGINA 34 ===== -->


| Sincronización y respaldo del histórico hacia la nube | Requiere internet | Las mediciones se encolan localmente y se envían solas al recuperar señal; no se pierde ninguna |
|---|---|---|
| Consola web de flota para asesores y cooperativas | Requiere internet | No disponible; es una herramienta de escritorio, no de terreno |
| Pronóstico meteorológico a cinco días | Requiere internet | La aplicación indica expresamente que el pronóstico no está disponible y no lo sustituye por un valor estimado |

**Tabla 1.6 “Frontera Offline / Online del Sistema”**

La regla que resume la tabla es simple y define el diseño completo: medir, diagnosticar, georreferenciar y guardar no dependen jamás de la cobertura. Lo que sí depende de ella es administrar la cuenta, respaldar en la nube y contextualizar con el clima previsto, es decir, funciones que el agricultor ejecuta antes o después de la jornada de terreno, no durante. Un teléfono sin señal en medio del campo conserva la totalidad de la cadena que convierte una medición física en una decisión agronómica; lo único que posterga es el respaldo. Esta distinción también acota la promesa comercial: el sistema no ofrece pronóstico sin internet ni sincronización mágica, y ninguna de las dos carencias impide tomar la decisión en terreno.

34 Se adjunta un diagrama de flujo para comprender de manera visual la ruta de la información, desde la captura en terreno hasta el almacenamiento diferido en la nube:


<!-- ===== PAGINA 35 ===== -->


> *[imagen del documento original]*

**Figura 1.7 “Diagrama de Flujo Arquitectura de Conectividad”**

35


<!-- ===== PAGINA 36 ===== -->


### Análisis de Viabilidad Económica

El análisis que sigue determina si el proyecto es económicamente sostenible y, sobre todo, **a qué precio**. El precio de venta no es un dato de entrada sino un resultado: se construye primero la estructura completa de costos e inversión, y el precio se deriva de ella exigiendo un margen de utilidad definido. Fijar el precio antes de conocer el costo invierte la lógica del estudio, porque obliga a ajustar los costos a una cifra elegida de antemano.

La secuencia es la siguiente: se costea el equipo componente por componente, se dimensiona la inversión inicial y su financiamiento, se proyectan los costos de operación, administración y comercialización, y solo entonces se determina el precio que cubre todo eso con el margen exigido. Con ese precio se construyen el estado de resultados, el flujo de fondos y los indicadores de rentabilidad: el VAN (valor actual neto), la TIR (tasa interna de retorno) y el período de recuperación de la inversión o payback.

### Las tres economías del análisis

Antes de la primera cifra conviene fijar una separación que este informe mantiene en todo su desarrollo, porque mezclarlas vuelve incomparable cualquier evaluación. El análisis distingue tres economías con unidades, destinatarios y criterios de éxito propios.

| Economía | Qué mide | Con qué se evalúa |
|---|---|---|
| Economía del proyecto | La inversión de puesta en marcha frente a los flujos que genera la actividad | VAN, TIR y payback sobre el flujo de fondos |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, costo variable, estructura de costos y estado de resultados |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | Costo total de propiedad comparado a 1, 3, 5 y 10 años |

**Tabla 1.7 “Economías del análisis”**

La consecuencia práctica es una sola y se aplica sin excepción: **el ahorro del agricultor no es ingreso del proyecto.** Los pesos que un cliente deja de gastar en laboratorio o asesoría no aparecen en ninguna línea del flujo de caja de la empresa; se presentan únicamente como argumento de adopción, porque explican por qué alguien compraría el equipo, no cuánto factura quien lo vende.

### Estructura de costos de fabricación

El costo de materiales de cada unidad se detalla en la BOM (*Bill of Materials*, lista de materiales): el desglose de todo lo que entra físicamente en un equipo, componente por componente, con su cantidad y su costo neto. La lista contiene exactamente los componentes del esquemático de la placa, más la placa misma, la carcasa y el flete. Los precios se cotizaron en el mercado efectivo de abastecimiento del proyecto [45, 46, 47], convertidos a pesos al tipo de cambio de referencia [16], y cada línea declara su origen, de modo que se distinga lo verificado de lo presupuestado.

| Material o servicio por equipo | Cant. | Neto unitario | Subtotal | Origen del precio |
|---|---:|---:|---:|---|
| Sonda de suelo 7-en-1 RS-485 Modbus RTU | 1 | $48.000 | $48.000 | AliExpress; presupuesto conservador, el mercado va de $12.100 a $82.100 |
| Carcasa PETG impresa en taller propio | 1 | $6.900 | $6.900 | costeo propio, detallado en la tabla siguiente |
| Placa de desarrollo ESP32 DevKit WROOM-32 | 1 | $4.800 | $4.800 | AliExpress Choice $3.506-$6.600; en Chile $8.148 con IVA |
| Batería LiPo 3,7 V 2.000 mAh con protección | 1 | $4.400 | $4.400 | AliExpress: $4.784 unitaria, $4.350 por unidad en pack de 10 |
| PCB portadora de 2 capas, fabricación y envío | 1 | $2.000 | $2.000 | JLCPCB, estimación propia a volumen de 200 unidades |
| Módulo ambiental BME280 (I²C) | 1 | $1.050 | $1.050 | AliExpress Choice $990-$1.064 |
| Módulo de carga USB-C y elevación a 5 V | 1 | $900 | $900 | AliExpress: equivalentes de carga y elevación $703-$900 |
| Módulo transceptor SP3485 RS-485 3,3 V | 1 | $900 | $900 | AliExpress: módulo $1.555; integrado suelto $285 por unidad en pack de 10 |
| MOSFET canal N AO3400A (control del corte de la sonda) | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| MOSFET canal P AO3401A (interruptor de la rama de 5 V de la sonda) | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| Bornera de 2 vías, paso 5 mm (batería e interruptor) | 2 | $95 | $190 | LCSC, precio de catálogo por tramo; compra no realizada |
| Bornera de 4 vías, paso 5 mm (sonda) | 1 | $190 | $190 | LCSC, precio de catálogo por tramo; compra no realizada |
| Condensador electrolítico 100 µF 35 V | 2 | $29 | $58 | LCSC, precio de catálogo por tramo; compra no realizada |
| Condensador cerámico 100 nF 50 V (1206) | 4 | $4 | $16 | LCSC, precio de catálogo por tramo; compra no realizada |
| Resistencia 100 kΩ (1206), divisor de batería | 2 | $2 | $4 | LCSC, precio de catálogo por tramo; compra no realizada |
| Resistencia 330 Ω (1206), LED indicadores | 3 | $2 | $6 | LCSC, precio de catálogo por tramo; compra no realizada |
| Resistencia 10 kΩ (1206), polarización del MOSFET y del pulsador | 2 | $2 | $4 | LCSC, precio de catálogo por tramo; compra no realizada |
| LED 0603 azul, rojo y verde | 3 | $8 | $24 | LCSC, precio de catálogo por tramo; compra no realizada |
| Pulsador SMD 4 mm | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| Fusible 1 A (0603) | 1 | $19 | $19 | LCSC, precio de catálogo por tramo; compra no realizada |
| Diodo rectificador M7 (SMA), protección contra inversión | 1 | $4 | $4 | LCSC, verificado en US$0,0042 |
| Flete de los componentes LCSC, prorrateado por equipo | 1 | $150 | $150 | LCSC cobra el envío; prorrateado a 200 unidades |
| **Total BOM neto por equipo** |  |  | **$69.672** |  |

**Tabla 1.8 “Estructura de costos de fabricación (BOM) por equipo”**

La sonda de suelo representa **$48.000, equivalente al 68,9 % del costo de materiales**, y es por lejos la decisión de abastecimiento más crítica del proyecto. El mercado de sondas 7-en-1 RS-485 muestra una dispersión enorme, entre $12.100 y $82.100, que refleja productos genuinamente distintos en número de variables, calidad de construcción y material del vástago. El presupuesto adopta $48.000, en el tramo alto de esa banda, precisamente porque una sonda barata no sirve si no sostiene la exactitud que el protocolo de validación exige.

En el otro extremo, los componentes discretos de la placa portadora (borneras, condensadores, resistencias, indicadores, los dos transistores MOSFET que cortan la alimentación de la sonda y las protecciones de la batería) suman apenas $722 por equipo, un 1,0 % de la BOM. La conclusión de diseño es directa: el costo del instrumento se decide en la sonda, la placa de control y la batería, y ninguna economía sobre los discretos cambia el resultado, de modo que en ellos se privilegia la robustez sobre el ahorro.

Dos precisiones sobre el abastecimiento tienen consecuencias que conviene declarar:

- **Régimen tributario de las compras importadas.** Desde octubre de 2025, la Ley N° 21.713 [42] eliminó la exención que liberaba de IVA a las importaciones bajo US$41: hoy toda compra internacional paga IVA, y las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan en el momento de la compra para pedidos de hasta US$500, sin arancel aduanero adicional. Ese IVA solo constituye crédito fiscal si la compra se formaliza como importación con Declaración de Ingreso. Comprando al detalle, la exposición es de **$11.410 por equipo**, del orden de $2.281.900 anuales al volumen del primer año. El proyecto asume formalizar el abastecimiento antes de comprometer volumen, y esta cifra dimensiona lo que está en juego si no lo hace.
- **La placa de control es una placa de desarrollo, no un módulo desnudo.** El presupuesto adquiere el ESP32 en formato DevKit, que ya incorpora su propio regulador de 3,3 V, el conversor USB-serie y el circuito de arranque. Esto simplifica la placa portadora y el montaje, a cambio de un consumo propio de la placa que no se apaga con el reposo del microcontrolador; el capítulo de gestión energética cuantifica ese efecto y explica por qué el equipo se apaga con un interruptor entre jornadas.

La carcasa se imprime en taller propio: el proyecto adquiere dos impresoras 3D, que figuran en el activo fijo, y el costo de cada carcasa se construye así:

| Concepto | Neto CLP | Base de cálculo |
|---|---:|---|
| Filamento PETG, 200 g a $25.000/kg | $5.000 | AliExpress $20.700-$35.800 por kg |
| Merma de impresión, 15 % (fallos, soportes y purga) | $750 | estimación de taller |
| Energía, ~1 kWh por carcasa a $160/kWh | $160 | tarifa residencial de referencia |
| Mantención de impresora prorrateada (boquillas, correas, cama) | $990 | $100.000 anuales por impresora, sobre 100 carcasas por impresora |
| **Total por carcasa** | **$6.900** |  |

**Tabla 1.9 “Costeo de la carcasa impresa en taller propio”**

El filamento explica el 72 % del costo de cada carcasa; la merma, la energía y la mantención de las impresoras completan el resto. Imprimir en taller propio mantiene bajo control el plazo de entrega y permite corregir el diseño de la envolvente entre lotes sin depender de un proveedor externo, lo que importa mientras la estanqueidad IP67 no esté ensayada.

A los materiales se suman los costos que solo existen cuando hay una venta, y que por lo tanto pertenecen al costo variable y no a la estructura:

| Concepto | Neto CLP |
|---|---:|
| Materiales y servicios de la BOM | $69.672 |
| Merma de fabricación, 3 % de la BOM | $2.090 |
| Provisión de reposiciones y garantía, 5 % de la BOM | $3.484 |
| Envío al cliente | $6.000 |
| **Subtotal sin comisión** | **$81.246** |
| Comisión comercial, 5 % sobre el precio bruto | $22.456 |
| **Costo variable total por equipo** | **$103.702** |

**Tabla 2.0 “Costo variable por equipo”**

El costo variable total, $103.702 por equipo, equivale al 27,5 % del precio neto de venta. Cada unidad vendida deja por lo tanto un margen de contribución de $273.717, que es lo que queda disponible para cubrir la estructura fija de la empresa, los intereses y la utilidad. La comisión comercial es la única partida que depende del precio; todas las demás dependen de la BOM y del envío, y por eso una variación en el costo de la sonda se transmite casi íntegra al costo variable.

### Inversión inicial

La puesta en marcha exige tres tipos de desembolso de naturaleza distinta, que conviene no mezclar: los bienes que se compran una vez y se deprecian, los gastos de constitución y desarrollo que se amortizan, y el dinero que debe quedar disponible para sostener la operación mientras las ventas todavía no cubren los costos.

El equipamiento se dimensionó **según la dotación real del proyecto**, no sobre una plantilla genérica: tres puestos de trabajo el primer año, dos impresoras para producir las carcasas e instrumental de laboratorio suficiente para el montaje y la verificación de cada unidad.

| Componente del activo fijo | Cant. | Valor unitario | Valor total | Vida útil | Depreciación anual |
|---|---:|---:|---:|---:|---:|
| Impresora 3D | 2 | $800.000 | $1.600.000 | 5 años | $320.000 |
| Notebook | 3 | $1.000.000 | $3.000.000 | 5 años | $600.000 |
| Osciloscopio digital portátil | 1 | $500.000 | $500.000 | 5 años | $100.000 |
| Fuente de alimentación de laboratorio | 1 | $300.000 | $300.000 | 5 años | $60.000 |
| Multímetro | 2 | $100.000 | $200.000 | 5 años | $40.000 |
| Soldador de temperatura regulable | 2 | $150.000 | $300.000 | 5 años | $60.000 |
| Herramientas | 1 | $1.000.000 | $1.000.000 | 5 años | $200.000 |
| Muebles de oficina (sillas, escritorios) | 3 | $500.000 | $1.500.000 | 5 años | $300.000 |
| Monitores | 3 | $150.000 | $450.000 | 5 años | $90.000 |
| Impresora de oficina | 1 | $150.000 | $150.000 | 5 años | $30.000 |
| **Total activo fijo** |  |  | **$9.000.000** |  | **$1.800.000** |

**Tabla 2.1 “Equipamiento e inversión en activo fijo”**

El activo fijo suma $9.000.000 y se deprecia en línea recta a cinco años, a razón de $1.800.000 anuales que se cargan al estado de resultados. Al agotarse esa vida útil los equipos se renuevan: en 2032 el proyecto vuelve a comprarlos por $10.433.467, valor reajustado por inflación, y esa compra figura como reinversión en el flujo de fondos. Así la depreciación de los años siguientes corresponde a equipos efectivamente pagados.

| Partida | Neto CLP |
|---|---:|
| Constitución de sociedad, trámites legales y marca | $700.000 |
| Prototipado electrónico (tres rondas de PCB portadora) | $1.100.000 |
| Prototipado mecánico (carcasa, juntas, estanqueidad) | $450.000 |
| Firmware del ESP32 | $900.000 |
| Aplicación móvil y consola web | $800.000 |
| Metrología y campaña de validación (30 muestras pareadas) | $600.000 |
| Ensayo IP67 en laboratorio acreditado | $350.000 |
| Verificación SUBTEL (Res. N° 737/2025) | $300.000 |
| **Total activo nominal** | **$5.200.000** |
| Amortización anual (5 años) | $1.040.000 |

**Tabla 2.2 “Activo nominal (gastos de puesta en marcha)”**

Del activo nominal, $4.500.000 (el 87 %) corresponde al desarrollo técnico que el propio informe declara pendiente: prototipos de placa y carcasa, programa del microcontrolador, aplicación, campaña de validación, ensayo IP67 y verificación ante SUBTEL. Solo $700.000 son trámites de constitución de la sociedad. Estos gastos no se deprecian porque no son bienes físicos; se amortizan en cinco años.

El capital de trabajo no se fijó por una regla de tantos meses, sino **iterando hasta que la caja nunca baje de un piso de seguridad** durante los diez años, con un mínimo de política de 3 meses de estructura. El cálculo es circular y conviene declararlo: más capital de trabajo exige más crédito, que genera más intereses, que profundizan la pérdida de los primeros años, que a su vez exigen más capital de trabajo. El modelo resuelve ese bucle por aproximaciones sucesivas.

| Destino | CLP | Participación |
|---|---:|---:|
| Equipamiento y activo fijo | $9.000.000 | 30,3 % |
| Activo nominal (puesta en marcha) | $5.200.000 | 17,5 % |
| Capital de trabajo (3,0 meses de estructura) | $12.839.785 | 43,2 % |
| Inventario inicial (2 meses de ventas) | $2.708.192 | 9,1 % |
| **Inversión inicial total** | **$29.747.977** | **100,0 %** |

**Tabla 2.3 “Inversión inicial total”**

La partida más grande de la inversión no es un bien físico sino el capital de trabajo: $12.839.785, el 43,2 % del total. Es el dinero que financia la pérdida de los dos primeros ejercicios y los dos meses de inventario con que parte la producción. El equipamiento y el activo nominal, que son lo que habitualmente se asocia a «montar la empresa», representan juntos menos de la mitad.

### Financiamiento

El financiamiento se estructura de la forma en que opera la banca con una empresa nueva. **El pie no es una fuente adicional de fondos.** Los socios entregan al banco un pie equivalente al 30 % del monto solicitado como condición para que este desembolse el crédito, y es el crédito el que financia el 100 % de la inversión inicial. Sumar el pie y el crédito como si fueran dos fuentes contaría dos veces el mismo dinero.

| Condición | Valor |
|---|---|
| Inversión inicial total del proyecto | $29.747.977 |
| Porcentaje financiado con préstamo bancario | 100,00 % |
| Monto del préstamo (capital) | $29.747.977 |
| Pie propio exigido por el banco (30 % del crédito) | $8.924.393 |
| Aporte por socio (2 socios, partes iguales) | $4.462.197 |
| Sistema de amortización | Francés: cuota constante, interés decreciente, capital creciente |
| Tasa de interés | 12 % efectiva anual (0,9489 % mensual) |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $416.315 |
| Total intereses del crédito | $20.209.767 |
| Total pagado al banco | $49.957.744 |

**Tabla 2.4 “Condiciones del financiamiento”**

Sobre el sistema de amortización: se adopta el **francés**, de cuota constante con interés decreciente y capital creciente, porque es el que la banca chilena aplica al crédito empresarial de largo plazo. La cuota fija facilita además la planificación de caja de una empresa que en sus primeros ejercicios opera con holgura estrecha. La cuota anual, $4.995.774, equivale al 6,6 % de las ventas netas del primer año y al 0,9 % de las del último, de modo que su peso sobre la operación se diluye a medida que el negocio crece.

| Periodo | Saldo inicial | Cuota de capital | Intereses | Cuota total | Saldo final |
|---|---:|---:|---:|---:|---:|
| 2027 | $29.747.977 | $1.695.164 | $3.300.611 | $4.995.774 | $28.052.813 |
| 2028 | $28.052.813 | $1.898.583 | $3.097.191 | $4.995.774 | $26.154.230 |
| 2029 | $26.154.230 | $2.126.413 | $2.869.361 | $4.995.774 | $24.027.817 |
| 2030 | $24.027.817 | $2.381.583 | $2.614.192 | $4.995.774 | $21.646.234 |
| 2031 | $21.646.234 | $2.667.373 | $2.328.402 | $4.995.774 | $18.978.861 |
| 2032 | $18.978.861 | $2.987.457 | $2.008.317 | $4.995.774 | $15.991.404 |
| 2033 | $15.991.404 | $3.345.952 | $1.649.822 | $4.995.774 | $12.645.452 |
| 2034 | $12.645.452 | $3.747.467 | $1.248.308 | $4.995.774 | $8.897.985 |
| 2035 | $8.897.985 | $4.197.163 | $798.612 | $4.995.774 | $4.700.822 |
| 2036 | $4.700.822 | $4.700.822 | $294.952 | $4.995.774 | $0 |
| **Total** |  | **$29.747.977** | **$20.209.767** | **$49.957.744** |  |

**Tabla 2.5 “Tabla de amortización del crédito”**

El crédito se cancela íntegramente dentro del horizonte de evaluación: al cierre de 2036 la deuda es cero. Los $20.209.767 de intereses son el precio del financiamiento y están descontados en el estado de resultados de cada ejercicio.

### Estructura de costos de operación

La dotación crece de forma escalonada y deliberada: el primer año operan solo los dos socios y un contador, sin oficina y con la gestión comercial resuelta por los propios socios con publicidad digital. La oficina en Providencia entra el segundo año, el cargo de marketing el tercero, y los ensambladores se incorporan a medida que el volumen los exige.

| Año | Socios | Contador | Marketing | Ensambladores | Total personas | Oficina |
|---|---:|---:|---:|---:|---:|---|
| 2027 | 2 | 1 | 0 | 0 | 3 | no |
| 2028 | 2 | 1 | 0 | 1 | 4 | sí |
| 2029 | 2 | 1 | 1 | 1 | 5 | sí |
| 2030 | 2 | 1 | 1 | 2 | 6 | sí |
| 2031 | 2 | 1 | 1 | 2 | 6 | sí |
| 2032 | 2 | 1 | 1 | 3 | 7 | sí |
| 2033 | 2 | 1 | 1 | 3 | 7 | sí |
| 2034 | 2 | 1 | 1 | 3 | 7 | sí |
| 2035 | 2 | 1 | 1 | 4 | 8 | sí |
| 2036 | 2 | 1 | 1 | 4 | 8 | sí |

**Tabla 2.6 “Dotación por año”**

La dotación se expresa en personas y no en horas: el primer ensamblador entra en 2028, cuando el volumen supera lo que los socios pueden montar y verificar por sí mismos, y el cuarto en 2035, cuando las ventas se acercan a 1.033 equipos anuales.

Cada cargo tiene su propio sueldo. Los socios siguen una escala progresiva que parte cerca del ingreso mínimo mientras la empresa no es rentable y sube por escalones hasta $1.200.000 en 2031, desde donde solo se reajusta por inflación. Los empleados no siguen esa escala: se pagan a valor de mercado desde el primer mes, porque a un trabajador contratado no se le puede diferir la remuneración como un socio difiere la suya. El contador y el cargo de marketing parten en $1.000.000 brutos mensuales cada uno y el ensamblador en $700.000, todos en pesos de 2027 y reajustados por una inflación del 3 % anual:

| Año | Socio (c/u) | Contador | Marketing | Ensamblador (c/u) | Masa salarial bruta mensual | Cargas del empleador y provisiones | Costo laboral anual |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2027 | $600.000 | $1.000.000 | — | — | $2.200.000 | 23,8 % | $32.689.140 |
| 2028 | $700.000 | $1.030.000 | — | $721.000 | $3.151.000 | 24,6 % | $47.103.354 |
| 2029 | $850.000 | $1.060.900 | $1.060.900 | $742.630 | $4.564.430 | 25,3 % | $68.631.682 |
| 2030 | $1.000.000 | $1.092.727 | $1.092.727 | $764.909 | $5.715.272 | 26,0 % | $86.416.053 |
| 2031 | $1.200.000 | $1.125.509 | $1.125.509 | $787.856 | $6.226.730 | 26,7 % | $94.672.448 |
| 2032 | $1.236.000 | $1.159.274 | $1.159.274 | $811.492 | $7.225.024 | 27,4 % | $110.457.607 |
| 2033 | $1.273.080 | $1.194.052 | $1.194.052 | $835.837 | $7.441.774 | 28,1 % | $114.396.445 |
| 2034 | $1.311.272 | $1.229.874 | $1.229.874 | $860.912 | $7.665.028 | 28,5 % | $118.203.924 |
| 2035 | $1.350.611 | $1.266.770 | $1.266.770 | $886.739 | $8.781.718 | 28,5 % | $135.424.622 |
| 2036 | $1.391.129 | $1.304.773 | $1.304.773 | $913.341 | $9.045.169 | 28,5 % | $139.487.361 |

**Tabla 2.7 “Sueldo bruto mensual por cargo y costo laboral anual”**

La masa salarial bruta pasa de $2.200.000 mensuales en 2027 a $9.045.169 en 2036, porque se combinan tres efectos: más personas, la escala de los socios y la inflación. El costo laboral anual es mayor que doce veces la masa bruta porque le suma las cargas del empleador y las provisiones. Sobre ese costo, el modelo no pondera los tramos legales por sus meses de vigencia: siete meses del tramo de enero y cinco del tramo que comienza en agosto. La Ley N° 21.735 [43] establece 3,5 % desde agosto de 2026, 4,25 % desde agosto de 2027 y aumentos hasta 8,5 % desde agosto de 2033; estos tramos ya incluyen el Seguro de Invalidez y Sobrevivencia. A eso se agregan el seguro de cesantía (2,4 % en contrato indefinido) y la cotización de la mutualidad, más las provisiones presupuestarias de vacaciones e indemnización, que no son tasas legales de cotización. La carga sobre el sueldo bruto pasa así de **23,8 % en 2027 a 28,5 % en 2036**. Aparte de la remuneración, cada persona recibe $150.000 mensuales de colación y movilización, que se registran en su propia línea de costos.

Conviene verificar además que la escala salarial se mantenga sobre el piso legal durante todo el horizonte. El ingreso mínimo mensual quedó en $553.553 [44] desde mayo de 2026 y se reajusta por índice de precios; el cargo peor remunerado del proyecto, el de ensamblador, parte en $700.000 y termina el horizonte en $913.341, holgadamente por encima de la proyección del mínimo.

| Concepto | Con oficina (desde 2028) | Sin oficina (2027) |
|---|---:|---:|
| Electricidad | $180.000 | $60.000 |
| Gastos comunes del edificio | $160.000 | $20.000 |
| Internet de fibra | $45.000 | $45.000 |
| Agua y gas | $65.000 | $25.000 |
| **Total mensual** | **$450.000** | **$150.000** |

**Tabla 2.8 “Desglose estimado de servicios básicos mensuales”**

El primer año la empresa opera desde un taller domiciliario, y los servicios básicos corresponden a la proporción de ese hogar que ocupa la actividad. Desde el segundo año la oficina en Providencia agrega un arriendo de $1.500.000 mensuales, fijado en el extremo superior de los avisos de oficinas comparables en la comuna, y servicios completos por $450.000. Ambos se reajustan por inflación.

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Materiales y costo variable | $20.740.438 | $37.384.639 | $55.008.826 | $73.656.819 | $99.210.069 | $107.235.580 | $116.024.810 | $125.499.963 | $135.701.936 | $146.809.002 |
| Nómina y cargas | $32.689.140 | $47.103.354 | $68.631.682 | $86.416.053 | $94.672.448 | $110.457.607 | $114.396.445 | $118.203.924 | $135.424.622 | $139.487.361 |
| Colación y movilización | $5.400.000 | $7.416.000 | $9.548.100 | $11.801.452 | $12.155.495 | $14.606.853 | $15.045.059 | $15.496.411 | $18.241.489 | $18.788.734 |
| Arriendo de oficina | $0 | $18.540.000 | $19.096.200 | $19.669.086 | $20.259.159 | $20.866.933 | $21.492.941 | $22.137.730 | $22.801.861 | $23.485.917 |
| Servicios básicos | $1.800.000 | $5.562.000 | $5.728.860 | $5.900.726 | $6.077.748 | $6.260.080 | $6.447.882 | $6.641.319 | $6.840.558 | $7.045.775 |
| Patente comercial | $70.000 | $72.100 | $74.263 | $76.491 | $78.786 | $81.149 | $83.584 | $86.091 | $88.674 | $91.334 |
| Softwares y planes cloud | $3.600.000 | $3.708.000 | $3.819.240 | $3.933.817 | $4.051.832 | $4.173.387 | $4.298.588 | $4.427.546 | $4.560.372 | $4.697.183 |
| Materiales de oficina | $600.000 | $618.000 | $636.540 | $655.636 | $675.305 | $695.564 | $716.431 | $737.924 | $760.062 | $782.864 |
| Mantención de equipos | $1.200.000 | $1.236.000 | $1.273.080 | $1.311.272 | $1.350.611 | $1.391.129 | $1.432.863 | $1.475.849 | $1.520.124 | $1.565.728 |
| Publicidad digital | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Costo y gasto total** | $72.099.578 | $132.455.093 | $179.730.292 | $224.729.528 | $267.231.925 | $296.790.457 | $313.503.413 | $331.012.633 | $365.196.905 | $385.224.266 |

**Tabla 2.9 “Costos operacionales, de administración y de comercialización”**

La tabla muestra dónde está el costo de la empresa. En 2027 el personal, sumando nómina, cargas, colación y movilización, se lleva el 53 % del costo total y los materiales solo el 29 %: es una empresa que todavía paga más estructura de la que su volumen justifica. En 2036 la proporción se ha acercado (41 % el personal y 38 % los materiales), porque la estructura crece por escalones mientras las ventas crecen todos los años. La publicidad digital se presupuesta en $30.000 por equipo vendido, de modo que acompaña al volumen en lugar de ser un monto fijo.

### Determinación del precio de venta

Con la estructura completa de costos ya construida, el precio deja de ser una decisión arbitraria y pasa a ser un cálculo. El criterio es que **cada venta deje una utilidad de al menos el 30 % sobre el costo total**, entendido como la suma de los costos operacionales, los gastos de administración y los gastos de comercialización de todo el horizonte.

| Concepto | Valor |
|---|---:|
| Costo y gasto total de los 10 años | $2.567.974.090 |
| Margen de utilidad exigido sobre el costo total | 30 % |
| Ventas netas necesarias en los 10 años (costo total + 30 %) | $3.338.366.318 |
| Equipos vendidos en los 10 años | 7.481 |
| Equipos ponderados por el reajuste anual del precio (3 %) | 8.845,25 |
| **Precio neto de venta 2027 (ventas ÷ equipos ponderados)** | **$377.419** |
| IVA 19 % | $71.710 |
| **Precio de lista con IVA** | **$449.129** |

**Tabla 3.0 “Determinación del precio de venta”**

El precio de lista resultante es de **$449.129 con IVA**, expresado en pesos de 2027 y reajustado cada año por inflación, igual que los costos; por eso se obtiene dividiendo las ventas necesarias por los equipos ponderados según ese reajuste, y no multiplicando un costo medio por el margen. Conviene explicitar cómo se comporta ese margen en el tiempo: al ser un precio único aplicado sobre una estructura que se diluye con el volumen, los primeros ejercicios quedan por debajo del 30 % objetivo y los últimos por encima, de modo que el margen se cumple sobre el horizonte completo y no ejercicio por ejercicio. Esa es exactamente la razón por la que los años 2027 y 2028 arrojan pérdida: son los años en que se construye la empresa.

Este resultado define el posicionamiento competitivo. A $449.129, TerraSense queda por encima del precio de un medidor básico de importación como el Hanna HI9814 (US$294) o el Bluelab Pulse (US$339). **El argumento no es de etiqueta sino de capacidad y de costo de uso**: TerraSense entrega 7 variables de suelo más 3 ambientales con interpretación agronómica y mediciones ilimitadas sin costo marginal, frente a 3 o 4 variables sin interpretación de los equipos comparados, y cuesta menos que dos años y medio de análisis de laboratorio al ritmo habitual de cuatro muestras por año.

### Estado de resultados proyectado

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| (+) Ventas netas | $75.483.797 | $136.059.543 | $200.201.900 | $268.070.344 | $361.070.132 | $390.278.582 | $422.266.550 | $456.750.900 | $493.880.478 | $534.304.093 |
| (-) Costos operacionales | $20.740.438 | $37.384.639 | $55.008.826 | $73.656.819 | $99.210.069 | $107.235.580 | $116.024.810 | $125.499.963 | $135.701.936 | $146.809.002 |
| (-) Gastos de estructura | $51.359.140 | $95.070.454 | $124.721.465 | $151.072.709 | $168.021.857 | $189.554.877 | $197.478.603 | $205.512.670 | $229.494.969 | $238.415.264 |
| (-) Depreciación | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $1.800.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Amortización del activo nominal | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $1.040.000 | $0 | $0 | $0 | $0 | $0 |
| (-) Costo financiero (intereses) | $3.300.611 | $3.097.191 | $2.869.361 | $2.614.192 | $2.328.402 | $2.008.317 | $1.649.822 | $1.248.308 | $798.612 | $294.952 |
| **(=) Utilidad antes de impuesto** | $-2.756.392 | $-2.332.741 | $14.762.247 | $37.886.624 | $88.669.805 | $89.393.114 | $105.026.621 | $122.403.266 | $125.798.268 | $146.698.181 |
| (-) Impuesto a la renta | $0 | $0 | $2.418.279 | $9.471.656 | $22.167.451 | $22.348.279 | $26.256.655 | $30.600.816 | $31.449.567 | $36.674.545 |
| **(=) Utilidad del ejercicio** | $-2.756.392 | $-2.332.741 | $12.343.968 | $28.414.968 | $66.502.354 | $67.044.836 | $78.769.966 | $91.802.449 | $94.348.701 | $110.023.636 |

**Tabla 3.1 “Estado de resultados proyectado”**

El primer ejercicio cierra con una pérdida de $2.756.392 y el segundo con $2.332.741. No es un defecto del modelo sino su hallazgo más útil: con 200 equipos vendidos, la estructura mínima que exige operar formalmente —dos socios, un contador, cotizaciones, servicios digitales y publicidad— no se cubre todavía. A partir de 2029 el resultado es positivo y creciente.

El impuesto a la renta se calcula bajo el régimen Pro Pyme [18], con las tasas de 12,5 % en 2027, 15 % en 2028 y 25 % desde 2029, y con arrastre de pérdidas: los $5.089.133 perdidos en los dos primeros ejercicios se descuentan de la base imponible de 2029, que por eso tributa sobre una utilidad menor que la contable. La depreciación y la amortización reducen el impuesto sin ser salidas de dinero, y por esa razón se suman de vuelta en el flujo de fondos.

### Flujo de fondos y evaluación

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Utilidad del ejercicio | $-2.756.392 | $-2.332.741 | $12.343.968 | $28.414.968 | $66.502.354 | $67.044.836 | $78.769.966 | $91.802.449 | $94.348.701 | $110.023.636 |
| (+) Depreciación y amortización | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.840.000 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 | $2.086.693 |
| (-) Cuota de capital del préstamo | $1.695.164 | $1.898.583 | $2.126.413 | $2.381.583 | $2.667.373 | $2.987.457 | $3.345.952 | $3.747.467 | $4.197.163 | $4.700.822 |
| (-) Reinversión en activo fijo | $0 | $0 | $0 | $0 | $0 | $10.433.467 | $0 | $0 | $0 | $0 |
| **(=) Flujo de fondos** | $-1.611.556 | $-1.391.324 | $13.057.555 | $28.873.385 | $66.674.981 | $55.710.605 | $77.510.707 | $90.141.676 | $92.238.231 | $107.409.507 |
| Caja acumulada | $11.228.229 | $9.836.905 | $22.894.460 | $51.767.846 | $118.442.827 | $174.153.432 | $251.664.139 | $341.805.815 | $434.044.046 | $541.453.553 |

**Tabla 3.2 “Flujo de fondos para la evaluación del proyecto”**

El flujo de fondos parte de la utilidad, le devuelve la depreciación y la amortización que no son salidas de caja, y le descuenta lo que sí sale de la empresa sin pasar por resultados: el capital del préstamo y, en 2032, la renovación del activo fijo. La caja nunca baja de $9.836.905, que ocurre en 2028. Ese es el piso que el capital de trabajo fue dimensionado para sostener.

| Indicador | Valor | Criterio | Veredicto |
|---|---:|---|---|
| Inversión inicial | $29.747.977 | — | — |
| VAN al 20 % | $112.695.657 | VAN > 0 | Cumple |
| TIR efectiva anual | 53,26 % | TIR > 20 % | Cumple |
| Payback simple | 3,68 años | ≤ 5 años | Cumple |
| Payback descontado al 20 % | 4,39 años | ≤ 5 años | Cumple |
| Caja mínima del horizonte | $9.836.905 | > 0 | Cumple |
| Deuda al cierre del horizonte | $0 | Crédito saldado | Cumple |

**Tabla 3.3 “Evaluación económica”**

Todos los indicadores cumplen su criterio. El VAN de $112.695.657 indica excedente económico después de remunerar el capital al 20 % anual; la TIR de 53,26 % supera esa exigencia en 33,26 puntos porcentuales; y la inversión se recupera en 3,68 años nominales o 4,39 descontados, dentro del plazo de cinco años que el proyecto se fijó como criterio.

La evaluación principal es a diez años porque es el plazo del crédito y porque el equipo tiene una vida comercial que excede el lustro. La comparación con un horizonte de cinco años muestra qué parte del resultado depende de esa elección:

| Indicador | A 5 años (2027–2031) | A 10 años (2027–2036) |
|---|---:|---:|
| VAN al 20 % | $16.218.777 | $112.695.657 |
| TIR efectiva anual | 32,06 % | 53,26 % |
| Caja acumulada al cierre | $118.442.827 | $541.453.553 |
| Deuda bancaria pendiente al cierre | $18.978.861 | $0 |

**Tabla 3.4 “Comparación del horizonte de evaluación: cinco y diez años”**

A cinco años el proyecto ya crea valor, con un VAN de $16.218.777, pero conserva una deuda bancaria de $18.978.861 que a diez años está saldada. El grueso del VAN se genera en la segunda mitad del horizonte, cuando la estructura ya está pagada y cada venta adicional aporta casi todo su margen de contribución: evaluar a cinco años subestimaría el negocio, pero no cambiaría la decisión.

| Tasa efectiva anual | VAN | Interpretación |
|---:|---:|---|
| 5 % | $337.797.306 | Positivo |
| 8 % | $269.461.277 | Positivo |
| 10 % | $232.371.499 | Positivo |
| 15 % | $161.503.586 | Positivo |
| 20 % | $112.695.657 | Positivo |
| 30 % | $53.633.582 | Positivo |
| 40 % | $22.100.455 | Positivo |
| 50 % | $4.118.420 | Positivo |
| TIR: 53,26 % | $0 | VAN aproximadamente cero |

**Tabla 3.5 “VAN ante distintas tasas de descuento”**

El VAN decrece monótonamente al subir la tasa de descuento y cruza cero exactamente en la TIR, tal como exige la definición de ambos indicadores, y se mantiene positivo hasta exigencias de rentabilidad muy superiores al 20 % de referencia.

### Análisis de sensibilidad y punto de quiebre

Para verificar la robustez del resultado se recalculó el proyecto modificando una condición a la vez y **manteniendo congelado el financiamiento**, porque un banco no redimensiona el crédito cada vez que cambia una proyección.

| Caso | Precio de lista | Utilidad del año 1 | VAN a 10 años | TIR | Caja mínima |
|---|---:|---:|---:|---:|---:|
| Caso base | $449.129 | $-2.756.392 | $112.695.657 | 53,3 % | $9.836.905 |
| Ventas -10 % | $449.129 | $-7.600.680 | $59.657.604 | 38,3 % | $-3.732.460 |
| Ventas -25 % | $449.129 | $-14.867.112 | $-22.060.606 | 12,6 % | $-45.626.817 |
| Ventas -35 % | $449.129 | $-19.711.399 | $-81.985.514 | -11,0 % | $-92.033.114 |
| Ventas +20 % | $449.129 | $6.065.661 | $218.853.683 | 81,4 % | $20.019.417 |
| BOM +15 % | $449.129 | $-5.055.508 | $87.433.221 | 46,0 % | $3.384.253 |
| BOM +30 % | $449.129 | $-7.354.625 | $61.937.541 | 38,6 % | $-3.068.399 |
| Precio rebajado a $429.990 (−4,3 %) | $429.990 | $-5.781.576 | $79.585.308 | 43,9 % | $1.358.828 |
| Precio rebajado a $399.990 (−10,9 %) | $399.990 | $-10.523.593 | $26.868.819 | 28,4 % | $-17.055.399 |
| Precio rebajado a $379.990 (−15,4 %) | $379.990 | $-13.684.937 | $-8.789.937 | 17,1 % | $-34.765.930 |
| Precio rebajado a $359.990 (−19,8 %) | $359.990 | $-16.846.282 | $-45.693.817 | 4,3 % | $-63.237.355 |

**Tabla 3.6 “Análisis de sensibilidad y punto de quiebre”**

Tres lecturas se desprenden de la tabla:

- **El punto de quiebre del volumen está entre una caída del 10 % y una del 25 % en las ventas.** Con −10 % el VAN sigue positivo en $59.657.604 pero la caja se vuelve negativa, de modo que el proyecto destruiría liquidez antes de destruir valor: la restricción que aparece primero es de caja, no de rentabilidad.
- **El costo de materiales admite desviación.** Un alza del 15 % en la BOM deja el VAN en $87.433.221 y la caja positiva; a +30 % el VAN sigue siendo de $61.937.541, pero la caja mínima cae a $-3.068.399. El margen resiste, pero confirma que la cotización de la sonda no admite descuido.
- **El precio no admite rebaja.** Con el financiamiento dimensionado, la caja se vuelve negativa con cualquier precio de lista inferior a $426.923, apenas un 4,9 % bajo el precio calculado, y el proyecto deja de crear valor bajo $384.854. Ese resultado confirma que el precio debe derivarse del costo y no fijarse por aspiración comercial: un precio elegido para parecer competitivo, sin mirar la estructura, deja a la empresa sin caja en su segundo año.

### Costo total de propiedad para el agricultor

La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento, sino cuánto le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. El costo total de propiedad (TCO, *Total Cost of Ownership*) responde exactamente eso. La comparación se desarrolla sobre dos intensidades de uso declaradas, porque presentar una sola sería construir el argumento sobre un supuesto cómodo.

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
|---|---|---:|---:|---:|---:|
| TerraSense (equipo, kit de batería en los años 3 y 8, segundo equipo en el año 6) | Mediciones ilimitadas | $449.129 | $474.119 | $474.119 | $948.237 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |

**Tabla 3.7 “Costo total de propiedad para el agricultor”**

Los valores S1 y S2 son supuestos de mercado declarados, no referencias bibliográficas, y figuran como tales en la tabla de supuestos de mercado al final del capítulo.

Bajo la intensidad habitual, que es el caso base, el instrumento **no se paga el primer año**: $449.129 de compra frente a $200.000 de laboratorio. Frente al laboratorio el cruce ocurre en el año 3 y la ventaja se mantiene hasta el final: a diez años la diferencia es de $2.000.000 contra $948.237, 2,1 veces. Frente a la asesoría habitual el resultado es más estrecho y no es monótono: TerraSense pasa adelante en el año 4, la compra del segundo equipo en el año 6 lo deja atrás durante dos años, y recupera la ventaja en el año 8, para cerrar la década con una diferencia de 1,3 veces. Bajo uso intensivo las distancias se abren a 10,5 y 7,6 veces respectivamente.

El argumento estructural, en todo caso, no depende del precio: **el costo marginal de cada medición adicional es cero**. Un agricultor que tome cien mediciones al año acumula mil en diez años, de modo que cada una le cuesta $948 frente a los $50.000 de una muestra de laboratorio. El laboratorio y la asesoría conservan íntegramente su función en las determinaciones químicas que el instrumento no reemplaza; lo que el instrumento resuelve es el seguimiento rutinario entre temporadas, que hoy no tiene herramienta.


### Especificaciones Técnicas del Proyecto

Arquitectura General y Estrategia de Hardware: El diseño de hardware se articula en torno a una topología de bajo consumo, orientada a maximizar la autonomía del equipo en jornadas de terreno. La arquitectura separa lógicamente el sistema en un dominio de control digital (siempre energizado, pero capaz de entrar en reposo profundo) y un dominio de potencia analógico/periférico que se aísla mediante power gating cuando no está en ciclo de medición.

La fuente de energía primaria es una celda LiPo protegida de 2.000 mAh a 3,7 V nominales, equivalente a una energía de referencia de aproximadamente 7,4 Wh. Antes de llegar a cualquier otro circuito, la celda pasa por un fusible de 1 A y un diodo de protección contra inversión de polaridad: si la batería se conecta al revés, el diodo conduce y el fusible corta, de modo que ninguno de los dos protege por sí solo. Un puente soldable en serie permite además intercalar un amperímetro para medir en banco el consumo real del equipo. Desde ese punto derivan cuatro ramas:

- Rama de Carga y Elevación: un módulo combinado USB-C carga la celda con sus protecciones (sobrecarga, sobredescarga y cortocircuito) y eleva su tensión a 5 V. Esa salida alimenta todo el equipo a través del interruptor mecánico de encendido, que corta la salida del módulo y no la celda: así el equipo puede cargarse estando apagado.

- Rama de Control: la placa de desarrollo ESP32 recibe los 5 V en su entrada y los reduce a 3,3 V con su propio regulador lineal, del que se alimentan también el sensor ambiental y el transceptor RS-485. Ese regulador y el LED de alimentación de la placa consumen del orden de 6 mA mientras el equipo está encendido, aunque el microcontrolador esté en reposo, y por eso la autonomía se gestiona apagando el equipo entre jornadas y no con el reposo profundo del microcontrolador.

- Rama de Medición Conmutada: un par de transistores MOSFET, uno de canal P en serie con la alimentación de la sonda y uno de canal N gobernado por el microcontrolador, entrega los 5 V a la sonda de suelo RS-485 solo durante la lectura.

- Rama de Interfaz: tres LED indicadores gobernados por el microcontrolador y un divisor resistivo de 100 kΩ + 100 kΩ, conectado a la celda después de sus protecciones, que entrega la mitad de la tensión de batería, entre 1,5 y 2,1 V, a una entrada analógica del ESP32.

El divisor drena de forma permanente 18,5 µA (I = V/R = 3,7 V / 200 kΩ), incluso con el equipo apagado. El valor se adopta por dos razones. La primera es de medición: el conversor analógico del ESP32 muestrea cargando un condensador interno, y una fuente de alta impedancia, como un divisor de 1 MΩ + 1 MΩ, entrega lecturas más ruidosas y lentas de estabilizar; con 100 kΩ la lectura es estable sin componentes adicionales. La segunda es de proporción: en esta placa el drenaje del divisor es menor que el consumo en vacío del módulo de carga y elevación, de modo que reducirlo diez veces solo alargaría la autonomía en un 1,5 %. Las resistencias se montan en encapsulado 1206, la misma huella que admite valores de 1 MΩ: si una revisión posterior reduce el resto del consumo en apagado hasta que el divisor pese, el cambio se resuelve reemplazando dos resistencias, sin rediseñar la placa.

La carga y la elevación de tensión se resuelven mediante una PCB combinada USB-C de carga y boost, integrada como un único componente. Concentrar ambas funciones en un solo módulo reduce el número de referencias de la BOM, el área de placa portadora y los puntos de soldadura del ensamblaje, sin renunciar a las protecciones de sobrecarga, sobredescarga y cortocircuito que exige la celda de litio.


<!-- ===== PAGINA 63 ===== -->


### Sistema de Procesamiento y Conectividad

El núcleo del procesamiento recae en el módulo ESP32-WROOM-32 [19]. La elección de este SoC específico sobre alternativas mononúcleo responde a una exigencia de estabilidad concurrente: el procesador Xtensa LX6 de 32 bits y doble núcleo permite dedicar un núcleo de forma exclusiva a mantener la pila de radio (Wi-Fi/Bluetooth) y el sistema operativo en tiempo real (FreeRTOS), mientras el segundo núcleo gestiona la temporización estricta del protocolo Modbus RTU hacia la sonda. Compartir estas tareas en un solo núcleo introduciría el riesgo inaceptable de perder la conexión inalámbrica o corromper tramas de datos durante la lectura.

| Especificación | Detalle Técnico |
|---|---|
| Microcontrolador | Módulo ESP32-WROOM-32 |
| Procesamiento | Xtensa LX6, 32 bits, doble núcleo, hasta 240 MHz |
| Memoria | 520 KB SRAM interna / 4 MB Flash SPI (particiones OTA duales) |
| Conectividad | Wi-Fi 802.11 b/g/n + Bluetooth 4.2 (BR/EDR y BLE) |
| Consumo Dinámico | 95–380 mA (dependiente del estado del transceptor de radio); transmisión BLE en el orden de 130–150 mA |
| Consumo Deep-Sleep | 10 µA del módulo reteniendo RTC y memoria RTC / 5 µA en hibernación. No incluye el regulador, el LED de alimentación ni el puente USB-UART de la placa de desarrollo |
| Certificación RF | Módulo pre-certificado FCC ID 2AC7Z-ESPWROOM32 |

**Tabla 3.8 “Especificaciones Técnicas ESP32”**

63 El rango de 95 a 380 mA describe el consumo del módulo medido en su propio pin de alimentación de 3,3 V, no el consumo del sistema completo: el extremo inferior corresponde a CPU activa con radio en reposo (el estado que domina durante la fase de adquisición Modbus) y el extremo superior a un pico instantáneo de transmisión Wi-Fi a máxima potencia, que este proyecto no utiliza porque toda la comunicación con el teléfono ocurre por BLE. Durante el advertising BLE de bajo duty cycle, el consumo promedio del módulo es menor que ese piso de 95 mA porque la radio se activa en pulsos breves y espaciados; el valor de 40 mA usado en la Fase 1 del ciclo de medición corresponde a ese promedio y no contradice el rango declarado, que describe el consumo en los instantes en que el núcleo de radio está activo.


<!-- ===== PAGINA 64 ===== -->


La última fila de la tabla es una cifra del módulo y no del equipo. La BOM adquiere una placa de desarrollo que mantiene alimentados su regulador y su LED de alimentación mientras recibe tensión, con un consumo propio del orden de 6 mA [48, 49], varios cientos de veces el reposo profundo del módulo. En esta placa, por lo tanto, la herramienta de ahorro no es el reposo profundo sino el interruptor, que corta la alimentación de la placa completa; la sección de gestión energética cuantifica el efecto.

64


<!-- ===== PAGINA 65 ===== -->


### Adquisición de Datos y Sensado

- Sonda de Suelo 7-en-1 (RS-485 Modbus RTU): El nodo extrae 7 de las 10 variables del sistema mediante una sonda multiparamétrica de grado industrial, construida en acero inoxidable

316L para prevenir la corrosión por picadura inducida por cloruros en el suelo.

| Parámetro | Rango de Operación | Exactitud Declarada |
|---|---|---|
| Humedad Volumétrica | 0 – 100 % | ±2 % (en rango 0–50 %) |
| Temperatura de Suelo | −40 °C a +80 °C | ±0,3 °C |
| Conductividad Eléctrica | 0 – 20.000 µS/cm | ±3 % |
| pH | 3,0 – 9,0 | ±0,1 |
| Macronutrientes (N, P, K) | 1 – 1.999 mg/kg c/u | ±5 % (según fabricante) |

**Tabla 3.9 “Especificaciones Técnicas Sonda”**

Estas cifras provienen de la ficha de una sonda representativa de la familia [20] y no del SKU finalmente adquirido, que aún no cuenta con ficha propia publicada. La distinción no es formal: el protocolo de validación de este informe fija su criterio de aceptación sobre umbrales agronómicos propios precisamente porque la exactitud del fabricante no está verificada.

65 El rango de alimentación de 5 a 24 V DC es representativo de la familia de sondas 7-en-1 RS-485 industriales [20]; dentro de ese rango, el proyecto opera la sonda en su extremo inferior (5 V, entregados por el elevador de tensión descrito más adelante) porque coincide con la tensión que el mismo elevador ya entrega a la placa de control y evita añadir un segundo convertidor. Esta decisión se declara explícitamente como una condición de diseño a validar contra la ficha técnica definitiva del SKU adquirido, dado que otras sondas de la misma familia sólo alcanzan su exactitud declarada operando a 12 V o más; si la validación en laboratorio mostrara desviación en la lectura al operar a 5 V, la contingencia de diseño es agregar un elevador de 12 V dedicado a la sonda, detrás del mismo corte por MOSFET, lo que no altera la arquitectura general pero sí el consumo de la Rama de Medición Conmutada.


<!-- ===== PAGINA 66 ===== -->


Conviene además declarar el supuesto con que se estima el consumo de la sonda, porque no se lee directamente de ninguna ficha. La descripción del vendedor entrega 0,15W a 12 V y 0,5W a 24 V, de modo que la potencia no es constante con la tensión de alimentación. El balance energético de este informe adopta, a falta de dato a 5 V, un supuesto de potencia constante de 150 mW en el extremo inferior del rango, equivalente a 30 mA a 5 V. Ese supuesto se declara aquí como tal y figura entre las mediciones de banco que el plan de trabajo ejecuta antes de comprometer el volumen de compra. Su peso en el resultado es acotado, porque la fase de adquisición dura tres segundos, pero el método exige nombrarlo.

La comunicación se establece a 9.600 baudios vía Modbus RTU. Para mitigar variaciones entre lotes de proveedores, el mapa de registros Modbus, la dirección del esclavo y los coeficientes de calibración no estarán fijados en el firmware, sino que residirán parametrizados en la memoria no volátil (NVS) del ESP32, permitiendo ajustes remotos por actualización remota.

- Sensor Ambiental (Bosch BME280): Para las variables climáticas superficiales se integra un sensor BME280 en el bus I²C. Este componente aporta mediciones de temperatura (±1,0 °C), humedad relativa (±3 % HR) y presión barométrica (±1,0 hPa) [13]. Dado que su consumo en reposo es de apenas 0,1 µA, una cifra inferior a la corriente de fuga intrínseca de los transistores convencionales, se prescinde de un circuito de corte dedicado. El sensor operará en forced mode, autogestionando su transición a reposo tras cada muestreo; los 3,6 µA son el consumo medio a 1

Hz declarado en la hoja de datos, no la corriente instantánea durante la conversión 66 Trama de Datos BLE: El instrumento actúa como puente entre dos entornos distintos: hacia la sonda ejecuta una consulta Modbus RTU y verifica la respuesta; hacia el teléfono publica los datos ya decodificados en una característica GATT. La aplicación no necesita generar señales RS-485 ni procesar el cableado industrial, sino consumir un contrato de datos de aplicación. El contrato es único y de longitud fija:


<!-- ===== PAGINA 67 ===== -->


20 bytes, con valores multibyte en formato big-endian. El equipo transmite siempre las diez variables (siete de suelo, tres de ambiente) más el estado de batería en una sola notificación; no existen tramas parciales ni modos reducidos.

| Bytes | Contenido | Tipo y escala | Interpretación en la App |
|---|---|---|---|
| 0–1 | Humedad volumétrica de suelo | uint16, ÷10 | Porcentaje con un decimal |
| 2–3 | Temperatura de suelo | int16 con signo, ÷10 | Grados Celsius, admite valores bajo cero |
| 4–5 | Conductividad eléctrica | uint16 | µS/cm directo |
| 6–7 | pH | uint16, ÷10 | Unidades de pH con un decimal |
| 8–9 | Nitrógeno (N) | uint16 | mg/kg, presentado como registro informativo |
| 10–11 | Fósforo (P) | uint16 | mg/kg, presentado como registro informativo |
| 12–13 | Potasio (K) | uint16 | mg/kg, presentado como registro informativo |
| 14 | Batería | uint8 | Porcentaje 0–100, no milivoltios |
| 15 | Identificador de formato | uint8 | Constante 0x01, que identifica este contrato de 20 bytes |
| 16–19 | Ambiente BME280 | 32 bits empaquetados | Temperatura del aire (12 bits, °C × 10 + 400), presión (12 bits, hPa − 300) y humedad relativa (8 bits, % × 2) |

**Tabla 4.0 “Contrato de Datos BLE (20 bytes)”**

67 Un cambio de orden de bytes o de escala puede producir cifras plausibles pero incorrectas, mucho más difíciles de detectar que una desconexión visible: una humedad de 35,0 % leída como 8.960 se advierte de inmediato, pero un pH mal escalado que arroje 6,5 en lugar de 5,6 puede pasar inadvertido y provocar una recomendación equivocada.


<!-- ===== PAGINA 68 ===== -->


Las tres magnitudes del BME280 viajan dentro de la misma trama y no en una característica GATT separada: los bytes 16 a 19 empaquetan temperatura del aire, presión y humedad relativa en 12, 12 y 8 bits respectivamente. La razón de ese empaquetado es exacta y no estética: 20 bytes es la carga útil máxima que cabe en una notificación BLE con el MTU por defecto de 23 bytes (20 de datos más 3 de cabecera del protocolo). Al caber entera en un solo paquete, la medición de suelo y la de ambiente pertenecen por construcción a la misma captura, sin necesidad de emparejar dos paquetes, sin riesgo de mezclar lecturas de instantes distintos y sin negociar un MTU mayor que algunos teléfonos Android no conceden.

El byte 15 no es un selector de funciones opcionales sino un identificador de formato: vale 0x01 y su única función es permitir que una revisión futura del firmware cambie la disposición de los campos sin romper la aplicación instalada, que verificará ese byte antes de decodificar y rechazará una trama cuyo formato no reconozca. Es exactamente el fallo silencioso descrito más arriba lo que ese identificador previene.

Cuando el BME280 no responde, el firmware escribe un centinela de todos unos (0xFFF en cada campo de 12 bits, 0xFF en el de 8) y la aplicación almacena un valor nulo: la trama conserva su largo de 20 bytes, la ausencia queda marcada como tal y nunca se sustituye un dato faltante por un valor plausible.

68


<!-- ===== PAGINA 69 ===== -->


### Estado Probatorio de las Especificaciones Declaradas

Las tablas anteriores mezclan, inevitablemente, cifras de distinta solidez: algunas provienen de la hoja de datos del componente exacto que se va a montar, otras de una ficha representativa de la familia mientras no se cierre el SKU, y otras son estimaciones de diseño aún no medidas en banco. Presentarlas todas con el mismo peso sería engañoso, de modo que se clasifican explícitamente:

| Especificación declarada | Origen de la cifra | Nivel de evidencia | Qué falta para confirmar |
|---|---|---|---|
| ESP32-WROOM-32: procesamiento, memoria, radio | Hoja de datos del módulo [19] | Confirmada por hoja de datos del componente seleccionado | Nada |
| ESP32: reposo profundo 10 µA | Hoja de datos del módulo [19] | Confirmada para el módulo; no determina la autonomía, porque la placa de desarrollo tiene un consumo propio mayor | Nada |
| Consumo propio de la placa de desarrollo: ≈6 mA en su entrada de 5 V (regulador y LED de alimentación) | Hoja de datos de un regulador representativo de la categoría y guía de la placa [48, 49] | Representativa, no medida sobre la placa adquirida | Medir en banco la corriente de la placa encendida con el microcontrolador en reposo |
| ESP32: FCC ID 2AC7Z-ESPWROOM32 | Certificado modular del fabricante | Confirmada | Verificar que la integración respeta las condiciones del certificado modular |
| BME280: ±1,0 °C, ±3 % HR, ±1,0 hPa, 0,1 µA en reposo | Hoja de datos Bosch del componente exacto [13] | Confirmada por hoja de datos del componente seleccionado | Nada; verificar la respuesta térmica una vez montado tras el respiradero |
| SP3485: 2 mA con driver habilitado | Hoja de datos del transceptor exacto [24] | Confirmada por hoja de datos del componente seleccionado | Nada |
| Interruptor de encendido después del módulo de carga | Decisión de diseño del esquemático | Definida, no medida | Medir la corriente de la celda con el interruptor abierto, usando el puente soldable de medición |
| Sonda 7-en-1: rangos y exactitudes de las 7 variables | Ficha de una sonda representativa de la familia [20]; el SKU no tiene ficha propia publicada | Representativa de la familia, no del SKU | Exigir la ficha técnica del SKU al proveedor antes de la orden de compra, y contrastar con la campaña de validación de 30 muestras |
| Sonda: alimentación 5–24 V DC y consumo 30 mA a 5 V | Descripción del vendedor (4,5–30 V; 0,15 W a 12 V; 0,5 W a 24 V) más supuesto propio de potencia constante | Supuesto de diseño sobre declaración del vendedor | Medir consumo y exactitud operando a 5 V; si la exactitud se degradara, la contingencia es elevar a 12 V |
| Sonda: acero inoxidable 316L | Descripción del vendedor | Declaración del vendedor | Certificado de material o ensayo; afecta la vida útil en suelos salinos |
| Módulo de carga y elevación en vacío: 30–100 µA | Integrado de referencia de la categoría [21] | Estimación de diseño, no medida | Medir en banco sobre el módulo finalmente adquirido |
| Elevador: eficiencia η ≈ 0,85 | Valor típico de convertidores elevadores de esta clase y corriente | Estimación de diseño, no medida | Medir la eficiencia real a la corriente de excitación de la sonda |
| Divisor de batería: 18,5 µA | Cálculo directo (3,7 V / 200 kΩ) sobre el valor de resistencia adoptado | Calculada a partir de una decisión de diseño | Nada; verificar con las resistencias reales y su tolerancia |
| Autonomía: ≈9 semanas por carga en uso habitual | Balance energético por nodo sobre las líneas anteriores | Calculada; hereda la incertidumbre de las estimaciones anteriores | Medir la energía de una jornada tipo y la corriente con el equipo apagado |

**Tabla 4.1 “Estado Probatorio de las Especificaciones de Hardware”**

70 La conclusión que se desprende de esta clasificación es concreta y define la prioridad de la etapa siguiente.


<!-- ===== PAGINA 71 ===== -->


La electrónica de control está confirmada por hojas de datos de los componentes exactos, y la incertidumbre relevante se concentra en dos puntos: la sonda de suelo, que concentra además el 68,9 % del costo de materiales, y el consumo propio de la placa de desarrollo y del módulo de carga, que en esta placa determinan la autonomía. De ahí que las dos primeras acciones del plan de trabajo sean exigir al proveedor la ficha del SKU específico junto a una unidad de muestra para medición en banco, y medir el consumo del conjunto ensamblado encendido y apagado, ambas antes de comprometer cualquier volumen de compra.

71


<!-- ===== PAGINA 72 ===== -->


### Gestión Energética

La autonomía del dispositivo depende de dos cortes: el que el microcontrolador aplica a la sonda en cada medición y el que el usuario aplica al equipo completo entre jornadas.

| Componente de Potencia | Función en la Arquitectura |
|---|---|
| Fusible de 1 A y diodo de protección | Protección de la celda contra cortocircuito e inversión de polaridad: el diodo detecta la inversión y el fusible corta. |
| PCB combinada USB-C (carga + boost) | Carga de la celda de litio por USB-C con protecciones (sobrecarga, sobredescarga, cortocircuito) y elevación a 5 V para todo el equipo, en un solo módulo. |
| Interruptor mecánico de encendido | Corta la salida de 5 V del módulo hacia el resto del equipo; la celda queda conectada al módulo para poder cargar con el equipo apagado. |
| Regulador de 3,3 V de la placa de desarrollo | Alimenta el microcontrolador, el sensor ambiental y el transceptor RS-485 a partir de los 5 V. |
| MOSFET de canal P y de canal N | Corte de la alimentación de 5 V de la sonda, gobernado por un pin del microcontrolador. |
| Divisor resistivo 100 kΩ + 100 kΩ | Lectura del estado de batería por la entrada analógica del microcontrolador. |

**Tabla 4.2 “Gestión Energética”**

El corte de la sonda está resuelto para fallar hacia el lado seguro. El MOSFET de canal P, en serie con los 5 V de la sonda, mantiene su compuerta en alto mediante una resistencia de 10 kΩ, de modo que la rama queda apagada por defecto; el microcontrolador la habilita encendiendo el MOSFET de canal N, que lleva esa compuerta a tierra. Si el programa se detiene o el microcontrolador se reinicia, la sonda queda desconectada, y en operación normal solo se energiza durante los tres segundos de la adquisición. Sin ese corte, sus 176,5 mW referidos a la batería se sumarían de forma continua a los 141,2 mW que el equipo consume en espera, más que duplicándolos.

Con el equipo encendido y el microcontrolador en reposo, el consumo no baja de la decena de miliamperios. La placa de desarrollo mantiene alimentados su regulador y su LED, y como la placa recibe 5 V desde el elevador, cada miliamperio de la rama de 3,3 V le cuesta a la batería la potencia de un miliamperio a 5 V dividida por la eficiencia del elevador. Solo el consumo propio de la placa representa 35,3 mW desde la batería, varios cientos de veces lo que consumiría el módulo ESP32 en reposo profundo. Por eso, en esta placa, dejar el equipo encendido entre jornadas no es una opción de operación: el equipo se enciende al llegar al campo y se apaga al terminar.

Con el interruptor abierto quedan conectados a la celda solo dos consumos: el divisor de batería, 18,5 µA, y el módulo de carga y elevación en vacío, entre 30 y 100 µA según su modo de reposo [21]. El balance adopta el extremo superior, a confirmar en banco, lo que da ≈0,12 mA en total, dos órdenes de magnitud bajo el consumo del equipo encendido.

Esta arquitectura tiene un camino de mejora identificado para una versión de producción: reemplazar la placa de desarrollo por el módulo ESP32 desnudo, alimentado desde la celda por un regulador de baja corriente de reposo, como el HT7533 de 2,5 µA [22]. Eso permitiría dejar el equipo en reposo profundo entre mediciones sin apagarlo, a cambio de incorporar a la placa portadora el regulador, el conversor USB-serie y el circuito de arranque que hoy aporta la placa de desarrollo.

A modo de referencia del árbol de alimentación completo, incluyendo el punto de corte del MOSFET y los dos nodos de tensión regulada:


<!-- ===== PAGINA 74 ===== -->


> *[imagen del documento original]*

**Figura 1.8 “Árbol de Alimentación y Nodos de Tensión”**

El diagrama hace explícito lo que el balance energético por nodo cuantifica más adelante: toda la energía pasa primero por el elevador de 5 V, y la rama de 3,3 V cuelga de él a través del regulador lineal de la placa, de modo que ninguna corriente puede sumarse directamente a otra sin antes referirla a la batería.

74 Interfaz Física de Usuario: El panel físico del equipo se reduce deliberadamente a lo mínimo indispensable para la operación en terreno. El panel frontal centraliza las interacciones físicas, aislando las entradas de cableado en la sección inferior:


<!-- ===== PAGINA 75 ===== -->


> *[imagen del documento original]*

**Figura 1.9 “Representación Conceptual de Carcasa”**

75 La interfaz consta de tres luces indicadoras, un botón de emparejamiento, un puerto USB-C de carga y un interruptor mecánico de encendido dimensionado para ser accionable incluso con guantes de trabajo pesados. Las tres luces comunican, mediante distintos patrones de encendido, la totalidad de los estados relevantes del equipo sin necesidad de abrir la aplicación:


<!-- ===== PAGINA 76 ===== -->


| Estado Operativo | Indicador Activo | Patrón de Señalización | Significado Técnico |
|---|---|---|---|
| Buscando conexión | 🔵 Azul | Pulso suave (1 Hz) | Encendido, emitiendo advertising a la espera de un enlace BLE. |
| Modo de emparejamiento | 🔵 Azul | Parpadeo rápido (4 Hz) | Ventana de enlace abierta durante 30 s. |
| Enlazado y listo | 🟢 Verde | Iluminación fija | Conexión BLE establecida correctamente con el teléfono. |
| Medición exitosa | 🟢 Verde | Tres destellos rápidos | Lectura capturada y transmitida correctamente. |
| Batería baja | 🔴 Rojo | Pulso lento (0,5 Hz) | Tensión de batería bajo el umbral de aviso; requiere recarga por USB-C. |
| Error de sonda | 🔴 Rojo | Parpadeo rápido (2 Hz) | Fallo o tiempo de espera agotado en la comunicación Modbus. |

**Tabla 4.3 “Interfaz Hardware”**

76


<!-- ===== PAGINA 77 ===== -->


### Carcasa del Dispositivo

Aislada de la interfaz de usuario, la envolvente física se enfoca exclusivamente en la estanqueidad, durabilidad e integración de los sensores en entornos agrícolas agresivos.

- Material y Estructura: La carcasa se fabrica en PETG mediante impresión 3D FDM. A diferencia del PLA o ABS, el PETG resiste la intemperie y la radiación UV. La rigidez frente a caídas sobre gravilla se logra mediante un relleno al 40–60 %, mientras que la estanqueidad depende de la configuración de perímetros sólidos (≥ 4 capas, altura de 0,16–0,20 mm).

### Sellado de Componentes

- Junta Principal: Utiliza un O-ring de silicona comprimido de forma controlada mediante insertos roscados M3 entre la tapa y el cuerpo.

- Salida de Sonda: El cable hacia la sonda de suelo emplea un prensaestopas industrial M12 en la base. Actúa como sellado y alivio de tracción; sin él, cualquier tirón transmitirá el esfuerzo mecánico directo a las soldaduras de la PCB.

77


<!-- ===== PAGINA 78 ===== -->


### Criterios de Eficiencia Energética y Digitalización

Toda la ingeniería de energía del equipo se reduce a una sola regla, declarada de forma explícita y aplicada sin excepción a cada decisión de diseño, desde la elección del microcontrolador hasta el tipo de LED montado en el panel:

Toda energía que el instrumento consume fuera del instante de medición es energía desperdiciada, y esa energía desperdiciada se paga dos veces: en autonomía perdida para el usuario y en batería adicional que hay que comprar.

Esta regla es la que explica, con hilo conductor, las decisiones de hardware adoptadas: por qué el equipo no lleva pantalla, por qué existe un MOSFET dedicado solo a cortar la alimentación de la sonda, por qué se prefirieron LED por sobre otros métodos de alerta y por qué el equipo lleva un interruptor mecánico que corta la alimentación de la placa completa entre jornadas.

Digitalización del Proceso Agrícola: El segundo eje, tan determinante como la eficiencia energética, es la digitalización del proceso de toma de decisiones en terreno. TerraSense transforma un proceso hoy manual y no trazable, la estimación visual, la memoria del agricultor o, en el mejor de los casos, un cuaderno de papel en un flujo digital estructurado: cada medición queda georreferenciada, con marca de tiempo y sincronizada a una base histórica consultable. El agricultor pasa de "estimar" a "medir y registrar", cerrando la brecha de datos que hoy impide a instituciones públicas y privadas focalizar sus políticas de apoyo al sector. Esta digitalización se sostiene sobre cuatro pilares técnicos:

78


<!-- ===== PAGINA 79 ===== -->


| Pilar de digitalización | Cómo se implementa en TerraSense |
|---|---|
| Offline-first con store & forward | El motor agronómico, el almacenamiento local persistente del teléfono y la captura BLE operan sin red; las mediciones se encolan localmente y se sincronizan de forma diferida en cuanto el teléfono detecta cobertura, sin bloquear ni degradar la operación en terreno. |
| Arquitectura multi-rol | La consola web distingue perfiles de agricultor, asesor técnico/extensionista y administrador de cooperativa, con seguridad a nivel de fila aplicando aislamiento de datos por campo y por rol. |
| Actualización remota (OTA) | El mapa de registros Modbus, la dirección del esclavo y los coeficientes de calibración residen en la memoria no volátil del microcontrolador y son actualizables sin reemplazar el firmware completo; la app móvil se distribuye por los canales estándar de actualización de cada tienda de aplicaciones. |
| Accesibilidad digital (WCAG 2.1 AA) [23] | Contraste mínimo de 4,5:1 entre texto y fondo, área táctil mínima de 48×48 dp y prohibición del color como único portador de información, pensado para usuarios de distintos niveles de alfabetización digital y para la lectura bajo sol directo en terreno. |

**Tabla 4.4 “Pilares de Digitalización del Proceso Agrícola”**

Esta digitalización habilita capacidades imposibles bajo el modelo análogo, tales como comparar la evolución de un mismo punto del campo a lo largo de distintas temporadas y mantener un registro histórico respaldado. De este modo, el agricultor puede compartir información precisa con su asesor técnico sin depender de la memoria ni de anotaciones manuales.

79


<!-- ===== PAGINA 80 ===== -->


### Arquitectura de la Gestión Eficiente de Energía

El rendimiento real lo dictan componentes básicos implementados estratégicamente. La sonda no permanece alimentada mientras el equipo está encendido: dos MOSFET gobernados por el microcontrolador cortan su alimentación salvo durante los segundos exactos en que se toma una lectura. Sin ese corte, la sonda sola consumiría más que todo el resto del equipo en espera. Los dos MOSFET cuestan en conjunto $38 y son, proporcionalmente, la mejor inversión electrónica del diseño.

Sin embargo, el componente que más autonomía aporta no es electrónico, sino mecánico: el interruptor que permite al usuario apagar el equipo por completo en lugar de dejarlo emitiendo advertising Bluetooth de forma permanente. La diferencia entre un equipo apagado y uno en publicidad continua es de varios órdenes de magnitud en consumo, y la determina una pieza de menos de $1.000 CLP.

80


<!-- ===== PAGINA 81 ===== -->


### Los Estados de Consumo

El equipo no tiene un único nivel de consumo, sino que transita entre estados bien delimitados. Dado que el dispositivo pasa la mayor parte de su vida útil en reposo, el diseño se enfoca en gestionar estas transiciones y en acotar el tiempo que permanece conectado:

| Estado | Qué permanece activo | Medida de diseño |
|---|---|---|
| Almacenamiento | Circuitos no desconectados por el interruptor y autodescarga de la celda | Identificar rutas reales de consumo y verificar el método de apagado |
| Reposo | Control, regulación y periféricos retenidos | Medir la corriente del conjunto; revisar LED de alimentación y puente USB-UART |
| Publicidad y conexión | Radio BLE y control | Ventanas acotadas de advertising y reintento controlado |
| Medición | Sonda, interfaces RS-485 y lectura ambiental | Habilitar solo durante estabilización y adquisición |
| Entrega y espera | Comunicación y procesamiento | Confirmar envío y regresar al estado de menor consumo |
| Carga | Circuito USB-C y celda | Verificar corriente, temperatura y efecto del calor sobre la lectura ambiental |

**Tabla 4.5 “Estados Energéticos y Medidas de Diseño”**

81


<!-- ===== PAGINA 82 ===== -->


### Modelo de Autonomía en el Campo

Cada vez que el usuario pulsa “Medir”, se dispara una lectura y el equipo recorre tres fases consecutivas. Entre una medición y otra el equipo permanece encendido en espera, con el enlace BLE disponible, y al final de la jornada se apaga con el interruptor.

El error metodológico más común al estimar autonomía es sumar corrientes de distintos nodos de tensión como si fueran directamente equivalentes. El equipo no opera a una única tensión: la celda entrega 3,7 V nominales, el elevador la lleva a 5 V para todo el equipo, y la rama digital trabaja a 3,3 V detrás del regulador lineal de la placa de desarrollo. Un miliamperio-hora no significa lo mismo en cada uno de esos nodos, de modo que el balance completo se plantea en unidades de energía (mWh) y no de carga (mAh): la energía sí es aditiva entre nodos de distinta tensión, la carga no.

La conversión hacia la batería sigue una sola cadena. El elevador, de eficiencia η ≈ 0,85 [21], entrega los 5 V a costa de un 15 % de pérdida. El regulador lineal de la placa entrega a la rama de 3,3 V la misma corriente que toma de los 5 V, y disipa como calor la diferencia de tensión. Por eso la potencia desde la batería de cualquier componente de la rama de 3,3 V es 5 V × corriente del nodo / η, y solo el 56 % de la energía que sale de la celda llega efectivamente a la electrónica de 3,3 V. La sonda, que cuelga directamente de los 5 V, pierde solo la eficiencia del elevador.

| Fase | Componente | Nodo / tensión | Corriente en el nodo | Potencia en el nodo | Potencia desde la batería (3,7 V) |
|---|---|---|---|---|---|
| Todas | Consumo propio de la placa de desarrollo (regulador y LED) | 5 V (entrada de la placa) | 6 mA | 30,0 mW | 35,3 mW |
| Espera encendido | ESP32 con enlace BLE en espera | 3,3 V (regulador de la placa) | 18 mA | 59,4 mW | 105,9 mW |
| 1. Publicidad y conexión | ESP32 en advertising BLE | 3,3 V (regulador de la placa) | 40 mA | 132 mW | 235,3 mW |
| 2. Adquisición del conjunto | ESP32 (temporización Modbus) | 3,3 V (regulador de la placa) | 95 mA | 313,5 mW | 558,8 mW |
|  | Transceptor SP3485 (driver activo) [24] | 3,3 V (regulador de la placa) | 2 mA | 6,6 mW | 11,8 mW |
|  | BME280 (muestreo forced-mode) | 3,3 V (regulador de la placa) | 0,0036 mA | 0,012 mW | 0,021 mW |
|  | Sonda 7-en-1 (excitación y lectura) | 5 V (elevador, η≈0,85) | 30 mA | 150 mW | 150 mW / 0,85 ≈ 176,5 mW |
|  | Polarización del corte de la sonda (10 kΩ) | 5 V (elevador, η≈0,85) | 0,5 mA | 2,5 mW | 2,9 mW |
| 3. Envío del resultado | ESP32 transmitiendo BLE | 3,3 V (regulador de la placa) | 150 mA | 495 mW | 882,4 mW |

**Tabla 4.6 “Balance Energético por Nodo de Tensión”**

| Fase Operativa | Potencia desde la batería | Duración | Energía por ciclo |
|---|---|---|---|
| 1. Publicidad y conexión | 270,6 mW | 12 s | 0,902 mWh |
| 2. Adquisición del conjunto | 785,3 mW | 3 s | 0,654 mWh |
| 3. Envío del resultado | 917,6 mW | 1 s | 0,255 mWh |
| Total por ciclo | Variable | 16 s | 1,811 mWh |

**Tabla 4.7 “Energía por Ciclo de Medición”**

Tres precisiones sostienen estas tablas frente a un cálculo por suma directa de corrientes. La sonda toma 150 mW en su nodo de 5 V, pero exige 176,5 mW a la batería: el factor 1/η = 1,176 que impone el elevador es energía perdida en la conversión. La rama de 3,3 V exhibe una pérdida mayor: los 40 mA de la Fase 1 valen 132 mW en su nodo, pero cuestan 235,3 mW de batería, porque el regulador lineal y el elevador pierden en serie. Y el consumo propio de la placa, 35,3 mW desde la batería, está presente en todas las fases y en la espera, de modo que la energía de la jornada la determina el tiempo que el equipo permanece encendido, no el número de mediciones. La corriente de transmisión del ESP32 en la Fase 3 se fija en 150 mA, el extremo superior de la banda de transmisión BLE declarada en la comparativa de microcontroladores; el consumo del transceptor SP3485 se toma del extremo superior de su hoja de datos [24]; y el de la sonda, del supuesto de potencia constante ya declarado.

### Autonomía según el Patrón de Uso

Como el equipo se apaga entre jornadas, la autonomía no se expresa en tiempo de reposo sino en jornadas de trabajo por carga. El ejercicio supone jornadas de 2 horas encendido con 10 mediciones cada una (294,2 mWh por jornada), una capacidad útil de 1.600 mAh equivalente a 5.920 mWh a 3,7 V, el consumo con el equipo apagado de la sección anterior (0,44 mW) y una autodescarga de la celda del 2 % mensual (4,93 mWh por día):

| Patrón de uso | Jornadas | Autonomía con una carga | Mediciones por carga |
|---|---|---|---|
| Equipo olvidado encendido, sin medir | Continuo | 41,9 horas (≈ 1,7 días) | — |
| Uso intensivo: una jornada diaria de 2 h con 10 mediciones | Diario | 19,2 días (≈ 2,7 semanas) | 190 |
| Uso habitual: dos jornadas semanales de 2 h con 10 mediciones | 2 por semana | 59,6 días (≈ 8,5 semanas) | 170 |
| Almacenado apagado, sin uso | Ninguno | 383,0 días (≈ 12,6 meses) | — |

**Tabla 4.8 “Autonomía según el Patrón de Uso”**

La tabla muestra la consecuencia de operar con placa de desarrollo: el mismo equipo que almacenado apagado conserva su carga durante más de un año, se descarga en menos de dos días si se olvida encendido. Bajo el uso habitual, dos jornadas por semana, una carga dura del orden de 9 semanas y 170 mediciones; bajo uso intensivo diario, del orden de 3 semanas. En ambos casos la recarga se resuelve con el mismo cargador USB-C del teléfono, y el equipo puede cargarse apagado.

### Sensibilidad de la Autonomía

Las cifras anteriores heredan dos estimaciones no medidas: el consumo propio de la placa de desarrollo y el consumo en vacío del módulo de carga. La siguiente tabla acota su efecto sobre el uso habitual:

| Variación sobre el uso habitual | Autonomía con una carga | Cambio frente al diseño adoptado |
|---|---|---|
| Diseño adoptado (valores de la tabla de balance) | 59,6 días (≈ 8,5 semanas) | — |
| Consumo propio de la placa del doble de lo estimado (12 mA) | 49,6 días (≈ 7,1 semanas) | −16,9 % |
| Fuga no identificada de 1 mA con el equipo apagado | 31,8 días (≈ 4,5 semanas) | −46,6 % |
| Jornadas de 4 h en lugar de 2 h | 32,9 días (≈ 4,7 semanas) | −44,8 % |
| Divisor de batería de 1 MΩ + 1 MΩ | 60,5 días (≈ 8,6 semanas) | +1,5 % |

**Tabla 4.9 “Sensibilidad de la Autonomía al Consumo y al Uso”**

Las variables decisivas son el tiempo que el equipo pasa encendido y lo que consume apagado: duplicar la duración de las jornadas reduce la autonomía en un 45 %, duplicar el consumo propio de la placa en un 17 % y una fuga de 1 mA con el equipo apagado en un 47 %. El divisor de batería, en cambio, casi no pesa: reemplazarlo por uno de 1 MΩ + 1 MΩ la alarga apenas un 1,5 %, y por eso se conserva el de 100 kΩ, que entrega una lectura más estable.

La cifra de referencia que se sostiene de aquí en adelante, de forma consistente en Síntesis y Conclusiones, es la del uso habitual: aproximadamente 9 semanas (170 mediciones) con una sola carga, con un piso de 4,5 semanas si se materializara una fuga de 1 mA antes de validarse en laboratorio.

Corresponde subrayar el carácter de esta cifra: es un resultado calculado, no medido. Procede del balance energético por nodo con las eficiencias declaradas, y su confirmación exige medir el consumo del conjunto ensamblado encendido y apagado. Esa medición es la primera de las verificaciones pendientes que este informe enumera en sus conclusiones.


### Sostenibilidad Ambiental y Análisis Competitivo

Al comparar el sistema contra los estándares de la industria, el proyecto enfrenta con honestidad las diferencias de arquitectura. Las referencias siguientes son dos casos puntuales documentados y no una descripción exhaustiva del mercado:

| Equipo | Fuente de energía especificada | Recambio y continuidad operativa | Parámetros medidos |
|---|---|---|---|
| Bluelab Pulse [25] | 1 pila AA alcalina | Sustituir la pila agotada; conviene disponer de repuesto | 3 (conductividad, humedad y temperatura), con app |
| Hanna HI9814 [6] | 3 pilas AAA de 1,5 V | Sustituir el juego completo; ~600 horas de uso continuo declaradas | 4 (pH, EC, TDS y temperatura), en soluciones hidropónicas |
| TerraSense | 1 celda LiPo recargable de 2.000 mAh, carga USB-C | Recargar la misma celda; sustituirla al degradarse | 7 registros de suelo + 3 ambientales, con interpretación agronómica móvil |

**Tabla 5.0 “Análisis Comparativo de Parámetros”**

87 TerraSense busca reducir el recambio habitual de pilas primarias al recuperar la carga de la misma celda durante muchos ciclos de uso, lo que para el agricultor significa menos compras de repuestos y la posibilidad de cargar el equipo antes de una jornada mediante USB-C. Conviene reconocer, sin embargo, la ventaja operativa que conservan las pilas intercambiables: permiten reanudar el trabajo de inmediato con un repuesto, mientras que la batería integrada obliga a planificar la carga y a asegurar acceso a energía.


<!-- ===== PAGINA 88 ===== -->


Esta arquitectura se alinea además con la normativa ambiental, aunque conviene enunciar el alcance con precisión. Un instrumento dependiente de pilas primarias genera un flujo constante de residuos: un juego de pilas por temporada, o varios, durante toda la vida útil del equipo. El uso de una celda de litio recargable mediante USB-C reduce ese flujo a una celda cada varios años: del orden de cuatro en diez años según el propio cuadro de costo total de propiedad (la original, las de los kits de batería de los años 3 y 8 y la del segundo equipo del año 6). Lo que no hace, y sería incorrecto afirmarlo, es eliminar el residuo: una celda de litio recargable es igualmente un residuo prioritario bajo la Ley REP N° 20.920 [26], y precisamente por eso el diseño contempla celdas extraíbles con herramientas comunes y la habilitación de un canal de recepción al fin de la vida útil, obligaciones que se detallan en la matriz normativa.

88


<!-- ===== PAGINA 89 ===== -->


### Síntesis de Eficiencia Energética

El diseño del sistema prioriza la autonomía como un atributo crítico de confiabilidad. Con la placa de desarrollo que adquiere la BOM, esa autonomía se obtiene cortando la energía donde no se usa: la sonda solo recibe alimentación durante la lectura y el equipo completo se apaga entre jornadas. Bajo el uso habitual, una carga sostiene aproximadamente 9 semanas de trabajo (170 mediciones) según el balance energético por nodo. Esta eficiencia es fruto de tres pilares de diseño:

- Aislamiento Activo (Power Gating): Utilización de dos MOSFET para desconectar físicamente la sonda fuera de la lectura, de modo que su consumo no se suma a la espera.

- Apagado Completo entre Jornadas: Un interruptor mecánico corta la salida del módulo de carga hacia la placa, dejando conectados a la celda solo el divisor de batería y el módulo en vacío, del orden de 0,12 mA.

- Optimización de Radio y Gestión Local: Empleo de Bluetooth Low Energy (BLE) con tramas de 20 bytes de longitud fija y ciclos de medición acotados (16 segundos), mientras el procesamiento offline en el teléfono libera al instrumento de tareas de cómputo intensivas y de almacenamiento.


### Condiciones Técnicas y Normativas Respecto al Diseño

El marco regulatorio aplicable al proyecto TerraSense organiza su cumplimiento normativo en seis dominios fundamentales: hardware y seguridad eléctrica, radiofrecuencia y telecomunicaciones, buses industriales, estándares edafológicos, protección de datos y accesibilidad, y protección al consumidor.

### Hardware

- IEC 60529 [27]: Exige un grado de protección IP67 (estanco al polvo, sin depósito interior, e inmersión a 1 metro de profundidad durante 30 minutos). En el proyecto, esto se aborda mediante una envolvente en PETG con sellado intercapa, O-ring de silicona y prensaestopas M12.

- UN 38.3 / IEC 62133-2 [28]: Define los ensayos de estrés (altitud, choque térmico, cortocircuito) para celdas de ion-litio secundarias. El diseño lo aborda integrando celdas comerciales con certificación de origen, complementadas por la protección electrónica del módulo cargador.

- RoHS 2011/65/EU y RoHS 3 (2015/863): Restringe el uso de metales pesados en la electrónica.

El proyecto exige el uso de soldadura sin plomo (aleación SAC305) y componentes con declaración de conformidad del proveedor.

- Ley N° 20.920 (Ley REP, Chile) [26]: Establece la responsabilidad extendida del productor sobre residuos prioritarios, incluyendo baterías. Se cumple mediante un diseño desmontable con herramientas comunes y celdas extraíbles, requiriendo habilitar un canal de recepción al fin de la vida útil del equipo.

90


<!-- ===== PAGINA 91 ===== -->


- Alimentación y Aprobación Eléctrica: El equipo se comercializa sin adaptador de red: se entrega con cable USB-C y se carga desde un cargador de teléfono que el usuario ya posee. Esta decisión se declara expresamente porque delimita el alcance regulatorio: al no incluir el proyecto ninguna fuente de alimentación conectada a la red domiciliaria, no se configura la obligación de certificación de producto eléctrico ante la Superintendencia de Electricidad y Combustibles. Si en el futuro se decidiera incluir un adaptador en el empaque, ese adaptador deberá contar con el protocolo de aprobación correspondiente antes de su comercialización.

### Radiofrecuencia y Telecomunicaciones

- SUBTEL, Resolución Exenta N° 1.985/2017 [29]: Norma técnica para equipos de alcance reducido en Chile, que fija los límites de potencia aplicables a la banda de 2,4 GHz bajo régimen exento de licencia. El presupuesto de diseño del enlace Bluetooth es de +9 dBm, equivalentes a aproximadamente 8 mW radiados, cifra que se sitúa muy por debajo de cualquiera de las lecturas posibles del límite aplicable, ya sea que se mida como potencia de salida en bornes de antena o como potencia radiada. El valor exacto del límite y la magnitud sobre la que se mide deben confirmarse contra el texto vigente de la resolución al preparar el expediente, y así se consigna en la matriz de verificación: estar holgadamente bajo el límite no exime de acreditar cuál es el límite.

- SUBTEL, Resolución N° 737/2025 [17]: Actualización del régimen de certificación de equipos de telecomunicaciones, pendiente de verificación formal antes del lanzamiento comercial. Las obligaciones aplican al producto terminado y no al módulo de radio, de modo que la certificación modular del ESP32 no sustituye este trámite.

- FCC, Título 47 CFR Parte 15, subpartes B y C [30]: Límites de emisiones para dispositivos no licenciados en Estados Unidos. Se encuentra cubierto de forma incidental al utilizar el módulo

ESP32-WROOM-32, pre-certificado con FCC ID 2AC7Z-ESPWROOM32. No es exigible en Chile y se conserva como referencia de mercado futuro.

91


<!-- ===== PAGINA 92 ===== -->


### Buses Industriales

- TIA/EIA-485-A [31]: Define los niveles eléctricos y la terminación de un bus diferencial multipunto.

Es el fundamento técnico-normativo para elegir RS-485 sobre I²C para la comunicación cableada en terreno.

- Modbus Application Protocol Specification V1.1b3 [32]: Rige la estructura de la comunicación, definiendo la función 0x03 (lectura de registros holding), el mecanismo de verificación

CRC-16 y los tiempos de silencio exigidos entre tramas con la sonda de suelo.

### Estándares Edafológicos

- ISO 10390:2021 [33]: Método de referencia para la determinación del pH del suelo mediante electrodo en suspensión suelo-agua o suelo-CaCl₂. Dado que el pH sustenta directamente las recomendaciones de encalado que entrega el motor agronómico, esta norma es la que fija el método de contraste del protocolo de validación in situ.

- ISO 11265 [34]: Método de referencia para la conductividad eléctrica específica del suelo.

Fundamenta la normalización de la lectura de CE a 25 °C, aplicando un coeficiente térmico de 2 %/°C.

- ISO 11277 [35]: Método de granulometría y textura. Actúa como base para la clasificación textural declarada por el usuario en la aplicación móvil, alimentando el factor de corrección analítico.

- ISO 11465 [36]: Método gravimétrico para la determinación del contenido de materia seca y de agua del suelo. Es el método de contraste para la humedad volumétrica, la variable de uso más frecuente del instrumento y la que sustenta las recomendaciones de riego.

92


<!-- ===== PAGINA 93 ===== -->


- Métodos oficiales SAG / INIA: Criterios de interpretación agronómica nacional utilizados para calibrar los umbrales de la matriz de cultivos.

### Datos, Seguridad de la Información y Accesibilidad

- Ley N° 19.628 [37]: Exige consentimiento y derechos del titular. A nivel de arquitectura se aplica mediante seguridad a nivel de fila en la base de datos, garantizando aislamiento por campo y por rol.

- Ley N° 21.719 (Protección de Datos Personales) [38]: No es un apéndice de la anterior sino un régimen nuevo, con obligaciones propias: creación de una autoridad fiscalizadora, deber de notificar vulneraciones de seguridad, registro de actividades de tratamiento y un cuadro de sanciones distinto. El proyecto la trata como obligación diferenciada y no como continuidad de la

Ley N° 19.628, y su cumplimiento se organiza sobre tres frentes: la exportación de datos por el titular, el aislamiento por rol ya implementado y un procedimiento escrito de notificación de incidentes que debe existir antes de la primera cuenta comercial.

- ISO/IEC 27001:2022 e ISO/IEC 25010 [39]: El desarrollo de la plataforma se rige por cifrado en tránsito (TLS) y reposo, control de acceso segmentado y criterios internacionales de fiabilidad, usabilidad y mantenibilidad de software.

- WCAG 2.1, nivel AA [23]: Pautas de accesibilidad digital implementadas en la app (área táctil mínima de 48×48 dp, contraste mínimo de 4,5:1, y prohibición del uso del color como único portador de información).

93


<!-- ===== PAGINA 94 ===== -->


### Protección al Consumidor

- Ley N° 21.398 ("Pro Consumidor") [40]: Extiende la garantía legal a 6 meses y obliga a informar la vida útil y disponibilidad de repuestos. A nivel de negocio, el proyecto incorpora una provisión del 5 % del costo unitario para atender esta garantía y asume el compromiso de mantener stock de partes.

- Ley N° 19.496 [41]: Prohíbe la publicidad engañosa. Constituye la barrera normativa formal por la cual el proyecto declara el equipo comercialmente como "diseñado conforme a IP67" en lugar de

"certificado IP67", hasta que los laboratorios documenten el ensayo final.

### Obligaciones Tributarias y Laborales

- Ley N° 21.713 [42] (cumplimiento de obligaciones tributarias): desde octubre de 2025 eliminó la exención que liberaba de IVA a las importaciones bajo US$41. Toda compra internacional paga IVA, y las plataformas inscritas ante el Servicio de Impuestos Internos lo recaudan al momento de la compra para pedidos de hasta US$500, sin arancel aduanero adicional. La consecuencia de diseño es económica y no técnica: ese IVA sólo constituye crédito fiscal si la compra se formaliza como importación con Declaración de Ingreso, de modo que el abastecimiento debe formalizarse antes de comprometer volumen.

- Ley N° 21.735 [43] (reforma previsional): introdujo una cotización de cargo del empleador que parte en 3,5 % y sube de forma gradual hasta completar 8,5 % junto con el Seguro de Invalidez y

Sobrevivencia. El proyecto la incorpora año a año en el costo laboral, porque sobre un horizonte de diez años la diferencia frente a un recargo fijo es material 94


<!-- ===== PAGINA 95 ===== -->


### Clasificación de Cumplimiento Obligatorio vs. Voluntario

El listado anterior mezcla, deliberadamente, normas de cumplimiento legal ineludible en Chile con estándares técnicos adoptados de forma voluntaria como buena práctica de ingeniería y con referencias pensadas para una eventual exportación futura. Presentarlas todas al mismo nivel sin distinguir su carácter sería engañoso, así que se clasifican aquí explícitamente:

| Norma | Carácter | Requisito de diseño derivado | Método de verificación, criterio de aceptación y evidencia | Estado |
|---|---|---|---|---|
| Ley N° 20.920 (Ley REP) | Obligatoria (Chile) | Diseño desmontable con celdas extraíbles y canal de recepción al fin de vida útil | Ensayo funcional de desmontaje sin herramientas especiales y convenio escrito con gestor autorizado. Criterio: celda extraíble y punto de recepción operativo. Evidencia: procedimiento de desmontaje y convenio firmado | Pendiente |
| SUBTEL, Res. Exenta N° 1.985/2017 | Obligatoria (Chile) | Enlace BLE a +9 dBm (≈8 mW), con margen frente al límite aplicable | Medición en banda 2,4 GHz sobre la unidad ensamblada, previa confirmación documental de cuál es el límite vigente y sobre qué magnitud se mide. Criterio: cumplir el límite acreditado con margen. Evidencia: extracto de la resolución vigente e informe de medición | Pendiente |
| SUBTEL, Resolución N° 737/2025 | Obligatoria (Chile) | Verificación formal del producto terminado, con cargo al rubro de desarrollo y validación | Trámite formal de verificación ante la autoridad sectorial. Criterio: resolución favorable previa a la comercialización. Evidencia: expediente y resolución | Pendiente |
| UN 38.3 / IEC 62133-2 | Obligatoria (transporte y comercialización de celdas de litio) | Celdas comerciales con certificación de origen y protección electrónica del cargador | Solicitud de certificados al proveedor de celdas y ensayo de las protecciones del cargador. Criterio: certificados vigentes y corte por sobrecarga, sobredescarga y cortocircuito. Evidencia: certificados y acta de ensayo | Pendiente |
| Ley N° 19.628 (Protección de la Vida Privada) | Obligatoria (Chile) | Aislamiento por campo y rol; datos exportables por el titular | Pruebas de acceso cruzado entre cuentas y verificación de exportación. Criterio: cero lecturas de campos ajenos y exportación completa a solicitud del titular. Evidencia: batería de pruebas de aislamiento | Parcial: aislamiento implementado, exportación pendiente |
| Ley N° 21.719 (Protección de Datos Personales) | Obligatoria (Chile) | Registro de actividades de tratamiento y procedimiento escrito de notificación de vulneraciones | Revisión documental antes de abrir la primera cuenta comercial. Criterio: registro y procedimiento redactados, con responsable designado. Evidencia: documentos firmados | Pendiente |
| Ley N° 21.398 (“Pro Consumidor”) | Obligatoria (Chile) | Garantía legal de 6 meses más provisión del 5 % de BOM para atenderla | Revisión legal de las condiciones de garantía y provisión contable. Criterio: cobertura ≥ 6 meses y provisión del 5 % de BOM reservada. Evidencia: texto de garantía y asiento de provisión | Parcial |
| Ley N° 19.496 (Protección al Consumidor) | Obligatoria (Chile) | Declaración comercial como “diseñado conforme a IP67” hasta contar con ensayo de laboratorio | Auditoría del material comercial. Criterio: ninguna pieza declara IP67 certificado mientras no exista ensayo. Evidencia: material revisado y aprobado | Cumple |
| Ley N° 21.713 [42] (cumplimiento de obligaciones tributarias) | Obligatoria (Chile) | Abastecimiento formalizado como importación, con Declaración de Ingreso, para que el IVA de los insumos constituya crédito fiscal | Revisión de la carpeta tributaria de importación antes de la primera orden de volumen. Criterio: toda compra de insumos respaldada con DIN o factura nacional. Evidencia: declaraciones de ingreso y registro de crédito fiscal | Pendiente |
| Ley N° 21.735 [43] (reforma previsional) | Obligatoria (Chile) | Cotización de cargo del empleador aplicada según el calendario gradual vigente, además de cesantía y mutualidad | Revisión de las declaraciones previsionales mensuales. Criterio: tasa del período correctamente aplicada sobre cada remuneración. Evidencia: certificados de pago previsional | Pendiente |
| IEC 60529 (grado IP67) | Voluntaria como estándar; exigible como declaración una vez publicada, por efecto de la Ley N° 19.496 | Envolvente PETG con O-ring, sellado intercapa, prensaestopas M12 y respiradero protegido del sensor ambiental | Ensayo IP67 en laboratorio acreditado sobre el conjunto ensamblado, incluido el respiradero. Criterio: sin ingreso de agua tras 30 min a 1 m. Evidencia: informe de ensayo | Pendiente |
| Métodos oficiales SAG / INIA | Voluntaria (referencia técnica nacional adoptada) | Umbrales de la matriz de cultivos trazables a criterios oficiales publicados | Contraste de cada umbral de la matriz de cultivos con su fuente oficial. Criterio: trazabilidad documental de cada umbral. Evidencia: tabla de correspondencia umbral–fuente, con fecha de consulta | Pendiente |
| RoHS 2011/65/EU y RoHS 3 | Voluntaria en Chile / referencia de mercado futuro | Soldadura SAC305 y declaración de conformidad de proveedores | Recopilación de declaraciones de conformidad de proveedores. Criterio: cobertura documental de los componentes de la BOM. Evidencia: carpeta de declaraciones | Pendiente |
| FCC, Título 47 CFR Parte 15 | Referencia de mercado futuro (EE. UU., no exigible en Chile) | Cubierto de forma incidental por el módulo ESP32 pre-certificado | Verificación del FCC ID del módulo y de las condiciones de uso del certificado modular. Criterio: integración dentro del alcance declarado. Evidencia: ficha del módulo | No aplica en Chile |
| TIA/EIA-485-A y Modbus V1.1b3 | Voluntaria (estándares técnicos abiertos) | Base de diseño del bus RS-485 y la trama Modbus RTU hacia la sonda | Prueba de bus con analizador lógico sobre la trama Modbus RTU. Criterio: terminación correcta y cero errores de CRC en 1.000 lecturas consecutivas. Evidencia: captura y registro de errores | Parcial |
| ISO 10390, ISO 11265, ISO 11277, ISO 11465 | Voluntaria (métodos de referencia de laboratorio) | Métodos de contraste del protocolo de validación in situ | Protocolo de validación in situ contra laboratorio acreditado bajo ISO/IEC 17025. Criterio: el fijado en el propio protocolo. Evidencia: informes de laboratorio y análisis de concordancia | Pendiente |
| ISO/IEC 27001:2022 e ISO/IEC 25010 | Voluntaria (certificación de gestión y calidad de software) | Cifrado en tránsito y reposo, control de acceso segmentado | Revisión de configuración de cifrado y de segmentación de accesos. Criterio: TLS vigente y ausencia de credenciales embebidas. Evidencia: informe de revisión | Parcial |
| WCAG 2.1, nivel AA | Voluntaria (no exigida por ley a aplicaciones privadas en Chile) | Contraste ≥ 4,5:1, área táctil ≥ 48×48 dp y color no exclusivo como portador de información | Auditoría de accesibilidad sobre las pantallas de la aplicación. Criterio: contraste ≥ 4,5:1 y ninguna información transmitida solo por color. Evidencia: informe de auditoría | Pendiente |

**Tabla 5.1 “Clasificación Normativa: Obligatoria, Voluntaria y de Mercado Futuro”**

99


<!-- ===== PAGINA 100 ===== -->


### Protocolo de Validación de la Medición In Situ contra Laboratorio de Referencia

El objetivo específico de “validar la precisión instrumental” exige un protocolo concreto y no sólo la intención declarada de contrastar contra un laboratorio acreditado. Se define aquí ese protocolo.

Antes del detalle corresponde una decisión de alcance que este informe declara en lugar de omitir: la campaña valida cuatro de las diez variables del sistema, y hay razones distintas para cada exclusión. Se validan humedad volumétrica, pH, conductividad eléctrica y textura, porque las tres primeras sustentan directamente las recomendaciones de riego, encalado y lavado de sales, y la cuarta es el parámetro que el usuario declara y que modula los umbrales. Quedan fuera la temperatura del suelo, cuya trazabilidad se resuelve con un termómetro patrón dentro de la calibración de fábrica y no requiere laboratorio, y las tres magnitudes del sensor ambiental, cuya exactitud está confirmada por la hoja de datos del componente exacto y cuyo riesgo real es de montaje, no de sensor. Quedan fuera también, y esto es lo más importante, N, P y K.

La exclusión de N, P y K es deliberada y coherente con el resto del informe: esos tres valores no son determinaciones químicas independientes sino derivaciones de la conductividad eléctrica, de modo que contrastarlos contra un método de laboratorio mediría la correlación entre salinidad y fertilidad de los suelos muestreados, no la exactitud del instrumento. Validarlos sugeriría una capacidad analítica que la sonda no tiene. Por esa misma razón la aplicación los presenta como registros informativos con advertencia permanente, no construye diagnóstico nutricional con ellos y no permite prescribir dosis: la limitación se resuelve en la interfaz, no en la campaña de laboratorio.

100


<!-- ===== PAGINA 101 ===== -->


| Elemento del protocolo | Especificación |
|---|---|
| Variables validadas | Humedad volumétrica, pH, conductividad eléctrica y textura |
| Variables excluidas y motivo | N, P y K, por ser derivaciones de la conductividad eléctrica y no determinaciones independientes; temperatura de suelo, resuelta con termómetro patrón en calibración de fábrica; magnitudes del BME280, confirmadas por hoja de datos del componente exacto |
| Tamaño de muestra | N ≥ 30 puntos de medición en total y no menos de 10 por clase textural, tomados en terreno y sub muestreados el mismo día para envío a laboratorio |
| Diversidad de suelos | Al menos 3 clases texturales distintas (franco, arcilloso, arenoso), cubriendo el rango útil de pH (4,5–8,5) y de conductividad eléctrica (0–5.000 µS/cm), que es donde se toman las decisiones agronómicas reales |
| Referencia de laboratorio | pH según ISO 10390; conductividad eléctrica según ISO 11265; textura según ISO 11277; humedad volumétrica por gravimetría según ISO 11465. Laboratorio acreditado bajo ISO/IEC 17025 para los ensayos solicitados |
| Estadístico de concordancia | Coeficiente de determinación (R²) entre lectura in situ y laboratorio; error cuadrático medio (RMSE) en la unidad nativa de cada variable; análisis de concordancia de Bland-Altman para detectar sesgo sistemático |
| Umbral de aceptación | Umbral agronómico propio: pH, RMSE ≤ 0,3 unidades; conductividad eléctrica, RMSE ≤ 10 % de la lectura o 200 µS/cm, el mayor de ambos; humedad volumétrica, RMSE ≤ 4 puntos porcentuales. Adicionalmente R² ≥ 0,80 y ausencia de sesgo proporcional significativo (p < 0,05) en Bland-Altman |
| Alcance del resultado | La campaña detecta sesgo grueso y desviación sistemática. El ajuste fino de coeficientes requiere una segunda campaña sobre la base instalada, prevista en el plan de calibración |
| Acción si no se cumple el umbral | La variable se marca como “referencial” en la app (no apta para prescripción cuantitativa de dosis ni de volúmenes) hasta recalibrar el coeficiente de compensación o sustituir el sensor asociado |

**Tabla 5.2 “Protocolo de Validación In Situ vs. Laboratorio de Referencia”**

101 Por qué un umbral propio y no el del fabricante. Una formulación aparentemente más rigurosa sería exigir que el error del instrumento no supere la exactitud declarada por el fabricante de la sonda, es decir ±0,1 unidades de pH. Este informe no la adopta, por dos razones. La primera es de evidencia: esa exactitud proviene de la ficha de una sonda representativa de la familia y no del SKU adquirido, como declara la tabla de estado probatorio, de modo que fijar el criterio de aprobación contra ella significaría medirse contra un número que el propio proyecto reconoce no tener verificado. La segunda es de pertinencia: ±0,1 unidades de pH es una exigencia de laboratorio, y el producto de este instrumento no es una cifra sino una decisión de manejo. Un error de 0,3 unidades de pH no cambia la recomendación de encalado para ningún cultivo de la matriz; uno de 0,8 sí la cambia. El umbral debe fijarse donde la decisión cambia, y por eso se declara en términos agronómicos y no metrológicos. El mismo criterio explica los umbrales de conductividad y de humedad: un error de 4 puntos de humedad volumétrica no altera el veredicto de riego, mientras que uno de 10 puntos sí lo altera.


<!-- ===== PAGINA 102 ===== -->


102


<!-- ===== PAGINA 103 ===== -->


### Plan de Calibración y Control de Deriva

La validación descrita responde una pregunta puntual: si el instrumento concuerda con el laboratorio en un momento dado. No responde la siguiente, que es la que determina si el dato sigue siendo confiable dos temporadas después: cómo se calibra cada equipo antes de salir de taller y cómo se detecta y corrige la deriva del sensor con el uso. Ambas cosas se planifican por separado.

La calibración no se ejecuta reescribiendo el firmware, sino ajustando los coeficientes que residen en la memoria no volátil del ESP32 y que, por diseño, son actualizables de forma remota. Esa decisión de arquitectura es la que hace viable el plan que sigue: corregir la deriva de un equipo en terreno no exige recuperarlo físicamente.

| Etapa | Qué se hace | Periodicidad | Criterio de aceptación | Evidencia que queda |
|---|---|---|---|---|
| Calibración de fábrica | Verificación de cada unidad ensamblada contra soluciones patrón de pH (4,00 y 7,00) y de conductividad (1.413 µS/cm y 12.880 µS/cm), contraste de temperatura contra termómetro patrón, y ajuste de los coeficientes de compensación en memoria no volátil | Una vez por equipo, antes del despacho | Desviación dentro del umbral agronómico del protocolo de validación | Certificado de calibración individual con número de serie, fecha y valores medidos |
| Compensación térmica de la conductividad | Verificación de la normalización de la lectura de CE a 25 °C con el coeficiente de 2 %/°C exigido por ISO 11265 | Una vez por equipo, dentro de la calibración de fábrica | Error ≤ 3 % entre 5 °C y 35 °C | Registro de la curva de verificación térmica |
| Verificación periódica por el usuario | Comprobación con solución patrón de pH 7,00 mediante la rutina guiada de la aplicación, que compara la lectura con el valor esperado | Al inicio de cada temporada, o cada 6 meses | Desviación ≤ 0,3 unidades de pH | Registro guardado en el histórico del equipo, con fecha y resultado |

103


<!-- ===== PAGINA 104 ===== -->


| Recalibración correctiva | Ajuste remoto de los coeficientes sobre el equipo específico, sin recuperarlo ni reemplazar el firmware | Cuando la verificación periódica excede el umbral | La verificación posterior vuelve a cumplir el criterio | Registro del coeficiente anterior y del nuevo, con su justificación |
|---|---|---|---|---|
| Retiro de la variable | La variable afectada se marca como “referencial” en la aplicación y deja de sustentar recomendaciones cuantitativas | Cuando la recalibración no recupera el criterio | — | Aviso al usuario en la pantalla de la variable y en el histórico |
| Control de deriva de la flota | Seguimiento agregado de las verificaciones periódicas sincronizadas, para detectar si la desviación es de un equipo o un patrón común del lote | Revisión semestral | Ningún lote con desviación media creciente y sostenida | Informe de deriva por lote de fabricación |

**Tabla 5.3 “Plan de Calibración y Control de Deriva”**

Tres precisiones sobre este plan. La primera es de alcance: la verificación del usuario emplea solución patrón de pH, que es barata, estable y de uso corriente en agricultura, y no pretende reproducir un laboratorio; su función es detectar que algo se desvió, no cuantificar cuánto con precisión metrológica. La segunda es de costo, y se conecta con el desglose económico: la calibración de fábrica es trabajo de taller y está contenida en el trabajo de los ensambladores que la nómina ya presupuesta, mientras que las soluciones patrón y el instrumental de referencia se cargan a la partida de metrología del rubro de desarrollo y validación. La tercera es de honestidad: la periodicidad semestral y los umbrales de esta tabla se fijan a partir del comportamiento típico de los electrodos de pH y de las sondas de conductividad, y deben confirmarse con la deriva que efectivamente muestre el SKU adquirido durante la primera temporada de operación; si resultara más rápida, la periodicidad se acorta antes de que el dato equivocado llegue al agricultor.

104


<!-- ===== PAGINA 105 ===== -->


### Supuestos de Mercado

Dos cifras que sostienen la comparación de costo total de propiedad no provienen de una fuente bibliográfica publicable, sino de consultas de mercado realizadas por el equipo. Incluirlas en la lista de referencias bibliográficas inducirá a error sobre su naturaleza, de modo que se declaran aparte, con su método de obtención y con la acción que las convertirá en dato verificable:

| Id. | Supuesto | Valor adoptado | Cómo se obtuvo | Qué falta para confirmarlo |
|---|---|---|---|---|
| S1 | Costo de un análisis de suelo en laboratorio acreditado en Chile | $50.000 por muestra | Consulta de tarifarios publicados por laboratorios de suelos universitarios y comerciales del mercado nacional, sin fuente única | Cotización formal y fechada del laboratorio que se adopte como referencia en la campaña de validación |
| S2 | Costo de una visita de asesoría agronómica externa en Chile | $60.000 por visita | Consulta de tarifarios de consultores agronómicos independientes, sin fuente única | Cotización formal y fechada de al menos dos consultores de la zona de operación |

**Tabla 5.4 “Supuestos de Mercado Declarados”**

Ambos valores se utilizan exclusivamente como término de comparación en el costo total de propiedad del agricultor y no intervienen en ninguna línea del flujo de caja del proyecto, de modo que una desviación en ellos altera el argumento de adopción pero no el VAN, la TIR ni la caja de la empresa. La Tabla 3.7 presenta además dos intensidades de uso precisamente para que el lector pueda juzgar la sensibilidad del argumento frente a estos dos supuestos.

105


<!-- ===== PAGINA 106 ===== -->


## VI. Conclusiones

La ingeniería conceptual desarrollada en este informe sostiene que es técnica y económicamente plausible democratizar la tecnología agrícola sin sacrificar precisión de medición ni rentabilidad comercial. La palabra plausible es deliberada: este documento cierra una etapa de diseño conceptual y evaluación, no una de verificación experimental, y esa distinción se mantiene en cada afirmación que sigue.

Desde la perspectiva ingenieril, la arquitectura descentralizada un nodo portátil de captura (ESP32, sonda industrial y celda de ion-litio) que transfiere los datos al teléfono del usuario responde directamente a las dos barreras identificadas en la problemática, porque traslada al teléfono el costo de la pantalla, el cómputo y el almacenamiento, y con ello el precio del instrumento. El diseño energético corta la alimentación de la sonda fuera de cada lectura y apaga el equipo completo entre jornadas, y con ello sostiene aproximadamente 9 semanas de uso habitual (170 mediciones) con una sola carga, sin el recambio constante de pilas primarias de los dos equipos de referencia comparados. Esa cifra proviene del balance energético por nodo de tensión, con las eficiencias de conversión declaradas, y su confirmación exige medir el consumo de la placa ensamblada encendida y apagada: si apareciera una fuga no identificada de 1 mA con el equipo apagado, la autonomía caería a unas 4.5 semanas. Alcanzar autonomías de varios meses sin apagar el equipo exige reemplazar la placa de desarrollo por el módulo desnudo con un regulador de baja corriente de reposo, mejora que queda identificada para la versión de producción.

Desde la perspectiva económica, la evaluación a diez años (2027–2036) entrega un resultado favorable bajo las condiciones declaradas, con cada partida abierta y trazable hasta su origen. El precio es un resultado y no un supuesto: se construyó primero la estructura completa de costos y el precio se derivó de ella exigiendo un 30 % de utilidad sobre el costo total, lo que arroja un precio de lista de $449.409 con IVA.

Con una inversión inicial de $29.727.352 financiada íntegramente por un crédito de igual monto a diez años y 12 % efectivo anual, con cuota fija de $416.026, y un pie propio de $8.918.206 entregado al banco en partes iguales por los socios ($4.459.103 cada uno), el proyecto alcanza un VAN de $112.827.790 al 20 % de descuento, una TIR de 53,35 %, un payback simple de 3,68 años y uno descontado de 4,39 años. La empresa renueva su activo fijo en 2032, cancela la totalidad de su deuda dentro del horizonte evaluado y cierra 2036 con $541.824.753 de caja acumulada y sin pasivo bancario. El punto de tensión está identificado y es de arranque, no de rentabilidad: los ejercicios 2027 y 2028 cierran con pérdida porque la estructura mínima para operar formalmente no se cubre con 200 equipos, y esa pérdida se financia con el capital de trabajo dimensionado para ello. Las sensibilidades acotan el margen de error: el proyecto resiste 106 un alza del 15 % en el costo de materiales, pero se queda sin caja si las ventas caen un 10 % o si el precio de lista baja de $426.714, y deja de crear valor si las ventas caen un 25 % o si el precio baja de $385.057.


<!-- ===== PAGINA 107 ===== -->


Desde la perspectiva del cliente, la comparación de costo total de propiedad se presenta sobre dos intensidades de uso declaradas, porque el resultado depende críticamente de con qué frecuencia el agricultor recurre hoy al laboratorio o a la asesoría. Bajo la intensidad habitual, que es el caso base, el instrumento no se paga el primer año; cruza a favor en el año 3 frente al laboratorio y en el año 4 frente a la asesoría, aunque frente a esta última la compra del segundo equipo lo deja atrás de forma transitoria, y acumula a diez años una ventaja de 2,1 y 1,3 veces respectivamente. El argumento estructural, sin embargo, no es el ahorro nominal sino el costo marginal cero de la medición repetida: a cien mediciones anuales, cada lectura cuesta $949 frente a los $50.000 de una muestra de laboratorio, y esa relación no depende de ningún supuesto de frecuencia. Corresponde insistir en que ese ahorro pertenece al agricultor y no aparece en ninguna línea del flujo de caja de la empresa.

Corresponde por eso precisar con exactitud qué acredita y qué no acredita este resultado, porque la diferencia decide si el proyecto pasa a la etapa siguiente o se declara concluido. Lo que acredita es que la arquitectura elegida es coherente con el problema, que la estructura de costos cierra con el precio propuesto, que el financiamiento es consistente y que el negocio, de cumplirse el plan de ventas, crea valor y paga su deuda. Lo que no acredita:

1. Que el precio de la sonda sea el presupuestado, porque aún no existe una orden de compra ni ficha técnica del SKU.

2. Que el consumo del conjunto ensamblado, encendido y apagado, sea el estimado, porque el consumo propio de la placa de desarrollo y del módulo de carga proviene de hojas de datos representativas y no de una medición.

3. Que la demanda responda como proyecta el plan comercial, porque todavía no hay un piloto pagado.

4. Que el banco otorgue el crédito en las condiciones supuestas, porque no hay oferta formal.

5. Que el equipo alcance IP67, porque el ensayo está presupuestado pero no ejecutado.

107 6. Que la sonda concuerde con el laboratorio dentro del umbral agronómico fijado, porque la campaña de 30 muestras es un plan y no un resultado.


<!-- ===== PAGINA 108 ===== -->


Ninguna de esas seis verificaciones pendientes es un obstáculo oculto: todas están identificadas en este informe con su costo, su método y su criterio de aceptación, y ese es precisamente el aporte de la ingeniería conceptual. Las dos primeras concentran además el riesgo técnico y se atacan con el mismo gasto y en el mismo mes: pedir al proveedor la ficha del SKU y una unidad de muestra, e instrumentar una placa piloto, a través de su puente soldable de medición, para medir su consumo encendida y apagada.

La decisión que el estudio respalda es continuar el desarrollo y ejecutar esas verificaciones, no comprometer volumen de compra ni declarar una viabilidad comprobada.

En síntesis, la ingeniería conceptual de TerraSense responde a su objetivo general: definir un sistema en el que una medición física se convierta, en el mismo lugar y sin conexión a internet, en una decisión agronómica accionable. Al eliminar los costos recurrentes y traducir valores numéricos planos en instrucciones de manejo, el diseño apunta a reducir el riesgo de pérdida de cosecha y a proteger el patrimonio familiar del pequeño agricultor; la magnitud efectiva de ese beneficio se medirá con los pilotos comparativos previstos, no se declara aquí. El resultado económico y el diseño técnico convergen en una misma decisión: construir una herramienta útil que pueda fabricarse, mantenerse y respaldarse con el margen presupuestado. Los próximos cierres se concentran en la medición del consumo de reposo del conjunto ensamblado, en la integración ambiental de extremo a extremo y en los ensayos del equipo terminado, trabajos que quedan identificados con su evidencia esperada y su criterio de aceptación.

108


<!-- ===== PAGINA 109 ===== -->


## VII. Referencias Bibliográficas

1. Centro de Ciencia del Clima y la Resiliencia (CR)². (s.f.). Informe a la Nación: La mega sequía 2010–2015, una lección para el futuro. Recuperado de https://www.cr2.cl/megasequia/
2. Instituto Nacional de Estadísticas (INE), Chile. (2021). Censo Agropecuario y Forestal 2021. Resultados finales, gráficas nacionales. Recuperado de https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales
3. ODEPA. (2021). Censo Agropecuario y Forestal 2021: distribución de las unidades productivas y sus cambios respecto al Censo 2007. Recuperado de https://www.odepa.gob.cl/publicaciones/articulos/censo-agropecuario-y-forestal-2021-distribucion-de-las-unida des-productivas
4. INDAP. (s.f.). Agricultura Familiar Campesina. Recuperado de https://www.indap.gob.cl/agricultura-familiar-campesina
5. ODEPA. (s.f.). Boletín macroeconómico y evolución reciente de los precios de los fertilizantes. Recuperado de https://www.odepa.gob.cl/publicaciones/articulos/evolucion-reciente-de-los-precios-de-los-fertilizantes
6. Hanna Instruments. (s.f.). GroLine HI9814. Precio de referencia US$294. Recuperado de https://hannainst.com/groline-waterproof-portable-ph-ec-tds-meter/
7. Spectrum Technologies. (s.f.). FieldScout TDR 350. Precio de referencia US$1.495. Recuperado de https://www.specmeters.com/FieldScout-TDR350-Soil-Moisture-Meter
8. STMicroelectronics. (s.f.). STM32WB55xx / STM32WB35xx Datasheet (consumo de radio BLE a 0 dBm).

Recuperado de https://www.st.com/resource/en/datasheet/stm32wb55rg.pdf
9. Nordic Semiconductor. (s.f.). nRF52840 Product Brief (consumo de radio BLE a 0 dBm). Recuperado de https://www.mouser.com/pdfdocs/Nordic_nRF52840_PB.pdf
10. METER Group. (s.f.). TEROS 12 Soil Moisture, Temperature and EC Sensor, representativo de la categoría de sondas de grado de investigación citada junto a Delta-T WET150 y Stevens HydraProbe. Recuperado de https://metergroup.com/products/teros-12/
11. Sensirion AG. (2023). Datasheet SHT4x (exactitud de temperatura ±0,2 °C). Recuperado de https://sensirion.com/media/documents/33FD6951/6555C40E/Sensirion_Datasheet_SHT4x.pdf
12. Bosch Sensortec. (2021). BMP280 Datasheet (exactitud de temperatura ±1,0 °C, sin medición de humedad).

Recuperado de https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp280-ds001.pdf
13. Bosch Sensortec. (2024). BME280 Datasheet (exactitud ±1,0 °C / ±3 % HR / ±1,0 hPa; consumo 0,1 µA en reposo y 3,6 µA por muestreo en forced mode). Recuperado de https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf
14. Food and Agriculture Organization (FAO). (1998). Crop Evapotranspiration – Guidelines for Computing Crop Water Requirements, FAO Irrigation and Drainage Paper 56 (corrección del cálculo de evapotranspiración por presión atmosférica/altitud). Recuperado de https://www.fao.org/4/x0490e/x0490e00.htm 109
15. Subsecretaría de Telecomunicaciones (SUBTEL). (2024). X Encuesta de Acceso y Usos de Internet 2023: uso habitual de smartphone 88,5 % en zonas rurales. Recuperado de https://www.subtel.gob.cl/wp-content/uploads/2024/03/Informe_Final_Acceso_y_uso_Internet_2023_VF.pdf
16. Banco Central de Chile. (s.f.). Dólar Observado — Base de Datos Estadísticos, tipo de cambio de referencia usado para la conversión CLP/US$. Recuperado de https://si3.bcentral.cl/indicadoressiete/secure/indicadoresdiarios.aspx
17. Subsecretaría de Telecomunicaciones (SUBTEL). (2025). Resolución N° 737: Actualización del régimen de certificación de equipos de telecomunicaciones. Recuperado de https://www.subtel.gob.cl/
18. Ministerio de Hacienda / Biblioteca del Congreso Nacional (BCN). (2020). Síntesis de la Ley N° 21.210 de Modernización Tributaria — Régimen Pro Pyme. Recuperado de https://obtienearchivo.bcn.cl/obtienearchivo?id=repositorio/10221/28765/2/BCN_Reforma_Tributaria_2020_edi t.pdf
19. Espressif Systems. (s.f.). ESP32-WROOM-32 Datasheet (consumo dinámico, reposo profundo del módulo y FCC ID 2AC7Z-ESPWROOM32). Recuperado de https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf
20. Sumeet Instruments. (s.f.). 7 in 1 Integrated Soil Sensor NPK-pH-EC-Temperature-Moisture, RS485, alimentación 5–24 V DC. Ficha técnica de referencia de familia de producto (0,15 W a 12 V DC; 0,5 W a 24 V DC). Recuperado de https://sumeetinstruments.com/Soil-NPK-pH-EC-Temperature-Moisture-7in1-Sensor-RS485
21. INJOINIC Technology. (s.f.). IP5306: Multi-functional High-Efficiency Charging and Discharging Chip (corriente de pérdida en reposo y eficiencia de conversión boost, representativo de la PCB combinada USB-C carga + boost). Recuperado de https://www.lcsc.com/product-detail/C181692.html
22. Holtek Semiconductor. (s.f.). HT75xx-3 100 mA TinyPower LDO (corriente de quiescente típica 2,5 µA).


<!-- ===== PAGINA 110 ===== -->


Recuperado de https://www.holtek.com/documents/10179/116711/HT75xx-3v140.pdf
23. World Wide Web Consortium (W3C). (2018). Web Content Accessibility Guidelines (WCAG) 2.1, nivel AA.

Recuperado de https://www.w3.org/TR/WCAG21/
24. MaxLinear (ex Exar / Sipex). (s.f.). SP3485: 3.3 V Low Power Half-Duplex RS-485 Transceiver with 10 Mbps Data Rate. Datasheet. Recuperado de https://www.maxlinear.com/ds/sp3485.pdf
25. Bluelab. (s.f.). Pulse Multimedia EC/MC Meter. Precio de lista US$339. Recuperado de https://bluelab.com/products/bluelab-pulse-multimedia-ec-mc-meter
26. Ministerio del Medio Ambiente. (2016). Ley N° 20.920: Marco para la gestión de residuos, la responsabilidad extendida del productor y fomento al reciclaje (REP). Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1091081
27. International Electrotechnical Commission (IEC). (s.f.). IEC 60529: Degrees of protection provided by enclosures (IP Code). Recuperado de https://webstore.iec.ch/publication/2452
28. Organización de las Naciones Unidas (ONU) / IEC. (s.f.). UN 38.3 / IEC 62133-2: Ensayos y seguridad de celdas y baterías secundarias de ion-litio. Recuperado de https://webstore.iec.ch/publication/60070 110
29. Subsecretaría de Telecomunicaciones (SUBTEL). (2017). Resolución Exenta N° 1.985: Fija norma técnica de equipos de alcance reducido. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1109333
30. Federal Communications Commission (FCC). (s.f.). Título 47 CFR Parte 15, subpartes B y C. Recuperado de https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-15
31. Telecommunications Industry Association (TIA). (1998). Norma TIA/EIA-485-A: Características eléctricas de los generadores y receptores para su uso en sistemas multipunto digitales balanceados. Recuperado de https://global.ihs.com/
32. Modbus Organization. (2006). Modbus Application Protocol Specification V1.1b3. Recuperado de https://modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf
33. Organización Internacional de Normalización (ISO). (2021). ISO 10390: Calidad del suelo — Determinación del pH. Recuperado de https://www.iso.org/standard/75243.html
34. Organización Internacional de Normalización (ISO). (1994). ISO 11265: Calidad del suelo — Determinación de la conductividad eléctrica específica. Recuperado de https://www.iso.org/standard/19243.html
35. Organización Internacional de Normalización (ISO). (2009). ISO 11277: Calidad del suelo — Determinación de la distribución del tamaño de partícula en material de suelo mineral (granulometría y textura). Recuperado de https://www.iso.org/standard/54151.html
36. Organización Internacional de Normalización (ISO). (1993). ISO 11465: Calidad del suelo — Determinación del contenido de materia seca y de agua sobre base másica. Método gravimétrico. Recuperado de https://www.iso.org/standard/20886.html
37. Ministerio Secretaría General de la Presidencia. (1999). Ley N° 19.628 sobre Protección de la Vida Privada.


<!-- ===== PAGINA 111 ===== -->


Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=141599
38. Ministerio Secretaría General de la Presidencia. (2024). Ley N° 21.719 que regula la protección y el tratamiento de los datos personales y crea la Agencia de Protección de Datos Personales. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1208650
39. Organización Internacional de Normalización (ISO) / IEC. (2022). ISO/IEC 27001:2022 (Sistemas de gestión de seguridad de la información) e ISO/IEC 25010 (Calidad de software). Recuperado de https://www.iso.org/standard/27001.html
40. Ministerio de Economía, Fomento y Turismo. (2021). Ley N° 21.398 (“Pro Consumidor”). Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1170464
41. Ministerio de Economía, Fomento y Turismo. (1997). Ley N° 19.496: Establece normas sobre protección de los derechos de los consumidores. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=61438
42. Servicio de Impuestos Internos (SII), Chile. (2025). Ley N° 21.713 sobre cumplimiento de las obligaciones tributarias: aplicación de IVA a bienes adquiridos en el extranjero por hasta US$500 y fin de la exención bajo US$41. Recuperado de https://www.sii.cl/
43. Ministerio del Trabajo y Previsión Social / Superintendencia de Pensiones. (2025). Ley N° 21.735 de reforma previsional: cotización de cargo del empleador y su calendario gradual. Recuperado de https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-10906.html 111
44. Senado de la República de Chile. (2026). Reajuste del ingreso mínimo mensual. Recuperado de https://www.senado.cl/comunicaciones/noticias/ley-reajuste-al-ingreso-minimo-mensual
45. LCSC Electronics. (2026). Catálogo de componentes electrónicos: precios unitarios por tramo de cantidad, empleados para los discretos de la lista de materiales. Recuperado de https://www.lcsc.com/
46. AliExpress. (2026). Precios de referencia con envío Choice a Chile de los módulos, la sonda de suelo y la celda de litio de la lista de materiales. Recuperado de https://www.aliexpress.com/
47. JLCPCB. (2026). Fabricación de circuito impreso de dos capas: precio según cantidad y envío a Chile.


<!-- ===== PAGINA 112 ===== -->


Recuperado de https://jlcpcb.com/
48. Advanced Monolithic Systems. (s.f.). AMS1117: 1A Low Dropout Voltage Regulator. Datasheet (corriente de reposo típica de 5 mA, representativa del regulador de las placas de desarrollo ESP32). Recuperado de http://www.advanced-monolithic.com/pdf/ds1117.pdf
49. Espressif Systems. (s.f.). ESP32-DevKitC V4 Getting Started Guide: alimentación de la placa, regulador de 3,3 V y LED de alimentación. Recuperado de https://docs.espressif.com/projects/esp-idf/en/latest/esp32/hw-reference/esp32/get-started-devkitc.html

Nota sobre los supuestos de mercado. Los costos de referencia del análisis de laboratorio y de la visita de asesoría agronómica no figuran en esta lista porque no provienen de una fuente bibliográfica publicable. Se declaran como supuestos de trabajo, identificados como S1 y S2, en la Tabla 5.4 “Supuestos de Mercado Declarados”, junto con su método de obtención y la cotización formal que los reemplazará. 112
