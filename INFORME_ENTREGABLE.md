**TERRASENSE**

Álvaro Nicolás Villena Torrejón

Alan Paul Escobar Rojas

Académico guía: Carlos Alberto Castillo Torres

Santiago − Chile

AÑO 2026

---

# Índice general

I. Introducción
II. Descripción de la Problemática
III. Propuesta de Solución Tecnológica
IV. Objetivos del Proyecto
V. Ingeniería conceptual
VI. Conclusiones
VII. Referencias bibliográficas

# Índice de figuras

Figura 1.0 “Diagrama de Decisiones y Consecuencias”
Figura 1.1 “Diagrama de Flujo Arquitectura 8 Bits + Bluetooth Classic”
Figura 1.2 “Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla”
Figura 1.3 “Diagrama de Flujo Arquitectura con Datalogger Estacionario”
Figura 1.4 “Diagrama de Flujo Arquitectura de Nodos con LoRaWAN”
Figura 1.5 “Diagrama de Flujo Arquitectura de Sonda conectada al Teléfono”
Figura 1.6 “Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo”
Figura 1.7 “Diagrama de Flujo Arquitectura de Conectividad”
Figura 1.8 “Árbol de Alimentación y Nodos de Tensión”
Figura 1.9 “Representación Conceptual de Carcasa”

# Índice de tablas

Tabla 1.0 “Distribución de Responsabilidades Funcionales del Sistema”
Tabla 1.1 “Filtro de Viabilidad”
Tabla 1.2 “Matriz de Decisiones”
Tabla 1.3 “Comparativa de Microcontroladores”
Tabla 1.4 “Comparativa de Sondas de Suelo”
Tabla 1.5 “Comparativa de Sensores de Temperatura / Humedad / Presión Barométrica”
Tabla 1.6 “Frontera Offline / Online del Sistema”
Tabla 1.7 “Separación de las Tres Economías del Análisis”
Tabla 1.8 “Dimensionamiento del Mercado”
Tabla 1.9 “Cálculo del Mercado Accesible por Filtros Sucesivos”
Tabla 2.0 “Plan de Ventas y Asignación de Recursos Comerciales (10 Años)”
Tabla 2.1 “Estructura de Costos de Fabricación (BOM)”
Tabla 2.2 “Economía Unitaria del Primer Año”
Tabla 2.3 “Costo Total de Propiedad del Agricultor a 1, 3, 5 y 10 Años”
Tabla 2.4 “Estructura de Gastos Fijos”
Tabla 2.5 “Punto de Equilibrio Operativo y con Deuda”
Tabla 2.6 “Fuentes de Financiamiento”
Tabla 2.7 “Condiciones del Crédito Bancario”
Tabla 2.8 “Destino de Fondos”
Tabla 2.9 “Desglose de Activos, Desarrollo y Formalización”
Tabla 3.0 “Desglose del Rubro de Desarrollo y Validación”
Tabla 3.1 “Alternativas de Plazo del Crédito”
Tabla 3.2 “Proyección Anual de Resultados”
Tabla 3.3 “Flujo Económico”
Tabla 3.4 “Evaluación por Escenario”
Tabla 3.5 “Análisis de Sensibilidad y Punto de Quiebre”
Tabla 3.6 “Análisis del VAN”
Tabla 3.7 “Evaluación Financiera”
Tabla 3.8 “Especificaciones Técnicas ESP32”
Tabla 3.9 “Especificaciones Técnicas Sonda”
Tabla 4.0 “Contrato de Datos BLE (20 bytes)”
Tabla 4.1 “Estado Probatorio de las Especificaciones de Hardware”
Tabla 4.2 “Gestión Energética”
Tabla 4.3 “Interfaz Hardware”
Tabla 4.4 “Pilares de Digitalización del Proceso Agrícola”
Tabla 4.5 “Estados Energéticos y Medidas de Diseño”
Tabla 4.6 “Fases de Operación y Consumo Energético”
Tabla 4.7 “Energía por Ciclo de Medición”
Tabla 4.8 “Efecto del Consumo de Reposo sobre la Autonomía”
Tabla 4.9 “Análisis Comparativo de Parámetros”
Tabla 5.0 “Clasificación Normativa: Obligatoria, Voluntaria y de Mercado Futuro”
Tabla 5.1 “Protocolo de Validación In Situ vs. Laboratorio de Referencia”
Tabla 5.2 “Plan de Calibración y Control de Deriva”
Tabla 5.3 “Supuestos de Mercado Declarados”

---

# I. Introducción

La agricultura nacional enfrentó hasta hace muy poco tiempo un período decisivo marcado por la escasez hídrica persistente en la zona centro-sur y el encarecimiento de los insumos agroquímicos esenciales [1]. En este contexto, optimizar el uso del agua y los nutrientes es un requisito estricto de supervivencia económica para el pequeño y mediano productor. Sin embargo, existe una profunda brecha tecnológica que margina a este sector: los instrumentos de medición disponibles son económicamente difíciles de adquirir además de que entregan datos crudos (como valores aislados de conductividad o pH) que resultan incomprensibles sin una formación técnica especializada.

Para dar respuesta a esta problemática, el presente informe detalla el desarrollo y evaluación de TerraSense, un sistema integral de apoyo a la decisión sobre el terreno. Más que un simple sensor, la propuesta se basa en una arquitectura de bajo consumo que captura las variables físicas del suelo (mediante bus RS-485 con protocolo Modbus RTU) y del ambiente inmediato del punto de muestreo (mediante el sensor BME280 en bus I²C). Su innovación radica en delegar el procesamiento complejo al teléfono del agricultor vía Bluetooth Low Energy (BLE), transformando datos crudos en recomendaciones agronómicas accionables de forma inmediata, sin necesidad de conexión a internet durante la medición ni de suscripciones de pago. A lo largo de este documento se expone la ingeniería conceptual del sistema, justificando la selección de componentes, el diseño de gestión energética, el cumplimiento del marco regulatorio y la evaluación económica que respalda su viabilidad técnica y financiera.

En el teléfono una aplicación con motor agronómico determinista opera de manera estrictamente offline, interpretando las variables en menos de 5 segundos y presentándolas bajo un Grid 2×5 de fácil asimilación, categorizada por código de colores tipo semáforo y enriquecida con recomendaciones directas de labor según el cultivo, el tipo de suelo y la etapa fenológica (Pre-siembra, Vegetativo, Floración o Cosecha). Como complemento a la lectura local, el sistema consulta un pronóstico meteorológico a 5 días que contextualiza la labor a mediano plazo (evitando, por ejemplo, sembrar antes de un pronóstico temporal).

La ingeniería conceptual que fundamenta el proyecto se desarrolla en las siguientes secciones: la evaluación de alternativas, el dimensionamiento de mercado, el diseño electrónico y mecánico, el modelo financiero de rentabilidad a diez años, con comparación a cinco años, el marco normativo regulatorio y el protocolo de validación experimental que sustenta su factibilidad técnica y económica.

---

# II. Descripción de la Problemática

## Contexto del Sector Agrícola Nacional

La agricultura chilena es un pilar fundamental para la seguridad alimentaria y el desarrollo rural del país. Según el último Censo Agropecuario y Forestal, el cual se realiza cada 10 años, existen más de 175.000 unidades productivas a nivel nacional [2, 3]. Dentro de este universo, la Agricultura Familiar Campesina (AFC) y los productores pequeños (con campos de 0,5 a 20 hectáreas) representan la base productiva del mercado interno [4]. Sin embargo, este sector se encuentra actualmente en un punto de vulnerabilidad histórica debido a la convergencia de dos factores extremos:

En primer lugar, el país atravesó una “mega sequía” ininterrumpida desde 2010, con un déficit de precipitaciones cercano al 30 % en la zona centro-sur [1]. Esta crisis hídrica no solo limita el riego, sino que altera las condiciones físico-químicas del terreno, promoviendo la salinización y degradación del suelo.

En segundo lugar, el escenario económico ha provocado una escalada sostenida en los costos operativos, especialmente impulsada por el alza internacional en los precios de los fertilizantes y agroquímicos [5].

En este escenario de estrechez hídrica y alto costo de insumos, la eficiencia productiva ya no es solo una oportunidad de mejora, sino un requisito estricto. La agricultura moderna exige optimizar cada gota de agua y cada gramo de nutriente aplicado. No obstante, para lograr esta eficiencia es imperativo contar con información precisa y en tiempo real sobre las condiciones del suelo, un requisito que choca frontalmente con la realidad tecnológica y económica del pequeño o mediano agricultor.

## El Problema Central

El problema radica en que el pequeño y mediano agricultor no tiene acceso a herramientas tecnológicas adaptadas a su realidad económica y técnica para tomar decisiones agronómicas. Si bien existen en el mercado instrumentos para medir parámetros vitales como la humedad, temperatura, pH y conductividad eléctrica (CE), estos presentan una doble barrera de entrada para la Agricultura Familiar Campesina:

**La Barrera Económica.** El problema no es únicamente que estos instrumentos tengan una etiqueta de precio alto en términos absolutos, sino que entregan poca capacidad de medición e interpretación por cada peso invertido, y que esa inversión debe repetirse porque la alternativa formal es un servicio, no un activo. Un medidor portátil básico como el Hanna HI9814 cuesta US$294 [6] y mide únicamente 4 variables (pH, CE, TDS y temperatura) en soluciones hidropónicas, sin ninguna capa de interpretación agronómica; las sondas de precisión de grado investigación superan los US$1.495 [7]. La alternativa formal, el análisis de laboratorio acreditado, cuesta en Chile del orden de $50.000 por muestra (supuesto S1 de la Tabla 5.3); a ese costo, siete muestras ya igualan el precio completo de un instrumento propio, sin que el agricultor pueda repetir la medición al día siguiente sin costo marginal, ni reciba una recomendación de manejo lista para aplicar en el momento. La barrera real, entonces, no es el precio de compra aislado, sino la relación entre lo que el instrumento mide, interpreta y permite repetir en el tiempo, frente a lo que cuesta sostener esa misma información por la vía del servicio. Esa es la relación que este proyecto reformula, y su comparación completa de costo total de propiedad para el agricultor se desarrolla también en este informe, junto con la estrategia de precios.

**La Barrera de Interpretación.** Incluso si el agricultor logra adquirir uno de estos equipos, las herramientas actuales entregan “datos planos” (por ejemplo, un valor aislado de 2.500 µS/cm o un pH de 5,5). La mayoría de los pequeños productores no cuenta con la formación técnica especializada para interpretar si ese número es letal para su cultivo específico, ni sabe cómo traducir ese dato crudo en una acción correctiva concreta (como calcular cuántos litros de agua aplicar para lavar las sales).

Esta falta de herramientas accesibles e intuitivas obliga al agricultor a operar “a ciegas” durante todo el proceso productivo. El costo de esa ceguera no se reparte de manera pareja a lo largo de la temporada: se concentra en cuatro momentos en los que la decisión, una vez tomada, ya no se puede deshacer. Son las mismas cuatro etapas fenológicas sobre las que opera la solución propuesta.

- **Pre-Siembra:** Sin medir la conductividad eléctrica, el productor desconoce cuánta sal dejó acumulada la sequía en su terreno; sin medir la temperatura del suelo, no sabe si la tierra alcanzó el mínimo que exige la germinación. Siembra igual, guiado por el calendario heredado. La semilla se pierde en un suelo frío o demasiado salino, y esa pérdida sólo se vuelve visible varias semanas más tarde, cuando ya no queda ventana para resembrar.

- **Vegetativo:** Con la inversión ya comprometida, el riego se ajusta por costumbre y no por la humedad real del terreno. El exceso de agua desplaza el aire del suelo y asfixia las raíces, y de paso arrastra hacia abajo el fertilizante recién aplicado, que el cultivo ya no alcanza a absorber; la falta de agua, en el otro extremo, frena el desarrollo. En ambos casos el productor paga dos veces: el insumo perdido y el crecimiento que no ocurrió.

- **Floración:** Es la ventana más corta y la más cara de todas. Un estrés hídrico que pase inadvertido durante esos días provoca aborto floral masivo, y con él se pierde el rendimiento de la temporada completa aunque la planta siga verde y aparentemente sana. Es exactamente el tipo de daño que la inspección visual no alcanza a detectar a tiempo, porque cuando se hace evidente ya está consumado.

- **Cosecha:** Entrar al campo con maquinaria sobre un suelo con exceso de humedad compacta la tierra y destruye su estructura. El costo no se paga en la cosecha que se está levantando, sino en la siguiente: un suelo compactado infiltra peor, retiene menos agua y obliga a más labores de preparación. La decisión que hipoteca la temporada que viene se toma, sin saberlo, al cerrar la actual.

## Impacto de las Decisiones Tradicionales

Ante la falta de instrumental comprensible, el productor toma decisiones basadas en la tradición o en inspecciones sensoriales superficiales (“al ojo”: tocar la tierra con la mano, observar el polvo en superficie o guiarse por el calendario astronómico). Este método empírico induce fallos agronómicos severos en los cuatro momentos clave del cultivo.

**Figura 1.0 “Diagrama de Decisiones y Consecuencias”**

*Diagrama que encadena, para cada una de las cuatro etapas fenológicas, la decisión tomada sin medición, el fallo agronómico que produce y la consecuencia económica en que termina.*

## Relación con los Servicios Formales de Análisis y Asesoría

Actualmente, las alternativas formales como los análisis de laboratorio son lentas (15 a 30 días) y costosas, entregando resultados cuando la fase crítica ya pasó. Por otro lado, pagar asesorías agronómicas continuas para que un profesional interprete los datos escapa del presupuesto operativo.

Corresponde precisar el alcance exacto de esta brecha, porque el proyecto no se plantea como un reemplazo del laboratorio. Un análisis acreditado determina propiedades químicas mediante extracción y método normalizado; un instrumento de terreno entrega una lectura directa, en un punto y en un instante. Son procedimientos distintos que responden preguntas distintas, y confundirlos sería el error de fondo más grave que podría cometer este proyecto. TerraSense apunta al vacío que existe entre dos análisis de laboratorio: las decenas de decisiones de riego, siembra y manejo que el agricultor toma cada semana y que hoy resuelve por intuición, porque no existe ninguna herramienta que las acompañe con un dato propio de su campo. Los servicios de laboratorio y de asesoría conservan íntegramente su función en las decisiones que exigen determinaciones específicas, en particular las de fertilización.

En síntesis, el pequeño productor queda atrapado entre una crisis climática que le exige más precisión que nunca, un mercado de instrumentación que lo deja fuera por la relación entre lo que cobra y lo que entrega, y equipos que, cuando los alcanza, le devuelven un número que no sabe leer. Las dos barreras se refuerzan entre sí: la económica le impide comprar el instrumento, y la de interpretación vuelve inútil el instrumento que sí lograra comprar. El resultado es un productor que decide a ciegas y descubre sus errores al final de la temporada, cuando la pérdida de la cosecha y el endeudamiento del año ya son irreversibles.

---

# III. Propuesta de Solución Tecnológica

## Filosofía del Proyecto

Antes de cualquier decisión técnica o de diseño más focalizado, el proyecto responde a una pregunta fundamental: ¿para qué existe esta herramienta? La respuesta no es “para cuidar plantas”, sino para proteger el patrimonio de una familia que se juega el año entero en cada siembra.

Esta distinción no es un matiz retórico; cambia el criterio con el que se evalúa cada decisión de desarrollo. El fin último no es el campo productivo, sino el ser humano cuyo sustento familiar depende de él. Un cultivo que se pierde por acidez o salinidad es, en el fondo, un problema agronómico menor comparado con lo que realmente está en juego: una familia que queda endeudada durante un año entero por tomar una decisión sin la información adecuada. Ese es el problema social y económico que TerraSense ataca. Por ello, toda decisión de diseño se resuelve preguntando cuál alternativa reduce más el riesgo económico del productor, no cuál es la más sofisticada desde el punto de vista técnico. De esta premisa central se desprenden cuatro principios que gobiernan el diseño del sistema:

- **No Entregamos Datos, Entregamos Respuestas.** Un dato aislado, un valor de pH o una lectura de conductividad no es información útil para quien no sabe interpretarlo. Un dato sin contexto es, en la práctica, “un vacío” con unidades. TerraSense no entrega la medición en bruto, sino la cadena completa: desde la captura de la variable física hasta una recomendación concreta de manejo (qué hacer, cuánto y por qué).

- **El Teléfono es el Cerebro del Sistema.** La idea central que ordena todo el diseño es sencilla y radical en sus consecuencias: el teléfono que el agricultor ya posee es el instrumento de registro más potente que existe. Tiene pantalla legible, ubicación satelital, capacidad de cálculo y memoria. Fabricar un instrumento nuevo que vuelva a incluir todas esas capacidades sería cobrarle dos veces al agricultor por algo que ya tiene. Por eso, el aparato físico se reduce a lo mínimo indispensable: hacer lo único que el teléfono no puede hacer por sí solo (tomar contacto físico con la tierra y el ambiente). Todo el resto ocurre en el teléfono. Además, el 100 % del procesamiento agronómico ocurre en el procesador del teléfono sin depender de cobertura de red móvil (3G/4G/5G). La nube actúa exclusivamente como respaldo posterior.

- **Cero Suscripciones Recurrentes.** El agricultor paga una vez por su instrumento y sus mediciones le pertenecen; puede consultarlas y usarlas libremente. A diferencia de la instrumentación importada que depende de plataformas por suscripción, aquí no existe una cuota mensual que condicione el funcionamiento del equipo. La tecnología no debe convertirse en una carga financiera mensual para quien ya enfrenta suficiente incertidumbre. Este principio tiene una consecuencia económica directa y asumida: los costos de soporte, servicios digitales, mantenimiento y reposición permanecen en el presupuesto de la empresa y están explícitamente cuantificados en la evaluación económica de este informe.

- **Honestidad sobre el Estado de Cada Función.** El informe distingue en todo momento entre lo que está implementado, lo que está presupuestado y lo que está pendiente de ensayo. Una función comprometida se declara como comprometida; una cifra de hoja de datos se distingue de una estimación de diseño. Esta disciplina es la que permite que el resto de las afirmaciones del documento se lean sin descuento.

## Beneficiarios de la Solución

El beneficiario directo y principal es el pequeño y mediano productor comercial (Agricultura Familiar Campesina), quien hoy queda fuera de toda la oferta de instrumentación profesional. Sin embargo, el diseño contempla un impacto expansivo hacia otros actores:

**La Familia y el Equipo de Trabajo.** El sistema está diseñado para que cualquier persona en el campo pueda tomar una medición sin necesitar formación técnica previa.

**Asesores Técnicos y Extensionistas.** Quienes hoy deben estimar las condiciones del suelo a través de la observación podrán pasar de “estimar” a “medir”, dejando un registro histórico y georreferenciado de cada visita. Cabe precisar, para efectos del dimensionamiento comercial, que la cantidad de campos visitados por un asesor no equivale a la cantidad de equipos comprados.

**Cooperativas y Asociaciones.** Podrán utilizar la herramienta para construir mapas de salud edáfica de todo el territorio que administran, mejorando las compras conjuntas de insumos.

**Instituciones Públicas.** Podrían apoyarse en esta información agregada para focalizar sus programas de fomento, paliando la actual falta de datos de suelo georreferenciados a escala de campo individual.

**El Medio Ambiente.** Una fertilización y riego ajustados a la necesidad real del cultivo, en lugar de aplicaciones preventivas por exceso de precaución, reduce el desperdicio hídrico y la contaminación de napas por lixiviación.

## La Propuesta de Valor

TerraSense toma la información física del suelo y del aire, la cruza con el conocimiento agronómico del cultivo y con las condiciones climáticas del lugar exacto de la medición, entregando en segundos y sin necesidad de conexión a internet una recomendación concreta y accionable. Es, en esencia, la diferencia entre entregarle a alguien un termómetro y entregarle una orientación de manejo ya interpretada. El modelo comercial que sostiene esa promesa es la venta del instrumento con la aplicación incluida y sin cobro por lectura: el usuario dispone de una herramienta de seguimiento permanente, mientras los servicios de laboratorio y asesoría conservan su función en aquellas decisiones que requieren determinaciones específicas.

## Estructura del Ecosistema

Para optimizar costos de manufactura y maximizar la durabilidad en terreno, las responsabilidades se distribuyen de forma estricta entre el hardware, la aplicación móvil y la infraestructura backend:

| Capa del Sistema | Componente Físico | Responsabilidad Asignada | Lo que Deliberadamente NO Realiza |
| --- | --- | --- | --- |
| 1. Instrumento de Captura | ESP32-WROOM-32 + Sonda 7-en-1 + BME280 | Excitar sensores, leer buses RS-485 e I²C, verificar checksums y transmitir trama BLE. | No procesa algoritmos agronómicos, no almacena historial ni requiere pantalla gráfica propia. |
| 2. Inteligencia Local | App móvil (React Native) con almacenamiento local persistente del teléfono y cola de sincronización diferida | Ejecutar motor agronómico determinista, georreferenciar puntos con GPS del teléfono, desplegar Grid 2×5 y conservar el histórico en el propio teléfono. | No genera voltajes de excitación industrial ni depende de servidores externos para evaluar. |
| 3. Respaldo y Flota | Base de datos relacional con extensión geoespacial + consola web | Respaldar mediciones al detectar red, control de cuentas, soporte posventa y analítica multitemporal. | No bloquea la operación en campo en ausencia de conectividad. |

###### **Tabla 1.0 “Distribución de Responsabilidades Funcionales del Sistema”**

Sobre la segunda fila conviene una precisión, porque de ella dependen las afirmaciones de operación sin red que el informe sostiene más adelante. La aplicación no utiliza un motor de base de datos embebido: conserva las mediciones en el almacenamiento persistente del propio teléfono y mantiene una cola de envío diferido, mientras el motor agronómico y las definiciones de cultivos residen en el código de la aplicación y no en un servidor. El efecto para el usuario —medir, diagnosticar y consultar sin cobertura— es el mismo que ofrecería una base de datos local, pero el mecanismo se nombra aquí con exactitud en lugar de aproximarlo.

---

# IV. Objetivos del Proyecto

## Objetivo General

Diseñar, construir y validar un instrumento portátil de medición de suelo que resuelva, de punta a punta, la toma de decisiones del pequeño agricultor: capturando en terreno las variables físicas y químicas relevantes del suelo y su ambiente, interpretándolas de inmediato mediante un sistema de razonamiento agronómico ejecutado en el teléfono del usuario, y entregando una recomendación de manejo clara y aplicable en cuestión de segundos, sin costos recurrentes por suscripción.

En síntesis: lograr que una medición física se convierta, en el mismo lugar, en una decisión agronómica correcta.

## Objetivos Específicos

Para materializar este objetivo general, el proyecto se estructura en los siguientes frentes de trabajo:

- **Definir la arquitectura de hardware y comunicación.** Comparar explícitamente distintas combinaciones de componentes y protocolos de transmisión hacia el teléfono, justificando técnica y económicamente la elección final en lugar de asumir la primera opción disponible.

- **Diseñar el sistema de adquisición de datos.** Lograr una integración confiable entre la sonda edáfica (que penetra la tierra) y los sensores ambientales, asegurando que el equipo capture un panorama físico-químico completo y no sólo datos aislados.

- **Optimizar la autonomía energética.** Desarrollar un sistema de alimentación capaz de sostener un uso frecuente en terreno durante varios meses sin requerir recargas constantes ni mantenimiento especializado, garantizando su disponibilidad durante toda la temporada agrícola.

- **Desarrollar el motor de razonamiento agronómico.** Construir el algoritmo (el “corazón” del sistema) que convierta las variables físicas capturadas en recomendaciones de manejo cuantificadas y ajustadas a la etapa fenológica específica del cultivo (siembra, desarrollo, floración o cosecha).

- **Programar la interfaz móvil (App) para entornos rurales.** Desarrollar una aplicación intuitiva y accesible para usuarios de distintos niveles de alfabetización digital, que opere de forma offline al momento de medir y sincronice los datos cuando recupere la cobertura de red.

- **Diseñar el encapsulado industrial (carcasa).** Crear una estructura física robusta, pensada explícitamente para el rigor del trabajo agrícola, que proteja los componentes electrónicos del barro, polvo, sol directo, humedad e inmersiones accidentales.

- **Validar la precisión instrumental.** Contrastar empíricamente las mediciones del equipo contra muestras analizadas por un laboratorio de referencia acreditado, respaldando con evidencia científica que los datos capturados reflejan fielmente la realidad del suelo, y declarar con igual claridad qué variables quedan fuera de esa validación y por qué.

- **Asegurar el cumplimiento normativo.** Identificar y cumplir el marco regulatorio aplicable, abarcando la seguridad eléctrica del hardware, el uso permitido del espectro radioeléctrico, y la protección de datos personales y derechos del consumidor, expresando cada norma como un requisito de diseño con método de verificación y criterio de aceptación.

- **Evaluar la viabilidad económica y financiera.** Estructurar el modelo de negocio, analizando rigurosamente la estructura de costos, proyecciones de flujo de caja y fuentes de financiamiento, para asegurar que la solución tecnológica sea sostenible como empresa en el tiempo.

---

# V. Ingeniería conceptual

La ingeniería conceptual constituye el puente crítico entre la problemática diagnosticada y la materialización de la solución. En esta etapa, los principios filosóficos del proyecto —movilidad, independencia de red, bajo costo y el uso del teléfono como núcleo de procesamiento— se traducen en requerimientos técnicos concretos. El objetivo de esta fase no es simplemente elegir componentes al azar, sino definir y justificar la arquitectura de hardware y software óptima que garantice la viabilidad del equipo en el mundo real, equilibrando rendimiento, robustez y usabilidad para el pequeño agricultor.

A partir de estas premisas, se desarrolla el siguiente análisis de viabilidad técnica, como también de viabilidad económica, en donde se evalúan las distintas alternativas para materializar el sistema.

## Análisis de Viabilidad Técnica

Antes de comparar cualquier alternativa, el proyecto fija dos capas de exigencia, porque confundirlas es el error metodológico más común en un estudio de ingeniería conceptual.

**Requisitos Obligatorios (filtro de viabilidad).** Son condiciones de cumplimiento innegociable: una arquitectura que no las satisface queda eliminada antes de puntuar, sin importar su desempeño en el resto de los criterios.

| Requisito | | Qué exige |
| --- | --- | --- |
| RO-1 | Alimentar y comunicarse con la sonda | Operar por bus diferencial RS-485 con sonda industrial. |
| RO-2 | Interpretar, no solo mostrar | Entregar un veredicto interpretado, no una lectura plana. |
| RO-3 | Operar sin cobertura celular | Completar la medición en el momento, sin depender de señal de datos. |
| RO-4 | Muestrear múltiples puntos | Permitir recorrer y medir distintos puntos de un mismo campo en una jornada. |
| RO-5 | Ser físicamente realizable | Construirse con componentes de catálogo real, no con tecnología hipotética. |

###### **Tabla 1.1 “Filtro de Viabilidad”**

**Criterios Ponderados.** Solo entre las arquitecturas que sobreviven el filtro se aplica una matriz de puntuación (escala 1 a 10) sobre ocho criterios: cobertura espacial (15 %), calidad de interfaz (13 %), capacidad de interpretación (15 %), autonomía energética (14 %), costo total a cinco años para el agricultor (16 %), robustez mecánica y ambiental (10 %), facilidad de actualizar el conocimiento agronómico (9 %) e independencia de infraestructura externa (8 %).

Esta separación en dos capas evita “aprobar” una arquitectura inviable con un buen puntaje ponderado, un caso real que aparece más adelante y que el propio proyecto descarta por honestidad tecnológica.

### Alternativas Evaluadas

Se compararon seis arquitecturas; ninguna es hipotética, las seis existen hoy como productos comerciales o como proyectos publicados en la literatura técnica.

**1. Instrumento autónomo (8 bits + pantalla + Bluetooth Classic).** La arquitectura por defecto de la electrónica educativa y de buena parte de los medidores genéricos de importación: un microcontrolador simple, una pantalla LCD u OLED pequeña, y un módulo Bluetooth Classic para vinculación.

**Figura 1.1 “Diagrama de Flujo Arquitectura 8 Bits + Bluetooth Classic”**

*Flujo de la arquitectura: sensor, microcontrolador de 8 bits, pantalla local y enlace Bluetooth Classic hacia el teléfono.*

*Evaluación:* Los módulos Bluetooth Classic más usados implementan un perfil de comunicación que iOS no permite usar sin certificación MFi de Apple. Adoptarla significa renunciar a la mitad del mercado de teléfonos. Además, la memoria disponible no alcanza para el motor de interpretación y no hay forma de actualizar el firmware de forma remota. Incumple el filtro de viabilidad y queda eliminada.

**2. Instrumento autónomo con inferencia embebida y pantalla.** La versión seria de la alternativa anterior. Todo el sistema, incluido el motor de interpretación agronómica, viviría dentro del microcontrolador, sin depender de un teléfono.

**Figura 1.2 “Diagrama de Flujo Arquitectura de Sistema Embebido y Pantalla”**

*Flujo de la arquitectura: adquisición, inferencia agronómica local y presentación en pantalla propia, sin enlace con el teléfono.*

*Evaluación:* Incorporar una pantalla activa y el motor de interpretación agronómica reduce la autonomía en más de tres cuartas partes; la ventana de la pantalla es un riesgo de estanqueidad frente a la humedad; sin GPS ni conectividad se pierde la capa del motor que cruza la medición con el clima previsto; y corregir el conocimiento agronómico exigiría publicar un nuevo firmware y forzar al usuario a instalarlo. Sí supera el filtro de viabilidad y llega a la etapa de puntuación.

**3. Datalogger estacionario con telemetría de red móvil.** La arquitectura típica de las parcelas de investigación: equipo fijo, alimentado por panel solar, con una sonda enterrada en un único punto y un módem de red móvil que sube datos a una web por suscripción.

**Figura 1.3 “Diagrama de Flujo Arquitectura con Datalogger Estacionario”**

*Flujo de la arquitectura: sonda fija, alimentación solar, módem celular y plataforma web por suscripción.*

*Evaluación:* Resuelve bien un problema distinto. La variabilidad de un campo es espacial; mapear veinte puntos exigiría veinte equipos. Requiere cobertura celular exacta en el punto de instalación e impone una suscripción recurrente, incompatible con el proyecto. Incumple RO-3 y RO-4 y queda eliminada.

**4. Red de nodos LoRaWAN con estación concentradora predial.** Reemplaza el módem de red móvil por una radio de largo alcance y bajísimo consumo hacia una estación concentradora instalada en el campo.

**Figura 1.4 “Diagrama de Flujo Arquitectura de Nodos con LoRaWAN”**

*Flujo de la arquitectura: nodos distribuidos, radio LoRa de largo alcance, estación concentradora y servidor de red.*

*Evaluación:* Es la alternativa técnicamente más elegante entre las descartadas, pero medir 20 puntos exigiría 20 nodos a un costo prohibitivo, y exige instalar infraestructura propia (la estación). Además, no resuelve el caso de uso real: el agricultor está de pie sobre el punto cuando necesita la decisión, no a distancia. Cumple los requisitos y pasa a puntuar con esa reserva.

**5. Sonda conectada directo al teléfono (sin electrónica intermedia).** La alternativa más radical: eliminar la radio del medio y conectar la sonda al teléfono por cable.

**Figura 1.5 “Diagrama de Flujo Arquitectura de Sonda conectada al Teléfono”**

*Flujo de la arquitectura: sonda industrial conectada por cable al puerto del teléfono en modo host, sin electrónica intermedia.*

*Evaluación:* Si se puntuara, obtendría el segundo mejor resultado al heredar gratis todas las capacidades del teléfono. Sin embargo, es físicamente irrealizable: aunque la sonda opera en un rango de 5 a 24 V DC que técnicamente incluye los 5 V que entrega un puerto USB, el puerto del teléfono en modo host no puede sostener la corriente de excitación que exige la sonda industrial durante la medición, y ningún teléfono comercial genera de forma nativa la señalización diferencial RS-485 que el protocolo exige. El límite no es de tensión sino de corriente entregable y de capa física. Incumple RO-1 y RO-5 y queda eliminada sin puntuar.

**6. Instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete.** La síntesis de las lecciones anteriores: un equipo portátil mínimo que resuelve únicamente lo que el teléfono no puede hacer (proveer la tensión, el protocolo y la medición física), y delega en el teléfono la interpretación, la posición geográfica, la pantalla y el almacenamiento mediante un enlace inalámbrico BLE (Bluetooth Low Energy).

**Figura 1.6 “Diagrama de Flujo Arquitectura de Sistema Embebido de Bajo Consumo”**

*Flujo de la arquitectura: adquisición por RS-485 e I²C, empaquetado de la trama, enlace BLE puntual e interpretación agronómica en el teléfono.*

*Evaluación:* El teléfono reúne capacidades que duplicar en el instrumento sería un gasto innecesario. Asume que el usuario dispone de un teléfono, supuesto respaldado por la penetración de telefonía en zonas rurales. Cumple la totalidad de los requisitos y pasa a puntuar.

### Matriz de Decisión

Puntuando sólo a las arquitecturas que superaron el filtro:

| Criterio | Peso | Instrumento autónomo con inferencia embebida y pantalla | Red de nodos LoRaWAN con estación concentradora predial | Instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete |
| --- | :---: | :---: | :---: | :---: |
| Cobertura espacial | 15 % | 8 | 5 | 10 |
| Calidad de interfaz | 13 % | 4 | 7 | 10 |
| Capacidad de interpretación | 15 % | 6 | 8 | 10 |
| Autonomía energética | 14 % | 4 | 8 | 9 |
| Costo total a 5 años | 16 % | 6 | 2 | 8 |
| Robustez mecánica | 10 % | 6 | 9 | 9 |
| Actualización del conocimiento | 9 % | 5 | 8 | 10 |
| Independencia de infraestructura | 8 % | 9 | 5 | 7 |
| **Puntaje ponderado final** | **100 %** | **5,91** | **6,32** | **9,20** |

###### **Tabla 1.2 “Matriz de Decisiones”**

**Conclusión y Sensibilidad.** La arquitectura de un instrumento portátil inalámbrico de bajo consumo, con el teléfono como intérprete, gana con margen amplio por su ventaja insuperable en cobertura espacial ilimitada, capacidad de interpretación y facilidad de actualización del software. Tras un análisis de sensibilidad elevando los pesos de distintos criterios, esta arquitectura mantiene su ventaja: incluso llevando al 30 % el peso de la independencia de infraestructura —el único criterio donde no lidera— su puntaje sigue por sobre el de las otras dos. Entre las descartadas, la red LoRaWAN queda por sobre el instrumento autónomo con pantalla, resultado coherente con la evaluación cualitativa que la describe como la alternativa técnicamente más elegante de ese grupo.

## Selección de Componentes Base

Decidida la arquitectura general, la segunda capa de decisiones define con qué componente concreto se construye cada bloque. Se aplicó la misma disciplina: evaluación de candidatos reales, criterios declarados antes de comparar, y honestidad explícita cuando la alternativa descartada es superior en alguna dimensión. Sobre once subsistemas evaluados, en siete existe una alternativa técnicamente superior en alguna métrica, y el proyecto lo declara en lugar de presentar una selección irreal donde el componente elegido gane en todo.

### Microcontrolador

Se evaluaron cuatro candidatos: ESP32, nRF52840, STM32WB55 y ATmega328P + HC-05. Este último queda descartado de entrada: su módulo Bluetooth Classic sufre el mismo bloqueo de iOS (certificación MFi) visto en la evaluación de arquitecturas.

Los tres restantes se puntúan sobre cinco criterios declarados antes de comparar, en la misma escala de 1 a 10 usada en la matriz de arquitecturas: consumo de radio en transmisión BLE (20 %), Wi-Fi integrado para actualización remota (20 %), concurrencia disponible para separar la pila de radio de la temporización Modbus (15 %), ecosistema y soporte de documentación (25 %) y disponibilidad y costo en el mercado local (20 %).

| Microcontrolador | Consumo de radio en Tx BLE | Wi-Fi / OTA | Núcleos | Ecosistema | Disponibilidad y costo | Puntaje ponderado | Veredicto |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| STM32WB55 | ~5–6 mA [8] | No | 2 | 5 | 4 | 5,65 | Descartado |
| nRF52840 | ~5–6 mA [9] | No | 1 (ARM Cortex) | 7 | 5 | 5,90 | Descartado |
| ESP32 | ~130–150 mA [19] | Sí (nativo) | 2 | 10 | 10 | 8,80 | **Seleccionado** |

###### **Tabla 1.3 “Comparativa de Microcontroladores”**

Las notas asignadas al criterio de consumo son 10 para los dos chips de radio eficiente y 4 para el ESP32; las de concurrencia, 8 para el STM32WB55 (cuyo segundo núcleo está dedicado a la pila de radio), 5 para el nRF52840 y 10 para el ESP32.

**Justificación de la Selección.** Aunque los chips nRF52840 y STM32WB55 superan al ESP32 por un factor enorme en eficiencia de radio, al modelar el presupuesto energético completo del equipo esa ventaja de radio sólo se traduce en una fracción mínima de autonomía total, porque la carga dominante es la sonda y la autodescarga de la batería. A cambio de resignar ese porcentaje, el ESP32 aporta Wi-Fi integrado (vital para actualizar el firmware por aire sin complicaciones), doble núcleo (para sostener la temporización de la sonda sin perder el Bluetooth) y, por último, un extenso ecosistema de desarrollo y soporte global de la comunidad para proyectos basados en este microcontrolador.

Sobre la cifra de consumo conviene fijar una sola referencia, porque este informe la utiliza en dos lugares distintos: el módulo presenta un rango dinámico total de 95 a 380 mA medido en su propio pin de 3,3 V, dentro del cual la transmisión BLE se sitúa en el orden de 130 a 150 mA. El balance energético de este informe adopta 150 mA para la fase de envío, es decir el extremo superior de esa banda, por prudencia.

### Sonda de Suelo

Aporta 7 de las 10 variables del sistema, siendo la decisión más crítica. Se comparó la sonda 7-en-1 RS-485 contra instrumentos de grado de investigación (METER TEROS 12, Delta-T WET150, Stevens HydraProbe) [10].

Los criterios declarados y sus pesos son: número de variables entregadas (30 %), exactitud declarada (25 %), viabilidad económica medida como costo por variable (30 %) y robustez e idoneidad para uso portátil en terreno (15 %).

| Sonda | Variables entregadas | Exactitud pura | Viabilidad económica | Robustez | Puntaje ponderado |
| --- | :---: | :---: | :---: | :---: | :---: |
| Grado investigación (TEROS 12 y equivalentes) | 3 a 4 variables (nota 4) | 10 | Muy baja, costo ×20 (nota 1) | 10 | 5,50 |
| Sonda 7-en-1 RS-485 | 7 variables (nota 10) | 7 | Alta (nota 9) | 7 | **8,50** |

###### **Tabla 1.4 “Comparativa de Sondas de Suelo”**

**Justificación de la Selección.** Se sacrifica exactitud absoluta a cambio de viabilidad. Obtener las siete variables con sensores de investigación multiplicaría el costo del producto por veinte, lo que contradice el objetivo mismo del proyecto. La limitación técnica más importante se declara explícitamente: la estimación de N, P y K no se mide por electrodo ion-selectivo, sino que se deriva de la conductividad eléctrica. En suelo salino puede leer erróneamente un estado “fértil”. Para mitigarlo, la aplicación presenta N, P y K como **registros informativos**, acompañados de forma permanente por una advertencia de que no constituyen un diagnóstico nutricional y no permiten prescribir dosis de fertilizante; además, cuando la conductividad eléctrica supera los 1.000 µS/cm se activa un veto de confianza que refuerza esa advertencia en pantalla. En ningún caso se presenta una clase agronómica ni una dosis derivada de estos tres valores.

### Sensor Ambiental

Compiten el Bosch BME280, el BMP280 y el Sensirion SHT40.

| Sensor | Exactitud temperatura | Mide humedad relativa | Mide presión barométrica | Veredicto |
| --- | :---: | :---: | :---: | :---: |
| Sensirion SHT40 | ±0,2 °C [11] | Sí | No | Descartado por función |
| Bosch BMP280 | ±1,0 °C [12] | No | Sí | Descartado por función |
| Bosch BME280 | ±1,0 °C [13] | Sí (±3 % HR) | Sí (±1,0 hPa) | **Seleccionado** |

###### **Tabla 1.5 “Comparativa de Sensores de Temperatura / Humedad / Presión Barométrica”**

**Justificación de la Selección.** Se elige por una razón funcional, no de desempeño. El BME280 es el único de los tres candidatos que entrega simultáneamente las tres magnitudes que el Grid 2×5 reserva al ambiente local. El SHT40 es más exacto en temperatura pero no mide presión; el BMP280, frecuentemente confundido con el BME280 por su encapsulado casi idéntico, no aporta humedad relativa y por lo tanto no constituye un reemplazo funcional. La presión barométrica se utiliza además para corregir el cálculo de evapotranspiración por altitud [14]. Cabe precisar que la temperatura del BME280 se emplea también en la compensación interna del propio sensor, y su correspondencia con el aire exterior depende críticamente de su ubicación física dentro de la carcasa, requisito que se aborda en el diseño mecánico.

## Arquitectura de Conectividad

La estrategia de comunicación del sistema se divide en distintas etapas, cada una diseñada para optimizar los recursos energéticos y superar las barreras del entorno agrícola:

- **Sonda de Suelo → ESP32 (bus RS-485, Modbus RTU).** Se eligió esta interfaz frente a alternativas más simples (como UART directo) porque transmite una señal diferencial robusta e inmune al ruido electromagnético en campo abierto. Además, al ser el estándar universal para instrumentación industrial, permite intercambiar sondas de distintos fabricantes en el futuro sin necesidad de rediseñar la placa base del equipo. Conviene separar las dos capas involucradas: RS-485 define la capa eléctrica diferencial, mientras Modbus define la estructura de los mensajes; en su implementación serial RTU se verifican longitud, dirección, función, CRC-16 y temporización entre tramas.

- **Sensor Ambiental BME280 → ESP32 (bus I²C).** Para la captura de datos atmosféricos (temperatura del aire, humedad relativa y presión barométrica) se utiliza una comunicación serie de dos hilos. Al estar el sensor integrado para lectura ambiental local, directamente en la placa o a muy corta distancia del microcontrolador, el protocolo I²C es el estándar ideal por su simplicidad técnica y bajo consumo, sin verse afectado por las limitaciones de distancia que sufriría en campo abierto.

- **ESP32 → Teléfono (Bluetooth Low Energy).** Se optó por un enlace BLE puntual debido a su bajo consumo energético. El equipo envía paquetes de datos muy pequeños (tramas de 20 bytes en el contrato vigente) y se conecta solo durante los segundos que dura la medición. Al utilizar BLE se evita la barrera de certificación MFi que afecta al perfil serial de Bluetooth Classic en iOS, habilitando compatibilidad con Android y Apple sin costos de hardware adicionales.

- **Teléfono → Nube (HTTPS).** El sistema implementa una arquitectura estrictamente offline-first. La falta de cobertura en zonas rurales es la principal causa de fallo en agrotecnología, por lo que el motor de interpretación agronómica corre localmente en el teléfono sobre almacenamiento local persistente. La conexión a la nube ocurre de manera diferida y en segundo plano, interviniendo únicamente para sincronizar historiales y respaldar información cuando el teléfono detecta señal de internet.

Esta independencia tiene un límite preciso, y conviene declarar la frontera función por función en lugar de afirmar genéricamente que el sistema “funciona offline”. La siguiente tabla es la definición operativa de esa frontera. La columna de estado distingue lo que hoy está implementado de lo que está comprometido y pendiente, con el mismo criterio que este informe aplica a los ensayos de hardware.

| Función del sistema | Conectividad requerida | Comportamiento sin cobertura | Estado |
| --- | :---: | --- | :---: |
| Emparejamiento y lectura BLE del instrumento | Ninguna | Funciona íntegramente; el enlace es punto a punto entre equipo y teléfono | Implementado |
| Validación de la trama y marcado de lecturas ausentes | Ninguna | Funciona íntegramente; una variable no recibida se almacena como ausente, nunca se estima | Implementado |
| Motor agronómico: diagnóstico y recomendación de labor | Ninguna | Funciona íntegramente; las reglas y umbrales residen en la aplicación, no en un servidor | Implementado |
| Georreferenciación de la medición | Ninguna | Funciona con el GPS satelital del teléfono, que no requiere datos móviles | Implementado |
| Guardado en el almacenamiento local y consulta del histórico ya almacenado | Ninguna | Funciona íntegramente sobre el almacenamiento del teléfono | Implementado |
| Exportación del histórico local a archivo | Ninguna por diseño | El archivo se genera en el propio teléfono, sin consultar ningún servidor | **Comprometida, pendiente de implementación** |
| Creación de cuenta, inicio de sesión inicial y recuperación de credenciales | Requiere internet | No disponible; la sesión ya iniciada permanece válida y permite seguir midiendo | Implementado |
| Registro de un equipo nuevo en la cuenta | Requiere internet | No disponible; se completa al recuperar cobertura | Implementado |
| Sincronización y respaldo del histórico hacia la nube | Requiere internet | Las mediciones se encolan localmente y se envían solas al recuperar señal; no se pierde ninguna | Implementado |
| Consola web de flota para asesores y cooperativas | Requiere internet | No disponible; es una herramienta de escritorio, no de terreno | Implementado |
| Pronóstico meteorológico a cinco días | Requiere internet | La aplicación indica expresamente que el pronóstico no está disponible y no lo sustituye por un valor estimado | Implementado |

###### **Tabla 1.6 “Frontera Offline / Online del Sistema”**

La regla que resume la tabla es simple y define el diseño completo: medir, diagnosticar, georreferenciar y guardar no dependen jamás de la cobertura. Lo que sí depende de ella es administrar la cuenta, respaldar en la nube y contextualizar con el clima previsto, es decir, funciones que el agricultor ejecuta antes o después de la jornada de terreno, no durante. Un teléfono sin señal en medio del campo conserva la totalidad de la cadena que convierte una medición física en una decisión agronómica; lo único que posterga es el respaldo. Esta distinción también acota la promesa comercial: el sistema no ofrece pronóstico sin internet ni sincronización mágica, y ninguna de las dos carencias impide tomar la decisión en terreno.

La única fila que no está implementada es la exportación del histórico a un archivo. Se declara aquí con su estado real en lugar de presentarla como operativa, porque el principio de soberanía del dato la compromete y la sección normativa la utiliza como uno de los mecanismos con que se atiende el derecho del titular sobre sus datos personales. Su diseño no depende de la red —el archivo se construye con lo que ya está en el teléfono— y por eso figura en la columna de conectividad como “ninguna por diseño”, pero mientras no exista no se cuenta entre las funciones disponibles.

Se adjunta un diagrama de flujo para comprender de manera visual la ruta de la información, desde la captura en terreno hasta el almacenamiento diferido en la nube.

**Figura 1.7 “Diagrama de Flujo Arquitectura de Conectividad”**

*Ruta completa del dato: sonda, bus RS-485, ESP32, trama BLE, motor agronómico en el teléfono, almacenamiento local y sincronización diferida hacia la nube al recuperar cobertura.*

## Análisis de Viabilidad Económica

El siguiente análisis detalla el dimensionamiento del mercado, la estructura de costos, la estrategia de precios, el plan operativo y las proyecciones financieras del proyecto TerraSense, dando respuesta a los objetivos específicos de evaluar la viabilidad económica y de dimensionar el mercado y la capacidad productiva. El estudio vincula explícitamente las decisiones técnicas con la operación de una empresa. Cada instrumento necesita sonda, sensor ambiental, electrónica, carcasa, montaje, pruebas, embalaje y entrega; a ello se agregan adquisición de clientes, personal, contabilidad, soporte y servicios digitales. Un margen calculado sólo como precio menos sonda no permitiría financiar estas actividades ni explicar la caja necesaria para iniciar la operación.

### Las Tres Economías

Antes de la primera cifra conviene fijar una separación que este informe mantiene en todo su desarrollo, porque mezclarlas es el error que vuelve incomparable cualquier evaluación de este tipo. El análisis distingue tres economías distintas, con unidades, destinatarios y criterios de éxito propios:

| Economía | Qué mide | Con qué se evalúa | Dónde se desarrolla |
| --- | --- | --- | --- |
| Economía del proyecto | La inversión de desarrollo y puesta en marcha frente a los flujos que genera la actividad, antes de decidir cómo se financia | VAN, TIR y payback sobre el FCFF de 120 meses | Metodología de VAN, TIR y payback |
| Economía del negocio | Cuánto cuesta fabricar cada equipo y operar la empresa, y qué margen deja cada venta | BOM, margen de contribución, punto de equilibrio, EBITDA y DSCR | Tablas de BOM, economía unitaria, gastos fijos y equilibrio |
| Economía del cliente | Cuánto gasta el agricultor para resolver el mismo problema con TerraSense o sin él | TCO comparado a 1, 3, 5 y 10 años | Costo total de propiedad |

###### **Tabla 1.7 “Separación de las Tres Economías del Análisis”**

La consecuencia práctica de esta separación es una sola y se aplica sin excepción: **el ahorro del agricultor no es ingreso del proyecto**. Los pesos que un cliente deja de gastar en laboratorio o asesoría no aparecen en ninguna línea del flujo de caja de la empresa; se presentan únicamente como argumento de adopción, porque explican por qué alguien compraría el equipo, no cuánto factura quien lo vende. Del mismo modo, el margen de la empresa no mide la rentabilidad del proyecto, que se calcula antes de financiamiento y sobre la inversión total.

### Dimensionamiento del Mercado

Antes de proyectar una sola unidad vendida es necesario acotar el universo sobre el cual se proyecta. El dimensionamiento se construyó sobre fuente censal oficial: el Censo Agropecuario y Forestal 2021, que informa 138.628 unidades productivas agropecuarias y 36.928 unidades de autoconsumo. El análisis usa las tres capas estándar del dimensionamiento comercial, cuyos nombres técnicos se indican aquí una sola vez para no volver a repetirlos en siglas sin explicación: TAM (*Total Addressable Market*, mercado total), SAM (*Serviceable Available Market*, mercado accesible o servible) y SOM (*Serviceable Obtainable Market*, mercado objetivo).

| Nivel | Definición y filtros aplicados | Universo | Uso dentro del estudio |
| --- | --- | :---: | --- |
| TAM (mercado total) | Unidades productivas censadas (138.628 UPA + 36.928 UAC) | 175.556 unidades | Dimensionar el sector; no convierte cada unidad en una venta |
| SAM (mercado servible) | Productores y asesores con orientación comercial, teléfono y acceso al canal | ≈ 47.300 unidades | Acotar el mercado direccionable con cruces explícitos, no por atribución directa al censo |
| SOM (meta a 10 años) | Equipos que el plan comercial propone vender en diez años | 7.481 unidades a 10 años | Meta derivada del presupuesto de ventas y de la capacidad productiva |

###### **Tabla 1.8 “Dimensionamiento del Mercado”**

El Mercado Accesible (SAM) excluye deliberadamente las 36.928 unidades de autoconsumo: son unidades sin orientación comercial hacia el mercado, y mantenerlas dentro del universo direccionable de un instrumento de $349.990 infla artificialmente el mercado servible. El cálculo parte entonces exclusivamente de las 138.628 UPA y aplica tres filtros sucesivos, declarados como supuestos a afinar con una encuesta primaria del canal comercial una vez iniciada la operación:

| Filtro aplicado | Criterio | Retención estimada | Universo resultante |
| --- | --- | :---: | :---: |
| Universo base | UPA censadas (excluye UAC) | — | 138.628 u |
| 1. Superficie objetivo | Campos de 0,5 a 20 ha, el rango de la AFC descrito en la Sección II | 70 % | 97.040 u |
| 2. Orientación comercial | Producción destinada mayoritariamente al mercado, no a subsistencia, dentro del propio segmento de 0,5–20 ha | 75 % | 72.780 u |
| 3. Acceso al canal | Tenencia de teléfono inteligente y acceso a compra por venta directa, distribuidor regional o cooperativa | 65 % | ≈ 47.300 u |

###### **Tabla 1.9 “Cálculo del Mercado Accesible por Filtros Sucesivos”**

Bajo estos tres filtros, el mercado servible (SAM) se estima en aproximadamente 47.300 unidades productivas. Es una cifra defendible por su método, no una cifra censal exacta: los tres porcentajes se derivan del perfil conocido de la Agricultura Familiar Campesina [4] y de la penetración de teléfonos en zonas rurales de Chile (88,5 % de uso habitual declarado) [15], y se corrigen con la encuesta de canal que la empresa levanta durante el primer año de operación. Sobre ese universo, el Mercado Objetivo (SOM) se mide en dos cortes. A cinco años, las 2.550 unidades del plan representan una penetración de 5,4 % del mercado servible. A diez años, los 7.481 equipos del plan completo llevan esa penetración a 15,8 %, es decir un instrumento por cada seis campos direccionables.

### Plan de Ventas y Motor de Crecimiento

Toda esta evaluación económica se ha construido sobre un escenario base conservador respecto a la proyección de ventas anuales. El escenario inicial contempla apenas 200 unidades el primer año, equivalentes a 17 unidades mensuales; proyectar una colocación masiva para una marca nueva destruiría la credibilidad del estudio. Cada salto de volumen responde a una causa presupuestada y a una inversión asociada. El crecimiento no es una extrapolación matemática, sino la consecuencia de acciones comerciales financiadas dentro del flujo, y cada uno de los diez años tiene su propio programa de gasto comercial, dotación y estructura de soporte:

- **Año 1, 2027 (200 unidades).** Sin agencia de marketing. Los socios gestionan directamente la pauta digital ($6.000.000), las demostraciones en campo y la atención comercial, para documentar los primeros casos de éxito con costo de estructura mínimo. Toda la producción y el soporte los absorben los dos socios.

- **Año 2, 2028 (350 unidades).** Se incorpora medio cargo de técnico ensamblador (0,5 FTE) porque las 2,25 horas de montaje por equipo superan las 500 horas que los fundadores pueden dedicar a producción. La pauta sube a $10.815.000 y se activa el canal de asesores agronómicos, que venden por recomendación profesional y no requieren comisión distinta de la venta directa.

- **Año 3, 2029 (500 unidades).** Se suma medio cargo de soporte técnico dedicado (0,5 FTE), dimensionado sobre media hora anual de atención por equipo activo más dos horas comerciales por venta. La base instalada acumulada empieza a generar recompra de repuestos y recomendaciones.

- **Año 4, 2030 (650 unidades).** Se alcanza el umbral que activa la agencia de marketing ($3.278.181 en el año) y se presenta la primera postulación a compras institucionales. La dotación llega a 1,0 FTE en producción y 1,0 FTE en soporte.

- **Año 5, 2031 (850 unidades).** Cobertura multirregional apalancada por la base instalada. La dotación sube a 1,5 FTE en producción y 1,5 FTE en soporte, y la pauta llega a $28.700.475.

- **Año 6, 2032 (892 unidades).** Primer año de operación en régimen. La producción se estabiliza en 1,5 FTE porque la curva de aprendizaje del taller compensa el aumento de volumen, mientras el soporte sube a 2,0 FTE para atender una base instalada que ya supera los 2.500 equipos. Agencia y pauta se mantienen y se reajustan por inflación.

- **Año 7, 2033 (937 unidades).** Se ejecuta la segunda reinversión en activos de taller ($1.500.000 reajustados), correspondiente al ciclo de renovación de instrumental cada tres años. La estructura comercial no cambia.

- **Año 8, 2034 (984 unidades).** El soporte llega a 2,5 FTE, su nivel máximo en el estudio, y la contabilidad externa aumenta su honorario por el mayor número de trabajadores en nómina. Es el año de mayor densidad de estructura por unidad vendida.

- **Año 9, 2035 (1.033 unidades).** Primer año en que la empresa supera las mil unidades anuales. La estructura se mantiene y el crecimiento se absorbe sin dotación adicional, lo que se refleja en el salto del EBITDA de $62,0 a $72,8 millones.

- **Año 10, 2036 (1.085 unidades).** Último año del estudio y del crédito. La última cuota se paga en diciembre y la empresa cierra el horizonte sin pasivo bancario, con $329.777.729 de caja acumulada.

El crecimiento de los años 6 a 10 se fija en 5 % anual acumulativo en unidades, muy por debajo del 43,6 % anual compuesto de los cinco primeros años. Esa desaceleración es deliberada: refleja una empresa que dejó de conquistar mercado nuevo y pasa a crecer con la base instalada, la recompra y la recomendación, sin campañas de expansión adicionales. Cada uno de esos cinco años tiene, aún así, su propio presupuesto de pauta, agencia, contabilidad, dotación y reinversión, calculados con la misma regla que los cinco primeros y reajustados por una inflación del 3 % anual.

| Año | Equipos | Pauta anual | Técnico ensamblador | Soporte técnico | Agencia de marketing anual |
| :---: | :---: | ---: | :---: | :---: | ---: |
| 2027 | 200 | $6.000.000 | 0,0 | 0,0 | $0 |
| 2028 | 350 | $10.815.000 | 0,5 FTE | 0,0 | $0 |
| 2029 | 500 | $15.913.500 | 0,5 FTE | 0,5 FTE | $0 |
| 2030 | 650 | $21.308.176 | 1,0 FTE | 1,0 FTE | $3.278.181 |
| 2031 | 850 | $28.700.475 | 1,5 FTE | 1,5 FTE | $3.376.526 |
| 2032 | 892 | $31.022.174 | 1,5 FTE | 2,0 FTE | $3.477.822 |
| 2033 | 937 | $33.564.810 | 1,5 FTE | 2,0 FTE | $3.582.157 |
| 2034 | 984 | $36.305.877 | 1,5 FTE | 2,5 FTE | $3.689.622 |
| 2035 | 1.033 | $39.257.205 | 1,5 FTE | 2,5 FTE | $3.800.310 |
| 2036 | 1.085 | $42.470.367 | 1,5 FTE | 2,5 FTE | $3.914.320 |

###### **Tabla 2.0 “Plan de Ventas y Asignación de Recursos Comerciales (10 Años)”**

Los primeros cinco años suman 2.550 equipos, que a precio inicial constante representan $892.474.500 brutos. El plan completo a diez años suma 7.481 equipos, equivalentes a $2.618.275.190 brutos a precio inicial constante; el flujo nominal incorpora los reajustes anuales del 3 %. El Mercado Objetivo (SOM) es una meta de ventas, no una cifra censal de compradores.

La pauta del primer año es $6.000.000, equivalente a **$30.000 de inversión comercial por equipo vendido expresados en pesos de 2027**. Esa proporción real se mantiene constante durante los diez años, pero la cifra nominal se reajusta por la inflación del 3 % anual: en 2036 el mismo criterio equivale a $39.143 por equipo ($30.000 × 1,03⁹), lo que sobre 1.085 unidades arroja los $42.470.367 de la tabla. La aclaración importa porque sin ella el número no se reproduce: 1.085 equipos a $30.000 nominales darían $32.550.000, y la diferencia es exactamente el reajuste acumulado. La agencia de marketing se activa desde 650 ventas anuales. La estrategia base utiliza venta directa, pauta digital, demostraciones y atención comercial de los socios; la distribución mayorista, el crédito a clientes y los convenios institucionales se consideran expansiones posibles, pero no se contabilizan como ventas comprometidas ni con el mismo margen de la venta directa.

### Estructura de Costos y Producción

El costo de materiales de cada unidad se detalla en la BOM (*Bill of Materials*, lista de materiales): el desglose completo de todo lo que entra físicamente en un equipo, componente por componente, con su cantidad y su costo neto. El instrumento de medición (sonda 7-en-1 RS-485) representa la variable crítica con $48.000, equivalente al 59,1 % del costo de materiales, lo que justifica la decisión de no sacrificar la lectura de variables clave del suelo a expensas de abaratar componentes.

| Material o servicio por equipo | Cantidad | Neto unitario CLP | Subtotal CLP |
| --- | :---: | ---: | ---: |
| Sonda RS-485 7-en-1 (SKU pendiente de ficha) | 1 | $48.000 | $48.000 |
| Placa de desarrollo ESP32-WROOM-32 | 1 | $6.723 | $6.723 |
| Módulo ambiental Bosch BME280 I²C | 1 | $2.941 | $2.941 |
| PCB combinada USB-C carga + boost | 1 | $900 | $900 |
| Batería LiPo 2000 mAh | 1 | $4.500 | $4.500 |
| SP3485 transceptor RS-485 3,3 V | 1 | $900 | $900 |
| Conector JST batería 3 pines con contraparte/cable | 1 | $450 | $450 |
| Pulsador | 1 | $250 | $250 |
| LED SMD | 3 | $40 | $120 |
| Pasivos, protección y terminación RS-485 | 1 | $1.200 | $1.200 |
| PCB portadora y montaje externo SMD | 1 | $2.500 | $2.500 |
| Carcasa impresa en 3D PETG (servicio externo) | 1 | $6.000 | $6.000 |
| Prensaestopas, fijaciones, juntas y respiradero BME280 | 1 | $1.500 | $1.500 |
| Cableado y conectores internos adicionales | 1 | $700 | $700 |
| Embalaje, manual y etiqueta | 1 | $2.000 | $2.000 |
| Flete de insumos y contingencia importación | 1 | $2.500 | $2.500 |
| **Total BOM** | | | **$81.184** |

###### **Tabla 2.1 “Estructura de Costos de Fabricación (BOM)”**

Sobre la segunda línea corresponde una precisión que tiene consecuencias en el capítulo energético: el presupuesto adquiere el ESP32-WROOM-32 **en formato de placa de desarrollo**, no como módulo desnudo soldado a la placa portadora. Esa placa incorpora un regulador de propósito general, un puente USB-UART y un LED de alimentación que permanecen conectados y que no se apagan con el modo de reposo profundo del microcontrolador. El diseño contempla por ello una intervención de taller sobre cada unidad —alimentar la placa directamente en su riel de 3,3 V desde el regulador propio del instrumento y retirar el LED de alimentación— sin la cual el presupuesto de reposo declarado más adelante no se alcanza. Esa intervención forma parte de las 2,25 horas de montaje y prueba ya presupuestadas por equipo, y se detalla en la sección de gestión energética.

Con el costo de materiales ya cerrado, la pregunta siguiente es qué queda de cada venta antes de pagar la estructura de la empresa. La economía unitaria responde exactamente eso: toma el precio de lista, lo lleva a ingreso neto de IVA y le descuenta todo lo que se gasta por equipo vendido —materiales, merma, provisión de garantía, envío y comisión comercial— sin mezclar en el cálculo ningún gasto que ocurriría igual aunque no se vendiera una sola unidad. Tres criterios explican las cifras. La merma (3 %) y la provisión de reposiciones y garantía (5 %) se calculan sobre la BOM y no sobre el precio, porque son riesgos de material y no de venta. La comisión comercial se aplica sobre el bruto, 5 % de los $349.990, mientras el ingreso se reconoce neto: un tratamiento deliberadamente conservador que carga la diferencia al margen. El envío se presupuesta a $6.000 netos por equipo como costo del vendedor y no se traslada al cliente.

| Economía unitaria, año 1 | CLP |
| --- | ---: |
| Precio con IVA | $349.990 |
| Ingreso neto de IVA | $294.109 |
| Materiales y servicios incluidos en BOM | $81.184 |
| Merma, 3 % de BOM | $2.436 |
| Reposiciones y garantía, 5 % de BOM | $4.059 |
| Envío | $6.000 |
| Comisión comercial, 5 % del bruto | $17.500 |
| **Costo variable total** | **$111.178** |
| **Margen de contribución** | **$182.931** |
| Margen / ingreso neto | 62,2 % |

###### **Tabla 2.2 “Economía Unitaria del Primer Año”**

El resultado es un margen de contribución de $182.931 por unidad, equivalente al 62,2 % del ingreso neto, cifra que conviene leer con precisión: **no es utilidad**. Es el aporte de cada equipo vendido a cubrir los gastos fijos.

### Estrategia de Precios y Posicionamiento Competitivo

El precio de venta al público se ha fijado en $349.990 CLP con IVA ($294.109 neto, equivalente aproximadamente a US$365 al tipo de cambio de referencia [16]). Esta cifra no se calcula mediante un margen de adición estándar sobre el costo, sino que actúa como un techo estratégico declarado: es el máximo que el proyecto se permite cobrar sin dejar de sostener la comparación de capacidad por peso invertido. Conviene precisar esta comparación para que sea consistente: TerraSense se ubica en el mismo orden de magnitud de precio que un medidor básico de importación (US$294 a US$365 según el equipo), pero no compite por tener la etiqueta más barata, sino por entregar más capacidad y un menor costo total de uso. Mientras el Hanna HI9814 mide 4 variables en soluciones hidropónicas sin interpretación, TerraSense mide 7 variables de suelo más 3 ambientales y entrega una recomendación agronómica accionable en segundos, en un instrumento pensado para usarse durante años sin suscripción.

La consecuencia metodológica de este enfoque es fundamental: al estar el precio predefinido, la variable que el modelo debe resolver no es cuánto cobrar, sino cuántas unidades se deben vender para cubrir la estructura de costos completa. El precio se evalúa entonces por el margen que deja para sostener gastos fijos, soporte y capital de trabajo. El análisis de sensibilidad que se presenta más adelante demuestra por qué este techo no admite rebajas: a $299.990 el proyecto pasa a pérdida operacional en el primer año.

### Costo Total de Propiedad para el Agricultor (TCO)

La pregunta que un agricultor se hace antes de comprar no es cuánto cuesta el instrumento en la vitrina, sino cuánto le cuesta hoy resolver el mismo problema y cuánto le costaría resolverlo con TerraSense en el tiempo. El TCO (*Total Cost of Ownership*, costo total de propiedad) responde exactamente eso.

La comparación depende críticamente de una variable que no puede darse por supuesta: **con qué frecuencia el agricultor recurre hoy al laboratorio o a la asesoría**. Presentar una sola frecuencia sería construir el argumento sobre un supuesto cómodo, de modo que el cuadro se desarrolla sobre dos intensidades de uso declaradas:

- **Uso habitual (caso base).** Cuatro muestras de laboratorio al año y dos visitas de asesoría al año. Es la intensidad que corresponde razonablemente a un productor de 0,5 a 20 hectáreas con orientación comercial, y es la que este informe adopta como caso base.
- **Uso intensivo (techo).** Veinte muestras de laboratorio al año, distribuidas en distintos puntos del campo, y doce visitas de asesoría, una mensual. Corresponde a un productor que ya opera con seguimiento técnico continuo y marca el límite superior del beneficio posible.

El corte a diez años usa el mismo horizonte con que se evalúa el proyecto, de modo que la economía del cliente y la economía de la empresa se leen sobre el mismo período.

| Alternativa | Intensidad | Año 1 | Acumulado a 3 años | Acumulado a 5 años | Acumulado a 10 años |
| --- | :---: | ---: | ---: | ---: | ---: |
| **TerraSense** (compra del equipo, kit de batería al año 3 y al año 8, segundo equipo al año 6, todo a precio de lista) | Mediciones ilimitadas | $349.990 | $374.980 | $374.980 | $749.960 |
| Análisis de laboratorio (S1) | Uso habitual: 4 muestras/año | $200.000 | $600.000 | $1.000.000 | $2.000.000 |
| Análisis de laboratorio (S1) | Uso intensivo: 20 muestras/año | $1.000.000 | $3.000.000 | $5.000.000 | $10.000.000 |
| Asesoría agronómica externa (S2) | Uso habitual: 2 visitas/año | $120.000 | $360.000 | $600.000 | $1.200.000 |
| Asesoría agronómica externa (S2) | Uso intensivo: 12 visitas/año | $720.000 | $2.160.000 | $3.600.000 | $7.200.000 |

###### **Tabla 2.3 “Costo Total de Propiedad del Agricultor a 1, 3, 5 y 10 Años”**

**Qué entrega cada alternativa.** TerraSense aporta 7 variables de suelo y 3 ambientales, interpretación agronómica en segundos, mediciones ilimitadas sin costo marginal y sin suscripción. El análisis de laboratorio aporta determinación química de referencia, con resultado en 15 a 30 días, sin lectura in situ ni recomendación de manejo. La asesoría agronómica aporta interpretación profesional periódica, sin instrumento propio ni dato in situ entre visitas.

**Bases de cálculo.** Las alternativas se expresan en pesos constantes de la fecha del presupuesto, sin inflación ni descuento, para que la comparación no dependa de una proyección de precios. Todas las partidas de la fila de TerraSense son desembolsos del agricultor a precio de lista: el proyecto no bonifica repuestos ni entrega equipos de reposición, y ninguna de estas cifras constituye un costo absorbido por la empresa. El reemplazo de batería se valoriza al precio de venta del kit oficial de recambio, $24.990 con IVA, que cubre la celda, el envío, la mano de obra del servicio y su margen comercial; se presupuesta dos veces en diez años (años 3 y 8). La vida útil del instrumento se fija en cinco años, de modo que el corte a diez años incorpora la compra íntegra de un segundo equipo a precio vigente en el año 6: no se supone descuento de renovación, plan de recambio ni reposición bonificada. El criterio es a la vez conservador para esta comparación y consistente con el modelo de negocio, porque esa segunda compra es una venta más y no una concesión. Los $50.000 por muestra de laboratorio y los $60.000 por visita de asesoría son supuestos de mercado declarados, identificados como S1 y S2 en la Tabla 5.3 y no como referencias bibliográficas. Se considera además que el agricultor ya dispone de teléfono inteligente, condición que el 88,5 % de penetración rural respalda.

De forma general:

`TCO(n) = compra + repuestos + mantenimiento y calibración + energía + conectividad incremental + transporte y servicio`

Quedan fuera de las cifras anteriores el mantenimiento correctivo, la calibración periódica, los fallos fuera de garantía y el transporte a servicio técnico, partidas que no se consideran gratuitas y que deben presupuestarse cuando exista base instalada suficiente para estimar su frecuencia real.

**Lectura del resultado.** Bajo la intensidad de uso habitual, que es el caso base, el instrumento **no se paga el primer año**: $349.990 de compra frente a $200.000 de laboratorio o $120.000 de asesoría. El cruce ocurre durante el segundo año frente al laboratorio y durante el tercero frente a la asesoría; desde ahí la distancia se abre de forma sostenida, hasta $2.000.000 contra $749.960 a diez años (2,7 veces) frente al laboratorio y $1.200.000 contra $749.960 (1,6 veces) frente a la asesoría. Bajo la intensidad de uso intensivo, la diferencia a diez años llega a $10.000.000 y $7.200.000 respectivamente, más de trece y casi diez veces el desembolso del instrumento.

Declarar el caso base en la intensidad menor es deliberado, porque es el que resiste la pregunta del evaluador y porque muestra dónde está realmente el argumento. **El valor del instrumento no está en el ahorro nominal, sino en el costo marginal cero de la medición repetida.** Un agricultor que tome cien mediciones al año —una intensidad modesta para un equipo propio— acumula mil mediciones en diez años, de modo que cada una le cuesta $750 frente a los $50.000 de una muestra de laboratorio. Esa relación no depende de ningún supuesto de frecuencia: es estructural, porque el instrumento se paga una vez y cada lectura adicional no cuesta nada, mientras laboratorio y asesoría cobran por evento y se repiten cada temporada. Ninguna rebaja de precio del laboratorio cambia ese hecho, porque el laboratorio no puede entregar una lectura en el punto exacto y en el instante en que el agricultor debe decidir.

Esta comparación no invalida al laboratorio ni a la asesoría: los tres caminos tienen alcances distintos y complementarios, y no se presupone que comprar el instrumento elimine los análisis de referencia necesarios para determinaciones químicas de fertilización. Lo que muestra el ejercicio es que, para el seguimiento rutinario entre temporadas, el costo por medición favorece de manera decisiva al instrumento propio. El ahorro efectivo de cada cliente se calcula sobre el gasto realmente evitable en su caso, preservando las asesorías y análisis que siga necesitando; los efectos sobre agua, fertilizante y rendimiento se cuantifican con los pilotos comparativos descritos en el protocolo de validación.

### Capacidad Productiva, Gastos Fijos y Punto de Equilibrio

La estructura de personal relaciona ventas con trabajo real, y no con una dotación fijada arbitrariamente. Se consideran 2,25 horas por equipo para ensamblaje y prueba final, 500 horas anuales combinadas aportadas por los socios a producción y 1.400 horas productivas anuales por cada equivalente de jornada completa contratado. Las funciones comercial y de soporte utilizan dos horas por venta más media hora anual por equipo activo, con 900 horas combinadas de los socios. La contratación aumenta en escalones de 0,5 FTE.

Conviene precisar que FTE (*Full-Time Equivalent*, equivalente de jornada completa) representa capacidad de trabajo equivalente y no medio contrato ni media persona: 0,5 FTE son 700 horas productivas al año, que pueden resolverse con una jornada parcial, un contrato por temporada o el reparto de la función entre dos personas. Las 2,25 horas por equipo incluyen el montaje completo con el BME280, la intervención sobre la placa de desarrollo descrita junto a la BOM, la calibración de fábrica descrita en el plan de calibración y el control de ubicación, comunicación y respuesta térmica del sensor ambiental, que debe formar parte del procedimiento de calidad.

Para garantizar el realismo de la evaluación, los gastos fijos consideran una formalización inmediata de la empresa. Los socios perciben remuneración bruta por su trabajo desde el mes 1, con escalones base de $600.000, $700.000, $850.000, $1.000.000 y $1.200.000 mensuales por persona, más el reajuste anual del 3 % que se aplica desde el año 6 en adelante; el 35 % adicional corresponde a las cargas del empleador y no es sueldo líquido. Se incorpora contabilidad externa desde el primer mes, junto con taller, administración y seguros. Evaluar este proyecto asignando un “costo cero” al trabajo de los socios sería un autoengaño: la nómina pasa de $19.440.000 en 2027 a $110.970.959 en 2036 y es, en los diez años, la mayor partida de gasto de la empresa.

| Concepto | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Nómina y cargas | $19.440.000 | $28.783.350 | $41.247.792 | $60.187.403 | $82.049.592 | $91.553.670 | $94.300.280 | $104.600.772 | $107.738.795 | $110.970.959 |
| Contabilidad | $1.440.000 | $1.606.800 | $1.782.312 | $2.098.036 | $2.431.099 | $2.643.145 | $2.722.439 | $2.951.697 | $3.040.248 | $3.131.456 |
| Servicios digitales | $1.920.000 | $2.317.500 | $2.928.084 | $3.769.908 | $4.895.963 | $5.976.290 | $6.964.429 | $7.852.991 | $8.633.545 | $9.219.788 |
| Gestión de agencia de marketing | $0 | $0 | $0 | $3.278.181 | $3.376.526 | $3.477.822 | $3.582.157 | $3.689.622 | $3.800.310 | $3.914.320 |
| Taller, administración y seguros | $3.360.000 | $3.460.800 | $3.564.624 | $3.671.563 | $3.781.710 | $3.895.161 | $4.012.016 | $4.132.376 | $4.256.347 | $4.384.038 |
| Pauta comercial | $6.000.000 | $10.815.000 | $15.913.500 | $21.308.176 | $28.700.475 | $31.022.174 | $33.564.810 | $36.305.877 | $39.257.205 | $42.470.367 |
| **Total gastos fijos** | **$32.160.000** | **$46.983.450** | **$65.436.312** | **$94.313.267** | **$125.235.365** | **$138.568.262** | **$145.146.131** | **$159.533.334** | **$166.726.451** | **$174.090.928** |

###### **Tabla 2.4 “Estructura de Gastos Fijos”**

El presupuesto operativo del primer año asciende a $32.160.000 y se reconstruye partida por partida: nómina de los socios, $19.440.000; contabilidad externa, $1.440.000; servicios digitales, $1.920.000; taller, administración y seguros, $3.360.000; y pauta comercial para 200 ventas, $6.000.000.

Los servicios digitales merecen su propio desglose, porque son la infraestructura que sostiene la parte online del sistema y suelen presentarse como una cifra opaca. Los $150.000 mensuales fijos cubren el plan de base de datos y autenticación, el alojamiento y el ancho de banda de la consola web, el dominio y los certificados, el correo transaccional de altas y recuperación de contraseña, las cuentas de desarrollador de las dos tiendas de aplicaciones prorrateadas y las herramientas de seguimiento de errores. A eso se suman $1.200 anuales por equipo activo, que es la parte que escala: almacenamiento del histórico de mediciones de ese equipo, tráfico de sincronización y respaldo.

La cifra del primer año se obtiene entonces así: $150.000 × 12 = $1.800.000 fijos, más **una base instalada promedio de 100 equipos** durante el año a $1.200 cada uno, es decir $120.000, lo que totaliza $1.920.000. La base promedio es de 100 equipos y no de 200 porque las 200 unidades se venden repartidas a lo largo del año y no el 1 de enero: un equipo vendido en noviembre consume servicios durante dos meses, no durante doce. El modelo aplica esa misma regla de base instalada media —los equipos activos de los cinco años anteriores más la mitad de los vendidos en el año en curso— para todos los ejercicios, y de ahí salen también las cifras de 2028 en adelante.

Un equipo que toma diez mediciones diarias durante toda su vida útil genera un volumen de datos reducido: cada medición son diez valores numéricos, una coordenada y una marca de tiempo. Ese costo por unidad refleja esa realidad y no una tarifa de plataforma de video. La API de pronóstico meteorológico tiene costo directo de $0 por tratarse de un servicio gratuito dentro de los límites de consulta que el proyecto necesita; si se supera ese límite o el proveedor cambiara sus condiciones, el costo se incorporaría a esta misma línea. El 35 % aplicado sobre la remuneración bruta corresponde a la provisión de cargas del empleador (cotización de salud y seguridad laboral, seguro de cesantía, mutual, feriado proporcional y provisión de indemnización).

**Contrataciones externas.** Dos partidas del cuadro no son sueldos sino contratos de servicio con terceros, y conviene detallar el alcance de cada una porque de ahí sale su precio.

*Contabilidad externa, $120.000 mensuales el primer año.* No es un contador en planilla sino un contrato de servicios contables con un estudio externo, facturado mensualmente, cuyo alcance comprende: llevar la contabilidad completa de la sociedad bajo el régimen Pro Pyme; confeccionar y declarar el Formulario 29 mensual de IVA; calcular y declarar los pagos provisionales mensuales; preparar la declaración anual de renta de abril; procesar las remuneraciones y liquidaciones de sueldo del personal con sus declaraciones previsionales; y emitir los estados financieros anuales que el banco exige mientras el crédito esté vigente. Contratar estas funciones afuera cuesta $1.440.000 al año; un contador en jornada completa costaría sobre $10 millones anuales con cargas, más de siete veces esa cifra, por un volumen de documentos que una empresa de 200 a 1.085 facturas anuales no justifica. El honorario sube $20.000 mensuales por cada trabajador adicional en nómina, porque el procesamiento de remuneraciones es la parte del servicio que escala con la dotación: por eso pasa de $1.440.000 en 2027 a $3.131.456 en 2036.

*Agencia de marketing, $250.000 mensuales desde el año 4.* Tampoco es una contratación sino un contrato de retainer mensual con una agencia externa, que se activa recién cuando el plan alcanza 650 ventas anuales, es decir cuando el volumen de campaña deja de ser manejable por los socios. Su alcance es la gestión profesional de la pauta digital (segmentación, creatividades y optimización de campañas por región y cultivo), la producción de material de demostración para terreno y el manejo de las redes del proyecto. La distinción con la pauta es importante y a menudo se confunde: la pauta ($6.000.000 el primer año, $42.470.367 el décimo) es el dinero que se paga a las plataformas para mostrar los anuncios; la agencia ($3.278.181 en 2030) es el honorario de quien diseña y administra esos anuncios. Durante los tres primeros años la agencia no existe como gasto porque esa gestión la ejecutan los socios; a partir de 650 unidades anuales, el costo de que la sigan haciendo ellos, medido en horas comerciales que dejan de dedicar a la venta directa, supera el honorario de la agencia.

Una precisión de denominación: el cuadro agrupa el bloque como “gastos fijos”, pero los servicios digitales, la pauta comercial y el honorario contable escalan con el volumen de operación, de modo que no todos son costos estrictamente fijos en el sentido contable del término. Se presentan juntos porque todos son costos de estructura, es decir costos que no desaparecen si se deja de vender una unidad en particular.

**Escalabilidad de la estructura a diez años.** La lectura horizontal del cuadro muestra el comportamiento que sostiene el resultado de la segunda mitad del estudio. La medida correcta de escalabilidad no es el crecimiento absoluto de los gastos —que se multiplican por 5,4, de $32.160.000 a $174.090.928, casi lo mismo que las 5,4 veces que crecen las unidades— sino su peso sobre la venta: los gastos fijos representan el 54,7 % de la venta neta en 2027 y el 41,8 % en 2036, y en el mismo período el margen EBITDA sube del 7,5 % al 20,4 %. Esa caída de trece puntos es lo que el negocio gana por operar a mayor escala, y tiene tres causas identificables.

La primera es la nómina: la dotación de producción se estabiliza en 1,5 FTE desde 2031 pese a que el volumen sigue creciendo un 5 % anual, porque el tiempo de montaje por equipo baja con la curva de aprendizaje del taller y con el instrumental que aporta la reinversión trienal de activos. La segunda es la administración: taller, seguros y arriendo crecen solo con la inflación del 3 %, sin relación alguna con el volumen, y pasan de representar el 10,4 % de los gastos fijos en 2027 a apenas el 2,5 % en 2036. La tercera opera en sentido contrario y conviene declararla sin adornos: la pauta comercial se mantiene fija en $30.000 reales por equipo vendido durante los diez años, de modo que es la única partida que crece exactamente a la velocidad de las ventas, y pasa de concentrar el 18,7 % de los gastos fijos en 2027 al 24,4 % en 2036. El proyecto, en otras palabras, escala en producción y en administración pero no en adquisición de clientes: cada venta adicional sigue costando lo mismo en pauta. Esa es la limitación estructural que fija el techo del plan a diez años y la primera variable a atacar si la empresa quisiera crecer más allá de ese horizonte, sea bajando el costo de adquisición por la vía del canal de asesores y la recomendación, sea incorporando distribución mayorista con un margen distinto del de la venta directa.

| Año | Equilibrio operativo | Equilibrio con deuda | Ventas planificadas |
| :---: | :---: | :---: | :---: |
| 2027 | 176 | 204 | 200 |
| 2028 | 250 | 276 | 350 |
| 2029 | 337 | 363 | 500 |
| 2030 | 472 | 497 | 650 |
| 2031 | 608 | 633 | 850 |
| 2032 | 653 | 677 | 892 |
| 2033 | 665 | 688 | 937 |
| 2034 | 709 | 731 | 984 |
| 2035 | 719 | 741 | 1.033 |
| 2036 | 729 | 750 | 1.085 |

###### **Tabla 2.5 “Punto de Equilibrio Operativo y con Deuda”**

En el primer año, los $32.160.000 de gastos fijos se cubren con 176 unidades al margen calculado, de modo que la meta de 200 unidades deja un margen de seguridad del 12 % sobre el equilibrio operativo. Al añadir el capital e intereses del crédito ($5.038.098 anuales), el umbral sube a 204 unidades: la meta del Año 1 cubre la operación, pero queda cuatro unidades por debajo del equilibrio con deuda. Esta diferencia no es un defecto oculto del modelo sino su hallazgo más útil, porque explica exactamente por qué el proyecto necesita liquidez inicial durante el arranque y por qué una venta no equivale a caja libre inmediatamente distribuible. Desde 2028 la distancia se invierte con holgura: 350 ventas contra un equilibrio con deuda de 276 unidades.

El equilibrio operativo se calcula como gastos fijos divididos por el margen unitario, redondeado hacia arriba; el equilibrio con deuda añade capital e intereses al numerador.

### Inversión Inicial y Estructura de Financiamiento

La puesta en marcha se estructura sobre fuentes de financiamiento por $39.000.000 CLP. Ningún banco entrega dinero contra un proyecto sin respaldo: exige que los dueños pongan capital propio antes de desembolsar el suyo. Ese capital propio es el pie, y en este proyecto asciende a $9.000.000, equivalentes al 30 % del crédito solicitado. Es, literalmente, la porción de la deuda que los socios cubren de su bolsillo para que el banco entregue los $30.000.000 restantes.

| Origen de fondos | CLP | Participación sobre el total | Relación con el crédito |
| --- | ---: | :---: | :---: |
| Pie propio de los socios | $9.000.000 ($4.500.000 cada socio, 50 % y 50 %) | 23,1 % | 30 % del crédito |
| Crédito bancario | $30.000.000 | 76,9 % | 100 % del crédito |
| **Total fuentes de financiamiento** | **$39.000.000** | **100 %** | — |

###### **Tabla 2.6 “Fuentes de Financiamiento”**

Los $9.000.000 se enteran en partes iguales: $4.500.000 cada socio, es decir un 50 % y un 50 % del pie, proporción que fija además la participación de cada uno en la sociedad. Ese aporte cumple tres funciones simultáneas frente al banco, y conviene separarlas porque suelen confundirse:

- **Es la condición de entrada.** El banco presta $30.000.000 solo si los dueños comprometen antes capital propio. Los $9.000.000 son ese compromiso previo y equivalen al 30 % del monto prestado: por cada tres pesos que pone el banco, los socios ponen uno.
- **Es capital propio, no deuda.** El pie se registra una sola vez como aporte de los socios a la sociedad. No se descuenta del principal del crédito (el banco desembolsa los $30.000.000 completos), no se devuelve al banco y no genera intereses. Lo que los socios recuperan de él, si el negocio funciona, es utilidad, no una cuota.
- **Es un respaldo patrimonial.** Al quedar invertido en activos, desarrollo y caja de la empresa, el pie es lo que el banco mira para verificar que los dueños asumen riesgo propio antes de pedirle riesgo a él.

La estructura final es entonces $9.000.000 de pie más $30.000.000 de crédito, igual a $39.000.000 de fuentes: el pie financia el 23,1 % del total y el crédito el 76,9 % restante.

### Condiciones del Crédito

El préstamo se toma como crédito empresarial, con la sociedad como deudora y ambos socios como avales solidarios. Las condiciones con que se evalúa todo este estudio son las siguientes, y se aplican sin excepción en cada tabla de las páginas que siguen:

| Condición del crédito | Valor |
| --- | --- |
| Monto solicitado (principal) | $30.000.000 |
| Pie propio entregado | $9.000.000, es decir el 30 % del principal |
| Tasa de interés | 12 % efectivo anual, equivalente a 0,9489 % mensual compuesto: (1 + 0,12)^(1/12) − 1 |
| Plazo | 10 años, 120 cuotas mensuales iguales |
| Cuota mensual | $419.842 nominales, fija durante todo el plazo |
| Intereses totales del crédito | $20.380.983 |
| Total pagado al banco (capital más intereses) | $50.380.983 |
| Gastos de apertura | 2 % del principal: $600.000, pagados al desembolso |
| Sistema de amortización | Francés: cuota constante, interés decreciente y capital creciente |
| Prepagos | No se contemplan; el crédito se cancela en el mes 120 (diciembre de 2036) |

###### **Tabla 2.7 “Condiciones del Crédito Bancario”**

El 12 % efectivo anual se ubica dentro del rango que la banca chilena ofrece a pequeña empresa con aval de los socios y pie constituido. El mecanismo de la cuota es directo: el interés del primer mes asciende a $284.664 (0,9489 % sobre los $30.000.000 de saldo) y la amortización de capital a $135.178, de modo que el saldo baja a $29.864.822 para el mes siguiente; esa proporción se invierte progresivamente hasta que la última cuota es capital casi puro. Durante el primer año, el servicio de deuda suma $5.038.098, compuesto por $3.328.573 de intereses y $1.709.525 de amortización.

Un punto que la tabla deja explícito y que no conviene perder de vista: los $20.380.983 de intereses son el precio del financiamiento. Sumados al principal, la empresa devuelve $50.380.983 por los $30.000.000 recibidos. Ese costo ya está descontado en la caja, en el FCFE (*Free Cash Flow to Equity*, flujo de caja del accionista) y en el DSCR (*Debt Service Coverage Ratio*, razón de cobertura del servicio de la deuda) de todas las proyecciones de este informe.

Sobre el plazo, la banca comercial publica plazos de 12 a 120 meses para pequeña empresa, mientras que los simuladores de crédito de consumo ofrecen tramos de 6 a 60 meses. Los 120 meses que usa este estudio corresponden por tanto al tramo empresarial, coinciden exactamente con el horizonte de evaluación de diez años y permiten juzgar el proyecto sobre el mismo período en que paga su deuda: cuando termina la evaluación, el crédito está saldado y la empresa queda sin pasivo bancario.

| Destino de fondos | CLP | Participación |
| --- | ---: | :---: |
| Activos, desarrollo y formalización, con IVA presupuestado | $10.353.000 | 26,5 % |
| Inventario inicial, IVA incluido | $964.378 | 2,5 % |
| Gastos de apertura del crédito (2 % de $30.000.000) | $600.000 | 1,5 % |
| Caja inicial, con reserva incluida | $27.082.622 | 69,4 % |
| **Total destinos** | **$39.000.000** | **100 %** |

###### **Tabla 2.8 “Destino de Fondos”**

El rubro “Activos, desarrollo y formalización” agrupa conceptos de naturaleza distinta que conviene abrir, porque incluye tanto costos de desarrollo de hardware y software como obligaciones regulatorias que quedan pendientes de ejecución antes del lanzamiento comercial (verificación de equipos de telecomunicaciones ante la autoridad sectorial [17] y ensayo de grado de protección IP67):

| Rubro | Neto CLP | IVA presupuestado | Total CLP |
| --- | ---: | ---: | ---: |
| Activos y herramientas de taller (soldadura, instrumental de prueba, banco de trabajo) | $3.500.000 | $665.000 | $4.165.000 |
| Desarrollo y validación (rondas de prototipado, firmware, App y Web, metrología y ensayos normativos) | $4.500.000 | $855.000 | $5.355.000 |
| Formalización (constitución de sociedad, trámites legales, marca y licencias) | $700.000 | $133.000 | $833.000 |
| **Total** | **$8.700.000** | **$1.653.000** | **$10.353.000** |

###### **Tabla 2.9 “Desglose de Activos, Desarrollo y Formalización”**

Los tres rubros son presupuestos del estudio. El IVA se mantiene presupuestado por prudencia, sin descontarlo como crédito fiscal anticipado: su recuperación efectiva depende de la factura y del servicio contratado. La impresión de la carcasa es un servicio externo pagado por unidad y ya contabilizado en la BOM: el proyecto no compra impresora 3D. Tampoco se agrega aquí capital de trabajo, porque ya está contado en la caja inicial de la tabla previa; sumarlo de nuevo duplicaría fondos.

El rubro de desarrollo y validación es el que más suele presentarse como una cifra global sin contenido, de modo que aquí se abre partida por partida. Los $4.500.000 netos se distribuyen así:

| Partida de desarrollo y validación | Alcance concreto | Neto CLP |
| --- | --- | ---: |
| Prototipado electrónico | Tres rondas de PCB portadora (fabricación, componentes y montaje de unidades piloto), incluidas las iteraciones por corrección de diseño | $1.100.000 |
| Prototipado mecánico | Iteraciones de carcasa PETG, moldes de junta, prensaestopas y ajustes de estanqueidad hasta congelar la geometría | $450.000 |
| Firmware del ESP32 | Desarrollo del maestro Modbus RTU, la lectura I²C del BME280, la gestión de energía, la trama BLE de 20 bytes y la actualización remota | $900.000 |
| Aplicación móvil y consola web | Motor agronómico determinista, almacenamiento local, captura BLE, sincronización diferida y consola de flota | $800.000 |
| Metrología y campaña de validación | 30 muestras pareadas enviadas a laboratorio acreditado según el protocolo de validación, más instrumental de referencia, soluciones patrón y traslados | $600.000 |
| Ensayo IP67 en laboratorio acreditado | Ensayo del conjunto ensamblado conforme a IEC 60529: polvo e inmersión a 1 m durante 30 min | $350.000 |
| Verificación ante la autoridad de telecomunicaciones | Expediente y trámite formal de verificación del equipo antes de la comercialización | $300.000 |
| **Total desarrollo y validación** | | **$4.500.000** |

###### **Tabla 3.0 “Desglose del Rubro de Desarrollo y Validación”**

Con este desglose, la certificación deja de ser una obligación regulatoria sin costo asignado: el ensayo IP67 y la verificación sectorial de telecomunicaciones tienen $650.000 reservados entre ambos y se ejecutan antes del lanzamiento comercial, no después. Hasta que esos ensayos se completen se mantiene la condición de “diseñado conforme a IP67” declarada en la sección de protección al consumidor, y no se declara certificación alguna. Las siete partidas son presupuestos de ingeniería construidos sobre precios de mercado de los servicios correspondientes; cuando lleguen las ofertas fechadas de los laboratorios y de los proveedores de PCB, cada línea se reemplaza por su cotización. Si el total superara los $4.500.000, la diferencia se absorbe recalculando el destino de fondos sin alterar el pie propio de $9.000.000 ni el crédito de $30.000.000: la caja inicial de $27.082.622 tiene holgura suficiente para absorber una desviación de esa magnitud, y así se evita que un mayor costo de certificación se traduzca automáticamente en más deuda.

El desembolso de apertura es de $11.317.378. Los $39.000.000 son fuentes de financiamiento y no deben denominarse inversión económica consumida: cerca del 70 % permanece en caja para sostener los primeros meses. Para el VAN (Valor Actual Neto) y la TIR (Tasa Interna de Retorno), el capital comprometido en el mes 0 es $20.489.116, compuesto por el desembolso y la caja mínima operativa, que se mide con independencia de la deuda.

| Plazo, años | Cuotas | Cuota mensual | Intereses totales | Total pagado al banco | Saldo pendiente al año 5 | Caja mínima de los primeros 24 meses |
| :---: | :---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 60 | $658.071 | $9.484.253 | $39.484.253 | $0 | $8.995.388 |
| **10 (adoptado)** | **120** | **$419.842** | **$20.380.983** | **$50.380.983** | **$19.139.649** | **$13.521.745** |
| 15 | 180 | $348.296 | $32.693.316 | $62.693.316 | $24.887.691 | $14.881.107 |

###### **Tabla 3.1 “Alternativas de Plazo del Crédito”**

Las tres alternativas comparan el mismo principal de $30.000.000 y la misma tasa de 12 % efectivo anual; lo único que cambia es el plazo. La lectura es una disyuntiva clásica entre costo financiero y liquidez: cinco años es el plazo más barato ($9.484.253 de intereses, menos de la mitad que a diez), pero su cuota de $658.071 deja la caja del arranque en $8.995.388, por debajo del colchón que el proyecto necesita mientras las ventas todavía son 200 unidades al año. Quince años alivia la cuota a $348.296, pero eleva los intereses a $32.693.316, es decir $12,3 millones adicionales sobre el plazo adoptado, y mantiene deuda viva cinco años después de terminado el estudio.

El monto de $30.000.000 responde a un factor logístico y financiero concreto: el proyecto necesita liquidez para sostener el desfase entre compras, gastos y cobros durante el arranque, cuando ya paga sueldos, pauta y cuota pero todavía vende 200 equipos al año. Sobre esa caja, la empresa mantiene una reserva objetivo equivalente a tres meses de gastos fijos y tres cuotas del crédito, más un 10 % del desembolso inicial. Esa reserva está dentro de la caja: no es un gasto adicional ni se suma dos veces al total. La política de inventario cubre dos meses de ventas, plazo que se ajusta según el tiempo de entrega efectivo del proveedor de sondas.

Con el crédito fijado en $30.000.000 a diez años, la caja nunca baja de $13.521.745 durante los primeros 24 meses y jamás se aproxima a cero. La reserva objetivo, en cambio, sí se estrecha: en su punto más bajo, el mes 19, la caja queda $615.379 por debajo del colchón que la política fija, un 5,6 % de ese objetivo. Esa diferencia se informa expresamente en lugar de disimularse subiendo el préstamo, porque no es una falta de solvencia (la caja disponible en ese mes supera los trece millones) sino una holgura de política momentáneamente incompleta, que se corrige con cualquiera de tres medidas de gestión ordinarias: postergar un mes la reinversión de activos, moderar la pauta del segundo semestre del año 2 o vender seis equipos adicionales en el período.

El plazo de cinco años sería preferible por costo financiero total, pero su cuota de $658.071 deja la caja de arranque en $8.995.388 y la reserva $5.856.425 bajo el objetivo, un déficit casi diez veces mayor. Quince años alivia todavía más la cuota, pero suma $12,3 millones de intereses y prolonga la exposición. Diez años es el punto de equilibrio entre costo e iliquidez, y tiene una virtud adicional para este informe: coincide exactamente con el horizonte de evaluación. Al quinto año quedan $19.139.649 de saldo pendiente, de modo que el crédito no desaparece a mitad de camino; el estudio a diez años sí lo cubre íntegro, con cancelación contractual en el mes 120 (diciembre de 2036), sin prepagos ni reparto automático de dividendos.

### Inventario, Impuestos y Construcción del Flujo de Caja

Las ventas se cobran en el mes de entrega. Las compras cubren las ventas del mes y de los dos siguientes, redondeadas a lotes de diez unidades, y el inventario inicial cubre los dos primeros meses. El modelo concilia unidades y valor mediante promedio ponderado. La consecuencia es que la compra consume caja antes de que todo el lote se venda, mientras el costo de venta solo reconoce las unidades entregadas: esta diferencia es la razón por la cual EBITDA y caja no coinciden, y por la cual una utilidad contable no puede presentarse como efectivo disponible.

El IVA se trata separado del ingreso neto. El stock comprado en el mes 0 genera crédito disponible desde el mes 1, excluyendo la placa combinada cuyo costo se toma sin recuperación fiscal por no disponer aún de factura; el IVA inicial recuperable no se deduce además como gasto de renta. Se mantiene una aproximación tributaria de caja con pérdidas arrastradas y reserva anual, utilizando las tasas de referencia del régimen Pro Pyme [18]: 12,5 % para 2027, 15 % para 2028 y 25 % desde 2029, sujetas al régimen y condiciones vigentes. El calendario del estudio no reproduce el formulario F29, los pagos provisionales mensuales ni la declaración de abril; esa limitación metodológica se declara en lugar de disimularse.

### Proyección de Resultados y Evaluación Financiera

| Año | Venta neta | EBITDA | FCFF antes de caja mínima | FCFE | Servicio de deuda | Caja final | DSCR |
| :---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| 2027 | $58.821.849 | $4.426.234 | $3.614.395 | −$1.423.703 | $5.038.098 | $25.658.919 | 0,72 |
| 2028 | $106.026.382 | $19.015.320 | $16.382.140 | $12.311.843 | $5.038.098 | $37.970.762 | 3,44 |
| 2029 | $156.010.248 | $31.680.620 | $23.048.763 | $18.734.083 | $5.038.098 | $56.704.844 | 4,72 |
| 2030 | $208.897.722 | $35.729.124 | $24.648.429 | $20.269.416 | $5.038.098 | $76.974.260 | 5,02 |
| 2031 | $281.369.163 | $49.915.370 | $37.321.742 | $32.870.675 | $5.038.098 | $109.844.935 | 7,52 |
| 2032 | $304.130.273 | $50.743.843 | $38.257.646 | $33.725.881 | $5.038.098 | $143.570.816 | 7,69 |
| 2033 | $329.057.363 | $59.668.629 | $42.895.616 | $38.273.467 | $5.038.098 | $181.844.284 | 8,60 |
| 2034 | $355.929.796 | $62.009.246 | $45.930.101 | $41.206.724 | $5.038.098 | $223.051.008 | 9,18 |
| 2035 | $384.863.561 | $72.836.612 | $53.749.520 | $48.912.766 | $5.038.098 | $271.963.774 | 10,71 |
| 2036 | $416.364.252 | $85.094.046 | $62.777.691 | $57.813.955 | $5.038.098 | $329.777.729 | 12,48 |

###### **Tabla 3.2 “Proyección Anual de Resultados”**

| Período | Flujo económico para evaluación | Acumulado sin descuento |
| :---: | ---: | ---: |
| Mes 0 | −$20.489.116 | −$20.489.116 |
| 2027 | $3.614.395 | −$16.874.721 |
| 2028 | $12.676.278 | −$4.198.443 |
| 2029 | $18.435.548 | $14.237.105 |
| 2030 | $17.429.191 | $31.666.296 |
| 2031 | $29.591.217 | $61.257.513 |
| 2032 | $34.924.422 | $96.181.935 |
| 2033 | $41.251.149 | $137.433.084 |
| 2034 | $42.333.301 | $179.766.384 |
| 2035 | $51.951.241 | $231.717.625 |
| 2036 | $60.936.572 | $292.654.197 |

###### **Tabla 3.3 “Flujo Económico”**

Antes de leer la tabla conviene fijar las nomenclaturas, porque son cuatro y significan cosas distintas. El EBITDA (*Earnings Before Interest, Taxes, Depreciation and Amortization*, utilidad antes de intereses, impuestos, depreciación y amortización) mide lo que la operación genera por sí sola, sin considerar cómo está financiada. El FCFF (*Free Cash Flow to Firm*, flujo de caja libre de la empresa) es la caja que queda tras pagar costos, impuestos e inversión, pero antes de pagarle al banco: es el flujo con el que se calculan el VAN y la TIR del proyecto. El FCFE (*Free Cash Flow to Equity*, flujo de caja libre del accionista) es lo que queda después de pagar la cuota del crédito, es decir la caja que efectivamente pertenece a los socios. El DSCR (*Debt Service Coverage Ratio*, razón de cobertura del servicio de la deuda) divide la caja disponible para pagar deuda entre la cuota anual: un DSCR de 1,0 significa que la operación alcanza justo para pagar el crédito, bajo 1,0 que no alcanza y hay que recurrir a caja acumulada, y sobre 1,0 que sobra.

Con esas definiciones, el primer ejercicio merece lectura detenida, porque es donde el proyecto muestra a la vez su solidez y su punto de tensión. El EBITDA de 2027 es positivo ($4.426.234), pero se convierte en un FCFE de −$1.423.703 después de compras de inventario, IVA, impuestos y los $5.038.098 de servicio de deuda. La caja final permanece holgadamente positiva ($25.658.919) porque parte de la caja inicial constituida con el pie y el crédito. El DSCR de 0,72 dice exactamente esto: la generación del primer año cubre el 72 % de la cuota anual y el 28 % restante sale de la caja de arranque. Es el año en que el proyecto consume el colchón que se financió para eso. Desde 2028 la cobertura salta a 3,44, es decir tres veces y media la cuota, y sigue subiendo hasta 12,48 en 2036, cuando la última cuota del crédito se paga con menos de un doceavo de la caja generada en el año.

### Metodología de VAN, TIR y Payback

Tres indicadores resumen la evaluación y conviene nombrarlos completos antes de usarlos. El VAN (Valor Actual Neto) traslada todos los flujos futuros al día de hoy usando una tasa de descuento y resta la inversión inicial: si el resultado es positivo, el proyecto crea valor por sobre lo que exige el inversionista. La TIR (Tasa Interna de Retorno) es la rentabilidad anual que el proyecto entrega por sí mismo, es decir la tasa de descuento a la cual el VAN sería exactamente cero; se compara contra la tasa exigida y contra el 12 % que cuesta el crédito. El payback o período de recuperación indica cuánto tarda la inversión en devolverse: simple cuando suma los flujos sin ajuste, y descontado cuando reconoce que un peso recibido en el año cuatro vale menos que uno recibido hoy.

El flujo del proyecto se evalúa antes del financiamiento, con el impuesto calculado sin deducir intereses. En el mes 0 se compromete el desembolso más la caja mínima operativa, definida como tres meses de gastos fijos y contingencia; sus aumentos posteriores se descuentan del FCFF. La reserva destinada a cuotas pertenece al análisis financiero y no se incorpora como costo de una operación sin deuda. Esta separación evita que cambiar el monto del préstamo altere artificialmente la rentabilidad del proyecto: el VAN económico responde a la inversión, la operación y los impuestos de la actividad, mientras el flujo de los socios y su riesgo de caja sí cambian con la cuota, los gastos de apertura y la tasa del crédito. Por eso, en la tabla de sensibilidad, subir la tasa del 12 % al 18 % deteriora el DSCR y la caja pero deja el VAN intacto: son dos preguntas distintas y el modelo las mantiene separadas a propósito.

### Resultado de la Evaluación por Escenario

Aplicando esta metodología sobre los tres escenarios de actividad definidos —base, estrés (ventas reducidas un 35 %, recalculando personal, inventario y servicios según actividad) y crecimiento (ventas y adquisición aumentadas un 50 %, ajustando capacidad)— se obtienen los siguientes indicadores:

| Escenario | Horizonte | Inversión económica mes 0 | VAN al 20 % | TIR efectiva anual | Payback simple | Payback descontado al 20 % |
| --- | :---: | ---: | ---: | :---: | :---: | :---: |
| Base | 10 años (120 meses) | $20.489.116 | $63.717.893 | 48,94 % | 34,61 meses (2,88 años) | 47,15 meses (3,93 años) |
| Estrés | 10 años (120 meses) | $20.478.616 | −$50.865.171 | −3,81 % | No recupera en 120 meses | No recupera en 120 meses |
| Crecimiento | 10 años (120 meses) | $23.661.182 | $166.848.598 | 84,86 % | 22,54 meses (1,88 años) | 23,30 meses (1,94 años) |
| Base | 5 años (60 meses) | $20.489.116 | $15.504.053 | 35,43 % | 34,61 meses (2,88 años) | 47,15 meses (3,93 años) |
| Estrés | 5 años (60 meses) | $20.478.616 | −$50.774.058 | −30,28 % | No recupera en 60 meses | No recupera en 60 meses |
| Crecimiento | 5 años (60 meses) | $23.661.182 | $69.653.316 | 76,70 % | 22,54 meses (1,88 años) | 23,30 meses (1,94 años) |

###### **Tabla 3.4 “Evaluación por Escenario”**

El VAN base de $63.717.893 a diez años indica excedente económico después de remunerar el capital al 20 % anual. La TIR de 48,94 % supera esa tasa en 28,94 puntos porcentuales. El payback simple de 34,61 meses mide recuperación nominal; al reconocer el valor temporal del dinero se amplía a 47,15 meses. Son preguntas distintas y por ello los dos plazos no deben mezclarse.

La comparación entre ambos horizontes es informativa por sí misma: a cinco años el VAN base es de $15.504.053 y la TIR de 35,43 %, mientras que a diez años ascienden a $63.717.893 y 48,94 %. Es decir, el 76 % del valor del proyecto se genera en su segunda mitad, precisamente cuando el crecimiento se modera al 5 % anual y la estructura deja de expandirse. Ese resultado tiene una explicación operativa directa: los cinco primeros años pagan la construcción de la empresa (dotación, agencia, base instalada, curva de aprendizaje del taller) y los cinco siguientes cosechan esa estructura ya montada con un crecimiento modesto. Por esa razón el horizonte principal de este estudio es de diez años y no de cinco: evaluar solo el primer quinquenio equivale a cargarle al proyecto toda la inversión de su estructura y reconocerle apenas un cuarto de su retorno, además de cortar el análisis cuando todavía quedan $19.139.649 de deuda viva. Ambos horizontes descuentan la misma serie mensual y ninguno incorpora valor terminal, de modo que la diferencia entre ellos es puramente el flujo de los años 6 a 10 y no un supuesto de reventa de la empresa. El payback no cambia entre horizontes porque se alcanza dentro de los primeros sesenta meses en los escenarios base y de crecimiento.

Los tres escenarios muestran que el margen técnico del equipo, el costo comercial y el ritmo de ventas deben analizarse en conjunto: una mayor capacidad de lectura o una BOM reducida no compensan por sí solas una estructura de adquisición de clientes ineficiente.

### Análisis de Sensibilidad y Punto de Quiebre

Los indicadores anteriores corresponden al escenario base. Para verificar la robustez del modelo frente a desviaciones razonables, se recalculó el resultado del Año 1 y el VAN bajo variaciones individuales de las variables más frágiles, modificando una condición a la vez y manteniendo el principal del crédito:

| Caso | Ventas año 1 | EBITDA año 1 | DSCR año 1 | VAN 10 años | Caja mínima 24 meses |
| --- | :---: | ---: | :---: | ---: | ---: |
| Base | 200 | $4.426.234 | 0,72 | $63.717.893 | $13.521.745 |
| Ventas −10 % | 180 | $779.610 | −0,01 | $31.147.090 | $7.804.675 |
| Ventas −25 % | 150 | −$4.690.325 | −1,09 | −$12.452.408 | −$166.277 |
| Ventas −35 % | 130 | −$8.336.948 | −1,82 | −$50.865.171 | −$5.980.612 |
| Precio $299.990 | 200 | −$3.477.128 | −0,85 | −$29.441.688 | −$5.003 |
| BOM +15 % | 200 | $1.795.877 | 0,17 | $31.249.254 | $8.171.924 |
| Tasa crédito 18 % | 200 | $4.426.234 | 0,58 | $63.717.893 | $11.712.534 |

###### **Tabla 3.5 “Análisis de Sensibilidad y Punto de Quiebre”**

En estas sensibilidades se modifica una condición a la vez y se mantiene el crédito de $30.000.000. Menores ventas no reducen automáticamente la pauta comercial, porque una campaña ya contratada no se devuelve. El caso BOM +15 % afecta materiales, inventario, merma y reposiciones; no equivale a aumentar todos los gastos de la empresa un 15 %. El alza de tasa altera la deuda y la caja del accionista, pero conserva el VAN del proyecto porque el FCFF se calcula antes del financiamiento.

Sobre el horizonte de diez años conviene separar dos preguntas que estas sensibilidades responden de manera distinta. El VAN tolera desviaciones moderadas: una caída del 10 % en el volumen lo mantiene positivo en $31.147.090 y un alza del 15 % en la BOM lo deja en $31.249.254, ambos aproximadamente a la mitad del caso base. Se vuelve negativo recién con una caída del 25 % en las ventas (−$12.452.408) y se deteriora hasta −$50.865.171 con una caída del 35 %. La caja del arranque traza un límite muy parecido: con el crédito de $30.000.000 resiste holgadamente una caída del 10 % en ventas ($7.804.675 de caja mínima) y un alza del 15 % en la BOM ($8.171.924), pero se agota justo al perder un cuarto de las ventas (−$166.277) o al rebajar el precio a $299.990 (−$5.003). Esa coincidencia es informativa: el punto donde el proyecto deja de crear valor es prácticamente el mismo punto donde se queda sin caja, de modo que no existe una zona intermedia en la que el negocio sobreviva destruyendo valor.

El precio es la variable más sensible del modelo: rebajarlo a $299.990 deja el VAN en −$29.441.688, un deterioro mayor que el de perder un cuarto de las ventas, y lleva la caja mínima exactamente al borde de cero. Ese resultado sostiene el tratamiento de $349.990 como techo estratégico y no como punto de negociación. El alza del 15 % en la BOM reduce el VAN a la mitad, lo que indica que el margen técnico del equipo no admite descuido en la cotización de la sonda. Finalmente, el alza de tasa del 12 % al 18 % baja el DSCR del primer año de 0,72 a 0,58 y consume $1,8 millones adicionales de caja en dos años, pero conserva intacto el VAN del proyecto, porque el FCFF se calcula antes del financiamiento: es la verificación de que la metodología separa correctamente la rentabilidad del negocio del costo de su deuda.

Estas sensibilidades orientan medidas de gestión concretas: revisar el costo del SKU que concentra los materiales, comparar canales por margen después de comisión, contratar según horas efectivas y observar la caja antes de ampliar compras.

Adicionalmente, se recalculó el VAN ante distintas tasas de descuento, para verificar que el resultado no dependa de una única exigencia de rentabilidad. Todas las filas descuentan exactamente la misma serie mensual, sin modificar ventas ni costos:

| Tasa efectiva anual | VAN | Interpretación |
| :---: | ---: | --- |
| 5 % | $196.834.564 | Positivo |
| 8 % | $156.331.189 | Positivo |
| 10 % | $134.386.003 | Positivo |
| 15 % | $92.521.585 | Positivo |
| 20 % | $63.717.893 | Positivo |
| 30 % | $28.796.371 | Positivo |
| 40 % | $9.986.673 | Positivo |
| TIR: 48,94 % | $0 | VAN aproximadamente cero |

###### **Tabla 3.6 “Análisis del VAN”**

Todas las filas descuentan exactamente la misma serie mensual de flujos. El VAN disminuye monótonamente al elevar la tasa de descuento y cruza cero exactamente en la TIR, tal como exige la definición de ambos indicadores, y se mantiene positivo hasta exigencias de rentabilidad muy superiores al 20 % de referencia.

Bajo el horizonte principal de evaluación de 10 años y una tasa de descuento del 20 %, los resultados del negocio son los siguientes:

| Indicador | Valor proyectado | Criterio de éxito (10 años, 20 %) | Veredicto |
| --- | ---: | --- | :---: |
| VAN (20 %) | $63.717.893 | VAN > 0 | Cumple |
| TIR | 48,94 % | TIR > 20 % | Cumple |
| Payback simple | 34,61 meses (2,88 años) | ≤ 5 años | Cumple |
| Payback descontado (20 %) | 47,15 meses (3,93 años) | ≤ 5 años | Cumple |
| VAN (20 %) a 5 años | $15.504.053 | VAN > 0 | Cumple |
| DSCR Año 1 | 0,72 | ≥ 1,0 | No cumple en el primer año |
| DSCR Año 2 en adelante | 3,44 a 12,48 | ≥ 1,0 | Cumple |
| Deuda al cierre del horizonte | $0 (cancelada en el mes 120) | Crédito saldado dentro del horizonte | Cumple |

###### **Tabla 3.7 “Evaluación Financiera”**

La decisión económica del caso base es favorable: sobre diez años, el proyecto crea $63.717.893 de valor por sobre una exigencia de rentabilidad del 20 % anual, rinde una TIR del 48,94 %, recupera la inversión en 2,88 años nominales o 3,93 descontados, y cancela íntegramente su crédito dentro del mismo horizonte. El único indicador que no cumple su criterio es el DSCR del primer año, y no cumple por diseño: los 200 equipos del año de lanzamiento no alcanzan a cubrir la cuota completa, razón por la cual el financiamiento incluye una caja de arranque de $27.082.622 destinada precisamente a ese tramo. Desde el segundo año la cobertura triplica la cuota y sigue creciendo. La planificación financiera responde entonces dos preguntas distintas que no conviene mezclar. La primera, de rentabilidad, la responden el VAN, la TIR y el payback: el negocio crea valor. La segunda, de liquidez, la responden el DSCR, la reserva y la caja mensual: el negocio sobrevive al arranque, pero lo hace gastando el colchón que se financió con el crédito y el pie, y con un margen de holgura que el primer año es estrecho.

## Especificaciones Técnicas del Proyecto

### Arquitectura General y Estrategia de Hardware

El diseño de hardware se articula en torno a una topología de bajo consumo, orientada a maximizar la autonomía del equipo en jornadas de terreno. La arquitectura separa lógicamente el sistema en un dominio de control digital (siempre energizado, pero capaz de entrar en reposo profundo) y un dominio de potencia analógico/periférico que se aísla mediante *power gating* cuando no está en ciclo de medición.

La fuente de energía primaria es una celda LiPo protegida de 2.000 mAh a 3,7 V nominales, equivalente a una energía de referencia de aproximadamente 7,4 Wh. La tensión de la celda alimenta un bus principal regulado, del cual derivan tres subramas:

- **Rama Digital Continua.** Un regulador LDO de baja corriente de reposo (HT7533-1, 2,5 µA típicos) reduce la tensión a 3,3 V para alimentar el microcontrolador y el sensor ambiental. La corriente de reposo del regulador es aquí un criterio de selección y no un detalle secundario: al permanecer alimentado de forma permanente, un LDO de propósito general con decenas de microamperios de quiescente pasaría a dominar por sí solo el presupuesto de reposo del equipo.

- **Rama de Medición Conmutada.** Un MOSFET controlado por GPIO habilita el paso de energía hacia el convertidor elevador que provee los 5 V DC necesarios para excitar la sonda de suelo RS-485.

- **Rama de Interfaz.** Lógica directa para los LED indicadores y un divisor resistivo (1 MΩ + 1 MΩ) para el muestreo del estado de batería por ADC. El valor de las resistencias se dimensiona por consumo y no por comodidad de cálculo: un divisor de 100 kΩ + 100 kΩ drenaría 18,5 µA de forma permanente, cifra que por sí sola excede el presupuesto de reposo completo del resto del sistema; con una resistencia total de 2 MΩ ese drenaje baja a 1,85 µA (I = V/R = 3,7 V / 2 MΩ), sin afectar la resolución del ADC porque la lectura de batería no exige velocidad de muestreo alta.

La carga y la elevación de tensión se resuelven mediante una PCB combinada USB-C de carga y boost, integrada como un único componente. Concentrar ambas funciones en un solo módulo reduce el número de referencias de la BOM, el área de placa portadora y los puntos de soldadura del ensamblaje, sin renunciar a las protecciones de sobrecarga, sobredescarga y cortocircuito que exige la celda de litio.

### Sistema de Procesamiento y Conectividad

El núcleo del procesamiento recae en el módulo ESP32-WROOM-32 [19], adquirido en formato de placa de desarrollo. La elección de este SoC específico sobre alternativas mononúcleo responde a una exigencia de estabilidad concurrente: el procesador Xtensa LX6 de 32 bits y doble núcleo permite dedicar un núcleo de forma exclusiva a mantener la pila de radio (Wi-Fi/Bluetooth) y el sistema operativo en tiempo real (FreeRTOS), mientras el segundo núcleo gestiona la temporización estricta del protocolo Modbus RTU hacia la sonda. Compartir estas tareas en un solo núcleo introduciría el riesgo inaceptable de perder la conexión inalámbrica o corromper tramas de datos durante la lectura.

| Especificación | Detalle técnico |
| --- | --- |
| Microcontrolador | Módulo ESP32-WROOM-32, montado en placa de desarrollo |
| Procesamiento | Xtensa LX6, 32 bits, doble núcleo, hasta 240 MHz |
| Memoria | 520 KB SRAM interna / 4 MB Flash SPI (particiones OTA duales) |
| Conectividad | Wi-Fi 802.11 b/g/n + Bluetooth 4.2 (BR/EDR y BLE) |
| Consumo dinámico | 95–380 mA (dependiente del estado del transceptor de radio); transmisión BLE en el orden de 130–150 mA |
| Consumo en reposo profundo | 10 µA del módulo reteniendo RTC y memoria RTC / 5 µA en hibernación. **No incluye** el regulador, el LED de alimentación ni el puente USB-UART de la placa de desarrollo |
| Certificación RF | Módulo pre-certificado FCC ID 2AC7Z-ESPWROOM32 (ampara al módulo, no al equipo terminado) |

###### **Tabla 3.8 “Especificaciones Técnicas ESP32”**

El rango de 95 a 380 mA describe el consumo del módulo medido en su propio pin de alimentación de 3,3 V, no el consumo del sistema completo: el extremo inferior corresponde a CPU activa con radio en reposo (el estado que domina durante la fase de adquisición Modbus) y el extremo superior a un pico instantáneo de transmisión Wi-Fi a máxima potencia, que este proyecto no utiliza porque toda la comunicación con el teléfono ocurre por BLE. Durante el advertising BLE de bajo duty cycle, el consumo promedio del módulo es menor que ese piso de 95 mA porque la radio se activa en pulsos breves y espaciados; el valor de 40 mA usado en la Fase 1 del ciclo de medición corresponde a ese promedio y no contradice el rango declarado, que describe el consumo en los instantes en que el núcleo de radio está activo.

La última fila de la tabla exige una advertencia que este informe sostiene en todo el capítulo energético: los 10 µA de reposo profundo son una cifra **del módulo**, y la BOM adquiere una **placa de desarrollo** que lo lleva montado junto a un regulador de propósito general, un LED de alimentación y un puente USB-UART. Ninguno de esos tres se apaga con el modo de reposo del microcontrolador. La consecuencia práctica se desarrolla en la sección de gestión energética y se cuantifica en la tabla de sensibilidad al reposo.

### Adquisición de Datos y Sensado

**Sonda de Suelo 7-en-1 (RS-485 Modbus RTU).** El nodo extrae 7 de las 10 variables del sistema mediante una sonda multiparamétrica de grado industrial, construida en acero inoxidable 316L para prevenir la corrosión por picadura inducida por cloruros en el suelo.

| Parámetro | Rango de operación | Exactitud declarada |
| --- | :---: | :---: |
| Humedad volumétrica | 0 – 100 % | ±2 % (en rango 0–50 %) |
| Temperatura de suelo | −40 °C a +80 °C | ±0,3 °C |
| Conductividad eléctrica | 0 – 20.000 µS/cm | ±3 % |
| pH | 3,0 – 9,0 | ±0,1 |
| Macronutrientes (N, P, K) | 1 – 1.999 mg/kg c/u | ±5 % (según fabricante) |

###### **Tabla 3.9 “Especificaciones Técnicas Sonda”**

Estas cifras provienen de la ficha de una sonda representativa de la familia [20] y no del SKU finalmente adquirido, que aún no cuenta con ficha propia publicada. La distinción no es formal: el protocolo de validación de este informe fija su criterio de aceptación sobre umbrales agronómicos propios precisamente porque la exactitud del fabricante no está verificada.

El rango de alimentación de 5 a 24 V DC es representativo de la familia de sondas 7-en-1 RS-485 industriales [20]; dentro de ese rango, el proyecto opera la sonda en su extremo inferior (5 V, entregados por el elevador de tensión descrito más adelante) porque coincide con el nivel que ya requiere el transceptor RS-485 y evita añadir un segundo convertidor. Esta decisión se declara explícitamente como una condición de diseño a validar contra la ficha técnica definitiva del SKU adquirido, dado que otras sondas de la misma familia solo alcanzan su exactitud declarada operando a 12 V o más; si la validación en laboratorio mostrara desviación en la lectura al operar a 5 V, la contingencia de diseño es reemplazar el elevador actual por uno de 12 V, lo que no altera la arquitectura general pero sí el consumo de la Rama de Medición Conmutada.

Conviene además declarar el supuesto con que se estima el consumo de la sonda, porque no se lee directamente de ninguna ficha. La descripción del vendedor entrega 0,15 W a 12 V y 0,5 W a 24 V, de modo que la potencia **no** es constante con la tensión de alimentación. El balance energético de este informe adopta, a falta de dato a 5 V, un **supuesto de potencia constante de 150 mW** en el extremo inferior del rango, equivalente a 30 mA a 5 V. Ese supuesto se declara aquí como tal y figura entre las mediciones de banco que el plan de trabajo ejecuta antes de comprometer volumen de compra. Su peso en el resultado es acotado, porque la fase de adquisición dura tres segundos, pero el método exige nombrarlo.

La comunicación se establece a 9.600 baudios vía Modbus RTU. Para mitigar variaciones entre lotes de proveedores, el mapa de registros Modbus, la dirección del esclavo y los coeficientes de calibración no estarán fijados en el firmware, sino que residirán parametrizados en la memoria no volátil (NVS) del ESP32, permitiendo ajustes remotos por actualización remota.

**Sensor Ambiental (Bosch BME280).** Para las variables climáticas superficiales se integra un sensor BME280 en el bus I²C. Este componente aporta mediciones de temperatura (±1,0 °C), humedad relativa (±3 % HR) y presión barométrica (±1,0 hPa) [13]. Dado que su consumo en reposo es de apenas 0,1 µA, una cifra inferior a la corriente de fuga intrínseca de los transistores convencionales, se prescinde de un circuito de corte dedicado. El sensor operará en *forced mode*, autogestionando su transición a reposo inmediatamente tras cada muestreo de 3,6 µA [13].

### Trama de Datos BLE

El instrumento actúa como puente entre dos entornos distintos: hacia la sonda ejecuta una consulta Modbus RTU y verifica la respuesta; hacia el teléfono publica los datos ya decodificados en una característica GATT. La aplicación no necesita generar señales RS-485 ni procesar el cableado industrial, sino consumir un contrato de datos de aplicación. El contrato es único y de longitud fija: **20 bytes**, con valores multibyte en formato big-endian. El equipo transmite siempre las diez variables (siete de suelo, tres de ambiente) más el estado de batería en una sola notificación; no existen tramas parciales ni modos reducidos.

| Bytes | Contenido | Tipo y escala | Interpretación en la App |
| :---: | --- | --- | --- |
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

###### **Tabla 4.0 “Contrato de Datos BLE (20 bytes)”**

Un cambio de orden de bytes o de escala puede producir cifras plausibles pero incorrectas, mucho más difíciles de detectar que una desconexión visible: una humedad de 35,0 % leída como 8.960 se advierte de inmediato, pero un pH mal escalado que arroje 6,5 en lugar de 5,6 puede pasar inadvertido y provocar una recomendación equivocada.

Las tres magnitudes del BME280 viajan dentro de la misma trama y no en una característica GATT separada: los bytes 16 a 19 empaquetan temperatura del aire, presión y humedad relativa en 12, 12 y 8 bits respectivamente. La razón de ese empaquetado es exacta y no estética: 20 bytes es la carga útil máxima que cabe en una notificación BLE con el MTU por defecto de 23 bytes (20 de datos más 3 de cabecera del protocolo). Al caber entera en un solo paquete, la medición de suelo y la de ambiente pertenecen por construcción a la misma captura, sin necesidad de emparejar dos paquetes, sin riesgo de mezclar lecturas de instantes distintos y sin negociar un MTU mayor que algunos teléfonos Android no conceden.

El byte 15 no es un selector de funciones opcionales sino un identificador de formato: vale 0x01 y su única función es permitir que una revisión futura del firmware cambie la disposición de los campos sin romper la aplicación instalada, que verificará ese byte antes de decodificar y rechazará una trama cuyo formato no reconozca. Es exactamente el fallo silencioso descrito más arriba lo que ese identificador previene.

Cuando el BME280 no responde, el firmware escribe un centinela de todos unos (0xFFF en cada campo de 12 bits, 0xFF en el de 8) y la aplicación almacena un valor nulo: la trama conserva su largo de 20 bytes, la ausencia queda marcada como tal y nunca se sustituye un dato faltante por un valor plausible.

### Estado Probatorio de las Especificaciones Declaradas

Las tablas anteriores mezclan, inevitablemente, cifras de distinta solidez: algunas provienen de la hoja de datos del componente exacto que se va a montar, otras de una ficha representativa de la familia mientras no se cierre el SKU, y otras son estimaciones de diseño aún no medidas en banco. Presentarlas todas con el mismo peso sería engañoso, de modo que se clasifican explícitamente:

| Especificación declarada | Origen de la cifra | Nivel de evidencia | Qué falta para confirmar |
| --- | --- | --- | --- |
| ESP32-WROOM-32: procesamiento, memoria, radio | Hoja de datos del módulo [19] | Confirmada por hoja de datos del componente seleccionado | Nada |
| ESP32: reposo profundo 10 µA | Hoja de datos del módulo [19] | **Confirmada para el módulo, no para la placa de desarrollo que adquiere la BOM** | Medir el consumo de reposo de la placa efectivamente montada, ya intervenida en taller |
| Intervención de taller sobre la placa de desarrollo (alimentación por el riel de 3,3 V y retiro del LED de alimentación) | Decisión de diseño de este informe | Procedimiento definido, no ejecutado | Ejecutarlo sobre unidades piloto y medir antes y después |
| ESP32: FCC ID 2AC7Z-ESPWROOM32 | Certificado modular del fabricante | Confirmada | Verificar que la integración respeta las condiciones del certificado modular |
| BME280: ±1,0 °C, ±3 % HR, ±1,0 hPa, 0,1 µA en reposo | Hoja de datos Bosch del componente exacto [13] | Confirmada por hoja de datos del componente seleccionado | Nada; verificar la respuesta térmica una vez montado tras el respiradero |
| SP3485: 2 mA con driver habilitado | Hoja de datos del transceptor exacto [24] | Confirmada por hoja de datos del componente seleccionado | Nada |
| HT7533-1: 2,5 µA de quiescente | Hoja de datos del regulador exacto [22] | Confirmada por hoja de datos del componente seleccionado | Nada |
| Sonda 7-en-1: rangos y exactitudes de las 7 variables | Ficha de una sonda representativa de la familia [20]; el SKU no tiene ficha propia publicada | Representativa de la familia, no del SKU | Exigir la ficha técnica del SKU al proveedor antes de la orden de compra, y contrastar con la campaña de validación de 30 muestras |
| Sonda: alimentación 5–24 V DC y consumo 30 mA a 5 V | Descripción del vendedor (4,5–30 V; 0,15 W a 12 V; 0,5 W a 24 V) más supuesto propio de potencia constante | Supuesto de diseño sobre declaración del vendedor | Medir consumo y exactitud operando a 5 V; si la exactitud se degradara, la contingencia es elevar a 12 V |
| Sonda: acero inoxidable 316L | Descripción del vendedor | Declaración del vendedor | Certificado de material o ensayo; afecta la vida útil en suelos salinos |
| Circuito cargador/protección: ≈5 µA en vigilancia | Estimación conservadora de diseño, contrastada con un integrado de referencia de la categoría [21] | Estimación de diseño, no medida | Medir en banco sobre el módulo finalmente adquirido |
| Elevador: eficiencia η ≈ 0,85 | Valor típico de convertidores elevadores de esta clase y corriente | Estimación de diseño, no medida | Medir la eficiencia real a la corriente de excitación de la sonda |
| Divisor de batería: 1,85 µA | Cálculo directo (3,7 V / 2 MΩ) sobre el valor de resistencia adoptado | Calculada a partir de una decisión de diseño | Nada; verificar con las resistencias reales y su tolerancia |
| Reposo del sistema: ≈19,4 µA y autonomía de 8,5 meses | Suma de las líneas anteriores, referidas a la batería, **sobre la placa de desarrollo ya intervenida** | Calculada; hereda la incertidumbre de las estimaciones anteriores y de la intervención de taller | Medición del consumo de reposo de la placa completa; la tabla de sensibilidad de reposo acota el peor caso |

###### **Tabla 4.1 “Estado Probatorio de las Especificaciones de Hardware”**

La conclusión que se desprende de esta clasificación es concreta y define la prioridad de la etapa siguiente. Toda la electrónica de control está confirmada por hojas de datos de los componentes exactos, y la incertidumbre relevante se concentra en dos puntos: la sonda de suelo, que es además el componente que concentra el 59,1 % del costo de materiales, y el consumo de reposo de la placa de desarrollo una vez intervenida. De ahí que las dos primeras acciones del plan de trabajo sean exigir al proveedor la ficha del SKU específico junto a una unidad de muestra para medición en banco, y medir el reposo del conjunto ensamblado, ambas antes de comprometer cualquier volumen de compra.

### Gestión Energética

La viabilidad del dispositivo depende del esquema de *power gating* controlado por el ESP32.

| Componente de potencia | Función en la arquitectura |
| --- | --- |
| PCB combinada USB-C (carga + boost) | Carga de la celda de litio por USB-C con protecciones (sobrecarga, sobredescarga, cortocircuito) y elevación a 5 V para la sonda, en un solo módulo. |
| Regulador LDO 3,3 V | Alimentación de la rama digital continua: microcontrolador y sensor ambiental. Alimenta la placa de desarrollo directamente por su riel de 3,3 V, dejando fuera de servicio el regulador propio de esa placa. |
| MOSFET de aislamiento | Actuador de corte de la rama de 5 V, gobernado por GPIO. |
| Interruptor mecánico | Aislamiento manual del banco de batería para mantenimiento o almacenamiento prolongado. |

###### **Tabla 4.2 “Gestión Energética”**

El convertidor DC-DC presenta una corriente de pérdida (corriente quiescente) de entre 30 y 100 µA incluso sin carga, según el modo de reposo del propio integrado [21]. Si permaneciera conectado al bus de forma continua, excedería por sí solo el presupuesto energético total de reposo del sistema. Por ello el microcontrolador secciona físicamente esa rama, energizando solo durante los segundos que dura la rutina de lectura Modbus.

Cortar la rama de la sonda no equivale, sin embargo, a un consumo total de 0 µA del equipo. El corte anula el consumo de esa rama, pero permanecen activos:

- el ESP32 en reposo profundo, 10 µA [19];
- el regulador LDO, 2,5 µA de quiescente típico, dato de hoja de datos [22];
- el circuito cargador/protección de la celda en su modo de vigilancia, ≈5 µA, estimación conservadora de diseño a confirmar en banco sobre el SKU final;
- el divisor de batería, que con el valor adoptado de 1 MΩ + 1 MΩ consume 1,85 µA de forma permanente.

El presupuesto de reposo del sistema completo queda entonces fijado en aproximadamente **19,4 µA** (10 + 2,5 + 5 + 1,85 µA), la cifra que se usa de forma consistente en el resto de esta sección para calcular la autonomía.

**Condición indispensable de ese presupuesto.** Los 19,4 µA corresponden al módulo ESP32 y no a la placa de desarrollo tal como se compra. Una placa de desarrollo sin intervenir mantiene alimentados un regulador de propósito general, un LED de alimentación y un puente USB-UART cuyo consumo conjunto se sitúa en el orden de los miliamperios, es decir dos órdenes de magnitud sobre el presupuesto anterior. El diseño resuelve esto con dos medidas de taller aplicadas a cada unidad durante el montaje:

1. **Alimentar la placa por su riel de 3,3 V** desde el regulador LDO del instrumento, de modo que el regulador propio de la placa queda sin tensión de entrada y no participa del consumo de reposo. El puente USB-UART, alimentado desde el bus de 5 V del conector USB, queda igualmente sin energía cuando el equipo opera con batería.
2. **Retirar el LED de alimentación** de la placa, que es el único de los tres elementos que sí cuelga del riel de 3,3 V y que drenaría del orden de 2 mA de forma permanente.

Ambas operaciones están contenidas en las 2,25 horas de montaje y prueba ya presupuestadas por equipo y no añaden costo de materiales. Su efecto sobre la autonomía se cuantifica explícitamente en la tabla de sensibilidad al reposo, donde figura también el caso de la placa sin intervenir, porque la diferencia entre ambos escenarios es el argumento que justifica la intervención.

El mismo criterio de corte explica la rama de la sonda. Sin el MOSFET, el elevador y el transceptor RS-485 permanecerían alimentados de forma continua: el elevador aportaría entre 30 y 100 µA según su modo de reposo [21], y el transceptor SP3485, con el driver deshabilitado pero el integrado energizado, del orden de 300 a 400 µA según su hoja de datos [24]. La suma, entre 330 y 500 µA, excede en más de un orden de magnitud el presupuesto de reposo del resto del sistema. Ambas cifras son de hoja de datos y deben confirmarse sobre el conjunto ensamblado.

A modo de referencia del árbol de alimentación completo, incluyendo el punto de corte del MOSFET y los dos nodos de tensión regulada:

**Figura 1.8 “Árbol de Alimentación y Nodos de Tensión”**

*Árbol de alimentación desde la celda LiPo: rama digital continua a 3,3 V tras el LDO, rama de medición conmutada a 5 V tras el MOSFET y el elevador, y rama de interfaz con LED y divisor de batería.*

El diagrama hace explícito lo que la tabla de fases cuantifica más adelante: los componentes de la rama LDO comparten un mismo nodo de 3,3 V y su corriente se suma directamente, mientras que la sonda cuelga de un nodo de 5 V detrás de un conversor con pérdidas, por lo que su corriente no puede sumarse directamente a las demás sin antes referirla a la batería.

### Interfaz Física de Usuario

El panel físico del equipo se reduce deliberadamente a lo mínimo indispensable para la operación en terreno. El panel frontal centraliza las interacciones físicas, aislando las entradas de cableado en la sección inferior.

**Figura 1.9 “Representación Conceptual de Carcasa”**

*Vista conceptual del equipo: panel frontal con tres luces indicadoras, botón de emparejamiento, puerto USB-C e interruptor mecánico; salida inferior de cable hacia la sonda mediante prensaestopas.*

La interfaz consta de tres luces indicadoras, un botón de emparejamiento, un puerto USB-C de carga y un interruptor mecánico de encendido dimensionado para ser accionable incluso con guantes de trabajo pesados. Las tres luces comunican, mediante distintos patrones de encendido, la totalidad de los estados relevantes del equipo sin necesidad de abrir la aplicación:

| Estado operativo | Indicador activo | Patrón de señalización | Significado técnico |
| --- | :---: | --- | --- |
| Buscando conexión | Azul | Pulso suave (1 Hz) | Encendido, emitiendo advertising a la espera de un enlace BLE. |
| Modo de emparejamiento | Azul | Parpadeo rápido (4 Hz) | Ventana de enlace abierta durante 30 s. |
| Enlazado y listo | Verde | Iluminación fija | Conexión BLE establecida correctamente con el teléfono. |
| Medición exitosa | Verde | Tres destellos rápidos | Lectura capturada y transmitida correctamente. |
| Batería baja | Rojo | Pulso lento (0,5 Hz) | Tensión de batería bajo el umbral de aviso; requiere recarga por USB-C. |
| Error de sonda | Rojo | Parpadeo rápido (2 Hz) | Fallo o tiempo de espera agotado en la comunicación Modbus. |

###### **Tabla 4.3 “Interfaz Hardware”**

Cada estado se comunica por color **y** por patrón temporal, de modo que ninguna información depende exclusivamente del color. Esta decisión no es estética: responde al mismo criterio de accesibilidad que la sección normativa declara para la aplicación móvil.

### Carcasa del Dispositivo

Aislada de la interfaz de usuario, la envolvente física se enfoca exclusivamente en la estanqueidad, durabilidad e integración de los sensores en entornos agrícolas agresivos.

**Material y estructura.** La carcasa se fabrica en PETG mediante impresión 3D FDM. A diferencia del PLA o del ABS, el PETG resiste la intemperie y la radiación UV. La rigidez frente a caídas sobre gravilla se logra mediante un relleno al 40–60 %, mientras que la estanqueidad depende de la configuración de perímetros sólidos (≥ 4 capas, altura de 0,16–0,20 mm).

**Sellado de componentes.**

- *Junta principal:* utiliza un O-ring de silicona comprimido de forma controlada mediante insertos roscados M3 entre la tapa y el cuerpo.
- *Salida de sonda:* el cable hacia la sonda de suelo emplea un prensaestopas industrial M12 en la base. Actúa como sellado y alivio de tracción; sin él, cualquier tirón transmitiría el esfuerzo mecánico directo a las soldaduras de la PCB.
- *Respiradero del sensor ambiental:* el BME280 requiere contacto con el aire exterior para medir humedad y presión reales, de modo que la carcasa incorpora una ventilación protegida. Ese punto es, por construcción, el compromiso más delicado entre estanqueidad y función de medición, y forma parte explícita del alcance del ensayo IP67.

## Criterios de Eficiencia Energética y Digitalización

Toda la ingeniería de energía del equipo se reduce a una sola regla, declarada de forma explícita y aplicada sin excepción a cada decisión de diseño, desde la elección del microcontrolador hasta el tipo de LED montado en el panel:

> Toda energía que el instrumento consume fuera del instante de medición es energía desperdiciada, y esa energía desperdiciada se paga dos veces: en autonomía perdida para el usuario y en batería adicional que hay que comprar.

Esta regla es la que explica, con hilo conductor, las decisiones de hardware adoptadas: por qué el equipo no lleva pantalla, por qué existe un MOSFET dedicado solo a cortar la alimentación de la sonda, por qué se prefirieron LED por sobre otros métodos de alerta y por qué cada placa de desarrollo se interviene en taller antes de montarse.

### Digitalización del Proceso Agrícola

El segundo eje, tan determinante como la eficiencia energética, es la digitalización del proceso de toma de decisiones en terreno. TerraSense transforma un proceso hoy manual y no trazable —la estimación visual, la memoria del agricultor o, en el mejor de los casos, un cuaderno de papel— en un flujo digital estructurado: cada medición queda georreferenciada, con marca de tiempo y sincronizada a una base histórica consultable. El agricultor pasa de “estimar” a “medir y registrar”, cerrando la brecha de datos que hoy impide a instituciones públicas y privadas focalizar sus políticas de apoyo al sector. Esta digitalización se sostiene sobre cinco pilares técnicos:

| Pilar de digitalización | Cómo se implementa en TerraSense |
| --- | --- |
| Georreferenciación y análisis espacial (GIS) | Cada medición se asocia a coordenadas GPS del teléfono y se almacena en una base de datos relacional con extensión geoespacial, habilitando consultas espaciales (mapas de salud edáfica por campo, cooperativa o territorio) que una base relacional plana no permite. |
| Offline-first con *store & forward* | El motor agronómico, el almacenamiento local persistente del teléfono y la captura BLE operan sin red; las mediciones se encolan localmente y se sincronizan de forma diferida en cuanto el teléfono detecta cobertura, sin bloquear ni degradar la operación en terreno. |
| Arquitectura multi-rol | La consola web distingue perfiles de agricultor, asesor técnico/extensionista y administrador de cooperativa, con seguridad a nivel de fila aplicando aislamiento de datos por campo y por rol. |
| Actualización remota (OTA) | El mapa de registros Modbus, la dirección del esclavo y los coeficientes de calibración residen en la memoria no volátil del microcontrolador y son actualizables sin reemplazar el firmware completo; la app móvil se distribuye por los canales estándar de actualización de cada tienda de aplicaciones. |
| Accesibilidad digital (WCAG 2.1 AA) [23] | Contraste mínimo de 4,5:1 entre texto y fondo, área táctil mínima de 48×48 dp y prohibición del color como único portador de información, pensado para usuarios de distintos niveles de alfabetización digital y para la lectura bajo sol directo en terreno. |

###### **Tabla 4.4 “Pilares de Digitalización del Proceso Agrícola”**

Esta digitalización habilita capacidades imposibles bajo el modelo análogo: comparar la evolución de un mismo punto del campo entre temporadas, generar mapas agregados de salud edáfica por cooperativa o territorio, y conservar un registro histórico propio que el agricultor puede mostrar a su asesor técnico sin depender de su memoria ni de un cuaderno.

### Arquitectura de la Gestión Eficiente de Energía

El rendimiento real lo dictan componentes básicos implementados estratégicamente. La sonda y sus circuitos de soporte, el elevador de tensión y el transceptor RS-485 no permanecen alimentados de forma continua: un MOSFET controlado directamente por el microcontrolador actúa como interruptor electrónico que corta ese consumo salvo durante los segundos exactos en que se toma una lectura. Sin este corte, el consumo de reposo de esa rama sumaría entre 330 y 500 µA de forma continua, una cifra que por sí sola excedería en más de un orden de magnitud el presupuesto de reposo del resto del sistema. Este MOSFET cuesta menos de $1.000 CLP y es, proporcionalmente, la mejor inversión electrónica del diseño.

Sin embargo, el componente que más autonomía aporta no es electrónico, sino mecánico: el interruptor que permite al usuario apagar el equipo por completo en lugar de dejarlo emitiendo advertising Bluetooth de forma permanente. La diferencia entre un equipo apagado y uno en publicidad continua es de varios órdenes de magnitud en consumo, y la determina una pieza de menos de $1.000 CLP.

### Los Estados de Consumo

El equipo no tiene un único nivel de consumo, sino que transita entre estados bien delimitados. Dado que el dispositivo pasa la mayor parte de su vida útil en reposo, el diseño se enfoca en gestionar estas transiciones y en acotar el tiempo que permanece conectado:

| Estado | Qué permanece activo | Medida de diseño |
| --- | --- | --- |
| Almacenamiento | Circuitos no desconectados por el interruptor y autodescarga de la celda | Identificar rutas reales de consumo y verificar el método de apagado |
| Reposo | Control, regulación y periféricos retenidos | Medir la corriente del conjunto; verificar que el LED de alimentación fue retirado y que el puente USB-UART queda sin tensión |
| Publicidad y conexión | Radio BLE y control | Ventanas acotadas de advertising y reintento controlado |
| Medición | Sonda, interfaces RS-485 y lectura ambiental | Habilitar solo durante estabilización y adquisición |
| Entrega y espera | Comunicación y procesamiento | Confirmar envío y regresar al estado de menor consumo |
| Carga | Circuito USB-C y celda | Verificar corriente, temperatura y efecto del calor sobre la lectura ambiental |

###### **Tabla 4.5 “Estados Energéticos y Medidas de Diseño”**

### Modelo de Autonomía en el Campo

Cada vez que el usuario pulsa “Medir”, se dispara una lectura y el equipo recorre tres fases consecutivas. El error metodológico más común al estimar autonomía es sumar corrientes de distintos nodos de tensión como si fueran directamente equivalentes. El equipo no opera a una única tensión: la celda entrega 3,7 V nominales, la rama digital trabaja a 3,3 V detrás de un regulador lineal y la sonda a 5 V detrás de un elevador conmutado. Un miliamperio-hora no significa lo mismo en cada uno de esos tres nodos, de modo que el balance completo se plantea en unidades de energía (mWh) y no de carga (mAh): **la energía sí es aditiva entre nodos de distinta tensión, la carga no**.

La conversión desde cada nodo hacia la batería sigue dos reglas distintas. En la rama del LDO (ESP32, BME280 y transceptor) la corriente no se transforma —un regulador lineal entrega la misma corriente que consume— pero la potencia sí: la batería aporta esa corriente a 3,7 V y el regulador disipa como calor la diferencia hasta 3,3 V, de manera que la potencia desde la batería es igual a la corriente del nodo multiplicada por la tensión de batería. Razonar esta rama en mAh oculta precisamente esa pérdida, que asciende al 10,8 % de la energía extraída. En la rama de la sonda, alimentada por un elevador de eficiencia η ≈ 0,85 [21], la conversión opera sobre la potencia: la potencia desde la batería es igual al producto de la tensión del nodo por la corriente del nodo, dividido por η.

| Fase | Componente | Nodo / tensión | Corriente en el nodo | Potencia en el nodo | Potencia desde la batería (3,7 V) |
| --- | --- | :---: | ---: | ---: | ---: |
| 1. Publicidad y conexión | ESP32 en advertising BLE | 3,3 V (LDO) | 40 mA | 132 mW | 148 mW |
| 2. Adquisición del conjunto | ESP32 (temporización Modbus) | 3,3 V (LDO) | 95 mA | 313,5 mW | 351,5 mW |
| | Transceptor SP3485 (driver activo) [24] | 3,3 V (LDO) | 2 mA | 6,6 mW | 7,4 mW |
| | BME280 (muestreo *forced mode*) | 3,3 V (LDO) | 0,0036 mA | 0,012 mW | 0,013 mW |
| | Sonda 7-en-1 (excitación y lectura) | 5 V (elevador, η ≈ 0,85) | 30 mA | 150 mW | 150 / 0,85 ≈ 176,5 mW |
| | **Subtotal Fase 2** | | | **470,1 mW** | **535,4 mW** |
| 3. Envío del resultado | ESP32 transmitiendo BLE | 3,3 V (LDO) | 150 mA | 495 mW | 555 mW |

###### **Tabla 4.6 “Fases de Operación y Consumo Energético”**

| Fase operativa | Potencia desde la batería | Duración | Energía por ciclo |
| --- | ---: | :---: | ---: |
| 1. Publicidad y conexión | 148 mW | 12 s | 0,493 mWh |
| 2. Adquisición del conjunto | 535,4 mW | 3 s | 0,446 mWh |
| 3. Envío del resultado | 555 mW | 1 s | 0,154 mWh |
| **Total por ciclo** | Variable | **16 s** | **1,094 mWh** |

###### **Tabla 4.7 “Energía por Ciclo de Medición”**

Tres precisiones sostienen estas tablas frente a un cálculo por suma directa de corrientes. La sonda toma 150 mW en su nodo de 5 V, pero exige 176,5 mW a la batería: el factor 1/η = 1,176 que impone el elevador es energía perdida en la conversión, y omitirlo subestima la Fase 2. La rama del LDO exhibe la pérdida simétrica: los 40 mA de la Fase 1 valen 132 mW en el nodo de 3,3 V pero cuestan 148 mW de batería, y esos 16 mW de diferencia son calor disipado en el regulador, no energía entregada a la carga. Sumar los tres nodos en mAh habría hecho desaparecer ambas pérdidas del balance. Por último, la corriente de transmisión del ESP32 en la Fase 3 se fija en 150 mA, el extremo superior de la banda de transmisión BLE declarada en la comparativa de microcontroladores y dentro del rango dinámico de 95–380 mA.

El consumo del transceptor SP3485 se toma del extremo superior de su hoja de datos (2 mA con el driver habilitado y sin carga) [24]; el de la sonda, del supuesto de potencia constante ya declarado, dado que el SKU final aún no cuenta con ficha propia.

### Sensibilidad al Consumo de Reposo

El ciclo de medición no es lo que determina la autonomía: la determina el consumo entre mediciones. El siguiente ejercicio utiliza diez capturas diarias con el ciclo de 1,094 mWh, cinco minutos adicionales de espera BLE a 18 mA (66,6 mW desde la batería, 5,55 mWh), una capacidad útil supuesta de 1.600 mAh equivalente a 5.920 mWh a 3,7 V y una pérdida diaria simplificada por autodescarga de 1,3333 mAh, es decir 4,93 mWh (2 % mensual sobre 2.000 mAh):

| Escenario de reposo | Reposo total | Potencia en reposo | Consumo diario calculado | Energía útil / consumo diario |
| --- | :---: | ---: | ---: | :---: |
| **Diseño adoptado** (placa intervenida, divisor 1 MΩ + 1 MΩ) | 19,4 µA | 71,8 µW | 23,14 mWh/día | **255,8 días (≈ 8,5 meses)** |
| Alternativa con divisor de 100 kΩ + 100 kΩ | 36,0 µA | 133,2 µW | 24,62 mWh/día | 240,5 días (≈ 8,0 meses) |
| Fuga adicional no identificada (contingencia de validación) | 1,0 mA | 3,7 mW | 110,22 mWh/día | 53,7 días (≈ 1,8 meses) |
| **Placa de desarrollo sin intervenir** (LED de alimentación conectado) | ≈ 2,0 mA | 7,4 mW | 199,02 mWh/día | **29,7 días (≈ 1,0 mes)** |

###### **Tabla 4.8 “Efecto del Consumo de Reposo sobre la Autonomía”**

La comparación muestra por qué el reposo de la placa completa es decisivo, y por qué la intervención de taller no es un detalle de montaje sino una condición del resultado. Pasar del diseño adoptado a una fuga de reposo no identificada de 1 mA reduce la autonomía en un factor de casi cinco; montar la placa de desarrollo tal como viene de fábrica la reduce en un factor de ocho y media, de ocho meses y medio a un mes escaso. La cifra de referencia que se sostiene de aquí en adelante, de forma consistente en Síntesis y Conclusiones, es la del diseño adoptado: aproximadamente **8,5 meses (256 días, más de 2.500 mediciones)** con una sola carga, con un piso de 1,8 meses si se materializara la fuga de contingencia antes de validarse en laboratorio.

Corresponde subrayar el carácter de esta cifra: es un **resultado calculado**, no medido. Procede del balance energético por nodo con las eficiencias declaradas, y su confirmación exige medir el consumo de reposo de la placa ensamblada e intervenida. Esa medición es la primera de las verificaciones pendientes que este informe enumera en sus conclusiones.

### Sostenibilidad Ambiental y Análisis Competitivo

Al comparar el sistema contra los estándares de la industria, el proyecto enfrenta con honestidad las diferencias de arquitectura. Las referencias siguientes son dos casos puntuales documentados y no una descripción exhaustiva del mercado:

| Equipo | Fuente de energía especificada | Recambio y continuidad operativa | Parámetros medidos |
| --- | --- | --- | --- |
| Bluelab Pulse [25] | 1 pila AA alcalina | Sustituir la pila agotada; conviene disponer de repuesto | 3 (conductividad, humedad y temperatura), con app |
| Hanna HI9814 [6] | 3 pilas AAA de 1,5 V | Sustituir el juego completo; ~600 horas de uso continuo declaradas | 4 (pH, CE, TDS y temperatura), en soluciones hidropónicas |
| TerraSense | 1 celda LiPo recargable de 2.000 mAh, carga USB-C | Recargar la misma celda; sustituirla al degradarse | 7 registros de suelo + 3 ambientales, con interpretación agronómica móvil |

###### **Tabla 4.9 “Análisis Comparativo de Parámetros”**

TerraSense busca reducir el recambio habitual de pilas primarias al recuperar la carga de la misma celda durante muchos ciclos de uso, lo que para el agricultor significa menos compras de repuestos y la posibilidad de cargar el equipo antes de una jornada mediante USB-C. Conviene reconocer, sin embargo, la ventaja operativa que conservan las pilas intercambiables: permiten reanudar el trabajo de inmediato con un repuesto, mientras que la batería integrada obliga a planificar la carga y a asegurar acceso a energía.

Esta arquitectura se alinea además con la normativa ambiental, aunque conviene enunciar el alcance con precisión. Un instrumento dependiente de pilas primarias genera un flujo constante de residuos: un juego de pilas por temporada, o varios, durante toda la vida útil del equipo. El uso de una celda de litio recargable mediante USB-C **reduce ese flujo a una celda por ciclo de vida del instrumento**, es decir del orden de dos unidades en diez años según el propio cuadro de costo total de propiedad. Lo que no hace, y sería incorrecto afirmarlo, es eliminar el residuo: una celda de litio recargable es igualmente un residuo prioritario bajo la Ley REP N° 20.920 [26], y precisamente por eso el diseño contempla celdas extraíbles con herramientas comunes y la habilitación de un canal de recepción al fin de la vida útil, obligaciones que se detallan en la matriz normativa.

### Síntesis de Eficiencia Energética

El diseño del sistema prioriza la autonomía como un atributo crítico de confiabilidad. Mediante el uso de *power gating* controlado por hardware, la intervención de la placa de desarrollo en taller y el dimensionamiento del divisor de batería en 1 MΩ + 1 MΩ, el consumo de reposo queda acotado a ≈19,4 µA, lo que sostiene una autonomía calculada de aproximadamente 8,5 meses (256 días, equivalente a más de 2.500 mediciones) con una sola carga, según el balance energético por nodo. Esta eficiencia es fruto de cuatro pilares de diseño:

- **Aislamiento activo (*power gating*).** Utilización de MOSFET para desconectar físicamente la sonda y el elevador de tensión durante los períodos de inactividad, eliminando el consumo pasivo innecesario.
- **Depuración de la placa de control.** Alimentación directa del riel de 3,3 V y retiro del LED de alimentación, sin los cuales el presupuesto de reposo se multiplica por cien.
- **Optimización de radio.** Empleo de Bluetooth Low Energy con tramas compactas de 20 bytes y tiempos de conexión acotados (menos de 16 segundos por ciclo), reduciendo drásticamente la carga energética.
- **Gestión local.** El procesamiento offline en el teléfono libera al instrumento de tareas de cómputo intensivas y de almacenamiento, permitiendo que el hardware solo ejecute las funciones esenciales de captura de datos.

## Condiciones Técnicas y Normativas Respecto al Diseño

El marco regulatorio aplicable al proyecto TerraSense organiza su cumplimiento normativo en seis dominios fundamentales: hardware y seguridad eléctrica, radiofrecuencia y telecomunicaciones, buses industriales, estándares edafológicos, protección de datos y accesibilidad, y protección al consumidor.

### Hardware

- **IEC 60529 [27].** Exige un grado de protección IP67 (estanco al polvo, sin depósito interior, e inmersión a 1 metro de profundidad durante 30 minutos). En el proyecto, esto se aborda mediante una envolvente en PETG con sellado intercapa, O-ring de silicona y prensaestopas M12.

- **UN 38.3 / IEC 62133-2 [28].** Define los ensayos de estrés (altitud, choque térmico, cortocircuito) para celdas de ion-litio secundarias. El diseño lo aborda integrando celdas comerciales con certificación de origen, complementadas por la protección electrónica del módulo cargador.

- **RoHS 2011/65/EU y RoHS 3 (2015/863).** Restringe el uso de metales pesados en la electrónica. El proyecto exige el uso de soldadura sin plomo (aleación SAC305) y componentes con declaración de conformidad del proveedor.

- **Ley N° 20.920 (Ley REP, Chile) [26].** Establece la responsabilidad extendida del productor sobre residuos prioritarios, incluyendo baterías. Se cumple mediante un diseño desmontable con herramientas comunes y celdas extraíbles, requiriendo habilitar un canal de recepción al fin de la vida útil del equipo.

- **Alimentación y aprobación eléctrica.** El equipo se comercializa **sin adaptador de red**: se entrega con cable USB-C y se carga desde un cargador de teléfono que el usuario ya posee. Esta decisión se declara expresamente porque delimita el alcance regulatorio: al no incluir el proyecto ninguna fuente de alimentación conectada a la red domiciliaria, no se configura la obligación de certificación de producto eléctrico ante la Superintendencia de Electricidad y Combustibles. Si en el futuro se decidiera incluir un adaptador en el empaque, ese adaptador deberá contar con el protocolo de aprobación correspondiente antes de su comercialización.

### Radiofrecuencia y Telecomunicaciones

- **SUBTEL, Resolución Exenta N° 1.985/2017 [29].** Norma técnica para equipos de alcance reducido en Chile, que fija los límites de potencia aplicables a la banda de 2,4 GHz bajo régimen exento de licencia. El presupuesto de diseño del enlace Bluetooth es de +9 dBm, equivalentes a aproximadamente 8 mW radiados, cifra que se sitúa muy por debajo de cualquiera de las lecturas posibles del límite aplicable, ya sea que se mida como potencia de salida en bornes de antena o como potencia radiada. El valor exacto del límite y la magnitud sobre la que se mide deben confirmarse contra el texto vigente de la resolución al preparar el expediente, y así se consigna en la matriz de verificación: estar holgadamente bajo el límite no exime de acreditar cuál es el límite.

- **SUBTEL, Resolución N° 737/2025 [17].** Actualización del régimen de certificación de equipos de telecomunicaciones, pendiente de verificación formal antes del lanzamiento comercial. Las obligaciones aplican al producto terminado y no al módulo de radio, de modo que la certificación modular del ESP32 no sustituye este trámite.

- **FCC, Título 47 CFR Parte 15, subpartes B y C [30].** Límites de emisiones para dispositivos no licenciados en Estados Unidos. Se encuentra cubierto de forma incidental al utilizar el módulo ESP32-WROOM-32, pre-certificado con FCC ID 2AC7Z-ESPWROOM32. No es exigible en Chile y se conserva como referencia de mercado futuro.

### Buses Industriales

- **TIA/EIA-485-A [31].** Define los niveles eléctricos y la terminación de un bus diferencial multipunto. Es el fundamento técnico-normativo para elegir RS-485 sobre I²C para la comunicación cableada en terreno.

- **Modbus Application Protocol Specification V1.1b3 [32].** Rige la estructura de la comunicación, definiendo la función 0x03 (lectura de registros holding), el mecanismo de verificación CRC-16 y los tiempos de silencio exigidos entre tramas con la sonda de suelo.

### Estándares Edafológicos

- **ISO 10390:2021 [33].** Método de referencia para la determinación del pH del suelo mediante electrodo en suspensión suelo-agua o suelo-CaCl₂. Dado que el pH sustenta directamente las recomendaciones de encalado que entrega el motor agronómico, esta norma es la que fija el método de contraste del protocolo de validación in situ.

- **ISO 11265 [34].** Método de referencia para la conductividad eléctrica específica del suelo. Fundamenta la normalización de la lectura de CE a 25 °C, aplicando un coeficiente térmico de 2 %/°C.

- **ISO 11277 [35].** Método de granulometría y textura. Actúa como base para la clasificación textural declarada por el usuario en la aplicación móvil, alimentando el factor de corrección analítico.

- **ISO 11465 [36].** Método gravimétrico para la determinación del contenido de materia seca y de agua del suelo. Es el método de contraste para la humedad volumétrica, la variable de uso más frecuente del instrumento y la que sustenta las recomendaciones de riego.

- **Métodos oficiales SAG / INIA.** Criterios de interpretación agronómica nacional utilizados para calibrar los umbrales de la matriz de cultivos. No constituyen una obligación legal sobre un instrumento privado: se adoptan de forma voluntaria como referencia técnica nacional, y esa adopción se verifica documentando la fuente oficial de cada umbral.

### Datos, Seguridad de la Información y Accesibilidad

- **Ley N° 19.628 (Protección de la Vida Privada) [37].** Exige consentimiento y derechos del titular. A nivel de arquitectura se aplica mediante seguridad a nivel de fila en la base de datos, garantizando aislamiento por campo y por rol.

- **Ley N° 21.719 (Protección de Datos Personales) [38].** No es un apéndice de la anterior sino un régimen nuevo, con obligaciones propias: creación de una autoridad fiscalizadora, deber de notificar vulneraciones de seguridad, registro de actividades de tratamiento y un cuadro de sanciones distinto. El proyecto la trata como obligación diferenciada y no como continuidad de la Ley N° 19.628, y su cumplimiento se organiza sobre tres frentes: la exportación de datos por el titular, el aislamiento por rol ya implementado y un procedimiento escrito de notificación de incidentes que debe existir antes de la primera cuenta comercial.

- **ISO/IEC 27001:2022 e ISO/IEC 25010 [39].** El desarrollo de la plataforma se rige por cifrado en tránsito (TLS) y en reposo, control de acceso segmentado y criterios internacionales de fiabilidad, usabilidad y mantenibilidad de software.

- **WCAG 2.1, nivel AA [23].** Pautas de accesibilidad digital implementadas en la app (área táctil mínima de 48×48 dp, contraste mínimo de 4,5:1 y prohibición del uso del color como único portador de información).

### Protección al Consumidor

- **Ley N° 21.398 (“Pro Consumidor”) [40].** Extiende la garantía legal a 6 meses y obliga a informar la vida útil y la disponibilidad de repuestos. A nivel de negocio, el proyecto incorpora una provisión del 5 % del costo unitario para atender esta garantía y asume el compromiso de mantener stock de partes.

- **Ley N° 19.496 [41].** Prohíbe la publicidad engañosa. Constituye la barrera normativa formal por la cual el proyecto declara el equipo comercialmente como “diseñado conforme a IP67” en lugar de “certificado IP67”, hasta que los laboratorios documenten el ensayo final.

### Clasificación de Cumplimiento Obligatorio vs. Voluntario

El listado anterior mezcla, deliberadamente, normas de cumplimiento legal ineludible en Chile con estándares técnicos adoptados de forma voluntaria como buena práctica de ingeniería y con referencias pensadas para una eventual exportación futura. Presentarlas todas al mismo nivel sin distinguir su carácter sería engañoso, así que se clasifican aquí explícitamente, cada una expresada como un requisito de diseño con su método de verificación, su criterio de aceptación y la evidencia que debe quedar archivada:

| Norma | Carácter | Requisito de diseño derivado | Método de verificación, criterio de aceptación y evidencia | Estado |
| --- | --- | --- | --- | :---: |
| Ley N° 20.920 (Ley REP) | Obligatoria (Chile) | Diseño desmontable con celdas extraíbles y canal de recepción al fin de vida útil | Ensayo funcional de desmontaje sin herramientas especiales y convenio escrito con gestor autorizado. Criterio: celda extraíble y punto de recepción operativo. Evidencia: procedimiento de desmontaje y convenio firmado | Pendiente |
| SUBTEL, Res. Exenta N° 1.985/2017 | Obligatoria (Chile) | Enlace BLE a +9 dBm (≈8 mW), con margen frente al límite aplicable | Medición en banda 2,4 GHz sobre la unidad ensamblada, previa confirmación documental de cuál es el límite vigente y sobre qué magnitud se mide. Criterio: cumplir el límite acreditado con margen. Evidencia: extracto de la resolución vigente e informe de medición | Pendiente |
| SUBTEL, Resolución N° 737/2025 | Obligatoria (Chile) | Verificación formal del producto terminado, con cargo al rubro de desarrollo y validación | Trámite formal de verificación ante la autoridad sectorial. Criterio: resolución favorable previa a la comercialización. Evidencia: expediente y resolución | Pendiente |
| UN 38.3 / IEC 62133-2 | Obligatoria (transporte y comercialización de celdas de litio) | Celdas comerciales con certificación de origen y protección electrónica del cargador | Solicitud de certificados al proveedor de celdas y ensayo de las protecciones del cargador. Criterio: certificados vigentes y corte por sobrecarga, sobredescarga y cortocircuito. Evidencia: certificados y acta de ensayo | Pendiente |
| Ley N° 19.628 (Protección de la Vida Privada) | Obligatoria (Chile) | Aislamiento por campo y rol; datos exportables por el titular | Pruebas de acceso cruzado entre cuentas y verificación de exportación. Criterio: cero lecturas de campos ajenos y exportación completa a solicitud del titular. Evidencia: batería de pruebas de aislamiento | Parcial: aislamiento implementado, exportación pendiente |
| Ley N° 21.719 (Protección de Datos Personales) | Obligatoria (Chile) | Registro de actividades de tratamiento y procedimiento escrito de notificación de vulneraciones | Revisión documental antes de abrir la primera cuenta comercial. Criterio: registro y procedimiento redactados, con responsable designado. Evidencia: documentos firmados | Pendiente |
| Ley N° 21.398 (“Pro Consumidor”) | Obligatoria (Chile) | Garantía legal de 6 meses más provisión del 5 % de BOM para atenderla | Revisión legal de las condiciones de garantía y provisión contable. Criterio: cobertura ≥ 6 meses y provisión del 5 % de BOM reservada. Evidencia: texto de garantía y asiento de provisión | Parcial |
| Ley N° 19.496 (Protección al Consumidor) | Obligatoria (Chile) | Declaración comercial como “diseñado conforme a IP67” hasta contar con ensayo de laboratorio | Auditoría del material comercial. Criterio: ninguna pieza declara IP67 certificado mientras no exista ensayo. Evidencia: material revisado y aprobado | Cumple |
| IEC 60529 (grado IP67) | Voluntaria como estándar; **exigible como declaración** una vez publicada, por efecto de la Ley N° 19.496 | Envolvente PETG con O-ring, sellado intercapa, prensaestopas M12 y respiradero protegido del sensor ambiental | Ensayo IP67 en laboratorio acreditado sobre el conjunto ensamblado, incluido el respiradero. Criterio: sin ingreso de agua tras 30 min a 1 m. Evidencia: informe de ensayo | Pendiente |
| Métodos oficiales SAG / INIA | Voluntaria (referencia técnica nacional adoptada) | Umbrales de la matriz de cultivos trazables a criterios oficiales publicados | Contraste de cada umbral de la matriz de cultivos con su fuente oficial. Criterio: trazabilidad documental de cada umbral. Evidencia: tabla de correspondencia umbral–fuente, con fecha de consulta | Pendiente |
| RoHS 2011/65/EU y RoHS 3 | Voluntaria en Chile / referencia de mercado futuro | Soldadura SAC305 y declaración de conformidad de proveedores | Recopilación de declaraciones de conformidad de proveedores. Criterio: cobertura documental de los componentes de la BOM. Evidencia: carpeta de declaraciones | Pendiente |
| FCC, Título 47 CFR Parte 15 | Referencia de mercado futuro (EE. UU., no exigible en Chile) | Cubierto de forma incidental por el módulo ESP32 pre-certificado | Verificación del FCC ID del módulo y de las condiciones de uso del certificado modular. Criterio: integración dentro del alcance declarado. Evidencia: ficha del módulo | No aplica en Chile |
| TIA/EIA-485-A y Modbus V1.1b3 | Voluntaria (estándares técnicos abiertos) | Base de diseño del bus RS-485 y la trama Modbus RTU hacia la sonda | Prueba de bus con analizador lógico sobre la trama Modbus RTU. Criterio: terminación correcta y cero errores de CRC en 1.000 lecturas consecutivas. Evidencia: captura y registro de errores | Parcial |
| ISO 10390, ISO 11265, ISO 11277, ISO 11465 | Voluntaria (métodos de referencia de laboratorio) | Métodos de contraste del protocolo de validación in situ | Protocolo de validación in situ contra laboratorio acreditado bajo ISO/IEC 17025. Criterio: el fijado en el propio protocolo. Evidencia: informes de laboratorio y análisis de concordancia | Pendiente |
| ISO/IEC 27001:2022 e ISO/IEC 25010 | Voluntaria (certificación de gestión y calidad de software) | Cifrado en tránsito y reposo, control de acceso segmentado | Revisión de configuración de cifrado y de segmentación de accesos. Criterio: TLS vigente y ausencia de credenciales embebidas. Evidencia: informe de revisión | Parcial |
| WCAG 2.1, nivel AA | Voluntaria (no exigida por ley a aplicaciones privadas en Chile) | Contraste ≥ 4,5:1, área táctil ≥ 48×48 dp y color no exclusivo como portador de información | Auditoría de accesibilidad sobre las pantallas de la aplicación. Criterio: contraste ≥ 4,5:1 y ninguna información transmitida solo por color. Evidencia: informe de auditoría | Pendiente |

###### **Tabla 5.0 “Clasificación Normativa: Obligatoria, Voluntaria y de Mercado Futuro”**

## Protocolo de Validación de la Medición In Situ contra Laboratorio de Referencia

El objetivo específico de “validar la precisión instrumental” exige un protocolo concreto y no sólo la intención declarada de contrastar contra un laboratorio acreditado. Se define aquí ese protocolo.

Antes del detalle corresponde una decisión de alcance que este informe declara en lugar de omitir: **la campaña valida cuatro de las diez variables del sistema**, y hay razones distintas para cada exclusión. Se validan humedad volumétrica, pH, conductividad eléctrica y textura, porque las tres primeras sustentan directamente las recomendaciones de riego, encalado y lavado de sales, y la cuarta es el parámetro que el usuario declara y que modula los umbrales. Quedan fuera la temperatura del suelo, cuya trazabilidad se resuelve con un termómetro patrón dentro de la calibración de fábrica y no requiere laboratorio, y las tres magnitudes del sensor ambiental, cuya exactitud está confirmada por la hoja de datos del componente exacto y cuyo riesgo real es de montaje, no de sensor. Quedan fuera también, y esto es lo más importante, **N, P y K**.

La exclusión de N, P y K es deliberada y coherente con el resto del informe: esos tres valores no son determinaciones químicas independientes sino derivaciones de la conductividad eléctrica, de modo que contrastarlos contra un método de laboratorio mediría la correlación entre salinidad y fertilidad de los suelos muestreados, no la exactitud del instrumento. Validarlos sugeriría una capacidad analítica que la sonda no tiene. Por esa misma razón la aplicación los presenta como registros informativos con advertencia permanente, no construye diagnóstico nutricional con ellos y no permite prescribir dosis: la limitación se resuelve en la interfaz, no en la campaña de laboratorio.

| Elemento del protocolo | Especificación |
| --- | --- |
| Variables validadas | Humedad volumétrica, pH, conductividad eléctrica y textura |
| Variables excluidas y motivo | N, P y K, por ser derivaciones de la conductividad eléctrica y no determinaciones independientes; temperatura de suelo, resuelta con termómetro patrón en calibración de fábrica; magnitudes del BME280, confirmadas por hoja de datos del componente exacto |
| Tamaño de muestra | N ≥ 30 puntos de medición en total y **no menos de 10 por clase textural**, tomados en terreno y submuestreados el mismo día para envío a laboratorio |
| Diversidad de suelos | Al menos 3 clases texturales distintas (franco, arcilloso, arenoso), cubriendo el rango útil de pH (4,5–8,5) y de conductividad eléctrica (0–5.000 µS/cm), que es donde se toman las decisiones agronómicas reales |
| Referencia de laboratorio | pH según ISO 10390; conductividad eléctrica según ISO 11265; textura según ISO 11277; humedad volumétrica por gravimetría según ISO 11465. Laboratorio **acreditado bajo ISO/IEC 17025** para los ensayos solicitados |
| Estadístico de concordancia | Coeficiente de determinación (R²) entre lectura in situ y laboratorio; error cuadrático medio (RMSE) en la unidad nativa de cada variable; análisis de concordancia de Bland-Altman para detectar sesgo sistemático |
| Umbral de aceptación | Umbral agronómico propio: pH, RMSE ≤ 0,3 unidades; conductividad eléctrica, RMSE ≤ 10 % de la lectura o 200 µS/cm, el mayor de ambos; humedad volumétrica, RMSE ≤ 4 puntos porcentuales. Adicionalmente R² ≥ 0,80 y ausencia de sesgo proporcional significativo (p < 0,05) en Bland-Altman |
| Alcance del resultado | La campaña detecta sesgo grueso y desviación sistemática. El ajuste fino de coeficientes requiere una segunda campaña sobre la base instalada, prevista en el plan de calibración |
| Acción si no se cumple el umbral | La variable se marca como “referencial” en la app (no apta para prescripción cuantitativa de dosis ni de volúmenes) hasta recalibrar el coeficiente de compensación o sustituir el sensor asociado |

###### **Tabla 5.1 “Protocolo de Validación In Situ vs. Laboratorio de Referencia”**

**Por qué un umbral propio y no el del fabricante.** Una formulación aparentemente más rigurosa sería exigir que el error del instrumento no supere la exactitud declarada por el fabricante de la sonda, es decir ±0,1 unidades de pH. Este informe no la adopta, por dos razones. La primera es de evidencia: esa exactitud proviene de la ficha de una sonda representativa de la familia y no del SKU adquirido, como declara la tabla de estado probatorio, de modo que fijar el criterio de aprobación contra ella significaría medirse contra un número que el propio proyecto reconoce no tener verificado. La segunda es de pertinencia: ±0,1 unidades de pH es una exigencia de laboratorio, y el producto de este instrumento no es una cifra sino una decisión de manejo. Un error de 0,3 unidades de pH no cambia la recomendación de encalado para ningún cultivo de la matriz; uno de 0,8 sí la cambia. El umbral debe fijarse donde la decisión cambia, y por eso se declara en términos agronómicos y no metrológicos. El mismo criterio explica los umbrales de conductividad y de humedad: un error de 4 puntos de humedad volumétrica no altera el veredicto de riego, mientras que uno de 10 puntos sí lo altera.

## Plan de Calibración y Control de Deriva

La validación descrita responde una pregunta puntual: si el instrumento concuerda con el laboratorio en un momento dado. No responde la siguiente, que es la que determina si el dato sigue siendo confiable dos temporadas después: cómo se calibra cada equipo antes de salir de taller y cómo se detecta y corrige la deriva del sensor con el uso. Ambas cosas se planifican por separado.

La calibración no se ejecuta reescribiendo el firmware, sino ajustando los coeficientes que residen en la memoria no volátil del ESP32 y que, por diseño, son actualizables de forma remota. Esa decisión de arquitectura es la que hace viable el plan que sigue: corregir la deriva de un equipo en terreno no exige recuperarlo físicamente.

| Etapa | Qué se hace | Periodicidad | Criterio de aceptación | Evidencia que queda |
| --- | --- | --- | --- | --- |
| Calibración de fábrica | Verificación de cada unidad ensamblada contra soluciones patrón de pH (4,00 y 7,00) y de conductividad (1.413 µS/cm y 12.880 µS/cm), contraste de temperatura contra termómetro patrón, y ajuste de los coeficientes de compensación en memoria no volátil | Una vez por equipo, antes del despacho | Desviación dentro del umbral agronómico del protocolo de validación | Certificado de calibración individual con número de serie, fecha y valores medidos |
| Compensación térmica de la conductividad | Verificación de la normalización de la lectura de CE a 25 °C con el coeficiente de 2 %/°C exigido por ISO 11265 | Una vez por equipo, dentro de la calibración de fábrica | Error ≤ 3 % entre 5 °C y 35 °C | Registro de la curva de verificación térmica |
| Verificación periódica por el usuario | Comprobación con solución patrón de pH 7,00 mediante la rutina guiada de la aplicación, que compara la lectura con el valor esperado | Al inicio de cada temporada, o cada 6 meses | Desviación ≤ 0,3 unidades de pH | Registro guardado en el histórico del equipo, con fecha y resultado |
| Recalibración correctiva | Ajuste remoto de los coeficientes sobre el equipo específico, sin recuperarlo ni reemplazar el firmware | Cuando la verificación periódica excede el umbral | La verificación posterior vuelve a cumplir el criterio | Registro del coeficiente anterior y del nuevo, con su justificación |
| Retiro de la variable | La variable afectada se marca como “referencial” en la aplicación y deja de sustentar recomendaciones cuantitativas | Cuando la recalibración no recupera el criterio | — | Aviso al usuario en la pantalla de la variable y en el histórico |
| Control de deriva de la flota | Seguimiento agregado de las verificaciones periódicas sincronizadas, para detectar si la desviación es de un equipo o un patrón común del lote | Revisión semestral | Ningún lote con desviación media creciente y sostenida | Informe de deriva por lote de fabricación |

###### **Tabla 5.2 “Plan de Calibración y Control de Deriva”**

Tres precisiones sobre este plan. La primera es de alcance: la verificación del usuario emplea solución patrón de pH, que es barata, estable y de uso corriente en agricultura, y no pretende reproducir un laboratorio; su función es detectar que algo se desvió, no cuantificar cuánto con precisión metrológica. La segunda es de costo, y se conecta con el desglose económico: la calibración de fábrica es trabajo de taller y está contenida en las 2,25 horas por equipo que la nómina ya presupuesta, mientras que las soluciones patrón y el instrumental de referencia se cargan a la partida de metrología del rubro de desarrollo y validación. La tercera es de honestidad: la periodicidad semestral y los umbrales de esta tabla se fijan a partir del comportamiento típico de los electrodos de pH y de las sondas de conductividad, y deben confirmarse con la deriva que efectivamente muestre el SKU adquirido durante la primera temporada de operación; si resultara más rápida, la periodicidad se acorta antes de que el dato equivocado llegue al agricultor.

## Supuestos de Mercado Declarados

Dos cifras que sostienen la comparación de costo total de propiedad no provienen de una fuente bibliográfica publicable, sino de consultas de mercado realizadas por el equipo. Incluirlas en la lista de referencias bibliográficas induciría a error sobre su naturaleza, de modo que se declaran aparte, con su método de obtención y con la acción que las convertirá en dato verificable:

| Id. | Supuesto | Valor adoptado | Cómo se obtuvo | Qué falta para confirmarlo |
| :---: | --- | ---: | --- | --- |
| S1 | Costo de un análisis de suelo en laboratorio acreditado en Chile | $50.000 por muestra | Consulta de tarifarios publicados por laboratorios de suelos universitarios y comerciales del mercado nacional, sin fuente única | Cotización formal y fechada del laboratorio que se adopte como referencia en la campaña de validación |
| S2 | Costo de una visita de asesoría agronómica externa en Chile | $60.000 por visita | Consulta de tarifarios de consultores agronómicos independientes, sin fuente única | Cotización formal y fechada de al menos dos consultores de la zona de operación |

###### **Tabla 5.3 “Supuestos de Mercado Declarados”**

Ambos valores se utilizan exclusivamente como término de comparación en el costo total de propiedad del agricultor y no intervienen en ninguna línea del flujo de caja del proyecto, de modo que una desviación en ellos altera el argumento de adopción pero no el VAN, la TIR ni la caja de la empresa. La Tabla 2.3 presenta además dos intensidades de uso precisamente para que el lector pueda juzgar la sensibilidad del argumento frente a estos dos supuestos.

---

# VI. Conclusiones

La ingeniería conceptual desarrollada en este informe sostiene que es técnica y económicamente plausible democratizar la tecnología agrícola sin sacrificar precisión de medición ni rentabilidad comercial. La palabra *plausible* es deliberada: este documento cierra una etapa de diseño conceptual y evaluación, no una de verificación experimental, y esa distinción se mantiene en cada afirmación que sigue.

Desde la perspectiva ingenieril, la arquitectura descentralizada —un nodo portátil de captura (ESP32, sonda industrial y celda de ion-litio) que transfiere los datos al teléfono del usuario— responde directamente a las dos barreras identificadas en la problemática, porque traslada al teléfono el costo de la pantalla, el cómputo y el almacenamiento, y con ello el precio del instrumento. El diseño energético, basado en *power gating* para cortar físicamente la alimentación de la sonda en reposo y en la depuración de la placa de control, arroja una autonomía calculada de aproximadamente 8,5 meses (256 días, más de 2.500 mediciones) con una sola carga, superior a la de los dos equipos de referencia comparados y sin el recambio constante de pilas primarias. Esa cifra proviene del balance energético por nodo de tensión, con las eficiencias de conversión declaradas, y su confirmación exige medir el consumo de reposo de la placa ensamblada e intervenida: si apareciera una fuga no identificada de 1 mA la autonomía caería a 1,8 meses, y si la placa de desarrollo se montara sin intervenir caería a un mes escaso.

Desde la perspectiva económica, la evaluación a diez años (2027–2036) entrega un resultado favorable bajo las condiciones declaradas, con cada partida abierta y trazable hasta su origen. Con una estructura de financiamiento de $39.000.000 —un pie propio de $9.000.000 aportado en partes iguales por los socios, equivalente al 30 % del crédito, y un préstamo bancario de $30.000.000 a diez años y 12 % efectivo anual, con cuota fija de $419.842— el proyecto alcanza un VAN de $63.717.893 al 20 % de descuento, una TIR de 48,94 %, un payback simple de 2,88 años y uno descontado de 3,93 años. La empresa cancela la totalidad de su deuda dentro del horizonte evaluado y cierra 2036 con $329.777.729 de caja acumulada y sin pasivo bancario. El punto de tensión es único y está identificado: durante el primer año la cobertura del servicio de deuda alcanza 0,72, de modo que la cuota se paga en parte con la caja de arranque financiada para ese fin; desde 2028 esa cobertura sube a 3,44 y llega a 12,48 en el último año. Las sensibilidades acotan el margen de error: el proyecto resiste una caída del 10 % en las ventas o un alza del 15 % en el costo de materiales, y deja de crear valor y simultáneamente de tener caja si las ventas caen un 25 % o si el precio se rebaja a $299.990.

Desde la perspectiva del cliente, la comparación de costo total de propiedad se presenta sobre dos intensidades de uso declaradas, porque el resultado depende críticamente de con qué frecuencia el agricultor recurre hoy al laboratorio o a la asesoría. Bajo la intensidad habitual, que es el caso base, el instrumento no se paga el primer año y cruza a favor durante el segundo frente al laboratorio y durante el tercero frente a la asesoría, acumulando a diez años una ventaja de 2,7 y 1,6 veces respectivamente. El argumento estructural, sin embargo, no es el ahorro nominal sino el costo marginal cero de la medición repetida: a cien mediciones anuales, cada lectura cuesta $750 frente a los $50.000 de una muestra de laboratorio, y esa relación no depende de ningún supuesto de frecuencia. Corresponde insistir en que ese ahorro pertenece al agricultor y no aparece en ninguna línea del flujo de caja de la empresa.

Corresponde por eso precisar con exactitud qué acredita y qué no acredita este resultado, porque la diferencia decide si el proyecto pasa a la etapa siguiente o se declara concluido. **Lo que acredita** es que la arquitectura elegida es coherente con el problema, que la estructura de costos cierra con el precio propuesto, que el financiamiento es consistente y que el negocio, de cumplirse el plan de ventas, crea valor y paga su deuda. **Lo que no acredita:**

1. Que el precio de la sonda sea el presupuestado, porque aún no existe una orden de compra ni ficha técnica del SKU.
2. Que el consumo de reposo del conjunto ensamblado alcance los 19,4 µA presupuestados, porque la placa de control se compra como placa de desarrollo y su intervención en taller está definida pero no ejecutada ni medida.
3. Que la demanda responda como proyecta el plan comercial, porque todavía no hay un piloto pagado.
4. Que el banco otorgue el crédito en las condiciones supuestas, porque no hay oferta formal.
5. Que el equipo alcance IP67, porque el ensayo está presupuestado pero no ejecutado.
6. Que la sonda concuerde con el laboratorio dentro del umbral agronómico fijado, porque la campaña de 30 muestras es un plan y no un resultado.

Ninguna de esas seis verificaciones pendientes es un obstáculo oculto: todas están identificadas en este informe con su costo, su método y su criterio de aceptación, y ese es precisamente el aporte de la ingeniería conceptual. Las dos primeras concentran además el riesgo técnico y se atacan con el mismo gasto y en el mismo mes: pedir al proveedor la ficha del SKU y una unidad de muestra, e instrumentar una placa piloto para medir su reposo antes y después de la intervención. La decisión que el estudio respalda es continuar el desarrollo y ejecutar esas verificaciones, no comprometer volumen de compra ni declarar una viabilidad comprobada.

En síntesis, la ingeniería conceptual de TerraSense responde a su objetivo general: definir un sistema en el que una medición física se convierta, en el mismo lugar y sin conexión a internet, en una decisión agronómica accionable. Al eliminar los costos recurrentes y traducir valores numéricos planos en instrucciones de manejo, el diseño apunta a reducir el riesgo de pérdida de cosecha y a proteger el patrimonio familiar del pequeño agricultor; la magnitud efectiva de ese beneficio se medirá con los pilotos comparativos previstos, no se declara aquí. El resultado económico y el diseño técnico convergen en una misma decisión: construir una herramienta útil que pueda fabricarse, mantenerse y respaldarse con el margen presupuestado. Los próximos cierres se concentran en la medición del consumo de reposo del conjunto ensamblado, en la integración ambiental de extremo a extremo y en los ensayos del equipo terminado, trabajos que quedan identificados con su evidencia esperada y su criterio de aceptación.

---

# VII. Referencias bibliográficas

1. Centro de Ciencia del Clima y la Resiliencia (CR)². (s.f.). *Informe a la Nación: La mega sequía 2010–2015, una lección para el futuro*. Recuperado de https://www.cr2.cl/megasequia/
2. Instituto Nacional de Estadísticas (INE), Chile. (2021). *Censo Agropecuario y Forestal 2021. Resultados finales, gráficas nacionales*. Recuperado de https://www.ine.gob.cl/censoagropecuario/resultados-finales/graficas-nacionales
3. ODEPA. (2021). *Censo Agropecuario y Forestal 2021: distribución de las unidades productivas y sus cambios respecto al Censo 2007*. Recuperado de https://www.odepa.gob.cl/publicaciones/articulos/censo-agropecuario-y-forestal-2021-distribucion-de-las-unidades-productivas
4. INDAP. (s.f.). *Agricultura Familiar Campesina*. Recuperado de https://www.indap.gob.cl/agricultura-familiar-campesina
5. ODEPA. (s.f.). *Boletín macroeconómico y evolución reciente de los precios de los fertilizantes*. Recuperado de https://www.odepa.gob.cl/publicaciones/articulos/evolucion-reciente-de-los-precios-de-los-fertilizantes
6. Hanna Instruments. (s.f.). *GroLine HI9814*. Precio de referencia US$294. Recuperado de https://hannainst.com/groline-waterproof-portable-ph-ec-tds-meter/
7. Spectrum Technologies. (s.f.). *FieldScout TDR 350*. Precio de referencia US$1.495. Recuperado de https://www.specmeters.com/FieldScout-TDR350-Soil-Moisture-Meter
8. STMicroelectronics. (s.f.). *STM32WB55xx / STM32WB35xx Datasheet* (consumo de radio BLE a 0 dBm). Recuperado de https://www.st.com/resource/en/datasheet/stm32wb55rg.pdf
9. Nordic Semiconductor. (s.f.). *nRF52840 Product Brief* (consumo de radio BLE a 0 dBm). Recuperado de https://www.mouser.com/pdfdocs/Nordic_nRF52840_PB.pdf
10. METER Group. (s.f.). *TEROS 12 Soil Moisture, Temperature and EC Sensor*, representativo de la categoría de sondas de grado de investigación citada junto a Delta-T WET150 y Stevens HydraProbe. Recuperado de https://metergroup.com/products/teros-12/
11. Sensirion AG. (2023). *Datasheet SHT4x* (exactitud de temperatura ±0,2 °C). Recuperado de https://sensirion.com/media/documents/33FD6951/6555C40E/Sensirion_Datasheet_SHT4x.pdf
12. Bosch Sensortec. (2021). *BMP280 Datasheet* (exactitud de temperatura ±1,0 °C, sin medición de humedad). Recuperado de https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp280-ds001.pdf
13. Bosch Sensortec. (2024). *BME280 Datasheet* (exactitud ±1,0 °C / ±3 % HR / ±1,0 hPa; consumo 0,1 µA en reposo y 3,6 µA por muestreo en *forced mode*). Recuperado de https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf
14. Food and Agriculture Organization (FAO). (1998). *Crop Evapotranspiration – Guidelines for Computing Crop Water Requirements*, FAO Irrigation and Drainage Paper 56 (corrección del cálculo de evapotranspiración por presión atmosférica/altitud). Recuperado de https://www.fao.org/4/x0490e/x0490e00.htm
15. Subsecretaría de Telecomunicaciones (SUBTEL). (2024). *X Encuesta de Acceso y Usos de Internet 2023*: uso habitual de smartphone 88,5 % en zonas rurales. Recuperado de https://www.subtel.gob.cl/wp-content/uploads/2024/03/Informe_Final_Acceso_y_uso_Internet_2023_VF.pdf
16. Banco Central de Chile. (s.f.). *Dólar Observado — Base de Datos Estadísticos*, tipo de cambio de referencia usado para la conversión CLP/US$. Recuperado de https://si3.bcentral.cl/indicadoressiete/secure/indicadoresdiarios.aspx
17. Subsecretaría de Telecomunicaciones (SUBTEL). (2025). *Resolución N° 737: Actualización del régimen de certificación de equipos de telecomunicaciones*. Recuperado de https://www.subtel.gob.cl/
18. Ministerio de Hacienda / Biblioteca del Congreso Nacional (BCN). (2020). *Síntesis de la Ley N° 21.210 de Modernización Tributaria — Régimen Pro Pyme*. Recuperado de https://obtienearchivo.bcn.cl/obtienearchivo?id=repositorio/10221/28765/2/BCN_Reforma_Tributaria_2020_edit.pdf
19. Espressif Systems. (s.f.). *ESP32-WROOM-32 Datasheet* (consumo dinámico, reposo profundo del módulo y FCC ID 2AC7Z-ESPWROOM32). Recuperado de https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf
20. Sumeet Instruments. (s.f.). *7 in 1 Integrated Soil Sensor NPK-pH-EC-Temperature-Moisture, RS485*, alimentación 5–24 V DC. Ficha técnica de referencia de familia de producto (0,15 W a 12 V DC; 0,5 W a 24 V DC). Recuperado de https://sumeetinstruments.com/Soil-NPK-pH-EC-Temperature-Moisture-7in1-Sensor-RS485
21. INJOINIC Technology. (s.f.). *IP5306: Multi-functional High-Efficiency Charging and Discharging Chip* (corriente de pérdida en reposo y eficiencia de conversión boost, representativo de la PCB combinada USB-C carga + boost). Recuperado de https://www.lcsc.com/product-detail/C181692.html
22. Holtek Semiconductor. (s.f.). *HT75xx-3 100 mA TinyPower LDO* (corriente de quiescente típica 2,5 µA). Recuperado de https://www.holtek.com/documents/10179/116711/HT75xx-3v140.pdf
23. World Wide Web Consortium (W3C). (2018). *Web Content Accessibility Guidelines (WCAG) 2.1, nivel AA*. Recuperado de https://www.w3.org/TR/WCAG21/
24. MaxLinear (ex Exar / Sipex). (s.f.). *SP3485: 3.3 V Low Power Half-Duplex RS-485 Transceiver with 10 Mbps Data Rate. Datasheet*. Recuperado de https://www.maxlinear.com/ds/sp3485.pdf
25. Bluelab. (s.f.). *Pulse Multimedia EC/MC Meter*. Precio de lista US$339. Recuperado de https://bluelab.com/products/bluelab-pulse-multimedia-ec-mc-meter
26. Ministerio del Medio Ambiente. (2016). *Ley N° 20.920: Marco para la gestión de residuos, la responsabilidad extendida del productor y fomento al reciclaje (REP)*. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1091081
27. International Electrotechnical Commission (IEC). (s.f.). *IEC 60529: Degrees of protection provided by enclosures (IP Code)*. Recuperado de https://webstore.iec.ch/publication/2452
28. Organización de las Naciones Unidas (ONU) / IEC. (s.f.). *UN 38.3 / IEC 62133-2: Ensayos y seguridad de celdas y baterías secundarias de ion-litio*. Recuperado de https://webstore.iec.ch/publication/60070
29. Subsecretaría de Telecomunicaciones (SUBTEL). (2017). *Resolución Exenta N° 1.985: Fija norma técnica de equipos de alcance reducido*. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1109333
30. Federal Communications Commission (FCC). (s.f.). *Título 47 CFR Parte 15, subpartes B y C*. Recuperado de https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-15
31. Telecommunications Industry Association (TIA). (1998). *Norma TIA/EIA-485-A: Características eléctricas de los generadores y receptores para su uso en sistemas multipunto digitales balanceados*. Recuperado de https://global.ihs.com/
32. Modbus Organization. (2006). *Modbus Application Protocol Specification V1.1b3*. Recuperado de https://modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf
33. Organización Internacional de Normalización (ISO). (2021). *ISO 10390: Calidad del suelo — Determinación del pH*. Recuperado de https://www.iso.org/standard/75243.html
34. Organización Internacional de Normalización (ISO). (1994). *ISO 11265: Calidad del suelo — Determinación de la conductividad eléctrica específica*. Recuperado de https://www.iso.org/standard/19243.html
35. Organización Internacional de Normalización (ISO). (2009). *ISO 11277: Calidad del suelo — Determinación de la distribución del tamaño de partícula en material de suelo mineral (granulometría y textura)*. Recuperado de https://www.iso.org/standard/54151.html
36. Organización Internacional de Normalización (ISO). (1993). *ISO 11465: Calidad del suelo — Determinación del contenido de materia seca y de agua sobre base másica. Método gravimétrico*. Recuperado de https://www.iso.org/standard/20886.html
37. Ministerio Secretaría General de la Presidencia. (1999). *Ley N° 19.628 sobre Protección de la Vida Privada*. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=141599
38. Ministerio Secretaría General de la Presidencia. (2024). *Ley N° 21.719 que regula la protección y el tratamiento de los datos personales y crea la Agencia de Protección de Datos Personales*. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1208650
39. Organización Internacional de Normalización (ISO) / IEC. (2022). *ISO/IEC 27001:2022 (Sistemas de gestión de seguridad de la información) e ISO/IEC 25010 (Calidad de software)*. Recuperado de https://www.iso.org/standard/27001.html
40. Ministerio de Economía, Fomento y Turismo. (2021). *Ley N° 21.398 (“Pro Consumidor”)*. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=1170464
41. Ministerio de Economía, Fomento y Turismo. (1997). *Ley N° 19.496: Establece normas sobre protección de los derechos de los consumidores*. Recuperado de https://www.bcn.cl/leychile/navegar?idNorma=61438

**Nota sobre los supuestos de mercado.** Los costos de referencia del análisis de laboratorio y de la visita de asesoría agronómica no figuran en esta lista porque no provienen de una fuente bibliográfica publicable. Se declaran como supuestos de trabajo, identificados como S1 y S2, en la Tabla 5.3 “Supuestos de Mercado Declarados”, junto con su método de obtención y la cotización formal que los reemplazará.
