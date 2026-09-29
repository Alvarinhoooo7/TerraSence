# Administración y solicitudes de acceso

## Acceso web y roles de equipo

El backoffice lo controla `is_support_staff()`: una fila activa en `admin_support_users` **y** el correo confirmado `akurasoporte@gmail.com`, la única cuenta que entra. `device_members` controla exclusivamente el acceso de la app a cada equipo. Ambas cuentas usan Supabase Auth como proveedor de identidad, pero ninguna membresía ni rol de equipo concede acceso a la web. El correo sólo es criterio de búsqueda, no autorización. `profiles.role` tampoco autoriza el backoffice ni la administración de equipos.

Los únicos roles de equipo son `admin` y `user`. El primer usuario que empareja un ID sin miembros, con la ventana PAIR de la sonda abierta, queda como administrador. Los demás solicitan acceso y quedan pendientes con rol `user`. La única diferencia entre los miembros aprobados es el acceso a **Ajustes → Administración**: aprobar, eliminar o delegar. Ambos pueden operar el equipo y mostrar su QR.

La transferencia es atómica: el administrador anterior pasa a `user`. Para eliminar a un administrador hay que delegar primero. Las operaciones ordinarias conservan al menos un miembro y exactamente un administrador; el reset es la excepción que deja cero miembros. Se bloquea la fila del equipo durante vinculaciones, transferencias, bajas y reset, con índice único y comprobación diferida de la administración.

Al migrar datos heredados, se conserva primero al `owner`, después a un `admin` y, a falta de ambos, al primer miembro aprobado. Si un equipo sólo tiene pendientes, se recupera al primero como administrador. El resto queda como `user`, conservando su estado de aprobación.

## QR de 5 minutos

`get_device_access_qr` entrega a cualquier miembro aprobado un token aleatorio que dura **5 minutos completos desde que se genera**, sin alinearse al reloj del servidor ([`20260928140000`](migrations/20260928140000_qr_de_5_minutos.sql), aplicada el 28-09-2026). Mientras está vigente, todos los miembros ven el mismo; al vencer, la siguiente consulta genera otro con 5 minutos completos. La app lo vuelve a pedir al vencer, muestra la cuenta regresiva y oculta los vencidos. El token nunca es el ID permanente del equipo.

Debajo del QR la app muestra **el mismo token como código de invitación**, con un botón para copiarlo. Quien no puede escanear lo escribe o lo pega en «Usar invitación» del onboarding. El QR (`terrasense://join?token=…`) y el código siguen el mismo camino y vencen juntos (`parseDeviceInvite` en `App/src/utils/deviceCode.ts`).

Los dos llegan a la Edge Function `request-device-access`, que valida la sesión y llama a `join_device_by_invite`. La base valida vigencia y equipo, registra una membresía pendiente y crea una única alerta dirigida al administrador. Reescanear no autoriza al solicitante ni duplica la alerta. Los RPC antiguos por ID permanente quedan sin permisos para clientes.

La pantalla de espera consulta el estado cada cinco segundos. Muestra sólo las iniciales del nombre y del correo del administrador, censuradas **en el servidor**: por ejemplo, `Axxxxx Vxxxxx` y `axxxxxxxx@gxxxxxxxx`. Al aprobarse la solicitud, entra al equipo; si se elimina o resetea, informa que la solicitud ya no está disponible.

La Edge Function intenta despachar la push al confirmar la solicitud. El despachador comprueba quién es el administrador actual y que la solicitud siga pendiente. Al tocar la push, la app abre Administración y vuelve a comprobar permisos. Las notificaciones requieren un teléfono con token Expo, permiso del sistema y avisos de equipo habilitados. Si Expo falla, la solicitud sigue existiendo y la alerta queda en cola; se debe mantener un despacho periódico de `send-push-alert` con credenciales de servidor para reintentar.

## Backoffice y reset

El backoffice ([`Web/README.md`](../Web/README.md#2-pantallas)) busca por ID del equipo o correo de un miembro, acepta o rechaza solicitudes pendientes y hace administrador a un usuario aprobado. **El reset es sólo del backoffice** (`admin_reset_device`, con confirmación en un diálogo): borra membresías, solicitudes, mediciones, alertas, invitaciones, historial de estado y actualizaciones; invalida los QR y devuelve el nombre a «Sonda TerraSense». Conserva el ID y las versiones del hardware. La app no tiene reset: `prepare_device_for_owner` se retiró en `20260928130000`.

Tras el reset la sonda queda libre: quien la vincule con la ventana PAIR abierta queda como administrador, sea un antiguo miembro o alguien nuevo. La ventana la comprueba la app, no la base: una llamada directa a `register_paired_device` con el ID de una sonda sin dueño la registra igual. Es el pendiente A4 de [`Firmware/TASK.md`](../Firmware/TASK.md), aceptado.

**La sonda no se resetea:** no guarda nada del propietario. Su ID sale de la MAC del ESP32 y no cambia ([`Firmware/README.md`](../Firmware/README.md#identidad-de-la-sonda)).

## Despliegue y verificación

Las migraciones `20260906120000_dos_roles_y_aprobacion.sql` y `20260906130000_qr_temporal_y_solicitudes.sql` están aplicadas en producción, y `send-push-alert` y `request-device-access` están desplegadas. `request-device-access` recién se desplegó el 28-09-2026: hasta entonces el ingreso por QR o por código fallaba en producción. Falta probarlo en teléfonos con dos cuentas.

`App/scripts/verify-supabase-onboarding.mjs` prueba con cuentas/equipo temporales: primer administrador, pendientes, aislamiento de RLS, nombre/correo censurados, reescaneo idempotente, aviso en cola, QR de un usuario aprobado, caducidad, transferencia, eliminación, separación del backoffice, que ni la app ni el administrador de un equipo pueden resetearlo, y la revinculación tras el reset con dos intentos simultáneos. `admin_reset_device` exige la sesión de la cuenta de soporte, que no tiene contraseña, así que el script reproduce su efecto sobre el equipo con la clave de servicio. Usa credenciales de servicio y limpia sus fixtures; ejecutarlo sobre una base de pruebas con las migraciones aplicadas. No demuestra entrega de push a un teléfono.
