# Plan de implementación: permisos del teléfono

## Estado integral de la app

**No está todo implementado ni validado para producción.** La entrada, los permisos
contextuales, vinculación, medición, historial, Ajustes y la base de notificaciones
existen en código. Quedan correcciones de implementación, integración, configuración
remota y ensayos nativos. La sonda todavía no adquiere lecturas reales de suelo.

Este documento consolida todos los ámbitos que se habían acumulado en este TASK.
Incluye los avances del otro agente, contrastados con los archivos actuales y con
las comprobaciones de la sección [Verificación ejecutada](#verificación-ejecutada).
Reemplaza los planes antiguos y sus estados contradictorios; no es un registro histórico.
Las fuentes del hardware y backend se enlazan para no duplicar sus planes completos.

### Cómo interpretar los estados

- **Implementado:** existe el comportamiento en el código actual. No implica despliegue.
- **Verificado localmente:** se ejecutó la prueba indicada; su alcance se detalla.
- **Parcial:** hay implementación, pero falta una parte concreta del requisito.
- **Pendiente de entorno:** faltan credenciales, despliegue o comprobación del servidor real.
- **Pendiente nativo:** necesita una compilación instalada, teléfono, sonda o sensor real.
- **Retirado:** decisión vigente; no debe volver a aparecer como trabajo pendiente.
- **Condicionado:** ampliación prevista que depende de una capacidad todavía ausente.

Una casilla marcada acredita exclusivamente la acción que describe. Un ensayo unitario,
una exportación JavaScript y una recepción en teléfono son comprobaciones distintas.

### Resumen por ámbito

| Ámbito | Código actual | Qué impide darlo por cerrado |
| --- | --- | --- |
| Carga, idioma y bienvenida | Implementado | Splash instalado, migración de instalación y matriz visual nativa. |
| Acceso, registro, código y recuperación | Implementado | Operaciones con correo real, política Auth remota y teclado/enlaces nativos. |
| Permisos del teléfono | Implementado con pruebas locales | Compilación iOS con el módulo nativo y matriz P7; cancelación BLE implementada. |
| Vinculación y administración | Implementado con pruebas locales | BLE real, dos cuentas/teléfonos, respuestas tardías y fallos del reset al reconectar. |
| Dashboard, medición e historial | Implementado en app | Lectura física de suelo, recorrido nativo y auditoría agronómica; catálogo es/en implementado. |
| Ajustes, perfil, contacto y preferencias | Implementado | Prueba real del cierre entre teléfonos y revisión nativa de submenús. |
| Notificaciones de acceso | Implementado y probado en réplica local | Despliegue, configuración de Expo/FCM/APNs, entrega física y prueba con dos teléfonos. |
| Firmware desde la app | Consulta implementada | Instalación por BLE, progreso, integridad y recuperación todavía pendientes. |
| Privacidad | Textos ajustados en es/en | Cierre/borrado de cuenta fuera del alcance actual; revisión del binario y declaraciones de tiendas pendiente. |
| Mapas | Retirados | Se conserva georreferenciación; no hay tarea de reponer mapas. |

## Decisiones vigentes: qué sigue y qué se retira

| Función o propuesta | Decisión actual |
| --- | --- |
| Push de solicitudes, aprobaciones, rechazos y cambio de administración | Sí: cuatro eventos de acceso, categoría `device`, Expo Push + Supabase. |
| Push por medición crítica del propio usuario | Retirada. El diagnóstico sigue mostrándose al medir. |
| Push por medición crítica de otro integrante | Retirada. Las mediciones autorizadas siguen disponibles en el historial. |
| Recordatorio local para volver a medir | Retirado. No programarlo ni dejar un interruptor pendiente. |
| Push por riesgos meteorológicos | Retirada. No crear productor periódico de alertas meteorológicas. |
| Pronóstico al medir | Se conserva cuando la persona incluye ubicación; no es una notificación meteorológica. |
| Preferencias de avisos agronómicos, clima y sincronización | Retiradas de Ajustes y de los canales push. Se conserva sólo acceso a equipos. |
| Respaldo de mediciones | Se conserva la cola y el estado dentro de la app, con sincronización en primer plano. |
| Batería | Se conserva la lectura y el estado visible. El aviso específico de batería baja en la app sigue pendiente, ver D11. |
| Push que invita a instalar firmware | Desactivada mientras no exista una acción funcional de instalación. No se elimina el catálogo ni la asignación de versiones. |
| Instalar firmware por BLE | Condicionado al contrato y a la implementación del ESP32; sigue en el alcance futuro. |
| Preparar/resetear un equipo desde la app | Retirado. El reset vigente lo realiza soporte desde el backoffice. |
| Revincular después de reset | Por el recorrido Bluetooth y ventana PAIR; no por el ID permanente como invitación. |
| Mapas, perímetros y PostGIS | Retirados. Se conservan `latitude`, `longitude` y `gps_accuracy_m` como datos y texto. |
| Configuración de campo en Ajustes | Retirada. No borrar por ello el contexto necesario para diagnóstico o datos históricos. |
| Pedir todos los permisos al entrar | Retirado. La pantalla inicial explica; cada capacidad se solicita desde su función. |
| Botón visible para saltar vinculación | Retirado. Permanece el gesto de desarrollo, limitado a `__DEV__` y por cuenta. |
| Lecturas inventadas en firmware | Fuera de alcance. El firmware transmite ausencia de lectura; la demo de app se identifica y no se guarda como medición real. |
| Migrar a otro proveedor push | No forma parte de esta implementación. |
| Cierre y borrado de cuenta | Fuera del alcance actual por decisión del usuario. Retirar la promesa del texto de privacidad; no implementar solicitudes, plazos ni tareas de borrado. |

## Implementado y conservado

### Entrada, idioma y bienvenida

Fuentes: [App.tsx](App.tsx), [EntryUI](src/components/entry/EntryUI.tsx),
[LoadingScreen](src/components/LoadingScreen.tsx), [LanguageScreen](src/screens/LanguageScreen.tsx),
[WelcomeCarouselScreen](src/screens/WelcomeCarouselScreen.tsx) y
[preferencesService](src/services/preferencesService.ts).

- [x] Carga con marca, coordinación con splash, sin espera artificial para mostrar el logo.
- [x] Contenedor con cabecera, pie de acciones y adaptación a tamaño, teclado y escala de texto.
- [x] Selector Español/English previo al acceso; selección local sin red y persistencia por cuenta.
- [x] Elección explícita de idioma antes del acceso, reconciliación con perfil y protección frente a respuestas de otra cuenta.
- [x] Tres láminas de bienvenida con gesto horizontal, indicadores, Saltar/Continuar/Comenzar y retorno al selector.
- [x] Sesión restaurada, prioridad de recuperación y marcas de bienvenida/permisos separadas.
- [x] Recursos es/en, claro/oscuro y reducción de movimiento en los componentes de entrada.
- [x] El cierre de sesión conserva el idioma de la instalación.
- [ ] Splash, teclado, cambio de idioma sin perder formulario/página y migración real de una instalación anterior: matriz P7.

### Cuenta, registro y recuperación

Fuentes: [AuthScreen](src/screens/AuthScreen.tsx), [EmailCodeScreen](src/screens/EmailCodeScreen.tsx),
[ResetPasswordScreen](src/screens/ResetPasswordScreen.tsx),
[RegistrationConsentModal](src/components/RegistrationConsentModal.tsx),
[emailOtp](src/services/emailOtp.ts) y [authDeepLink](src/services/authDeepLink.ts).

- [x] Acceso con foco, errores, mostrar contraseña, autorrelleno y bloqueo de doble envío.
- [x] Registro en dos pasos; metadatos de nombres completos; contraseñas sólo en memoria.
- [x] Términos con lectura y dos aceptaciones; reintento conserva consentimiento mientras la identidad no cambie.
- [x] Código de seis dígitos: pegado, verificación automática/manual, propósito separado y reenvío con espera.
- [x] Tratamiento de cuenta sin confirmar, correo existente y errores de red sin convertirlos en cuenta inválida.
- [x] Recuperación por código y enlace; nueva contraseña; limpieza de estado y retorno a acceso.
- [x] Configuración y plantillas locales de correo presentes; remitente elegido por el usuario conservado.
- [ ] Contrastar la política de contraseñas y parámetros efectivos de Auth remoto: D09.
- [ ] Registro, confirmación, reenvío, recuperación y correo de cambio de contraseña reales: P7.
- [x] Retirada la promesa de cierre/eliminación de cuenta del texto de privacidad: D08.

### Permisos del teléfono

Fuentes: [PermissionsScreen](src/screens/PermissionsScreen.tsx),
[permissionsService](src/services/permissionsService.ts), [permissionState](src/utils/permissionState.ts),
[permissionPrompt](src/components/permissionPrompt.ts), [SettingsDetails](src/screens/SettingsDetails.tsx),
[app.config.js](app.config.js) y [withStartupPermissions](plugins/withStartupPermissions.js).

- [x] Pantalla inicial informativa, sin botones que disparen cuatro permisos; Continuar guarda sólo la revisión por cuenta.
- [x] Fallo al guardar la revisión permite continuar durante la sesión y explica que puede volver a aparecer.
- [x] Consulta, solicitud explícita y apertura de ajustes son operaciones separadas.
- [x] Cola común de solicitudes, revalidación antes del diálogo y permiso contextual para BLE, QR, ubicación y avisos.
- [x] QR manual disponible si se rechaza cámara; un rechazo nuevo no abre Ajustes automáticamente.
- [x] Estados de permiso, radio apagada, hardware ausente, ubicación aproximada y avisos provisionales.
- [x] Android distingue la concesión parcial de SCAN/CONNECT y conserva la dependencia de ubicación para BLE antiguo.
- [x] Ajustes reconsulta al volver; su revisión evita que una consulta anterior pise una solicitud más reciente.
- [x] Ubicación opcional al medir, precisión real o datos nulos y espera acotada; no se completa ambiente con internet.
- [x] Configuración nativa sin ubicación de fondo, micrófono, galería, contactos ni BLE de fondo.
- [x] Textos de uso y localizaciones es/en declarados por configuración; plugins revisados por introspección.
- [x] Permiso del sistema, preferencia de avisos y resultado de registro push se representan por separado.
- [x] Consulta nativa iOS sin crear un `BleManager` (módulo local, pruebas con doble): D06.
- [x] Cancelación al salir/cambiar de cuenta y timeout sin solapar diálogos: D07.
- [ ] Compilar en iPhone: D06. La cancelación BLE de D07 está implementada y requiere validación física.
- [ ] Verificación real de traducción nativa, binario, radio, rechazo y restricción: P7.

La afirmación antigua «P1–P6 terminados» era demasiado amplia:

| Fase original | Estado comprobado |
| --- | --- |
| P1. Configuración y contratos | Configuración, tipos y módulo iOS implementados; falta compilarlo y comprobar el binario distribuible. |
| P2. Coordinador | Cola, revalidación, barrera del diálogo iOS y vigencia de continuaciones implementadas. |
| P3. Pantalla informativa | Implementada; prioridad de rutas cubierta por pruebas; disposición física pendiente. |
| P4. Integraciones | Presentes en las funciones reales, con control de cuenta y montaje tras cada espera. |
| P5. Textos | Recursos de permisos es/en presentes; revisión final de privacidad, tiendas y traducción global pendiente. |
| P6. Pruebas | Estados, plugins, rutas, servicios e interacción del coordinador (doble toque, desmontaje, cambio de cuenta, timeout). |
| P7. Matriz nativa | Pendiente. |

### Vinculación, dispositivos y administración

Fuentes: [OnboardingScreen](src/screens/OnboardingScreen.tsx),
[DevicesScreen](src/screens/DevicesScreen.tsx), [AdministrationScreen](src/screens/AdministrationScreen.tsx),
[WaitingApprovalScreen](src/screens/WaitingApprovalScreen.tsx),
[bleService](src/services/bleService.ts), [deviceService](src/services/deviceService.ts) y
[contrato de administración](../supabase/ADMINISTRACION.md).

- [x] Dos recorridos: sonda propia por BLE/PAIR y equipo compartido por QR o token temporal manual.
- [x] ID de la sonda derivado de su MAC; se conserva completo, incluidos ceros iniciales.
- [x] Invitación temporal con vencimiento, presentación/copia y rechazo del ID permanente como invitación.
- [x] Espera de aprobación, consulta periódica y retorno a onboarding/equipo según autorización.
- [x] Miembros y solicitudes autorizados por servidor; transferencia deja al antiguo administrador como usuario.
- [x] Nombres/correos de pendientes censurados; permisos de administración limitados al equipo seleccionado.
- [x] Selección de equipo, estados de carga/error/vacío y datos históricos de batería, versión y contacto.
- [x] Gesto de desarrollo de diez pulsaciones, aislado por cuenta y eliminado del acceso de producción.
- [x] Límites de espera BLE, manejo de identidad inválida y confirmación de vinculación separada del registro remoto.
- [x] Reset únicamente desde backoffice; incremento de generación e invalidación de datos/colas antiguas.
- [ ] Recorrido BLE físico, invitación entre teléfonos y aprobación/rechazo reales: P7.
- [ ] Reset, pérdida de acceso y reconexión con colas de varios teléfonos: D14.

El límite aceptado del alta por API de una sonda libre sin prueba criptográfica de
posesión se mantiene documentado en [Firmware/TASK.md](../Firmware/TASK.md).
No se reabre como requisito nuevo ni se presenta como seguridad ya implementada.

### Dashboard, medición, historial y datos

Fuentes: [DashboardScreen](src/screens/DashboardScreen.tsx), [MeasureScreen](src/screens/MeasureScreen.tsx),
[MeasurementExplorer](src/components/MeasurementExplorer.tsx),
[measurementPresentation](src/engine/measurementPresentation.ts), [HistoryScreen](src/screens/HistoryScreen.tsx),
[measurementsService](src/services/measurementsService.ts), [probeService](src/services/probeService.ts),
[weatherService](src/services/weatherService.ts) y [motor agronómico](src/engine/agronomyEngine.ts).

- [x] Dashboard con última lectura, pendiente de respaldo, estados sin datos y acceso a vinculación.
- [x] Fase elegida explícitamente antes de medir; contexto de captura; bloqueos de lectura/guardado.
- [x] Trama normal de 20 bytes con ambiente y batería; tolerancia de 16 bytes sólo para prototipos.
- [x] Rechazo de suelo ausente; ambiente/batería sin dato se conservan como ausencia, no como valores fabricados.
- [x] Diez parámetros en grid adaptable; detalle Estado/Recomendación/Control y plan global.
- [x] Navegación entre parámetros y retorno desde el plan; confirmación al salir con lectura sin guardar.
- [x] Diagnóstico y presentación versionados en la lectura; históricos sin diagnóstico completo no se reinterpretan con datos inventados.
- [x] Captura con hora real del teléfono, coordenadas/precisión opcionales y ambiente del BME280 separado del pronóstico.
- [x] Pronóstico de fechas posteriores, fallo sin red y datos parciales; sin coordenadas se omite su consulta.
- [x] Cola offline por cuenta, UUID estable y guardado idempotente; historial por etapa y fechas sin mapa.
- [x] Sincronización en primer plano, reintento manual, pendientes conservados y generación que impide resubir datos reseteados.
- [x] Demostración de app identificada, limitada al desarrollo y excluida del guardado real.
- [ ] Lectura física de suelo en firmware y validación de rangos/calibración: D12.
- [x] Medición, presentación, consejo por fase y errores de sonda/guardado en es/en: D10.
- [x] Catálogo de cultivos/texturas en es/en: D10.
- [ ] Revisión agronómica/pronóstico: D13.
- [ ] Gestos, Atrás, permisos tardíos, interrupciones y respaldo con sonda real: P7.

Las alertas del diagnóstico dentro de una lectura **se conservan**. La decisión del
usuario retiró las notificaciones de mediciones críticas, no el diagnóstico agronómico.

### Ajustes, perfil, contacto y guías

Fuentes: [FieldSettingsScreen](src/screens/FieldSettingsScreen.tsx),
[ProfileScreen](src/screens/ProfileScreen.tsx), [SettingsDetails](src/screens/SettingsDetails.tsx),
[contactService](src/services/contactService.ts) y [ScreenGuide](src/components/ScreenGuide.tsx).

- [x] Submenús de perfil, dispositivos, avisos, firmware, idioma, apariencia, permisos, sincronización, administración, contacto y privacidad.
- [x] Nombre, correo y estado de verificación reales; cambio de contraseña; preferencias con caché y reintento.
- [x] Cierre de sesión separado, con advertencia de mediciones pendientes y conservación por cuenta.
- [x] Contacto abre el correo elegido por el usuario, con asunto/cuerpo y alternativa para copiar; no envía datos automáticamente.
- [x] Marca vectorial y recursos generados; guías manuales con foco, navegación, cierre y sin ejecutar controles.
- [x] Guías fuera de bienvenida, autenticación y explicación inicial de permisos; pausa del QR mientras se usa la ayuda.
- [x] Cierre de sesión con alcance local y revocación sólo de esta instalación: D01.
- [ ] Prueba real del aislamiento de sesiones entre teléfonos: D01.
- [ ] Revisión de guías, teclado, lector de pantalla, temas y submenús: P7.

## Implementación vigente: notificaciones de equipos

### Alcance y estado

Los eventos vigentes son `access_request`, `access_approved`, `access_rejected` y
`admin_transferred`. Todos usan `device`. El código local incluye la base del circuito,
pero **el cierre de producción sigue pendiente**.

Fuentes: [registro móvil](src/services/notifications.ts), [bandeja](src/screens/NotificationInboxScreen.tsx),
[servicio de bandeja](src/services/notificationInbox.ts),
[migración de avisos](../supabase/migrations/20260929130000_notificaciones_equipos.sql),
[despachador](../supabase/functions/send-push-alert/index.ts) y
[transporte Expo](../supabase/functions/send-push-alert/dispatch.mjs).

- [x] Identidad y secreto aleatorios por instalación; servidor conserva el resumen del secreto.
- [x] Varios teléfonos por cuenta; cambio de token/cuenta con generación y revocación de entregas antiguas.
- [x] Registro después de cargar preferencias y revisar permisos, fuera de recuperación; registro nunca abre el diálogo nativo.
- [x] Revisión al volver a primer plano, cambiar token y recuperar red; estado de fallo y acción de reintento en Ajustes.
- [x] Revocación por secreto, incluida sesión inválida; marca local de revocación pendiente si falta red.
- [x] Cierre con espera acotada; bloqueo de re-registro durante salida; cuenta sin registro push no crea una instalación al salir.
- [x] Preferencia única de acceso a equipos; normalización descarta categorías retiradas y Android elimina sus canales.
- [x] Eventos y destinatarios creados en la transacción de membresía; solicitud resuelta cancela su envío.
- [x] Transferencia avisa a ambos afectados y dirige solicitudes pendientes al administrador actual.
- [x] Retiro del productor agronómico de `device-checkin`; guardia SQL de los cuatro tipos permitidos.
- [x] Separación de evento, destinatario, instalación y entrega; lectura por usuario independiente de Expo.
- [x] RPC autorizadas; tablas sin acceso directo de clientes; contenido y navegación revalidados por cuenta y acceso.
- [x] Reservas temporales, `skip locked`, espera creciente, límite de intentos, caducidad y recuperación de reservas vencidas.
- [x] Tickets y receipts separados; retiro de token inválido protegido ante una generación más nueva.
- [x] Envío inmediato mediante `pg_net` al confirmar el evento; tarea de recuperación mediante cron y Vault.
- [x] Soporte del secreto de autenticación adicional de Expo en el servidor.
- [x] Mensajes es/en; bandeja paginada por fecha e ID; consulta individual para abrir avisos fuera de la primera página.
- [x] Lectura, estados resueltos/vencidos, errores, recarga y acceso a bandeja durante espera/vinculación.
- [x] Manejo de push con arranque frío y sesión restaurada; limpieza al cambiar cuenta y Atrás para cerrar bandeja.
- [x] Cierre de sesión con alcance local en toda la app: D01.
- [ ] Probar realmente dos teléfonos: D01 y P7.
- [x] Clasificación de errores y vigencia durante el transporte: D02.
- [x] Prueba de concurrencia entre conexiones reales e indicadores operativos: D03.
- [x] Reconstrucción local y artefactos generados: D04.
- [ ] Configuración, despliegue y piloto: D05 y P7.

### Contrato real entre app y backend

| RPC | Contrato vigente |
| --- | --- |
| `register_push_installation` | `p_installation_id`, `p_installation_secret`, `p_expo_push_token`, `p_platform`, `p_permission`. Cuenta autenticada. |
| `revoke_push_installation` | Identificador y secreto; revocación bajo sesión de su dueño. |
| `revoke_push_installation_by_secret` | Identificador y secreto; admite revocación pendiente sin sesión, sin revelar existencia. Es la ruta de salida usada por la app. |
| `list_my_notifications` | `p_limit`, `p_before`, **`p_before_id`**; cursor compuesto para no perder fechas iguales. |
| `get_my_notification` | `p_alert_id`; devuelve el aviso accesible o ninguna fila. |
| `mark_notification_read` | `p_alert_id`; modifica sólo la lectura del destinatario autorizado. |

La fila de bandeja devuelve `id`, `event_type`, `title`, `body`, `device_id`, `created_at`,
`read_at` y `status`. Sus estados son `active`, `cancelled` y `expired`.
Los detalles de tablas, plazos y configuración tienen como referencia el
[contrato backend](../supabase/ADMINISTRACION.md); no se duplican aquí como parámetros editables.

`profiles.push_token` e `is_read` son campos heredados. Su presencia en un volcado no
demuestra un error: hay que verificar que el nuevo circuito use instalaciones y lectura
por destinatario. La bandeja persiste en el servidor; no existe una caché completa de
avisos para consultar después de reiniciar sin conexión.

El estado interno `delivered` acredita el resultado comunicado por el proveedor,
no recepción física ni lectura humana. La push puede fallar o duplicarse ante una
respuesta perdida; la bandeja conserva la identidad del evento.

### Estado de las fases N0–N7

| Fase | Estado |
| --- | --- |
| N0. Plan y reparto de trabajo | Realizado; este documento incorpora la integración posterior. |
| N1. Modelo y permisos de acceso | Implementado y probado en SQL local. Artefactos generados pendientes. |
| N2. Eventos de acceso | Implementados y probados localmente; eventos retirados bloqueados. |
| N3. Despacho y recuperación | Implementados y probados en local, con concurrencia real; falta configuración operativa remota. |
| N4. Registro móvil | Implementado y probado con dobles; falta la prueba entre teléfonos. |
| N5. Bandeja y apertura | Implementadas; lógica probada; render y tres estados de ejecución pendientes en teléfono. |
| N6. Integración | Reconstrucción local, volcado, tipos y pruebas ejecutados; falta la prueba nativa. |
| N7. Entorno y piloto | Pendiente; no hay evidencia aquí de despliegue del circuito nuevo ni recepción física. |

## Pendientes concretos, en orden de trabajo

### D01. Cierre de sesión entre teléfonos

**Decisión vigente:** recuperar la contraseña cierra todas las sesiones, incluida la
actual. El cierre normal de Ajustes afecta sólo a este teléfono.

- [x] Recuperación coordinada en [ResetPasswordScreen](src/screens/ResetPasswordScreen.tsx)
  y [notifications](src/services/notifications.ts), con marca persistente, bloqueo del
  registro push y reintento de cierre global. Cancelar después de iniciar el cambio
  completa el cierre pendiente; no vuelve al cierre local.
- [x] [Migración de sesiones push](../supabase/migrations/20260930120000_recuperacion_push_sesiones.sql):
  instalaciones asociadas a una sesión Auth, invalidación por cuenta y cancelación
  de entregas pendientes/reservadas. Las sesiones anteriores a la barrera de recuperación
  no pueden registrar push, aunque su token de acceso todavía no haya vencido.
- [x] Reserva y validación final del despacho comprueban la sesión. Las instalaciones
  antiguas sin sesión no son elegibles hasta registrarse de nuevo.
- [x] [Prueba HTTP local](../supabase/scripts/test_recuperacion_auth.mjs): dos sesiones,
  cierre global, rechazo de renovación y registro con tokens anteriores, otra cuenta
  intacta, nuevo acceso y cierre local independiente. Elimina sus usuarios temporales.
- [ ] Ensayar el recorrido en dos teléfonos, con fallos de red, reinicio y recepción real.

Un aviso que ya salió hacia Expo antes de la revocación puede llegar después: el
backend cancela los envíos que aún controla. El cierre remoto tampoco cambia la
pantalla de un teléfono desconectado hasta que éste vuelva a comprobar su sesión.

### D02. Errores y caducidad del despachador

- [x] `push_error_class` distingue token inválido (`DeviceNotRegistered`), permanentes
  (`MessageTooBig`, `InvalidCredentials`, `MismatchSenderId`, HTTP 4xx salvo 408/429, evento vencido)
  y transitorios (`MessageRateExceeded`, errores del proveedor, HTTP 408/429/5xx, códigos desconocidos).
  Los permanentes fallan sin reintento; el retiro del token respeta la generación.
- [x] La caducidad enviada a Expo es la vigencia restante del evento, como fecha absoluta;
  un evento vencido no se envía.
- [x] Un ticket aceptado no se reenvía; los resultados inciertos se marcan como tales y no
  afirman recepción. Cubierto en el [transporte](../supabase/functions/send-push-alert/dispatch.mjs),
  sus pruebas y [test_notificaciones.sql](../supabase/scripts/test_notificaciones.sql).

### D03. Concurrencia, operación y conservación de avisos

- [x] [test_concurrencia_push.sh](../supabase/scripts/test_concurrencia_push.sh) usa conexiones
  reales confirmadas: reservas simultáneas, muerte tras reservar, muerte tras llamar a Expo sin
  guardar el ticket, informes simultáneos y ticket aceptado.
- [x] Cambios de preferencia, permiso y membresía desde otra conexión con envíos en vuelo:
  se cancelan las entregas afectadas y los tickets tardíos no las reviven.
- [x] Supervisión con `push_dispatch_health()` (antigüedad de cola, fallidos, sin receipt,
  última ejecución de cron) y retención con `purge_push_notifications()` programada por cron.
  Detalle en el [contrato backend](../supabase/ADMINISTRACION.md).
- [ ] Ejecutar la espera real del lease (`ESPERA_REAL_LEASE=1`); por defecto se simula su vencimiento.
- [ ] Panel operativo o alertas sobre esos indicadores en el entorno real.

### D04. Migraciones reproducibles y archivos generados

- [x] La línea base es UTF-8 estricto; se corrigieron sólo comentarios, sin tocar SQL ejecutable.
- [x] `supabase db reset` reconstruye la réplica local desde los archivos del repositorio
  (línea base y migraciones posteriores) y las pruebas SQL pasan sobre ella.
- [x] [schema.sql](../supabase/schema.sql) y [database.types.ts](../Web/backend/database.types.ts)
  regenerados desde la réplica local, mediante archivo temporal. Conservan `is_read` y `push_token`.
- [x] Los tipos generados en local no incluyen el bloque `__InternalSupabase` que emite la
  generación contra el proyecto vinculado; se recupera al regenerarlos tras el despliegue (D05).

### D05. Despliegue y configuración de notificaciones

- [x] Comprobar migraciones y funciones efectivas del proyecto remoto. El proyecto vinculado
  es producción; la base local y su cron no acreditan el estado remoto.
- [x] Preparar/aplicar el cambio de base y desplegar las funciones afectadas en orden compatible
  con la nueva app. Revisar cómo se actualizan clientes que todavía usan `profiles.push_token`.
- [ ] **Firebase/FCM postergado por decisión del usuario.** También falta configurar
  el ID real `EXPO_PUBLIC_EAS_PROJECT_ID` y las credenciales APNs de la compilación.
  La app ya admite la variable; el archivo de ejemplo no demuestra que exista un proyecto configurado.
- [ ] Configurar los secretos de Vault indicados en el contrato backend y comprobar ejecución
  inmediata, cron y recuperación de pendientes sin intervención manual.
- [ ] Configurar la protección adicional de Expo con el secreto del servidor y verificar que
  coincide con la configuración del proyecto. Las credenciales nunca van en la app ni en git.
- [ ] Ensayar solicitud, aprobación, rechazo y transferencia de extremo a extremo, con ticket,
  receipt, recepción y apertura registrados por separado.

### D06. Autorización Bluetooth iOS

- [x] Módulo Expo local [ios-bluetooth-authorization](modules/ios-bluetooth-authorization/expo-module.config.json)
  que lee `CBManager.authorization` sin crear `BleManager`; el autolinking lo resuelve.
- [x] Restricción, rechazo, concesión, sin decidir y desconocido se mapean por separado. La marca
  local sólo se usa si el módulo falta (Expo Go o binario sin recompilar).
- [ ] **Postergado por decisión del usuario:** compilar con perfil `production`,
  distribuir por TestFlight e instalar en iPhone físico; comprobar el módulo Bluetooth
  y la lectura de permiso sin escaneo ni diálogo inesperado. Una compilación debug
  no satisface este pendiente.

### D07. Coordinador de permisos y continuaciones tardías

- [x] Onboarding, Dispositivos (BLE, cámara y solicitud por QR/código) y Medición (ubicación y
  guardado) comprueban cuenta y montaje después de cada espera, con
  [accountOperation](src/utils/accountOperation.ts) y [latestOnly](src/utils/latestOnly.ts).
- [x] En iOS el timeout de Bluetooth devuelve «sin decidir», pero la cola sigue bloqueada
  hasta que CoreBluetooth responda: no se abre un segundo diálogo.
- [x] Pruebas de doble toque, desmontaje, cambio de cuenta con el diálogo abierto, continuación
  cancelada y timeout con barrera.
- [x] Cancelar el escaneo BLE en curso al salir, desmontar o cambiar de cuenta, con
  señal por operación, limpieza de temporizadores/suscripciones y descarte de respuestas
  tardías. La espera de radio y la lectura también admiten cancelación.
- [ ] Comprobar la cancelación nativa con teléfono y sonda reales.

### D08. Privacidad sin promesa de cierre de cuenta

**Cierre y borrado de cuenta: fuera del alcance actual por decisión del usuario.**
No implementar esa función ni mantenerla como requisito para cerrar este trabajo.

- [x] Retirar de [legalSections](src/utils/legalSections.ts), en español e inglés, la
  promesa de eliminar el perfil dentro de un mes y conservar mediciones disociadas al cerrar la cuenta.
- [x] Revisar documentación vigente para que no describa ese proceso como disponible.
  Conservar el contacto de soporte y la información sobre derechos aplicables.
- [ ] Revisar coherencia de privacidad, permisos, consentimiento y declaraciones de las tiendas
  con lo realmente implementado, incluyendo coordenadas enviadas al proveedor meteorológico.

### D09. Auth y correo reales

- [x] Política Auth remota consultada y alineada: mínimo 8, sin composición ASCII
  obligatoria. Se conservaron SMTP y los demás campos de Auth; confirmación obligatoria,
  código de seis dígitos, vencimiento de 600 segundos, reenvío de 60 segundos y aviso
  de cambio de contraseña están configurados. La entrega de correo sigue pendiente de P7.
- [x] [passwordRules](src/utils/passwordRules.ts) admite letras y números Unicode,
  incluidos ñ y tildes, exige símbolo y cuenta puntos Unicode para el mínimo. Las marcas
  de acento combinadas no cuentan como símbolo. La contraseña se envía sin modificar.
- [x] Auth local probado por HTTP con contraseñas de letras acentuadas, dígitos Unicode
  y símbolos. [config.toml](../supabase/config.toml) mantiene el mínimo y composición
  compatibles. Auth aplica además sus propios límites de longitud y validación.
- [ ] Verificar registro y recuperación reales desde la app compilada, plantillas,
  URLs, código incorrecto/vencido, límites, cancelación y correo de cambio de contraseña.

La composición adicional del formulario es una ayuda de la app: una llamada directa
a Auth puede omitirla. El servidor exige la longitud configurada; no se atribuye a
Auth una validación de composición Unicode que no está implementada.

### D10. Traducciones, diseño y acceso a la bandeja

- [x] Medición en es/en: pantalla, presentación de parámetros, consejo por fase, mensajes del
  motor (sin cambiar umbrales) y errores de sonda/guardado mediante [probeErrors](src/utils/probeErrors.ts).
- [x] El acceso «Avisos» de vinculación/espera es una franja en flujo con área segura; no se superpone.
- [x] `expo-system-ui` instalado; la introspección ya no avisa sobre `userInterfaceStyle`.
- [x] [Catálogo es/en](src/engine/catalogNames.ts) para los ocho cultivos y cuatro
  texturas, usado por Medición y los consejos. Se conservan IDs, umbrales y diagnósticos
  históricos; las traducciones están cubiertas por pruebas.
- [ ] Probar la bandeja renderizada: carga, vacío, sin red, recuperación, lectura, paginación,
  aviso resuelto, aviso de otra cuenta y tap que abre una app cerrada.
- [ ] Comprobar el acceso «Avisos» con tamaño compacto y texto grande en teléfono.
- [ ] Revisar guías, foco, teclado, contraste, movimiento reducido y traducciones de diálogos
  del sistema según la matriz P7; no dar accesibilidad por validada sólo por tener etiquetas.

### D11. Batería baja dentro de la app

- [x] Mostrar el último porcentaje conocido y distinguirlo de una conexión BLE actual.
- [ ] Implementar/verificar el aviso específico al detectar batería baja durante un contacto,
  con umbral válido y control de repetición. El porcentaje visible no acredita ese aviso.
- [ ] Coordinar el umbral y la fiabilidad con la calibración de batería del firmware.
  Sigue siendo un aviso interno; no añadir un productor push de batería.

### D12. Hardware y contrato de lectura

- [ ] Implementar/validar la adquisición RS-485/Modbus de suelo en el ESP32. Hoy está pendiente
  y el teléfono rechaza la trama sin suelo; una demo no cierra el recorrido de medición real.
- [ ] Ensayar BME280, batería, alimentación de sonda, rangos de suelo y pines contra el hardware.
- [ ] Probar ventana PAIR, nombre/identidad, desconexiones y lectura nueva por suscripción.
- [ ] Validar humedad/pH y otros rangos de suelo cuando exista el driver; conservar centinelas.
- [ ] Mantener como fuente [Firmware/TASK.md](../Firmware/TASK.md) para driver, calibración,
  reposo, seguridad BLE, buzzer, prueba de trama y pendientes de PCB. Esta recapitulación no
  marca esas tareas como implementadas ni reemplaza sus criterios físicos.

### D13. Medición, motor y pronóstico

- [ ] Auditar umbrales, fase, cultivo, textura y recomendaciones contra las fuentes del motor
  y la validación agronómica; probar N/P/K como información sin inventar dosis.
- [ ] Probar toda la interacción: fase obligatoria, captura, grid, detalle, plan, retorno a la
  misma página, Atrás, guardado repetido y cancelación de respuestas anteriores.
- [ ] Validar respuesta meteorológica real, coordenadas, fechas/zona horaria, datos parciales,
  falta de red y precisión. Las pruebas automatizadas actuales usan respuestas controladas.
- [ ] Resolver licencia/cupo de la fuente para el uso comercial previsto, aunque se hayan
  retirado las alertas meteorológicas. El pronóstico al medir continúa consumiendo el servicio.
- [ ] Cubrir pérdida de permiso/servicios de ubicación durante la lectura y garantizar
  ausencia de coordenadas cuando la opción está desactivada.

### D14. Sincronización, reset y pérdida de acceso

- [ ] Ensayar modo avión, cierre/reinicio y retorno de cobertura sin duplicar mediciones.
- [ ] Probar reset de soporte durante una sincronización, cambio de generación, limpieza
  de caché/cola de otros teléfonos y preservación de los equipos no afectados.
- [ ] Probar pérdida de membresía con cola pendiente y errores parciales al borrar/reintentar.
- [ ] Distinguir una transacción remota revertida de la invalidación local al reconectar:
  las pruebas de generación y caché no acreditan el ciclo físico completo.

### D15. Instalación de firmware, condicionada

- [x] Consulta del catálogo/notas/versión por equipo y estado explícito de instalación no disponible.
- [x] Backoffice conserva carga, publicación, asignación y cancelación de versiones.
- [x] Textos web y productor push alineados con la ausencia de instalación móvil.
- [ ] Definir/implementar protocolo BLE, partición y recepción del binario en ESP32;
  verificar origen, integridad, compatibilidad, batería y recuperación de interrupciones.
- [ ] Implementar descarga, verificación, transferencia, progreso y confirmación por versión
  reales en la app. No mostrar progreso simulado ni considerar un archivo asignado como instalado.
- [ ] Habilitar ventana/aviso de actualización sólo cuando exista esa acción funcional,
  revisando entonces el contrato de eventos que hoy permite exclusivamente acceso a equipos.

Fuentes: [Firmware/PLAN.md](../Firmware/PLAN.md) y [Web/TAREAS.md](../Web/TAREAS.md).

### D16. Recomendación remota opcional

- [x] Contrato autenticado, consulta de medición bajo permisos, timeout, validación de respuesta
  y respaldo local en [recommendationsService](src/services/recommendationsService.ts).
- [x] [measurement-recommendation](../supabase/functions/measurement-recommendation/index.ts)
  responde `PROVIDER_NOT_CONFIGURED`; no llama a un proveedor ni inventa análisis remoto.
- [ ] Si se habilita esta ampliación: elegir proveedor, implementar adaptador/secretos,
  persistencia del resultado, invocación en el flujo, despliegue y pruebas autorizadas.

La medición usa el motor local. Esta ampliación no equivale a los avisos de mediciones
críticas que el usuario retiró ni es una capacidad ya disponible por existir la función.

### D17. Documentación y preparación de publicación

- [ ] Revisar los documentos enlazados que aún describan categorías retiradas, preparación
  desde la app, firmware inexistente o despliegues viejos como si fueran el estado actual.
- [ ] Mantener la documentación de Supabase separando código local, aplicado localmente y
  desplegado. No asumir que una tarea programada existe en producción porque está en SQL.
- [ ] Revisar binarios, identificadores, iconos, splash, recursos de permisos y privacidad
  antes de publicar. La introspección omite Firebase ausente y no firma APK/IPA.
- [ ] Los pendientes comerciales, metrológicos, restauración de respaldos y operación del
  producto conservan su fuente en [PLAN_VALIDACION](../docs/PLAN_VALIDACION.md) y
  [Supabase](../supabase/README.md); no quedan aprobados al cerrar las pruebas de App.

## P7. Matriz nativa y de extremo a extremo

**Todas las filas siguientes siguen abiertas.** El resultado exigido debe comprobarse
con el código integrado actual, registrando plataforma, versión y compilación probadas.
La disponibilidad actual de un teléfono no se infiere de comprobaciones ADB antiguas.

| Caso | Qué hay que comprobar |
| --- | --- |
| Motorola G55 | Recorrido completo, área útil, teclado, regreso desde Ajustes y uso de cada función. |
| Android compacto e iPhone compacto | Referencias 360 × 640 y 375 × 667: contenido habitual visible; con texto grande, desplazamiento y acciones accesibles. |
| Pantallas grandes, temas e idiomas | Ancho limitado, claro/oscuro, es/en, textos y estados sin recortes. |
| Splash y cliente instalado | Marca nativa y carga React coherentes, arranque frío, reinicio y actualización de una instalación anterior. |
| Teclado y autorrelleno | Campos/acciones visibles, gestores de contraseña y pegado de código. |
| VoiceOver/TalkBack y movimiento reducido | Orden de foco, labels, estados, guías, retorno del foco y transiciones. |
| Android 12+/13+ | BLE independiente del GPS cuando corresponde; permiso de notificaciones y cierre del diálogo. |
| Android anterior a 12, si lo soporta el mínimo efectivo | Dependencia de ubicación para escaneo, radio y servicios de ubicación apagados. |
| iPhone físico | Primera solicitud BLE/cámara/ubicación/avisos, restricción, provisional y lectura de estado sin diálogo. |
| Revocación/reinicio/cambio de cuenta | Ningún permiso local equivale a identidad de cuenta; no se ejecutan continuaciones viejas. |
| Ubicación aproximada/sin señal/sin permiso | Precisión real o nulos; lectura conservada y pronóstico sólo cuando procede. |
| QR y código manual con dos cuentas | Vigente/vencido/inválido, reescaneo, aprobación/rechazo y transferencia. |
| Sonda física | PAIR, identidad, confirmación, lectura de suelo/ambiente/batería y desconexiones. |
| Medición completa | Fase, contexto, detalle, plan, gestos, Atrás, guardado y cancelación sin duplicados. |
| Sin conexión y recuperación | Cola, preferencias, idioma, registro push y revocación pendiente; cierre/reinicio sin perder datos. |
| Reset y varios equipos/teléfonos | Generaciones, cachés antiguas, aislamiento y equipo libre revinculado por PAIR. |
| Cuenta y correo | Registro, verificación, reenvío, contraseña nueva y recuperación con app abierta/cerrada. |
| Push en Android/iOS | Primer plano, segundo plano y arranque frío; dos teléfonos; permisos bloqueados; cuenta cambiada; aviso resuelto. |
| Binario de distribución | Manifest/plist final, traducciones nativas, recursos de Firebase/APNs y ausencia de capacidades sobrantes. |

## Verificación ejecutada

Resultados repetidos sobre los archivos actuales durante esta recapitulación:

| Comprobación | Resultado | Límite de la evidencia |
| --- | --- | --- |
| App: `npm test` | 210 aprobadas | Funciones/servicios con dobles; no render nativo ni teléfonos. |
| App: `npm run type-check` | Sin errores | Compatibilidad de tipos. |
| Despachador: `node --test supabase/functions/send-push-alert/dispatch.test.mjs` | 28 aprobadas | Expo y consultas de tickets/receipts simulados. |
| [test_notificaciones.sql](../supabase/scripts/test_notificaciones.sql) | Correcto y rollback ejecutado | PostgreSQL local reconstruido con `supabase db reset`; no acredita producción. |
| [test_concurrencia_push.sh](../supabase/scripts/test_concurrencia_push.sh) | Correcto, secciones 1 a 6; base limpia al terminar | Conexiones reales en local; vencimiento del lease simulado. |
| Web: `npm test` y `npm run type-check` | 8 aprobadas y tipos sin errores | Los textos de firmware no prueban instalación. |
| [Introspección nativa](scripts/check-native-permissions.cjs) | Permisos conformes | Omite archivos Firebase; avisa sólo de red local de `expo-dev-client`. Revisar binario final. |
| Línea base leída como UTF-8 estricto | Correcto | Reconstrucción local desde el repositorio, D04. |
| Documentación: `python docs/verificar_documentacion.py` | 0 errores | Enlaces locales, anclas y diagramas. |
| Exportación JS y compilación nativa actuales | No repetidas en esta auditoría | Las exportaciones de etapas anteriores no acreditan la bandeja integrada actual. |
| Producción, correo, Expo/FCM/APNs y teléfonos | No comprobados en esta auditoría | Permanecen D05, D09 y P7. |

El guion SQL usa roles reales de clientes y comprueba RLS/privilegios, eventos,
instalaciones, lecturas, reservas, resultados tardíos, invalidación, reset y categorías.
Sus comprobaciones de privilegios de ejecución usan `has_function_privilege`: el guion
documenta un fallo de la imagen local al provocar ciertos errores de función. No presentar
esa comprobación de catálogo como si se hubiera probado cada rechazo mediante HTTP.

Para repetir las comprobaciones, ejecutar desde el directorio correspondiente:

```powershell
# Desde App/
npm test
npm run type-check
node scripts/check-native-permissions.cjs

# Desde Web/
npm test
npm run type-check

# Desde la raíz
node --test supabase/functions/send-push-alert/dispatch.test.mjs
python docs/verificar_documentacion.py

# Sólo contra Supabase LOCAL con migraciones aplicadas. El guion termina en rollback.
Get-Content -Raw -Encoding utf8 supabase/scripts/test_notificaciones.sql |
  docker exec -i supabase_db_TerraSense psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

El verificador documental incluye este TASK y comprueba sus enlaces y anclas.
No ejecutar regeneración financiera por cambios de este plan: las cifras no forman
parte de esta revisión.

## Orden para cerrar el trabajo

1. Validar D01/D09 en teléfonos: cierre global tras recuperación y política Unicode ya decididos e implementados.
2. Probar la cancelación BLE (D07) en Android; compilación de distribución iPhone (D06) postergada.
3. Revisar la bandeja renderizada y el catálogo es/en implementado en D10.
4. Preparar el entorno D05/D09 y comprobar qué está realmente desplegado.
5. Completar P7 y D14 con cuentas, teléfonos y sonda; D12 limita la medición real.
6. Ajustar privacidad en D08; el cierre y borrado de cuenta queda fuera de esta implementación.
7. Mantener D11 y D13 como pendientes funcionales; D15/D16 como ampliaciones condicionadas.
8. Alinear documentación/publicación en D17 y volver a ejecutar sólo las comprobaciones afectadas.

**Cierre global:** código completo, migraciones reproducibles, configuración remota
verificada y recorridos reales probados. Aprobar las pruebas actuales no elimina los
pendientes enumerados ni reactiva ninguna función retirada por el usuario.

### Correcciones de código aplicadas

Las partes de código de D01–D04, D06, D07, D09 y D10 están aplicadas y verificadas localmente
(ver [Verificación ejecutada](#verificación-ejecutada)). Sus casillas abiertas dependen de un
teléfono o de la configuración externa indicada; D01/D09 ya tienen decisión vigente. No reponer funciones retiradas.

Las pruebas con teléfonos, credenciales de terceros, configuración de producción,
calibración de hardware y ampliaciones condicionadas conservan sus casillas abiertas
hasta contar con la evidencia correspondiente. No son resultados que puedan acreditarse
sólo con cambios de código o pruebas locales.
