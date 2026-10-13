# Task motor agronómico

## 1. Objetivo y forma de revisión

Implementar por entregas la [especificación del motor agronómico](MOTOR_AGRONOMICO.md), conservando la lectura local sin red y sin pedir datos obligatorios nuevos al agricultor (la especie es opcional). Este archivo describe el avance vigente; las decisiones, fórmulas y criterios de producto se mantienen en la especificación, y el historial de cambios en git.

**Estado: E1 en progreso; E1.1/E1.2 verificados y E1.3 integrado al flujo de captura, con cierre parcial.** El resultado nuevo conserva cobertura por capacidad, limita comparaciones por método y vigencia, y distingue evidencia insuficiente de alertas. No se acredita validación agronómica o del equipo.

**Bloqueos para seguir desarrollando: ninguno que requiera una decisión del usuario.** Las casillas abiertas son trabajo de implementación, no solicitudes de aprobación. Siguen física local y clima horario para completar los casos pendientes de E1. La lista de especies y el selector opcional pueden avanzar en paralelo. La caracterización instrumental y el contraste en terreno requieren pruebas reales y se coordinan en E7; las extensiones de E8 son posteriores al motor base.

- `[x]` Implementado y verificado por software con la evidencia indicada.
- `[ ]` Pendiente. Una tarea no se cierra sólo porque exista un tipo, una pantalla o una prueba parcial.
- Cada entrega debe indicar código afectado, pruebas realizadas y límites que siguen abiertos. Las pruebas físicas se cierran únicamente con evidencia del equipo.

| Entrega | Estado | Dependencia y condición de cierre |
| --- | --- | --- |
| E1 — Calidad y contratos | E1.1/E1.2 completos; E1.3 integrado parcialmente | Faltan derivados, caché y verificación en teléfono |
| E2 — Física local | Pendiente | E1; fórmulas y dominios comprobados |
| E3 — Clima horario | Pendiente | E1; intervalos, caché y peticiones ligados a la captura |
| E4 — Motor por etapa | Pendiente | E1–E3; riesgos independientes del catálogo y prioridades coherentes |
| E5 — Catálogo con evidencia | Pendiente | Lista de especies: sin dependencia. Criterios: E1/E2 y evidencia revisada; cada criterio activo tiene fuente y método compatible |
| E6 — Resultado y persistencia | Pendiente | Selector de especie: lista de E5. Resto: E4/E5; presentación e instantánea versionadas, legibles sin recalcular |
| E7 — Equipo y terreno | Pendiente | Capacidades habilitadas; contraste físico y revisión agronómica |
| E8 — Extensiones justificadas | Pendiente | Base verificada; beneficio y costo demostrados |
| ES — Especie de la medición | ES1–ES4 por software; ES5 en teléfono pendiente; ES6 con pH de 32 especies | Lista con fuentes, selector, resultado e historial; criterios por especie y etapa (ES6) en curso |

## 2. ES — Especie de la medición

Trabajo prioritario: primero la app y su lista de especies (ES1–ES5); después, de lleno, la base de criterios por especie y etapa (ES6). Las decisiones de producto están en la [sección 12.1](MOTOR_AGRONOMICO.md#pantallas) y la cobertura comprometida en la [sección 7.3](MOTOR_AGRONOMICO.md#catalogo) de la especificación. Este bloque reemplaza las casillas de lista y selector que antes vivían en E5/E6.

### ES1. Lista de especies con fuente

**Criterio de inclusión:** la especie se cultiva en Chile y aparece con superficie en una estadística oficial, o se comercializa en los mercados mayoristas y su cultivo en Chile consta en otra fuente oficial. Se excluyen frutas que sólo se importan (plátano, piña, coco), categorías agregadas («otras hortalizas», «huerta casera», «otros cereales»), semilleros y nombres ambiguos («Palma» del catastro).

**Nivel:** especie o cultivo comercial general («Lechuga», «Tomate»), nunca variedad ni tipo comercial («Lechuga escarola», «Tomate cherry»). Se unen las categorías estadísticas de un mismo cultivo: cebolla temprana y de guarda; manzano rojo y verde; ciruelo europeo y japonés; duraznero conservero y de consumo fresco; trigo blanco y candeal; poroto verde, granado y de grano; maíz de grano, de silo y choclo; vid de mesa, vinífera y pisquera; kiwi verde y amarillo. Se mantienen separados los cultivos que el agricultor maneja como distintos aunque compartan especie botánica (acelga, betarraga y remolacha; avellano y castaño).

**Fuentes consultadas el 11 de octubre de 2026:**

| Fuente | Qué aporta | Acceso |
| --- | --- | --- |
| INE, Encuesta de superficie hortícola 2023 | 28 hortalizas con superficie nacional y frutilla | [Biblioteca ODEPA](https://bibliotecadigital.odepa.gob.cl/items/a4e3ae62-900d-41d0-9b23-c94c3ed08a54) |
| INE–ODEPA, Encuesta Nacional Agropecuaria 2025/26 | Cereales, legumbres, tubérculos, industriales y forrajeras | [Biblioteca ODEPA](https://bibliotecadigital.odepa.gob.cl/items/d1424b0a-f70b-4549-8758-f157a2c9c371) |
| CIREN–ODEPA, Catastro frutícola | 63 nombres de especies frutales en los catastros regionales 2019–2025 | [Datos abiertos ODEPA](https://datos.odepa.gob.cl/dataset/catastro-fruticola) |
| ODEPA, precios mayoristas de frutas y hortalizas 2025 | Hortalizas y aromáticas comercializadas que la encuesta agrupa en «otras» | [Datos abiertos ODEPA](https://datos.odepa.gob.cl/dataset/precios-mayoristas-de-frutas-y-hortalizas) |
| SAG, Catastro vitícola 2024 | Vid para vino y pisco | [Informe ejecutivo](https://www.sag.gob.cl/sites/default/files/Informe%20ejecutivo%20Catastro%202024%20v2.0.pdf) |
| INFOR, Anuario forestal 2025 | Especies de plantación forestal (cobertura parcial) | [Biblioteca INFOR](https://bibliotecadigital.infor.cl/handle/20.500.12220/33115) |

- [x] Catálogo de identidad en `src/engine/speciesCatalog.ts`: ID estable `sp.<nombre>` (máximo 50 caracteres y sin colisión con los IDs del prototipo), nombre en español de Chile e inglés, nombre científico, grupo, sinónimos en ambos idiomas y fuentes.
- [x] Grupos: hortalizas; frutales; berries; cereales, legumbres e industriales; forrajeras; aromáticas (cobertura parcial); árboles forestales (cobertura parcial).
- [x] Tabla de completitud: cada nombre de las fuentes de hortalizas, frutales y cultivos anuales queda asignado a una especie del catálogo o excluido con motivo. Una prueba falla si aparece un nombre sin destino.
- [x] Búsqueda sin distinguir tildes, mayúsculas ni idioma, por nombre o sinónimo; orden estable dentro de cada grupo.
- [x] Versión del catálogo `2.0.0` registrada en `crop_catalog_version`.
- [x] Pruebas T47 y de integridad: IDs únicos, fuentes presentes, nombres en ambos idiomas.

### ES2. Selector en el flujo de medición

- [x] Fase nueva entre «Etapa» y «Antes de medir», sólo en vegetativo, floración y cosecha; contador de pasos de 4 en esas etapas y de 3 en pre-siembra.
- [x] Barra desplegable con buscador, misma estética y movimiento de las pantallas de medición (curva de salida sin rebote, respeta «reducir movimiento»); tarjeta animada de la especie elegida con su grupo y nombre científico.
- [x] «Continuar» abajo, habilitado con una especie; «Saltar» arriba a la derecha.
- [x] Atrás del teléfono y de la pantalla: «Antes de medir» → especie → etapa.
- [x] Cambiar entre vegetativo, floración y cosecha conserva la especie; cambiar a pre-siembra la borra. Descartar la lectura o medir de nuevo parte sin especie. La especie no se guarda en el store global.
- [x] «Todo listo» muestra la especie elegida o «Sin especie».
- [ ] Letra grande, lector de pantalla e inglés.

### ES3. «No se encuentra en la lista»

- [x] Opción al final de la lista y cuando la búsqueda no encuentra resultados.
- [x] Pantalla «Estamos trabajando para sumar más cultivos»: explica que la lectura se interpreta con el análisis general; botón para continuar sin especie y Atrás para volver a buscar.
- [x] Equivale a «Saltar»: la medición queda en `sin_especificar` y no se guarda texto libre.

### ES4. Resultado, historial y guardado

- [x] Presentación v3 con bloque de especie: ID, nombres, versión del catálogo y si hay criterios propios para la etapa. Las versiones 1 y 2 se siguen leyendo.
- [x] `crop_id` con el ID elegido o `sin_especificar`; no hace falta migración (`varchar(50)`).
- [x] Resumen del resultado: «ESPECIE · Tomate» bajo la etapa, o «Sin especie indicada». Contexto que explica si hay criterios propios para esa etapa.
- [x] Historial: la especie en la fila y en el detalle, leída del diagnóstico guardado; las mediciones antiguas con `crop_id` del prototipo no se muestran como especie elegida.
- [x] Alertas generales idénticas con y sin especie (T45), probado en `speciesPresentation.test.ts`.
- [x] Medición nueva sin especie heredada (T48): la especie vive sólo en el estado de la pantalla de medición, que se monta de nuevo en cada medición; las reglas de etapa, evaluación y guardado están en [measureSpecies.ts](src/utils/measureSpecies.ts) y se prueban en [measureSpecies.test.ts](tests/measureSpecies.test.ts). La lectura se evalúa con la especie elegida al tocar «Medir», no con una anterior. El recorrido en teléfono queda en ES5.

**Código y evidencia de ES1–ES4:** [speciesCatalog.ts](src/engine/speciesCatalog.ts) (115 especies en siete grupos), [SpeciesPicker.tsx](src/components/SpeciesPicker.tsx), [MeasureScreen.tsx](src/screens/MeasureScreen.tsx), [measurementPresentation.ts](src/engine/measurementPresentation.ts), [MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx) e [historial](src/screens/HistoryScreen.tsx); [speciesCatalog.test.ts](tests/speciesCatalog.test.ts), [speciesPresentation.test.ts](tests/speciesPresentation.test.ts), [measureSpecies.test.ts](tests/measureSpecies.test.ts) y los nombres exactos de las fuentes en [speciesSourceNames.json](tests/fixtures/speciesSourceNames.json). Los criterios propios de cada especie se describen en ES6.

### ES5. Verificación

- [x] `npm test`, `npm run type-check` y verificador documental.
- [ ] Recorrido en teléfono Android: elegir, buscar con y sin tildes, saltar, «no se encuentra», volver atrás, letra grande, inglés, guardar sin red y abrir el historial.

### ES6. Criterios por especie y etapa — en curso

Se aborda después de ES1–ES5, empezando por las especies de mayor superficie de cada grupo. Cada criterio sigue el [proceso de incorporación](MOTOR_AGRONOMICO.md#catalogo) de la especificación.

**Avance: pH habilitado en vegetativo y floración para 32 especies.** Código: [speciesRules.ts](src/engine/speciesRules.ts) (versión de criterios `1.1.0`); evidencia: [speciesRules.test.ts](tests/speciesRules.test.ts).

| Especies | Fuente | Qué se usa |
| --- | --- | --- |
| Apio, arveja, berenjena, betarraga, brócoli, camote, cebolla, cebollín, coliflor, espárrago, espinaca, lechuga, maíz (fila de choclo), melón, pepino, perejil, pimiento, poroto (fila de poroto verde), puerro, rabanito, repollito de Bruselas, repollo, sandía, zanahoria, zapallo y zapallo italiano | University of Maryland Extension, tabla B-1 de las recomendaciones de hortalizas 2026 ([S22](MOTOR_AGRONOMICO.md#s22)) | Valor objetivo y pH bajo el cual se indica encalar; la tabla no fija máximo |
| Papa | Misma tabla, dos filas por grupo de variedades | Sólo el mínimo común (5,0); entre 5,0 y 5,5 depende de la variedad, que no se conoce |
| Tomate | INIA, manual de tomate al aire libre ([S23](MOTOR_AGRONOMICO.md#s23)) y tabla B-1 | Óptimo 6–6,5 y mínimo 6,0; sin máximo, porque INIA documenta cultivos con pH 8 |
| Frutilla | INIA, Boletín 262 ([S24](MOTOR_AGRONOMICO.md#s24)), coherente con la tabla B-1 | Rango normal 5,8–7,0; límites documentados 5,8 y 7,2 |
| Cerezo | INIA, Boletín 133 ([S25](MOTOR_AGRONOMICO.md#s25)) | Óptimo 6,0–6,5; máximo 7,5; sin mínimo documentado |
| Olivo | INIA, Boletín 101 ([S26](MOTOR_AGRONOMICO.md#s26)) | Crece bien con 5,5–8,5; preferible bajo 7,5 |
| Arándano | University of Maryland Extension ([S18](MOTOR_AGRONOMICO.md#s18)) | Ideal 4,5–5,3; corregir bajo 4,3 o sobre 5,3 |

Cada criterio separa el óptimo (sólo orienta) de los límites donde la fuente documenta un problema o una corrección: únicamente cruzar un límite es advertencia, y un límite no documentado queda vacío. Una prueba exige que cada cifra aparezca en el valor original citado de su fuente. Los criterios de especie usan la misma regla de calidad y vigencia que el análisis general, no cambian el estado de la evaluación cuando sólo informan, y en el plan aparecen como seguimiento. No se habilitó pH en cosecha porque no gobierna esa etapa. Frambueso (Boletín INIA 372) y palto (manual INIA 1998) se revisaron y no documentan un rango de pH: siguen sin criterio.

- [ ] Familias de criterios por etapa: temperatura de suelo y aire (mínima, favorable y máxima) por etapa; sensibilidad a helada y calor en floración; tolerancia salina con su método; requerimientos hídricos cualitativos; condiciones meteorológicas relevantes para cosecha. El pH ya está habilitado (tabla anterior).
- [ ] Fuentes por prioridad: institucionales chilenas (INIA, ODEPA, universidades), extensión agrícola con tablas citables (UC ANR y equivalentes), FAO y ECOCROP sólo como índice para localizar evidencia.
- [ ] Registro por criterio: valor original, unidad, conversión, etapa, forma de establecimiento, contexto, fuente con sección o tabla y fecha de consulta. Los criterios de pH ya registran valor original, etapa, contexto, fuente con sección o tabla y fecha; falta la forma de establecimiento.
- [ ] Estados por criterio (candidato, documentado, habilitado) y exposición en el catálogo de qué etapas tienen criterios.
- [ ] Conectar `species-rules` al motor sin alterar las alertas generales; pasar T15–T19, T42, T45 y T46. Conectado y probado para pH: T15, T45 y T46 pasan; T16–T19 y T42 esperan criterios térmicos y la explicación de evaluación parcial de perennes.

## 3. E1 — Calidad y contratos

### E1.1. Disponibilidad del clima actual y diario

**Código:** [weatherService.ts](src/services/weatherService.ts), [contextualAdvice.ts](src/engine/contextualAdvice.ts). **Evidencia:** [weatherService.test.ts](tests/weatherService.test.ts), más las regresiones existentes de presentación e históricos.

- [x] Separar un normalizador puro con reloj recibido explícitamente del acceso a la red.
- [x] Admitir temperatura, precipitación y viento actuales ausentes como `null`, conservando ceros reales.
- [x] Conservar los días utilizables si falta la temperatura o todo el bloque actual.
- [x] Cuando falta la fecha actual, obtener el día desde el instante de consulta y la zona del proveedor; no usar la zona del teléfono ni inventar una ciudad.
- [x] Asociar el resumen de hoy por fecha y preservar huecos en los cinco días siguientes; rechazar fechas duplicadas ambiguas.
- [x] Rechazar valores no finitos, tipos incorrectos, lluvia/viento negativos, probabilidades fuera de rango y pares mínimo/máximo incoherentes.
- [x] Solicitar explícitamente unidades de temperatura, viento y precipitación al proveedor.
- [x] Evitar peticiones con coordenadas no finitas o fuera del dominio geográfico.
- [x] Indicar cobertura incompleta en español e inglés, incluso cuando los datos disponibles sí activan una alerta. Una lista vacía no equivale a cinco días sin alertas.
- [x] Conservar los valores y las ausencias al serializar el resultado para el diagnóstico existente.

**Cobertura de la matriz:** T05/T06 para clima; T30 para conservación del futuro; T27 para probabilidad sin cantidad; parte de T28 para mensajes de cobertura y de T24 para fechas diarias. Estas pruebas no cierran los casos completos del motor ni validan intervalos horarios.

**Límites:** se mantiene el pronóstico diario existente. No hay serie horaria, caché ni política nueva de antigüedad. La causa de un valor nulo y la validación de unidades ya se registran mediante E1.2. Las respuestas de las pruebas son sintéticas; no certifican cobertura real del proveedor en Chile.

### E1.2. Calidad por dato y procedencia

**Código:** [tipos agronómicos](src/types/agronomy.ts), [normalización de calidad](src/engine/inputQuality.ts), [recepción de sonda](src/services/probeService.ts), [servicio climático](src/services/weatherService.ts), [captura](src/screens/MeasureScreen.tsx) y [presentación](src/engine/measurementPresentation.ts). **Evidencia:** [inputQuality.test.ts](tests/inputQuality.test.ts) y [weatherService.test.ts](tests/weatherService.test.ts).

- [x] Definir un contrato versionado que separe disponibilidad, calidad de medición y posibilidad de interpretación.
- [x] Registrar fuente, unidad esperada e informada, instante/intervalo, tipo de agregado, método y códigos de limitación por dato. Los tiempos no acreditados permanecen nulos con motivo explícito.
- [x] Normalizar las diez variables del equipo sin sustituir ambiente ausente con clima modelado; compartir los rangos de integridad con el decodificador BLE.
- [x] Excluir el `lux` heredado del contrato nuevo de entradas y declarar los registros de nutrientes sin validación química.
- [x] Registrar método de conductividad desconocido y limitación de comparabilidad de pH, visibles en los detalles existentes y sin añadir formularios.
- [x] Validar unidades devueltas por el proveedor y distinguir campo ausente, inválido y con interpretación limitada.
- [x] Probar determinismo, integridad y preservación de valores originales; conectar el contrato al flujo real de captura, presentación y diagnóstico guardado.

**Aceptación:** estados y motivos explícitos que llegan al consumidor y al diagnóstico; ausencia de ambiente no descarta suelo. No basta con declarar interfaces sin uso.

**Alcance:** el diagnóstico nuevo conserva `inputQuality`; el clima conserva su propia calidad y los intervalos con el desplazamiento fijo informado por el proveedor. Los históricos mantienen textos y datos guardados. Se distingue simulación, no se presupone calibración ni se presenta una muestra como sensor estabilizado. Un valor rechazado conserva su número finito original o el motivo de invalidez si no se puede serializar como número.

**Límite vigente:** E1.3 desactiva las comparaciones de conductividad en capturas nuevas y sugerencias. El evaluador legado de perfiles explícitos sigue reservado a pruebas; su sustitución y la revisión del catálogo corresponden a E4/E5. El conteo de datos disponibles mide adquisición, no aptitud agronómica. El recorrido real de guardado en teléfono sigue pendiente.

### E1.3. Cobertura y límites de interpretación — integrado, cierre parcial

- [x] Definir cobertura por capacidad, separada de gravedad y solidez de evidencia.
- [x] Impedir comparaciones categóricas de conductividad sin método compatible en el flujo de captura y presentar pH como coincidencia parcial.
- [x] Mantener nutrientes fuera de compatibilidad y dosis; comprobar que cambiar sus registros no altera esas decisiones.
- [x] Definir frescura y reloj de evaluación, y representar evidencia antigua sin convertirla en favorable.
- [x] Verificar el vínculo ubicación–captura y la separación entre suelo medido y modelado.
- [ ] Cerrar T04–T06, T10–T14 y T29–T32 según el alcance completo de E1; los casos de caché necesitan la integración de E3.

**Código y evidencia:** [evaluationCoverage.ts](src/engine/evaluationCoverage.ts), [stageEvaluator.ts](src/engine/stageEvaluator.ts), captura, clima, presentación e historial existentes; [evaluationCoverage.test.ts](tests/evaluationCoverage.test.ts) y regresiones de presentación, calidad y clima.

**Política técnica `capture-evidence-v1`:** hasta 30 minutos para interpretar una captura local y tres horas desde la consulta climática, incluyendo el límite exacto. No son constantes agronómicas ni garantías de representatividad. El reloj se recibe explícitamente; tiempos futuros o desconocidos suspenden la interpretación. El pronóstico exige identificador de captura y coordenadas solicitadas coincidentes. El historial conserva la evaluación original sin recalcular su antigüedad.

**Resultado:** coincidencias parciales por temperatura y pH; conductividad sin categorías de salinidad; nutrientes fuera de compatibilidad y dosis. Estado semántico y cobertura guardados en el diagnóstico. La insuficiencia tiene presentación neutral en resultado e historial; ámbar se conserva únicamente en el campo legado para evitar que clientes antiguos la interpreten como éxito.

**Pendientes:** derivados y T04/T10 completos en E2; caché, intervalos, cancelación integral y recorridos de guardado en E3/E6. T31 verifica aquí rechazo de evidencia antigua, no una caché implementada. El evaluador legado de perfiles explícitos conserva sus reglas y no se usa en capturas nuevas. La independencia de alertas respecto del catálogo y la revisión de sus fuentes corresponden a E4/E5. Falta verificar en teléfono.

## 4. E2 — Física local

**Dependencia:** E1.2. **Áreas:** funciones puras en `src/engine/`, tipos y pruebas.

- [ ] Revisar el cálculo existente de déficit de presión de vapor y verificar fórmula y dominio contra la fuente de la especificación.
- [ ] Implementar punto de rocío y consistencia entre magnitudes, con entradas/fórmula/versiones trazables.
- [ ] Tratar humedad relativa cero, saturación y presión ausente según las dependencias reales de cada fórmula.
- [ ] Mantener indicadores continuos; no activar categorías o acciones con umbrales sin evidencia revisada.
- [ ] Pasar T07–T11 y conectar los derivados al resultado conservando sus limitaciones instantáneas.

## 5. E3 — Clima horario

**Dependencia:** E1; revisar [contrato del proveedor](https://open-meteo.com/en/docs) antes de activar grupos.

- [ ] Verificar variables, unidades y disponibilidad con respuestas reales para Chile y conservar fixtures reproducibles.
- [ ] Incorporar lo que queda del día e intervalos horarios sin deducir horas desde resúmenes diarios. Avance: el día de la consulta (`today`) y el tiempo actual por código WMO (`weatherCode`, diario y actual) ya se piden, validan y guardan; hoy cuenta en las alertas de lluvia, helada y calor, y la lluvia en curso abre el plan. La serie horaria sigue pendiente. Código: [weatherService.ts](src/services/weatherService.ts), [weatherOutlook.ts](src/engine/weatherOutlook.ts); evidencia: [weatherOutlook.test.ts](tests/weatherOutlook.test.ts), con la forma de una respuesta real del 12 de octubre de 2026 en Santiago.
- [ ] Normalizar intervalos y cambios de hora de Chile; los huecos interrumpen la continuidad.
- [ ] Mantener separados probabilidad, cantidad y componentes de precipitación; evitar dobles conteos de agua y evapotranspiración de referencia.
- [ ] Añadir caché y política de vigencia vinculadas a ubicación/producto; conservar errores parciales.
- [ ] Cancelar solicitudes al salir/cambiar de cuenta y descartar respuestas de otra captura; comprobar el patrón existente de guardado antes del clima.
- [ ] Medir peticiones, latencia y tamaño de respuesta; revisar condiciones de uso antes del despliegue.
- [ ] Pasar T21–T32 y T36–T38 con integración, además de las pruebas puras.

## 6. E4 — Motor por etapa

**Áreas:** [stageEvaluator.ts](src/engine/stageEvaluator.ts), [contextualAdvice.ts](src/engine/contextualAdvice.ts) y funciones de decisión.

- [ ] Separar reglas ambientales del conjunto de perfiles: agregar o reordenar cultivos no altera una alerta general.
- [ ] Registrar IDs/versiones, entradas, razones, fuentes y límites para cada regla habilitada.
- [ ] Implementar prioridades y resolución de conflictos; evitar aumentar gravedad por evidencia duplicada.
- [ ] Revisar salidas de vegetativo, floración y cosecha según el alcance autorizado, sin inferir especie, enfermedad, madurez ni tránsito seguro.
- [ ] Conservar cobertura insuficiente en el estado resultante y coherencia entre ambos idiomas.
- [ ] Pasar T01–T03, T20, T33–T34, T40 y T44.

## 7. E5 — Catálogo con evidencia

La lista de especies y los criterios de vegetativo, floración y cosecha se trabajan en [ES](#2-es--especie-de-la-medición). Esta entrega conserva los perfiles de pre-siembra.

- [ ] Curar perfiles con identificadores estables, fuentes precisas, versiones y forma de establecimiento.
- [ ] Incorporar límites térmicos superiores e inferiores aplicables; no trasladar semilla a trasplante.
- [ ] Comparar sólo criterios con evidencia y método compatibles; conservar limitaciones de pH y conductividad.
- [ ] Tratar parámetros faltantes sin premiar al perfil incompleto y explicar ausencia de coincidencias sin afirmar imposibilidad universal.
- [ ] Limitar sugerencias a pre-siembra; distinguir evaluación parcial de perennes.
- [ ] Pasar T15–T19, T42 y T46–T47, con contraejemplos acidófilos y fronteras documentadas.

## 8. E6 — Resultado, pantallas y persistencia

**Áreas:** [MeasureScreen.tsx](src/screens/MeasureScreen.tsx), [measurementPresentation.ts](src/engine/measurementPresentation.ts), [MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx) y lectores de históricos.

El selector de especie, su guardado y su presentación se trabajan en [ES](#2-es--especie-de-la-medición).

- [ ] Integrar el resultado nuevo en las pantallas existentes, mostrando la limitación que cambia la interpretación.
- [x] Plan de recomendaciones estructurado (tema, urgencia, momento, título y explicación) en `ContextualAdvice.recommendations` y en la presentación v3 como campo opcional; las lecturas anteriores siguen mostrando sus acciones. Es la última pantalla del resultado, después del clima. Evidencia: [weatherOutlook.test.ts](tests/weatherOutlook.test.ts).
- [x] Pantalla de clima con «Hoy · ahora», resumen de los próximos días y franja compacta; páginas de lecturas con explicación e ilustración; navegación por deslizamiento tipo carrusel y batería de la sonda en la barra superior.
- [x] Historial filtrable por especie y agrupable por fecha, especie o etapa, leyendo la instantánea guardada; el backoffice muestra la especie ([migración](../supabase/migrations/20261012120000_especie_en_mediciones_soporte.sql)). Evidencia: [measurementHistory.test.ts](tests/measurementHistory.test.ts).
- [ ] Incorporar detalle opcional de alternativas sin convertir su consulta en selección de cultivo.
- [ ] Ampliar pronóstico con comparación temporal y derivados identificados, sin pasos obligatorios nuevos.
- [ ] Guardar instantánea compacta de datos usados, razones, cobertura y versiones; medir tamaño del diagnóstico y cola sin red.
- [ ] Mantener históricos sin recalcular ni incorporar pronóstico nuevo; conservar lectura de contratos anteriores.
- [ ] Verificar guardar antes del clima, llegada posterior, salida y cambio de cuenta.
- [ ] Pasar T35–T40, T43, T45 y T48; verificar navegación, letra grande, idioma y lectura sin red en Android/iOS.
- [ ] Crear migraciones sólo si el contrato final las necesita. La especie del backoffice no agrega columnas: devuelve la de la instantánea.

## 9. E7 — Equipo y terreno

- [ ] Coordinar el contraste físico con [Firmware/TASK.md](../Firmware/TASK.md), sin simular capacidades pendientes del instrumento.
- [ ] Registrar evidencia de método, calibración, repetibilidad y condiciones de captura en la documentación técnica existente.
- [ ] Revisar aplicabilidad agronómica y contraejemplos locales de cada capacidad habilitada.
- [ ] Comprobar comprensión con personas: medido, previsto, parcial y no evaluado.
- [ ] Mantener T41: una sonda portátil no acredita continuidad de profundidad o manejo por cercanía GPS.

## 10. E8 — Extensiones justificadas

- [ ] Evaluar contexto climático histórico, perennes y escenarios sólo después de verificar la base.
- [ ] Documentar valor para decisiones, costo, latencia y límites de escala/variedad antes de activarlos.
- [ ] Mantener separados medición local, pronóstico y reanálisis; no inferir textura ni capacidad de campo.

## 11. Verificación del incremento vigente

Desde `App/`:

```powershell
npm test
npm run type-check
```

Desde la raíz:

```powershell
python docs/verificar_documentacion.py
```

El verificador incluye esta tarea y la especificación. Las pruebas de calidad de entrada y del servicio climático pertenecen al comando habitual de la app. E1.1/E1.2 no requieren dependencias ni migraciones nuevas.

**Resultados de verificación del incremento:** `npm test` aprobó la suite completa (347 pruebas) y `npm run type-check` terminó sin errores; el verificador documental, con 0 errores. Las pantallas se revisaron en un teléfono Android mediante Expo Go con lecturas simuladas y el pronóstico real de Open-Meteo. Son comprobaciones de software, no ensayos con la sonda.

**Revisión pendiente fuera de las pruebas automatizadas:** ejecución en teléfono y proveedor real. No se declara validación de terreno, precisión instrumental ni cierre completo de E1.
