# Documentación de trabajo — Evaluación 3, Comercialización de Tecnologías

Base de contenido para construir el informe de la Evaluación 3. **No es el entregable.** El informe se escribirá después, tomando el formato exacto de `Comercializacion de Tecnologias/Unidad 2/Evaluacion 2.docx`.

Este archivo es la contraparte **interna**: aquí sí van referencias al repositorio, rutas y nombres de archivo. El informe, cuando se escriba, no lleva ninguna.

**Las cifras no se editan aquí.** Se generan en `finanzas/` y se consultan en `docs/RESULTADOS_FINANCIEROS.md`. Si una cifra de este documento no coincide con la del modelo, manda el modelo: `python finanzas/modelo.py`.

**La propuesta de valor no se redefine aquí.** El texto canónico vive en el capítulo III de `Evaluacion/Evaluacion 2/INFORME 2.md` («La Propuesta de Valor» y «Atributos de Paridad y Atributos de Diferencia»). Este documento la aplica al modelo de negocio y a la estrategia comercial. Si ambos difieren, manda el informe 2.

---

## 1. Mapa de la rúbrica al informe

Los diez criterios de `README.md` mapeados a los capítulos del informe. Cada criterio vale 10 puntos en el nivel Excelente; el máximo es 100.

| N° | Criterio de la rúbrica | Capítulo del informe | Estado del material |
| :--- | :--- | :--- | :--- |
| 1 | Definición del negocio y propuesta de valor | I. El negocio y su propuesta de valor | Material completo |
| 2 | Misión, visión y objetivos estratégicos | II. Dirección estratégica | **Pendiente** |
| 3 | Ventaja competitiva | III. Ventaja competitiva sostenible | Material completo |
| 4 | Estrategia de canales de comercialización | IV. Canales de comercialización | Material completo |
| 5 | Estrategia Go To Market | V. Estrategia de lanzamiento | Material completo |
| 6 | Plan de ventas e implementación | VI. Plan de ventas e implementación | Esqueleto con cifras; falta asignar responsables |
| 7 | Gestión de ventas y negociación | VII. Gestión comercial y negociación | **Pendiente** |
| 8 | Calidad del informe (INACAP y APA 7) | Transversal: formato y bibliografía | Pendiente de la fase final |
| 9 | Modelo de negocio (BMC1 y BMC2) | VIII. Evolución del modelo de negocio | Material completo |
| 10 | Presentación oral, defensa y respuestas | Presentación aparte | Pendiente de la fase final |

---

## 2. Reglas de redacción que hereda este informe

No son preferencias de estilo: son los errores que más puntaje cuestan en los criterios 1, 3 y 10.

**Lo que es paridad y no se presenta como diferencia.** La competencia directa también lo ofrece, y el comprador que ya la conoce lo advierte de inmediato:

- **Portabilidad.** Condición de la categoría: Hanna, Bluelab y FieldScout son todos de mano. Nos distingue del nodo fijo y del laboratorio, no de la competencia directa.
- **Aplicación propia, historial y enlace inalámbrico.** Bluelab Pulse los tiene.
- **Georreferenciación.** El FieldScout TDR 350 también registra ubicación.
- **Uso sin conexión.** Bluelab Pulse también opera sin red.
- **Ausencia de suscripción y de cobro por lectura.** Es diferencia frente al **laboratorio**, que cobra por muestra, y frente al **monitoreo remoto**, que cobra plataforma mensual. **No** frente a los medidores portátiles, que tampoco cobran cuota. Nunca escribirlo como si Hanna o Bluelab cobraran suscripción.
- **Celda recargable.** Ventaja ambiental con contrapartida declarada: reduce el residuo de pilas primarias, pero el intervalo entre recargas es menor que el de un equipo sin radio (Bluelab declara unos 4 meses por pila; TerraSense pide carga cada 6,7 semanas). No se presenta como ventaja de autonomía ni se le atribuye una reducción de huella de carbono que no esté cuantificada.

**Las cuatro diferencias defendibles.** La lista no se amplía sin evidencia:

1. Interpretación según la etapa fenológica y la especie.
2. Orientación de manejo como salida del sistema, en lugar del valor numérico.
3. Diez variables obtenidas de una sola inserción: siete del suelo y tres del ambiente.
4. Trazabilidad documental del criterio agronómico, sostenida por el catálogo de cultivos construido sobre estadística agrícola chilena (INE, ODEPA, CIREN, SAG, INFOR).

**Los límites se escriben como complemento, nunca como lista de carencias.** El laboratorio fija el punto de referencia con exactitud trazable; TerraSense aporta la repetición que ese análisis no puede costear y termina en un plan de acción que el informe de laboratorio no incluye. Igual frente al asesor, cuyo criterio el equipo confirma o corrige, y frente al nodo fijo, que da continuidad en un punto mientras la sonda cubre el campo.

**Vocabulario.** Español de Chile. Se dice **campo**, no «predio» ni «potrero». Se dicen **variables**, nunca «registros»: son diez variables, siete del suelo y tres del ambiente. N, P y K se nombran **valores de referencia**. Las siglas económicas (TAM, SAM, SOM, VAN, TIR, TCO, BOM, GTM) se explican entre paréntesis la primera vez. No se usan EBITDA, FCFF, FCFE, DSCR ni FTE; la dotación se expresa en personas.

---

## 3. Criterio 1 — El negocio y su propuesta de valor

### 3.1 Definición del negocio

Instrumento portátil de medición de suelo con interpretación agronómica: sonda RS-485 → ESP32 → enlace inalámbrico → aplicación móvil → historial en la nube. El negocio no es vender hardware que mide, es **entregar una orientación de manejo**. El valor numérico es el insumo, no el producto.

### 3.2 Cliente objetivo

Confirmado por el equipo:

- **Pequeños y medianos agricultores**, con énfasis en el adulto joven de nivel medio: el segmento que efectivamente adopta tecnología para ser más eficiente y que ya invierte en otras formas de mejorar su productividad.
- **Asesores agronómicos**, que son comprador y multiplicador a la vez (ver criterio 5).

El universo censal base para dimensionar el sector es de **175.556 explotaciones** (VIII Censo Agropecuario y Forestal 2021).

### 3.3 Las tres clases de valor

Estructura canónica del informe 2, aplicada aquí con la evidencia de cada clase.

| Clase | Pregunta del comprador | Lo que entrega TerraSense | Con qué se sostiene |
| :--- | :--- | :--- | :--- |
| **Funcional** | ¿Qué me permite hacer que hoy no puedo? | Hasta diez variables del mismo ciclo de captura en cualquier punto del campo, interpretadas según la etapa fenológica y la especie, sin cobertura de red, conservando ubicación e historial de cada medición | Ficha técnica, con el grado probatorio declarado variable por variable |
| **Económica** | ¿Cuánto me cuesta sostener esta información en el tiempo? | Pago único, sin suscripción ni cobro por lectura: el costo marginal de la medición siguiente es cero | Comparación de costo total de propiedad (TCO) frente al laboratorio y a la asesoría |
| **Emocional** | ¿Qué incertidumbre me quita de encima? | Decidir riego, siembra y fertilización sobre una lectura del propio suelo en lugar de una presunción | Filosofía del proyecto y límites del instrumento declarados sin atenuantes |

### 3.4 El argumento funcional

Lo que la competencia no hace: entregar un **plan de acción** según la especie y la etapa fenológica que el usuario selecciona. Los equipos comparados terminan en el número; el agricultor queda con el dato y sin la decisión. Diez variables de una sola inserción —siete del suelo y tres del ambiente— contra las tres o cuatro de un medidor portátil típico.

El historial georreferenciado por punto cumple además una función de continuidad: el cliente conserva la trazabilidad del punto medido y puede, si lo estima necesario, encargar un levantamiento de laboratorio sobre ese mismo punto. La georreferenciación en sí es paridad; el historial comparable entre temporadas es diferencia.

### 3.5 El argumento económico

| Vía para conocer el estado del suelo | Costo | Demora | Costo de la medición siguiente |
| :--- | :--- | :--- | :--- |
| Laboratorio acreditado | del orden de $50.000 por muestra | 15 a 30 días | otros $50.000 |
| Asesoría agronómica continua | fuera del presupuesto operativo del pequeño productor | agenda del profesional | otra visita |
| Medidor portátil importado | Hanna HI9814: US$294 por 4 variables, sin interpretación | inmediata | cero, pero sin orientación de manejo |
| **TerraSense** | **$489.990 con IVA** | inmediata | **cero** |

A $50.000 la muestra, unas diez muestras igualan el instrumento completo, y a partir de ahí el servicio sigue cobrando mientras el equipo propio ya no. Eso es lo que permite medir el mismo punto antes y después de fertilizar, o cuatro sectores el mismo día, cuantas veces se quiera.

> **Corregir antes de la entrega:** el informe 2 dice «nueve muestras ya igualan el precio completo». Nueve por $50.000 son $450.000 contra un precio de $489.990. Son diez. Revisar en `Evaluacion/Evaluacion 2/INFORME 2.md`.

### 3.6 El argumento emocional

El riesgo que enfrenta el pequeño productor no es equivocarse en una medición: es comprometer el ingreso de una temporada completa por una decisión de riego o de fertilización tomada a ciegas. Siembra, floración y cosecha son instancias donde una mala decisión —o una acción preventiva que no se tomó— arrastra todo el trabajo del ciclo.

Esa asimetría, en que **el costo de errar es incomparablemente mayor que el costo de medir**, es la razón económica por la cual el valor emocional no es adorno publicitario sino consecuencia directa del cálculo. Es el argumento que hay que sostener así, y no como un eslogan sobre tranquilidad.

---

## 4. Criterio 2 — Misión, visión y objetivos estratégicos

**Pendiente.** Material disponible para redactarlos: la tesis central del proyecto (convertir mediciones rápidas de terreno en información comprensible y acciones agronómicas concretas), el horizonte de evaluación de diez años (2027–2036) y la trayectoria de ventas del modelo.

Lo que la rúbrica exige para el nivel Excelente: misión, visión y objetivos **coherentes, realistas y alineados al proyecto**. Los objetivos estratégicos deben poder medirse contra las cifras del modelo financiero, no ser declaraciones de intención.

---

## 5. Criterio 3 — Ventaja competitiva sostenible

La rúbrica pide ventaja competitiva **sostenible**, y esa palabra es la que descarta la paridad: una ventaja que la competencia ya tiene no es sostenible, es inexistente.

| Diferencia | Por qué es sostenible |
| :--- | :--- |
| Interpretación por etapa fenológica y especie | Exige un motor agronómico con umbrales por especie y etapa; no se replica comprando el mismo sensor |
| Orientación de manejo como salida | Exige criterio agronómico documentado, no capacidad de medición |
| Diez variables de una sola inserción | Decisión de arquitectura del instrumento: siete del suelo y tres del ambiente en el mismo ciclo de captura |
| Catálogo de cultivos sobre estadística agrícola chilena | Construido sobre fuentes nacionales (INE, ODEPA, CIREN, SAG, INFOR); un equipo importado no incorpora el cultivo local ni su nomenclatura |

Las dos primeras se sostienen en software propio y criterio agronómico trazable, que es exactamente lo que un competidor de hardware no puede copiar comprando el mismo componente. Fuentes de verdad en el repositorio: `App/src/engine/agronomyEngine.ts`, `stageEvaluator.ts` y `contextualAdvice.ts`.

---

## 6. Criterio 4 — Canales de comercialización

Confirmado por el equipo:

| Canal | Función | Observación |
| :--- | :--- | :--- |
| Página web propia con venta en línea | **Canal de transacción** principal | El modelo ya carga una comisión del 5 % sobre el precio bruto por este canal |
| Redes sociales (video y contenido breve) | Descubrimiento y demostración | No publicidad genérica: demostración del producto haciendo lo único que la competencia no hace |
| WhatsApp y correo | Atención preventa y posventa | Atención personalizada, que es parte de la relación con el cliente |
| Asesores agronómicos | **Canal de confianza** y multiplicación | Ver criterio 5: hoy no existe esta red |

El presupuesto de pauta publicitaria está modelado en **$30.000 por equipo vendido**, lo que para los 200 equipos del primer año son $6.000.000.

**Advertencia para la redacción:** presentar el ecommerce como el canal que genera la primera venta es el punto más débil del plan. El agricultor que pone medio millón en un instrumento no compra por un video; compra porque alguien en quien confía le dijo que sirve. El informe debe declarar el ecommerce como canal de transacción y el asesor como canal de confianza, no confundirlos.

---

## 7. Criterio 5 — Estrategia Go To Market

### 7.1 El problema que la estrategia tiene que resolver

El modelo supone **200 equipos en 2027**: unas 17 ventas al mes, de un instrumento de $489.990, a un mercado que no conoce la marca. El ejercicio 2027 cierra con una pérdida de $714.556 y el 2028 también cierra en pérdida, financiadas por el capital de trabajo. No hay holgura para que la venta arranque lenta.

### 7.2 La palanca: el asesor agronómico como multiplicador

El asesor no es solo un comprador del segmento: un asesor que adopta el equipo lo usa frente a veinte agricultores, y cada visita suya es una demostración que no cuesta pauta. Es el camino más corto a los primeros 200 equipos.

**Confirmado por el equipo: esa red no existe hoy y hay que construirla de cero.** El informe lo declara así, porque un plan que supone una red que no existe es el primero que se cae en la defensa oral.

Vías de construcción de la red, **a verificar con fuente antes de citarlas en APA 7**:

- Colegio de Ingenieros Agrónomos de Chile, como registro de profesionales.
- Operadores de los programas PRODESAL y SAT de INDAP, que son los técnicos que atienden al pequeño productor.
- Facultades de agronomía y sus unidades de extensión.
- Ferias del sector, del tipo Expo Chile Agrícola.

### 7.3 El contenido digital, con el rol correcto

El video no es publicidad de marca: es la demostración de la diferencia. Insertar la sonda, y que la aplicación devuelva un plan de acción para esa especie en esa etapa. Son las diferencias 1 y 2 demostradas en quince segundos, y es contenido que el asesor reenvía a sus propios clientes.

### 7.4 Los cuatro componentes que la rúbrica exige

| Componente | Definición |
| :--- | :--- |
| Segmento de entrada | Asesores agronómicos y, a través de ellos, pequeños y medianos agricultores adultos jóvenes |
| Propuesta | Orientación de manejo por etapa y especie, no el dato crudo |
| Canal | Asesor como confianza, ecommerce como transacción, redes como demostración |
| Precio | $489.990 con IVA, derivado del costo y no fijado por posicionamiento |

---

## 8. Criterio 6 — Plan de ventas e implementación

La rúbrica exige, para el nivel Excelente: objetivos SMART, acciones, **responsables**, cronograma e indicadores. Los responsables requieren decisión del equipo y están pendientes.

### 8.1 Fase 0 — Construcción de la red (antes de la primera venta)

Tiene tiempo y costo propios, porque la red no existe. Debe aparecer en el cronograma antes del primer equipo vendido.

### 8.2 Objetivos SMART, esqueleto con las cifras del modelo

| Objetivo | Cifra del modelo | Indicador |
| :--- | :--- | :--- |
| Volumen del primer año | 200 equipos en 2027 | equipos vendidos por mes contra la meta de 17 |
| Volumen del segundo año | 350 equipos en 2028 | crecimiento del 75 % sobre 2027 |
| Pauta publicitaria | $30.000 por equipo | costo de adquisición real contra el modelado |
| Red de asesores | por definir | asesores activos y ventas atribuidas a cada uno |
| Caja | caja mínima del horizonte de $17.841.874 | caja mensual contra el mínimo |

### 8.3 Indicadores de la operación comercial

Conversión del sitio, ventas atribuidas por asesor, costo de adquisición por cliente, devoluciones contra la provisión de garantía (5 % de la BOM) y tiempo de respuesta de la atención por WhatsApp y correo.

---

## 9. Criterio 7 — Gestión de ventas y negociación

**Pendiente.** Lo que la rúbrica pide: herramientas de gestión, indicadores comerciales y estrategias de negociación **aplicables al proyecto**, no teoría general.

Materia prima disponible: los indicadores de 8.3; la estructura de precios, que fija el piso de negociación en el margen exigido del 30 %; y la relación con el asesor, que es el caso de negociación más concreto del proyecto, porque hay que acordar con él qué gana por recomendar el equipo.

---

## 10. Criterio 9 — Evolución del modelo de negocio

El criterio no premia un canvas bonito: premia que el modelo **evolucionó** y que el cambio está justificado. Lo que puntúa es el texto entre los dos canvas.

### 10.1 BMC1 — El modelo del arranque

| Bloque | Contenido del BMC1 |
| :--- | :--- |
| Propuesta de valor | Medidor portátil que entrega diez variables, con mapa predial y aplicación propia |
| Segmento de clientes | Agricultores, sin distinción fina de tamaño ni de perfil *(a confirmar)* |
| Canales | Venta directa, sin definición de canal de confianza *(a confirmar)* |
| Relación con clientes | Atención por mensajería y guía de uso |
| Fuentes de ingreso | Venta del equipo a **$349.990**, precio fijado antes de conocer el costo |
| Recursos clave | Cartografía predial y extensión geoespacial de la base de datos |
| Actividades clave | Desarrollo del mapa y de las geometrías prediales |
| Socios clave | Proveedores sin segunda fuente; instrumentos públicos (FOGAPE, Capital Semilla, Semilla Inicia) como parte del financiamiento |
| Estructura de costos | Sin construcción de abajo hacia arriba desde la lista de materiales |

### 10.2 Oportunidades de mejora detectadas

| N° | Qué se detectó | Con qué evidencia |
| :--- | :--- | :--- |
| 1 | El precio no venía del costo | Evaluado a $349.990, el proyecto arroja VAN (Valor Actual Neto) negativo |
| 2 | El mapa predial consumía desarrollo sin cambiar ninguna decisión del agricultor | Exigía extensión geoespacial, dibujo de perímetros y cartografía sin conexión; lo que el agricultor necesita es el punto medido antes y después de fertilizar |
| 3 | La propuesta de valor, tal como estaba escrita, era paridad | Portátil, con aplicación, con enlace inalámbrico y georreferenciado: Bluelab Pulse y FieldScout ya lo ofrecen |
| 4 | El financiamiento dependía de instrumentos cuya obtención no es segura | FOGAPE y Capital Semilla son concursables: no se pueden suponer obtenidos en el caso base |
| 5 | Los proveedores no tenían reemplazo identificado | Un distribuidor o fabricante caído detenía la producción |

### 10.3 BMC2 — El modelo corregido

| Bloque | Contenido del BMC2 |
| :--- | :--- |
| Propuesta de valor | Orientación de manejo según etapa fenológica y especie, a partir de diez variables de una sola inserción; el dato es insumo, no producto |
| Segmento de clientes | Pequeños y medianos agricultores, con énfasis en adulto joven de nivel medio, y asesores agronómicos como comprador y multiplicador |
| Canales | Asesor agronómico como canal de confianza; página web propia como canal de transacción; redes sociales como demostración; WhatsApp y correo para preventa y posventa |
| Relación con clientes | Atención personalizada, guía de uso dentro de la aplicación y tutoriales en video |
| Fuentes de ingreso | Venta del equipo a **$489.990** con IVA, derivado del costo con 30 % de utilidad exigida; crédito bancario como financiamiento, no como ingreso |
| Recursos clave | Motor agronómico y catálogo de cultivos sobre estadística nacional; firmware y aplicación propios; plataforma de nube y base de datos; capital humano y conocimiento del dominio |
| Actividades clave | Desarrollo continuo de hardware, firmware y software; importación de insumos; ensamblaje; certificaciones; comercialización y marketing; soporte posventa |
| Socios clave | LCSC con DigiKey como segunda fuente; JLCPCB con PCBWay como alternativa; Supabase con migración posible a otro proveedor; proveedor de la sonda, que es la dependencia crítica |
| Estructura de costos | Variables: lista de materiales de $93.751 por equipo, más merma del 3 %, garantía del 5 %, envío de $6.000 y comisión del 5 % sobre el bruto. Fijos: dotación, arriendo, servicios, patente, plataformas de nube y pauta publicitaria |

### 10.4 Los cambios y su justificación técnica

Esto es lo que la rúbrica lee con más atención.

| Cambio | De | A | Por qué |
| :--- | :--- | :--- | :--- |
| Precio | $349.990 fijado como techo comercial | $489.990 derivado del costo | A $349.990 el VAN es negativo. El precio se deriva exigiendo 30 % de utilidad sobre el costo total, da $489.784 y se redondea **al alza** a la terminación comercial de $990. El redondeo es siempre hacia arriba, así el margen supera al exigido y nunca queda por debajo. Fijar el precio antes de conocer el costo es el error metodológico que el estudio corrige |
| Función de mapa | Mapa predial con geometrías | Historial georreferenciado por punto | El mapa no era imposible: era costoso de desarrollar y mantener para algo que no cambiaba ninguna decisión de riego o fertilización. La medición **sigue georreferenciada** —latitud, longitud y exactitud del GPS se conservan y se muestran como texto—, así que es una decisión de alcance, no una carencia. El esfuerzo se redirigió al motor agronómico, que es la diferencia real |
| Propuesta de valor | Diez variables | Interpretación por etapa y especie | Mismo hardware, promesa distinta. Las diez variables siguen siendo diferencia, pero por sí solas no justifican el precio frente a un portátil: lo que lo justifica es que el sistema termine en una orientación de manejo |
| Financiamiento | Instrumentos públicos en el plan | Crédito por el 100 % de la inversión inicial más pie de $9.000.000 | Los instrumentos se evalúan y quedan fuera del caso base porque su obtención no es segura, no porque el proyecto no califique. Así el caso base no depende de un resultado concursable |
| Socios clave | Proveedor por componente | Segunda fuente declarada componente por componente | Está anotado en `finanzas/supuestos.json`, no es una promesa. La sonda es la excepción: es el elemento sensor, define las siete variables de suelo y cualquier reemplazo obliga a repetir la validación contra laboratorio. Esa dependencia se declara, no se esconde |

### 10.5 Figuras

Los dos canvas van como figuras generadas, al estilo de `Comercializacion de Tecnologias/Unidad 2/Figuras/`. Pendiente de la fase 4.

---

## 11. Pendientes

**Requieren decisión del equipo:**

- Misión, visión y objetivos estratégicos (criterio 2).
- Responsables de cada acción del plan de ventas (criterio 6).
- Qué gana el asesor agronómico por recomendar el equipo (criterio 7).
- Meta numérica de asesores activos para el primer año.
- Confirmar los bloques del BMC1 marcados «a confirmar».

**Requieren verificación con fuente para APA 7:**

- Costo del análisis de laboratorio en Chile.
- Colegio de Ingenieros Agrónomos, programas PRODESAL y SAT de INDAP, ferias del sector.
- Precios y especificaciones de la competencia (Hanna, Bluelab, FieldScout), que ya están citados en el informe 2 y deben reutilizar la misma fuente.

**Corrección pendiente en otro documento:**

- `Evaluacion/Evaluacion 2/INFORME 2.md`: «nueve muestras» debería ser diez.
