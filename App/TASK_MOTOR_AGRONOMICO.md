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
| ES — Especie de la medición | ES1–ES4 por software; ES5 en teléfono parcial; ES6 con 32 especies en vegetativo, floración y cosecha | Lista con fuentes, selector, resultado e historial; criterios por especie y etapa (ES6) en curso |

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
- [ ] Recorrido en teléfono Android. Hecho en un Moto g56 con Expo Go, sonda simulada y pronóstico real de Open-Meteo: elegir etapa y especie, buscar, letra grande (escala 1,3), resultado y plan de recomendaciones de cerezo, olivo y tomate, y el detalle técnico desplegable. El recorrido corrigió el buscador, que quedaba tapado por el teclado: [EntryUI.tsx](src/components/entry/EntryUI.tsx) reserva el alto del teclado en Android y [SpeciesPicker.tsx](src/components/SpeciesPicker.tsx) deja espacio para ver los resultados. Pendiente: saltar, «no se encuentra», inglés, guardar sin red y abrir el historial; la sonda simulada no guarda mediciones.

### ES6. Criterios por especie y etapa — en curso

Se aborda después de ES1–ES5, empezando por las especies de mayor superficie de cada grupo. Cada criterio sigue el [proceso de incorporación](MOTOR_AGRONOMICO.md#catalogo) de la especificación.

**Avance: 69 especies con perfil propio (versión de criterios `2.6.0`, con 36 perfiles de frutales incorporados en la ola 2 sobre las 115 especies del catálogo).** Las 33 especies originales (28 hortalizas/anuales más arándano, frutilla, cerezo, kiwi y olivo) mantienen su cobertura en vegetativo, floración y cosecha. Los 36 nuevos perfiles de frutales incorporan sus umbrales edafoclimáticos exactos (pH, helada en floración/brotación/vegetativo, calor en floración y lluvia en cosecha) sin extrapolar entre etapas ni especies. Las 5 especies restantes del catálogo de frutales sin evidencia técnica suficiente (castaño, membrillo, pera asiática, pluot y tangelo) se mantienen documentadas como huérfanas confirmadas sin criterios inventados. Código: [speciesRules.ts](src/engine/speciesRules.ts) y [contextualAdvice.ts](src/engine/contextualAdvice.ts); evidencia y pruebas: [speciesRules.test.ts](tests/speciesRules.test.ts), [speciesWeather.test.ts](tests/speciesWeather.test.ts) y [speciesCriteriaFamilies.test.ts](tests/speciesCriteriaFamilies.test.ts).

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
| Duraznero, nectarino | University of Georgia Extension ([S61](MOTOR_AGRONOMICO.md#s61)) | Óptimo 6,0–6,5 |
| Cítricos (naranjo, limonero, mandarino, clementina, pomelo, lima) | UF/IFAS Extension ([S67](MOTOR_AGRONOMICO.md#s67)) | Rango 6,0–7,0; encalado bajo 6,0 |
| Vid | North Carolina State Extension ([S55](MOTOR_AGRONOMICO.md#s55)) | Óptimo 6,0–7,0 para cultivares de vinífera europea |
| Almendro | UC Cooperative Extension ([S63](MOTOR_AGRONOMICO.md#s63)) | Óptimo 6,0–7,0 |
| Higuera | University of Guam Extension ([S74](MOTOR_AGRONOMICO.md#s74)) | Óptimo 6,0–6,5 |
| Lúcumo | FAO ECOCROP ([S75](MOTOR_AGRONOMICO.md#s75)) | Óptimo 6,5–7,5; límites absolutos 6,0 y 8,5 |
| Jojoba | University of Arizona Arboretum ([S73](MOTOR_AGRONOMICO.md#s73)) | Suelos neutros a alcalinos, pH 7,3–8,2 |
| Tuna | Central Soil Salinity Research Institute (ICAR) ([S76](MOTOR_AGRONOMICO.md#s76)) | Óptimo 6,5–7,5; límites de tolerancia 6,0 y 8,5 |
| Maracuyá | UF/IFAS Extension ([S67](MOTOR_AGRONOMICO.md#s67)) | Óptimo 6,0–6,5; límites 5,5 y 7,0 |
| Níspero, feijoa, granado, chirimoyo, guayabo, tumbo | California Rare Fruit Growers ([S57](MOTOR_AGRONOMICO.md#s57)), UF/IFAS ([S67](MOTOR_AGRONOMICO.md#s67)) | Rangos específicos según su ficha técnica individual |

**Criterios climáticos y de cosecha en frutales (Ola 2):**

| Grupo / Especies | Etapas y umbrales | Cosecha | Fuente |
| --- | --- | --- | --- |
| Pomáceas (manzano, peral) | Floración: helada bajo −2,2 °C (28 °F, 10 % daño) y bajo −3,9 °C (25 °F, 90 % daño) | — | Colorado State University ([S52](MOTOR_AGRONOMICO.md#s52)) |
| Níspero | Floración: helada bajo −3,0 °C (27 °F) mata flores y frutos pequeños | — | Clemson University ([S58](MOTOR_AGRONOMICO.md#s58)), CRFG ([S57](MOTOR_AGRONOMICO.md#s57)) |
| Carozos (damasco, duraznero, ciruelo, guindo) | Floración: helada bajo −2,8 °C (damasco, duraznero) o −2,2 °C (ciruelo, guindo) | Lluvia: partidura de piel por turgencia en fruta madura | CSU ([S52](MOTOR_AGRONOMICO.md#s52)), MSU ([S60](MOTOR_AGRONOMICO.md#s60)), University of Delaware ([S62](MOTOR_AGRONOMICO.md#s62)) |
| Vid | Vegetativo: helada bajo −1,2 °C (29,8 °F) tras brotación. Floración: calor sobre 35 °C (95 °F) causa corrimiento floral | Lluvia: riesgo de partidura de bayas y botritis | WSU ([S64](MOTOR_AGRONOMICO.md#s64)), UC Davis ([S65](MOTOR_AGRONOMICO.md#s65)), Univ. Wisconsin ([S66](MOTOR_AGRONOMICO.md#s66)) |
| Cítricos (limonero, lima ácida, mandarino, naranjo, clementina, pomelo) | Floración: helada bajo −1,7 °C (limonero, lima). Vegetativo/general: helada bajo −2,2 °C a −4,4 °C | Helada en fruta madura en árbol bajo −2,2 °C | UF/IFAS ([S67](MOTOR_AGRONOMICO.md#s67)), MSU ([S68](MOTOR_AGRONOMICO.md#s68)), UC ANR ([S69](MOTOR_AGRONOMICO.md#s69)) |
| Frutos secos (almendro, nogal, avellano europeo, pecana, pistacho, macadamia, jojoba) | Floración: helada en flor abierta (−2,2 °C almendro; −1,1 °C nogal y pecana; −8,9 °C flores femeninas avellano). Calor: sobre 35 °C en floración de pistacho; sobre 30 °C en macadamia (caída de frutos) | Lluvia: pecana en suelo mojado expuesta a germinación prematura y hongos | UCCE ([S63](MOTOR_AGRONOMICO.md#s63)), Oregon State ([S70](MOTOR_AGRONOMICO.md#s70)), UGA ([S61](MOTOR_AGRONOMICO.md#s61)), QDPI ([S71](MOTOR_AGRONOMICO.md#s71)), Purdue ([S72](MOTOR_AGRONOMICO.md#s72)) |
| Palto | Helada bajo −1,7 °C (29 °F) en ramas, brotes y floración (Hass) | — | California Avocado Commission ([S78](MOTOR_AGRONOMICO.md#s78)) |
| Subtropicales (higuera, lúcumo, caqui, chirimoyo, mango, dátil, feijoa, granado, guayabo, maracuyá, tumbo, tuna, papayo, babaco) | Heladas específicas según susceptibilidad térmica de cada especie (ej. higuera activa a −1,1 °C; papayo/babaco bajo 0 °C; mango bajo −1,1 °C) | Lluvia: higo (partidura/pudrición), caqui (ablandamiento), dátil (deterioro de racimos) | CRFG ([S57](MOTOR_AGRONOMICO.md#s57)), UF/IFAS ([S67](MOTOR_AGRONOMICO.md#s67)), UCLA ([S56](MOTOR_AGRONOMICO.md#s56)), FAO ([S75](MOTOR_AGRONOMICO.md#s75)), Frontiers ([S77](MOTOR_AGRONOMICO.md#s77)) |

**Especies huérfanas confirmadas del catálogo de frutales:**
De las 44 especies de frutales del catálogo, exactamente 5 se confirmaron sin criterios técnicos suficientes en la literatura agronómica especializada:
- **Castaño** (`sp.castano`): guías agronómicas describen tolerancia edáfica cualitativa amplia sin umbrales numéricos de pH contrastados por método de laboratorio, y no existen umbrales de helada floral verificados para cultivares chilenos.
- **Membrillo** (`sp.membrillo`): literatura disponible agrupa genéricamente al membrillero con el manzano/peral sin mediciones propias de daño celular por helada en floración ni ensayos de pH específicos.
- **Pera asiática** (`sp.pera-asiatica`): literatura de extensión advierte diferencias de susceptibilidad térmica frente a la pera europea (P. communis) pero sin curvas de mortalidad por estadio de yema.
- **Pluot** (`sp.pluot`): híbrido complejo (ciruelo × damasco) cuya tolerancia fenológica varía drásticamente según la proporción genética del cultivar (ej. Flavor Supreme vs. Dapple Dandy); no existe un umbral agronómico universal citable.
- **Tangelo** (`sp.tangelo`): híbrido (mandarino × pomelo) sin umbrales térmicos específicos desglosados en publicaciones de extensión de cítricos.
Cumpliendo la regla de oro del motor agronómico («nunca extrapolar ni inventar umbrales entre especies»), estas 5 especies se mantienen como huérfanas en `SPECIES_RULES` (`profile.criteria.length === 0`, `hasStageCriteria === false`).

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

- [ ] Familias de criterios por etapa. Habilitados: pH; helada por especie en las tres fases; frío y calor en floración y vegetativo cuando hay fuente; noches cálidas; lluvia y niebla; temperatura de suelo (frutilla) y humedad del aire (olivo); tolerancia a sales y etapa crítica de riego como referencias. **Cosecha, 16 de 32 especies con perfil siguen con sólo helada genérica** tras la búsqueda dirigida del 15 de octubre de 2026 (detalle de las 16 y por qué no califican, arriba); las otras 16 (tomate, berenjena, pimiento, poroto, melón, pepino, papa, camote, cebolla, repollo, lechuga, perejil, zapallo, arándano, frutilla, cerezo) ya tienen un criterio propio de cosecha. Buscado y confirmado sin fuente comparable: calor en floración de melón, sandía y pepino; bolting/floración temprana por calor en cebollín, perejil y puerro (sólo blogs comerciales sin verificar, ninguna fuente institucional con umbral exacto); calor documentado para los turiones de espárrago en plena cosecha (sólo guías de huerta sin respaldo institucional, con umbrales que se contradicen entre 50 °F y 70–80 °F) y pudrición de vaina por lluvia en arveja (sólo pudrición de semilla en germinación y una nota de prensa agrícola del Reino Unido, ninguna institucional sobre vaina en cosecha). Pendiente: comparar la salinidad cuando exista un método compatible para la conductividad de la sonda; decidir si conviene un tipo de criterio nuevo para el patrón «cambio de humedad» (zanahoria, rabanito, betarraga, sandía), que el `weatherEvent` binario actual no representa fielmente.
- [ ] Fuentes por prioridad: institucionales chilenas (INIA, ODEPA, universidades), extensión agrícola con tablas citables (UC ANR y equivalentes), FAO y ECOCROP sólo como índice para localizar evidencia.
- [x] Registro por criterio: valor original, unidad, conversión de °F, etapa, contexto, fuente con sección o tabla y fecha de consulta. La forma de establecimiento se registra por perfil: las tablas de hortalizas no distinguen semilla, almácigo ni trasplante (`not_specified`), y las de frutales y berries describen plantaciones establecidas (`established_plantation`).
- [ ] Estados por criterio (candidato, documentado, habilitado) y exposición en el catálogo de qué etapas tienen criterios.
- [ ] Conectar `species-rules` al motor sin alterar las alertas generales; pasar T15–T19, T42, T45 y T46. Conectado y probado para pH, lecturas del equipo, referencias y pronóstico: T05, T13, T15, T22–T24, T39, T44, T45 y T46 pasan para los criterios de especie; T16–T19 y T42 esperan los perfiles de pre-siembra y la explicación de evaluación parcial de perennes.

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
- [ ] Incorporar lo que queda del día e intervalos horarios sin deducir horas desde resúmenes diarios. Avance: el día de la consulta (`today`) y el tiempo actual por código WMO (`weatherCode`, diario y actual) ya se piden, validan y guardan; hoy cuenta en las alertas de lluvia, helada y calor, y la lluvia en curso abre el plan. La temperatura horaria del aire (`hourly`) se pide, se valida (unidad °C, horas repetidas o inválidas descartadas) y sólo se usa para estimar cuántas horas dura un episodio de los criterios de especie; no se guarda en el diagnóstico. Faltan el resto de variables horarias y los intervalos de lo que queda del día. Código: [weatherService.ts](src/services/weatherService.ts), [weatherOutlook.ts](src/engine/weatherOutlook.ts); evidencia: [weatherOutlook.test.ts](tests/weatherOutlook.test.ts), con la forma de una respuesta real del 12 de octubre de 2026 en Santiago.
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
- [x] Pantalla de clima con «Hoy · ahora», resumen de los próximos días y franja compacta; páginas de lecturas con explicación e ilustración; carrusel real como el de la bienvenida ([MeasurementResultFlow.tsx](src/components/MeasurementResultFlow.tsx), `ResultPager`): las páginas del resultado y las del detalle de variables van una al lado de la otra, así que al deslizar entra la siguiente por partes; la barra superior con la batería y el pie con el avance quedan fijos, y los botones y el atrás del teléfono desplazan el carrusel.
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

**Resultados de verificación del incremento:** `npm test` aprobó la suite completa (368 pruebas) y `npm run type-check` terminó sin errores; el verificador documental, con 0 errores. Las pantallas se revisaron en un teléfono Android mediante Expo Go con lecturas simuladas y el pronóstico real de Open-Meteo. Son comprobaciones de software, no ensayos con la sonda.

**Revisión pendiente fuera de las pruebas automatizadas:** ejecución en teléfono y proveedor real. No se declara validación de terreno, precisión instrumental ni cierre completo de E1.
