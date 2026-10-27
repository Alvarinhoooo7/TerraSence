# Task motor agronómico

## 1. Objetivo y forma de revisión

Implementar por entregas la [especificación del motor agronómico](MOTOR_AGRONOMICO.md), conservando la lectura local sin red y sin pedir datos obligatorios nuevos al agricultor (la especie es opcional). Este archivo describe el avance vigente; las decisiones, fórmulas y criterios de producto se mantienen en la especificación, y el historial de cambios en git.

**Estado: motor base por software completo (E1–E6 y ES1–ES8); pendientes únicamente la verificación en teléfono de los detalles desplegables e inglés y la validación instrumental y en terreno (E7).** El resultado conserva cobertura por capacidad (`coverageSummary`), limita comparaciones por método y vigencia, fusiona recomendaciones duplicadas del mismo objetivo (§9.2), sugiere alternativas expandibles en pre-siembra con techo térmico y forma de establecimiento ([prePlanting.ts](src/engine/prePlanting.ts), sin pedir especie al agricultor), normaliza las cinco series horarias y lo que queda del día (`remainingToday`), compara ventanas meteorológicas en el pronóstico (`compareForecastWindows`, CO01–CO05, T28), registra de forma auditable las reglas `VG01–VG05`, `FL01–FL05` y `CO01–CO05` (`STAGE_OUTPUT_RULES`) y evalúa las 111 especies del catálogo en vegetativo, floración y cosecha (`SPECIES_RULES_VERSION` `2.9.0`). No se acredita validación agronómica en campo ni calibración del equipo.

**Bloqueos para seguir desarrollando: ninguno que requiera una decisión del usuario.** Las casillas abiertas son trabajo de implementación o pruebas en teléfono, no solicitudes de aprobación. En pre-siembra la decisión de diseño central es **no pedir ningún tipo de especie al agricultor**, porque el propósito de esa etapa es que el motor le sugiera y recomiende cultivos compatibles a partir de la medición del suelo. La caracterización instrumental y el contraste en terreno requieren pruebas reales y se coordinan en E7; las extensiones de E8 son posteriores al motor base.

- `[x]` Implementado y verificado por software con la evidencia indicada.
- `[ ]` Pendiente. Una tarea no se cierra sólo porque exista un tipo, una pantalla o una prueba parcial.
- Cada entrega debe indicar código afectado, pruebas realizadas y límites que siguen abiertos. Las pruebas físicas se cierran únicamente con evidencia del equipo.

| Entrega | Estado | Dependencia y condición de cierre |
| --- | --- | --- |
| E1 — Calidad y contratos | E1.1–E1.3 completos por software | Falta verificación en teléfono |
| E2 — Física local | Completa por software | Falta un BME280 con humedad para contrastar en el equipo (F3 del firmware) |
| E3 — Clima horario | Completa por software (`today`, `remainingToday`, 5 series horarias, fixture para Chile, presupuesto de respuesta y caché sin red) | Queda sólo contrastar latencia en campo real |
| E4 — Motor por etapa | Completa por software: reglas generales con ID y sin catálogo (`GEN-PH-01` sin contradicción con especie), registro auditable `VG01–VG05`, `FL01–FL05` y `CO01–CO05` (`STAGE_OUTPUT_RULES`), orden del plan y fusión de acciones del mismo objetivo (§9.2) | E1–E3; riesgos independientes del catálogo y prioridades coherentes |
| E5 — Catálogo con evidencia | Completa por software ([prePlanting.ts](src/engine/prePlanting.ts) con 28 perfiles en pre-siembra y [speciesCatalog.ts](src/engine/speciesCatalog.ts) / [speciesRules.ts](src/engine/speciesRules.ts) en ES1–ES8) | En pre-siembra no se pide especie: el motor recomienda cultivos compatibles con techo térmico, método de establecimiento y distinción de perennes (T15–T19, T42) |
| E6 — Resultado y persistencia | Completa por software (`coverageSummary`, `cropOptions` expandibles en pre-siembra, `compareForecastWindows`, instantánea compacta `< 40 KB` y coordinación guardar/clima/cuenta); guardado sin red verificado en teléfono | Queda verificar los nuevos bloques desplegables y letra grande en teléfono |
| E7 — Equipo y terreno | Pendiente | Capacidades habilitadas; contraste físico y revisión agronómica |
| E8 — Extensiones justificadas | Pendiente | Base verificada; beneficio y costo demostrados |
| ES — Especie de la medición | ES1–ES4 por software; ES5 en teléfono parcial; ES6–ES8: las 111 especies del catálogo con perfil y criterios en las tres etapas (criterios `2.9.0`, catálogo `2.2.0`) | Lista con fuentes, selector, resultado e historial; criterios por especie y etapa (ES6); cobertura total del catálogo (ES7 y ES8) |

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
- [x] Versión del catálogo `2.2.0` registrada en `crop_catalog_version` (la `2.1.0` retira castaño, jojoba y tuna por ES7; la `2.2.0`, el haskap por ES8).
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

**Código y evidencia de ES1–ES4:** [speciesCatalog.ts](src/engine/speciesCatalog.ts) (111 especies en siete grupos), [SpeciesPicker.tsx](src/components/SpeciesPicker.tsx), [MeasureScreen.tsx](src/screens/MeasureScreen.tsx), [measurementPresentation.ts](src/engine/measurementPresentation.ts), [MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx) e [historial](src/screens/HistoryScreen.tsx); [speciesCatalog.test.ts](tests/speciesCatalog.test.ts), [speciesPresentation.test.ts](tests/speciesPresentation.test.ts), [measureSpecies.test.ts](tests/measureSpecies.test.ts) y los nombres exactos de las fuentes en [speciesSourceNames.json](tests/fixtures/speciesSourceNames.json). Los criterios propios de cada especie se describen en ES6.

### ES5. Verificación

- [x] `npm test`, `npm run type-check` y verificador documental.
- [ ] Recorrido en teléfono Android. Hecho en un Moto g56 con Expo Go, sonda simulada y pronóstico real de Open-Meteo: elegir etapa y especie, buscar, letra grande (escala 1,3), resultado y plan de recomendaciones de cerezo, olivo y tomate, y el detalle técnico desplegable. El recorrido corrigió el buscador, que quedaba tapado por el teclado: [EntryUI.tsx](src/components/entry/EntryUI.tsx) reserva el alto del teclado en Android y [SpeciesPicker.tsx](src/components/SpeciesPicker.tsx) deja espacio para ver los resultados. El 22 de octubre de 2026, con la compilación release y la sonda real (al aire, sobre el escritorio), se recorrió el uso sin red: medir y guardar con red, cortar Wi-Fi y datos, medir con el pronóstico guardado, medir sin ubicación, guardar en la cola, abrir el historial sin red y sincronizar al reconectar. Con 21,2 °C y 58 % del equipo, el detalle mostró DPV de 1,06 kPa y rocío de 12,6 °C, que coinciden con el cálculo a mano. El recorrido corrigió cuatro fallas: una lectura subida con red no aparecía en el historial sin red ([measurementsService.ts](src/services/measurementsService.ts) ahora la agrega a la copia local); el pronóstico guardado se rotulaba «HOY · AHORA» sin tener el tiempo actual ([MeasurementForecast.tsx](src/components/MeasurementForecast.tsx)); «Medir» tardaba unos 8 s en abrir sin red ([DashboardScreen.tsx](src/screens/DashboardScreen.tsx) limita a 3 s la comprobación de acceso); y la demora de 10 a 15 s al abrir el historial sin red quedó acotada a 3 s con `AbortSignal` (`runBoundedRemoteHistory` en [measurementHistory.ts](src/utils/measurementHistory.ts) y [measurementsService.ts](src/services/measurementsService.ts), probado en [measurementHistory.test.ts](tests/measurementHistory.test.ts)). Pendiente en teléfono: recorrer saltar, «no se encuentra» e inglés.

<a id="es6-criterios-por-especie-y-etapa--en-curso"></a>
### ES6. Criterios por especie y etapa — completada junto con ES7 y ES8

Se aborda después de ES1–ES5, empezando por las especies de mayor superficie de cada grupo. Cada criterio sigue el [proceso de incorporación](MOTOR_AGRONOMICO.md#catalogo) de la especificación.

**Avance: las 111 especies del catálogo tienen perfil propio (versión de criterios `2.9.0`).** Todas tienen al menos un criterio evaluable en vegetativo, floración y cosecha: hortalizas y frutales por [ES7](#es7-cobertura-total-de-hortalizas-y-frutales--completada), y berries, aromáticas, cultivos, forrajeras y forestales por [ES8](#es8-cobertura-total-del-resto-del-catálogo--completada). 30 de los 380 criterios son por [analogía](MOTOR_AGRONOMICO.md#analogia) y lo declaran. Castaño, jojoba, tuna y haskap se retiraron del catálogo por no tener fuente ni especie similar para alguna etapa. Ninguna especie muestra ya «Todavía no hay criterios propios» en esas tres etapas.

**pH del suelo en hortalizas y cultivos fundacionales**, vegetativo y floración:

| Especies | Fuente | Qué se usa |
| --- | --- | --- |
| Apio, arveja, berenjena, betarraga, brócoli, camote, cebolla, cebollín, coliflor, espárrago, espinaca, lechuga, maíz (fila de choclo), melón, pepino, perejil, pimiento, poroto (fila de poroto verde), puerro, rabanito, repollito de Bruselas, repollo, sandía, zanahoria, zapallo y zapallo italiano | University of Maryland Extension, tabla B-1 de las recomendaciones de hortalizas 2026 ([S22](MOTOR_AGRONOMICO.md#s22)) | Valor objetivo y pH bajo el cual se indica encalar; la tabla no fija máximo |
| Papa | Misma tabla, dos filas por grupo de variedades | Sólo el mínimo común (5,0); entre 5,0 y 5,5 depende de la variedad, que no se conoce |
| Tomate | INIA, manual de tomate al aire libre ([S23](MOTOR_AGRONOMICO.md#s23)) y tabla B-1 | Óptimo 6–6,5 y mínimo 6,0; sin máximo, porque INIA documenta cultivos con pH 8 |
| Frutilla | INIA, Boletín 262 ([S24](MOTOR_AGRONOMICO.md#s24)), coherente con la tabla B-1 | Rango normal 5,8–7,0; límites documentados 5,8 y 7,2 |
| Cerezo | INIA, Boletín 133 ([S25](MOTOR_AGRONOMICO.md#s25)) | Óptimo 6,0–6,5; máximo 7,5; sin mínimo documentado |
| Olivo | INIA, Boletín 101 ([S26](MOTOR_AGRONOMICO.md#s26)) | Crece bien con 5,5–8,5; preferible bajo 7,5 |
| Arándano | University of Maryland Extension ([S18](MOTOR_AGRONOMICO.md#s18)) | Ideal 4,5–5,3; corregir bajo 4,3 o sobre 5,3 |
| Kiwi | Comité del Kiwi de Chile y Univ. Wisconsin | Óptimo 5,5–6,5; límite inferior documentado 5,0 |

**pH del suelo en frutales (Ola 2):**

| Especies | Fuente | Qué se usa |
| --- | --- | --- |
| Manzano | Cornell Cooperative Extension ([S53](MOTOR_AGRONOMICO.md#s53)) | Óptimo 6,0–6,5 en todo el perfil del suelo |
| Peral | Penn State Extension ([S54](MOTOR_AGRONOMICO.md#s54)) | Objetivo documentado 6,5 (rango 6,0–6,5) |
| Caqui | North Carolina State Extension ([S55](MOTOR_AGRONOMICO.md#s55)) | Óptimo 6,0–6,5 |
| Carozos (damasco, ciruelo, guindo) | UNH Extension ([S59](MOTOR_AGRONOMICO.md#s59)) | Óptimo 6,0–7,0 |
| Duraznero | University of Georgia Extension ([S61](MOTOR_AGRONOMICO.md#s61)) | Óptimo 6,0–6,5 |
| Nectarino | University of Illinois Extension ([S79](MOTOR_AGRONOMICO.md#s79)) | Preferido 6,0–6,5 |
| Cítricos (naranjo, limonero, mandarino —incluye clementina—, pomelo, lima, kumquat) | UF/IFAS Extension ([S67](MOTOR_AGRONOMICO.md#s67)) | Rango 6,0–7,0; encalado bajo 6,0 |
| Vid | North Carolina State Extension ([S55](MOTOR_AGRONOMICO.md#s55)) | Óptimo 6,0–7,0 para cultivares de vinífera europea |
| Almendro | UC Cooperative Extension ([S63](MOTOR_AGRONOMICO.md#s63)) | Óptimo 6,0–7,0 |
| Higuera | University of Guam Extension ([S74](MOTOR_AGRONOMICO.md#s74)) | Óptimo 6,0–6,5 |
| Lúcumo | FAO ECOCROP ([S75](MOTOR_AGRONOMICO.md#s75)) | Óptimo 6,5–7,5; límites absolutos 6,0 y 8,5 |
| Maracuyá | UF/IFAS Extension ([S67](MOTOR_AGRONOMICO.md#s67)) | Óptimo 6,0–6,5; límites 5,5 y 7,0 |
| Níspero, feijoa, granado, chirimoyo, guayabo, tumbo | California Rare Fruit Growers ([S57](MOTOR_AGRONOMICO.md#s57)), UF/IFAS ([S67](MOTOR_AGRONOMICO.md#s67)) | Rangos específicos según su ficha técnica individual |

**Criterios climáticos y de cosecha en frutales (Ola 2):**

| Grupo / Especies | Etapas y umbrales | Cosecha | Fuente |
| --- | --- | --- | --- |
| Pomáceas (manzano, peral) | Floración: helada bajo −2,2 °C (28 °F, 10 % daño) y bajo −3,9 °C (25 °F, 90 % daño) | — | Colorado State University ([S52](MOTOR_AGRONOMICO.md#s52)) |
| Níspero | Floración: helada bajo −3,0 °C (27 °F) mata flores y frutos pequeños | — | Clemson University ([S58](MOTOR_AGRONOMICO.md#s58)), CRFG ([S57](MOTOR_AGRONOMICO.md#s57)) |
| Carozos (damasco, duraznero, nectarino, ciruelo, guindo) | Floración: helada desde −2,8 °C (damasco, duraznero, nectarino) o −2,2 °C (ciruelo, guindo) | Lluvia: partidura de piel en fruta madura (duraznero, nectarino, ciruelo); damasco y guindo sin criterio de cosecha | CSU ([S52](MOTOR_AGRONOMICO.md#s52)), MSU ([S60](MOTOR_AGRONOMICO.md#s60)), University of Delaware ([S62](MOTOR_AGRONOMICO.md#s62)), Utah State ([S79](MOTOR_AGRONOMICO.md#s79)) |
| Vid | Vegetativo: helada bajo −1,2 °C (29,8 °F) tras brotación. Floración: calor sobre 35 °C (95 °F) causa corrimiento floral | Lluvia: riesgo de partidura de bayas y botritis | WSU ([S64](MOTOR_AGRONOMICO.md#s64)), UC Davis ([S65](MOTOR_AGRONOMICO.md#s65)), Univ. Wisconsin ([S66](MOTOR_AGRONOMICO.md#s66)) |
| Cítricos (limonero, lima ácida, mandarino, naranjo, clementina, pomelo) | Floración: helada bajo −1,7 °C (limonero, lima). Vegetativo/general: helada bajo −2,2 °C a −4,4 °C | Helada en fruta madura en árbol bajo −2,2 °C | UF/IFAS ([S67](MOTOR_AGRONOMICO.md#s67)), MSU ([S68](MOTOR_AGRONOMICO.md#s68)), UC ANR ([S69](MOTOR_AGRONOMICO.md#s69)) |
| Frutos secos (almendro, nogal, avellano europeo, pecana, pistacho, macadamia) | Floración: helada en flor abierta (−2,2 °C almendro; −1,1 °C nogal y pecana; −8,9 °C flores femeninas avellano). Calor: sobre 35 °C en floración de pistacho; sobre 30 °C en macadamia (caída de frutos) | Lluvia: pecana en suelo mojado expuesta a germinación prematura y hongos | UCCE ([S63](MOTOR_AGRONOMICO.md#s63)), Oregon State ([S70](MOTOR_AGRONOMICO.md#s70)), UGA ([S61](MOTOR_AGRONOMICO.md#s61)), QDPI ([S71](MOTOR_AGRONOMICO.md#s71)), Purdue ([S72](MOTOR_AGRONOMICO.md#s72)) |
| Palto | Helada bajo −1,7 °C (29 °F) en ramas, brotes y floración (Hass) | — | California Avocado Commission ([S78](MOTOR_AGRONOMICO.md#s78)) |
| Subtropicales (higuera, lúcumo, caqui, chirimoyo, mango, dátil, feijoa, granado, guayabo, maracuyá, tumbo, papayo de montaña) | Heladas específicas según susceptibilidad térmica de cada especie (ej. higuera activa a −1,1 °C; papayo/babaco bajo 0 °C; mango bajo −1,1 °C) | Lluvia: higo (partidura/pudrición), caqui (ablandamiento), dátil (deterioro de racimos) | CRFG ([S57](MOTOR_AGRONOMICO.md#s57)), UF/IFAS ([S67](MOTOR_AGRONOMICO.md#s67)), UCLA ([S56](MOTOR_AGRONOMICO.md#s56)), FAO ([S75](MOTOR_AGRONOMICO.md#s75)), Frontiers ([S77](MOTOR_AGRONOMICO.md#s77)) |

**Frutales que eran huérfanos:** membrillo, pera asiática, pluot y tangelo se cubrieron en ES7 por analogía con peral, ciruelo y mandarino, y el membrillo tiene además una fuente propia para cosecha. El castaño se retiró del catálogo; el detalle está en [ES7.B](#es7b-agente-b--frutales).

**Helada en hortalizas.** La clasificación es de INIA ([S36](MOTOR_AGRONOMICO.md#s36), [S37](MOTOR_AGRONOMICO.md#s37)); las temperaturas, de Nebraska ([S27](MOTOR_AGRONOMICO.md#s27)) y South Dakota State ([S28](MOTOR_AGRONOMICO.md#s28)):

| Grupo de INIA | Especies | Vegetativo y floración | Cosecha |
| --- | --- | --- | --- |
| No toleran heladas | Berenjena, camote, maíz, melón, papa, pepino, pimiento, poroto, sandía, tomate, zapallo y zapallo italiano | Advertencia con mínima de 0 °C o menos | Igual: proteger o cosechar antes |
| Toleran heladas débiles | Betarraga, brócoli, espinaca, rabanito, repollito de Bruselas, repollo y zanahoria | Información hasta −2,2 °C (28 °F); advertencia bajo ese valor | Igual, salvo zanahoria (cerca de madurez) |
| Se dañan cerca de la madurez | Apio, arveja, coliflor, lechuga, perejil y zanahoria | Como las de heladas débiles; arveja en floración: aborto floral con cualquier helada | Advertencia con cualquier helada (bajo 0 °C) |
| Toleran heladas | Cebolla, cebollín, puerro y espárrago | Información; advertencia bajo −2,2 °C (cebollas) o −6,7 °C (puerro, [S29](MOTOR_AGRONOMICO.md#s29)) | Igual; espárrago: los turiones son sensibles ([S32](MOTOR_AGRONOMICO.md#s32)) |

Papa agrava bajo −2,5 °C ([S33](MOTOR_AGRONOMICO.md#s33)) y tomate se congela a −2 °C (INIA, [S23](MOTOR_AGRONOMICO.md#s23)). Zanahoria y perejil: los boletines INIA de 2007 y 1998 los clasifican distinto; en cosecha se usa el criterio más cauto y se declara. Apio, contrastado con Colorado State ([S30](MOTOR_AGRONOMICO.md#s30)).

**Otros criterios de clima y lecturas del equipo:**

| Especies | Vegetativo y floración | Cosecha | Fuente |
| --- | --- | --- | --- |
| Tomate | Vegetativo: noches bajo 10 °C. Floración: bajo 10 °C y sobre 35 °C | Lluvia: riesgo de rajadura | INIA ([S23](MOTOR_AGRONOMICO.md#s23)), University of Delaware ([S43](MOTOR_AGRONOMICO.md#s43)) |
| Berenjena | — | Lluvia: riesgo de rajadura | University of Maryland ([S42](MOTOR_AGRONOMICO.md#s42)) |
| Pimiento, zapallo y zapallo italiano | Floración: días sobre 35 °C (95 °F) y noches sobre 23,9 °C (75 °F) | Pimiento: lluvia, riesgo de rajadura. Zapallo: lluvia frecuente, traer la guarda | University of Maryland ([S38](MOTOR_AGRONOMICO.md#s38), [S42](MOTOR_AGRONOMICO.md#s42)), Oregon State ([S51](MOTOR_AGRONOMICO.md#s51)) |
| Melón, pepino | — | Lluvia: riesgo de rajadura | University of Maryland ([S42](MOTOR_AGRONOMICO.md#s42)) |
| Poroto | Floración: días sobre 35 °C y noches sobre 20 °C (68 °F) | Lluvia fría: riesgo de pudrición algodonosa de la vaina | [S38](MOTOR_AGRONOMICO.md#s38), University of Delaware ([S44](MOTOR_AGRONOMICO.md#s44)) |
| Maíz | Floración: sobre 35 °C se desecan las sedas; sobre 37,8 °C (100 °F) puede morir el polen | — | Purdue ([S39](MOTOR_AGRONOMICO.md#s39)) |
| Papa | — | Lluvia: suelo mojado favorece pudriciones | Nebraska ([S45](MOTOR_AGRONOMICO.md#s45)) |
| Camote | — | Lluvia: favorece pudriciones en guarda | Mississippi State ([S46](MOTOR_AGRONOMICO.md#s46)) |
| Cebolla | — | Lluvia: cebolla en pie más expuesta a pudrición bacteriana | Cornell ([S48](MOTOR_AGRONOMICO.md#s48)) |
| Repollo | — | Lluvia fuerte: riesgo de rajadura de la cabeza | University of Illinois ([S49](MOTOR_AGRONOMICO.md#s49)) |
| Lechuga, perejil | — | Lechuga: calor sobre 23,9 °C (75 °F), amargor/espigado. Perejil: calor sostenido sobre 32 °C (90 °F) | Minnesota ([S50](MOTOR_AGRONOMICO.md#s50)), Arkansas ([S47](MOTOR_AGRONOMICO.md#s47)) |
| Cerezo | Vegetativo: sobre 36 °C. Floración: daño desde −1,1 °C, 10 % de flores a −2,4 °C, 90 % a −3,9 °C (peligro), polen sobre 30 °C y lluvia | Lluvia: partidura | INIA ([S25](MOTOR_AGRONOMICO.md#s25)) |
| Olivo | Brotes tiernos desde 0 °C; ramillas a −5 °C (peligro). Vegetativo: sobre 35 °C. Floración: niebla y humedad del aire medida bajo 50 % | Helada bajo 0 °C sobre la aceituna en maduración | INIA ([S26](MOTOR_AGRONOMICO.md#s26), [S36](MOTOR_AGRONOMICO.md#s36)) |
| Frutilla | Vegetativo: suelo medido a 12 °C o menos (información). Floración: flor abierta a −1,1 °C (30 °F) y sobre 32 °C | Lluvia: fruta madura expuesta a pudrición gris | INIA ([S24](MOTOR_AGRONOMICO.md#s24)), Penn State ([S34](MOTOR_AGRONOMICO.md#s34)) |
| Arándano | Floración: −2,2 °C (28 °F), caída de pétalos; calor sobre 35 °C (95 °F), menor viabilidad del polen | Lluvia o lluvia en curso: no cosechar fruta mojada | Penn State ([S34](MOTOR_AGRONOMICO.md#s34)), University of Georgia ([S35](MOTOR_AGRONOMICO.md#s35)), Washington State University ([S41](MOTOR_AGRONOMICO.md#s41)) |

Melón, sandía y pepino no tienen una fuente propia de calor en floración, y no se infiere de los zapallos. Se buscó expresamente el 15 de octubre de 2026: University of Maryland (el mismo boletín de pimiento/zapallo) y la entrada de blog equivalente sólo nombran poroto, tomate, pimiento, zapallo y zapallo italiano, con pepino citado apenas como variedad partenocárpica, sin umbral; North Dakota State University da un umbral vago («temperaturas en los 90 °F») en un artículo centrado en pepino, pero sin cifra exacta; University of Delaware documenta sandía con recuento de granos de polen y «corazón hueco», no con un umbral térmico. Ninguna fuente nombra melón. Sin una cifra exacta atribuida a la especie, como exige el resto de la tabla, el criterio queda sin habilitar para las tres: es una ausencia confirmada, no una búsqueda sin hacer.

**Cosecha, búsqueda dirigida del 15 de octubre de 2026.** De las 29 especies con perfil que sólo tenían helada genérica en cosecha, 13 sumaron un criterio propio (tabla de arriba: tomate, berenjena, pimiento, poroto, melón, pepino, papa, camote, cebolla, repollo, lechuga, perejil, zapallo). Para las otras 16 (apio, arveja, betarraga, brócoli, coliflor, espárrago, espinaca, cebollín, maíz, puerro, rabanito, repollito de Bruselas, sandía, zanahoria, zapallo italiano y olivo) se buscó evidencia institucional específica y no califica: apio (el trastorno documentado, corazón negro, es un desbalance de calcio ligado a todo el ciclo, no un evento puntual de cosecha); zanahoria y rabanito (la rajadura real responde a sequía seguida de riego/lluvia abrupta, un patrón de «cambio de humedad» que el criterio binario de día lluvioso no representa fielmente); betarraga (mismo mecanismo que zanahoria, sin fuente propia todavía); brócoli y coliflor (Cornell documenta un umbral exacto —20 horas de hoja mojada— pero para «brassicas» en general, sin nombrar la especie, y exige una serie horaria de humedad foliar que el motor no tiene); espinaca (las fuentes la tratan junto a lechuga sin umbral propio); espárrago (guías de huerta sobre calor en los turiones se contradicen entre sí, sin respaldo institucional); arveja (sólo pudrición de semilla en germinación, no de vaina en cosecha); cebollín y puerro (nada específico más allá de lo que ya tienen); maíz (el perfil es sólo choclo/maíz dulce; la evidencia real de cosecha con lluvia es de maíz de grano almacenado, que no aplica); sandía (Texas A&M AgriLife documenta una baja de brix con lluvia, pero el propio especialista citado niega el mecanismo físico y otro reporte de la misma institución muestra lluvia fuerte sin baja de brix: evidencia contradictoria dentro de la misma fuente); zapallo italiano (pudrición de flor/fruto pequeño por humedad prolongada, pero es riesgo de floración/desarrollo, no de la cosecha del fruto fresco); olivo (ya investigado, sección anterior). El punto de fondo en zanahoria/rabanito/betarraga/sandía no es falta de evidencia sino que el fenómeno real no encaja en el tipo de criterio binario que existe hoy (`weatherEvent` día lluvioso sí/no); decidir si vale la pena un tipo de criterio nuevo («cambio de humedad» o «duración de humedad foliar») es una decisión de arquitectura, no de investigación, y queda pendiente para quien la revise.

**Referencias que no comparan la lectura.** Tolerancia a sales de FAO 29 ([S06](MOTOR_AGRONOMICO.md#s06)) en vegetativo y floración para 27 especies, con el umbral en extracto saturado cuando la tabla 4 lo da: la conductividad de la sonda no se mide así, así que nunca se clasifica con ese valor (T13). Arveja, cebollín, perejil, puerro y arándano no figuran en las tablas y no tienen referencia. Etapa crítica de riego por el factor ky de FAO 33 ([S40](MOTOR_AGRONOMICO.md#s40)): floración en arveja, maíz, poroto, sandía y tomate; crecimiento vegetativo en papa. Sin textura, la humedad medida no indica si falta agua y no se compara.

**Cómo se evalúan.** Los criterios del pronóstico comparan la mínima o máxima diaria de hoy y los cinco días siguientes; entre los grados de un mismo episodio (helada, calor o noche cálida) sólo se informa el más extremo que se cumple (T44). Si el pronóstico trae la serie horaria, el texto agrega cuántas horas seguidas dura el episodio, sin cambiar su gravedad; un hueco o un cambio de hora corta la racha (T22–T24). Sin pronóstico vigente, o sin el dato que el criterio necesita, el plan dice que no pudo revisar el clima del cultivo; si lo revisó y no hay riesgo, también lo dice. Nunca se dan por favorables. Una cifra en °F se conserva junto a su conversión, y una prueba exige que cada umbral figure en el valor original citado. Cuando la fuente no da temperatura («sensible a helada») se usa 0 °C como definición de helada; cuando no da cantidad de lluvia, la regla de día lluvioso de la app; ambos casos se declaran. Las alertas de especie llevan `origin: 'species'` para mostrarse aunque su parámetro no gobierne la etapa.

**Cómo se presentan.** Cada recomendación tiene un título y un texto en lenguaje simple: qué pasa, qué significa para el cultivo y qué conviene hacer (campo `advice` de cada criterio). Las cifras de la fuente, sus limitaciones y la cita van al campo `detail`, que el plan muestra en «Detalle técnico y fuente», cerrado por defecto. Una prueba impide que el texto simple cite fuentes, °F o términos como «extracto» o «ky». La instantánea guarda `rulesVersion` junto a la versión del catálogo (T39).

Cada criterio de pH separa el óptimo (sólo orienta) de los límites donde la fuente documenta un problema o una corrección: únicamente cruzar un límite es advertencia, y un límite no documentado queda vacío. Los criterios de especie usan la misma regla de calidad y vigencia que el análisis general, no cambian el estado de la evaluación cuando sólo informan, y en el plan aparecen como seguimiento. No se habilitó pH en cosecha porque no gobierna esa etapa. Frambueso (Boletín INIA 372) y palto (manual INIA 1998) se revisaron y no documentan un rango de pH: siguen sin criterio. La fila de frutos del cuadro 2 del Boletín INIA 101 («menos de 5») es ambigua y no se usa; la helada sobre la aceituna proviene del Boletín INIA 165.

- [x] Familias de criterios por etapa. Habilitados: pH; helada por especie en las tres fases; frío y calor en floración y vegetativo cuando hay fuente; noches cálidas; lluvia y niebla; temperatura de suelo (frutilla) y humedad del aire (olivo); tolerancia a sales y etapa crítica de riego como referencias. Tras completar [ES7](#es7-cobertura-total-de-hortalizas-y-frutales--completada) y [ES8](#es8-cobertura-total-del-resto-del-catálogo--completada), las 111 especies del catálogo cuentan con criterios evaluables en vegetativo, floración y cosecha (380 criterios en total). Buscado y confirmado sin fuente comparable: calor en floración de melón, sandía y pepino; bolting/floración temprana por calor en cebollín, perejil y puerro (sólo blogs comerciales sin verificar, ninguna fuente institucional con umbral exacto); calor documentado para los turiones de espárrago en plena cosecha (sólo guías de huerta sin respaldo institucional, con umbrales que se contradicen entre 50 °F y 70–80 °F) y pudrición de vaina por lluvia en arveja (sólo pudrición de semilla en germinación y una nota de prensa agrícola del Reino Unido, ninguna institucional sobre vaina en cosecha). Pendiente fuera de ES6: comparar la salinidad cuando exista un método compatible para la conductividad de la sonda; decidir si conviene un tipo de criterio nuevo para el patrón «cambio de humedad» (zanahoria, rabanito, betarraga, sandía), que el `weatherEvent` binario actual no representa fielmente.
- [x] Fuentes por prioridad: institucionales chilenas (INIA, ODEPA, universidades), extensión agrícola con tablas citables (UC ANR y equivalentes), FAO y ECOCROP sólo como índice para localizar evidencia.
- [x] Registro por criterio: valor original, unidad, conversión de °F, etapa, contexto, fuente con sección o tabla y fecha de consulta. La forma de establecimiento se registra por perfil: las tablas de hortalizas no distinguen semilla, almácigo ni trasplante (`not_specified`), y las de frutales y berries describen plantaciones establecidas (`established_plantation`).
- [x] Estados por criterio (candidato, documentado, habilitado) y exposición en el catálogo de qué etapas tienen criterios.
- [x] Conectar `species-rules` al motor sin alterar las alertas generales; pasar T15–T19, T42, T45 y T46. Conectado y probado para pH, lecturas del equipo, referencias, pronóstico y perfiles de pre-siembra ([prePlanting.ts](src/engine/prePlanting.ts)): T05, T13, T15–T19, T22–T24, T39, T42, T44, T45 y T46 pasan en la suite automatizada.

### ES7. Cobertura total de hortalizas y frutales — completada

**Meta:** las 78 especies de los grupos hortalizas (34) y frutales (44) tienen al menos un **criterio evaluable** habilitado en vegetativo, floración y cosecha. Cuentan como evaluables pH, temperatura del aire, lectura del equipo y episodio del pronóstico. La tolerancia a sales y la etapa crítica de riego son referencias que no comparan la lectura, así que **no cuentan**. Pre-siembra queda fuera, porque ahí el motor sugiere qué sembrar en vez de evaluar una especie elegida. También quedan fuera berries, cultivos, forrajeras, aromáticas y forestales. La regla de evidencia es la de la especificación: una fuente propia y, en su defecto, el [criterio por analogía](MOTOR_AGRONOMICO.md#analogia), siempre declarado. **Una especie que no logra ni fuente propia ni especie similar para las tres etapas se retira del catálogo: no queda pendiente ni a medias.**

**Brecha inicial (18 de octubre de 2026):** 63 combinaciones de especie y etapa. **Resultado:** las 63 quedaron cubiertas o su especie se retiró; ninguna queda pendiente.

| Responsable | Especies | Etapas que faltan | Combinaciones |
| --- | --- | --- | ---: |
| Agente A | Acelga, ají, ajo, alcachofa, caigua, haba, locoto y pepino dulce (sin perfil) | Las tres | 24 |
| Agente B | Castaño, membrillo, pera asiática, pluot y tangelo (sin perfil) | Las tres | 15 |
| Agente B | Almendro, chirimoyo, damasco, guayabo, guindo, jojoba, lúcumo, macadamia, mango, manzano, maracuyá, peral, tumbo y tuna | Cosecha | 14 |
| Agente B | Avellano, níspero, nogal y pistacho | Vegetativo y cosecha | 8 |
| Agente B | Datilera | Floración y cosecha | 2 |

#### ES7.0. Preparación — hecha por el coordinador

Permite que los dos agentes trabajen en paralelo sin tocar el mismo archivo. Se verificó sin cambio de comportamiento: `npm test` (370 pruebas más las nuevas de cobertura), `npm run type-check` y el verificador documental.

- [x] `src/engine/speciesRules.ts` separado en [speciesRuleKit.ts](src/engine/speciesRuleKit.ts) (tipos, constructores y fuentes existentes, todos exportados), [speciesProfilesHortalizas.ts](src/engine/speciesProfilesHortalizas.ts) (`HORTALIZA_PROFILES`, del **agente A**), [speciesProfilesFrutales.ts](src/engine/speciesProfilesFrutales.ts) (`FRUTAL_PROFILES`, perennes: frutales y berries, del **agente B**) y [speciesRules.ts](src/engine/speciesRules.ts), que conserva la versión, une las listas en `SPECIES_RULES`, evalúa y reexporta los tipos.
- [x] Analogía en el contrato: `scope?: 'species' | 'analog'` y `analogOf?: string` en cada criterio, y el constructor `analog('sp.origen', criterio)` en el kit. La analogía se declara en las limitaciones, que el detalle técnico ya muestra.
- [x] [speciesCoverage.test.ts](tests/speciesCoverage.test.ts), incluida en `npm test`. Compara la brecha real con `PENDIENTES_HORTALIZAS` ([es7Hortalizas.ts](tests/es7Hortalizas.ts), del agente A) y `PENDIENTES_FRUTALES` ([es7Frutales.ts](tests/es7Frutales.ts), del agente B), que cada agente vacía; también falla si una combinación ya cubierta sigue en la lista. Las especies que se retiran van a `A_ELIMINAR_HORTALIZAS` o `A_ELIMINAR_FRUTALES`, sin perfil y sin pendientes. Valida cada analogía: el origen existe, tiene ese criterio con fuente propia en alguna de las mismas etapas (sin encadenar), la evidencia es la del origen y las limitaciones empiezan con «Sin fuente propia para » y nombran al origen en ambos idiomas.
- [x] `speciesWeather.test.ts` ya no fija el total de perfiles (exige 69 o más).
- [x] Rangos de fuentes reservados al final de la [sección 16](MOTOR_AGRONOMICO.md#16-fuentes-consultadas): S80–S119 (A) y S120–S179 (B), bajo sus comentarios `<!-- ES7.A … -->` y `<!-- ES7.B … -->`.

#### ES7.1. Instrucciones comunes a los dos agentes

**Leer antes de editar:** `CLAUDE.md` de la raíz; en la especificación, §7.1 (incluido el criterio por analogía) y §7.5; ES6 y ES7 de este archivo; `speciesRuleKit.ts`; y como modelos, los perfiles `sp.nectarino` y `sp.duraznero` (perenne) y `sp.pimiento` y `sp.tomate` (anual).

**Por cada combinación de especie y etapa, en este orden:**

1. **Fuente propia.** Buscar una fuente que nombre la especie: primero institucional chilena (INIA, ODEPA, universidades), después extensión agrícola con tabla citable (UC ANR, UF/IFAS, WSU, MSU, Cornell, Penn State, Utah State, University of Maryland). FAO/ECOCROP sirve sólo como índice para localizar la evidencia. **Abrir siempre la página con WebFetch** y copiar la cita textual: nunca citar desde el resumen de un buscador.
2. **Analogía**, si no hay fuente propia. La especie de origen debe ser la misma especie botánica o del mismo género y, en su defecto, de la misma familia, con el mismo órgano cosechado. Además, debe tener **ese mismo criterio con fuente propia** en `SPECIES_RULES`. Se construye con `analog('sp.origen', criterio)`, reutilizando la evidencia y la cifra del origen y con textos redactados para la especie destino. Las limitaciones empiezan con «Sin fuente propia para {especie}: se usa el criterio documentado para {origen}, {motivo de la semejanza}.».
3. **Ni fuente ni analogía válida en alguna etapa:** la especie **se retira completa**. El agente borra su perfil de su archivo, quita sus combinaciones de la lista de pendientes, agrega el ID a su lista `A_ELIMINAR_*` y anota en su subsección qué se buscó y por qué no califica. El coordinador la saca del catálogo al integrar. **Nunca se inventa una cifra** y no queda ninguna especie a medias.

**Qué criterio usar en cada etapa:**

| Etapa | Primera opción | Alternativas |
| --- | --- | --- |
| Vegetativo | pH (`stages: GROWING`, cubre también floración) | Helada en brotes o follaje; calor documentado |
| Floración | pH (si ya cubre `GROWING`) | Helada en flor abierta (tablas de temperaturas críticas de WSU, MSU, CSU o Utah State); calor en polinización; lluvia en polinización |
| Cosecha | Helada sobre el órgano cosechado: «highest freezing point» de la tabla 1 del [USDA Agriculture Handbook 66](https://www.ars.usda.gov/arsuserfiles/oc/np/commercialstorage/commercialstorage.pdf), en °F y por especie (lo reproduce el [boletín 4135 de University of Maine](https://extension.umaine.edu/publications/4135e/)) | Lluvia en cosecha (rajadura, pudrición, hongos); calor en cosecha |

**Reglas de contenido** (las pruebas `speciesRules`, `speciesWeather` y `speciesCoverage` fallan si no se cumplen):

- Toda cifra del umbral o del pH figura **textual** en `originalValue`. En °F se usa `fromF(n)`, que convierte y conserva el valor original. El aire va de −15 a 45 °C y el pH de 3 a 10.
- `consultedAt` es la fecha real de consulta; la `url` empieza con `https://`; `section` indica la tabla, página o apartado.
- `advice` y `adviceEn` están en lenguaje simple: sin fuentes, sin °F y sin «documenta», «extracto», «ky», «University», «INIA», «FAO» ni «Extension». Los textos `*En` no llevan tildes, eñes ni palabras en español.
- `note` lleva las cifras de la fuente con su conversión; `limitations` nunca va vacío.
- La gravedad es `danger` sólo si la fuente documenta muerte o daño grave; en los demás casos, `warning`, o `info` si el criterio sólo orienta.
- No se habilita pH en cosecha ni se usan referencias de salinidad o agua para cubrir una etapa.
- Hortalizas anuales con `annual`; perennes (alcachofa y todos los frutales) con `perennial`.
- Español de Chile: se dice «campo», no «predio».

**Límites de cada agente:**

- Edita **sólo** su archivo de perfiles, sus dos listas (`PENDIENTES_*` y `A_ELIMINAR_*`) en `tests/es7Hortalizas.ts` (A) o `tests/es7Frutales.ts` (B), su rango de fuentes en la especificación y su subsección (ES7.A o ES7.B).
- No toca `speciesRuleKit.ts`, `speciesRules.ts`, `speciesCatalog.ts`, `SPECIES_RULES_VERSION` ni el archivo del otro agente. Si necesita un constructor o una fuente compartida nueva, la define en su propio archivo.
- No hace commits ni ejecuta comandos git que modifiquen el repositorio. Si falla una prueba por un archivo del otro agente, no la corrige: la informa.
- Al terminar cada especie ejecuta, desde `App/`: `npx tsx --test tests/speciesRules.test.ts tests/speciesWeather.test.ts tests/speciesCriteriaFamilies.test.ts tests/speciesPresentation.test.ts tests/speciesCoverage.test.ts` y `npm run type-check`.
- **Informe final:** combinaciones cerradas con fuente propia, cerradas por analogía (indicando el origen) y especies propuestas para retirar, con el motivo. Su lista `PENDIENTES_*` debe terminar vacía.

#### ES7.A. Agente A — hortalizas

Archivo `src/engine/speciesProfilesHortalizas.ts`, fuentes S80–S119. Las analogías de la tabla son candidatas: valen sólo si falta la fuente propia y se cumplen las condiciones de ES7.1.

| Especie | Primero buscar | Analogía candidata |
| --- | --- | --- |
| Acelga (*Beta vulgaris*, grupo Cicla) | pH en la tabla B-1 de University of Maryland («Swiss chard»); helada en Nebraska o SDSU | Betarraga (misma especie botánica) |
| Ají (*Capsicum* spp.) | Fichas de ají de INIA; tabla B-1 («Peppers») | Pimiento (mismo género) |
| Locoto (*Capsicum pubescens*) | Literatura andina sobre su tolerancia al frío | Pimiento (mismo género). Declarar que el locoto tolera más frío que *C. annuum* |
| Ajo (*Allium sativum*) | Tabla B-1 («Garlic»); Wisconsin A3785, sección de ajo | Cebolla (mismo género) |
| Alcachofa (*Cynara cardunculus* var. *scolymus*) | Guía de alcachofa de UC ANR; INIA | Ninguna cercana en el catálogo: requiere fuente propia |
| Caigua (*Cyclanthera pedata*) | Literatura andina | Pepino (misma familia, fruto inmaduro) |
| Haba (*Vicia faba*) | INIA; tabla B-1 si la incluye | Arveja (misma familia, leguminosa de estación fría) |
| Pepino dulce (*Solanum muricatum*) | INIA, literatura andina | Tomate (mismo género, fruto) |
| Especie | Vegetativo | Floración | Cosecha | Fuente o analogía |
| --- | --- | --- | --- | --- |
| Acelga | Helada (28 °F, tolerante) y pH | Helada (28 °F, tolerante) y pH | Helada (criterio más cauto, 2007 vs. 1998) | Helada: INIA ([S36](MOTOR_AGRONOMICO.md#s36)), Nebraska y SDSU ([S80](MOTOR_AGRONOMICO.md#s80)), propia (nombra «acelga»/«chard»). pH: analogía de betarraga (misma especie botánica) |
| Ají | Helada (32 °F, no tolera) y pH | Helada (32 °F, no tolera) y pH | Helada (32 °F, no tolera) | Helada: INIA 411 ([S81](MOTOR_AGRONOMICO.md#s81)), Nebraska y SDSU ([S27](MOTOR_AGRONOMICO.md#s27), [S28](MOTOR_AGRONOMICO.md#s28)), propia (nombra «ají» junto al pimiento). pH: analogía de pimiento (mismo género) |
| Locoto | Helada (hasta −5 °C) y pH | Helada (hasta −5 °C) y pH | Helada (hasta −5 °C) | Helada: PFAF ([S82](MOTOR_AGRONOMICO.md#s82)), propia (nombra la especie). pH: analogía de pimiento (mismo género; el locoto tolera más frío) |
| Ajo | Helada (28 °F, tolera) y pH | Helada (28 °F, tolera) y pH | Helada (28 °F, tolera) | Helada: INIA y SDSU ([S83](MOTOR_AGRONOMICO.md#s83)), propia (nombra «ajo»/«Garlic»). pH: analogía de cebolla (mismo género; la tabla B-1 no tiene fila de ajo) |
| Alcachofa | pH y helada (bajo −2 °C) | pH, helada (bajo −2 °C) y calor (sobre 24 °C) | Helada (bajo −2 °C) | INIA Ururi, Informativo N° 56 ([S84](MOTOR_AGRONOMICO.md#s84)), propia y completa: única especie que requería fuente propia sin analogía posible |
| Caigua | Helada (sin tolerancia) y pH | Helada (sin tolerancia) y pH | Helada (sin tolerancia) | Helada: PFAF ([S85](MOTOR_AGRONOMICO.md#s85)), propia (nombra la especie; sin cifra, se usa 0 °C como definición de helada). pH: analogía de pepino (misma familia, mismo fruto inmaduro) |
| Haba | Helada (28 °F, tolera) | Helada (aborto floral bajo 0 °C) | Helada (se daña cerca de la madurez, bajo 0 °C) | Floración y cosecha: INIA ([S86](MOTOR_AGRONOMICO.md#s86)), propia (nombra «habas»). Vegetativo: analogía de arveja (misma familia, leguminosa de estación fría) |
| Pepino dulce | Helada (a 0 °C o menos, no tolera) y pH | Helada (a 0 °C o menos, no tolera) y pH | Helada (a 0 °C o menos, no tolera) | Helada: INIA ([S87](MOTOR_AGRONOMICO.md#s87)), propia (nombra «pepino dulce» y lo distingue del tomate). pH: analogía de tomate (mismo género) |

**Notas de la investigación.** La tabla B-1 de University of Maryland (2026) **no tiene fila** de «Swiss chard», «Garlic», «Artichoke» ni «Fava beans»/«Broad beans» (se verificó el documento completo): esas cuatro hortalizas no tienen pH con fuente propia por esa vía, a diferencia de lo que sugería la búsqueda inicial. El ají sí aparece nombrado junto al pimiento en el Boletín INIA 411 («Pimiento y Ají»), pero sólo para la susceptibilidad a la helada en general, sin una cifra en °C ni una fila de pH propia, así que su pH usa la analogía de pimiento. El USDA Agriculture Handbook 66 (reproducido por el boletín 4135 de University of Maine) no tiene fila de «Artichokes, globe» (sólo de «Artichokes, Jerusalem», especie no emparentada), así que no sirvió para la cosecha de alcachofa; en su lugar, el Informativo INIA-Ururi N° 56 da cifras propias de helada (−2 a −4 °C) que cubren las tres etapas. Para caigua y locoto no se localizó una fuente institucional (chilena ni de extensión agrícola) con cifra propia: se usó Plants For A Future (PFAF), una base de datos de plantas útiles ya aceptada como fuente en este catálogo para especies similares (igual que CRFG en frutales), declarando sus límites.

#### ES7.B. Agente B — frutales

Archivo `src/engine/speciesProfilesFrutales.ts`, fuentes S120–S179. Para cosecha conviene revisar primero el «highest freezing point» del USDA Handbook 66, que cubre casi todos los frutales con una cifra propia de cada especie. En los frutos secos, si no figuran en la tabla, se busca el riesgo de lluvia en cosecha (hongos, aflatoxina, germinación).

| Especie | Falta | Primero buscar | Analogía candidata |
| --- | --- | --- | --- |
| Castaño (*Castanea sativa*) | Las tres | pH y helada en brotes en guías de castaño (University of Missouri Center for Agroforestry, Oregon State) | Ninguna en el catálogo: requiere fuente propia |
| Membrillo (*Cydonia oblonga*) | Las tres | Tablas de temperaturas críticas de membrillo; Handbook 66 («Quinces») | Peral o manzano (misma subtribu) |
| Pera asiática (*Pyrus pyrifolia*) | Las tres | Handbook 66 («Asian pears»); UC ANR y Oregon State | Peral (mismo género) |
| Pluot (*P. salicina* × *P. armeniaca*) | Las tres | Fichas de UC ANR | Ciruelo (progenitor dominante) |
| Tangelo (*Citrus × tangelo*) | Las tres | Tablas de resistencia al frío de UF/IFAS, que suelen incluir tangelo | Mandarino (progenitor) |
| Almendro, chirimoyo, damasco, guayabo, guindo, jojoba, lúcumo, macadamia, mango, manzano, maracuyá, peral, tumbo y tuna | Cosecha | Handbook 66 y lluvia en cosecha documentada | Especie del mismo género con criterio de cosecha propio |
| Avellano, nogal y pistacho | Vegetativo y cosecha | pH en la guía de cada especie (OSU EM 9072 para avellano; UC ANR para nogal y pistacho); helada en brotes | — |
| Níspero | Vegetativo y cosecha | pH en CRFG o UF/IFAS; Handbook 66 («Loquats») | — |
| Datilera | Floración y cosecha | FAO, Zaid y de Wet ([S75](MOTOR_AGRONOMICO.md#s75)): calor o lluvia en polinización y lluvia sobre racimos maduros | — |
| Especie | Vegetativo | Floración | Cosecha | Fuente o analogía |
| --- | --- | --- | --- | --- |
| Almendro | ya tenía | ya tenía | pH y helada ya tenían fuente; cosecha nueva | Cosecha: USDA Handbook 66, capítulo Almond ([S121](MOTOR_AGRONOMICO.md#s121)), lluvia tardía retrasa la cosecha |
| Avellano europeo | pH nueva | ya tenía | nueva | Vegetativo (pH): OSU EM 9080 ([S123](MOTOR_AGRONOMICO.md#s123)); cosecha: OSU FS 146 ([S122](MOTOR_AGRONOMICO.md#s122)), lluvia de otoño sobre la avellana caída |
| Castaño | — | — | — | **Retirada** del catálogo: ver nota más abajo |
| Chirimoyo | ya tenía | ya tenía | nueva | Cosecha: mismo criterio de daño severo del árbol adulto a 25 °F, ya citado en el perfil (CRFG, evidencia existente), aplicado a la fruta en pie |
| Damasco | ya tenía | ya tenía | nueva | Cosecha: USDA Handbook 66 vía University of Maine ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Datilera | ya tenía | nueva | nueva | Floración y cosecha: FAO, Zaid y de Wet, sección «Rain effect» ([S132](MOTOR_AGRONOMICO.md#s132)) |
| Guayabo | ya tenía | ya tenía | nueva | Cosecha: UF/IFAS, Florida Plant Disease Management Guide: Guava ([S124](MOTOR_AGRONOMICO.md#s124)) |
| Guindo | ya tenía | ya tenía | nueva | Cosecha: USDA Handbook 66 vía University of Maine ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Jojoba | — | — | — | **Retirada** del catálogo: ver nota más abajo |
| Lúcumo | ya tenía | ya tenía | nueva | Cosecha: FAO ECOCROP, campo «Temperat. requir.» ([S131](MOTOR_AGRONOMICO.md#s131)), referencia general sin distinguir etapa |
| Macadamia | ya tenía | ya tenía | nueva | Cosecha: CTAHR, Macadamia: Hawaii's Dessert Nut ([S125](MOTOR_AGRONOMICO.md#s125)) |
| Mango | ya tenía | ya tenía | nueva | Cosecha: UF/IFAS, Some Common Diseases of Mango in Florida ([S126](MOTOR_AGRONOMICO.md#s126)), con aviso sólo informativo por el desajuste de tiempo entre la lluvia y la mancha |
| Manzano | ya tenía | ya tenía | nueva | Cosecha: USDA Handbook 66 vía University of Maine ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Maracuyá | ya tenía | ya tenía | nueva | Cosecha: mismo criterio de enfriamiento de la planta (UF/IFAS, evidencia existente), aplicado a la fruta en maduración |
| Membrillo | analogía | analogía | nueva (propia) | Vegetativo y floración por [analogía](MOTOR_AGRONOMICO.md#analogia) con Peral (misma subtribu Pyrinae; el membrillo se usa como portainjerto de peral); cosecha propia: USDA Handbook 66 vía University of Maine ([S120](MOTOR_AGRONOMICO.md#s120)), nombra «Quinces» |
| Níspero | nueva | ya tenía | nueva | Vegetativo y cosecha: mismo criterio CRFG ya citado en el perfil (umbrales de yema floral a 19 °F y de semilla/caída del fruto a 25 °F) |
| Nogal | pH nueva | ya tenía | nueva | Vegetativo (pH) y cosecha: UC Cooperative Extension, Walnut Nutrition ([S127](MOTOR_AGRONOMICO.md#s127)) y UC IPM, Walnut - Molds ([S130](MOTOR_AGRONOMICO.md#s130)) |
| Pera asiática | analogía | analogía | analogía | Las tres por [analogía](MOTOR_AGRONOMICO.md#analogia) con Peral (mismo género *Pyrus*) |
| Peral | ya tenía | ya tenía | nueva | Cosecha: USDA Handbook 66 vía University of Maine ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Pistacho | pH nueva | ya tenía | nueva | Vegetativo (pH): UC Cooperative Extension, Pistachio Micronutrient Management ([S128](MOTOR_AGRONOMICO.md#s128)); cosecha: FAO, Prevention of aflatoxin in pistachios ([S129](MOTOR_AGRONOMICO.md#s129)) |
| Pluot | analogía | analogía | analogía | Las tres por [analogía](MOTOR_AGRONOMICO.md#analogia) con Ciruelo (progenitor dominante del híbrido) |
| Tangelo | analogía | analogía | analogía | Las tres en un solo criterio, por [analogía](MOTOR_AGRONOMICO.md#analogia) con Mandarino (mismo género *Citrus*, progenitor del híbrido) |
| Tumbo | ya tenía | ya tenía | nueva | Cosecha: mismo criterio de rusticidad al frío (CRFG, evidencia existente), aplicado a la fruta en maduración |
| Tuna | ya tenía | ya tenía | — | **Retirada** del catálogo: ver nota más abajo |

**Especies retiradas (sin fuente propia ni analogía válida en alguna etapa):**

- **Castaño.** Vegetativo (pH 5,5–6,5) y la sensibilidad a la helada en brotación se encontraron en fuentes propias (Virginia Cooperative Extension, ANR-279P; Michigan State University Extension, sobre heladas de abril de 2012 en castaño). Para cosecha se buscó en USDA Handbook 66 (no incluye castaña en su tabla de punto de congelación ni en su capítulo de frutos secos), Oregon State University (FS 146, sólo describe recolección sin mencionar lluvia para castaña), The American Chestnut Foundation (hoja de cosecha, sin mención de lluvia) y estudios sobre pudrición parda del castaño (*Gnomoniopsis*) ligada a lluvia de primavera-verano, pero sin una fuente institucional que documente el efecto sobre la castaña cerca de cosecha con la claridad exigida. Sin especie similar en el catálogo (es el único *Castanea*). Se retira completa.
- **Jojoba.** El perfil de pH (candidato previo, con fuente propia de University of Arizona) ya cubría vegetativo y floración. Para cosecha se buscó en University of Arizona (repositorio institucional, inaccesible: error 403), UF/IFAS (HS616, sin mención de lluvia o cosecha), y fuentes sobre Argentina (cápsula dehiscente, lluvia como requisito de floración, no de cosecha). Ninguna fuente institucional documenta un efecto de lluvia o helada sobre la cápsula cerca de cosecha. Sin especie similar en el catálogo (es el único *Simmondsia*). Se retira completa.
- **Tuna.** El perfil de pH (candidato previo, ICAR) ya cubría vegetativo y floración. Para cosecha se buscó en UF/IFAS (sin ficha de cactus pear accesible), University of Nevada Reno Extension y New Mexico State University Extension (guías de cosecha sin mención de lluvia o helada sobre el fruto), FIA Chile («La tuna: manejo del cultivo y usos», menciona pudrición húmeda por *Phytophthora* ante heridas y alta humedad, pero aclara que el daño no es mayor) y un estudio revisado por pares sobre helada en *Opuntia* (Sudáfrica) que sólo documenta daño en cladodios, no en el fruto. Sin especie similar en el catálogo (es el único *Opuntia*). Se retira completa.

**Nota sobre el aviso sólo informativo en mango:** la fuente liga la lluvia principalmente a la ventana de floración a fruto de medio tamaño, no a la lluvia del día de cosecha; se mantiene `severity: 'info'` y la limitación lo declara, para no sobre-advertir con una causalidad desplazada en el tiempo.

#### ES7.2. Integración — hecha por el coordinador

- [x] Muestra revisada contra las fuentes abiertas: locoto (Plants For A Future), alcachofa (INIA Ururi, PDF escaneado, contenido confirmado por el índice del buscador) y el capítulo de tuna del USDA Handbook 66 de 2016, que sólo documenta daño por frío en almacenamiento durante semanas y no sirve como criterio de pronóstico, lo que confirma su retiro.
- [x] Criterios de cosecha con un umbral bajo que se cumpliría casi todas las noches de invierno (lúcumo bajo 11 °C y maracuyá bajo 15 °C) quedan como `info`. El de mango (lluvia) también es `info`, porque la fuente lo liga a la ventana de floración a fruto medio.
- [x] `PENDIENTES_HORTALIZAS` y `PENDIENTES_FRUTALES` vacías.
- [x] Castaño, jojoba y tuna retirados de `SPECIES`; sus nombres de fuente pasan a `EXCLUDED_SOURCE_NAMES` con el motivo de ES7. El historial no se afecta, porque lee la especie de la instantánea guardada (`savedSpecies` en `measurementPresentation.ts`), no del catálogo.
- [x] `SPECIES_RULES_VERSION` en `2.8.0` y `SPECIES_CATALOG_VERSION` en `2.1.0`. Las pruebas que describían el estado anterior a ES7 (manzano sin cosecha, membrillo sin criterios, castaño como especie sin criterios) se actualizaron.
- [x] `npm test` (375 pruebas), `npm run type-check` y `python docs/verificar_documentacion.py`, sin errores.
- [ ] Recorrido en teléfono: elegir una especie por analogía (por ejemplo, pluot) y comprobar que el detalle técnico lo declara.

### ES8. Cobertura total del resto del catálogo — completada

**Meta:** como en ES7, pero para berries, aromáticas, cultivos, forrajeras y forestales. Cada una de las 33 especies sin perfil queda con al menos un criterio evaluable en vegetativo, floración y cosecha, con fuente propia o por [analogía declarada](MOTOR_AGRONOMICO.md#analogia). Si no se logra, la especie se retira del catálogo. Al cerrar ES8, ninguna especie del catálogo muestra «Todavía no hay criterios propios». Pre-siembra sigue fuera.

**Brecha inicial (19 de octubre de 2026):** 99 combinaciones de especie y etapa, todas de especies sin perfil. **Resultado:** las 99 quedaron cubiertas o su especie se retiró (sólo el haskap); ninguna queda pendiente. Los dos lotes se ejecutaron en una sola sesión, con las mismas reglas y límites de ES7.1.

| Agente | Grupos | Especies | Combinaciones |
| --- | --- | --- | ---: |
| C | Berries y aromáticas | Arándano rojo, calafate, frambuesa, grosella, haskap, maqui, michay, mora, rosa mosqueta, murtilla, saúco, zarzaparrilla roja, zarzaparrilla negra; albahaca, ciboulette, cilantro, orégano | 51 |
| D | Cultivos, forrajeras y forestales | Achicoria, arroz, avena, cebada, lupino, raps, remolacha azucarera, soya, trigo, triticale; alfalfa, ballica, col forrajera, trébol rosado; eucalipto, pino radiata | 48 |

#### ES8.0. Preparación — hecha por el coordinador

- [x] Archivos de perfiles nuevos, ya conectados a `SPECIES_RULES`: [speciesProfilesBerriesAromaticas.ts](src/engine/speciesProfilesBerriesAromaticas.ts) (`BERRY_AROMATIC_PROFILES`, del **agente C**) y [speciesProfilesCultivos.ts](src/engine/speciesProfilesCultivos.ts) (`FIELD_CROP_PROFILES`, del **agente D**). Arándano y frutilla siguen en el archivo de frutales, y maíz y perejil en el de hortalizas: no se tocan.
- [x] Listas de avance: [es8BerriesAromaticas.ts](tests/es8BerriesAromaticas.ts) (C) y [es8Cultivos.ts](tests/es8Cultivos.ts) (D), con `PENDIENTES_*` y `A_ELIMINAR_*`. [speciesCoverage.test.ts](tests/speciesCoverage.test.ts) recorre ahora cuatro lotes que, juntos, deben cubrir todos los grupos del catálogo.
- [x] Fuentes reservadas al final de la [sección 16](MOTOR_AGRONOMICO.md#16-fuentes-consultadas): S180–S239 (C) y S240–S299 (D), bajo sus comentarios `<!-- ES8.C … -->` y `<!-- ES8.D … -->`.
- [x] Meta extendida a todo el catálogo en la especificación (§7.1, §7.3 y §15.1).

#### ES8.1. Instrucciones

Valen **todas** las instrucciones comunes de [ES7.1](#es71-instrucciones-comunes-a-los-dos-agentes): orden fuente propia → analogía → retiro, criterios por etapa, reglas de contenido y límites. Cambian sólo los archivos y los rangos:

| Agente | Archivo de perfiles | Lista de avance | Fuentes | Subsección |
| --- | --- | --- | --- | --- |
| C | `src/engine/speciesProfilesBerriesAromaticas.ts` | `tests/es8BerriesAromaticas.ts` | S180–S239 | ES8.C |
| D | `src/engine/speciesProfilesCultivos.ts` | `tests/es8Cultivos.ts` | S240–S299 | ES8.D |

Precisiones para estos grupos:

- **Horizonte:** `annual` para albahaca, cilantro y los cultivos anuales; `perennial` para berries, ciboulette, orégano, alfalfa, trébol rosado y forestales. En ballica, según la fuente usada, declarando qué especie de *Lolium* cubre.
- **Cosecha en forrajeras:** es el corte. Sirven la lluvia sobre el forraje cortado (henificación) y la helada, si la fuente los documenta.
- **Forestales:** «floración» y «cosecha» no tienen el sentido de un cultivo. Un daño por helada o calor documentado para el árbol puede cubrir las tres etapas (`ALL_STAGES`, precedente: palto), declarándolo en las limitaciones. Para el pino radiata, la floración corresponde a los estróbilos.
- **Analogías entre archivos:** el origen puede estar en cualquier archivo de perfiles (por ejemplo, repollo en hortalizas o arándano en frutales), siempre con el criterio con fuente propia.

#### ES8.C. Agente C — berries y aromáticas

| Especie | Primero buscar | Analogía candidata |
| --- | --- | --- |
| Frambuesa (*Rubus idaeus*) | INIA (Boletín 372 y manuales de frambuesa), Penn State y Cornell (heladas en flor y botritis por lluvia en cosecha), USDA Handbook 66 | — |
| Mora (*Rubus* spp.) | Extensión de zarzamora (University of Arkansas, NC State), Handbook 66 («Blackberries») | Frambuesa (mismo género) |
| Arándano rojo (*Vaccinium macrocarpon*) | University of Massachusetts y Wisconsin (temperaturas críticas de helada por estado), Handbook 66 («Cranberries») | Arándano (mismo género) |
| Grosella, zarzaparrilla roja y negra (*Ribes*) | Extensión de *Ribes* (Cornell, University of Minnesota, Oregon State), Handbook 66 («Currants», «Gooseberries») | Entre ellas, por género *Ribes*, si una tiene fuente propia |
| Haskap (*Lonicera caerulea*) | University of Saskatchewan, Oregon State | — |
| Maqui (*Aristotelia chilensis*), murtilla (*Ugni molinae*), calafate y michay (*Berberis*) | INIA (Carillanca, Tamel Aike), universidades chilenas, FIA | Calafate y michay entre sí (mismo género) |
| Rosa mosqueta (*Rosa rubiginosa*) | INIA y universidades chilenas | — |
| Saúco (*Sambucus nigra*) | University of Missouri (Center for Agroforestry), Cornell | — |
| Albahaca (*Ocimum basilicum*) | Tabla B-1 de University of Maryland, si incluye «Basil»; sensibilidad al frío en extensión (UF/IFAS, Purdue) | — |
| Ciboulette (*Allium schoenoprasum*) | Extensión de hierbas | Cebollín o cebolla (mismo género) |
| Cilantro (*Coriandrum sativum*) | Tabla B-1, si incluye «Cilantro»; espigado por calor (UC ANR) | Perejil (misma familia, Apiáceas) |
| Orégano (*Origanum vulgare*) | Extensión de hierbas perennes | — |

| Especie | Vegetativo | Floración | Cosecha | Fuente o analogía |
| --- | --- | --- | --- | --- |
| Frambuesa | pH | pH; helada bajo −0,7 °C | Helada (30,0 °F); lluvia (pudrición gris) | INIA, Boletín 372 ([S180](MOTOR_AGRONOMICO.md#s180)); Penn State ([S181](MOTOR_AGRONOMICO.md#s181)); USDA Handbook 66 ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Mora | pH | pH; helada (27 °F, mueren las flores) | Helada (30,5 °F) | NC State ([S182](MOTOR_AGRONOMICO.md#s182), [S183](MOTOR_AGRONOMICO.md#s183)); USDA Handbook 66 ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Arándano rojo | Helada bajo 30 °F | Helada bajo 30 °F | Helada bajo 28 °F (fruta que empieza a colorear) | UMass ([S184](MOTOR_AGRONOMICO.md#s184), [S185](MOTOR_AGRONOMICO.md#s185)) |
| Grosella | pH | pH | Helada (30,0 °F) | Columbia Británica ([S186](MOTOR_AGRONOMICO.md#s186)); USDA Handbook 66 ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Zarzaparrilla roja y negra | pH | pH | Helada (30,2 °F) | Columbia Británica ([S186](MOTOR_AGRONOMICO.md#s186)); USDA Handbook 66, fila «Currants» ([S120](MOTOR_AGRONOMICO.md#s120)) |
| Maqui | Helada (0 °C, sensible) | Helada | Helada | Universidad de Talca ([S187](MOTOR_AGRONOMICO.md#s187)) y PFAF ([S188](MOTOR_AGRONOMICO.md#s188)) |
| Murtilla | pH (hábitat) y helada (0 °C) | pH y helada | Helada | FIA e INIA ([S189](MOTOR_AGRONOMICO.md#s189)) y PFAF ([S188](MOTOR_AGRONOMICO.md#s188)) |
| Calafate y michay | Helada leve (informa) y bajo −15 °C | Igual | Igual | PFAF ([S188](MOTOR_AGRONOMICO.md#s188)), rusticidad de la planta completa |
| Rosa mosqueta | pH | pH | Helada (el fruto se ablanda y cae) | FIA ([S190](MOTOR_AGRONOMICO.md#s190), [S191](MOTOR_AGRONOMICO.md#s191)) |
| Saúco | pH; helada de primavera (informa) | pH; helada de primavera (informa) | Helada (informa: no es sensible) | Vermont ([S192](MOTOR_AGRONOMICO.md#s192)), Missouri ([S193](MOTOR_AGRONOMICO.md#s193)) y PFAF ([S188](MOTOR_AGRONOMICO.md#s188)) |
| Albahaca | Helada (no la tolera); frío bajo 50 °F (informa) | Igual | Igual | INIA, Boletín 165 ([S36](MOTOR_AGRONOMICO.md#s36)); South Dakota State ([S194](MOTOR_AGRONOMICO.md#s194)) |
| Ciboulette | Helada leve (informa) y bajo 28 °F | Igual | Igual | South Dakota State ([S194](MOTOR_AGRONOMICO.md#s194)) |
| Cilantro | pH; helada leve y bajo 28 °F | pH; helada leve y bajo 28 °F | Calor sostenido sobre 90 °F | [Analogía](MOTOR_AGRONOMICO.md#analogia) con perejil (misma familia, Apiáceas de hoja) |
| Orégano | pH; helada (informa: la tolera) | Igual | Helada (informa) | UC IPM ([S195](MOTOR_AGRONOMICO.md#s195)) |
| Haskap | — | — | — | **Retirado** del catálogo: ver nota más abajo |

**Especie retirada (sin fuente propia ni analogía válida en alguna etapa):**

- **Haskap.** El pH (5 a 7, University of Saskatchewan) y la helada en flor (resiste −7 °C abierta; Utah State, 19 °F; NDSU, 17 °F) tenían fuente propia. Para cosecha se revisaron University of Saskatchewan («Growing Haskap in Canada» y «How far south can Haskap be grown?», que indica que la botritis no afecta a la fruta en la planta), Utah State, University of Alaska Fairbanks, NDSU, la ficha de jardinería de USask y PFAF: ninguna documenta un efecto de lluvia, helada o calor sobre la fruta cerca de la cosecha. USDA Handbook 66 no tiene fila de haskap. Sin especie similar en el catálogo (es el único *Lonicera* y ninguna otra especie es Caprifoliáceas). Se retira completa.

**Notas de la investigación.** USDA Handbook 66 (vía University of Maine, [S120](MOTOR_AGRONOMICO.md#s120)) tiene filas de frambuesa, mora, «Currants» (sin distinguir roja ni negra) y «Gooseberries», pero no de arándano rojo ni de saúco (este último sin punto de congelación). Para los berries nativos (maqui, murtilla, calafate y michay) no se encontró una cifra institucional chilena de daño por helada en temporada: INIA, FIA, INFOR y las tesis revisadas son cualitativas. Por eso se usan las fichas de PFAF, como en caigua y locoto, declarando su alcance. Las fichas de pfnm.cl (INFOR) no se pudieron usar porque el sitio sólo responde por http. En saúco y orégano, la helada en cosecha es sólo informativa: las fuentes describen una planta tolerante, no un riesgo para la fruta o la hoja.

#### ES8.D. Agente D — cultivos, forrajeras y forestales

| Especie | Primero buscar | Analogía candidata |
| --- | --- | --- |
| Trigo | INIA (manuales de trigo); Kansas State University, «Spring Freeze Injury to Kansas Wheat» (temperaturas críticas por estado: encañado, espigadura, floración); lluvia en cosecha (brotación en espiga) | — |
| Cebada, avena, triticale | INIA; tablas de helada por estado de extensión (NDSU, University of Minnesota) | Trigo (misma tribu Triticeae; triticale es trigo × centeno) |
| Arroz | INIA Quilamapu: frío en floración (esterilidad de espiguillas bajo un umbral documentado) | — |
| Raps (*Brassica napus*) | INIA; Canola Council of Canada (helada en floración y en madurez) | — |
| Remolacha azucarera | IANSA, INIA; extensión de NDSU y University of Minnesota (helada) | Betarraga o acelga (misma especie botánica) |
| Soya | Extensión de Iowa State y University of Nebraska (helada por estado) | Poroto (misma familia, leguminosa de grano) |
| Lupino | INIA (lupino australiano y blanco) | Haba o arveja (misma familia) |
| Achicoria (*Cichorium intybus*) | Achicoria industrial: INIA, Orafti/Beneo; extensión | Lechuga (misma familia), con la diferencia de órgano declarada |
| Alfalfa | INIA; UC ANR, University of Wisconsin (pH, helada en rebrote, lluvia sobre heno cortado) | — |
| Ballica | INIA; Oregon State (ryegrass) | — |
| Col forrajera (*Brassica oleracea*) | Extensión forrajera de brásicas | Repollo (misma especie botánica) |
| Trébol rosado | INIA; extensión forrajera (pH, helada) | Alfalfa (misma familia), si tiene fuente propia |
| Pino radiata | INFOR, CONAF y Universidad de Concepción (helada y calor en plantaciones) | — |
| Eucalipto (*E. globulus*, *E. nitens*) | INFOR, CSIRO (tolerancia a helada por especie: *E. nitens* más tolerante) | — |

| Especie | Vegetativo | Floración | Cosecha | Fuente o analogía |
| --- | --- | --- | --- | --- |
| Trigo | Helada (24 °F, encañado) | Helada (30 °F, esterilidad) | Helada (28 °F, grano lechoso o pastoso) | Kansas State, C-646 ([S240](MOTOR_AGRONOMICO.md#s240)) |
| Cebada | Helada leve (informa) y bajo −6 °C | Helada bajo 28 °F (fin de bota a floración) | Helada (28 °F) | Manitoba ([S241](MOTOR_AGRONOMICO.md#s241)) y NDSU ([S242](MOTOR_AGRONOMICO.md#s242)); cosecha por analogía con trigo (tribu Triticeae) |
| Avena | Helada leve (informa) y bajo −6 °C | Helada (32 °F, esterilidad) | Helada (28 °F) | Manitoba ([S241](MOTOR_AGRONOMICO.md#s241)) y California Agriculture ([S243](MOTOR_AGRONOMICO.md#s243)); cosecha por analogía con trigo (familia de las gramíneas) |
| Triticale | Helada (24 °F) | Helada (30 °F) | Helada (28 °F) | Las tres por analogía con trigo (híbrido de trigo y centeno) |
| Arroz | Frío bajo 9 °C (informa) | Frío de 40 °F o menos; calor sobre 35 °C | Frío bajo 12 °C (informa) | INIA ([S244](MOTOR_AGRONOMICO.md#s244), [S245](MOTOR_AGRONOMICO.md#s245)) y California Agriculture ([S243](MOTOR_AGRONOMICO.md#s243)) |
| Raps | Helada leve (informa) y bajo 24 °F | Helada (informa: aborta flores abiertas) | Helada bajo −2 °C y bajo −5 °C | NDSU ([S246](MOTOR_AGRONOMICO.md#s246), [S247](MOTOR_AGRONOMICO.md#s247)) y Canola Council ([S248](MOTOR_AGRONOMICO.md#s248)) |
| Soya | Helada (32 °F, hojas) y bajo 30 °F | Igual | Igual (sin daño después de R7) | NDSU ([S249](MOTOR_AGRONOMICO.md#s249)) |
| Remolacha azucarera | pH; helada leve y bajo 28 °F | pH; helada leve y bajo 28 °F | Helada leve y bajo 28 °F | pH: Purdue ([S250](MOTOR_AGRONOMICO.md#s250)); helada por analogía con betarraga (misma especie botánica) |
| Lupino | pH | pH; calor de 80 °F o más; frío bajo 50 °F (informa) | Calor de 80 °F o más (llenado de vainas) | Oregon State, EM 8834 ([S251](MOTOR_AGRONOMICO.md#s251)) |
| Achicoria | pH; helada en plántula | pH | Helada (baja la calidad de la inulina) | Ministerio de Agricultura de Ontario ([S252](MOTOR_AGRONOMICO.md#s252)) |
| Alfalfa | Helada leve (informa) y bajo 24 °F | Igual | Lluvia sobre el forraje cortado | Penn State ([S253](MOTOR_AGRONOMICO.md#s253)), South Dakota State ([S254](MOTOR_AGRONOMICO.md#s254)) y Wisconsin ([S255](MOTOR_AGRONOMICO.md#s255)) |
| Trébol rosado | pH | pH | Lluvia sobre el forraje cortado | pH: Oregon State ([S256](MOTOR_AGRONOMICO.md#s256)); cosecha por analogía con alfalfa (leguminosas forrajeras que se henifican) |
| Ballica | pH | pH | Lluvia sobre el forraje cortado | Pacific Northwest Extension ([S257](MOTOR_AGRONOMICO.md#s257)) y Penn State ([S258](MOTOR_AGRONOMICO.md#s258)) |
| Col forrajera | pH; helada leve y bajo 10 °F | Igual | Helada leve y bajo 10 °F | Mississippi State ([S259](MOTOR_AGRONOMICO.md#s259)) y Wisconsin ([S260](MOTOR_AGRONOMICO.md#s260)) |
| Eucalipto | Helada de −7,1 °C o menos (daño grave) | Igual | Igual | Universidad de Concepción ([S261](MOTOR_AGRONOMICO.md#s261)) e INFOR ([S262](MOTOR_AGRONOMICO.md#s262)) |
| Pino radiata | Helada de −3 °C o menos (plantas jóvenes) | Igual | Igual | Colegio de Postgraduados, Revista Chapingo ([S263](MOTOR_AGRONOMICO.md#s263)) |

**Notas de la investigación.** Sólo el trigo tiene una tabla de temperaturas por estado con fuente propia; para cebada y avena hay cifras propias en vegetativo y floración, y el llenado de grano usa la tabla del trigo. Penn State ubica a la avena y la cebada como menos rústicas que el trigo y al triticale como más rústico: la analogía es cauta para el triticale, y en la avena se declara que el daño podría empezar antes. En arroz, las temperaturas críticas de INIA son medias diarias y el pronóstico compara mínimas, por eso esos criterios sólo informan. Los criterios de forestales cubren las tres etapas con el daño documentado para el árbol, como en palto. La ballica usa la guía de *Lolium multiflorum*; la de *L. perenne* puede diferir.

#### ES8.2. Integración — la hace el coordinador

- [x] Citas verificadas sobre el texto descargado de cada fuente (no sobre el resumen de un buscador). Los criterios de umbral bajo que se cumplirían casi todas las noches (arroz bajo 9 y 12 °C, albahaca bajo 10 °C, lupino bajo 10 °C) quedan como `info`.
- [x] Listas `PENDIENTES_*` vacías; el haskap, retirado de `SPECIES` y con su nombre de fuente en `EXCLUDED_SOURCE_NAMES`. Las pruebas que usaban el trigo como especie sin criterios ahora comprueban que todo el catálogo tiene perfil y que la presentación declara los criterios de la especie.
- [x] El constructor de helada en cosecha con USDA Handbook 66 (`harvestFreeze`) pasó del archivo de frutales a `speciesRuleKit.ts`, porque lo usan también los berries.
- [x] `SPECIES_RULES_VERSION` en `2.9.0` y `SPECIES_CATALOG_VERSION` en `2.2.0`; avance de ES6 y tabla del §1 actualizados.
- [x] `npm test` (380 pruebas), `npm run type-check` y `python docs/verificar_documentacion.py`, sin errores.
- [ ] Recorrido en teléfono: elegir una especie de ES8 por analogía (por ejemplo, triticale) y una con criterio sólo informativo (por ejemplo, orégano) y comprobar el detalle técnico.

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

### E1.3. Cobertura y límites de interpretación — completo por software

- [x] Definir cobertura por capacidad, separada de gravedad y solidez de evidencia.
- [x] Impedir comparaciones categóricas de conductividad sin método compatible en el flujo de captura y presentar pH como coincidencia parcial.
- [x] Mantener nutrientes fuera de compatibilidad y dosis; comprobar que cambiar sus registros no altera esas decisiones.
- [x] Definir frescura y reloj de evaluación, y representar evidencia antigua sin convertirla en favorable.
- [x] Verificar el vínculo ubicación–captura y la separación entre suelo medido y modelado.
- [x] Cerrar T04–T06, T10–T14 y T29–T32 según el alcance completo de E1 con la integración de caché de E3 ([evaluationCoverage.test.ts](tests/evaluationCoverage.test.ts)).

**Código y evidencia:** [evaluationCoverage.ts](src/engine/evaluationCoverage.ts), [stageEvaluator.ts](src/engine/stageEvaluator.ts), captura, clima, presentación e historial existentes; [evaluationCoverage.test.ts](tests/evaluationCoverage.test.ts) y regresiones de presentación, calidad y clima.

**Política técnica `capture-evidence-v1`:** hasta 30 minutos para interpretar una captura local y tres horas desde la consulta climática, incluyendo el límite exacto. No son constantes agronómicas ni garantías de representatividad. El reloj se recibe explícitamente; tiempos futuros o desconocidos suspenden la interpretación. El pronóstico exige identificador de captura y coordenadas solicitadas coincidentes. El historial conserva la evaluación original sin recalcular su antigüedad.

**Resultado:** coincidencias parciales por temperatura y pH; conductividad sin categorías de salinidad; nutrientes fuera de compatibilidad y dosis. Estado semántico y cobertura guardados en el diagnóstico. La insuficiencia tiene presentación neutral en resultado e historial; ámbar se conserva únicamente en el campo legado para evitar que clientes antiguos la interpreten como éxito.

**Pendientes:** verificación en teléfono. El evaluador legado de perfiles explícitos conserva sus reglas y no se usa en capturas nuevas.

## 4. E2 — Física local

**Código:** [localPhysics.ts](src/engine/localPhysics.ts) (fórmulas y dominio), [evaluationCoverage.ts](src/engine/evaluationCoverage.ts), [speciesRules.ts](src/engine/speciesRules.ts) (frío con el aire local), [measurementPresentation.ts](src/engine/measurementPresentation.ts) y el detalle de [MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx). **Evidencia:** [localPhysics.test.ts](tests/localPhysics.test.ts).

- [x] Revisar el déficit de presión de vapor existente: la fórmula coincide con FAO-56 (ec. 11 y 19), pero `computeVpdKpa` aceptaba humedad fuera de 0–100 % y valores no finitos; ahora devuelve `null` y la fórmula vive en un solo lugar.
- [x] Punto de rocío por inversión de la misma ecuación, separación al rocío y diferencia suelo–aire, con entradas, fórmula, fuente y versión (`local-physics-v1`) por indicador.
- [x] HR de 0 %: DPV calculable y rocío no calculable, sin mínimo artificial (T09). Saturación: DPV cero y rocío igual a la temperatura (T08). La presión no entra en ninguna fórmula (T10). Bajo 0 °C se declara la referencia sobre agua (`water_reference_below_freezing`): no es un cálculo de escarcha.
- [x] Indicadores continuos, sin categorías ni acciones: la capacidad `ambient_vpd` deja de estar bloqueada y declara `continuous_indicator_only`.
- [x] T04, T07–T11. Los derivados se muestran en el detalle de temperatura y humedad del aire («Calculado con esta lectura») y se guardan en el diagnóstico (`diagnosis.derived`), heredando las limitaciones de sus entradas.
- [x] **Frío con el aire medido, sin red.** Los criterios de especie de mínima bajo un umbral (helada y frío) se comparan también con la temperatura del aire del equipo: la mínima del día nunca supera la de este momento, así que una lectura en el umbral o bajo él lo implica. Avisa una sola vez por familia, con el umbral más extremo (T44), y una lectura sobre el umbral no se presenta como clima favorable. El calor y las noches cálidas siguen sólo en el pronóstico: el sol sobre el equipo sube la lectura y una noche cálida no se deduce de un instante. Con pronóstico se muestran ambas fuentes (§5.6). Sin red, 84, 97 y 86 de las 111 especies tienen un criterio de frío revisable en vegetativo, floración y cosecha; antes, en cosecha, ninguna.

**Límites:** el módulo del equipo en banco es un BMP280 sin humedad, así que el DPV y el rocío sólo se comprobaron con pruebas; con ese módulo quedan «No calculable». Es una captura instantánea: no da duración de episodios ni sustituye una serie horaria.

## 5. E3 — Clima horario

**Dependencia:** E1; revisar [contrato del proveedor](https://open-meteo.com/en/docs) antes de activar grupos.

- [x] Verificar variables, unidades y disponibilidad con respuestas reales para Chile y conservar fixtures reproducibles (`CHILE_OPEN_METEO_FIXTURE` en [weatherUnits.ts](tests/fixtures/weatherUnits.ts), probado en [weatherService.test.ts](tests/weatherService.test.ts)).
- [x] Incorporar lo que queda del día e intervalos horarios sin deducir horas desde resúmenes diarios. El día de la consulta (`today`), el tiempo actual por código WMO (`weatherCode`, diario y actual), las cinco series horarias (`temperature_2m`, `relative_humidity_2m`, `precipitation`, `precipitation_probability`, `wind_speed_10m`) y el resumen de lo que queda del día (`remainingToday`, calculado exclusivamente desde las ranuras horarias restantes de hoy y nunca deducido de `daily`) se piden, validan y exponen en [weatherService.ts](src/services/weatherService.ts), [measurementResultData.ts](src/components/measurementResultData.ts) y [MeasurementForecast.tsx](src/components/MeasurementForecast.tsx); evidencia en [weatherService.test.ts](tests/weatherService.test.ts) y [weatherOutlook.test.ts](tests/weatherOutlook.test.ts).
- [x] Normalizar intervalos y cambios de hora de Chile; los huecos interrumpen la continuidad (`longestRun` en [speciesRules.ts](src/engine/speciesRules.ts), probado en [weatherOutlook.test.ts](tests/weatherOutlook.test.ts)).
- [x] Mantener separados probabilidad, cantidad y componentes de precipitación; evitar dobles conteos de agua y evapotranspiración de referencia ([weatherService.ts](src/services/weatherService.ts), [weatherOutlook.test.ts](tests/weatherOutlook.test.ts)).
- [x] Caché y vigencia vinculadas a ubicación y producto (`weather-cache-v1`, [evaluationCoverage.ts](src/engine/evaluationCoverage.ts)). Cada descarga se guarda por cuenta ([weatherCacheStore.ts](src/services/weatherCacheStore.ts)); sin red o ante un error del proveedor se reutiliza la más cercana dentro de 1 km y de la vigencia de 3 h ya vigente, reconstruida desde la respuesta original con el reloj de la captura: sin el bloque «ahora», sin contar como hoy un día ya pasado y con huecos donde no alcanza. Conserva la hora de descarga y la distancia, se declara (`weather_reused_offline`) y se muestra en el pronóstico, el plan y el historial. Evidencia: [weatherCache.test.ts](tests/weatherCache.test.ts), que cubre T29 y T31 con la caché real. Falta medir aciertos y tamaño en uso.
- [x] Cancelar solicitudes al salir/cambiar de cuenta y descartar respuestas de otra captura; comprobar el patrón existente de guardado antes del clima ([measureCaptureSession.ts](src/utils/measureCaptureSession.ts), [MeasureScreen.tsx](src/screens/MeasureScreen.tsx), [measurementPresentation.test.ts](tests/measurementPresentation.test.ts)).
- [x] Medir peticiones, latencia y tamaño de respuesta (`measureWeatherResponse` y `WEATHER_RESPONSE_BUDGET` en [weatherService.ts](src/services/weatherService.ts), probado en [weatherService.test.ts](tests/weatherService.test.ts)).
- [x] Pasar T21–T32 y T36–T38 con integración, además de las pruebas puras ([evaluationCoverage.test.ts](tests/evaluationCoverage.test.ts), [weatherOutlook.test.ts](tests/weatherOutlook.test.ts), [measurementPresentation.test.ts](tests/measurementPresentation.test.ts)).

## 6. E4 — Motor por etapa

**Áreas:** [stageEvaluator.ts](src/engine/stageEvaluator.ts), [contextualAdvice.ts](src/engine/contextualAdvice.ts) y funciones de decisión. **Evidencia:** [stageRules.test.ts](tests/stageRules.test.ts).

- [x] Separar reglas ambientales del conjunto de perfiles: las alertas generales de temperatura, pH y humedad se calculaban sobre los perfiles y texturas del prototipo, así que agregar un cultivo podía apagar una. Ahora son reglas `GEN-TEMP-01`, `GEN-PH-01` y `GEN-VWC-01` (`GENERAL_RULES`, versión `1.0.0`) con los mismos límites congelados; el resultado vigente no cambia. Esos límites siguen sin fuente agronómica revisada y así se declara en el código.
- [x] IDs y versiones por alerta (`ruleId`, `ruleVersion`): reglas generales y `species:<id>:<variable>` con la versión de los criterios por especie. Las fuentes y límites de cada criterio de especie ya estaban en el detalle técnico.
- [x] Prioridades y conflictos. El plan se ordena por urgencia y cercanía (ahora, hoy, próximos días, próxima medición) y nunca por el orden del catálogo; conductividad y NPK no suman gravedad (T44). `GEN-PH-01` compara contra el rango general (4,2–7,8) sin contradecir la especie elegida, y las acciones del mismo objetivo (alertas generales y de especie sobre el mismo parámetro de suelo, o días con riesgo climático ya cubiertos por la especie) se fusionan conservando ambas razones en `detail` (§9.2).
- [x] Revisar salidas de vegetativo, floración y cosecha (`VG01–VG05`, `FL01–FL05`, `CO01–CO05` registradas en `STAGE_OUTPUT_RULES` y `getStageOutputRules` en [stageEvaluator.ts](src/engine/stageEvaluator.ts)). Comprobado que no se infiere especie, infección, madurez ni tránsito seguro (T20, T33, T34), que `FL05` excluye la reducción uniforme del 80 % de CE en el flujo nuevo y que las reglas sin umbral de patógeno, polinizadores o maquinaria (`VG05`, `FL04`, `CO03`) permanecen en estado `documented` (§8.6); probado en [stageRules.test.ts](tests/stageRules.test.ts).
- [x] Cobertura insuficiente conservada en el estado y misma evaluación en ambos idiomas (T40).
- [x] T01–T03, T20, T33, T34, T40 y T44.

## 7. E5 — Catálogo con evidencia

La lista de especies y los criterios de vegetativo, floración y cosecha se trabajan en [ES](#2-es--especie-de-la-medición). Esta entrega cubre los perfiles de **pre-siembra** ([prePlanting.ts](src/engine/prePlanting.ts), versión `1.0.0`, 28 perfiles en 27 especies): **en pre-siembra no se pide especie al agricultor, porque el objetivo de esa etapa es que el motor le sugiera y recomiende qué cultivos sembrar o plantar según la temperatura y el pH medidos en el suelo.**

- [x] Curar perfiles con identificadores estables (`pre.<especie>.<establecimiento>`), fuentes precisas ([S10](MOTOR_AGRONOMICO.md#s10), [S18](MOTOR_AGRONOMICO.md#s18), [S22](MOTOR_AGRONOMICO.md#s22), [S23](MOTOR_AGRONOMICO.md#s23), [S24](MOTOR_AGRONOMICO.md#s24), [S26](MOTOR_AGRONOMICO.md#s26), [S53](MOTOR_AGRONOMICO.md#s53), [S55](MOTOR_AGRONOMICO.md#s55), [S61](MOTOR_AGRONOMICO.md#s61), [S67](MOTOR_AGRONOMICO.md#s67)), versión (`PRE_PLANTING_VERSION`) y forma de establecimiento (`seed`, `transplant`, `tuber`, `perennial_planting`).
- [x] Incorporar límites térmicos superiores (`tempMax`) e inferiores (`tempMin`) aplicables (T15, T16); separar semilla directa de trasplante y tubérculo sin trasladar umbrales de germinación (T17).
- [x] Comparar sólo criterios con evidencia y método compatibles; conservar limitaciones de pH y mantener la conductividad fuera de la exclusión de cultivos hasta acreditar método compatible (T13, T14).
- [x] Tratar parámetros faltantes sin premiar al perfil incompleto (`pre.apio.semilla` con `tempOpt: null` y `tempMax: null` según el asterisco de UC ANR Tabla 5.2 queda con `has_limitations` y después de los perfiles completos, T18) y explicar ausencia de coincidencias sin afirmar imposibilidad universal (T19).
- [x] Limitar sugerencias de cultivos a `pre_siembra` (T20); distinguir los cultivos anuales de establecimiento inmediato (`short_term_establishment`) de la evaluación parcial de perennes (`partial_perennial_assessment`, T42).
- [x] Pasar T15–T19, T42 y T46–T47, con contraejemplos acidófilos (arándano) y fronteras documentadas ([stageRules.test.ts](tests/stageRules.test.ts), [measurementPresentation.test.ts](tests/measurementPresentation.test.ts)).

## 8. E6 — Resultado, pantallas y persistencia

**Áreas:** [MeasureScreen.tsx](src/screens/MeasureScreen.tsx), [measurementPresentation.ts](src/engine/measurementPresentation.ts), [MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx) y lectores de históricos.

El selector de especie, su guardado y su presentación se trabajan en [ES](#2-es--especie-de-la-medición).

- [x] Integrar el resultado nuevo en las pantallas existentes, mostrando la limitación que cambia la interpretación (`coverageSummary` y desplegable «Cómo se evaluó y limitaciones» en [MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx)).
- [x] Plan de recomendaciones estructurado (tema, urgencia, momento, título y explicación) en `ContextualAdvice.recommendations` y en la presentación v3 como campo opcional; las lecturas anteriores siguen mostrando sus acciones. Es la última pantalla del resultado, después del clima. Evidencia: [weatherOutlook.test.ts](tests/weatherOutlook.test.ts).
- [x] Pantalla de clima con «Hoy · ahora», resumen de los próximos días y franja compacta; páginas de lecturas con explicación e ilustración; carrusel real como el de la bienvenida ([MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx), `ResultPager`): las páginas del resultado y las del detalle de variables van una al lado de la otra, así que al deslizar entra la siguiente por partes; la barra superior con la batería y el pie con el avance quedan fijos, y los botones y el atrás del teléfono desplazan el carrusel.
- [x] Historial filtrable por especie y agrupable por fecha, especie o etapa, leyendo la instantánea guardada; el backoffice muestra la especie ([migración](../supabase/migrations/20261012120000_especie_en_mediciones_soporte.sql)). Evidencia: [measurementHistory.test.ts](tests/measurementHistory.test.ts).
- [x] Incorporar detalle opcional de alternativas sin convertir su consulta en selección de cultivo (`cropOptions` expandibles con motivos, método de establecimiento y respaldo técnico en `pre_siembra`, sin modificar `crop_id`, T35).
- [x] Ampliar pronóstico con comparación temporal y derivados identificados, sin pasos obligatorios nuevos (`compareForecastWindows` en [weatherOutlook.ts](src/engine/weatherOutlook.ts) y [MeasurementForecast.tsx](src/components/MeasurementForecast.tsx), CO01–CO05 y T28).
- [x] Guardar instantánea compacta de datos usados, razones, cobertura y versiones; medir tamaño del diagnóstico (`buildSavedDiagnosisSnapshot` en [measureCaptureSession.ts](src/utils/measureCaptureSession.ts), `< 40 KB` sin serie horaria cruda) y cola sin red.
- [x] Mantener históricos sin recalcular ni incorporar pronóstico nuevo; conservar lectura de contratos anteriores (`presentationFromPoint` en [measurementPresentation.ts](src/engine/measurementPresentation.ts), T39, T41 y T43).
- [x] Límite de 10 s para subir una medición o sincronizar la cola ([measurementsService.ts](src/services/measurementsService.ts)): con señal débil la petición se cancela y la medición queda en la cola local, que se escribe antes de intentar subirla.
- [x] Verificar guardar antes del clima, llegada posterior, salida y cambio de cuenta (`applyWeatherToCapture` y `buildSavedDiagnosisSnapshot`, T36–T38 en [measurementPresentation.test.ts](tests/measurementPresentation.test.ts)).
- [ ] Pasar T35–T40, T43, T45 y T48; verificar navegación, letra grande, idioma y lectura sin red en Android/iOS.
- [x] Crear migraciones sólo si el contrato final las necesita. La especie del backoffice no agrega columnas: devuelve la de la instantánea ([migración](../supabase/migrations/20261012120000_especie_en_mediciones_soporte.sql)).

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

**Resultados de verificación del incremento:** `npm test` aprobó la suite completa (434 pruebas, 27 de octubre de 2026) y `npm run type-check` terminó sin errores; el verificador documental, con 0 errores. El uso sin red se recorrió en un teléfono Android con la compilación release y la sonda real fuera del suelo (detalle en [ES5](#es5-verificación)). Son comprobaciones de software, no ensayos agronómicos con la sonda.

**Revisión pendiente fuera de las pruebas automatizadas:** ejecución en teléfono y proveedor real. No se declara validación de terreno, precisión instrumental ni cierre completo de E1.
