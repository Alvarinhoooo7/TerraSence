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

La pantalla de términos (APP-01 a APP-04), la validación de rangos en la recepción (APP-05) y el driver Modbus del firmware ya están en el código; lo que sigue abierto se marca en cada tarea. Se conserva el trabajo vigente de [Firmware/TASK.md](../Firmware/TASK.md), sin duplicar sus constantes ni su mapa de pines.

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

- [x] Añadir una ruta legal explícita y separar presentación inicial de aceptación utilizable para crear una cuenta. Una marca de idioma o Bienvenida nunca acredita consentimiento.
- [x] Mantener un borrador de aceptación en memoria para un único intento, con versión, idioma y fecha de la acción real; no regenerar la fecha al reenviar ni compartir el borrador entre cuentas.
- [x] Definir retorno desde la pantalla legal, prioridad de recuperación, carga de estado y actualización de instalaciones anteriores sin saltos visibles ni bucles.

**Aceptación:** la tabla de la sección 2 se expresa en pruebas de rutas; recuperación y sesión existente conservan su funcionamiento. El registro sin aceptación vigente se deriva a la pantalla legal y no llama a `signUp`.

### APP-02. Pantalla completa de términos y privacidad

**Dependencias:** APP-01. **Archivos previstos:** `src/screens/TermsScreen.tsx` (nuevo), `src/components/entry/EntryUI.tsx`, componente de contenido legal y pruebas de interacción.

- [x] Reemplazar la presentación en hoja/modal por una pantalla completa con encabezado «Términos y privacidad», acción Volver y texto introductorio breve; usar `legalSections` como única fuente del contenido.
- [x] Conservar lectura hasta el final, ayuda «Leer hasta el final», dos casillas independientes sin premarcar y botón «Aceptar y continuar» habilitado sólo con lectura completa y ambas aceptaciones.
- [x] Implementar estados inicial, leyendo, leído, aceptación parcial, listo y transición en curso; impedir doble toque y limpiar temporizadores al salir.

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

- [x] Insertar términos después de Idioma y antes de Bienvenida; incorporar la ruta a la visibilidad de navegación, selector de idioma, botón Atrás de Android y transiciones.
- [x] Retirar `showConsent` y el montaje de `RegistrationConsentModal` de Auth cuando la pantalla nueva lo sustituya. El botón de envío pasa a «Crear cuenta»; si falta aceptación se navega a la pantalla completa, nunca se abre otra hoja.
- [x] Entregar el consentimiento al envío de registro por un contrato explícito, conservar `registration_consent` y las protecciones contra envíos simultáneos; cancelar un registro iniciado o cambiar desde él a inicio de sesión/recuperación descarta el intento. Llegar por primera vez a Auth en su modo inicial no consume la aceptación previa: debe estar disponible para elegir Crear cuenta. El nombre/correo inicial se asocia al borrador al completar identidad; si después cambia esa identidad, invalidar el consentimiento y pedirlo nuevamente en la pantalla dedicada.

**Aceptación:** crear cuenta sigue enviando las dos aceptaciones, versiones, idioma y fecha correctos. Éxito, cuenta ya existente y abandono consumen o descartan el borrador; reintento por red del mismo intento lo conserva. Un fallo no deja el botón bloqueado. Contraseñas sólo en memoria y nunca en almacenamiento o logs.

### APP-04. Coherencia de texto, acceso legal y regresiones

**Dependencias:** APP-03. **Archivos previstos:** `src/utils/legalSections.ts`, `src/utils/registrationConsent.ts`, `src/screens/SettingsDetails.tsx`, documentación de entrada y pruebas.

- [x] Conservar la consulta legal desde Ajustes y su fuente única, sin convertir la consulta en aceptación ni mantener una segunda copia del texto.
- [x] Revisar los textos que hoy suponen que la cuenta se crea al aceptar el modal. Adaptar sólo lo necesario para el nuevo momento del flujo; si cambia el texto legal presentado, actualizar su versión y referencias de privacidad. No cambiar la versión sólo por colores o distribución.
- [x] Verificar registro por pasos, inicio de sesión, correo sin confirmar, reenvío, recuperación, cambio de idioma y retorno al formulario con el nuevo estado.

**Estado (03-10-2026):** verificado en código y pruebas de rutas (`accessRegistration`, `registrationConsent`, `entryLanguage`, `onboardingAudit`); la revisión renderizada queda en QA-02 y FIS-01. `src/components/RegistrationConsentModal.tsx` quedó sin importadores y falta retirarlo.

**Aceptación:** no queda un modal legal en Auth ni llamadas automáticas a creación de cuenta al aceptar la nueva pantalla. La versión enviada corresponde al texto leído. El registro en `user_metadata` conserva su alcance actual; no se describe como auditoría inmutable.

### APP-05. Preparar la recepción de mediciones reales — D12, A1 de firmware

**Dependencias:** mapa y escalas confirmados en FW-02; pruebas del contrato de FW-01.

- [x] Validar humedad y pH, además de los rangos del modelo adquirido que correspondan, en `probeService.ts`; cubrir extremos y rechazo, sin recortar datos inválidos. Hecho con los rangos del manual de la ComWinTop CWT-Soil-NPKPHCTH-S, iguales a `sueloPublicable` del firmware, y pruebas en `probeTelemetry.test.ts`.
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
- [x] FW-02 completado; mapa del proveedor identificado (manual de la ComWinTop CWT-Soil-NPKPHCTH-S en `Firmware/config.h`; sin ensayo en banco).
- [x] FW-03 integrado y compilado.
- [x] FW-04 integrado; calibración pendiente identificada en FIS-04 (batería sin celda informada como inválida, BME280 o BMP280 con diagnóstico del bus y rangos del manual).
- [ ] FW-05 implementado; consumo pendiente identificado en FIS-05.
- [ ] FW-06 implementado y probado con cliente de prueba antes de integrarlo con la app.
- [ ] FW-07 revisado y aplicado para el alcance de distribución.

**Bloqueo resuelto (03-10-2026):** la sonda es la ComWinTop CWT-Soil-NPKPHCTH-S y su manual fija dirección, velocidad, función, registros y escalas. Queda el ensayo en banco ([procedimiento](../Firmware/TASK.md#prueba-de-la-sonda-en-banco)); no cerrar la adquisición real sin esa captura.

## 5. EXT — Configuración externa y publicación

Estas tareas no equivalen a desarrollar una pantalla ni se cierran con pruebas unitarias.

- [ ] **EXT-01 / D05:** comprobar o cargar credenciales FCM V1 y APNs del proyecto EAS. Los archivos Firebase locales no prueban que las credenciales de envío funcionen. Configurar Android primero si sólo hay teléfono Android disponible.

  El código ofrece activación contextual en espera de aprobación, Compartir acceso y Avisos, además de Configuración → Preferencias → Notificaciones. Distingue preferencia, permiso nativo y registro del teléfono, y reconsulta al volver de Ajustes. Las pruebas verifican que consultar no solicita permiso y que iOS no repite el diálogo tras un rechazo definitivo. Esto no cierra EXT-01 ni acredita recepción física: comprobar las credenciales y completar FIS-03.
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
| App: `npm test` · `npm run type-check` · introspección nativa | 276 aprobadas (03-10-2026) · sin errores · permisos conformes |
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

## 10. Plan de diseño después del acceso y ajuste de contraseñas

**Estado (03-10-2026): implementación en código completa y con pruebas de lógica (277 aprobadas, sin errores de tipos). Revisión renderizada en un Moto G56 (Android, tema oscuro, español) por depuración USB: medición en tres pantallas (etapa ilustrada, pasos con animación y «Todo listo»), espera animada de conexión y lectura, resultado por pantallas (con datos de demostración), Configuración, Mi cuenta, Permisos, Mis dispositivos, Mediciones, Inicio con selector en hoja inferior, vinculación ilustrada y el splash nativo, que ya muestra sólo el nombre TerraSense como la pantalla de carga. Falta el tema claro, el inglés, texto grande, teclado en todas las pantallas, iPhone y lectores de pantalla, por eso las casillas UI siguen abiertas.** Las pantallas posteriores al acceso comparten `src/components/screen/ScreenUI.tsx` (el lenguaje visual de la entrada) y las de carga, `BrandLoading` (el nombre TerraSense en dos colores y una rueda). El diseño toma como
referencia visual la entrada que el usuario ya validó e incluye el ajuste solicitado
del ocultamiento de contraseñas nuevas. Las casillas anteriores conservan
su estado: varias piezas de APP-01 a APP-04 ya existen y requieren comprobarse antes de
reconciliar el plan; su existencia no acredita por sí sola la aceptación de esas tareas.

### 10.1. Composición y navegación

- Mantener verde bosque, marca, tipografía, controles, ilustraciones y movimiento de la
  entrada. Inicio tendrá fondo verde y una única acción protagonista: «Medir».
- Encabezado y acciones dentro del área segura; contenido central limitado por la altura
  disponible. Inicio y elección de vinculación deben caber sin desplazamiento habitual.
- Dividir formularios y resultados extensos en pasos o pestañas. Las listas, documentos
  y textos ampliados pueden desplazarse dentro de su zona; nunca ocultar información
  mediante recorte ni reducir la letra para hacerla caber. Teclado y avisos también
  cuentan en el espacio disponible.
- Barra inferior fija con Inicio, Mis dispositivos, Mediciones y Configuración,
  respetando el área segura y el espacio del contenido. Configuración abre su panel
  de categorías y las subpantallas conservan un retorno visible. Durante la captura,
  la pantalla de carga ocupa la vista y ofrece Cancelar como salida controlada.
- La selección para medir vive sólo en el encabezado de Inicio. Con una sonda aparece
  su nombre; con varias, un desplegable con selección explícita. Deslizar la lista no
  cambia de sonda accidentalmente. «Vincular otra sonda» abre el flujo de vinculación.
- Recordar la selección por cuenta y restaurarla sólo si sigue autorizada. Una solicitud
  pendiente no es seleccionable. Si se pierde el acceso, informar y pedir otra selección;
  sin equipos autorizados, ofrecer vinculación. Durante la captura la sonda queda fijada.
- «Mis dispositivos» es consulta: tocar una fila abre su ficha y nunca cambia la sonda
  usada para medir. Compartir acceso y administrar equipos se ubican en Configuración.
- Estado Bluetooth, batería y última comunicación deben reflejar evidencia real: estar
  vinculado no equivale a mantener una conexión. Los valores antiguos llevan su fecha.
- No incorporar selección, creación ni nombres de campos agrícolas. La elección es
  de sonda y etapa del cultivo. Revisar ejemplos y textos de interfaz que sugieran
  gestionar campos; identificar las sondas por su nombre existente e ID abreviado.
  Se conserva la ubicación opcional de la medición como coordenadas.
- Vinculación física: Preparar → Buscar → Confirmar y vincular → Finalizar. Se elimina
  el paso de nombrar la sonda y su formulario. Usar la identidad del equipo y el nombre
  predeterminado del registro cuando corresponda; distinguir equipos mediante el ID.
- QR: añadir una pausa inicial y entre intentos, con 1 segundo como punto de partida
  ajustable en la prueba visual. Bloquear inmediatamente nuevas lecturas al recibir
  un candidato y mantener el bloqueo mientras se valida, se consulta o se muestra el
  resultado. Validar formato TerraSense antes de solicitar acceso; vencimiento y
  autorización se resuelven con el servicio. El retardo por sí solo no valida el QR.
  Un código ajeno no envía solicitudes ni genera alertas repetidas; tras el error,
  «Escanear otra vez» rearma la cámara después de la pausa y conserva la protección
  contra el mismo código inválido. Cancelar, salir o cambiar de cuenta invalida los
  temporizadores y respuestas pendientes. Una invitación válida puede reintentarse
  explícitamente si falló la red. Aplicar el mismo comportamiento al vincular otra sonda.
- Contraseña nueva y confirmación: mostrar brevemente el último carácter y luego
  ocultarlo con el mismo ritmo visual del código de confirmación de cuenta. El código
  actual ya comparte `SECRET_REVEAL_MS` (900 ms) entre `AccessField` y `EmailCodeScreen`;
  comprobar el comportamiento renderizado y corregir diferencias de integración,
  enmascarado o temporizadores antes de darlo por resuelto. Aplicar a registro,
  recuperación y creación de nueva contraseña desde Perfil; conservar Ver/Ocultar.
  La entrada de texto debe ser inmediata: el retardo afecta sólo su ocultamiento.

### 10.2. Inventario completo del recorrido

| Pantalla o estado | Diseño y comportamiento previstos |
| --- | --- |
| Explicación de permisos | Cuatro funciones resumidas y Continuar visible; pedir cada permiso al usar la función. |
| Revisión de cuenta fallida | Mensaje breve y Reintentar con la composición de entrada. |
| Elección de vinculación | Dos opciones principales: invitación por QR/código y vinculación física por Bluetooth. |
| Invitación | Escanear QR y alternativa de código temporal; teclado y envío visibles. |
| Cámara QR | Encuadre adaptable, Volver, pausa inicial/entre intentos y bloqueo durante validación/procesamiento; QR ajeno o vencido y permiso denegado con salida clara, sin bucle de lecturas ni solicitudes repetidas. |
| Preparación PAIR | Ilustración de sonda, instrucciones existentes y Buscar sonda. |
| Búsqueda y hallazgo | Búsqueda cancelable, fallo recuperable, identificación de la sonda encontrada. |
| Confirmación y registro | Identidad de la sonda encontrada, Vincular, guardando y error; sin pedir nombre, primera vinculación entra a Inicio con esa sonda. |
| Aprobación | Solicitud pendiente, aprobada, rechazada/no disponible y fallo de consulta; conservar significado real de cada respuesta. |
| Inicio | Encabezado con selector de sonda, botón Medir centrado sobre verde y barra inferior fija; aviso contextual sólo cuando corresponda. |
| Selector de sonda | Nombre, identificador abreviado y selección; lista acotada, carga, vacío y reintento. |
| Mis dispositivos | Lista sencilla de sondas vinculadas; ficha con nombre, ID copiable, rol y metadatos disponibles, sin selección para medir. |
| Preparación de medición | Paso de etapa: pre-siembra, vegetativo, floración o cosecha; paso de preparación con ubicación/pronóstico opcionales y acción visible. |
| Conexión y lectura | Pantalla de carga dedicada, coherente con la carga de entrada: sonda identificada, animación y estados reales de conexión/lectura, con Cancelar visible. Al recibir el resultado se abandona la carga sin esperar el pronóstico; sin porcentaje inventado. |
| Fallo de medición | Mensaje útil, Reintentar y Volver; conservar protecciones ante cancelación y respuestas tardías. |
| Resultado: resumen | Diagnóstico de la etapa y datos esenciales; Guardar accesible sin esperar pronóstico. |
| Resultado: lecturas | Diez variables distribuidas entre Suelo, Nutrientes y Ambiente; navegación explícita para evitar una página con diez tarjetas. |
| Detalle de variable | Estado, Recomendación y Control; anterior/siguiente y retorno a las lecturas. |
| Resultado: recomendaciones | Qué hacer, qué revisar y acceso al plan global con texto completo. |
| Resultado: pronóstico y captura | Cinco fechas, disponibilidad del pronóstico, batería, hora y coordenadas/precisión como texto. |
| Guardado y limpieza | Guardando, éxito local o sincronizado, error reintentable y recordatorio de limpiar la sonda. |
| Abandono de lectura | Confirmación al descartar una lectura sin guardar o cambiar de etapa. |
| Mediciones | Historial en su propia sección; filtros de sonda/etapa, fechas, diagnóstico y estado de sincronización. |
| Detalle histórico | Mismo visor que el resultado, sin acción de guardar otra vez; conservar valores y recomendaciones registrados. |
| Configuración | Índice breve: Mi cuenta (directo a nombre, apellido y contraseña), Preferencias (idioma, unidades y apariencia en la misma pantalla), Equipos y datos, Ayuda y privacidad y Cerrar sesión. |
| Perfil | Datos personales y correo con estado de verificación; Guardar visible. |
| Contraseña | Subpantalla propia con contraseña actual, nueva y confirmación; validación y errores. Nueva y confirmación usan el ritmo de ocultamiento del código por correo, también en registro y recuperación. |
| Idioma y unidades | Español/English y sistema de unidades, con selección persistente y errores recuperables. |
| Apariencia | Sistema, claro y oscuro; comprobar todos los fondos, controles y paneles. |
| Preferencias de notificaciones | Conservar los cuatro eventos de acceso y distinguir preferencia de permiso del teléfono. |
| Permisos del teléfono | Estado real por función, solicitud contextual y enlace a ajustes del sistema cuando corresponda. |
| Datos y sincronización | Pendientes, último envío confirmado, sincronización manual y fallo sin pérdida de datos. |
| Compartir acceso | Elegir equipo para invitar, mostrar QR/código temporal, vencimiento/renovación y errores; disponible según permisos actuales. |
| Administración | Selección independiente del equipo administrado, solicitudes, miembros, aprobación/rechazo, retiro de acceso y transferencia con confirmación. |
| Actualizaciones | Versión informada, búsqueda, disponibilidad y errores; instalación depende de APP-06/FW-06, actualmente pendiente. |
| Avisos | Bandeja, sin leer, paginación, vacío/sin red y apertura de la solicitud o equipo correspondiente. |
| Contacto | Correo copiable y apertura de correo con manejo de fallo. |
| Acerca de y privacidad | Versión y consulta del contenido legal compartido, con texto completo y regreso visible. |
| Cierre de sesión | Confirmación e información sobre mediciones pendientes; conservar separación por cuenta. |
| Guía de pantalla y avisos globales | Ajustar ayuda, pérdida de red, sincronización, batería baja, modales y confirmaciones al nuevo espacio disponible. |

Las alertas de permisos pertenecientes al sistema operativo conservan su presentación
nativa. El rediseño cubre las explicaciones, solicitudes y retornos que controla la app.

### 10.3. Tareas de implementación y aceptación

Cada grupo se ejecuta en cambios pequeños, dejando su recorrido comprobable antes del
siguiente. Las correcciones del usuario quedan incorporadas en este plan.

| ID | Trabajo y archivos principales | Dependencia | Aceptación y verificación |
| --- | --- | --- | --- |
| UI-00 | Revisar y corregir ocultamiento en `src/components/auth/AccessField.tsx`, `src/utils/secretReveal.ts` y pruebas relacionadas; comparar con `src/screens/EmailCodeScreen.tsx` | Ninguna | Nueva contraseña y confirmación tienen el mismo ritmo visible que el código de cuenta; probar escritura lenta/rápida, borrado, pegado, autorrelleno, pérdida de foco y Ver/Ocultar, sin retrasar la entrada ni desplazar el cursor. Verificación renderizada además de pruebas de temporizadores. |
| UI-01 | Contenedor adaptable y controles compartidos a partir de `src/components/entry/EntryUI.tsx`, `src/components/auth/AuthUI.tsx`, `src/components/SettingsUI.tsx` y tema | Plan revisado | Caben encabezado, contenido y pie en teléfono compacto; comparar con entrada en ambos temas, idiomas, teclado y texto ampliado. |
| UI-02 | Permisos, fallo de revisión de cuenta y elección de vinculación en `App.tsx`, `src/screens/PermissionsScreen.tsx` y `src/screens/OnboardingScreen.tsx` | UI-01 | Cada entrada tiene acción y retorno; pruebas de rutas existentes y revisión renderizada. |
| UI-03 | Invitación, cámara y aprobación en `src/screens/OnboardingScreen.tsx`, `src/screens/WaitingApprovalScreen.tsx` y protección compartida de escaneo | UI-02 | QR/código conservan autorización; probar pausa, ráfaga de callbacks, mismo QR ajeno sostenido, vencido, fallo de red/reintento, cancelación durante pausa, pendiente, rechazo y aprobación; ninguna solicitud duplicada ni alerta en bucle. |
| UI-04 | PAIR, búsqueda, confirmación y alta reutilizables en `src/screens/OnboardingScreen.tsx` y piezas extraídas | UI-02 | Primera y posterior vinculación usan el mismo flujo sin formulario de nombre ni selección de campo agrícola; registro con identidad disponible/predeterminada. Cancelar no acepta respuestas tardías ni cambia de cuenta. BLE real se comprueba en compilación nativa. |
| UI-05 | Barra inferior fija y selección por cuenta en `App.tsx`, `src/components/BottomNavigation.tsx`, `src/store/useAppStore.ts` y componente de selector | UI-01, UI-04 | Cuatro destinos visibles sin tapar contenido; probar cero/una/varias sondas, reinicio, cambio de cuenta, pérdida de acceso y botón Atrás; selección administrativa independiente. |
| UI-06 | Inicio y consulta de equipos en `src/screens/DashboardScreen.tsx` y `src/screens/DevicesScreen.tsx` | UI-05 | Medir es protagonista; abrir una ficha no modifica la selección; eliminar duplicación de última lectura y comprobar visualmente. |
| UI-07 | Preparación y captura en `src/screens/MeasureScreen.tsx` y componentes extraídos | UI-06 | Etapa obligatoria, ubicación opcional y sonda fija; pantalla de carga dedicada durante conexión/lectura, coherente con entrada, con cancelación y reintento. Resultado visible sin esperar clima; pruebas de medición y revisión de cada estado. |
| UI-08 | Visor de resultados en `src/components/MeasurementResultFlow.tsx` y `src/components/MeasurementDetailModal.tsx` | UI-07 | Todas las variables y detalles accesibles; ausencias explícitas y nutrientes «Sin validar»; revisar tamaños y comparar presentación con datos existentes. |
| UI-09 | Guardado y limpieza en `src/screens/MeasureScreen.tsx` y `src/components/CalibrationReminderModal.tsx` | UI-08 | Guardado local sin red ni pronóstico; impedir doble guardado y comprobar descarte/error/reintento. |
| UI-10 | Historial y filtros en `src/screens/HistoryScreen.tsx`, `src/hooks/useMeasurementHistory.ts` y utilidades de historial | UI-08, UI-09 | Distinguir filtro de historial de selección para medir; probar históricos sin ambiente, pendientes, vacío y recuperación de red. |
| UI-11 | Panel de configuración, perfil y contraseña en `src/screens/FieldSettingsScreen.tsx`, `src/screens/ProfileScreen.tsx` y `src/components/SettingsUI.tsx` | UI-00, UI-05 | Acceso a todas las categorías; teclado no tapa Guardar y Atrás vuelve a la categoría correspondiente. Nueva contraseña y confirmación mantienen el ocultamiento verificado en UI-00. |
| UI-12 | Preferencias, permisos y sincronización en `src/screens/FieldSettingsScreen.tsx` y `src/screens/SettingsDetails.tsx` | UI-11 | Cambios persisten o informan fallo; conservar colas, separación por cuenta y permisos contextuales. |
| UI-13 | Compartir QR y administrar en `src/screens/AdministrationScreen.tsx`, `src/components/RotatingDeviceQr.tsx` y panel de configuración | UI-11 | Miembros autorizados conservan invitaciones; acciones administrativas respetan rol y equipo explícito, con pruebas de rutas y operaciones tardías. |
| UI-14 | Avisos, versiones, contacto, privacidad y cierre en `src/screens/NotificationInboxScreen.tsx`, `src/screens/SettingsDetails.tsx` y `src/screens/FieldSettingsScreen.tsx` | UI-12, UI-13 | Todas las pantallas y estados del inventario accesibles; avisos abren contexto correcto y actualización sólo informa capacidades implementadas. |
| UI-15 | Ayuda, avisos globales y regresión del recorrido en componentes de guía, `src/components/OfflineBanner.tsx` y `App.tsx` | UI-02 a UI-14 | Sin superposición entre guía, teclado, navegación, mensajes y acciones; recorrido completo comprobado. |

- [x] Plan revisado: barra inferior fija, sin paso de nombrar sonda ni selección de campos agrícolas; protección QR, carga de medición y ajuste de ocultamiento de contraseña incluidos.
- [ ] UI-00: ocultamiento de contraseña verificado visualmente frente al código de cuenta.
- [ ] UI-01 a UI-04: entrada posterior al acceso y vinculación verificadas.
- [ ] UI-05 a UI-06: navegación, selector, Inicio y consulta de dispositivos verificados.
- [ ] UI-07 a UI-10: captura, resultados, guardado e historial verificados.
- [ ] UI-11 a UI-14: configuración y todos sus destinos verificados.
- [ ] UI-15: revisión completa y documentación vigente.

### 10.4. Comprobaciones y límites del cierre

- Ejecutar `npm test` y `npm run type-check` desde App después de cada grupo funcional;
  añadir pruebas de comportamiento para cambios de navegación, selección y operaciones,
  sin escribir pruebas que sólo repitan estilos.
- Revisar pantallas renderizadas en 360 × 640, 375 × 667 y un teléfono más alto, claro/oscuro,
  español/inglés, teclado abierto, fuente ampliada y movimiento reducido. Probar áreas
  seguras, botón Atrás, foco y acciones de la guía. Verificar también nombres largos y
  listas extensas sin solapamiento ni desplazamiento horizontal involuntario.
- Repetir recorridos con administrador/usuario, cero/una/varias sondas, solicitudes
  pendientes, acceso retirado, red ausente y permisos denegados. Una sesión nueva sigue
  las barreras existentes; el rediseño no introduce un salto de vinculación de producción.
- Sostener un QR ajeno frente a la cámara y comprobar que no produce bucles; probar
  lectura repetida del mismo QR válido, reintento tras fallo y salida durante la pausa.
  Comparar contraseña nueva/confirmación y código de cuenta en el mismo teléfono;
  compartir una constante de tiempo no basta para acreditar el resultado visual.
- La verificación visual en computador no acredita Bluetooth, cámara o notificaciones
  reales: completar los ensayos FIS relacionados en teléfono y equipo disponibles.
- Conservar contrato BLE, reglas agronómicas, guardado y sincronización. La instalación
  de firmware sigue el trabajo APP-06/FW-06; no se marca implementada por rediseñar su vista.
- Actualizar la descripción vigente en `App/README.md` al implementar y ejecutar
  `python docs/verificar_documentacion.py` al modificar documentación.
