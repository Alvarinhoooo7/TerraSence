# Backoffice de cuenta única — plan de tareas

Plan vigente del rediseño del backoffice. Cada casilla `[x]` está hecha **y**
verificada con el comando o la prueba que se indica; `[ ]` sigue pendiente. Cuando
todo esté cerrado, este archivo se borra: el estado final lo describe
[README.md](README.md).

## Alcance

- **Una sola cuenta entra:** `akurasoporte@gmail.com`. La base de datos lo exige en
  cada función del backoffice, no solo la interfaz.
- **La web no existe para nadie más:** otra cuenta con credenciales correctas recibe
  el mismo error genérico que una contraseña mala y su sesión se cierra en el acto.
  No hay pantalla de acceso denegado, ni alta de cuentas, ni enlaces que lleven a
  la web desde la app o los correos.
- **Navegación:** Buscar · Update · Cerrar sesión.
- **Pantallas:** Iniciar sesión, Recuperar acceso, Buscar, Equipo, Update.

## Decisiones

| Decisión | Motivo |
| --- | --- |
| La cuenta se crea en la base **sin contraseña**; el primer ingreso es por Recuperar acceso | La contraseña no queda escrita en ninguna migración ni en el historial remoto |
| El correo permitido vive solo en la base (`is_support_staff()`), nunca en el código de la web | El paquete de la web es público: no debe delatar qué cuenta sirve |
| La recuperación pasa por la función `backoffice-recover`, que envía el código solo a la cuenta de soporte y responde igual a todos, sin esperar el envío | Nadie más recibe correos por culpa de la web, y el tiempo de respuesta no revela si el correo existe |
| Online = la app habló con la sonda hace menos de 15 min, calculado en el servidor | La sonda no tiene internet; el reloj del navegador no decide el estado |
| Cada tarjeta del equipo tiene su propia función y su propio Refrescar | Refrescar una tarjeta no recarga ni pisa las otras |
| Actualización solo por BLE | Decisión del proyecto: sin WiFi |

## Fase 1 · Base de datos

### T1. Cuenta única de soporte
- [x] Migración: `is_support_staff()` exige fila activa **y** correo `akurasoporte@gmail.com` confirmado.
- [x] Se eliminan del personal todas las demás cuentas, y las funciones y tablas del alta por código de invitación.
- [x] Migración: alta de `akurasoporte@gmail.com` en `auth.users` sin contraseña, correo confirmado, enlazada al personal. Idempotente si la cuenta ya existe.
- **Verificación:** en la réplica local, `is_support_staff()` es `true` solo para esa cuenta; con otra cuenta cada función del backoffice responde `42501`.

### T2. Contacto real de la sonda
- [x] Columna `devices.first_seen_at`; `battery_level`, `last_seen_at` y `firmware_version` sin valores de relleno y en `NULL` hasta el primer contacto real.
- [x] Función `report_device_contact(device, batería, versión, hora)` para miembros autorizados: la hora nunca retrocede, la primera conexión nunca avanza, la batería solo se toma de un contacto más nuevo.
- **Verificación:** pruebas SQL en la réplica (miembro sí, ajeno no, hora futura recortada, contacto viejo no pisa la batería).

### T3. Funciones del backoffice
- [x] `admin_search`: filas por equipo y cliente; por ID (con o sin guiones) devuelve todos los enlazados, por correo los equipos de ese cliente.
- [x] `admin_device_status`, `admin_device_members`, `admin_device_measurements` (últimas 5, con pronóstico y consejo).
- [x] `admin_reject_member`: solo sobre solicitudes pendientes.
- [x] Reset global: además de lo actual, borra invitaciones y deja batería y conexiones en `NULL`.
- [x] Se eliminan las funciones de la consola anterior que ya nadie usa.
- **Verificación:** pruebas SQL en la réplica; `database.types.ts` regenerado.

### T4. Recuperación oculta
- [x] Edge Function `backoffice-recover`: envía el código solo a la cuenta de soporte; siempre `200` y responde antes de enviar.
- [x] `supabase/config.toml`: la web sale de las URL de redirección y del `site_url`.
- **Verificación:** con otro correo no llega nada; con el de soporte llega el código (Mailpit local).

## Fase 2 · Web: acceso y armazón

### T5. Sistema visual
- [x] Tokens nuevos (superficies, tinta, verde de marca como único acento, semáforo), tipografía IBM Plex Sans/Mono, radios y espaciado.
- [x] Componentes base: botón, campo, tarjeta, insignia, diálogo, aviso, esqueleto.

### T6. Iniciar sesión y recuperar acceso
- [x] Login con error genérico «Correo o contraseña incorrectos.»; otra cuenta válida → mismo error y sesión cerrada.
- [x] Recuperar acceso: correo → código → contraseña nueva → login. Si el código lo valida otra cuenta, se cierra la sesión y se informa código inválido.
- [x] Cualquier sesión que no sea de soporte se cierra sin mostrar nada.
- [x] Título y descripción neutros; sin «backoffice» ni «soporte» visibles antes de entrar.

### T7. Armazón
- [x] Barra lateral: Buscar, Update, Cerrar sesión. Cajón en móvil.
- [x] Se retiran Crear cuenta, Activa tu acceso, Cuenta confirmada, Flota, Mediciones, Firmware, Validación y Equipo de soporte.

## Fase 3 · Web: Buscar y Equipo

### T8. Buscar
- [x] Campo + botón Buscar, texto guía, búsqueda en la URL (`/buscar?q=`).
- [x] Tabla ID · Cliente · Correo · Rol; fila completa navegable con teclado.
- [x] Estados: inicial, cargando, sin resultados, error.

### T9. Equipo · Estado
- [x] ID, batería («No disponible» si Offline), Online/Offline, primera y última conexión; Refrescar.
- [x] Reset: un diálogo con el listado de lo que se borra, Cancelar a la izquierda y Resetear en rojo suave.

### T10. Equipo · Usuarios
- [x] Usuario, Correo, Admin (Sí/No), Hacer admin (con confirmación), Aprobado (Aceptar/Rechazar si está pendiente); Refrescar.

### T11. Equipo · Mediciones
- [x] Últimas 5, cada fila se despliega y recoge por su cuenta; Refrescar.
- [x] Columnas: Registro, Fase, Humedad del suelo, Temperatura del suelo, CE, pH, N, P, K, Temperatura ambiente, Humedad ambiente, Presión, Batería, Dato de la API, Consejo, Coordenada (texto plano).

### Control · Fases 1 a 3
- [x] `npm run build` y `npm test` en `Web/` sin errores.
- [x] Flujo completo en navegador contra la réplica local: recuperar, entrar, buscar, equipo, aprobar, hacer admin, reset, cerrar sesión.
- [x] Revisión a 390 y 1440 px, en tema claro y oscuro (sin desplazamiento horizontal a 390 px). Falta una pasada a 768 y 1024 px.
- [x] Otra cuenta: error genérico y sin sesión.

## Fase 4 · App: informar cada contacto
- [x] La app llama a `report_device_contact` tras cada conversación BLE (medir, vincular, leer identidad), con la cola sin conexión que ya existe.
- [x] Lee batería y versión de la característica «Estado» del firmware (`Firmware/PLAN.md`).
- **Verificación:** `cd App && npm test`.

## Fase 5 · Actualizaciones (backend)
- [x] Tabla `device_firmware_updates` (enviada, pendiente, instalando, instalada, fallida, cancelada) y bucket privado de binarios.
- [x] Funciones: publicar versión, enviar a un equipo, enviar a todos, cancelar envío; la app: postergar, iniciar, confirmar, informar fallo.
- [x] Aviso push solo al administrador del equipo.

## Fase 6 · Web: Update
- [x] Tarjeta Actualización del equipo.
- [x] Pantalla Update: cargar `.bin` (SHA-256 y tamaño en el navegador), publicar, enviar a todos, seguimiento.

## Fase 7 · App: ventana y envío BLE
- [ ] Ventana Actualizar/Cancelar para el administrador; pendiente persistente (detalle en [App/README.md §12.4](../App/README.md#124-actualizaciones-de-firmware-en-la-app)).
- [ ] Descarga, verificación, envío por BLE con progreso, confirmación por versión.

## Fase 8 · Firmware
- [ ] Ver [Firmware/PLAN.md](../Firmware/PLAN.md).

## Verificación hecha (27-09-2026)

Contra una réplica local con Docker (esquema de `schema.sql` más las cuatro migraciones nuevas):

- Guiones SQL: soporte sí; agricultor, usuario pendiente y `anon` reciben `42501`; búsqueda por ID con guiones y por correo; hacer admin, aceptar, rechazar y reset; ciclo completo de una actualización (borrador, publicar, enviar, postergar, instalar, envío masivo sin duplicar).
- `backoffice-recover`: la misma respuesta en ~20–40 ms para tres correos; sólo la cuenta de soporte recibió el código.
- Navegador (Playwright sobre Chrome): 21 comprobaciones del flujo completo, del login con otra cuenta al cierre de sesión.
- `Web`: `npm test` (8), `npm run build`, `check-classes` (219 clases). `App`: `npm test` (121). Firmware: compila sin advertencias.

**Aplicado en producción el 27-09-2026** (migraciones, funciones y URL de Auth); falta el primer ingreso por Recuperar acceso. Detalle en [supabase/README.md §10.0](../supabase/README.md#100-aplicar-el-backoffice-de-cuenta-única-27-09-2026).

## Pasos manuales en Supabase (producción)

1. Aplicar las migraciones (`supabase db push`) y desplegar `backoffice-recover`.
2. **Authentication → URL Configuration, en el panel** (no con `supabase config push`, que borraría la contraseña SMTP): cambiar *Site URL* a `terrasense://` y quitar de *Redirect URLs* las entradas de `terrasense-web.vercel.app` (incluida `/cuenta-confirmada`). La app usa códigos de 6 dígitos, no enlaces, así que no necesita esas URL; la web tampoco.
3. Primer ingreso: *Recuperar acceso* con `akurasoporte@gmail.com`.
