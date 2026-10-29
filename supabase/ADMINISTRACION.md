# Administración y solicitudes de acceso

## Acceso web y roles de equipo

El backoffice lo controla `is_support_staff()`: una fila activa en `admin_support_users` **y** el correo confirmado `akurasoporte@gmail.com`, la única cuenta que entra. `device_members` controla exclusivamente el acceso de la app a cada equipo. Ambas cuentas usan Supabase Auth como proveedor de identidad, pero ninguna membresía ni rol de equipo concede acceso a la web. El correo sólo es criterio de búsqueda, no autorización. `profiles.role` tampoco autoriza el backoffice ni la administración de equipos.

Los únicos roles de equipo son `admin` y `user`. El primer usuario que empareja un ID sin miembros, con la ventana PAIR de la sonda abierta, queda como administrador. Los demás solicitan acceso y quedan pendientes con rol `user`. La única diferencia entre los miembros aprobados es el acceso a **Ajustes → Administración**: aprobar, eliminar o delegar. Ambos pueden operar el equipo y mostrar su QR.

La transferencia es atómica: el administrador anterior pasa a `user`. Para eliminar a un administrador hay que delegar primero. Las operaciones ordinarias conservan al menos un miembro y exactamente un administrador; el reset es la excepción que deja cero miembros. Se bloquea la fila del equipo durante vinculaciones, transferencias, bajas y reset, con índice único y comprobación diferida de la administración.

Al migrar datos heredados, se conserva primero al `owner`, después a un `admin` y, a falta de ambos, al primer miembro aprobado. Si un equipo sólo tiene pendientes, se recupera al primero como administrador. El resto queda como `user`, conservando su estado de aprobación.

## QR de 5 minutos

`get_device_access_qr` entrega a cualquier miembro aprobado un token aleatorio que dura **5 minutos completos desde que se genera**, sin alinearse al reloj del servidor ([`20260928140000`](migrations_archivo/20260928140000_qr_de_5_minutos.sql), aplicada el 28-09-2026). Mientras está vigente, todos los miembros ven el mismo; al vencer, la siguiente consulta genera otro con 5 minutos completos. La app lo vuelve a pedir al vencer, muestra la cuenta regresiva y oculta los vencidos. El token nunca es el ID permanente del equipo.

Debajo del QR la app muestra **el mismo token como código de invitación**, con un botón para copiarlo. Quien no puede escanear lo escribe o lo pega en «Usar invitación» del onboarding. El QR (`terrasense://join?token=…`) y el código siguen el mismo camino y vencen juntos (`parseDeviceInvite` en `App/src/utils/deviceCode.ts`).

Los dos llegan a la Edge Function `request-device-access`, que valida la sesión y llama a `join_device_by_invite`. La base valida vigencia y equipo y registra una membresía pendiente; el disparador de membresía crea una única alerta dirigida al administrador. Reescanear no autoriza al solicitante ni duplica la alerta. Los RPC antiguos por ID permanente quedan sin permisos para clientes.

La pantalla de espera consulta el estado cada cinco segundos. Muestra sólo las iniciales del nombre y del correo del administrador, censuradas **en el servidor**: por ejemplo, `Axxxxx Vxxxxx` y `axxxxxxxx@gxxxxxxxx`. Al aprobarse la solicitud, entra al equipo; si se elimina o resetea, informa que la solicitud ya no está disponible.

## Avisos de acceso

Sólo existen cuatro eventos, todos de la categoría `device`: `access_request`, `access_approved`, `access_rejected` y `admin_transferred`. Los avisos de suelo, clima, sincronización, recordatorios de medición y firmware ya no tienen productor: `device-checkin` no crea alertas, `assign_firmware_update` sólo registra la asignación y un disparador de `push_alerts` rechaza cualquier evento distinto de los cuatro. Batería baja y problemas de sincronización son estados dentro de la app.

Los eventos los crea el disparador `notify_device_membership` en la misma transacción que el cambio de `device_members`, de modo que valen el QR, la app y el backoffice. Hay **un solo evento por operación** y conserva su ID: una alta pendiente avisa al administrador; aprobar o rechazar cancela la solicitud (`status = 'cancelled'`) y avisa al solicitante; retirar un acceso cancela lo que quede pendiente para esa persona; transferir la administración genera un único evento para el administrador que cede y el que recibe, y traspasa al nuevo las solicitudes todavía abiertas. El solicitante puede leer su rechazo aunque ya no tenga membresía. Retirar la propia solicitud no genera aviso.

| Tabla | Contenido | Acceso |
| :--- | :--- | :--- |
| `push_alerts` | Evento: `event_type`, `device_id`, `status` (`active`, `cancelled`, `expired`), `expires_at` (30 días) | Sólo servicio |
| `notification_recipients` | Destinatario: `read_at` propio, `cancelled_at` si perdió el acceso | Sólo servicio |
| `push_installations` | Un teléfono: token Expo, permiso, plataforma, `token_generation` y SHA-256 del secreto | Sólo servicio |
| `push_deliveries` | Una entrega por evento e instalación: estado, intentos, lease, ticket y receipt | Sólo servicio |

Las cuatro tienen RLS sin políticas y sin privilegios para `anon` ni `authenticated`: el usuario sólo usa RPC. Evento, destinatario y entrega son estados distintos: la lectura la guarda `notification_recipients.read_at` y no depende del despacho; un ticket aceptado no es un receipt entregado ni una lectura.

| RPC | Quién | Qué hace |
| :--- | :--- | :--- |
| `register_push_installation(p_installation_id uuid, p_installation_secret text, p_expo_push_token text, p_platform text, p_permission text)` | Sesión | Registra o actualiza el teléfono. El secreto aleatorio (32 a 512 caracteres) protege el ID: con él la misma instalación puede cambiar de cuenta, token o permiso sin afectar a otras. Un token pertenece a una sola instalación |
| `revoke_push_installation(p_installation_id uuid, p_installation_secret text)` | Sesión de su dueño | Cierre de sesión: quita el token, cancela las entregas abiertas y sube la generación |
| `revoke_push_installation_by_secret(p_installation_id uuid, p_installation_secret text)` | `anon` y sesión | Igual efecto, sin sesión (cierre sin red o con la sesión vencida). Sólo actúa si el secreto coincide y responde igual exista o no la instalación |
| `revoke_push_for_password_recovery()` | Sesión vigente de la cuenta | Invalida todas sus instalaciones y entregas pendientes/reservadas; establece una barrera que impide registrarse a las sesiones anteriores. Se llama antes de cambiar la contraseña y antes del cierre global |
| `list_my_notifications(p_limit integer, p_before timestamptz, p_before_id uuid)` | Sesión | `id`, `event_type`, `title`, `body`, `device_id`, `created_at`, `read_at`, `status`. Sólo avisos del usuario con acceso vigente; paginación por `(created_at, id)` |
| `get_my_notification(p_alert_id uuid)` | Sesión | La misma fila para un aviso, o ninguna si no es suyo o perdió el acceso |
| `mark_notification_read(p_alert_id uuid)` | Sesión | Marca la lectura del destinatario; falla con `42501` si el aviso no es suyo |

El payload de la push contiene sólo `alert_id`, `event_type`, `category` y `device_id`; el contenido se consulta con `get_my_notification` tras comprobar el acceso actual. El texto visible sale en el idioma del perfil.

Cada instalación conserva el `session_id` verificado desde Auth. Registro y recuperación
se coordinan con un bloqueo por cuenta; las sesiones revocadas, vencidas o anteriores a
la barrera de recuperación no pueden registrar ni recibir nuevos envíos. Una instalación
antigua sin sesión debe registrarse nuevamente. El despachador usa `validate_push_lease`
antes de llamar a Expo; un aviso ya enviado al proveedor puede llegar después del cierre.
El cierre normal de la app sigue siendo local; recuperar la contraseña cierra todas las
sesiones, incluida la actual. [Contrato y pruebas](../App/TASK_PERMISSIONS.md#d01-cierre-de-sesión-entre-teléfonos).

`send-push-alert` reserva entregas con `reserve_push_deliveries` (lease de dos minutos, `for update skip locked`). Antes de cada envío revalida destinatario, acceso, solicitud aún pendiente, token vigente, permiso y preferencia `device`. Reintenta con espera creciente por entrega (30 s, 1 min, 2 min… hasta 1 h) y hasta cinco intentos. La push se envía sólo durante las 24 horas siguientes al evento, aunque la bandeja lo conserva 30 días. Un token inválido (`DeviceNotRegistered` en el ticket o el receipt) se retira sólo si la instalación sigue con la misma generación que produjo ese envío. Los receipts se consultan desde los 15 minutos del ticket, hasta 24 horas. Las reservas vencidas vuelven a la cola y Expo no confirma que la persona haya visto el aviso. La función sólo acepta la clave de servicio.

### Errores de Expo y resultado incierto

La función informa el código recibido, por ticket o por receipt, y la base lo clasifica con `push_error_class`. La tabla `EXPO_ERRORS` de [`dispatch.mjs`](functions/send-push-alert/dispatch.mjs) debe coincidir con ella y su prueba las compara.

| Clase | Códigos | Efecto |
| :--- | :--- | :--- |
| `invalid_token` | `DeviceNotRegistered` | La entrega falla y se retira el token. No se reintenta |
| `permanent` | `MessageTooBig`, `InvalidCredentials`, `MismatchSenderId` y todo `permanent:…` (HTTP 4xx salvo 408 y 429; evento vencido antes de salir) | La entrega falla sin reintento; el evento vencido pasa a `expired` |
| `transient` | `MessageRateExceeded`, `ExpoServerError`, `ServiceUnavailable`, HTTP 408, 429 y 5xx, cualquier código desconocido y `uncertain:…` | Vuelve a `pending` con la espera creciente, hasta el límite de intentos |

`InvalidCredentials` y el HTTP 401 no son culpa de la entrega sino de la configuración del proveedor: la supervisión los muestra por causa. En el receipt, `ok` es `delivered`, un receipt ausente espera otro ciclo sin tocar nada y un error se clasifica igual; uno transitorio se reenvía como envío nuevo porque el proveedor informó que no lo entregó.

La fecha de caducidad que recibe Expo es la vigencia restante del evento (`reserve_push_deliveries` la devuelve como `least(expires_at, created_at + 24 h)`), no un plazo desde el envío; un evento vencido al momento de salir no se envía.

**Resultado incierto.** Si Expo pudo recibir el lote y no se sabe (timeout, corte de red, respuesta ilegible o con menos tickets que mensajes) el error lleva el prefijo `uncertain:` y la entrega se reintenta como transitoria. Eso puede duplicar el aviso, pero nunca lo pierde ni afirma recepción. Una entrega con ticket aceptado no se reenvía por ese camino ni por un lease vencido: `reserve_push_deliveries` excluye toda entrega con ticket y sólo un receipt con error explícito la reabre. El ticket que informa un trabajador cuyo lease ya fue reemplazado se ignora.

### Supervisión y retención

`push_dispatch_health()` es sólo para `service_role` (sin acceso de `anon` ni `authenticated`) y devuelve una fila sin tokens ni datos de personas: entregas listas y antigüedad de la cola, reservas vencidas sin informar, reintentos, fallos de 24 horas por causa, envíos inciertos, tickets sin receipt (y los atrasados), último ticket aceptado, si Vault tiene los dos secretos y la última ejecución del despacho y de la retención. Una cola que envejece o un despacho sin ejecuciones recientes indican que el circuito no corre. Con la clave de servicio: `select set_config('request.jwt.claims', '{"role":"service_role"}', false); select * from public.push_dispatch_health();`.

`purge_push_notifications()` borra los eventos cuyo `expires_at` ya pasó, con sus destinatarios y entregas, y las instalaciones sin token que llevan tiempo inactivas (la app se registra otra vez con su secreto si vuelve). También limpia la bitácora de `cron.job_run_details` de estas tareas, que de otro modo crece una fila por minuto. La programa `terrasense-push-retention` una vez al día con el mismo patrón que el despacho. Los plazos están en la migración [`20260929150000`](migrations/20260929150000_operacion_avisos.sql), única fuente. Un aviso vencido desaparece de la bandeja en la siguiente ejecución diaria.

`pg_cron` ejecuta `terrasense-push-dispatch` cada minuto y el disparador de membresía lo despierta al crear un evento; ambos usan `invoke_push_dispatch()`, que lee de **Vault** los secretos `push_dispatch_url` (URL completa de `.../functions/v1/send-push-alert`) y `push_dispatch_service_role_key` y no hace nada mientras falte alguno. Esta segunda debe ser **exactamente** el valor que la función recibe en `SUPABASE_SERVICE_ROLE_KEY`: en un proyecto con las claves nuevas es la clave secreta `sb_secret_…` (`supabase projects api-keys --reveal`), no el JWT heredado `service_role`, que la función rechaza con 401. Se cargan en cada entorno, nunca en una migración:

```sql
select vault.create_secret('https://<proyecto>.supabase.co/functions/v1/send-push-alert', 'push_dispatch_url');
select vault.create_secret('<clave sb_secret_…>', 'push_dispatch_service_role_key');
```

Si Expo Push Security está activa, configurar además `EXPO_ACCESS_TOKEN` como secreto de la Edge Function.

Prueba local (réplica con `supabase db reset`): `docker exec -i supabase_db_TerraSense psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/scripts/test_notificaciones.sql` verifica eventos únicos, RLS y permisos, instalaciones, reservas, leases, reintentos, clasificación de errores por ticket y receipt, resultados inciertos, vigencia enviada a Expo, cancelación de envíos en curso por preferencia, permiso y membresía, tokens inválidos, lectura por usuario, Vault, cron, supervisión y retención, y termina en `rollback`. `bash supabase/scripts/test_concurrencia_push.sh` abre sesiones psql simultáneas con transacciones confirmadas de verdad y demuestra que dos despachadores no reciben la misma entrega, que una reserva no confirmada se revierte, que una reserva confirmada cuyo ticket nunca se guardó se recupera al vencer el lease, que un ticket tardío se ignora y que un cambio de preferencia, de permiso, de sesión Auth (cierre global) o de membresía hecho desde otra conexión con envíos en vuelo cancela sólo lo que corresponde sin que un ticket tardío lo reviva; se niega a correr si la base ya tiene entregas y borra siempre sus filas. `node --test supabase/functions/send-push-alert/dispatch.test.mjs` prueba el cliente de Expo. Ninguna prueba local acredita recepción física en Android o iOS.

## Backoffice y reset

El backoffice ([`Web/README.md`](../Web/README.md#2-pantallas)) busca por ID del equipo o correo de un miembro, acepta o rechaza solicitudes pendientes y hace administrador a un usuario aprobado. **El reset es sólo del backoffice** (`admin_reset_device`, con confirmación en un diálogo): borra membresías, solicitudes, mediciones, alertas, invitaciones, historial de estado y actualizaciones; invalida los QR y devuelve el nombre a «Sonda TerraSense». Conserva el ID y las versiones del hardware. La app no tiene reset: `prepare_device_for_owner` se retiró en `20260928130000`.

Prueba local del historial de mediciones (réplica con `supabase db reset`): `docker exec -i supabase_db_TerraSense psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/scripts/test_historial_soporte.sql` comprueba que la especie sale de la instantánea del diagnóstico y no de `crop_id`, los filtros de etapa y especie y su combinación, «sin especie» como opción propia, el orden total que exige paginar —horas repetidas y lecturas sin hora—, los topes de la ventana, el inventario de especies del equipo con su recuento, y que sólo la cuenta de soporte activa pueda llamar las tres funciones; termina en `rollback`.

Tras el reset la sonda queda libre: quien la vincule con la ventana PAIR abierta queda como administrador, sea un antiguo miembro o alguien nuevo. La ventana la comprueba la app, no la base: una llamada directa a `register_paired_device` con el ID de una sonda sin dueño la registra igual. Es el pendiente A4 de [`Firmware/TASK.md`](../Firmware/TASK.md), aceptado.

**La sonda no se resetea:** no guarda nada del propietario. Su ID sale de la MAC del ESP32 y no cambia ([`Firmware/README.md`](../Firmware/README.md#identidad-de-la-sonda)).

## Despliegue y verificación

Las migraciones `20260929130000_notificaciones_equipos.sql`, `20260929140000_ajustes_despacho_push.sql`, `20260929150000_operacion_avisos.sql` y `20260930120000_recuperacion_push_sesiones.sql` y las Edge Functions están aplicadas en producción desde el 30-09-2026. Los secretos de Vault se cargaron el 01-10-2026: `terrasense-push-dispatch` responde 200 cada minuto con la cola vacía. Faltan las credenciales FCM y APNs del proyecto EAS y la prueba en teléfonos con dos cuentas ([TASK_PERMISSIONS.md](../App/TASK_PERMISSIONS.md)).

`App/scripts/verify-supabase-onboarding.mjs` prueba con cuentas/equipo temporales: primer administrador, pendientes, aislamiento de RLS, nombre/correo censurados, reescaneo idempotente, aviso en cola, QR de un usuario aprobado, caducidad, transferencia, eliminación, separación del backoffice, que ni la app ni el administrador de un equipo pueden resetearlo, y la revinculación tras el reset con dos intentos simultáneos. `admin_reset_device` exige la sesión de la cuenta de soporte, que no tiene contraseña, así que el script reproduce su efecto sobre el equipo con la clave de servicio. Usa credenciales de servicio y limpia sus fixtures; ejecutarlo sobre una base de pruebas con las migraciones aplicadas. No demuestra entrega de push a un teléfono.
