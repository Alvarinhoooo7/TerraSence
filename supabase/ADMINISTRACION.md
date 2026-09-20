# Administración y solicitudes de acceso

## Acceso web y roles de equipo

`admin_support_users` controla exclusivamente el backoffice. `device_members` controla exclusivamente el acceso de la app a cada equipo. Ambas cuentas usan Supabase Auth como proveedor de identidad, pero ninguna membresía ni rol de equipo concede acceso a la web. El correo sólo es criterio de búsqueda, no autorización. `profiles.role` tampoco autoriza el backoffice ni la administración de equipos.

Los únicos roles de equipo son `admin` y `user`. El primer usuario que empareja un ID sin miembros queda como administrador. Los demás solicitan acceso y quedan pendientes con rol `user`. La única diferencia entre los miembros aprobados es el acceso a **Ajustes → Administración**: aprobar, eliminar o delegar. Ambos pueden operar el equipo y mostrar su QR.

La transferencia es atómica: el administrador anterior pasa a `user`. Para eliminar a un administrador hay que delegar primero. Las operaciones ordinarias conservan al menos un miembro y exactamente un administrador; el reset es la excepción que deja cero miembros. Se bloquea la fila del equipo durante vinculaciones, transferencias, bajas y reset, con índice único y comprobación diferida de la administración.

Al migrar datos heredados, se conserva primero al `owner`, después a un `admin` y, a falta de ambos, al primer miembro aprobado. Si un equipo sólo tiene pendientes, se recupera al primero como administrador. El resto queda como `user`, conservando su estado de aprobación.

## QR de 15 minutos

`get_device_access_qr` entrega a cualquier miembro aprobado un token aleatorio, válido hasta el siguiente cambio de intervalo de 15 minutos del servidor. La app renueva el QR automáticamente y oculta los vencidos. El token nunca es el ID permanente del equipo.

`request-device-access` valida la sesión y llama a `join_device_by_invite`. La base valida vigencia y equipo, registra una membresía pendiente y crea una única alerta dirigida al administrador. Reescanear no autoriza al solicitante ni duplica la alerta. Los RPC antiguos por ID permanente quedan sin permisos para clientes.

La pantalla de espera consulta el estado cada cinco segundos. Muestra sólo las iniciales del nombre y del correo del administrador, censuradas **en el servidor**: por ejemplo, `Axxxxx Vxxxxx` y `axxxxxxxx@gxxxxxxxx`. Al aprobarse la solicitud, entra al equipo; si se elimina o resetea, informa que la solicitud ya no está disponible.

La Edge Function intenta despachar la push al confirmar la solicitud. El despachador comprueba quién es el administrador actual y que la solicitud siga pendiente. Al tocar la push, la app abre Administración y vuelve a comprobar permisos. Las notificaciones requieren un teléfono con token Expo, permiso del sistema y avisos de equipo habilitados. Si Expo falla, la solicitud sigue existiendo y la alerta queda en cola; se debe mantener un despacho periódico de `send-push-alert` con credenciales de servidor para reintentar.

## Backoffice y reset

El backoffice busca por UUID/ID estable del equipo o correo actual de un miembro. Puede aprobar pendientes, delegar y eliminar miembros con las mismas restricciones. El reset exige repetir el ID y borra todas las membresías, mediciones, alertas e historial de estado; invalida los QR y restablece nombre/configuración de la nube. Conserva la identidad estable y las versiones reales del hardware. El siguiente emparejamiento obtiene administración.

**El reset físico no está implementado:** no hay firmware fuente en este repositorio ni protocolo para ordenar y confirmar el borrado de NVS. El backoffice muestra esta limitación; borrar datos en Supabase no confirma que la memoria física se haya limpiado.

## Despliegue y verificación

Estos cambios de código no equivalen a un despliegue remoto. Aplicar conjuntamente las migraciones `20260906120000_dos_roles_y_aprobacion.sql` y `20260906130000_qr_temporal_y_solicitudes.sql`, desplegar `send-push-alert` y `request-device-access`, y publicar las versiones compatibles de app y web. La revocación de los RPC antiguos requiere actualizar los clientes.

`App/scripts/verify-supabase-onboarding.mjs` prueba con cuentas/equipo temporales: primer administrador, pendientes, aislamiento de RLS, nombre/correo censurados, reescaneo idempotente, aviso en cola, QR de un usuario aprobado, caducidad, transferencia, eliminación, separación del backoffice y reset con nuevo emparejamiento. Usa credenciales de servicio y limpia sus fixtures; ejecutarlo sobre una base de pruebas con las migraciones aplicadas. No demuestra entrega de push a un teléfono ni reset físico.
