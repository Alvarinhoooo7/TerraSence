# Motor agronómico TerraSense: especificación de desarrollo

**Estado: implementación iniciada, E1 en progreso.** Este documento define el motor que se quiere desarrollar; no acredita que todas las capacidades propuestas estén implementadas, calibradas o validadas en campo. La sección 2 identifica el comportamiento del código disponible. El [task del motor agronómico](TASK_MOTOR_AGRONOMICO.md) detalla las subtareas, evidencias y pendientes de cada entrega.

El objetivo es obtener la mayor orientación agronómica defendible de la sonda, el BME280 y los servicios climáticos, **sin pedir al agricultor datos obligatorios nuevos**: la única pregunta añadida es la especie, opcional, en vegetativo, floración y cosecha. El motor debe explicar condiciones y posibilidades, reconocer lo que desconoce y ayudar a decidir qué revisar y cuándo. No diagnostica rendimiento, nutrición química, enfermedades ni madurez mediante variables que no miden esos fenómenos.

## Índice

- [1. Alcance y criterios de producto](#alcance)
- [2. Estado actual y fuentes de verdad](#estado)
- [3. Arquitectura propuesta](#arquitectura)
- [4. Las diez variables y su calidad](#variables)
- [5. Servicios climáticos y adquisición](#clima)
- [6. Indicadores derivados y combinaciones](#indicadores)
- [7. Catálogo de plantas y evidencia](#catalogo)
- [8. Reglas por etapa](#etapas)
- [9. Priorización, incertidumbre y redacción](#salidas)
- [10. Históricos y comparabilidad](#historicos)
- [11. Contratos, versiones y persistencia](#contratos)
- [12. Pantallas propuestas y justificación](#pantallas)
- [13. Validación y criterios de aceptación](#validacion)
- [14. Orden de implementación](#implementacion)
- [15. Decisiones y límites de activación](#decisiones)
- [16. Fuentes consultadas](#fuentes)

<a id="alcance"></a>
## 1. Alcance y criterios de producto

### 1.1. Entradas autorizadas

El usuario elige la etapa: pre-siembra, vegetativo, floración o cosecha. En vegetativo, floración y cosecha puede además indicar, de forma opcional, la especie que tiene plantada (sección [12.1](#pantallas)). En pre-siembra no se pregunta: la etapa responde qué conviene sembrar. El motor puede recibir automáticamente:

- Las diez variables del equipo y sus ausencias explícitas.
- Fecha y hora de captura, identificación del equipo y metadatos técnicos existentes.
- Coordenadas y precisión del GPS cuando el usuario ya autorizó incluir ubicación.
- Pronóstico, antecedentes meteorológicos modelados e información climática histórica para esas coordenadas, cuando haya conexión y disponibilidad.
- Catálogos y reglas distribuidos con la aplicación, con fuentes y versiones.
- Históricos propios autorizados, únicamente para operaciones que respeten su comparabilidad.

La especie se guarda **por medición**, no por campo: la app no agrupa mediciones por campo y no recuerda la especie de una medición anterior. Omitirla («Saltar») es una respuesta válida y deja la medición sin especie, con el mismo análisis general.

No agregar formularios para variedad, textura, profundidad, fecha de siembra, riego, superficie o tipo de instalación. No deducir la especie ni esos datos a partir de la etapa, de la última sugerencia consultada, de la identidad del equipo, de mediciones anteriores o de una coincidencia del catálogo. Consultar una ficha nunca equivale a seleccionar una especie.

La falta de coordenadas conserva el análisis local. No usar una ciudad por defecto, ubicación de la cuenta, IP ni coordenadas antiguas de otra captura para aparentar clima local. La georreferenciación sigue existiendo como dato; no se reintroduce un mapa.

### 1.2. Qué significa «más completo»

Una mejora aporta valor si introduce una conclusión verificable, un contexto útil o una decisión más clara. No basta con incorporar un número adicional al resultado. Cada indicador debe declarar entradas, fórmula, escala temporal, fuente, límites, reglas consumidoras y comportamiento sin datos.

Se buscan cinco resultados:

1. **Pre-siembra:** alternativas de establecimiento compatibles con los criterios que sí se pudieron revisar, con razones y limitaciones por alternativa.
2. **Vegetativo:** revisión de condiciones físicas que pueden dificultar el crecimiento. Con especie indicada, se agregan los criterios de su perfil que tengan evidencia; sin especie, no se atribuye una respuesta a una especie desconocida.
3. **Floración:** exposición ambiental y ventanas de atención, sin afirmar daño floral ni cuaja. Con especie indicada, se agregan sus sensibilidades florales documentadas.
4. **Cosecha:** comparación de condiciones meteorológicas para organizar labores; no decisión de madurez ni autorización de tránsito, aunque se indique la especie.
5. **Todas las etapas:** calidad del dato, explicación trazable, acciones coherentes y conservación del resultado original.

### 1.3. No objetivos

Quedan fuera: recetas de fertilización o enmiendas, litros o minutos de riego, identificación automática de cultivo/textura, predicción de rendimiento, diagnóstico de patógenos, calendario de maduración sin especie/fecha de inicio, certificación de aptitud de un huerto e instrucciones de aplicación de plaguicidas. Tampoco se incorpora un modelo generativo para inventar recomendaciones: las salidas son deterministas y auditables.

<a id="estado"></a>
## 2. Estado actual y fuentes de verdad

| Responsabilidad | Fuente local | Situación observada |
|---|---|---|
| Entrada BLE y validación de rangos | [probeService.ts](src/services/probeService.ts), [contrato BLE](../docs/CONTRATO_BLE.md) | Decodifica suelo, ambiente y batería; rechaza suelo inválido y distingue ausencias ambientales. |
| Calidad y procedencia de entradas | [inputQuality.ts](src/engine/inputQuality.ts), [tipos agronómicos](src/types/agronomy.ts) | Contrato versionado de las diez variables, fuentes, unidades, tiempos y limitaciones; se muestra en detalles y se conserva con capturas nuevas. La aplicación de todos sus límites a las reglas sigue pendiente. |
| Transporte y cancelación | [bleService.ts](src/services/bleService.ts) | Fuente del transporte, no del significado agronómico. |
| Perfiles y cálculo de déficit de presión de vapor | [agronomyEngine.ts](src/engine/agronomyEngine.ts) | Catálogo acotado, comparación por temperatura mínima, pH y conductividad; ya existe cálculo local de déficit de presión de vapor. |
| Etapas | [stageEvaluator.ts](src/engine/stageEvaluator.ts) | El flujo usa `evaluateReadingForStage`, sin asignar cultivo ni textura. La evaluación con perfiles explícitos se conserva aparte. |
| Consejos y coincidencias | [contextualAdvice.ts](src/engine/contextualAdvice.ts) | Combina acciones con avisos climáticos; las coincidencias de cultivos todavía no incorporan el pronóstico. |
| Clima | [weatherService.ts](src/services/weatherService.ts) | Consulta condiciones actuales y resúmenes diarios; presenta los próximos cinco días, sin serie horaria de decisión. |
| Captura y guardado | [MeasureScreen.tsx](src/screens/MeasureScreen.tsx) | Fija contexto y captura; el clima llega de forma asíncrona y no bloquea guardar. |
| Presentación e históricos | [measurementPresentation.ts](src/engine/measurementPresentation.ts) | Conserva diagnóstico; las sugerencias nuevas se guardan en la presentación. |
| Resultado visible | [MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx) | Resumen, familias de variables, recomendaciones, plan global y pronóstico. |
| Estado del instrumento | [Firmware/TASK.md](../Firmware/TASK.md) | Referencia para integración y pruebas físicas. Una prueba de software no certifica mediciones reales. |

### 2.1. Brechas concretas que esta propuesta debe resolver

- La evaluación general consulta el conjunto de perfiles. Agregar una especie puede cambiar el estado de una variable: el diagnóstico general debe independizarse del tamaño del catálogo.
- La coincidencia térmica usa un mínimo sin máximo; una temperatura excesiva puede pasar el filtro. Tampoco distingue sistemáticamente semilla, trasplante y plantación.
- Los umbrales de conductividad del catálogo no contienen un contrato de método de medición ni equivalencia demostrada con la sonda.
- El pH necesita trazabilidad de método y calibración; el número que informa el equipo no acredita equivalencia con cada referencia de laboratorio.
- Las reglas específicas de floración son provisionales. Una reducción porcentual uniforme de tolerancias no constituye un modelo validado de respuesta floral.
- Humedad volumétrica sin textura, profundidad ni curva de retención no permite calcular agua disponible para raíces.
- Los primeros incrementos conservan información climática parcial útil sin inventar ceros ni exigir temperatura actual, validan unidades devueltas y registran estados y motivos por dato. E1.3 incorpora cobertura por capacidad y una política técnica de antigüedad en capturas nuevas; el task detalla su alcance y pendientes.
- El flujo nuevo separa estado semántico, cobertura y limitaciones de evidencia. Falta completar la independencia de las reglas ambientales y revisar sus fuentes. «No detecté alertas» no puede traducirse automáticamente a «todo está favorable».
- Las magnitudes ambientales y el pronóstico están desaprovechados para comparaciones temporales y combinaciones explicables.

Las cifras de las reglas actuales viven en el código enlazado. Este documento no las duplica como si fueran parámetros aprobados del motor futuro.

<a id="arquitectura"></a>
## 3. Arquitectura propuesta

Esta especificación contiene las capacidades y decisiones de diseño. El [task de implementación](TASK_MOTOR_AGRONOMICO.md), solicitado para revisar el avance paso a paso, concentra las casillas y evidencias sin duplicar parámetros ni mantener un registro de cambios.

| Capacidad | Responsabilidad | Dependencias |
|---|---|---|
| `input-quality` | Normalizar unidades, procedencia, intervalos temporales y calidad | Contrato del equipo y contratos del proveedor |
| `weather-context` | Obtener y normalizar clima; caché y degradación | `input-quality` |
| `evidence-catalog` | Lista de especies, perfiles, fuentes, parámetros y condiciones de aplicación | Ninguna entrada del agricultor |
| `species-rules` | Criterios del perfil de la especie indicada en vegetativo, floración o cosecha | `derived-indicators`, `evidence-catalog`, especie opcional de la medición |
| `derived-indicators` | Cálculos físicos y resúmenes temporales reproducibles | `input-quality`, `weather-context` |
| `stage-risks` | Reglas ambientales independientes del catálogo de especies | `derived-indicators`, registro de reglas documentadas |
| `crop-options` | Comparaciones por perfil sólo en pre-siembra | `derived-indicators`, `evidence-catalog` |
| `decision-composer` | Resolver prioridades y conflictos; generar razones | `stage-risks`, `crop-options`, `species-rules` |
| `result-snapshot` | Presentación, trazabilidad y guardado inmutable | `decision-composer` |

```mermaid
flowchart TD
    A[Captura de sonda y BME280] --> Q[Calidad y normalizacion]
    B[Clima para la captura] --> Q
    Q --> I[Indicadores derivados]
    I --> R[Riesgos por etapa]
    I --> C[Opciones de pre-siembra]
    E[Perfiles y evidencia] --> C
    U[Especie opcional de la medicion] --> P[Criterios de la especie]
    E --> P
    I --> P
    F[Reglas ambientales documentadas] --> R
    R --> D[Prioridades y explicaciones]
    C --> D
    P --> D
    D --> S[Resultado versionado]
    S --> V[Pantallas existentes y detalles opcionales]
    S --> H[Historico sin recalculo]
```

**Invariante:** añadir o retirar un perfil puede cambiar las opciones de pre-siembra y los criterios de esa especie, nunca los indicadores físicos ni una alerta ambiental general. Las alertas específicas de un perfil sólo se aplican a la medición si el usuario indicó esa especie; en cualquier otro caso permanecen dentro de su ficha. Indicar o saltar la especie no altera las reglas generales.

<a id="variables"></a>
## 4. Las diez variables y su calidad

### 4.1. Inventario operativo

| Variable | Procedencia y unidad interna | Uso propuesto | Lo que no permite concluir |
|---|---|---|---|
| Humedad de suelo `vwc` | Sonda, porcentaje volumétrico reportado | Describir el punto; revisión de extremos documentados; contexto de lectura de CE | Dosis de riego, textura, saturación universal, humedad de toda la zona radicular |
| Temperatura de suelo `temp` | Sonda, °C | Comparar condiciones de establecimiento; extremos térmicos del punto | Temperatura de toda la raíz, daño o días exactos de germinación |
| Conductividad `ec` | Sonda, µS/cm | Registro y evolución comparable; advertencias si el método está caracterizado | Fertilidad, sal específica, sodicidad o equivalencia automática con extractos de laboratorio |
| pH `ph` | Sonda, sin dimensión | Acidez del punto y coincidencias parciales, con límite de método | Dosis de cal/azufre, capacidad tampón o deficiencia de un nutriente |
| Nitrógeno `nitrogen` | Registro de la sonda | Calidad, trazabilidad y mensaje de no validación | Concentración química confirmada o recomendación de fertilización |
| Fósforo `phosphorus` | Registro de la sonda | Igual política que nitrógeno | Disponibilidad para la planta, bloqueo o dosis |
| Potasio `potassium` | Registro de la sonda | Igual política que nitrógeno | Balance nutricional o dosis |
| Temperatura de aire `airTemp` | BME280, °C o ausencia | Déficit de presión de vapor, punto de rocío aproximado y contexto térmico | Temperatura foliar, del fruto o del interior de una instalación distinta |
| Humedad de aire `airHumidity` | BME280, % o ausencia | Cálculos psicrométricos junto con temperatura simultánea | Mojamiento foliar, infección o humedad del suelo |
| Presión `airPressure` | BME280, hPa o ausencia | Consistencia física y cálculos atmosféricos auxiliares con uso demostrado | Predicción local de lluvia o tormenta desde una captura |

La batería, fecha, coordenadas y versiones son metadatos adicionales, no variables agronómicas extra. El campo heredado `lux` no es una medición disponible: el decodificador lo rellena con cero. No se usará ese cero para inferir oscuridad, radiación o fotoperíodo.

La trama operativa sigue siendo de **20 bytes**. Los 16 bytes son tolerancia de lectura de prototipos; no se propone otro modo ni un cambio del contrato. Si falta ambiente, el motor conserva suelo y suspende sólo los cálculos que necesitan BME280.

### 4.2. Política de calidad

Cada dato debe conservar `source`, unidad, instante o intervalo válido, estado de disponibilidad y motivo de limitación. Estados mínimos: disponible, ausente, inválido, antiguo y no caracterizado para esta interpretación. No reemplazar ausencias con promedios o referencias de cultivo.

La resolución de transmisión no es exactitud del instrumento. La especificación del BME280 describe el componente; su integración, exposición al sol, contacto con la mano y estabilización pueden afectar la lectura del equipo. No presentar el error nominal del fabricante como incertidumbre garantizada de la captura. [Fuente BME280](#s04).

La calidad se trata en tres niveles separados:

1. **Integridad:** paquete, centinelas, rangos físicos, finitud, unidades y reloj.
2. **Medición:** calibración conocida, condiciones de adquisición y representatividad. Una captura puede ser íntegra pero no representativa del campo.
3. **Interpretación:** existencia de evidencia y correspondencia entre método, etapa y variable.

No afirmar «sensor estabilizado» con una sola muestra. Si el transporte ya entrega varias muestras de una misma captura, se puede estudiar estabilidad; no exigir al usuario otra variable ni inventar una serie. Su implementación debe respetar cancelación, consumo y contrato BLE.

### 4.3. Conductividad, pH y nutrientes

**Conversión de unidades no es conversión de método.** Una CE de sonda, de solución del suelo, de extracto saturado o de una dilución de laboratorio son observaciones distintas. Las relaciones entre ellas requieren información o calibraciones específicas; no se puede recuperar todo a partir de CE y humedad reportadas. Tampoco se compensa por temperatura sin comprobar antes qué compensación realiza el equipo. [METER](#s05), [FAO sobre salinidad](#s06).

Propuesta para cada lectura: `ecMethod = unknown | bulk | pore_water | saturated_extract | other_documented`, definido por caracterización técnica, no por un selector del cliente. Inicialmente, usar `unknown` si no hay evidencia suficiente. Sin método compatible, un límite bibliográfico de salinidad no excluye categóricamente una especie ni activa instrucciones de lavado.

En pH registrar si la referencia procede de suelo/agua, suelo/sal u otra preparación. Sin equivalencia demostrada, rotular la coincidencia como parcial. Un suelo ácido no es universalmente perjudicial: existen perfiles acidófilos.

Los registros N, P y K siguen excluidos de compatibilidad, riesgo nutricional y dosis. La política no depende de probar que toda sonda usa exactamente el mismo algoritmo interno: basta con que estos registros no tengan validación química independiente para el equipo utilizado. Su correlación con CE no crea tres mediciones independientes adicionales.

<a id="clima"></a>
## 5. Servicios climáticos y adquisición

### 5.1. Principio de uso

«Aprovechar todos los datos» significa revisar su utilidad y consumir los que sostienen decisiones. No significa descargar todas las variables de todos los modelos en cada medición.

Open-Meteo ofrece datos actuales modelados, series horarias y agregados diarios. Dispone de temperatura, humedad, rocío, viento, radiación, precipitación, presión y evapotranspiración de referencia; algunas variables dependen del modelo. Sus series de suelo son modeladas y tienen capas definidas. [Documentación del proveedor](#s01).

El adaptador comprobará claves, unidades y disponibilidad con respuestas de prueba para Chile antes de activar cada grupo. No prometer cobertura uniforme por aparecer una variable en la documentación general.

### 5.2. Grupos de consulta propuestos

Identificadores de referencia del proveedor; cada grupo se normaliza a un contrato interno y se verifica antes de implementarlo. La finalidad de la última columna es una decisión de diseño de TerraSense.

| Grupo | Variables a consultar | Finalidad propuesta |
|---|---|---|
| Aire | `temperature_2m`, `relative_humidity_2m`, `dew_point_2m` | Exposición térmica y humedad ambiental previstas |
| Agua atmosférica | `precipitation`, `precipitation_probability`, `rain`, `showers` | Momento, cantidad y posibilidad de precipitación, tratados por separado |
| Viento | `wind_speed_10m`, `wind_gusts_10m`, `wind_direction_10m` | Contexto de demanda ambiental y organización de labores |
| Energía | `shortwave_radiation`, `et0_fao_evapotranspiration` | Energía y demanda atmosférica de referencia |
| Apoyo atmosférico | `vapour_pressure_deficit`, `surface_pressure`, `cloud_cover`, `is_day`, `weather_code` | Contraste de cálculos, contexto y explicaciones |
| Resumen diario | `temperature_2m_min`, `temperature_2m_max`, `precipitation_sum`, `precipitation_probability_max`, `wind_gusts_10m_max`, `et0_fao_evapotranspiration`, `sunrise`, `sunset` | Lectura resumida del horizonte |
| Contexto de suelo, opcional | `soil_temperature_6cm`, `soil_temperature_18cm`, `soil_moisture_3_to_9cm`, `soil_moisture_9_to_27cm` | Situar la región; nunca sustituir ni calibrar automáticamente la sonda |
| Nieve, opcional | `snowfall`, `snow_depth`, `freezing_level_height` | Identificar contexto meteorológico especial cuando esté disponible |

No sumar `precipitation + rain + showers`: se duplicaría parte del mismo fenómeno. No sumar ET₀ horaria y diaria para un mismo intervalo. No traducir probabilidad máxima diaria a probabilidad de que llueva en un horario concreto.

No consumir inicialmente presión en altura, irradiancia sobre paneles inclinados, temperatura aparente, fases lunares ni índices convectivos para decidir aptitud de cultivos. No existe en esta propuesta una regla agronómica justificada que necesite esos datos. Los indicadores de exposición humana, si se incorporan después, pertenecen a otro objetivo y no al diagnóstico del cultivo.

### 5.3. Resolución, horizonte y tiempo

**Configuración de producto propuesta, no umbral agronómico:** usar el resto del día de captura y cinco días siguientes. Analizar con mayor detalle las próximas 48 horas; ofrecer comparación diaria en el resto. No omitir una helada esta noche por comenzar la lista en «mañana».

Solicitar horas reales cuando estén disponibles. Una interpolación a intervalos menores no añade evidencia meteorológica nueva. Guardar UTC para operar e identificar intervalos; usar zona horaria para presentar fechas. Las sumas y promedios se asocian a su intervalo, no se tratan como observaciones instantáneas.

El adaptador debe probar los cambios de hora de Chile y los días de longitud distinta. Si un proveedor usa límites diarios con desplazamiento fijo, conservar esa convención explícita o agregar desde horas en UTC a los días locales; no mezclar silenciosamente ambos criterios. No asumir que todo día contiene 24 muestras.

`fetchedAt` es el momento de descarga. No llamarlo hora de emisión del modelo. Guardar `issuedAt` sólo cuando el producto realmente lo proporcione; el tiempo de procesamiento de la API tampoco es la emisión. La captura local y el clima tienen fechas distintas y deben conservarlas.

### 5.4. Históricos, climatología y conjuntos de pronósticos

El servicio histórico de Open-Meteo permite trabajar con reanálisis: son reconstrucciones modeladas, no mediciones de esta sonda. Se propone un módulo opcional, almacenado en caché, para contexto de estacionalidad, exposición histórica a frío/calor y evaluación climática parcial de perennes. No bloqueará la medición local. [API histórica](#s02).

Distinguir tres productos: clima histórico reconstruido, pronóstico que se emitió en el pasado y pronóstico actual. Sólo el segundo permite verificar qué se habría sabido al recomendar. No validar predicciones con información futura incorporada retrospectivamente.

No elegir una ventana histórica arbitraria y llamarla «clima normal». Registrar período, producto, resolución, cobertura, faltantes y representatividad. La falta de variedad impide afirmar que un frutal cumple sus requerimientos de frío, aunque se puedan calcular indicadores climáticos generales.

Los conjuntos de pronósticos son una extensión para mostrar dispersión entre escenarios. La fracción de miembros que supera un umbral no se presentará como probabilidad calibrada de daño agrícola. Sólo se activará si mejora decisiones y se valida el contrato del producto. [API de conjuntos](#s03).

### 5.5. Caché, consumo y errores

- Clave de caché: ubicación usada, producto/modelo, variables, período, unidades y versión del adaptador. La antigüedad de descarga no reemplaza la validez temporal de cada dato.
- Se puede compartir una respuesta meteorológica idéntica entre capturas autorizadas; nunca compartir mediciones privadas ni redondear ubicación sin justificar el efecto espacial.
- Una respuesta parcial no invalida automáticamente las otras variables. Un error en un grupo opcional no bloquea el grupo principal.
- Mantener límite de espera y cancelación del flujo existente. Permitir guardar la evaluación local mientras llega el clima.
- Definir en implementación una política versionada de frescura por producto. Una caché fuera de vigencia se identifica y no produce nuevas instrucciones de horario como si fuera actual.
- Consultar historia sólo cuando sea necesaria; no descargar décadas en cada lectura. Medir bytes, demora y aciertos de caché antes de ampliar solicitudes.
- Para distribución comercial, resolver acceso, atribución y condiciones del proveedor; no incrustar credenciales comerciales en la aplicación. La documentación consultada distingue acceso gratuito no comercial y comercial. [Condiciones de Open-Meteo](#s19).

### 5.6. Degradación exigida

| Situación | Resultado que debe mantenerse |
|---|---|
| Sin ubicación | Evaluación local y catálogo parcial; sin pronóstico atribuido al campo |
| Sin red | Resultado local; caché sólo con procedencia y vigencia visibles |
| Sin BME280 | Suelo y pronóstico disponibles; derivados locales del aire ausentes |
| Sin horas, con días | Comparación diaria; no inventar duración u hora del episodio |
| Falta viento o radiación | Suspender la combinación que los necesita, conservar las demás |
| Falta historia climática | No evaluar adecuación de largo plazo; mantener posibilidades de corto plazo |
| Pronóstico contradictorio con aire local | Conservar ambos y explicar diferencia de tiempo/escala; no corregir automáticamente uno con otro |
| Datos simulados | Uso de pruebas identificado; nunca persistirlos como medición real |

<a id="indicadores"></a>
## 6. Indicadores derivados y combinaciones

### 6.1. Cálculos físicos locales

Las siguientes fórmulas son propuestas de cálculo, no umbrales universales de cultivo. Se calculan con valores no redondeados; se redondea al presentar. `T` es temperatura del aire en °C y `HR` es humedad relativa en porcentaje.

**Presión de vapor y déficit atmosférico.** Para el dominio de aplicación de la ecuación sobre agua:

```text
es(T) = 0.6108 × exp(17.27 × T / (T + 237.3))   [kPa]
ea    = es(T) × HR / 100                       [kPa]
DPV   = es(T) - ea                            [kPa]
```

El déficit de presión de vapor (DPV; VPD en identificadores existentes) caracteriza el aire. La formulación de presión de saturación y humedad procede de FAO-56. No es el déficit hoja–aire porque no medimos temperatura foliar. No convertir un DPV elevado en marchitez diagnosticada ni en litros consumidos. [FAO-56, datos meteorológicos](#s07).

**Punto de rocío aproximado.** Puede obtenerse invirtiendo esa misma relación:

```text
x  = ln(ea / 0.6108)
Td = 237.3 × x / (17.27 - x)                   [°C]
separacionRocio = T - Td                       [°C]
```

Se trata de una derivación matemática de la ecuación anterior. Con HR cero, entradas ausentes/no finitas o fuera de dominio, no calcular `Td`; no introducir un mínimo artificial de humedad. Cerca de congelación distinguir referencia sobre agua/hielo: no usar esta aproximación como cálculo certificado de escarcha. La proximidad al rocío sugiere cercanía a saturación del aire, no prueba agua sobre hojas.

**Presión.** Convertir hPa a kPa si se necesita. La constante psicrométrica `gamma = 0.000665 × P` puede calcularse con presión en kPa, según FAO-56, pero no completa por sí sola una estimación de evapotranspiración. Se mantendrá como cálculo auxiliar sólo si existe una función consumidora justificada; no hace falta mostrarla al agricultor. [FAO-56](#s07).

**Contrastes térmicos.** `Tsuelo - Taire` es una diferencia observada, útil para explicar que suelo y aire están en condiciones distintas. No se traduce a temperatura radicular futura, estrés o inversión térmica desde una sola captura. No comparar con la API sin alinear tiempo y reconocer diferencias de altura y exposición.

### 6.2. Resúmenes climáticos calculables

| Indicador propuesto | Entradas | Operación | Restricción de interpretación |
|---|---|---|---|
| Mínima/máxima del intervalo | Temperaturas horarias | Extremos entre horas disponibles | Informar cobertura; un faltante puede ocultar el extremo real |
| Duración de exposición | Temperatura o DPV horarios y umbral documentado | Duración de intervalos que cumplen la condición | No inferir duración con una mínima/máxima diaria |
| Episodio continuo | Serie horaria completa | Agrupar intervalos contiguos | Un hueco corta el episodio; no unir sobre ausencia |
| Precipitación acumulada | Cantidades por intervalo | Suma sin solapamientos | Agua atmosférica prevista, no infiltración o agua útil |
| Persistencia de humedad ambiental | HR/rocío horarios | Duración de una condición documentada | No equivale a mojamiento foliar medido |
| Demanda de referencia acumulada | ET₀ del proveedor | Suma de intervalos compatibles | No es consumo del cultivo |
| Diferencia lluvia–ET₀ | Precipitación y ET₀ en igual período | `ΣP - ΣET₀` | Indicador meteorológico; no balance del agua del suelo |
| Exposición energética | Radiación horaria media | Integración temporal con unidades | No equivale a luz recibida por hojas bajo sombra/cubierta |
| Luz diurna astronómica | Salida/puesta del sol o cálculo documentado | Duración del día | No determina horas de luz efectiva ni floración sin perfil |
| Separación aire–rocío prevista | Temperatura y rocío de la API | Diferencia por hora | Aproximación ambiental; no diagnóstico de enfermedad |
| Dispersión de escenarios | Miembros de un mismo conjunto | Rango o cuantiles declarados | No garantía de cobertura estadística ni probabilidad de daño |

ET₀ representa una superficie de referencia, no cualquier cultivo. Estimar consumo específico requiere más supuestos; el motor no asignará un coeficiente de cultivo oculto. Tampoco supondrá que toda la lluvia entra al suelo o que una cantidad fija reemplaza un riego. [FAO-56, método de referencia](#s08).

Para radiación, integrar `W/m² × segundos / 10^6` para obtener MJ/m². No mezclar promedios horarios con valores instantáneos. El sistema no convertirá esa energía a lux de la sonda ni estimará fotosíntesis, biomasa o producción.

### 6.3. Combinaciones que pueden aportar decisiones

| ID | Combinación | Conclusión permitida | Acción o explicación posible | Condición para activarla |
|---|---|---|---|---|
| C01 | Aire cálido/seco + DPV + pronóstico | Demanda atmosférica elevada observada o prevista | Priorizar revisión del estado hídrico durante el episodio | Umbral y dominio documentados; no afirmar déficit en raíces |
| C02 | C01 + humedad del suelo | Presentar demanda y lectura de suelo juntas | «Hay demanda ambiental y esta humedad en el punto; revisa disponibilidad de agua» | Clasificar humedad sólo si existe referencia compatible |
| C03 | Temperatura de suelo + perfil de establecimiento | Coincidencia o limitación térmica actual | Explicar qué alternativa se beneficia o queda limitada | Perfil distingue semilla, trasplante u órgano vegetativo |
| C04 | C03 + mínimas de aire previstas | Un perfil compatible hoy puede enfrentar frío próximo | Dar prioridad a revisar ese episodio antes del establecimiento | Sensibilidad por perfil y tipo de exposición documentada |
| C05 | Temperatura + máximas y duración previstas | Exposición a calor próximo | Destacar período para observación o evitar recomendar establecimiento inmediato | Umbral respaldado; no asumir daño por especie desconocida |
| C06 | Humedad del suelo + lluvia prevista | Coincidencia de humedad observada y aporte atmosférico posible | Revisar drenaje/condiciones antes de labores | No inferir saturación ni escorrentía sin suelo caracterizado |
| C07 | CE + humedad + temperatura del suelo | La comparación de CE puede estar condicionada por la captura | Explicar por qué una variación no demuestra cambio de sales | Método conocido y comparabilidad; sin conversión empírica improvisada |
| C08 | pH + perfil + método | Coincidencia parcial o diferencia respecto de la referencia | Mostrar intervalo y alcance, sin receta de enmienda | Fuente con método o limitación de método explícita |
| C09 | HR/rocío + lluvia + duración | Período ambiental persistentemente húmedo | Sugerir observación de tejidos sensibles | No identificar patógeno ni cuantificar infección |
| C10 | Viento/ráfagas + lluvia + calor | Períodos meteorológicos relativamente menos adversos | Ayudar a ordenar labores de campo | No presentarlos como autorización de aplicación o tránsito |
| C11 | NPK + CE + metadatos de calidad | Lecturas nutricionales no confirmadas | Mantener la advertencia y evitar decisiones de fertilización | No convertir correlación en calibración química |
| C12 | Ambiente BME280 + contexto de API | Diferencia entre un punto local y un modelo regional | Mantener ambas fuentes y limitar extrapolación | No asumir invernadero ni recalibrar el modelo con una observación |

Las condiciones ambientales de enfermedad dependen del patógeno, huésped y, en muchos modelos, mojamiento foliar y duración. La disponibilidad de temperatura y HR no habilita automáticamente un modelo fitopatológico. Esta propuesta conserva C09 como contexto de observación. [UC IPM: modelos de enfermedad](#s09).

### 6.4. Indicadores que no se activarán como diagnóstico con estas entradas

- Agua disponible en raíces, capacidad de campo o punto de marchitez inferidos sólo desde una humedad puntual.
- Velocidad de infiltración/drenaje desde lluvia modelada y capturas portátiles separadas.
- Textura, compactación, materia orgánica, capacidad de intercambio catiónico o aireación del perfil.
- Salinidad del extracto saturado calculada desde CE sin una relación validada.
- Días a cosecha o grados-día de un cultivo establecido sin especie, variedad y fecha de inicio.
- Cumplimiento de frío invernal de un frutal sin contexto varietal y modelo pertinente.
- Probabilidad de infección o daño floral sin huésped y validación.
- Tendencia barométrica local sin serie comparable, o lluvia inferida sólo de presión.

En historia climática se pueden calcular acumulaciones térmicas de referencia como investigación, declarando base, período y modelo. No asociarlas al cultivo del usuario ni presentarlas como avance fenológico.

<a id="catalogo"></a>
## 7. Catálogo de plantas y evidencia

### 7.1. Perfil de establecimiento, no ficha enciclopédica

La unidad de evaluación será **especie o grupo bien definido + forma de establecimiento + contexto de evidencia**. Un mismo vegetal puede tener perfiles de semilla y trasplante distintos; en pre-siembra se presentan como alternativas de consulta, sin pedir que el agricultor elija una para evaluar el resto de la medición.

El catálogo separa dos cosas que crecen a ritmos distintos:

- **Lista de especies:** identidad (ID estable, nombre de Chile, nombre científico, grupo y sinónimos de búsqueda). Es la que ve el selector y puede ser amplia desde el inicio, porque no afirma ningún parámetro.
- **Perfil con criterios:** los umbrales por etapa y forma de establecimiento, cada uno con su fuente. Crece con la curación de la sección 7.5.

Una especie de la lista sin criterios habilitados para la etapa elegida se puede seleccionar, y el resultado lo dice expresamente: se muestra el análisis general y se indica que aún no hay criterios propios de esa especie para esa etapa. Nunca se rellena con valores de otra especie, del grupo ni de un promedio. El selector no marca como «con perfil» una especie que no lo tiene.

El catálogo contiene hechos documentados, no textos generados sin fuente. Información descriptiva puede mantenerse para comprensión, pero no se convierte en una regla ejecutable si faltan condiciones de aplicación. La identidad botánica y los sinónimos se revisan antes de consolidar IDs; nombres amplios como «hortalizas de hoja» no heredan automáticamente el perfil de lechuga.

### 7.2. Esquema de evidencia por perfil

| Campo | Contenido requerido |
|---|---|
| Identidad | ID estable, nombre en español de Chile, nombre científico documentado, grupo y sinónimos |
| Establecimiento | Semilla, trasplante, tubérculo, diente, corona, planta de vivero u otro documentado |
| Contexto | Campo abierto, protegido o no especificado en la fuente; región, variedad/grupo y etapa |
| Temperatura de suelo | Mínimo, banda favorable y máximo cuando estén documentados; no rellenar extremos faltantes |
| Temperatura de aire | Sensibilidad por etapa, duración y método de exposición, si existen |
| pH | Intervalo, método de referencia y ámbito de aplicación |
| Conductividad | Valor/unidad, tipo de muestra, temperatura de referencia y relación con sensor, si existe |
| Agua y aireación | Requerimientos cualitativos documentados; evitar porcentajes universales de humedad |
| Estacionalidad | Requisitos térmicos/fotoperiódicos documentados, sin copiar meses de otro hemisferio |
| Horizonte | Establecimiento inmediato o evaluación parcial de cultivo perenne |
| Evidencia por dato | Institución, URL, título, sección/página/tabla, edición, fecha de consulta, unidad original y transformación |
| Estado | Candidato, documentado parcialmente, habilitado para un criterio, validado localmente o retirado |
| Limitaciones | Qué criterios no se evaluaron y por qué |

La habilitación es por criterio: un perfil puede tener temperatura respaldada y salinidad no evaluable. No afirmar que el perfil completo está validado porque una fila térmica tiene fuente.

### 7.3. Catálogo candidato de ampliación

Este inventario define alcance de investigación, **no una lista ya implementada ni un conjunto de perfiles numéricos aprobados**. Las fuentes de entrada sirven para localizar y contrastar evidencia; una referencia de grupo no acredita todos los parámetros de cada especie.

| Grupo | Perfiles candidatos | Distinciones necesarias | Ruta documental inicial |
|---|---|---|---|
| Hojas | Lechuga, acelga, espinaca | Semilla/trasplante; límites superiores de germinación | Tabla térmica [S10](#s10), evidencia local por completar |
| Brassicas | Repollo, brócoli, coliflor, kale, nabo | No copiar un mismo umbral a toda la familia | [S10](#s10) para especies que enumera; [S17](#s17) para frío |
| Raíces | Zanahoria, rabanito, betarraga | Germinación no equivale a desarrollo de raíz comercial | [S10](#s10) |
| Bulbos y tallos | Cebolla, puerro, ajo, apio | Semilla, almácigo, bulbo y diente deben separarse | [S10](#s10); aclarar propagación antes de extraer reglas |
| Legumbres | Arveja, haba, poroto, lenteja, garbanzo | Identificar especie/grupo y forma de establecimiento | [S10](#s10) donde corresponda; [S11](#s11) como índice |
| Solanáceas | Tomate, pimentón/ají, berenjena | Semilla y trasplante; variedades y sensibilidad térmica | [S10](#s10), [S12](#s12) |
| Cucurbitáceas | Pepino, zapallo, zapallo italiano, melón, sandía | Especies/grupos distintos; semilla y trasplante | [S10](#s10) |
| Órganos vegetativos | Papa, camote | Tubérculo o esqueje no es semilla botánica | Perfiles actuales sólo como referencia de código; búsqueda específica antes de habilitar |
| Cereales | Maíz, trigo, avena, cebada | Uso y grupo invernal/primaveral; no inferir variedad | [S10](#s10) para maíz; [S11](#s11), [S16](#s16) como rutas |
| Aromáticas | Albahaca, cilantro, perejil, orégano, romero, tomillo | Semilla/trasplante/esqueje; perennes frente a anuales | [S13](#s13), [S10](#s10) para perejil; fuentes individuales para el resto |
| Berries | Frutilla, frambuesa, arándano, mora | Plantación y establecimiento; no puntuar como germinación | [S14](#s14), [S15](#s15), [S18](#s18) |
| Frutales | Palto, vid, manzano, peral, cerezo, duraznero, ciruelo | Perfil parcial de suelo y clima; variedad/portainjerto desconocidos | [S16](#s16), [S20](#s20) |
| Otros perennes | Nogal, avellano europeo, olivo, limonero, naranjo | Horizonte largo y necesidad de evidencia específica | [S16](#s16), [S20](#s20) como rutas, no aprobación de aptitud |
| Coberturas, extensión posterior | Avena de cobertura, vicia, trébol | Finalidad, manejo y compatibilidad no se infieren de sensores | [S11](#s11) para localizar perfiles; habilitar sólo con reglas propias |

No fijar una cuota de especies que obligue a inventar parámetros. El primer catálogo operativo debe priorizar perfiles con mejor evidencia y utilidad local; los candidatos incompletos permanecen fuera de las sugerencias activas.

**Cobertura comprometida de la lista de especies:** hortalizas y frutales deben quedar completos respecto de lo que se cultiva y comercializa en Chile. La lista se construye desde estadísticas oficiales de superficie y comercialización (encuestas de hortalizas, catastros frutícolas y precios de mercados mayoristas), no desde una selección a criterio; la fuente y su fecha quedan registradas junto a la versión del catálogo. Aromáticas, especies ornamentales, forestales y otros árboles se incorporan con cobertura parcial y la lista no se presenta como exhaustiva en esos grupos. Esta cobertura es de **nombres**: la cobertura de criterios por etapa se informa aparte y nunca se infiere de que la especie esté en la lista.

### 7.4. Evidencia concreta localizada

**Temperatura de germinación:** la tabla de UC ANR permite diferenciar mínimos, intervalos favorables y máximos. Estos ejemplos están convertidos de °F a °C mediante `(F - 32) × 5/9`; muestran la estructura documental propuesta, no sustituyen validación local. [Fuente y tabla original](#s10).

| Semilla | Mínimo °C | Intervalo favorable °C | Máximo °C |
|---|---:|---:|---:|
| Tomate | 10,0 | 18,3–29,4 | 35,0 |
| Lechuga | 0,0 | 15,6–23,9 | 29,4 |
| Espinaca | 0,0 | 18,3–23,9 | 23,9 |
| Zanahoria | 4,4 | 18,3–29,4 | 35,0 |
| Pepino | 15,6 | 18,3–35,0 | 40,6 |
| Arveja | 4,4 | 18,3–23,9 | 29,4 |

No interpretar un mínimo como recomendación de sembrar a esa temperatura. No usar una tabla de semillas para dientes de ajo, tubérculos de papa o plantas de vivero. La entrada de tomate no justifica aplicar los mismos valores al trasplante.

**pH:** hay antecedentes de tomate en [S12](#s12), albahaca en [S13](#s13), frutilla en [S14](#s14) y arándano en [S18](#s18). Sirven para documentar perfiles con rangos y contextos propios; no se importan dosis de las mismas páginas. Los criterios de pH habilitados usan la tabla B-1 de hortalizas de [S22](#s22) y, cuando INIA documenta la especie, sus boletines: tomate [S23](#s23), frutilla [S24](#s24), cerezo [S25](#s25) y olivo [S26](#s26). El detalle por especie está en la [tarea ES6](TASK_MOTOR_AGRONOMICO.md#es6-criterios-por-especie-y-etapa--en-curso). En arándano, incluso las fuentes consultadas presentan diferencias de intervalo según contexto. La discrepancia debe registrarse, no resolverse tomando el promedio o el rango más amplio.

**Helada, calor y lluvia por especie:** la tolerancia a helada de hortalizas proviene de clasificaciones de extensión con umbrales en °F ([S27](#s27), [S28](#s28), [S29](#s29)), contrastadas con [S30](#s30), [S31](#s31), [S32](#s32) y [S33](#s33); se convierten con `(F - 32) × 5/9`. Cuando las fuentes difieren se usa lo que todas documentan (por ejemplo, 28 °F aunque una admita 24 °F) y la diferencia queda en las limitaciones; si una sostiene tolerancia y otra no (apio, papa), se trata como sensible. Tomate, cerezo, olivo y frutilla usan los capítulos de clima de sus boletines INIA ([S23](#s23)–[S26](#s26)); las flores de berries, [S34](#s34), y la cosecha de arándano, [S35](#s35). Una fuente que no da temperatura («sensible a helada») se compara con 0 °C como definición de helada, y una fuente que no da cantidad de lluvia se compara con la regla de día lluvioso de la app; ambos casos se declaran en el resultado.

**Amplitud y adaptación local:** ECOCROP sirve como índice de características ambientales y usos, pero FAO informa que su actualización se discontinuó. No tratarlo como un catálogo clínicamente validado o actualizado de recomendaciones locales. La documentación de INIA sobre aptitud térmica permite orientar la búsqueda de evidencia chilena, distinguiendo especies, variedades y zonas; una noticia sobre un libro no aporta por sí sola sus tablas. [ECOCROP](#s11), [INIA](#s16).

### 7.5. Proceso de incorporación

1. Identificar especie, propagación y pregunta que resolverá el perfil.
2. Localizar una fuente técnica primaria o de extensión institucional; priorizar antecedentes chilenos pertinentes y contrastar con otras fuentes cuando corresponda.
3. Registrar cada afirmación y su ubicación exacta. No convertir un resumen de buscador en un umbral definitivo.
4. Verificar unidad, variable, método, etapa, duración, variedad y región. Separar temperatura del aire, del suelo y del medio de germinación.
5. Conservar valores originales y conversión determinista. No inventar decimales de precisión biológica.
6. Resolver conflictos de contexto; si no se pueden resolver, mantener el criterio no evaluable o limitarlo al contexto documentado.
7. Crear casos de frontera, ausencia de datos y ejemplos contrapuestos.
8. Habilitar sólo los criterios respaldados, con versión y limitaciones. La evidencia bibliográfica y la validación del sensor en campo son estados diferentes.

No descargar ni reproducir libros completos en la aplicación. Conservar referencias y los hechos estructurados necesarios, respetando condiciones de uso. Los enlaces de catálogo son evidencia para los desarrolladores; el agricultor puede ver un resumen comprensible sin leer el documento técnico.

### 7.6. Ordenamiento de opciones

Evitar un promedio de temperatura, pH y clima que compense una limitación importante con una coincidencia irrelevante. Usar una clasificación explicable:

- **Coincide con los criterios evaluados:** sin limitaciones detectadas en criterios aplicables y con cobertura suficiente declarada. Nunca «apto garantizado».
- **Con limitaciones para revisar:** al menos un criterio respaldado limita el establecimiento o el pronóstico introduce un episodio adverso.
- **No evaluable con estos datos:** faltan criterios esenciales o el método no es comparable.

Dentro de cada grupo, ordenar primero por limitaciones relevantes, después por cobertura de evidencia comparable y finalmente por un desempate estable. La ponderación de importancia debe quedar documentada por criterio antes de implementarse; no seleccionar pesos para obtener un cultivo favorito. La lista completa sigue accesible.

Ningún cultivo gana porque sus parámetros faltantes se interpretaron como favorables. Los estados por criterio se conservan: coincidencia, limitación, desconocido o no aplicable. «No aplicable» exige una razón del perfil; no sirve para ocultar información ausente.

<a id="etapas"></a>
## 8. Reglas por etapa

### 8.1. Contrato de una regla

Toda regla declara: ID, versión, etapa, objetivo, entradas necesarias, unidades, condición, parámetros con evidencia, exclusiones, prioridad, salidas permitidas, acciones incompatibles y pruebas. Debe distinguir «no se cumple» de «no se pudo evaluar».

Una regla que combina lecturas no puede aumentar la evidencia por contar dos veces la misma información. CE y registros NPK no son votos independientes; temperatura, HR y DPV tampoco son tres confirmaciones independientes de un mismo riesgo atmosférico.

Estados de desarrollo de reglas: `draft`, `documented`, `enabled`, `locally_validated`, `retired`. Que una regla sea determinista o pase pruebas sólo demuestra comportamiento de software. No autoriza a marcarla `locally_validated`.

### 8.2. Pre-siembra

**Pregunta:** «¿Qué alternativas de establecimiento vale la pena explorar bajo las condiciones observadas y previstas?». La respuesta no elige por el agricultor ni promete cosecha.

| Regla propuesta | Entradas | Decisión | Ausencias y límites |
|---|---|---|---|
| PS01 — Condición térmica de establecimiento | Temperatura de suelo + perfil | Distinguir por debajo, dentro o por encima de referencias | Sin máximo documentado, el extremo superior queda desconocido |
| PS02 — Coincidencia de pH | pH + método + perfil | Coincidencia parcial o diferencia, con explicación | Sin correspondencia de método, no exclusión categórica |
| PS03 — Contexto de sales | CE + método + referencia compatible | Advertencia o criterio parcial de compatibilidad | Método desconocido: no aplicar directamente un límite de extracto |
| PS04 — Frío próximo | Perfil + aire previsto + duración | Señalar episodio que limita establecer esa alternativa al aire libre | Pronóstico exterior no acredita condiciones dentro de un invernadero |
| PS05 — Calor próximo | Perfil + exposición prevista | Señalar incompatibilidad térmica documentada | No usar un máximo diario como horas de exposición |
| PS06 — Contexto hídrico | Humedad puntual + lluvia + demanda atmosférica | Explicar qué revisar antes del establecimiento | No fijar dosis ni asegurar que la lluvia resolverá humedad |
| PS07 — Cobertura | Estado de todos los criterios aplicables | Clasificar opción y listar factores no evaluados | Una coincidencia térmica aislada no habilita «apto» |

Mostrar por perfil: forma de establecimiento, criterios coincidentes, limitación principal, episodio previsto pertinente y factores sin evaluar. Los frutales perennes sólo reciben evaluación parcial de suelo/clima; no compiten en un ranking de «qué sembrar esta semana» con hortalizas de ciclo corto.

Ejemplo de redacción, con valores que en ejecución provendrán de la captura: «La temperatura medida coincide con la referencia para esta forma de establecimiento. Hay frío previsto en el período indicado; esa exposición merece revisión antes de llevar plantas sensibles al campo».

### 8.3. Vegetativo

**Pregunta:** «¿Qué condiciones físicas conviene revisar para sostener el crecimiento?». No se afirma una deficiencia nutricional.

Las reglas VG01–VG05 se aplican siempre, con o sin especie. Si el usuario indicó una especie con criterios habilitados para esta etapa, se agregan como razones propias de esa especie (por ejemplo, su intervalo térmico de crecimiento o su sensibilidad salina documentada), identificadas con el perfil y su fuente. Las secciones 8.4 y 8.5 siguen la misma regla.

| Regla propuesta | Entradas | Resultado útil | No debe afirmar |
|---|---|---|---|
| VG01 — Demanda atmosférica | DPV local y previsto, exposición térmica | Priorizar observación durante el episodio | Que la planta ya está marchita |
| VG02 — Contexto agua–ambiente | Humedad del punto, demanda, lluvia | Presentar la combinación y acción de revisión | «Riega tantos litros» o «no necesita agua» |
| VG03 — Condiciones térmicas | Aire y suelo, pronóstico | Extremos observados/previstos con horizonte | Velocidad de crecimiento de una especie desconocida |
| VG04 — Acidez/conductividad | pH, CE, calidad | Revisar lecturas que cumplen reglas documentadas | Toxicidad específica, bloqueo de nutrientes o receta |
| VG05 — Humedad ambiental persistente | Horas previstas de ambiente húmedo | Recomendar observación de tejidos, sin diagnóstico | Presencia de hongos o necesidad de fungicida |

La recomendación debe referirse al período: «Revisa el estado hídrico durante las horas de mayor demanda previstas», acompañada de sus datos. Evitar consejos genéricos de «ajustar nutrición» si ninguna variable permite justificar ese ajuste.

### 8.4. Floración

**Pregunta:** «¿Qué exposición ambiental merece atención mientras el cultivo está en floración?». La etapa cambia la prioridad del mensaje, no inventa identidad o tolerancia de especie.

| Regla propuesta | Entradas | Resultado útil | Restricción |
|---|---|---|---|
| FL01 — Exposición a frío | Mínimas/horas previstas | Indicar período de frío y revisar flores sensibles | No diagnóstico de helada en el tejido ni daño porcentual |
| FL02 — Calor y demanda | Aire, HR, DPV y duración | Priorizar revisión en el episodio | No aborto floral, esterilidad de polen ni caída de flores asegurados |
| FL03 — Persistencia de humedad/lluvia | HR, rocío, lluvia horarios | Contexto para observar flores y tejidos | No infección ni polinización fallida inferidas |
| FL04 — Viento y ráfagas | Viento previsto | Exposición meteorológica que puede dificultar labores | No contar visitas de polinizadores ni afirmar ausencia de polinización |
| FL05 — Contexto del suelo | Humedad, CE, pH y calidad | Explicar condiciones observadas junto al episodio | No reducir uniformemente la tolerancia a sales de todas las especies |

Se propone retirar del nuevo flujo la regla genérica que multiplica todas las tolerancias salinas por un mismo porcentaje. Sólo admitir una regla floral específica en una ficha de perfil si existe evidencia correspondiente; esa regla se aplica a la medición únicamente cuando el usuario indicó esa especie.

La documentación de INIA muestra que respuesta al frío depende de especie, variedad y estado del órgano. Es fundamento para mantener ese límite, no para asignar una tolerancia única. [INIA: hortalizas y heladas](#s17).

### 8.5. Cosecha

**Pregunta:** «¿Qué períodos presentan menos obstáculos meteorológicos para organizar las labores?». La selección de esta etapa la hace el agricultor; el motor no verifica madurez.

| Regla propuesta | Entradas | Resultado útil | Restricción |
|---|---|---|---|
| CO01 — Exposición a lluvia | Lluvia, probabilidad, intervalos | Comparación de períodos y motivo | No garantiza cosecha seca ni calidad poscosecha |
| CO02 — Exposición a calor | Temperatura, radiación y duración | Períodos de menor exposición térmica | No temperatura de fruto ni vida útil |
| CO03 — Viento | Viento y ráfagas | Contexto para organizar labores | No límites de maquinaria sin especificación del equipo |
| CO04 — Humedad del suelo | Lectura puntual + antecedentes meteorológicos | Revisión del terreno antes de ingresar | No declarar transitabilidad, compactación o ausencia de barro |
| CO05 — Comparación incompleta | Cobertura por período | Explicar qué no se pudo comparar | No recomendar una ventana porque sus datos faltantes oculten riesgos |

Una ventana «menos adversa» es relativa a los criterios comparados, no una certificación de seguridad. Si una tiene menos lluvia y otra menos calor, mostrar la diferencia; no ocultarla con una puntuación opaca. Sin umbrales de tarea respaldados, presentar el pronóstico comparado sin ordenar una acción categórica.

### 8.6. Registro de parámetros antes de activar reglas

| Familia de parámetros | De dónde deben proceder | Política inicial |
|---|---|---|
| Mínimo/favorable/máximo de establecimiento | Fuente de especie y propagación | Habilitar por perfil y variable documentada |
| Temperatura de posible congelación del aire | Condición física declarada | Describir aire previsto, sin equipararlo a daño o temperatura del tejido |
| Calor, duración y sensibilidad | Evidencia de órgano/etapa o criterio ambiental explícito | No heredar un umbral universal del prototipo |
| DPV bajo/alto y duración | Evidencia del contexto de uso | Publicar el indicador continuo; habilitar categorías sólo en dominio documentado |
| Ambiente húmedo persistente | Evidencia de la condición ambiental | No adoptar umbrales de infección de un patógeno desconocido |
| Cantidad/probabilidad de lluvia | Parámetro de comparación meteorológica documentado | Nunca «esta lluvia reemplaza el riego» por una cantidad fija |
| Viento para una labor | Criterio específico de tarea | Sin ese criterio, informar magnitud y comparación |
| Extremos de humedad del suelo | Caracterización del método y dominio | No reutilizar suelo franco ni extremos de una colección cambiante de texturas |
| Frescura, cobertura y límites de petición | Política técnica versionada | Son decisiones de producto, no constantes agronómicas |

Los valores sin evidencia suficiente son trabajo de investigación del equipo, no preguntas nuevas para el usuario. No activar una regla incompleta para llenar la pantalla de recomendaciones.

<a id="salidas"></a>
## 9. Priorización, incertidumbre y redacción

### 9.1. Tres ejes independientes

1. **Condición:** hecho observado o previsto, su magnitud, intervalo y posible relevancia.
2. **Cobertura:** criterios evaluados, no evaluados y no aplicables.
3. **Evidencia:** validez de fuente, método y regla para esta interpretación.

No generar un porcentaje de «confianza agronómica» mezclando estos ejes. Si se muestra cobertura como fracción, debe indicar qué cuenta y no presentarse como probabilidad de éxito.

Estados globales propuestos: `attention`, `no_detected_risk`, `insufficient_data`. El segundo significa ausencia de alertas dentro de las reglas aplicables evaluadas, nunca aptitud universal. `insufficient_data` no se pinta como favorable.

El esquema actual usa `GREEN`, `AMBER` y `RED`. La futura adaptación debe ser explícita: `no_detected_risk` sólo puede usar verde con cobertura mínima cumplida y texto acotado; `attention` usa ámbar o rojo según regla respaldada; `insufficient_data` debe tener texto y tratamiento neutral propios. Si la columna obliga a conservar un valor legado, guardar además el estado semántico en `diagnosis` y no permitir que listas antiguas lo interpreten como éxito. Esta compatibilidad es un criterio de implementación, no un cambio de base realizado aquí.

### 9.2. Resolver acciones

Orden propuesto: integridad del dato → exposición próxima relevante → revisión física local → posibilidades de pre-siembra → seguimiento. La prioridad depende de severidad documentada, cercanía temporal, cobertura y etapa; no del orden del catálogo.

Cada acción tiene ID, objetivo, intervalo, razones y exclusiones. Fusionar acciones del mismo objetivo conservando razones. Una condición incierta de lluvia no debe cancelar una revisión hídrica respaldada. Una alerta de salinidad no genera riego de lavado, y un dato NPK no genera fertilización.

No ocultar una alerta relevante detrás de una ficha de cultivo. En el resumen proponer hasta tres prioridades de lectura; el detalle conserva todas las razones y limitaciones. Este límite es de presentación, no un recorte de evaluación.

### 9.3. Vocabulario del resultado

| Usar | Evitar |
|---|---|
| «La lectura coincide con…» | «Este campo es ideal para…» |
| «Podrías considerar esta alternativa…» | «Debes plantar…» |
| «Se prevé exposición a…» | «El cultivo sufrirá…» |
| «No evaluamos este criterio porque…» | Ocultar el criterio o hacerlo favorable |
| «Revisa las condiciones antes de…» | Dosis, tiempos de riego o tratamientos no sustentados |
| «No hay coincidencias en los criterios disponibles del catálogo» | «Aquí no crece nada» |

Conservar español de Chile e inglés cuando la aplicación esté en ese idioma. Los números se presentan en las unidades de preferencia, pero todas las reglas operan en unidades internas canónicas. Las traducciones no deben cambiar significado, umbrales ni prioridad.

<a id="historicos"></a>
## 10. Históricos y comparabilidad

El historial tiene dos usos diferentes: conservar lo que se observó/recomendó y, sólo cuando sea defendible, comparar capturas. El segundo no se habilita sólo por existir el primero.

La sonda es portátil. Mismo equipo, cercanía GPS y hora similar no prueban misma profundidad, manejo, textura o punto exacto. La colocación del sensor influye en la interpretación de humedad. [Universidad de Minnesota](#s21).

Política propuesta:

- Permitir consultar mediciones previas como registros independientes.
- Comparar una sesión sólo cuando el sistema pueda acreditar continuidad técnica y espacial suficiente; si no conoce profundidad/condición de inserción, mantener esa limitación explícita.
- No aprender capacidad de campo, drenaje o textura a partir de registros portátiles sin esa evidencia. Tampoco inferir riego por un salto de humedad.
- Una serie climática modelada sí puede resumirse sobre una misma ubicación/producto, pero sigue siendo clima modelado.
- Mantener separados cambio de versión de reglas y cambio de condiciones físicas.
- Abrir un histórico no solicita clima nuevo para modificar su recomendación original. Una comparación actual futura debe ser otra operación identificada, sin sobrescribir la captura.
- No generar tendencias con puntos de otra cuenta, equipo no autorizado o mediciones simuladas.

La restricción de no pedir más datos implica que ciertas inferencias temporales quedarán deshabilitadas. Es preferible una limitación explícita a una tendencia falsa por mover la sonda.

<a id="contratos"></a>
## 11. Contratos, versiones y persistencia

### 11.1. Interfaz conceptual

La capa de entrada ya implementa un contrato versionado en [agronomy.ts](src/types/agronomy.ts) y [inputQuality.ts](src/engine/inputQuality.ts). El siguiente ejemplo describe el contrato objetivo más amplio: los criterios, opciones y estado de antigüedad todavía deben integrarse. Las entradas son inmutables y el motor puro no hace peticiones de red.

```typescript
type Availability = 'available' | 'missing' | 'invalid' | 'stale';
type CriterionState = 'match' | 'limitation' | 'unknown' | 'not_applicable';

interface EvidenceDatum {
  value: number | null;
  unit: string;
  source: 'soil_probe' | 'bme280' | 'weather_model' | 'reanalysis';
  availability: Availability;
  validFrom: string;
  validTo: string;
  temporalKind: 'instant' | 'mean' | 'sum' | 'maximum' | 'minimum';
  methodId: string | null;
  limitationCodes: string[];
}

interface CriterionResult {
  ruleId: string;
  ruleVersion: string;
  state: CriterionState;
  inputRefs: string[];
  sourceRefs: string[];
  reasonCode: string;
  reasonValues: Record<string, number | string>;
  limitationCodes: string[];
}

interface CropOption {
  profileId: string;
  establishmentMethod: string;
  scope: 'short_term_establishment' | 'partial_perennial_assessment';
  classification: 'matches_evaluated_criteria' | 'has_limitations' | 'insufficient_data';
  criteria: CriterionResult[];
}
```

El contrato completo debe incluir: etapa; captura local; clima con ubicación solicitada y celda devuelta cuando exista; cobertura; indicadores con fórmulas versionadas; riesgos; opciones; acciones; textos/localización; versiones de motor, catálogo, proveedor/adaptador y política de evidencia.

`methodId = null` significa desconocido, no método por defecto. Los datos derivados declaran referencias a sus entradas y su fórmula; no se hacen pasar por otra observación del sensor.

### 11.2. Guardado y llegada asíncrona de clima

Conservar el patrón actual: una lectura local puede revisarse y guardarse antes del pronóstico. Si el pronóstico llega antes de guardar, generar una nueva evaluación en memoria desde la misma captura; si ya se guardó, no modificar silenciosamente el resultado persistido.

Cancelar solicitudes al salir o cambiar de cuenta. Respuestas tardías no deben completar otro resultado ni mezclar una localización con otra. Fijar reloj de evaluación en la entrada para que repetir un cálculo sea determinista.

Guardar una instantánea compacta de los datos usados, no únicamente una URL mutable ni sólo los textos. Conservar intervalos, valores, fuentes, razones, perfil, unidades y versiones para reproducir el resultado. El pronóstico completo en caché puede ser más amplio que el fragmento consumido por las reglas.

Medir tamaño del diagnóstico y de la cola sin red. Si la serie horaria excede un presupuesto práctico, diseñar almacenamiento separado antes de ampliar el payload; no eliminar las entradas necesarias para auditar una recomendación. No tocar `schema.sql`: cualquier evolución persistente se realiza mediante migraciones.

### 11.3. Compatibilidad

- Versionar el nuevo contrato; no reinterpretar presentaciones antiguas como resultados nuevos.
- La especie indicada se guarda en `crop_id` de la medición, junto con `crop_catalog_version`; sin especie se conserva `sin_especificar`. La textura sigue sin especificar. Una opción consultada en pre-siembra no modifica `crop_id`.
- Las mediciones anteriores con `crop_id` heredado de los perfiles del prototipo no se reinterpretan como especie indicada por el usuario.
- Preservar las claves históricas; los nuevos perfiles necesitan IDs estables y nombres traducibles.
- Listas, historial y resultado deben respetar cobertura insuficiente aunque conserven un semáforo legado.
- Mantener la capacidad de consultar la presentación guardada aun si se retira una regla o perfil.
- No depender de traducciones libres para reconocer alertas: usar IDs y códigos; los textos son presentación.

<a id="pantallas"></a>
## 12. Pantallas propuestas y justificación

La mejora principal es del motor. El único paso nuevo es el selector opcional de especie; no se interponen pasos obligatorios antes de medir o guardar. Las vistas siguientes consumirían el mismo resultado versionado.

### 12.1. Vegetativo, floración y cosecha: «¿Qué tienes plantado?»

**Decisión del producto.** Al elegir vegetativo, floración o cosecha, el flujo de medición muestra una pantalla entre la etapa y los pasos de preparación. En pre-siembra no aparece.

- Un desplegable con buscador: escribe y filtra por nombre común de Chile y sinónimos (choclo/maíz, palta/palto, zapallo italiano/zucchini), sin distinguir tildes ni mayúsculas. La lista se agrupa (hortalizas, frutales, aromáticas, otros) y abarca la cobertura comprometida en [7.3](#catalogo).
- Botón inferior **«Continuar»**, habilitado sólo cuando hay una especie seleccionada.
- Botón **«Saltar»** arriba a la derecha: continúa sin especie, con la medición en `sin_especificar`.
- Opción **«No se encuentra en la lista»**: lleva a una pantalla que explica que se están sumando más cultivos y continúa sin especie, igual que «Saltar». No existe una opción «Otra» ni se guarda texto libre.
- Volver desde la pantalla siguiente conserva la selección mientras dure la medición; una medición nueva parte vacía.
- Si la especie elegida no tiene criterios para la etapa, se avisa en el resultado, no en el selector como bloqueo.

**Por qué:** sin especie, vegetativo, floración y cosecha sólo pueden dar avisos ambientales generales. Con ella, el motor puede aplicar los criterios documentados de esa planta. Se mantiene opcional para no reabrir el problema original de pedir información que el usuario no tiene o no quiere dar.

**Criterio de aceptación:** se puede llegar a medir con un toque («Saltar»); la búsqueda encuentra especies por sinónimo; el resultado y el histórico muestran la especie indicada o «sin especie», y distinguen criterios propios de la especie de las alertas generales.

### 12.2. Pre-siembra: detalle opcional «Por qué aparece este cultivo»

**Recomendación: incorporarlo cuando se amplíen los perfiles.** Se abre tocando una posibilidad del resumen o de recomendaciones. No cambia el cultivo del campo.

Contenido: forma de establecimiento, coincidencias térmicas/de pH, contexto de CE, limitación principal, próximos episodios relevantes y criterios no evaluados. Las fuentes pueden estar en un desplegable secundario; no interrumpen la explicación para el agricultor.

**Por qué se necesita:** una lista extensa de nombres puede parecer una orden o esconder por qué dos especies reciben tratamientos distintos. El detalle permite explicar semilla frente a trasplante y compatibilidad parcial frente a aptitud completa. Meter todas esas razones en el resumen lo volvería difícil de recorrer en terreno.

**Alternativa descartada:** pedir en pre-siembra qué se quiere sembrar invertiría la pregunta de la etapa, que es qué conviene sembrar. Tampoco conviene un carrusel que oculte opciones o fuerce recorrerlas una por una.

**Criterio de aceptación:** el agricultor identifica por qué aparece una opción y su principal limitación; puede volver sin guardar una selección. Históricos muestran las razones originales. Sin perfiles evaluables, se explica la ausencia y se mantienen las mediciones.

### 12.3. Todas las etapas: «Próximas condiciones» dentro de pronóstico

**Recomendación: ampliar primero la pantalla de pronóstico existente.** Mostrar períodos, condiciones previstas y razones del motor; en cosecha, una comparación de períodos menos adversos. Un detalle horario opcional puede abrirse desde un día.

**Por qué:** el pronóstico aporta una dimensión temporal que las tarjetas de variables puntuales no pueden explicar. Permite entender «qué cambia esta noche» y distinguir el dato actual de una previsión. Es especialmente útil en floración y cosecha, donde interesan episodios y oportunidad de labores.

No se justifica inicialmente una pantalla separada obligatoria de «ventanas»: duplicaría fechas y navegación. Sólo extraerla como vista independiente si las pruebas muestran que el usuario no logra comparar períodos en la pantalla existente. Debe mostrar diferencias y cobertura, no un horario óptimo con precisión aparente.

**Criterio de aceptación:** distingue medido de previsto, incluye lo que queda del día, no destaca como conveniente un período con datos faltantes y no afirma seguridad de ingreso de maquinaria.

### 12.4. Vegetativo y floración: reutilizar recomendaciones y detalles

Las combinaciones suelo–aire–clima deben llegar como razones de las recomendaciones actuales. El detalle de ambiente puede mostrar DPV y rocío como derivados, claramente separados de las variables medidas.

No agregar una pantalla de «salud del cultivo»: aun con la especie indicada, sin observar la planta ese título sugeriría una capacidad que no tenemos. Tampoco una pantalla nutricional con dosis a partir de NPK.

### 12.5. Cobertura y calidad: bloque breve, no paso obligatorio

En el resumen, explicar sólo la limitación que cambia la interpretación: por ejemplo, ambiente ausente o pronóstico no disponible. Un detalle «Cómo se evaluó» puede reunir las demás. Evitar repetir avisos extensos en todas las tarjetas.

Conservar lectura sin red, idioma, accesibilidad, tamaño de letra, desplazamiento, guardado sin esperar el clima y navegación atrás (deslizar y Atrás del teléfono). El criterio de éxito no es tener más pantallas: es comprender mejor la decisión con el menor recorrido necesario.

<a id="validacion"></a>
## 13. Validación y criterios de aceptación

### 13.1. Tres comprobaciones que no deben confundirse

**Software:** entradas/salidas, cálculos, errores, cobertura temporal, determinismo y persistencia. Se puede verificar con casos sintéticos y respuestas de API conservadas.

**Medición:** contraste del instrumento con referencias apropiadas, método, repetibilidad y condiciones de adquisición. Depende de pruebas reales del equipo y no se sustituye por una respuesta BLE simulada.

**Interpretación agronómica:** revisión de aplicabilidad de perfiles, umbrales y acciones con evidencia y contraste local. Una prueba que devuelve «tomate» sólo confirma que el programa ejecutó sus reglas.

No inventar resultados de validación. Registrar versión, dominio y limitaciones de cada regla; habilitar de forma gradual únicamente lo que puede sostenerse.

### 13.2. Matriz de pruebas de software

| ID | Caso | Resultado exigido |
|---|---|---|
| T01 | Misma entrada, reloj y versiones | Resultado semántico idéntico |
| T02 | Agregar un cultivo al catálogo | No cambia un riesgo ambiental general |
| T03 | Cambiar el orden del catálogo | No cambia clasificación ni desempate estable |
| T04 | Falta una magnitud BME280 | Sólo se suspenden los derivados dependientes |
| T05 | Dato ausente, NaN o infinito | Nunca favorable ni convertido a cero |
| T06 | Cero real de lluvia o temperatura | Se conserva y se distingue de ausencia |
| T07 | Aire a 20 °C y HR de 50 % | DPV aproximado de 1,17 kPa y rocío de 9,3 °C, dentro de tolerancia numérica |
| T08 | HR de 100 % dentro de dominio | DPV cero y rocío igual a temperatura |
| T09 | HR cero | DPV evaluable si T es válida; rocío no calculable con el logaritmo |
| T10 | Falta presión, existen T y HR | DPV local sigue disponible |
| T11 | `lux` heredado en cero | No hay diagnóstico de luz |
| T12 | NPK cambia manteniendo las otras variables | No cambia compatibilidad ni se emite dosis |
| T13 | CE con método desconocido | No activa comparación categórica contra extracto saturado |
| T14 | pH sin método comparable | Explicación parcial y limitación visible |
| T15 | Límite mínimo/favorable/máximo de un perfil | Comportamiento definido a ambos lados y sobre cada frontera |
| T16 | Temperatura por encima del máximo documentado | No clasifica como favorable por superar el mínimo |
| T17 | Perfil de semilla comparado con trasplante | No reutiliza referencias fuera de su contexto |
| T18 | Perfil con parámetros faltantes | No obtiene ventaja por omitir restricciones |
| T19 | Ninguna coincidencia | Explica alcance del catálogo, sin afirmar imposibilidad universal |
| T20 | Etapa distinta de pre-siembra sin especie | No asigna especie ni propone automáticamente cambiar de cultivo |
| T21 | Episodio esta noche | Se incluye aunque ocurra antes del primer día futuro de la lista |
| T22 | Pronóstico sólo diario | No inventa horas de frío/calor ni ventana horaria |
| T23 | Una hora faltante entre episodios | No une continuidad ni rellena duración |
| T24 | Cambio de hora y fechas de Chile | Sin duplicar/perder intervalos ni desplazar el episodio de fecha |
| T25 | Precipitación y componentes | No hay doble conteo |
| T26 | ET₀ horaria/diaria disponibles | Sólo una representación por intervalo; no suma duplicada |
| T27 | Probabilidad diaria disponible, cantidad ausente | No inventa milímetros ni espera de riego |
| T28 | Pronóstico incompleto de un período | No gana la comparación por ocultar riesgos |
| T29 | Ubicación ausente o clima de otra captura | No atribuye pronóstico a este campo |
| T30 | Clima actual incompleto, futuro válido | Conserva el futuro utilizable |
| T31 | Caché fuera de vigencia | Indica limitación y suspende instrucciones temporales no justificadas |
| T32 | Suelo modelado difiere de sonda | No sobrescribe la medición ni infiere error automáticamente |
| T33 | Alta humedad ambiental | No diagnostica infección |
| T34 | Cosecha con humedad del suelo | No autoriza maquinaria ni afirma madurez |
| T35 | Consulta de ficha de cultivo | No modifica el cultivo de la medición |
| T36 | Guardar antes del clima | Guarda evaluación local coherente y registra alcance |
| T37 | Respuesta climática posterior al guardado | No reescribe silenciosamente el histórico |
| T38 | Salida/cambio de cuenta durante petición | Cancela o descarta respuesta, sin mezcla de datos |
| T39 | Reabrir histórico con catálogo nuevo | Conserva razones y datos originales |
| T40 | Presentación en ambos idiomas/unidades | Igual significado y evaluación, con conversiones sólo visuales |
| T41 | Dos capturas cercanas de sonda portátil | No inventa tendencia, textura ni capacidad de campo |
| T42 | Opción perenne | Explica evaluación parcial; no promete aptitud de huerto |
| T43 | Retirar regla o fuente | Históricos legibles y nuevos resultados sin la regla retirada |
| T44 | Varias señales derivadas del mismo fenómeno | No aumenta gravedad por duplicar evidencia |
| T45 | Misma captura con especie indicada y sin especie | Alertas generales idénticas; sólo se agregan los criterios de la especie |
| T46 | Especie de la lista sin criterios para la etapa | Resultado general con aviso explícito; ningún valor tomado de otra especie o grupo |
| T47 | Búsqueda por sinónimo, sin tildes o en mayúsculas | Encuentra la misma especie con ID estable |
| T48 | Medición nueva después de una con especie | Parte sin especie; no hereda la selección anterior |

La tabla térmica de la sección 7 sirve para pruebas de conversión y fronteras de ejemplos documentales. No se convertirá automáticamente en el catálogo de producción.

### 13.3. Pruebas con personas y dispositivo

En Android/iOS, verificar con lecturas de prueba identificadas: guardar sin esperar red; consultar detalle de cultivo sin seleccionarlo; recorrer resultados con letra grande; comprender «medido», «previsto» y «no evaluado»; volver desde un detalle sin perder captura; abrir un histórico sin conectividad.

Para pruebas del equipo: respetar el estado y procedimiento de [Firmware/TASK.md](../Firmware/TASK.md). Seleccionar protocolos que contrasten cada variable y su método. Los rangos del manual no demuestran exactitud; la repetibilidad no demuestra ausencia de sesgo. No declarar NPK validado por correlacionar sus registros entre sí.

Para revisar agronomía: incluir contraejemplos de cultivos acidófilos, semilla frente a trasplante, suelo frío con alternativa tolerante, alta temperatura sobre máximo, CE no comparable y episodios climáticos contradictorios. Las correcciones se hacen en fuentes/reglas versionadas, no ajustando el texto para disimular una clasificación incorrecta.

### 13.4. Comandos y alcance de verificación

Desde la raíz, para documentación:

```powershell
python docs/verificar_documentacion.py
```

El verificador comprueba una lista fija de documentos que incluye esta especificación y el task del motor agronómico, con sus enlaces locales y anclas.

Desde `App/`, durante la implementación:

```powershell
npm test
npm run type-check
npm start
```

Las pruebas existentes usan `tsx --test`; agregar nuevos archivos al comando de pruebas en [package.json](package.json) cuando corresponda. Las funciones físicas y de decisión deben probarse sin cargar React Native ni realizar llamadas reales en las pruebas unitarias. Los adaptadores se verifican con fixtures de proveedor y una prueba separada de disponibilidad, sin hacer que toda la suite dependa de internet.

<a id="implementacion"></a>
## 14. Orden de implementación

Este orden organiza las entregas. El [task del motor agronómico](TASK_MOTOR_AGRONOMICO.md) identifica lo implementado y verificado dentro de cada una; una entrega parcial no cierra todos sus criterios.

| Entrega | Alcance | Resultado verificable antes de continuar |
|---|---|---|
| E1 — Calidad y contratos | Disponibilidad, procedencia, unidades, tiempo, cobertura; detener ceros inventados | T04–T06, T10–T14, T29–T32; resultado parcial preservado |
| E2 — Física local | DPV, rocío, consistencia y metadatos de derivados | T07–T11, fórmulas comprobadas y límites explícitos |
| E3 — Clima horario | Resto del día, horas, resúmenes, caché, cancelación y errores parciales | T21–T32, T36–T38; costo de peticiones y payload medido |
| E4 — Motor por etapa | Reglas ambientales independientes, prioridades, cobertura y traducciones | T01–T03, T20, T33–T34, T40, T44 |
| E5 — Catálogo con evidencia | Lista de especies con la cobertura de 7.3, perfiles documentados, criterios por etapa, límites superiores y propagación | T15–T19, T42, T46–T47; cada criterio activo tiene fuente y contexto |
| E6 — Resultado y persistencia | Selector de especie, integración en pantallas existentes, detalle de alternativas y diagnóstico versionado | T35–T40, T43, T45, T48; consulta sin selección, «Saltar» y guardado sin red |
| E7 — Contraste con equipo y terreno | Validación de medición y revisión agronómica del alcance habilitado | Informe de evidencia en los registros técnicos existentes; sin afirmar validaciones no realizadas |
| E8 — Extensiones justificadas | Contexto climático histórico, perennes y escenarios de pronóstico | Valor demostrado frente a costo/latencia; limitaciones de variedad y escala conservadas |

La investigación de fuentes puede avanzar durante E1–E4, pero ningún parámetro llega al motor activo sin revisión de correspondencia. No es necesario esperar a completar todo el catálogo candidato para entregar física local y mejor clima.

### 14.1. Áreas de código previstas

| Área existente | Cambio previsto |
|---|---|
| `src/types/agronomy.ts` y `src/types/app.ts` | Contratos de evidencia, derivados y estados sin contexto inventado |
| `src/engine/` | Separar cálculo físico, evaluación de perfiles, riesgos y composición; funciones puras |
| `src/services/weatherService.ts` | Adaptador por grupos, horarios, unidades y respuestas parciales |
| `src/engine/measurementPresentation.ts` | Adaptación a textos, cobertura y versión guardada |
| `src/screens/MeasureScreen.tsx` | Selector opcional de especie entre etapa y pasos; captura inmutable y llegada climática conservando cancelación |
| `src/components/MeasurementResultFlow.tsx` y pronóstico | Presentar razones, derivados y consultas opcionales |
| `tests/` | Casos de la matriz y regresiones del flujo actual |
| `supabase/migrations/` | Sólo si el contrato persistido lo necesita; nunca editar el volcado como fuente |

No se requiere una dependencia nueva para calcular DPV o evaluar tablas. Antes de introducir bibliotecas, servicios adicionales o un cálculo climático complejo, justificar el beneficio y sus obligaciones de mantenimiento. No incorporar una API de inteligencia artificial para redactar conclusiones agronómicas.

<a id="decisiones"></a>
## 15. Decisiones y límites de activación

### 15.1. Decisiones establecidas por esta propuesta

- Sin nuevos datos obligatorios del agricultor. La etapa es obligatoria; la especie es opcional, sólo en vegetativo, floración y cosecha, y se guarda por medición.
- Catálogo separado de los riesgos ambientales generales; la lista de especies no implica perfil con criterios.
- Medición local, derivado local, pronóstico y reanálisis identificados por separado.
- No asignar una especie ni textura a partir de sugerencias o inferencias.
- Reglas explicables; límite importante no compensado por promedios de conveniencia.
- Sin dosis ni diagnósticos que requieran variables ausentes.
- Clima opcional; resultado local disponible sin red ni ubicación.
- Catálogos/fuentes versionados e históricos que preservan lo que se sabía al capturar.
- Cambios visuales concentrados en motivos y comparación temporal; el selector opcional de especie es el único formulario nuevo.

### 15.2. Trabajo técnico que debe cerrarse antes de habilitar capacidades

| Cuestión | Responsable funcional | Efecto mientras no esté resuelta |
|---|---|---|
| Método y compensación de CE del equipo utilizado | Caracterización del instrumento | Sin equivalencia automática con tablas de salinidad |
| Método/calibración de pH y humedad | Caracterización y evidencia agronómica | Coincidencias parciales; sin inferir reservas de agua |
| Exposición y estabilización del BME280 integrado | Pruebas del instrumento | Derivados identificados como instantáneos; no garantías de exactitud del ambiente del cultivo |
| Contexto y umbrales de reglas de calor, DPV y humedad persistente | Revisión de evidencia | Indicadores continuos disponibles; categorías/acciones incompletas deshabilitadas |
| Admisión de cada perfil y resolución de fuentes contradictorias | Curación del catálogo | Perfil o criterio incompleto fuera de las sugerencias concluyentes |
| Cobertura mínima, frescura y comparación temporal | Diseño y pruebas del motor | No emitir resultado favorable con cobertura desconocida |
| Disponibilidad, costo y acceso comercial al clima | Integración del proveedor | No dependencia obligatoria de un producto no contratado o sin cobertura |
| Capacidad de persistir series y razones | Ingeniería de la app y datos | Medir tamaño y cerrar contrato antes de desplegar |
| Mapeo de estado insuficiente en listas e históricos | Ingeniería de interfaz | No convertir ausencia de evaluación en verde por compatibilidad |

Estas cuestiones no requieren más formularios ni respuestas del agricultor. Son requisitos de desarrollo y verificación del equipo. La implementación debe priorizar capacidades habilitables y conservar explícitamente los criterios que aún no puede evaluar.

<a id="fuentes"></a>
## 16. Fuentes consultadas

Consulta documental: 10 de octubre de 2026. Los enlaces respaldan el aspecto indicado, no todas las reglas propuestas. Los parámetros futuros necesitan localización exacta de la afirmación dentro de su fuente; una fuente institucional no convierte automáticamente cualquier inferencia en una regla válida. Esta lista es bibliografía de la especificación, no un registro de cambios.

<a id="s01"></a>
**S01 — Open-Meteo, Forecast API.** [Documentación oficial](https://open-meteo.com/en/docs). Secciones de variables horarias/diarias y parámetros temporales. Sustenta disponibilidad y semántica de campos; la selección, agrupación y reglas de uso son diseño de TerraSense.

<a id="s02"></a>
**S02 — Open-Meteo, Historical Weather API.** [Documentación oficial](https://open-meteo.com/en/docs/historical-weather-api). Sustenta el uso de reanálisis y sus productos. No representa un sensor instalado en el campo.

<a id="s03"></a>
**S03 — Open-Meteo, Ensemble API.** [Documentación oficial](https://open-meteo.com/en/docs/ensemble-api). Referencia para una extensión de escenarios; no valida probabilidades de daño a cultivos.

<a id="s04"></a>
**S04 — Bosch Sensortec, BME280.** [Página técnica del fabricante](https://www.bosch-sensortec.com/en/products/environmental-sensors/humidity-sensors-bme280). Identifica las magnitudes del componente y su documentación. La caracterización del montaje TerraSense es independiente.

<a id="s05"></a>
**S05 — METER Group, Soil electrical conductivity: the complete guide to measurements.** [Guía del fabricante](https://metergroup.com/education-guides/soil-electrical-conductivity-the-complete-guide-to-measurements/). Distingue CE aparente, de solución y de extracto; explica requisitos de conversiones. No documenta el método interno de la sonda TerraSense.

<a id="s06"></a>
**S06 — FAO, Water quality for agriculture, salinidad.** [Capítulo técnico](https://www.fao.org/4/t0234e/t0234e03.htm). Referencia de tolerancia y contexto de medición. No autoriza trasladar límites entre agua de riego, extractos y una lectura directa.

<a id="s07"></a>
**S07 — FAO-56, Chapter 3: Meteorological data.** [Capítulo y ecuaciones](https://www.fao.org/4/x0490e/x0490e07.htm). Ecuaciones de presión de vapor, humedad y constante psicrométrica. La inversión para rocío indicada en el documento es una derivación algebraica de la relación de saturación.

<a id="s08"></a>
**S08 — FAO-56, Chapter 2: FAO Penman-Monteith equation.** [Método de referencia](https://www.fao.org/4/x0490e/x0490e06.htm). Define superficie de referencia y necesidades meteorológicas; no es una receta de riego de cultivo desconocido.

<a id="s09"></a>
**S09 — University of California IPM, Disease Model Database.** [Modelos y alcance](https://ipm.ucanr.edu/DISEASE/DATABASE/diseasemodeldatabase.html). [Ejemplo de dependencia de mojamiento y temperatura](https://ipm.ucanr.edu/DISEASE/DATABASE/dsvtable.html). Fundamenta por qué no se activa un diagnóstico fitopatológico sólo con HR y temperatura instantáneas.

<a id="s10"></a>
**S10 — UC ANR, Seed Germination Temperature and Timing.** [Tabla institucional](https://ucanr.edu/program/uc-master-gardener-program/seed-germination-temperature-and-timing). Remite al California Master Gardener Handbook, segunda edición, publicación 3382, tabla 5.2, página 114. Base de los ejemplos térmicos convertidos de esta especificación; no describe trasplante ni aptitud integral del campo.

<a id="s11"></a>
**S11 — FAO, ECOCROP.** [Descripción, alcance y estado del recurso](https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/). Índice de características de plantas para localizar evidencia; su discontinuación de actualización limita el uso como referencia vigente única.

<a id="s12"></a>
**S12 — University of Minnesota Extension, Growing tomatoes in home gardens.** [Ficha de tomate](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-tomatoes). Apartados de pH, germinación y trasplante. No trasladar fechas de Minnesota a Chile ni importar dosis de fertilización.

<a id="s13"></a>
**S13 — University of Minnesota Extension, Growing basil.** [Ficha de albahaca](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/yard-and-garden-problems/growing-basil). Apartados de suelo, pH y establecimiento; no habilita perfiles de todas las aromáticas.

<a id="s14"></a>
**S14 — University of Minnesota Extension, Strawberry nutrient management.** [Referencia de frutilla](https://extension.umn.edu/agriculture/specialty-crops/commercial-fruit-production/strawberry-farming/strawberry-nutrient-management). Se consulta el antecedente de pH y contexto. No se adoptan sus dosis a partir de NPK de la sonda.

<a id="s15"></a>
**S15 — University of Minnesota Extension, Growing raspberries in the home garden.** [Ficha de frambuesa](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-raspberries-in-the-home-garden). Diferencia formas productivas y condiciones de establecimiento; no convierte datos locales en recomendación varietal chilena.

<a id="s16"></a>
**S16 — INIA Quilamapu, presentación de Aptitud térmica de cultivos para la Región de Ñuble.** [Referencia institucional al libro](https://www.inia.cl/2024/11/04/libro-de-inia-identifica-zonas-optimas-para-establecer-cultivos-y-frutales-en-nuble-considerando-incremento-de-temperaturas/). Ruta hacia evidencia local. La noticia no se usa como fuente de valores numéricos del catálogo.

<a id="s17"></a>
**S17 — INIA, Hortalizas versus heladas.** [Artículo técnico institucional](https://www.inia.cl/2024/06/25/hortalizas-versus-heladas/). Diferencias de respuesta al frío según hortaliza y órganos; no un único límite universal.

<a id="s18"></a>
**S18 — Referencias institucionales de arándano.** [University of Maryland Extension, Growing Blueberries in the Mid-Atlantic](https://www.extension.umd.edu/resource/growing-blueberries-mid-atlantic-fs-2025-0766) y [University of Minnesota Extension, Growing blueberries in the home garden](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-blueberries-in-the-home-garden). Referencias para registrar diferencias de contexto; no se promedian rangos ni se prescriben enmiendas.

<a id="s19"></a>
**S19 — Open-Meteo, Terms.** [Condiciones oficiales](https://open-meteo.com/en/terms). Distinción de uso no comercial/comercial y atribución. Verificar condiciones vigentes al desplegar; no se documenta un precio fijo.

<a id="s20"></a>
**S20 — INIA, visualizador agroclimático para proyectos frutícolas.** [Descripción institucional](https://www.inia.cl/2026/07/06/programa-araucania-fruticola-de-inia-desarrolla-innovador-visualizador-agroclimatico-para-fortalecer-la-toma-de-decisiones-en-proyectos-fruticolas/). Fundamenta la importancia de historia climática, especie, variedad y estado fenológico en evaluaciones de frutales.

<a id="s21"></a>
**S21 — University of Minnesota Extension, Soil moisture sensors for irrigation scheduling.** [Guía técnica](https://extension.umn.edu/natural-resources/conservation/agricultural-soil-and-water/irrigation/soil-moisture-sensors-for-irrigation-scheduling). Ubicación, profundidad y propiedades del suelo en la interpretación de humedad. No se importan a la sonda portátil los supuestos de una instalación fija.

<a id="s22"></a>
**S22 — University of Maryland Extension, Mid-Atlantic Commercial Vegetable Production Recommendations 2026, sección B.** [Soil and Nutrient Management](https://extension.umd.edu/sites/extension.umd.edu/files/2026-02/Soil%20and%20Nutrient%20Management.pdf). Tabla B-1 «Target Soil pH Values for Vegetable Crops», p. 40: pH objetivo y pH bajo el cual encalar por hortaliza. No fija máximos ni reemplaza el requerimiento de cal de un laboratorio.

<a id="s23"></a>
**S23 — INIA, Manual de cultivo del tomate al aire libre (Boletín INIA–INDAP).** [Capítulo 1](https://biblioteca.inia.cl/server/api/core/bitstreams/21592963-55e3-43bb-9426-bd9ec288ae07/content), apartado 1.5.1 «Suelo», p. 16. pH óptimo de 6 a 6,5 y cultivos establecidos con pH 8 en Arica y Parinacota. Apartado 1.5.2 «Clima» y cuadro 1.3: la planta se hiela a −2 °C, bajo 10 °C se afecta la formación de flores y sobre 35 °C la fructificación.

<a id="s24"></a>
**S24 — INIA Quilamapu, Manual de frutilla (Boletín INIA N° 262, 2013).** [Documento](https://bibliotecadigital.ciren.cl/server/api/core/bitstreams/6989b90c-bc5f-494d-b790-fe196c0d430d/content). Capítulo 1, «Requerimientos de suelo» y cuadro 1: pH 5,8–7,0 y efectos bajo 5,8 y sobre 7,2. «Requerimientos agroclimáticos», pp. 7–8: aborto floral sobre 32 °C, raíces mejor con suelo sobre 12 °C y cosecha sin lluvias; «Pudrición gris», pp. 69–70: fruta madura susceptible con agua y más de 15 °C.

<a id="s25"></a>
**S25 — INIA La Platina, El cultivo del cerezo (Boletín INIA N° 133, 2005).** [Registro en la biblioteca INIA](https://biblioteca.inia.cl/items/4ed5eb65-a167-4db2-a6bc-1ebb7a26c489). Apartado «Suelo»: pH óptimo 6,0–6,5 y deficiencias de microelementos sobre 7,5. La tolerancia depende del portainjerto. Apartados «Temperatura» (cuadro 2, de Proebsting y Mills) y «Humedad relativa»: daño en flor desde −1,1 °C, temperaturas de congelamiento de yemas por estado, polen afectado sobre 30 °C, crecimiento limitado sobre 36 °C y partidura por lluvia en cosecha.

<a id="s26"></a>
**S26 — INIA Intihuasi, Manual del cultivo del olivo (Boletín INIA N° 101, 2003).** [Registro en la biblioteca INIA](https://biblioteca.inia.cl/items/f6a76e2b-197e-4643-8243-d29bc434cf1a). Capítulo 1 «Requerimientos de clima y suelo», p. 18: crecimiento con pH 5,5–8,5, preferible bajo 7,5. Cuadro 2 y floración, pp. 11–14: brotes tiernos dañados entre 0 y −5 °C, muerte de ramillas entre −5 y −10 °C, actividad detenida sobre 35 °C, caída de flores con niebla y estigma deshidratado con humedad bajo 50 %. La fila de frutos («menos de 5») es ambigua y no se usa.

<a id="s27"></a>
**S27 — Nebraska Extension, Frost – Cold Temperatures Bring an End to the Gardening Season (S. Browning, 2023).** [Artículo](https://lancaster.unl.edu/frost-cold-temperatures-bring-end-gardening-season/). Hortalizas «very hardy» (bajo 28 °F por períodos cortos), «frost tolerant» (28–32 °F sin daño) y «tender» (daño o muerte con 28–32 °F); cosecha antes de la helada de zapallo, tomate, pimiento, poroto y zapallo italiano.

<a id="s28"></a>
**S28 — South Dakota State University Extension, Fall Frost Tolerance of Common Vegetables (R. Burrows, 2023).** [Artículo](https://extension.sdstate.edu/fall-frost-tolerance-common-vegetables). Hortalizas sin tolerancia (proteger o cosechar antes de una helada leve), con tolerancia a helada leve (28–32 °F) y resistentes (24–28 °F; brócoli y coliflor hasta 26 °F).

<a id="s29"></a>
**S29 — South Dakota State University Extension, Leeks: Harvest and Storage (D. Kohn, 2025).** [Artículo](https://extension.sdstate.edu/leeks-harvest-and-storage). La cosecha de puerro puede esperar a las primeras heladas; bajo 20 °F se indica protegerlo.

<a id="s30"></a>
**S30 — Colorado State University Extension, Vegetable Planting Guide (CMG GardenNotes #720).** [Guía](https://extension.colostate.edu/resource/vegetable-planting-guide/). Clasifica el apio como intolerante a la helada; contrasta S27, que lo considera tolerante a heladas leves.

<a id="s31"></a>
**S31 — University of Wisconsin–Madison Extension, Growing onions, garlic, leeks, and other alliums in Wisconsin (A3785).** [Publicación](https://hort.extension.wisc.edu/files/2023/10/A3785-Growing-Onions-Garlic-Leeks-and-Other-Alliums-in-Wisconsin-KA-Delahaut-and-AC-Newenhouse.pdf). La cebolla de verdeo es cebolla inmadura; la cebolla de hoja (Allium fistulosum) es muy resistente al frío, sin temperatura documentada.

<a id="s32"></a>
**S32 — Iowa State University Extension and Outreach, Harvesting Asparagus (R. Jauron, 2018).** [Artículo](https://yardandgarden.extension.iastate.edu/article/2018/03/harvesting-asparagus). Los turiones tiernos son sensibles a la helada; no da una temperatura.

<a id="s33"></a>
**S33 — Marmolejo y Ruiz, Tolerancia de papas nativas (Solanum spp.) a heladas en el contexto de cambio climático, Scientia Agropecuaria 9(3), 2018.** [Artículo](https://www.scielo.org.pe/scielo.php?script=sci_arttext&pid=S2077-99172018000300010). Introducción: la mayoría de las variedades cultivadas de papa son sensibles bajo −2,5 °C, con daño foliar visible.

<a id="s34"></a>
**S34 — Penn State Extension, Frost and Freeze Damage on Berry Crops (K. Demchak, 2026).** [Artículo](https://extension.psu.edu/frost-and-freeze-damage-on-berry-crops). Temperaturas críticas de flor: frutilla abierta 30 °F; arándano abierta 27 °F y caída de pétalos 28 °F. Cerca del suelo el aire puede estar hasta 5 °F más frío que la mínima de referencia.

<a id="s35"></a>
**S35 — University of Georgia Cooperative Extension, Blueberry Harvesting and Postharvest Handling (Circular 1269, 2023).** [Publicación](https://fieldreport.caes.uga.edu/publications/C1269/blueberry-harvesting-and-postharvest-handling/). No cosechar arándano con plantas mojadas por rocío o lluvia: cosechar con lluvia puede partir la fruta.
