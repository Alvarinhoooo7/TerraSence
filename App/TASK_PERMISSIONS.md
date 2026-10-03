<a id="plan-de-implementación-permisos-del-teléfono"></a>

# Plan de trabajo: entrada de la app, permisos e integración con firmware

## 1. Cómo leer este plan

Este documento coordina el trabajo pendiente para preparar pruebas de la app y del equipo. **Hay implementación de código pendiente**, además de configuración externa y ensayos físicos. Las casillas sólo se cierran con la evidencia indicada; compilar no equivale a validar en un teléfono o una sonda.

| Tipo | Contenido | Dónde se detalla |
| --- | --- | --- |
| APP | Navegación, pantalla legal, consentimiento y ajustes de integración | Sección 3 |
| FW | Implementación del ESP32 y contrato con la app | Sección 4 y [plan del firmware](../Firmware/PLAN.md) |
| EXT | Credenciales, servicios y distribución de compilaciones | Sección 5 |
| QA | Verificación de código y revisión visual en computador | Sección 6 |
| FIS | Recorridos en teléfonos, sensores y placa reales | Sección 7 |

Los identificadores D01–D17 y P7 anteriores se conservan como referencias en las tareas correspondientes. Una tarea mixta se divide: por ejemplo, D05 tiene configuración EXT y recepción FIS; D12 tiene implementación FW y ensayo FIS. No se marca todo el identificador como terminado al completar sólo una parte.

El plan de implementación se registra aquí; el código de la pantalla nueva y los drivers aún no está implementado. Se conserva el trabajo vigente de [Firmware/TASK.md](../Firmware/TASK.md), sin duplicar sus constantes ni su mapa de pines.

## 2. Flujo previsto y orden de ejecución

### Entrada de una instalación nueva

**Loading → Idioma → Términos y privacidad → Bienvenida → Auth → confirmación de correo, si corresponde → explicación de permisos → vinculación/aprobación → app.**

Bienvenida se conserva porque este cambio mueve la aceptación legal, no elimina el carrusel. La pantalla legal usa el idioma elegido. Aceptar permite continuar; no crea la cuenta, no envía datos por sí solo y no concede permisos del teléfono. La cuenta se solicita desde «Crear cuenta» en Auth.

| Situación | Comportamiento previsto |
| --- | --- |
| Primera entrada sin sesión | Idioma, pantalla legal completa y luego Bienvenida/Auth. |
| Cancelar o volver desde términos | En la entrada inicial, volver a Idioma; si se abrió desde un registro posterior, volver a ese formulario. Descartar aceptación incompleta, sin solicitar registro. |
| Inicio de sesión existente | Mantener el acceso habitual y no sobrescribir su aceptación registrada con una marca local. En una instalación nueva se conserva el recorrido inicial anterior. |
| Sesión ya iniciada al actualizar | Continuar por las barreras existentes; no forzar un nuevo registro ni desloguear. |
| Recuperación por código/enlace | Conservar su prioridad tras loading; la pantalla legal no debe bloquearla. |
| Nuevo registro posterior en el mismo teléfono | Exigir aceptación propia del nuevo intento mediante la misma pantalla completa; no reutilizar la del usuario anterior. |
| Cambio de idioma durante el intento | Volver a presentar el texto en el idioma elegido con lectura y casillas reiniciadas. |
| Fallo de red al crear cuenta | Conservar aceptación del mismo intento para reintentar sin repetir toda la lectura. |
| Reinicio de la app antes de crear cuenta | Descartar la aceptación temporal; al intentar registrarse se vuelve a la pantalla legal. No persistir contraseñas. |

### Hitos

| Hito | Qué debe estar listo | Qué puede seguir pendiente |
| --- | --- | --- |
| H-A: app preparada para pruebas | APP-01 a APP-04, QA-01 y QA-02; compilación nativa instalable | Sonda, calibración, push real y OTA |
| H-M: medición preparada para banco | FW-01 a FW-04, APP-05 y QA-03 | Calibración y resultados físicos aún se registran como pendientes |
| H-O: actualización preparada para banco | FW-06, APP-06 y QA-04 | Cortes reales, retorno de versión y pruebas Android/iOS |
| H-F: conjunto validado físicamente | Recorridos FIS correspondientes con plataforma, versión y resultado | Publicación en tiendas se gestiona por separado |

Orden: **APP-01 → APP-02 → APP-03 → APP-04 → QA de app**, luego **FW-01 → FW-02 → FW-03/FW-04 → APP-05 → QA de medición → banco**. Reposo profundo y OTA siguen después de estabilizar la medición. La decisión de particiones se adelanta a FW-01 antes de distribuir placas. Las credenciales push se preparan aparte y no bloquean la adquisición BLE.

## 3. APP — Implementación de la app

### APP-01. Estado de entrada y aceptación temporal

**Dependencias:** ninguna. **Archivos previstos:** `src/utils/authFlow.ts`, `src/utils/registrationConsent.ts`, controlador de entrada y sus pruebas.

- [ ] Añadir una ruta legal explícita y separar presentación inicial de aceptación utilizable para crear una cuenta. Una marca de idioma o Bienvenida nunca acredita consentimiento.
- [ ] Mantener un borrador de aceptación en memoria para un único intento, con versión, idioma y fecha de la acción real; no regenerar la fecha al reenviar ni compartir el borrador entre cuentas.
- [ ] Definir retorno desde la pantalla legal, prioridad de recuperación, carga de estado y actualización de instalaciones anteriores sin saltos visibles ni bucles.

**Aceptación:** la tabla de la sección 2 se expresa en pruebas de rutas; recuperación y sesión existente conservan su funcionamiento. El registro sin aceptación vigente se deriva a la pantalla legal y no llama a `signUp`.

### APP-02. Pantalla completa de términos y privacidad

**Dependencias:** APP-01. **Archivos previstos:** `src/screens/TermsScreen.tsx` (nuevo), `src/components/entry/EntryUI.tsx`, componente de contenido legal y pruebas de interacción.

- [ ] Reemplazar la presentación en hoja/modal por una pantalla completa con encabezado «Términos y privacidad», acción Volver y texto introductorio breve; usar `legalSections` como única fuente del contenido.
- [ ] Conservar lectura hasta el final, ayuda «Leer hasta el final», dos casillas independientes sin premarcar y botón «Aceptar y continuar» habilitado sólo con lectura completa y ambas aceptaciones.
- [ ] Implementar estados inicial, leyendo, leído, aceptación parcial, listo y transición en curso; impedir doble toque y limpiar temporizadores al salir.

**Especificación visual:**

- Usar `useAppTheme`, tipografía y controles de entrada existentes, con el verde del tema para la acción principal. Fondo de pantalla coherente con Idioma y Bienvenida.
- Contenido alineado a la izquierda, ancho máximo del sistema de entrada y márgenes laterales de 24; títulos de sección diferenciados y texto base de 16 con interlineado de 24, respetando escala de fuente.
- Un solo desplazamiento vertical para el documento y las casillas. `EntryLayout` ya incluye un `ScrollView`: extenderlo o reutilizar sus piezas sin anidar otro desplazamiento que altere la detección del final.
- Pie de acción fuera del texto desplazable, respetando área segura. En alturas reducidas o texto grande permitir adaptación sin ocultar documento, casillas o botón.
- Controles táctiles de al menos 48, casillas con rol/estado accesible y encabezados navegables. La ayuda de desplazamiento nunca marca las casillas; respeta movimiento reducido y se interrumpe al tocar el documento.
- Evitar ilustraciones que resten espacio al documento. El foco visual está en el texto y en la decisión de continuar.

**Aceptación:** documento completo disponible en español/inglés y claro/oscuro; ninguna aceptación por el mero hecho de abrir, desplazarse o volver. Cuando todo el texto cabe, medir dimensiones válidas antes de habilitar casillas.

### APP-03. Integrar la pantalla y retirar el modal de Auth

**Dependencias:** APP-01 y APP-02. **Archivos previstos:** `App.tsx`, `src/screens/AuthScreen.tsx`, `src/utils/accessRegistration.ts`, componente modal actual y pruebas de registro.

- [ ] Insertar términos después de Idioma y antes de Bienvenida; incorporar la ruta a la visibilidad de navegación, selector de idioma, botón Atrás de Android y transiciones.
- [ ] Retirar `showConsent` y el montaje de `RegistrationConsentModal` de Auth cuando la pantalla nueva lo sustituya. El botón de envío pasa a «Crear cuenta»; si falta aceptación se navega a la pantalla completa, nunca se abre otra hoja.
- [ ] Entregar el consentimiento al envío de registro por un contrato explícito, conservar `registration_consent` y las protecciones contra envíos simultáneos; cancelar un registro iniciado o cambiar desde él a inicio de sesión/recuperación descarta el intento. Llegar por primera vez a Auth en su modo inicial no consume la aceptación previa: debe estar disponible para elegir Crear cuenta. El nombre/correo inicial se asocia al borrador al completar identidad; si después cambia esa identidad, invalidar el consentimiento y pedirlo nuevamente en la pantalla dedicada.

**Aceptación:** crear cuenta sigue enviando las dos aceptaciones, versiones, idioma y fecha correctos. Éxito, cuenta ya existente y abandono consumen o descartan el borrador; reintento por red del mismo intento lo conserva. Un fallo no deja el botón bloqueado. Contraseñas sólo en memoria y nunca en almacenamiento o logs.

### APP-04. Coherencia de texto, acceso legal y regresiones

**Dependencias:** APP-03. **Archivos previstos:** `src/utils/legalSections.ts`, `src/utils/registrationConsent.ts`, `src/screens/SettingsDetails.tsx`, documentación de entrada y pruebas.

- [ ] Conservar la consulta legal desde Ajustes y su fuente única, sin convertir la consulta en aceptación ni mantener una segunda copia del texto.
- [ ] Revisar los textos que hoy suponen que la cuenta se crea al aceptar el modal. Adaptar sólo lo necesario para el nuevo momento del flujo; si cambia el texto legal presentado, actualizar su versión y referencias de privacidad. No cambiar la versión sólo por colores o distribución.
- [ ] Verificar registro por pasos, inicio de sesión, correo sin confirmar, reenvío, recuperación, cambio de idioma y retorno al formulario con el nuevo estado.

**Aceptación:** no queda un modal legal en Auth ni llamadas automáticas a creación de cuenta al aceptar la nueva pantalla. La versión enviada corresponde al texto leído. El registro en `user_metadata` conserva su alcance actual; no se describe como auditoría inmutable.

### APP-05. Preparar la recepción de mediciones reales — D12, A1 de firmware

**Dependencias:** mapa y escalas confirmados en FW-02; pruebas del contrato de FW-01.

- [ ] Validar humedad y pH, además de los rangos del modelo adquirido que correspondan, en `probeService.ts`; cubrir extremos y rechazo, sin recortar datos inválidos.
- [ ] Probar muestras binarias producidas por el empaquetador C++ real, ausencia de suelo/ambiente, batería y desconexión; mantener el contrato de 20 bytes.
- [ ] Coordinar el tiempo total de lectura con el driver y verificar que cancelar o cambiar de cuenta no guarde una respuesta tardía. Completar una prueba de captura, guardado local y posterior sincronización.

**Aceptación:** medición real válida se conserva con sus unidades; trama inválida no produce guardado ni datos simulados. El ensayo con sonda queda en FIS-04, aunque las pruebas automatizadas pasen.

### APP-06. Instalación de firmware desde la app — D15

**Dependencias:** protocolo y receptor FW-06; detalle compartido en [Firmware/PLAN.md](../Firmware/PLAN.md) y [Web/TAREAS.md](../Web/TAREAS.md).

- [ ] Implementar consulta pendiente, Actualizar/Cancelar/Postergar para quien corresponda, descarga y comprobación de tamaño/hash; diferenciar descarga de transferencia BLE.
- [ ] Enviar con control de secuencia y acuses, mostrar progreso confirmado por el equipo, tratar desconexión/cancelación y coordinar exclusión con medición.
- [ ] Confirmar instalación sólo al reconectar y leer la versión; informar resultado al backend sin declarar éxito al terminar de enviar bytes. No activar push de firmware durante esta implementación: cualquier ampliación de los cuatro eventos vigentes requiere decisión explícita.

**Aceptación:** casos de éxito, binario incorrecto, pérdida de conexión y reinicio cubiertos en pruebas de protocolo; transferencia física queda en FIS-06. La pantalla actual que consulta versiones no acredita que esto esté implementado.

## 4. FW — Implementación del firmware

El detalle técnico y los criterios por tarea viven en [Firmware/PLAN.md](../Firmware/PLAN.md). Este índice vincula el trabajo necesario para las pruebas de la app; las casillas se actualizan con referencia a esa evidencia.

| ID | Trabajo de código | Dependencias y condición de cierre |
| --- | --- | --- |
| FW-01 | P0/P1: compilación reproducible, decisión de particiones y pruebas C++ de la trama (F7) | Localizar herramientas; compilar y contrastar vectores con App. La flash y carga se confirman en banco. |
| FW-02 | P2: transporte UART/RS-485, CRC, errores y tiempos acotados (F1) | Confirmar ficha del modelo antes de habilitar mapa, escalas y temporización. Transporte genérico sí puede desarrollarse antes. |
| FW-03 | P3: adquisición nueva por suscripción, alimentación, conversión y notificación (F1) | FW-01/02; cancelar al desconectar y apagar alimentación en todas las salidas. Sin muestras de relleno. |
| FW-04 | P4/P5: batería válida, integración BME280 y rangos (F2/F3/A1) | Resolver ausencia de batería sin convertirla en 100 %; pruebas de lógica. Calibración física separada. |
| FW-05 | P6: reposo profundo y despertar (F4) | Medición estabilizada; conservar PAIR y reconexiones del flujo de vinculación. Medir consumo en FIS. |
| FW-06 | P7/O1–O4: receptor OTA, integridad, protocolo completo y recuperación (F8) | Cerrar MTU, secuencias, particiones y comprobar soporte real de rollback. Coordinar APP-06. |
| FW-07 | P8: protección BLE y autorización de actualización (F6) | Compatible con varios usuarios y revinculación; mantener explícito el límite aceptado de registro por ID. |

- [ ] FW-01 completado y verificado en computador.
- [ ] FW-02 completado; mapa del proveedor identificado.
- [ ] FW-03 integrado y compilado.
- [ ] FW-04 integrado; calibración pendiente identificada en FIS-04.
- [ ] FW-05 implementado; consumo pendiente identificado en FIS-05.
- [ ] FW-06 implementado y probado con cliente de prueba antes de integrarlo con la app.
- [ ] FW-07 revisado y aplicado para el alcance de distribución.

**Bloqueo concreto:** se necesita marca/modelo y manual de registros de la sonda; también confirmar disponibilidad de placa, sensores y herramientas de banco. No cerrar adquisición real suponiendo que cualquier sonda 7-en-1 responde a la consulta documentada.

## 5. EXT — Configuración externa y publicación

Estas tareas no equivalen a desarrollar una pantalla ni se cierran con pruebas unitarias.

- [ ] **EXT-01 / D05:** comprobar o cargar credenciales FCM V1 y APNs del proyecto EAS. Los archivos Firebase locales no prueban que las credenciales de envío funcionen. Configurar Android primero si sólo hay teléfono Android disponible.
- [ ] **EXT-02 / D05, opcional:** sólo si se activa «Enhanced Security for Push Notifications» en Expo, crear y cargar `EXPO_ACCESS_TOKEN` en Supabase. Sin esa opción activa, el despachador admite funcionar sin token.
- [ ] **EXT-03 / D03:** elegir e implementar panel o alertas para `push_dispatch_health()`; verificar señales de fallo sin confundir respuesta HTTP 200 con recepción en un teléfono.
- [ ] **EXT-04 / D06:** preparar compilación iOS y distribución en TestFlight; separar preparación de binario del ensayo de Bluetooth en iPhone. Android requiere una compilación con el módulo BLE nativo; Expo Go no sustituye ese ensayo.
- [ ] **EXT-05 / D08, D17:** preparar declaraciones de privacidad coherentes con el texto legal vigente y revisar identificadores, iconos, splash, manifest/plist y Firebase del binario de publicación. Consultar [PLAN_VALIDACION](../docs/PLAN_VALIDACION.md).
- [ ] **EXT-06 / D09:** verificar configuración de correo y límites del proyecto usado en pruebas; envío, recepción y códigos reales se ensayan en FIS-02.

Las postergaciones anteriores de D05/D06 no se interpretan como tareas terminadas. Las credenciales y el acceso a cuentas externas se comprueban cuando están disponibles; su ausencia no impide implementar APP ni el transporte del firmware.

## 6. QA — Verificación en computador

### QA-01. Lógica de navegación y consentimiento

- [ ] Probar rutas nuevas con instalación limpia, instalación anterior, sesión existente, recuperación y cambio de cuenta.
- [ ] Cubrir lectura/casillas, idioma, versión, cancelación, reinicio, doble toque, identidad modificada y reintento por red. Verificar el payload real de `signUp` mediante dobles del servicio, no sólo utilidades aisladas.
- [ ] Ejecutar `npm test` y `npm run type-check` desde App. Si el entorno bloquea procesos, registrar esa limitación y completar la ejecución en uno compatible antes de declarar el hito listo.

### QA-02. Pantalla renderizada y flujo de entrada

- [ ] Inspeccionar Idioma → Términos → Bienvenida → Auth en 360 × 640 y 375 × 667, claro/oscuro, español/inglés y texto grande. Comprobar alturas, pie, casillas y un único desplazamiento.
- [ ] Probar interacciones reales en el renderizador disponible: llegar al final, desmarcar, volver, cambiar idioma y abrir el teclado en Auth. Revisar foco y nombres accesibles.
- [ ] Comprobar estados visuales de la bandeja de avisos (D10) que puedan renderizarse sin hardware. Las notificaciones nativas, TalkBack/VoiceOver y arranque desde push quedan en FIS.

Una vista web o un emulador ayudan a revisar diseño; no prueban BLE, push ni permisos nativos de un teléfono real.

### QA-03. Contrato y firmware

- [ ] Compilar con el núcleo indicado en Firmware y ejecutar pruebas C++ del empaquetador y Modbus; revisar tamaño de binario y partición.
- [ ] Ejecutar pruebas de recepción de App, centinelas, unidades, rangos y guardado sin conexión tras APP-05.
- [ ] Registrar qué casos usan vectores de prueba y cuáles capturas reales. No describir un vector construido como medición del sensor.

### QA-04. OTA e infraestructura afectada

- [ ] Probar secuencias, acuses, límites, cancelación y binarios incorrectos en firmware y app; luego FIS-06.
- [ ] Si se modifica backend push, ejecutar `node --test supabase/functions/send-push-alert/dispatch.test.mjs` y las comprobaciones SQL pertinentes. Si cambia Web, ejecutar sus pruebas y comprobación de tipos.
- [ ] Ejecutar `python docs/verificar_documentacion.py` al actualizar documentación; actualizar los planes con evidencia y bloqueos reales.

<a id="d01-cierre-de-sesión-entre-teléfonos"></a>
<a id="d09-auth-y-correo-reales"></a>

## 7. FIS — Pruebas físicas y revisión experta

**Todas pendientes.** Registrar plataforma, versión de SO, compilación de app/firmware, equipo usado, resultado esperado/obtenido y bloqueo en los documentos existentes de validación; no crear registros fechados nuevos. Se puede probar H-A mientras se prepara H-M.

| ID | Ensayo | Requisitos |
| --- | --- | --- |
| FIS-01 / P7 | Flujo legal nuevo, Atrás, reinstalación/actualización, teclado, autorrelleno, temas, idiomas, texto grande, movimiento reducido, TalkBack/VoiceOver | APP-01–04, QA de app y teléfono; Android compacto/Motorola G55 e iPhone compacto |
| FIS-02 / D01, D09 | Registro, confirmación, reenvío, código incorrecto/vencido, límites, recuperación, correo de cambio de contraseña y cierre global entre dos teléfonos; red caída, reinicio y aviso tardío | Compilación nativa, correo real, dos teléfonos y cuentas de prueba |
| FIS-03 / D05, D10 | Cuatro eventos de acceso: ticket, receipt, recepción y apertura; primer plano, segundo plano, app cerrada, otra cuenta, bandeja vacía/sin red/paginada y accesibilidad | EXT-01; dos cuentas y teléfonos. Probar preferencia apagada y permiso revocado |
| FIS-04 / D07, D11, D12 | PAIR, ID persistente, registrar/revincular, cancelar BLE, suelo real, BME280 contra referencia, batería contra multímetro, aviso bajo y recuperación, rangos y guardado | FW-01–04, APP-05, placa y sensores. Resolver H1/H2/F5 de Firmware antes de los ensayos eléctricos correspondientes |
| FIS-05 / D06, D13, D14, P7 | Bluetooth en iPhone/Android anterior y posterior a 12; ubicación aproximada, ausente o revocada con pantalla abierta; clima real y zona horaria; QR/código, modo avión, reset durante sincronización y pérdida de membresía; sueño/despertar y consumo | Permisos y cola actuales; FW-05 para consumo; varios teléfonos, sonda y conectividad controlada |
| FIS-06 / D15 | OTA completa, hash incorrecto, interrupción, corte de alimentación, fallo de arranque, versión confirmada y nueva medición posterior | FW-06/07, APP-06, particiones y recuperación USB comprobadas |
| FIS-07 / D17 | Instalar y probar el binario final de distribución, splash y actualización de versión anterior | EXT-04/05 y compilación de distribución |
| EXP-01 / D13 | Auditoría agronómica de umbrales y recomendaciones | Revisión experta; no se cierra por compilación o comparación del sensor |

**D16 → condicionado y fuera del recorrido actual:** proveedor de recomendación remota, sólo si se decide habilitarlo. No bloquea H-A ni H-M y no se implementa por defecto.

### Criterio de cierre

- **Listo para probar** significa código implementado, comprobaciones pertinentes aprobadas y binario instalable disponible; los bloqueos de hardware/credenciales se identifican por ensayo.
- **Validado en dispositivo** requiere los resultados físicos correspondientes. No trasladar casillas QA a FIS automáticamente.
- **Listo para distribuir** exige además particiones, recuperación de firmware, seguridad y revisión del binario de publicación. La calibración y los ensayos del conjunto siguen siendo necesarios.

## 8. Evidencia anterior: referencia, no cierre de las tareas nuevas

| Comprobación | Resultado |
| --- | --- |
| App: `npm test` · `npm run type-check` · introspección nativa | 239 aprobadas · sin errores · permisos conformes |
| Web: `npm test` · `npm run type-check` | 8 aprobadas · sin errores |
| Despachador: `node --test supabase/functions/send-push-alert/dispatch.test.mjs` | 29 aprobadas |
| `supabase db reset` (réplica local con Docker) | Reconstruye la línea base y las 4 migraciones posteriores sin errores |
| [test_notificaciones.sql](../supabase/scripts/test_notificaciones.sql) | Correcto, con rollback |
| [test_recuperacion_auth.mjs](../supabase/scripts/test_recuperacion_auth.mjs) | Correcto: cierre global, cierre local y otra cuenta intacta |
| [test_concurrencia_push.sh](../supabase/scripts/test_concurrencia_push.sh), también con `ESPERA_REAL_LEASE=1` | Correcto, incluido el cierre global con envíos en vuelo; base limpia |
| `npm run test:supabase-onboarding` contra la réplica local (con `supabase functions serve`) | Correcto |
| `python docs/verificar_documentacion.py` | 0 errores |
| Producción: migraciones | Las 5 aplicadas; no hace falta una migración nueva |
| Producción: Edge Functions y cron | Las 6 funciones activas; `terrasense-push-dispatch` responde 200 cada minuto con Vault cargado |
| Proyecto EAS | `@alvarinhoo2001/terrasense` (`ac4799ff-9c98-4037-832f-0e62e0cfbe64`), fijado en `app.config.js` |
| Teléfonos, sonda, correo real, FCM/APNs | No comprobados: ver abajo |

## 9. Decisiones que no se reabren

- Push sólo para los cuatro eventos de acceso (`access_request`, `access_approved`,
  `access_rejected`, `admin_transferred`), categoría `device`. Retirados: push por medición
  crítica (propia o ajena), recordatorio de medir, alertas meteorológicas y preferencias de
  avisos agronómicos, clima o sincronización.
- El diagnóstico dentro de la lectura se conserva; el pronóstico al medir sólo se consulta si
  la persona incluye ubicación.
- Sin push de firmware mientras no exista instalación funcional por BLE.
- Reset sólo desde el backoffice; revincular por Bluetooth y ventana PAIR.
- Mapas, perímetros y PostGIS retirados; se conservan `latitude`, `longitude` y `gps_accuracy_m`.
- Los permisos se piden desde cada función, nunca todos al entrar. El salto de vinculación
  existe sólo como gesto de desarrollo (`__DEV__`).
- El firmware no inventa lecturas; la demo de la app se identifica y no se guarda como medición.
- Cierre y borrado de cuenta fuera del alcance actual. No se migra a otro proveedor push.
- El pronóstico usa la API gratuita de Open-Meteo, por decisión del usuario; no se contrata
  plan pagado ni se cambia de proveedor.
